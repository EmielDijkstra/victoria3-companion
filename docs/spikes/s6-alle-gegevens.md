# Spike S6 – welke gegevens kunnen we nog benutten?

_Issue #25 · 17 november 2026 · Spelversie 1.15.1 · Rakaly CLI 0.8.23_

**Vraag:** wat vertellen de save en de spelbestanden ons nog meer dan de kerncijfers die het advies nu
gebruikt? En welke adviezen en uitleg kunnen we daarmee geven? Handel was het eerste voorbeeld, maar we
hebben naar alles gekeken.

**Testbestand:** de autosave van Emiel, Belgium, 1 mei 1850 (129 MB JSON, 80 onderdelen). Die staat
niet in de repo. Veldpaden en details staan in [`save-structuur.md`](../save-structuur.md). Proefscripts
staan in [`spikes/save-data/`](../../spikes/save-data/).

## Samenvatting

1. **De save weet veel meer dan we gebruiken.** Over handel, politiek, technologie, diplomatie en
   bevolking staat bijna alles erin wat de speler in het spel ook ziet. De belangrijkste vondsten:
   - **tarieven per goed**
   - **handelsvolume per staat**
   - **handelscapaciteit**
   - **wat de Investment Pool wil bouwen**
   - **onderzoek in uitvoering**
   - **wat elke Interest Group wil**
   - **lopende Journal Entries met voortgang**
2. **Het spel coacht zelf al, en dat kunnen we gebruiken.** De save houdt bij welke **tutorial-doelen**
   (`objective_manager`) nog openstaan, bij Emiel bijvoorbeeld `sg_fix_budget_deficit`, `sg_grow_gdp`
   en `sg_enact_institution_law`. De spelbestanden bevatten bij elk doel de **officiële uitleg en
   stappen**: 124 "how"-teksten in `tutorial_l_english.yml`, 24 lessen. Die passen altijd bij de
   geïnstalleerde versie.
3. **De spelbestanden zijn de beste bron voor uitleg.** Ze bevatten:
   - ongeveer 625 begripsomschrijvingen (`concepts_l_english.yml`)
   - 361 wetomschrijvingen
   - Interest Groups en hun traits
   - Journal Entries
   - de spelregels in `common/` (gebouwen, production methods, wetten, technologie, objectives)

   We lezen ze tijdens het draaien uit de installatie van de speler, net als de staatsnamen nu. Ze komen
   **nooit in de repo**.
4. **Handel werkt in 1.15 zonder handelsroutes.** Er is geen `trade_route_manager` meer. Handel loopt
   automatisch via de **World Market**:
   - **Trade Centers** in je staten leveren **Trade Capacity**
   - een **World Market Hub** verbindt je markt met de rest
   - per goed stel je **tarieven of subventies** in voor import en export
   - **handelsverdragen** (`trade_privilege`) maken handel met een land goedkoper

   Wie handel uitlegt vanuit een oudere versie (of vanuit het geheugen van een AI), zit er dus
   flink naast. Dat bevestigt dat uitleg per versie moet.

## Wat erin staat, per onderwerp

Per onderwerp staat hier wat de save en de spelbestanden geven, en welke vragen van een speler we
daarmee kunnen beantwoorden. Nut en moeite zijn een inschatting.

### Handel en markt

| Gegeven | Waar | Voorbeeld (Belgium, 1 mei 1850) |
|---|---|---|
| Handel per goed per staat (vermoedelijk + export, − import; nog controleren) | `states.<id>.trade.goods` | Wallonia exporteert Tools (45) en Iron (37) en importeert Tobacco, Tea en Coffee |
| Trade Capacity en gebruik | `states.<id>.trade_capacity(_usage)` | Wallonia 168/175, Flanders 64/64: **vol** |
| Infrastructuur en gebruik | `states.<id>.infrastructure(_usage)` | Gelre 33/12, Wallonia 170/92 |
| Tarieven en subventies per goed | `C.import_tariffs`, `C.export_tariffs` | Import Paper `high_subventions`, Merchant Marine `high_subventions` |
| Belaste goederen | `C.taxed_goods` | Alleen Luxury Clothes |
| Mogelijke opbrengst consumptiebelasting per goed | `ai.<speler>.spending_variables.potential_consumption_taxes` | Grain £2.454, Clothes £2.562 per week |
| Trade Centers | `building_manager` (type `building_trade_center`) | Wallonia 14 levels: `trade_revenue`, `tariffs`, `subventions`, winst |
| World Market Hub en verbindingen | `market_manager.world_market.active_world_market_hubs` | Hub in Flanders (477), 65 verbindingen |
| Wereldmarktprijs per goed (trend) | `market_manager.world_market.price_trend.channels.<goed>` | 51 goederen, ringbuffer |
| Prijs in je eigen markt | `C.budget.current_price_report` | Al in gebruik |
| Handelsverdragen | `treaty_article_manager` (`trade_privilege`) | Met GBR, France en Switzerland |

