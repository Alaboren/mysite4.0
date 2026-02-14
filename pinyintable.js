(function(){
  const cBtn = document.getElementById('C') || document.querySelector('[data-slot="C"]');
  const sky = document.getElementById('penguin-sky');
  const backdrop = document.getElementById('backdrop');
  const arrowLeft = document.getElementById('arrowLeft');
  const arrowRight = document.getElementById('arrowRight');

  const overlayCards = Array.from(document.querySelectorAll('.overlay-card'));

  // Stable slots
  const SLOTS = ['L1','L2','L3','L4','L5','C','R1','R2','R3','R4','R5'];

  function getSlotEl(slot){
    return document.querySelector(`[data-slot="${slot}"]`) || document.getElementById(slot);
  }

  // ---------------- Data store (JSON) ----------------
  let STORE = null;

  // Avoid overlapping renders
  let renderInFlight = null;

  async function loadStore(){
    if (STORE) return STORE;
    const url = 'pinyintable.json';

    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      STORE = await res.json();
      return STORE;
    } catch (err){
      console.warn('[pinyintable] Failed to load', url, err);
      STORE = { meta: { families: ['a','o','e','i','u','ü'], tones: [1,2,3,4], slots: SLOTS }, data: {} };
      return STORE;
    }
  }

  function getFamily(){
    return (document.body.dataset.family || 'a').trim();
  }

  function getTone(){
    const t = Number(document.body.dataset.tone || 1) || 1;
    return Math.min(4, Math.max(1, t));
  }

  function setTone(t){
    const tone = Math.min(4, Math.max(1, Number(t) || 1));
    document.body.dataset.tone = String(tone);
  }

  function setFamily(f){
    document.body.dataset.family = f;
  }

  // ---------------- Mobile pane (L/R) switching ----------------
  function getPane(){
    const p = (document.body.dataset.pane || 'L').toUpperCase();
    return (p === 'R') ? 'R' : 'L';
  }

  function setPane(p, dir){
    const pane = String(p || 'L').toUpperCase();

    // Left is the default state (no data-pane attribute)
    if (pane === 'R') document.body.dataset.pane = 'R';
    else document.body.removeAttribute('data-pane');

    if (dir) document.body.dataset.paneDir = dir; // used by CSS animations (optional)
  }
  // ---------------- Chevrons: switch between L and R panes (mobile) ----------------
  if (arrowLeft){
    arrowLeft.addEventListener('click', (e) => {
      e.stopPropagation();
      setPane('L');
    });
  }

  if (arrowRight){
    arrowRight.addEventListener('click', (e) => {
      e.stopPropagation();
      setPane('R');
    });
  }

  // ---------------- Swipe to switch panes (mobile only) ----------------
  (function initPaneSwipe(){
    const mqlSinglePane = window.matchMedia('(max-width: 860px)');

    const isOverlayOpen = () => document.body.classList.contains('overlay-open');

    const isScrollableX = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      const ox = style.overflowX;
      const canScroll = (ox === 'auto' || ox === 'scroll');
      return canScroll && el.scrollWidth > el.clientWidth + 2;
    };

    // If swipe starts on a horizontal scroller (like finals), don't treat it as a pane swipe.
    const shouldIgnoreStartTarget = (target) => {
      if (!target) return false;
      if (target.closest && target.closest('.finals')) return true;

      let el = target;
      while (el && el !== document.body) {
        if (isScrollableX(el)) return true;
        el = el.parentElement;
      }
      return false;
    };

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let ignore = false;

    const MIN_X = 70;   // required horizontal distance
    const MAX_Y = 45;   // max vertical drift
    const MAX_MS = 700; // max gesture duration

    function onTouchStart(e){
      if (!mqlSinglePane.matches) return;
      if (isOverlayOpen()) return;

      const t = e.touches && e.touches[0];
      if (!t) return;

      tracking = true;
      ignore = shouldIgnoreStartTarget(e.target);

      startX = t.clientX;
      startY = t.clientY;
      startT = Date.now();
    }

    function onTouchMove(e){
      if (!tracking || ignore) return;
      const t = e.touches && e.touches[0];
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // If clearly vertical, stop tracking so scroll feels normal.
      if (Math.abs(dy) > MAX_Y && Math.abs(dy) > Math.abs(dx)){
        tracking = false;
      }
    }

    function onTouchEnd(e){
      if (!tracking) return;
      tracking = false;

      if (!mqlSinglePane.matches) return;
      if (isOverlayOpen()) return;
      if (ignore) return;

      const t = (e.changedTouches && e.changedTouches[0]) || null;
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Date.now() - startT;

      if (dt > MAX_MS) return;
      if (Math.abs(dy) > MAX_Y) return;
      if (Math.abs(dx) < MIN_X) return;

      // Swipe left => show R, swipe right => show L
      if (dx < 0){
        if (getPane() !== 'R') setPane('R', 'left');
      } else {
        if (getPane() !== 'L') setPane('L', 'right');
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
  })();

  function safeSlotData(store, family, tone, slot){
    const fam = store?.data?.[family];
    const t = fam?.[String(tone)];
    const s = t?.[slot];
    if (s) return s;

    // Fallback placeholder
    if (slot === 'C'){
      return { label: `C${tone}`, title: `${family} · C · tone ${tone}`, desc: `Mode button (tone ${tone})` };
    }

    return { label: slot, title: `${family} · ${slot} · tone ${tone}`, desc: `Placeholder content for ${family}-${slot}-${tone}` };
  }

  function renderCard(slotEl, slotData, slotName){
    if (!slotEl) return;

    // Render full HTML blocks (tables, etc.)
    if (slotData && typeof slotData.html === 'string'){
      slotEl.innerHTML = slotData.html;
      slotEl.dataset.title = slotData.title || '';

      // Normalize pinyin tables to keep column sizing consistent:
      // add one extra “hint” column (hidden by default; shown for L5/R5 via CSS).
      try {
        const tables = Array.from(slotEl.querySelectorAll('table.pinyin-grid-table'));
        tables.forEach(t => ensureHintColumn(t, slotName || slotEl.dataset.slot || ''));
      } catch (_) {}

      return;
    }

    const labelEl = slotEl.querySelector('.label');
    const descEl = slotEl.querySelector('.desc');

    if (labelEl) labelEl.textContent = slotData.label || (slotEl.dataset.slot || '');
    if (descEl) descEl.textContent = slotData.desc || '';

    // Keep extra info for overlay (optional)
    slotEl.dataset.title = slotData.title || '';
  }

  function ensureHintColumn(tableEl, slot){
    if (!tableEl) return;

    const existing = tableEl.querySelector('th.hint-col, td.hint-col');

    const side = String(slot || '').toUpperCase().startsWith('R') ? 'R' : 'L';

    // Mark table so CSS can offset sticky stub and keep the hint column predictable
    tableEl.classList.add('has-hint-col');
    tableEl.dataset.hintSide = side;
    if (!tableEl.style.getPropertyValue('--hint-w')) tableEl.style.setProperty('--hint-w', '44px');

    // If the hint column already exists (e.g., baked into JSON HTML), normalize its position
    if (existing){
      const rows = Array.from(tableEl.querySelectorAll('tr'));
      rows.forEach(row => {
        const hint = row.querySelector('.hint-col');
        if (!hint) return;
        const stub = row.querySelector('th.stub');

        if (side === 'L'){
          // true outermost left
          row.insertBefore(hint, row.firstChild);
        } else {
          // R side: behave like R1–R4 (hint sits immediately next to the sticky stub)
          if (stub){
            row.insertBefore(hint, stub);
          } else {
            row.appendChild(hint);
          }
        }
      });
      return;
    }

    const rows = Array.from(tableEl.querySelectorAll('tr'));
    rows.forEach(row => {
      const isHeaderRow = row.classList.contains('pinyin-grid-top') || row.classList.contains('pinyin-grid-head');
      const stub = row.querySelector('th.stub');

      // Create appropriate cell type
      const cell = document.createElement(isHeaderRow ? 'th' : 'td');
      cell.className = 'hint-col';
      cell.setAttribute('aria-hidden', 'true');
      cell.textContent = '';

      if (side === 'L'){
        // L side: hint is true outermost left
        row.insertBefore(cell, row.firstChild);
      } else {
        // R side: behave like R1–R4 (hint sits immediately next to the sticky stub)
        if (stub){
          row.insertBefore(cell, stub);
        } else {
          row.appendChild(cell);
        }
      }
    });
  }

  async function render(){
    // If a render is already running, reuse it.
    if (renderInFlight) return renderInFlight;

    renderInFlight = (async () => {
      const store = await loadStore();
      const family = getFamily();
      const tone = getTone();

      for (const slot of SLOTS){
        const el = getSlotEl(slot);
        const slotData = safeSlotData(store, family, tone, slot);
        renderCard(el, slotData, slot);
      }

      applyColumnView();
    })();

    try {
      await renderInFlight;
    } finally {
      renderInFlight = null;
    }
  }

  // --- COLUMN CYCLING (for wide tables like i/u) ---
  const COL_SPLIT = 5;
  let colViewState = 0;

  function countDataCols() {
    const tbl = document.querySelector('.pinyin-grid-table');
    if (!tbl) return 0;
    const headRow = tbl.querySelector('thead tr.pinyin-grid-head');
    if (!headRow) return 0;
    return Array.from(headRow.children).filter(
      th => !th.classList.contains('stub') && !th.classList.contains('hint-col')
    ).length;
  }

  function applyColumnView() {
    const totalCols = countDataCols();
    const needsCycling = totalCols > COL_SPLIT;

    document.querySelectorAll('.pinyin-grid-table').forEach(tbl => {
      tbl.querySelectorAll('tr').forEach(row => {
        let dataIdx = 0;
        Array.from(row.children).forEach(cell => {
          if (cell.classList.contains('stub') || cell.classList.contains('hint-col')) {
            cell.style.display = '';
            return;
          }
          dataIdx++;
          if (!needsCycling) { cell.style.display = ''; return; }

          if (colViewState === 0) {
            cell.style.display = dataIdx <= COL_SPLIT ? '' : 'none';
          } else if (colViewState === 1) {
            cell.style.display = dataIdx > COL_SPLIT ? '' : 'none';
          } else {
            cell.style.display = '';
          }
        });
      });
    });

    updateColIndicator(needsCycling);
  }

  function updateColIndicator(needsCycling) {
    let indicator = document.getElementById('col-page-indicator');

    if (!needsCycling) {
      if (indicator) indicator.style.display = 'none';
      return;
    }

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'col-page-indicator';
      indicator.className = 'col-page-indicator';
      indicator.innerHTML =
        '<div class="col-page-bar" data-state="0"><div class="col-page-fill"></div></div>';
      document.body.appendChild(indicator);
    }

    indicator.style.display = '';
    const bar = indicator.querySelector('.col-page-bar');
    if (bar) bar.dataset.state = colViewState;
  }

  function cycleColumnView() {
    if (countDataCols() <= COL_SPLIT) return;
    colViewState = (colViewState + 1) % 3;
    applyColumnView();
  }

  // ---------------- Overlay behavior (L/R only) ----------------
  let activeOverlayCard = null;
  let overlayPlaceholder = null;

  function closeOverlay(){
    document.body.classList.remove('overlay-open');

    if (activeOverlayCard){
      activeOverlayCard.classList.remove('expanded');
    }

    if (overlayPlaceholder){
      overlayPlaceholder.remove();
      overlayPlaceholder = null;
    }

    if (activeOverlayCard){
      const descEl = activeOverlayCard.querySelector('.desc');
      if (descEl && activeOverlayCard.dataset.baseDesc){
        descEl.textContent = activeOverlayCard.dataset.baseDesc;
      }
      delete activeOverlayCard.dataset.baseDesc;
      activeOverlayCard = null;
    }

    colViewState = 0;
    render();
  }

  function openOverlay(card){
    closeOverlay();
    document.body.classList.add('overlay-open');

    overlayPlaceholder = document.createElement('div');
    overlayPlaceholder.className = 'overlay-placeholder';
    overlayPlaceholder.style.height = card.offsetHeight + 'px';
    card.insertAdjacentElement('afterend', overlayPlaceholder);

    activeOverlayCard = card;
    card.classList.add('expanded');

    const title = card.dataset.title || '';
    const descEl = card.querySelector('.desc');
    if (descEl && title){
      const base = descEl.textContent || '';
      if (!card.dataset.baseDesc) card.dataset.baseDesc = base;
      descEl.textContent = `${title} — ${base}`;
    }
  }

  overlayCards.forEach(card => {
    card.addEventListener('click', (e) => {
      if (document.body.classList.contains('overlay-open')) {
        if (card.classList.contains('expanded')) {
          e.stopPropagation();
          cycleColumnView();
        }
        return;
      }
      e.stopPropagation();
      openOverlay(card);
    });
  });

  if (backdrop){
    backdrop.addEventListener('click', closeOverlay);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });

  // ---------------- Penguins (C only) ----------------
  let penguinTimer = null;

  function spawnPenguin(src){
    if (!sky) return;

    const p = document.createElement('img');
    p.className = 'penguin';
    p.src = src;
    p.alt = '';

    const size = 110 + Math.random() * 120; // 110–230px
    p.style.width = size + 'px';

    // centered-focus vertical band
    const h = sky.clientHeight;
    const band = h * 0.55;
    const topMin = (h - band) / 2;
    const topMax = (h + band) / 2 - size;
    const t = topMin + Math.random() * Math.max(0, (topMax - topMin));
    p.style.top = Math.max(0, Math.min(h - size, t)) + 'px';

    const dur = 2600 + Math.random() * 900;
    p.style.setProperty('--dur', dur + 'ms');

    sky.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }

  function stopPenguins(){
    if (penguinTimer){
      clearInterval(penguinTimer);
      penguinTimer = null;
    }
  }

  function penguinBurstForTone(tone){
    stopPenguins();

    const toneToSrc = {
      1: 'img/first.png',
      2: 'img/second.png',
      3: 'img/third.png',
      4: 'img/fourth.png'
    };

    const src = toneToSrc[tone] || toneToSrc[1];

    let count = 0;
    const max = 9;

    spawnPenguin(src);
    count++;

    penguinTimer = setInterval(() => {
      spawnPenguin(src);
      count++;
      if (count >= max){
        stopPenguins();
      }
    }, 320);
  }

  // C click: penguin burst for CURRENT tone (no tone change)
  if (cBtn){
    cBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeOverlay();

      const tone = getTone();
      penguinBurstForTone(tone);

      // no state change, no render required — but safe to keep:
      await render();
    });
  }

  // ---------------- Finals (a o e i u ü) direct selection ----------------
  const finalBtns = Array.from(document.querySelectorAll('.final[data-family]'));

  function syncFinalActiveUI(){
    const fam = getFamily();
    finalBtns.forEach(btn => {
      btn.classList.toggle('is-active', String(btn.dataset.family) === fam);
      btn.style.cursor = 'pointer';
    });
  }

  finalBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      const f = String(btn.dataset.family || '').trim();
      if (!f) return;

      // Same wide family clicked again → cycle columns
      if (f === getFamily() && (f === 'i' || f === 'u')) {
        cycleColumnView();
        return;
      }

      closeOverlay();

      // Update state + header UI
      setFamily(f);
      if (familyEl) familyEl.textContent = f;
      updateTitleTail(f);
      colViewState = 0;

      syncFinalActiveUI();
      await render();
    });
  });

  // ---------------- Tone selection (click an animal image) ----------------
  const toneIcons = Array.from(document.querySelectorAll('.tone-icon'));

  function syncToneActiveUI(){
    const t = String(getTone());
    toneIcons.forEach(img => {
      img.classList.toggle('is-active', String(img.dataset.tone) === t);
      img.style.cursor = 'pointer';
    });
  }

  toneIcons.forEach(img => {
    img.addEventListener('click', async (e) => {
      e.stopPropagation();
      closeOverlay();

      setTone(img.dataset.tone);
      colViewState = 0;
      syncToneActiveUI();
      await render();
    });
  });

  // ---------------- Family switch (whole title) ----------------
  const titleEl = document.getElementById('familyTitle') || document.querySelector('.title');
  const familyEl = document.getElementById('familyName') || document.querySelector('.family-name');
  const familiesSeq = ['a','o','e','i','u','ü'];

  function ensureFamilyTailSpan(){
    if (!titleEl) return null;

    let tail = document.getElementById('familyTail');
    if (tail) return tail;

    tail = document.createElement('span');
    tail.id = 'familyTail';

    const famSpan = familyEl || titleEl.querySelector('.family-name');
    if (famSpan && famSpan.parentNode === titleEl){
      const nodes = Array.from(titleEl.childNodes);
      const famIdx = nodes.indexOf(famSpan);
      const after = nodes.slice(famIdx + 1);
      after.forEach(n => tail.appendChild(n));
      titleEl.appendChild(tail);
    } else {
      titleEl.appendChild(document.createTextNode(' '));
      titleEl.appendChild(tail);
    }

    return tail;
  }

  const familyTailEl = ensureFamilyTailSpan();

  function updateTitleTail(f){
    if (!familyTailEl) return;
    familyTailEl.textContent = (f === 'o') ? 'واختانها' : 'وأخواتها';
  }

  function applyFamilyUI(f){
    setFamily(f);
    if (familyEl) familyEl.textContent = f;
    updateTitleTail(f);
  }

  function nextFamily(){
    const current = getFamily();
    const idx = Math.max(0, familiesSeq.indexOf(current));
    const next = familiesSeq[(idx + 1) % familiesSeq.length];
    applyFamilyUI(next);
    colViewState = 0;
    render();
  }

  applyFamilyUI(getFamily());

  const familyClickTarget = titleEl || familyEl;
  if (familyClickTarget){
    familyClickTarget.addEventListener('click', (e) => {
      e.stopPropagation();
      nextFamily();
    });

    familyClickTarget.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        nextFamily();
      }
    });
  }



  // ---------------- Boot ----------------
  syncFinalActiveUI();
  syncToneActiveUI();
  setPane(getPane());
  render();
})();