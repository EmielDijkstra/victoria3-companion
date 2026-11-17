# Victoria 3 Companion – inventarisatie en plan

_Opgesteld: 17 november 2026 · Status: open vragen beantwoord, nog geen code_

## 1. Het idee in één alinea

Een lokaal draaiende app naast (of over) Victoria 3 die **laat zien hoe je ervoor staat**, **waarschuwt voor
problemen** en vooral **uitlegt waarom** iets een probleem is en wat je eraan kunt doen. Geen cheat-tool en
geen "automatische piloot": de app is een coach die je het spel leert begrijpen. Eerste versie draait alleen
lokaal op Windows, zonder server.

> **Koerswijziging (17-11-2026, na spike S3):** Emiel wil geen tweede scoreboard. "De gegevens kan ik ook
> in het spel zien. Het gaat erom hoe ik dingen moet aanpassen en wat slim is om te doen." **Advies staat
> voorop**; cijfers zijn alleen de onderbouwing. De overlay is standaard een klein tipje, open te klikken,
> te verslepen en weg te klikken. Zie `docs/spikes/s3-overlay.md`.

### Doelen

1. **Adviseren** – concreet zeggen wat slim is om nu te doen, op volgorde van belang: "zet je bouwlijst
   weer aan", "bouw papierfabrieken in Flanders, niet in Gelre". Elk advies: wat, waarom (met cijfers uit
   je save), let op, en hoe je het in het spel doet.
2. **Waarschuwen** – alleen als er iets misgaat, als tipje dat je kunt openklikken.
3. **Leren** – bij elk advies uitleg in het Nederlands over het waarom, zodat je het spel gaat begrijpen.
4. **Niet storen** – klein, verschuifbaar, weg te klikken; zonder het spel te veranderen.

~~Overzicht van cijfers~~ is geen doel op zich: die staan al in het spel.

### Bewust níet (in elk geval niet in v1)

- Geen savegame-editor of cheats.
- Geen beslissingen namens de speler; de app adviseert, de speler beslist.
- Geen online dienst, accounts of synchronisatie.

---

## 2. Wat er op deze pc al is (gecontroleerd op 17-11-2026)

