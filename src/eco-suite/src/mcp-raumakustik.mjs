const NOISE = '/guide/mobile-klimaanlage-zu-laut.html';
const DATA = '/guide/delonghi-pac-n90-test.html';
const MOBILE = '/guide/mobile-klimaanlage-vergleich.html';
const NIGHT = '/guide/klimaanlage-nachts-laufen-lassen.html';
const FAN = '/guide/ventilator-kaufen-ratgeber.html';
const FAN_NIGHT = '/guide/ventilator-nachts-schlafen.html';
const TOWER = '/guide/turmventilator-vs-standventilator.html';
const ROBOT = '/guide/saugroboter-kaufberatung.html';

const num = (description,minimum,maximum) => ({type:'number',description,minimum,maximum});
const choice = (description,values) => ({type:'string',description,enum:values});
const yes = description => ({type:'boolean',description});
const db = description => num(description + ' in dB.',-30,150);
const delta = description => num(description + ' in dB.',0,80);
const sec = description => num(description + ' in Sekunden.',0,86400);
const count = description => num(description,0,10000);
const round = (value,digits=2) => Number.isFinite(value) ? Number(value.toFixed(digits))+0 : null;
const energy = level => 10 ** (level/10);
const level = value => value>0 ? round(10*Math.log10(value)) : null;
const within = (value,start,end) => value>=start&&value<=end;

