// Spike S6 (#25): what the save knows about the player's country, per topic. Not part of the app.
// Usage: node --max-old-space-size=4096 player.mjs save.json
import { readFileSync } from 'node:fs';

const g = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const pid = Object.values(g.player_manager.database)[0].country;
const C = g.country_manager.database[pid];
const db = (s) => Object.entries(g[s]?.database ?? {}).filter(([, v]) => v && typeof v === 'object');
const by = (s, f = 'country') => db(s).filter(([, v]) => v[f] === pid);
const newest = (t) => {
	const ch = t?.channels?.['0'];
	return ch ? ch.values[(ch.index - 1 + ch.values.length) % ch.values.length] : undefined;
};
const out = (title, v) => console.log(`\n## ${title}\n` + JSON.stringify(v, null, 1).slice(0, 2500));

const myStates = new Set(C.states);

out('country fields with enact/research/law/tech', Object.keys(C).filter((k) => /enact|research|law|tech|innov|legit|authority|influence|bureau|prestige|infamy|rank|power|bloc|subject|overlord|war|claim/i.test(k)).map((k) => [k, JSON.stringify(C[k]).slice(0, 160)]));
out('all country keys', Object.keys(C));
out('interest groups', by('interest_groups').map(([, v]) => ({ ig: v.definition, approval: v.approval, state: v.approval_state, clout: +v.clout.toFixed(3), influence: v.influence_type, traits: v.enabled_traits })));
out('active laws', by('laws').filter(([, v]) => v.active).map(([, v]) => v.law));
out('law entries with extra fields', by('laws').filter(([, v]) => Object.keys(v).length > 3).slice(0, 5).map(([, v]) => v));
out('technology', by('technology').map(([, v]) => ({ ...v, acquired_technologies: `${v.acquired_technologies?.length} techs` })));
out('journal entries (active)', by('journal_entry_manager').filter(([, v]) => v.active).map(([, v]) => ({ type: v.type, added: v.date_added, value: v.baseline_value, goal: v.goal_value, keys: Object.keys(v) })));
out('objective (tutorial goals)', by('objective_manager').map(([, v]) => v));
out('institutions', by('institutions').map(([, v]) => v));
out('decrees', by('decree_manager', 'owner').map(([, v]) => v));
out('election', by('election_manager').map(([, v]) => ({ ...v, votes: v.votes?.length })));
out('parties', by('parties').filter(([, v]) => v.votes).map(([, v]) => v));
out('movements', by('political_movement_manager').map(([, v]) => ({ ideology: v.ideology, identity: v.identity, radicalism: v.radicalism, pops: v.pops?.length })));
out('treaties', db('treaty_manager').filter(([, v]) => v.first_country === pid || v.second_country === pid).map(([id, v]) => ({ id, ...v, name: undefined })));
out('treaty articles', db('treaty_article_manager').filter(([, v]) => v.source_country === pid || v.target_country === pid).map(([, v]) => v));
out('pacts', db('pacts').filter(([, v]) => v.targets?.first === pid || v.targets?.second === pid).map(([, v]) => v));
out('relations (top/bottom)', db('relations').filter(([, v]) => v.first?.country === pid || v.second?.country === pid).map(([, v]) => ({ other: v.first.country === pid ? v.second.country : v.first.country, relations: v.relations, keys: Object.keys(v) })).sort((a, b) => b.relations - a.relations));
out('diplomatic plays', db('diplomatic_plays').filter(([, v]) => JSON.stringify(v).includes(`"country":${pid}`) || v.initiator === pid || v.target === pid).map(([, v]) => v));
out('wars', db('war_manager').filter(([, v]) => JSON.stringify(v).includes(`:${pid}`)).length);
out('companies', by('companies').map(([, v]) => ({ type: v.company_type, prosperity: v.prosperity, profit: newest(v.profit_trend), charters: v.company_charters })));
out('power bloc', db('power_bloc_manager').filter(([, v]) => JSON.stringify(v.members ?? []).includes(pid) || v.leader === pid).map(([, v]) => v.name));
out('interests', by('interest_manager').map(([, v]) => v));
out('ai spending (authority etc.)', by('ai').map(([, v]) => v.spending_variables));
out('characters (ruler, heir)', [C.ruler, C.heir].map((id) => { const c = g.character_manager.database[id]; return c && Object.fromEntries(Object.entries(c).filter(([k]) => /name|role|traits|ideology|interest|age|birth/.test(k))); }));
// pops of the player: aggregate by type
const pops = {};
for (const [, p] of db('pops')) {
	const st = g.states.database[p.location];
	if (!st || st.country !== pid) continue;
	const t = (pops[p.type] ??= { workforce: 0, dependents: 0, literate: 0, sol: 0, n: 0 });
	t.workforce += p.workforce ?? 0; t.dependents += p.dependents ?? 0; t.literate += p.num_literate ?? 0; t.n++;
}
out('pops by type (player states)', pops);
out('state fields (one state)', Object.keys(g.states.database[C.states[0]]));
out('state pop_statistics keys', Object.keys(g.states.database[C.states[0]].pop_statistics));
out('country pop_statistics keys', Object.keys(C.pop_statistics));
out('trade per state', C.states.map((s) => { const st = g.states.database[s]; return { state: st.region, capacity: st.trade_capacity, used: st.trade_capacity_usage, infra: st.infrastructure, infraUsed: st.infrastructure_usage, trade: Object.fromEntries(Object.entries(st.trade?.goods ?? {}).map(([k, v]) => [k, v.value])) }; }));
out('tariffs', { import: C.import_tariffs, export: C.export_tariffs, taxed: C.taxed_goods });
out('investment pool by building', C.budget.investment);
out('budget income/expense arrays', { income: C.budget.weekly_income, expenses: C.budget.weekly_expenses });
out('world market hubs (player)', g.market_manager.world_market.active_world_market_hubs.filter((h) => myStates.has(h.state)).map((h) => ({ ...h, hub_connections: Object.keys(h.hub_connections ?? {}).length, keys: Object.keys(h) })));
