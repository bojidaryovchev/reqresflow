import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    react({
      babel: process.env.E2E_COVERAGE
        ? {
            plugins: [
              [
                "istanbul",
                {
                  include: ["src/**/*.ts", "src/**/*.tsx"],
                  exclude: ["node_modules", "e2e", "test-results"],
                },
              ],
            ],
          }
        : {},
    }),
  ],
});
