import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/.next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
