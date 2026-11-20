const page = '/produkte.html';
const manual = 'https://media3.bsh-group.com/Documents/9001610906_F.pdf';
const data = 'https://media3.bosch-home.com/Documents/specsheet/de-DE/BFL524MS0.pdf';
const exactService = 'https://www.bosch-home.com/de/de/productservice/BFL524MS0-11';
const grill = 'https://www.bosch-home.com/de/de/product/kundensortimente/BEL524MS0';
const flag = description => ({type:'boolean',description});
const select = (description,...values) => ({type:'string',description,enum:values});
const amount = (description, min=0, max=1000) => ({type:'number',description,minimum:min,maximum:max});
const known = flag('Genaue deutsche Geräteausführung BFL524MS0 und Anwendbarkeit des Dokuments 9001610906_F am Gerät geklärt?');
const support = flag('E-Nr mit Index und Modellzuordnung des konkreten Herstellernachweises stimmen überein?');
const status = (evidence, result) => evidence ? result : null;
const stages = {'90':99,'180':99,'360':99,'600':60,'800':30};
const auto = {
  hack: ['P01', 200, 1000,'offen'], fleisch: ['P02',200,1000,'offen'],
  gefluegel: ['P03',400,1800,'offen'], brot: ['P04',200,1000,'offen'],
  reis: ['P05',50,200,'mit_deckel'], kartoffeln: ['P06',150,1000,'mit_deckel'],
  gemuese: ['P07',150,1000,'mit_deckel']
};
const tool = (name, description, properties, calculate, args, expect) =>
  ({name,description,page,properties,calculate,example:{args,expect}});

