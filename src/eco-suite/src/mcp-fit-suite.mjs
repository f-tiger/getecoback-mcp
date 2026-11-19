import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const robotCatalog = require('../data/robot-catalog.json');
const humidifierCatalog = require('../data/humidifier-catalog.json');
const filterCatalog = require('../data/filter-finder-de.json');
import {availability} from '../site/assets/filter-care-core.mjs';
import {CARE, careDecision} from '../site/assets/upkeep-decisions-rules.mjs';
import {SCHEMA, decide} from '../site/assets/family-workshop-rules.mjs';

const robotPage = '/guide/saugroboter-kaufberatung.html';
const floorPage = '/guide/saugwischer-kaufberatung.html';
const filterPage = '/ersatzfilter.html';
const workshopPage = '/familienwerkstatt.html';

const number = (description, minimum, maximum) => ({type:'number', minimum, maximum, description});
const choice = (description, ...values) => ({type:'string', enum:values, description});
const yesNo = (description) => ({type:'boolean', description});
const rounded = (value) => Math.round(value * 1000) / 1000 || 0;
const mm = (description, minimum = 0) => number(description, minimum, 3000);
const minutes = (description) => number(description, 0, 720);
const verifiedModels = (catalog) => catalog.products.filter(item => item.status === 'verified');
const robotModels = verifiedModels(robotCatalog);
const humidifierModels = verifiedModels(humidifierCatalog);

function freshness(checked, maxAgeDays) {
  const reviewed = Date.parse(checked + 'T00:00:00Z');
  const age = Math.floor(Date.now() / 86400000) - reviewed / 86400000;
  return Number.isFinite(reviewed) && age >= 0 && age <= maxAgeDays;
}

const poolActions = {
  water:'Wasserzustand und Filterbetrieb prüfen. Grüne Ablagerungen sind kein eindeutiger Befund. Ein Roboter ersetzt keine Wasserpflege.',
  identify:'Zuerst feststellen, ob Blätter oder feines Material das Hauptproblem sind. Vorhandenen Kescher und Filter als Vergleich nutzen.',
  geometry:'Treppen, Kanten und Beckenform vermessen und mit der Anleitung vergleichen. Bodenreinigung und Treppenreinigung getrennt prüfen.',
  filter:'Prüfen, ob der zugelassene Filterkorb feines Material erfasst und wie er gesäubert wird. Angaben gelten für die genaue Ausführung.',
  care:'Entnahme und Reinigung des Korbs im Alltag einplanen. Vorerst vorhandenen Kescher oder Handsauger ausprobieren.',
  compare:'Beckengröße, Oberfläche und Filterkorb mit dem genauen Modell vergleichen. Bestehende Handreinigung als Vergleich beibehalten.',
};
const gardenActions = {
  measure:'Engste Stelle einschließlich Hindernissen und steilste Teilstrecke messen. Hersteller nennt für Fläche, Begrenzung und Zufahrt teils verschiedene Grenzen.',
  passage:'Verbindung zwischen den Rasenflächen nachmessen. Breite einschließlich der geforderten Randabstände mit dem genauen Modell abgleichen.',
  signal:'Empfang an Abschattungen prüfen. Prüfen, ob das Modell Begrenzungskabel, Sichtverbindung zur Basis oder eine andere Führung voraussetzt.',
  compare:'Passagen, Steigungen und Begrenzungsprinzip mit der Anleitung abgleichen. Ein auf der Hauptfläche erreichbarer Wert belegt keinen Übergang.',
};
const repairActions = {
  stop:'Für tragende, elektrische, heiße oder druckbelastete Teile Hersteller-Ersatzteil oder geeigneten Fachbetrieb wählen.',
  identify:'Zuerst Zweck, Belastung und Einbauort des Teils klären.',
  measure:'Original und Aufnahme mit geeigneter Messmethode vermessen, bevor du ein Modell auswählst.',
  match:'Für normale lose Ersatzteile zuerst die offizielle Modell- und Teilenummer prüfen. Maße allein bestimmen weder Material noch Passung.',
  service:'Für einen einfachen Organizer reichen häufig Karton oder vorhandene Einsätze. Einen Druckservice erst bei konkreten Maßen vergleichen.',
  template:'Für einen unbelasteten Organizer eine Vorlage an den nutzbaren Innenmaßen ausrichten. Zuerst mit Karton oder einer kleinen Probe testen.',
};

