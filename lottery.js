/* ============================================================
   Lottery / Slot Machine — Main Logic
   ============================================================ */

// ─── DATA ────────────────────────────────────────────────────

const CATEGORIES = [
    { label: "b p m f",        id: "شفوي",   img: "img/bpmf.png" },
    { label: "d t n l",        id: "لثوي",   img: "img/dtnl.png" },
    { label: "zhi chi shi ri", id: "مطبق",   img: "img/zhchshr.png" },
    { label: "j q x",          id: "غاري",   img: "img/jqx.png" },
    { label: "g k h",          id: "طبقي",   img: "img/gkh.png" },
    { label: "z c s",          id: "أسناني", img: "img/zcs.png" }
];

const TONES = [
    { label: "الأولى",  id: "¯", img: "img/first.png"  },
    { label: "الثانية", id: "ˊ", img: "img/second.png" },
    { label: "الثالثة", id: "ˇ", img: "img/third.png"  },
    { label: "الرابعة", id: "ˋ", img: "img/fourth.png" }
];

const FINALS = [
    { label: "a وأخواتها", id: "ai an ang ao",                              img: "img/a.png" },
    { label: "o وأخواتها", id: "ong ou",                                     img: "img/o.png" },
    { label: "e وأخواتها", id: "ei en eng er",                               img: "img/e.png" },
    { label: "i وأخواتها", id: "ia iao ian iang  ie in ing iong iou",        img: "img/i.png" },
    { label: "u وأخواتها", id: "ua uai uan uang  uei uen ueng uo",          img: "img/u.png" },
    { label: "ü وأخواتها", id: "üe üan ün",                                  img: "img/ü.png" }
];

const FAMILY_KEYS = ["a", "o", "e", "i", "u", "ü"];
const CATEGORY_TO_SLOT = { 0: 1, 1: 2, 2: 5, 3: 4, 4: 3, 5: 5 };

const ALLOWED_FINALS_BY_CATEGORY = {
    0: [0, 1, 2, 3, 4],       // b p m f
    1: [0, 1, 2, 3, 4, 5],    // d t n l
    2: [0, 1, 2, 4],          // zhi chi shi ri
    3: [3, 5],                 // j q x
    4: [0, 1, 2, 4],          // g k h
    5: [0, 1, 2, 4]           // z c s
};

const totalPossible = CATEGORIES.length * TONES.length * FINALS.length;


// ─── PINYIN TABLE DATA ───────────────────────────────────────

let pinyinData = null;

fetch('pinyintable.json')
    .then(r => r.json())
    .then(json => { pinyinData = json.data; })
    .catch(() => {});


// ─── SETTINGS ────────────────────────────────────────────────

const SETTINGS_KEY = 'pinyin_settings_v1';

