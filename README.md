# Victoria 3 Companion

A small advisor overlay for Victoria 3. It reads your latest autosave and tells you what is smart to
do now, why, and how to do it in the game, so you learn to understand the game better. It works with
normal and ironman saves and never changes the game.

> **Unofficial, fan-made tool.** Not affiliated with, sponsored, endorsed or approved by Paradox
> Interactive. Victoria 3 is © Paradox Interactive. This repository contains no game files, game texts
> or saves.

[Nederlands](README.nl.md)

## What it does

- **Advice from your save:** for example a paused construction queue, a deficit, a full Trade
  Capacity, a law with broad support, or research that helps your own buildings. Each advice says why,
  what to mind, and how to do it in the game. The steps state the game version they were written for.
- **Goals of the game:** your active Journal Entries with progress, and the official tutorial steps
  from your own game version.
- **Concepts:** click an underlined game term to read the game's own explanation.
- **📖 Learn:** Trade, Laws, Population, Technology and Diplomacy. How each works, what is smart, and
  what stands out in your country. Tips and explanations, not tables: the game shows the figures itself.
- **💬 Ask more (optional):** ask the AI advisor (Google Gemini, free key) a follow-up question. See
  [AI advisor](#ai-advisor-optional).
- **Dutch and English**, switchable in the settings.

Read-only and achievement-safe: the app never writes to the game folders or your saves. A new save is
first copied to the app's own folder and read there.

## Install and run (Windows)

There is no installer yet; you run it from the source. You need:

- Windows 10 or 11
- [Node.js 24](https://nodejs.org/)
- Victoria 3 (Steam)

1. Download this repository (Code → Download ZIP, or `git clone`) and open a terminal in the folder.
2. Install and build once:

   ```bash
   npm install
   ```

   ```bash
   npm run build
   ```

3. Get **Rakaly**, the open-source save converter from the maker of pdx.tools (MIT licence; not
   included here):
   - Download `rakaly-…-x86_64-pc-windows-msvc.zip` from
     [github.com/rakaly/cli/releases](https://github.com/rakaly/cli/releases) and unzip `rakaly.exe`.
   - Put it in the `tools` folder of this repository (`tools\rakaly.exe`, ignored by git), or in
     `%APPDATA%\victoria3-companion\tools\rakaly.exe`, or choose it in the overlay under
     **⚙ Settings → Folders → Rakaly → Choose…**.
4. Start the overlay:

   ```bash
   npm start
   ```

In the game:

- Set **Settings → Graphics → Window mode** to **Borderless**; in fullscreen the overlay disappears.
- Set **Autosave Interval** to **Every month**, so the advice stays up to date.

The app finds your save folder (`Documents\Paradox Interactive\Victoria 3`, also via OneDrive) and the
game installation (via Steam) by itself; both can be changed under **⚙ Settings → Folders**.

## Controls

- The **tip** at the top right: click to open the panel.
- **⠿** drag (the position is remembered) · **–** collapse · **×** hide.
- **Alt+V** show or hide the overlay · **Alt+C** let all clicks pass through to the game.
- **⚙ Settings** (bottom of the panel): your game, folders, language and controls.

## AI advisor (optional)

**💬 Ask more** sends a question to Google Gemini **only when you pick or type a question**, never by
itself. What goes out: the advice or topic, compact figures from your save, your game version and the
game's concept texts. No personal data. Answers are labelled as not checked and may contain mistakes.

1. Get a free key at [Google AI Studio](https://aistudio.google.com/) → Get API key.
2. Create a file `.env` in the repository folder (or in `%APPDATA%\victoria3-companion\`) with:

   ```
   GEMINI_API_KEY=your-key
   ```

   See [`.env.example`](.env.example). Never commit this file; it is ignored by git.

Without a key the rest of the app works as usual.

## Development

```bash
npm run dev
```

starts the page with live reload and opens the overlay on top of it (Electron).

Checks for every pull request:

```bash
npm run lint && npm run check && npm run test && npm run build
```

`npm run test` runs the unit tests (Vitest) and the browser tests (Playwright). Install the test
browser once:

```bash
npx playwright install chromium
```

Handy while developing: `electron . --capture=window.png [--expanded]` saves an image of the window and
quits (after `npm run build`). `--capture-click="selector|selector"` clicks those elements first, and
`--capture-after=ms` waits afterwards.

Stack: Electron, SvelteKit, TypeScript, Tailwind CSS, Vitest and Playwright. Explanations and tutorial
steps are read at runtime from your own game installation; tests use made-up lines in the game's
format. How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md).

How it works: [architecture](docs/architecture.md). More background (in Dutch): the
[spikes](docs/spikes/) and
[where things are in a save](docs/save-structuur.md).

## Licence

The code is under the [MIT licence](LICENSE). That does not cover Victoria 3: game files, game texts
and saves are not in this repository, and the app only reads them at runtime from your own
installation. Font: EB Garamond (SIL Open Font License).
