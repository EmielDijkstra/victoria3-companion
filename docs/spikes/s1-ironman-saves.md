# Spike S1 – Ironman-saves leesbaar maken

_Issue #1 · Uitgevoerd: 17 november 2026 · Spelversie 1.13.11_

## Vraag

Kunnen we een binaire (ironman-)autosave legitiem leesbaar maken, zonder het spel aan te passen? Hoe snel
is dat, en hoe vaak autosavet het spel?

## Uitkomst in het kort

**Go.** Het kan, en eenvoudiger dan gedacht.

1. De **Rakaly CLI** (MIT-licentie) van de maker van jomini en pdx.tools zet Victoria 3-saves om naar
   leesbare tekst of JSON. De Vic3-tokens zitten **ingebouwd** in de officiële release. Op een echte
   autosave van 1.13.11: **0 onbekende velden**, alles heeft een naam.
2. Snel genoeg: omzetten plus inlezen kost **ongeveer 4–5 seconden** per autosave.
3. **Belangrijke bijvangst: ironman is in 1.13 niet nodig voor achievements.** Het spel zegt zelf dat
   achievements te halen zijn als je singleplayer speelt, geen spelregels gebruikt die ze blokkeren en geen
   observer bent. Ironman staat er niet bij. Je huidige gewone campagne (België) heeft de spelregel
   `achievements_allowed`.

## Wat er getest is

| Stap | Resultaat |
|---|---|
| Download | `rakaly-0.8.23-x86_64-pc-windows-msvc.zip` (2,0 MB) van de officiële releasepagina `github.com/rakaly/cli`, release 8-11-2026. SHA-256 gelijk aan de digest op GitHub. Met toestemming van Emiel. |
| Bron | Een **kopie** van `autosave.v3` (20,5 MB) in een werkmap buiten de repo. Het origineel is niet aangeraakt. |
| `rakaly melt` → tekst | 1,4 s; 186 MB platte tekst; **0** onbekende tokens |
| `rakaly json` → JSON | 2,8 s; 161 MB JSON |
| JSON inlezen in Node | 0,25 s lezen + 1,2 s parsen; ~520 MB geheugen |
| Gegevens | Speler = land 25 (`BEL`) via `player_manager`; budget, weekinkomsten en -uitgaven per post, gebouwen per inkomstenbron, markten, wetten, Interest Groups, pops: alles leesbaar |
| Voorbeeld | 1 september 1848: weekinkomsten ≈ £33.157, weekuitgaven ≈ £32.177, saldo ≈ +£980 per week (nog te controleren in het spel, zie spike S2) |

Bovenaan de save staat een metadata-blok met onder meer:

```
version="1.13.11"   game_date=1848.9.1   name="Belgium"
game_rules = { settings = { "achievements_allowed" … } }
ironman = { ironman=no  save_interval=three_months }
```

## De opties uit het plan (§ 4.1a)

| Optie | Uitkomst |
|---|---|
| 0 (nieuw). **Rakaly CLI / librakaly** van de tokenhouder zelf | **Werkt.** MIT-code, tokens ingebouwd in de officiële release. Actief onderhouden (laatste release 8-11-2026). Er is ook een DLL-variant (`librakaly`, 1,2 MB, C-interface) en een ingebouwde `watch`-opdracht die autosaves volgt en per maand of kwartaal een kopie maakt. |
| 1. Melter van Pdx-Unlimiter | Niet meer nodig. Pdx-Unlimiter levert ook een `rakaly`-programma mee; we gaan liever direct naar de bron. |
| 2. Bericht aan pdx.tools (#13) | Nog steeds zinvol, maar met een **andere vraag**: mogen we de officiële Rakaly-binary **meeleveren** in onze app? Voor eigen lokaal gebruik is dat niet nodig, wel als de app ooit gedeeld wordt. |
| 3. Handmatig via pdx.tools | Niet nodig. |
| 4. Eigen tokenkaart | Niet nodig, en daarmee ook geen juridisch grijs gebied. |

## Hoe vaak autosavet het spel?

- De save bewaart `save_interval=three_months`: je huidige instelling is **elk kwartaal**.
- Het spel heeft een instelling **"Autosave Interval"** ("Sets how often the game will save
  automatically"). De mogelijke waarden staan in het spel zelf, niet in de leesbare spelbestanden.
  **Nog te controleren door Emiel:** welke opties het menu toont (staat "maandelijks" erbij?).
- Het spel houdt maximaal 5 autosaves (`MAX_NUMBER_OF_AUTOSAVES = 5`) plus `autosave_exit.v3`.
- Met elk kwartaal betekent dit: de app is hooguit drie spelmaanden achter. Dat is prima voor een overzicht
  en waarschuwingen. Elke maand is beter, als het spel die optie heeft.

## Wat nog níet is getest

- **Een echte ironman-save.** Er staat op deze pc geen ironman-save. Ironman-saves hebben hetzelfde
  binaire formaat, en het omzetten van ironman-saves is juist waar Rakaly voor gemaakt is. Even proberen
  zodra er een ironman-save is (een paar minuten spelen is genoeg).
- **Of mods en debugmodus achievements blokkeren in 1.13.** De uitleg in het spel noemt alleen
  spelregels, singleplayer en observer-modus. Een Paradox-forumtopic suggereert dat mods achievements
  in Vic3 niet meer blokkeren. Niet bevestigd; tot het zeker is, houden we het spel onaangeroerd.
- Parsen in **Rust met jomini** (voor de Tauri-app). Hier is gemeten met Node, omdat Rust niet op deze pc
  staat. Rust is naar verwachting sneller en zuiniger, omdat het alleen de benodigde delen hoeft te lezen.

## Advies

1. **Route A gaat door**: de app leest binaire autosaves met de officiële Rakaly-tools. Twee manieren om
   dat in de app in te bouwen, te kiezen bij het projectskelet (#6):
   - **Rakaly CLI als sidecar**: de app roept `rakaly.exe` aan en leest de uitvoer. Simpelst.
   - **librakaly-DLL**: in hetzelfde proces, sneller, iets meer werk.
   In beide gevallen parsen we de leesbare tekst daarna met jomini (geen tokens nodig) en halen we alleen
   de velden voor de snapshot eruit.
2. **Logger-mod (spike S4, #5) is niet nodig** en kan dicht.
3. **Ironman is een keuze, geen vereiste.** Emiel kan ironman spelen of gewoon opslaan; de app werkt voor
   allebei. De alleen-lezen-regel blijft gelden.
4. **#13 aanpassen**: vraag aan de maker van Rakaly of we de binary mogen meeleveren in de app, en
   bedanken voor de tool.
5. **Autosave-instelling**: Emiel kijkt welke opties het menu heeft; de app adviseert de kortste.

## Bronnen

- Rakaly CLI: <https://github.com/rakaly/cli> (MIT), release v0.8.23
- librakaly: <https://github.com/rakaly/librakaly> (MIT), release v0.12.9
- jomini: <https://github.com/rakaly/jomini>
- Spelbestanden 1.13.11: `game/common/game_rules/00_game_rules.txt`,
  `game/common/defines/00_defines.txt`, de achievement-teksten in `game/localization/english/`