const defaultSettings = {
    reelImages: true,
    resultImages: false,
    allowInvalidCombos: false,
    jackpotOnly: false,
    jackpotProbability: 50, // 0–100 %
    spinSpeed: 2,          // seconds — base reel spin time
    reelStopDelay: 500     // ms — stagger between each reel stopping
};

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...defaultSettings };
        return { ...defaultSettings, ...JSON.parse(raw) };
    } catch {
        return { ...defaultSettings };
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let settings = loadSettings();


// ─── STATE ───────────────────────────────────────────────────

let usedCombos = JSON.parse(localStorage.getItem('pinyin_history_v2')) || [];
let categoryBag = [];
let toneBag = [];
let finalBag = [];
const finalsBagByCategory = {};
const catBagByModeFinal = {};

let isSpinning = false;
let pendingAction = null;
let jackpotActive = false;
let spinLockUntil = 0;


// ─── DOM REFS ────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $id = (id) => document.getElementById(id);

const spinBtn        = $id('spin-btn');
const lightsRow      = $('.lights-row');
const reelsArea      = $('.reels-area');

const modal          = $id('custom-modal');
const modalTitle     = $id('modal-title');
const modalMsg       = $id('modal-msg');
const modalConfirm   = $id('modal-confirm-btn');
const modalCancel    = $id('modal-cancel-btn');

const settingsBtn    = $id('settings-btn');
const settingsOvl    = $id('settings-overlay');
const settingsClose  = $id('settings-close');

const resultOvl      = $id('result-overlay');
const resultClose    = $id('result-close');
const resultTables   = $id('result-tables');
const resultMeta     = $id('result-meta');
const resultTitle    = $id('result-title');

const jackpotOvl     = $id('jackpot-overlay');

const elRemCount     = $id('rem-count');
const elTotalCount   = $id('total-count');
const elExhausted    = $id('exhausted');
const elHistoryList  = $id('history-list');

const elValCat       = $id('val-cat');
const elValTone      = $id('val-tone');
const elValFinal     = $id('val-final');

const elSpinSpeed    = $id('setting-spin-speed');
const elSpinSpeedVal = $id('spin-speed-val');
const elReelDelay    = $id('setting-reel-delay');
const elReelDelayVal = $id('reel-delay-val');

const elJackpotEnable  = $id('setting-jackpot-enable');
const elJackpotOnly    = $id('setting-jackpot-only');
const elJackpotProb    = $id('setting-jackpot-prob');
const elJackpotProbVal = $id('jackpot-prob-val');

const resetBtn       = $id('btn-reset-from-settings');


// ─── LIGHTS ──────────────────────────────────────────────────

let lightInterval = null;
let lightPatternIndex = 0;

function initLights() {
    if (!lightsRow) return;
    lightsRow.querySelectorAll('.light').forEach((l, i) => {
        l.classList.toggle('is-on', i % 2 === 0);
    });
}

function runLights() {
    if (!lightsRow) return;

    const bulbs = Array.from(lightsRow.querySelectorAll('.light'));
    lightsRow.classList.add('running');

    const patterns = [
        // 1 — classic running chase
        () => { let idx = 0; return setInterval(() => { bulbs.forEach(b => b.classList.remove('is-on')); bulbs[idx].classList.add('is-on'); idx = (idx + 1) % bulbs.length; }, 120); },
        // 2 — ping-pong bounce
        () => { let idx = 0, dir = 1; return setInterval(() => { bulbs.forEach(b => b.classList.remove('is-on')); bulbs[idx].classList.add('is-on'); idx += dir; if (idx === bulbs.length - 1 || idx === 0) dir *= -1; }, 90); },
        // 3 — alternating flash
        () => { let t = false; return setInterval(() => { bulbs.forEach((b, i) => b.classList.toggle('is-on', (i % 2 === 0) === t)); t = !t; }, 180); },
        // 4 — random sparkle
        () => setInterval(() => { bulbs.forEach(b => b.classList.remove('is-on')); for (let i = 0, c = (Math.random() * 5 | 0) + 1; i < c; i++) bulbs[Math.random() * bulbs.length | 0].classList.add('is-on'); }, 140),
        // 5 — slow wave
        () => { let idx = 0; return setInterval(() => { bulbs.forEach((b, i) => b.classList.toggle('is-on', i <= idx)); idx = (idx + 1) % bulbs.length; }, 160); },
        // 6 — soft breathing
        () => { let on = true; return setInterval(() => { bulbs.forEach(b => b.classList.toggle('is-on', on)); on = !on; }, 600); },
        // 7 — double chase
        () => { let idx = 0; return setInterval(() => { bulbs.forEach(b => b.classList.remove('is-on')); bulbs[idx].classList.add('is-on'); bulbs[(idx + 5) % bulbs.length].classList.add('is-on'); idx = (idx + 1) % bulbs.length; }, 110); },
        // 8 — center outward
        () => { const mid = bulbs.length >> 1; let off = 0; return setInterval(() => { bulbs.forEach(b => b.classList.remove('is-on')); bulbs[(mid - off + bulbs.length) % bulbs.length].classList.add('is-on'); bulbs[(mid + off) % bulbs.length].classList.add('is-on'); off = (off + 1) % mid; }, 130); },
        // 9 — gentle cascade
        () => { let idx = 0; return setInterval(() => { bulbs.forEach((b, i) => b.classList.toggle('is-on', i >= idx)); idx = (idx + 1) % bulbs.length; }, 170); },
        // 10 — triple pulse
        () => { let step = 0; return setInterval(() => { bulbs.forEach((b, i) => b.classList.toggle('is-on', i % 3 === step)); step = (step + 1) % 3; }, 150); },
        // 11 — rolling window
        () => { let idx = 0; return setInterval(() => { bulbs.forEach((b, i) => b.classList.toggle('is-on', i >= idx && i < idx + 4)); idx = (idx + 1) % bulbs.length; }, 120); },
        // 12 — mirror pairs
        () => { let idx = 0; return setInterval(() => { bulbs.forEach(b => b.classList.remove('is-on')); bulbs[idx].classList.add('is-on'); bulbs[bulbs.length - 1 - idx].classList.add('is-on'); idx = (idx + 1) % (bulbs.length >> 1); }, 140); },
        // 13 — gentle random fade
        () => setInterval(() => { bulbs.forEach(b => b.classList.toggle('is-on', Math.random() > 0.6)); }, 220),
        // 14 — stepping blocks
        () => { let idx = 0; return setInterval(() => { bulbs.forEach((b, i) => b.classList.toggle('is-on', (i / 3 | 0) === idx)); idx = (idx + 1) % Math.ceil(bulbs.length / 3); }, 180); }
    ];

    if (lightInterval) clearInterval(lightInterval);
    lightInterval = patterns[lightPatternIndex]();
    lightPatternIndex = (lightPatternIndex + 1) % patterns.length;
}


// ─── COMBO LOGIC ─────────────────────────────────────────────

function isAllowedCategoryFinal(c, f) {
    return (ALLOWED_FINALS_BY_CATEGORY[c] || []).includes(f);
}

function getMode() {
    if (settings.jackpotOnly) return 'only';
    if (settings.allowInvalidCombos) return 'hybrid';
    return 'no';
}

function resetCatBags() {
    for (const k in catBagByModeFinal) delete catBagByModeFinal[k];
}

function buildCatListForFinal(finalIndex, mode) {
    const list = [];
    for (let c = 0; c < CATEGORIES.length; c++) {
        if (mode === 'hybrid') list.push(c);
        else if (mode === 'no') { if (isAllowedCategoryFinal(c, finalIndex)) list.push(c); }
        else { if (!isAllowedCategoryFinal(c, finalIndex)) list.push(c); }
    }
    return list;
}

function getNextCategoryForFinal(finalIndex, modeOverride) {
    const mode = modeOverride || getMode();
    const key = `${mode}|${finalIndex}`;
    if (!catBagByModeFinal[key] || catBagByModeFinal[key].length === 0) {
        catBagByModeFinal[key] = buildCatListForFinal(finalIndex, mode);
        shuffle(catBagByModeFinal[key]);
    }
    return catBagByModeFinal[key].pop();
}

function getNextFinalForCategory(catIdx) {
    const allowed = ALLOWED_FINALS_BY_CATEGORY[catIdx] || [];
    if (allowed.length === 0) return getNextFromBag(finalBag, FINALS);
    if (!finalsBagByCategory[catIdx] || finalsBagByCategory[catIdx].length === 0) {
        finalsBagByCategory[catIdx] = [...allowed];
        shuffle(finalsBagByCategory[catIdx]);
    }
    return finalsBagByCategory[catIdx].pop();
}

function getEffectiveTotalPossible() {
    const mode = getMode();
    if (mode === 'hybrid') return totalPossible;
    let pairs = 0;
    if (mode === 'no') {
        for (const k in ALLOWED_FINALS_BY_CATEGORY) pairs += (ALLOWED_FINALS_BY_CATEGORY[k] || []).length;
    } else {
        for (let c = 0; c < CATEGORIES.length; c++)
            for (let f = 0; f < FINALS.length; f++)
                if (!isAllowedCategoryFinal(c, f)) pairs++;
    }
    return pairs * TONES.length;
}

function getUsedCountForCurrentMode() {
    const mode = getMode();
    if (mode === 'hybrid') return usedCombos.length;
    let count = 0;
    for (const key of usedCombos) {
        const [c, , f] = key.split('|').map(Number);
        const allowed = isAllowedCategoryFinal(c, f);
        if (mode === 'no' ? allowed : !allowed) count++;
    }
    return count;
}


// ─── HELPERS ─────────────────────────────────────────────────

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.random() * (i + 1) | 0;
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function getNextFromBag(bag, data) {
    if (bag.length === 0) { for (let i = 0; i < data.length; i++) bag.push(i); shuffle(bag); }
    return bag.pop();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }


// ─── MODAL ───────────────────────────────────────────────────

function showModal(title, message, onConfirm) {
    if (modalTitle) modalTitle.innerText = title;
    if (modalMsg)   modalMsg.innerText = message;
    pendingAction = onConfirm;
    if (modal) modal.classList.add('active');
}

function closeModal() {
    if (modal) modal.classList.remove('active');
    pendingAction = null;
}

if (modalConfirm) modalConfirm.onclick = () => { if (pendingAction) pendingAction(); closeModal(); };
if (modalCancel)  modalCancel.onclick  = closeModal;

// Click backdrop to close modal
if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });


