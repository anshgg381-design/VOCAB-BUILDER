/* CUET Vocabulary Builder — Background Service Worker (Manifest V3) */
importScripts('shared.js');

const STORAGE_KEYS = {
  entries: 'cuet_entries',
  settings: 'cuet_settings',
};

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get([STORAGE_KEYS.entries, STORAGE_KEYS.settings]);
  const updates = {};
  if (!Array.isArray(existing[STORAGE_KEYS.entries])) {
    updates[STORAGE_KEYS.entries] = [];
  }
  if (!existing[STORAGE_KEYS.settings] || typeof existing[STORAGE_KEYS.settings] !== 'object') {
    updates[STORAGE_KEYS.settings] = { ...CUETShared.DEFAULT_SETTINGS };
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
});

async function getEntries() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.entries);
  return Array.isArray(data[STORAGE_KEYS.entries]) ? data[STORAGE_KEYS.entries] : [];
}

async function saveEntries(entries) {
  await chrome.storage.local.set({ [STORAGE_KEYS.entries]: entries });
}

async function getSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return {
    ...CUETShared.DEFAULT_SETTINGS,
    ...(data[STORAGE_KEYS.settings] || {}),
  };
}

function getActiveModel(settings) {
  const custom = (settings.customModel || '').trim();
  if (custom) return custom;
  return (settings.model || CUETShared.DEFAULT_SETTINGS.model).trim();
}

function isExtensionPage(sender) {
  const extOrigin = chrome.runtime.getURL('');
  return Boolean(sender && typeof sender.url === 'string' && sender.url.startsWith(extOrigin));
}

async function callGeminiApi(apiKey, model, prompt) {
  const trimmedKey = (apiKey || '').trim();
  if (!trimmedKey) {
    throw new Error('Gemini API key is not set. Open Settings to add your API key.');
  }

  const endpoint = `${API_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(trimmedKey)}`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          expression: { type: 'STRING' },
          meaning: { type: 'STRING' },
          example: { type: 'STRING' },
        },
        required: ['expression', 'meaning', 'example'],
      },
    },
  };

  let response = null;
  let payload = null;
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      throw new Error('Could not connect to Gemini API. Check your internet connection.');
    }

    payload = await response.json().catch(() => null);
    if (response.ok) break;

    if ((response.status === 429 || response.status === 503) && attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    break;
  }

  if (!response || !response.ok) {
    const status = response ? response.status : 0;
    const apiMessage = payload?.error?.message || `HTTP ${status}`;
    if (status === 400 && /api key/i.test(apiMessage)) {
      throw new Error('Invalid Gemini API key. Please check it in Settings.');
    }
    if (status === 403) {
      throw new Error('Gemini API key was rejected (403). Verify your key in Settings.');
    }
    if (status === 404) {
      throw new Error(`Model "${model}" was not found. Select another Gemini model in Settings.`);
    }
    if (status === 429) {
      throw new Error('Gemini rate limit reached. Wait a few seconds and try again.');
    }
    if (status === 503) {
      throw new Error('Gemini is temporarily experiencing high demand. Please try again shortly.');
    }
    throw new Error(`Gemini API error: ${apiMessage}`);
  }

  const text = payload?.candidates?.[0]?.content?.parts
    ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini returned no text output for this expression.');
  }

  return text;
}

async function appendEntryToGoogleSheet(webhookUrl, payload) {
  const url = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
  if (!url) return { attempted: false, synced: false };

  if (!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/i.test(url)) {
    return {
      attempted: true,
      synced: false,
      error: 'Invalid Google Apps Script Web App URL. Check Settings.',
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify({
        category: payload.category,
        expression: payload.expression,
        meaning: payload.meaning,
        example: payload.example,
        testOnly: Boolean(payload.testOnly),
      }),
    });

    if (!response.ok) {
      return {
        attempted: true,
        synced: false,
        error: `Google Sheet sync returned HTTP ${response.status}.`,
      };
    }

    const data = await response.json().catch(() => null);
    if (data && data.ok === false) {
      return {
        attempted: true,
        synced: false,
        error: data.error || 'Google Sheet script rejected the entry.',
      };
    }

    return {
      attempted: true,
      synced: true,
      tabName: (data && data.tabName) || CUETShared.SHEET_TABS[payload.category] || 'Words',
    };
  } catch {
    return {
      attempted: true,
      synced: false,
      error: 'Could not reach your Google Sheet Web App URL.',
    };
  }
}

