import React, { useState } from 'react';
import { ConnectedSheet, SheetInspection } from '../utils/googleSheets';

export interface GoogleSheetsController {
  isSignedIn: boolean;
  isSigningIn: boolean;
  userEmail: string | null;
  connectedSheet: ConnectedSheet | null;
  isBusy: boolean;
  statusMessage: { text: string; tone: 'ok' | 'error' | 'neutral' } | null;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCreateSheet: (title: string) => Promise<void>;
  onInspectExistingSheet: (input: string) => Promise<SheetInspection | null>;
  onConfirmConnectExisting: (inspection: SheetInspection) => Promise<void>;
  onSyncAllEntries: () => Promise<void>;
  onDisconnectSheet: () => void;
  onDismissStatus: () => void;
  totalEntriesCount: number;
}

interface GoogleSheetsBarProps {
  sheets: GoogleSheetsController;
}

export const GoogleSheetsBar: React.FC<GoogleSheetsBarProps> = ({ sheets }) => {
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [sheetInput, setSheetInput] = useState('');
  const [localError, setLocalError] = useState('');

  // Explicit confirmation modals for any mutating Google Sheets operation
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('CUET UG 2027 Vocabulary');
  const [pendingInspection, setPendingInspection] = useState<SheetInspection | null>(null);
  const [confirmSyncOpen, setConfirmSyncOpen] = useState(false);

  const handleInspectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!sheetInput.trim()) {
      setLocalError('Paste your Google Sheet link or spreadsheet ID.');
      return;
    }
    const inspection = await sheets.onInspectExistingSheet(sheetInput);
    if (inspection) {
      setPendingInspection(inspection);
    }
  };

  return (
    <>
      <section
        aria-label="Google Sheets Auto-Save"
        className="bg-white border border-slate-200 rounded-lg px-5 py-4 space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="text-[15px] font-semibold text-slate-900 font-sans">
                Google Sheets Auto-Save
              </h2>
              {sheets.isSignedIn && sheets.connectedSheet && (
                <span className="text-xs font-medium text-teal-700">
                  Active · Tabs: Words, Idioms, Phrasal Verbs
                </span>
              )}
            </div>

            {!sheets.isSignedIn ? (
              <p className="text-[13px] text-slate-600">
                Sign in with Google to automatically save every fetched word, idiom, and phrasal verb into a 3-tab Google Sheet (Word, Meaning, Example Sentence).
              </p>
            ) : sheets.connectedSheet ? (
              <p className="text-[13px] text-slate-600">
                Connected to <strong className="font-semibold text-slate-900">{sheets.connectedSheet.title}</strong>
                {sheets.userEmail ? ` (${sheets.userEmail})` : ''}. Every newly analysed entry is appended immediately to its matching tab.
              </p>
            ) : (
              <p className="text-[13px] text-slate-600">
                Signed in{sheets.userEmail ? ` as ${sheets.userEmail}` : ''}. Create a ready-made 3-tab Google Sheet or connect an existing spreadsheet to turn on auto-save.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!sheets.isSignedIn ? (
              <button
                type="button"
                onClick={sheets.onSignIn}
                disabled={sheets.isSigningIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block', width: '18px', height: '18px' }}
                      aria-hidden="true"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {sheets.isSigningIn ? 'Signing in…' : 'Sign in with Google'}
                  </span>
                  <span style={{ display: 'none' }}>Sign in with Google</span>
                </div>
              </button>
            ) : !sheets.connectedSheet ? (
              <>
                <button
                  type="button"
                  disabled={sheets.isBusy}
                  onClick={() => setConfirmCreateOpen(true)}
                  className="h-9 px-3.5 text-[13px] font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Create CUET Google Sheet
                </button>
                <button
                  type="button"
                  disabled={sheets.isBusy}
                  onClick={() => {
                    setShowConnectForm((v) => !v);
                    setLocalError('');
                  }}
                  className="h-9 px-3.5 text-[13px] font-medium bg-white border border-slate-300 text-slate-800 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Connect Existing Sheet
                </button>
                <button
                  type="button"
                  onClick={sheets.onSignOut}
                  className="h-9 px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <a
                  href={sheets.connectedSheet.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 px-3.5 inline-flex items-center text-[13px] font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
                >
                  Open Google Sheet
                </a>
                {sheets.totalEntriesCount > 0 && (
                  <button
                    type="button"
                    disabled={sheets.isBusy}
                    onClick={() => setConfirmSyncOpen(true)}
                    className="h-9 px-3.5 text-[13px] font-medium bg-white border border-slate-300 text-slate-800 rounded-md hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Sync Library
                  </button>
                )}
                <button
                  type="button"
                  disabled={sheets.isBusy}
                  onClick={() => {
                    sheets.onDisconnectSheet();
                    setShowConnectForm(false);
                  }}
                  className="h-9 px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                >
                  Change Sheet
                </button>
                <button
                  type="button"
                  onClick={sheets.onSignOut}
                  className="h-9 px-2.5 text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>

        {/* Connect existing spreadsheet URL/ID inline form */}
        {sheets.isSignedIn && !sheets.connectedSheet && showConnectForm && (
          <form
            onSubmit={handleInspectSubmit}
            className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2.5"
            noValidate
          >
            <label htmlFor="existing-sheet-url" className="sr-only">
              Google Sheet URL or Spreadsheet ID
            </label>
            <input
              id="existing-sheet-url"
              type="text"
              value={sheetInput}
              onChange={(e) => {
                setSheetInput(e.target.value);
                setLocalError('');
              }}
              placeholder="Paste Google Sheet URL (https://docs.google.com/spreadsheets/d/...) or Spreadsheet ID"
              className="flex-1 h-9 px-3 text-[13px] border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:border-teal-700"
            />
            <button
              type="submit"
              disabled={sheets.isBusy}
              className="h-9 px-4 text-[13px] font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-60 whitespace-nowrap cursor-pointer"
            >
              {sheets.isBusy ? 'Checking…' : 'Check Sheet'}
            </button>
          </form>
        )}

        {localError && (
          <p className="text-xs text-red-700" role="alert">
            {localError}
          </p>
        )}

        {sheets.statusMessage && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 px-3.5 py-2 rounded-md border text-[13px] ${
              sheets.statusMessage.tone === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : sheets.statusMessage.tone === 'ok'
                ? 'bg-teal-50/70 border-teal-200 text-teal-900'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <span>{sheets.statusMessage.text}</span>
            <button
              type="button"
              onClick={sheets.onDismissStatus}
              className="text-xs font-semibold underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </section>

      {/* Confirmation Modal: Create New 3-Tab Google Sheet */}
      {confirmCreateOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-create-sheet-title"
        >
          <div className="w-full max-w-[440px] bg-white border border-slate-200 rounded-lg shadow-xl p-6 space-y-4">
            <h2 id="confirm-create-sheet-title" className="text-lg font-semibold text-slate-900">
              Create CUET Vocabulary Google Sheet?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will create a new Google Sheet in your Google account with three tabs—<strong>Words</strong>, <strong>Idioms</strong>, and <strong>Phrasal Verbs</strong>—each formatted with columns for the expression, simple meaning, and example sentence.
            </p>
            <div className="space-y-1">
              <label htmlFor="new-sheet-title" className="block text-xs font-semibold text-slate-700">
                Spreadsheet Name
              </label>
              <input
                id="new-sheet-title"
                type="text"
                value={newSheetTitle}
                onChange={(e) => setNewSheetTitle(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:border-teal-700"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCreateOpen(false)}
                className="h-9 px-4 text-sm font-medium border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sheets.isBusy}
                onClick={async () => {
                  const title = newSheetTitle.trim() || 'CUET UG 2027 Vocabulary';
                  setConfirmCreateOpen(false);
                  await sheets.onCreateSheet(title);
                }}
                className="h-9 px-4 text-sm font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
              >
                Create Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Connect & Prepare Existing Google Sheet */}
      {pendingInspection && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-connect-sheet-title"
        >
          <div className="w-full max-w-[460px] bg-white border border-slate-200 rounded-lg shadow-xl p-6 space-y-4">
            <h2 id="confirm-connect-sheet-title" className="text-lg font-semibold text-slate-900">
              Connect &ldquo;{pendingInspection.title}&rdquo;?
            </h2>
            {pendingInspection.missingTabs.length > 0 ? (
              <p className="text-sm text-slate-600 leading-relaxed">
                This spreadsheet will be updated by adding the missing tabs:{' '}
                <strong>{pendingInspection.missingTabs.map((t) => t.title).join(', ')}</strong>, with header columns for expression, meaning, and example sentence. Existing tabs will not be overwritten.
              </p>
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed">
                All three tabs (<strong>Words</strong>, <strong>Idioms</strong>, and <strong>Phrasal Verbs</strong>) already exist in this sheet. New entries you fetch will be appended automatically to the matching tab.
              </p>
            )}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingInspection(null)}
                className="h-9 px-4 text-sm font-medium border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sheets.isBusy}
                onClick={async () => {
                  const target = pendingInspection;
                  setPendingInspection(null);
                  setShowConnectForm(false);
                  setSheetInput('');
                  await sheets.onConfirmConnectExisting(target);
                }}
                className="h-9 px-4 text-sm font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
              >
                Confirm &amp; Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Bulk Sync Existing Local Library to Google Sheet */}
      {confirmSyncOpen && sheets.connectedSheet && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-sync-sheet-title"
        >
          <div className="w-full max-w-[440px] bg-white border border-slate-200 rounded-lg shadow-xl p-6 space-y-4">
            <h2 id="confirm-sync-sheet-title" className="text-lg font-semibold text-slate-900">
              Sync {sheets.totalEntriesCount} saved {sheets.totalEntriesCount === 1 ? 'entry' : 'entries'} to Google Sheet?
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              This will check <strong>{sheets.connectedSheet.title}</strong> and append any local entries not yet in your <strong>Words</strong>, <strong>Idioms</strong>, and <strong>Phrasal Verbs</strong> tabs. Existing rows will not be modified or duplicated.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSyncOpen(false)}
                className="h-9 px-4 text-sm font-medium border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 cursor-pointer"
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
                className="h-9 px-4 text-sm font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:opacity-60 cursor-pointer"
              >
                Sync to Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
