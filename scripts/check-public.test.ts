import { describe, expect, it } from 'vitest';
// @ts-expect-error: plain JavaScript module without types
import { checkFiles } from './check-public.mjs';

const fakeRead = (texts: Record<string, string>) => (f: string) => texts[f] ?? '';
const small = () => 10;

describe('check-public', () => {
	it('accepts the normal project files', () => {
		const texts = {
			'README.md': 'Mail noreply@anthropic.com, path C:\\Users\\test\\Documents',
			'src/app.ts': 'const x = 1;'
		};
		expect(checkFiles(Object.keys(texts), fakeRead(texts), small)).toEqual([]);
	});

	it('catches personal notes, saves, keys, emails and personal paths', () => {
		const texts = {
			'Stappenplan.md': 'notes',
			'docs/save.v3': '',
			// Split, so this test file itself does not contain the examples
			'src/a.ts': `const key = '${'AIza' + 'SyA1234567890abcdefghijklmnopqrstu'}';`,
			'docs/b.md': `Mail me at ${'someone' + '@' + 'hotmail.com'}\n${'C:\\Users\\' + 'someone'}\\AppData`
		};
		const problems = checkFiles(Object.keys(texts), fakeRead(texts), small);
		expect(problems).toEqual([
			'Stappenplan.md: not an allowed file in the repository root',
			'docs/save.v3: file type does not belong in the repository',
			'src/a.ts:1: Google API key',
			'docs/b.md:1: email address',
			'docs/b.md:2: personal Windows path'
		]);
	});

	it('flags large files except the lock file', () => {
		const big = () => 600 * 1024;
		expect(checkFiles(['docs/huge.md', 'package-lock.json'], () => '', big)).toEqual([
			'docs/huge.md: larger than 500 KB'
		]);
	});
});
