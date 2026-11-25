# Victoria 3 Companion

Een kleine overlay-adviseur voor Victoria 3. Hij leest je autosave en vertelt wat je nu het beste kunt
doen, waarom, en hoe je dat in het spel doet, zodat je het spel beter leert begrijpen. Werkt met gewone
en ironman-saves en past het spel nooit aan.

> **Onofficiële fan-tool.** Niet verbonden aan, gesponsord, gesteund of goedgekeurd door Paradox
> Interactive. Victoria 3 is © Paradox Interactive. Deze repo bevat geen spelbestanden, spelteksten of
> saves.

[English](README.md)

## Wat hij doet

- **Advies uit je save:** bijvoorbeeld een bouwlijst op pauze, een tekort, een volle Trade Capacity,
  een wet met veel steun of onderzoek dat je eigen gebouwen helpt. Elk advies zegt waarom, waar je op
  moet letten en hoe je het in het spel doet. Bij de stappen staat voor welke spelversie ze gelden.
- **Doelen van het spel:** je actieve Journal Entries met voortgang, en de officiële tutorial-stappen
  uit je eigen spelversie.
- **Begrippen:** klik op een onderstreept spelbegrip voor de uitleg van het spel zelf.
- **📖 Leren:** Handel, Wetten, Bevolking, Technologie en Diplomatie. Hoe het werkt, wat slim is en wat
  er bij jouw land opvalt. Tips en uitleg, geen tabellen: de cijfers toont het spel zelf.
- **💬 Vraag door (optioneel):** stel de AI-adviseur (Google Gemini, gratis sleutel) een vervolgvraag.
  Zie [AI-adviseur](#ai-adviseur-optioneel).
- **Nederlands en Engels**, te kiezen in de instellingen.

Alleen-lezen en achievement-veilig: de app schrijft nooit in de spelmappen of in je saves. Een nieuwe
save wordt eerst naar de eigen map van de app gekopieerd en daar gelezen.

## Installeren en starten (Windows)

Er is nog geen installer; je start hem vanaf de broncode. Nodig:

- Windows 10 of 11
- [Node.js 24](https://nodejs.org/)
- Victoria 3 (Steam)

1. Download deze repo (Code → Download ZIP, of `git clone`) en open een terminal in de map.
2. Eenmalig installeren en bouwen:

   ```bash
   npm install
   ```

   ```bash
   npm run build
   ```

3. Haal **Rakaly** op, de open-source save-omzetter van de maker van pdx.tools (MIT-licentie; zit niet
   in deze repo):
   - Download `rakaly-…-x86_64-pc-windows-msvc.zip` van
     [github.com/rakaly/cli/releases](https://github.com/rakaly/cli/releases) en pak `rakaly.exe` uit.
   - Zet hem in `%APPDATA%\victoria3-companion\tools\rakaly.exe`, of kies hem in de overlay onder
     **⚙ Instellingen → Mappen → Rakaly → Kies…**.
4. Start de overlay:

   ```bash
   npm start
   ```

In het spel:

- Zet **Settings → Graphics → Window mode** op **Borderless**; in fullscreen valt de overlay weg.
- Zet **Autosave Interval** op **Every month**, dan blijft het advies actueel.

De app vindt je savemap (`Documents\Paradox Interactive\Victoria 3`, ook via OneDrive) en de
spelinstallatie (via Steam) zelf; beide zijn aan te passen onder **⚙ Instellingen → Mappen**.

## Bediening

- Het **tipje** rechtsboven: klik om het paneel te openen.
- **⠿** verslepen (de plek wordt onthouden) · **–** inklappen · **×** wegklikken.
- **Alt+V** overlay tonen of verbergen · **Alt+C** alle klikken door naar het spel.
- **⚙ Instellingen** (onderaan het paneel): je spel, mappen, taal en bediening.

## AI-adviseur (optioneel)

**💬 Vraag door** stuurt **alleen** een vraag naar Google Gemini als je zelf een vraag kiest of typt,
nooit vanzelf. Wat er meegaat: het advies of onderwerp, compacte cijfers uit je save, je spelversie en
de begrippen uit het spel. Geen persoonlijke gegevens. Antwoorden zijn gemarkeerd als niet
gecontroleerd en kunnen fouten bevatten.

1. Haal een gratis sleutel op bij [Google AI Studio](https://aistudio.google.com/) → Get API key.
2. Maak een bestand `.env` in de map van de repo (of in `%APPDATA%\victoria3-companion\`) met:

   ```
   GEMINI_API_KEY=je-sleutel
   ```

   Zie [`.env.example`](.env.example). Zet dit bestand nooit in git; het wordt genegeerd.

Zonder sleutel werkt de rest van de app gewoon.

## Ontwikkelen

```bash
npm run dev
```

start de pagina met live herladen en opent de overlay daarboven (Electron).

Checks voor elke pull request:

```bash
npm run lint && npm run check && npm run test && npm run build
```

`npm run test` draait de unit-tests (Vitest) en de browsertests (Playwright). Eenmalig de testbrowser
installeren:

```bash
npx playwright install chromium
```

Handig bij het ontwikkelen: `electron . --capture=venster.png [--expanded]` slaat een afbeelding van
het venster op en stopt (na `npm run build`). `--capture-click="selector|selector"` klikt eerst op die
elementen, en `--capture-after=ms` wacht daarna.

Hoe het werkt: [architectuur](docs/architecture.md) (Engels). Meer achtergrond: de
[spikes](docs/spikes/) en
[waar staat wat in een save](docs/save-structuur.md). Werkafspraken: [CLAUDE.md](CLAUDE.md) en
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licentie

De code valt onder de [MIT-licentie](LICENSE). Dat geldt niet voor Victoria 3: spelbestanden,
spelteksten en saves zitten niet in deze repo, en de app leest ze alleen tijdens het draaien uit je
eigen installatie. Lettertype: EB Garamond (SIL Open Font License).