| Wat | Gevonden |
|---|---|
| Spelversie | 1.13.11, zonder mods (`content_load.json` is leeg) |
| Installatie | `C:\Program Files (x86)\Steam\steamapps\common\Victoria 3\` |
| Gebruikersmap | `Documents\Paradox Interactive\Victoria 3\` |
| Savegames | `save games\*.v3`; autosaves `autosave.v3`, `autosave_1..4.v3`, `autosave_exit.v3` (~20 MB elk) |
| "Laatste spel" | `continue_game.json` geeft titel, land ("Playing as Belgium") en datum van de laatste save |
| Logs | `logs\game.log`, `logs\debug.log`, `logs\error.log` e.a. |

**Savegame-formaat** (zelf bekeken):

- Een `.v3` begint met een tekstkop (`SAV0103…`) met een korte metadata-blok (versie, land, rang),
  gevolgd door een **zip** met één bestand `gamestate`.
- Die `gamestate` is **binair** (~138 MB uitgepakt). Binaire Paradox-saves gebruiken genummerde *tokens*
  in plaats van veldnamen; zonder de tokenlijst zie je getallen in plaats van namen als `budget` of `gdp`.

**Spelbestanden zijn wél leesbaar** (platte tekst in Paradox-script):

- `game/common/…` – alle definities: gebouwen, productiemethoden, goederen en basisprijzen, wetten,
  belangengroepen, enzovoort.
- `game/localization/english/concepts_l_english.yml` – de teksten van de in-game encyclopedie
  ("Vickypedia"), ruim 2.200 begrippen. Er is geen Nederlandse vertaling van het spel.
- Het scripteffect `debug_log` bestaat en wordt in het spel zelf gebruikt (met dynamische tekst zoals
  `[GetPlayer…]`). Dat is interessant voor een eigen "logger-mod" (zie 4.1, route C).

---

## 3. Wat er al bestaat

### 3.1 In het spel zelf

- **"Learn the Game"-doelstelling** – stapsgewijze uitleg van de interface (sinds release).
- **Geneste tooltips en de Vickypedia** – uitleg van elk begrip, maar in het Engels, versnipperd en zonder
  advies over *jouw* situatie.
- **Alerts en de Outliner** – waarschuwingen staan er al (je hebt zelfs een eigen `alerttypes_custom.txt`),
  maar ze zeggen *dat* er iets is, niet *waarom* en *wat te doen*.

**Gat dat de app vult:** het spel geeft veel informatie, maar weinig samenhang, geen trends en geen uitleg
afgestemd op jouw spel. Daar zit de waarde.

### 3.2 Tools en projecten van anderen

| Tool | Wat het doet | Bruikbaar voor ons? |
|---|---|---|
| [pdx.tools](https://pdx.tools) ([broncode](https://github.com/pdx-tools/pdx-tools), AGPL-3.0) | Save-analyse in de browser; voor Victoria 3 vooral "melten" (binair → tekst). Binaire saves lukken alleen met een tokenbestand dat niet openbaar is. | Handmatig melten als noodroute. Code niet overnemen (AGPL). |
| [jomini](https://github.com/rakaly/jomini) (Rust, MIT) | Snelle parser voor Paradox-tekst- en binaire bestanden, ook Vic3, inclusief save-"envelope" (de zip-kop). Tokens moet je zelf aanleveren. | **Kern-bouwsteen** voor ons parsen. |
| [Rakaly CLI](https://github.com/rakaly/cli) (MIT) | Opdrachtregel: melten, JSON-uitvoer, save "watchen". Melten noemt Vic3 niet als ondersteund. | Ideeën voor watch/JSON; niet direct. |
| [Pdx-Unlimiter](https://github.com/crschnick/pdx_unlimiter) (Java, GPL-3.0) | Savegame-manager voor o.a. Vic3; zet ironman-saves om met de melter van pdx.tools. | Laat zien dat melten kan; GPL, dus niet inbouwen. |
| [Victoria 3 dev utilities](https://github.com/Imperia-Development-Victoria-3/Victoria-3-dev-utilities) (Python) | Grafieken van pop-behoeften en gebouwproductiviteit uit spelbestanden. | Inspiratie voor economische berekeningen. |
| [victoria3-analysis](https://shabbygaybar.github.io/victoria3-analysis/) | Analysesite op basis van spelgegevens. | Inspiratie; niet onderzocht. |
| Mods: *Essential UI*, *Advanced GDP Tracker* (Workshop) | Betere economische schermen en GDP-grafieken **in** het spel. | Bewijs dat spelers hier behoefte aan hebben; geen uitleg/coaching. |
| [Wand](https://wand.com/games/victoria-3) (commercieel) | Overlay (Alt+W) met *trainer*-functies. | Bewijst dat een overlay boven Vic3 werkt; verder ander doel (cheats). |
| Gidsen: [after-strategy 1.13-gids](https://after-strategy.com/en/complete-beginner-guide-victoria-3-2026-version-1-13/), [Vic3-wiki](https://vic3.paradoxwikis.com) | Strategie-uitleg. Wiki-tekst is CC BY-SA. | Bron voor eigen teksten; niet letterlijk overnemen. |

**Conclusie:** er bestaat **geen** companion die tegelijk je eigen spel uitleest, waarschuwt én uitlegt. De
bouwstenen (parser, spelbestanden, overlay-techniek) bestaan wel. Het grootste technische risico is het
uitlezen van binaire saves.

---

## 4. Technische opties

### 4.1 Hoe komt de app aan de gegevens?

> **Besluit (17-11-2026): Emiel speelt bij voorkeur ironman, voor de achievements.** Gewone saves zijn
> acceptabel als ironman technisch niet lukt. De voorkeursroute is dus achievement-veilig: geen
> debugmodus, geen mods die de checksum veranderen, niets in het spel aanpassen. De app kijkt alleen
> **mee**. Pas als dat niet lukt, valt de app terug op gewone saves (route B of C).
>
> Let op: ook gewone saves zijn standaard **binair** (dat zag ik op deze pc). Gewone saves alleen lossen
> het tokenprobleem dus niet op. De terugval werkt pas met debugmodus (tekstsaves) of een logger-mod, en
> zonder ironman tellen achievements toch al niet.

| Route | Hoe | Voordelen | Nadelen | Achievement-veilig? | Oordeel |
|---|---|---|---|---|---|
| **A. Binaire (ironman-)autosave lezen** | Map bewaken, nieuwe `.v3` uitpakken, met jomini + tokens parsen | Niets aan het spel veranderen; alle gegevens | Tokenlijst is niet openbaar en verandert per patch | **Ja** | **Hoofdroute.** Moet werken, anders heeft de app geen data. Zie 4.1a. |
| **B. Tekstsave lezen** | Losse testcampagne in debugmodus, opslaan zonder compressie | Alle velden met namen; ideaal om de savestructuur te leren | Debugmodus = geen achievements, geen ironman | Nee | **Voor ontwikkeling** (velden ontdekken, extractor testen) en als **terugval** als A niet lukt. |
| **C. Eigen logger-mod** | Mod die elke maand met `debug_log` cijfers naar `game.log` schrijft | Bijna live, klein en snel | Scriptmod verandert de checksum → geen achievements | Nee | **Terugval** voor gewone campagnes als A niet lukt; mogelijk prettiger dan B (geen debugmodus nodig?). Uitzoeken in spike S4. |
| **D. Scherm lezen** | Screenshots + AI-vision | Raakt het spel niet | Fragiel, traag, kost geld | **Ja** | Voor "leg dit scherm uit" (fase 4), niet als hoofdbron. |

**Aanpak:** bouw de app rond één eigen **`Snapshot`-model** (de cijfers die wij nodig hebben, met
in-game datum). De bronnen zijn verwisselbare *adapters* die dat model vullen. Tijdens de ontwikkeling
leren we de structuur met tekstsaves (B) uit een aparte testcampagne. In het echte spel leest de app
binaire ironman-autosaves (A).

#### 4.1a Hoe krijgen we binaire saves leesbaar?

Dit is nu hét kernrisico van het project. Opties, in volgorde van voorkeur:

1. **Een bestaand programma met Vic3-tokens aanroepen.** Pdx-Unlimiter zet volgens zijn README
   ironman-saves om met de melter van pdx.tools. Als die melter een los uitvoerbaar bestand is, kan onze app
   het als apart proces aanroepen (dan nemen we geen GPL-code over). Uitzoeken: werkt het met 1.13 en mag
   het zo gebruikt worden?
2. **Contact met pdx.tools/Rakaly** (de maker van jomini) over legitiem gebruik van Vic3-tokens in een
   lokale, niet-commerciële tool.
3. **Handmatige noodroute:** autosave in pdx.tools slepen, de gemelte save downloaden en die in de app
   openen. Werkt, maar is onhandig. Alleen als tijdelijke oplossing.
4. **Zelf een kleine tokenkaart maken** voor alleen de paar tientallen velden die het dashboard nodig heeft,
   door een tekst- en een binaire save van hetzelfde moment te vergelijken. Technisch haalbaar, maar
   juridisch grijs gebied. Alleen na een bewuste keuze en nooit openbaar verspreiden.

Daarnaast uitzoeken **hoe vaak ironman autosavet** (instelbaar op maandelijks?). Dat bepaalt hoe vers de
cijfers in de app zijn.

### 4.2 Hoe toont de app het?

> **Besluit (17-11-2026): de app wordt een overlay** (optie 2 hieronder). Een los venster blijft
> beschikbaar als terugval, en voor fullscreen-gebruikers.

Een echte overlay in het spel (DirectX-injectie) is complex en kan anti-cheat of crashes geven. Niet doen.
Wel:

1. **Apart venster / tweede scherm** – het eenvoudigst en altijd werkend.
2. **"Overlay"-venster** – transparant, altijd-bovenop, zonder rand; met sneltoets tonen/verbergen en
   klik-door aan/uit. Werkt alleen als het spel op **borderless windowed** staat (niet exclusief fullscreen).
3. **Bonus: de interface ook via `http://localhost`** – dan werkt hij ook in de **Steam-overlay-browser**
   (Shift+Tab), op een tablet of telefoon in hetzelfde netwerk. Weinig extra werk als de UI een webapp is.