**Vragen die we kunnen beantwoorden:**
- Mijn Trade Capacity is vol: moet ik Trade Centers bijbouwen?
- Welk goed importeer ik duur terwijl ik het zelf kan maken?
- Welk tarief kost me meer dan het oplevert?
- Waar is het goedkoper dan op mijn markt?
- Loont een handelsverdrag met dit land?
- Welke goederen kan ik belasten?

**Nut: hoog. Moeite: middel.**

### Productie en investeringen

| Gegeven | Waar | Voorbeeld |
|---|---|---|
| Waar de Investment Pool heen wil | `C.budget.investment` | Company Headquarter £2.974, Financial District £802, Paper Mill £570 |
| Bouwcapaciteit (Construction per week) | `ai.<speler>.spending_variables.construction_output` | 35. **Nog controleren in het spel** |
| Gemiddelde productiviteit, basisloon | `C.budget.average_productivity`, `base_wage` | 4,97 en £645 |
| Companies (winst, prosperity, charters) | `companies` | John Cockerill, prosperity 74, winst £8.116 |
| Ontsloten Production Methods | `C.new_production_methods_v2` | 24 nieuwe PM's sinds de laatste keer kijken |

**Vragen die we kunnen beantwoorden:**
- Waar wil het private kapitaal in investeren, en help ik dat?
- Welke nieuwe Production Method kan ik nu aanzetten?
- Hoeveel bouwcapaciteit heb ik echt?

**Nut: hoog. Moeite: laag tot middel.**

### Politiek: wetten, Interest Groups, partijen

| Gegeven | Waar | Voorbeeld |
|---|---|---|
| Actieve wetten (24) | `laws` met `active: true` | Al in gebruik |
| Alle mogelijke wetten per groep | `laws` (142 records voor de speler) + `common/laws` | Wat er na `law_mercantilism` kan komen |
| Interest Groups: approval, clout, traits, ideologieën | `interest_groups` | Rural Folk −9, `unhappy`; Petty Bourgeoisie `influential` |
| Partijen en stemmen | `parties` | Radical Party 47,8%, Military Party 41,1% |
| Verkiezingen | `election_manager` | Volgende verkiezing 29-9-1852 |
| Bewegingen en radicalisme | `political_movement_manager` | Labor 0,50, Radical 0,44 |
| Institutions en investering | `institutions` | Schools, level 3 |
| Decrees | `decree_manager` (`owner`) | Road Maintenance in Wallonia |
| Authority en bureaucratie | `ai.<speler>.spending_variables` | Authority 812,5, balans +112,5: **klopt met het spel** (812 en +112). Bureaucracy +625 en −356 (= +269), spel toont waarschijnlijk +208: **wijkt af**, nog uitzoeken |

**Vragen die we kunnen beantwoorden:**
- Welke wet kan ik nu het beste invoeren, en wie is ervoor en wie tegen?
- Hoe maak ik Rural Folk tevreden?
- Wat betekent het als een beweging radicaal wordt?
- Waar heb ik Authority over voor een decree?

**Nut: hoog.** Wetten zijn voor beginners het lastigst. **Moeite: middel**, want we moeten de
IG-ideologieën koppelen aan wetten via `common/ideologies`.

**Niet gevonden:** een wet die op dit moment wordt ingevoerd. Bij Emiel liep er waarschijnlijk geen.
Nog controleren met een save waarin wél een wet in behandeling is.

### Technologie

