import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  use: { baseURL: "http://127.0.0.1:3102" },
  webServer: {
    command: "npm run dev -- --port 3102",
    cwd: "../frontend",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
