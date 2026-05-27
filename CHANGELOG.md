# Changelog

All notable changes to LiveStyleSync packages are documented here.

## [1.0.0] — 2026-05-27

### All packages — stable release

### `livestylesync-overlay@1.0.0`
- **feat:** Force pseudo-state preview — toggle `:hover` / `:focus` / `:active` on selected element (#50)
- **feat:** Viewport breakpoint switcher — preset 375/768/1024px + custom width input, injects `max-width` on body (#51)
- **feat:** WebSocket reconnect banner — visible status when dev server is unreachable (#58)
- **docs:** Full README rewrite — all features documented (#56)

### `livestylesync-vite-plugin@1.0.0`
- **docs:** README updated with options table

### `livestylesync@1.0.0`
- **fix:** Remove incorrect "React is a peer dependency" note — Preact is bundled, no React required
- **docs:** Full README rewrite

---

## [0.4.0] — 2026-05-27

### `livestylesync-overlay@0.4.0`
- **feat:** CSS Variables panel upgraded — grouped by prefix (Colors, Spacing, Typography, Radius, Shadows), search/filter, color swatches with native color picker
- **fix:** E2E race condition — wait for `crosshair` cursor before clicking target element in picking mode

### All packages
- **test:** E2E test suite with Playwright — 9 tests covering overlay lifecycle and CSS patch flow, CI green on GitHub Actions (#49)

---

## [0.3.9] — 2026-05-20

### `livestylesync-overlay@0.3.9` · `livestylesync-server-core@0.1.2`
- **feat:** Tailwind class swapper — detect, preview, and swap Tailwind utility classes with live DOM preview (#44)
- **feat:** Component context panel — show React/Vue component name and props for selected element (#47)
- **fix:** CSS Modules patching — fix `isCssModule` detection and `cleanUrl` (#41)

---

## [0.3.6] — 2026-05-10

### `livestylesync-overlay@0.3.6` · `livestylesync-server-core@0.1.1`
- **feat:** Open in editor link after Apply — jump to patched file:line in VS Code
- **feat:** Standalone `livestylesync-webpack-plugin` package extracted (#45)
- **feat:** Landing page deployed to GitHub Pages (#35)

---

## [0.3.5] — 2026-05-01

### `livestylesync-overlay@0.3.5`
- **refactor:** Decompose `Overlay.tsx` into focused components (#33)
- **feat:** `livestylesync-server-core` and `livestylesync-nextjs` extracted as standalone packages (#18)

---

## [0.3.4] — 2026-04-20

### `livestylesync-overlay@0.3.4` · `livestylesync-vite-plugin@0.3.3`
- **feat:** Element search by `.class`, `#id`, or CSS selector with highlight and navigation
- **feat:** Arrow key nudge for numeric CSS values (±1 / Shift±10 / Alt±0.1)
- **feat:** Success toast after Apply, `Alt+S` keyboard shortcut to toggle panel
- **feat:** Inline color picker for color properties
- **feat:** SCSS vars tracked in session history with undo/restore

---

## [0.3.1] — 2026-04-10

### `livestylesync-overlay@0.3.1` · `livestylesync-vite-plugin@0.3.2`
- **feat:** Session history panel — git-style diff view, rollback, export to clipboard
- **fix:** Unified undo into single `sessionBatches` stack
- **fix:** SCSS var patch errors routed to SCSS panel instead of CSS editor

---

## [0.3.0] — 2026-04-01

### `livestylesync@0.3.0` · `livestylesync-overlay@0.3.0` · `livestylesync-vite-plugin@0.3.0`
- Initial public release on npm
- Element picker with highlight and breadcrumb navigation
- CSS / SCSS / CSS Modules / Vue scoped style patching
- Draggable and resizable panel
- WebSocket server with file-write pipeline
