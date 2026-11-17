// Spike S5 (#4): build a compact "facts" snapshot of the player's country from a
// save that Rakaly converted to JSON. Both the rules and the AI get only these facts.
//
// Usage: node facts.mjs <save.json> <path-to-game>/common/goods/00_goods.txt > facts.json
import { readFileSync } from "node:fs";

const [savePath, goodsPath] = process.argv.slice(2);
if (!savePath || !goodsPath) {
  console.error("Gebruik: node facts.mjs <save.json> <00_goods.txt>");
  process.exit(1);
}

// Goods ids = order of definition in 00_goods.txt (see docs/save-structuur.md)
const goods = [];
let current = null;
for (const line of readFileSync(goodsPath, "utf8").split(/\r?\n/)) {
  const block = line.match(/^([a-z_]+)\s*=\s*\{/);
  if (block) {
    current = { name: block[1] };
    goods.push(current);
    continue;
  }
  const cost = line.match(/^\s+cost\s*=\s*([\d.]+)/);
  if (cost && current && current.cost === undefined) current.cost = Number(cost[1]);
}

const g = JSON.parse(readFileSync(savePath, "utf8"));
const playerId = Object.values(g.player_manager.database)[0].country;
const C = g.country_manager.database[playerId];
const round = (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d;
const sum = (a) => a.reduce((x, y) => x + y, 0);
// Ring-buffer time series: newest value is at (index - 1)
const newestChannel = (t) => {
  const ch = t.channels["0"];
  return ch.values[(ch.index - 1 + ch.values.length) % ch.values.length];
};
const stripPrefix = (s, p) => (s.startsWith(p) ? s.slice(p.length) : s);

const myStates = new Set(C.states);
const stateName = (id) => stripPrefix(g.states.database[id]?.region ?? String(id), "STATE_").toLowerCase();

// Prices in the player's market vs base price
const prices = Object.entries(C.budget.current_price_report.goods)
  .map(([id, v]) => {
    const good = goods[Number(id)];
    if (!good?.cost) return null;
    return { good: good.name, price: round(v.value, 1), base: good.cost, vs_base_pct: round((v.value / good.cost - 1) * 100) };
  })
  .filter(Boolean)
  .sort((a, b) => b.vs_base_pct - a.vs_base_pct);

// Buildings in the player's states, grouped per type + state
const buildings = Object.values(g.building_manager.database)
  .filter((b) => b && myStates.has(b.state) && b.levels)
  .map((b) => ({
    type: stripPrefix(b.building, "building_"),
    state: stateName(b.state),
    levels: b.levels,
    staffing_pct: round((b.staffing ?? 0) / b.levels * 100),
    profit_per_week: round(b.profit_after_reserves ?? 0),
    profit_per_level: round((b.profit_after_reserves ?? 0) / b.levels),
    input_shortage_pct: b.input_goods_shortage ? round(b.input_goods_shortage * 100) : 0,
    subsidized: Boolean(b.subsidized),
    production_methods: (b.production_methods ?? []).map((p) => stripPrefix(p, "pm_")),
  }))
  .sort((a, b) => b.profit_per_level - a.profit_per_level);

const states = C.states.map((id) => {
  const s = g.states.database[id];
  const ps = s.pop_statistics ?? {};
  return {
    state: stateName(id),
    population: round((ps.population_lower_strata ?? 0) + (ps.population_middle_strata ?? 0) + (ps.population_upper_strata ?? 0)),
    unemployed: ps.population_unemployed_workforce ?? 0,
    avg_wage: round(ps.wage ?? 0),
    infrastructure: round(s.infrastructure ?? 0),
    infrastructure_used: round(s.infrastructure_usage ?? 0),
    arable_land: s.arable_land,
  };
});

const interestGroups = Object.values(g.interest_groups.database)
  .filter((ig) => ig?.country === playerId)
  .map((ig) => ({
    group: stripPrefix(ig.definition, "ig_"),
    approval: ig.approval,
    clout_pct: round((ig.clout ?? 0) * 100, 1),
    influence: ig.influence_type,
    in_government: Boolean(ig.party) && undefined, // not reliably in save; omitted
  }))
  .map(({ in_government, ...rest }) => rest)
  .sort((a, b) => b.clout_pct - a.clout_pct);

const laws = Object.values(g.laws.database).filter((l) => l?.country === playerId);
const income = sum(C.budget.weekly_income);
const expenses = sum(C.budget.weekly_expenses);
const ps = C.pop_statistics;
const population = ps.population_lower_strata + ps.population_middle_strata + ps.population_upper_strata;

const facts = {
  source: "Victoria 3 save, converted with Rakaly; only the player's country",
  game_version: g.meta_data.version,
  date: g.date,
  country: { name: g.meta_data.name, tag: C.definition, rank: g.meta_data.rank, government: stripPrefix(C.government, "gov_"), ironman: g.meta_data.ironman },
  last_civil_war: C.last_civil_war_date ?? null,
  economy: {
    gdp_latest_sample: round(newestChannel(C.gdp)),
    gdp_note: "sampled about every 4 weeks; the live value in the game can differ",
    weekly_income: round(income),
    weekly_expenses: round(expenses),
    weekly_balance: round(income - expenses),
    treasury: round(C.budget.money),
    debt: round(C.budget.principal),
    credit_limit: round(C.budget.credit),
    debt_pct_of_credit_limit: round((C.budget.principal / C.budget.credit) * 100),
    tax_level: C.tax_level,
    taxed_goods: C.taxed_goods ?? [],
    investment_pool: round(C.budget.investment_pool),
    weekly_construction_goods_cost: round(sum(Object.values(C.budget.country_building_budget?.expenses?.construction_goods?.values ?? {}))),
  },
  population: {
    total: population,
    standard_of_living_avg: round(newestChannel(C.avgsoltrend), 2),
    literacy_pct: round(newestChannel(C.literacy) * 100, 1),
    radicals: ps.population_radicals,
    loyalists: ps.population_loyalists,
    radicals_pct: round((ps.population_radicals / population) * 100, 1),
    unemployed: ps.population_unemployed_workforce,
    unemployed_pct_of_population: round((ps.population_unemployed_workforce / population) * 100, 1),
  },
  construction: {
    all_paused: Boolean(C.construction_paused),
    construction_sector_levels: sum(buildings.filter((b) => b.type === "construction_sector").map((b) => b.levels)),
    government_queue: C.government_queue.construction_elements.map((e) => ({ building: stripPrefix(e.type, "building_"), state: stateName(e.state), construction_left: round(e.construction_left) })),
    private_queue: C.private_queue.construction_elements.map((e) => ({ building: stripPrefix(e.type, "building_"), state: stateName(e.state) })),
  },
  states,
  prices_most_expensive: prices.slice(0, 12),
  prices_cheapest: prices.slice(-10).reverse(),
  buildings,
  interest_groups: interestGroups,
  active_laws: laws.filter((l) => l.active).map((l) => stripPrefix(l.law, "law_")),
  laws_with_enactment_history: laws.filter((l) => !l.active && l.enactment_last_checkpoint_or_stop_date).map((l) => ({ law: stripPrefix(l.law, "law_"), last_checkpoint_or_stop: l.enactment_last_checkpoint_or_stop_date })),
};

process.stdout.write(JSON.stringify(facts, null, 2) + "\n");
