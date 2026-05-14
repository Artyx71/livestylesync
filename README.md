# LiveStyleSync

Edit styles in the browser. Changes go straight to your source files.

## What it does

LiveStyleSync adds a small overlay to your dev environment. Click any element, change spacing or colors in the panel, and the changes write back to your CSS file — with HMR updating the browser instantly.

No copy-pasting values between DevTools and your editor.

## Status

Early MVP. Works with React + Vite + plain CSS/SCSS.

## Installation

```bash
# Not yet published to npm
# Clone and run the demo to try it
git clone https://github.com/livestylesync/livestylesync
cd livestylesync
pnpm install
cd apps/demo && pnpm dev
```

## How to add to your project

**1. Add the Vite plugin**

```ts
// vite.config.ts
import { liveStyleSync } from "@livestylesync/vite-plugin";

export default defineConfig({
  plugins: [liveStyleSync()],
});
```

**2. Mount the overlay**

```ts
// main.ts / main.tsx
import { mount } from "@livestylesync/overlay";
mount();
```

## How it works

```
Browser overlay → WebSocket → Vite plugin → CSS file → HMR → browser
```

- Overlay finds which CSS file and selector apply to the clicked element
- Changes are previewed inline instantly
- "Apply to file" writes the patch to the source CSS file
- Vite HMR picks up the change automatically

## Roadmap

- [x] Element picker with highlight
- [x] Style editor (spacing, colors)
- [x] Diff preview before saving
- [x] CSS file patching via WebSocket
- [ ] CSS Modules support
- [ ] SCSS support
- [ ] Tailwind utility detection
- [ ] Figma sync (Pro)

## License

MIT
