import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  use: { baseURL: "http://127.0.0.1:3112" },
  webServer: {
    command: "npm run dev:test",
    cwd: "../frontend",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
