// Spike S5 (#4): fixed advice rules. Input: facts (see facts.mjs). Output: advice
// items, each with what / why (numbers from the save) / caveat / how in the game.
// Texts: Dutch explanation, English game terms.

// Which good a building mainly produces (only the ones we need for this spike).
const OUTPUT_GOOD = {
  paper_mill: "paper", explosives_factory: "explosives", tooling_workshop: "tools", steel_mill: "steel",
  textile_mill: "clothes", furniture_manufactory: "furniture", glassworks: "glass", logging_camp: "wood",
  coal_mine: "coal", iron_mine: "iron", sulfur_mine: "sulfur", food_industry: "groceries",
  chemical_plant: "fertilizer", motor_industry: "engines", arms_industry: "small_arms", shipyard: "clippers",
  livestock_ranch: "meat", wheat_farm: "grain", rye_farm: "grain", fishing_wharf: "fish",
};
const GOVERNMENT_LIKE = /^(government_administration|university|barrack|naval_|construction_sector|port|railway|army_logistics|naval_logistics|trade_center|urban_center|manor_house|financial_district|subsistence|company_)/;
const fmt = (n) => Math.round(n).toLocaleString("nl-NL");
const k = (n) => {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1e6) return `${sign}£${(a / 1e6).toLocaleString("nl-NL", { maximumFractionDigits: 2 })}M`;
  if (a >= 1000) return `${sign}£${(a / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })}K`;
  return `${sign}£${fmt(a)}`;
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const nice = (s) => s.split("_").map(cap).join(" ");