// ─── SETTINGS PANEL ──────────────────────────────────────────

function openSettings(tabId) {
    if (!settingsOvl) return;
    settingsOvl.classList.add('active');
    settingsOvl.setAttribute('aria-hidden', 'false');
    switchSettingsTab(tabId || 'tab-settings');
}

function closeSettings() {
    if (!settingsOvl) return;
    settingsOvl.classList.remove('active');
    settingsOvl.setAttribute('aria-hidden', 'true');
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.toggle('active', el.id === tabId);
    });
}

if (settingsBtn)   settingsBtn.addEventListener('click', () => openSettings('tab-settings'));
if (settingsClose) settingsClose.addEventListener('click', closeSettings);
if (settingsOvl)   settingsOvl.addEventListener('click', (e) => { if (e.target === settingsOvl) closeSettings(); });

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSettingsTab(btn.getAttribute('data-tab')));
});

// Spin speed slider
if (elSpinSpeed) {
    elSpinSpeed.value = settings.spinSpeed;
    if (elSpinSpeedVal) elSpinSpeedVal.textContent = settings.spinSpeed + 's';
    elSpinSpeed.addEventListener('input', () => {
        settings.spinSpeed = parseFloat(elSpinSpeed.value);
        if (elSpinSpeedVal) elSpinSpeedVal.textContent = settings.spinSpeed + 's';
        saveSettings();
    });
}

