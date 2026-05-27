# livestylesync-vite-plugin

Vite plugin for [LiveStyleSync](https://github.com/livestylesync/livestylesync).

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

Custom port:

```ts
plugins: [liveStyleSync({ port: 3200 })]
```

Also add the overlay → [livestylesync-overlay](https://www.npmjs.com/package/livestylesync-overlay)

## How it works

Starts a WebSocket server when the Vite dev server starts. Receives style patches
from the browser overlay and writes them directly to the source file using PostCSS AST.
Vite HMR then picks up the file change automatically.

## Supported formats

| Format | Notes |
|---|---|
| Plain CSS | nested `@media` (CSS nesting) + traditional |
| SCSS | nested rules via PostCSS AST |
| CSS Modules | hash-stripped selector matching |
| Vue scoped styles | `<style scoped>` block patching |

## Options

| Option | Default | Description |
|---|---|---|
| `port` | `3100` | WebSocket server port — must match `mount({ port })` in the overlay |

## License

MIT
