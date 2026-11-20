/* CUET Vocabulary Builder — Background Service Worker (Manifest V3) */
importScripts('shared.js');

const STORAGE_KEYS = {
  entries: 'cuet_entries',
  settings: 'cuet_settings',
};

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function updateActionBadge() {
  try {
    if (!chrome.action || typeof chrome.action.setBadgeText !== 'function') return;
    const [entries, settings] = await Promise.all([getEntries(), getSettings()]);
    const badge = CUETShared.getToolbarBadgeText(entries, settings.dailyGoalTarget);
    await chrome.action.setBadgeText({ text: badge.text });
    await chrome.action.setBadgeBackgroundColor({
      color: badge.isGoalReached ? '#EA580C' : '#002962',
    });
  } catch {
    // Ignore badge errors in restricted contexts
  }
}

function registerContextMenus() {
  try {
    if (!chrome.contextMenus) return;
    chrome.contextMenus.removeAll(() => {
      void chrome.runtime.lastError;
      chrome.contextMenus.create(
        {
          id: 'save-to-vocab-builder',
          title: 'Add to Vocab Vault',
          contexts: ['selection'],
        },
        () => {
          void chrome.runtime.lastError;
        }
      );
    });
  } catch {
    // Ignore context menu registration errors in test contexts
  }
}

async function flashBadgeStatus(text, bgColor) {
  try {
    if (!chrome.action || typeof chrome.action.setBadgeText !== 'function') return;
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: bgColor });
    setTimeout(() => {
      void updateActionBadge();
    }, 3200);
  } catch {
    // Ignore badge errors
  }
}

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
  registerContextMenus();
  await updateActionBadge();
});

registerContextMenus();
updateActionBadge();

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'save-to-vocab-builder' || !info.selectionText) return;
    const rawSelection = info.selectionText;

    if (tab && typeof tab.id === 'number' && tab.id >= 0) {
      try {
        const res = await chrome.tabs.sendMessage(tab.id, {
          type: 'TRIGGER_CONTEXT_SAVE',
          payload: {
            selectionText: rawSelection,
            pageTitle: tab.title || '',
            pageUrl: info.pageUrl || tab.url || '',
          },
        });
        if (res && res.handled) return;
      } catch {
        // Fallback below handles embedded PDFs and restricted pages where content scripts cannot run
      }
    }

    const result = await analyseSingleExpression({
      expression: rawSelection,
      category: 'auto',
      contextSentence: '',
      sourceTitle: (tab && tab.title) || 'Right-click capture',
      sourceUrl: info.pageUrl || (tab && tab.url) || '',
    }).catch((err) => ({ ok: false, error: err instanceof Error ? err.message : 'Save failed.' }));

    if (result && result.ok) {
      await flashBadgeStatus('+1', '#EA580C');
    } else if (result && result.duplicate) {
      await flashBadgeStatus('SAV', '#002962');
    } else {
      await flashBadgeStatus('!', '#b91c1c');
    }
  });
}

if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'save-selected-vocab') return;
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || typeof activeTab.id !== 'number') return;
      await chrome.tabs.sendMessage(activeTab.id, { type: 'TRIGGER_SHORTCUT_SAVE' }).catch(() => null);
    } catch {
      // Ignore restricted tabs cleanly
    }
  });
}

async function getEntries() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.entries);
  return Array.isArray(data[STORAGE_KEYS.entries]) ? data[STORAGE_KEYS.entries] : [];
}

async function saveEntries(entries) {
  await chrome.storage.local.set({ [STORAGE_KEYS.entries]: entries });
  await updateActionBadge();
}

async function getSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return {
    ...CUETShared.DEFAULT_SETTINGS,
    ...(data[STORAGE_KEYS.settings] || {}),
  };
}

