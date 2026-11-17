import { defineConfig } from '@playwright/test';

// End-to-end tests of the overlay page in a browser. Electron is replaced by a fake bridge
// (see e2e/fake-bridge.ts), so no save, Rakaly or game is needed, also not in CI.
export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.test.ts',
	webServer: {
		command: 'npm run build:web && npx vite preview --port 4180 --strictPort',
		port: 4180,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	},
	use: {
		baseURL: 'http://localhost:4180',
		viewport: { width: 400, height: 900 }
	}
});
