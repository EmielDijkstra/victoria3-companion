# Savestructuur – gegevenskaart (spike S2)

_Issue #2 · Opgesteld: 17 november 2026 · Spelversie 1.15.1 · Rakaly CLI 0.8.23_

Waar staan de cijfers voor het dashboard in een Victoria 3-save? Deze kaart is gemaakt met een binaire
autosave die met Rakaly naar JSON is omgezet (`rakaly json save.v3`). Debugmodus en tekstsaves zijn
daardoor niet nodig (zie spike S1).

Testbestand: kopie van `autosave_exit.v3`, België, 16 september 1848 (124 MB JSON). Niet in de repo.

## Basis

| Wat | Pad | Opmerking |
|---|---|---|
| Spelversie | `meta_data.version` | Bijv. `"1.15.1"`. Ook in de kop van het `.v3`-bestand. |
| Datum | `date` (ook `meta_data.game_date`) | Formaat `jaar.maand.dag[.uur]`, bijv. `1848.9.16.6` |
| Land (naam) | `meta_data.name` | Bijv. `"Belgium"`; `meta_data.rank` = `"minor_power"` |
| Ironman | `meta_data.ironman` / `ironman.ironman` | `yes`/`no` (JSON: `true`/`false`) |
| Achievements | `meta_data.game_rules.settings` bevat `"achievements_allowed"` | Of de campagne achievements toestaat |
| ~~Autosave-interval~~ | `ironman.save_interval` | **Niet de instelling van de speler.** Autosaves van 1 aug, 1 sep en 1 okt 1848 (dus elke maand) zeggen allemaal `three_months` (gecontroleerd 17-11-2026). Niet tonen als instelling; het echte interval is af te leiden uit de datums van opeenvolgende autosaves |
| Campagne-id | `playthrough_id` | UUID; gebruiken om campagnes uit elkaar te houden |
| **Speler** | `player_manager.database.<n>.country` | Land-id (België = `25`). Alle "mijn land"-gegevens hangen hieraan. |
| **Mijn land** | `country_manager.database.<id>` | Hieronder afgekort als `C` |

## Kerncijfers van het land

| Dashboardveld | Pad (vanaf `C`) | Waarde 16-9-1848 | Opmerking |
|---|---|---|---|
| Tag | `definition` | `BEL` | |
| GDP (laatste meting) | `gdp.channels.0.values[(index − 1) mod lengte]` | £3.432.405 | Tijdreeks die ongeveer elke 4 weken een nieuwe waarde krijgt. Het spel toont de **actuele** GDP (£3,73M); die staat niet los in de save. De app toont daarom "GDP (meting van …)" of rekent hem zelf uit |
| GDP-geschiedenis | `gdp.channels.0.values` | max £4,80M, min £1,57M | Komt precies overeen met de GDP-grafiek in het spel (as 1.56M–4.80M). Geschikt voor trends |
| Laatste burgeroorlog | `last_civil_war_date` | 1848.6.24 | Verklaart de GDP-dip in juni 1848: goed voor uitleg in de app |
| Weekly Balance | som(`budget.weekly_income`) − som(`budget.weekly_expenses`) | +£2.507 | Lopende week. **Spel toont +£2.41K**: ~£100 verschil, nog uitzoeken welke post |
| Saldo-geschiedenis | `budget.balance_trend.weekly.samples` | nieuwste +£1.551 | Ringbuffer van 30 weken (zie "Tijdreeksen"); loopt achter op de lopende week |
| Inkomsten/uitgaven per post | `budget.weekly_income`, `budget.weekly_expenses` | | Arrays; de betekenis per index moet nog worden uitgezocht |
| Schatkist | `budget.money` | £0 | |
| Debt | `budget.principal` | £2.023.328 | |
| Credit Limit | `budget.credit` | £4.614.425 | Debt/limiet = 44% |
| Geldverloop | `budget.money_trend.weekly.samples` | | ≈ money − principal, per week |
| Standard of Living (gem.) | `avgsoltrend.channels.0.values` → laatste | 8,77 | |
| Literacy | `literacy.channels.0.values` → nieuwste | 42,2% | Tijdreeks. Spel toont 42.1% |
| Prestige | `prestige.channels.0.values` → laatste | | Tijdreeks |
| Bevolking | `pop_statistics.population_lower_strata` + `_middle_` + `_upper_` | ≈ 5,1 mln | |
| Radicals / Loyalists | `pop_statistics.population_radicals` / `population_loyalists` | 1.222.155 / 33.692 | |
| Unemployed | `pop_statistics.population_unemployed_workforce` | 168.084 | Ook `salaried_`, `government_`, `military_workforce` |
| Belastingniveau | `tax_level` | `very_high` | |
| Staten | `states` | `[477, 480, 476]` | Ids in `states.database` |
| Markt | `market` | `9` | Id in `market_manager.database` (bevat alleen `owner`) |

