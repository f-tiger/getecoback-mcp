const number = (description, minimum, maximum) => ({type:'number', minimum, maximum, description});
const flag = description => ({type:'boolean', description});
const choice = (description, ...values) => ({type:'string', enum:values, description});
const guide = slug => '/guide/' + slug + '.html';
const rounded = (value, digits = 2) => Number(value.toFixed(digits));

export const coolingSuite = [
  {
    name:'fenster_sonneneintrag_bilanz',
    description:'Wärmeeintrag desselben Fensters vor und nach Verschattung vergleichen — Estimate the solar heat gain of a window with and without a shade.',
    page:guide('hitzeschutz-fenster'),
    properties:{
      glas_m2:number('Sonnenbeschienene Glasfläche in m².',0.05,100),
      sonne_w_m2:number('Einstrahlung auf die Fensterebene in W/m².',0,1400),
      g_vorher:number('Gesamtenergiedurchlassgrad der vorhandenen Kombination als Anteil von 0 bis 1.',0,1),
      g_nachher:number('Gesamtenergiedurchlassgrad der Verglasung mit geplanter Verschattung als Anteil von 0 bis 1.',0,1),
    },
    calculate({glas_m2,sonne_w_m2,g_vorher,g_nachher}) {
      const incident = glas_m2 * sonne_w_m2;
      return {
        vorher_w:rounded(incident * g_vorher), nachher_w:rounded(incident * g_nachher),
        weniger_w:rounded(incident * (g_vorher - g_nachher)),
        annahme:'Momentaufnahme bei gleicher Einstrahlung. Beide g-Werte müssen zur jeweiligen gesamten Fensterkombination passen. Daraus folgt keine Änderung der Raumtemperatur in Grad.'
      };
    },
    example:{args:{glas_m2:2,sonne_w_m2:500,g_vorher:0.6,g_nachher:0.2},expect:{weniger_w:400}}
  },
  {
    name:'abluftplatte_lochposition_pruefen',
    description:'Randabstände eines runden Durchlasses für eine vorhandene Fensterplatte prüfen — Check whether a round exhaust cutout leaves the requested edge clearance.',
    page:guide('fensterabdichtung-selber-bauen'),
    properties:{
      breite_mm:number('Plattenbreite in mm.',100,3000), hoehe_mm:number('Plattenhöhe in mm.',100,3000),
      loch_mm:number('Vorgesehener Lochdurchmesser gemäß Anschlusszeichnung in mm.',50,500),
      mitte_x_mm:number('Lochmitte vom linken Plattenrand in mm.',0,3000),
      mitte_y_mm:number('Lochmitte vom oberen Plattenrand in mm.',0,3000),
      rand_min_mm:number('Vom gewählten Plattenmaterial und der Befestigung geforderter freier Rand in mm.',1,300)
    },
    calculate({breite_mm,hoehe_mm,loch_mm,mitte_x_mm,mitte_y_mm,rand_min_mm}) {
      const margin = Math.min(mitte_x_mm,breite_mm-mitte_x_mm,mitte_y_mm,hoehe_mm-mitte_y_mm)-loch_mm/2;
      return {
        kleinster_freier_rand_mm:rounded(margin), passt_geometrisch:margin >= rand_min_mm,
        annahme:'Nur Geometrie der rechteckigen Platte und des kreisförmigen Lochs. Flansch, Material und Befestigung separat nach Anleitung prüfen.'
      };
    },
    example:{args:{breite_mm:400,hoehe_mm:250,loch_mm:150,mitte_x_mm:200,mitte_y_mm:125,rand_min_mm:30},expect:{kleinster_freier_rand_mm:50,passt_geometrisch:true}}
  },
  {
    name:'klima_abluftweg_pruefen',
    description:'Geplante Abluftführung mit der Geräteanleitung und der realen Schlauchstrecke abgleichen — Check a portable AC exhaust route against the model manual.',
    page:guide('abluftschlauch-verlaengern'),
    properties:{
      geplanter_weg_cm:number('Gesamter realer Schlauchweg bis zum vorgesehenen Außenanschluss in cm.',1,1000),
      maximal_cm:number('Zulässige Schlauchlänge aus der Anleitung; 0 wenn unbekannt.',0,1000),
      freigabe:choice('Schlauchkonfiguration vom Hersteller freigegeben?','ja','nein','unbekannt'),
      knickfrei:flag('Der Weg ist ohne Knick und ohne Quetschung möglich?')
    },
    calculate({geplanter_weg_cm,maximal_cm,freigabe,knickfrei}) {
      let ergebnis = 'weiter_nach_anleitung';
      if (!knickfrei || freigabe === 'nein' || (maximal_cm > 0 && geplanter_weg_cm > maximal_cm)) ergebnis = 'weg_aendern';
      else if (maximal_cm === 0 || freigabe === 'unbekannt') ergebnis = 'handbuch_pruefen';
      return {
        ergebnis, restlaenge_cm:maximal_cm > 0 ? rounded(maximal_cm-geplanter_weg_cm) : null,
        hinweis:'Gerät möglichst näher zum erlaubten Außenanschluss stellen. Herstellerangaben zu Durchmesser, Bögen und Abständen prüfen.'
      };
    },
    example:{args:{geplanter_weg_cm:160,maximal_cm:140,freigabe:'ja',knickfrei:true},expect:{ergebnis:'weg_aendern',restlaenge_cm:-20}}
  },
  {
    name:'klima_nachstroemwaerme_schaetzen',
    description:'Fühlbare Wärmelast durch nachströmende Außenluft bei einem Abluftgerät berechnen — Estimate sensible heat gain from outdoor makeup air.',
    page:guide('mobile-klimaanlage-kuehlt-nicht'),
    properties:{
      aussenluft_m3_h:number('Tatsächlich angenommener Außenluftanteil der Nachströmung in m³/h.',0,2000),
      innen_c:number('Innenlufttemperatur in °C.',5,50),
      aussen_c:number('Temperatur der nachströmenden Außenluft in °C.',-20,60)
    },
    calculate({aussenluft_m3_h,innen_c,aussen_c}) {
      return {
        fuehlbarer_waermestrom_w:rounded(aussenluft_m3_h*(aussen_c-innen_c)/3),
        annahme:'Positive Werte erwärmen den Raum, negative Werte kühlen ihn. Näherung mit Luftdichte 1,2 kg/m³ und Wärmekapazität 1 kJ/(kg·K). Feuchte, Lüftungswege und tatsächliche Geräteleistung separat prüfen.'
      };
    },
    example:{args:{aussenluft_m3_h:180,innen_c:25,aussen_c:35},expect:{fuehlbarer_waermestrom_w:600}}
  },
  {
    name:'fensterloser_raum_waermeabfuhr',
    description:'Prüfen, ob ein Klimagerät in einem fensterlosen Raum Wärme wirklich nach außen abführen kann — Identify viable heat rejection for a windowless room.',
    page:guide('raum-ohne-fenster-kuehlen'),
    properties:{
      aussenanschluss:choice('Vorgesehene Wärmeabfuhr. Direkter Außenanschluss und zugelassene Außenführung zählen als Außenweg.','aussenweg','nachbarraum','kein_weg','unbekannt'),
      freigabe:choice('Ist die konkrete Durchführung laut Hersteller und für den Einbauort zulässig?','ja','nein','unbekannt')
    },
    calculate({aussenanschluss,freigabe}) {
      const route = aussenanschluss === 'aussenweg' && freigabe === 'ja' ? 'aussenweg_einplanung' :
        aussenanschluss === 'unbekannt' || (aussenanschluss === 'aussenweg' && freigabe === 'unbekannt') ? 'freigabe_offen' : 'keine_bestaetigte_waermeabfuhr';
      return {
        route,
        hinweis:route === 'aussenweg_einplanung' ? 'Modellvorgaben und zulässige Durchführung in die Planung übernehmen.' :
          'Ohne geeignete Abfuhr bleibt die Abwärme im Gebäude. Keine improvisierte Einleitung in Lüftungsschächte. Interne Wärmequellen reduzieren und vorhandene Verschattung prüfen.'
      };
    },
    example:{args:{aussenanschluss:'nachbarraum',freigabe:'ja'},expect:{route:'keine_bestaetigte_waermeabfuhr'}}
  },
  {
    name:'luftwechsel_dauer_abschaetzen',
    description:'Lüftungsdauer aus bekanntem Außenluftstrom und Raumvolumen abschätzen — Estimate ventilation time for a target fresh-air fraction under perfect mixing.',
    page:guide('richtig-lueften-bei-hitze'),
    properties:{
      volumen_m3:number('Raumvolumen in m³.',5,1000),
      aussenluft_m3_h:number('Gemessener oder angenommener Außenluftstrom in m³/h. Umluft zählt nicht.',1,5000),
      ziel_frischluft_prozent:number('Gewünschter Anteil ausgetauschter Ausgangsluft in Prozent.',1,99)
    },
    calculate({volumen_m3,aussenluft_m3_h,ziel_frischluft_prozent}) {
      const minutes = -Math.log1p(-ziel_frischluft_prozent/100)*volumen_m3/aussenluft_m3_h*60;
      return {
        minuten:rounded(minutes), luftwechsel_pro_stunde:rounded(aussenluft_m3_h/volumen_m3),
        annahme:'Konstanter Außenluftstrom und ideal durchmischter Raum. Bei Fensterlüftung ändern Wind und Öffnung den Volumenstrom; keine Zusage für Luftqualität oder Abkühlung.'
      };
    },
    example:{args:{volumen_m3:60,aussenluft_m3_h:120,ziel_frischluft_prozent:50},expect:{minuten:20.79}}
  },
  {
    name:'sommerlueften_temperaturfenster',
    description:'Mit Innen- und Außenmessung samt Gerätegenauigkeit prüfen, ob Lüften jetzt fühlbar kühlen kann — Check whether outdoor air is reliably cooler right now.',
    page:guide('richtig-lueften-bei-hitze'),
    properties:{
      innen_c:number('Schattenmessung innen in °C.',5,55), aussen_c:number('Schattenmessung draußen in °C.',-30,60),
      genauigkeit_innen_c:number('Absoluter Fehler laut Innenthermometer in °C.',0,5),
      genauigkeit_aussen_c:number('Absoluter Fehler laut Außenthermometer in °C.',0,5)
    },
    calculate({innen_c,aussen_c,genauigkeit_innen_c,genauigkeit_aussen_c}) {
      const delta = innen_c-aussen_c;
      const tolerance = genauigkeit_innen_c+genauigkeit_aussen_c;
      return {
        aussen_kuehler_um_c:rounded(delta), vergleichsspielraum_c:rounded(tolerance),
        temperaturcheck:delta>tolerance?'aussen_kuehler':delta < -tolerance?'aussen_waermer':'messbereiche_ueberlappen',
        hinweis:'Aussage zur Temperatur, unter den eingegebenen Fehlergrenzen. Luftqualität, Feuchte und Lüftungsbedarf separat beachten.'
      };
    },
    example:{args:{innen_c:26,aussen_c:25.5,genauigkeit_innen_c:0.5,genauigkeit_aussen_c:0.5},expect:{temperaturcheck:'messbereiche_ueberlappen'}}
  },
  {
    name:'klima_abkuehltest_auswerten',
    description:'Temperaturverlauf bei einem kurzen Funktionstest auswerten — Summarize observed cooling from timed measurements at the same indoor location.',
    page:guide('mobile-klimaanlage-kuehlt-nicht'),
    properties:{
      vorher_c:number('Temperatur am gleichen Messort zu Testbeginn in °C.',5,60),
      nachher_c:number('Temperatur am gleichen Messort zu Testende in °C.',5,60),
      minuten:number('Dauer des beobachteten Tests in Minuten.',5,480),
      bedingungen_stabil:flag('Sonne, Türen, Belegung und andere Einflüsse blieben hinreichend ähnlich?'),
    },
    calculate({vorher_c,nachher_c,minuten,bedingungen_stabil}) {
      const change = nachher_c-vorher_c;
      return {
        aenderung_c:rounded(change), mittel_c_pro_stunde:rounded(change*60/minuten),
        auswertung:bedingungen_stabil?'beobachteter_verlauf':'eingeschraenkt_vergleichbar',
        hinweis:'Der Verlauf gilt nur für den Messzeitraum. Bei fehlender Abkühlung Bedienmodus, Filter und Abluftführung nach Anleitung prüfen. Keine Defekt- oder Leistungsdiagnose.'
      };
    },
    example:{args:{vorher_c:28,nachher_c:27,minuten:30,bedingungen_stabil:true},expect:{mittel_c_pro_stunde:-2}}
  },
  {
    name:'klimageraet_kondenswasser_check',
    description:'Sichtbare Kondenswasserprobleme am mobilen Klimagerät einordnen — Triage visible condensate leaks and identify when to stop using the appliance.',
    page:guide('mobile-klimaanlage-tropft-wasser'),
    properties:{
      ort:choice('Wo tritt das Wasser aus?','tank_oder_ablauf','gehaeuse','elektrik','unbekannt'),
      tank_voll:flag('Das Gerät meldet vollen Tank?'),
      wiederkehrend:flag('Das Problem bleibt nach den im Handbuch vorgesehenen Kontrollen bestehen?')
    },
    calculate({ort,tank_voll,wiederkehrend}) {
      const next = ort === 'elektrik' || wiederkehrend ? 'betrieb_stoppen_service' :
        ort === 'gehaeuse' || ort === 'unbekannt' ? 'betrieb_stoppen_ursache_klaeren' :
          tank_voll ? 'tankvorgabe_pruefen' : 'ablaufvorgabe_pruefen';
      return {
        naechster_schritt:next,
        hinweis:'Gerät bei unklarer Leckstelle ausschalten. Elektrik nicht öffnen oder bei Nässe berühren. Tank, Stopfen und Ablauf nur nach Modellanleitung prüfen.'
      };
    },
    example:{args:{ort:'elektrik',tank_voll:false,wiederkehrend:false},expect:{naechster_schritt:'betrieb_stoppen_service'}}
  },
  {
    name:'klimaanlage_geraeusch_vergleich',
    description:'Zwei Geräuschwerte nur bei gleicher Messgröße und vergleichbaren Bedingungen einordnen — Compare AC noise figures on a like-for-like basis.',
    page:guide('delonghi-pac-n90-test'),
    properties:{
      pegel_a_dba:number('Angegebener Pegel A in dB(A).',0,130), pegel_b_dba:number('Angegebener Pegel B in dB(A).',0,130),
      groesse_a:choice('Messgröße der Angabe A.','schalldruck','schallleistung','unbekannt'),
      groesse_b:choice('Messgröße der Angabe B.','schalldruck','schallleistung','unbekannt'),
      gleiche_bedingungen:flag('Betriebsmodus und Messbedingungen sind vergleichbar, bei Schalldruck auch Position und Abstand?')
    },
    calculate({pegel_a_dba,pegel_b_dba,groesse_a,groesse_b,gleiche_bedingungen}) {
      const comparable = groesse_a !== 'unbekannt' && groesse_a === groesse_b && gleiche_bedingungen;
      return {
        vergleichbar:comparable, differenz_b_minus_a_db:comparable ? rounded(pegel_b_dba-pegel_a_dba) : null,
        hinweis:'Schallleistung beschreibt die Quelle, Schalldruck gilt am Messort. Kein Datenblattwert allein sagt, wie laut das Gerät am Bett wird.'
      };
    },
    example:{args:{pegel_a_dba:52,pegel_b_dba:64,groesse_a:'schalldruck',groesse_b:'schallleistung',gleiche_bedingungen:true},expect:{vergleichbar:false,differenz_b_minus_a_db:null}}
  },
  {
    name:'klima_effizienzlabel_vergleichen',
    description:'Kühl-Effizienzkennzahlen für Monoblock und Split auf Vergleichbarkeit prüfen — Compare EER or SEER figures only on the same stated test basis.',
    page:guide('mobile-klimaanlage-vergleich'),
    properties:{
      index_a:choice('Kühl-Kennzahl A, falls bekannt.','EER','SEER','unbekannt'),
      index_b:choice('Kühl-Kennzahl B, falls bekannt.','EER','SEER','unbekannt'),
      wert_a:number('Veröffentlichter Kühl-Wirkungsgrad A in W/W, sofern bekannt. Bei unbekannter Kennzahl 0.',0,30),
      wert_b:number('Veröffentlichter Kühl-Wirkungsgrad B in W/W, sofern bekannt. Bei unbekannter Kennzahl 0.',0,30),
      gleiche_pruefbasis:flag('Jeweils derselbe Teststandard, Klimabezug und Typ der Kühlleistungsangabe?')
    },
    calculate({index_a,index_b,wert_a,wert_b,gleiche_pruefbasis}) {
      const comparable = gleiche_pruefbasis && index_a === index_b && index_a !== 'unbekannt' && wert_a > 0 && wert_b > 0;
      return {
        vergleichbar:comparable, hoeherer_index:comparable ? (wert_a===wert_b?'gleich':wert_a>wert_b?'A':'B') : null,
        hinweis:'EER ist eine Kennzahl bei festgelegtem Prüfpunkt, SEER berücksichtigt saisonale Prüfbedingungen. Ein höherer vergleichbarer Index ersetzt keine Vorhersage des Jahresverbrauchs oder der Passform.'
      };
    },
    example:{args:{index_a:'EER',index_b:'SEER',wert_a:2.6,wert_b:6,gleiche_pruefbasis:true},expect:{vergleichbar:false,hoeherer_index:null}}
  },
  {
    name:'klimaanlage_filterpflege_check',
    description:'Freigegebene Pflege eines zugänglichen Klimagerätfilters bestimmen — Identify the model-approved care action for a portable AC filter.',
    page:guide('klimaanlage-reinigen'),
    properties:{
      erlaubte_pflege:choice('Pflegeart aus der Modellanleitung.','waschbar','trocken_reinigbar','austausch','unbekannt'),
      beschaedigt:flag('Am Filter ist ein Riss, eine Verformung oder anderer Schaden sichtbar?'),
      verfuegbar:flag('Der Filter ist laut Anleitung über das Wartungsfach ohne Öffnen der Geräteverkleidung zugänglich?')
    },
    calculate({erlaubte_pflege,beschaedigt,verfuegbar}) {
      let next = 'handbuch_pruefen';
      if (verfuegbar && beschaedigt) next = 'ersatz_nach_modell_pruefen';
      else if (verfuegbar && erlaubte_pflege === 'waschbar') next = 'freigegebenes_waschverfahren';
      else if (verfuegbar && erlaubte_pflege === 'trocken_reinigbar') next = 'freigegebene_trockenpflege';
      else if (verfuegbar && erlaubte_pflege === 'austausch') next = 'ersatz_nach_modell_pruefen';
      return {
        pflegeweg:next,
        hinweis:'Gerät vor Pflege nach Anleitung außer Betrieb nehmen. Lösungs- und Reinigungsmittel nur bei Modellfreigabe verwenden. Einen gewaschenen Filter erst vollständig trocken wieder einsetzen.'
      };
    },
    example:{args:{erlaubte_pflege:'waschbar',beschaedigt:true,verfuegbar:true},expect:{pflegeweg:'ersatz_nach_modell_pruefen'}}
  },
  {
    name:'ventilator_platzbedarf_pruefen',
    description:'Standfuß und Schwenkbreite mit dem verfügbaren Stellplatz abgleichen — Check a fan base and oscillation envelope before buying.',
    page:guide('turmventilator-vs-standventilator'),
    properties:{
      stellbreite_cm:number('Frei verfügbare Breite am geplanten Stellplatz in cm.',1,500),
      stelltiefe_cm:number('Frei verfügbare Tiefe am geplanten Stellplatz in cm.',1,500),
      breite_betrieb_cm:number('Maximale Gerätebreite im Betrieb einschließlich Schwenkbereich in cm.',1,500),
      tiefe_betrieb_cm:number('Maximale Gerätetiefe im Betrieb in cm.',1,500),
      freiraum_je_seite_cm:number('Zusätzlicher freier Rand je Seite gemäß Anleitung in cm.',0,100)
    },
    calculate({stellbreite_cm,stelltiefe_cm,breite_betrieb_cm,tiefe_betrieb_cm,freiraum_je_seite_cm}) {
      const width = stellbreite_cm-breite_betrieb_cm-2*freiraum_je_seite_cm;
      const depth = stelltiefe_cm-tiefe_betrieb_cm-2*freiraum_je_seite_cm;
      return {
        restbreite_cm:rounded(width), resttiefe_cm:rounded(depth), passt_im_grundriss:width>=0&&depth>=0,
        hinweis:'Rechteckiger Grundriss bei geplanter Ausrichtung. Standfestigkeit, Kabelweg und erforderliche Abstände separat prüfen.'
      };
    },
    example:{args:{stellbreite_cm:40,stelltiefe_cm:45,breite_betrieb_cm:30,tiefe_betrieb_cm:30,freiraum_je_seite_cm:5},expect:{passt_im_grundriss:true,restbreite_cm:0}}
  },
  {
    name:'luftkuehler_verdunstungsgrenze',
    description:'Theoretische Verdunstungsgrenze aus Lufttemperatur und relativer Feuchte abschätzen — Estimate the wet-bulb limit for direct evaporative air cooling.',
    page:guide('klimaanlage-vs-luftkuehler'),
    properties:{
      temperatur_c:number('Lufttemperatur am Einlass in °C.',15,45),
      relative_feuchte_prozent:number('Relative Luftfeuchte am Einlass in Prozent.',10,90),
    },
    calculate({temperatur_c:t,relative_feuchte_prozent:rh}) {
      // Stull (2011) empirical standard-pressure approximation for wet bulb temperature.
      const wetBulb = t*Math.atan(0.151977*Math.sqrt(rh+8.313659)) + Math.atan(t+rh) -
        Math.atan(rh-1.676331) + 0.00391838*rh**1.5*Math.atan(0.023101*rh)-4.686035;
      return {
        feuchtkugel_c:rounded(wetBulb,1), theoretische_spannweite_c:rounded(Math.max(0,t-wetBulb),1),
        annahme:'Theoretischer Grenzwert der angesaugten Luft bei näherungsweise normalem Luftdruck. Ein reales Gerät bleibt meist darüber und erhöht die Feuchte. Wert ist keine Vorhersage der Raumtemperatur.',
        formel_quelle:'https://doi.org/10.1175/JAMC-D-11-0143.1'
      };
    },
    example:{args:{temperatur_c:30,relative_feuchte_prozent:50},expect:{feuchtkugel_c:22.3}}
  },
  {
    name:'klima_aussenteil_stellplatz_check',
    description:'Einen vorgesehenen Außenstellplatz vor dem Kauf eines mobilen Splitgeräts prüfen — Check planning prerequisites for a portable split AC outdoor unit.',
    page:guide('split-klimaanlage-ohne-kernbohrung'),
    properties:{
      aussenplatz:flag('Ein fester, vom Hersteller vorgesehener, im Freien liegender Standort ist vorhanden?'),
      montage_bestaetigt:flag('Befestigung, Abstände und Leitungsweg sind nach Herstelleranleitung am Standort geprüft?'),
      eigentuemer_freigabe:choice('Freigabe für den konkreten Ort, sofern erforderlich.','vorhanden','nicht_noetig','fehlt','offen')
    },
    calculate({aussenplatz,montage_bestaetigt,eigentuemer_freigabe}) {
      const ready = aussenplatz&&montage_bestaetigt&&['vorhanden','nicht_noetig'].includes(eigentuemer_freigabe);
      return {
        standort_vorpruefung:ready?'voraussetzungen_bestaetigt':'offene_voraussetzungen',
        hinweis:ready?'Kondensatführung und Lärm am Aufstellort zusätzlich prüfen.':'Vor dem Kauf Standort, Montageweg und gegebenenfalls Freigabe klären. Eine nicht bestätigte Befestigung kann nicht als tragfähig bewertet werden.'
      };
    },
    example:{args:{aussenplatz:true,montage_bestaetigt:true,eigentuemer_freigabe:'offen'},expect:{standort_vorpruefung:'offene_voraussetzungen'}}
  },
  {
    name:'mobile_klima_einlagern_check',
    description:'Vor der Winterpause offene Schritte für eine mobile Klimaanlage erkennen — Check portable AC storage readiness against its own manual.',
    page:guide('mobile-klimaanlage-ueberwintern'),
    properties:{
      anleitung:flag('Anleitung für das genaue Modell liegt vor?'), wasser:flag('Kondensat ist nach Herstellerangaben entfernt?'),
      trocken:flag('Filter und Gerät sind gemäß Anleitung trocken?'),
      lager:flag('Lagerort, Temperatur und Ausrichtung entsprechen den Angaben des Herstellers?')
    },
    calculate({anleitung,wasser,trocken,lager}) {
      const checks = {anleitung,wasser,trocken,lager};
      const open = Object.entries(checks).filter(([,done])=>!done).map(([key])=>key);
      return {
        bereit_zur_einlagerung:open.length===0, offene_pruefungen:open,
        hinweis:'Trocknungs-, Transport- und Wiederinbetriebnahmevorgaben gelten pro Modell. Zubehör trocken lagern; vorhandene Teile können weiterverwendet werden.'
      };
    },
    example:{args:{anleitung:true,wasser:true,trocken:false,lager:true},expect:{bereit_zur_einlagerung:false,offene_pruefungen:['trocken']}}
  },
  {
    name:'klima_fenster_nachtbetrieb_check',
    description:'Vor Nachtbetrieb prüfen, ob das Schlauchfenster in diesem Zustand geöffnet bleiben kann — Review night-time window constraints before running a hose AC.',
    page:guide('klimaanlage-fenster-einbruchschutz'),
    properties:{
      fenster_offen:flag('Für den Betrieb muss das Fenster offen oder gekippt bleiben?'),
      sicherung_geprueft:flag('Die Sicherheit der konkreten Öffnungsstellung wurde geprüft?'),
      fluchtweg_frei:flag('Vorgesehene Fluchtwege bleiben frei?')
    },
    calculate({fenster_offen,sicherung_geprueft,fluchtweg_frei}) {
      const status = !fluchtweg_frei?'fluchtweg_zuerst_freihalten':fenster_offen&&!sicherung_geprueft?'offene_fensterstellung_klaeren':'betrieb_nach_anleitung_pruefen';
      return {
        status,
        hinweis:'Bei ungeklärter Öffnungsstellung vor dem Schlafen unter Aufsicht vorkühlen und das Fenster anschließend schließen, sofern es am Standort zulässig ist. Keine Einstufung einer Öffnung als einbruchsicher.'
      };
    },
    example:{args:{fenster_offen:true,sicherung_geprueft:false,fluchtweg_frei:true},expect:{status:'offene_fensterstellung_klaeren'}}
  },
  {
    name:'arbeitszimmer_abwaerme_vergleich',
    description:'Interne Wärmequellen anhand gemessener elektrischer Leistung vergleichen — Estimate the indoor heat reduction between two measured office-device configurations.',
    page:guide('homeoffice-buero-kuehlen'),
    properties:{
      vorher_w:number('Gemessene Gesamtleistung der Geräte am Arbeitsplatz vor der Umstellung in Watt.',0,5000),
      nachher_w:number('Gemessene Gesamtleistung bei vergleichbarer Arbeit nach der Umstellung in Watt.',0,5000),
      energie_bleibt_im_raum:flag('Die eingesetzte elektrische Energie bleibt im betrachteten Raum, z. B. kein nennenswerter Akkuaufbau oder Außenabluft?')
    },
    calculate({vorher_w,nachher_w,energie_bleibt_im_raum}) {
      return {
        leistungsdifferenz_w:rounded(vorher_w-nachher_w),
        geschaetzte_waermelast_minderung_w:energie_bleibt_im_raum?rounded(vorher_w-nachher_w):null,
        annahme:'Für stationär betriebene Geräte ohne nennenswerte Energieabgabe nach außen entspricht die elektrische Leistung näherungsweise ihrer Abwärme im Raum. Keine Prognose der Raumtemperatur.'
      };
    },
    example:{args:{vorher_w:170,nachher_w:70,energie_bleibt_im_raum:true},expect:{geschaetzte_waermelast_minderung_w:100}}
  }
];
