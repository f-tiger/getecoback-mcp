import dehumidifiers from '../data/dehum-catalog.json' with {type:'json'};
import thermostats from '../data/thermostat-catalog.json' with {type:'json'};
import thermostatFit from '../site/assets/thermostat-fit-data.json' with {type:'json'};
import robots from '../data/robot-catalog.json' with {type:'json'};
import humidifiers from '../data/humidifier-catalog.json' with {type:'json'};
import {PORTASPLIT_ENTRY_PAGE, PORTASPLIT_ENTRY_URL, PORTASPLIT_GUIDE_URL} from './portasplit-entry.mjs';
import {CELLAR_VENTILATION_ANCHOR, CELLAR_VENTILATION_BOUNDS, CELLAR_VENTILATION_PAGE, checkCellarVentilation} from '../site/assets/keller-lueften-check.mjs';

const method = '/wie-wir-empfehlen.html';
const cold = '/guide/luftentfeuchter-keller.html';
const thermo = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
const air = '/guide/luftreiniger-ratgeber.html';
const n90Page = '/guide/delonghi-pac-n90-test.html';
const n90Ean = 8004399512351;
const n90Model = 'PAC N90 ECO Silent';
const n90Support = 'https://www.delonghi.com/de-de/s/PACN90ECOSILENT';
const n90Datasheet = 'https://shop.sonepar.at/asset_external/downloads/pim/400901/datasheet_delonghi_PAC%20N90ECO.pdf';
const n90Label = 'https://library.delonghigroup.com/assetbank-delonghi/action/directLinkImage?assetId=209150&download=true';
const portaSplitManual = 'https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/PortaSplit-Gebrauchsanweisung-DE.pdf';
const portaSplitOriginalEan = 4048164116478;
const portaSplitLipMaxWidth = 45;
const portaSplitLipMinHeight = 20;
const windowSealPage = '/guide/fenster-zugluft-mietwohnung.html';
const tesaWindowGuide = 'https://www.tesa.com/de-de/buero-und-zuhause/do-it-yourself-magazin/fensterdichtung-erneuern.html';
const tesaConsumerCatalogue = 'https://www.tesa.com/de-de/files/download/11555752%2C4%2Ctesa-consumerkatalog-2024-online.pdf';
const tesamollWindowGaps = {E:[1,3.5], P:[2,5], D:[3,7]};
const trotec75EcoPage = '/guide/trotec-luftentfeuchter-test.html';
const trotec75EcoManual = 'https://de.trotec.com/fileadmin/downloads/Entfeuchtung/TTK75ECO/TRT-BA-TTK75ECO-TC-010-DE.pdf';
const trotec75EcoSupplier = 'https://www.baushop-express.com/trotec-kondensationsentfeuchter-ttk-eco.html';
const trotec75EcoOperatingRange = {temperatur_c:[5,32],luftfeuchte_prozent:[30,90]};



const bool = description => ({type:'boolean', description});
const choice = (description, ...values) => ({type:'string', enum: values, description});
const number = (description, minimum, maximum) => ({type:'number', minimum, maximum, description});
const money = description => number(description, 0, 50000);
const missing = entries => Object.entries(entries).filter(([,ok]) => !ok).map(([key]) => key);
const rounded = value => Math.round(value * 100) / 100;
const cellarMeasurement = (key, description) => number(description, ...CELLAR_VENTILATION_BOUNDS[key]);

function n90ModelStatus(ean, modell) {
  if (ean === 0) return 'ean_fehlt';
  if (ean !== n90Ean) return 'ean_abweicht';
  return modell === n90Model ? 'modellangaben_passen' : 'modellbezeichnung_klaeren';
}

const tadoXValveTable = 'https://cdn.bfldr.com/607DGEMS/at/hqb8tzxsq4cmchcjxsxtwhh/DE_SRTx_compatibility_Links.pdf';
const tadoXAdapterHelp = 'https://help.tado.com/de/articles/8949346-brauche-ich-einen-adapter-um-meinen-smarten-heizkorper-thermostat-x-zu-montieren';
const tadoXValveHelp = 'https://help.tado.com/de/articles/8949334-welche-heizkorperventile-sind-mit-dem-smarten-heizkorper-thermostat-x-von-tado-kompatibel';
const tadoXOventrop = new Map([
  ['unidh', {pitch:'m30_1_0', adapter:true}],
  ['unil', {pitch:'m30_1_0', adapter:true}],
  ['vindo_th', {pitch:'m30_1_5', adapter:false}],
]);