### 4.3 Stack

| Onderdeel | Keuze | Waarom |
|---|---|---|
| Desktop-schil | **Tauri 2** | Klein en snel, Windows-native, ondersteunt transparante altijd-bovenop-vensters, klik-door en globale sneltoetsen. De backend is Rust, en daarin draait jomini native. |
| Frontend | **SvelteKit + TypeScript + Tailwind** | Zelfde stack als de wandel-app, dus bekende kennis en tooling. |
| Parsen | **jomini** (Rust crate) in de Tauri-backend | Snel genoeg voor saves van 100+ MB; ondersteunt de save-envelope. |
| Opslag | **SQLite** (lokaal) | Snapshots per spelmaand bewaren voor trends. |
| Grafieken | Lichte chartlibrary (bijv. uPlot of LayerChart) | Trends van GDP, schatkist, prijzen. |
| AI (optioneel; S5 beslist wanneer) | **Claude API** (`claude-opus-5-5`; in S5 ook een goedkoper model meten) | Uitleg op verzoek en vrije vragen over je eigen spel, gevoed met de feiten van de regels (4.4a). |
| Tests | Vitest (logica), Playwright (hoofdflows), `cargo test` (parser) | Zoals in de wandel-app. |

~~Besluit (17-11-2026): Tauri.~~ **Nieuw besluit (17-11-2026, na spike S3): Electron.** Tauri vraagt Rust en
Microsoft C++ Build Tools (~7–9 GB); daarvoor is te weinig schijfruimte. Electron werkte meteen boven het spel,
houdt alles in TypeScript en roept Rakaly als los programma aan. De tabel hierboven is daarmee achterhaald
voor de desktop-schil, het parsen (Rakaly → JSON in Node) en de tests (geen `cargo test`).