export function rules(f) {
  const out = [];
  const price = Object.fromEntries([...f.prices_most_expensive, ...f.prices_cheapest].map((p) => [p.good, p]));
  const statesByUnemployed = [...f.states].sort((a, b) => b.unemployed - a.unemployed);
  const mostUnemployed = statesByUnemployed[0];
  const e = f.economy;

  // R1: construction paused while there is a queue
  if (f.construction.all_paused && f.construction.government_queue.length > 0) {
    out.push({
      rule: "construction_paused", priority: 1, level: "urgent", topic: ["eerst", "bouwen", "schuld"],
      title: "Zet je bouwlijst weer aan",
      why: `Alle Construction staat op pauze terwijl er ${f.construction.government_queue.length} projecten wachten. Je Construction Sectors kosten je toch ${k(e.weekly_construction_goods_cost)} per week aan bouwmaterialen.`,
      caveat: `je weeksaldo is nu ${k(e.weekly_balance)}. Kijk na een paar weken of het positief blijft.`,
      how: ["Open het Construction-scherm (hamer in de onderbalk).", "Klik op Resume.", "Zet de minst nuttige projecten onderaan."],
    });
  }

  // R2: budget and debt
  if (e.weekly_balance < 0) {
    out.push({
      rule: "deficit", priority: 1, level: "urgent", topic: ["eerst", "schuld"],
      title: "Je begroting is negatief",
      why: `Je weekly balance is ${k(e.weekly_balance)}. Je schuld groeit (nu ${e.debt_pct_of_credit_limit}% van je Credit Limit).`,
      caveat: "bezuinigen op bouwen remt je groei; probeer eerst belasting of overheidsgebouwen.",
      how: ["Open het Budget-scherm.", "Verhoog Tax Level één stap, of verlaag de kosten van overheidsgebouwen."],
    });
  } else if (e.debt_pct_of_credit_limit >= 40) {
    out.push({
      rule: "debt_high", priority: 3, level: "warn", topic: ["schuld"],
      title: "Houd je schuld in de gaten",
      why: `Je schuld is ${k(e.debt)}: ${e.debt_pct_of_credit_limit}% van je Credit Limit (${k(e.credit_limit)}). Je weekly balance is wel positief (${k(e.weekly_balance)}), dus de schuld loopt langzaam terug.`,
      caveat: "boven 100% van je Credit Limit ga je in Default: alle bouw stopt en gebouwen produceren minder.",
      how: ["Houd je weekly balance positief; het overschot lost automatisch schuld af."],
    });
  }

  // R3: expand the most profitable producing building in the state with the most unemployed
  const producers = f.buildings.filter((b) => !GOVERNMENT_LIKE.test(b.type) && b.staffing_pct >= 80 && OUTPUT_GOOD[b.type]);
  const best = producers.find((b) => (price[OUTPUT_GOOD[b.type]]?.vs_base_pct ?? 0) > 10);
  if (best) {
    const p = price[OUTPUT_GOOD[best.type]];
    const queuedElsewhere = f.construction.government_queue.filter((q) => q.building === best.type && q.state !== mostUnemployed.state);
    out.push({
      rule: "expand_best", priority: 2, level: "slim", topic: ["eerst", "bouwen", "schuld"],
      title: `Breid je ${nice(best.type)} uit in ${nice(mostUnemployed.state)}`,
      why: `${nice(best.type)} in ${nice(best.state)} levert ${k(best.profit_per_level)} winst per level per week. ${nice(p.good)} kost ${p.price} tegen een basisprijs van ${p.base} (+${p.vs_base_pct}%): er is tekort. In ${nice(mostUnemployed.state)} zoeken ${fmt(mostUnemployed.unemployed)} mensen werk.` +
        (queuedElsewhere.length ? ` Je bouwlijst bevat er nu een in ${queuedElsewhere.map((q) => nice(q.state)).join(", ")}, waar minder werklozen zijn.` : ""),
      caveat: "meer aanbod drukt de prijs. Bouw er één of twee bij en kijk dan opnieuw.",
      how: [`Klik op ${nice(mostUnemployed.state)} en open de tab Buildings.`, `Klik bij ${nice(best.type)} op + om een level toe te voegen.`],
    });
  }

  // R4: new building with low staffing but a scarce output good: be patient
  for (const b of f.buildings.filter((b) => !GOVERNMENT_LIKE.test(b.type) && b.staffing_pct < 25 && OUTPUT_GOOD[b.type])) {
    const p = price[OUTPUT_GOOD[b.type]];
    if (p && p.vs_base_pct > 30) {
      out.push({
        rule: "be_patient", priority: 4, level: "geduld", topic: ["bouwen"],
        title: `Laat je ${nice(b.type)} groeien`,
        why: `${nice(b.type)} in ${nice(b.state)} heeft pas ${b.staffing_pct}% van zijn personeel en draait daardoor ${k(b.profit_per_week)} per week. ${nice(p.good)} is schaars (+${p.vs_base_pct}% boven de basisprijs). Vol bezet wordt hij winstgevend.`,
        caveat: "niet afbreken; geef hem een paar maanden.",
        how: [],
      });
    }
  }

  // R5: staffed private buildings that lose money
  for (const b of f.buildings.filter((b) => !GOVERNMENT_LIKE.test(b.type) && b.staffing_pct >= 50 && b.profit_per_week < 0)) {
    out.push({
      rule: "losing_building", priority: 3, level: "warn", topic: ["bouwen"],
      title: `${nice(b.type)} in ${nice(b.state)} draait verlies`,
      why: `Hij is voor ${b.staffing_pct}% bezet maar verliest ${k(-b.profit_per_week)} per week.` + (b.input_shortage_pct ? ` Er is ${b.input_shortage_pct}% tekort aan grondstoffen.` : ""),
      caveat: "kijk eerst of een andere Production Method goedkoper is voordat je afbreekt.",
      how: ["Open het gebouw en vergelijk de Production Methods.", "Helpt dat niet: verminder levels (Downsize)."],
    });
  }

  // R6: taxes very high while many radicals, and the budget allows it
  if (/very_high|high/.test(e.tax_level) && f.population.radicals_pct > 15 && e.weekly_balance > 0) {
    out.push({
      rule: "lower_tax", priority: 5, level: "overweeg", topic: ["radicals", "sol"],
      title: "Overweeg je belasting een stap te verlagen",
      why: `Je Tax Level staat op ${nice(e.tax_level)}. ${f.population.radicals_pct}% van je bevolking is Radical en je Standard of Living is ${f.population.standard_of_living_avg}. Hoge belasting maakt mensen armer en bozer.`,
      caveat: `minder belasting = minder inkomsten. Doe dit pas als je weekly balance (${k(e.weekly_balance)}) duidelijk positief blijft. Je schuld staat op ${e.debt_pct_of_credit_limit}% van je Credit Limit.`,
      how: ["Open het Budget-scherm.", "Zet Tax Level één stap lager."],
    });
  }

  // R7: big investment pool but few construction sectors
  if (e.investment_pool > 100000 && f.construction.construction_sector_levels < 10) {
    out.push({
      rule: "more_construction", priority: 3, level: "slim", topic: ["bouwen", "eerst"],
      title: "Bouw meer Construction Sectors",
      why: `Je Investment Pool bevat ${k(e.investment_pool)} die op private bouw wacht, maar je hebt maar ${f.construction.construction_sector_levels} levels Construction Sector. Daardoor gaat alles langzaam.`,
      caveat: "Construction Sectors kosten elke week bouwmaterialen; eerst je weekly balance positief houden.",
      how: [`Klik op ${nice(mostUnemployed.state)} → Buildings → Construction Sector → +.`],
    });
  }

  // R8: unhappy and powerful interest groups
  for (const ig of f.interest_groups.filter((ig) => ig.approval <= -5 && ig.clout_pct >= 10)) {
    out.push({
      rule: "angry_ig", priority: 3, level: "warn", topic: ["radicals", "wetten"],
      title: `${nice(ig.group)} zijn boos en machtig`,
      why: `Approval ${ig.approval}, Clout ${ig.clout_pct}%. Boze, machtige Interest Groups kunnen een opstand starten.`,
      caveat: "",
      how: ["Open de Interest Groups-tab en kijk welke wetten ze willen."],
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

// Map a question to the rule topics that can (partly) answer it.
export const QUESTION_TOPICS = {
  eerst: "eerst", bouwen: "bouwen", schuld: "schuld", radicals: "radicals", wetten: "wetten", sol: "sol",
};
