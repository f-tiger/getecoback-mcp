const ventilation = '/guide/richtig-lueften-im-winter.html';
const summer = '/guide/richtig-lueften-bei-hitze.html';
const shade = '/guide/hitzeschutz-fenster.html';
const windowAC = '/guide/klimaanlage-kippfenster.html';
const ac = '/guide/klimaanlage-nachts-laufen-lassen.html';
const fan = '/guide/ventilator-kaufen-ratgeber.html';
const heat = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
const robot = '/guide/saugroboter-kaufberatung.html';
const floor = '/guide/saugwischer-kaufberatung.html';
const laundry = '/guide/waesche-trocknen-wohnung.html';
const dryer = '/waeschetrockner-oder-luftentfeuchter.html';
const appliances = '/geraete-austausch-rechner.html';
const kitchen = '/produkte.html';
const shower = '/guide/duschen-kosten-rechner.html';
const cellar = '/guide/luftentfeuchter-keller.html';
const cleaning = '/guide/tineco-saugt-nicht-mehr.html';
const power = '/strommess-protokoll.html';
const workshop = '/familienwerkstatt.html';
const purifier = '/guide/luftreiniger-ratgeber.html';
const minutes = description => ({type:'number',minimum:0,maximum:1440,description});
const quantity = (description, maximum = 1000) => ({type:'number',minimum:0,maximum,description});
const yes = description => ({type:'boolean',description});
const choice = (description, ...values) => ({type:'string',enum:values,description});
const round = value => Math.round(value * 100) / 100;
const nonnegative = value => Math.max(0,value);
function whole(...values) {
  if (values.some(value=>!Number.isInteger(value))) throw new RangeError();
}
function intervals(...pairs) {
  if (pairs.some(([start,end])=>start>end)) throw new RangeError();
}
function overlap(a,b,c,d) {
  return nonnegative(Math.min(b,d)-Math.max(a,c));
}
function tool(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const haushaltskoordination = [
  tool('querlueften_koordination_zwei_bedienfenster',
    'Mit einer Person je Fenster nach getrennter Vorbereitung das gemeinsame Lüftungsfenster finden — Find a coordinated cross-ventilation slot after separate opening preparations.',
    ventilation,{
      a_bereit_min:minutes('A ist nach allen vorbereitenden Schritten am ersten Fenster ab dieser Minute bereit.'),
      b_bereit_min:minutes('B ist am zweiten Fenster ab dieser Minute bereit, jeweils auf derselben Zeitachse.'),
      a_spaetestens_zu_min:minutes('Spätestens zu dieser Minute muss das Fenster A geschlossen sein.'),
      b_spaetestens_zu_min:minutes('Spätestens zu dieser Minute muss das Fenster B geschlossen sein.'),
      gemeinsam_gewuenscht_min:minutes('Selbst festgelegte gemeinsame Dauer, ohne wissenschaftliche Zielvorgabe.'),
    },({a_bereit_min,b_bereit_min,a_spaetestens_zu_min,b_spaetestens_zu_min,gemeinsam_gewuenscht_min})=>{
      intervals([a_bereit_min,a_spaetestens_zu_min],[b_bereit_min,b_spaetestens_zu_min]);
      if (!gemeinsam_gewuenscht_min) throw new RangeError();
      const start=Math.max(a_bereit_min,b_bereit_min);
      const slot=nonnegative(Math.min(a_spaetestens_zu_min,b_spaetestens_zu_min)-start);
      return {gemeinsam_moeglich_min:round(slot),fruehestens_gemeinsam_ab_min:slot>=gemeinsam_gewuenscht_min?start:null,
        hinweis:'Beide Personen bestätigen die Öffnung selbst. Örtliche Bedingungen und sichere Bedienung bleiben maßgeblich.'};
    },{a_bereit_min:460,b_bereit_min:464,a_spaetestens_zu_min:475,b_spaetestens_zu_min:470,gemeinsam_gewuenscht_min:5},
    {gemeinsam_moeglich_min:6,fruehestens_gemeinsam_ab_min:464}),

  tool('nachtlueften_schliessdienst_fristabdeckung',
    'Eine vorher abgestimmte Fensterübergabe prüfen, wenn die öffnende Person vor dem Schließtermin weg ist — Confirm that an accepting person can close the window within the agreed range.',
    summer,{
      offen_ab_min:minutes('Geplante Öffnung auf einer gemeinsamen Minutenachse ab Start des Zeitplans.'),
      schliessen_frueh_min:minutes('Früheste vereinbarte Schließminute auf derselben Achse.'),
      schliessen_spaet_min:minutes('Späteste vereinbarte Schließminute auf derselben Achse.'),
      person_b_frei_ab_min:minutes('Person B kann ab dieser Minute übernehmen.'),
      person_b_hats_bestaetigt:yes('B hat Aufgabe und die Erreichbarkeit der Bedienung bestätigt.'),
    },({offen_ab_min,schliessen_frueh_min,schliessen_spaet_min,person_b_frei_ab_min,person_b_hats_bestaetigt})=>{
      intervals([offen_ab_min,schliessen_frueh_min],[schliessen_frueh_min,schliessen_spaet_min]);
      const start=Math.max(schliessen_frueh_min,person_b_frei_ab_min);
      return {uebergabe_bestaetigt:person_b_hats_bestaetigt&&start<=schliessen_spaet_min,
        fruehester_schliesszeitpunkt_min:person_b_hats_bestaetigt&&start<=schliessen_spaet_min?start:null,
        hinweis:'Fristen sind Vereinbarungen. Wenn kein Schließdienst feststeht, einen passenden beaufsichtigten Ablauf wählen.'};
    },{offen_ab_min:20,schliessen_frueh_min:40,schliessen_spaet_min:55,person_b_frei_ab_min:43,person_b_hats_bestaetigt:true},
    {uebergabe_bestaetigt:true,fruehester_schliesszeitpunkt_min:43}),

  tool('sonnenschutz_geteiltes_fenster_minutenquote',
    'Einen einmaligen Wechsel zwischen zwei vereinbarten Stellungen im selben Zeitfenster auf beide Mindestzeiten prüfen — Allocate one shared shade window without denying either agreed minimum.',
    shade,{
      fenster_min:minutes('Zeit, in der beide vereinbarten Stellungen geplant werden sollen.'),
      taglicht_minimum_min:minutes('Vereinbarte Mindestzeit zur Tageslichtnutzung.'),
      schatten_minimum_min:minutes('Vereinbarte Mindestzeit in der geprüften beschattenden Stellung.'),
      stellwechsel_min:minutes('Gemessene Zeit des einen erlaubten Wechsels.'),
    },({fenster_min,taglicht_minimum_min,schatten_minimum_min,stellwechsel_min})=>{
      const frei=fenster_min-taglicht_minimum_min-schatten_minimum_min-stellwechsel_min;
      return {beide_mindestzeiten_machbar:frei>=0,fehlzeit_min:round(nonnegative(-frei)),
        frei_verteilbar_min:round(nonnegative(frei)),hinweis:'Stellungen und Zeiten sind von den Beteiligten geprüft. Keine Zusage für Beleuchtung oder Raumtemperatur.'};
    },{fenster_min:75,taglicht_minimum_min:35,schatten_minimum_min:30,stellwechsel_min:4},
    {beide_mindestzeiten_machbar:true,fehlzeit_min:0,frei_verteilbar_min:6}),

  tool('klimafenster_absprache_entfernung_wiedereinbau',
    'Fensterreinigung und anschließende Klimanutzung bei zwei fest eingeplanten Bedienpersonen koordinieren — Place a documented window-insert removal and restoration around cleaning.',
    windowAC,{
      reinigung_fertig_min:minutes('Frühestes Ende der Reinigung nach bereits bestätigter Abnahme auf der gemeinsamen Zeitachse.'),
      wiedereinbau_person_ab_min:minutes('Person für den Wiedereinbau verfügbar ab dieser Minute.'),
      wiedereinbau_pruefung_min:minutes('Gemessene Minuten für vorgesehenen Wiedereinbau und Kontrolle.'),
      klima_gebucht_ab_min:minutes('Gewünschter Beginn der nächsten Nutzung.'),
      verfahren_bestaetigt:yes('Eignung, Abnahme und Wiedereinbau sind für diese Fensterlösung geklärt.'),
    },({reinigung_fertig_min,wiedereinbau_person_ab_min,wiedereinbau_pruefung_min,klima_gebucht_ab_min,verfahren_bestaetigt})=>{
      const fertig=Math.max(reinigung_fertig_min,wiedereinbau_person_ab_min)+wiedereinbau_pruefung_min;
      return {bestaetigte_freigabe_min:verfahren_bestaetigt?round(fertig):null,
        verschiebung_min:verfahren_bestaetigt?round(nonnegative(fertig-klima_gebucht_ab_min)):null,
        hinweis:'Die Kontrolle umfasst die vorgesehenen Sicherungen der Fensterlösung. Die Berechnung erteilt keine Montagefreigabe.'};
    },{reinigung_fertig_min:610,wiedereinbau_person_ab_min:620,wiedereinbau_pruefung_min:19,klima_gebucht_ab_min:630,verfahren_bestaetigt:true},
    {bestaetigte_freigabe_min:639,verschiebung_min:9}),

  tool('fenster_freigabe_nach_stellungswechsel',
    'Prüfen, welche freiwilligen Fensterfreigaben nach einem bestätigten Umbau noch zum aktuellen Zustand gehören — Detect which shared window permissions predate a configuration change.',
    summer,{
      a_bestaetigt_min:minutes('Letzte Bestätigung der Person A für den geprüften Zustand.'),
      b_bestaetigt_min:minutes('Letzte Bestätigung der Person B auf derselben Zeitachse.'),
      zuletzt_geaendert_min:minutes('Zeitpunkt der jüngsten relevanten Änderung der geplanten Fensterstellung.'),
      beide_freigaben_noetig:yes('Die Beteiligten haben für diese konkrete Nutzung beide Zustimmungen vereinbart.'),
    },({a_bestaetigt_min,b_bestaetigt_min,zuletzt_geaendert_min,beide_freigaben_noetig})=>{
      const erneuern=[a_bestaetigt_min<zuletzt_geaendert_min?'A':null,b_bestaetigt_min<zuletzt_geaendert_min?'B':null].filter(Boolean);
      return {erneuern,gemeinsame_freigabe_aktuell:beide_freigaben_noetig?erneuern.length===0:null,
        hinweis:'Zeitgleiche Angaben nur erfassen, wenn sie die geprüfte neue Stellung betreffen. Öffnungsgrenzen und tatsächliche Freigaben vor Ort prüfen.'};
    },{a_bestaetigt_min:300,b_bestaetigt_min:337,zuletzt_geaendert_min:322,beide_freigaben_noetig:true},
    {erneuern:['A'],gemeinsame_freigabe_aktuell:false}),

  tool('klimageraet_geteilter_ruhetermin_restfenster',
    'Bei zwei Hausaufgaben nur die beobachtet ruhige Phase eines bereits geplanten Klimabetriebs freigeben — Find the part of a call that stays outside a measured audible AC phase.',
    ac,{
      termin_ab_min:minutes('Beginn des still geplanten Termins auf gemeinsamer Zeitachse.'),
      termin_bis_min:minutes('Ende des Termins auf derselben Achse.'),
      laut_ab_min:minutes('Beobachteter Beginn der am Terminplatz störenden Phase.'),
      laut_bis_min:minutes('Beobachtetes Ende derselben Phase.'),
      zusammenhaengend_min:minutes('Mindestdauer eines zusammenhängend ruhigen Abschnitts für den Termin.'),
    },({termin_ab_min,termin_bis_min,laut_ab_min,laut_bis_min,zusammenhaengend_min})=>{
      intervals([termin_ab_min,termin_bis_min],[laut_ab_min,laut_bis_min]);
      const konflikt=overlap(termin_ab_min,termin_bis_min,laut_ab_min,laut_bis_min);
      const laengste=konflikt===0?termin_bis_min-termin_ab_min:
        Math.max(Math.min(termin_bis_min,laut_ab_min)-termin_ab_min,termin_bis_min-Math.max(termin_ab_min,laut_bis_min));
      return {stoerzeit_min:round(konflikt),laengste_ruhige_phase_min:round(laengste),ruheabschnitt_reicht:laengste>=zusammenhaengend_min,
        hinweis:'Nur den am konkreten Sitzplatz beobachteten Geräuschabschnitt bewerten. Andere Geräusche und Gerätezyklen separat prüfen.'};
    },{termin_ab_min:100,termin_bis_min:152,laut_ab_min:115,laut_bis_min:132,zusammenhaengend_min:25},
    {stoerzeit_min:17,laengste_ruhige_phase_min:20,ruheabschnitt_reicht:false}),

  tool('klimageraet_bedienperson_versetzte_kurzauftraege',
    'Zwei versetzte manuelle Kontrollen mit der nötigen Wegezeit einer verfügbaren Person prüfen — Compare one-operator and separate-operator coverage for two fixed AC checks.',
    ac,{
      erstes_ende_min:minutes('Ende der ersten vorgesehenen Kontrolle.'),
      zweiter_beginn_min:minutes('Fester Beginn der nächsten Kontrolle an einem anderen passenden Standort auf derselben Zeitachse.'),
      weg_min:minutes('Gemessene Dauer des vorgesehenen Wegs ohne Umstellen des Geräts.'),
      zweite_person_bestaetigt:yes('Eine andere Person hat die zweite Aufgabe unabhängig angenommen.'),
    },({erstes_ende_min,zweiter_beginn_min,weg_min,zweite_person_bestaetigt})=>{
      const eins=erstes_ende_min+weg_min<=zweiter_beginn_min;
      return {eine_person_reicht:eins,nur_mit_bestaetigter_zweitperson:!eins&&zweite_person_bestaetigt,
        zweite_kontrolle_noch_unbesetzt:!eins&&!zweite_person_bestaetigt,
        hinweis:'Nur vereinbarte Kontrollaufgaben im normalen Betrieb. Betriebs-, Standort- und Aufsichtsvorgaben bleiben maßgeblich.'};
    },{erstes_ende_min:650,zweiter_beginn_min:655,weg_min:9,zweite_person_bestaetigt:true},
    {eine_person_reicht:false,nur_mit_bestaetigter_zweitperson:true,zweite_kontrolle_noch_unbesetzt:false}),

  tool('ventilator_teilraum_hin_und_rueckgabe',
    'Eine kurze Ausleihe mit zwei abgesprochenen Transfers zwischen belegten Räumen vergleichen — Check whether a fan loan can fit both transfers before the lender’s next use.',
    fan,{
      erster_raum_frei_min:minutes('Erster Raum gibt das Gerät ab dieser Minute frei.'),
      hin_transfer_min:minutes('Beobachteter Aufwand bis zur erlaubten Nutzung im zweiten Raum.'),
      gewaehlt_nutzung_min:minutes('Geplante Nutzungsdauer im zweiten Raum.'),
      rueck_transfer_min:minutes('Beobachteter Rückgabeaufwand bis zum zugelassenen Platz.'),
      erster_raum_benoetigt_min:minutes('Erster Raum benötigt das Gerät wieder ab dieser Minute.'),
    },({erster_raum_frei_min,hin_transfer_min,gewaehlt_nutzung_min,rueck_transfer_min,erster_raum_benoetigt_min})=>{
      const rest=erster_raum_benoetigt_min-erster_raum_frei_min-hin_transfer_min-rueck_transfer_min;
      return {maximale_ausleihe_min:round(nonnegative(rest)),rueckgabe_machbar:rest>=gewaehlt_nutzung_min,
        kuerzung_min:round(nonnegative(gewaehlt_nutzung_min-nonnegative(rest))),
        hinweis:'Umstellen nur nach Anleitung, mit bestätigtem Standort und freien Wegen. Verspätete Rückgabe erfordert neue Absprache.'};
    },{erster_raum_frei_min:900,hin_transfer_min:6,gewaehlt_nutzung_min:45,rueck_transfer_min:9,erster_raum_benoetigt_min:950},
    {maximale_ausleihe_min:35,rueckgabe_machbar:false,kuerzung_min:10}),

  tool('heizprofil_zwei_vereinbarte_sollbereiche',
    'Zwei gleichzeitige Sollwertwünsche auf eine dokumentiert auswählbare gemeinsame Stellung prüfen — Check whether two agreed thermostat preference ranges share an available setpoint.',
    heat,{
      a_min:quantity('Untere akzeptierte Einstellung der Person A in °C.',40),
      a_max:quantity('Obere akzeptierte Einstellung der Person A in °C.',40),
      b_min:quantity('Untere akzeptierte Einstellung der Person B in °C.',40),
      b_max:quantity('Obere akzeptierte Einstellung der Person B in °C.',40),
      vorhandener_sollwert:quantity('Eine laut Gerät tatsächlich auswählbare Einstellung in °C.',40),
    },({a_min,a_max,b_min,b_max,vorhandener_sollwert})=>{
      intervals([a_min,a_max],[b_min,b_max]);
      const unten=Math.max(a_min,b_min),oben=Math.min(a_max,b_max);
      return {sollbereiche_vereinbar:unten<=oben,gewaehlter_wert_fuer_beide:vorhandener_sollwert>=unten&&vorhandener_sollwert<=oben,
        gemeinsamer_bereich:unten<=oben?[unten,oben]:null,
        hinweis:'Prüft ausschließlich persönliche Sollwerte. Tatsächliche Raumtemperatur und Heizungsfunktion separat beobachten.'};
    },{a_min:19,a_max:21,b_min:20,b_max:22,vorhandener_sollwert:19.5},
    {sollbereiche_vereinbar:true,gewaehlter_wert_fuer_beide:false,gemeinsamer_bereich:[20,21]}),

  tool('saugroboter_flur_belegungswechsel_endpunkte',
    'Die zwei belegten Flurzeiten vor einer zusammenhängenden, freigegebenen Roboterpassage berücksichtigen — Find a full passage slot between two confirmed household corridor reservations.',
    robot,{
      a_bis_min:minutes('Ende der vorausgehenden Flurbelegung auf einer gemeinsamen Minutenachse.'),
      b_ab_min:minutes('Beginn der folgenden Flurbelegung auf derselben Achse.'),
      passage_min:minutes('Beobachtete Durchfahrtszeit einschließlich vorgabegerechter Vorbereitung.'),
      stop_puffer_min:minutes('Vereinbarte zusätzliche Minuten vor Beginn der nächsten Belegung.'),
    },({a_bis_min,b_ab_min,passage_min,stop_puffer_min})=>{
      if (!passage_min) throw new RangeError();
      const slot=b_ab_min-a_bis_min-stop_puffer_min;
      return {passage_passt:slot>=passage_min,passage_spaetestens_ab_min:slot>=passage_min?round(b_ab_min-stop_puffer_min-passage_min):null,
        fehlende_freie_min:round(nonnegative(passage_min-nonnegative(slot))),
        hinweis:'Wege vor dem Start tatsächlich frei und zugänglich prüfen. Der Puffer ersetzt keine Aufsichtsvorgabe.'};
    },{a_bis_min:520,b_ab_min:542,passage_min:14,stop_puffer_min:6},
    {passage_passt:true,passage_spaetestens_ab_min:522,fehlende_freie_min:0}),

  tool('saugroboter_drei_kurzauftraege_auswahl',
    'Aus drei freiwillig angemeldeten Kurzaufträgen die bis zum gemeinsamen Ende erreichbare Teilmenge bestimmen — Select the largest feasible set of three short robot jobs under one shared deadline.',
    robot,{
      a_min:minutes('Beobachtete Gesamtzeit für Auftrag A einschließlich Rückkehr.'),
      b_min:minutes('Beobachtete Gesamtzeit für Auftrag B einschließlich Rückkehr.'),
      c_min:minutes('Beobachtete Gesamtzeit für Auftrag C einschließlich Rückkehr.'),
      slot_min:minutes('Gemeinsames freigegebenes Zeitfenster mit ausreichender vorbereiteter Akkuladung.'),
    },({a_min,b_min,c_min,slot_min})=>{
      if (!a_min || !b_min || !c_min) throw new RangeError();
      const optionen=[[a_min+b_min+c_min,'ABC'],[a_min+b_min,'AB'],[a_min+c_min,'AC'],[b_min+c_min,'BC'],[a_min,'A'],[b_min,'B'],[c_min,'C']]
        .filter(([zeit])=>zeit<=slot_min);
      const maximum=Math.max(0,...optionen.map(([,gruppe])=>gruppe.length));
      return {vollstaendige_auftraege:maximum,gleichwertige_auswahl:optionen.filter(([,gruppe])=>gruppe.length===maximum).map(([,gruppe])=>gruppe),
        hinweis:'Jeder Auftrag startet und endet an derselben Station. Bei gleichen Teilmengen den Vorrang im Haushalt festlegen.'};
    },{a_min:11,b_min:14,c_min:16,slot_min:29},{vollstaendige_auftraege:2,gleichwertige_auswahl:['AB','AC']}),

  tool('bodenpflege_zwei_beschraenkte_route_aufgaben',
    'Aufträge zwischen zwei verfügbaren Personen mit je einer exklusiven und einer flexiblen Teilfläche abgleichen — Allocate exclusive and shared floor-care jobs to available operators.',
    floor,{
      a_frei_min:minutes('Aktive Minuten von Person A im ganzen bestätigten Arbeitsfenster.'),
      b_frei_min:minutes('Aktive Minuten von Person B im gleichen Fenster.'),
      nur_a_min:minutes('Dauer des bereits zugeordneten unteilbaren Auftrags A.'),
      nur_b_min:minutes('Dauer des bereits zugeordneten unteilbaren Auftrags B.'),
      flexibel_min:minutes('Dauer einer weiteren unteilbaren Teilfläche, die beide übernehmen könnten.'),
    },({a_frei_min,b_frei_min,nur_a_min,nur_b_min,flexibel_min})=>{
      const a=a_frei_min-nur_a_min,b=b_frei_min-nur_b_min;
      const festePassen=a>=0&&b>=0;
      return {feste_auftraege_machbar:festePassen,
        flexibler_auftrag_an:festePassen?[a>=flexibel_min?'A':null,b>=flexibel_min?'B':null].filter(Boolean):[],
        fehlzeit_feste_auftraege_min:round(nonnegative(-a)+nonnegative(-b)),
        hinweis:'Gilt für getrennt verfügbare Mittel und freigegebene Flächen. Weitere parallele Gerätekonflikte vorher klären.'};
    },{a_frei_min:24,b_frei_min:30,nur_a_min:17,nur_b_min:18,flexibel_min:10},
    {feste_auftraege_machbar:true,flexibler_auftrag_an:['B'],fehlzeit_feste_auftraege_min:0}),

  tool('saugwischer_pflegeauftrag_annahmekette',
    'Nach bestätigter Geräteabgabe fehlende Annahme und anstehende Pflege getrennt erkennen — Track acceptance of the floor-washer cleanup job separately from physical return.',
    cleaning,{
      geraet_zurueck:yes('Die zuletzt nutzende Person hat das Gerät zum vereinbarten geeigneten Ort zurückgebracht.'),
      pflege_offen:yes('Ein laut Anleitung nach der Nutzung erforderlicher Pflegeschritt ist offen.'),
      uebernahme_bestaetigt:yes('Eine andere Person hat genau diesen nötigen Schritt übernommen.'),
      person_vor_fristeindeutig:yes('Für die Übernahme ist auch ein geeigneter Zeitpunkt vor dem nächsten Lauf bestätigt.'),
    },({geraet_zurueck,pflege_offen,uebernahme_bestaetigt,person_vor_fristeindeutig})=>{
      if (!uebernahme_bestaetigt && person_vor_fristeindeutig) throw new RangeError();
      return {naechste_nutzung_koordiniert:geraet_zurueck&&!pflege_offen,
        pflegeauftrag_unbesetzt:pflege_offen&&!uebernahme_bestaetigt,
        pflegezeit_noch_offen:pflege_offen&&uebernahme_bestaetigt&&!person_vor_fristeindeutig,
        hinweis:'Eine Zusage ersetzt ausgeführte Pflege nicht. Die Baugruppen und Schritte richten sich nach dem eigenen Modell.'};
    },{geraet_zurueck:true,pflege_offen:true,uebernahme_bestaetigt:true,person_vor_fristeindeutig:false},
    {naechste_nutzung_koordiniert:false,pflegeauftrag_unbesetzt:false,pflegezeit_noch_offen:true}),

  tool('haushaltsstrom_vereinbarte_spitzenbeobachtung',
    'Bei drei bestätigten Haushaltsaufgaben die beobachtete gemeinsame Leistung gegen ein selbst gewähltes Messbudget prüfen — Check measured simultaneous draw against a voluntary household budget.',
    power,{
      ab_zusammen_w:quantity('Gleichzeitig auf dem gemeinsamen Messgerät beobachtete Gesamtleistung für die freigegebene Kombination A und B.',50000),
      ac_zusammen_w:quantity('Vergleichbar beobachtete Gesamtleistung der bereits freigegebenen Kombination A und C.',50000),
      haushaltsziel_w:quantity('Freiwilliger Schwellenwert zur Koordination, ohne Aussage zur elektrischen Auslegung.',50000),
      vergleichbar:yes('Beide Messungen nutzen übereinstimmende Messgrenze und dokumentierte Einsatzzustände.'),
    },({ab_zusammen_w,ac_zusammen_w,haushaltsziel_w,vergleichbar})=>{
      return {unter_vereinbartem_ziel:vergleichbar?[ab_zusammen_w<=haushaltsziel_w?'AB':null,ac_zusammen_w<=haushaltsziel_w?'AC':null].filter(Boolean):null,
        kleinere_beobachtete_leistung:vergleichbar?(ab_zusammen_w===ac_zusammen_w?'gleich':ab_zusammen_w<ac_zusammen_w?'AB':'AC'):null,
        hinweis:'Ein freiwilliges Ziel und bereits beobachtete Messpaare sind keine Bemessung für Leitungen, Anschlüsse oder Schutzorgane.'};
    },{ab_zusammen_w:920,ac_zusammen_w:790,haushaltsziel_w:850,vergleichbar:true},
    {unter_vereinbartem_ziel:['AC'],kleinere_beobachtete_leistung:'AC'}),

  tool('haushalt_flexible_laufpause_mindestabschnitte',
    'Eine bestätigte pausierbare Aufgabe auf zwei freie Nutzungsblöcke mit je eigener Wiederanlaufzeit verteilen — Check piecewise progress after deducting restart work in two shared slots.',
    power,{
      freier_block_a_min:minutes('Erster bestätigter freier Block für dasselbe geeignete Gerät.'),
      freier_block_b_min:minutes('Zweiter bestätigter freier Block auf derselben Zeitachse.'),
      jeweilige_vorbereitung_min:minutes('In jedem benutzten Block notwendiger gemessener Zeitbedarf ohne Fortschritt.'),
      netto_noetig_min:minutes('Reine Bearbeitungszeit, ohne Vorbereitungen.'),
      pause_zulaessig:yes('Die Aufgabe ist laut Anleitung im geplanten Zustand unterbrechbar und fortsetzbar.'),
    },({freier_block_a_min,freier_block_b_min,jeweilige_vorbereitung_min,netto_noetig_min,pause_zulaessig})=>{
      if (!netto_noetig_min) throw new RangeError();
      const a=nonnegative(freier_block_a_min-jeweilige_vorbereitung_min),b=nonnegative(freier_block_b_min-jeweilige_vorbereitung_min);
      return {bester_einzelblock_min:round(Math.max(a,b)),
        rest_nach_bestaetigter_teilung_min:pause_zulaessig?round(nonnegative(netto_noetig_min-a-b)):null,
        teilung_noetig_und_moeglich:pause_zulaessig&&Math.max(a,b)<netto_noetig_min&&a+b>=netto_noetig_min,
        hinweis:'Bei unbekannter Unterbrechbarkeit nur einen geeigneten zusammenhängenden Einsatz einplanen.'};
    },{freier_block_a_min:24,freier_block_b_min:26,jeweilige_vorbereitung_min:5,netto_noetig_min:39,pause_zulaessig:true},
    {bester_einzelblock_min:21,rest_nach_bestaetigter_teilung_min:0,teilung_noetig_und_moeglich:true}),

  tool('spuelmaschine_vorbereitung_aufgaben_besetzung',
    'Zwei feste Küchenaufgaben auf zwei Personen nach bestätigter Zuständigkeit verteilen — Check whether two concurrent dishwasher prep roles can be staffed.',
    appliances,{
      a_kann_sortieren:yes('Person A kann zum vereinbarten Zeitpunkt sortieren.'),
      a_kann_einraeumen:yes('Person A kann zum selben Zeitpunkt am Gerät einräumen.'),
      b_kann_sortieren:yes('Person B kann zum vereinbarten Zeitpunkt sortieren.'),
      b_kann_einraeumen:yes('Person B kann zum selben Zeitpunkt am Gerät einräumen.'),
      parallel_machbar:yes('Getrennte Arbeitsplätze und die vorgesehene Beladung wurden abgestimmt.'),
    },({a_kann_sortieren,a_kann_einraeumen,b_kann_sortieren,b_kann_einraeumen,parallel_machbar})=>{
      const a=a_kann_sortieren&&b_kann_einraeumen,b=b_kann_sortieren&&a_kann_einraeumen;
      return {sortierung_an:parallel_machbar?[a?'A':null,b?'B':null].filter(Boolean):null,
        ohne_zusatzperson_nacheinander:a_kann_sortieren&&a_kann_einraeumen||b_kann_sortieren&&b_kann_einraeumen,
        hinweis:'Zählt nur bestätigte Zuständigkeit an den zwei vereinbarten Plätzen. Herstellerhinweise zur Beladung unverändert einhalten.'};
    },{a_kann_sortieren:true,a_kann_einraeumen:true,b_kann_sortieren:false,b_kann_einraeumen:true,parallel_machbar:true},
    {sortierung_an:['A'],ohne_zusatzperson_nacheinander:true}),

  tool('waeschestaender_nutzbare_leinen_teilfreigaben',
    'Zwischen zwei vereinbarten Nutzungen messen, welche Leinen tatsächlich vollständig an die nächste Person übergehen — Count independently released whole lines for a second household user.',
    laundry,{
      leinen_gesamt:quantity('Unabhängig nutzbare Leinen der geprüften Aufstellung.'),
      a_voll_belegt:quantity('Davon vollständig durch die vorherige Person belegte Leinen.'),
      a_teil_belegt:quantity('Weitere Leinen, auf denen noch einzelne Stücke der vorherigen Person hängen.'),
      b_braucht_ganze_leinen:quantity('Unabhängige vollständige Leinen, die die nächste Person benötigt.'),
    },({leinen_gesamt,a_voll_belegt,a_teil_belegt,b_braucht_ganze_leinen})=>{
      whole(leinen_gesamt,a_voll_belegt,a_teil_belegt,b_braucht_ganze_leinen);
      if (a_voll_belegt+a_teil_belegt>leinen_gesamt) throw new RangeError();
      const frei=leinen_gesamt-a_voll_belegt-a_teil_belegt;
      return {ganze_leinen_frei:frei,fehlende_ganze_leinen:nonnegative(b_braucht_ganze_leinen-frei),
        nur_mit_abgesprochenem_umhaengen:b_braucht_ganze_leinen>frei&&b_braucht_ganze_leinen<=frei+a_teil_belegt,
        hinweis:'Teilbelegte Leinen bleiben bei A. Umhängen nur nach Absprache und unter Beachtung der Textilvorgaben.'};
    },{leinen_gesamt:8,a_voll_belegt:3,a_teil_belegt:2,b_braucht_ganze_leinen:4},
    {ganze_leinen_frei:3,fehlende_ganze_leinen:1,nur_mit_abgesprochenem_umhaengen:true}),

  tool('waesche_protokoll_zwei_bestaetigte_korbkennungen',
    'Beim Aufteilen in zwei vereinbarte Körbe nicht freigegebene Wäsche von eindeutig übernommenen Stücken trennen — Audit shared basket allocation using only confirmed counts.',
    laundry,{
      gezaehlt:quantity('Als Teil derselben Wäscherunde beobachtete Teile.'),
      eindeutig_a:quantity('Davon eindeutig dem Korb A zugeordnete Teile.'),
      eindeutig_b:quantity('Weitere eindeutig dem Korb B zugeordnete Teile.'),
      von_beiden_beansprucht:quantity('Andere Teile, für die beide Zuordnungen markiert waren.'),
    },({gezaehlt,eindeutig_a,eindeutig_b,von_beiden_beansprucht})=>{
      whole(gezaehlt,eindeutig_a,eindeutig_b,von_beiden_beansprucht);
      if (eindeutig_a+eindeutig_b+von_beiden_beansprucht>gezaehlt) throw new RangeError();
      return {zugeteilt:eindeutig_a+eindeutig_b,ueberschneidung_offen:von_beiden_beansprucht,
        ohne_zuordnung:gezaehlt-eindeutig_a-eindeutig_b-von_beiden_beansprucht,
        hinweis:'Teile jeweils einmal zählen. Keine Namen, Bilder oder persönlichen Aufzeichnungen für die Berechnung nötig.'};
    },{gezaehlt:22,eindeutig_a:8,eindeutig_b:10,von_beiden_beansprucht:2},
    {zugeteilt:18,ueberschneidung_offen:2,ohne_zuordnung:2}),

  tool('trockner_freigabe_nach_schichtwechsel_kontakt',
    'Vor einer frühen Trocknerübergabe prüfen, ob jemand die Freimeldung in einem bestätigten Kontaktfenster absetzen kann — Check a verified notification handoff before the next dryer reservation.',
    dryer,{
      betriebsende_min:minutes('Früheste beobachtete Freimeldung nach vollständigem Programm und notwendiger Entnahme.'),
      besitzer_erreichbar_bis_min:minutes('Bis zu dieser Minute kann die bisherige Person nachsehen und persönlich Bescheid geben.'),
      folgeperson_erreichbar_ab_min:minutes('Ab dieser Minute kann die Folgeperson die Freimeldung erhalten.'),
      folgetermin_min:minutes('Beginn der anschließenden Buchung auf derselben Zeitachse.'),
      bestaetigte_uebergabe:yes('Beide haben die Freimeldung als Übergabe vereinbart.'),
    },({betriebsende_min,besitzer_erreichbar_bis_min,folgeperson_erreichbar_ab_min,folgetermin_min,bestaetigte_uebergabe})=>{
      const ab=Math.max(betriebsende_min,folgeperson_erreichbar_ab_min),bis=Math.min(besitzer_erreichbar_bis_min,folgetermin_min);
      return {nachricht_vor_folgetermin_planbar:bestaetigte_uebergabe&&ab<=bis,
        fruehestens_absprache_min:bestaetigte_uebergabe&&ab<=bis?ab:null,
        hinweis:'Freimeldung erst nach tatsächlichem Ende und Entnahme. Als Betriebsende für die Planung diesen vorgesehenen Zeitpunkt einsetzen.'};
    },{betriebsende_min:870,besitzer_erreichbar_bis_min:895,folgeperson_erreichbar_ab_min:880,folgetermin_min:890,bestaetigte_uebergabe:true},
    {nachricht_vor_folgetermin_planbar:true,fruehestens_absprache_min:880}),

  tool('wasserkocher_zwei_arbeitsplaetze_verschiedene_volumen',
    'Zwei gleichzeitig angeforderte Mengen mit vorab geeigneten, unterschiedlich großen vorhandenen Behältern abgleichen — Assign two measured quantities to distinct approved serving vessels.',
    kitchen,{
      a_ml:quantity('Von Arbeitsplatz A benötigte Menge in ml.',10000),
      b_ml:quantity('Von Arbeitsplatz B benötigte Menge in ml.',10000),
      klein_ml:quantity('Nutzbare Menge des kleineren geeigneten Gefäßes in ml.',10000),
      gross_ml:quantity('Nutzbare Menge des größeren geeigneten Gefäßes in ml.',10000),
      beide_geeignet:yes('Beide Gefäße sind für die jeweilige Aufgabe und vorgesehene Temperatur geeignet.'),
    },({a_ml,b_ml,klein_ml,gross_ml,beide_geeignet})=>{
      if (klein_ml>gross_ml || !a_ml || !b_ml) throw new RangeError();
      return {kleines_gefaess_an:beide_geeignet?[a_ml<=klein_ml&&b_ml<=gross_ml?'A':null,b_ml<=klein_ml&&a_ml<=gross_ml?'B':null].filter(Boolean):null,
        mindeste_fehlmenge_ml:beide_geeignet?round(Math.min(nonnegative(a_ml-klein_ml)+nonnegative(b_ml-gross_ml),nonnegative(a_ml-gross_ml)+nonnegative(b_ml-klein_ml))):null,
        hinweis:'Füllgrenzen und vorgesehene Handhabung beachten. Die Prüfung erteilt keine Freigabe für heiße Inhalte.'};
    },{a_ml:450,b_ml:600,klein_ml:350,gross_ml:700,beide_geeignet:true},
    {kleines_gefaess_an:[],mindeste_fehlmenge_ml:100}),

  tool('backofen_zwei_teams_praxisreservierung_prioritaet',
    'Beim bereits gemeinsam bestätigten Backofenbetrieb eine gleichrangige Doppelbuchung mit der vereinbarten Vorrangregel lösen — Resolve an oven booking tie by the household’s explicit turn-taking rule.',
    kitchen,{
      a_bestaetigt:yes('Aufgabe A ist mit dokumentiert geeignetem Betrieb angemeldet.'),
      b_bestaetigt:yes('Aufgabe B ist mit dokumentiert geeignetem Betrieb angemeldet.'),
      letzter_vorrang:choice('Wer bekam beim letzten gleichrangigen Konflikt Vorrang?','A','B','unbekannt'),
      beide_passen_gleichzeitig:yes('Für diese Aufgaben ist eine gleichzeitige Belegung ausdrücklich geprüft und akzeptiert.'),
    },({a_bestaetigt,b_bestaetigt,letzter_vorrang,beide_passen_gleichzeitig})=>{
      if (beide_passen_gleichzeitig&&(!a_bestaetigt||!b_bestaetigt)) throw new RangeError();
      const naechste=a_bestaetigt&&b_bestaetigt?
        (beide_passen_gleichzeitig?'beide':letzter_vorrang==='unbekannt'?null:letzter_vorrang==='A'?'B':'A'):
        a_bestaetigt?'A':b_bestaetigt?'B':null;
      return {vorrang_diesmal:naechste,einigung_offen:a_bestaetigt&&b_bestaetigt&&naechste===null,
        hinweis:'Verwendet nur die zuvor vereinbarte Abwechslung bei gleichrangigen Aufgaben. Keine Temperatur- oder Beladungsempfehlung.'};
    },{a_bestaetigt:true,b_bestaetigt:true,letzter_vorrang:'A',beide_passen_gleichzeitig:false},
    {vorrang_diesmal:'B',einigung_offen:false}),

  tool('heissluft_mitnutzung_einzelschublade_kompromiss',
    'Eine flexible Küchenaufgabe zwischen vorab bestätigten Startmöglichkeiten und einer strikt belegten Schublade vermitteln — Rank a flexible basket use against an immutable reservation.',
    kitchen,{
      fest_ab_min:minutes('Beginn der festen Belegung auf der gemeinsamen Minutenachse.'),
      fest_bis_min:minutes('Ende der festen Belegung einschließlich vorgeschriebener Freigabe.'),
      flexibel_ab_min:minutes('Frühester möglicher Start der flexiblen Nutzung.'),
      betriebsblock_min:minutes('Deren unteilbare gemessene Belegung bis zur Freigabe.'),
      zugesagt_bis_min:minutes('Zeitpunkt, vor dem auch der flexible Einsatz beendet sein muss.'),
    },({fest_ab_min,fest_bis_min,flexibel_ab_min,betriebsblock_min,zugesagt_bis_min})=>{
      intervals([fest_ab_min,fest_bis_min],[flexibel_ab_min,zugesagt_bis_min]);
      if (!betriebsblock_min) throw new RangeError();
      const ab=flexibel_ab_min+betriebsblock_min<=fest_ab_min?flexibel_ab_min:Math.max(fest_bis_min,flexibel_ab_min);
      return {fruehester_konfliktfreier_start_min:ab+betriebsblock_min<=zugesagt_bis_min?ab:null,
        zusage_neu_absprechen:ab+betriebsblock_min>zugesagt_bis_min,
        hinweis:'Vorgesehene Gar-, Abkühl- und Wechselzeiten in den bestätigten Belegungen berücksichtigen.'};
    },{fest_ab_min:1040,fest_bis_min:1070,flexibel_ab_min:1025,betriebsblock_min:22,zugesagt_bis_min:1100},
    {fruehester_konfliktfreier_start_min:1070,zusage_neu_absprechen:false}),

  tool('spuelbecken_aufgaben_wechselruhe_vergleichen',
    'Für zwei freigegebene Arbeitsaufträge am selben Becken die Reihenfolge mit dem geringeren beobachteten Rückbau ermitteln — Compare direction-dependent sink reset time for a shared handoff.',
    kitchen,{
      a_min:minutes('Eigene gemessene aktive Beckenzeit für A.'),
      b_min:minutes('Eigene gemessene aktive Beckenzeit für B.'),
      rueckbau_ab_min:minutes('Zwischenzeit nach Aufgabe A, bevor B das Becken wie vorgesehen nutzen kann.'),
      rueckbau_ba_min:minutes('Zwischenzeit nach B, bevor A das Becken nutzen kann.'),
      vereinbartes_fenster_min:minutes('Gesamtfenster für beide Aufgaben am Becken.'),
    },({a_min,b_min,rueckbau_ab_min,rueckbau_ba_min,vereinbartes_fenster_min})=>{
      const ab=a_min+b_min+rueckbau_ab_min,ba=a_min+b_min+rueckbau_ba_min;
      return {zeit_ab_min:round(ab),zeit_ba_min:round(ba),ordnung_mit_kleinstem_aufwand:ab===ba?'beide':ab<ba?'AB':'BA',
        mindestens_ein_ablauf_passt:Math.min(ab,ba)<=vereinbartes_fenster_min,
        hinweis:'Die gemessene Wechselzeit umfasst die übliche Reinigung und Vorbereitung. Sie sagt nichts über Hygiene aus.'};
    },{a_min:11,b_min:16,rueckbau_ab_min:7,rueckbau_ba_min:2,vereinbartes_fenster_min:32},
    {zeit_ab_min:34,zeit_ba_min:29,ordnung_mit_kleinstem_aufwand:'BA',mindestens_ein_ablauf_passt:true}),

  tool('badezimmer_gemeinsame_nutzung_drei_mindestslots',
    'Bei drei freiwilligen Badterminen nur die von allen akzeptierte Mindestverkürzung einsetzen — Fit three bathroom bookings by reducing only time explicitly offered for release.',
    shower,{
      gesamt_geplant_min:minutes('Addierte Dauer der drei nacheinander geplanten Badtermine inklusive Übergaben.'),
      frei_min:minutes('Tatsächlich verfügbare gemeinsame Zeit.'),
      a_bietet_min:minutes('Von A bereits freiwillig zur Kürzung freigegebene Minuten.'),
      b_bietet_min:minutes('Von B bereits freiwillig zur Kürzung freigegebene Minuten.'),
      c_bietet_min:minutes('Von C bereits freiwillig zur Kürzung freigegebene Minuten.'),
    },({gesamt_geplant_min,frei_min,a_bietet_min,b_bietet_min,c_bietet_min})=>{
      const angeboten=a_bietet_min+b_bietet_min+c_bietet_min;
      if (angeboten>gesamt_geplant_min) throw new RangeError();
      const knapp=nonnegative(gesamt_geplant_min-frei_min);
      return {kuerzung_noetig_min:round(knapp),freiwillig_abgedeckt_min:round(Math.min(knapp,angeboten)),
        neue_absprache_min:round(nonnegative(knapp-angeboten)),
        hinweis:'Ein Angebot gilt nur für die eigene Zeit. Fester Übergabeaufwand wird nicht gekürzt.'};
    },{gesamt_geplant_min:79,frei_min:65,a_bietet_min:5,b_bietet_min:3,c_bietet_min:4},
    {kuerzung_noetig_min:14,freiwillig_abgedeckt_min:12,neue_absprache_min:2}),

  tool('entfeuchter_gemeinsamer_ablauf_wegzeiten_absprache',
    'Ein dokumentiertes festes Ablauf-Setup mit einer gleichzeitig gewünschten Durchgangsfreigabe abgleichen — Flag a room-use collision when the approved drainage setup must stay in place.',
    cellar,{
      ablauf_blockiert_weg:yes('Die bereits dokumentierte feste Aufstellung hält den betreffenden Weg während der Nutzung belegt.'),
      weg_gebraucht:yes('Eine andere Person hat denselben Weg während dieser Zeit fest eingeplant.'),
      ausweichweg_bestaetigt:yes('Ein geeigneter anderer Weg wurde bereits vor Ort geprüft und vereinbart.'),
      tankmodus_bestaetigt:yes('Tankbetrieb am anderen vorgesehenen Platz ist laut Anleitung und vor Ort bereits geklärt.'),
    },({ablauf_blockiert_weg,weg_gebraucht,ausweichweg_bestaetigt,tankmodus_bestaetigt})=>{
      const konflikt=ablauf_blockiert_weg&&weg_gebraucht;
      return {wegkonflikt:konflikt,abgestimmte_alternativen:konflikt?
        [ausweichweg_bestaetigt?'bestätigten Ausweichweg nutzen':null,tankmodus_bestaetigt?'bestätigten Tankbetrieb einplanen':null].filter(Boolean):[],
        hinweis:'Keine Abfluss- oder Wegefreigabe. Zugänge und Fluchtwege freihalten. Niemals für den laufenden Betrieb an einer Ablaufleitung improvisieren.'};
    },{ablauf_blockiert_weg:true,weg_gebraucht:true,ausweichweg_bestaetigt:false,tankmodus_bestaetigt:true},
    {wegkonflikt:true,abgestimmte_alternativen:['bestätigten Tankbetrieb einplanen']}),

  tool('entfeuchter_keller_mehrtagestermine_abdeckung',
    'Über mehrere Tage einzelne bestätigte Bedienbesuche prüfen, ohne doppelt besetzte Tage als zusätzlichen Einsatz zu zählen — Reconcile overlapping coverage when two people share cellar visits.',
    cellar,{
      geplante_tage:quantity('Vereinbarte Tage mit jeweils einem abzudeckenden Termin.',31),
      a_besetzte_tage:quantity('Davon Tage mit einem bestätigten Besuch durch A.',31),
      b_besetzte_tage:quantity('Davon Tage mit einem bestätigten Besuch durch B.',31),
      beide_selbe_tage:quantity('Tage, die in beiden Angaben vorkommen.',31),
    },({geplante_tage,a_besetzte_tage,b_besetzte_tage,beide_selbe_tage})=>{
      whole(geplante_tage,a_besetzte_tage,b_besetzte_tage,beide_selbe_tage);
      const abgedeckt=a_besetzte_tage+b_besetzte_tage-beide_selbe_tage;
      if (beide_selbe_tage>Math.min(a_besetzte_tage,b_besetzte_tage)||abgedeckt>geplante_tage) throw new RangeError();
      return {eindeutig_abgedeckte_tage:abgedeckt,tage_neu_zuordnen:geplante_tage-abgedeckt,
        doppelbesetzungen:beide_selbe_tage,hinweis:'Besuche bestätigen keine Eignung für Dauerbetrieb. Messwerte, Feuchteursache und Geräteanleitung separat prüfen.'};
    },{geplante_tage:7,a_besetzte_tage:5,b_besetzte_tage:3,beide_selbe_tage:2},
    {eindeutig_abgedeckte_tage:6,tage_neu_zuordnen:1,doppelbesetzungen:2}),

  tool('keller_messnotiz_zugang_und_abholung_termine',
    'Eine freiwillige Messrunde nur mit bestätigtem Raumzugang und rechtzeitiger Abholung planen — Check a two-person measurement role split without assuming self-access.',
    cellar,{
      raum_frei_ab_min:minutes('Bestätigter Zugang zum Messort ab dieser Minute.'),
      raum_frei_bis_min:minutes('Bestätigtes Ende desselben Zeitfensters.'),
      abholung_ab_min:minutes('Ab dieser Minute ist die übernehmende Person tatsächlich vor Ort.'),
      messzeit_min:minutes('Für diese eigene Beobachtung geplante Dauer ab bestätigtem Beginn.'),
    },({raum_frei_ab_min,raum_frei_bis_min,abholung_ab_min,messzeit_min})=>{
      intervals([raum_frei_ab_min,raum_frei_bis_min]);
      const ab=Math.max(raum_frei_ab_min+messzeit_min,abholung_ab_min);
      return {abholung_im_zugang:ab<=raum_frei_bis_min,abholung_min:ab<=raum_frei_bis_min?round(ab):null,
        zeit_ohne_abholung_nach_messende_min:round(nonnegative(abholung_ab_min-(raum_frei_ab_min+messzeit_min))),
        hinweis:'Nur ein bestätigtes Zugangsfenster auswerten. Verzögerte Abholung ersetzt keine vollständige Messung.'};
    },{raum_frei_ab_min:360,raum_frei_bis_min:420,abholung_ab_min:416,messzeit_min:40},
    {abholung_im_zugang:true,abholung_min:416,zeit_ohne_abholung_nach_messende_min:16}),

  tool('luftreiniger_zwei_raeume_tauschen_nur_beide_teilzeiten',
    'Ein vorhandenes Gerät nur dann nacheinander teilen, wenn beide abgesprochenen Raumfenster vollständig bleiben — Test a purifier loan with explicit preferred partial-booking alternatives.',
    purifier,{
      a_besteht_min:minutes('Für A unbedingt benötigte vorhandene Dauer.'),
      a_optional_min:minutes('Weitere, ausdrücklich freigegebene optionale Dauer in Raum A.'),
      b_besteht_min:minutes('Für B unbedingt benötigte Dauer.'),
      transfer_min:minutes('Beobachtete Gesamtzeit für die vorgesehenen Transfers.'),
      gesamtrahmen_min:minutes('Für beide Räume nach Absprache verfügbares Gesamtfenster.'),
    },({a_besteht_min,a_optional_min,b_besteht_min,transfer_min,gesamtrahmen_min})=>{
      const rest=gesamtrahmen_min-a_besteht_min-b_besteht_min-transfer_min;
      return {beide_pflichtfenster_machbar:rest>=0,
        optional_in_a_machbar_min:round(Math.min(a_optional_min,nonnegative(rest))),
        pflichtluecke_min:round(nonnegative(-rest)),
        hinweis:'Dauerangaben sind eigene Raumwünsche. Für die Wirkung am jeweiligen Standort gelten andere Voraussetzungen.'};
    },{a_besteht_min:30,a_optional_min:18,b_besteht_min:44,transfer_min:7,gesamtrahmen_min:92},
    {beide_pflichtfenster_machbar:true,optional_in_a_machbar_min:11,pflichtluecke_min:0}),

  tool('luftreiniger_geteilter_raum_sitzplatz_ruheprofil',
    'Für zwei Raumaufgaben eine gleichzeitig akzeptierte, am Platz tatsächlich gehörte Lüfterstufe finden — Find a tested purifier setting acceptable to both listeners in the shared room.',
    purifier,{
      a_niedrig_ok:yes('Person A hat die niedrige Stufe an ihrem Platz für die konkrete Aufgabe akzeptiert.'),
      a_hoch_ok:yes('Person A hat auch die hohe Stufe vor Ort für dieselbe Aufgabe akzeptiert.'),
      b_niedrig_ok:yes('Person B hat die niedrige Stufe vor Ort akzeptiert.'),
      b_hoch_ok:yes('Person B hat die hohe Stufe vor Ort akzeptiert.'),
      pruefung_gleicher_ort:yes('Beide Stufen gehören zur selben Aufstellung und wurden an beiden vereinbarten Plätzen geprüft.'),
    },({a_niedrig_ok,a_hoch_ok,b_niedrig_ok,b_hoch_ok,pruefung_gleicher_ort})=>{
      return {fuer_beide_getestet:pruefung_gleicher_ort?
        [a_niedrig_ok&&b_niedrig_ok?'niedrig':null,a_hoch_ok&&b_hoch_ok?'hoch':null].filter(Boolean):null,
        hinweis:'Akzeptanz ist eine örtliche Beobachtung ohne Aussage zu Filterwirkung, Lautstärkegrenzen oder Luftqualität.'};
    },{a_niedrig_ok:true,a_hoch_ok:true,b_niedrig_ok:true,b_hoch_ok:false,pruefung_gleicher_ort:true},
    {fuer_beide_getestet:['niedrig']}),

  tool('werkstatt_geteilte_hilfsmittel_eindeutiger_bedarf',
    'Zwei ungefährliche Werkstattaufgaben mit überschneidendem Bedarf an derselben Sorte zugelassener Hilfsmittel planen — Allocate reusable workshop aids without double-counting already reserved units.',
    workshop,{
      brauchbare_hilfsmittel:quantity('Gleichzeitig nutzbare und für beide Aufgaben geeignete Hilfsmittel.'),
      a_bestaetigt_benoetigt:quantity('Fest zugesagte Zahl für Aufgabe A.'),
      b_bestaetigt_benoetigt:quantity('Zahl für die gleichzeitig geplante Aufgabe B.'),
      fuer_a_und_b_anderweitig_gesperrt:quantity('Davon separat belegte Hilfsmittel, die für keine der beiden Aufgaben frei sind.'),
    },({brauchbare_hilfsmittel,a_bestaetigt_benoetigt,b_bestaetigt_benoetigt,fuer_a_und_b_anderweitig_gesperrt})=>{
      whole(brauchbare_hilfsmittel,a_bestaetigt_benoetigt,b_bestaetigt_benoetigt,fuer_a_und_b_anderweitig_gesperrt);
      if (fuer_a_und_b_anderweitig_gesperrt>brauchbare_hilfsmittel) throw new RangeError();
      const frei=brauchbare_hilfsmittel-fuer_a_und_b_anderweitig_gesperrt;
      return {a_zusage_erfuellt:frei>=a_bestaetigt_benoetigt,nach_a_frei:nonnegative(frei-a_bestaetigt_benoetigt),
        b_fehlmenge:nonnegative(b_bestaetigt_benoetigt-nonnegative(frei-a_bestaetigt_benoetigt)),
        hinweis:'Prüft nur Stückzahlen. Für tragende, elektrische oder andere kritische Teile ist diese Rechnung ungeeignet.'};
    },{brauchbare_hilfsmittel:11,a_bestaetigt_benoetigt:5,b_bestaetigt_benoetigt:6,fuer_a_und_b_anderweitig_gesperrt:2},
    {a_zusage_erfuellt:true,nach_a_frei:4,b_fehlmenge:2}),

  tool('werkstatt_druckfreigabe_geteilter_stellbereich',
    'Bei zwei einfachen Druckprojekten die gemeinsam vereinbarte Aufsicht und den unabhängigen Zugang zum Abholpunkt prüfen — Register project collection only when the agreed supervision and access are covered.',
    workshop,{
      a_aufsicht:yes('Aufsicht für das erste geplante Projekt ist gemäß Anleitung und Absprache geklärt.'),
      b_aufsicht:yes('Aufsicht für das zweite geplante Projekt ist nach denselben Regeln geklärt.'),
      a_abholung:yes('Zugang zur fertigen Probe von A nach vorgesehenen Wartezeiten ist bestätigt.'),
      b_abholung:yes('Zugang zur fertigen Probe von B nach vorgesehenen Wartezeiten ist bestätigt.'),
      abholungen_zur_gleichen_zeit_moeglich:yes('Zwei zeitgleiche Abholungen am selben Ort sind ausdrücklich abgestimmt.'),
    },({a_aufsicht,b_aufsicht,a_abholung,b_abholung,abholungen_zur_gleichen_zeit_moeglich})=>{
      const a=a_aufsicht&&a_abholung,b=b_aufsicht&&b_abholung;
      return {einzeln_abgestimmte_projekte:[a?'A':null,b?'B':null].filter(Boolean),
        parallele_abholung_abgestimmt:a&&b&&abholungen_zur_gleichen_zeit_moeglich,
        hinweis:'Bezieht sich auf nichtkritische kleine Probedrucke und deren bereits vorgesehene Aufsicht. Keine Betriebsfreigabe für einen Drucker.'};
    },{a_aufsicht:true,b_aufsicht:false,a_abholung:true,b_abholung:true,abholungen_zur_gleichen_zeit_moeglich:true},
    {einzeln_abgestimmte_projekte:['A'],parallele_abholung_abgestimmt:false}),

  tool('warmwasser_terminfolge_beobachtete_wiederkehr',
    'Zwei aufeinanderfolgende Nutzungen mit der beobachteten Rückkehr des üblichen Anzeigenzustands abgleichen — Reserve the observed recovery interval before a separately booked hot-water use.',
    shower,{
      erste_entnahme_ende_min:minutes('Beobachtetes Ende der ersten Nutzung auf gemeinsamer Zeitachse.'),
      zweiter_termin_ab_min:minutes('Abgesprochener Beginn der nächsten Nutzung auf derselben Achse.'),
      zweite_person_spaetestens_min:minutes('Spätester von der nächsten Person ausdrücklich akzeptierter Beginn.'),
      beobachtete_erholung_min:minutes('Unter vergleichbaren Bedingungen gemessene Zeit bis zur üblichen dokumentierten Anzeige.'),
    },({erste_entnahme_ende_min,zweiter_termin_ab_min,zweite_person_spaetestens_min,beobachtete_erholung_min})=>{
      intervals([zweiter_termin_ab_min,zweite_person_spaetestens_min]);
      const neu=Math.max(zweiter_termin_ab_min,erste_entnahme_ende_min+beobachtete_erholung_min);
      return {vereinbarte_zweitzusage_haltbar:neu<=zweite_person_spaetestens_min,
        beobachtungsbasiert_fruehester_start_min:round(neu),
        hinweis:'Plant nur anhand der üblichen Geräteanzeige und gleichartiger Beobachtung. Keine Wasser-, Temperatur- oder Hygienegrenze.'};
    },{erste_entnahme_ende_min:451,zweiter_termin_ab_min:470,zweite_person_spaetestens_min:486,beobachtete_erholung_min:24},
    {vereinbarte_zweitzusage_haltbar:true,beobachtungsbasiert_fruehester_start_min:475}),

  tool('haushaltsgeraet_geteilter_arbeitsplatz_pufferzeiten',
    'Am gemeinsam genutzten freigegebenen Arbeitsplatz nach einem frühen Rückbau feststellen, ob die nächste Person ihre Zusage vorziehen kann — Test an earlier shared workspace handoff against actual readiness and consent.',
    appliances,{
      bisherige_zusage_ab_min:minutes('Unverändert zugesagter Beginn der nächsten Nutzung.'),
      raum_tatsaechlich_frei_min:minutes('Beobachtete Freigabe nach Entfernen der ersten Einrichtung.'),
      neue_person_bereit_min:minutes('Bestätigter frühester Beginn der Folgeperson.'),
      eigener_aufbau_min:minutes('Zusätzliche Minuten für den bereits geklärten eigenen Aufbau.'),
      vorziehen_angenommen:yes('Die frühere Nutzung ist von beiden freiwillig angenommen.'),
    },({bisherige_zusage_ab_min,raum_tatsaechlich_frei_min,neue_person_bereit_min,eigener_aufbau_min,vorziehen_angenommen})=>{
      const bereit=Math.max(raum_tatsaechlich_frei_min,neue_person_bereit_min)+eigener_aufbau_min;
      return {vorziehen_min:vorziehen_angenommen?round(nonnegative(bisherige_zusage_ab_min-bereit)):null,
        regulaere_zusage_gefaehrdet:bereit>bisherige_zusage_ab_min,
        hinweis:'Uhrzeiten auf derselben Achse. Nur freigegebene Arbeitsplätze, Aufbau und bezogene Betriebsart verwenden.'};
    },{bisherige_zusage_ab_min:735,raum_tatsaechlich_frei_min:710,neue_person_bereit_min:715,eigener_aufbau_min:8,vorziehen_angenommen:true},
    {vorziehen_min:12,regulaere_zusage_gefaehrdet:false}),

  tool('kuehlfach_geteilte_reserve_verbindliche_nachfuellung',
    'Eine überlassene gemeinsame Reserve zwischen bereits zugesagter und rücknehmbarer Belegung aufteilen — Separate firm cold-storage reservations from voluntarily releasable extras.',
    appliances,{
      plaetze:quantity('Bestätigte Plätze für dieselbe Behältergröße im vorgesehenen Fach.'),
      fest_belegt:quantity('Davon fest zugesagte gleichzeitig belegte Plätze.'),
      optional_belegt:quantity('Weitere belegte Plätze, deren Nutzende eine Verlagerung angeboten haben.'),
      zugesagter_nachschub:quantity('Vereinbarte neue gleich große Behälter.'),
    },({plaetze,fest_belegt,optional_belegt,zugesagter_nachschub})=>{
      whole(plaetze,fest_belegt,optional_belegt,zugesagter_nachschub);
      if (fest_belegt+optional_belegt>plaetze) throw new RangeError();
      const frei=plaetze-fest_belegt-optional_belegt;
      return {optionale_plaetze_freigeben:Math.min(optional_belegt,nonnegative(zugesagter_nachschub-frei)),
        ausserhalb_der_reserve:nonnegative(zugesagter_nachschub-plaetze+fest_belegt),
        hinweis:'Nur geeignete, bestätigte Ablageplätze. Verlagerung erfolgt durch die Beteiligten nach Absprache und den Lagerhinweisen.'};
    },{plaetze:8,fest_belegt:4,optional_belegt:2,zugesagter_nachschub:5},
    {optionale_plaetze_freigeben:2,ausserhalb_der_reserve:1}),

  tool('strommessgeraet_ausleihe_zwei_terminpaare_stabil',
    'Bei zwei gleitenden Ausleihfenstern prüfen, ob beide unteilbaren Messabschnitte bei einer zulässigen Rückgabe in mindestens einer Reihenfolge passen — Check both complete meter-loan orders with separate booking windows and a verified return gap.',
    power,{
      a_frueh_min:minutes('Frühester Start des vollständigen Abschnitts A ab Zeitachsenbeginn.'),
      a_spaet_min:minutes('Spätester laut Absprache noch passender Start des Abschnitts A.'),
      a_dauer_min:minutes('Dauer des unteilbaren Abschnitts A.'),
      b_frueh_min:minutes('Frühester Start des vollständigen Abschnitts B.'),
      b_spaet_min:minutes('Spätester passender Start des Abschnitts B.'),
      b_dauer_min:minutes('Dauer des unteilbaren Abschnitts B.'),
      rueckgabe_min:minutes('Benötigte bestätigte Zeit der Übernahme in beiden Richtungen.'),
    },({a_frueh_min,a_spaet_min,a_dauer_min,b_frueh_min,b_spaet_min,b_dauer_min,rueckgabe_min})=>{
      intervals([a_frueh_min,a_spaet_min],[b_frueh_min,b_spaet_min]);
      if (!a_dauer_min||!b_dauer_min) throw new RangeError();
      const ab=Math.max(b_frueh_min,a_frueh_min+a_dauer_min+rueckgabe_min)<=b_spaet_min;
      const ba=Math.max(a_frueh_min,b_frueh_min+b_dauer_min+rueckgabe_min)<=a_spaet_min;
      return {geeignete_reihenfolgen:[ab?'AB':null,ba?'BA':null].filter(Boolean),
        hinweis:'Nur vollständige Messfenster berücksichtigen. Geeignetes Messgerät und dokumentierte Übernahme vorher sicherstellen.'};
    },{a_frueh_min:355,a_spaet_min:410,a_dauer_min:50,b_frueh_min:350,b_spaet_min:400,b_dauer_min:28,rueckgabe_min:10},
    {geeignete_reihenfolgen:['BA']}),

  tool('haushaltsstrom_messlauf_vor_lastwechsel_fenster',
    'Ein geplantes Haushalts-Messfenster durch erwartete kurzzeitige Zusatznutzungen prüfen und den zuerst neu abzusprechenden Abschnitt finden — Identify which scheduled background-load changes compromise a shared baseline observation.',
    power,{
      grundprobe_ab_min:minutes('Start des vereinbarten ununterbrochenen Beobachtungsfensters.'),
      grundprobe_bis_min:minutes('Ende derselben Probe.'),
      a_zusatz_ab_min:minutes('Bestätigter Beginn einer zusätzlichen Nutzung aus Zimmer A.'),
      a_zusatz_bis_min:minutes('Bestätigtes Ende desselben Zusatzfensters.'),
      b_zusatz_ab_min:minutes('Bestätigter Beginn einer anderen zusätzlichen Nutzung aus Zimmer B.'),
      b_zusatz_bis_min:minutes('Bestätigtes Ende desselben Zusatzfensters.'),
    },({grundprobe_ab_min,grundprobe_bis_min,a_zusatz_ab_min,a_zusatz_bis_min,b_zusatz_ab_min,b_zusatz_bis_min})=>{
      intervals([grundprobe_ab_min,grundprobe_bis_min],[a_zusatz_ab_min,a_zusatz_bis_min],[b_zusatz_ab_min,b_zusatz_bis_min]);
      const a=overlap(grundprobe_ab_min,grundprobe_bis_min,a_zusatz_ab_min,a_zusatz_bis_min);
      const b=overlap(grundprobe_ab_min,grundprobe_bis_min,b_zusatz_ab_min,b_zusatz_bis_min);
      const zuerst=a&&b?(Math.max(a_zusatz_ab_min,grundprobe_ab_min)===Math.max(b_zusatz_ab_min,grundprobe_ab_min)?'beide':a_zusatz_ab_min<b_zusatz_ab_min?'A':'B'):a?'A':b?'B':null;
      return {neu_absprechen_zuerst:zuerst,probe_ohne_geplante_zusatznutzung:!a&&!b,
        hinweis:'Vergleicht geplante Zeitfenster am selben Messpunkt. Gleichzeitige Nutzung gehört in ein getrennt gekennzeichnetes Protokoll.'};
    },{grundprobe_ab_min:70,grundprobe_bis_min:120,a_zusatz_ab_min:94,a_zusatz_bis_min:110,b_zusatz_ab_min:58,b_zusatz_bis_min:80},
    {neu_absprechen_zuerst:'B',probe_ohne_geplante_zusatznutzung:false}),

  tool('ventilator_schichttermin_ruhe_noch_zu_bestaetigen',
    'Eine vermutete Geräuschüberschneidung zwischen zwei vereinbarten Arbeitsplätzen anhand gemeinsam belegter Beobachtung eingrenzen — Distinguish known disturbance from an uncertain observation edge.',
    fan,{
      lauter_abschnitt_sicher_min:minutes('Sicher im Termin liegende beobachtete laute Minuten am weiter entfernten Arbeitsplatz.'),
      moegliche_rand_min:minutes('Weitere möglicherweise überlappende Minuten am selben Arbeitsplatz.'),
      termin_min:minutes('Gesamtdauer des gemeinsamen Termins.'),
      hoechstens_stoerend_min:minutes('Maximal vereinbarte störende Minuten, freiwillig festgelegt.'),
    },({lauter_abschnitt_sicher_min,moegliche_rand_min,termin_min,hoechstens_stoerend_min})=>{
      const maximum=lauter_abschnitt_sicher_min+moegliche_rand_min;
      if (maximum>termin_min || hoechstens_stoerend_min>termin_min) throw new RangeError();
      return {stoerungsspanne_min:[lauter_abschnitt_sicher_min,maximum],
        termin_einschaetzung:maximum<=hoechstens_stoerend_min?'passt laut Probe':lauter_abschnitt_sicher_min>hoechstens_stoerend_min?'vereinbarte Grenze überschritten':'erneut beobachten',
        hinweis:'Die Abgrenzung gilt am beobachteten Arbeitsplatz. Persönliche Vereinbarung, keine Schallgrenze oder Pegelmessung.'};
    },{lauter_abschnitt_sicher_min:5,moegliche_rand_min:4,termin_min:35,hoechstens_stoerend_min:7},
    {stoerungsspanne_min:[5,9],termin_einschaetzung:'erneut beobachten'}),

  tool('lueftung_mehrtagesplan_ersatzbesuche_nur_bestaetigt',
    'Im freiwilligen Wochenplan abgesagte Lüftungstermine anhand vorab bestätigter Ersatzkapazität abgleichen — Fill cancelled shared ventilation checks from confirmed backup slots.',
    ventilation,{
      geforderte_termine:quantity('Vereinbarte Termine mit je einer freiwilligen Aufgabe.',31),
      a_weiter_bestaetigt:quantity('Feste Termine, die durch A weiter abgedeckt sind.',31),
      b_neu_bestaetigt:quantity('Davon getrennte aufgegebene Termine, für die B den Ersatz jeweils bestätigt.',31),
      c_noch_ohne_termin:quantity('Bestätigte zusätzliche, frei einteilbare Einsätze, falls noch Termine offen sind.',31),
    },({geforderte_termine,a_weiter_bestaetigt,b_neu_bestaetigt,c_noch_ohne_termin})=>{
      whole(geforderte_termine,a_weiter_bestaetigt,b_neu_bestaetigt,c_noch_ohne_termin);
      const offen=geforderte_termine-a_weiter_bestaetigt-b_neu_bestaetigt;
      if (offen<0) throw new RangeError();
      return {ersatz_zur_zuordnung:Math.min(offen,c_noch_ohne_termin),
        trotzdem_ohne_bestaetigung:nonnegative(offen-c_noch_ohne_termin),
        hinweis:'Freie Kapazität ist noch kein verbindlicher Termin. Nur vereinbarte Vor-Ort-Prüfaufgaben zählen.'};
    },{geforderte_termine:7,a_weiter_bestaetigt:2,b_neu_bestaetigt:2,c_noch_ohne_termin:2},
    {ersatz_zur_zuordnung:2,trotzdem_ohne_bestaetigung:1}),

  tool('saugwischer_zwei_haushaltsteam_verschleissteilsatz',
    'Zwei getrennte geplante Reinigungen mit bestätigten vollständigen Teilesätzen abgleichen — Detect which cleaning team can start with the model-approved parts on hand.',
    floor,{
      eins_komplett:yes('Team 1 hat einen vollständigen trockenen, passenden Teilesatz.'),
      zwei_komplett:yes('Team 2 hat ebenfalls einen getrennten vollständigen passenden Satz.'),
      zusatz_passt_eins:yes('Ein zusätzlich verfügbarer Satz ist für Team 1 und dessen Modell bestätigt.'),
      zusatz_passt_zwei:yes('Derselbe zusätzliche Satz ist für Team 2 und dessen Modell bestätigt.'),
      eins_fest_vorrang:yes('Vorherige Vereinbarung gibt Team 1 bei konkurrierender Nachfrage Vorrang.'),
    },({eins_komplett,zwei_komplett,zusatz_passt_eins,zusatz_passt_zwei,eins_fest_vorrang})=>{
      const eins=!eins_komplett&&zusatz_passt_eins,zwei=!zwei_komplett&&zusatz_passt_zwei;
      const extra=eins&&zwei?(eins_fest_vorrang?'Team 1':null):eins?'Team 1':zwei?'Team 2':null;
      return {zusaetzlicher_satz_an:extra,zuteilung_offen:eins&&zwei&&extra===null,
        saetze_fuer_geplante_reinigungen:Number(eins_komplett)+Number(zwei_komplett)+Number(extra!==null),
        hinweis:'Nur bestätigte vollständige Sätze zählen. Kein Ersatzteil allein anhand ähnlicher Modellnamen verwenden.'};
    },{eins_komplett:false,zwei_komplett:false,zusatz_passt_eins:true,zusatz_passt_zwei:true,eins_fest_vorrang:true},
    {zusaetzlicher_satz_an:'Team 1',zuteilung_offen:false,saetze_fuer_geplante_reinigungen:1}),

  tool('haushalt_drei_aufgaben_gemeinsamer_helfer_zeitguthaben',
    'Einen gemeinsamen Helfer zwischen einer festen, einer unterbrechbaren und einer unteilbaren Geräteaufgabe einteilen — Allocate a shared helper across firm, divisible and indivisible tasks.',
    appliances,{
      helfer_frei_min:minutes('Zusammenhängende zugesagte aktive Zeit der helfenden Person.'),
      fest_min:minutes('Zeit der vorrangig fest zugesagten Aufgabe.'),
      teilbare_min:minutes('Benötigte aktive Zeit einer ausdrücklich in Teilschritte aufteilbaren Aufgabe.'),
      unteilbare_min:minutes('Benötigte aktive Zeit der restlichen unteilbaren Aufgabe.'),
      unteilbare_zuerst:yes('Die Gruppe hat der unteilbaren Aufgabe nach der festen Aufgabe Vorrang gegeben.'),
    },({helfer_frei_min,fest_min,teilbare_min,unteilbare_min,unteilbare_zuerst})=>{
      if (!unteilbare_min) throw new RangeError();
      const frei=nonnegative(helfer_frei_min-fest_min);
      const unteilbarPasst=unteilbare_min<=(unteilbare_zuerst?frei:nonnegative(frei-teilbare_min));
      const teilbarMachbar=Math.min(teilbare_min,frei-(unteilbarPasst?unteilbare_min:0));
      return {feste_zusage_machbar:helfer_frei_min>=fest_min,unteilbare_aufgabe_machbar:unteilbarPasst,
        teilbare_aufgabe_angerechnet_min:round(teilbarMachbar),
        hinweis:'Planteilung gilt für Aufgaben mit bestätigten Pausen. Freigaben und notwendige Reihenfolge des jeweiligen Geräts separat einhalten.'};
    },{helfer_frei_min:48,fest_min:19,teilbare_min:19,unteilbare_min:15,unteilbare_zuerst:true},
    {feste_zusage_machbar:true,unteilbare_aufgabe_machbar:true,teilbare_aufgabe_angerechnet_min:14}),
];
