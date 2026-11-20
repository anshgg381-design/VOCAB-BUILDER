import JSZip from 'jszip';

export interface BundledExtensionFile {
  path: string;
  isBinary: boolean;
  size: number;
  content?: string;
  dataUrl?: string;
}

const rawTextModules = import.meta.glob<string>('/extension/*.{json,js,html,css,txt}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const inlineIconModules = import.meta.glob<string>('/extension/icons/*.png', {
  query: '?inline',
  import: 'default',
  eager: true,
});

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const b64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return base64ToUint8Array(b64);
}

export function getBundledExtensionFiles(): BundledExtensionFile[] {
  const files: BundledExtensionFile[] = [];

  for (const [fullPath, content] of Object.entries(rawTextModules)) {
    const relPath = fullPath.replace(/^\/extension\//, '');
    const size = new TextEncoder().encode(content).byteLength;
    files.push({
      path: relPath,
      isBinary: false,
      size,
      content,
    });
  }

  for (const [fullPath, dataUrl] of Object.entries(inlineIconModules)) {
    const relPath = fullPath.replace(/^\/extension\//, '');
    let size = 0;
    try {
      size = dataUrlToBytes(dataUrl).byteLength;
    } catch {
      size = 0;
    }
    files.push({
      path: relPath,
      isBinary: true,
      size,
      dataUrl,
    });
  }

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

export async function buildExtensionZipBlob(): Promise<{ blob: Blob; fileCount: number; byteSize: number }> {
  const zip = new JSZip();
  const files = getBundledExtensionFiles();
  const now = new Date();
  let fileCount = 0;

  for (const file of files) {
    const zipPath = file.path;
    if (file.isBinary && file.dataUrl) {
      const bytes = dataUrlToBytes(file.dataUrl);
      zip.file(zipPath, bytes, {
        binary: true,
        date: now,
        createFolders: false,
      });
      fileCount++;
    } else if (!file.isBinary && typeof file.content === 'string') {
      zip.file(zipPath, file.content, {
        binary: false,
        date: now,
        createFolders: false,
      });
      fileCount++;
    }
  }

  if (fileCount === 0) {
    throw new Error('No extension files were found to package.');
  }

  const uint8 = await zip.generateAsync({
    type: 'uint8array',
    platform: 'DOS',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  // Sanity-check ZIP magic bytes (PK\x03\x04)
  if (uint8.length < 22 || uint8[0] !== 0x50 || uint8[1] !== 0x4b || uint8[2] !== 0x03 || uint8[3] !== 0x04) {
    throw new Error('Generated ZIP archive failed integrity verification.');
  }

  const blob = new Blob([new Uint8Array(uint8)], { type: 'application/zip' });
  return { blob, fileCount, byteSize: uint8.byteLength };
}

export async function downloadExtensionZip(): Promise<{ fileCount: number; byteSize: number }> {
  const { blob, fileCount, byteSize } = await buildExtensionZipBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ipmat-cuet-vocab-builder.zip';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { fileCount, byteSize };
}
