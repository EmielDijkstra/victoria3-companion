// What stands out in the player's country, per Learn topic: short explanations with at most the
// figure that triggers them. No overviews of figures: the game shows those itself.
import { gameName } from '../advice/texts';
import type { Locale } from '../i18n/messages';
import type { Snapshot } from '../snapshot';

type Place = (stateKey: string) => string;

const and = (l: Locale) => (l === 'nl' ? 'en' : 'and');
const list = (items: string[], l: Locale) =>
	items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${and(l)} ${items.at(-1)}`;
const pct = (n: number, l: Locale) =>
	n.toLocaleString(l === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: 0 });

/** Trade: what the country earns on, and what it has to buy abroad. */
export function tradeInsights(s: Snapshot, l: Locale): string[] {
	const trade = s.trade;
	if (!trade) return [];
	const out: string[] = [];
	const strong = trade.goods
		.filter((g) => g.net >= 5 && g.produced > 0)
		.sort((a, b) => b.net - a.net)
		.slice(0, 2)
		.map((g) => gameName(g.good));
	if (strong.length > 0) {
		out.push(
			l === 'nl'
				? `Je verdient aan de export van ${list(strong, l)}: die maak je zelf veel. Houd die gebouwen bezet en winstgevend.`
				: `You earn on exports of ${list(strong, l)}: you make plenty of them. Keep those buildings staffed and profitable.`
		);
	}
	const foreign = trade.goods
		.filter((g) => g.net <= -5 && g.produced === 0)
		.slice(0, 3)
		.map((g) => gameName(g.good));
	if (foreign.length > 0) {
		out.push(
			l === 'nl'
				? `${list(foreign, l)} koop je in het buitenland, omdat je ze zelf niet maakt. Dat is normaal, maar het kost Trade Capacity.`
				: `You buy ${list(foreign, l)} abroad because you do not make them. That is normal, but it uses Trade Capacity.`
		);
	}
	if (trade.partners.length === 0) {
		out.push(
			l === 'nl'
				? 'Je hebt geen handelsverdragen. Een verdrag met een grote handelspartner maakt handel voordeliger.'
				: 'You have no trade agreements. An agreement with a big trading partner makes trade more favourable.'
		);
	}
	return out;
}

/**
 * Laws: up to three unlocked laws with clearly more support than the current one, who is for and
 * against, and the game's own description of the law.
 */
export function lawInsights(
	s: Snapshot,
	l: Locale,
	descriptions: Readonly<Record<string, string>> = {},
	/** A law that already has its own advice: not repeated here */
	skip?: string
): string[] {
	return (s.laws ?? [])
		.flatMap((g) =>
			g.options
				.filter((o) => o.support >= g.activeSupport + 0.15 && o.support > 0)
				.map((o) => ({ g, o, gain: o.support - g.activeSupport }))
		)
		.filter(({ o }) => o.name !== skip)
		.sort((a, b) => b.gain - a.gain)
		.slice(0, 3)
		.map(({ g, o }) => {
			const names = (approve: boolean) =>
				o.stances
					.filter((st) =>
						approve ? !st.stance.includes('disapprove') : st.stance.includes('disapprove')
					)
					.slice(0, 3)
					.map((st) => st.name);
			const pro = names(true);
			const con = names(false);
			const who =
				l === 'nl'
					? `${pro.length ? `${list(pro, l)} ${pro.length === 1 ? 'is' : 'zijn'} ervoor` : 'Niemand is uitgesproken voor'}${con.length ? `, ${list(con, l)} ertegen` : ', niemand is ertegen'}.`
					: `${pro.length ? `${list(pro, l)} ${pro.length === 1 ? 'is' : 'are'} for it` : 'Nobody is clearly for it'}${con.length ? `, ${list(con, l)} against` : ', nobody is against'}.`;
			const what = descriptions[o.law] ? ` ${descriptions[o.law]}` : '';
			return l === 'nl'
				? `${o.name} in plaats van ${g.activeName}: ${who}${what}`
				: `${o.name} instead of ${g.activeName}: ${who}${what}`;
		});
}

/**
 * Technology: what spreads to the player by itself, and other useful research besides the one
 * that already has its own advice.
 */
export function techInsights(s: Snapshot, l: Locale, skip?: string): string[] {
	const tech = s.technology;
	if (!tech) return [];
	const out: string[] = [];
	if (tech.spreading.length > 0) {
		out.push(
			l === 'nl'
				? `${list(tech.spreading, l)} ${tech.spreading.length === 1 ? 'verspreidt' : 'verspreiden'} zich vanuit andere landen naar jou: daar krijg je vanzelf voortgang op.`
				: `${list(tech.spreading, l)} ${tech.spreading.length === 1 ? 'spreads' : 'spread'} to you from other countries: you gain progress on ${tech.spreading.length === 1 ? 'it' : 'them'} by itself.`
		);
	}
	for (const t of tech.suggestions
		.filter((x) => x.name !== skip && x.tech !== tech.researching?.tech)
		.slice(0, 2)) {
		const main = t.unlocks[0];
		const buildings = [
			...new Set(t.unlocks.filter((u) => u.pm === main.pm).map((u) => gameName(u.building)))
		];
		out.push(
			l === 'nl'
				? `Ook nuttig: ${t.name} geeft ${main.pm} aan je ${list(buildings, l)}.`
				: `Also useful: ${t.name} gives ${main.pm} to your ${list(buildings, l)}.`
		);
	}
	if (s.population.literacyPct < 50) {
		out.push(
			l === 'nl'
				? `Geletterdheid is ${pct(s.population.literacyPct, l)}%. Meer geletterdheid en Universities geven meer Innovation, dus sneller onderzoek.`
				: `Literacy is ${pct(s.population.literacyPct, l)}%. More literacy and Universities give more Innovation, so faster research.`
		);
	}
	return out;
}

/** Diplomacy: who your friends are, who protects you, and what your lobbies want. */
export function diplomacyInsights(s: Snapshot, l: Locale): string[] {
	const d = s.diplomacy;
	if (!d) return [];
	const out: string[] = [];
	const names = (refs: { name: string }[]) =>
		list(
			refs.map((r) => r.name),
			l
		);
	if (d.friends.length > 0) {
		out.push(
			l === 'nl'
				? `Je beste relaties heb je met ${names(d.friends)}: logische partners voor handel en verdragen.`
				: `Your best relations are with ${names(d.friends)}: natural partners for trade and treaties.`
		);
	}
	if (d.guarantors.length > 0) {
		out.push(
			l === 'nl'
				? `${names(d.guarantors)} ${d.guarantors.length === 1 ? 'garandeert' : 'garanderen'} je onafhankelijkheid. Wie jou bedreigt, krijgt met hen te maken.`
				: `${names(d.guarantors)} ${d.guarantors.length === 1 ? 'guarantees' : 'guarantee'} your independence. Whoever threatens you has to deal with them.`
		);
	}
	for (const lobby of d.lobbies.filter((x) => x.appeasement >= 0).slice(0, 2)) {
		out.push(
			l === 'nl'
				? `${list(lobby.groups, l)} ${lobby.groups.length === 1 ? 'vormt' : 'vormen'} een lobby ${lobby.pro ? 'voor' : 'tegen'} ${lobby.target.name}. ${lobby.pro ? 'Goede relaties en verdragen' : 'Afstand en rivaliteit'} met ${lobby.target.name} ${lobby.pro ? 'houden' : 'houdt'} hen tevreden.`
				: `${list(lobby.groups, l)} ${lobby.groups.length === 1 ? 'forms' : 'form'} a lobby ${lobby.pro ? 'for' : 'against'} ${lobby.target.name}. ${lobby.pro ? 'Good relations and treaties' : 'Distance and rivalry'} with ${lobby.target.name} keep them content.`
		);
	}
	const enemies = d.hostile.filter((h) => !d.separatism.some((x) => x.tag === h.tag));
	if (enemies.length > 0) {
		out.push(
			l === 'nl'
				? `Je relatie met ${names(enemies)} is slecht. Verwacht van hen geen steun.`
				: `Your relations with ${names(enemies)} are bad. Do not expect support from them.`
		);
	}
	return out;
}

const MONEY = (n: number, l: Locale) => {
	const a = Math.abs(n);
	const f = (x: number, d: number) =>
		x.toLocaleString(l === 'nl' ? 'nl-NL' : 'en-GB', { maximumFractionDigits: d });
	const v = a >= 1000 ? `£${f(a / 1000, 1)}K` : `£${f(a, 0)}`;
	return n < 0 ? `−${v}` : v;
};

const GROUPS: Record<Locale, Record<string, string>> = {
	nl: {
		military: 'het leger',
		government: 'overheidsgebouwen',
		construction: 'bouwen',
		interest: 'rente',
		subsidies: 'subsidies',
		other: 'overige posten'
	},
	en: {
		military: 'the army',
		government: 'government buildings',
		construction: 'construction',
		interest: 'interest',
		subsidies: 'subsidies',
		other: 'other items'
	}
};

/**
 * Budget: construction versus fixed costs, the largest fixed cost, a sudden change in the weekly
 * balance, how long a deficit lasts, and taxes that are still possible.
 */
export function budgetInsights(s: Snapshot, l: Locale): string[] {
	const b = s.budget;
	if (!b) return [];
	const out: string[] = [];
	const nl = l === 'nl';

	// 1. Construction versus fixed costs
	if (b.construction > 0) {
		out.push(
			nl
				? `Van je uitgaven gaat ${MONEY(b.construction, l)} per week naar bouwen. Zonder bouw is je saldo ${MONEY(b.structuralBalance, l)}: ${b.structuralBalance >= 0 ? 'je vaste lasten zijn gedekt' : 'ook je vaste lasten zijn niet gedekt'}.`
				: `Of your expenses, ${MONEY(b.construction, l)} per week goes to construction. Without it your balance is ${MONEY(b.structuralBalance, l)}: ${b.structuralBalance >= 0 ? 'your fixed costs are covered' : 'even your fixed costs are not covered'}.`
		);
	} else {
		out.push(
			nl
				? `Je bouwt nu niets, dus dit saldo (${MONEY(b.balance, l)}) is je structurele saldo. Bouwen kost straks geld, maar laat je economie groeien.`
				: `You are not building now, so this balance (${MONEY(b.balance, l)}) is your structural balance. Building will cost money, but makes your economy grow.`
		);
	}

	// 2. Largest fixed cost and what is behind it
	const fixed = b.groups.filter((g) => g.key !== 'construction');
	const total = fixed.reduce((n, g) => n + g.perWeek, 0);
	const top = fixed[0];
	if (top && total > 0) {
		const share = Math.round((top.perWeek / total) * 100);
		const behind = top.buildings
			.slice(0, 2)
			.map((x) => (x.levels ? `${x.levels} levels ${gameName(x.type)}` : gameName(x.type)));
		out.push(
			nl
				? `Je grootste vaste post is ${GROUPS.nl[top.key]}: ${share}% van je vaste uitgaven${behind.length ? ` (${list(behind, l)})` : ''}.`
				: `Your largest fixed cost is ${GROUPS.en[top.key]}: ${share}% of your fixed expenses${behind.length ? ` (${list(behind, l)})` : ''}.`
		);
	}

	// 3. A sudden change in the weekly balance
	let jump = { at: -1, from: 0, to: 0 };
	for (let i = 1; i < b.trend.length; i++) {
		const d = Math.abs(b.trend[i] - b.trend[i - 1]);
		if (d > Math.abs(jump.to - jump.from)) jump = { at: i, from: b.trend[i - 1], to: b.trend[i] };
	}
	const size = Math.abs(jump.to - jump.from);
	if (jump.at > 0 && size >= Math.max(2000, Math.abs(b.balance) * 0.3)) {
		const weeksAgo = b.trend.length - jump.at;
		const up = jump.to > jump.from;
		const hint =
			up && b.construction === 0 && s.construction.paused
				? nl
					? ' Je bouwlijst staat nu stil: als je toen de bouw pauzeerde, verklaart dat de sprong.'
					: ' Your construction is paused now: if you paused it then, that explains the jump.'
				: !up
					? nl
						? ' Kijk wat je rond die tijd bouwde of veranderde: lonen, wetten of nieuwe levels.'
						: ' Check what you built or changed around then: wages, laws or new levels.'
					: '';
		out.push(
			nl
				? `Ongeveer ${weeksAgo} weken geleden ${up ? 'steeg' : 'daalde'} je saldo in één week van ${MONEY(jump.from, l)} naar ${MONEY(jump.to, l)}.${hint}`
				: `About ${weeksAgo} weeks ago your balance ${up ? 'rose' : 'fell'} in one week from ${MONEY(jump.from, l)} to ${MONEY(jump.to, l)}.${hint}`
		);
	}

	// 4. How long a deficit lasts
	if (b.weeksToCreditLimit != null) {
		out.push(
			nl
				? `Bij dit tekort raak je over ongeveer ${b.weeksToCreditLimit} weken je Credit Limit; daarna volgt Default.`
				: `At this deficit you reach your Credit Limit in about ${b.weeksToCreditLimit} weeks; then comes Default.`
		);
	}

	// 5. Taxes that are still possible
	const options = b.consumptionTaxOptions.map((o) => gameName(o.good));
	if (options.length > 0) {
		out.push(
			nl
				? `Je kunt nog Consumption Tax heffen op ${list(options, l)} (tot ongeveer ${MONEY(b.consumptionTaxOptions[0].perWeek, l)} per week). Dat maakt die goederen duurder voor je bevolking.`
				: `You could still add a Consumption Tax on ${list(options, l)} (up to about ${MONEY(b.consumptionTaxOptions[0].perWeek, l)} per week). That makes those goods more expensive for your people.`
		);
	}
	return out;
}

/** Population: where people work, what is expensive for them, and what holds the country back. */
export function peopleInsights(s: Snapshot, l: Locale, place: Place): string[] {
	const people = s.people;
	const out: string[] = [];
	if (people) {
		const total = people.professions.reduce((n, p) => n + p.workforce, 0);
		const peasants = people.professions.find((p) => p.type === 'peasants')?.workforce ?? 0;
		const share = total > 0 ? (peasants / total) * 100 : 0;
		if (share >= 30) {
			out.push(
				l === 'nl'
					? `${pct(share, l)}% van je werkenden is Peasant. Zij leven van wat ze zelf maken en verdienen weinig. Elk gebouw dat loon betaalt, trekt hen naar beter werk.`
					: `${pct(share, l)}% of your workforce are Peasants. They live off what they make and earn little. Every building that pays wages draws them into better work.`
			);
		}
		// The dearest good across the basic needs, and the needs it makes more expensive
		const dear = people.needs
			.flatMap((n) => n.goods.map((g) => ({ ...g, need: n.name })))
			.sort((a, b) => b.vsBasePct - a.vsBasePct)[0];
		if (dear && dear.vsBasePct >= 15) {
			const needs = [
				...new Set(
					people.needs.filter((n) => n.goods.some((g) => g.good === dear.good)).map((n) => n.name)
				)
			];
			out.push(
				l === 'nl'
					? `${gameName(dear.good)} kost +${dear.vsBasePct}% boven de basisprijs. Daardoor ${needs.length === 1 ? 'wordt' : 'worden'} ${list(needs, l)} duurder voor je arbeiders en boeren.`
					: `${gameName(dear.good)} costs +${dear.vsBasePct}% above its base price. That makes ${list(needs, l)} more expensive for your workers and peasants.`
			);
		}
		const hungry = [...people.foodSecurity].sort((a, b) => a.value - b.value)[0];
		if (hungry && hungry.value < 0.5) {
			out.push(
				l === 'nl'
					? `In ${place(hungry.state)} kunnen mensen moeilijk genoeg eten kopen. Goedkoper voedsel daar voorkomt honger en onrust.`
					: `In ${place(hungry.state)} people struggle to buy enough food. Cheaper food there prevents hunger and unrest.`
			);
		}
	}
	if (s.population.literacyPct < 40) {
		out.push(
			l === 'nl'
				? `Geletterdheid is ${pct(s.population.literacyPct, l)}%. Voor geschoolde banen zoals Clerks en Engineers vind je dan moeilijk mensen.`
				: `Literacy is ${pct(s.population.literacyPct, l)}%. That makes it hard to fill skilled jobs such as Clerks and Engineers.`
		);
	}
	return out;
}
