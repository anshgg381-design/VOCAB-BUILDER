import React, { useMemo, useState } from 'react';
import {
  BundledExtensionFile,
  downloadExtensionZip,
  getBundledExtensionFiles,
} from '../utils/extensionBundle';

export const ExtensionFilesView: React.FC = () => {
  const files: BundledExtensionFile[] = useMemo(() => getBundledExtensionFiles(), []);
  const [selectedPath, setSelectedPath] = useState<string>(() => {
    const hasManifest = files.some((f) => f.path === 'manifest.json');
    return hasManifest ? 'manifest.json' : files[0]?.path || '';
  });
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const activeFile = files.find((f) => f.path === selectedPath) || null;

  const handleCopy = async () => {
    if (!activeFile || activeFile.isBinary || !activeFile.content) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedPath(activeFile.path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      // Clipboard may be blocked in non-HTTPS contexts
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadExtensionZip();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">
            Extension Source Files
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pure HTML, CSS, and Vanilla JavaScript (Manifest V3). Zero frameworks, zero build tools — ready to load directly into Brave.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="h-9 px-4 inline-flex items-center justify-center text-[13px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {downloading ? 'Preparing ZIP…' : 'Download Complete ZIP'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* File Tree */}
        <nav
          aria-label="Extension files list"
          className="bg-white border border-slate-200 rounded-lg overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500">
            cuet-vocabulary-builder/ ({files.length} files)
          </div>
          <ul className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {files.map((file) => {
              const isSelected = file.path === selectedPath;
              return (
                <li key={file.path}>
                  <button
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 text-[13px] font-code transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50/80 text-teal-900 font-medium'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{file.path}</span>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                      {file.size >= 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${file.size} B`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Source Code / Binary Preview */}
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden min-w-0">
          {activeFile && (
            <>
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50">
                <span className="font-code text-[13px] font-medium text-slate-900 truncate">
                  {activeFile.path}
                </span>
                {!activeFile.isBinary && (
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="h-8 px-3 text-xs font-medium bg-white border border-slate-300 rounded text-slate-800 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                  >
                    {copiedPath === activeFile.path ? 'Copied' : 'Copy File'}
                  </button>
                )}
              </div>

              {activeFile.isBinary ? (
                <div className="p-10 flex flex-col items-center justify-center gap-4 text-center">
                  <img
                    src={activeFile.dataUrl || `/api/extension-icon/${activeFile.path.split('/').pop()}`}
                    alt={`Extension icon ${activeFile.path}`}
                    className="border border-slate-200 rounded-lg bg-slate-50 p-3"
                    style={{ imageRendering: 'auto' }}
                  />
                  <p className="text-sm text-slate-600">
                    PNG icon asset ({activeFile.size} bytes) — included automatically in the ZIP download.
                  </p>
                </div>
              ) : (
                <pre className="p-5 text-[12.5px] leading-[1.6] font-code text-slate-800 overflow-x-auto max-h-[600px] overflow-y-auto m-0 bg-white">
                  <code>{activeFile.content}</code>
                </pre>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
