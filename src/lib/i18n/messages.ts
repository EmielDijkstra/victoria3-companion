// All texts of the overlay, in Dutch and English. Game terms stay English in both, as in the game.
// The English table must have exactly the same keys as the Dutch one (checked by TypeScript and a test).

export type Locale = 'nl' | 'en';
export const LOCALES: Locale[] = ['nl', 'en'];

const nl = {
	appName: 'Victoria 3 Companion',
	unknownCountry: 'Onbekend land',

	// tip
	tipStarting: 'Opstarten…',
	tipTagCompanion: 'Companion',
	tipTagBusy: 'Bezig',
	tipReading: 'Save inlezen…',
	tipTagLoaded: 'Ingelezen',
	tipTagProblem: 'Let op',
	tipProblem: 'Probleem – klik voor info',
	tipWaiting: 'Wacht op een save',
	tipOpen: 'Klik om te openen',

	// controls
	drag: 'Verslepen',
	collapse: 'Inklappen tot tipje',
	hide: 'Wegklikken (Alt+V haalt terug)',
	controlsHelp:
		'Sleep aan ⠿ om te verplaatsen · – inklappen · × wegklikken · Alt+V terughalen · Alt+C alles doorklikbaar',

	// waiting and errors
	waitingStarting: 'Bezig met opstarten…',
	waitingNoUserData:
		'Nog geen savemap gevonden. Kies hieronder de map, of start het spel één keer.',
	waitingNoSaves: 'Nog geen save gevonden. Speel even; bij de eerste autosave lees ik hem in.',
	errorRakalyMissing:
		'Rakaly niet gevonden. Download rakaly.exe van github.com/rakaly/cli/releases en kies het bestand hieronder bij Rakaly.',
	errorUnstable: (file: string) =>
		`${file} bleef veranderen; ik probeer het bij de volgende save opnieuw.`,
	errorReadFailed: (file: string) => `Kon ${file} niet lezen.`,
	errorUnexpected: 'Er ging iets mis bij het inlezen.',

	// panel: game
	sectionGame: 'Je spel',
	factCountry: 'Land',
	factDate: 'Datum',
	factVersion: 'Spelversie',
	factMode: 'Modus',
	modeIronman: 'Ironman',
	modeNormal: 'Gewone save',
	achievements: (on: boolean) => `achievements ${on ? 'aan' : 'uit'}`,
	factSave: 'Save',
	factReadAt: 'Ingelezen',
	readAt: (clock: string, seconds: string) => `om ${clock} (${seconds} s)`,
	autosaveTip: 'Tip: zet in het spel Autosave Interval op Every month.',

	// panel: advice
	sectionAdvice: 'Advies',
	noAdvice: 'Geen advies op dit moment: ik zie niets wat dringend aandacht nodig heeft.',
	caveatPrefix: 'Let op:',
	// panel: goals from the game and concepts
	sectionGoals: 'Doelen van het spel',
	goalsIntro: 'Wat het spel nu van je vraagt, met de uitleg uit het spel zelf.',
	goalWhy: 'Waarom?',
	goalFromGame: (v: string) => `Tekst uit de tutorial van het spel (versie ${v}), in het Engels.`,
	moreGoals: (n: number) => `Nog ${n} doelen zonder uitleg`,
	conceptFromGame: (v: string) => `Uitleg uit het spel (versie ${v})`,
	close: 'Sluiten',
	howTo: 'Hoe doe ik dat?',
	howToChecked: (v: string) => `Stappen gecontroleerd in versie ${v}.`,
	howToOtherVersion: (checked: string, v: string) =>
		`Stappen gecontroleerd in versie ${checked}; jij speelt ${v}. Schermen kunnen verschoven zijn.`,
	howToUnchecked: (v: string) =>
		`Stappen voor versie ${v}, nog niet in het spel gecontroleerd. Klopt een stap niet? Laat het weten.`,
	adviceCount: (n: number) => (n === 1 ? '1 advies' : `${n} adviezen`),
	untestedVersion: (v: string) =>
		`Spelversie ${v} is nog niet getest met deze app. Het advies kan afwijken; laat het weten als iets niet klopt.`,

	// panel: folders
	sectionFolders: 'Mappen',
	pathUserData: 'Saves en instellingen',
	pathGame: 'Spelinstallatie',
	pathRakaly: 'Rakaly (leest saves)',
	choose: 'Kies…',
	auto: 'Auto',
	autoTitle: 'Weer automatisch zoeken',
	pathFound: 'Gevonden: ',
	pathChosen: 'Zelf gekozen: ',
	notFoundUserData:
		'Map "Documents\\Paradox Interactive\\Victoria 3" niet gevonden. Start het spel één keer, of kies de map zelf.',
	notFoundGame:
		'Spelinstallatie niet gevonden via Steam. Kies de map "Victoria 3" zelf (alleen nodig voor de spelversie).',
	notFoundRakaly: 'Rakaly niet gevonden. Download rakaly.exe en kies het bestand.',
	chosenMissing: (path: string) => `Gekozen pad bestaat niet meer: ${path}`,
	installedVersion: (v: string) => `Geïnstalleerde versie: ${v}`,

	// language and settings
	language: 'Taal',
	settings: 'Instellingen',
	backToAdvice: '← Terug naar advies',
	controls: 'Bediening',
	settingsProblem: 'Er is een probleem met een van de mappen.',
	openSettings: 'Open instellingen'
};

