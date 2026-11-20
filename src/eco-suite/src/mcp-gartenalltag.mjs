const workshop = '/familienwerkstatt.html';
const terrace = '/guide/balkon-terrasse-beschatten.html';
const shade = '/guide/hitzeschutz-fenster.html';
const cooling = '/guide/zimmer-kuehlen-ohne-installation.html';
const n = (description,minimum,maximum) => ({type:'number',description,minimum,maximum});
const count = description => n(description,0,10000);
const minutes = description => n(description,0,1440);
const area = description => n(description,0,10000);
const flag = description => ({type:'boolean',description});
const select = (description,...values) => ({type:'string',description,enum:values});
const round = value => Math.round(value * 100) / 100 + 0;
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Stückzahlen als ganze Zahlen eingeben.');
}
function ordered(...pairs) {
  if (pairs.some(([start,end])=>end<start)) throw new RangeError('Anfang und Ende sind vertauscht.');
}
function tool(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const gartenalltag = [
  tool('poolroboter_bodenraster_unbesuchte_felder',
    'Bekannte Bodenabschnitte nach einem beobachteten Lauf als besucht, unbesucht oder ungeprüft festhalten — Record coverage over a simple marked pool-floor grid.',
    workshop,{
      felder:count('Zahl gleich großer markierter Bodenfelder im ohnehin freigegebenen Bereich.'),
      gesehen:count('Felder mit mindestens einer sicher beobachteten Befahrung.'),
      sichtbar_ausgelassen:count('Während des gesamten Laufs sichtbare Felder ohne beobachtete Befahrung.'),
      modellbereich_bestaetigt:flag('Sind alle markierten Felder laut Anleitung im vorgesehenen Reinigungsbereich?')
    },({felder,gesehen,sichtbar_ausgelassen,modellbereich_bestaetigt})=>{
      whole(felder,gesehen,sichtbar_ausgelassen);
      if(!felder||gesehen+sichtbar_ausgelassen>felder) throw new RangeError('Feldzahlen passen nicht zum Raster.');
      return {belegt_besucht_prozent:modellbereich_bestaetigt?round(100*gesehen/felder):null,
        nicht_beobachtbar:felder-gesehen-sichtbar_ausgelassen,belegt_ausgelassen:modellbereich_bestaetigt?sichtbar_ausgelassen:null,
        hinweis:'Ausgelassen setzt durchgehende Sicht voraus. Befahrung allein belegt keine Reinigungswirkung.'};
    },{felder:20,gesehen:14,sichtbar_ausgelassen:3,modellbereich_bestaetigt:true},
    {belegt_besucht_prozent:70,nicht_beobachtbar:3,belegt_ausgelassen:3}),

  tool('poolroboter_wandabschnitt_anhaftung_vor_nach_probe',
    'Sichtbare Spuren an derselben freigegebenen Poolwand vor und nach einem Lauf erfassen — Compare marked wall residues before and after one observed pass.',
    workshop,{
      stellen:count('Markierte vergleichbare Sichtstellen derselben Wand.'),
      vorher:count('Davon Stellen mit sichtbarer Spur unmittelbar vorher.'),
      noch_da:count('Von den ursprünglichen Spuren danach noch sichtbare Stellen.'),
      neu_sichtbar:count('Zuvor unauffällige Stellen mit neuer sichtbarer Spur.'),
      vergleich_belegt:flag('Waren Beleuchtung und Sichttiefe vergleichbar und Wandbereich laut Anleitung freigegeben?')
    },({stellen,vorher,noch_da,neu_sichtbar,vergleich_belegt})=>{
      whole(stellen,vorher,noch_da,neu_sichtbar);
      if(vorher>stellen||noch_da>vorher||neu_sichtbar>stellen-vorher) throw new RangeError('Sichtstellen und Teilmengen abgleichen.');
      return {urspruengliche_spuren_nicht_mehr_sichtbar:vergleich_belegt?vorher-noch_da:null,
        neue_sichtbare_spuren:vergleich_belegt?neu_sichtbar:null,
        hinweis:'Eine lokale Sichtprobe. Sie trifft keine Aussage über Wasserqualität oder die Eignung weiterer Wandflächen.'};
    },{stellen:10,vorher:6,noch_da:2,neu_sichtbar:1,vergleich_belegt:true},
    {urspruengliche_spuren_nicht_mehr_sichtbar:4,neue_sichtbare_spuren:1}),

  tool('poolroboter_treppenumkehr_sichtprotokoll',
    'Beobachtete Umkehr, Weiterfahrt und fehlende Sicht an einer freigegebenen Treppenzone trennen — Record observed turn-backs separately from blind spots at an approved transition.',
    workshop,{
      annaeherungen:count('Beobachtete Anfahrten zur bezeichneten Zone.'),
      umkehr:count('Anfahrten mit vollständig sichtbarer Umkehr vor dem Übergang.'),
      fortgesetzt:count('Anfahrten mit vollständig sichtbarer Fortsetzung in den bestätigten Bereich.'),
      genaue_treppenzone_belegt:flag('Ist dieser Übergang für das genaue Modell nach Anleitung bestätigt?')
    },({annaeherungen,umkehr,fortgesetzt,genaue_treppenzone_belegt})=>{
      whole(annaeherungen,umkehr,fortgesetzt);
      if(umkehr+fortgesetzt>annaeherungen) throw new RangeError('Beobachtete Ausgänge übersteigen die Anfahrten.');
      return {weiterfahrten:genaue_treppenzone_belegt?fortgesetzt:null,umkehr_beobachtet:genaue_treppenzone_belegt?umkehr:null,
        verlauf_offen:annaeherungen-umkehr-fortgesetzt,
        hinweis:'Für eine offene Freigabe zuerst die passende Anleitung heranziehen. Die Statistik ersetzt keinen Eignungsnachweis.'};
    },{annaeherungen:8,umkehr:3,fortgesetzt:2,genaue_treppenzone_belegt:true},
    {weiterfahrten:2,umkehr_beobachtet:3,verlauf_offen:3}),

  tool('poolroboter_korb_blaetter_feinreste_einordnung',
    'Korbaufnahme von Blättern und sichtbarem Feinmaterial getrennt protokollieren — Compare visible matter categories without treating basket contents as water quality.',
    workshop,{
      blatt_a_g:n('Gemessene Blattmasse mit gleichem Abtropfverfahren in Lauf A.',0,10000),
      blatt_b_g:n('Entsprechende Blattmasse in Lauf B.',0,10000),
      fein_a_g:n('Separat erfasste Masse des sichtbaren Feinmaterials in A.',0,10000),
      fein_b_g:n('Entsprechende separat erfasste Masse in B.',0,10000),
      gleiche_verfahren:flag('Waren Korb, Abtropfverfahren, Beobachtungsumfang und Arbeitsbereich vergleichbar?')
    },({blatt_a_g,blatt_b_g,fein_a_g,fein_b_g,gleiche_verfahren})=>({
      blaetter_b_minus_a_g:gleiche_verfahren?round(blatt_b_g-blatt_a_g):null,
      feinmaterial_b_minus_a_g:gleiche_verfahren?round(fein_b_g-fein_a_g):null,
      hinweis:'Massen im Korb beschreiben nur das erfasste Material bei diesen Läufen. Keine Aussage zur Wasserqualität.'
    }),{blatt_a_g:120,blatt_b_g:160,fein_a_g:35,fein_b_g:28,gleiche_verfahren:true},
    {blaetter_b_minus_a_g:40,feinmaterial_b_minus_a_g:-7}),

  tool('poolreinigung_neuer_schmutzeintrag_nach_lauf',
    'Nach einem Poollauf beobachtete Neueinträge zeitlich von verbliebenem Schmutz trennen — Separate visible residual debris from later arrivals within marked areas.',
    workshop,{
      laufende:minutes('Zeit des beobachteten Laufendes.'),
      kontrollzeit:minutes('Zeit der ersten vollständigen Sichtkontrolle danach.'),
      neuer_eintrag:minutes('Protokollierter Start des ersten später beobachteten Eintrags.'),
      unveraenderter_zeitbezug:flag('Gleicher Tag, durchgehender Zeitbezug und abgesicherte Quellenbeobachtung?')
    },({laufende,kontrollzeit,neuer_eintrag,unveraenderter_zeitbezug})=>{
      ordered([laufende,kontrollzeit]);
      return {vor_neuem_eintrag_kontrolliert:unveraenderter_zeitbezug?kontrollzeit<neuer_eintrag:null,
        kontrollabstand_min:kontrollzeit-laufende,
        hinweis:'Wenn Einträge schon vor der Kontrolle vorkamen, kann ein späteres Foto sie nicht vom Laufrest trennen.'};
    },{laufende:680,kontrollzeit:700,neuer_eintrag:690,unveraenderter_zeitbezug:true},
    {vor_neuem_eintrag_kontrolliert:false,kontrollabstand_min:20}),

  tool('pool_flaechenplan_nacharbeit_gesperrte_zonen',
    'Sichtbare Nacharbeit nach Poolbereichen mit und ohne bestätigten Zugang erfassen — Keep visible work needs separate from areas with unconfirmed access.',
    workshop,{
      boden_offen:flag('Ist am markierten Bodenabschnitt sichtbare Nacharbeit offen?'),
      wand_offen:flag('Ist an der bezeichneten Wand sichtbare Nacharbeit offen?'),
      treppe_offen:flag('Ist an der bezeichneten Treppe sichtbare Nacharbeit offen?'),
      boden_methode_belegt:flag('Vorgesehene Methode und Zugang am Boden bestätigt?'),
      wand_methode_belegt:flag('Vorgesehene Methode und Zugang an der Wand bestätigt?'),
      treppe_methode_belegt:flag('Methode und Zugang an der Treppe bestätigt?')
    },({boden_offen,wand_offen,treppe_offen,boden_methode_belegt,wand_methode_belegt,treppe_methode_belegt})=>{
      const abschnitte=[['boden',boden_offen,boden_methode_belegt],['wand',wand_offen,wand_methode_belegt],['treppe',treppe_offen,treppe_methode_belegt]];
      return {nacharbeit_mit_bestaetigter_methode:abschnitte.filter(([,offen,belegt])=>offen&&belegt).map(([ort])=>ort),
        methode_zuerst_klaeren:abschnitte.filter(([,offen,belegt])=>offen&&!belegt).map(([ort])=>ort),
        hinweis:'Nur beobachtete Aufgaben erfassen. Wasserzugang und konkrete Bedienvorgaben vor Ort klären.'};
    },{boden_offen:true,wand_offen:false,treppe_offen:true,boden_methode_belegt:true,wand_methode_belegt:false,treppe_methode_belegt:false},
    {nacharbeit_mit_bestaetigter_methode:['boden'],methode_zuerst_klaeren:['treppe']}),

  tool('poolroboter_umkehrabweichung_beckenvariante_beleg',
    'Eigene Laufnotizen nach einem Wechsel von Beckenoberfläche oder freigegebener Zone gegeneinander abgrenzen — Mark exactly which prior pool observations need retesting.',
    workshop,{
      modell_gleich:flag('Genaues Robotermodell blieb gleich?'),
      bodenoberflaeche_gleich:flag('Oberfläche des betrachteten Bodens unverändert?'),
      wandoberflaeche_gleich:flag('Betrachtete Wandoberfläche unverändert?'),
      treppenform_gleich:flag('Geometrie der bezeichneten Treppenzone unverändert?'),
      vergleichbare_betriebsbedingungen:flag('Betriebsbedingungen, freigegebene Nutzung und Beobachtbarkeit für die jeweilige Zone bestätigt?')
    },({modell_gleich,bodenoberflaeche_gleich,wandoberflaeche_gleich,treppenform_gleich,vergleichbare_betriebsbedingungen})=>{
      const basis=modell_gleich&&vergleichbare_betriebsbedingungen;
      return {neu_beobachten:[!basis||!bodenoberflaeche_gleich?'boden':null,!basis||!wandoberflaeche_gleich?'wand':null,!basis||!treppenform_gleich?'treppe':null].filter(Boolean),
        hinweis:'Unveränderte Merkmale allein begründen keine Freigabe. Erst Modellvorgaben am gegenwärtigen Becken prüfen.'};
    },{modell_gleich:true,bodenoberflaeche_gleich:true,wandoberflaeche_gleich:false,treppenform_gleich:true,vergleichbare_betriebsbedingungen:true},
    {neu_beobachten:['wand']}),

  tool('poolpflege_zwischenablage_tropfprotokoll',
    'Einen bereits freigegebenen Entnahmeplatz nach beobachteten Tropfen und anderer Nutzung zeitlich einplanen — Schedule the use of a confirmed drip area after retrieval.',
    workshop,{
      abgestellt:minutes('Beobachteter Abstellzeitpunkt nach dokumentierter Entnahme.'),
      trocken_gesichtet:minutes('Späterer Zeitpunkt mit beobachtet abgetrocknetem vorgesehenem Arbeitsbereich.'),
      platz_wieder_noetig:minutes('Nächster vereinbarter Beginn einer anderen Nutzung.'),
      vorbereiten_min:minutes('Zusätzlicher gemessener Zeitbedarf zum Räumen dieses Platzes.'),
      beobachtung_uebertragbar:flag('Freigegebene Ablage und Bedingungen für diesen geplanten Ablauf vergleichbar?')
    },({abgestellt,trocken_gesichtet,platz_wieder_noetig,vorbereiten_min,beobachtung_uebertragbar})=>{
      ordered([abgestellt,trocken_gesichtet]);
      return {reserve_min:beobachtung_uebertragbar?platz_wieder_noetig-trocken_gesichtet-vorbereiten_min:null,
        beobachtetes_abtropffenster_min:trocken_gesichtet-abgestellt,
        hinweis:'Am geplanten Termin Zustand der Abstellfläche erneut vor Ort kontrollieren.'};
    },{abgestellt:650,trocken_gesichtet:670,platz_wieder_noetig:675,vorbereiten_min:8,beobachtung_uebertragbar:true},
    {reserve_min:-3,beobachtetes_abtropffenster_min:20}),

  tool('rasenroboter_zugang_zwei_routen_nachweis',
    'Zwei beobachtete Wege aus je zwei Teilstücken auf fehlende Wegebelege prüfen — Compare route evidence where neither isolated entrance proves the whole trip.',
    workshop,{
      a_eingang:flag('Einfahrt A mit dem genauen System nach Vorgabe beobachtet?'),
      a_anschluss:flag('Anschluss der Route A bis zur vorgesehenen Fläche bestätigt?'),
      b_eingang:flag('Einfahrt B mit dem genauen System bestätigt?'),
      b_anschluss:flag('Anschluss der Route B bis zur Fläche bestätigt?'),
      grundstueckszugriff:flag('Ist Nutzung beider betrachteter Wege durchgängig geklärt?')
    },({a_eingang,a_anschluss,b_eingang,b_anschluss,grundstueckszugriff})=>({
      belegte_wegrouten:grundstueckszugriff?[a_eingang&&a_anschluss?'a':null,b_eingang&&b_anschluss?'b':null].filter(Boolean):[],
      offene_wegteile:[!a_eingang?'a_eingang':null,!a_anschluss?'a_anschluss':null,!b_eingang?'b_eingang':null,!b_anschluss?'b_anschluss':null].filter(Boolean),
      hinweis:'Nur bestätigte Teilstücke dieses Systems verbinden. Freie Wege und die vorgeschriebene Beaufsichtigung bleiben Voraussetzungen.'
    }),{a_eingang:true,a_anschluss:false,b_eingang:true,b_anschluss:true,grundstueckszugriff:true},
    {belegte_wegrouten:['b'],offene_wegteile:['a_anschluss']}),

  tool('maehroboter_gatter_durchfahrt_richtung_paare',
    'Bei einer beobachteten Tordurchfahrt fehlenden Rückweg getrennt festhalten — Check directional passage evidence for each leg of a supervised trip.',
    workshop,{
      hin_pruefungen:count('Vollständig beobachtete Hinversuche.'),
      hin_komplett:count('Davon vollständig befahren.'),
      rueck_pruefungen:count('Vollständig beobachtete Rückversuche.'),
      rueck_komplett:count('Davon vollständig befahren.'),
      gleiches_tor_und_system:flag('Gleiches System, gleicher Torzustand und laut Anleitung vorgesehener Weg?')
    },({hin_pruefungen,hin_komplett,rueck_pruefungen,rueck_komplett,gleiches_tor_und_system})=>{
      whole(hin_pruefungen,hin_komplett,rueck_pruefungen,rueck_komplett);
      if(hin_komplett>hin_pruefungen||rueck_komplett>rueck_pruefungen) throw new RangeError('Vollständige Fahrten übersteigen Versuche.');
      return {hin_prozent:gleiches_tor_und_system&&hin_pruefungen?round(100*hin_komplett/hin_pruefungen):null,
        rueck_prozent:gleiches_tor_und_system&&rueck_pruefungen?round(100*rueck_komplett/rueck_pruefungen):null,
        hinweis:'Nur diese überwachten Durchfahrten. Für Richtungsunterschiede Torzustand und Laufrichtung getrennt notieren.'};
    },{hin_pruefungen:4,hin_komplett:4,rueck_pruefungen:3,rueck_komplett:1,gleiches_tor_und_system:true},
    {hin_prozent:100,rueck_prozent:33.33}),

  tool('maehroboter_uebernommener_garten_aenderungsflaechen',
    'Nach einem veränderten Gartenbereich den weiter verwendbaren Anteil eines alten Aufmaßes bestimmen — Scope the resurvey after fixed garden landmarks change.',
    workshop,{
      alt_m2:area('Gemessene Gesamtfläche des bisherigen Aufmaßes.'),
      beete_geaendert_m2:area('Fläche mit geändertem Beetrand.'),
      weg_geaendert_m2:area('Fläche mit verändertem Weg.'),
      beide_m2:area('Teilfläche, die in beiden Angaben enthalten ist.'),
      gleiche_grundlage:flag('Altes und neues Aufmaß beziehen sich auf dieselben Grundstücksabschnitte?')
    },({alt_m2,beete_geaendert_m2,weg_geaendert_m2,beide_m2,gleiche_grundlage})=>{
      const neu=beete_geaendert_m2+weg_geaendert_m2-beide_m2;
      if(beide_m2>Math.min(beete_geaendert_m2,weg_geaendert_m2)||neu>alt_m2) throw new RangeError('Teilflächen passen nicht zum alten Aufmaß.');
      return {neu_aufzumessen_m2:gleiche_grundlage?round(neu):null,
        nicht_betroffen_m2:gleiche_grundlage?round(alt_m2-neu):null,
        hinweis:'Parallel oder teilweise überlappende Flächen nur einmal zählen. Eignung des Systems separat prüfen.'};
    },{alt_m2:180,beete_geaendert_m2:18,weg_geaendert_m2:12,beide_m2:4,gleiche_grundlage:true},
    {neu_aufzumessen_m2:26,nicht_betroffen_m2:154}),

  tool('rasenroboter_beobachtungsfenster_nach_kurzsperrung',
    'Nach einer vorab vereinbarten Sperrzeit prüfen, ob eine beaufsichtigte Nachprobe am Gartenübergang noch Platz hat — Fit a supervised retest after a shared access closure.',
    workshop,{
      pruefung_ab:minutes('Frühester Zeitpunkt mit verfügbarer Beaufsichtigung.'),
      pruefung_bis:minutes('Ende der verfügbaren Beaufsichtigung am selben Tag.'),
      tor_frei_ab:minutes('Vereinbartes Ende der vorübergehenden Zugangssperre.'),
      probe_min:minutes('Beobachteter Zeitbedarf der vollständig begleiteten Probe.'),
      route_und_erlaubnis_geprueft:flag('Ist die Nutzung mit beaufsichtigter Probe vor Ort bestätigt?')
    },({pruefung_ab,pruefung_bis,tor_frei_ab,probe_min,route_und_erlaubnis_geprueft})=>{
      ordered([pruefung_ab,pruefung_bis]);
      const frei=Math.max(0,pruefung_bis-Math.max(pruefung_ab,tor_frei_ab));
      return {frei_fuer_nachprobe_min:route_und_erlaubnis_geprueft?frei:null,
        fehlende_min:route_und_erlaubnis_geprueft?Math.max(0,probe_min-frei):null,
        hinweis:'Terminabgleich für eine begleitete Probe. Sobald Nutzung oder Beaufsichtigung nicht bestätigt ist, entfällt dieses Fenster.'};
    },{pruefung_ab:570,pruefung_bis:620,tor_frei_ab:600,probe_min:25,route_und_erlaubnis_geprueft:true},
    {frei_fuer_nachprobe_min:20,fehlende_min:5}),

  tool('maehroboter_gartenbeobachtung_mittlere_unterbrechung',
    'Bei vergleichbaren begleiteten Gartenrunden beobachtete Unterbrechungen je Ursache auswerten — Compare the time spent on access pauses and other recorded stops.',
    workshop,{
      zugang_stopps:count('Zahl eindeutig erkannter Pausen wegen des freigegebenen Zugangs.'),
      zugang_min:minutes('Deren beobachtete Gesamtzeit.'),
      weitere_stopps:count('Zahl der separat beobachteten anderen Pausen.'),
      weitere_min:minutes('Genehmigte, separat beobachtete Gesamtzeit dieser Pausen.'),
      gleiches_protokoll:flag('Wurden Start, Ende und Zuordnung bei allen Pausen gleich dokumentiert?')
    },({zugang_stopps,zugang_min,weitere_stopps,weitere_min,gleiches_protokoll})=>{
      whole(zugang_stopps,weitere_stopps);
      if((!zugang_stopps&&zugang_min)||(!weitere_stopps&&weitere_min)) throw new RangeError('Zeit ohne zugehörige Pause.');
      return {zugang_min_je_pause:gleiches_protokoll&&zugang_stopps?round(zugang_min/zugang_stopps):null,
        weitere_min_je_pause:gleiches_protokoll&&weitere_stopps?round(weitere_min/weitere_stopps):null,
        hinweis:'Einordnung der protokollierten Gründe. Technische Ursachen und Eingriffe gehören nicht zu dieser Aufgabe.'};
    },{zugang_stopps:3,zugang_min:21,weitere_stopps:2,weitere_min:8,gleiches_protokoll:true},
    {zugang_min_je_pause:7,weitere_min_je_pause:4}),

  tool('rasenroboter_maehende_teilflaechen_uebergabe',
    'Nach einer beendeten beaufsichtigten Runde Restflächen für die nächste Planung bezeichnen — Separate fully, partly and unobserved areas after one outing.',
    workshop,{
      nord:select('Beobachteter Abschluss auf der bezeichneten Nordfläche.','fertig','teilweise','unbekannt'),
      mitte:select('Beobachteter Abschluss auf der mittleren Fläche.','fertig','teilweise','unbekannt'),
      sued:select('Beobachteter Abschluss auf der bezeichneten Südfläche.','fertig','teilweise','unbekannt'),
      gleiche_kartengrenze:flag('Stimmen die bezeichneten Flächen mit dem eigenen aktuellen Aufmaß überein?')
    },({nord,mitte,sued,gleiche_kartengrenze})=>{
      const zonen=[['nord',nord],['mitte',mitte],['sued',sued]];
      return {sichtbare_reste:gleiche_kartengrenze?zonen.filter(([,zustand])=>zustand==='teilweise').map(([ort])=>ort):[],
        zuerst_erfassen:zonen.filter(([,zustand])=>!gleiche_kartengrenze||zustand==='unbekannt').map(([ort])=>ort),
        hinweis:'Nur Beobachtung festhalten. Die bestätigte Betriebsweise und Beaufsichtigung vor einem weiteren Lauf neu prüfen.'};
    },{nord:'fertig',mitte:'teilweise',sued:'unbekannt',gleiche_kartengrenze:true},
    {sichtbare_reste:['mitte'],zuerst_erfassen:['sued']}),

  tool('rasenroboter_randprobe_referenzpunkt_vor_nach',
    'Wiederkehrende Reststellen an zwei bereits dokumentierten Rasenrändern gezielt nachbeobachten — Separate recurring edge observations from one-off marks.',
    workshop,{
      a_beide:count('Am ersten Rand in beiden begleiteten Proben beobachtete Reststellen.'),
      a_nur_zweite:count('Am ersten Rand nur in der zweiten Probe beobachtete Reststellen.'),
      b_beide:count('Am zweiten Rand in beiden Proben beobachtete Reststellen.'),
      b_nur_zweite:count('Am zweiten Rand nur in der zweiten Probe beobachtete Reststellen.'),
      referenzpunkte_gleich:flag('Gleiche feste Punkte und vergleichbare Sicht in beiden Proben?')
    },({a_beide,a_nur_zweite,b_beide,b_nur_zweite,referenzpunkte_gleich})=>{
      whole(a_beide,a_nur_zweite,b_beide,b_nur_zweite);
      return {wiederkehrend:referenzpunkte_gleich?{a:a_beide,b:b_beide}:null,
        nur_im_zweiten_lauf:referenzpunkte_gleich?{a:a_nur_zweite,b:b_nur_zweite}:null,
        hinweis:'Die Zuordnung setzt gleiche Referenzpunkte voraus. Sie begründet keine technischen Änderungen am Gerät.'};
    },{a_beide:4,a_nur_zweite:6,b_beide:2,b_nur_zweite:1,referenzpunkte_gleich:true},
    {wiederkehrend:{a:4,b:2},nur_im_zweiten_lauf:{a:6,b:1}}),

  tool('maehroboter_grundstueckskizze_nachbarflaeche_abgrenzen',
    'In einer Gartenskizze Fläche mit geklärter Nutzung von gemeinsam genutzter oder offener Fläche trennen — Keep shared or unresolved ground outside the candidate work area.',
    workshop,{
      gesamt_m2:area('Bemaßte Fläche auf der aktuellen Gartenskizze.'),
      fremd_m2:area('Davon dokumentiert separat genutzte Fläche.'),
      gemeinsam_ungeklaert_m2:area('Davon unabhängig abgegrenzte gemeinsam genutzte Fläche mit offener Absprache.'),
      eigene_route_belegt:flag('Ist der Weg zur separat geklärten Fläche vor Ort geklärt?')
    },({gesamt_m2,fremd_m2,gemeinsam_ungeklaert_m2,eigene_route_belegt})=>{
      const rest=gesamt_m2-fremd_m2-gemeinsam_ungeklaert_m2;
      if(rest<-1e-9)throw new RangeError('Teilflächen müssen getrennt sein und zur Skizze passen.');
      return {flaeche_mit_geklaerter_route_m2:eigene_route_belegt?round(Math.max(0,rest)):null,
        aus_plan_herausgehalten_m2:round(fremd_m2+gemeinsam_ungeklaert_m2),
        hinweis:'Die Eingaben beschreiben bestehende Absprachen. Das Ergebnis trifft keine Aussage über Eigentum oder Geräteeignung.'};
    },{gesamt_m2:180,fremd_m2:30,gemeinsam_ungeklaert_m2:14,eigene_route_belegt:true},
    {flaeche_mit_geklaerter_route_m2:136,aus_plan_herausgehalten_m2:44}),

  tool('terrasse_schattenfolge_pause_ohne_platzwechsel',
    'Zwei beobachtete Schattenphasen am selben Tisch auf die längste zusammenhängende Nutzungszeit prüfen — Find the longest continuous shaded interval at one fixed table.',
    terrace,{
      a_ab:minutes('Beginn des ersten durchgehend beobachteten Schattenabschnitts.'),a_bis:minutes('Ende dieses Abschnitts.'),
      b_ab:minutes('Beginn des zweiten Abschnitts.'),b_bis:minutes('Ende des zweiten Abschnitts.'),
      ziel_min:minutes('Eigene gewünschte zusammenhängende Zeit.'),
      tisch_und_sonnenlage_gleich:flag('Sind beide Einträge am gleichen Tisch und für denselben Beobachtungstag?')
    },({a_ab,a_bis,b_ab,b_bis,ziel_min,tisch_und_sonnenlage_gleich})=>{
      ordered([a_ab,a_bis],[b_ab,b_bis]);
      const luecke=Math.max(0,Math.max(a_ab,b_ab)-Math.min(a_bis,b_bis));
      const durchgehend=luecke?Math.max(a_bis-a_ab,b_bis-b_ab):Math.max(a_bis,b_bis)-Math.min(a_ab,b_ab);
      return {laengster_abschnitt_min:tisch_und_sonnenlage_gleich?durchgehend:null,
        ziel_beobachtet:tisch_und_sonnenlage_gleich?durchgehend>=ziel_min:null,
        hinweis:'Schattenzeiten verschieben sich mit Jahreszeit und Wetter. Nur durchgehend beobachtete Abschnitte verwenden.'};
    },{a_ab:810,a_bis:850,b_ab:870,b_bis:930,ziel_min:75,tisch_und_sonnenlage_gleich:true},
    {laengster_abschnitt_min:60,ziel_beobachtet:false}),

  tool('terrasse_bodenluft_schattenprobe_getrennte_messwerte',
    'Bei einer eigenen Beschattungsprobe Änderungen am Belag und in der Luft getrennt darstellen — Separate surface temperature and air observations from a paired shade trial.',
    terrace,{
      belag_unbeschattet_c:n('Gemessene Belagtemperatur ohne betrachteten Schatten.',-30,100),
      belag_beschattet_c:n('Gemessene Belagtemperatur mit Schatten.',-30,100),
      luft_unbeschattet_c:n('Gemessener Luftwert an derselben belüfteten, vor direkter Sonne geschützten Stelle ohne Maßnahme.',-30,65),
      luft_beschattet_c:n('Luftwert mit betrachteter Maßnahme an derselben Stelle.',-30,65),
      messbedingungen_vergleichbar:flag('Messverfahren, Tageszeit und übrige Bedingungen vergleichbar?')
    },({belag_unbeschattet_c,belag_beschattet_c,luft_unbeschattet_c,luft_beschattet_c,messbedingungen_vergleichbar})=>({
      belag_delta_c:messbedingungen_vergleichbar?round(belag_beschattet_c-belag_unbeschattet_c):null,
      luft_delta_c:messbedingungen_vergleichbar?round(luft_beschattet_c-luft_unbeschattet_c):null,
      hinweis:'Nur die eigenen zwei Vergleichszustände beschreiben. Material, Bewölkung und Messmethode bei Wiederholung abgleichen.'
    }),{belag_unbeschattet_c:48,belag_beschattet_c:34,luft_unbeschattet_c:29.1,luft_beschattet_c:28.7,messbedingungen_vergleichbar:true},
    {belag_delta_c:-14,luft_delta_c:-0.4}),

  tool('terrasse_abendsonne_blickrichtung_probe',
    'Zwei beobachtete Terrassenanordnungen auf Blendung bei verschiedenen Blickrichtungen prüfen — Compare glare by facing direction, not just the overall shadow area.',
    terrace,{
      a_blick_zum_tisch:flag('War der Blick zur eigenen Tischfläche in A ausreichend blendfrei?'),
      a_blick_nach_vorn:flag('War der übliche Blick nach vorn in A ausreichend blendfrei?'),
      b_blick_zum_tisch:flag('Entsprechende eigene Beobachtung B am Tisch.'),
      b_blick_nach_vorn:flag('Entsprechende Beobachtung B nach vorn.'),
      gleiche_abendlage:flag('Waren Tageszeit, Himmel und Beobachtungsposition mit der geplanten Abendlage vergleichbar?')
    },({a_blick_zum_tisch,a_blick_nach_vorn,b_blick_zum_tisch,b_blick_nach_vorn,gleiche_abendlage})=>({
      beide_blickrichtungen_passend:gleiche_abendlage?[a_blick_zum_tisch&&a_blick_nach_vorn?'a':null,b_blick_zum_tisch&&b_blick_nach_vorn?'b':null].filter(Boolean):null,
      hinweis:'Eigene visuelle Beobachtung an den tatsächlichen Blickrichtungen. Keine Aussage zu UV-Belastung oder Befestigung.'
    }),{a_blick_zum_tisch:true,a_blick_nach_vorn:false,b_blick_zum_tisch:true,b_blick_nach_vorn:true,gleiche_abendlage:true},
    {beide_blickrichtungen_passend:['b']}),

  tool('terrasse_sonnenschutz_vorab_einraeumen_termin',
    'Zwei getrennte beschlossene Einräumarbeiten vor einer selbst gesetzten Frist mit nur einer Person koordinieren — Fit two planned shade-item removals into one confirmed attendance window.',
    terrace,{
      anwesend_ab:minutes('Früheste persönliche Anwesenheit.'),
      frist:minutes('Selbst vereinbarte Abschlussfrist vor anderen Terminen oder Wetteränderung.'),
      a_min:minutes('Beobachtete Dauer für erlaubtes Einräumen von Gegenstand A.'),
      b_min:minutes('Entsprechende Dauer für Gegenstand B.'),
      wechsel_min:minutes('Beobachtete Zeit zwischen den beiden Arbeitsorten.'),
      arbeiten_dokumentiert:flag('Sind sichere Handhabung laut Anleitung und tatsächliche Anwesenheit für beide Arbeiten geklärt?')
    },({anwesend_ab,frist,a_min,b_min,wechsel_min,arbeiten_dokumentiert})=>{
      const reserve=frist-anwesend_ab-a_min-b_min-wechsel_min;
      return {zeitreserve_min:arbeiten_dokumentiert?reserve:null,vorausplanung:!arbeiten_dokumentiert?'ablauf_klaeren':reserve<0?'frueher_einraeumen':'zeitfenster_reicht_rechnerisch',
        hinweis:'Eigene Frist zur Vorbereitung, kein Windgrenzwert. Herstellervorgaben gehen vor.'};
    },{anwesend_ab:960,frist:990,a_min:14,b_min:12,wechsel_min:7,arbeiten_dokumentiert:true},
    {zeitreserve_min:-3,vorausplanung:'frueher_einraeumen'}),

  tool('terrasse_schattenzuwachs_bestehende_ueberdeckung',
    'Vorhandenen Schatten und zusätzlichen Schatten nach einer veränderten Aufstellung zeitlich auseinanderhalten — Measure newly shaded time rather than counting overlap twice.',
    terrace,{
      vorher_min:minutes('Im Beobachtungsblock zuvor bestätigte Schattenminuten.'),
      nachher_min:minutes('Im gleich langen Vergleichsblock anschließend bestätigte Schattenminuten.'),
      gleiche_schattenmin:minutes('Minuten an denselben Positionen im Block, die in beiden Proben im Schatten lagen.'),
      block_min:minutes('Länge des jeweils vollständig beobachteten Blocks.'),
      vergleich_bestaetigt:flag('Ist es derselbe Ort bei vergleichbarer äußerer Beschattung und gleicher Zeitlage?')
    },({vorher_min,nachher_min,gleiche_schattenmin,block_min,vergleich_bestaetigt})=>{
      if(gleiche_schattenmin>Math.min(vorher_min,nachher_min)||vorher_min+nachher_min-gleiche_schattenmin>block_min)
        throw new RangeError('Überdeckung und Schattenminuten passen nicht in die beiden vergleichbaren Blöcke.');
      return {neu_beschattet_min:vergleich_bestaetigt?nachher_min-gleiche_schattenmin:null,
        zuvor_beschattet_jetzt_offen_min:vergleich_bestaetigt?vorher_min-gleiche_schattenmin:null,
        hinweis:'Beide Beobachtungen auf derselben Zeitachse abgleichen. Entstandener Schatten ist keine nachgewiesene Änderung der Wärmebelastung.'};
    },{vorher_min:27,nachher_min:42,gleiche_schattenmin:20,block_min:60,vergleich_bestaetigt:true},
    {neu_beschattet_min:22,zuvor_beschattet_jetzt_offen_min:7}),

  tool('balkon_sonnenschutz_mietuebergabe_zustandsbelege',
    'Beim Abnehmen genutzten Sonnenschutzes fehlende Zustandsbelege je Balkonbereich erfassen — Identify the missing before-and-after record for a reversible balcony setup.',
    terrace,{
      vor_boden:flag('Gibt es eine vergleichbare Vorheraufnahme der genutzten Bodenstelle?'),
      nach_boden:flag('Gibt es die Nachheraufnahme derselben Bodenstelle?'),
      vor_gelaender:flag('Gibt es eine Vorheraufnahme des beteiligten Geländerbereichs?'),
      nach_gelaender:flag('Gibt es die Nachheraufnahme desselben Geländerbereichs?'),
      gleiches_aufmass:flag('Sind Stellen, Ansichten und Umfang der Übergabe bestätigt?')
    },({vor_boden,nach_boden,vor_gelaender,nach_gelaender,gleiches_aufmass})=>({
      fehlende_dokumentation:!gleiches_aufmass?['aufmass_klaeren']:[
        !vor_boden?'boden_vorher':null,!nach_boden?'boden_nachher':null,
        !vor_gelaender?'gelaender_vorher':null,!nach_gelaender?'gelaender_nachher':null].filter(Boolean),
      hinweis:'Ein Dokumentationsplan. Er beurteilt weder Schäden noch Ansprüche oder Erlaubnis des Vermieters.'
    }),{vor_boden:true,nach_boden:true,vor_gelaender:false,nach_gelaender:true,gleiches_aufmass:true},
    {fehlende_dokumentation:['gelaender_vorher']}),

  tool('terrasse_polster_trocknung_naechste_sitzrunde',
    'Für ein eigenes Nutzungsfenster beobachtete verspätete Polster getrennt von passenden Ersatzplätzen zählen — Plan seating from verified cushion readiness and available replacements.',
    terrace,{
      bestaetigt_trocken:count('Bis zum Termin vor Ort bestätigte trockene Polster.'),
      noch_offen:count('Am selben Termin noch feuchte oder ungeprüfte Polster.'),
      sitzplaetze_mit_ersatz:count('Separat verifizierte nutzbare Ersatzplätze außerhalb der gezählten Polster.'),
      bedarf:count('Für die nächste Runde gewünschte nutzbare Plätze.')
    },({bestaetigt_trocken,noch_offen,sitzplaetze_mit_ersatz,bedarf})=>{
      whole(bestaetigt_trocken,noch_offen,sitzplaetze_mit_ersatz,bedarf);
      const nutzbar=bestaetigt_trocken+sitzplaetze_mit_ersatz;
      return {bestaetigte_plaetze:nutzbar,fehlend:Math.max(0,bedarf-nutzbar),polster_nachpruefen:noch_offen,
        hinweis:'Nur tatsächlich nutzbare Plätze zählen. Treffpunkt und Polsterzustand am Termin abgleichen.'};
    },{bestaetigt_trocken:3,noch_offen:2,sitzplaetze_mit_ersatz:1,bedarf:5},
    {bestaetigte_plaetze:4,fehlend:1,polster_nachpruefen:2}),

  tool('balkontuer_terrassenweg_haeufige_konflikte',
    'Bei zwei tatsächlich erprobten Terrassenaufbauten ungeplantes Umräumen je Türdurchgang vergleichen — Compare real doorway interruptions across two terrace setups.',
    terrace,{
      durchgaenge_a:count('Vollständig beobachtete übliche Türdurchgänge mit Aufbau A.'),
      durchgaenge_b:count('Vollständig beobachtete übliche Türdurchgänge mit Aufbau B.'),
      umraeumen_a:count('Durchgänge in A, bei denen Gegenstände tatsächlich neu abgestellt wurden.'),
      umraeumen_b:count('Entsprechende Durchgänge in B.'),
      vergleichbar:flag('Gleiche Benutzung, Gegenstände und Beobachtungsregeln vor Ort?')
    },({durchgaenge_a,durchgaenge_b,umraeumen_a,umraeumen_b,vergleichbar})=>{
      whole(durchgaenge_a,durchgaenge_b,umraeumen_a,umraeumen_b);
      if(umraeumen_a>durchgaenge_a||umraeumen_b>durchgaenge_b) throw new RangeError('Umräumfälle übersteigen Durchgänge.');
      const rate_a=durchgaenge_a?100*umraeumen_a/durchgaenge_a:null;
      const rate_b=durchgaenge_b?100*umraeumen_b/durchgaenge_b:null;
      return {b_minus_a_prozentpunkte:vergleichbar&&rate_a!==null&&rate_b!==null?round(rate_b-rate_a):null,
        hinweis:'Erfasst benutzte Aufbauten. Durchgangserlaubnis und örtliche Freiräume unabhängig prüfen.'};
    },{durchgaenge_a:10,durchgaenge_b:8,umraeumen_a:4,umraeumen_b:1,vergleichbar:true},
    {b_minus_a_prozentpunkte:-27.5}),

  tool('terrassenbeschattung_zimmerprobe_mit_referenzraum',
    'Beobachtete Innenraumänderung bei Außenbeschattung gegen einen unveränderten Referenzraum einordnen — Compare changes in two rooms without attributing the difference automatically.',
    shade,{
      a_vorher_c:n('Temperatur im Raum mit neu beobachtetem Außenschatten vor dem Vergleich.',-30,65),
      a_nachher_c:n('Dessen Temperatur nach dem dokumentierten Abschnitt.',-30,65),
      b_vorher_c:n('Temperatur im zeitgleich beobachteten unveränderten Raum am Start.',-30,65),
      b_nachher_c:n('Temperatur im unveränderten Vergleichsraum am Ende.',-30,65),
      zeit_und_nutzung_aehnlich:flag('Zeitfenster, Lüftung und sonstige wesentliche Wärmequellen vergleichbar?')
    },({a_vorher_c,a_nachher_c,b_vorher_c,b_nachher_c,zeit_und_nutzung_aehnlich})=>{
      const a=a_nachher_c-a_vorher_c,b=b_nachher_c-b_vorher_c;
      return {raum_a_delta_c:round(a),raum_b_delta_c:round(b),
        beobachteter_unterschied_c:zeit_und_nutzung_aehnlich?round(a-b):null,
        hinweis:'Die Differenz beschreibt eine eigene Parallelbeobachtung. Unterschiede in Bauweise und Sonne können mitwirken.'};
    },{a_vorher_c:26,a_nachher_c:26.2,b_vorher_c:25.5,b_nachher_c:26.4,zeit_und_nutzung_aehnlich:true},
    {raum_a_delta_c:0.2,raum_b_delta_c:0.9,beobachteter_unterschied_c:-0.7}),

  tool('balkon_ausweichplatz_lernpause_rueckkehrbudget',
    'Eine geplante Pause auf dem geschützten Außenplatz zwischen zwei festen Innenaufgaben unterbringen — Reserve a genuinely usable outdoor break including the return.',
    cooling,{
      erste_aufgabe_bis:minutes('Ende der ersten Innenaufgabe.'),
      weiterarbeit_ab:minutes('Unverschiebbarer Start der nächsten Aufgabe am selben Tag.'),
      hinaus_min:minutes('Beobachteter Hinweg mit der nötigen Vorbereitung.'),
      rueckkehr_min:minutes('Beobachtete Rückkehr mit vollständigem Wiedereinstieg.'),
      pause_min:minutes('Eigene gewünschte Dauer der Pause am Platz.'),
      aussenplatz_zur_zeit_geprueft:flag('Freie Nutzung, ausreichender Schatten und persönliche Bedingungen am Platz bestätigt?')
    },({erste_aufgabe_bis,weiterarbeit_ab,hinaus_min,rueckkehr_min,pause_min,aussenplatz_zur_zeit_geprueft})=>{
      ordered([erste_aufgabe_bis,weiterarbeit_ab]);
      const nutzbar=Math.max(0,weiterarbeit_ab-erste_aufgabe_bis-hinaus_min-rueckkehr_min);
      return {nutzbare_pause_min:aussenplatz_zur_zeit_geprueft?nutzbar:null,
        fehlend_min:aussenplatz_zur_zeit_geprueft?Math.max(0,pause_min-nutzbar):null,
        hinweis:'Für die selbst beobachtete Nutzung. Schatten und Hitze am Termin nochmals prüfen.'};
    },{erste_aufgabe_bis:750,weiterarbeit_ab:790,hinaus_min:6,rueckkehr_min:12,pause_min:25,aussenplatz_zur_zeit_geprueft:true},
    {nutzbare_pause_min:22,fehlend_min:3}),

  tool('terrasse_beschattung_saison_probeuhrzeit_vergleich',
    'Getestete Schattenzeiten zweier Jahresabschnitte gegen den gleichen geplanten Termin prüfen — Compare two observed seasonal shadow shifts at the same meeting time.',
    terrace,{
      alt_beginn:minutes('Beobachteter Beginn der Beschattung im früheren Jahresabschnitt.'),
      alt_ende:minutes('Beobachtetes Ende desselben Abschnitts.'),
      aktuell_beginn:minutes('In der jetzigen Jahreszeit beobachteter Beginn.'),
      aktuell_ende:minutes('In der jetzigen Jahreszeit beobachtetes Ende.'),
      termin:minutes('Geplanter Besuchsbeginn, verglichen auf derselben Ortsuhrskala.'),
      ort_und_aufbau_gleich:flag('Tatsächlich gleicher Terrassenplatz und gleicher festgehaltener Aufbau?')
    },({alt_beginn,alt_ende,aktuell_beginn,aktuell_ende,termin,ort_und_aufbau_gleich})=>{
      ordered([alt_beginn,alt_ende],[aktuell_beginn,aktuell_ende]);
      return {beginn_verschoben_min:ort_und_aufbau_gleich?aktuell_beginn-alt_beginn:null,
        termin_frueher_im_schatten:ort_und_aufbau_gleich?termin>=alt_beginn&&termin<alt_ende:null,
        termin_aktuell_im_schatten:ort_und_aufbau_gleich?termin>=aktuell_beginn&&termin<aktuell_ende:null,
        hinweis:'Nur die beiden örtlichen Beobachtungen auswerten. Sonnenlage und Uhrzeit am konkreten Tag neu prüfen.'};
    },{alt_beginn:975,alt_ende:1050,aktuell_beginn:1030,aktuell_ende:1100,termin:1000,ort_und_aufbau_gleich:true},
    {beginn_verschoben_min:55,termin_frueher_im_schatten:true,termin_aktuell_im_schatten:false}),

  tool('terrasse_sitzgruppe_schatten_kleinteile_freigabe',
    'Einen beobachteten Schattenplatz darauf prüfen, ob der kleine Tisch und die genutzten Sitzplätze gleichzeitig darin bleiben — Verify simultaneous shade for a group and tabletop, not successive coverage.',
    terrace,{
      proben:count('Terminbezogene Stichproben mit durchgehend gleicher Aufstellung.'),
      plaetze_im_schatten:count('Proben, in denen alle benutzten Plätze beschattet waren.'),
      tisch_im_schatten:count('Proben mit dem vorgesehenen Tischabschnitt im Schatten.'),
      gleichzeitig:count('Proben, in denen beides tatsächlich gleichzeitig im Schatten war.')
    },({proben,plaetze_im_schatten,tisch_im_schatten,gleichzeitig})=>{
      whole(proben,plaetze_im_schatten,tisch_im_schatten,gleichzeitig);
      if(!proben||gleichzeitig>Math.min(plaetze_im_schatten,tisch_im_schatten)||
        plaetze_im_schatten+tisch_im_schatten-gleichzeitig>proben) throw new RangeError('Die Teilbeobachtungen passen nicht zur Gesamtzahl.');
      return {beides_prozent:round(100*gleichzeitig/proben),nur_plaetze:plaetze_im_schatten-gleichzeitig,
        nur_tisch:tisch_im_schatten-gleichzeitig,
        hinweis:'Die Quote beschreibt die Stichproben. Zwischen den Stichproben gibt es keine bestätigte fortdauernde Beschattung.'};
    },{proben:8,plaetze_im_schatten:6,tisch_im_schatten:5,gleichzeitig:4},
    {beides_prozent:50,nur_plaetze:2,nur_tisch:1}),

  tool('terrasse_ausrichtung_trockener_stellflaeche_protokoll',
    'Nach zwei kontrollierten Regenpausen festhalten, welche bereits abgesprochenen Abstellflächen wieder trocken beobachtet wurden — Preserve verified dry intervals for two staging areas.',
    terrace,{
      a_regenende:minutes('Beobachtetes Regenende für Fläche A.'),
      a_trocken:minutes('Zeitpunkt des ersten trockenen Befunds bei A.'),
      b_regenende:minutes('Beobachtetes Regenende für Fläche B.'),
      b_trocken:minutes('Zeitpunkt des ersten trockenen Befunds bei B.'),
      beobachtungstakte_gleich:flag('Beide Flächen mit vergleichbarem Prüfintervall und gleich strenger eigener Prüfung beobachtet?')
    },({a_regenende,a_trocken,b_regenende,b_trocken,beobachtungstakte_gleich})=>{
      ordered([a_regenende,a_trocken],[b_regenende,b_trocken]);
      const a=a_trocken-a_regenende,b=b_trocken-b_regenende;
      return {a_bis_zum_ersten_befund_min:a,b_bis_zum_ersten_befund_min:b,
        b_minus_a_min:beobachtungstakte_gleich?b-a:null,
        hinweis:'Die trockene Oberfläche kann schon vor der Prüfung erreicht sein. Vor jeder Nutzung am geplanten Platz nachsehen.'};
    },{a_regenende:550,a_trocken:600,b_regenende:550,b_trocken:625,beobachtungstakte_gleich:true},
    {a_bis_zum_ersten_befund_min:50,b_bis_zum_ersten_befund_min:75,b_minus_a_min:25}),

  tool('poolreinigung_gleiches_raster_zwei_beobachtende',
    'Beim Auswerten zweier Sichtnotizen zum gleichen Poolabschnitt bestätigte und widersprüchliche Funde getrennt ausweisen — Preserve observer agreement rather than pooling their counts.',
    workshop,{
      a_funde:count('Von Person A am selben Raster markierte sichtbare Stellen.'),
      b_funde:count('Von Person B markierte sichtbare Stellen.'),
      deckung:count('Durch Abgleich der Rasterpositionen bestätigte gleiche Funde.'),
      eintraege_zeitgleich:flag('Zeitfenster, Raster und Bewertungsregel in beiden Notizen gleich?')
    },({a_funde,b_funde,deckung,eintraege_zeitgleich})=>{
      whole(a_funde,b_funde,deckung);
      if(deckung>Math.min(a_funde,b_funde)) throw new RangeError('Gemeinsame Funde übersteigen eine Liste.');
      return {gemeinsam_belegt:eintraege_zeitgleich?deckung:null,
        erneut_ansehen:eintraege_zeitgleich?a_funde+b_funde-2*deckung:null,
        hinweis:'Nur abgeglichene Ortsmarken vergleichen. Sichtnotizen erlauben keine Aussage zur Wasserqualität.'};
    },{a_funde:9,b_funde:7,deckung:5,eintraege_zeitgleich:true},
    {gemeinsam_belegt:5,erneut_ansehen:6}),
];
