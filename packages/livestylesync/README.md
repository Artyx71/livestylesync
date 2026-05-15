# livestylesync

Edit CSS in the browser. Changes go straight to your source files.

## Install

```bash
npm install livestylesync
```

> React is a peer dependency — you need it in your project.

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

```tsx
import { mount } from "livestylesync/overlay";

mount();
```

That's it. Run `vite` and click the dot in the bottom-right corner.

## Options

```ts
liveStyleSync({ port: 3100 }) // default port
mount({ port: 3100 })         // must match
```

## How it works

- Vite plugin starts a WebSocket server
- Overlay runs in the browser — pick an element, edit its styles
- Click **Apply to file** — changes write directly to your CSS source file
- Vite HMR picks up the change instantly

## Requirements

- Vite ≥ 4
- React ≥ 18
- Node.js ≥ 18

## License

MIT
