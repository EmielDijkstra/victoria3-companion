# Victoria 3 Companion

Een kleine overlay-adviseur voor Victoria 3. Hij leest je autosave en vertelt wat je nu het beste kunt
doen, waarom, en hoe je dat in het spel doet, zodat je het spel beter leert begrijpen. Werkt met gewone
en ironman-saves en past het spel niet aan.

> Status: fase 1. De overlay leest je nieuwste autosave en geeft advies op basis van je spel (NL/EN).

## Lokaal starten

Nodig: Windows en Node.js 24.

```bash
npm install
```

```bash
npm run dev
```

`npm run dev` start de pagina op `http://localhost:5180` en opent de overlay daarboven (Electron), met
live herladen van de pagina. Een eigen build starten:

```bash
npm run build
```

```bash
npm start
```

Tip: zet Victoria 3 op **Borderless** (Settings → Graphics), anders valt de overlay weg in fullscreen.

### Saves lezen: Rakaly

Saves zijn binair. De app zet ze om met de officiële **Rakaly CLI** (MIT, van de maker van pdx.tools),
die niet in deze repo zit (zie #13). Eenmalig:

1. Download `rakaly-…-x86_64-pc-windows-msvc.zip` van
   [github.com/rakaly/cli/releases](https://github.com/rakaly/cli/releases) en pak `rakaly.exe` uit.
2. Zet hem in `%APPDATA%\victoria3-companion\tools\rakaly.exe`, of kies hem in de overlay onder
   **Mappen → Rakaly → Kies…**.

Uitleg en tutorial-stappen leest de app tijdens het draaien uit je eigen spelinstallatie; die teksten
zitten niet in deze repo.

De app vindt je savemap (`Documents\Paradox Interactive\Victoria 3`, ook via OneDrive) en de
spelinstallatie (via Steam) zelf; beide zijn aan te passen onder **Mappen**. Hij leest alleen: een nieuwe
save wordt eerst gekopieerd naar `%APPDATA%\victoria3-companion\work` en dáár ingelezen.
Zet in het spel **Autosave Interval** op **Every month**.

### Bediening

- Het **tipje** rechtsboven: klik om te openen.
- **⠿** verslepen (de plek wordt onthouden) · **–** inklappen · **×** wegklikken.
- **Alt+V** overlay tonen of verbergen · **Alt+C** alles doorklikbaar.
- **⚙ Instellingen** (onderaan het paneel): je spel, mappen, taal (NL/EN) en bediening.
- **Doelen van het spel**: wat het spel nu van je vraagt (Journal Entries), met voortgang en de
  officiële stappen uit de tutorial van je eigen spelversie.
- **📖 Leren** (onderaan het paneel): Handel, Wetten, Bevolking en Technologie. Per onderwerp de begrippen
  (uitgelegd door het spel), hoe het werkt en wat slim is, wat er bij jouw land opvalt en het advies.
  Geen tabellen met cijfers: die toont het spel zelf. De app legt uit waarom iets niet goed gaat en
  noemt hooguit het cijfer dat de tip veroorzaakt.
- **Begrippen**: een onderstreept spelbegrip aanklikken toont de uitleg uit het spel (Esc sluit).

### Checks (voor elke PR)

```bash
npm run lint && npm run check && npm run test && npm run build
```

`npm run test` draait de unit-tests (Vitest) én de browsertests (Playwright). Eenmalig de testbrowser
installeren:

```bash
npx playwright install chromium
```

Handig bij het ontwikkelen: `electron . --capture=venster.png [--expanded]` slaat een afbeelding van het
venster op en stopt (na `npm run build`). Met `--capture-click="selector|selector"` klikt hij eerst op die elementen.

## Meer

- Plan en inventarisatie: [`docs/plan.md`](docs/plan.md)
- Onderzoek (spikes): [`docs/spikes/`](docs/spikes/), proefcode in [`spikes/`](spikes/)
- Waar staat wat in een save: [`docs/save-structuur.md`](docs/save-structuur.md)
- Werkafspraken: [`CLAUDE.md`](CLAUDE.md) en [`CONTRIBUTING.md`](CONTRIBUTING.md)

Onofficiële fan-tool. Victoria 3 is © Paradox Interactive. Deze repo bevat geen spelbestanden of
savegames. Lettertype: EB Garamond (SIL Open Font License).
