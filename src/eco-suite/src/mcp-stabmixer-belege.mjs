const PAGE = '/produkte.html';
const BSH = 'https://media3.bsh-group.com/Documents/';
const BOSCH = 'https://www.bosch-home.com/de/de/';
const BRAUN = 'https://www.braunhousehold.com/de-de/';
const oldBosch = BSH + '8001057006_B.pdf';
const newBosch = BSH + '8001159548_B.pdf';
const boschChop = BSH + '8001152528_B.pdf';
const vacuum = BSH + '8001160141_A.pdf';
const braun5 = BRAUN + 's/4191-MQ5235WH';
const braun7 = BRAUN + 's/MQ7035XBI';
const braunAccessories = BRAUN + 'c/essenszubereitung/stabmixer/stabmixeraufsatze-und--zubehor';

const boschModels = {
  'MSM67170/02': {service: BOSCH + 'productservice/MSM67170-02', manual: oldBosch, bundle: BSH + 'specsheet/de-DE/MSM67170.pdf',
    parts: ['edelstahl_mixfuss','mixbecher','schneebesen','zerkleinerer','ice_crush_messer','spiralkabel']},
  'MS6CA4150/02': {service: BOSCH + 'productservice/MS6CA4150-02', manual: newBosch, bundle: BSH + 'specsheet/de-DE/MS6CA4150.pdf',
    parts: ['edelstahl_mixfuss','mixbecher','schneebesen','zerkleinerer','deckel']},
  'MS6CB61V1/01': {service: BOSCH + 'productservice/MS6CB61V1-01', manual: newBosch, bundle: BSH + 'specsheet/de-DE/MS6CB61V1.pdf',
    parts: ['edelstahl_mixfuss','mixbecher','deckel','vakuumpumpe','vakuum_zip_beutel','vakuumbehaelter']}
};
const boschNames = Object.keys(boschModels);
const braunNames = ['4191-MQ5235WH','MQ7035XBI'];
const boschModel = (description = 'Vollständige deutsche Bosch E-Nr. einschließlich Index.') => choice(description,[...boschNames,'offen']);
const braunModel = (description = 'Exaktes Gerät der deutschen Braun Unterlage.') => choice(description,[...braunNames,'offen']);
const yes = description => ({type:'boolean',description});
const choice = (description, values) => ({type:'string',description,enum:values});
const number = (description, maximum, minimum = 0) => ({type:'number',description,minimum,maximum});
const check = description => choice(description,['ja','nein','offen']);
const braunSource = model => model === braunNames[0] ? braun5 : model === braunNames[1] ? braun7 : null;
const afterUse = 'Nur bereits beobachtete Zustände verwenden. Vor Abnehmen, Reinigen oder Zubehörwechsel gelten Netztrennung und vollständiger Stillstand nach der Geräteanleitung.';
const scope = 'Deutsche Herstellerunterlage zur angegebenen Ausführung. Angaben eines Familienhandbuchs sind kein Nachweis für mitgelieferte Teile.';
function task(name, description, properties, calculate, args, expect) {
  return {name, description, page:PAGE, properties, calculate, example:{args,expect}};
}