export const fitSuite = [
  {
    name:'saugroboter_schwelle_pruefen',
    description:'Einzelkante oder Doppelschwelle mit dokumentiertem Modellwert vergleichen — Check a single rise or double threshold against the exact robot model evidence.',
    page:robotPage,
    properties:{
      model:choice('Genaues Modell der deutschen Auswahl, sonst unknown.', ...robotModels.map(({id})=>id),'unknown'),
      transition:choice('Gemessene Bauform des Übergangs.', 'single','double','unknown'),
      height_mm:mm('Einzelhöhe oder Gesamthöhe der Doppelschwelle. Wird bei unknown nicht bewertet.'),
    },
    calculate({model,transition,height_mm}) {
      const product = robotModels.find(item=>item.id === model);
      if (!product) return {status:'identify_model', next_step:'Genaue Gerätegeneration und Übergangsangaben in der Anleitung prüfen.'};
      const source = robotCatalog.sources[product.threshold.source];
      const checked = source.checked || product.checked || robotCatalog.checked;
      const limit = product.threshold[transition + '_mm'];
      const status = transition === 'unknown' ? 'measure_each_rise' :
        !freshness(checked,robotCatalog.max_age_days) ? 'source_recheck' :
        limit == null ? 'no_matching_limit' :
        height_mm > limit ? 'above_documented_height' : 'check_geometry';
      return {status, model:product.name, documented_max_mm:['above_documented_height','check_geometry'].includes(status) ? limit : null,
        manufacturer_source:source.url, source_checked:checked,
        next_step:'Jede Kantenhöhe, Abstand, Form und Oberfläche messen. Doppelschwellenwerte nur mit gleicher Prüfgeometrie vergleichen. Geeignete Strecke zuerst praktisch prüfen.'};
    },
    example:{args:{model:'roborock-saros-10r',transition:'unknown',height_mm:0},expect:{status:'measure_each_rise'}},
  },
  {
    name:'saugroboter_moebeldurchfahrt',
    description:'Niedrigste Möbelöffnung mit Gerätehöhe und geplanter Reserve prüfen — Check under-furniture clearance with a user-chosen allowance.',
    page:robotPage,
    properties:{
      opening_mm:mm('Kleinste lichte Höhe am gesamten Fahrweg, inklusive Querstreben.'),
      robot_mm:mm('Gerätehöhe in geplanter Stellung laut Anleitung oder Messung.',1),
      allowance_mm:mm('Zusätzliche frei gewählte Höhenreserve.'),
    },
    calculate({opening_mm,robot_mm,allowance_mm}) {
      const remaining = rounded(opening_mm - robot_mm - allowance_mm);
      return {height_after_allowance_mm:remaining,
        status:remaining < 0 ? 'insufficient_height' : 'check_driving_path',
        assumption:'Breite, Unebenheiten, hochfahrendes Chassis, Teppichflor und Bewegungen separat prüfen. Die Höhenrechnung bestätigt keine Durchfahrt.'};
    },
    example:{args:{opening_mm:90,robot_mm:85,allowance_mm:10},expect:{status:'insufficient_height',height_after_allowance_mm:-5}},
  },
  {
    name:'saugroboter_station_aufstellcheck',
    description:'Freien Anfahr- und Bedienraum einer Roboterstation prüfen — Compare free approach and service space with the station manual.',
    page:robotPage,
    properties:{
      front_mm:mm('Freie Tiefe vor dem Gehäuse.'),
      left_mm:mm('Freier Abstand links neben der Station.'),
      right_mm:mm('Freier Abstand rechts neben der Station.'),
      min_front_mm:mm('Geforderter Freiraum vor der Station laut Anleitung.'),
      min_side_mm:mm('Geforderter Freiraum je Seite laut Anleitung. Bei unterschiedlichen Vorgaben den größeren Wert angeben.'),
      tanks_accessible:yesNo('Deckel, Beutel und gegebenenfalls beide Tanks lassen sich vollständig bedienen?'),
    },
    calculate({front_mm,left_mm,right_mm,min_front_mm,min_side_mm,tanks_accessible}) {
      const front = rounded(front_mm-min_front_mm);
      const side = rounded(Math.min(left_mm,right_mm)-min_side_mm);
      const status = Math.min(front,side) < 0 ? 'needs_more_clearance' : !tanks_accessible ? 'access_blocked' : 'verify_installation';
      return {status, front_margin_mm:front, closest_side_margin_mm:side,
        assumption:'Nur Abstände relativ zum Gehäuse eintragen, keine Gesamtmaße der Stellfläche. Bei genau null Reserve Hinweise wie „mehr als“ beachten. Boden, Stromversorgung und Modellvariante separat prüfen.'};
    },
    example:{args:{front_mm:1600,left_mm:150,right_mm:100,min_front_mm:1500,min_side_mm:50,tanks_accessible:false},expect:{status:'access_blocked',front_margin_mm:100}},
  },
  {
    name:'saugroboter_teppich_wischmodus',
    description:'Wischroute bei Teppichen, Fransen und fehlender Bodenfreigabe planen — Resolve carpet avoidance and dry vacuuming on a mixed-floor route.',
    page:robotPage,
    properties:{
      floor_permission:choice('Freigabe des Hartbodens fürs Wischen.', 'yes','no','unknown'),
      carpet:choice('Teppich auf dem Roboterweg.', 'none','simple','delicate','unknown'),
      separation:choice('Sichere Trennung von Teppich und Wischbetrieb laut Anleitung und Einrichtung geprüft?', 'yes','no','unknown'),
    },
    calculate({floor_permission,carpet,separation}) {
      const status = floor_permission !== 'yes' ? 'dry_only' :
        carpet === 'none' ? 'check_hard_floor_settings' :
        carpet === 'simple' && separation === 'yes' ? 'check_separate_zones' : 'keep_carpets_outside_mop_route';
      return {status,
        next_step:'Teppiche, Fransen und Material zuerst prüfen. Bei Bedarf geeignete Sperrzonen einrichten oder Wischmodul und Teppichroute zeitlich trennen. Die Herstellerangabe zur Moppanhebung allein bestätigt keinen trockenen Teppich.'};
    },
    example:{args:{floor_permission:'yes',carpet:'delicate',separation:'yes'},expect:{status:'keep_carpets_outside_mop_route'}},
  },
  {
    name:'saugroboter_manuelle_zeit',
    description:'Bisherige Handarbeit mit Vorbereitung, Eingriffen und Pflege beim Roboter vergleichen — Compare active cleaning time including robot preparation and upkeep.',
    page:robotPage,
    properties:{
      comparable:yesNo('Gleiche Räume, Verschmutzung und Reinigungswirkung?'),
      manual_min:minutes('Aktive Minuten ohne Roboter.'),
      setup_min:minutes('Aktive Minuten zum Freiräumen und Einrichten.'),
      intervention_min:minutes('Aktive Minuten für Eingriffe und Nacharbeit.'),
      care_min:minutes('Aktive Minuten für Gerätereinigung und Tank- oder Beutelpflege.'),
      runs_per_week:number('Vergleichbare Reinigungsdurchgänge pro Woche.',0,21),
    },
    calculate({comparable,manual_min,setup_min,intervention_min,care_min,runs_per_week}) {
      const active = setup_min+intervention_min+care_min;
      const difference = manual_min-active;
      return {robot_active_min:rounded(active), minutes_saved_per_run:comparable ? rounded(difference) : null,
        active_hours_saved_per_week:comparable ? rounded(difference*runs_per_week/60) : null,
        assumption:'Nur eigene aktive Arbeit eintragen. Unbeaufsichtigte Fahrzeit getrennt notieren. Negative Werte bedeuten Mehraufwand.'};
    },
    example:{args:{comparable:true,manual_min:30,setup_min:5,intervention_min:5,care_min:5,runs_per_week:4},expect:{robot_active_min:15,active_hours_saved_per_week:1}},
  },
  {
    name:'saugwischer_bodenfreigabe',
    description:'Boden- und Gerätefreigabe für aktive Nassreinigung abgleichen — Check both floor and wet-cleaner permissions before use.',
    page:floorPage,
    properties:{
      floor:choice('Freigabe des Bodenherstellers.', 'yes','no','unknown'),
      equipment:choice('Freigabe der genauen Geräteanleitung für Boden und Betriebsart.', 'yes','no','unknown'),
      damage:choice('Offene Fugen, beschädigte Versiegelung oder andere sichtbare Schäden?', 'yes','no','unknown'),
    },
    calculate({floor,equipment,damage}) {
      const status = floor === 'no' || equipment === 'no' || damage === 'yes' ? 'do_not_wet_clean' :
        [floor,equipment,damage].includes('unknown') ? 'clarify_surface' : 'follow_both_manuals';
      return {status,
        next_step:'Freigaben beziehen sich auf die genaue Oberfläche und den Zustand. Bei Unsicherheit vorhandene, freigegebene trockene Reinigungsmethode nutzen.'};
    },
    example:{args:{floor:'yes',equipment:'yes',damage:'yes'},expect:{status:'do_not_wet_clean'}},
  },
  {
    name:'saugwischer_tankstopps_planen',
    description:'Tankfüllungen oder Entleerungen aus eigenen Messwerten planen — Plan tank service stops from measured water volume and usable tank capacity.',
    page:floorPage,
    properties:{
      role:choice('Der betrachtete Tank.', 'clean','dirty'),
      used_l:number('In einem vergleichbaren Raumdurchgang gemessener Wasserverbrauch bzw. aufgefangenes Schmutzwasser in Litern.',0,50),
      capacity_l:number('Nutzbare Tankmenge laut Anleitung oder Messung bis zur vorgesehenen Markierung.',0.05,20),
    },
    calculate({role,used_l,capacity_l}) {
      const ratio = used_l/capacity_l;
      const loads = Math.ceil(ratio - Number.EPSILON * ratio);
      return {tank_role:role, tank_loads_for_job:loads, estimated_stops_during_job:Math.max(0,loads-1),
        assumption:'Schätzung für denselben Durchgang und einen zu Beginn gefüllten Frischwassertank oder einen leeren Schmutzwassertank. Abschließende Pflege separat einplanen; Hinweise und Füllgrenzen der Anleitung beachten.'};
    },
    example:{args:{role:'dirty',used_l:1.2,capacity_l:0.5},expect:{tank_loads_for_job:3,estimated_stops_during_job:2}},
  },
  {
    name:'tineco_saugwischer_pflegecheck',
    description:'Modell und Symptom zum belegten Tineco-Pflegeschritt führen — Find the documented care or escalation step for a Tineco symptom.',
    page:'/guide/tineco-saugt-nicht-mehr.html',
    properties:{
      model:choice('FLOOR ONE S5, S7 FlashDry oder andere Modellvariante.', ...CARE.model),
      symptom:choice('Schwache Leistung, Tankmeldung, Geruch, Abschalten, elektrischer Geruch oder sichtbarer Verschleiß.', ...CARE.symptom),
      care:choice('Anleitungsgemäße Pflege noch nicht erfolgt, erledigt und vollständig trocken, oder unklar.', ...CARE.care),
    },
    calculate(input) {
      const {code,title,steps,source} = careDecision(input);
      return {status:code, next_step:title, steps, manufacturer_source:source};
    },
    example:{args:{model:'s7-flashdry',symptom:'weak',care:'not-yet'},expect:{status:'manual'}},
  },
  {
    name:'luftreiniger_ersatzfilter_zuordnung',
    description:'Geprüften deutschen Ersatzfilter anhand der exakten Modellvariante zuordnen — Resolve manufacturer-documented replacement filters for exact German models.',
    page:filterPage,
    properties:{model:choice('Exakte Modellkennung gemäß Typenschild. Andere Serien und Modellzusätze als unknown angeben.', ...filterCatalog.items.map(({id})=>id),'unknown')},
    calculate({model}) {
      const item = filterCatalog.items.find(entry=>entry.id === model);
      if (!item) return {status:'identify_model', next_step:'Vollständige Modellkennung vom Typenschild und genaue Filtervariante anhand der Herstellerliste prüfen.'};
      const state = availability(item);
      return {status:state.active ? 'documented_variant' : 'source_recheck', exact_model:item.models[0],
        filter_name:state.active ? item.name : null, part_number:state.active ? item.part_number || null : null,
        manufacturer_source:item.source_url, source_checked:item.checked_at, limit:item.note};
    },
    example:{args:{model:'unknown'},expect:{status:'identify_model'}},
  },
  {
    name:'luftreiniger_filter_faelligkeit',
    description:'Geräteanzeige, Filterzustand und Anleitung vor einem Filterwechsel prüfen — Assess a particulate filter change using condition and manufacturer instructions.',
    page:filterPage,
    properties:{
      indicator:choice('Betriebszustand der Filteranzeige.', 'replace','clear','unknown'),
      condition:choice('Sichtbarer Zustand nach Prüfung laut Anleitung.', 'damaged','dirty','normal','unknown'),
      instructions:choice('Welche Pflege ist für dieses Filterteil ausdrücklich dokumentiert?', 'clean_allowed','replace_only','unknown'),
    },
    calculate({indicator,condition,instructions}) {
      const status = condition === 'damaged' || indicator === 'replace' ? 'check_exact_replacement' :
        condition === 'dirty' && instructions === 'clean_allowed' ? 'clean_as_documented' :
        condition === 'normal' && indicator === 'clear' ? 'keep_monitoring' : 'check_manual';
      return {status, next_step:'Anzeige und Filterzustand nach Modellanleitung gemeinsam bewerten. Bei unklarer Freigabe Filter nicht waschen. Vor Ersatz die exakte Filtervariante prüfen.'};
    },
    example:{args:{indicator:'clear',condition:'dirty',instructions:'clean_allowed'},expect:{status:'clean_as_documented'}},
  },
  {
    name:'luftreiniger_cadr_raumcheck',
    description:'Hersteller-CADR auf das gemessene Raumvolumen beziehen — Estimate equivalent particulate clean-air delivery in a measured room.',
    page:'/guide/luftreiniger-ratgeber.html',
    properties:{
      cadr_m3_h:number('Dokumentierte CADR für Partikel und die betrachtete Gerätestufe in m³/h, nicht der ungefilterte Lüfterstrom.',0,4000),
      volume_m3:number('Gemessenes Volumen des betrachteten Raums in m³.',1,2000),
    },
    calculate({cadr_m3_h,volume_m3}) {
      return {equivalent_clean_air_per_hour:rounded(cadr_m3_h/volume_m3),
        assumption:'Rechnerisches Verhältnis bei der genannten Stufe. Tatsächliche Raumwirkung hängt unter anderem von Luftverteilung und Filterzustand ab. Keine Aussage zu CO₂, Frischluft oder Gesundheit.'};
    },
    example:{args:{cadr_m3_h:240,volume_m3:60},expect:{equivalent_clean_air_per_hour:4}},
  },
  {
    name:'luftbefeuchter_modellpflege',
    description:'Dokumentierte Tankpflege und passende Verschleißteile nach exakter Befeuchter-Variante abrufen — Retrieve model-specific humidifier care and consumables.',
    page:'/guide/luftbefeuchter-ratgeber.html',
    properties:{model:choice('Exakte Variante der deutschen Auswahl.', ...humidifierModels.map(({id})=>id),'unknown')},
    calculate({model}) {
      const item = humidifierModels.find(entry=>entry.id === model);
      if (!item) return {status:'identify_model', next_step:'Typenschild, Anleitung und Zubehörliste der vollständigen Gerätevariante vergleichen.'};
      const checked = item.checked || humidifierCatalog.checked;
      const active = freshness(checked,humidifierCatalog.max_age_days);
      return {status:active ? 'documented_care' : 'source_recheck', exact_model:item.name, source_checked:checked,
        care:active ? item.care : null, consumables:active ? item.parts : null, limit:item.limit,
        manufacturer_sources:item.sources.map(key=>humidifierCatalog.sources[key].url)};
    },
    example:{args:{model:'unknown'},expect:{status:'identify_model'}},
  },
  {
    name:'poolroboter_beckencheck',
    description:'Beckenform, Schmutz und Korbpflege vor der Auswahl eines Poolroboters prüfen — Assess debris, obstacles and basket care for a pool robot.',
    page:workshopPage,
    properties:{
      debris:choice('Vorherrschendes Material: Blätter, fein, grüne Ablagerung oder unbekannt.', ...SCHEMA.pool.debris),
      obstacle:choice('Bodenstrecke frei, Treppen oder unbekannt.', ...SCHEMA.pool.obstacle),
      care:choice('Korb im Alltag zugänglich und leicht zu reinigen?', ...SCHEMA.pool.care),
    },
    calculate(input) {
      const {code} = decide('pool',input);
      return {status:code, next_step:poolActions[code]};
    },
    example:{args:{debris:'leaves',obstacle:'stairs',care:'yes'},expect:{status:'geometry'}},
  },
  {
    name:'maehroboter_gartencheck',
    description:'Passagen, Steigung und Führung vor Einsatz eines Mähroboters klären — Check narrow routes, measured slopes and navigation conditions.',
    page:workshopPage,
    properties:{
      route:choice('Passage offen, eng oder unbekannt.', ...SCHEMA.garden.route),
      slope:choice('Steilste Einzelabschnitte gemessen?', ...SCHEMA.garden.slope),
      signal:choice('Grenzführung oder Empfang entlang der Route geklärt?', ...SCHEMA.garden.signal),
    },
    calculate(input) {
      const {code} = decide('garden',input);
      return {status:code, next_step:gardenActions[code]};
    },
    example:{args:{route:'open',slope:'measured',signal:'blocked'},expect:{status:'signal'}},
  },
  {
    name:'ersatzteil_druck_eignung',
    description:'Bei fehlendem Teil zwischen Modellabgleich, einfachem 3D-Druck und Herstellerhilfe entscheiden — Triage a small missing part or organizer for 3D printing.',
    page:workshopPage,
    properties:{
      use:choice('Einfacher Organizer, loses Ersatzteil, sicherheitskritische Funktion oder unbekannt.', ...SCHEMA.repair.use),
      measure:choice('Vorlage und Aufnahme vollständig vermessen?', ...SCHEMA.repair.measure),
      printer:choice('Geeigneter Drucker für einen einfachen Prototyp verfügbar?', ...SCHEMA.repair.printer),
    },
    calculate(input) {
      const {code} = decide('repair',input);
      return {status:code, next_step:repairActions[code]};
    },
    example:{args:{use:'critical',measure:'yes',printer:'yes'},expect:{status:'stop'}},
  },
  {
    name:'saugwischer_reinigungsmittel_freigabe',
    description:'Reinigungsmittel und Dosierung mit Freigaben von Gerät und Boden abgleichen — Check approved cleaning solution and dilution for the exact equipment and surface.',
    page:floorPage,
    properties:{
      equipment:choice('Erlaubt die genaue Geräteanleitung dieses Mittel für den Tank?', 'yes','no','unknown'),
      surface:choice('Erlaubt der Bodenhersteller das Mittel für diese Oberfläche?', 'yes','no','unknown'),
      dose:choice('Vorgeschriebene Dosierung und Vorgehen eindeutig dokumentiert?', 'yes','no','unknown'),
    },
    calculate({equipment,surface,dose}) {
      const status = equipment === 'no' || surface === 'no' ? 'skip_solution' :
        [equipment,surface,dose].every(value=>value === 'yes') ? 'follow_documented_dosing' : 'verify_approval';
      return {status, next_step:'Aus automatischer Dosierung folgt keine Freigabe für jedes Mittel. Angaben zu Wasser und Reinigungsmitteln der exakten Anleitung beachten und bei fehlender Freigabe eine erlaubte Alternative wählen.'};
    },
    example:{args:{equipment:'yes',surface:'no',dose:'yes'},expect:{status:'skip_solution'}},
  },
];
