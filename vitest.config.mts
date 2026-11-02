import { defineConfig } from "vitest/config";

// Unit tests only: pure functions and Zod schemas (Doc/testing.md §2).
// No database, network, session or Next.js runtime, so the plain Node environment is enough.
export default defineConfig({
  resolve: {
    // Vite 8 reads the `@/*` → `src/*` alias from tsconfig.json, so tests import like app code.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    // Tests live next to the file they test, as `<file>.test.ts`.
    include: ["src/**/*.test.ts"],
  },
});