async function analyseSingleExpression({ expression, category, contextSentence, sourceTitle, sourceUrl }) {
  const cleaned = CUETShared.normalizeExpression(expression);
  if (!cleaned) {
    return { ok: false, error: 'Please enter a valid English word, idiom, or phrasal verb.' };
  }

  const entries = await getEntries();
  const duplicate = CUETShared.findDuplicate(entries, cleaned);
  if (duplicate) {
    return {
      ok: false,
      duplicate: true,
      entry: duplicate,
      error: `"${duplicate.expression}" is already saved in ${CUETShared.CATEGORIES[duplicate.category]}.`,
    };
  }

  const resolvedCategory = CUETShared.VALID_CATEGORIES.includes(category)
    ? category
    : CUETShared.detectCategory(cleaned);

  const settings = await getSettings();
  const model = getActiveModel(settings);
  const prompt = CUETShared.buildGeminiPrompt(cleaned, resolvedCategory, contextSentence || '');

  const rawText = await callGeminiApi(settings.apiKey, model, prompt);
  const analysis = CUETShared.parseGeminiResponse(rawText, cleaned);

  const newEntry = {
    id: CUETShared.generateId(),
    expression: analysis.expression,
    category: resolvedCategory,
    meaning: analysis.meaning,
    example: analysis.example,
    contextSentence: (contextSentence || '').trim(),
    sourceTitle: (sourceTitle || '').trim(),
    sourceUrl: (sourceUrl || '').trim(),
    dateAdded: new Date().toISOString(),
    learned: false,
    favourite: false,
  };

  // Re-read storage right before saving to avoid race conditions
  const freshEntries = await getEntries();
  if (CUETShared.findDuplicate(freshEntries, newEntry.expression)) {
    return {
      ok: false,
      duplicate: true,
      error: `"${newEntry.expression}" was already saved.`,
    };
  }

  freshEntries.unshift(newEntry);
  await saveEntries(freshEntries);

  // Immediately append to the connected Google Sheet (3 tabs: Words, Idioms, Phrasal Verbs)
  const sheetSync = await appendEntryToGoogleSheet(settings.sheetWebhookUrl, newEntry);

  return {
    ok: true,
    entry: newEntry,
    sheetSync,
    counts: CUETShared.getCategoryCounts(freshEntries),
  };
}

async function handleReanalyseEntry(id) {
  const entries = await getEntries();
  const index = entries.findIndex((e) => e.id === id);
  if (index === -1) {
    return { ok: false, error: 'Entry not found.' };
  }

  const target = entries[index];
  const settings = await getSettings();
  const model = getActiveModel(settings);
  const prompt = CUETShared.buildGeminiPrompt(
    target.expression,
    target.category,
    target.contextSentence || ''
  );

  const rawText = await callGeminiApi(settings.apiKey, model, prompt);
  const analysis = CUETShared.parseGeminiResponse(rawText, target.expression);

  const updated = {
    ...target,
    expression: analysis.expression,
    meaning: analysis.meaning,
    example: analysis.example,
  };

  const freshEntries = await getEntries();
  const freshIdx = freshEntries.findIndex((e) => e.id === id);
  if (freshIdx !== -1) {
    freshEntries[freshIdx] = updated;
    await saveEntries(freshEntries);
  }

  return { ok: true, entry: updated };
}

