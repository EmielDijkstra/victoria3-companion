// Advice texts in Dutch and English. Game terms (building names, Construction, Tax Level …) stay
// English, as in the game. Every rule must have a text in both languages (checked by a test).
import type { Locale } from '../i18n/messages';
import type { Advice, AdviceId, AdviceLevel } from './rules';

export interface AdviceText {
	title: string;
	why: string;
	caveat?: string;
	/** Steps in the game; empty when there is nothing to click */
	how: string[];
}

// ---- formatting helpers ----

const numberLocale = (l: Locale) => (l === 'nl' ? 'nl-NL' : 'en-GB');

/** £2,5K / £2.5K, £2,02M / £2.02M */
export function money(n: number, l: Locale): string {
	const sign = n < 0 ? '−' : '';
	const a = Math.abs(n);
	const fmt = (x: number, digits: number) =>
		x.toLocaleString(numberLocale(l), { maximumFractionDigits: digits });
	if (a >= 1e6) return `${sign}£${fmt(a / 1e6, 2)}M`;
	if (a >= 1000) return `${sign}£${fmt(a / 1000, 1)}K`;
	return `${sign}£${fmt(a, 0)}`;
}

export const count = (n: number, l: Locale) => Math.round(n).toLocaleString(numberLocale(l));
export const decimal = (n: number, l: Locale) =>
	n.toLocaleString(numberLocale(l), { maximumFractionDigits: 1 });

/** paper_mill → Paper Mill, flanders → Flanders, very_high → Very High */
export const gameName = (key: string) =>
	key
		.split('_')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

const list = (items: string[], l: Locale) =>
	items.length <= 1
		? items.join('')
		: `${items.slice(0, -1).join(', ')} ${l === 'nl' ? 'en' : 'and'} ${items.at(-1)}`;

// ---- texts per rule ----

/** Turns a state key into a name; marks the player's part of a split state. */
export type Place = (stateKey: string) => string;

type Writer<T extends AdviceId> = (
	a: Extract<Advice, { id: T }>,
	l: Locale,
	place: Place
) => AdviceText;
type Table = { [K in AdviceId]: Writer<K> };

