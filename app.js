const STORAGE_KEY = 'carc_game';
const PLAYER_COLORS = ['#e91e8c', '#2980b9', '#2c3e50', '#f39c12', '#27ae60', '#c0392b'];
const DEFAULT_NAMES = ['Sean', 'Casey', 'Ted', 'Jim', 'Greg', 'Logan'];

// ── State ─────────────────────────────────────────────────────────────────────

let state = {
  players: [],
  events: [],
  phase: 'setup',
  nextEventId: 0,
  playerCount: 6
};

// Setup-only state: names and colors before game starts
let setupPlayers = DEFAULT_NAMES.map((name, i) => ({ name, color: PLAYER_COLORS[i] }));

let sheet = {
  open: false,
  step: 1,
  playerIds: [],
  type: null,
  details: { tiles: 2, pennants: 0, complete: true, cathedral: false, inn: false, surrounding: 0, cities: 1, points: 0 }
};

// ── Persistence ───────────────────────────────────────────────────────────────

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      // Restore setup player count indicator from saved state
      if (state.players.length) {
        state.playerCount = state.players.length;
      }
    }
  } catch (e) { /* ignore */ }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function calcScore(type, d) {
  const tiles = parseInt(d.tiles) || 0;
  const pennants = parseInt(d.pennants) || 0;
  if (type === 'city') {
    if (d.cathedral && !d.complete) return 0;
    const mult = d.cathedral ? 3 : (d.complete ? 2 : 1);
    return tiles * mult;
  }
  if (type === 'road') {
    if (d.inn && !d.complete) return 0;
    return tiles * (d.inn ? 2 : 1);
  }
  if (type === 'monastery') {
    return d.complete ? 9 : 1 + Math.min(8, parseInt(d.surrounding) || 0);
  }
  if (type === 'farm') {
    return (parseInt(d.cities) || 0) * 3;
  }
  if (type === 'pig-farm') {
    return (parseInt(d.cities) || 0) * 4;
  }
  if (type === 'other') {
    return parseInt(d.points) || 0;
  }
  return 0;
}

function playerTotal(id) {
  return state.events
    .filter(e => e.playerIds.includes(id))
    .reduce((sum, e) => sum + e.points, 0);
}

function playerById(id) {
  return state.players.find(p => p.id === id);
}

function playerName(id) {
  return playerById(id)?.name ?? '?';
}

function playerColor(id) {
  return playerById(id)?.color ?? '#999';
}

