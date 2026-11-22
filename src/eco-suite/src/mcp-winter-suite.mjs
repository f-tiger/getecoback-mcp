import { calculate as winter } from '../site/assets/winter-math.mjs';
import { decision as valveDecision } from '../site/assets/thermostat-fit.mjs';
import { calculateWarmth } from '../site/assets/personal-warmth.mjs';
import valveData from '../site/assets/thermostat-fit-data.json' with {type: 'json'};

const number = (description, minimum, maximum) => ({type: 'number', description, minimum, maximum});
const choice = (description, values) => ({type: 'string', description, enum: values});
const yesNo = description => ({type: 'boolean', description});
const guide = name => `/guide/${name}.html`;
const round = value => Number(value.toFixed(4));
const thermostat = guide('smarte-heizkoerperthermostate-lohnen-sich');
const setback = guide('nachtabsenkung-heizung');
const shower = guide('duschen-kosten-rechner');
const radiator = guide('heizkoerper-wird-nicht-warm');
const draft = guide('fenster-zugluft-mietwohnung');
const heatCompare = guide('heizkosten-vergleich-rechner');
const blanket = guide('heizdecke-stromverbrauch');
const energyPrice = number('Arbeitspreis in EUR/kWh.', 0, 5);
const documentedValves = ['unknown', ...new Set(
  [...valveData.cases, ...(valveData.bosch?.cases ?? []), ...(valveData.fritz?.cases ?? [])].map(({id}) => id))];
const reviewDates = {'bosch-ii-m': valveData.bosch?.reviewed, 'fritz-302': valveData.fritz?.reviewed};

