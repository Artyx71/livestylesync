# livestylesync-vite-plugin

Vite plugin for [LiveStyleSync](https://github.com/livestylesync/livestylesync) — edit styles in the browser, changes go straight to your source files.

## Install

```bash
npm install livestylesync-overlay livestylesync-vite-plugin
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from "vite";
import { liveStyleSync } from "livestylesync-vite-plugin";

export default defineConfig({
  plugins: [liveStyleSync()],
});
```

With custom port:

```ts
plugins: [liveStyleSync({ port: 3200 })]
```

Also add the overlay — see [livestylesync-overlay](https://www.npmjs.com/package/livestylesync-overlay).

## How it works

The plugin starts a WebSocket server (default port 3100) when the Vite dev server starts. It receives style patches from the browser overlay, finds the matching CSS rule in your source file, updates the value, and saves the file. Vite HMR picks up the change and updates the browser automatically.

## Works with

- Plain CSS
- SCSS

CSS Modules and scoped styles coming in v0.2.

## License

MIT
