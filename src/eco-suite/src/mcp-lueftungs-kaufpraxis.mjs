const PAGE='/guide/unterschied-klimaanlage-lueftungsanlage.html';
const SPEC='https://zehnder.picturepark.com/v/WbAb4h0n/';
const MANUAL='https://zehnder.picturepark.com/v/dwbRP3uL/';
const UBA='https://www.umweltbundesamt.de/system/files/medien/1410/publikationen/fb_anforderungen_an_lueftungskonzeptionen_in_wohngebaeuden_bf.pdf';
const REVISION='Z-MASTER-V0126-CSY-TES-TS135-ComfoAir-Q350';
const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const choice=(description,values)=>({type:'string',description,enum:values});
const flag=description=>({type:'boolean',description});
const pressure=description=>num(description+' in Pa.',0,1000);
const flow=description=>num(description+' in m³/h.',0,2000);
const length=description=>num(description+' in mm.',0,10000);
const db=description=>num(description+' in dB.',0,150);
const round=(n,digits=2)=>Number.isFinite(n)?Number(n.toFixed(digits))+0:null;
const paths=['druckseite','saugseite','gehaeuse'];
const points={
  p100:{pa:100,druckseite:56.2,saugseite:43.1,gehaeuse:43.1,watt:58,sfp:0.23},
  p150:{pa:150,druckseite:58.4,saugseite:45,gehaeuse:45.2,watt:71,sfp:0.29},
  p200:{pa:200,druckseite:60.7,saugseite:47,gehaeuse:47.3,watt:85,sfp:0.34},
};
const point=description=>choice(description,Object.keys(points));
const specEvidence=()=>({originalquelle_url:SPEC,dokumentkennung:REVISION});
const manualEvidence=()=>({originalquelle_url:MANUAL});
const ubaEvidence=()=>({originalquelle_url:UBA,seite:15});

function tool(name,description,properties,calculate,args,expect){
  return {name,description,page:PAGE,properties,calculate,example:{args,expect}};
}

