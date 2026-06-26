# Copilot Instructions

TillyTally — unofficial Carcassonne score tracker. Vanilla JS PWA, no build step, no framework, no npm.

## Shared references

- `c:\_repos\Obsidian\Notes\Claude\Reference\VanillaJS-PWA-Patterns.md`
- `c:\_repos\Obsidian\Notes\Claude\Reference\Author-Version-Standards.md`

## Working rules

- Prefer small, targeted edits over broad rewrites.
- No build step — plain HTML/CSS/JS only. No npm, no bundler, no TypeScript.
- Validate changes by opening `index.html` directly in a browser or via `python -m http.server`.

## Project-specific rules

- **`dispatch(type, payload)` pattern** — all state mutations go through `dispatch`. Never mutate `state` directly outside of `dispatch`.
- **Full re-render on every dispatch** — `render()` is called after every state change. Do not add partial DOM update logic.
- **Service worker cache name** — bump `carc-v<N>` in `sw.js` whenever any cached asset changes. If you forget, users will see stale content.
- **`localStorage` key** — game state is persisted as `carc_game`. Do not rename this key (breaks existing saves).
- **Phases:** `setup` → `playing` → `ended`. All UI branches on `state.phase`.
- **No external dependencies** — do not add CDN links or npm packages.
