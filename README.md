# EcoBack Raumklima — MCP server

<!-- count -->2003<!-- /count --> callable tool names for **household decisions in Germany**.
Use measurements to assess room climate and electricity use, plan laundry and
airflow, check model documentation, reconcile household bills, or compare an
appliance in use. The tools also search and retrieve published guides.

The [searchable tool directory](https://getecoback.com/mcp.html#tools) links to
source guides and documented examples, including a
[meter-to-bill comparison](https://getecoback.com/mcp.html#stromrechnung-messfenster-beispiel).

Official MCP Registry entries are available for the
[hosted endpoint](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fhvac-btu-heat-klimaanlage/versions/latest)
and the [local MCPB bundle](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fecoback-local-tools/versions/latest).

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

**Local MCPB bundle** for clients that support MCPB installation. Download
[EcoBack Local Household Tools 1.17.0](https://github.com/f-tiger/agi-site/releases/download/fleet-mcp-registry-2026-10-10/ecoback-local-tools-1.17.0.mcpb)
and install it with your client's MCPB option. It requires Node.js 22 or later.
The [local Registry entry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fecoback-local-tools/versions/latest)
lists the current bundle URL and SHA-256 checksum. Calculations run locally.
Weather and selected guide lookups use public endpoints when requested.

**Local stdio** also runs the tools on your device. Start the GitHub package with `npx`.

```
npx github:f-tiger/getecoback-mcp
```

```json
{ "mcpServers": { "getecoback": { "command": "npx", "args": ["-y", "github:f-tiger/getecoback-mcp"] } } }
```

Download or clone this repository once to keep the tools available offline. With
Node.js 22 or later, point your MCP client at `src/server.mjs` in the downloaded folder.

```json
{ "mcpServers": { "getecoback": { "command": "node", "args": ["/absolute/path/to/getecoback-mcp/src/server.mjs"] } } }
```

No package installation is required for this setup. Source and guide links in tool
answers still open their websites separately.

[Setup for other clients](https://getecoback.com/mcp.html) ·
[`/.well-known/mcp.json`](https://getecoback.com/.well-known/mcp.json)

Pull requests and pushes to main verify the local CLI and its deterministic examples
offline. Daily and manual checks also compare the exact hosted version and answers.

### Find tools offline

From a downloaded copy of this repository, search by a German question or by an
exact MCP tool name.

```sh
node src/find-tools.mjs 'Kann ich den Abflussschlauch nach oben führen?'
node src/find-tools.mjs 'Wie lange darf ich mit 72 Litern duschen?'
```

The command searches the local catalogue without contacting the website. It
returns up to five results as JSON with the tool name, input schema and any
recorded guide and example inputs. It uses the reviewed German ranking rules
from the EcoBack site repository. [Ranking source](https://github.com/f-tiger/agi-site/blob/d3464896ede6e50fc418af2d2f67962ba55f188e/sites/getecoback/site/assets/mcp-catalog-search.mjs)

## Tools

| Tool | What it answers |
|---|---|
<!-- tools:start -->
| `entfeuchter_ablaufcheck` | Check a German basement dehumidifier’s hose route, pump or tank options and cite evidence for the exact model. |
| `geraet_wahl` | Choose a next step for heat, damp/mould, cold or stale air. For damp rooms, measure first, investigate damage and compare cold-room or laundry conditions before buying; floor area alone cannot size a dehumidifier. Same decision rules as the website. |
| `btu_empfehlung` | Estimate cooling capacity in BTU/h from room area and sun exposure, using the website's baseline of 340 BTU/h per m². Consider a detailed load calculation for large rooms. |
| `fensterabdichtung_laenge` | Estimate the seal length for a portable air conditioner from sash measurements (perimeter = 2 × (width + height)) and identify a stock size to verify. Covers tilt-and-turn and roof windows. |
| `hitzewelle_vorschau` | Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C. |
| `klimaanlage_stromkosten` | Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month? |
| `heizleistung_watt` | Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour. |
| `taupunkt_lueften` | Compare outdoor dew point (Magnus approximation) with a wall estimate 2 °C below room temperature. A drying decision also needs indoor humidity and a measured coldest surface. |
| `ratgeber_suche` | Searches published guides with a readable Markdown mirror, returning title, canonical URL and task-specific summary. Every result can be passed to ratgeber_lesen. |
| `ratgeber_lesen` | Reads the cleaned Markdown of a published guide, with reviewed source links, assumptions and limits. Long excerpts are explicitly marked and link the full text. Pass an exact canonical path or URL from ratgeber_suche, without query or fragment. |
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
| `stromzaehler_wechsel_protokoll` | Reconcile energy across a documented meter replacement. |
| `stromzaehler_doppelregister_abgleichen` | Cross-check two import tariff registers against the total register. |
| `stromzaehler_stichtag_einordnen` | Interpolate an unobserved meter reading with bounds from two dated readings. |
| `strommessung_zeitabdeckung` | Audit interval coverage before treating an electricity log as complete. |
| `strommessgeraet_kostenfehler` | Correct a meter cost display calculated with the wrong tariff. |
| `messreihe_haushaltsgeraet_ausreisser` | Flag an unusual repeat measurement without discarding it automatically. |
| `steckdosenmessgeraet_einsatzgrenze` | Check documented plug-meter capacity and load-type approval before measuring. |
| `stromtarif_grundpreis_tage` | Check a partial-period fixed charge under a day-based billing method. |
| `stromtarif_boersenpreis_endpreis` | Translate a wholesale quote and your known surcharges into an estimated gross unit price. |
| `stromtarif_verbrauchsgewichteter_preis` | Calculate the unit price you actually paid from interval energy and gross prices. |
| `stromtarif_teilgarantie_szenario` | Stress-test the annual cost when only part of a tariff is covered by a price guarantee. |
| `stromtarif_vorauszahlung_kapital` | Estimate the opportunity cost of paying a full year up front. |
| `stromrechnung_steuerbasis_abgleich` | Reconcile net, gross and the stated tax rate for one bill line. |
| `stromtarif_bonus_bedingungen_check` | Identify unresolved bonus conditions before budgeting a conditional credit. |
| `stromtarif_niedertarif_mindestanteil` | Find how much consumption must fall in the low-rate band to match a flat offer. |
| `spuelmaschine_beladung_vergleichen` | Compare different dishwasher load sizes for the same number of clean place settings. |
| `kuehlschrank_temperaturprotokoll` | Check repeated thermometer readings against your target range before changing settings. |
| `led_lichtstrom_und_watt_vergleich` | Compare lamp efficacy only for alternatives that deliver comparable intended light. |
| `wasserkocher_mehrmenge_szenario` | Estimate how much energy goes into repeatedly heating water you do not use. |
| `geraet_reparaturpreis_grenze` | Find the repair quote at which repairing and replacing would have equal costs over a shared horizon. |
| `waesche_schleudern_gesamtenergie` | Compare washer spin settings on total wash-to-dry energy from measured loads. |
| `waschtrockner_label_nutzungsmix` | Interpret both ratings on a washer-dryer without double-counting the wash in combined cycles. |
| `strommessung_va_w_einordnen` | Distinguish apparent power from the active power used for energy billing. |
| `stromverbrauch_lastfenster_audit` | Identify the highest average-demand window without confusing a long window with a high peak. |
| `klimageraet_geraeusch_hintergrund` | Estimate the unit contribution from matched on/off sound recordings. |
| `klimageraet_geraeusch_zeitmittel` | Combine distinct sound measurement periods into one time-weighted LAeq. |
| `schlafzimmer_hitzestunden_messreihe` | Estimate hot hours and degree-hours from four equally spaced readings. |
| `schlafplatz_luftstrom_messen` | Compare measured bed-level air speed after changing airflow direction. |
| `balkon_schattenkante_schaetzen` | Project a balcony shade edge at a known solar elevation. |
| `sonnenschutzfolie_glasfreigabe` | Screen glazing and installation-side evidence for a solar film. |
| `dachfenster_schwenkraum_rechnen` | Check the measured roof-window swing envelope before adding a seal frame. |
| `raum_temperaturschichtung_messen` | Check for a vertical air temperature gradient at one indoor location. |
| `klima_zu_und_rueckluft_messen` | Estimate supply-to-return temperature difference from paired AC readings. |
| `klima_waermeabgabe_kreislauf` | Estimate hot-side heat rejection from matched cooling capacity and electrical input. |
| `klimaanlage_mietwohnung_unterlagencheck` | Identify missing model, placement and approval documents before an installation decision. |
| `befeuchter_weissen_belag_einordnen` | Triage potential mineral residue from a humidifier without diagnosing its origin. |
| `entfeuchter_geruch_eingrenzen` | Triage dehumidifier odour with observation and manual-approved actions. |
| `bad_feuchte_erholung_protokoll` | Check bathroom humidity recovery against the measured baseline. |
| `wand_oberflaechenfaktor_abschaetzen` | Calculate the measured surface-to-air temperature factor. |
| `heizwaerme_gradtag_szenario` | Normalize heating-only energy to a reference degree-day period. |
| `thermostat_betrieb_ohne_cloud` | Check documented offline controls independently of app or hub access. |
| `heizluefter_abschaltung_muster` | Triage observed portable heater shutdown behavior. |
| `infrarot_sichtlinie_arbeitsplatz` | Check an unobstructed line of sight for radiant heating placement. |
| `bad_heizgeraet_freigabe_unterlagen` | Identify missing bathroom-specific documentation before considering an electric heater. |
| `warmwasser_aufheizzeit_ideal` | Estimate an ideal hot-water recovery time from delivered heat. |
| `dusche_temperatur_streuung` | Summarize observed tap-temperature stability from three readings. |
| `wandfeuchte_beobachtung_dokumentieren` | Identify missing chronology and observations for a damp-wall assessment. |
| `lueftung_co2_abklingtest` | Estimate apparent air changes from measured CO₂ decay and known outdoor background. |
| `saugroboter_kartenabdeckung` | Estimate route coverage from observed floor areas after a robot pass. |
| `saugroboter_akkupause_zeitfenster` | Check whether a robot run with a recharge fits a home availability window. |
| `saugroboter_ergebnis_stichprobe` | Compare residual dirt after one versus two passes using equivalent checks. |
| `saugroboter_buerste_geraeusch` | Triage a new brush sound without running an unsafe or partly assembled robot. |
| `saros10r_filter_trocknungsfenster` | Apply the documented Saros 10R minimum filter drying time before reuse. |
| `saugwischer_akkuflaeche` | Estimate wet-cleaning area per usable charge from a measured pass. |
| `saugwischer_randstreifen_flaeche` | Estimate additional manual edge coverage after a wet-cleaner pass. |
| `saugwischer_wasserbilanz` | Compare dispensed and recovered water in a controlled wet-cleaning test. |
| `saugwischer_ersatzwalze_artikelabgleich` | Compare a replacement roller with official model and part documentation. |
| `saugwischer_mittelmenge` | Scale an approved manual dilution to the actual tank fill. |
| `luftreiniger_filtervorrat` | Check spare filter stock against the planned replacement dates and supply lead time. |
| `luftreiniger_filterkosten_laufzeit` | Estimate annual replacement media costs using observed intervals. |
| `luftreiniger_filterwechsel_luftstrom` | Check basic installation conditions when airflow drops immediately after filter replacement. |
| `luftreiniger_schadstoff_zweck` | Identify whether a room problem involves particles, odor or outdoor air exchange. |
| `luftreiniger_partikel_probe` | Interpret a paired room particle test with matched starting readings. |
| `luftbefeuchter_weisser_belag` | Check whether a white deposit may be linked to ultrasonic humidification. |
| `luftbefeuchter_neustart_pflege` | Check a humidifier before reuse after standing water or storage. |
| `luftbefeuchter_stellplatz_risiko` | Check for a safer humidifier location from observed placement conditions. |
| `luftbefeuchter_verdunster_dochtpflege` | Triage low output in a wick-based humidifier before replacing consumables. |
| `poolroboter_entnahme_fenster` | Check the observed lifting load and handling route for routine pool-robot retrieval. |
| `poolroboter_korb_pflegezeitfenster` | Reserve a post-run window for cleaning and storing the pool-robot filter basket. |
| `maehroboter_steigungsprofil` | Compare measured grade with the exact limit for mowing area, boundary or passage. |
| `maehroboter_maehfenster` | Estimate whether a mowing plan fits user-supplied permitted and supervised time windows. |
| `schubladentrenner_zuschnitt` | Size a non-load-bearing drawer divider prototype from internal dimensions and clearance. |
| `geraet_testzitat_einordnen` | Qualify a best-in-test claim by model, test group and date. |
| `haendler_link_modellnachweis` | Identify what a merchant link establishes about the exact model. |
| `angebot_lagerstatus_zitieren` | Qualify an availability quote by exact offer and observation date. |
| `angebote_gesamtpreis_vergleichen` | Compare delivered purchase totals for matched quotes. |
| `portasplit_gebraucht_belegliste` | Review the evidence needed before considering a used PortaSplit. |
| `pac_n90_ean_abgleichen` | Check the advertised model and GTIN for the documented German PAC N90 ECO Silent. |
| `auslands_datenblatt_de_angebot` | Check how an overseas datasheet applies to a German offer. |
| `thermostat_funkzentrale_abgleichen` | Match an existing hub to a documented smart radiator thermostat ecosystem. |
| `tado_x_funktionskosten_pruefen` | Identify possible recurring fees for the intended tado X app function. |
| `klima_kuehlleistung_einheit_abgleich` | Normalize two published cooling capacity figures, with a test-condition gate. |
| `klima_heizfunktion_datenblatt_nachweis` | Verify the documented heating principle in a reversible AC. |
| `luftreiniger_hepa_werbeaussage_pruefen` | Distinguish a filter class declaration from tested whole-device performance. |
| `comfee_mddf20_wf_beleggrenze` | Preserve the documented Comfee dehumidifier suffix and feature scope. |
| `luftbefeuchter_wasser_freigabe_beleg` | Resolve a model-specific humidifier water claim. |
| `saugroboter_stationsbundle_abgleichen` | Verify a robot vacuum bundle using robot and dock identifiers. |
| `energielabel_skala_vergleichbarkeit` | Check comparability before using efficiency letters in a buying decision. |
| `eco_raeumdaten_quellenangabe` | Create a ready-to-cite attribution for EcoBack’s open sizing dataset. |
| `strommessung_quellbeleg_export` | Check whether a meter reading records enough context to cite. |
| `klima_kaufzeitpunkt_eigenbedarf` | Decide whether the current quote fits an actual deadline and budget. |
| `klima_heizbetrieb_winterdaten_abgleich` | Check heating data coverage for the planned outdoor conditions. |
| `daemmvorhang_stoff_saisonbeleg` | Identify the evidence needed for a thermal curtain performance claim. |
| `luftbefeuchter_technik_fotobeleg` | Check whether the humidifier operating principle is actually documented. |
| `ersatzfilter_pack_stueckpreis` | Compare bundle unit prices after accessory fit and delivery charges. |
| `kundenrezension_modellgruppe_pruefen` | Assess whether a retailer review count applies to the exact variant. |
| `dusche_zeit_bei_wasserbudget` | Find the shower time allowed by a personal water budget. |
| `brause_fliessdruck_bereich` | Check a measured running pressure against the specified showerhead range. |
| `brauseschlauch_anschluesse_abgleichen` | Check both ends of a replacement shower hose against the documented connectors. |
| `dusche_waermeleistungsbedarf` | Estimate the continuous thermal output needed at a given shower flow. |
| `duschfolge_warmwasservorrat_einordnen` | Estimate consecutive showers using a known usable mixed-water volume. |
| `warmwasser_wartezeit_zapfstellen` | Compare waiting times at two taps measured from independent cold starts. |
| `warmwasser_rechnung_fix_und_variabel` | Separate fixed charges from the volume-dependent part of a stated hot-water billing plan. |
| `armatur_tropfverlust_schaetzen` | Project a captured drip rate over a limited observation period. |
| `wasserzaehler_ruhezustand_einordnen` | Interpret two observed water meter readings during a no-draw interval. |
| `duschbereich_naesse_ausserhalb` | Distinguish observations during use from water that reappears after the shower is off. |
| `warmwasser_nutzwaerme_gegen_zaehler` | Compare useful draw heat with a thermal meter covering the agreed boundary. |
| `spuelgang_nachwaschaufwand` | Account for actual repeat cycles when assessing dishwasher results. |
| `spuelprogramm_fertig_bis` | Check whether a suitable programme fits a dish-ready deadline. |
| `spuelmaschine_warmzulauf_freigabe` | Check the exact appliance manual for permission and a maximum warm inlet temperature. |
| `kontaktgrill_platten_spuelmaschine_beleg` | Look up the exact documented contact-grill plate cleaning claim. |
| `spuelmaschine_label_wasser_bezug` | Compare actual dishwasher litres per cycle with the applicable Eco label value. |
| `spuelmaschine_ablaufweg_anleitung` | Check dishwasher drain route measurements against the exact provided manual limits. |
| `trockner_programm_trockenmasse` | Check a load against the selected dryer programme’s stated capacity. |
| `waschtrockner_waschladung_aufteilen` | Estimate dry-only batches after a separately completed wash load in a washer-dryer. |
| `waesche_pflegeetikett_programmabgleich` | Check selected machine-wash settings against a garment’s supplied care label. |
| `waesche_zwei_maschinen_zeitplan` | Schedule repeated laundry batches through two separate appliances. |
| `waesche_abholzeit_trommel` | Calculate how long finished wet laundry would wait before collection. |
| `waescheleine_trockner_ladeanteil` | Split the supplied dry load mass into dryer-permitted and separately dried laundry. |
| `trockner_ende_feuchte_stichprobe` | Check whether the observed dryness of the slowest-drying items suits the intended next step. |
| `fensterdichtung_falz_profilabgleich` | Match a replacement window gasket to its documented groove and gap range. |
| `fensterrahmen_entwaesserung_dokumentieren` | Decide what to document when a window-frame opening might be drainage. |
| `innentuer_zugluftstopper_breite` | Check draft-stopper coverage and clearance for an ordinary interior door. |
| `thermovorhang_bahnenbedarf` | Calculate curtain panels from measured coverage and the chosen fullness. |
| `vorhang_parkbreite_fensterweg` | Check whether a parked curtain stack intrudes into the opening or handle path. |
| `innenrollo_lichtspalt_pruefen` | Check side light gaps using cloth width rather than mounting-bracket width. |
| `sonnenschutz_system_gwert_vergleichen` | Compare glazing-and-shade g-tot values at equivalent rating conditions. |
| `sonnenschutz_tageslicht_platzmessung` | Compare matched light-meter readings with a shade open and closed. |
| `fassadenbeschattung_zeitfenster_ueberlappung` | Compare one observed direct-sun interval with the planned shade schedule. |
| `sitzplatz_operative_temperatur_einordnen` | Estimate operative temperature under low air movement. |
| `raumtrennung_mischszenario_temperatur` | Estimate the limiting temperature if two room-air volumes fully mix. |
| `klimafenster_plattenzuschnitt_materialbedarf` | Estimate rectangular stock-sheet yield with edge and cutting allowances. |
| `abluftanschluss_kupplung_abgleichen` | Compare the actual mating diameters and connector types of an exhaust cuff. |
| `abluftgitter_freien_querschnitt_lesen` | Estimate net open area from a documented open-area ratio. |
| `heizkoerper_reflektor_flaechenbedarf` | Size reflector material for a single unobstructed rectangular wall patch. |
| `dachfenster_hitzeschutz_typabgleich` | Match roof-window shade documentation to the exact existing window type. |
| `dachdurchwaermung_spitzenverzug_protokoll` | Calculate the observed time lag between matched roof and indoor peaks. |
| `klimafenster_tag_nutzungswechsel` | Find whether a removable hose insert conflicts with scheduled daytime window use. |
| `klima_abluftrichtung_fassadenbeobachtung` | Identify nearby openings to record when outdoor exhaust may be reaching them. |
| `split_klima_transportweg_masscheck` | Check shipping dimensions against the narrowest straight doorway in the intended orientation. |
| `klimafenster_stoffkit_schadensbild` | Identify which fabric window-kit component needs inspection before reuse. |
| `raumtuer_schallmessung_a_b` | Report the measured adjacent-room level difference with one door open versus closed. |
| `klima_schallabstand_freifeld_szenario` | Estimate distance-only sound-level change for an ideal point source outside. |
| `monoblock_kuehlmodus_einstellung_pruefen` | Troubleshoot obvious control settings before treating a running portable AC as defective. |
| `saugroboter_kabelroute_vorbereiten` | Route around unresolved cords and loose items before a robot run. |
| `saugroboter_d10_wischmodul_nachlauf` | Check the documented mop removal and care sequence for the D10 Plus Gen 2. |
| `saugroboter_absaugstation_beutelkontrolle` | Decide whether to inspect the bag or log an incomplete auto-empty. |
| `saugroboter_zonen_faelligkeit` | Decide which zones are due under a household cleaning cadence. |
| `saugroboter_sensorhinweis_pflege` | Pick a manual-approved sensor care or support step after an alert. |
| `saugroboter_restaufgaben_verteilen` | Reserve separate work for stairs, edges and excluded flooring. |
| `saugroboter_staubbeutel_nutzungsplan` | Estimate planned bag stock from observed runs per change. |
| `saugwischer_flachbetrieb_raumprofil` | Compare head and body clearance for a wet cleaner under furniture. |
| `saugwischer_treppentransport_touren` | Count one-way transfers between floors for a wet-cleaning plan. |
| `saugwischer_wartezeit_nachpflege` | Check the turnaround before a wet cleaner is needed again. |
| `saugwischer_pflegestelle_entnahmeraum` | Check measured tank and roller access at a wet-cleaner service spot. |
| `saugwischer_reihenfolge_trockener_ausgang` | Preserve a dry exit route when scheduling floor zones. |
| `dreame_h14_pro_tank_selbstreinigung` | Apply the documented dirty-water-tank checks around H14 Pro self-cleaning. |
| `kuehlgeraet_platz_waermeeintrag` | Identify exposure and vent issues for an existing refrigerator placement. |
| `gefriergeraet_abtau_ersatzlager` | Check cold-storage capacity and a documented interruption window before defrosting. |
| `kuehlschrank_tueroeffnung_alltag` | Find which fridge-door routine accounts for more observed open time. |
| `kuehlgeraet_einbau_lueftungsabgleich` | Compare measured clear vent area to the manufacturer minimum. |
| `kuehlgeraet_gitter_pflegeschritt` | Choose a manual-approved or support step for dusty fridge vents. |
| `gefriergeraet_eisschicht_verlauf` | Record repeat frost at the same location without diagnosing a defect. |
| `kuehlschrank_einraeumfolge` | Prepare a refrigerator loading sequence from container state and available space. |
| `schublade_faecher_reihenbreite` | Calculate usable width after divider thickness in a row of drawer bins. |
| `schubladeneinsatz_aushebehoehe` | Check the measured vertical removal space before adding a removable drawer organizer. |
| `maehroboter_passage_seitenspiel` | Compare usable passage width with a location-specific manual requirement for an installed mower. |
| `schubladenfach_objekt_ausrichtung` | Find a usable 90-degree orientation for a rectangular stored object. |
| `strommessung_abba_abwechselnd` | Compare two appliance modes while balancing a linear order trend. |
| `feuchte_versuch_referenzraum` | Compare before-and-after humidity changes against a concurrent reference. |
| `hygrometer_standorttausch_auswerten` | Separate position effects from sensor offsets using a crossover. |
| `strommessung_woche_nutzungsmix` | Weight working-day and other-day measurements by their actual weekly frequency. |
| `stromversuch_wiederholungen_planen` | Plan independent repeats from pilot variation and a chosen precision target. |
| `gepaarte_stromversuche_richtungsspanne` | Estimate an uncertainty interval for how often a setting wins in paired repeats. |
| `sensorprotokoll_uhrdrift_abgleichen` | Align a sensor timestamp using two reference clock checks. |
| `messprotokolle_zeitfenster_schneiden` | Compute which part of two logs actually covers the same period. |
| `messdauer_zeitumstellung_korrigieren` | Correct elapsed time using recorded UTC offsets from both ends of a household measurement. |
| `raumfeuchte_abschnitte_zeitgewichtet` | Combine comparable humidity period averages without giving a short period the same weight as a long one. |
| `strommessung_messluecke_spannweite` | Bound unobserved energy using a defensible power ceiling instead of filling a gap with an average. |
| `trocknerversuch_abkuehlphase_check` | Identify early-cut dryer-cycle recordings before comparing full loads. |
| `strommessung_anlaufphase_getrennt` | Separate startup energy from the measured post-start phase. |
| `raumversuch_erholungspausen_planen` | Schedule room trials with time to restore documented starting conditions. |
| `geraetemessung_vorzyklus_nachwirkung` | Compare the same target mode after two different predecessor modes. |
| `messung_nullanzeige_obergrenze` | Interpret an unchanged cumulative meter reading without claiming zero consumption. |
| `geraeteverbrauch_nutzungsveraenderung` | Decompose an observed energy change into a usage-count effect and a per-task effect. |
| `messreihe_echte_wiederholungen_zaehlen` | Count independent household trials without treating every logger sample as a replicate. |
| `stromlogger_kurzereignis_stichprobe` | Check whether a short load episode can fall between point samples. |
| `ab_haushaltsversuch_stoerfaktoren` | Review workload, endpoints and changed settings before testing. |
| `strommessung_abschnitte_verketten` | Verify that two cumulative-energy windows are adjacent and avoid double counting. |
| `strommessung_vorhersage_praxistag` | Compare a projected daily rate to a reserved validation day. |
| `hygrometer_grenzuebertritt_zeitfenster` | Report the observation bracket for a threshold crossing between sparse samples. |
| `lueftungsversuch_wetterpaare_eignung` | Screen ventilation pairs against declared outdoor temperature and humidity tolerances. |
| `hygrometer_anzeige_vom_sitzplatz` | Compare two hygrometer display positions from the usual reading seat. |
| `hygrometer_minmax_ablesen_uebergabe` | Identify whether a minimum or maximum can be assigned to the intended observation window. |
| `saugwischer_bedienphasen_pausenfenster` | Find which active stages exceed a household’s chosen uninterrupted-work window. |
| `saugwischer_griffwechsel_routine` | Compare observed grip changes during two wet-cleaner control layouts. |
| `saugwischer_tanklast_vor_nach_entleeren` | Compare the measured empty and loaded mass of a removable wet-cleaner tank. |
| `saugroboter_laufstatus_haushalt_uebergabe` | Decide what to hand off after an interrupted or unverified robot run. |
| `saugroboter_start_ohne_telefon_ersatzplan` | Identify documented on-device alternatives when the phone is unavailable. |
| `entfeuchter_tank_zwischenablage_abgleichen` | Check usable shelf dimensions for a removed dehumidifier tank. |
| `entfeuchter_tankmeldung_uebergabe` | Assign a checked human handoff when the dehumidifier tank indication is hard to notice. |
| `entfeuchter_bedienmatrix_ohne_app` | Map which household dehumidifier operations have a verified local control. |
| `luftbefeuchter_nachfuellen_kleine_portionen` | Calculate hand-carried refill portions when the device instructions permit in-place filling. |
| `luftbefeuchter_lokale_regelung_ersatzroutine` | Distinguish a local target selector from a simple humidifier output setting. |
| `ventilator_fernbedienung_nutzplaetze` | Compare observed remote-control reception at two usual fan-use positions. |
| `ventilator_stufenwahl_tastendruecke` | Count presses needed on a documented cyclic fan control. |
| `ventilator_schwenkbereich_sitzplaetze` | Check whether an observed fan sweep geometrically reaches both chosen seats. |
| `thermostat_manuelle_aenderung_ueberlappt_termin` | Check whether a documented manual hold covers the intended occupancy window. |
| `thermostat_wechselakku_ladefenster` | Plan charging batches for a verified removable thermostat battery pack. |
| `thermostat_kopfzuordnung_raumplan` | Count thermostat labels missing from a room with multiple radiator heads. |
| `schublade_zugriff_hintere_tiefe` | Find how much of a drawer stays behind the cabinet front. |
| `schubladen_markierungen_zuordnen` | Plan how many distinct drawer labels are still needed and check the space for a tested label. |
| `kuehlschrank_griffseite_routinenvergleich` | Compare how often a measured refrigerator door routine requires walking around the door. |
| `luftreiniger_filterwechsel_anzeige_uebergabe` | Distinguish a completed physical replacement from a display reset during care handoff. |
| `waeschestaender_leinen_reichweite` | Count drying lines inside a self-measured preferred height range. |
| `steckdosenleiste_schalter_zugriffsweg` | Check obstruction-free physical access to an existing switched power strip. |
| `klimageraet_fruehjahrsstart_ruhezeit` | Schedule a portable AC restart after the documented settling period. |
| `klima_herbst_trocknungsfenster_planen` | Fit a documented end-of-season drying run before pick-up. |
| `klima_abschalttimer_mitternacht` | Set a delay-based overnight switch-off timer at the nearest earlier supported step. |
| `mobilklima_zweiraum_folgeplan` | Check when one portable unit can serve two rooms in a fixed sequence. |
| `schlafzimmer_kuehlpause_reserve` | Estimate the remaining off-period before a chosen indoor temperature is reached. |
| `klima_nachtregime_ziel_und_verbrauch` | Choose the least energy-intensive observed night regime that met your coverage requirement. |
| `ventilator_wochenbudget_nachtmix` | Allocate stronger fan nights while reserving the measured baseline for every night. |
| `wechselzeit_heiz_kuehl_schaltung` | Classify a mild-season morning, noon and evening against your chosen mode boundaries. |
| `thermostat_ferienprogramm_rueckkehr` | Identify a recovery shortfall around holiday mode and the first scheduled heating period. |
| `thermostat_fensterpause_verzoegerung` | Compare a measured ventilation stop with a documented fixed thermostat pause. |
| `heizkoerper_saison_warmefreigabe_pruefen` | Trace the first heating demand through known room and central controls. |
| `kwl_winter_rueckwaerme_messquote` | Estimate an apparent single-point supply-air heat-recovery ratio. |
| `kwl_sommerbypass_kuehlgewinn_probe` | Compare matched summer bypass supply temperatures against a personal target. |
| `keller_sommer_lueften_messfenster` | Select observed summer basement airing windows from absolute humidity and sensor uncertainty. |
| `entfeuchter_mindestpause_zeitplan` | Schedule the next dehumidification interval using the exact documented restart delay. |
| `entfeuchtung_rueckkehr_nach_pause` | Report moisture rebound after a documented drying interval. |
| `keller_entfeuchter_saisonstunden_abdeckung` | Estimate how much of a sampled cold-season dehumidification window falls within the documented temperature range. |
| `luftreiniger_zweistufen_aussenluftvergleich` | Estimate the clean-air contribution of a high and a quiet filter phase without counting fresh air. |
| `klima_lueftung_aufgaben_uebergabe` | Identify missing outdoor-air provision after switching to recirculating cooling. |
| `thermostat_uebergang_zeitplan_umgehung` | Distinguish manual overrides and automation rules from a normal scheduled setpoint. |
| `raeumzeit_profil_thermostat_kalenderwechsel` | Compare changed workday occupancy with an existing scheduled heating interval. |
| `heizdecke_saison_vorlauf_abschaltcheck` | Verify whether a documented blanket preheat timer ends before the chosen use time. |
| `ventilator_nacht_geraeuschprofil_kompromiss` | Find which measured fan settings meet independently chosen air speed and sound criteria. |
| `raumklimageraet_modus_nach_strompause` | Check which previously scheduled room-climate settings actually returned after an observed outage. |
| `geraetekauf_raten_gegen_barpreis` | Compare the stated installment total with the full cash price. |
| `geraeteaufpreis_strompreisband` | Test the purchase premium across a range of energy prices. |
| `geraete_gebraucht_restnutzungs_schwelle` | Find the used appliance usage threshold relative to a new one. |
| `geraet_reparatur_ausfallkosten` | Add necessary downtime costs to a household repair quote. |
| `geraet_bundle_aufpreis_gebrauchswert` | Value only wanted and confirmed extras when comparing a bundle premium. |
| `reiniger_zeitgewinn_gegen_aufpreis` | Quantify the break-even personal value per hour of active cleaning time saved. |
| `thermostat_erprobung_wiederverwendungskosten` | Compare pilot and direct expansion costs after crediting confirmed reusable components. |
| `kuehlloesung_uebergangsbudget_gegen_aufpreis` | Compare bridging costs with the premium for a verified immediate alternative. |
| `oskar_filtermatten_gemeinsamer_vorrat` | Plan a shared stock of verified O-030 mat packs across the two compatible humidifiers. |
| `verbrauchsmaterial_parallel_beschaffen` | Identify the critical delivery time when all mandatory consumables are needed. |
| `beurer_lb200_filter_frist_auslastung` | Compare the documented runtime alert and maximum calendar replacement interval for a Beurer LB 200 filter. |
| `saugwischer_gebraucht_startmaterial_budget` | Add verified consumable needs to the used wet cleaner start-up budget. |
| `saugwischer_handbuch_ace_xt_abgleichen` | Distinguish the exact F25 XT variant from the related ACE manual and other trims. |
| `klima_zubehoerbudget_verteilreserve` | Partition an accessory budget into verified quotes and remaining allowance. |
| `angebote_gueltigkeitsfenster_ueberschneidung` | Find the overlap between two confirmed quote-validity windows. |
| `geraete_label_rundung_abstand` | Check whether report rounding alone could explain a small difference between two comparable labels. |
| `luftreiniger_cadr_wert_pruefvergleich` | Check comparability of advertised CADR for the required particle category and operating setting. |
| `geraet_verpackungsmass_datenblatt_abgrenzen` | Separate unpacked operating dimensions from carton measurements before a buying shortlist. |
| `angebot_rabatt_ungeplante_fuellerkosten` | Test a coupon against items you would not otherwise buy. |
| `kaufangebot_rueckgabe_szenario_budget` | Estimate a return-and-rebuy budget from confirmed fees and refund assumptions. |
| `oskar_luftbefeuchter_zielstufe_dokumentiert` | Check whether Oskar or Oskar little documents the requested target-humidity control setting. |
| `kuehltechnik_varianten_beleg_inverter` | Qualify evidence for inverter modulation without inferring it from split versus monoblock. |
| `klima_alternativen_gemeinsames_ausschlusskriterium` | Compare two alternatives against one actual non-negotiable setup requirement. |
| `geblaese_leistungsangabe_betriebsart` | Identify whether an input-power figure refers to fan-only or compressor cooling. |
| `ersatzteil_erneuerung_passung_und_einsatzzeit` | Compare repair-part lead time and setup time with a confirmed replacement path. |
| `stromfenster_mehrphasen_start` | Find the cheapest contiguous start for a two-phase load. |
| `unterbrechbare_last_preisfenster_verteilen` | Allocate interruptible energy across known time slots with capacity limits. |
| `strompreis_zwei_geraete_ruhefenster` | Pick distinct low-cost slots for two planned chores that must not overlap. |
| `strombudget_optionale_zyklen_priorisieren` | Allocate full optional runs in priority order after essential use and reserve. |
| `strombudget_restwochenpfad` | Find the remaining workday allowance after actual usage and planned weekend loads. |
| `strombudget_hitzetage_reserve` | Find the headroom for hot days above the measured normal-day baseline. |
| `strombudget_maximaler_arbeitspreis` | Compute the maximum all-in variable rate a fixed consumption budget can absorb. |
| `strommessung_unterzaehler_netzbaum` | Reconcile a nested submeter plus independent loads without counting its measured child twice. |
| `haushaltsstrom_geteilte_nutzung_szenario` | Build a private two-party household cost-sharing scenario from direct and shared usage. |
| `strombedarf_zwei_zeitfenster_aufschubkosten` | Check whether standby energy during a delayed cycle offsets tariff savings. |
| `stromsparplan_massnahmen_ueberlappung` | Avoid double-counting overlapping measured electricity savings. |
| `stromrechnung_ruecklage_geplant` | Estimate a monthly reserve from a supplied final-bill range. |
| `duschwasserbudget_zwei_personen` | Allocate a shared water allowance when two showers have different measured flow rates. |
| `spuelprogramme_wasser_strom_zielkonflikt` | Check measured dishwashing cycles against independent water and electricity limits. |
| `brause_duschdauer_wasser_und_waerme_limit` | Find a comparable shower duration that keeps both water and heat within the old use. |
| `waesche_wochenbedarf_leine_und_trockner` | Check weekly dryer energy needed when outdoor or rack slots are limited. |
| `strombudget_verbrauch_messspanne` | Decide whether a budget is certainly met, exceeded, or unresolved under two measurement bounds. |
| `heizpause_durchlaufen_wiederaufheizen` | Compare matched heating sessions with and without an intervening pause. |
| `stromkosten_preis_und_menge_abgleichen` | Reconcile a higher bill into fixed, usage, and rate effects by a fixed calculation order. |
| `stromrechnung_zeilenrundung_abgleichen` | Reconcile per-line cents against rounding the combined electricity amount. |
| `beleuchtung_schaltgruppen_belegung` | Estimate the benefit of separately switching two light groups during partly shared use. |
| `geraetelauf_aufsichtswechsel_zeitplan` | Find a feasible finish when different people handle launch and unload at known times. |
| `haushalt_strommessgeraete_wochenrotation` | Plan how many non-overlapping batches of simultaneous household measurements are needed. |
| `haushaltsgeraete_tagesfenster_energierahmen` | Allocate a household energy envelope to a timed block and show the remainder. |
| `raumgrundriss_l_flaeche` | Measure an L-shaped room footprint from an enclosing rectangle and one corner cutout. |
| `dachraum_luftvolumen_aufmass` | Calculate room air volume under one planar sloped ceiling. |
| `stellwand_freie_abschnitte_ermitteln` | Find the longest clear wall span rather than adding separated gaps. |
| `stellplatz_tuerschwenk_ueberlagerung` | Detect overlap between a device footprint and a measured door-sweep box. |
| `waeschestaender_textil_bodenfreiheit` | Compare the lowest hanging hem against the measured space below each line. |
| `umstellplatz_zwei_moebel_zwischenparken` | Check simultaneous temporary parking for two rectangular furniture footprints. |
| `saugroboter_umstellprobe_flaechengewinn` | Quantify newly cleaned floor area per minute of a reversible furniture move. |
| `reinigungszonen_nach_moebelrueckkehr` | Identify pending floor patches where staged furniture footprints would cover wet zones. |
| `luftreiniger_ansaugseiten_freiflaeche` | Check the individual intake and top outlet clearances from the exact model manual. |
| `luftreiniger_filter_entnahmeweg_stellplatz` | Verify maintenance access along the filter extraction direction. |
| `luftreiniger_getrennte_raeume_belegungsueberschneidung` | Identify simultaneous separate-room demand before sharing one portable purifier. |
| `querlueften_richtungskarte_beobachten` | Map observed flow directions without estimating an air exchange rate. |
| `fensterplatte_markierungen_nach_abnahme` | Compare a removable panel reinstallation with two marked reference points. |
| `fensterrahmen_diagonalen_vor_zuschnitt` | Compare measured frame diagonals with the rectangle implied by width and height. |
| `thermovorhang_heizkoerper_stoffkante` | Find projected radiator overlap at the present and proposed curtain hem. |
| `kondensatschlauch_durchgang_kreuzung` | Compare two proposed drain-hose paths against a measured passage band. |
| `sitzplaetze_beobachtete_schattenzone` | Classify two candidate seating positions in a marked rectangular patch of shade. |
| `ventilator_stellort_kabelweg_zwei_varianten` | Compare measured route length and occupied-path conflicts at two fan locations. |
| `ventilator_sitztausch_zwei_personen` | Match two occupants to two seats from their own fan-comfort observations. |
| `hygrometer_messpunkt_markierung_versatz` | Compute marked sensor position displacement before combining a time series. |
| `haushaltsweg_begegnung_freie_breite` | Check simultaneous passage width for two carried household items. |
| `schreibtisch_geraeteklemme_kantenabgleich` | Compare two desk-edge candidates against the documented clip geometry. |
| `entfeuchter_tankweg_tragstrecke` | Compare repeated carrying distance to the emptying point for two dehumidifier locations. |
| `klimageraet_serviceposition_markieren` | Check a straight repositioning distance for access to a switched-off portable unit. |
| `wetterprognose_ausgabe_und_zielstunde` | Check whether forecasts issued at different times describe the same valid hour. |
| `wetterquelle_standort_messvergleich` | Choose the defensible source for a window-side observation. |
| `hitzeprognose_entscheidung_revidieren` | Review a heat preparation decision after a forecast revision. |
| `hitzeprognose_lokaler_fehlerbereich` | Summarize three signed forecast errors observed at the property. |
| `hitze_drei_tage_warme_naechte_folge` | Find consecutive day-and-night heat pairs in a short weather log. |
| `schlafraum_waermegradstunden_nacht` | Estimate heat degree-hours between three indoor readings. |
| `nachtlueften_windmittel_und_boeen` | Compare a recorded wind average and gust without assigning a window safety rating. |
| `nachtlueften_oeffnungslog_unterbrechungen` | Audit usable open-window time after recorded disruptions. |
| `wetterprognose_vor_nachtblock_auffrischung` | Check forecast freshness and time coverage before the planned ventilation block. |
| `nachtlueftung_luftpfad_rueckstrom_probe` | Flag incomplete cross-ventilation-path evidence. |
| `sommerluft_kuehler_und_trockener_fensterwahl` | Compare two outdoor-air samples when cooling and drying both matter. |
| `dachraum_wiedererholung_gegen_aussen` | Flag a delayed indoor rebound after outdoor conditions ease. |
| `regen_fleck_wiederkehr_ereignisvergleich` | Check recurrence after rain without identifying a building defect. |
| `wandfleck_umriss_aenderung_protokollieren` | Record changes in a bounding rectangle, not a moisture diagnosis. |
| `keller_hygrometer_anzeige_obere_messgrenze` | Distinguish a capped humidity reading from a usable measurement. |
| `winterfenster_taupunkt_wechselintervall` | Bracket a change in surface dew-point margin without inventing an exact onset. |
| `winterluft_feuchte_rueckkehr_wiedererwaermt` | Quantify moisture rebound using three dew-point observations. |
| `winterfenster_oberflaeche_erholt_sich_spaeter` | Verify separate air and surface recovery instead of extrapolating from a warm room. |
| `regenprognose_zwei_stunden_wahrscheinlichkeitsgrenzen` | Bound rain in either of two reported forecast periods. |
| `nachtluft_waerme_und_wasser_energievergleich` | Compare ideal moist-air enthalpy for a cool but humid night. |
| `hitze_vorbereitung_vorlauf_abhaengige_schritte` | Check a two-step shading preparation sequence against an expected heat onset. |
| `keller_aussen_hygrometer_zielwert_oberflaechenreserve` | Calculate the outdoor relative-humidity marker corresponding to a dew-point margin. |
| `wetterbericht_temperaturwert_als_messziel` | Keep apparent and daily heat data separate from timed measured-air comparisons. |
| `nachtlueftung_sensorreaktion_messzeiten_abgleichen` | Decide whether a short cooling record gives a moved sensor time to settle. |
| `wasserkocher_fuellsplitt_mindestmenge` | Schedule equal kettle batches within the documented minimum and maximum. |
| `wasserkocher_wahlstufe_abgleichen` | Match a kettle target to a documented evenly spaced setting. |
| `wasserkocher_tassenmarke_messbecher` | Compare a kettle’s cup mark against the volume of your serving cup. |
| `wasserkocher_entkalkung_zeitfenster` | Reserve an uninterrupted window for the kettle’s documented care steps. |
| `wasserkocher_warmhalte_schlussabgleich` | Check serving times against the kettle’s documented holding interval. |
| `wasserkocher_zwei_aufguesse_servierplan` | Schedule two passive infusion timers with one kettle and a common serving time. |
| `heissluft_zonen_temperaturbedarf` | Determine when a planned parallel run requires independently adjustable zones. |
| `heissluft_zwei_mengen_zonenwahl` | Compare both assignments using observed recipe-specific batch capacities. |
| `heissluft_schubladenpause_zonenzeit` | Quantify observed zone downtime when a drawer is accessed. |
| `heissluft_trennwand_umruestfenster` | Reserve an idle slot for a documented divider reconfiguration. |
| `heissluft_zonen_handgriff_kollision` | Check whether one operator can perform both time-sensitive basket actions. |
| `heissluft_grillrost_lieferumfang_pruefen` | Check whether a cooking plan relies on a supplied rack or needs accessory confirmation. |
| `backofen_zweiblech_einstellkorridor` | Find the overlapping permitted settings for a one-chamber tray plan. |
| `kontaktgrill_offen_geschlossen_servierfolge` | Compare measured serving throughput in the two documented contact-grill modes. |
| `kontaktgrill_signaltyp_zeitplan` | Distinguish a documented countdown from a qualitative grill-stage display. |
| `kontaktgrill_pflegegruppe_abtropfplatz` | Plan a cooling and cleaning handoff for only the documented removable components. |
| `kontaktgrill_haeufigkeit_auffangbehaelter_protokoll` | Estimate when recorded runoff would reach a chosen manual-compatible service point. |
| `kuehlschrank_entnahmeliste_kennzeichnungsluecke` | Identify which container identifications to prepare before opening the fridge. |
| `kuehlgeraet_tueranzeige_protokollabgleich` | Check whether observed door events correspond to the exact model’s alarm delay. |
| `kuehlgeraet_fachvolumen_bedarfsabgleich` | Identify the actual compartment capacity shortfall rather than combining both figures. |
| `spuelmaschine_tassenbestand_vor_servieren` | Determine likely clean place settings available from existing stock and the current wash. |
| `spuelmaschine_eco_sperrzeit_budget` | Compare how far a measured dishwasher cycle would extend into a shared-room no-run interval. |
| `spuelmaschine_teller_tassen_getrennte_engpaesse` | Identify which space constraint dominates a mixed dishwasher batch plan. |
| `spuelmaschine_ladung_entnahme_stationen` | Plan which of two stations can be restocked from a known batch of usable dishes. |
| `heizmeldung_raumabdeckung_zusammenfassen` | Summarize coverage of a heating-fault report across rooms. |
| `heizmeldung_sollwertzeit_messbezug` | Reconcile an indoor reading with the active heating setpoint. |
| `thermostat_service_zeitplan_wiederherstellung` | Inventory heating schedules before a support-directed reconfiguration. |
| `klima_geraeuschmeldung_ausschnitt_abdeckung` | Check whether an existing clip contains the noise transition and context. |
| `klima_wasserspur_betriebszeit_melden` | Put a documented leak on an appliance operating timeline. |
| `klima_geruchsmeldung_raum_und_betriebsphase` | Use prior on/off observations to prepare a non-diagnostic odour report. |
| `klima_service_modus_laufabgleich` | Identify whether a reported mode or setpoint was changed between observed runs. |
| `entfeuchter_abtauzeit_im_protokoll` | Separate logged defrost time from unexplained periods in a service report. |
| `entfeuchter_ablaufmeldung_schlauchsegmente` | Make a support note that distinguishes observed water paths from unknown sections. |
| `luftbefeuchter_service_bedienanzeigen_abgleich` | Separate a missing setpoint display from a recorded manual mode. |
| `roboter_service_dockversuche_zaehlen` | Summarize docking reliability from observed attempts. |
| `roboter_service_kartenausschnitt_meldung` | Choose a low-detail evidence crop for a navigation issue. |
| `saugwischer_service_testlauf_abbruchquote` | Compare documented completion rates before and after the recorded care step. |
| `luftreiniger_filteranzeige_ereignisse_trennen` | Reconstruct a filter indicator timeline without inferring a replacement need. |
| `geraet_service_mehrere_aenderungen_einordnen` | Flag confounding service changes before claiming a cause. |
| `ersatzfilter_lieferung_verbaute_menge_abgleichen` | Reconcile physically verified usable spare filter inventory after partial delivery. |
| `ersatzteil_service_offene_positionen_lieferbeleg` | Reconcile documented required part lines for an existing appliance. |
| `geraet_service_ergebnis_gegen_auftrag` | Reconcile the requested repair scope with reported work and checked household functions. |
| `geraet_service_leihzeit_anschlussfenster` | Identify a potential service-loaner coverage gap. |
| `werkstatt_probestueck_passbereich_streuung` | Compare variation of organizer prototypes with user-measured target bounds. |
| `maehroboter_service_passage_ereignisstelle` | Locate a repeated observed stop for model-specific yard support. |
| `klima_service_lose_teile_uebergabe` | Decide which loose accessory categories still need explicit handover clarification. |
| `entfeuchter_service_mengenablesung_spannweite` | Report a bounded collected-water rate from the readable graduation range. |
| `geraet_service_ersatzfunktion_voruebergehend_decken` | Check temporary task coverage while the original appliance is at service. |
| `beleg_quellenstamm_zaehlen` | Count distinct primary evidence behind repeated citations. |
| `datenblatt_korrektur_widerspruch` | Reconcile two numeric specifications using scope and explicit corrections. |
| `testfelder_gemeinsame_modelle_abgrenzen` | Measure exact-model overlap before comparing two test cohorts. |
| `produkttest_ausgeschlossene_ergebnisse` | Check a comparison report for omitted or stopped trials. |
| `sparaussage_bis_zu_referenzwert` | Interpret an up-to savings claim against its stated baseline. |
| `folgemodell_messwert_uebernahme` | Separate unchanged specifications from measured performance of a successor. |
| `raumdaten_altfeld_verwendung_pruefen` | Check old table fields before using sizing data in a new tool. |
| `geraetewechsel_co2_szenario_schwelle` | Estimate when documented operating emissions could offset extra production emissions. |
| `umweltaussage_stromanteil_abgrenzen` | Scope an environmental claim to the documented share of electricity use. |
| `heizwaerme_saisonquotient_aus_abschnitten` | Form a weighted heating performance quotient from matching energy totals. |
| `klimageraet_testbericht_mode_energieanteil` | Check how much of the recorded AC energy a single-mode comparison covers. |
| `betriebsgeraeusch_raumwechsel_beleg` | Scope a sound pressure observation to the documented listening placement. |
| `thermostat_adapter_pruefbeleg_zuordnen` | Separate observed fit with an adapter from direct-fit evidence. |
| `entfeuchter_testpunkte_rangwechsel` | Detect rank reversal across two verified dehumidifier test conditions. |
| `entfeuchter_nennwert_und_messvolumen_scope` | Report captured water without equating a partial collection with a nameplate rating. |
| `luftreiniger_cadr_watt_paarbeleg` | Compute clean air delivery per watt only for a documented matching mode. |
| `feuchteaenderung_prozentpunkte_ausweisen` | Distinguish relative humidity points from proportional changes and moisture removal. |
| `beleg_datum_redaktionsstand_trennen` | Separate the actual test date from article and retrieval dates. |
| `strombeleg_nutzungsaufgabe_kategorisieren` | Keep evidence classes distinct in a household electricity table. |
| `stromeinsparung_rechnung_teilverbrauch_scope` | Translate a component energy claim to its maximum stated whole-use share. |
| `kuehltechnik_beleg_raumtemperatur_empfindung` | Clarify what the reported cooling endpoint actually describes. |
| `strompreis_zeitreihe_vollstaendigkeit_beleg` | Report observed coverage before quoting a negative-price share. |
| `waeschetest_einseits_ladungswechsel_beleg` | Detect when a fabric mix changes only on one side of a drying comparison. |
| `diagramm_hervorgehobener_schnitt_zeitreihe` | Show how much of the record is represented by a selected chart window. |
| `waesche_schleuderstufen_gemischte_textilien` | Match documented spin options to the tighter limit of two textiles. |
| `waesche_trockenweg_sortierplan` | Split a textile batch by the confirmed drying route. |
| `textil_masshaltigkeit_vor_nach_pflege` | Record dimensional change after care in both axes. |
| `waeschenetz_liegeplaetze_mit_abstand` | Compare two aligned flat-drying layouts with measured clearance. |
| `vorhang_pflege_nachmessung_aufhaengung` | Map a measured curtain drop to a feasible hanging adjustment. |
| `waescheleine_klammern_versetzte_stuecke` | Allocate two textile widths on one unobstructed clothesline. |
| `textil_naht_flaeche_restwasserprofil` | Compare seam and panel dry-back measurements on a common mass basis. |
| `waescheplatz_trocknungsvergleich_kreuztausch` | Detect a repeatable placement effect with a two-run crossover. |
| `waesche_arbeitsfenster_umhaengen_abnehmen` | Place a manual rerack step around a fixed collection appointment. |
| `textil_tauschbestand_bis_trocknung` | Estimate a clean-linen shortfall during a known turnaround gap. |
| `textil_zwei_pflegeintervalle_abgleich` | Check whether two recurring textile care steps can share a documented window. |
| `textil_etikett_futter_oberstoff_pflegeweg` | Reconcile wash, flat-dry and air-hang instructions for detachable fabric layers. |
| `kleiderschrank_einraeumen_trockenkontrolle` | Allocate only confirmed-dry pieces to a ventilated wardrobe plan. |
| `kleiderschrank_stapel_zugriffsreserve` | Calculate shelf capacity with measured folded thickness and pull-out clearance. |
| `textil_pflege_nutzungszyklen_protokoll` | Compare recorded wear outcomes per use without projecting lifespan. |
| `saugwischer_pad_reserve_mit_ruecklauf` | Check clean-pad availability across three appointments and their return times. |
| `saugwischer_freigegebene_abschnitte_flaechenbilanz` | Sum eligible, excluded and unresolved floor areas separately. |
| `saugwischer_raumfreigabe_nach_beobachtung` | Compare observed dry-back windows against a planned room reopening. |
| `waeschestaender_haube_versuchsbedingungen` | Audit whether a cover-on/cover-off rack trial is comparable. |
| `waesche_wenden_vorderseite_rueckseite` | Compare observed damp points on one or both sides after turning. |
| `textil_ersatzbezug_pflegepassung` | Check a replacement cover’s documented dimensions and care fit. |
| `textil_reparatur_bestand_neubedarf` | Separate confirmed serviceable stock from planned repairs before buying replacements. |
| `putztuecher_feste_zonen_markierung` | Check dedicated labeled cleaning-cloth stock and reserve unassigned spares. |
| `waeschestaender_fluegellast_drei_textilien` | Find a measured two-wing load split for three textiles. |
| `kleiderschrank_luftweg_hinter_stapel` | Find which folded textile groups would obstruct a deliberately open rear gap. |
| `luftreiniger_stufenplan_reinluftmenge` | Calculate remaining quiet-stage time toward a specified clean-air volume. |
| `lueftung_aussenluft_umluftrate_aufteilen` | Split a specified supply flow into outdoor air and recirculation. |
| `ventilator_schwenkzyklus_luft_am_platz` | Estimate observed draft minutes at a seat using a measured oscillation cycle. |
| `lueftung_belegungswechsel_zeitfenster` | Check a vacant ventilation interval before the next occupancy. |
| `luftreiniger_gleichzeitige_cadr_staffelung` | Account for two comparable purifier ratings with staggered starts in one room. |
| `luftoeffnung_teilflaechen_nettostrom` | Estimate net flow through two opening sections carrying opposing flow. |
| `lueftungsrichtung_intervallanteile` | Summarize equal-length airflow direction observations for an opening. |
| `fensterloser_raum_luftpfad_vorkuehlzeit` | Back-plan adjacent-room cooldown and subsequent air-transfer stages. |
| `luftreiniger_partikelverlauf_nach_abschalten` | Measure particle reading rebound after a purifier is switched off. |
| `luftreiniger_sensorabstand_nah_und_aufenthalt` | Compare particle changes near the purifier and at an occupied location after a baseline check. |
| `tuerventilator_raumgefaelle_versuch` | Compare observed room-temperature gaps with and without a doorway fan. |
| `luftreiniger_stellort_luftstrom_sichtprobe` | Compare outlet airspeed after moving an intact purifier. |
| `luftreiniger_filterrahmen_belegstatus` | Track evidence of filter fit and cover closure after replacement. |
| `ventilator_timer_bedienbedarf_nach_abschaltung` | Count manual restarts when an off-timer is shorter than a selected fan window. |
| `ventilator_timer_pause_wiederanlauf_beobachtung` | Check timer resumption after a normal control-panel pause. |
| `tueroeffnung_luftschichtung_drei_hoehen` | Record opposing doorway flow observations at three relative heights. |
| `luftreiniger_staubstreifen_beobachtungsanteil` | Compare the area fraction with visible dust marks on equally sized observation strips. |
| `raumluft_geruch_und_co2_getrennt_beobachten` | Record perceived odour and measured CO₂ changes separately. |
| `nachtlueftung_temperaturruecklauf_nach_schliessen` | Check how much measured cooling remains after the windows close. |
| `luftpfad_zwei_tueren_gemeinsam_offen` | Calculate the overlap when both permitted doorways in a route can remain open. |
| `raumluft_zielwert_erreichung_nach_start` | Locate the first sampled time window meeting a user-chosen room temperature target. |
| `lueftung_oeffnungsstufen_durchzug_grenze` | Compare two opening positions against a user-set local airspeed limit. |
| `raumluft_zwei_sensoren_platztausch_probe` | Compare location differences before and after two particle sensors swap positions. |
| `luftreiniger_cadr_taktbetrieb_reinluftbilanz` | Calculate idealized clean-air volume for repeated observed on/off cycles. |
| `lueftungsversuch_aussen_delta_raumhintergrund` | Compare matched indoor and outdoor particle changes during a window-opening observation. |
| `abluft_anschluss_nennweite_messkante` | Check that exhaust fitting diameters refer to the same interface |
| `klimafenster_platte_nennlaenge_hub` | Compare a sliding-window insert range with the actual opening |
| `klima_selbstverdunstung_modusbereich` | Distinguish cooling evaporation from drainage in dry mode |
| `split_verbindungsleitung_und_abluft_lesen` | Identify the right drawing for a mobile AC connection |
| `entfeuchter_pruefpunkt_betriebsfenster` | Check a cellar temperature span against the documented operating envelope |
| `luftreiniger_filterstufe_wirkbereich` | Match documented purifier filter stages to the intended job |
| `luftreiniger_cadr_luefterstrom_kennzeichnung` | Calculate clean-air volume only from a documented particle CADR |
| `oskar_zubehoer_beigabe_anleitungsversion` | Separate Oskar little hygiene accessory listings across documents |
| `beurer_lb55_kalkpad_packungswiderspruch` | Read the actual pack quantity for the documented LB 55 scale pad |
| `ventilator_durchsatz_einheiten_stufenbezug` | Normalize fan airflow units and check operating speed context |
| `ventilator_timer_nachtmodus_funktionsgrenze` | Check whether the fan can combine night mode and automatic shutoff |
| `pinguino_ex105_fensterkit_angebotsumfang` | Verify whether a PAC EX105 offer adds the required window seal |
| `fritz_302_router_firmware_mindeststand` | Check the documented DECT and firmware requirements for Thermo 302 |
| `bosch_ii_m_thread_zusatzbaustein` | Identify the missing component for direct Matter setup of Bosch II [+M] |
| `thermo_vorhang_packungsbreite_abdeckung` | Calculate curtain coverage from the listed size and pack quantity |
| `thermovorhang_pflegeetikett_verfahren` | Match curtain cleaning needs to the care label |
| `lb200_ziellicht_betriebshinweis` | Interpret the Beurer LB 200 with no target light |
| `lb55_dampfstufe_mengenbezug` | Convert the documented LB 55 steam setting to a runtime quantity |
| `befeuchter_nennwatt_abgabeleistung_bezug` | Check whether moisture output and rated watts share a setting |
| `saugwischer_vortrieb_arbeitsrichtung_beleg` | Check whether floor washer assistance covers the required direction |
| `saugwischer_selbstreinigung_restpflicht_lesen` | Find manual steps still documented for a self-cleaning floor washer |
| `trockner_programmdauer_lastvergleich_lesen` | Compare dryer label cycle duration only for matching loads |
| `luftwaescher_partikelnachweis_unterlage` | Check the type of particulate evidence behind an air washer claim |
| `infrarot_panel_abschaltfunktion_unterlagen` | Distinguish the three documented shutoff functions on a freestanding panel |
| `ventilator_montageart_dokument_wahl` | Identify the right dimension drawing by fan design |
| `stromrechnung_messfenster_randtage` | Match a bill window using measured leading and trailing periods. |
| `stromexport_ueberlappung_entscheiden` | Join two exports only when their measured overlap agrees. |
| `haushaltsstrom_abwesenheit_normalisieren` | Separate a measured background load from occupancy-day energy. |
| `energierechnung_ersatzbeleg_verbuchen` | Apply an explicitly linked replacement or additional bill. |
| `stromkosten_umzug_uebergabetag` | Isolate the handover day between two household budget periods. |
| `wasser_entgelt_basis_zeilen` | Reconcile separately priced water and wastewater quantity lines. |
| `haushaltsbuch_buendel_restkosten` | Isolate household utility costs in a mixed bill. |
| `energiekosten_auszug_beleg_meter_dreieck` | Locate money or quantity discrepancies without blending the two checks. |
| `energie_nachbuchung_periodenansicht` | Separate service-period corrections from cash-period outflows. |
| `haushaltsenergie_auslage_ausgleichen` | Settle a shared utility bill after prior reimbursements. |
| `gemeinsame_energiekosten_cent_rest` | Allocate all cents using a largest-remainder split with a declared tie-break. |
| `energiegutschrift_vortrag_abgleichen` | Reconcile a carried credit with use, refund and the next opening balance. |
| `stromjournal_zahlungszustaende` | Reconcile cash actually settled against a payment feed with pending and reversed entries. |
| `stromjournal_mehrfachzahlung_kandidat` | Flag a possible duplicate payment without deleting entries. |
| `heizbuch_kaltphasen_standardisiert` | Compare heat use under a common two-bin weather mix. |
| `energiebuch_monatslaeufe_abdeckung` | Separate evidence coverage from a complete annual total. |
| `wasserjournal_liter_aufloesung` | Bound a water-volume difference using separate display increments. |
| `haushaltsbuch_privater_strombeleg` | Reconcile overlapping exclusions from a home electricity ledger. |
| `energiekosten_eigener_anteil_deckel` | Reallocate a capped shared bill using agreed capacities. |
| `heizenergie_volumen_faktorstaffel` | Reconcile separately applied heat-billing volume factors. |
| `wasserzaehler_anzeigeumlauf` | Recover water volume across one verified counter rollover. |
| `stromgeraet_anschaffung_monatsbuch` | Track a historical purchase and metered electricity without booking the purchase twice. |
| `energiebuch_kohorten_bereinigter_vergleich` | Decompose ledger change into matched equipment and channel turnover. |
| `haushaltskosten_waerme_wasser_mischbeleg` | Keep centrally billed hot-water heat distinct from duplicated water charges. |
| `stromkosten_fixanteil_gleicher_zeitraum` | Compare the fixed-cost burden at different measured monthly usage. |
| `roboter_wiederaufnahme_doppelpass` | Measure repeated segments and skipped work after a manual pause. |
| `roboter_tuerfreigabe_nachholrunde` | Check which previously closed rooms are recovered without a second start. |
| `roboter_nacharbeit_ersatzroute` | Fit manual backup work after a skipped robot zone into a time slot. |
| `roboter_hindernis_umweg_bedienzeit` | Separate observed passage detours from hands-on intervention. |
| `roboter_eingriffsbudget_serienprobe` | Check three consecutive robot runs against a personal intervention budget. |
| `bodenpflege_sichtspuren_trockenprobe` | Separate cleared, spread and newly visible marks after a floor dries. |
| `bodenpflege_referenzstellen_gegenprobe` | Check visibility against untouched reference marks. |
| `saugwischer_wendemanoever_nacharbeit` | Compare turns and observed rework on two floor-cleaning routes. |
| `bodenpflege_teilchen_auffangprobe` | Separate visibly captured debris from debris displaced to the adjacent area. |
| `spuelgang_sichtbare_reste_schwerpunkt` | Find where visible rework concentrates after equal dishwasher loads. |
| `spuelgang_verdeckte_innenflaechen_probe` | Compare visible residue on previously nested versus unobstructed pieces. |
| `spuelmaschine_ablagepuffer_spitzenbedarf` | Compare peak staging demand with space while unloading. |
| `spuelgang_nachsortieren_besteckprobe` | Measure the effect of pre-sorting cutlery on secondary handling. |
| `kuehlschrank_entnahme_umraeumgriffe` | Compare moves of other containers when retrieving frequently used ones. |
| `kuehlfach_auffindprobe_verwechslungszahl` | Compare mix-ups and misses in a refrigerator retrieval task. |
| `gefrierfach_leerbehaelter_rueckstellprobe` | Use empty containers to check freezer-drawer restowing friction. |
| `kuehlfach_reserveplaetze_alltagswechsel` | Check how reliably a dedicated staging place clears by the next refill. |
| `heissluft_portionen_nachlaufprobe` | Count first-service portions and portions deferred to a later round. |
| `heissluft_zonenwechsel_bedienprobe` | Measure setting changes and correction steps with or without split zones. |
| `kontaktgrill_uebergabe_rueckstau` | Check whether staging output keeps pace with new arrivals between grill rounds. |
| `kuechengeraet_ersatzmethode_bereitschaft` | Evaluate fallback readiness from observed kitchen appliance conflicts. |
| `werkstatt_fachtrenner_rueckgabeprobe` | Verify repeated correct returns after adding dividers to a drawer. |
| `werkstatt_mehrfachgriff_platzwechselprobe` | Measure repeat reaches before and after moving a tool. |
| `werkstatt_probedruck_nacharbeit_serienentscheid` | Decide whether a small run of drawer dividers fits your measured rework budget. |
| `werkstatt_trenner_wechsel_ohne_umraeumen` | Measure how often a divider can be repositioned without emptying the drawer. |
| `messlogger_raster_dubletten_auswertbar` | Audit usable timestamp slots without mistaking duplicates for coverage. |
| `raumlogger_ereignis_raster_grenzfall` | Assign an uncertain event time to a single fixed-width log bin when possible. |
| `messluecken_ereignisgruppen_verdecken` | Distinguish total missing time from the longest blind spot. |
| `stromlog_integrationsmethode_abstand` | Test sensitivity to step-hold versus linear interpretation of three unevenly spaced power samples. |
| `messreihe_konstante_anzeige_kontrollwechsel` | Screen a flat trace against a documented above-resolution reference change. |
| `messprotokoll_zeitpaarung_viele_zeilen` | Quantify many-to-many row inflation before joining timestamped logs. |
| `haushaltswaage_nullpunkt_driftspanne` | Bound tare drift using verified zero readings at both ends. |
| `hygrometer_zweipunkt_referenz_abgleich` | Estimate a bounded two-point humidity comparison without extrapolating. |
| `strommessung_gemeinsamer_offset_differenz` | Bound a power difference with or without verified common-mode cancellation. |
| `stromversuch_streuung_gruppen_zusammen` | Pool individual energy-run variation while preserving between-group differences. |
| `raumfeuchte_mittelwert_schwellenanteil` | Bound time at or above a humidity threshold when only aggregate data survive. |
| `stromexport_gerundete_bloecke_summieren` | Audit the accumulated rounding range in a block energy export. |
| `duschdurchfluss_start_stopp_zeitfehler` | Bound water flow with independently bounded endpoint timing error. |
| `stromzaehler_sprung_leistungsplausibilitaet` | Flag a cumulative-meter jump beyond the supported energy bound. |
| `stromvergleich_ausfall_nach_modus` | Assess selective missingness by operating mode rather than global uptime. |
| `stromprotokoll_lueckensumme_anker` | Recover only the aggregate energy of missing bins from a matched reference total. |
| `stromexport_einheit_metadaten_abgleichen` | Normalize documented energy units while leaving unknown labels unresolved. |
| `stromlogger_spitzenmittel_ausreisserabstand` | Test consistency of peak duration and aggregate energy. |
| `duschdurchfluss_vergleich_menge_zeitband` | Compare flow ranges from independently bounded volumes and durations. |
| `messreihe_grenzwert_rundung_faelle` | Bound the count above a threshold from three categories of rounded observations. |
| `klimalog_zeitpaar_naechster_eindeutiger_wert` | Pair an anchor sample to its unique nearest timestamp within a chosen tolerance. |
| `stromlogger_sequenz_counter_luecke` | Audit packet counters separately from metered values. |
| `messlogger_raster_phasen_gleichzeit` | Check whether fixed periodic logs have any exact timestamp coincidences. |
| `klimageraet_schallzeit_mittel_zwei_phasen` | Combine two separately measured equivalent A-weighted levels on an energy basis. |
| `stromimpuls_export_ereignisabgleich` | Cross-check recorded pulse counts against a documented energy-per-pulse scale. |
| `saugroboter_zwei_raumtermine_reihenfolge` | Choose the feasible order for two robot-cleaning deadlines. |
| `saugroboter_dockbesuch_ruhefenster` | Find the parts of a documented dock visit that extend into quiet hours. |
| `saugroboter_wischen_nach_trockenauftrag` | Budget the verified dry-to-wet changeover separately from idle time. |
| `saugwischer_dock_laden_trocknen_ablauf` | Compare dock occupancy with verified simultaneous versus sequential charging and drying. |
| `saugwischer_fuellstelle_vor_abschnitt` | Check whether the next approved refill point arrives before either cleaning segment runs short. |
| `spuelmaschine_deckel_belegen_tellerplaetze` | Account for plate positions displaced by compatible lids. |
| `spuelmaschine_zubehoer_korb_umbauwechsel` | Compare feasible baskets layouts when one run must hold both tall glasses and tall pieces. |
| `spuelmaschine_zwischenlauf_abstellfolge` | Confirm separate unloading and loading availability between two dishwasher runs. |
| `heissluft_unterbrechungsfreies_programmfenster` | Fit a documented uninterrupted cycle between two fixed kitchen uses. |
| `heissluft_folgelauf_vorheizen_konfiguration` | Evaluate the extra heat-up occupation observed in a compatible follow-on cycle. |
| `kontaktgrill_platten_spuelgang_ladeschluss` | Determine whether eligible grill plates reach the current dishwasher loading cutoff. |
| `heissluft_rost_entnahme_ablage_nachlauf` | Check whether a compatible heat-resistant rack rest is occupied when the next task needs it. |
| `wasch_trockner_zweiladung_uebergabestau` | Quantify when a second washed load waits for the dryer in a two-load sequence. |
| `trockner_zeitfenster_nachlauf_und_raum` | Keep a shared room reservation separate from a dryer’s automatic and manual occupation. |
| `entfeuchter_tankleerung_zwei_zeitpunkte` | Check one manual tank emptying between two supervised dehumidifier sessions. |
| `luftbefeuchter_zweistufen_tank_restmenge` | Budget measured water for two humidifier modes without projecting a room effect. |
| `luftbefeuchter_betrieb_nach_routinewechsel` | Compare a normally cleaned tank with an existing, approved ready tank at the next session. |
| `klimageraet_ein_aus_timer_kombinationsbeleg` | Verify that both ends of an AC window can be automated together. |
| `klimageraet_timer_moduswechsel_uebergang` | Reserve a manual-verified changeover and any documented restart delay. |
| `ventilator_timer_wiederholtage_abdecken` | Compare supported repeat days with the planned weekly fan routine. |
| `lichterkette_timer_einschaltfenster_vergleichen` | Intersect a documented daily light timer with the intended clock window. |
| `heizthermostat_ausnahme_normalplan_rueckkehr` | Identify whether a documented temporary override shortens or masks the next ordinary thermostat period. |
| `gefrierfach_hohe_boxen_flexplatzbedarf` | Allocate high and short freezer containers across restricted and flexible positions. |
| `heizdecke_abschaltautomatik_einzelnutzung` | Account for documented auto-off within one already permitted, attended use. |
| `waschtrockner_kombilauf_entnahmefaelle` | Detect which pieces prevent a documented no-handoff wash-to-dry batch. |
| `filter_vorfilter_komplette_saetze_binden` | Count complete verified filter sets without crossing declared kit groups. |
| `filter_lagerprotokoll_fach_status_klaeren` | Triage spare filters after uncertain storage without guessing usability. |
| `filter_waschrotation_nach_gepruefter_trocknung` | Plan two compatible washable parts around verified availability and drying downtime. |
| `ersatzteile_unterstuetzte_alternativen_zuordnen` | Preserve scarce interchangeable equipment parts for tasks with no supported alternative. |
| `verbrauchsmittel_zwei_originalbehaelter_einzelbedarf` | Allocate whole uses from two original containers without combining remnants. |
| `verbrauchsmittel_charge_bis_klaerung_sperren` | Exclude held and untraceable consumables when checking immediate coverage. |
| `geraet_nach_reparatur_eigenes_ersatzgeraet_abbauen` | Review a documented trial before releasing a temporary backup. |
| `geraet_zubehoer_beim_wechsel_getrennt_verplanen` | Keep a working fallback equipped while transferring verified spares. |
| `haushaltsgeraet_weitergabe_optionale_ausstattung` | Preserve useful optional equipment without weakening a handover kit. |
| `vorhandenes_geraet_routine_und_sonderbedarf` | Check whether a verified complement covers only the uncovered household tasks. |
| `ersatzbestellung_nach_fund_aenderungsbedarf` | Separate avoidable order quantities from already committed units. |
| `geraet_ersatz_ausloeser_fehlende_zusatzfunktion` | Revisit a replacement trigger only for the verified missing function. |
| `filter_pflegejournal_verspaetete_eintraege` | Reconcile a later data entry with the underlying wash or replacement event. |
| `haushaltsgeraet_teilen_freie_rueckgabefenster` | Find a feasible undivided borrowing slot including handback time. |
| `verbrauchsmittel_zweite_packung_erst_bei_luecke` | Delay opening a sealed pack until a dated need exceeds usable stock. |
| `filterwechsel_teilwechsel_ohne_satzreset` | Keep the earlier due component visible after a partial maintenance event. |
| `geraeteablage_saisonstart_teilzuordnung` | Audit which stored set pieces still need checking before seasonal use. |
| `granulatbox_einsatzbereich_nach_umzug_pruefen` | Reassess a retained passive absorber for a changed use case. |
| `geraet_geteilt_verbrauch_bis_rueckgabe` | Track what a borrower should return with a shared household device. |
| `geraetezubehoer_ruecklauf_vollstaendigkeitsfolge` | Identify the earliest dated accessory arrival that completes a specific plan. |
| `ersatzmaterial_regalflaeche_ohne_umfuellen` | Test whether original consumable packs fit in a documented storage zone. |
| `ersatzmaterial_doppelt_reservierte_stuecke` | Detect inventory reservations that refer to the same identified pieces. |
| `haushaltsgeraet_ersatz_unabhaengige_engpaesse` | Check whether rescheduling covers only transferable workload. |
| `saugroboter_buerstenpflege_erneut_gleiche_zone` | Compare repeat observations before replacing a cleaned brush. |
| `ersatzteil_mengenabgleich_einzelpackung_rueckbehalt` | Select as few whole sealed packs as needed for a verified reserve. |
| `hygrometer_umzug_erstes_stabiles_ablesefenster` | Find the first usable reading after relocating a hygrometer |
| `hygrometer_nachfolger_anzeigegrenzen_ueberlappung` | Check whether a replacement hygrometer preserves a warning threshold |
| `entfeuchter_raumwechsel_tankrest_zuteilen` | Bound the second room’s collected water when a tank was carried over |
| `entfeuchter_raumprotokoll_ablaufzweige` | Track counted and unmetered dehumidifier drainage after a transfer |
| `lueftungsprotokoll_tuerphase_auswertung_trennen` | Decide whether a reading can extend an interrupted ventilation trial |
| `luftreiniger_leihe_filterstunden_mindeststand` | Carry verified purifier filter hours through a loan |
| `strommessung_raumzuordnung_ungeklaerter_anteil` | Separate allocated and unassigned energy from a shared power meter |
| `waesche_trocknung_teilserie_raumwechsel` | Determine whether moved laundry still belongs to its original weigh-in series |
| `saugroboter_raumkarte_teilflaeche_oder_doppelung` | Combine robot cleaning map coverage without counting the same area twice |
| `saugwischer_geteilte_pflege_letzte_tankphase` | Check if floor washer tank care followed the latest use |
| `raumkuehlung_uebergabe_thermometer_belastungspaar` | Compare logged cooling changes only within a matched starting temperature context |
| `waermelogger_heizphase_setzwert_anteile` | Split a heating observation at a documented setpoint change |
| `thermostat_raumwechsel_aktiver_zeitplan` | Identify the active setpoint source after moving a smart thermostat |
| `klimafenster_zubehoer_zielraum_luecke` | Identify which room still lacks a documented compatible window accessory |
| `nachtkuehlung_handoff_raumwerte_zeitbezug` | Select night readings using the actual occupancy handoff |
| `saugroboter_neue_karte_wischsperren_abgleich` | Audit retained no-mop zones after migrating to a new map |
| `saugwischer_uebergabe_bodenabschnitt_freigaben` | Determine which floor area is still covered by the retained washing approval |
| `sonnenschutz_raumuebernahme_doppelte_aufzeichnung` | Reconcile overlapping shade observations for one window |
| `luftbefeuchter_raumwechsel_wasseralter_nachweis` | Track the oldest documented tank water through a humidifier handoff |
| `dusche_durchflusswert_uebergabe_kopf_freigabe` | Separate measured flows for two settings of a transferred showerhead |
| `ventilator_uebergabe_markierte_stufenpaare` | Compare marked fan settings by actual control mode after handoff |
| `heizwaerme_uebergabe_temperaturpuffer_ortspaare` | Identify which room has the smaller measured margin above its own heating target |
| `keller_lueftungsnotiz_aussenwert_ersatzquelle` | Audit the timing and placement of a substitute outdoor reading |
| `saugroboter_station_raumwechsel_servicezugang_plan` | Compare two docking locations for retained service access |
| `feuchteprotokoll_raumwechsel_logbuch_abdeckung` | Quantify location-resolved evidence after switching room loggers |
| `heizzone_gemeinsames_komfortband_belegung` | Check overlapping user-selected comfort bands while both rooms are occupied. |
| `heizzonen_messpaar_reaktion_zielraeume` | Separate two room temperature responses to the same heating request. |
| `heizpause_raumfolge_wiederanlauf_engpass` | Check a shared restart against distinct readiness deadlines. |
| `heizzone_moebel_nutzungsstellung_abstand` | Compare everyday and guest furniture positions against your documented clearance. |
| `heizzone_zeitplan_lueftung_raumwechsel` | Check scheduled heating overlap with two separate airing windows. |
| `fensterbehang_winter_lichtgewinn_zwei_bloecke` | Check actual daylight access in two separately planned use blocks. |
| `thermovorhang_paarprobe_scheibe_feuchte` | Compare observed window moisture with the curtain open and closed. |
| `fensterbehang_sichtschutz_termin_zwischen_pflege` | Check if a laundry window leaves a scheduled privacy gap. |
| `verschattung_blendpause_zwei_fenster_arbeit` | Compare observed glare and planned shade in a fixed work window. |
| `arbeitsplatz_ersatzraum_ruhe_waerme_vergleich` | Choose between two trial work spots for a specific call. |
| `schlafraum_arbeitswechsel_abkuehlung_zeitgruende` | Schedule a measured cooldown before switching a home office to a bedroom. |
| `schlafplaetze_zuordnung_persoenliche_nachtziele` | Allocate two sleeping rooms to people with different measured needs. |
| `gaesteraum_morgenlicht_fruehe_nutzung` | Coordinate a guest’s dark window with the room’s next morning use. |
| `arbeitsplatz_raumwechsel_persoenliche_hitzepause` | Check productive time left after a temporary heat-driven desk move. |
| `wohnmessung_feste_referenz_zwei_rotationsorte` | Check simultaneous coverage for a fixed logger and two rotating rooms. |
| `wohnmessung_logger_uhrdrift_gemeinsamer_stichtag` | Check whether timestamp drift permits matching two room recordings. |
| `wohnfeuchte_zwei_raeume_gemeinsame_ereignisse` | Separate simultaneous humidity exceedances from room-only events. |
| `wohnmessung_sonnenfleck_zeitmaske_ortsvergleich` | Mask both sensors’ direct-sun windows before comparing rooms. |
| `wohnmessung_nachprobe_raeume_ereignisfenster` | Select a feasible order for two timed room follow-ups with one meter. |
| `entfeuchter_zwei_raeume_tank_zwischenstopp` | Check reservoir headroom across two measured room sessions. |
| `ventilator_leihe_raeume_ruheziel_vorrang` | Resolve competing room slots for one trialled fan. |
| `wohnklima_geraetewechsel_rueckgabefrist_testfenster` | Fit two tests and pack-up before a known hand-back time. |
| `infrarotheizung_leihe_vor_ankauf_nachprobe` | Flag when seat trials cannot transfer to other use cases. |
| `klimaanlage_wechselort_fensterkit_rueckbau` | Find missing reusable fittings before moving an existing portable AC. |
| `fensterschutz_saisonwechsel_freigabe_zwei_raeume` | Prepare a reversible shade change only where storage and operation are ready. |
| `geraeteverlauf_zyklus_randschnitt` | Keep cycles cut by the start or end of a log out of the complete-cycle mean. |
| `entfeuchter_standzeit_ereignis_wartefenster` | Distinguish a still-censored off interval from an observed delay. |
| `stromjournal_umstellung_uebergangszeit_ausgrenzen` | Exclude the transition period from a before/after consumption comparison. |
| `stromausfall_nachlauf_und_ruhe` | Compare a measured restart block against a separate same-duration idle baseline. |
| `strompreis_grenzblock_kostenband` | Bound charges for a metered block that straddles a known rate boundary. |
| `stromrechnung_stichtag_kostenverschiebung` | Reprice a verified boundary-reading correction without changing total consumption. |
| `stromablesung_mittleren_wert_korrigieren` | Propagate one replaced historical meter reading into exactly two incident intervals. |
| `stromrechnung_preisperioden_gegenprobe` | Detect a possible swap of pre- and post-change invoice quantities. |
| `wasserverlauf_allein_doppelt_belegung` | Compare shared occupancy consumption with both observed solo routines. |
| `heizverbrauch_lueftungsereignis_zeitfolge` | Check whether time uncertainty permits temporal attribution of a heating response. |
| `stromverlauf_freie_und_belegte_stunden` | Assess the energy associated with occupied hours without treating every calendar hour as use. |
| `stromhistorie_strukturbruch_drei_fenster` | Screen a documented change against a following persistence check. |
| `stromverlauf_aktualisierung_resttage` | Roll forward a historical energy projection by keeping observations and future assumptions separate. |
| `stromverlauf_budgetgrenze_ablesungen` | Bracket the first threshold crossing in a monotone three-reading history. |
| `stromlauf_mischplan_rueckrechnung_profilfehler` | Separate forecast discrepancies caused by mode duration from discrepancies within mode. |
| `haushaltsstrom_tagesgrenzen_mit_teilaufzeichnung` | Report allocatable day totals without splitting a shared overnight energy block arbitrarily. |
| `nachtwasser_ereignisse_und_restvolumen` | Reconcile known water-use events against the quiet-period meter delta. |
| `heizwaerme_aufgabe_warmwasserfenster_abzug` | Remove measured domestic-hot-water production before comparing space heat. |
| `kuehlverbrauch_anteilswechsel_nur_kuehltage` | Separate observed cooling-day intensity from the number of cooling days. |
| `trocknung_rueckstand_fertigmeldungen` | Reconcile the drying-work queue before comparing energy per finished batch. |
| `stromhistorie_tagesverschiebung_oder_rueckgang` | Distinguish observed demand shifting from a full-window reduction. |
| `stromhistorie_spaete_ablesung_versionsfolge` | Identify the value available at a historical report cutoff versus a later validated reading. |
| `stromprotokoll_netzausfall_nulllast_einordnen` | Classify missing import records without treating all missing time as zero. |
| `heizverlauf_restwinter_gleiche_jahresphase` | Back a remaining-season heat scenario with a separately matched historical season share. |
| `wasser_nutzungsfreie_nacht_ratenvergleich` | Test whether quiet-window water changes are consistent with one constant rate. |
| `waeschetrocknung_betriebspause_wasserergebnis` | Compare measured water removal yields during resumed drying while retaining the idle block. |
| `heizprotokoll_komfort_erfuellung_vergleich` | Check whether lower heating energy came with reduced hours meeting the same target. |
| `stromtarif_verlauf_spaete_aufbuchung_arbeitspreis` | Check whether a later posting used historical block rates or a current rate. |
| `stromexport_intervallstempel_tarifkante` | Interpret a signed interval timestamp using its documented timestamp convention. |
| `wasserhistorie_regelwechsel_zeitweilige_gasttage` | Remove separately observed guest-specific events before comparing routine water totals. |
| `entfeuchter_tankleerungen_zeitbilanz` | Recover collected condensate from start and end stock plus documented emptying. |
| `wasserhistorie_sperrzeit_nachlauf_pruefung` | Distinguish deferred water use from remembered use during an unavailable window. |
| `stromzaehler_intervalltempo_ungleiche_abstaende` | Compare observed slope rather than raw differences in a three-point meter history. |
| `abtauereignis_energie_lueckenfreie_zuordnung` | Quantify logged defrost and recovery energy before interpreting a daily refrigerator total. |
| `heizverlauf_brennstoffkosten_und_liefermenge` | Reconcile purchased and consumed heat fuel across a known unit-cost boundary. |
| `stromrechnung_arbeitspreis_trennmenge_rueckschluss` | Infer a feasible quantity split from the bill rather than inventing interval readings. |
| `stromverlauf_planband_vs_messband` | Backtest a projected range against independently bounded observations. |
| `heizverlauf_aufgabenwechsel_aufwaermkosten_stufen` | Distinguish the observed cold-start burden from consumption after the room has reached its chosen band. |
| `wasserverlauf_erste_spuelung_verbrauchsdosis` | Separate one documented initial purge from later water draws. |
| `stromhistorie_feiertag_wochentag_vergleichsmenge` | Remove actual non-routine days before contrasting ordinary consumption. |
| `wasserverlauf_verzoegerte_anlage_ereignisvolumen` | Attribute a delayed but confirmed water event to the logged task without moving the meter timestamp. |
| `dachfenster_stoffkit_kantenreserve_einzeln` | Compare separately dimensioned edges of a removable roof-window seal. |
| `dachfenster_haftstellen_wiederholungsprobe` | Compare observed roof-window seal detachments after equal sequences of use. |
| `dachfenster_anlagelinie_rahmen_fluegel_abgleichen` | Compare the documented length reference with the frame or sash that was measured. |
| `dachfenster_griffzugang_ohne_krafteinwirkung` | Record access to the normal handle without reaching across a temporary seal. |
| `dachfenster_oeffnung_spaltprofil_kitbereich` | Check three fixed-position gap measurements against the documented fabric kit range. |
| `dachfenster_kit_abnahme_vor_fensterzustand` | Check whether documented removal was observed before a roof-window mode change. |
| `dachfenster_kit_abnahme_zeitstreuung` | Find the observed range of normal closure times after kit removal. |
| `dachfenster_auslass_sichtgrenze_von_innen` | Record which roof-window outlet sections were visible from indoors. |
| `dachfenster_sonnenschutz_schaltstellungen_abgleichen` | Distinguish tested shade positions for light control and exhaust operation. |
| `dachfenster_kit_randskizze_offene_abschnitte` | Total visible nonoverlapping gaps in a stationary roof-window seal. |
| `klimafenster_schliessbeleg_nach_kitabnahme` | Record sash closure and normal handle position separately after kit removal. |
| `klimafenster_stoffklappe_rueckkehr_in_lage` | Count observed return-to-rest cycles of an existing fabric flap. |
| `fensterabdichtung_randgeraeusch_quellenvergleich` | Compare changes in a measured noise-level difference between two seal edges. |
| `fensterplatte_auflage_eckkontakt_sichtkarte` | Locate visible gaps in currently observed corner contact. |
| `fensterplatte_schliessprobe_abnahme_wiederholung` | Evaluate repeated changes in normal closure after removing the same plate. |
| `klimafenster_nasses_randbild_zeitfolge` | Relate visible seal moisture to a recorded rainfall timeline. |
| `klimafenster_reissverschluss_zwei_endpositionen` | Match recorded zipper travel to two outlet locations in the same seal. |
| `fensterplatte_lagertiefe_mit_oder_ohne_adapter` | Compare storage depth with a removable outlet adapter attached or separately packed. |
| `mietfenster_klebeflaeche_fotodeckung_vor_nach` | Identify matching before-and-after photo coverage of adhesive sites. |
| `klimafenster_rueckbau_ereignisse_zeitfolge` | Check the recorded sequence of shutdown, kit removal and window closure. |
| `sonnenschutz_geteilte_scheiben_schattenanteil` | Calculate area-weighted observed shade across two unequal panes. |
| `balkonschatten_sitzplatzwechsel_stichproben` | Find the fewest seat changes across three sampled balcony shade states. |
| `innenbehang_lueftung_licht_bedienprobe` | Identify shade positions that met window operation and light preferences in the same observation. |
| `fenster_teilverschattung_punktlicht_kontrast` | Compare measured light-level contrast at two points before and after partial shading. |
| `innenverschattung_oberflaechenabstand_zur_raumluft` | Compare measured surface-to-air temperature contrasts around a shade. |
| `balkon_schirmstellung_freie_spur_vergleich` | Compare the observed walkway beside a movable sunshade in two existing positions. |
| `fenster_sonnenschutz_messreihe_wolkenwechsel` | Identify parts of a shade measurement with consistently observed cloud cover. |
| `sommerlueftung_stossfolgen_zwischenwaerme` | Separate two observed cooling intervals from warming between them. |
| `sommerlueftung_tiefpunkte_zur_offenphase` | Locate observed indoor and outdoor minimum temperatures relative to window opening. |
| `nachtlueftung_auswahl_mit_schliesspuffer` | Compare two sampled cool periods with an explicit time allowance for closing. |
| `monoblock_auslass_freiraum_beobachtungsbeleg` | Compare measured clearance at the outlet with its documented requirement. |
| `monoblock_schlauch_sichtstrecke_ohne_doppelzaehlung` | Account for visible and unseen hose lengths across two overlapping observations. |
| `monoblock_schlauch_sichtform_achsenvergleich` | Describe the axis ratio of a measured hose cross-section without inferring airflow. |
| `monoblock_kuehlprobe_betrieb_nach_startphase` | Separate observed startup from the later stable measurement window. |
| `klimafenster_kitvergleich_strom_gleiches_kuehlziel` | Compare measured energy costs of two window setups to the same temperature endpoint. |
| `klimafenster_kuehlprobe_zwei_nutzungsorte` | Check a single run against two user-chosen temperature targets at separate locations. |
| `monoblock_kuehlrate_protokollierte_standortpaare` | Normalize observed air cooling across two differently timed placement trials. |
| `monoblock_kuehlunterbrechung_restzeit_unbekannt` | Account for recorded cooling, window interruptions and user pauses with an unknown remainder. |
| `klimafenster_umbauzeit_grenzwert_zwei_plaene` | Compare user handling time for two documented short-term window routines. |
| `fenster_kuehlpause_nach_passiver_probe` | Check whether two post-cooling readings still meet a user target before considering active cooling. |
| `abluftfenster_schlussbeleg_vor_abwesenheit` | Compare recorded normal window closure with the start of an absence. |
| `pflegeablage_sauber_schmutzig_nacheinander` | Check a sequential switch between used and clean work materials. |
| `pflegekorb_entleeren_teilmenge_nach_bearbeitung` | Keep unfinished pieces visible after a partial clearing of a used-items basket. |
| `pflege_einsatzort_erst_nach_trockenablage_wechseln` | Decide whether a care-in-progress kit can be staged in another room. |
| `pflege_restaufgaben_mit_einem_gesamtstopp` | Find a permitted stopping point before a household interruption. |
| `pflege_spuelstelle_separater_ruecklauf` | Isolate only the pieces affected when a rinse step must be revisited. |
| `pflege_uebergabe_rueckfrage_zu_geraeteteil` | Show which care stages still need a part-specific confirmation. |
| `waschraum_unterschiedliche_abholbereitschaft` | Split collection work into independently confirmed owners and readiness. |
| `pflege_tiefenwechsel_reinigung_oberhalb_boden` | Check whether overhead work overlaps a finished floor pass. |
| `textil_einzelwaesche_ausnahme_korb` | Pull documented single-item exceptions out before grouping textiles. |
| `bodenpflege_kantenwechsel_wechselauflage` | Check a one-way clean/used transfer at a floor-care boundary. |
| `pflege_spuelbecken_belegt_ausweichfolge` | Find a free complete rinse slot without interrupting a prerequisite. |
| `pflegeabschluss_zwei_quittungen_vorzeitigkeit` | Detect close-out notes timestamped before their own work could finish. |
| `textil_markierung_abnahme_erst_nach_kontrolle` | Decide which temporary care tags can be removed after handover. |
| `pflege_tischfreigabe_zwei_genutzte_seiten` | Confirm whether a person needs one side or the entire shared surface. |
| `kleiderschrank_trockene_zwischenlagerung_umraeumfolge` | Check whether phased move-out can fit without compressing or stacking extra pieces. |
| `pflege_urspruenglicher_platz_nach_entleeren` | Reconcile a container’s return condition with its marked storage place. |
| `pflege_packen_nach_eigenen_pruefpunkten` | Determine the earliest pack-up time when each component has a separate check. |
| `textilpflege_entnehmbarer_einsatz_zuerst_abtrennen` | Keep detachable inserts matched to their original textile before separate care. |
| `pflege_benutztes_set_durchgang_zum_sammelplatz` | Check whether a used-item return blocks a separate planned access window. |
| `pflege_ungeplante_abgaenge_trockene_reserve` | Keep replacement stock separate from incomplete items after a care interruption. |
| `pflege_schrittfolge_aufgabe_naechster_offener_schritt` | Find the first unresolved prerequisite in a fixed care sequence. |
| `pflegegruppe_ein_teil_bearbeitet_rest_nachhalten` | Identify which finished groups need a repeat check after one piece was involved. |
| `pflege_tuchseite_beobachteter_wechselpunkt` | Estimate how many allowed fresh-face changes are needed for a grouped task. |
| `pflege_notiz_vor_reset_quittierung_ohne_verlust` | Preserve unresolved upkeep notes before a reset or dismissal. |
| `textil_nahtbereit_gegen_falte_umlegen` | Keep track of textile checks whose accessibility changed after refolding. |
| `pflege_ablage_trocken_teillieferung_reihenfolge` | Reserve a fixed portion of the drying area for a later required group. |
| `waschraum_uebergabebeutel_tara_einzeln_erfassen` | Verify the net handover mass after independently taring both bags. |
| `pflege_entnahmeteil_nachlauf_fremde_benutzung` | Check if interim use invalidates one part’s prior handover check. |
| `pflege_stellflaeche_schutzauflage_abnehmen` | Check the hand-back state after a protective sheet is removed. |
| `pflege_ausruestung_geordneter_handwechsel` | Find handover steps that need an independent temporary place. |
| `duschplatz_abziehen_und_kante_getrennt_uebergeben` | Separate the squeegee pass from the edge-wipe handover. |
| `bad_fugenplan_abschnitte_nach_material_trennen` | Partition routine joint-care sections from unresolved materials and damage. |
| `pflege_teilrunde_arbeitsmittel_als_gruppe_zurueck` | Find which necessary member is missing from a partial return. |
| `pflege_reihenfolge_uebergebene_feste_aufgaben` | Allocate only the documented shareable steps to the available second person. |
| `pflege_flurschrank_abholfach_nicht_entleert` | Check a cleared pickup cubby before adding the next owner’s textile group. |
| `pflege_behaelter_rest_neben_haushaltsbedarf` | Keep documented carryover separate from an unverified remainder. |
| `pflege_kleinteile_ausgehoben_unterlage_bestandskontrolle` | Check the capture of loose pieces after an allowed maintenance step. |
| `pflege_ersatzkorb_vor_leerfahrt_entlasten` | Reserve separate room for two used-item groups on the same planned trip. |
| `kleiderschrank_inventar_mit_fehlendem_rueckzettel` | Track temporarily relocated clothing without assuming that an empty slot means loss. |
| `pflege_nutzungswechsel_beschriftung_sichtprobe` | Check label readability from the actual approach and working position. |
| `querlueften_koordination_zwei_bedienfenster` | Find a coordinated cross-ventilation slot after separate opening preparations. |
| `nachtlueften_schliessdienst_fristabdeckung` | Confirm that an accepting person can close the window within the agreed range. |
| `sonnenschutz_geteiltes_fenster_minutenquote` | Allocate one shared shade window without denying either agreed minimum. |
| `klimafenster_absprache_entfernung_wiedereinbau` | Place a documented window-insert removal and restoration around cleaning. |
| `fenster_freigabe_nach_stellungswechsel` | Detect which shared window permissions predate a configuration change. |
| `klimageraet_geteilter_ruhetermin_restfenster` | Find the part of a call that stays outside a measured audible AC phase. |
| `klimageraet_bedienperson_versetzte_kurzauftraege` | Compare one-operator and separate-operator coverage for two fixed AC checks. |
| `ventilator_teilraum_hin_und_rueckgabe` | Check whether a fan loan can fit both transfers before the lender’s next use. |
| `heizprofil_zwei_vereinbarte_sollbereiche` | Check whether two agreed thermostat preference ranges share an available setpoint. |
| `saugroboter_flur_belegungswechsel_endpunkte` | Find a full passage slot between two confirmed household corridor reservations. |
| `saugroboter_drei_kurzauftraege_auswahl` | Select the largest feasible set of three short robot jobs under one shared deadline. |
| `bodenpflege_zwei_beschraenkte_route_aufgaben` | Allocate exclusive and shared floor-care jobs to available operators. |
| `saugwischer_pflegeauftrag_annahmekette` | Track acceptance of the floor-washer cleanup job separately from physical return. |
| `haushaltsstrom_vereinbarte_spitzenbeobachtung` | Check measured simultaneous draw against a voluntary household budget. |
| `haushalt_flexible_laufpause_mindestabschnitte` | Check piecewise progress after deducting restart work in two shared slots. |
| `spuelmaschine_vorbereitung_aufgaben_besetzung` | Check whether two concurrent dishwasher prep roles can be staffed. |
| `waeschestaender_nutzbare_leinen_teilfreigaben` | Count independently released whole lines for a second household user. |
| `waesche_protokoll_zwei_bestaetigte_korbkennungen` | Audit shared basket allocation using only confirmed counts. |
| `trockner_freigabe_nach_schichtwechsel_kontakt` | Check a verified notification handoff before the next dryer reservation. |
| `wasserkocher_zwei_arbeitsplaetze_verschiedene_volumen` | Assign two measured quantities to distinct approved serving vessels. |
| `backofen_zwei_teams_praxisreservierung_prioritaet` | Resolve an oven booking tie by the household’s explicit turn-taking rule. |
| `heissluft_mitnutzung_einzelschublade_kompromiss` | Rank a flexible basket use against an immutable reservation. |
| `spuelbecken_aufgaben_wechselruhe_vergleichen` | Compare direction-dependent sink reset time for a shared handoff. |
| `badezimmer_gemeinsame_nutzung_drei_mindestslots` | Fit three bathroom bookings by reducing only time explicitly offered for release. |
| `entfeuchter_gemeinsamer_ablauf_wegzeiten_absprache` | Flag a room-use collision when the approved drainage setup must stay in place. |
| `entfeuchter_keller_mehrtagestermine_abdeckung` | Reconcile overlapping coverage when two people share cellar visits. |
| `keller_messnotiz_zugang_und_abholung_termine` | Check a two-person measurement role split without assuming self-access. |
| `luftreiniger_zwei_raeume_tauschen_nur_beide_teilzeiten` | Test a purifier loan with explicit preferred partial-booking alternatives. |
| `luftreiniger_geteilter_raum_sitzplatz_ruheprofil` | Find a tested purifier setting acceptable to both listeners in the shared room. |
| `werkstatt_geteilte_hilfsmittel_eindeutiger_bedarf` | Allocate reusable workshop aids without double-counting already reserved units. |
| `werkstatt_druckfreigabe_geteilter_stellbereich` | Register project collection only when the agreed supervision and access are covered. |
| `warmwasser_terminfolge_beobachtete_wiederkehr` | Reserve the observed recovery interval before a separately booked hot-water use. |
| `haushaltsgeraet_geteilter_arbeitsplatz_pufferzeiten` | Test an earlier shared workspace handoff against actual readiness and consent. |
| `kuehlfach_geteilte_reserve_verbindliche_nachfuellung` | Separate firm cold-storage reservations from voluntarily releasable extras. |
| `strommessgeraet_ausleihe_zwei_terminpaare_stabil` | Check both complete meter-loan orders with separate booking windows and a verified return gap. |
| `haushaltsstrom_messlauf_vor_lastwechsel_fenster` | Identify which scheduled background-load changes compromise a shared baseline observation. |
| `ventilator_schichttermin_ruhe_noch_zu_bestaetigen` | Distinguish known disturbance from an uncertain observation edge. |
| `lueftung_mehrtagesplan_ersatzbesuche_nur_bestaetigt` | Fill cancelled shared ventilation checks from confirmed backup slots. |
| `saugwischer_zwei_haushaltsteam_verschleissteilsatz` | Detect which cleaning team can start with the model-approved parts on hand. |
| `haushalt_drei_aufgaben_gemeinsamer_helfer_zeitguthaben` | Allocate a shared helper across firm, divisible and indivisible tasks. |
| `modellhandbuch_fertigungslos_geltungsgrenze` | Check whether a manual revision applies to the documented production batch |
| `anleitung_nachtrag_kapitel_uebernahme` | Decide whether a manual amendment supersedes a particular instruction |
| `vergleichstest_gewichtung_rangwechsel` | Check whether a user weighting reverses two documented test profiles |
| `vergleichstest_teilnoten_spannweite_luecke` | Bound a weighted test comparison when one component score is missing |
| `produkttest_replikation_einheiten_und_chargen` | Distinguish repeat runs from tested units and production batches |
| `vergleichstest_gleiche_prueflinge_querwert` | Count units with both parts of a combined performance claim |
| `vergleichstest_ziel_vorab_oder_nachtraeglich` | Distinguish preregistered criteria from retrospectively selected observations |
| `testvoraussetzung_inklusive_und_exklusive_mengen` | Reconcile consumption figures with different test boundaries |
| `verbrauchstest_zielmenge_unterdeckung` | Check whether a lower energy figure reflects lower delivered quantity |
| `vergleichstest_typischer_wert_quantilangabe` | Verify the rank and coverage behind a reported typical test value |
| `datenvergleich_punktschaetzung_aufgerundete_klasse` | Count which published planning cases exceed a documented equipment limit |
| `ersatzteil_nachfolger_rueckrichtung_passbereich` | Check the documented direction of a replacement part succession |
| `ersatzteil_teilerfolg_vor_komplettmeldung` | Separate proof of part installation from restored operation |
| `geraetemessung_originaldatei_teilzitat_abdeckung` | Check how much of the original time span a forwarded measurement excerpt covers |
| `dampfreiniger_sc2_maximaldruck_dauermessung` | Separate maximum steam pressure from a documented SC 2 operating measurement |
| `dampfreiniger_sc3_nachfuellen_arbeitszeit_beleg` | Separate the SC 3 refill feature from measured working time |
| `glassvac_set_saugkoepfe_nachweis_offene_position` | Audit the two nozzle roles in a confirmed GlassVAC set |
| `fenstersauger_wv3_enge_felder_duesenreserve` | Match confirmed WV 3 nozzle widths to two measured glass openings |
| `fenstersauger_wv8_herstellergrenzen_doppelengpass` | Check which documented WV 8 limit binds for a measured task |
| `kaercher_wd418_laufzeit_testakku_scope` | Verify the documented WD 4-18 runtime battery configuration |
| `nass_trockensauger_wd3_anleitung_filterwechselpunkt` | Audit filter and bag documentation for a WD 3 use transition |
| `bosch_wth83v03_ablaufschlauch_nein_bezug` | Distinguish an omitted drain hose from documented drain capability |
| `trockner_wqg241001_programmlimit_statt_nennladung` | Compare the actual load with the documented cycle limit |
| `braun_wk3000_45sekunden_pruefmenge_bezug` | Scope the Braun 45-second claim to its documented water quantity |
| `tfa_305055_komfortstatus_rohdaten_getrennt` | Preserve raw humidity comparison when the TFA comfort mode changes |
| `roger_little_textil_und_dualfilter_pflegebeleg` | Assign a Roger little wash instruction to the correct filter component |
| `bosch_air4000i_fernfunktion_quellen_schnitt` | Determine whether a Bosch Air app feature is documented for the offered variant |
| `stadler_peter_p018_stufenvergleich_altangebot` | Spot a fan speed-count mismatch against the current P-018 listing |
| `beurer_lr401_raumflaechenangabe_hoehenbezug` | Interpret the LR 401 published area at its documented ceiling height |
| `pinguino_typnummer_kuehlleistung_nachweisgrenze` | Spot cooling capacity inferred from a Pinguino model code |
| `mobil_split_gesamtleitung_nutzlaenge_nachweis` | Separate the advertised total connection length from its documented usable reach |
| `dachfenster_schwingfluegel_abdichtung_beide_spalte` | Verify roof-window seal coverage on both sides of the pivot |
| `fensterabdichtung_klebeband_oberflaeche_temperaturbeleg` | Match a seal-tape rating to the measured frame surface, not air temperature |
| `fensterbeschlag_fotopaar_innen_aussen_abgleich` | Attribute matched condensation evidence to the observed glass surface |
| `geraeteservice_fehlerbild_gleiche_stufe_pruefkarte` | Map a recurring climate-device issue to matched test stages |
| `bedienunterlagen_geraeteanzeige_verschiedene_zustaende` | Detect one display symbol documented with different meanings |
| `bosch_wqg235d00_kondensatorpflege_zahl_inventur` | Scope the WQG235D00 condenser feature within a household care plan |
| `geraeuschbericht_dezibel_ausgabeform_zeitprofil` | Verify silent-window coverage in a documented noise profile |
| `produkttest_technikwechsel_gemischter_pruefaufbau` | Separate replicated improvement from a bundled change in setup |
| `klima_testbedingungen_verbundflaeche_messorte` | Scope a cooling test claim to the rooms actually observed |
| `warmwasser_parallelzapfung_abweichungsprobe` | Compare simultaneous draw with individual warm-up trials. |
| `warmwasser_erholung_zwei_gepruefte_pausen` | Pick the shortest observed acceptable recovery gap. |
| `warmwasser_nutzungsfolge_festtermine_tausch` | Fit two measured use orders to actual household deadlines. |
| `warmwasser_neustart_standzeit_ueberfluss` | Isolate restart run-up from the original draw. |
| `warmwasser_nutzfenster_profil_unterbrechung` | Check continuous usability across a recorded temperature interruption. |
| `warmwasser_folgezapfung_ungeplante_entnahme` | Identify contaminated repeat trials with an intervening draw. |
| `duschprotokoll_timer_trockenphasen_anteil` | Subtract verified water-off phases from an elapsed timer. |
| `duschstart_wasseraufteilung_start_zweck_ablauf` | Reconcile measured run-up, secondary use and uncaptured water. |
| `dusche_ablauf_hilfe_raumbelegung_puffer` | Align an assisted shower routine with the room’s booked handover. |
| `duschkopf_alltagsprobe_pause_weiterlauf_getrennt` | Separate restart volume from the in-use change in a matched trial. |
| `warmwasser_erste_probe_dauer_ausschluss_unnotiert` | Restore elapsed run-up from deliberate or accidental timer lead. |
| `gefaess_refill_zwei_abnehmer_verlustreserve` | Reserve source volume for two measured transfer routes. |
| `gefaess_umfuellen_zwischenrest_ruecklauf` | Account for heel volume separately from liquid carried back. |
| `wassertransport_relais_zwei_personen_uebergabe` | Fit a measured two-person handoff to both schedules. |
| `wassertragen_mehrweg_kleine_fuellungen_zeit` | Compare trips and time with route-specific carried volumes. |
| `wassertransport_kurven_duo_oder_einzelgefaess` | Decide whether to stage two vessels together or carry them separately. |
| `nachfuellstelle_quellwechsel_wegezeit_anlauf` | Compare water run-up and travel for two verified refill points. |
| `wassergefaess_leergut_fuellrunde_bestandsgrenze` | Count missing returned vessels by their designated use. |
| `wasserroute_zwischenablage_fuellgefaesse_puffer` | Find peak staging demand from known placements and pickups. |
| `fenstersauger_unterkante_auffangprobe_verlagerung` | Check whether a change merely moves captured water out of the tank. |
| `fensterbank_tropfen_nachlauf_messgrenze` | Split measured late drips from the initial collection. |
| `entfeuchter_tankereignis_protokoll_zweistand` | Distinguish continued fill from logged emptying between two readings. |
| `entfeuchter_beobachtung_sammelgefaess_wechselkennung` | Match readings to the correct collection vessel mark after a change. |
| `dampfreiniger_nachfuellpause_zwei_arbeitsinseln` | Schedule a separate dry task during a documented refill wait. |
| `geschirr_ausraeumen_restwasser_trageweg` | Compare how much observed residual dish water crosses the transport route. |
| `spuelroutine_vorspuelwasser_belegte_ladungen` | Isolate pre-rinse water from the machine’s measured cycle volume. |
| `spuelbecken_nutzungsuebergabe_abtropfzone` | Check whether a verified drip area keeps the sink available for its next use. |
| `waesche_sammelwanne_zwei_tropfphasen_wechsel` | Time a single tray move between observed drip events. |
| `warmwasser_anlauf_abbruch_ziel_ungemessen` | Keep a stopped trial as a censored observation. |
| `geschirrkorb_ausraeumfolge_tropfen_unten` | Compare lower-rack drips after two observed unloading orders. |
| `wasserprobe_gefaesswaage_tarawechsel` | Compare two water-only masses with different recorded vessel tares. |
| `fensterwasser_abgrenzung_regen_zeitstempel` | Flag overlapping sources before comparing a wet windowsill. |
| `wassergefaess_umlauf_kennzeichen_mehrfachablesung` | Reconcile repeated reads without counting the same collected water twice. |
| `wischwasser_getrenntes_gefaess_vor_folgetermin` | Track whether the designated vessel is ready for a distinct next task. |
| `kondensat_messgrenze_geteilte_auffangstelle` | Separate attributable collections from mixed collection volumes. |
| `waschplatz_kurze_freigabe_nachfuellstaffel` | Use confirmed staged water to reduce work within a short refill window. |
| `duschwasser_messbecher_obergrenze_fehlmengen` | Keep an overflowed capture as a lower bound. |
| `warmwasser_einmaliger_wasserweg_folge_nutzung` | Avoid charging measured shared run-up twice across two immediate tasks. |
| `fenstersauger_messaufgabe_mulde_einzweck` | Keep rinse water out of the suction performance measurement. |
| `waesche_umsetzen_wasserflecken_wegbefund` | Separate marks that appeared on a carry leg from marks present beforehand. |
| `schallangabe_split_bauteil_zuordnung` | Assign published split-unit noise figures to the documented component. |
| `geraeteton_schmalband_spitze_gegen_nachbarbaender` | Compare an observed spectral peak against equally wide adjacent frequency bins. |
| `schallreport_gesamtwert_teilstichproben_widerspruch` | Check a reported equivalent sound level against the range of complete subinterval means. |
| `schallmessung_a_c_gewichtung_gleichzeitige_spreizung` | Calculate the simultaneous LCeq minus LAeq difference. |
| `geraeuschaufnahme_pegel_von_wiedergabe_trennen` | Check whether recorded gain and reference settings support a level comparison. |
| `geraeuschlog_messbereich_gueltige_stichproben` | Count usable readings after excluding clipped, under-range and missing samples. |
| `geraet_geraeuschlog_zwei_uhranker_abgleichen` | Align a recorded sound marker to an appliance log using two shared time anchors. |
| `schallmessung_referenzprobe_vor_nach_drift` | Check observed meter drift using the same reference before and after a series. |
| `geraeuschmessung_mikrofon_abschattung_paar` | Check how the observer position changes a fixed-point level reading. |
| `geraeuschdaten_leisewert_modusabdeckung` | Check whether a published minimum noise figure represents the intended mode. |
| `geraeuschspitzen_getrennte_ereignisfenster` | Decide whether two recorded sound events are distinguishable in time. |
| `geraeuschereignisse_rate_je_beobachtungsstunde` | Normalize recorded sound-event counts to an observation hour. |
| `ventilator_mittelstufe_aus_gegenrichtungen_beobachten` | Compare sound on one fan setting reached from two directions. |
| `schalllog_spitze_zu_abschnittsgrenze` | Assign an observed peak to a logged phase while preserving boundary ambiguity. |
| `geraeuschwiederholung_abstandsregelmaessigkeit` | Check variation between four observed sound onsets. |
| `geraeuschereignis_zwei_hoerplaetze_synchron` | Quantify overlap between event observations at two listening positions. |
| `schallspitze_fast_slow_zeitgewichtung` | Compare LAFmax and LASmax from the same measurement interval. |
| `ventilator_schwenkung_spitzenabschnitte_am_platz` | Summarize observed noise peaks during and outside a fan pass. |
| `geraeuschzeit_luecken_bei_zwei_markierten_spitzen` | Find the longest observed gap outside two recorded sound events. |
| `geraeuschprobe_grundpegel_rueckkehr_nach_ereignis` | Assess whether the measured post-event background returned to its initial band. |
| `schallpegel_drei_einzelquellen_modellsumme` | Estimate three independent simultaneous source contributions at one location. |
| `schallmodell_gemeinsam_messen_rechenrest` | Compare a calculated total level with a matching combined measurement. |
| `raumgeraeusch_eigenes_pegelziel_zusatzbeitrag` | Estimate an independent added source budget under a chosen total level. |
| `schallquelle_hintergrundspanne_schaetzintervall` | Bound an independent source contribution using a measured background range. |
| `geraeuschquellen_gleichzeitigkeit_erwartungsreferenz` | Compare observed source overlap with an independent occupancy reference. |
| `kurzgeraeusch_abtastluecke_im_pegelprotokoll` | Check whether a recorded brief sound could fall wholly between instantaneous samples. |
| `schallmessung_zwei_aufstellungen_eigener_hintergrund` | Compare two placements using their own measured background levels. |
| `geraeuschphase_eigenes_mittel_verfuegbare_zeit` | Solve for the time allowance of a louder phase under a chosen equivalent level. |
| `geraeuschereignis_sel_und_zeitfenster_abgleichen` | Convert one isolated event exposure to equivalent levels for two comparison windows. |
| `geraeuschprobe_ueberlagerte_spitzen_aussortieren` | Check how unrelated event timing affects two recorded maxima. |
| `geraeuschabstand_gemessen_gegen_freifeld` | Compare measured level attenuation with an ideal free-field reference. |
| `geraet_schallrichtung_gleicher_radius_seitenvergleich` | Compare measured side levels relative to the front at a matching distance. |
| `monoblock_kontaktvibration_zu_schallereignissen` | Separate logged acoustic events with and without observed contact vibration. |
| `raumreflexion_zweitimpuls_wegdifferenz_modell` | Estimate excess acoustic path length from an existing delayed sound marker. |
| `geraeusch_aufstellung_rueckkehrtest_a_b_a` | Compare placement B against before-and-after readings at placement A. |
| `hoerplatz_messhoehen_eigenziel_beide_positionen` | Test a chosen comparison level at seated and standing ear heights. |
| `ventilator_messmikrofon_direktwind_kontrollprobe` | Compare a meter reading with and without a documented microphone wind condition. |
| `mobilgeraet_schallplatz_sichtlinie_messbeleg` | Compare two existing acoustic positions classified by observed line of sight. |
| `saugroboter_fahrgeraeusch_bodenuebergang_wiederkehr` | Compare repeated noise marks at ordinary floor transitions and on uninterrupted runs. |
| `hoerprobe_zwei_betriebsarten_subjektive_urteile` | Summarize paired listening preferences while keeping undecided trials visible. |
| `stromgruppe_vier_betriebszustaende_wechselwirkung` | Reconcile all four observed activation states under comparable conditions. |
| `stromgruppe_geraeteband_aus_gesamtmessung` | Bound one device from aggregate energy and independently justified remaining-load ranges. |
| `geraeteaktivitaet_ueberlappung_zeitnachweis` | Recover joint device time from a separately logged union. |
| `stromspitze_zwei_lasten_einzelursache_pruefen` | Rule out a lone active load only when all relevant peak ceilings are documented. |
| `stromgruppe_anlaufstaffel_kosten_und_messspitze` | Check whether a staggered start lowered the observed peak while using more energy. |
| `stromgruppe_arbeitspreis_stufe_zusatzauftrag` | Attribute marginal task costs across a documented progressive usage threshold. |
| `haushaltsgruppe_ersatzablauf_ohne_neuanteil` | Compute observed energy change only for demonstrably displaced work. |
| `geraetegruppe_aufgabenpaket_vollstaendigkeit` | Infer full paired service from output counts only when pairing is verified. |
| `gruppenmessung_zwei_geraeteraten_identifizierbar` | Solve a two-window mixing model only when the operating profiles differ enough. |
| `stromgruppe_unbeobachtete_gemeinsamlast_erkennung` | Detect unexplained energy in recorded both-idle periods. |
| `wassergruppen_ueberlappung_mindestdurchfluss` | Compare individual solo and overlapping water flows against distinct task requirements. |
| `haushaltsaufgaben_verteilter_vorrat_teilbar` | Reserve enough shared refill water after respecting non-transferable supplies. |
| `raumgeraete_heizen_kuehlen_gegenarbeit_messung` | Quantify balanced opposing thermal output during one verified overlap window. |
| `raumgeraetekombination_zwei_zielquoten` | Compare energy only across modes meeting both measured room outcomes. |
| `entfeuchtung_sammelsystem_beide_wege_abgleich` | Reconcile asynchronous collection paths without silently ignoring a differing observation window. |
| `geraetegruppe_energievorteil_verbrauchsmaterial_ausgleich` | Determine when material overhead offsets a measured energy advantage. |
| `geraetefolge_teilpuffer_nach_lieferung` | Test a staged production buffer while keeping both timed resource commitments visible. |
| `stromgruppe_steuergeraet_weckvorgaenge_abgleich` | Audit which shared controller wakeups replaced repeated wake events. |
| `raumgeraete_komfortquote_schnittmenge_band` | Bound simultaneous target time when paired measurements were not retained. |
| `haushaltskreislauf_zwei_endpunkte_eine_messung` | Compare intermediate and complete workflow rankings with measured follow-on consumption. |
| `stromgruppe_drei_paare_messziel` | List the pairs within a budgeting target for interval-average power. |
| `gruppenmessung_stichprobe_anteil_betriebsprofile` | Weight device shares by aggregate energy in the matching profiles. |
| `geraetepool_ausfall_uebernahme_exklusiv` | Recover only interchangeable work from a measured failed-device backlog. |
| `geraetegruppe_zubehoer_symptom_wandert` | Classify a recorded cross-swap without assuming it proves a component defect. |
| `heizgruppe_gemeinsame_waerme_laufmittel` | Combine unequal input energies and outputs without averaging two individual ratios. |
| `haushaltsgeraete_zeitversatz_teilzustellung` | Schedule a second-stage batch with a separate confirmed partial release. |
| `stromgruppe_zeitreihe_hoechstwert_nicht_addieren` | Verify coincidence before interpreting summed individual peaks. |
| `gruppenbetrieb_doppelbelegung_stueckverdraengung` | Measure output lost to overlapping equipment occupancy while respecting confirmed work positions. |
| `klimageraete_waermeeintrag_im_kuehlraum_einordnen` | Compare a justified indoor waste-heat contribution with measured sensible cooling. |
| `stromgruppe_restaufgaben_preiskappung_minimalkosten` | Optimize two all-or-nothing reservations when cheap capacity is scarce. |
| `stromgruppe_gegenlaeufige_lastwechsel_netto` | Identify real load cancellation hidden in the observed aggregate change. |
| `geraetegruppen_uebergabe_verbrauchsstelle_wechselbilanz` | Check the preserved total across a verified device reassignment between meters. |
| `geraetegruppe_gemeinsamer_vorlauf_auftragswechsel` | Compare a batched workflow with duplicated preparation overhead. |
| `haushaltsablaeufe_ressourcen_dominanz_beobachtet` | Detect resource dominance without imposing a preference or price on remaining trade-offs. |
| `geraetepaar_wiederverwendung_gemeinsames_medium` | Trace a recovered medium through two device tasks without double-counting procurement. |
| `geraetegruppe_getrennte_geraetezahl_schattenkosten` | Compare metered energy with measured occupied device-minutes. |
| `geraeteprogramm_je_freigabefenster_anzahlband` | Bound two-resource service capacity from documented availability intervals. |
| `haushaltsgruppe_realbetrieb_einzelauftrag_ersatzplan` | Reconcile a completed-work cost where some device tasks need redo. |
| `stromgruppe_vollstaendigkeitsrabatt_gesamtverlust` | Audit a documented threshold rebate separately from variable energy cost. |
| `gruppenbetrieb_verbrauchskosten_gleiche_teilauftraege` | Detect duplicate workflow quoting when a base package already contains a documented extra. |
| `gebrauchtgeraet_zustandswort_mit_einzelbefund_abgleichen` | Translate broad seller condition language into observed and open checks. |
| `gebrauchtgeraet_fotos_nach_letzter_aenderung` | Separate usable current pictures from pre-change images. |
| `gebrauchtgeraet_sammlung_einzelfoto_oder_muster` | Check the evidence scope of a multi-unit listing. |
| `gebrauchtgeraet_unbenutzt_behauptung_nach_zaehlerwechsel` | Limit a zero counter reading to the documented counter history. |
| `gebrauchtgeraet_nutzungsprotokolle_ueberschneidung` | Sum confirmed lifetime-use subsets without counting overlap twice. |
| `gebrauchtgeraet_lang_gelagert_lagerzeit_nachweisgrenze` | Bound the documented storage coverage before evaluating a used appliance. |
| `gebrauchtgeraet_angebot_sichtprobe_fotoausschnitt` | Prioritize a follow-up view of a claimed clear but obscured section. |
| `gebrauchtgeraet_seit_wartung_tatsaechliche_einsaetze` | Establish which actual-use records follow maintenance. |
| `gebrauchtgeraet_nutzungsprofil_alter_vs_umfang` | Separate calendar age from observed use intensity. |
| `gebrauchtgeraet_dokumentierter_zubehoerwechsel_vor_test` | Match a demonstration run to the accessories that would actually transfer. |
| `gebrauchtgeraet_oberflaechenspur_in_funktionszone` | Distinguish wear on a working interface from nearby cosmetic marks. |
| `gebraucht_behaelter_sitz_linke_rechte_auflage` | Compare visible seated-container alignment against your measurement tolerance. |
| `gebrauchtgeraet_spur_nach_dem_transport_neu_einordnen` | Identify confirmed newly visible marks without guessing who caused them. |
| `gebraucht_kondensatspur_vor_nach_stillstand` | Separate previously visible marks from an observed recurrence while idle. |
| `gebraucht_rolle_arbeitsbreite_ausgebrochene_abschnitte` | Record distinct visibly affected spans along a roller without projecting cleaning performance. |
| `gebraucht_auflagepads_unterschied_kompressionsprobe` | Compare a pad pair’s observed compression without making a material-lifetime claim. |
| `gebraucht_klimageraet_abluftstrecke_uebergabezustand` | Separate accessory condition at each end from the state of the flexible span. |
| `gebrauchtgeraet_bedienmarken_lesbarkeit_bedarfsweg` | Check whether a worn control label affects the intended local workflow. |
| `gebraucht_dichtung_zugangsabschnitte_sichtbefund` | Keep obscured portions out of a visual gasket inspection. |
| `gebrauchtgeraet_schatten_kamerawinkel_gegenprobe` | Separate a reproducible mark from a view-dependent appearance. |
| `gebrauchtangebot_teilabholung_aufteilung_nach_beleg` | Decide whether the first partial pickup covers a self-contained intended task. |
| `gebrauchtgeraet_originalkarton_aufgedruckt_enthalten` | Avoid counting printed pack contents as received components. |
| `gebrauchtgeraet_reset_und_eigene_einrichtung_trennen` | Verify device handover state without collecting account information. |
| `gebrauchtgeraet_rueckgabe_vorentscheidung_claim_klaeren` | Compare seller headline and actual written return terms. |
| `gebrauchtangebot_erstbesichtigung_eigner_terminbeleg` | Distinguish monitorable acceptance checks from checks disallowed at pickup. |
| `gebraucht_angebote_pflichtteil_kategorien_luecken` | Find offer-specific missing requirements instead of comparing total included pieces. |
| `gebrauchtgeraet_mehrfachbeigabe_ohne_gebrauchsnachweis` | Audit unverified extras without treating them as usable spares. |
| `gebrauchtgeraet_demo_medien_verkaufsangebot_abgleich` | Check whether the offered configuration agrees with the documented live demo. |
| `gebrauchtgeraet_fehler_haeufigkeit_angabe_widerspruch` | Detect an explicit intermittent-fault frequency mismatch from comparable records. |
| `gebrauchtgeraet_ausstattung_geaendertes_angebot_version` | Detect material reductions in the latest recorded used-device offer. |
| `gebrauchtgeraet_video_ausschnitt_vollstaendiger_start` | Detect gaps in recorded proof of a used-appliance start. |
| `gebrauchtgeraet_vorfuehrung_kaltstart_nur_belegt` | Distinguish a demonstrated cold start from an already-running unit. |
| `gebrauchtgeraet_vorfuehrung_stoppursache_qualifiziert` | Distinguish a completed demonstration from a seller-stopped or unobserved run. |
| `gebrauchtgeraet_testlauf_vorherige_befuellung_effekt` | Correct a used-unit demonstration for pre-existing tank contents. |
| `gebrauchtgeraet_vorfuehrung_eigene_last_untergrenze` | Check whether a demonstration actually covers the buyer’s minimum workload. |
| `gebrauchtgeraet_test_reihenfolge_nutzermodus_wiederfinden` | Check whether observed success depended on an unrecorded operator action. |
| `gebrauchtgeraet_laufzeiten_verschiedene_zeitgrenzen` | Normalize seller-reported duration for omitted startup and finish segments. |
| `gebrauchtgeraet_testprotokoll_normalfall_nachtrag` | Detect a changed result mix when documented omitted runs are restored. |
| `gebrauchtgeraet_testlast_eigener_ablauf_nur_kombination` | Verify whether a buyer-required joint use was actually demonstrated. |
| `gebrauchtgeraet_wartungsbeleg_zielbauteil_gegen_kit` | Check which sold assemblies are actually covered by a maintenance receipt. |
| `backofen_vorheizanteil_getrennte_laeufe` | Compare measured preheat shares for one combined session and two separate sessions. |
| `backofen_blech_sichtprobe_mitte_und_rand` | Compare center and edge outcome counts for a fixed tray placement. |
| `backofen_blechwechsel_gleichwertige_messpaare` | Identify admissible measurements when tray shape or loading changed. |
| `heissluft_gemeinsam_getrennt_messwert_je_ausgabe` | Compare per-serving draw from simultaneous and separate dual-basket use. |
| `heissluft_teilauslastung_messwert_mehrportion` | Attribute incremental measured electricity to extra servings at a documented load. |
| `kontaktgrill_kontaktflaeche_formprobe_stuecke` | Count observed fit categories on a cold, stationary grill surface. |
| `wasserkocher_giessprobe_rest_und_verlust` | Reconcile cold pour-test water across cups and jug remainder. |
| `wasserkocher_warmhalte_innenmessung_grenzpunkt` | Estimate measured marginal kettle holding electricity without extrapolating beyond the observation. |
| `messbecher_zwei_marken_nutzteilung_abweichung` | Check a measuring jug increment independently of absolute mark offsets. |
| `kuechenwaage_tara_behaelterwechsel_charge` | Track material transfer using separate container tare weights. |
| `kochtopf_deckelprobe_verdunstung_energie` | Separate evaporation and power differences in matched lidded pot trials. |
| `kochwasser_herd_oder_kanne_transferbilanz` | Include observed transfer loss and follow-on heating when comparing kettle versus stovetop. |
| `handspuelen_becken_und_hahn_mengenbilanz` | Combine recorded basin fill and separate tap use without overlap. |
| `spuelmaschine_nachlauf_messfenster_energiesignal` | Keep measured dishwasher follow-on energy outside a runtime reading. |
| `spuelmaschine_abtropfplan_restwassergrenze` | Choose among measured draining results after unloading. |
| `spuelmaschine_ladung_kompensierte_teilwiederholung` | Compare unique usable items and machine cycles after partial repeat loads. |
| `kuehlschrank_tuerroutine_ereignisse_sammelphase` | Decide which logged door periods can serve as isolated observations. |
| `kuehlgeraet_stromsignal_raumwaerme_vergleichbar` | Gate a refrigerator energy comparison by observed room-temperature comparability. |
| `gefrierfach_nach_abtaukontrolle_energieabschnitte` | Separate a noted freezer restart block from routine energy observation. |
| `kuehlfach_flaechenprobe_mischbehaelter_zwischenraum` | Compare usable shelf footprint after a separately reserved gap. |
| `kuechenarbeitsplatte_zwei_freizonen_einmal_abziehen` | Reconcile overlapping retained clear areas on a countertop. |
| `kuechenablage_blech_quer_oder_laengs_probe` | Compare both rectangular orientations for a cold baking tray. |
| `kuechenvorbereitung_schneidbrett_ablagen_verlust` | Identify capacity lost to incompatible prep bowls. |
| `kochutensilien_set_ersatz_nur_nach_pruefung` | Count complete tool capacity after verified substitutes. |
| `heissluft_schublade_einsaetze_auflageflaechen` | Compare the observed usable tray surface of two compatible inserts. |
| `kueche_tropfablage_abgetrennte_auflagenprobe` | Identify which observed surface contributed water outside the drip tray. |
| `kochtopf_gemessene_waermekapazitaet_wasser_export` | Bound the sensible heat stored in the measured water and compare it with metered input. |
| `kuechen_spuelmittel_gesamtverbrauch_nachfuellen` | Account for additions when measuring detergent stock use. |
| `kuechen_dosierloeffel_stueckbedarf_stufenplan` | Match one quantity using measured whole dry scoops of two sizes. |
| `spuelgut_nutzbar_ersatz_vorrat_ausgabefolge` | Allocate clean pieces across two rounds using only observed eligible returns. |
| `spuelmaschine_temperatur_einlauf_abschnitte` | Estimate measured incoming water heat across two dishwasher fill segments. |
| `kontaktgrill_programmstrom_leerlauf_ohne_ausgabe` | Report measured grill waiting energy without assuming it is avoidable. |
| `kuechenprogramm_gleiches_ende_schwankung_messen` | Compare observed energy ranges from repeated runs with the same outcome. |
| `kueche_teigformen_passprobe_getrennte_innenmasse` | Check a cold insert against usable internal form dimensions. |
| `spuelbecken_kaltfuellung_stufenwechsel_zeitpunkt` | Locate a basin fill mark within a measured two-rate cold-water sequence. |
| `kochplatten_leerplatz_geschirrwechsel_uebersicht` | Track cold-vessel availability through a staged cleanup. |
| `kuehlfach_behaeltertausch_gebrauchte_deckelpaare` | Count usable container pairs by observed compatibility families. |
| `wasserkocher_portionsprobe_mindestmengenrest` | Separate mandatory fill surplus from additional measured excess. |
| `kueche_portionsverpackung_restmasse_ausgabe` | Reconcile completed servings and partially prepared amounts by weight. |
| `kueche_messprotokoll_gemeinsamer_zaehler_zwei_pausen` | Derive nonoverlapping kitchen-use segments from an intact meter reading sequence. |
| `sommerlueftung_abkuehlrate_nach_fensterschluss` | Compare cooling rates before and after closing a window |
| `dachraum_hitzetrend_erstes_ziel_nach_trendknick` | Identify in which observed trend segment the temperature target first appeared |
| `raumtemperatur_dreipunkt_abflachung_folgemessung` | Check whether the latest cooling segment flattened beyond a chosen tolerance |
| `zimmerkuehlung_zwei_messpunkte_bestaetigt_unter_ziel` | Distinguish a one-off reading from two spaced readings below the target |
| `raumluft_messpause_schwellendauer_grenzen` | Bound warm time without filling an interruption in the log |
| `sonnenschutz_scheibe_und_platz_reagieren_getrennt` | Separate glass and occupied-zone response after shading |
| `feuchtequelle_abfolge_vor_lueftungsprobe` | Check whether a ventilation observation excludes the preceding moisture event |
| `haushaltsklima_wechselereignisse_eindeutiger_vorlauf` | Scope an observed response to one preceding intervention when another cannot overlap |
| `heizpause_oberflaeche_luft_trend_gegenlaeufig` | Detect diverging wall and air trends after heating changes |
| `heizkoerper_waerme_zeitfolge_raumreaktion` | Check whether sampling resolves heater response before the room response |
| `sonnenschutz_lueftung_vier_aufbauten_wechselwirkung` | Compare the observed ventilation contrast with and without shade |
| `raumthermometer_mitfuehren_abweichungsrichtung_wechsel` | Check whether a carried thermometer’s offset changed sign after placement |
| `lueftungsverlauf_co2_minimum_gegen_temperaturgrenze` | Match the lowest recorded CO₂ reading with simultaneous temperature |
| `schrank_raumluft_feuchteunterschied_nach_umschichten` | Check whether a cupboard-to-room humidity gap narrowed after rearrangement |
| `keller_taupunkt_reihenfolge_gepaart_vor_nach` | Check for diverging cellar temperature and dew point after ventilation |
| `zimmerklima_letztes_gleiches_fenster_vor_stoerung` | Identify completed measurement lengths before a confounding event |
| `raumlogger_sprung_simultane_referenzbewertung` | Identify a brief anomaly present only in one room logger |
| `raumfeuchte_intervall_hoch_bleibt_nach_quellenende` | Separate high humidity during an event from its documented persistence afterwards |
| `klimaprobe_waermedifferenz_fensterseite_von_durchgang` | Resolve the order of a thermal observation at an opened doorway |
| `klimageraet_verlauf_ausfallphasen_ungeklaert` | Separate active cooling, planned pauses and unresolved downtime |
| `verschattung_erholung_innerhalb_eigener_streubreite` | Assess recovery toward the recorded baseline range after shading |
| `schlafraum_waermesprung_tuerbelegung_quellenbilanz` | Count nights with two candidate confounders around a warmth event |
| `raumklima_tagesmaximum_abschnitt_bestimmen` | Scope a stored maximum to a shading phase only when the reset interval allows it |
| `ventilator_sitzprobe_luftwechsel_tempstabil` | Separate seat-level airflow from measured room temperature changes |
| `lueftung_vorhang_geschlossen_zwei_ortsreaktionen` | Detect a new window-to-room temperature split after ventilation |
| `bad_erholung_duschfolge_wann_nachprobe_startet` | Identify which shower sequence allows an uncontaminated recovery observation |
| `nachtluft_kuehlerer_aussenwert_vor_erstem_abfall` | Verify timing for an outdoor-to-indoor temperature crossover before a later reading |
| `fenster_taureserve_wechsel_frueher_als_beschlag` | Compare dew-point margin before the first observed condensation |
| `hitzetag_warmzeit_auf_eigene_anwesenheit_beziehen` | Match a sustained warm interval to actual room occupancy |
| `heizaufzeichnung_ueberschwingen_nach_absenkung` | Detect measured overshoot after a recorded setback |
| `kellerfeuchte_endlueftung_taupunkt_ursprung_wechseln` | Compare cellar recovery relative to the measured outdoor dew point |
| `nachtlueftung_querweg_wiederholte_richtungswechsel` | Count directional reversals in repeated doorway airflow checks |
| `kuehlprobe_innen_und_aussen_zeitgewichtete_luecke` | Report observed paired temperature gaps and their uncovered time |
| `vorhang_sonnenlauf_waerme_licht_gemeinsame_probe` | Check simultaneous heat and daylight goals in a measured shading trial |
| `luftfeuchte_trocknungsprobe_waesche_ortssprung_markieren` | Separate drying observations on either side of a room move |
| `keller_kompressor_lueftung_getrennte_tankabnahme` | Mark reservoir intervals affected by a separate ventilation event |
| `klimageraet_raumfaelle_warme_spitze_vor_oder_nach_pause` | Resolve the order of the measured peak and cooling interruption |
| `heizmessung_warme_raumzone_vor_und_nach_sesselwechsel` | Test whether a colder seat zone persists after moving furniture |
| `raumkuehlung_beobachteter_erhaltener_anteil` | Determine how much of an observed temperature gain remained at a later check |
| `dachraum_messreihe_vorhang_zwei_ruecknahmeproben` | Check whether reversing a shading change also reversed the observed temperature movement |
| `campereinwinterung_innenzonen_pruefstatus` | Triage accessible and hidden camper zones from the actual inspection |
| `camper_standkontrollen_nach_hintereinander_ausfall` | Find the longest unobserved interval between completed winter visits |
| `camper_winter_sichtkontrolle_zone_einmessfenster` | Check whether three inspection zones belong to the same camper visit |
| `camper_granulat_waegung_boxwechsel_tara` | Separate tare changes from observed mass gain in a winter absorber |
| `camper_granulat_zwei_besuche_saettigungsintervall` | Bound when winter reservoir limits were reached between visits |
| `wohnmobil_lokale_taureserve_fenster_polster_paar` | Compare paired dew-point margins at a metal frame and behind upholstery |
| `wohnmobil_polster_vorne_hinten_seitenwechsel_befund` | Track a damp observation after turning a camper cushion |
| `wohnmobil_messpunkt_nach_polsterrueckkehr_verdeckt` | Audit whether an original measurement point remains accessible after restoring upholstery |
| `camper_staufach_winter_nachbesuch_neu_abgedeckt` | Deduplicate two inspections of camper storage points |
| `wohnmobil_zutritt_messreihe_vor_tueroeffnung` | Determine whether a stored measurement preceded the first door opening |
| `camper_stellplatzwechsel_vorher_nachher_quellenscope` | Scope an observed camper change when placement and contents change together |
| `wohnmobil_kondensatspur_foto_zonenrichtung` | Compare upper and lower visible traces without inferring an entry point |
| `wohnmobil_rueckkehr_trockenkontrolle_materialpaar` | Match dry stored items to separately inspected camper locations |
| `camper_absorber_rueckkehr_vor_offener_besuchspause` | Match a documented absorber check deadline against actual access |
| `camper_heckfach_verschlusswechsel_luftsignal_kontrolle` | Compare a storage door intervention against a stable cabin airflow control |
| `camper_tiefster_messwert_klimadaten_kaltperiode` | Interpret a winter minimum separately from the visit temperature |
| `wohnmobil_polster_rueckkehr_fachzugang_termin` | Compare camper storage access with the later return of furnishings |
| `camper_heckfach_stichprobe_oeffnung_veraendert` | Compare the storage reading shift with the living-area reference after opening |
| `wohnmobil_nachwinter_befund_neu_oder_wiederholt` | Separate new sightings from repeated findings after winter |
| `camper_standwinter_polster_massengang_referenz` | Compare mass change of stored upholstery against a dry control |
| `wohnmobil_nachwinter_kalte_zonen_wiederholungswechsel` | Check whether the colder camper surface changed between winter visits |
| `auto_parksonne_vorderseite_fensterseite_verschattung` | Audit front and side shade across two phases of a parked vehicle |
| `auto_parkprobe_sonnenschutz_zeitversatz_am_selben_platz` | Separate unprotected and protected time in a parked sunshade trial |
| `camper_granulat_stellvergleich_spitzen_und_mittelwert` | Compare peak and mean humidity under two absorber layouts |
| `camper_standwinter_logger_zwischen_auslese_und_umzug` | Scope stored winter data across a campsite move |
| `wohnmobil_saisonwechsel_erster_getrennter_eindruck` | Find the observable window between unpacking the camper and restoring furnishings |
| `wohnmobil_staurouten_zwei_fachstellungen_nutzen` | Map two camper cabinet positions to storage or access needs |
| `wohnmobil_kuehlung_luftpfad_gepackt_gegen_leer` | Compare outlet-flow coverage in the empty and packed camper |
| `wohnmobil_standwinter_belueftung_vom_befund_trennen` | Separate a cleared visual symptom from a resolved source in the camper |
| `wohnmobil_klima_parkmessung_vorbetrieb_kennzeichnen` | Classify cabin samples before or during a documented cooling trial |
| `pc_chip_und_ansaugluft_abstand_zerlegen` | Decompose the observed chip change into inlet and chip-to-inlet terms. |
| `pc_ansaugluft_zu_raum_und_auslass` | Distinguish three simultaneous PC observation points from a room-temperature claim. |
| `pc_cpu_gpu_lastmix_zu_gepaarten_proben` | Select PC trials that repeat both recorded workload segments. |
| `pc_temperaturmaximum_aufgaben_nachlauf` | Locate a logged PC temperature maximum relative to load and measured cooldown. |
| `pc_leistungsabfall_und_begrenzungsmeldung` | Distinguish a recorded thermal-limit signal from slow work alone. |
| `pc_leistungsprotokoll_ansaugfenster_wechselabstand` | Keep delayed thermal samples out of mixed workload phases. |
| `pc_benchmark_aufzeichnung_mindestlauf_ausschluss` | Compare incomplete PC runs by workload group before using performance averages. |
| `pc_laufpaar_startzustand_vorherige_arbeit` | Check thermal carryover from the last recorded workload rather than the current output alone. |
| `pc_zwei_ansaugseiten_lokal_mehrlast_probe` | Test whether one inlet observation can stand for two documented intake locations. |
| `pc_thermik_bildrate_und_aufloesung_abgleich` | Keep changed display-output settings out of matched thermal-performance observations. |
| `arbeitsplatz_technikumschaltung_eindeutige_proben` | Recover single-change monitor or desk-light observations before comparing temperatures. |
| `arbeitsplatz_waerme_quelle_zwei_on_off_aufzeichnungen` | Label a local desk reading by the equipment states actually documented at that instant. |
| `arbeitsplatz_bildschirm_licht_brauchbare_feinprobe` | Compare lighting draw among two setups whose task and screen visibility were checked. |
| `arbeitsplatz_luefter_probe_luftwert_und_empfinden` | Report whether desk fan comfort moved independently of measured air temperature. |
| `arbeitsplatz_oberflaeche_sonnenstreifen_messpunkte` | Compare paired desk surfaces and concurrent air without assuming either surface represents the room. |
| `arbeitsplatz_fusshoehe_sitzhoehe_wiederkehrmuster` | Classify a repeated colder foot-zone observation separately from a whole-seat drop. |
| `arbeitsplatz_warme_optionen_unterschiedlicher_zielbereich` | Compare observed personal comfort and room warming as different completion criteria. |
| `arbeitsplatz_technik_waerme_nach_pause_aufbauklasse` | Label local hardware warmth after an observed pause without inferring room cooldown. |
| `pc_log_betriebsarten_gemischte_fenster_grenze` | Audit state coverage before comparing idle against active thermal readings. |
| `pc_sensorquellen_cpu_gpu_wechsel_nicht_verketten` | Preserve independent CPU and GPU log continuity after a telemetry-view change. |
| `pc_dauerlog_aufgabenzeit_und_wandzeit_trennen` | Map a task-runtime marker to wall time across one verified pause. |
| `laptop_strommessung_akku_startsaldo_proben` | Flag unequal battery movement as a confound in two plugged-in laptop energy records. |
| `monitor_sichtprobe_raumlicht_und_bildinhalt` | Audit screen appearance observations for content and room-light confounders. |
| `arbeitsplatz_lichtmessung_bildschirm_lichtquelle_abgrenzen` | Compare controlled black-screen and reference-image readings at a fixed work surface. |
| `pc_ansaugluft_drei_ablesungen_eigenes_stillstandsband` | Verify a recorded inlet plateau across three unchanged operating samples. |
| `arbeitsplatz_tischluefter_messabdeckung_abseits_strahl` | Separate in-stream and off-stream data completeness in a desk fan trial. |
| `pc_displayphase_puffer_zweiseitig` | Trim an observed desk thermal log around a known display transition. |
| `arbeitsplatz_druckphase_waermeprotokoll` | Isolate a logged printer episode from changes to other desk loads. |
| `arbeitsplatz_sitzdauer_waermerueckmeldung_abdeckung` | Count evidenced personal comfort across an interrupted desk session. |
| `pc_cpu_gpu_gleiches_zeitfenster_spitzenreihenfolge` | Compare recorded CPU and GPU peak timing using the actual clock resolution. |
| `punktwaerme_aufgabenzeit_ausfallursachen` | Account for distinct sources of missing comfort during an attended task. |
| `punktwaerme_durchgehende_arbeitsphase_nachweis` | Distinguish a usable uninterrupted comfort run from summed fragmented minutes. |
| `punktwaerme_eintritt_waermefenster_drei_grenzen` | Bound usable overlap for an uncertain arrival with a fixed attended task duration. |
| `thermostat_punktwaerme_offset_moduswechsel` | Separate an active-state sensor offset from a resting-location difference. |
| `thermostat_schaltfolge_platzband_asymmetrie` | Distinguish a documented late switch-on from late switch-off at the occupied spot. |
| `thermostat_unauflosbare_kleine_stufen` | Test whether measured desk temperatures resolve one documented control step. |
| `punktwaerme_routenvergleich_einzelplatz_dominiert` | Test whether point comfort persists across actual task-location changes. |
| `punktwaerme_aufgabenmix_ungepruefte_kaltphase` | Audit coverage of real cold-start task classes. |
| `punktwaerme_kurzpause_messwert_fluktuation` | Flag a transient comfort-temperature dip absent from the endpoint comparison. |
| `punktwaerme_fehlerspielraum_tuerphase_kontrolliert` | Find the recovery attempts whose duration is censored by repeated door openings. |
| `punktwaerme_zusatzkomfort_nur_neue_minuten` | Price genuinely new comfortable minutes in a matched baseline and trial timeline. |
| `punktwaerme_abschattung_referenzgain` | Compare two measured local surface gains after subtracting their respective start readings. |
| `punktwaerme_messraster_zonen_verteilung_spannweite` | Identify nonuniform outcomes without averaging away a required spot. |
| `thermostat_nachlauf_oberziel_zeitordnung` | Locate observed post-switch overshoot separately from a thermostat cutoff reading. |
| `heizluefter_arbeitsstufe_reproduzierbarer_erfolg` | Compare observed stage costs only after the same task passed in every matched trial. |
| `punktwaerme_personenurteil_stichproben_einigung` | Check whether independent comfort judgements agree beyond their marginal response patterns. |
| `punktwaerme_vorlaufgrenze_beobachtung_vor_erstkontakt` | Preserve left-censoring when the first comfort observation already meets the target. |
| `thermostat_taktenergie_grundverbrauch_widerspruch` | Check an energy log against a thermostat cycle and explicit baseline range. |
| `punktwaerme_folgesitzung_beobachtete_restnutzenquote` | Measure how much confirmed follow-on work used residual warmth. |
| `punktwaerme_verdeckter_unterschied_koerperzonen` | Retain oppositely changing body-zone comfort instead of averaging it into one result. |
| `punktwaerme_nach_aus_unterschreitung_beobachtungsband` | Bracket an observed decay crossing without assuming a cooling rate. |
| `punktwaerme_raumdurchschnitt_verdeckt_festen_platz` | Check whether a rising room index masked deterioration at the occupied point. |
| `punktwaerme_anzahl_arbeitszyklen_nutzbar` | Count full attended work units with fixed use-specific overhead. |
| `punktwaerme_temperaturdefizit_linie_abschnitt` | Integrate only below-target deficit across one occupied segment. |
| `heizluefter_aufgabe_sprachpause_und_waerme` | Count the heat that remains usable after overlapping conversation disruption. |
| `punktwaerme_platzwechsel_wieder_erreichen_anteil` | Separate immediate, delayed and unresolved return comfort instead of imputing missing return observations. |
| `punktwaerme_zwei_hoehen_reihenfolgewechsel` | Detect a measured reversal of the vertical temperature ordering. |
| `thermostat_handkorrekturen_versuchsfolge_notiz` | Distinguish manually overridden comfort episodes from a clean baseline control. |
| `punktwaerme_arbeitsziel_wechsel_energieabschnitt` | Compare task-specific energy per completed work item under explicit time and output limits. |
| `thermostat_anforderungen_geraetereaktion_protokoll` | Audit matched requests, documented lockouts and unexplained starts. |
| `luftkuehler_nass_trocken_einlassabgleich` | Compare wet and dry outlet cooling against each run’s own intake temperature. |
| `luftkuehler_modalternativen_lufttempo_partner` | Find the closest measured dry fan setting to an established wet-mode airflow. |
| `luftkuehler_lokale_probe_kaufbedarf` | Choose the next test or a no-buy decision from an observed local cooling need. |
| `luftkuehler_trockenkontrolle_restfeuchte_beleg` | Check whether a fan-only control was actually documented as dry. |
| `luftkuehler_auslassmessung_nasser_fuehler_ausschluss` | Flag an outlet measurement exposed to wetting of the temperature sensor. |
| `luftkuehler_mattemuster_nasszonen_nachlauf` | Distinguish repeatedly dry pad areas from one-off readings after use. |
| `luftkuehler_feuchteband_paarprobe_auslassnutzen` | Compare measured wet-mode benefit in two evidenced humidity bands. |
| `luftkuehler_ortsprobe_kuehler_und_schwuel_empfunden` | Separate felt cooling from perceived stuffiness in a matched wet/dry trial. |
| `luftkuehler_tankbilanz_ueber_wasserwege` | Account for reservoir drawdown, measured losses and retained water separately. |
| `luftkuehler_tankstand_ruecklauf_nach_stopp` | Quantify the observed return to the reservoir after normal stop. |
| `luftkuehler_betriebswahl_wasser_und_lokalziel` | Compare measured programs against a local cooling target and water budget. |
| `luftkuehler_wasserverlust_stillstand_kontrolllauf` | Compare active-mode and stopped reservoir changes under matched conditions. |
| `luftkuehler_fuellsicht_minimum_ohne_interpolation` | Place a measured tank level against documented fill marks without inferring volume. |
| `luftkuehler_tank_marken_messwerte_abgrenzen` | Bound volume from two measured fill observations surrounding a new level. |
| `luftkuehler_pflegedokument_tank_matte_unterscheiden` | Verify model-specific and separate care instructions for the reservoir and evaporative pad. |
| `luftkuehler_kuehlakku_pegelversatz_tank` | Compare measured tank levels at a fixed water volume with and without a documented cooling pack. |
| `luftkuehler_kuehlakku_einsatzgrenzen_belegt` | Verify whether this specific cooling pack and its intended placement are documented. |
| `luftkuehler_kuehlakku_vor_nach_gegen_wasserprobe` | Compare a cooling pack’s early and late added effect against water-only readings. |
| `kuehlakku_uebergangsfenster_messpunkt_zuordnen` | Locate a reading relative to an observed end of the cooling-pack stage. |
| `luftkuehler_kuehlakku_zusatzsignal_auslass_sitz` | Check whether extra cooling at the outlet also reaches the chosen seat. |
| `luftkuehler_wasser_kalt_luftsignal_unter_messspiel` | Distinguish a measured cooler tank from outlet cooling beyond measurement noise. |
| `eisprobe_gemessene_schmelzmasse_waermeanteil` | Estimate latent heat from measured melting of known pure water ice. |
| `luftkuehler_nachfuellfolge_wassertemperatur_rueckbezug` | Check when a recorded refill no longer differs from the prior tank-temperature band. |
| `luftkuehler_alternierende_nassphasen_sitzzeit` | Separate observed wet operation from the part actually used in the airflow. |
| `luftkuehler_feuchtemessung_nahstrahl_raumvertretung` | Classify a humidity reading by its documented exposure to the cooler’s jet. |
| `luftkuehler_mehrfeuchte_je_lokalgrad_probe` | Relate a measured room humidity change to an observed local cooling benefit. |
| `verdunster_raumfeuchte_versuchsabbruch_zielbelegt` | Preserve a measured local improvement and a later user-set trial stop as separate outcomes. |
| `luftkuehler_luftgeschwindigkeit_kopf_und_tischzone` | Check a two-zone airflow arrangement against distinct personal goals. |
| `luftkuehler_betriebswechsel_pumpe_luft_getrennte_belege` | Record independently verified airflow and wet circulation after a normal mode change. |
| `luftkuehler_vergleich_ein_tankvolumen_getrennte_laufarten` | Verify whether a published tank runtime refers to the intended wet-use setup. |
| `heizwaesche_rueckstandsgruppen_gewicht_unabhaengig` | Identify which weighed placement group still keeps a heated-rack load unfinished. |
| `heizwaesche_fertige_teile_aus_massenspur_entfernen` | Correct apparent mass loss when some finished pieces were removed during heated-rack weighing. |
| `heizwaesche_massenplateau_vor_wirklichem_ziel` | Detect a measured drying plateau while still above the target mass. |
| `heizwaesche_reststand_neu_aufgelegt_nach_ruhezustand` | Flag observable rebound after reorganizing checked textiles. |
| `heizwaesche_positionsreihe_abstand_einflussgrenze` | Separate a spacing comparison from trials with altered load or ventilation. |
| `heizwaesche_endpunkt_zwischen_zwei_stichproben` | Find the bounded window in which a verified textile target was first observed. |
| `heizwaesche_untersuchte_flaechenproben_minimum` | Check whether observed zone coverage is sufficient for a load-wide conclusion. |
| `heizwaesche_zeitgleiche_ladetiefen_teilvergleich` | Keep regrouped pieces out of a matched heated-rack trial. |
| `heizwaesche_relative_und_absolute_richtung` | Interpret opposing humidity changes during a drying trial. |
| `heizwaesche_lueftungsphase_stabile_waage_gegenprobe` | Recognize air dry-down without a resolved textile mass change. |
| `heizwaesche_luftprobe_waermequelle_zeitfenster` | Find a stand-alone observation window inside a paired-use drying log. |
| `heizwaesche_luftvolumen_massendifferenz_ohne_zutritt` | Reconcile measured transfers without attributing an unresolved moisture remainder. |
| `heizwaesche_spaete_kondensatbeobachtung_vorbefund` | Distinguish a pre-existing wet surface from newly observed wetness. |
| `heizwaesche_nahmessung_gegen_lufttrend_fern` | Identify unresolved spatial moisture patterns instead of generalizing a local reading. |
| `heizwaesche_protokoll_trockenraum_hintergrund_vergleich` | Compare rack observations with a matched empty-room baseline. |
| `heizwaesche_hilfsentfeuchter_stop_weiteres_abtrocknen` | Determine whether measured textiles kept losing mass after an auxiliary device stopped. |
| `heizwaesche_luftprobe_zeitpunkt_einem_abschnitt_zuordnen` | Check whether a moisture reading could straddle a phase boundary. |
| `heizwaesche_hochpunkt_ruhe_nach_entnahme` | Retain a delayed peak after all textiles have left the room. |
| `heizwaesche_verbrauch_am_trockenziel_eingrenzen` | Bound energy at a verified drying endpoint without interpolating it. |
| `heizwaesche_teilprotokoll_zusatzgeraet_subtraktion` | Recover only the provably attributable share of a mixed-device drying meter log. |
| `heizwaesche_hilfe_zeitgewinn_mehrstrom_budget` | Evaluate an observed time saving against a household marginal energy budget. |
| `heizwaesche_messung_tara_vor_und_nach_wechsel` | Reconcile two drying-log series through a same-mass anchor at a basket change. |
| `heizwaesche_weitergabe_trockene_teilmasse_vorrang` | Determine if a verified dry subset meets a planned first delivery. |
| `heizwaesche_raumbelegung_freiraum_und_messziel` | Distinguish physical room clearance from a documented humidity observation. |
| `heizwaesche_zwei_trockenziele_veraenderter_endpunkt` | Separate a documented partial drying target from the final one. |
| `heizwaesche_teilfolge_beaufsichtigte_messpunkte` | Check whether both required observations can be actually taken. |
| `heizwaesche_anfangsmasse_nassbezug_trockenbezug` | Detect mismatched starting moisture in equally heavy wet loads. |
| `heizwaesche_raumziel_zwei_vergleichbare_beobachtungen` | Screen comparable drying trials against both measured room and energy criteria. |
| `heizwaesche_langsamere_zone_rangwechsel_im_verlauf` | Detect a rank reversal between unchanged placement groups within one drying run. |
| `heizwaesche_letzte_kontrolle_hilfsgeraet_nachlauf` | Separate measured auxiliary use after the endpoint from total trial energy. |
| `poolroboter_bodenraster_unbesuchte_felder` | Record coverage over a simple marked pool-floor grid. |
| `poolroboter_wandabschnitt_anhaftung_vor_nach_probe` | Compare marked wall residues before and after one observed pass. |
| `poolroboter_treppenumkehr_sichtprotokoll` | Record observed turn-backs separately from blind spots at an approved transition. |
| `poolroboter_korb_blaetter_feinreste_einordnung` | Compare visible matter categories without treating basket contents as water quality. |
| `poolreinigung_neuer_schmutzeintrag_nach_lauf` | Separate visible residual debris from later arrivals within marked areas. |
| `pool_flaechenplan_nacharbeit_gesperrte_zonen` | Keep visible work needs separate from areas with unconfirmed access. |
| `poolroboter_umkehrabweichung_beckenvariante_beleg` | Mark exactly which prior pool observations need retesting. |
| `poolpflege_zwischenablage_tropfprotokoll` | Schedule the use of a confirmed drip area after retrieval. |
| `rasenroboter_zugang_zwei_routen_nachweis` | Compare route evidence where neither isolated entrance proves the whole trip. |
| `maehroboter_gatter_durchfahrt_richtung_paare` | Check directional passage evidence for each leg of a supervised trip. |
| `maehroboter_uebernommener_garten_aenderungsflaechen` | Scope the resurvey after fixed garden landmarks change. |
| `rasenroboter_beobachtungsfenster_nach_kurzsperrung` | Fit a supervised retest after a shared access closure. |
| `maehroboter_gartenbeobachtung_mittlere_unterbrechung` | Compare the time spent on access pauses and other recorded stops. |
| `rasenroboter_maehende_teilflaechen_uebergabe` | Separate fully, partly and unobserved areas after one outing. |
| `rasenroboter_randprobe_referenzpunkt_vor_nach` | Separate recurring edge observations from one-off marks. |
| `maehroboter_grundstueckskizze_nachbarflaeche_abgrenzen` | Keep shared or unresolved ground outside the candidate work area. |
| `terrasse_schattenfolge_pause_ohne_platzwechsel` | Find the longest continuous shaded interval at one fixed table. |
| `terrasse_bodenluft_schattenprobe_getrennte_messwerte` | Separate surface temperature and air observations from a paired shade trial. |
| `terrasse_abendsonne_blickrichtung_probe` | Compare glare by facing direction, not just the overall shadow area. |
| `terrasse_sonnenschutz_vorab_einraeumen_termin` | Fit two planned shade-item removals into one confirmed attendance window. |
| `terrasse_schattenzuwachs_bestehende_ueberdeckung` | Measure newly shaded time rather than counting overlap twice. |
| `balkon_sonnenschutz_mietuebergabe_zustandsbelege` | Identify the missing before-and-after record for a reversible balcony setup. |
| `terrasse_polster_trocknung_naechste_sitzrunde` | Plan seating from verified cushion readiness and available replacements. |
| `balkontuer_terrassenweg_haeufige_konflikte` | Compare real doorway interruptions across two terrace setups. |
| `terrassenbeschattung_zimmerprobe_mit_referenzraum` | Compare changes in two rooms without attributing the difference automatically. |
| `balkon_ausweichplatz_lernpause_rueckkehrbudget` | Reserve a genuinely usable outdoor break including the return. |
| `terrasse_beschattung_saison_probeuhrzeit_vergleich` | Compare two observed seasonal shadow shifts at the same meeting time. |
| `terrasse_sitzgruppe_schatten_kleinteile_freigabe` | Verify simultaneous shade for a group and tabletop, not successive coverage. |
| `terrasse_ausrichtung_trockener_stellflaeche_protokoll` | Preserve verified dry intervals for two staging areas. |
| `poolreinigung_gleiches_raster_zwei_beobachtende` | Preserve observer agreement rather than pooling their counts. |
| `gefrierschrank_24h_haushaltsspitze_und_bestandsvolumen` | Compare models by rolling 24-hour fresh load and retained volume |
| `gefrierladung_waegeunbekannte_packung_massenintervall` | Bound fresh loading mass when packaging or already frozen contents are unresolved |
| `gefrierschrank_schnelleinfrieren_protokoll_vorlauf` | Verify the observed lead time for the manual-documented fast-freeze mode |
| `gefrierschrank_aufstellort_klimaband_messabdeckung` | Scope logged ambient conditions to the exact freezer climate envelope |
| `gefrierschrank_klimaband_besuchsminimum_referenzpunkt` | Separate a cold freezer placement reading from an in-room reference |
| `gefrierschrank_stromausfall_dauer_zwischen_ankern` | Bound the outage duration from four verified power observations |
| `gefrierschrank_stoerakte_tuer_und_temperaturzeitpunkt` | Classify door and temperature evidence inside the confirmed outage window |
| `gefrierfach_nach_stoerung_displayquelle_gegensichten` | Distinguish a setpoint or stored alarm reading from new temperature evidence |
| `gefrierschrank_label_tagesanteil_gegen_eigene_messung` | Compare observed energy with the prorated annual label reference |
| `gefrierschrank_zaehler_reset_downtime_energieluecke` | Account for a freezer energy logging gap after a meter reset |
| `gefrierschrank_tuerraum_durchgang_bei_90_grad` | Check passage left beside a documented open freezer door |
| `gefrierschrank_tuerwinkel_schublade_entnahme_pruefung` | Separate ordinary access and full drawer-removal door angles |
| `gefrierschrank_versorgungsrueckkehr_anzeige_separat` | Separate power restoration from display restart evidence |
| `gefrierschrank_stoerstunden_herstellerwert_scope` | Scope the documented holdover figure against the recorded outage duration |
| `gefrierschrank_no_frost_fachscope_nachweis` | Separate declared auto-defrost scope from observed frost or moisture |
| `gefrierschrank_schalllabel_kaufgrenze_gleicher_kenngruppe` | Screen both freezer labels against a sound-power preference within one class |
| `gefrierfach_ladungsversuch_gleichzeitige_ereignisse` | Check whether a fresh-load energy observation remained isolated |
| `gefrierschrank_beleuchtung_beleg_entnahmezugang` | Scope declared freezer lighting to the observed drawer access task |
| `bosch_sbv4ebx00d_nische_tueroeffnung_abgleichen` | Compare the exact Bosch model’s niche and door-open envelope. |
| `spuelernische_breitenprofil_messunsicherheit` | Bound the narrowest observed opening across three measurement stations. |
| `spuelernische_lichte_hoehe_boden_arbeitsplatte_trennen` | Distinguish floor-level changes from worktop underside changes. |
| `spuelernische_rueckraum_hindernis_hoehenband` | Localise where a marked rear obstruction actually reduces depth. |
| `spueler_angebot_geraet_nische_verpackung_trennen` | Identify which dimensional evidence is missing from a seller’s listing. |
| `spueler_tiefenbezug_wand_und_blendenflucht_umrechnen` | Translate the door-open depth to the user’s cabinet face datum. |
| `spueler_moebelfront_altlochbild_bezug_uebereinstimmung` | Flag whether known old panel points agree with the current drawing. |
| `spueler_frontart_geteilt_oder_einteilig_belege` | Compare documentary support for single and split fronts. |
| `spueler_sockel_zeichnung_bezugskante_zuordnen` | Check the proof behind a toe-kick clearance comparison. |
| `spuelertuer_nachbarschublade_gleichzeitig_grundriss` | Find interference between opposite open fixtures. |
| `spuelertuer_eckschrank_reihenfolge_belegte_kollisionen` | Compare the two tested opening orders around a kitchen corner. |
| `spuelerkorb_auszug_notierter_tuer_und_arbeitsweg` | Keep the user’s working space separate from physical basket travel. |
| `spueler_lieferkarton_aufrecht_zwei_tuerprofile` | Identify straight delivery openings with insufficient width or height. |
| `spueler_lieferweg_wendeflaeche_aufmass_schablone` | Decide whether an earlier swept-corner proof still applies. |
| `spueler_lieferung_aufzug_nutzlast_mit_begleitung` | Include every documented load in the elevator planning check. |
| `spueler_alt_neu_abstellflaeche_uebergabefolge` | Check whether one staging spot can serve both old and new units. |
| `spueler_frontgewicht_inklusive_griff_messband` | Check the documented panel-weight band against the complete panel assembly mass. |
| `spueler_hochnische_und_unterbau_zeichnungszweig` | Check that the drawing branch matches the kitchen layout. |
| `spueler_auto_tuerstellung_raumobjekt_ausladung` | Document obstacle encroachment during an observed automatic door position. |
| `spueler_servicetiefe_geraet_und_arbeitsbereich` | Keep temporary service extraction clearance distinct from an ordinary aisle. |
| `spueler_technische_unterlage_e_nummer_suffix_pruefen` | Resolve whether a primary installation drawing really belongs to the installed service variant. |
| `spueler_entladeweg_zwei_personen_umraeumprobe` | Compare recorded interruptions rather than inferring usability from aisle width. |
| `spueler_bedienfeld_sichtprobe_front_und_offen` | Check when a status display is actually visible to the user. |
| `spueler_moebelfront_geteilte_hoehen_sichtlinie` | Compare the location of one panel seam with neighbouring cabinet lines. |
| `wasch_trocken_saeule_herstellerkombination_beleg` | Verify the exact published scope and exceptions of a stacking kit. |
| `stapelsatz_typenschild_artikelnummer_beleg` | Match a visible material code or verified EAN to the exact kit. |
| `wasch_trocken_saeule_exakte_hoehenbilanz` | Estimate nominal stacked height and remaining clearance. |
| `wqg241001_tiefen_gemeinsame_messkante` | Compare a dryer dimension using the correct documented reference depth. |
| `stapelsaeule_auszug_und_tuer_gemeinsamer_betriebsraum` | Distinguish aisle occupation from a possible overlap between stacked moving parts. |
| `stapelsatz_ablagefunktion_gegen_nutzungszweck` | Distinguish a pull-out worktop from storage when choosing a kit. |
| `stapelsaeule_oberes_bedienfeld_und_tankgriff` | Compare projected access for two different upper-unit tasks. |
| `stapelsatz_schublade_inhalt_geschlossen_entnehmbar` | Check whether contents fit beneath the closed drawer envelope and can still lift out. |
| `stapelsaeule_tank_vollentnahme_und_arbeitsfreiraum` | Check the full removal envelope as well as separate carrying room. |
| `wqg241001_tank_oder_ablauf_platzentscheidung` | Distinguish user access from an independently verified drainage configuration. |
| `stapelsaeule_einzelgeraetwechsel_alter_satz_neuer_beleg` | Recheck a retained kit when one of the two appliances changes. |
| `miele_stapelsatz_demontage_deckelbeleg_offen` | Identify the unresolved cover evidence after a previously installed kit was removed. |
| `stapelsaeule_auszugsnutzen_zwei_getrennte_arbeitsproben` | Check whether a pull-out worktop actually replaces a separate staging step in your routine. |
| `stapelsaeule_paketabholung_teilstuecke_getrennt_passmass` | Verify whether each separate package clears the same narrow route. |
| `stapelsaeule_nische_tiefe_versatz_vorderkanten` | Find differing front setbacks under a shared niche line. |
| `wqg241001_untergeraet_gehaeuse_und_arbeitsplattentiefe` | Check comparable cabinet dimensions and the distinct worktop depth criterion. |
| `wasch_trocken_stapel_gegen_nebeneinander_arbeitskante` | Compare two layouts against actual one-sided usable frontage. |
| `q350_tr_250m3_schallweg_druckpunkte_v0126` | Compare two V0126 pressure points for the same documented path at 250 m³/h. |
| `lueftungsangebote_gemeinsame_druckpunkte_finden` | Find common recorded external pressures at one matching flow. |
| `q350_tr_etikett_oder_schallpfad_datenzeile` | Route a noise claim to the appropriate Q350 TR table. |
| `q350_tr_dokumentauswahl_artikelnummer_revision` | Validate the documented market and exact Q350 TR article before quoting the revision. |
| `q350_tr_waermebereitstellung_pruefregime_lesen` | Read the recovered-heat figure under the specific published test regime and variant. |
| `lueftung_schallpfad_fassadenbeleg_oder_anlagengeraeusch` | Identify which observed paths have evidence for exterior, terminal or equipment noise. |
| `lueftung_oktavband_daempfungsbeleg_einzelpfad` | Apply documented attenuation to one octave band on the same source path. |
| `lueftung_schallanschluss_familienwert_lesart` | Distinguish group-level acoustic data from a separately measured port. |
| `lueftung_lw_raumangebot_belegluecken` | Find missing evidence for applying a catalogue sound figure to an occupied room. |
| `lueftung_betriebspunkt_datenform_zwischenwert` | Determine whether a requested pressure point has a direct documented match. |
| `comfoair_q_handbuch_nutzerpflege_oder_fachservice` | Route a recorded care request to the user manual or professional service. |
| `q350_tr_filterpaar_bestellcode_quellenabgleich` | Read the documented filter-pair composition for one exact part number. |
| `lueftung_zwei_filterklappen_persoenlicher_zugang` | Assess a documented user access margin at each filter opening. |
| `q350_tr_filterwarnung_nicht_auf_kalendertage_rechnen` | Separate a flow-dependent filter alert from a calendar service record. |
| `q350_tr_steuerungsoption_lieferbeleg_abhaengigkeit` | Check dependencies of a documented Q350 TR control option in an offer. |
| `lueftungsangebot_bypass_kuehlkreis_beleggrenze` | Distinguish documented supply-air bypass from active cooling in an offer. |
| `q350_tr_aufstellraum_messbereich_quellenabgleich` | Check measured installation-room temperatures against the matched Q350 TR data limits. |
| `lueftungsangebot_abluftschlauch_frischluftweg_beleg` | Verify an actual outdoor-air supply path independently of an exhaust hose. |
| `q350_tr_leistungsaufnahme_gleicher_volumenstrom_pruefwert` | Read power and specific fan power at one documented 250 m³/h test point. |
| `q350_tr_etikett_regelung_sensorpaket_bezug` | Check which evidence supports a control-specific energy-class claim. |
| `lueftungsangebot_zuluft_abluft_doppelt_gezaehlt` | Keep simultaneous supply and extract readings separate from an advertised volume sum. |
| `lueftung_bypass_aussen_zuluft_raum_beobachtung` | Separate measured supply-air, outdoor and room temperatures when a bypass is observed. |
| `q350_tr_enthalpie_feuchterueckgewinnung_fehlfeld` | Keep measured moisture recovery separate from missing figures in the device’s tested configurations. |
| `lueftung_wechselrichtung_zyklus_zuluftanteil` | Calculate a measured alternate-direction supply rate over the entire operating cycle. |
| `oekodesign_reparatur_geraeteart_anwendungsbeleg` | Check the scope evidence for the two household appliance repair annexes. |
| `oekodesign_teilgruppe_rollenweg_de` | Distinguish annex-listed consumer and possibly registered-professional part routes. |
| `oekodesign_letztmodell_mindestzeit_bezugstag` | Compute an informational minimum calendar marker from the last unit placed on the EU market. |
| `oekodesign_katalog_veroeffentlichung_erster_markttag` | Compute the publication reference from the first model unit rather than the last. |
| `oekodesign_bestelleingang_lieferung_arbeitstage` | Count workdays from received order to documented delivery, excluding documented non-working days. |
| `oekodesign_fachzugang_registrierung_anfrage_stufen` | Track the five-day registration and one-day information reference as distinct case stages. |
| `ersatzteil_marktbeleg_typenschild_kaufserie` | Distinguish a documented last placing from purchase, production and discontinuation. |
| `ersatzteil_losbereich_an_fertigungsgrenze` | Identify a documented part branch from the model lot marker without taking a full serial number. |
| `ersatzteil_erweitertes_set_getrennte_positionen` | Audit conditional manufacturer supersession instead of assuming identical function from a part number. |
| `ersatzteil_angebotskanal_lagerstatus_timestamp` | Check stale listing evidence without treating absent stock proof as out of stock. |
| `ersatzteil_lieferbeleg_teilung_teilpositionen` | Reconcile two chronological delivery batches against the set required for one confirmed repair. |
| `reparaturangebot_diagnoseabrechnung_zwei_ausgaenge` | Compare explicitly quoted costs for proceeding versus stopping after diagnosis. |
| `reparaturangebot_annahme_material_fristkonflikt` | Detect when reservation expires before an offer can actually be accepted. |
| `ersatzteil_folgearbeit_angebot_evidenzmoment` | Screen whether a parts quote also covers every separately required service dependency. |
| `ersatzteil_verpackung_beleg_widerspruch_inhalt` | Hold a package identity mismatch instead of accepting an outer label as proof. |
| `ersatzteil_angebotsalternativen_gemeinsames_lager` | Distinguish two seller listings from independently supported fulfillment. |
| `reparaturangebot_kostenband_deckel_nachtrag` | Bound documented repair expenditure only when every included extra is capped. |
| `ersatzteil_softwarestand_angebot_abweichende_generation` | Separate documented support for a variant from a generic software download. |
| `ersatzteil_fachangebot_diagnose_gleichnamiger_fehler` | Check whether the quoted part follows the confirmed diagnosis for this case. |
| `ersatzteil_kaufpause_reparatur_nutzwerthorizont` | Compare repair wait with a documented end-of-use date rather than assuming the device remains wanted. |
| `dunstabzug_de_modell_set_filter_belegkette` | Distinguish a documented recirculation kit from an installed-kit replacement |
| `dunstabzug_starterset_17004061_paketrolleninventur` | Audit the documented contents of Bosch starter kit 17004061 |
| `dunstabzug_dwb66bc50_normale_maxstufe_kenndaten` | Retrieve model-specific airflow and sound power for a documented operating mode |
| `dunstabzug_gehaeusehoehe_je_betriebsbauform` | Compare the hood outline height for the documented configuration |
| `dunstabzug_metall_kohle_pflegeauftrag_abgrenzen` | Keep grease-filter dishwasher evidence separate from carbon-filter care |
| `dunstabzug_aktivkohle_tausch_zeitband_hersteller` | Classify a recorded exchange against the exact filter’s published guidance |
| `dunstabzug_dkf12r_regeneration_und_gesamtalter` | Keep regeneration timing separate from total service age for DKF 12-R |
| `dunstabzug_dkf16p_zweierpack_einsatznachweis` | Verify the documented two-piece DKF 16-P pack before counting a complete replacement |
| `dunstabzug_abgelesene_kennziffern_set_oder_filter` | Detect a Bosch listing that swaps the starter and replacement article identities |
| `dunstabzug_b_label_zwei_unterschiedliche_bezuege` | Disambiguate the hood energy, fan, lighting and grease classes |
| `dunstabzug_umluft_und_fensterprogramm_zuordnung` | Keep cooker-hood recirculation apart from independently documented outdoor airflow |
| `dunstabzug_geruchsprobe_kueche_nachbarraum_gemeinsame_basis` | Compare kitchen and adjacent-room odor observations under matched cooking conditions |
| `dunstabzug_licht_probe_kochfeld_ecken_unterschied` | Compare measured illumination at two hood work positions |
| `dunstabzug_filterzugriff_ansicht_nach_position` | Separate visible grease-filter access from confirmed odor-filter access |
| `dunstabzug_kohlefilter_beleg_alter_zwischen_belegen` | Bound active filter age when the original fitting date is uncertain |
| `dunstabzug_geruchsprobe_spitze_dauer_entscheidung` | Distinguish odor intensity from persistence in a matched kitchen trial |
| `dunstabzug_pflegeangebot_filterpaket_und_arbeitsumfang` | Identify scope gaps in a hood maintenance quote |
| `backofenauszug_modellbereich_und_betriebsart` | Check exact rail families and explicit use exclusions. |
| `backofenzubehoer_reinigungsart_exakter_beleg` | Evaluate the requested cleaning method from its actual scope. |
| `h2861bp_auszug_gitter_blech_packeinheit` | Audit the exact H 2861 BP receipt without counting one rail as one pair. |
| `miele_flexiclip_simultane_ebenen_paarbedarf` | Count how many complete single-pair boxes remain needed. |
| `bosch_hez638370_feste_ebenen_arbeitsfolge` | Locate requested positions outside HEZ638370’s fixed coverage. |
| `backofenauszug_paarbeleg_hinweis_auf_andere_ebene` | Verify that two observed rails actually document the same requested pair and position. |
| `backofenzubehoer_nachkauf_bestand_eigenes_exemplar` | Check whether claimed seller stock is tied to a complete identified unit. |
| `backofenauszug_tatsaechlich_sichtbare_blechtiefe` | Check real access beyond the label full extension. |
| `h2861bp_plus_hfc_tabellenspalte_und_ebenenbezug` | Check +HFC versus −HFC and keep rail and food positions distinct. |
| `backofenauszug_obere_untere_kalte_greifspur` | Compare the measured vertical access gap against a personal handling envelope. |
| `backofenzubehoer_entnahmebereich_vollstaendige_uebung` | Distinguish reaching a tray from completing the intended check. |
| `backofenauszug_zwei_kalte_blickhoehen_ohne_umbau` | Check alternative heights by uniquely visible required marks. |
| `miele_flexiclip_materialnummer_und_ean_widerspruch` | Detect conflicting material number and barcode evidence on the same accessory. |
| `backofenzubehoer_nur_ersetzen_wenn_funktion_fehlt` | Separate a genuine access gap from a feature already provided by existing equipment. |
| `backofenauszug_einzelansicht_belegt_ebene_oder_satz` | Separate verified rail positions from coverage implied by a photo caption. |
| `backofenauszug_kalte_paarstellung_bis_zum_anschlag` | Flag an observed left-right extension difference under equivalent measurement. |
| `flexiclip_ein_paar_zwei_kalte_zeitfenster` | Determine whether the logged tasks actually need simultaneous coverage. |
| `backofenauszug_auflageart_baugruppe_und_abmessungsbeleg` | Separate documented tray categories from fit of one particular item. |
| `tisken_50400307_zwei_wandfelder_oberflaeche` | Screen two locations against IKEA’s documented surface conditions. |
| `pulsify_artikel_strahlart_techniktabelle_drei_bar` | Read the exact DE technical row rather than a series headline. |
| `duschhalter_fugenfeld_kontaktschablone_messband` | Bound a contact patch against one measured tile joint. |
| `duschhalter_wandbelag_deckschicht_kontaktbeleg` | Track whether the visible face belongs to the documented substrate. |
| `duschhalter_feldwechsel_bestandsbeobachtung_abgrenzen` | Mark which parts of a prior contact observation do not carry over. |
| `handbrause_halter_sitz_kopf_und_griff_beobachten` | Keep nozzle seating evidence separate from an accessible grip. |
| `duschgriff_zwei_nutzende_gemeinsame_ablage` | Find a shared reachable position from two independent observations. |
| `duschhalter_greifen_zuruecklegen_bewegung_getrennt` | Keep retrieval and replacement observations distinct. |
| `duschbrause_schlauch_ruhezone_und_entnahmepfad` | Separate route obstructions in two observed use states. |
| `duschhalter_winkel_nutzerwunsch_vorhandene_stellungen` | Compare observed aiming positions without inferring a universal range. |
| `brause_werbeaussage_serienwert_technikwert_zuordnen` | Resolve showroom headline versus an exact technical row. |
| `brause_angebotszitat_strahlart_einzelwert_maximum` | Check mode-specific and product-maximum figures for a common basis. |
| `handbrause_angebot_verwechslung_kopfbrause_bauart` | Keep an overhead-shower listing out of a hand-shower shortlist. |
| `duschhalter_bohrfrei_befestigungsart_beleg` | Distinguish suction, adhesive and clamp claims before buying. |
| `duschset_halter_schon_vorhanden_angebotsumfang` | Spot a duplicate holder or a missing item in a confirmed shower bundle. |
| `duschhalter_kontaktumfang_skizze_und_produktmass` | Verify which outline the manufacturer’s drawing actually describes. |
| `duschhalter_ablage_position_lieblingshand_wechsel` | Compare left/right hand changes in observed retrieval routines. |
| `duschhalter_gebraucht_auflage_und_etikett_beleg` | Distinguish missing model evidence from a visibly different attachment. |
| `duschgriff_blickverdeckung_und_tatsaechliche_erreichbarkeit` | Keep view obstruction separate from an observed reach limitation. |
| `duschkabinentuer_brausenablage_einstieg_ausstieg` | Distinguish arrival and exit observations around the same shower screen. |
| `brause_drei_bar_beleg_druckzahl_und_bezug` | Separate the numeric pressure interval from the relevant documented pressure type. |
| `brause_strahlarten_anzeigename_zuordnungsbeleg` | Check which exact spray name belongs to the observed selector. |
| `duschhalter_wiederholte_handhabung_ausgelassene_faelle` | Quantify handling evidence without mistaking skipped attempts for successful use. |
| `daikin_mc80zvm_rollensatz_teilcode_abgrenzen` | Distinguish the exact Daikin caster kit code from the filter code. |
| `daikin_rollenangebot_satz_und_einzelangabe_abgleichen` | Reconcile box and individual quantities only when the offer proves distinct units. |
| `venta_6060_kompatibilitaetslisten_modellkonflikt` | Compare the conflicting official trolley lists for an exact Venta model. |
| `venta_rollwagen_6060_url_und_6060500_artikel` | Distinguish the visible trolley SKU from the family URL component. |
| `daikin_mc80zvm_griffrolle_zweck_und_fundstelle` | Route carrying and optional rolling to their own manufacturer documentation. |
| `daikin_laufrollensatz_anleitung_zur_wegfrage` | Locate a route-specific requirement in the actual caster instructions. |
| `venta_rollwagen_belagrichtung_marketing_und_eigenbefund` | Separate rubberized caster information and actual floor observations. |
| `rollwagen_fuellzustand_und_tatsache_fahrtbeleg` | Check the water-fill state in the actual observation and applicable documentation. |
| `geraeterollen_enveloppe_aus_gemeinsamen_seitenkanten` | Reconstruct the observed assembly width from body and base edges at one reference. |
| `daikin_mc80zvm_massangabe_geraet_oder_aufbau` | Keep published body dimensions separate from measured assembled dimensions. |
| `geraeterollen_schwenkbewegung_mitte_ausserhalb_endlagen` | Compare observed midpoint sweep with both recorded endpoints. |
| `rollwagen_belagwechsel_richtungsspezifischer_stopp` | Identify direction-specific pauses at the same already observed flooring transition. |
| `rollwagen_bodenabdruecke_vorbestand_lokalzuordnung` | Distinguish a pre-existing floor mark from a new observation at the parking location. |
| `laufrolle_abrollstrecke_pro_umlaeufe_sichtkontrolle` | Compare observed travel to the no-slip reference for counted wheel turns. |
| `rollwagen_feststellrolle_exakten_nachweis_kaufen` | Check whether a requested wheel-lock feature is documented for the exact variant. |
| `rollwagen_parkprobe_geraet_gegen_grundrahmen` | Compare apparent relative motion between a parked appliance and the base. |
| `rollwagen_bodenpflege_zusammenhang_abstellen_und_rueckkehr` | Check whether the original footprint remained available until recorded cleaning completion. |
| `geraetetransport_wegabschnitt_rollen_oder_griff_nachweis` | Match documented rolling and carrying evidence to separate route sections. |
| `elektrog_altgeraete_flaechenbasis_haendler` | Match a verified area to the proper shop or distance-selling threshold. |
| `elektrog_kleingeraete_dreifach_mass_anzahl` | Check the inclusive size threshold and the per-type small-device count together. |
| `elektrog_eins_zu_eins_geraeteart_kernfunktionen` | Check like-for-like scope without inferring functional equivalence from a common marketing category. |
| `elektrog_fernabsatz_kategorie_annahmeweg` | Distinguish home pickup from an appropriate reachable return route in distance selling. |
| `elektrog_geraetekategorie_bezeichner_anlage` | Identify listed household examples with the necessary category-specific size evidence. |
| `altgeraete_abholhinweis_vertragsmoment_beleg` | Audit which checkout disclosures were actually observed without turning them into a booking. |
| `altgeraete_marktplatz_verkaeufer_logistikkette` | Trace a pickup commitment to the seller or its verified carrier. |
| `altgeraete_termin_neulieferung_verschoben_mitnahme` | Preserve a pickup status when the new-device delivery date changes. |
| `altgeraete_kosten_beleg_getrennte_leistungen` | Separate the take-back line from paid delivery and optional ancillary work. |
| `altgeraete_abholvorgang_tatsaechliche_uebergabe` | Reconcile actual handover separately from delivery of the replacement. |
| `altgeraete_mitnahmewunsch_zur_zustelltour` | Track an old-appliance request through checkout confirmation to the carrier work order. |
| `altgeraete_neuannahme_abbruch_mitnahmebindung` | Check the pickup dependency when the replacement is not handed over. |
| `altgeraete_annahmeort_umzug_zwei_belegorte` | Compare documented pickup and replacement delivery places without collecting addresses. |
| `altgeraete_wechsel_nutzungsluecke_tatsaechlich` | Compute an observed service gap using the first usable replacement date rather than a delivery promise. |
| `altgeraete_annahmestelle_betreiber_nachweis` | Identify the documented return-point operator before treating locations as interchangeable. |
| `altgeraete_trotz_gleicher_tour_zuordnung_zwei_auftraege` | Ensure a shared delivery route does not merge unrelated pickup orders. |
| `altgeraete_zusteller_vertretung_fuer_alt_und_neu` | Keep replacement acceptance separate from the confirmed delegation of the old appliance. |
| `altgeraete_symbol_anlage_drei_weglese` | Tell a separate-collection mark from the marked route to a collection point. |
| `altgeraete_annahme_und_weiterverwendung_beleg` | Avoid inferring reuse or recycling from a handover receipt alone. |
| `altgeraete_abholversuch_grund_und_erneute_zusage` | Triage an unsuccessful pickup using the documented obstacle and latest reassignment. |
| `induktion_km7464f_de_kochboden_zonenauswahl` | Find documented zone envelopes for a cookware base |
| `induktion_zwei_gefaesse_exklusive_zonen_belegung` | Solve a simultaneous two-vessel zone assignment |
| `induktion_anzeige_u_beobachtungszweige` | Triage recorded induction cookware recognition evidence |
| `induktion_erkennung_wechselseitige_probe_zuordnung` | Interpret a paired cookware–zone recognition swap |
| `induktion_powerflex_aktivierte_rechte_zonen_beleg` | Confirm whether observed right-side zones were actually linked |
| `induktion_km7464f_modus_wattangabe_zonenbezug` | Match a quoted watt figure to an exact zone and mode |
| `induktion_zonenpaar_leistungsabgabe_signalfolge` | Check observed power-sharing changes against the manual zone pair |
| `induktion_booster_laufzeit_und_beobachtete_phase` | Distinguish an observed booster interval from subsequent operation |
| `induktion_timer_akustisch_gegen_konkret_abgeschaltet` | Separate an audible timer event from zone shutoff |
| `induktion_gefaessgriffe_kalte_aussenkontur_probe` | Evaluate the observed cold side-by-side footprint including handles |
| `induktion_waermeverlauf_gefaess_als_versuchsfaktor` | Compare observed repeat timings while changing only the vessel |
| `induktion_magnet_am_boden_hersteller_widerspruch` | Reconcile a cold base magnet observation and the exact cookware specification |
| `induktion_stop_go_laufende_timer_pausenannahme` | Compare a recorded Stop&Go interval to the running timer |
| `induktion_topferkennung_auswahl_und_stufe_getrennt` | Distinguish automatic cookware selection from a recorded assigned setting |
| `induktion_ankochautomatik_fortkochstufe_zeitbeleg` | Read Auto Heat-up duration against its exact continuation setting |
| `induktion_abschaltzeiten_kurzeste_restzeit_anzeigequelle` | Interpret the shared countdown when two shutdown timers run |
| `induktion_vorfuehrgeraet_demomodus_heizbeleg` | Check second-hand or showroom heating evidence against demo mode |
| `induktion_gefaessbestandsluecke_nutzungsbelege_priorisieren` | Prioritize a missing proof before replacing cookware |
| `miele_h7460_bp_betriebswert_genaues_datenblatt` | Read the correct power and transition fields for material number 11105690. |
| `oekodesign_standby_anwendungsbereich_kueche` | Identify which rule family a confirmed kitchen appliance belongs to. |
| `oekodesign_standby_leistungsreferenz_stichtag` | Select the documentary Annex III power reference for a verified in-scope record. |
| `oekodesign_standby_energiesparzeit_geraetefall` | Select the general or coffee-machine transition reference after documenting its stated conditions. |
| `betriebszustand_funktion_led_uhr_netzausloeser` | Classify documented function evidence rather than guessing standby from wattage or a light. |
| `betriebszustand_uhr_passive_anzeige_getrennt` | Separate independent analogue movement or retained display from a mains-powered clock function. |
| `betriebszustand_nachlauf_vor_messbeginn` | Exclude transitional minutes when a quiet-state sample began too early. |
| `betriebszustand_messwert_zwei_herstellerzeilen_trennen` | Check whether a reading has enough resolution to distinguish any of two documented reference values. |
| `betriebszustand_netzwerkstatus_kehrtwende_nachweis` | Audit evidence for a remote wake without directing anyone to send a trigger. |
| `betriebszustand_netzfunktion_mehraufwand_je_nutzen` | Relate measured extra energy to successful network-only events rather than uptime alone. |
| `oekodesign_hina_klasse_aus_hauptfunktion` | Read the documentary HiNA class without promoting ordinary Wi-Fi equipment to high availability. |
| `betriebszustand_automatikfeld_beobachtung_zeitband` | Assess whether an independently matched transition interval contains the stated delay. |
| `betriebszustand_zeitbezug_letzte_relevante_nutzung` | Derive the observed measurement baseline after all recorded activity gates have cleared. |
| `betriebszustand_netzports_dokumentwert_pruefbestand` | Check whether a saved port-state inventory can be compared with the declared all-ports reference. |
| `betriebszustand_rundungsdifferenz_datenblatt_quellen` | Reconcile a detailed manufacturer value with a separately reported one-decimal figure. |
| `betriebszustand_netzteil_grenze_wirkleistung` | Reconcile documented metering sides without treating output power as wall power. |
| `betriebszustand_stichprobe_display_status_muster` | Expose when one display symbol groups multiple actual operating states. |
| `betriebszustand_netzereignis_mehrverbrauch_anteilsbeleg` | Attribute matched low-state energy differences before assigning them to baseline demand. |
| `betriebszustand_funktionsbedarf_watt_rang_sperre` | Compare candidate state values only among confirmed adequate modes. |
| `betriebszustand_dokument_marktschnitt_setting_abweichung` | Compare actual saved timer settings across a verified revision without prescribing updates. |
| `betriebszustand_log_abschnittsanteil_keine_stichprobenquote` | Identify a count-versus-duration ranking reversal under unequal sample density. |
| `miele_g7673_spuelanzeige_phase_eco_feedback` | Identify forecast bars, completed-run actuals, totals or remaining time. |
| `spuelgang_ende_marker_und_autoopen_beobachtung` | Distinguish a program completion marker from a door event. |
| `miele_quickpowerwash_autoopen_zehnminuten_geltungsfall` | Restrict the ten-minute support note to its documented branch. |
| `miele_g7673_einzellauf_anzeige_nach_ausschalten` | Preserve previously recorded values without reconstructing a cleared display. |
| `spuelanzeige_zwei_personen_strom_wasser_zuordnung` | Join partial findings from two people without fabricating an absent value. |
| `spuelprogramm_anzeige_istvergleich_extras_und_beladung` | Keep same-program displayed actuals comparable. |
| `spuelprognose_balken_symbol_zwei_notizen_register` | Audit the labels on qualitative forecast notes. |
| `spuelprognose_auswahlwechsel_balkenfoto_zeitzuordnung` | Determine which selection the saved view could belong to. |
| `miele_g7673_optische_endanzeige_dunkel_geschlossen` | Interpret the documented closing-side lamp evidence with its conditions. |
| `spuelstatus_unterbrechung_fortsetzung_neustart_abgrenzen` | Keep resumed operation distinct from a newly identified run. |
| `spuelstatus_restzeit_und_echte_enduhrzeit_abgleich` | Compare a displayed expectation with a separately observed completion event. |
| `miele_g7673_automatisch_aus_dokumentierter_bezug` | Scope the ten-minute automatic-off behavior without asserting that it happened. |
| `miele_g7673_ende_trocknungsgeblaese_beobachtungsgrenze` | Separate the end marker from the post-run fan observation. |
| `spuelanzeige_externer_zaehler_gleicher_messumfang` | Check whether an external meter and the display cover the same cycle. |
| `spuelgesamtanzeige_intervall_geraetewechsel_beleg` | Avoid subtracting lifetime displays across replacement units. |
| `spuelstatus_gesamtzaehler_programmmenge_laufnotizen` | Reconcile a documented run count against individual records. |
| `spuelbeleg_doppelnotiz_gleiche_zahlen_laufidentitaet` | Preserve run identity rather than deduplicating by numeric equality. |
| `spuelbeleg_fotoaufnahme_weitergabe_ausschalten` | Keep capture time distinct from message forwarding. |
| `miele_g7673_einstellungen_wlan_ruecksetzbelege` | Determine retained evidence without initiating any reset. |
| `spuelbeleg_umzug_geraetevermerk_von_raumlabel_trennen` | Keep moved-appliance evidence attached to the right physical unit. |
| `spuelinformationsmenue_auslesefelder_geraetevermerk` | Select the proper information field for the intended reference. |
| `miele_g7673_programmdauer_erste_auswahl_kaltwasserbasis` | Separate the first cold-water average from a running countdown. |
| `spuelstatus_ende_um_timer_ende_zeittext_unterscheiden` | Identify whether a time label is a schedule, estimate or observed end. |
| `spuelbeleg_verbrauch_dialog_und_zahlenablesung` | Check whether a captured prompt carries any actual consumption measurement. |
| `philips_airfryer_ungeteiltes_stueck_nennvolumen` | Check an indivisible volume against the stated vessel scope. |
| `philips_hd9875_90_gewichtsaussage_lebensmittelbezug` | Keep the documented frozen-fries mass claim tied to its stated example. |
| `philips_na35x_backform_rahmenmasse_korbwahl` | Match an actual measured rectangular dish to the selected family basket. |
| `philips_hd9945_korb_und_originalteil_beleg` | Check the actual HD9945 kit and its specified basket. |
| `philips_hd9945_originalteile_und_fremdteile_pflege` | Keep the documented dishwasher claim attached to identified kit components. |
| `philips_na352_sync_anzeige_und_eigene_endbeobachtung` | Compare synchronized display ends with documented task observations. |
| `philips_na352_copy_status_gegen_sync_verwechseln` | Separate identical programmed settings from the scheduling function. |
| `philips_na35x_max_marke_korb_beobachtung` | Compare the observed fill height with the same basket’s actual MAX mark. |
| `philips_backform_erst_seitenfreiraum_belegen` | Verify that an apparent fit leaves observable space on all four sides. |
| `philips_na35x_rundform_durchmesser_quellenluecke` | Keep a usable height reference when the round-dish size needs separate verification. |
| `philips_hd9945_foermchenbedarf_kalt_gepruefte_stellplaetze` | Plan a cold mock-up using observed cup positions, not nominal package count. |
| `philips_na352_sync_spaetere_anzeigen_weitergabe` | Preserve separate evidence when only one programmed end time changed. |
| `philips_dualkorb_ungeteilte_form_kaltes_musterstueck` | Preserve shape evidence for a one-piece footprint without adding basket areas. |
| `philips_na352_programmende_signal_ausgabe_unbekannt` | Resolve ambiguous end evidence instead of inferring the other basket’s state. |
| `philips_backset_gebrauchsspuren_originalform_vergleichen` | Check whether observed rim changes invalidate an older exterior measurement. |
| `philips_na352_sync_versetzter_beginn_beobachtung` | Separate observed start offset from the claim of a synchronized finish. |
| `philips_na352_kit_einsatzzweck_statt_shoptitel` | Distinguish HD9945/01 bakeware and HD9920/00 rack-and-skewer evidence. |
| `bosch_sks62e32eu_eco50_quellenwerte_rundung` | Read the exact model’s Eco 50 per-cycle figures and its rounded 100-cycle label. |
| `bosch_sks62e32eu_programm_oder_zusatzfunktion` | Classify a named mode as the Eco test program, another program or an option. |
| `bosch_sks62e32eu_geraeuschklasse_und_energieklasse` | Keep the noise class, energy class and sound-power declaration distinct. |
| `kompaktspuel_nennkapazitaet_und_kochgeschirr_bezug` | Distinguish standard place-setting capacity from a recorded household load. |
| `kompaktspuel_ladeprobe_passt_und_spruehraum_getrennt` | Separate loading, closure and documented spray clearance. |
| `kompaktspuel_pflichtgeschirr_bereitstellung_zwei_ausgaben` | Find required groups left open after dishwasher and separately recorded completion. |
| `kompaktspuel_vergleich_teilladung_gleichzahl_andere_gruppen` | Check required-group matching even when the two load counts are equal. |
| `kompaktspuel_bestandsgeraet_kauf_bis_eigenbeleg` | Decide whether to keep the existing setup or pursue verification for a compact replacement. |
| `bosch_sks62e32eu_korbmerkmal_oder_sonderzubehoer` | Distinguish a documented basket feature from separately listed special accessories. |
| `kompaktspuel_drei_pflichtgruppen_kleinster_belegter_teilplan` | Find the smallest known split from three required dish groups and verified loading combinations. |
| `kompaktspuel_nutzungstage_alltag_und_sonderladung` | Measure coverage of actual routine and occasional loads without counting unexamined days. |
| `kompaktspuel_nicht_eingelegte_teile_auswahlgrund` | Distinguish excluded items from observed fit issues and untested items. |
| `kompaktspuel_als_zweitgeraet_altgang_tatsaechlich_entfallen` | Check whether using a compact second unit actually displaced an existing run. |
| `kompaktspuel_gemessener_wasseranteil_separater_pflichtteile` | Attribute measured water to required items omitted from the compact load. |
| `kompaktspuel_trockenziel_kunststoff_und_sonstige_teilsets` | Record which required dish group still needed drying work after a documented Extra Dry run. |
| `kompaktspuel_kaufentscheidung_pilot_mit_abbruchgrenze` | Preserve the observed loading limit of an intentionally stopped trial. |
| `kompaktspuel_stromvergleich_teilaufgabe_untergrenze` | Test whether the measured compact subset already uses the energy of the full existing workload. |
| `leitungswasser_filterkanne_bedarf_oder_abklaerung` | Identify whether a jug purchase is optional or source clarification comes first. |
| `brita_maxtra_pro_kartuschenvariante_haertedaten_lesen` | Match manufacturer positioning without inferring reduction. |
| `brita_maxtra_pro_wechsel_kalender_und_mengenbeleg` | Check which published replacement trigger is documented. |
| `brita_aktivierung_trichterfuellung_nicht_liter` | Reconcile the different first-use evidence units. |
| `brita_kartusche_namenswechsel_altbestand_abgleichen` | Identify an officially listed predecessor without copying its capacity claim. |
| `brita_flow_perfectfit_merkmal_ausnahme` | Check whether the exact jug uses the documented PerfectFit mechanism. |
| `brita_deckelanzeige_zeit_oder_zeit_und_menge` | Compare a time reminder against time-plus-volume indication. |
| `brita_filterkanne_teil_und_spuelprogramm_beleg` | Compare dishwasher and hand-care evidence for the actual component. |
| `brita_smart_light_blinken_nach_reset_oder_status` | Interpret the recorded LED in its event context. |
| `brita_anzeigedeckel_getauscht_nutzungszaehler_zuordnung` | Keep paired indicator history separate from vessel identity. |
| `brita_filterkanne_laengere_pause_zustand_protokoll` | Check the observed break state with the manual’s pause instructions. |
| `brita_filterwasser_nachgiessen_erste_menge_zeitbezug` | Track the oldest remaining batch instead of treating a top-up as a fresh start. |
| `brita_flow_style_gesamtvolumen_vorrat_trennen` | Flag purchases based on gross rather than filtered capacity. |
| `brita_maxtra_pro_tropfenquelle_vor_wirkungsannahme` | Triage missing flow documentation before attributing a filter defect. |
| `brita_maxtra_pro_karton_folie_feuchtebeobachtung` | Route observations about a new cartridge without judging suitability. |
| `brita_microdisc_haertezweck_vs_maxtra_kanne` | Match an existing filter to its documented purpose. |
| `brita_maxtra_kanne_eingangswasser_quellenrahmen` | Check documented feed-water scope without evaluating quality. |
| `brita_kanne_nach_amtlicher_aufhebung_belegtrennung` | Record upkeep after a verified lifting of an official notice. |
| `brita_flow_fester_standort_nachfuellen_und_zapfen` | Identify access limits when the station body fits. |
| `brita_maxtra_pro_rueckgabe_uebergabe_quittung` | Track confirmed recycling handoff without inventing acceptance. |
| `brita_kannenprotokoll_trichter_oben_vorrat_unten` | Distinguish pending top-chamber volume from filtered reserve. |
| `brita_maxtra_mengenjournal_mit_zwischenstand_wechsel` | Keep the same cartridge total through a jug move and stop at the next cartridge. |
| `waschzeichen_grad_balken_ablesen` | Read wash temperature and mechanical treatment from one symbol. |
| `waschzeichen_handwaesche_umgebung_oder_40` | Distinguish both hand-wash symbols and no household washing. |
| `bleichzeichen_dreieck_markierung_ablesen` | Decode all bleaching, oxygen-only bleaching or no bleaching. |
| `trocknerzeichen_kreis_im_quadrat_punkte` | Decode normal, mild or prohibited drum drying. |
| `naturtrocknen_quadrat_striche_schatten` | Decode flat or line drying, dripping wet and shade. |
| `buegelzeichen_punkte_dampf_normausgabe` | Read ironing heat and steam markings with edition-aware ceilings. |
| `fachpflegezeichen_kreis_p_f_w_unterscheiden` | Identify dry and wet professional care from the garment circle. |
| `fachpflege_balken_mit_betriebsangebot_abgleichen` | Check that a quote names the same professional process and respects its mildness. |
| `pflegeetikett_naturweg_bei_trocknerverbot` | Confirm a separate air-drying instruction when drum drying is prohibited. |
| `pflegeetikett_foto_zeichenrand_und_balken` | Distinguish readable centers from cropped treatment bars. |
| `pflegeetikett_fuenf_symbolgruppen_reihenfolge` | Check completeness and order of a five-position care row. |
| `pflegeetikett_shoptext_widerspruch_am_stueck` | Determine what can be established when a seller contradicts a sewn-in garment tag. |
| `pflegeetikett_zwei_eingenaehte_gesamtangaben_widerspruch` | Isolate a genuine whole-garment conflict. |
| `pflegeetikett_schriftzusatz_und_symbol_bedingungen` | Keep a written garment preparation instruction separate from the symbol limit. |
| `textilfaserangabe_und_pflegekennzeichnung_trennen` | Track the separate evidence for fibre composition and garment care. |
| `pflegeetikett_import_legende_des_konkreten_zeichens` | Choose the proper care legend without inferring the system from a country. |
| `pflegeetikett_shop_farb_und_artikelvariante_vor_kauf` | Qualify care evidence for a specific shopping variant. |
| `bleichzeichen_gegen_waschmittel_herstellerdeklaration` | Check the declared bleaching class against a garment restriction. |
| `pflegeetikett_clevercare_logo_und_symbolreihe_trennen` | Separate informational care tips from the garment limits. |
| `pflegeetikett_fehlendes_eingenaehtes_etikett_suchweg` | Find a care authority when a garment appears to have no sewn-in label. |
| `tuerzugluft_raumtuer_wohnungseingang_naechster_schritt` | Triage drafts at a room or apartment entrance door by its protection role and planned airflow before any change. |
| `tuer_schutzkennzeichnung_bauunterlage_belegstatus` | Distinguish records for the exact door assembly from clues such as a closer or an unreadable label. |
| `schutztuer_fachliche_anfrage_systembezug_unterlagen` | Identify missing details for a professional enquiry about the exact fire or smoke door assembly. |
| `tuerschliesser_normale_endstellung_ereignisbeleg` | Record the visible final position of a self-closing door during normal use. |
| `tuerbodenspalt_geplanter_ueberstroemweg_abluftzuordnung` | Read the documented transfer-air path for mechanical exhaust in a bathroom, kitchen, or WC. |
| `tuerzugluft_abluft_an_aus_beobachtung` | Compare observed drafts during normal exhaust-on and exhaust-off periods with comparable door and window conditions. |
| `tesa_tuerbodenprofil_belag_groesster_spalt` | Compare the largest of three measured door-bottom gaps and the flooring with the German tesa profile specification. |
| `tesa_tuerbodendichtung_montage_rueckstandsfrei` | Read the German tesa specification for attachment and residue-free removal of the named door-bottom seal. |
| `tuerbodendichtung_innenbeleg_ausseneinsatz_uebertragen` | Check whether separate evidence covers using an indoor door-bottom seal on an apartment entrance or exposed door. |
| `tuerbodendoppeldichtung_05418_zwei_bodenseiten_abgleich` | Compare the flooring on both sides of an ordinary room door with the smooth-floor scope of the German tesa 05418 double seal. |
| `tuerbodenspalt_schwellenoberkante_bezug` | Derive the door-bottom gap from door and threshold heights measured at the same point and reference level. |
| `tuer_bodenberuehrung_bewegungsphase_ort` | Record where already observed contact occurred while opening or closing an ordinary door. |
| `tuer_bestehender_kontakt_aenderung_zeitpunkt` | Classify whether previously recorded floor contact predated an authorised change to an ordinary room door. |
| `tuergriff_kraft_wirksamer_hebel_moment` | Convert a documented opening force and its effective perpendicular lever arm to opening torque. |
| `tuer_selbstschliessen_persoenlicher_durchgang_zeitbezug` | Compare a person's documented passage time with the observed time available at the same self-closing doorway. |
| `tuerzugang_griff_manoevrieren_passage_getrennt` | Record handle reach, manoeuvring and passage separately for an already observed door use. |
| `tuerzugluft_unterkante_und_falz_getrennte_stellen` | Record repeated drafts at the bottom edge, around the frame, or in both places on a closed door. |
| `tuerbodenprodukt_spalthoehe_vs_buerstenlaenge_beleg` | Distinguish the manufacturer's maximum gap height for a tesa product from brush length, door width and seller wording. |
| `tuer_zugluftstopper_lose_durchgangsbeobachtung` | Record whether a loose draught stopper stays outside the passage, moves into it or obstructs observed use. |
| `rauchschutztuer_offenstellung_system_nachweis_zuordnung` | Distinguish documented system-specific hold-open equipment from a loose object or an unresolved condition on a protective door. |
| `tuerzugluft_wiederholung_nutzung_kaufpruefung` | Check whether repeated drafts at a normally closed door cause a documented everyday problem before considering a purchase. |
| `roboter_ersatzfilter_exakte_de_zuordnung` | Check the exact German compatibility listing for a robot replacement part |
| `saros10r_zubehoerset_bedarf_nach_teilrollen` | Match a confirmed Saros 10R kit against separate missing part roles |
| `dreame_station_orange_weiss_signalzustand` | Interpret a status light using the exact listed Dreame dock manual |
| `roboter_aufladung_fenster_mit_start_und_ende` | Check completed charging evidence against the documented low-to-full reference |
| `roomba_aufladefehler21_aufnahme_und_ladeverlust` | Compare a recorded on-dock charge loss with iRobot code 21 |
| `roboter_stationskontakt_und_sensor_pflegemethode` | Separate documented care media for contacts and sensor windows |
| `dreame_d10_absaugung_nicht_stoeren_verlauf` | Check whether recorded D10 auto-empty suppression matches the applicable DND state |
| `roboter_zwischenladen_rueckkehrart_fortsetzung` | Explain why a documented cleaning run did not resume after docking |
| `dreame_l10s_wasserstand_waschplatte_sichtbelege` | Isolate documented abnormal washboard drainage observations |
| `dreame_l10s_resttropfen_tank_gegen_wiederkehrende_naesse` | Distinguish a documented tank-seat residual from recurring external wetness |
| `dreame_l10s_andocken_rampenbeobachtung_ort` | Localize an observed docking failure without repeating an unsafe attempt |
| `saros10r_waschdock_laufstart_und_stationswechsel` | Audit documented conditions for a Saros 10R automatic wash return |
| `saros10r_trocknung_luftauslass_und_modus` | Check recorded Saros drying mode and outlet condition separately |
| `saros10r_reinigungsfluessigkeit_kartusche_rolle` | Distinguish a supported Saros solution cartridge from the water tank |
| `roomba_combo_j5_behaelterrolle_selbstentleerung` | Account for the documented bin-dependent self-empty function |
| `roomba_absaugdock_app_taste_und_manueller_erfolg` | Distinguish the documented communication path when local evacuation works |
| `roomba_absaugdock_rotes_blinken_und_neuversuche` | Interpret recorded AutoEmpty blockage signals without disassembly |
| `roomba_combo10max_absaugstart_kurze_wartebeobachtung` | Check observation coverage for the Combo 10 Max auto-empty delay |
| `roboter_filter_waschhinweis_nach_exakter_rolle` | Compare explicit washing instructions for a documented robot dust filter |
| `roomba_j_volle_behaeltermeldung_nach_evakuierung` | Correlate Roomba error 36 with the observed result of the same evacuation |
| `roomba_comboj9_stationstaste_sicherung_nachweis` | Check recorded dock-button lock evidence before diagnosing an unresponsive dock |
| `roboter_stillstand_letzte_dokumentierte_ladung` | Check complete months since a documented storage charge |
| `dreame_station_tank_oder_absaugfunktion_erwartung` | Verify whether the actual dock offers the expected water function |
| `saros10r_pausenzeit_und_schlafzustand` | Interpret the Saros pause timeline independently of the charger |
| `kuehlschrank_klimaklasse_sn_n_st_t_typenschild` | Decode refrigerator climate classes and retain uncertainty for a paired badge |
| `kuehlkombi_kgn39vxct_winterschaltung_belegt` | Verify the named fridge-freezer winter-setting claim against its German EU sheet |
| `kuehlgefrier_kombi_kuehlvolumen_gefrierliter_mindestbedarf` | Screen two distinct fridge-freezer volume requirements at once |
| `kuehlschrank_drei_vier_sterne_einfrieren_fachtyp` | Interpret a documented freezer compartment type before buying |
| `kuehlschrank_zwei_sterne_abteil_eingebettet_volumen` | Reconcile compartment volume without double-counting a two-star subsection |
| `kuehlgeraet_verstellbarer_raumteiler_label_pruefstellung` | Locate the test state of an adjustable-volume refrigerator divider |
| `kuehlkombi_wechselzone_zugleich_kuehl_gefrierbedarf` | Test mutual exclusivity of a convertible cooling zone at the buying stage |
| `kuehlschrank_luftschallemissionsklasse_db_schwellen` | Read the noise class and special low-noise definition from the correct sound-power value |
| `kuehlkombi_kgn39vxct_led_effizienzklasse_geraet` | Separate appliance and light-source efficiency ratings in an exact fiche |
| `kuehlschrank_altes_a_plus_label_neues_eu_label_vergleich` | Check label generations without cross-walking old and new efficiency letters |
| `kuehlschrank_effizienzklasse_gegen_absolute_jahres_kwh_rangfolge` | Identify a fridge efficiency-class versus annual-energy ranking inversion |
| `kuehlschrank_eulabel_prueftemperatur_16_32_haushaltsprognose` | Identify label test conditions without inferring annual energy at a household temperature |
| `kuehlschrank_eulabel_fachliter_erst_summieren_dann_runden` | Reconcile two compartment values with the rounded EU label total |
| `kuehlkombi_kgn39vxct_vitafresh_kaltlagerfach_eulabel` | Distinguish a marketed refrigerator drawer from a declared regulatory compartment |
| `kuehlkombi_kgn39vxct_kuehlkreislauf_getrennt_strom` | Interpret what the two documented cooling circuits actually establish |
| `kuehlkombi_geraetetausch_uebergangsfenster_kuehl_gefrier` | Flag independent cold-storage coverage gaps through replacement |
| `kuehlschrank_wechsel_geraetepaar_labelvergleich_bestand` | Reconcile a one-versus-two cabinet replacement energy scenario |
| `kuehlkombi_freistehend_perfect_fit_nische_einbauart` | Separate a freestanding model niche claim from built-in installation evidence |
| `kuehlschrank_kaltes_fach_grosse_schale_ablagebelegung` | Check simultaneous tray and shelf use in one witnessed refrigerator layout |
| `kuehlschrank_kellerfach_kaltlagerfach_zieltemperatur_datenblatt` | Distinguish cellar, chill and fresh-food compartment test targets |
| `led_ersatzfassung_schnittstelle_geraetehuelle` | Screen a household replacement against the existing fixture specifications. |
| `led_leuchte_austauschpiktogramm_lichtquelle_betriebsgeraet` | Separate the declared user or professional replacement routes for both parts. |
| `led_eu_label_lichtquelle_umgebendes_produkt` | Classify the label scope before comparing packaged offers. |
| `led_eprel_qr_modellbeleg_verpackung` | Check the EPREL destination and model identity, not the mere presence of a QR code. |
| `ledvance_par16_4099854059810_zwei_modellkennungen` | Disambiguate the two variants published for one exact retail GTIN. |
| `led_halbwertswinkel_nutzlichtstrom_messkegel_90_120_360` | Interpret the 90°, 120° and 360° flux reporting scopes without confusing them with beam width. |
| `led_lumen_candela_lux_bezugsraum_vergleichen` | Preserve photometric quantity and scope rather than converting one number blindly. |
| `led_spot_halbwertskreis_geometrie_arbeitsflaeche` | Estimate the idealized beam footprint rather than inferring desk lux. |
| `led_energielabel_1000_stunden_aufgerundet_pon` | Check rounding coherence rather than reading the label as exact watts or annual energy. |
| `led_kelvin_farben_wiedergeben_getrennte_kaufziele` | Keep correlated colour temperature and Ra as separate buying criteria. |
| `ledvance_par16_ac45730_merten_meg5137_dimmertest` | Retrieve the historical AC45730 × MEG5137-0000 result for one or four lamps only. |
| `led_dimmen_minimum_start_schon_leuchtend` | Distinguish low-level restart from dimming an already operating lamp. |
| `led_flimmermass_pstlm_svm_dimmlage_beleg` | Keep distinct temporal-light metrics tied to their declared operating state. |
| `led_lebensdauer_l70b50_garantie_unterscheiden` | Identify what a lifespan claim can support before relying on it for one lamp. |
| `led_ersatz_geschlossenes_gehaeuse_umgebung_beleg` | Check the specific enclosure condition instead of generalizing an indoor-use claim. |
| `led_arbeitsflaeche_drei_luxpunkte_gegen_basis` | Check a matched centre-and-edge lux comparison before treating a spot as an even task light. |
| `delonghi_dlsc002_filter_variante_aussehen_ersatzkauf` | Check a documented De’Longhi filter design difference before buying another filter. |
| `kaffeevollautomat_wasserfilter_lieferumfang_start_ohne_nachkauf` | Distinguish catalogued, optional and delivered water filters before an initial purchase. |
| `kaffeevollautomat_intenza_aquaclean_filterfamilie_modellpruefung` | Match the candidate coffee filter family to the exact German model. |
| `delonghi_magnifica_filter_stillstand_drei_wochen` | Check the separate installed-filter limits for idle and ordinary use. |
| `philips_aquaclean_orange_blinkt_blau_filteranzeige` | Interpret a Philips AquaClean indicator using the observed appliance history. |
| `philips_gebrauchtkaffee_aquaclean_filterlos_oder_einstieg` | Resolve a used Philips filter purchase against the documented activation prerequisites. |
| `philips_aquaclean_durchfluss_kaffeetassen_wechselintervall` | Check independently documented time and throughput for an AquaClean filter change. |
| `delonghi_magnifica_entkalkungslampe_rot_blinkt_dauerlicht` | Distinguish due and active descaling by the verified De’Longhi indicator. |
| `kaffeevollautomat_filter_im_tank_vor_entkalkungsprogramm` | Check the verified filter prerequisite before descaling begins. |
| `kaffeevollautomat_reinigungstablette_entkalker_artikel_aufgabe` | Check whether the named consumable matches the planned maintenance task. |
| `kaffeevollautomat_bruehgruppe_reinigungsroutine_modellwechsel` | Compare brew-group care cadence after switching an exact model. |
| `kaffeevollautomat_milchsystem_lattego_dampf_oder_tasse` | Match a real milk workflow to the household requirement. |
| `kaffeevollautomat_automatikspuelung_milchsystem_pflegebeleg` | Distinguish a machine rinse from documented cleaning of removable milk components. |
| `bosch_tie20301_latte_macchiato_glas_hoehe_einsetzen` | Check the model’s documented glass height and an observed straight insertion. |
| `kaffeevollautomat_doppeltasse_zwei_kaffees_zwei_milchgetraenke` | Verify whether a double-cup mode covers coffee or two milk drinks. |
| `philips_kaffeesatzbehaelter_leer_anzeige_bleibt_zaehler` | Separate a stale grounds-counter signal from the observed contents. |
| `philips_milch_kaffee_getraenkemenge_groesste_stufe_speichern` | Check which volume setting can be saved for a specific beverage. |
| `philips_vorgemahlener_entkoffeinierter_kaffee_einzeltasse` | Check a decaf pre-ground serving without substituting the bean hopper. |
| `philips_wasserhaerte_teststreifen_rote_quadrate_aromamenue` | Validate a water-hardness setting separately from beverage aroma strength. |
| `philips_abtropfschale_wasser_spuelwasser_oder_aussen` | Scope an observed water location to a documented rinse, without diagnosing a leak. |
| `delonghi_magnifica_kaffee_pause_wiedergebrauch_spuelen` | Read the rinse guidance for resuming use after a documented idle period. |
| `philips_signaltoene_bedienfeld_ein_aus_start_ausnahme` | Check whether the available panel mute covers a specific sound requirement. |
| `waschmittel_dosiertabelle_wasserhaerte_intervall` | Identify every hardness column supported by a recorded local interval. |
| `waschmittel_packung_alter_dosierplan_abgleich` | Reconcile a saved detergent dose with the package currently in use. |
| `bosch_wgb244a40_idos_45kg_basis_oder_istmenge` | Distinguish the Bosch base setting from an actual cycle dose. |
| `bosch_wgb244a40_idos_pulver_manuell_kollision` | Detect duplicate main-detergent paths before starting. |
| `bosch_wgb244a40_idos_behaelter2_rolle_ruecksetzung` | Verify the base setting after changing the tank role. |
| `bosch_wgb244a40_idos_zwei_fluessigmittel_tankwahl` | Determine which of two configured detergent tanks is selected. |
| `waschmaschine_vorwaesche_bosch_miele_dosierweg` | Check the documented main detergent route when prewash is selected. |
| `bosch_wgb244a40_idos_schalter_bleibt_gespeichert` | Identify which prior operator changes persist. |
| `bosch_wgb244a40_sportswear_weichspueler_auswahl` | Check the exact sport-cycle constraints without inferring dose from a full tank. |
| `miele_wwr880_cap_oder_pod_richtiger_eingabeweg` | Identify the documented input path for a laundry pod or a Miele cap. |
| `miele_wwr880_caps_anzahl_und_vorwaeschefunktion` | Check that cap count and purpose fit one wash programme. |
| `miele_wwr880_twindos_ultraphase_gegenfach_reset` | Review the opposite compartment after replacing the matched product pair. |
| `miele_wwr880_twindos_verschmutzung_und_spuelmenge` | Identify the two process inputs affected by the selectable soil level. |
| `miele_wwr880_twindos_neue_kartusche_anzeige_zaehler` | Separate the counter reset from the physical cartridge volume. |
| `waschmaschine_idos_twindos_nachfuellanzeige_lesen` | Separate status signals from exact remaining volume and wash outcome. |
| `miele_wwr880_hauptwasch_cap_twindos_anzeige` | Check the documented display exception when a main-wash cap disables TwinDos dosing. |
| `bosch_wgb244a40_idos_nachfuellen_gleiches_mittel` | Identify when a product change needs the documented detergent drawer preparation. |
| `miele_wwr880_singlewash_halbladung_dosiergrenze` | Compute the documented small-load reference from the package half-load dose. |
| `miele_wwr880_ultraphase_original_h1_h2_werkstabelle` | Read separate original UltraPhase setup references without inferring real consumption. |
| `miele_wwr880_programm_waschmittelklasse_fussnote` | Decode the detergent types and physical forms recommended for named programmes. |
| `miele_wwr880_wasser_plus_und_zusatzspuelgang` | Distinguish higher level from a selected extra rinse. |
| `miele_wwr880_cap_restwasser_nach_programmende` | Distinguish the described residual water from proof that the whole cap dose was delivered. |
| `miele_wwr880_baumwolle_vorwaeschzeit_stufen` | Read the timed cotton prewash phase without treating it as total cycle duration. |
| `spueler_haertebereich_versorger_geraetestufe` | Check if household inlet evidence is suitable for a device-specific hardness table. |
| `bosch_spueler_haertetabelle_eingabeeinheit_grenze` | Look up the exact Bosch hardness setting without interpolating across printed rows. |
| `miele_g7673_schwankende_wasserhaerte_oberwert` | Read what the exact Miele manual calls for with a verified inlet range. |
| `spueler_multitab_salzgrenze_packung_geraet` | Intersect verified detergent and device limits before considering that use case. |
| `spueler_salzprodukt_etikett_geraetemodell` | Check catalog or package wording for the specified model. |
| `spueler_salzbehaelter_erstbefuellung_nachfuellen` | Separate the documented first-fill water instruction from the refill case. |
| `spueler_salz_klarspueler_reiniger_fachbeleg` | Identify the correct compartment on documented appliances without handling a mix-up. |
| `miele_g7673_solo_nach_multitab_mangelanzeige` | Identify the missing refill evidence when changing from a multi-function cleaner to solo detergent. |
| `spueler_klarspueler_schlieren_flecken_beobachten` | Scope the manual’s rinse-aid adjustment clues to observed results. |
| `spueler_reinigerdosis_fachmarke_fuellmaximum` | Distinguish package dose, chamber capacity and the fallback exact-model guidance. |
| `miele_g7673_powerdisk_auto_oder_manuell` | Resolve the active detergent path before adding anything. |
| `spueler_tabrest_kurzprogramm_oder_blockade` | Keep multiple plausible explanations for a partially dissolved dishwasher tab. |
| `spueler_vorbereitung_grobe_reste_auto_sensor` | Separate scraping, rinsing under the tap and the machine’s internal prewash. |
| `miele_g7673_zweites_zwischenspuelen_eco_ausnahme` | Check whether the persistent extra can apply to the selected program. |
| `bosch_kompakt_regeneration_variante_eco_basis` | Read the exact compact dishwasher laboratory row, without mapping it onto a calendar. |
| `bosch_sbv4ebx00d_fluessigreiniger_vorspuelen_zeitvorwahl` | Match the liquid-detergent route to confirmed prewash and delay settings. |
| `miele_g7673_salzmangel_nach_befuellen_einordnen` | Interpret a refill notice that persists immediately after filling without diagnosing a sensor. |
| `spueler_klarspueler_menuewert_und_abgabe_trennen` | Interpret a rinse-aid display without treating it as a measurement of actual delivery. |
| `miele_g7673_autodos_mengenwahl_zielkonflikt` | Use the exact Miele manual’s qualitative tradeoff under confirmed conditions. |
| `spueler_nach_salzbehaelter_oeffnen_spuelbezug` | Identify the documented after-fill or opened-cap case for the exact dishwasher manual. |
| `miele_g7673_kunststoff_verfaerbung_naturfarbstoffe` | Check whether documented food-pigment staining is a plausible explanation on the exact Miele model. |
| `spuelreiniger_blauer_engel_de_uz_201_produktbeleg` | Check an environmental label’s documented product match separately from machine compatibility. |
| `spueler_weichwasser_ohne_salz_geraetemodell` | Use the model-specific soft-water boundary without relying on a multi-function tablet. |
| `bosch_sks62e32eu_glastruebung_ablesbarer_beleg` | Decide which evidence branch applies without diagnosing irreversible damage. |
| `spueler_geschirr_material_vor_einraeumen_beleg` | Screen documented dishware and material limitations before loading. |
| `miele_hyclean_beutel_vollstaendige_modellzeile` | Match an exact German Miele vacuum model to its documented bag family |
| `miele_zwei_sauger_vorrat_beutel_abluftfilter_getrennt` | Check which consumable role two Miele vacuums can share |
| `miele_gn_packbedarf_drei_teile_aus_bestand` | Compare verified GN pack contents against actual remaining needs |
| `miele_abluftfilter_serienausstattung_gegen_nachruestliste` | Separate documented factory filter, optional part and current installation |
| `miele_guard_l1_abluftfilter_gitter_wechselrichtung` | Identify the grille requirement for the documented HS22 filter conversion |
| `miele_timestrip_rot_aktivierung_filteranzeige` | Read a documented time-strip state separately from the vacuum display |
| `miele_guard_l1_abluftanzeige_reset_vor_wechsel` | Decide whether the documented appliance reminder reset has its preconditions |
| `miele_beutelsignal_feinstaub_fusseln_abgleichen` | Reconcile early or delayed bag-full signals with the recorded material |
| `miele_guard_l1_beutelanzeige_pruefbedingungen` | Confirm the observed Guard L1 bag-indicator measurement setup |
| `miele_guard_l1_tu_halteplatte_sperrklinke` | Locate the missing TU seating proof before replacing a bag |
| `miele_guard_l1_lifetime_motorschutz_gegen_packungsfilter` | Separate HS22 lifetime motor filter care from legacy pack inserts |
| `miele_turboteq_305_teppich_drehzahl_abgleich` | Localize a documented air-driven TurboTeQ slowdown |
| `miele_beutelsauger_leistungsverlust_grosse_teile` | Localize a documented onset of restriction after bulky material |
| `miele_guard_l1_parksystem_pause_oder_aufbewahrung` | Match the documented HS22 parking position to the intended use |
| `miele_guard_app_registrierung_gegen_wechselmeldung` | Check whether app registration actually proves a connected replacement notification |
| `miele_boost_cx1_maxmarkierung_behaelter` | Inspect the documented bagless container fill line |
| `miele_boost_cx1_gepflegte_flaeche_reinigungsmedium` | Separate surface-specific care media for the documented Boost CX1 filter assembly |
| `miele_boost_cx1_filtermatte_lage_entnahmeoese` | Verify documented orientation of a dry Boost CX1 filter mat |
| `miele_boost_cx1_feinstaubfilter_oder_abluftteil` | Match related replacement part names to the actual filter stage |
| `miele_boost_cx1_fadenheber_oder_bodenduesenersatz` | Distinguish a worn replaceable lint strip from the nozzle itself |
| `miele_guard_l1_kombiduese_fuge_polster_bestand` | Identify an existing combined nozzle by its documented two positions |
| `miele_guard_l1_saugpinsel_handgriff_2_0_abnahmebeleg` | Scope detachable dusting brush evidence to the documented Comfort 2.0 handle |
| `philips_buegelgeraet_kalksystem_typenschild_abgleich` | Identify the documented descaling system from the exact model plate. |
| `philips_buegeleisen_hartes_wasser_dokumentempfehlung` | Match the DST7040 manual to the known local water hardness. |
| `philips_azur_wassermischung_gleichteile_abmessen` | Compare two measured amounts against the Azur manual’s equal-parts rule. |
| `philips_azur_wasserzusatz_anleitung_abgrenzung` | Check a single liquid or additive against the Azur manual. |
| `philips_buegelgeraet_tankangabe_vs_gemessene_max_marke` | Keep stated tank size separate from a measured reservoir mark. |
| `philips_perfectcare_wassertank_entnahme_eigenes_exemplar` | Verify a detachable tank requirement and specimen evidence. |
| `philips_buegeldampf_dauerstoss_druck_vergleichsart` | Compare matching steam specification types without equating different units. |
| `philips_perfectcare_gewicht_handteil_station_verpackung` | Apply a personal weight budget to the handpiece, combined station or retail box. |
| `philips_perfectcare_trageverriegelung_exemplarbeleg` | Separate the stated carry lock feature from an observed lock state. |
| `philips_perfectcare_statusleuchte_wasser_vs_entkalkung` | Identify the next documentation section by the confirmed indicator. |
| `philips_azur_autoabschaltung_ruhelage_dokumentwert` | Read the specified idle threshold for the two documented resting positions. |
| `philips_azur_calc_pflegefenster_kalender_und_anlass` | Separate the manual’s calendar maintenance range from an observed trigger. |
| `philips_azur_spray_dampfart_beobachtung_zuordnen` | Attribute an observed spray or steam event to its confirmed control and position. |
| `philips_azur_sohle_pflegeaussage_eigener_nachweis` | Classify a proposed soleplate cleaning method against the Azur manual. |
| `philips_perfectcare_bewegungssensor_automatik_beobachtung` | Attribute an event to automatic steam only when its trigger was observed. |
| `philips_perfectcare_zweistundenangabe_eigene_arbeitszeit` | Isolate observed active time from the maker’s up-to-two-hours statement. |
| `philips_perfectcare_aufbewahrung_schlauchfach_klett` | Document the distinct hose and cable storage evidence. |
| `philips_azur_tropfstopp_eigene_beobachtung` | Log observed droplet origin independently of the Drip Stop feature. |
| `philips_perfectcare_ersatzteil_tank_auffangkappe_artikelcode` | Verify the listed spare reservoir or collector cap reference. |
| `philips_perfectcare_bereitlicht_nachfuellanzeige_protokoll` | Distinguish readiness from a water alert using recorded display order. |
| `philips_perfectcare_schlauchpfad_reichweite_reserve` | Compare the workspace path and user reserve with the listed hose length. |
| `philips_perfectcare_energiesparangabe_normal_max_bezug` | Match the maker’s energy comparison to the stated modes and test basis. |
| `philips_azur_lagerung_leer_beobachtung_schrittgrenze` | Record whether the documented empty-tank storage item is actually observed. |
| `philips_perfectcare_refill_zeitpunkt_anforderung_beleg` | Separate the refill capability from a continuous-flow assumption. |
| `bosch_ergomixx_e_nummer_ausfuehrung_handbuch` | Route a full German Bosch ErgoMixx E-number to the correct manual and service page. |
| `bosch_ergomixx_set_lieferumfang_zubehoerrolle` | Check the listed accessory role in an exact German Bosch ErgoMixx bundle. |
| `bosch_ergomixx_mixfuss_oder_universalzerkleinerer_aufgabe` | Route cooked blending and named raw chopping jobs to the appropriate Bosch attachment. |
| `bosch_mixfuss_ersatzgefaess_boden_und_behaelterrolle` | Check the bottom and vessel role before using another vessel with the Bosch blending shaft. |
| `stabmixer_heisses_mixgut_temperatur_und_kochstelle` | Compare measured ingredient temperature and hob status with the exact Bosch or Braun blending guidance. |
| `bosch_msm67170_eis_crush_l_messer_und_menge` | Check the documented Bosch L chopper ice-blade setup and example portion for the MSM67170. |
| `bosch_msm67170_abschalten_ueberlast_wartezeit` | Read the manual’s cooling interval for a confirmed Bosch MSM67170 shutdown during use. |
| `bosch_ms6cb61v1_vakuumbox_volumen_quellenkonflikt` | Surface the conflicting container capacities in the Bosch MS6CB61V1 German spec sheet. |
| `bosch_mixfuss_trocknen_lagerung_befund` | Record upright draining and subsequent dryness separately for a Bosch blending shaft. |
| `stabmixer_aufsatzwechsel_stillstand_netztrennung` | Check that both a stopped drive and disconnection are documented before an attachment change. |
| `bosch_ergomixx_fresh_vakuum_behaelter_oder_beutel_anzeige` | Distinguish the manual’s different vacuum indicators for a Bosch Fresh container and zip bag. |
| `bosch_ergomixx_fresh_zipbeutel_vorinhalt_wiederverwendung` | Read Bosch Fresh bag reuse limits from recorded previous contents, cleaning and drying. |
| `bosch_ergomixx_fresh_vitamaxx_behaelter_kompatibilitaet` | Look up the VitaMaxx accessories explicitly listed for Bosch ErgoMixx Fresh. |
| `braun_mq30_mqs230_kupplung_wellenschnitt_gerade` | Compare the actual coupling profile of the Braun MQ 30 and MQS 230 choppers. |
| `braun_zerkleinerer_ca_mc_hc_bc_behaelterkennzeichen` | Identify a Braun chopper by its documented ca, mc, hc or bc vessel code. |
| `braun_zerkleinerer_eis_bc_mc_und_messer_unterscheidung` | Distinguish the Braun ice-use conditions by vessel code and dedicated ice blade. |
| `braun_mq7035xbi_mc_zutatenmenge_markierung` | Compare ingredient weights and the visible max line for the Braun mc 500 ml chopper. |
| `braun_mq7035xbi_puerierbecher_kleinmenge_mixglocke` | Compare the observed liquid level for a small batch with Braun’s immersed blending-foot illustration. |
| `braun_zerkleinerer_laufzeit_pause_erst_nach_dokumentiertem_ende` | Compare a recorded chopper run and elapsed pause with the matching ca or mc manual row. |
| `braun_mq7035xbi_doppelruehrbesen_teigart_ruehraufgabe` | Classify light mixing work and heavy kneading for the Braun double beater. |
| `braun_mq7035xbi_doppelruehrbesen_mixbecher_veto` | Check the manufacturer’s explicit supplied-beaker exclusion for the Braun double beater. |
| `braun_mq7035xbi_doppelruehrbesen_rund_sechskant_beleg` | Match the two documented Braun beater markings to their round and hexagonal sockets. |
| `stabmixer_getriebedeckel_reinigung_spuelmaschine` | Check dishwasher, rinse or wipe guidance for the exact Bosch or Braun part. |
| `braun_zerkleinerer_topf_mikrowelle_piktogramm_bezug` | Read Braun’s microwave exclusion for the mapped chopper bowl and leave other vessels unresolved. |
| `braun_zerkleinerer_ungewoehnliche_vibration_drehzahl_stop` | Classify vibration and speed-loss observations for the two documented Braun choppers. |
| `bosch_bfl524ms0_nische_geraetemass_unterscheiden` | Distinguish cabinet opening, outer body and cavity dimensions. |
| `bosch_bfl524_einbaumoebel_hitzebestaendigkeit_luftweg_belege` | Check documented furniture temperatures and unobstructed ventilation. |
| `mikrowelle_gefaess_drehkreis_griffe_zentriert` | Check handle-inclusive rotational clearance of a centered rectangular vessel. |
| `mikrowelle_deckelgriff_lichte_hoehe_tuerdurchlass` | Check vertical passage and in-use lid clearance. |
| `bosch_mikrowelle_bfl_bel_grill_modellbeleg` | Distinguish the solo microwave and grill variant before purchase. |
| `bosch_bfl524ms0_watt_anschlusswert_und_garleistung` | Separate cooking output, rated input and energy measured in use. |
| `bosch_bfl524_watt_stufe_maximale_zeiteinstellung` | Read the maximum selectable timer for each microwave output setting. |
| `bosch_bfl524ms0_inverter_maximalleistung_dauer_keine_garprognose` | Interpret the model-specific long-run power reduction without inventing timing. |
| `bosch_bfl524_autopilot_portion_und_programmtabelle` | Look up the listed food category and weight range for the exact AutoPilot programme. |
| `bosch_bfl524_autoprogramm_deckel_auftauen_garen` | Check whether the named Bosch programme lists an uncovered or covered vessel. |
| `bosch_bfl524_rundung_eingabeschritt_gewichtsgrenze` | Keep rounded programme input separate from measured food weight. |
| `bosch_bfl524_memory_einzelschritt_oder_automatik` | Check whether the intended routine fits the single memory slot. |
| `bosch_bfl524_automatik_signal_waehrend_programm` | Distinguish a mid-programme intervention signal from a confirmed finish. |
| `bosch_bfl524_kuehlgeblaese_nachlauf_kein_weitergaren_beleg` | Distinguish documented cooling fan run-on from active heating. |
| `bosch_bfl524_kondenswasser_ort_und_wiederkehr_abgleich` | Record ordinary post-run condensation separately from unexplained moisture. |
| `bosch_bfl524_demo_modus_anzeige_ohne_garfunktion` | Recognize the documented showroom mode without diagnosing a failure. |
| `bosch_bfl524_drehteller_originalteil_index_und_mass` | Check the listed tray size separately from exact spare-part compatibility. |
| `bosch_bfl524_glas_drehteller_zustand_betriebssperre` | Gate use on an undamaged and properly seated manufacturer tray. |
| `bosch_bfl524_reinigungsunterstuetzung_leichte_verschmutzung` | Determine the documented scope of Bosch cleaning assistance. |
| `bosch_bfl524_reiniger_tuerscheibe_geraetefront_bedienfeld` | Match the cleaning method to the exact front, pane or control surface. |
| `bosch_bfl524_drehteller_schleifen_aussenpruefung` | Identify the documented user-observable cause of tray scraping. |
| `bosch_mikrowelle_garraumtuer_schaden_betrieb_anhalten` | Decide when to pause operation for professional assessment of a visible door defect. |
| `mikrowelle_gefaessfreigabe_korpus_deckel_dekor_unterscheiden` | Treat lid, decoration and vessel approval as separate operating evidence. |
| `beurer_ks34_artikelnummer_wiegeoberflaeche` | Resolve the documented contact surface from the exact German variant. |
| `beurer_ks34_tara_bruttolast_tragkraft` | Count gross load against the documented limit even after tare. |
| `beurer_ks34_wiegebereich_fuenf_gramm_und_einteilung` | Treat the smallest specified weighing load separately from the display graduation. |
| `beurer_ks34_halteanzeige_protokollspeicher_unterschied` | Check whether a visible held reading can satisfy a history requirement. |
| `beurer_ks34_magic_led_schwarzes_display_beobachtung` | Interpret the observable idle display behaviour independently of a possible fault. |
| `beurer_ks34_milliliter_fluid_unze_anzeigemodus` | Check whether the desired volume unit is actually supported. |
| `beurer_ks34_reinigung_feuchtes_tuch_kein_wasserbad` | Check the surface-cleaning method against the matching instructions. |
| `beurer_ks34_wiederholungsmessung_aufstellung_funkumfeld` | Record setup and possible field interference without diagnosing a fault. |
| `beurer_ks34_aaa_batteriesatz_mix_abgleichen` | Check the documented cell count, type and matched-battery condition. |
| `beurer_ks34_aufbewahrung_feuchte_waerme_ort` | Screen the proposed storage location for documented exposure limits. |
| `beurer_ks34_anzeigeabweichung_eigene_referenz_nicht_kalibrierung` | Record one reading difference without claiming a calibration or guaranteed tolerance. |
| `beurer_ks34_versandgewicht_unverpackt_quellenabweichung` | Keep packed and unpacked weights and source revisions separate. |
| `beurer_ks34_privathaushalt_oder_gewerbliche_verwendungsgrenze` | Check the manufacturer’s household-use limitation before selecting a scale. |
| `wasserkocher_twk8613p_360_sockel_originalbasis` | Check original kettle-base evidence without assuming cross-model interchangeability. |
| `wasserkocher_twk8613p_wasser_milch_instant_einfuellen` | Check the manufacturer’s kettle liquid scope against the household use case. |
| `wasserkocher_twk8613p_temperatur_blinkt_leuchtet` | Decode selected and reached temperature indicators during the documented heating phase. |
| `wasserkocher_twk8613p_sollwert_aenderung_wasser_bereits_waermer` | Check the documented live setpoint-change rule against a measured temperature. |
| `wasserkocher_twk8613p_keep_warm_vor_heizende_aktivieren` | Check activation timing and indicator evidence for the Bosch hold mode. |
| `wasserkocher_twk8613p_abheben_basis_kochen_neustart` | Determine how a documented lift interrupts a kettle heating run. |
| `wasserkocher_twk8613p_abkuehlen_fuenf_minuten_nach_gebrauch` | Check the separate five-minute cooldown requirement between kettle uses. |
| `wasserkocher_twk8613p_hoehenlage_2000_aufsicht` | Verify the documented altitude and observation conditions for the proposed use site. |
| `wasserkocher_twk8613p_min_max_markierungen_ablesbar` | Check legible on-device fill-limit markings before using an exact kettle. |
| `wasserkocher_twk8613p_vor_siedepunkt_abschaltung_sollwert` | Check whether an early-looking stop belongs to a lower setting or needs manufacturer review. |
| `wasserkocher_twk8613p_deckel_kalksieb_gebrauchsbeleg` | Confirm two documented kettle assembly conditions before use. |
| `wasserkocher_twk8613p_spuelmaschine_basis_kanne_sieb` | Separate forbidden dishwasher use from component-specific care evidence. |
| `wasserkocher_twk8613p_entkalken_taeglicher_betrieb_intervall` | Check usage-dependent kettle maintenance without inventing a fixed day count. |
| `wasserkocher_twk8613p_kondenswasser_basis_wasserbeobachtung` | Scope base moisture against the Bosch condensation note without inferring an electrical fault. |
| `wasserkocher_twk8613p_schrankbetrieb_dampf_aufstellort` | Check the kettle’s documented in-cabinet restriction for a proposed location. |
| `bosch_twk8613p_doppelwand_oberflaeche_beruehrbarkeit` | Distinguish the double-wall feature from a measured touch-temperature result. |
| `bosch_tat8613_schlitzanzahl_scheibenmass_abgrenzen` | Check slot count and distinguish it from fit evidence. |
| `bosch_tat8613_broetchenaufsatz_integriert_ersatzbeleg` | Identify the published rack configuration before buying an accessory. |
| `bosch_tat8613_aufbacken_max_stufe_aufsatzbedingungen` | Verify the rack mode and its published maximum level. |
| `bosch_tat8613_auftauen_aufwaermen_ersichtlicher_modus` | Match the selected control to the known bread state. |
| `bosch_tat8613_roestband_brotsorte_eine_scheibe` | Read the guide’s browning bands without predicting the result. |
| `bosch_tat8613_zwei_leds_roestgrad_ablesen` | Decode consecutive odd markings while the selected level is shown. |
| `bosch_tat8613_memory_nach_stromunterbrechung` | Read what the memory function preserves after power interruption. |
| `bosch_tat8613_roestvorgang_stopp_ende_highlift` | Distinguish early user cancellation, the observed end and the extraction aid. |
| `bosch_tat8613_kruemelschublade_oder_broetchenaufsatz_pflege` | Match the documented cleaning method to the observed location. |
| `bosch_tat8613_kruemelschublade_vor_betrieb_vorhanden` | Check the removable tray as required equipment. |
<!-- tools:end -->

## Can a MeacoDry Arete One 20L drain uphill into a sink?

A gravity hose requires a continuous drop. Meaco lists a separate pump for this model. Check the German package contents and the permitted lift before buying, or empty the tank. [German drainage decision and model sources](https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf).

```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"entfeuchter_ablaufcheck","arguments":{"drain":"level_or_uphill","model":"meaco-one-20"}}}
```

## What makes the answers safe to quote

- **Checked examples and source links.** The hosted directory supplies exact input
  schemas, examples and source URLs. Tests cover all <!-- count -->2003<!-- /count -->
  callable names and compare the deterministic examples with the hosted results.
- **Every answer carries its source URL** and the disclosure that the site is funded by
  Amazon affiliate links, so a quoting assistant passes both along.
- **Honest about what it is not.** Product recommendations summarise public tests; nothing
  is lab-tested here. Each source identifies the model and purchase conditions it covers.
- **Hosted privacy.** New usage records contain the tool name, a fixed outcome and limited client metadata for every tool. Submitted arguments are processed to answer requests and are absent from usage records. See the [privacy notice](https://getecoback.com/datenschutz.html). The stdio drainage calculation runs locally.

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

[`server.json`](server.json) records the expected hosted Registry version. The local stdio version comes from [`package.json`](package.json). The [tool directory](https://getecoback.com/mcp.html#tools) lists the independent household tasks and marks the compatible legacy overlap.
The drainage rules and reviewed German-market model sources come from
[`sites/getecoback`](https://github.com/f-tiger/agi-site/tree/main/sites/getecoback).
Follow the returned `nextCursor` in `tools/list` to discover later pages.

`npm run test:local` runs the stdio protocol and every reviewed deterministic
example offline. Pull requests and main pushes use this check.

`npm run test:hosted` checks the exact hosted version before comparing the tool
directory and deterministic answers, including the drainage cases. The daily
and manually dispatched tests run both suites. `npm test` runs both suites
before npm publication.