function getActiveModel() {
  return CUETShared.GEMINI_MODEL;
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
      throw new Error(`Model "${model}" is temporarily unavailable from the Gemini API. Verify your API key in Settings.`);
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

    const rawText = await response.text().catch(() => '');
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }
    if (!data) {
      return {
        attempted: true,
        synced: false,
        error: 'Apps Script returned a sign-in page instead of JSON. Re-deploy your Web App with "Who has access: Anyone".',
      };
    }
    if (data.ok === false) {
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

async function callAppsScriptAction(webhookUrl, body) {
  const url = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
  if (!url) {
    throw new Error('Add your Google Apps Script Web App URL in Settings first.');
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec/i.test(url)) {
    throw new Error('Invalid Google Apps Script Web App URL. Check Settings.');
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow',
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Could not reach your Apps Script URL. Verify "Who has access" is set to "Anyone".');
  }

  if (!response.ok) {
    throw new Error(`Google Sheet sync returned HTTP ${response.status}.`);
  }

  const rawText = await response.text();
  let data = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error('Apps Script returned a sign-in page instead of JSON. Re-deploy with "Who has access: Anyone".');
  }

  if (!data || data.ok === false) {
    throw new Error((data && data.error) || 'Apps Script rejected the request.');
  }

  return data;
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

  const initialSchedule = CUETShared.createInitialReviewSchedule(new Date());
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
    masteryLevel: 'new',
    favourite: false,
    ...initialSchedule,
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

async function handleTestConnection({ apiKey }) {
  const settings = await getSettings();
  const keyToTest = typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : settings.apiKey;
  const modelToTest = getActiveModel();

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
            hasSheetWebhook: Boolean(settings.sheetWebhookUrl && settings.sheetWebhookUrl.trim()),
            sheetWebhookUrl: settings.sheetWebhookUrl || '',
            inPageHighlighter: settings.inPageHighlighter !== false,
            activeModel: getActiveModel(settings),
            dailyGoalTarget: CUETShared.clampDailyGoal(settings.dailyGoalTarget),
            themeMode: settings.themeMode === 'dark' ? 'dark' : 'light',
            examConfig: settings.examConfig && settings.examConfig.examDate ? settings.examConfig : null,
          });
          return;
        }

        case 'GET_HIGHLIGHTER_STATE': {
          const settings = await getSettings();
          const enabled = settings.inPageHighlighter !== false;
          if (!enabled) {
            sendResponse({ ok: true, enabled: false, entries: [] });
            return;
          }
          const entries = await getEntries();
          const highlightable = CUETShared.getHighlightableEntries(entries).map((e) => ({
            id: e.id,
            expression: e.expression,
            category: e.category,
            meaning: e.meaning,
            example: e.example,
            masteryLevel: CUETShared.getMasteryLevel(e),
          }));
          sendResponse({ ok: true, enabled: true, entries: highlightable });
          return;
        }

        case 'LOOKUP_ENTRY': {
          const entries = await getEntries();
          const match = CUETShared.findDuplicate(entries, message.payload?.expression || '');
          sendResponse({
            ok: true,
            entry: match
              ? {
                  id: match.id,
                  expression: match.expression,
                  category: match.category,
                  meaning: match.meaning,
                  example: match.example,
                  masteryLevel: CUETShared.getMasteryLevel(match),
                }
              : null,
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

          const prevMastery = CUETShared.getMasteryLevel(current);
          const hasMasteryUpdate =
            (patch && CUETShared.VALID_MASTERY_LEVELS.includes(patch.masteryLevel)) ||
            typeof patch?.learned === 'boolean';
          const nextMastery =
            patch && CUETShared.VALID_MASTERY_LEVELS.includes(patch.masteryLevel)
              ? patch.masteryLevel
              : typeof patch?.learned === 'boolean'
                ? patch.learned
                  ? 'mastered'
                  : 'new'
                : prevMastery;

          const skipReview = Boolean(patch?.skipReviewSchedule || message.payload?.skipReviewSchedule);
          const srsPatch =
            hasMasteryUpdate && !skipReview
              ? CUETShared.calculateReviewPatch(current, nextMastery, {
                  countAsReview: patch?.countAsReview !== false && message.payload?.countAsReview !== false,
                })
              : {};

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
            learned: nextMastery === 'mastered',
            masteryLevel: nextMastery,
            favourite: typeof patch?.favourite === 'boolean' ? patch.favourite : current.favourite,
            ...srsPatch,
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

        case 'RECORD_MISS': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const id = message.payload?.id;
          const entries = await getEntries();
          const idx = entries.findIndex((e) => e.id === id);
          if (idx === -1) {
            sendResponse({ ok: false, error: 'Entry not found.' });
            return;
          }
          const missPatch = CUETShared.recordEntryMissPatch(entries[idx], new Date());
          const updated = { ...entries[idx], ...missPatch };
          entries[idx] = updated;
          await saveEntries(entries);
          sendResponse({
            ok: true,
            entry: updated,
            counts: CUETShared.getCategoryCounts(entries),
          });
          return;
        }

        case 'BULK_UPDATE_ENTRIES': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const ids = Array.isArray(message.payload?.ids) ? new Set(message.payload.ids) : new Set();
          const patch = message.payload?.patch || {};
          if (ids.size === 0) {
            sendResponse({ ok: true, updatedCount: 0 });
            return;
          }
          const entries = await getEntries();
          let updatedCount = 0;
          const next = entries.map((entry) => {
            if (!ids.has(entry.id)) return entry;
            updatedCount++;
            let updated = { ...entry };
            if (CUETShared.VALID_CATEGORIES.includes(patch.category)) {
              updated.category = patch.category;
            }
            if (CUETShared.VALID_MASTERY_LEVELS.includes(patch.masteryLevel)) {
              const srs = CUETShared.calculateReviewPatch(updated, patch.masteryLevel, {
                countAsReview: true,
              });
              updated = { ...updated, ...srs };
            }
            if (typeof patch.favourite === 'boolean') {
              updated.favourite = patch.favourite;
            }
            return updated;
          });
          await saveEntries(next);
          sendResponse({
            ok: true,
            updatedCount,
            entries: next,
            counts: CUETShared.getCategoryCounts(next),
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

        case 'DELETE_ENTRIES': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const ids = new Set(Array.isArray(message.payload?.ids) ? message.payload.ids : []);
          const entries = await getEntries();
          const next = entries.filter((e) => !ids.has(e.id));
          await saveEntries(next);
          sendResponse({
            ok: true,
            deletedCount: entries.length - next.length,
            counts: CUETShared.getCategoryCounts(next),
          });
          return;
        }

        case 'RESTORE_ENTRIES': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const toRestore = Array.isArray(message.payload?.entries) ? message.payload.entries : [];
          const entries = await getEntries();
          const existingIds = new Set(entries.map((e) => e.id));
          const existingKeys = new Set(entries.map((e) => CUETShared.normalizeKey(e.expression)));
          const added = [];
          for (const raw of toRestore) {
            const clean = CUETShared.sanitizeEntry(raw);
            if (!clean) continue;
            const key = CUETShared.normalizeKey(clean.expression);
            if (existingIds.has(clean.id) || existingKeys.has(key)) continue;
            existingIds.add(clean.id);
            existingKeys.add(key);
            added.push(clean);
          }
          const next = [...added, ...entries];
          await saveEntries(next);
          sendResponse({
            ok: true,
            restoredCount: added.length,
            entries: next,
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

        case 'EXPORT_ANKI_TSV': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const entries = await getEntries();
          const tsv = CUETShared.buildAnkiTsv(entries);
          sendResponse({ ok: true, tsv, count: entries.length });
          return;
        }

        case 'PUSH_TO_SHEET': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const settings = await getSettings();
          const entries = await getEntries();
          if (entries.length === 0) {
            sendResponse({ ok: true, addedCount: 0, skippedCount: 0 });
            return;
          }
          const rows = [...entries].reverse().map((e) => ({
            category: e.category,
            expression: String(e.expression || '').trim(),
            meaning: String(e.meaning || '').trim(),
            example: String(e.example || '').trim(),
          }));
          const data = await callAppsScriptAction(settings.sheetWebhookUrl, {
            action: 'syncBatch',
            rows,
          });
          sendResponse({
            ok: true,
            addedCount: typeof data.addedCount === 'number' ? data.addedCount : rows.length,
            skippedCount: typeof data.skippedCount === 'number' ? data.skippedCount : 0,
          });
          return;
        }

        case 'PULL_FROM_SHEET': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const settings = await getSettings();
          const data = await callAppsScriptAction(settings.sheetWebhookUrl, {
            action: 'pullAll',
          });
          if (!Array.isArray(data.rows)) {
            sendResponse({
              ok: false,
              error: 'Your deployed Apps Script is an older version without Pull support. Copy the updated script from Settings and deploy a new Web app version.',
            });
            return;
          }
          const entries = await getEntries();
          const merged = CUETShared.mergePulledSheetEntries(entries, data.rows);
          await saveEntries(merged.mergedEntries);
          sendResponse({
            ok: true,
            entries: merged.mergedEntries,
            addedCount: merged.addedCount,
            updatedCount: merged.updatedCount,
            unchangedCount: merged.unchangedCount,
            counts: CUETShared.getCategoryCounts(merged.mergedEntries),
          });
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
          const existingSettings = await getSettings();
          const next = {
            ...existingSettings,
            apiKey: typeof message.payload?.apiKey === 'string' ? message.payload.apiKey.trim() : '',
            model: CUETShared.GEMINI_MODEL,
            sheetWebhookUrl:
              typeof message.payload?.sheetWebhookUrl === 'string'
                ? message.payload.sheetWebhookUrl.trim()
                : '',
            dailyGoalTarget:
              message.payload && message.payload.dailyGoalTarget != null
                ? CUETShared.clampDailyGoal(message.payload.dailyGoalTarget)
                : CUETShared.clampDailyGoal(existingSettings.dailyGoalTarget),
            inPageHighlighter:
              typeof message.payload?.inPageHighlighter === 'boolean'
                ? message.payload.inPageHighlighter
                : existingSettings.inPageHighlighter !== false,
            themeMode:
              message.payload?.themeMode === 'dark' || message.payload?.themeMode === 'light'
                ? message.payload.themeMode
                : existingSettings.themeMode === 'dark'
                  ? 'dark'
                  : 'light',
          };
          await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
          await updateActionBadge();
          sendResponse({ ok: true, settings: next, activeModel: getActiveModel() });
          return;
        }

        case 'SAVE_DAILY_GOAL': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const existingSettings = await getSettings();
          const target = CUETShared.clampDailyGoal(message.payload?.target);
          const next = { ...existingSettings, dailyGoalTarget: target };
          await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
          await updateActionBadge();
          sendResponse({ ok: true, dailyGoalTarget: target });
          return;
        }

        case 'SAVE_THEME_MODE': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const existingSettings = await getSettings();
          const themeMode = message.payload?.themeMode === 'dark' ? 'dark' : 'light';
          const next = { ...existingSettings, themeMode };
          await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
          sendResponse({ ok: true, themeMode });
          return;
        }

        case 'SAVE_EXAM_CONFIG': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const existingSettings = await getSettings();
          const raw = message.payload?.examConfig;
          const examConfig =
            raw && typeof raw.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.examDate.trim())
              ? {
                  examName: String(raw.examName || 'CUET').trim() || 'CUET',
                  examDate: raw.examDate.trim(),
                }
              : null;
          const next = { ...existingSettings, examConfig };
          await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
          sendResponse({ ok: true, examConfig });
          return;
        }

        case 'SAVE_SHEET_WEBHOOK': {
          if (!isExtensionPage(sender)) {
            sendResponse({ ok: false, error: 'Unauthorized action.' });
            return;
          }
          const existingSettings = await getSettings();
          const sheetWebhookUrl =
            typeof message.payload?.sheetWebhookUrl === 'string'
              ? message.payload.sheetWebhookUrl.trim()
              : '';
          const next = { ...existingSettings, sheetWebhookUrl };
          await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
          sendResponse({
            ok: true,
            sheetWebhookUrl,
            hasSheetWebhook: Boolean(sheetWebhookUrl),
          });
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
