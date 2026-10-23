import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/react.tsx", "src/blocs/index.ts", "src/etat-http.ts", "src/boot.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  external: ["react"],
});
