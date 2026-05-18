# livestylesync-overlay

Browser overlay for [LiveStyleSync](https://github.com/livestylesync/livestylesync).

No React required — Preact is bundled. Works with any framework.

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

## Features

- Click any element to inspect its CSS rules
- DOM breadcrumb path — click ancestors to switch element
- Tabs per pseudo-state: `:hover`, `:focus`, `:active`, etc.
- Tabs per `@media` breakpoint: `≤1024px`, `≥768px`, etc.
- Add new properties inline
- "Apply to file" sends changes to the Vite plugin over WebSocket

## Works with

Plain CSS · SCSS · CSS Modules · Vue scoped styles · any Vite-based framework

## License

MIT
