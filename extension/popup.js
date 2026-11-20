/* IPMAT/CUET VOCAB BUILDER — Popup Logic */
(function () {
  'use strict';

  const form = document.getElementById('manual-form');
  const textarea = document.getElementById('entry-input');
  const categorySelect = document.getElementById('category-select');
  const saveBtn = document.getElementById('btn-save');
  const statusBox = document.getElementById('status-box');
  const statusSummary = document.getElementById('status-summary');
  const statusDetails = document.getElementById('status-details');
  const apiKeyNotice = document.getElementById('api-key-notice');

  const countVocab = document.getElementById('count-vocabulary');
  const countIdioms = document.getElementById('count-idioms');
  const countPhrasal = document.getElementById('count-phrasal');
  const recentList = document.getElementById('recent-list');
  const streakMeta = document.getElementById('popup-streak-meta');
  const dueBadge = document.getElementById('popup-due-badge');
  const examStrip = document.getElementById('popup-exam-strip');
  const examText = document.getElementById('popup-exam-text');

  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const btnSettings = document.getElementById('btn-settings');
  const btnNoticeSettings = document.getElementById('btn-notice-settings');
  const btnOpenLibrary = document.getElementById('btn-open-library');

  let isProcessing = false;
  let currentTheme = 'light';

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

  function applyTheme(mode) {
    currentTheme = mode === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    if (themeIcon) {
      themeIcon.textContent = currentTheme === 'dark' ? '☀' : '☾';
    }
    if (btnThemeToggle) {
      btnThemeToggle.title =
        currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Night Study Dark Mode';
    }
  }

  function renderState(state) {
    applyTheme(state.themeMode);

    const counts = state.counts || { vocabulary: 0, idioms: 0, phrasalVerbs: 0 };
    countVocab.textContent = String(counts.vocabulary || 0);
    countIdioms.textContent = String(counts.idioms || 0);
    countPhrasal.textContent = String(counts.phrasalVerbs || 0);

    apiKeyNotice.hidden = Boolean(state.hasApiKey);

    const entries = Array.isArray(state.entries) ? state.entries : [];
    const goalTarget = CUETShared.clampDailyGoal(state.dailyGoalTarget);
    const goalStats = CUETShared.computeDailyGoalStats(entries, goalTarget);
    if (streakMeta) {
      const streakPrefix = goalStats.streakDays > 0 ? `${goalStats.streakDays}d streak · ` : '';
      streakMeta.textContent = `${streakPrefix}${goalStats.savedToday}/${goalStats.target} today`;
    }

    const dueQueue = CUETShared.getDailyReviewQueue(entries);
    const dueCount = Array.isArray(dueQueue?.dueEntries)
      ? dueQueue.dueEntries.length
      : Number(dueQueue?.totalDue || dueQueue?.dueCount || 0);
    if (dueBadge) {
      if (dueCount > 0) {
        dueBadge.hidden = false;
        dueBadge.textContent = `${dueCount} due today`;
      } else {
        dueBadge.hidden = true;
      }
    }

    if (examStrip && examText) {
      const countdown = CUETShared.computeExamCountdown(state.examConfig, entries);
      if (countdown) {
        examStrip.hidden = false;
        examText.textContent = countdown.summaryText;
      } else {
        examStrip.hidden = true;
      }
    }

    const recent = entries.slice(0, 5);
    recentList.innerHTML = '';

    if (recent.length === 0) {
      const p = document.createElement('p');
      p.className = 'empty-note';
      p.textContent = 'No entries saved yet. Highlight text on any webpage or add one above.';
      recentList.appendChild(p);
      return;
    }

    for (const item of recent) {
      const row = document.createElement('div');
      row.className = 'recent-item';

      const top = document.createElement('div');
      top.className = 'recent-top';

      const expr = document.createElement('span');
      expr.className = 'recent-expr';
      expr.textContent = item.expression;

      const cat = document.createElement('span');
      cat.className = 'recent-cat';
      cat.textContent = CUETShared.CATEGORIES[item.category] || item.category;

      top.appendChild(expr);
      top.appendChild(cat);

      const meaning = document.createElement('p');
      meaning.className = 'recent-meaning';
      meaning.textContent = item.meaning;

      row.appendChild(top);
      row.appendChild(meaning);
      recentList.appendChild(row);
    }
  }

  async function loadState() {
    try {
      const res = await sendMessage({ type: 'GET_STATE' });
      if (res && res.ok) {
        renderState(res);
      }
    } catch (err) {
      showStatus('Could not load saved data.', [{ text: err.message, isError: true }], 'error');
    }
  }

  function showStatus(summary, details, tone) {
    statusBox.hidden = false;
    statusBox.classList.remove('has-error', 'is-success');
    if (tone === 'error') statusBox.classList.add('has-error');
    if (tone === 'success') statusBox.classList.add('is-success');

    statusSummary.textContent = summary;
    statusDetails.innerHTML = '';

    if (Array.isArray(details) && details.length > 0) {
      statusDetails.hidden = false;
      for (const item of details) {
        const li = document.createElement('li');
        li.textContent = item.text;
        if (item.isError) li.className = 'err-item';
        statusDetails.appendChild(li);
      }
    } else {
      statusDetails.hidden = true;
    }
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', async () => {
      const next = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        await sendMessage({ type: 'SAVE_THEME_MODE', payload: { themeMode: next } });
      } catch {
        // Keep local toggle even if background is busy
      }
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isProcessing) return;

    const entriesToProcess = CUETShared.parseBulkInput(textarea.value);
    if (entriesToProcess.length === 0) {
      showStatus('Please enter at least one word, idiom, or phrasal verb.', [], 'error');
      textarea.focus();
      return;
    }

    isProcessing = true;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Analysing…';

    const selectedCategory = categorySelect.value;
    const total = entriesToProcess.length;
    let savedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const detailItems = [];

    for (let i = 0; i < total; i++) {
      const expr = entriesToProcess[i];
      const cat = selectedCategory === 'auto' ? CUETShared.detectCategory(expr) : selectedCategory;

      showStatus(
        total === 1
          ? `Analysing "${expr}"…`
          : `Analysing ${i + 1} of ${total}: "${expr}"…`,
        detailItems,
        'neutral'
      );

      try {
        const res = await sendMessage({
          type: 'SAVE_AND_ANALYSE',
          payload: {
            expression: expr,
            category: cat,
            contextSentence: '',
            sourceTitle: 'Manual entry',
            sourceUrl: '',
          },
        });

        if (res && res.ok) {
          savedCount++;
          const sheetNote =
            res.sheetSync && res.sheetSync.synced && res.sheetSync.tabName
              ? ` · Added to Sheet (${res.sheetSync.tabName})`
              : res.sheetSync && res.sheetSync.attempted && !res.sheetSync.synced
              ? ' · Sheet sync failed'
              : '';
          detailItems.push({
            text: `Saved "${res.entry.expression}" (${CUETShared.CATEGORIES[res.entry.category]})${sheetNote}`,
            isError: false,
          });
          await loadState();
        } else if (res && res.duplicate) {
          duplicateCount++;
          detailItems.push({
            text: `Skipped duplicate: "${expr}"`,
            isError: false,
          });
        } else {
          failedCount++;
          detailItems.push({
            text: `Failed "${expr}": ${(res && res.error) || 'Unknown error'}`,
            isError: true,
          });
        }
      } catch (err) {
        failedCount++;
        detailItems.push({
          text: `Failed "${expr}": ${err.message}`,
          isError: true,
        });
      }
    }

    const parts = [];
    if (savedCount > 0) parts.push(`${savedCount} saved`);
    if (duplicateCount > 0) parts.push(`${duplicateCount} skipped (duplicate)`);
    if (failedCount > 0) parts.push(`${failedCount} failed`);

    const finalTone = failedCount > 0 && savedCount === 0 ? 'error' : savedCount > 0 ? 'success' : 'neutral';
    showStatus(`Done: ${parts.join(', ')}.`, detailItems, finalTone);

    if (savedCount > 0 && failedCount === 0) {
      textarea.value = '';
    }

    isProcessing = false;
    saveBtn.disabled = false;
    saveBtn.textContent = 'Add to Vocab Vault';
    await loadState();
  });

  function openSettings() {
    chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
    window.close();
  }

  btnSettings.addEventListener('click', openSettings);
  btnNoticeSettings.addEventListener('click', openSettings);

  btnOpenLibrary.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
    window.close();
  });

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.cuetVocabSettings && changes.cuetVocabSettings.newValue) {
        applyTheme(changes.cuetVocabSettings.newValue.themeMode);
      }
      if (changes.cuetVocabEntries) {
        loadState();
      }
    });
  }

  loadState();
})();
