/* CUET Vocabulary Builder — Settings Page Logic */
(function () {
  'use strict';

  const form = document.getElementById('settings-form');
  const apiKeyInput = document.getElementById('api-key-input');
  const toggleKeyBtn = document.getElementById('btn-toggle-key');
  const modelSelect = document.getElementById('model-select');
  const customModelInput = document.getElementById('custom-model-input');
  const sheetWebhookInput = document.getElementById('sheet-webhook-input');
  const saveBtn = document.getElementById('btn-save-settings');
  const testBtn = document.getElementById('btn-test-connection');
  const testSheetBtn = document.getElementById('btn-test-sheet');
  const copyScriptBtn = document.getElementById('btn-copy-script');
  const scriptCodeEl = document.getElementById('apps-script-code');
  const feedbackBox = document.getElementById('feedback-box');

  const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var tabMap = {
      vocabulary: { name: 'Words', header: 'Word' },
      idioms: { name: 'Idioms', header: 'Idiom' },
      phrasalVerbs: { name: 'Phrasal Verbs', header: 'Phrasal Verb' }
    };
    var cfg = tabMap[data.category] || tabMap.vocabulary;

    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([cfg.header, 'Meaning', 'Example Sentence']);
      sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    if (!data.testOnly) {
      sheet.appendRow([
        String(data.expression || '').trim(),
        String(data.meaning || '').trim(),
        String(data.example || '').trim()
      ]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, tabName: cfg.name }))
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

  function populateModels() {
    modelSelect.innerHTML = '';
    for (const m of CUETShared.GEMINI_MODELS) {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      modelSelect.appendChild(opt);
    }
  }

  function showFeedback(text, tone) {
    feedbackBox.hidden = false;
    feedbackBox.classList.remove('ok', 'error');
    if (tone === 'ok') feedbackBox.classList.add('ok');
    if (tone === 'error') feedbackBox.classList.add('error');
    feedbackBox.textContent = text;
  }

  async function loadSettings() {
    populateModels();
    try {
      const res = await sendMessage({ type: 'GET_SETTINGS' });
      if (res && res.ok && res.settings) {
        apiKeyInput.value = res.settings.apiKey || '';
        const savedModel = res.settings.model || CUETShared.DEFAULT_SETTINGS.model;
        const existsInDropdown = CUETShared.GEMINI_MODELS.some((m) => m.id === savedModel);
        modelSelect.value = existsInDropdown ? savedModel : CUETShared.DEFAULT_SETTINGS.model;
        customModelInput.value = res.settings.customModel || (existsInDropdown ? '' : savedModel);
        if (sheetWebhookInput) {
          sheetWebhookInput.value = res.settings.sheetWebhookUrl || '';
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
      const res = await sendMessage({
        type: 'SAVE_SETTINGS',
        payload: {
          apiKey: apiKeyInput.value.trim(),
          model: modelSelect.value,
          customModel: customModelInput.value.trim(),
          sheetWebhookUrl,
        },
      });

      if (res && res.ok) {
        const sheetNote = sheetWebhookUrl ? ' Google Sheets auto-save enabled.' : '';
        showFeedback(`Settings saved locally. Active model: ${res.activeModel}.${sheetNote}`, 'ok');
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
    const model = customModelInput.value.trim() || modelSelect.value;

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