export const lueftungsKaufpraxis=[
  tool('q350_tr_250m3_schallweg_druckpunkte_v0126',
    'Liest zwei gleichvolumige V0126-Prüfpunkte für denselben Schallweg aus — Compare two V0126 pressure points for the same documented path at 250 m³/h.',
    {pfad:choice('Quellpfad in der Tabelle.',paths),a:point('Erster externer Druckpunkt.'),b:point('Zweiter externer Druckpunkt.'),
      modellstand_passt:flag('Vergleich bezieht sich ausdrücklich auf ComfoAir Q350 TR und das geprüfte deutsche Dokument V0126.')},
    ({pfad,a,b,modellstand_passt})=>({
      ...specEvidence(),pfad,volumenstrom_m3h:250,pa_a:points[a].pa,pa_b:points[b].pa,
      lw_a_dba:modellstand_passt?points[a][pfad]:null,lw_b_dba:modellstand_passt?points[b][pfad]:null,
      lw_b_minus_a_db:modellstand_passt?round(points[b][pfad]-points[a][pfad]):null,
      hinweis:'Nur Q350 TR, V0126 S. 12–13. Druckseite = Zuluft/Fortluft, Saugseite = Abluft/Außenluft, Gehäuse = Abstrahlung. Schallleistung Lw ist kein Pegel im Aufenthaltsraum.'
    }),{pfad:'druckseite',a:'p100',b:'p200',modellstand_passt:true},
    {lw_a_dba:56.2,lw_b_dba:60.7,lw_b_minus_a_db:4.5,volumenstrom_m3h:250}),

  tool('lueftungsangebote_gemeinsame_druckpunkte_finden',
    'Findet gemeinsame dokumentierte Druckpunkte zweier Angebote am gleichen Nennvergleichsvolumenstrom — Find common recorded external pressures at one matching flow.',
    {a_flow:flow('Volumenstrom beider Punkte des Angebots A'),b_flow:flow('Volumenstrom beider Punkte des Angebots B'),
      a1:pressure('Druckpunkt A1'),a2:pressure('Druckpunkt A2'),b1:pressure('Druckpunkt B1'),b2:pressure('Druckpunkt B2'),
      externe_druckbasis_gleich:flag('Gleiche externe Druckdefinition, klare Modellstände und beide Stufen als Messpunkte belegt?')},
    ({a_flow,b_flow,a1,a2,b1,b2,externe_druckbasis_gleich})=>({
      gemeinsame_pa:externe_druckbasis_gleich&&a_flow>0&&a_flow===b_flow?
        [...new Set([a1,a2])].filter(x=>[b1,b2].includes(x)).sort((x,y)=>x-y):null,
      hinweis:'Nur belegte gemeinsame Druckpunkte auswählen. Schallpfad, Messmethode und Ausführung für den anschließenden Vergleich zusätzlich prüfen.'
    }),{a_flow:250,b_flow:250,a1:100,a2:150,b1:150,b2:200,externe_druckbasis_gleich:true},
    {gemeinsame_pa:[150]}),

  tool('q350_tr_etikett_oder_schallpfad_datenzeile',
    'Leitet von der gesuchten Geräuschgröße zur passenden Stelle der geprüften Q350-TR-Unterlage — Route a noise claim to the appropriate Q350 TR table.',
    {frage:choice('Was soll belegt werden?',['eu_produktdatenblatt','bei_druckpunkt','am_hoerplatz']),
      v0126_belegt:flag('Das Angebotsgerät und sein Quellenbezug wurden mit Q350 TR V0126 abgeglichen.')},
    ({frage,v0126_belegt})=>({
      ...specEvidence(),datenort:frage==='am_hoerplatz'?'separater_schalldruckbeleg_noetig':!v0126_belegt?null:
        frage==='eu_produktdatenblatt'?'eu_produktdatenblatt':'lw_betriebspunkttabelle',
      etikett_lwa_dba:v0126_belegt&&frage==='eu_produktdatenblatt'?41:null,
      hinweis:'Im EU-Produktdatenblatt stehen 41 dB(A) LwA. Dies ist weder ein Ersatz für die quellpfadbezogene Betriebszeile noch ein Raumwert.'
    }),{frage:'bei_druckpunkt',v0126_belegt:true},{datenort:'lw_betriebspunkttabelle',etikett_lwa_dba:null}),

  tool('q350_tr_dokumentauswahl_artikelnummer_revision',
    'Ordnet die deutsche V0126-Quellzeile nur der nachgewiesenen Q350-TR-Artikelnummer zu — Validate the documented market and exact Q350 TR article before quoting the revision.',
    {artikel:choice('Artikelnummer außen am Gerät oder im exakten Angebot.', ['471502009','471502010','andere','offen']),
      unterlage:choice('Protokollierter Quellenstand.', ['v0126_de','andere_ausgabe','nicht_abrufbar','offen']),
      markt_de:flag('Zuordnung zur deutschen Ausführung belegt?')},
    ({artikel,unterlage,markt_de})=>({
      ...specEvidence(),artikel_variante_quelle:unterlage==='v0126_de'&&markt_de?
        artikel==='471502009'?'q350_tr':artikel==='471502010'?'q350_tr_enthalpie':null:null,
      hinweis:'V0126 S. 4 führt 471 502 009 (TR) und 471 502 010 (TR Enthalpie). Frühere, abweichende oder nicht abrufbare Unterlagen separat führen.'
    }),{artikel:'471502010',unterlage:'v0126_de',markt_de:true},
    {artikel_variante_quelle:'q350_tr_enthalpie'}),

  tool('q350_tr_waermebereitstellung_pruefregime_lesen',
    'Liest die Wärmebereitstellung passend zum Prüfregime und zur dokumentierten Q350-TR-Ausführung — Read the recovered-heat figure under the specific published test regime and variant.',
    {art:choice('Exakt zugeordnete Ausführung.', ['tr','tr_enthalpie','unklar']),
      methode:choice('Gesuchte Auswertung aus V0126 S. 3.', ['dibt','passivhaus','andere']),
      gleiche_ausgabe:flag('Der geprüfte deutsche Quellenstand V0126 ist für diese Angabe belegt.')},
    ({art,methode,gleiche_ausgabe})=>({
      ...specEvidence(),
      waermebereitstellungsgrad_prozent:!gleiche_ausgabe||art==='unklar'||methode==='andere'?null:
        art==='tr'?91:methode==='dibt'?84:92,
      quellenbereich_m3h:!gleiche_ausgabe||art==='unklar'||methode==='andere'?null:methode==='dibt'?[50,350]:[70,270],
      hinweis:'Nur benannte Angaben mit zugehörigem Prüfregime. Unterschiedliche Prüfregime nicht mitteln oder als eigenen Jahreswert verwenden.'
    }),{art:'tr_enthalpie',methode:'passivhaus',gleiche_ausgabe:true},
    {waermebereitstellungsgrad_prozent:92,quellenbereich_m3h:[70,270]}),

  tool('lueftung_schallpfad_fassadenbeleg_oder_anlagengeraeusch',
    'Ordnet beim Lüftungsvergleich Geräusche von außen, vom Luftdurchlass und aus dem Gerätebereich getrennt ein — Identify which observed paths have evidence for exterior, terminal or equipment noise.',
    {aussen:choice('Befund zur Außenquelle im eigenen Protokoll.',['belegt','nicht_beobachtet','offen']),
      durchlass:choice('Geräusch an Luftdurchlass in dokumentierter Betriebsstufe.',['belegt','nicht_beobachtet','offen']),
      geraet:choice('Geräusch am Gerätebereich.',['belegt','nicht_beobachtet','offen'])},
    ({aussen,durchlass,geraet})=>{
      const z={aussen,durchlass,geraet};
      return {...ubaEvidence(),beobachtete_orte:Object.keys(z).filter(k=>z[k]==='belegt'),offene_orte:Object.keys(z).filter(k=>z[k]==='offen'),
        hinweis:'Beobachtete Orte belegen keine Ursache. UBA S. 15 behandelt Außenlärm und betriebliche Ventilator- oder Strömungsgeräusche getrennt.'};
    },{aussen:'belegt',durchlass:'offen',geraet:'belegt'},{beobachtete_orte:['aussen','geraet'],offene_orte:['durchlass']}),

  tool('lueftung_oktavband_daempfungsbeleg_einzelpfad',
    'Rechnet einen ausdrücklich zusammengehörigen Quellen- und Einfügungsdämmwert nur für ein einzelnes Frequenzband — Apply documented attenuation to one octave band on the same source path.',
    {quellenband_hz:num('Mittenfrequenz des belegt ungewichteten Quellenbands in Hz.',31,16000),
      daempfungsband_hz:num('Mittenfrequenz des dokumentierten Einfügungsdämmwerts in Hz.',31,16000),
      lw_band_db:db('Schallleistung im Quellenband'),daempfung_db:db('Einfügungsdämmung desselben Bands'),
      pfad_vergleichbar:flag('Derselbe Kanalpfad und dokumentiert vergleichbarer Bezug beider Werte?')},
    ({quellenband_hz,daempfungsband_hz,lw_band_db,daempfung_db,pfad_vergleichbar})=>({
      ...ubaEvidence(),bandpassung:quellenband_hz===daempfungsband_hz,
      modell_lw_band_nach_daempfung_db:pfad_vergleichbar&&quellenband_hz===daempfungsband_hz?round(lw_band_db-daempfung_db):null,
      hinweis:'Reine Einzelbandrechnung für einen dokumentierten Übertragungsweg. Strömungsgeräusch, Gehäuse, weitere Wege und Raumpegel bleiben offen.'
    }),{quellenband_hz:500,daempfungsband_hz:500,lw_band_db:56,daempfung_db:10,pfad_vergleichbar:true},
    {bandpassung:true,modell_lw_band_nach_daempfung_db:46}),

  tool('lueftung_schallanschluss_familienwert_lesart',
    'Prüft ob eine Quellenzeile zum konkreten Anschluss oder nur zu seiner Anschlussgruppe gehört — Distinguish group-level acoustic data from a separately measured port.',
    {anschluss:choice('Gesuchter Luftanschluss.',['zuluft','fortluft','abluft','aussenluft']),
      quellenbezug:choice('Bezug der vorliegenden Zeile.',['druckseite','saugseite','eigener_anschluss','gehaeuse','offen']),
      eigener_anschluss_eindeutig:flag('Bei Einzelmessung ist genau der gesuchte Anschluss dokumentiert.')},
    ({anschluss,quellenbezug,eigener_anschluss_eindeutig})=>{
      const gruppe=['zuluft','fortluft'].includes(anschluss)?'druckseite':'saugseite';
      return {...specEvidence(),anschlussgruppe:gruppe,einzelanschluss_belegt:quellenbezug==='eigener_anschluss'&&eigener_anschluss_eindeutig,
        gruppenzeile_passend:quellenbezug===gruppe,
        hinweis:'Die Zeilenüberschrift Druckseite oder Saugseite identifiziert eine Anschlussgruppe. Daraus keine getrennte Messung an beiden Ports ableiten.'};
    },{anschluss:'fortluft',quellenbezug:'druckseite',eigener_anschluss_eindeutig:false},
    {anschlussgruppe:'druckseite',einzelanschluss_belegt:false,gruppenzeile_passend:true}),

  tool('lueftung_lw_raumangebot_belegluecken',
    'Ermittelt welche Belege fehlen, wenn ein Angebotswert für den eigenen Aufenthaltsraum verwendet werden soll — Find missing evidence for applying a catalogue sound figure to an occupied room.',
    {dokument:choice('Wert im Angebot.',['schallleistung','raum_schalldruck','unklar']),
      messort:flag('Der betroffene Raum und definierte Aufenthaltsmesspunkt sind im Beleg enthalten.'),
      betriebsfall:flag('Bedarfsvolumenstrom, Anlagenzustand und gewählte Messdauer sind im Beleg benannt.')},
    ({dokument,messort,betriebsfall})=>({
      ...ubaEvidence(),ausstehend:[...dokument!=='raum_schalldruck'?['bezugsart']:[],...!messort?['messort']:[],...!betriebsfall?['betriebsfall']:[]],
      hinweis:'Eine auf den Raum bezogene Messung oder fachliche Auslegung ist getrennt einzuholen. Keine Umrechnung einer Geräte-Schallleistung in den eigenen Schalldruck.'
    }),{dokument:'schallleistung',messort:false,betriebsfall:true},{ausstehend:['bezugsart','messort']}),

  tool('lueftung_betriebspunkt_datenform_zwischenwert',
    'Prüft ob der angefragte Druckpunkt exakt dokumentiert oder nur zwischen benachbarten Zeilen liegt — Determine whether a requested pressure point has a direct documented match.',
    {anfrage_pa:pressure('Externer Druck in der Anfrage'),untere_pa:pressure('Niedrigerer dokumentierter Druckpunkt'),
      obere_pa:pressure('Höherer dokumentierter Druckpunkt'),gleicher_luftstrom:flag('Beide Werte gelten beim gewünschten Volumenstrom und in derselben Variante.')},
    ({anfrage_pa,untere_pa,obere_pa,gleicher_luftstrom})=>{
      if(untere_pa>=obere_pa)throw new RangeError('Druckpunkte aufsteigend und ohne Gleichstand angeben.');
      const status=anfrage_pa===untere_pa||anfrage_pa===obere_pa?'dokumentierter_punkt':
        anfrage_pa>untere_pa&&anfrage_pa<obere_pa?'zwischen_belegen':'ausserhalb_beider_belege';
      return {nachweis:gleicher_luftstrom?status:null,hinweis:'Zwischenpunkte sind keine Messwerte. Keine Luftmengen- oder Schallleistung aus den Randpunkten als belegt ausgeben.'};
    },{anfrage_pa:125,untere_pa:100,obere_pa:150,gleicher_luftstrom:true},{nachweis:'zwischen_belegen'}),

  tool('comfoair_q_handbuch_nutzerpflege_oder_fachservice',
    'Ordnet eine konkrete Anfrage zur Bedienerpflege oder zum Fachservice der passenden Handbuchstelle zu — Route a recorded care request to the user manual or professional service.',
    {aufgabe:choice('Gewünschte Tätigkeit.',['geraetefilter_ersetzen','sichtgitter_reinigen','waermetauscher_inspektion','ventilatoren_inspektion','interner_bypass_service','offen']),
      ausgabe_passt:flag('Externe Gerätekennzeichnung und diese Ausgabe der deutschen Q-Benutzeranleitung passen zusammen.')},
    ({aufgabe,ausgabe_passt})=>({
      ...manualEvidence(),zustaendigkeit:!ausgabe_passt||aufgabe==='offen'?null:
        ['geraetefilter_ersetzen','sichtgitter_reinigen'].includes(aufgabe)?'anwenderpflege_laut_handbuch':'fachhandwerker',
      hinweis:'Kapitel 5 und Wartungsprotokoll trennen Aufgaben. Die Zuordnung enthält keine Eingriffsanleitung. Service im Geräteinneren ist keine Filterpflege.'
    }),{aufgabe:'waermetauscher_inspektion',ausgabe_passt:true},{zustaendigkeit:'fachhandwerker'}),

  tool('q350_tr_filterpaar_bestellcode_quellenabgleich',
    'Ordnet zwei belegte Filterset-Kennungen ihrer dokumentierten Zusammensetzung zu — Read the documented filter-pair composition for one exact part number.',
    {set:choice('Kennung des geprüften Zweier-Sets.', ['400502012','400502013','andere','offen']),
      genaue_zuordnung:flag('Gerät, Deutschland-Ausführung, Quellenstand und tatsächliche Bestellkennung abgeglichen?')},
    ({set,genaue_zuordnung})=>({
      ...specEvidence(),bestandteile:!genaue_zuordnung?null:set==='400502012'?
        ['iso_coarse_ge65','iso_coarse_ge65']:set==='400502013'?['iso_coarse_ge65','iso_epm1_ge65']:null,
      hinweis:'V0126 S. 4. Angegeben wird nur der Inhalt des Sets, ohne eine Einbaurichtung oder eine Nachrüstfreigabe abzuleiten.'
    }),{set:'400502013',genaue_zuordnung:true},{bestandteile:['iso_coarse_ge65','iso_epm1_ge65']}),

  tool('lueftung_zwei_filterklappen_persoenlicher_zugang',
    'Vergleicht den tatsächlich zugänglichen Spielraum vor beiden Nutzer-Filterzugängen mit der jeweiligen Dokumentation — Assess a documented user access margin at each filter opening.',
    {links_frei:length('Beobachtete freie Strecke vor Zugang A'),rechts_frei:length('Beobachtete freie Strecke vor Zugang B'),
      links_noetig:length('Dokumentierte erforderliche freie Strecke vor A'),rechts_noetig:length('Dokumentierte erforderliche freie Strecke vor B'),
      anleitung_zugriff_passt:flag('Beide Strecken beziehen sich auf den identisch dokumentierten Nutzerzugriff, ohne Gerätegehäuse zu öffnen.')},
    ({links_frei,rechts_frei,links_noetig,rechts_noetig,anleitung_zugriff_passt})=>({
      ...manualEvidence(),zugang_a_reserve_mm:anleitung_zugriff_passt?round(links_frei-links_noetig):null,
      zugang_b_reserve_mm:anleitung_zugriff_passt?round(rechts_frei-rechts_noetig):null,
      hinweis:'Nur zwei vorhandene Angaben zum Zugriff vergleichen. Genügend Platz am sichtbaren Filterzugang bescheinigt keine Montage- oder Wartungseignung.'
    }),{links_frei:210,rechts_frei:140,links_noetig:180,rechts_noetig:180,anleitung_zugriff_passt:true},
    {zugang_a_reserve_mm:30,zugang_b_reserve_mm:-40}),

  tool('q350_tr_filterwarnung_nicht_auf_kalendertage_rechnen',
    'Trennt den beobachteten Hinweis vom kalendarischen Pflegeeintrag bei einem nutzungsabhängigen Zähler — Separate a flow-dependent filter alert from a calendar service record.',
    {meldung:choice('Direkt beobachteter Hinweis.',['filterwechsel','kein_hinweis','offen']),
      letzter_wechsel:choice('Separater Nachweis für den letzten Wechsel.',['dokumentiert','offen']),
      stand_v0126:flag('Für das Gerät ist der genannte V0126-Funktionsbeleg einschlägig.')},
    ({meldung,letzter_wechsel,stand_v0126})=>({
      ...specEvidence(),warnung_allein_als_kalenderbeleg:stand_v0126?false:null,
      wartungsnachweis_offen:letzter_wechsel==='offen',meldung,
      hinweis:'Laut V0126 S. 8 berücksichtigt die Anzeige Zeit und transportierte Luftmenge. Eine angezeigte oder fehlende Meldung datiert weder den letzten Filterwechsel noch die verbleibende Zeit.'
    }),{meldung:'kein_hinweis',letzter_wechsel:'offen',stand_v0126:true},
    {warnung_allein_als_kalenderbeleg:false,wartungsnachweis_offen:true,meldung:'kein_hinweis'}),

  tool('q350_tr_steuerungsoption_lieferbeleg_abhaengigkeit',
    'Nennt zu einer vorgesehenen Steuerungsoption den zusätzlich nachzuweisenden Bestandteil — Check dependencies of a documented Q350 TR control option in an offer.',
    {option:choice('Gesuchte Option.',['integriertes_display','funk_rf','app','co2_sensor']),
      zusatz_im_angebot:flag('Der für diese Option belegte Zusatz ist im Angebot eindeutig enthalten.'),
      v0126_und_ausfuehrung_passt:flag('Quellenstand und deutsches Angebot sind eindeutig abgeglichen.')},
    ({option,zusatz_im_angebot,v0126_und_ausfuehrung_passt})=>{
      const belege={integriertes_display:[],funk_rf:['comfosense_c'],app:['comfoconnect_pro','internetzugang_mit_router'],co2_sensor:['option_box_v2_lite']};
      return {...specEvidence(),belegte_zusatzanforderungen:v0126_und_ausfuehrung_passt?belege[option]:null,
        zusatzangebot_pruefen:v0126_und_ausfuehrung_passt?belege[option].length>0&&!zusatz_im_angebot:null,
        hinweis:'V0126 S. 9. Optionsbeleg und tatsächlichen Lieferumfang getrennt prüfen. Keine Aussage über Nachrüstung, Netzwerkbetrieb oder Anschluss.'};
    },{option:'funk_rf',zusatz_im_angebot:false,v0126_und_ausfuehrung_passt:true},
    {belegte_zusatzanforderungen:['comfosense_c'],zusatzangebot_pruefen:true}),

  tool('lueftungsangebot_bypass_kuehlkreis_beleggrenze',
    'Prüft welche Kühlfunktion hinter einer konkreten Angebotsbeschreibung überhaupt belegt ist — Distinguish documented supply-air bypass from active cooling in an offer.',
    {bypass:flag('Angebot dokumentiert den Bypass der Wärmerückgewinnung.'),aktive_einheit:flag('Eine eigenständige aktive Kühleinheit ist für genau dieses Angebot belegt.'),
      aktive_kuehlung_ziel:flag('Die gewünschte Funktion verlangt aktiven Wärmeabtransport.')},
    ({bypass,aktive_einheit,aktive_kuehlung_ziel})=>({
      ...specEvidence(),beleg:bypass&&aktive_einheit?'beide_funktionen':aktive_einheit?'aktive_einheit':bypass?'bypass':'offen',
      aktives_ziel_weiter_pruefen:aktive_kuehlung_ziel&&!aktive_einheit,
      hinweis:'Ein Sommerbypass verändert den Wärmerückgewinnungspfad. Eine optionale Zusatzkühleinheit im Katalog ist noch kein Lieferumfang und belegt keinen Kühlbedarf.'
    }),{bypass:true,aktive_einheit:false,aktive_kuehlung_ziel:true},{beleg:'bypass',aktives_ziel_weiter_pruefen:true}),

  tool('q350_tr_aufstellraum_messbereich_quellenabgleich',
    'Spiegelt den im Aufstellraum beobachteten Temperaturbereich gegen die exakt zugeordnete Dokumentgrenze — Check measured installation-room temperatures against the matched Q350 TR data limits.',
    {min_c:num('Tiefster dokumentierter Wert im tatsächlichen Aufstellraum in °C.',-35,60),
      max_c:num('Höchster dokumentierter Wert im Aufstellraum in °C.',-35,80),
      innen_gemessen:flag('Tatsächlich am vorgesehenen Aufstellort beobachtet, nicht Außenwetter.'),
      v0126_passt:flag('Exakte deutsche Q350-TR-Ausführung und V0126-Angabe bestätigt.')},
    ({min_c,max_c,innen_gemessen,v0126_passt})=>{
      if(min_c>max_c)throw new RangeError('Minimum darf Maximum nicht überschreiten.');
      const match=innen_gemessen&&v0126_passt;
      return {...specEvidence(),beobachtung_unterhalb_c:match?round(Math.max(0,7-min_c)):null,
        beobachtung_oberhalb_c:match?round(Math.max(0,max_c-40)):null,
        hinweis:'V0126 S. 2 nennt +7 bis +40 °C im Aufstellraum. Eigene Stichproben bilden nur ihren Messzeitraum ab und ersetzen keine Standortfreigabe.'};
    },{min_c:4,max_c:29,innen_gemessen:true,v0126_passt:true},{beobachtung_unterhalb_c:3,beobachtung_oberhalb_c:0}),

  tool('lueftungsangebot_abluftschlauch_frischluftweg_beleg',
    'Prüft ob für ein mobiles Angebot außer einem Abluftweg auch ein eigener Außenluft-Zuluftweg belegt ist — Verify an actual outdoor-air supply path independently of an exhaust hose.',
    {abluft:flag('Abtransport nach außen beschrieben.'),frischweg:choice('Eigener, als Außenluftzufuhr belegter Weg.',['bestaetigt','nur_umluft','nicht_angegeben']),
      fuer_raumnutzung:flag('Gehört der bestätigte Zuluftweg laut Unterlage zum betrachteten Betriebsmodus?')},
    ({abluft,frischweg,fuer_raumnutzung})=>({
      abluft_beschrieben:abluft,aussenluftzufuhr_belegt:frischweg==='bestaetigt'&&fuer_raumnutzung,
      hinweis:'Ein nach außen führender Abluftschlauch zeigt keine dokumentierte Frischluftversorgung. Aus aufgelisteten Leitungen keine tatsächliche Luftmenge ableiten.'
    }),{abluft:true,frischweg:'nicht_angegeben',fuer_raumnutzung:false},
    {abluft_beschrieben:true,aussenluftzufuhr_belegt:false}),

  tool('q350_tr_leistungsaufnahme_gleicher_volumenstrom_pruefwert',
    'Liest Leistungsaufnahme und SFP an genau einem verfügbaren Prüfpunkt für 250 m³/h — Read power and specific fan power at one documented 250 m³/h test point.',
    {druckpunkt:point('Gesuchter externer Druckpunkt.'),v0126_passt:flag('Zeile aus dem abgeglichenen deutschen Q350-TR-Dokument V0126?')},
    ({druckpunkt,v0126_passt})=>({
      ...specEvidence(),m3_h:250,pa:points[druckpunkt].pa,
      pruefaufnahme_w:v0126_passt?points[druckpunkt].watt:null,
      sfp_wh_m3:v0126_passt?points[druckpunkt].sfp:null,
      hinweis:'V0126 S. 13, dokumentierter Prüfpunkt. Kein Verbrauch der eigenen Anlage und keine Berechnung aus maximalem Luftvolumen oder Typenschild.'
    }),{druckpunkt:'p150',v0126_passt:true},{pruefaufnahme_w:71,sfp_wh_m3:0.29}),

  tool('q350_tr_etikett_regelung_sensorpaket_bezug',
    'Ordnet eine beworbene Energieklasse erst einer konkret belegten Steuerungs- und Sensorvariante zu — Check which evidence supports a control-specific energy-class claim.',
    {etikettvariante_beschrieben:flag('Etikett nennt die Steuerungsvariante.'),steuerung_im_angebot:flag('Dieselbe Steuerung ist für das Angebot belegt.'),
      sensoren_abgeglichen:flag('Erforderliches Sensorpaket ist im Angebot zugeordnet.'),
      dokumentstand_passt:flag('Exakte Geräteausführung und Datenblattausgabe stimmen überein.')},
    ({etikettvariante_beschrieben,steuerung_im_angebot,sensoren_abgeglichen,dokumentstand_passt})=>({
      ...specEvidence(),uebertragbar:etikettvariante_beschrieben&&steuerung_im_angebot&&sensoren_abgeglichen&&dokumentstand_passt,
      hinweis:'Zehnder V0126 S. 3 und S. 16–18 unterscheiden Steuerungsfälle. Hier wird keine Klasse aus dem Gerätenamen abgeleitet.'
    }),{etikettvariante_beschrieben:true,steuerung_im_angebot:true,sensoren_abgeglichen:false,dokumentstand_passt:true},
    {uebertragbar:false}),

  tool('lueftungsangebot_zuluft_abluft_doppelt_gezaehlt',
    'Prüft ob ein Summenwert Zu- und Abluft als gemeinsamen Außenluftbedarf doppelt zählen würde — Keep simultaneous supply and extract readings separate from an advertised volume sum.',
    {zuluft_m3h:flow('Separat als Außen-Zuluft nachgewiesener Volumenstrom'),
      abluft_m3h:flow('Separat erfasster Abluftstrom im selben Fall'),
      gleicher_fall:flag('Beide Angaben sind zeitgleich, gleiche Gebäudegrenze und mit getrennten Strömen belegt?')},
    ({zuluft_m3h,abluft_m3h,gleicher_fall})=>({
      aussen_zuluft_m3h:gleicher_fall?zuluft_m3h:null,
      abluft_getrennt_m3h:gleicher_fall?abluft_m3h:null,
      zu_minus_ab_m3h:gleicher_fall?round(zuluft_m3h-abluft_m3h):null,
      hinweis:'Zufuhr und Abfuhr sind zwei Seiten des Luftwechsels. Keine Addition als Frischluftmenge und keine Ableitung einer Druck- oder Anlagenfreigabe.'
    }),{zuluft_m3h:220,abluft_m3h:213,gleicher_fall:true},
    {aussen_zuluft_m3h:220,abluft_getrennt_m3h:213,zu_minus_ab_m3h:7}),

  tool('lueftung_bypass_aussen_zuluft_raum_beobachtung',
    'Vergleicht bei bestehender Anlage zeitgleiche Zuluft-, Außen- und Raumwerte im dokumentierten Bypasszustand — Separate measured supply-air, outdoor and room temperatures when a bypass is observed.',
    {draussen_c:num('Zeitgleiche Außenluftmessung in °C.',-35,65),zuluft_c:num('Tatsächliche Zulufttemperatur in °C.',-35,65),
      raum_c:num('Raumtemperatur abseits der Zuluft in °C.',-35,65),
      belege_gleich:flag('Zeitgleicher Zustand, geeignete Messorte, aktiver Bypass und kein anderer dokumentierter Kühlbetrieb?')},
    ({draussen_c,zuluft_c,raum_c,belege_gleich})=>({
      zuluft_minus_aussen_c:belege_gleich?round(zuluft_c-draussen_c):null,
      zuluft_minus_raum_c:belege_gleich?round(zuluft_c-raum_c):null,
      hinweis:'Drei eigene Messpunkte, keine Kälteleistung. Eine niedrigere Außentemperatur ist kein Ersatz für die tatsächlich gelieferte Zuluftmessung.'
    }),{draussen_c:22,zuluft_c:26,raum_c:25,belege_gleich:true},
    {zuluft_minus_aussen_c:4,zuluft_minus_raum_c:1}),

  tool('q350_tr_enthalpie_feuchterueckgewinnung_fehlfeld',
    'Unterscheidet eine belegte Feuchterückgewinnung im Prüfblatt von einem nicht angegebenen Feld — Keep measured moisture recovery separate from missing figures in the device’s tested configurations.',
    {variante:choice('Eindeutige Artikelvariante.',['tr','tr_enthalpie','unklar']),
      methode:choice('Dokumentierte Prüfung für den gewünschten Wert.',['passivhaus','andere','offen']),
      passend:flag('Exakte deutsche Artikelvariante und V0126 sind belegt.')},
    ({variante,methode,passend})=>({
      ...specEvidence(),pruefwert_feuchterueckgewinnung_prozent:passend&&methode==='passivhaus'&&variante==='tr_enthalpie'?78:null,
      quellenfeld:!passend||methode!=='passivhaus'||variante==='unklar'?'offen':variante==='tr'?'nicht_angegeben':'belegt',
      hinweis:'V0126 S. 3 nennt 78 % für das Enthalpie-Modell im Passivhaus-Block. Für TR bleibt das Feld leer. Damit ist kein Raumfeuchteverlauf belegt.'
    }),{variante:'tr',methode:'passivhaus',passend:true},
    {pruefwert_feuchterueckgewinnung_prozent:null,quellenfeld:'nicht_angegeben'}),

  tool('lueftung_wechselrichtung_zyklus_zuluftanteil',
    'Bezieht einen belegten Zuluftwert im dokumentierten Richtungswechsel auf den vollständigen Zyklus — Calculate a measured alternate-direction supply rate over the entire operating cycle.',
    {phase_m3h:flow('Gemessener mittlerer Außen-Zuluftstrom nur in der Zuluftphase'),
      zuluft_sek:num('Dauer dieser Zuluftphase in Sekunden.',0,86400),
      zyklus_sek:num('Voller Zyklus einschließlich anderer Richtung und Pausen in Sekunden.',1,86400),
      einzelstrom_belegt:flag('Dokumentierter Wechsellauf einer einzelnen Einheit, in übrigen Phasen keine Zuluft dieser Einheit?')},
    ({phase_m3h,zuluft_sek,zyklus_sek,einzelstrom_belegt})=>{
      if(zuluft_sek>zyklus_sek)throw new RangeError('Zuluftphase darf nicht länger als der Zyklus sein.');
      return {dokumentierte_zuluft_m3h_im_zyklus:einzelstrom_belegt?round(phase_m3h*zuluft_sek/zyklus_sek):null,
        hinweis:'Nur zeitliches Mittel für diese Einheit und den gemessenen Zyklus. Kein Aufsummieren mehrerer Einheiten oder Nachweis des Wohnungsbedarfs.'};
    },{phase_m3h:40,zuluft_sek:30,zyklus_sek:70,einzelstrom_belegt:true},
    {dokumentierte_zuluft_m3h_im_zyklus:17.14}),
];
