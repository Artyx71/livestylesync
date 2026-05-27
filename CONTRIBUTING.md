# Contributing to LiveStyleSync

## Setup

```bash
git clone https://github.com/Artyx71/livestylesync.git
cd livestylesync
pnpm install
```

## Project structure

```
packages/
  overlay/          # Browser overlay UI (React + TypeScript)
  server-core/      # WebSocket server + CSS/SCSS/Vue patchers
  vite-plugin/      # Vite plugin
  webpack-plugin/   # Webpack / Rspack plugin
  nextjs-plugin/    # Next.js wrapper around webpack-plugin
  livestylesync/    # Meta-package (re-exports vite-plugin + overlay)
apps/
  demo/             # Dev sandbox (Vite + React)
  landing/          # Marketing site (Astro)
```

## Development

Run the demo app with hot reload:

```bash
pnpm --filter demo dev
```

Build all packages:

```bash
pnpm -r build
```

Run tests:

```bash
pnpm --filter livestylesync-server-core test
```

## Making changes

1. Edit source in `packages/*/src/`
2. Run `pnpm --filter <package-name> build` to rebuild
3. The demo picks up changes automatically (workspace symlinks)

## Submitting a PR

- One feature or fix per PR
- If adding a feature, update the relevant README
- Run `pnpm --filter livestylesync-server-core test` before submitting
- Describe what problem you're solving in the PR description

## Publishing (maintainers only)

```bash
# bump version in package.json
pnpm --filter <package> build
cd packages/<package> && npm publish --access public
```
