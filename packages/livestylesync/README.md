# livestylesync

Edit CSS in the browser. Changes go straight to your source files.

## Install

```bash
npm install livestylesync
```

No React required — Preact is bundled inside the overlay.

## Setup

**vite.config.ts**

```ts
import { defineConfig } from "vite";
import { liveStyleSync } from "livestylesync/vite-plugin";

export default defineConfig({
  plugins: [liveStyleSync()],
});
```

**main.tsx** (or your entry file)

```ts
import { mount } from "livestylesync/overlay";
mount();
```

Run `vite` and press `Alt+S` (or click the dot in the bottom-right corner).

## Options

```ts
liveStyleSync({ port: 3100 }) // default port
mount({ port: 3100 })         // must match plugin port
```

## How it works

- Vite plugin starts a WebSocket server alongside the dev server
- Overlay runs in the browser — pick an element, edit its styles live
- Click **Apply to file** — patch writes directly to your CSS/SCSS source
- Vite HMR picks up the change instantly

## Features

- Element picker + DOM breadcrumb navigation
- Force pseudo-state preview (`:hover` / `:focus` / `:active`)
- Viewport breakpoint switcher (375 / 768 / 1024 px + custom)
- CSS custom properties browser with color swatches and search
- SCSS variables browser and editor
- Tailwind utility class swapper
- Session history with undo and diff export
- Auto-reconnect with exponential backoff

## Requirements

- Vite ≥ 4
- Node.js ≥ 18

## License

MIT
