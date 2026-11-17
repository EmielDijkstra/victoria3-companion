import { describe, expect, it } from 'vitest';
import {
	installDirFromManifest,
	libraryPaths,
	parseContinueGame,
	parseVdf,
	versionFromLauncherSettings
} from './game-paths';

// Shortened copies of real Steam files (own fixtures, no game data).
const LIBRARY_VDF = `
"libraryfolders"
{
	"0"
	{
		"path"		"C:\\\\Program Files (x86)\\\\Steam"
		"apps"
		{
			"220200"		"4967323428"
		}
	}
	"1"
	{
		"path"		"D:\\\\SteamLibrary"
		"apps"
		{
			"529340"		"13789982024"
		}
	}
}`;

const MANIFEST = `
"AppState"
{
	"appid"		"529340"
	"installdir"		"Victoria 3"
	"buildid"		"26591675"
}`;

describe('parseVdf', () => {
	it('parses nested keys and unescapes backslashes', () => {
		const vdf = parseVdf(LIBRARY_VDF) as { libraryfolders: Record<string, { path: string }> };
		expect(vdf.libraryfolders['0'].path).toBe('C:\\Program Files (x86)\\Steam');
		expect(vdf.libraryfolders['1'].path).toBe('D:\\SteamLibrary');
	});
});

describe('libraryPaths', () => {
	it('puts the library that contains Victoria 3 first', () => {
		expect(libraryPaths(LIBRARY_VDF)).toEqual([
			'D:\\SteamLibrary',
			'C:\\Program Files (x86)\\Steam'
		]);
	});

	it('returns nothing for unreadable input', () => {
		expect(libraryPaths('not a vdf')).toEqual([]);
	});
});

describe('installDirFromManifest', () => {
	it('reads the install folder name', () => {
		expect(installDirFromManifest(MANIFEST)).toBe('Victoria 3');
	});
});

describe('versionFromLauncherSettings', () => {
	it('reads rawVersion', () => {
		expect(
			versionFromLauncherSettings('{"version":"1.15.1 (Ivan-Chai)","rawVersion":"1.15.1"}')
		).toBe('1.15.1');
	});

	it('handles broken JSON', () => {
		expect(versionFromLauncherSettings('{')).toBeNull();
	});
});

describe('parseContinueGame', () => {
	it('reads the last save the game made', () => {
		const text = `{
	"title":	"autosave_exit",
	"desc":	"Playing as Belgium",
	"date":	"2026-10-03 17:30:48",
	"rawGameVersion":	"1.13.11"
}`;
		expect(parseContinueGame(text)).toEqual({
			title: 'autosave_exit',
			description: 'Playing as Belgium',
			date: '2026-10-03 17:30:48'
		});
	});
});
