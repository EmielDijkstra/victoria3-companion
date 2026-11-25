import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { fileState } from './companion';

describe('fileState', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'v3c-'));

	it('says ok for a readable file', () => {
		const file = path.join(dir, 'rakaly.exe');
		writeFileSync(file, 'x');
		expect(fileState(file)).toBe('ok');
	});

	it('gives the error code for a missing file, and flags a folder', () => {
		expect(fileState(path.join(dir, 'missing.exe'))).toBe('ENOENT');
		expect(fileState(dir)).toBe('not a file');
	});
});
