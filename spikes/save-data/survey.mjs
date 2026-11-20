// Spike S6 (#25): for every section of the save, show one entry that belongs to the player's
// country, with its fields. Not part of the app.
// Usage: node --max-old-space-size=4096 survey.mjs save.json [section …]
import { readFileSync } from 'node:fs';

const [file, ...only] = process.argv.slice(2);
const g = JSON.parse(readFileSync(file, 'utf8'));
const pid = Object.values(g.player_manager.database)[0].country;

const OWNER_FIELDS = ['country', 'owner', 'country_id', 'first_country', 'target', 'initiator', 'source'];
const mine = (v) => v && typeof v === 'object' && OWNER_FIELDS.some((f) => v[f] === pid);
const short = (v) => {
	const s = JSON.stringify(v) ?? 'undefined';
	return s.length > 110 ? `${s.slice(0, 110)}…` : s;
};

for (const [section, value] of Object.entries(g)) {
	if (only.length && !only.includes(section)) continue;
	if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
	const db = value.database && typeof value.database === 'object' ? value.database : value;
	const entries = Object.entries(db);
	const own = entries.filter(([k, v]) => mine(v) || k === String(pid));
	const pick = own[0] ?? entries.find(([, v]) => v && typeof v === 'object');
	console.log(`\n## ${section}: ${entries.length} entries, ${own.length} of the player`);
	if (!pick) continue;
	const [key, entry] = pick;
	console.log(`  example ${key}${own.length ? ' (player)' : ''}:`);
	if (entry && typeof entry === 'object')
		for (const [k, v] of Object.entries(entry).slice(0, 45)) console.log(`    ${k}: ${short(v)}`);
	else console.log('    ' + short(entry));
}
