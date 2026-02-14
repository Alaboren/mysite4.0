/* =========================================
   0. DOM + STATE
   ========================================= */
const gridElement = document.getElementById('grid');
const stackElement = document.getElementById('single-stack');
const stackMsg = document.getElementById('stack-msg');
const finishMsg = document.getElementById('finish-message');
let correctEl = document.getElementById('correct-count');
let wrongEl = document.getElementById('wrong-count');

function ensureScoreEls() {
  // If the script runs before the scoreboard exists, grab it later.
  if (!correctEl) correctEl = document.getElementById('correct-count');
  if (!wrongEl) wrongEl = document.getElementById('wrong-count');
}

function renderScore() {
  ensureScoreEls();
  if (correctEl) correctEl.textContent = String(correctCount);
  if (wrongEl) wrongEl.textContent = String(wrongCount);

  // Helpful dev signal if ids are wrong/missing
  if (!correctEl || !wrongEl) {
    console.warn('[tone-pairs] Score elements missing. Expected #correct-count and #wrong-count');
  }
}

const hidePinyinToggle = document.getElementById('hide-pinyin-toggle');
const animalsToggle = document.getElementById('animals-toggle');


const BAG_SIZE = 20; // one full “bag” cycle (there are 20 choices)

let currentIndex = -1; // -1 means game hasn't started
let correctCount = 0;
let wrongCount = 0;

function refillBagAndRestart() {
  // Shuffle full set, then loop through a fixed-size bag.
  shuffleArray(cardsData);
  // If cardsData is longer than BAG_SIZE, we still only cycle through BAG_SIZE each round.
  cardsData = cardsData.slice(0, Math.min(BAG_SIZE, cardsData.length));
  currentIndex = 0;

  // Never show “finished” UI in infinite mode
  if (finishMsg) finishMsg.style.display = 'none';
}


/* =========================================
   HELPERS (must be top-level)
   ========================================= */
function flashBody(className) {
  document.body.classList.remove('body-flash-success', 'body-flash-error');
  void document.body.offsetWidth; // Force reflow
  document.body.classList.add(className);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function updatePinyinVisibility() {
  const pinyinEl = stackElement ? stackElement.querySelector('.pinyin') : null;
  if (!pinyinEl) return;
  const hide = !!(hidePinyinToggle && hidePinyinToggle.checked);
  pinyinEl.style.display = hide ? 'none' : 'block';
}


function updateAnimalsMode() {
  if (!gridElement) return;
  const on = !!(animalsToggle && animalsToggle.checked);

  // Map tone number -> image
  const imgMap = {
    '1': 'img/first.png',
    '2': 'img/second.png',
    '3': 'img/third.png',
    '4': 'img/fourth.png'
  };

  // Replace only the tone-number spans in the grid
  const toneEls = gridElement.querySelectorAll('.tone-symbol');
  toneEls.forEach((el) => {
    const tone = el.dataset.tone;

    if (on && imgMap[tone]) {
      el.innerHTML = `<img class="tone-animal" src="${imgMap[tone]}" alt="${tone}" draggable="false">`;
    } else {
      el.textContent = tone;
    }
  });
}


/* =========================================
    1. DATA STRUCTURE
    ========================================= */
let cardsData = [];

async function loadCards() {
    try {
        const response = await fetch('cards.json');
        if (!response.ok) throw new Error('Failed to load cards.json');
        cardsData = await response.json();
        // Initialize the first bag and build the grid
        refillBagAndRestart();
        initializeGame();
    } catch (err) {
        console.error('Error loading JSON:', err);
    }
}

/* =========================================
    3. GRID BUILDER
    ========================================= */
function initializeGame() {

// Safety: ensure containers exist
  if (!gridElement || !stackElement || !stackMsg) {
    console.error('Missing required DOM elements: grid / single-stack / stack-msg');
    return;
  }

  // Clear any previous grid
  gridElement.innerHTML = '';

// 5 Rows x 6 Cols
const colHeaders = ["", "المستوية", "الصاعدة", "الصاعدة المنخضة", "الهابطة", "الساكنة"];
const rowHeaders = ["عائلة البطاريق", "عائلة الحمير", "عائلة السناجب", "عائلة الذئاب"];

for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';

        if (r === 0) {
            // Header Row
            cell.classList.add('header');
            cell.textContent = c === 0 ? "" : colHeaders[c];
            if(c === 0) cell.classList.add('hidden-cell');
        } else if (c === 0) {
            // Header Col
            cell.classList.add('header');
            cell.textContent = rowHeaders[r - 1];
        } else {
            // Data Cells
            const cellId = `${r}-${c}`;
            cell.dataset.cellId = cellId;
            
            // Show coordinate for reference with colored numbers
            const [rowTone, colTone] = cellId.split('-');
            const toneClass = (tone) => `tone-${tone}`;
            cell.innerHTML = `
                <span class="tone-pair">
                    <span class="tone-symbol ${toneClass(rowTone)}" data-tone="${rowTone}">${rowTone}</span>
                    <span class="tone-plus">+</span>
                    <span class="tone-symbol ${toneClass(colTone)}" data-tone="${colTone}">${colTone}</span>
                </span>
            `;
            
            // Drag Events
            cell.addEventListener('dragover', e => e.preventDefault());
            cell.addEventListener('drop', handleDrop);
        }
        gridElement.appendChild(cell);
    }
}

  // Apply animals mode after grid is built (in case toggle is already ON)
  updateAnimalsMode();
}

