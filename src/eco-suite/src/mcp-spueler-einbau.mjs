const products = '/produkte.html';
const mm = (description,minimum=0,maximum=12000) => ({type:'number',description,minimum,maximum});
const minutes = description => mm(description,0,1440);
const count = description => mm(description,0,500);
const flag = description => ({type:'boolean',description});
const select = (description,...values) => ({type:'string',description,enum:values});
const round = value => Math.round(value*100)/100;
const overlap = (a,b,c,d) => Math.max(0,Math.min(b,d)-Math.max(a,c));
function ordered(...pairs) {
  if (pairs.some(([a,b])=>b<a)) throw new RangeError('Grenzen oder Zeitpunkte sind vertauscht.');
}
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Stückzahlen als ganze Zahlen eingeben.');
}
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page:products,properties,calculate,example:{args,expect}};
}

export const spuelerEinbau = [
  tool('bosch_sbv4ebx00d_nische_tueroeffnung_abgleichen',
    'Bosch SBV4EBX00D anhand der deutschen Zeichnung auf gemessene Nische und verbleibende Tiefe bei 90° prüfen — Compare the exact Bosch model’s niche and door-open envelope.',
    {
      modell_belegt:flag('Ist SBV4EBX00D auf dem Gerät oder in einem eindeutig zugeordneten Produktbeleg bestätigt?'),
      hoehe_mm:mm('Kleinste nutzbare Höhe der leeren Nische.',1),
      breite_mm:mm('Kleinste nutzbare Breite der leeren Nische.',1),
      tiefe_mm:mm('Kleinste nutzbare Tiefe bis zur festgestellten vorderen Nischenkante.',1),
      hindernis_mm:mm('Freie horizontale Tiefe vom selben hinteren Bezugspunkt wie die Herstellermaßangabe bis zum Hindernis.'),
      tiefenbezug_geprueft:flag('Wurde der gleiche Bezug wie in der Herstellerangabe für die Tiefe bei 90° geprüft?')
    },({modell_belegt,hoehe_mm,breite_mm,tiefe_mm,hindernis_mm,tiefenbezug_geprueft})=>{
      const nische=nischenbefund(hoehe_mm,breite_mm,tiefe_mm);
      return {nischenvergleich:modell_belegt?nische:'modell_zuerst_bestaetigen',
        breite_minus_600_mm:modell_belegt?round(breite_mm-600):null,
        tiefe_minus_550_mm:modell_belegt?round(tiefe_mm-550):null,
        rest_vor_offener_tuer_mm:modell_belegt&&tiefenbezug_geprueft?round(hindernis_mm-1200):null,
        hinweis:'DE-Datenblatt für SBV4EBX00D. Möbelfront, Sockel, Bezugspunkte und weitere Einbaubedingungen mit der Anleitung der genauen E-Nummer klären.'};
    },{modell_belegt:true,hoehe_mm:875,breite_mm:600,tiefe_mm:565,hindernis_mm:1360,tiefenbezug_geprueft:true},
    {nischenvergleich:'masse_erfasst',breite_minus_600_mm:0,tiefe_minus_550_mm:15,rest_vor_offener_tuer_mm:160}),

  tool('spuelernische_breitenprofil_messunsicherheit',
    'Messungen vorn, mittig und hinten mit ihrer Unsicherheit auf eine nachgewiesene Engstelle prüfen — Bound the narrowest observed opening across three measurement stations.',
    {
      vorne_mm:mm('Lichte Breite vorn ohne vorübergehend bewegliche Gegenstände.',1),
      mitte_mm:mm('Lichte Breite in der Mitte auf gleicher Höhe.',1),
      hinten_mm:mm('Lichte Breite hinten auf gleicher Höhe.',1),
      toleranz_mm:mm('Eigene absolute Messunsicherheit pro Station.',0,60),
      grenze_mm:mm('Dokumentierte benötigte lichte Mindestbreite am betrachteten Höhenband.',1),
      gleiches_hoehenband:flag('Wurden alle drei Stationen in derselben vorgesehenen Einbauhöhe gemessen?')
    },({vorne_mm,mitte_mm,hinten_mm,toleranz_mm,grenze_mm,gleiches_hoehenband})=>{
      const klein=Math.min(vorne_mm,mitte_mm,hinten_mm);
      const unten=Math.max(0,klein-toleranz_mm),oben=klein+toleranz_mm;
      return {engstes_band_mm:gleiches_hoehenband?[round(unten),round(oben)]:null,
        befund:!gleiches_hoehenband?'messung_angleichen':oben<grenze_mm?'unterschreitung_belegt':unten>=grenze_mm?'grenze_gemessen_erreicht':'grenze_im_messband',
        hinweis:'Nur drei Stationen in einem Höhenband. Weitere Höhen und dazwischenliegende Hindernisse separat aufmessen.'};
    },{vorne_mm:601,mitte_mm:599,hinten_mm:604,toleranz_mm:2,grenze_mm:600,gleiches_hoehenband:true},
    {engstes_band_mm:[597,601],befund:'grenze_im_messband'}),

  tool('spuelernische_lichte_hoehe_boden_arbeitsplatte_trennen',
    'Höhenunterschied in einer geplanten Spülernische Boden und Arbeitsplatte getrennt zuordnen — Distinguish floor-level changes from worktop underside changes.',
    {
      boden_links_mm:mm('Höhenmarke am Boden links, mit gemeinsamer Nullmarke.'),
      boden_rechts_mm:mm('Höhenmarke am Boden rechts.'),
      platte_links_mm:mm('Unterkante Arbeitsplatte links auf derselben Skala.'),
      platte_rechts_mm:mm('Unterkante Arbeitsplatte rechts.'),
      gemeinsame_marke:flag('Wurden alle vier Punkte von derselben Nullmarke eingemessen?')
    },({boden_links_mm,boden_rechts_mm,platte_links_mm,platte_rechts_mm,gemeinsame_marke})=>{
      if(gemeinsame_marke) ordered([boden_links_mm,platte_links_mm],[boden_rechts_mm,platte_rechts_mm]);
      return {lichte_hoehe_links_mm:gemeinsame_marke?round(platte_links_mm-boden_links_mm):null,
        lichte_hoehe_rechts_mm:gemeinsame_marke?round(platte_rechts_mm-boden_rechts_mm):null,
        boden_rechts_minus_links_mm:gemeinsame_marke?round(boden_rechts_mm-boden_links_mm):null,
        platte_rechts_minus_links_mm:gemeinsame_marke?round(platte_rechts_mm-platte_links_mm):null,
        hinweis:'Messung vorbereiten. Das Ergebnis schlägt keine Unterlagen, Justage oder Änderung am Einbauort vor.'};
    },{boden_links_mm:18,boden_rechts_mm:22,platte_links_mm:893,platte_rechts_mm:895,gemeinsame_marke:true},
    {lichte_hoehe_links_mm:875,lichte_hoehe_rechts_mm:873,boden_rechts_minus_links_mm:4,platte_rechts_minus_links_mm:2}),

  tool('spuelernische_rueckraum_hindernis_hoehenband',
    'Eine feste hintere Auskragung mit dem dokumentierten Höhenband des Gerätekörpers vergleichen — Localise where a marked rear obstruction actually reduces depth.',
    {
      grundtiefe_mm:mm('Tiefe der unbelegten Nische im Referenzbereich.',1),
      vorsprung_mm:mm('Wie weit das feste Hindernis von hinten in die Nische steht.'),
      hindernis_von_mm:mm('Unterkante des Hindernisses über derselben Basis.'),
      hindernis_bis_mm:mm('Oberkante des Hindernisses.'),
      koerper_von_mm:mm('Beginn des geprüften ununterbrochenen Gehäusebands laut Zeichnung.'),
      koerper_bis_mm:mm('Ende dieses Gehäusebands.'),
      projektion_geprueft:flag('Wurde die Überdeckung in der Breite und mit dem genauen Gehäuseprofil geprüft?')
    },({grundtiefe_mm,vorsprung_mm,hindernis_von_mm,hindernis_bis_mm,koerper_von_mm,koerper_bis_mm,projektion_geprueft})=>{
      ordered([hindernis_von_mm,hindernis_bis_mm],[koerper_von_mm,koerper_bis_mm],[vorsprung_mm,grundtiefe_mm]);
      const gemeinsam=overlap(hindernis_von_mm,hindernis_bis_mm,koerper_von_mm,koerper_bis_mm);
      return {betroffenes_hoehenband_mm:projektion_geprueft?gemeinsam:null,
        lichte_tiefe_im_betrachteten_band_mm:projektion_geprueft?round(grundtiefe_mm-(gemeinsam>0?vorsprung_mm:0)):null,
        hinweis:'Das Teilband ist kein Gesamtaufmaß. Falls die Breitenüberdeckung oder Form unklar bleibt, die Originalzeichnung abgleichen.'};
    },{grundtiefe_mm:570,vorsprung_mm:28,hindernis_von_mm:510,hindernis_bis_mm:620,koerper_von_mm:570,koerper_bis_mm:780,projektion_geprueft:true},
    {betroffenes_hoehenband_mm:50,lichte_tiefe_im_betrachteten_band_mm:542}),

  tool('spueler_angebot_geraet_nische_verpackung_trennen',
    'Aus einem Küchenangebot die Bezüge von Gehäuse-, Einbau- und Liefermaß sauber trennen — Identify which dimensional evidence is missing from a seller’s listing.',
    {
      geraetemass_vorhanden:flag('Ist ein eindeutig beschriftetes geschlossenes Gerätemaß vorhanden?'),
      nischenmass_vorhanden:flag('Ist das Einbaumaß eigenständig als Nischenmaß beschriftet?'),
      liefermass_vorhanden:flag('Ist das tatsächlich angebotene Verpackungs- oder Liefermaß belegt?'),
      offenes_tuermass_vorhanden:flag('Ist das Maß mit geöffneter Tür samt Öffnungsstellung ausgewiesen?'),
      e_nummer_zugeordnet:flag('Sind die Einträge der genauen Gerätevariante und dem konkreten Lieferangebot zugeordnet?')
    },({geraetemass_vorhanden,nischenmass_vorhanden,liefermass_vorhanden,offenes_tuermass_vorhanden,e_nummer_zugeordnet})=>({
      fehlende_massarten:[!geraetemass_vorhanden?'geraet':null,!nischenmass_vorhanden?'nische':null,
        !liefermass_vorhanden?'lieferzustand':null,!offenes_tuermass_vorhanden?'offene_tuer':null].filter(Boolean),
      variantenbezug_noch_klaeren:!e_nummer_zugeordnet,
      hinweis:'Gleiche Zahlen aus unterschiedlichen Zeilen können unterschiedliche Bezugskanten haben.'}
    ),{geraetemass_vorhanden:true,nischenmass_vorhanden:false,liefermass_vorhanden:false,offenes_tuermass_vorhanden:true,e_nummer_zugeordnet:true},
    {fehlende_massarten:['nische','lieferzustand'],variantenbezug_noch_klaeren:false}),

  tool('spueler_tiefenbezug_wand_und_blendenflucht_umrechnen',
    'Eine offene Gerätetiefe und ein Gangmaß von verschiedenen Bezugskanten auf dieselbe Linie bringen — Translate the door-open depth to the user’s cabinet face datum.',
    {
      offen_ab_hinterkante_mm:mm('Dokumentierte Tiefe von der hinteren Maßlinie bis zur offenen Tür.',1),
      blende_ab_hinterkante_mm:mm('Eigener horizontaler Abstand von derselben hinteren Linie bis zur Frontflucht.'),
      gang_ab_blende_mm:mm('Freie Tiefe zwischen Frontflucht und gegenüberliegendem Hindernis.'),
      massachsen_gesichert:flag('Gleiche Richtung und hintere Bezugslinie in Gerätezeichnung und Raumaufmaß bestätigt?')
    },({offen_ab_hinterkante_mm,blende_ab_hinterkante_mm,gang_ab_blende_mm,massachsen_gesichert})=>{
      ordered([blende_ab_hinterkante_mm,offen_ab_hinterkante_mm]);
      const vorstand=offen_ab_hinterkante_mm-blende_ab_hinterkante_mm;
      return {vorstand_ab_front_mm:massachsen_gesichert?round(vorstand):null,
        freier_rest_mm:massachsen_gesichert?round(gang_ab_blende_mm-vorstand):null,
        hinweis:'Nur den bestätigten geöffneten Zustand umrechnen. Bewegungsweg von Tür und Korb zusätzlich beobachten.'};
    },{offen_ab_hinterkante_mm:1180,blende_ab_hinterkante_mm:590,gang_ab_blende_mm:850,massachsen_gesichert:true},
    {vorstand_ab_front_mm:590,freier_rest_mm:260}),

  tool('spueler_moebelfront_altlochbild_bezug_uebereinstimmung',
    'Vor Wiederverwendung einer Front zwei vorhandene Bezugspunkte mit der exakten Vorlage vergleichen — Flag whether known old panel points agree with the current drawing.',
    {
      alt_oben_mm:mm('Alter oberer Bezugspunkt ab gleich benannter Frontkante.'),
      alt_unten_mm:mm('Alter unterer Bezugspunkt ab derselben Frontkante.'),
      vorlage_oben_mm:mm('Oberer Bezugspunkt der eindeutig zugeordneten Herstellerzeichnung.'),
      vorlage_unten_mm:mm('Unterer Bezugspunkt der eindeutig zugeordneten Zeichnung.'),
      gemeinsame_vorderseite:flag('Gleiche Vorderseite, Achse, genaue Zeichnungsvariante und Bezugskante bestätigt?')
    },({alt_oben_mm,alt_unten_mm,vorlage_oben_mm,vorlage_unten_mm,gemeinsame_vorderseite})=>{
      ordered([alt_oben_mm,alt_unten_mm],[vorlage_oben_mm,vorlage_unten_mm]);
      return {oberer_versatz_mm:gemeinsame_vorderseite?round(alt_oben_mm-vorlage_oben_mm):null,
        unterer_versatz_mm:gemeinsame_vorderseite?round(alt_unten_mm-vorlage_unten_mm):null,
        hinweis:'Nur zwei dokumentierte Punkte abgleichen. Aussagen zur Wiederverwendung erfordern das vollständige Frontbild und passende Herstellerunterlagen.'};
    },{alt_oben_mm:80,alt_unten_mm:600,vorlage_oben_mm:80,vorlage_unten_mm:620,gemeinsame_vorderseite:true},
    {oberer_versatz_mm:0,unterer_versatz_mm:-20}),

  tool('spueler_frontart_geteilt_oder_einteilig_belege',
    'Bei zwei Möbelfrontvarianten die vorhandene Anleitung, Fronteignung und Zubehörzuordnung getrennt prüfen — Compare documentary support for single and split fronts.',
    {
      e_nummer_sicher:flag('Die vollständige Modellvariante steht auf dem Beleg oder Typenschild. '),
      einteilig_zeichnung:flag('Herstellerzeichnung für die einteilige Variante vorhanden.'),
      einteilig_front:flag('Die vorhandene Front ist für diese dokumentierte Variante bestätigt.'),
      geteilt_zeichnung:flag('Herstellerzeichnung für die geteilte Variante vorhanden.'),
      geteilt_schiene:flag('Die geforderte Zubehörzuordnung für genau diese geteilte Front ist dokumentiert.'),
      geteilt_front:flag('Die vorhandenen Frontteile sind für die dokumentierte Variante bestätigt.')
    },({e_nummer_sicher,einteilig_zeichnung,einteilig_front,geteilt_zeichnung,geteilt_schiene,geteilt_front})=>({
      belegte_varianten:e_nummer_sicher?[einteilig_zeichnung&&einteilig_front?'einteilig':null,
        geteilt_zeichnung&&geteilt_schiene&&geteilt_front?'geteilt':null].filter(Boolean):[],
      fehlende_unterlagen:[!e_nummer_sicher?'e_nummer':null,!einteilig_zeichnung?'zeichnung_einteilig':null,
        !geteilt_zeichnung?'zeichnung_geteilt':null,!geteilt_schiene?'zubehoer_geteilt':null].filter(Boolean),
      hinweis:'Ein im Datenblatt genanntes Zubehör kann Varianten haben. Die Dokumentation belegt noch keine Ausführung vor Ort.'}
    ),{e_nummer_sicher:true,einteilig_zeichnung:true,einteilig_front:true,geteilt_zeichnung:true,geteilt_schiene:false,geteilt_front:true},
    {belegte_varianten:['einteilig'],fehlende_unterlagen:['zubehoer_geteilt']}),

  tool('spueler_sockel_zeichnung_bezugskante_zuordnen',
    'Sockelrücksprung und Türfreiraum nur bei gleicher dargestellter Front- und Sockelvariante miteinander vergleichen — Check the proof behind a toe-kick clearance comparison.',
    {
      sockelruecksprung_mm:mm('Gemessener Sockelrücksprung vom bezeichneten Frontbezug.'),
      zeichnungsgrenze_mm:mm('Für genau diese Front-/Sockelkombination dokumentierter Mindestwert auf derselben Achse.'),
      sockelart_gleich:flag('Sockelart und Frontebene entsprechen der gewählten Variante in der Zeichnung.'),
      bewegungsbereich_zugeordnet:flag('Der Wert ist ausdrücklich demselben Türbewegungsbereich zugeordnet.'),
      e_nummer_geprueft:flag('Unterlage passt zur vollständigen E-Nummer.')
    },({sockelruecksprung_mm,zeichnungsgrenze_mm,sockelart_gleich,bewegungsbereich_zugeordnet,e_nummer_geprueft})=>{
      const sicher=sockelart_gleich&&bewegungsbereich_zugeordnet&&e_nummer_geprueft;
      return {beleg_luecken:[!sockelart_gleich?'variante':null,!bewegungsbereich_zugeordnet?'tuerbewegung':null,!e_nummer_geprueft?'e_nummer':null].filter(Boolean),
        gemessene_reserve_mm:sicher?round(sockelruecksprung_mm-zeichnungsgrenze_mm):null,
        hinweis:'Die Zeichnungsgrenze ist eine verifizierte Eingabe. Bei falscher Variante bleibt die Reserve offen.'};
    },{sockelruecksprung_mm:90,zeichnungsgrenze_mm:82,sockelart_gleich:true,bewegungsbereich_zugeordnet:false,e_nummer_geprueft:true},
    {beleg_luecken:['tuerbewegung'],gemessene_reserve_mm:null}),

  tool('spuelertuer_nachbarschublade_gleichzeitig_grundriss',
    'Gemessene Vorstände von gegenüberliegender Schublade und Gerätetür in derselben Gangachse zusammentragen — Find interference between opposite open fixtures.',
    {
      gang_geschlossen_mm:mm('Lichte Tiefe zwischen den zwei geschlossenen Bezugsebenen.',1),
      spuelertuer_vor_mm:mm('Tatsächlich belegter Vorstoß der Tür in der betrachteten Stellung.'),
      gegenueber_vor_mm:mm('Vorstoß der gegenüberliegenden Schublade in den Gang.'),
      gleiche_spur_und_hoehe:flag('Verlaufen beide Vorstände auf derselben Spur und überlappenden Höhe?')
    },({gang_geschlossen_mm,spuelertuer_vor_mm,gegenueber_vor_mm,gleiche_spur_und_hoehe})=>({
      rechnerischer_rest_mm:gleiche_spur_und_hoehe?round(gang_geschlossen_mm-spuelertuer_vor_mm-gegenueber_vor_mm):null,
      hinweis:'Nur die beiden aufgemessenen Endstellungen vergleichen. Unterscheidbare Höhen und tatsächliche Bewegungsbahnen separat klären.'}
    ),{gang_geschlossen_mm:1000,spuelertuer_vor_mm:610,gegenueber_vor_mm:470,gleiche_spur_und_hoehe:true},
    {rechnerischer_rest_mm:-80}),

  tool('spuelertuer_eckschrank_reihenfolge_belegte_kollisionen',
    'Zwei Tür- und Schrankreihenfolgen anhand getrennt beobachteter Bewegungen überprüfen — Compare the two tested opening orders around a kitchen corner.',
    {
      tuer_dann_schrank:select('Beobachtete Folge: Spülertür zuerst.','frei_beobachtet','kontakt','unbekannt'),
      schrank_dann_tuer:select('Beobachtete Folge: Eckschrank zuerst.','frei_beobachtet','kontakt','unbekannt'),
      gleiche_geometrie:flag('Gleiche Griffe, Fronten und Anschlagstellungen wie bei der geplanten Nutzung?')
    },({tuer_dann_schrank,schrank_dann_tuer,gleiche_geometrie})=>{
      const folgen=[['tuer_dann_schrank',tuer_dann_schrank],['schrank_dann_tuer',schrank_dann_tuer]];
      return {beobachtet_frei:gleiche_geometrie?folgen.filter(([,status])=>status==='frei_beobachtet').map(([folge])=>folge):[],
        nachbeobachten:folgen.filter(([,status])=>!gleiche_geometrie||status==='unbekannt').map(([folge])=>folge),
        hinweis:'Vergleich von bereits dokumentierten Bewegungen, ohne Kollisionen absichtlich nachzustellen.'};
    },{tuer_dann_schrank:'kontakt',schrank_dann_tuer:'frei_beobachtet',gleiche_geometrie:true},
    {beobachtet_frei:['schrank_dann_tuer'],nachbeobachten:[]}),

  tool('spuelerkorb_auszug_notierter_tuer_und_arbeitsweg',
    'Bei dokumentiert vollständig geöffneter Tür den Korbauszug getrennt vom benötigten Standplatz prüfen — Keep the user’s working space separate from physical basket travel.',
    {
      lichte_tiefe_mm:mm('Freie Tiefe ab geprüfter Gerätefront bis zum Hindernis.',1),
      tuer_belegt_mm:mm('Gemessener Raumanspruch der geöffneten Tür ab Front.'),
      korb_belegt_mm:mm('Gemessener Raumanspruch des vollständig ausgezogenen Korbs ab Front.'),
      greifraum_mm:mm('Eigener vor Ort bemessener zusätzlicher Arbeitsraum vor dem Auszug.'),
      gleiche_front_und_stellung:flag('Gleicher Nullpunkt und tatsächlich belegte Tür- und Korbstellungen?')
    },({lichte_tiefe_mm,tuer_belegt_mm,korb_belegt_mm,greifraum_mm,gleiche_front_und_stellung})=>{
      const belegt=Math.max(tuer_belegt_mm,korb_belegt_mm);
      return {rest_fuer_tuer_und_korb_mm:gleiche_front_und_stellung?round(lichte_tiefe_mm-belegt):null,
        rest_mit_eigenem_arbeitsraum_mm:gleiche_front_und_stellung?round(lichte_tiefe_mm-belegt-greifraum_mm):null,
        hinweis:'Nur aufgemessene Stellung und persönlichen Raumanspruch erfassen. Die Rechnung ist keine Zugänglichkeitsnorm.'};
    },{lichte_tiefe_mm:960,tuer_belegt_mm:600,korb_belegt_mm:660,greifraum_mm:360,gleiche_front_und_stellung:true},
    {rest_fuer_tuer_und_korb_mm:300,rest_mit_eigenem_arbeitsraum_mm:-60}),
  tool('spueler_lieferkarton_aufrecht_zwei_tuerprofile',
    'Zwei gerade Durchgänge anhand der bestätigten aufrechten Lieferhülle aufmessen — Identify straight delivery openings with insufficient width or height.',
    {
      huelle_b_mm:mm('Breite der tatsächlich angebotenen aufrechten Lieferhülle inklusive Tragehilfen.',1),
      huelle_h_mm:mm('Höhe derselben Hülle im vorgesehenen Lieferzustand.',1),
      a_b_mm:mm('Kleinste lichte Breite Durchgang A.',1),a_h_mm:mm('Kleinste lichte Höhe A.',1),
      b_b_mm:mm('Kleinste lichte Breite Durchgang B.',1),b_h_mm:mm('Kleinste lichte Höhe B.',1),
      huelle_und_transport_bestaetigt:flag('Lieferzustand und aufrechte Ausrichtung vom Lieferdienst bestätigt?')
    },({huelle_b_mm,huelle_h_mm,a_b_mm,a_h_mm,b_b_mm,b_h_mm,huelle_und_transport_bestaetigt})=>{
      const eng=[a_b_mm<huelle_b_mm||a_h_mm<huelle_h_mm?'a':null,b_b_mm<huelle_b_mm||b_h_mm<huelle_h_mm?'b':null].filter(Boolean);
      return {massluecken_durchgaenge:huelle_und_transport_bestaetigt?eng:null,
        hinweis:'Nur zwei gerade lichte Öffnungen. Wendepunkte, Schwellen und Handhabung gesondert mit dem Lieferdienst klären.'};
    },{huelle_b_mm:670,huelle_h_mm:950,a_b_mm:660,a_h_mm:2000,b_b_mm:720,b_h_mm:1980,huelle_und_transport_bestaetigt:true},
    {massluecken_durchgaenge:['a']}),

  tool('spueler_lieferweg_wendeflaeche_aufmass_schablone',
    'Eine komplett beobachtete einfache Lieferschablone am Wendepunkt gegen eine veränderte Zustellhülle prüfen — Decide whether an earlier swept-corner proof still applies.',
    {
      holzprobe_a_mm:mm('Größte in Richtung A erfasste Abmessung der damaligen vollständigen Schablone.',1),
      holzprobe_b_mm:mm('Entsprechende Abmessung in Richtung B.',1),
      neu_a_mm:mm('Abmessung der vom Lieferdienst vorgesehenen Hülle in Richtung A.',1),
      neu_b_mm:mm('Entsprechende Abmessung in Richtung B.',1),
      haltung_und_aufmass_gleich:flag('Gleicher Wendepunkt, gleiche Höhe, gleiche Orientierung und keine weiteren vorstehenden Teile?'),
      gesamte_kurve_belegt:flag('War die ganze Bewegung der maßgetreuen einfachen Schablone sichtbar und frei?')
    },({holzprobe_a_mm,holzprobe_b_mm,neu_a_mm,neu_b_mm,haltung_und_aufmass_gleich,gesamte_kurve_belegt})=>({
      neu_aufmessen:[neu_a_mm>holzprobe_a_mm?'achse_a':null,neu_b_mm>holzprobe_b_mm?'achse_b':null].filter(Boolean),
      alte_bewegungsprobe_verwertbar:haltung_und_aufmass_gleich&&gesamte_kurve_belegt&&neu_a_mm<=holzprobe_a_mm&&neu_b_mm<=holzprobe_b_mm,
      hinweis:'Eine Größenprobe ist keine Transportfreigabe. Der Lieferdienst prüft Gewicht, Griffe, Verlauf und das konkrete Gerät.'}
    ),{holzprobe_a_mm:690,holzprobe_b_mm:600,neu_a_mm:680,neu_b_mm:620,haltung_und_aufmass_gleich:true,gesamte_kurve_belegt:true},
    {neu_aufmessen:['achse_b'],alte_bewegungsprobe_verwertbar:false}),

  tool('spueler_lieferung_aufzug_nutzlast_mit_begleitung',
    'Bestätigte Aufzug-Nutzlast mit Lieferhülle, Hilfsmitteln und begleitenden Personen zusammen abgleichen — Include every documented load in the elevator planning check.',
    {
      aufzug_grenze_kg:mm('Dokumentierte Nutzlast des konkret vorgesehenen Aufzugs.',1,5000),
      lieferhuelle_kg:mm('Gemessenes oder schriftlich bestätigtes Gesamtgewicht von Gerät und Verpackung.',1,1000),
      mitfahrende_kg:mm('Zusammen bestätigtes Gewicht der vorgesehenen Personen.',0,1500),
      hilfsmittel_kg:mm('Zusatzgewicht der geplanten Lieferhilfen.',0,500),
      belastung_und_nutzung_belegt:flag('Sind diese Gesamtlast und Nutzung vor Ort mit dem Lieferdienst abgeklärt?')
    },({aufzug_grenze_kg,lieferhuelle_kg,mitfahrende_kg,hilfsmittel_kg,belastung_und_nutzung_belegt})=>{
      const gesamt=lieferhuelle_kg+mitfahrende_kg+hilfsmittel_kg;
      return {rechnerische_gesamtlast_kg:belastung_und_nutzung_belegt?round(gesamt):null,
        abstand_zur_nutzlast_kg:belastung_und_nutzung_belegt?round(aufzug_grenze_kg-gesamt):null,
        hinweis:'Nur Gewichte abgleichen. Aufzugsmaße, Zugangsregeln und zulässige Lastverteilung werden vor Ort geprüft.'};
    },{aufzug_grenze_kg:320,lieferhuelle_kg:62,mitfahrende_kg:240,hilfsmittel_kg:23,belastung_und_nutzung_belegt:true},
    {rechnerische_gesamtlast_kg:325,abstand_zur_nutzlast_kg:-5}),

  tool('spueler_alt_neu_abstellflaeche_uebergabefolge',
    'Lieferung und vereinbarte Altgeräte-Abholung bei nur einer Abstellfläche auf eine belegte Reihenfolge prüfen — Check whether one staging spot can serve both old and new units.',
    {
      alt_ab:minutes('Beginn der vereinbarten Belegung durch das Altgerät.'),
      alt_bis:minutes('Bestätigte Freigabe der Fläche nach vereinbarter Altgeräteabholung.'),
      neu_ab:minutes('Frühester vereinbarter Beginn der Belegung durch das Neugerät.'),
      neu_bis:minutes('Spätestes bestätigtes Ende dieser Belegung.'),
      ersatzflaeche_belegt:flag('Ist eine räumlich getrennte, vereinbarte Ersatzfläche verfügbar?')
    },({alt_ab,alt_bis,neu_ab,neu_bis,ersatzflaeche_belegt})=>{
      ordered([alt_ab,alt_bis],[neu_ab,neu_bis]);
      const gleichzeitig=overlap(alt_ab,alt_bis,neu_ab,neu_bis);
      return {doppelt_belegt_min:gleichzeitig,abstimmung_offen:gleichzeitig>0&&!ersatzflaeche_belegt,
        hinweis:'Zeitplanung für bereits vereinbarte Liefer- und Abholleistungen. Die Regel prüft weder Durchgang noch Zugangsrecht.'};
    },{alt_ab:660,alt_bis:720,neu_ab:700,neu_bis:760,ersatzflaeche_belegt:false},
    {doppelt_belegt_min:20,abstimmung_offen:true}),

  tool('spueler_frontgewicht_inklusive_griff_messband',
    'Bestätigten Frontgewichtsbereich mit Front, Griff und allen zusätzlich gesondert gewogenen Teilen vergleichen — Check the documented panel-weight band against the complete panel assembly mass.',
    {
      front_g:mm('Gewogene Front ohne die getrennt erfassten Teile.',0,80000),
      griff_g:mm('Gewogener Griff, soweit nicht bereits enthalten.',0,10000),
      weitere_g:mm('Separat gewogene zusätzliche Teile, die laut exakter Unterlage zum Frontgewicht zählen.',0,15000),
      untergrenze_g:mm('Vom Hersteller eindeutig dieser Frontvariante zugeordneter kleinster Wert.',0,100000),
      obergrenze_g:mm('Hersteller-Obergrenze derselben Frontvariante.',0,100000),
      grenze_und_wiegeumfang_gleich:flag('Doppelte Gewichte ausgeschlossen sowie richtige Variante und vollständiger Wiegeumfang bestätigt?')
    },({front_g,griff_g,weitere_g,untergrenze_g,obergrenze_g,grenze_und_wiegeumfang_gleich})=>{
      ordered([untergrenze_g,obergrenze_g]);
      const summe=front_g+griff_g+weitere_g;
      return {gesamt_g:grenze_und_wiegeumfang_gleich?round(summe):null,
        gewichtsband:!grenze_und_wiegeumfang_gleich?'beleg_klaeren':summe<untergrenze_g?'unterhalb':summe>obergrenze_g?'oberhalb':'innerhalb',
        hinweis:'Herstellergrenzen und Teilezuordnung sind Eingaben. Das Ergebnis empfiehlt keine Montage oder Veränderung.'};
    },{front_g:8100,griff_g:460,weitere_g:180,untergrenze_g:3500,obergrenze_g:8500,grenze_und_wiegeumfang_gleich:true},
    {gesamt_g:8740,gewichtsband:'oberhalb'}),

  tool('spueler_hochnische_und_unterbau_zeichnungszweig',
    'Vor Weitergabe eines Maßes klären, ob die Herstellerzeichnung für Hoch- oder Unterbau gilt — Check that the drawing branch matches the kitchen layout.',
    {
      aufbau:select('Geplanter Einbauort.','unter_arbeitsplatte','hocheinbau','unklar'),
      lesart:select('Explizit beschriftete Darstellung, aus der das Maß gelesen wurde.','unter_arbeitsplatte','hocheinbau','unklar'),
      mass_derselben_kante:flag('Ist die Bezugskante in dieser Darstellung und im Raumaufmaß gleich benannt?'),
      e_nummer_und_datei_geklaert:flag('Sind E-Nummer und zugehörige Montagezeichnung belegt?')
    },({aufbau,lesart,mass_derselben_kante,e_nummer_und_datei_geklaert})=>({
      massbezug:!e_nummer_und_datei_geklaert?'datei_zuordnen':aufbau==='unklar'||lesart==='unklar'?'darstellung_klaeren':
        aufbau!==lesart?'anderen_zeichnungszweig_heranziehen':!mass_derselben_kante?'kante_abgleichen':'massbezug_bestaetigt',
      hinweis:'Unterschiedliche Aufbauten können verschiedene Bezugskanten und Zubehör haben. Nur den passenden Zweig belegen.'}
    ),{aufbau:'hocheinbau',lesart:'unter_arbeitsplatte',mass_derselben_kante:true,e_nummer_und_datei_geklaert:true},
    {massbezug:'anderen_zeichnungszweig_heranziehen'}),

  tool('spueler_auto_tuerstellung_raumobjekt_ausladung',
    'Den beobachteten Vorsprung einer dokumentierten automatischen Türstellung gegen ein zeitweilig abgestelltes Objekt prüfen — Document obstacle encroachment during an observed automatic door position.',
    {
      auto_geprueft:flag('Automatische Türstellung für genaues Modell und betrachtete Einstellung laut Anleitung bestätigt und beobachtet?'),
      beobachteter_vorsprung_mm:mm('Gemessener maximal sichtbarer Vorsprung dieser beobachteten Stellung ab bestätigter Frontlinie.'),
      objektkante_mm:mm('Gemessener Abstand zur nächstliegenden Objektkante von derselben Frontlinie.'),
      gleiche_spur:flag('Objekt und betrachtete Türstellung überlappen sichtbar in Höhe und seitlicher Spur?')
    },({auto_geprueft,beobachteter_vorsprung_mm,objektkante_mm,gleiche_spur})=>({
      rest_mm:auto_geprueft&&gleiche_spur?round(objektkante_mm-beobachteter_vorsprung_mm):null,
      befund:!auto_geprueft?'stellung_nicht_belegt':!gleiche_spur?'spur_getrennt':'beobachteten_zustand_abgleichen',
      hinweis:'Beobachtung einer dokumentierten Stellung. Der volle Bewegungsbereich und weitere Bedingungen bleiben zur Vor-Ort-Prüfung.'}
    ),{auto_geprueft:true,beobachteter_vorsprung_mm:115,objektkante_mm:95,gleiche_spur:true},
    {rest_mm:-20,befund:'beobachteten_zustand_abgleichen'}),

  tool('spueler_servicetiefe_geraet_und_arbeitsbereich',
    'Einen vom Service benannten Arbeitsraum für die Geräteentnahme getrennt von der freien Küchennutzung festhalten — Keep temporary service extraction clearance distinct from an ordinary aisle.',
    {
      frei_mm:mm('Gemessene freie Tiefe vor dem Gerät entlang der bestätigten Serviceachse.',1),
      service_mm:mm('Vom zuständigen Service für den Termin mitgeteilte freie Tiefe auf derselben Achse.',1),
      arbeitsplatz_getrennt:flag('Ein weiterer Arbeitsbereich wurde vom Service als separat benötigt bestätigt?'),
      arbeitsplatz_gesehen:flag('Die getrennte Fläche ist tatsächlich zugänglich und vor Ort bestätigt?'),
      service_bezug_belegt:flag('Messbezug und benötigte Tiefe für genau dieses Gerät und diesen Termin geklärt?')
    },({frei_mm,service_mm,arbeitsplatz_getrennt,arbeitsplatz_gesehen,service_bezug_belegt})=>({
      tiefe_rest_mm:service_bezug_belegt?round(frei_mm-service_mm):null,
      arbeitsflaeche_offen:arbeitsplatz_getrennt&&!arbeitsplatz_gesehen,
      hinweis:'Vergleicht einen dokumentierten Bedarf für einen Termin. Beschreibt keine Entnahme oder Arbeiten am Gerät.'}
    ),{frei_mm:1160,service_mm:1040,arbeitsplatz_getrennt:true,arbeitsplatz_gesehen:false,service_bezug_belegt:true},
    {tiefe_rest_mm:120,arbeitsflaeche_offen:true}),

  tool('spueler_technische_unterlage_e_nummer_suffix_pruefen',
    'Beim vorhandenen Gerät Grundmodell, Variantenindex und Dokumentversion getrennt als Beleg prüfen — Resolve whether a primary installation drawing really belongs to the installed service variant.',
    {
      grundmodell_gleich:flag('Grundmodell in Unterlage und Typenschild gleich?'),
      index_sichtbar:flag('Variantenindex auf dem Typenschild ablesbar?'),
      index_in_unterlage_gleich:flag('Ist die Unterlage dem vollständigen Index durch die Hersteller-Service-Seite zugeordnet?'),
      dokumenttyp_montage:flag('Handelt es sich um die Montagezeichnung anstelle einer allgemeinen Bedienungsanleitung?')
    },({grundmodell_gleich,index_sichtbar,index_in_unterlage_gleich,dokumenttyp_montage})=>({
      zeichnungsbezug:!grundmodell_gleich?'grundmodell_abweichend':!index_sichtbar?'index_fehlt':
        !index_in_unterlage_gleich?'index_offen':!dokumenttyp_montage?'zeichnungsart_offen':'herstellerzuordnung_belegt',
      hinweis:'Dokumentzuordnung allein ist keine Einbaufreigabe. Die passende Variante in der Zeichnung separat erkennen.'}
    ),{grundmodell_gleich:true,index_sichtbar:true,index_in_unterlage_gleich:false,dokumenttyp_montage:true},
    {zeichnungsbezug:'index_offen'}),

  tool('spueler_entladeweg_zwei_personen_umraeumprobe',
    'Den Arbeitsablauf beim Ausräumen nach tatsächlich nötigen Unterbrechungen durch einen zweiten Küchenweg einordnen — Compare recorded interruptions rather than inferring usability from aisle width.',
    {
      pruefgaenge:count('Vollständig beobachtete Übergaben eines Korbinhalts in vergleichbaren Küchenabläufen.'),
      wegen_durchgang_unterbrochen:count('Davon bei tatsächlicher Benutzung des Zweitwegs unterbrochen.'),
      ohne_durchgang_unterbrochen:count('Andere separat erfasste Unterbrechungen ohne Benutzung des Zweitwegs.'),
      nutzung_gleich:flag('Gleiche Öffnungsstellung, Arbeitsplatz und Beobachtungsregel?')
    },({pruefgaenge,wegen_durchgang_unterbrochen,ohne_durchgang_unterbrochen,nutzung_gleich})=>{
      whole(pruefgaenge,wegen_durchgang_unterbrochen,ohne_durchgang_unterbrochen);
      if(!pruefgaenge||wegen_durchgang_unterbrochen+ohne_durchgang_unterbrochen>pruefgaenge) throw new RangeError('Unterbrechungen passen nicht zur Zahl der Durchgänge.');
      return {durchgangsunterbrechung_prozent:nutzung_gleich?round(100*wegen_durchgang_unterbrochen/pruefgaenge):null,
        andere_unterbrechungen:ohne_durchgang_unterbrochen,
        hinweis:'Nur die vollständig beobachteten Abläufe. Die Quote ist keine Aussage über vorgeschriebene Zugangsbreiten.'};
    },{pruefgaenge:10,wegen_durchgang_unterbrochen:3,ohne_durchgang_unterbrochen:2,nutzung_gleich:true},
    {durchgangsunterbrechung_prozent:30,andere_unterbrechungen:2}),

  tool('spueler_bedienfeld_sichtprobe_front_und_offen',
    'Eine Bedienanzeige bei geschlossener und teilweise geöffneter Front getrennt nach eigener Sichtprobe ausweisen — Check when a status display is actually visible to the user.',
    {
      anzeigevariante_belegt:flag('Die am Modell dokumentierte Anzeigevariante wurde geprüft.'),
      geschlossen_sichtbar:flag('Die gewünschte Statusinformation war beim beobachteten Gerät von der vorgesehenen Position geschlossen sichtbar.'),
      offen_sichtbar:flag('Die Information war von derselben Position im bestätigten geöffneten Zustand sichtbar.'),
      nutzungsstand_gleich:flag('War jeweils derselbe Anzeigenzustand, Licht und Standort vergleichbar?')
    },({anzeigevariante_belegt,geschlossen_sichtbar,offen_sichtbar,nutzungsstand_gleich})=>({
      belegte_stellungen:anzeigevariante_belegt&&nutzungsstand_gleich?[geschlossen_sichtbar?'geschlossen':null,offen_sichtbar?'geoeffnet':null].filter(Boolean):null,
      hinweis:'Nur protokollierte Beobachtung in erlaubten Zuständen. Anzeigeart und Bedienbedingungen der genauen E-Nummer klären.'}
    ),{anzeigevariante_belegt:true,geschlossen_sichtbar:false,offen_sichtbar:true,nutzungsstand_gleich:true},
    {belegte_stellungen:['geoeffnet']}),

  tool('spueler_moebelfront_geteilte_hoehen_sichtlinie',
    'Eine sichtbare Teilungsfuge der geplanten Front mit der bestehenden Schrankreihe auf derselben Höhenskala abgleichen — Compare the location of one panel seam with neighbouring cabinet lines.',
    {
      linke_fuge_mm:mm('Höhe der entsprechenden sichtbaren Fuge am linken Nachbarschrank.'),
      rechte_fuge_mm:mm('Höhe der entsprechenden Fuge rechts.'),
      geplante_fuge_mm:mm('Geplante Fugenhöhe in der dokumentierten Frontzeichnung.'),
      gemeinsame_unterkante:flag('Höhen vom gleichen festen Nullpunkt und gleiche Betrachtungsebene?')
    },({linke_fuge_mm,rechte_fuge_mm,geplante_fuge_mm,gemeinsame_unterkante})=>({
      geplant_minus_links_mm:gemeinsame_unterkante?round(geplante_fuge_mm-linke_fuge_mm):null,
      geplant_minus_rechts_mm:gemeinsame_unterkante?round(geplante_fuge_mm-rechte_fuge_mm):null,
      hinweis:'Vergleicht die Frontansicht. Gewichtsgrenzen, Zubehör und Funktion der Teilfront bleiben separat zu klären.'}
    ),{linke_fuge_mm:790,rechte_fuge_mm:794,geplante_fuge_mm:791,gemeinsame_unterkante:true},
    {geplant_minus_links_mm:1,geplant_minus_rechts_mm:-3}),
];

function nischenbefund(hoehe,breite,tiefe) {
  if(hoehe<865||hoehe>925||breite<600||tiefe<550) return 'ausserhalb_schema';
  return breite>600?'breitere_nische_abgleichen':'masse_erfasst';
}
