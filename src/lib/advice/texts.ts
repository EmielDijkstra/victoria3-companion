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

type Writer<T extends AdviceId> = (a: Extract<Advice, { id: T }>, l: Locale) => AdviceText;
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
	'expand-best': (a, l) => ({
		title: `Breid je ${gameName(a.building)} uit in ${gameName(a.targetState)}`,
		why:
			`${gameName(a.building)} in ${gameName(a.buildingState)} levert ${money(a.profitPerLevel, l)} winst per level per week. ` +
			`${gameName(a.good)} kost ${decimal(a.price, l)} tegen een basisprijs van ${a.base} (+${a.vsBasePct}%): er is tekort. ` +
			`In ${gameName(a.targetState)} zoeken ${count(a.unemployed, l)} mensen werk.` +
			(a.queuedElsewhere.length
				? ` Je bouwlijst heeft er nu een in ${list(a.queuedElsewhere.map(gameName), l)}, waar minder mensen werk zoeken.`
				: ''),
		caveat: 'meer aanbod drukt de prijs. Bouw er één of twee bij en kijk dan opnieuw.',
		how: [
			`Klik op ${gameName(a.targetState)} op de kaart en open de tab Buildings.`,
			`Klik bij ${gameName(a.building)} op + om een level toe te voegen.`
		]
	}),
	unemployment: (a, l) => ({
		title: `Zorg voor werk in ${gameName(a.targetState)}`,
		why: `${count(a.unemployed, l)} mensen in je land zoeken werk (${decimal(a.unemployedPct, l)}% van je bevolking), waarvan ${count(a.stateUnemployed, l)} in ${gameName(a.targetState)}. Werklozen verdienen weinig en worden sneller Radical.`,
		caveat: 'bouw iets wat winst maakt; een gebouw met verlies lost werkloosheid maar kort op.',
		how: [
			`Klik op ${gameName(a.targetState)} en open de tab Buildings.`,
			'Kies een gebouw dat in je land goed verdient en voeg een level toe.'
		]
	}),
	'more-construction': (a, l) => ({
		title: 'Bouw meer Construction Sectors',
		why: `Je Investment Pool bevat ${money(a.investmentPool, l)} die op private bouw wacht, maar je hebt maar ${a.sectorLevels} levels Construction Sector. Daardoor gaat alles langzaam.`,
		caveat: 'Construction Sectors kosten elke week bouwmaterialen; houd je weeksaldo positief.',
		how: ['Klik op een staat met veel werklozen → Buildings → Construction Sector → +.']
	}),
	'be-patient': (a, l) => ({
		title: `Laat je ${gameName(a.building)} groeien`,
		why: `${gameName(a.building)} in ${gameName(a.buildingState)} heeft pas ${a.staffingPct}% van zijn personeel en draait daardoor ${money(a.profitPerWeek, l)} per week. ${gameName(a.good)} is schaars (+${a.vsBasePct}% boven de basisprijs). Vol bezet wordt hij winstgevend.`,
		caveat: 'niet afbreken; geef hem een paar maanden.',
		how: []
	}),
	'losing-building': (a, l) => ({
		title: `${gameName(a.building)} in ${gameName(a.buildingState)} draait verlies`,
		why: `Hij is voor ${a.staffingPct}% bezet maar verliest ${money(a.loss, l)} per week.${a.inputShortagePct ? ` Er is ${a.inputShortagePct}% tekort aan grondstoffen.` : ''}`,
		caveat: 'kijk eerst of een andere Production Method goedkoper is voordat je afbreekt.',
		how: [
			'Open het gebouw en vergelijk de Production Methods.',
			'Helpt dat niet: verminder levels (Downsize).'
		]
	}),
	'government-inputs': (a) => ({
		title: `Tekort aan grondstoffen voor je ${gameName(a.building)}`,
		why: `${gameName(a.building)} in ${gameName(a.buildingState)} mist ${a.inputShortagePct}% van wat hij nodig heeft. Dan werkt hij slechter, terwijl je hem wel betaalt.`,
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
	'expand-best': (a, l) => ({
		title: `Expand your ${gameName(a.building)} in ${gameName(a.targetState)}`,
		why:
			`${gameName(a.building)} in ${gameName(a.buildingState)} makes ${money(a.profitPerLevel, l)} profit per level per week. ` +
			`${gameName(a.good)} costs ${decimal(a.price, l)} against a base price of ${a.base} (+${a.vsBasePct}%): there is a shortage. ` +
			`In ${gameName(a.targetState)}, ${count(a.unemployed, l)} people are looking for work.` +
			(a.queuedElsewhere.length
				? ` Your queue now has one in ${list(a.queuedElsewhere.map(gameName), l)}, where fewer people need jobs.`
				: ''),
		caveat: 'more supply lowers the price. Build one or two more, then check again.',
		how: [
			`Click ${gameName(a.targetState)} on the map and open the Buildings tab.`,
			`Click + next to ${gameName(a.building)} to add a level.`
		]
	}),
	unemployment: (a, l) => ({
		title: `Create jobs in ${gameName(a.targetState)}`,
		why: `${count(a.unemployed, l)} people in your country are looking for work (${decimal(a.unemployedPct, l)}% of your population), ${count(a.stateUnemployed, l)} of them in ${gameName(a.targetState)}. Unemployed people earn little and become Radical faster.`,
		caveat: 'build something profitable; a loss-making building only solves unemployment briefly.',
		how: [
			`Click ${gameName(a.targetState)} and open the Buildings tab.`,
			'Pick a building that earns well in your country and add a level.'
		]
	}),
	'more-construction': (a, l) => ({
		title: 'Build more Construction Sectors',
		why: `Your Investment Pool holds ${money(a.investmentPool, l)} waiting for private construction, but you only have ${a.sectorLevels} levels of Construction Sector. Everything goes slowly.`,
		caveat: 'Construction Sectors cost materials every week; keep your weekly balance positive.',
		how: ['Click a state with many unemployed → Buildings → Construction Sector → +.']
	}),
	'be-patient': (a, l) => ({
		title: `Let your ${gameName(a.building)} grow`,
		why: `${gameName(a.building)} in ${gameName(a.buildingState)} has only ${a.staffingPct}% of its workers and makes ${money(a.profitPerWeek, l)} per week. ${gameName(a.good)} is scarce (+${a.vsBasePct}% above the base price). Fully staffed it will be profitable.`,
		caveat: 'do not demolish it; give it a few months.',
		how: []
	}),
	'losing-building': (a, l) => ({
		title: `${gameName(a.building)} in ${gameName(a.buildingState)} loses money`,
		why: `It is ${a.staffingPct}% staffed but loses ${money(a.loss, l)} per week.${a.inputShortagePct ? ` It is ${a.inputShortagePct}% short of inputs.` : ''}`,
		caveat: 'first check whether another Production Method is cheaper before demolishing.',
		how: ['Open the building and compare Production Methods.', 'If that does not help: Downsize.']
	}),
	'government-inputs': (a) => ({
		title: `Your ${gameName(a.building)} is short of inputs`,
		why: `${gameName(a.building)} in ${gameName(a.buildingState)} misses ${a.inputShortagePct}% of what it needs. It works worse while you still pay for it.`,
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

export function adviceText(advice: Advice, locale: Locale): AdviceText {
	const write = ADVICE_TEXTS[locale][advice.id] as Writer<typeof advice.id>;
	return write(advice as never, locale);
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
