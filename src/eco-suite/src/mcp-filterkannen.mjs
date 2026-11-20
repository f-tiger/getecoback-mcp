const page='/guide/strom-sparen-haushalt.html';
const manual='https://www.brita.de/dam/jcr%3A2b5f9044-9d91-4dd4-9179-74369e42708c/brita-waterfilterjug-instruction-manual-maxtrapro-DE-IT-FR-ES-NL-EN.pdf';
const faq='https://www.brita.de/faq/filter-filterkartuschen';
const jugs='https://www.brita.de/faq/tischwasserfilter';
const flow='https://www.brita.de/produkte/flow-tischwasserfilter';
const eco='https://www.brita.de/produkte/style-eco-tischwasserfilter/1055714';
const essential='https://www.brita.de/produkte/style-essential-tischwasserfilter/1058146';
const publicAdvice='https://www.verbraucherzentrale.de/wissen/umwelt-haushalt/wasser/wasserfilter-sind-sie-aus-hygienischer-sicht-notwendig-5534';
const uba='https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/trinkwasser-aus-der-leitung-nachhaltig-gesund';
const handbuchDownload=essential;
const reviewed='2026-11-20';
const number=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const choice=(description,...values)=>({type:'string',description,enum:values});
const count=description=>number(description,0,100);
const hours=description=>number(description,0,2000);
const litre=description=>number(description,0,1000);
const proof=description=>choice(description,'bestaetigt','abweichend','offen');
const round=value=>Number(value.toFixed(3));
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Ganze Stückzahlen erforderlich');
}
function tool(name,description,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const filterkannen=[
  tool('leitungswasser_filterkanne_bedarf_oder_abklaerung',
    'Kaufgrund für eine Tischwasserfilterkanne von offenen Fragen zur örtlichen Versorgung unterscheiden — Identify whether a jug purchase is optional or source clarification comes first.',
    {versorgung:choice('Belegter Wasserkontext.','oeffentliches_netz','andere_quelle','offen'),zweck:choice('Wichtigster Grund für die Anschaffung.','kalk_oder_geschmack','nur_allgemeine_vorsorge','konkrete_qualitaetsfrage','offen'),
      amtliche_gebrauchsvorgabe:yes('Liegt eine aktuelle amtliche Gebrauchsvorgabe für diese konkrete Versorgung vor?')},
    ({versorgung,zweck,amtliche_gebrauchsvorgabe})=>({
      naechster_schritt:amtliche_gebrauchsvorgabe?'amtliche_vorgabe_fuer_diesen_anschluss_beachten':versorgung!=='oeffentliches_netz'||zweck==='konkrete_qualitaetsfrage'?'quelle_und_lokale_frage_abklaeren':zweck==='nur_allgemeine_vorsorge'?'tischfilter_in_der_regel_nicht_noetig':zweck==='kalk_oder_geschmack'?'freiwillige_entscheidung_auch_ohne_kauf':'bedarf_klaeren',
      quelle:publicAdvice,weiterer_hintergrund:uba,quellenstand:reviewed,grenze:'Allgemeine Einordnung für Deutschland. Keine Aussage zur Qualität eines einzelnen Anschlusses.'}),
    {versorgung:'oeffentliches_netz',zweck:'nur_allgemeine_vorsorge',amtliche_gebrauchsvorgabe:false},
    {naechster_schritt:'tischfilter_in_der_regel_nicht_noetig',quelle:publicAdvice}),

  tool('brita_maxtra_pro_kartuschenvariante_haertedaten_lesen',
    'PURE PERFORMANCE und EXTRA KALKSCHUTZ nur mit örtlich belegter Härteklasse und persönlichem Zweck einordnen — Match manufacturer positioning without inferring reduction.',
    {haerteklasse:choice('So bezeichnet der örtliche Versorger die Härte für den konkreten Anschluss.','weich_oder_mittel','hart','sehr_hart','offen'),
      bericht_zum_anschluss:yes('Ist der Härtebereich dem vorhandenen Anschluss und aktuellen Versorgungsdaten zugeordnet?'),
      zweck:choice('Gewünschter Vergleichszweck.','alltag_geschmack','kalkfokus_heissgetraenk','kein_filterwunsch')},
    ({haerteklasse,bericht_zum_anschluss,zweck})=>{
      const applies=bericht_zum_anschluss&&haerteklasse!=='offen';
      const models=haerteklasse==='hart'?['PURE PERFORMANCE','EXTRA KALKSCHUTZ']:haerteklasse==='sehr_hart'?['EXTRA KALKSCHUTZ']:['PURE PERFORMANCE'];
      return {hersteller_einordnung:applies&&zweck!=='kein_filterwunsch'?models:null,
        status:zweck==='kein_filterwunsch'?'kauf_offen_lassen':!applies?'wasserhaerte_fuer_anschluss_pruefen':models.length===2?'beide_bereiche_ueberlappen':'genannter_haertebereich_belegt',
        quelle:faq,grenze:'Hersteller ordnet PURE PERFORMANCE weichem bis hartem Wasser und EXTRA KALKSCHUTZ hartem bis sehr hartem Wasser zu. Kein Wirkungs-, Geschmacks- oder Eignungstest.'};
    },{haerteklasse:'hart',bericht_zum_anschluss:true,zweck:'kalkfokus_heissgetraenk'},
    {hersteller_einordnung:['PURE PERFORMANCE','EXTRA KALKSCHUTZ'],status:'beide_bereiche_ueberlappen'}),

  tool('brita_maxtra_pro_wechsel_kalender_und_mengenbeleg',
    'Kalender und dokumentierte Filtermenge getrennt gegen den MAXTRA PRO Herstellerhinweis lesen — Check which published replacement trigger is documented.',
    {kartusche_pro_belegt:yes('Ist eine originale MAXTRA PRO im Geltungsbereich der Tischkannen-Anleitung bestätigt?'),
      erste_nutzung_belegt:yes('Ist der Tag der ersten Nutzung dieser Kartusche bestätigt?'),kalendertage:number('Kalendertage einschließlich Nutzungsunterbrechungen seit Erstnutzung, nicht nur Nutzungstage.',0,3650),
      mengenlog_voll:yes('Sind seit Erstnutzung alle durchgeflossenen Mengen dieses Exemplars zugeordnet?'),gefiltert_l:litre('Bereits vollständig protokollierte, gefilterte Menge in Litern.'),
      haertebezug:choice('Zugeordnete örtliche Härte nach dem Herstellerbezug.','10_bis_12_dh','ueber_12_dh','unter_10_dh','offen')},
    ({kartusche_pro_belegt,erste_nutzung_belegt,kalendertage,mengenlog_voll,gefiltert_l,haertebezug})=>{
      const calendar=kartusche_pro_belegt&&erste_nutzung_belegt?kalendertage>=28:null;
      const volume=kartusche_pro_belegt&&mengenlog_voll&&haertebezug==='10_bis_12_dh'?gefiltert_l>=150:null;
      return {vier_wochen_erreicht:calendar,mengenhinweis_bei_10_bis_12_dh_erreicht:volume,
        naechster_abgleich:!kartusche_pro_belegt?'kartuschentyp_klaeren':calendar===true||volume===true?'herstellerwechselhinweis_erreicht':haertebezug==='ueber_12_dh'?'fruehere_grenze_laut_unterlagen_pruefen':calendar===null||volume===null?'fehlenden_bezug_klaeren':'dokumentierte_grenzen_nicht_erreicht',
        quellen:[manual,handbuchDownload,faq],grenze:'Vier Wochen und die Hersteller-Mengenangabe sind Wechselhinweise. Die FAQ nennt 150 L für 10–12 °dH und nennt für härteres Wasser weniger, ohne einen Ersatzwert anzugeben.'};
    },{kartusche_pro_belegt:true,erste_nutzung_belegt:true,kalendertage:22,mengenlog_voll:true,gefiltert_l:151,haertebezug:'10_bis_12_dh'},
    {vier_wochen_erreicht:false,mengenhinweis_bei_10_bis_12_dh_erreicht:true,naechster_abgleich:'herstellerwechselhinweis_erreicht'}),

  tool('brita_aktivierung_trichterfuellung_nicht_liter',
    'Trichterfüllungen im MAXTRA PRO Kannenhandbuch von einer Literangabe aus der unterstützenden FAQ unterscheiden — Reconcile the different first-use evidence units.',
    {handbuch_passt_zur_kanne:yes('Ist die verlinkte MAXTRA PRO Kannenanleitung genau für die verwendete Kanne und Kartusche bestätigt?'),
      beleg_einheit:choice('Was wurde für dieses Exemplar tatsächlich protokolliert?','ganze_trichterfuellungen','nur_liter','beides','offen'),
      vollstaendige_trichterfuellungen:count('Gezählte vollständig durchgelaufene erste Trichterfüllungen, bei nicht belegt 0.'),
      volumen_l:litre('Separat gemessene Anfangsmenge in Litern, bei nicht belegt 0.')},
    ({handbuch_passt_zur_kanne,beleg_einheit,vollstaendige_trichterfuellungen,volumen_l})=>{
      whole(vollstaendige_trichterfuellungen);
      const passes=['ganze_trichterfuellungen','beides'].includes(beleg_einheit);
      const lit=['nur_liter','beides'].includes(beleg_einheit);
      return {handbuch_trichterhinweis_erfasst:handbuch_passt_zur_kanne&&passes?vollstaendige_trichterfuellungen>=2:null,
        separat_protokolliert_l:lit?volumen_l:null,status:!handbuch_passt_zur_kanne?'genaue_anleitung_zuordnen':passes?'trichterbeobachtung_abgeglichen':lit?'literangabe_belegt_keine_trichterzahl':'vorbereitung_unklar',
        quellen:[manual,handbuchDownload,faq],grenze:'Das Kannenhandbuch zählt zwei vollständige Trichterfüllungen. Die FAQ erwähnt auch zwei Liter. Trichtergrößen nicht gleichsetzen; die konkrete Anleitung bleibt maßgeblich.'};
    },{handbuch_passt_zur_kanne:true,beleg_einheit:'nur_liter',vollstaendige_trichterfuellungen:0,volumen_l:2},
    {handbuch_trichterhinweis_erfasst:null,separat_protokolliert_l:2,status:'literangabe_belegt_keine_trichterzahl'}),

  tool('brita_kartusche_namenswechsel_altbestand_abgleichen',
    'BRITA MAXTRA PRO ALL-IN-1 als Vorgänger von PURE PERFORMANCE vor dem Nachkauf erkennen — Identify an officially listed predecessor without copying its capacity claim.',
    {aufdruck:choice('Eindeutig abgelesene Kennung.','maxtra_plus','maxtra_pro_all_in_1','maxtra_pro_pure_performance','maxtra_pro_extra_kalkschutz','andere_oder_offen'),
      originalbeleg:yes('Liegt die tatsächlich zugehörige BRITA Originalverpackung oder ein gleichwertiger Herstellerbeleg vor?'),
      nachkauf_typ:choice('Eindeutige Bezeichnung des erwogenen Nachkaufs.','maxtra_pro_pure_performance','maxtra_pro_extra_kalkschutz','offen')},
    ({aufdruck,originalbeleg,nachkauf_typ})=>{
      const category=aufdruck==='maxtra_plus'?'vorgaenger_der_pro_familie':aufdruck==='maxtra_pro_all_in_1'?'vorgaenger_von_pure_performance':aufdruck==='andere_oder_offen'?null:'konkret_benannte_pro_variante';
      return {belegte_namenseinordnung:originalbeleg?category:null,
        konkrete_aufschrift_gleich:originalbeleg&&category&&nachkauf_typ!=='offen'?aufdruck===nachkauf_typ:null,
        quellen:[essential,faq],grenze:'Eine Vorgängerzuordnung erlaubt keine Übertragung von Filtermenge, Packungsumfang oder Prüfbedingungen.'};
    },{aufdruck:'maxtra_pro_all_in_1',originalbeleg:true,nachkauf_typ:'maxtra_pro_pure_performance'},
    {belegte_namenseinordnung:'vorgaenger_von_pure_performance',konkrete_aufschrift_gleich:false}),

  tool('brita_flow_perfectfit_merkmal_ausnahme',
    'Ein erwartetes PerfectFit-Merkmal nicht auf die Flow-Kanne übertragen — Check whether the exact jug uses the documented PerfectFit mechanism.',
    {kanne:choice('Genau bestätigtes Modell oder eindeutig dokumentierter Systemtyp.','brita_flow','brita_kanne_mit_bestaetigtem_perfectfit','andere_kanne','offen'),
      beobachtung:choice('Eigenes beobachtetes Merkmal.','mechanismus_gesehen','kein_mechanismus_gesehen','offen'),
      kartusche_maxtra_pro_original:yes('Wurde die Originalkartusche MAXTRA PRO eindeutig erkannt?')},
    ({kanne,beobachtung,kartusche_maxtra_pro_original})=>({
      perfectfit_dokumentiert:kanne==='brita_flow'?false:kanne==='brita_kanne_mit_bestaetigtem_perfectfit'?true:null,
      naechster_schritt:kanne==='brita_flow'?'flow_ohne_perfectfit_dokumentiert':kanne!=='brita_kanne_mit_bestaetigtem_perfectfit'?'systemzuordnung_pruefen':beobachtung!=='mechanismus_gesehen'||!kartusche_maxtra_pro_original?'mechanismus_und_kartusche_abgleichen':'belegte_merkmale_zugeordnet',
      quelle:manual,handbuch_download:handbuchDownload,grenze:'Flow ist laut Anleitung von PerfectFit ausgenommen. Sichtprüfung und Originalaufschrift bestätigen keine Filterleistung.'}),
    {kanne:'brita_flow',beobachtung:'kein_mechanismus_gesehen',kartusche_maxtra_pro_original:true},
    {perfectfit_dokumentiert:false,naechster_schritt:'flow_ohne_perfectfit_dokumentiert'}),

  tool('brita_deckelanzeige_zeit_oder_zeit_und_menge',
    'Den eigenen Bedarf an einem Mengensignal gegen die dokumentierten BRITA Deckelanzeigen prüfen — Compare a time reminder against time-plus-volume indication.',
    {deckel:choice('Tatsächlicher Anzeigetyp am eindeutig zugeordneten BRITA Deckel.','memo','smart_light','meter_oder_anderer','offen'),
      genaue_anleitung_gelesen:yes('Ist der Typ in der eigenen genauen Anleitung bestätigt?'),
      menge_als_erinnerung_gewuenscht:yes('Soll die Anzeige für die eigene Routine auch einen mengenbezogenen Hinweis liefern?')},
    ({deckel,genaue_anleitung_gelesen,menge_als_erinnerung_gewuenscht})=>{
      const inputs=genaue_anleitung_gelesen?(deckel==='memo'?['zeit']:deckel==='smart_light'?['zeit','wassermenge']:null):null;
      return {dokumentierte_signalgrundlagen:inputs,mengewunsch_durch_anzeige_belegt:inputs&&menge_als_erinnerung_gewuenscht?inputs.includes('wassermenge'):null,
        quelle:manual,handbuch_download:handbuchDownload,grenze:'Smart Light berücksichtigt Zeit und Wassermenge, Memo ist ein Zeit-Countdown. Ein Statussignal ist kein exakt ablesbarer Literstand.'};
    },{deckel:'memo',genaue_anleitung_gelesen:true,menge_als_erinnerung_gewuenscht:true},
    {dokumentierte_signalgrundlagen:['zeit'],mengewunsch_durch_anzeige_belegt:false}),

  tool('brita_filterkanne_teil_und_spuelprogramm_beleg',
    'Flow, Style eco, Trichter und Memo-Deckel auf dokumentierte Spülmaschine oder Handpflege prüfen — Compare dishwasher and hand-care evidence for the actual component.',
    {modell:choice('Genaue Zuordnung des betrachteten Geräts.','flow','style_eco_1055714','handbuch_bestaetigte_kanne','andere_oder_offen'),
      teil:choice('Tatsächlich betroffenes Einzelteil.','kanne_oder_trichter','memo_deckel_fest','style_eco_deckel','smart_light_modul','glas_dichtungsring','offen'),
      spueltemperatur_c:number('Dokumentierte Temperatur des betrachteten Spülprogramms in °C, 0 wenn unbekannt.',0,100),
      led_separiert_bestaetigt:yes('Ist beim abnehmbaren Style-eco-Licht die getrennte Behandlung ausdrücklich bestätigt?')},
    ({modell,teil,spueltemperatur_c,led_separiert_bestaetigt})=>{
      let status;
      if(modell==='andere_oder_offen'||teil==='offen') status='genaue_teileanleitung_zuordnen';
      else if(modell==='flow') status='flow_nur_handpflege_belegt';
      else if(teil==='memo_deckel_fest'||teil==='smart_light_modul') status='dieses_teil_nicht_spuelmaschinengeeignet';
      else if(teil==='glas_dichtungsring') status=modell==='handbuch_bestaetigte_kanne'?'ring_handpflege_empfohlen':'glasring_und_modell_zuordnen';
      else if(teil==='style_eco_deckel'&&modell!=='style_eco_1055714') status='style_eco_deckel_und_modell_zuordnen';
      else if(teil==='style_eco_deckel'&&!led_separiert_bestaetigt) status='led_separat_bestaetigen';
      else if(teil==='style_eco_deckel') status='style_eco_deckel_nach_led_trennung_dokumentiert';
      else status=spueltemperatur_c===0?'spueltemperatur_belegen':spueltemperatur_c>50?'ueber_50c_handbuchangabe':'bis_50c_fuer_kanne_und_trichter_dokumentiert';
      return {status,quellen:[manual,handbuchDownload,...(modell==='style_eco_1055714'?[eco]:modell==='flow'?[flow]:[])],
        grenze:'Die 50-°C-Angabe aus der Anleitung bezieht sich auf Kanne und Trichter, nicht automatisch auf jeden Deckel oder jedes Teil.'};
    },{modell:'style_eco_1055714',teil:'style_eco_deckel',spueltemperatur_c:50,led_separiert_bestaetigt:false},
    {status:'led_separat_bestaetigen'}),

  tool('brita_smart_light_blinken_nach_reset_oder_status',
    'Dreimaliges grünes Startsignal von einer späteren Smart-Light-Statusanzeige unterscheiden — Interpret the recorded LED in its event context.',
    {smart_light_identifiziert:yes('Ist es eindeutig das BRITA Smart Light der passenden Kannenanleitung?'),
      ereignis:choice('Dokumentierter Zeitpunkt des sichtbaren Signals.','unmittelbar_nach_reset','separate_statusablesung','offen'),
      farbe:choice('Tatsächlich beobachtete Farbe.','gruen','gelb','rot','offen'),dreimal_gruen_bestaetigt:yes('Waren nach dem Reset erkennbar genau drei grüne Blinksignale zu sehen?')},
    ({smart_light_identifiziert,ereignis,farbe,dreimal_gruen_bestaetigt})=>({
      bedeutung:!smart_light_identifiziert||ereignis==='offen'||farbe==='offen'?'signalzusammenhang_klaeren':ereignis==='unmittelbar_nach_reset'
        ?farbe==='gruen'&&dreimal_gruen_bestaetigt?'bestaetigung_des_reset_signals':'resetanzeige_mit_anleitung_abgleichen'
        :farbe==='rot'?'kartuschenwechsel_hinweis':farbe==='gelb'?'baldiger_wechsel_hinweis':'gruener_status_hinweis',
      quelle:manual,handbuch_download:handbuchDownload,grenze:'Ein Reset oder eine Farbe belegt weder einen Kartuschenwechsel noch Wasserqualität oder eine verbleibende Literzahl.'}),
    {smart_light_identifiziert:true,ereignis:'unmittelbar_nach_reset',farbe:'gruen',dreimal_gruen_bestaetigt:true},
    {bedeutung:'bestaetigung_des_reset_signals'}),

  tool('brita_anzeigedeckel_getauscht_nutzungszaehler_zuordnung',
    'Nach Tausch zweier Kannen-Deckel prüfen, ob eine Anzeige noch der richtigen Kartusche zugeordnet ist — Keep paired indicator history separate from vessel identity.',
    {beide_kannen_identifiziert:yes('Sind zwei einzelne Kannen, Kartuschen und Anzeigedeckel im Protokoll eindeutig bezeichnet?'),
      deckelwechsel:choice('Beobachtete Übergabe des Deckels.','kein_wechsel','getauscht','offen'),
      kartusche_mit_deckel:proof('Gehört die aktuelle Kartusche anhand des dokumentierten Verlaufs genau zu dem mitgewechselten oder vorhandenen Deckel?'),
      neuansatz_bestaetigt:yes('Ist belegt, dass die aktuelle Anzeige erst bei der ersten Nutzung dieser konkreten neuen Kartusche angesetzt wurde?')},
    ({beide_kannen_identifiziert,deckelwechsel,kartusche_mit_deckel,neuansatz_bestaetigt})=>({
      anzeige_zuordenbar:!beide_kannen_identifiziert||deckelwechsel==='offen'?null:neuansatz_bestaetigt||kartusche_mit_deckel==='bestaetigt'?true:kartusche_mit_deckel==='abweichend'?false:null,
      grund:!beide_kannen_identifiziert||deckelwechsel==='offen'?'kanne_und_deckel_zuordnen':neuansatz_bestaetigt?'dokumentierter_neuansatz':kartusche_mit_deckel==='bestaetigt'?'kartuschenverlauf_zugeordnet':'separates_kartuschenprotokoll_pruefen',
      quelle:manual,handbuch_download:handbuchDownload,grenze:'Zeit-/Mengensignale folgen dem dokumentierten Start am Anzeigedeckel. Keine Laufzeit schätzen, wenn die Paarung nicht mehr nachvollziehbar ist.'}),
    {beide_kannen_identifiziert:true,deckelwechsel:'getauscht',kartusche_mit_deckel:'abweichend',neuansatz_bestaetigt:false},
    {anzeige_zuordenbar:false,grund:'separates_kartuschenprotokoll_pruefen'}),

  tool('brita_filterkanne_laengere_pause_zustand_protokoll',
    'Bei längerer Nichtnutzung getrennt nachhalten, ob Kanne und Kartusche im beschriebenen Pausenzustand waren — Check the observed break state with the manual’s pause instructions.',
    {maxtra_kanne_handbuch_geprueft:yes('Ist das betrachtete Kannenmodell von der MAXTRA PRO Kannenanleitung erfasst?'),
      pause_als_laenger_eingeordnet:yes('Wurde die tatsächliche Pause als längere Nichtnutzung nach der eigenen Anleitung eingeordnet?'),
      kanne_leer:proof('Zustand der Kanne während der Pause.'),kartusche_lose_im_leeren_trichter:proof('Beobachtung, ob sie nicht eingerastet, sondern lose im leeren Trichter lag.'),
      datum_seit_erster_nutzung_verfolgbar:yes('Ist die Kalenderhistorie seit Erstnutzung gesondert erhalten?')},
    ({maxtra_kanne_handbuch_geprueft,pause_als_laenger_eingeordnet,kanne_leer,kartusche_lose_im_leeren_trichter,datum_seit_erster_nutzung_verfolgbar})=>({
      fuer_pausenabgleich_offen:!maxtra_kanne_handbuch_geprueft||!pause_als_laenger_eingeordnet?null:[kanne_leer==='bestaetigt'?null:'leerung',kartusche_lose_im_leeren_trichter==='bestaetigt'?null:'kartuschenablage'].filter(Boolean),
      wechselhistorie_separat_pruefen:!datum_seit_erster_nutzung_verfolgbar,quelle:manual,handbuch_download:handbuchDownload,
      grenze:'Die Anleitung nennt den Pausenzustand und verweist auf den Kartuschenwechsel. Sie gibt hier keine Zahl von Pausentagen an. Eine Pause setzt kein Gebrauchsdatum zurück.'}),
    {maxtra_kanne_handbuch_geprueft:true,pause_als_laenger_eingeordnet:true,kanne_leer:'bestaetigt',kartusche_lose_im_leeren_trichter:'offen',datum_seit_erster_nutzung_verfolgbar:false},
    {fuer_pausenabgleich_offen:['kartuschenablage'],wechselhistorie_separat_pruefen:true}),

  tool('brita_filterwasser_nachgiessen_erste_menge_zeitbezug',
    'Beim Nachgießen die älteste verbliebene gefilterte Menge im Zeitprotokoll sichtbar halten — Track the oldest remaining batch instead of treating a top-up as a fresh start.',
    {handbuch_passt_zur_kanne:yes('Ist die verlinkte MAXTRA PRO Kannenanleitung anwendbar?'),
      art:choice('Was passierte vor dem letzten Nachgießen?','leer_bestaetigt','alte_menge_verblieb','offen'),
      aelteste_menge_belegt:yes('Ist der Zeitstempel der ältesten vorhandenen gefilterten Menge verlässlich?'),
      stunden_aelteste:hours('Seit Zeitstempel der ältesten noch enthaltenen Menge, 0 wenn unbekannt.'),
      stunden_neueste:hours('Seit der bestätigten neuesten Filtration in Stunden.'),
      kuehl_dokumentiert:yes('Ist die in der Anleitung genannte kühle Lagerung für den gesamten Zeitraum belegt?')},
    ({handbuch_passt_zur_kanne,art,aelteste_menge_belegt,stunden_aelteste,stunden_neueste,kuehl_dokumentiert})=>{
      if(art==='alte_menge_verblieb'&&aelteste_menge_belegt&&stunden_aelteste<stunden_neueste) throw new RangeError('Zeitreihenfolge der Mengen');
      const basis=art==='leer_bestaetigt'?stunden_neueste:art==='alte_menge_verblieb'&&aelteste_menge_belegt?stunden_aelteste:null;
      return {aelteste_belegte_stunden:handbuch_passt_zur_kanne?basis:null,
        handbuchszeit_erreicht:handbuch_passt_zur_kanne&&basis!==null?basis>=24:null,
        kuehle_lagerung_dokumentiert:kuehl_dokumentiert,quelle:manual,handbuch_download:handbuchDownload,
        grenze:'Die Anleitung nennt kühle Lagerung und Verwendung innerhalb von 24 Stunden. Diese Dokumentation bestätigt weder die Wasserqualität noch eine Freigabe.'};
    },{handbuch_passt_zur_kanne:true,art:'alte_menge_verblieb',aelteste_menge_belegt:true,stunden_aelteste:26,stunden_neueste:3,kuehl_dokumentiert:true},
    {aelteste_belegte_stunden:26,handbuchszeit_erreicht:true,kuehle_lagerung_dokumentiert:true}),

  tool('brita_flow_style_gesamtvolumen_vorrat_trennen',
    'Gefilterte Nennkapazität vom Gesamtvolumen zweier genau dokumentierter BRITA Kannen unterscheiden — Flag purchases based on gross rather than filtered capacity.',
    {kanne:choice('Exaktes deutsches Produkt.','style_essential_1058146','flow','andere_oder_offen'),
      gleichzeitig_benoetigt_l:litre('Eigener Bedarf an gefilterter Menge ohne Nachfüllen, in Litern.'),
      anzeige_bewirbt_gesamt:yes('Wurde im Angebot nur das Gesamtvolumen als Fassungsvermögen hervorgehoben?')},
    ({kanne,gleichzeitig_benoetigt_l,anzeige_bewirbt_gesamt})=>{
      const specs={style_essential_1058146:[2.4,1.4,essential],flow:[8.2,5.2,flow]}[kanne];
      return {dokumentiertes_volumen_gesamt_gefiltert_l:specs?specs.slice(0,2):null,
        bedarf_ueber_gefiltertem_nennwert:specs?gleichzeitig_benoetigt_l>specs[1]:null,
        nettoanforderung_im_gesamtwert_verdeckt:specs?anzeige_bewirbt_gesamt&&gleichzeitig_benoetigt_l<=specs[0]&&gleichzeitig_benoetigt_l>specs[1]:null,
        quelle:specs?.[2]??null,grenze:'Der gefilterte Nennwert und das Gesamtvolumen sind unterschiedliche Angaben. Kein tatsächlicher Füllstand.'};
    },{kanne:'style_essential_1058146',gleichzeitig_benoetigt_l:1.8,anzeige_bewirbt_gesamt:true},
    {dokumentiertes_volumen_gesamt_gefiltert_l:[2.4,1.4],bedarf_ueber_gefiltertem_nennwert:true,nettoanforderung_im_gesamtwert_verdeckt:true}),

  tool('brita_maxtra_pro_tropfenquelle_vor_wirkungsannahme',
    'Bei stockendem Durchfluss Originalkartusche, Sitz und ersten Vorbereitungsbeleg getrennt prüfen — Triage missing flow documentation before attributing a filter defect.',
    {genaue_kartuschenkanne_belegt:yes('Ist es tatsächlich die betrachtete BRITA MAXTRA PRO Kannen-Kombination?'),
      beobachtung:choice('Eigener beobachteter Durchfluss.','kein_abfluss','nur_tropfen','normal','offen'),
      originalteil:proof('Ist die originale MAXTRA PRO Kartusche als tatsächliches Exemplar bestätigt?'),
      sitz_nach_anleitung:proof('Dokumentierter Zustand des Sitzes laut Modellanleitung.'),vorbereitet_nach_anleitung:proof('Dokumentierte Vorbereitung nach der passenden Anleitung.')},
    ({genaue_kartuschenkanne_belegt,beobachtung,originalteil,sitz_nach_anleitung,vorbereitet_nach_anleitung})=>({
      abgleichen:!genaue_kartuschenkanne_belegt?['kanne_und_kartusche']:beobachtung==='offen'?['beobachtung']:beobachtung==='normal'?[]:[['originalteil',originalteil],['sitz',sitz_nach_anleitung],['vorbereitung',vorbereitet_nach_anleitung]].filter(([,state])=>state!=='bestaetigt').map(([name])=>name),
      trotz_bestaetigter_schritte_offen:genaue_kartuschenkanne_belegt&&(beobachtung==='nur_tropfen'||beobachtung==='kein_abfluss')&&[originalteil,sitz_nach_anleitung,vorbereitet_nach_anleitung].every(state=>state==='bestaetigt'),
      quelle:faq,grenze:'Vorliegende Anzeichen nach Hersteller-FAQ einordnen. Kein Durchflussnachweis ist eine Prüfung der Filterwirkung.'}),
    {genaue_kartuschenkanne_belegt:true,beobachtung:'nur_tropfen',originalteil:'bestaetigt',sitz_nach_anleitung:'offen',vorbereitet_nach_anleitung:'abweichend'},
    {abgleichen:['sitz','vorbereitung'],trotz_bestaetigter_schritte_offen:false}),

  tool('brita_maxtra_pro_karton_folie_feuchtebeobachtung',
    'Sichtbare Feuchte in intakter Schutzfolie von einem unklaren äußeren oder geöffneten Paketbefund unterscheiden — Route observations about a new cartridge without judging suitability.',
    {exakte_pro_originalkartusche:yes('Ist die neue originale MAXTRA PRO Kartusche mit intakter Produkthistorie abgelesen?'),
      folie:choice('Beobachteter Zustand der Originalschutzfolie.','versiegelt','geoeffnet_oder_beschaedigt','offen'),
      feuchteort:choice('Wo befindet sich der sichtbare Befund?','innerhalb_der_folie','aussen_oder_karton','keine','offen')},
    ({exakte_pro_originalkartusche,folie,feuchteort})=>({
      einordnung:!exakte_pro_originalkartusche||folie==='offen'||feuchteort==='offen'?'produkt_und_beobachtung_zuordnen':folie!=='versiegelt'||feuchteort==='aussen_oder_karton'?'verpackungszustand_abklaeren':feuchteort==='innerhalb_der_folie'?'hersteller_nennt_moegliche_kondensation':'kein_sichtbarer_feuchtebefund',
      quelle:manual,handbuch_download:handbuchDownload,grenze:'Die Anleitung nennt mögliche Kondensation nach Herstellungsbehandlung in der Folie. Das erklärt keinen ungeklärten Einzelfall und bewertet keine Verwendbarkeit.'}),
    {exakte_pro_originalkartusche:true,folie:'versiegelt',feuchteort:'innerhalb_der_folie'},
    {einordnung:'hersteller_nennt_moegliche_kondensation'}),

  tool('brita_microdisc_haertezweck_vs_maxtra_kanne',
    'Einen belegten MicroDisc für Kaltgetränke vom beschriebenen Kalkzweck einer MAXTRA PRO Kanne unterscheiden — Match an existing filter to its documented purpose.',
    {filtertyp:choice('Tatsächlich identifizierter Filter.','brita_microdisc','brita_maxtra_pro','offen_oder_anderer'),
      bedarf:choice('Eigener Zweck.','kaltgetraenk','haertevergleich_fuer_heissgetraenk','kein_filterbedarf'),
      geraetepaar_bestaetigt:yes('Ist die Filter-Aufnahme für das genaue System belegt?'),heissgeraet_angabe_bekannt:yes('Ist der separate Wasserhinweis des konkret verwendeten Wasserkochers oder Kaffeeautomaten bekannt?')},
    ({filtertyp,bedarf,geraetepaar_bestaetigt,heissgeraet_angabe_bekannt})=>({
      vergleichsweg:bedarf==='kein_filterbedarf'?'vorhandenes_leitungswasser_ohne_zubehoerkauf':!geraetepaar_bestaetigt||filtertyp==='offen_oder_anderer'?'system_und_filter_zuordnen'
        :bedarf==='haertevergleich_fuer_heissgetraenk'&&filtertyp==='brita_microdisc'?'microdisc_haertezweck_nicht_belegt'
        :bedarf==='haertevergleich_fuer_heissgetraenk'&&!heissgeraet_angabe_bekannt?'separate_geraeteanleitung_lesen':'dokumentierten_anwendungszweck_vergleichen',
      quelle:jugs,grenze:'Laut BRITA verändert MicroDisc die Wasserhärte nicht. Eine Kannenbeschreibung ersetzt keine Anforderungen des nachgeschalteten Geräts.'}),
    {filtertyp:'brita_microdisc',bedarf:'haertevergleich_fuer_heissgetraenk',geraetepaar_bestaetigt:true,heissgeraet_angabe_bekannt:false},
    {vergleichsweg:'microdisc_haertezweck_nicht_belegt'}),

  tool('brita_maxtra_kanne_eingangswasser_quellenrahmen',
    'Eine gefüllte Kanne anhand der tatsächlich bestätigten Eingangswasserart dem Handbuch zuordnen — Check documented feed-water scope without evaluating quality.',
    {kanne_mit_verlinkter_anleitung:yes('Ist die genaue MAXTRA PRO Kannenanleitung für diese Kombination bestätigt?'),
      ursprung:choice('Tatsächliche Herkunft dieser einzelnen Füllung.','oeffentliches_leitungswasser','eigene_oder_andere_quelle','mischung','offen'),
      temperaturhinweis:choice('Zustand beim Befüllen.','kalt','vorgewaermt','offen'),beleg_von_befuellung:yes('Sind die Angaben für diese Befüllung und nicht nur die Küche insgesamt bekannt?')},
    ({kanne_mit_verlinkter_anleitung,ursprung,temperaturhinweis,beleg_von_befuellung})=>({
      eingang_laut_diesem_handbuch:!kanne_mit_verlinkter_anleitung||!beleg_von_befuellung||ursprung==='offen'||temperaturhinweis==='offen'?null:ursprung==='oeffentliches_leitungswasser'&&temperaturhinweis==='kalt',
      quelle:manual,handbuch_download:handbuchDownload,grenze:'Die konkrete Kannenanleitung nennt kaltes Leitungswasser aus dem öffentlichen Netz. Der Abgleich bewertet weder Wasserqualität noch geeignete Aufbereitung anderer Quellen.'}),
    {kanne_mit_verlinkter_anleitung:true,ursprung:'oeffentliches_leitungswasser',temperaturhinweis:'vorgewaermt',beleg_von_befuellung:true},
    {eingang_laut_diesem_handbuch:false}),

  tool('brita_kanne_nach_amtlicher_aufhebung_belegtrennung',
    'Nach ausdrücklich aufgehobener amtlicher Vorgabe die zwei Nachweise aus dem Kannenhandbuch erfassen — Record upkeep after a verified lifting of an official notice.',
    {kanne_erfasst:yes('Ist das MAXTRA PRO Kannenhandbuch dem vorhandenen Gerät sicher zugeordnet?'),
      behoerdenstand:choice('Amtlich bekannter Stand derselben Versorgung.','vorgabe_aktiv','aufhebung_bestaetigt','offen'),
      kannenreinigung_nach_aufhebung:proof('Ist die Kannenreinigung nach Aufhebung dokumentiert?'),neue_kartusche_nach_aufhebung:proof('Ist tatsächlich eine neue Kartusche nach Aufhebung dokumentiert?')},
    ({kanne_erfasst,behoerdenstand,kannenreinigung_nach_aufhebung,neue_kartusche_nach_aufhebung})=>({
      status:behoerdenstand==='vorgabe_aktiv'?'amtliche_vorgabe_beachten':behoerdenstand==='offen'?'behoerdenstand_offen':!kanne_erfasst?'kannenanleitung_zuordnen':'handbuch_nachweise_nach_aufhebung_abgleichen',
      nicht_bestaetigte_punkte:kanne_erfasst&&behoerdenstand==='aufhebung_bestaetigt'?[kannenreinigung_nach_aufhebung==='bestaetigt'?null:'kannenreinigung',neue_kartusche_nach_aufhebung==='bestaetigt'?null:'neue_kartusche'].filter(Boolean):null,
      quelle:manual,handbuch_download:handbuchDownload,grenze:'Amtliche Vorgaben gelten unabhängig von der Kanne. Erfasst nur Herstellerhinweise nach amtlicher Aufhebung. Keine Beurteilung der Wasserqualität.'}),
    {kanne_erfasst:true,behoerdenstand:'aufhebung_bestaetigt',kannenreinigung_nach_aufhebung:'bestaetigt',neue_kartusche_nach_aufhebung:'offen'},
    {status:'handbuch_nachweise_nach_aufhebung_abgleichen',nicht_bestaetigte_punkte:['neue_kartusche']}),

  tool('brita_flow_fester_standort_nachfuellen_und_zapfen',
    'Bei BRITA Flow ruhende Stationsmaße und praktischen Zugang zu Schiebedeckel und Zapfhahn getrennt prüfen — Identify access limits when the station body fits.',
    {flow_1061561_belegt:yes('Ist die BRITA Flow Artikelnummer 1061561 bestätigt?'),
      lichte_stellbreite_mm:number('Freie Breite in dokumentierter Ausrichtung, in mm.',1,3000),
      lichte_stellhoehe_mm:number('Freie Höhe des ruhenden Geräts, in mm.',1,3000),lichte_stelltiefe_mm:number('Freie Tiefe in mm.',1,3000),
      deckelweg_beobachtet:proof('Sind Schiebedeckel und Nachfüllen in dieser Stellung zugänglich?'),zapfen_beobachtet:proof('Ist der Zapfhahn mit eigenem Gefäß in der vorgesehenen Stellung zugänglich?')},
    ({flow_1061561_belegt,lichte_stellbreite_mm,lichte_stellhoehe_mm,lichte_stelltiefe_mm,deckelweg_beobachtet,zapfen_beobachtet})=>({
      statische_massdifferenz_b_h_t_mm:flow_1061561_belegt?[lichte_stellbreite_mm-304,lichte_stellhoehe_mm-220,lichte_stelltiefe_mm-214].map(round):null,
      eigene_handgriffe_ohne_beleg:flow_1061561_belegt?[deckelweg_beobachtet==='bestaetigt'?null:'nachfuellen',zapfen_beobachtet==='bestaetigt'?null:'zapfen'].filter(Boolean):null,
      quelle:flow,grenze:'Äußere Herstellermaße 304 × 220 × 214 mm in B × H × T. Statische Maße belegen weder Handhabung noch Auflage oder Gewicht.'}),
    {flow_1061561_belegt:true,lichte_stellbreite_mm:330,lichte_stellhoehe_mm:230,lichte_stelltiefe_mm:240,deckelweg_beobachtet:'abweichend',zapfen_beobachtet:'bestaetigt'},
    {statische_massdifferenz_b_h_t_mm:[26,10,26],eigene_handgriffe_ohne_beleg:['nachfuellen']}),

  tool('brita_maxtra_pro_rueckgabe_uebergabe_quittung',
    'Bei der Kartuschenrückgabe Zusage und tatsächliche Übergabe getrennt halten — Track confirmed recycling handoff without inventing acceptance.',
    {originale_pro_geprueft:yes('Sind die gezählten gebrauchten Einheiten als BRITA MAXTRA PRO bestätigt?'),
      gesammelte_einheiten:count('Eindeutig identifizierte gebrauchte Einheiten im betrachteten Vorgang.'),
      abgabepunkt_aktuell_bestaetigt:yes('Ist ein tatsächlich akzeptierender deutscher Abgabepunkt oder Rücksendeweg bestätigt?'),
      quittierte_einheiten:count('Tatsächlich als übergeben quittierte Einheiten.'),einheiten_beim_haushalt:count('Separat nachweislich weiterhin zu Hause erfasste Einheiten.')},
    ({originale_pro_geprueft,gesammelte_einheiten,abgabepunkt_aktuell_bestaetigt,quittierte_einheiten,einheiten_beim_haushalt})=>{
      whole(gesammelte_einheiten,quittierte_einheiten,einheiten_beim_haushalt);
      if(quittierte_einheiten+einheiten_beim_haushalt>gesammelte_einheiten) throw new RangeError('Getrennte Mengen zählen');
      return {tatsaechlich_uebergeben:originale_pro_geprueft?quittierte_einheiten:null,verbleib_offen:originale_pro_geprueft?gesammelte_einheiten-quittierte_einheiten-einheiten_beim_haushalt:null,
        rueckgabeweg_fuer_rest_einheiten_klaeren:originale_pro_geprueft&&einheiten_beim_haushalt>0&&!abgabepunkt_aktuell_bestaetigt,
        quelle:'https://www.brita.de/recycling',grenze:'Die Programme eignen sich zur Orientierung. Örtliche Annahme und Verarbeitung der konkreten Kartusche bleiben getrennte Nachweise.'};},
    {originale_pro_geprueft:true,gesammelte_einheiten:7,abgabepunkt_aktuell_bestaetigt:false,quittierte_einheiten:3,einheiten_beim_haushalt:2},
    {tatsaechlich_uebergeben:3,verbleib_offen:2,rueckgabeweg_fuer_rest_einheiten_klaeren:true}),

  tool('brita_kannenprotokoll_trichter_oben_vorrat_unten',
    'Beim tatsächlichen Ablesen eines Kannenbestands noch sichtbare Trichtermenge gesondert halten — Distinguish pending top-chamber volume from filtered reserve.',
    {kanne_und_kammern_zugeordnet:yes('Sind Trichter und untere Vorratskammer der genauen Kanne getrennt identifiziert?'),
      oben_gemessen_l:litre('Beobachtete Menge, die bei der Ablesung noch oben stand.'),unten_gemessen_l:litre('Gleichzeitig abgelesener unterer Bestand.'),
      entnahme_aus_vorrat_belegt:yes('Ist die untere Kammer der geplanten Entnahme eindeutig zugeordnet?'),benoetigt_l:litre('Eigener gewünschter gefilterter Bestand zu diesem Zeitpunkt.')},
    ({kanne_und_kammern_zugeordnet,oben_gemessen_l,unten_gemessen_l,entnahme_aus_vorrat_belegt,benoetigt_l})=>({
      beobachtete_menge_je_kammer_l:kanne_und_kammern_zugeordnet?[oben_gemessen_l,unten_gemessen_l]:null,
      fehlender_beobachteter_vorrat_l:kanne_und_kammern_zugeordnet&&entnahme_aus_vorrat_belegt?round(Math.max(0,benoetigt_l-unten_gemessen_l)):null,
      quelle:manual,handbuch_download:handbuchDownload,grenze:'Trichterwasser separat lesen. Keinen späteren Endbestand oder eine Qualität aus dieser Momentaufnahme schätzen.'}),
    {kanne_und_kammern_zugeordnet:true,oben_gemessen_l:0.48,unten_gemessen_l:0.7,entnahme_aus_vorrat_belegt:true,benoetigt_l:1},
    {beobachtete_menge_je_kammer_l:[0.48,0.7],fehlender_beobachteter_vorrat_l:0.3}),

  tool('brita_maxtra_mengenjournal_mit_zwischenstand_wechsel',
    'Dieselbe MAXTRA Kartusche beim Wechsel in eine andere Kanne bis zum tatsächlichen Ersatz den eigenen Litern zuordnen — Keep the same cartridge total through a jug move and stop at the next cartridge.',
    {kartuschen_identitaet_belegt:yes('Ist dasselbe konkrete Exemplar bis zur ausdrücklich dokumentierten Ersetzung nachvollziehbar?'),
      alte_kanne_l:litre('Vollständig gemessene Menge mit der ursprünglichen Kanne.'),neue_kanne_davor_l:litre('Vollständig gemessene Menge mit der neuen Kanne vor dem tatsächlichen Kartuschenwechsel.'),
      neue_kanne_danach_l:litre('Separat vollständig gemessene Menge der Ersatzkartusche.'),wechsel_luecke_offen:yes('Sind zusätzlich Durchläufe im Wechselintervall ohne gesicherte Zuordnung bekannt?')},
    ({kartuschen_identitaet_belegt,alte_kanne_l,neue_kanne_davor_l,neue_kanne_danach_l,wechsel_luecke_offen})=>({
      belegte_alte_kartusche_l:kartuschen_identitaet_belegt?round(alte_kanne_l+neue_kanne_davor_l):null,
      separate_ersatzkartusche_l:kartuschen_identitaet_belegt?neue_kanne_danach_l:null,
      unverteiltes_wechselintervall:wechsel_luecke_offen,quelle:manual,handbuch_download:handbuchDownload,
      grenze:'Erfasst nur belegte Durchläufe derselben Kartusche. Offene Zeiten nicht schätzen. Ein Kannenwechsel startet keine neue Kartuschenfrist.'}),
    {kartuschen_identitaet_belegt:true,alte_kanne_l:42,neue_kanne_davor_l:31,neue_kanne_danach_l:6,wechsel_luecke_offen:true},
    {belegte_alte_kartusche_l:73,separate_ersatzkartusche_l:6,unverteiltes_wechselintervall:true}),
];
