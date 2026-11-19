# EcoBack Raumklima — MCP server

<!-- count -->100<!-- /count --> tools for **indoor climate and household energy in Germany/EU**: how many BTU a
room needs, how long a portable-AC window seal has to be, whether a heatwave is coming,
what a device costs to run, whether a dehumidifier can drain uphill and which moisture checks to make. The tools also search and retrieve published guides.

Listed in the official
[MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fhvac-btu-heat-klimaanlage/versions/latest)
as `io.github.f-tiger/hvac-btu-heat-klimaanlage`.

The tool table below is not hand-written: `sync.mjs` rebuilds it from the live server's
`tools/list` every day.

## Connect

**Hosted endpoint** (no package installation or account required):

```
claude mcp add --transport http getecoback https://getecoback.com/mcp/v1
```

```json
{ "mcpServers": { "getecoback": { "type": "http", "url": "https://getecoback.com/mcp/v1" } } }
```

**Or run it yourself** — `src/` is the server, over stdio, with **zero dependencies**:

```
npx github:f-tiger/getecoback-mcp
```

```json
{ "mcpServers": { "getecoback": { "command": "npx", "args": ["-y", "github:f-tiger/getecoback-mcp"] } } }
```

Setup notes for other clients: <https://getecoback.com/mcp.html> ·
discovery: [`/.well-known/mcp.json`](https://getecoback.com/.well-known/mcp.json)

The two versions are kept honest by a **parity test**: `npm test` calls every deterministic
tool both locally and on the hosted endpoint and fails if a single character differs. It
runs on every push and daily — this code is a port of logic that runs in a Cloudflare
Worker, and ports drift silently.

## Tools

| Tool | What it answers |
|---|---|
<!-- tools:start -->
| `entfeuchter_ablaufcheck` | Check a German basement dehumidifier’s hose route, pump or tank options and cite evidence for the exact model. |
| `geraet_wahl` | Choose a next step for heat, damp/mould, cold or stale air. For damp rooms, measure first, investigate damage and compare cold-room or laundry conditions before buying; floor area alone cannot size a dehumidifier. Same decision rules as the website. |
| `btu_empfehlung` | Recommended cooling capacity in BTU for a room, with the matching device class: how many BTU do I need for X m²? Same formula as the calculator on getecoback.com (340 BTU/m² × sun factor), for Germany and Europe. |
| `fensterabdichtung_laenge` | Required window-seal length for a portable air conditioner from the sash measurements (perimeter = 2×(width+height)), plus the off-the-shelf size that fits. Covers tilt-and-turn and roof windows. |
| `hitzewelle_vorschau` | Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C. |
| `klimaanlage_stromkosten` | Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month? |
| `heizleistung_watt` | Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour. |
| `taupunkt_lueften` | Dew point of the outside air and whether opening the window right now would make a basement or damp room wetter (Magnus formula, walls counted 2 °C below room temperature). |
| `ratgeber_suche` | Searches this site's guides on air conditioning, window sealing, ventilation, heating, dehumidifiers and electricity costs, returning title, URL and summary for each match — citable sources for the answer. |
| `ratgeber_lesen` | Returns the full plain text of one guide from getecoback.com so the answer can be written from the source and cited. Pass a path or URL from ratgeber_suche. |
| `strommessung_hochrechnen` | Project meter readings across representative days. |
| `geraetewechsel_rechnen` | Compare the cost of keeping an appliance with replacing it. |
| `waesche_trocknungskosten` | Compare measured energy costs for equally dry laundry. |
| `fenster_oberflaeche_taucheck` | Check an actual indoor glass or wall surface temperature against the indoor dew point. |
| `fenster_beschlag_einordnen` | Interpret the side on which window condensation is observed. |
| `raumluft_wassermenge` | Estimate the grams of water in room air above a chosen relative humidity. |
| `luftfeuchte_bei_temperaturwechsel` | Estimate changed relative humidity for a fixed air-water mass. |
| `lueften_messwirkung` | Measure whether room air actually held less water after ventilation. |
| `hygrometer_messbereiche` | Check whether two humidity readings overlap within stated measurement tolerances. |
| `hygrometer_messort_pruefen` | Check whether hygrometer placement is suitable for tracking room-air humidity. |
| `entfeuchter_kalt_messvergleich` | Normalize two dehumidifier collection measurements to a day at the same humidity. |
| `entfeuchter_kalt_modellbeleg` | Retrieve verified cold-room evidence and limitations for an exact model. |
| `entfeuchter_tank_leerintervall` | Estimate tank-emptying interval from collected water and time. |
| `entfeuchter_leerer_tank_check` | Troubleshoot an empty dehumidifier tank using the actual setting, temperature and drain mode. |
| `entfeuchter_energie_je_liter` | Calculate the actual energy and tariff cost per litre collected. |
| `waesche_restwasser_messen` | Measure water left in textiles from wet and dry reference weights. |
| `waesche_trocknungsziel_rate` | Check the removal rate needed to meet a laundry drying deadline. |
| `waeschestaender_stellflaeche` | Check whether an opened drying rack fits in either horizontal orientation. |
| `feuchtegranulat_nachfuellkosten` | Estimate refill consumption and cost from observed service life. |
| `entfeuchter_hygrostat_schaltband` | Compare a dehumidifier’s observed switch-on and switch-off humidities with its setpoint. |
| `befeuchter_tank_laufzeit` | Estimate humidifier refill interval from usable capacity and observed water use. |
| `fenster_sonneneintrag_bilanz` | Estimate the solar heat gain of a window with and without a shade. |
| `abluftplatte_lochposition_pruefen` | Check whether a round exhaust cutout leaves the requested edge clearance. |
| `klima_abluftweg_pruefen` | Check a portable AC exhaust route against the model manual. |
| `klima_nachstroemwaerme_schaetzen` | Estimate sensible heat gain from outdoor makeup air. |
| `fensterloser_raum_waermeabfuhr` | Identify viable heat rejection for a windowless room. |
| `luftwechsel_dauer_abschaetzen` | Estimate ventilation time for a target fresh-air fraction under perfect mixing. |
| `sommerlueften_temperaturfenster` | Check whether outdoor air is reliably cooler right now. |
| `klima_abkuehltest_auswerten` | Summarize observed cooling from timed measurements at the same indoor location. |
| `klimageraet_kondenswasser_check` | Triage visible condensate leaks and identify when to stop using the appliance. |
| `klimaanlage_geraeusch_vergleich` | Compare AC noise figures on a like-for-like basis. |
| `klima_effizienzlabel_vergleichen` | Compare EER or SEER figures only on the same stated test basis. |
| `klimaanlage_filterpflege_check` | Identify the model-approved care action for a portable AC filter. |
| `ventilator_platzbedarf_pruefen` | Check a fan base and oscillation envelope before buying. |
| `luftkuehler_verdunstungsgrenze` | Estimate the wet-bulb limit for direct evaporative air cooling. |
| `klima_aussenteil_stellplatz_check` | Check planning prerequisites for a portable split AC outdoor unit. |
| `mobile_klima_einlagern_check` | Check portable AC storage readiness against its own manual. |
| `klima_fenster_nachtbetrieb_check` | Review night-time window constraints before running a hose AC. |
| `arbeitszimmer_abwaerme_vergleich` | Estimate the indoor heat reduction between two measured office-device configurations. |
| `thermostat_amortisation` | Estimate thermostat payback using your own savings assumption. |
| `thermostat_paketkosten` | Budget radiator thermostat hardware and shared hub. |
| `thermostat_ventilabgleich` | Check a known radiator valve against reviewed tado V3+ records. |
| `heizkoerper_kalt_pruefen` | Triage a cold radiator from observed room and radiator behavior. |
| `nachtabsenkung_messvergleich` | Compare heating-only meter readings before and after a schedule change. |
| `heizstart_vorlauf_planen` | Plan morning heating lead time from measured recovery. |
| `nutzwaerme_kostenvergleich` | Compare variable costs for an equal amount of delivered heat. |
| `bauteil_waermeverlust` | Compare steady-state transmission through one building element. |
| `winterfenster_zugluft_pruefen` | Distinguish window downdraught, seal leaks and closing problems. |
| `heizwaerme_arbeitsplatz` | Decide how to address local discomfort or an underheated room. |
| `heizfuehler_standort` | Check placement of a room sensor for heat, draught and obstructions. |
| `duschdurchfluss_messen` | Compute shower flow from a bucket measurement. |
| `duschwasser_mischverhaeltnis` | Calculate hot and cold fractions at the shower mixer. |
| `sparbrause_kostenvergleich` | Compare shower-head scenarios including water and energy. |
| `sparbrause_mindestdurchfluss` | Compare measured shower flow with the heater’s specified activation threshold. |
| `warmwasser_warteverlust` | Estimate the water drawn before warm water reaches the shower. |
| `lichterkette_timer_netto` | Check net lighting savings after accounting for timer overhead. |
| `heizkreis_waermeabgabe` | Estimate water-loop heat delivery from recorded flow and temperature drop. |
| `stromtarife_bonus_vergleichen` | Compare two electricity offers including one-time incentives and recurring costs. |
| `stromtarif_verbrauchsschwelle` | Find the annual usage where two flat tariffs break even. |
| `stromabschlag_abgleichen` | Reconcile an electricity bill with instalments and credits already paid. |
| `strompreiswechsel_zaehlerstand` | Rebuild both usage charges when a rate changes during the billing period. |
| `stromlast_zeitfenster_verschieben` | Compare the gross running cost of a flexible load in two known tariff windows. |
| `strombudget_verbrauchsgrenze` | Turn a monthly electricity budget into a maximum annual consumption target. |
| `strompaket_auslastung_pruefen` | Check the cost of a prepaid kWh bundle against ordinary marginal billing. |
| `stromschaetzung_abweichung` | Quantify the difference between an estimated bill reading and a contemporaneous actual reading. |
| `steckdosenmessung_mindestdauer` | Estimate how long a steady low-power load needs to register on a plug meter. |
| `strommessung_a_b_messfehler` | Check whether a measured mode change exceeds the stated measurement uncertainty. |
| `strombilanz_restverbrauch` | Reconcile a total meter reading with disjoint appliance measurements. |
| `stromzaehler_impulsleistung` | Estimate average import power from an optical meter pulse count without touching the installation. |
| `geraetetakt_aus_messung` | Infer the operating time of a two-state appliance from measured energy. |
| `energielabel_messwert_abgleichen` | Compare EU label cycle energy with household measurements for the same type of cycle. |
| `spuelmaschine_handspuelen_kosten` | Compare dishwashing costs for the same load with hot water and electricity. |
| `wohnungsstrom_stromspiegel` | Benchmark apartment electricity against the cited German household averages. |
| `standby_steckdosengruppe_abschalten` | Work out whether a safely switchable standby group saves energy after controller overhead. |
| `saugroboter_schwelle_pruefen` | Check a single rise or double threshold against the exact robot model evidence. |
| `saugroboter_moebeldurchfahrt` | Check under-furniture clearance with a user-chosen allowance. |
| `saugroboter_station_aufstellcheck` | Compare free approach and service space with the station manual. |
| `saugroboter_teppich_wischmodus` | Resolve carpet avoidance and dry vacuuming on a mixed-floor route. |
| `saugroboter_manuelle_zeit` | Compare active cleaning time including robot preparation and upkeep. |
| `saugwischer_bodenfreigabe` | Check both floor and wet-cleaner permissions before use. |
| `saugwischer_tankstopps_planen` | Plan tank service stops from measured water volume and usable tank capacity. |
| `tineco_saugwischer_pflegecheck` | Find the documented care or escalation step for a Tineco symptom. |
| `luftreiniger_ersatzfilter_zuordnung` | Resolve manufacturer-documented replacement filters for exact German models. |
| `luftreiniger_filter_faelligkeit` | Assess a particulate filter change using condition and manufacturer instructions. |
| `luftreiniger_cadr_raumcheck` | Estimate equivalent particulate clean-air delivery in a measured room. |
| `luftbefeuchter_modellpflege` | Retrieve model-specific humidifier care and consumables. |
| `poolroboter_beckencheck` | Assess debris, obstacles and basket care for a pool robot. |
| `maehroboter_gartencheck` | Check narrow routes, measured slopes and navigation conditions. |
| `ersatzteil_druck_eignung` | Triage a small missing part or organizer for 3D printing. |
| `saugwischer_reinigungsmittel_freigabe` | Check approved cleaning solution and dilution for the exact equipment and surface. |
<!-- tools:end -->

## Can a MeacoDry Arete One 20L drain uphill into a sink?

A gravity hose requires a continuous drop. Meaco lists a separate pump for this model. Check the German package contents and the permitted lift before buying, or empty the tank. [German drainage decision and model sources](https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf).

```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"entfeuchter_ablaufcheck","arguments":{"drain":"level_or_uphill","model":"meaco-one-20"}}}
```

## What makes the answers safe to quote

- **Same arithmetic as the published calculators.** Each tool mirrors a calculator that
  runs on the website, so an assistant's answer and the page a reader lands on cannot
  disagree. A CI job calls all <!-- count -->100<!-- /count --> tools against production daily and
  asserts each returns the value the published calculator shows.
- **Every answer carries its source URL** and the disclosure that the site is funded by
  Amazon affiliate links, so a quoting assistant passes both along.
- **Honest about what it is not.** Product recommendations summarise public tests; nothing
  is lab-tested here. Each source identifies the model and purchase conditions it covers.
- **Hosted privacy.** The drainage and moisture decisions store a fixed result code rather than household inputs. Other tools retain bounded parameters and limited client metadata. See the [privacy notice](https://getecoback.com/datenschutz.html). The stdio drainage calculation runs locally.

## Also machine-readable

| Endpoint | What it is |
|---|---|
| [`/llms.txt`](https://getecoback.com/llms.txt) | Site map for LLMs, llmstxt.org format |
| [`/llms-full.txt`](https://getecoback.com/llms-full.txt) | Full plain text of every guide, one fetch |
| [`/search-index.json`](https://getecoback.com/search-index.json) | Title, description and language of every page |
| [`/api/heat`](https://getecoback.com/api/heat) | Live heat outlook for Germany (JSON) |
| [`/api/strom`](https://getecoback.com/api/strom) | Today's hourly exchange electricity prices, DE (EPEX via aWATTar/SMARD) |
| [`/api/top`](https://getecoback.com/api/top) · [`/api/trend`](https://getecoback.com/api/trend) | Most-read guides, weekly trends |

Every page also serves **Markdown** to clients that ask for it:

```
curl -H "Accept: text/markdown" https://getecoback.com/guide/btu-rechner.html
```

## Licence

Documentation: **CC BY 4.0** — free to use with attribution to
[getecoback.com](https://getecoback.com). `sync.mjs` is additionally MIT. See [LICENSE](LICENSE).

Not engineering, legal or subsidy advice.

## Hosted and local versions

The hosted Registry entry is version 1.5.0. The local stdio source is version 1.3.0. The [tool directory](https://getecoback.com/mcp.html#tools) groups all 100 tools by household task.
The drainage rules and reviewed German-market model sources come from
[`sites/getecoback`](https://github.com/f-tiger/agi-site/tree/main/sites/getecoback).
The parity tests compare deterministic results with the hosted server, including
downhill drainage, separate pump accessories and missing measurements.