function tool(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

function whole(values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Anzahlen als ganze Zahlen angeben.');
}

export const raumakustik = [
  tool('schallangabe_split_bauteil_zuordnung',
    'Ordnet veröffentlichte Geräuschangaben eindeutig dem Innen- oder Außenteil zu — Assign published split-unit noise figures to the documented component.',
    MOBILE, {
      zielteil:choice('Bauteil, dessen Angabe gesucht wird.', ['innenteil','aussenteil']),
      berichtsteil:choice('Im Ausschnitt ausdrücklich bezeichnetes Teil.', ['innenteil','aussenteil','gesamtsystem','unklar']),
      genaue_geraetevariante:yes('Stimmen Baureihe, exaktes Modell und Liefermarktausführung überein?')
    }, ({zielteil,berichtsteil,genaue_geraetevariante}) => ({
      belegstatus:!genaue_geraetevariante||berichtsteil==='unklar'?'zuordnung_offen':berichtsteil===zielteil?'zielteil_belegt':'anderer_bezug',
      hinweis:'Angaben zum Gesamtsystem oder anderen Bauteil dürfen nicht dem Zielteil zugeschrieben werden. Messgröße und Prüfbedingungen separat lesen.'
    }), {zielteil:'innenteil',berichtsteil:'aussenteil',genaue_geraetevariante:true}, {belegstatus:'anderer_bezug'}),

  tool('geraeteton_schmalband_spitze_gegen_nachbarbaender',
    'Vergleicht eine beobachtete Frequenzspitze mit den beiden angrenzenden gleich breiten Spektralbändern — Compare an observed spectral peak against equally wide adjacent frequency bins.',
    NOISE, {
      band_mitte_db:db('Anzeigepegel des untersuchten Frequenzbands'),
      band_darunter_db:db('Anzeigepegel des direkt darunterliegenden Bands'),
      band_darueber_db:db('Anzeigepegel des direkt darüberliegenden Bands'),
      gleiche_auswertung:yes('Gleich breite benachbarte Bänder mit derselben Skalierung und demselben Aufnahmeintervall?')
    }, ({band_mitte_db,band_darunter_db,band_darueber_db,gleiche_auswertung}) => {
      const referenz=(energy(band_darunter_db)+energy(band_darueber_db))/2;
      return {mittenband_ueber_nachbarn:gleiche_auswertung?band_mitte_db>Math.max(band_darunter_db,band_darueber_db):null,
        mittenband_gegen_nachbarmittel_db:gleiche_auswertung?level(energy(band_mitte_db)/referenz):null,
        hinweis:'Vergleich innerhalb einer vorhandenen Spektrumanzeige. Er liefert keine normgerechte Tonhaltigkeitskennzahl und identifiziert weder Geräteteil noch Ursache.'};
    }, {band_mitte_db:45,band_darunter_db:35,band_darueber_db:39,gleiche_auswertung:true},
    {mittenband_ueber_nachbarn:true,mittenband_gegen_nachbarmittel_db:7.55}),

  tool('schallreport_gesamtwert_teilstichproben_widerspruch',
    'Prüft einen berichteten Gesamtmittelwert gegen die Spanne vollständiger Teilmittelwerte — Check a reported equivalent sound level against the range of complete subinterval means.',
    NOISE, {
      gesamt:db('Veröffentlichter LAeq des Gesamtintervalls'),
      teil_min:db('Niedrigster LAeq der vollständigen Teilintervalle'), teil_max:db('Höchster LAeq der Teilintervalle'),
      rundungsspiel:delta('Zulässiges Rundungsspiel aus der Anzeige'),
      gleiche_basis:yes('Decken die Teilintervalle denselben Gesamtzeitraum vollständig ab und haben Gewichtung und Messpunkt überein?')
    }, ({gesamt,teil_min,teil_max,rundungsspiel,gleiche_basis}) => {
      if (teil_min>teil_max) throw new RangeError('Unterer Teilwert muss vor dem oberen liegen.');
      return {ausserhalb_teilspektrum:gleiche_basis?!within(gesamt,teil_min-rundungsspiel,teil_max+rundungsspiel):null,
        abstand_zur_spannweite_db:gleiche_basis?round(Math.max(0,teil_min-gesamt,gesamt-teil_max)):null,
        hinweis:'Nur eine Konsistenzprüfung. Ein Gesamt-LAeq innerhalb der Spanne ist dadurch weder rekonstruiert noch bestätigt.'};
    }, {gesamt:53,teil_min:39,teil_max:49,rundungsspiel:1,gleiche_basis:true},
    {ausserhalb_teilspektrum:true,abstand_zur_spannweite_db:4}),

  tool('schallmessung_a_c_gewichtung_gleichzeitige_spreizung',
    'Berechnet den Unterschied zeitgleich gemessener C- und A-gewichteter Mittelwerte — Calculate the simultaneous LCeq minus LAeq difference.',
    NOISE, {
      lceq_db:db('Selbst gemessener C-gewichteter äquivalenter Pegel LCeq'),
      laeq_db:db('Selbst gemessener A-gewichteter äquivalenter Pegel LAeq'),
      gleichzeitige_messung:yes('Gleicher Zeitraum, Messort und vergleichbare Instrumenteneinstellung?')
    }, ({lceq_db,laeq_db,gleichzeitige_messung}) => ({
      lc_minus_la_db:gleichzeitige_messung?round(lceq_db-laeq_db):null,
      hinweis:'Vergleich eigener Messwerte. Der Ratgeber stellt keinen C-bewerteten Gerätewert bereit. Aus der Differenz folgen weder genaue Frequenzen noch Geräuschursache oder Empfinden.'
    }), {lceq_db:53,laeq_db:45,gleichzeitige_messung:true}, {lc_minus_la_db:8}),

  tool('geraeuschaufnahme_pegel_von_wiedergabe_trennen',
    'Entscheidet anhand der Aufnahmekette, ob Tondateien für einen Pegelvergleich geeignet sind — Check whether recorded gain and reference settings support a level comparison.',
    NOISE, {
      regelung:choice('Belegte Aufnahmeverarbeitung.', ['fest','automatik','unklar']),
      nachtraeglich_normalisiert:yes('Wurde mindestens eine Datei nachträglich normalisiert oder komprimiert?'),
      gemeinsamer_bezug:yes('Gleiche Aufnahmekette und dokumentierter gemeinsamer Pegelbezug?')
    }, ({regelung,nachtraeglich_normalisiert,gemeinsamer_bezug}) => ({
      pegelvergleich_aus_dateien_belegt:regelung==='fest'&&!nachtraeglich_normalisiert&&gemeinsamer_bezug,
      hinweis:'Wiedergabelautstärke und Dateipegel sind keine absoluten dB(A) am Messort. Ereignisfolge lässt sich getrennt von der Lautstärke dokumentieren.'
    }), {regelung:'automatik',nachtraeglich_normalisiert:false,gemeinsamer_bezug:true},
    {pegelvergleich_aus_dateien_belegt:false}),

  tool('geraeuschlog_messbereich_gueltige_stichproben',
    'Bilanziert ein Geräuschprotokoll mit abgeschnittenen, untersteuernden und fehlenden Messwerten — Count usable readings after excluding clipped, under-range and missing samples.',
    NOISE, {
      gesamt:count('Erwartete Stichproben im Beobachtungsblock.'), oben:count('Markierte Übersteuerungen.'),
      unten:count('Markierte Unterschreitungen des dokumentierten Messbereichs.'), fehlend:count('Fehlende Stichproben ohne Wert.')
    }, ({gesamt,oben,unten,fehlend}) => {
      whole([gesamt,oben,unten,fehlend]);
      const unbrauchbar=oben+unten+fehlend;
      if (unbrauchbar>gesamt) throw new RangeError('Die getrennten Ausschlüsse passen nicht zur Stichprobenzahl.');
      return {nutzbare_stichproben:gesamt-unbrauchbar,nutzbar_prozent:gesamt>0?round(100*(gesamt-unbrauchbar)/gesamt):null,
        hoechstwerte_moeglich_abgeschnitten:oben>0,
        hinweis:'Ausfälle niemals durch Null ersetzen. Fehlende oder übersteuerte Spitzen sind unbekannt.'};
    }, {gesamt:120,oben:3,unten:5,fehlend:12},
    {nutzbare_stichproben:100,nutzbar_prozent:83.33,hoechstwerte_moeglich_abgeschnitten:true}),

  tool('geraet_geraeuschlog_zwei_uhranker_abgleichen',
    'Rechnet eine Geräuschmarke mit zwei gemeinsamen Zeitankern auf das Betriebsprotokoll um — Align a recorded sound marker to an appliance log using two shared time anchors.',
    NOISE, {
      audio_start:sec('Erster gemeinsamer Zeitanker auf der Audio-Uhr'), audio_ende:sec('Zweiter gemeinsamer Anker auf der Audio-Uhr'),
      log_start:sec('Erster Anker auf der Betriebsuhr'), log_ende:sec('Zweiter Anker auf der Betriebsuhr'),
      audio_spitze:sec('Zeitstempel des beobachteten Geräuschereignisses auf der Audio-Uhr')
    }, ({audio_start,audio_ende,log_start,log_ende,audio_spitze}) => {
      if (audio_ende<=audio_start||log_ende<=log_start) throw new RangeError('Auf beiden Uhren muss der zweite Anker nach dem ersten liegen.');
      const in_spann=within(audio_spitze,audio_start,audio_ende);
      const norm=(audio_spitze-audio_start)/(audio_ende-audio_start);
      return {zugeordnete_logzeit_sek:in_spann?round(log_start+norm*(log_ende-log_start),3):null,
        aenderung_uhrabstand_sek:round((log_ende-audio_ende)-(log_start-audio_start),3),
        hinweis:'Lineare Zwischenrechnung nur zwischen bekannten Ankern. Uhrenkorrekturen oder Sprünge innerhalb des Intervalls sind nicht erfasst.'};
    }, {audio_start:10,audio_ende:110,log_start:20,log_ende:122,audio_spitze:60},
    {zugeordnete_logzeit_sek:71,aenderung_uhrabstand_sek:2}),

  tool('schallmessung_referenzprobe_vor_nach_drift',
    'Prüft ob dieselbe Referenz vor und nach einer Messreihe vergleichbar angezeigt wurde — Check observed meter drift using the same reference before and after a series.',
    DATA, {
      vorher:db('Erste Anzeige derselben Referenz'), nachher:db('Zweite Anzeige derselben Referenz'),
      toleranz_db:delta('Zulässiger Abstand der eigenen Vergleichsprobe'),
      gleicher_referenzaufbau:yes('Gleiche Referenz, Messposition, Instrument und Einstellung?')
    }, ({vorher,nachher,toleranz_db,gleicher_referenzaufbau}) => ({
      anzeigeveraenderung_db:gleicher_referenzaufbau?round(nachher-vorher):null,
      referenz_erneut_pruefen:gleicher_referenzaufbau?Math.abs(nachher-vorher)>toleranz_db:null,
      hinweis:'Wiederholbarkeit der Anzeige ist keine Kalibrierung. Die verwendete Vergleichsgrenze stammt aus der Eingabe.'
    }), {vorher:57.2,nachher:58.4,toleranz_db:0.7,gleicher_referenzaufbau:true},
    {anzeigeveraenderung_db:1.2,referenz_erneut_pruefen:true}),

  tool('geraeuschmessung_mikrofon_abschattung_paar',
    'Erfasst, ob Abschattung durch die beobachtende Person die Pegelprobe am selben Messpunkt verändert — Check how the observer position changes a fixed-point level reading.',
    NOISE, {
      ohne_abschattung:db('Messwert ohne Person zwischen Gerät und Mikrofon'),
      mit_abschattung:db('Messwert mit Person zwischen Gerät und Mikrofon'),
      modus_gleich:yes('Gleicher Messpunkt, Gerätemodus, Hintergrund und Messintervall?'),
      aufloesung_db:delta('Unterscheidungsbreite der eigenen Anzeige oder Messreihe')
    }, ({ohne_abschattung,mit_abschattung,modus_gleich,aufloesung_db}) => ({
      differenz_mit_person_db:modus_gleich?round(mit_abschattung-ohne_abschattung):null,
      jenseits_eigener_aufloesung:modus_gleich?Math.abs(mit_abschattung-ohne_abschattung)>aufloesung_db:null,
      hinweis:'Kontrollprobe für den Messaufbau. Körperhaltung beeinflusst möglicherweise die Messung, sie ist keine Abhilfe gegen Gerätepegel.'
    }), {ohne_abschattung:48,mit_abschattung:44,modus_gleich:true,aufloesung_db:1},
    {differenz_mit_person_db:-4,jenseits_eigener_aufloesung:true}),

  tool('geraeuschdaten_leisewert_modusabdeckung',
    'Prüft ob der leiseste Datenblattwert den tatsächlich geplanten Gerätebetrieb dokumentiert — Check whether a published minimum noise figure represents the intended mode.',
    FAN, {
      zielmodus:choice('Gesuchter Betrieb.', ['niedrig','hoch','nacht','automatik']),
      belegmodus:choice('Für den veröffentlichten Mindestpegel genannter Betrieb.', ['niedrig','hoch','nacht','automatik','nicht_genannt']),
      nur_werbezahl:yes('Liegt die Zahl ausschließlich ohne Geräte- oder Messkontext vor?')
    }, ({zielmodus,belegmodus,nur_werbezahl}) => ({
      abdeckung:nur_werbezahl||belegmodus==='nicht_genannt'?'offen':zielmodus===belegmodus?'modus_gleich':'anderer_modus',
      messbedingungen_separat_pruefen:true,
      hinweis:'Ein Minimalwert gilt nur für die dokumentierte Einstellung. Daraus keinen Pegel für den eigenen Hörplatz ableiten.'
    }), {zielmodus:'hoch',belegmodus:'niedrig',nur_werbezahl:false}, {abdeckung:'anderer_modus'}),

  tool('geraeuschspitzen_getrennte_ereignisfenster',
    'Ordnet zwei aufgezeichnete Ereignisse nach sichtbarer zeitlicher Trennung ein — Decide whether two recorded sound events are distinguishable in time.',
    NIGHT, {
      ende_a_sek:sec('Ende des ersten beobachteten Ereignisses'),
      beginn_b_sek:sec('Beginn des folgenden beobachteten Ereignisses'), ende_b_sek:sec('Ende des folgenden Ereignisses'),
      trennzeit_sek:sec('Für das Protokoll gewählte Mindestpause zur eindeutigen Trennung')
    }, ({ende_a_sek,beginn_b_sek,ende_b_sek,trennzeit_sek}) => {
      if (beginn_b_sek>=ende_b_sek) throw new RangeError('Beginn B muss vor dem Ende liegen.');
      const pause=beginn_b_sek-ende_a_sek;
      return {stille_dazwischen_sek:round(Math.max(0,pause)),
        b_ueberlappung_sek:round(Math.max(0,Math.min(ende_a_sek,ende_b_sek)-beginn_b_sek)),
        zeitlich_trennbar:pause>=trennzeit_sek,
        hinweis:'Zeitmarken belegen keine Geräuschursache. Der Zeitraum ohne markierte Spitze ist nicht automatisch geräuschlos.'};
    }, {ende_a_sek:32,beginn_b_sek:30,ende_b_sek:36,trennzeit_sek:3},
    {stille_dazwischen_sek:0,b_ueberlappung_sek:2,zeitlich_trennbar:false}),

  tool('geraeuschereignisse_rate_je_beobachtungsstunde',
    'Vergleicht Häufigkeiten markierter Spitzen aus zwei verschieden langen aktiven Beobachtungen — Normalize recorded sound-event counts to an observation hour.',
    NIGHT, {
      a_anzahl:count('Gezählte Ereignisse in Block A.'), b_anzahl:count('Gezählte Ereignisse in Block B.'),
      a_dauer_sek:num('Belegte Dauer von Block A in Sekunden.',1,86400),
      b_dauer_sek:num('Belegte Dauer von Block B in Sekunden.',1,86400),
      gleiche_zaehlweise:yes('Gleiche Geräuschdefinition, Gerätephase und Beobachtungskriterien?')
    }, ({a_anzahl,b_anzahl,a_dauer_sek,b_dauer_sek,gleiche_zaehlweise}) => {
      whole([a_anzahl,b_anzahl]);
      const a=a_anzahl*3600/a_dauer_sek;
      const b=b_anzahl*3600/b_dauer_sek;
      return {a_im_beobachtungsfenster_je_h:round(a),b_im_beobachtungsfenster_je_h:round(b),
        rate_b_minus_a_je_h:gleiche_zaehlweise?round(b-a):null,
        hinweis:'Normiert nur die vorliegenden Zählfenster. Kleine Ereigniszahlen sind keine Prognose für die nächste Stunde.'};
    }, {a_anzahl:4,b_anzahl:5,a_dauer_sek:1800,b_dauer_sek:3600,gleiche_zaehlweise:true},
    {a_im_beobachtungsfenster_je_h:8,b_im_beobachtungsfenster_je_h:5,rate_b_minus_a_je_h:-3}),

  tool('ventilator_mittelstufe_aus_gegenrichtungen_beobachten',
    'Vergleicht dieselbe Lüfterstufe nach beobachtetem Hoch- und Herunterschalten — Compare sound on one fan setting reached from two directions.',
    FAN, {
      von_unten_db:db('A-gewichteter Messwert auf der Zielstufe nach regulärem Hochschalten'),
      von_oben_db:db('A-gewichteter Messwert auf derselben Zielstufe nach regulärem Herunterschalten'),
      gleiche_setzzeit:yes('Gleiche Wartezeit, Mittelungsdauer, Oszillation und Messposition?'),
      laute_reihenfolge_abweichung_db:delta('Selbst gesetzter Differenzwert für eine erneute Beobachtung')
    }, ({von_unten_db,von_oben_db,gleiche_setzzeit,laute_reihenfolge_abweichung_db}) => ({
      abweichung_nach_herunterschalten_db:gleiche_setzzeit?round(von_oben_db-von_unten_db):null,
      erneut_beobachten:gleiche_setzzeit?Math.abs(von_oben_db-von_unten_db)>laute_reihenfolge_abweichung_db:null,
      hinweis:'Die Beobachtung prüft Reihenfolgeeffekte. Sie stellt keinen Defekt fest und erfordert keine Schaltfolgen außerhalb der Anleitung.'
    }), {von_unten_db:40,von_oben_db:42,gleiche_setzzeit:true,laute_reihenfolge_abweichung_db:1},
    {abweichung_nach_herunterschalten_db:2,erneut_beobachten:true}),

  tool('schalllog_spitze_zu_abschnittsgrenze',
    'Ordnet eine aufgezeichnete Spitze einer normalen Betriebsphase oder einer unsicheren Grenze zu — Assign an observed peak to a logged phase while preserving boundary ambiguity.',
    NIGHT, {
      spitze_sek:sec('Zeitstempel der Spitze ab Protokollbeginn'),
      phasenwechsel_sek:sec('Zeitstempel des beobachteten Gerätephasenwechsels'),
      zeitunsicherheit_sek:sec('Größte angenommene Gesamtabweichung beider Zeitmarken')
    }, ({spitze_sek,phasenwechsel_sek,zeitunsicherheit_sek}) => {
      const versatz=spitze_sek-phasenwechsel_sek;
      return {versatz_sek:round(versatz),zuordnung:Math.abs(versatz)<=zeitunsicherheit_sek?'grenze_unklar':versatz<0?'davor':'danach',
        hinweis:'Zeitliche Zuordnung ist kein Nachweis, dass das Gerät die beobachtete Spitze verursacht hat.'};
    }, {spitze_sek:41,phasenwechsel_sek:40,zeitunsicherheit_sek:2}, {versatz_sek:1,zuordnung:'grenze_unklar'}),

  tool('geraeuschwiederholung_abstandsregelmaessigkeit',
    'Prüft aus vier beobachteten Einsätzen, wie stark die Abstände wiederkehrender Geräusche schwanken — Check variation between four observed sound onsets.',
    NOISE, {
      erster_sek:sec('Erster beobachteter Einsatz'), zweiter_sek:sec('Zweiter beobachteter Einsatz'),
      dritter_sek:sec('Dritter beobachteter Einsatz'), vierter_sek:sec('Vierter beobachteter Einsatz'),
      spannungsgrenze_sek:sec('Eigene maximale Abweichung zwischen längstem und kürzestem Abstand')
    }, ({erster_sek,zweiter_sek,dritter_sek,vierter_sek,spannungsgrenze_sek}) => {
      if (!(erster_sek<zweiter_sek&&zweiter_sek<dritter_sek&&dritter_sek<vierter_sek)) throw new RangeError('Einsätze in aufsteigender Zeitfolge angeben.');
      const diff=[zweiter_sek-erster_sek,dritter_sek-zweiter_sek,vierter_sek-dritter_sek];
      const spannweite=Math.max(...diff)-Math.min(...diff);
      return {abstaende_sek:diff.map(x=>round(x)),spannweite_sek:round(spannweite),
        eigene_spannungsgrenze_eingehalten:spannweite<=spannungsgrenze_sek,
        hinweis:'Vier beobachtete Ereignisse reichen nicht für eine Vorhersage weiterer Zeitpunkte oder eine Zuordnung zu einem Bauteil.'};
    }, {erster_sek:10,zweiter_sek:22,dritter_sek:33,vierter_sek:49,spannungsgrenze_sek:4},
    {abstaende_sek:[12,11,16],spannweite_sek:5,eigene_spannungsgrenze_eingehalten:false}),

  tool('geraeuschereignis_zwei_hoerplaetze_synchron',
    'Findet die zeitgleiche Überdeckung eines protokollierten Geräusches an zwei Hörplätzen — Quantify overlap between event observations at two listening positions.',
    NOISE, {
      a_start:sec('Beobachteter Start am ersten Hörplatz'),a_ende:sec('Beobachtetes Ende am ersten Hörplatz'),
      b_start:sec('Beobachteter Start am zweiten Hörplatz'),b_ende:sec('Beobachtetes Ende am zweiten Hörplatz'),
      uhren_abgeglichen:yes('Gemeinsamer Zeitbezug und dieselbe Ereignisdefinition an beiden Plätzen?')
    }, ({a_start,a_ende,b_start,b_ende,uhren_abgeglichen}) => {
      if (a_ende<=a_start||b_ende<=b_start) throw new RangeError('Je Hörplatz muss die Endzeit später als die Startzeit liegen.');
      const overlap=Math.max(0,Math.min(a_ende,b_ende)-Math.max(a_start,b_start));
      return {gleichzeitig_belegt_sek:uhren_abgeglichen?round(overlap):null,
        laengerer_einzelnachweis_sek:uhren_abgeglichen?round(Math.max(a_ende-a_start,b_ende-b_start)-overlap):null,
        hinweis:'Aus ähnlichen Zeitmarken allein folgt keine gemeinsame Quelle. Ohne abgeglichene Uhren keine Überschneidung ableiten.'};
    }, {a_start:11,a_ende:21,b_start:16,b_ende:24,uhren_abgeglichen:true},
    {gleichzeitig_belegt_sek:5,laengerer_einzelnachweis_sek:5}),

  tool('schallspitze_fast_slow_zeitgewichtung',
    'Vergleicht zwei Angaben zur Spitzenanzeige mit A-Gewichtung und unterschiedlichen Zeitkonstanten — Compare LAFmax and LASmax from the same measurement interval.',
    NOISE, {
      lafmax:db('Höchster F-zeitbewerteter A-Pegel (LAFmax)'),
      lasmax:db('Höchster S-zeitbewerteter A-Pegel (LASmax)'),
      derselbe_zeitraum:yes('Gleicher Zeitraum, Messpunkt und A-Gewichtung nachweisbar?')
    }, ({lafmax,lasmax,derselbe_zeitraum}) => ({
      fast_minus_slow_db:derselbe_zeitraum?round(lafmax-lasmax):null,
      hinweis:'Fast und Slow glätten zeitlich unterschiedlich. Keiner der beiden Werte ist ein ungewichteter Spitzenschalldruck oder ein Beleg für die Dauer des Geräuschs.'
    }), {lafmax:58,lasmax:53,derselbe_zeitraum:true}, {fast_minus_slow_db:5}),

  tool('ventilator_schwenkung_spitzenabschnitte_am_platz',
    'Ordnet beobachtete Pegelspitzen am Sitzplatz zwei Phasen derselben Schwenkbewegung zu — Summarize observed noise peaks during and outside a fan pass.',
    TOWER, {
      passagen:count('Vollständig dokumentierte Vorbeipassagen.'), spitzen_passagen:count('Ereignisse während solcher Passagen.'),
      restbloecke:count('Gleich lang protokollierte Abschnitte außerhalb der Passage.'), spitzen_rest:count('Ereignisse in diesen übrigen Abschnitten.'),
      zeiten_gleich:yes('Sind Passagen und Restabschnitte tatsächlich gleich lang und identisch ausgewertet?')
    }, ({passagen,spitzen_passagen,restbloecke,spitzen_rest,zeiten_gleich}) => {
      whole([passagen,spitzen_passagen,restbloecke,spitzen_rest]);
      const vergleiche=zeiten_gleich&&passagen>0&&restbloecke>0;
      return {spitzen_gesamt:spitzen_passagen+spitzen_rest,
        differenz_spitzen_je_abschnitt:vergleiche?round(spitzen_passagen/passagen-spitzen_rest/restbloecke):null,
        hinweis:'Beobachtete Phase und Pegelspitze können zusammen auftreten, ohne dass die Schwenkbewegung die Ursache ist.'};
    }, {passagen:4,spitzen_passagen:4,restbloecke:4,spitzen_rest:1,zeiten_gleich:true},
    {spitzen_gesamt:5,differenz_spitzen_je_abschnitt:0.75}),

  tool('geraeuschzeit_luecken_bei_zwei_markierten_spitzen',
    'Findet den längsten durchgehend beobachteten Abschnitt außerhalb zweier markierter Geräusche — Find the longest observed gap outside two recorded sound events.',
    NIGHT, {
      gesamt_sek:sec('Dauer der lückenlos beobachteten Folge'),
      erster_start:sec('Beginn des ersten Ereignisses'), erstes_ende:sec('Ende des ersten Ereignisses'),
      zweiter_start:sec('Beginn des zweiten Ereignisses'), zweites_ende:sec('Ende des zweiten Ereignisses')
    }, ({gesamt_sek,erster_start,erstes_ende,zweiter_start,zweites_ende}) => {
      if (erster_start>=erstes_ende||zweiter_start>=zweites_ende||zweiter_start<erster_start||Math.max(erstes_ende,zweites_ende)>gesamt_sek) {
        throw new RangeError('Ereignisse nach Beginn und innerhalb der vollständig beobachteten Folge eintragen.');
      }
      const zweites_endfenster=Math.max(erstes_ende,zweites_ende);
      const luecken=[erster_start,Math.max(0,zweiter_start-erstes_ende),gesamt_sek-zweites_endfenster];
      return {luecken_sek:luecken.map(x=>round(x)),laengste_ohne_markierung_sek:round(Math.max(...luecken)),
        hinweis:'Abschnitt ohne die protokollierten Markierungen. Aus dem Zeitabstand folgt kein bestimmter Grundpegel.'};
    }, {gesamt_sek:60,erster_start:10,erstes_ende:16,zweiter_start:32,zweites_ende:37},
    {luecken_sek:[10,16,23],laengste_ohne_markierung_sek:23}),

  tool('geraeuschprobe_grundpegel_rueckkehr_nach_ereignis',
    'Beurteilt ob der gemessene Grundpegel nach einem Ereignis wieder im eigenen Ausgangsband lag — Assess whether the measured post-event background returned to its initial band.',
    NOISE, {
      vor_db:db('Zeitmittel vor dem beobachteten Geräusch'), nach_db:db('Zeitmittel nach Ende des Geräuschs'),
      band_db:delta('Eigenes Toleranzband um die Ausgangsanzeige'),
      gleicher_modus:yes('Gleicher Betriebszustand, Messort und Auswertungsdauer der Grundphasen?')
    }, ({vor_db,nach_db,band_db,gleicher_modus}) => ({
      aenderung_db:gleicher_modus?round(nach_db-vor_db):null,
      im_ausgangsband:gleicher_modus?Math.abs(nach_db-vor_db)<=band_db:null,
      hinweis:'Nur beidseits dokumentierte Grundphasen. Eine nicht beobachtete Ursache, Restlauf oder Hintergrundwechsel bleibt offen.'
    }), {vor_db:35,nach_db:38,band_db:2,gleicher_modus:true},
    {aenderung_db:3,im_ausgangsband:false}),

  tool('schallpegel_drei_einzelquellen_modellsumme',
    'Schätzt den gleichzeitigen Gesamtpegel aus drei separaten unabhängigen Beiträgen am selben Ort — Estimate three independent simultaneous source contributions at one location.',
    NOISE, {
      a:db('Getrennt ermittelter LAeq-Beitrag A'), b:db('Getrennt ermittelter LAeq-Beitrag B'),
      c:db('Getrennt ermittelter LAeq-Beitrag C'),
      voraussetzungen_belegt:yes('Unabhängige Beiträge ohne mehrfachen Hintergrund, gleicher Ort, Gewichtung und Betriebszustand?')
    }, ({a,b,c,voraussetzungen_belegt}) => {
      const e=[a,b,c].map(energy);
      return {modellpegel_dba:voraussetzungen_belegt?level(e.reduce((sum,v)=>sum+v,0)):null,
        groesster_energieanteil_prozent:voraussetzungen_belegt?round(100*Math.max(...e)/e.reduce((sum,v)=>sum+v,0)):null,
        hinweis:'Energiesumme für voneinander unabhängige Quellen. Schallleistung aus Etiketten ist kein Schalldruckbeitrag am Hörplatz.'};
    }, {a:40,b:40,c:40,voraussetzungen_belegt:true},
    {modellpegel_dba:44.77,groesster_energieanteil_prozent:33.33}),

  tool('schallmodell_gemeinsam_messen_rechenrest',
    'Vergleicht einen bereits gerechneten Summenpegel mit dem tatsächlich gemessenen gemeinsamen Zustand — Compare a calculated total level with a matching combined measurement.',
    NOISE, {
      modell_total_db:db('Erwarteter modellierter Gesamt-LAeq'), gemeinsam_gemessen_db:db('Gemessener Gesamt-LAeq im gemeinsamen Zustand'),
      eigene_toleranz_db:delta('Selbst gesetzte Vergleichsbreite'),
      belege_abgeglichen:yes('Gleiche Bezugsgröße und Gewichtung, Hörerposition, Gerätestellungen und Intervalle?')
    }, ({modell_total_db,gemeinsam_gemessen_db,eigene_toleranz_db,belege_abgeglichen}) => ({
      messung_minus_modell_db:belege_abgeglichen?round(gemeinsam_gemessen_db-modell_total_db):null,
      modellannahmen_pruefen:belege_abgeglichen?Math.abs(gemeinsam_gemessen_db-modell_total_db)>eigene_toleranz_db:null,
      hinweis:'Abweichung allein identifiziert keine Quelle. Hintergrund, Reflexionen, Unabhängigkeit und Betriebszustände vergleichen.'
    }), {modell_total_db:45,gemeinsam_gemessen_db:48,eigene_toleranz_db:2,belege_abgeglichen:true},
    {messung_minus_modell_db:3,modellannahmen_pruefen:true}),

  tool('raumgeraeusch_eigenes_pegelziel_zusatzbeitrag',
    'Leitet aus bestehendem Pegel und eigenem Ziel einen modellierten Zusatzbeitrag ab — Estimate an independent added source budget under a chosen total level.',
    FAN_NIGHT, {
      basis_db:db('Gemessenes LAeq-Mittel der bestehenden Geräusche'),
      eigenes_ziel_db:db('Selbst gewählter Vergleichswert für dasselbe LAeq-Mittel'),
      unabhaengiger_zusatz:yes('Ist die zusätzliche Quelle als unabhängiger Beitrag zum selben Zeitfenster modellierbar?')
    }, ({basis_db,eigenes_ziel_db,unabhaengiger_zusatz}) => ({
      basis_erreicht_ziel_bereits:basis_db>=eigenes_ziel_db,
      modell_maximaler_zusatz_dba:unabhaengiger_zusatz&&eigenes_ziel_db>basis_db?level(energy(eigenes_ziel_db)-energy(basis_db)):null,
      hinweis:'Theoretisches Modell für zeitgleich gemittelte Beiträge. Die selbst gewählte Zahl ist kein Grenzwert für Gesundheit oder Hausordnung.'
    }), {basis_db:40,eigenes_ziel_db:46.99,unabhaengiger_zusatz:true},
    {basis_erreicht_ziel_bereits:false,modell_maximaler_zusatz_dba:46.02}),

  tool('schallquelle_hintergrundspanne_schaetzintervall',
    'Gibt ein Modellintervall für den Quellenanteil bei variierendem dokumentiertem Hintergrund an — Bound an independent source contribution using a measured background range.',
    NOISE, {
      gesamt_db:db('Gesamtpegel am Messort als LAeq'),
      hintergrund_min_db:db('Unterer LAeq des am selben Ort separat gemessenen Hintergrunds'),
      hintergrund_max_db:db('Oberer LAeq des Hintergrunds'),
      vergleichbar:yes('Gerät und Hintergrund als unabhängig und Messbedingungen vergleichbar dokumentiert?')
    }, ({gesamt_db,hintergrund_min_db,hintergrund_max_db,vergleichbar}) => {
      if (hintergrund_min_db>hintergrund_max_db) throw new RangeError('Hintergrundspanne in aufsteigender Reihenfolge angeben.');
      return {abschaetzbar_oberes_ende_dba:vergleichbar?level(energy(gesamt_db)-energy(hintergrund_min_db)):null,
        abschaetzbar_unteres_ende_dba:vergleichbar?level(energy(gesamt_db)-energy(hintergrund_max_db)):null,
        hinweis:'Fehlt die Untergrenze, lässt sich der Quellenanteil vom oberen Hintergrund nicht trennen. Spannweite ist kein Konfidenzintervall.'};
    }, {gesamt_db:50,hintergrund_min_db:40,hintergrund_max_db:48,vergleichbar:true},
    {abschaetzbar_oberes_ende_dba:49.54,abschaetzbar_unteres_ende_dba:45.67}),

  tool('geraeuschquellen_gleichzeitigkeit_erwartungsreferenz',
    'Vergleicht beobachtete Gleichzeitigkeit zweier Geräuschquellen mit einem einfachen Unabhängigkeitsmodell — Compare observed source overlap with an independent occupancy reference.',
    NOISE, {
      gesamt_sek:num('Dauer der gemeinsamen Beobachtung in Sekunden.',1,86400),
      a_sek:sec('Belegte Dauer von Quelle A'), b_sek:sec('Belegte Dauer von Quelle B'),
      beide_sek:sec('Beobachtete gemeinsame Dauer aus derselben Zeitachse')
    }, ({gesamt_sek,a_sek,b_sek,beide_sek}) => {
      if (beide_sek>Math.min(a_sek,b_sek)||a_sek+b_sek-beide_sek>gesamt_sek) throw new RangeError('Dauern müssen in das gemeinsame Beobachtungsfenster passen.');
      const referenz=a_sek*b_sek/gesamt_sek;
      return {bei_unabhaengiger_zeitlage_sek:round(referenz),beobachtet_minus_referenz_sek:round(beide_sek-referenz),
        hinweis:'Rechnerischer Vergleich zu gleichmäßig unabhängiger Zeitlage. Abweichung belegt weder Ursache noch eine statistische Abhängigkeit.'};
    }, {gesamt_sek:120,a_sek:60,b_sek:40,beide_sek:30},
    {bei_unabhaengiger_zeitlage_sek:20,beobachtet_minus_referenz_sek:10}),

  tool('kurzgeraeusch_abtastluecke_im_pegelprotokoll',
    'Prüft, ob ein beobachteter kurzer Klang vollständig zwischen zwei Einzelablesungen liegen kann — Check whether a recorded brief sound could fall wholly between instantaneous samples.',
    NIGHT, {
      ereignis_ms:num('Dauer des kurzen Geräuschs aus einer feineren vorhandenen Aufzeichnung in ms.',1,60000),
      abstand_ms:num('Dokumentierter gleichmäßiger Abstand zwischen Einzelablesungen in ms.',1,60000),
      punktabtastung_belegt:yes('Sind die vorhandenen Ausgabewerte periodische Momentaufnahmen ohne Intervallmittel oder Spitzenhaltung?')
    }, ({ereignis_ms,abstand_ms,punktabtastung_belegt}) => ({
      kann_zwischen_ablesungen_liegen:punktabtastung_belegt?ereignis_ms<abstand_ms:null,
      verfehlter_phasenanteil_im_modell_prozent:punktabtastung_belegt?round(100*Math.max(0,1-ereignis_ms/abstand_ms)):null,
      hinweis:'Rechenmodell mit gleichmäßig verteiltem Ereignisbeginn zwischen zwei lückenlosen Ablesungen. Ein zeitlicher Treffer belegt keinen korrekt erfassten Spitzenpegel. Nicht auf Intervallmittel anwenden.'
    }), {ereignis_ms:200,abstand_ms:1000,punktabtastung_belegt:true},
    {kann_zwischen_ablesungen_liegen:true,verfehlter_phasenanteil_im_modell_prozent:80}),

  tool('schallmessung_zwei_aufstellungen_eigener_hintergrund',
    'Vergleicht zwei Aufstellungen, nachdem für jede der separat gemessene eigene Hintergrund berücksichtigt wurde — Compare two placements using their own measured background levels.',
    NOISE, {
      a_gesamt_db:db('Gesamt-LAeq A mit laufendem Gerät'), a_basis_db:db('Hintergrund-LAeq A ohne dieses Gerät'),
      b_gesamt_db:db('Gesamt-LAeq B mit laufendem Gerät'), b_basis_db:db('Hintergrund-LAeq B ohne dieses Gerät'),
      getrennte_belege:yes('Stabile unabhängige Hintergründe und gleiche Messmethode am selben Hörplatz?')
    }, ({a_gesamt_db,a_basis_db,b_gesamt_db,b_basis_db,getrennte_belege}) => {
      const a=energy(a_gesamt_db)-energy(a_basis_db);
      const b=energy(b_gesamt_db)-energy(b_basis_db);
      return {modell_a_dba:getrennte_belege?level(a):null,modell_b_dba:getrennte_belege?level(b):null,
        modell_b_minus_a_db:getrennte_belege&&a>0&&b>0?level(b/a):null,
        hinweis:'Bei geringem Abstand zum Hintergrund reagiert das Ergebnis empfindlich auf Messfehler. Kein Quellennachweis allein durch Subtraktion.'};
    }, {a_gesamt_db:43.01,a_basis_db:40,b_gesamt_db:46.99,b_basis_db:40,getrennte_belege:true},
    {modell_a_dba:40,modell_b_dba:46.02,modell_b_minus_a_db:6.02}),

  tool('geraeuschphase_eigenes_mittel_verfuegbare_zeit',
    'Errechnet den maximalen Anteil eines lauteren Abschnitts für ein selbst gewähltes Zeitmittel — Solve for the time allowance of a louder phase under a chosen equivalent level.',
    NIGHT, {
      ruhiger_db:db('LAeq der leiseren Vergleichsphase'), lauter_db:db('LAeq der lauteren Phase'),
      ziel_db:db('Eigenes LAeq-Vergleichsziel'),
      gesamt_sek:sec('Gesamtdauer des reinen Zwei-Phasen-Szenarios'),
      messbasis_gleich:yes('Gleicher Messort und gleiche Gewichtung für beide Zustände?')
    }, ({ruhiger_db,lauter_db,ziel_db,gesamt_sek,messbasis_gleich}) => {
      if (lauter_db<=ruhiger_db) throw new RangeError('Die lautere Phase braucht einen höheren gemessenen Pegel.');
      const spannweite=energy(lauter_db)-energy(ruhiger_db);
      const anteil=spannweite>0?(energy(ziel_db)-energy(ruhiger_db))/spannweite:null;
      return {lauter_hoechstens_sek:messbasis_gleich&&ziel_db>=ruhiger_db&&anteil!==null?round(gesamt_sek*Math.min(1,anteil)):null,
        ziel_schon_in_ruhiger_phase_unerreichbar:messbasis_gleich?ziel_db<ruhiger_db:null,
        hinweis:'Modell für ein Energie-Zeitmittel, nicht für Spitzen oder wahrgenommene Ruhe. Eingabeziel ist persönlich gewählt.'};
    }, {ruhiger_db:40,lauter_db:50,ziel_db:43.01,gesamt_sek:900,messbasis_gleich:true},
    {lauter_hoechstens_sek:99.99,ziel_schon_in_ruhiger_phase_unerreichbar:false}),

  tool('geraeuschereignis_sel_und_zeitfenster_abgleichen',
    'Rechnet ein isoliert gemessenes Ereignis auf zwei unterschiedlich lange Vergleichsfenster um — Convert one isolated event exposure to equivalent levels for two comparison windows.',
    NOISE, {
      ereignis_sel:db('Gemessener A-bewerteter Ereignispegel SEL mit Bezugsdauer 1 Sekunde'),
      fenster_a_sek:num('Dauer des Vergleichsfensters A in Sekunden.',1,86400),
      fenster_b_sek:num('Dauer des Vergleichsfensters B in Sekunden.',1,86400),
      ereignis_ganz:yes('Enthalten beide Fenster dasselbe vollständige isolierte Ereignis?')
    }, ({ereignis_sel,fenster_a_sek,fenster_b_sek,ereignis_ganz}) => ({
      ereignisbeitrag_a_laeq_db:ereignis_ganz?round(ereignis_sel-10*Math.log10(fenster_a_sek)):null,
      ereignisbeitrag_b_laeq_db:ereignis_ganz?round(ereignis_sel-10*Math.log10(fenster_b_sek)):null,
      hinweis:'Nur Energie des isolierten Ereignisses, ohne zusätzlichen Hintergrund. Unterschiedliche Fenster ergeben keine Änderung des Ereignispegels selbst.'
    }), {ereignis_sel:60,fenster_a_sek:10,fenster_b_sek:100,ereignis_ganz:true},
    {ereignisbeitrag_a_laeq_db:50,ereignisbeitrag_b_laeq_db:40}),

  tool('geraeuschprobe_ueberlagerte_spitzen_aussortieren',
    'Vergleicht berichtete Spitzen vor und nach einer dokumentierten Auswahl von Zeitfenstern ohne fremde Ereignisse — Check how unrelated event timing affects two recorded maxima.',
    NOISE, {
      gesamt_max_db:db('Höchster Wert aller Abschnitte mit gleicher Maximalstatistik'),
      auswahl_max_db:db('Höchster Wert der verbliebenen Teilmenge ohne markierte Fremdereignisse'),
      passende_auswahl:yes('Verbleibende Fenster sind echte Teilmenge der ursprünglichen Zeitreihe und nicht getrennt gemessen?')
    }, ({gesamt_max_db,auswahl_max_db,passende_auswahl}) => {
      if (passende_auswahl&&auswahl_max_db>gesamt_max_db) throw new RangeError('Ein Maximum der Teilmenge kann das Gesamtmaximum nicht überschreiten.');
      return {maximalwert_rueckgang_db:passende_auswahl?round(gesamt_max_db-auswahl_max_db):null,
        hinweis:'Auswahl zeigt die Abhängigkeit vom gewählten Protokollfenster. Sie weist keinem einzelnen Gerät einen Spitzenpegel zu.'};
    }, {gesamt_max_db:57,auswahl_max_db:52,passende_auswahl:true}, {maximalwert_rueckgang_db:5}),

  tool('geraeuschabstand_gemessen_gegen_freifeld',
    'Vergleicht eine tatsächlich gemessene Pegelabnahme mit einer Freifeld-Referenz — Compare measured level attenuation with an ideal free-field reference.',
    NOISE, {
      nah_m:num('Naher Abstand in Metern.',0.1,30), fern_m:num('Weiterer Abstand in Metern.',0.1,30),
      nah_db:db('Gemessener LAeq am nahen Punkt'), fern_db:db('Gemessener LAeq am weiteren Punkt'),
      gleiche_richtung:yes('Ein Messstrahl, gleiche Ausrichtung, Quelle und vergleichbare Hintergrundbedingungen?')
    }, ({nah_m,fern_m,nah_db,fern_db,gleiche_richtung}) => {
      if (fern_m<=nah_m) throw new RangeError('Der weitere Abstand muss größer sein.');
      const reference=20*Math.log10(fern_m/nah_m);
      return {freifeld_abnahme_db:round(reference),beobachtete_abnahme_db:gleiche_richtung?round(nah_db-fern_db):null,
        rest_gegen_freifeld_db:gleiche_richtung?round(nah_db-fern_db-reference):null,
        hinweis:'Freifeld für eine idealisierte Punktquelle. Abweichungen im Zimmer weisen ohne weitere Belege keine bestimmte Reflexion nach.'};
    }, {nah_m:1,fern_m:2,nah_db:52,fern_db:48,gleiche_richtung:true},
    {freifeld_abnahme_db:6.02,beobachtete_abnahme_db:4,rest_gegen_freifeld_db:-2.02}),

  tool('geraet_schallrichtung_gleicher_radius_seitenvergleich',
    'Vergleicht seitliche Pegel mit der Vorderseite, wenn alle Punkte gleich weit vom Gerät lagen — Compare measured side levels relative to the front at a matching distance.',
    FAN, {
      vorn_db:db('LAeq vor dem Gerät'), links_db:db('LAeq links'), rechts_db:db('LAeq rechts'),
      gleiche_geometrie:yes('Gleicher Abstand, Höhe, Modus und vergleichbarer Hintergrund an allen Punkten?')
    }, ({vorn_db,links_db,rechts_db,gleiche_geometrie}) => ({
      links_minus_vorn_db:gleiche_geometrie?round(links_db-vorn_db):null,
      rechts_minus_vorn_db:gleiche_geometrie?round(rechts_db-vorn_db):null,
      ueberall_vorn_hoeher:gleiche_geometrie?vorn_db>Math.max(links_db,rechts_db):null,
      hinweis:'Raumbeobachtung und keine normierte Richtcharakteristik. Wände, Möbel und Luftzug am Mikrofon beeinflussen die Werte.'
    }), {vorn_db:49,links_db:43,rechts_db:50,gleiche_geometrie:true},
    {links_minus_vorn_db:-6,rechts_minus_vorn_db:1,ueberall_vorn_hoeher:false}),

  tool('monoblock_kontaktvibration_zu_schallereignissen',
    'Trennt Fälle mit gleichzeitig wahrnehmbarer Kontaktvibration von reinen Geräuschbeobachtungen — Separate logged acoustic events with and without observed contact vibration.',
    NOISE, {
      schallereignisse:count('Markierte Schallereignisse in derselben Beobachtung.'),
      beide:count('Ereignisse mit zeitgleich an einem frei zugänglichen entfernten Punkt beobachteter Vibration.'),
      vibration_nicht_geprueft:count('Schallereignisse ohne Vibrationserfassung.')
    }, ({schallereignisse,beide,vibration_nicht_geprueft}) => {
      whole([schallereignisse,beide,vibration_nicht_geprueft]);
      if (beide+vibration_nicht_geprueft>schallereignisse) throw new RangeError('Teilzahlen passen nicht zu den markierten Ereignissen.');
      return {mit_kontaktbeobachtung:beide,kein_vibrationsbefund:schallereignisse-beide-vibration_nicht_geprueft,
        offen:vibration_nicht_geprueft,
        hinweis:'Zeitliches Zusammenfallen belegt keine Übertragungsursache. Keine vibrierenden Geräte anfassen oder für diese Beobachtung umbauen.'};
    }, {schallereignisse:12,beide:5,vibration_nicht_geprueft:3}, {mit_kontaktbeobachtung:5,kein_vibrationsbefund:4,offen:3}),

  tool('raumreflexion_zweitimpuls_wegdifferenz_modell',
    'Schätzt aus einem bereits aufgezeichneten Zeitabstand eine mögliche zusätzliche Schallstrecke — Estimate excess acoustic path length from an existing delayed sound marker.',
    NOISE, {
      verzoegerung_ms:num('Zeitabstand zweier Marker derselben Aufnahme in Millisekunden.',0.01,1000),
      schalltempo_m_s:num('Für die Rechenannahme gewählte Schallgeschwindigkeit in m/s.',300,400),
      gemeinsames_ereignis_belegt:yes('Beide Marken stammen nach vorhandenem Beleg vom selben kurzen Ereignis?')
    }, ({verzoegerung_ms,schalltempo_m_s,gemeinsames_ereignis_belegt}) => ({
      modell_mehrweg_m:gemeinsames_ereignis_belegt?round(schalltempo_m_s*verzoegerung_ms/1000,3):null,
      hinweis:'Rechnerische Wegdifferenz im angenommenen Modell. Weder Wandabstand noch Reflexionsort folgen eindeutig aus einer Aufnahme.'
    }), {verzoegerung_ms:10,schalltempo_m_s:343,gemeinsames_ereignis_belegt:true},
    {modell_mehrweg_m:3.43}),

  tool('geraeusch_aufstellung_rueckkehrtest_a_b_a',
    'Vergleicht zwei Platzierungen mithilfe einer wiederholten Ausgangsmessung am selben Hörplatz — Compare placement B against before-and-after readings at placement A.',
    NOISE, {
      a_vorher_db:db('Erste Vergleichsmessung an Aufstellung A'), b_db:db('Messung an Aufstellung B'),
      a_nachher_db:db('Kontrollmessung nach regulärer Rückkehr zu Aufstellung A'),
      eigene_toleranz_db:delta('Eigener maximal zulässiger Unterschied der A-Kontrollen'),
      versuch_vergleichbar:yes('Gleiche Gerätestufe, Hörposition, Untergrundbedingungen der jeweiligen Aufstellung und Messdauer?')
    }, ({a_vorher_db,b_db,a_nachher_db,eigene_toleranz_db,versuch_vergleichbar}) => {
      const stabil=Math.abs(a_nachher_db-a_vorher_db)<=eigene_toleranz_db;
      const a_mittel=(energy(a_vorher_db)+energy(a_nachher_db))/2;
      return {kontrolle_a_stabil:versuch_vergleichbar?stabil:null,
        b_gegen_beide_a_db:versuch_vergleichbar&&stabil?level(energy(b_db)/a_mittel):null,
        hinweis:'Nur vorhandene Aufstellungen nach Anleitung vergleichen. Vergleich gilt für diesen Raum und Messaufbau.'};
    }, {a_vorher_db:50,b_db:45,a_nachher_db:50,eigene_toleranz_db:0.5,versuch_vergleichbar:true},
    {kontrolle_a_stabil:true,b_gegen_beide_a_db:-5}),

  tool('hoerplatz_messhoehen_eigenziel_beide_positionen',
    'Prüft einen eigenen Vergleichswert getrennt für Sitz- und Stehhöhe am selben Ort — Test a chosen comparison level at seated and standing ear heights.',
    FAN_NIGHT, {
      sitz_db:db('LAeq in selbst gewählter Sitzhöhe'), stand_db:db('LAeq in selbst gewählter Stehhöhe'),
      ziel_db:db('Selbst gewählter Vergleichswert'),
      messungen_passend:yes('Gleiche Geräteeinstellung, Messachse, Messdauer und ähnlicher Hintergrund?')
    }, ({sitz_db,stand_db,ziel_db,messungen_passend}) => ({
      sitz_im_ziel:sitz_db<=ziel_db,stand_im_ziel:stand_db<=ziel_db,
      beide_belegt:messungen_passend?sitz_db<=ziel_db&&stand_db<=ziel_db:null,
      hinweis:'Ergebnisse der zwei eigenen Messhöhen. Die persönliche Zahl ist keine akustische Komfort- oder Schutzvorgabe.'
    }), {sitz_db:41,stand_db:46,ziel_db:43,messungen_passend:true},
    {sitz_im_ziel:true,stand_im_ziel:false,beide_belegt:false}),

  tool('ventilator_messmikrofon_direktwind_kontrollprobe',
    'Dokumentiert ob eine auffällige Anzeige auch bei geprüfter Windschutzbedingung bestehen blieb — Compare a meter reading with and without a documented microphone wind condition.',
    FAN, {
      naechste_anzeige_db:db('Angezeigter Wert in der auffälligen Probe mit direkter Luftbewegung am Sensor'),
      windkontrolle_db:db('Wert eines geeigneten dokumentierten Windschutz-Vergleichs'),
      aufbau_abgeglichen:yes('Position, Einstellung und Quelle sind gleich. Die Eignung des Windschutzes für das Messgerät ist dokumentiert.')
    }, ({naechste_anzeige_db,windkontrolle_db,aufbau_abgeglichen}) => ({
      differenz_beider_anzeigen_db:aufbau_abgeglichen?round(naechste_anzeige_db-windkontrolle_db):null,
      hinweis:'Kontrolliert die Messung, kein bereinigter Gerätepegel. Kein Gerät oder Gerätelufteinlass für den Versuch abdecken.'
    }), {naechste_anzeige_db:54,windkontrolle_db:46,aufbau_abgeglichen:true},
    {differenz_beider_anzeigen_db:8}),

  tool('mobilgeraet_schallplatz_sichtlinie_messbeleg',
    'Trennt zwei tatsächlich gemessene Hörplätze nach vorhandener direkter Sichtlinie zur Quelle — Compare two existing acoustic positions classified by observed line of sight.',
    NOISE, {
      sichtplatz_db:db('LAeq am beobachteten Platz mit direkter Sichtlinie'),
      verdeckter_platz_db:db('LAeq am natürlich verdeckten Platz'),
      normale_aufstellung:yes('Vorhandene nicht umgestellte Hindernisse, gleicher Modus und vergleichbarer Abstand?'),
      hintergrund_aehnlich:yes('Hintergrund beider Messfenster vergleichbar?')
    }, ({sichtplatz_db,verdeckter_platz_db,normale_aufstellung,hintergrund_aehnlich}) => ({
      verdeckt_minus_sicht_db:normale_aufstellung&&hintergrund_aehnlich?round(verdeckter_platz_db-sichtplatz_db):null,
      hinweis:'Unterschied zweier Plätze, kein Dämmwert des Hindernisses. Lüftungsöffnungen des Geräts frei halten. Keine Abschirmung bauen.'
    }), {sichtplatz_db:47,verdeckter_platz_db:42,normale_aufstellung:true,hintergrund_aehnlich:true},
    {verdeckt_minus_sicht_db:-5}),

  tool('saugroboter_fahrgeraeusch_bodenuebergang_wiederkehr',
    'Vergleicht wiederkehrende Geräuschmarken beim beobachteten Bodenwechsel und auf freier Strecke — Compare repeated noise marks at ordinary floor transitions and on uninterrupted runs.',
    ROBOT, {
      uebergaenge:count('Beobachtete vergleichbare reguläre Übergänge.'),
      auffaellig_am_uebergang:count('Davon mit der zuvor definierten Auffälligkeit.'),
      freie_abschnitte:count('Zahl vergleichbar langer freier Fahrabschnitte.'),
      auffaellig_auf_strecke:count('Davon mit derselben Geräuschmarke.')
    }, ({uebergaenge,auffaellig_am_uebergang,freie_abschnitte,auffaellig_auf_strecke}) => {
      whole([uebergaenge,auffaellig_am_uebergang,freie_abschnitte,auffaellig_auf_strecke]);
      if (auffaellig_am_uebergang>uebergaenge||auffaellig_auf_strecke>freie_abschnitte) throw new RangeError('Auffällige Fahrten sind Teilmengen der Vergleichsfahrten.');
      return {auffaelligkeitsdifferenz_prozentpunkte:uebergaenge>0&&freie_abschnitte>0?
        round(100*(auffaellig_am_uebergang/uebergaenge-auffaellig_auf_strecke/freie_abschnitte)):null,
        hinweis:'Nur reguläre beobachtete Fahrten. Die Zuordnung belegt weder eine defekte Rolle noch eine mechanische Ursache.'};
    }, {uebergaenge:5,auffaellig_am_uebergang:4,freie_abschnitte:5,auffaellig_auf_strecke:1},
    {auffaelligkeitsdifferenz_prozentpunkte:60}),

  tool('hoerprobe_zwei_betriebsarten_subjektive_urteile',
    'Verdichtet paarweise persönliche Höreindrücke mit getrenntem Unentschieden — Summarize paired listening preferences while keeping undecided trials visible.',
    FAN_NIGHT, {
      a_angenehmer:count('Anzahl eigener Vergleichsdurchgänge mit Präferenz für A.'),
      b_angenehmer:count('Anzahl mit Präferenz für B.'), unentschieden:count('Vergleiche ohne eindeutige Präferenz.'),
      gleicher_hoerplatz:yes('War der Hörplatz bei allen Durchgängen gleich?')
    }, ({a_angenehmer,b_angenehmer,unentschieden,gleicher_hoerplatz}) => {
      whole([a_angenehmer,b_angenehmer,unentschieden]);
      const anzahl=a_angenehmer+b_angenehmer+unentschieden;
      return {proben:anzahl,unentschieden,subjektive_mehrheit:gleicher_hoerplatz&&anzahl>0?
        a_angenehmer>anzahl/2?'a':b_angenehmer>anzahl/2?'b':'keine':null,
        hinweis:'Persönliche Eindrücke unter den beobachteten Bedingungen. Daraus folgen kein objektiver Pegel und keine Empfehlung für andere Personen.'};
    }, {a_angenehmer:4,b_angenehmer:2,unentschieden:3,gleicher_hoerplatz:true},
    {proben:9,unentschieden:3,subjektive_mehrheit:'keine'}),
];
