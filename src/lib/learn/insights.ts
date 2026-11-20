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
