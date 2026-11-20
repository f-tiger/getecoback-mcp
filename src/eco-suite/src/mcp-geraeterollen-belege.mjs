const PAGE='/produkte.html';
const DAIKIN='https://www.daikin.de/content/dam/document-library/operation-manuals/airp/air-purifiers/mc80z/MC80Z_Operation%20manual_3PDE690982-1_German.pdf';
const VENTA='https://www.venta-air.com/Rollwagen-fuer-Venta-Luftbefeuchter/6060';
const daikin=(seiten)=>({originalquelle_url:DAIKIN,dokument:'3PDE690982-1',seiten});
const venta=()=>({originalquelle_url:VENTA,quellenstand:'2026-11-20',markt:'DE'});
const number=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const flag=description=>({type:'boolean',description});
const choice=(description,values)=>({type:'string',description,enum:values});
const mm=description=>number(description+' in mm.',0,30000);
const sec=description=>number(description+' in Sekunden.',0,86400);
const count=description=>number(description,0,500);
const round=n=>Number.isFinite(n)?Number(n.toFixed(2))+0:null;
const commonVenta=['lw25_original_classic','lw45_original_classic','lw25_comfort_plus','lw45_comfort_plus'];
const descriptionVenta=[...commonVenta,'ah530','ah535','ah550','ah555'];
const tableVenta=[...commonVenta,'lw24','lw24_plus','lw44','lw44_plus'];

function task(name,description,properties,calculate,args,expect){
  return {name,description,page:PAGE,properties,calculate,example:{args,expect}};
}
function integers(values){
  if(!values.every(Number.isInteger))throw new RangeError('Anzahlen als ganze Zahlen angeben.');
}

