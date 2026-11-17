# Spike S5 – Vaste regels of AI?

_Issue #4 · Uitgevoerd: 17 november 2026 · Save: België, 16 september 1848 (1.15.1)_

## Vraag

Helpt een AI-adviseur echt, bovenop vaste regels? Hoe goed is het advies met alleen regels, en hoe goed met
een taalmodel erbij? Wat kost het?

## Opzet

- **Feiten** (`spikes/advisor/facts.mjs`): een compacte momentopname van je land uit de save (~6.500 tokens):
  begroting, schuld, prijzen t.o.v. basisprijs, alle gebouwen met winst en bezetting, werklozen per staat,
  bouwlijst, Interest Groups, wetten.
- **Vaste regels** (`rules.mjs`): 8 regels die adviezen maken met wat / waarom / let op / hoe.
- **AI** (`free-llm.mjs`): dezelfde feiten + de bevindingen van de regels + vaste instructies
  (`prompt.mjs`: Nederlands, Engelse spelbegrippen, geen getallen verzinnen, eerlijk zijn bij twijfel).
- **Model:** `gemini-3.6-flash` via de gratis laag van Google AI Studio (besluit Emiel: geen API-tegoed
  kopen). `gemini-3.8-flash` was overbelast (fout 503, tot 4,5 minuut per vraag).
- **Vragen** (`questions.json`): 6 vragen die een beginner zou stellen.

## Uitkomst in het kort

| | Vaste regels | Gemini 3.6 Flash |
|---|---|---|
| Vraag 1–3 (wat eerst, bouwen, schuld) | Goed: concreet en juist | Goed, met **extra inzichten**: duur papier maakt je Government Administration duur (£6.465/week); Iron Mines in Wallonia |
| Vraag 4 (Radicals) | Eén regel (belasting) | Beter: legt het **verband** met werkloosheid, lage SoL én de burgeroorlog van juni 1848 |
| Vraag 5 (welke wet) | **Geen antwoord** | Concreet: Dedicated Police of Guaranteed Liberties, met steun van de machtige Intelligentsia. Komt overeen met je "Learn the Game"-doel *Change current Policing Law* |
| Vraag 6 (Standard of Living) | Eén regel (belasting) | Beter: noemt 79 + 44 levels Subsistence Farms die industriebanen nodig hebben |
| Juistheid van getallen | Altijd juist (rechtstreeks uit de save) | Steekproef: alle gecontroleerde getallen klopten |
| Fouten | Geen gevonden | Kleine: eerder antwoord (3.8 Flash) noemde Ports "verlieslatend en militair" (Port maakt £491 winst); wetgroep heet *Internal Security*, niet *Home Affairs*; uitleg over burgeroorlog bij Approval < −10 is twijfelachtig; menunamen ("Buildings → Industry") zijn gegokt |
| Snelheid | Direct | 24–141 seconden per vraag; soms overbelast |
| Kosten | € 0 | € 0 (gratis laag; limieten per minuut en per dag) |

**Conclusie:** de AI voegt duidelijk iets toe, vooral bij **waarom-vragen** en **politiek** (vraag 4–6), waar
vaste regels tekortschieten. De regels blijven nodig: ze zijn direct, altijd beschikbaar en kloppen altijd,
en de AI leunt op hun bevindingen.

## Advies

1. **Combineren, zoals in het plan (§ 4.4a):** regels geven altijd direct het tipje en de adviezen; een knop
   "Vraag de adviseur" haalt AI-uitleg op de achtergrond op.
2. **Gratis Gemini als standaard**, met `gemini-3.6-flash`; het model instelbaar maken (andere gratis
   aanbieder, lokaal model of betaalde API).
3. **Vangrails:** AI-antwoorden tonen met "AI · kan fouten bevatten"; menunamen niet aan de AI overlaten
   maar uit onze eigen regels halen; de AI vooral laten uitleggen en verbinden, niet rekenen.
4. **Regels uitbreiden** met de gaten die de AI liet zien: Subsistence Farms en werkloosheid, overheidskosten
   door dure inputgoederen, politiek (wetten met steun van machtige Interest Groups).
5. **Later:** een kleine testset met "gouden antwoorden" om nieuwe prompts of modellen eerlijk te vergelijken.

## Beoordeling Emiel

**17-11-2026: "Gemini helpt meer."** De AI-adviseur gaat daarom naar voren in het plan: niet pas in fase 4,
maar als onderdeel van het adviespaneel (regels direct, AI-uitleg op verzoek).

## Antwoorden naast elkaar

