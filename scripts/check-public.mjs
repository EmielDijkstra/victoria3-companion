// Keeps things that do not belong in a public repository out: personal notes, saves, executables,
// logs, large files, email addresses, personal Windows paths and API keys.
//
// Locally it also checks files that are not yet added to git (but not ignored), so a personal file
// in the folder is caught before it ends up in a commit. In CI it checks what is committed.
// Run: node scripts/check-public.mjs  (part of `npm run lint`)
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

/** Files allowed in the root of the repository; anything else must live in a folder. */
const ROOT_FILES = new Set([
	'.env.example',
	'.gitattributes',
	'.gitignore',
	'.prettierignore',
	'CLAUDE.md',
	'CONTRIBUTING.md',
	'LICENSE',
	'README.md',
	'README.nl.md',
	'SECURITY.md',
	'eslint.config.js',
	'package-lock.json',
	'package.json',
	'playwright.config.ts',
	'prettier.config.js',
	'tsconfig.json',
	'vite.config.ts'
]);

/** Folders where new top-level entries may appear. */
const ROOT_DIRS = new Set([
	'.github',
	'docs',
	'e2e',
	'electron',
	'scripts',
	'spikes',
	'src',
	'static'
]);

const FORBIDDEN_EXT =
	/\.(v3|exe|dll|msi|zip|7z|rar|log|sqlite|db|env|pdf|docx?|xlsx?|pptx?|psd|mp4|mov)$/i;
const MAX_BYTES = 500 * 1024;
const LARGE_ALLOWED = new Set(['package-lock.json']);

const CONTENT_RULES = [
	{
		name: 'email address',
		re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
		allow: (m) => /noreply|@example\.(com|org)$|@users\.noreply\.github\.com$/i.test(m)
	},
	{
		name: 'personal Windows path',
		re: /[A-Za-z]:[\\/]+Users[\\/]+([^\\/\s'"`%<>]+)/gi,
		allow: (_m, user) => /^(test|public|default|user|username|you|<.*>|\.\.\.|…)$/i.test(user)
	},
	{ name: 'Google API key', re: /AIza[0-9A-Za-z_-]{30,}/g },
	{ name: 'OpenAI/Anthropic key', re: /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/g },
	{ name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}/g },
	{ name: 'Groq key', re: /\bgsk_[A-Za-z0-9]{30,}/g },
	{ name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g }
];

const TEXT_EXT = /\.(md|ts|js|mjs|cjs|svelte|json|yml|yaml|html|css|txt|example)$/i;

function listFiles(includeUntracked) {
	const args = ['ls-files', '-z', '--cached'];
	if (includeUntracked) args.push('--others', '--exclude-standard');
	const out = execFileSync('git', args, { encoding: 'utf8' });
	return [...new Set(out.split('\0').filter(Boolean))];
}

export function checkFiles(
	files,
	read = (f) => readFileSync(f, 'utf8'),
	size = (f) => statSync(f).size
) {
	const problems = [];
	for (const file of files) {
		const [top, ...rest] = file.split('/');
		if (rest.length === 0 && !ROOT_FILES.has(file))
			problems.push(`${file}: not an allowed file in the repository root`);
		if (rest.length > 0 && !ROOT_DIRS.has(top))
			problems.push(`${file}: "${top}/" is not a known top-level folder`);
		if (FORBIDDEN_EXT.test(file) && file !== '.env.example')
			problems.push(`${file}: file type does not belong in the repository`);
		let bytes;
		try {
			bytes = size(file);
		} catch {
			continue; // deleted in the working tree
		}
		if (bytes > MAX_BYTES && !LARGE_ALLOWED.has(file))
			problems.push(`${file}: larger than ${MAX_BYTES / 1024} KB`);
		if (!TEXT_EXT.test(file) || file === 'package-lock.json' || file.endsWith('package-lock.json'))
			continue;
		const text = read(file);
		for (const rule of CONTENT_RULES) {
			for (const m of text.matchAll(rule.re)) {
				if (rule.allow?.(m[0], m[1])) continue;
				const line = text.slice(0, m.index).split('\n').length;
				problems.push(`${file}:${line}: ${rule.name}`);
			}
		}
	}
	return problems;
}

// Run as a script (not when imported by the test)
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^\/?/, '/')}`) {
	const ci = Boolean(process.env.CI);
	const problems = checkFiles(listFiles(!ci));
	if (problems.length > 0) {
		console.error('check-public: these do not belong in a public repository:');
		for (const p of problems) console.error(`  - ${p}`);
		console.error(
			'Move personal files out of the repository folder, or add an ignore rule if they are local tools.'
		);
		process.exit(1);
	}
	console.log('check-public: ok');
}
