import catalog from '../data/dehum-catalog.json' with {type:'json'};
import {
  checkWindowCondensation, dewPoint, WINDOW_CONDENSATION_PAGE, WINDOW_CONDENSATION_URL,
} from '../site/assets/fenster-taucheck.mjs';

const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const bool = description => ({type:'boolean', description});
const choice = (description, values) => ({type:'string', description, enum:values});
const round = (value, digits = 2) => Number(value.toFixed(digits));
const roomTemperature = number('Lufttemperatur innen in °C.', 0, 40);
const roomHumidity = number('Relative Feuchte der Raumluft in Prozent.', 1, 100);

// The guide's Magnus approximation over water, with vapour pressure in hPa.
const saturation = celsius => 6.112 * Math.exp(17.62 * celsius / (243.12 + celsius));
const vapourPressure = (celsius, relativeHumidity) => saturation(celsius) * relativeHumidity / 100;
const vapourDensity = (celsius, relativeHumidity) => 216.7 * vapourPressure(celsius, relativeHumidity) / (273.15 + celsius);

const coldModels = catalog.products.filter(model => model.status === 'verified' &&
  ['meaco-one-20', 'meaco-two-12', 'stadler-lukas'].includes(model.id));

const cellarGuide = '/guide/luftentfeuchter-keller.html';
const cellarTestSources = {
  'meaco-one-20': {
    model:'MeacoDry Arete One 20L',
    source:'https://eu.meaco.com/products/meacodry-arete-one-20l-luftentfeuchter-luftreiniger',
    points:[{c:10, rh:60, litres:3.4, watts:180}, {c:20, rh:60, litres:8.5, watts:216}],
  },
  'comfee-mddf20': {
    model:'Comfee MDDF-20DEN7 ohne WF',
    source:'https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2',
    points:[],
  },
};

