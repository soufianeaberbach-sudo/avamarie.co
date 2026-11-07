import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:8080', launchOptions: { executablePath: process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args: ['--no-sandbox'] } },
  webServer: [
    { command: 'python3 -m http.server 8080 --bind 127.0.0.1 --directory dist', url: 'http://127.0.0.1:8080', reuseExistingServer: false, stdout: 'ignore', stderr: 'ignore' },
    { command: 'npx wrangler dev --local --port 8787 --inspector-port 0', url: 'http://127.0.0.1:8787', reuseExistingServer: false, stdout: 'ignore', stderr: 'ignore', timeout: 90000 },
  ],
});
