# CLAUDE.md – victoria3-companion (EmielLabs)

Werkafspraken voor elke Claude Code-sessie in deze repo. Lees dit eerst.

## Wat we bouwen

Een lokale companion-app voor Victoria 3. De app staat als overlay over het spel, laat zien hoe je ervoor
staat, waarschuwt voor problemen en legt vooral uit **waarom** iets een probleem is en wat je kunt doen. Het
is een coach, geen cheat-tool. Plan en achtergrond: zie `docs/plan.md`.

## Stack

- Tauri 2 (Windows). Backend in Rust, frontend in SvelteKit + TypeScript (strict) + Tailwind CSS
- Saves en spelbestanden parsen met de Rust-crate `jomini` (MIT)
- Lokale opslag: SQLite (snapshots per spelmaand)
- Optioneel: Claude API voor uitleg op verzoek (opt-in, eigen API-sleutel)
- Tests: Vitest (logica en regels), `cargo test` (parser), Playwright (hoofdflows)
- Lint/format: ESLint + Prettier, `cargo fmt` + `cargo clippy`; typecheck: `svelte-check`

## Werkwijze (GitHub Flow, pragmatisch)

1. Werk alleen aan issues die bestaan. Geen issue? Stel er eerst een voor.
2. Een branch is een **testbaar geheel**. Dat kan één issue zijn, maar ook een groepje issues
   die samen horen. Emiel geeft aan welke issues samen gaan.
   - Eén issue: `<type>/<issue-nr>-<omschrijving>`, bijv. `spike/1-read-ironman-saves`
   - Meerdere issues: `<type>/<onderdeel>`, bijv. `feat/dashboard`
3. Kleine commits volgens Conventional Commits, in het Engels, met het issue-nummer:
   `feat(parser): extract budget from gamestate (#9)`.
   Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `data`, `spike`.
4. Draai voor elke PR de checks (zodra het projectskelet er is):
   `npm run lint && npm run check && npm run test && npm run build` en `cargo test`.
5. Open een PR met het sjabloon, titel in Conventional Commits-stijl, en een `Closes #<nr>`-regel
   voor elk issue dat de PR afrondt. Beschrijf hoe Emiel het geheel kan testen.
6. Nooit direct naar `main` pushen. Emiel reviewt en merget (squash merge).
   Uitzondering: alleen documentatie- of configwijzigingen mogen direct als Emiel dat vraagt.

### Spikes

Een spike beantwoordt een vraag; het is geen productcode. Uitkomst: een kort verslag in `docs/spikes/`
(vraag, aanpak, resultaat, advies) en eventueel proefcode in `spikes/`. Proefcode gaat niet ongewijzigd
naar de app.

## Definition of Done

- Alle acceptatiecriteria van het issue zijn afgevinkt
- Lint, typecheck, tests en build zijn groen (lokaal en in CI)
- Nieuwe logica heeft tests; elke waarschuwingsregel heeft tests met voorbeeld-snapshots
- Werkt als overlay boven het spel (borderless windowed, 1920×1080) en als los venster
- Geen secrets in de code; nieuwe omgevingsvariabelen staan in `.env.example`
- Docs bijgewerkt als gedrag of setup verandert

## Gouden regels: achievement-veilig en alleen-lezen

Emiel speelt ironman voor de achievements. De app mag dat nooit in gevaar brengen.

- De app **leest alleen**. Nooit schrijven in de installatiemap, de map `Documents\Paradox Interactive\Victoria 3`
  of in savebestanden. Saves eerst kopiëren naar een eigen werkmap als dat nodig is.
- De app start het spel niet en verandert geen opstartopties, instellingen of mods.
- Een eigen mod (logger-mod) is alleen een terugval voor **gewone** campagnes, nooit voor ironman.
- Testen met debugmodus of tekstsaves gebeurt in een **aparte testcampagne**, nooit in Emiels ironman-run.

## Licenties en spelinhoud

- Spelbestanden, Vickypedia-teksten en savegames van Paradox **nooit** in de repo zetten. De app leest ze
  tijdens het draaien vanaf de eigen installatie. Testsaves staan in een map die in `.gitignore` staat.
- Binaire tokenlijsten komen nooit in de repo en worden nooit verspreid.
- Code van pdx-tools (AGPL) en Pdx-Unlimiter (GPL) niet overnemen; alleen als inspiratie.
- Wiki-tekst (CC BY-SA) niet letterlijk overnemen; eigen uitleg schrijven met bronvermelding.
- De app is een onofficiële fan-tool; Victoria 3 is © Paradox Interactive.

## Uitleg en advies

- Spelbegrippen in het **Engels**, zoals in het spel (Standard of Living, Interest Groups…); uitleg in het
  **Nederlands**.
- Elke waarschuwing heeft: wat er aan de hand is, waarom het ertoe doet, wat je kunt doen, en waar je het
  in het spel vindt.
- Regels vinden de feiten; de AI (als die aan staat) legt alleen uit op basis van die feiten en de cijfers
  uit de snapshot, en verzint geen eigen getallen.

## Privacy

- Alles draait lokaal. Saves en snapshots verlaten de pc niet.
- AI staat standaard uit. Voordat iets naar de API gaat, toont de app wat er verstuurd wordt; alleen
  spelgegevens, geen persoonlijke gegevens of paden.

## Taal

- Code, commits, branchnamen: Engels.
- Issues, docs, UI-teksten: Nederlands (spelbegrippen Engels).