async function handleTestConnection({ apiKey, model }) {
  const settings = await getSettings();
  const keyToTest = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : settings.apiKey;
  const modelToTest = typeof model === 'string' && model.trim() ? model.trim() : getActiveModel(settings);

  const prompt = CUETShared.buildGeminiPrompt('pragmatic', 'vocabulary', '');
  const rawText = await callGeminiApi(keyToTest, modelToTest, prompt);
  const parsed = CUETShared.parseGeminiResponse(rawText, 'pragmatic');

  return {
    ok: true,
    model: modelToTest,
    sample: parsed,
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (!message || typeof message.type !== 'string') {
        sendResponse({ ok: false, error: 'Unknown message.' });
        return;
      }

      switch (message.type) {
        case 'GET_STATE': {
          const entries = await getEntries();
          const settings = await getSettings();
          sendResponse({
            ok: true,
            entries,
            counts: CUETShared.getCategoryCounts(entries),
            hasApiKey: Boolean(settings.apiKey && settings.apiKey.trim()),
            activeModel: getActiveModel(settings),
          });
          return;
        }

        case 'SAVE_AND_ANALYSE': {
          const result = await analyseSingleExpression(message.payload || {});
          sendResponse(result);
          return;
        }

        case 'UPDATE_ENTRY': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const { id, patch } = message.payload || {};
          const entries = await getEntries();
          const idx = entries.findIndex((e) => e.id === id);
          if (idx === -1) {
            sendResponse({ ok: false, error: 'Entry not found.' });
            return;
          }

          const current = entries[idx];
          const nextExpression =
            patch && typeof patch.expression === 'string'
              ? CUETShared.normalizeExpression(patch.expression)
              : current.expression;

          if (!nextExpression) {
            sendResponse({ ok: false, error: 'Expression cannot be empty.' });
            return;
          }

          // Check duplicate if expression changed
          if (CUETShared.normalizeKey(nextExpression) !== CUETShared.normalizeKey(current.expression)) {
            const dup = entries.find(
              (e) => e.id !== id && CUETShared.normalizeKey(e.expression) === CUETShared.normalizeKey(nextExpression)
            );
            if (dup) {
              sendResponse({ ok: false, error: `"${dup.expression}" already exists in your library.` });
              return;
            }
          }

          const updated = {
            ...current,
            expression: nextExpression,
            category:
              patch && CUETShared.VALID_CATEGORIES.includes(patch.category)
                ? patch.category
                : current.category,
            meaning:
              patch && typeof patch.meaning === 'string' && patch.meaning.trim()
                ? patch.meaning.trim()
                : current.meaning,
            example:
              patch && typeof patch.example === 'string' && patch.example.trim()
                ? patch.example.trim()
                : current.example,
            learned: typeof patch?.learned === 'boolean' ? patch.learned : current.learned,
            favourite: typeof patch?.favourite === 'boolean' ? patch.favourite : current.favourite,
          };

          entries[idx] = updated;
          await saveEntries(entries);
          sendResponse({
            ok: true,
            entry: updated,
            counts: CUETShared.getCategoryCounts(entries),
          });
          return;
        }

        case 'DELETE_ENTRY': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const id = message.payload?.id;
          const entries = await getEntries();
          const next = entries.filter((e) => e.id !== id);
          await saveEntries(next);
          sendResponse({
            ok: true,
            counts: CUETShared.getCategoryCounts(next),
          });
          return;
        }

        case 'CLEAR_ALL_ENTRIES': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          await saveEntries([]);
          sendResponse({
            ok: true,
            counts: CUETShared.getCategoryCounts([]),
          });
          return;
        }

        case 'REANALYSE_ENTRY': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const result = await handleReanalyseEntry(message.payload?.id);
          sendResponse(result);
          return;
        }

        case 'IMPORT_BACKUP': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const entries = await getEntries();
          const result = CUETShared.validateAndMergeImport(entries, message.payload);
          if (!result.ok) {
            sendResponse(result);
            return;
          }
          await saveEntries(result.mergedEntries);
          sendResponse({
            ok: true,
            addedCount: result.addedCount,
            skippedCount: result.skippedCount,
            invalidCount: result.invalidCount || 0,
            counts: CUETShared.getCategoryCounts(result.mergedEntries),
          });
          return;
        }

        case 'EXPORT_BACKUP_JSON': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const entries = await getEntries();
          const settings = await getSettings();
          const backup = CUETShared.buildExportJson(entries, settings);
          sendResponse({ ok: true, backup });
          return;
        }

        case 'EXPORT_CSV': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const entries = await getEntries();
          const category = message.payload?.category;
          const filtered =
            category && CUETShared.VALID_CATEGORIES.includes(category)
              ? entries.filter((e) => e.category === category)
              : entries;
          const csv = CUETShared.buildCsv(filtered);
          sendResponse({ ok: true, csv, count: filtered.length });
          return;
        }

        case 'GET_SETTINGS': {
          // Never expose API key to webpage content scripts
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Settings can only be accessed from extension pages.' });
            return;
          }
          const settings = await getSettings();
          sendResponse({ ok: true, settings });
          return;
        }

        case 'SAVE_SETTINGS': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const next = {
            apiKey: typeof message.payload?.apiKey === 'string' ? message.payload.apiKey.trim() : '',
            model:
              typeof message.payload?.model === 'string' && message.payload.model.trim()
                ? message.payload.model.trim()
                : CUETShared.DEFAULT_SETTINGS.model,
            customModel:
              typeof message.payload?.customModel === 'string'
                ? message.payload.customModel.trim()
                : '',
            sheetWebhookUrl:
              typeof message.payload?.sheetWebhookUrl === 'string'
                ? message.payload.sheetWebhookUrl.trim()
                : '',
          };
          await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
          sendResponse({ ok: true, settings: next, activeModel: getActiveModel(next) });
          return;
        }

        case 'TEST_GEMINI_CONNECTION': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const result = await handleTestConnection(message.payload || {});
          sendResponse(result);
          return;
        }

        case 'TEST_SHEET_CONNECTION': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const settings = await getSettings();
          const url =
            typeof message.payload?.sheetWebhookUrl === 'string' && message.payload.sheetWebhookUrl.trim()
              ? message.payload.sheetWebhookUrl.trim()
              : settings.sheetWebhookUrl;
          if (!url) {
            sendResponse({ ok: false, error: 'Paste your Google Apps Script Web App URL first.' });
            return;
          }
          const syncRes = await appendEntryToGoogleSheet(url, {
            category: 'vocabulary',
            expression: 'pragmatic',
            meaning: 'Dealing with things sensibly and realistically.',
            example: 'She took a pragmatic approach to preparing for CUET.',
            testOnly: true,
          });
          if (syncRes.synced) {
            sendResponse({ ok: true, tabName: syncRes.tabName });
          } else {
            sendResponse({ ok: false, error: syncRes.error || 'Could not reach Google Sheet.' });
          }
          return;
        }

        case 'OPEN_DASHBOARD': {
          await chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
          sendResponse({ ok: true });
          return;
        }

        case 'OPEN_SETTINGS': {
          await chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
          sendResponse({ ok: true });
          return;
        }

        default:
          sendResponse({ ok: false, error: `Unsupported action: ${message.type}` });
      }
    } catch (err) {
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    }
  })();
  return true;
});