### Tijdreeksen: let op de ringbuffer

Reeksen worden rondgeschreven: als ze vol zijn, begint het spel weer vooraan. De nieuwste waarde staat dus
**niet altijd achteraan**.

- `…_trend.weekly`: nieuwste = `samples[(sample_index − 1 + aantal) mod aantal]`, met `latest_sample` als
  datum. Voorbeeld: in de save van 1 september was `sample_index` 0 (nieuwste achteraan), in die van
  16 september 2 (nieuwste op plek 1).
- `channels.0` (GDP, Literacy, SoL): nieuwste = `values[(index − 1) mod lengte]`, met `date` als datum.

Eerste versie van deze kaart pakte gewoon de laatste waarde; dat gaf voor 16 september een verkeerd
weeksaldo. De extractor (#9) moet dit goed doen en heeft er een test voor nodig.

## Interest Groups

`interest_groups.database.<id>` met `country == speler`. Velden: `definition` (bijv. `ig_intelligentsia`),
`approval` (−10…+10), `clout` (0–1), `influence_type` (`influential` / `neutral` / `marginal`),
`clout_trend`, `radical_trend`, `loyalist_trend`, `leader`, `party`, `traits`.

Voorbeeld 16-9-1848: Intelligentsia `approval 5`, `clout 0,42`, **influential**; Trade Unions `approval −9`.

## Wetten

`laws.database.<id>` met `country == speler`: `law` (bijv. `law_monarchy`), `active: true` voor geldende
wetten, `activation_date`.

- Een wet die in behandeling is of was, heeft `enactment_last_checkpoint_or_stop_date`. In deze save:
  `law_parliamentary_republic` (1846) en `law_free_trade` (1844). **Onzeker** of dat lopende of gestopte
  pogingen zijn; controleren in het spel.

## Gebouwen

`building_manager.database.<id>` met `state` in de staten van de speler. Bruikbare velden:

| Veld | Betekenis |
|---|---|
| `building`, `levels`, `state`, `production_methods` | Type, grootte, ligging, gekozen productiemethoden |
| `staffing`, `hiring_rate` | Bezetting (1 = vol per level?) |
| `goods_cost`, `goods_sales`, `salary_rate` | Kosten en opbrengst per week |
| `profit_after_reserves`, `profit_after_investments` | **Winst of verlies** → waarschuwing "gebouwen met verlies" |
| `cash_reserves` | Buffer van het gebouw |
| `input_goods_shortage` | Tekort aan grondstoffen (0–1) → waarschuwing "tekort" |
| `input_goods.goods.<goed>`, `output_goods.goods.<goed>` | In- en uitvoer per goed (zie goederen-id's) |
| `subsidized`, `government_dividends` | Subsidie en overheidsaandeel |

Voorbeeld: een `building_government_administration` (3 levels) met `profit_after_reserves −1.006`
(normaal voor een overheidsgebouw) en `input_goods_shortage 0,19`.

## Bouwen

| Wat | Pad | Opmerking |
|---|---|---|
| Overheidsbouwlijst | `C.government_queue.construction_elements` | Per item `type`, `state`, `construction_left` |
| Private bouwlijst | `C.private_queue.construction_elements` | |
| Bouwuitgaven | `C.budget.country_building_budget.expenses.construction_goods` | Per week |
| Pauze-vlag | `C.construction_paused` | Stond op `true` terwijl er wél bouwuitgaven waren. **Betekenis onzeker**; controleren |
| Bouwcapaciteit | – | **Niet direct opgeslagen.** Afleiden uit de levels en productiemethoden van `building_construction_sector` |

## Markt en prijzen

| Wat | Pad | Opmerking |
|---|---|---|
| Prijzen in je markt | `C.budget.current_price_report.goods.<goed>.value` | Ook `previous_price_report` voor de verandering |
| Wereldmarkt-trend | `market_manager.world_market.price_trend` | |
| Handel per staat | `states.database.<id>.trade.goods` | |
| Vraag en aanbod per goed | – | **Niet gevonden.** Afleiden uit de in- en uitvoer van gebouwen en de pop-behoeften, of via de prijs t.o.v. de basisprijs |

**Goederen-id's** zijn nummers. Het nummer is de volgorde van definitie in
`game/common/goods/00_goods.txt` (0 = ammunition, 7 = grain, 9 = fabric, 24 = coal, 25 = iron,
32 = steel, 35 = tools, 38 = meat …). De app leest die volgorde bij het opstarten uit de eigen installatie.
Controle: een veehouderij met `pm_sheep_farms` heeft input 7 + 35 (grain, tools) en output 9 + 38
(fabric, meat). Dat klopt.

**Basisprijzen** staan ook in `00_goods.txt` (`cost = …`). Prijs ÷ basisprijs geeft tekort (> 1) of
overschot (< 1).

## Niet (direct) in de save

| Veld | Status | Voorstel |
|---|---|---|
| **Legitimacy** | Alleen een teller (`C.counters.legitimacy`), geen waarde | Afleiden (regels uit `common/`) of in v1 weglaten |
| **Bureaucracy, Authority, Influence** | Niet op het land. Wel in een AI-cache: `ai.database.<id>.spending_variables` (`authority`, `authority_balance`, `bureaucracy_income`, `bureaucracy_expenses`) waar `country == speler` | Uitzoeken of de AI-cache voor het spelersland actueel is. Anders afleiden |
| **Bouwcapaciteit** | Niet opgeslagen | Afleiden uit construction sectors |
| **Vraag/aanbod per goed** | Niet gevonden | Afleiden of prijsverhouding gebruiken |

## Nog te controleren in het spel (Emiel)

Klopt dit voor België op **16 september 1848** (laatste save)? Gecontroleerd met Emiels schermafbeelding
van de bovenbalk (17-11-2026):

- [x] Standard of Living: save 8,77 · spel **8.8** ✅
- [x] Bevolking: save ≈ 5,06 mln · spel **5.06M** ✅
- [x] Radicals: save 1.222.155 · spel **1.22M** ✅
- [x] Loyalists: save 33.692 · spel **33.6K** ✅
- [x] Literacy: save 42,2% · spel **42.1%** ✅
- [~] Weekly Balance: save +£2.507 (lopende week) · spel **+£2.41K**. Bijna; ~£100 verschil uitzoeken
- [x] GDP: tooltip in het spel zegt **£3.73M** actueel. De reeks in de save (laatste meting £3,43M) loopt
  achter, maar de vorm klopt precies met de grafiek in het spel (4.80M–1.56M, dip door de burgeroorlog
  van juni 1848) ✅
- [ ] Debt ≈ **£2,02 mln**, Credit Limit ≈ **£4,61 mln**
- [ ] Unemployed ≈ **168k**
- [ ] Intelligentsia is Influential met approval +5; Trade Unions approval −9
- [ ] Is er een wet in behandeling, en welke?
- [ ] Staat de bouw op pauze (`construction_paused`)?

## Conclusie

Bijna alles voor het dashboard staat in de save en is direct te lezen. Drie velden moeten we afleiden of
uitstellen: Legitimacy, Bureaucracy/Authority/Influence en bouwcapaciteit. Voor de snapshot-extractor
(#9) is dit document de bron.
