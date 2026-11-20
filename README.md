# EcoBack Raumklima — MCP server

<!-- count -->292<!-- /count --> tools for **indoor climate and household energy in Germany/EU**: how many BTU a
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
<!-- tools:end -->

## Can a MeacoDry Arete One 20L drain uphill into a sink?

A gravity hose requires a continuous drop. Meaco lists a separate pump for this model. Check the German package contents and the permitted lift before buying, or empty the tank. [German drainage decision and model sources](https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf).

```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"entfeuchter_ablaufcheck","arguments":{"drain":"level_or_uphill","model":"meaco-one-20"}}}
```

## What makes the answers safe to quote

- **Same arithmetic as the published calculators.** Each tool mirrors a calculator that
  runs on the website, so an assistant's answer and the page a reader lands on cannot
  disagree. A CI job calls all <!-- count -->292<!-- /count --> tools against production daily and
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

The hosted Registry entry is version 1.7.0. The local stdio source is version 1.5.0. The [tool directory](https://getecoback.com/mcp.html#tools) groups all 292 tools by household task.
The drainage rules and reviewed German-market model sources come from
[`sites/getecoback`](https://github.com/f-tiger/agi-site/tree/main/sites/getecoback).
Follow the returned `nextCursor` in `tools/list` to discover later pages.

The parity tests compare deterministic results with the hosted server, including
downhill drainage, separate pump accessories and missing measurements.
