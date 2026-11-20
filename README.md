# EcoBack Raumklima — MCP server

<!-- count -->634<!-- /count --> callable tool names for **household decisions in Germany**.
Use measurements to assess room climate and electricity use, plan laundry and
airflow, check model documentation, reconcile household bills, or compare an
appliance in use. The tools also search and retrieve published guides.

The [searchable tool directory](https://getecoback.com/mcp.html#tools) links to
source guides and documented examples, including a
[meter-to-bill comparison](https://getecoback.com/mcp.html#stromrechnung-messfenster-beispiel).

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
<!-- tools:end -->

## Can a MeacoDry Arete One 20L drain uphill into a sink?

A gravity hose requires a continuous drop. Meaco lists a separate pump for this model. Check the German package contents and the permitted lift before buying, or empty the tank. [German drainage decision and model sources](https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf).

```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"entfeuchter_ablaufcheck","arguments":{"drain":"level_or_uphill","model":"meaco-one-20"}}}
```

## What makes the answers safe to quote

- **Same arithmetic as the published calculators.** Each tool mirrors a calculator that
  runs on the website, so an assistant's answer and the page a reader lands on cannot
  disagree. A CI job calls all <!-- count -->634<!-- /count --> tools against production daily and
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

The hosted Registry entry is version 1.10.0. The local stdio source is version 1.8.0. The [tool directory](https://getecoback.com/mcp.html#tools) lists the distinct household tasks and marks the compatible legacy overlap.
The drainage rules and reviewed German-market model sources come from
[`sites/getecoback`](https://github.com/f-tiger/agi-site/tree/main/sites/getecoback).
Follow the returned `nextCursor` in `tools/list` to discover later pages.

The parity tests compare deterministic results with the hosted server, including
downhill drainage, separate pump accessories and missing measurements.