const nl: Table = {
	'construction-paused': (a, l) => ({
		title: 'Zet je bouwlijst weer aan',
		why: `Alle Construction staat op pauze terwijl er ${a.queued} projecten wachten. Je Construction Sectors kosten je toch ${money(a.costPerWeek, l)} per week aan bouwmaterialen: je betaalt voor stilstand.`,
		caveat: `je weeksaldo is nu ${money(a.balance, l)}. Kijk na een paar weken of het positief blijft.`,
		how: [
			'Open het Construction-scherm (hamer in de onderbalk).',
			'Klik op Resume.',
			'Zet de minst nuttige projecten onderaan.'
		]
	}),
	deficit: (a, l) => ({
		title: 'Je begroting is negatief',
		why: `Je verliest ${money(-a.balance, l)} per week. Je schuld groeit; die staat nu op ${a.debtPct}% van je Credit Limit.`,
		caveat: 'minder bouwen remt je groei. Kijk eerst naar belasting en overheidsgebouwen.',
		how: [
			'Open het Budget-scherm.',
			'Zet Tax Level een stap hoger, of verlaag de kosten van overheidsgebouwen.'
		]
	}),
	'debt-high': (a, l) => ({
		title: a.level === 'urgent' ? 'Je schuld is gevaarlijk hoog' : 'Houd je schuld in de gaten',
		why: `Je schuld is ${money(a.debt, l)}: ${a.debtPct}% van je Credit Limit (${money(a.credit, l)}).${a.balance > 0 ? ` Je weeksaldo is positief (${money(a.balance, l)}), dus de schuld loopt langzaam terug.` : ''}`,
		caveat:
			'boven 100% van je Credit Limit ga je in Default: alle bouw stopt en gebouwen produceren minder.',
		how: ['Houd je weeksaldo positief; het overschot lost automatisch schuld af.']
	}),
	'expand-best': (a, l, place) => ({
		title: `Breid je ${gameName(a.building)} uit in ${place(a.targetState)}`,
		why:
			`${gameName(a.building)} in ${place(a.buildingState)} levert ${money(a.profitPerLevel, l)} winst per level per week. ` +
			`${gameName(a.good)} kost ${decimal(a.price, l)} tegen een basisprijs van ${a.base} (+${a.vsBasePct}%): er is tekort. ` +
			`In ${place(a.targetState)} zoeken ${count(a.unemployed, l)} mensen werk.` +
			(a.queuedElsewhere.length
				? ` Je bouwlijst heeft er nu een in ${list(a.queuedElsewhere.map(place), l)}, waar minder mensen werk zoeken.`
				: ''),
		caveat: 'meer aanbod drukt de prijs. Bouw er één of twee bij en kijk dan opnieuw.',
		how: [
			`Klik op ${place(a.targetState)} op de kaart en open de tab Buildings.`,
			`Klik bij ${gameName(a.building)} op + om een level toe te voegen.`
		]
	}),
	unemployment: (a, l, place) => ({
		title: `Zorg voor werk in ${place(a.targetState)}`,
		why: `${count(a.unemployed, l)} mensen in je land zoeken werk (${decimal(a.unemployedPct, l)}% van je bevolking), waarvan ${count(a.stateUnemployed, l)} in ${place(a.targetState)}. Werklozen verdienen weinig en worden sneller Radical.`,
		caveat: 'bouw iets wat winst maakt; een gebouw met verlies lost werkloosheid maar kort op.',
		how: [
			`Klik op ${place(a.targetState)} en open de tab Buildings.`,
			'Kies een gebouw dat in je land goed verdient en voeg een level toe.'
		]
	}),
	'more-construction': (a, l, place) => ({
		title: 'Bouw meer Construction Sectors',
		why: `Je Investment Pool bevat ${money(a.investmentPool, l)} die op private bouw wacht, maar je hebt maar ${a.sectorLevels} levels Construction Sector. Daardoor gaat alles langzaam.`,
		caveat: 'Construction Sectors kosten elke week bouwmaterialen; houd je weeksaldo positief.',
		how: [
			a.targetState
				? `Bouw ze in ${place(a.targetState)}: daar zoeken ${count(a.stateUnemployed ?? 0, l)} mensen werk, dus de nieuwe levels raken snel bezet.`
				: 'Kies een staat met veel werklozen, dan raken de nieuwe levels snel bezet.',
			`Klik op ${a.targetState ? place(a.targetState) : 'die staat'} op de kaart en zoek in het staatvenster bij de gebouwen de Construction Sector. Klik op + om een level toe te voegen.`,
			'Staat er nog geen Construction Sector? Open het bouwmenu, kies Construction Sector en klik dan op de staat.',
			'Voeg er twee of drie tegelijk toe: elk level geeft meer Construction per week.',
			'Open je Construction Queue en zet ze bovenaan, zodat ze eerst gebouwd worden.',
			'Kijk na een paar weken of je weeksaldo positief blijft.'
		]
	}),
	'be-patient': (a, l, place) => ({
		title: `Laat je ${gameName(a.building)} groeien`,
		why: `${gameName(a.building)} in ${place(a.buildingState)} heeft pas ${a.staffingPct}% van zijn personeel en draait daardoor ${money(a.profitPerWeek, l)} per week. ${gameName(a.good)} is schaars (+${a.vsBasePct}% boven de basisprijs). Vol bezet wordt hij winstgevend.`,
		caveat: 'niet afbreken; geef hem een paar maanden.',
		how: []
	}),
	'losing-building': (a, l, place) => ({
		title: `${gameName(a.building)} in ${place(a.buildingState)} draait verlies`,
		why: `Hij is voor ${a.staffingPct}% bezet maar verliest ${money(a.loss, l)} per week.${a.inputShortagePct ? ` Er is ${a.inputShortagePct}% tekort aan grondstoffen.` : ''}`,
		caveat: 'kijk eerst of een andere Production Method goedkoper is voordat je afbreekt.',
		how: [
			'Open het gebouw en vergelijk de Production Methods.',
			'Helpt dat niet: verminder levels (Downsize).'
		]
	}),
	'government-inputs': (a, _l, place) => ({
		title: `Tekort aan grondstoffen voor je ${gameName(a.building)}`,
		why: `${gameName(a.building)} in ${place(a.buildingState)} mist ${a.inputShortagePct}% van wat hij nodig heeft. Dan werkt hij slechter, terwijl je hem wel betaalt.`,
		caveat: 'overheidsgebouwen gebruiken vooral Paper; zelf meer Paper maken helpt vaak.',
		how: [
			'Open het gebouw en kijk welke grondstof ontbreekt.',
			'Bouw die zelf, of zoek hem in het Market-scherm.'
		]
	}),
	'angry-ig': (a) => ({
		title: `${gameName(a.group)} zijn boos en machtig`,
		why: `Approval ${a.approval}, Clout ${a.cloutPct}%. Boze, machtige Interest Groups kunnen onrust en zelfs een opstand veroorzaken.`,
		caveat: 'je kunt niet iedereen tevreden houden; kies wie je nodig hebt.',
		how: ['Open de tab Interest Groups en kijk welke wetten ze willen of juist niet.']
	}),
	'lower-tax': (a, l) => ({
		title: 'Overweeg je belasting een stap te verlagen',
		why: `Je Tax Level staat op ${gameName(a.taxLevel)}. ${decimal(a.radicalsPct, l)}% van je bevolking is Radical en je Standard of Living is ${decimal(a.standardOfLiving, l)}. Hoge belasting maakt mensen armer en bozer.`,
		caveat: `minder belasting = minder inkomsten. Doe dit pas als je weeksaldo (${money(a.balance, l)}) duidelijk positief blijft; je schuld staat op ${a.debtPct}% van je Credit Limit.`,
		how: ['Open het Budget-scherm.', 'Zet Tax Level één stap lager.']
	})
};