### Q1. Wat moet ik nu als eerste doen?

**Vaste regels**

> 1. **Zet je bouwlijst weer aan.** Alle Construction staat op pauze terwijl er 10 projecten wachten. Je Construction Sectors kosten je toch £11,3K per week aan bouwmaterialen. _Let op: je weeksaldo is nu £2,5K. Kijk na een paar weken of het positief blijft._
> 2. **Breid je Paper Mill uit in Flanders.** Paper Mill in Flanders levert £1,6K winst per level per week. Paper kost 46.7 tegen een basisprijs van 30 (+56%): er is tekort. In Flanders zoeken 99.192 mensen werk. Je bouwlijst bevat er nu een in Gelre, waar minder werklozen zijn. _Let op: meer aanbod drukt de prijs. Bouw er één of twee bij en kijk dan opnieuw._
> 3. **Bouw meer Construction Sectors.** Je Investment Pool bevat £166,2K die op private bouw wacht, maar je hebt maar 3 levels Construction Sector. Daardoor gaat alles langzaam. _Let op: Construction Sectors kosten elke week bouwmaterialen; eerst je weekly balance positief houden._

**gemini-3.6-flash** (141.2s, 350 output tokens)

> 1. **Hervat je Construction:** Zet de bouwbalk rechtsboven weer aan, of ga naar het scherm **Construction** (tab *Queue*). De bouw staat nu stil, terwijl je een positief weeksaldo hebt van £2.507 (£32.144 inkomsten tegenover £29.636 uitgaven) en er 10 projecten in de rij staan.
> 
> 2. **Bouw een Paper Mill in Flanders:** Ga naar de staat **Flanders**, tab **Buildings**, en voeg een Paper Mill toe aan je Queue. Paper is schaars (+56% boven basisprijs, 46.7 vs 30) en je bestaande Paper Mill in Flanders maakt £1.615 winst per level. Flanders heeft bovendien 99.192 werklozen die een baan zoeken.
> 
> 3. **Verlaag op termijn je Tax Level:** Bekijk in het scherm **Budget** (tab *Overview*) je belasting. Je Tax Level staat op Very High. Dit drukt je Standard of Living naar 8.77 en veroorzaakt 1.222.155 Radicals (24,1% van je bevolking).
> 
> **Afweging:** Je schuld bedraagt £2.023.328 (44% van je Credit Limit van £4.614.425). Als je de Construction hervat of het Tax Level verlaagt, moet je opletten dat je wekelijkse saldo niet omslaat in een tekort, anders groeit de schuld verder.

**Beoordeling Emiel:** _nog in te vullen (welke helpt je het meest, en klopt het met het spel?)_

### Q2. Wat moet ik bouwen, en waar?

**Vaste regels**

> 1. **Zet je bouwlijst weer aan.** Alle Construction staat op pauze terwijl er 10 projecten wachten. Je Construction Sectors kosten je toch £11,3K per week aan bouwmaterialen. _Let op: je weeksaldo is nu £2,5K. Kijk na een paar weken of het positief blijft._
> 2. **Breid je Paper Mill uit in Flanders.** Paper Mill in Flanders levert £1,6K winst per level per week. Paper kost 46.7 tegen een basisprijs van 30 (+56%): er is tekort. In Flanders zoeken 99.192 mensen werk. Je bouwlijst bevat er nu een in Gelre, waar minder werklozen zijn. _Let op: meer aanbod drukt de prijs. Bouw er één of twee bij en kijk dan opnieuw._
> 3. **Bouw meer Construction Sectors.** Je Investment Pool bevat £166,2K die op private bouw wacht, maar je hebt maar 3 levels Construction Sector. Daardoor gaat alles langzaam. _Let op: Construction Sectors kosten elke week bouwmaterialen; eerst je weekly balance positief houden._
> 4. **Laat je Explosives Factory groeien.** Explosives Factory in Wallonia heeft pas 3% van zijn personeel en draait daardoor −£18 per week. Explosives is schaars (+145% boven de basisprijs). Vol bezet wordt hij winstgevend. _Let op: niet afbreken; geef hem een paar maanden._

**gemini-3.6-flash** (47.2s, 326 output tokens)

