import React, { useEffect, useState } from 'react';
import {
  BRAVE_APPS_SCRIPT_CODE,
  validateAppsScriptUrlInput,
} from '../utils/googleSheets';
import {
  STARTER_CSV_FILENAMES,
  STARTER_XLSX_FILENAME,
  downloadTemplateCsv,
  downloadTemplateXlsx,
} from '../utils/sheetTemplate';
import { VocabEntry } from '../utils/vocabLogic';

interface SheetTemplateSetupModalProps {
  open: boolean;
  onClose: () => void;
  entries: VocabEntry[];
  appsScriptUrl: string | null;
  isBusy: boolean;
  onTestAndConnectAppsScript: (url: string) => Promise<{ ok: boolean; error?: string }>;
  onSyncViaAppsScript: () => Promise<void>;
  onPullViaAppsScript?: () => Promise<void>;
  onDisconnectAppsScript: () => void;
}

export const SheetTemplateSetupModal: React.FC<SheetTemplateSetupModalProps> = ({
  open,
  onClose,
  entries,
  appsScriptUrl,
  isBusy,
  onTestAndConnectAppsScript,
  onSyncViaAppsScript,
  onPullViaAppsScript,
  onDisconnectAppsScript,
}) => {
  const [includeSavedEntries, setIncludeSavedEntries] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [downloadNote, setDownloadNote] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptPreview, setShowScriptPreview] = useState(false);
  const [webhookInput, setWebhookInput] = useState(appsScriptUrl || '');
  const [webhookStatus, setWebhookStatus] = useState<{
    text: string;
    tone: 'ok' | 'error';
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setWebhookInput(appsScriptUrl || '');
    setWebhookStatus(null);
    setDownloadNote(null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, appsScriptUrl, onClose]);

  if (!open) return null;

  const handleDownloadXlsx = async () => {
    if (downloadingXlsx) return;
    setDownloadingXlsx(true);
    setDownloadNote(null);
    try {
      await downloadTemplateXlsx({ entries, includeEntries: includeSavedEntries });
      setDownloadNote(
        includeSavedEntries
          ? `Downloaded ${STARTER_XLSX_FILENAME} with ${entries.length} saved entries across Words, Idioms, and Phrasal Verbs.`
          : `Downloaded blank 3-tab ${STARTER_XLSX_FILENAME} (Words, Idioms, Phrasal Verbs).`
      );
    } catch {
      setDownloadNote('Could not generate the .xlsx workbook in this browser.');
    } finally {
      setDownloadingXlsx(false);
    }
  };

  const handleDownloadCsv = () => {
    downloadTemplateCsv('vocabulary', entries, includeSavedEntries);
    const wordsCount = entries.filter((e) => e.category === 'vocabulary').length;
    setDownloadNote(
      includeSavedEntries
        ? `Downloaded ${STARTER_CSV_FILENAMES.vocabulary} (${wordsCount} Words rows).`
        : `Downloaded blank ${STARTER_CSV_FILENAMES.vocabulary} matching Word,Meaning,Example Sentence.`
    );
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(BRAVE_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 1800);
    } catch {
      setShowScriptPreview(true);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookStatus(null);
    const validation = validateAppsScriptUrlInput(webhookInput);
    if (!validation.ok) {
      setWebhookStatus({ text: validation.error, tone: 'error' });
      return;
    }

    const res = await onTestAndConnectAppsScript(validation.url);
    if (res.ok) {
      setWebhookStatus({
        text: 'Deployment verified and connected. Every new word you analyse will now auto-save directly to your Google Sheet.',
        tone: 'ok',
      });
    } else {
      setWebhookStatus({
        text: res.error || 'Could not reach your Apps Script deployment.',
        tone: 'error',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#002962]/45 dark:bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-template-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[740px] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-[#002962] dark:bg-[#0B162C] text-white flex items-start justify-between gap-4 shrink-0 border-b border-transparent dark:border-[#93C5FD]/15">
          <div>
            <h2
              id="sheet-template-modal-title"
              className="font-editorial text-lg sm:text-[21px] font-semibold tracking-tight"
            >
              Google Sheet Template &amp; Apps Script Deployment
            </h2>
            <p className="text-xs sm:text-[13px] text-[#DCE8FA] mt-0.5">
              Download the exact 3-column sheet format, open Google Sheets in your browser to save it, and connect your Web App URL.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup modal"
            className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg leading-none cursor-pointer shrink-0"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Wizard Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Step 1: Download Template or Open Directly in Google Sheets */}
          <section className="rounded-xl border border-[#002962]/12 dark:border-[#93C5FD]/15 bg-[#F5F3F0] dark:bg-[#0D1626] p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#002962] dark:text-[#F1F5F9]">
                Step 1. Download Template or Open Google Sheets
              </h3>
              <span className="text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE]">
                3 Tabs &middot; 3 Columns
              </span>
            </div>

            {/* Format Preview */}
            <div className="rounded-lg border border-[#002962]/15 dark:border-[#93C5FD]/20 bg-white dark:bg-[#111C30] overflow-hidden">
              <div className="px-3 py-1.5 bg-[#EEF3F9] dark:bg-[#172540] border-b border-[#002962]/15 dark:border-[#93C5FD]/18 flex flex-wrap items-center gap-2 text-[11.5px] font-semibold text-[#002962] dark:text-[#DCE8FA]">
                <span>Tabs:</span>
                <span className="px-2 py-0.5 rounded bg-white dark:bg-[#0D1626] border border-[#002962]/20 dark:border-[#93C5FD]/25">Words</span>
                <span className="px-2 py-0.5 rounded bg-white/75 dark:bg-[#0D1626]/70 border border-[#002962]/15 dark:border-[#93C5FD]/18 text-[#3B5578] dark:text-[#9FB3CE]">Idioms</span>
                <span className="px-2 py-0.5 rounded bg-white/75 dark:bg-[#0D1626]/70 border border-[#002962]/15 dark:border-[#93C5FD]/18 text-[#3B5578] dark:text-[#9FB3CE]">Phrasal Verbs</span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-[#002962]/12 dark:divide-[#93C5FD]/15 text-xs font-semibold text-[#002962] dark:text-[#E8EEF7] bg-white dark:bg-[#111C30]">
                <div className="px-3 py-2">A1: Word</div>
                <div className="px-3 py-2">B1: Meaning</div>
                <div className="px-3 py-2">C1: Example Sentence</div>
              </div>
            </div>

            {entries.length > 0 && (
              <label className="flex items-center gap-2.5 text-[13px] text-[#3B5578] dark:text-[#9FB3CE] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeSavedEntries}
                  onChange={(e) => setIncludeSavedEntries(e.target.checked)}
                  className="h-4 w-4 accent-[#002962] dark:accent-[#3B82F6] rounded cursor-pointer"
                />
                <span>
                  Pre-fill template with my current saved library (<strong className="text-[#002962] dark:text-white">{entries.length}</strong> entries)
                </span>
              </label>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadXlsx}
                disabled={downloadingXlsx}
                className="h-9 px-4 text-[13px] font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {downloadingXlsx ? 'Preparing .xlsx…' : 'Download 3-Tab Sheet (.xlsx)'}
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                className="h-9 px-4 text-[13px] font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#EEF3F9] dark:hover:bg-[#172540] transition-colors cursor-pointer"
              >
                Download Words CSV (.csv)
              </button>
              <a
                href="https://docs.google.com/spreadsheets"
                target="_blank"
                rel="noopener noreferrer"
                className="h-9 px-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] transition-colors whitespace-nowrap"
              >
                Open in Google Sheets &rarr;
              </a>
            </div>

            <p className="text-xs text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
              Click <strong className="text-[#002962] dark:text-white">Open in Google Sheets</strong> (<code className="text-[11.5px] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">docs.google.com/spreadsheets</code>) to launch Google Sheets directly in your browser, start a blank sheet, and import the downloaded file via <strong className="text-[#002962] dark:text-white">File &rarr; Import &rarr; Upload</strong>.
            </p>

            {downloadNote && (
              <p className="text-xs font-medium text-[#002962] dark:text-[#E8EEF7] bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md px-3 py-2">
                {downloadNote}
              </p>
            )}
          </section>

          {/* Step 2: Import to Google Account & Deploy Apps Script */}
          <section className="rounded-xl border border-[#002962]/12 dark:border-[#93C5FD]/15 bg-white dark:bg-[#0D1626] p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#002962] dark:text-[#F1F5F9]">
                Step 2. Save in Your Google Account &amp; Deploy Apps Script
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://docs.google.com/spreadsheets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 px-3 inline-flex items-center text-xs font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540]"
                >
                  docs.google.com/spreadsheets &rarr;
                </a>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="h-8 px-3.5 text-xs font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] cursor-pointer"
                >
                  {copiedScript ? 'Copied Script!' : 'Copy Apps Script'}
                </button>
              </div>
            </div>

            <ol className="list-decimal pl-5 space-y-1.5 text-[13.5px] text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
              <li>
                Open <strong className="text-[#002962] dark:text-white">Google Sheets</strong> (<code className="text-xs bg-[#F5F3F0] dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">docs.google.com/spreadsheets</code>), create a blank spreadsheet, click{' '}
                <strong className="text-[#002962] dark:text-white">File &rarr; Import &rarr; Upload</strong>, and select{' '}
                <code className="text-xs bg-[#F5F3F0] dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#93C5FD]/20 px-1.5 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">
                  {STARTER_XLSX_FILENAME}
                </code>{' '}
                (choose <strong className="text-[#002962] dark:text-white">Replace spreadsheet</strong>).
              </li>
              <li>
                In Google Sheets top menu, click <strong className="text-[#002962] dark:text-white">Extensions &rarr; Apps Script</strong>, delete all placeholder lines, paste the copied script, and click <strong className="text-[#002962] dark:text-white">Save</strong>.
              </li>
              <li>
                Click <strong className="text-[#002962] dark:text-white">Deploy &rarr; New deployment</strong> &rarr; gear icon &rarr; <strong className="text-[#002962] dark:text-white">Web app</strong>. Set <strong className="text-[#002962] dark:text-white">Execute as: Me</strong> and <strong className="text-[#002962] dark:text-white">Who has access: Anyone</strong>, then click <strong className="text-[#002962] dark:text-white">Deploy</strong>.
              </li>
              <li>
                Click <strong className="text-[#002962] dark:text-white">Authorise access</strong> &rarr; select your Google account &rarr; click <strong className="text-[#002962] dark:text-white">Advanced &rarr; Go to Untitled project (unsafe) &rarr; Allow</strong>, then copy the final <strong className="text-[#002962] dark:text-white">Web app URL</strong> (<code className="text-xs bg-[#F5F3F0] dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#93C5FD]/20 px-1 py-0.5 rounded text-[#002962] dark:text-[#DCE8FA]">/exec</code>).
              </li>
            </ol>

            <div>
              <button
                type="button"
                onClick={() => setShowScriptPreview((v) => !v)}
                className="text-xs font-semibold text-[#002962] dark:text-[#93C5FD] underline cursor-pointer"
              >
                {showScriptPreview ? 'Hide Apps Script code' : 'Preview Apps Script code'}
              </button>
              {showScriptPreview && (
                <pre className="mt-2 p-3 bg-[#F5F3F0] dark:bg-[#111C30] border border-[#002962]/12 dark:border-[#93C5FD]/20 rounded-lg text-[11.5px] text-[#002962] dark:text-[#DCE8FA] overflow-x-auto max-h-48 leading-relaxed">
                  {BRAVE_APPS_SCRIPT_CODE}
                </pre>
              )}
            </div>
          </section>

          {/* Step 3: Connect & Test Deployment */}
          <section className="rounded-xl border border-[#002962]/12 dark:border-[#93C5FD]/15 bg-white dark:bg-[#0D1626] p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-[#002962] dark:text-[#F1F5F9]">
                Step 3. Connect &amp; Verify Deployment URL
              </h3>
              {appsScriptUrl && (
                <span className="text-xs font-semibold text-[#002962] dark:text-[#DCE8FA] bg-[#EEF3F9] dark:bg-[#1A2942] px-2 py-0.5 rounded">
                  Connected &amp; Active
                </span>
              )}
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-2.5" noValidate>
              <label htmlFor="apps-script-webhook-input" className="block text-xs font-semibold text-[#002962] dark:text-[#DCE8FA]">
                Google Apps Script Web App URL (also paste this same URL in your browser extension Settings)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="apps-script-webhook-input"
                  type="url"
                  value={webhookInput}
                  onChange={(e) => {
                    setWebhookInput(e.target.value);
                    setWebhookStatus(null);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 h-9 px-3 text-[13px] border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md bg-white dark:bg-[#111C30] text-[#002962] dark:text-[#E8EEF7] placeholder:text-[#5E7494] dark:placeholder:text-[#7C95B6] focus:outline-none focus:border-[#002962] dark:focus:border-[#60A5FA]"
                />
                <button
                  type="submit"
                  disabled={isBusy}
                  className="h-9 px-4 text-[13px] font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                >
                  {isBusy ? 'Testing…' : 'Test & Connect'}
                </button>
              </div>
            </form>

            {webhookStatus && (
              <div
                role="alert"
                className={`px-3 py-2 rounded-md border text-xs leading-relaxed ${
                  webhookStatus.tone === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200'
                    : 'bg-[#EEF3F9] dark:bg-[#172540] border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7]'
                }`}
              >
                {webhookStatus.text}
              </div>
            )}

            {appsScriptUrl && (
              <div className="pt-2 border-t border-[#002962]/12 dark:border-[#93C5FD]/15 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {entries.length > 0 && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={onSyncViaAppsScript}
                      className="h-8 px-3.5 text-xs font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] disabled:opacity-60 cursor-pointer"
                    >
                      Push {entries.length} Saved {entries.length === 1 ? 'Entry' : 'Entries'}
                    </button>
                  )}
                  {onPullViaAppsScript && (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={onPullViaAppsScript}
                      className="h-8 px-3.5 text-xs font-semibold bg-white dark:bg-[#111C30] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#F5F3F0] dark:hover:bg-[#172540] disabled:opacity-60 cursor-pointer"
                    >
                      Pull from Sheet
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    onDisconnectAppsScript();
                    setWebhookInput('');
                    setWebhookStatus(null);
                  }}
                  className="h-8 px-3 text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE] hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
                >
                  Disconnect Deployment URL
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
