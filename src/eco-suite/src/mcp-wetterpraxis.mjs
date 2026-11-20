const heat = '/guide/hitze-check.html';
const summer = '/guide/richtig-lueften-bei-hitze.html';
const attic = '/guide/dachgeschoss-kuehlen.html';
const protection = '/guide/hitzeschutz-fenster.html';
const bedroom = '/guide/bei-hitze-schlafen.html';
const sensor = '/guide/luftfeuchtigkeit-richtig-messen.html';
const cellar = '/guide/keller-lueften-sommer.html';
const winter = '/guide/richtig-lueften-im-winter.html';
const damp = '/guide/luftentfeuchter-gegen-schimmel.html';

const number = (description,minimum,maximum) => ({type:'number',description,minimum,maximum});
const temperature = description => number(description,-40,65);
const duration = description => number(description,0,1440);
const flag = description => ({type:'boolean',description});
const choice = (description,...values) => ({type:'string',description,enum:values});
const round = (value,digits=2) => Number(value.toFixed(digits));
const delta = (a,b) => round(a-b);

// The user supplies a working surface dew point or measured dew point difference.
// Computed exposure quantities describe the given observations or simple models.
function positiveDegreeHours(before,after,hours) {
  if (before<=0 && after<=0) return 0;
  if (before>=0 && after>=0) return (before+after)*hours/2;
  const positive = Math.max(before,after);
  return positive*positive*hours/(2*Math.abs(after-before));
}