export const mikrowellenBelege = [
  tool('bosch_bfl524ms0_nische_geraetemass_unterscheiden',
    'Bosch BFL524MS0 prüfen: Nischenmaße, Gerätemaße und Garraummaße auseinanderhalten — Distinguish cabinet opening, outer body and cavity dimensions.',
    {modell_belegt:support, hoehe_mm:amount('Freies Nischenmaß Höhe in Millimetern.',1),
      breite_mm:amount('Freies Nischenmaß Breite in Millimetern.',1),tiefe_mm:amount('Freies Nischenmaß Tiefe in Millimetern.',1),
      messbezug:select('Wie wurden die Maße erfasst?','freie_nische','geraet_aussen','innenraum','unklar')},
    ({modell_belegt,hoehe_mm,breite_mm,tiefe_mm,messbezug})=>{
      const belegt=modell_belegt&&messbezug==='freie_nische';
      return {datenblatt_nische_mm:modell_belegt?[365,560,300]:null,
        geraet_aussen_mm:modell_belegt?[382,594,317]:null,
        unterschnittene_achsen:belegt?[hoehe_mm<365?'hoehe':null,breite_mm<560?'breite':null,tiefe_mm<300?'tiefe':null].filter(Boolean):null,
        hinweis:'Das Datenblatt verlangt zusätzlich die passende technische Zeichnung. Ein größerer Messwert allein bestätigt die Einbaueignung nicht.',quelle:data};
    },{modell_belegt:true,hoehe_mm:365,breite_mm:558,tiefe_mm:310,messbezug:'freie_nische'},{unterschnittene_achsen:['breite'],datenblatt_nische_mm:[365,560,300]}),

  tool('bosch_bfl524_einbaumoebel_hitzebestaendigkeit_luftweg_belege',
    'Hitzebeständigkeit von Einbaumöbel und Nachbarfront sowie freigehaltene Lüftungsöffnungen getrennt abgleichen — Check documented furniture temperatures and unobstructed ventilation.',
    {handbuch_belegt:known, korpus_grad:amount('Dokumentierte Hitzebeständigkeit des Möbelkorpus in °C, 0 falls ungeklärt.',0,250),
      front_grad:amount('Dokumentierte Hitzebeständigkeit benachbarter Fronten in °C, 0 falls ungeklärt.',0,250),
      lueftung:select('Planung der Lüftungsöffnungen.','frei_belegt','verdeckt','ungeklaert')},
    ({handbuch_belegt,korpus_grad,front_grad,lueftung})=>({
      korpus_90_grad_belegt:handbuch_belegt&&korpus_grad>0?korpus_grad>=90:null,
      front_65_grad_belegt:handbuch_belegt&&front_grad>0?front_grad>=65:null,
      luftoeffnung_frei:handbuch_belegt&&lueftung!=='ungeklaert'?lueftung==='frei_belegt':null,
      hinweis:'Drei getrennte Belege aus Abschnitt 15.4. Einbau und Anschlüsse nach Fachplanung.',quelle:manual
    }),{handbuch_belegt:true,korpus_grad:92,front_grad:60,lueftung:'frei_belegt'},
    {korpus_90_grad_belegt:true,front_65_grad_belegt:false,luftoeffnung_frei:true}),

  tool('mikrowelle_gefaess_drehkreis_griffe_zentriert',
    'Bei einem rechteckigen Gefäß die gemessene Drehhülle mit Griffen gegen den freien Drehraum prüfen — Check handle-inclusive rotational clearance of a centered rectangular vessel.',
    {laenge_mit_griffen_mm:amount('Größte äußere Länge einschließlich aller Griffe in mm.',1,1500),
      breite_mit_griffen_mm:amount('Größte äußere Breite einschließlich aller Griffe in mm.',1,1500),
      freier_drehdurchmesser_mm:amount('Freier Kreis um die Drehachse am betreffenden Höhenniveau in mm.',1,1500),
      freiraum_geprueft:flag('Freie Drehhülle am Gerät einschließlich Engstellen belegt und Gefäß mittig positioniert?')},
    ({laenge_mit_griffen_mm,breite_mit_griffen_mm,freier_drehdurchmesser_mm,freiraum_geprueft})=>{
      const durchmesser=Math.hypot(laenge_mit_griffen_mm,breite_mit_griffen_mm);
      return {rechtwinklige_drehhuelle_mm:Math.round(durchmesser*10)/10,
        rechnerische_reserve_mm:freiraum_geprueft?Math.round((freier_drehdurchmesser_mm-durchmesser)*10)/10:null,
        drehkreis_unterschritten:freiraum_geprueft?durchmesser<freier_drehdurchmesser_mm:null,
        hinweis:'Die 25,5 cm des Bosch-Glastellers sind die Zubehörgröße. Echten Freiraum messen. Die Rechnung umfasst Höhe und Freigabe des Geschirrs nicht.',quelle:data};
    },{laenge_mit_griffen_mm:200,breite_mit_griffen_mm:150,freier_drehdurchmesser_mm:254,freiraum_geprueft:true},
    {rechtwinklige_drehhuelle_mm:250,rechnerische_reserve_mm:4,drehkreis_unterschritten:true}),

  tool('mikrowelle_deckelgriff_lichte_hoehe_tuerdurchlass',
    'Die Gefäßhöhe mit Deckel und Griff an Türöffnung und tatsächlicher Stellposition abgleichen — Check vertical passage and in-use lid clearance.',
    {gefaess_mit_deckel_mm:amount('Größte Höhe samt Deckelgriff in mm.',1),
      freie_oeffnung_mm:amount('Kleinste gemessene freie Öffnung beim Einsetzen in mm.',1),
      freie_hoehe_im_garraum_mm:amount('Freie lichte Höhe über der tatsächlichen Stellfläche in mm.',1),
      gemessen:flag('Einsetzweg und Stellposition am Gerät gemessen, statt aus Nennvolumen abgeleitet?')},
    ({gefaess_mit_deckel_mm,freie_oeffnung_mm,freie_hoehe_im_garraum_mm,gemessen})=>({
      begrenzende_stelle:gemessen?freie_oeffnung_mm<=freie_hoehe_im_garraum_mm?'tuerdurchlass':'stellposition':null,
      rechnerische_hoehenreserve_mm:gemessen?Math.min(freie_oeffnung_mm,freie_hoehe_im_garraum_mm)-gefaess_mit_deckel_mm:null,
      hinweis:'Lichte Öffnung und Zubehör separat messen. Die 201 mm Garraumhöhe im Bosch-Datenblatt bestimmt die freie Türöffnung nicht.',quelle:data
    }),{gefaess_mit_deckel_mm:184,freie_oeffnung_mm:181,freie_hoehe_im_garraum_mm:193,gemessen:true},
    {begrenzende_stelle:'tuerdurchlass',rechnerische_hoehenreserve_mm:-3}),

  tool('bosch_mikrowelle_bfl_bel_grill_modellbeleg',
    'Die deutsche Bosch BFL524MS0 und BEL524MS0 bei einem angebotenen Grillmodus unterscheiden — Distinguish the solo microwave and grill variant before purchase.',
    {laut_typenschild:select('Tatsächlich gelesenes Modell.','bfl524ms0','bel524ms0','ungeklaert'),
      quelle_gilt:support, grill_benoetigt:flag('Ist ein eigener Grillmodus für die Nutzung erforderlich?')},
    ({laut_typenschild,quelle_gilt,grill_benoetigt})=>{
      const grill_belegt=status(quelle_gilt&&laut_typenschild!=='ungeklaert',laut_typenschild==='bel524ms0');
      return {grill_belegt, kaufanforderung_grill_ungueltig:grill_benoetigt&&grill_belegt===null?null:grill_benoetigt&&grill_belegt===false,
        quellen:[data,grill],hinweis:'BFL und BEL nicht aus einem ähnlich aussehenden Foto oder gemeinsamer Wattzahl ableiten.'};
    },{laut_typenschild:'bfl524ms0',quelle_gilt:true,grill_benoetigt:true},{grill_belegt:false,kaufanforderung_grill_ungueltig:true}),

  tool('bosch_bfl524ms0_watt_anschlusswert_und_garleistung',
    'Bosch BFL524MS0: 800 W Mikrowellenleistung, 1270 W Anschlusswert und einen gemessenen Verbrauch auseinanderhalten — Separate cooking output, rated input and energy measured in use.',
    {datenblatt_belegt:support, vorhandener_wert:select('Welcher Wert soll eingeordnet werden?','mikrowellenleistung','elektrischer_anschlusswert','energie_zaehler','nicht_zugeordnet')},
    ({datenblatt_belegt,vorhandener_wert})=>({
      wert_art:datenblatt_belegt&&vorhandener_wert!=='nicht_zugeordnet'?vorhandener_wert:null,
      nennwert_w:datenblatt_belegt?({mikrowellenleistung:800,elektrischer_anschlusswert:1270})[vorhandener_wert]??null:null,
      echte_energie_nur_mit_messung:true,quelle:data
    }),{datenblatt_belegt:true,vorhandener_wert:'elektrischer_anschlusswert'},{wert_art:'elektrischer_anschlusswert',nennwert_w:1270}),

  tool('bosch_bfl524_watt_stufe_maximale_zeiteinstellung',
    'Die maximal einstellbare Zeit je Bosch BFL524 Leistungsstufe im Handbuch prüfen — Read the maximum selectable timer for each microwave output setting.',
    {handbuch_belegt:known, stufe_w:select('Am Gerät abgelesene Leistungsstufe in Watt.','90','180','360','600','800','andere'),
      gewuenschte_min:amount('Geplante Einstelldauer in Minuten.',0,1440)},
    ({handbuch_belegt,stufe_w,gewuenschte_min})=>{
      const maximum=handbuch_belegt?stages[stufe_w]??null:null;
      return {maximal_einstellbar_min:maximum, zeiteinstellung_im_bereich:maximum===null?null:gewuenschte_min>0&&gewuenschte_min<=maximum,
        hinweis:'Die einstellbare Zeit belegt keine dauerhaft gehaltene höchste Leistung.',quelle:manual};
    },{handbuch_belegt:true,stufe_w:'800',gewuenschte_min:31},{maximal_einstellbar_min:30,zeiteinstellung_im_bereich:false}),

  tool('bosch_bfl524ms0_inverter_maximalleistung_dauer_keine_garprognose',
    'Bosch Inverter-Angabe zur Abregelung bei längerem Betrieb auf den genauen Begriff und das Modell begrenzen — Interpret the model-specific long-run power reduction without inventing timing.',
    {datenblatt_belegt:support, beobachtung:select('Welche Aussage wurde dokumentiert?','nennleistung','laengerer_betrieb','gemessener_zeitpunkt','kein_beleg')},
    ({datenblatt_belegt,beobachtung})=>({
      nenn_max_w:status(datenblatt_belegt,800),
      abregelungswert_w:status(datenblatt_belegt&&beobachtung==='laengerer_betrieb',600),
      abregelungszeit_min:null,hinweis:'Das Datenblatt nennt bei längerem Betrieb die Reduzierung bis auf 600 W, ohne einen genauen Umschaltzeitpunkt. Eine Steckdosenmessung bestimmt keine direkt an der Speise wirksame Leistung.',quelle:data
    }),{datenblatt_belegt:true,beobachtung:'laengerer_betrieb'},{nenn_max_w:800,abregelungswert_w:600,abregelungszeit_min:null}),

  tool('bosch_bfl524_autopilot_portion_und_programmtabelle',
    'Bosch AutoPilot: dokumentierte Speisegruppe, Portionsgewicht und Programmnummer zusammenlesen — Look up the listed food category and weight range for the exact AutoPilot programme.',
    {handbuch_belegt:known, speise:select('Tatsächliche Speisegruppe.','hack','fleisch','gefluegel','brot','reis','kartoffeln','gemuese','unbekannt'),
      menge_g:amount('Gewogenes Lebensmittel ohne Verpackung, 0 falls unbekannt.',0,4000),
      zustand:select('Wofür soll das Automatikprogramm verwendet werden?','auftauen','garen','unbekannt')},
    ({handbuch_belegt,speise,menge_g,zustand})=>{
      const row=handbuch_belegt?auto[speise]:undefined;
      const passende_phase=row&&(row[3]==='offen'?'auftauen':'garen')===zustand;
      return {hersteller_programm:passende_phase?row[0]:null,
        gewichtsbereich_g:passende_phase?[row[1],row[2]]:null,
        menge_im_belegbereich:passende_phase&&menge_g>0?menge_g>=row[1]&&menge_g<=row[2]:null,
        hinweis:'Gewichtsbereich, Ausgangszustand, Geschirr und Herstellerhinweise gehören zusammen. Kein Gar- oder Auftauergebnis garantiert.',quelle:manual};
    },{handbuch_belegt:true,speise:'gefluegel',menge_g:380,zustand:'auftauen'},{hersteller_programm:'P03',gewichtsbereich_g:[400,1800],menge_im_belegbereich:false}),

  tool('bosch_bfl524_autoprogramm_deckel_auftauen_garen',
    'Vorhandenen Deckel mit der offenen Auftau- oder abgedeckten Garvorgabe des Bosch-Programms abgleichen — Check whether the named Bosch programme lists an uncovered or covered vessel.',
    {handbuch_belegt:known, programm:select('Die tatsächlich gewählte Programmnummer.','P01','P02','P03','P04','P05','P06','P07','unbekannt'),
      deckel:select('Beobachtete und für die Mikrowelle freigegebene Ausstattung.','offen','mit_deckel','nicht_belegt')},
    ({handbuch_belegt,programm,deckel})=>{
      const row=handbuch_belegt?Object.values(auto).find(r=>r[0]===programm):undefined;
      return {vorgabe:row?.[3]??null,aufbau_passt_zur_programmzeile:row&&deckel!=='nicht_belegt'?row[3]===deckel:null,
        hinweis:'Die Tabelle setzt mikrowellengeeignetes Geschirr voraus. Eine Deckelvorgabe bestätigt keine Eignung des vorhandenen Materials.',quelle:manual};
    },{handbuch_belegt:true,programm:'P05',deckel:'offen'},{vorgabe:'mit_deckel',aufbau_passt_zur_programmzeile:false}),

  tool('bosch_bfl524_rundung_eingabeschritt_gewichtsgrenze',
    'Bei Automatikprogrammen das gemessene Portionsgewicht von der gerundeten Eingabe unterscheiden — Keep rounded programme input separate from measured food weight.',
    {handbuch_belegt:known, programm:select('Programm laut Display.','P01','P02','P03','P04','P05','P06','P07','unbekannt'),
      gewogen_g:amount('Tatsächlich gewogenes Lebensmittelgewicht in g.',1,5000),
      eingegeben_g:amount('Tatsächlich auswählbarer und eingegebener Displaywert in g.',1,5000)},
    ({handbuch_belegt,programm,gewogen_g,eingegeben_g})=>{
      const row=handbuch_belegt?Object.values(auto).find(r=>r[0]===programm):undefined;
      return {rundeingabe_abweichung_g:row?eingegeben_g-gewogen_g:null,
        waage_im_programmbereich:row?gewogen_g>=row[1]&&gewogen_g<=row[2]:null,
        anzeige_im_programmbereich:row?eingegeben_g>=row[1]&&eingegeben_g<=row[2]:null,
        hinweis:'Das Handbuch erlaubt Rundung, wenn das genaue Gewicht nicht eingegeben werden kann. Ein aufgerundeter Wert belegt keine passende Portion.',quelle:manual};
    },{handbuch_belegt:true,programm:'P05',gewogen_g:49,eingegeben_g:50},
    {rundeingabe_abweichung_g:1,waage_im_programmbereich:false,anzeige_im_programmbereich:true}),

  tool('bosch_bfl524_memory_einzelschritt_oder_automatik',
    'Beim Bosch BFL524 prüfen, ob ein einzelner manueller Ablauf im vorhandenen Memory-Platz gespeichert werden kann — Check whether the intended routine fits the single memory slot.',
    {handbuch_belegt:known, ablauf:select('Zu speichernder Ablauf.','manuell_eine_stufe','manuell_mehrere_stufen','automatik','ungeklaert'),
      zielspeicher_anzahl:amount('Anzahl gleichzeitig benötigter Speicherplätze.',1,25)},
    ({handbuch_belegt,ablauf,zielspeicher_anzahl})=>({
      vorhanden_plaetze:status(handbuch_belegt,1), speicheranforderung_sicher_abgedeckt:handbuch_belegt&&ablauf!=='ungeklaert'?ablauf==='manuell_eine_stufe'&&zielspeicher_anzahl===1:null,
      hinweis:'Das Handbuch schließt mehrere Stufen nacheinander und Automatikprogramme im Memory aus.',quelle:manual
    }),{handbuch_belegt:true,ablauf:'automatik',zielspeicher_anzahl:1},{vorhanden_plaetze:1,speicheranforderung_sicher_abgedeckt:false}),

  tool('bosch_bfl524_automatik_signal_waehrend_programm',
    'Ein Signal mit weiterlaufendem oder angehaltenem AutoPilot von einem bestätigten Programmende trennen — Distinguish a mid-programme intervention signal from a confirmed finish.',
    {handbuch_belegt:known, beobachtung:select('Wann wurde das Signal beobachtet?','waehrend','ablauf_beendet','unklar'),
      signal_beobachtet:flag('Akustisches Signal am konkreten Lauf tatsächlich beobachtet?'),
      restzeit_positiv:flag('War eine positive Restzeit noch ablesbar?')},
    ({handbuch_belegt,beobachtung,signal_beobachtet,restzeit_positiv})=>({
      handbuch_signalart:handbuch_belegt&&signal_beobachtet&&beobachtung!=='unklar'?beobachtung==='waehrend'?'zwischenschritt_pruefen':'ende_am_ablauf_pruefen':null,
      programmende_belegt:handbuch_belegt&&signal_beobachtet&&beobachtung==='ablauf_beendet'&&!restzeit_positiv,
      hinweis:'Im Automatikprogramm sieht Bosch bei einem Zwischensignal einen Handlungsschritt vor. Ton allein belegt kein Ende.',quelle:manual
    }),{handbuch_belegt:true,beobachtung:'waehrend',signal_beobachtet:true,restzeit_positiv:true},
    {handbuch_signalart:'zwischenschritt_pruefen',programmende_belegt:false}),

  tool('bosch_bfl524_kuehlgeblaese_nachlauf_kein_weitergaren_beleg',
    'Nach dem Programm den hörbaren Nachlauf des Kühlgebläses getrennt von aktiver Mikrowellenfunktion dokumentieren — Distinguish documented cooling fan run-on from active heating.',
    {handbuch_belegt:known, ablauf_beendet:flag('Der Ablauf ist am Display als beendet beobachtet.'),
      geraeusch:select('Geräusch am konkreten Gerät.','geblaese_zugeordnet','andere','nicht_zugeordnet')},
    ({handbuch_belegt,ablauf_beendet,geraeusch})=>({
      dokumentierter_nachlauf_moeglich:handbuch_belegt&&ablauf_beendet&&geraeusch==='geblaese_zugeordnet'?true:null,
      aktive_mikrowellenleistung_durch_geraeusch_belegt:false,
      hinweis:'Das Handbuch erlaubt Gebläsenachlauf. Ein Geräusch ersetzt keine Funktionsanzeige und keine eigene Messung.',quelle:manual
    }),{handbuch_belegt:true,ablauf_beendet:true,geraeusch:'geblaese_zugeordnet'},
    {dokumentierter_nachlauf_moeglich:true,aktive_mikrowellenleistung_durch_geraeusch_belegt:false}),

  tool('bosch_bfl524_kondenswasser_ort_und_wiederkehr_abgleich',
    'Kondenswasser im Garraum oder an der Tür nach einem Lauf von Wasser an unbekannter Stelle unterscheiden — Record ordinary post-run condensation separately from unexplained moisture.',
    {handbuch_belegt:known, ort:select('Wo ist das Wasser sichtbar?','garraum','tuerscheibe','ausserhalb','nicht_gesehen'),
      zeit:select('Zeitlicher Bezug.','nach_garen','vor_betrieb','unklar'), nach_trocknen_wiederkehr:flag('Wasser ohne neuen Garvorgang nach dem Trocknen wieder beobachtet?')},
    ({handbuch_belegt,ort,zeit,nach_trocknen_wiederkehr})=>({
      handbuch_kondensationsfall:handbuch_belegt?(ort==='garraum'||ort==='tuerscheibe')&&zeit==='nach_garen'&&!nach_trocknen_wiederkehr:null,
      weitere_abklaerung:ort==='ausserhalb'||nach_trocknen_wiederkehr,
      hinweis:'Bosch beschreibt Kondensat im Garraum oder an der Tür während des Garens. Äußere oder wiederkehrende Feuchte ist dadurch nicht erklärt.',quelle:manual
    }),{handbuch_belegt:true,ort:'ausserhalb',zeit:'nach_garen',nach_trocknen_wiederkehr:false},
    {handbuch_kondensationsfall:false,weitere_abklaerung:true}),

  tool('bosch_bfl524_demo_modus_anzeige_ohne_garfunktion',
    'Beim dokumentierten Demo-Modus die bedienbare Anzeige von der tatsächlichen Garfunktion trennen — Recognize the documented showroom mode without diagnosing a failure.',
    {handbuch_belegt:known, modus:select('In den Grundeinstellungen zuverlässig gelesener Status.','demo_aktiv','demo_inaktiv','nicht_gelesen'),
      oberflaeche_bedienbar:flag('Display beziehungsweise Tasten wirken bedienbar.')},
    ({handbuch_belegt,modus,oberflaeche_bedienbar})=>({
      showroom_erklaerung_belegt:handbuch_belegt&&modus==='demo_aktiv',
      bedienbarkeit_belegt_keine_garfunktion:oberflaeche_bedienbar,
      hinweis:'Die Geräteanleitung führt einen Demo-Modus auf. Ohne gelesenen Modus bleibt die Ursache offen.',quelle:manual
    }),{handbuch_belegt:true,modus:'demo_aktiv',oberflaeche_bedienbar:true},
    {showroom_erklaerung_belegt:true,bedienbarkeit_belegt_keine_garfunktion:true}),

  tool('bosch_bfl524_drehteller_originalteil_index_und_mass',
    'Glas-Drehteller für Bosch BFL524MS0 nach Durchmesser und exakter E-Nr-Kompatibilität getrennt prüfen — Check the listed tray size separately from exact spare-part compatibility.',
    {modell_belegt:support, zubehoer_durchmesser_mm:amount('Dokumentierter Durchmesser des Angebots in mm, 0 bei fehlender Angabe.'),
      e_nr_liste:select('Ersatzteilliste für die konkrete E-Nr einschließlich Index.','bestaetigt','ausgeschlossen','unbekannt')},
    ({modell_belegt,zubehoer_durchmesser_mm,e_nr_liste})=>({
      original_nenndurchmesser_mm:status(modell_belegt,255),
      mass_gleich:modell_belegt&&zubehoer_durchmesser_mm>0?zubehoer_durchmesser_mm===255:null,
      ersatzteilfreigabe:modell_belegt&&e_nr_liste!=='unbekannt'?e_nr_liste==='bestaetigt':null,
      hinweis:'Durchmesser allein bestätigt weder Mitnehmer noch Ausführung. Bosch hat getrennte Servicepfade für die E-Nr-Indizes.',quellen:[data,exactService]
    }),{modell_belegt:true,zubehoer_durchmesser_mm:255,e_nr_liste:'unbekannt'},
    {original_nenndurchmesser_mm:255,mass_gleich:true,ersatzteilfreigabe:null}),

  tool('bosch_bfl524_glas_drehteller_zustand_betriebssperre',
    'Einen fehlenden, nicht eingerasteten oder gesprungenen Drehteller vor der Nutzung einordnen — Gate use on an undamaged and properly seated manufacturer tray.',
    {handbuch_belegt:known, zustand:select('Beobachteter Zustand des Drehtellers.','eingerastet_ohne_sichtschaden','nicht_eingerastet','fehlt','riss_oder_splitter','unbekannt')},
    ({handbuch_belegt,zustand})=>({
      drehteller_voraussetzung_erfuellt:handbuch_belegt&&zustand!=='unbekannt'?zustand==='eingerastet_ohne_sichtschaden':null,
      richtungswechsel_fehlerbeleg:false,
      hinweis:'Die Anleitung erlaubt Drehung nach links oder rechts. Fehlender oder beschädigter Teller ist ein eigener Befund; Gerät damit vorerst nicht betreiben.',quelle:manual
    }),{handbuch_belegt:true,zustand:'riss_oder_splitter'},{drehteller_voraussetzung_erfuellt:false,richtungswechsel_fehlerbeleg:false}),

  tool('bosch_bfl524_reinigungsunterstuetzung_leichte_verschmutzung',
    'Die Reinigungsunterstützung für leichte Rückstände von starker Verschmutzung oder mechanischen Schäden abgrenzen — Determine the documented scope of Bosch cleaning assistance.',
    {handbuch_belegt:known, verschmutzung:select('Beobachteter Befund.','leicht','stark','sichtschaden','ungeklaert')},
    ({handbuch_belegt,verschmutzung})=>({
      reinigungsunterstuetzung_fuer_befund_belegt:handbuch_belegt&&verschmutzung!=='ungeklaert'?verschmutzung==='leicht':null,
      andere_herstelleranleitung_pruefen:verschmutzung==='stark'||verschmutzung==='sichtschaden',
      hinweis:'Abschnitt 10.7 beschreibt eine Zwischenreinigung. Bei starker Verschmutzung den passenden Abschnitt prüfen; Schäden werden dadurch nicht behoben.',quelle:manual
    }),{handbuch_belegt:true,verschmutzung:'stark'},{reinigungsunterstuetzung_fuer_befund_belegt:false,andere_herstelleranleitung_pruefen:true}),

  tool('bosch_bfl524_reiniger_tuerscheibe_geraetefront_bedienfeld',
    'Glasreiniger für Türscheiben und Gerätevorderseite sowie Feuchtigkeit am Bedienfeld getrennt einordnen — Match the cleaning method to the exact front, pane or control surface.',
    {handbuch_belegt:known, flaeche:select('Zu reinigende Fläche.','tuerscheibe','geraetefront','bedienfeld','unbekannt'),
      mittel:select('Geplantes Mittel.','glasreiniger','glasschaber','nass_wischen','tuch_weich_feucht','unbekannt')},
    ({handbuch_belegt,flaeche,mittel})=>{
      const table={
        tuerscheibe:{glasreiniger:'genannt',glasschaber:'ausgeschlossen',tuch_weich_feucht:'genannt'},
        geraetefront:{glasreiniger:'ausgeschlossen',glasschaber:'ausgeschlossen'},
        bedienfeld:{nass_wischen:'ausgeschlossen',tuch_weich_feucht:'genannt'}
      };
      return {handbuchstatus:handbuch_belegt?table[flaeche]?.[mittel]??null:null,
        hinweis:'Nur den genauen Abschnitt für die Fläche verwenden. Unbelegte Kombinationen offen halten.',quelle:manual};
    },{handbuch_belegt:true,flaeche:'geraetefront',mittel:'glasreiniger'},
    {handbuchstatus:'ausgeschlossen'}),

  tool('bosch_bfl524_drehteller_schleifen_aussenpruefung',
    'Schleifen des Mikrowellen-Drehtellers mit beobachteten Rückständen im Rollenringbereich abgleichen — Identify the documented user-observable cause of tray scraping.',
    {handbuch_belegt:known, schleifen_beobachtet:flag('Ein Schleif- oder Kratzgeräusch ist tatsächlich beobachtet.'),
      aussenbefund:select('Sichtbarer, zugänglicher Bereich an Rollenring und Vertiefung bei ausgeschaltetem Gerät.','rueckstaende','kein_befund','sichtschaden','nicht_geprueft')},
    ({handbuch_belegt,schleifen_beobachtet,aussenbefund})=>({
      dokumentierter_befund_naheliegend:handbuch_belegt&&schleifen_beobachtet&&aussenbefund==='rueckstaende',
      weitere_betriebsfreigabe:null,
      hinweis:'Der Bosch-Troubleshooter nennt Schmutz im Rollenringbereich. Bei Schaden oder anhaltendem Geräusch fachlich klären. Keine internen Teile öffnen.',quelle:manual
    }),{handbuch_belegt:true,schleifen_beobachtet:true,aussenbefund:'rueckstaende'},
    {dokumentierter_befund_naheliegend:true,weitere_betriebsfreigabe:null}),

  tool('bosch_mikrowelle_garraumtuer_schaden_betrieb_anhalten',
    'Bei beschädigter Garraumtür, Mängeln an der Dichtung oder ungeklärtem sichtbaren Schaden die Nutzung vorerst stoppen — Decide when to pause operation for professional assessment of a visible door defect.',
    {handbuch_belegt:known, schaden:select('Nur äußerlich beobachteter Zustand.','tuer_beschaedigt','dichtung_beschaedigt','kunststoff_rahmen_beschaedigt','keiner_sichtbar','unklar')},
    ({handbuch_belegt,schaden})=>({
      betrieb_zur_abklaerung_pausieren:['tuer_beschaedigt','dichtung_beschaedigt','kunststoff_rahmen_beschaedigt','unklar'].includes(schaden),
      hersteller_warnung_genau_belegt:handbuch_belegt&&['tuer_beschaedigt','kunststoff_rahmen_beschaedigt'].includes(schaden),
      hinweis:'Beschädigte Türen oder Dichtungen von Fachleuten prüfen lassen. Eine Sichtprüfung bestätigt keine technische Freigabe.',quelle:manual
    }),{handbuch_belegt:true,schaden:'kunststoff_rahmen_beschaedigt'},
    {betrieb_zur_abklaerung_pausieren:true,hersteller_warnung_genau_belegt:true}),

  tool('mikrowelle_gefaessfreigabe_korpus_deckel_dekor_unterscheiden',
    'Die Herstellerfreigaben für Gefäß, Deckel und Dekor bei Mikrowellennutzung einzeln zusammentragen — Treat lid, decoration and vessel approval as separate operating evidence.',
    {korpus:select('Gelesene Herstellerfreigabe für den Gefäßkörper.','ja','nein','unbekannt'),
      deckel:select('Gelesene Freigabe für den tatsächlich verwendeten Deckel.','ja','nein','unbekannt','kein_deckel'),
      dekor:select('Metallisches Dekor am konkret verwendeten Gefäß.','nicht_vorhanden','ausdruecklich_erlaubt','nicht_freigegeben','unbekannt')},
    ({korpus,deckel,dekor})=>{
      const neg=korpus==='nein'||deckel==='nein'||dekor==='nicht_freigegeben';
      const unk=[korpus,deckel,dekor].includes('unbekannt');
      return {einzelbelege_vollstaendig:!unk, freigabe_aus_unterlagen:neg?false:unk?null:true,
        hinweis:'Ein Symbol am Gefäßkörper gilt nicht automatisch für Deckel oder dekorative Metallränder. Zusätzlich die Anleitung des genau eingesetzten Geräts beachten.',quelle:manual};
    },{korpus:'ja',deckel:'unbekannt',dekor:'nicht_vorhanden'},{einzelbelege_vollstaendig:false,freigabe_aus_unterlagen:null})
];
