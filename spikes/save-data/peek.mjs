// Spike S6 (#25): look into a save converted with `rakaly json`. Not part of the app.
// Usage: node --max-old-space-size=4096 peek.mjs save.json <path> [depth]
//   <path> uses dots; "C" is the player's country, "PID" its id. Example: C.budget 2
import { readFileSync } from 'node:fs';

const [file, path = '', depthArg = '1'] = process.argv.slice(2);
const g = JSON.parse(readFileSync(file, 'utf8'));
const pid = String(Object.values(g.player_manager.database)[0].country);
const C = g.country_manager.database[pid];

function get(p) {
	const parts = p.split('.').filter(Boolean);
	let cur = g;
	if (parts[0] === 'C') {
		parts.shift();
		cur = C;
	}
	for (const part of parts) cur = cur?.[part === 'PID' ? pid : part];
	return cur;
}

function show(v, depth, indent = '') {
	if (v === null || typeof v !== 'object') return JSON.stringify(v);
	const entries = Array.isArray(v) ? v.map((x, i) => [i, x]) : Object.entries(v);
	if (depth <= 0) {
		const s = JSON.stringify(v);
		return s.length > 140 ? `${s.slice(0, 140)}… (${entries.length} items, ${s.length} chars)` : s;
	}
	const shown = entries.slice(0, 40);
	const lines = shown.map(([k, x]) => `${indent}  ${k}: ${show(x, depth - 1, indent + '  ')}`);
	if (entries.length > shown.length) lines.push(`${indent}  … ${entries.length - shown.length} more`);
	return `{\n${lines.join('\n')}\n${indent}}`;
}

console.log(`player ${pid}; ${path || '(root)'}:`, show(get(path), Number(depthArg)));
