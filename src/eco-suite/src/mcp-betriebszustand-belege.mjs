const page = '/strommess-protokoll.html';
const includeDate = '2025-05-09';
const tightenedDate = '2027-05-09';
const rule = 'VO (EU) 2023/826';
const states = ['aus','bereitschaft_reaktivierung','bereitschaft_anzeige','vernetzte_bereitschaft'];
const modes = () => pick('Bereits gesichert eingeordneter Betriebszustand.',...states,'offen');

const num = (description,minimum=0,maximum=1000000) => ({type:'number',minimum,maximum,description});
const watt = description => num(description,0,100000);
const minute = description => num(description,0,10080);
const yes = description => ({type:'boolean',description});
const pick = (description,...values) => ({type:'string',enum:values,description});
const stamp = description => ({type:'string',description:description+' YYYY-MM-DD, leer wenn offen.'});
const r = x => Math.round(x*10000)/10000;

function validDate(str) {
  if (str==='') return false;
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(str)) throw new RangeError('Kalenderdatum 2000 bis 2099 benötigt.');
  const ts=Date.parse(str+'T00:00:00Z');
  if (!Number.isFinite(ts)||new Date(ts).toISOString().slice(0,10)!==str) throw new RangeError('Ungültiges Kalenderdatum.');
  return true;
}
function whole(...args) {
  if (!args.every(Number.isInteger)) throw new RangeError('Ganze Anzahlen erforderlich.');
}
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const betriebszustandBelege = [
  tool('miele_h7460_bp_betriebswert_genaues_datenblatt',
    'Den passenden Herstellerwert für einen unabhängig belegten Zustand des deutschen H 7460 BP auswählen — Read the correct power and transition fields for material number 11105690.',
    {
      materialnummer:pick('Herstellermaterialnummer der bestätigten deutschen Variante.','11105690','andere_nummer','offen'),
      zustand:pick('Eindeutig dokumentierte Herstellerzeile.','aus','hersteller_standby','vernetzte_bereitschaft','offen'),
      selbe_modell_und_marktvariante:yes('Entsprechen Gerätekennung und Marktversion genau dieser deutschen Herstellerseite?'),
    },({materialnummer,zustand,selbe_modell_und_marktvariante})=>{
      if (materialnummer!=='11105690'||!selbe_modell_und_marktvariante||zustand==='offen') return {status:'passender_modell_oder_zustandsbeleg_offen',hersteller_w:null};
      const row=zustand==='aus'?'Aus-Zustand':zustand==='vernetzte_bereitschaft'?'Vernetzter Bereitschaftsbetrieb':'Stand-by';
      const watts=zustand==='aus'?0.3:zustand==='vernetzte_bereitschaft'?2:0.8;
      return {status:'entsprechende_herstellerzeile',bezugsfeld:row,hersteller_w:watts,automatik_herstellerfeld_min:20,
        hinweis:'Herstellerwerte, keine Messung und keine Zustandsidentifikation. Die Stand-by-Zeile des Datenblatts unterscheidet keine zwei Unterarten. Die getrennten Zeitfelder nicht addieren.'};
    },{materialnummer:'11105690',zustand:'vernetzte_bereitschaft',selbe_modell_und_marktvariante:true},
    {status:'entsprechende_herstellerzeile',bezugsfeld:'Vernetzter Bereitschaftsbetrieb',hersteller_w:2,automatik_herstellerfeld_min:20}),

  tool('oekodesign_standby_anwendungsbereich_kueche',
    'Bei einem genauen Haushaltsmodell den allgemeinen Standby-Rahmen von ausdrücklich produktspezifischen Regelungen trennen — Identify which rule family a confirmed kitchen appliance belongs to.',
    {
      art:pick('Belegte Geräteart und gegebenenfalls bestätigte Spezialverordnung.','elektrischer_backofen','elektrisches_kochfeld','mikrowelle','kaffeemaschine','sonstiges_in_anhang_ii_belegt','geschirrspueler_2019_2022','waeschegeraet_2019_2023','trockner_2023_2533','offen'),
      markt_datum:stamp('Belegtes EU-Inverkehrbringen oder Inbetriebnehmen nach einschlägigem Bezug, kein Kaufdatum.'),
      haushaltszweck_belegt:yes('Für Haushaltszweck ausgelegt, geprüft und vermarktet, konkrete Variante bestätigt?'),
      netzstrom_benoetigt:yes('Ist das genaue Gerät laut Unterlage für seine bestimmungsgemäße Funktion auf das Versorgungsnetz angewiesen?'),
      nennspannung_bis_250_v_belegt:yes('Belegt die Unterlage Nennspannung höchstens 250 V für dieses Modell?'),
    },({art,markt_datum,haushaltszweck_belegt,netzstrom_benoetigt,nennspannung_bis_250_v_belegt})=>{
      const dated=validDate(markt_datum);
      if (!haushaltszweck_belegt||art==='offen') return {rahmen:'modell_oder_geraeteart_offen'};
      const specific={geschirrspueler_2019_2022:'2019/2022',waeschegeraet_2019_2023:'2019/2023',trockner_2023_2533:'2023/2533'};
      if (Object.hasOwn(specific,art)) return {rahmen:'produktspezifische_verordnung_belegt',referenz:specific[art]};
      return {rahmen:!dated||!netzstrom_benoetigt||!nennspannung_bis_250_v_belegt?'weiterer_beleg_noetig':markt_datum<includeDate?'vor_allgemeinem_geltungsbeginn':'allgemeine_referenz_im_dokumentierten_rahmen',
        referenz:rule,hinweis:'Die geprüfte allgemeine Referenz erfasst nicht automatisch jedes Elektrogerät. Markt- und Spannungsangabe aus Unterlagen übernehmen, nicht selbst an der Installation prüfen.'};
    },{art:'elektrischer_backofen',markt_datum:'2026-02-15',haushaltszweck_belegt:true,netzstrom_benoetigt:true,nennspannung_bis_250_v_belegt:true},
    {rahmen:'allgemeine_referenz_im_dokumentierten_rahmen',referenz:'VO (EU) 2023/826'}),

  tool('oekodesign_standby_leistungsreferenz_stichtag',
    'Den zu Datum, Zustand und Netzwerkklasse passenden veröffentlichten Wattwert als Lesehilfe ausweisen — Select the documentary Annex III power reference for a verified in-scope record.',
    {
      markt_datum:stamp('Bestätigter EU-Markttag für das konkrete Modell und die Quellenzuordnung.'),
      zustand:modes(),
      netzwerkklasse:pick('Dokumentierte Klasse. Hochverfügbar meint ein HiNA-Gerät oder ein Gerät mit HiNA-Funktionen. Ohne Netzbereitschaft nicht benötigt.','hochverfuegbar','nicht_hina','nicht_erforderlich','offen'),
      regel_und_ausnahmen_geprueft:yes('Allgemeiner Geltungsbereich und sämtliche einschlägigen Ausnahmen für den betrachteten Fall geprüft?'),
    },({markt_datum,zustand,netzwerkklasse,regel_und_ausnahmen_geprueft})=>{
      const dated=validDate(markt_datum);
      if (!dated||markt_datum<includeDate||!regel_und_ausnahmen_geprueft||zustand==='offen') return {status:'referenz_offen',referenz_w:null};
      const later=markt_datum>=tightenedDate;
      const ordinary={aus:later?0.3:0.5,bereitschaft_reaktivierung:0.5,bereitschaft_anzeige:0.8};
      const ref=zustand==='vernetzte_bereitschaft'?netzwerkklasse==='hochverfuegbar'?(later?7:8):netzwerkklasse==='nicht_hina'?2:null:ordinary[zustand];
      return {status:ref===null?'netzwerkklasse_offen':'tabellenwert',referenz_w:ref,stufe_ab:later&&(zustand==='aus'||zustand==='vernetzte_bereitschaft'&&netzwerkklasse==='hochverfuegbar')?tightenedDate:includeDate,
        fundstelle:rule+' Anhang III Nr. 1',hinweis:'Veröffentlichter Referenzwert zum Lesen von Unterlagen. Keine Konformitätsbewertung, kein Messgrenzwert für Heimgeräte und keine Marktaufsichtstoleranz.'};
    },{markt_datum:'2027-05-09',zustand:'aus',netzwerkklasse:'nicht_erforderlich',regel_und_ausnahmen_geprueft:true},
    {status:'tabellenwert',referenz_w:0.3,stufe_ab:'2027-05-09'}),

  tool('oekodesign_standby_energiesparzeit_geraetefall',
    'Die veröffentlichte Zeitreferenz je Anwendungsfall ausweisen und Bedingungen zur Herstellerspezifikation sichtbar halten — Select the general or coffee-machine transition reference after documenting its stated conditions.',
    {
      fall:pick('Verifiziert zutreffende Geräteart und Netzwerkklasse laut Unterlagen.','vernetzt','nicht_vernetzt_sonstiges','nicht_vernetzt_filter_isoliert','nicht_vernetzt_filter_nicht_isoliert','nicht_vernetzt_kaffee_sonstiges','offen'),
      rahmen_bestaetigt:yes('Geltung, Datum und Ausnahmen der Referenz sind für die betrachtete Quelle geprüft?'),
      keine_hauptfunktion_oder_abhaengigkeit:yes('Für die betrachtete Referenzphase sind beendete Hauptfunktion und keine Abhängigkeit eines anderen energieverbrauchsrelevanten Produkts belegt?'),
      bestimmungsgemaess_vereinbar:yes('Ist der Vergleich im dokumentierten vorgesehenen Gerätegebrauch mit dieser Stromsparfunktion vereinbar?'),
    },({fall,rahmen_bestaetigt,keine_hauptfunktion_oder_abhaengigkeit,bestimmungsgemaess_vereinbar})=>{
      if (fall==='offen'||!rahmen_bestaetigt||!keine_hauptfunktion_oder_abhaengigkeit||!bestimmungsgemaess_vereinbar) return {referenz_min:null,status:'zeitvergleich_offen'};
      const refs={vernetzt:20,nicht_vernetzt_sonstiges:20,nicht_vernetzt_filter_isoliert:5,nicht_vernetzt_filter_nicht_isoliert:40,nicht_vernetzt_kaffee_sonstiges:30};
      return {referenz_min:refs[fall],status:'tabellenwert',fundstelle:rule+' Anhang III Nr. 2 b/c',
        hinweis:'Allgemeine Referenz unter den angegebenen Voraussetzungen. Kein Nachweis eines verfügbaren Gerätetimers und keine Empfehlung zur Änderung.'};
    },{fall:'nicht_vernetzt_filter_isoliert',rahmen_bestaetigt:true,keine_hauptfunktion_oder_abhaengigkeit:true,bestimmungsgemaess_vereinbar:true},
    {referenz_min:5,status:'tabellenwert'}),

  tool('betriebszustand_funktion_led_uhr_netzausloeser',
    'Einen beobachteten Geräteabschnitt nach aktiver Hauptfunktion, Anzeige und bestätigtem Auslöser einordnen — Classify documented function evidence rather than guessing standby from wattage or a light.',
    {
      versorgungsnetz:pick('War das Gerät laut bestehendem Protokoll mit dem Stromnetz verbunden?','verbunden','getrennt','offen'),
      hauptfunktion:pick('War eine Hauptfunktion im aufgezeichneten Abschnitt aktiv?','aktiv','nicht_aktiv','offen'),
      sichtfunktion:pick('Eindeutig dokumentierte sichtbare Funktion. Uhr oder Information bezeichnet hier eine kontinuierliche Anzeige, unabhängig von der Leistungsaufnahme.','keine','aus_leuchte','reaktivierung_leuchte','uhr_oder_information','leuchte_zweck_offen','offen'),
      ausloeser:pick('Dokumentierte verfügbare Wiederaufnahme-Funktion. Ein Symbol allein zählt nicht als Nachweis.','externes_netzwerksignal','lokaler_ausloeser','keine','offen'),
      andere_funktionen_ausgeschlossen:yes('Sind andere Funktionen außer der beschriebenen Anzeige, belegt verfügbarer Reaktivierung und EMV-Funktionen ausgeschlossen?'),
    },({versorgungsnetz,hauptfunktion,sichtfunktion,ausloeser,andere_funktionen_ausgeschlossen})=>{
      if (versorgungsnetz==='getrennt') return {einordnung:'kein_netzversorgter_zustand'};
      if (versorgungsnetz==='offen'||hauptfunktion==='offen') return {einordnung:'stromnetz_oder_hauptfunktion_offen'};
      if (hauptfunktion==='aktiv') return {einordnung:'hauptfunktion_aktiv'};
      if (!andere_funktionen_ausgeschlossen||ausloeser==='offen') return {einordnung:'funktionen_oder_ausloeser_offen'};
      const unknown=sichtfunktion==='offen'||sichtfunktion==='leuchte_zweck_offen';
      if (unknown&&ausloeser!=='externes_netzwerksignal') return {einordnung:'anzeigezweck_offen'};
      if (ausloeser==='externes_netzwerksignal') return {einordnung:'vernetzte_bereitschaft'};
      if (sichtfunktion==='uhr_oder_information') return {einordnung:'bereitschaft_anzeige'};
      if (ausloeser==='lokaler_ausloeser') return {einordnung:'bereitschaft_reaktivierung'};
      return {einordnung:sichtfunktion==='reaktivierung_leuchte'?'ausloeser_widerspruch':'aus',
        hinweis:'Eine dokumentierte Aus-Leuchte allein schließt den Aus-Zustand nicht aus. Die Beobachtung ersetzt keinen formalen Test.'};
    },{versorgungsnetz:'verbunden',hauptfunktion:'nicht_aktiv',sichtfunktion:'aus_leuchte',ausloeser:'keine',andere_funktionen_ausgeschlossen:true},
    {einordnung:'aus'}),

  tool('betriebszustand_uhr_passive_anzeige_getrennt',
    'Eine sichtbare Uhr auf einen belegten Bezug zur Stromversorgung des Geräts prüfen — Separate independent analogue movement or retained display from a mains-powered clock function.',
    {
      sichtbare_uhr:yes('War im abgegrenzten Beobachtungsfenster eine Uhr sichtbar?'),
      anzeigeart:pick('Energiebezug der tatsächlichen Anzeige laut exakter Geräteunterlage.','stromnetz_des_geraets','eigenstaendig_mechanisch','eigenstaendig_versorgt','nur_unveraendert_sichtbar','offen'),
      bezug_belegt:yes('Quelle oder vollständige Erklärung gilt für diese konkrete Anzeige, nicht nur für die Gerätefamilie?'),
    },({sichtbare_uhr,anzeigeart,bezug_belegt})=>{
      if (!sichtbare_uhr) return {status:'keine_sichtbare_uhr',als_netzgespeiste_uhr_belegt:null};
      if (!bezug_belegt||anzeigeart==='offen'||anzeigeart==='nur_unveraendert_sichtbar') return {status:'energiebezug_offen',als_netzgespeiste_uhr_belegt:null};
      return {status:anzeigeart,als_netzgespeiste_uhr_belegt:anzeigeart==='stromnetz_des_geraets',
        hinweis:'Das Vorhandensein einer Uhr allein beweist weder ihren Energiebezug noch den Gesamtzustand des Geräts.'};
    },{sichtbare_uhr:true,anzeigeart:'eigenstaendig_mechanisch',bezug_belegt:true},
    {status:'eigenstaendig_mechanisch',als_netzgespeiste_uhr_belegt:false}),

  tool('betriebszustand_nachlauf_vor_messbeginn',
    'Ein bereits protokolliertes Messfenster auf Vermischung von Programmende, weiterem Nachlauf und stabilem Zustand prüfen — Exclude transitional minutes when a quiet-state sample began too early.',
    {
      aufgabe_ende_min:minute('Protokolliertes Ende der Hauptaufgabe auf gemeinsamer Minutenachse.'),
      nachlauf_ende_min:minute('Belegter frühester stabiler Beginn, nachdem auch der funktionale Nachlauf geendet hatte.'),
      mess_start_min:minute('Beginn des bereits aufgezeichneten Messfensters.'),
      mess_ende_min:minute('Ende desselben Messfensters.'),
      stabil_bis_ende:yes('Der einmal erreichte Zustand blieb ohne weitere Aktivität bis zum Messende belegt?'),
    },({aufgabe_ende_min,nachlauf_ende_min,mess_start_min,mess_ende_min,stabil_bis_ende})=>{
      if (nachlauf_ende_min<aufgabe_ende_min||mess_ende_min<=mess_start_min) throw new RangeError();
      const overlap=Math.max(0,mess_ende_min-Math.max(mess_start_min,nachlauf_ende_min));
      return {stabil_auswertbar_min:stabil_bis_ende?r(overlap):null,fruehe_oder_uebergangsmin:r(mess_ende_min-mess_start_min-overlap),
        ganzes_fenster_im_zustand:stabil_bis_ende?mess_start_min>=nachlauf_ende_min:null,
        hinweis:'Ein Programmende beendet nicht zwangsläufig Nebenfunktionen. Kein Eingriff in Geräteabläufe.'};
    },{aufgabe_ende_min:20,nachlauf_ende_min:36,mess_start_min:28,mess_ende_min:70,stabil_bis_ende:true},
    {stabil_auswertbar_min:34,fruehe_oder_uebergangsmin:8,ganzes_fenster_im_zustand:false}),

  tool('betriebszustand_messwert_zwei_herstellerzeilen_trennen',
    'Prüfen, ob der bekannte Messspielraum zwei Herstellerwerte überhaupt trennen könnte, ohne daraus einen Modus abzuleiten — Check whether a reading has enough resolution to distinguish any of two documented reference values.',
    {
      gemessen_w:watt('Gemeldeter gemittelter Wert über ein stabiles Beobachtungsfenster.'),
      absoluter_spielraum_w:watt('Begründeter maximaler Messspielraum in diesem Messbereich.'),
      hersteller_a_w:watt('Erste eindeutig zum selben Modell gehörende Herstellerreferenz.'),
      hersteller_b_w:watt('Zweite eindeutig zum selben Modell gehörende Herstellerreferenz.'),
      gleiche_messgrundlage:yes('Messgröße, Gerätevariante und dokumentierte Bezugspunkte sind vergleichbar?'),
    },({gemessen_w,absoluter_spielraum_w,hersteller_a_w,hersteller_b_w,gleiche_messgrundlage})=>{
      if (!gleiche_messgrundlage) return {rechnerisch_vereinbare_referenzen:null};
      const hits=[['A',hersteller_a_w],['B',hersteller_b_w]].filter(([,v])=>Math.abs(v-gemessen_w)<=absoluter_spielraum_w+1e-9).map(([id])=>id);
      return {rechnerisch_vereinbare_referenzen:hits,beide_ueberdecken_messbereich:hits.length===2,
        hinweis:'Watt allein erkennt keinen Modus. Die Aussage betrifft nur die vom Nutzer eingegebene Messspanne, keine regulatorische Toleranz.'};
    },{gemessen_w:0.55,absoluter_spielraum_w:0.25,hersteller_a_w:0.3,hersteller_b_w:0.8,gleiche_messgrundlage:true},
    {rechnerisch_vereinbare_referenzen:['A','B'],beide_ueberdecken_messbereich:true}),

  tool('betriebszustand_netzwerkstatus_kehrtwende_nachweis',
    'Bei vorliegenden Protokollen Verbindungsanzeige, quittierten Ereignisempfang und tatsächlich wiederaufgenommene Funktion getrennt lesen — Audit evidence for a remote wake without directing anyone to send a trigger.',
    {
      netzwerk_symbol_beobachtet:yes('Ein Netzwerksymbol war sichtbar?'),
      ereignis_von_aussen_belegt:yes('Ein bereits vorliegendes Protokoll belegt ein externes Signal über die Netzwerkverbindung?'),
      empfang_zugeordnet:yes('Ist der Empfang zeitlich und inhaltlich dem genauen beobachteten Vorgang zugeordnet?'),
      funktion_wiederaufgenommen:yes('Ist die darauf folgende Wiederaufnahme der konkreten Funktion belegt?'),
    },({netzwerk_symbol_beobachtet,ereignis_von_aussen_belegt,empfang_zugeordnet,funktion_wiederaufgenommen})=>{
      return {verbindungssymbol_beobachtet:netzwerk_symbol_beobachtet,
        wiederaufnahme_ueber_netz_belegt:ereignis_von_aussen_belegt&&empfang_zugeordnet&&funktion_wiederaufgenommen,
        belege_offen:[...(ereignis_von_aussen_belegt?[]:['externes_signal']),...(empfang_zugeordnet?[]:['empfangsbezug']),...(funktion_wiederaufgenommen?[]:['wiederaufnahme'])],
        hinweis:'Nur vorhandene Belege lesen. Ein Symbol, eine App-Anzeige oder eine Erreichbarkeitsmeldung allein belegt keine Reaktivierung.'};
    },{netzwerk_symbol_beobachtet:true,ereignis_von_aussen_belegt:true,empfang_zugeordnet:true,funktion_wiederaufgenommen:false},
    {verbindungssymbol_beobachtet:true,wiederaufnahme_ueber_netz_belegt:false,belege_offen:['wiederaufnahme']}),

  tool('betriebszustand_netzfunktion_mehraufwand_je_nutzen',
    'Zwei beobachtete gleich lange Bereitschaftsabläufe nach gemessener Zusatzenergie pro tatsächlich zusätzlichem Funktionsnutzen vergleichen — Relate measured extra energy to successful network-only events rather than uptime alone.',
    {
      a_wh:num('Gemessene Energie des gesamten Vergleichsfensters ohne diese Netzwerkfunktion.'),
      b_wh:num('Gemessene Energie des gleich langen Fensters mit der gewünschten Netzwerkfunktion.'),
      netz_erfolg_versuche:num('Zahl unabhängig protokollierter Versuche, in denen zusätzliche Nutzung allein durch diese Funktion erfolgreich war.'),
      zeit_aufgabe_und_geraet_gleich:yes('Gleiches Gerät, gleiche Ausgangsbedingungen und vergleichbar erfasste Nutzung?'),
    },({a_wh,b_wh,netz_erfolg_versuche,zeit_aufgabe_und_geraet_gleich})=>{
      whole(netz_erfolg_versuche);
      const delta=b_wh-a_wh;
      return {beobachtete_zusatz_wh:zeit_aufgabe_und_geraet_gleich?r(delta):null,
        zusatz_wh_je_nachgewiesenem_nutzen:zeit_aufgabe_und_geraet_gleich&&delta>=0&&netz_erfolg_versuche?r(delta/netz_erfolg_versuche):null,
        hinweis:'Nur Nutzungsprotokolle vergleichen. Nicht unterstellen, dass jede Verbindung einen Nutzen liefert oder ihren Zustand verändern.'};
    },{a_wh:3,b_wh:9,netz_erfolg_versuche:2,zeit_aufgabe_und_geraet_gleich:true},
    {beobachtete_zusatz_wh:6,zusatz_wh_je_nachgewiesenem_nutzen:3}),

  tool('oekodesign_hina_klasse_aus_hauptfunktion',
    'Die dokumentierte Hauptfunktion von vorhandenen Router-, Schalter- oder Zugangspunktfunktionen trennen — Read the documentary HiNA class without promoting ordinary Wi-Fi equipment to high availability.',
    {
      vernetzt_belegt:yes('Netzwerkfähigkeit und geeigneter Netzwerk-Port des konkreten Geräts aus den Unterlagen belegt?'),
      hauptfunktion:pick('Dokumentierte Hauptfunktion nach Anhang I, keine Ableitung aus einem WLAN-Symbol.','ausschliesslich_hina_funktionen','weitere_hauptfunktion','offen'),
      routing_switch_ap:pick('Sind Router-, Netzwerk-Schalter- oder Zugangspunktfunktionen tatsächlich ausgewiesen?','ja','nein','offen'),
      funktionsliste_vollstaendig:yes('Vollständige modellbezogene Überprüfung der Funktionsliste vorhanden?'),
    },({vernetzt_belegt,hauptfunktion,routing_switch_ap,funktionsliste_vollstaendig})=>{
      if (!vernetzt_belegt||!funktionsliste_vollstaendig||hauptfunktion==='offen') return {klasse:null};
      return {klasse:hauptfunktion==='ausschliesslich_hina_funktionen'?'hina_geraet':routing_switch_ap==='ja'?'geraet_mit_hina_funktion':routing_switch_ap==='nein'?'nicht_hina':null,
        fundstelle:rule+' Anhang I Nr. 7–9',
        hinweis:'Zuordnung der eingegebenen dokumentierten Merkmale; keine formale Klassifizierung eines konkreten Produkts.'};
    },{vernetzt_belegt:true,hauptfunktion:'weitere_hauptfunktion',routing_switch_ap:'nein',funktionsliste_vollstaendig:true},
    {klasse:'nicht_hina'}),

  tool('betriebszustand_automatikfeld_beobachtung_zeitband',
    'Eine dokumentierte Umschaltzeit je Zielzustand mit einem beobachteten, aber nicht sekundengenau erfassten Wechsel abgleichen — Assess whether an independently matched transition interval contains the stated delay.',
    {
      untere_zeit_min:minute('Früheste plausible Umschaltzeit nach demselben protokollierten Startsignal.'),
      obere_zeit_min:minute('Späteste plausible Umschaltzeit nach demselben Startsignal.'),
      dokumentfeld_min:minute('Getrennt angegebene Herstellerzeit für genau diesen Wechsel.'),
      start_und_ziel_verglichen:yes('Stimmen Beginn, Zielzustand, Netzprofil und dokumentierte Geräteeinstellungen überein?'),
    },({untere_zeit_min,obere_zeit_min,dokumentfeld_min,start_und_ziel_verglichen})=>{
      if (untere_zeit_min>obere_zeit_min) throw new RangeError();
      if (!start_und_ziel_verglichen) return {vergleich:null,abstand_min:null};
      const earliest=untere_zeit_min-dokumentfeld_min;
      const latest=obere_zeit_min-dokumentfeld_min;
      return {vergleich:earliest>0?'beobachtet_spaeter':latest<0?'beobachtet_frueher':'angabe_im_zeitband',
        abstand_min:[r(earliest),r(latest)],
        hinweis:'Ein dokumentierter, gegebenenfalls gerundeter Wert belegt keine genaue tatsächliche Umschaltminute.'};
    },{untere_zeit_min:19,obere_zeit_min:23,dokumentfeld_min:20,start_und_ziel_verglichen:true},
    {vergleich:'angabe_im_zeitband',abstand_min:[-1,3]}),

  tool('betriebszustand_zeitbezug_letzte_relevante_nutzung',
    'Eine dokumentierte Ruhestandsdauer erst ab der letzten relevanten Nutzung auf derselben Achse lesen — Derive the observed measurement baseline after all recorded activity gates have cleared.',
    {
      hauptfunktion_ende_min:minute('Belegtes Ende der Hauptfunktion auf der gemeinsamen Minutenachse.'),
      letzte_relevante_interaktion_min:minute('Belegte letzte für die Aufzeichnung relevante Interaktion.'),
      abhaengigkeit_ende_min:minute('Dokumentiertes Ende der Anforderung des abhängigen Geräts, bei nachweislich keiner Anforderung 0.'),
      beobachtung_ruhe_min:minute('Erster Zeitpunkt, an dem der spätere Zustand belegt wurde.'),
      regler_startbezug_bestaetigt:yes('Die Geräteunterlage bestätigt genau diese Bezugspunkte für die betrachtete Auswertung?'),
    },({hauptfunktion_ende_min,letzte_relevante_interaktion_min,abhaengigkeit_ende_min,beobachtung_ruhe_min,regler_startbezug_bestaetigt})=>{
      const start=Math.max(hauptfunktion_ende_min,letzte_relevante_interaktion_min,abhaengigkeit_ende_min);
      if (beobachtung_ruhe_min<start) return {status:'beobachtung_vor_angegebenen_freigaben',beobachtungsabstand_min:null};
      return {status:regler_startbezug_bestaetigt?'abstand_belegt':'startbezug_offen',
        beobachtungsabstand_min:regler_startbezug_bestaetigt?r(beobachtung_ruhe_min-start):null,
        ende_letzte_voraussetzung_min:regler_startbezug_bestaetigt?start:null,
        hinweis:'Der erste belegte spätere Zustand kann später liegen als sein tatsächlicher Start.'};
    },{hauptfunktion_ende_min:18,letzte_relevante_interaktion_min:20,abhaengigkeit_ende_min:24,beobachtung_ruhe_min:40,regler_startbezug_bestaetigt:true},
    {status:'abstand_belegt',beobachtungsabstand_min:16,ende_letzte_voraussetzung_min:24}),

  tool('betriebszustand_netzports_dokumentwert_pruefbestand',
    'Bei einem Netzwerk-Referenzwert dokumentierte Portbedingungen und vorliegende Beobachtung vergleichen — Check whether a saved port-state inventory can be compared with the declared all-ports reference.',
    {
      kabel_ports:num('Gesamtzahl belegter drahtgebundener Netzwerk-Ports im genauen Dokument.'),
      kabel_verbunden:num('Davon für das Beobachtungsfenster nachweislich verbunden.'),
      funk_ports:num('Gesamtzahl belegter drahtloser Netzwerk-Ports.'),
      funk_aktiv:num('Davon für das Beobachtungsfenster nachweislich aktiviert.'),
      funk_und_kabel_vollstaendig:yes('Gehören die Angaben sicher zu allen Ports desselben Geräts und zum selben Zeitfenster?'),
    },({kabel_ports,kabel_verbunden,funk_ports,funk_aktiv,funk_und_kabel_vollstaendig})=>{
      whole(kabel_ports,kabel_verbunden,funk_ports,funk_aktiv);
      if (kabel_verbunden>kabel_ports||funk_aktiv>funk_ports) throw new RangeError();
      if (!funk_und_kabel_vollstaendig||!kabel_ports&&!funk_ports) return {alle_ports_referenz_belegt:null};
      return {alle_ports_referenz_belegt:kabel_ports===kabel_verbunden&&funk_ports===funk_aktiv,
        nicht_als_verbunden_gemeldete_kabelports:kabel_ports-kabel_verbunden,
        nicht_als_aktiv_gemeldete_funkports:funk_ports-funk_aktiv,
        hinweis:'Vergleicht bestehende Aufzeichnungen mit der Informationsreferenz. Keine Portänderung oder Prüfanweisung.',
        fundstelle:rule+' Anhang III Nr. 3 a Nr. 2'};
    },{kabel_ports:1,kabel_verbunden:1,funk_ports:2,funk_aktiv:1,funk_und_kabel_vollstaendig:true},
    {alle_ports_referenz_belegt:false,nicht_als_verbunden_gemeldete_kabelports:0,nicht_als_aktiv_gemeldete_funkports:1}),

  tool('betriebszustand_rundungsdifferenz_datenblatt_quellen',
    'Unterschiede zwischen zwei veröffentlichten Stellen bei derselben Zustandsangabe als mögliche Anzeige-Rundung abgleichen — Reconcile a detailed manufacturer value with a separately reported one-decimal figure.',
    {
      wert_genau_w:watt('Feiner angegebener Herstellerwert für denselben Zustand.'),
      wert_eine_stelle_w:watt('Sichtbarer Herstellerwert mit genau einer Dezimalstelle.'),
      gleicher_bezug:yes('Modell, Marktversion, Betriebsfunktion und Messbedingungen sind sicher identisch?'),
      naechste_dezimalstelle_belegt:yes('Belegter Vergleich mit Rundung zur nächsten Dezimalstelle, keine Abschneideregel?'),
    },({wert_genau_w,wert_eine_stelle_w,gleicher_bezug,naechste_dezimalstelle_belegt})=>{
      if (Math.abs(wert_eine_stelle_w*10-Math.round(wert_eine_stelle_w*10))>1e-6) throw new RangeError('Den sichtbaren Wert unverändert mit einer Dezimalstelle angeben.');
      if (!gleicher_bezug||!naechste_dezimalstelle_belegt) return {differenz_w:null,naechste_rundung_erklaert:null};
      const min=Math.max(0,wert_eine_stelle_w-0.05);
      const max=wert_eine_stelle_w+0.05;
      return {differenz_w:r(wert_eine_stelle_w-wert_genau_w),
        naechste_rundung_erklaert:wert_genau_w>=min-1e-9&&wert_genau_w<=max+1e-9,
        hinweis:'An exakter Mittelgrenze können Rundungskonventionen abweichen. Das Intervall ist kein Messfehler und keine Prüftoleranz.'};
    },{wert_genau_w:0.28,wert_eine_stelle_w:0.3,gleicher_bezug:true,naechste_dezimalstelle_belegt:true},
    {differenz_w:0.02,naechste_rundung_erklaert:true}),

  tool('betriebszustand_netzteil_grenze_wirkleistung',
    'Eine am Gerät erhobene Niedervolt-Angabe von gleichzeitig gemessener Netzaufnahme mit demselben Netzteil unterscheiden — Reconcile documented metering sides without treating output power as wall power.',
    {
      eingang_w:watt('Bereits fachgerecht gemessene mittlere Wirkleistung der Netzseite für den stabilen Abschnitt.'),
      ausgang_w:watt('Für genau denselben stabilen Abschnitt passend dokumentierte Ausgangsleistung.'),
      fehlerband_w:watt('Belegter kombinierter absoluter Messspielraum.'),
      selbes_netzteil_fenster:yes('Gleiche Zeitfenster, Netzteil, Versorgungslast und keine gespeicherte Energie im Bilanzabschnitt schon bestätigt?'),
    },({eingang_w,ausgang_w,fehlerband_w,selbes_netzteil_fenster})=>{
      if (!selbes_netzteil_fenster) return {status:'messgrenze_offen',netto_differenz_w:null};
      const loss=eingang_w-ausgang_w;
      return {status:loss< -fehlerband_w-1e-9?'messung_oder_bilanz_pruefen':'messseiten_getrennt',netto_differenz_w:r(loss),
        differenz_groesser_als_messspielraum:loss>fehlerband_w+1e-9,
        hinweis:'Nur vorhandene passende Leistungsangaben lesen. Keine Messarbeiten an Anschlüssen oder Netzteilen.'};
    },{eingang_w:1.15,ausgang_w:0.8,fehlerband_w:0.1,selbes_netzteil_fenster:true},
    {status:'messseiten_getrennt',netto_differenz_w:0.35,differenz_groesser_als_messspielraum:true}),

  tool('betriebszustand_stichprobe_display_status_muster',
    'Bei mehreren Geräteabschnitten mit gleichem Symbol prüfen, ob bestätigte Funktionen den Abschnitt trotzdem unterschiedlich einordnen — Expose when one display symbol groups multiple actual operating states.',
    {
      abschnitte_mit_symbol:num('Zahl aller unterschiedlich abgegrenzten Beobachtungsabschnitte mit exakt demselben Symbol.'),
      belegte_aus_abschnitte:num('Davon unabhängig als Aus-Zustand dokumentierte Abschnitte.'),
      belegte_bereitschafts_abschnitte:num('Davon andere, unabhängig als Bereitschaft dokumentierte Abschnitte.'),
    },({abschnitte_mit_symbol,belegte_aus_abschnitte,belegte_bereitschafts_abschnitte})=>{
      whole(abschnitte_mit_symbol,belegte_aus_abschnitte,belegte_bereitschafts_abschnitte);
      if (belegte_aus_abschnitte+belegte_bereitschafts_abschnitte>abschnitte_mit_symbol) throw new RangeError();
      return {symbol_belegt_nicht_eindeutig:belegte_aus_abschnitte>0&&belegte_bereitschafts_abschnitte>0,
        abschnitte_ohne_bestaetigten_zustand:abschnitte_mit_symbol-belegte_aus_abschnitte-belegte_bereitschafts_abschnitte,
        hinweis:'Nur beobachtete Mehrdeutigkeit nachweisen. Ein bislang einheitliches Symbol bleibt in künftigen Zuständen ungeprüft.'};
    },{abschnitte_mit_symbol:7,belegte_aus_abschnitte:3,belegte_bereitschafts_abschnitte:2},
    {symbol_belegt_nicht_eindeutig:true,abschnitte_ohne_bestaetigten_zustand:2}),

  tool('betriebszustand_netzereignis_mehrverbrauch_anteilsbeleg',
    'Mehrenergie zweier Bereitschaftsaufzeichnungen nach belegten Aktivierungen und verbleibender Differenz aufschlüsseln — Attribute matched low-state energy differences before assigning them to baseline demand.',
    {
      referenz_wh:num('Gesamte gemessene Energie der ruhigen Referenzphase.'),
      ereignisfenster_wh:num('Gesamte gemessene Energie in gleich langem Fenster mit dokumentierten Ereignissen.'),
      separat_zusatz_wh:num('Separat erfasste, gegenüber der passenden Referenz zusätzlich durch bestätigte Ereignisintervalle beobachtete Energie.'),
      bezug_geprueft:yes('Beide Messfenster vergleichen dieselben übrigen Bedingungen, Ereignisintervalle überschneiden sich nachweislich nicht?'),
    },({referenz_wh,ereignisfenster_wh, separat_zusatz_wh,bezug_geprueft})=>{
      if (separat_zusatz_wh>ereignisfenster_wh) throw new RangeError();
      const diff=ereignisfenster_wh-referenz_wh;
      return {beobachtete_gesamt_differenz_wh:bezug_geprueft?r(diff):null,
        differenz_nach_bestaetigtem_ereignisanteil_wh:bezug_geprueft?r(diff-separat_zusatz_wh):null,
        hinweis:'Die übrige Differenz kann aus anderen Zuständen und Messspielraum stammen. Kein alleiniger Nachweis von Netzgrundlast.'};
    },{referenz_wh:11,ereignisfenster_wh:15,separat_zusatz_wh:3,bezug_geprueft:true},
    {beobachtete_gesamt_differenz_wh:4,differenz_nach_bestaetigtem_ereignisanteil_wh:1}),

  tool('betriebszustand_funktionsbedarf_watt_rang_sperre',
    'Herstellerwerte erst dann für eine Auswahl lesen, wenn die tatsächlich benötigte dokumentierte Funktion im betreffenden Zustand verfügbar ist — Compare candidate state values only among confirmed adequate modes.',
    {
      a_w:watt('Dem belegten Zustand A zugeordneter Herstellerwert.'),
      b_w:watt('Dem belegten Zustand B zugeordneter Herstellerwert.'),
      a_funktion:pick('Dieselbe notwendige Funktion ist im Zustand A laut Modellbeleg verfügbar?','ja','nein','offen'),
      b_funktion:pick('Dieselbe notwendige Funktion ist im Zustand B laut Modellbeleg verfügbar?','ja','nein','offen'),
      aufgabe_und_modell_gleich:yes('Werte und Funktionsauskunft betreffen dasselbe Gerät und dieselbe tatsächlich benötigte Aufgabe?'),
    },({a_w,b_w,a_funktion,b_funktion,aufgabe_und_modell_gleich})=>{
      if (!aufgabe_und_modell_gleich) return {belegte_varianten:null,vergleichbarer_delta_w:null};
      const modes=[['A',a_funktion],['B',b_funktion]];
      return {belegte_varianten:modes.filter(([,v])=>v==='ja').map(([id])=>id),offene_varianten:modes.filter(([,v])=>v==='offen').map(([id])=>id),
        vergleichbarer_delta_w:a_funktion==='ja'&&b_funktion==='ja'?r(b_w-a_w):null,
        hinweis:'Eine kleinere Herstellerzahl macht einen Zustand ohne die nötige Funktion nicht gleichwertig.'};
    },{a_w:0.3,b_w:2,a_funktion:'nein',b_funktion:'ja',aufgabe_und_modell_gleich:true},
    {belegte_varianten:['B'],offene_varianten:[],vergleichbarer_delta_w:null}),

  tool('betriebszustand_dokument_marktschnitt_setting_abweichung',
    'Den bei einem dokumentierten Softwarewechsel mitgeführten Stromsparmodus von anderen reinen Quellenänderungen unterscheiden — Compare actual saved timer settings across a verified revision without prescribing updates.',
    {
      timer_vorher:pick('Vor der Revision bereits gespeicherter und belegter Zustand der Stromsparfunktion.','aktiv','inaktiv','offen'),
      timer_nachher:pick('Nach der Revision tatsächlich belegter gespeicherter Zustand.','aktiv','inaktiv','offen'),
      handbuch_davor_min:minute('Dokumentiertes Zeitfeld in der passenden vorherigen Anleitung.'),
      handbuch_danach_min:minute('Dokumentiertes Zeitfeld in der passenden späteren Anleitung.'),
      hardware_und_ziel_gleich:yes('Beide Belege gelten für dieselbe Hardware, Zielart und beobachtete Revision?'),
    },({timer_vorher,timer_nachher,handbuch_davor_min,handbuch_danach_min,hardware_und_ziel_gleich})=>{
      if (!hardware_und_ziel_gleich) return {dokument_delta_min:null,gespeicherter_zustand_geaendert:null};
      const known=timer_vorher!=='offen'&&timer_nachher!=='offen';
      return {dokument_delta_min:r(handbuch_danach_min-handbuch_davor_min),
        gespeicherter_zustand_geaendert:known?timer_vorher!==timer_nachher:null,
        hinweis:'Dokumentfeld und beobachtete gespeicherte Einstellung sind getrennte Belege. Keine Aktualisierung oder Umstellung empfohlen.'};
    },{timer_vorher:'aktiv',timer_nachher:'inaktiv',handbuch_davor_min:20,handbuch_danach_min:20,hardware_und_ziel_gleich:true},
    {dokument_delta_min:0,gespeicherter_zustand_geaendert:true}),

  tool('betriebszustand_log_abschnittsanteil_keine_stichprobenquote',
    'Für zwei dokumentierte Zustände prüfen, ob häufigere Messpunkte eine längere tatsächliche Verweildauer nur vortäuschen — Identify a count-versus-duration ranking reversal under unequal sample density.',
    {
      a_punkte:num('Verfügbare einzelne Messpunkte des unabhängig dokumentierten Zustands A.'),
      b_punkte:num('Verfügbare einzelne Messpunkte des unabhängig dokumentierten Zustands B.'),
      a_min:minute('Dauer der tatsächlich bestätigten Abschnitte in Zustand A.'),
      b_min:minute('Dauer der tatsächlich bestätigten Abschnitte in Zustand B.'),
      abschnitte_getrennt:yes('Sind beide auf derselben Zeitachse erfasst, ohne Überschneidung und mit einheitlichen Zustandsdefinitionen?'),
    },({a_punkte,b_punkte,a_min,b_min,abschnitte_getrennt})=>{
      whole(a_punkte,b_punkte);
      if (!abschnitte_getrennt) return {punktquote_a_prozent:null,dauerquote_a_prozent:null,rang_wechselt:null};
      return {punktquote_a_prozent:a_punkte+b_punkte?r(100*a_punkte/(a_punkte+b_punkte)):null,
        dauerquote_a_prozent:a_min+b_min?r(100*a_min/(a_min+b_min)):null,
        rang_wechselt:(a_punkte-b_punkte)*(a_min-b_min)<0,
        hinweis:'Bezieht Anteile nur auf die zwei bekannten Zustände. Unbeobachtete Zeit kann nicht aus Punktzahlen rekonstruiert werden.'};
    },{a_punkte:20,b_punkte:10,a_min:15,b_min:45,abschnitte_getrennt:true},
    {punktquote_a_prozent:66.6667,dauerquote_a_prozent:25,rang_wechselt:true}),
];
