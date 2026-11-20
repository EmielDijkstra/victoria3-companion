import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA that Electron loads from disk (file://): one HTML file and hash routing.
			adapter: adapter({ fallback: 'index.html' }),
			router: { type: 'hash' }
		})
	],
	test: {
		expect: { requireAssertions: true },
		include: ['src/**/*.test.ts', 'electron/**/*.test.ts'],
		environment: 'node'
	}
});
