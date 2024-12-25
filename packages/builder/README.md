# mt-custom-block-builder

Build Custom Block for Movable Type Block Editor via CLI

## Installation

```
npm install --save-dev @usualoma/mt-custom-block-builder
```

or just use npx:

```
npx @usualoma/mt-custom-block-builder
```

## Usage

### Configuration File

Create `mt-custom-block-builder.config.ts` in your project root:

```ts
import { defineConfig } from '@usualoma/mt-custom-block-builder';

export default defineConfig({
  blocks: [
    {
      input: "./src/example.json",
      script: "./src/example.ts",
      html: "./src/example.html",
      icon: "./src/example.svg",
      output: "./dist/example.json",
    },
    {
      input: "./src/custom.json",
      script: "./src/custom.ts",
      html: "./src/custom.html",
      icon: "./src/custom.svg",
      output: "./dist/custom.json",
    },
  ],
});
```

### Build Commands

Add build scripts to your package.json:

```json
{
  "scripts": {
    "build:app": "vite build",
    "build:plugin": "mt-plugin-builder build",
    "build": "npm run build:app && npm run build:plugin"
  }
}
```

## License

MIT
