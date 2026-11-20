/* IPMAT/CUET VOCAB BUILDER — Settings Page Logic */
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
  const themeToggleBtn = document.getElementById('btn-theme-toggle');

  const APPS_SCRIPT_TEMPLATE = CUETShared.APPS_SCRIPT_TEMPLATE;
  let currentTheme = 'light';

  if (scriptCodeEl) {
    scriptCodeEl.textContent = APPS_SCRIPT_TEMPLATE;
  }

  function applyTheme(mode) {
    currentTheme = mode === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = currentTheme === 'dark' ? '☀ Light Mode' : '☾ Night Mode';
      themeToggleBtn.title =
        currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Night Study Dark Mode';
    }
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

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function loadSettings() {
    try {
      const res = await sendMessage({ type: 'GET_SETTINGS' });
      if (res && res.ok && res.settings) {
        applyTheme(res.settings.themeMode);
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

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', async () => {
      const next = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        await sendMessage({ type: 'SAVE_THEME_MODE', payload: { themeMode: next } });
      } catch {
        // Keep local toggle
      }
    });
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
      if (sheetWebhookUrl) {
        const validation = CUETShared.validateAppsScriptUrlInput(sheetWebhookUrl);
        if (!validation.ok) {
          showFeedback(validation.error, 'error');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Settings';
          return;
        }
      }

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
          themeMode: currentTheme,
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
      const validation = CUETShared.validateAppsScriptUrlInput(url);
      if (!validation.ok) {
        showFeedback(validation.error, 'error');
        if (sheetWebhookInput) sheetWebhookInput.focus();
        return;
      }

      testSheetBtn.disabled = true;
      testSheetBtn.textContent = 'Testing…';
      showFeedback('Testing Google Sheet auto-save connection…', 'neutral');

      try {
        const res = await sendMessage({
          type: 'TEST_SHEET_CONNECTION',
          payload: { sheetWebhookUrl: validation.url },
        });
        if (res && res.ok) {
          showFeedback(
            'Google Sheet connection succeeded! Ready to auto-save into Words, Idioms, and Phrasal Verbs tabs.',
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

  document.querySelectorAll('[data-template-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-template-cat');
      const csv = CUETShared.buildTemplateCsv(cat, [], false);
      const slug = cat === 'phrasalVerbs' ? 'phrasal-verbs' : cat === 'idioms' ? 'idioms' : 'words';
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `ipmat-cuet-template-${slug}.csv`);
    });
  });

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.cuetVocabSettings && changes.cuetVocabSettings.newValue) {
        applyTheme(changes.cuetVocabSettings.newValue.themeMode);
      }
    });
  }

  loadSettings();
})();
