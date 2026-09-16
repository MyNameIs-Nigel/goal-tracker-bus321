import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      // See vitest.server-only-shim.ts.
      "server-only": new URL("./vitest.server-only-shim.ts", import.meta.url)
        .pathname,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Unit and component tests are `*.test.ts(x)`; `e2e/*.spec.ts` belongs to
    // Playwright and must not be collected here (docs/TESTING.md).
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
    },
  },
});
