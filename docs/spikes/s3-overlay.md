# Spike S3 – Overlay boven Victoria 3

_Issue #3 · Uitgevoerd: 17 november 2026 · Electron 45.3.3 · Windows 11_

## Vraag

Werkt een venster als overlay boven Victoria 3: doorzichtig, altijd bovenop, zonder rand, met sneltoetsen
en doorklikken naar het spel?

## Uitkomst in het kort

**Go, met Electron in plaats van Tauri.**

- Tauri kon niet worden getest: daarvoor zijn de Rust-toolchain en Microsoft C++ Build Tools nodig
  (samen ~7–9 GB), en er is maar ~5 GB vrij op C:. Emiel koos daarom voor een proef met Electron
  (geen compiler nodig, ~300 MB via npm).
- De overlay werkt boven het spel (getest door Emiel): doorzichtig venster, altijd bovenop, steelt de focus
  niet van het spel, klikken naast het venster gaan gewoon naar het spel.
- **Belangrijkste les ging niet over techniek maar over inhoud** (zie hieronder).

## Wat er gebouwd is (`spikes/overlay/`)

| Onderdeel | Hoe |
|---|---|
| Venster | `transparent`, `frame: false`, `alwaysOnTop` op niveau `screen-saver`, `skipTaskbar`, getoond met `showInactive()` (geen focus stelen) |
| Doorklikken | `setIgnoreMouseEvents(true, { forward: true })` overal, behalve als de muis boven het tipje of paneel is |
| Ingeklapt | Standaard een klein **tipje** met het belangrijkste advies en het aantal adviezen; klik om open te klappen |
| Verplaatsen | Sleep aan het handvat (⠿); het venster verschuift en de plek wordt onthouden (`overlay-position.json` in de app-datamap) |
| Wegklikken | – klapt in, × verbergt; **Alt+V** haalt terug; **Alt+C** maakt alles doorklikbaar |
| Grootte | De pagina meldt haar hoogte; het venster groeit mee tot schermhoogte en scrollt daarna |
| Eén exemplaar | `requestSingleInstanceLock()`: een tweede start sluit zichzelf |
| Localhost | Dezelfde pagina op `http://localhost:5179/` voor de Steam-overlaybrowser of een tablet (niet getest) |
| Veiligheid | `contextIsolation`, `sandbox`, geen `nodeIntegration`; kleine `preload`-brug met alleen de nodige functies |

Problemen onderweg:
- Na een herstart bleef een oud Electron-proces draaien en hield poort 5179 bezet → harde foutmelding.
  Opgelost met één-exemplaar-slot en een nette waarschuwing bij een bezette poort.
- Het venster groeide eerst niet mee bij openklappen, omdat de hoogte binnen het te kleine venster werd
  gemeten. Opgelost door `scrollHeight` te meten.

## Koerswijziging: advies in plaats van cijfers

Emiels reactie op de eerste versie (met een overzicht van GDP, weeksaldo, schuld enz.):

> De gegevens kan ik ook wel in het spel zien. Het gaat erom hoe ik dingen moet aanpassen en wat slim is
> om te doen. Ik wil geholpen worden, en de data moeten daarbij helpen.

En over de vorm: smaller, standaard klein met alleen een tipje, open te klikken, te verschuiven en weg te
klikken.

De mockup is daarom omgebouwd tot **adviseur**. Elk advies heeft:

1. **Wat te doen** (titel, één handeling);
2. **Waarom** – onderbouwd met cijfers uit de save die het spel niet zo samen laat zien;
3. **Let op** – de afweging of het risico;
4. **Hoe doe ik dat?** – stappen in het spel (welk scherm, welke knop).

De vier adviezen in de mockup komen uit een automatische analyse van de Belgische save
(16 september 1848) en zijn met de hand verwoord:

| # | Advies | Onderbouwing uit de save |
|---|---|---|
| 1 | Zet je bouwlijst weer aan | `construction_paused = true` (spel: "All Construction is currently Paused"), 10 projecten in de rij, £11,3K/week aan bouwgoederen |
| 2 | Papierfabrieken in Flanders, niet in Gelre | Paper Mill Flanders £1,6K winst per level per week; Paper 47 vs. basis 30; 99.000 werklozen in Flanders, 4.300 in Gelre; bouwlijst bevat papierfabriek in Gelre |
| 3 | Laat de explosievenfabriek groeien | Pas 3% bezet; Explosives +145%, Sulfur −41% |
| 4 | Belasting omlaag zodra de bouw loopt | Tax Level Very High, 24% Radicals, SoL 8,8; afweging met schuld 44% |

Nog niet gecontroleerd: of advies 1 klopt met wat Emiel in het spel ziet (de bovenbalk toonde twee keer
"Paused"), en of de "Hoe doe ik dat?"-stappen precies kloppen met de knoppen in 1.15.

## Advies

1. **Electron als desktop-schil** voor de app, tenzij Emiel ruimte maakt voor Tauri. Argumenten:
   alles in TypeScript, geen compiler nodig, Rakaly als los programma aanroepen werkt prima, en JSON
   inlezen kost ~1,5 s per save (S1). Nadeel: groter (~200 MB) en meer geheugen dan Tauri.
   **Besluit van Emiel nodig.**
2. **Product: advies voorop.** Het dashboard (#10) wordt een adviespaneel; de regels (#11) worden
   adviesregels met "wat / waarom / let op / hoe". Ruwe cijfers alleen als onderbouwing.
3. **Spike S5 (regels vs. AI, #4) wordt belangrijker.** De kwaliteit van het advies is de kern van de app.
   De vier adviezen hierboven zijn een goede testset.
4. Nog te testen: exclusief fullscreen en de Steam-overlaybrowser.