// Reel stop delay slider
if (elReelDelay) {
    elReelDelay.value = settings.reelStopDelay;
    if (elReelDelayVal) elReelDelayVal.textContent = settings.reelStopDelay + 'ms';
    elReelDelay.addEventListener('input', () => {
        settings.reelStopDelay = parseInt(elReelDelay.value, 10);
        if (elReelDelayVal) elReelDelayVal.textContent = settings.reelStopDelay + 'ms';
        saveSettings();
    });
}

// Jackpot enable toggle
if (elJackpotEnable) {
    elJackpotEnable.checked = settings.allowInvalidCombos;
    elJackpotEnable.addEventListener('change', () => {
        settings.allowInvalidCombos = elJackpotEnable.checked;
        if (!elJackpotEnable.checked) {
            settings.jackpotOnly = false;
            if (elJackpotOnly) elJackpotOnly.checked = false;
        }
        updateJackpotControlStates();
        saveSettings();
        resetCatBags();
        updateUI();
    });
}

// Jackpot only toggle
if (elJackpotOnly) {
    elJackpotOnly.checked = settings.jackpotOnly;
    elJackpotOnly.addEventListener('change', () => {
        settings.jackpotOnly = elJackpotOnly.checked;
        if (elJackpotOnly.checked) {
            settings.allowInvalidCombos = true;
            if (elJackpotEnable) elJackpotEnable.checked = true;
        }
        updateJackpotControlStates();
        saveSettings();
        resetCatBags();
        updateUI();
    });
}

