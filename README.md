# TillyTally — Unofficial Scoring for Carcassonne
![CI](https://github.com/seanmryan73/BS-Carcassonne/actions/workflows/ci.yml/badge.svg)

Installable PWA score tracker for the Carcassonne board game. Runs in the browser, works offline, can be added to the home screen on iOS/Android.

**Live:** https://seanmryan73.github.io/BS-Carcassonne/

---

## Features

- **2–6 players** with custom names and color dots
- **Full Carcassonne scoring** — City, Road, Monastery, Farm, Pig Farm, and manual Other
- **Expansion support** — Cathedral (cities), Inn (roads), Pig Farm scoring
- **Score sheet** — guided multi-step wizard for logging each feature
- **Event log** with Undo (removes the last scored event)
- **3D CSS dice roller** — tap 🎲 any time during a game
- **Persistent state** — game survives page refresh via `localStorage`
- **Offline / installable** — service worker caches all assets; install to home screen

---

## Scoring Reference

| Feature | Points |
|---------|--------|
| City (complete) | 2 per tile + 2 per pennant |
| City (incomplete) | 1 per tile |
| City + Cathedral (complete) | 3 per tile + 3 per pennant |
| City + Cathedral (incomplete) | 0 |
| Road | 1 per tile |
| Road + Inn (complete) | 2 per tile |
| Road + Inn (incomplete) | 0 |
| Monastery (complete) | 9 |
| Monastery (incomplete) | 1 + surrounding tiles |
| Farm | 3 per completed city |
| Pig Farm | 4 per completed city |

---

## Tech Stack

| | |
|-|-|
| Language | Vanilla JavaScript (ES2020) |
| Styling | Plain CSS |
| PWA | Web App Manifest + Service Worker |
| Hosting | GitHub Pages |
| Build step | None |

No npm, no framework, no bundler. Edit files directly and push — GitHub Pages serves them as-is.

---

## Development

Clone and open `index.html` in a browser, or serve locally:

```powershell
# Python (any machine with Python 3)
python -m http.server 8080
# then open http://localhost:8080
```

### Updating the icon

1. Edit `icon.svg`.
2. Open `generate-icons.html` in a browser.
3. Download the generated PNGs and replace `icons/icon-192.png` and `icons/icon-512.png`.

### Service worker cache

When any asset changes, bump the `CACHE` constant in `sw.js` so returning users get updated files:

```js
// sw.js
const CACHE = 'carc-v4';  // ← increment this
```

---

## Deploy

Push to `main` — GitHub Pages picks it up automatically (no CI required).

**Author:** Sean Ryan — seanmryan@gmail.com  
**Company:** BagPipes
