# Ontwikkelstandaard

Deze repo werkt volgens een lichte standaard. Kort:

| Onderdeel     | Afspraak |
| ------------- | -------- |
| Werkstroom    | GitHub Flow: `main` werkt altijd; elke wijziging via een branch en een pull request. Een branch is een testbaar geheel: één issue of een groepje issues dat samen hoort |
| Taken         | Elke taak is een GitHub-issue met user story (of onderzoeksvraag) en acceptatiecriteria |
| Planning      | Milestones per fase (Fase 0 – Spikes, Fase 1 – MVP, …) |
| Branches      | Eén issue: `spike/1-read-ironman-saves`; meerdere issues: `feat/dashboard` |
| Commits       | [Conventional Commits](https://www.conventionalcommits.org/), in het Engels |
| Pull requests | Per testbaar geheel, `Closes #nr` voor elk afgerond issue, squash merge na review |
| Kwaliteit     | CI draait lint, typecheck, tests en build op elke PR (zodra het projectskelet er is) |
| Versies       | [SemVer](https://semver.org/): elke afgeronde fase = een release (`v0.1.0`, `v0.2.0`, …) |
| Klaar         | Zie de Definition of Done in `CLAUDE.md` |

## Labels

- `feature` – nieuwe functionaliteit voor de gebruiker
- `spike` – onderzoeksvraag; levert een verslag en een advies op
- `bug` – iets werkt niet zoals bedoeld
- `data` – saves, spelbestanden, datamodel
- `uitleg` – uitlegteksten, begrippen, leerpad
- `infra` – setup, CI, tooling
- `prio:hoog` – eerst oppakken

## Een issue schrijven

Gebruik het sjabloon. Een goed issue is in één sessie af te ronden; anders splitsen.
