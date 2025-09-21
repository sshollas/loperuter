import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    exclude: ["tests/e2e.spec.ts"],
    setupFiles: [],
    alias: {
      "@": new URL("./", import.meta.url).pathname,
    },
  },
});
