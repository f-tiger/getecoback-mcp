// Kleine Haushaltsversuche mit eigenen Messwerten. Die Ergebnisse sind
// Rechenhilfen und Beobachtungen unter den angegebenen Bedingungen.
const meter = '/strommess-protokoll.html';
const humidity = '/guide/luftfeuchtigkeit-richtig-messen.html';
const airing = '/guide/luftfeuchtigkeit-senken.html';
const replacement = '/geraete-austausch-rechner.html';

const numeric = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const energy = description => numeric(description, 0, 10000);
const time = description => numeric(description, 0, 525600);
const duration = description => numeric(description, 0.01, 525600);
const humidityPercent = description => numeric(description, 0, 100);
const integerCount = description => numeric(description, 0, 10000);
const flag = description => ({type:'boolean', description});
const round = (value, digits = 5) => Number(value.toFixed(digits)) || 0;

function count(value) {
  if (!Number.isInteger(value)) throw new RangeError('Ganze Anzahl eingeben.');
  return value;
}

export const measurementLab = [
  {
    name:'strommessung_abba_abwechselnd',
    description:'A–B–B–A-Blöcke derselben Geräteaufgabe auswerten — Compare two appliance modes while balancing a linear order trend.',
    page:meter,
    properties:{
      a_anfang_kwh:energy('Energie des ersten A-Laufs, in kWh.'),
      b_anfang_kwh:energy('Energie des anschließenden B-Laufs, in kWh.'),
      b_ende_kwh:energy('Energie des folgenden B-Laufs, in kWh.'),
      a_ende_kwh:energy('Energie des letzten A-Laufs, in kWh.'),
    },
    calculate({a_anfang_kwh, b_anfang_kwh, b_ende_kwh, a_ende_kwh}) {
      const early = a_anfang_kwh - b_anfang_kwh;
      const late = a_ende_kwh - b_ende_kwh;
      return {ersparnis_b_kwh_pro_lauf:round((early + late) / 2), blockwerte_kwh:[round(early), round(late)],
        annahme:'Gleiche Aufgabe, gleiches Ergebnis und möglichst gleichmäßige Zeitabstände. Eine lineare Drift kann sich aufheben. Vorheriger Betrieb, nichtlineare Drift und Messfehler bleiben mögliche Einflüsse.'};
    },
    example:{args:{a_anfang_kwh:1.2,b_anfang_kwh:1.0,b_ende_kwh:1.1,a_ende_kwh:1.3},
      expect:{ersparnis_b_kwh_pro_lauf:0.2,blockwerte_kwh:[0.2,0.2]}},
  },
  {
    name:'feuchte_versuch_referenzraum',
    description:'Veränderung im Testraum mit einem gleichzeitig beobachteten Referenzraum abgleichen — Compare before-and-after humidity changes against a concurrent reference.',
    page:humidity,
    properties:{
      test_vor_rh:humidityPercent('Relative Feuchte im Testraum vor der Maßnahme, in %.'),
      test_nach_rh:humidityPercent('Relative Feuchte im Testraum danach, in %.'),
      referenz_vor_rh:humidityPercent('Relative Feuchte im Referenzraum zum ersten Zeitpunkt, in %.'),
      referenz_nach_rh:humidityPercent('Relative Feuchte im Referenzraum zum zweiten Zeitpunkt, in %.'),
      temperatur_vergleichbar:flag('Wurde geprüft, dass Temperatur und Nutzung beider Reihen vergleichbar blieben?'),
    },
    calculate(a) {
      const test = a.test_nach_rh - a.test_vor_rh;
      const reference = a.referenz_nach_rh - a.referenz_vor_rh;
      return {test_pp:round(test), referenz_pp:round(reference), differenz_der_aenderungen_pp:a.temperatur_vergleichbar ? round(test - reference) : null,
        annahme:'In beiden Räumen feste Messorte und dieselben Zeitfenster. Der Referenzraum soll die Maßnahme nicht mitbekommen. Eine Differenz belegt keine Ursache; Temperatur, Raumnutzung und Luftaustausch können sich verändern.'};
    },
    example:{args:{test_vor_rh:67,test_nach_rh:57,referenz_vor_rh:64,referenz_nach_rh:61,temperatur_vergleichbar:true},
      expect:{test_pp:-10,referenz_pp:-3,differenz_der_aenderungen_pp:-7}},
  },
  {
    name:'hygrometer_standorttausch_auswerten',
    description:'Zwei Hygrometer an zwei festen Messorten tauschen und Standort- von Sensorunterschieden trennen — Separate position effects from sensor offsets using a crossover.',
    page:humidity,
    properties:{
      a_ort_1_rh:humidityPercent('Messphase 1: Hygrometer A am Ort 1, in %.'),
      b_ort_2_rh:humidityPercent('Messphase 1: Hygrometer B am Ort 2, in %.'),
      a_ort_2_rh:humidityPercent('Messphase 2: Hygrometer A am Ort 2 nach Eingewöhnung, in %.'),
      b_ort_1_rh:humidityPercent('Messphase 2: Hygrometer B am Ort 1 nach Eingewöhnung, in %.'),
      standorte_stabil:flag('Waren beide Orte zwischen den Messphasen vergleichbar, einschließlich Temperatur, Nutzung und Zugluft?'),
    },
    calculate(a) {
      const phase1 = a.a_ort_1_rh - a.b_ort_2_rh;
      const phase2 = a.a_ort_2_rh - a.b_ort_1_rh;
      return {ort_1_minus_ort_2_pp:a.standorte_stabil ? round((phase1 - phase2) / 2) : null,
        anzeige_a_minus_b_pp:a.standorte_stabil ? round((phase1 + phase2) / 2) : null,
        annahme:'Vereinfachte Rechnung mit stabiler Ortsdifferenz und konstantem Anzeigenversatz. Temperatur und Eingewöhnungszeit mitprotokollieren. Der Tausch kalibriert keines der Geräte.'};
    },
    example:{args:{a_ort_1_rh:57,b_ort_2_rh:45,a_ort_2_rh:47,b_ort_1_rh:55,standorte_stabil:true},
      expect:{ort_1_minus_ort_2_pp:10,anzeige_a_minus_b_pp:2}},
  },
  {
    name:'strommessung_woche_nutzungsmix',
    description:'Unterschiedlich häufige Alltagstypen im Wochenverbrauch getrennt hochrechnen — Weight working-day and other-day measurements by their actual weekly frequency.',
    page:meter,
    properties:{
      arbeitstag_kwh:energy('Gemessener Tagesmittelwert für einen typischen Arbeitstag, in kWh.'),
      frei_kwh:energy('Gemessener Tagesmittelwert für einen typischen anderen Tag, in kWh.'),
      arbeitstage:integerCount('Zahl vergleichbarer Arbeitstage in der Zielwoche, 0 bis 7.'),
    },
    calculate({arbeitstag_kwh, frei_kwh, arbeitstage}) {
      if (count(arbeitstage) > 7) throw new RangeError('Für eine Woche höchstens sieben Tage angeben.');
      return {arbeitstage_kwh:round(arbeitstag_kwh * arbeitstage), andere_tage_kwh:round(frei_kwh * (7 - arbeitstage)),
        woche_kwh:round(arbeitstag_kwh * arbeitstage + frei_kwh * (7 - arbeitstage)),
        annahme:'Beide Messwerte stammen von vollständigen und für ihren Alltagstyp typischen Tagen. Außergewöhnliche Ferien- oder Wetterbedingungen separat behandeln.'};
    },
    example:{args:{arbeitstag_kwh:2,frei_kwh:5,arbeitstage:5},expect:{arbeitstage_kwh:10,andere_tage_kwh:10,woche_kwh:20}},
  },
  {
    name:'stromversuch_wiederholungen_planen',
    description:'Wiederholungen aus beobachteter Streuung und gewünschter Genauigkeit grob planen — Plan independent repeats from pilot variation and a chosen precision target.',
    page:meter,
    properties:{
      pilot_standardabweichung_kwh:numeric('Stichproben-Standardabweichung unabhängiger Pilotläufe, in kWh.',0,1000),
      ziel_halbbreite_kwh:numeric('Gewünschte halbe Breite eines näherungsweisen 95-%-Intervalls, in kWh.', 0.0001, 10000),
      pilot_laeufe:integerCount('Anzahl unabhängiger, vergleichbarer Pilotläufe.'),
    },
    calculate({pilot_standardabweichung_kwh, ziel_halbbreite_kwh, pilot_laeufe}) {
      const n = count(pilot_laeufe);
      const estimate = n >= 2 && pilot_standardabweichung_kwh > 0
        ? Math.max(n, Math.ceil((1.96 * pilot_standardabweichung_kwh / ziel_halbbreite_kwh) ** 2))
        : null;
      return {richtwert_gesamt_laeufe:estimate, weitere_laeufe:estimate === null ? null : estimate - n,
        annahme:'Grobe Normalnäherung bei unabhängigen Läufen und repräsentativer Pilotstreuung. Mit wenigen oder stark schwankenden Pilotläufen ist der Richtwert unsicher. Eine Streuung von null erlaubt keine belastbare Planung.'};
    },
    example:{args:{pilot_standardabweichung_kwh:0.2,ziel_halbbreite_kwh:0.1,pilot_laeufe:6},
      expect:{richtwert_gesamt_laeufe:16,weitere_laeufe:10}},
  },
  {
    name:'gepaarte_stromversuche_richtungsspanne',
    description:'Häufigkeit eines Vorteils in unabhängigen A/B-Paaren mit Unsicherheit angeben — Estimate an uncertainty interval for how often a setting wins in paired repeats.',
    page:meter,
    properties:{
      a_sparsamer:integerCount('Zahl unabhängiger, vergleichbarer Paare, in denen A klar weniger verbrauchte.'),
      b_sparsamer:integerCount('Zahl unabhängiger, vergleichbarer Paare, in denen B klar weniger verbrauchte.'),
      unklar_oder_gleich:integerCount('Paare ohne klare Richtung unter Berücksichtigung des eigenen Messspielraums.'),
    },
    calculate({a_sparsamer, b_sparsamer, unklar_oder_gleich}) {
      const a = count(a_sparsamer);
      const n = a + count(b_sparsamer);
      const excluded = count(unklar_oder_gleich);
      if (!n) return {auswertbare_paare:0, gleich_oder_unklar:excluded, anteil_a_prozent:null, wilson_95_prozent:null,
        annahme:'Es lässt sich kein Vorteil unter auswertbaren Paaren ermitteln.'};
      const z = 1.95996398454;
      const p = a / n;
      const denominator = 1 + (z * z) / n;
      const center = (p + (z * z) / (2 * n)) / denominator;
      const half = z * Math.sqrt(p * (1 - p) / n + (z * z) / (4 * n * n)) / denominator;
      return {auswertbare_paare:n, gleich_oder_unklar:excluded, anteil_a_prozent:round(100 * p, 2),
        wilson_95_prozent:[round(100 * Math.max(0, center - half), 2), round(100 * Math.min(1, center + half), 2)],
        annahme:'Wilson-Intervall nur für unabhängige Paare mit klarer Richtung. Es beschreibt die Häufigkeit, nicht die Höhe einer möglichen Ersparnis und nicht alle unbekannten Bedingungen.'};
    },
    example:{args:{a_sparsamer:8,b_sparsamer:2,unklar_oder_gleich:2},
      expect:{auswertbare_paare:10,gleich_oder_unklar:2,anteil_a_prozent:80}},
  },
  {
    name:'sensorprotokoll_uhrdrift_abgleichen',
    description:'Zwei Uhrabgleiche für einen Messlogger nutzen und einen Zeitversatz interpolieren — Align a sensor timestamp using two reference clock checks.',
    page:humidity,
    properties:{
      dauer_min:duration('Minuten zwischen den beiden Uhrabgleichen, auf der Referenzuhr.'),
      ereignis_min:time('Grobe Lage des Ereignisses nach dem ersten Abgleich, in Minuten auf der Referenzuhr.'),
      versatz_anfang_s:numeric('Loggerzeit minus Referenzzeit beim ersten Abgleich, in Sekunden.', -86400, 86400),
      versatz_ende_s:numeric('Loggerzeit minus Referenzzeit beim zweiten Abgleich, in Sekunden.', -86400, 86400),
    },
    calculate({dauer_min, ereignis_min, versatz_anfang_s, versatz_ende_s}) {
      if (ereignis_min > dauer_min) throw new RangeError('Nur zwischen den beiden Abgleichen rechnen.');
      const drift = versatz_ende_s - versatz_anfang_s;
      const offset = versatz_anfang_s + drift * ereignis_min / dauer_min;
      return {uhrdrift_s:round(drift), geschaetzter_versatz_s:round(offset), vom_loggerzeitpunkt_abziehen_s:round(offset),
        annahme:'Lineare Näherung zwischen belegten Abgleichen. Rücksetzungen, Zeitzonenwechsel oder Sprünge der Uhr werden damit nicht korrigiert.'};
    },
    example:{args:{dauer_min:1440,ereignis_min:720,versatz_anfang_s:20,versatz_ende_s:80},
      expect:{uhrdrift_s:60,vom_loggerzeitpunkt_abziehen_s:50}},
  },
  {
    name:'messprotokolle_zeitfenster_schneiden',
    description:'Überlappung zweier paralleler Messprotokolle für denselben Versuch bestimmen — Compute which part of two logs actually covers the same period.',
    page:humidity,
    properties:{
      a_start_min:time('Beginn von Protokoll A ab einem gemeinsamen Nullpunkt, in Minuten.'),
      a_ende_min:time('Ende von Protokoll A ab dem Nullpunkt, in Minuten.'),
      b_start_min:time('Beginn von Protokoll B ab dem Nullpunkt, in Minuten.'),
      b_ende_min:time('Ende von Protokoll B ab dem Nullpunkt, in Minuten.'),
    },
    calculate({a_start_min, a_ende_min, b_start_min, b_ende_min}) {
      if (a_start_min >= a_ende_min || b_start_min >= b_ende_min) throw new RangeError('Jedes Zeitfenster muss ein echtes Ende nach seinem Beginn haben.');
      const start = Math.max(a_start_min, b_start_min);
      const end = Math.min(a_ende_min, b_ende_min);
      const shared = Math.max(0, end - start);
      return {gemeinsam_min:shared, gemeinsamen_teil_auswerten_ab_min:shared ? start : null,
        gemeinsamen_teil_auswerten_bis_min:shared ? end : null,
        annahme:'Beide Uhren auf denselben Zeitmaßstab bringen. Die Überlappung ist ein Zeitfenster zum Zuschneiden der Rohwerte, keine Aussage über vollständige Daten darin.'};
    },
    example:{args:{a_start_min:10,a_ende_min:65,b_start_min:30,b_ende_min:90},
      expect:{gemeinsam_min:35,gemeinsamen_teil_auswerten_ab_min:30}},
  },
  {
    name:'messdauer_zeitumstellung_korrigieren',
    description:'Echte Messdauer bei Umstellung von Sommer- und Winterzeit bestimmen — Correct elapsed time using recorded UTC offsets from both ends of a household measurement.',
    page:meter,
    properties:{
      lokale_differenz_min:numeric('Differenz der notierten lokalen Zeitpunkte einschließlich Kalendertag, in Minuten.', -180, 525600),
      start_utc_offset_min:numeric('Start-Zeitzonenversatz in Minuten, in Deutschland normalerweise 60 oder 120.', -720, 840),
      ende_utc_offset_min:numeric('End-Zeitzonenversatz in Minuten, in Deutschland normalerweise 60 oder 120.', -720, 840),
    },
    calculate({lokale_differenz_min, start_utc_offset_min, ende_utc_offset_min}) {
      const corrected = lokale_differenz_min + start_utc_offset_min - ende_utc_offset_min;
      if (corrected < 0) throw new RangeError('Reihenfolge und Uhrenangaben prüfen.');
      return {echt_verstrichen_min:corrected, differenz_zur_lokalen_notiz_min:start_utc_offset_min - ende_utc_offset_min,
        annahme:'Die UTC-Versätze müssen zu den tatsächlichen Zeitpunkten passen. Im Herbst ist die wiederholte Stunde ohne Versatz oder einen anderen Zeitbeleg mehrdeutig.'};
    },
    example:{args:{lokale_differenz_min:1440,start_utc_offset_min:120,ende_utc_offset_min:60},
      expect:{echt_verstrichen_min:1500,differenz_zur_lokalen_notiz_min:60}},
  },
  {
    name:'raumfeuchte_abschnitte_zeitgewichtet',
    description:'Mittelwerte zweier unterschiedlich langer Messabschnitte zeitgewichtet zusammenfassen — Combine comparable humidity period averages without giving a short period the same weight as a long one.',
    page:humidity,
    properties:{
      a_mittel_rh:humidityPercent('Zeitmittel von Abschnitt A, in %. Kein Einzelwert.'),
      a_min:duration('Dauer von Abschnitt A, in Minuten.'),
      b_mittel_rh:humidityPercent('Zeitmittel von Abschnitt B, in %. Kein Einzelwert.'),
      b_min:duration('Dauer von Abschnitt B, in Minuten.'),
    },
    calculate({a_mittel_rh,a_min,b_mittel_rh,b_min}) {
      return {zeitgewichtetes_mittel_rh_prozent:round((a_mittel_rh * a_min + b_mittel_rh * b_min) / (a_min + b_min), 2),
        zusammengefasst_min:a_min + b_min,
        annahme:'Nicht überlappende Abschnitte am gleichen Messort. Das Mittel ersetzt den Verlauf und die Temperaturangaben nicht. Es ist keine Aussage über Schwellenüberschreitung oder Oberflächenfeuchte.'};
    },
    example:{args:{a_mittel_rh:50,a_min:180,b_mittel_rh:80,b_min:20},
      expect:{zeitgewichtetes_mittel_rh_prozent:53,zusammengefasst_min:200}},
  },
  {
    name:'strommessung_messluecke_spannweite',
    description:'Auswirkung einer Strommesslücke als bedingte Unter- und Obergrenze berechnen — Bound unobserved energy using a defensible power ceiling instead of filling a gap with an average.',
    page:meter,
    properties:{
      beobachtet_kwh:energy('Gemessene Verbrauchsenergie aller lückenlosen Abschnitte, in kWh.'),
      luecke_min:time('Länge aller zusammengezählten Messlücken, in Minuten.'),
      obergrenze_w:numeric('Nachvollziehbar begründete Obergrenze der Wirkleistung in der Lücke, in W.', 0, 50000),
      obergrenze_belegt:flag('Ist die Obergrenze für genau diese Lücke begründbar?'),
    },
    calculate({beobachtet_kwh,luecke_min,obergrenze_w,obergrenze_belegt}) {
      return {untergrenze_kwh:beobachtet_kwh,
        obergrenze_kwh:luecke_min === 0 || obergrenze_belegt ? round(beobachtet_kwh + luecke_min * obergrenze_w / 60000) : null,
        annahme:'Nur nichtnegative Verbrauchsenergie. Die Lücke bleibt unbeobachtet; eine Obergrenze gilt nur unter der belegten Leistungsgrenze und ist keine Schätzung des tatsächlichen Verbrauchs.'};
    },
    example:{args:{beobachtet_kwh:1.2,luecke_min:30,obergrenze_w:800,obergrenze_belegt:true},
      expect:{untergrenze_kwh:1.2,obergrenze_kwh:1.6}},
  },
  {
    name:'trocknerversuch_abkuehlphase_check',
    description:'Versuchsläufe mit fehlender Abkühlphase vor dem Vergleich aussortieren — Identify early-cut dryer-cycle recordings before comparing full loads.',
    page:meter,
    properties:{
      laeufe:integerCount('Zahl nach Plan begonnener Läufe mit derselben Aufgabenstellung.'),
      vollstaendig:integerCount('Läufe mit vollständigem Ende einschließlich Abkühlphase.'),
      vorher_abgebrochen:integerCount('Läufe, bei denen sicher ein früheres Ablesen oder Abbruch dokumentiert wurde.'),
    },
    calculate({laeufe,vollstaendig,vorher_abgebrochen}) {
      const all = count(laeufe);
      const completed = count(vollstaendig);
      const aborted = count(vorher_abgebrochen);
      if (completed + aborted > all) throw new RangeError('Jeden Lauf nur einmal zählen.');
      return {vergleichbare_vollzyklen:completed, offen_nachzumessen:all - completed,
        abbruchstatus_unbekannt:all - completed - aborted,
        annahme:'Nicht aufgezeichnete Zyklusenden und deren Energie bleiben unbekannt. Abgebrochene Läufe protokollieren und für den Vollzyklusvergleich separat erneut messen.'};
    },
    example:{args:{laeufe:8,vollstaendig:5,vorher_abgebrochen:2},
      expect:{vergleichbare_vollzyklen:5,offen_nachzumessen:3,abbruchstatus_unbekannt:1}},
  },
  {
    name:'strommessung_anlaufphase_getrennt',
    description:'Anlauf und folgenden Betrieb aus getrennten Zählerabschnitten bilanzieren — Separate startup energy from the measured post-start phase.',
    page:meter,
    properties:{
      start_kwh:energy('Abgelesene Messgeräte-Energieanzeige direkt vor dem Start, in kWh.'),
      nach_anlauf_kwh:energy('Stand am dokumentierten Ende der Anlaufphase, in kWh.'),
      ende_kwh:energy('Stand zum vollständigen Messende, in kWh.'),
      anlauf_min:duration('Dauer der Anlaufphase, in Minuten.'),
      betrieb_min:duration('Dauer nach dem Anlauf bis zum Messende, in Minuten.'),
    },
    calculate({start_kwh,nach_anlauf_kwh,ende_kwh,anlauf_min,betrieb_min}) {
      const startup = nach_anlauf_kwh - start_kwh;
      const operating = ende_kwh - nach_anlauf_kwh;
      if (startup < 0 || operating < 0) throw new RangeError('Chronologische, nicht fallende Zählerstände eingeben.');
      return {anlauf_kwh:round(startup), folgebetrieb_kwh:round(operating),
        mittlere_anlauf_w:round(startup * 60000 / anlauf_min, 2),
        mittlere_betrieb_w:round(operating * 60000 / betrieb_min, 2),
        annahme:'Die Phase muss am Gerät beobachtet und vorab operational definiert sein. Phasenmittel sind keine Spitzenleistung. Für Vollzyklen beide Abschnitte zählen.'};
    },
    example:{args:{start_kwh:1,nach_anlauf_kwh:1.2,ende_kwh:1.4,anlauf_min:6,betrieb_min:60},
      expect:{anlauf_kwh:0.2,folgebetrieb_kwh:0.2,mittlere_anlauf_w:2000,mittlere_betrieb_w:200}},
  },
  {
    name:'raumversuch_erholungspausen_planen',
    description:'Wiederholte Lüftungsversuche mit Erholungspausen in ein echtes Zeitbudget einpassen — Schedule room trials with time to restore documented starting conditions.',
    page:humidity,
    properties:{
      verfuegbar_min:duration('Dauer des geplanten Messfensters, in Minuten.'),
      lauf_min:duration('Vollständige Dauer eines Durchgangs einschließlich Messung, in Minuten.'),
      rueckkehr_min:time('Eingeplante Pause vor jedem weiteren Lauf, um den Ausgangszustand erneut zu prüfen.'),
      ziel_laeufe:integerCount('Geplante Anzahl vollständiger Durchgänge.'),
    },
    calculate({verfuegbar_min,lauf_min,rueckkehr_min,ziel_laeufe}) {
      const goal = count(ziel_laeufe);
      const possible = Math.floor((verfuegbar_min + rueckkehr_min) / (lauf_min + rueckkehr_min));
      const required = goal * lauf_min + Math.max(0, goal - 1) * rueckkehr_min;
      return {hoechstens_laeufe_im_zeitfenster:possible, benoetigt_min:round(required), passt_zeitlich:goal <= possible,
        annahme:'Zeitplan als Obergrenze. Den tatsächlichen Ausgangszustand vor jedem Lauf erneut prüfen; eine feste Pause garantiert keine Rückkehr von Temperatur und Feuchte.'};
    },
    example:{args:{verfuegbar_min:120,lauf_min:30,rueckkehr_min:15,ziel_laeufe:3},
      expect:{hoechstens_laeufe_im_zeitfenster:3,benoetigt_min:120,passt_zeitlich:true}},
  },
  {
    name:'geraetemessung_vorzyklus_nachwirkung',
    description:'Beim gleichen Gerätemodus prüfen, ob der vorherige Modus den Startzustand sichtbar verändert — Compare the same target mode after two different predecessor modes.',
    page:meter,
    properties:{
      a_nach_a_kwh:energy('Energie eines A-Laufs nach einem vorherigen A-Lauf, in kWh.'),
      a_nach_b_kwh:energy('Energie eines A-Laufs nach einem vorherigen B-Lauf, in kWh.'),
      pruefgrenze_kwh:energy('Eigene absolute Prüfgrenze, in kWh, unter Berücksichtigung der Messstreuung.'),
      gleiche_wartezeit:flag('War der Abstand zum vorherigen Lauf in beiden Fällen gleich?'),
    },
    calculate({a_nach_a_kwh,a_nach_b_kwh,pruefgrenze_kwh,gleiche_wartezeit}) {
      const difference = round(a_nach_b_kwh - a_nach_a_kwh);
      return {a_nach_b_minus_a_nach_a_kwh:difference,
        nachwirkung_pruefen:gleiche_wartezeit ? Math.abs(difference) > pruefgrenze_kwh : null,
        annahme:'Vergleich desselben Zielmodus mit derselben Aufgabe. Bei auffälliger Differenz beide Sequenzen erneut messen. Erfolg nach A oder B isoliert die Ursache nicht.'};
    },
    example:{args:{a_nach_a_kwh:0.7,a_nach_b_kwh:0.9,pruefgrenze_kwh:0.05,gleiche_wartezeit:true},
      expect:{a_nach_b_minus_a_nach_a_kwh:0.2,nachwirkung_pruefen:true}},
  },
  {
    name:'messung_nullanzeige_obergrenze',
    description:'Unveränderte Energieanzeige bei bekanntem Anzeigeverhalten als Obergrenze einordnen — Interpret an unchanged cumulative meter reading without claiming zero consumption.',
    page:meter,
    properties:{
      anzeige_unveraendert:flag('War die kumulierte Energieanzeige vom Anfang bis zum Ende unverändert?'),
      schritt_kwh:numeric('Schrittweite der Energieanzeige in kWh, laut Gerät.', 0.000001, 1),
      dauer_h:numeric('Verstrichene Messdauer in Stunden.', 0.01, 8760),
      unterlast_erfasst:flag('Ist die Erfassung auch für diese niedrige Last in der Anleitung belegt?'),
    },
    calculate({anzeige_unveraendert,schritt_kwh,dauer_h,unterlast_erfasst}) {
      const usable = anzeige_unveraendert && unterlast_erfasst;
      return {unter_anzeigeintervall_kwh:usable ? schritt_kwh : null,
        oberer_durchschnitt_w:usable ? round(schritt_kwh * 1000 / dauer_h, 6) : null,
        annahme:'Gleichbleibender kumulativer Anzeigewert einer quantisierten Anzeige und durchlaufende Messung ohne Zählerreset. Die Grenze berücksichtigt keine zusätzliche Messabweichung und gilt nicht unter der Messmindestlast.'};
    },
    example:{args:{anzeige_unveraendert:true,schritt_kwh:0.01,dauer_h:5,unterlast_erfasst:true},
      expect:{unter_anzeigeintervall_kwh:0.01,oberer_durchschnitt_w:2}},
  },
  {
    name:'geraeteverbrauch_nutzungsveraenderung',
    description:'Unterschied zwischen mehr Nutzung und anderem Verbrauch pro Vorgang rechnerisch aufteilen — Decompose an observed energy change into a usage-count effect and a per-task effect.',
    page:replacement,
    properties:{
      vorher_anzahl:integerCount('Vollständige Vorgänge im ersten Beobachtungszeitraum.'),
      nachher_anzahl:integerCount('Vollständige Vorgänge in einem gleich langen zweiten Zeitraum.'),
      vorher_kwh_pro_vorgang:energy('Gemessener Mittelwert pro Vorgang vorher, in kWh.'),
      nachher_kwh_pro_vorgang:energy('Gemessener Mittelwert pro Vorgang nachher, in kWh.'),
    },
    calculate(a) {
      const old = count(a.vorher_anzahl);
      const current = count(a.nachher_anzahl);
      if (!old || !current) throw new RangeError('Für beide Perioden mindestens einen gemessenen Vorgang angeben.');
      const moreUse = (current - old) * a.vorher_kwh_pro_vorgang;
      const changedTask = current * (a.nachher_kwh_pro_vorgang - a.vorher_kwh_pro_vorgang);
      return {mehrnutzung_kwh:round(moreUse), verbrauch_je_vorgang_geaendert_kwh:round(changedTask),
        aenderung_gesamt_kwh:round(moreUse + changedTask),
        annahme:'Reihenfolge der Zerlegung: erst Nutzungszahl mit altem Einheitswert ändern, dann den Einheitswert. Gleiche Aufgabenqualität vergleichen. Stand-by und nicht erfasste Vorgänge sind nicht enthalten.'};
    },
    example:{args:{vorher_anzahl:4,nachher_anzahl:6,vorher_kwh_pro_vorgang:2,nachher_kwh_pro_vorgang:1.5},
      expect:{mehrnutzung_kwh:4,verbrauch_je_vorgang_geaendert_kwh:-3,aenderung_gesamt_kwh:1}},
  },
  {
    name:'messreihe_echte_wiederholungen_zaehlen',
    description:'Messpunkte von unabhängig neu begonnenen Versuchsläufen trennen — Count independent household trials without treating every logger sample as a replicate.',
    page:meter,
    properties:{
      punkte:integerCount('Zahl der Einzelwerte innerhalb aller Läufe.'),
      abgeschlossene_laeufe:integerCount('Zahl vollständiger Durchgänge mit Messpunkten.'),
      separat_neu_gestartet:integerCount('Davon neu unter eigenen Ausgangsbedingungen begonnene Durchgänge.'),
    },
    calculate({punkte,abgeschlossene_laeufe,separat_neu_gestartet}) {
      const n = count(punkte);
      const completed = count(abgeschlossene_laeufe);
      const distinct = count(separat_neu_gestartet);
      if (distinct > completed || completed > n) throw new RangeError('Läufe und Messpunkte getrennt zählen.');
      return {messpunkte:n, vollstaendige_laeufe:completed, maximal_unabhaengige_laeufe:distinct,
        annahme:'Ein separater Neustart beweist keine statistische Unabhängigkeit. Mehrere Messpunkte aus einem Lauf beschreiben denselben Verlauf; ähnliche Wetterlagen oder Gerätezyklen können auch getrennte Läufe koppeln.'};
    },
    example:{args:{punkte:240,abgeschlossene_laeufe:4,separat_neu_gestartet:3},
      expect:{vollstaendige_laeufe:4,maximal_unabhaengige_laeufe:3}},
  },
  {
    name:'stromlogger_kurzereignis_stichprobe',
    description:'Prüfen, ob ein kurzes Ereignis zwischen gleichmäßigen Punktmessungen verpasst werden kann — Check whether a short load episode can fall between point samples.',
    page:meter,
    properties:{
      raster_s:numeric('Konstante Zeit zwischen zwei aufgezeichneten Momentanwerten, in Sekunden.', 0.01, 86400),
      ereignis_s:numeric('Gemessene oder untersuchte Dauer des Leistungsereignisses, in Sekunden.', 0.01, 86400),
    },
    calculate({raster_s,ereignis_s}) {
      return {kann_komplett_zwischen_messpunkten_liegen:ereignis_s < raster_s,
        anteil_einer_rasterperiode_prozent:round(100 * ereignis_s / raster_s, 1),
        annahme:'Nur gleichmäßige Punktabtastung ohne Paketverluste. Das Verhältnis ist keine beobachtete Wahrscheinlichkeit. Eine integrierende kWh-Anzeige erfasst Energie anders als Momentanwerte.'};
    },
    example:{args:{raster_s:60,ereignis_s:12},
      expect:{kann_komplett_zwischen_messpunkten_liegen:true,anteil_einer_rasterperiode_prozent:20}},
  },
  {
    name:'ab_haushaltsversuch_stoerfaktoren',
    description:'Vor einer A/B-Messung fehlende Kontrollen für einen fairen Vergleich markieren — Review workload, endpoints and changed settings before testing.',
    page:replacement,
    properties:{
      gleiche_aufgabe:flag('Ist dieselbe Haushaltsaufgabe mit derselben Menge festgelegt?'),
      gleiches_ergebnis:flag('Ist ein gemeinsames, prüfbares Ende festgelegt, etwa gleicher Trocknungsgrad?'),
      nur_eine_aenderung:flag('Ändert sich absichtlich nur der untersuchte Faktor?'),
      kontext_protokolliert:flag('Werden zeitgleich etwa Wetter, Zubehör oder Belegung notiert, soweit für den Versuch relevant?'),
    },
    calculate(a) {
      const missing = Object.entries(a).filter(([, fixed]) => !fixed).map(([field]) => field);
      return {offene_kontrollen:missing, vorab_kontrollen_erfuellt:missing.length === 0,
        annahme:'Dies ist eine Versuchs-Checkliste. Gleichbleibende Ausgangsbedingungen und Messgenauigkeit danach mit den realen Beobachtungen belegen.'};
    },
    example:{args:{gleiche_aufgabe:true,gleiches_ergebnis:false,nur_eine_aenderung:true,kontext_protokolliert:false},
      expect:{offene_kontrollen:['gleiches_ergebnis','kontext_protokolliert'],vorab_kontrollen_erfuellt:false}},
  },
  {
    name:'strommessung_abschnitte_verketten',
    description:'Zwei aufeinanderfolgende Strommessabschnitte nur bei tatsächlich gemeinsamen Grenzen summieren — Verify that two cumulative-energy windows are adjacent and avoid double counting.',
    page:meter,
    properties:{
      a_von_min:time('Beginn von A ab gemeinsamem Nullpunkt, in Minuten.'),
      a_bis_min:time('Ende von A ab demselben Nullpunkt, in Minuten.'),
      a_kwh:energy('Gemessene Verbrauchsenergie ausschließlich in A.'),
      b_von_min:time('Beginn von B ab demselben Nullpunkt, in Minuten.'),
      b_bis_min:time('Ende von B ab demselben Nullpunkt, in Minuten.'),
      b_kwh:energy('Gemessene Verbrauchsenergie ausschließlich in B.'),
    },
    calculate({a_von_min,a_bis_min,a_kwh,b_von_min,b_bis_min,b_kwh}) {
      if (a_von_min >= a_bis_min || b_von_min >= b_bis_min || a_von_min > b_von_min) throw new RangeError('Geordnete Messabschnitte mit positiver Dauer eingeben.');
      const gap = b_von_min - a_bis_min;
      return {luecke_oder_ueberlappung_min:gap, schliesst_direkt_an:gap === 0,
        durchgehender_verbrauch_kwh:gap === 0 ? round(a_kwh + b_kwh) : null,
        annahme:'Dieselbe Verbrauchsgrenze, richtige Uhrzeiten und exklusiv aufgezeichnete Energie. Ein negativer Abstand kann Energie doppelt zählen. Ein positiver Abstand lässt Verbrauch offen.'};
    },
    example:{args:{a_von_min:0,a_bis_min:60,a_kwh:0.4,b_von_min:60,b_bis_min:120,b_kwh:0.5},
      expect:{schliesst_direkt_an:true,durchgehender_verbrauch_kwh:0.9}},
  },
  {
    name:'strommessung_vorhersage_praxistag',
    description:'Eine frühere Verbrauchsprognose gegen einen unabhängig gemessenen Praxistag prüfen — Compare a projected daily rate to a reserved validation day.',
    page:meter,
    properties:{
      prognose_kwh:energy('Vor der Prüfmessung festgehaltene Verbrauchsprognose für genau diesen Alltagstyp, in kWh.'),
      prueftag_kwh:energy('Unabhängig gemessener Verbrauch am vollständigen Prüftag, in kWh.'),
      toleranz_kwh:energy('Vorher festgelegter akzeptabler absoluter Prognosefehler, in kWh.'),
      gleicher_nutzungstyp:flag('Gehört der Prüftag zum vorher definierten Nutzungstyp?'),
    },
    calculate({prognose_kwh,prueftag_kwh,toleranz_kwh,gleicher_nutzungstyp}) {
      const error = round(prueftag_kwh - prognose_kwh);
      return {pruefwert_minus_prognose_kwh:error, innerhalb_pruefgrenze:gleicher_nutzungstyp ? Math.abs(error) <= toleranz_kwh : null,
        annahme:'Ein neuer, nicht zur Prognose verwendeter Prüftag. Bestätigung für diesen Tag belegt keine Übertragbarkeit auf andere Jahreszeiten oder Aufgaben.'};
    },
    example:{args:{prognose_kwh:1.5,prueftag_kwh:1.8,toleranz_kwh:0.2,gleicher_nutzungstyp:true},
      expect:{pruefwert_minus_prognose_kwh:0.3,innerhalb_pruefgrenze:false}},
  },
  {
    name:'hygrometer_grenzuebertritt_zeitfenster',
    description:'Ungefähres Zeitfenster einer beobachteten Feuchteüberschreitung zwischen zwei Ablesungen benennen — Report the observation bracket for a threshold crossing between sparse samples.',
    page:humidity,
    properties:{
      vorher_min:time('Zeitpunkt der ersten Ablesung in Minuten ab gemeinsamem Nullpunkt.'),
      nachher_min:time('Zeitpunkt der zweiten Ablesung in Minuten ab demselben Nullpunkt.'),
      vorher_rh:humidityPercent('Relative Luftfeuchte bei der ersten Ablesung, in %.'),
      nachher_rh:humidityPercent('Relative Luftfeuchte bei der zweiten Ablesung, in %.'),
      pruefwert_rh:humidityPercent('Selbst gewähltes Beobachtungssignal, in %.'),
    },
    calculate({vorher_min,nachher_min,vorher_rh,nachher_rh,pruefwert_rh}) {
      if (nachher_min <= vorher_min) throw new RangeError('Zwei Messzeitpunkte in chronologischer Reihenfolge angeben.');
      const bracketed = vorher_rh <= pruefwert_rh && nachher_rh > pruefwert_rh;
      return {anstieg_dazwischen_beobachtbar:bracketed, ab_min:bracketed ? vorher_min : null,
        bis_min:bracketed ? nachher_min : null, zeitliche_unsicherheit_min:bracketed ? nachher_min - vorher_min : null,
        annahme:'Ein Punkt war am oder unter dem Signal, der nächste darüber. Exakter Zeitpunkt, Kurvenform und Dauer oberhalb des Signals sind zwischen den Ablesungen unbekannt. Kein Schadens- oder Sicherheitsgrenzwert.'};
    },
    example:{args:{vorher_min:5,nachher_min:25,vorher_rh:57,nachher_rh:66,pruefwert_rh:60},
      expect:{anstieg_dazwischen_beobachtbar:true,ab_min:5,bis_min:25,zeitliche_unsicherheit_min:20}},
  },
  {
    name:'lueftungsversuch_wetterpaare_eignung',
    description:'Zwei Lüftungsläufe anhand beobachteter Außenwerte vor dem A/B-Vergleich zusammenstellen — Screen ventilation pairs against declared outdoor temperature and humidity tolerances.',
    page:airing,
    properties:{
      a_aussen_c:numeric('Außentemperatur vor Lauf A, in °C.', -40, 60),
      b_aussen_c:numeric('Außentemperatur vor Lauf B, in °C.', -40, 60),
      a_aussen_rh:humidityPercent('Relative Außenfeuchte vor Lauf A, in %.'),
      b_aussen_rh:humidityPercent('Relative Außenfeuchte vor Lauf B, in %.'),
      thermischer_spielraum_c:numeric('Vorher gewählter Spielraum beim Temperaturunterschied, in °C.', 0, 100),
      feuchtespielraum_pp:humidityPercent('Vorher gewählter Spielraum der relativen Außenfeuchte, in Prozentpunkten.'),
    },
    calculate(a) {
      const temperature = round(Math.abs(a.a_aussen_c - a.b_aussen_c));
      const humidityDifference = round(Math.abs(a.a_aussen_rh - a.b_aussen_rh));
      return {temperaturabstand_c:temperature, feuchteabstand_pp:humidityDifference,
        im_vorab_gewaehlten_wetterfenster:temperature <= a.thermischer_spielraum_c && humidityDifference <= a.feuchtespielraum_pp,
        annahme:'Auswahlhilfe vor der Auswertung, keine Lüftungsempfehlung. Raumwerte, Wind, Luftaustausch und Feuchtenachschub separat erfassen.'};
    },
    example:{args:{a_aussen_c:12,b_aussen_c:13,a_aussen_rh:75,b_aussen_rh:80,thermischer_spielraum_c:2,feuchtespielraum_pp:3},
      expect:{temperaturabstand_c:1,feuchteabstand_pp:5,im_vorab_gewaehlten_wetterfenster:false}},
  },
];
