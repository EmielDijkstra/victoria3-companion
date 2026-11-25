# How the companion works

A short tour for contributors. The research behind it is in [`spikes/`](spikes/) (in Dutch); the
save format is described in [`save-structuur.md`](save-structuur.md).

## The pieces

```
Victoria 3 autosave (.v3, binary)
        │  watched, copied to the app's own folder (read-only towards the game)
        ▼
Rakaly CLI ── "rakaly json" ──► JSON (in a worker thread)
        │
        ▼
Snapshot (electron/snapshot.ts)        game files of the player's installation, read at runtime:
compact picture of the player's   ◄──  goods, names, laws, ideologies, production methods,
country                                technologies, pop needs (electron/game-data.ts)
        │  over IPC
        ▼
Overlay (Svelte, src/lib/overlay)
  ├─ advice      src/lib/advice/rules.ts → texts.ts (NL/EN, "how do I do that?")
  ├─ goals       journal entries + official tutorial steps (electron/game-knowledge.ts)
  ├─ concepts    the game's own concept texts, clickable
  ├─ learn       topics: knowledge sheet + insights (src/lib/learn) + the topic's advice
  └─ ask more    AI advisor, only when the player asks (src/lib/advisor, electron/advisor.ts)
```

## Main process (`electron/`)

- `main.ts`: the overlay window (transparent, always on top, click-through outside the panel),
  shortcuts, IPC and the `app://` protocol that serves the built page.
- `companion.ts`: finds the folders (save folder, Steam installation, Rakaly), watches the save
  folder, copies a new save to the app's work folder and reads it in `save-reader-worker.ts`.
- `snapshot.ts`: turns the save JSON into a `Snapshot` (`src/lib/snapshot.ts`). Field paths and
  quirks such as ring buffers are documented in `docs/save-structuur.md`.
- `game-data.ts` and `game-knowledge.ts`: read definitions and texts from the player's own game
  installation. Nothing from the game is stored in this repository.
- `advisor.ts`: the optional Gemini client. The key stays in the main process; requests are only
  sent when the player picks or types a question.

## Overlay (`src/lib`)

- `advice/rules.ts` looks only at the snapshot and returns typed advice; `advice/texts.ts` writes
  the title, reason, caveat and steps in Dutch and English.
- `learn/` holds a knowledge sheet per topic (our own words, with the game version it was written
  for) and `insights.ts`, which turns the snapshot into short explanations.
- `i18n/messages.ts` has every interface text in both languages; a test checks they match.
- Principles: explain why and give tips instead of showing figures the game already shows; steps
  and sheets are "not yet checked" until the maintainer checked them in the game.

## Tests

- Unit tests (Vitest) next to the code, with a hand-made gamestate in `electron/fixtures` and
  made-up lines in the game's file format.
- Browser tests (Playwright) in `e2e/`, with a fake bridge instead of Electron (including a fake
  AI advisor).
- `npm run lint` also runs `scripts/check-public.mjs`, which keeps personal files, saves, keys and
  other things that do not belong in a public repository out.