export type Messages = typeof nl;

const en: Messages = {
	appName: 'Victoria 3 Companion',
	unknownCountry: 'Unknown country',

	tipStarting: 'Starting…',
	tipTagCompanion: 'Companion',
	tipTagBusy: 'Busy',
	tipReading: 'Reading save…',
	tipTagLoaded: 'Loaded',
	tipTagProblem: 'Attention',
	tipProblem: 'Problem – click for info',
	tipWaiting: 'Waiting for a save',
	tipOpen: 'Click to open',

	drag: 'Drag',
	collapse: 'Collapse to tip',
	hide: 'Hide (Alt+V brings it back)',
	controlsHelp:
		'Drag ⠿ to move · – collapse · × hide · Alt+V bring back · Alt+C click through everything',

	waitingStarting: 'Starting…',
	waitingNoUserData: 'No save folder found yet. Choose the folder below, or start the game once.',
	waitingNoSaves: 'No save found yet. Play for a bit; I will read the first autosave.',
	errorRakalyMissing:
		'Rakaly not found. Download rakaly.exe from github.com/rakaly/cli/releases and choose it below under Rakaly.',
	errorUnstable: (file: string) => `${file} kept changing; I will try again with the next save.`,
	errorReadFailed: (file: string) => `Could not read ${file}.`,
	errorUnexpected: 'Something went wrong while reading the save.',

	sectionGame: 'Your game',
	factCountry: 'Country',
	factDate: 'Date',
	factVersion: 'Game version',
	factMode: 'Mode',
	modeIronman: 'Ironman',
	modeNormal: 'Normal save',
	achievements: (on: boolean) => `achievements ${on ? 'on' : 'off'}`,
	factSave: 'Save',
	factReadAt: 'Read',
	readAt: (clock: string, seconds: string) => `at ${clock} (${seconds} s)`,
	autosaveTip: 'Tip: set Autosave Interval to Every month in the game.',

	sectionAdvice: 'Advice',
	noAdvice: 'No advice right now: I see nothing that needs urgent attention.',
	caveatPrefix: 'Mind:',
	sectionGoals: 'Goals from the game',
	goalsIntro: 'What the game asks of you now, explained by the game itself.',
	goalWhy: 'Why?',
	goalFromGame: (v: string) => `Text from the game's tutorial (version ${v}).`,
	moreGoals: (n: number) => `${n} more goals without an explanation`,
	conceptFromGame: (v: string) => `Explanation from the game (version ${v})`,
	close: 'Close',
	howTo: 'How do I do that?',
	howToChecked: (v: string) => `Steps checked in version ${v}.`,
	howToOtherVersion: (checked: string, v: string) =>
		`Steps checked in version ${checked}; you are playing ${v}. Screens may have moved.`,
	howToUnchecked: (v: string) =>
		`Steps for version ${v}, not yet checked in the game. Is a step wrong? Let us know.`,
	adviceCount: (n: number) => (n === 1 ? '1 piece of advice' : `${n} pieces of advice`),
	untestedVersion: (v: string) =>
		`Game version ${v} has not been tested with this app yet. Advice may be off; let us know if something is wrong.`,

	sectionFolders: 'Folders',
	pathUserData: 'Saves and settings',
	pathGame: 'Game installation',
	pathRakaly: 'Rakaly (reads saves)',
	choose: 'Choose…',
	auto: 'Auto',
	autoTitle: 'Find automatically again',
	pathFound: 'Found: ',
	pathChosen: 'Chosen: ',
	notFoundUserData:
		'Folder "Documents\\Paradox Interactive\\Victoria 3" not found. Start the game once, or choose the folder yourself.',
	notFoundGame:
		'Game installation not found via Steam. Choose the "Victoria 3" folder yourself (only needed for the game version).',
	notFoundRakaly: 'Rakaly not found. Download rakaly.exe and choose the file.',
	chosenMissing: (path: string) => `Chosen path no longer exists: ${path}`,
	installedVersion: (v: string) => `Installed version: ${v}`,

	language: 'Language',
	settings: 'Settings',
	backToAdvice: '← Back to advice',
	controls: 'Controls',
	settingsProblem: 'There is a problem with one of the folders.',
	openSettings: 'Open settings'
};

export const MESSAGES: Record<Locale, Messages> = { nl, en };

/** Windows/browser language → our locale: Dutch for "nl…", otherwise English. */
export function localeFromLanguage(language: string | undefined): Locale {
	return language?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export function isLocale(value: unknown): value is Locale {
	return value === 'nl' || value === 'en';
}
