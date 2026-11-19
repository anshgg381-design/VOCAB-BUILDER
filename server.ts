import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Reuse exact shared prompt & parsing logic from the Brave extension
const CUETShared = require(path.join(__dirname, 'extension', 'shared.js'));

const EXTENSION_DIR = path.join(__dirname, 'extension');
const PORT = Number(process.env.PORT || 3000);

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function collectExtensionFiles(dir: string, relBase = ''): Array<{ path: string; isBinary: boolean; size: number; content?: string }> {
  const results: Array<{ path: string; isBinary: boolean; size: number; content?: string }> = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectExtensionFiles(fullPath, relPath));
    } else {
      const stat = fs.statSync(fullPath);
      const isBinary = /\.(png|jpg|jpeg|ico|webp)$/i.test(entry.name);
      if (isBinary) {
        results.push({ path: relPath, isBinary: true, size: stat.size });
      } else {
        results.push({
          path: relPath,
          isBinary: false,
          size: stat.size,
          content: fs.readFileSync(fullPath, 'utf8'),
        });
      }
    }
  }
  return results;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Serve real extension file tree & source contents
  app.get('/api/extension-files', (_req, res) => {
    try {
      const files = collectExtensionFiles(EXTENSION_DIR);
      res.json({ ok: true, files });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to read extension files.',
      });
    }
  });

  // Serve real PNG icons from /extension/icons/
  app.get('/api/extension-icon/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    if (!/^icon(16|32|48|128)\.png$/.test(safeName)) {
      res.status(404).end();
      return;
    }
    const filePath = path.join(EXTENSION_DIR, 'icons', safeName);
    if (!fs.existsSync(filePath)) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(filePath);
  });

  // Dynamically package the real /extension/ folder into a ready-to-load ZIP
  app.get('/api/download-extension.zip', async (_req, res) => {
    try {
      const zip = new JSZip();
      const now = new Date();

      const addDirToZip = (dir: string, relBase = '') => {
        const items = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
        for (const item of items) {
          if (item.name.startsWith('.')) continue;
          const full = path.join(dir, item.name);
          const rel = relBase ? `${relBase}/${item.name}` : item.name;
          if (item.isDirectory()) {
            addDirToZip(full, rel);
          } else {
            zip.file(`cuet-vocabulary-builder/${rel}`, fs.readFileSync(full), {
              binary: true,
              date: now,
              createFolders: false,
            });
          }
        }
      };

      addDirToZip(EXTENSION_DIR);

      const buffer = await zip.generateAsync({
        type: 'nodebuffer',
        platform: 'DOS',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="cuet-ug-2027-vocabulary-collector.zip"');
      res.setHeader('Content-Length', String(buffer.length));
      res.send(buffer);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Could not package extension ZIP.',
      });
    }
  });

  // Server-side Gemini analysis endpoint for the Live Interactive Preview
  app.post('/api/analyse', async (req, res) => {
    try {
      const { expression, category, contextSentence } = req.body || {};
      const cleaned = CUETShared.normalizeExpression(typeof expression === 'string' ? expression : '');
      if (!cleaned) {
        res.status(400).json({ ok: false, error: 'Please provide a valid English word, idiom, or phrasal verb.' });
        return;
      }

      const resolvedCategory = CUETShared.VALID_CATEGORIES.includes(category)
        ? category
        : CUETShared.detectCategory(cleaned);

      const prompt = CUETShared.buildGeminiPrompt(
        cleaned,
        resolvedCategory,
        typeof contextSentence === 'string' ? contextSentence : ''
      );

      const ai = getGenAIClient();
      const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      let rawText = '';
      let lastErr: unknown = null;

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    expression: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    example: { type: Type.STRING },
                  },
                  required: ['expression', 'meaning', 'example'],
                },
              },
            });
            rawText = response.text ?? '';
            if (rawText.trim()) break;
          } catch (err) {
            lastErr = err;
            const errStr = err instanceof Error ? err.message : String(err);
            const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(errStr);
            if (!isTransient) throw err;
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
          }
        }
        if (rawText.trim()) break;
      }

      if (!rawText.trim()) {
        throw lastErr || new Error('Gemini is temporarily busy. Please try again in a few seconds.');
      }

      const analysis = CUETShared.parseGeminiResponse(rawText, cleaned);

      res.json({
        ok: true,
        category: resolvedCategory,
        analysis,
      });
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Failed to analyse expression with Gemini.';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error?.message) msg = parsed.error.message;
      } catch {
        // Not JSON error string
      }
      if (/503|UNAVAILABLE|high demand/i.test(msg)) {
        msg = 'Gemini is temporarily experiencing high demand. Please try again in a moment.';
      }
      res.status(502).json({ ok: false, error: msg });
    }
  });

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist', 'index.html'));

  if (isProd) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CUET Vocabulary Collector Workbench listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