### 4.4 Architectuur

```
 Victoria 3
   │  autosave (.v3)            game.log (optionele logger-mod)
   ▼                            ▼
 ┌──────────────── Tauri-backend (Rust) ─────────────────┐
 │  Bronnen (adapters)  →  Snapshot-extractor  →  SQLite │
 │  A binair / B tekst / C log                            │
 │  Spelbestanden-lezer (definities + Vickypedia-teksten) │
 └───────────────────────┬───────────────────────────────┘
                         │ events: "nieuwe snapshot"
 ┌───────────────────────▼───────────────────────────────┐
 │  SvelteKit-frontend                                    │
 │  Dashboard · Waarschuwingen (regels) · Uitleg · Trends │
 │  Overlay-modus · (later) AI-adviseur                   │
 └───────────────────────────────────────────────────────┘
```

**Regels-engine:** waarschuwingen zijn gewone, testbare TypeScript-functies
(`snapshot → [{ernst, titel, waarom, wat_te_doen, waar_in_spel, begrip}]`). Geen AI nodig voor de basis:
de app is ook zonder internet en zonder API-sleutel nuttig.

#### 4.4a Vaste regels of AI? Allebei, elk voor iets anders

Emiel twijfelt of vaste regels genoeg helpen. Terecht: allebei hebben ze een zwakke kant.

| | Vaste regels | AI (Claude) |
|---|---|---|
| Goed in | Problemen **vinden**: tekort, verlies, schuld. Betrouwbaar, direct, gratis, testbaar | **Uitleggen en verbanden leggen**: "waarom daalt mijn levensstandaard?", vragen in eigen woorden, uitleg die past bij jouw situatie |
| Zwak in | Samenhang tussen problemen; vragen die niemand vooraf bedacht | Rekenwerk en precieze spelregels; kan dingen verzinnen als het de gegevens niet krijgt; kost geld en vraagt internet |

**Advies: combineren.**

1. **Regels vinden de feiten.** Ze lopen altijd en geven de waarschuwingen met de vaste uitleg.
2. **De AI legt uit op verzoek.** Een knop "Leg uit / vraag de adviseur" stuurt de feiten van de regels,
   de relevante cijfers uit de snapshot en de bijbehorende begripsteksten mee. De AI hoeft dan niets zelf
   uit te rekenen of te raden. Hij verbindt en legt uit, in het Nederlands, met de Engelse spelbegrippen.