| Gegeven | Waar | Voorbeeld |
|---|---|---|
| Huidig onderzoek en wachtrij | `technology.<speler>.research_technology`, `research_queue` | Canneries |
| Voortgang per tech | `progressed_technologies` | Steel Railway Cars 15.841, Logistics 9.289 |
| Verspreiding vanuit andere landen | `currently_spreading_technologies` | Logistics, Baking Powder, Psychiatry |
| Innovatie per week | `ai.<speler>.spending_variables.innovation` / `max_innovation` | 52 van 113. **Nog controleren** |

**Vragen die we kunnen beantwoorden:**
- Wat is een goede volgende tech voor mijn land?
- Waarom gaat mijn onderzoek zo traag? (innovatie, geletterdheid, universiteiten)

**Nut: middel tot hoog. Moeite: middel.** De techboom staat in `common/technology`.

### Diplomatie

| Gegeven | Waar | Voorbeeld |
|---|---|---|
| Relaties per land | `relations` | France 100, GBR 80, Prussia 58 (ids 4, 1, 5) |
| Pacten: rivaliteit, verbeteren van relaties, steun aan separatisme | `pacts` | Rivaliteit met Netherlands (29); Netherlands steunt separatisme bij jou |
| Verdragen en artikelen | `treaty_manager`, `treaty_article_manager` | Garanties van GBR en Prussia |
| Interesses per strategische regio | `interest_manager` | Western, Southern, Central en Northern Europe |
| Lobbies | `political_lobbies` | 3 lobbies |
| Diplomatic catalysts | `diplomatic_catalysts` | 109 records |
| Power bloc, oorlogen, Diplomatic Plays | `power_bloc_manager`, `war_manager`, `diplomatic_plays` | Bij Emiel nu geen |

**Vragen die we kunnen beantwoorden:**
- Wie zijn mijn vrienden en vijanden, en wat kan ik met ze?
- Moet ik een power bloc in?
- Waarom zijn mijn relaties met X slecht?

**Nut: middel. Moeite: middel.** Landnamen staan in de localization.

### Bevolking

| Gegeven | Waar | Voorbeeld |
|---|---|---|
| Pops per type (werkenden, gezin, geletterd) | `pops` met `location` in je staten | 630k Peasants, 393k Laborers |
| Werkloos, subsistence, overheid en leger per staat | `states.<id>.pop_statistics` | Al deels in gebruik |
| Standard of Living per cultuur en religie | `C.pop_statistics.*_by_culture`, `*_by_religion` | |
| Behoeften per laag (welke goederen pops willen) | `states.<id>.pop_needs` | |
| Food security per pop | `pops.<id>.food_security` | |
| Kwalificaties (wie kan welk beroep) | `pops.<id>.qualifications` | Waarom vind ik geen Engineers? |

**Vragen die we kunnen beantwoorden:**
- Waarom stijgt mijn SoL niet?
- Waarom krijg ik mijn fabrieken niet vol?
- Welk goed missen mijn pops?

**Nut: hoog. Moeite: middel tot hoog**: groot onderdeel (37 MB), dus samenvatten in de worker.

### Doelen en Journal Entries

| Gegeven | Waar | Voorbeeld |
|---|---|---|
| Tutorial-doelen: voltooid en actief | `objective_manager` | Actief: Fix Budget Deficit, Grow GDP, Enact Institution Law, Earn Obligation, Declare an Interest, Lobbies |
| Journal Entries met voortgang | `journal_entry_manager` (`active`, `baseline_value`, `goal_value`) | Grow GDP: £3,92M van £4,90M · Liberalism: 32.338 van 48.507 |
| Spelerdoelen (Economic Dominance, Egalitarian, Hegemon) | `common/objectives/01_player_objectives.txt` | Emiel speelt met het tutorial-doel |

**Vragen die we kunnen beantwoorden:**
- Wat wil het spel nu van me?
- Hoe ver ben ik?
- Hoe haal ik dit doel?

**Nut: zeer hoog.** Dit sluit direct aan bij het spel en bij leren. **Moeite: laag**: doel →
les → officiële stappen.

### Leger en vloot

Er staan formaties, eenheden, schepen en fronten in de save. Bij Emiel is er geen oorlog. **Nut voor
nu: laag**, later bekijken.

## De spelbestanden als bron

