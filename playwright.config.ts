import { defineConfig } from "@playwright/test";

// End-to-end tests that drive the real app in a real browser — the level
// that caught the approval-resolution bug and the Tool Inspector layout
// bug that unit/integration tests (sharing one process) didn't. See
// docs/testing.md "Live verification".
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false, // tests share the seeded demo account
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