function sortedPlayers() {
  return [...state.players].sort((a, b) => playerTotal(b.id) - playerTotal(a.id));
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

function dispatch(type, payload = {}) {
  let result;
  if (type === 'START_GAME') {
    state.phase = 'playing';
    state.players = payload.players;
    state.events = [];
    state.nextEventId = 0;
  } else if (type === 'ADD_EVENT') {
    state.events.push({ id: state.nextEventId++, ...payload, timestamp: Date.now() });
  } else if (type === 'UNDO') {
    if (state.events.length) result = state.events.pop();
  } else if (type === 'END_GAME') {
    state.phase = 'ended';
  } else if (type === 'NEW_GAME') {
    state = { players: [], events: [], phase: 'setup', nextEventId: 0, playerCount: state.playerCount };
  }
  saveState();
  render();
  return result;
}

// ── Feature label ─────────────────────────────────────────────────────────────

function featureLabel(type, d) {
  const labels = { city: 'City', road: 'Road', monastery: 'Monastery', farm: 'Farm', 'pig-farm': 'Pig Farm', other: 'Other' };
  const name = labels[type] ?? type;
  const notes = [];
  if (type === 'city') {
    notes.push(`${d.tiles} tile${d.tiles != 1 ? 's' : ''}`);
    if (!d.complete) notes.push('incomplete');
    if (d.cathedral) notes.push('cathedral');
  } else if (type === 'road') {
    notes.push(`${d.tiles} tile${d.tiles != 1 ? 's' : ''}`);
    if (!d.complete) notes.push('incomplete');
    if (d.inn) notes.push('inn');
  } else if (type === 'monastery') {
    notes.push(d.complete ? 'complete' : `${d.surrounding} surrounding`);
  } else if (type === 'farm' || type === 'pig-farm') {
    notes.push(`${d.cities} ${d.cities == 1 ? 'city' : 'cities'}`);
  }
  return notes.length ? `${name} (${notes.join(', ')})` : name;
}

// ── Render: setup ─────────────────────────────────────────────────────────────

function renderSetup() {
  const count = state.playerCount || 2;

  const countBtns = [2, 3, 4, 5, 6].map(n =>
    `<button class="count-btn ${n === count ? 'active' : ''}" data-action="set-count" data-count="${n}">${n}</button>`
  ).join('');

  const rows = Array.from({ length: count }, (_, i) => {
    const p = setupPlayers[i];
    return `
      <div class="setup-player-row">
        <div class="color-dot" style="background:${p.color}"
             data-action="pick-color" data-idx="${i}"></div>
        <input class="player-name-input" type="text" value="${escHtml(p.name)}"
               placeholder="Player ${i + 1}" data-action="set-name" data-idx="${i}" maxlength="12">
      </div>`;
  }).join('');

  return `
    <div class="screen setup-screen">
      <div class="setup-hero">
        <div class="app-icon-large">🏰</div>
        <h1 class="app-title">TillyTally</h1>
        <p class="app-subtitle">Unofficial Scoring for Carcassonne</p>
      </div>
      <div class="setup-form">
        <div class="field-row">
          <span class="field-label">Players</span>
          <div class="count-buttons">${countBtns}</div>
        </div>
        <div class="player-list">${rows}</div>
        <button class="btn-primary" data-action="start-game">Start Game</button>
      </div>
    </div>`;
}

// ── Render: scoreboard ────────────────────────────────────────────────────────

function renderScoreboard() {
  const chips = state.players.map(p => `
    <div class="score-chip" style="--player-color:${p.color}">
      <div class="chip-dot"></div>
      <span class="chip-name">${escHtml(p.name)}</span>
      <span class="chip-score">${playerTotal(p.id)}</span>
    </div>`).join('');

  const hasEvents = state.events.length > 0;

  const items = [...state.events].reverse().map(e => {
    const names = e.playerIds
      .map(id => `<span style="color:${playerColor(id)};font-weight:700">${escHtml(playerName(id))}</span>`)
      .join(', ');
    const each = e.playerIds.length > 1 ? ' ea' : '';
    return `
      <div class="event-item">
        <div class="event-who">${names}</div>
        <div class="event-desc">${featureLabel(e.type, e.details)}</div>
        <div class="event-pts">+${e.points}${each}</div>
      </div>`;
  }).join('');

  const empty = !hasEvents
    ? `<div class="empty-log"><p>No scores yet.</p><p>Tap + to log an event.</p></div>`
    : '';

  return `
    <div class="screen scoreboard-screen">
      <header class="score-header">
        <div class="score-chips">${chips}</div>
        <div class="header-actions">
          <button class="btn-icon" data-action="undo" ${!hasEvents ? 'disabled' : ''}>↩</button>
          <button class="btn-text" data-action="end-game">End Game</button>
        </div>
      </header>
      <div class="event-log">${empty}${items}</div>
      <button class="fab" data-action="open-sheet">+</button>
    </div>`;
}

// ── Render: ended ─────────────────────────────────────────────────────────────

function renderEnded() {
  const ranked = sortedPlayers();
  const winner = ranked[0];
  const medals = ['🥇', '🥈', '🥉'];

  const cards = ranked.map((p, i) => {
    const total = playerTotal(p.id);
    const medal = medals[i] ?? `${i + 1}.`;
    const pEvents = state.events.filter(e => e.playerIds.includes(p.id));
    const breakdown = pEvents.map(e => `
      <div class="breakdown-item">
        <span>${featureLabel(e.type, e.details)}</span>
        <span>+${e.points}</span>
      </div>`).join('');

    return `
      <div class="ranking-card ${i === 0 ? 'winner' : ''}" style="--player-color:${p.color}">
        <div class="ranking-header">
          <span class="ranking-medal">${medal}</span>
          <div class="ranking-dot"></div>
          <span class="ranking-name">${escHtml(p.name)}</span>
          <span class="ranking-total">${total} pts</span>
        </div>
        ${breakdown ? `<details class="breakdown"><summary>Show details</summary>${breakdown}</details>` : ''}
      </div>`;
  }).join('');

  return `
    <div class="screen ended-screen">
      <header class="ended-header">
        <h1>Game Over</h1>
        <p class="winner-text">${escHtml(winner.name)} wins! 🎉</p>
      </header>
      <div class="rankings">${cards}</div>
      <div class="ended-footer">
        <button class="btn-primary" data-action="new-game">New Game</button>
      </div>
    </div>`;
}

// ── Render: sheet ─────────────────────────────────────────────────────────────

function stepper(action, value, min = 0, max = 99) {
  return `
    <div class="stepper">
      <button type="button" class="stepper-btn" data-action="${action}-dec" ${value <= min ? 'disabled' : ''}>−</button>
      <input type="number" class="stepper-val" data-action="${action}-input"
        placeholder="${value}" min="${min}" max="${max}" inputmode="numeric" pattern="[0-9]*">
      <button type="button" class="stepper-btn" data-action="${action}-inc" ${value >= max ? 'disabled' : ''}>+</button>
    </div>`;
}

function toggleBtn(action, checked, label) {
  return `
    <button type="button" class="toggle-btn ${checked ? 'on' : ''}" data-action="${action}">
      <span class="toggle-track"><span class="toggle-thumb"></span></span>
      <span>${label}</span>
    </button>`;
}

function renderSheetStep1() {
  const btns = state.players.map(p => `
    <button type="button" class="player-select-btn"
            style="--player-color:${p.color}" data-action="select-player" data-player-id="${p.id}">
      <div class="psel-dot"></div>
      <span>${escHtml(p.name)}</span>
    </button>`).join('');

  return `
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <h2 class="sheet-title">Who scored?</h2>
      <button type="button" class="btn-sheet-close" data-action="close-sheet">✕</button>
    </div>
    <div class="player-select-grid">${btns}</div>`;
}

function renderSheetStep2() {
  const types = [
    { id: 'city',      icon: '🏰', label: 'City' },
    { id: 'road',      icon: '🛣️',  label: 'Road' },
    { id: 'monastery', icon: '⛪',  label: 'Monastery' },
    { id: 'farm',      icon: '🌾',  label: 'Farm' },
    { id: 'pig-farm',  icon: '🐷',  label: 'Pig Farm' },
    { id: 'other',     icon: '✏️',  label: 'Other' },
  ];

  const btns = types.map(t => `
    <button type="button" class="type-btn" data-action="select-type" data-type="${t.id}">
      <span class="type-icon">${t.icon}</span>
      <span class="type-label">${t.label}</span>
    </button>`).join('');

  const last = state.events.length ? state.events[state.events.length - 1] : null;
  const icons = { city: '🏰', road: '🛣️', monastery: '⛪', farm: '🌾', 'pig-farm': '🐷', other: '✏️' };
  const lastBtn = last ? `
    <button type="button" class="type-btn type-btn-last" data-action="select-type-last">
      <span class="type-icon">${icons[last.type]}</span>
      <span class="type-label">Same as Last</span>
    </button>` : '';

  return `
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <button type="button" class="btn-back" data-action="sheet-back">←</button>
      <h2 class="sheet-title">Feature type</h2>
      <button type="button" class="btn-sheet-close" data-action="close-sheet">✕</button>
    </div>
    <div class="type-grid">${btns}${lastBtn}</div>`;
}

function renderSheetStep3() {
  const d = sheet.details;
  const type = sheet.type;
  let fields = '';

  if (type === 'city') {
    fields = `
      <div class="detail-row"><label>Tiles</label>${stepper('tiles', d.tiles, 1)}</div>
      <div class="toggle-row">
        ${toggleBtn('toggle-complete', d.complete, 'Complete')}
        ${toggleBtn('toggle-cathedral', d.cathedral, 'Cathedral')}
      </div>`;
  } else if (type === 'road') {
    fields = `
      <div class="detail-row"><label>Tiles</label>${stepper('tiles', d.tiles, 1)}</div>
      <div class="toggle-row">
        ${toggleBtn('toggle-complete', d.complete, 'Complete')}
        ${toggleBtn('toggle-inn', d.inn, 'Inn')}
      </div>`;
  } else if (type === 'monastery') {
    const surroundRow = !d.complete
      ? `<div class="detail-row"><label>Surrounding tiles</label>${stepper('surrounding', d.surrounding, 0, 8)}</div>`
      : '';
    fields = `
      <div class="toggle-row">${toggleBtn('toggle-complete', d.complete, 'Complete')}</div>
      ${surroundRow}`;
  } else if (type === 'farm' || type === 'pig-farm') {
    fields = `
      <div class="detail-row"><label>Completed cities</label>${stepper('cities', d.cities, 1)}</div>`;
  } else if (type === 'other') {
    fields = `
      <div class="detail-row"><label>Points</label>${stepper('points', d.points, -99)}</div>`;
  }

  const pts = calcScore(type, d);
  const each = sheet.playerIds.length > 1 ? ' each' : '';
  const showWarning = (type === 'road' && d.inn && !d.complete)
    || (type === 'city' && d.cathedral && !d.complete);
  const warning = showWarning
    ? `<div class="score-warning">0 pts — incomplete feature with ${type === 'road' ? 'inn' : 'cathedral'}</div>`
    : '';
  const icons = { city: '🏰', road: '🛣️', monastery: '⛪', farm: '🌾', 'pig-farm': '🐷', other: '✏️' };

  return `
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <button type="button" class="btn-back" data-action="sheet-back">←</button>
      <h2 class="sheet-title">${icons[type] ?? ''} ${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
      <button type="button" class="btn-sheet-close" data-action="close-sheet">✕</button>
    </div>
    <div class="detail-fields">${fields}</div>
    ${warning}
    <div class="score-preview-bar">
      <span>Score</span>
      <strong>${pts} pt${pts !== 1 ? 's' : ''}${each}</strong>
    </div>
    <button type="button" class="btn-primary btn-add-score" data-action="add-score">
      Add Score
    </button>`;
}

function renderSheet() {
  const el = document.getElementById('sheet');
  if (!el) return;
  if (sheet.step === 1) el.innerHTML = renderSheetStep1();
  else if (sheet.step === 2) el.innerHTML = renderSheetStep2();
  else if (sheet.step === 3) el.innerHTML = renderSheetStep3();
}

// ── Main render ───────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');
  if (state.phase === 'setup')   app.innerHTML = renderSetup();
  else if (state.phase === 'playing') app.innerHTML = renderScoreboard();
  else if (state.phase === 'ended')   app.innerHTML = renderEnded();
}

