# Victoria 3 Companion

Een kleine overlay-adviseur voor Victoria 3. Hij leest je autosave en vertelt wat je nu het beste kunt
doen, waarom, en hoe je dat in het spel doet, zodat je het spel beter leert begrijpen. Werkt met gewone
en ironman-saves en past het spel niet aan.

> Status: fase 1. Het skelet van de app staat (overlay-venster in Vic3-stijl); advies volgt.

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

### Bediening

- Het **tipje** rechtsboven: klik om te openen.
- **⠿** verslepen (de plek wordt onthouden) · **–** inklappen · **×** wegklikken.
- **Alt+V** overlay tonen of verbergen · **Alt+C** alles doorklikbaar.

### Checks (voor elke PR)

```bash
npm run lint && npm run check && npm run test && npm run build
```

Handig bij het ontwikkelen: `electron . --capture=venster.png [--expanded]` slaat een afbeelding van het
venster op en stopt (na `npm run build`).

## Meer

- Plan en inventarisatie: [`docs/plan.md`](docs/plan.md)
- Onderzoek (spikes): [`docs/spikes/`](docs/spikes/), proefcode in [`spikes/`](spikes/)
- Waar staat wat in een save: [`docs/save-structuur.md`](docs/save-structuur.md)
- Werkafspraken: [`CLAUDE.md`](CLAUDE.md) en [`CONTRIBUTING.md`](CONTRIBUTING.md)

Onofficiële fan-tool. Victoria 3 is © Paradox Interactive. Deze repo bevat geen spelbestanden of
savegames. Lettertype: EB Garamond (SIL Open Font License).
