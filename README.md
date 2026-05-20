# LiveStyleSync

Edit styles in the browser. Changes go straight to your source files.

## What it does

LiveStyleSync adds a small overlay to your dev environment. Click any element,
tweak spacing or colors in the panel, and the changes write back to your CSS source —
Vite HMR updates the browser instantly.

No copy-pasting values between DevTools and your editor.

## Install

```bash
npm install livestylesync-overlay livestylesync-vite-plugin
```

## Setup

**1. Vite plugin**

```ts
// vite.config.ts
import { liveStyleSync } from "livestylesync-vite-plugin";

export default defineConfig({
  plugins: [liveStyleSync()],
});
```

**2. Overlay**

```ts
// main.ts / main.tsx
import { mount } from "livestylesync-overlay";
mount();
```

## Options

```ts
liveStyleSync({ port: 3100 }) // default
mount({ port: 3100 })         // must match
```

## Features

- **Element picker** — click any element to inspect it
- **DOM breadcrumbs** — navigate to parent/child elements via the path bar
- **Pseudo-state tabs** — edit `:hover`, `:focus`, `:active` styles separately
- **Responsive tabs** — edit `@media` breakpoint styles (e.g. `≤1024px`)
- **Container query tabs** — edit `@container` rules directly
- **CSS custom properties** — browse and edit `:root` variables
- **Create new rules** — pick an unstyled element and add CSS from scratch
- **Session history** — see all changes as a git-style diff, undo by batch
- **Export diff** — copy the full session diff to clipboard
- **Draggable & resizable panel** — position it anywhere on screen
- **Tailwind detection** — warns when selected element uses Tailwind utilities
- **Instant preview** — changes apply before saving
- **Write to source** — patches the exact CSS rule in your file, Vite HMR picks it up

## Works with

| Format | Support |
|---|---|
| Plain CSS | ✅ |
| CSS Modules | ✅ |
| SCSS | ✅ |
| Vue scoped styles | ✅ |
| React / Vue / Svelte / any framework | ✅ (no React peer dep) |

## How it works

```
Click element → overlay reads CSSOM → edit value → WebSocket → Vite plugin patches file → HMR
```

## Try the demo

```bash
git clone https://github.com/livestylesync/livestylesync
cd livestylesync && pnpm install
cd apps/demo && pnpm dev
```

## Roadmap

- [x] Element picker + highlight
- [x] CSS / SCSS / CSS Modules / Vue scoped styles
- [x] Pseudo-state editing (:hover, :focus…)
- [x] @media responsive editing
- [x] @container query editing
- [x] DOM breadcrumb navigation
- [x] No React peer dependency (Preact bundled)
- [x] Tailwind utility detection
- [x] Rollback / undo + session history
- [x] CSS custom properties editor
- [x] Create rules for unstyled elements
- [ ] Next.js / webpack support
- [ ] SCSS variable editor (server-side scan)

## License

MIT
