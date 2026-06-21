# BS-Carcassonne — Claude Context

## What this repo is

**TillyTally** — unofficial score tracker for the Carcassonne board game. Progressive Web App (PWA) installable on mobile and desktop. Hosted on GitHub Pages. No build step, no framework, no npm — plain HTML/CSS/JS served as-is.

Live URL: `https://seanmryan73.github.io/BS-Carcassonne/`

## Reference notes

- Author / version / company: `C:\_repo\Obsidian\Notes\Claude\Reference\Author-Version-Standards.md`
- Project details: `C:\_repo\Obsidian\Notes\Claude\Projects\BS-Carcassonne Claude Context.md`

## Author / version standard

- Author: Sean Ryan <seanmryan@gmail.com>
- Company: BagPipes
- Version format: `YYYY.MM.DD`

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell — PWA meta tags, DOM anchors (`#app`, `#sheet`, `#toast`, `#dice-overlay`) |
| `app.js` | All app logic — state, dispatch, scoring, render functions |
| `style.css` | All styling |
| `sw.js` | Service worker — cache-first offline strategy; cache name is `carc-v3` |
| `manifest.json` | PWA manifest — name, icons, theme color, display mode |
| `icon.svg` | Source SVG icon |
| `icons/` | 192×192 and 512×512 PNG icons (regenerate with `generate-icons.html` if SVG changes) |
| `generate-icons.html` | Local tool — open in browser to export PNGs from `icon.svg` |

## Architecture

- **Single global `state` object:** `{ players, events, phase, nextEventId, playerCount }`
- **`dispatch(type, payload)`:** Mutates state → `saveState()` → `render()`. Actions: `START_GAME`, `ADD_EVENT`, `UNDO`, `END_GAME`, `NEW_GAME`.
- **Phases:** `setup` → `playing` → `ended`
- **Persistence:** `localStorage` under key `carc_game` (JSON serialised `state`)
- **Rendering:** Full re-render on every dispatch — no virtual DOM, no diffing.
- **Score sheet:** Bottom-sheet overlay with a multi-step wizard (player select → feature type → details → confirm).

## Scoring logic (`calcScore` in app.js)

| Feature | Formula |
|---------|---------|
| City (complete) | tiles × 2 + pennants × 2 |
| City (incomplete) | tiles × 1 |
| City + Cathedral (complete) | tiles × 3 + pennants × 3 |
| City + Cathedral (incomplete) | 0 |
| Road | tiles × 1 |
| Road + Inn (complete) | tiles × 2 |
| Road + Inn (incomplete) | 0 |
| Monastery (complete) | 9 |
| Monastery (incomplete) | 1 + surrounding tiles (max 8) |
| Farm | cities × 3 |
| Pig Farm | cities × 4 |
| Other | manual points entry |

## Key constraints

- **No build step** — files are edited directly and served as-is from GitHub Pages. Do not introduce npm, webpack, TypeScript, or any bundler.
- **Vanilla JS only** — no React, Vue, or other frameworks. No external JS libraries.
- **Service worker cache version** — when any cached asset changes (`index.html`, `style.css`, `app.js`, `manifest.json`, `icon.svg`), bump the `CACHE` constant in `sw.js` (e.g. `carc-v3` → `carc-v4`) so users receive the updated files.
- **Mobile-first** — `viewport` has `user-scalable=no`; touch targets should be large enough to tap comfortably.
- **No server** — all logic runs client-side; the only persistence is `localStorage`.

## Working rules

- Prefer minimal, targeted edits.
- Do not introduce dependencies or a build pipeline.
- Keep all logic in `app.js` — do not split into modules unless the file becomes unmanageable.
- Test on mobile viewport (Chrome DevTools → responsive mode) as well as desktop.
