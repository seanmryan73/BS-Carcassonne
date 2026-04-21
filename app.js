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
      <div class="setup-card">
        <div class="setup-form">
          <div class="field-row">
            <span class="field-label">Players</span>
            <div class="count-buttons">${countBtns}</div>
          </div>
          <div class="player-list">${rows}</div>
          <button class="btn-dice-roll" data-action="roll-dice">🎲 Dice Roll</button>
          <button class="btn-primary" data-action="start-game">Start Game</button>
        </div>
      </div>
    </div>`;
}

// ── Render: scoreboard ────────────────────────────────────────────────────────

function renderScoreboard() {
  const sorted = [...state.players].sort((a, b) => playerTotal(b.id) - playerTotal(a.id));
  const cards = sorted.map(p => `
    <button type="button" class="score-card" style="--player-color:${p.color}"
            data-action="open-sheet-for-player" data-player-id="${p.id}">
      <span class="card-name">${escHtml(p.name)}</span>
      <span class="card-score">${playerTotal(p.id)}</span>
    </button>`).join('');

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
    ? `<div class="empty-log"><p>No scores yet.</p><p>Tap a name to log a score.</p></div>`
    : '';

  return `
    <div class="screen scoreboard-screen">
      <header class="score-header">
        <div class="score-grid">${cards}</div>
        <div class="header-actions">
          <button class="btn-icon" data-action="undo" ${!hasEvents ? 'disabled' : ''}>↩</button>
          <button class="btn-icon btn-roll" data-action="roll-dice" id="roll-btn">🎲</button>
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
  const topScore = playerTotal(ranked[0].id);
  const winners = ranked.filter(p => playerTotal(p.id) === topScore);
  const isTie = winners.length > 1;
  const winnerLabel = isTie
    ? winners.map(p => escHtml(p.name)).join(' & ')
    : escHtml(ranked[0].name);
  const medals = ['🥇', '🥈', '🥉'];

  const rows = ranked.map((p, i) => {
    const total = playerTotal(p.id);
    const prevTotal = i > 0 ? playerTotal(ranked[i - 1].id) : null;
    const displayRank = prevTotal === total ? null : i;
    const medal = displayRank !== null ? (medals[displayRank] ?? `${displayRank + 1}.`) : '🥇';
    const isWinner = total === topScore;
    const pEvents = state.events.filter(e => e.playerIds.includes(p.id));
    const breakdown = pEvents.map(e => `
      <div class="breakdown-item">
        <span>${featureLabel(e.type, e.details)}</span>
        <span>+${e.points}</span>
      </div>`).join('');

    return `
      <div class="ranking-card ${isWinner ? 'winner' : ''}" style="--player-color:${p.color}" style="animation-delay:${i * 0.12}s">
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
      <div class="ended-hero">
        <canvas id="confetti-canvas"></canvas>
        <div class="ended-hero-content">
          <p class="ended-game-over">Game Over</p>
          <p class="ended-winner-name">${winnerLabel}</p>
          <p class="ended-winner-sub">${isTie ? 'It\'s a tie! 🎉' : 'wins! 🎉'}</p>
        </div>
      </div>
      <div class="ended-rankings">
        <div class="rankings">${rows}</div>
        <div class="ended-footer">
          <button class="btn-primary" data-action="new-game">New Game</button>
        </div>
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
  if (sheet.step === 1) { el.classList.remove('sheet-fullscreen'); el.innerHTML = renderSheetStep1(); }
  else if (sheet.step === 2) { el.classList.remove('sheet-fullscreen'); el.innerHTML = renderSheetStep2(); }
  else if (sheet.step === 3) { el.classList.add('sheet-fullscreen'); el.innerHTML = renderSheetStep3(); }
}

// ── Main render ───────────────────────────────────────────────────────────────

function render() {
  const app = document.getElementById('app');
  if (state.phase === 'setup')   app.innerHTML = renderSetup();
  else if (state.phase === 'playing') app.innerHTML = renderScoreboard();
  else if (state.phase === 'ended') { app.innerHTML = renderEnded(); startConfetti(); }
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
  const el = document.getElementById('sheet');
  el.classList.remove('open', 'sheet-fullscreen');
  document.getElementById('sheet-backdrop').classList.add('hidden');
  sheet.open = false;
}

// ── Scroll Add Score into view when keyboard opens on step 3 ─────────────────

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (!sheet.open || sheet.step !== 3) return;
    const btn = document.querySelector('[data-action="add-score"]');
    if (btn) btn.scrollIntoView({ block: 'end', behavior: 'smooth' });
  });
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

  } else if (action === 'open-sheet-for-player') {
    openSheet();
    sheet.playerIds = [parseInt(btn.dataset.playerId)];
    sheet.step = 2;
    renderSheet();

  } else if (action === 'roll-dice') {
    openDiceOverlay();

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

// ── Fire Add Score on touchstart to bypass iOS keyboard-dismiss layout shift ───

document.addEventListener('touchstart', e => {
  const btn = e.target.closest('[data-action="add-score"]');
  if (!btn) return;
  e.preventDefault();
  // Sync any open stepper input before submitting
  const active = document.activeElement;
  if (active && active.dataset.action?.endsWith('-input')) {
    const action = active.dataset.action.replace('-input', '');
    const val = parseInt(active.value);
    const min = parseInt(active.min);
    const max = parseInt(active.max);
    if (!isNaN(val)) sheet.details[action] = Math.min(max, Math.max(min, val));
  }
  active?.blur();
  const pts = calcScore(sheet.type, sheet.details);
  const names = sheet.playerIds.map(id => playerName(id)).join(' & ');
  dispatch('ADD_EVENT', { playerIds: [...sheet.playerIds], type: sheet.type, points: pts, details: { ...sheet.details } });
  closeSheet();
  showToast(`${names} scored ${pts} pt${pts !== 1 ? 's' : ''}`);
}, { passive: false });

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

// ── Dice overlay ─────────────────────────────────────────────────────────────

// Which cube rotation brings each face (1,2,3) toward the viewer
const FACE_TARGETS = {
  1: { x: 0,   y: 0   },   // front face
  2: { x: 0,   y: -90 },   // right face
  3: { x: -90, y: 0   },   // top face
};

let cubeRotX = 0;
let cubeRotY = 0;
let diceSpinTimer = null;

function setCube(x, y, transition = '') {
  const cube = document.getElementById('dice-cube');
  if (!cube) return;
  cube.style.transition = transition;
  cube.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
  cubeRotX = x;
  cubeRotY = y;
}

function spinDice() {
  clearTimeout(diceSpinTimer);
  const wrapper = document.getElementById('dice-cube-wrapper');
  if (wrapper) wrapper.classList.remove('glowing');
  let spins = 0;
  const totalSpins = 18;

  function tick() {
    spins++;
    const progress = spins / totalSpins;
    const interDelay = 55 + Math.pow(progress, 2.6) * 520;
    const transDur = Math.round(interDelay * (progress < 0.4 ? 1.15 : progress < 0.7 ? 0.85 : 0.6));

    // Random rotation on X, Y, or both — always multiples of 90 so faces stay crisp
    const amounts = [90, 180, 270];
    const pick = () => (Math.random() > 0.5 ? 1 : -1) * amounts[Math.floor(Math.random() * amounts.length)];
    const addX = Math.random() > 0.3 ? pick() : 0;
    const addY = Math.random() > 0.3 ? pick() : 0;
    const newX = cubeRotX + (addX === 0 && addY === 0 ? 90 : addX);
    const newY = cubeRotY + addY;

    const ease = progress > 0.65 ? 'cubic-bezier(0.25,0.46,0.45,0.94)' : 'ease-in-out';
    setCube(newX, newY, `transform ${transDur}ms ${ease}`);

    if (spins >= totalSpins) {
      setTimeout(() => landCube(Math.floor(Math.random() * 3) + 1), interDelay + 60);
      return;
    }
    diceSpinTimer = setTimeout(tick, interDelay);
  }

  tick();
}

function landCube(faceNum) {
  const target = FACE_TARGETS[faceNum];
  let targetX = Math.round(cubeRotX / 360) * 360 + target.x;
  let targetY = Math.round(cubeRotY / 360) * 360 + target.y;
  // Ensure the landing move is noticeable
  if (Math.abs(targetX - cubeRotX) + Math.abs(targetY - cubeRotY) < 45) targetX += 360;

  setCube(targetX, targetY, 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1)');

  setTimeout(() => {
    const scene = document.querySelector('.dice-scene');
    if (scene) { scene.classList.add('shake'); setTimeout(() => scene.classList.remove('shake'), 500); }
    const wrapper = document.getElementById('dice-cube-wrapper');
    if (wrapper) wrapper.classList.add('glowing');
  }, 700);
}

function openDiceOverlay() {
  const overlay = document.getElementById('dice-overlay');
  const wrapper = document.getElementById('dice-cube-wrapper');
  if (wrapper) wrapper.classList.remove('glowing');
  cubeRotX = 0; cubeRotY = 0;
  setCube(0, 0);
  overlay.classList.remove('hidden', 'fading');
  setTimeout(() => spinDice(), 150);
}

function closeDiceOverlay() {
  clearTimeout(diceSpinTimer);
  const overlay = document.getElementById('dice-overlay');
  overlay.classList.add('fading');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

document.getElementById('dice-roll-again').addEventListener('click', () => spinDice());
document.getElementById('dice-done').addEventListener('click', () => closeDiceOverlay());

// ── Confetti ──────────────────────────────────────────────────────────────────

let confettiRaf = null;

function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const COLORS = ['#e91e8c','#2980b9','#f39c12','#27ae60','#c0392b','#9b59b6','#ffffff'];
  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    w: 7 + Math.random() * 7,
    h: 4 + Math.random() * 4,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rot: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 2.5,
    vy: 2.5 + Math.random() * 3,
    vr: (Math.random() - 0.5) * 0.15,
  }));

  cancelAnimationFrame(confettiRaf);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height) {
        p.y = -p.h;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    confettiRaf = requestAnimationFrame(draw);
  }

  draw();
}

// ── Boot ──────────────────────────────────────────────────────────────────────

loadState();
render();
