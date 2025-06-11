# @dyad-sh/react-vite-component-tagger

A Vite plugin that automatically adds `data-dyad-id` and `data-dyad-name` attributes to your React components. This is useful for identifying components in the DOM, for example for testing or analytics.

## Installation

```bash
npm install @dyad-sh/react-vite-component-tagger
# or
yarn add @dyad-sh/react-vite-component-tagger
# or
pnpm add @dyad-sh/react-vite-component-tagger
```

## Usage

Add the plugin to your `vite.config.ts` file:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dyadTagger from "@dyad-sh/react-vite-component-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dyadTagger()],
});
```

The plugin will automatically add `data-dyad-id` and `data-dyad-name` to all your React components.

The `data-dyad-id` will be a unique identifier for each component instance, in the format `path/to/file.tsx:line:column`.

The `data-dyad-name` will be the name of the component.

## Development

- Bump it to an alpha version and test in Dyad app, eg. `"version": "0.0.1-alpha.0",`

How to publish:

```sh
npm run prepublishOnly && npm publish
```