3. **Je kiest zelf.** De AI staat standaard uit. De app werkt volledig zonder.

**Hoe we de twijfel wegnemen:** niet vooraf beslissen, maar meten. Spike **S5** (hieronder) test met echte
saves hoe goed de uitleg met en zonder AI is, en wat het per vraag kost. Op basis daarvan beslis je
of de AI-adviseur eerder of later komt, of helemaal niet.

---

## 5. Wat de app laat zien en uitlegt

### 5.1 Dashboard (eerste versie)

- Datum, land, rang; **GDP** en groei; **schatkist** en weeksaldo; **schuld** t.o.v. limiet.
- **Legitimiteit**, **radicalen vs. loyalisten**, gemiddelde **levensstandaard**.
- **Bouwsector**: capaciteit en of die volledig benut wordt.
- **Bureaucratie, autoriteit, invloed**: overschot of tekort.
- **Markt**: goederen met tekort/overschot en prijsafwijking.
- **Gebouwen** die verlies draaien of personeel tekortkomen.
- **Belangengroepen**: tevredenheid en invloed; wet die nu in behandeling is.

(Welke velden echt in de save staan, blijkt uit spike S2.)

### 5.2 Eerste set waarschuwingen met uitleg

| Waarschuwing | Uitleg die de app geeft (kort) |
|---|---|
| Weeksaldo negatief | Wat het kost, hoelang de schatkist het volhoudt, knoppen: belasting, bouw, overheidsgebouwen |
| Schuld bijna aan limiet | Wat er gebeurt bij faillissement en hoe je het voorkomt |
| Bouwcapaciteit onbenut | Waarom bouwen de motor van de economie is |
| Tekort aan een basisgoed (bijv. staal, hout, gereedschap) | Prijs → kosten voor afnemers; oplossing: zelf produceren, importeren, productiemethode wisselen |
| Gebouwen met verlies | Waarom (inputs te duur, geen afzet), en wanneer afbreken of omschakelen loont |
| Bureaucratie of autoriteit negatief | Gevolgen en wat het oplost |
| Radicalen stijgen / legitimiteit laag | Verband met levensstandaard en wetten |
| Belangengroep boos | Wat ze willen en welke risico's (opstand) eraan zitten |

Elke waarschuwing verwijst naar een **begrip** in de uitleg-bibliotheek en noemt **waar in het spel** je het
vindt (welk scherm, welke lens).

### 5.3 Leren

- **Taal (besluit 17-11-2026): spelbegrippen in het Engels zoals in het spel** (Standard of Living,
  Interest Groups, Production Methods…), **uitleg in het Nederlands.** Zo herken je alles direct in het spel.
- **Begrippenbibliotheek met Nederlandse uitleg**: eigen, korte teksten (niet vertaald overgenomen) over de
  kernbegrippen. De Engelse Vickypedia-tekst uit je eigen installatie kan ernaast getoond worden; die
  teksten worden lokaal gelezen en **niet** in de repo opgenomen.
- **De grote lijn**: één uitlegpagina met de kringloop *bouw → gebouwen → goederen → prijzen → lonen en
  levensstandaard → politiek → wetten → bouw*. Bijna elk probleem in Vic3 is een schakel hierin.
- **Leerpad**: een korte reeks lessen voor de eerste 10–20 speljaren (bijv. als België, Nederland of
  Zweden), met doelen die de app aan je save kan afvinken.
- **"Waarom?"-knop** bij elk cijfer.

---

## 6. Plan in fases

Elke fase eindigt met iets dat je zelf kunt testen. Schattingen zijn ruw.

### Fase 0 – Spikes: kan het? (± 1–2 weken)