// Jackpot probability slider
if (elJackpotProb) {
    elJackpotProb.value = settings.jackpotProbability;
    if (elJackpotProbVal) elJackpotProbVal.textContent = settings.jackpotProbability + '%';
    elJackpotProb.addEventListener('input', () => {
        settings.jackpotProbability = parseInt(elJackpotProb.value, 10);
        if (elJackpotProbVal) elJackpotProbVal.textContent = settings.jackpotProbability + '%';
        saveSettings();
    });
}

function updateJackpotControlStates() {
    if (elJackpotOnly) elJackpotOnly.disabled = !settings.allowInvalidCombos;
    if (elJackpotProb) elJackpotProb.disabled = !settings.allowInvalidCombos || settings.jackpotOnly;
}

updateJackpotControlStates();

// Reset button
if (resetBtn) resetBtn.onclick = confirmReset;


// ─── RESULT OVERLAY ──────────────────────────────────────────

const COL_SPLIT = 5;
let colViewState = 0;
let colTotalDataCols = 0;

function setResultOverlayOpen(open) {
    if (!resultOvl) return;
    resultOvl.classList.toggle('active', !!open);
    resultOvl.setAttribute('aria-hidden', open ? 'false' : 'true');
}

function applyColumnView() {
    if (!resultTables) return;
    const tables = resultTables.querySelectorAll('.pinyin-grid-table');
    if (tables.length === 0) return;

    const headRow = tables[0].querySelector('thead tr.pinyin-grid-head');
    if (!headRow) return;
    colTotalDataCols = headRow.querySelectorAll('th').length - 1;

    const needsCycling = colTotalDataCols > COL_SPLIT;
    const indicator = resultTables.querySelector('.col-page-indicator');
    if (indicator) indicator.style.display = needsCycling ? '' : 'none';
    updatePageIndicator();

    tables.forEach(tbl => {
        tbl.querySelectorAll('tr').forEach(row => {
            Array.from(row.children).forEach((cell, idx) => {
                if (idx === 0) { cell.style.display = ''; return; }
                if (!needsCycling) { cell.style.display = ''; return; }
                if (colViewState === 0) cell.style.display = idx <= COL_SPLIT ? '' : 'none';
                else if (colViewState === 1) cell.style.display = idx > COL_SPLIT ? '' : 'none';
                else cell.style.display = '';
            });
        });
    });
}

function updatePageIndicator() {
    const bar = resultTables?.querySelector('.col-page-bar');
    if (bar) bar.dataset.state = colViewState;
}

function cycleColumnView() {
    if (colTotalDataCols <= COL_SPLIT) return;
    colViewState = (colViewState + 1) % 3;
    applyColumnView();
}

if (resultTables) {
    resultTables.addEventListener('click', (e) => {
        if (e.target.closest('.lottery-overlay-close')) return;
        cycleColumnView();
    });
}

function updateResultOverlay(c, t, f, jackpotHit) {
    if (!resultOvl) return;

    if (resultTitle) resultTitle.textContent = jackpotHit ? 'استثناء' : 'النتيجة';

    if (resultTables) {
        const family = FAMILY_KEYS[f];
        const tone = String(t + 1);
        const slot = CATEGORY_TO_SLOT[c];

        if (pinyinData && pinyinData[family] && pinyinData[family][tone]) {
            const entry = pinyinData[family][tone];
            const lKey = `L${slot}`;
            const rKey = `R${slot}`;
            const lHtml = entry[lKey]?.html ?? '';
            const rHtml = entry[rKey]?.html ?? '';
            resultTables.innerHTML =
                `<div class="result-table-pair">` +
                    `<div class="result-table-side" data-slot="${lKey}">${lHtml}</div>` +
                    `<div class="result-table-side" data-slot="${rKey}">${rHtml}</div>` +
                `</div>` +
                `<div class="col-page-indicator">` +
                    `<div class="col-page-bar" data-state="0"><div class="col-page-fill"></div></div>` +
                `</div>`;
        } else {
            resultTables.innerHTML = '';
        }
        colViewState = 0;
        applyColumnView();
    }

    if (resultMeta) {
        const cat = CATEGORIES[c]?.label ?? '-';
        const toneLbl = TONES[t]?.label ?? '-';
        const fin = FINALS[f]?.label ?? '-';
        resultMeta.textContent = `نهايات ${fin} مع البدايات ${cat} بالنغمة ${toneLbl}`;
    }

    setResultOverlayOpen(true);
}

