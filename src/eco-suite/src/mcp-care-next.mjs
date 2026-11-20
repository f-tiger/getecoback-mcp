import {dividerDimensions} from '../site/assets/family-workshop-rules.mjs';

const ROBOT = '/guide/saugroboter-kaufberatung.html';
const WET_CLEANER = '/guide/saugwischer-kaufberatung.html';
const PURIFIER = '/guide/luftreiniger-ratgeber.html';
const HUMIDIFIER = '/guide/luftbefeuchter-ratgeber.html';
const WORKSHOP = '/familienwerkstatt.html';

const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const choice = (description, ...values) => ({type:'string', description, enum:values});
const minutes = description => number(description, 0, 1440);
const area = (description, minimum=0) => number(description, minimum, 5000);
const rounded = value => Math.round(value*1000)/1000 || 0;
const whole = value => { if (!Number.isInteger(value)) throw new RangeError('whole count'); };
const positiveWhole = (description, maximum=1000) => number(description,1,maximum);

export const careNext = [
  {
    name:'saugroboter_kartenabdeckung',
    description:'Lücken im freigegebenen Roboterlauf aus kontrollierten Flächen abschätzen — Estimate route coverage from observed floor areas after a robot pass.',
    page:ROBOT,
    properties:{
      target_m2:area('Tatsächlich zur Reinigung vorgesehene Grundfläche, ohne Sperrzonen.',0.1),
      missed_m2:area('Sichtbar ausgelassene Fläche innerhalb des Zielbereichs. Überlappungen nur einmal zählen.'),
      checked:flag('Laufende App-Karte mit einer Kontrolle der tatsächlichen Fläche abgeglichen?'),
    },
    calculate({target_m2,missed_m2,checked}) {
      if (missed_m2>target_m2) throw new RangeError('missed exceeds target');
      return {
        coverage_percent: checked ? rounded(100*(target_m2-missed_m2)/target_m2) : null,
        missed_m2: checked ? missed_m2 : null,
        next_step:'Randstellen und ausgelassene Zonen vor Ort prüfen. Abdeckung zeigt nur, wo das Gerät war. Sie misst keine Reinigungswirkung.',
      };
    },
    example:{args:{target_m2:60,missed_m2:9,checked:true},expect:{coverage_percent:85}},
  },
  {
    name:'saugroboter_akkupause_zeitfenster',
    description:'Gesamtdauer einer beobachteten Roboterrunde inklusive Zwischenladen testen — Check whether a robot run with a recharge fits a home availability window.',
    page:ROBOT,
    properties:{
      cleaning_min:minutes('Fahr- und Reinigungszeit laut eigener Runde, ohne Pausen.'),
      recharge_min:minutes('Gemessene Wartezeit beim Zwischenladen. Ohne Zwischenladen 0 eintragen.'),
      return_min:minutes('Zusätzlicher Stationsweg oder erneute Anfahrt, soweit nicht bereits eingerechnet.'),
      available_min:minutes('Zeitraum, in dem alle Zielräume zugänglich sind.'),
      comparable:flag('Gleiche Route, Geräteeinstellungen, Akkustand zu Beginn und ähnliche Laufbedingungen?'),
    },
    calculate({cleaning_min,recharge_min,return_min,available_min,comparable}) {
      const occupied = cleaning_min+recharge_min+return_min;
      return {
        observed_total_min:rounded(occupied),
        window_margin_min:comparable ? rounded(available_min-occupied) : null,
        status:!comparable ? 'recheck_run' : occupied>available_min ? 'split_route' : 'within_observed_window',
        limit:'Empirischer Terminvergleich. Ein Lauf kann durch Hindernisse, Akkuzustand und Stationspausen länger dauern.',
      };
    },
    example:{args:{cleaning_min:80,recharge_min:60,return_min:5,available_min:120,comparable:true},expect:{window_margin_min:-25,status:'split_route'}},
  },
  {
    name:'saugroboter_ergebnis_stichprobe',
    description:'Einfachen und doppelten Reinigungslauf mit derselben Stichprobenmethode vergleichen — Compare residual dirt after one versus two passes using equivalent checks.',
    page:ROBOT,
    properties:{
      sample_points:positiveWhole('Gleiche Anzahl an Stichprobenpunkten je Variante. Jeder Punkt zählt einmal.'),
      residue_one:number('Punkte mit sichtbaren Rückständen nach einem Lauf.',0,1000),
      residue_two:number('Punkte mit sichtbaren Rückständen nach zwei Läufen.',0,1000),
      comparable:flag('Gleiche Fläche, gleichartige Anfangsverschmutzung und gleiche Bewertungskriterien?'),
    },
    calculate({sample_points,residue_one,residue_two,comparable}) {
      [sample_points,residue_one,residue_two].forEach(whole);
      if (Math.max(residue_one,residue_two)>sample_points) throw new RangeError('count exceeds sample');
      return {
        residual_difference_percentage_points:comparable ? rounded(100*(residue_one-residue_two)/sample_points) : null,
        status:!comparable ? 'repeat_comparable_checks' : residue_one===residue_two ? 'same_observed_result' :
          residue_one>residue_two ? 'fewer_residual_points_after_two_passes' : 'more_residual_points_after_two_passes',
        limit:'Vergleich der eigenen Sichtprüfung für diesen Boden. Er belegt weder Hygiene noch allgemeine Modellleistung.',
      };
    },
    example:{args:{sample_points:10,residue_one:4,residue_two:1,comparable:true},expect:{residual_difference_percentage_points:30}},
  },
  {
    name:'saugroboter_buerste_geraeusch',
    description:'Ungewohntes Bürstengeräusch am vorhandenen Roboter sicher eingrenzen — Triage a new brush sound without running an unsafe or partly assembled robot.',
    page:ROBOT,
    properties:{
      symptom:choice('Beobachtung aus einem normalen Lauf.', 'rattle','scrape','stopped','electrical','unclear'),
      visible_entanglement:flag('Haare oder Schnur am von außen zugänglichen Bürstenbereich sichtbar?'),
      after_care:flag('Modellgerechte Pflege bereits durchgeführt und beide Teile korrekt eingesetzt?'),
    },
    calculate({symptom,visible_entanglement,after_care}) {
      if (symptom==='electrical') {
        return {status:'stop_use', next_step:'Bei elektrischem Geruch oder Hitze ausschalten, nicht erneut testen und Herstellerhilfe nutzen.'};
      }
      if (visible_entanglement && !after_care) {
        return {status:'check_user_accessible_brush', next_step:'Ausgeschaltet vorhandene Bürste nach Anleitung von außen prüfen. Nur ausdrücklich freigegebene Reinigungsarbeiten durchführen.'};
      }
      return {
        status:after_care || symptom==='stopped' ? 'document_for_support' : 'check_normal_conditions',
        next_step:'Situation, Boden und Zeitpunkt festhalten. Bei wiederkehrendem Geräusch den Hersteller befragen. Keine Abdeckung öffnen und keinen Lauf mit ausgebauter Bürste starten.',
      };
    },
    example:{args:{symptom:'electrical',visible_entanglement:true,after_care:false},expect:{status:'stop_use'}},
  },
  {
    name:'saros10r_filter_trocknungsfenster',
    description:'Nächsten Einsatz nach dem Waschen des Saros-10R-Filters terminieren — Apply the documented Saros 10R minimum filter drying time before reuse.',
    page:ROBOT,
    properties:{
      model:choice('Modellkennung und Filter laut deutscher Anleitung.', 'saros_10r','other','unknown'),
      drying_hours:number('Vergangene Stunden seit dem Waschen des Filters.',0,1000),
      fully_dry:flag('Filter nach Anleitung durchgehend trocken?'),
    },
    calculate({model,drying_hours,fully_dry}) {
      if (model!=='saros_10r') return {status:'check_exact_manual', minimum_wait_hours:null};
      const remaining = Math.max(0,24-drying_hours);
      return {
        status:remaining>0 || !fully_dry ? 'continue_drying' : 'check_installation_in_manual',
        minimum_wait_hours:Math.ceil(remaining*1000)/1000,
        manufacturer_source:'https://support.roborock.com/hc/de/article_attachments/46144394789529',
        limit:'Mindestens 24 Stunden für den laut Anleitung waschbaren Filter des Saros 10R. Vollständige Trocknung bleibt notwendig. Andere Varianten separat prüfen und Gerät nicht ohne erforderlichen Filter betreiben.',
      };
    },
    example:{args:{model:'saros_10r',drying_hours:18,fully_dry:true},expect:{status:'continue_drying',minimum_wait_hours:6}},
  },
  {
    name:'saugwischer_akkuflaeche',
    description:'Aus einer eigenen Reinigungsprobe die Fläche pro nutzbarer Akkuladung abschätzen — Estimate wet-cleaning area per usable charge from a measured pass.',
    page:WET_CLEANER,
    properties:{
      test_m2:area('Vergleichbare Fläche des eigenen Probelaufs.',0.1),
      test_min:number('Gemessene Reinigungszeit für diese Fläche in Minuten.',0.1,240),
      usable_min:minutes('Beim gleichen Modus gemessene nutzbare Reinigungsminuten je Ladung.'),
      target_m2:area('Zu reinigende Fläche innerhalb dieser Ladung.'),
    },
    calculate({test_m2,test_min,usable_min,target_m2}) {
      const capacity = test_m2/test_min*usable_min;
      return {
        estimated_m2_per_charge:rounded(capacity),
        estimated_uncovered_m2:rounded(Math.max(0,target_m2-capacity)),
        limit:'Gleicher Boden, Modus und Verschmutzungsgrad vorausgesetzt. Tankstopps, Pflege, Akkualter und schwer erreichbare Stellen gesondert berücksichtigen.',
      };
    },
    example:{args:{test_m2:20,test_min:10,usable_min:25,target_m2:60},expect:{estimated_m2_per_charge:50,estimated_uncovered_m2:10}},
  },
  {
    name:'saugwischer_randstreifen_flaeche',
    description:'Übrig bleibenden Randstreifen an ausgewählten Wänden abschätzen — Estimate additional manual edge coverage after a wet-cleaner pass.',
    page:WET_CLEANER,
    properties:{
      straight_edge_m:number('Gesamtlänge der zu prüfenden geraden Wandstücke, ohne doppelt gezählte Strecken.',0,300),
      gap_mm:number('In der vorgesehenen Fahrtrichtung gemessener ungereinigter Randstreifen.',0,300),
    },
    calculate({straight_edge_m,gap_mm}) {
      return {
        estimated_manual_edge_area_m2:rounded(straight_edge_m*gap_mm/1000),
        limit:'Näherung für gerade Wände und einen gleich breiten Streifen. Ecken, überlappende Abschnitte und Sockelleisten separat prüfen.',
      };
    },
    example:{args:{straight_edge_m:20,gap_mm:25},expect:{estimated_manual_edge_area_m2:0.5}},
  },
  {
    name:'saugwischer_wasserbilanz',
    description:'Frischwasser und aufgefangenes Wasser bei einer Testfläche bilanzieren — Compare dispensed and recovered water in a controlled wet-cleaning test.',
    page:WET_CLEANER,
    properties:{
      dispensed_ml:number('Aus dem Frischwassertank verschwundene Menge in Millilitern.',0,20000),
      recovered_ml:number('Nur in diesem Test aufgefangenes Schmutzwasser in Millilitern.',0,20000),
      comparable:flag('Anfangs leerer Schmutzwassertank, zuvor trockene Testfläche und kein Zusatzwasser?'),
    },
    calculate({dispensed_ml,recovered_ml,comparable}) {
      const accepted = comparable && recovered_ml<=dispensed_ml;
      return {
        status:accepted ? 'balance_observed' : 'recheck_sources',
        unaccounted_ml:accepted ? rounded(dispensed_ml-recovered_ml) : null,
        recovered_percent:accepted && dispensed_ml>0 ? rounded(100*recovered_ml/dispensed_ml) : null,
        limit:'Die Differenz kann im Gerät, an der Walze oder auf dem Boden liegen oder verdunstet sein. Sie ist keine Messung der Bodenrestfeuchte.',
      };
    },
    example:{args:{dispensed_ml:450,recovered_ml:300,comparable:true},expect:{unaccounted_ml:150}},
  },
  {
    name:'saugwischer_ersatzwalze_artikelabgleich',
    description:'Ersatzwalze anhand genauer Herstellerliste und Teilenummer prüfen — Compare a replacement roller with official model and part documentation.',
    page:WET_CLEANER,
    properties:{
      model_match:choice('Nennt die offizielle Liste die vollständige Modellvariante?', 'yes','no','unknown'),
      part_match:choice('Stimmt die Teilenummer mit dieser Herstellerliste überein?', 'yes','no','unknown'),
      region_match:choice('Ist die konkrete DE/EU-Ausführung dieselbe?', 'yes','no','unknown'),
    },
    calculate({model_match,part_match,region_match}) {
      const checks = [model_match,part_match,region_match];
      return {
        status:checks.includes('no') ? 'documented_mismatch' : checks.includes('unknown') ? 'verify_exact_part' : 'listed_for_exact_model',
        next_step:'F25 XT/ACE, H14/H14 Pro sowie S7-Untervarianten einzeln prüfen. Form, Farbe und optisch ähnliche Rollen bestätigen keine Passung. Keine Aussage zur Lieferbarkeit.',
      };
    },
    example:{args:{model_match:'yes',part_match:'unknown',region_match:'yes'},expect:{status:'verify_exact_part'}},
  },
  {
    name:'saugwischer_mittelmenge',
    description:'Freigegebene manuelle Dosierangabe auf die verwendete Wassermenge umrechnen — Scale an approved manual dilution to the actual tank fill.',
    page:WET_CLEANER,
    properties:{
      dose_ml_per_l:number('Ausdrücklich dokumentierte Milliliter Konzentrat pro Liter Wasser.',0,500),
      water_l:number('Tatsächlich eingefüllte Wassermenge in Litern.',0,10),
      approved_manual_dose:flag('Mittel, Boden, manuelle Dosierung und die Angabe pro Liter Wasser sind eindeutig freigegeben?'),
    },
    calculate({dose_ml_per_l,water_l,approved_manual_dose}) {
      return {
        concentrate_ml:approved_manual_dose ? rounded(dose_ml_per_l*water_l) : null,
        status:approved_manual_dose ? 'scaled_manual_dose' : 'follow_equipment_instructions',
        limit:'Nur für die exakte Freigabe und die genannte Einheit. Füllmarkierungen einhalten. Eine automatische Dosierung oder Milliliter je Liter fertige Lösung separat nach Anleitung behandeln.',
      };
    },
    example:{args:{dose_ml_per_l:8,water_l:0.5,approved_manual_dose:true},expect:{concentrate_ml:4}},
  },
  {
    name:'luftreiniger_filtervorrat',
    description:'Ersatzfilterbestand gegen einen eigenen Wechsel- und Beschaffungsplan prüfen — Check spare filter stock against the planned replacement dates and supply lead time.',
    page:'/ersatzfilter.html',
    properties:{
      days_to_next:number('Geschätzte Tage bis zum nächsten Wechsel nach Geräteanzeige und Anleitung.',0,7300),
      planned_interval_days:number('Planerischer Abstand weiterer Wechsel in Tagen.',1,3650),
      spare_sets:number('Bereits vorhandene kompatible Ersatzsätze für dieses Modell.',0,100),
      verified_lead_days:number('Für die Planung angenommene Beschaffungsdauer in Tagen.',0,365),
    },
    calculate({days_to_next,planned_interval_days,spare_sets,verified_lead_days}) {
      whole(spare_sets);
      const days = days_to_next + planned_interval_days*spare_sets;
      return {
        estimated_days_until_stock_needed:rounded(days),
        estimated_latest_order_in_days:rounded(days-verified_lead_days),
        limit:'Nur ein Vorratsszenario. Der tatsächliche Wechsel richtet sich nach Anzeige, Zustand und Anleitung. Negative Bestellfrist bedeutet, dass der angenommene Vorlauf das geplante Zeitfenster überschreitet.',
      };
    },
    example:{args:{days_to_next:20,planned_interval_days:150,spare_sets:1,verified_lead_days:7},expect:{estimated_latest_order_in_days:163}},
  },
  {
    name:'luftreiniger_filterkosten_laufzeit',
    description:'Eigene Filterpreise und gemessene Wechselabstände als jährlichen Verbrauchsposten rechnen — Estimate annual replacement media costs using observed intervals.',
    page:PURIFIER,
    properties:{
      particle_set_eur:number('Preis eines Partikelfilters oder kombinierten Filters in Euro.',0,5000),
      particle_days:number('Tage zwischen beobachteten Wechseln des Filters.',1,3650),
      carbon_separate:flag('Ein eigenständiger Kohlefilter wird zusätzlich gewechselt?'),
      carbon_set_eur:number('Preis des separaten Kohlefilters in Euro, sonst 0.',0,5000),
      carbon_days:number('Tage zwischen Wechseln des separaten Kohlefilters. Bei kombiniertem Filter ignoriert.',1,3650),
    },
    calculate({particle_set_eur,particle_days,carbon_separate,carbon_set_eur,carbon_days}) {
      const particles = particle_set_eur*365/particle_days;
      const carbon = carbon_separate ? carbon_set_eur*365/carbon_days : 0;
      return {
        estimated_filter_eur_per_year:rounded(particles+carbon),
        included_carbon_replacement_separately:carbon_separate,
        limit:'Rechnerischer Jahresdurchschnitt, keine tatsächliche Anzahl Käufe oder Herstellervorgabe. Aktuelle Filterfreigabe, Preise und Wechselanzeige separat prüfen.',
      };
    },
    example:{args:{particle_set_eur:30,particle_days:365,carbon_separate:true,carbon_set_eur:20,carbon_days:365},expect:{estimated_filter_eur_per_year:50}},
  },
  {
    name:'luftreiniger_filterwechsel_luftstrom',
    description:'Schwachen Luftstrom direkt nach einem Filterwechsel eingrenzen — Check basic installation conditions when airflow drops immediately after filter replacement.',
    page:PURIFIER,
    properties:{
      replaced_recently:flag('Leistung direkt nach dem Filterwechsel verändert?'),
      packaging_removed:flag('Verpackung des Einsatzes vollständig entfernt und Transportsicherung laut Anleitung geprüft?'),
      fit_checked:flag('Sitz und vorgeschriebene Einbaurichtung ohne Öffnen des Gerätegehäuses kontrolliert?'),
      intake_open:flag('Ansaug- und Ausblasbereiche frei?'),
    },
    calculate({replaced_recently,packaging_removed,fit_checked,intake_open}) {
      const unchecked = [];
      if (!packaging_removed) unchecked.push('Filterverpackung nach Modellanleitung prüfen');
      if (!fit_checked) unchecked.push('Sitz und Einbaurichtung nach Modellanleitung prüfen');
      if (!intake_open) unchecked.push('Vorgesehene Luftwege freihalten');
      return {
        status:!replaced_recently ? 'check_model_support' : unchecked.length ? 'inspect_installation' : 'document_for_support',
        checks:unchecked,
        limit:'Nur bei ausgeschaltetem Gerät und im vom Handbuch freigegebenen Filterfach prüfen. Bei wiederholter Fehlfunktion Herstellerhilfe nutzen.',
      };
    },
    example:{args:{replaced_recently:true,packaging_removed:true,fit_checked:false,intake_open:false},expect:{status:'inspect_installation'}},
  },
  {
    name:'luftreiniger_schadstoff_zweck',
    description:'Zwischen Partikelfilterung, Geruchsminderung und Frischluftbedarf unterscheiden — Identify whether a room problem involves particles, odor or outdoor air exchange.',
    page:PURIFIER,
    properties:{
      concern:choice('Beobachtung im Raum, keine Diagnose.', 'particles','odor','stuffy_room','moisture','unknown'),
      carbon:flag('Für diese Betriebsart ist eine geeignete Aktivkohlestufe dokumentiert?'),
      ongoing_source:flag('Dauerhafte Quelle oder fortlaufende Belastung bekannt?'),
    },
    calculate({concern,carbon,ongoing_source}) {
      const status = {
        particles:'compare_particulate_filtering',
        odor:carbon ? 'address_source_then_check_carbon' : 'address_source',
        stuffy_room:'check_outdoor_air_exchange',
        moisture:'check_moisture_source',
        unknown:'identify_observation_first',
      }[concern];
      return {
        status,
        address_known_source:ongoing_source,
        limit:'Ein Partikelfilter ist keine Lüftung. Aktivkohle kann bestimmte Gerüche mindern und belegt keine Sicherheit bei Gasen. Fortlaufende Quellen zuerst klären.',
      };
    },
    example:{args:{concern:'stuffy_room',carbon:true,ongoing_source:false},expect:{status:'check_outdoor_air_exchange'}},
  },
  {
    name:'luftreiniger_partikel_probe',
    description:'Eigenen Partikelmessvergleich mit und ohne Luftreiniger auswerten — Interpret a paired room particle test with matched starting readings.',
    page:PURIFIER,
    properties:{
      off_start:number('PM2,5 vor der Vergleichsperiode ohne Gerät in µg/m³.',0,1000),
      off_end:number('PM2,5 am Ende derselben Vergleichsperiode ohne Gerät in µg/m³.',0,1000),
      on_start:number('PM2,5 vor der Vergleichsperiode mit Gerät in µg/m³.',0,1000),
      on_end:number('PM2,5 am Ende derselben Vergleichsperiode mit Gerät in µg/m³.',0,1000),
      match_tolerance:number('Vorab gewählte maximal zulässige Abweichung der Startwerte in µg/m³.',0,1000),
      comparable:flag('Gleicher Sensor, Messort, Zeitraum und vergleichbare Umgebungsbedingungen? Keine zusätzliche Partikelquelle absichtlich erzeugt?'),
    },
    calculate({off_start,off_end,on_start,on_end,match_tolerance,comparable}) {
      const accepted = comparable && Math.abs(off_start-on_start)<=match_tolerance;
      return {
        additional_observed_drop_ug_m3:accepted ? rounded((on_start-on_end)-(off_start-off_end)) : null,
        status:accepted ? 'paired_measurement' : 'repeat_under_comparable_conditions',
        limit:'Ein Messvergleich am eigenen Ort, keine standardisierte CADR-Messung oder Aussage zu gesundheitlicher Wirkung. Feuchte und Unterschiede bei Lüftung oder Quellen können Messwerte verändern.',
      };
    },
    example:{args:{off_start:20,off_end:16,on_start:21,on_end:10,match_tolerance:2,comparable:true},expect:{additional_observed_drop_ug_m3:7}},
  },
  {
    name:'luftbefeuchter_weisser_belag',
    description:'Weißen Belag nach Gerätetechnik und beobachtetem Auftreten einordnen — Check whether a white deposit may be linked to ultrasonic humidification.',
    page:'/guide/luftbefeuchter-weisser-staub.html',
    properties:{
      technology:choice('In der exakten Anleitung bezeichnete Gerätebauart.', 'ultrasound','evaporation','steam','unknown'),
      appeared_during_use:flag('Belag bildet sich wiederholt während des Betriebs?'),
      water_known:flag('Wasserart und Härte überprüft und Freigabe des Herstellers bekannt?'),
    },
    calculate({technology,appeared_during_use,water_known}) {
      const status = technology==='unknown' ? 'identify_technology' :
        technology!=='ultrasound' || !appeared_during_use ? 'source_uncertain' :
          water_known ? 'check_manual_and_water' : 'verify_water_before_changing';
      return {
        status,
        limit:'Mineralien aus Ultraschallnebel können weißen Belag erklären. Eine sichere Zuordnung braucht Beobachtung. Gerät für die Prüfung ausstecken und Wasser- und Pflegevorgaben der Anleitung beachten.',
      };
    },
    example:{args:{technology:'ultrasound',appeared_during_use:true,water_known:false},expect:{status:'verify_water_before_changing'}},
  },
  {
    name:'luftbefeuchter_neustart_pflege',
    description:'Wiederinbetriebnahme nach einer Nutzungsunterbrechung planen — Check a humidifier before reuse after standing water or storage.',
    page:HUMIDIFIER,
    properties:{
      tank:choice('Zustand nach der Pause.', 'empty_dry','standing_water','unknown'),
      visible_damage:flag('Schaden, Leck oder Materialveränderung festgestellt?'),
      prescribed_care_done:flag('Vorgeschriebene Start- und Pflegeschritte vollständig erledigt?'),
      fresh_approved_water:flag('Vorgeschriebenes frisches Wasser für dieses Modell verfügbar?'),
    },
    calculate({tank,visible_damage,prescribed_care_done,fresh_approved_water}) {
      const status = visible_damage ? 'stop_use' :
        tank!=='empty_dry' || !prescribed_care_done ? 'follow_restart_care_first' :
          !fresh_approved_water ? 'verify_water' : 'follow_normal_startup';
      return {
        status,
        limit:'Gebrauchsanleitung für Entleerung, zugängliche Reinigung und Lagerung beachten. Frisches Wasser allein ersetzt die Reinigung nicht. Bei Schaden Herstellerhilfe nutzen.',
      };
    },
    example:{args:{tank:'standing_water',visible_damage:false,prescribed_care_done:false,fresh_approved_water:true},expect:{status:'follow_restart_care_first'}},
  },
  {
    name:'luftbefeuchter_stellplatz_risiko',
    description:'Aufstellung des vorhandenen Befeuchters bei Spritzwasser, kalter Wand oder Dampf prüfen — Check for a safer humidifier location from observed placement conditions.',
    page:HUMIDIFIER,
    properties:{
      steam:flag('Geräteanleitung nennt heißen Dampf oder heiße Geräteteile?'),
      reachable_by_children:flag('Gerät, Kabel oder Dampfbereich im Betrieb erreichbar?'),
      moisture_deposits:flag('Sichtbarer Niederschlag an Wand, Möbel oder Oberfläche in der Nähe?'),
      manual_location_ok:flag('Standort entspricht allen dokumentierten Modellabständen und Untergrundvorgaben?'),
    },
    calculate({steam,reachable_by_children,moisture_deposits,manual_location_ok}) {
      const status = steam && reachable_by_children ? 'stop_until_placement_resolved' :
        moisture_deposits ? 'pause_and_check_surface_and_humidity' :
          !manual_location_ok ? 'check_installation' : 'monitor_location';
      return {
        status,
        limit:'Eine pauschale Freigabe ist nicht möglich. Anleitung, Umkipprisiko, Stromversorgung und Freiraum prüfen. Bei sichtbarer Feuchte Befeuchtung unterbrechen und Ursache klären.',
      };
    },
    example:{args:{steam:true,reachable_by_children:true,moisture_deposits:false,manual_location_ok:true},expect:{status:'stop_until_placement_resolved'}},
  },
  {
    name:'luftbefeuchter_verdunster_dochtpflege',
    description:'Schwache Wirkung eines Verdunsters anhand zulässiger Dochtpflege und Luftwege prüfen — Triage low output in a wick-based humidifier before replacing consumables.',
    page:HUMIDIFIER,
    properties:{
      operation_confirmed:flag('Wasserstand und vorgesehene Betriebsart ohne Warnanzeige überprüft?'),
      intake_clear:flag('Vom Hersteller vorgesehene Luftwege frei?'),
      wick_condition:choice('Beobachteter Zustand des zugänglichen Dochts nach Anleitung.', 'normal','deposits','damaged','unknown'),
      care_approved:flag('Die genaue Anleitung erlaubt Pflege dieses Dochts ausdrücklich?'),
    },
    calculate({operation_confirmed,intake_clear,wick_condition,care_approved}) {
      const status = !operation_confirmed ? 'check_setup' : !intake_clear ? 'check_air_path' :
        wick_condition==='damaged' ? 'verify_exact_replacement' :
          wick_condition==='deposits' && care_approved ? 'follow_documented_wick_care' : 'check_model_manual';
      return {
        status,
        limit:'Sinkende Verdunstung hat mehrere Ursachen. Docht nicht mit nicht freigegebenen Mitteln behandeln. Vor Ersatz das exakte Teil und die Freigabe prüfen.',
      };
    },
    example:{args:{operation_confirmed:true,intake_clear:true,wick_condition:'deposits',care_approved:true},expect:{status:'follow_documented_wick_care'}},
  },
  {
    name:'poolroboter_entnahme_fenster',
    description:'Nasse Entnahme und Korbzugang vor einem wiederkehrenden Poolroboterlauf einplanen — Check the observed lifting load and handling route for routine pool-robot retrieval.',
    page:WORKSHOP,
    properties:{
      wet_mass_kg:number('Nasse Masse bei Entnahme nach Geräteanleitung, falls sie bereits sicher gemessen wurde.',0,80),
      planned_limit_kg:number('Selbst gewählter Planungswert für diese Handhabung, keine ergonomische Freigabe.',0,80),
      documented_route:flag('Vorgesehener Griff und trockener, zugänglicher Weg zur Pflege laut Anleitung geklärt?'),
      measured:flag('Gewicht aus sicherer, dokumentierter Entnahmesituation bekannt?'),
    },
    calculate({wet_mass_kg,planned_limit_kg,documented_route,measured}) {
      return {
        measured_margin_kg:measured ? rounded(planned_limit_kg-wet_mass_kg) : null,
        status:!documented_route || !measured ? 'resolve_retrieval_method' :
          wet_mass_kg>planned_limit_kg ? 'arrange_supported_retrieval' : 'check_handling_before_use',
        limit:'Nassgewicht ist keine Hebeempfehlung. Entnahme, Ausschalten, Wasserzugang und Elektrohinweise nach Geräteanleitung. Keine Messung durch einen riskanten Hebeversuch.',
      };
    },
    example:{args:{wet_mass_kg:12,planned_limit_kg:9,documented_route:true,measured:true},expect:{measured_margin_kg:-3,status:'arrange_supported_retrieval'}},
  },
  {
    name:'poolroboter_korb_pflegezeitfenster',
    description:'Vorhandene Korbpflege als Teil der geplanten Poolnutzung prüfen — Reserve a post-run window for cleaning and storing the pool-robot filter basket.',
    page:WORKSHOP,
    properties:{
      pickup_min:minutes('Beobachtete Minuten für Entnahme und Entwässerung an der vorgesehenen Stelle.'),
      basket_min:minutes('Beobachtete Minuten für die freigegebene Korbreinigung.'),
      storage_min:minutes('Beobachtete Minuten zum Wegräumen oder zur erforderlichen Lagerung nach Anleitung.'),
      available_min:minutes('Zeit zwischen Laufende und nächster Poolnutzung oder Aufräumfrist.'),
      same_conditions:flag('Vergleichbare Schmutzlast, gleiches Modell und gleiche Nutzung?'),
    },
    calculate({pickup_min,basket_min,storage_min,available_min,same_conditions}) {
      const required = pickup_min+basket_min+storage_min;
      return {
        estimated_care_min:rounded(required),
        reserve_min:same_conditions ? rounded(available_min-required) : null,
        status:!same_conditions ? 'observe_care_again' : required>available_min ? 'move_run_earlier' : 'within_observed_window',
        limit:'Zeitplanung nach bereits beobachteter Pflege. Die Anleitung entscheidet über Entnahme, Wasserzugang und zulässige Reinigung. Keine Aussage zu Wasserqualität.',
      };
    },
    example:{args:{pickup_min:3,basket_min:7,storage_min:5,available_min:10,same_conditions:true},expect:{reserve_min:-5,status:'move_run_earlier'}},
  },
  {
    name:'maehroboter_steigungsprofil',
    description:'Gemessene Steigung mit der Vorgabe für genau diese Teilstrecke vergleichen — Compare measured grade with the exact limit for mowing area, boundary or passage.',
    page:WORKSHOP,
    properties:{
      rise_cm:number('Höhenunterschied über die kurze vermessene Strecke in Zentimetern.',0,3000),
      horizontal_cm:number('Horizontale Strecke in Zentimetern, nicht die diagonale Oberfläche.',1,10000),
      limit_percent:number('Grenze in Prozent laut Anleitung, sofern für diese Teilstrecke eindeutig dokumentiert.',0,100),
      matching_manual_limit:flag('Grenze gilt für diese Stelle, etwa Hauptfläche, Rand oder Passage, und exakt diese Ausführung?'),
    },
    calculate({rise_cm,horizontal_cm,limit_percent,matching_manual_limit}) {
      const grade = 100*rise_cm/horizontal_cm;
      return {
        measured_grade_percent:rounded(grade),
        status:!matching_manual_limit ? 'find_route_specific_limit' : grade>limit_percent ? 'above_documented_grade' : 'check_surface_conditions',
        limit:'Berechnung mit horizontaler Strecke. Steilste Teilstücke einzeln messen. Wert unter dem Grenzwert belegt keine Eignung bei Nässe, Kanten oder rutschigem Boden.',
      };
    },
    example:{args:{rise_cm:20,horizontal_cm:100,limit_percent:15,matching_manual_limit:true},expect:{measured_grade_percent:20,status:'above_documented_grade'}},
  },
  {
    name:'maehroboter_maehfenster',
    description:'Beobachtete Mähdauer auf verfügbare beaufsichtigte Zeitfenster verteilen — Estimate whether a mowing plan fits user-supplied permitted and supervised time windows.',
    page:WORKSHOP,
    properties:{
      target_m2:area('Zielfläche des betrachteten Arbeitsgangs.',0.1),
      observed_m2:area('Fläche einer bereits beobachteten vergleichbaren Runde.',0.1),
      observed_min:number('Dauer dieser Runde inklusive unvermeidlicher Unterbrechungen in Minuten.',0.1,1440),
      window_min:number('Netto nutzbares Zeitfenster in Minuten. Sperrzeiten und Pausen bereits abziehen.',0.1,1440),
      separable:flag('Aufteilen auf mehrere ungefähr gleichartige Teilflächen möglich und laut Anleitung zulässig?'),
    },
    calculate({target_m2,observed_m2,observed_min,window_min,separable}) {
      const required = target_m2*observed_min/observed_m2;
      return {
        estimated_job_min:rounded(required),
        windows_needed:required<=window_min ? 1 : separable ? Math.ceil(required/window_min) : null,
        status:required<=window_min ? 'within_observed_window' : separable ? 'consider_smaller_sections' : 'find_longer_window',
        limit:'Für beobachteten Modus und ähnliche Flächenform. Nur örtlich zulässige Zeiten verwenden und Fläche tagsüber wegen Wildtieren und Hindernissen vor dem Lauf prüfen.',
      };
    },
    example:{args:{target_m2:180,observed_m2:60,observed_min:30,window_min:40,separable:true},expect:{estimated_job_min:90,windows_needed:3}},
  },
  {
    name:'schubladentrenner_zuschnitt',
    description:'Aus gemessener Schublade und Spiel eine Testplatte für den EcoBack-Entwurf bemessen — Size a non-load-bearing drawer divider prototype from internal dimensions and clearance.',
    page:WORKSHOP,
    properties:{
      opening_mm:number('Kleinste nutzbare lichte Breite an der gewünschten Einbaustelle.',1,1000),
      clear_height_mm:number('Kleinste nutzbare Innenhöhe beim vollständigen Schließen.',1,1000),
      side_play_mm:number('Gewünschtes Spiel je Seite in Millimetern.',0,25),
      top_play_mm:number('Gewünschtes Spiel nach oben in Millimetern.',0,25),
      wall_mm:number('Dicke der rechteckigen Platte für den EcoBack-Entwurf.',2,8),
    },
    calculate({opening_mm,clear_height_mm,side_play_mm,top_play_mm,wall_mm}) {
      const size = dividerDimensions({
        length:rounded(opening_mm-2*side_play_mm),
        height:rounded(clear_height_mm-top_play_mm),
        thickness:wall_mm,
      });
      return {
        status:size ? 'within_template_range' : 'outside_template_range',
        trial_length_mm:size?.length ?? null,
        trial_height_mm:size?.height ?? null,
        limit:'Nur für einen unbelasteten rechteckigen Organizer. Vorlage vor dem Druck mit Karton ausprobieren und Maßabweichungen beim Druck berücksichtigen. Keine strukturelle Eignung.',
      };
    },
    example:{args:{opening_mm:180,clear_height_mm:54,side_play_mm:2,top_play_mm:4,wall_mm:4},expect:{status:'within_template_range',trial_length_mm:176,trial_height_mm:50}},
  },
];