> 1. **Paper Mill in Flanders** (via het scherm *Buildings* -> *Industry* of direct via het regio-overzicht *Flanders*): Paper is 56% duurder dan de basisprijs (£46,7 vs £30). Je bestaande Paper Mill in Flanders maakt £1.615 winst per level en Flanders heeft 99.192 werklozen die direct aan het werk kunnen.
> 
> 2. **Construction Sector in Wallonia of Flanders** (via het scherm *Buildings* -> *Development*): Je land heeft nu slechts 3 levels Construction Sector. Hierdoor verlopen projecten traag, terwijl er £166.194 in de Investment Pool klaarstaat voor particuliere bouw.
> 
> 3. **Iron Mine in Wallonia** (via het scherm *Buildings* -> *Mining/Resource* of regio-overzicht *Wallonia*): Iron Mines in Wallonia behalen £253 winst per level en leveren grondstoffen voor je bouw. In Wallonia zoeken nog 64.570 mensen werk.
> 
> **Risico:** Je Construction staat momenteel volledig gepauzeerd. Als je de bouw hervat, kosten de bouwmaterialen alleen al £11.277 per week. Met je huidige weekly balance van £2.507 en een schuld van £2.023.328 (44% van je Credit Limit) kan het uitbreiden van je Construction Sector je weekbudget snel rood laten kleuren.

**Beoordeling Emiel:** _nog in te vullen (welke helpt je het meest, en klopt het met het spel?)_

### Q3. Hoe krijg ik mijn schuld omlaag zonder mijn economie af te remmen?

**Vaste regels**

> 1. **Zet je bouwlijst weer aan.** Alle Construction staat op pauze terwijl er 10 projecten wachten. Je Construction Sectors kosten je toch £11,3K per week aan bouwmaterialen. _Let op: je weeksaldo is nu £2,5K. Kijk na een paar weken of het positief blijft._
> 2. **Breid je Paper Mill uit in Flanders.** Paper Mill in Flanders levert £1,6K winst per level per week. Paper kost 46.7 tegen een basisprijs van 30 (+56%): er is tekort. In Flanders zoeken 99.192 mensen werk. Je bouwlijst bevat er nu een in Gelre, waar minder werklozen zijn. _Let op: meer aanbod drukt de prijs. Bouw er één of twee bij en kijk dan opnieuw._
> 3. **Houd je schuld in de gaten.** Je schuld is £2,02M: 44% van je Credit Limit (£4,61M). Je weekly balance is wel positief (£2,5K), dus de schuld loopt langzaam terug. _Let op: boven 100% van je Credit Limit ga je in Default: alle bouw stopt en gebouwen produceren minder._

**gemini-3.6-flash** (77.2s, 354 output tokens)

> 1. **Hervat je Construction (onderaan het scherm of via de Construction tab).** De bouw staat nu gepauzeerd, terwijl je wekelijkse saldo positief is (+£2.507). Door te bouwen spreek je de £166.194 in je Investment Pool aan voor private projecten. Dit kost je schatkist niets extra, maar laat je economie wel groeien.
> 
> 2. **Voeg een Paper Mill in Flanders toe aan de queue (via het Buildings screen).** Papier kost £46,7 (+56% boven de basisprijs) en de Paper Mill in Flanders maakt £1.615 winst per level. Er zijn daar 99.192 werklozen. Meer papier verlaagt bovendien de kosten van je Government Administration in Flanders, die nu £6.465 per week opslokt.
> 
> 3. **Houd Tax Level tijdelijk op Very High (via het Budget screen).** Je schuld bedraagt £2.023.328 (44% van je Credit Limit van £4.614.425). Met je huidige overschot van £2.507 per week los je dit automatisch gestaag af zonder gebouwen af te breken.
> 
> **Afweging:** Je Tax Level op Very High houden veroorzaakt 1.222.155 Radicals (24,1% van de bevolking) en een lage Standard of Living van 8,77. Verlaag de belastingen zodra de schuld hanteerbaar is om opstanden te voorkomen.

**Beoordeling Emiel:** _nog in te vullen (welke helpt je het meest, en klopt het met het spel?)_

### Q4. Waarom zijn zoveel mensen Radical, en wat kan ik eraan doen?

**Vaste regels**

> 1. **Overweeg je belasting een stap te verlagen.** Je Tax Level staat op Very High. 24.1% van je bevolking is Radical en je Standard of Living is 8.77. Hoge belasting maakt mensen armer en bozer. _Let op: minder belasting = minder inkomsten. Doe dit pas als je weekly balance (£2,5K) duidelijk positief blijft. Je schuld staat op 44% van je Credit Limit._

**gemini-3.6-flash** (66.9s, 314 output tokens)

