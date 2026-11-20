# Contributing

Thanks for wanting to help! Issues and pull requests are welcome in **English or Dutch**. Code,
commits and branch names are in English; the app has Dutch and English texts.

## Ground rules

- **Read-only and achievement-safe.** The app never writes to the game installation, the
  `Documents\Paradox Interactive\Victoria 3` folder or save files, never starts the game and never
  changes its settings or mods.
- **No game files, game texts or saves in the repository.** Read them at runtime from the player's own
  installation. Tests use made-up lines in the game's format.
- **Unofficial fan tool.** Nothing may suggest it is made, endorsed or approved by Paradox
  Interactive. Free and non-commercial.
- **No personal data or secrets.** No keys, `.env` files, saves or personal paths in files, issues or
  commits. New environment variables go into `.env.example`.
- **Tips, not tables.** The game shows the figures; the app explains why something goes wrong and
  what is smart, naming at most the figure that triggers a tip.
- **The AI advisor is on demand only.** Nothing is sent to an AI unless the player asks a question.

## Workflow

| Topic         | Agreement |
| ------------- | --------- |
| Flow          | GitHub Flow: `main` always works; every change goes through a branch and a pull request |
| Tasks         | Every task is a GitHub issue with a user story (or research question) and acceptance criteria |
| Branches      | One issue: `feat/12-short-name`; several issues: `feat/area` |
| Commits       | [Conventional Commits](https://www.conventionalcommits.org/) in English, with the issue number: `feat(advice): … (#12)` |
| Pull requests | One testable whole per PR, a `Closes #nr` line per finished issue; the maintainer reviews and merges |
| Quality       | `npm run lint && npm run check && npm run test && npm run build` must be green (CI runs it too) |
| Versions      | [SemVer](https://semver.org/) |

**Definition of done:** acceptance criteria met; lint, typecheck, tests and build green; new logic has
tests and new main flows a Playwright test; works at the overlay's size; docs updated when behaviour
or setup changes. More detail (in Dutch) in [`CLAUDE.md`](CLAUDE.md).

## Advice and explanations

- Every advice has a title, a reason, an optional caveat and steps in the game, in Dutch and English
  (`src/lib/advice/texts.ts`; a test checks both languages exist).
- Steps start as **not yet checked**. Only the maintainer marks them as checked for a game version,
  after clicking through them in the game (`HOW_TO_CHECKED`). The same goes for the knowledge sheets
  in `src/lib/learn/`.
- Game terms stay in English, as the game shows them.

## Labels

- `feature`: new functionality for the player
- `spike`: research question; ends in a report and a recommendation
- `bug`: something does not work as intended
- `data`: saves, game files, data model
- `uitleg`: explanations, concepts, learning
- `infra`: setup, CI, tooling
- `prio:hoog`: pick up first

## Writing an issue

Use a template. A good issue fits in one session of work; otherwise split it.
