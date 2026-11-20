/* CUET Vocabulary Builder — Settings Page Logic */
(function () {
  'use strict';

  const form = document.getElementById('settings-form');
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyBtn = document.getElementById('btn-toggle-key');
  const sheetWebhookInput = document.getElementById('sheet-webhook-input');
  const dailyGoalInput = document.getElementById('daily-goal-input');
  const highlighterToggle = document.getElementById('highlighter-toggle');
  const saveBtn = document.getElementById('btn-save-settings');
  const testBtn = document.getElementById('btn-test-connection');
  const testSheetBtn = document.getElementById('btn-test-sheet');
  const copyScriptBtn = document.getElementById('btn-copy-script');
  const scriptCodeEl = document.getElementById('apps-script-code');
  const feedbackBox = document.getElementById('feedback-box');

  const APPS_SCRIPT_TEMPLATE = `function readAllCuetRows(ss) {
  var tabMap = [
    { category: 'vocabulary', name: 'Words' },
    { category: 'idioms', name: 'Idioms' },
    { category: 'phrasalVerbs', name: 'Phrasal Verbs' }
  ];
  var rows = [];
  for (var c = 0; c < tabMap.length; c++) {
    var cfg = tabMap[c];
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) continue;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) continue;
    var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    for (var i = 0; i < values.length; i++) {
      var expr = String(values[i][0] || '').trim();
      var meaning = String(values[i][1] || '').trim();
      var example = String(values[i][2] || '').trim();
      if (expr && meaning) {
        rows.push({
          category: cfg.category,
          expression: expr,
          meaning: meaning,
          example: example
        });
      }
    }
  }
  return rows;
}

function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : '';
  if (action === 'pull') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, rows: readAllCuetRows(ss) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, supportsPull: true, status: 'CUET Vocabulary Sheet webhook is active.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateCuetTab(ss, category) {
  var tabMap = {
    vocabulary: { name: 'Words', header: 'Word' },
    idioms: { name: 'Idioms', header: 'Idiom' },
    phrasalVerbs: { name: 'Phrasal Verbs', header: 'Phrasal Verb' }
  };
  var cfg = tabMap[category] || tabMap.vocabulary;
  var sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([cfg.header, 'Meaning', 'Example Sentence']);
    sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return { sheet: sheet, name: cfg.name };
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'pullAll') {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, rows: readAllCuetRows(ss) }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'syncBatch' && Array.isArray(data.rows)) {
      var grouped = { vocabulary: [], idioms: [], phrasalVerbs: [] };
      for (var i = 0; i < data.rows.length; i++) {
        var r = data.rows[i] || {};
        var cat = grouped[r.category] ? r.category : 'vocabulary';
        var expr = String(r.expression || '').trim();
        if (expr) {
          grouped[cat].push([expr, String(r.meaning || '').trim(), String(r.example || '').trim()]);
        }
      }
      var addedCount = 0;
      var skippedCount = 0;
      var cats = ['vocabulary', 'idioms', 'phrasalVerbs'];
      for (var c = 0; c < cats.length; c++) {
        var items = grouped[cats[c]];
        if (!items.length) continue;
        var target = getOrCreateCuetTab(ss, cats[c]).sheet;
        var lastRow = target.getLastRow();
        var existing = {};
        if (lastRow > 1) {
          var colA = target.getRange(2, 1, lastRow - 1, 1).getValues();
          for (var k = 0; k < colA.length; k++) {
            var key = String(colA[k][0] || '').trim().toLowerCase();
            if (key) existing[key] = true;
          }
        }
        var toInsert = [];
        for (var j = 0; j < items.length; j++) {
          var norm = items[j][0].toLowerCase();
          if (existing[norm]) {
            skippedCount++;
          } else {
            existing[norm] = true;
            toInsert.push(items[j]);
          }
        }
        if (toInsert.length) {
          target.getRange(lastRow + 1, 1, toInsert.length, 3).setValues(toInsert);
          addedCount += toInsert.length;
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ ok: true, addedCount: addedCount, skippedCount: skippedCount }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var res = getOrCreateCuetTab(ss, data.category);
    if (!data.testOnly) {
      res.sheet.appendRow([
        String(data.expression || '').trim(),
        String(data.meaning || '').trim(),
        String(data.example || '').trim()
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, tabName: res.name }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  if (scriptCodeEl) {
    scriptCodeEl.textContent = APPS_SCRIPT_TEMPLATE;
  }

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function showFeedback(text, tone) {
    feedbackBox.hidden = false;
    feedbackBox.classList.remove('ok', 'error');
    if (tone === 'ok') feedbackBox.classList.add('ok');
    if (tone === 'error') feedbackBox.classList.add('error');
    feedbackBox.textContent = text;
  }

  async function loadSettings() {
    try {
      const res = await sendMessage({ type: 'GET_SETTINGS' });
      if (res && res.ok && res.settings) {
        apiKeyInput.value = res.settings.apiKey || '';
        if (sheetWebhookInput) {
          sheetWebhookInput.value = res.settings.sheetWebhookUrl || '';
        }
        if (dailyGoalInput) {
          dailyGoalInput.value = String(CUETShared.clampDailyGoal(res.settings.dailyGoalTarget));
        }
        if (highlighterToggle) {
          highlighterToggle.checked = res.settings.inPageHighlighter !== false;
        }
      }
    } catch (err) {
      showFeedback('Could not load saved settings: ' + err.message, 'error');
    }
  }

  toggleKeyBtn.addEventListener('click', () => {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    toggleKeyBtn.textContent = isPassword ? 'Hide' : 'Show';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    try {
      const sheetWebhookUrl = sheetWebhookInput ? sheetWebhookInput.value.trim() : '';
      const dailyGoalTarget = dailyGoalInput
        ? CUETShared.clampDailyGoal(dailyGoalInput.value)
        : CUETShared.DEFAULT_DAILY_GOAL;
      const inPageHighlighter = highlighterToggle ? Boolean(highlighterToggle.checked) : true;
      const res = await sendMessage({
        type: 'SAVE_SETTINGS',
        payload: {
          apiKey: apiKeyInput.value.trim(),
          model: CUETShared.GEMINI_MODEL,
          sheetWebhookUrl,
          dailyGoalTarget,
          inPageHighlighter,
        },
      });

      if (res && res.ok) {
        const sheetNote = sheetWebhookUrl ? ' Google Sheets auto-save enabled.' : '';
        const highlightNote = inPageHighlighter ? ' In-page word highlighter ON.' : ' In-page word highlighter OFF.';
        showFeedback(`Settings saved locally. Active model: ${res.activeModel}.${sheetNote}${highlightNote}`, 'ok');
      } else {
        showFeedback((res && res.error) || 'Failed to save settings.', 'error');
      }
    } catch (err) {
      showFeedback('Error saving settings: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  });

  testBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    const model = CUETShared.GEMINI_MODEL;

    if (!key) {
      showFeedback('Enter your Gemini API key before testing the connection.', 'error');
      apiKeyInput.focus();
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing…';
    showFeedback(`Testing connection with ${model}…`, 'neutral');

    try {
      const res = await sendMessage({
        type: 'TEST_GEMINI_CONNECTION',
        payload: { apiKey: key, model },
      });

      if (res && res.ok && res.sample) {
        showFeedback(
          `Connection succeeded with ${res.model}. Sample analysis — ${res.sample.expression}: ${res.sample.meaning}`,
          'ok'
        );
      } else {
        showFeedback((res && res.error) || 'Connection test failed.', 'error');
      }
    } catch (err) {
      showFeedback('Connection test failed: ' + err.message, 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test Gemini Connection';
    }
  });

  if (testSheetBtn) {
    testSheetBtn.addEventListener('click', async () => {
      const url = sheetWebhookInput ? sheetWebhookInput.value.trim() : '';
      if (!url) {
        showFeedback('Paste your Google Apps Script Web App URL first.', 'error');
        if (sheetWebhookInput) sheetWebhookInput.focus();
        return;
      }

      testSheetBtn.disabled = true;
      testSheetBtn.textContent = 'Testing…';
      showFeedback('Testing Google Sheet auto-save connection…', 'neutral');

      try {
        const res = await sendMessage({
          type: 'TEST_SHEET_CONNECTION',
          payload: { sheetWebhookUrl: url },
        });
        if (res && res.ok) {
          showFeedback(
            `Google Sheet connection succeeded! Ready to auto-save into Words, Idioms, and Phrasal Verbs tabs.`,
            'ok'
          );
        } else {
          showFeedback((res && res.error) || 'Google Sheet test failed.', 'error');
        }
      } catch (err) {
        showFeedback('Google Sheet test failed: ' + err.message, 'error');
      } finally {
        testSheetBtn.disabled = false;
        testSheetBtn.textContent = 'Test Google Sheet';
      }
    });
  }

  if (copyScriptBtn) {
    copyScriptBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
        copyScriptBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyScriptBtn.textContent = 'Copy Apps Script';
        }, 1800);
      } catch {
        showFeedback('Could not copy automatically — select and copy the script box below.', 'neutral');
      }
    });
  }

  loadSettings();
})();
