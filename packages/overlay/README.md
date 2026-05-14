# livestylesync-overlay

Browser overlay for [LiveStyleSync](https://github.com/livestylesync/livestylesync) — edit styles in the browser, changes go straight to your source files.

## Install

```bash
npm install livestylesync-overlay livestylesync-vite-plugin
```

## Usage

```ts
// main.ts / main.tsx
import { mount } from "livestylesync-overlay";

mount();
```

With custom port:

```ts
mount({ port: 3200 });
```

Also add the Vite plugin — see [livestylesync-vite-plugin](https://www.npmjs.com/package/livestylesync-vite-plugin).

## How it works

After calling `mount()`, a small dot appears in the bottom-right corner of your app. Click it to open the panel, then click any element on the page to select it. Edit spacing or colors in the panel — changes apply instantly as a preview. Click "Apply to file" to write the change to your CSS source file.

## Works with

- React + Vite
- Vue + Vite
- Any framework + Vite

Requires plain CSS or SCSS files. CSS Modules and scoped styles coming in v0.2.

## License

MIT
