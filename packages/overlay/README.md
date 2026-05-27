# livestylesync-overlay

Browser overlay for [LiveStyleSync](https://github.com/livestylesync/livestylesync).

No React required — Preact is bundled. Works with any Vite-based framework.

## Install

```bash
npm install livestylesync-overlay livestylesync-vite-plugin
```

## Usage

```ts
import { mount } from "livestylesync-overlay";
mount();
```

Custom port:

```ts
mount({ port: 3200 });
```

Also add the Vite plugin → [livestylesync-vite-plugin](https://www.npmjs.com/package/livestylesync-vite-plugin)

## Keyboard shortcut

`Alt+S` — toggle overlay open/closed

## Features

### Element inspector
- Click **↖ Select Element** then click any element on the page
- DOM breadcrumb — click parent nodes to switch scope
- Tabs per CSS rule group, `@media` query, and pseudo-state
- Add new CSS properties inline
- Force pseudo-state preview: `:hover` / `:focus` / `:active`
- Detect React component name and file via `__reactFiber`

### Style editing
- Edit any CSS property — changes preview live in the browser
- **Apply to file** — sends patch over WebSocket, writes to source file
- Tailwind class swapper — replace one utility class with another
- Undo last apply batch

### CSS & SCSS variables
- Browse all `:root` CSS custom properties, grouped by prefix (colors, spacing, typography…)
- Color swatches for color values, search/filter
- Browse and edit SCSS variables (requires vite-plugin support)

### Viewport switcher
- Preset breakpoints: 375 / 768 / 1024 px
- Custom width input
- Injects `max-width` on `body` — simulates narrow viewports without an iframe

### Session history
- Full log of every applied change in the current session
- Restore any previous batch
- Export session diff to clipboard as CSS

### Connection status
- Dot indicator: green (connected) / yellow (reconnecting) / red (disconnected)
- Banner when server is unreachable with auto-reconnect (exponential backoff)

## Works with

Plain CSS · SCSS · CSS Modules · Vue scoped styles · any Vite-based framework

## License

MIT
