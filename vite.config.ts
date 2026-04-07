import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: true,
    cssTarget: "chrome61",
    rollupOptions: {
      output: {
        format: "iife",
        entryFileNames: "assets/index.js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