export const winterSuite = [
  {
    name: 'heizdecke_stromkosten_nennleistung',
    description: 'Stromverbrauch und Stromkosten einer Heizdecke oder Wärmezudecke für eine Nutzung und mehrere Tage aus eigenen Annahmen berechnen — Estimate an electric blanket’s running cost at a supplied constant wattage.',
    page: blanket,
    guide_url: 'https://getecoback.com' + blanket + '#waerme-rechner',
    properties: {
      nennleistung_w: number('Eigene bestätigte Nennleistung vom Typenschild in Watt; bei fehlender Angabe nachfragen.', 0, 500),
      laufzeit_h: number('Eigene Annahme zur effektiven Laufzeit je Nutzungstag in Stunden, innerhalb der Geräteanleitung.', 0, 24),
      arbeitspreis_kwh: number('Eigener Strom-Arbeitspreis je kWh in der gewählten Währung. Centbeträge vorab durch 100 teilen.', 0, 5),
      nutzungstage: number('Ganze Tage mit jeweils dieser Nutzung; ohne Angabe ein Tag.', 1, 366),
      waehrung: choice('Währung des eingegebenen Arbeitspreises; ohne Angabe EUR. Keine Umrechnung.', ['EUR', 'CHF']),
    },
    required: ['nennleistung_w', 'laufzeit_h', 'arbeitspreis_kwh'],
    calculate({nennleistung_w, laufzeit_h, arbeitspreis_kwh, nutzungstage = 1, waehrung = 'EUR'}) {
      const result = calculateWarmth({watts:nennleistung_w, hours:laufzeit_h, days:nutzungstage, tariff:arbeitspreis_kwh});
      if (!result) throw new RangeError('Eigene Nutzungswerte prüfen.');
      return {
        berechnungsart: 'nennleistung_schaetzung',
        energie_kwh_pro_nutzung: round(result.kwh),
        kosten_pro_nutzung: round(result.cost),
        energie_kwh_gesamt: round(result.totalKwh),
        kosten_gesamt: round(result.totalCost),
        waehrung,
        nutzungstage,
        guidance_source: 'https://verbraucherzentrale-energieberatung.de/energie-sparen/allgemeines/stromverbrauch-messen/',
        hinweis: 'Rechnung mit durchgehender angegebener Leistung. Heizstufe, Regelung und Abschaltung können die Messung verändern. Die Geräteanleitung entscheidet über erlaubte Nutzung und Laufzeit. Für tatsächliche Kosten die kWh über die ganze zulässige Nutzung messen und mit dem eigenen Arbeitspreis multiplizieren.',
      };
    },
    example: {args: {nennleistung_w: 110, laufzeit_h: 2, arbeitspreis_kwh: 0.35},
      expect: {energie_kwh_pro_nutzung: 0.22, kosten_pro_nutzung: 0.077, waehrung: 'EUR'}},
  },
  {
    name: 'thermostat_amortisation',
    description: 'Sparannahme und Amortisation eines Thermostats prüfen — Estimate thermostat payback using your own savings assumption.',
    page: thermostat,
    properties: {
      base: number('Jährliche beeinflussbare Heizkosten in Euro.', 0, 50000),
      saving: number('Eigene Annahme für Einsparung in Prozent.', 0, 100),
      cost: number('Einmalkosten in Euro.', 0, 10000),
      running: number('Jährliche Zusatzkosten in Euro.', 0, 1000),
    },
    calculate(args) {
      const {gross, net, payback} = winter('thermostat', args);
      return {
        annual_gross_eur: round(gross), annual_net_eur: round(net),
        payback_years: payback === null ? null : round(payback),
        assumption: 'Eigene Annahme für variable Heizkosten. Ohne positive Nettoersparnis ergibt sich keine Amortisation.',
      };
    },
    example: {args: {base: 1000, saving: 10, cost: 180, running: 10}, expect: {annual_net_eur: 90, payback_years: 2}},
  },
  {
    name: 'thermostat_paketkosten',
    description: 'Thermostat-Ausstattung für mehrere Heizkörper mit Zentrale und Zubehör budgetieren — Budget radiator thermostat hardware and shared hub.',
    page: thermostat,
    properties: {
      head_count: number('Anzahl zusätzlich benötigter Köpfe (ganze Stückzahl).', 1, 100),
      head_eur: number('Preis je Kopf in Euro.', 0, 1000),
      hubs_eur: number('Gesamtpreis zusätzlich benötigter Zentralen in Euro. Vorhandene kompatible Zentrale: 0.', 0, 5000),
      accessories_eur: number('Gesamtpreis der geprüften Adapter und Zubehörteile in Euro.', 0, 5000),
      annual_running_eur: number('Wiederkehrende Kosten des gesamten Pakets im Jahr in Euro.', 0, 5000),
    },
    calculate(args) {
      if (!Number.isInteger(args.head_count)) throw new RangeError('Ganze Stückzahl erforderlich.');
      const equipment = args.head_count * args.head_eur + args.hubs_eur + args.accessories_eur;
      return {
        equipment_eur: round(equipment), first_year_eur: round(equipment + args.annual_running_eur),
        assumption: 'Kompatibilität der Ventile und benötigte Zentralen vorher klären. Für vorhandene Teile nur zusätzliche Kosten einsetzen.',
      };
    },
    example: {args: {head_count: 3, head_eur: 60, hubs_eur: 40, accessories_eur: 15, annual_running_eur: 12}, expect: {equipment_eur: 235, first_year_eur: 247}},
  },
  {
    name: 'thermostat_ventilabgleich',
    description: 'Ein bekanntes Heizkörperventil anhand der Herstellerunterlagen für die gewählte Gerätegeneration prüfen — Check a known radiator valve against the selected model’s documentation.',
    page: thermostat,
    properties: {
      model: choice('Thermostat-Generation aus der Geräteanleitung.', valveData.models.map(({id}) => id)),
      valve: choice('Eindeutig identifizierter Ventilanschluss oder unknown.', documentedValves),
    },
    calculate({model, valve}) {
      const {status, title, detail, source} = valveDecision(valveData, model, valve);
      return {status, title, detail, reviewed_on: reviewDates[model] ?? valveData.reviewed, manufacturer_or_guidance_url: valveData.sources[source].url};
    },
    example: {args: {model: 'tado-v3', valve: 'heimeier-m30'}, expect: {status: 'direct'}},
  },
  {
    name: 'heizkoerper_kalt_pruefen',
    description: 'Einen kalten Heizkörper anhand von Raumtemperatur und weiteren betroffenen Heizkörpern eingrenzen — Triage a cold radiator from observed room and radiator behavior.',
    page: radiator,
    properties: {
      room_warm_enough: yesNo('Erreicht der Raum seine gewünschte Temperatur?'),
      other_radiators_work: choice('Funktionieren die anderen Heizkörper?', ['yes', 'no', 'unknown']),
      gurgling: yesNo('Ist Gluckern als zusätzliches Symptom hörbar?'),
    },
    calculate({room_warm_enough, other_radiators_work, gurgling}) {
      if (room_warm_enough) return {next_step: 'observe', guidance: 'Raumtemperatur beobachten. Ein kühler Heizkörper kann bei erreichtem Sollwert normal sein.'};
      if (other_radiators_work === 'unknown') return {next_step: 'compare_rooms', guidance: 'Andere Räume und gegebenenfalls Warmwasser prüfen. Zeitpunkt, Raumtemperatur und Einstellung dokumentieren.'};
      if (other_radiators_work === 'no') return {next_step: 'contact_building_manager', guidance: 'Freigegebenes Zeitprogramm prüfen und das raumübergreifende Problem der zuständigen Stelle melden.'};
      return {
        next_step: 'check_local_controls',
        guidance: gurgling
          ? 'Einzelnen Heizkörper melden. Gluckern kann auf Luft hindeuten. Zuständigkeit und Anleitung zum Entlüften zuerst klären.'
          : 'Thermostat freiräumen und seine Einstellung prüfen. Falls der Raum weiter zu kühl bleibt, den betroffenen Heizkörper melden.',
      };
    },
    example: {args: {room_warm_enough: false, other_radiators_work: 'no', gurgling: false}, expect: {next_step: 'contact_building_manager'}},
  },
  {
    name: 'nachtabsenkung_messvergleich',
    description: 'Verbrauch vor und nach einem Heizzeitplan unter vergleichbaren Bedingungen auswerten — Compare heating-only meter readings before and after a schedule change.',
    page: setback,
    properties: {
      before_kwh: number('Nur Raumheizung im Ausgangszeitraum in kWh.', 0, 100000),
      after_kwh: number('Nur Raumheizung im Testzeitraum in kWh.', 0, 100000),
      before_days: number('Dauer des Ausgangszeitraums in Tagen.', 1, 366),
      after_days: number('Dauer des Testzeitraums in Tagen.', 1, 366),
      comparable: yesNo('Wetter, Belegung und Heizkomfort waren vergleichbar und nur der Heizzeitplan wurde geändert.'),
    },
    calculate(args) {
      const before = args.before_kwh / args.before_days;
      const after = args.after_kwh / args.after_days;
      return {
        before_kwh_per_day: round(before), after_kwh_per_day: round(after),
        observed_difference_kwh_per_day: args.comparable ? round(before - after) : null,
        assumption: 'Tagesmittel aus gemessenen Zeiträumen. Komfort und Feuchte mitbeobachten. Keine Hochrechnung auf garantierte Jahresersparnis.',
      };
    },
    example: {args: {before_kwh: 40, after_kwh: 27, before_days: 4, after_days: 3, comparable: true}, expect: {observed_difference_kwh_per_day: 1}},
  },
  {
    name: 'heizstart_vorlauf_planen',
    description: 'Raumheizung anhand des beobachteten Wiederaufheizens vor der Nutzung starten — Plan morning heating lead time from measured recovery.',
    page: setback,
    properties: {
      ready_hour: number('Gewünschte Uhrzeit auf der 24-Stunden-Uhr, ganze Stunde.', 0, 23),
      ready_minute: number('Gewünschte Minute der Stunde, ganzzahlig.', 0, 59),
      recovery_minutes: number('Gemessene Dauer bis zum gewünschten Raumkomfort in Minuten, ganzzahlig.', 0, 720),
      buffer_minutes: number('Zusätzlicher Zeitpuffer in Minuten, ganzzahlig.', 0, 120),
    },
    calculate(args) {
      if (!Object.values(args).every(Number.isInteger)) throw new RangeError('Ganze Uhrzeiten und Minuten erforderlich.');
      const start = args.ready_hour * 60 + args.ready_minute - args.recovery_minutes - args.buffer_minutes;
      const minutes = (start + 1440) % 1440;
      const time = [Math.floor(minutes / 60), minutes % 60].map(value => String(value).padStart(2, '0')).join(':');
      return {local_start_time: time, previous_day: start < 0, assumption: 'Gemessener Vorlauf unter ähnlichen Bedingungen. Gilt für Raumkomfort und Zeitplanung.'};
    },
    example: {args: {ready_hour: 0, ready_minute: 15, recovery_minutes: 45, buffer_minutes: 0}, expect: {local_start_time: '23:30', previous_day: true}},
  },
  {
    name: 'nutzwaerme_kostenvergleich',
    description: 'Zwei Wärmeerzeuger für dieselbe abgegebene Nutzwärme vergleichen — Compare variable costs for an equal amount of delivered heat.',
    page: heatCompare,
    properties: {
      useful_kwh: number('Benötigte Nutzwärme im Vergleichszeitraum in kWh.', 0, 100000),
      factor_a: number('Nutzwärme je kWh Einsatz für A im Zeitraum.', 0.05, 10),
      factor_b: number('Nutzwärme je kWh Einsatz für B im Zeitraum.', 0.05, 10),
      price_a: energyPrice, price_b: energyPrice,
    },
    calculate(args) {
      const inputA = args.useful_kwh / args.factor_a;
      const inputB = args.useful_kwh / args.factor_b;
      return {
        input_a_kwh: round(inputA), input_b_kwh: round(inputB),
        variable_cost_a_eur: round(inputA * args.price_a), variable_cost_b_eur: round(inputB * args.price_b),
        assumption: 'Gleiche Wärmemenge und Bilanzgrenze. Preise der jeweiligen eingesetzten Energie verwenden. Fixkosten und Anschaffung fehlen.',
      };
    },
    example: {args: {useful_kwh: 1200, factor_a: 1, factor_b: 3, price_a: 0.3, price_b: 0.3}, expect: {variable_cost_a_eur: 360, variable_cost_b_eur: 120}},
  },
  {
    name: 'bauteil_waermeverlust',
    description: 'Wärmefluss durch ein bekanntes Bauteil vor und nach einer U-Wert-Änderung vergleichen — Compare steady-state transmission through one building element.',
    page: guide('heizkosten-senken-als-mieter'),
    properties: {
      area_m2: number('Nettofläche des Bauteils in m².', 0.01, 10000),
      old_u: number('Bisheriger U-Wert in W/(m²·K).', 0.01, 10),
      new_u: number('Vergleichs-U-Wert in W/(m²·K).', 0.01, 10),
      difference_k: number('Temperaturdifferenz auf beiden Seiten des Bauteils in K.', 0, 100),
    },
    calculate(args) {
      const before = args.area_m2 * args.old_u * args.difference_k;
      const after = args.area_m2 * args.new_u * args.difference_k;
      return {
        before_w: round(before), after_w: round(after), difference_w: round(before - after),
        assumption: 'Stationäre Rechnung U × Fläche × Temperaturdifferenz. Ohne Lüftung, Wärmebrücken, Sonne und Speichereffekte. Für den tatsächlichen Aufbau belegte U-Werte verwenden.',
      };
    },
    example: {args: {area_m2: 10, old_u: 2, new_u: 1, difference_k: 20}, expect: {before_w: 400, after_w: 200}},
  },
  {
    name: 'winterfenster_zugluft_pruefen',
    description: 'Kalte Scheibe, undichte Fuge oder schlecht schließenden Fensterflügel unterscheiden — Distinguish window downdraught, seal leaks and closing problems.',
    page: draft,
    properties: {
      sensation: choice('Wo wird Luftbewegung beobachtet?', ['joint', 'glass', 'unknown']),
      closes_properly: yesNo('Schließt und verriegelt der Flügel normal?'),
      seal_damaged: yesNo('Ist die Dichtung sichtbar beschädigt oder fehlt sie?'),
    },
    calculate({sensation, closes_properly, seal_damaged}) {
      if (!closes_properly) return {check: 'hardware', guidance: 'Beschlag und Ausrichtung prüfen lassen. Vor Änderungen den Zustand dokumentieren.'};
      if (seal_damaged || sensation === 'joint') return {check: 'seal_profile', guidance: 'Fuge und Dichtprofil am geschlossenen Fenster prüfen. Vorgesehene Lüftungs-, Verbrennungsluft- und Entwässerungsöffnungen freihalten.'};
      if (sensation === 'glass') return {check: 'cold_surface', guidance: 'Kaltluftabfall an der Scheibe ist möglich. Sitzplatz prüfen und Heizkörper sowie Thermostat frei lassen.'};
      return {check: 'locate_air_movement', guidance: 'Mit der Hand oder einem leichten Papierstreifen die geschlossene Fuge absuchen. Keine offene Flamme verwenden.'};
    },
    example: {args: {sensation: 'glass', closes_properly: true, seal_damaged: false}, expect: {check: 'cold_surface'}},
  },
  {
    name: 'heizwaerme_arbeitsplatz',
    description: 'Persönliche Wärme oder Raumheizung am Arbeitsplatz nach Bedarf einordnen — Decide how to address local discomfort or an underheated room.',
    page: guide('homeoffice-warm-bleiben'),
    properties: {
      entire_room_cold: yesNo('Ist der Raum insgesamt zu kühl?'),
      beside_cold_surface: yesNo('Liegt der Sitzplatz direkt an einer kalten Scheibe oder im Luftzug?'),
      fixed_work_schedule: yesNo('Wird der Raum zu wiederkehrenden Zeiten genutzt?'),
    },
    calculate({entire_room_cold, beside_cold_surface, fixed_work_schedule}) {
      if (entire_room_cold) return {priority: 'room_heating', guidance: fixed_work_schedule ? 'Raumtemperatur messen, vorhandene Heizung prüfen und ihren Zeitplan an die Arbeitszeiten anpassen.' : 'Raumtemperatur und Feuchte messen und Funktion der vorhandenen Heizung prüfen.'};
      if (beside_cold_surface) return {priority: 'seat_position', guidance: 'Zuerst Arbeitsplatz aus kalter Oberflächenzone oder Zugluft versetzen.'};
      return {priority: 'personal_comfort', guidance: 'Kleidung, Bewegung oder eine unbeheizte Decke prüfen. Bei elektrischer Zusatzwärme Herstellerangaben und Eignung beachten.'};
    },
    example: {args: {entire_room_cold: false, beside_cold_surface: true, fixed_work_schedule: true}, expect: {priority: 'seat_position'}},
  },
  {
    name: 'heizfuehler_standort',
    description: 'Platz eines Raumtemperaturfühlers auf typische Messfehler prüfen — Check placement of a room sensor for heat, draught and obstructions.',
    page: guide('infrarotheizung-thermostat'),
    properties: {
      near_heat_or_sun: yesNo('Ist der Fühler nahe einer Wärmequelle, direkter Sonne oder Wärmestrahlung?'),
      in_draught: yesNo('Wird der Fühler regelmäßig durch Zugluft abgekühlt?'),
      covered: yesNo('Ist der Fühler durch Möbel oder Vorhänge abgeschirmt?'),
    },
    calculate(args) {
      const influences = [
        ...(args.near_heat_or_sun ? ['heat_or_sun'] : []),
        ...(args.in_draught ? ['draught'] : []),
        ...(args.covered ? ['obstruction'] : []),
      ];
      return {
        influences, retest: influences.length > 0,
        guidance: 'Fühler nach Anleitung an einen repräsentativen Ort setzen und dort mit einem Raumthermometer vergleichen. Bei fest verbauten Reglern die zuständige Stelle einbeziehen.',
      };
    },
    example: {args: {near_heat_or_sun: false, in_draught: true, covered: true}, expect: {influences: ['draught', 'obstruction'], retest: true}},
  },
  {
    name: 'duschdurchfluss_messen',
    description: 'Duschdurchfluss aus aufgefangener Wassermenge und Zeit bestimmen — Compute shower flow from a bucket measurement.',
    page: shower,
    properties: {litres: number('Aufgefangenes Volumen in Litern.', 0.05, 100), seconds: number('Messzeit in Sekunden.', 1, 600)},
    calculate({litres, seconds}) {
      return {litres_per_minute: round(litres * 60 / seconds), assumption: 'Bei üblicher Armaturstellung und Duschtemperatur messen. Gefäß sicher abstellen und Verbrühung vermeiden.'};
    },
    example: {args: {litres: 2, seconds: 15}, expect: {litres_per_minute: 8}},
  },
  {
    name: 'duschwasser_mischverhaeltnis',
    description: 'Warm- und Kaltwasseranteil für gemischtes Duschwasser aus gemessenen Temperaturen berechnen — Calculate hot and cold fractions at the shower mixer.',
    page: shower,
    properties: {
      mixed_litres: number('Gemischte Wassermenge in Litern.', 0.1, 5000),
      cold_c: number('Kaltwasser am Mischer in °C.', 0, 35),
      hot_c: number('Warmwasser am Mischer in °C.', 20, 90),
      mixed_c: number('Gemessene Mischtemperatur in °C.', 1, 50),
    },
    calculate(args) {
      if (!(args.hot_c > args.cold_c && args.mixed_c >= args.cold_c && args.mixed_c <= args.hot_c)) {
        throw new RangeError('Die Mischtemperatur muss zwischen den Zulauftemperaturen liegen.');
      }
      const hot = args.mixed_litres * (args.mixed_c - args.cold_c) / (args.hot_c - args.cold_c);
      return {
        hot_litres: round(hot), cold_litres: round(args.mixed_litres - hot),
        assumption: 'Ideale Mischung ohne Abkühlung, mit am Mischer gemessenen Werten. Die Rechnung setzt keine Speichertemperatur fest.',
      };
    },
    example: {args: {mixed_litres: 75, cold_c: 10, hot_c: 55, mixed_c: 40}, expect: {hot_litres: 50, cold_litres: 25}},
  },
  {
    name: 'sparbrause_kostenvergleich',
    description: 'Zwei Duschdurchflüsse bei gleicher Zeit und Temperatur einschließlich Wasser und Wärme vergleichen — Compare shower-head scenarios including water and energy.',
    page: shower,
    properties: {
      flow: number('Bisherige Liter pro Minute.', 0.1, 40),
      newflow: number('Alternativdurchfluss in Litern pro Minute.', 0.1, 40),
      minutes: number('Minuten je Dusche.', 0.1, 120),
      count: number('Anzahl Duschen im Jahr.', 1, 5000),
      cold: number('Kaltwasser in °C.', 0, 40),
      warm: number('Gemischtes Duschwasser in °C.', 1, 55),
      factor: number('Nutzwärme je kWh eingesetzter Energie.', 0.1, 8),
      price: energyPrice,
      water: number('Wasser und Abwasser in EUR/m³.', 0, 30),
      cost: number('Einmalkosten in Euro.', 0, 1000),
    },
    calculate(args) {
      const {before, after, annual, waterSaved, payback} = winter('shower', args);
      return {
        before_eur_per_shower: round(before.cost), after_eur_per_shower: round(after.cost),
        annual_water_difference_m3: round(waterSaved), annual_cost_difference_eur: round(annual),
        payback_years: payback === null ? null : round(payback),
        assumption: 'Szenario bei gleicher Duschzeit und Temperatur. Ohne Speicher- und Leitungsverluste. Herstellerfreigabe und Mindestdurchfluss separat prüfen.',
      };
    },
    example: {args: {flow: 10, newflow: 5, minutes: 10, count: 100, cold: 10, warm: 40, factor: 1, price: 0.3, water: 4, cost: 10}, expect: {annual_water_difference_m3: 5}},
  },
  {
    name: 'sparbrause_mindestdurchfluss',
    description: 'Gemessenen Duschdurchfluss gegen den dokumentierten Einschaltwert des Durchlauferhitzers prüfen — Compare measured shower flow with the heater’s specified activation threshold.',
    page: shower,
    properties: {
      documented_min_l_min: number('Durch Herstellerunterlagen belegter Mindestdurchfluss in l/min. 0 steht für unbekannt.', 0, 40),
      observed_l_min: number('Gemessener Durchfluss bei üblicher Einstellung in l/min.', 0, 60),
    },
    calculate({documented_min_l_min: minimum, observed_l_min: flow}) {
      const status = minimum === 0 ? 'documentation_needed' : flow < minimum ? 'below_minimum' : 'threshold_met';
      return {
        status, margin_l_min: minimum > 0 ? round(flow - minimum) : null,
        guidance: 'Ein erreichter Schwellwert prüft genau eine Bedingung. Wenn sich der Mindestwert auf das Gerät bezieht, den Durchfluss dort mit Hersteller oder Fachbetrieb abgleichen und den Armaturtyp, Druck sowie die Herstellerfreigabe prüfen.',
      };
    },
    example: {args: {documented_min_l_min: 4, observed_l_min: 3.5}, expect: {status: 'below_minimum', margin_l_min: -0.5}},
  },
  {
    name: 'warmwasser_warteverlust',
    description: 'Wasserbedarf während der Wartezeit bis zum warmen Duschwasser schätzen — Estimate the water drawn before warm water reaches the shower.',
    page: shower,
    properties: {
      flow_l_min: number('Gemessener Durchfluss während der Wartezeit in l/min.', 0.01, 60),
      wait_seconds: number('Zeit bis zur gewünschten Temperatur in Sekunden.', 0, 600),
      times_per_year: number('Vergleichbare Starts pro Jahr.', 0, 10000),
      water_eur_m3: number('Mengenabhängiger Wasser- und Abwasserpreis in EUR/m³.', 0, 30),
    },
    calculate(args) {
      const litres = args.flow_l_min * args.wait_seconds / 60;
      const annual = litres * args.times_per_year / 1000;
      return {
        litres_per_start: round(litres), annual_m3: round(annual), annual_water_cost_eur: round(annual * args.water_eur_m3),
        assumption: 'Konstanter Durchfluss während der Wartezeit. Nur Wasserkosten, ohne Wärmeverlust oder hygienische Bewertung.',
      };
    },
    example: {args: {flow_l_min: 8, wait_seconds: 30, times_per_year: 250, water_eur_m3: 5}, expect: {litres_per_start: 4, annual_m3: 1, annual_water_cost_eur: 5}},
  },
  {
    name: 'lichterkette_timer_netto',
    description: 'Lichterketten-Zeitplan inklusive Dauerverbrauch des Timers vergleichen — Check net lighting savings after accounting for timer overhead.',
    page: guide('lichterkette-stromkosten'),
    properties: {
      watts: number('Gesamtleistung der Lichterkette in W.', 0, 5000),
      hours: number('Bisherige Leuchtdauer pro Tag in Stunden.', 0, 24),
      newhours: number('Geplante Leuchtdauer pro Tag in Stunden.', 0, 24),
      days: number('Nutzungstage, an denen der Timer steckt.', 1, 366),
      timer: number('Eigenverbrauch des Timers in W.', 0, 100),
      price: energyPrice,
    },
    calculate(args) {
      const {before, after, saving} = winter('lights', args);
      return {
        before_kwh: round(before), after_kwh: round(after), net_saving_eur: round(saving),
        assumption: 'Der Timer benötigt während der angegebenen Tage rund um die Uhr Strom. Anschaffung und Stromaufnahme außerhalb dieser Tage fehlen.',
      };
    },
    example: {args: {watts: 20, hours: 8, newhours: 4, days: 100, timer: 1, price: 0.25}, expect: {before_kwh: 16, after_kwh: 10.4, net_saving_eur: 1.4}},
  },
  {
    name: 'heizkreis_waermeabgabe',
    description: 'Wärmeleistung eines wassergeführten Heizkreises aus vorliegenden Messwerten abschätzen — Estimate water-loop heat delivery from recorded flow and temperature drop.',
    page: radiator,
    properties: {
      flow_l_hour: number('Gemessener Volumenstrom aus der Anlagenanzeige in l/h.', 0, 20000),
      supply_c: number('Gemessener Vorlauf in °C.', 0, 100),
      return_c: number('Gemessener Rücklauf in °C.', 0, 100),
    },
    calculate(args) {
      const drop = args.supply_c - args.return_c;
      if (drop < 0) throw new RangeError('Für Heizbetrieb muss der Vorlauf mindestens so warm wie der Rücklauf sein.');
      return {
        delta_k: round(drop), estimated_heat_kw: round(args.flow_l_hour * drop * 0.001163),
        assumption: 'Näherung für Wasser mit 1,163 Wh/(Liter·K); bei anderen Wärmeträgern gelten deren Stoffwerte. Werte am selben Heizkreis im stabilen Betrieb ablesen. Die Schätzung setzt keine Anlageneinstellung fest.',
      };
    },
    example: {args: {flow_l_hour: 500, supply_c: 40, return_c: 35}, expect: {delta_k: 5, estimated_heat_kw: 2.9075}},
  },
];