export const moistureSuite = [
  {
    name:'fenster_oberflaeche_taucheck',
    description:'Kondenswasser am Fenster einordnen: gemessene Innenscheibe oder Wand mit dem Taupunkt vergleichen — Check a measured indoor glass or wall surface against the dew point.',
    page:WINDOW_CONDENSATION_PAGE,
    properties:{
      room_c:roomTemperature,
      room_rh_pct:roomHumidity,
      surface_c:number('Gemessene Temperatur der Oberfläche in °C.',-20,55),
    },
    calculate(values) {
      return {
        ...checkWindowCondensation(values),
        assumption:'Taupunkt-Näherung für zeitgleich gemessene Raumluft und Oberfläche. Bei höchstens 1 °C Abstand erneut messen. Das ist eine Orientierung und keine Angabe zur Messgenauigkeit. Kein Nachweis für Bauzustand oder Schimmelfreiheit.',
        buying_note:'Tuch oder geeigneter Fenstersauger nehmen sichtbare Tropfen auf. Bei wiederkehrender Nässe die Ursache prüfen, bevor du ein Gerät kaufst.',
        share_url:WINDOW_CONDENSATION_URL,
      };
    },
    example:{args:{room_c:20, room_rh_pct:60, surface_c:10}, expect:{condensation_possible:true, dew_point_c:12}},
  },
  {
    name:'fenster_beschlag_einordnen',
    description:'Beschlag außen, innen oder zwischen Glasscheiben einordnen — Interpret the side on which window condensation is observed.',
    page:'/guide/fenster-beschlagen-aussen.html',
    properties:{
      side:choice('Seite anhand einer erreichbaren Oberfläche prüfen: outside, inside, between, unknown.', ['outside','inside','between','unknown']),
    },
    calculate({side}) {
      const advice = {
        outside:'Die Außenscheibe kann im Freien abkühlen. Außenbeschlag allein zeigt keinen Bedarf zur Raumentfeuchtung.',
        inside:'Raumtemperatur, relative Feuchte und Scheibentemperatur vergleichen. Wiederkehrende Nässe dokumentieren.',
        between:'Vermuteten Beschlag im Scheibenzwischenraum dokumentieren und Verglasung vom Fensterbetrieb prüfen lassen.',
        unknown:'Sicher erreichbare Innenseite auf Wischbarkeit prüfen. Unklaren Beschlag fotografieren und beobachten.',
      };
      return {observed_side:side, next_step:advice[side], assumption:'Eine Sichtbeobachtung bestimmt weder die Dichtheit noch die Ursache sicher.'};
    },
    example:{args:{side:'between'}, expect:{observed_side:'between'}},
  },
  {
    name:'raumluft_wassermenge',
    description:'Wassermenge zwischen zwei Feuchtewerten in einem Luftvolumen berechnen — Estimate the grams of water in room air above a chosen relative humidity.',
    page:'/guide/luftentfeuchter-zieht-kein-wasser.html',
    properties:{
      volume_m3:number('Luftvolumen des Raums in m³.',1,2000),
      room_c:roomTemperature,
      current_rh_pct:roomHumidity,
      target_rh_pct:roomHumidity,
    },
    calculate({volume_m3, room_c, current_rh_pct, target_rh_pct}) {
      const current = vapourDensity(room_c,current_rh_pct) * volume_m3;
      const target = vapourDensity(room_c,target_rh_pct) * volume_m3;
      return {
        current_water_g:round(current,1),
        excess_water_g:round(Math.max(0,current-target),1),
        assumption:'Konstante Temperatur, homogen gemischte Luft. Wände, Wäsche, Lüftung und Quellen sind nicht eingerechnet. Keine Geräte- oder Tagesleistung.',
      };
    },
    example:{args:{volume_m3:40,room_c:18,current_rh_pct:60,target_rh_pct:50}, expect:{excess_water_g:61.3}},
  },
  {
    name:'luftfeuchte_bei_temperaturwechsel',
    description:'Relative Feuchte nach Heizen oder Abkühlen ohne Feuchtenachschub abschätzen — Estimate changed relative humidity for a fixed air-water mass.',
    page:'/guide/luftfeuchtigkeit-richtig-messen.html',
    properties:{
      initial_c:roomTemperature,
      initial_rh_pct:roomHumidity,
      final_c:roomTemperature,
    },
    calculate({initial_c, initial_rh_pct, final_c}) {
      const equivalent = 100 * vapourDensity(initial_c,initial_rh_pct) / vapourDensity(final_c,100);
      return {
        implied_rh_pct:round(Math.min(equivalent,100),1),
        saturation_exceeded:equivalent>100+1e-9,
        assumption:'Feste Wassermasse pro m³ und unverändertes Raumvolumen. Über Sättigung ist Kondensation möglich. Heizen allein führt kein Wasser aus dem Raum ab.',
      };
    },
    example:{args:{initial_c:20,initial_rh_pct:50,final_c:20}, expect:{implied_rh_pct:50,saturation_exceeded:false}},
  },
  {
    name:'lueften_messwirkung',
    description:'Vorher-nachher-Messung nach dem Lüften in Gramm pro Kubikmeter vergleichen — Measure whether room air actually held less water after ventilation.',
    page:'/guide/richtig-lueften-im-winter.html',
    properties:{
      before_c:roomTemperature,
      before_rh_pct:roomHumidity,
      after_c:roomTemperature,
      after_rh_pct:roomHumidity,
      same_position:bool('Waren Messort und Gerät vergleichbar und beide Messungen stabil?'),
    },
    calculate({before_c,before_rh_pct,after_c,after_rh_pct,same_position}) {
      const before = vapourDensity(before_c,before_rh_pct);
      const after = vapourDensity(after_c,after_rh_pct);
      return {
        net_change_g_per_m3:same_position ? round(after-before,2) : null,
        assumption:'Veränderung der Raumluft am Messpunkt. Feuchtespeicher, Quellen und Sensorabweichung beeinflussen die Beobachtung. Möglichst zur üblichen Raumtemperatur zurückkehren.',
      };
    },
    example:{args:{before_c:20,before_rh_pct:60,after_c:20,after_rh_pct:50,same_position:true},expect:{net_change_g_per_m3:-1.72}},
  },
  {
    name:'hygrometer_messbereiche',
    description:'Zwei Hygrometer mit ihren angegebenen Genauigkeiten vergleichen — Check whether two humidity readings overlap within stated measurement tolerances.',
    page:'/guide/luftfeuchtigkeit-richtig-messen.html',
    properties:{
      reading_a_pct:roomHumidity,
      accuracy_a_pp:number('Angegebene absolute Toleranz des ersten Geräts in Prozentpunkten.',0,25),
      reading_b_pct:roomHumidity,
      accuracy_b_pp:number('Angegebene absolute Toleranz des zweiten Geräts in Prozentpunkten.',0,25),
    },
    calculate({reading_a_pct,accuracy_a_pp,reading_b_pct,accuracy_b_pp}) {
      const gap = Math.abs(reading_a_pct-reading_b_pct);
      return {
        difference_pp:round(gap),
        stated_ranges_overlap:gap <= accuracy_a_pp+accuracy_b_pp,
        assumption:'Gleicher Messort, gleiche Temperatur, ausreichende Angleichzeit und Gültigkeit der Herstellerangaben. Eine Überlappung ist keine Kalibrierung.',
      };
    },
    example:{args:{reading_a_pct:60,accuracy_a_pp:2,reading_b_pct:65,accuracy_b_pp:2}, expect:{difference_pp:5,stated_ranges_overlap:false}},
  },
  {
    name:'hygrometer_messort_pruefen',
    description:'Messort für einen vergleichbaren Raumwert auswählen — Check whether hygrometer placement is suitable for tracking room-air humidity.',
    page:'/guide/luftfeuchtigkeit-richtig-messen.html',
    properties:{
      in_direct_sun_or_heat:bool('Direkte Sonne oder nah an Heizkörper beziehungsweise Wärmequelle?'),
      near_window_or_cold_wall:bool('Direkt am Fenster oder an einer kalten Wand?'),
      near_moisture_source:bool('Direkt bei Dusche, Wäsche oder anderem Feuchteeintrag?'),
    },
    calculate({in_direct_sun_or_heat,near_window_or_cold_wall,near_moisture_source}) {
      const issues = [
        in_direct_sun_or_heat && 'Direkte Sonne und Wärmequellen meiden.',
        near_window_or_cold_wall && 'Raummessung von Fenster und kalter Wand abrücken.',
        near_moisture_source && 'Abstand zu lokalen Feuchtequellen schaffen.',
      ].filter(Boolean);
      return {
        placement_suitable:issues.length===0,
        changes:issues,
        assumption:'Für einen vergleichbaren Raumwert einen gleichbleibenden Ort mit freiem Luftkontakt gemäß Geräteanleitung wählen. Feuchte an Oberflächen getrennt betrachten.',
      };
    },
    example:{args:{in_direct_sun_or_heat:false,near_window_or_cold_wall:true,near_moisture_source:false},expect:{placement_suitable:false}},
  },
  {
    name:'entfeuchter_kalt_messvergleich',
    description:'Eigene Kondensatmengen bei zwei Temperaturen vergleichen — Normalize two dehumidifier collection measurements to a day at the same humidity.',
    page:'/guide/luftentfeuchter-keller.html',
    properties:{
      cold_l:number('Gesammeltes Wasser im kälteren Versuch in Litern.',0,100),
      cold_h:number('Dauer des kälteren Versuchs in Stunden.',0.5,72),
      warmer_l:number('Gesammeltes Wasser im wärmeren Versuch in Litern.',0,100),
      warmer_h:number('Dauer des wärmeren Versuchs in Stunden.',0.5,72),
      comparable_humidity_and_settings:bool('Waren Luftfeuchte, Gerät, Modus und Messbedingungen vergleichbar?'),
    },
    calculate({cold_l,cold_h,warmer_l,warmer_h,comparable_humidity_and_settings}) {
      const cold = 24*cold_l/cold_h;
      const warmer = 24*warmer_l/warmer_h;
      return {
        cold_extrapolated_l_per_day:round(cold),
        warmer_extrapolated_l_per_day:round(warmer),
        difference_l_per_day:comparable_humidity_and_settings ? round(warmer-cold) : null,
        assumption:'Rechnerische Normierung zweier eigener Messungen, keine Zusage für den nächsten Tag. Feuchtezufuhr und Abtauphasen können das Ergebnis beeinflussen.',
      };
    },
    example:{args:{cold_l:1,cold_h:8,warmer_l:4,warmer_h:12,comparable_humidity_and_settings:true},expect:{difference_l_per_day:5}},
  },
  {
    name:'kellerentfeuchter_pruefpunkt_abgleichen',
    description:'Welche Entzugsleistung in Litern pro Tag und wie viel Watt nennt der Hersteller bei meiner gemessenen Kellertemperatur und Luftfeuchte? Prüfpunkte für Meaco Arete One 20L und Comfee MDDF-20DEN7 bei 10 oder 20 Grad und 60 Prozent vergleichen — Match a measured cellar condition to a documented German dehumidifier test point.',
    page:cellarGuide,
    guide_url:'https://getecoback.com' + cellarGuide + '#kalter-keller',
    properties:{
      modell:choice('Genaue Ausführung laut Typenschild: MeacoDry Arete One 20L oder Comfee MDDF-20DEN7 ohne WF.', Object.keys(cellarTestSources)),
      temperatur_c:number('Gemessene Lufttemperatur am Messort in °C.', -20, 50),
      relative_feuchte_pct:number('Am selben Ort und zur selben Zeit gemessene relative Luftfeuchte in Prozent.', 0, 100),
      wiederholt_gemessen:bool('Hast du Temperatur und Feuchte über mehrere Tage am gleichen Ort beobachtet?'),
      befund:choice('Bisherige Beobachtung im Keller.', ['unauffaellig', 'feuchte_auffaellig', 'wassereintritt_oder_schaden']),
    },
    calculate({modell, temperatur_c, relative_feuchte_pct, wiederholt_gemessen, befund}) {
      const source = cellarTestSources[modell];
      const evidence = {modell:source.model, liter_pro_tag:null, leistungsaufnahme_w:null, quellenmarkt:'DE',
        quellenpruefung:'2026-11-20', quelle:source.source};
      if (befund === 'wassereintritt_oder_schaden') {
        return {...evidence, status:'ursache_klaeren', hinweis:'Bei eindringendem Wasser, nassen Wänden oder Schimmel zuerst die Ursache fachlich klären. Den Kauf zurückstellen.'};
      }
      if (!wiederholt_gemessen) {
        return {...evidence, status:'zuerst_messen', hinweis:'Temperatur und Feuchte mehrere Tage am gleichen Ort messen. Ein einzelner Messwert begründet keinen Kauf.'};
      }
      if (befund === 'unauffaellig') {
        return {...evidence, status:'kein_kaufbedarf_belegt', hinweis:'Bei unauffälligen Beobachtungen ist aus diesen Messwerten kein Bedarf für einen Entfeuchter belegt.'};
      }
      const point = source.points.find(row => row.c === temperatur_c && row.rh === relative_feuchte_pct);
      if (!point) {
        return {...evidence, status:'wertepaar_offen', hinweis:'Für diese Ausführung und genau deine Bedingungen ist hier kein Wertepaar aus Wasserentzug und Leistungsaufnahme belegt. Frage beim Hersteller nach. Eine Nennangabe oder ein benachbarter Prüfpunkt genügt dafür nicht.'};
      }
      return {...evidence, status:'hersteller_pruefpunkt', temperatur_c:point.c, relative_feuchte_pct:point.rh,
        liter_pro_tag:point.litres, leistungsaufnahme_w:point.watts,
        hinweis:'Hersteller-Prüfwert bei den angegebenen Bedingungen. Luftwechsel, Feuchtenachschub und Abtauphasen beeinflussen den tatsächlichen Entzug im Keller. Ursache und Wasserablauf vor der Auswahl prüfen.'};
    },
    example:{args:{modell:'meaco-one-20', temperatur_c:10, relative_feuchte_pct:60, wiederholt_gemessen:true, befund:'feuchte_auffaellig'},
      expect:{status:'hersteller_pruefpunkt', liter_pro_tag:3.4, leistungsaufnahme_w:180}},
  },
  {
    name:'entfeuchter_kalt_modellbeleg',
    description:'Kaltkeller-Daten für die genaue Entfeuchtervariante nachschlagen — Retrieve verified cold-room evidence and limitations for an exact model.',
    page:'/guide/luftentfeuchter-keller.html',
    properties:{
      model:choice('Modellschlüssel: meaco-one-20 = Arete One 20L, meaco-two-12 = Arete Two 12L, stadler-lukas = Lukas weiss L-031E.',coldModels.map(model=>model.id)),
    },
    calculate({model}) {
      const product = coldModels.find(candidate=>candidate.id===model);
      const evidence = {
        'meaco-one-20':'Herstellerangabe UK: 3,4 L/Tag bei 10 °C und 60 % relativer Feuchte. Deutsche Ausführung separat prüfen.',
        'meaco-two-12':'Der belegte Vergleichspunkt 5,40 L/Tag gilt bei 20 °C und 60 % relativer Feuchte. Kein gesicherter 10-°C-Wert im Katalog.',
        'stadler-lukas':'Die genannte Betriebsgrenze von 5 °C liefert keinen Entzugswert für einen kalten Keller.',
      };
      return {
        variant:product.variant,
        cold_evidence:evidence[model],
        source_url:product.source,
        source_label:product.source_label,
        catalog_checked:catalog.checked,
        assumption:'Ein Vergleich erfordert dieselben Angaben zu Temperatur und relativer Feuchte. Betriebspunkt, Einsatzgrenze und Geräteleistung sind unterschiedliche Größen.',
      };
    },
    example:{args:{model:'meaco-one-20'},expect:{source_url:'https://www.meaco.com/products/meacodry-arete-one-20l-dehumidifier-and-air-purifier'}},
  },
  {
    name:'entfeuchter_tank_leerintervall',
    description:'Zeit bis zum vollen Entfeuchtertank aus eigener Messung abschätzen — Estimate tank-emptying interval from collected water and time.',
    page:'/guide/luftentfeuchter-keller.html',
    properties:{
      free_capacity_l:number('Noch freies nutzbares Tankvolumen in Litern bis zur Abschaltung.',0,100),
      collected_l:number('Im Vergleichszeitraum tatsächlich gesammelte Liter.',0,100),
      measured_h:number('Vergleichszeitraum in Stunden.',0.25,336),
    },
    calculate({free_capacity_l,collected_l,measured_h}) {
      const rate = collected_l/measured_h;
      return {
        observed_l_per_hour:round(rate,3),
        estimated_hours_until_full:free_capacity_l===0 ? 0 : collected_l>=0.001 ? round(free_capacity_l/rate,1) : null,
        assumption:'Gleichbleibende Entnahmerate und mindestens 1 ml messbarer Ertrag. Brauchbares Tankvolumen und Abschaltung den Modellangaben entnehmen; Anleitung und Aufsichtsvorgaben gelten.',
      };
    },
    example:{args:{free_capacity_l:2.5,collected_l:1,measured_h:4},expect:{estimated_hours_until_full:10}},
  },
  {
    name:'entfeuchter_leerer_tank_check',
    description:'Leeren Tank vor einem Ersatzkauf eingrenzen — Troubleshoot an empty dehumidifier tank using the actual setting, temperature and drain mode.',
    page:'/guide/luftentfeuchter-zieht-kein-wasser.html',
    properties:{
      current_rh_pct:roomHumidity,
      setpoint_rh_pct:roomHumidity,
      room_c:roomTemperature,
      documented_minimum_c:number('Mindesttemperatur laut Anleitung für den gewählten Modus.',-10,40),
      hose_in_use:bool('Ablaufschlauch statt Tankbetrieb angeschlossen?'),
    },
    calculate({current_rh_pct,setpoint_rh_pct,room_c,documented_minimum_c,hose_in_use}) {
      return {
        hose_may_bypass_tank:hose_in_use,
        measured_humidity_at_or_below_setpoint:current_rh_pct <= setpoint_rh_pct,
        below_documented_operating_limit:room_c < documented_minimum_c,
        next_step:'Ablauf, Luftwege, eingestellten Sollwert und Abtauhinweise gemäß Anleitung kontrollieren. Bei Fehleranzeige oder anhaltender Abweichung Kundendienst fragen.',
        assumption:'Dieser Check schließt einen Defekt weder aus noch weist er einen nach. Gehäuse geschlossen lassen.',
      };
    },
    example:{args:{current_rh_pct:48,setpoint_rh_pct:50,room_c:8,documented_minimum_c:10,hose_in_use:false},expect:{measured_humidity_at_or_below_setpoint:true,below_documented_operating_limit:true}},
  },
  {
    name:'entfeuchter_energie_je_liter',
    description:'Gemessene kWh pro Liter Kondensat und Kosten je Liter berechnen — Calculate the actual energy and tariff cost per litre collected.',
    page:'/guide/luftentfeuchter-dauerbetrieb-stromkosten.html',
    properties:{
      measured_kwh:number('Stromverbrauch der Periode in kWh.',0,1000),
      collected_l:number('In derselben Periode gesammelte Liter.',0,250),
      price_eur_per_kwh:number('Arbeitspreis in Euro pro kWh.',0,5),
    },
    calculate({measured_kwh,collected_l,price_eur_per_kwh}) {
      const ratio = collected_l>=0.001 ? measured_kwh/collected_l : null;
      return {
        measured_kwh_per_l:ratio===null ? null : round(ratio,3),
        measured_eur_per_l:ratio===null ? null : round(ratio*price_eur_per_kwh,3),
        assumption:'Nur vergleichbare Temperatur, Feuchte, Modus und Zeitraum vergleichen. Unter 1 ml gemessener Menge bleibt der Quotient unbekannt.',
      };
    },
    example:{args:{measured_kwh:2,collected_l:4,price_eur_per_kwh:0.3},expect:{measured_kwh_per_l:0.5,measured_eur_per_l:0.15}},
  },
  {
    name:'waesche_restwasser_messen',
    description:'Restwasser der Wäsche aus dem Gewicht vor und nach dem Trocknen bestimmen — Measure water left in textiles from wet and dry reference weights.',
    page:'/guide/waesche-trocknen-wohnung.html',
    properties:{
      current_kg:number('Aktuelles Gewicht der vollständigen Ladung in kg.',0.05,50),
      dry_reference_kg:number('Gewicht derselben Ladung beim gewünschten Trocknungsgrad in kg.',0.05,50),
    },
    calculate({current_kg,dry_reference_kg}) {
      return {
        above_reference_g:round(Math.max(0,current_kg-dry_reference_kg)*1000,0),
        reference_already_met:current_kg<=dry_reference_kg,
        assumption:'Gleiche Textilien und Tara. Zusatzmasse entspricht ungefähr dem Restwasser. Nicht die Veränderung der Luftfeuchte im Raum.',
      };
    },
    example:{args:{current_kg:5.4,dry_reference_kg:4.2},expect:{above_reference_g:1200}},
  },
  {
    name:'waesche_trocknungsziel_rate',
    description:'Erforderliche Verdunstung bis zum gewünschten Zeitpunkt berechnen und mit Messung vergleichen — Check the removal rate needed to meet a laundry drying deadline.',
    page:'/guide/waesche-trocknen-wohnung.html',
    properties:{
      earlier_kg:number('Gewicht der Ladung beim ersten Wiegen in kg.',0.05,50),
      current_kg:number('Aktuelles Gewicht derselben Ladung in kg.',0.05,50),
      target_kg:number('Gemessenes Zielgewicht der Ladung in kg.',0.05,50),
      elapsed_h:number('Zeit zwischen den Wägungen in Stunden.',0.1,168),
      remaining_h:number('Verbleibende Zeit bis zum gewünschten Zeitpunkt in Stunden.',0.1,168),
    },
    calculate({earlier_kg,current_kg,target_kg,elapsed_h,remaining_h}) {
      const observed = (earlier_kg-current_kg)*1000/elapsed_h;
      const required = Math.max(0,current_kg-target_kg)*1000/remaining_h;
      return {
        observed_g_per_hour:round(observed,1),
        required_g_per_hour:round(required,1),
        observed_rate_meets_required:observed+1e-6>=required,
        assumption:'Rückblick und erforderlicher Durchschnitt, keine Trocknungsprognose. Gegen Ende kann die Trocknung langsamer werden. Zielgewicht und Tara müssen vergleichbar sein.',
      };
    },
    example:{args:{earlier_kg:6,current_kg:5.4,target_kg:5,elapsed_h:2,remaining_h:1},expect:{observed_g_per_hour:300,required_g_per_hour:400,observed_rate_meets_required:false}},
  },
  {
    name:'waeschestaender_stellflaeche',
    description:'Aufgeklappten Wäscheständer mit vorhandener Stellfläche vergleichen — Check whether an opened drying rack fits in either horizontal orientation.',
    page:'/guide/beheizter-waeschestaender.html',
    properties:{
      rack_width_cm:number('Breite des vollständig aufgeklappten Ständers in cm.',1,500),
      rack_depth_cm:number('Tiefe des vollständig aufgeklappten Ständers in cm.',1,500),
      free_width_cm:number('Freie Breite nach Abzug benötigter Durchgänge und Freiräume in cm.',1,1000),
      free_depth_cm:number('Freie Tiefe nach Abzug benötigter Durchgänge und Freiräume in cm.',1,1000),
    },
    calculate({rack_width_cm,rack_depth_cm,free_width_cm,free_depth_cm}) {
      return {
        fits_as_measured:rack_width_cm<=free_width_cm && rack_depth_cm<=free_depth_cm,
        fits_rotated_90deg:rack_depth_cm<=free_width_cm && rack_width_cm<=free_depth_cm,
        assumption:'Rechteckige Stellfläche. Herstellerabstände und notwendige Lauf- und Fluchtwege vorher von der verfügbaren Fläche abziehen; Höhe, Kabel und Traglast separat prüfen.',
      };
    },
    example:{args:{rack_width_cm:150,rack_depth_cm:50,free_width_cm:70,free_depth_cm:160},expect:{fits_as_measured:false,fits_rotated_90deg:true}},
  },
  {
    name:'feuchtegranulat_nachfuellkosten',
    description:'Nachfüllkosten eines passiven Granulatbehälters aus der eigenen Standzeit abschätzen — Estimate refill consumption and cost from observed service life.',
    page:'/guide/luftentfeuchter-granulat-oder-elektrisch.html',
    properties:{
      refill_eur:number('Preis eines einzelnen Nachfüllsatzes in Euro.',0,100),
      observed_weeks:number('Eigene Standzeit in Wochen pro Nachfüllsatz.',0.25,52),
      planned_weeks:number('Geplanter Nutzungszeitraum in Wochen.',0,52),
      containers:number('Gleichartig genutzte Behälter.',1,20),
    },
    calculate({refill_eur,observed_weeks,planned_weeks,containers}) {
      if (!Number.isInteger(containers)) throw new RangeError('containers');
      const units = Math.ceil(planned_weeks/observed_weeks)*containers;
      return {
        refill_units:units,
        projected_refill_eur:round(units*refill_eur),
        assumption:'Gleiche Standzeit bei gleichbleibenden Bedingungen. Startfüllung ist mitgerechnet; Vorräte, Gerätekosten und Wirkung bei laufender Feuchtequelle sind separat zu bewerten.',
      };
    },
    example:{args:{refill_eur:4,observed_weeks:6,planned_weeks:13,containers:2},expect:{refill_units:6,projected_refill_eur:24}},
  },
  {
    name:'entfeuchter_hygrostat_schaltband',
    description:'Feuchteband beim beobachteten Ein- und Ausschalten berechnen — Compare a dehumidifier’s observed switch-on and switch-off humidities with its setpoint.',
    page:'/guide/luftentfeuchter-dauerbetrieb-stromkosten.html',
    properties:{
      switch_on_rh_pct:roomHumidity,
      switch_off_rh_pct:roomHumidity,
      setpoint_rh_pct:roomHumidity,
    },
    calculate({switch_on_rh_pct,switch_off_rh_pct,setpoint_rh_pct}) {
      const ordered = switch_on_rh_pct >= switch_off_rh_pct;
      return {
        observed_switch_band_pp:ordered ? round(switch_on_rh_pct-switch_off_rh_pct) : null,
        setpoint_within_observed_band:ordered ? setpoint_rh_pct>=switch_off_rh_pct && setpoint_rh_pct<=switch_on_rh_pct : null,
        assumption:'Beobachtete Werte am gleichen Messort mit gleichem Modus verwenden. Startverzögerung, Abtauen und Lüfternachlauf können das Bild ändern. Kein Nachweis eines Defekts.',
      };
    },
    example:{args:{switch_on_rh_pct:57,switch_off_rh_pct:48,setpoint_rh_pct:50},expect:{observed_switch_band_pp:9,setpoint_within_observed_band:true}},
  },
  {
    name:'befeuchter_tank_laufzeit',
    description:'Befeuchter-Nachfüllzeit aus nutzbarem Tank und eigener Verbrauchsrate bestimmen — Estimate humidifier refill interval from usable capacity and observed water use.',
    page:'/guide/luftbefeuchter-ratgeber.html',
    properties:{
      usable_tank_ml:number('Nutzbares Füllvolumen in ml bis zur vorgesehenen Nachfüllgrenze.',0,30000),
      observed_use_ml:number('Im gleichen Modus verbrauchte Wassermenge in ml.',0,30000),
      observed_h:number('Dauer der Verbrauchsmessung in Stunden.',0.25,48),
    },
    calculate({usable_tank_ml,observed_use_ml,observed_h}) {
      const rate = observed_use_ml/observed_h;
      return {
        observed_ml_per_hour:round(rate,1),
        estimated_hours_until_refill:usable_tank_ml===0 ? 0 : observed_use_ml>=1 ? round(usable_tank_ml/rate,1) : null,
        assumption:'Annahme gleichbleibender Stufe und Rate. Unter 1 ml gemessenem Verbrauch bleibt die Laufzeit unbekannt. Wasserwechsel, Reinigung und Betriebsgrenzen der Anleitung einhalten. Keine Empfehlung für längeren Betrieb.',
      };
    },
    example:{args:{usable_tank_ml:2000,observed_use_ml:600,observed_h:3},expect:{estimated_hours_until_refill:10}},
  },
];