if (resultClose) resultClose.addEventListener('click', (e) => { e.preventDefault(); setResultOverlayOpen(false); });

// Click backdrop to close result
if (resultOvl) resultOvl.addEventListener('click', (e) => { if (e.target === resultOvl) setResultOverlayOpen(false); });


// ─── SLOT FLASH ──────────────────────────────────────────────

function flashSlots(ms) {
    if (!reelsArea) return;
    reelsArea.classList.remove('slot-flash');
    void reelsArea.offsetWidth;
    reelsArea.classList.add('slot-flash');
    clearTimeout(flashSlots._t);
    flashSlots._t = setTimeout(() => reelsArea.classList.remove('slot-flash'), ms || 1800);
}


// ─── CONFETTI ────────────────────────────────────────────────

function ensureConfettiStyles() {
    if (document.getElementById('confetti-styles')) return;
    const s = document.createElement('style');
    s.id = 'confetti-styles';
    s.textContent =
        '#confetti-layer{position:absolute;inset:0;overflow:hidden;pointer-events:none;}' +
        '.confetti-piece{position:absolute;top:-12vh;width:10px;height:16px;opacity:0.95;border-radius:3px;}' +
        '@keyframes confetti-fall{0%{transform:translateY(-10vh) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0.9}}';
    document.head.appendChild(s);
}

function burstConfetti(count) {
    ensureConfettiStyles();
    const host = jackpotOvl || document.body;
    let layer = document.getElementById('confetti-layer');
    if (!layer) { layer = document.createElement('div'); layer.id = 'confetti-layer'; host.appendChild(layer); }
    layer.innerHTML = '';

    const colors = ['#d4af37', '#bdc3c7', '#ffffff'];
    for (let i = 0; i < (count || 70); i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left = Math.random() * 100 + 'vw';
        p.style.background = colors[Math.random() * colors.length | 0];
        p.style.animation = `confetti-fall ${900 + (Math.random() * 900 | 0)}ms linear ${Math.random() * 200 | 0}ms forwards`;
        p.style.transform = `rotate(${Math.random() * 360 | 0}deg)`;
        p.style.width = `${6 + (Math.random() * 10 | 0)}px`;
        p.style.height = `${10 + (Math.random() * 16 | 0)}px`;
        layer.appendChild(p);
    }
    setTimeout(() => { if (layer) layer.innerHTML = ''; }, 2200);
}


// ─── JACKPOT ─────────────────────────────────────────────────

async function showJackpot() {
    if (!jackpotOvl) return;
    jackpotActive = true;
    spinLockUntil = Infinity;

    jackpotOvl.classList.remove('active');
    void jackpotOvl.offsetWidth;
    jackpotOvl.classList.add('active');
    jackpotOvl.setAttribute('aria-hidden', 'false');

    burstConfetti(80);

    await new Promise(resolve => {
        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            jackpotOvl.classList.remove('active');
            jackpotOvl.setAttribute('aria-hidden', 'true');
            jackpotActive = false;
            spinLockUntil = 0;
            jackpotOvl.removeEventListener('click', onClick);
            window.removeEventListener('keydown', onKey);
            resolve();
        };
        const onClick = (e) => { e.preventDefault(); close(); };
        const onKey = (e) => { if (['Space', 'Enter', 'Escape'].includes(e.code)) { e.preventDefault(); close(); } };
        jackpotOvl.addEventListener('click', onClick);
        window.addEventListener('keydown', onKey);
    });
}


// ─── UI UPDATES ──────────────────────────────────────────────

function saveData() {
    localStorage.setItem('pinyin_history_v2', JSON.stringify(usedCombos));
    updateUI();
}

