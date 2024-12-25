import { defineConfig } from "@usualoma/mt-custom-block-builder";

export default defineConfig({
  blocks: [
    {
      input: "./src/block1.json",
      script: "./src/block1.ts",
      html: "./src/block1.html",
      icon: "./src/block1.svg",
      output: "./dist/block1.json",
    },
    {
      input: "./src/block2.json",
      script: "./src/block2.ts",
      html: "./src/block2.html",
      icon: "./src/block2.svg",
      output: "./dist/block2.json",
    },
  ],
});
