const page = '/produkte.html';
const checked = '2026-11-20';
const delonghi = 'ECAM22.110.B';
const lattego = 'EP2231/40';
const classic = 'EP2220/10';
const bosch = 'TIE20301';
const deManual = 'https://dls.delonghigroup.com/files/docs/5/DE-57132C9061.pdf';
const deSupport = 'https://www.delonghi.com/de-de/s/ECAM22.110.B';
const deFilterDesign = 'https://www.delonghi.com/de-de/faqs/DELONGHI/a/585643';
const deDescale = 'https://www.delonghi.com/de-de/faqs/Entkalkung-der-Magnfica-S-ECAM22.110/a/576854';
const pLatteSupport = 'https://acc.philips.de/c-p/EP2231_40/series-2200-kaffeevollautomat/support';
const pClassicSupport = 'https://acc.philips.de/c-p/EP2220_10/series-2200-kaffeevollautomat/support';
const pLatteSheet = 'https://www.download.p4c.philips.com/files/e/ep2231_40/ep2231_40_pss_deuat.pdf';
const pClassicSheet = 'https://www.documents.philips.com/assets/20210904/3ea44c9845d84f26818ead990053f95e.pdf';
const pOil = 'https://acc.philips.de/c-f/XC000014495/wie-verwende-ich-die-philips-kaffeefettl%C3%B6ser-tabletten';
const pGrounds = 'https://acc.philips.de/c-t/XC000015554/auf-der-philips-espressomaschine-wird-die-meldung-kaffeesatzbeh%C3%A4lter-leeren-empty-ground-container-angezeigt-obwohl-der-kaffeesatzbeh%C3%A4lter-leer-ist';
const pRinseWater = 'https://acc.philips.de/c-t/XC000004110/meine-philips-espressomaschine-ist-undicht';
const bSheet = 'https://media3.bsh-group.com/Documents/specsheet/de-DE/TIE20301.pdf';
const supported = [delonghi,lattego,classic,bosch];
const pSupport = {[lattego]:pLatteSupport,[classic]:pClassicSupport};
const productSheets = {[lattego]:pLatteSheet,[classic]:pClassicSheet,[bosch]:bSheet,[delonghi]:deSupport};
const knownPhilips = modell => modell===lattego || modell===classic;
const flag = description => ({type:'boolean',description});
const choice = (description, ...values) => ({type:'string',description,enum:values});
const number = (description, minimum, maximum) => ({type:'number',description,minimum,maximum});
const count = (description, maximum) => number(description,0,maximum);
function checkWhole(value) {
  if (!Number.isInteger(value)) throw new RangeError('Ganze Monate oder Stückzahlen angeben.');
}
const match = description => choice(description,'belegt','ausgeschlossen','offen');
const model = (description, ...models) => choice(description,...models,'anderes_modell','offen');
const modelChoice = description => model(description,...supported);
const philipsChoice = description => model(description,lattego,classic);
const evidence = (quelle, fundstelle) => ({quelle,fundstelle,geprueft_am:checked});
const pEvidence = (modell,abschnitt) => knownPhilips(modell)?evidence(pSupport[modell],`Deutsches Benutzerhandbuch im Umfang der Modellseite, ${abschnitt}`):null;
const scoped = (tested, answer) => tested?answer:null;
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const kaffeePflegebelege = [
  tool('delonghi_dlsc002_filter_variante_aussehen_ersatzkauf',
    'Prüft, ob ein optisch anderer mitgelieferter De’Longhi-DLSC002-Filter für die Magnifica S schon anhand des Aussehens ersetzt werden muss — Check a documented De’Longhi filter design difference before buying another filter.',
    {modell:model('Exakte deutsche Bezeichnung am Gerät oder Angebot.',delonghi),
      filterzuordnung:match('Lieferbeleg oder Hersteller bestätigt den vorhandenen Originalfilter ausdrücklich für das konkrete Gerät.'),
      nur_aussehen_abweichend:flag('Einzig belegte Abweichung betrifft die Optik. Kein Hinweis auf Schaden, Verbrauch oder abweichende Modellkennung.')},
    ({modell,filterzuordnung,nur_aussehen_abweichend})=>({
      dlsc002_im_modellzubehoer:scoped(modell===delonghi,true),
      kaufgrund_aus_optik:modell===delonghi&&filterzuordnung==='belegt'&&nur_aussehen_abweichend?'optik_allein_kein_nachkaufgrund':'kennung_und_zustand_pruefen',
      beleg:scoped(modell===delonghi,[evidence(deSupport,'Zubehör DLSC002 zur ECAM22.110.B'),evidence(deFilterDesign,'Aussehen von beigelegtem und separat angebotenem Originalfilter')]),
      hinweis:'Ähnlicher Umriss belegt keine Passung. Den Zustand und den Wechseltermin weiterhin am vorhandenen Filter prüfen.'}),
    {modell:delonghi,filterzuordnung:'belegt',nur_aussehen_abweichend:true},
    {dlsc002_im_modellzubehoer:true,kaufgrund_aus_optik:'optik_allein_kein_nachkaufgrund'}),

  tool('kaffeevollautomat_wasserfilter_lieferumfang_start_ohne_nachkauf',
    'Gleicht beim Kaffeevollautomaten einen aufgeführten oder optionalen Wasserfilter mit dem tatsächlichen Lieferumfang ab — Distinguish catalogued, optional and delivered water filters before an initial purchase.',
    {modell:modelChoice('Genaue Modellkennung laut Angebot für Deutschland.'),
      filter_im_karton:match('Vorhandener, dem Modell zugeordneter und nutzbarer Filter wurde im konkreten Paket belegt oder ausgeschlossen.'),
      filterwunsch:choice('Wird absichtlich ein Filterbetrieb gewünscht?', 'ja','nein','offen')},
    ({modell,filter_im_karton,filterwunsch})=>{
      const listed=knownPhilips(modell)?'im_herstellerpaket_aufgefuehrt':modell===bosch?'als_sonderzubehoer_aufgefuehrt':modell===delonghi?'lieferumfang_des_exemplars_pruefen':null;
      const kauf=filterwunsch==='nein'?'kein_filterkauf_fuer_diesen_wunsch':filterwunsch==='offen'?'filterwunsch_klaeren':filter_im_karton==='belegt'?'vorhandenen_filter_pruefen':!listed||filter_im_karton==='offen'?'zuordnung_und_lieferung_klaeren':'nur_passenden_filter_fuer_den_gewuenschten_betrieb_pruefen';
      return {herstellerangabe:listed,konkreter_lieferbeleg:filter_im_karton,entscheidungsstand:kauf,
        beleg:listed?evidence(productSheets[modell],'Lieferumfang oder Sonderzubehör für Deutschland'):null,
        hinweis:'Angebot für Gebrauchtware, Rückläufer oder Händlerbundles anhand des konkreten Lieferumfangs prüfen. Modellunterlagen helfen bei der optionalen Filterwahl.'};
    },{modell:lattego,filter_im_karton:'offen',filterwunsch:'ja'},
    {herstellerangabe:'im_herstellerpaket_aufgefuehrt',entscheidungsstand:'zuordnung_und_lieferung_klaeren'}),

  tool('kaffeevollautomat_intenza_aquaclean_filterfamilie_modellpruefung',
    'Vergleicht BRITA Intenza und Philips AquaClean anhand der genauen Kaffeemaschine und Zubehörkennung — Match the candidate coffee filter family to the exact German model.',
    {modell:modelChoice('Vollständige Modellkennung aus den Unterlagen des deutschen Geräts.'),
      filter:choice('Konkret belegte Kennung oder Familie des angebotenen Filters.','TCZ7003','TCZ7033','AquaClean','DLSC002','andere_kennung','offen')},
    ({modell,filter})=>{
      const allowed=knownPhilips(modell)?['AquaClean']:modell===bosch?['TCZ7003','TCZ7033']:modell===delonghi?['DLSC002']:null;
      const status=!allowed||filter==='offen'?'zuordnung_offen':allowed.includes(filter)?'in_unterlagen_belegt':knownPhilips(modell)&&(filter==='TCZ7003'||filter==='TCZ7033')?'brita_fuer_dieses_geraet_ausgeschlossen':'durch_gelesene_quellen_nicht_belegt';
      return {ausgewiesene_kennung_oder_familie:allowed,angebotszuordnung:status,
        beleg:knownPhilips(modell)?[evidence(productSheets[modell],'Filterkompatibilität'),pEvidence(modell,'S. 82, Bestellen von Zubehör')]:allowed?evidence(productSheets[modell],'Wasserfilter als Modellzubehör'):null,
        hinweis:'Bei einem unbekannten Modell, gekürztem Suffix oder einer nicht dokumentierten Kennung vor dem Kauf die Herstellerzuordnung klären.'};
    },{modell:lattego,filter:'TCZ7003'},
    {ausgewiesene_kennung_oder_familie:['AquaClean'],angebotszuordnung:'brita_fuer_dieses_geraet_ausgeschlossen'}),

  tool('delonghi_magnifica_filter_stillstand_drei_wochen',
    'Prüft für den noch eingesetzten Magnifica-S-Filter die drei Wochen Stillstand gegenüber zwei Monaten bei normaler Nutzung — Check the separate installed-filter limits for idle and ordinary use.',
    {modell:model('Genau bezeichnetes deutsches Gerät.',delonghi),
      filter_eingesetzt:match('Der bekannte Filter war im jeweiligen Abschnitt durchgehend eingebaut.'),
      nutzungsart:choice('Belegter Abschnitt für diesen Filter.','normale_nutzung','nicht_betrieben','offen'),
      tage_stillstand:number('Durchgehende dokumentierte Zeit ohne Betrieb mit eingesetztem Filter in Tagen.',0,2000),
      kalendermonate_voll:count('Vollendete Kalendermonate seit Einsetzen bei normalem Betrieb.',60)},
    ({modell,filter_eingesetzt,nutzungsart,tage_stillstand,kalendermonate_voll})=>{
      checkWhole(kalendermonate_voll);
      const readable=modell===delonghi&&filter_eingesetzt==='belegt';
      return {grenze_stillstand_tage:scoped(readable&&nutzungsart==='nicht_betrieben',21),
        herstellerangabe_normale_nutzung_monate:scoped(readable&&nutzungsart==='normale_nutzung',2),
        zeitgrenze_erreicht:readable&&nutzungsart==='nicht_betrieben'?tage_stillstand>=21:readable&&nutzungsart==='normale_nutzung'?kalendermonate_voll>=2:null,
        beleg:scoped(modell===delonghi,evidence(deManual,'Abschnitt 8.1–8.2, Lebensdauer und Ausbau bei Nichtnutzung')),
        hinweis:'Die Pausenregel betrifft das eingebaute Exemplar. Eine erste Nutzung nach längerer Pause separat im Handbuch nachsehen. Es gibt keine Aussage zur Wasserqualität.'};
    },{modell:delonghi,filter_eingesetzt:'belegt',nutzungsart:'nicht_betrieben',tage_stillstand:21,kalendermonate_voll:1},
    {grenze_stillstand_tage:21,herstellerangabe_normale_nutzung_monate:null,zeitgrenze_erreicht:true}),

  tool('philips_aquaclean_orange_blinkt_blau_filteranzeige',
    'Liest orange blinkende und blaue AquaClean-Anzeigen mit belegtem Erststart, verbrauchtem Filter oder abgeschlossener Entkalkung — Interpret a Philips AquaClean indicator using the observed appliance history.',
    {modell:philipsChoice('Exakte Philips-2200-Variante.'),
      anzeige:choice('Sicher erkennbares AquaClean-Symbol.','orange_blinkt','blau','aus','offen'),
      kontext:choice('Überprüfter Verlauf für diese Beobachtung.','erster_gebrauch','filterverbrauch_belegt','nach_entkalkung','offen')},
    ({modell,anzeige,kontext})=>{
      const orange={erster_gebrauch:'filtereinsatz_moeglich',filterverbrauch_belegt:'erinnerung_an_filterwechsel',nach_entkalkung:'erinnerung_nach_entkalkung',offen:'mehrere_verlaeufe_moeglich'};
      const lesart=anzeige==='orange_blinkt'?orange[kontext]:anzeige==='blau'?'bestaetigt_aktivierung':anzeige==='aus'?'kein_aktiver_filter_ableitbar':'anzeige_pruefen';
      return {anzeige_einordnung:scoped(knownPhilips(modell),lesart),filterwirkung_ermittelt:false,
        beleg:pEvidence(modell,'S. 79–80 und 82, AquaClean-Anzeige'),
        hinweis:'Orange allein ist mehrdeutig. Blau bezieht sich auf die Aktivierungsbestätigung und belegt weder Filterwirkung noch ein Ablaufdatum.'};
    },{modell:lattego,anzeige:'orange_blinkt',kontext:'offen'},
    {anzeige_einordnung:'mehrere_verlaeufe_moeglich',filterwirkung_ermittelt:false}),

  tool('philips_gebrauchtkaffee_aquaclean_filterlos_oder_einstieg',
    'Entscheidet bei einem gebrauchten Philips-Vollautomaten, ob bei ausgeschalteter AquaClean-Anzeige der optionale Filterkauf sinnvoll ist und welche Aktivierungsvoraussetzung fehlt — Resolve a used Philips filter purchase against the documented activation prerequisites.',
    {modell:philipsChoice('Abgelesene Philips-2200-Modellkennung.'),
      filterwunsch:choice('Erneuten Filterbetrieb bewusst wählen.','filter_gewuenscht','filterlos_gewuenscht','offen'),
      orange_blinken:match('Das richtige AquaClean-Symbol blinkt beim geprüften Zustand orange.'),
      notwendige_entkalkung_belegt:flag('Für dieses Exemplar ist die zur Aktivierung erforderliche Entkalkung beziehungsweise Kalkfreiheit nach Herstellerbezug belegt.')},
    ({modell,filterwunsch,orange_blinken,notwendige_entkalkung_belegt})=>{
      const status=!knownPhilips(modell)?'modell_klaeren':filterwunsch==='filterlos_gewuenscht'?'filterloser_betrieb_gewaehlt':filterwunsch==='offen'?'filterwunsch_klaeren':orange_blinken==='offen'?'anzeige_und_verlauf_pruefen':orange_blinken==='ausgeschlossen'&&!notwendige_entkalkung_belegt?'entkalkung_vor_aktivierung_klaeren':'aktivierungsvoraussetzungen_im_handbuch_pruefen';
      return {entscheidungsstand:status,kauf_allein_aus_anzeige_abgeleitet:false,
        beleg:pEvidence(modell,'S. 79–80, Aktivierung und Deaktivieren der Erinnerung'),
        hinweis:'Die zugelassene Filteroption und die Erinnerung sind Entscheidungen für das konkrete Gerät. Die Entkalkungsanforderungen gelten weiterhin.'};
    },{modell:classic,filterwunsch:'filter_gewuenscht',orange_blinken:'ausgeschlossen',notwendige_entkalkung_belegt:false},
    {entscheidungsstand:'entkalkung_vor_aktivierung_klaeren',kauf_allein_aus_anzeige_abgeleitet:false}),

  tool('philips_aquaclean_durchfluss_kaffeetassen_wechselintervall',
    'Prüft die 95 Liter durch den AquaClean-Filter und das Dreimonatsintervall ohne Getränkemenge als vollständige Filtermenge zu zählen — Check independently documented time and throughput for an AquaClean filter change.',
    {modell:philipsChoice('Exakte Philips-2200-Variante.'),
      filterwechsel_zugeordnet:flag('Ein bestätigtes AquaClean-Exemplar mit belegtem Beginn ist dieser Beobachtung zugeordnet.'),
      monate_voll:count('Vollendete Kalendermonate seit Einsetzen dieses Exemplars.',60),
      menge:choice('Welche Ausgänge sind in der angegebenen Menge erfasst?', 'alle_durch_filter','nur_tassen_oder_teilmenge','offen'),
      liter:number('Gemessene Liter für die angegebene Erfassung.',0,5000)},
    ({modell,filterwechsel_zugeordnet,monate_voll,menge,liter})=>{
      checkWhole(monate_voll);
      const scopedRun=knownPhilips(modell)&&filterwechsel_zugeordnet;
      const kalender=scoped(scopedRun,monate_voll>=3);
      const durchfluss=scoped(scopedRun&&menge==='alle_durch_filter',liter>=95);
      return {kalendergrenze_erreicht:kalender,durchflussgrenze_erreicht:durchfluss,
        wechselanlass_aus_beiden_pfaden:kalender===true||durchfluss===true?true:kalender===false&&durchfluss===false?false:null,
        beleg:pEvidence(modell,'S. 80, AquaClean auswechseln'),hinweis:'Eine Tasse bildet das Wasser für interne Spülungen nicht vollständig ab. Ein fehlender Auslösebeleg bestätigt keinen verbleibenden Filterzustand.'};
    },{modell:lattego,filterwechsel_zugeordnet:true,monate_voll:2,menge:'nur_tassen_oder_teilmenge',liter:95},
    {kalendergrenze_erreicht:false,durchflussgrenze_erreicht:null,wechselanlass_aus_beiden_pfaden:null}),

  tool('delonghi_magnifica_entkalkungslampe_rot_blinkt_dauerlicht',
    'Ordnet die rote Entkalkungslampe der Magnifica S zwischen blinkender Aufforderung und laufendem Entkalkungsprogramm ein — Distinguish due and active descaling by the verified De’Longhi indicator.',
    {modell:model('Vollständige Modellkennung des deutschen Geräts.',delonghi),
      symbol_bestaetigt:flag('Im genauen Bedienfeld ist die Kontrollleuchte der Entkalkung sicher identifiziert.'),
      signal:choice('Beobachtetes Licht.','blinkt','leuchtet_dauerhaft','aus','offen')},
    ({modell,symbol_bestaetigt,signal})=>{
      const phase={blinkt:'entkalkung_angefordert',leuchtet_dauerhaft:'entkalkungsprogramm_laeuft',aus:'keine_aktive_meldung_am_symbol',offen:'signal_offen'};
      return {phase:scoped(modell===delonghi&&symbol_bestaetigt,phase[signal]),abschluss_belegt:false,
        beleg:scoped(modell===delonghi,[evidence(deManual,'Abschnitte 2.4 und 14, Kontrolllampen'),evidence(deDescale,'Blinkende Aufforderung und dauerhafter Programmstart')]),
        hinweis:'Andere blinkende Leuchten können andere Vorgänge bezeichnen. Eine erloschene Lampe allein ist kein Ablaufprotokoll.'};
    },{modell:delonghi,symbol_bestaetigt:true,signal:'leuchtet_dauerhaft'},
    {phase:'entkalkungsprogramm_laeuft',abschluss_belegt:false}),

  tool('kaffeevollautomat_filter_im_tank_vor_entkalkungsprogramm',
    'Prüft vor dem Entkalkungsprogramm, ob die passende Anleitung einen vorhandenen Wasserfilter im Tank gesondert behandelt — Check the verified filter prerequisite before descaling begins.',
    {modell:modelChoice('Vollständiges deutsches Modell.'),
      filter_im_tank:match('Für den konkreten Wassertank bei diesem Gerät wurde ein Wasserfilter gesehen oder ausgeschlossen.'),
      phase:choice('Zeitpunkt des Bedienablaufs.', 'vor_programmstart','programm_laeuft','offen')},
    ({modell,filter_im_tank,phase})=>{
      const know=knownPhilips(modell)||modell===delonghi;
      const status=!know?'passende_anleitung_pruefen':phase!=='vor_programmstart'?'aktuelle_programmphase_in_anleitung_pruefen':filter_im_tank==='ausgeschlossen'?'kein_eingesetzter_filter_belegt':filter_im_tank==='offen'?'filterstatus_vor_start_klaeren':'filterentnahme_vor_start_in_anleitung_belegt';
      return {entscheidungsstand:status,beleg:modell===delonghi?evidence(deManual,'Abschnitte 8 und 14'):pEvidence(modell,'S. 81, Entkalkungsvorgang'),
        hinweis:'Die Anforderung gilt für die geprüfte Modellanleitung und die Phase vor dem Start. Bei laufendem Programm der Anleitung für die aktuelle Phase folgen.'};
    },{modell:classic,filter_im_tank:'belegt',phase:'vor_programmstart'},
    {entscheidungsstand:'filterentnahme_vor_start_in_anleitung_belegt'}),

  tool('kaffeevollautomat_reinigungstablette_entkalker_artikel_aufgabe',
    'Ordnet Kaffeefettlöser, Entkalker und das Bosch-Calc’nClean-Programm der dokumentierten Aufgabe der vorhandenen Packung zu — Check whether the named consumable matches the planned maintenance task.',
    {modell:modelChoice('Genaue deutsche Modellkennung.'),
      artikel:choice('Lesbare Kennung oder ausdrücklich zugeordnetes Pflegemittel im Schrank.','TCZ8001A','TCZ8002A','CA6704','hersteller_entkalker_dieses_modells','andere_kennung','offen'),
      vorhaben:choice('Welcher Pflegebedarf wurde aus Anleitung oder Programm erkannt?', 'kaffeeweg_reinigen','entkalken','beide_im_kombiprogramm','offen')},
    ({modell,artikel,vorhaben})=>{
      const art=modell===bosch?{TCZ8001A:'kaffeeweg_reinigen',TCZ8002A:'entkalken'}[artikel]:knownPhilips(modell)?{CA6704:'kaffeeweg_reinigen',hersteller_entkalker_dieses_modells:'entkalken'}[artikel]:modell===delonghi&&artikel==='hersteller_entkalker_dieses_modells'?'entkalken':undefined;
      const status=!art||vorhaben==='offen'?'zuordnung_klaeren':vorhaben==='beide_im_kombiprogramm'?(modell===bosch?'bestaetigt_eine_teilaufgabe':'programmumfang_klaeren'):vorhaben===art?'bestaetigt_aufgabe':'andere_aufgabe';
      return {belegte_artikelaufgabe:art??null,abdeckung:status,
        beleg:modell===bosch?evidence(bSheet,'Calc’nClean und getrennte Zubehörpositionen'):knownPhilips(modell)?[pEvidence(modell,'S. 77 und 82, Kaffeefettlöser und Entkalkung'),evidence(pOil,'CA6704 und exakte Modellliste')]:modell===delonghi?evidence(deManual,'Abschnitte 13.9 und 14'):null,
        hinweis:'Das kombinierte Bosch-Programm führt zwei Pflegeaufgaben. Die Packung gehört in den dafür dokumentierten Programmabschnitt. Die Handreinigung der Brühgruppe separat betrachten.'};
    },{modell:bosch,artikel:'TCZ8001A',vorhaben:'beide_im_kombiprogramm'},
    {belegte_artikelaufgabe:'kaffeeweg_reinigen',abdeckung:'bestaetigt_eine_teilaufgabe'}),

  tool('kaffeevollautomat_bruehgruppe_reinigungsroutine_modellwechsel',
    'Vergleicht beim Wechsel der Kaffeemaschine, ob die vorhandene wöchentliche oder monatliche Reinigung der Brühgruppe beide Modellvorgaben erfüllt — Compare brew-group care cadence after switching an exact model.',
    {zielmodell:model('Genaue Kennung des Modells, für das die Routine geplant wird.',delonghi,lattego,classic),
      wasserpflege:choice('Eingeplante Häufigkeit für diesen tatsächlich gepflegten Teil.', 'woechentlich','monatlich','seltener','offen'),
      monatliche_fettloesung:match('Monatliche Pflege mit der für das Zielmodell ausdrücklich ausgewiesenen Kaffeefettlöser-Tablette ist für diese Brühgruppe eingeplant.')},
    ({zielmodell,wasserpflege,monatliche_fettloesung})=>{
      const p=knownPhilips(zielmodell);
      const de=zielmodell===delonghi;
      const needsWater=p?'woechentlich':de?'mindestens_monatlich_ohne_reinigungsmittel':null;
      const waterOK=needsWater&&wasserpflege!=='offen'?wasserpflege==='woechentlich'||de&&wasserpflege==='monatlich':null;
      return {vorgabe_wasserpflege:needsWater,wasserpflege_eingeplant:waterOK,
        monatliche_fettloesung_fuer_zielmodell:p?'vorgesehen':de?'bruehgruppe_ohne_reinigungsmittel':null,
        tablettenroutine_passt:(p||de)&&monatliche_fettloesung!=='offen'?(p?monatliche_fettloesung==='belegt':monatliche_fettloesung==='ausgeschlossen'):null,
        beleg:de?evidence(deManual,'Abschnitt 13.9, Brühgruppe'):pEvidence(zielmodell,'S. 76–77, Reinigungsübersicht und Brühgruppe'),
        hinweis:'Routine und Material gehören zum Teiletyp und zum Zielgerät. Der Kalender belegt keine erledigte Pflege.'};
    },{zielmodell:lattego,wasserpflege:'monatlich',monatliche_fettloesung:'belegt'},
    {vorgabe_wasserpflege:'woechentlich',wasserpflege_eingeplant:false,monatliche_fettloesung_fuer_zielmodell:'vorgesehen',tablettenroutine_passt:true}),

  tool('kaffeevollautomat_milchsystem_lattego_dampf_oder_tasse',
    'Vergleicht bei exakten Vollautomaten LatteGo, klassische Dampfdüse und Milch direkt in der Tasse mit deiner gewünschten Milch-Arbeitsfolge — Match a real milk workflow to the household requirement.',
    {modell:modelChoice('Vollständiges Modell für den deutschen Markt.'),
      ziel:choice('Welche Arbeitsfolge wird benötigt?', 'milchbehaelter_am_geraet','milch_in_der_tasse','von_hand_im_kaennchen','offen')},
    ({modell,ziel})=>{
      const flow=modell===lattego?'milchbehaelter_am_geraet':modell===bosch?'milch_in_der_tasse':modell===classic||modell===delonghi?'von_hand_im_kaennchen':null;
      return {dokumentierte_arbeitsfolge:flow,bedarf_und_ausstattung_passen:scoped(Boolean(flow)&&ziel!=='offen',flow===ziel),
        beleg:modell===delonghi?evidence(deManual,'Abschnitt 11, Zubereitung von Cappuccino'):flow?evidence(productSheets[modell],'Ausgewiesene Milchlösung des Modells'):null,
        hinweis:'Die gleiche Serienbezeichnung kann verschiedene Milchsysteme umfassen. Prüfe, welche Arbeitsfolge und welches Zubehör am vorhandenen Gerät bereits vorhanden sind.'};
    },{modell:classic,ziel:'milchbehaelter_am_geraet'},
    {dokumentierte_arbeitsfolge:'von_hand_im_kaennchen',bedarf_und_ausstattung_passen:false}),

  tool('kaffeevollautomat_automatikspuelung_milchsystem_pflegebeleg',
    'Prüft, ob ein automatischer Spülvorgang und die gesonderte Reinigung benutzter Milchteile jeweils belegt sind — Distinguish a machine rinse from documented cleaning of removable milk components.',
    {modell:modelChoice('Vollständige Modellkennung.'),
      milchsystem_benutzt:match('Benutzung der Milchkomponenten in diesem Durchlauf ist belegt oder ausgeschlossen.'),
      spuelung_beobachtet:match('Der automatische Spülvorgang wurde direkt beobachtet.'),
      milchteile_gereinigt:match('Die dafür vorgesehenen Milchkomponenten wurden separat entsprechend der Modellunterlage gepflegt.')},
    ({modell,milchsystem_benutzt,spuelung_beobachtet,milchteile_gereinigt})=>{
      const known=supported.includes(modell);
      const milk=!known||milchsystem_benutzt==='offen'?'offen':milchsystem_benutzt==='ausgeschlossen'?'kein_milchgebrauch_dokumentiert':milchteile_gereinigt;
      return {automatikspuelung:spuelung_beobachtet,gesonderte_milchteilepflege:milk,
        beleg:modell===bosch?evidence(bSheet,'Automatisches Spülen und abnehmbarer Milchschäumer'):modell===delonghi?evidence(deManual,'Abschnitte 4–5 und 11.1, Spülen und Milchaufschäumer'):pEvidence(modell,'S. 76 und 78, Reinigungsübersicht und Milchaufschäumer'),
        hinweis:'Nach einem Milchgetränk den Reinigungsbeleg auf die vorgesehenen Teile beziehen. Eine beobachtete Automatikspülung kann die separate Teilepflege nicht nachweisen.'};
    },{modell:lattego,milchsystem_benutzt:'belegt',spuelung_beobachtet:'belegt',milchteile_gereinigt:'offen'},
    {automatikspuelung:'belegt',gesonderte_milchteilepflege:'offen'}),

  tool('bosch_tie20301_latte_macchiato_glas_hoehe_einsetzen',
    'Prüft beim Bosch TIE20301 die 130-mm-Glashöhe und ob ein eigenes Latte-Macchiato-Glas gerade eingesetzt werden kann — Check the model’s documented glass height and an observed straight insertion.',
    {modell:model('Vollständige Bezeichnung des deutschen Geräts.',bosch),
      glas_hoehe_mm:number('Am höchsten Punkt gemessene Glashöhe beim benötigten geraden Stand.',0,1000),
      stellprobe:match('Gerades Einsetzen, erreichbare stabile Lage und Entnahme wurden am exakten Modell ohne Getränkeausgabe beobachtet.')},
    ({modell,glas_hoehe_mm,stellprobe})=>{
      const exact=modell===bosch;
      return {hersteller_max_glas_mm:scoped(exact,130),glas_innerhalb_hoehenangabe:scoped(exact,glas_hoehe_mm<=130),
        beobachtete_einsetzbarkeit:exact?stellprobe:'offen',verwendbarkeit_aus_hoehe_und_stellprobe:scoped(exact&&stellprobe!=='offen',glas_hoehe_mm<=130&&stellprobe==='belegt'),
        beleg:scoped(exact,evidence(bSheet,'Komfort, verstellbarer Auslauf und bis 13 cm Glashöhe')),
        hinweis:'Gemessene Höhe, Griffbreite und gerader Einsetzweg sind verschiedene Anforderungen. Die Höhe allein bestätigt die Stellprobe nicht.'};
    },{modell:bosch,glas_hoehe_mm:130,stellprobe:'offen'},
    {hersteller_max_glas_mm:130,glas_innerhalb_hoehenangabe:true,beobachtete_einsetzbarkeit:'offen',verwendbarkeit_aus_hoehe_und_stellprobe:null}),

  tool('kaffeevollautomat_doppeltasse_zwei_kaffees_zwei_milchgetraenke',
    'Unterscheidet Doppeltaste für Kaffee und gleichzeitige Ausgabe von zwei Milchgetränken bei exakt belegten Modellen — Verify whether a double-cup mode covers coffee or two milk drinks.',
    {modell:model('Genaue Modellkennung.',delonghi,lattego,classic),
      ausgabe:choice('Gewünschte Ausgabe in einem Bedienablauf.','zwei_schwarze_kaffees','zwei_milchgetraenke','offen')},
    ({modell,ausgabe})=>{
      const know=knownPhilips(modell)||modell===delonghi;
      return {doppeltasse_kaffee_belegt:scoped(know,true),doppeltasse_milch_belegt:scoped(know,false),
        benoetigte_doppelausgabe_belegt:scoped(know&&ausgabe!=='offen',ausgabe==='zwei_schwarze_kaffees'),
        beleg:modell===delonghi?evidence(deManual,'Abschnitte 2.2 und 11, Kaffee-Doppeltasten und manueller Milchaufschäumer'):know?evidence(productSheets[modell],'Doppelte Tasse und Doppelte Tasse Milch: Nein'):null,
        hinweis:'Der doppelte Kaffeemodus ist mengen- und getränkespezifisch. Ein manueller Milchschritt gehört nicht zur doppelten Ausgabe am Auslauf.'};
    },{modell:lattego,ausgabe:'zwei_milchgetraenke'},
    {doppeltasse_kaffee_belegt:true,doppeltasse_milch_belegt:false,benoetigte_doppelausgabe_belegt:false}),

  tool('philips_kaffeesatzbehaelter_leer_anzeige_bleibt_zaehler',
    'Prüft beim leeren Kaffeesatzbehälter mit weiter leuchtender Anzeige, ob er bei ausgeschalteter Philips-Kaffeemaschine geleert wurde — Separate a stale grounds-counter signal from the observed contents.',
    {modell:philipsChoice('Abgelesene Philips-2200-Variante.'),
      behaelter_jetzt_leer:match('Der tatsächliche Kaffeesatzbehälter wurde als leer festgestellt.'),
      leeranzeige_bleibt:match('Die eindeutig identifizierte Aufforderung zum Leeren bleibt sichtbar.'),
      zustand_beim_leeren:choice('Beobachteter Einschaltzustand während des Leerens.', 'eingeschaltet','ausgeschaltet','offen')},
    ({modell,behaelter_jetzt_leer,leeranzeige_bleibt,zustand_beim_leeren})=>{
      const qualify=knownPhilips(modell)&&behaelter_jetzt_leer==='belegt'&&leeranzeige_bleibt==='belegt';
      return {zaehlerstand_als_erklaerung:!qualify?'beobachtungen_klaeren':zustand_beim_leeren==='ausgeschaltet'?'leerung_bei_aus_setzt_zaehler_nicht_zurueck':'anzeige_und_beobachteten_ablauf_abgleichen',
        kaufgrund_belegt:false,beleg:knownPhilips(modell)?[pEvidence(modell,'S. 76 und 84–85, Kaffeesatzbehälter und Zähler'),evidence(pGrounds,'Anzeige trotz leerem Kaffeesatzbehälter')]:null,
        hinweis:'Der Zähler kann sich anders verhalten als der Füllstand. Wenn die Leuchte nach dokumentiertem Ablauf weiter erscheint, Modellhilfe und Betriebszustand abgleichen.'};
    },{modell:classic,behaelter_jetzt_leer:'belegt',leeranzeige_bleibt:'belegt',zustand_beim_leeren:'ausgeschaltet'},
    {zaehlerstand_als_erklaerung:'leerung_bei_aus_setzt_zaehler_nicht_zurueck',kaufgrund_belegt:false}),

  tool('philips_milch_kaffee_getraenkemenge_groesste_stufe_speichern',
    'Prüft beim Philips 2200, welche Getränkemenge dauerhaft gespeichert werden kann und wann ein separates Milchmengenfeld belegt ist — Check which volume setting can be saved for a specific beverage.',
    {modell:philipsChoice('Genaue Modellkennung.'),
      groessenstufe:choice('Gewünschte Stufe aus dem Getränkemengenmenü.','klein','mittel','groesste','offen'),
      getraenk:choice('Am konkreten Modell belegtes Preset.','schwarzer_kaffee','cappuccino_lattego','offen')},
    ({modell,groessenstufe,getraenk})=>{
      const beverage=knownPhilips(modell)&&getraenk!=='offen'&&(getraenk==='schwarzer_kaffee'||modell===lattego);
      return {normale_groessenstufe_dauerhaft_editierbar:scoped(beverage&&groessenstufe!=='offen',groessenstufe==='groesste'),
        separates_milchmengenfeld_dieser_zubereitung:scoped(beverage,getraenk==='cappuccino_lattego'),
        beleg:pEvidence(modell,'S. 73, Programmieren der größten Standardmenge'),
        hinweis:'Die Option speichert die größte gewählte Stufe für das jeweilige Getränk. Einfüllen, Platz unter dem Auslauf und tatsächliche Ausgabemenge separat prüfen.'};
    },{modell:lattego,groessenstufe:'mittel',getraenk:'cappuccino_lattego'},
    {normale_groessenstufe_dauerhaft_editierbar:false,separates_milchmengenfeld_dieser_zubereitung:true}),

  tool('philips_vorgemahlener_entkoffeinierter_kaffee_einzeltasse',
    'Prüft einen entkoffeinierten Einzelkaffee mit vorgemahlenem Kaffee neben dem Bohnenvorrat und ob zwei Tassen oder speichern dafür möglich sind — Check a decaf pre-ground serving without substituting the bean hopper.',
    {modell:philipsChoice('Am Gerät eindeutig gelesene Philips-2200-Variante.'),
      bedarf:choice('Gewünschter Ablauf für den vorgemahlenen Kaffee.','eine_tasse','zwei_tassen_auf_einmal','automatisch_fuer_spaeter_merken')},
    ({modell,bedarf})=>({
      vorgemahlen_modus_dokumentiert:scoped(knownPhilips(modell),true),
      bedarf_im_vorgemahlenen_modus_belegt:scoped(knownPhilips(modell),bedarf==='eine_tasse'),
      beleg:pEvidence(modell,'S. 72, Brühen mit gemahlenem Kaffee'),
      hinweis:'Die Anleitung beschreibt eine Tasse je Durchlauf. Die Auswahl wird nicht als zuletzt gewählte Aromastärke für einen späteren Bezug gespeichert.'}),
    {modell:classic,bedarf:'zwei_tassen_auf_einmal'},
    {vorgemahlen_modus_dokumentiert:true,bedarf_im_vorgemahlenen_modus_belegt:false}),

  tool('philips_wasserhaerte_teststreifen_rote_quadrate_aromamenue',
    'Ordnet die dokumentierten roten Quadrate eines Philips-Wasserhärtetests dem Einstellwert am Aromastärke-Symbol zu — Validate a water-hardness setting separately from beverage aroma strength.',
    {modell:philipsChoice('Vollständige Philips-2200-Kennung.'),
      streifen_dem_standort_zugeordnet:flag('Originalergebnis ist für das verwendete Wasser und dieses Modell samt Herstelleranleitung belegt.'),
      rote_quadrate:count('Anzahl sicher roter Teststreifenfelder.',4),
      menue:choice('Beobachteter Bezug des Aromastärke-Symbols.','wasserhaertemenue','getraenkeauswahl','offen')},
    ({modell,streifen_dem_standort_zugeordnet,rote_quadrate,menue})=>{
      checkWhole(rote_quadrate);
      return {wasserhaertestufe_aus_beleg:scoped(knownPhilips(modell)&&streifen_dem_standort_zugeordnet&&rote_quadrate>=1,rote_quadrate),
        symboleinstellung_betrifft_wasserhaerte:scoped(knownPhilips(modell)&&menue!=='offen',menue==='wasserhaertemenue'),
        beleg:pEvidence(modell,'S. 80–81, Wasserhärte einstellen und Zuordnung'),
        hinweis:'Hier wird die sichere Herstellerzuordnung für eins bis vier rote Felder erfasst. Bei uneindeutigem oder fehlendem Rotbefund die Tabelle für dieses Modell prüfen. Das Aromastärke-Symbol dient je nach Menü unterschiedlichen Aufgaben.'};
    },{modell:lattego,streifen_dem_standort_zugeordnet:true,rote_quadrate:3,menue:'wasserhaertemenue'},
    {wasserhaertestufe_aus_beleg:3,symboleinstellung_betrifft_wasserhaerte:true}),

  tool('philips_abtropfschale_wasser_spuelwasser_oder_aussen',
    'Unterscheidet bei einem Philips-Vollautomaten Wasser in der Abtropfschale nach beobachtetem Spülen von Wasser außerhalb oder ohne bekannten Zyklus — Scope an observed water location to a documented rinse, without diagnosing a leak.',
    {modell:philipsChoice('Exaktes Philips-2200-Modell.'),
      wasserort:choice('Sicher beobachteter Ort ohne Öffnen von Gehäusen.','nur_in_abtropfschale','ausserhalb','offen'),
      spuelvorgang:match('Ein Spülvorgang wurde im gleichen Beobachtungsabschnitt direkt festgestellt.')},
    ({modell,wasserort,spuelvorgang})=>({
      beobachtung:!knownPhilips(modell)||wasserort==='offen'?'modell_oder_stelle_klaeren':wasserort==='ausserhalb'?'wasser_ausserhalb_separat_abklaeren':spuelvorgang==='belegt'?'mit_dokumentiertem_spuelwasser_vereinbar':'ursprung_bleibt_offen',
      leckdiagnose_belegt:false,
      beleg:knownPhilips(modell)?[pEvidence(modell,'S. 84, Wasser in der Abtropfschale'),evidence(pRinseWater,'Spülwasser und Wasser außerhalb der Abtropfschale')]:null,
      hinweis:'Spülwasser in der Schale ist beschrieben. Die Quelle von Wasser unter oder neben dem Gerät und der konkrete Zustand bleiben getrennt zu klären.'}),
    {modell:lattego,wasserort:'nur_in_abtropfschale',spuelvorgang:'belegt'},
    {beobachtung:'mit_dokumentiertem_spuelwasser_vereinbar',leckdiagnose_belegt:false}),

  tool('delonghi_magnifica_kaffee_pause_wiedergebrauch_spuelen',
    'Prüft vor dem ersten Kaffee nach mehrtägigem Nichtgebrauch die dokumentierte Spülempfehlung der De’Longhi Magnifica S — Read the rinse guidance for resuming use after a documented idle period.',
    {modell:model('Genaue Modellkennung in Deutschland.',delonghi),
      ruhe_dauer_belegt:flag('Ununterbrochener Zeitraum ohne Betrieb ist für das Exemplar dokumentiert.'),
      tage:number('Dauer des Nichtgebrauchs in Tagen, anteilige Tage sind erlaubt.',0,2000),
      spuelung_vor_nutzung:match('Erfolgte Reinigung oder Spülung nach Wiederbeginn ist als eigener Vorgang belegt.')},
    ({modell,ruhe_dauer_belegt,tage,spuelung_vor_nutzung})=>{
      const known=modell===delonghi&&ruhe_dauer_belegt;
      const phase=!known?'zeitraum_oder_modell_klaeren':tage>4?'handbuch_empfiehlt_spuelen_vor_nutzung':tage>3?'uebergangsbereich_der_handbuchangabe':'diese_pausenempfehlung_nicht_ausgeloest';
      return {hersteller_einordnung:phase,
        genannte_spuelvorgaenge:scoped(known&&tage>4,[2,3]),spuelung_vor_erster_nutzung:spuelung_vor_nutzung,
        beleg:scoped(modell===delonghi,evidence(deManual,'Abschnitt 13.2, Wiedergebrauch nach mehr als 3–4 Tagen')),
        hinweis:'Das Handbuch nennt einen Bereich von drei bis vier Tagen. Bei unklarer Abgrenzung oder Vorgeschichte den Abschnitt direkt abgleichen. Eine Spülung misst keine Wasserqualität.'};
    },{modell:delonghi,ruhe_dauer_belegt:true,tage:8,spuelung_vor_nutzung:'offen'},
    {hersteller_einordnung:'handbuch_empfiehlt_spuelen_vor_nutzung',genannte_spuelvorgaenge:[2,3],spuelung_vor_erster_nutzung:'offen'}),

  tool('philips_signaltoene_bedienfeld_ein_aus_start_ausnahme',
    'Prüft, ob Philips-2200-Bedienfeldtöne abschaltbar sind und welche Ein/Aus- und Start/Stopp-Signale erhalten bleiben — Check whether the available panel mute covers a specific sound requirement.',
    {modell:philipsChoice('Vollständig gelesene Philips-Modellkennung.'),
      geraeusch:choice('Zu prüfendes Signal oder Geräusch.','allgemeines_bedienfeldsignal','ein_aus_signal','start_stopp_signal','mahlwerk_oder_pumpe','offen'),
      menue_nach_anleitung_geprueft:flag('Die passende Bedienfeld-Einstellung wurde am exakten Modell nachgelesen und eindeutig geprüft.')},
    ({modell,geraeusch,menue_nach_anleitung_geprueft})=>{
      const state=geraeusch==='allgemeines_bedienfeldsignal'?'bedienfeldsignal_deaktivierbar':geraeusch==='ein_aus_signal'||geraeusch==='start_stopp_signal'?'von_menueoption_ausgenommen':geraeusch==='mahlwerk_oder_pumpe'?'mechanisches_geraeusch_nicht_diese_option':'signal_offen';
      return {funktionsumfang:scoped(knownPhilips(modell),state),tatsaechliches_menue_geprueft:knownPhilips(modell)&&menue_nach_anleitung_geprueft,
        beleg:pEvidence(modell,'S. 75, Deaktivieren der Signaltöne des Bedienfelds'),
        hinweis:'Die Einstellung ist für Bedienfeldtöne. Sie erlaubt keine Schallpegelangabe. Die Töne für Ein/Aus und Start/Stopp sind ausgenommen.'};
    },{modell:lattego,geraeusch:'start_stopp_signal',menue_nach_anleitung_geprueft:true},
    {funktionsumfang:'von_menueoption_ausgenommen',tatsaechliches_menue_geprueft:true})
];
