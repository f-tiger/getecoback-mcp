const garage = '/guide/infrarotheizung-garage.html';
const fan = '/guide/heizluefter-stromsparend.html';
const thermostat = '/guide/infrarotheizung-thermostat.html';
const panel = '/guide/infrarotheizung-decke-oder-wand.html';
const office = '/guide/homeoffice-warm-bleiben.html';

const quantity = (description, minimum=0, maximum=1000000) => ({type:'number',minimum,maximum,description});
const minutes = description => quantity(description,0,1440);
const temperature = description => quantity(description,-40,100);
const difference = description => quantity(description,0,100);
const flag = description => ({type:'boolean',description});
const choice = (description,...values) => ({type:'string',enum:values,description});
const rounded = value => Math.round(value * 10000) / 10000 + 0;
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Anzahlen erforderlich.');
}
function task(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const punktwaerme = [
  task('punktwaerme_aufgabenzeit_ausfallursachen',
    'Die dokumentierte Arbeitszeit ohne gewünschte Punktwärme nach Vorlauf, Platzwechsel und offenem Rest aufteilen — Account for distinct sources of missing comfort during an attended task.',
    garage,{
      aufgabe_min:minutes('Tatsächlich beaufsichtigte Arbeitsminuten.'),
      passend_min:minutes('Davon Minuten mit bestätigter Wärme an deinem tatsächlichen Platz.'),
      zu_frueh_am_platz_min:minutes('Minuten ohne gewünschte Wärme vor dem ersten Erreichen, bereits anwesend.'),
      platzferne_min:minutes('Weitere Minuten ohne gewünschte Wärme außerhalb des beobachteten Wärmebereichs.'),
    },({aufgabe_min,passend_min,zu_frueh_am_platz_min,platzferne_min})=>{
      const rest=aufgabe_min-passend_min-zu_frueh_am_platz_min-platzferne_min;
      if (rest< -1e-9) throw new RangeError('Die exklusiven Teilzeiten übersteigen die Beobachtung.');
      return {ohne_passende_waerme_min:rounded(aufgabe_min-passend_min),ursache_offen_min:rounded(Math.max(0,rest)),
        groesserer_bekannter_anteil:zu_frueh_am_platz_min===platzferne_min?'gleich':zu_frueh_am_platz_min>platzferne_min?'vorlauf':'platzferne',
        hinweis:'Minuten nur einmal zuordnen. Daraus folgt keine allgemeine Bewertung des Heizgeräts.'};
    },{aufgabe_min:60,passend_min:34,zu_frueh_am_platz_min:8,platzferne_min:12},
    {ohne_passende_waerme_min:26,ursache_offen_min:6,groesserer_bekannter_anteil:'platzferne'}),

  task('punktwaerme_durchgehende_arbeitsphase_nachweis',
    'Ein Wärmefenster auf durchgehend nutzbare Dauer prüfen, auch wenn die Gesamtdauer groß genug erscheint — Distinguish a usable uninterrupted comfort run from summed fragmented minutes.',
    garage,{
      gesamt_geeignet_min:minutes('Summe aller beobachteten getrennten Zeiträume mit für die Person passender Wärme.'),
      laengster_geeigneter_block_min:minutes('Längster ohne Unterbrechung am Platz beobachteter geeigneter Block.'),
      benoetigt_am_stueck_min:minutes('Selbst festgelegte, tatsächlich benötigte Dauer ohne Unterbrechung.'),
      protokoll_lueckenlos:flag('Ist die Reihenfolge einschließlich möglicher kurzer Unterbrechungen vollständig erfasst?'),
    },({gesamt_geeignet_min,laengster_geeigneter_block_min,benoetigt_am_stueck_min,protokoll_lueckenlos})=>{
      if (laengster_geeigneter_block_min>gesamt_geeignet_min||!benoetigt_am_stueck_min) throw new RangeError();
      return {summe_reicht:gesamt_geeignet_min>=benoetigt_am_stueck_min,
        zusammenhaengend_belegt:protokoll_lueckenlos?laengster_geeigneter_block_min>=benoetigt_am_stueck_min:null,
        luecke_zum_langen_block_min:protokoll_lueckenlos?rounded(Math.max(0,benoetigt_am_stueck_min-laengster_geeigneter_block_min)):null,
        hinweis:'Beurteilt nur das aufgezeichnete Sitzungsfenster und die eigene Anforderung.'};
    },{gesamt_geeignet_min:40,laengster_geeigneter_block_min:18,benoetigt_am_stueck_min:25,protokoll_lueckenlos:true},
    {summe_reicht:true,zusammenhaengend_belegt:false,luecke_zum_langen_block_min:7}),

  task('punktwaerme_eintritt_waermefenster_drei_grenzen',
    'Bei unscharf protokollierter Ankunft ermitteln, ob das beobachtete Wärmefenster im ungünstigsten Fall bis zum Arbeitsende reicht — Bound usable overlap for an uncertain arrival with a fixed attended task duration.',
    garage,{
      warm_ab_min:minutes('Beginn des dokumentiert geeigneten Wärmefensters am Arbeitsplatz.'),
      warm_bis_min:minutes('Ende desselben ohne Unterbrechung geeigneten Fensters.'),
      ankunft_frueh_min:minutes('Frühestmöglicher Start der Arbeit auf derselben Zeitachse.'),
      ankunft_spaet_min:minutes('Spätestmöglicher Start auf derselben Zeitachse.'),
      aufgabe_dauer_min:minutes('Gleiche Arbeitsdauer unabhängig vom Start.'),
    },({warm_ab_min,warm_bis_min,ankunft_frueh_min,ankunft_spaet_min,aufgabe_dauer_min})=>{
      if (warm_ab_min>=warm_bis_min||ankunft_frueh_min>ankunft_spaet_min||!aufgabe_dauer_min) throw new RangeError();
      const overlap=start=>Math.max(0,Math.min(warm_bis_min,start+aufgabe_dauer_min)-Math.max(warm_ab_min,start));
      const bestStart=Math.min(ankunft_spaet_min,Math.max(ankunft_frueh_min,warm_ab_min));
      const min=Math.min(overlap(ankunft_frueh_min),overlap(ankunft_spaet_min));
      return {garantiert_im_messfenster_min:rounded(min),maximal_im_messfenster_min:rounded(overlap(bestStart)),
        jede_ankunft_passt:min>=aufgabe_dauer_min-1e-9,
        hinweis:'Nur zeitliche Auswertung eines beobachteten Fensters. Keine Annahme über gleiches Wärmeverhalten in einem späteren Versuch.'};
    },{warm_ab_min:20,warm_bis_min:70,ankunft_frueh_min:15,ankunft_spaet_min:55,aufgabe_dauer_min:30},
    {garantiert_im_messfenster_min:15,maximal_im_messfenster_min:30,jede_ankunft_passt:false}),

  task('thermostat_punktwaerme_offset_moduswechsel',
    'Den Fühlerabstand zum Arbeitsort bei ruhendem und aktivem Panel getrennt prüfen — Separate an active-state sensor offset from a resting-location difference.',
    thermostat,{
      fuehler_ruhe_c:temperature('Synchroner Thermostatwert im ersten stabilen Ruhezustand.'),
      platz_ruhe_c:temperature('Zeitgleicher Lufttemperaturwert am Arbeitsort.'),
      fuehler_aktiv_c:temperature('Thermostatwert im späteren stabilen aktiven Zustand.'),
      platz_aktiv_c:temperature('Zeitgleicher Lufttemperaturwert am Arbeitsort im aktiven Zustand.'),
      messspielraum_c:difference('Begründeter Spielraum für die Differenz zwischen den beiden Abstandsbeobachtungen.'),
      beide_paare_vergleichbar:flag('Gleiche Messorte und vergleichbare Messgeräte, Luftmessung nach Anleitung?'),
    },({fuehler_ruhe_c,platz_ruhe_c,fuehler_aktiv_c,platz_aktiv_c,messspielraum_c,beide_paare_vergleichbar})=>{
      const passive=fuehler_ruhe_c-platz_ruhe_c;
      const active=fuehler_aktiv_c-platz_aktiv_c;
      const delta=active-passive;
      return {offset_ruhe_c:beide_paare_vergleichbar?rounded(passive):null,offset_aktiv_c:beide_paare_vergleichbar?rounded(active):null,
        ein_offset_reicht_beobachtet:beide_paare_vergleichbar?Math.abs(delta)<=messspielraum_c+1e-9:null,
        hinweis:'Nur Messwerte einordnen. Sonnenlicht, Luftzug und Aufstellort unabhängig dokumentieren.'};
    },{fuehler_ruhe_c:19,platz_ruhe_c:18.5,fuehler_aktiv_c:23,platz_aktiv_c:20,messspielraum_c:1,beide_paare_vergleichbar:true},
    {offset_ruhe_c:0.5,offset_aktiv_c:3,ein_offset_reicht_beobachtet:false}),

  task('thermostat_schaltfolge_platzband_asymmetrie',
    'Schaltpunkte einer stabil protokollierten Folge mit dem Zielband am persönlichen Nutzplatz abgleichen — Distinguish a documented late switch-on from late switch-off at the occupied spot.',
    thermostat,{
      platz_beim_ein_c:temperature('Am Arbeitsplatz synchron beobachteter Wert genau beim Einschalten.'),
      platz_beim_aus_c:temperature('Dort gleichzeitig gemessener Wert genau beim nächsten Ausschalten.'),
      platz_min_ziel_c:temperature('Eigene untere Lufttemperaturgrenze am Arbeitsplatz.'),
      platz_max_ziel_c:temperature('Eigene obere Lufttemperaturgrenze am Arbeitsplatz.'),
      echte_schaltfolge:flag('Vollständige bestätigte Schaltfolge desselben Programms und unveränderte Messpositionen?'),
    },({platz_beim_ein_c,platz_beim_aus_c,platz_min_ziel_c,platz_max_ziel_c,echte_schaltfolge})=>{
      if (platz_min_ziel_c>platz_max_ziel_c) throw new RangeError();
      return {beim_einschalten_untergrenze_unterschritten_c:echte_schaltfolge?rounded(Math.max(0,platz_min_ziel_c-platz_beim_ein_c)):null,
        beim_ausschalten_obergrenze_ueberschritten_c:echte_schaltfolge?rounded(Math.max(0,platz_beim_aus_c-platz_max_ziel_c)):null,
        hinweis:'Nur die Schaltaugenblicke prüfen. Temperaturminimum und -maximum können zwischen Schaltungen liegen.'};
    },{platz_beim_ein_c:17.4,platz_beim_aus_c:21.7,platz_min_ziel_c:18,platz_max_ziel_c:21,echte_schaltfolge:true},
    {beim_einschalten_untergrenze_unterschritten_c:0.6,beim_ausschalten_obergrenze_ueberschritten_c:0.7}),

  task('thermostat_unauflosbare_kleine_stufen',
    'Zwei belegte benachbarte Einstellstufen darauf prüfen, ob sich beide am Arbeitsort trotz Messspielraum wirklich unterscheiden — Test whether measured desk temperatures resolve one documented control step.',
    thermostat,{
      stufe_niedrig_c:temperature('Tatsächlich gewählte niedrigere Stufe in °C.'),
      stufe_hoch_c:temperature('Tatsächlich gewählte nächsthöhere Stufe in °C.'),
      platz_niedrig_c:temperature('Unter der niedrigeren Einstellung dokumentiertes Mittel am Nutzplatz.'),
      platz_hoch_c:temperature('Dort gemessenes Mittel bei höherer Einstellung.'),
      gesamtspielraum_c:difference('Begründeter maximaler kombinierter Fehler der Differenz.'),
      zeitfenster_match:flag('Gleicher Nutzungskontext und stabile, vergleichbare Messfenster?'),
    },({stufe_niedrig_c,stufe_hoch_c,platz_niedrig_c,platz_hoch_c,gesamtspielraum_c,zeitfenster_match})=>{
      if (stufe_hoch_c<=stufe_niedrig_c) throw new RangeError();
      const shift=platz_hoch_c-platz_niedrig_c;
      return {belegte_stufendifferenz_c:rounded(stufe_hoch_c-stufe_niedrig_c),platzdifferenz_c:zeitfenster_match?rounded(shift):null,
        status:!zeitfenster_match?'vergleich_offen':shift>gesamtspielraum_c+1e-9?'hoehere_stufe_am_platz_waermer':shift< -gesamtspielraum_c-1e-9?'gegenlaeufige_beobachtung':'differenz_nicht_aufgeloest',
        hinweis:'Der Befund legt keine Einstellung fest und belegt keine dauerhafte Genauigkeit.'};
    },{stufe_niedrig_c:18,stufe_hoch_c:19,platz_niedrig_c:18.1,platz_hoch_c:18.5,gesamtspielraum_c:0.5,zeitfenster_match:true},
    {belegte_stufendifferenz_c:1,platzdifferenz_c:0.4,status:'differenz_nicht_aufgeloest'}),

  task('punktwaerme_routenvergleich_einzelplatz_dominiert',
    'Zwischen einem festen Arbeitsplatz und einer gemessenen Ausweichroute unterscheiden, wenn die Erfolgsquote nur am Hauptplatz überzeugt — Test whether point comfort persists across actual task-location changes.',
    panel,{
      haupt_min:minutes('Tatsächliche Nutzungsdauer am festen Hauptplatz.'),
      haupt_passend_min:minutes('Dort tatsächlich komfortabel protokollierte Dauer.'),
      route_min:minutes('Zeit abseits des Hauptplatzes auf der dokumentierten üblichen Route.'),
      route_passend_min:minutes('Auf der Route als passend erfasste Dauer.'),
      zielquote_prozent:quantity('Eigene nötige Quote an beiden Orten, Prozent.',0,100),
    },({haupt_min,haupt_passend_min,route_min,route_passend_min,zielquote_prozent})=>{
      if (haupt_passend_min>haupt_min||route_passend_min>route_min) throw new RangeError();
      const main=haupt_min?100*haupt_passend_min/haupt_min:null;
      const route=route_min?100*route_passend_min/route_min:null;
      return {hauptquote:main===null?null:rounded(main),routenquote:route===null?null:rounded(route),
        nur_hauptplatz_erfuellt:main===null||route===null?null:main>=zielquote_prozent&&route<zielquote_prozent,
        hinweis:'Personengebundene Beobachtungen, keine Karte der Strahlungsleistung oder Montageempfehlung.'};
    },{haupt_min:35,haupt_passend_min:32,route_min:20,route_passend_min:8,zielquote_prozent:80},
    {hauptquote:91.4286,routenquote:40,nur_hauptplatz_erfuellt:true}),

  task('punktwaerme_aufgabenmix_ungepruefte_kaltphase',
    'Vor der Übertragung einer Werkstattmessung ermitteln, welche tatsächlich vorkommenden Startbedingungen noch keinen passenden Versuch haben — Audit coverage of real cold-start task classes.',
    garage,{
      mild_aufgaben:quantity('Zahl vergangener beaufsichtigter Arbeitsblöcke in der selbst definierten milden Startklasse.'),
      kalt_aufgaben:quantity('Zahl solcher Blöcke in der eigenen kalten Startklasse.'),
      mild_mit_messung:quantity('Davon milde Blöcke mit vollständigem vergleichbarem Wärmeprotokoll.'),
      kalt_mit_messung:quantity('Davon kalte Blöcke mit vollständigem vergleichbarem Wärmeprotokoll.'),
    },({mild_aufgaben,kalt_aufgaben,mild_mit_messung,kalt_mit_messung})=>{
      whole(mild_aufgaben,kalt_aufgaben,mild_mit_messung,kalt_mit_messung);
      if (mild_mit_messung>mild_aufgaben||kalt_mit_messung>kalt_aufgaben) throw new RangeError();
      const total=mild_aufgaben+kalt_aufgaben;
      const whollyMissing=(mild_mit_messung?0:mild_aufgaben)+(kalt_mit_messung?0:kalt_aufgaben);
      return {milde_faelle_offen:mild_aufgaben-mild_mit_messung,kalte_faelle_offen:kalt_aufgaben-kalt_mit_messung,
        anteil_ohne_passenden_versuch_prozent:total?rounded(100*whollyMissing/total):null,
        hinweis:'Auch mehrere dokumentierte Fälle beweisen keine Vergleichbarkeit anderer Arbeitseinsätze.'};
    },{mild_aufgaben:8,kalt_aufgaben:4,mild_mit_messung:5,kalt_mit_messung:0},
    {milde_faelle_offen:3,kalte_faelle_offen:4,anteil_ohne_passenden_versuch_prozent:33.3333}),

  task('punktwaerme_kurzpause_messwert_fluktuation',
    'Eine bereits beobachtete Heizpause anhand dreier Ablesungen darauf prüfen, ob sichtbare Erholung den zwischenzeitlichen Einbruch verdeckte — Flag a transient comfort-temperature dip absent from the endpoint comparison.',
    fan,{
      vor_pause_c:temperature('Temperatur am Arbeitsplatz unmittelbar vor der dokumentierten beheizungsfreien Kurzpause.'),
      tiefster_c:temperature('Tiefster tatsächlich protokollierter Temperaturwert am selben Platz in der Pause.'),
      nach_pause_c:temperature('Dort beobachteter Wert nach der Pause am festgelegten Vergleichszeitpunkt.'),
      mindestziel_c:temperature('Eigene Mindesttemperatur für dieselbe Messgröße.'),
      vergleichbar:flag('Gleicher Messort, abgesicherte Reihenfolge und ausreichende Beobachtungsauflösung?'),
    },({vor_pause_c,tiefster_c,nach_pause_c,mindestziel_c,vergleichbar})=>{
      if (!vergleichbar) return {einbruch_durch_endpunkte_verdeckt:null,tiefstes_defizit_c:null};
      if (tiefster_c>Math.min(vor_pause_c,nach_pause_c)) throw new RangeError('Der eingetragene niedrigste Wert muss beide Endpunkte berücksichtigen.');
      return {einbruch_durch_endpunkte_verdeckt:Math.min(vor_pause_c,nach_pause_c)>=mindestziel_c&&tiefster_c<mindestziel_c,
        tiefstes_defizit_c:rounded(Math.max(0,mindestziel_c-tiefster_c)),
        hinweis:'Aufgezeichneter niedrigster Wert. Zwischen unbeobachteten Zeitpunkten kann die Temperatur weiter abgewichen sein.'};
    },{vor_pause_c:21,tiefster_c:18.2,nach_pause_c:20.1,mindestziel_c:19,vergleichbar:true},
    {einbruch_durch_endpunkte_verdeckt:true,tiefstes_defizit_c:0.8}),

  task('punktwaerme_fehlerspielraum_tuerphase_kontrolliert',
    'Ein protokolliertes Wiedererreichen des persönlichen Wärmeziels nach Türöffnung gegen erneute Störungen abgrenzen — Find the recovery attempts whose duration is censored by repeated door openings.',
    garage,{
      beobachtungen:quantity('Zahl aller beobachteten Türschließungen mit anschließendem Blick auf den Nutzplatz.'),
      ziel_vor_neuer_oeffnung:quantity('Fälle mit erneut erreichtem Wärmeziel vor der nächsten Öffnung.'),
      neu_geoeffnet_vor_ziel:quantity('Andere Fälle, in denen eine weitere Öffnung einsetzte, bevor erneute Zielerreichung beobachtet wurde.'),
      unbeobachtet_beendet:quantity('Übrige vor Abschluss abgebrochene Beobachtungen.'),
    },({beobachtungen,ziel_vor_neuer_oeffnung,neu_geoeffnet_vor_ziel,unbeobachtet_beendet})=>{
      whole(beobachtungen,ziel_vor_neuer_oeffnung,neu_geoeffnet_vor_ziel,unbeobachtet_beendet);
      if (ziel_vor_neuer_oeffnung+neu_geoeffnet_vor_ziel+unbeobachtet_beendet>beobachtungen) throw new RangeError();
      return {vollendete_erholung_belegt:ziel_vor_neuer_oeffnung,
        durch_neue_oeffnung_rechtszensiert:neu_geoeffnet_vor_ziel,
        protokoll_ohne_abschluss:unbeobachtet_beendet,weitere_status_offen:beobachtungen-ziel_vor_neuer_oeffnung-neu_geoeffnet_vor_ziel-unbeobachtet_beendet,
        hinweis:'Aus unvollständig beobachteten Fällen keine mittlere Aufwärmdauer ableiten.'};
    },{beobachtungen:10,ziel_vor_neuer_oeffnung:4,neu_geoeffnet_vor_ziel:3,unbeobachtet_beendet:2},
    {vollendete_erholung_belegt:4,durch_neue_oeffnung_rechtszensiert:3,protokoll_ohne_abschluss:2,weitere_status_offen:1}),

  task('punktwaerme_zusatzkomfort_nur_neue_minuten',
    'Zusatzkosten für erstmals als passend empfundene Minuten am Platz berechnen und zugleich verlorene Minuten sichtbar machen — Price genuinely new comfortable minutes in a matched baseline and trial timeline.',
    office,{
      basis_passend_min:minutes('Am Nutzplatz geeignete Minuten im Vergleich ohne Zusatzgerät.'),
      mit_passend_min:minutes('Geeignete Minuten der zeitgleich gepaarten Positionen im Versuch mit Zusatzgerät.'),
      in_beiden_passend_min:minutes('Identische Positionen im Ablauf, die in beiden Zeitreihen als passend protokolliert wurden.'),
      zusatz_kwh:quantity('Gemessener zusätzlicher Strombedarf des Versuchs.'),
      preis_cent_kwh:quantity('Belegter Arbeitspreis, Cent/kWh.',0,1000),
      aufgabe_und_start_match:flag('Gleicher Arbeitsablauf, gepaarte Zeitpunkte und vergleichbare Startlage?'),
    },({basis_passend_min,mit_passend_min,in_beiden_passend_min,zusatz_kwh,preis_cent_kwh,aufgabe_und_start_match})=>{
      if (in_beiden_passend_min>Math.min(basis_passend_min,mit_passend_min)) throw new RangeError();
      if (!aufgabe_und_start_match) return {neue_min:null,verlorene_min:null,cent_pro_neuer_min:null};
      const gained=mit_passend_min-in_beiden_passend_min;
      return {neue_min:rounded(gained),verlorene_min:rounded(basis_passend_min-in_beiden_passend_min),
        cent_pro_neuer_min:gained?rounded(zusatz_kwh*preis_cent_kwh/gained):null,
        hinweis:'Kennzahl nur für die gepaarten Beobachtungen. Berücksichtigt keine andere Raumheizlast.'};
    },{basis_passend_min:25,mit_passend_min:45,in_beiden_passend_min:20,zusatz_kwh:0.25,preis_cent_kwh:40,aufgabe_und_start_match:true},
    {neue_min:25,verlorene_min:5,cent_pro_neuer_min:0.4}),

  task('punktwaerme_abschattung_referenzgain',
    'Die Änderung am abgeschatteten Arbeitsplatz in Relation zur separat protokollierten freien Sicht einordnen — Compare two measured local surface gains after subtracting their respective start readings.',
    panel,{
      start_frei_c:temperature('Anfangswert derselben Messfläche beim bereits zulässig beobachteten Lauf ohne Abschattung.'),
      ende_frei_c:temperature('Endwert dieser Fläche beim freien Lauf.'),
      start_schatten_c:temperature('Anfangswert beim separaten Lauf mit beobachteter Abschattung.'),
      ende_schatten_c:temperature('Endwert derselben Fläche bei der Abschattung.'),
      vergleich_bestaetigt:flag('Gleiches Messmaterial, gleiche Laufdauer, sonstige Randbedingungen und bestätigte Konfiguration?'),
    },({start_frei_c,ende_frei_c,start_schatten_c,ende_schatten_c,vergleich_bestaetigt})=>{
      const free=ende_frei_c-start_frei_c;
      const shadow=ende_schatten_c-start_schatten_c;
      return {frei_zunahme_c:vergleich_bestaetigt?rounded(free):null,schatten_zunahme_c:vergleich_bestaetigt?rounded(shadow):null,
        schatten_zu_frei_prozent:vergleich_bestaetigt&&free>0&&shadow>=0?rounded(100*shadow/free):null,
        hinweis:'Gemessene Änderung einer Fläche. Daraus folgen weder Strahlungswirkungsgrad noch Montagefreigabe.'};
    },{start_frei_c:15,ende_frei_c:21,start_schatten_c:16,ende_schatten_c:18,vergleich_bestaetigt:true},
    {frei_zunahme_c:6,schatten_zunahme_c:2,schatten_zu_frei_prozent:33.3333}),

  task('punktwaerme_messraster_zonen_verteilung_spannweite',
    'Punktwärme an drei festen Nutzorten nach beobachteter räumlicher Gleichmäßigkeit einordnen — Identify nonuniform outcomes without averaging away a required spot.',
    panel,{
      platz_a_c:temperature('Synchrone Temperatur am ersten verpflichtend genutzten Punkt.'),
      platz_b_c:temperature('Synchrone Temperatur am zweiten solchen Punkt.'),
      platz_c_c:temperature('Synchrone Temperatur am dritten solchen Punkt.'),
      ortsziel_c:temperature('Einheitliche selbst gewählte Untergrenze für alle drei Punkte.'),
      abstand_max_c:difference('Akzeptierte größte Differenz zwischen den Punktmessungen.'),
      messgroesse_und_zeit_gleich:flag('Sind alle Beobachtungen dieselbe Temperaturmessgröße und derselbe Zeitpunkt?'),
    },({platz_a_c,platz_b_c,platz_c_c,ortsziel_c,abstand_max_c,messgroesse_und_zeit_gleich})=>{
      if (!messgroesse_und_zeit_gleich) return {unter_ziel:null,gleichmaessig_im_eigenen_massstab:null};
      const points=[['A',platz_a_c],['B',platz_b_c],['C',platz_c_c]];
      const range=Math.max(platz_a_c,platz_b_c,platz_c_c)-Math.min(platz_a_c,platz_b_c,platz_c_c);
      return {unter_ziel:points.filter(([,temp])=>temp<ortsziel_c).map(([spot])=>spot),
        spannweite_c:rounded(range),gleichmaessig_im_eigenen_massstab:range<=abstand_max_c+1e-9,
        hinweis:'Stichpunkte zeigen Unterschiede, keine flächendeckende Wärmeverteilung.'};
    },{platz_a_c:19,platz_b_c:22,platz_c_c:20,ortsziel_c:20,abstand_max_c:2,messgroesse_und_zeit_gleich:true},
    {unter_ziel:['A'],spannweite_c:3,gleichmaessig_im_eigenen_massstab:false}),

  task('thermostat_nachlauf_oberziel_zeitordnung',
    'Höchstwert am Platz zeitlich zur dokumentierten Abschaltung einordnen und nur belegtes Überschwingen ausweisen — Locate observed post-switch overshoot separately from a thermostat cutoff reading.',
    thermostat,{
      aus_min:minutes('Zeitpunkt der bestätigten Abschaltung im Messfenster.'),
      maximum_min:minutes('Zeitpunkt des höchsten lokal beobachteten Werts im selben Fenster.'),
      am_aus_c:temperature('Lokaler Messwert bei der Abschaltung.'),
      am_max_c:temperature('Höchster lokal gemessener Wert im Fenster.'),
      oberziel_c:temperature('Eigene obere Temperaturgrenze.'),
      kein_neuer_start_bis_max:flag('Bis zum Maximum nach dem Ausschalten war kein Neustart oder zusätzlicher Wärmeeintrag dokumentiert?'),
    },({aus_min,maximum_min,am_aus_c,am_max_c,oberziel_c,kein_neuer_start_bis_max})=>{
      if (am_aus_c>am_max_c) throw new RangeError();
      const delay=maximum_min-aus_min;
      return {maximum_relativ_aus_min:rounded(delay),nur_danach_ueber_eigenem_ziel:delay>0&&kein_neuer_start_bis_max?am_aus_c<=oberziel_c&&am_max_c>oberziel_c:null,
        weiteranstieg_nach_aus_c:delay>0&&kein_neuer_start_bis_max?rounded(am_max_c-am_aus_c):null,
        hinweis:'Größere Werte können durch Wärmeträgheit oder andere Einflussfaktoren entstehen. Keine Aussage zur Geräteeinstellung.'};
    },{aus_min:40,maximum_min:46,am_aus_c:20.8,am_max_c:21.6,oberziel_c:21,kein_neuer_start_bis_max:true},
    {maximum_relativ_aus_min:6,nur_danach_ueber_eigenem_ziel:true,weiteranstieg_nach_aus_c:0.8}),

  task('heizluefter_arbeitsstufe_reproduzierbarer_erfolg',
    'Tatsächlich getestete Heizstufen vor einem Energievergleich auf vollständige Erfolge in allen passenden Wiederholungen prüfen — Compare observed stage costs only after the same task passed in every matched trial.',
    fan,{
      a_versuche:quantity('Zahl vollständiger vergleichbarer Beobachtungen auf Stufe A.',2),
      b_versuche:quantity('Zahl vollständiger vergleichbarer Beobachtungen auf Stufe B.',2),
      a_erfolge:quantity('Beobachtungen A, die das identische persönliche Sitzungsziel vollständig erreichten.'),
      b_erfolge:quantity('Beobachtungen B mit vollständiger Zielerreichung.'),
      a_mittel_wh:quantity('Gemessener mittlerer Energieaufwand A über alle ihre Beobachtungen.'),
      b_mittel_wh:quantity('Gemessener mittlerer Energieaufwand B über alle ihre Beobachtungen.'),
      protokoll_paarig:flag('Sind die Beobachtungen bezüglich Wärmeaufgabe und Startbedingungen paarweise vergleichbar?'),
    },({a_versuche,b_versuche,a_erfolge,b_erfolge,a_mittel_wh,b_mittel_wh,protokoll_paarig})=>{
      whole(a_versuche,b_versuche,a_erfolge,b_erfolge);
      if (a_erfolge>a_versuche||b_erfolge>b_versuche) throw new RangeError();
      const usable=protokoll_paarig&&a_versuche===b_versuche;
      return {protokolle_paarig_auswertbar:usable,a_in_jedem_paar_passend:usable?a_erfolge===a_versuche:null,
        b_in_jedem_paar_passend:usable?b_erfolge===b_versuche:null,
        gemessene_delta_wh_nur_bei_voller_zielerreichung:usable&&a_erfolge===a_versuche&&b_erfolge===b_versuche?rounded(b_mittel_wh-a_mittel_wh):null,
        hinweis:'Scheitern oder Erfolg gilt nur für die dokumentierten Fälle und individuellen Ziele.'};
    },{a_versuche:3,b_versuche:3,a_erfolge:2,b_erfolge:3,a_mittel_wh:210,b_mittel_wh:260,protokoll_paarig:true},
    {protokolle_paarig_auswertbar:true,a_in_jedem_paar_passend:false,b_in_jedem_paar_passend:true,gemessene_delta_wh_nur_bei_voller_zielerreichung:null}),

  task('punktwaerme_personenurteil_stichproben_einigung',
    'Bei zwei Personen neben der beobachteten Übereinstimmung eine nach Antwortverteilung korrigierte Übereinstimmung ausweisen — Check whether independent comfort judgements agree beyond their marginal response patterns.',
    office,{
      beide_passend:quantity('Zahl gepaarter Zeitpunkte, an denen beide Personen passende Wärme notierten.'),
      nur_a_passend:quantity('Zahl der Zeitpunkte mit passender Wärme nur laut Person A.'),
      nur_b_passend:quantity('Zahl der Zeitpunkte mit passender Wärme nur laut B.'),
      beide_nicht_passend:quantity('Zahl der Zeitpunkte, an denen beide unpassende Wärme notierten.'),
      zeit_und_aufgabe_match:flag('Verglichen beide dieselben Zeitpunkte und dieselbe Arbeit unabhängig voneinander?'),
    },({beide_passend,nur_a_passend,nur_b_passend,beide_nicht_passend,zeit_und_aufgabe_match})=>{
      whole(beide_passend,nur_a_passend,nur_b_passend,beide_nicht_passend);
      const total=beide_passend+nur_a_passend+nur_b_passend+beide_nicht_passend;
      if (!total||!zeit_und_aufgabe_match) return {uebereinstimmung_prozent:null,kappa:null};
      const observed=(beide_passend+beide_nicht_passend)/total;
      const a=(beide_passend+nur_a_passend)/total;
      const b=(beide_passend+nur_b_passend)/total;
      const expected=a*b+(1-a)*(1-b);
      return {uebereinstimmung_prozent:rounded(100*observed),kappa:expected<1?rounded((observed-expected)/(1-expected)):null,
        hinweis:'Nur deskriptive Übereinstimmung dieser Einschätzungen. Kein Nachweis allgemeiner Verträglichkeit oder Raumkomforts.'};
    },{beide_passend:4,nur_a_passend:1,nur_b_passend:1,beide_nicht_passend:4,zeit_und_aufgabe_match:true},
    {uebereinstimmung_prozent:80,kappa:0.6}),

  task('punktwaerme_vorlaufgrenze_beobachtung_vor_erstkontakt',
    'Erste passende Wärme bei verspätetem ersten Check als Zeitspanne einordnen — Preserve left-censoring when the first comfort observation already meets the target.',
    garage,{
      start_min:minutes('Beginn des protokollierten beaufsichtigten Laufs.'),
      erste_pruefung_min:minutes('Zeitpunkt der ersten tatsächlichen Wärmeprüfung am Platz.'),
      erste_passende_min:minutes('Erster dokumentierter Zeitpunkt mit passender Wärme.'),
      letzte_unpassende_min:minutes('Letzter dokumentierter Zeitpunkt mit unpassender Wärme, sonst Startzeit angeben.'),
      unpassender_wert_belegt:flag('Ist ein tatsächlich beobachteter unpassender Wert vor dem passenden belegt?'),
      anfang_nicht_passend_belegt:flag('War am Anfang durch eine unabhängige Notiz fehlende passende Wärme belegt?'),
    },({start_min,erste_pruefung_min,erste_passende_min,letzte_unpassende_min,unpassender_wert_belegt,anfang_nicht_passend_belegt})=>{
      if (erste_pruefung_min<start_min||erste_passende_min<erste_pruefung_min||
          (unpassender_wert_belegt&&(letzte_unpassende_min<erste_pruefung_min||letzte_unpassende_min>=erste_passende_min))) throw new RangeError();
      const low=unpassender_wert_belegt?letzte_unpassende_min-start_min:anfang_nicht_passend_belegt?0:null;
      return {frueheste_belegbare_dauer_min:low===null?null:rounded(low),spaeteste_belegbare_dauer_min:rounded(erste_passende_min-start_min),
        beim_ersten_check_schon_passend:erste_pruefung_min===erste_passende_min,
        hinweis:'Nur bei bis zur ersten positiven Beobachtung anhaltender Erwärmung. Keine genaue Aufwärmzeit zwischen Messpunkten ableiten.'};
    },{start_min:10,erste_pruefung_min:20,erste_passende_min:20,letzte_unpassende_min:10,unpassender_wert_belegt:false,anfang_nicht_passend_belegt:false},
    {frueheste_belegbare_dauer_min:null,spaeteste_belegbare_dauer_min:10,beim_ersten_check_schon_passend:true}),

  task('thermostat_taktenergie_grundverbrauch_widerspruch',
    'Protokollierte aktive Heizminuten und gemessenen Strom mit getrennt bekannter Nichtheizlast auf Vereinbarkeit prüfen — Check an energy log against a thermostat cycle and explicit baseline range.',
    thermostat,{
      gesamt_wh:quantity('An derselben Messgrenze dokumentierte Energie über das Fenster.'),
      heiz_takt_min:minutes('Protokollierte aktive Taktminuten.'),
      heiz_aktiv_w:quantity('Gemessene mittlere zusätzliche Wirkleistung während aktiver Heizung.',0,50000),
      basis_min_wh:quantity('Unabhängig belegte Mindestenergie des Nichtheizanteils für das gesamte Fenster.'),
      basis_max_wh:quantity('Unabhängig belegte Höchstenergie desselben Nichtheizanteils.'),
      zeiten_und_messgrenze_gleich:flag('Sind alle Werte vollständig, überschneidungsfrei und aus demselben Protokoll?'),
    },({gesamt_wh,heiz_takt_min,heiz_aktiv_w,basis_min_wh,basis_max_wh,zeiten_und_messgrenze_gleich})=>{
      if (basis_min_wh>basis_max_wh) throw new RangeError();
      const rest=gesamt_wh-heiz_takt_min*heiz_aktiv_w/60;
      return {aus_takt_offene_wh:zeiten_und_messgrenze_gleich?rounded(rest):null,
        mit_bekannter_basis_vereinbar:zeiten_und_messgrenze_gleich?rest>=basis_min_wh-1e-9&&rest<=basis_max_wh+1e-9:null,
        hinweis:'Dient zur Plausibilisierung einer bereits vorliegenden Messung. Keine Aussage zur elektrischen Verträglichkeit.'};
    },{gesamt_wh:270,heiz_takt_min:15,heiz_aktiv_w:1000,basis_min_wh:8,basis_max_wh:24,zeiten_und_messgrenze_gleich:true},
    {aus_takt_offene_wh:20,mit_bekannter_basis_vereinbar:true}),

  task('punktwaerme_folgesitzung_beobachtete_restnutzenquote',
    'Eine zweite protokollierte Arbeitsphase darauf prüfen, welcher Teil mit dokumentierter verbleibender Wärme ohne erneuten Lauf auskam — Measure how much confirmed follow-on work used residual warmth.',
    garage,{
      folgenutzung_min:minutes('Vollständig aufgezeichnete zweite Arbeitsphase.'),
      ohne_neustart_passend_min:minutes('Darin geeignete Minuten bei belegt ausgeschalteter früherer Wärmequelle.'),
      nach_neustart_passend_min:minutes('Weitere geeignete Minuten nach einem dokumentierten erneuten Lauf.'),
      restwaerme_vergleichbar:flag('Waren Nutzplatz, Kriterium und Betrieb anderer Wärmequellen unverändert?'),
    },({folgenutzung_min,ohne_neustart_passend_min,nach_neustart_passend_min,restwaerme_vergleichbar})=>{
      const relevant=ohne_neustart_passend_min+nach_neustart_passend_min;
      if (relevant>folgenutzung_min) throw new RangeError();
      return {anteil_der_folgesitzung_passend_ohne_neustart_prozent:restwaerme_vergleichbar&&folgenutzung_min?rounded(100*ohne_neustart_passend_min/folgenutzung_min):null,
        geeignete_zeit_gesamt_min:restwaerme_vergleichbar?rounded(relevant):null,
        hinweis:'Die aufgezeichnete Komfortzeit ist kein universeller Nachwärmewert und belegt keine Einzelursache.'};
    },{folgenutzung_min:40,ohne_neustart_passend_min:18,nach_neustart_passend_min:12,restwaerme_vergleichbar:true},
    {anteil_der_folgesitzung_passend_ohne_neustart_prozent:45,geeignete_zeit_gesamt_min:30}),

  task('punktwaerme_verdeckter_unterschied_koerperzonen',
    'Eine Gesamtbeurteilung auf gegenläufige persönliche Wärmeeindrücke an Händen und Füßen prüfen — Retain oppositely changing body-zone comfort instead of averaging it into one result.',
    office,{
      haende_vorher:choice('Beobachtung ohne Zusatzwärme an den Händen.','passend','unpassend','offen'),
      fuesse_vorher:choice('Beobachtung ohne Zusatzwärme an den Füßen.','passend','unpassend','offen'),
      haende_nachher:choice('Beobachtung im Vergleichsversuch an den Händen.','passend','unpassend','offen'),
      fuesse_nachher:choice('Beobachtung im Vergleichsversuch an den Füßen.','passend','unpassend','offen'),
      selbe_aufgabe:flag('Vergleichbare Aktivität, Kleidung und Bewertungsweise?'),
    },({haende_vorher,fuesse_vorher,haende_nachher,fuesse_nachher,selbe_aufgabe})=>{
      if (!selbe_aufgabe||[haende_vorher,fuesse_vorher,haende_nachher,fuesse_nachher].includes('offen')) return {status:'vergleich_offen'};
      const a=Number(haende_nachher==='passend')-Number(haende_vorher==='passend');
      const b=Number(fuesse_nachher==='passend')-Number(fuesse_vorher==='passend');
      return {status:a*b<0?'gegenlaeufige_verbesserung':'kein_gegenlaeufiger_wechsel',haende_verbessert:a>0,fuesse_verbessert:b>0,
        hinweis:'Beobachtung einer Person, kein medizinischer Befund und keine Gerätefreigabe.'};
    },{haende_vorher:'unpassend',fuesse_vorher:'passend',haende_nachher:'passend',fuesse_nachher:'unpassend',selbe_aufgabe:true},
    {status:'gegenlaeufige_verbesserung',haende_verbessert:true,fuesse_verbessert:false}),

  task('punktwaerme_nach_aus_unterschreitung_beobachtungsband',
    'Den Zeitpunkt nach dem Abschalten eingrenzen, an dem die Arbeitsplatztemperatur unter das eigene Ziel sank — Bracket an observed decay crossing without assuming a cooling rate.',
    garage,{
      start_c:temperature('Erste Temperatur am Platz unmittelbar nach dem bestätigten Ausschalten.'),
      ziel_c:temperature('Eigene untere Arbeitsgrenze für dieselbe Messgröße.'),
      letzter_passender_min:minutes('Letzter belegter Zeitpunkt nach Ausschalten mit Wert auf oder über dem Ziel.'),
      erster_unpassender_min:minutes('Erster belegter Zeitpunkt darunter, sonst Beobachtungsende.'),
      unter_ziel_gemessen:flag('Wurde ein tatsächlicher Wert unter der Grenze erfasst?'),
      stetiger_verlauf_belegt:flag('War ein anhaltend nicht steigender Verlauf ohne andere Eingriffe für diesen Abschnitt hinreichend belegt?'),
    },({start_c,ziel_c,letzter_passender_min,erster_unpassender_min,unter_ziel_gemessen,stetiger_verlauf_belegt})=>{
      if (erster_unpassender_min<letzter_passender_min||(unter_ziel_gemessen&&erster_unpassender_min===letzter_passender_min)) throw new RangeError();
      if (!stetiger_verlauf_belegt||start_c<ziel_c) return {dauer_untergrenze_min:null,dauer_obergrenze_min:null};
      return {dauer_untergrenze_min:letzter_passender_min,dauer_obergrenze_min:unter_ziel_gemessen?erster_unpassender_min:null,
        hinweis:'Nur aufgezeichnete Temperaturentwicklung nach Abschalten. Weder Abkühlmodell noch Vorschlag für unbeaufsichtigten Betrieb.'};
    },{start_c:21,ziel_c:19,letzter_passender_min:14,erster_unpassender_min:17,unter_ziel_gemessen:true,stetiger_verlauf_belegt:true},
    {dauer_untergrenze_min:14,dauer_obergrenze_min:17}),

  task('punktwaerme_raumdurchschnitt_verdeckt_festen_platz',
    'Eine Verbesserung im Raumaggregat gegen die direkt am festen Nutzplatz gemessene Änderung prüfen — Check whether a rising room index masked deterioration at the occupied point.',
    panel,{
      raum_frueh_c:temperature('Mittel derselben räumlichen Referenzpunkte vor dem Versuch, ohne Nutzplatz.'),
      raum_spaet_c:temperature('Späteres Mittel derselben Referenzpunkte.'),
      platz_frueh_c:temperature('Wert am festen Arbeitspunkt vor dem Versuch.'),
      platz_spaet_c:temperature('Späterer Wert am selben Arbeitspunkt.'),
      mindest_aenderung_c:quantity('Kleinste auswertbare Änderung bei beiden Größen in °C.',0.001,100),
      vergleichbare_messgroesse:flag('Vorher/nachher und Raumpunkte/Nutzplatz mit kompatibler Messgröße, gleichzeitigen Beobachtungen und stabiler Geometrie?'),
    },({raum_frueh_c,raum_spaet_c,platz_frueh_c,platz_spaet_c,mindest_aenderung_c,vergleichbare_messgroesse})=>{
      if (!vergleichbare_messgroesse) return {raumindex_c:null,platzveraenderung_c:null,maskierter_rueckgang:null};
      const room=raum_spaet_c-raum_frueh_c, spot=platz_spaet_c-platz_frueh_c;
      return {raumindex_c:rounded(room),platzveraenderung_c:rounded(spot),
        maskierter_rueckgang:room+1e-9>=mindest_aenderung_c&&spot-1e-9<=-mindest_aenderung_c,
        hinweis:'Referenzpunkte beschreiben nur diesen Raumabschnitt. Temperatur und persönlich empfundene Strahlungswärme unterscheiden.'};
    },{raum_frueh_c:18.4,raum_spaet_c:19.2,platz_frueh_c:19.1,platz_spaet_c:18.5,mindest_aenderung_c:0.5,vergleichbare_messgroesse:true},
    {raumindex_c:0.8,platzveraenderung_c:-0.6,maskierter_rueckgang:true}),

  task('punktwaerme_anzahl_arbeitszyklen_nutzbar',
    'Aus einem protokollierten Wärmefenster bestimmen, wie viele vollständige Arbeitsschritte nach persönlicher Vorbereitung und vor Aufräumen hineinpassen — Count full attended work units with fixed use-specific overhead.',
    garage,{
      passend_zusammenhaengend_min:minutes('Bereits gemessener durchgehender Zeitraum am genutzten Platz mit passender Wärme.'),
      vorbereiten_min:minutes('Darin zuerst nötige Vorbereitungsminuten am Platz.'),
      abschluss_min:minutes('Darin vor dem Ende für den Abschluss reservierte Zeit.'),
      stueck_min:quantity('Gemessene Dauer je vollständig erledigtem, gleichartigem Schritt.',0.001,1440),
      geplanter_bedarf:quantity('Anzahl tatsächlich benötigter Schritte.'),
    },({passend_zusammenhaengend_min,vorbereiten_min,abschluss_min,stueck_min,geplanter_bedarf})=>{
      whole(geplanter_bedarf);
      const usable=Math.max(0,passend_zusammenhaengend_min-vorbereiten_min-abschluss_min);
      const fit=Math.min(geplanter_bedarf,Math.floor((usable+1e-9)/stueck_min));
      return {vollstaendig_erledigbar:fit,offene_schritte:geplanter_bedarf-fit,fehlzeit_fuer_vorgegebene_abschnitte_min:rounded(Math.max(0,vorbereiten_min+abschluss_min-passend_zusammenhaengend_min)),
        hinweis:'Planung innerhalb eines beobachteten Komfortfensters, keine Verlängerung des Heizlaufs vorgeschlagen.'};
    },{passend_zusammenhaengend_min:44,vorbereiten_min:6,abschluss_min:5,stueck_min:9,geplanter_bedarf:6},
    {vollstaendig_erledigbar:3,offene_schritte:3,fehlzeit_fuer_vorgegebene_abschnitte_min:0}),

  task('punktwaerme_temperaturdefizit_linie_abschnitt',
    'Bei linear angenähertem Kurzverlauf die Fläche unterhalb des eigenen Wärmeziels während tatsächlicher Nutzung berechnen — Integrate only below-target deficit across one occupied segment.',
    office,{
      anfang_c:temperature('Temperatur zum Beginn des kurzen tatsächlich belegten Abschnitts.'),
      ende_c:temperature('Temperatur am Ende desselben Abschnitts.'),
      mindestziel_c:temperature('Eigenes Minimum für dieselbe Messgröße.'),
      dauer_min:quantity('Dauer des aufgezeichneten Abschnitts in Minuten.',0.001,1440),
      linear_plausibel:flag('Ist die lineare Näherung im betrachteten Abschnitt überprüft und für diesen Zweck vertretbar?'),
    },({anfang_c,ende_c,mindestziel_c,dauer_min,linear_plausibel})=>{
      if (!linear_plausibel) return {defizit_grad_min:null,unter_ziel_min:null};
      const d1=mindestziel_c-anfang_c,d2=mindestziel_c-ende_c;
      const high=Math.max(d1,d2), low=Math.min(d1,d2);
      const time=high<=0?0:low>=0?dauer_min:dauer_min*high/(high-low);
      const area=(Math.max(0,high)+Math.max(0,low))*time/2;
      return {defizit_grad_min:rounded(area),unter_ziel_min:rounded(time),hinweis:'Lineares Flächenmaß für dieses Protokoll. Es ist weder persönlicher Komfort noch Energieverbrauch.'};
    },{anfang_c:17,ende_c:21,mindestziel_c:19,dauer_min:20,linear_plausibel:true},
    {defizit_grad_min:10,unter_ziel_min:10}),

  task('heizluefter_aufgabe_sprachpause_und_waerme',
    'Für eine Aufgabe getrennt prüfen, wie viel ausreichend warme Zeit wegen gleichzeitig dokumentierter Geräuschstörung ausfiel — Count the heat that remains usable after overlapping conversation disruption.',
    fan,{
      aufgabe_min:minutes('Tatsächlich dokumentierte Arbeits- oder Gesprächsminuten.'),
      passend_warm_min:minutes('Minuten mit passender persönlicher Wärme.'),
      gestoert_min:minutes('Minuten, in denen ein Gespräch nach eigenem Protokoll akustisch gestört war.'),
      warm_und_gestoert_min:minutes('Gezielt beobachtete gleichzeitige warme und gestörte Minuten.'),
    },({aufgabe_min,passend_warm_min,gestoert_min,warm_und_gestoert_min})=>{
      if (warm_und_gestoert_min>Math.min(passend_warm_min,gestoert_min)||passend_warm_min+gestoert_min-warm_und_gestoert_min>aufgabe_min) throw new RangeError();
      return {warm_und_ungestoert_min:rounded(passend_warm_min-warm_und_gestoert_min),
        weder_warm_noch_gestoert_min:rounded(aufgabe_min-passend_warm_min-gestoert_min+warm_und_gestoert_min),
        hinweis:'Eigene Beobachtungen auf derselben Zeitbasis, keine Aussage zu Geräuschgrenzen oder Akustik anderer Geräte.'};
    },{aufgabe_min:45,passend_warm_min:38,gestoert_min:12,warm_und_gestoert_min:10},
    {warm_und_ungestoert_min:28,weder_warm_noch_gestoert_min:5}),

  task('punktwaerme_platzwechsel_wieder_erreichen_anteil',
    'Beim Rückweg zu einem zuvor ausreichend warmen Platz trennen, ob passende Wärme sofort, erst später oder gar nicht beobachtet wurde — Separate immediate, delayed and unresolved return comfort instead of imputing missing return observations.',
    panel,{
      rueckkehr_gesamt:quantity('Zahl aller Rückkehrvorgänge an den zuvor geeigneten Nutzplatz.'),
      sofort_passend:quantity('Davon bereits bei tatsächlicher Rückkehr bestätigte passende Beobachtungen.'),
      spaeter_passend:quantity('Davon andere, mit belegter zu kühler Rückkehr und anschließender Zielerreichung.'),
      durchgehend_unpassend:quantity('Vollständig beobachtete Rückkehrblöcke, die bis zum Ende unpassend blieben.'),
      abbrueche:quantity('Andere nicht vollständig beobachtete Rückkehrblöcke.'),
    },({rueckkehr_gesamt,sofort_passend,spaeter_passend,durchgehend_unpassend,abbrueche})=>{
      whole(rueckkehr_gesamt,sofort_passend,spaeter_passend,durchgehend_unpassend,abbrueche);
      const remaining=rueckkehr_gesamt-sofort_passend-spaeter_passend-durchgehend_unpassend-abbrueche;
      if (remaining<0) throw new RangeError();
      const success=sofort_passend+spaeter_passend;
      return {belegt_passend:success,belegt_unpassend:durchgehend_unpassend,offener_ausgang:abbrueche+remaining,
        anteil_mit_passendem_ausgang_prozent:rueckkehr_gesamt?[rounded(100*success/rueckkehr_gesamt),rounded(100*(rueckkehr_gesamt-durchgehend_unpassend)/rueckkehr_gesamt)]:null,
        hinweis:'Die Rechenspanne füllt abgebrochene Beobachtungen nicht mit Erfolgen oder Misserfolgen auf.'};
    },{rueckkehr_gesamt:10,sofort_passend:4,spaeter_passend:2,durchgehend_unpassend:2,abbrueche:1},
    {belegt_passend:6,belegt_unpassend:2,offener_ausgang:2,anteil_mit_passendem_ausgang_prozent:[60,80]}),

  task('punktwaerme_zwei_hoehen_reihenfolgewechsel',
    'Ermitteln, ob die bevorzugte Höhe am Arbeitspunkt zwischen zwei tatsächlich geprüften Aufstellungen wechselte — Detect a measured reversal of the vertical temperature ordering.',
    panel,{
      a_tief_c:temperature('Messung an der unteren Nutzposition in der bereits geprüften Aufstellung A.'),
      a_hoch_c:temperature('Zeitgleiche Messung an der oberen Nutzposition in A.'),
      b_tief_c:temperature('Messung an exakt derselben unteren Position in der geprüften Aufstellung B.'),
      b_hoch_c:temperature('Zeitgleiche Messung am selben oberen Punkt in B.'),
      gesamtspielraum_c:difference('Spielraum je Höhendifferenz, unterhalb dessen ihre Richtung offen bleibt.'),
      fenster_passend:flag('Stimmen Messaufbau, Fensterdauer und übrige Bedingungen hinreichend überein?'),
    },({a_tief_c,a_hoch_c,b_tief_c,b_hoch_c,gesamtspielraum_c,fenster_passend})=>{
      if (!fenster_passend) return {belegter_richtungswechsel:null};
      const a=a_hoch_c-a_tief_c, b=b_hoch_c-b_tief_c;
      return {a_hoch_minus_tief_c:rounded(a),b_hoch_minus_tief_c:rounded(b),
        belegter_richtungswechsel:Math.min(Math.abs(a),Math.abs(b))>gesamtspielraum_c+1e-9?a*b<0:null,
        hinweis:'Erfasst nur die zwei dokumentierten Punkte. Montage oder Umpositionierung werden nicht empfohlen.'};
    },{a_tief_c:18,a_hoch_c:21,b_tief_c:21,b_hoch_c:20,gesamtspielraum_c:0.5,fenster_passend:true},
    {a_hoch_minus_tief_c:3,b_hoch_minus_tief_c:-1,belegter_richtungswechsel:true}),

  task('thermostat_handkorrekturen_versuchsfolge_notiz',
    'Auffälligen Wärmeverlauf bei manuell geänderten Vorgaben von einem wirklich unveränderten Vergleich trennen — Distinguish manually overridden comfort episodes from a clean baseline control.',
    thermostat,{
      versuche_gesamt:quantity('Zahl vergleichbarer vollständig protokollierter Arbeitsblöcke.'),
      ohne_eingriff:quantity('Blöcke ohne dokumentierten manuellen Eingriff.'),
      ohne_eingriff_passend:quantity('Davon Blöcke mit vollständigem persönlichem Komforterfolg.'),
      nach_eingriff_passend:quantity('Andere Blöcke mit vollständigem Komforterfolg und dokumentiertem Eingriff.'),
    },({versuche_gesamt,ohne_eingriff,ohne_eingriff_passend,nach_eingriff_passend})=>{
      whole(versuche_gesamt,ohne_eingriff,ohne_eingriff_passend,nach_eingriff_passend);
      if (ohne_eingriff>versuche_gesamt||ohne_eingriff_passend>ohne_eingriff||nach_eingriff_passend>versuche_gesamt-ohne_eingriff) throw new RangeError();
      const all=ohne_eingriff_passend+nach_eingriff_passend;
      return {komfort_gesamt_prozent:versuche_gesamt?rounded(100*all/versuche_gesamt):null,
        komfort_ohne_eingriff_prozent:ohne_eingriff?rounded(100*ohne_eingriff_passend/ohne_eingriff):null,
        beobachteter_erfolgsanteil_mit_eingriff_prozent:all?rounded(100*nach_eingriff_passend/all):null,
        hinweis:'Ein dokumentierter Eingriff erklärt den Erfolg nicht automatisch. Die Ausgangslage kann unterschiedlich gewesen sein.'};
    },{versuche_gesamt:8,ohne_eingriff:4,ohne_eingriff_passend:2,nach_eingriff_passend:4},
    {komfort_gesamt_prozent:75,komfort_ohne_eingriff_prozent:50,beobachteter_erfolgsanteil_mit_eingriff_prozent:66.6667}),

  task('punktwaerme_arbeitsziel_wechsel_energieabschnitt',
    'Gemessene Zusatzwärme zweier verschieden langer Arbeitsarten nach fertiggestellten Einheiten und nicht nach reiner Heizzeit lesen — Compare task-specific energy per completed work item under explicit time and output limits.',
    office,{
      a_wh:quantity('Gemessene Zusatzenergie des ersten vollständig beobachteten Arbeitsabschnitts.'),
      b_wh:quantity('Gemessene Zusatzenergie des späteren Vergleichsabschnitts.'),
      a_einheiten:quantity('Zahl vollständig erledigter gleichartiger Arbeitseinheiten in A.',1),
      b_einheiten:quantity('Zahl vollständig erledigter Arbeitseinheiten in B.',1),
      a_min:quantity('Dokumentierte tatsächliche Arbeitsminuten in A.',0.001,1440),
      b_min:quantity('Dokumentierte tatsächliche Arbeitsminuten in B.',0.001,1440),
      gleichwertige_ergebnisse:flag('Gleichartige Aufgaben und vergleichbares, planmäßig sichtbares Endergebnis?'),
    },({a_wh,b_wh,a_einheiten,b_einheiten,a_min,b_min,gleichwertige_ergebnisse})=>{
      whole(a_einheiten,b_einheiten);
      if (!gleichwertige_ergebnisse) return {delta_wh_einheit:null,rang_unterschied_arbeitsminute:null};
      const perItem=b_wh/b_einheiten-a_wh/a_einheiten;
      const perMin=b_wh/b_min-a_wh/a_min;
      return {delta_wh_einheit:rounded(perItem),delta_wh_arbeitsminute:rounded(perMin),
        rang_unterschied_arbeitsminute:perItem*perMin<0,
        hinweis:'Zeigt den Unterschied zwischen zwei Kennzahlen. Keine Behauptung, dass Wärme Produktivität oder Kosten verändert hat.'};
    },{a_wh:200,b_wh:270,a_einheiten:4,b_einheiten:6,a_min:60,b_min:50,gleichwertige_ergebnisse:true},
    {delta_wh_einheit:-5,delta_wh_arbeitsminute:2.0667,rang_unterschied_arbeitsminute:true}),

  task('thermostat_anforderungen_geraetereaktion_protokoll',
    'Thermostatanforderungen und gemessene Heizstarts unterscheiden, bevor eine ausbleibende Wirkung am Nutzplatz eingeordnet wird — Audit matched requests, documented lockouts and unexplained starts.',
    thermostat,{
      anforderungen:quantity('Eindeutige protokollierte Heizanforderungen im gemeinsamen Beobachtungsfenster.'),
      passende_starts:quantity('Erfolgreich eindeutig zugeordnete Heizstarts, jeweils höchstens einer pro Anforderung.'),
      belegte_sperren:quantity('Weitere Anforderungen ohne Start mit protokollierter Sperre oder belegt bereits laufendem Gerät.'),
      starts_gesamt:quantity('Alle separaten beobachteten Starts im selben Fenster.'),
      gleiche_uhr:flag('Sind Uhrenabgleich, Beobachtungszeit und Eindeutigkeit der Zuordnung bestätigt?'),
    },({anforderungen,passende_starts,belegte_sperren,starts_gesamt,gleiche_uhr})=>{
      whole(anforderungen,passende_starts,belegte_sperren,starts_gesamt);
      if (passende_starts+belegte_sperren>anforderungen||passende_starts>starts_gesamt) throw new RangeError();
      if (!gleiche_uhr) return {anforderung_ohne_geklaerten_start:null,start_ohne_anforderungsbezug:null};
      return {anforderung_ohne_geklaerten_start:anforderungen-passende_starts-belegte_sperren,
        start_ohne_anforderungsbezug:starts_gesamt-passende_starts,
        hinweis:'Ein ungeklärter Eintrag belegt keinen Defekt. Rahmen und Modellunterlagen unverändert lassen.'};
    },{anforderungen:9,passende_starts:5,belegte_sperren:2,starts_gesamt:6,gleiche_uhr:true},
    {anforderung_ohne_geklaerten_start:2,start_ohne_anforderungsbezug:1}),
];
