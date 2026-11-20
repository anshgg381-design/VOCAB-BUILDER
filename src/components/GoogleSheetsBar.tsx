import React, { useState } from 'react';
import { VocabEntry } from '../utils/vocabLogic';
import { SheetTemplateSetupModal } from './SheetTemplateSetupModal';

export interface GoogleSheetsController {
  appsScriptUrl: string | null;
  isBusy: boolean;
  statusMessage: { text: string; tone: 'ok' | 'error' | 'neutral' } | null;
  onSyncAllEntries: () => Promise<void>;
  onPullFromSheet: () => Promise<void>;
  onTestAndConnectAppsScript: (url: string) => Promise<{ ok: boolean; error?: string }>;
  onDisconnectAppsScript: () => void;
  onDismissStatus: () => void;
  totalEntriesCount: number;
  entries: VocabEntry[];
}

interface GoogleSheetsBarProps {
  sheets: GoogleSheetsController;
  onOpenInstallGuide?: () => void;
}

export const GoogleSheetsBar: React.FC<GoogleSheetsBarProps> = ({ sheets, onOpenInstallGuide }) => {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);
  const [confirmPullOpen, setConfirmPullOpen] = useState(false);

  const isAppsScriptConnected = Boolean(sheets.appsScriptUrl);
  const syncTargetLabel = 'your Apps Script Google Sheet';

  return (
    <>
      <section
        aria-label="Google Sheets Auto-Save"
        className="nesoi-card px-5 py-4 space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="text-[15.5px] font-semibold text-[#002962] dark:text-[#F1F5F9]">
                Google Sheets Auto-Save
              </h2>
              {isAppsScriptConnected && (
                <span className="text-xs font-semibold text-[#002962] dark:text-[#DCE8FA] bg-[#EEF3F9] dark:bg-[#1A2942] px-2 py-0.5 rounded">
                  Apps Script Active · Tabs: Words, Idioms, Phrasal Verbs
                </span>
              )}
            </div>

            {isAppsScriptConnected ? (
              <p className="text-[13px] text-[#3B5578] dark:text-[#9FB3CE]">
                Connected via your Apps Script Web App URL. Every newly analysed entry is appended automatically into your Google Sheet&apos;s 3 tabs.
              </p>
            ) : (
              <p className="text-[13px] text-[#3B5578] dark:text-[#9FB3CE]">
                Download our 3-tab starter template (.xlsx / .csv) &amp; open Google Sheets directly to set up Apps Script auto-save, Push, and Pull.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              className="h-9 px-4 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#172540] text-[#002962] dark:text-[#E8EEF7] border border-[#002962]/20 dark:border-[#93C5FD]/25 rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] transition-colors whitespace-nowrap cursor-pointer"
            >
              {isAppsScriptConnected ? 'Template & Deployment' : 'Sheet Template & Setup'}
            </button>
            <a
              href="https://docs.google.com/spreadsheets"
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3.5 inline-flex items-center text-[13px] font-semibold bg-white dark:bg-[#0D1626] border border-[#002962]/20 dark:border-[#93C5FD]/22 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#F5F3F0] dark:hover:bg-[#172540] transition-colors whitespace-nowrap"
            >
              Open Google Sheets &rarr;
            </a>
            {isAppsScriptConnected && sheets.totalEntriesCount > 0 && (
              <button
                type="button"
                disabled={sheets.isBusy}
                onClick={() => setConfirmSyncOpen(true)}
                className="h-9 px-4 text-[13px] font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                Push to Sheet
              </button>
            )}
            {isAppsScriptConnected && (
              <button
                type="button"
                disabled={sheets.isBusy}
                onClick={() => setConfirmPullOpen(true)}
                className="h-9 px-4 text-[13px] font-semibold bg-[#EEF3F9] dark:bg-[#172540] border border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7] rounded-md hover:bg-[#E1EAF5] dark:hover:bg-[#1E3154] disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
              >
                Pull from Sheet
              </button>
            )}
            {isAppsScriptConnected && (
              <button
                type="button"
                disabled={sheets.isBusy}
                onClick={sheets.onDisconnectAppsScript}
                className="h-9 px-2.5 text-xs font-medium text-[#3B5578] dark:text-[#9FB3CE] hover:text-[#002962] dark:hover:text-white whitespace-nowrap cursor-pointer"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {sheets.statusMessage && (
          <div
            role="status"
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-lg border text-[13px] ${
              sheets.statusMessage.tone === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200'
                : sheets.statusMessage.tone === 'ok'
                ? 'bg-[#EEF3F9] dark:bg-[#172540] border-[#002962]/20 dark:border-[#93C5FD]/25 text-[#002962] dark:text-[#E8EEF7]'
                : 'bg-[#F5F3F0] dark:bg-[#0D1626] border-[#002962]/15 dark:border-[#93C5FD]/20 text-[#002962] dark:text-[#E8EEF7]'
            }`}
          >
            <span className="leading-snug">{sheets.statusMessage.text}</span>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {sheets.statusMessage.tone === 'error' && (
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="text-xs font-semibold text-[#002962] dark:text-[#93C5FD] underline cursor-pointer whitespace-nowrap"
                >
                  Open Sheet Template &amp; Apps Script
                </button>
              )}
              {sheets.statusMessage.tone === 'error' && onOpenInstallGuide && (
                <button
                  type="button"
                  onClick={onOpenInstallGuide}
                  className="text-xs font-semibold text-[#002962] dark:text-[#93C5FD] underline cursor-pointer whitespace-nowrap"
                >
                  Install Guide
                </button>
              )}
              <button
                type="button"
                onClick={sheets.onDismissStatus}
                className="text-xs font-semibold underline cursor-pointer whitespace-nowrap"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </section>

      <SheetTemplateSetupModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        entries={sheets.entries}
        appsScriptUrl={sheets.appsScriptUrl}
        isBusy={sheets.isBusy}
        onTestAndConnectAppsScript={sheets.onTestAndConnectAppsScript}
        onSyncViaAppsScript={sheets.onSyncAllEntries}
        onPullViaAppsScript={sheets.onPullFromSheet}
        onDisconnectAppsScript={sheets.onDisconnectAppsScript}
      />

      {/* Confirmation Modal: Bulk Sync Existing Local Library to Google Sheet */}
      {confirmSyncOpen && isAppsScriptConnected && (
        <div
          className="fixed inset-0 z-50 bg-[#002962]/45 dark:bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-sync-sheet-title"
        >
          <div className="w-full max-w-[440px] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 rounded-xl shadow-xl p-6 space-y-4">
            <h2 id="confirm-sync-sheet-title" className="text-lg font-bold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
              Sync {sheets.totalEntriesCount} saved {sheets.totalEntriesCount === 1 ? 'entry' : 'entries'} to Google Sheet?
            </h2>
            <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
              This will check <strong className="text-[#002962] dark:text-white">{syncTargetLabel}</strong> and append any local entries not yet in your <strong className="text-[#002962] dark:text-white">Words</strong>, <strong className="text-[#002962] dark:text-white">Idioms</strong>, and <strong className="text-[#002962] dark:text-white">Phrasal Verbs</strong> tabs. Existing rows will not be modified or duplicated.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSyncOpen(false)}
                className="h-9 px-4 text-sm font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sheets.isBusy}
                onClick={async () => {
                  setConfirmSyncOpen(false);
                  await sheets.onSyncAllEntries();
                }}
                className="h-9 px-4 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 cursor-pointer"
              >
                Push to Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Pull & Merge Entries from Google Sheet */}
      {confirmPullOpen && isAppsScriptConnected && (
        <div
          className="fixed inset-0 z-50 bg-[#002962]/45 dark:bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-pull-sheet-title"
        >
          <div className="w-full max-w-[450px] bg-white dark:bg-[#111C30] border border-[#002962]/15 dark:border-[#93C5FD]/20 rounded-xl shadow-xl p-6 space-y-4">
            <h2 id="confirm-pull-sheet-title" className="text-lg font-bold tracking-tight text-[#002962] dark:text-[#F1F5F9]">
              Pull &amp; Sync Entries from Google Sheet?
            </h2>
            <p className="text-sm text-[#3B5578] dark:text-[#9FB3CE] leading-relaxed">
              This will read rows from <strong className="text-[#002962] dark:text-white">{syncTargetLabel}</strong> (<strong className="text-[#002962] dark:text-white">Words</strong>, <strong className="text-[#002962] dark:text-white">Idioms</strong>, and <strong className="text-[#002962] dark:text-white">Phrasal Verbs</strong> tabs), add any new phrases, and update meanings or examples edited in Sheets — while keeping your local mastery levels and favourites intact.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPullOpen(false)}
                className="h-9 px-4 text-sm font-semibold border border-[#002962]/20 dark:border-[#93C5FD]/22 rounded-md text-[#002962] dark:text-[#E8EEF7] hover:bg-[#F5F3F0] dark:hover:bg-[#172540] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sheets.isBusy}
                onClick={async () => {
                  setConfirmPullOpen(false);
                  await sheets.onPullFromSheet();
                }}
                className="h-9 px-4 text-sm font-semibold bg-[#002962] dark:bg-[#2563EB] text-white rounded-md hover:bg-[#001F4D] dark:hover:bg-[#1D4ED8] disabled:opacity-60 cursor-pointer"
              >
                Pull from Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