export const geraeterollenBelege=[
  task('daikin_mc80zvm_rollensatz_teilcode_abgrenzen',
    'Liest für die exakt belegte deutsche MC80ZVM-Ausführung, welcher Teilecode zu Rollen und welcher zum Filter gehört — Distinguish the exact Daikin caster kit code from the filter code.',
    {teil:choice('Gelesene Herstellerkennung.',['kks080b41','baft501a','andere','offen']),ausgabe_passt:flag('Exaktes MC80ZVM und die genannte deutsche Anleitung abgeglichen?')},
    ({teil,ausgabe_passt})=>({
      ...daikin([39]),teilart:!ausgabe_passt?null:teil==='kks080b41'?'laufrollen':teil==='baft501a'?'staubsammelfilter':null,
      einheiten_im_herstellerpaket:!ausgabe_passt?null:teil==='kks080b41'?4:teil==='baft501a'?1:null,
      getrennt_verkauft_laut_anleitung:ausgabe_passt&&['kks080b41','baft501a'].includes(teil)?true:null,
      hinweis:'Die Anleitung führt die Rollen und den Ersatzfilter unter separat verkauften Teilen. Den tatsächlichen Geräte-Lieferumfang im eigenen Angebot prüfen.'
    }),{teil:'kks080b41',ausgabe_passt:true},
    {teilart:'laufrollen',einheiten_im_herstellerpaket:4,getrennt_verkauft_laut_anleitung:true}),

  task('daikin_rollenangebot_satz_und_einzelangabe_abgleichen',
    'Rechnet bestätigte Satz- und Einzelmengen nur dann zusammen, wenn sie getrennt geliefert werden — Reconcile box and individual quantities only when the offer proves distinct units.',
    {saetze:count('Anzahl ausdrücklich bestätigter originaler KKS080B41-Sätze.'),
      einzelne:count('Zusätzlich genannte bestätigte einzelne Rollen.'),
      angabe_getrennt:choice('Beziehung der genannten Einzelrollen zu den Sätzen.',['zusaetzlich','bereits_im_satz','offen']),
      genaues_angebot:flag('Schriftlicher Lieferumfang und die genaue deutsche Teilekennung sind abgeglichen.')},
    ({saetze,einzelne,angabe_getrennt,genaues_angebot})=>{
      integers([saetze,einzelne]);
      if(angabe_getrennt==='bereits_im_satz'&&einzelne>4*saetze)throw new RangeError('Teilmengen dürfen die dokumentierte Satzmenge nicht überschreiten.');
      const bekannt=genaues_angebot&&(angabe_getrennt!=='offen'||einzelne===0);
      return {...daikin([39]),einzelrollen_ohne_doppelzaehlung:bekannt?4*saetze+(angabe_getrennt==='zusaetzlich'?einzelne:0):null,
        gesonderte_rolle_offen:genaues_angebot&&angabe_getrennt==='offen'&&einzelne>0,
        hinweis:'Vier Einheiten je belegtem Herstellersatz. Eine Einzelposition kann denselben Satz beschreiben. Weder Angebot noch Zählung belegen den Zustand der gelieferten Teile.'};
    },{saetze:1,einzelne:4,angabe_getrennt:'bereits_im_satz',genaues_angebot:true},
    {einzelrollen_ohne_doppelzaehlung:4,gesonderte_rolle_offen:false}),

  task('venta_6060_kompatibilitaetslisten_modellkonflikt',
    'Vergleicht Beschreibung und Zubehör-Tabelle für genau eine identifizierte Venta-Modellvariante — Compare the conflicting official trolley lists for an exact Venta model.',
    {modell:choice('Genau bezeichnetes Gerät.', [...new Set([...descriptionVenta,...tableVenta]),'andere','offen']),
      geraetevariante_geprueft:flag('Typenschild, Serie und Markt passen zu der eingegebenen Variante. Bei LW25/LW45 Original die Serienzuordnung prüfen.')},
    ({modell,geraetevariante_geprueft})=>{
      const oben=descriptionVenta.includes(modell),tabelle=tableVenta.includes(modell);
      const bekannt=geraetevariante_geprueft&&modell!=='offen';
      return {...venta(),in_beschreibung:bekannt?oben:null,in_tabelle:bekannt?tabelle:null,beleglage:!bekannt?'variante_offen':
        oben&&tabelle?'in_beiden':oben!==tabelle?'listen_weichen_ab':'in_keiner_geprueften_liste',
        hinweis:'Ein Einzelbeleg bei abweichender Liste ersetzt keine genaue Herstellerbestätigung. Auch zwei Nennungen gelten nur für die bezeichnete Variante.'};
    },{modell:'ah530',geraetevariante_geprueft:true},
    {in_beschreibung:true,in_tabelle:false,beleglage:'listen_weichen_ab'}),

  task('venta_rollwagen_6060_url_und_6060500_artikel',
    'Trennt die Artikelnummer der ausgewählten Variante von der Gruppennummer im Webpfad — Distinguish the visible trolley SKU from the family URL component.',
    {beleg:choice('Tatsächlich vorliegende Kennung.',['artikel_6060500','pfad_6060','andere_artikelnummer','offen']),
      auswahl_abgeglichen:flag('Die tatsächlich ausgewählte Shop-Variante und genau das Angebot wurden abgeglichen?')},
    ({beleg,auswahl_abgeglichen})=>({
      ...venta(),artikel_im_quellenstand:'6060500',
      angebotskennung_dem_quellenartikel_zugeordnet:auswahl_abgeglichen?beleg==='artikel_6060500':null,
      hinweis:'Die aufgerufene deutsche Auswahl zeigt 6060500. Der URL-Bestandteil 6060 belegt allein keine SKU einer anderen Farbauswahl oder Verkaufseinheit.'
    }),{beleg:'pfad_6060',auswahl_abgeglichen:true},
    {artikel_im_quellenstand:'6060500',angebotskennung_dem_quellenartikel_zugeordnet:false}),

  task('daikin_mc80zvm_griffrolle_zweck_und_fundstelle',
    'Leitet für das genaue Modell von einer gewünschten Bewegungsart zur passenden Quellenstelle — Route carrying and optional rolling to their own manufacturer documentation.',
    {vorhaben:choice('Beschriebene Bewegungsart.',['tragen','rollen','offen']),
      fundstelle:choice('Vorliegender Beleg.',['markierte_tragegriffe','laufrollensatz_anleitung','wartungsblende','offen']),
      modell_passt:flag('Die Unterlage gilt für das deutsche MC80ZVM.')},
    ({vorhaben,fundstelle,modell_passt})=>({
      ...daikin([5,7,39]),passender_beleg:!modell_passt||vorhaben==='offen'?null:
        vorhaben==='tragen'?fundstelle==='markierte_tragegriffe':fundstelle==='laufrollensatz_anleitung',
      zahl_markierter_griffstellen:modell_passt&&vorhaben==='tragen'?2:null,
      hinweis:'Die zwei bezeichneten Tragegriffe und die separat beschriebene Rollenoption sind unterschiedliche Belege. Die Wartungsblende ist im Plan kein Tragegriff.'
    }),{vorhaben:'tragen',fundstelle:'wartungsblende',modell_passt:true},
    {passender_beleg:false,zahl_markierter_griffstellen:2}),

  task('daikin_laufrollensatz_anleitung_zur_wegfrage',
    'Prüft ob eine konkrete Frage zur vorgesehenen Bewegungsstrecke in der Teileanleitung überhaupt erfasst ist — Locate a route-specific requirement in the actual caster instructions.',
    {strecke:choice('Offene Eigenschaft der vorgesehenen Strecke.',['ebener_abschnitt','fuge_oder_schwelle','richtungswechsel','offen']),
      dokument:choice('Zur Strecke vorliegende Quelle.',['satzanleitung_genau','nur_geraetehandbuch','angebotsbeschreibung','offen']),
      eigenschaft_genannt:flag('Die konkret gefragte Eigenschaft ist in der exakten Teileanleitung beschrieben.')},
    ({strecke,dokument,eigenschaft_genannt})=>({
      ...daikin([39]),strecke,weiterer_teilebeleg_noetig:strecke==='offen'?null:dokument!=='satzanleitung_genau'||!eigenschaft_genannt,
      hinweis:'Das Gerätehandbuch verweist für den Satz auf die mitgelieferte Anleitung. Aus der Existenz einer Rolle keine Befahrbarkeit oder Bewegungsfreigabe ableiten.'
    }),{strecke:'fuge_oder_schwelle',dokument:'nur_geraetehandbuch',eigenschaft_genannt:false},
    {strecke:'fuge_oder_schwelle',weiterer_teilebeleg_noetig:true}),

  task('venta_rollwagen_belagrichtung_marketing_und_eigenbefund',
    'Hält Rollenmaterial, Bodenhinweis und den tatsächlichen eigenen Oberflächenbefund getrennt fest — Separate rubberized caster information and actual floor observations.',
    {belag:choice('Eigener auf der vorgesehenen Strecke bestätigter Belag.',['parkett','fliese','teppich','anderer','offen']),
      bodenhinweis_geprueft:flag('Genau passende Belag- oder Pflegevorgabe für diese Oberfläche geprüft.'),
      eigenbefund:choice('Eigener bereits vorliegender Sichtbefund für den belegten Aufbau.',['spuren','keine_spur_beobachtet','nicht_beobachtet'])},
    ({belag,bodenhinweis_geprueft,eigenbefund})=>({
      ...venta(),quelle_nennt_gummierte_rollen:true,bodenunterlage_geprueft:belag!=='offen'&&bodenhinweis_geprueft,
      eigener_sichtbefund:eigenbefund,
      hinweis:'Materialbezeichnung und Produkttext sind keine Prüfung des eigenen Bodens. Keine Oberflächengarantie aus einer Stichprobe ableiten.'
    }),{belag:'parkett',bodenhinweis_geprueft:false,eigenbefund:'keine_spur_beobachtet'},
    {quelle_nennt_gummierte_rollen:true,bodenunterlage_geprueft:false,eigener_sichtbefund:'keine_spur_beobachtet'}),

  task('rollwagen_fuellzustand_und_tatsache_fahrtbeleg',
    'Prüft, ob eine beobachtete Fahrt und die genaue Unterlage denselben Befüllzustand abdecken — Check the water-fill state in the actual observation and applicable documentation.',
    {ziel:choice('Belegter Zustand des später betrachteten Aufbaus.',['leer','befuellt']),
      beobachtet:choice('Zustand der konkreten vorliegenden Beobachtung.',['leer','befuellt','offen']),
      dokument:choice('Welcher Zustand wird in den passenden Unterlagen erläutert?',['leer','befuellt','beide','offen']),
      fuellmenge_beobachtet:flag('Bei zwei befüllten Zuständen ist die beobachtete Füllmenge mit dem Zielzustand vergleichbar.')},
    ({ziel,beobachtet,dokument,fuellmenge_beobachtet})=>({
      beobachtung_zum_ziel:beobachtet==='offen'||ziel==='befuellt'&&beobachtet==='befuellt'&&!fuellmenge_beobachtet?null:ziel===beobachtet,
      dokument_zum_ziel:dokument==='offen'?null:dokument===ziel||dokument==='beide',
      hinweis:'Eine beobachtete leere Fahrt belegt keinen befüllten Aufbau. Auch eine allgemeine Werbeaussage ohne Bedingungen ersetzt keine Dokumentation zu diesem Zustand.'
    }),{ziel:'befuellt',beobachtet:'leer',dokument:'offen',fuellmenge_beobachtet:false},
    {beobachtung_zum_ziel:false,dokument_zum_ziel:null}),

  task('geraeterollen_enveloppe_aus_gemeinsamen_seitenkanten',
    'Rekonstruiert die gemessene Außenbreite des kombinierten Aufbaus aus vier Kanten am gemeinsamen Nullpunkt — Reconstruct the observed assembly width from body and base edges at one reference.',
    {geraet_links:mm('Linke Gehäusekante ab gemeinsamem Nullpunkt'),geraet_rechts:mm('Rechte Gehäusekante'),
      rollen_links:mm('Linker äußerster Zubehörpunkt in der beobachteten Rollenstellung'),rollen_rechts:mm('Rechter äußerster Zubehörpunkt'),
      aufbau_belegt:flag('Zubehör montiert, endgültiger Zustand und alle Maße am selben Bezugspunkt erfasst.')},
    ({geraet_links,geraet_rechts,rollen_links,rollen_rechts,aufbau_belegt})=>{
      if(geraet_links>geraet_rechts||rollen_links>rollen_rechts)throw new RangeError('Linke Kanten müssen vor den rechten Kanten liegen.');
      return {kombination_breite_mm:aufbau_belegt?round(Math.max(geraet_rechts,rollen_rechts)-Math.min(geraet_links,rollen_links)):null,
        geraet_im_aufbau_mm:round(geraet_rechts-geraet_links),
        hinweis:'Gemessen in einer Rollenstellung am konkreten Aufbau. Ein Gehäusemaß aus dem Datenblatt gilt nicht inklusive Rollen oder Wagen.'};
    },{geraet_links:80,geraet_rechts:395,rollen_links:50,rollen_rechts:370,aufbau_belegt:true},
    {kombination_breite_mm:345,geraet_im_aufbau_mm:315}),

  task('daikin_mc80zvm_massangabe_geraet_oder_aufbau',
    'Liest die nackten Gerätemaße nur für den zugehörigen Zustand und lässt montierte Maße ohne eigenen Beleg offen — Keep published body dimensions separate from measured assembled dimensions.',
    {gefragt:choice('Gesuchter Zustand.', ['geraet','mit_laufrollen']),
      mc80zvm_belegt:flag('Gerät und Ausgabe der deutschen Anleitung passen.'),
      messung_komplett:flag('Komplette montierte Gerätehöhe, Breite und Tiefe wurden unabhängig gemessen.')},
    ({gefragt,mc80zvm_belegt,messung_komplett})=>({
      ...daikin([38,39]),dokumentmass_h_b_t_mm:mc80zvm_belegt&&gefragt==='geraet'?[630,315,315]:null,
      referenz:!mc80zvm_belegt?'variante_offen':gefragt==='geraet'?'geraet_datenblatt':messung_komplett?'eigene_messung':'rollenzustand_offen',
      hinweis:'Die Anleitung benennt die Geräteaußenmaße und listet die Rollen separat. Kein abgeleiteter Zuschlag für montierte Abmessungen.'
    }),{gefragt:'mit_laufrollen',mc80zvm_belegt:true,messung_komplett:false},
    {dokumentmass_h_b_t_mm:null,referenz:'rollenzustand_offen'}),

  task('geraeterollen_schwenkbewegung_mitte_ausserhalb_endlagen',
    'Prüft ob der beobachtete Seitenüberstand während einer Richtungsänderung über beide Endstände hinausging — Compare observed midpoint sweep with both recorded endpoints.',
    {vorher_mm:mm('Äußerste beobachtete Kante vor der Drehung ab fester Seitenmarke'),
      zwischen_mm:mm('Entsprechende Kante in der beobachteten Zwischenlage'),
      nachher_mm:mm('Entsprechende Kante danach'),punkt_gleich:flag('Gleiche Seitenmarke und belegter Aufbau während derselben regulären Bewegung?')},
    ({vorher_mm,zwischen_mm,nachher_mm,punkt_gleich})=>({
      zwischenueberstand_ueber_endlagen_mm:punkt_gleich?round(Math.max(0,zwischen_mm-Math.max(vorher_mm,nachher_mm))):null,
      beobachtete_ausladung_max_mm:punkt_gleich?Math.max(vorher_mm,zwischen_mm,nachher_mm):null,
      hinweis:'Drei eigene Stichproben erfassen nicht den gesamten Schwenkverlauf. Keine Freigabe für eine enge Strecke daraus ableiten.'
    }),{vorher_mm:340,zwischen_mm:378,nachher_mm:351,punkt_gleich:true},
    {zwischenueberstand_ueber_endlagen_mm:27,beobachtete_ausladung_max_mm:378}),

  task('rollwagen_belagwechsel_richtungsspezifischer_stopp',
    'Hält getrennt fest, in welcher Richtung am gleichen beobachteten Bodenwechsel ein zusätzlicher Stopp auftrat — Identify direction-specific pauses at the same already observed flooring transition.',
    {hin:choice('Befund in Richtung A nach B.',['zusatzstopp','durchgehend','nicht_beobachtet']),
      rueck:choice('Befund in Richtung B nach A.',['zusatzstopp','durchgehend','nicht_beobachtet']),
      gleicher_uebergang:flag('Exakt derselbe Übergang, Aufbau und vergleichbarer Bewegungsablauf dokumentiert?')},
    ({hin,rueck,gleicher_uebergang})=>({
      vergleich:!gleicher_uebergang||[hin,rueck].includes('nicht_beobachtet')?'offen':
        hin===rueck?'gleicher_befund':hin==='zusatzstopp'?'nur_hin':'nur_rueck',
      hinweis:'Die markierten Stopps beschreiben vorhandene Beobachtungen. Bei ungeklärter Strecke keine Überfahrt erzwingen und aus der Gegenrichtung nichts übertragen.'
    }),{hin:'zusatzstopp',rueck:'durchgehend',gleicher_uebergang:true},{vergleich:'nur_hin'}),

  task('rollwagen_bodenabdruecke_vorbestand_lokalzuordnung',
    'Prüft ob ein nach dem Abstellen sichtbarer Abdruck am selben Ort bereits vorher dokumentiert ist — Distinguish a pre-existing floor mark from a new observation at the parking location.',
    {vorher:choice('Sichtbefund vor dem Abstellen.', ['sichtbar','nicht_sichtbar','kein_foto']),
      nachher:choice('Sichtbefund nach regulärem Freimachen.', ['sichtbar','nicht_sichtbar','kein_foto']),
      lage_abgeglichen:flag('Bildwinkel, Beleuchtung und genaue örtliche Markierung sind abgeglichen.')},
    ({vorher,nachher,lage_abgeglichen})=>({
      vorbestand:vorher==='kein_foto'?null:vorher==='sichtbar',
      nur_nachher_sichtbar:!lage_abgeglichen||[vorher,nachher].includes('kein_foto')?null:vorher==='nicht_sichtbar'&&nachher==='sichtbar',
      hinweis:'Ein zeitlicher Sichtunterschied weist weder Materialschaden noch Ursache durch eine Rolle nach. Fehlende Sicht ist kein sauberer Bodenbeleg.'
    }),{vorher:'nicht_sichtbar',nachher:'sichtbar',lage_abgeglichen:true},
    {vorbestand:false,nur_nachher_sichtbar:true}),

  task('laufrolle_abrollstrecke_pro_umlaeufe_sichtkontrolle',
    'Vergleicht eigene beobachtete Weglänge mit der kinematischen Referenz markierter Rollenumläufe — Compare observed travel to the no-slip reference for counted wheel turns.',
    {umfang_mm:mm('Separat bekannter Rollenumfang in der beobachteten Konfiguration'),
      umdrehungen:number('Gezählte volle und anteilige Umdrehungen.',0,100),
      weg_mm:mm('Zugehörige beobachtete gerade Verlagerung'),
      gleicher_abschnitt:flag('Derselbe sichtbare Durchgang, kein Wenden und derselbe Beginn und Schluss?')},
    ({umfang_mm,umdrehungen,weg_mm,gleicher_abschnitt})=>{
      const referenz=umfang_mm*umdrehungen;
      return {modellweg_mm:gleicher_abschnitt&&umfang_mm>0?round(referenz):null,
        beobachtet_minus_modell_mm:gleicher_abschnitt&&umfang_mm>0?round(weg_mm-referenz):null,
        hinweis:'Eine Rechenkontrolle aus vorhandenen Beobachtungen. Abweichung kann an Zählung oder Bewegung liegen und belegt keinen Defekt oder fehlenden Grip.'};
    },{umfang_mm:100,umdrehungen:3.5,weg_mm:310,gleicher_abschnitt:true},
    {modellweg_mm:350,beobachtet_minus_modell_mm:-40}),

  task('rollwagen_feststellrolle_exakten_nachweis_kaufen',
    'Prüft ob eine gewünschte Feststellfunktion für die konkrete Ausführung überhaupt dokumentiert ist — Check whether a requested wheel-lock feature is documented for the exact variant.',
    {funktion_benoetigt:flag('Eine dokumentierte Feststellfunktion ist persönlich erforderlich.'),
      nachweis:choice('Vorliegende Angabe zur genauen Rollen- oder Wagenvariante.',['feststeller_beschrieben','ausdruecklich_ohne','nur_rolle_genannt','offen']),
      ausfuehrung_passt:flag('Die Angabe ist derselben Variante und Lieferung zugeordnet.')},
    ({funktion_benoetigt,nachweis,ausfuehrung_passt})=>{
      const belegt=!ausfuehrung_passt||['nur_rolle_genannt','offen'].includes(nachweis)?null:nachweis==='feststeller_beschrieben';
      return {feststeller_in_unterlage:belegt,auswahl_bei_anforderung_offen:funktion_benoetigt&&belegt===null,
        hinweis:'Rollentyp, Produktfoto und Material geben keine Feststellfunktion vor. Eine dokumentierte Funktion ist kein Nachweis für die Eignung an einem Standort.'};
    },{funktion_benoetigt:true,nachweis:'nur_rolle_genannt',ausfuehrung_passt:true},
    {feststeller_in_unterlage:null,auswahl_bei_anforderung_offen:true}),

  task('rollwagen_parkprobe_geraet_gegen_grundrahmen',
    'Trennt Verschiebung des Wagens von einer beobachteten Verschiebung des Gehäuses relativ zum Wagen — Compare apparent relative motion between a parked appliance and the base.',
    {geraet_vor_mm:mm('Ablesung an Gehäusemarke zu Beginn'), rahmen_vor_mm:mm('Ablesung an Rahmenmarke zu Beginn'),
      geraet_nach_mm:mm('Ablesung an Gehäusemarke danach'), rahmen_nach_mm:mm('Ablesung an Rahmenmarke danach'),
      aufloesung_mm:mm('Eigene Auflösung oder Ablesebreite'),
      messbezug_gleich:flag('Dieselbe Achse, beide Marken und stationäre dokumentierte Beobachtungsbedingungen.')},
    ({geraet_vor_mm,rahmen_vor_mm,geraet_nach_mm,rahmen_nach_mm,aufloesung_mm,messbezug_gleich})=>{
      const rahmen=rahmen_nach_mm-rahmen_vor_mm;
      const relativ=geraet_nach_mm-geraet_vor_mm-rahmen;
      return {rahmenversatz_mm:messbezug_gleich?round(rahmen):null,
        geraet_relativ_zum_rahmen_mm:messbezug_gleich?round(relativ):null,
        relativsignal_ueber_aufloesung:messbezug_gleich?Math.abs(relativ)>aufloesung_mm:null,
        hinweis:'Zwei Projektionen aus einem bereits beobachteten ebenen Zustand. Unterschiedliche Markenbewegung belegt weder Befestigungsursache noch sichere Benutzung.'};
    },{geraet_vor_mm:100,rahmen_vor_mm:150,geraet_nach_mm:106,rahmen_nach_mm:158,aufloesung_mm:1,messbezug_gleich:true},
    {rahmenversatz_mm:8,geraet_relativ_zum_rahmen_mm:-2,relativsignal_ueber_aufloesung:true}),

  task('rollwagen_bodenpflege_zusammenhang_abstellen_und_rueckkehr',
    'Prüft anhand der aufgezeichneten Zeitfolge, ob der Boden am ursprünglichen Stellpunkt bis zum Ende der Pflege frei blieb — Check whether the original footprint remained available until recorded cleaning completion.',
    {weg_min:number('Zeitpunkt des vollständig frei beobachteten ursprünglichen Stellpunkts ab Protokollbeginn in Minuten.',0,1440),
      pflege_fertig_min:number('Zeitmarke der fertig beobachteten Pflege dieses Stellpunkts in Minuten.',0,1440),
      rueck_min:number('Zeitmarke, ab der der Wagen den Stellpunkt wieder belegte, in Minuten.',0,1440),
      reihe_vollstaendig:flag('Kein ungeklärter Zwischenbesuch oder Wechsel des tatsächlich betrachteten Stellpunkts?')},
    ({weg_min,pflege_fertig_min,rueck_min,reihe_vollstaendig})=>{
      if(rueck_min<weg_min)throw new RangeError('Die Rückkehr muss nach dem freigemachten Stellpunkt dokumentiert sein.');
      return {stellpunkt_bei_abschluss_noch_frei:reihe_vollstaendig&&pflege_fertig_min!==rueck_min?
        pflege_fertig_min>=weg_min&&pflege_fertig_min<rueck_min:null,
        hinweis:'Zeitlicher Zugangsbeleg, keine Feststellung der erreichten Reinigungsqualität. Gleiche Minutenmarken lassen die Reihenfolge offen.'};
    },{weg_min:4,pflege_fertig_min:12,rueck_min:16,reihe_vollstaendig:true},
    {stellpunkt_bei_abschluss_noch_frei:true}),

  task('geraetetransport_wegabschnitt_rollen_oder_griff_nachweis',
    'Erfasst welche vorgesehenen Abschnittsarten vom eigenen Beleg über Rollen und Tragegriff überhaupt gedeckt sind — Match documented rolling and carrying evidence to separate route sections.',
    {rollabschnitt_benoetigt:flag('Ein dokumentierter Rollabschnitt gehört zum Vorhaben.'),
      trageabschnitt_benoetigt:flag('Mindestens ein Abschnitt benötigt separat belegtes Tragen.'),
      rollunterlage_und_abschnitt:flag('Exakte Rollenunterlage passt zum vorgesehenen Abschnitt.'),
      griffunterlage_und_zustand:flag('Exakte Griffunterlage passt zum dann tatsächlich vorhandenen Aufbau.')},
    ({rollabschnitt_benoetigt,trageabschnitt_benoetigt,rollunterlage_und_abschnitt,griffunterlage_und_zustand})=>({
      abschnittsbelege_fehlen:[...rollabschnitt_benoetigt&&!rollunterlage_und_abschnitt?['rollen']:[],
        ...trageabschnitt_benoetigt&&!griffunterlage_und_zustand?['tragen']:[]],
      hinweis:'Ein Tragegriff am Grundgerät ist kein Beleg für Tragen mit montiertem Zubehör. Keine Angaben über Lasten, Treppen oder Eignung eines Fahrwegs.'
    }),{rollabschnitt_benoetigt:true,trageabschnitt_benoetigt:true,rollunterlage_und_abschnitt:true,griffunterlage_und_zustand:false},
    {abschnittsbelege_fehlen:['tragen']}),
];
