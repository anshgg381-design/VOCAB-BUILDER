IPMAT/CUET VOCAB BUILDER — Browser Extension (Manifest V3)
==========================================================

Supported Browsers (Windows & macOS):
  - Google Chrome (chrome://extensions)
  - Brave (brave://extensions)
  - Microsoft Edge (edge://extensions)
  - Vivaldi (vivaldi://extensions)
  - Opera / Opera GX (opera://extensions)
  - Arc (arc://extensions)
  - Chromium / Ungoogled Chromium (chrome://extensions)

1. Get a free Gemini API key
----------------------------
1. Go to https://aistudio.google.com and sign in with your Google account.
2. Click "Get API key" in the left menu.
3. Click "Create API key" and copy the key (starts with AIza...).

2. Install in Your Browser (Windows or Mac)
-------------------------------------------
1. Extract/unzip this folder to a permanent location (for example,
   Documents/ipmat-cuet-vocab-builder) so you do not accidentally delete it.
2. Open your browser's extensions page (e.g. chrome://extensions,
   brave://extensions, edge://extensions, vivaldi://extensions,
   opera://extensions, or arc://extensions).
3. Turn ON "Developer mode" (top-right corner, or left sidebar in Edge).
4. Click "Load unpacked".
5. Select the folder that directly contains manifest.json.
6. Pin the extension from the puzzle-piece Extensions menu in your toolbar.

3. Configure your Gemini API key & Preferences
----------------------------------------------
1. Click the pinned extension icon and click "Settings".
2. Paste your Gemini API key (powered by Gemini 3.1 Flash Lite), set your
   Daily Study Goal, and toggle the optional In-Page Word Highlighter.
3. Click "Save Settings", then click "Test Gemini Connection".

4. Everyday Capture & Revision Features
---------------------------------------
- Highlight-to-Save: Select any word, idiom, or phrasal verb on any webpage
  and click the floating "Add to Vocab Vault" button.
- Right-Click & Shortcut: Right-click selected text -> "Add to Vocab Vault",
  or press Alt+Shift+V (Option+Shift+V on Mac) — works even on embedded PDFs.
- In-Page Word Highlighter: Optionally underlines saved New and Learning words
  while you read articles, with hover-to-peek meaning tooltips.
- THE VOCAB VAULT Dashboard: Filter by category, mastery level, source, Due
  Today (SRS), or Needs Practice; track your Exam Countdown & daily pace;
  toggle Night Study Dark Mode; use Bulk Multi-Select Actions & 5s Undo on
  delete; unlock Mastery Badges; practice with 3D Flip Flashcards & MCQs;
  connect Google Sheets directly with built-in Setup Guide; download A4 PDF
  Study Sheets; and export Anki (.tsv), CSV, or JSON backups.

5. Optional: Two-Way Google Sheets Sync (3 Tabs)
------------------------------------------------
Every saved entry can auto-append [Word/Expression, Meaning, Example Sentence]
into three tabs in your Google Sheet: "Words", "Idioms", and "Phrasal Verbs",
and you can click "Pull from Sheet" in the dashboard to sync edits back down.

1. Open Google Sheets (https://docs.google.com/spreadsheets) and import the
   3-tab starter template from the web app (or open any blank sheet).
2. Click Extensions -> Apps Script.
3. Open the extension's Settings page, click "Copy Apps Script", paste it into
   Apps Script, and save.
4. Click Deploy -> New deployment -> Web app -> set Execute as "Me" and Who has
   access to "Anyone" -> Deploy & Authorise access.
5. Copy the /exec Web App URL, paste it into "Google Sheets Auto-Save URL" in
   Settings, click "Save Settings", and click "Test Google Sheet".

6. Important Backup Reminder
----------------------------
All entries are stored locally in your browser (chrome.storage.local).
Uninstalling the extension may remove locally stored data. Periodically open
"THE VOCAB VAULT" -> "Backup & Export" -> "Export JSON Backup" to keep a safe
copy. Exported backups never include your Gemini API key or Sheet URL.