export const evidenceNext = [
  {
    name:'keller_lueften_taupunkt_messwerte',
    description:'Keller lüften? Innen und außen Temperatur und relative Luftfeuchte messen, die kälteste Wand eintragen und Trocknung und Kondensation prüfen — Compare paired indoor/outdoor dew points and the coldest measured wall to assess basement drying and condensation.',
    page:CELLAR_VENTILATION_PAGE,
    guide_url:'https://getecoback.com' + CELLAR_VENTILATION_PAGE + CELLAR_VENTILATION_ANCHOR,
    properties:{
      aussen_c:cellarMeasurement('aussen_c','Gleichzeitig gemessene Außentemperatur im Schatten in °C.'),
      aussen_rh_prozent:cellarMeasurement('aussen_rh_prozent','Zeitgleich gemessene relative Luftfeuchte draußen in Prozent.'),
      innen_c:cellarMeasurement('innen_c','Gleichzeitig gemessene Raumlufttemperatur im Keller in °C.'),
      innen_rh_prozent:cellarMeasurement('innen_rh_prozent','Zeitgleich gemessene relative Luftfeuchte im Keller in Prozent.'),
      wand_c:cellarMeasurement('wand_c','Tatsächlich gemessene Temperatur an der kältesten betrachteten Wandstelle in °C.'),
    },
    calculate(values) {
      return {
        ...checkCellarVentilation(values),
        quellen_url:'https://www.umweltbundesamt.de/themen/gesundheit/umwelteinfluesse-auf-den-menschen/schimmel/wie-luefte-ich-richtig-tipps-tricks-zur',
        verbraucherzentrale_url:'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426',
        quellen_geprueft_am:'2026-11-22',
        hinweis:'Der Taupunktvergleich ist eine Näherung bei ähnlichem Luftdruck. Im 1-°C-Orientierungsband noch einmal messen und die Genauigkeit der eigenen Fühler beachten. Bei sichtbarer Nässe oder wiederkehrendem Schimmel die Ursache vor dem Gerätekauf klären. Notwendige Lüftung bleibt separat.',
      };
    },
    example:{args:{aussen_c:28,aussen_rh_prozent:60,innen_c:17,innen_rh_prozent:65,wand_c:15},expect:{status:'kondensationsrisiko',aussen_taupunkt_c:19.5,innen_taupunkt_c:10.4}},
  },
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
    name:'midea_portasplit_fensterhalterung_pruefen',
    description:'Halterung, Universalhalterung und Lieferumfang der originalen Midea PortaSplit für Dreh-Kippfenster, Dachfenster und französische Balkonfenster prüfen — Check the original German Midea PortaSplit bracket and seller bundle before purchase.',
    page:PORTASPLIT_ENTRY_PAGE,
    guide_url:PORTASPLIT_GUIDE_URL,
    properties:{
      angebot_ean:number('EAN aus dem konkreten deutschen Angebot oder vom Typenschild, als 13-stellige Zahl. 0 wenn unbekannt.',0,9999999999999),
      fenster:choice('Fenstertyp am vorgesehenen Aufstellort.', 'dreh_kippfenster','dachfenster','franzoesischer_balkon','anders_oder_offen'),
      standardhalterung:choice('Ist die Original-Standardhalterung im konkreten Angebot bestätigt?', 'im_angebot','fehlt','offen'),
      universalhalterung:choice('Ist die Universalhalterung mit EAN 4048164118687 im Angebot oder separat vorhanden?', 'ean_im_angebot','ean_separat_vorhanden','fehlt','offen'),
    },
    calculate({angebot_ean,fenster,standardhalterung,universalhalterung}) {
      if (!Number.isSafeInteger(angebot_ean) || (angebot_ean !== 0 && angebot_ean < 1000000000000)) throw new RangeError('EAN');
      const referenz_ean = portaSplitOriginalEan;
      const original = angebot_ean === referenz_ean;
      const halterung = original ? {
        dreh_kippfenster:'standardhalterung', dachfenster:'universalhalterung', franzoesischer_balkon:'universalhalterung',
      }[fenster] ?? null : null;
      const beleg = halterung === 'standardhalterung' ? standardhalterung : halterung === 'universalhalterung' ? universalhalterung : null;
      let status = 'halterungsbeleg_vorhanden';
      if (!original) status = 'modellnummer_abgleichen';
      else if (!halterung) status = 'fenstertyp_mit_anleitung_abgleichen';
      else if (beleg === 'offen') status = 'lieferumfang_klaeren';
      else if (beleg === 'fehlt') status = 'passende_halterung_vor_kauf_klaeren';
      return {
        status, referenz_ean, angebot_ean_passt:angebot_ean === 0 ? null : original,
        halterung_im_herstellerbeispiel:halterung, beleg_fuer_diese_halterung:beleg,
        universalhalterung_ean:halterung === 'universalhalterung' ? 4048164118687 : null,
        quelle_modell:'https://www.midea.com/de/klimatisieren-heizen/portasplit',
        quelle_aufstellung:'https://www.midea.com/de/klimatisieren-heizen/portasplit/installation',
        quelle_universalhalterung:'https://www.midea.com/content/dam/midea-aem/de/klimatisieren-heizen/portasplit/universalhalterung/PortaSplit-UM-universal-bracket.pdf',
        quellen_geprueft_am:'2026-11-20',
        entry_url:PORTASPLIT_ENTRY_URL,
        grenze:'Ein bestätigter Lieferumfang ersetzt weder die Prüfung der konkreten Fenstermaße und Befestigung nach Anleitung noch eine gegebenenfalls erforderliche Erlaubnis. Bei offenem Modell, fehlender Halterung oder ungeklärter Aufstellung mit dem Kauf warten.',
      };
    },
    example:{args:{angebot_ean:4048164116478,fenster:'dachfenster',standardhalterung:'im_angebot',universalhalterung:'fehlt'},
      expect:{status:'passende_halterung_vor_kauf_klaeren',halterung_im_herstellerbeispiel:'universalhalterung',universalhalterung_ean:4048164118687,entry_url:PORTASPLIT_ENTRY_URL}},
  },
  {
    name:'trotec_ttk75_eco_pruefpunkt',
    description:'Trotec TTK 75 ECO: Betriebsbereich, dokumentierten Entzug bei 30 °C/80 % und separat ausgewiesenen Lieferantenwert für 20 °C/60 % prüfen — Check documented TTK 75 ECO conditions without extrapolating to a cold cellar.',
    page:trotec75EcoPage,
    guide_url:'https://getecoback.com'+trotec75EcoPage+'#ttk75-pruefpunkt',
    properties:{
      modell:choice('Steht der vollständige Modellname TTK 75 ECO auf Typenschild oder Angebot?', 'ttk_75_eco','abweichend_oder_offen'),
      temperatur_c:number('Vor Ort gemessene Raumlufttemperatur in °C.',-30,60),
      luftfeuchte_prozent:number('Zeitgleich gemessene relative Raumluftfeuchte in Prozent.',0,100),
    },
    calculate({modell,temperatur_c,luftfeuchte_prozent}) {
      const exact = modell === 'ttk_75_eco';
      const [minTemp,maxTemp] = trotec75EcoOperatingRange.temperatur_c;
      const [minHumidity,maxHumidity] = trotec75EcoOperatingRange.luftfeuchte_prozent;
      const applicable = exact && temperatur_c >= minTemp && temperatur_c <= maxTemp &&
        luftfeuchte_prozent >= minHumidity && luftfeuchte_prozent <= maxHumidity;
      const manufacturerPoint = applicable && temperatur_c === 30 && luftfeuchte_prozent === 80;
      const supplierPoint = applicable && temperatur_c === 20 && luftfeuchte_prozent === 60;
      let status, naechster_schritt;
      if (!exact) {
        status = 'modell_klaeren';
        naechster_schritt = 'Vollständigen Modellnamen und die zum Gerät gehörende Anleitung prüfen. TTK 75 E ist eine andere Bezeichnung.';
      } else if (!applicable) {
        status = 'ausserhalb_betriebsbereich';
        naechster_schritt = 'Für diese Messwerte liegt der Einsatz außerhalb des dokumentierten Betriebsbereichs. Ursache und geeignete Lösung vor dem Kauf klären.';
      } else if (manufacturerPoint) {
        status = 'hersteller_pruefpunkt';
        naechster_schritt = 'Die 20 Liter gelten beim dokumentierten Prüfpunkt. Für den konkreten Raum zusätzlich Feuchtelast, Wasserweg und reale Laufzeit prüfen.';
      } else if (supplierPoint) {
        status = 'lieferantenwert_abgleichen';
        naechster_schritt = 'Der Lieferant nennt 6,4 Liter unter diesen Bedingungen. Vor dem Kauf den Wert für die konkrete Geräteausführung bestätigen lassen.';
      } else {
        status = 'kein_pruefpunkt';
        naechster_schritt = 'Temperatur und Feuchte protokollieren, die Feuchteursache klären und einen bestätigten Prüfwert für diese Bedingungen anfragen. Bis dahin den Gerätekauf offen lassen.';
      }
      return {
        status, dokumentierter_entzug_l_24h:manufacturerPoint ? 20 : null,
        lieferantenwert_l_24h:supplierPoint ? 6.4 : null,
        betriebsbereich:exact ? trotec75EcoOperatingRange : null, naechster_schritt,
        hersteller_anleitung_url:trotec75EcoManual, druckseite:14, lieferantenquelle_url:trotec75EcoSupplier,
        quellen_geprueft_am:'2026-11-22',
        grenze:'21 l/24 h ist separat als Maximalwert angegeben. Der Betriebsbereich liefert keine Liter- oder Verbrauchsprognose für andere Bedingungen. Der Lieferantenwert ist kein eigener oder in der Anleitung bestätigter Messwert.',
      };
    },
    example:{args:{modell:'ttk_75_eco',temperatur_c:10,luftfeuchte_prozent:60},
      expect:{status:'kein_pruefpunkt',dokumentierter_entzug_l_24h:null,lieferantenwert_l_24h:null}},
  },
  {
    name:'tesamoll_fensterdichtung_profil_pruefen',
    description:'tesamoll E-, P- und D-Fensterdichtungen: den kleinsten und größten gemessenen Spalt mit den dokumentierten Klebeprofilen vergleichen und Nut oder zweite Dichtung abgrenzen — Compare documented gap ranges for named adhesive window seals.',
    page:windowSealPage,
    guide_url:'https://getecoback.com'+windowSealPage+'#dichtungsprofil',
    properties:{
      dichtungsart:choice('Ist das geplante tesamoll-Klebeprofil am Fenster bereits als Dichtungsart geklärt, eine Nutdichtung vorhanden, eine zusätzliche Dichtung geplant oder die Bauart offen?', 'tesamoll_klebeprofil','nutdichtung','zusatzdichtung','unbekannt'),
      spalt_min_mm:number('Kleinster Spalt an den gemessenen Stellen der vorgesehenen Dichtungsebene in mm. Falls unbekannt, 0.',0,100),
      spalt_max_mm:number('Größter Spalt an den gemessenen Stellen derselben Dichtungsebene in mm. Falls unbekannt, 0.',0,100),
    },
    calculate({dichtungsart,spalt_min_mm,spalt_max_mm}) {
      const passenderTyp = dichtungsart === 'tesamoll_klebeprofil';
      const messungVollstaendig = spalt_min_mm > 0 && spalt_max_mm >= spalt_min_mm;
      const passende_profile = passenderTyp && messungVollstaendig ? Object.entries(tesamollWindowGaps)
        .filter(([, [min,max]]) => min <= spalt_min_mm && spalt_max_mm <= max)
        .map(([profil]) => profil) : [];
      let status, naechster_schritt;
      if (!passenderTyp) {
        status = 'fenstersystem_klaeren';
        naechster_schritt = 'Vor dem Kauf vorhandene Nut, Originalprofil oder zusätzliche Dichtungsebene mit der Hausverwaltung oder einem Fensterfachbetrieb klären.';
      } else if (!messungVollstaendig) {
        status = 'messwerte_klaeren';
        naechster_schritt = 'An mehreren Stellen derselben Dichtungsebene messen. Kleinsten und größten Messwert in dieser Reihenfolge eintragen.';
      } else if (!passende_profile.length) {
        status = 'kein_dokumentiertes_profil';
        naechster_schritt = 'Keines der drei Profile deckt alle gemessenen Stellen ab. Messpunkte, Fensterzustand und vorgesehenes Profil vor einem Kauf klären.';
      } else {
        status = 'abmessungen_passender_profile';
        naechster_schritt = 'Die aufgeführten Profile decken nur die Spaltmaße ab. Vor dem Kauf die genaue Packung, die Oberfläche und das Schließen des Fensters prüfen.';
      }
      return {
        status, passende_profile, dokumentierte_spaltbereiche_mm:tesamollWindowGaps, naechster_schritt,
        hersteller_anleitung_url:tesaWindowGuide, hersteller_katalog_url:tesaConsumerCatalogue, katalog_druckseite:28,
        quellen_geprueft_am:'2026-11-22',
        grenze:'Die Maße gelten für die genannten tesamoll-Klebeprofile. Sie bestätigen weder eine Montage noch die Eignung für eine Nut oder zweite Dichtung. Entwässerungsöffnungen und vorgesehene Lüftung frei lassen.',
      };
    },
    example:{args:{dichtungsart:'tesamoll_klebeprofil',spalt_min_mm:4,spalt_max_mm:4},
      expect:{status:'abmessungen_passender_profile',passende_profile:['P','D']}},
  },
  {
    name:'midea_portasplit_fensterfalz_pruefen',
    description:'Breite und Höhe des Fensterfalzes für die Original-Standardhalterung der Midea PortaSplit nach der deutschen Zeichnung prüfen — Check the documented window-lip dimensions for the original Midea PortaSplit standard bracket.',
    page:PORTASPLIT_ENTRY_PAGE,
    guide_url:'https://getecoback.com'+PORTASPLIT_ENTRY_PAGE+'#fensterfalz',
    properties:{
      angebot_ean:number('EAN der angebotenen oder vorhandenen PortaSplit. Bei unbekannter EAN 0.',0,9999999999999),
      halterung:choice('Genaue Halterung anhand des Angebots oder der Anleitung bestätigt?', 'original_standard','anders_oder_offen'),
      fenster:choice('Öffnet sich das vorgesehene Fenster nach innen?', 'nach_innen_oeffnend','anders_oder_offen'),
      messbezug:choice('Vorhandene Maße beziehen sich auf den Falzquerschnitt in der Midea-Zeichnung. Bei unklarer Dichtung oder anderem Messpunkt die zweite Option wählen.', 'falz_nach_zeichnung','dichtung_oder_unklar'),
      falzbreite_mm:number('Breite des Fensterfalzes in Millimetern gemäß Zeichnung. Bei fehlendem Wert 0.',0,1000),
      falzhoehe_mm:number('Höhe des Fensterfalzes in Millimetern gemäß Zeichnung. Bei fehlendem Wert 0.',0,1000),
    },
    calculate({angebot_ean,halterung,fenster,messbezug,falzbreite_mm,falzhoehe_mm}) {
      if (!Number.isSafeInteger(angebot_ean) || (angebot_ean !== 0 && angebot_ean < 1000000000000)) throw new RangeError('EAN');
      const isOriginal = angebot_ean === portaSplitOriginalEan;
      const applies = isOriginal && halterung === 'original_standard' && fenster === 'nach_innen_oeffnend';
      const measuresApply = applies && messbezug === 'falz_nach_zeichnung';
      const widthKnown = measuresApply && falzbreite_mm > 0;
      const heightKnown = measuresApply && falzhoehe_mm > 0;
      const outside = (widthKnown && falzbreite_mm > portaSplitLipMaxWidth) ||
        (heightKnown && falzhoehe_mm < portaSplitLipMinHeight);
      let status, naechster_schritt;
      if (!isOriginal) {
        status = 'modell_klaeren';
        naechster_schritt = 'Vollständige Variante und EAN vor der Auswahl mit dem Händler oder der Modellanleitung klären.';
      } else if (!applies) {
        status = 'halterung_oder_fenster_klaeren';
        naechster_schritt = 'Exakte Halterung und Fenstertyp anhand der Modellanleitung prüfen. Diese Maße gelten für die Standardhalterung am nach innen öffnenden Fenster.';
      } else if (outside) {
        status = 'ausserhalb_dokumentierter_masse';
        naechster_schritt = 'Die Standardhalterung für diese Maße nicht einplanen. Eine für den Standort dokumentierte Lösung mit Midea klären oder den Kauf aufschieben.';
      } else if (!widthKnown || !heightKnown) {
        status = 'messpunkt_oder_masse_klaeren';
        naechster_schritt = 'Beide Maße am Falzquerschnitt aus der Zeichnung feststellen. Unklaren Dichtungseinfluss vor dem Kauf mit Midea klären.';
      } else {
        status = 'masse_im_dokumentierten_rahmen';
        naechster_schritt = 'Als Nächstes Befestigung, Sicherung, Aufstellort und gegebenenfalls Erlaubnis zu diesem Fenster separat nach Anleitung prüfen.';
      }
      return {
        status, referenz_ean:portaSplitOriginalEan, naechster_schritt,
        breite_max_mm:applies ? portaSplitLipMaxWidth : null,
        hoehe_min_mm:applies ? portaSplitLipMinHeight : null,
        breite_unter_max_mm:widthKnown ? rounded(portaSplitLipMaxWidth-falzbreite_mm) : null,
        hoehe_ueber_min_mm:heightKnown ? rounded(falzhoehe_mm-portaSplitLipMinHeight) : null,
        hersteller_anleitung_url:portaSplitManual, druckseite:15,
        grenze:'Reine Maßprüfung an einem dokumentierten Falz. Eine passende Breite und Höhe erlauben noch keine Aufstellung oder Befestigung des Außengeräts.',
      };
    },
    example:{args:{angebot_ean:portaSplitOriginalEan,halterung:'original_standard',fenster:'nach_innen_oeffnend',messbezug:'falz_nach_zeichnung',falzbreite_mm:60,falzhoehe_mm:0},
      expect:{status:'ausserhalb_dokumentierter_masse',breite_unter_max_mm:-15}},
  },
  {
    name:'pac_n90_ean_abgleichen',
    description:'Modell, EAN 8004399512351 und Typenschild des De’Longhi PAC N90 ECO Silent vor dem Kauf abgleichen — Check the advertised model and GTIN for the documented German PAC N90 ECO Silent.',
    page:n90Page,
    guide_url:'https://getecoback.com' + n90Page + '#testlage',
    properties:{
      ean:number('Als Zahl geschriebene 13-stellige EAN vom Angebot oder Typenschild. Bei fehlender EAN 0.',0,9999999999999),
      modell:choice('Zusätzliche Modellbezeichnung.', n90Model,'abweichend','unbekannt'),
    },
    calculate({ean,modell}) {
      if (!Number.isSafeInteger(ean) || (ean !== 0 && ean < 1000000000000)) throw new RangeError('EAN');
      const status = n90ModelStatus(ean,modell);
      return {referenz_ean:n90Ean,referenz_modell:n90Model,status,
        hersteller_url:n90Support,datenblatt_url:n90Datasheet,datenblatt_hinweis:'De’Longhi-Datenblatt beim österreichischen Vertriebspartner Sonepar; kein Nachweis für einen deutschen Lieferumfang oder aktuellen Bestand.',
        naechster_schritt:status === 'modellangaben_passen' ?
          'Lieferumfang, Aufstellung und Abluftweg für das konkrete deutsche Angebot separat prüfen.' :
          'Vor einer Bestellung vollständige Modellbezeichnung und EAN am Typenschild oder beim Händler klären. Für abweichende Modelle die eigenen Unterlagen prüfen.',
        grenze:'Zwei passende Angaben identifizieren den dokumentierten Typ. Händler und Lieferumfang separat prüfen.'};
    },
    example:{args:{ean:8004399512351,modell:'PAC N90 ECO Silent'},expect:{status:'modellangaben_passen'}},
  },
  {
    name:'pac_n90_energielabel_zu_stromkosten',
    description:'PAC N90 ECO Silent: Stromkosten pro EU-Labelstunde aus 0,9 kWh und eigenem Tarif berechnen, Kühlleistung von 2,5 kW abgrenzen und den gemessenen Verbrauch eines tatsächlichen Laufs separat auswerten — Compare energy-label and metered electricity cost for the verified German PAC N90.',
    page:n90Page,
    guide_url:'https://getecoback.com' + n90Page + '#n90-energielabel',
    properties:{
      ean:number('EAN in 13 Ziffern aus Angebot oder Typenschild. Bei unbekannter EAN 0.',0,9999999999999),
      modell:choice('Vollständige Modellbezeichnung vom Etikett oder Angebot.', n90Model,'abweichend','unbekannt'),
      arbeitspreis_eur_kwh:number('Eigener Arbeitspreis in EUR pro kWh (35 Cent = 0,35 EUR). Bei unbekanntem Tarif -1 angeben.',-1,20),
      messung_vollstaendig:bool('Wurden die kWh für denselben vollständigen Zeitraum am eigenen Gerät abgelesen?'),
      messenergie_kwh:number('Gemessene elektrische Energie in kWh für den vollständigen Zeitraum. Bei fehlender Messung 0.',0,100000),
      messdauer_min:number('Messzeitraum in ganzen Minuten, einschließlich Pausen. Bei fehlender Dauer 0.',0,525600),
    },
    calculate({ean,modell,arbeitspreis_eur_kwh,messung_vollstaendig,messenergie_kwh,messdauer_min}) {
      if (!Number.isSafeInteger(ean) || (ean !== 0 && ean < 1000000000000)) throw new RangeError('EAN');
      if (arbeitspreis_eur_kwh < 0 && arbeitspreis_eur_kwh !== -1) throw new RangeError('Arbeitspreis');
      if (!Number.isInteger(messdauer_min)) throw new RangeError('Messdauer');

      const status = n90ModelStatus(ean,modell);
      const exactModel = status === 'modellangaben_passen';
      const tariffKnown = arbeitspreis_eur_kwh >= 0;
      const measurementReady = exactModel && messung_vollstaendig && messdauer_min > 0;
      const labelKwh = 0.9;
      return {
        status, referenz_ean:n90Ean, tarif_bekannt:tariffKnown,
        label_eu_kwh_je_60_min:exactModel ? labelKwh : null,
        label_kuehlleistung_kw:exactModel ? 2.5 : null,
        label_referenz_eur_je_60_min:exactModel && tariffKnown ? rounded(labelKwh * arbeitspreis_eur_kwh) : null,
        messung_auswertbar:measurementReady,
        messzeitraum_kwh:measurementReady ? messenergie_kwh : null,
        messzeitraum_min:measurementReady ? messdauer_min : null,
        messzeitraum_eur:measurementReady && tariffKnown ? rounded(messenergie_kwh * arbeitspreis_eur_kwh) : null,
        messwert_eur_je_stunde:measurementReady && tariffKnown ? rounded(messenergie_kwh * arbeitspreis_eur_kwh * 60 / messdauer_min) : null,
        quellenmarkt:'DE', quellen_geprueft_am:'2026-11-20',
        energielabel_url:n90Label, hersteller_url:n90Support,
        naechster_schritt:exactModel
          ? 'Eigenen Tarif und vollständige kWh-Messung des eigenen Laufs heranziehen. Reichen Verschattung und Lüften, zunächst ohne Kauf auskommen.'
          : 'Vor dem Kauf EAN und vollständige Variante am Typenschild oder beim Händler prüfen. Bei anderer Variante das zugehörige eigene Energieetikett suchen.',
        grenze:'Die Kühlleistung ist keine elektrische Aufnahme. Eine nach EU-Label berechnete Normstunde und die Messung eines einzelnen Laufs liefern keine Prognose für den Alltag. Fixe Tarifbestandteile sind nicht enthalten.',
      };
    },
    example:{args:{ean:n90Ean,modell:n90Model,arbeitspreis_eur_kwh:0.30,messung_vollstaendig:false,messenergie_kwh:0,messdauer_min:0},
      expect:{status:'modellangaben_passen',label_eu_kwh_je_60_min:0.9,label_kuehlleistung_kw:2.5,label_referenz_eur_je_60_min:0.27,messzeitraum_eur:null}},
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
    name:'fritz_302_danfoss_adapter',
    description:'Welcher Adapter gehört zum FRITZ!Smart Thermo 302 (FRITZ!DECT 302), Artikel 20003120, bei Danfoss RA, RAV oder RAVL? Unbekanntes Ventil vor dem Kauf identifizieren — Check the documented adapter for the German FRITZ! 302 package.',
    page:thermo,
    guide_url:'https://getecoback.com' + thermo + '#fritz-302-danfoss-adapter',
    properties:{
      artikelnummer:choice('Artikelnummer des deutschen Thermostatpakets laut Packung oder Produktunterlagen.', '20003120','andere_oder_unbekannt'),
      ventil:choice('Am Ventil oder in seinen Unterlagen eindeutig identifizierte Familie. Ein Durchmesser allein genügt nicht.', 'danfoss-ra','danfoss-rav','danfoss-ravl','anders_oder_unbekannt'),
    },
    calculate({artikelnummer,ventil}) {
      const {fritz,sources} = thermostatFit;
      const valve = artikelnummer === fritz.model && fritz.cases.find(entry => entry.id === ventil);
      const evidence = {
        quellenmarkt:'DE', quellen_geprueft_am:fritz.reviewed,
        quellen_url:sources['fritz-valves'].url, produkt_url:sources['fritz-product'].url,
      };
      if (!valve) return {
        ...evidence, status:'modell_oder_ventil_klaeren',
        adapter_im_lieferumfang:null, adapter_mit_pin_dokumentiert:null,
        naechster_schritt:'Keinen Adapter auf Verdacht kaufen. Artikelnummer und Ventilkennzeichnung in den Unterlagen abgleichen. Ein Durchmesser allein identifiziert kein Ventil.',
      };
      const included = valve.id === 'danfoss-ra';
      return {
        ...evidence, status:included ? 'adapter_im_lieferumfang' : 'adapter_separat',
        ventil:valve.label, adapter_im_lieferumfang:included,
        adapter_mit_pin_dokumentiert:valve.id === 'danfoss-rav' ? true : null,
        herstellerangabe:valve.title, naechster_schritt:valve.detail,
      };
    },
    example:{args:{artikelnummer:'20003120',ventil:'danfoss-rav'},expect:{status:'adapter_separat',adapter_im_lieferumfang:false,adapter_mit_pin_dokumentiert:true}},
  },
  {
    name:'tado_x_oventrop_ventiladapter_pruefen',
    description:'tado° X am Oventrop-Heizkörperventil prüfen: UniDH und UniL M30 × 1,0 benötigen einen separaten Adapter, Vindo TH M30 × 1,5 ist direkt dokumentiert. 30 mm allein reicht nicht — Check exact Oventrop valve and thread before buying a tado X thermostat.',
    page:thermo,
    guide_url:'https://getecoback.com' + thermo + '#tado-x-oventrop',
    properties:{
      ventilmodell:choice('Sicher erkanntes Oventrop-Modell am vorhandenen Ventil.', 'unidh','unil','vindo_th','anders_oder_unbekannt'),
      gewinde:choice('Belegte Gewindegröße und Steigung (nicht allein aus 30 mm Durchmesser ableiten).', 'm30_1_0','m30_1_5','anders','unbekannt'),
      ventilzustand:choice('Vor Ort festgestellter Ventiltyp und Zustand.', 'thermostatisch_unauffaellig','manuell','beschaedigt_oder_undicht','unbekannt'),
    },
    calculate({ventilmodell,gewinde,ventilzustand}) {
      const valve = tadoXOventrop.get(ventilmodell);
      const sources = {
        quellenmarkt:'DE', quellenstand:'tado° X Kompatibilitätsliste V2, Oktober 2026', quellen_geprueft_am:'2026-11-20',
        quellen_url:tadoXValveTable, adapter_hinweis_url:tadoXAdapterHelp, ventil_hinweis_url:tadoXValveHelp,
        grenze:'Gilt für den smarten Heizkörper-Thermostat X und die hier aufgeführten Ventile. Kein Beleg für V3+, Systemzentrale oder den Zustand am eigenen Heizkörper.',
      };
      const stop = (status, naechster_schritt) => ({
        ...sources, status, adapter_artikelnummer:null, adapter_ean:null, adapter_im_x_lieferumfang:null, naechster_schritt,
      });
      if (ventilzustand === 'beschaedigt_oder_undicht') {
        return stop('zustand_klaeren', 'Nichts bestellen oder montieren. Ein beschädigtes, rostiges oder undichtes Ventil zuerst fachlich prüfen lassen.');
      }
      if (ventilzustand === 'manuell') {
        return stop('manuelles_ventil_nicht_kompatibel', 'Für dieses manuelle Ventil kein tado° X bestellen. Einen möglichen Ventiltausch mit einem Fachbetrieb klären.');
      }
      if (ventilzustand === 'unbekannt' || !valve || gewinde === 'unbekannt') {
        return stop('ventilbeleg_fehlend', 'Vor dem Kauf thermostatischen Ventiltyp, genaue Modellbezeichnung und Gewindesteigung prüfen. Ein Außendurchmesser von etwa 30 mm reicht nicht.');
      }
      if (gewinde !== valve.pitch) {
        return stop('modell_gewinde_widerspruch', 'Mit der Modellkennzeichnung und der Gewindeangabe den Widerspruch klären. Bis dahin kein Thermostat oder Adapter bestellen.');
      }
      return {...sources,
        status:valve.adapter ? 'separater_adapter_erforderlich' : 'direktmontage_dokumentiert',
        quellen_url:`${tadoXValveTable}#page=${valve.adapter ? 7 : 6}`,
        adapter_artikelnummer:valve.adapter ? '1011445' : null,
        adapter_ean:valve.adapter ? '4026755228717' : null,
        adapter_im_x_lieferumfang:valve.adapter ? false : null,
        naechster_schritt:valve.adapter
          ? 'Vor der Bestellung des Thermostats den separat benötigten Adapter 1011445 und den Lieferumfang des konkreten Angebots abgleichen.'
          : 'Für die dokumentierte Direktmontage ist kein Adapter nötig. Das Angebot auf Thermostat X und die benötigte Systemzentrale prüfen.',
      };
    },
    example:{args:{ventilmodell:'unidh',gewinde:'m30_1_0',ventilzustand:'thermostatisch_unauffaellig'},
      expect:{status:'separater_adapter_erforderlich',adapter_artikelnummer:'1011445',adapter_ean:'4026755228717',adapter_im_x_lieferumfang:false}},
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