function updateUI() {
    const effectiveTotal = getEffectiveTotalPossible();
    const usedCount = getUsedCountForCurrentMode();

    if (elRemCount)   elRemCount.innerText = Math.max(0, effectiveTotal - usedCount);
    if (elTotalCount) elTotalCount.innerText = effectiveTotal;

    if (elHistoryList) {
        elHistoryList.innerHTML = '';
        usedCombos.forEach((key, idx) => {
            const [c, t, f] = key.split('|').map(Number);
            const div = document.createElement('div');
            div.className = 'history-item';

            const text = document.createElement('span');
            text.className = 'history-text';
            text.innerText = `${idx + 1}. ${CATEGORIES[c].label} | ${TONES[t].label} | ${FINALS[f].label}`;

            const del = document.createElement('button');
            del.className = 'history-delete-btn';
            del.innerHTML = '&times;';
            del.title = 'حذف من السجل';
            del.onclick = () => confirmRemove(idx);

            div.appendChild(text);
            div.appendChild(del);
            elHistoryList.appendChild(div);
        });
        elHistoryList.scrollTop = elHistoryList.scrollHeight;
    }

    if (usedCount >= effectiveTotal) {
        if (elExhausted) elExhausted.style.display = '';
        if (spinBtn) spinBtn.classList.add('is-disabled');
    } else {
        if (elExhausted) elExhausted.style.display = 'none';
        if (spinBtn) spinBtn.classList.remove('is-disabled');
    }
}

function confirmRemove(index) {
    showModal(
        "حذف سجل",
        "هل أنت متأكد من حذف هذه النتيجة من السجل؟ ستتمكن من الحصول عليها مرة أخرى.",
        () => { usedCombos.splice(index, 1); saveData(); }
    );
}

function confirmReset() {
    showModal(
        "تصفير شامل",
        "تحذير: سيتم حذف جميع السجلات والبدء من الصفر. هل أنت متأكد؟",
        () => {
            usedCombos = [];
            categoryBag = [];
            toneBag = [];
            finalBag = [];
            for (const k in finalsBagByCategory) delete finalsBagByCategory[k];
            resetCatBags();
            saveData();
            if (elValCat)   elValCat.innerText = '-';
            if (elValTone)  elValTone.innerText = '-';
            if (elValFinal) elValFinal.innerText = '-';
        }
    );
}


// ─── REEL STRIPS ─────────────────────────────────────────────

function buildSymbolHTML(item, heightPx) {
    const style = `height:${heightPx}px`;
    if (settings.reelImages && item.img) {
        return `<div class="symbol" style="${style}"><img class="symbol-img" src="${item.img}" alt="${item.label}" draggable="false"></div>`;
    }
    return `<div class="symbol" style="${style}">${item.label}<div class="sub-label">${item.id}</div></div>`;
}

function setupReelStrip(stripId, dataArray, targetIndex) {
    const strip = $id(stripId);
    if (!strip) return null;

    const reelH = strip.parentElement.clientHeight;
    let html = '';

    for (let i = 0; i < 20; i++) {
        html += buildSymbolHTML(dataArray[Math.random() * dataArray.length | 0], reelH);
    }
    html += buildSymbolHTML(dataArray[targetIndex], reelH);

    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0)';
    strip.innerHTML = html;
    return strip;
}


// ─── SPIN ────────────────────────────────────────────────────

