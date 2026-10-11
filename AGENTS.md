# BS-Carcassonne — Agent Context

TillyTally — unofficial score tracker for the Carcassonne board game. Progressive Web App: installable on iOS/Android/desktop, works offline. Hosted on GitHub Pages. Plain HTML/CSS/JS, no build step, no npm, no framework.

> **Agent context.** Lines beginning with `@` are absolute file paths (one per line; paths may
> contain spaces). Claude Code loads them automatically. All other agents (Codex, Copilot, etc.): read
> every `@` file now, before doing any work. The *Read before you…* table is **not** loaded up front:
> open the named note when your task matches the row, before you change anything in that area.

## Always loaded

@c:\_repos\Obsidian\Notes\Claude\Reference\Author-Version-Standards.md
@c:\_repos\Obsidian\Notes\Claude\Reference\Core-Rules.md
@c:\_repos\Obsidian\Notes\Claude\Projects\BS-Carcassonne Claude Context.md

## Read before you…

| Before you… | Read (path under `c:\_repos\Obsidian\Notes\Claude\`) |
|---|---|
| change any JS, CSS, the service worker or state handling | `Reference/VanillaJS-PWA-Patterns.md` |
| change the icon | `Reference/App-Icon-Standards.md` |
| touch CI or Pages deployment | `Reference/GitHub-Actions-Patterns.md` |

## Critical constraints

- **No build step** — files are served as-is from GitHub Pages. Do not add npm, webpack, TypeScript, Vite, or any bundler.
- **Vanilla JS only** — no React, Vue, Angular, or external JS libraries.
- **Service worker cache version must be bumped** — when any cached asset changes, increment the cache name in `sw.js` (currently `carc-v18`). Forgetting this causes stale assets for installed PWA users. On a substantive change also bump `APP_VERSION` (top of `app.js`, `YYYY.MM.DD[a]`), shown at the bottom of the setup screen.
- **`dispatch(type, payload)` pattern** — all state changes go through `dispatch` → mutate `state` → `saveState()` → `render()`. Do not mutate state directly. Exception: the setup screen (`renderSetup`, player roster edits) intentionally bypasses `dispatch()` — direct mutation + `saveState()` + `render()` — and the name-input listener skips `render()` entirely to preserve focus while typing. Don't "fix" either into the dispatch pattern.
- **Mobile-first** — viewport has `user-scalable=no`; keep touch targets large (44px minimum).
- **Never `preventDefault()` on `touchend`** (e.g. a "double-tap zoom" guard) — on Android it cancels the click and silently drops fast taps. `touch-action: manipulation` in `style.css` already blocks double-tap zoom.

## Working rules

- Follow VanillaJS-PWA-Patterns.md unless the project note documents a deliberate exception.
- Prefer minimal, targeted edits.
- State is persisted to `localStorage` key `carc_game`; full DOM re-render on each dispatch.

## After this session

Run **`/wrapup`** (`c:\_repos\Obsidian\Notes\Claude\Skills\wrapup\SKILL.md`). It is the procedure; this section only adds to it. This repo's project note: `Projects/BS-Carcassonne Claude Context.md`.