// ── Sheet open/close ──────────────────────────────────────────────────────────

function openSheet() {
  sheet = {
    open: true, step: 1, playerIds: [], type: null,
    details: { tiles: 2, pennants: 0, complete: true, cathedral: false, inn: false, surrounding: 0, cities: 1, points: 0 }
  };
  renderSheet();
  document.getElementById('sheet-backdrop').classList.remove('hidden');
  requestAnimationFrame(() => document.getElementById('sheet').classList.add('open'));
}

function closeSheet() {
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('sheet-backdrop').classList.add('hidden');
  sheet.open = false;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('visible'), 2500);
}

// ── Color picker ──────────────────────────────────────────────────────────────

function showColorPicker(idx) {
  document.getElementById('color-picker-popup')?.remove();

  const dots = PLAYER_COLORS.map(c => `
    <button type="button" class="color-option ${setupPlayers[idx].color === c ? 'selected' : ''}"
            style="background:${c}" data-action="apply-color" data-idx="${idx}" data-color="${c}">
    </button>`).join('');

  const popup = document.createElement('div');
  popup.id = 'color-picker-popup';
  popup.className = 'color-picker-popup';
  popup.innerHTML = dots;
  document.getElementById('app').appendChild(popup);

  const dot = document.querySelector(`[data-action="pick-color"][data-idx="${idx}"]`);
  if (dot) {
    const rect = dot.getBoundingClientRect();
    popup.style.top = (rect.bottom + 8) + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - 240) + 'px';
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Event delegation ──────────────────────────────────────────────────────────

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) {
    document.getElementById('color-picker-popup')?.remove();
    return;
  }
  const action = btn.dataset.action;

  // Setup
  if (action === 'set-count') {
    state.playerCount = parseInt(btn.dataset.count);
    render();

  } else if (action === 'pick-color') {
    showColorPicker(parseInt(btn.dataset.idx));

  } else if (action === 'apply-color') {
    setupPlayers[parseInt(btn.dataset.idx)].color = btn.dataset.color;
    document.getElementById('color-picker-popup')?.remove();
    render();

  } else if (action === 'start-game') {
    const count = state.playerCount || 2;
    const players = Array.from({ length: count }, (_, i) => {
      const input = document.querySelector(`[data-action="set-name"][data-idx="${i}"]`);
      const name = (input?.value ?? setupPlayers[i].name).trim() || DEFAULT_NAMES[i];
      setupPlayers[i].name = name;
      return { id: i, name, color: setupPlayers[i].color };
    });
    dispatch('START_GAME', { players });

  // Scoreboard
  } else if (action === 'open-sheet') {
    openSheet();

  } else if (action === 'undo') {
    const last = dispatch('UNDO');
    if (last) {
      const names = last.playerIds.map(id => playerName(id)).join(', ');
      showToast(`Undone: ${names} +${last.points}`);
    }

  } else if (action === 'end-game') {
    if (confirm('End the game and see final scores?')) dispatch('END_GAME');

  // Ended
  } else if (action === 'new-game') {
    dispatch('NEW_GAME');

  // Sheet
  } else if (action === 'close-sheet') {
    closeSheet();

  } else if (action === 'sheet-back') {
    sheet.step--;
    renderSheet();

  } else if (action === 'select-player') {
    sheet.playerIds = [parseInt(btn.dataset.playerId)];
    sheet.step = 2;
    renderSheet();

  } else if (action === 'select-type') {
    sheet.type = btn.dataset.type;
    sheet.step = 3;
    renderSheet();

  } else if (action === 'select-type-last') {
    const last = state.events[state.events.length - 1];
    if (last) {
      sheet.type = last.type;
      sheet.details = { ...last.details };
      sheet.step = 3;
      renderSheet();
    }

  // Steppers
  } else if (action === 'tiles-dec')       { sheet.details.tiles = Math.max(1, sheet.details.tiles - 1); renderSheet(); }
  else if (action === 'tiles-inc')          { sheet.details.tiles++; renderSheet(); }
  else if (action === 'pennants-dec')       { sheet.details.pennants = Math.max(0, sheet.details.pennants - 1); renderSheet(); }
  else if (action === 'pennants-inc')       { sheet.details.pennants++; renderSheet(); }
  else if (action === 'surrounding-dec')    { sheet.details.surrounding = Math.max(0, sheet.details.surrounding - 1); renderSheet(); }
  else if (action === 'surrounding-inc')    { sheet.details.surrounding = Math.min(8, sheet.details.surrounding + 1); renderSheet(); }
  else if (action === 'cities-dec')         { sheet.details.cities = Math.max(1, sheet.details.cities - 1); renderSheet(); }
  else if (action === 'cities-inc')         { sheet.details.cities++; renderSheet(); }
  else if (action === 'points-dec')         { sheet.details.points = Math.max(-99, sheet.details.points - 1); renderSheet(); }
  else if (action === 'points-inc')         { sheet.details.points++; renderSheet(); }
  else if (action === 'toggle-complete')    { sheet.details.complete = !sheet.details.complete; renderSheet(); }
  else if (action === 'toggle-cathedral')   { sheet.details.cathedral = !sheet.details.cathedral; renderSheet(); }
  else if (action === 'toggle-inn')         { sheet.details.inn = !sheet.details.inn; renderSheet(); }

  else if (action === 'add-score') {
    const pts = calcScore(sheet.type, sheet.details);
    const names = sheet.playerIds.map(id => playerName(id)).join(' & ');
    dispatch('ADD_EVENT', {
      playerIds: [...sheet.playerIds],
      type: sheet.type,
      points: pts,
      details: { ...sheet.details }
    });
    closeSheet();
    showToast(`${names} scored ${pts} pt${pts !== 1 ? 's' : ''}`);
  }
});

