import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const dehumidifiers = require('../data/dehum-catalog.json');
const thermostats = require('../data/thermostat-catalog.json');
const robots = require('../data/robot-catalog.json');
const humidifiers = require('../data/humidifier-catalog.json');

const method = '/wie-wir-empfehlen.html';
const cold = '/guide/luftentfeuchter-keller.html';
const thermo = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
const air = '/guide/luftreiniger-ratgeber.html';

const bool = description => ({type:'boolean', description});
const choice = (description, ...values) => ({type:'string', enum: values, description});
const number = (description, minimum, maximum) => ({type:'number', minimum, maximum, description});
const money = description => number(description, 0, 50000);
const missing = entries => Object.entries(entries).filter(([,ok]) => !ok).map(([key]) => key);
const rounded = value => Math.round(value * 100) / 100;

export const evidenceNext = [
  {
    name:'geraet_testzitat_einordnen',
    description:'Prüfen, wie eng ein Testsieger-Zitat formuliert werden muss — Qualify a best-in-test claim by model, test group and date.',
    page:method,
    properties:{
      quelle:choice('Art des Belegs.', 'prueflabor','hersteller','nutzer','redaktion'),
      exakt:bool('Stimmt die geprüfte Variante vollständig mit dem Angebot überein?'),
      testfeld:bool('Sind Vergleichsgruppe und Testzeitpunkt angegeben?'),
    },
    calculate({quelle,exakt,testfeld}) {
      const zitierbar = quelle === 'prueflabor' && exakt && testfeld;
      return {testsieg_zitierbar:zitierbar,
        formulierung:zitierbar ? 'Testsieger nur im genannten Testfeld zum angegebenen Zeitpunkt.'
          : 'Quellenart und geprüfte Variante nennen und das Siegeretikett weglassen.',
        quelle, grenze:'Ein Testergebnis für eine Modellvariante belegt keinen aktuellen Gesamtsieg.'};
    },
    example:{args:{quelle:'prueflabor',exakt:false,testfeld:true},expect:{testsieg_zitierbar:false}},
  },
  {
    name:'haendler_link_modellnachweis',
    description:'Suchtreffer, Produktseite und geprüftes Angebot auseinanderhalten — Identify what a merchant link establishes about the exact model.',
    page:method,
    properties:{
      linktyp:choice('Ziel des Links.', 'suche','produktdetail'),
      varianten_id:bool('Genaues Variantenkennzeichen auf der Händlerseite mit Quelle abgeglichen?'),
      verkaeufer:bool('Konkretes Angebot samt Verkäufer sichtbar?'),
    },
    calculate({linktyp,varianten_id,verkaeufer}) {
      const variant = linktyp === 'produktdetail' && varianten_id;
      return {modell_link_geprueft:variant, angebot_eindeutig:variant && verkaeufer,
        naechster_schritt:variant ? 'Verkäufer, Lieferumfang und Bestellstatus des konkreten Angebots prüfen.'
          : 'Zuerst Produktseite suchen und vollständige Modellnummer samt Suffix abgleichen.',
        grenze:'Eine eindeutige Produktseite garantiert keine Verfügbarkeit.'};
    },
    example:{args:{linktyp:'suche',varianten_id:true,verkaeufer:true},expect:{angebot_eindeutig:false}},
  },
  {
    name:'angebot_lagerstatus_zitieren',
    description:'Verfügbarkeit als datierte Händlerbeobachtung ausgeben — Qualify an availability quote by exact offer and observation date.',
    page:method,
    properties:{
      stand:choice('Beobachtung des exakten Händlerangebots.', 'bestellbar','ausverkauft','vorbestellung','unbekannt'),
      heute_geprueft:bool('Wurde das Angebot heute erneut selbst aufgerufen?'),
      modell_und_haendler_geprueft:bool('Sind Variante und Händler eindeutig identifiziert?'),
    },
    calculate({stand,heute_geprueft,modell_und_haendler_geprueft}) {
      const status = !modell_und_haendler_geprueft || stand === 'unbekannt' ? 'keine_belastbare_aussage'
        : heute_geprueft ? 'heutige_beobachtung' : 'historische_beobachtung';
      return {status, beobachtung:status==='keine_belastbare_aussage'?null:stand,
        grenze:'Mit Datum und Händler angeben. Bestellbarkeit heute garantiert keinen Bestand zum Kaufzeitpunkt.'};
    },
    example:{args:{stand:'bestellbar',heute_geprueft:false,modell_und_haendler_geprueft:true},expect:{status:'historische_beobachtung'}},
  },
  {
    name:'angebote_gesamtpreis_vergleichen',
    description:'Zwei gleich ausgestattete Angebote inklusive notwendiger Zusatzkosten vergleichen — Compare delivered purchase totals for matched quotes.',
    page:method,
    properties:{
      a_eur:money('Gerätepreis A inklusive ausgewiesener Steuern in Euro.'),
      b_eur:money('Gerätepreis B inklusive ausgewiesener Steuern in Euro.'),
      a_zusatz_eur:money('Versand und notwendige Zubehör-/Servicekosten in A.'),
      b_zusatz_eur:money('Versand und notwendige Zubehör-/Servicekosten in B.'),
      gleich:bool('Sind konkrete Variante, Umfang und Zustand gleich?'),
      vollstaendig:bool('Sind alle für beide Angebote notwendigen Zusatzkosten bekannt?'),
    },
    calculate({a_eur,b_eur,a_zusatz_eur,b_zusatz_eur,gleich,vollstaendig}) {
      const a = rounded(a_eur + a_zusatz_eur), b=rounded(b_eur + b_zusatz_eur);
      return {a_gesamt_eur:a,b_gesamt_eur:b,differenz_b_minus_a_eur:gleich&&vollstaendig?rounded(b-a):null,
        grenze:'Verglichen werden eingegebene Anschaffungskosten, ohne Betriebskosten und zukünftige Preisentwicklung.'};
    },
    example:{args:{a_eur:400,b_eur:390,a_zusatz_eur:10,b_zusatz_eur:25,gleich:true,vollstaendig:true},expect:{differenz_b_minus_a_eur:5}},
  },
  {
    name:'portasplit_gebraucht_belegliste',
    description:'Ein Gebrauchtangebot für die originale PortaSplit auf Prüflücken abgleichen — Review the evidence needed before considering a used PortaSplit.',
    page:'/guide/midea-portasplit-kaufen.html',
    properties:{
      typenschild:bool('Beide Geräte eindeutig identifiziert?'),
      leitung_geprueft:bool('Verbindung und Gehäuse vom Verkäufer zugänglich und ohne erkennbare Schäden?'),
      lieferumfang:bool('Halterung, Fernbedienung und benötigte Originalteile abgeglichen?'),
      funktion:bool('Vorhandener Nachweis eines funktionierenden Kühlbetriebs?'),
    },
    calculate(details) {
      const offen=missing(details);
      return {offene_pruefungen:offen, ergebnis:offen.length?'vor_kauf_klaeren':'grunddaten_vorhanden',
        grenze:'Eine Checkliste oder ein Sichtbefund ersetzt keine Prüfung von Gerät, Kältemittelkreislauf oder Montage.'};
    },
    example:{args:{typenschild:true,leitung_geprueft:false,lieferumfang:true,funktion:true},expect:{ergebnis:'vor_kauf_klaeren'}},
  },
  {
    name:'pac_n90_ean_abgleichen',
    description:'EAN und Modellangabe des PAC N90 ECO Silent gegen deutsche Unterlagen prüfen — Check the advertised model and GTIN for the documented German PAC N90 ECO Silent.',
    page:'/guide/delonghi-pac-n90-test.html',
    properties:{
      ean:number('Als Zahl geschriebene EAN vom Angebot oder Typenschild.',1000000000000,9999999999999),
      modell:choice('Zusätzliche Modellbezeichnung.', 'PAC N90 ECO Silent','abweichend','unbekannt'),
    },
    calculate({ean,modell}) {
      if (!Number.isSafeInteger(ean)) throw new RangeError('EAN');
      return {referenz_ean:8004399512351,status:ean!==8004399512351?'ean_abweicht'
        : modell==='PAC N90 ECO Silent'?'modellangaben_passen':'modellbezeichnung_klaeren',
        grenze:'Zwei passende Angaben identifizieren den dokumentierten Typ. Händler und Lieferumfang separat prüfen.'};
    },
    example:{args:{ean:8004399512351,modell:'PAC N90 ECO Silent'},expect:{status:'modellangaben_passen'}},
  },
  {
    name:'auslands_datenblatt_de_angebot',
    description:'Technischen Auslandsbeleg vom deutschen Lieferumfang abgrenzen — Check how an overseas datasheet applies to a German offer.',
    page:cold,
    properties:{
      modell_gleich:bool('Exakte Variantenbezeichnung auf beiden Unterlagen gleich?'),
      markt:choice('Markt des Datenblatts.', 'deutschland','eu_ausser_de','vereinigtes_koenigreich','unbekannt'),
      deutsches_angebot_belegt:bool('Dokumentiert der Händler Stecker, Zubehör und liefernde Variante?'),
    },
    calculate({modell_gleich,markt,deutsches_angebot_belegt}) {
      return {modellbezug:modell_gleich?'als_modellbeleg_einordnen':'modell_zuerst_klaeren',
        lieferumfang:deutsches_angebot_belegt?'separater_de_beleg_vorhanden':'de_beleg_beschaffen', datenblatt_markt:markt,
        grenze:'Der Zielmarkt eines Datenblatts sagt nichts über heutige Lieferbarkeit aus.'};
    },
    example:{args:{modell_gleich:true,markt:'vereinigtes_koenigreich',deutsches_angebot_belegt:false},expect:{lieferumfang:'de_beleg_beschaffen'}},
  },
  {
    name:'thermostat_funkzentrale_abgleichen',
    description:'Vorhandene Funkzentrale mit einem dokumentierten Thermostat-System abgleichen — Match an existing hub to a documented smart radiator thermostat ecosystem.',
    page:thermo,
    properties:{
      modell:choice('Dokumentiertes Thermostat.', 'tado-x-starter','bosch-ii-m','fritz-302'),
      hub:choice('Vorhandene Zentrale.', 'bridge-x','tado-v3-internet-bridge','bosch-controller','matter-mit-thread','fritzbox-dect','fritzbox-7312-7412','andere-oder-keine'),
    },
    calculate({modell,hub}) {
      const product=thermostats.products.find(p=>p.id===modell);
      const paths={'tado-x-starter':['bridge-x'], 'bosch-ii-m':['bosch-controller','matter-mit-thread'], 'fritz-302':['fritzbox-dect']};
      const excluded=(modell==='tado-x-starter'&&hub==='tado-v3-internet-bridge') || (modell==='fritz-302'&&hub==='fritzbox-7312-7412');
      return {status:excluded?'hersteller_schliesst_aus'
        : paths[modell].includes(hub)?'dokumentierter_systemweg':'freigabe_pruefen',
        anforderung:product.system, quellen_url:product.source,
        grenze:'Es bleiben genaue Hardware- oder Firmwareversion und Montage am Ventil zu prüfen.'};
    },
    example:{args:{modell:'tado-x-starter',hub:'tado-v3-internet-bridge'},expect:{status:'hersteller_schliesst_aus'}},
  },
  {
    name:'tado_x_funktionskosten_pruefen',
    description:'Zeitpläne und zusätzliche tado-X-Automationen beim Funktionsbudget unterscheiden — Identify possible recurring fees for the intended tado X app function.',
    page:thermo,
    properties:{
      funktion:choice('Gewünschte Funktion.', 'zeitplan','zusaetzliche_automatisierung','unbekannt'),
      jahrespreis_eur:money('Aktuell selbst nachgesehener jährlicher Preis oder null Euro falls kostenfrei beziehungsweise unbekannt.'),
      preis_geprueft:bool('Ist der aktuelle Preis für genau die gewünschte Funktion bestätigt?'),
      jahre:number('Geplanter Nutzungszeitraum in Jahren.',1,20),
    },
    calculate({funktion,jahrespreis_eur,preis_geprueft,jahre}) {
      const kit=thermostats.products.find(p=>p.id==='tado-x-starter');
      return {status:funktion==='zeitplan'?'zeitplaene_in_kostenloser_app'
        : preis_geprueft && funktion!=='unbekannt'?'preis_erfasst':'abo_umfang_und_preis_pruefen',
        funktionskosten_eur:funktion==='zeitplan'?0:preis_geprueft&&funktion!=='unbekannt'?rounded(jahrespreis_eur*jahre):null,
        herstellerhinweis:kit.care, quellen_url:kit.source, grenze:'Hochrechnung mit unverändertem Preis. Gerät und Zubehör gesondert.'};
    },
    example:{args:{funktion:'zusaetzliche_automatisierung',jahrespreis_eur:25,preis_geprueft:true,jahre:3},expect:{funktionskosten_eur:75}},
  },
  {
    name:'klima_kuehlleistung_einheit_abgleich',
    description:'Zwei Kühlleistungen aus kW und BTU/h auf dieselbe Einheit bringen — Normalize two published cooling capacity figures, with a test-condition gate.',
    page:'/guide/was-bedeutet-btu.html',
    properties:{
      leistung_a_kw:number('Kühlleistung A in Kilowatt.',0,50),
      leistung_b_btuh:number('Kühlleistung B in BTU pro Stunde, nicht bloß BTU Energie.',0,180000),
      gleicher_pruefpunkt:bool('Gelten dieselbe Prüfmethode und derselbe Betriebspunkt?'),
    },
    calculate({leistung_a_kw,leistung_b_btuh,gleicher_pruefpunkt}) {
      const b=leistung_b_btuh*0.00029307107;
      return {a_kw:leistung_a_kw,b_kw:rounded(b),differenz_b_minus_a_kw:gleicher_pruefpunkt?rounded(b-leistung_a_kw):null,
        grenze:'Kühlleistung ist abgeführte Wärme pro Zeit und keine Angabe des elektrischen Verbrauchs.'};
    },
    example:{args:{leistung_a_kw:2.6,leistung_b_btuh:9000,gleicher_pruefpunkt:true},expect:{b_kw:2.64,differenz_b_minus_a_kw:0.04}},
  },
  {
    name:'klima_heizfunktion_datenblatt_nachweis',
    description:'Heizfunktion anhand der Gerätedokumentation als Wärmepumpe oder Direktheizung einordnen — Verify the documented heating principle in a reversible AC.',
    page:'/guide/klimaanlage-mit-heizfunktion.html',
    properties:{
      dokument:choice('Spezifisch für den Heizbetrieb dokumentierte Technik.', 'waermepumpe','elektrisches_heizelement','nur_heizfunktion_genannt','unbekannt'),
      temperaturpunkt:bool('Sind Außen- und Innentemperatur zum Heizleistungswert genannt?'),
      paarwerte:bool('Sind Heizleistung und Aufnahmewert am selben Punkt genannt?'),
    },
    calculate({dokument,temperaturpunkt,paarwerte}) {
      const confirmed=['waermepumpe','elektrisches_heizelement'].includes(dokument);
      return {heizprinzip:confirmed?dokument:'unbekannt',
        vergleichspunkt_belegt:confirmed&&temperaturpunkt&&paarwerte,
        naechster_schritt:confirmed?'Werte für den tatsächlichen Außentemperaturbereich vergleichen.'
          :'Herstellerangabe zum Heizprinzip der konkreten Variante suchen.',
        grenze:'Die Aufschrift Heizfunktion belegt weder eine Wärmepumpe noch eine Effizienz.'};
    },
    example:{args:{dokument:'nur_heizfunktion_genannt',temperaturpunkt:true,paarwerte:true},expect:{heizprinzip:'unbekannt'}},
  },
  {
    name:'luftreiniger_hepa_werbeaussage_pruefen',
    description:'HEPA-Angaben zum Filter vom Nachweis am ganzen Luftreiniger trennen — Distinguish a filter class declaration from tested whole-device performance.',
    page:air,
    properties:{
      beleg:choice('Vorliegender Beleg.', 'filterklasse_mit_pruefnorm','nur_werbeaussage','unbekannt'),
      variante:bool('Trifft die genannte Filterklasse auf das genaue Einsatzmodell zu?'),
      gesamttest:bool('Existiert zusätzlich ein Geräteprüfbericht mit Prüfmethode und Betriebsstufe?'),
    },
    calculate({beleg,variante,gesamttest}) {
      return {filterklasse_belegt:beleg==='filterklasse_mit_pruefnorm'&&variante,
        geraetetestergebnis_einordnen:gesamttest&&variante,
        grenze:'Die Klasse des Filtermediums allein belegt keine Leckagefreiheit, keinen CADR-Wert und keinen Schutz im konkreten Raum.'};
    },
    example:{args:{beleg:'filterklasse_mit_pruefnorm',variante:true,gesamttest:false},expect:{filterklasse_belegt:true,geraetetestergebnis_einordnen:false}},
  },
  {
    name:'comfee_mddf20_wf_beleggrenze',
    description:'Für den Comfee MDDF-20DEN7 prüfen, ob eine Herstellerangabe auf die angebotene Variante übertragbar ist — Preserve the documented Comfee dehumidifier suffix and feature scope.',
    page:cold,
    properties:{
      typ:choice('Vom Typenschild abgelesene Variante.', 'MDDF-20DEN7','MDDF-20DEN7-WF','unbekannt'),
      aussage:choice('Zu prüfende Ausstattungsbehauptung.', 'tank','timer','auto_restart','app'),
    },
    calculate({typ,aussage}) {
      const product=dehumidifiers.products.find(p=>p.id==='comfee-mddf20');
      return {status:typ!=='MDDF-20DEN7'?'quelle_fuer_genaue_variante_beschaffen'
        : aussage==='app'?'app_hier_nicht_belegt':'modellmerkmal_dokumentiert',
        modellquelle:product.source, dokumentierte_merkmale:product.facts,
        grenze:'Auto-Restart aus dem Datenblatt ist keine Empfehlung zum Betrieb an automatischen Steckdosen.'};
    },
    example:{args:{typ:'MDDF-20DEN7-WF',aussage:'tank'},expect:{status:'quelle_fuer_genaue_variante_beschaffen'}},
  },
  {
    name:'luftbefeuchter_wasser_freigabe_beleg',
    description:'Wasserart für Beurer LB 200 oder LB 55 aus der genauen Anleitung bestätigen — Resolve a model-specific humidifier water claim.',
    page:'/guide/luftbefeuchter-weisser-staub.html',
    properties:{
      modell:choice('Beurer-Artikel.', 'beurer-lb200','beurer-lb55','unbekannt'),
      wasser:choice('Beabsichtigte Wasserart.', 'kaltes_leitungswasser','destilliert','unbekannt'),
    },
    calculate({modell,wasser}) {
      const product=humidifiers.products.find(p=>p.id===modell);
      const status=modell==='beurer-lb200'&&wasser!=='unbekannt'?'in_lokal_gepruefter_anleitung_genannt'
        : 'genaue_anleitung_abgleichen';
      return {status, geraet:product?.name??null,
        grenze:'Wasserempfehlungen zwischen Geräten nicht übertragen. Maßgeblich sind die Anleitung deines Geräts und die dortigen Pflegehinweise.'};
    },
    example:{args:{modell:'beurer-lb200',wasser:'destilliert'},expect:{status:'in_lokal_gepruefter_anleitung_genannt'}},
  },
  {
    name:'saugroboter_stationsbundle_abgleichen',
    description:'Roboter und separat etikettierte Station gegen das dokumentierte Bundle prüfen — Verify a robot vacuum bundle using robot and dock identifiers.',
    page:'/guide/saugroboter-kaufberatung.html',
    properties:{
      roboter:choice('Modellnummer vom Roboter.', 'RLD32GD','RLL32SE','S91COP','unbekannt'),
      station:choice('Separates Stationskennzeichen.', 'RCDD0202','EWFD28HRR','andere_oder_unbekannt'),
    },
    calculate({roboter,station}) {
      const product=robots.products.find(p=>p.model===roboter);
      const reviewed={'RLD32GD':'RCDD0202','S91COP':'EWFD28HRR'};
      const expected=reviewed[roboter]??null;
      return {modell:product?.name??null, erwartete_stations_id:expected,
        status:!expected||station==='andere_oder_unbekannt'?'stationsunterlage_pruefen':station===expected?'dokumentiertes_paar':'abweichende_stations_id',
        grenze:'Das dokumentierte Paar bestätigt weder Zustand noch die Kompatibilität anderer Stationen.'};
    },
    example:{args:{roboter:'RLD32GD',station:'EWFD28HRR'},expect:{status:'abweichende_stations_id'}},
  },
  {
    name:'energielabel_skala_vergleichbarkeit',
    description:'Prüfen, ob zwei Effizienzklassen derselben Skala und Produktgruppe entstammen — Check comparability before using efficiency letters in a buying decision.',
    page:'/geraete-austausch-rechner.html',
    properties:{
      skala_a:choice('Auf Label A lesbare Skala.', 'a_bis_g','plus_skala','unbekannt'),
      skala_b:choice('Auf Label B lesbare Skala.', 'a_bis_g','plus_skala','unbekannt'),
      produktgruppe_gleich:bool('Bezieht sich das Label auf dieselbe Produktgruppe?'),
      kennwertbasis_gleich:bool('Beziehen sich Zahlen auf dasselbe Programm beziehungsweise dieselbe Bezugsgröße?'),
    },
    calculate({skala_a,skala_b,produktgruppe_gleich,kennwertbasis_gleich}) {
      const stufen=skala_a!=='unbekannt'&&skala_a===skala_b&&produktgruppe_gleich;
      return {klassen_einordnen:stufen, zahlenvergleich:produktgruppe_gleich&&kennwertbasis_gleich,
        grenze:'Bei umgestellter Skala keine Buchstaben umrechnen. Vergleichbare kWh-Angaben mit der jeweiligen Methode prüfen.'};
    },
    example:{args:{skala_a:'plus_skala',skala_b:'a_bis_g',produktgruppe_gleich:true,kennwertbasis_gleich:false},expect:{klassen_einordnen:false,zahlenvergleich:false}},
  },
  {
    name:'eco_raeumdaten_quellenangabe',
    description:'Eine zitierfähige Quellen- und Versionsangabe für EcoBack-Dimensionierungsdaten erzeugen — Create a ready-to-cite attribution for EcoBack’s open sizing dataset.',
    page:'/daten.html',
    properties:{
      metric:choice('Genutzte Datenreihe.', 'btu','heizleistung','entfeuchter_raumvergleich'),
      angepasst:bool('Wurden die Werte für die eigene Publikation angepasst?'),
    },
    calculate({metric,angepasst}) {
      const names={btu:'Kühlleistung und Raumgröße',heizleistung:'Heizleistung und Dämmstandard',
        entfeuchter_raumvergleich:'Ratgeberzuordnung zum Entfeuchten nach Raumgröße'};
      return {attribution:'EcoBack Raumklima-Dimensionierungsdaten · '+names[metric]+' · CC BY 4.0'
        +(angepasst?' · bearbeitet':''),
        datensatz_url:'https://getecoback.com/sizing-data.json',
        lizenz_url:'https://creativecommons.org/licenses/by/4.0/',
        grenze:metric==='entfeuchter_raumvergleich'?'Die Zuordnung sagt keine Liter pro Tag voraus.':'Faustwerte ersetzen keine Messung oder Fachdimensionierung.'};
    },
    example:{args:{metric:'btu',angepasst:true},expect:{attribution:'EcoBack Raumklima-Dimensionierungsdaten · Kühlleistung und Raumgröße · CC BY 4.0 · bearbeitet'}},
  },
  {
    name:'strommessung_quellbeleg_export',
    description:'Strommessung als nachvollziehbaren Beleg für Angebote und Vergleiche vorbereiten — Check whether a meter reading records enough context to cite.',
    page:'/strommess-protokoll.html',
    properties:{
      geraet_und_modus:bool('Sind Gerät und Betriebsmodus dokumentiert?'),
      dauer:bool('Sind die Messdauer und die Einheit dokumentiert?'),
      kwh:bool('Ist die gemessene Energie dokumentiert?'),
      nutzung_typisch:bool('Wurde notiert, ob der Zeitraum typische Nutzung enthält?'),
      nebenlasten:bool('Ist bekannt, welche weiteren Lasten am Messpunkt hängen?'),
    },
    calculate(details) {
      const offen=missing(details);
      return {vergleichsdokumentation_vollstaendig:offen.length===0, offen,
        grenze:'Strommessungen bleiben standort- und zeitgebunden und sind kein Produktprüfbericht.'};
    },
    example:{args:{geraet_und_modus:true,dauer:true,kwh:true,nutzung_typisch:false,nebenlasten:false},expect:{offen:['nutzung_typisch','nebenlasten']}},
  },
  {
    name:'klima_kaufzeitpunkt_eigenbedarf',
    description:'Zeitfenster für einen Klimagerätekauf aus Bedarf und bestätigter Lieferzeit planen — Decide whether the current quote fits an actual deadline and budget.',
    page:'/guide/klimaanlage-wann-kaufen.html',
    properties:{
      tage_bis_bedarf:number('Tage bis zum geplanten Einsatz.',0,365),
      lieferdauer_tage:number('Beim konkreten Angebot bestätigte Dauer bis zur Lieferung.',0,365),
      einrichten_tage:number('Zusätzliche Zeit bis zur Nutzung inklusive Aufstellung.',0,90),
      preis_eur:money('Aktueller Gesamtpreis dieses Angebots in Euro.'),
      deckel_eur:money('Eigenes maximales Ausgabebudget in Euro.'),
      frist_belegt:bool('Lieferdauer stammt vom gewählten Verkäufer und gilt für diese Variante?'),
    },
    calculate({tage_bis_bedarf,lieferdauer_tage,einrichten_tage,preis_eur,deckel_eur,frist_belegt}) {
      const reserve=tage_bis_bedarf-lieferdauer_tage-einrichten_tage;
      return {budget_eingehalten:preis_eur<=deckel_eur, reserve_tage:frist_belegt?reserve:null,
        zeitlich:!frist_belegt?'lieferfrist_pruefen':reserve>=0?'ins_zeitfenster_geplant':'zu_spaet_geplant',
        grenze:'Eigene Planung ohne Preis- oder Lieferprognose. Bestätigung kann sich bis zum Kauf ändern.'};
    },
    example:{args:{tage_bis_bedarf:6,lieferdauer_tage:5,einrichten_tage:2,preis_eur:380,deckel_eur:420,frist_belegt:true},expect:{reserve_tage:-1,zeitlich:'zu_spaet_geplant'}},
  },
  {
    name:'klima_heizbetrieb_winterdaten_abgleich',
    description:'Herstellerwerte für Heizbetrieb am kalten Auslegungspunkt einordnen — Check heating data coverage for the planned outdoor conditions.',
    page:'/guide/klimaanlage-mit-heizfunktion.html',
    properties:{
      ziel_aussen_c:number('Eigene relevante Außentemperatur in Grad Celsius.',-40,35),
      geprueft_aussen_c:number('Außentemperatur des veröffentlichten Heizprüfpunkts.',-40,35),
      min_betrieb_c:number('Bestätigte untere Betriebsgrenze fürs Heizen laut Anleitung.',-45,35),
      ausfuehrung_geprueft:bool('Betreffen Heizgrenze und Prüfdaten das exakte Modell?'),
    },
    calculate({ziel_aussen_c,geprueft_aussen_c,min_betrieb_c,ausfuehrung_geprueft}) {
      if (ausfuehrung_geprueft && geprueft_aussen_c<min_betrieb_c) throw new RangeError('Prüfpunkt');
      return {status:!ausfuehrung_geprueft?'modellbeleg_klaeren':ziel_aussen_c<min_betrieb_c?'unter_betriebsgrenze'
        :ziel_aussen_c===geprueft_aussen_c?'pruefpunkt_vorhanden':'weiteren_pruefpunkt_suchen',
        temperaturabstand_zum_pruefpunkt_c:ausfuehrung_geprueft?rounded(ziel_aussen_c-geprueft_aussen_c):null,
        grenze:'Betriebsgrenze oder einzelner Prüfpunkt erlauben keine COP-Vorhersage. Abtauung und Heizlast mit prüfen.'};
    },
    example:{args:{ziel_aussen_c:-12,geprueft_aussen_c:7,min_betrieb_c:-10,ausfuehrung_geprueft:true},expect:{status:'unter_betriebsgrenze'}},
  },
  {
    name:'daemmvorhang_stoff_saisonbeleg',
    description:'Bei Thermovorhängen sommerlichen Sonnenschutz und winterliche Dämmversprechen prüfen — Identify the evidence needed for a thermal curtain performance claim.',
    page:'/guide/thermovorhang-ratgeber.html',
    properties:{
      zweck:choice('Gewünschter Einsatz.', 'sonnenschutz','waermeverlust','abdunklung'),
      fensteraufbau:bool('Ist der Fensteraufbau des Prüfbelegs angegeben?'),
      montage_gleich:bool('Entspricht die Montage der eigenen Situation, einschließlich Abstand und Abdeckung?'),
      messgroesse:bool('Hat der Anbieter zur angestrebten Wirkung eine konkrete Messgröße und Methode genannt?'),
    },
    calculate({zweck,fensteraufbau,montage_gleich,messgroesse}) {
      const relevant={sonnenschutz:'Gesamtenergiedurchlass beziehungsweise vergleichbare Angabe zum Sonneneintrag',
        waermeverlust:'Wärmedurchgang oder gemessene Wärmeverluste',
        abdunklung:'Lichtdurchlässigkeit beziehungsweise Abdunklungsgrad'};
      return {gesuchter_beleg:relevant[zweck], pruefaufbau_einordnen:fensteraufbau&&montage_gleich&&messgroesse,
        grenze:'Stoffdicke oder Farbe allein ergeben keinen Einsparwert. Die Kombination aus Fenster und Vorhang ist entscheidend.'};
    },
    example:{args:{zweck:'waermeverlust',fensteraufbau:false,montage_gleich:true,messgroesse:true},expect:{pruefaufbau_einordnen:false}},
  },
  {
    name:'luftbefeuchter_technik_fotobeleg',
    description:'Klären, ob ein Foto oder die genaue Anleitung die Befeuchtertechnik belegt — Check whether the humidifier operating principle is actually documented.',
    page:'/guide/luftbefeuchter-weisser-staub.html',
    properties:{
      bildsignal:choice('Was ist im Produktbild erkennbar?', 'nebel','kein_nebel','kein_bild'),
      anleitung:choice('In der Anleitung bestätigte Technik.', 'ultraschall','verdunstung','dampf','unbekannt'),
      modell_geprueft:bool('Gehört die Anleitung zur vollständigen Variante auf dem Typenschild?'),
    },
    calculate({bildsignal,anleitung,modell_geprueft}) {
      const verified=modell_geprueft && anleitung!=='unbekannt';
      return {technik:verified?anleitung:'nicht_belegt', bildbeobachtung:bildsignal,
        naechster_schritt:verified?'Wasser- und Pflegevorgaben für genau dieses Modell lesen.'
          :'Modellnummer ablesen und Betriebsart in der Anleitung nachschlagen.',
        grenze:'Sichtbarer Nebel trennt Ultraschall und Dampf nicht sicher und belegt keine Wasserempfehlung.'};
    },
    example:{args:{bildsignal:'nebel',anleitung:'unbekannt',modell_geprueft:false},expect:{technik:'nicht_belegt'}},
  },
  {
    name:'ersatzfilter_pack_stueckpreis',
    description:'Bei zwei Ersatzfilterpacks mit verschiedenen Stückzahlen den Preis pro nutzbarem Satz vergleichen — Compare bundle unit prices after accessory fit and delivery charges.',
    page:'/ersatzfilter.html',
    properties:{
      a_pack_eur:money('Packpreis A inklusive Versand in Euro.'),
      b_pack_eur:money('Packpreis B inklusive Versand in Euro.'),
      a_nutzbare_saetze:number('Anzahl vom Käufer für die Variante bestätigter vollständiger Sätze A.',0,100),
      b_nutzbare_saetze:number('Anzahl vom Käufer für die Variante bestätigter vollständiger Sätze B.',0,100),
      gleiche_funktion:bool('Gleiche Filterfunktion und dokumentierte Freigabe für dasselbe Gerät?'),
    },
    calculate({a_pack_eur,b_pack_eur,a_nutzbare_saetze,b_nutzbare_saetze,gleiche_funktion}) {
      if (![a_nutzbare_saetze,b_nutzbare_saetze].every(Number.isInteger)) throw new RangeError('Satzanzahl');
      const comparable=gleiche_funktion && a_nutzbare_saetze>0 && b_nutzbare_saetze>0;
      return {vergleichbar:comparable, a_eur_je_satz:comparable?rounded(a_pack_eur/a_nutzbare_saetze):null,
        b_eur_je_satz:comparable?rounded(b_pack_eur/b_nutzbare_saetze):null,
        grenze:'Packteile sind nicht automatisch vollständige Filterwechsel. Haltbarkeit und Wechselintervall gesondert prüfen.'};
    },
    example:{args:{a_pack_eur:40,b_pack_eur:30,a_nutzbare_saetze:2,b_nutzbare_saetze:1,gleiche_funktion:true},expect:{a_eur_je_satz:20,b_eur_je_satz:30}},
  },
  {
    name:'kundenrezension_modellgruppe_pruefen',
    description:'Bewertungen aus einer gemeinsamen Händlerseite dem richtigen Modell zuordnen — Assess whether a retailer review count applies to the exact variant.',
    page:method,
    properties:{
      gesamt:number('Sichtbare Anzahl Bewertungen für die gesamte Angebotsgruppe.',0,10000000),
      gefiltert:number('Sichtbare Anzahl nach bestätigtem Modellfilter; bei fehlendem Filter 0.',0,10000000),
      filter_geprueft:bool('Händler bestätigt den Filter für genau die Modellvariante?'),
    },
    calculate({gesamt,gefiltert,filter_geprueft}) {
      if (!Number.isInteger(gesamt) || !Number.isInteger(gefiltert) || gefiltert > gesamt) throw new RangeError('Bewertungsanzahl');
      return {
        bewertungen_modell:filter_geprueft?gefiltert:null,
        gruppenwert_verwendbar:filter_geprueft && gefiltert===gesamt,
        grenze:'Anzahl und Zuordnung sagen nichts über die Echtheit der Rezensionen oder die Qualität des Geräts.',
      };
    },
    example:{args:{gesamt:250,gefiltert:0,filter_geprueft:false},expect:{bewertungen_modell:null,gruppenwert_verwendbar:false}},
  },
];
