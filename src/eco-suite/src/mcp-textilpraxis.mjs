const laundry = '/guide/waesche-trocknen-wohnung.html';
const heatedRack = '/guide/beheizter-waeschestaender.html';
const dryer = '/waeschetrockner-oder-luftentfeuchter.html';
const wardrobe = '/guide/schimmel-kleiderschrank.html';
const curtain = '/guide/thermovorhang-ratgeber.html';
const cleaner = '/guide/saugwischer-kaufberatung.html';
const measurements = '/guide/luftfeuchtigkeit-richtig-messen.html';

const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const choice = (description,...values) => ({type:'string', description, enum:values});
const cm = description => number(description,0,1000);
const grams = description => number(description,0,20000);
const count = description => number(description,0,300);
const minutes = description => number(description,0,1440);
const round = (value,places=2) => Number(value.toFixed(places));
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Stückzahl muss ganzzahlig sein');
}
function tool(name,description,page,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const textilpraxis = [
  tool('waesche_schleuderstufen_gemischte_textilien',
    'Dokumentierte Schleuderstufen für zwei Textilien abgleichen — Match documented spin options to the tighter limit of two textiles.',dryer,
    {freigabe_belegt:flag('Sind Grenzdrehzahl und übrige Voraussetzungen für beide Textilien sowie den gemeinsamen Zyklus bestätigt?'),
      textil_a_max:number('Bestätigte Obergrenze A in U/min.',0,3000),textil_b_max:number('Bestätigte Obergrenze B in U/min.',0,3000),
      stufe_eins:number('Erste verfügbare Stufe im gewählten Programm in U/min.',0,3000),
      stufe_zwei:number('Zweite verfügbare Stufe im gewählten Programm in U/min.',0,3000),
      stufe_drei:number('Dritte verfügbare Stufe; bei weniger Stufen höchste vorhandene wiederholen.',0,3000)},
    ({freigabe_belegt,textil_a_max,textil_b_max,stufe_eins,stufe_zwei,stufe_drei})=>{
      const maximum=Math.min(textil_a_max,textil_b_max);
      const options=[...new Set([stufe_eins,stufe_zwei,stufe_drei])].filter(value=>value<=maximum).sort((a,b)=>a-b);
      return {gemeinsame_obergrenze:freigabe_belegt?maximum:null,passende_stufen:freigabe_belegt?options:[],
        status:!freigabe_belegt?'etikett_oder_anleitung_klaeren':options.length?'stufe_im_geprueften_rahmen':'getrennt_planen',
        grenze:'Prüft die drei eingetragenen Stufen nur gegen belegte Grenzdrehzahlen. Weitere Pflegevorgaben separat einhalten.'};
    },{freigabe_belegt:true,textil_a_max:1200,textil_b_max:800,stufe_eins:600,stufe_zwei:900,stufe_drei:1200},
    {gemeinsame_obergrenze:800,passende_stufen:[600],status:'stufe_im_geprueften_rahmen'}),

  tool('waesche_trockenweg_sortierplan',
    'Pflegewege vor dem Waschen nach bestätigten Trockenvorgaben sortieren — Split a textile batch by the confirmed drying route.',laundry,
    {nur_liegend:count('Stücke, die laut Etikett liegend getrocknet werden.'),nur_aufgehaengt:count('Stücke mit bestätigtem Weg zum Aufhängen.'),
      beide_wege:count('Stücke mit bestätigter Wahl zwischen Liegen und Hängen.'),ungeklaert:count('Stücke mit ungeklärtem Pflegeweg.'),
      freie_liegeplaetze:count('Gleichzeitig freie Liegeplätze passender Größe.'),freie_haengeplaetze:count('Gleichzeitig freie geeignete Hängeplätze.')},
    ({nur_liegend,nur_aufgehaengt,beide_wege,ungeklaert,freie_liegeplaetze,freie_haengeplaetze})=>{
      whole(nur_liegend,nur_aufgehaengt,beide_wege,ungeklaert,freie_liegeplaetze,freie_haengeplaetze);
      const liegeReserve=Math.max(0,freie_liegeplaetze-nur_liegend);
      const haengeReserve=Math.max(0,freie_haengeplaetze-nur_aufgehaengt);
      const flexibleHaengend=Math.min(haengeReserve,beide_wege);
      const flexibleLiegend=Math.min(liegeReserve,beide_wege-flexibleHaengend);
      return {liegend:Math.min(nur_liegend,freie_liegeplaetze)+flexibleLiegend,
        haengend:Math.min(nur_aufgehaengt,freie_haengeplaetze)+flexibleHaengend,
        spaeter:Math.max(0,nur_liegend-freie_liegeplaetze)+Math.max(0,nur_aufgehaengt-freie_haengeplaetze)+beide_wege-flexibleLiegend-flexibleHaengend,
        erst_klaeren:ungeklaert,grenze:'Nur bestätigte Wege und tatsächlich passende Plätze zählen. Unklare Stücke separat halten.'};
    },{nur_liegend:3,nur_aufgehaengt:2,beide_wege:4,ungeklaert:1,freie_liegeplaetze:2,freie_haengeplaetze:5},
    {liegend:2,haengend:5,spaeter:2,erst_klaeren:1}),

  tool('textil_masshaltigkeit_vor_nach_pflege',
    'Gemessene Maßänderung eines Textils nach Länge und Breite getrennt dokumentieren — Record dimensional change after care in both axes.',laundry,
    {gleich_trocken:flag('Wurde im gleichen trockenen Zustand, gleicher Lage und ohne Zug gemessen?'),
      laenge_davor:cm('Länge vor der Pflege in cm.'),laenge_danach:cm('Länge nach der Pflege in cm.'),
      breite_davor:cm('Breite vor der Pflege in cm.'),breite_danach:cm('Breite nach der Pflege in cm.'),
      messspanne:cm('Geschätzte kombinierte Messspanne in cm je Vergleich.')},
    ({gleich_trocken,laenge_davor,laenge_danach,breite_davor,breite_danach,messspanne})=>{
      if(Math.min(laenge_davor,laenge_danach,breite_davor,breite_danach)<=0) throw new RangeError('Textilmaße');
      const dimensions=[[laenge_davor,laenge_danach],[breite_davor,breite_danach]];
      const deltas=dimensions.map(([before,after])=>after-before);
      return {aenderung_prozent:gleich_trocken?dimensions.map(([before,after])=>round(100*(after-before)/before)):null,
        ueber_messspanne:gleich_trocken?deltas.map(delta=>Math.abs(delta)>messspanne+1e-9):null,
        grenze:'Reihenfolge Länge, Breite. Das Ergebnis gilt für dieses Stück und die protokollierte Pflege.'};
    },{gleich_trocken:true,laenge_davor:80,laenge_danach:77,breite_davor:50,breite_danach:49.5,messspanne:1},
    {aenderung_prozent:[-3.75,-1],ueber_messspanne:[true,false]}),

  tool('waeschenetz_liegeplaetze_mit_abstand',
    'Gleich große, liegend zu trocknende Stücke auf einer nutzbaren Rechteckfläche anordnen — Compare two aligned flat-drying layouts with measured clearance.',laundry,
    {lage_bestaetigt:flag('Sind liegendes Trocknen und die Auflage für diese Textilien bestätigt?'),
      flaeche_a:cm('Freie Auflagelänge in cm.'),flaeche_b:cm('Freie Auflagebreite in cm.'),
      textil_a:cm('Länge eines ausgelegten Stücks in cm.'),textil_b:cm('Breite eines ausgelegten Stücks in cm.'),
      abstand:cm('Eingeplanter Abstand zwischen Stücken in cm.')},
    ({lage_bestaetigt,flaeche_a,flaeche_b,textil_a,textil_b,abstand})=>{
      if(!textil_a || !textil_b) throw new RangeError('Textilabmessung');
      const rows=(available,piece)=>Math.floor((available+abstand)/(piece+abstand));
      const straight=rows(flaeche_a,textil_a)*rows(flaeche_b,textil_b);
      const rotated=rows(flaeche_a,textil_b)*rows(flaeche_b,textil_a);
      return {gleiche_ausrichtung:lage_bestaetigt?straight:null,gedreht:lage_bestaetigt?rotated:null,
        beste_einheitliche_belegung:lage_bestaetigt?Math.max(straight,rotated):null,
        grenze:'Nur zwei einheitliche Raster. Traglast, Luftwege und Tropfschutz vor dem Belegen prüfen.'};
    },{lage_bestaetigt:true,flaeche_a:130,flaeche_b:70,textil_a:40,textil_b:30,abstand:5},
    {gleiche_ausrichtung:6,gedreht:3,beste_einheitliche_belegung:6}),

  tool('vorhang_pflege_nachmessung_aufhaengung',
    'Gepflegte Vorhangbahn anhand eines selbst festgelegten Bodenabstands neu einhängen — Map a measured curtain drop to a feasible hanging adjustment.',curtain,
    {aufhaenger_verstellbar:flag('Ist Verstellen bei dieser Befestigung zulässig und nachvollziehbar?'),
      hoehe_cm:cm('Unterkante des bisherigen Aufhängepunkts über dem Boden.'),behange_laenge_cm:cm('Trockene Falllänge nach der Pflege.'),
      zielabstand_cm:cm('Gewählter Bodenabstand.'),hochstell_cm:cm('Nach oben verfügbarer Verstellweg.'),
      tiefstell_cm:cm('Nach unten verfügbarer Verstellweg.')},
    ({aufhaenger_verstellbar,hoehe_cm,behange_laenge_cm,zielabstand_cm,hochstell_cm,tiefstell_cm})=>{
      if(!hoehe_cm || !behange_laenge_cm) throw new RangeError('Vorhangmaße');
      const gap=hoehe_cm-behange_laenge_cm;
      const movement=zielabstand_cm-gap;
      return {aktueller_abstand_cm:round(gap),benoetigte_verstellung_cm:round(movement),
        ziel_rechnerisch_erreichbar:Math.abs(movement)<1e-9 || (aufhaenger_verstellbar && movement>=-tiefstell_cm && movement<=hochstell_cm),
        grenze:'Positiver Verstellwert bedeutet höher hängen. Endposition und Freiraum am trockenen Vorhang vor Ort prüfen.'};
    },{aufhaenger_verstellbar:true,hoehe_cm:220,behange_laenge_cm:218,zielabstand_cm:4,hochstell_cm:3,tiefstell_cm:0},
    {aktueller_abstand_cm:2,benoetigte_verstellung_cm:2,ziel_rechnerisch_erreichbar:true}),

  tool('waescheleine_klammern_versetzte_stuecke',
    'Zuerst breit ausgehängte Stücke und dann schmale Stücke mit Leinen- und Klammerbudget einplanen — Allocate two textile widths on one unobstructed clothesline.',laundry,
    {leine_cm:cm('Freie zusammenhängende Leinenlänge.'),abstand_cm:cm('Abstand zwischen benachbarten Stücken.'),
      breit_cm:cm('Gehängte Breite eines breiten Stücks.'),schmal_cm:cm('Gehängte Breite eines schmalen Stücks.'),
      breite_stuecke:count('Anzahl breiter priorisierter Stücke.'),schmale_stuecke:count('Anzahl schmaler Stücke.'),
      klammern:count('Verfügbare Klammern. Werkzeug rechnet mit zwei pro Stück.')},
    ({leine_cm,abstand_cm,breit_cm,schmal_cm,breite_stuecke,schmale_stuecke,klammern})=>{
      whole(breite_stuecke,schmale_stuecke,klammern);
      if(!schmal_cm || breit_cm<schmal_cm) throw new RangeError('Textilbreiten');
      const pegSlots=Math.floor(klammern/2);
      const width=leine_cm+abstand_cm;
      const wide=Math.min(breite_stuecke,pegSlots,Math.floor(width/(breit_cm+abstand_cm)));
      const narrow=Math.min(schmale_stuecke,pegSlots-wide,Math.floor((width-wide*(breit_cm+abstand_cm))/(schmal_cm+abstand_cm)));
      const used=Math.max(0,wide*(breit_cm+abstand_cm)+narrow*(schmal_cm+abstand_cm)-abstand_cm);
      return {breit_eingeplant:wide,schmal_eingeplant:narrow,freie_leine_cm:round(leine_cm-used),freie_klammern:klammern-2*(wide+narrow),
        grenze:'Breite Stücke erhalten Vorrang. Eignung von Leine, Klammern und Aufhängung am realen Aufbau prüfen.'};
    },{leine_cm:200,abstand_cm:5,breit_cm:50,schmal_cm:25,breite_stuecke:2,schmale_stuecke:6,klammern:10},
    {breit_eingeplant:2,schmal_eingeplant:3,freie_leine_cm:5,freie_klammern:0}),

  tool('textil_naht_flaeche_restwasserprofil',
    'Restwasser in zwei vorhandenen Stoffproben je 100 g Trockenmasse vergleichen — Compare seam and panel dry-back measurements on a common mass basis.',measurements,
    {bedingungen_gleich:flag('Stammen beide Proben aus demselben Aufbau und Messzeitpunkt?'),
      naht_trocken_g:grams('Bekannte Trockenmasse der Nahtprobe.'),naht_aktuell_g:grams('Gemessene aktuelle Masse der Nahtprobe.'),
      flaeche_trocken_g:grams('Bekannte Trockenmasse der Flächenprobe.'),flaeche_aktuell_g:grams('Gemessene aktuelle Masse der Flächenprobe.'),
      vergleichsspanne:number('Eigene kombinierte Unsicherheit in g Restwasser je 100 g Trockenmasse.',0,500)},
    ({bedingungen_gleich,naht_trocken_g,naht_aktuell_g,flaeche_trocken_g,flaeche_aktuell_g,vergleichsspanne})=>{
      if(!naht_trocken_g || !flaeche_trocken_g || naht_aktuell_g<naht_trocken_g || flaeche_aktuell_g<flaeche_trocken_g) throw new RangeError('Probenmassen');
      const seam=100*(naht_aktuell_g-naht_trocken_g)/naht_trocken_g;
      const panel=100*(flaeche_aktuell_g-flaeche_trocken_g)/flaeche_trocken_g;
      const delta=seam-panel;
      return {naht_g_je_100g:round(seam),flaeche_g_je_100g:round(panel),
        zuerst_nachpruefen:!bedingungen_gleich?'vergleich_wiederholen':Math.abs(delta)<=vergleichsspanne?'beide':delta>0?'naht':'flaeche',
        grenze:'Nur vorhandene Proben gemeinsam vergleichen. Eine gemessene Stelle weist keinen trockenen Gesamtzustand nach.'};
    },{bedingungen_gleich:true,naht_trocken_g:20,naht_aktuell_g:23,flaeche_trocken_g:50,flaeche_aktuell_g:54,vergleichsspanne:2},
    {naht_g_je_100g:15,flaeche_g_je_100g:8,zuerst_nachpruefen:'naht'}),

  tool('waescheplatz_trocknungsvergleich_kreuztausch',
    'Zwei Hängeplätze mit vertauschten Referenztextilien in zwei Probedurchgängen vergleichen — Detect a repeatable placement effect with a two-run crossover.',laundry,
    {aufbau_vergleichbar:flag('Waren Zeitspanne und Startzustand vergleichbar, mit denselben Referenzstücken je Durchgang?'),
      a_platz_eins_g:grams('Massenverlust Stück A am Platz 1 im ersten Versuch.'),b_platz_zwei_g:grams('Massenverlust Stück B am Platz 2 im ersten Versuch.'),
      b_platz_eins_g:grams('Massenverlust Stück B am Platz 1 im zweiten Versuch.'),a_platz_zwei_g:grams('Massenverlust Stück A am Platz 2 im zweiten Versuch.'),
      messspanne_g:grams('Kombinierte Messspanne pro Vergleich.')},
    ({aufbau_vergleichbar,a_platz_eins_g,b_platz_zwei_g,b_platz_eins_g,a_platz_zwei_g,messspanne_g})=>{
      const differences=[a_platz_eins_g-a_platz_zwei_g,b_platz_eins_g-b_platz_zwei_g];
      const trend=differences.every(value=>value>messspanne_g)?'platz_eins':differences.every(value=>value<-messspanne_g)?'platz_zwei':'kein_einheitlicher_vorsprung';
      return {differenzen_platz_eins_minus_zwei_g:differences.map(value=>round(value)),
        beobachtung:aufbau_vergleichbar?trend:'aufbau_wiederholen',grenze:'Ein wiederholtes Muster priorisiert weitere Beobachtung am selben Aufbau. Prüft keine erreichbare Endtrockenheit.'};
    },{aufbau_vergleichbar:true,a_platz_eins_g:30,b_platz_zwei_g:12,b_platz_eins_g:23,a_platz_zwei_g:20,messspanne_g:4},
    {differenzen_platz_eins_minus_zwei_g:[10,11],beobachtung:'platz_eins'}),

  tool('waesche_arbeitsfenster_umhaengen_abnehmen',
    'Einen flexiblen Umbau des Wäscheständers um einen festen Abholtermin herum einplanen — Place a manual rerack step around a fixed collection appointment.',laundry,
    {beginn:minutes('Beginn der verfügbaren Zeit, Minuten seit Mitternacht.'),ende:minutes('Ende der verfügbaren Zeit.'),
      abholen_ab:minutes('Fester Beginn der Abholung.'),abholen_dauer:minutes('Für die Abholung reservierte Minuten.'),
      umhaengen_ab:minutes('Frühester Beginn für das Umhängen.'),umhaengen_dauer:minutes('Zusammenhängende Dauer für das Umhängen.')},
    ({beginn,ende,abholen_ab,abholen_dauer,umhaengen_ab,umhaengen_dauer})=>{
      if(ende<beginn || !abholen_dauer || !umhaengen_dauer || abholen_ab+abholen_dauer>1440) throw new RangeError('Zeitfenster');
      const pickupEnd=abholen_ab+abholen_dauer;
      const before=Math.max(beginn,umhaengen_ab);
      const after=Math.max(beginn,umhaengen_ab,pickupEnd);
      const pickupFits=abholen_ab>=beginn && pickupEnd<=ende;
      const slot=before+umhaengen_dauer<=abholen_ab?before:after+umhaengen_dauer<=ende?after:null;
      return {abholung_im_zeitfenster:pickupFits,umhaengen_start_min:pickupFits?slot:null,
        status:!pickupFits?'abholzeit_klaeren':slot===null?'zusatzfenster_noetig':'beide_aufgaben_eingeplant',
        grenze:'Rechnet nur mit Arbeitszeiten an einem Tag. Trockenzustand und Belegung vor dem Umhängen prüfen.'};
    },{beginn:480,ende:570,abholen_ab:500,abholen_dauer:20,umhaengen_ab:490,umhaengen_dauer:25},
    {abholung_im_zeitfenster:true,umhaengen_start_min:520,status:'beide_aufgaben_eingeplant'}),

  tool('textil_tauschbestand_bis_trocknung',
    'Sauberen Textilbestand bis zur nächsten bestätigten Wiederverfügbarkeit abgleichen — Estimate a clean-linen shortfall during a known turnaround gap.',laundry,
    {bestand:count('Jetzt saubere und trockene Textilien desselben Einsatzzwecks.'),
      heute:count('Bis Tagesende erwartete Wechsel.'),je_weiterem_tag:count('An jedem vollen weiteren Tag eingeplante Wechsel.'),
      volle_tage:count('Volle weitere Tage vor bestätigter Wiederverfügbarkeit.'),reserve:count('Gewünschte ungenutzte Mindestreserve.')},
    ({bestand,heute,je_weiterem_tag,volle_tage,reserve})=>{
      whole(bestand,heute,je_weiterem_tag,volle_tage,reserve);
      const demand=heute+volle_tage*je_weiterem_tag;
      return {bedarf_bis_ruecklauf:demand,tatsaechlich_fehlende_stuecke:Math.max(0,demand-bestand),
        luecke_mit_reserve:Math.max(0,demand+reserve-bestand),grenze:'Planungsbestand. Nur Stücke einsetzen oder einräumen, deren Bereitschaft tatsächlich geprüft ist.'};
    },{bestand:8,heute:3,je_weiterem_tag:4,volle_tage:1,reserve:2},
    {bedarf_bis_ruecklauf:7,tatsaechlich_fehlende_stuecke:0,luecke_mit_reserve:1}),

  tool('textil_zwei_pflegeintervalle_abgleich',
    'Zwei ausdrücklich dokumentierte Pflegeschritte samt gemeinsamer Gelegenheit in einem Kalender prüfen — Check whether two recurring textile care steps can share a documented window.',wardrobe,
    {feste_intervalle:flag('Sind beide Intervalle belegt und ist die gemeinsame Durchführung freigegeben?'),
      erster_resttag:count('Tage bis zum nächsten geplanten Termin für Pflege A.'),intervall_a:count('Tage zwischen den Terminen für A.'),
      zweiter_resttag:count('Tage bis zum nächsten geplanten Termin für Pflege B.'),intervall_b:count('Tage zwischen den Terminen für B.'),
      horizont:count('Anzahl Tage bis zum einschließenden Ende des Planungsfensters.')},
    ({feste_intervalle,erster_resttag,intervall_a,zweiter_resttag,intervall_b,horizont})=>{
      whole(erster_resttag,intervall_a,zweiter_resttag,intervall_b,horizont);
      if(!intervall_a || !intervall_b) throw new RangeError('Intervalle');
      const overlaps=[];
      if(feste_intervalle){
        for(let day=erster_resttag;day<=horizont;day+=intervall_a){
          if(day>=zweiter_resttag && (day-zweiter_resttag)%intervall_b===0) overlaps.push(day);
        }
      }
      return {gemeinsame_tage:overlaps,erstes_fenster:overlaps[0]??null,planung:feste_intervalle?'intervall_abgeglichen':'freigabe_und_intervalle_klaeren',
        grenze:'Tag null ist heute. Termine dienen der Haushaltsplanung und begründen keine Pflegeintervalle.'};
    },{feste_intervalle:true,erster_resttag:2,intervall_a:7,zweiter_resttag:9,intervall_b:14,horizont:32},
    {gemeinsame_tage:[9,23],erstes_fenster:9,planung:'intervall_abgeglichen'}),

  tool('textil_etikett_futter_oberstoff_pflegeweg',
    'Bei abnehmbaren Stoffteilen den dokumentierten gemeinsamen Pflegeweg prüfen — Reconcile wash, flat-dry and air-hang instructions for detachable fabric layers.',wardrobe,
    {etikett_gesamt_bekannt:flag('Sind vorliegende Pflegevorgaben für das Gesamtstück und beide Stoffteile vollständig geprüft?'),
      trennbar:flag('Dürfen die Teile laut Anleitung getrennt gepflegt werden?'),
      a:choice('Belegter Pflegeweg für Stoffteil A.','haengen','liegen','beides','fachpflege'),
      b:choice('Belegter Pflegeweg für Stoffteil B.','haengen','liegen','beides','fachpflege'),
      ganzer_verbund_freigabe:flag('Erlaubt die Anleitung das gemeinsame Vorgehen für den gesamten Verbund grundsätzlich?')},
    ({etikett_gesamt_bekannt,trennbar,a,b,ganzer_verbund_freigabe})=>{
      const directions={haengen:['haengen'],liegen:['liegen'],beides:['haengen','liegen'],fachpflege:[]};
      const common=etikett_gesamt_bekannt && ganzer_verbund_freigabe?directions[a].filter(mode=>directions[b].includes(mode)):[];
      const status=!etikett_gesamt_bekannt?'etiketten_klaeren':common.length?'gemeinsamer_weg_belegt':trennbar?'getrennte_wege_pruefen':'pflegeweg_klaeren';
      return {belegte_gemeinsame_trockenwege:common,status,
        grenze:'Herstelleranweisungen für das gesamte Stück und weitere Waschbedingungen bleiben maßgeblich. Fachpflege bedeutet den gesondert belegten Pflegeweg.'};
    },{etikett_gesamt_bekannt:true,trennbar:true,a:'beides',b:'liegen',ganzer_verbund_freigabe:true},
    {belegte_gemeinsame_trockenwege:['liegen'],status:'gemeinsamer_weg_belegt'}),

  tool('kleiderschrank_einraeumen_trockenkontrolle',
    'Trockene und ausstehende Textilien auf Lagerplatz und getrennte Nachkontrolle verteilen — Allocate only confirmed-dry pieces to a ventilated wardrobe plan.',wardrobe,
    {freie_stellplaetze:count('Tatsächlich freie Plätze mit unverstellten Luftwegen.'),
      trocken:count('Saubere trockene Stücke mit abgeschlossener Kontrolle.'),
      naht_pruefen:count('Weitere Stücke mit noch nicht kontrollierten Nähten oder dicken Stellen.'),
      trocknet:count('Weitere Stücke, die noch trocknen.'),beobachtung:choice('Zustand des Lagerorts.','unauffaellig_geprueft','feuchte_bemerkt','ungeprueft')},
    ({freie_stellplaetze,trocken,naht_pruefen,trocknet,beobachtung})=>{
      whole(freie_stellplaetze,trocken,naht_pruefen,trocknet);
      const suitable=beobachtung==='unauffaellig_geprueft';
      const stored=suitable?Math.min(trocken,freie_stellplaetze):0;
      return {jetzt_einraeumen:stored,trockene_stuecke_separat:trocken-stored,noch_kontrollieren:naht_pruefen,weiter_trocknen:trocknet,
        lagerort:suitable?'platz_pruefung_erfasst':'lagerort_erst_abklaeren',grenze:'Stückzahlen helfen beim Sortieren. Bei wahrgenommener Feuchte Ursache und Lagerort prüfen.'};
    },{freie_stellplaetze:5,trocken:8,naht_pruefen:2,trocknet:3,beobachtung:'unauffaellig_geprueft'},
    {jetzt_einraeumen:5,trockene_stuecke_separat:3,noch_kontrollieren:2,weiter_trocknen:3,lagerort:'platz_pruefung_erfasst'}),

  tool('kleiderschrank_stapel_zugriffsreserve',
    'Gefaltete Textilien mit freier Griffreserve nach gemessener Stapelhöhe planen — Calculate shelf capacity with measured folded thickness and pull-out clearance.',wardrobe,
    {fach_cm:cm('Tatsächlich freie Fachhöhe.'),griff_cm:cm('Selbst gewählter freier Bereich oberhalb des Stapels.'),
      stapel_cm:cm('Höhe einer flach aufgelegten Referenzmenge ohne zusätzliches Zusammendrücken.'),
      stapel_anzahl:count('Anzahl Stücke dieser Referenzmenge.'),bedarf:count('Geplante Zahl derselben gefalteten Stücke.')},
    ({fach_cm,griff_cm,stapel_cm,stapel_anzahl,bedarf})=>{
      whole(stapel_anzahl,bedarf);
      if(!stapel_cm || !stapel_anzahl) throw new RangeError('Referenzstapel');
      const capacity=Math.floor(Math.max(0,fach_cm-griff_cm)/(stapel_cm/stapel_anzahl)+1e-9);
      return {rechnerische_plaetze:capacity,anderes_fach:Math.max(0,bedarf-capacity),
        geplante_freihoehe_cm:round(fach_cm-Math.min(bedarf,capacity)*stapel_cm/stapel_anzahl),
        grenze:'Näherung für gleich gefaltete Stücke. Breite, Fachbelastung und freie Luftwege gesondert prüfen.'};
    },{fach_cm:28,griff_cm:4,stapel_cm:15,stapel_anzahl:5,bedarf:10},
    {rechnerische_plaetze:8,anderes_fach:2,geplante_freihoehe_cm:4}),

  tool('textil_pflege_nutzungszyklen_protokoll',
    'Zwei vergleichbare Textilien anhand protokollierter Nutzungen und festgehaltener Ausfälle nachbeobachten — Compare recorded wear outcomes per use without projecting lifespan.',laundry,
    {einsatz_gleich:flag('Waren Einsatzart, Pflege und Kriterien zum Aussortieren bei beiden Gruppen gleich?'),
      a_nutzungen:count('Protokollierte Nutzungen in Stoffgruppe A.'),a_beobachtungen:count('Nutzungen mit jeweils einem beobachteten Reparatur- oder Aussortiergrund in A.'),
      b_nutzungen:count('Protokollierte Nutzungen in Stoffgruppe B.'),b_beobachtungen:count('Nutzungen mit jeweils einem beobachteten Reparatur- oder Aussortiergrund in B.')},
    ({einsatz_gleich,a_nutzungen,a_beobachtungen,b_nutzungen,b_beobachtungen})=>{
      whole(a_nutzungen,a_beobachtungen,b_nutzungen,b_beobachtungen);
      if(a_beobachtungen>a_nutzungen || b_beobachtungen>b_nutzungen) throw new RangeError('Beobachtungen übersteigen Nutzungen');
      const comparable=einsatz_gleich && a_nutzungen>0 && b_nutzungen>0;
      return {a_je_100_nutzungen:comparable?round(100*a_beobachtungen/a_nutzungen):null,
        b_je_100_nutzungen:comparable?round(100*b_beobachtungen/b_nutzungen):null,
        status:comparable?'protokollvergleich':'belege_fuer_vergleich_sammeln',
        grenze:'Gezählte Nutzungen und Beobachtungen eintragen. Keine Aussage zur Materiallebensdauer oder zu anderen Pflegebedingungen.'};
    },{einsatz_gleich:true,a_nutzungen:40,a_beobachtungen:3,b_nutzungen:50,b_beobachtungen:2},
    {a_je_100_nutzungen:7.5,b_je_100_nutzungen:4,status:'protokollvergleich'}),

  tool('saugwischer_pad_reserve_mit_ruecklauf',
    'Freigegebene Wischpads mit geprüften Rückläufen auf drei getrennte Einsätze verteilen — Check clean-pad availability across three appointments and their return times.',cleaner,
    {freigegeben:flag('Sind der Padtyp und die Pflege nach Gebrauch für das konkrete Modell bestätigt?'),
      anfang:count('Zu Beginn saubere, verwendbare Pads.'),je_einsatz:count('Für jeden der drei Einsätze erforderliche frische Pads.'),
      ruecklauf_vor_zwei:count('Vor Einsatz 2 zusätzlich als bereit geprüfte Pads.'),ruecklauf_vor_drei:count('Vor Einsatz 3 zusätzlich als bereit geprüfte Pads.')},
    ({freigegeben,anfang,je_einsatz,ruecklauf_vor_zwei,ruecklauf_vor_drei})=>{
      whole(anfang,je_einsatz,ruecklauf_vor_zwei,ruecklauf_vor_drei);
      if(!freigegeben) return {fehlend_je_einsatz:null,verwendbarer_rest:null,status:'padtyp_und_pflege_klaeren',
        grenze:'Nur vom Hersteller belegte Pads und bereits überprüfte Rückläufe für diesen Ablauf eintragen.'};
      let available=anfang;
      const shortages=[0,ruecklauf_vor_zwei,ruecklauf_vor_drei].map(returned=>{
        available+=returned;
        const shortage=Math.max(0,je_einsatz-available);
        available=Math.max(0,available-je_einsatz);
        return shortage;
      });
      return {fehlend_je_einsatz:shortages,verwendbarer_rest:available,
        status:shortages.some(Boolean)?'einsatz_oder_ruecklauf_anpassen':'folge_rechnerisch_abgedeckt',
        grenze:'Fehlmengen je Einsatz bei unveränderten Terminen. Rückläufe nur einmal und am tatsächlich geprüften Termin zählen.'};
    },{freigegeben:true,anfang:3,je_einsatz:2,ruecklauf_vor_zwei:0,ruecklauf_vor_drei:3},
    {fehlend_je_einsatz:[0,1,0],verwendbarer_rest:1,status:'einsatz_oder_ruecklauf_anpassen'}),

  tool('saugwischer_freigegebene_abschnitte_flaechenbilanz',
    'Gemessene Wohnfläche nach abschnittsweise dokumentierter Bodenfreigabe aufteilen — Sum eligible, excluded and unresolved floor areas separately.',cleaner,
    {abschnitt_a:number('Fläche von Abschnitt A in m².',0,500),a:choice('Status Abschnitt A.','freigegeben','ausgeschlossen','offen'),
      abschnitt_b:number('Fläche von Abschnitt B in m².',0,500),b:choice('Status Abschnitt B.','freigegeben','ausgeschlossen','offen'),
      abschnitt_c:number('Fläche von Abschnitt C in m².',0,500),c:choice('Status Abschnitt C.','freigegeben','ausgeschlossen','offen')},
    ({abschnitt_a,a,abschnitt_b,b,abschnitt_c,c})=>{
      const areas={freigegeben:0,ausgeschlossen:0,offen:0};
      for(const [state,area] of [[a,abschnitt_a],[b,abschnitt_b],[c,abschnitt_c]]) areas[state]+=area;
      const total=abschnitt_a+abschnitt_b+abschnitt_c;
      return {freigegeben_m2:round(areas.freigegeben),ausgeschlossen_m2:round(areas.ausgeschlossen),offen_m2:round(areas.offen),
        anteil_freigegeben_prozent:total?round(100*areas.freigegeben/total):null,
        grenze:'Nur disjunkte Flächen zählen. Freigabe selbst ergibt sich weiterhin aus Boden- und Geräteanleitung.'};
    },{abschnitt_a:22,a:'freigegeben',abschnitt_b:8,b:'ausgeschlossen',abschnitt_c:10,c:'offen'},
    {freigegeben_m2:22,ausgeschlossen_m2:8,offen_m2:10,anteil_freigegeben_prozent:55}),

  tool('saugwischer_raumfreigabe_nach_beobachtung',
    'Nach eigener Beobachtung zwei bearbeitete Bodenabschnitte zum nächsten Zugang einplanen — Compare observed dry-back windows against a planned room reopening.',cleaner,
    {vergleichbarer_aufbau:flag('Sind dokumentierte Bodenfreigabe, Einstellungen und Bedingungen mit den Beobachtungen vergleichbar?'),
      ende_a_min:minutes('Geplantes Arbeitsende A, Minuten seit Mitternacht.'),beobachtet_a_min:minutes('Beobachtete Zeit bis zum gewünschten Zustand A nach dessen Arbeitsende.'),
      ende_b_min:minutes('Geplantes Arbeitsende B, Minuten seit Mitternacht.'),beobachtet_b_min:minutes('Beobachtete Zeit bis zum gewünschten Zustand B nach dessen Arbeitsende.'),
      zugang_min:minutes('Nächster benötigter gemeinsamer Zugang am selben Tag.'),puffer_min:minutes('Selbst gewählter Zusatzpuffer je Abschnitt.')},
    ({vergleichbarer_aufbau,ende_a_min,beobachtet_a_min,ende_b_min,beobachtet_b_min,zugang_min,puffer_min})=>{
      const checkpoints=[ende_a_min+beobachtet_a_min+puffer_min,ende_b_min+beobachtet_b_min+puffer_min];
      const latest=Math.max(...checkpoints);
      return {prueftermine_min:vergleichbarer_aufbau?checkpoints.map(value=>round(value)):null,
        terminreserve_min:vergleichbarer_aufbau?round(zugang_min-latest):null,
        status:!vergleichbarer_aufbau?'beobachtung_aktualisieren':latest<=zugang_min?'zum_termin_vor_ort_pruefen':'zeitfenster_verschieben',
        grenze:'Zeitabschätzung auf Basis eigener Beobachtung, keine Nutzungsfreigabe. Boden vor Ort prüfen und Pflegeanleitung einhalten.'};
    },{vergleichbarer_aufbau:true,ende_a_min:590,beobachtet_a_min:10,ende_b_min:600,beobachtet_b_min:20,zugang_min:625,puffer_min:10},
    {prueftermine_min:[610,630],terminreserve_min:-5,status:'zeitfenster_verschieben'}),

  tool('waeschestaender_haube_versuchsbedingungen',
    'Versuche mit und ohne zugelassene Abdeckhaube auf vollständige Vergleichsbedingungen prüfen — Audit whether a cover-on/cover-off rack trial is comparable.',heatedRack,
    {haube_freigegeben:flag('Ist die Haube für das genaue Modell und die jeweilige Aufstellung freigegeben?'),
      luftwege_frei:flag('Wurden die geforderten Luftwege und Betriebsbedingungen eingehalten?'),
      masse_gleich:flag('Gleiche Textilien, Trockenmasse und vergleichbare Startfeuchte?'),
      endzustand_gleich:flag('Gleicher geprüfter Trockenzustand in beiden Durchgängen?'),
      raumaufbau_gleich:flag('Vergleichbare Raumtemperatur, Lüftung und zusätzliche Geräte?'),
      ohne_haube_min:minutes('Gemessene Dauer ohne Haube.'),mit_haube_min:minutes('Gemessene Dauer mit Haube.')},
    ({haube_freigegeben,luftwege_frei,masse_gleich,endzustand_gleich,raumaufbau_gleich,ohne_haube_min,mit_haube_min})=>{
      if(!ohne_haube_min || !mit_haube_min) throw new RangeError('Gemessene Dauer');
      const gaps=[['haube_freigabe',haube_freigegeben],['luftwege_betrieb',luftwege_frei],['startladung',masse_gleich],
        ['endzustand',endzustand_gleich],['raumaufbau',raumaufbau_gleich]].filter(([,known])=>!known).map(([label])=>label);
      return {offene_vergleichspunkte:gaps,eingesparte_minuten_im_versuch:gaps.length?null:round(ohne_haube_min-mit_haube_min),
        grenze:'Nur die beobachteten Durchgänge vergleichen. Aus Zeitdifferenzen folgen keine allgemeinen Energie- oder Leistungswerte.'};
    },{haube_freigegeben:true,luftwege_frei:true,masse_gleich:true,endzustand_gleich:false,raumaufbau_gleich:true,ohne_haube_min:320,mit_haube_min:270},
    {offene_vergleichspunkte:['endzustand'],eingesparte_minuten_im_versuch:null}),

  tool('waesche_wenden_vorderseite_rueckseite',
    'Eigene Kontrollen vor und nach einem Wendeschritt nach Stoffseiten aufschlüsseln — Compare observed damp points on one or both sides after turning.',laundry,
    {kontrollpunkte:count('Feste Punkte, die auf beiden Stoffseiten zu beiden Zeitpunkten begutachtet wurden.'),
      vorher_einseitig:count('Punkte vor dem Wenden, die auf genau einer Seite noch feucht waren.'),vorher_beidseitig:count('Punkte vor dem Wenden, die auf beiden Seiten noch feucht waren.'),
      nachher_einseitig:count('Punkte beim späteren Check mit Feuchte auf genau einer Seite.'),nachher_beidseitig:count('Punkte beim späteren Check mit Feuchte auf beiden Seiten.')},
    ({kontrollpunkte,vorher_einseitig,vorher_beidseitig,nachher_einseitig,nachher_beidseitig})=>{
      whole(kontrollpunkte,vorher_einseitig,vorher_beidseitig,nachher_einseitig,nachher_beidseitig);
      if(!kontrollpunkte || Math.max(vorher_einseitig+vorher_beidseitig,nachher_einseitig+nachher_beidseitig)>kontrollpunkte) throw new RangeError('Kontrollpunkte');
      return {seiten_mit_restfeuchte_vorher:vorher_einseitig+2*vorher_beidseitig,seiten_mit_restfeuchte_nachher:nachher_einseitig+2*nachher_beidseitig,
        zuerst_nachpruefen:nachher_beidseitig?'beidseitig_feuchte_punkte':nachher_einseitig?'einseitig_feuchte_punkte':'restliche_stellen_pruefen',
        grenze:'Zwei Zustandsaufnahmen, kein Nachweis für die Ursache einer Veränderung oder die Endtrockenheit.'};
    },{kontrollpunkte:8,vorher_einseitig:3,vorher_beidseitig:4,nachher_einseitig:4,nachher_beidseitig:1},
    {seiten_mit_restfeuchte_vorher:11,seiten_mit_restfeuchte_nachher:6,zuerst_nachpruefen:'beidseitig_feuchte_punkte'}),

  tool('textil_ersatzbezug_pflegepassung',
    'Maße des trockenen vorhandenen Bezugs mit Maßtoleranz und Pflegevorgaben eines Ersatzbezugs abgleichen — Check a replacement cover’s documented dimensions and care fit.',wardrobe,
    {passform_bestaetigt:flag('Sind Verschluss, Befestigung und Schnitt für den vorgesehenen Gegenstand bestätigt?'),
      pflegeweg_bestaetigt:flag('Ist der dokumentierte Pflegeweg mit dem verfügbaren Ablauf vereinbar?'),
      alt_laenge:cm('Trockene relevante Bezugslänge.'),alt_breite:cm('Trockene relevante Bezugsbreite.'),
      neu_laenge:cm('Auf der genauen Ersatzvariante dokumentierte Länge.'),neu_breite:cm('Auf derselben Variante dokumentierte Breite.'),
      passend_bis:cm('Für beide Maße akzeptierte Abweichung, nach realer Aufnahme ermittelt.')},
    ({passform_bestaetigt,pflegeweg_bestaetigt,alt_laenge,alt_breite,neu_laenge,neu_breite,passend_bis})=>{
      if(Math.min(alt_laenge,alt_breite,neu_laenge,neu_breite)<=0) throw new RangeError('Bezugsmaße');
      const deltas=[neu_laenge-alt_laenge,neu_breite-alt_breite];
      const check=deltas.every(delta=>Math.abs(delta)<=passend_bis+1e-9);
      return {abweichung_laenge_breite_cm:deltas.map(delta=>round(delta)),masse_im_rahmen:check,
        status:!check?'masse_abweichend':!passform_bestaetigt || !pflegeweg_bestaetigt?'befestigung_und_pflege_abgleichen':'grunddaten_abgeglichen',
        grenze:'Nur vergleichbar gemessene Maße derselben Passform einsetzen. Sitz und Pflegeweg separat bestätigen.'};
    },{passform_bestaetigt:true,pflegeweg_bestaetigt:false,alt_laenge:60,alt_breite:45,neu_laenge:61,neu_breite:46,passend_bis:2},
    {abweichung_laenge_breite_cm:[1,1],masse_im_rahmen:true,status:'befestigung_und_pflege_abgleichen'}),

  tool('textil_reparatur_bestand_neubedarf',
    'Nutzbaren Bestand und realistisch terminierte Instandsetzungen vor Ersatzbedarf getrennt bilanzieren — Separate confirmed serviceable stock from planned repairs before buying replacements.',wardrobe,
    {soll:count('Gewünschter nutzbarer Gesamtbestand.'),bereit:count('Heute einsatzfähige Stücke.'),
      reparatur_fertig:count('Zusätzliche Stücke, deren Reparatur bis zum Bedarfstermin zugesagt ist.'),
      pruefung_offen:count('Zusätzliche Stücke mit ausstehendem Reparaturentscheid oder unbekanntem Fertigdatum.')},
    ({soll,bereit,reparatur_fertig,pruefung_offen})=>{
      whole(soll,bereit,reparatur_fertig,pruefung_offen);
      const guaranteedGap=Math.max(0,soll-bereit);
      const plannedGap=Math.max(0,guaranteedGap-reparatur_fertig);
      return {luecke_jetzt:guaranteedGap,luecke_mit_zugesagter_reparatur:plannedGap,
        mindestens_offen_selbst_wenn_pruefung_positiv:Math.max(0,plannedGap-pruefung_offen),
        grenze:'Drei Planungsstände für getrennte Stücklisten. Erst nach abgeschlossener Reparatur als wieder einsatzfähig verbuchen.'};
    },{soll:12,bereit:6,reparatur_fertig:3,pruefung_offen:2},
    {luecke_jetzt:6,luecke_mit_zugesagter_reparatur:3,mindestens_offen_selbst_wenn_pruefung_positiv:1}),

  tool('putztuecher_feste_zonen_markierung',
    'Markierte Reinigungstücher getrennten Bereichen zuordnen und den Vorratsengpass finden — Check dedicated labeled cleaning-cloth stock and reserve unassigned spares.',cleaner,
    {a_gekennzeichnet:count('Bereich A zugewiesene saubere Tücher.'),b_gekennzeichnet:count('Bereich B zugewiesene saubere Tücher.'),
      frei:count('Saubere und für beide Bereiche ausdrücklich geeignete, noch nicht zugewiesene Tücher.'),
      bedarf_a:count('Geplanter Bedarf in A.'),bedarf_b:count('Geplanter Bedarf in B.'),prioritaet:choice('Bei Engpass zuerst auffüllen.','bereich_a','bereich_b')},
    ({a_gekennzeichnet,b_gekennzeichnet,frei,bedarf_a,bedarf_b,prioritaet})=>{
      whole(a_gekennzeichnet,b_gekennzeichnet,frei,bedarf_a,bedarf_b);
      const gaps=[Math.max(0,bedarf_a-a_gekennzeichnet),Math.max(0,bedarf_b-b_gekennzeichnet)];
      const primary=prioritaet==='bereich_a'?0:1;
      const assigned=[0,0];
      assigned[primary]=Math.min(gaps[primary],frei);
      assigned[1-primary]=Math.min(gaps[1-primary],frei-assigned[primary]);
      return {neu_markieren_a:assigned[0],neu_markieren_b:assigned[1],weiterhin_fehlend:gaps.map((gap,index)=>gap-assigned[index]),
        grenze:'Reihenfolge für weiterhin fehlend: A, B. Erst zuweisen, wenn Nutzung und Pflege für den jeweiligen Bereich feststehen.'};
    },{a_gekennzeichnet:2,b_gekennzeichnet:1,frei:3,bedarf_a:5,bedarf_b:4,prioritaet:'bereich_b'},
    {neu_markieren_a:0,neu_markieren_b:3,weiterhin_fehlend:[3,0]}),

  tool('waeschestaender_fluegellast_drei_textilien',
    'Drei gewogene Textilien auf zwei Flügel innerhalb der ausdrücklich dokumentierten Teilgrenzen verteilen — Find a measured two-wing load split for three textiles.',laundry,
    {traglasten_bestaetigt:flag('Sind für das genaue Modell eine Gesamtgrenze, getrennte Flügelgrenzen und die betrachtete Aufstellung dokumentiert?'),
      links_max_g:grams('Dokumentierte erlaubte Zusatzlast am linken Flügel.'),rechts_max_g:grams('Dokumentierte erlaubte Zusatzlast am rechten Flügel.'),
      gesamt_max_g:grams('Dokumentierte erlaubte gesamte Zusatzlast für den vorgesehenen Aufbau.'),
      stueck_a_g:grams('Masse des feuchten Stücks A.'),stueck_b_g:grams('Masse des feuchten Stücks B.'),stueck_c_g:grams('Masse des feuchten Stücks C.')},
    ({traglasten_bestaetigt,links_max_g,rechts_max_g,gesamt_max_g,stueck_a_g,stueck_b_g,stueck_c_g})=>{
      const pieces=[stueck_a_g,stueck_b_g,stueck_c_g];
      if(pieces.some(value=>!value)) throw new RangeError('Drei gewogene Stücke erforderlich');
      const total=pieces.reduce((sum,value)=>sum+value,0);
      let best=null;
      if(traglasten_bestaetigt && total<=gesamt_max_g){
        const names=['a','b','c'];
        const leftAssignments=[[],[0],[1],[0,1],[2],[0,2],[1,2],[0,1,2]];
        for(const assigned of leftAssignments){
          const left=assigned.reduce((sum,index)=>sum+pieces[index],0);
          const right=total-left;
          if(left>links_max_g || right>rechts_max_g) continue;
          const difference=Math.abs(left-right);
          if(!best || difference<best.difference){
            best={links:assigned.map(index=>names[index]),rechts:names.filter((_,index)=>!assigned.includes(index)),
              links_g:round(left),rechts_g:round(right),difference};
          }
        }
      }
      return {gesamt_g:round(total),links:best?.links??null,rechts:best?.rechts??null,
        links_g:best?.links_g??null,rechts_g:best?.rechts_g??null,
        status:!traglasten_bestaetigt?'grenzen_in_anleitung_klaeren':best?'teilgrenzen_rechnerisch_eingehalten':'ladung_aufteilen',
        grenze:'Nur die eingetragenen Massen prüfen. Die Anleitung für Aufstellung, Verteilung pro Leine und Kippschutz beachten.'};
    },{traglasten_bestaetigt:true,links_max_g:950,rechts_max_g:1100,gesamt_max_g:1950,stueck_a_g:700,stueck_b_g:600,stueck_c_g:400},
    {gesamt_g:1700,links:['a'],rechts:['b','c'],links_g:700,rechts_g:1000,status:'teilgrenzen_rechnerisch_eingehalten'}),

  tool('kleiderschrank_luftweg_hinter_stapel',
    'Tiefe gefalteter Stücke gegen einen hinten freigehaltenen Schrankbereich prüfen — Find which folded textile groups would obstruct a deliberately open rear gap.',wardrobe,
    {fachtiefe:cm('Freie Tiefe des Fachs vom vorderen zur hinteren Begrenzung.'),
      freihalten_hinten:cm('Geplant freier Streifen an der Rückwand; aus der realen Anordnung ableiten.'),
      tiefe_a:cm('Gemessene Tiefe des gefalteten Stücks bzw. Stapels A.'),tiefe_b:cm('Gemessene Tiefe des gefalteten Stücks bzw. Stapels B.'),
      tiefe_c:cm('Gemessene Tiefe des gefalteten Stücks bzw. Stapels C.')},
    ({fachtiefe,freihalten_hinten,tiefe_a,tiefe_b,tiefe_c})=>{
      if(!fachtiefe || Math.min(tiefe_a,tiefe_b,tiefe_c)<=0) throw new RangeError('Fach- und Stapeltiefen');
      const useful=Math.max(0,fachtiefe-freihalten_hinten);
      return {nutzbare_tiefe_cm:round(useful),umnutzung_pruefen:[['a',tiefe_a],['b',tiefe_b],['c',tiefe_c]].filter(([,depth])=>depth>useful+1e-9).map(([name])=>name),
        grenze:'Nur Tiefenprüfung. Tatsächlichen Luftweg vor Ort prüfen; aus der gewählten Lücke folgt keine Aussage zur Feuchteentwicklung.'};
    },{fachtiefe:45,freihalten_hinten:8,tiefe_a:30,tiefe_b:39,tiefe_c:37},
    {nutzbare_tiefe_cm:37,umnutzung_pruefen:['b']}),
];
