/* IPMAT/CUET VOCAB BUILDER — THE VOCAB VAULT Dashboard Logic */
(function () {
  'use strict';

  let allEntries = [];
  let activeTab = 'vocabulary';
  let searchQuery = '';
  let statusFilter = 'all';
  let sourceFilter = 'all';
  let sortOrder = 'recent';
  let reanalysingIds = new Set();
  let pendingConfirmAction = null;

  let themeMode = 'light';
  let examConfig = null;
  let hasSheetWebhook = false;
  let sheetWebhookUrl = '';
  let isSheetSyncBusy = false;

  // Select / Bulk mode
  let isSelectMode = false;
  let selectedIds = new Set();

  // Toast & 5s Undo state
  let toastTimer = null;
  let undoBuffer = null;

  // Insights & Speech
  let showInsights = true;
  let insightsMetric = 'mastered';
  let copiedEntryId = null;
  let speakingKey = null;

  // Study Mode
  let isStudyMode = false;
  let isQuizMode = false;
  let studyScope = 'dailyReview';
  let studyDeckIds = [];
  let studyIndex = 0;
  let studyFlipped = false;
  let studyKnownIds = [];
  let studyNeedsReviewIds = [];
  let studyComplete = false;
  let studyMissedRound = false;

  // Quiz Mode
  let quizPhase = 'setup';
  let quizSelectionMode = 'random';
  let quizCount = 5;
  let quizSelectedIds = [];
  let quizSetupError = '';
  let quizQuestions = [];
  let quizIndex = 0;
  let quizChosenOption = null;
  let quizAnswers = [];
  let quizPromoted = false;

  // Daily Goal
  let dailyGoalTarget = CUETShared.DEFAULT_DAILY_GOAL;
  let prevDailyGoalReached = null;
  let dailyCelebrateTimer = null;

  // DOM References
  const apiKeyBanner = document.getElementById('api-key-banner');
  const toastBar = document.getElementById('toast-bar');
  const toastText = document.getElementById('toast-text');
  const btnToastUndo = document.getElementById('btn-toast-undo');
  const btnToastDismiss = document.getElementById('btn-toast-dismiss');
  const toastProgressWrap = document.getElementById('toast-progress-wrap');
  const toastProgressBar = document.getElementById('toast-progress-bar');

  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');

  const entriesList = document.getElementById('entries-list');
  const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
  const tabCounts = {
    all: document.getElementById('tab-count-all'),
    vocabulary: document.getElementById('tab-count-vocabulary'),
    idioms: document.getElementById('tab-count-idioms'),
    phrasalVerbs: document.getElementById('tab-count-phrasalVerbs'),
  };

  // Search, Filters, Quick Chips & Bulk
  const searchInput = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const searchMeta = document.getElementById('search-meta');
  const filterSelect = document.getElementById('filter-select');
  const sourceSelect = document.getElementById('source-select');
  const sortSelect = document.getElementById('sort-select');
  const btnQuickDue = document.getElementById('btn-quick-due');
  const quickDueCount = document.getElementById('quick-due-count');
  const btnQuickPractice = document.getElementById('btn-quick-practice');
  const quickPracticeCount = document.getElementById('quick-practice-count');
  const btnResetFilters = document.getElementById('btn-reset-filters');
  const btnSelectMode = document.getElementById('btn-select-mode');
  const bulkBar = document.getElementById('bulk-bar');
  const bulkCountLabel = document.getElementById('bulk-count-label');
  const btnBulkSelectAll = document.getElementById('btn-bulk-select-all');
  const btnBulkClear = document.getElementById('btn-bulk-clear');
  const btnBulkMastered = document.getElementById('btn-bulk-mastered');
  const btnBulkLearning = document.getElementById('btn-bulk-learning');
  const bulkMoveSelect = document.getElementById('bulk-move-select');
  const btnBulkPdf = document.getElementById('btn-bulk-pdf');
  const btnBulkAnki = document.getElementById('btn-bulk-anki');
  const btnBulkDelete = document.getElementById('btn-bulk-delete');

  // Exam Countdown
  const examDaysBadge = document.getElementById('exam-days-badge');
  const examSummary = document.getElementById('exam-summary');
  const btnExamToggle = document.getElementById('btn-exam-toggle');
  const btnExamClear = document.getElementById('btn-exam-clear');
  const examForm = document.getElementById('exam-form');
  const examNameInput = document.getElementById('exam-name-input');
  const examDateInput = document.getElementById('exam-date-input');
  const btnExamCancel = document.getElementById('btn-exam-cancel');

  // Google Sheets Bar & Inline Guide
  const sheetsConnectedBadge = document.getElementById('sheets-connected-badge');
  const sheetsBarDesc = document.getElementById('sheets-bar-desc');
  const btnToggleSheetsGuide = document.getElementById('btn-toggle-sheets-guide');
  const btnBarSheetPush = document.getElementById('btn-bar-sheet-push');
  const btnBarSheetPull = document.getElementById('btn-bar-sheet-pull');
  const btnBarSheetDisconnect = document.getElementById('btn-bar-sheet-disconnect');
  const sheetsInlineStatus = document.getElementById('sheets-inline-status');
  const sheetsGuidePanel = document.getElementById('sheets-guide-panel');
  const tplIncludeEntries = document.getElementById('tpl-include-entries');
  const btnTplWords = document.getElementById('btn-tpl-words');
  const btnTplIdioms = document.getElementById('btn-tpl-idioms');
  const btnTplPhrasal = document.getElementById('btn-tpl-phrasal');
  const btnGuideCopyScript = document.getElementById('btn-guide-copy-script');
  const guideAppsScriptCode = document.getElementById('guide-apps-script-code');
  const sheetsConnectForm = document.getElementById('sheets-connect-form');
  const guideSheetUrlInput = document.getElementById('guide-sheet-url-input');
  const btnGuideConnect = document.getElementById('btn-guide-connect');

  // Mastery & Badges
  const masteryCounts = document.getElementById('mastery-counts');
  const masteryPercent = document.getElementById('mastery-percent');
  const masteryProgressbar = document.getElementById('mastery-progressbar');
  const masteryFillMastered = document.getElementById('mastery-fill-mastered');
  const masteryFillLearning = document.getElementById('mastery-fill-learning');
  const badgesSummary = document.getElementById('badges-summary');
  const badgesRankStatus = document.getElementById('badges-rank-status');
  const badgesGrid = document.getElementById('badges-grid');

  // Insights
  const btnToggleInsights = document.getElementById('btn-toggle-insights');
  const insightsPanel = document.getElementById('insights-panel');
  const btnInsightsMastered = document.getElementById('btn-insights-mastered');
  const btnInsightsAll = document.getElementById('btn-insights-all');
  const insightsKpis = document.getElementById('insights-kpis');
  const insightCatTitle = document.getElementById('insight-cat-title');
  const insightCatBars = document.getElementById('insight-cat-bars');
  const insightMasteryBars = document.getElementById('insight-mastery-bars');

  // Study Mode & Quiz Mode
  const btnStudyMode = document.getElementById('btn-study-mode');
  const dueTodayPill = document.getElementById('due-today-pill');
  const studyPanel = document.getElementById('study-panel');
  const libraryListView = document.getElementById('library-list-view');
  const studyHeading = document.getElementById('study-heading');
  const studyDeckSelect = document.getElementById('study-deck-select');
  const btnStudyShuffle = document.getElementById('btn-study-shuffle');
  const btnStudyExit = document.getElementById('btn-study-exit');
  const studyStage = document.getElementById('study-stage');

  const btnQuizMode = document.getElementById('btn-quiz-mode');
  const quizPanel = document.getElementById('quiz-panel');
  const btnQuizSetup = document.getElementById('btn-quiz-setup');
  const btnQuizExit = document.getElementById('btn-quiz-exit');
  const quizStage = document.getElementById('quiz-stage');

  // Daily Goal
  const dailyGoalWrap = document.getElementById('daily-goal-wrap');
  const btnDailyGoal = document.getElementById('btn-daily-goal');
  const dailyStreakText = document.getElementById('daily-streak-text');
  const dailyProgressText = document.getElementById('daily-progress-text');
  const dailyGoalPopover = document.getElementById('daily-goal-popover');
  const dailyPopSub = document.getElementById('daily-pop-sub');
  const dailyPopStreak = document.getElementById('daily-pop-streak');
  const dailyPopFill = document.getElementById('daily-pop-fill');
  const dailyGoalForm = document.getElementById('daily-goal-form');
  const dailyGoalInput = document.getElementById('daily-goal-input');

  // Add panel
  const addPanel = document.getElementById('add-panel');
  const btnToggleAdd = document.getElementById('btn-toggle-add');
  const btnCloseAdd = document.getElementById('btn-close-add');
  const dashAddForm = document.getElementById('dashboard-add-form');
  const dashEntryInput = document.getElementById('dash-entry-input');
  const dashCategorySelect = document.getElementById('dash-category-select');
  const btnDashSave = document.getElementById('btn-dash-save');
  const dashAddStatus = document.getElementById('dash-add-status');
  const dashAddSummary = document.getElementById('dash-add-summary');
  const dashAddDetails = document.getElementById('dash-add-details');

  // Backup panel
  const backupPanel = document.getElementById('backup-panel');
  const btnToggleBackup = document.getElementById('btn-toggle-backup');
  const btnCloseBackup = document.getElementById('btn-close-backup');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnCopyJson = document.getElementById('btn-copy-json');
  const btnImportJson = document.getElementById('btn-import-json');
  const btnTogglePasteJson = document.getElementById('btn-toggle-paste-json');
  const pasteJsonBox = document.getElementById('paste-json-box');
  const pasteJsonInput = document.getElementById('paste-json-input');
  const btnPasteJsonCancel = document.getElementById('btn-paste-json-cancel');
  const btnPasteJsonMerge = document.getElementById('btn-paste-json-merge');
  const importFileInput = document.getElementById('import-file-input');
  const btnDownloadCsv = document.getElementById('btn-download-csv');
  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportPdf = document.getElementById('btn-export-pdf');
  const btnExportAnki = document.getElementById('btn-export-anki');
  const btnSheetPush = document.getElementById('btn-sheet-push');
  const btnSheetPull = document.getElementById('btn-sheet-pull');
  const sheetSyncNote = document.getElementById('sheet-sync-note');
  const btnClearLibrary = document.getElementById('btn-clear-library');

  // PDF dialog
  const pdfDialog = document.getElementById('pdf-dialog');
  const pdfForm = document.getElementById('pdf-form');
  const pdfCategorySelect = document.getElementById('pdf-category-select');
  const pdfSortSelect = document.getElementById('pdf-sort-select');
  const pdfPreviewNote = document.getElementById('pdf-preview-note');
  const btnPdfClose = document.getElementById('btn-pdf-close');
  const btnPdfCancel = document.getElementById('btn-pdf-cancel');
  const btnPdfConfirm = document.getElementById('btn-pdf-confirm');

  // Edit dialog
  const editDialog = document.getElementById('edit-dialog');
  const editForm = document.getElementById('edit-form');
  const editId = document.getElementById('edit-id');
  const editExpression = document.getElementById('edit-expression');
  const editCategory = document.getElementById('edit-category');
  const editMeaning = document.getElementById('edit-meaning');
  const editExample = document.getElementById('edit-example');
  const editError = document.getElementById('edit-error');
  const btnEditClose = document.getElementById('btn-edit-close');
  const btnEditCancel = document.getElementById('btn-edit-cancel');

  // Confirm dialog
  const confirmDialog = document.getElementById('confirm-dialog');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
  const btnConfirmProceed = document.getElementById('btn-confirm-proceed');

  if (guideAppsScriptCode && CUETShared.APPS_SCRIPT_TEMPLATE) {
    guideAppsScriptCode.textContent = CUETShared.APPS_SCRIPT_TEMPLATE;
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

  // ==================== Theme (Night Study Dark Mode) ====================
  function applyTheme(mode) {
    themeMode = mode === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', themeMode === 'dark');
    if (themeIcon) themeIcon.textContent = themeMode === 'dark' ? '☀️' : '🌙';
    if (themeLabel) themeLabel.textContent = themeMode === 'dark' ? 'Light' : 'Dark';
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', async () => {
      const next = themeMode === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        await sendMessage({ type: 'SAVE_THEME_MODE', payload: { themeMode: next } });
      } catch {
        // Keep local theme applied
      }
    });
  }

  // ==================== Toast & 5s Undo ====================
  function hideToast() {
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    undoBuffer = null;
    toastBar.hidden = true;
    btnToastUndo.hidden = true;
    toastProgressWrap.hidden = true;
    toastProgressBar.classList.remove('is-running');
  }

  function showToast(text, tone, options) {
    const opts = options || {};
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    toastBar.hidden = false;
    toastBar.className = 'toast-bar';
    if (tone === 'ok') toastBar.classList.add('ok');
    if (tone === 'error') toastBar.classList.add('error');
    if (tone === 'undo') toastBar.classList.add('undo');

    toastText.textContent = text;

    if (Array.isArray(opts.undoEntries) && opts.undoEntries.length > 0) {
      undoBuffer = opts.undoEntries;
      btnToastUndo.hidden = false;
      toastProgressWrap.hidden = false;
      toastProgressBar.classList.remove('is-running');
      void toastProgressBar.offsetWidth; // trigger reflow for fresh 5s animation
      toastProgressBar.classList.add('is-running');
      toastTimer = setTimeout(() => {
        hideToast();
      }, 5000);
    } else {
      undoBuffer = null;
      btnToastUndo.hidden = true;
      toastProgressWrap.hidden = true;
      toastProgressBar.classList.remove('is-running');
      toastTimer = setTimeout(() => {
        hideToast();
      }, opts.duration || 4500);
    }
  }

  btnToastDismiss.addEventListener('click', hideToast);

  btnToastUndo.addEventListener('click', async () => {
    if (!undoBuffer || undoBuffer.length === 0) return;
    const toRestore = [...undoBuffer];
    hideToast();
    try {
      const res = await sendMessage({
        type: 'RESTORE_ENTRIES',
        payload: { entries: toRestore },
      });
      if (res && res.ok) {
        await loadState();
        showToast(
          `Restored ${res.restoredCount || toRestore.length} ${
            (res.restoredCount || toRestore.length) === 1 ? 'entry' : 'entries'
          }.`,
          'ok'
        );
      } else {
        showToast((res && res.error) || 'Could not undo delete.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==================== Speech Pronunciation ====================
  function isSpeechSupported() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  }

  function stopSpeech() {
    if (isSpeechSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    speakingKey = null;
    updateSpeakingButtonStates();
  }

  function updateSpeakingButtonStates() {
    document.querySelectorAll('[data-speak-key]').forEach((btn) => {
      const isCurrent = speakingKey && btn.getAttribute('data-speak-key') === speakingKey;
      btn.classList.toggle('is-speaking', Boolean(isCurrent));
      btn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
      const labelEl = btn.querySelector('.speak-label');
      if (labelEl) {
        labelEl.textContent = isCurrent ? 'Stop' : 'Listen';
      }
    });
  }

  function speakExpression(text, key) {
    if (!isSpeechSupported()) {
      showToast('Audio pronunciation is not supported in this browser.', 'error');
      return;
    }
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    if (speakingKey === key) {
      stopSpeech();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.lang = 'en-US';
      utterance.rate = 0.94;
      speakingKey = key;
      updateSpeakingButtonStates();
      utterance.onend = () => {
        if (speakingKey === key) {
          speakingKey = null;
          updateSpeakingButtonStates();
        }
      };
      utterance.onerror = () => {
        if (speakingKey === key) {
          speakingKey = null;
          updateSpeakingButtonStates();
        }
      };
      window.speechSynthesis.speak(utterance);
    } catch {
      speakingKey = null;
      updateSpeakingButtonStates();
    }
  }

  function createSpeakChip(expression, key) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'row-action-chip' + (speakingKey === key ? ' is-speaking' : '');
    btn.setAttribute('data-speak-key', key);
    btn.setAttribute('aria-pressed', speakingKey === key ? 'true' : 'false');
    btn.title = `Listen to pronunciation of "${expression}"`;
    btn.innerHTML = `<span aria-hidden="true">🔊</span><span class="speak-label">${speakingKey === key ? 'Stop' : 'Listen'}</span>`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakExpression(expression, key);
    });
    return btn;
  }

  // ==================== File Downloads (10s blob revoke safety) ====================
  function triggerFileDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  // ==================== Exam Countdown ====================
  function renderExamCountdown() {
    const stats = CUETShared.computeExamCountdown(examConfig, allEntries, new Date());
    if (!stats) {
      examDaysBadge.hidden = true;
      examSummary.textContent =
        'Set your IPMAT or CUET exam date to automatically calculate how many words you need to master per day.';
      btnExamToggle.textContent = 'Set Exam Date';
      btnExamClear.hidden = true;
      return;
    }

    examDaysBadge.hidden = false;
    if (stats.status === 'today') {
      examDaysBadge.textContent = `${stats.examName} · Today`;
    } else if (stats.status === 'past') {
      examDaysBadge.textContent = `${stats.examName} · Passed`;
    } else {
      examDaysBadge.textContent = `${stats.daysRemaining}d to ${stats.examName}`;
    }

    examSummary.textContent = stats.summaryText;
    btnExamToggle.textContent = 'Edit Date';
    btnExamClear.hidden = false;
  }

  btnExamToggle.addEventListener('click', () => {
    const isOpening = examForm.hidden;
    examForm.hidden = !isOpening;
    if (isOpening) {
      examNameInput.value = (examConfig && examConfig.examName) || 'CUET';
      examDateInput.value = (examConfig && examConfig.examDate) || '';
      examNameInput.focus();
    }
  });

  btnExamCancel.addEventListener('click', () => {
    examForm.hidden = true;
  });

  btnExamClear.addEventListener('click', async () => {
    try {
      const res = await sendMessage({ type: 'SAVE_EXAM_CONFIG', payload: { examConfig: null } });
      if (res && res.ok) {
        examConfig = null;
        examForm.hidden = true;
        renderExamCountdown();
        showToast('Exam countdown cleared.', 'neutral');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  examForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const examName = examNameInput.value.trim() || 'CUET';
    const examDate = examDateInput.value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      showToast('Please pick a valid exam date.', 'error');
      examDateInput.focus();
      return;
    }
    try {
      const res = await sendMessage({
        type: 'SAVE_EXAM_CONFIG',
        payload: { examConfig: { examName, examDate } },
      });
      if (res && res.ok) {
        examConfig = res.examConfig;
        examForm.hidden = true;
        renderExamCountdown();
        showToast(`Exam target saved for ${examName}.`, 'ok');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==================== Google Sheets Auto-Save Bar & Inline Setup Guide ====================
  function showSheetsInlineStatus(text, tone) {
    sheetsInlineStatus.hidden = false;
    sheetsInlineStatus.className = 'inline-status';
    if (tone === 'ok') sheetsInlineStatus.classList.add('ok');
    if (tone === 'error') sheetsInlineStatus.classList.add('error');
    sheetsInlineStatus.textContent = text;
  }

  function updateSheetSyncControls() {
    const connected = Boolean(hasSheetWebhook && sheetWebhookUrl);
    sheetsConnectedBadge.hidden = !connected;
    btnBarSheetPush.hidden = !connected || allEntries.length === 0;
    btnBarSheetPull.hidden = !connected;
    btnBarSheetDisconnect.hidden = !connected;
    btnToggleSheetsGuide.textContent = connected ? 'Template & Deployment' : 'Sheet Template & Setup';
    sheetsBarDesc.textContent = connected
      ? "Connected via your Apps Script Web App URL. Every newly analysed entry appends automatically into your Google Sheet's 3 tabs."
      : 'Download starter 3-tab CSV templates & follow the 60-second Apps Script guide to auto-save, Push, and Pull with Google Sheets.';

    if (guideSheetUrlInput && document.activeElement !== guideSheetUrlInput) {
      guideSheetUrlInput.value = sheetWebhookUrl || '';
    }

    if (btnSheetPush) {
      btnSheetPush.disabled = !connected || isSheetSyncBusy || allEntries.length === 0;
      btnSheetPush.textContent = isSheetSyncBusy ? 'Syncing…' : 'Push to Sheet';
    }
    if (btnSheetPull) {
      btnSheetPull.disabled = !connected || isSheetSyncBusy;
      btnSheetPull.textContent = isSheetSyncBusy ? 'Syncing…' : 'Pull from Sheet';
    }
    if (btnBarSheetPush) {
      btnBarSheetPush.disabled = isSheetSyncBusy || allEntries.length === 0;
      btnBarSheetPush.textContent = isSheetSyncBusy ? 'Syncing…' : 'Push to Sheet';
    }
    if (btnBarSheetPull) {
      btnBarSheetPull.disabled = isSheetSyncBusy;
      btnBarSheetPull.textContent = isSheetSyncBusy ? 'Syncing…' : 'Pull from Sheet';
    }
    if (sheetSyncNote) {
      sheetSyncNote.hidden = connected;
      if (!connected) {
        sheetSyncNote.textContent =
          'Connect a Google Sheet in the Google Sheets Auto-Save card below (or Settings) to enable Push to Sheet & Pull from Sheet.';
      }
    }
  }

  btnToggleSheetsGuide.addEventListener('click', () => {
    const isOpening = sheetsGuidePanel.hidden;
    sheetsGuidePanel.hidden = !isOpening;
    btnToggleSheetsGuide.setAttribute('aria-expanded', String(isOpening));
  });

  function downloadStarterTemplateCsv(category) {
    const include = tplIncludeEntries ? Boolean(tplIncludeEntries.checked) : false;
    const csv = CUETShared.buildTemplateCsv(category, allEntries, include);
    const slug = category === 'idioms' ? 'idioms' : category === 'phrasalVerbs' ? 'phrasal-verbs' : 'words';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    triggerFileDownload(blob, `ipmat-cuet-template-${slug}.csv`);
    showToast(`Downloaded ${CUETShared.SHEET_TABS[category]} starter CSV template.`, 'ok');
  }

  btnTplWords.addEventListener('click', () => downloadStarterTemplateCsv('vocabulary'));
  btnTplIdioms.addEventListener('click', () => downloadStarterTemplateCsv('idioms'));
  btnTplPhrasal.addEventListener('click', () => downloadStarterTemplateCsv('phrasalVerbs'));

  btnGuideCopyScript.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CUETShared.APPS_SCRIPT_TEMPLATE);
      btnGuideCopyScript.textContent = 'Copied!';
      setTimeout(() => {
        btnGuideCopyScript.textContent = 'Copy Apps Script';
      }, 1800);
    } catch {
      showSheetsInlineStatus('Could not copy automatically — select and copy the script box below.', 'neutral');
    }
  });

  sheetsConnectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawUrl = guideSheetUrlInput.value.trim();
    const validation = CUETShared.validateAppsScriptUrlInput(rawUrl);
    if (!validation.ok) {
      showSheetsInlineStatus(validation.error, 'error');
      guideSheetUrlInput.focus();
      return;
    }

    btnGuideConnect.disabled = true;
    btnGuideConnect.textContent = 'Testing…';
    showSheetsInlineStatus('Testing connection with your Google Apps Script Web App…', 'neutral');

    try {
      const testRes = await sendMessage({
        type: 'TEST_SHEET_CONNECTION',
        payload: { sheetWebhookUrl: validation.url },
      });
      if (!testRes || !testRes.ok) {
        showSheetsInlineStatus((testRes && testRes.error) || 'Could not connect to Google Sheet.', 'error');
        return;
      }

      const saveRes = await sendMessage({
        type: 'SAVE_SHEET_WEBHOOK',
        payload: { sheetWebhookUrl: validation.url },
      });
      if (saveRes && saveRes.ok) {
        sheetWebhookUrl = saveRes.sheetWebhookUrl;
        hasSheetWebhook = Boolean(sheetWebhookUrl);
        updateSheetSyncControls();
        showSheetsInlineStatus(
          'Connected! New entries will auto-save into your Words, Idioms, and Phrasal Verbs tabs.',
          'ok'
        );
        showToast('Google Sheets Auto-Save connected.', 'ok');
      }
    } catch (err) {
      showSheetsInlineStatus('Connection test failed: ' + err.message, 'error');
    } finally {
      btnGuideConnect.disabled = false;
      btnGuideConnect.textContent = 'Test & Connect';
    }
  });

  btnBarSheetDisconnect.addEventListener('click', async () => {
    try {
      const res = await sendMessage({ type: 'SAVE_SHEET_WEBHOOK', payload: { sheetWebhookUrl: '' } });
      if (res && res.ok) {
        sheetWebhookUrl = '';
        hasSheetWebhook = false;
        updateSheetSyncControls();
        showSheetsInlineStatus('Disconnected Google Sheet Auto-Save.', 'neutral');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  async function runPushToSheet() {
    if (!hasSheetWebhook || isSheetSyncBusy) return;
    isSheetSyncBusy = true;
    updateSheetSyncControls();
    showSheetsInlineStatus('Pushing local entries to Google Sheet…', 'neutral');
    try {
      const res = await sendMessage({ type: 'PUSH_TO_SHEET' });
      if (res && res.ok) {
        const added = res.addedCount || 0;
        const skipped = res.skippedCount || 0;
        const msg = `Pushed to Google Sheet: ${added} new ${added === 1 ? 'row' : 'rows'} added${
          skipped > 0 ? `, ${skipped} already synced` : ''
        }.`;
        showSheetsInlineStatus(msg, 'ok');
        showToast(msg, 'ok');
      } else {
        const errText = (res && res.error) || 'Could not push to Google Sheet.';
        showSheetsInlineStatus(errText, 'error');
        showToast(errText, 'error');
      }
    } catch (err) {
      showSheetsInlineStatus(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      isSheetSyncBusy = false;
      updateSheetSyncControls();
    }
  }

  async function runPullFromSheet() {
    if (!hasSheetWebhook || isSheetSyncBusy) return;
    isSheetSyncBusy = true;
    updateSheetSyncControls();
    showSheetsInlineStatus('Pulling rows from your Google Sheet…', 'neutral');
    try {
      const res = await sendMessage({ type: 'PULL_FROM_SHEET' });
      if (res && res.ok) {
        await loadState();
        const added = res.addedCount || 0;
        const updated = res.updatedCount || 0;
        const msg =
          added === 0 && updated === 0
            ? 'Your Vocab Vault is already up to date with Google Sheets.'
            : `Pulled from Google Sheet: ${added} added, ${updated} updated.`;
        showSheetsInlineStatus(msg, 'ok');
        showToast(msg, 'ok');
      } else {
        const errText = (res && res.error) || 'Could not pull from Google Sheet.';
        showSheetsInlineStatus(errText, 'error');
        showToast(errText, 'error');
      }
    } catch (err) {
      showSheetsInlineStatus(err.message, 'error');
      showToast(err.message, 'error');
    } finally {
      isSheetSyncBusy = false;
      updateSheetSyncControls();
    }
  }

  btnSheetPush.addEventListener('click', runPushToSheet);
  btnSheetPull.addEventListener('click', runPullFromSheet);
  btnBarSheetPush.addEventListener('click', runPushToSheet);
  btnBarSheetPull.addEventListener('click', runPullFromSheet);

  // ==================== Daily Goal ====================
  function renderDailyGoal() {
    const stats = CUETShared.computeDailyGoalStats(allEntries, dailyGoalTarget);
    dailyStreakText.textContent = `🔥 ${stats.streakDays}d`;
    dailyProgressText.textContent = stats.goalReached
      ? `${stats.savedToday}/${stats.target} ✓`
      : `${stats.savedToday}/${stats.target} today`;
    btnDailyGoal.classList.toggle('is-reached', stats.goalReached);

    dailyPopSub.textContent = stats.goalReached
      ? `Daily goal reached! (${stats.savedToday}/${stats.target})`
      : `${stats.savedToday} of ${stats.target} saved today`;
    dailyPopStreak.textContent = `🔥 ${stats.streakDays} ${stats.streakDays === 1 ? 'day' : 'days'}`;
    dailyPopFill.style.width = `${stats.progressPercent}%`;

    if (document.activeElement !== dailyGoalInput) {
      dailyGoalInput.value = String(stats.target);
    }

    if (prevDailyGoalReached === false && stats.goalReached) {
      btnDailyGoal.classList.remove('is-celebrating');
      void btnDailyGoal.offsetWidth;
      btnDailyGoal.classList.add('is-celebrating');
      if (dailyCelebrateTimer) clearTimeout(dailyCelebrateTimer);
      dailyCelebrateTimer = setTimeout(() => {
        btnDailyGoal.classList.remove('is-celebrating');
      }, 2200);
      showToast(`Daily goal reached! ${stats.savedToday}/${stats.target} saved today.`, 'ok');
    }
    prevDailyGoalReached = stats.goalReached;
  }

  btnDailyGoal.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpening = dailyGoalPopover.hidden;
    dailyGoalPopover.hidden = !isOpening;
    btnDailyGoal.setAttribute('aria-expanded', String(isOpening));
  });

  document.addEventListener('click', (e) => {
    if (!dailyGoalPopover.hidden && !dailyGoalWrap.contains(e.target)) {
      dailyGoalPopover.hidden = true;
      btnDailyGoal.setAttribute('aria-expanded', 'false');
    }
  });

  dailyGoalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = CUETShared.clampDailyGoal(dailyGoalInput.value);
    try {
      const res = await sendMessage({ type: 'SAVE_DAILY_GOAL', payload: { target } });
      if (res && res.ok) {
        dailyGoalTarget = res.dailyGoalTarget;
        renderDailyGoal();
        dailyGoalPopover.hidden = true;
        btnDailyGoal.setAttribute('aria-expanded', 'false');
        showToast(`Daily study goal updated to ${dailyGoalTarget} words/day.`, 'ok');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==================== Mastery Progress & Badges ====================
  function renderMasteryProgress() {
    const stats = CUETShared.getMasteryStats(allEntries);
    masteryCounts.textContent = `${stats.masteredCount} mastered · ${stats.learningCount} learning · ${stats.newCount} new`;
    masteryPercent.textContent = `${stats.percentMastered}% Mastered`;
    masteryProgressbar.setAttribute('aria-valuenow', String(stats.percentMastered));
    masteryFillMastered.style.width = `${stats.percentMastered}%`;
    masteryFillLearning.style.width = `${stats.percentLearning}%`;

    const dueQueue = CUETShared.getDailyReviewQueue(allEntries, new Date());
    if (dueQueue.totalDue > 0) {
      dueTodayPill.hidden = false;
      dueTodayPill.textContent = `${dueQueue.totalDue} Due`;
    } else {
      dueTodayPill.hidden = true;
    }

    const needsPracticeTotal = allEntries.filter((e) => CUETShared.isNeedsPractice(e)).length;
    quickDueCount.textContent = String(dueQueue.totalDue);
    quickPracticeCount.textContent = String(needsPracticeTotal);
  }

  function getBadgeSvg(badgeId) {
    const common = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    switch (badgeId) {
      case 'novice':
        return `<svg ${common}><circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5"/></svg>`;
      case 'word_collector':
        return `<svg ${common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 0 2.5-2.5z"/></svg>`;
      case 'vocabulary_scholar':
        return `<svg ${common}><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/></svg>`;
      case 'lexicon_tactician':
        return `<svg ${common}><circle cx="12" cy="9" r="5"/><path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5"/></svg>`;
      default:
        return `<svg ${common}><path d="M3 18h18l-2-10-4.5 4L12 6l-2.5 6L5 8l-2 10z"/></svg>`;
    }
  }

  function renderMasteryBadges() {
    if (!badgesGrid) return;
    const progress = CUETShared.getMasteryBadgeProgress(allEntries);
    badgesSummary.textContent = `${progress.unlockedCount} of ${progress.totalBadges} unlocked · ${progress.masteredCount} ${progress.masteredCount === 1 ? 'word' : 'words'} mastered`;
    badgesRankStatus.textContent = progress.nextBadge
      ? `Master ${progress.nextBadge.remaining} more ${progress.nextBadge.remaining === 1 ? 'word' : 'words'} to unlock ${progress.nextBadge.title}`
      : 'All 5 Mastery Badges unlocked';

    badgesGrid.innerHTML = '';
    for (const badge of progress.badges) {
      const tile = document.createElement('div');
      tile.className = 'badge-tile' + (badge.unlocked ? ' is-unlocked' : '');
      tile.setAttribute('role', 'listitem');
      tile.title = badge.description;

      const top = document.createElement('div');
      top.className = 'badge-top';

      const emblem = document.createElement('div');
      emblem.className = 'badge-emblem';
      emblem.innerHTML = getBadgeSvg(badge.id);

      const info = document.createElement('div');
      info.className = 'badge-info';
      const title = document.createElement('h3');
      title.className = 'badge-title';
      title.textContent = badge.title;
      const req = document.createElement('p');
      req.className = 'badge-req';
      req.textContent = `${badge.threshold} ${badge.threshold === 1 ? 'word' : 'words'} mastered`;
      info.appendChild(title);
      info.appendChild(req);
      top.appendChild(emblem);
      top.appendChild(info);

      const foot = document.createElement('div');
      foot.className = 'badge-foot';
      const meta = document.createElement('div');
      meta.className = 'badge-meta';
      const stateSpan = document.createElement('span');
      stateSpan.className = 'badge-state';
      stateSpan.textContent = badge.unlocked ? 'Unlocked' : progress.nextBadge && progress.nextBadge.id === badge.id ? 'In Progress' : 'Locked';
      const countSpan = document.createElement('span');
      countSpan.textContent = `${Math.min(progress.masteredCount, badge.threshold)}/${badge.threshold}`;
      meta.appendChild(stateSpan);
      meta.appendChild(countSpan);

      const track = document.createElement('div');
      track.className = 'badge-track';
      const fill = document.createElement('div');
      fill.className = 'badge-fill';
      fill.style.width = `${badge.progressPercent}%`;
      track.appendChild(fill);

      foot.appendChild(meta);
      foot.appendChild(track);
      tile.appendChild(top);
      tile.appendChild(foot);
      badgesGrid.appendChild(tile);
    }
  }

  // ==================== Insights ====================
  function renderInsights() {
    if (!insightsPanel) return;
    insightsPanel.hidden = !showInsights;
    if (btnToggleInsights) {
      btnToggleInsights.textContent = showInsights ? 'Hide Insights' : 'Show Insights';
      btnToggleInsights.setAttribute('aria-expanded', String(showInsights));
    }
    if (!showInsights) return;

    const stats = CUETShared.getMasteryStats(allEntries);
    const catData = CUETShared.getCategoryInsightData(allEntries);
    const distData = CUETShared.getMasteryDistributionData(allEntries);

    insightsKpis.innerHTML = '';
    const kpis = [
      { label: 'Total Saved', value: stats.total },
      { label: 'Mastered', value: stats.masteredCount },
      { label: 'Learning', value: stats.learningCount },
      { label: 'New', value: stats.newCount },
    ];
    for (const k of kpis) {
      const box = document.createElement('div');
      box.className = 'insight-kpi';
      const lbl = document.createElement('div');
      lbl.className = 'insight-kpi-label';
      lbl.textContent = k.label;
      const val = document.createElement('div');
      val.className = 'insight-kpi-val';
      val.textContent = String(k.value);
      box.appendChild(lbl);
      box.appendChild(val);
      insightsKpis.appendChild(box);
    }

    insightCatTitle.textContent =
      insightsMetric === 'mastered' ? 'Learned (Mastered) per Category' : 'Total Saved per Category';

    const maxTotal = Math.max(1, ...catData.map((d) => d.total));
    insightCatBars.innerHTML = '';
    for (const d of catData) {
      const row = document.createElement('div');
      row.className = 'insight-bar-row';
      const meta = document.createElement('div');
      meta.className = 'insight-bar-meta';
      const name = document.createElement('span');
      name.textContent = d.label;
      const num = document.createElement('strong');
      num.textContent = insightsMetric === 'mastered' ? `${d.mastered} / ${d.total}` : String(d.total);
      meta.appendChild(name);
      meta.appendChild(num);

      const track = document.createElement('div');
      track.className = 'insight-bar-track';
      const fill = document.createElement('div');
      fill.className = 'insight-bar-fill';
      const pct = insightsMetric === 'mastered' ? d.percentMastered : Math.round((d.total / maxTotal) * 100);
      fill.style.width = `${pct}%`;
      track.appendChild(fill);

      row.appendChild(meta);
      row.appendChild(track);
      insightCatBars.appendChild(row);
    }

    insightMasteryBars.innerHTML = '';
    for (const d of distData) {
      const row = document.createElement('div');
      row.className = 'insight-bar-row';
      const meta = document.createElement('div');
      meta.className = 'insight-bar-meta';
      const name = document.createElement('span');
      name.textContent = d.label;
      const num = document.createElement('strong');
      num.textContent = `${d.count} (${d.percent}%)`;
      meta.appendChild(name);
      meta.appendChild(num);

      const track = document.createElement('div');
      track.className = 'insight-bar-track';
      const fill = document.createElement('div');
      fill.className = `insight-bar-fill is-${d.level}`;
      fill.style.width = `${d.percent}%`;
      track.appendChild(fill);

      row.appendChild(meta);
      row.appendChild(track);
      insightMasteryBars.appendChild(row);
    }
  }

  btnToggleInsights.addEventListener('click', () => {
    showInsights = !showInsights;
    renderInsights();
  });

  btnInsightsMastered.addEventListener('click', () => {
    insightsMetric = 'mastered';
    btnInsightsMastered.className = 'mastery-opt is-active is-mastered';
    btnInsightsMastered.setAttribute('aria-pressed', 'true');
    btnInsightsAll.className = 'mastery-opt';
    btnInsightsAll.setAttribute('aria-pressed', 'false');
    renderInsights();
  });

  btnInsightsAll.addEventListener('click', () => {
    insightsMetric = 'all';
    btnInsightsAll.className = 'mastery-opt is-active is-mastered';
    btnInsightsAll.setAttribute('aria-pressed', 'true');
    btnInsightsMastered.className = 'mastery-opt';
    btnInsightsMastered.setAttribute('aria-pressed', 'false');
    renderInsights();
  });

  // ==================== Source Dropdown & Filtering ====================
  function renderSourceDropdown() {
    const sources = CUETShared.getUniqueSources(allEntries);
    const currentVal = sourceFilter;
    sourceSelect.innerHTML = '<option value="all">All sources</option>';
    let stillExists = currentVal === 'all';
    for (const s of sources) {
      const opt = document.createElement('option');
      opt.value = s.title;
      opt.textContent = `${s.title} (${s.count})`;
      sourceSelect.appendChild(opt);
      if (s.title.toLowerCase() === currentVal.toLowerCase()) {
        stillExists = true;
      }
    }
    if (!stillExists) {
      sourceFilter = 'all';
    }
    sourceSelect.value = sourceFilter;
  }

  function updateQuickFilterUI() {
    btnQuickDue.setAttribute('aria-pressed', String(statusFilter === 'dueToday'));
    btnQuickPractice.setAttribute('aria-pressed', String(statusFilter === 'needsPractice'));
    filterSelect.value = statusFilter;
    sourceSelect.value = sourceFilter;
    sortSelect.value = sortOrder;
    const hasActiveFilter =
      Boolean(searchQuery.trim()) ||
      statusFilter !== 'all' ||
      sourceFilter !== 'all' ||
      sortOrder !== 'recent';
    btnResetFilters.hidden = !hasActiveFilter;
  }

  function getFilteredEntries() {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    let list =
      activeTab === 'all' || q
        ? [...allEntries]
        : allEntries.filter((e) => e.category === activeTab);

    if (statusFilter === 'favourites') {
      list = list.filter((e) => e.favourite);
    } else if (statusFilter === 'dueToday') {
      list = list.filter((e) => CUETShared.getEntryReviewSchedule(e, now).isDueToday);
    } else if (statusFilter === 'needsPractice') {
      list = list.filter((e) => CUETShared.isNeedsPractice(e));
    } else if (statusFilter !== 'all') {
      list = list.filter((e) => CUETShared.getMasteryLevel(e) === statusFilter);
    }

    if (sourceFilter && sourceFilter !== 'all') {
      const target = sourceFilter.trim().toLowerCase();
      list = list.filter((e) => String(e.sourceTitle || '').trim().toLowerCase() === target);
    }

    if (q) {
      list = list.filter(
        (e) =>
          (e.expression || '').toLowerCase().includes(q) ||
          (e.meaning || '').toLowerCase().includes(q) ||
          (e.example || '').toLowerCase().includes(q) ||
          (e.contextSentence || '').toLowerCase().includes(q) ||
          (e.sourceTitle || '').toLowerCase().includes(q)
      );
    }

    if (sortOrder === 'az') {
      list.sort((a, b) => a.expression.localeCompare(b.expression, undefined, { sensitivity: 'base' }));
    } else if (sortOrder === 'za') {
      list.sort((a, b) => b.expression.localeCompare(a.expression, undefined, { sensitivity: 'base' }));
    } else if (sortOrder === 'mostMissed') {
      list.sort((a, b) => {
        const diff = CUETShared.getMissCount(b) - CUETShared.getMissCount(a);
        if (diff !== 0) return diff;
        return Date.parse(b.dateAdded || '') - Date.parse(a.dateAdded || '');
      });
    } else {
      list.sort((a, b) => Date.parse(b.dateAdded || '') - Date.parse(a.dateAdded || ''));
    }

    return list;
  }

  // ==================== Bulk Multi-Select ====================
  function pruneSelectedIds() {
    const valid = new Set(allEntries.map((e) => e.id));
    for (const id of Array.from(selectedIds)) {
      if (!valid.has(id)) selectedIds.delete(id);
    }
  }

  function renderBulkBar() {
    pruneSelectedIds();
    const count = selectedIds.size;
    btnSelectMode.setAttribute('aria-pressed', String(isSelectMode));
    btnSelectMode.classList.toggle('is-active-panel', isSelectMode);
    btnSelectMode.textContent = isSelectMode ? `Done Selecting (${count})` : 'Select';

    bulkBar.hidden = !isSelectMode;
    if (!isSelectMode) return;

    bulkCountLabel.textContent = `${count} selected`;
    const hasSelection = count > 0;
    btnBulkClear.disabled = !hasSelection;
    btnBulkMastered.disabled = !hasSelection;
    btnBulkLearning.disabled = !hasSelection;
    bulkMoveSelect.disabled = !hasSelection;
    btnBulkPdf.disabled = !hasSelection;
    btnBulkAnki.disabled = !hasSelection;
    btnBulkDelete.disabled = !hasSelection;
  }

  btnSelectMode.addEventListener('click', () => {
    isSelectMode = !isSelectMode;
    if (!isSelectMode) selectedIds.clear();
    renderBulkBar();
    renderEntries();
  });

  btnBulkSelectAll.addEventListener('click', () => {
    const visible = getFilteredEntries();
    for (const e of visible) selectedIds.add(e.id);
    renderBulkBar();
    renderEntries();
  });

  btnBulkClear.addEventListener('click', () => {
    selectedIds.clear();
    renderBulkBar();
    renderEntries();
  });

  async function runBulkPatch(patch, label) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      const res = await sendMessage({
        type: 'BULK_UPDATE_ENTRIES',
        payload: { ids, patch },
      });
      if (res && res.ok) {
        selectedIds.clear();
        await loadState();
        showToast(`Updated ${res.updatedCount || ids.length} entries (${label}).`, 'ok');
      } else {
        showToast((res && res.error) || 'Bulk update failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  btnBulkMastered.addEventListener('click', () => runBulkPatch({ masteryLevel: 'mastered' }, 'Mastered'));
  btnBulkLearning.addEventListener('click', () => runBulkPatch({ masteryLevel: 'learning' }, 'Learning'));

  bulkMoveSelect.addEventListener('change', async () => {
    const cat = bulkMoveSelect.value;
    bulkMoveSelect.value = '';
    if (!cat) return;
    await runBulkPatch({ category: cat }, `moved to ${CUETShared.CATEGORIES[cat] || cat}`);
  });

  btnBulkPdf.addEventListener('click', () => {
    const chosen = allEntries.filter((e) => selectedIds.has(e.id));
    if (chosen.length === 0) return;
    try {
      const pdf = CUETShared.buildPdfStudySheetBytes(chosen, {
        category: 'all',
        sortOrder: 'az',
        customLabel: `Selected Subset (${chosen.length} ${chosen.length === 1 ? 'entry' : 'entries'})`,
      });
      const blob = new Blob([pdf.bytes], { type: 'application/pdf' });
      triggerFileDownload(blob, pdf.filename);
      showToast(`Exported ${pdf.entryCount} selected entries to PDF.`, 'ok');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  btnBulkAnki.addEventListener('click', () => {
    const chosen = allEntries.filter((e) => selectedIds.has(e.id));
    if (chosen.length === 0) return;
    const tsv = CUETShared.buildAnkiTsv(chosen);
    const blob = new Blob(['\uFEFF' + tsv], { type: 'text/tab-separated-values;charset=utf-8' });
    const stamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(blob, `ipmat-cuet-anki-selected-${stamp}.tsv`);
    showToast(`Exported ${chosen.length} selected entries to Anki (.tsv).`, 'ok');
  });

  btnBulkDelete.addEventListener('click', async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const deletedEntries = allEntries.filter((e) => selectedIds.has(e.id));
    try {
      const res = await sendMessage({ type: 'DELETE_ENTRIES', payload: { ids } });
      if (res && res.ok) {
        selectedIds.clear();
        await loadState();
        showToast(
          `Deleted ${deletedEntries.length} ${deletedEntries.length === 1 ? 'entry' : 'entries'}.`,
          'undo',
          { undoEntries: deletedEntries }
        );
      } else {
        showToast((res && res.error) || 'Could not delete selected entries.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==================== Tabs & Entries List ====================
  function updateCounts() {
    const counts = CUETShared.getCategoryCounts(allEntries);
    if (tabCounts.all) tabCounts.all.textContent = String(counts.total);
    tabCounts.vocabulary.textContent = String(counts.vocabulary);
    tabCounts.idioms.textContent = String(counts.idioms);
    tabCounts.phrasalVerbs.textContent = String(counts.phrasalVerbs);
  }

  function renderEntries() {
    const items = getFilteredEntries();
    entriesList.innerHTML = '';

    const trimmedQuery = searchQuery.trim();
    if (btnClearSearch) {
      btnClearSearch.hidden = !trimmedQuery;
    }

    if (searchMeta) {
      if (trimmedQuery || statusFilter !== 'all' || sourceFilter !== 'all') {
        searchMeta.hidden = false;
        const parts = [`Showing ${items.length} matching ${items.length === 1 ? 'entry' : 'entries'}`];
        if (trimmedQuery) parts.push(`for "${trimmedQuery}"`);
        if (sourceFilter !== 'all') parts.push(`from ${sourceFilter}`);
        searchMeta.textContent = parts.join(' ');
      } else {
        searchMeta.hidden = true;
      }
    }

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const title = document.createElement('p');
      title.className = 'empty-state-title';
      const desc = document.createElement('p');
      desc.className = 'empty-state-desc';

      if (trimmedQuery || statusFilter !== 'all' || sourceFilter !== 'all') {
        title.textContent = 'No matching entries';
        desc.textContent = 'Try adjusting or clearing your search query, mastery level, or source filter.';
      } else {
        const label = activeTab === 'all' ? 'THE VOCAB VAULT' : CUETShared.CATEGORIES[activeTab];
        title.textContent = `No entries in ${label} yet`;
        desc.textContent =
          'Select any expression on a webpage and click "Add to Vocab Vault", or use "Add Entries" above.';
      }
      empty.appendChild(title);
      empty.appendChild(desc);
      entriesList.appendChild(empty);
      return;
    }

    const now = new Date();
    for (const entry of items) {
      const level = CUETShared.getMasteryLevel(entry);
      const schedule = CUETShared.getEntryReviewSchedule(entry, now);
      const misses = CUETShared.getMissCount(entry);
      const isChecked = selectedIds.has(entry.id);

      const row = document.createElement('article');
      row.className =
        'entry-row' +
        (level === 'mastered' ? ' is-learned' : '') +
        (isSelectMode && isChecked ? ' is-selected' : '');

      if (isSelectMode) {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'entry-checkbox';
        cb.checked = isChecked;
        cb.setAttribute('aria-label', `Select ${entry.expression}`);
        cb.addEventListener('change', () => {
          if (cb.checked) selectedIds.add(entry.id);
          else selectedIds.delete(entry.id);
          renderBulkBar();
          row.classList.toggle('is-selected', cb.checked);
        });
        row.appendChild(cb);
      }

      const contentWrap = document.createElement('div');
      contentWrap.className = 'entry-content';

      const top = document.createElement('div');
      top.className = 'entry-top';

      const headingGroup = document.createElement('div');
      headingGroup.className = 'entry-heading-group';

      const heading = document.createElement('h3');
      heading.className = 'entry-expression';
      heading.textContent = entry.expression;
      headingGroup.appendChild(heading);

      if (activeTab === 'all' || trimmedQuery) {
        const catTag = document.createElement('span');
        catTag.className = 'entry-tag';
        catTag.textContent = CUETShared.CATEGORY_SINGULAR[entry.category] || 'Word';
        headingGroup.appendChild(catTag);
      }

      if (schedule.isDueToday) {
        const dueTag = document.createElement('span');
        dueTag.className = 'entry-tag is-due';
        dueTag.textContent = schedule.scheduleLabel;
        headingGroup.appendChild(dueTag);
      }

      if (misses > 0) {
        const missTag = document.createElement('span');
        missTag.className = 'entry-tag is-miss';
        missTag.textContent = `Missed ${misses}×`;
        headingGroup.appendChild(missTag);
      }

      if (entry.sourceTitle && entry.sourceTitle.trim()) {
        const srcBtn = document.createElement('button');
        srcBtn.type = 'button';
        srcBtn.className = 'source-tag-btn';
        srcBtn.textContent = entry.sourceTitle.trim();
        srcBtn.title = `Filter vault by "${entry.sourceTitle.trim()}"`;
        srcBtn.addEventListener('click', () => {
          sourceFilter = entry.sourceTitle.trim();
          updateQuickFilterUI();
          renderEntries();
        });
        headingGroup.appendChild(srcBtn);
      }

      const meta = document.createElement('div');
      meta.className = 'entry-meta';
      const metaParts = [];
      if (level === 'mastered') {
        const s = document.createElement('span');
        s.className = 'meta-learned';
        s.textContent = 'Mastered';
        metaParts.push(s);
      } else if (level === 'learning') {
        const s = document.createElement('span');
        s.className = 'meta-learning';
        s.textContent = 'Learning';
        metaParts.push(s);
      }
      if (entry.favourite) {
        const s = document.createElement('span');
        s.className = 'meta-fav';
        s.textContent = '★ Favourite';
        metaParts.push(s);
      }
      if (!schedule.isDueToday) {
        metaParts.push(document.createTextNode(schedule.scheduleLabel));
      }
      const dateStr = CUETShared.formatDate(entry.dateAdded);
      if (dateStr) metaParts.push(document.createTextNode(dateStr));

      metaParts.forEach((part, idx) => {
        if (idx > 0) meta.appendChild(document.createTextNode(' · '));
        meta.appendChild(part);
      });

      top.appendChild(headingGroup);
      top.appendChild(meta);

      const body = document.createElement('div');
      body.className = 'entry-body';

      const meaningLine = document.createElement('p');
      meaningLine.className = 'entry-line';
      const meaningStrong = document.createElement('strong');
      meaningStrong.textContent = 'Meaning: ';
      meaningLine.appendChild(meaningStrong);
      meaningLine.appendChild(document.createTextNode(entry.meaning));

      const exampleLine = document.createElement('p');
      exampleLine.className = 'entry-line';
      const exampleStrong = document.createElement('strong');
      exampleStrong.textContent = 'Example: ';
      exampleLine.appendChild(exampleStrong);
      exampleLine.appendChild(document.createTextNode(entry.example));

      body.appendChild(meaningLine);
      body.appendChild(exampleLine);

      const actions = document.createElement('div');
      actions.className = 'entry-actions';

      // Mastery toggle
      const masteryToggle = document.createElement('div');
      masteryToggle.className = 'mastery-toggle';
      masteryToggle.setAttribute('role', 'group');
      masteryToggle.setAttribute('aria-label', `Mastery level for ${entry.expression}`);

      for (const lvl of CUETShared.VALID_MASTERY_LEVELS) {
        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.className = 'mastery-opt' + (level === lvl ? ` is-active is-${lvl}` : '');
        optBtn.textContent = CUETShared.MASTERY_LABELS[lvl];
        optBtn.setAttribute('aria-pressed', level === lvl ? 'true' : 'false');
        optBtn.addEventListener('click', () => {
          if (level !== lvl) {
            updateEntryField(entry.id, { masteryLevel: lvl, learned: lvl === 'mastered' });
          }
        });
        masteryToggle.appendChild(optBtn);
      }

      const listenBtn = createSpeakChip(entry.expression, `card-${entry.id}`);

      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'row-action' + (entry.favourite ? ' is-fav' : '');
      favBtn.textContent = entry.favourite ? '★ Favourited' : 'Favourite';
      favBtn.addEventListener('click', () => updateEntryField(entry.id, { favourite: !entry.favourite }));

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'row-action' + (copiedEntryId === entry.id ? ' is-active' : '');
      copyBtn.textContent = copiedEntryId === entry.id ? 'Copied!' : 'Copy';
      copyBtn.addEventListener('click', () => handleCopyEntry(entry));

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'row-action';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => openEditDialog(entry));

      const reanalyseBtn = document.createElement('button');
      reanalyseBtn.type = 'button';
      reanalyseBtn.className = 'row-action';
      const isReanalysing = reanalysingIds.has(entry.id);
      reanalyseBtn.textContent = isReanalysing ? 'Reanalysing…' : 'Reanalyse';
      reanalyseBtn.disabled = isReanalysing;
      reanalyseBtn.addEventListener('click', () => handleReanalyse(entry));

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'row-action is-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => handleImmediateDelete(entry));

      actions.appendChild(masteryToggle);
      actions.appendChild(listenBtn);
      actions.appendChild(favBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(editBtn);
      actions.appendChild(reanalyseBtn);
      actions.appendChild(deleteBtn);

      contentWrap.appendChild(top);
      contentWrap.appendChild(body);
      contentWrap.appendChild(actions);
      row.appendChild(contentWrap);
      entriesList.appendChild(row);
    }
  }

  async function handleCopyEntry(entry) {
    const text = CUETShared.formatEntryCopyText(entry);
    try {
      await navigator.clipboard.writeText(text);
      copiedEntryId = entry.id;
      renderEntries();
      setTimeout(() => {
        if (copiedEntryId === entry.id) {
          copiedEntryId = null;
          renderEntries();
        }
      }, 1500);
    } catch {
      showToast('Could not access clipboard.', 'error');
    }
  }

  async function updateEntryField(id, patch) {
    try {
      const res = await sendMessage({ type: 'UPDATE_ENTRY', payload: { id, patch } });
      if (res && res.ok) {
        await loadState();
      } else {
        showToast((res && res.error) || 'Could not update entry.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleImmediateDelete(entry) {
    try {
      const res = await sendMessage({ type: 'DELETE_ENTRY', payload: { id: entry.id } });
      if (res && res.ok) {
        selectedIds.delete(entry.id);
        await loadState();
        showToast(`Deleted "${entry.expression}".`, 'undo', { undoEntries: [entry] });
      } else {
        showToast((res && res.error) || 'Could not delete entry.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleReanalyse(entry) {
    reanalysingIds.add(entry.id);
    renderEntries();
    try {
      const res = await sendMessage({ type: 'REANALYSE_ENTRY', payload: { id: entry.id } });
      if (res && res.ok) {
        showToast(`Updated meaning and example for "${res.entry.expression}".`, 'ok');
        await loadState();
      } else {
        showToast((res && res.error) || 'Reanalysis failed.', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      reanalysingIds.delete(entry.id);
      renderEntries();
    }
  }

  // ==================== Study Mode (3D Flip + SRS Due Today + Mistake Tracking) ====================
  function getEntryById(id) {
    return allEntries.find((e) => e.id === id) || null;
  }

  function shuffleIds(ids) {
    const arr = [...ids];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function startStudySession(scope, customIds, isMissed) {
    studyScope = scope;
    studyDeckSelect.value = scope;
    studyMissedRound = Boolean(isMissed);
    studyDeckIds = Array.isArray(customIds)
      ? [...customIds]
      : CUETShared.buildStudyDeck(allEntries, scope, new Date()).map((e) => e.id);
    studyIndex = 0;
    studyFlipped = false;
    studyKnownIds = [];
    studyNeedsReviewIds = [];
    studyComplete = false;
    renderStudyMode();
  }

  function openStudyMode() {
    stopSpeech();
    if (isQuizMode) closeQuizMode();
    isStudyMode = true;
    studyPanel.hidden = false;
    libraryListView.hidden = true;
    const dueQueue = CUETShared.getDailyReviewQueue(allEntries, new Date());
    const defaultScope = dueQueue.totalDue > 0 ? 'dailyReview' : 'all';
    startStudySession(defaultScope);
  }

  function closeStudyMode() {
    stopSpeech();
    isStudyMode = false;
    studyPanel.hidden = true;
    libraryListView.hidden = false;
  }

  function flipActiveCard(forceFlipped) {
    const next = typeof forceFlipped === 'boolean' ? forceFlipped : !studyFlipped;
    if (next === studyFlipped) return;
    studyFlipped = next;
    const inner = studyStage.querySelector('.flashcard-3d-inner');
    if (inner) {
      inner.classList.toggle('is-flipped', studyFlipped);
      inner.setAttribute('data-flipped', String(studyFlipped));
      const front = inner.querySelector('.flashcard-face-front');
      const back = inner.querySelector('.flashcard-face-back');
      if (front) front.setAttribute('aria-hidden', String(studyFlipped));
      if (back) back.setAttribute('aria-hidden', String(!studyFlipped));
    }
  }

  async function rateStudyCard(outcome) {
    const currentId = studyDeckIds[studyIndex];
    if (!currentId || !studyFlipped) return;

    if (outcome === 'known') {
      studyKnownIds.push(currentId);
      await updateEntryField(currentId, { masteryLevel: 'mastered', learned: true, countAsReview: true });
    } else {
      studyNeedsReviewIds.push(currentId);
      try {
        await sendMessage({ type: 'RECORD_MISS', payload: { id: currentId } });
        await loadState();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    if (studyIndex + 1 >= studyDeckIds.length) {
      studyComplete = true;
      studyFlipped = false;
    } else {
      studyIndex++;
      studyFlipped = false;
    }
    renderStudyMode();
  }

  function renderStudyMode() {
    if (!isStudyMode) return;
    studyHeading.textContent = studyMissedRound ? 'Study Mode · Missed Cards' : 'Study Mode';
    studyStage.innerHTML = '';

    const activeDeck = studyDeckIds.map(getEntryById).filter(Boolean);

    if (activeDeck.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'study-empty';
      const title = document.createElement('p');
      title.className = 'empty-state-title';
      title.textContent =
        studyScope === 'dailyReview'
          ? 'All caught up for today!'
          : 'No flashcards in this deck';
      const desc = document.createElement('p');
      desc.className = 'empty-state-desc';
      desc.textContent =
        studyScope === 'dailyReview'
          ? 'Every scheduled spaced-repetition card has been reviewed today. Switch to All Collections to practice ahead.'
          : 'Switch to All Collections or save more expressions first.';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary-btn';
      btn.style.marginTop = '14px';
      btn.textContent = 'Study All Collections';
      btn.addEventListener('click', () => startStudySession('all'));
      empty.appendChild(title);
      empty.appendChild(desc);
      if (allEntries.length > 0 && studyScope !== 'all') empty.appendChild(btn);
      studyStage.appendChild(empty);
      return;
    }

    if (studyComplete) {
      const wrap = document.createElement('div');
      wrap.className = 'study-summary';
      wrap.innerHTML = `
        <p class="study-eyebrow">Session Complete</p>
        <h3 class="study-summary-title">You reviewed ${activeDeck.length} ${activeDeck.length === 1 ? 'card' : 'cards'}</h3>
        <div class="study-stats-grid">
          <div class="study-stat-box is-known">
            <div class="study-stat-num">${studyKnownIds.length}</div>
            <div class="study-stat-label">Known (Mastered)</div>
          </div>
          <div class="study-stat-box is-review">
            <div class="study-stat-num">${studyNeedsReviewIds.length}</div>
            <div class="study-stat-label">Needs Review (1d)</div>
          </div>
        </div>
      `;
      const actions = document.createElement('div');
      actions.className = 'study-summary-actions';

      if (studyNeedsReviewIds.length > 0) {
        const missedBtn = document.createElement('button');
        missedBtn.type = 'button';
        missedBtn.className = 'review-btn';
        missedBtn.textContent = `Review ${studyNeedsReviewIds.length} Missed ${studyNeedsReviewIds.length === 1 ? 'Card' : 'Cards'}`;
        missedBtn.addEventListener('click', () => startStudySession(studyScope, studyNeedsReviewIds, true));
        actions.appendChild(missedBtn);
      }

      const restartBtn = document.createElement('button');
      restartBtn.type = 'button';
      restartBtn.className = 'primary-btn';
      restartBtn.textContent = 'Study Again';
      restartBtn.addEventListener('click', () => startStudySession(studyScope));

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'secondary-btn';
      backBtn.textContent = 'Back to Vault';
      backBtn.addEventListener('click', closeStudyMode);

      actions.appendChild(restartBtn);
      actions.appendChild(backBtn);
      wrap.appendChild(actions);
      studyStage.appendChild(wrap);
      return;
    }

    const safeIdx = Math.min(studyIndex, activeDeck.length - 1);
    const card = activeDeck[safeIdx];
    const level = CUETShared.getMasteryLevel(card);
    const intervals = CUETShared.previewReviewIntervals(card);
    const pct = Math.round(((safeIdx + 1) / activeDeck.length) * 100);

    const progressMeta = document.createElement('div');
    progressMeta.className = 'study-progress-meta';
    progressMeta.innerHTML = `<span>Card ${safeIdx + 1} of ${activeDeck.length}</span><span>Known: ${studyKnownIds.length} · Review: ${studyNeedsReviewIds.length}</span>`;

    const progressTrack = document.createElement('div');
    progressTrack.className = 'study-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'study-progress-fill';
    progressFill.style.width = `${pct}%`;
    progressTrack.appendChild(progressFill);

    const scene = document.createElement('div');
    scene.className = 'flashcard-scene';

    const inner = document.createElement('div');
    inner.className = 'flashcard-3d-inner' + (studyFlipped ? ' is-flipped' : '');
    inner.setAttribute('data-flipped', String(studyFlipped));

    // FRONT FACE (Signature Midnight Navy)
    const frontFace = document.createElement('div');
    frontFace.className = 'flashcard flashcard-face flashcard-face-front';
    frontFace.setAttribute('aria-hidden', String(studyFlipped));
    frontFace.addEventListener('click', () => {
      if (!studyFlipped) flipActiveCard(true);
    });

    const frontMeta = document.createElement('div');
    frontMeta.className = 'flashcard-meta';
    const frontLeft = document.createElement('span');
    frontLeft.textContent = `${CUETShared.CATEGORIES[card.category] || 'Vocabulary'} · ${CUETShared.MASTERY_LABELS[level]}`;
    const frontRight = createSpeakChip(card.expression, `study-front-${card.id}`);
    frontMeta.appendChild(frontLeft);
    frontMeta.appendChild(frontRight);

    const frontBody = document.createElement('div');
    frontBody.className = 'flashcard-front';
    const expr = document.createElement('h3');
    expr.className = 'flashcard-expression';
    expr.textContent = card.expression;
    const hint = document.createElement('p');
    hint.className = 'flashcard-hint';
    hint.textContent = 'Think of the meaning and example before flipping.';
    const revealBtn = document.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'primary-btn flashcard-flip-cta';
    revealBtn.textContent = 'Reveal Meaning (Space)';
    revealBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      flipActiveCard(true);
    });
    frontBody.appendChild(expr);
    frontBody.appendChild(hint);
    frontBody.appendChild(revealBtn);

    const frontFooter = document.createElement('div');
    frontFooter.className = 'flashcard-meta';
    frontFooter.innerHTML = '<span>Click anywhere on card to flip</span><span>Space</span>';

    frontFace.appendChild(frontMeta);
    frontFace.appendChild(frontBody);
    frontFace.appendChild(frontFooter);

    // BACK FACE
    const backFace = document.createElement('div');
    backFace.className = 'flashcard flashcard-face flashcard-face-back';
    backFace.setAttribute('aria-hidden', String(!studyFlipped));

    const backHead = document.createElement('div');
    backHead.className = 'flashcard-back-head';
    const backTitle = document.createElement('h3');
    backTitle.className = 'flashcard-back-title';
    backTitle.textContent = card.expression;
    const backSpeak = createSpeakChip(card.expression, `study-back-${card.id}`);
    backHead.appendChild(backTitle);
    backHead.appendChild(backSpeak);

    const backContent = document.createElement('div');
    backContent.className = 'flashcard-back';

    const mLine = document.createElement('p');
    mLine.className = 'entry-line';
    const mStrong = document.createElement('strong');
    mStrong.textContent = 'Meaning: ';
    mLine.appendChild(mStrong);
    mLine.appendChild(document.createTextNode(card.meaning));

    const eLine = document.createElement('p');
    eLine.className = 'entry-line';
    const eStrong = document.createElement('strong');
    eStrong.textContent = 'Example: ';
    eLine.appendChild(eStrong);
    eLine.appendChild(document.createTextNode(card.example));

    backContent.appendChild(mLine);
    backContent.appendChild(eLine);

    if (card.contextSentence) {
      const cLine = document.createElement('p');
      cLine.className = 'entry-line';
      const cStrong = document.createElement('strong');
      cStrong.textContent = 'Context: ';
      cLine.appendChild(cStrong);
      cLine.appendChild(document.createTextNode(card.contextSentence));
      backContent.appendChild(cLine);
    }

    const backFooter = document.createElement('div');
    backFooter.className = 'flashcard-footer';

    const flipBackBtn = document.createElement('button');
    flipBackBtn.type = 'button';
    flipBackBtn.className = 'text-btn';
    flipBackBtn.textContent = '← Flip to Front';
    flipBackBtn.addEventListener('click', () => flipActiveCard(false));

    const rateActions = document.createElement('div');
    rateActions.className = 'study-rate-actions';

    const reviewBtn = document.createElement('button');
    reviewBtn.type = 'button';
    reviewBtn.className = 'review-btn';
    reviewBtn.textContent = 'Needs Review (1d)';
    reviewBtn.addEventListener('click', () => rateStudyCard('needsReview'));

    const knownBtn = document.createElement('button');
    knownBtn.type = 'button';
    knownBtn.className = 'accent-btn';
    knownBtn.textContent = `Known (${intervals.masteredDays}d)`;
    knownBtn.addEventListener('click', () => rateStudyCard('known'));

    rateActions.appendChild(reviewBtn);
    rateActions.appendChild(knownBtn);
    backFooter.appendChild(flipBackBtn);
    backFooter.appendChild(rateActions);

    backFace.appendChild(backHead);
    backFace.appendChild(backContent);
    backFace.appendChild(backFooter);

    inner.appendChild(frontFace);
    inner.appendChild(backFace);
    scene.appendChild(inner);

    const shortcuts = document.createElement('p');
    shortcuts.className = 'study-shortcuts';
    shortcuts.textContent = 'Shortcuts: Space to flip · 1 = Needs Review · 2 = Known · Esc = Exit';

    studyStage.appendChild(progressMeta);
    studyStage.appendChild(progressTrack);
    studyStage.appendChild(scene);
    studyStage.appendChild(shortcuts);
  }

  btnStudyMode.addEventListener('click', openStudyMode);
  btnStudyExit.addEventListener('click', closeStudyMode);
  studyDeckSelect.addEventListener('change', () => startStudySession(studyDeckSelect.value));
  btnStudyShuffle.addEventListener('click', () => {
    startStudySession(studyScope, shuffleIds(studyDeckIds), studyMissedRound);
  });

  // ==================== Quiz Mode (Auto-Records Mistakes) ====================
  function openQuizMode() {
    stopSpeech();
    if (isStudyMode) closeStudyMode();
    isQuizMode = true;
    quizPanel.hidden = false;
    libraryListView.hidden = true;
    quizPhase = 'setup';
    quizSetupError = '';
    const eligible = CUETShared.getQuizEligibleEntries(allEntries);
    const maxQ = Math.min(CUETShared.QUIZ_MAX_QUESTIONS, eligible.length);
    quizCount = Math.max(CUETShared.QUIZ_MIN_QUESTIONS, Math.min(10, maxQ || CUETShared.QUIZ_MIN_QUESTIONS));
    renderQuizMode();
  }

  function closeQuizMode() {
    stopSpeech();
    isQuizMode = false;
    quizPanel.hidden = true;
    libraryListView.hidden = false;
  }

  function startQuizSession() {
    const res = CUETShared.generateQuizQuestions(allEntries, {
      mode: quizSelectionMode,
      count: quizCount,
      selectedIds: quizSelectedIds,
    });
    if (!res.ok) {
      quizSetupError = res.error;
      renderQuizMode();
      return;
    }
    quizSetupError = '';
    quizQuestions = res.questions;
    quizIndex = 0;
    quizChosenOption = null;
    quizAnswers = [];
    quizPromoted = false;
    quizPhase = 'active';
    renderQuizMode();
  }

  function renderQuizMode() {
    if (!isQuizMode) return;
    btnQuizSetup.hidden = quizPhase === 'setup';
    quizStage.innerHTML = '';

    const eligible = CUETShared.getQuizEligibleEntries(allEntries);

    if (quizPhase === 'setup') {
      if (eligible.length < CUETShared.QUIZ_MIN_QUESTIONS) {
        const empty = document.createElement('div');
        empty.className = 'study-empty';
        empty.innerHTML = `
          <p class="empty-state-title">Add a few more New or Learning words to start a quiz</p>
          <p class="empty-state-desc">Quiz Mode needs at least ${CUETShared.QUIZ_MIN_QUESTIONS} "New" or "Learning" entries (currently ${eligible.length}).</p>
        `;
        quizStage.appendChild(empty);
        return;
      }

      const maxQ = Math.min(CUETShared.QUIZ_MAX_QUESTIONS, eligible.length);
      const wrap = document.createElement('div');
      wrap.className = 'quiz-setup';

      const modeRow = document.createElement('div');
      modeRow.className = 'quiz-mode-row';
      const modeLabel = document.createElement('span');
      modeLabel.className = 'field-label';
      modeLabel.textContent = `${eligible.length} eligible New/Learning entries`;

      const modeToggle = document.createElement('div');
      modeToggle.className = 'mastery-toggle';
      const randBtn = document.createElement('button');
      randBtn.type = 'button';
      randBtn.className = 'mastery-opt' + (quizSelectionMode === 'random' ? ' is-active is-mastered' : '');
      randBtn.textContent = 'Random Mix';
      randBtn.addEventListener('click', () => {
        quizSelectionMode = 'random';
        quizSetupError = '';
        renderQuizMode();
      });
      const customBtn = document.createElement('button');
      customBtn.type = 'button';
      customBtn.className = 'mastery-opt' + (quizSelectionMode === 'custom' ? ' is-active is-mastered' : '');
      customBtn.textContent = 'Choose Specific Words';
      customBtn.addEventListener('click', () => {
        quizSelectionMode = 'custom';
        quizSetupError = '';
        renderQuizMode();
      });
      modeToggle.appendChild(randBtn);
      modeToggle.appendChild(customBtn);
      modeRow.appendChild(modeLabel);
      modeRow.appendChild(modeToggle);
      wrap.appendChild(modeRow);

      const box = document.createElement('div');
      box.className = 'quiz-box';

      if (quizSelectionMode === 'random') {
        const lbl = document.createElement('label');
        lbl.className = 'field-label';
        lbl.textContent = `Number of questions: ${quizCount} (range ${CUETShared.QUIZ_MIN_QUESTIONS}–${maxQ})`;
        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(CUETShared.QUIZ_MIN_QUESTIONS);
        range.max = String(maxQ);
        range.value = String(Math.min(maxQ, Math.max(CUETShared.QUIZ_MIN_QUESTIONS, quizCount)));
        range.addEventListener('input', () => {
          quizCount = Number(range.value);
          lbl.textContent = `Number of questions: ${quizCount} (range ${CUETShared.QUIZ_MIN_QUESTIONS}–${maxQ})`;
        });
        box.appendChild(lbl);
        box.appendChild(range);
      } else {
        const pickerHead = document.createElement('div');
        pickerHead.className = 'quiz-mode-row';
        const pickerLbl = document.createElement('span');
        pickerLbl.className = 'field-label';
        pickerLbl.textContent = `Selected: ${quizSelectedIds.length} (pick ${CUETShared.QUIZ_MIN_QUESTIONS}–${maxQ})`;
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'text-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => {
          quizSelectedIds = [];
          renderQuizMode();
        });
        pickerHead.appendChild(pickerLbl);
        pickerHead.appendChild(clearBtn);
        box.appendChild(pickerHead);

        const listEl = document.createElement('div');
        listEl.className = 'quiz-picker-list';
        for (const item of eligible) {
          const row = document.createElement('label');
          row.className = 'quiz-picker-item';
          const left = document.createElement('span');
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = quizSelectedIds.includes(item.id);
          cb.style.marginRight = '8px';
          cb.addEventListener('change', () => {
            if (cb.checked) {
              if (quizSelectedIds.length < CUETShared.QUIZ_MAX_QUESTIONS) {
                quizSelectedIds.push(item.id);
              } else {
                cb.checked = false;
              }
            } else {
              quizSelectedIds = quizSelectedIds.filter((id) => id !== item.id);
            }
            pickerLbl.textContent = `Selected: ${quizSelectedIds.length} (pick ${CUETShared.QUIZ_MIN_QUESTIONS}–${maxQ})`;
          });
          left.appendChild(cb);
          left.appendChild(document.createTextNode(item.expression));
          const cat = document.createElement('span');
          cat.className = 'entry-meta';
          cat.textContent = CUETShared.CATEGORIES[item.category];
          row.appendChild(left);
          row.appendChild(cat);
          listEl.appendChild(row);
        }
        box.appendChild(listEl);
      }
      wrap.appendChild(box);

      if (quizSetupError) {
        const errP = document.createElement('p');
        errP.className = 'modal-error';
        errP.textContent = quizSetupError;
        wrap.appendChild(errP);
      }

      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'primary-btn';
      startBtn.textContent = 'Start Quiz';
      startBtn.addEventListener('click', startQuizSession);
      wrap.appendChild(startBtn);
      quizStage.appendChild(wrap);
      return;
    }

    if (quizPhase === 'summary') {
      const correctAnswers = quizAnswers.filter((a) => a.isCorrect);
      const wrongCount = quizAnswers.length - correctAnswers.length;
      const pct = quizAnswers.length > 0 ? Math.round((correctAnswers.length / quizAnswers.length) * 100) : 0;

      const wrap = document.createElement('div');
      wrap.className = 'study-summary';
      wrap.innerHTML = `
        <p class="study-eyebrow">Quiz Complete</p>
        <h3 class="study-summary-title">You scored ${correctAnswers.length} / ${quizAnswers.length} (${pct}%)</h3>
        <div class="study-stats-grid">
          <div class="study-stat-box is-known">
            <div class="study-stat-num">${correctAnswers.length}</div>
            <div class="study-stat-label">Correct</div>
          </div>
          <div class="study-stat-box is-review">
            <div class="study-stat-num">${wrongCount}</div>
            <div class="study-stat-label">Missed (Logged to Needs Practice)</div>
          </div>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'study-summary-actions';

      if (correctAnswers.length > 0 && !quizPromoted) {
        const promoBtn = document.createElement('button');
        promoBtn.type = 'button';
        promoBtn.className = 'primary-btn';
        promoBtn.textContent = `Mark ${correctAnswers.length} Correct as Mastered`;
        promoBtn.addEventListener('click', async () => {
          promoBtn.disabled = true;
          const ids = correctAnswers.map((a) => a.entryId);
          await sendMessage({
            type: 'BULK_UPDATE_ENTRIES',
            payload: { ids, patch: { masteryLevel: 'mastered' } },
          });
          quizPromoted = true;
          await loadState();
          showToast(`Promoted ${ids.length} words to Mastered.`, 'ok');
          renderQuizMode();
        });
        actions.appendChild(promoBtn);
      }

      const againBtn = document.createElement('button');
      againBtn.type = 'button';
      againBtn.className = 'secondary-btn';
      againBtn.textContent = 'New Quiz';
      againBtn.addEventListener('click', () => {
        quizPhase = 'setup';
        renderQuizMode();
      });

      const exitBtn = document.createElement('button');
      exitBtn.type = 'button';
      exitBtn.className = 'secondary-btn';
      exitBtn.textContent = 'Back to Vault';
      exitBtn.addEventListener('click', closeQuizMode);

      actions.appendChild(againBtn);
      actions.appendChild(exitBtn);
      wrap.appendChild(actions);
      quizStage.appendChild(wrap);
      return;
    }

    // Active question
    const q = quizQuestions[quizIndex];
    const pct = Math.round(((quizIndex + 1) / quizQuestions.length) * 100);

    const progressMeta = document.createElement('div');
    progressMeta.className = 'study-progress-meta';
    const scoreSoFar = quizAnswers.filter((a) => a.isCorrect).length;
    progressMeta.innerHTML = `<span>Question ${quizIndex + 1} of ${quizQuestions.length}</span><span>Score: ${scoreSoFar}/${quizAnswers.length}</span>`;

    const progressTrack = document.createElement('div');
    progressTrack.className = 'study-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'study-progress-fill';
    progressFill.style.width = `${pct}%`;
    progressTrack.appendChild(progressFill);

    const card = document.createElement('div');
    card.className = 'flashcard';

    const meta = document.createElement('div');
    meta.className = 'flashcard-meta';
    const leftMeta = document.createElement('span');
    leftMeta.textContent = `${CUETShared.CATEGORIES[q.category] || 'Vocabulary'} · Choose the correct meaning`;
    const speakBtn = createSpeakChip(q.expression, `quiz-${q.id}`);
    meta.appendChild(leftMeta);
    meta.appendChild(speakBtn);

    const title = document.createElement('h3');
    title.className = 'flashcard-back-title';
    title.textContent = q.expression;

    const optsWrap = document.createElement('div');
    optsWrap.className = 'quiz-options';

    const answered = quizChosenOption !== null;
    q.options.forEach((optText, idx) => {
      const optBtn = document.createElement('button');
      optBtn.type = 'button';
      optBtn.className = 'quiz-option';
      optBtn.disabled = answered;
      if (answered) {
        if (idx === q.correctIndex) optBtn.classList.add('is-correct');
        else if (idx === quizChosenOption) optBtn.classList.add('is-wrong');
      }
      optBtn.textContent = `${String.fromCharCode(65 + idx)}. ${optText}`;
      optBtn.addEventListener('click', async () => {
        if (quizChosenOption !== null) return;
        quizChosenOption = idx;
        const isCorrect = idx === q.correctIndex;
        quizAnswers.push({ entryId: q.entryId, expression: q.expression, isCorrect });
        if (!isCorrect) {
          try {
            await sendMessage({ type: 'RECORD_MISS', payload: { id: q.entryId } });
            await loadState();
          } catch {
            // Keep quiz flowing
          }
        }
        renderQuizMode();
      });
      optsWrap.appendChild(optBtn);
    });

    card.appendChild(meta);
    card.appendChild(title);
    card.appendChild(optsWrap);

    if (answered) {
      const footer = document.createElement('div');
      footer.className = 'flashcard-footer';
      const exNote = document.createElement('span');
      exNote.className = 'flashcard-tip';
      exNote.textContent = q.example ? `Example: ${q.example}` : '';
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'primary-btn';
      nextBtn.textContent = quizIndex + 1 >= quizQuestions.length ? 'See Results' : 'Next Question →';
      nextBtn.addEventListener('click', () => {
        if (quizIndex + 1 >= quizQuestions.length) {
          quizPhase = 'summary';
        } else {
          quizIndex++;
          quizChosenOption = null;
        }
        renderQuizMode();
      });
      footer.appendChild(exNote);
      footer.appendChild(nextBtn);
      card.appendChild(footer);
    }

    quizStage.appendChild(progressMeta);
    quizStage.appendChild(progressTrack);
    quizStage.appendChild(card);
  }

  btnQuizMode.addEventListener('click', openQuizMode);
  btnQuizExit.addEventListener('click', closeQuizMode);
  btnQuizSetup.addEventListener('click', () => {
    quizPhase = 'setup';
    renderQuizMode();
  });

  // Keyboard shortcuts for Study Mode
  document.addEventListener('keydown', (e) => {
    if (!isStudyMode || studyComplete) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      flipActiveCard();
    } else if (e.key === '1' && studyFlipped) {
      e.preventDefault();
      rateStudyCard('needsReview');
    } else if (e.key === '2' && studyFlipped) {
      e.preventDefault();
      rateStudyCard('known');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeStudyMode();
    }
  });

  // ==================== Add & Backup Collapsible Panels ====================
  function syncPanelToggleButtons() {
    const addOpen = !addPanel.hidden;
    const backupOpen = !backupPanel.hidden;
    btnToggleAdd.setAttribute('aria-expanded', String(addOpen));
    btnToggleAdd.classList.toggle('is-active-panel', addOpen);
    btnToggleAdd.textContent = addOpen ? 'Add Entries ✓' : 'Add Entries';

    btnToggleBackup.setAttribute('aria-expanded', String(backupOpen));
    btnToggleBackup.classList.toggle('is-active-panel', backupOpen);
    btnToggleBackup.textContent = backupOpen ? 'Backup & Export ✓' : 'Backup & Export';
  }

  btnToggleAdd.addEventListener('click', () => {
    addPanel.hidden = !addPanel.hidden;
    if (!addPanel.hidden) {
      backupPanel.hidden = true;
      dashEntryInput.focus();
    }
    syncPanelToggleButtons();
  });

  btnCloseAdd.addEventListener('click', () => {
    addPanel.hidden = true;
    syncPanelToggleButtons();
  });

  btnToggleBackup.addEventListener('click', () => {
    backupPanel.hidden = !backupPanel.hidden;
    if (!backupPanel.hidden) {
      addPanel.hidden = true;
      updateSheetSyncControls();
    }
    syncPanelToggleButtons();
  });

  btnCloseBackup.addEventListener('click', () => {
    backupPanel.hidden = true;
    syncPanelToggleButtons();
  });

  dashAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const list = CUETShared.parseBulkInput(dashEntryInput.value);
    if (list.length === 0) {
      showToast('Enter at least one word, idiom, or phrasal verb.', 'error');
      dashEntryInput.focus();
      return;
    }

    btnDashSave.disabled = true;
    btnDashSave.textContent = 'Analysing…';
    dashAddStatus.hidden = false;
    dashAddDetails.innerHTML = '';

    let saved = 0;
    let dup = 0;
    let failed = 0;
    const selectedCategory = dashCategorySelect.value;

    for (let i = 0; i < list.length; i++) {
      const expr = list[i];
      const cat = selectedCategory === 'auto' ? CUETShared.detectCategory(expr) : selectedCategory;
      dashAddSummary.textContent =
        list.length === 1 ? `Analysing "${expr}"…` : `Analysing ${i + 1} of ${list.length}: "${expr}"…`;
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
        const li = document.createElement('li');
        if (res && res.ok) {
          saved++;
          li.textContent = `Saved "${res.entry.expression}" (${CUETShared.CATEGORIES[res.entry.category]})`;
          await loadState();
        } else if (res && res.duplicate) {
          dup++;
          li.textContent = `Skipped duplicate: "${expr}"`;
        } else {
          failed++;
          li.className = 'err';
          li.textContent = `Failed "${expr}": ${(res && res.error) || 'Unknown error'}`;
        }
        dashAddDetails.appendChild(li);
      } catch (err) {
        failed++;
        const li = document.createElement('li');
        li.className = 'err';
        li.textContent = `Failed "${expr}": ${err.message}`;
        dashAddDetails.appendChild(li);
      }
    }

    const parts = [];
    if (saved) parts.push(`${saved} saved`);
    if (dup) parts.push(`${dup} duplicate`);
    if (failed) parts.push(`${failed} failed`);
    dashAddSummary.textContent = `Done: ${parts.join(', ')}.`;

    if (saved > 0 && failed === 0) dashEntryInput.value = '';
    btnDashSave.disabled = false;
    btnDashSave.textContent = 'Save and Analyse';
    await loadState();
  });

  // ==================== Export / Import / Copy / Paste JSON, CSV, PDF, Anki ====================
  btnExportJson.addEventListener('click', async () => {
    try {
      const res = await sendMessage({ type: 'EXPORT_BACKUP_JSON' });
      if (res && res.ok) {
        const blob = new Blob([JSON.stringify(res.backup, null, 2)], { type: 'application/json' });
        const stamp = new Date().toISOString().slice(0, 10);
        triggerFileDownload(blob, `ipmat-cuet-vocab-backup-${stamp}.json`);
        showToast(`Exported ${res.backup.entries.length} entries to JSON backup.`, 'ok');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  btnCopyJson.addEventListener('click', async () => {
    try {
      const res = await sendMessage({ type: 'EXPORT_BACKUP_JSON' });
      if (res && res.ok) {
        await navigator.clipboard.writeText(JSON.stringify(res.backup, null, 2));
        showToast(`Copied ${res.backup.entries.length} entries as JSON to clipboard.`, 'ok');
      }
    } catch (err) {
      showToast('Could not copy JSON to clipboard: ' + err.message, 'error');
    }
  });

  btnImportJson.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
  });

  async function importJsonPayloadText(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      showToast('Invalid JSON format. Check the pasted or uploaded backup.', 'error');
      return false;
    }
    const res = await sendMessage({ type: 'IMPORT_BACKUP', payload: parsed });
    if (res && res.ok) {
      await loadState();
      showToast(
        `Imported ${res.addedCount} new ${res.addedCount === 1 ? 'entry' : 'entries'}${
          res.skippedCount ? ` (${res.skippedCount} duplicates skipped)` : ''
        }.`,
        'ok'
      );
      return true;
    }
    showToast((res && res.error) || 'Import failed.', 'error');
    return false;
  }

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files && importFileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importJsonPayloadText(text);
    } catch (err) {
      showToast('Could not read file: ' + err.message, 'error');
    }
  });

  btnTogglePasteJson.addEventListener('click', () => {
    pasteJsonBox.hidden = !pasteJsonBox.hidden;
    if (!pasteJsonBox.hidden) pasteJsonInput.focus();
  });

  btnPasteJsonCancel.addEventListener('click', () => {
    pasteJsonBox.hidden = true;
    pasteJsonInput.value = '';
  });

  btnPasteJsonMerge.addEventListener('click', async () => {
    const raw = pasteJsonInput.value.trim();
    if (!raw) {
      showToast('Paste your JSON backup text first.', 'error');
      pasteJsonInput.focus();
      return;
    }
    const ok = await importJsonPayloadText(raw);
    if (ok) {
      pasteJsonBox.hidden = true;
      pasteJsonInput.value = '';
    }
  });

  async function handleExportCsv() {
    try {
      const res = await sendMessage({ type: 'EXPORT_CSV' });
      if (res && res.ok) {
        if (!res.count) {
          showToast('No entries to export yet.', 'neutral');
          return;
        }
        const blob = new Blob(['\uFEFF' + res.csv], { type: 'text/csv;charset=utf-8' });
        const stamp = new Date().toISOString().slice(0, 10);
        triggerFileDownload(blob, `ipmat-cuet-vocab-${stamp}.csv`);
        showToast(`Downloaded CSV with ${res.count} entries.`, 'ok');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  btnDownloadCsv.addEventListener('click', handleExportCsv);
  btnExportCsv.addEventListener('click', handleExportCsv);

  btnExportAnki.addEventListener('click', async () => {
    try {
      const res = await sendMessage({ type: 'EXPORT_ANKI_TSV' });
      if (res && res.ok) {
        if (!res.count) {
          showToast('No entries to export to Anki yet.', 'neutral');
          return;
        }
        const blob = new Blob(['\uFEFF' + res.tsv], { type: 'text/tab-separated-values;charset=utf-8' });
        const stamp = new Date().toISOString().slice(0, 10);
        triggerFileDownload(blob, `ipmat-cuet-anki-cards-${stamp}.tsv`);
        showToast(`Exported ${res.count} entries for Anki (.tsv).`, 'ok');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // PDF Dialog
  function updatePdfPreviewNote() {
    const cat = pdfCategorySelect.value;
    const subset = cat === 'all' ? allEntries : allEntries.filter((e) => e.category === cat);
    pdfPreviewNote.textContent =
      subset.length > 0
        ? `Ready to generate A4 PDF with ${subset.length} ${subset.length === 1 ? 'entry' : 'entries'}.`
        : 'No entries available in this category.';
    btnPdfConfirm.disabled = subset.length === 0;
  }

  function openPdfDialog() {
    pdfCategorySelect.value = activeTab === 'all' ? 'all' : activeTab;
    updatePdfPreviewNote();
    pdfDialog.showModal();
  }

  btnDownloadPdf.addEventListener('click', openPdfDialog);
  btnExportPdf.addEventListener('click', openPdfDialog);
  pdfCategorySelect.addEventListener('change', updatePdfPreviewNote);
  btnPdfClose.addEventListener('click', () => pdfDialog.close());
  btnPdfCancel.addEventListener('click', () => pdfDialog.close());

  pdfForm.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      const pdf = CUETShared.buildPdfStudySheetBytes(allEntries, {
        category: pdfCategorySelect.value,
        sortOrder: pdfSortSelect.value,
      });
      const blob = new Blob([pdf.bytes], { type: 'application/pdf' });
      triggerFileDownload(blob, pdf.filename);
      pdfDialog.close();
      showToast(`Downloaded PDF study sheet (${pdf.entryCount} entries).`, 'ok');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // ==================== Edit & Confirm Dialogs ====================
  function openEditDialog(entry) {
    editId.value = entry.id;
    editExpression.value = entry.expression;
    editCategory.value = entry.category;
    editMeaning.value = entry.meaning;
    editExample.value = entry.example;
    editError.hidden = true;
    editDialog.showModal();
  }

  btnEditClose.addEventListener('click', () => editDialog.close());
  btnEditCancel.addEventListener('click', () => editDialog.close());

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    editError.hidden = true;
    const id = editId.value;
    const patch = {
      expression: editExpression.value.trim(),
      category: editCategory.value,
      meaning: editMeaning.value.trim(),
      example: editExample.value.trim(),
    };
    if (!patch.expression || !patch.meaning || !patch.example) {
      editError.hidden = false;
      editError.textContent = 'Expression, meaning, and example are all required.';
      return;
    }
    try {
      const res = await sendMessage({ type: 'UPDATE_ENTRY', payload: { id, patch, skipReviewSchedule: true } });
      if (res && res.ok) {
        editDialog.close();
        await loadState();
        showToast(`Saved changes to "${res.entry.expression}".`, 'ok');
      } else {
        editError.hidden = false;
        editError.textContent = (res && res.error) || 'Could not save changes.';
      }
    } catch (err) {
      editError.hidden = false;
      editError.textContent = err.message;
    }
  });

  function openConfirmDialog(title, message, proceedLabel, action) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    btnConfirmProceed.textContent = proceedLabel;
    pendingConfirmAction = action;
    confirmDialog.showModal();
  }

  btnConfirmCancel.addEventListener('click', () => {
    pendingConfirmAction = null;
    confirmDialog.close();
  });

  btnConfirmProceed.addEventListener('click', async () => {
    const fn = pendingConfirmAction;
    pendingConfirmAction = null;
    confirmDialog.close();
    if (fn) await fn();
  });

  btnClearLibrary.addEventListener('click', () => {
    if (allEntries.length === 0) {
      showToast('Your Vocab Vault is already empty.', 'neutral');
      return;
    }
    openConfirmDialog(
      'Clear Entire Vocab Vault?',
      `This will permanently remove all ${allEntries.length} saved entries from local browser storage. Export a JSON backup first if you want to keep a copy.`,
      'Clear Library',
      async () => {
        const res = await sendMessage({ type: 'CLEAR_ALL_ENTRIES' });
        if (res && res.ok) {
          selectedIds.clear();
          await loadState();
          showToast('Cleared all entries from THE VOCAB VAULT.', 'neutral');
        }
      }
    );
  });

  // ==================== Filter & Tab Listeners ====================
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab || 'vocabulary';
      tabBtns.forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      renderEntries();
    });
  });

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    updateQuickFilterUI();
    renderEntries();
  });

  btnClearSearch.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    updateQuickFilterUI();
    renderEntries();
    searchInput.focus();
  });

  filterSelect.addEventListener('change', () => {
    statusFilter = filterSelect.value;
    updateQuickFilterUI();
    renderEntries();
  });

  sourceSelect.addEventListener('change', () => {
    sourceFilter = sourceSelect.value;
    updateQuickFilterUI();
    renderEntries();
  });

  sortSelect.addEventListener('change', () => {
    sortOrder = sortSelect.value;
    updateQuickFilterUI();
    renderEntries();
  });

  btnQuickDue.addEventListener('click', () => {
    statusFilter = statusFilter === 'dueToday' ? 'all' : 'dueToday';
    updateQuickFilterUI();
    renderEntries();
  });

  btnQuickPractice.addEventListener('click', () => {
    statusFilter = statusFilter === 'needsPractice' ? 'all' : 'needsPractice';
    if (statusFilter === 'needsPractice') sortOrder = 'mostMissed';
    updateQuickFilterUI();
    renderEntries();
  });

  btnResetFilters.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    statusFilter = 'all';
    sourceFilter = 'all';
    sortOrder = 'recent';
    updateQuickFilterUI();
    renderEntries();
  });

  // ==================== State Load & Storage Sync ====================
  async function loadState() {
    try {
      const res = await sendMessage({ type: 'GET_STATE' });
      if (res && res.ok) {
        allEntries = Array.isArray(res.entries) ? res.entries : [];
        apiKeyBanner.hidden = Boolean(res.hasApiKey);
        hasSheetWebhook = Boolean(res.hasSheetWebhook);
        sheetWebhookUrl = res.sheetWebhookUrl || '';
        dailyGoalTarget = CUETShared.clampDailyGoal(res.dailyGoalTarget);
        examConfig = res.examConfig && res.examConfig.examDate ? res.examConfig : null;
        applyTheme(res.themeMode === 'dark' ? 'dark' : 'light');

        updateCounts();
        renderDailyGoal();
        renderExamCountdown();
        updateSheetSyncControls();
        renderMasteryProgress();
        renderMasteryBadges();
        renderInsights();
        renderSourceDropdown();
        updateQuickFilterUI();
        renderBulkBar();
        renderEntries();
        if (isStudyMode) renderStudyMode();
        if (isQuizMode && quizPhase === 'setup') renderQuizMode();
      }
    } catch (err) {
      showToast('Could not load Vocab Vault: ' + err.message, 'error');
    }
  }

  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && (changes.cuet_entries || changes.cuet_settings)) {
        void loadState();
      }
    });
  }

  loadState();
})();