| Spike | Vraag | Klaar als |
|---|---|---|
| **S1** Ironman-saves lezen (**eerst, go/no-go**) | Welke optie uit 4.1a maakt een binaire ironman-autosave leesbaar? Hoe lang duurt omzetten en parsen? Hoe vaak autosavet ironman? | Een echte ironman-autosave omgezet naar JSON en de tijd gemeten, of een duidelijk "nee" per optie |
| **S2** Gegevenskaart | Waar staan budget, GDP, markt, gebouwen, pops en belangengroepen in de gamestate? (Met een tekstsave uit een aparte testcampagne.) | Document `docs/save-structuur.md` met paden naar de velden voor het dashboard |
| **S3** Overlay | Werkt een Tauri-venster transparant en altijd-bovenop, met sneltoets en klik-door, over Vic3 in borderless? | Demovenster boven het spel |
| **S5** Regels vs. AI | Hoe goed is de uitleg met alleen regels, en hoe goed met Claude erbij? Wat kost het per vraag? | 5–10 echte vragen over een eigen save, met en zonder AI beantwoord; Emiel beoordeelt; kosten per vraag bekend |
| **S4** Logger-mod (alleen als S1 faalt) | Schrijft `debug_log` naar `game.log` buiten debugmodus? Kunnen we er elke maand cijfers mee loggen? | Een testmod die elke maand GDP en saldo logt, of een duidelijk "nee" |

**Beslismoment** na fase 0: welke route uit 4.1a, en Tauri of Electron. Lukt S1 niet, dan speel je met
de app in **gewone campagnes** via een logger-mod (S4) of tekstsaves in debugmodus (B). In ironman-runs
kan de app dan alleen uitleggen en leren (begrippen, leerpad, "leg dit scherm uit" via screenshots).

### Fase 1 – MVP: dashboard na elke save (± 2–3 weken)

- Instellingen: paden automatisch vinden (Documents/Steam), handmatig aan te passen.
- Map bewaken; bij een nieuwe autosave automatisch inlezen (tip: autosave op maandelijks zetten).
- Snapshot-extractor voor de velden uit 5.1; dashboard met kerncijfers.
- 5–8 waarschuwingsregels uit 5.2, met korte uitleg.
- Snapshots in SQLite; eenvoudige trendgrafieken.

### Fase 2 – Leren (± 2–3 weken)

- Begrippenbibliotheek (NL) en "de grote lijn".
- Vickypedia-teksten uit de eigen installatie inlezen en doorzoekbaar maken.
- "Waarom?"-knoppen, koppeling waarschuwing → begrip → plek in spel.
- Eerste leerpad met afvinkbare doelen.

### Fase 3 – Overlay en gemak (± 1–2 weken)

- Compacte overlay-weergave (alleen waarschuwingen en 4–6 kerncijfers).
- Sneltoets tonen/verbergen, klik-door, positie onthouden.
- Optioneel: UI via localhost voor Steam-overlay-browser of tablet.

### Fase 4 – AI-adviseur → **naar voren gehaald** (besluit 17-11-2026 na spike S5)

S5 liet zien dat AI vooral helpt bij waarom-vragen en politiek; Emiel: "Gemini helpt meer". Daarom wordt
AI-uitleg onderdeel van het adviespaneel in fase 1–2, niet een losse latere fase:

- Regels geven altijd direct het tipje en de adviezen; een knop "Vraag de adviseur" haalt AI-uitleg op.
- Standaard het **gratis** `gemini-3.6-flash` (Google AI Studio-sleutel van de speler); model instelbaar
  (andere gratis aanbieder, lokaal model, of betaalde API).
- Label "AI · kan fouten bevatten"; menunamen en stappen komen uit onze eigen regels, niet uit de AI.
- Vrije vragen over je eigen spel ("waarom is mijn levensstandaard gedaald?").
- Later: "Leg dit scherm uit" via screenshot (vision).
- Zie `docs/spikes/s5-regels-vs-ai.md`.

### Fase 5 – Later

- Meerdere saves/campagnes vergelijken, doelen en planning, export, eventueel delen met anderen.

---

## 7. Risico's

