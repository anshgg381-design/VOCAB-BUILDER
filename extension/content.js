/* CUET Vocabulary Builder — Webpage Selection Content Script */
(function () {
  'use strict';

  if (window.__CUET_VOCAB_CONTENT_LOADED__) return;
  window.__CUET_VOCAB_CONTENT_LOADED__ = true;

  const HOST_ID = 'cuet-vocab-host';
  const MAX_WORDS = 10;
  const MAX_CHARS = 90;

  let hostEl = null;
  let shadowRoot = null;
  let uiContainer = null;

  let activeCapture = null; // { expression, category, contextSentence, sourceTitle, sourceUrl, rect }
  let panelMode = 'hidden'; // 'hidden' | 'button' | 'confirm' | 'saving' | 'result' | 'error'
  let lastResult = null;
  let lastSheetSync = null;
  let lastError = '';
  let selectionTimer = null;

  const SHADOW_STYLES = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }
    * {
      box-sizing: border-box;
    }
    .cuet-root {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 2147483647;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      color: #111827;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .cuet-trigger {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      background: #111827;
      color: #ffffff;
      border: 1px solid #1f2937;
      border-radius: 6px;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: -0.01em;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(17, 24, 39, 0.18);
      white-space: nowrap;
      transition: background 0.14s ease, transform 0.12s ease;
    }
    .cuet-trigger:hover {
      background: #1f2937;
    }
    .cuet-trigger:focus-visible {
      outline: 2px solid #0f766e;
      outline-offset: 2px;
    }
    .cuet-panel {
      width: 312px;
      max-width: calc(100vw - 24px);
      background: #ffffff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.16);
      padding: 14px 16px;
      color: #111827;
    }
    .cuet-panel-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }
    .cuet-kicker {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      margin: 0 0 2px 0;
    }
    .cuet-expression {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      word-break: break-word;
    }
    .cuet-close {
      background: transparent;
      border: none;
      color: #6b7280;
      font-size: 18px;
      line-height: 1;
      padding: 2px 4px;
      cursor: pointer;
      border-radius: 4px;
    }
    .cuet-close:hover {
      color: #111827;
      background: #f3f4f6;
    }
    .cuet-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 6px;
    }
    .cuet-cat-group {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .cuet-cat-btn {
      padding: 6px 6px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      background: #ffffff;
      color: #374151;
      cursor: pointer;
      white-space: nowrap;
      text-align: center;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
    }
    .cuet-cat-btn:hover {
      border-color: #9ca3af;
      color: #111827;
    }
    .cuet-cat-btn[aria-pressed="true"] {
      background: #0f766e;
      border-color: #0f766e;
      color: #ffffff;
      font-weight: 600;
    }
    .cuet-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }
    .cuet-btn-secondary {
      padding: 7px 12px;
      font-size: 12.5px;
      font-weight: 500;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      background: #ffffff;
      color: #374151;
      cursor: pointer;
    }
    .cuet-btn-secondary:hover {
      background: #f9fafb;
    }
    .cuet-btn-primary {
      padding: 7px 14px;
      font-size: 12.5px;
      font-weight: 600;
      border: 1px solid #111827;
      border-radius: 5px;
      background: #111827;
      color: #ffffff;
      cursor: pointer;
    }
    .cuet-btn-primary:hover {
      background: #1f2937;
    }
    .cuet-btn-primary:disabled {
      opacity: 0.6;
      cursor: wait;
    }
    .cuet-status {
      font-size: 12.5px;
      color: #374151;
      margin: 4px 0 0 0;
    }
    .cuet-result-row {
      margin: 8px 0 0 0;
      font-size: 13px;
      color: #1f2937;
    }
    .cuet-result-row strong {
      color: #111827;
      font-weight: 600;
    }
    .cuet-saved-note {
      font-size: 11.5px;
      font-weight: 600;
      color: #0f766e;
      margin: 0 0 4px 0;
    }
    .cuet-error {
      font-size: 12.5px;
      color: #b91c1c;
      margin: 4px 0 10px 0;
    }
    .cuet-link-btn {
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid #d1d5db;
      border-radius: 5px;
      background: #f9fafb;
      color: #111827;
      cursor: pointer;
    }
    .cuet-link-btn:hover {
      background: #f3f4f6;
    }
  `;

  function ensureHost() {
    if (hostEl && document.documentElement.contains(hostEl)) return;
    hostEl = document.createElement('div');
    hostEl.id = HOST_ID;
    shadowRoot = hostEl.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = SHADOW_STYLES;
    shadowRoot.appendChild(styleEl);

    uiContainer = document.createElement('div');
    uiContainer.className = 'cuet-root';
    uiContainer.style.display = 'none';
    shadowRoot.appendChild(uiContainer);

    // Keep webpage text selection intact when interacting with our floating button/panel
    uiContainer.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.documentElement.appendChild(hostEl);
  }

  function isEditableTarget(node) {
    if (!node) return false;
    const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return Boolean(el.closest && el.closest('input, textarea, [contenteditable="true"]'));
  }

  function getSurroundingBlockText(range) {
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentElement;
    }
    const blockTags = new Set(['P', 'LI', 'BLOCKQUOTE', 'DIV', 'ARTICLE', 'SECTION', 'TD', 'DD', 'H1', 'H2', 'H3', 'H4']);
    let current = container;
    while (current && current !== document.body) {
      if (blockTags.has(current.tagName) && (current.innerText || current.textContent || '').trim().length >= range.toString().length) {
        return current.innerText || current.textContent || '';
      }
      current = current.parentElement;
    }
    return container ? (container.innerText || container.textContent || '') : '';
  }

  function getValidSelectionCapture() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (isEditableTarget(range.startContainer) || isEditableTarget(range.endContainer)) {
      return null;
    }

    const rawText = sel.toString();
    const cleaned = CUETShared.normalizeExpression(rawText);
    if (!cleaned || cleaned.length < 2 || cleaned.length > MAX_CHARS) return null;
    if (!/[a-zA-Z]/.test(cleaned)) return null;

    const wordCount = cleaned.split(/\s+/).length;
    if (wordCount > MAX_WORDS) return null;

    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;

    const blockText = getSurroundingBlockText(range);
    const contextSentence = CUETShared.extractContextSentence(blockText, cleaned);
    const detectedCategory = CUETShared.detectCategory(cleaned);

    return {
      expression: cleaned,
      category: detectedCategory,
      contextSentence,
      sourceTitle: document.title || '',
      sourceUrl: window.location.href || '',
      rect: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      },
    };
  }

  function positionContainer(rect, panelWidth, panelHeight) {
    const margin = 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left + rect.width / 2 - panelWidth / 2;
    left = Math.max(margin, Math.min(left, vw - panelWidth - margin));

    let top = rect.bottom + 8;
    if (top + panelHeight > vh - margin) {
      top = Math.max(margin, rect.top - panelHeight - 8);
    }

    uiContainer.style.left = `${Math.round(left)}px`;
    uiContainer.style.top = `${Math.round(top)}px`;
  }

  function hideUI() {
    panelMode = 'hidden';
    activeCapture = null;
    lastResult = null;
    lastSheetSync = null;
    lastError = '';
    if (uiContainer) {
      uiContainer.style.display = 'none';
      uiContainer.innerHTML = '';
    }
  }

  function renderUI() {
    ensureHost();
    if (panelMode === 'hidden' || !activeCapture) {
      uiContainer.style.display = 'none';
      uiContainer.innerHTML = '';
      return;
    }

    uiContainer.style.display = 'block';
    uiContainer.innerHTML = '';

    if (panelMode === 'button') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cuet-trigger';
      btn.textContent = 'Save to CUET List';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        panelMode = 'confirm';
        renderUI();
      });
      uiContainer.appendChild(btn);
      positionContainer(activeCapture.rect, 150, 36);
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'cuet-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Save to CUET Vocabulary Builder');

    const head = document.createElement('div');
    head.className = 'cuet-panel-head';

    const titleWrap = document.createElement('div');
    const kicker = document.createElement('p');
    kicker.className = 'cuet-kicker';
    kicker.textContent = 'CUET Vocabulary Builder';

    const exprHeading = document.createElement('p');
    exprHeading.className = 'cuet-expression';
    exprHeading.textContent = activeCapture.expression;

    titleWrap.appendChild(kicker);
    titleWrap.appendChild(exprHeading);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'cuet-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => hideUI());

    head.appendChild(titleWrap);
    head.appendChild(closeBtn);
    panel.appendChild(head);

    if (panelMode === 'confirm' || panelMode === 'saving') {
      const label = document.createElement('span');
      label.className = 'cuet-label';
      label.textContent = 'Category (auto-detected — click to change)';
      panel.appendChild(label);

      const catGroup = document.createElement('div');
      catGroup.className = 'cuet-cat-group';

      const options = [
        { key: 'vocabulary', label: 'Word' },
        { key: 'idioms', label: 'Idiom' },
        { key: 'phrasalVerbs', label: 'Phrasal Verb' },
      ];

      for (const opt of options) {
        const catBtn = document.createElement('button');
        catBtn.type = 'button';
        catBtn.className = 'cuet-cat-btn';
        catBtn.textContent = opt.label;
        catBtn.setAttribute('aria-pressed', activeCapture.category === opt.key ? 'true' : 'false');
        catBtn.disabled = panelMode === 'saving';
        catBtn.addEventListener('click', () => {
          activeCapture.category = opt.key;
          renderUI();
        });
        catGroup.appendChild(catBtn);
      }
      panel.appendChild(catGroup);

      const actions = document.createElement('div');
      actions.className = 'cuet-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'cuet-btn-secondary';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.disabled = panelMode === 'saving';
      cancelBtn.addEventListener('click', () => hideUI());

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'cuet-btn-primary';
      saveBtn.textContent = panelMode === 'saving' ? 'Analysing…' : 'Save';
      saveBtn.disabled = panelMode === 'saving';
      saveBtn.addEventListener('click', () => triggerSave());

      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);
      panel.appendChild(actions);

      uiContainer.appendChild(panel);
      positionContainer(activeCapture.rect, 312, 165);
      return;
    }

    if (panelMode === 'result' && lastResult) {
      const savedNote = document.createElement('p');
      savedNote.className = 'cuet-saved-note';
      const sheetSuffix =
        lastSheetSync && lastSheetSync.synced && lastSheetSync.tabName
          ? ` · Added to Google Sheet (${lastSheetSync.tabName})`
          : '';
      savedNote.textContent = `Saved to ${CUETShared.CATEGORIES[lastResult.category] || 'Library'}${sheetSuffix}`;
      panel.appendChild(savedNote);

      if (lastSheetSync && lastSheetSync.attempted && !lastSheetSync.synced && lastSheetSync.error) {
        const warnP = document.createElement('p');
        warnP.className = 'cuet-error';
        warnP.textContent = `Google Sheet sync skipped: ${lastSheetSync.error}`;
        panel.appendChild(warnP);
      }

      const meaningRow = document.createElement('p');
      meaningRow.className = 'cuet-result-row';
      const meaningStrong = document.createElement('strong');
      meaningStrong.textContent = 'Meaning: ';
      meaningRow.appendChild(meaningStrong);
      meaningRow.appendChild(document.createTextNode(lastResult.meaning));
      panel.appendChild(meaningRow);

      const exampleRow = document.createElement('p');
      exampleRow.className = 'cuet-result-row';
      const exampleStrong = document.createElement('strong');
      exampleStrong.textContent = 'Example: ';
      exampleRow.appendChild(exampleStrong);
      exampleRow.appendChild(document.createTextNode(lastResult.example));
      panel.appendChild(exampleRow);

      const actions = document.createElement('div');
      actions.className = 'cuet-actions';
      actions.style.marginTop = '12px';

      const libBtn = document.createElement('button');
      libBtn.type = 'button';
      libBtn.className = 'cuet-link-btn';
      libBtn.textContent = 'Open Library';
      libBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });
        hideUI();
      });

      const doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.className = 'cuet-btn-primary';
      doneBtn.textContent = 'Done';
      doneBtn.addEventListener('click', () => hideUI());

      actions.appendChild(libBtn);
      actions.appendChild(doneBtn);
      panel.appendChild(actions);

      uiContainer.appendChild(panel);
      positionContainer(activeCapture.rect, 312, 210);
      return;
    }

    if (panelMode === 'error') {
      const errP = document.createElement('p');
      errP.className = 'cuet-error';
      errP.textContent = lastError || 'Could not save this expression.';
      panel.appendChild(errP);

      const actions = document.createElement('div');
      actions.className = 'cuet-actions';

      if (/api key|settings/i.test(lastError)) {
        const settingsBtn = document.createElement('button');
        settingsBtn.type = 'button';
        settingsBtn.className = 'cuet-link-btn';
        settingsBtn.textContent = 'Open Settings';
        settingsBtn.addEventListener('click', () => {
          chrome.runtime.sendMessage({ type: 'OPEN_SETTINGS' });
          hideUI();
        });
        actions.appendChild(settingsBtn);
      }

      const closeAction = document.createElement('button');
      closeAction.type = 'button';
      closeAction.className = 'cuet-btn-secondary';
      closeAction.textContent = 'Close';
      closeAction.addEventListener('click', () => hideUI());

      actions.appendChild(closeAction);
      panel.appendChild(actions);

      uiContainer.appendChild(panel);
      positionContainer(activeCapture.rect, 312, 155);
    }
  }

  function triggerSave() {
    if (!activeCapture || panelMode === 'saving') return;
    panelMode = 'saving';
    renderUI();

    chrome.runtime.sendMessage(
      {
        type: 'SAVE_AND_ANALYSE',
        payload: {
          expression: activeCapture.expression,
          category: activeCapture.category,
          contextSentence: activeCapture.contextSentence,
          sourceTitle: activeCapture.sourceTitle,
          sourceUrl: activeCapture.sourceUrl,
        },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          lastError = 'Extension connection interrupted. Please refresh the page and try again.';
          panelMode = 'error';
          renderUI();
          return;
        }
        if (response && response.ok && response.entry) {
          lastResult = response.entry;
          lastSheetSync = response.sheetSync || null;
          panelMode = 'result';
          renderUI();
        } else {
          lastError = (response && response.error) || 'Could not analyse and save this expression.';
          panelMode = 'error';
          renderUI();
        }
      }
    );
  }

  function evaluateSelection() {
    if (panelMode === 'confirm' || panelMode === 'saving' || panelMode === 'result' || panelMode === 'error') {
      return;
    }
    const capture = getValidSelectionCapture();
    if (!capture) {
      if (panelMode === 'button') hideUI();
      return;
    }
    activeCapture = capture;
    panelMode = 'button';
    renderUI();
  }

  function scheduleEvaluation() {
    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(evaluateSelection, 60);
  }

  document.addEventListener('mouseup', (e) => {
    if (hostEl && (e.target === hostEl || hostEl.contains(e.target))) return;
    scheduleEvaluation();
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') {
      hideUI();
      return;
    }
    if (e.shiftKey || e.key.startsWith('Arrow')) {
      scheduleEvaluation();
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (hostEl && (e.target === hostEl || e.composedPath().includes(hostEl))) {
      return;
    }
    if (panelMode !== 'hidden') {
      hideUI();
    }
  });

  document.addEventListener('selectionchange', () => {
    if (panelMode !== 'button') return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      hideUI();
    }
  });

  window.addEventListener(
    'scroll',
    () => {
      if (panelMode === 'button') hideUI();
    },
    { passive: true }
  );
})();