export const wetterpraxis = [
  {
    name:'wetterprognose_ausgabe_und_zielstunde',
    description:'Zwei Prognoseausgaben auf dieselbe gültige Stunde prüfen — Check whether forecasts issued at different times describe the same valid hour.',
    page:heat,
    properties:{
      ausgabe_a_stunde:number('UTC-Stunde der Ausgabe A auf einer gemeinsamen durchlaufenden Stundenachse.',0,10000),
      vorlauf_a_stunden:number('Vorlauf bis zur gültigen Stunde laut Datenquelle A.',0,240),
      ausgabe_b_stunde:number('UTC-Stunde der Ausgabe B auf derselben Achse.',0,10000),
      vorlauf_b_stunden:number('Vorlauf bis zur gültigen Stunde laut Datenquelle B.',0,240),
      ort_und_messgroesse_gleich:flag('Gleicher Ort und gleicher Stundenwert, z. B. beide Temperatur und kein Tagesmaximum?'),
    },
    calculate({ausgabe_a_stunde,vorlauf_a_stunden,ausgabe_b_stunde,vorlauf_b_stunden,ort_und_messgroesse_gleich}) {
      const a=round(ausgabe_a_stunde+vorlauf_a_stunden,3);
      const b=round(ausgabe_b_stunde+vorlauf_b_stunden,3);
      return {gueltige_stunde_a:a,gueltige_stunde_b:b,versatz_stunden:delta(b,a),
        gleiche_zielstunde:ort_und_messgroesse_gleich && Math.abs(a-b)<0.001,
        hinweis:'Stündliche Vorhersagen vor dem Vergleich auf UTC und denselben Gültigkeitszeitpunkt beziehen. Eine neue Ausgabe ist keine spätere Zielstunde.'};
    },
    example:{args:{ausgabe_a_stunde:8,vorlauf_a_stunden:14,ausgabe_b_stunde:14,vorlauf_b_stunden:8,ort_und_messgroesse_gleich:true},
      expect:{gueltige_stunde_a:22,gueltige_stunde_b:22,gleiche_zielstunde:true}},
  },
  {
    name:'wetterquelle_standort_messvergleich',
    description:'Stationswetter und Messung vor deinem Fenster nach Standorteignung dokumentieren — Choose the defensible source for a window-side observation.',
    page:summer,
    properties:{
      quelle:choice('Deklarierte Quelle.', 'stadt_stundenprognose','station_beobachtung','eigener_aussenfuehler'),
      aussenfuehler_verschattet:flag('Eigener Außenfühler belüftet und im Schatten, nicht an aufgeheizter Fläche?'),
      zeitstempel_passend:flag('Liegt der Wert für die gewünschte Stunde und nicht für ein Tagesmaximum vor?'),
      fensterseite_gemessen:flag('Erfasst die Messung die tatsächliche Fensterseite?'),
    },
    calculate({quelle,aussenfuehler_verschattet,zeitstempel_passend,fensterseite_gemessen}) {
      const lokal=quelle==='eigener_aussenfuehler'&&aussenfuehler_verschattet&&fensterseite_gemessen&&zeitstempel_passend;
      return {lokaler_stundenvergleich:lokal,
        verwendung:lokal?'lokale_beobachtung':zeitstempel_passend?'zeitkontext_lokalen_wert_messen':'passenden_zeitwert_waehlen',
        hinweis:'Stadtprognose und Station geben zeitlichen Kontext. Sonne, Fassade und Standort können den Wert am Fenster verändern.'};
    },
    example:{args:{quelle:'station_beobachtung',aussenfuehler_verschattet:false,zeitstempel_passend:true,fensterseite_gemessen:false},
      expect:{lokaler_stundenvergleich:false,verwendung:'zeitkontext_lokalen_wert_messen'}},
  },
  {
    name:'hitzeprognose_entscheidung_revidieren',
    description:'Prüfen, ob eine aktualisierte Temperaturprognose deine Vorbereitungsschwelle verschiebt — Review a heat preparation decision after a forecast revision.',
    page:heat,
    properties:{
      vorher_c:temperature('Früher prognostizierte Temperatur für genau denselben Zeitpunkt und Ort.'),
      aktuell_c:temperature('Aktualisierte Vorhersage.'),
      eigene_schwelle_c:temperature('Persönliche Vorbereitungsschwelle für diese Planung, kein medizinischer Grenzwert.'),
      zielzeit_und_ort_gleich:flag('Beide Temperaturangaben haben denselben Zielzeitpunkt, Ort und dieselbe Statistik?'),
    },
    calculate({vorher_c,aktuell_c,eigene_schwelle_c,zielzeit_und_ort_gleich}) {
      const old = vorher_c>=eigene_schwelle_c;
      const now = aktuell_c>=eigene_schwelle_c;
      return {aenderung_c:zielzeit_und_ort_gleich?delta(aktuell_c,vorher_c):null,
        planstatus:!zielzeit_und_ort_gleich?'zeit_und_ort_abgleichen':old===now?'gleiche_schwellenlage':now?'neu_ueber_schwelle':'neu_unter_schwelle',
        hinweis:'Nur die eingegebene Planungsmarke. Die Prognose für draußen ist keine Messung in deiner Wohnung.'};
    },
    example:{args:{vorher_c:29,aktuell_c:32,eigene_schwelle_c:30,zielzeit_und_ort_gleich:true},
      expect:{aenderung_c:3,planstatus:'neu_ueber_schwelle'}},
  },
  {
    name:'hitzeprognose_lokaler_fehlerbereich',
    description:'Aus drei übereinstimmenden Wetterpaaren lokale Prognoseabweichungen erfassen — Summarize three signed forecast errors observed at the property.',
    page:sensor,
    properties:{
      abweichung_1_c:number('Erstes lokales Ist minus prognostizierter Wert, gleiche Stunde, in °C.',-25,25),
      abweichung_2_c:number('Zweites lokales Ist minus prognostizierter Wert.',-25,25),
      abweichung_3_c:number('Drittes lokales Ist minus prognostizierter Wert.',-25,25),
      vergleichbare_paare:flag('Jeweils verschattete Außenmessung, Zeitabgleich und gleicher Prognosevorlauf?'),
    },
    calculate({abweichung_1_c,abweichung_2_c,abweichung_3_c,vergleichbare_paare}) {
      const values=[abweichung_1_c,abweichung_2_c,abweichung_3_c].sort((a,b)=>a-b);
      return {mittlere_beobachtung_c:vergleichbare_paare?values[1]:null,
        beobachteter_fehlerbereich_c:vergleichbare_paare?[values[0],values[2]]:null,
        hinweis:'Nur drei beobachtete Ist-minus-Prognose-Paare. Diese Spanne ist kein Konfidenzintervall und keine Korrektur für künftiges Wetter.'};
    },
    example:{args:{abweichung_1_c:1,abweichung_2_c:-2,abweichung_3_c:3,vergleichbare_paare:true},
      expect:{mittlere_beobachtung_c:1,beobachteter_fehlerbereich_c:[-2,3]}},
  },
  {
    name:'hitze_drei_tage_warme_naechte_folge',
    description:'Mehrere warme Tage mit den jeweils folgenden Nächten auf eine durchgehende Folge prüfen — Find consecutive day-and-night heat pairs in a short weather log.',
    page:bedroom,
    properties:{
      tag_1_max_c:temperature('Höchster Wert am ersten Tag.'),
      nacht_1_min_c:temperature('Tiefster Wert in der auf Tag 1 folgenden Nacht.'),
      tag_2_max_c:temperature('Höchster Wert am zweiten Tag.'),
      nacht_2_min_c:temperature('Tiefster Wert in der auf Tag 2 folgenden Nacht.'),
      tag_3_max_c:temperature('Höchster Wert am dritten Tag.'),
      nacht_3_min_c:temperature('Tiefster Wert in der auf Tag 3 folgenden Nacht.'),
      tag_marke_c:temperature('Selbst gewählte Marke für einen warmen Tag.'),
      nacht_marke_c:temperature('Selbst gewählte Marke für eine warme Nacht.'),
    },
    calculate({tag_1_max_c,nacht_1_min_c,tag_2_max_c,nacht_2_min_c,tag_3_max_c,nacht_3_min_c,tag_marke_c,nacht_marke_c}) {
      const pairs=[[tag_1_max_c,nacht_1_min_c],[tag_2_max_c,nacht_2_min_c],[tag_3_max_c,nacht_3_min_c]];
      let current=0, longest=0;
      const matching=pairs.map(([d,n])=>{
        const hit=d>=tag_marke_c&&n>=nacht_marke_c;
        current=hit?current+1:0;
        longest=Math.max(longest,current);
        return hit;
      });
      return {passende_paare:matching,laengste_folge:longest,
        hinweis:'Vergleiche dieselbe Wetterquelle oder denselben geeigneten Messort. Die eigenen Marken bilden keine offizielle Hitzewarnung.'};
    },
    example:{args:{tag_1_max_c:31,nacht_1_min_c:21,tag_2_max_c:32,nacht_2_min_c:22,tag_3_max_c:34,nacht_3_min_c:18,tag_marke_c:30,nacht_marke_c:20},
      expect:{passende_paare:[true,true,false],laengste_folge:2}},
  },
  {
    name:'schlafraum_waermegradstunden_nacht',
    description:'Dauer und Stärke einer gemessenen Überschreitung als Gradstunden zusammenfassen — Estimate heat degree-hours between three indoor readings.',
    page:bedroom,
    properties:{
      start_c:temperature('Erste Messung am selben Ort.'),
      mitte_c:temperature('Mittlere Messung.'),
      ende_c:temperature('Letzte Messung.'),
      h_bis_mitte:number('Zeit von Beginn bis zur zweiten Messung in Stunden.',0.01,24),
      h_nach_mitte:number('Zeit von der zweiten bis zur letzten Messung in Stunden.',0.01,24),
      bezug_c:temperature('Eigener Bezugswert in °C, ohne Gesundheitsbewertung.'),
    },
    calculate({start_c,mitte_c,ende_c,h_bis_mitte,h_nach_mitte,bezug_c}) {
      const first=positiveDegreeHours(start_c-bezug_c,mitte_c-bezug_c,h_bis_mitte);
      const second=positiveDegreeHours(mitte_c-bezug_c,ende_c-bezug_c,h_nach_mitte);
      return {gradstunden_ueber_bezug:round(first+second),messdauer_h:round(h_bis_mitte+h_nach_mitte),
        hinweis:'Zwischen den Messungen wird ein linearer Verlauf angenommen. Frühe Spitzen und kurze Temperaturänderungen können fehlen.'};
    },
    example:{args:{start_c:26,mitte_c:28,ende_c:24,h_bis_mitte:2,h_nach_mitte:2,bezug_c:26},
      expect:{gradstunden_ueber_bezug:3,messdauer_h:4}},
  },
  {
    name:'nachtlueften_windmittel_und_boeen',
    description:'Windmittel und stärkste Böe einer Nachtlüftungsprobe getrennt ins Protokoll übernehmen — Compare a recorded wind average and gust without assigning a window safety rating.',
    page:summer,
    properties:{
      mittel_kmh:number('Windmittel für den protokollierten Abschnitt in km/h.',0,300),
      boee_kmh:number('Stärkste gemeldete Böe für diesen Abschnitt in km/h.',0,400),
      selber_abschnitt:flag('Dieselbe Zeit, Quelle und Einheit für beide Windwerte?'),
      richtung_am_fenster_beobachtet:flag('Wurde die tatsächliche Strömungsrichtung am Fenster beobachtet?'),
    },
    calculate({mittel_kmh,boee_kmh,selber_abschnitt,richtung_am_fenster_beobachtet}) {
      if(selber_abschnitt && boee_kmh<mittel_kmh) throw new RangeError('gust below mean');
      return {boee_ueber_mittel_kmh:selber_abschnitt?delta(boee_kmh,mittel_kmh):null,
        boee_zu_mittel:selber_abschnitt&&mittel_kmh>0?round(boee_kmh/mittel_kmh):null,
        status:!selber_abschnitt?'berichte_abgleichen':richtung_am_fenster_beobachtet?'richtung_und_wind_getrennt_notieren':'richtung_vor_ort_unklar',
        hinweis:'Mittel und Böe beschreiben unterschiedliche Messgrößen. Wetterbericht liefert weder den lokalen Luftwechsel noch eine Sicherheitsfreigabe für ein offenes Fenster.'};
    },
    example:{args:{mittel_kmh:8,boee_kmh:24,selber_abschnitt:true,richtung_am_fenster_beobachtet:false},
      expect:{boee_ueber_mittel_kmh:16,boee_zu_mittel:3,status:'richtung_vor_ort_unklar'}},
  },
  {
    name:'nachtlueften_oeffnungslog_unterbrechungen',
    description:'Tatsächliche Offenzeit aus wetterbedingten Unterbrechungen im Nachtprotokoll berechnen — Audit usable open-window time after recorded disruptions.',
    page:summer,
    properties:{
      geplant_min:duration('Länge des zu protokollierenden Lüftungsblocks in Minuten.'),
      regenpause_min:duration('Minuten, in denen das Fenster beobachtet wegen Regen geschlossen war.'),
      weitere_pause_min:duration('Weitere beobachtete Schließzeit, etwa bei Böen oder warmem Außenwert.'),
      gemeinsam_min:duration('Überlappende Minuten, die in beiden Pausen enthalten sind.'),
    },
    calculate({geplant_min,regenpause_min,weitere_pause_min,gemeinsam_min}) {
      if(gemeinsam_min>Math.min(regenpause_min,weitere_pause_min)) throw new RangeError('pause intersection');
      const paused=regenpause_min+weitere_pause_min-gemeinsam_min;
      if(paused>geplant_min+1e-8) throw new RangeError('pauses outside block');
      return {offen_min:round(Math.max(0,geplant_min-paused)),geschlossen_min:round(paused),
        hinweis:'Bericht der beobachteten Fensterstellung. Daraus folgen weder Luftwechselrate noch Kühlwirkung oder eine Empfehlung bei Regen oder Starkwind zu öffnen.'};
    },
    example:{args:{geplant_min:60,regenpause_min:20,weitere_pause_min:15,gemeinsam_min:5},expect:{offen_min:30,geschlossen_min:30}},
  },
  {
    name:'wetterprognose_vor_nachtblock_auffrischung',
    description:'Für einen geplanten Nachtblock feststellen, ob ein ausreichend neuer Stundenbericht tatsächlich vorliegt — Check forecast freshness and time coverage before the planned ventilation block.',
    page:summer,
    properties:{
      berichte_alter_h:number('Zeit seit Ausgabe des vorliegenden Berichts in Stunden.',0,240),
      maximal_alter_h:number('Selbst gesetzte maximale Zeit seit Ausgabe.',0,240),
      beginn_in_h:number('Stunden bis zum Beginn des geplanten Blocks.',0,168),
      ende_in_h:number('Stunden bis zum Ende des geplanten Blocks.',0,168),
      letzte_stunde_in_h:number('Letzte abgedeckte gültige Stunde relativ zu jetzt, nicht zum Ausgabezeitpunkt.',0,240),
    },
    calculate({berichte_alter_h,maximal_alter_h,beginn_in_h,ende_in_h,letzte_stunde_in_h}) {
      if(ende_in_h<=beginn_in_h) throw new RangeError('night block');
      const fresh=berichte_alter_h<=maximal_alter_h;
      const covered=letzte_stunde_in_h>=ende_in_h;
      return {aktuell_nach_eigener_vorgabe:fresh,ganzer_block_enthalten:covered,
        status:fresh&&covered?'bericht_reicht_zur_vorbereitung':'stundenbericht_erneut_pruefen',
        hinweis:'Das prüft Ausgabealter und Gültigkeit. Maßgeblich bleiben frische Außen- und Innenmesswerte vor dem Lüften.'};
    },
    example:{args:{berichte_alter_h:6,maximal_alter_h:8,beginn_in_h:5,ende_in_h:8,letzte_stunde_in_h:7},
      expect:{aktuell_nach_eigener_vorgabe:true,ganzer_block_enthalten:false,status:'stundenbericht_erneut_pruefen'}},
  },
  {
    name:'nachtlueftung_luftpfad_rueckstrom_probe',
    description:'Luftwegrichtung an zwei Öffnungen und einem Innenübergang gemeinsam beobachten — Flag incomplete cross-ventilation-path evidence.',
    page:summer,
    properties:{
      aussen_a:choice('An Öffnung A beobachtet.', 'ein','aus','wechselnd','unklar'),
      innen_uebergang:choice('Am Innenübergang beobachtet.', 'a_nach_b','b_nach_a','wechselnd','unklar'),
      aussen_b:choice('An Öffnung B beobachtet.', 'ein','aus','wechselnd','unklar'),
      gleiche_phase:flag('Alle drei Beobachtungen in derselben Wetter- und Fensterphase gemacht?'),
    },
    calculate({aussen_a,innen_uebergang,aussen_b,gleiche_phase}) {
      const forward=aussen_a==='ein' && innen_uebergang==='a_nach_b' && aussen_b==='aus';
      const reverse=aussen_a==='aus' && innen_uebergang==='b_nach_a' && aussen_b==='ein';
      return {luftweg:!gleiche_phase?'neu_zeitgleich_beobachten':forward?'a_nach_b':reverse?'b_nach_a':'kein_eindeutiger_weg',
        hinweis:'Eine beobachtete Richtung an drei Stellen belegt keinen Volumenstrom. Wetter und Fensterstellung getrennt dokumentieren.'};
    },
    example:{args:{aussen_a:'ein',innen_uebergang:'a_nach_b',aussen_b:'aus',gleiche_phase:true},expect:{luftweg:'a_nach_b'}},
  },
  {
    name:'sommerluft_kuehler_und_trockener_fensterwahl',
    description:'Zwei gemessene Lüftungsfenster mit Abkühlungs- und Feuchteziel vergleichen — Compare two outdoor-air samples when cooling and drying both matter.',
    page:cellar,
    properties:{
      innen_c:temperature('Aktuelle Raumlufttemperatur.'),
      innen_tau_c:temperature('Aktueller Innentaupunkt.'),
      wand_c:temperature('Kälteste gemessene Oberfläche im betrachteten Raum.'),
      a_c:temperature('Außentemperatur bei Fenster A.'),
      a_tau_c:temperature('Außentaupunkt A aus der gleichzeitigen Außenmessung.'),
      b_c:temperature('Außentemperatur bei Fenster B.'),
      b_tau_c:temperature('Außentaupunkt B aus der gleichzeitigen Außenmessung.'),
      reserve_c:number('Eigene konservative Reserve zur kältesten Wand, berücksichtigt die Messunsicherheit.',0,12),
    },
    calculate({innen_c,innen_tau_c,wand_c,a_c,a_tau_c,b_c,b_tau_c,reserve_c}) {
      if(innen_tau_c>innen_c||a_tau_c>a_c||b_tau_c>b_c) throw new RangeError('physical dew point');
      const criteria=(air,dew)=>({
        kuehler:air<innen_c, trockener:dew<innen_tau_c,
        wandreserve_erreicht:wand_c-dew>=reserve_c,
      });
      const a=criteria(a_c,a_tau_c),b=criteria(b_c,b_tau_c);
      const pass=x=>x.kuehler&&x.trockener&&x.wandreserve_erreicht;
      const status=pass(a)&&pass(b)?'beide_geprueften_fenster':pass(a)?'nur_a':pass(b)?'nur_b':'kein_fenster_erreicht_alle_ziele';
      return {a,b,status,
        hinweis:'Eingegebene Vergleichskriterien, keine Freigabe. Vor dem Öffnen erneute simultane Prüfung, kälteste Stellen und örtliche Wetterbedingungen berücksichtigen.'};
    },
    example:{args:{innen_c:24,innen_tau_c:14,wand_c:17,a_c:18,a_tau_c:15,b_c:22,b_tau_c:10,reserve_c:2},
      expect:{status:'nur_b',a:{kuehler:true,trockener:false,wandreserve_erreicht:true}}},
  },
  {
    name:'dachraum_wiedererholung_gegen_aussen',
    description:'Nach Ende einer Hitzespitze prüfen, ob der Innen-Außen-Abstand trotz fallender Außenwerte wächst — Flag a delayed indoor rebound after outdoor conditions ease.',
    page:attic,
    properties:{
      innen_start_c:temperature('Raumwert bei der ersten gleichzeitigen Messung.'),
      aussen_start_c:temperature('Außenwert bei derselben ersten Messung.'),
      innen_ende_c:temperature('Raumwert bei der späteren gleichzeitigen Messung.'),
      aussen_ende_c:temperature('Außenwert bei derselben späteren Messung.'),
      gleiche_messorte:flag('Unveränderte Messorte, Außensensor verschattet?'),
    },
    calculate({innen_start_c,aussen_start_c,innen_ende_c,aussen_ende_c,gleiche_messorte}) {
      const first=innen_start_c-aussen_start_c,last=innen_ende_c-aussen_ende_c;
      return {innen_aenderung_c:gleiche_messorte?delta(innen_ende_c,innen_start_c):null,
        abstand_aenderung_c:gleiche_messorte?delta(last,first):null,
        innen_steigt_bei_sinkendem_aussen:gleiche_messorte?innen_ende_c>innen_start_c&&aussen_ende_c<aussen_start_c:null,
        hinweis:'Beobachtung. Verschattung, Gerätebetrieb und Fensterstellung getrennt nachhalten. Die zwei Messpaare belegen weder gespeicherte Wärmemenge noch eine Ursache.'};
    },
    example:{args:{innen_start_c:27,aussen_start_c:30,innen_ende_c:28,aussen_ende_c:23,gleiche_messorte:true},
      expect:{innen_aenderung_c:1,abstand_aenderung_c:8,innen_steigt_bei_sinkendem_aussen:true}},
  },
  {
    name:'regen_fleck_wiederkehr_ereignisvergleich',
    description:'Zwei Regenereignisse und einen trockenen Kontrollzeitraum im Feuchteprotokoll vergleichen — Check recurrence after rain without identifying a building defect.',
    page:damp,
    properties:{
      nach_regen_a:flag('Markierung an derselben Stelle im festgelegten Beobachtungsfenster nach Regen A neu oder stärker?'),
      nach_regen_b:flag('Dieselbe Beobachtung nach Regen B?'),
      im_trockenen_vergleich:flag('Dieselbe Beobachtung im trockenen Vergleichszeitraum?'),
      zeiten_gleich:flag('Gleich lange Beobachtungszeitfenster und gleiche sichtbare Stelle?'),
      innenquellen_protokolliert:flag('Lüften, Wäsche, Kochen und andere Innenquellen protokolliert?'),
    },
    calculate({nach_regen_a,nach_regen_b,im_trockenen_vergleich,zeiten_gleich,innenquellen_protokolliert}) {
      const status=!zeiten_gleich||!innenquellen_protokolliert?'vergleich_nicht_ausreichend_dokumentiert':
        nach_regen_a&&nach_regen_b&&!im_trockenen_vergleich?'wiederkehr_nach_regen_notiert':'kein_eindeutiger_regenbezug_im_protokoll';
      return {status,
        hinweis:'Zeitliche Wiederkehr ist kein Nachweis für die Eintrittsstelle oder die Ursache. Auffällige oder anhaltende Nässe fachlich beurteilen lassen.'};
    },
    example:{args:{nach_regen_a:true,nach_regen_b:true,im_trockenen_vergleich:false,zeiten_gleich:true,innenquellen_protokolliert:true},
      expect:{status:'wiederkehr_nach_regen_notiert'}},
  },
  {
    name:'wandfleck_umriss_aenderung_protokollieren',
    description:'Größenänderung einer beobachteten Stelle anhand eines wiederholten Umrissmaßes einordnen — Record changes in a bounding rectangle, not a moisture diagnosis.',
    page:damp,
    properties:{
      erste_breite_cm:number('Breite des kleinsten eingeschlossenen Rechtecks beim ersten Foto.',0,1000),
      erste_hoehe_cm:number('Höhe dieses Rechtecks beim ersten Foto.',0,1000),
      neue_breite_cm:number('Breite bei der Wiederholung am selben Ort.',0,1000),
      neue_hoehe_cm:number('Höhe bei der Wiederholung.',0,1000),
      gleiche_methode:flag('Maßstab, Betrachtungsort, begrenzte Stelle und Messmethode gleich?'),
    },
    calculate({erste_breite_cm,erste_hoehe_cm,neue_breite_cm,neue_hoehe_cm,gleiche_methode}) {
      const first=erste_breite_cm*erste_hoehe_cm,last=neue_breite_cm*neue_hoehe_cm;
      return {erstes_rechteck_cm2:round(first),neues_rechteck_cm2:round(last),
        aenderung_proxy_cm2:gleiche_methode?delta(last,first):null,
        hinweis:'Rechteckmaß eines sichtbaren Umrisses, keine nasse Fläche oder gemessene Materialfeuchte. Bei anhaltender oder größerer Auffälligkeit Ursache fachlich klären.'};
    },
    example:{args:{erste_breite_cm:12,erste_hoehe_cm:10,neue_breite_cm:15,neue_hoehe_cm:12,gleiche_methode:true},
      expect:{erstes_rechteck_cm2:120,neues_rechteck_cm2:180,aenderung_proxy_cm2:60}},
  },
  {
    name:'keller_hygrometer_anzeige_obere_messgrenze',
    description:'Hohen Kellerfeuchtewert an der spezifizierten Anzeigegrenze als begrenzte Beobachtung kennzeichnen — Distinguish a capped humidity reading from a usable measurement.',
    page:sensor,
    properties:{
      angezeigte_rf:number('Angezeigte relative Feuchte in Prozent.',0,100),
      obergrenze_rf:number('Obere für diese Bedingungen dokumentierte Anzeige- oder Messgrenze.',1,100),
      grenze_bestaetigt:flag('Grenze aus dem Handbuch des genauen Hygrometers übernommen?'),
      kondensat_am_fuehler:flag('War Feuchte auf dem Sensor sichtbar oder wird in der Anleitung eine Kondensation ausgeschlossen?'),
    },
    calculate({angezeigte_rf,obergrenze_rf,grenze_bestaetigt,kondensat_am_fuehler}) {
      const status=kondensat_am_fuehler?'sensorbedingung_ausserhalb_vergleich':
        !grenze_bestaetigt?'messbereich_pruefen':angezeigte_rf>=obergrenze_rf?'obergrenze_erreicht':'unter_dokumentierter_obergrenze';
      return {status, als_exakter_prozentwert_verwendbar:status==='unter_dokumentierter_obergrenze',
        hinweis:'Kein Ersatz für Genauigkeitsdaten. Ein Bereichsgrenzwert belegt keinen exakten Feuchtewert, auch nicht Sättigung der Raumluft.'};
    },
    example:{args:{angezeigte_rf:95,obergrenze_rf:95,grenze_bestaetigt:true,kondensat_am_fuehler:false},
      expect:{status:'obergrenze_erreicht',als_exakter_prozentwert_verwendbar:false}},
  },
  {
    name:'winterfenster_taupunkt_wechselintervall',
    description:'Zwischen zwei Oberflächenmessungen einen Wechsel der Taupunktseite eingrenzen — Bracket a change in surface dew-point margin without inventing an exact onset.',
    page:winter,
    properties:{
      start_min:duration('Minute des ersten Messpaars auf gemeinsamer Achse.'),
      ende_min:duration('Minute des zweiten Messpaars auf derselben Achse.'),
      wand_start_c:temperature('Oberfläche zu Beginn.'),
      wand_ende_c:temperature('Dieselbe Oberfläche am Ende.'),
      tau_start_c:temperature('Raumtaupunkt zum ersten Messzeitpunkt.'),
      tau_ende_c:temperature('Raumtaupunkt zum zweiten Messzeitpunkt.'),
      reserve_c:number('Eigene Messreserve in °C. Innerhalb dieser Zone keine eindeutige Seite ausweisen.',0,10),
    },
    calculate({start_min,ende_min,wand_start_c,wand_ende_c,tau_start_c,tau_ende_c,reserve_c}) {
      if(ende_min<=start_min) throw new RangeError('measurements out of order');
      const m1=wand_start_c-tau_start_c,m2=wand_ende_c-tau_ende_c;
      const side=margin=>margin>reserve_c?'oberhalb':margin< -reserve_c?'unterhalb':'messreserve';
      const first=side(m1),last=side(m2);
      const changed=first!==last&&first!=='messreserve'&&last!=='messreserve';
      return {startseite:first,endseite:last,wechsel_fenster_min:changed?[start_min,ende_min]:null,
        hinweis:'Unter angenommener Stetigkeit liegt ein Seitenwechsel zwischen den Messungen. Das Werkzeug schätzt weder einen genauen Start noch sichtbare Kondensation.'};
    },
    example:{args:{start_min:10,ende_min:70,wand_start_c:16,wand_ende_c:13,tau_start_c:14,tau_ende_c:14,reserve_c:.5},
      expect:{startseite:'oberhalb',endseite:'unterhalb',wechsel_fenster_min:[10,70]}},
  },
  {
    name:'winterluft_feuchte_rueckkehr_wiedererwaermt',
    description:'Nach dem Wiederaufwärmen den Rücklauf des Dampfdrucks ins Vorlüftungsniveau einordnen — Quantify moisture rebound using three dew-point observations.',
    page:winter,
    properties:{
      vorher_tau_c:temperature('Raumtaupunkt vor dem Luftaustausch.'),
      frueh_tau_c:temperature('Raumtaupunkt nach dem Öffnen, sobald die Anzeige stabil ist.'),
      warm_tau_c:temperature('Raumtaupunkt beim wieder erwärmten Raum.'),
      zusammenpassend:flag('Ein Raum, gleiche Sensorposition und alle drei Werte überwiegend repräsentativ?'),
    },
    calculate({vorher_tau_c,frueh_tau_c,warm_tau_c,zusammenpassend}) {
      const pressure=temperature=>6.112*Math.exp(17.62*temperature/(243.12+temperature));
      const drop=pressure(vorher_tau_c)-pressure(frueh_tau_c);
      const returnGap=pressure(warm_tau_c)-pressure(frueh_tau_c);
      return {direkter_rueckgang_hpa:zusammenpassend?round(drop):null,
        aenderung_bis_warm_hpa:zusammenpassend?round(returnGap):null,
        rueckkehranteil_prozent:zusammenpassend&&drop>0.01?round(100*returnGap/drop,1):null,
        hinweis:'Dampfdruck aus gemessenen Taupunkten. Ein Rücklauf kann mehrere Quellen haben, auch nicht erfasste Nutzungen; keine Gebäudediagnose. Ohne messbaren ersten Rückgang kein Anteil.'};
    },
    example:{args:{vorher_tau_c:10,frueh_tau_c:6,warm_tau_c:10,zusammenpassend:true},
      expect:{rueckkehranteil_prozent:100}},
  },
  {
    name:'winterfenster_oberflaeche_erholt_sich_spaeter',
    description:'Nach einer Lüftung getrennt prüfen, ob Raumluft und kalte Oberfläche wieder ihr Ausgangsniveau erreichen — Verify separate air and surface recovery instead of extrapolating from a warm room.',
    page:winter,
    properties:{
      luft_vorher_c:temperature('Messung in der Raummitte vor dem Öffnen.'),
      wand_vorher_c:temperature('Messung an einer markierten kalten Stelle vor dem Öffnen.'),
      luft_spaeter_c:temperature('Spätere Luftmessung bei wieder geschlossenem Fenster.'),
      wand_spaeter_c:temperature('Spätere Oberflächenmessung an derselben Stelle.'),
      toleranz_c:number('Eigene Vergleichstoleranz für die Messgeräte in °C.',0,10),
      gleiche_stellen:flag('Bestätigt, dass Messorte, Oberfläche und Verfahren unverändert sind?'),
    },
    calculate({luft_vorher_c,wand_vorher_c,luft_spaeter_c,wand_spaeter_c,toleranz_c,gleiche_stellen}) {
      const airGap=luft_vorher_c-luft_spaeter_c;
      const wallGap=wand_vorher_c-wand_spaeter_c;
      return {luft_fehlend_c:gleiche_stellen?round(Math.max(0,airGap)):null,
        wand_fehlend_c:gleiche_stellen?round(Math.max(0,wallGap)):null,
        luft_erholt_wand_offen:gleiche_stellen?airGap<=toleranz_c&&wallGap>toleranz_c:null,
        hinweis:'Nur Vergleich mit dem jeweiligen Ausgangswert. Daraus folgt keine Mindestwandtemperatur oder eine zusätzliche Lüftungsdauer.'};
    },
    example:{args:{luft_vorher_c:21,wand_vorher_c:16,luft_spaeter_c:20.8,wand_spaeter_c:14,toleranz_c:0.5,gleiche_stellen:true},
      expect:{luft_fehlend_c:0.2,wand_fehlend_c:2,luft_erholt_wand_offen:true}},
  },
  {
    name:'regenprognose_zwei_stunden_wahrscheinlichkeitsgrenzen',
    description:'Für ein zweiteiliges Lüftungsfenster die mögliche Regenwahrscheinlichkeit ohne Unabhängigkeitsannahme eingrenzen — Bound rain in either of two reported forecast periods.',
    page:winter,
    properties:{
      erste_prozent:number('Niederschlagswahrscheinlichkeit im ersten Zeitraum laut Quelle.',0,100),
      zweite_prozent:number('Niederschlagswahrscheinlichkeit im zweiten Zeitraum.',0,100),
      gleiche_definition_und_ort:flag('Beide Wahrscheinlichkeiten betreffen dasselbe Niederschlagsereignis am selben Ort in den angegebenen Perioden?'),
    },
    calculate({erste_prozent,zweite_prozent,gleiche_definition_und_ort}) {
      return {mindestens_eine_periode_spannweite_prozent:gleiche_definition_und_ort?
          [Math.max(erste_prozent,zweite_prozent),round(Math.min(100,erste_prozent+zweite_prozent))]:null,
        hinweis:'Nur mathematische Grenzen für mindestens eine Periode. Wetterereignisse sind nicht zwangsläufig unabhängig. Regeneintritt, Wind und die tatsächliche Fensterseite vor Ort prüfen.'};
    },
    example:{args:{erste_prozent:30,zweite_prozent:45,gleiche_definition_und_ort:true},
      expect:{mindestens_eine_periode_spannweite_prozent:[45,75]}},
  },
  {
    name:'nachtluft_waerme_und_wasser_energievergleich',
    description:'Kühle, feuchte Außenluft und Raumluft nach Wärme- und Wasserdampfanteil vergleichen — Compare ideal moist-air enthalpy for a cool but humid night.',
    page:cellar,
    properties:{
      innen_c:temperature('Raumtemperatur.'),
      innen_g_kg:number('Massenverhältnis in g Wasserdampf pro kg trockener Luft, kein Prozentwert.',0,45),
      aussen_c:temperature('Außentemperatur bei gleichzeitig gemessenen Bedingungen.'),
      aussen_g_kg:number('Massenverhältnis außen in g Wasserdampf pro kg trockener Luft.',0,45),
      druck_hpa:number('Zeitgleicher örtlicher Luftdruck, ohne Höhenkorrektur.',800,1100),
    },
    calculate({innen_c,innen_g_kg,aussen_c,aussen_g_kg,druck_hpa}) {
      const saturation=t=>6.112*Math.exp(17.62*t/(243.12+t));
      const maxRatio=t=>622*saturation(t)/(druck_hpa-saturation(t));
      if(innen_g_kg>maxRatio(innen_c)||aussen_g_kg>maxRatio(aussen_c)) throw new RangeError('physical mixing ratio');
      const h=(t,g)=>1.006*t+g/1000*(2501+1.86*t);
      const inAir=h(innen_c,innen_g_kg),outAir=h(aussen_c,aussen_g_kg);
      return {innen_kj_kg:round(inAir),aussen_kj_kg:round(outAir),aussen_minus_innen_kj_kg:delta(outAir,inAir),
        aussen_kuehler_aber_energiereicher:aussen_c<innen_c&&outAir>inAir,
        hinweis:'Näherung h = 1,006 T + w (2501 + 1,86 T) je kg trockener Luft, w in kg/kg. Kein Ersatz für Taupunkt- und Oberflächenvergleich; die Eingaben müssen reale ungesättigte Luft beschreiben.'};
    },
    example:{args:{innen_c:28,innen_g_kg:8,aussen_c:22,aussen_g_kg:14,druck_hpa:1013},
      expect:{aussen_kuehler_aber_energiereicher:true}},
  },
  {
    name:'hitze_vorbereitung_vorlauf_abhaengige_schritte',
    description:'Vor erwartetem Sonneneintrag Zeitreserve für nacheinander auszuführende Vorbereitungen bestimmen — Check a two-step shading preparation sequence against an expected heat onset.',
    page:protection,
    properties:{
      bis_sonneneintrag_min:duration('Zeit bis zur erwarteten direkten Sonne am betrachteten Fenster.'),
      verschattung_bereit_min:duration('Eigenes gemessenes Zeitfenster, um vorhandenen Sonnenschutz vorzubereiten.'),
      kontrolle_min:duration('Nachfolgende Kontrolle von Zustand und Fensterstellung.'),
      gewuenschte_reserve_min:duration('Eigener Zeitpuffer vor dem erwarteten Sonneneintrag.'),
    },
    calculate({bis_sonneneintrag_min,verschattung_bereit_min,kontrolle_min,gewuenschte_reserve_min}) {
      const need=verschattung_bereit_min+kontrolle_min+gewuenschte_reserve_min;
      return {spaetester_start_in_min:round(bis_sonneneintrag_min-need),gesamtbedarf_min:round(need),
        hinweis:'Serielle Zeitschätzung für vorhandene, zulässige Verschattung. Sonne, Wolken und bauliche Bedingungen können den Zeitpunkt verschieben. Negative Zeit steht für fehlende Reserve.'};
    },
    example:{args:{bis_sonneneintrag_min:40,verschattung_bereit_min:15,kontrolle_min:5,gewuenschte_reserve_min:10},
      expect:{spaetester_start_in_min:10,gesamtbedarf_min:30}},
  },
  {
    name:'keller_aussen_hygrometer_zielwert_oberflaechenreserve',
    description:'Zu einer Außenlufttemperatur den rechnerischen Feuchte-Zielwert für die gemessene Kellerwand ableiten — Calculate the outdoor relative-humidity marker corresponding to a dew-point margin.',
    page:cellar,
    properties:{
      aussen_c:temperature('Zeitgleich vor Ort gemessene Außentemperatur.'),
      wand_c:temperature('Kälteste dokumentierte Kelleroberfläche.'),
      reserve_c:number('Eigener Puffer zwischen Ziel-Taupunkt und Oberfläche in °C.',0,12),
    },
    calculate({aussen_c,wand_c,reserve_c}) {
      const saturation=t=>Math.exp(17.62*t/(243.12+t));
      const marker=wand_c-reserve_c;
      const upper=Math.min(100,100*saturation(marker)/saturation(aussen_c));
      return {ziel_taupunkt_c:round(marker),zielmarke_aussen_rf_prozent:round(upper,1),
        hinweis:'Rechnerische Magnus-Näherung zu genau diesem Temperaturpaar, kein Öffnungssignal. Zum Trocknen muss draußen auch weniger Wasserdampf als drinnen vorliegen. Bei wechselnden Messwerten und kälteren Stellen neu prüfen.'};
    },
    example:{args:{aussen_c:20,wand_c:22,reserve_c:2},expect:{ziel_taupunkt_c:20,zielmarke_aussen_rf_prozent:100}},
  },
  {
    name:'wetterbericht_temperaturwert_als_messziel',
    description:'Tageswert, Stundenwert und gefühlte Außentemperatur der passenden Zimmerprüfung zuordnen — Keep apparent and daily heat data separate from timed measured-air comparisons.',
    page:heat,
    properties:{
      berichtswert:choice('Was zeigt der Wetterbericht an?', 'stunden_lufttemperatur','tagesmaximum','gefuehlt','unbekannt'),
      raumziel:choice('Wofür wird der Wert benutzt?', 'fenstervergleich_jetzt','tagesvorbereitung','protokoll_rueckblick'),
      zieluhrzeit_zugeordnet:flag('Report nennt tatsächlich die Zieluhrzeit, die für den Vergleich benötigt wird?'),
    },
    calculate({berichtswert,raumziel,zieluhrzeit_zugeordnet}) {
      const status=raumziel==='fenstervergleich_jetzt'?
        berichtswert==='stunden_lufttemperatur'&&zieluhrzeit_zugeordnet?'stundenkontext_eigene_messung_pruefen':'passende_luftmessung_fehlt':
        berichtswert==='tagesmaximum'&&raumziel==='tagesvorbereitung'?'tageskontext_verwendbar':
          berichtswert==='unbekannt'?'wertdefinition_klaeren':'typ_im_protokoll_kennzeichnen';
      return {status,hinweis:'Eine gefühlte Temperatur enthält andere Einflüsse als ein Thermometerwert. Kein Wetterbericht ersetzt gleichzeitig vor Ort gemessene Innen- und Außenluft.'};
    },
    example:{args:{berichtswert:'gefuehlt',raumziel:'fenstervergleich_jetzt',zieluhrzeit_zugeordnet:true},
      expect:{status:'passende_luftmessung_fehlt'}},
  },
  {
    name:'nachtlueftung_sensorreaktion_messzeiten_abgleichen',
    description:'Bei einer kurzen Kühlphase Messzeiten gegen die dokumentierte Fühler-Reaktionszeit abgleichen — Decide whether a short cooling record gives a moved sensor time to settle.',
    page:sensor,
    properties:{
      aussen_gesetzt_min:duration('Minute auf gemeinsamer Zeitachse seit Aufstellen des Außenfühlers am endgültigen Ort.'),
      innen_gesetzt_min:duration('Minute des Aufstellens des Innenfühlers auf derselben Achse.'),
      vergleich_min:duration('Minute für die gemeinsame Ablesung.'),
      aussen_ruhe_min:duration('Benötigte Beruhigungszeit laut Anleitung oder eigener stabiler Probe außen.'),
      innen_ruhe_min:duration('Entsprechende Zeit für das Innengerät.'),
    },
    calculate({aussen_gesetzt_min,innen_gesetzt_min,vergleich_min,aussen_ruhe_min,innen_ruhe_min}) {
      if(vergleich_min<Math.max(aussen_gesetzt_min,innen_gesetzt_min)) throw new RangeError('reading before setup');
      const earliest=Math.max(aussen_gesetzt_min+aussen_ruhe_min,innen_gesetzt_min+innen_ruhe_min);
      const remaining=Math.max(0,earliest-vergleich_min);
      return {noch_warten_min:round(remaining),beide_ruhezeiten_erreicht:remaining===0,
        hinweis:'Zeitcheck. Schatten, Belüftung und endgültiger Messort bleiben wichtig. Die Beruhigungsdauer garantiert keine Genauigkeit.'};
    },
    example:{args:{aussen_gesetzt_min:10,innen_gesetzt_min:15,vergleich_min:22,aussen_ruhe_min:8,innen_ruhe_min:12},
      expect:{noch_warten_min:5,beide_ruhezeiten_erreicht:false}},
  },
];
