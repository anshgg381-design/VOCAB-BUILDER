CUET Vocabulary Builder — Brave Desktop Extension (Manifest V3)
===============================================================

1. Get a free Gemini API key
----------------------------
1. Go to https://aistudio.google.com and sign in with your Google account.
2. Click "Get API key" in the left menu.
3. Click "Create API key" and copy the key (starts with AIza...).

2. Install in Brave Desktop
---------------------------
1. Unzip this folder to a permanent location on your computer (for example,
   Documents/cuet-vocabulary-builder) so you do not accidentally delete it.
2. Open Brave and type brave://extensions in the address bar, then press Enter.
3. Turn ON "Developer mode" (top-right corner).
4. Click "Load unpacked".
5. Select the folder that contains manifest.json.
6. Pin "CUET Vocabulary Builder" from the puzzle-piece Extensions icon in Brave.

3. Configure your Gemini API key
--------------------------------
1. Click the CUET Vocabulary Builder extension icon in Brave.
2. Click "Settings".
3. Paste your Gemini API key, choose a model (Gemini 2.5 Flash is recommended),
   click "Save Settings", and click "Test Gemini Connection".

4. Optional: Auto-Save to Google Sheets (3 Tabs)
------------------------------------------------
Every time you fetch a meaning from Gemini, the extension can automatically
append [Word/Expression, Meaning, Example Sentence] into three tabs in your
Google Sheet: "Words", "Idioms", and "Phrasal Verbs".

1. Open a Google Sheet (or visit https://sheets.new).
2. Click Extensions -> Apps Script.
3. Open the extension's Settings page, click "Copy Apps Script", paste it into
   Apps Script, and save.
4. Click Deploy -> New deployment -> Web app -> set access to "Anyone" -> Deploy.
5. Copy the /exec Web App URL, paste it into "Google Sheets Auto-Save URL" in
   Settings, click "Save Settings", and click "Test Google Sheet".

5. Important Backup Reminder
----------------------------
All entries are stored locally in Brave (chrome.storage.local). Uninstalling
the extension may remove your locally stored data. Periodically open
"My CUET Library" -> "Backup & Export" -> "Export JSON Backup" to keep a safe
copy. Exported backups never include your Gemini API key or Sheet URL.
