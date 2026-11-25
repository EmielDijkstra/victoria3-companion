// Advice texts in Dutch and English. Game terms (building names, Construction, Tax Level …) stay
// English, as in the game. Every rule must have a text in both languages (checked by a test).
import type { Locale } from '../i18n/messages';
import type { BudgetGroupKey } from '../snapshot';
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
/** Keys whose game name is not simply the title-cased key. */
const NAME_EXCEPTIONS: Record<string, string> = { barrack: 'Barracks' };

export const gameName = (key: string) =>
	NAME_EXCEPTIONS[key] ??
	key
		.split('_')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

const unique = (items: string[]) => [...new Set(items)];

/** Budget groups as the player knows them. */
export const GROUP_NAME: Record<Locale, Record<BudgetGroupKey, string>> = {
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

/** What the player can do about a fixed cost, per group. */
const GROUP_ACTION: Record<Locale, Partial<Record<BudgetGroupKey, string>>> = {
	nl: {
		military:
			'Verlaag Military Wages in het Budget-scherm, of verminder Barracks die je in vrede niet nodig hebt.',
		government:
			'Kijk of je alle Government Administration-levels nodig hebt voor je Bureaucracy, en of Government Wages lager kan.',
		interest: 'Een positief saldo lost schuld af; de rente daalt dan vanzelf.',
		subsidies: 'Kijk in het Market-scherm welke subsidies je echt nodig hebt.'
	},
	en: {
		military:
			'Lower Military Wages in the Budget screen, or reduce Barracks you do not need in peacetime.',
		government:
			'Check whether you need every Government Administration level for your Bureaucracy, and whether Government Wages can go down.',
		interest: 'A positive balance pays off debt; the interest then falls by itself.',
		subsidies: 'Check in the Market screen which subsidies you really need.'
	}
};

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
	deficit: (a, l) => {
		const fromBuilding = (a.construction ?? 0) > 0 && (a.structuralBalance ?? -1) >= 0;
		const weeks =
			a.weeksToCreditLimit != null
				? ` Bij dit tempo raak je over ongeveer ${a.weeksToCreditLimit} weken je Credit Limit.`
				: '';
		if (fromBuilding)
			return {
				title: 'Je tekort komt door bouwen',
				why: `Je verliest ${money(-a.balance, l)} per week, maar je bouwmaterialen kosten ${money(a.construction ?? 0, l)} per week. Zonder bouw hou je ${money(a.structuralBalance ?? 0, l)} over: dit is een investering, geen lek.${weeks}`,
				caveat: `je schuld groeit wel (${a.debtPct}% van je Credit Limit). Bouw rustiger als die snel oploopt; zet niet alles stil, want dan stopt je groei.`,
				how: [
					'Open het Budget-scherm en vergelijk Construction met je andere uitgaven.',
					'Minder tekort: zet minder projecten tegelijk in de bouwlijst, of haal de minst nuttige eruit.'
				]
			};
		const top = a.topGroup;
		return {
			title: 'Je vaste lasten zijn hoger dan je inkomsten',
			why: `Je verliest ${money(-a.balance, l)} per week${(a.construction ?? 0) > 0 ? `, en ook zonder bouw blijft er ${money(-(a.structuralBalance ?? 0), l)} tekort` : ''}.${top ? ` Je grootste vaste post is ${GROUP_NAME.nl[top.key]}: ${top.sharePct}% van je vaste uitgaven${top.buildings.length ? ` (vooral ${list(top.buildings.map(gameName), 'nl')})` : ''}.` : ''}${weeks}`,
			caveat:
				'belasting verhogen helpt snel, maar je bevolking houdt minder over: de Standard of Living daalt en er komen Radicals bij. Kijk eerst of die grootste post nodig is.',
			how: [
				...(top && GROUP_ACTION.nl[top.key] ? [GROUP_ACTION.nl[top.key]!] : []),
				`Pas daarna: zet Tax Level een stap hoger${a.taxOption ? `, of heffen Consumption Tax op ${gameName(a.taxOption)}` : ''}.`
			]
		};
	},
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
		why: `Je Investment Pool bevat ${money(a.investmentPool, l)} die op private bouw wacht, maar je hebt maar ${a.sectorLevels} levels Construction Sector. Daardoor gaat alles langzaam.${a.waitingFor?.length ? ` Je private investeerders willen vooral ${list(a.waitingFor.map(gameName), l)} bouwen.` : ''}`,
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
	'trade-capacity-full': (a, _l, place) => ({
		title: 'Je Trade Capacity is vol',
		why: `In ${list(
			a.states.map((t) => `${place(t.state)} (${t.used}/${t.capacity})`),
			'nl'
		)} wordt alle Trade Capacity gebruikt. Meer handel kan er niet bij.${a.dearImports.length ? ` Intussen betaal je voor ${list(a.dearImports.map(gameName), 'nl')} meer dan op de wereldmarkt.` : ''}`,
		caveat:
			'Trade Centers hebben personeel nodig en kosten Merchant Marine. Bouw er één of twee levels bij en kijk dan opnieuw.',
		how: [
			`Klik op ${place(a.states[0].state)} op de kaart en open de tab Buildings.`,
			'Klik bij Trade Center op + om een level toe te voegen. Staat er nog geen, kies Trade Center in het bouwmenu.'
		]
	}),
	'subsidized-export': (a, l) => ({
		title: `Je subsidieert de import van ${list(
			a.goods.map((g) => gameName(g.good)),
			'nl'
		)}`,
		why: `Op de import van ${list(
			a.goods.map((g) => `${gameName(g.good)} (${gameName(g.policy)})`),
			'nl'
		)} betaal je subsidie, maar je exporteert ${a.goods.length === 1 ? 'het' : 'ze'} zelf (${list(
			a.goods.map((g) => `+${count(g.net, l)}`),
			'nl'
		)}). Die subsidie kost je geld zonder dat je het goed tekortkomt.`,
		caveat:
			'had je de subsidie bewust gezet, bijvoorbeeld voor een fabriek die het nodig heeft? Kijk dan eerst of die nog genoeg krijgt.',
		how: [
			'Open het Market-scherm en zoek het goed op.',
			'Zet de import op No Tariffs or Subventions (of een tarief).'
		]
	}),
	'import-what-you-make': (a, l) => ({
		title: `Maak meer ${gameName(a.good)} in plaats van te importeren`,
		why: `Je importeert ${count(a.imported, l)} ${gameName(a.good)}, terwijl je eigen gebouwen er ${count(a.produced, l)} maken. De prijs is ${decimal(a.price, l)} tegen een basisprijs van ${a.base} (+${a.vsBasePct}%): er is tekort.`,
		caveat: 'meer aanbod drukt de prijs. Breid één of twee levels uit en kijk dan opnieuw.',
		how: [
			`Zoek een gebouw dat ${gameName(a.good)} maakt (Buildings-tab van een staat).`,
			'Klik op + om een level toe te voegen, liefst in een staat met werklozen.'
		]
	}),
	'law-with-support': (a, l) => ({
		title: `Een wet met veel steun: ${a.law}`,
		why: `${a.law} (${a.groupName}) heeft meer steun dan je huidige ${a.current}.${
			a.for.length
				? ` Voor: ${list(
						a.for.map((x) => `${x.name}${x.strong ? ' (sterk)' : ''} ${decimal(x.cloutPct, l)}%`),
						'nl'
					)}.`
				: ''
		} ${
			a.against.length
				? `Tegen: ${list(
						a.against.map(
							(x) => `${x.name}${x.strong ? ' (sterk)' : ''} ${decimal(x.cloutPct, l)}%`
						),
						'nl'
					)}.`
				: 'Geen enkele Interest Group is tegen.'
		}`,
		caveat: `steun zegt of het haalbaar is, niet of het goed is voor je land. Lees eerst wat de wet doet (Leren → Wetten).${a.conditions ? ' Het spel kan nog extra voorwaarden stellen.' : ''}`,
		how: [
			'Open het Politics-scherm en kies de tab Laws.',
			`Zoek ${a.groupName}, kies ${a.law} en klik op Enact.`,
			'Invoeren duurt maanden; het lukt beter als Interest Groups in je regering ervoor zijn.'
		]
	}),
	'dear-basic-needs': (a) => ({
		title: `${a.need} is duur voor je arbeiders`,
		why: `De goederen voor ${a.need} kosten +${a.vsBasePct}% boven de basisprijs${
			a.goods.length
				? ` (${list(
						a.goods.map((gd) => `${gameName(gd.good)} +${gd.vsBasePct}%`),
						'nl'
					)})`
				: ''
		}. Arbeiders en boeren geven daar een groot deel van hun loon aan uit; dure basisbehoeften drukken hun Standard of Living.`,
		caveat:
			'meer aanbod drukt de prijs. Bouw er één of twee levels bij, of importeer het goedkoper.',
		how: [
			`Bouw of breid gebouwen uit die ${a.goods.length ? gameName(a.goods[0].good) : a.need} maken, liefst in een staat met werklozen.`,
			'Of verlaag in het Market-scherm het importtarief van dat goed.'
		]
	}),
	understaffed: (a, l, place) => ({
		title: `${gameName(a.building)} in ${place(a.buildingState)} blijft half leeg`,
		why: `Hij is maar voor ${a.staffingPct}% bezet, terwijl er in ${place(a.buildingState)} ${count(a.stateUnemployed, l)} mensen werk zoeken. Vaak ontbreken mensen met de juiste kwalificaties (geschoolde banen vragen geletterdheid), of betaalt het gebouw te weinig.`,
		caveat:
			'een gebouw neemt langzaam mensen aan. Is het net gebouwd of uitgebreid, geef het dan een paar maanden.',
		how: [
			'Open het gebouw en hover over het personeel: je ziet welke beroepen ontbreken.',
			'Ontbreken geschoolde mensen? Verhoog geletterdheid met scholen en de Institution Schools.'
		]
	}),
	'no-research': () => ({
		title: 'Je onderzoekt niets',
		why: 'Er staat geen technologie in onderzoek. Zo benut je je Innovation niet, en loop je achter op andere landen.',
		caveat: 'kies liefst iets wat je gebouwen of je wetten vooruit helpt (Leren → Technologie).',
		how: ['Open het Technology-scherm.', 'Kies een technologie en klik op Research.']
	}),
	'research-suggestion': (a) => ({
		title: `Overweeg ${a.tech} als volgend onderzoek`,
		why: `${a.tech} geeft de Production Method ${a.pm} aan je ${list(a.buildings.map(gameName), 'nl')} (samen ${a.levels} levels).${a.current ? ` Je onderzoekt nu ${a.current}; dat helpt minder van je gebouwen.` : ''}`,
		caveat:
			'een nieuwe Production Method gebruikt vaak andere grondstoffen. Kijk na het onderzoek of hij voor jou loont.',
		how: [
			'Open het Technology-scherm.',
			`Zoek ${a.tech} en klik op Research, of zet hem in de wachtrij.`
		]
	}),
	'separatism-support': (a) => ({
		title: `${a.country} steunt separatisme in jouw land`,
		why: `${a.country} steunt bewegingen die zich van je land willen afscheiden. Die worden daardoor sterker, vooral onder groepen die zich al achtergesteld voelen.${a.rival ? ` ${a.country} is ook je rivaal.` : ''}`,
		caveat:
			'tevreden minderheden zijn de beste verdediging: hun Standard of Living en je Citizenship-wet tellen mee.',
		how: [
			'Open het Politics-scherm en kijk bij Political Movements of er een afscheidingsbeweging groeit.',
			`Verbeter je relatie met ${a.country}, of zoek steun bij landen die je onafhankelijkheid garanderen.`
		]
	}),
	'unhappy-lobby': (a) => ({
		title: `De lobby ${a.pro ? 'voor' : 'tegen'} ${a.country} is ontevreden`,
		why: `${list(a.groups, 'nl')} ${a.groups.length === 1 ? 'wil' : 'willen'} ${a.pro ? 'betere banden' : 'meer afstand'} met ${a.country}, en vinden dat je daar te weinig aan doet. Hun Approval daalt.`,
		caveat: 'je hoeft niet alles te doen wat een lobby wil; weeg het af tegen je andere doelen.',
		how: [
			'Open het Politics-scherm en kies de lobby.',
			`Kijk welke acties de lobby tevreden maken, ${a.pro ? 'zoals relaties verbeteren of een verdrag sluiten' : 'zoals een rivaliteit of minder verdragen'}.`
		]
	}),
	'expense-jump': (a, l) => ({
		title: `${GROUP_NAME.nl[a.group].charAt(0).toUpperCase() + GROUP_NAME.nl[a.group].slice(1)} kost ineens meer`,
		why: `Sinds je vorige save (${a.since.split('.').slice(0, 3).reverse().join('-')}) kost ${GROUP_NAME.nl[a.group]} ${money(a.increase, l)} per week meer${a.buildings.length ? `, vooral ${list(a.buildings.map(gameName), 'nl')}` : ''}. Zo'n sprong is vaak de echte oorzaak van een slechter saldo.`,
		caveat:
			'was het een bewuste keuze, zoals een uitbreiding of hogere lonen? Dan is het geen probleem, zolang je saldo het draagt.',
		how: [
			'Open het Budget-scherm en kijk bij Expenses welke post gestegen is.',
			'Kijk wat je sinds die datum hebt gebouwd of veranderd (lonen, wetten, levels).'
		]
	}),
	'military-heavy': (a, l) => ({
		title: `Je leger kost ${a.sharePct}% van je vaste uitgaven`,
		why: `${
			a.buildings.length
				? `${list(
						a.buildings.map((b) => `${b.levels} levels ${gameName(b.type)}`),
						'nl'
					)} kosten`
				: 'Je leger kost'
		} samen ${money(a.perWeek, l)} per week.${a.guarantors.length ? ` Tegelijk ${a.guarantors.length === 1 ? 'garandeert' : 'garanderen'} ${list(a.guarantors, 'nl')} je onafhankelijkheid.` : ''}`,
		caveat:
			'een kleiner leger maakt je kwetsbaarder in een Diplomatic Play. Krimp alleen wat je in vrede niet nodig hebt.',
		how: [
			'Open het Budget-scherm en kijk wat Military Wages je kost.',
			'Verlaag Military Wages een stap, of verminder levels Barracks of Naval Administration.'
		]
	}),
	'input-premium': (a, l) => ({
		title: `Dure ${gameName(a.good)} maakt je ${gameName(a.building)} duurder`,
		why: `Omdat ${gameName(a.good)} boven de basisprijs zit, kost je ${gameName(a.building)} ${money(a.perWeek, l)} per week extra. Die kosten draagt je begroting.`,
		caveat: 'meer aanbod drukt de prijs voor iedereen in je markt, ook voor je bevolking.',
		how: [
			`Bouw of breid gebouwen uit die ${gameName(a.good)} maken.`,
			'Of verlaag het importtarief op dat goed in het Market-scherm.'
		]
	}),
	'new-production-methods': (a, _l, place) => ({
		title:
			a.methods.length === 1
				? `Nieuwe Production Method: ${a.methods[0].name}`
				: 'Nieuwe Production Methods beschikbaar',
		why: `Het spel heeft nieuwe Production Methods vrijgespeeld die je gebouwen nog niet gebruiken: ${list(
			a.methods.map(
				(m) =>
					`${m.name} voor je ${list(unique(m.buildings.map((b) => gameName(b.type))), 'nl')} in ${list(unique(m.buildings.map((b) => place(b.state))), 'nl')}`
			),
			'nl'
		)}. Nieuwere methoden leveren vaak meer op per werknemer, maar niet altijd.`,
		caveat:
			'ze gebruiken vaak andere of duurdere grondstoffen. Vergelijk eerst in de tooltip wat er verandert aan kosten en winst.',
		how: [
			`Klik op je ${gameName(a.methods[0].buildings[0].type)} in ${place(a.methods[0].buildings[0].state)} en open de Production Methods.`,
			`Kies ${a.methods[0].name}. De tooltip laat zien wat er verandert aan in- en uitvoer en winst.`,
			'Wordt een grondstof duurder of schaars? Zorg dan eerst dat je er genoeg van maakt of kunt kopen.'
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
	deficit: (a, l) => {
		const fromBuilding = (a.construction ?? 0) > 0 && (a.structuralBalance ?? -1) >= 0;
		const weeks =
			a.weeksToCreditLimit != null
				? ` At this pace you reach your Credit Limit in about ${a.weeksToCreditLimit} weeks.`
				: '';
		if (fromBuilding)
			return {
				title: 'Your deficit comes from construction',
				why: `You lose ${money(-a.balance, l)} per week, but your construction goods cost ${money(a.construction ?? 0, l)} per week. Without construction you keep ${money(a.structuralBalance ?? 0, l)}: this is an investment, not a leak.${weeks}`,
				caveat: `your debt does grow (${a.debtPct}% of your Credit Limit). Build more calmly if it rises fast; do not stop everything, or your growth stops too.`,
				how: [
					'Open the Budget screen and compare Construction with your other expenses.',
					'Less deficit: queue fewer projects at once, or remove the least useful ones.'
				]
			};
		const top = a.topGroup;
		return {
			title: 'Your fixed costs are higher than your income',
			why: `You lose ${money(-a.balance, l)} per week${(a.construction ?? 0) > 0 ? `, and even without construction ${money(-(a.structuralBalance ?? 0), l)} is missing` : ''}.${top ? ` Your largest fixed cost is ${GROUP_NAME.en[top.key]}: ${top.sharePct}% of your fixed expenses${top.buildings.length ? ` (mainly ${list(top.buildings.map(gameName), 'en')})` : ''}.` : ''}${weeks}`,
			caveat:
				'raising taxes helps quickly, but your people keep less: Standard of Living falls and Radicals grow. First check whether that largest cost is needed.',
			how: [
				...(top && GROUP_ACTION.en[top.key] ? [GROUP_ACTION.en[top.key]!] : []),
				`Only then: raise Tax Level one step${a.taxOption ? `, or add a Consumption Tax on ${gameName(a.taxOption)}` : ''}.`
			]
		};
	},
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
		why: `Your Investment Pool holds ${money(a.investmentPool, l)} waiting for private construction, but you only have ${a.sectorLevels} levels of Construction Sector. Everything goes slowly.${a.waitingFor?.length ? ` Your private investors mainly want to build ${list(a.waitingFor.map(gameName), l)}.` : ''}`,
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
	'trade-capacity-full': (a, _l, place) => ({
		title: 'Your Trade Capacity is full',
		why: `In ${list(
			a.states.map((t) => `${place(t.state)} (${t.used}/${t.capacity})`),
			'en'
		)} all Trade Capacity is in use. No more trade fits.${a.dearImports.length ? ` Meanwhile you pay more for ${list(a.dearImports.map(gameName), 'en')} than on the world market.` : ''}`,
		caveat:
			'Trade Centers need workers and use Merchant Marine. Add one or two levels and check again.',
		how: [
			`Click ${place(a.states[0].state)} on the map and open the Buildings tab.`,
			'Click + next to Trade Center to add a level. None there yet? Pick Trade Center in the build menu.'
		]
	}),
	'subsidized-export': (a, l) => ({
		title: `You subsidise imports of ${list(
			a.goods.map((g) => gameName(g.good)),
			'en'
		)}`,
		why: `You pay a subsidy on imports of ${list(
			a.goods.map((g) => `${gameName(g.good)} (${gameName(g.policy)})`),
			'en'
		)}, but you export ${a.goods.length === 1 ? 'it' : 'them'} yourself (${list(
			a.goods.map((g) => `+${count(g.net, l)}`),
			'en'
		)}). That subsidy costs money while you are not short of the good.`,
		caveat:
			'did you set it on purpose, e.g. for a factory that needs it? Check that it still gets enough first.',
		how: [
			'Open the Market screen and find the good.',
			'Set imports to No Tariffs or Subventions (or a tariff).'
		]
	}),
	'import-what-you-make': (a, l) => ({
		title: `Make more ${gameName(a.good)} instead of importing`,
		why: `You import ${count(a.imported, l)} ${gameName(a.good)} while your own buildings make ${count(a.produced, l)}. The price is ${decimal(a.price, l)} against a base price of ${a.base} (+${a.vsBasePct}%): there is a shortage.`,
		caveat: 'more supply lowers the price. Expand one or two levels and check again.',
		how: [
			`Find a building that makes ${gameName(a.good)} (Buildings tab of a state).`,
			'Click + to add a level, preferably in a state with unemployed people.'
		]
	}),
	'law-with-support': (a, l) => ({
		title: `A law with broad support: ${a.law}`,
		why: `${a.law} (${a.groupName}) has more support than your current ${a.current}.${
			a.for.length
				? ` For: ${list(
						a.for.map(
							(x) => `${x.name}${x.strong ? ' (strongly)' : ''} ${decimal(x.cloutPct, l)}%`
						),
						'en'
					)}.`
				: ''
		} ${
			a.against.length
				? `Against: ${list(
						a.against.map(
							(x) => `${x.name}${x.strong ? ' (strongly)' : ''} ${decimal(x.cloutPct, l)}%`
						),
						'en'
					)}.`
				: 'No interest group is against it.'
		}`,
		caveat: `support says whether it is feasible, not whether it is good for your country. Read what the law does first (Learn → Laws).${a.conditions ? ' The game may set extra conditions.' : ''}`,
		how: [
			'Open the Politics screen and choose the Laws tab.',
			`Find ${a.groupName}, choose ${a.law} and click Enact.`,
			'Enacting takes months; it goes better when interest groups in your government support it.'
		]
	}),
	'dear-basic-needs': (a) => ({
		title: `${a.need} is expensive for your workers`,
		why: `The goods for ${a.need} cost +${a.vsBasePct}% above the base price${
			a.goods.length
				? ` (${list(
						a.goods.map((gd) => `${gameName(gd.good)} +${gd.vsBasePct}%`),
						'en'
					)})`
				: ''
		}. Workers and peasants spend much of their income on it; expensive basic needs lower their Standard of Living.`,
		caveat: 'more supply lowers the price. Add one or two levels, or import it more cheaply.',
		how: [
			`Build or expand buildings that make ${a.goods.length ? gameName(a.goods[0].good) : a.need}, preferably in a state with unemployed people.`,
			'Or lower the import tariff of that good in the Market screen.'
		]
	}),
	understaffed: (a, l, place) => ({
		title: `${gameName(a.building)} in ${place(a.buildingState)} stays half empty`,
		why: `It is only ${a.staffingPct}% staffed, while ${count(a.stateUnemployed, l)} people in ${place(a.buildingState)} are looking for work. Often people with the right qualifications are missing (skilled jobs need literacy), or the building pays too little.`,
		caveat: 'a building hires slowly. If it was just built or expanded, give it a few months.',
		how: [
			'Open the building and hover over its staff: you see which professions are missing.',
			'Skilled people missing? Raise literacy with schools and the Schools institution.'
		]
	}),
	'no-research': () => ({
		title: 'You are not researching anything',
		why: 'No technology is being researched. That way you do not use your Innovation, and you fall behind other countries.',
		caveat: 'preferably pick something that helps your buildings or laws (Learn → Technology).',
		how: ['Open the Technology screen.', 'Choose a technology and click Research.']
	}),
	'research-suggestion': (a) => ({
		title: `Consider ${a.tech} as your next research`,
		why: `${a.tech} gives the Production Method ${a.pm} to your ${list(a.buildings.map(gameName), 'en')} (${a.levels} levels together).${a.current ? ` You are researching ${a.current} now; that helps fewer of your buildings.` : ''}`,
		caveat:
			'a new Production Method often uses other inputs. Check after the research whether it pays off for you.',
		how: [
			'Open the Technology screen.',
			`Find ${a.tech} and click Research, or add it to the queue.`
		]
	}),
	'separatism-support': (a) => ({
		title: `${a.country} supports separatism in your country`,
		why: `${a.country} backs movements that want to break away from your country. They grow stronger, especially among groups that already feel left behind.${a.rival ? ` ${a.country} is also your rival.` : ''}`,
		caveat:
			'content minorities are the best defence: their Standard of Living and your Citizenship law matter.',
		how: [
			'Open the Politics screen and check Political Movements for a growing secession movement.',
			`Improve your relations with ${a.country}, or seek support from countries that guarantee your independence.`
		]
	}),
	'unhappy-lobby': (a) => ({
		title: `The lobby ${a.pro ? 'for' : 'against'} ${a.country} is unhappy`,
		why: `${list(a.groups, 'en')} ${a.groups.length === 1 ? 'wants' : 'want'} ${a.pro ? 'closer ties' : 'more distance'} with ${a.country} and feel you do too little about it. Their Approval drops.`,
		caveat: 'you do not have to do everything a lobby wants; weigh it against your other goals.',
		how: [
			'Open the Politics screen and choose the lobby.',
			`See which actions please the lobby, ${a.pro ? 'such as improving relations or signing a treaty' : 'such as a rivalry or fewer treaties'}.`
		]
	}),
	'expense-jump': (a, l) => ({
		title: `${GROUP_NAME.en[a.group].charAt(0).toUpperCase() + GROUP_NAME.en[a.group].slice(1)} suddenly cost more`,
		why: `Since your previous save (${a.since.split('.').slice(0, 3).join('-')}) ${GROUP_NAME.en[a.group]} cost ${money(a.increase, l)} per week more${a.buildings.length ? `, mainly ${list(a.buildings.map(gameName), 'en')}` : ''}. A jump like this is often the real cause of a worse balance.`,
		caveat:
			'was it a deliberate choice, such as an expansion or higher wages? Then it is fine, as long as your balance can carry it.',
		how: [
			'Open the Budget screen and check under Expenses which item rose.',
			'Look at what you built or changed since that date (wages, laws, levels).'
		]
	}),
	'military-heavy': (a, l) => ({
		title: `Your army costs ${a.sharePct}% of your fixed expenses`,
		why: `${
			a.buildings.length
				? `${list(
						a.buildings.map((b) => `${b.levels} levels of ${gameName(b.type)}`),
						'en'
					)} cost`
				: 'Your army costs'
		} ${money(a.perWeek, l)} per week together.${a.guarantors.length ? ` Meanwhile ${list(a.guarantors, 'en')} ${a.guarantors.length === 1 ? 'guarantees' : 'guarantee'} your independence.` : ''}`,
		caveat:
			'a smaller army makes you more vulnerable in a Diplomatic Play. Only cut what you do not need in peacetime.',
		how: [
			'Open the Budget screen and see what Military Wages cost you.',
			'Lower Military Wages one step, or reduce levels of Barracks or Naval Administration.'
		]
	}),
	'input-premium': (a, l) => ({
		title: `Expensive ${gameName(a.good)} makes your ${gameName(a.building)} cost more`,
		why: `Because ${gameName(a.good)} is above its base price, your ${gameName(a.building)} costs ${money(a.perWeek, l)} per week extra. Your budget pays for that.`,
		caveat: 'more supply lowers the price for everyone in your market, your people included.',
		how: [
			`Build or expand buildings that make ${gameName(a.good)}.`,
			'Or lower the import tariff on that good in the Market screen.'
		]
	}),
	'new-production-methods': (a, _l, place) => ({
		title:
			a.methods.length === 1
				? `New Production Method: ${a.methods[0].name}`
				: 'New Production Methods available',
		why: `The game unlocked Production Methods your buildings do not use yet: ${list(
			a.methods.map(
				(m) =>
					`${m.name} for your ${list(unique(m.buildings.map((b) => gameName(b.type))), 'en')} in ${list(unique(m.buildings.map((b) => place(b.state))), 'en')}`
			),
			'en'
		)}. Newer methods often produce more per worker, but not always.`,
		caveat:
			'they often use different or more expensive inputs. Compare the costs and profit in the tooltip first.',
		how: [
			`Click your ${gameName(a.methods[0].buildings[0].type)} in ${place(a.methods[0].buildings[0].state)} and open its Production Methods.`,
			`Choose ${a.methods[0].name}. The tooltip shows how inputs, outputs and profit change.`,
			'Does an input become more expensive or scarce? Make sure you produce or can buy enough of it first.'
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