// Player name updates without re-render (preserve focus)
document.addEventListener('input', e => {
  const input = e.target.closest('[data-action="set-name"]');
  if (input) setupPlayers[parseInt(input.dataset.idx)].name = input.value;
});

// Stepper direct input
document.addEventListener('change', e => {
  const input = e.target.closest('[data-action$="-input"]');
  if (!input) return;
  const action = input.dataset.action.replace('-input', '');
  const min = parseInt(input.min);
  const max = parseInt(input.max);
  let val = parseInt(input.value);
  if (isNaN(val)) val = min;
  val = Math.min(max, Math.max(min, val));
  const fieldMap = { tiles: 'tiles', pennants: 'pennants', surrounding: 'surrounding', cities: 'cities', points: 'points' };
  if (action in fieldMap) {
    if (!isNaN(val)) sheet.details[fieldMap[action]] = val;
    renderSheet();
  }
});

// Close sheet on backdrop tap
document.getElementById('sheet-backdrop').addEventListener('click', closeSheet);

// ── Service worker ────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}

// ── Disable pinch-to-zoom and double-tap zoom on iOS ──────────────────────────

document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

let lastTap = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTap < 500) e.preventDefault();
  lastTap = now;
}, { passive: false });

// ── Boot ──────────────────────────────────────────────────────────────────────

loadState();
render();
