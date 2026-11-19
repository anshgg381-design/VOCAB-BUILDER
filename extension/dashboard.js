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
  const filterSelect = document.getElementById('filter-select');
  const sortSelect = document.getElementById('sort-select');

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
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnClearLibrary = document.getElementById('btn-clear-library');

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

    if (statusFilter === 'learned') {
      list = list.filter((e) => e.learned);
    } else if (statusFilter === 'unlearned') {
      list = list.filter((e) => !e.learned);
    } else if (statusFilter === 'favourites') {
      list = list.filter((e) => e.favourite);
    }

    if (query) {
      list = list.filter((e) => {
        return (
          (e.expression || '').toLowerCase().includes(query) ||
          (e.meaning || '').toLowerCase().includes(query) ||
          (e.example || '').toLowerCase().includes(query)
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

  function renderEntries() {
    updateTabCounts();
    const visible = getFilteredEntries();
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
        : 'Select text on any article in Brave or click "Add Entries" above to start building your CUET list.';

      empty.appendChild(title);
      empty.appendChild(desc);
      entriesList.appendChild(empty);
      return;
    }

    for (const entry of visible) {
      const article = document.createElement('article');
      article.className = 'entry-row' + (entry.learned ? ' is-learned' : '');

      const top = document.createElement('div');
      top.className = 'entry-top';

      const headingGroup = document.createElement('div');
      headingGroup.className = 'entry-heading-group';

      const h3 = document.createElement('h3');
      h3.className = 'entry-expression';
      h3.textContent = entry.expression;
      headingGroup.appendChild(h3);

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
      statusSpan.textContent = entry.learned ? 'Learned' : 'Unlearned';
      if (entry.learned) statusSpan.className = 'meta-learned';
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
      article.appendChild(body);

      // Action controls
      const actions = document.createElement('div');
      actions.className = 'entry-actions';

      const btnLearned = document.createElement('button');
      btnLearned.type = 'button';
      btnLearned.className = 'row-action' + (entry.learned ? ' is-active' : '');
      btnLearned.textContent = entry.learned ? 'Mark Unlearned' : 'Mark Learned';
      btnLearned.addEventListener('click', () => toggleField(entry.id, 'learned', !entry.learned));

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
          message: `Remove "${entry.expression}" from your CUET library? This cannot be undone.`,
          confirmLabel: 'Delete Entry',
          onConfirm: () => deleteEntry(entry.id, entry.expression),
        });
      });

      actions.appendChild(btnLearned);
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
        apiKeyBanner.hidden = Boolean(res.hasApiKey);
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

  // Export CSV
  btnExportCsv.addEventListener('click', async () => {
    try {
      const res = await sendMessage({ type: 'EXPORT_CSV', payload: {} });
      if (res && res.ok) {
        const stamp = new Date().toISOString().slice(0, 10);
        triggerDownload(`cuet-vocab-${stamp}.csv`, res.csv, 'text/csv;charset=utf-8');
        showToast(`Exported ${res.count} entries as CSV.`, 'ok');
      } else {
        showToast((res && res.error) || 'CSV export failed.', 'error');
      }
    } catch (err) {
      showToast('CSV export failed: ' + err.message, 'error');
    }
  });

  // Clear Library (requires confirmation)
  btnClearLibrary.addEventListener('click', () => {
    if (allEntries.length === 0) {
      showToast('Your library is already empty.', 'ok');
      return;
    }
    openConfirm({
      title: 'Clear Entire Library',
      message: `This will permanently delete all ${allEntries.length} saved words, idioms, and phrasal verbs from Brave local storage. Your Gemini API key in Settings will stay saved. Export a JSON backup first if you want a copy.`,
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

  // Sync automatically if popup or content script saves an entry while dashboard is open
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.cuet_entries) {
      allEntries = Array.isArray(changes.cuet_entries.newValue) ? changes.cuet_entries.newValue : [];
      renderEntries();
    }
  });

  loadState();
})();
