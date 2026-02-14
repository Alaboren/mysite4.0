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

  function setPane(p){
    const pane = String(p || 'L').toUpperCase();
    document.body.dataset.pane = (pane === 'R') ? 'R' : 'L';
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

  function renderCard(slotEl, slotData){
    if (!slotEl) return;

    // Render full HTML blocks (tables, etc.)
    if (slotData && typeof slotData.html === 'string'){
      slotEl.innerHTML = slotData.html;
      slotEl.dataset.title = slotData.title || '';
      return;
    }

    const labelEl = slotEl.querySelector('.label');
    const descEl = slotEl.querySelector('.desc');

    if (labelEl) labelEl.textContent = slotData.label || (slotEl.dataset.slot || '');
    if (descEl) descEl.textContent = slotData.desc || '';

    // Keep extra info for overlay (optional)
    slotEl.dataset.title = slotData.title || '';
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
        renderCard(el, slotData);
      }
    })();

    try {
      await renderInFlight;
    } finally {
      renderInFlight = null;
    }
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
      if (document.body.classList.contains('overlay-open')) return;
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
      closeOverlay();

      const f = String(btn.dataset.family || '').trim();
      if (!f) return;

      // Update state + header UI
      setFamily(f);
      if (familyEl) familyEl.textContent = f;
      updateTitleTail(f);

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


// ---------------- Mobile pane toggle (chevrons) ----------------
// Goal: BOTH chevrons toggle between L and R (spam either one).

function getPane(){
  return (document.body.dataset.pane || 'L').toUpperCase() === 'R' ? 'R' : 'L';
}

function setPane(p){
  document.body.dataset.pane = (p === 'R') ? 'R' : 'L';
}

function togglePane(){
  setPane(getPane() === 'L' ? 'R' : 'L');
}

// OPTIONAL: store last click direction for animation later
function togglePaneWithDir(dir){
  document.body.dataset.paneDir = dir; // "left" or "right" (for CSS animation later)
  togglePane();
}

// Hook buttons (update selectors to YOUR HTML)
const paneLeftBtn  = document.getElementById('paneLeftBtn')  || document.querySelector('.top-arrow.left');
const paneRightBtn = document.getElementById('paneRightBtn') || document.querySelector('.top-arrow.right');

if (paneLeftBtn){
  paneLeftBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeOverlay();
    togglePaneWithDir('left');   // direction used only for animation
  });
}

if (paneRightBtn){
  paneRightBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeOverlay();
    togglePaneWithDir('right');  // direction used only for animation
  });
}

// Ensure default pane on load (optional)
if (!document.body.dataset.pane) setPane('L');

  // ---------------- Boot ----------------
  syncFinalActiveUI();
  syncToneActiveUI();
  setPane(getPane());
  render();
})();