const en: Table = {
	'construction-paused': (a, l) => ({
		title: 'Resume your construction queue',
		why: `All Construction is paused while ${a.queued} projects are waiting. Your Construction Sectors still cost you ${money(a.costPerWeek, l)} per week in materials: you are paying for nothing.`,
		caveat: `your weekly balance is now ${money(a.balance, l)}. Check after a few weeks that it stays positive.`,
		how: [
			'Open the Construction screen (hammer in the bottom bar).',
			'Click Resume.',
			'Move the least useful projects to the bottom.'
		]
	}),
	deficit: (a, l) => ({
		title: 'Your budget is negative',
		why: `You lose ${money(-a.balance, l)} per week. Your debt is growing; it is now ${a.debtPct}% of your Credit Limit.`,
		caveat: 'building less slows your growth. Look at taxes and government buildings first.',
		how: [
			'Open the Budget screen.',
			'Raise Tax Level one step, or lower government building costs.'
		]
	}),
	'debt-high': (a, l) => ({
		title: a.level === 'urgent' ? 'Your debt is dangerously high' : 'Keep an eye on your debt',
		why: `Your debt is ${money(a.debt, l)}: ${a.debtPct}% of your Credit Limit (${money(a.credit, l)}).${a.balance > 0 ? ` Your weekly balance is positive (${money(a.balance, l)}), so the debt is slowly going down.` : ''}`,
		caveat:
			'above 100% of your Credit Limit you go into Default: all construction stops and buildings produce less.',
		how: ['Keep your weekly balance positive; the surplus pays off debt automatically.']
	}),
	'expand-best': (a, l, place) => ({
		title: `Expand your ${gameName(a.building)} in ${place(a.targetState)}`,
		why:
			`${gameName(a.building)} in ${place(a.buildingState)} makes ${money(a.profitPerLevel, l)} profit per level per week. ` +
			`${gameName(a.good)} costs ${decimal(a.price, l)} against a base price of ${a.base} (+${a.vsBasePct}%): there is a shortage. ` +
			`In ${place(a.targetState)}, ${count(a.unemployed, l)} people are looking for work.` +
			(a.queuedElsewhere.length
				? ` Your queue now has one in ${list(a.queuedElsewhere.map(place), l)}, where fewer people need jobs.`
				: ''),
		caveat: 'more supply lowers the price. Build one or two more, then check again.',
		how: [
			`Click ${place(a.targetState)} on the map and open the Buildings tab.`,
			`Click + next to ${gameName(a.building)} to add a level.`
		]
	}),
	unemployment: (a, l, place) => ({
		title: `Create jobs in ${place(a.targetState)}`,
		why: `${count(a.unemployed, l)} people in your country are looking for work (${decimal(a.unemployedPct, l)}% of your population), ${count(a.stateUnemployed, l)} of them in ${place(a.targetState)}. Unemployed people earn little and become Radical faster.`,
		caveat: 'build something profitable; a loss-making building only solves unemployment briefly.',
		how: [
			`Click ${place(a.targetState)} and open the Buildings tab.`,
			'Pick a building that earns well in your country and add a level.'
		]
	}),
	'more-construction': (a, l, place) => ({
		title: 'Build more Construction Sectors',
		why: `Your Investment Pool holds ${money(a.investmentPool, l)} waiting for private construction, but you only have ${a.sectorLevels} levels of Construction Sector. Everything goes slowly.`,
		caveat: 'Construction Sectors cost materials every week; keep your weekly balance positive.',
		how: [
			a.targetState
				? `Build them in ${place(a.targetState)}: ${count(a.stateUnemployed ?? 0, l)} people are looking for work there, so the new levels fill up quickly.`
				: 'Pick a state with many unemployed, so the new levels fill up quickly.',
			`Click ${a.targetState ? place(a.targetState) : 'that state'} on the map and find the Construction Sector among the buildings in the state panel. Click + to add a level.`,
			'No Construction Sector there yet? Open the build menu, choose Construction Sector and then click the state.',
			'Add two or three at once: every level gives more Construction per week.',
			'Open your Construction Queue and move them to the top, so they are built first.',
			'Check after a few weeks whether your weekly balance stays positive.'
		]
	}),
	'be-patient': (a, l, place) => ({
		title: `Let your ${gameName(a.building)} grow`,
		why: `${gameName(a.building)} in ${place(a.buildingState)} has only ${a.staffingPct}% of its workers and makes ${money(a.profitPerWeek, l)} per week. ${gameName(a.good)} is scarce (+${a.vsBasePct}% above the base price). Fully staffed it will be profitable.`,
		caveat: 'do not demolish it; give it a few months.',
		how: []
	}),
	'losing-building': (a, l, place) => ({
		title: `${gameName(a.building)} in ${place(a.buildingState)} loses money`,
		why: `It is ${a.staffingPct}% staffed but loses ${money(a.loss, l)} per week.${a.inputShortagePct ? ` It is ${a.inputShortagePct}% short of inputs.` : ''}`,
		caveat: 'first check whether another Production Method is cheaper before demolishing.',
		how: ['Open the building and compare Production Methods.', 'If that does not help: Downsize.']
	}),
	'government-inputs': (a, _l, place) => ({
		title: `Your ${gameName(a.building)} is short of inputs`,
		why: `${gameName(a.building)} in ${place(a.buildingState)} misses ${a.inputShortagePct}% of what it needs. It works worse while you still pay for it.`,
		caveat: 'government buildings mainly use Paper; producing more Paper yourself often helps.',
		how: [
			'Open the building and see which input is missing.',
			'Build it yourself, or look for it in the Market screen.'
		]
	}),
	'angry-ig': (a) => ({
		title: `${gameName(a.group)} are angry and powerful`,
		why: `Approval ${a.approval}, Clout ${a.cloutPct}%. Angry, powerful Interest Groups can cause unrest and even a revolt.`,
		caveat: 'you cannot please everyone; choose who you need.',
		how: ['Open the Interest Groups tab and see which laws they want or oppose.']
	}),
	'lower-tax': (a, l) => ({
		title: 'Consider lowering your taxes one step',
		why: `Your Tax Level is ${gameName(a.taxLevel)}. ${decimal(a.radicalsPct, l)}% of your population is Radical and your Standard of Living is ${decimal(a.standardOfLiving, l)}. High taxes make people poorer and angrier.`,
		caveat: `lower taxes = less income. Only do this while your weekly balance (${money(a.balance, l)}) stays clearly positive; your debt is ${a.debtPct}% of your Credit Limit.`,
		how: ['Open the Budget screen.', 'Set Tax Level one step lower.']
	})
};