| Bron | Inhoud | Gebruik |
|---|---|---|
| `localization/english/concepts_l_english.yml` | ~625 begrippen met omschrijving | Uitleg bij een begrip; context voor de AI |
| `localization/english/tutorial_l_english.yml` + `common/tutorial_lessons` | 24 lessen, 124 "how"-stappen | **Officiële stappen bij "Hoe doe ik dat?"** |
| `common/objective_subgoals`, `common/objectives` | Tutorial- en spelerdoelen, en wat ze ontgrendelt | Wat het spel nu van je vraagt |
| `localization/english/laws_l_english.yml` + `common/laws` | 361 wetomschrijvingen, effecten | Uitleg en vergelijking van wetten |
| `localization/english/interest_groups/` + `common/ideologies` | IG's, traits, wat ze vinden van wetten | Wie is voor of tegen een wet |
| `common/buildings`, `production_methods`, `goods`, `pop_needs` | Getallen en ketens | Rekenen: wat levert een PM op |
| `common/technology` | Techboom | Volgende tech kiezen |
| `common/defines` | Constantes | Rekenregels |

De teksten bevatten opmaakcodes zoals `[concept_trade]`, `$concept_goods$` en
`[GetBuildingType('building_trade_center').GetName]`. Die moet een kleine parser omzetten naar gewone
tekst met spelbegrippen. Bij `[concept_x]` kan de app meteen de uitleg van dat begrip koppelen.

**Licentie:** dit zijn teksten van Paradox. We lezen ze uit de eigen installatie van de speler, tonen ze
voor eigen gebruik en sturen ze als context naar de AI. In de repo komen alleen veldnamen en sleutels,
nooit de teksten zelf.

## Kansen, op volgorde

| # | Kans | Nut | Moeite | Bouwt op |
|---|---|---|---|---|
| 1 | **Doelen van het spel volgen:** actieve tutorial-doelen en Journal Entries met voortgang, en bij elk doel de officiële stappen uit de tutorial | Zeer hoog | Laag | Spelbestanden-parser |
| 2 | **Begrippen uitleggen:** spelbegrip aanklikken in een advies → omschrijving uit `concepts` | Hoog | Laag | Parser, `GameText` |
| 3 | **Leren: Handel** (#26): capaciteit vol, duur importeren wat je zelf kunt maken, tarieven, verdragen | Hoog | Middel | 1, 2 |
| 4 | **Investeringen en Production Methods:** wat de Investment Pool wil, nieuwe PM's aanzetten | Hoog | Middel | |
| 5 | **Wetten:** welke wet nu, wie is voor en wie tegen, wat het oplevert | Hoog | Middel | 2 |
| 6 | **Bevolking:** waarom SoL niet stijgt, welk goed pops missen, waarom fabrieken niet vol raken | Hoog | Middel–hoog | |
| 7 | **Technologie:** volgende tech, waarom onderzoek traag gaat | Middel | Middel | |
| 8 | **Diplomatie:** relaties, rivalen, power bloc | Middel | Middel | |
| 9 | **Doorvragen met de AI** (#27), met al het bovenstaande als context | Hoog | Middel | 1–3 |

## Voorstel

- **Eerst een spelbestanden-lezer.** Concepts, tutorial-lessen, objectives en de opmaakcodes, als
  algemene basis. Daarmee komen kans 1 (doelen volgen) en 2 (begrippen uitleggen) snel binnen bereik,
  en hebben #26 en #27 hun bronnen.
- Dan **#26 Leren: Handel**, met de opbouw die ook voor de andere onderwerpen werkt.
- Nieuwe issues om aan te maken: kans 1, 2, 4, 5 en 6. Kans 7 en 8 later.

## Nog te controleren in het spel (Emiel)

Klopt dit voor Belgium op **1 mei 1850**?

- [ ] Wallonia: Trade Capacity **168 van 175**; Flanders **64 van 64** (vol)
- [ ] Bouwcapaciteit (Construction) **35** per week
- [x] Authority **812** met een overschot van **+112**: klopt (tooltip in het spel, 17-11-2026) ✅
- [ ] Bureaucracy: save +269 (625 − 356), bovenbalk toont waarschijnlijk **+208**. Verschil uitzoeken (andere week, of ontbreken er posten?)
- [ ] Innovation **52** (max 113), onderzoek: **Canneries**
- [ ] Tutorial-doelen open: Fix Budget Deficit, Grow GDP (£3,92M van £4,90M), Enact Institution Law,
  Earn Obligation, Declare an Interest, Lobbies
- [ ] Import van Paper staat op **High Subventions**
