const guide = slug => '/guide/' + slug + '.html';
const setback = guide('nachtabsenkung-heizung');
const heating = guide('heizkosten-senken-als-mieter');
const radiator = guide('heizkoerper-wird-nicht-warm');
const curtains = guide('thermovorhang-ratgeber');
const condensation = guide('fenster-beschlagen-innen');
const shade = guide('hitzeschutz-fenster');
const workWarm = guide('homeoffice-warm-bleiben');
const workCool = guide('homeoffice-buero-kuehlen');
const sleep = guide('beste-tragbare-klimaanlage-schlafzimmer');
const summer = guide('richtig-lueften-bei-hitze');
const winter = guide('richtig-lueften-im-winter');
const humidity = guide('luftentfeuchter-ratgeber');
const cooling = guide('zimmer-kuehlen-ohne-installation');
const heatingDevice = guide('infrarotheizung-ratgeber');
const n = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const m = description => n(description,0,1440);
const cm = description => n(description,0,3000);
const c = description => n(description,-20,65);
const b = description => ({type:'boolean',description});
const choice = (description,...values) => ({type:'string',description,enum:values});
const round = value => Math.round(value * 100) / 100;
const intersect = (a,b,c,d) => Math.max(0,Math.min(b,d) - Math.max(a,c));
function intervals(...pairs) {
  if (pairs.some(([start,end]) => end < start)) throw new RangeError('Ende und Anfang sind vertauscht.');
}
function task(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const wohnszenarien = [
  task('heizzone_gemeinsames_komfortband_belegung',
    'Gemeinsames Wunschband für zwei gleichzeitig genutzte Zimmer prüfen — Check overlapping user-selected comfort bands while both rooms are occupied.',
    heating, {
      a_min_c:c('Unteres Wunschziel in Zimmer A.'), a_max_c:c('Oberes Wunschziel in Zimmer A.'),
      b_min_c:c('Unteres Wunschziel in Zimmer B.'), b_max_c:c('Oberes Wunschziel in Zimmer B.'),
      a_start:m('Nutzungsbeginn A, Minuten seit Mitternacht.'), a_ende:m('Nutzungsende A am selben Tag.'),
      b_start:m('Nutzungsbeginn B, Minuten seit Mitternacht.'), b_ende:m('Nutzungsende B am selben Tag.'),
      gemeinsame_regelung:b('Können die Räume laut vorhandener Regelung nur gemeinsam eingestellt werden?')
    }, ({a_min_c,a_max_c,b_min_c,b_max_c,a_start,a_ende,b_start,b_ende,gemeinsame_regelung}) => {
      intervals([a_min_c,a_max_c],[b_min_c,b_max_c],[a_start,a_ende],[b_start,b_ende]);
      const zugleich = intersect(a_start,a_ende,b_start,b_ende);
      const unten = Math.max(a_min_c,b_min_c);
      const oben = Math.min(a_max_c,b_max_c);
      return {gemeinsam_belegt_min:zugleich, gemeinsames_wunschband_c:zugleich && unten<=oben ? [unten,oben] : null,
        zielkonflikt:gemeinsame_regelung && zugleich>0 && unten>oben,
        hinweis:'Wunschwerte sind persönliche Ziele. Verschiedene Zimmer können bei gleichem Sollwert unterschiedlich warm werden.'};
    }, {a_min_c:19,a_max_c:21,b_min_c:17,b_max_c:18,a_start:480,a_ende:720,b_start:660,b_ende:900,gemeinsame_regelung:true},
    {gemeinsam_belegt_min:60,gemeinsames_wunschband_c:null,zielkonflikt:true}),

  task('heizzonen_messpaar_reaktion_zielraeume',
    'Bei derselben Wärmeanforderung beobachtete Reaktionen zweier Räume auseinanderhalten — Separate two room temperature responses to the same heating request.',
    radiator, {
      a_vorher:c('Zimmer A vor der Anforderung.'), a_nachher:c('Zimmer A am gemeinsamen Messende.'),
      b_vorher:c('Zimmer B vor der Anforderung.'), b_nachher:c('Zimmer B am gemeinsamen Messende.'),
      messuneindeutigkeit:n('Eigene Grenze für eine unterscheidbare Nettoänderung in °C.',0,10),
      anforderung_und_zeit_geprueft:b('Wurden Wärmeanforderung und gleiche Messzeit bestätigt?')
    }, ({a_vorher,a_nachher,b_vorher,b_nachher,messuneindeutigkeit,anforderung_und_zeit_geprueft}) => {
      const a = a_nachher - a_vorher;
      const z = b_nachher - b_vorher;
      const a_reaktion = a > messuneindeutigkeit + 1e-9;
      const b_reaktion = z > messuneindeutigkeit + 1e-9;
      return {a_aenderung_c:round(a),b_aenderung_c:round(z),
        beobachtung:!anforderung_und_zeit_geprueft?'messfenster_pruefen':a_reaktion===b_reaktion?'gleiche_reaktionsklasse':a_reaktion?'nur_a_waermer':'nur_b_waermer',
        hinweis:'Sonne und Nutzung können beide Messwerte beeinflussen. Beobachtung zum Heizverlauf dokumentieren.'};
    }, {a_vorher:18,a_nachher:19.2,b_vorher:18,b_nachher:18.15,messuneindeutigkeit:0.3,anforderung_und_zeit_geprueft:true},
    {a_aenderung_c:1.2,b_aenderung_c:0.15,beobachtung:'nur_a_waermer'}),

  task('heizpause_raumfolge_wiederanlauf_engpass',
    'Nach gemeinsamer Absenkung zwei verschieden lange Wiederaufheizzeiten mit der Raumfolge prüfen — Check a shared restart against distinct readiness deadlines.',
    setback, {
      start_fruehestens:m('Frühester verfügbarer Start nach Ende der Absenkung.'),
      a_faellig:m('Beginn der Rückkehr in Raum A, in Minuten seit Mitternacht.'), a_vorlauf:m('Gemessener Vorlauf in A.'),
      b_faellig:m('Beginn der Rückkehr in Raum B, am gleichen Tag.'), b_vorlauf:m('Gemessener eigener Vorlauf in B.'),
      gemeinsam_geprueft:b('Wurden beide Vorläufe beim gleichzeitigen Heizbeginn beobachtet?')
    }, ({start_fruehestens,a_faellig,a_vorlauf,b_faellig,b_vorlauf,gemeinsam_geprueft}) => {
      const frist_a = a_faellig - a_vorlauf;
      const frist_b = b_faellig - b_vorlauf;
      const letzte = Math.min(frist_a,frist_b);
      return {spaetester_start_min:gemeinsam_geprueft && letzte>=start_fruehestens?letzte:null,
        a_fehlzeit_min:gemeinsam_geprueft?Math.max(0,start_fruehestens-frist_a):null,
        b_fehlzeit_min:gemeinsam_geprueft?Math.max(0,start_fruehestens-frist_b):null,
        hinweis:'Nur gemeinsam gemessene Wiederanlaufzeiten bei ähnlichen Startbedingungen verwenden.'};
    }, {start_fruehestens:400,a_faellig:450,a_vorlauf:60,b_faellig:490,b_vorlauf:50,gemeinsam_geprueft:true},
    {spaetester_start_min:null,a_fehlzeit_min:10,b_fehlzeit_min:0}),

  task('heizzone_moebel_nutzungsstellung_abstand',
    'Zwei Möbelstellungen am Heizkörper auf den bestätigten Freiraum prüfen — Compare everyday and guest furniture positions against your documented clearance.',
    radiator, {
      mindestabstand_cm:cm('Bestätigte freie Distanz an der konkret geprüften Stelle.'),
      alltag_cm:cm('Kleinster dort gemessener Abstand in Alltagsstellung.'),
      besuch_cm:cm('Kleinster dort gemessener Abstand mit ausgeklapptem oder umgestelltem Möbel.'),
      mindestabstand_belegt:b('Passt die Vorgabe zu genau diesem Heizkörper und der gemessenen Stelle?')
    }, ({mindestabstand_cm,alltag_cm,besuch_cm,mindestabstand_belegt}) => ({
      fehlabstand_alltag_cm:mindestabstand_belegt?round(Math.max(0,mindestabstand_cm-alltag_cm)):null,
      fehlabstand_besuch_cm:mindestabstand_belegt?round(Math.max(0,mindestabstand_cm-besuch_cm)):null,
      beide_abstaende_erfuellt:mindestabstand_belegt && alltag_cm>=mindestabstand_cm && besuch_cm>=mindestabstand_cm,
      hinweis:'Nur die gemessene Stelle ist abgedeckt. Weitere Freiräume und Vorgaben separat am Montageort prüfen.'
    }), {mindestabstand_cm:35,alltag_cm:58,besuch_cm:22,mindestabstand_belegt:true},
    {fehlabstand_alltag_cm:0,fehlabstand_besuch_cm:13,beide_abstaende_erfuellt:false}),

  task('heizzone_zeitplan_lueftung_raumwechsel',
    'Gleichzeitige Aufwärmphase mit Lüftungsfenstern zweier Zimmer in Minuten abgleichen — Check scheduled heating overlap with two separate airing windows.',
    winter, {
      heizstart:m('Beginn der gemeinsamen Aufwärmphase, Minuten seit Mitternacht.'),
      heizende:m('Ende der Aufwärmphase am gleichen Tag.'),
      a_start:m('Lüftungsbeginn A.'), a_ende:m('Lüftungsende A.'), b_start:m('Lüftungsbeginn B.'), b_ende:m('Lüftungsende B.'),
      getrennt_regelbar:b('Können beide Zimmer laut vorhandener Ausstattung getrennt geregelt werden?')
    }, ({heizstart,heizende,a_start,a_ende,b_start,b_ende,getrennt_regelbar}) => {
      intervals([heizstart,heizende],[a_start,a_ende],[b_start,b_ende]);
      const a = intersect(heizstart,heizende,a_start,a_ende);
      const z = intersect(heizstart,heizende,b_start,b_ende);
      const beide = Math.max(0,Math.min(heizende,a_ende,b_ende)-Math.max(heizstart,a_start,b_start));
      return {heizen_bei_offenem_fenster_a_min:a,heizen_bei_offenem_fenster_b_min:z,
        heizphase_mindestens_ein_fenster_offen_min:a+z-beide,
        gemeinsame_zeitplanung_pruefen:!getrennt_regelbar && a+z>0,
        hinweis:'Der Abgleich prüft Termine. Den tatsächlichen Lüftungsbedarf an den Raumverhältnissen ausrichten.'};
    }, {heizstart:400,heizende:480,a_start:430,a_ende:465,b_start:460,b_ende:500,getrennt_regelbar:false},
    {heizen_bei_offenem_fenster_a_min:35,heizen_bei_offenem_fenster_b_min:20,heizphase_mindestens_ein_fenster_offen_min:50,gemeinsame_zeitplanung_pruefen:true}),

  task('fensterbehang_winter_lichtgewinn_zwei_bloecke',
    'Offene Zeit für Tageslicht in zwei geplanten Winter-Nutzungsblöcken prüfen — Check actual daylight access in two separately planned use blocks.',
    curtains, {
      offen_ab:m('Start der geplanten Öffnung, Minuten seit Mitternacht.'), offen_bis:m('Ende der geplanten Öffnung.'),
      a_ab:m('Beginn Block A.'), a_bis:m('Ende Block A.'), a_ziel:m('Eigener Mindestbedarf offener Minuten in A.'),
      b_ab:m('Beginn Block B.'), b_bis:m('Ende Block B.'), b_ziel:m('Eigener Mindestbedarf offener Minuten in B.')
    }, ({offen_ab,offen_bis,a_ab,a_bis,a_ziel,b_ab,b_bis,b_ziel}) => {
      intervals([offen_ab,offen_bis],[a_ab,a_bis],[b_ab,b_bis]);
      if (a_ziel>a_bis-a_ab || b_ziel>b_bis-b_ab) throw new RangeError('Lichtziel übersteigt den Nutzungsblock.');
      const a = intersect(offen_ab,offen_bis,a_ab,a_bis);
      const z = intersect(offen_ab,offen_bis,b_ab,b_bis);
      return {a_offen_min:a,b_offen_min:z,a_fehlend_min:Math.max(0,a_ziel-a),b_fehlend_min:Math.max(0,b_ziel-z),
        hinweis:'Offene Minuten betreffen den Behang. Helligkeit und Wärmegewinn hängen unter anderem vom Wetter und Fenster ab.'};
    }, {offen_ab:540,offen_bis:720,a_ab:510,a_bis:600,a_ziel:60,b_ab:690,b_bis:750,b_ziel:45},
    {a_offen_min:60,b_offen_min:30,a_fehlend_min:0,b_fehlend_min:15}),

  task('thermovorhang_paarprobe_scheibe_feuchte',
    'Zwei vergleichbare Wintermorgen auf sichtbare Feuchte am Vorhangfenster prüfen — Compare observed window moisture with the curtain open and closed.',
    condensation, {
      vergleichbare_naechte:b('Außenlage, Innentemperatur, Lüftung und Nutzung vergleichbar?'),
      offen_scheibe_c:c('Gemessene Scheibentemperatur mit geöffnetem Vorhang.'),
      geschlossen_scheibe_c:c('Gemessene Scheibentemperatur mit geschlossenem Vorhang.'),
      offen_feucht:b('War das Fenster innen bei offenem Vorhang sichtbar feucht?'),
      geschlossen_feucht:b('War das Fenster innen bei geschlossenem Vorhang sichtbar feucht?')
    }, ({vergleichbare_naechte,offen_scheibe_c,geschlossen_scheibe_c,offen_feucht,geschlossen_feucht}) => ({
      geschlossen_minus_offen_c:vergleichbare_naechte?round(geschlossen_scheibe_c-offen_scheibe_c):null,
      befund:!vergleichbare_naechte?'probe_wiederholen':offen_feucht&&geschlossen_feucht?'feuchte_in_beiden':geschlossen_feucht?'feuchte_nur_geschlossen':offen_feucht?'feuchte_nur_offen':'keine_sichtbare_feuchte',
      hinweis:'Sichtbefunde und Raumfeuchte protokollieren. Wiederholte Feuchte oder Schäden zusätzlich auf Ursachen prüfen.'
    }), {vergleichbare_naechte:true,offen_scheibe_c:14,geschlossen_scheibe_c:11,offen_feucht:false,geschlossen_feucht:true},
    {geschlossen_minus_offen_c:-3,befund:'feuchte_nur_geschlossen'}),

  task('fensterbehang_sichtschutz_termin_zwischen_pflege',
    'Vorhangwäsche mit einem festen Sichtschutztermin und verfügbarem Ersatz abgleichen — Check if a laundry window leaves a scheduled privacy gap.',
    curtains, {
      abnehmen:m('Abnehmen des regulären Vorhangs, Minuten seit Mitternacht.'), wieder_da:m('Bestätigte früheste Rückkehr am selben Tag.'),
      privat_ab:m('Beginn des geplanten Sichtschutzbedarfs.'), privat_bis:m('Ende des geplanten Sichtschutzbedarfs.'),
      ersatz_ab:m('Ab wann ein passender Ersatz nutzbar ist.'), ersatz_bis:m('Bis wann der Ersatz nutzbar ist.'),
      ersatz_geprueft:b('Sichtschutz und erlaubte Montage des Ersatzes vor Ort bestätigt?')
    }, ({abnehmen,wieder_da,privat_ab,privat_bis,ersatz_ab,ersatz_bis,ersatz_geprueft}) => {
      intervals([abnehmen,wieder_da],[privat_ab,privat_bis],[ersatz_ab,ersatz_bis]);
      const betroffener_beginn = Math.max(abnehmen,privat_ab);
      const betroffenes_ende = Math.min(wieder_da,privat_bis);
      const luecke = Math.max(0,betroffenes_ende-betroffener_beginn);
      return {min_ohne_regulaeren_vorhang:luecke,
        min_ohne_bestaetigten_sichtschutz:luecke-(ersatz_geprueft?intersect(betroffener_beginn,betroffenes_ende,ersatz_ab,ersatz_bis):0),
        hinweis:'Den tatsächlichen Sichtschutz bei den späteren Lichtverhältnissen prüfen.'};
    }, {abnehmen:480,wieder_da:720,privat_ab:600,privat_bis:780,ersatz_ab:630,ersatz_bis:750,ersatz_geprueft:true},
    {min_ohne_regulaeren_vorhang:120,min_ohne_bestaetigten_sichtschutz:30}),

  task('verschattung_blendpause_zwei_fenster_arbeit',
    'Abdeckung gegen zwei beobachtete Blendfenster während einer festen Arbeitszeit planen — Compare observed glare and planned shade in a fixed work window.',
    workCool, {
      arbeit_ab:m('Arbeitsbeginn, Minuten seit Mitternacht.'), arbeit_bis:m('Arbeitsende am selben Tag.'),
      blend_a_ab:m('Beobachteter Blendbeginn Fenster A.'), blend_a_bis:m('Beobachtetes Ende Fenster A.'),
      blend_b_ab:m('Beobachteter Blendbeginn Fenster B.'), blend_b_bis:m('Beobachtetes Ende Fenster B.'),
      schutz_a_ab:m('Beginn wirksamer Verschattung an A.'), schutz_a_bis:m('Ende an A.'),
      schutz_b_ab:m('Beginn wirksamer Verschattung an B.'), schutz_b_bis:m('Ende an B.')
    }, ({arbeit_ab,arbeit_bis,blend_a_ab,blend_a_bis,blend_b_ab,blend_b_bis,schutz_a_ab,schutz_a_bis,schutz_b_ab,schutz_b_bis}) => {
      intervals([arbeit_ab,arbeit_bis],[blend_a_ab,blend_a_bis],[blend_b_ab,blend_b_bis],[schutz_a_ab,schutz_a_bis],[schutz_b_ab,schutz_b_bis]);
      const ungeschuetzt = (blend_ab,blend_bis,schutz_ab,schutz_bis) => {
        const anfang = Math.max(arbeit_ab,blend_ab);
        const ende = Math.min(arbeit_bis,blend_bis);
        return Math.max(0,ende-anfang) - intersect(anfang,ende,schutz_ab,schutz_bis);
      };
      return {blendzeit_a_min:ungeschuetzt(blend_a_ab,blend_a_bis,schutz_a_ab,schutz_a_bis),
        blendzeit_b_min:ungeschuetzt(blend_b_ab,blend_b_bis,schutz_b_ab,schutz_b_bis),
        hinweis:'Nur die geplante Überdeckung beobachteter Zeiten. Blendung am eigenen Arbeitsplatz und bei anderem Sonnenstand neu prüfen.'};
    }, {arbeit_ab:480,arbeit_bis:720,blend_a_ab:500,blend_a_bis:580,blend_b_ab:620,blend_b_bis:750,
      schutz_a_ab:510,schutz_a_bis:700,schutz_b_ab:650,schutz_b_bis:720},
    {blendzeit_a_min:10,blendzeit_b_min:30}),

  task('arbeitsplatz_ersatzraum_ruhe_waerme_vergleich',
    'Zwei gemessene Arbeitsplätze für ein Gespräch nach Wärme, erlebter Ruhe und Verfügbarkeit prüfen — Choose between two trial work spots for a specific call.',
    workWarm, {
      ziel_min_c:c('Selbst gewählte Mindesttemperatur für die Gesprächszeit.'),
      a_c:c('Gemessene Temperatur A.'), b_c:c('Gemessene Temperatur B.'),
      a_ruhig:b('War das erprobte Geräuschniveau für das Gespräch in A brauchbar?'), b_ruhig:b('Geräuschniveau in B brauchbar?'),
      a_frei:b('Ist A im geplanten Termin nutzbar?'), b_frei:b('Ist B im geplanten Termin nutzbar?')
    }, ({ziel_min_c,a_c,b_c,a_ruhig,b_ruhig,a_frei,b_frei}) => ({
      nutzbar:[a_c>=ziel_min_c && a_ruhig && a_frei?'a':null,b_c>=ziel_min_c && b_ruhig && b_frei?'b':null].filter(Boolean),
      hinweis:'Am tatsächlichen Arbeitsplatz und unter vergleichbaren Bedingungen prüfen. Das Wunschziel ist persönlich.'
    }), {ziel_min_c:19,a_c:21,b_c:19.5,a_ruhig:false,b_ruhig:true,a_frei:true,b_frei:true}, {nutzbar:['b']}),

  task('schlafraum_arbeitswechsel_abkuehlung_zeitgruende',
    'Nach Arbeit im selben Raum Lüftung, Rückkehrtemperatur und Schlafbeginn koordinieren — Schedule a measured cooldown before switching a home office to a bedroom.',
    sleep, {
      arbeitsende:m('Arbeitsende, Minuten seit Mitternacht.'), schlafbeginn:m('Geplanter Schlafbeginn am selben Tag.'),
      abkuehl_min:m('Gemessene Dauer bis zum selbst gewählten Ziel bei vergleichbarem Start.'),
      freie_vorbereitung_min:m('Zeit zum anschließenden Umräumen bei beendetem Lüften.'),
      lueften_passend:b('Sind Außenlage, sichere Fensterbedienung und Lüftungsmethode für diesen Versuch passend?')
    }, ({arbeitsende,schlafbeginn,abkuehl_min,freie_vorbereitung_min,lueften_passend}) => {
      intervals([arbeitsende,schlafbeginn]);
      const reserve = schlafbeginn-arbeitsende-abkuehl_min-freie_vorbereitung_min;
      return {reserve_min:lueften_passend?reserve:null,
        wechsel:!lueften_passend?'bedingungen_pruefen':reserve<0?'frueher_freigeben_oder_ausweichen':'abfolge_passt',
        hinweis:'Die erwartete Dauer beruht auf einem eigenen Versuch. Vor dem Schlafen erneut messen.'};
    }, {arbeitsende:1240,schlafbeginn:1310,abkuehl_min:55,freie_vorbereitung_min:20,lueften_passend:true},
    {reserve_min:-5,wechsel:'frueher_freigeben_oder_ausweichen'}),

  task('schlafplaetze_zuordnung_persoenliche_nachtziele',
    'Zwei getrennte Schlafplätze anhand persönlicher Temperaturziele und erprobtem Zugang zuordnen — Allocate two sleeping rooms to people with different measured needs.',
    sleep, {
      person_1_max_c:c('Eigenes Temperaturziel von Person 1.'),
      person_2_max_c:c('Eigenes Temperaturziel von Person 2.'),
      a_c:c('Gemessene Temperatur in A zum Schlafbeginn.'), b_c:c('Gemessene Temperatur in B zum Schlafbeginn.'),
      person_1_a_geprueft:b('Sind Zugang und Ruhe für Person 1 in A vor Ort passend?'),
      person_1_b_geprueft:b('Sind Zugang und Ruhe für Person 1 in B vor Ort passend?'),
      person_2_a_geprueft:b('Sind Zugang und Ruhe für Person 2 in A vor Ort passend?'),
      person_2_b_geprueft:b('Sind Zugang und Ruhe für Person 2 in B vor Ort passend?')
    }, ({person_1_max_c,person_2_max_c,a_c,b_c,person_1_a_geprueft,person_1_b_geprueft,person_2_a_geprueft,person_2_b_geprueft}) => {
      const ab=person_1_a_geprueft && a_c<=person_1_max_c && person_2_b_geprueft && b_c<=person_2_max_c;
      const ba=person_1_b_geprueft && b_c<=person_1_max_c && person_2_a_geprueft && a_c<=person_2_max_c;
      return {moegliche_zuordnungen:[ab?['a','b']:null,ba?['b','a']:null].filter(Boolean),
        hinweis:'Einträge stehen in Personenreihenfolge. Temperatur gilt zum gemessenen Zeitpunkt, Veränderungen während der Nacht separat prüfen.'};
    }, {person_1_max_c:24,person_2_max_c:26,a_c:25,b_c:23,person_1_a_geprueft:true,person_1_b_geprueft:true,
      person_2_a_geprueft:true,person_2_b_geprueft:true}, {moegliche_zuordnungen:[['b','a']]}),

  task('gaesteraum_morgenlicht_fruehe_nutzung',
    'Schlafenden Gast und morgendlichen Lichtbedarf bei nur einem Sichtschutz zeitlich abstimmen — Coordinate a guest’s dark window with the room’s next morning use.',
    curtains, {
      dunkel_bis:m('Abgesprochenes Ende der Verdunkelung am Morgen.'),
      licht_ab:m('Frühester gewünschter Beginn der Tageslicht-Nutzung.'),
      rueckbau_min:m('Vor Ort beobachtete Zeit zum geräuscharmen Abnehmen und Verstauen.'),
      leise_alternative_bestaetigt:b('Ist eine separat beleuchtete Ausweichfläche für den Morgen tatsächlich nutzbar?')
    }, ({dunkel_bis,licht_ab,rueckbau_min,leise_alternative_bestaetigt}) => {
      const verspaetung = Math.max(0,dunkel_bis+rueckbau_min-licht_ab);
      return {tageslicht_verzoegert_min:verspaetung,
        morgens:verspaetung===0?'abfolge_passt':leise_alternative_bestaetigt?'ausweichflaeche_bis_rueckbau':'termin_mit_gast_abstimmen',
        hinweis:'Nur die abgestimmte Reihenfolge berechnen. Standort und Vorhangbedienung vorab erproben.'};
    }, {dunkel_bis:480,licht_ab:475,rueckbau_min:12,leise_alternative_bestaetigt:true},
    {tageslicht_verzoegert_min:17,morgens:'ausweichflaeche_bis_rueckbau'}),

  task('arbeitsplatz_raumwechsel_persoenliche_hitzepause',
    'Bei einem bestätigten Hitzefenster prüfen, ob ein vorübergehender Raumwechsel genug ungestörte Arbeitszeit lässt — Check productive time left after a temporary heat-driven desk move.',
    workCool, {
      hitze_ab:m('Beginn der aus eigener Beobachtung geplanten Ausweichzeit.'),
      hitze_bis:m('Ende der geplanten Ausweichzeit am selben Tag.'),
      hinweg_und_aufbau:m('Gemessene Minuten für Hinweg und nutzbaren Aufbau.'),
      rueckweg_und_abbau:m('Gemessene Minuten für Abbau und Rückweg.'),
      arbeitsblock_min:n('Gewünschte zusammenhängende Arbeitszeit in Minuten.',1,1440),
      ausweichraum_erprobt:b('Ist die verfügbare Ausweichfläche für diese Aufgabe bei vergleichbaren Bedingungen erprobt?')
    }, ({hitze_ab,hitze_bis,hinweg_und_aufbau,rueckweg_und_abbau,arbeitsblock_min,ausweichraum_erprobt}) => {
      intervals([hitze_ab,hitze_bis]);
      const verbleibend=Math.max(0,hitze_bis-hitze_ab-hinweg_und_aufbau-rueckweg_und_abbau);
      return {netto_arbeitsminuten:ausweichraum_erprobt?verbleibend:null,
        zusammenhaengend_moeglich:ausweichraum_erprobt && verbleibend>=arbeitsblock_min,
        hinweis:'Nur beobachtete Zeiten übertragen. Änderungen bei Wärme, Belegung oder Technik neu prüfen.'};
    }, {hitze_ab:750,hitze_bis:870,hinweg_und_aufbau:15,rueckweg_und_abbau:10,arbeitsblock_min:100,ausweichraum_erprobt:true},
    {netto_arbeitsminuten:95,zusammenhaengend_moeglich:false}),

  task('wohnmessung_feste_referenz_zwei_rotationsorte',
    'Mit einem festen Referenzgerät und einem umgesetzten Gerät zwei Raumvergleiche zeitlich absichern — Check simultaneous coverage for a fixed logger and two rotating rooms.',
    humidity, {
      ref_ab:m('Start der durchgängigen Referenzreihe.'), ref_bis:m('Ende der Referenzreihe.'),
      a_ab:m('Beginn des auswertbaren Messabschnitts A nach Eingewöhnung.'), a_bis:m('Ende A.'),
      b_ab:m('Beginn des auswertbaren Messabschnitts B nach Eingewöhnung.'), b_bis:m('Ende B.'),
      min_paar_min:n('Verlangte Dauer paariger Messung je Raum in Minuten.',1,1440)
    }, ({ref_ab,ref_bis,a_ab,a_bis,b_ab,b_bis,min_paar_min}) => {
      intervals([ref_ab,ref_bis],[a_ab,a_bis],[b_ab,b_bis]);
      if (intersect(a_ab,a_bis,b_ab,b_bis)>0) throw new RangeError('Ein einzelnes rotierendes Messgerät kann nicht gleichzeitig in beiden Räumen sein.');
      const a = intersect(ref_ab,ref_bis,a_ab,a_bis);
      const z = intersect(ref_ab,ref_bis,b_ab,b_bis);
      return {paarzeit_a_min:a,paarzeit_b_min:z,vergleich_bereit:[a>=min_paar_min?'a':null,z>=min_paar_min?'b':null].filter(Boolean),
        hinweis:'Überdeckung ist eine notwendige Bedingung. Zeitstempel, Sensorabweichung und Raumbetrieb zusätzlich prüfen.'};
    }, {ref_ab:480,ref_bis:720,a_ab:450,a_bis:550,b_ab:680,b_bis:800,min_paar_min:60},
    {paarzeit_a_min:70,paarzeit_b_min:40,vergleich_bereit:['a']}),

  task('wohnmessung_logger_uhrdrift_gemeinsamer_stichtag',
    'Zwei Messuhren aus gemeinsam protokollierten Zeitmarken für einen Vergleich prüfen — Check whether timestamp drift permits matching two room recordings.',
    humidity, {
      abstand_start_s:n('Uhr von Gerät B minus Uhr A zum gemeinsamen Start in Sekunden.',-3600,3600),
      abstand_ende_s:n('Uhr von Gerät B minus Uhr A zum gemeinsamen Ende in Sekunden.',-3600,3600),
      max_abstand_s:n('Eigene maximal zulässige Abweichung für diesen Vergleich in Sekunden.',0,3600),
      beide_marken_geprueft:b('Waren Start und Ende jeweils dasselbe Ereignis auf beiden Geräten?')
    }, ({abstand_start_s,abstand_ende_s,max_abstand_s,beide_marken_geprueft}) => ({
      beobachtete_uhrdrift_s:beide_marken_geprueft?round(abstand_ende_s-abstand_start_s):null,
      direkt_paarbar:beide_marken_geprueft?Math.max(Math.abs(abstand_start_s),Math.abs(abstand_ende_s))<=max_abstand_s:null,
      hinweis:'Nur zwei Zeitmarken sind geprüft. Bei Sprüngen, Zeitumstellung oder späterem Abgleich weitere Marken verwenden.'
    }), {abstand_start_s:10,abstand_ende_s:38,max_abstand_s:30,beide_marken_geprueft:true},
    {beobachtete_uhrdrift_s:28,direkt_paarbar:false}),

  task('wohnfeuchte_zwei_raeume_gemeinsame_ereignisse',
    'Aus synchronen Messpaaren gemeinsame und einzelne Feuchtespitzen zählen — Separate simultaneous humidity exceedances from room-only events.',
    humidity, {
      paare:n('Zahl synchroner Paare aus vergleichbaren Aufzeichnungsabschnitten.',1,10000),
      a_oben:n('Messpaare mit Überschreitung des eigenen Beobachtungswerts in A.',0,10000),
      b_oben:n('Messpaare mit Überschreitung in B.',0,10000),
      zugleich:n('Messpaare mit Überschreitung in beiden Zimmern.',0,10000),
      gleiches_ziel_und_messabstand:b('Gleiches Beobachtungsziel, gleicher Messabstand und passende Zeitstempel?')
    }, ({paare,a_oben,b_oben,zugleich,gleiches_ziel_und_messabstand}) => {
      if (![paare,a_oben,b_oben,zugleich].every(Number.isInteger) || zugleich>Math.min(a_oben,b_oben) || a_oben+b_oben-zugleich>paare) {
        throw new RangeError('Die gezählten Ereignisse passen nicht zu den Messpaaren.');
      }
      return {nur_a:gleiches_ziel_und_messabstand?a_oben-zugleich:null,nur_b:gleiches_ziel_und_messabstand?b_oben-zugleich:null,
        beide_anteil_prozent:gleiches_ziel_und_messabstand?round(100*zugleich/paare):null,
        hinweis:'Gleichzeitige Messspitzen können mehrere Ursachen haben. Zeitpunkte mit eigenen Raumereignissen vergleichen.'};
    }, {paare:40,a_oben:18,b_oben:12,zugleich:10,gleiches_ziel_und_messabstand:true},
    {nur_a:8,nur_b:2,beide_anteil_prozent:25}),

  task('wohnmessung_sonnenfleck_zeitmaske_ortsvergleich',
    'Direkte Sonne an zwei Messorten aus einem gemeinsamen Messblock herausrechnen — Mask both sensors’ direct-sun windows before comparing rooms.',
    summer, {
      mess_ab:m('Beginn des kontinuierlichen gemeinsamen Messblocks.'), mess_bis:m('Ende des Blocks.'),
      sonne_a_ab:m('Beginn der beobachteten direkten Sonne am Gerät A.'), sonne_a_bis:m('Ende am Gerät A.'),
      sonne_b_ab:m('Beginn der beobachteten direkten Sonne am Gerät B.'), sonne_b_bis:m('Ende am Gerät B.'),
      abklingen:m('Selbst gewählter zusätzlicher Ausschluss je Gerät nach Ende der Einstrahlung.')
    }, ({mess_ab,mess_bis,sonne_a_ab,sonne_a_bis,sonne_b_ab,sonne_b_bis,abklingen}) => {
      intervals([mess_ab,mess_bis],[sonne_a_ab,sonne_a_bis],[sonne_b_ab,sonne_b_bis]);
      const ende_a = sonne_a_ab===sonne_a_bis?sonne_a_bis:sonne_a_bis+abklingen;
      const ende_b = sonne_b_ab===sonne_b_bis?sonne_b_bis:sonne_b_bis+abklingen;
      const beide = Math.max(0,Math.min(mess_bis,ende_a,ende_b)-Math.max(mess_ab,sonne_a_ab,sonne_b_ab));
      const ausgeschlossen = intersect(mess_ab,mess_bis,sonne_a_ab,ende_a)+intersect(mess_ab,mess_bis,sonne_b_ab,ende_b)-beide;
      return {ausgeschlossen_min:ausgeschlossen,gemeinsamer_rest_min:mess_bis-mess_ab-ausgeschlossen,
        hinweis:'Weitere Messfehler wie Heizkörpernähe, Zugluft und instabile Geräte separat erfassen.'};
    }, {mess_ab:540,mess_bis:660,sonne_a_ab:570,sonne_a_bis:600,sonne_b_ab:595,sonne_b_bis:625,abklingen:10},
    {ausgeschlossen_min:65,gemeinsamer_rest_min:55}),

  task('wohnmessung_nachprobe_raeume_ereignisfenster',
    'Zwei zeitlich begrenzte Nachmessungen mit nur einem verfügbaren Gerät priorisieren — Select a feasible order for two timed room follow-ups with one meter.',
    radiator, {
      start:m('Frühester Start mit dem verfügbaren Messgerät.'),
      a_spaetestens:m('Letzte Minute für das Ende der Nachmessung A.'), a_dauer:m('Benötigte Dauer der Nachmessung A.'),
      b_spaetestens:m('Letzte Minute für Ende B.'), b_dauer:m('Benötigte Dauer in B.'),
      wechsel:m('Wegzeit und Eingewöhnung vor der zweiten Nachmessung.')
    }, ({start,a_spaetestens,a_dauer,b_spaetestens,b_dauer,wechsel}) => {
      const ab = start+a_dauer<=a_spaetestens && start+a_dauer+wechsel+b_dauer<=b_spaetestens;
      const ba = start+b_dauer<=b_spaetestens && start+b_dauer+wechsel+a_dauer<=a_spaetestens;
      return {moegliche_folgen:[ab?'a_dann_b':null,ba?'b_dann_a':null].filter(Boolean),
        hinweis:'Nur Ereignisse mit gleicher Startverfügbarkeit sind abgedeckt. Andere Randbedingungen vor der Nachmessung klären.'};
    }, {start:600,a_spaetestens:625,a_dauer:20,b_spaetestens:650,b_dauer:20,wechsel:5}, {moegliche_folgen:['a_dann_b']}),

  task('entfeuchter_zwei_raeume_tank_zwischenstopp',
    'Zwei beobachtete Entfeuchterläufe gegen den verfügbaren Tank und einen Entleerungstermin prüfen — Check reservoir headroom across two measured room sessions.',
    humidity, {
      nutzbare_l:n('Bekannte nutzbare Tankmenge dieses Geräts in Litern.',0.1,50),
      anfang_l:n('Bereits im Tank befindliche Wassermenge in Litern.',0,50),
      a_erwartet_l:n('In Raum A bei vergleichbarem Versuch gesammelte Liter.',0,50),
      b_erwartet_l:n('In Raum B bei vergleichbarem Versuch gesammelte Liter.',0,50),
      entleerung_dazwischen:b('Ist die vollständige Entleerung zwischen den beiden Läufen bestätigt?')
    }, ({nutzbare_l,anfang_l,a_erwartet_l,b_erwartet_l,entleerung_dazwischen}) => {
      if (anfang_l>nutzbare_l) throw new RangeError('Aktueller Füllstand übersteigt die angegebene Kapazität.');
      const nach_a = anfang_l+a_erwartet_l;
      const nach_z = (entleerung_dazwischen?0:nach_a)+b_erwartet_l;
      return {reserve_a_l:round(nutzbare_l-nach_a),reserve_b_l:round(nutzbare_l-nach_z),
        tankplan_pruefen:nach_a>=nutzbare_l || nach_z>=nutzbare_l,
        hinweis:'Rechnet mit eigenen Behältermessungen. Abweichende Feuchte und die Modellabschaltung separat beachten.'};
    }, {nutzbare_l:3,anfang_l:0.3,a_erwartet_l:1.4,b_erwartet_l:1.7,entleerung_dazwischen:false},
    {reserve_a_l:1.3,reserve_b_l:-0.4,tankplan_pruefen:true}),

  task('ventilator_leihe_raeume_ruheziel_vorrang',
    'Einen erprobten leisen Ventilator zwischen zwei zeitgleichen Nutzungen abstimmen — Resolve competing room slots for one trialled fan.',
    cooling, {
      a_ab:m('Bedarf ab Minute in Zimmer A.'), a_bis:m('Bedarf bis Minute in A.'),
      b_ab:m('Bedarf ab Minute in Zimmer B.'), b_bis:m('Bedarf bis Minute in B.'),
      a_stufe_passt:b('Lautstärke und Luftstrom waren bei derselben erprobten Stufe in A passend?'),
      b_stufe_passt:b('Lautstärke und Luftstrom waren bei derselben erprobten Stufe in B passend?'),
      vorrang:choice('Abgesprochener Vorrang beim Überschneiden.','a','b','offen')
    }, ({a_ab,a_bis,b_ab,b_bis,a_stufe_passt,b_stufe_passt,vorrang}) => {
      intervals([a_ab,a_bis],[b_ab,b_bis]);
      const gemeinsam = a_stufe_passt && b_stufe_passt?intersect(a_ab,a_bis,b_ab,b_bis):0;
      return {zeitkonflikt_min:gemeinsam,ungedeckt_a_min:gemeinsam>0 && vorrang==='offen'?null:a_stufe_passt?(vorrang==='b'?gemeinsam:0):a_bis-a_ab,
        ungedeckt_b_min:gemeinsam>0 && vorrang==='offen'?null:b_stufe_passt?(vorrang==='a'?gemeinsam:0):b_bis-b_ab,
        vorrang_abstimmen:gemeinsam>0 && vorrang==='offen',
        hinweis:'Minuten ohne bestätigte Zuteilung erscheinen als Zeitkonflikt. Umstellen und örtliche Erprobung separat einplanen.'};
    }, {a_ab:780,a_bis:850,b_ab:820,b_bis:900,a_stufe_passt:true,b_stufe_passt:true,vorrang:'b'},
    {zeitkonflikt_min:30,ungedeckt_a_min:30,ungedeckt_b_min:0,vorrang_abstimmen:false}),

  task('wohnklima_geraetewechsel_rueckgabefrist_testfenster',
    'Vor einem bereits bekannten Abgabetermin zwei eigene Raumproben und Rückbau unterbringen — Fit two tests and pack-up before a known hand-back time.',
    cooling, {
      jetzt:m('Zeitpunkt, ab dem das geliehene Gerät verfügbar ist.'),
      rueckgabe:m('Verbindlicher Übergabezeitpunkt am selben Tag.'),
      a_min:m('Dauer der vereinbarten Probe in A.'), b_min:m('Dauer der vereinbarten Probe in B.'),
      wechsel_min:m('Beobachtete Zeit für Umstellen und zugelassenen Aufbau.'),
      rueckbau_min:m('Zeit für Abbau, Rücktransport und Verpackung laut eigener Planung.'),
      aufbauten_geprueft:b('Beide Aufbauten und der zulässige Transport am genauen Gerät geprüft?')
    }, ({jetzt,rueckgabe,a_min,b_min,wechsel_min,rueckbau_min,aufbauten_geprueft}) => {
      intervals([jetzt,rueckgabe]);
      const reserve = rueckgabe-jetzt-a_min-b_min-wechsel_min-rueckbau_min;
      return {reserve_min:aufbauten_geprueft?reserve:null,beide_proben_planbar:aufbauten_geprueft && reserve>=0,
        hinweis:'Der Abgabetermin ist eine Eingabe. Vorgeschriebene Warte- und Transportzeiten vollständig einrechnen.'};
    }, {jetzt:540,rueckgabe:780,a_min:80,b_min:80,wechsel_min:30,rueckbau_min:60,aufbauten_geprueft:true},
    {reserve_min:-10,beide_proben_planbar:false}),

  task('infrarotheizung_leihe_vor_ankauf_nachprobe',
    'Befunde einer Arbeitsplatzprobe auf zwei andere Sitzsituationen nur bei passenden Randbedingungen übertragen — Flag when seat trials cannot transfer to other use cases.',
    heatingDevice, {
      a_erprobt:b('War die Wärme am Referenz-Sitzplatz bei der tatsächlichen Anwendung passend?'),
      b_distanc_und_sicht:b('Stimmen Abstand, freie Sicht und Ausrichtung an B mit der Probe überein?'),
      c_distanc_und_sicht:b('Stimmen Abstand, freie Sicht und Ausrichtung an C überein?'),
      b_nutzung_vergleichbar:b('Sind Aufenthaltsdauer, Kleidung und Ausgangslage B vergleichbar?'),
      c_nutzung_vergleichbar:b('Sind Aufenthaltsdauer, Kleidung und Ausgangslage C vergleichbar?'),
      geraet_stellung_freigegeben:b('Passen dokumentierte Gerätevorgaben bei allen betrachteten Stellorten?')
    }, ({a_erprobt,b_distanc_und_sicht,c_distanc_und_sicht,b_nutzung_vergleichbar,c_nutzung_vergleichbar,geraet_stellung_freigegeben}) => ({
      neue_proben:[!a_erprobt||!geraet_stellung_freigegeben||!b_distanc_und_sicht||!b_nutzung_vergleichbar?'b':null,
        !a_erprobt||!geraet_stellung_freigegeben||!c_distanc_und_sicht||!c_nutzung_vergleichbar?'c':null].filter(Boolean),
      aufstellung_zuerst_klaeren:!geraet_stellung_freigegeben,
      hinweis:'Nur übertragbare Komfortbedingungen prüfen. Montage, Freiräume und zulässigen Betrieb laut Anleitung klären.'
    }), {a_erprobt:true,b_distanc_und_sicht:false,c_distanc_und_sicht:true,b_nutzung_vergleichbar:true,c_nutzung_vergleichbar:true,geraet_stellung_freigegeben:true},
    {neue_proben:['b'],aufstellung_zuerst_klaeren:false}),

  task('klimaanlage_wechselort_fensterkit_rueckbau',
    'Ein mobiles Klimagerät für zwei vorbereitete Fensterorte auf verbleibende Umrüstteile prüfen — Find missing reusable fittings before moving an existing portable AC.',
    guide('fensterabdichtung-klimaanlage'), {
      a_vollstaendig:b('Sind Abführung und zugelassene Fensterlösung am ersten Ort vollständig erprobt?'),
      b_vollstaendig:b('Sind beide Teile auch am zweiten Ort vollständig erprobt?'),
      adapter_wechselbar:b('Kann genau der vorhandene Adapter dokumentiert an beiden Orten verwendet werden?'),
      abdichtung_wechselbar:b('Passt dieselbe vorhandene Abdichtung nach Prüfung an beide Fenster?'),
      a_muss_nutzbar_bleiben:b('Soll der erste Ort auch während des zweiten Einsatzes vollständig vorbereitet bleiben?')
    }, ({a_vollstaendig,b_vollstaendig,adapter_wechselbar,abdichtung_wechselbar,a_muss_nutzbar_bleiben}) => ({
      fehlende_pruefung:[!a_vollstaendig?'a':null,!b_vollstaendig?'b':null].filter(Boolean),
      umzugsteile:[adapter_wechselbar?'adapter':null,abdichtung_wechselbar?'abdichtung':null].filter(Boolean),
      reserveroute_pruefen:a_muss_nutzbar_bleiben && (adapter_wechselbar || abdichtung_wechselbar),
      hinweis:'Wiederverwendbare Teile sind bestätigte Eingaben. Eignung und erlaubte Befestigung für das genaue Fenster prüfen.'
    }), {a_vollstaendig:true,b_vollstaendig:false,adapter_wechselbar:true,abdichtung_wechselbar:false,a_muss_nutzbar_bleiben:true},
    {fehlende_pruefung:['b'],umzugsteile:['adapter'],reserveroute_pruefen:true}),

  task('fensterschutz_saisonwechsel_freigabe_zwei_raeume',
    'Zwei Räume beim Wechsel von abnehmbarem Fensterschutz nach Aufbewahrung und Fensterbedienung sortieren — Prepare a reversible shade change only where storage and operation are ready.',
    shade, {
      a_fenster_bedienbar:b('Ist der übliche Fensterweg mit dem geplanten Behang im ersten Raum bestätigt?'),
      b_fenster_bedienbar:b('Fensterweg im zweiten Raum bestätigt?'),
      a_altschutz_untergebracht:b('Kann der entfernte Zustand des ersten Raums trocken und zugeordnet untergebracht werden?'),
      b_altschutz_untergebracht:b('Ist die Aufbewahrung für den zweiten Raum vorbereitet?'),
      beides_rueckbaubar:b('Wurde der geplante Rückbau für diese konkrete Miet- oder Wohnsituation geklärt?')
    }, ({a_fenster_bedienbar,b_fenster_bedienbar,a_altschutz_untergebracht,b_altschutz_untergebracht,beides_rueckbaubar}) => ({
      vorbereitbar:beides_rueckbaubar?[a_fenster_bedienbar&&a_altschutz_untergebracht?'a':null,
        b_fenster_bedienbar&&b_altschutz_untergebracht?'b':null].filter(Boolean):[],
      prioritaet:beides_rueckbaubar?'bedienung_und_lagerung_pruefen':'rueckbau_zuerst_klaeren',
      hinweis:'Rückbaubarkeit und Fensterbedienung sind vor Ort zu prüfen. Die Aufgabe bewertet keine bauliche Freigabe.'
    }), {a_fenster_bedienbar:true,b_fenster_bedienbar:true,a_altschutz_untergebracht:false,b_altschutz_untergebracht:true,beides_rueckbaubar:true},
    {vorbereitbar:['b'],prioritaet:'bedienung_und_lagerung_pruefen'}),
];
