# LiveStyleSync

Edit styles in the browser. Changes go straight to your source files.

Click any element → tweak in the panel → Vite HMR updates the browser instantly.
No copy-pasting between DevTools and your editor.

---

## Install

```bash
npm install livestylesync-overlay livestylesync-vite-plugin
```

---

## Setup

### React / Vite

```ts
// vite.config.ts
import { liveStyleSync } from "livestylesync-vite-plugin";

export default defineConfig({
  plugins: [liveStyleSync()],
});
```

```tsx
// src/main.tsx
import { mount } from "livestylesync-overlay";

if (import.meta.env.DEV) {
  mount();
}
```

---

### Vue 3 / Vite

```ts
// vite.config.ts
import { liveStyleSync } from "livestylesync-vite-plugin";

export default defineConfig({
  plugins: [vue(), liveStyleSync()],
});
```

```ts
// src/main.ts
import { mount } from "livestylesync-overlay";

if (import.meta.env.DEV) {
  mount();
}
```

Works with both `<style scoped>` and plain CSS/SCSS imports.

---

### Nuxt 3

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vite: {
    plugins: [liveStyleSync()],
  },
});
```

```ts
// plugins/livestylesync.client.ts
export default defineNuxtPlugin(() => {
  if (import.meta.dev) {
    import("livestylesync-overlay").then(({ mount }) => mount());
  }
});
```

---

### SvelteKit

```ts
// vite.config.ts
import { liveStyleSync } from "livestylesync-vite-plugin";
import { sveltekit } from "@sveltejs/kit/vite";

export default defineConfig({
  plugins: [sveltekit(), liveStyleSync()],
});
```

```ts
// src/app.html or src/routes/+layout.ts
if (import.meta.env.DEV) {
  const { mount } = await import("livestylesync-overlay");
  mount();
}
```

---

### Astro

```ts
// astro.config.mjs
import { liveStyleSync } from "livestylesync-vite-plugin";

export default defineConfig({
  vite: {
    plugins: [liveStyleSync()],
  },
});
```

```ts
// src/layouts/Layout.astro (client:only)
<script>
if (import.meta.env.DEV) {
  const { mount } = await import("livestylesync-overlay");
  mount();
}
</script>
```

---

### Solid.js / Vite

```ts
// vite.config.ts
import { liveStyleSync } from "livestylesync-vite-plugin";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid(), liveStyleSync()],
});
```

```tsx
// src/index.tsx
import { mount } from "livestylesync-overlay";

if (import.meta.env.DEV) {
  mount();
}
```

---

## Options

```ts
liveStyleSync({ port: 3100 }) // Vite plugin — default port
mount({ port: 3100 })         // Overlay — must match
```

> Both sides must use the same port. Change only if 3100 is taken.

---

## Features

| Feature | Description |
|---|---|
| **Element picker** | Click any element to inspect it |
| **DOM breadcrumbs** | Navigate parent/child elements |
| **Pseudo-state tabs** | Edit `:hover`, `:focus`, `:active` styles |
| **Responsive tabs** | Edit `@media` breakpoint styles |
| **Container query tabs** | Edit `@container` rules |
| **CSS custom properties** | Browse and edit `:root` variables |
| **SCSS $variables** | Scan and edit `$var` declarations across all SCSS files |
| **Create new rules** | Add CSS to unstyled elements from scratch |
| **Session history** | Git-style diff of all changes, undo by batch |
| **Restore batches** | Click any past batch to restore it |
| **Export diff** | Copy the full session diff to clipboard |
| **Draggable & resizable** | Position the panel anywhere on screen |
| **Tailwind detection** | Warns when the element uses Tailwind utilities |
| **Instant preview** | Changes apply visually before saving |
| **Write to source** | Patches the exact rule in your file, HMR picks it up |

---

## CSS format support

| Format | Read | Patch |
|---|---|---|
| Plain `.css` | ✅ | ✅ |
| `.scss` | ✅ | ✅ |
| CSS Modules `.module.css` | ✅ | ✅ |
| Vue `<style scoped>` | ✅ | ✅ |
| Tailwind utilities | ⚠️ detected, warns | — |
| Inline styles | ❌ | — |

---

## How it works

```
Click element
  → overlay reads CSSOM (all matching rules, media queries, container queries)
  → you edit a value → instant visual preview
  → Apply → WebSocket → Vite plugin finds the rule in source → patches file
  → Vite HMR reloads the style → overlay re-reads CSSOM
```

---

## Try the demo

```bash
git clone https://github.com/Artyx71/livestylesync
cd livestylesync
pnpm install
cd apps/demo && pnpm dev
```

Open `http://localhost:5173` — the LSS panel appears in the bottom-right corner.

---

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
- [x] SCSS $variable editor
- [x] Create rules for unstyled elements
- [ ] Next.js / webpack support
- [ ] Storybook integration

---

## Contributing

Contributions are welcome. Here's how to get started:

### Setup

```bash
git clone https://github.com/Artyx71/livestylesync
cd livestylesync
pnpm install
```

### Project structure

```
packages/
  overlay/        # Browser panel (Preact + TypeScript, bundled with tsup)
  vite-plugin/    # Vite plugin + WebSocket server + CSS/SCSS patchers
  livestylesync/  # Meta-package re-exporting both
apps/
  demo/           # Vite + React demo app for manual testing
```

### Dev workflow

```bash
# Run the demo (watches overlay + plugin via pnpm workspaces)
cd apps/demo && pnpm dev

# After changing overlay or vite-plugin source, rebuild:
pnpm --filter livestylesync-overlay build
pnpm --filter livestylesync-vite-plugin build
# Then restart the demo dev server
```

### Run tests

```bash
pnpm --filter livestylesync-vite-plugin test
```

### Opening issues

Please use the GitHub issue tracker. When reporting a bug, include:

- **What you did** — steps to reproduce
- **What you expected** — what should have happened
- **What happened** — actual behavior, error messages, screenshots
- **Environment** — framework, CSS format (plain CSS / SCSS / Modules / Vue), browser

Feature requests are welcome too — describe the use case, not just the solution.

### Pull requests

- One PR per fix or feature
- Keep changes focused — avoid unrelated cleanup in the same PR
- Add a test if you're changing patcher logic (`packages/vite-plugin/src/patchers/`)
- Run `pnpm tsc --noEmit` in the changed package before submitting

---

## License

MIT
