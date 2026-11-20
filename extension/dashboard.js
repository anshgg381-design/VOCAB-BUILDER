/* CUET Vocabulary Builder — Dashboard Logic */
(function () {
  'use strict';

  let allEntries = [];
  let activeTab = 'vocabulary';
  let searchQuery = '';
  let statusFilter = 'all';
  let sortOrder = 'recent';
  let reanalysingIds = new Set();
  let pendingConfirmAction = null;
  let hasSheetWebhook = false;
  let isSheetSyncBusy = false;

  const apiKeyBanner = document.getElementById('api-key-banner');
  const toastBar = document.getElementById('toast-bar');
  const entriesList = document.getElementById('entries-list');

  const tabBtns = Array.from(document.querySelectorAll('.tab-btn'));
  const tabCounts = {
    vocabulary: document.getElementById('tab-count-vocabulary'),
    idioms: document.getElementById('tab-count-idioms'),
    phrasalVerbs: document.getElementById('tab-count-phrasalVerbs'),
  };

  const searchInput = document.getElementById('search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const searchMeta = document.getElementById('search-meta');
  const filterSelect = document.getElementById('filter-select');
  const sortSelect = document.getElementById('sort-select');

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
  let showInsights = true;
  let insightsMetric = 'mastered';
  let copiedEntryId = null;

  // Study Mode
  const btnStudyMode = document.getElementById('btn-study-mode');
  const studyPanel = document.getElementById('study-panel');
  const libraryListView = document.getElementById('library-list-view');
  const studyHeading = document.getElementById('study-heading');
  const studyDeckSelect = document.getElementById('study-deck-select');
  const btnStudyShuffle = document.getElementById('btn-study-shuffle');
  const btnStudyExit = document.getElementById('btn-study-exit');
  const studyStage = document.getElementById('study-stage');

  let isStudyMode = false;
  let isQuizMode = false;
  let studyScope = 'all';
  let studyDeckIds = [];
  let studyIndex = 0;
  let studyFlipped = false;
  let studyKnownIds = [];
  let studyNeedsReviewIds = [];
  let studyComplete = false;
  let studyMissedRound = false;

  // Quiz Mode
  const btnQuizMode = document.getElementById('btn-quiz-mode');
  const quizPanel = document.getElementById('quiz-panel');
  const btnQuizSetup = document.getElementById('btn-quiz-setup');
  const btnQuizExit = document.getElementById('btn-quiz-exit');
  const quizStage = document.getElementById('quiz-stage');

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

  let dailyGoalTarget = CUETShared.DEFAULT_DAILY_GOAL;
  let prevDailyGoalReached = null;
  let dailyCelebrateTimer = null;

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
  const btnImportJson = document.getElementById('btn-import-json');
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

  // PDF study sheet dialog
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

  let toastTimer = null;

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

  function showToast(text, tone) {
    if (toastTimer) clearTimeout(toastTimer);
    toastBar.hidden = false;
    toastBar.className = 'toast-bar' + (tone ? ' ' + tone : '');
    toastBar.textContent = text;
    toastTimer = setTimeout(() => {
      toastBar.hidden = true;
    }, 5500);
  }

  function openConfirm({ title, message, confirmLabel, onConfirm }) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    btnConfirmProceed.textContent = confirmLabel || 'Confirm';
    pendingConfirmAction = onConfirm;
    confirmDialog.showModal();
  }

  function triggerDownload(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function getFilteredEntries() {
    const query = searchQuery.trim().toLowerCase();
    let list = allEntries.filter((e) => e.category === activeTab);

    if (statusFilter === 'new' || statusFilter === 'learning' || statusFilter === 'mastered') {
      list = list.filter((e) => CUETShared.getMasteryLevel(e) === statusFilter);
    } else if (statusFilter === 'favourites') {
      list = list.filter((e) => e.favourite);
    }

    if (query) {
      list = list.filter((e) => {
        return (
          (e.expression || '').toLowerCase().includes(query) ||
          (e.meaning || '').toLowerCase().includes(query) ||
          (e.example || '').toLowerCase().includes(query) ||
          (e.contextSentence || '').toLowerCase().includes(query) ||
          (e.sourceTitle || '').toLowerCase().includes(query)
        );
      });
    }

    list = [...list];
    if (sortOrder === 'az') {
      list.sort((a, b) => a.expression.localeCompare(b.expression, undefined, { sensitivity: 'base' }));
    } else if (sortOrder === 'za') {
      list.sort((a, b) => b.expression.localeCompare(a.expression, undefined, { sensitivity: 'base' }));
    } else {
      list.sort((a, b) => Date.parse(b.dateAdded || '') - Date.parse(a.dateAdded || ''));
    }

    return list;
  }

  function updateTabCounts() {
    const counts = CUETShared.getCategoryCounts(allEntries);
    tabCounts.vocabulary.textContent = String(counts.vocabulary);
    tabCounts.idioms.textContent = String(counts.idioms);
    tabCounts.phrasalVerbs.textContent = String(counts.phrasalVerbs);
  }

  function updateMasteryProgress() {
    const stats = CUETShared.getMasteryStats(allEntries);
    if (masteryCounts) {
      masteryCounts.textContent = `${stats.masteredCount} mastered · ${stats.learningCount} learning · ${stats.newCount} new`;
    }
    if (masteryPercent) {
      masteryPercent.textContent = `${stats.percentMastered}% Mastered`;
    }
    if (masteryProgressbar) {
      masteryProgressbar.setAttribute('aria-valuenow', String(stats.percentMastered));
    }
    if (masteryFillMastered) {
      masteryFillMastered.style.width = `${stats.percentMastered}%`;
    }
    if (masteryFillLearning) {
      masteryFillLearning.style.width = `${Math.min(100 - stats.percentMastered, stats.percentLearning)}%`;
    }
  }

  const BADGE_SVG_PATHS = {
    novice: '<circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5"/>',
    word_collector: '<path d="M12 6.5V20"/><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H12v17H4.5A2.5 2.5 0 0 1 2 17.5Z"/><path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H12v17h7.5a2.5 2.5 0 0 0 2.5-2.5Z"/>',
    vocabulary_scholar: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/>',
    lexicon_tactician: '<circle cx="12" cy="8.5" r="5.5"/><path d="M9 13.5 7.5 21l4.5-2.5 4.5 2.5-1.5-7.5"/>',
    master_learner: '<path d="M3 17h18l-1.5-9-4.5 4-3-6-3 6-4.5-4L3 17Z"/><path d="M4 20h16"/>',
  };

  function updateMasteryBadges() {
    if (!badgesGrid || !CUETShared.getMasteryBadgeProgress) return;
    const progress = CUETShared.getMasteryBadgeProgress(allEntries);
    if (badgesSummary) {
      const unit = progress.masteredCount === 1 ? 'word' : 'words';
      badgesSummary.textContent = `${progress.unlockedCount} of ${progress.totalBadges} unlocked · ${progress.masteredCount} ${unit} mastered`;
    }
    if (badgesRankStatus) {
      if (progress.currentBadge) {
        badgesRankStatus.textContent = progress.nextBadge
          ? `Current Rank: ${progress.currentBadge.title} · Next: ${progress.nextBadge.title} (${progress.nextBadge.remaining} more)`
          : `Current Rank: ${progress.currentBadge.title} · Top tier reached`;
      } else {
        badgesRankStatus.textContent = 'Master 1 word to unlock Novice';
      }
    }

    badgesGrid.innerHTML = '';
    for (const badge of progress.badges) {
      const card = document.createElement('div');
      card.className = 'badge-tile' + (badge.unlocked ? ' is-unlocked' : '');
      card.setAttribute('role', 'listitem');
      card.dataset.badgeId = badge.id;
      card.dataset.unlocked = badge.unlocked ? 'true' : 'false';

      const top = document.createElement('div');
      top.className = 'badge-top';

      const emblem = document.createElement('div');
      emblem.className = 'badge-emblem';
      emblem.setAttribute('aria-hidden', 'true');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '18');
      svg.setAttribute('height', '18');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');
      svg.innerHTML = BADGE_SVG_PATHS[badge.id] || BADGE_SVG_PATHS.novice;
      emblem.appendChild(svg);

      const info = document.createElement('div');
      info.className = 'badge-info';
      const titleEl = document.createElement('p');
      titleEl.className = 'badge-title';
      titleEl.textContent = badge.title;
      const reqEl = document.createElement('p');
      reqEl.className = 'badge-req';
      reqEl.textContent = `${badge.threshold} ${badge.threshold === 1 ? 'word' : 'words'} mastered`;
      info.appendChild(titleEl);
      info.appendChild(reqEl);

      top.appendChild(emblem);
      top.appendChild(info);

      const foot = document.createElement('div');
      foot.className = 'badge-foot';
      const meta = document.createElement('div');
      meta.className = 'badge-meta';
      const statusSpan = document.createElement('span');
      statusSpan.className = 'badge-state';
      statusSpan.textContent = badge.unlocked
        ? 'Unlocked'
        : progress.nextBadge && progress.nextBadge.id === badge.id
        ? 'In Progress'
        : 'Locked';
      const countSpan = document.createElement('span');
      countSpan.textContent = `${Math.min(progress.masteredCount, badge.threshold)}/${badge.threshold}`;
      meta.appendChild(statusSpan);
      meta.appendChild(countSpan);

      const bar = document.createElement('div');
      bar.className = 'badge-track';
      const fill = document.createElement('div');
      fill.className = 'badge-fill';
      fill.style.width = `${badge.progressPercent}%`;
      bar.appendChild(fill);

      foot.appendChild(meta);
      foot.appendChild(bar);

      card.appendChild(top);
      card.appendChild(foot);
      badgesGrid.appendChild(card);
    }
  }

  function canSpeakExpression() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  }

  function speakExpression(text) {
    if (!canSpeakExpression() || !text || !text.trim()) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors cleanly
    }
  }

  function renderInsights() {
    if (!insightsPanel || !insightsKpis || !insightCatBars || !insightMasteryBars) return;
    insightsPanel.hidden = !showInsights;
    if (btnToggleInsights) {
      btnToggleInsights.textContent = showInsights ? 'Hide Insights' : 'Insights';
      btnToggleInsights.setAttribute('aria-expanded', showInsights ? 'true' : 'false');
    }
    if (!showInsights) return;

    const catData = CUETShared.getCategoryInsightData(allEntries);
    const masteryData = CUETShared.getMasteryDistributionData(allEntries);
    const stats = CUETShared.getMasteryStats(allEntries);

    insightsKpis.innerHTML = '';
    const kpis = [
      { label: 'Total Saved', value: String(stats.total) },
      { label: 'Mastered', value: String(stats.masteredCount) },
      { label: 'Learning', value: String(stats.learningCount) },
      { label: 'New', value: String(stats.newCount) },
    ];
    for (const k of kpis) {
      const box = document.createElement('div');
      box.className = 'insight-kpi';
      const lbl = document.createElement('div');
      lbl.className = 'insight-kpi-label';
      lbl.textContent = k.label;
      const val = document.createElement('div');
      val.className = 'insight-kpi-val';
      val.textContent = k.value;
      box.appendChild(lbl);
      box.appendChild(val);
      insightsKpis.appendChild(box);
    }

    if (insightCatTitle) {
      insightCatTitle.textContent =
        insightsMetric === 'mastered' ? 'Learned (Mastered) per Category' : 'Total Saved per Category';
    }

    const maxCat = Math.max(
      1,
      ...catData.map((d) => (insightsMetric === 'mastered' ? d.mastered : d.total))
    );
    insightCatBars.innerHTML = '';
    for (const item of catData) {
      const val = insightsMetric === 'mastered' ? item.mastered : item.total;
      const pct = Math.round((val / maxCat) * 100);
      const row = document.createElement('div');
      row.className = 'insight-bar-row';
      const meta = document.createElement('div');
      meta.className = 'insight-bar-meta';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.label;
      const valStrong = document.createElement('strong');
      valStrong.textContent =
        insightsMetric === 'mastered' ? `${item.mastered} / ${item.total}` : String(item.total);
      meta.appendChild(nameSpan);
      meta.appendChild(valStrong);
      const track = document.createElement('div');
      track.className = 'insight-bar-track';
      const fill = document.createElement('div');
      fill.className = 'insight-bar-fill is-mastered';
      fill.style.width = `${pct}%`;
      track.appendChild(fill);
      row.appendChild(meta);
      row.appendChild(track);
      insightCatBars.appendChild(row);
    }

    const maxMastery = Math.max(1, ...masteryData.map((d) => d.count));
    insightMasteryBars.innerHTML = '';
    for (const item of masteryData) {
      const pct = Math.round((item.count / maxMastery) * 100);
      const row = document.createElement('div');
      row.className = 'insight-bar-row';
      const meta = document.createElement('div');
      meta.className = 'insight-bar-meta';
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.label;
      const valStrong = document.createElement('strong');
      valStrong.textContent = `${item.count} (${item.percent}%)`;
      meta.appendChild(nameSpan);
      meta.appendChild(valStrong);
      const track = document.createElement('div');
      track.className = 'insight-bar-track';
      const fill = document.createElement('div');
      fill.className = `insight-bar-fill is-${item.level}`;
      fill.style.width = `${pct}%`;
      track.appendChild(fill);
      row.appendChild(meta);
      row.appendChild(track);
      insightMasteryBars.appendChild(row);
    }
  }

  function renderEntries() {
    updateTabCounts();
    updateMasteryProgress();
    updateMasteryBadges();
    renderInsights();
    updateDailyGoalUi();
    if (isStudyMode) {
      renderStudyMode();
    }
    if (isQuizMode) {
      renderQuizMode();
    }
    const categoryTotal = allEntries.filter((e) => e.category === activeTab).length;
    const visible = getFilteredEntries();
    if (btnClearSearch) {
      btnClearSearch.hidden = !searchQuery.trim();
    }
    if (searchMeta) {
      const isFiltering = Boolean(searchQuery.trim()) || statusFilter !== 'all';
      searchMeta.hidden = !isFiltering;
      if (isFiltering) {
        searchMeta.textContent = `Showing ${visible.length} of ${categoryTotal} in ${CUETShared.CATEGORIES[activeTab]}`;
      }
    }
    entriesList.innerHTML = '';

    if (visible.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';

      const title = document.createElement('p');
      title.className = 'empty-state-title';
      title.textContent = searchQuery || statusFilter !== 'all'
        ? 'No matching entries'
        : `No ${CUETShared.CATEGORIES[activeTab].toLowerCase()} saved yet`;

      const desc = document.createElement('p');
      desc.className = 'empty-state-desc';
      desc.textContent = searchQuery || statusFilter !== 'all'
        ? 'Try clearing your search or changing the status filter.'
        : 'Select text on any article, right-click "Save to IPMAT/CUET VOCAB BUILDER", or click "Add Entries" above to start building your list.';

      empty.appendChild(title);
      empty.appendChild(desc);
      entriesList.appendChild(empty);
      return;
    }

    for (const entry of visible) {
      const mastery = CUETShared.getMasteryLevel(entry);
      const article = document.createElement('article');
      article.className = 'entry-row' + (mastery === 'mastered' ? ' is-learned' : '');

      const top = document.createElement('div');
      top.className = 'entry-top';

      const headingGroup = document.createElement('div');
      headingGroup.className = 'entry-heading-group';

      const h3 = document.createElement('h3');
      h3.className = 'entry-expression';
      h3.textContent = entry.expression;
      headingGroup.appendChild(h3);

      if (canSpeakExpression()) {
        const speakBtn = document.createElement('button');
        speakBtn.type = 'button';
        speakBtn.className = 'row-action-chip';
        speakBtn.setAttribute('aria-label', `Pronounce ${entry.expression}`);
        speakBtn.textContent = 'Listen';
        speakBtn.addEventListener('click', () => speakExpression(entry.expression));
        headingGroup.appendChild(speakBtn);
      }

      const meta = document.createElement('div');
      meta.className = 'entry-meta';

      const dateSpan = document.createElement('span');
      dateSpan.textContent = CUETShared.formatDate(entry.dateAdded);
      meta.appendChild(dateSpan);

      const sep1 = document.createElement('span');
      sep1.textContent = ' · ';
      sep1.setAttribute('aria-hidden', 'true');
      meta.appendChild(sep1);

      const statusSpan = document.createElement('span');
      statusSpan.textContent = CUETShared.MASTERY_LABELS[mastery];
      if (mastery === 'mastered') statusSpan.className = 'meta-learned';
      else if (mastery === 'learning') statusSpan.className = 'meta-learning';
      meta.appendChild(statusSpan);

      if (entry.favourite) {
        const sep2 = document.createElement('span');
        sep2.textContent = ' · ';
        sep2.setAttribute('aria-hidden', 'true');
        meta.appendChild(sep2);

        const favSpan = document.createElement('span');
        favSpan.textContent = 'Favourite';
        favSpan.className = 'meta-fav';
        meta.appendChild(favSpan);
      }

      top.appendChild(headingGroup);
      top.appendChild(meta);
      article.appendChild(top);

      // Clean study view: ONLY Meaning and Example (context sentence stays internal)
      const body = document.createElement('div');
      body.className = 'entry-body';

      const meaningP = document.createElement('p');
      meaningP.className = 'entry-line';
      const meaningStrong = document.createElement('strong');
      meaningStrong.textContent = 'Meaning: ';
      meaningP.appendChild(meaningStrong);
      meaningP.appendChild(document.createTextNode(entry.meaning));

      const exampleP = document.createElement('p');
      exampleP.className = 'entry-line';
      const exampleStrong = document.createElement('strong');
      exampleStrong.textContent = 'Example: ';
      exampleP.appendChild(exampleStrong);
      exampleP.appendChild(document.createTextNode(entry.example));

      body.appendChild(meaningP);
      body.appendChild(exampleP);
      if (entry.sourceTitle) {
        const sourceP = document.createElement('p');
        sourceP.className = 'entry-meta';
        sourceP.style.marginTop = '4px';
        const sourceStrong = document.createElement('strong');
        sourceStrong.textContent = 'Source: ';
        sourceP.appendChild(sourceStrong);
        sourceP.appendChild(document.createTextNode(entry.sourceTitle));
        body.appendChild(sourceP);
      }
      article.appendChild(body);

      // Action controls
      const actions = document.createElement('div');
      actions.className = 'entry-actions';

      const masteryGroup = document.createElement('div');
      masteryGroup.className = 'mastery-toggle';
      masteryGroup.setAttribute('role', 'group');
      masteryGroup.setAttribute('aria-label', `Mastery level for ${entry.expression}`);

      for (const level of CUETShared.VALID_MASTERY_LEVELS) {
        const levelBtn = document.createElement('button');
        levelBtn.type = 'button';
        const isCurrent = mastery === level;
        levelBtn.className = 'mastery-opt' + (isCurrent ? ` is-active is-${level}` : '');
        levelBtn.setAttribute('aria-pressed', isCurrent ? 'true' : 'false');
        levelBtn.textContent = CUETShared.MASTERY_LABELS[level];
        levelBtn.addEventListener('click', () => {
          if (mastery !== level) {
            toggleField(entry.id, 'masteryLevel', level);
          }
        });
        masteryGroup.appendChild(levelBtn);
      }

      const btnFav = document.createElement('button');
      btnFav.type = 'button';
      btnFav.className = 'row-action' + (entry.favourite ? ' is-fav' : '');
      btnFav.textContent = entry.favourite ? 'Remove Favourite' : 'Favourite';
      btnFav.addEventListener('click', () => toggleField(entry.id, 'favourite', !entry.favourite));

      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'row-action';
      btnEdit.textContent = 'Edit';
      btnEdit.addEventListener('click', () => openEditModal(entry));

      const isReanalysing = reanalysingIds.has(entry.id);
      const btnReanalyse = document.createElement('button');
      btnReanalyse.type = 'button';
      btnReanalyse.className = 'row-action';
      btnReanalyse.textContent = isReanalysing ? 'Reanalysing…' : 'Reanalyse';
      btnReanalyse.disabled = isReanalysing;
      btnReanalyse.addEventListener('click', () => reanalyseEntry(entry.id, entry.expression));

      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.className = 'row-action is-danger';
      btnDelete.textContent = 'Delete';
      btnDelete.addEventListener('click', () => {
        openConfirm({
          title: 'Delete Entry',
          message: `Remove "${entry.expression}" from THE VOCAB VAULT? This cannot be undone.`,
          confirmLabel: 'Delete Entry',
          onConfirm: () => deleteEntry(entry.id, entry.expression),
        });
      });

      const btnCopy = document.createElement('button');
      btnCopy.type = 'button';
      btnCopy.className = 'row-action' + (copiedEntryId === entry.id ? ' is-active' : '');
      btnCopy.textContent = copiedEntryId === entry.id ? 'Copied ✓' : 'Copy';
      btnCopy.setAttribute('aria-label', `Copy ${entry.expression}`);
      btnCopy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(CUETShared.formatEntryCopyText(entry));
          copiedEntryId = entry.id;
          renderEntries();
          setTimeout(() => {
            if (copiedEntryId === entry.id) {
              copiedEntryId = null;
              renderEntries();
            }
          }, 1500);
        } catch {
          showToast('Clipboard access was blocked by the browser.', 'error');
        }
      });

      actions.appendChild(masteryGroup);
      actions.appendChild(btnCopy);
      actions.appendChild(btnFav);
      actions.appendChild(btnEdit);
      actions.appendChild(btnReanalyse);
      actions.appendChild(btnDelete);
      article.appendChild(actions);

      entriesList.appendChild(article);
    }
  }

  async function loadState() {
    try {
      const res = await sendMessage({ type: 'GET_STATE' });
      if (res && res.ok) {
        allEntries = Array.isArray(res.entries) ? res.entries : [];
        hasSheetWebhook = Boolean(res.hasSheetWebhook);
        if (res.dailyGoalTarget != null) {
          dailyGoalTarget = CUETShared.clampDailyGoal(res.dailyGoalTarget);
        }
        apiKeyBanner.hidden = Boolean(res.hasApiKey);
        updateSheetSyncUi();
        renderEntries();
      }
    } catch (err) {
      showToast('Could not load library: ' + err.message, 'error');
    }
  }

  async function toggleField(id, field, value) {
    try {
      const res = await sendMessage({
        type: 'UPDATE_ENTRY',
        payload: { id, patch: { [field]: value } },
      });
      if (res && res.ok && res.entry) {
        allEntries = allEntries.map((e) => (e.id === id ? res.entry : e));
        renderEntries();
      } else {
        showToast((res && res.error) || 'Could not update entry.', 'error');
      }
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
    }
  }

  async function reanalyseEntry(id, expression) {
    reanalysingIds.add(id);
    renderEntries();
    try {
      const res = await sendMessage({
        type: 'REANALYSE_ENTRY',
        payload: { id },
      });
      if (res && res.ok && res.entry) {
        allEntries = allEntries.map((e) => (e.id === id ? res.entry : e));
        showToast(`Reanalysed "${res.entry.expression}" with Gemini.`, 'ok');
      } else {
        showToast((res && res.error) || `Could not reanalyse "${expression}".`, 'error');
      }
    } catch (err) {
      showToast('Reanalysis failed: ' + err.message, 'error');
    } finally {
      reanalysingIds.delete(id);
      renderEntries();
    }
  }

  async function deleteEntry(id, expression) {
    try {
      const res = await sendMessage({ type: 'DELETE_ENTRY', payload: { id } });
      if (res && res.ok) {
        allEntries = allEntries.filter((e) => e.id !== id);
        renderEntries();
        showToast(`Deleted "${expression}".`, 'ok');
      } else {
        showToast((res && res.error) || 'Could not delete entry.', 'error');
      }
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    }
  }

  function openEditModal(entry) {
    editId.value = entry.id;
    editExpression.value = entry.expression;
    editCategory.value = entry.category;
    editMeaning.value = entry.meaning;
    editExample.value = entry.example;
    editError.hidden = true;
    editDialog.showModal();
  }

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editId.value;
    const expr = editExpression.value.trim();
    const meaning = editMeaning.value.trim();
    const example = editExample.value.trim();
    if (!expr || !meaning || !example) {
      editError.textContent = 'Expression, meaning, and example sentence are required.';
      editError.hidden = false;
      return;
    }

    try {
      const res = await sendMessage({
        type: 'UPDATE_ENTRY',
        payload: {
          id,
          patch: {
            expression: expr,
            category: editCategory.value,
            meaning,
            example,
          },
        },
      });
      if (res && res.ok && res.entry) {
        allEntries = allEntries.map((item) => (item.id === id ? res.entry : item));
        editDialog.close();
        renderEntries();
        showToast(`Updated "${res.entry.expression}".`, 'ok');
      } else {
        editError.textContent = (res && res.error) || 'Could not save changes.';
        editError.hidden = false;
      }
    } catch (err) {
      editError.textContent = err.message;
      editError.hidden = false;
    }
  });

  btnEditClose.addEventListener('click', () => editDialog.close());
  btnEditCancel.addEventListener('click', () => editDialog.close());

  btnConfirmCancel.addEventListener('click', () => {
    pendingConfirmAction = null;
    confirmDialog.close();
  });

  btnConfirmProceed.addEventListener('click', async () => {
    const action = pendingConfirmAction;
    pendingConfirmAction = null;
    confirmDialog.close();
    if (typeof action === 'function') {
      await action();
    }
  });

  // Tab switching
  for (const btn of tabBtns) {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      for (const b of tabBtns) {
        b.setAttribute('aria-selected', b.dataset.tab === activeTab ? 'true' : 'false');
      }
      renderEntries();
    });
  }

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderEntries();
  });

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      searchQuery = '';
      searchInput.value = '';
      renderEntries();
      searchInput.focus();
    });
  }

  filterSelect.addEventListener('change', () => {
    statusFilter = filterSelect.value;
    renderEntries();
  });

  sortSelect.addEventListener('change', () => {
    sortOrder = sortSelect.value;
    renderEntries();
  });

  // Collapsible panels
  btnToggleAdd.addEventListener('click', () => {
    addPanel.hidden = !addPanel.hidden;
    if (!addPanel.hidden) {
      backupPanel.hidden = true;
      dashEntryInput.focus();
    }
  });
  btnCloseAdd.addEventListener('click', () => {
    addPanel.hidden = true;
  });

  btnToggleBackup.addEventListener('click', () => {
    backupPanel.hidden = !backupPanel.hidden;
    if (!backupPanel.hidden) addPanel.hidden = true;
  });
  btnCloseBackup.addEventListener('click', () => {
    backupPanel.hidden = true;
  });

  // Dashboard manual & bulk add
  dashAddForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const list = CUETShared.parseBulkInput(dashEntryInput.value);
    if (list.length === 0) {
      dashAddStatus.hidden = false;
      dashAddSummary.textContent = 'Enter at least one word, idiom, or phrasal verb.';
      dashAddDetails.innerHTML = '';
      return;
    }

    btnDashSave.disabled = true;
    btnDashSave.textContent = 'Analysing…';
    dashAddStatus.hidden = false;
    dashAddDetails.innerHTML = '';

    const selectedCategory = dashCategorySelect.value;
    let saved = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < list.length; i++) {
      const expr = list[i];
      const cat = selectedCategory === 'auto' ? CUETShared.detectCategory(expr) : selectedCategory;
      dashAddSummary.textContent =
        list.length === 1 ? `Analysing "${expr}"…` : `Analysing ${i + 1} of ${list.length}: "${expr}"…`;

      const li = document.createElement('li');
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
        if (res && res.ok && res.entry) {
          saved++;
          allEntries.unshift(res.entry);
          li.textContent = `Saved "${res.entry.expression}" to ${CUETShared.CATEGORIES[res.entry.category]}.`;
          renderEntries();
        } else if (res && res.duplicate) {
          skipped++;
          li.textContent = `Skipped duplicate: "${expr}".`;
        } else {
          failed++;
          li.className = 'err';
          li.textContent = `Failed "${expr}": ${(res && res.error) || 'Unknown error'}`;
        }
      } catch (err) {
        failed++;
        li.className = 'err';
        li.textContent = `Failed "${expr}": ${err.message}`;
      }
      dashAddDetails.appendChild(li);
    }

    const summaryParts = [];
    if (saved) summaryParts.push(`${saved} saved`);
    if (skipped) summaryParts.push(`${skipped} skipped (duplicate)`);
    if (failed) summaryParts.push(`${failed} failed`);
    dashAddSummary.textContent = `Completed: ${summaryParts.join(', ')}.`;

    if (saved > 0 && failed === 0) {
      dashEntryInput.value = '';
    }
    btnDashSave.disabled = false;
    btnDashSave.textContent = 'Save and Analyse';
  });

  // Export JSON (strictly excludes API key)
  btnExportJson.addEventListener('click', async () => {
    try {
      const res = await sendMessage({ type: 'EXPORT_BACKUP_JSON' });
      if (res && res.ok && res.backup) {
        const stamp = new Date().toISOString().slice(0, 10);
        triggerDownload(
          `cuet-vocab-backup-${stamp}.json`,
          JSON.stringify(res.backup, null, 2),
          'application/json'
        );
        showToast(`Exported ${res.backup.entries.length} entries as JSON backup (API key excluded).`, 'ok');
      } else {
        showToast((res && res.error) || 'Export failed.', 'error');
      }
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    }
  });

  // Import JSON (validated safe merge — never deletes/overwrites existing entries)
  btnImportJson.addEventListener('click', () => {
    importFileInput.value = '';
    importFileInput.click();
  });

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files && importFileInput.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        showToast('Could not import: this file is not valid JSON.', 'error');
        return;
      }

      const res = await sendMessage({ type: 'IMPORT_BACKUP', payload: parsed });
      if (res && res.ok) {
        await loadState();
        showToast(
          `Imported ${res.addedCount} new ${res.addedCount === 1 ? 'entry' : 'entries'} (${res.skippedCount} existing skipped safely).`,
          'ok'
        );
      } else {
        showToast((res && res.error) || 'Import failed.', 'error');
      }
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
    }
  });

  // Download CSV (Word, Meaning, Example Sentence)
  async function handleDownloadCsv() {
    if (allEntries.length === 0) {
      showToast('Your library is empty — add entries before downloading CSV.', 'error');
      return;
    }
    try {
      const res = await sendMessage({ type: 'EXPORT_CSV', payload: {} });
      if (res && res.ok) {
        const stamp = new Date().toISOString().slice(0, 10);
        triggerDownload(`cuet-vocab-${stamp}.csv`, '\uFEFF' + res.csv, 'text/csv;charset=utf-8');
        showToast(
          `Downloaded CSV with ${res.count} ${res.count === 1 ? 'entry' : 'entries'} (Word, Meaning, Example Sentence).`,
          'ok'
        );
      } else {
        showToast((res && res.error) || 'CSV download failed.', 'error');
      }
    } catch (err) {
      showToast('CSV download failed: ' + err.message, 'error');
    }
  }

  if (btnDownloadCsv) btnDownloadCsv.addEventListener('click', handleDownloadCsv);
  btnExportCsv.addEventListener('click', handleDownloadCsv);

  function updateSheetSyncUi() {
    if (btnSheetPush) {
      btnSheetPush.disabled = isSheetSyncBusy || !hasSheetWebhook;
      btnSheetPush.textContent = isSheetSyncBusy ? 'Syncing…' : 'Push to Sheet';
    }
    if (btnSheetPull) {
      btnSheetPull.disabled = isSheetSyncBusy || !hasSheetWebhook;
      btnSheetPull.textContent = isSheetSyncBusy ? 'Syncing…' : 'Pull from Sheet';
    }
    if (sheetSyncNote) {
      sheetSyncNote.hidden = false;
      sheetSyncNote.textContent = hasSheetWebhook
        ? 'Google Apps Script webhook connected — Push appends missing local entries to Google Sheets; Pull imports rows edited or added in your Sheet.'
        : 'To enable Push/Pull with Google Sheets, paste your Apps Script Web App URL (/exec) in Settings.';
    }
  }

  function updatePdfPreview() {
    if (!pdfCategorySelect || !pdfSortSelect || !pdfPreviewNote || !btnPdfConfirm) return;
    const cat = pdfCategorySelect.value;
    const counts = CUETShared.getCategoryCounts(allEntries);
    const labelMap = {
      all: `All Categories (${counts.total})`,
      vocabulary: `Words / Vocabulary (${counts.vocabulary})`,
      idioms: `Idioms (${counts.idioms})`,
      phrasalVerbs: `Phrasal Verbs (${counts.phrasalVerbs})`,
    };
    for (const opt of Array.from(pdfCategorySelect.options)) {
      if (labelMap[opt.value]) opt.textContent = labelMap[opt.value];
    }

    const plan = CUETShared.buildPdfStudySheetPlan(allEntries, {
      category: cat,
      sortOrder: pdfSortSelect.value,
    });
    if (plan.totalCount === 0) {
      pdfPreviewNote.className = 'pdf-preview-note is-empty';
      pdfPreviewNote.textContent = `No saved entries in ${plan.categoryLabel}. Choose another category or add entries first.`;
      btnPdfConfirm.disabled = true;
    } else {
      pdfPreviewNote.className = 'pdf-preview-note';
      pdfPreviewNote.textContent = `Ready to generate ${plan.categoryLabel} study sheet with ${plan.totalCount} ${plan.totalCount === 1 ? 'entry' : 'entries'}.`;
      btnPdfConfirm.disabled = false;
    }
  }

  function openPdfDialog() {
    if (!pdfDialog) return;
    if (pdfCategorySelect) {
      pdfCategorySelect.value = activeTab || 'all';
    }
    updatePdfPreview();
    pdfDialog.showModal();
  }

  if (btnDownloadPdf) btnDownloadPdf.addEventListener('click', openPdfDialog);
  if (btnExportPdf) btnExportPdf.addEventListener('click', openPdfDialog);
  if (pdfCategorySelect) pdfCategorySelect.addEventListener('change', updatePdfPreview);
  if (pdfSortSelect) pdfSortSelect.addEventListener('change', updatePdfPreview);
  if (btnPdfClose) btnPdfClose.addEventListener('click', () => pdfDialog.close());
  if (btnPdfCancel) btnPdfCancel.addEventListener('click', () => pdfDialog.close());

  if (pdfForm) {
    pdfForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        const result = CUETShared.buildPdfStudySheetBytes(allEntries, {
          category: pdfCategorySelect ? pdfCategorySelect.value : 'all',
          sortOrder: pdfSortSelect ? pdfSortSelect.value : 'az',
        });
        pdfDialog.close();
        triggerDownload(result.filename, result.bytes, 'application/pdf');
        showToast(
          `Downloaded PDF study sheet (${result.entryCount} ${result.entryCount === 1 ? 'entry' : 'entries'} in ${result.categoryLabel}).`,
          'ok'
        );
      } catch (err) {
        showToast('PDF export failed: ' + (err && err.message ? err.message : 'Unknown error'), 'error');
      }
    });
  }

  if (btnExportAnki) {
    btnExportAnki.addEventListener('click', async () => {
      if (allEntries.length === 0) {
        showToast('Your library is empty — add entries before exporting for Anki.', 'error');
        return;
      }
      try {
        const res = await sendMessage({ type: 'EXPORT_ANKI_TSV' });
        if (res && res.ok) {
          const stamp = new Date().toISOString().slice(0, 10);
          triggerDownload(`cuet-anki-${stamp}.tsv`, res.tsv, 'text/tab-separated-values;charset=utf-8');
          showToast(
            `Exported ${res.count} ${res.count === 1 ? 'card' : 'cards'} to Anki (.tsv) with Meaning, Example & mastery tags.`,
            'ok'
          );
        } else {
          showToast((res && res.error) || 'Anki export failed.', 'error');
        }
      } catch (err) {
        showToast('Anki export failed: ' + err.message, 'error');
      }
    });
  }

  if (btnSheetPush) {
    btnSheetPush.addEventListener('click', async () => {
      if (!hasSheetWebhook) {
        showToast('Add your Google Apps Script Web App URL in Settings first.', 'error');
        return;
      }
      if (allEntries.length === 0) {
        showToast('Your library is empty — nothing to push.', 'error');
        return;
      }
      isSheetSyncBusy = true;
      updateSheetSyncUi();
      try {
        const res = await sendMessage({ type: 'PUSH_TO_SHEET' });
        if (res && res.ok) {
          showToast(
            res.addedCount > 0
              ? `Pushed ${res.addedCount} new ${res.addedCount === 1 ? 'entry' : 'entries'} to Google Sheets (${res.skippedCount} already present).`
              : `All ${res.skippedCount} entries are already in Google Sheets.`,
            'ok'
          );
        } else {
          showToast((res && res.error) || 'Push to Google Sheets failed.', 'error');
        }
      } catch (err) {
        showToast('Push failed: ' + err.message, 'error');
      } finally {
        isSheetSyncBusy = false;
        updateSheetSyncUi();
      }
    });
  }

  if (btnSheetPull) {
    btnSheetPull.addEventListener('click', async () => {
      if (!hasSheetWebhook) {
        showToast('Add your Google Apps Script Web App URL in Settings first.', 'error');
        return;
      }
      isSheetSyncBusy = true;
      updateSheetSyncUi();
      try {
        const res = await sendMessage({ type: 'PULL_FROM_SHEET' });
        if (res && res.ok) {
          if (Array.isArray(res.entries)) {
            allEntries = res.entries;
            renderEntries();
          } else {
            await loadState();
          }
          showToast(
            `Pulled from Sheet: ${res.addedCount} added, ${res.updatedCount} updated (${res.unchangedCount} unchanged).`,
            'ok'
          );
        } else {
          showToast((res && res.error) || 'Pull from Google Sheets failed.', 'error');
        }
      } catch (err) {
        showToast('Pull failed: ' + err.message, 'error');
      } finally {
        isSheetSyncBusy = false;
        updateSheetSyncUi();
      }
    });
  }

  // Clear Library (requires confirmation)
  btnClearLibrary.addEventListener('click', () => {
    if (allEntries.length === 0) {
      showToast('Your library is already empty.', 'ok');
      return;
    }
    openConfirm({
      title: 'Clear Entire Library',
      message: `This will permanently delete all ${allEntries.length} saved words, idioms, and phrasal verbs from local browser storage. Your Gemini API key in Settings will stay saved. Export a JSON backup first if you want a copy.`,
      confirmLabel: 'Clear Library',
      onConfirm: async () => {
        const res = await sendMessage({ type: 'CLEAR_ALL_ENTRIES' });
        if (res && res.ok) {
          allEntries = [];
          renderEntries();
          showToast('Library cleared.', 'ok');
        } else {
          showToast((res && res.error) || 'Could not clear library.', 'error');
        }
      },
    });
  });

  // Study Mode logic
  function getActiveStudyDeck() {
    const byId = new Map(allEntries.map((e) => [e.id, e]));
    return studyDeckIds.map((id) => byId.get(id)).filter(Boolean);
  }

  function startStudySession(ids, missedOnly) {
    studyDeckIds = ids;
    studyIndex = 0;
    studyFlipped = false;
    studyKnownIds = [];
    studyNeedsReviewIds = [];
    studyComplete = false;
    studyMissedRound = Boolean(missedOnly);
    renderStudyMode();
  }

  function updateStudyDeckOptions() {
    if (!studyDeckSelect) return;
    const counts = CUETShared.getCategoryCounts(allEntries);
    const reviewCount = allEntries.filter((e) => CUETShared.getMasteryLevel(e) !== 'mastered').length;
    const labels = {
      all: `All Collections (${counts.total})`,
      needsReview: `Needs Review (${reviewCount})`,
      vocabulary: `Vocabulary (${counts.vocabulary})`,
      idioms: `Idioms (${counts.idioms})`,
      phrasalVerbs: `Phrasal Verbs (${counts.phrasalVerbs})`,
    };
    for (const opt of Array.from(studyDeckSelect.options)) {
      if (labels[opt.value]) opt.textContent = labels[opt.value];
    }
  }

  async function rateStudyCard(outcome) {
    const deck = getActiveStudyDeck();
    const card = deck[studyIndex];
    if (!card || !studyFlipped || studyComplete) return;

    const nextMastery = CUETShared.getStudyMasteryForOutcome(outcome);
    if (outcome === 'known') {
      if (!studyKnownIds.includes(card.id)) studyKnownIds.push(card.id);
    } else {
      if (!studyNeedsReviewIds.includes(card.id)) studyNeedsReviewIds.push(card.id);
    }

    if (studyIndex + 1 >= deck.length) {
      studyComplete = true;
      studyFlipped = false;
    } else {
      studyIndex++;
      studyFlipped = false;
    }

    await toggleField(card.id, 'masteryLevel', nextMastery);
  }

  function renderStudyMode() {
    if (!studyPanel || !studyStage) return;
    updateStudyDeckOptions();
    if (studyHeading) {
      studyHeading.textContent = studyMissedRound ? 'Study Mode · Missed Cards' : 'Study Mode';
    }

    const deck = getActiveStudyDeck();
    if (btnStudyShuffle) {
      btnStudyShuffle.hidden = deck.length <= 1;
    }

    studyStage.innerHTML = '';

    if (deck.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'study-empty';
      const title = document.createElement('p');
      title.className = 'empty-state-title';
      title.textContent =
        studyScope === 'needsReview'
          ? 'All saved entries are mastered'
          : 'No cards available in this deck';
      const desc = document.createElement('p');
      desc.className = 'empty-state-desc';
      desc.textContent =
        studyScope === 'needsReview'
          ? 'Switch to All Collections above to revise everything again.'
          : 'Choose another collection or add entries to your library first.';
      empty.appendChild(title);
      empty.appendChild(desc);
      if (studyScope !== 'all' && allEntries.length > 0) {
        const allBtn = document.createElement('button');
        allBtn.type = 'button';
        allBtn.className = 'primary-btn';
        allBtn.style.marginTop = '12px';
        allBtn.textContent = `Study All Collections (${allEntries.length})`;
        allBtn.addEventListener('click', () => {
          studyScope = 'all';
          if (studyDeckSelect) studyDeckSelect.value = 'all';
          startStudySession(CUETShared.buildStudyDeck(allEntries, 'all').map((e) => e.id), false);
        });
        empty.appendChild(allBtn);
      }
      studyStage.appendChild(empty);
      return;
    }

    if (studyComplete) {
      const summary = document.createElement('div');
      summary.className = 'study-summary';

      const eyebrow = document.createElement('p');
      eyebrow.className = 'study-eyebrow';
      eyebrow.textContent = 'Session Complete';

      const heading = document.createElement('h3');
      heading.className = 'study-summary-title';
      heading.textContent = `Reviewed ${deck.length} ${deck.length === 1 ? 'card' : 'cards'}`;

      const note = document.createElement('p');
      note.className = 'empty-state-desc';
      note.textContent = 'Your Mastery Levels have been updated automatically.';

      const statsRow = document.createElement('div');
      statsRow.className = 'study-stats-grid';

      const knownBox = document.createElement('div');
      knownBox.className = 'study-stat-box is-known';
      knownBox.innerHTML = `<div class="study-stat-num">${studyKnownIds.length}</div><div class="study-stat-label">Known (Mastered)</div>`;

      const reviewBox = document.createElement('div');
      reviewBox.className = 'study-stat-box is-review';
      reviewBox.innerHTML = `<div class="study-stat-num">${studyNeedsReviewIds.length}</div><div class="study-stat-label">Needs Review (Learning)</div>`;

      statsRow.appendChild(knownBox);
      statsRow.appendChild(reviewBox);

      const actionRow = document.createElement('div');
      actionRow.className = 'study-summary-actions';

      if (studyNeedsReviewIds.length > 0) {
        const missedBtn = document.createElement('button');
        missedBtn.type = 'button';
        missedBtn.className = 'accent-btn';
        missedBtn.textContent = `Review Missed Cards (${studyNeedsReviewIds.length})`;
        missedBtn.addEventListener('click', () => startStudySession([...studyNeedsReviewIds], true));
        actionRow.appendChild(missedBtn);
      }

      const againBtn = document.createElement('button');
      againBtn.type = 'button';
      againBtn.className = 'secondary-btn';
      againBtn.textContent = 'Study Again';
      againBtn.addEventListener('click', () => {
        startStudySession(CUETShared.buildStudyDeck(allEntries, studyScope).map((e) => e.id), false);
      });

      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.className = 'secondary-btn';
      backBtn.textContent = 'Back to Library';
      backBtn.addEventListener('click', () => setStudyMode(false));

      actionRow.appendChild(againBtn);
      actionRow.appendChild(backBtn);

      summary.appendChild(eyebrow);
      summary.appendChild(heading);
      summary.appendChild(note);
      summary.appendChild(statsRow);
      summary.appendChild(actionRow);
      studyStage.appendChild(summary);
      return;
    }

    const card = deck[studyIndex] || deck[0];
    const mastery = CUETShared.getMasteryLevel(card);
    const studied = studyKnownIds.length + studyNeedsReviewIds.length;
    const pct = Math.round((studied / deck.length) * 100);

    const progressMeta = document.createElement('div');
    progressMeta.className = 'study-progress-meta';
    const counterSpan = document.createElement('span');
    counterSpan.textContent = `Card ${studyIndex + 1} of ${deck.length}`;
    const talliesSpan = document.createElement('span');
    talliesSpan.textContent = `${studyKnownIds.length} known · ${studyNeedsReviewIds.length} needs review`;
    progressMeta.appendChild(counterSpan);
    progressMeta.appendChild(talliesSpan);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'study-progress-track';
    const progressFill = document.createElement('div');
    progressFill.className = 'study-progress-fill';
    progressFill.style.width = `${pct}%`;
    progressTrack.appendChild(progressFill);

    const cardScene = document.createElement('div');
    cardScene.className = 'flashcard-scene';

    const cardInner = document.createElement('div');
    cardInner.className = 'flashcard-3d-inner' + (studyFlipped ? ' is-flipped' : '');
    cardInner.id = 'study-flashcard-inner';

    function makeMetaRow() {
      const meta = document.createElement('div');
      meta.className = 'flashcard-meta';
      const catSpan = document.createElement('span');
      catSpan.textContent = `${CUETShared.CATEGORY_SINGULAR[card.category]} · ${CUETShared.CATEGORIES[card.category]}`;
      const levelSpan = document.createElement('span');
      levelSpan.textContent = CUETShared.MASTERY_LABELS[mastery];
      meta.appendChild(catSpan);
      meta.appendChild(levelSpan);
      return meta;
    }

    // Front Face
    const frontCard = document.createElement('div');
    frontCard.className = 'flashcard flashcard-face flashcard-face-front';
    frontCard.setAttribute('aria-hidden', studyFlipped ? 'true' : 'false');
    frontCard.addEventListener('click', (e) => {
      if (studyFlipped) return;
      if (e.target && e.target.closest('button')) return;
      setStudyFlippedState(true);
    });
    frontCard.appendChild(makeMetaRow());

    const front = document.createElement('div');
    front.className = 'flashcard-front';
    const exprH3 = document.createElement('h3');
    exprH3.className = 'flashcard-expression';
    exprH3.textContent = card.expression;
    const prompt = document.createElement('p');
    prompt.className = 'flashcard-hint';
    prompt.textContent = 'Recall the meaning and how to use it in a sentence.';
    const flipBtn = document.createElement('button');
    flipBtn.type = 'button';
    flipBtn.className = 'primary-btn';
    flipBtn.textContent = 'Flip Card';
    flipBtn.addEventListener('click', () => setStudyFlippedState(true));
    front.appendChild(exprH3);
    front.appendChild(prompt);
    const frontBtns = document.createElement('div');
    frontBtns.style.display = 'inline-flex';
    frontBtns.style.alignItems = 'center';
    frontBtns.style.gap = '10px';
    if (canSpeakExpression()) {
      const listenBtn = document.createElement('button');
      listenBtn.type = 'button';
      listenBtn.className = 'secondary-btn';
      listenBtn.textContent = 'Listen';
      listenBtn.addEventListener('click', () => speakExpression(card.expression));
      frontBtns.appendChild(listenBtn);
    }
    frontBtns.appendChild(flipBtn);
    front.appendChild(frontBtns);
    frontCard.appendChild(front);

    const frontFooter = document.createElement('div');
    frontFooter.className = 'flashcard-footer';
    const frontTip = document.createElement('span');
    frontTip.className = 'flashcard-tip';
    frontTip.textContent = 'Click card or press Space to flip and check your answer.';
    frontFooter.appendChild(frontTip);
    frontCard.appendChild(frontFooter);

    // Back Face
    const backCard = document.createElement('div');
    backCard.className = 'flashcard flashcard-face flashcard-face-back';
    backCard.setAttribute('aria-hidden', studyFlipped ? 'false' : 'true');
    backCard.appendChild(makeMetaRow());

    const back = document.createElement('div');
    back.className = 'flashcard-back';

    const backHead = document.createElement('div');
    backHead.className = 'flashcard-back-head';
    const backTitleWrap = document.createElement('div');
    backTitleWrap.style.display = 'flex';
    backTitleWrap.style.alignItems = 'center';
    backTitleWrap.style.gap = '10px';
    const backExprH3 = document.createElement('h3');
    backExprH3.className = 'flashcard-back-title';
    backExprH3.textContent = card.expression;
    backTitleWrap.appendChild(backExprH3);
    if (canSpeakExpression()) {
      const backListenBtn = document.createElement('button');
      backListenBtn.type = 'button';
      backListenBtn.className = 'row-action-chip';
      backListenBtn.textContent = 'Listen';
      backListenBtn.addEventListener('click', () => speakExpression(card.expression));
      backTitleWrap.appendChild(backListenBtn);
    }
    const hideBtn = document.createElement('button');
    hideBtn.type = 'button';
    hideBtn.className = 'text-btn';
    hideBtn.textContent = 'Hide Meaning';
    hideBtn.addEventListener('click', () => setStudyFlippedState(false));
    backHead.appendChild(backTitleWrap);
    backHead.appendChild(hideBtn);

    const meaningP = document.createElement('p');
    meaningP.className = 'entry-line';
    const mStrong = document.createElement('strong');
    mStrong.textContent = 'Meaning: ';
    meaningP.appendChild(mStrong);
    meaningP.appendChild(document.createTextNode(card.meaning));

    const exampleP = document.createElement('p');
    exampleP.className = 'entry-line';
    const eStrong = document.createElement('strong');
    eStrong.textContent = 'Example: ';
    exampleP.appendChild(eStrong);
    exampleP.appendChild(document.createTextNode(card.example));

    back.appendChild(backHead);
    back.appendChild(meaningP);
    back.appendChild(exampleP);
    backCard.appendChild(back);

    const backFooter = document.createElement('div');
    backFooter.className = 'flashcard-footer';
    const backTip = document.createElement('span');
    backTip.className = 'flashcard-tip';
    backTip.textContent = 'How well did you recall this?';

    const rateRow = document.createElement('div');
    rateRow.className = 'study-rate-actions';

    const reviewBtn = document.createElement('button');
    reviewBtn.type = 'button';
    reviewBtn.className = 'review-btn';
    reviewBtn.textContent = 'Needs Review';
    reviewBtn.addEventListener('click', () => rateStudyCard('needsReview'));

    const knownBtn = document.createElement('button');
    knownBtn.type = 'button';
    knownBtn.className = 'accent-btn';
    knownBtn.textContent = 'Known';
    knownBtn.addEventListener('click', () => rateStudyCard('known'));

    rateRow.appendChild(reviewBtn);
    rateRow.appendChild(knownBtn);
    backFooter.appendChild(backTip);
    backFooter.appendChild(rateRow);
    backCard.appendChild(backFooter);

    cardInner.appendChild(frontCard);
    cardInner.appendChild(backCard);
    cardScene.appendChild(cardInner);

    const shortcuts = document.createElement('p');
    shortcuts.className = 'study-shortcuts';
    shortcuts.textContent = 'Shortcuts: Space to flip · 1 Needs Review · 2 Known';

    studyStage.appendChild(progressMeta);
    studyStage.appendChild(progressTrack);
    studyStage.appendChild(cardScene);
    studyStage.appendChild(shortcuts);
  }

  function setStudyFlippedState(nextFlipped) {
    studyFlipped = Boolean(nextFlipped);
    const inner = document.getElementById('study-flashcard-inner');
    if (inner) {
      inner.classList.toggle('is-flipped', studyFlipped);
      const frontFace = inner.querySelector('.flashcard-face-front');
      const backFace = inner.querySelector('.flashcard-face-back');
      if (frontFace) frontFace.setAttribute('aria-hidden', studyFlipped ? 'true' : 'false');
      if (backFace) backFace.setAttribute('aria-hidden', studyFlipped ? 'false' : 'true');
    } else {
      renderStudyMode();
    }
  }

  function setStudyMode(enabled) {
    isStudyMode = enabled;
    if (enabled) isQuizMode = false;
    if (studyPanel) studyPanel.hidden = !enabled;
    if (quizPanel) quizPanel.hidden = true;
    if (libraryListView) libraryListView.hidden = enabled;
    if (btnStudyMode) {
      btnStudyMode.textContent = enabled ? 'Back to List' : 'Study Mode';
    }
    if (btnQuizMode) {
      btnQuizMode.textContent = 'Quiz Mode';
    }
    if (enabled) {
      addPanel.hidden = true;
      backupPanel.hidden = true;
      if (studyDeckSelect) studyDeckSelect.value = studyScope;
      startStudySession(CUETShared.buildStudyDeck(allEntries, studyScope).map((e) => e.id), false);
    }
  }

  function setQuizMode(enabled) {
    isQuizMode = enabled;
    if (enabled) isStudyMode = false;
    if (quizPanel) quizPanel.hidden = !enabled;
    if (studyPanel) studyPanel.hidden = true;
    if (libraryListView) libraryListView.hidden = enabled;
    if (btnQuizMode) {
      btnQuizMode.textContent = enabled ? 'Exit Quiz' : 'Quiz Mode';
    }
    if (btnStudyMode) {
      btnStudyMode.textContent = 'Study Mode';
    }
    if (enabled) {
      addPanel.hidden = true;
      backupPanel.hidden = true;
      quizPhase = 'setup';
      quizSetupError = '';
      quizPromoted = false;
      renderQuizMode();
    }
  }

  function renderQuizMode() {
    if (!quizPanel || !quizStage) return;
    if (btnQuizSetup) btnQuizSetup.hidden = quizPhase === 'setup';
    quizStage.innerHTML = '';

    const eligible = CUETShared.getQuizEligibleEntries(allEntries);
    const maxAllowed = Math.min(CUETShared.QUIZ_MAX_QUESTIONS, eligible.length);
    const letters = ['A', 'B', 'C', 'D'];

    if (quizPhase === 'setup') {
      if (eligible.length < CUETShared.QUIZ_MIN_QUESTIONS) {
        const empty = document.createElement('div');
        empty.className = 'study-empty';
        const title = document.createElement('p');
        title.className = 'empty-state-title';
        title.textContent = `Add at least ${CUETShared.QUIZ_MIN_QUESTIONS} New or Learning entries to take a quiz`;
        const desc = document.createElement('p');
        desc.className = 'empty-state-desc';
        desc.textContent = `You currently have ${eligible.length} eligible ${eligible.length === 1 ? 'entry' : 'entries'}.`;
        empty.appendChild(title);
        empty.appendChild(desc);
        quizStage.appendChild(empty);
        return;
      }

      quizCount = Math.max(CUETShared.QUIZ_MIN_QUESTIONS, Math.min(maxAllowed, quizCount));
      quizSelectedIds = quizSelectedIds.filter((id) => eligible.some((e) => e.id === id));

      const setupWrap = document.createElement('div');
      setupWrap.className = 'quiz-setup';

      const modeRow = document.createElement('div');
      modeRow.className = 'quiz-mode-row';
      const info = document.createElement('div');
      info.innerHTML = `<strong style="font-size:14px">Word Selection</strong><div class="study-subtitle">${eligible.length} eligible New &amp; Learning entries</div>`;

      const modeToggle = document.createElement('div');
      modeToggle.className = 'mastery-toggle';
      for (const mode of ['random', 'custom']) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mastery-opt' + (quizSelectionMode === mode ? ' is-active is-new' : '');
        b.textContent = mode === 'random' ? 'Random Words' : 'Select Words';
        b.addEventListener('click', () => {
          quizSelectionMode = mode;
          quizSetupError = '';
          renderQuizMode();
        });
        modeToggle.appendChild(b);
      }
      modeRow.appendChild(info);
      modeRow.appendChild(modeToggle);
      setupWrap.appendChild(modeRow);

      if (quizSelectionMode === 'random') {
        const box = document.createElement('div');
        box.className = 'quiz-box';
        const lblRow = document.createElement('div');
        lblRow.className = 'study-progress-meta';
        lblRow.innerHTML = `<strong style="color:var(--ink)">Number of Questions</strong><strong style="color:var(--accent)">${quizCount} questions</strong>`;
        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(CUETShared.QUIZ_MIN_QUESTIONS);
        range.max = String(maxAllowed);
        range.value = String(quizCount);
        range.style.width = '100%';
        range.addEventListener('input', () => {
          quizCount = Number(range.value);
          renderQuizMode();
        });
        box.appendChild(lblRow);
        box.appendChild(range);
        setupWrap.appendChild(box);
      } else {
        const box = document.createElement('div');
        box.className = 'quiz-box';
        const meta = document.createElement('div');
        meta.className = 'study-progress-meta';
        meta.textContent = `Selected: ${quizSelectedIds.length} / ${maxAllowed} (min ${CUETShared.QUIZ_MIN_QUESTIONS})`;
        box.appendChild(meta);

        const list = document.createElement('div');
        list.className = 'quiz-picker-list';
        for (const entry of eligible) {
          const checked = quizSelectedIds.includes(entry.id);
          const lbl = document.createElement('label');
          lbl.className = 'quiz-picker-item';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = checked;
          cb.disabled = !checked && quizSelectedIds.length >= CUETShared.QUIZ_MAX_QUESTIONS;
          cb.addEventListener('change', () => {
            if (cb.checked) {
              if (quizSelectedIds.length < CUETShared.QUIZ_MAX_QUESTIONS) {
                quizSelectedIds.push(entry.id);
              }
            } else {
              quizSelectedIds = quizSelectedIds.filter((id) => id !== entry.id);
            }
            quizSetupError = '';
            renderQuizMode();
          });
          const nameSpan = document.createElement('span');
          nameSpan.style.fontWeight = '600';
          nameSpan.textContent = entry.expression;
          const catSpan = document.createElement('span');
          catSpan.className = 'entry-meta';
          catSpan.textContent = `${CUETShared.CATEGORIES[entry.category]} · ${CUETShared.MASTERY_LABELS[CUETShared.getMasteryLevel(entry)]}`;
          const left = document.createElement('span');
          left.style.display = 'inline-flex';
          left.style.alignItems = 'center';
          left.style.gap = '8px';
          left.appendChild(cb);
          left.appendChild(nameSpan);
          lbl.appendChild(left);
          lbl.appendChild(catSpan);
          list.appendChild(lbl);
        }
        box.appendChild(list);
        setupWrap.appendChild(box);
      }

      if (quizSetupError) {
        const errP = document.createElement('p');
        errP.className = 'modal-error';
        errP.textContent = quizSetupError;
        setupWrap.appendChild(errP);
      }

      const startRow = document.createElement('div');
      startRow.style.display = 'flex';
      startRow.style.justifyContent = 'flex-end';
      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'accent-btn';
      const shownCount = quizSelectionMode === 'random' ? quizCount : quizSelectedIds.length;
      startBtn.textContent = `Start Quiz (${shownCount} questions)`;
      startBtn.addEventListener('click', () => {
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
        quizQuestions = res.questions;
        quizIndex = 0;
        quizChosenOption = null;
        quizAnswers = [];
        quizPromoted = false;
        quizPhase = 'active';
        renderQuizMode();
      });
      startRow.appendChild(startBtn);
      setupWrap.appendChild(startRow);
      quizStage.appendChild(setupWrap);
      return;
    }

    if (quizPhase === 'active' && quizQuestions[quizIndex]) {
      const q = quizQuestions[quizIndex];
      const correctCount = quizAnswers.filter((a) => a.isCorrect).length;

      const meta = document.createElement('div');
      meta.className = 'study-progress-meta';
      meta.innerHTML = `<span>Question ${quizIndex + 1} of ${quizQuestions.length}</span><span>Score: ${correctCount} / ${quizAnswers.length}</span>`;
      const track = document.createElement('div');
      track.className = 'study-progress-track';
      const fill = document.createElement('div');
      fill.className = 'study-progress-fill';
      fill.style.width = `${Math.round((quizAnswers.length / quizQuestions.length) * 100)}%`;
      track.appendChild(fill);

      const card = document.createElement('div');
      card.className = 'flashcard';

      const top = document.createElement('div');
      top.className = 'flashcard-meta';
      top.innerHTML = `<span>${CUETShared.CATEGORY_SINGULAR[q.category]} · ${CUETShared.CATEGORIES[q.category]}</span><span>${CUETShared.MASTERY_LABELS[q.masteryLevel]}</span>`;
      card.appendChild(top);

      const heading = document.createElement('h3');
      heading.className = 'flashcard-back-title';
      heading.style.fontSize = '26px';
      heading.textContent = q.expression;
      card.appendChild(heading);

      const optsWrap = document.createElement('div');
      optsWrap.className = 'quiz-options';
      q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-option';
        btn.disabled = quizChosenOption !== null;
        if (quizChosenOption !== null) {
          if (idx === q.correctIndex) btn.classList.add('is-correct');
          else if (idx === quizChosenOption) btn.classList.add('is-wrong');
        }
        btn.textContent = `${letters[idx]}. ${optText}`;
        btn.addEventListener('click', () => {
          if (quizChosenOption !== null) return;
          quizChosenOption = idx;
          quizAnswers.push({ question: q, selectedIndex: idx, isCorrect: idx === q.correctIndex });
          renderQuizMode();
        });
        optsWrap.appendChild(btn);
      });
      card.appendChild(optsWrap);

      if (quizChosenOption !== null) {
        const footer = document.createElement('div');
        footer.className = 'flashcard-footer';
        const fb = document.createElement('div');
        fb.className = 'flashcard-tip';
        const fbStatus = document.createElement('strong');
        fbStatus.style.color = quizChosenOption === q.correctIndex ? 'var(--accent)' : 'var(--danger)';
        fbStatus.textContent =
          quizChosenOption === q.correctIndex ? 'Correct!' : 'Not quite — see highlighted answer.';
        const fbExample = document.createElement('div');
        fbExample.textContent = `Example: ${q.example}`;
        fb.appendChild(fbStatus);
        fb.appendChild(fbExample);
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'primary-btn';
        nextBtn.textContent = quizIndex + 1 >= quizQuestions.length ? 'View Results' : 'Next Question';
        nextBtn.addEventListener('click', () => {
          if (quizIndex + 1 >= quizQuestions.length) {
            quizPhase = 'results';
          } else {
            quizIndex++;
            quizChosenOption = null;
          }
          renderQuizMode();
        });
        footer.appendChild(fb);
        footer.appendChild(nextBtn);
        card.appendChild(footer);
      }

      quizStage.appendChild(meta);
      quizStage.appendChild(track);
      quizStage.appendChild(card);
      return;
    }

    // Results phase
    const correct = quizAnswers.filter((a) => a.isCorrect);
    const pct = quizQuestions.length ? Math.round((correct.length / quizQuestions.length) * 100) : 0;
    const summary = document.createElement('div');
    summary.className = 'study-summary';
    summary.innerHTML = `<p class="study-eyebrow">Quiz Complete</p><h3 class="study-summary-title">${correct.length} / ${quizQuestions.length} (${pct}%)</h3>`;

    const actions = document.createElement('div');
    actions.className = 'study-summary-actions';
    actions.style.marginTop = '16px';
    if (correct.length > 0 && !quizPromoted) {
      const promoteBtn = document.createElement('button');
      promoteBtn.type = 'button';
      promoteBtn.className = 'accent-btn';
      promoteBtn.textContent = `Mark ${correct.length} Correct as Mastered`;
      promoteBtn.addEventListener('click', async () => {
        quizPromoted = true;
        for (const item of correct) {
          await toggleField(item.question.entryId, 'masteryLevel', 'mastered');
        }
        showToast(`Marked ${correct.length} entries as Mastered.`, 'ok');
        renderQuizMode();
      });
      actions.appendChild(promoteBtn);
    }
    const newBtn = document.createElement('button');
    newBtn.type = 'button';
    newBtn.className = 'secondary-btn';
    newBtn.textContent = 'New Quiz';
    newBtn.addEventListener('click', () => {
      quizPhase = 'setup';
      renderQuizMode();
    });
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'secondary-btn';
    backBtn.textContent = 'Back to Library';
    backBtn.addEventListener('click', () => setQuizMode(false));
    actions.appendChild(newBtn);
    actions.appendChild(backBtn);
    summary.appendChild(actions);
    quizStage.appendChild(summary);
  }

  function updateDailyGoalUi() {
    if (!btnDailyGoal) return;
    const stats = CUETShared.computeDailyGoalStats(allEntries, dailyGoalTarget);
    if (dailyStreakText) {
      dailyStreakText.textContent = `🔥 ${stats.streakDays}d`;
    }
    if (dailyPopSub) {
      dailyPopSub.textContent = `${stats.savedToday} of ${stats.target} words saved today`;
    }
    if (dailyPopStreak) {
      dailyPopStreak.textContent = `🔥 ${stats.streakDays} ${stats.streakDays === 1 ? 'day' : 'days'}`;
    }
    if (dailyPopFill) {
      dailyPopFill.style.width = `${stats.progressPercent}%`;
    }
    if (dailyGoalInput) {
      dailyGoalInput.value = String(stats.target);
    }

    const justReached = prevDailyGoalReached === false && stats.goalReached;
    prevDailyGoalReached = stats.goalReached;

    btnDailyGoal.classList.toggle('is-reached', stats.goalReached);
    if (justReached) {
      if (dailyCelebrateTimer) clearTimeout(dailyCelebrateTimer);
      btnDailyGoal.classList.add('is-celebrating');
      if (dailyProgressText) dailyProgressText.textContent = 'Goal Reached!';
      dailyCelebrateTimer = setTimeout(() => {
        btnDailyGoal.classList.remove('is-celebrating');
        if (dailyProgressText) {
          dailyProgressText.textContent = stats.goalReached
            ? `Goal Reached ${stats.savedToday}/${stats.target}`
            : `${stats.savedToday}/${stats.target} today`;
        }
      }, 3600);
    } else if (!btnDailyGoal.classList.contains('is-celebrating')) {
      if (dailyProgressText) {
        dailyProgressText.textContent = stats.goalReached
          ? `Goal Reached ${stats.savedToday}/${stats.target}`
          : `${stats.savedToday}/${stats.target} today`;
      }
    }
  }

  if (btnDailyGoal && dailyGoalPopover) {
    btnDailyGoal.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = dailyGoalPopover.hidden;
      dailyGoalPopover.hidden = !willOpen;
      btnDailyGoal.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (dailyGoalWrap && !dailyGoalWrap.contains(e.target)) {
        dailyGoalPopover.hidden = true;
        btnDailyGoal.setAttribute('aria-expanded', 'false');
      }
    });
  }

  if (dailyGoalForm && dailyGoalInput) {
    dailyGoalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nextTarget = CUETShared.clampDailyGoal(dailyGoalInput.value);
      dailyGoalTarget = nextTarget;
      dailyGoalPopover.hidden = true;
      btnDailyGoal.setAttribute('aria-expanded', 'false');
      updateDailyGoalUi();
      await sendMessage({ type: 'SAVE_DAILY_GOAL', payload: { target: nextTarget } }).catch(() => null);
    });
  }

  if (btnToggleInsights) {
    btnToggleInsights.addEventListener('click', () => {
      if (isStudyMode || isQuizMode) {
        setStudyMode(false);
        setQuizMode(false);
        showInsights = true;
      } else {
        showInsights = !showInsights;
      }
      renderInsights();
    });
  }
  if (btnInsightsMastered && btnInsightsAll) {
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
      btnInsightsAll.className = 'mastery-opt is-active is-new';
      btnInsightsAll.setAttribute('aria-pressed', 'true');
      btnInsightsMastered.className = 'mastery-opt';
      btnInsightsMastered.setAttribute('aria-pressed', 'false');
      renderInsights();
    });
  }

  if (btnStudyMode) {
    btnStudyMode.addEventListener('click', () => setStudyMode(!isStudyMode));
  }
  if (btnStudyExit) {
    btnStudyExit.addEventListener('click', () => setStudyMode(false));
  }
  if (btnQuizMode) {
    btnQuizMode.addEventListener('click', () => setQuizMode(!isQuizMode));
  }
  if (btnQuizExit) {
    btnQuizExit.addEventListener('click', () => setQuizMode(false));
  }
  if (btnQuizSetup) {
    btnQuizSetup.addEventListener('click', () => {
      quizPhase = 'setup';
      renderQuizMode();
    });
  }
  if (studyDeckSelect) {
    studyDeckSelect.addEventListener('change', () => {
      studyScope = studyDeckSelect.value;
      startStudySession(CUETShared.buildStudyDeck(allEntries, studyScope).map((e) => e.id), false);
    });
  }
  if (btnStudyShuffle) {
    btnStudyShuffle.addEventListener('click', () => {
      const ids = getActiveStudyDeck().map((e) => e.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      startStudySession(ids, studyMissedRound);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!isStudyMode || studyComplete) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.code === 'Space') {
      e.preventDefault();
      setStudyFlippedState(!studyFlipped);
    } else if (studyFlipped && e.key === '1') {
      e.preventDefault();
      rateStudyCard('needsReview');
    } else if (studyFlipped && e.key === '2') {
      e.preventDefault();
      rateStudyCard('known');
    }
  });

  // Sync automatically if popup or content script saves an entry while dashboard is open
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.cuet_entries) {
      allEntries = Array.isArray(changes.cuet_entries.newValue) ? changes.cuet_entries.newValue : [];
      renderEntries();
    }
  });

  loadState();
})();
