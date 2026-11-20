const shower = '/guide/duschen-kosten-rechner.html';
const number = (description, minimum=0, maximum=12000) => ({type:'number',description,minimum,maximum});
const count = description => number(description,0,1000);
const flag = description => ({type:'boolean',description});
const choices = (description,...values) => ({type:'string',description,enum:values});
const state = description => choices(description,'bestaetigt','abweichend','offen');
const substrate = description => choices(description,'glattes_glas','glatter_spiegel','glatte_fliese','strukturiert','anderes','unbekannt');
const round = value => Math.round(value*100)/100;
function ordered(...ranges) {
  if (ranges.some(([low,high])=>high<low)) throw new RangeError('Untere und obere Werte sind vertauscht.');
}
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Stückzahlen als ganze Zahlen eingeben.');
}
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page:shower,properties,calculate,example:{args,expect}};
}
const pulsify = new Map([
  ['24121000',{form:'handbrause',max:5.7,strahlen:{powderrain:5.7}}],
  ['24151000',{form:'kopfbrause',max:7.8,strahlen:{powderrain:7.8,intense_powderrain:7.1}}],
]);
const surfaceStatus = (material, acrossJoint) => acrossJoint
  ? 'fuge_im_kontaktfeld'
  : ['glattes_glas','glatter_spiegel','glatte_fliese'].includes(material)
    ? 'oberflaeche_laut_grundlage'
    : material==='strukturiert' ? 'oberflaeche_nicht_glatt' : 'oberflaeche_nicht_geklaert';

