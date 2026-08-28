# BS-Carcassonne — Agent Context

TillyTally — unofficial score tracker for the Carcassonne board game. Progressive Web App: installable on iOS/Android/desktop, works offline. Hosted on GitHub Pages. Plain HTML/CSS/JS, no build step, no npm, no framework.

> **Agent context — required reading.** Lines beginning with `@` below are absolute file paths (one complete path per line; paths may contain spaces). Claude Code auto-imports them. All other agents (Codex, Copilot, etc.): read every `@` file now, before doing any work.

## Shared reference notes

@c:\_repos\Obsidian\Notes\Claude\Reference\Author-Version-Standards.md
@c:\_repos\Obsidian\Notes\Claude\Reference\VanillaJS-PWA-Patterns.md

## Project context

@c:\_repos\Obsidian\Notes\Claude\Projects\BS-Carcassonne Claude Context.md

## Critical constraints

- **No build step** — files are served as-is from GitHub Pages. Do not add npm, webpack, TypeScript, Vite, or any bundler.
- **Vanilla JS only** — no React, Vue, Angular, or external JS libraries.
- **Service worker cache version must be bumped** — when any cached asset changes, increment the cache name in `sw.js` (currently `carc-v15`). Forgetting this causes stale assets for installed PWA users.
- **`dispatch(type, payload)` pattern** — all state changes go through `dispatch` → mutate `state` → `saveState()` → `render()`. Do not mutate state directly.
- **Mobile-first** — viewport has `user-scalable=no`; keep touch targets large (44px minimum).

## Working rules

- Follow VanillaJS-PWA-Patterns.md unless the project note documents a deliberate exception.
- Prefer minimal, targeted edits.
- State is persisted to `localStorage` key `carc_game`; full DOM re-render on each dispatch.

## After this session

When the session ends or the user says to wrap up, update the project context note:
`c:\_repos\Obsidian\Notes\Claude\Projects\BS-Carcassonne Claude Context.md`

Update these sections:
- **Current constraints** — add any new version pins, banned patterns, or architecture rules discovered
- **Fix history** — add bugs fixed with root cause (one line each: date · symptom · cause · fix)
- **Next actions** — replace with the current list
- **frontmatter `version:`** — set to today's date (YYYY.MM.DD)