export const stabmixerBelege = [
  task('bosch_ergomixx_e_nummer_ausfuehrung_handbuch',
    'Ordnet einer vollständig abgelesenen deutschen Bosch ErgoMixx E-Nr. die Anleitung und Service-Seite zu (MSM67170/02, MS6CA4150/02, MS6CB61V1/01) — Route a full German Bosch ErgoMixx E-number to the correct manual and service page.',
    {e_nummer:boschModel(),typenschild_exakt:yes('Grundmodell und Index sind am Typenschild der konkreten Einheit geprüft.')},
    ({e_nummer,typenschild_exakt})=>{
      const row=typenschild_exakt ? boschModels[e_nummer] : null;
      return {e_nummer_zugeordnet:row?e_nummer:null,originalquelle_url:row?.service??null,
        handbuch_url:row?.manual??null,hinweis:'Grundmodell, Serienname oder Produktfoto allein bestimmen die Ausführung nicht.'};
    },{e_nummer:'MSM67170/02',typenschild_exakt:true},
    {e_nummer_zugeordnet:'MSM67170/02',originalquelle_url:BOSCH+'productservice/MSM67170-02',handbuch_url:oldBosch}),

  task('bosch_ergomixx_set_lieferumfang_zubehoerrolle',
    'Liest den deutschen Bosch ErgoMixx Listen-Lieferumfang für die gewählte Zubehörrolle — Check the listed accessory role in an exact German Bosch ErgoMixx bundle.',
    {e_nummer:boschModel(),teil:choice('Teil, dessen Lieferumfang geprüft wird.',['edelstahl_mixfuss','mixbecher','deckel','schneebesen',
      'zerkleinerer','ice_crush_messer','spiralkabel','vakuumpumpe','vakuum_zip_beutel','vakuumbehaelter']),
      originalangebot:yes('Verglichen wird das veröffentlichte Bosch Set, nicht der Bestand einer gebrauchten Schachtel.')},
    ({e_nummer,teil,originalangebot})=>{
      const row=boschModels[e_nummer];
      return {im_hersteller_lieferumfang_genannt:row?.parts.includes(teil)??null,
        im_konkreten_angebot_belegt:null,besichtigung_noetig:!originalangebot,originalquelle_url:row?.bundle??null,
        hinweis:'Die veröffentlichte Lieferliste beschreibt das ursprüngliche Set. Bei einem konkreten Gebrauchtangebot den tatsächlichen Inhalt separat bestätigen.'};
    },{e_nummer:'MS6CB61V1/01',teil:'zerkleinerer',originalangebot:false},
    {im_hersteller_lieferumfang_genannt:false,im_konkreten_angebot_belegt:null,besichtigung_noetig:true}),

  task('bosch_ergomixx_mixfuss_oder_universalzerkleinerer_aufgabe',
    'Ordnet gekochtes Mixgut und ausdrücklich genanntes rohes Hackgut dem Bosch Mixfuß oder Universalzerkleinerer zu — Route cooked blending and named raw chopping jobs to the appropriate Bosch attachment.',
    {e_nummer:boschModel(),aufgabe:choice('In der Bosch Anleitung unterschiedene Aufgabe.',['suppe_puerieren','gekochtes_gemuese_puerieren',
      'rohe_zwiebeln_hacken','rohen_knoblauch_hacken','kraeuter_hacken','andere_aufgabe']),
      aufsatz_im_haushalt_belegt:yes('Der zugeordnete Aufsatz ist konkret und vollständig vorhanden.')},
    ({e_nummer,aufgabe,aufsatz_im_haushalt_belegt})=>{
      const row=boschModels[e_nummer];
      const werkzeug=row&&aufgabe!=='andere_aufgabe'?(aufgabe.endsWith('_hacken')?'universalzerkleinerer':'mixfuss'):null;
      return {zugeordnetes_werkzeug:werkzeug,originalquelle_url:row?.manual??null,
        vorhandener_aufsatz_belegt:werkzeug?aufsatz_im_haushalt_belegt:null,hinweis:scope};
    },{e_nummer:'MS6CA4150/02',aufgabe:'rohe_zwiebeln_hacken',aufsatz_im_haushalt_belegt:false},
    {zugeordnetes_werkzeug:'universalzerkleinerer',vorhandener_aufsatz_belegt:false}),

  task('bosch_mixfuss_ersatzgefaess_boden_und_behaelterrolle',
    'Prüft, ob ein Ersatzgefäß beim Bosch Mixfuß einen ebenen Boden hat und kein Universalzerkleinerer-Behälter ist — Check the bottom and vessel role before using another vessel with the Bosch blending shaft.',
    {e_nummer:boschModel(),gefaess:choice('Konkreter Behälter.',['mixbecher','anderes_hohes_gefaess','universalzerkleinerer_behaelter','offen']),
      boden:choice('Von außen oder ohne Betrieb dokumentierter Innenboden.',['eben','absatz_oder_erhebung','offen'])},
    ({e_nummer,gefaess,boden})=>({teilbefund:!boschModels[e_nummer]?'modell_offen':gefaess==='universalzerkleinerer_behaelter'?'verworfen_fuer_mixfuss':
      boden==='absatz_oder_erhebung'?'boden_ausgeschlossen':gefaess==='offen'||boden==='offen'?'behaelterbezug_offen':'genannte_teilbedingungen_erfuellt',
      originalquelle_url:boschModels[e_nummer]?.manual??null,hinweis:'Die Anleitung erlaubt geeignete andere hohe Gefäße mit ebenem Boden. Höhe, Form, Inhalt und Herstellerangaben zum jeweiligen Gefäß bleiben eigene Voraussetzungen.'}),
    {e_nummer:'MS6CA4150/02',gefaess:'anderes_hohes_gefaess',boden:'absatz_oder_erhebung'},{teilbefund:'boden_ausgeschlossen'}),

  task('stabmixer_heisses_mixgut_temperatur_und_kochstelle',
    'Vergleicht gemessene Temperatur und Kochstellenstatus für die betrachtete Bosch oder Braun Pürieranwendung — Compare measured ingredient temperature and hob status with the exact Bosch or Braun blending guidance.',
    {geraet:choice('Geprüfte Anwendung mit Pürierstab.',['bosch_msm67170_02','bosch_ms6ca4150_02','braun_mq7035xbi','offen']),
      temperatur_gemessen:yes('Temperatur des konkreten Mixguts vor dem Verarbeiten gemessen.'),
      anwendungsfall_belegt:yes('Bosch: zuvor kochendes Mixgut. Braun: vorliegende Pürieranwendung wie in Abschnitt A.'),
      temperatur_c:number('Gemessene Temperatur in °C, bei fehlender Messung Platzhalter 0.',140),
      gefaess:choice('Konkretes Gefäß.',['kochtopf_auf_kochstelle','kochtopf_von_kochstelle_genommen','geeigneter_andere_behaelter','offen'])},
    ({geraet,temperatur_gemessen,anwendungsfall_belegt,temperatur_c,gefaess})=>{
      const limit=geraet==='offen'||!anwendungsfall_belegt?null:geraet==='braun_mq7035xbi'?70:80;
      const url=geraet==='bosch_msm67170_02'?oldBosch:geraet==='bosch_ms6ca4150_02'?newBosch:geraet==='braun_mq7035xbi'?braun7:null;
      return {anleitungsgrenze_c:limit,temperatur_im_genannten_rahmen:temperatur_gemessen&&limit!==null?temperatur_c<=limit:null,
        kochstellenbefund:gefaess==='kochtopf_auf_kochstelle'?'auf_kochstelle_gemeldet':gefaess==='offen'?'offen':'keine_aktive_kochstelle_gemeldet',
        originalquelle_url:url,hinweis:'Bosch nennt 80 °C oder weniger für zuvor kochendes Mixgut und verlangt beim Pürieren im Topf, ihn von der Kochstelle zu nehmen. Braun zeigt im Abschnitt A für den Pürierstab 70 °C. Der Vergleich prüft nur dokumentierte Teilbedingungen.'};
    },{geraet:'braun_mq7035xbi',temperatur_gemessen:true,anwendungsfall_belegt:true,temperatur_c:74,gefaess:'kochtopf_von_kochstelle_genommen'},
    {anleitungsgrenze_c:70,temperatur_im_genannten_rahmen:false}),

  task('bosch_msm67170_eis_crush_l_messer_und_menge',
    'Vergleicht beim Bosch MSM67170 die dokumentierte L-Zerkleinerer-Eiskombination und die Herstellerportion — Check the documented Bosch L chopper ice-blade setup and example portion for the MSM67170.',
    {e_nummer_bestaetigt:yes('Vollständige E-Nr. MSM67170/02 abgelesen.'),
      behaelter:choice('Aufsatz der vorhandenen Zubehörunterlage.',['L','XL','offen']),
      messer:choice('Tatsächlich dokumentiertes Originalmesser.',['ice_crush_L','universalmesser','offen']),
      wuerfel:number('Gezählte Eiswürfel.',50),gesamt_g:number('Gemessene Gesamtmasse der Würfel in Gramm.',1000)},
    ({e_nummer_bestaetigt,behaelter,messer,wuerfel,gesamt_g})=>{
      if(!Number.isInteger(wuerfel))throw new RangeError('Eiswürfel ganzzahlig zählen.');
      const known=e_nummer_bestaetigt&&behaelter!=='offen'&&messer!=='offen';
      const match=known ? behaelter==='L'&&messer==='ice_crush_L' : null;
      return {eiskombination_zugeordnet:match,max_g:match?100:null,
        portion_im_herstellerbeispiel:match?wuerfel>=4&&wuerfel<=6&&gesamt_g>0&&gesamt_g<=100:null,
        originalquelle_url:boschChop,hinweis:'Die Bosch Zubehöranleitung nennt als optimale Portion 4–6 Würfel mit zusammen höchstens 100 g. Der Vergleich gilt für L mit Eis-Crush-Messer, bei XL Vario gilt die eigene Anleitung.'};
    },{e_nummer_bestaetigt:true,behaelter:'L',messer:'ice_crush_L',wuerfel:5,gesamt_g:95},
    {eiskombination_zugeordnet:true,max_g:100,portion_im_herstellerbeispiel:true}),

  task('bosch_msm67170_abschalten_ueberlast_wartezeit',
    'Ordnet beim bestätigten Bosch MSM67170 eine Abschaltung während der Nutzung der Abkühlangabe im Handbuch zu — Read the manual’s cooling interval for a confirmed Bosch MSM67170 shutdown during use.',
    {modell_bestaetigt:yes('Konkretes Gerät als MSM67170/02 bestätigt.'),
      ereignis:choice('Beobachtetes Ereignis.',['schaltete_waehrend_nutzung_ab','startete_von_anfang_an_nicht','anderer_fehler']),
      minuten_seit_aus_und_getrennt:number('Beobachtete Minuten seit Ausschalten und Netztrennung.',1440)},
    ({modell_bestaetigt,ereignis,minuten_seit_aus_und_getrennt})=>{
      const applies=modell_bestaetigt&&ereignis==='schaltete_waehrend_nutzung_ab';
      return {ungefaehre_handbuchpause_min:applies?60:null,
        richtzeit_erreicht:applies?minuten_seit_aus_und_getrennt>=60:null,originalquelle_url:oldBosch,
        hinweis:'Das Handbuch nennt für diese Beobachtung bei MSM67 ungefähr eine Stunde Abkühlen. Erneute Ausfälle mit Bosch klären. Die Wartezeit allein diagnostiziert keinen Defekt und bestätigt keinen unbedenklichen Neustart.'};
    },{modell_bestaetigt:true,ereignis:'schaltete_waehrend_nutzung_ab',minuten_seit_aus_und_getrennt:32},
    {ungefaehre_handbuchpause_min:60,richtzeit_erreicht:false}),

  task('bosch_ms6cb61v1_vakuumbox_volumen_quellenkonflikt',
    'Zeigt die widersprüchliche Volumenangabe für die mitgelieferte Bosch MS6CB61V1 Vakuumbox — Surface the conflicting container capacities in the Bosch MS6CB61V1 German spec sheet.',
    {modell_bestaetigt:yes('Das vorliegende Gerät oder Produktblatt gehört zum deutschen MS6CB61V1.'),
      gegenstand:choice('Verlangte Kapazitätsangabe.',['mitgelieferte_vakuumbox','mix_messbecher','andere_box'])},
    ({modell_bestaetigt,gegenstand})=>{
      const applies=modell_bestaetigt&&gegenstand==='mitgelieferte_vakuumbox';
      return {lieferliste_seite_1_l:applies?1.2:null,abschnitt_vielfalt_seite_2_l:applies?1:null,
        eindeutiges_nennvolumen_l:null,originalquelle_url:boschModels['MS6CB61V1/01'].bundle,
        hinweis:'Bosch nennt in der Lieferliste 1,2 l und im Abschnitt Vielfalt 1,0 l. Für einen bestimmten Behälter dessen eigene Kennzeichnung und vollständige Artikelkennung prüfen.'};
    },{modell_bestaetigt:true,gegenstand:'mitgelieferte_vakuumbox'},
    {lieferliste_seite_1_l:1.2,abschnitt_vielfalt_seite_2_l:1,eindeutiges_nennvolumen_l:null}),

  task('bosch_mixfuss_trocknen_lagerung_befund',
    'Erfasst, ob ein gereinigter Bosch Mixfuß gemäß seiner Anleitung aufrecht abtropfte und anschließend trocken beobachtet wurde — Record upright draining and subsequent dryness separately for a Bosch blending shaft.',
    {e_nummer:boschModel(),aufrecht_messer_oben:check('Abtropfposition aufrecht mit Messer nach oben belegt?'),
      trockenheit_beobachtet:check('Anschließend als trocken beobachtet?')},
    ({e_nummer,aufrecht_messer_oben,trockenheit_beobachtet})=>({originalquelle_url:boschModels[e_nummer]?.manual??null,
      dokumentierter_trocknungsbefund:e_nummer==='offen'||[aufrecht_messer_oben,trockenheit_beobachtet].includes('offen')?null:
        aufrecht_messer_oben==='ja'&&trockenheit_beobachtet==='ja',
      hinweis:'Bosch nennt die aufrechte Abtropfposition, damit Wasser herauslaufen kann. Die Anleitung nennt hierfür keine pauschale Minutenzahl. '+afterUse}),
    {e_nummer:'MS6CA4150/02',aufrecht_messer_oben:'ja',trockenheit_beobachtet:'offen'},
    {dokumentierter_trocknungsbefund:null}),

  task('stabmixer_aufsatzwechsel_stillstand_netztrennung',
    'Klärt, ob Stillstand und Netztrennung für einen dokumentierten gewöhnlichen Aufsatzwechsel getrennt belegt sind — Check that both a stopped drive and disconnection are documented before an attachment change.',
    {geraet:choice('Belegte Anleitung.',['bosch_msm67170','braun_mq7035xbi','offen']),
      stillstand:check('Vollständiger Stillstand laut vorhandener Beobachtung?'),
      netz_getrennt:check('Netzstecker war laut vorhandener Beobachtung gezogen?')},
    ({geraet,stillstand,netz_getrennt})=>({dokumentationsstatus:geraet==='offen'?'modell_offen':
      stillstand==='nein'||netz_getrennt==='nein'?'wechsel_zurueckstellen':
      stillstand==='ja'&&netz_getrennt==='ja'?'beide_voraussetzungen_belegt':'voraussetzung_offen',
      originalquelle_url:geraet==='bosch_msm67170'?oldBosch:geraet==='braun_mq7035xbi'?braun7:null,
      hinweis:afterUse+' Diese Angaben betreffen nur den vorgesehenen Aufsatzwechsel in der Anleitung.'}),
    {geraet:'bosch_msm67170',stillstand:'ja',netz_getrennt:'nein'},{dokumentationsstatus:'wechsel_zurueckstellen'}),

  task('bosch_ergomixx_fresh_vakuum_behaelter_oder_beutel_anzeige',
    'Unterscheidet die dokumentierten Vakuummerkmale beim Bosch Fresh-Behälter und Zip-Beutel — Distinguish the manual’s different vacuum indicators for a Bosch Fresh container and zip bag.',
    {modell_bestaetigt:yes('Bosch MS6CB61V1/01 und das zugehörige Fresh-System sind belegt.'),
      behaeltertyp:choice('Komponente der Anleitung.',['fresh_behaelter','fresh_zip_beutel','offen']),
      beobachtung:choice('Bereits beobachtetes Merkmal.',['anzeige_innen_gewoelbt','beutel_liegt_am_inhalt','fluessigkeit_nahe_max_linie','offen'])},
    ({modell_bestaetigt,behaeltertyp,beobachtung})=>({zuordnung:!modell_bestaetigt||behaeltertyp==='offen'||beobachtung==='offen'?null:
      behaeltertyp==='fresh_behaelter'&&beobachtung==='anzeige_innen_gewoelbt'?'anzeige_am_behaelter':
      behaeltertyp==='fresh_zip_beutel'&&beobachtung==='beutel_liegt_am_inhalt'?'beutelmerkmal':
      behaeltertyp==='fresh_zip_beutel'&&beobachtung==='fluessigkeit_nahe_max_linie'?'fluessigkeitsgrenze_beachten':'anderer_bezug',
      originalquelle_url:vacuum,hinweis:'Die Merkmale sind an den konkreten Bosch Behälter beziehungsweise Zip-Beutel gebunden. Aus dem Befund folgen keine Lagerdauer und keine Aussage zur Lebensmittelsicherheit.'}),
    {modell_bestaetigt:true,behaeltertyp:'fresh_zip_beutel',beobachtung:'anzeige_innen_gewoelbt'},{zuordnung:'anderer_bezug'}),

  task('bosch_ergomixx_fresh_zipbeutel_vorinhalt_wiederverwendung',
    'Berücksichtigt beim Bosch Fresh Zip-Beutel den dokumentierten Vorinhalt und den Reinigungs- und Trocknungsstatus — Read Bosch Fresh bag reuse limits from recorded previous contents, cleaning and drying.',
    {system_bestaetigt:yes('Original Bosch Fresh Zip-Beutel aus der passenden Zubehöranleitung bestätigt.'),
      vorinhalt:choice('Dokumentierte vorherige Lagerung.',['rohes_fleisch_fisch_gefluegel','anderer_bekannter_inhalt','offen']),
      sauber_und_vollstaendig_trocken:check('Sorgfältige Reinigung und vollständiges Trocknen vor erneuter Nutzung dokumentiert?')},
    ({system_bestaetigt,vorinhalt,sauber_und_vollstaendig_trocken})=>({handbuchbefund:!system_bestaetigt||vorinhalt==='offen'?'offen':
      vorinhalt==='rohes_fleisch_fisch_gefluegel'?'laut_bosch_nicht_wiederverwenden':
      sauber_und_vollstaendig_trocken==='ja'?'genannte_reinigungsbedingung_belegt':'reinigung_oder_trocknung_offen',
      originalquelle_url:vacuum,hinweis:'Nur die Bosch Pflegeangabe für diese Beutel. Ein bekannter abweichender Vorinhalt macht keine Aussage zum hygienischen Zustand.'}),
    {system_bestaetigt:true,vorinhalt:'rohes_fleisch_fisch_gefluegel',sauber_und_vollstaendig_trocken:'ja'},
    {handbuchbefund:'laut_bosch_nicht_wiederverwenden'}),

  task('bosch_ergomixx_fresh_vitamaxx_behaelter_kompatibilitaet',
    'Liest den ausdrücklich genannten VitaMaxx Zubehörbestand in der Bosch ErgoMixx Fresh Anleitung — Look up the VitaMaxx accessories explicitly listed for Bosch ErgoMixx Fresh.',
    {system_bestaetigt:yes('Bosch ErgoMixx Fresh MS6CB61V1/01 mit originaler Pumpe belegt.'),
      artikel:choice('Exakte Bosch Artikelkennung aus dem Angebot.',['MMZV0BT1','MMZV0SB0','MMZV0SB1','MMZV0SB2','anderer_vitamaxx_artikel','offen'])},
    ({system_bestaetigt,artikel})=>{
      const items={MMZV0BT1:['to_go_flasche',[0.5]],MMZV0SB0:['runder_behaelter',[0.75]],
        MMZV0SB1:['runder_behaelter',[1.5]],MMZV0SB2:['zwei_runde_behaelter',[0.75,1.5]]};
      const row=system_bestaetigt?items[artikel]:null;
      return {explizit_genannt:row?true:null,rolle:row?.[0]??null,deklarierte_groessen_l:row?.[1]??null,
        originalquelle_url:vacuum,hinweis:'Bosch nennt diese vier VitaMaxx Zubehörpositionen als kompatibel mit ErgoMixx Fresh. Das Handbuch überträgt die Angabe nicht auf ungenannte Teile.'};
    },{system_bestaetigt:true,artikel:'MMZV0SB2'},{explizit_genannt:true,rolle:'zwei_runde_behaelter',deklarierte_groessen_l:[0.75,1.5]}),

  task('braun_mq30_mqs230_kupplung_wellenschnitt_gerade',
    'Vergleicht die konkrete Braun Kupplung von 500-ml-MQ 30 und MQS 230 nach Wellenschnitt oder geradem Anschluss — Compare the actual coupling profile of the Braun MQ 30 and MQS 230 choppers.',
    {motor:braunModel(),motoranschluss:choice('Für die eigene Motoreinheit bestätigter Anschluss.',['wellenschnitt','gerade','offen']),
      zubehoer:choice('Exakte Braun Zubehörkennung.',['MQ30BK','MQ30WH','MQS230BK','offen'])},
    ({motor,motoranschluss,zubehoer})=>{
      const expected=zubehoer==='offen'?null:zubehoer==='MQS230BK'?'gerade':'wellenschnitt';
      const basis=motor==='4191-MQ5235WH'?'wellenschnitt':motor==='MQ7035XBI'?'gerade':null;
      return {zubehoeranschluss:expected,modell_und_beobachtung_stimmen:basis&&motoranschluss!=='offen'?basis===motoranschluss:null,
        kupplungsabgleich:expected&&basis&&motoranschluss===basis?expected===motoranschluss:null,
        originalquelle_url:braunAccessories,modellquelle_url:braunSource(motor),
        hinweis:'Der Abgleich betrifft den dokumentierten Anschluss. 500 ml und ein ähnliches Aussehen belegen keinen gemeinsamen Verschluss.'};
    },{motor:'MQ7035XBI',motoranschluss:'gerade',zubehoer:'MQ30BK'},
    {zubehoeranschluss:'wellenschnitt',modell_und_beobachtung_stimmen:true,kupplungsabgleich:false}),

  task('braun_zerkleinerer_ca_mc_hc_bc_behaelterkennzeichen',
    'Ordnet Braun Zerkleinerer an ihrer Unterlagenkennung ca, mc, hc oder bc zu — Identify a Braun chopper by its documented ca, mc, hc or bc vessel code.',
    {motor:braunModel(),code:choice('Kennzeichen aus der Abbildung des konkreten Aufsatzes.',['ca','mc','hc','bc','offen'])},
    ({motor,code})=>{
      const capacities=motor==='4191-MQ5235WH'?{ca:500,hc:350,bc:1250}:motor==='MQ7035XBI'?{mc:500,hc:350}:{};
      return {nennbehaelter_ml:capacities[code]??null,materialmenge_aus_nennwert_belegt:false,originalquelle_url:braunSource(motor),
        hinweis:'Ein Nennvolumen ist keine Zutatenmenge. Die Aufsatzkennung ist handbuchbezogen und die Tabelle ersetzt die Prüfung des Lieferumfangs nicht.'};
    },{motor:'4191-MQ5235WH',code:'ca'},{nennbehaelter_ml:500,materialmenge_aus_nennwert_belegt:false}),

  task('braun_zerkleinerer_eis_bc_mc_und_messer_unterscheidung',
    'Unterscheidet die Eis-Freigabe in den beiden Braun Anleitungen nach Becherkennung und eigenem Eismesser — Distinguish the Braun ice-use conditions by vessel code and dedicated ice blade.',
    {motor:braunModel(),code:choice('Becherkennung der passenden Anleitung.',['ca','mc','hc','bc','offen']),
      messer:choice('Originales Messer laut genau diesem Handbuch.',['zugehoeriges_eismesser','standardmesser','offen']),
      teile_geprueft:yes('Vorhandener Aufsatz und Teilzuordnung sind dokumentiert.')},
    ({motor,code,messer,teile_geprueft})=>{
      const valid=motor==='4191-MQ5235WH'?'bc':motor==='MQ7035XBI'?'mc':null;
      return {eis_behaeltercode_laut_anleitung:valid,
        kombination_in_handbuch_genannt:valid&&code!=='offen'&&messer!=='offen'&&teile_geprueft?valid===code&&messer==='zugehoeriges_eismesser':null,
        originalquelle_url:braunSource(motor),hinweis:'MQ 5235 WH Handbuch Abschnitt C nennt nur bc mit Eismesser. MQ 7035 XBI Handbuch Abschnitt C nennt mc mit eigenem Eismesser. Ein Aufsatz aus einem Familienhandbuch belegt keinen Lieferumfang.'};
    },{motor:'4191-MQ5235WH',code:'ca',messer:'standardmesser',teile_geprueft:true},
    {eis_behaeltercode_laut_anleitung:'bc',kombination_in_handbuch_genannt:false}),

  task('braun_mq7035xbi_mc_zutatenmenge_markierung',
    'Vergleicht beim Braun mc-500-Zerkleinerer konkrete Zutatenmassen und die sichtbare Max-Markierung — Compare ingredient weights and the visible max line for the Braun mc 500 ml chopper.',
    {mc_mit_universalmesser_bestaetigt:yes('MQ 7035 XBI mit zugehörigem mc und Universalmesser bestätigt.'),
      zutat:choice('Klar abgebildete Zutat in der Tabelle.',['parmesan','kraeuter','karotten','andere']),
      masse_g:number('Gewogene Netto-Zutat in Gramm.',1500),
      max_markierung_eingehalten:check('Sichtbare Max-Markierung für diese Befüllung eingehalten?')},
    ({mc_mit_universalmesser_bestaetigt,zutat,masse_g,max_markierung_eingehalten})=>{
      const limits={parmesan:200,kraeuter:30,karotten:200};
      const limit=mc_mit_universalmesser_bestaetigt?limits[zutat]??null:null;
      return {zutatenbezogenes_max_g:limit,masse_im_tabellenrahmen:limit===null?null:masse_g>0&&masse_g<=limit,
        masse_und_markierung_belegt:limit===null||max_markierung_eingehalten==='offen'?null:
          masse_g>0&&masse_g<=limit&&max_markierung_eingehalten==='ja',originalquelle_url:braun7,
        hinweis:'Abschnitt C, S. 7 der MQ7035XBI-Anleitung. Die Masse folgt der Zutatenzeile und die Fülllinie gilt separat. Tabellenangaben setzen die gezeigte Vorbereitung voraus, z. B. bei Parmesan und Karotten Stücke von 2 cm.'};
    },{mc_mit_universalmesser_bestaetigt:true,zutat:'kraeuter',masse_g:28,max_markierung_eingehalten:'nein'},
    {zutatenbezogenes_max_g:30,masse_im_tabellenrahmen:true,masse_und_markierung_belegt:false}),

  task('braun_mq7035xbi_puerierbecher_kleinmenge_mixglocke',
    'Vergleicht bei einer kleinen Portion den dokumentierten Flüssigkeitsstand mit der Abbildung des eingetauchten Braun Pürierfußes — Compare the observed liquid level for a small batch with Braun’s immersed blending-foot illustration.',
    {originalbecher_bestaetigt:yes('Mix- und Messbecher und Pürierstab des MQ 7035 XBI sind bestätigt.'),
      stand:choice('Bereits beobachteter Füllstand bei stillstehendem und vom Netz getrenntem Gerät.',['glocke_eingetaucht','glocke_nicht_eingetaucht','nicht_beobachtet'])},
    ({originalbecher_bestaetigt,stand})=>({eintauchbefund_wie_abbildung:originalbecher_bestaetigt&&stand!=='nicht_beobachtet'?stand==='glocke_eingetaucht':null,
      mindestmenge_ml:null,originalquelle_url:braun7,hinweis:'Abschnitt A zeigt den eingetauchten Fuß. Eine allgemeine Mindestmenge in Millilitern steht dort nicht. Die Auswertung ist eine Beobachtungshilfe ohne Betrieb oder Startfreigabe.'}),
    {originalbecher_bestaetigt:true,stand:'glocke_nicht_eingetaucht'},{eintauchbefund_wie_abbildung:false,mindestmenge_ml:null}),

  task('braun_zerkleinerer_laufzeit_pause_erst_nach_dokumentiertem_ende',
    'Vergleicht protokollierte Laufzeit und bereits verstrichene Pause mit der Handbuchzeile ca oder mc — Compare a recorded chopper run and elapsed pause with the matching ca or mc manual row.',
    {motor:braunModel(),code:choice('Kennzeichen des vorhandenen Zerkleinerers.',['ca','mc','offen']),
      laufzeit_s:number('Dokumentierte Sekunden des unmittelbar vorigen zusammenhängenden Laufs.',900),
      pause_s:number('Dokumentierte Sekunden seit vollständigem Ende dieses Laufs.',3600),
      ende_bestaetigt:yes('Der vollständige Stillstand am Ende ist dokumentiert.')},
    ({motor,code,laufzeit_s,pause_s,ende_bestaetigt})=>{
      const applies=(motor==='4191-MQ5235WH'&&code==='ca')||(motor==='MQ7035XBI'&&code==='mc');
      return {laufgrenze_s:applies?60:null,genannte_pause_s:applies?180:null,
        dokumentierter_lauf_im_zeitrahmen:applies?laufzeit_s>0&&laufzeit_s<=60:null,
        pause_erreicht:applies&&ende_bestaetigt&&laufzeit_s>0?pause_s>=180:null,originalquelle_url:braunSource(motor),
        hinweis:'Jeweils Abschnitt C des zugehörigen Braun Handbuchs. Zutatenzeile oder Max-Markierung kann zusätzlich begrenzen. Auffälliges Verhalten verlangt Unterbrechen, auch vor Ablauf der Zeit.'};
    },{motor:'MQ7035XBI',code:'mc',laufzeit_s:55,pause_s:165,ende_bestaetigt:true},
    {laufgrenze_s:60,genannte_pause_s:180,dokumentierter_lauf_im_zeitrahmen:true,pause_erreicht:false}),

  task('braun_mq7035xbi_doppelruehrbesen_teigart_ruehraufgabe',
    'Ordnet leichte Zutaten und schwere Knetaufgaben beim Braun Doppelrührbesen nach Abschnitt B zu — Classify light mixing work and heavy kneading for the Braun double beater.',
    {teil_bestaetigt:yes('Doppelrührbesen des MQ 7035 XBI bestätigt.'),
      aufgabe:choice('Konkretes Vorhaben.',['sahne','eiweiss','kartoffelpueree','leichter_ruehrteig','pizza_brot_nudelteig','schwerer_muerbeteig','offen'])},
    ({teil_bestaetigt,aufgabe})=>({aufgabe_genannt:!teil_bestaetigt||aufgabe==='offen'?null:
      !['pizza_brot_nudelteig','schwerer_muerbeteig'].includes(aufgabe),originalquelle_url:braun7,
      hinweis:'Abschnitt B nennt leichte Rühraufgaben und Kartoffelpüree. Für schwere Teige oder Knetteige ist der Doppelrührbesen laut Braun ungeeignet.'}),
    {teil_bestaetigt:true,aufgabe:'pizza_brot_nudelteig'},{aufgabe_genannt:false}),

  task('braun_mq7035xbi_doppelruehrbesen_mixbecher_veto',
    'Prüft, ob beim Braun Doppelrührbesen der ausdrücklich ausgeschlossene mitgelieferte Becher eingeplant ist — Check the manufacturer’s explicit supplied-beaker exclusion for the Braun double beater.',
    {doppelruehrbesen_bestaetigt:yes('Originaler Doppelrührbesen für MQ 7035 XBI bestätigt.'),
      gefaess:choice('Für das Rühren vorgesehenes dokumentiertes Gefäß.',['mitgelieferter_mixbecher_5','separate_schuessel','offen'])},
    ({doppelruehrbesen_bestaetigt,gefaess})=>({hersteller_veto:!doppelruehrbesen_bestaetigt||gefaess==='offen'?null:gefaess==='mitgelieferter_mixbecher_5',
      originalquelle_url:braun7,hinweis:'Abschnitt B schließt mitgelieferten Becher Nr. 5 beim Doppelrührbesen ausdrücklich aus. Andere Schüsseln brauchen ihre eigene Eignungsprüfung.'}),
    {doppelruehrbesen_bestaetigt:true,gefaess:'mitgelieferter_mixbecher_5'},{hersteller_veto:true}),

  task('braun_mq7035xbi_doppelruehrbesen_rund_sechskant_beleg',
    'Prüft die abgelesene Paarung der beiden Braun Rührbesen nach runder und sechskantiger Markierung — Match the two documented Braun beater markings to their round and hexagonal sockets.',
    {getriebe_und_teil_bestaetigt:yes('Doppelrührbesen und Getriebe des MQ 7035 XBI sicher dokumentiert.'),
      ruehrbesen:choice('Abgelesene Formmarkierung am betreffenden Teil.',['rund','sechskant','offen']),
      anschluss:choice('Abgelesene Markierung der vorgesehenen Aufnahme.',['rund','sechskant','offen'])},
    ({getriebe_und_teil_bestaetigt,ruehrbesen,anschluss})=>({markierungen_gleich:getriebe_und_teil_bestaetigt&&
      ruehrbesen!=='offen'&&anschluss!=='offen'?ruehrbesen===anschluss:null,
      originalquelle_url:braun7,hinweis:'Abschnitt B, S. 5 zeigt die Formen getrennt. Markierungen dienen der Zuordnung, ohne Sitz oder Funktion nachzuweisen. Bei Rasseln oder Kontakt der Besen unterbrechen und die Anleitung nutzen.'}),
    {getriebe_und_teil_bestaetigt:true,ruehrbesen:'rund',anschluss:'sechskant'},{markierungen_gleich:false}),

  task('stabmixer_getriebedeckel_reinigung_spuelmaschine',
    'Prüft beim Bosch oder Braun Stabmixer, ob Motorteil oder Zerkleinerer-Getriebedeckel in die Spülmaschine darf, fließendes Wasser verträgt oder feucht abgewischt wird — Check dishwasher, rinse or wipe guidance for the exact Bosch or Braun part.',
    {handbuch:choice('Belegte Geräteanleitung.',['bosch_msm67170_02','braun_mq5235wh','braun_mq7035xbi','offen']),
      teil:choice('Belegtes Einzelteil, nicht das komplette Set.',['motorteil','mixfuss','mixbecher','schneebesen_abgenommen',
        'schneebesen_getriebe','zerkleinerer_schuessel','zerkleinerer_getriebedeckel','hc_deckel_ohne_getriebe','doppelruehrbesen_getriebe','offen'])},
    ({handbuch,teil})=>{
      const makers={bosch_msm67170_02:boschChop,braun_mq5235wh:braun5,braun_mq7035xbi:braun7};
      const common={motorteil:'feucht_abwischen',mixfuss:'spuelmaschine_laut_anleitung',mixbecher:'spuelmaschine_laut_anleitung',
        schneebesen_abgenommen:'spuelmaschine_laut_anleitung',schneebesen_getriebe:'feucht_abwischen',
        zerkleinerer_schuessel:'spuelmaschine_laut_anleitung'};
      const isBosch=handbuch==='bosch_msm67170_02';
      const lids={zerkleinerer_getriebedeckel:isBosch?'feucht_abwischen':'hand_unter_fliessendem_wasser_keine_spuelmaschine',
        hc_deckel_ohne_getriebe:isBosch?null:'spuelmaschine_laut_anleitung',
        doppelruehrbesen_getriebe:handbuch==='braun_mq7035xbi'?'feucht_abwischen':null};
      const source=isBosch&&['motorteil','mixfuss','mixbecher'].includes(teil)?oldBosch:makers[handbuch]??null;
      return {pflegeweg:source?(common[teil]??lids[teil]??null):null,originalquelle_url:source,
        hinweis:'Braun MQ 5235 WH Abschnitt F, MQ 7035 XBI Abschnitt D. Getriebedeckel ca oder mc und einfacher hc-Deckel haben verschiedene Symbole. '+afterUse};
    },{handbuch:'braun_mq7035xbi',teil:'zerkleinerer_getriebedeckel'},
    {pflegeweg:'hand_unter_fliessendem_wasser_keine_spuelmaschine'}),

  task('braun_zerkleinerer_topf_mikrowelle_piktogramm_bezug',
    'Liest das Braun Mikrowellenverbot für den dokumentierten Zerkleinerertopf und grenzt andere Gefäßrollen ab — Read Braun’s microwave exclusion for the mapped chopper bowl and leave other vessels unresolved.',
    {motor:braunModel(),gefaess:choice('Genau betrachtete Gefäßrolle.',['zerkleinerertopf','mix_messbecher','haushaltsschale','offen']),
      modell_und_teil_belegt:yes('Abbildung gehört zur bestätigten Ausführung und das Gefäß ist zugeordnet.')},
    ({motor,gefaess,modell_und_teil_belegt})=>({mikrowelle_ausgeschlossen_in_abschnitt_c:
      braunSource(motor)&&modell_und_teil_belegt&&gefaess==='zerkleinerertopf'?true:null,
      originalquelle_url:braunSource(motor),hinweis:'Abschnitt C zeigt das durchgestrichene Mikrowellensymbol für die Zerkleinerertöpfe. Für andere Gefäße eine eigene Herstellerangabe lesen.'}),
    {motor:'MQ7035XBI',gefaess:'mix_messbecher',modell_und_teil_belegt:true},
    {mikrowelle_ausgeschlossen_in_abschnitt_c:null}),

  task('braun_zerkleinerer_ungewoehnliche_vibration_drehzahl_stop',
    'Ordnet bei beiden betrachteten Braun Zerkleinerern bereits beobachtete starke Vibration oder sinkende Motordrehzahl ein — Classify vibration and speed-loss observations for the two documented Braun choppers.',
    {motor:braunModel(),starkes_vibrieren:check('Starke Vibration im schon beobachteten Betrieb?'),
      motor_lief_langsamer:check('Wurde im gleichen Betrieb eine sinkende Motordrehzahl festgestellt?')},
    ({motor,starkes_vibrieren,motor_lief_langsamer})=>({unterbrechung_laut_handbuch:!braunSource(motor)?null:
      starkes_vibrieren==='ja'||motor_lief_langsamer==='ja'?true:[starkes_vibrieren,motor_lief_langsamer].includes('offen')?null:false,
      originalquelle_url:braunSource(motor),hinweis:'Abschnitt C verlangt bei auffälligen Bedingungen Unterbrechen. Beobachtungen dienen der Einordnung, niemals zum Nachstellen des Fehlers oder für eine Ferndiagnose.'}),
    {motor:'4191-MQ5235WH',starkes_vibrieren:'ja',motor_lief_langsamer:'offen'},{unterbrechung_laut_handbuch:true})
];