/* =========================================
    4. DECK & GAME LOGIC (Single Stack)
    ========================================= */

// Handle Stack Click
stackElement.addEventListener('click', () => {
    // Start (or resume) if there is no card currently on the stack.
    // This avoids the "stuck" state where currentIndex is already 0 (bag prepared)
    // but renderCurrentCard hasn't been called yet.
    const hasCard = !!stackElement.querySelector('.card-wrapper');
    if (!hasCard) {
        startGame();
    }
    // If a card is already present, clicking does nothing (prevents skipping)
});

function startGame() {
    // Refill if never started or if something reset the index out of range
    if (currentIndex < 0 || currentIndex >= cardsData.length) refillBagAndRestart();
    renderCurrentCard();
}

function renderCurrentCard() {
    // Hide the "Start" message
    stackMsg.style.display = 'none';
    
    // Add visual style to pile
    stackElement.classList.add('has-card');

    const cardData = cardsData[currentIndex];
    
    // Create Card Wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'card-wrapper';
    wrapper.draggable = true;
    
    // Create Inner HTML
    // Note: We add 'flipped' logic immediately so it appears face up
    wrapper.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <img class="card-logo" src="img/icon-512.png" alt="Alaboren" draggable="false" />
            </div>
            <div class="card-back">
                <div class="chinese">${cardData.hanzi}</div>
                <div class="pinyin">${cardData.pinyinPlain || cardData.pinyin}</div>
            </div>
        </div>
    `;

    // Flip on click (optional interaction)
    wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.classList.toggle('flipped');
    });
    
    // Drag Events
    wrapper.addEventListener('dragstart', (e) => {
        wrapper.classList.add('dragging');
    });
    
    wrapper.addEventListener('dragend', () => wrapper.classList.remove('dragging'));

    // Clear stack content (safety) and add new card
    // We remove any existing children except the message, but easier to just append
    const existingCard = stackElement.querySelector('.card-wrapper');
    if(existingCard) existingCard.remove();

    stackElement.appendChild(wrapper);

    // Apply pinyin visibility for the newly rendered card
    updatePinyinVisibility();

    // Auto-flip to face up after a tiny delay for effect, or immediately
    setTimeout(() => wrapper.classList.add('flipped'), 50);
}

/* =========================================
    5. DROP LOGIC (Clean Cell Behavior)
    ========================================= */
function handleDrop(e) {
    e.preventDefault();
    
    // Safety check
    if (currentIndex < 0 || currentIndex >= cardsData.length) return;

    const targetCellId = this.dataset.cellId;
    const currentCard = cardsData[currentIndex];

    // Strict Check
    if (targetCellId === currentCard.correctCell) {
        handleSuccess();
    } else {
        handleFailure();
    }
}

function handleSuccess() {
    const multiplier = (hidePinyinToggle && hidePinyinToggle.checked) ? 2 : 1;
    correctCount += multiplier;
    renderScore();
    // 1. Flash Body Green
    flashBody('body-flash-success');

    // 2. Remove Card from Stack (It disappears)
    const card = stackElement.querySelector('.card-wrapper');
    if(card) card.remove();
    
    stackElement.classList.remove('has-card');

    // 3. CLEAN CELL: We do NOT add anything to the grid cell.
    // It remains visually empty (except for the coordinate text).

    // 4. Advance Game
    currentIndex++;

    if (currentIndex < cardsData.length) {
        // Delay next card appearance slightly
        setTimeout(renderCurrentCard, 500);
    } else {
        // Bag is empty -> refill and keep going indefinitely
        refillBagAndRestart();
        setTimeout(renderCurrentCard, 500);
    }
}

function handleFailure() {
    wrongCount++;
    renderScore();

    // 1. Flash Body Red
    flashBody('body-flash-error');

    // 2. Do nothing to the card. It stays on the stack.
}


if (hidePinyinToggle) {
  hidePinyinToggle.addEventListener('change', () => {
    updatePinyinVisibility();
  });
}

if (animalsToggle) {
  animalsToggle.addEventListener('change', () => {
    updateAnimalsMode();
  });
}

// Render initial score (in case UI is already on the page)
renderScore();
loadCards();