| Risico | Kans | Gevolg | Maatregel |
|---|---|---|---|
| Binaire ironman-saves niet leesbaar zonder tokens | Hoog | Geen cijfers uit ironman-runs | Spike S1 eerst; opties uit 4.1a; terugval: gewone campagnes met logger-mod of tekstsaves |
| App raakt per ongeluk achievements | Laag | Ironman-run niet meer geldig | App schrijft nooit in de spelmappen en start het spel niet met andere opties; alleen lezen |
| Ironman autosavet weinig | Middel | Cijfers lopen achter | Uitzoeken in S1; in de app tonen van welke datum de cijfers zijn |
| Savestructuur verandert per patch | Middel | Extractor breekt | Snapshot-extractor los en getest; versie uit `continue_game.json`/savekop checken en melden |
| Parsen van 100+ MB duurt te lang | Middel | Trage updates | Rust/jomini, alleen benodigde velden, in achtergrond |
| Overlay werkt niet in fullscreen | Zeker | Overlay onzichtbaar | Borderless verplicht stellen; tweede-scherm-modus als standaard |
| Advies is fout of te simpel | Middel | Speler leert verkeerde dingen | Regels klein en uitlegbaar; bronnen en "waarom" tonen; testen met echte saves |
| Licenties | Laag | Juridisch gedoe | Geen spelbestanden, tokens of wiki-teksten in de repo; geen AGPL/GPL-code kopiëren; eigen teksten |

## 8. Privacy en licenties

- Alles draait lokaal; saves en snapshots verlaten de pc niet.
- AI-functies zijn opt-in; alleen spelgegevens, nooit persoonlijke gegevens of bestandsnamen buiten de save.
- Spelbestanden en Vickypedia-teksten worden alleen **gelezen** vanaf de eigen installatie, nooit
  meegeleverd. Victoria 3 is © Paradox Interactive; de app is een onofficiële fan-tool.
- Gebruikte open-source: jomini (MIT). pdx-tools (AGPL) en Pdx-Unlimiter (GPL) alleen als inspiratie.
- Wiki-teksten (CC BY-SA) niet letterlijk overnemen; eigen uitleg schrijven.

## 9. Open vragen voor Emiel

Beantwoord:

- ~~Ironman of gewone saves?~~ **Bij voorkeur ironman, voor de achievements; gewone saves als het niet
  anders kan** (17-11-2026).
- ~~Mag de app een mod gebruiken?~~ **Niet in ironman-runs.** Wel als terugval in gewone campagnes.

- ~~AI-adviseur?~~ **Twijfel.** Advies: regels én AI op verzoek (4.4a); spike S5 meet of de AI echt helpt.
- ~~Tauri of Electron?~~ **Maakt niet uit → Tauri**, na S3 gewijzigd in **Electron** (te weinig schijfruimte voor Tauri).
- ~~Overlay of tweede scherm?~~ **Overlay.**
- ~~Taal?~~ **Engelse spelbegrippen, Nederlandse uitleg.**
- ~~Aparte testcampagne in debugmodus voor de ontwikkeling?~~ **Akkoord.**
- ~~pdx.tools/Rakaly benaderen over de Vic3-tokens?~~ **Akkoord.** Claude stelt het bericht op; Emiel
  keurt het goed voordat het verstuurd wordt.

Nog open: niets. Na spike S5 beslist Emiel over het moment van de AI-adviseur.

## 10. Volgende stappen

1. ~~Antwoorden op de open vragen.~~ Gedaan (17-11-2026).
2. ~~Repo opzetten~~ Gedaan: `EmielLabs/victoria3-companion` (privé), met `CLAUDE.md` en sjablonen.
3. ~~Issues aanmaken~~ Gedaan (17-11-2026):
   - Fase 0 – Spikes: #1 S1 ironman-saves, #2 S2 gegevenskaart, #3 S3 overlay, #4 S5 regels vs. AI,
     #5 S4 logger-mod (alleen als S1 faalt), #13 bericht aan pdx.tools.
   - Fase 1 – MVP: #6 projectskelet, #7 mappen vinden, #8 autosave inlezen, #9 snapshot-extractor,
     #10 dashboard, #11 waarschuwingen, #12 trends.
4. Bericht aan pdx.tools/Rakaly opstellen over de Vic3-tokens (#13; Emiel keurt het goed en verstuurt).
5. Beginnen met spike S1 (#1) met een echte autosave; dat is de go/no-go.