async function spin() {
    const effectiveTotal = getEffectiveTotalPossible();
    const usedCount = getUsedCountForCurrentMode();

    // Double-click prevention
    if (isSpinning) return;
    if (usedCount >= effectiveTotal) return;
    if (jackpotActive || Date.now() < spinLockUntil) return;

    isSpinning = true;
    if (spinBtn) spinBtn.classList.add('is-disabled');

    // Start lights
    runLights();

    const mode = getMode();
    let c, t, f, key;
    let found = false;

    // Try bag-based selection first
    for (let tries = 0; tries < 250 && !found; tries++) {
        f = getNextFromBag(finalBag, FINALS);
        // In hybrid mode, use probability to bias jackpot vs normal
        const pickMode = mode === 'hybrid'
            ? (Math.random() * 100 < settings.jackpotProbability ? 'only' : 'no')
            : undefined;
        c = getNextCategoryForFinal(f, pickMode);
        for (let tt = 0; tt < Math.max(8, TONES.length * 3); tt++) {
            t = getNextFromBag(toneBag, TONES);
            key = `${c}|${t}|${f}`;
            if (!usedCombos.includes(key)) { found = true; break; }
        }
    }

    // Brute-force fallback
    if (!found) {
        key = null;
        outer: for (let i = 0; i < CATEGORIES.length; i++) {
            for (let j = 0; j < TONES.length; j++) {
                for (let k = 0; k < FINALS.length; k++) {
                    const allowed = mode === 'hybrid' ? true : mode === 'no' ? isAllowedCategoryFinal(i, k) : !isAllowedCategoryFinal(i, k);
                    if (!allowed) continue;
                    const test = `${i}|${j}|${k}`;
                    if (!usedCombos.includes(test)) { c = i; t = j; f = k; key = test; found = true; break outer; }
                }
            }
        }
    }

    if (!found || !key) {
        isSpinning = false;
        if (spinBtn) spinBtn.classList.remove('is-disabled');
        return;
    }

    // Determine jackpot
    const jackpotHit = mode === 'only' ? true : mode === 'no' ? false : !isAllowedCategoryFinal(c, f);

    // Animate reels using settings
    const baseMs = settings.spinSpeed * 1000;
    const stagger = settings.reelStopDelay;

    const strips = [
        { id: 'strip-tone',  data: TONES,      target: t },
        { id: 'strip-cat',   data: CATEGORIES,  target: c },
        { id: 'strip-final', data: FINALS,      target: f }
    ];

    const anims = strips.map((s, i) => {
        const el = setupReelStrip(s.id, s.data, s.target);
        if (!el) return Promise.resolve();
        return new Promise(resolve => {
            setTimeout(() => {
                const reelH = el.parentElement.clientHeight;
                const targetY = -(el.scrollHeight - reelH);
                const dur = (baseMs + i * stagger) / 1000;
                el.style.transition = `transform ${dur}s cubic-bezier(0.15, 0, 0.15, 1)`;
                el.style.transform = `translateY(${targetY}px)`;
                setTimeout(resolve, baseMs + i * stagger);
            }, 50);
        });
    });

    await Promise.all(anims);

    flashSlots(1800);

    if (elValCat)   elValCat.innerText = CATEGORIES[c].id;
    if (elValTone)  elValTone.innerText = TONES[t].label;
    if (elValFinal) elValFinal.innerText = FINALS[f].label;

    updateResultOverlay(c, t, f, jackpotHit);

    usedCombos.push(key);
    saveData();

    if (jackpotHit) {
        flashSlots(2400);
        await showJackpot();
        await sleep(150);
    }

    isSpinning = false;
    if (spinBtn) spinBtn.classList.remove('is-disabled');
}


// ─── EVENT HANDLERS ──────────────────────────────────────────

if (spinBtn) spinBtn.addEventListener('click', spin);

window.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    if (jackpotActive || Date.now() < spinLockUntil) {
        if (e.code === 'Space') e.preventDefault();
        return;
    }

    const modalOpen    = modal && modal.classList.contains('active');
    const settingsOpen = settingsOvl && settingsOvl.classList.contains('active');

    if (e.code === 'Escape') {
        if (modalOpen) { e.preventDefault(); closeModal(); return; }
        if (settingsOpen) { e.preventDefault(); closeSettings(); return; }
        // Also close result overlay on Escape
        if (resultOvl && resultOvl.classList.contains('active')) { e.preventDefault(); setResultOverlayOpen(false); return; }
    }

    if (e.code === 'Space' && !modalOpen && !settingsOpen) {
        e.preventDefault();
        spin();
    }
});


// ─── INIT ────────────────────────────────────────────────────

initLights();
updateUI();
setResultOverlayOpen(false);
setupReelStrip('strip-cat', CATEGORIES, 0);
setupReelStrip('strip-tone', TONES, 0);
setupReelStrip('strip-final', FINALS, 0);
