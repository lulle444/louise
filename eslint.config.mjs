import nextConfig from "eslint-config-next";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextConfig,
  globalIgnores([
    "legacy/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
