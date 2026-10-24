import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Les essais qui font vivre LIA des minutes sous horloge simulée prennent 2 à 3 s seuls, bien plus sur un robot chargé.
    testTimeout: 30_000,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