export const ADVICE_TEXTS: Record<Locale, Table> = { nl, en };

/**
 * Texts for one advice. `stateNames` comes from the snapshot: names as the game shows them,
 * e.g. "Belgian Gelre" for the player's part of a split state.
 */
export function adviceText(
	advice: Advice,
	locale: Locale,
	stateNames: Readonly<Record<string, string>> = {}
): AdviceText {
	const write = ADVICE_TEXTS[locale][advice.id] as Writer<typeof advice.id>;
	const place: Place = (key) => stateNames[key] ?? gameName(key);
	return write(advice as never, locale, place);
}

// ---- game version of the steps ----

/** "1.15.1" → "1.15": patches do not change screens, minor versions can. */
export const minorVersion = (v: string) => v.split('.').slice(0, 2).join('.');

/**
 * Game version (major.minor) in which the "how do I do that?" steps were checked by hand in the
 * game. Missing: written from knowledge, not yet checked. Add a rule here only after clicking
 * through the steps yourself.
 */
export const HOW_TO_CHECKED: Partial<Record<AdviceId, string>> = {
	'more-construction': '1.15'
};

export type HowToStatus =
	| { kind: 'checked'; version: string }
	| { kind: 'other-version'; checked: string; version: string }
	| { kind: 'unchecked'; version: string };

/** Whether the steps for this advice are known to match the player's game version. */
export function howToStatus(
	id: AdviceId,
	gameVersion: string,
	checked: Partial<Record<AdviceId, string>> = HOW_TO_CHECKED
): HowToStatus {
	const version = minorVersion(gameVersion);
	const done = checked[id];
	if (!done) return { kind: 'unchecked', version };
	return minorVersion(done) === version
		? { kind: 'checked', version }
		: { kind: 'other-version', checked: minorVersion(done), version };
}

/** Short label per level, shown above the title. */
export const LEVEL_LABEL: Record<Locale, Record<AdviceLevel, string>> = {
	nl: { urgent: 'Urgent', warn: 'Let op', smart: 'Slim', patience: 'Geduld', consider: 'Overweeg' },
	en: {
		urgent: 'Urgent',
		warn: 'Attention',
		smart: 'Smart',
		patience: 'Patience',
		consider: 'Consider'
	}
};