> De hoge radicaliteit (1.222.155 Radicals, oftewel 24,1%) komt door je `Tax Level` op Very High, een lage `Standard of Living` (gemiddeld 8,77), 168.084 werklozen én de recente burgeroorlog van 24 juni 1848.
> 
> Doe het volgende op volgorde:
> 
> 1. **Hervat de bouw** in het **Construction** scherm (rechtsboven de pauzeknop uitzetten). Bouw fabrieksuitbreidingen in Flanders (99.192 werklozen) en Wallonia (64.570 werklozen). Werk geeft inkomen en verhoogt de `Standard of Living`.
> 2. **Verlaag je `Tax Level`** in het **Budget** scherm (tabblad Taxes) naar High of Medium zodra je saldo stabiel blijft. `Very High` belasting maakt je bevolking direct armer en bozer.
> 
> **Risico:**
> Als je het `Tax Level` nu meteen verlaagt, verlies je je wekelijkse overschot van £2.507. Aangezien je al £2.023.328 schuld hebt (44% van je `Credit Limit`), kan een negatief saldo je schuld snel laten oplopen. Het vergt tijd voordat Radicals uit een burgeroorlog vanzelf afnemen.

**Beoordeling Emiel:** _nog in te vullen (welke helpt je het meest, en klopt het met het spel?)_

### Q5. Welke wet moet ik nu proberen in te voeren, en waarom?

**Vaste regels**

> _Geen regel die deze vraag beantwoordt._

**gemini-3.6-flash** (58.7s, 284 output tokens)

> 1. Ga naar het scherm **Politics** en klik op het tabblad **Laws**.
> 2. Start de invoering van **Dedicated Police Force** (onder Law Group *Police*) of **Guaranteed Liberties** (onder Law Group *Home Affairs*).
> 
> **Waarom:**
> Je hebt een groot probleem met instabiliteit: 1.222.155 inwoners (24,1% van de bevolking) zijn Radical, terwijl je momenteel `no_police` en `no_home_affairs` als wetten hebt. De **Intelligentsia** is extreem machtig met 41,7% Clout en heeft +5 Approval. Omdat zij progressieve en institutionele wetten steunen, is de kans op een succesvolle en snelle Enactment heel hoog.
> 
> **Afweging of risico:**
> Veranderingen in wetgeving kunnen tegenstand oproepen bij de conservatieve Interest Groups. De **Landowners** (15,1% Clout, −1 Approval) en de **Devout** (13,5% Clout, −1 Approval) staan al in het rood. Als hun Approval onder −10 daalt, riskering je weer een civil war (de vorige eindigde recent op 24-06-1848).

**Beoordeling Emiel:** _nog in te vullen (welke helpt je het meest, en klopt het met het spel?)_

### Q6. Waarom is mijn Standard of Living zo laag?

**Vaste regels**

> 1. **Overweeg je belasting een stap te verlagen.** Je Tax Level staat op Very High. 24.1% van je bevolking is Radical en je Standard of Living is 8.77. Hoge belasting maakt mensen armer en bozer. _Let op: minder belasting = minder inkomsten. Doe dit pas als je weekly balance (£2,5K) duidelijk positief blijft. Je schuld staat op 44% van je Credit Limit._

**gemini-3.6-flash** (23.8s, 352 output tokens)

> Je Standard of Living (nu gemiddeld 8.77) is laag door een combinatie van maximale belastingen, werkloosheid en lage lonen. Neem deze stappen om dit op te lossen:
> 
> 1. **Hervat de bouw:** Ga naar het Construction-scherm en zet de bouwlijst uit pauze. Je hebt 168.084 Unemployed en duizenden boeren op Subsistence Farms (79 levels in Flanders, 44 in Wallonia) die Industrie- banen nodig hebben om hun loon te verhogen.
> 2. **Verlaag je Tax Level:** Ga naar het Budget-scherm. Je Tax Level staat momenteel op `very_high`. Dit vreet het besteedbaar inkomen van je bevolking op en is een directe oorzaak van de 1.222.155 Radicals (24,1% van je bevolking).
> 3. **Breid schaarse goederen uit:** Ga naar het Buildings-scherm en bouw fabrieken voor dure consumentengoederen, zoals de Paper Mill in Flanders (Paper kost 46,7, wat +56% boven de basisprijs is), om de kosten van levensonderhoud te verlagen.
> 
> **Afweging/Risico:** Als je het Tax Level verlaagt terwijl Construction draait, kan je wekelijkse balans van £2.507 omslaan in een tekort. Hierdoor stijgt je schuld verder (die nu al op £2.023.328 staat, oftewel 44% van je Credit Limit).

**Beoordeling Emiel:** _nog in te vullen (welke helpt je het meest, en klopt het met het spel?)_
