const guide = slug => `/guide/${slug}.html`;
const n = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const yes = description => ({type:'boolean', description});
const pick = (description, ...values) => ({type:'string', description, enum:values});
const temp = description => n(description, -45, 85);
const mins = description => n(description, 0, 10080);
const rh = description => n(description, 0, 100);
const ppm = description => n(description, 0, 20000);
const whole = description => n(description, 0, 10000);
const small = description => n(description, 0, 40);
const round = x => Math.round(x * 100) / 100 + 0;
const rate = (first, next, duration) => (next - first) * 60 / duration;

function positiveDuration(...values) {
  if (values.some(value => value <= 0)) throw new RangeError('Positive Dauer für jedes Messfenster eintragen.');
}
function count(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Zahl der Beobachtungen muss ganzzahlig sein.');
}
function entry(name, description, slug, properties, calculate, args, expect) {
  return {name, description, page:guide(slug), properties, calculate, example:{args, expect}};
}

export const klimaverlauf = [
  entry('sommerlueftung_abkuehlrate_nach_fensterschluss',
    'Prüfe, wie sich der Temperaturtrend zwischen Öffnung und dokumentiertem Schließen verändert — Compare cooling rates before and after closing a window',
    'richtig-lueften-bei-hitze', {
      vorher_c:temp('Raumwert direkt vor dem Öffnen'),
      schluss_c:temp('Raumwert am selben Punkt zum Schließen'),
      danach_c:temp('Raumwert zur späteren Ablesung im geschlossenen Raum'),
      fenster_offen_min:mins('Gemessene Öffnungsdauer'),
      danach_min:mins('Minuten vom Schließen bis zur späteren Ablesung'),
      gleiche_randbedingungen:yes('Messpunkt unverändert; äußere Bedingungen und andere Wärmequellen ähnlich')
    }, ({vorher_c,schluss_c,danach_c,fenster_offen_min,danach_min,gleiche_randbedingungen}) => {
      positiveDuration(fenster_offen_min, danach_min);
      const offen = rate(vorher_c, schluss_c, fenster_offen_min);
      const zu = rate(schluss_c, danach_c, danach_min);
      return {trend_offen_c_h:round(offen), trend_geschlossen_c_h:round(zu),
        wechsel_zu_erwaermung:gleiche_randbedingungen ? offen < 0 && zu > 0 : null,
        grenze:'Mittlere Trends in beobachteten Fenstern. Kein Beleg, dass das Öffnen allein den Unterschied verursacht hat.'};
    }, {vorher_c:28,schluss_c:27,danach_c:27.4,fenster_offen_min:15,danach_min:30,gleiche_randbedingungen:true},
    {trend_offen_c_h:-4,trend_geschlossen_c_h:0.8,wechsel_zu_erwaermung:true}),

  entry('dachraum_hitzetrend_erstes_ziel_nach_trendknick',
    'Erkenne, ob eine Zieltemperatur erstmals vor oder nach dem beobachteten Trendknick lag — Identify in which observed trend segment the temperature target first appeared',
    'dachgeschoss-kuehlen', {
      start_c:temp('Erster Wert am vereinbarten Messort'),
      knick_c:temp('Wert an dem zuvor dokumentierten Wechselpunkt'),
      ende_c:temp('Wert der späteren Ablesung'),
      ziel_c:temp('Eigener oberer Zielwert'),
      gleiche_stelle:yes('Alle Werte stammen vom gleichen repräsentativen Raumpunkt')
    }, ({start_c,knick_c,ende_c,ziel_c,gleiche_stelle}) => {
      let stichprobe = 'kein_zielwert_beobachtet';
      if (!gleiche_stelle) stichprobe = 'messort_offen';
      else if (start_c <= ziel_c) stichprobe = 'bereits_beim_start';
      else if (knick_c <= ziel_c) stichprobe = 'bei_wechselpunkt';
      else if (ende_c <= ziel_c) stichprobe = 'erst_nach_wechselpunkt';
      return {erste_passende_ablesung:stichprobe, grenze:'Es zählt die erste passende Stichprobe. Ein früherer, nicht erfasster Durchgang ist möglich.'};
    }, {start_c:30,knick_c:28,ende_c:26,ziel_c:27,gleiche_stelle:true},
    {erste_passende_ablesung:'erst_nach_wechselpunkt'}),

  entry('raumtemperatur_dreipunkt_abflachung_folgemessung',
    'Wähle zwischen weiterer Beobachtung und unverändertem Messabstand nach einer abgeflachten Temperaturrate — Check whether the latest cooling segment flattened beyond a chosen tolerance',
    'homeoffice-buero-kuehlen', {
      a_c:temp('Temperatur am ersten Messpunkt'),
      b_c:temp('Temperatur am mittleren Messpunkt'),
      c_c:temp('Temperatur am letzten Messpunkt'),
      ab_min:mins('Dauer des ersten Abschnitts'),
      bc_min:mins('Dauer des zweiten Abschnitts'),
      mindestdifferenz_c_h:small('Selbst gewählte Mindestdifferenz der mittleren Raten'),
      gleicher_aufbau:yes('Beschattung, Gerätebetrieb und Messstelle in beiden Abschnitten unverändert')
    }, ({a_c,b_c,c_c,ab_min,bc_min,mindestdifferenz_c_h,gleicher_aufbau}) => {
      positiveDuration(ab_min, bc_min);
      const frueh = rate(a_c,b_c,ab_min);
      const spaet = rate(b_c,c_c,bc_min);
      return {rate_spaet_minus_frueh_c_h:round(spaet-frueh),
        abflachung_im_selben_aufbau:gleicher_aufbau ? frueh < 0 && spaet <= 0 && spaet-frueh > mindestdifferenz_c_h : null,
        grenze:'Knick ist eine Beobachtung. Ohne fortlaufende Messung keine Information über späteres Gleichgewicht.'};
    }, {a_c:30,b_c:29,c_c:28.8,ab_min:15,bc_min:30,mindestdifferenz_c_h:1,gleicher_aufbau:true},
    {rate_spaet_minus_frueh_c_h:3.6,abflachung_im_selben_aufbau:true}),

  entry('zimmerkuehlung_zwei_messpunkte_bestaetigt_unter_ziel',
    'Unterscheide einen einzelnen kühlen Messpunkt von zwei passenden Lesungen mit ausreichendem Abstand — Distinguish a one-off reading from two spaced readings below the target',
    'bei-hitze-schlafen', {
      frueh_c:temp('Frühere Ablesung vor geplanter Nutzung'),
      spaet_c:temp('Spätere Ablesung'),
      ziel_c:temp('Selbst gesetzte Temperaturgrenze'),
      abstand_min:mins('Minuten zwischen den beiden Ablesungen'),
      mindestabstand_min:mins('Selbst festgelegter kleinster Abstand für die Nachprobe'),
      gleicher_nutzplatz:yes('Beide Werte beziehen sich auf denselben repräsentativen Nutzplatz')
    }, ({frueh_c,spaet_c,ziel_c,abstand_min,mindestabstand_min,gleicher_nutzplatz}) => ({
      beide_ablesungen_unter_ziel:frueh_c<ziel_c && spaet_c<ziel_c,
      nachprobe_bestaetigt:gleicher_nutzplatz && abstand_min > 0 && abstand_min >= mindestabstand_min && Math.max(frueh_c,spaet_c)<ziel_c,
      grenze:'Zwei Stichproben ohne Aussage über die Minuten dazwischen oder danach.'
    }), {frueh_c:24.6,spaet_c:24.8,ziel_c:25,abstand_min:30,mindestabstand_min:45,gleicher_nutzplatz:true},
    {beide_ablesungen_unter_ziel:true,nachprobe_bestaetigt:false}),

  entry('raumluft_messpause_schwellendauer_grenzen',
    'Grenze einen durch eine Messpause unterbrochenen warmen Abschnitt ohne Interpolation ein — Bound warm time without filling an interruption in the log',
    'bei-hitze-schlafen', {
      alle_min:mins('Dauer des betrachteten Protokollfensters'),
      belegt_zu_warm_min:mins('Protokollierte Minuten über dem eigenen Vergleichswert aus durchgehend erfassten Abschnitten'),
      messluecke_min:mins('Minuten ohne verwertbare Messung'),
      rest_kuehler_bestaetigt:yes('Übrige Minuten sind laut eigener Protokollregel als höchstens am Vergleichswert belegt')
    }, ({alle_min,belegt_zu_warm_min,messluecke_min,rest_kuehler_bestaetigt}) => {
      if (belegt_zu_warm_min + messluecke_min > alle_min + 1e-8) throw new RangeError('Zeitanteile getrennt zählen.');
      return {warme_minuten_spannweite:[belegt_zu_warm_min,rest_kuehler_bestaetigt ? round(belegt_zu_warm_min+messluecke_min) : alle_min],
        grenze:'Die Lücke bleibt unbekannt. Der Vergleichswert ist ein individuelles Messziel.'};
    }, {alle_min:180,belegt_zu_warm_min:80,messluecke_min:22,rest_kuehler_bestaetigt:true},
    {warme_minuten_spannweite:[80,102]}),

  entry('sonnenschutz_scheibe_und_platz_reagieren_getrennt',
    'Trenne bei einer Beschattungsprobe die Reaktion der Scheibe von der Reaktion der Raumluft am Nutzplatz — Separate glass and occupied-zone response after shading',
    'hitzeschutz-fenster', {
      scheibe_vor_c:temp('Vorher am selben Scheibenpunkt bestimmt'),
      scheibe_nach_c:temp('Nachher am gleichen Scheibenpunkt'),
      platz_vor_c:temp('Gleichzeitiger Luftwert vor Beschattung am Nutzplatz'),
      platz_nach_c:temp('Gleichzeitiger Luftwert nach Beschattung am Nutzplatz'),
      luftmess_toleranz_c:small('Toleranz für eine Änderung des Raumluftwerts'),
      messpaare_passend:yes('Zeitpaare und Umgebung dokumentiert, kein Wechsel von Sensorort oder Messart')
    }, ({scheibe_vor_c,scheibe_nach_c,platz_vor_c,platz_nach_c,luftmess_toleranz_c,messpaare_passend}) => {
      const glas=scheibe_nach_c-scheibe_vor_c;
      const luft=platz_nach_c-platz_vor_c;
      return {scheibe_delta_c:round(glas), platz_delta_c:round(luft),
        nur_scheibe_kuehler_beobachtet:messpaare_passend ? glas < 0 && Math.abs(luft)<=luftmess_toleranz_c+1e-9 : null,
        grenze:'Die Messung an Glas ist von der Messart abhängig. Keine Raumtemperatur aus der Scheibenänderung ableiten.'};
    }, {scheibe_vor_c:37,scheibe_nach_c:32,platz_vor_c:27.1,platz_nach_c:27,luftmess_toleranz_c:0.2,messpaare_passend:true},
    {scheibe_delta_c:-5,platz_delta_c:-0.1,nur_scheibe_kuehler_beobachtet:true}),

  entry('feuchtequelle_abfolge_vor_lueftungsprobe',
    'Bestimme, ob eine Feuchtemessung den Fensterwechsel von einer vorherigen Feuchtequelle zeitlich trennt — Check whether a ventilation observation excludes the preceding moisture event',
    'luftfeuchtigkeit-richtig-messen', {
      quelle_ende_min:mins('Dokumentiertes Ende der Feuchtequelle'),
      fenster_auf_min:mins('Zeitpunkt des Öffnens in derselben Zeitskala'),
      vergleich_alt_min:mins('Zeitpunkt der als Ausgangspunkt geplanten Innenablesung'),
      ausgleich_min:mins('Eigenes vorab gewähltes Mindestintervall nach Ende der Quelle')
    }, ({quelle_ende_min,fenster_auf_min,vergleich_alt_min,ausgleich_min}) => {
      const start=quelle_ende_min+ausgleich_min;
      return {separates_basisfenster_min:round(Math.max(0,fenster_auf_min-start)),
        vorgeschlagene_basis_im_fenster:vergleich_alt_min>=start && vergleich_alt_min<fenster_auf_min,
        grenze:'Zeitliche Trennung belegt keinen gleichbleibenden Feuchtenachschub. Vor dem Öffnen Temperatur und Feuchte erneut beobachten.'};
    }, {quelle_ende_min:25,fenster_auf_min:60,vergleich_alt_min:33,ausgleich_min:15},
    {separates_basisfenster_min:20,vorgeschlagene_basis_im_fenster:false}),

  entry('haushaltsklima_wechselereignisse_eindeutiger_vorlauf',
    'Ordne eine beobachtete Änderung einem eindeutigen vorausgehenden Eingriff zu, wenn kein zweiter überlappt — Scope an observed response to one preceding intervention when another cannot overlap',
    'homeoffice-buero-kuehlen', {
      beschattung_min:mins('Minute des Verschattens'),
      lueftung_min:mins('Minute der Öffnung'),
      messung_min:mins('Minute der ersten beobachteten Änderung, gleiche Zeitskala'),
      zeitaufloesung_min:mins('Unsicherheitsabstand um dokumentierte Ereigniszeiten')
    }, ({beschattung_min,lueftung_min,messung_min,zeitaufloesung_min}) => {
      const vorher = Object.entries({beschattung:beschattung_min,lueftung:lueftung_min}).filter(([,zeit])=>zeit < messung_min-zeitaufloesung_min);
      const nahe = [beschattung_min,lueftung_min].some(zeit=>Math.abs(zeit-messung_min)<=zeitaufloesung_min);
      return {eindeutig_vorheriger_eingriff:vorher.length===1 && !nahe ? vorher[0][0] : null,
        grenze:'Klassifiziert die Zeitfolge. Eine vorausgehende Maßnahme beweist keine Wirkung.'};
    }, {beschattung_min:20,lueftung_min:75,messung_min:46,zeitaufloesung_min:3},
    {eindeutig_vorheriger_eingriff:'beschattung'}),

  entry('heizpause_oberflaeche_luft_trend_gegenlaeufig',
    'Unterscheide einen gleichläufigen und einen gegenläufigen Trend von Wand und Luft nach einem Heizwechsel — Detect diverging wall and air trends after heating changes',
    'nachtabsenkung-heizung', {
      wand_a_c:temp('Wandmesswert bei erster Ablesung'),
      wand_b_c:temp('Wandmesswert beim gleichen Messpunkt später'),
      luft_a_c:temp('Erste gleichzeitige Innenluftablesung'),
      luft_b_c:temp('Zweite gleichzeitige Innenluftablesung'),
      aenderungstoleranz_c:small('Eigene kombinierte Toleranz für die Veränderung je Messreihe'),
      messorte_unveraendert:yes('Messorte und Messarten sind unverändert')
    }, ({wand_a_c,wand_b_c,luft_a_c,luft_b_c,aenderungstoleranz_c,messorte_unveraendert}) => {
      const wand=wand_b_c-wand_a_c;
      const luft=luft_b_c-luft_a_c;
      return {wand_delta_c:round(wand),luft_delta_c:round(luft),
        trends_gegenlaeufig:messorte_unveraendert ? wand*luft<0 && Math.min(Math.abs(wand),Math.abs(luft))>aenderungstoleranz_c+1e-9 : null,
        grenze:'Kurzzeitige Trends zeigen keine Ursache oder dauerhafte Bauzustände.'};
    }, {wand_a_c:17,wand_b_c:16.7,luft_a_c:19,luft_b_c:20,aenderungstoleranz_c:0.2,messorte_unveraendert:true},
    {wand_delta_c:-0.3,luft_delta_c:1,trends_gegenlaeufig:true}),

  entry('heizkoerper_waerme_zeitfolge_raumreaktion',
    'Prüfe, ob die Raumreaktion nach der Heizkörperbeobachtung überhaupt zeitlich aufgelöst wurde — Check whether sampling resolves heater response before the room response',
    'heizkoerper-wird-nicht-warm', {
      start_min:mins('Zeitpunkt des beobachteten Heizbeginns'),
      koerper_waermer_min:mins('Erste passende Oberflächenablesung nach Heizbeginn'),
      raum_waermer_min:mins('Erste passende Luftablesung am Nutzplatz'),
      aufloesung_min:mins('Größtes Ableseintervall in beiden Reihen'),
      gleiche_probe:yes('Beide Ablesungen stammen aus demselben geprüften Heizvorgang')
    }, ({start_min,koerper_waermer_min,raum_waermer_min,aufloesung_min,gleiche_probe}) => {
      if (Math.min(koerper_waermer_min,raum_waermer_min)<start_min) throw new RangeError('Messung liegt vor Heizbeginn.');
      const abstand=raum_waermer_min-koerper_waermer_min;
      return {beobachteter_abstand_min:gleiche_probe ? round(abstand):null,
        reihenfolge_abtastbar:gleiche_probe && Math.abs(abstand)>aufloesung_min,
        grenze:'Zeitpunkte sind Ablesungen, nicht der wirkliche Beginn der Änderung. Keine Diagnose des Heizsystems.'};
    }, {start_min:12,koerper_waermer_min:20,raum_waermer_min:37,aufloesung_min:8,gleiche_probe:true},
    {beobachteter_abstand_min:17,reihenfolge_abtastbar:true}),

  entry('sonnenschutz_lueftung_vier_aufbauten_wechselwirkung',
    'Prüfe, ob sich der beobachtete Lüftungsunterschied mit und ohne Beschattung ähnelt — Compare the observed ventilation contrast with and without shade',
    'homeoffice-buero-kuehlen', {
      offen_sonne_delta_c:temp('Gemessene Temperaturänderung: Fenster offen, ohne Beschattung'),
      zu_sonne_delta_c:temp('Gemessene Änderung: Fenster zu, ohne Beschattung'),
      offen_schatten_delta_c:temp('Gemessene Änderung: Fenster offen, mit Beschattung'),
      zu_schatten_delta_c:temp('Gemessene Änderung: Fenster zu, mit Beschattung'),
      vergleichbare_startlagen:yes('Vier getrennt beobachtete Proben mit ähnlichen Startwerten, Wetter, Dauer und Messort')
    }, ({offen_sonne_delta_c,zu_sonne_delta_c,offen_schatten_delta_c,zu_schatten_delta_c,vergleichbare_startlagen}) => {
      const sonne=offen_sonne_delta_c-zu_sonne_delta_c;
      const schatten=offen_schatten_delta_c-zu_schatten_delta_c;
      return {offen_minus_zu_sonne_c:vergleichbare_startlagen ? round(sonne) : null,
        offen_minus_zu_schatten_c:vergleichbare_startlagen ? round(schatten) : null,
        kontrastunterschied_c:vergleichbare_startlagen ? round(schatten-sonne) : null,
        grenze:'Vergleicht die vier beobachteten Änderungen. Wechselnde Außenlast und gespeicherte Wärme bleiben mögliche Einflüsse.'};
    }, {offen_sonne_delta_c:0.2,zu_sonne_delta_c:1.2,offen_schatten_delta_c:-0.7,zu_schatten_delta_c:0.1,vergleichbare_startlagen:true},
    {offen_minus_zu_sonne_c:-1,offen_minus_zu_schatten_c:-0.8,kontrastunterschied_c:0.2}),

  entry('raumthermometer_mitfuehren_abweichungsrichtung_wechsel',
    'Erkenne, ob ein mitgeführtes Thermometer nach dem Ablegen gegenüber der festen Referenz die Abweichungsrichtung wechselte — Check whether a carried thermometer’s offset changed sign after placement',
    'luftfeuchtigkeit-richtig-messen', {
      tragbar_frueh_c:temp('Erste Ablesung des abgelegten tragbaren Sensors'),
      referenz_frueh_c:temp('Zeitgleiche erste Referenz am selben Platz'),
      tragbar_spaet_c:temp('Spätere Ablesung des unveränderten tragbaren Sensors'),
      referenz_spaet_c:temp('Zeitgleiche spätere Referenz am selben Platz'),
      toleranz_c:small('Eigene kombinierte Toleranz für Abweichungen von der Referenz'),
      ort_und_uhr_passen:yes('Kontrollmessungen am selben Ort mit gemeinsamer Uhr und ohne Berührung')
    }, ({tragbar_frueh_c,referenz_frueh_c,tragbar_spaet_c,referenz_spaet_c,toleranz_c,ort_und_uhr_passen}) => {
      const frueh=tragbar_frueh_c-referenz_frueh_c;
      const spaet=tragbar_spaet_c-referenz_spaet_c;
      const gegenlaeufig=frueh*spaet<0 && Math.min(Math.abs(frueh),Math.abs(spaet))>toleranz_c+1e-9;
      return {beobachtete_abweichung_frueh_c:round(frueh),beobachtete_abweichung_spaet_c:round(spaet),
        kein_einfacher_gleichgerichteter_versatz:ort_und_uhr_passen ? gegenlaeufig : null,
        grenze:'Bei entgegengesetzten Abweichungen keine konstante Korrektur aus nur einer Ablesung ableiten. Keine Kalibrierung.'};
    }, {tragbar_frueh_c:23.5,referenz_frueh_c:22.6,tragbar_spaet_c:22,referenz_spaet_c:22.5,toleranz_c:0.2,ort_und_uhr_passen:true},
    {beobachtete_abweichung_frueh_c:0.9,beobachtete_abweichung_spaet_c:-0.5,kein_einfacher_gleichgerichteter_versatz:true}),

  entry('lueftungsverlauf_co2_minimum_gegen_temperaturgrenze',
    'Prüfe, ob das niedrigste erfasste CO₂ zum gleichen Zeitpunkt wie eine passende Raumtemperatur auftrat — Match the lowest recorded CO₂ reading with simultaneous temperature',
    'unterschied-klimaanlage-lueftungsanlage', {
      a_ppm:ppm('Erste CO₂-Ablesung'),
      a_c:temp('Zeitgleiche Innenlufttemperatur A'),
      b_ppm:ppm('Zweite CO₂-Ablesung'),
      b_c:temp('Zeitgleiche Innenlufttemperatur B'),
      temperaturziel_c:temp('Selbst gewählte untere Temperaturgrenze'),
      simultan_bestaetigt:yes('Jedes Messpaar ist zeitlich und räumlich vergleichbar')
    }, ({a_ppm,a_c,b_ppm,b_c,temperaturziel_c,simultan_bestaetigt}) => {
      const minimum = Math.min(a_ppm,b_ppm);
      const passend = [[a_ppm,a_c],[b_ppm,b_c]].some(([wert,temperatur])=>wert===minimum && temperatur>=temperaturziel_c);
      return {kleinster_beobachteter_ppm:minimum, temperaturziel_beim_minimum:simultan_bestaetigt ? passend : null,
        grenze:'Nur die zwei eingetragenen Messpaare. Weder Raumluftqualität noch ausreichender Luftwechsel werden bestätigt.'};
    }, {a_ppm:941,a_c:22,b_ppm:712,b_c:18.5,temperaturziel_c:20,simultan_bestaetigt:true},
    {kleinster_beobachteter_ppm:712,temperaturziel_beim_minimum:false}),

  entry('schrank_raumluft_feuchteunterschied_nach_umschichten',
    'Prüfe nach geänderter Schrankbelegung, ob der Abstand zum gleichzeitig gemessenen Raumwert kleiner wurde — Check whether a cupboard-to-room humidity gap narrowed after rearrangement',
    'schimmel-kleiderschrank', {
      schrank_vor_rh:rh('Frühere Ablesung am markierten Schrankpunkt'),
      raum_vor_rh:rh('Erster zeitgleicher Raumwert'),
      schrank_nach_rh:rh('Spätere Ablesung am selben Schrankpunkt'),
      raum_nach_rh:rh('Zweiter zeitgleicher Raumwert'),
      temperaturen_vergleichbar:yes('Temperaturen in den jeweiligen Messpaaren und die Aufstellhöhe sind vergleichbar')
    }, ({schrank_vor_rh,raum_vor_rh,schrank_nach_rh,raum_nach_rh,temperaturen_vergleichbar}) => {
      const vor = schrank_vor_rh-raum_vor_rh;
      const nach = schrank_nach_rh-raum_nach_rh;
      return {aenderung_abstand_pp:temperaturen_vergleichbar ? round(Math.abs(nach)-Math.abs(vor)) : null,
        schrank_weiter_hoeher:temperaturen_vergleichbar ? nach>0 : null,
        grenze:'Vergleich relativer Feuchte an zwei Punkten. Kein Nachweis für Feuchte im Material oder eine beseitigte Ursache.'};
    }, {schrank_vor_rh:68,raum_vor_rh:54,schrank_nach_rh:61,raum_nach_rh:55,temperaturen_vergleichbar:true},
    {aenderung_abstand_pp:-8,schrank_weiter_hoeher:true}),

  entry('keller_taupunkt_reihenfolge_gepaart_vor_nach',
    'Prüfe nach dem Lüften, ob Raumwärme und Taupunkt in unterschiedliche Richtungen liefen — Check for diverging cellar temperature and dew point after ventilation',
    'keller-lueften-sommer', {
      warm_vor_c:temp('Raumtemperatur vor der Lüftung'),
      warm_nach_c:temp('Raumtemperatur nach der Lüftung'),
      tau_vor_c:temp('Aus dem ersten Temperatur-Feuchte-Paar ermittelter Innen-Taupunkt'),
      tau_nach_c:temp('Aus dem zweiten Paar ermittelter Innen-Taupunkt'),
      gleiche_grundlage:yes('Beide Paare am gleichen Ort aufgenommen und mit gleicher Methode ausgewertet')
    }, ({warm_vor_c,warm_nach_c,tau_vor_c,tau_nach_c,gleiche_grundlage}) => {
      if (tau_vor_c>warm_vor_c || tau_nach_c>warm_nach_c) throw new RangeError('Taupunkte und Temperaturzuordnung prüfen.');
      return {temperaturaenderung_c:round(warm_nach_c-warm_vor_c), taupunktaenderung_c:round(tau_nach_c-tau_vor_c),
        waermer_und_niedrigerer_taupunkt:gleiche_grundlage ? warm_nach_c>warm_vor_c && tau_nach_c<tau_vor_c : null,
        grenze:'Beobachtung der Innenluft. Auch bei niedrigem Taupunkt kalte Flächen und anhaltende Feuchteursachen prüfen.'};
    }, {warm_vor_c:17,warm_nach_c:18,tau_vor_c:13,tau_nach_c:11.8,gleiche_grundlage:true},
    {temperaturaenderung_c:1,taupunktaenderung_c:-1.2,waermer_und_niedrigerer_taupunkt:true}),

  entry('zimmerklima_letztes_gleiches_fenster_vor_stoerung',
    'Bestimme, welche vorab festgelegte Messdauer vor einer ungeplanten Störung vollständig erhalten blieb — Identify completed measurement lengths before a confounding event',
    'luftfeuchtigkeit-richtig-messen', {
      messbeginn_min:mins('Start der Auswertung'),
      stoerung_min:mins('Erste unbekannte Änderung im Aufbau; ohne Störung Ende des Protokolls angeben'),
      kurz_min:mins('Vorab festgelegte kurze Vergleichsdauer'),
      lang_min:mins('Vorab festgelegte lange Vergleichsdauer'),
      durchgehend_protokolliert:yes('Bis zur Störung standen verwertbare Messdaten zur Verfügung')
    }, ({messbeginn_min,stoerung_min,kurz_min,lang_min,durchgehend_protokolliert}) => {
      if (stoerung_min<messbeginn_min || lang_min<=kurz_min || kurz_min===0) throw new RangeError('Dauern prüfen.');
      const dauer=stoerung_min-messbeginn_min;
      return {gemessene_dauer_vor_stoerung_min:round(dauer),
        auswertungsfenster:durchgehend_protokolliert ? dauer>=lang_min ? 'lang_und_kurz' : dauer>=kurz_min ? 'nur_kurz' : 'keins' : null,
        grenze:'Nicht nachträglich eine günstigere Dauer auswählen, wenn vergleichbare Vorläufe fehlen.'};
    }, {messbeginn_min:30,stoerung_min:83,kurz_min:30,lang_min:60,durchgehend_protokolliert:true},
    {gemessene_dauer_vor_stoerung_min:53,auswertungsfenster:'nur_kurz'}),

  entry('raumlogger_sprung_simultane_referenzbewertung',
    'Entscheide, ob ein kurzer Messsprung auch in der zeitgleichen Kontrollreihe zu sehen war — Identify a brief anomaly present only in one room logger',
    'luftfeuchtigkeit-richtig-messen', {
      sprung_messung_c:temp('Vorzeichen des Sprungs im hauptsächlich genutzten Sensor in °C'),
      sprung_referenz_c:temp('Zeitgleich beobachtete Änderung am benachbarten Kontrollsensor in °C'),
      abweichung_zur_basis_danach_c:temp('Vorzeichen des Restabstands des Hauptsensors zu dessen Ausgangswert'),
      toleranz_c:small('Gemeinsame selbst gesetzte Toleranz in °C'),
      zeitreihen_abgeglichen:yes('Gerätepositionen, Ablesezeitpunkte und Reaktionszeiten sind ausreichend vergleichbar')
    }, ({sprung_messung_c,sprung_referenz_c,abweichung_zur_basis_danach_c,toleranz_c,zeitreihen_abgeglichen}) => {
      const a = Math.abs(sprung_messung_c)>toleranz_c;
      const b = Math.abs(sprung_referenz_c)>toleranz_c;
      const zurueck=Math.abs(abweichung_zur_basis_danach_c)<=toleranz_c;
      return {nur_ein_sensor_sprung_und_rueckkehr:zeitreihen_abgeglichen ? a&&!b&&zurueck : null,
        beide_gleiche_richtung:zeitreihen_abgeglichen ? a&&b&&sprung_messung_c*sprung_referenz_c>0 : null,
        grenze:'Signal für eine gezielte Wiederholungsmessung. Lokale Störungen und trägere Referenz sind weiter möglich.'};
    }, {sprung_messung_c:2,sprung_referenz_c:0.1,abweichung_zur_basis_danach_c:0.1,toleranz_c:0.3,zeitreihen_abgeglichen:true},
    {nur_ein_sensor_sprung_und_rueckkehr:true,beide_gleiche_richtung:false}),

  entry('raumfeuchte_intervall_hoch_bleibt_nach_quellenende',
    'Trenne hohe Feuchte während einer Quelle von belegten Minuten nach ihrem Ende — Separate high humidity during an event from its documented persistence afterwards',
    'luftfeuchtigkeit-senken', {
      hoch_ab_min:mins('Nach eigener Protokollregel belegter Beginn der erhöhten Feuchte'),
      hoch_bis_min:mins('Belegtes Ende oder letzter durchgehend erfasster Zeitpunkt'),
      quelle_bis_min:mins('Ende der bekannten Feuchtequelle in derselben Zeitskala'),
      gleicher_sensor_durchgehend:yes('Kein Messortwechsel und kein Aufzeichnungsausfall im angegebenen Abschnitt')
    }, ({hoch_ab_min,hoch_bis_min,quelle_bis_min,gleicher_sensor_durchgehend}) => {
      if (hoch_ab_min>hoch_bis_min) throw new RangeError('Feuchteintervall vertauscht.');
      return {hoch_nach_quellenende_min:gleicher_sensor_durchgehend ? round(Math.max(0,hoch_bis_min-Math.max(hoch_ab_min,quelle_bis_min))) : null,
        beginn_erst_nach_quelle:hoch_ab_min>quelle_bis_min,
        grenze:'Zeitzuordnung dokumentiert den Verlauf. Anhaltende Feuchte kann andere Ursachen haben.'};
    }, {hoch_ab_min:40,hoch_bis_min:103,quelle_bis_min:62,gleicher_sensor_durchgehend:true},
    {hoch_nach_quellenende_min:41,beginn_erst_nach_quelle:false}),

  entry('klimaprobe_waermedifferenz_fensterseite_von_durchgang',
    'Prüfe, ob eine beobachtete Wärmespur im Türdurchgang zuerst oder zuletzt zu sehen war — Resolve the order of a thermal observation at an opened doorway',
    'homeoffice-buero-kuehlen', {
      fern_a_min:mins('Zeit der ersten passenden Ablesung im ersten Raum'),
      tuer_min:mins('Zeit des ersten passenden Messwerts im Türbereich'),
      fern_b_min:mins('Zeit der ersten passenden Ablesung im zweiten Raum'),
      eigene_toleranz_min:mins('Größter Unsicherheitsabstand der Zeitstempel'),
      gleicher_ausloeser:yes('Messwerte beziehen sich auf dieselbe beobachtete Öffnungsphase')
    }, ({fern_a_min,tuer_min,fern_b_min,eigene_toleranz_min,gleicher_ausloeser}) => {
      const davor=[fern_a_min,fern_b_min].filter(zeit=>zeit<tuer_min-eigene_toleranz_min).length;
      const danach=[fern_a_min,fern_b_min].filter(zeit=>zeit>tuer_min+eigene_toleranz_min).length;
      return {raumwerte_vor_tuerwert:gleicher_ausloeser ? davor : null, raumwerte_nach_tuerwert:gleicher_ausloeser ? danach : null,
        grenze:'Nur die Reihenfolge passend aufgelöster Ablesungen. Ein Wärmefluss oder seine Richtung ist damit nicht nachgewiesen.'};
    }, {fern_a_min:30,tuer_min:43,fern_b_min:51,eigene_toleranz_min:5,gleicher_ausloeser:true},
    {raumwerte_vor_tuerwert:1,raumwerte_nach_tuerwert:1}),

  entry('klimageraet_verlauf_ausfallphasen_ungeklaert',
    'Bilanziere während einer Kühlprobe aktive, geplante und ungeklärte Ausfallzeit getrennt — Separate active cooling, planned pauses and unresolved downtime',
    'mobile-klimaanlage-kuehlt-nicht', {
      probe_min:mins('Gesamtdauer der kontrollierten Kühlprobe'),
      kuehlung_min:mins('Dauer belegter Kühlphasen'),
      planpause_min:mins('Weitere Minuten mit bekannter beabsichtigter Pause'),
      sonstiger_auszustand_min:mins('Weitere Minuten ausdrücklich beobachtet ohne Kühlung'),
      zeiten_disjunkt:yes('Jede Minute wurde höchstens einer dieser Gruppen zugeordnet')
    }, ({probe_min,kuehlung_min,planpause_min,sonstiger_auszustand_min,zeiten_disjunkt}) => {
      const sum=kuehlung_min+planpause_min+sonstiger_auszustand_min;
      if (zeiten_disjunkt && sum>probe_min+1e-8) throw new RangeError('Zeitanteile überschreiten die Probe.');
      return {ungeklaert_min:zeiten_disjunkt ? round(Math.max(0,probe_min-sum)) : null,
        nicht_geplanter_auszustand_min:zeiten_disjunkt ? sonstiger_auszustand_min : null,
        grenze:'Nur beobachtete Phasen. Ein Auszustand ist kein Nachweis eines Gerätedefekts.'};
    }, {probe_min:80,kuehlung_min:47,planpause_min:12,sonstiger_auszustand_min:9,zeiten_disjunkt:true},
    {ungeklaert_min:12,nicht_geplanter_auszustand_min:9}),

  entry('verschattung_erholung_innerhalb_eigener_streubreite',
    'Prüfe, ob sich der beschattete Nutzplatz wieder dem dokumentierten Ausgangsband genähert hat — Assess recovery toward the recorded baseline range after shading',
    'hitzeschutz-fenster', {
      basis_unten_c:temp('Untere Grenze der vorher beobachteten Temperaturspanne am selben Ort'),
      basis_oben_c:temp('Obere Grenze der vorher beobachteten Temperaturspanne'),
      wert_kurz_c:temp('Erste spätere Raumtemperatur nach Änderung der Beschattung'),
      wert_spaet_c:temp('Zweite spätere Temperatur nach Änderung der Beschattung'),
      gleicher_ort_und_aufbau:yes('Messort unverändert, späterer Aufbau unverändert und dokumentiert')
    }, ({basis_unten_c,basis_oben_c,wert_kurz_c,wert_spaet_c,gleicher_ort_und_aufbau}) => {
      if (basis_oben_c<basis_unten_c) throw new RangeError('Ausgangsband prüfen.');
      const abstand=wert=>Math.max(basis_unten_c-wert,wert-basis_oben_c,0);
      return {spaeter_im_ausgangsband:gleicher_ort_und_aufbau ? abstand(wert_spaet_c)===0 : null,
        aenderung_bandabstand_c:gleicher_ort_und_aufbau ? round(abstand(wert_spaet_c)-abstand(wert_kurz_c)) : null,
        grenze:'Ausgangsband aus eigenen Ablesungen. Kein Beleg für Dauer oder Ursache der Annäherung.'};
    }, {basis_unten_c:24,basis_oben_c:25,wert_kurz_c:27,wert_spaet_c:25.4,gleicher_ort_und_aufbau:true},
    {spaeter_im_ausgangsband:false,aenderung_bandabstand_c:-1.6}),

  entry('schlafraum_waermesprung_tuerbelegung_quellenbilanz',
    'Prüfe, in welchen dokumentierten Nächten beide möglichen Störereignisse einen gemeldeten Wärmewechsel begleiteten — Count nights with two candidate confounders around a warmth event',
    'bei-hitze-schlafen', {
      naechte:whole('Anzahl Nächte mit derselben dokumentierten Beobachtung'),
      tuer:whole('Nächte mit Türwechsel im vorab benannten Zeitfenster'),
      geraet:whole('Nächte mit Wechsel eines wärmeabgebenden Geräts im selben Zeitfenster'),
      entweder_oder_beide:whole('Nächte mit mindestens einem der beiden Ereignisse, ohne Doppelung')
    }, ({naechte,tuer,geraet,entweder_oder_beide}) => {
      count(naechte,tuer,geraet,entweder_oder_beide);
      if (entweder_oder_beide>naechte || entweder_oder_beide<Math.max(tuer,geraet) || entweder_oder_beide>tuer+geraet) throw new RangeError('Nachtzahlen prüfen.');
      return {beide_stoereignisse:tuer+geraet-entweder_oder_beide,
        ohne_diese_ereignisse:naechte-entweder_oder_beide,
        grenze:'Gleichzeitige Störereignisse lassen keine Aussage darüber zu, welches für die Wärme verantwortlich war.'};
    }, {naechte:8,tuer:5,geraet:4,entweder_oder_beide:6},
    {beide_stoereignisse:3,ohne_diese_ereignisse:2}),

  entry('raumklima_tagesmaximum_abschnitt_bestimmen',
    'Prüfe, welchen Abschnitt ein gespeichertes Maximum erfasst, wenn die Beschattung währenddessen wechselte — Scope a stored maximum to a shading phase only when the reset interval allows it',
    'dachgeschoss-kuehlen', {
      rueckstellung_min:mins('Zeit der letzten sicher dokumentierten Speicher-Rückstellung'),
      beschattung_min:mins('Zeit des dokumentierten Schaltwechsels der Beschattung'),
      screenshot_min:mins('Zeit der Maximalablesung'),
      gleiche_speicherperiode:yes('Anleitung und Anzeige bestätigen durchgehend genau diesen manuellen Speicherabschnitt')
    }, ({rueckstellung_min,beschattung_min,screenshot_min,gleiche_speicherperiode}) => {
      if (rueckstellung_min>screenshot_min) throw new RangeError('Speicherzeitraum prüfen.');
      const status=beschattung_min<=rueckstellung_min ? 'nur_nach_schaltung' : beschattung_min>=screenshot_min ? 'nur_vor_schaltung' : 'beide_phasen_moeglich';
      return {maximum_zeitumfang:gleiche_speicherperiode ? status : 'speicherperiode_offen',
        grenze:'Ein Maximalspeicher belegt ohne Kurve nicht den exakten Zeitpunkt des Maximums.'};
    }, {rueckstellung_min:30,beschattung_min:93,screenshot_min:130,gleiche_speicherperiode:true},
    {maximum_zeitumfang:'beide_phasen_moeglich'}),

  entry('ventilator_sitzprobe_luftwechsel_tempstabil',
    'Trenne beobachtete Luftbewegung am Sitz von gleichzeitiger Raumtemperaturänderung — Separate seat-level airflow from measured room temperature changes',
    'ventilator-kaufen-ratgeber', {
      v_vor_m_s:n('Am Sitz vor dem Standortwechsel erfasste Luftgeschwindigkeit',0,15),
      v_nach_m_s:n('Am Sitz nach dem Wechsel, gleiches Verfahren',0,15),
      t_vor_c:temp('Erste gleichzeitige Raumtemperatur am gleichen Ort'),
      t_nach_c:temp('Zweite gleichzeitige Raumtemperatur'),
      toleranz_c:small('Gewählte Toleranz der Temperaturdifferenz'),
      gleiche_ausrichtung:yes('Anemometer in gleicher Ausrichtung, Gerätestufe und Sensorhöhe gleich')
    }, ({v_vor_m_s,v_nach_m_s,t_vor_c,t_nach_c,toleranz_c,gleiche_ausrichtung}) => {
      const dt=t_nach_c-t_vor_c;
      return {temperaturdelta_c:round(dt),
        luftzuwachs_bei_aehnlicher_temperatur_m_s:gleiche_ausrichtung && Math.abs(dt)<=toleranz_c+1e-9 ? round(v_nach_m_s-v_vor_m_s) : null,
        grenze:'Lokaler Luftstrom ist keine Kühlung der Raumluft und sagt allein nichts über Komfort.'};
    }, {v_vor_m_s:0.3,v_nach_m_s:0.55,t_vor_c:26.5,t_nach_c:26.6,toleranz_c:0.2,gleiche_ausrichtung:true},
    {temperaturdelta_c:0.1,luftzuwachs_bei_aehnlicher_temperatur_m_s:0.25}),

  entry('lueftung_vorhang_geschlossen_zwei_ortsreaktionen',
    'Prüfe, ob sich ein Temperaturunterschied hinter dem Vorhang zum Zimmer erst nach der Lüftung bildete — Detect a new window-to-room temperature split after ventilation',
    'thermovorhang-ratgeber', {
      fenster_vor_c:temp('Temperatur im Bereich hinter dem Vorhang vor dem Lüften'),
      raum_vor_c:temp('Zeitgleicher Raumwert im gleichen Aufbau'),
      fenster_nach_c:temp('Wert hinter dem Vorhang bei der Nachprobe'),
      raum_nach_c:temp('Zeitgleicher Raumwert bei der Nachprobe'),
      eigene_grenze_c:small('Selbst gewählte Mindestdifferenz für einen örtlichen Unterschied'),
      vorhangposition_passend:yes('Vorhangposition, Abstand und Messorte vor und nach der Lüftung gleich')
    }, ({fenster_vor_c,raum_vor_c,fenster_nach_c,raum_nach_c,eigene_grenze_c,vorhangposition_passend}) => {
      const vor=raum_vor_c-fenster_vor_c;
      const nach=raum_nach_c-fenster_nach_c;
      return {vorher_raum_minus_fenster_c:round(vor), nachher_raum_minus_fenster_c:round(nach),
        neuer_oertlicher_abstand:vorhangposition_passend ? vor<=eigene_grenze_c && nach>eigene_grenze_c : null,
        grenze:'Ein Temperaturabstand zwischen zwei Luftmesspunkten ist kein Nachweis der Dämmwirkung oder der Oberflächenfeuchte.'};
    }, {fenster_vor_c:19.4,raum_vor_c:20,fenster_nach_c:17.5,raum_nach_c:20,eigene_grenze_c:1,vorhangposition_passend:true},
    {vorher_raum_minus_fenster_c:0.6,nachher_raum_minus_fenster_c:2.5,neuer_oertlicher_abstand:true}),

  entry('bad_erholung_duschfolge_wann_nachprobe_startet',
    'Kläre, bei welcher von zwei Duschfolgen eine vollständige Erholungsprobe vor der nächsten Nutzung möglich war — Identify which shower sequence allows an uncontaminated recovery observation',
    'richtig-lueften-im-winter', {
      abstand_a_min:mins('Zeit vom Ende der ersten Dusche bis zur nächsten Nutzung in Folge A'),
      abstand_b_min:mins('Entsprechender Abstand in Folge B'),
      noetige_probedauer_min:mins('Eigenes vorab festgelegtes Erholungs-Messfenster'),
      beobachtung_bis_naechste_nutzung:yes('Duschende und neue Feuchtequelle sind in beiden Fällen sicher protokolliert')
    }, ({abstand_a_min,abstand_b_min,noetige_probedauer_min,beobachtung_bis_naechste_nutzung}) => {
      positiveDuration(noetige_probedauer_min);
      return {vergleich_vor_neuer_quelle_moeglich:beobachtung_bis_naechste_nutzung
        ? [abstand_a_min>=noetige_probedauer_min && 'a',abstand_b_min>=noetige_probedauer_min && 'b'].filter(Boolean) : null,
        fehlende_minuten_a:round(Math.max(0,noetige_probedauer_min-abstand_a_min)),
        fehlende_minuten_b:round(Math.max(0,noetige_probedauer_min-abstand_b_min)),
        grenze:'Zeitliche Möglichkeit allein belegt keine Erholung. Erst eine tatsächlich aufgezeichnete Probe liefert Werte.'};
    }, {abstand_a_min:25,abstand_b_min:55,noetige_probedauer_min:40,beobachtung_bis_naechste_nutzung:true},
    {vergleich_vor_neuer_quelle_moeglich:['b'],fehlende_minuten_a:15,fehlende_minuten_b:0}),

  entry('nachtluft_kuehlerer_aussenwert_vor_erstem_abfall',
    'Bestimme, ob ein gemessener Außen-Innen-Wechsel früh genug erfasst ist, um ihm eine spätere Nachtablesung gegenüberzustellen — Verify timing for an outdoor-to-indoor temperature crossover before a later reading',
    'richtig-lueften-bei-hitze', {
      letzte_aussen_waermer_min:mins('Letzte zeitgleiche Messpaarung mit wärmerer Außenluft'),
      erste_aussen_kuehler_min:mins('Erste darauf folgende Paarung mit kühlerer Außenluft'),
      erste_innenreaktion_min:mins('Erste erfasste Innenablesung mit der gesuchten Veränderung'),
      gleiches_zeitprotokoll:yes('Dieselbe örtliche Sensorposition und gemeinsame Uhr ohne Lücken um den Wechsel')
    }, ({letzte_aussen_waermer_min,erste_aussen_kuehler_min,erste_innenreaktion_min,gleiches_zeitprotokoll}) => {
      if (erste_aussen_kuehler_min<=letzte_aussen_waermer_min) throw new RangeError('Zeitfolge der Außenmesspaare prüfen.');
      const davor=erste_innenreaktion_min<letzte_aussen_waermer_min;
      const spaeter=erste_innenreaktion_min>erste_aussen_kuehler_min;
      return {lage_der_innenablesung:gleiches_zeitprotokoll ? davor ? 'davor' : spaeter ? 'danach' : 'zeitlich_nicht_trennbar' : 'offen',
        wechselintervall_min:gleiches_zeitprotokoll ? [letzte_aussen_waermer_min,erste_aussen_kuehler_min] : null,
        grenze:'Intervall zwischen Messpaaren. Es enthält keinen Nachweis des Einflusses auf die Raumtemperatur.'};
    }, {letzte_aussen_waermer_min:50,erste_aussen_kuehler_min:71,erste_innenreaktion_min:64,gleiches_zeitprotokoll:true},
    {lage_der_innenablesung:'zeitlich_nicht_trennbar',wechselintervall_min:[50,71]}),

  entry('fenster_taureserve_wechsel_frueher_als_beschlag',
    'Prüfe, ob die gemessene Taupunktreserve schon vor sichtbarem Beschlag kleiner wurde — Compare dew-point margin before the first observed condensation',
    'fenster-beschlagen-innen', {
      glas_a_c:temp('Früherer innerer Scheibenwert am betrachteten Punkt'),
      tau_a_c:temp('Taupunkt der zugehörigen Raumluft zur ersten Messung'),
      glas_b_c:temp('Späterer Scheibenwert am selben Punkt, noch ohne sichtbaren Beschlag'),
      tau_b_c:temp('Taupunkt der zugehörigen Raumluft zur zweiten Messung'),
      spaeter_beschlag_belegt:yes('Sichtbarer Beschlag wurde erst nach diesen Ablesungen an demselben Punkt festgehalten'),
      messorte_gepaart:yes('Werte aus jeweils zeitlich passenden Messpaaren')
    }, ({glas_a_c,tau_a_c,glas_b_c,tau_b_c,spaeter_beschlag_belegt,messorte_gepaart}) => {
      const vor=glas_a_c-tau_a_c;
      const nach=glas_b_c-tau_b_c;
      return {reserve_a_c:round(vor),reserve_b_c:round(nach),
        abnehmende_reserve_vor_sichtbeobachtung:messorte_gepaart && spaeter_beschlag_belegt ? nach<vor : null,
        grenze:'Vergleich an einer Scheibenstelle. Messverfahren und kleine Temperaturabstände begrenzen die Aussage.'};
    }, {glas_a_c:14,tau_a_c:11,glas_b_c:12.5,tau_b_c:12,spaeter_beschlag_belegt:true,messorte_gepaart:true},
    {reserve_a_c:3,reserve_b_c:0.5,abnehmende_reserve_vor_sichtbeobachtung:true}),

  entry('hitzetag_warmzeit_auf_eigene_anwesenheit_beziehen',
    'Prüfe, welcher Anteil des gemessenen warmen Zeitraums die tatsächliche Nutzung überlappt — Match a sustained warm interval to actual room occupancy',
    'hitze-check', {
      warm_ab_min:mins('Beginn der laut Messprotokoll warmen Phase'),
      warm_bis_min:mins('Ende der belegten zusammenhängenden warmen Phase'),
      nutzung_ab_min:mins('Beginn der tatsächlich protokollierten Anwesenheit'),
      nutzung_bis_min:mins('Ende der tatsächlich protokollierten Anwesenheit'),
      gleicher_raum_und_bezug:yes('Gleicher Raum, gemeinsame Uhr, Raumfühler während der Messung am ausgewählten Nutzplatz')
    }, ({warm_ab_min,warm_bis_min,nutzung_ab_min,nutzung_bis_min,gleicher_raum_und_bezug}) => {
      if (warm_bis_min<warm_ab_min || nutzung_bis_min<nutzung_ab_min) throw new RangeError('Intervalle prüfen.');
      const ueberlappung=Math.max(0,Math.min(warm_bis_min,nutzung_bis_min)-Math.max(warm_ab_min,nutzung_ab_min));
      return {warm_waehrend_nutzung_min:gleicher_raum_und_bezug ? round(ueberlappung) : null,
        warm_ausserhalb_nutzung_min:gleicher_raum_und_bezug ? round(warm_bis_min-warm_ab_min-ueberlappung) : null,
        grenze:'Abgleich einer gemessenen Phase mit persönlichem Nutzungsplan. Keine gesundheitliche Bewertung.'};
    }, {warm_ab_min:60,warm_bis_min:140,nutzung_ab_min:90,nutzung_bis_min:180,gleicher_raum_und_bezug:true},
    {warm_waehrend_nutzung_min:50,warm_ausserhalb_nutzung_min:30}),

  entry('heizaufzeichnung_ueberschwingen_nach_absenkung',
    'Trenne beim Absenken die gemessene Änderung des Raumwerts von der Änderung der Sollvorgabe — Detect measured overshoot after a recorded setback',
    'nachtabsenkung-heizung', {
      altes_ziel_c:temp('Vorheriger Sollwert im Heizprotokoll'),
      neues_ziel_c:temp('Danach gesetzter niedrigerer Sollwert'),
      luft_beim_wechsel_c:temp('Messung am Raumplatz beim Wechsel'),
      luft_spaeter_c:temp('Spätere Raumablesung im selben Absenkabschnitt'),
      keine_weitere_regelung:yes('Seit dem Wechsel ist kein weiterer Einstellungs- oder Sensorortwechsel protokolliert')
    }, ({altes_ziel_c,neues_ziel_c,luft_beim_wechsel_c,luft_spaeter_c,keine_weitere_regelung}) => {
      if (altes_ziel_c<=neues_ziel_c) throw new RangeError('Der neue Sollwert muss niedriger sein.');
      return {raumwert_anstieg_c:round(luft_spaeter_c-luft_beim_wechsel_c),
        nach_abwaertswechsel_ueber_altem_ziel:keine_weitere_regelung ? luft_beim_wechsel_c<=altes_ziel_c && luft_spaeter_c>altes_ziel_c : null,
        grenze:'Gemessener Verlauf und Sollwert sind verschiedene Größen. Die Beobachtung belegt keine Ursache.'};
    }, {altes_ziel_c:21,neues_ziel_c:18,luft_beim_wechsel_c:20.8,luft_spaeter_c:21.4,keine_weitere_regelung:true},
    {raumwert_anstieg_c:0.6,nach_abwaertswechsel_ueber_altem_ziel:true}),

  entry('kellerfeuchte_endlueftung_taupunkt_ursprung_wechseln',
    'Vergleiche Innen-Taupunkte nach zwei Lüftungsphasen relativ zum jeweils gemessenen Außenwert — Compare cellar recovery relative to the measured outdoor dew point',
    'keller-lueften-sommer', {
      innen_a_c:temp('Innen-Taupunkt am Ende der Phase A'),
      aussen_a_c:temp('Zeitgleicher Außen-Taupunkt zur Phase A'),
      innen_b_c:temp('Innen-Taupunkt am Ende der Phase B'),
      aussen_b_c:temp('Zeitgleicher Außen-Taupunkt zur Phase B'),
      pruefphasen_vergleichbar:yes('Gleiche Messorte und vergleichbare Öffnungsphasen, Messpaare zeitgleich')
    }, ({innen_a_c,aussen_a_c,innen_b_c,aussen_b_c,pruefphasen_vergleichbar}) => {
      const a=innen_a_c-aussen_a_c;
      const b=innen_b_c-aussen_b_c;
      return {abstand_innen_minus_aussen_c:pruefphasen_vergleichbar ? [round(a),round(b)] : null,
        vorzeichen_des_abstands_gewechselt:pruefphasen_vergleichbar ? a*b<0 : null,
        grenze:'Zwei Endpunkte beweisen keine Trocknung der Bausubstanz und keine dauerhaft passenden Lüftungsbedingungen.'};
    }, {innen_a_c:13,aussen_a_c:12,innen_b_c:12.8,aussen_b_c:13.5,pruefphasen_vergleichbar:true},
    {abstand_innen_minus_aussen_c:[1,-0.7],vorzeichen_des_abstands_gewechselt:true}),

  entry('nachtlueftung_querweg_wiederholte_richtungswechsel',
    'Prüfe, ob eine Richtung am geöffneten Durchgang beständig blieb oder innerhalb der Stichproben wechselte — Count directional reversals in repeated doorway airflow checks',
    'richtig-lueften-bei-hitze', {
      a:pick('Handbeobachtung zuerst am gleichen Punkt', 'nach_a', 'nach_b', 'unklar'),
      b:pick('Zweite Beobachtung', 'nach_a', 'nach_b', 'unklar'),
      c:pick('Dritte Beobachtung', 'nach_a', 'nach_b', 'unklar'),
      oeffnungen_unveraendert:yes('Geöffnete Fenster, Tür und Prüfort zwischen den Beobachtungen unverändert')
    }, ({a,b,c,oeffnungen_unveraendert}) => {
      const bekannt=[a,b,c].filter(x=>x!=='unklar');
      const direkt=[[a,b],[b,c]].filter(pair=>pair.every(x=>x!=='unklar') && pair[0]!==pair[1]).length;
      return {beide_richtungen_beobachtet:oeffnungen_unveraendert ? new Set(bekannt).size>1 : null,
        direkt_erfasste_wechsel:oeffnungen_unveraendert ? direkt : null,
        grenze:'Stichproben in zeitlicher Folge. Richtung ist keine Luftgeschwindigkeit oder Luftwechselrate.'};
    }, {a:'nach_a',b:'unklar',c:'nach_b',oeffnungen_unveraendert:true},
    {beide_richtungen_beobachtet:true,direkt_erfasste_wechsel:0}),

  entry('kuehlprobe_innen_und_aussen_zeitgewichtete_luecke',
    'Trenne den mittleren gemessenen Temperaturabstand von einer offenen Messphase ohne Paarung — Report observed paired temperature gaps and their uncovered time',
    'mobile-klimaanlage-vergleich', {
      a_innen_c:temp('Innenabschnitt A, zeitlicher Mittelwert'),
      a_aussen_c:temp('Zeitlich passend gemittelter Außenwert A'),
      a_min:mins('Dauer des belegten Abschnitts A'),
      b_innen_c:temp('Gemittelter Innenwert B'),
      b_aussen_c:temp('Zeitlich passend gemittelter Außenwert B'),
      b_min:mins('Dauer des weiteren belegten Abschnitts B'),
      gesamt_min:mins('Gesamte betrachtete Dauer einschließlich Datenlücke'),
      paare_disjunkt:yes('Zwei getrennte Messabschnitte und vergleichbare Messorte bestätigt')
    }, ({a_innen_c,a_aussen_c,a_min,b_innen_c,b_aussen_c,b_min,gesamt_min,paare_disjunkt}) => {
      const beobachtet=a_min+b_min;
      if (paare_disjunkt && beobachtet>gesamt_min+1e-8) throw new RangeError('Messabschnitte überschneiden sich oder sind länger als das Fenster.');
      return {innen_minus_aussen_nur_gemessen_c:paare_disjunkt && beobachtet>0 ? round(((a_innen_c-a_aussen_c)*a_min+(b_innen_c-b_aussen_c)*b_min)/beobachtet) : null,
        offene_min:paare_disjunkt ? round(Math.max(0,gesamt_min-beobachtet)) : null,
        grenze:'Nur beobachtete Abschnitte fließen in den gewichteten Abstand ein. Keine Temperatur in der offenen Phase ableiten.'};
    }, {a_innen_c:26,a_aussen_c:30,a_min:30,b_innen_c:25,b_aussen_c:27,b_min:10,gesamt_min:60,paare_disjunkt:true},
    {innen_minus_aussen_nur_gemessen_c:-3.5,offene_min:20}),

  entry('vorhang_sonnenlauf_waerme_licht_gemeinsame_probe',
    'Prüfe, ob die beschattete Nachprobe beide eigenen Ziele am selben Nutzplatz gleichzeitig trifft — Check simultaneous heat and daylight goals in a measured shading trial',
    'hitzeschutz-fenster', {
      vorher_lux:n('Vorherige Beleuchtungsstärke am Nutzplatz',0,150000),
      nachher_lux:n('Spätere Beleuchtungsstärke am gleichen Platz, zeitgleich zum Wärmeprotokoll',0,150000),
      innen_nach_c:temp('Zeitgleiche Raumtemperatur am Nutzplatz'),
      mindest_lux:n('Persönlich gewählter Lichtwert',0,150000),
      maximal_c:temp('Persönlich gewählte obere Raumtemperatur'),
      vergleichsaufbau_fix:yes('Kunstlicht, Platz, Messausrichtung und Messzeitpunkt sind dokumentiert')
    }, ({vorher_lux,nachher_lux,innen_nach_c,mindest_lux,maximal_c,vergleichsaufbau_fix}) => ({
      lichtveraenderung_lux:vergleichsaufbau_fix ? round(nachher_lux-vorher_lux) : null,
      beide_eigenen_ziele_im_messpaar:vergleichsaufbau_fix ? nachher_lux>=mindest_lux && innen_nach_c<=maximal_c : null,
      grenze:'Momentaufnahme für selbst gewählte Ziele. Keine Aussage zur Normbeleuchtung oder zu späteren Sonnenständen.'
    }), {vorher_lux:740,nachher_lux:410,innen_nach_c:25.4,mindest_lux:380,maximal_c:25,vergleichsaufbau_fix:true},
    {lichtveraenderung_lux:-330,beide_eigenen_ziele_im_messpaar:false}),

  entry('luftfeuchte_trocknungsprobe_waesche_ortssprung_markieren',
    'Trenne die Feuchteänderungen vor und nach dem Umhängen von der offenen Ortswechsel-Lücke — Separate drying observations on either side of a room move',
    'waesche-trocknen-wohnung', {
      a_vor_rh:rh('Früherer Zimmerwert vor dem Umhängen'),
      a_ende_rh:rh('Letzter Wert desselben Punktes vor dem Umhängen'),
      b_start_rh:rh('Erster Wert am markierten Punkt des neuen Raums'),
      b_spaet_rh:rh('Spätere Ablesung desselben Punktes im neuen Raum'),
      je_paar_vergleichbar:yes('Je Raum bekannte und ausreichend ähnliche Temperaturen und Messpunkte')
    }, ({a_vor_rh,a_ende_rh,b_start_rh,b_spaet_rh,je_paar_vergleichbar}) => ({
      vorher_im_ersten_raum_pp:je_paar_vergleichbar ? round(a_ende_rh-a_vor_rh) : null,
      nachher_im_zweiten_raum_pp:je_paar_vergleichbar ? round(b_spaet_rh-b_start_rh) : null,
      wechselablesung_unbereinigt_pp:round(b_start_rh-a_ende_rh),
      grenze:'Der Ortswechselwert beschreibt zwei verschiedene Räume. Er gilt nicht als Trocknungsfortschritt oder Feuchtemenge.'
    }), {a_vor_rh:53,a_ende_rh:61,b_start_rh:50,b_spaet_rh:56,je_paar_vergleichbar:true},
    {vorher_im_ersten_raum_pp:8,nachher_im_zweiten_raum_pp:6,wechselablesung_unbereinigt_pp:-11}),

  entry('keller_kompressor_lueftung_getrennte_tankabnahme',
    'Prüfe, ob einer messbaren Tankzunahme eine zusätzliche Fensteröffnung vorausging — Mark reservoir intervals affected by a separate ventilation event',
    'luftentfeuchter-keller', {
      a_ab_min:mins('Zeitpunkt der ersten Tankablesung'),
      b_ab_min:mins('Zeitpunkt der nächsten Tankablesung ohne Leerung'),
      fenster_ab_min:mins('Beginn einer dokumentierten Fensteröffnung'),
      fenster_bis_min:mins('Ende derselben Fensteröffnung'),
      tankzuwachs_l:n('Gemessene Zunahme zwischen beiden Ablesungen',0,100)
    }, ({a_ab_min,b_ab_min,fenster_ab_min,fenster_bis_min,tankzuwachs_l}) => {
      if (b_ab_min<=a_ab_min || fenster_bis_min<fenster_ab_min) throw new RangeError('Zeitintervalle prüfen.');
      const lueftung=Math.max(0,Math.min(b_ab_min,fenster_bis_min)-Math.max(a_ab_min,fenster_ab_min));
      return {fenster_min_im_tankvergleich:round(lueftung), gesamtzuwachs_l:tankzuwachs_l,
        eindeutig_ohne_diese_lueftungsphase:lueftung===0,
        grenze:'Bei Überlappung lässt sich die gemessene Wassermenge nicht auf Öffnungsphasen verteilen. Feuchtequellen getrennt prüfen.'};
    }, {a_ab_min:15,b_ab_min:140,fenster_ab_min:120,fenster_bis_min:160,tankzuwachs_l:0.55},
    {fenster_min_im_tankvergleich:20,gesamtzuwachs_l:0.55,eindeutig_ohne_diese_lueftungsphase:false}),

  entry('klimageraet_raumfaelle_warme_spitze_vor_oder_nach_pause',
    'Prüfe, ob sich unter den protokollierten Spitzen die Reihenfolge von vor oder nach der Kühlpause auflösen lässt — Resolve the order of the measured peak and cooling interruption',
    'klimaanlage-nachts-laufen-lassen', {
      pause_ab_min:mins('Beginn der beobachteten Kühlpause'),
      pause_bis_min:mins('Fortsetzung der Kühlung'),
      spitze_a_min:mins('Zeit der ersten gleich hohen Spitzenablesung'),
      spitze_b_min:mins('Zeit der letzten als gleich hoch gemessenen Spitzenablesung'),
      vollstaendiges_zeitprofil:yes('Gleicher Sensor, gemeinsamer Zeitbezug und beide Spitzen nachvollzogen')
    }, ({pause_ab_min,pause_bis_min,spitze_a_min,spitze_b_min,vollstaendiges_zeitprofil}) => {
      if (pause_bis_min<pause_ab_min || spitze_b_min<spitze_a_min) throw new RangeError('Zeitfolge prüfen.');
      const phase=zeit=>zeit<pause_ab_min ? 'vor_pause' : zeit<pause_bis_min ? 'in_pause' : 'nach_pause';
      return {phasen_beobachteter_spitzen:vollstaendiges_zeitprofil ? [...new Set([phase(spitze_a_min),phase(spitze_b_min)])] : null,
        grenze:'Ordnet zwei protokollierte Spitzen zu. Zwischenzeiten und Ursachen folgen daraus nicht.'};
    }, {pause_ab_min:50,pause_bis_min:80,spitze_a_min:66,spitze_b_min:96,vollstaendiges_zeitprofil:true},
    {phasen_beobachteter_spitzen:['in_pause','nach_pause']}),

  entry('heizmessung_warme_raumzone_vor_und_nach_sesselwechsel',
    'Prüfe, ob eine beobachtete kältere Sitzzone nach Umstellung auch in den Vergleichspunkten erhalten blieb — Test whether a colder seat zone persists after moving furniture',
    'homeoffice-warm-bleiben', {
      a_vor_c:temp('Früherer Luftwert am festen Sitzpunkt A'),
      b_vor_c:temp('Gleichzeitiger früherer Wert am festen Punkt B'),
      a_nach_c:temp('Späterer Wert am unveränderten Punkt A'),
      b_nach_c:temp('Gleichzeitiger späterer Wert am unveränderten Punkt B'),
      differenzgrenze_c:small('Selbst festgelegter Mindestabstand, ab dem A deutlich kälter zählt'),
      gleiche_heizphase:yes('Vergleichbare Heizphase, feste Messorte trotz umgestellter Sitzmöbel')
    }, ({a_vor_c,b_vor_c,a_nach_c,b_nach_c,differenzgrenze_c,gleiche_heizphase}) => {
      const vor=b_vor_c-a_vor_c;
      const nach=b_nach_c-a_nach_c;
      return {frueher_kaltabstand_c:round(vor), spaeter_kaltabstand_c:round(nach),
        beide_abstaende_ueber_grenze:gleiche_heizphase ? Math.min(vor,nach)>differenzgrenze_c+1e-9 : null,
        grenze:'Feste Luftmesspunkte sind kein vollständiges Komfortprofil. Zugluft und kalte Oberflächen separat beobachten.'};
    }, {a_vor_c:18.2,b_vor_c:20,a_nach_c:19.1,b_nach_c:20,differenzgrenze_c:1,gleiche_heizphase:true},
    {frueher_kaltabstand_c:1.8,spaeter_kaltabstand_c:0.9,beide_abstaende_ueber_grenze:false}),

  entry('raumkuehlung_beobachteter_erhaltener_anteil',
    'Ermittle, ob eine kurz beobachtete Temperaturverbesserung am selben Ort später noch sichtbar war — Determine how much of an observed temperature gain remained at a later check',
    'zimmer-kuehlen-ohne-installation', {
      basis_c:temp('Raumwert vor der dokumentierten Änderung'),
      bestwert_c:temp('Erste dokumentierte kühlere Ablesung am selben Platz'),
      folgewert_c:temp('Zeitlich späterer Wert desselben Messplatzes'),
      umgebung_nach_demselben_aufbau:yes('Gleicher Sensorort und dokumentierter Aufbau während beider Nachablesungen')
    }, ({basis_c,bestwert_c,folgewert_c,umgebung_nach_demselben_aufbau}) => {
      const gewinn=basis_c-bestwert_c;
      return {anfangsdifferenz_c:round(gewinn),
        erhaltener_anteil_prozent:umgebung_nach_demselben_aufbau && gewinn>0 ? round(100*(basis_c-folgewert_c)/gewinn) : null,
        grenze:'Negative Werte zeigen ein Überschreiten der ursprünglichen Basis, mehr als 100 Prozent eine zusätzliche Abnahme. Nur Stichprobenwerte.'};
    }, {basis_c:29,bestwert_c:27,folgewert_c:28.5,umgebung_nach_demselben_aufbau:true},
    {anfangsdifferenz_c:2,erhaltener_anteil_prozent:25}),

  entry('dachraum_messreihe_vorhang_zwei_ruecknahmeproben',
    'Prüfe, ob ein beobachteter Temperaturvorteil beim Rückwechsel der Beschattung erneut verloren ging — Check whether reversing a shading change also reversed the observed temperature movement',
    'dachgeschoss-kuehlen', {
      start_ohne_c:temp('Vorher gemessener Wert ohne die Änderung'),
      zwischen_mit_c:temp('Wert nach dem Einschalten der Beschattung'),
      zurueck_ohne_c:temp('Wert nach der beobachteten Rückkehr zum vorherigen Aufbau'),
      aenderungsgrenze_c:small('Eigene erforderliche Mindestdifferenz je Schritt'),
      randbedingung_reproduziert:yes('Sensorort, Zeitabstände und vergleichbare äußere Bedingungen sind festgehalten')
    }, ({start_ohne_c,zwischen_mit_c,zurueck_ohne_c,aenderungsgrenze_c,randbedingung_reproduziert}) => {
      const hin=start_ohne_c-zwischen_mit_c;
      const zurueck=zurueck_ohne_c-zwischen_mit_c;
      return {richtung_in_beiden_schritten_passend:randbedingung_reproduziert ? Math.min(hin,zurueck)>aenderungsgrenze_c+1e-9 : null,
        verlust_nach_rueckwechsel_c:round(zurueck),
        grenze:'Drei Beobachtungspunkte mit zwei Schaltungen. Helligkeit, Sonne und Wärmespeicherung können sich trotzdem geändert haben.'};
    }, {start_ohne_c:30,zwischen_mit_c:28.8,zurueck_ohne_c:29.7,aenderungsgrenze_c:0.4,randbedingung_reproduziert:true},
    {richtung_in_beiden_schritten_passend:true,verlust_nach_rueckwechsel_c:0.9})
];
