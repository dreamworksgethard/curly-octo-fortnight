import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "js",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "js/explorer.js"),
      output: {
        entryFileNames: "explorer.bundle.js",
        format: "es",
        inlineDynamicImports: true,
      },
    },
  },
});