export const brausenZubehoer = [
  tool('tisken_50400307_zwei_wandfelder_oberflaeche',
    'Zwei Wandstellen für IKEA TISKEN nach Belag und Fuge einordnen — Screen two locations against IKEA’s documented surface conditions.',
    {
      artikel_50400307_belegt:flag('Steht 504.003.07 auf der Verpackung oder dem eindeutig zugeordneten Beleg?'),
      a_material:substrate('Geprüfte Oberfläche von Stelle A.'), b_material:substrate('Geprüfte Oberfläche von Stelle B.'),
      a_fuge:flag('Schneidet eine sichtbare Fuge das tatsächliche Kontaktfeld an A?'),
      b_fuge:flag('Schneidet eine sichtbare Fuge das tatsächliche Kontaktfeld an B?'),
      beide_felder_erfasst:flag('Wurde das ganze Kontaktfeld an beiden Stellen angesehen?')
    },({artikel_50400307_belegt,a_material,b_material,a_fuge,b_fuge,beide_felder_erfasst})=>{
      const belegt=artikel_50400307_belegt&&beide_felder_erfasst;
      return {stelle_a:belegt?surfaceStatus(a_material,a_fuge):'stelle_oder_artikel_offen',
        stelle_b:belegt?surfaceStatus(b_material,b_fuge):'stelle_oder_artikel_offen',
        hinweis:'IKEA nennt glattes Glas, Spiegelglas und Kacheln. Der Badleitfaden vom Juni 2026 schließt Fugen im Kontaktfeld aus. Sitz und Reichweite getrennt feststellen.'};
    },{artikel_50400307_belegt:true,a_material:'glatte_fliese',b_material:'glattes_glas',a_fuge:true,b_fuge:false,beide_felder_erfasst:true},
    {stelle_a:'fuge_im_kontaktfeld',stelle_b:'oberflaeche_laut_grundlage'}),

  tool('pulsify_artikel_strahlart_techniktabelle_drei_bar',
    'Dokumentierten hansgrohe-Pulsify-Wert für genaue Artikelnummer, Strahlart und 3-bar-Bezug ausgeben — Read the exact DE technical row rather than a series headline.',
    {
      artikel:choices('Am Artikel verifizierte deutsche Artikelnummer.','24121000','24151000','andere_oder_unbekannt'),
      identitaet_belegt:flag('Ist diese Nummer an Gerät, Verpackung oder eindeutigem Angebotsbeleg bestätigt?'),
      strahlart:choices('Abgelesene gewünschte Strahlart.','powderrain','intense_powderrain','unbekannt'),
      druckbezug_bar:number('Aus der zu vergleichenden Quelle belegter Druck in bar. Bei fehlendem Wert 0 eingeben.',0,30)
    },({artikel,identitaet_belegt,strahlart,druckbezug_bar})=>{
      const daten=identitaet_belegt?pulsify.get(artikel):null;
      const mengenwert=daten?.strahlen[strahlart];
      const druck_gleich=druckbezug_bar===3;
      return {bauart:daten?.form??null,datenblatt_bezugsdruck_bar:daten?3:null,
        maximalwert_datenblatt_l_min:daten?daten.max:null,
        strahlwert_bei_gleichem_druckbezug_l_min:druck_gleich?mengenwert??null:null,
        befund:!daten?'artikelbeleg_offen':!druck_gleich?'druckbedingung_abweichend_oder_offen':
          mengenwert===undefined?'strahlart_nicht_in_dieser_zeile_belegt':'technische_zeile_zugeordnet',
        hinweis:'DE-Herstellerwerte bei 3 bar. Ein vergleichbarer Zahlenbezug belegt keinen Durchfluss bei dir zu Hause.'};
    },{artikel:'24151000',identitaet_belegt:true,strahlart:'intense_powderrain',druckbezug_bar:3},
    {bauart:'kopfbrause',datenblatt_bezugsdruck_bar:3,maximalwert_datenblatt_l_min:7.8,
      strahlwert_bei_gleichem_druckbezug_l_min:7.1,befund:'technische_zeile_zugeordnet'}),

  tool('duschhalter_fugenfeld_kontaktschablone_messband',
    'Für eine gemessene Saugnapf-Kontaktschablone prüfen, ob mögliche Fugenberührung schon aus der Messunsicherheit folgt — Bound a contact patch against one measured tile joint.',
    {
      randabstand_mm:number('Kleinster senkrechter Abstand vom geplanten Mittelpunkt zur nächsten Fugenbegrenzung.',0,3000),
      kontakthalbbreite_mm:number('Gemessener Abstand vom Mittelpunkt zum Rand des tatsächlichen Kontaktfelds in derselben Richtung.',1,3000),
      toleranz_mm:number('Gemeinsame Unsicherheitsgrenze für beide Maße zusammen.',0,100),
      ganze_flaeche_geprueft:flag('Ist an der Stelle die ganze Kontaktkontur und die nächstliegende Fuge sichtbar?')
    },({randabstand_mm,kontakthalbbreite_mm,toleranz_mm,ganze_flaeche_geprueft})=>{
      const rest=randabstand_mm-kontakthalbbreite_mm;
      return {fugenabstand_band_mm:ganze_flaeche_geprueft?[round(rest-toleranz_mm),round(rest+toleranz_mm)]:null,
        geometriestatus:!ganze_flaeche_geprueft?'kontaktkontur_offen':rest+toleranz_mm<=0?'fugenberuehrung':
          rest-toleranz_mm>0?'abstand_belegt':'fugenkante_im_messband',
        hinweis:'Nur die bezeichnete Kontaktkontur einordnen. Außenmaß des Halters ist nicht das Kontaktmaß.'};
    },{randabstand_mm:39,kontakthalbbreite_mm:38,toleranz_mm:2,ganze_flaeche_geprueft:true},
    {fugenabstand_band_mm:[-1,3],geometriestatus:'fugenkante_im_messband'}),

  tool('duschhalter_wandbelag_deckschicht_kontaktbeleg',
    'Bei einer Abdeckung zwischen bekanntem Untergrund und tatsächlich berührter Oberfläche unterscheiden — Track whether the visible face belongs to the documented substrate.',
    {
      untergrund_belegt:flag('Der eigentliche Wanduntergrund ist dokumentiert.'),
      deckschicht:choices('Was berührt das vorgesehene Kontaktfeld?','keine_separate_schicht','folie_oder_auflage','unbekannt'),
      deckschicht_belegt:flag('Die Herstellerunterlage bezieht sich ausdrücklich auf die tatsächlich berührte Deckschicht.'),
      rand_oder_naht:flag('Ein Rand der Deckschicht oder eine Naht liegt im Kontaktfeld.')
    },({untergrund_belegt,deckschicht,deckschicht_belegt,rand_oder_naht})=>({
      gefundene_luecken:[!untergrund_belegt?'untergrund_offen':null,
        deckschicht==='unbekannt'||deckschicht==='folie_oder_auflage'&&!deckschicht_belegt?'kontaktmaterial_offen':null,
        rand_oder_naht?'unterbrechung_im_kontaktfeld':null].filter(Boolean),
      hinweis:'Glatter Untergrund bestätigt keine darüber liegende Folie. Material, Fugen und Zustand der tatsächlich berührten Fläche prüfen.'}
    ),{untergrund_belegt:true,deckschicht:'folie_oder_auflage',deckschicht_belegt:false,rand_oder_naht:true},
    {gefundene_luecken:['kontaktmaterial_offen','unterbrechung_im_kontaktfeld']}),

  tool('duschhalter_feldwechsel_bestandsbeobachtung_abgrenzen',
    'Vorhandene Beobachtung zu einer Halterstelle bei Wechsel von Fläche, Saugnapf oder Sichtzeit neu einordnen — Mark which parts of a prior contact observation do not carry over.',
    {
      identischer_halter:flag('Dasselbe Zubehör mit derselben Kontaktfläche wie im alten Eintrag.'),
      gleiche_kontaktstelle:flag('Dieselbe Untergrundstelle und Kontaktlage sind bestätigt.'),
      zustand_unveraendert:flag('Seit der Beobachtung keine Änderung an Oberfläche oder Kontaktteil dokumentiert.'),
      alte_notiz_datiert:flag('Der vorliegende Befund lässt sich einem konkreten Zeitpunkt zuordnen.')
    },({identischer_halter,gleiche_kontaktstelle,zustand_unveraendert,alte_notiz_datiert})=>({
      erneut_zu_beobachten:[!identischer_halter?'kontaktteil':null,!gleiche_kontaktstelle?'kontaktstelle':null,
        !zustand_unveraendert?'aktueller_zustand':null,!alte_notiz_datiert?'zeitlicher_bezug':null].filter(Boolean),
      hinweis:'Protokoll der Zuordnung, ohne Vorhersage der Haftung. Ein alter Zustand belegt keine Nutzung bis zu einem künftigen Termin.'}
    ),{identischer_halter:true,gleiche_kontaktstelle:false,zustand_unveraendert:false,alte_notiz_datiert:true},
    {erneut_zu_beobachten:['kontaktstelle','aktueller_zustand']}),

  tool('handbrause_halter_sitz_kopf_und_griff_beobachten',
    'Am vorhandenen Handstück Durchlass, Sitzposition und Griffzugang getrennt erfassen — Keep nozzle seating evidence separate from an accessible grip.',
    {
      gleiche_brause_und_halter:flag('Beobachtung war mit derselben Brause und demselben Halter.'),
      griff_passiert:state('Der beobachtete Griff gelangt ohne aufgezwungenen Druck in die vorgesehene Halterposition.'),
      sitz_erfasst:state('Das Handstück nimmt die tatsächlich beobachtete vorgesehene Position ein.'),
      griff_greifbar:state('An der vorgesehenen Position kann die Person den Griff wie gewohnt erreichen.')
    },({gleiche_brause_und_halter,griff_passiert,sitz_erfasst,griff_greifbar})=>({
      belegte_merkmale:gleiche_brause_und_halter?[griff_passiert==='bestaetigt'?'durchlass':null,
        sitz_erfasst==='bestaetigt'?'sitz':null,griff_greifbar==='bestaetigt'?'griffzugang':null].filter(Boolean):[],
      offene_merkmale:!gleiche_brause_und_halter?['kombination']:[
        griff_passiert==='offen'?'durchlass':null,sitz_erfasst==='offen'?'sitz':null,griff_greifbar==='offen'?'griffzugang':null].filter(Boolean),
      hinweis:'Nur eigene Sichtbeobachtung ohne Haltbarkeits- oder Lastbewertung. Abweichender Sitz und fehlende Greifbarkeit separat klären.'}
    ),{gleiche_brause_und_halter:true,griff_passiert:'bestaetigt',sitz_erfasst:'offen',griff_greifbar:'abweichend'},
    {belegte_merkmale:['durchlass'],offene_merkmale:['sitz']}),

  tool('duschgriff_zwei_nutzende_gemeinsame_ablage',
    'Eine tatsächlich erreichbare Brausenablage für zwei nacheinander nutzende Personen finden — Find a shared reachable position from two independent observations.',
    {
      a_person_1:flag('Person 1 erreicht den Griff an A in ihrer vorgesehenen Nutzungslage.'),
      a_person_2:flag('Person 2 erreicht den Griff an A in ihrer vorgesehenen Nutzungslage.'),
      b_person_1:flag('Person 1 erreicht den Griff an B.'),
      b_person_2:flag('Person 2 erreicht den Griff an B.'),
      beobachtungen_komplett:flag('Beide Personen haben beide vorgesehenen Ablagepositionen tatsächlich erprobt.')
    },({a_person_1,a_person_2,b_person_1,b_person_2,beobachtungen_komplett})=>({
      gemeinsame_positionen:beobachtungen_komplett?[a_person_1&&a_person_2?'a':null,b_person_1&&b_person_2?'b':null].filter(Boolean):null,
      nutzungsabgleich_offen:!beobachtungen_komplett||!(a_person_1&&a_person_2||b_person_1&&b_person_2),
      hinweis:'Persönliche Beobachtungen zur Erreichbarkeit. Keine allgemeine Eignungsbewertung oder Empfehlung zur Belastung einer Halterung.'}
    ),{a_person_1:true,a_person_2:false,b_person_1:true,b_person_2:true,beobachtungen_komplett:true},
    {gemeinsame_positionen:['b'],nutzungsabgleich_offen:false}),

  tool('duschhalter_greifen_zuruecklegen_bewegung_getrennt',
    'Eine vorgesehene Ablage auf Greifen und Zurücklegen aus der gleichen räumlichen Haltung getrennt prüfen — Keep retrieval and replacement observations distinct.',
    {
      greifen:state('Die Person nimmt die Handbrause aus der vorgesehenen Position.'),
      zuruecklegen:state('Die Person legt die Brause in derselben Nutzungslage zurück.'),
      platzwechsel:choices('Wurde zwischen den Schritten ein Positionswechsel beobachtet?','kein_wechsel','wechsel_beobachtet','offen'),
      gleicher_ablauf:flag('Waren Zubehör, Griffstellung und betrachtete Nutzungslage gleich?')
    },({greifen,zuruecklegen,platzwechsel,gleicher_ablauf})=>({
      in_gleicher_position_belegt:gleicher_ablauf&&![greifen,zuruecklegen,platzwechsel].includes('offen')?
        greifen==='bestaetigt'&&zuruecklegen==='bestaetigt'&&platzwechsel==='kein_wechsel':null,
      eigens_nachbeobachten:!gleicher_ablauf?['ablauf']:[
        greifen==='offen'?'greifen':null,zuruecklegen==='offen'?'zuruecklegen':null,platzwechsel==='offen'?'positionswechsel':null].filter(Boolean),
      hinweis:'Eigene Nutzungserfahrung festhalten. Die Beobachtung trifft keine Aussage zur Befestigung oder zur Eignung für andere Personen.'}
    ),{greifen:'bestaetigt',zuruecklegen:'offen',platzwechsel:'kein_wechsel',gleicher_ablauf:true},
    {in_gleicher_position_belegt:null,eigens_nachbeobachten:['zuruecklegen']}),

  tool('duschbrause_schlauch_ruhezone_und_entnahmepfad',
    'Beobachtete Kreuzungen des vorhandenen Schlauchs beim Ablegen und beim Entnehmen getrennt dokumentieren — Separate route obstructions in two observed use states.',
    {
      ruhelage:choices('Beobachteter Ort des vorhandenen Schlauchs ohne Nutzung.','freie_spur','kreuzt_spur','unbekannt'),
      entnahme:choices('Beobachteter Ort während des erlaubten normalen Entnehmens.','freie_spur','kreuzt_spur','unbekannt'),
      gleiche_route:flag('Ist die markierte benutzte Spur in beiden Notizen gleich?')
    },({ruhelage,entnahme,gleiche_route})=>({
      kreuzung_belegt_in:gleiche_route?[ruhelage==='kreuzt_spur'?'ruhelage':null,entnahme==='kreuzt_spur'?'entnahme':null].filter(Boolean):null,
      nachbeobachten:!gleiche_route?['route']:[ruhelage==='unbekannt'?'ruhelage':null,entnahme==='unbekannt'?'entnahme':null].filter(Boolean),
      hinweis:'Nur beobachtete Schlauchlage festhalten. Keine Vorgabe zum Anschluss oder zur sicherheitstechnischen Beurteilung.'}
    ),{ruhelage:'freie_spur',entnahme:'kreuzt_spur',gleiche_route:true},
    {kreuzung_belegt_in:['entnahme'],nachbeobachten:[]}),

  tool('duschhalter_winkel_nutzerwunsch_vorhandene_stellungen',
    'Vorhandene Handbrausenstellungen nach belegtem Sprüh- und Bedienwunsch der gleichen Person vergleichen — Compare observed aiming positions without inferring a universal range.',
    {
      a_richtung_passt:flag('Beobachtete Sprührichtung A deckte den eigenen gewünschten Bereich ab.'),
      a_verstellung_erreichbar:flag('Erlaubter Griff oder Einstellpunkt war in A persönlich erreichbar.'),
      b_richtung_passt:flag('Entsprechender Richtungsbefund in B.'),
      b_verstellung_erreichbar:flag('Entsprechender Erreichbarkeitsbefund in B.'),
      beide_geprueft:flag('A und B wurden in ähnlicher Nutzungslage und mit der gleichen Brause beobachtet.')
    },({a_richtung_passt,a_verstellung_erreichbar,b_richtung_passt,b_verstellung_erreichbar,beide_geprueft})=>({
      beide_wuensche_beobachtet_in:beide_geprueft?[a_richtung_passt&&a_verstellung_erreichbar?'a':null,
        b_richtung_passt&&b_verstellung_erreichbar?'b':null].filter(Boolean):null,
      hinweis:'Eine persönliche Zuordnung vorhandener Stellungen. Nicht auf andere Modelle, Nutzer oder Haltepositionen übertragen.'}
    ),{a_richtung_passt:true,a_verstellung_erreichbar:false,b_richtung_passt:true,b_verstellung_erreichbar:true,beide_geprueft:true},
    {beide_wuensche_beobachtet_in:['b']}),

  tool('brause_werbeaussage_serienwert_technikwert_zuordnen',
    'Einen Serienhöchstwert und eine technische Artikelzeile nach ihrem Geltungsbereich auseinanderhalten — Resolve showroom headline versus an exact technical row.',
    {
      werbewert_l_min:number('Abgelesener Serien-Werbewert in Litern pro Minute.',0,100),
      technikwert_l_min:number('Abgelesener Wert aus der technischen Zeile in Litern pro Minute.',0,100),
      technik_artikel_geprueft:flag('Die technische Zeile passt zur vollständigen Artikelnummer.'),
      werbung_gleicher_artikel:flag('Der Werbewert ist nachweislich für diesen exakten Artikel formuliert.'),
      gleiche_bedingung_und_wertart:flag('Druck, Strahlart und Höchstwert oder Einzelwert sind in beiden Angaben gleich dokumentiert.')
    },({werbewert_l_min,technikwert_l_min,technik_artikel_geprueft,werbung_gleicher_artikel,gleiche_bedingung_und_wertart})=>{
      const vergleich=technik_artikel_geprueft&&werbung_gleicher_artikel&&gleiche_bedingung_und_wertart;
      return {vergleichsdelta_l_min:vergleich?round(werbewert_l_min-technikwert_l_min):null,
        zitierbarer_artikelwert:technik_artikel_geprueft?technikwert_l_min:null,
        grund:!technik_artikel_geprueft?'zuordnung_technik_offen':!werbung_gleicher_artikel?'verschiedener_geltungsbereich':
          !gleiche_bedingung_und_wertart?'verschiedene_pruefbasis':'gleiche_belegbasis',
        hinweis:'Für die Artikelzeile Druck, Strahlart und Art der Angabe mitführen. Ein Serienhöchstwert ersetzt keine genaue Zeile.'};
    },{werbewert_l_min:6,technikwert_l_min:5.7,technik_artikel_geprueft:true,werbung_gleicher_artikel:false,gleiche_bedingung_und_wertart:false},
    {vergleichsdelta_l_min:null,zitierbarer_artikelwert:5.7,grund:'verschiedener_geltungsbereich'}),

  tool('brause_angebotszitat_strahlart_einzelwert_maximum',
    'Zwei zitierte Durchflusswerte nur mit übereinstimmend belegter Wertart vergleichen — Check mode-specific and product-maximum figures for a common basis.',
    {
      a_wert_l_min:number('Vollständig abgelesene Angabe A.',0,100),b_wert_l_min:number('Vollständig abgelesene Angabe B.',0,100),
      a_wertart:choices('Art der Angabe A.','strahlart','produktmaximum','unbekannt'),
      b_wertart:choices('Art der Angabe B.','strahlart','produktmaximum','unbekannt'),
      aktueller_artikelbezug:flag('Werte und zugehörige Artikelnummern jeweils verifiziert.'),
      druckbasis_gleich:flag('Beide technischen Werte beziehen sich auf denselben belegten Druck.'),
      strahl_uebereinstimmend:flag('Bei strahlbezogenen Angaben ist derselbe Strahltyp belegt.')
    },({a_wert_l_min,b_wert_l_min,a_wertart,b_wertart,aktueller_artikelbezug,druckbasis_gleich,strahl_uebereinstimmend})=>{
      const passend=aktueller_artikelbezug&&druckbasis_gleich&&a_wertart!=='unbekannt'&&a_wertart===b_wertart&&
        (a_wertart==='produktmaximum'||strahl_uebereinstimmend);
      return {b_minus_a_l_min:passend?round(b_wert_l_min-a_wert_l_min):null,
        belegluecken:[!aktueller_artikelbezug?'artikel':null,!druckbasis_gleich?'druck':null,
          a_wertart!==b_wertart||a_wertart==='unbekannt'?'wertart':null,
          a_wertart==='strahlart'&&b_wertart==='strahlart'&&!strahl_uebereinstimmend?'strahlart':null].filter(Boolean),
        hinweis:'Angaben nur auf gemeinsamer Quellenbasis vergleichen. Die Differenz ist keine beobachtete Wassereinsparung.'};
    },{a_wert_l_min:5.7,b_wert_l_min:7.8,a_wertart:'strahlart',b_wertart:'produktmaximum',aktueller_artikelbezug:true,druckbasis_gleich:true,strahl_uebereinstimmend:false},
    {b_minus_a_l_min:null,belegluecken:['wertart']}),
  tool('handbrause_angebot_verwechslung_kopfbrause_bauart',
    'Ein ähnlich benanntes Brausenangebot anhand der technischen Bauart von der gewünschten Handbrause trennen — Keep an overhead-shower listing out of a hand-shower shortlist.',
    {
      gesucht:choices('Tatsächlich vorgesehene Geräteart.','handbrause','kopfbrause'),
      angebot_beschriftet:choices('Bauart in der eindeutigen Herstellerunterlage zum Angebot.','handbrause','kopfbrause','unbekannt'),
      selbe_artikelnummer:flag('Die Händlerauswahl und die technische Unterlage bezeichnen nachweislich denselben Artikel.'),
      typ_nur_im_serienbild:flag('Ein Serien- oder Umgebungsbild zeigt eine weitere Bauart, deren Aufnahme im Angebot ungeklärt ist.')
    },({gesucht,angebot_beschriftet,selbe_artikelnummer,typ_nur_im_serienbild})=>({
      bauartbefund:!selbe_artikelnummer||angebot_beschriftet==='unbekannt'?'artikelunterlage_offen':gesucht===angebot_beschriftet?'bauart_dokumentiert':'andere_bauart',
      bild_nicht_als_umfangaussage_verwenden:typ_nur_im_serienbild,
      hinweis:'Eine gleich benannte Produktfamilie kann verschiedene Bauarten führen. Lieferumfang und Zubehör gesondert nachweisen.'}
    ),{gesucht:'handbrause',angebot_beschriftet:'kopfbrause',selbe_artikelnummer:true,typ_nur_im_serienbild:true},
    {bauartbefund:'andere_bauart',bild_nicht_als_umfangaussage_verwenden:true}),

  tool('duschhalter_bohrfrei_befestigungsart_beleg',
    'Ein Angebot mit der Angabe bohrfrei auf eindeutig dokumentierte Befestigungsart und eigene Vorgaben prüfen — Distinguish suction, adhesive and clamp claims before buying.',
    {
      art:choices('Befestigungsart aus der zugeordneten technischen Unterlage.','saugnapf','klebepad','klemme','schraube','unbekannt'),
      artikelbezug_belegt:flag('Die Unterlage gehört nachweislich zum genauen angebotenen Halter.'),
      saugnapf_erlaubt:flag('Saugnapf gehört laut eigener bestätigter Vorgabe zu den möglichen Befestigungsarten.'),
      klebepad_erlaubt:flag('Klebepad gehört zu den bestätigten Möglichkeiten.'),
      klemme_erlaubt:flag('Klemme gehört zu den bestätigten Möglichkeiten.'),
      schraube_erlaubt:flag('Schraube gehört zu den bestätigten Möglichkeiten.')
    },({art,artikelbezug_belegt,saugnapf_erlaubt,klebepad_erlaubt,klemme_erlaubt,schraube_erlaubt})=>{
      const moeglich={saugnapf:saugnapf_erlaubt,klebepad:klebepad_erlaubt,klemme:klemme_erlaubt,schraube:schraube_erlaubt};
      return {dokumentierte_art:artikelbezug_belegt&&art!=='unbekannt'?art:null,
        eigene_vorgabe_erfuellt:artikelbezug_belegt&&art!=='unbekannt'?moeglich[art]:null,
        hinweis:'Die Befestigungsart ist nur eine Voraussetzung. Das konkrete Kontaktfeld und die vorgesehene Handbrause separat beurteilen.'};
    },{art:'klebepad',artikelbezug_belegt:true,saugnapf_erlaubt:true,klebepad_erlaubt:false,klemme_erlaubt:true,schraube_erlaubt:false},
    {dokumentierte_art:'klebepad',eigene_vorgabe_erfuellt:false}),

  tool('duschset_halter_schon_vorhanden_angebotsumfang',
    'Bei einem Handbrausenangebot tatsächlichen Bedarf und zugesagten Lieferumfang des Halters getrennt ausweisen — Spot a duplicate holder or a missing item in a confirmed shower bundle.',
    {
      vorhanden_halter:choices('Für den Zweck bereits vorgesehener Halter.','vorhanden_belegt','fehlt_bestaetigt','offen'),
      vorhandener_halter_fuer_aufgabe:flag('Vorhandener Halter ist für die konkret gewünschte Brause und Nutzung vor Ort bestätigt.'),
      angebot_halter:choices('Halter im gekauften Angebot laut eindeutigem Lieferumfang.','enthalten','nicht_enthalten','unbekannt'),
      artikelumfang_gleich:flag('Die gewählte Option und die dokumentierte Lieferliste gehören exakt zum gleichen Angebot.')
    },({vorhanden_halter,vorhandener_halter_fuer_aufgabe,angebot_halter,artikelumfang_gleich})=>{
      const gebraucht=vorhanden_halter==='fehlt_bestaetigt'?true:
        vorhanden_halter==='vorhanden_belegt'&&vorhandener_halter_fuer_aufgabe?false:null;
      return {halterbedarf:gebraucht,zusatzhalter_im_set:artikelumfang_gleich&&gebraucht===false&&angebot_halter==='enthalten',
        nachweis:!artikelumfang_gleich||angebot_halter==='unbekannt'?'lieferumfang_klaeren':
          gebraucht===null?'bestand_klaeren':gebraucht&&angebot_halter==='nicht_enthalten'?'halter_nicht_im_set':'bedarf_und_umfang_erfasst',
        hinweis:'Eigenen Bestand und Lieferumfang getrennt führen. Nachweis des vorhandenen Sitzes ist eine Eingabe.'};
    },{vorhanden_halter:'vorhanden_belegt',vorhandener_halter_fuer_aufgabe:true,angebot_halter:'enthalten',artikelumfang_gleich:true},
    {halterbedarf:false,zusatzhalter_im_set:true,nachweis:'bedarf_und_umfang_erfasst'}),

  tool('duschhalter_kontaktumfang_skizze_und_produktmass',
    'Beim Maßvergleich erkennen, ob eine Unterlage den Saugnapf, den sichtbaren Deckel oder nur die Außenhülle bemaßt — Verify which outline the manufacturer’s drawing actually describes.',
    {
      mass_markierung:choices('Eindeutige Beschriftung des vorliegenden Maßes.','kontaktflaeche','sichtbarer_deckel','aussenmass','unbekannt'),
      gleiche_artikelnummer:flag('Unterlage gehört zum konkreten Halter.'),
      ausrichtung_erkennbar:flag('Richtung und Bezugskanten des angegebenen Maßes sind erkennbar.'),
      kontakt_sichtbar_aufgemessen:flag('Alternativ wurde das tatsächliche Kontaktfeld ohne Umbau vollständig angesehen und gemessen.')
    },({mass_markierung,gleiche_artikelnummer,ausrichtung_erkennbar,kontakt_sichtbar_aufgemessen})=>({
      kontaktbezug:gleiche_artikelnummer&&ausrichtung_erkennbar&&mass_markierung==='kontaktflaeche'?'kontaktmass_in_unterlage':
        kontakt_sichtbar_aufgemessen?'eigenes_kontaktaufmass':'echtes_kontaktmass_offen',
      hinweis:'Die sichtbare Außenbreite mag größer sein. Vor der Fugenprüfung eindeutig das tatsächlich anliegende Feld dokumentieren.'}
    ),{mass_markierung:'aussenmass',gleiche_artikelnummer:true,ausrichtung_erkennbar:true,kontakt_sichtbar_aufgemessen:false},
    {kontaktbezug:'echtes_kontaktmass_offen'}),

  tool('duschhalter_ablage_position_lieblingshand_wechsel',
    'Festhalten, in welchen Schritten bei zwei tatsächlich erprobten Griffabläufen ein Handwechsel nötig war — Compare left/right hand changes in observed retrieval routines.',
    {
      a_entnehmen:flag('Handwechsel beim Entnehmen mit Ablauf A nötig.'),
      a_ablegen:flag('Handwechsel beim Zurücklegen mit Ablauf A nötig.'),
      b_entnehmen:flag('Handwechsel beim Entnehmen mit Ablauf B nötig.'),
      b_ablegen:flag('Handwechsel beim Zurücklegen mit Ablauf B nötig.'),
      gleiche_person_aufgabe:flag('Gleiche Person und gleiche bewusst gewählte Ausgangshand bei beiden Abläufen?')
    },({a_entnehmen,a_ablegen,b_entnehmen,b_ablegen,gleiche_person_aufgabe})=>({
      a_schritte_mit_wechsel:gleiche_person_aufgabe?[a_entnehmen?'entnehmen':null,a_ablegen?'ablegen':null].filter(Boolean):null,
      b_schritte_mit_wechsel:gleiche_person_aufgabe?[b_entnehmen?'entnehmen':null,b_ablegen?'ablegen':null].filter(Boolean):null,
      hinweis:'Ein persönlicher Vergleich gewohnter Bedienung. Keine Empfehlung, mit einer bestimmten Hand zu üben.'}
    ),{a_entnehmen:true,a_ablegen:true,b_entnehmen:false,b_ablegen:true,gleiche_person_aufgabe:true},
    {a_schritte_mit_wechsel:['entnehmen','ablegen'],b_schritte_mit_wechsel:['ablegen']}),

  tool('duschhalter_gebraucht_auflage_und_etikett_beleg',
    'Bei einem gebrauchten Halter Artikelbeleg und tatsächlich fotografiertes Kontaktteil unabhängig prüfen — Distinguish missing model evidence from a visibly different attachment.',
    {
      etikett_geprueft:flag('Originalartikelnummer ist vollständig belegt.'),
      kontaktteil_vollstaendig_abgebildet:flag('Die sichtbare Auflage des konkret angebotenen Halters ist vollständig erkennbar.'),
      kontaktteil_identitaet:state('Das vorhandene Kontaktteil lässt sich der ursprünglichen Unterlage zuordnen.'),
      modellfoto_ist_das_stueck:flag('Abbildung ist nachweislich dieses Einzelstück statt ein Hersteller-Bild.')
    },({etikett_geprueft,kontaktteil_vollstaendig_abgebildet,kontaktteil_identitaet,modellfoto_ist_das_stueck})=>({
      offene_nachweise:[!etikett_geprueft?'artikelnummer':null,!kontaktteil_vollstaendig_abgebildet?'kontaktteil_sicht':null,
        kontaktteil_identitaet==='offen'?'kontaktteil_zuordnung':null,!modellfoto_ist_das_stueck?'einzelstueckfoto':null].filter(Boolean),
      kontaktteil_abweichend:kontaktteil_vollstaendig_abgebildet&&modellfoto_ist_das_stueck&&kontaktteil_identitaet!=='offen'?kontaktteil_identitaet==='abweichend':null,
      hinweis:'Sichtbelege ersetzen keine Einschätzung der Haltbarkeit. Unklare Zubehöridentität vor einer Kaufentscheidung klären.'}
    ),{etikett_geprueft:true,kontaktteil_vollstaendig_abgebildet:true,kontaktteil_identitaet:'abweichend',modellfoto_ist_das_stueck:true},
    {offene_nachweise:[],kontaktteil_abweichend:true}),

  tool('duschgriff_blickverdeckung_und_tatsaechliche_erreichbarkeit',
    'Einen verdeckten Griff von einem tatsächlich nicht erreichten Griff unterscheiden — Keep view obstruction separate from an observed reach limitation.',
    {
      blick_beobachtet:flag('Sicht auf den vorgesehenen Griff in der eigenen Nutzungslage tatsächlich beobachtet.'),
      sicht_frei:flag('Griff war in dieser Nutzungslage sichtbar.'),
      greifprobe_beobachtet:flag('Die persönliche Reichweite wurde unabhängig beobachtet.'),
      griff_erreicht:flag('Der Griff wurde persönlich erreicht.'),
      lage_gleich:flag('Sicht- und Greifbeobachtung stammen aus derselben bezeichneten Position.')
    },({blick_beobachtet,sicht_frei,greifprobe_beobachtet,griff_erreicht,lage_gleich})=>({
      sichtbarer_griff:lage_gleich&&blick_beobachtet?sicht_frei:null,
      griff_erreicht:lage_gleich&&greifprobe_beobachtet?griff_erreicht:null,
      sicht_und_reichweite_getrennt_belegt:lage_gleich&&blick_beobachtet&&greifprobe_beobachtet,
      hinweis:'Aus verdeckter Sicht folgt keine Reichweitenaussage. Nur für den beobachteten persönlichen Ablauf.'}
    ),{blick_beobachtet:true,sicht_frei:false,greifprobe_beobachtet:true,griff_erreicht:true,lage_gleich:true},
    {sichtbarer_griff:false,griff_erreicht:true,sicht_und_reichweite_getrennt_belegt:true}),

  tool('duschkabinentuer_brausenablage_einstieg_ausstieg',
    'Bei einem vorhandenen Halter erforderliche Türstellung und freie Beweglichkeit für Ein- und Ausstieg getrennt protokollieren — Distinguish arrival and exit observations around the same shower screen.',
    {
      einstieg_frei:state('Der übliche Einstieg war mit derselben vorgesehenen Türstellung und abgestellter Handbrause beobachtet frei.'),
      ausstieg_frei:state('Der übliche Ausstieg war nach unabhängiger Beobachtung frei.'),
      festgesetzte_tuerstellung:flag('Beide Beobachtungen gehören zur wirksam beobachteten tatsächlichen Türstellung.'),
      gleiche_ablage:flag('Halter, Handbrause und Schlauchlage waren in beiden Beobachtungen gleich.')
    },({einstieg_frei,ausstieg_frei,festgesetzte_tuerstellung,gleiche_ablage})=>{
      const vergleich=festgesetzte_tuerstellung&&gleiche_ablage;
      return {belegt_freie_abschnitte:vergleich?[einstieg_frei==='bestaetigt'?'einstieg':null,ausstieg_frei==='bestaetigt'?'ausstieg':null].filter(Boolean):null,
        beobachtung_offen:vergleich?[einstieg_frei==='offen'?'einstieg':null,ausstieg_frei==='offen'?'ausstieg':null].filter(Boolean):['tuerstellung_oder_ablage'],
        hinweis:'Nur bereits beobachtete Bewegungsabschnitte protokollieren. Keine Zugänglichkeits- oder Sicherheitsbewertung.'};
    },{einstieg_frei:'bestaetigt',ausstieg_frei:'offen',festgesetzte_tuerstellung:true,gleiche_ablage:true},
    {belegt_freie_abschnitte:['einstieg'],beobachtung_offen:['ausstieg']}),

  tool('brause_drei_bar_beleg_druckzahl_und_bezug',
    'Einen Vergleich mit einer technischen 3-bar-Zeile auf dynamischen Druck und Messunsicherheit begrenzen — Separate the numeric pressure interval from the relevant documented pressure type.',
    {
      untergrenze_bar:number('Niedrigster aus den Unterlagen belegter Druckwert.',0,30),
      obergrenze_bar:number('Höchster aus denselben Unterlagen belegter Druckwert.',0,30),
      druckart:choices('In der Quelle ausdrücklich benannte Druckart.','fliessdruck','ruhedruck','nicht_benannt'),
      gleicher_pruefpunkt:flag('Druckbezug und Prüfpunkt wurden als gleich dokumentiert.')
    },({untergrenze_bar,obergrenze_bar,druckart,gleicher_pruefpunkt})=>{
      ordered([untergrenze_bar,obergrenze_bar]);
      const enthaelt=untergrenze_bar<=3&&obergrenze_bar>=3;
      return {drei_bar_im_zahlenband:enthaelt,gleiche_bedingung_belegt:gleicher_pruefpunkt&&druckart==='fliessdruck'&&untergrenze_bar===3&&obergrenze_bar===3,
        grund:druckart!=='fliessdruck'?'druckart_klaeren':!gleicher_pruefpunkt?'pruefpunkt_klaeren':!enthaelt?'anderes_druckband':
          untergrenze_bar===3&&obergrenze_bar===3?'drei_bar_exakt_belegt':'drei_bar_nur_im_band',
        hinweis:'Nur einen bereits dokumentierten Bezugsdruck einordnen. Ein Band mit 3 bar belegt keine konkrete Durchflussmessung.'};
    },{untergrenze_bar:2.9,obergrenze_bar:3.1,druckart:'fliessdruck',gleicher_pruefpunkt:true},
    {drei_bar_im_zahlenband:true,gleiche_bedingung_belegt:false,grund:'drei_bar_nur_im_band'}),

  tool('brause_strahlarten_anzeigename_zuordnungsbeleg',
    'Bei zwei ähnlichen Strahlnamen die tatsächlich bezeichnete Auswahl vor einem Angebotsvergleich prüfen — Check which exact spray name belongs to the observed selector.',
    {
      anleitung_strahlname:flag('Der vollständige offizielle Name und die zugehörige Auswahl sind dokumentiert.'),
      anzeige_vollstaendig:flag('Beim tatsächlichen Auswahlzustand ist der ganze Name oder ein eindeutig erklärtes Symbol erfasst.'),
      zuordnung:choices('Sicht- oder Textabgleich der Strahlart.','exakt_passend','aehnlicher_andere_modus','offen'),
      identischer_artikel:flag('Auswahlzustand und Anleitung gehören zum selben exakten Artikel.')
    },({anleitung_strahlname,anzeige_vollstaendig,zuordnung,identischer_artikel})=>({
      belegter_status:!identischer_artikel?'artikel_offen':!anleitung_strahlname||!anzeige_vollstaendig?'anzeige_oder_anleitung_offen':zuordnung,
      hinweis:'Ähnliche Namen wie PowderRain und Intense PowderRain sind keine gemeinsame Strahlart.'}
    ),{anleitung_strahlname:true,anzeige_vollstaendig:true,zuordnung:'aehnlicher_andere_modus',identischer_artikel:true},
    {belegter_status:'aehnlicher_andere_modus'}),

  tool('duschhalter_wiederholte_handhabung_ausgelassene_faelle',
    'Bei einer eigenen Ablagebeobachtung vollständig erfasste Handgriffe von ausgelassenen Fällen trennen — Quantify handling evidence without mistaking skipped attempts for successful use.',
    {
      beabsichtigte_faelle:count('Zuvor festgelegte Anwendungsfälle im Beobachtungsblock.'),
      beobachtet_ohne_wechsel:count('Vollständig beobachtet, ohne unerwartet den Ablauf wechseln zu müssen.'),
      beobachtet_mit_wechsel:count('Vollständig beobachtet, mit einem unerwarteten Wechsel des Ablaufs.'),
      vorab_regeln_gleich:flag('Jeder Fall wurde nach denselben vorher festgelegten Beobachtungsregeln bewertet.')
    },({beabsichtigte_faelle,beobachtet_ohne_wechsel,beobachtet_mit_wechsel,vorab_regeln_gleich})=>{
      whole(beabsichtigte_faelle,beobachtet_ohne_wechsel,beobachtet_mit_wechsel);
      const gesehen=beobachtet_ohne_wechsel+beobachtet_mit_wechsel;
      if(!beabsichtigte_faelle||gesehen>beabsichtigte_faelle) throw new RangeError('Zahl der beobachteten Fälle passt nicht zum Plan.');
      return {nicht_ausgewertet:beabsichtigte_faelle-gesehen,
        wechselanteil_beobachtet_prozent:vorab_regeln_gleich&&gesehen?round(100*beobachtet_mit_wechsel/gesehen):null,
        hinweis:'Die Quote zählt Handhabungsfälle. Andere Personen, Befestigung und Haltbarkeit werden dadurch nicht bewertet.'};
    },{beabsichtigte_faelle:9,beobachtet_ohne_wechsel:5,beobachtet_mit_wechsel:2,vorab_regeln_gleich:true},
    {nicht_ausgewertet:2,wechselanteil_beobachtet_prozent:28.57}),
];
