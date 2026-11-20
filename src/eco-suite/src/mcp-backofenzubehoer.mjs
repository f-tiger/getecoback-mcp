const products='/produkte.html';
const rails={
  hez638370:{label:'HEZ638370',source:'https://media3.bosch-home.com/Documents/specsheet/de-DE/HEZ638370.pdf'},
  hfc72:{label:'HFC 72',source:'https://www.miele.de/product/9520670/original-miele-flexiclip-vollauszuege-pyrofit-hfc-72'},
  hfc70:{label:'HFC 70',source:'https://www.miele.de/product/9520650/original-miele-flexiclip-vollauszuege-hfc-70'},
  hfc70_c:{label:'HFC 70-C',source:'https://www.miele.de/product/10581490/original-miele-flexiclip-vollauszuege-hfc-70-c'},
};
const h2861='https://www.miele.de/product/12144610/backofen-h-2861-bp-edelstahl-cleansteel';
const h2861Manual='https://media.miele.com/downloads/85/93/00_C7F12828C43B1FD0A7F0508AFEC78593.pdf';
const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const pick=(description,...values)=>({type:'string',description,enum:values});
const proof=description=>pick(description,'bestaetigt','abweichend','offen');
const count=description=>num(description,0,100);
const level=description=>num(description,1,12);
const mm=description=>num(description,0,3000);
const round=value=>Number(value.toFixed(2));
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Ganze Stückzahlen oder Ebenen');
}
function tool(name,description,properties,calculate,args,expect){
  return {name,description,page:products,properties,calculate,example:{args,expect}};
}

export const backofenzubehoer=[
  tool('backofenauszug_modellbereich_und_betriebsart',
    'Bosch HEZ638370 und Miele HFC 72, HFC 70 sowie HFC 70-C anhand der dokumentierten Gerätefamilie abgleichen — Check exact rail families and explicit use exclusions.',
    {auszug:pick('Genaue Zubehörbezeichnung.',...Object.keys(rails)),
      geraeterahmen:pick('Belegte Gerätefamilie des Hauptgeräts.','bosch_60cm_backofen','bosch_andere_bauform','miele_h2000','miele_h6000_h7000','miele_dgc6000_dgc7000','anderer','offen'),
      pyrolyse:pick('Pyrolysefunktion des konkreten Hauptgeräts.','ja','nein','offen'),
      backwagen:pick('Hat der Bosch-Backofen einen Backwagen?','ja','nein','offen'),
      bosch_nutzung:pick('Vorgesehener Betriebsumfang für Bosch.','backen','reine_mikrowelle','dampfgaren','anderer_oder_offen'),
      exakte_zuordnung:proof('Hat der Hersteller die genaue Gerätekennung und dieses Zubehör für den geplanten Einsatz abgeglichen?')},
    ({auszug,geraeterahmen,pyrolyse,backwagen,bosch_nutzung,exakte_zuordnung})=>{
      const families={hez638370:['bosch_60cm_backofen'],hfc72:['miele_h6000_h7000'],hfc70:['miele_h6000_h7000','miele_dgc6000_dgc7000'],hfc70_c:['miele_h2000']};
      const bosch=auszug==='hez638370';
      let status;
      if(geraeterahmen==='offen') status='geraetefamilie_belegen';
      else if(!families[auszug].includes(geraeterahmen)) status='geraetefamilie_ausserhalb_beleg';
      else if(bosch&&(backwagen==='ja'||['reine_mikrowelle','dampfgaren'].includes(bosch_nutzung))) status='bosch_ausnahmekriterium';
      else if((bosch||auszug==='hfc72')&&pyrolyse!=='ja') status=pyrolyse==='offen'?'pyrolysefunktion_klaeren':'pyrolysefunktion_fehlt';
      else if(bosch&&(backwagen==='offen'||bosch_nutzung==='anderer_oder_offen')) status='bauform_oder_betriebsart_offen';
      else if(exakte_zuordnung==='abweichend') status='exakte_zuordnung_abweichend';
      else status=exakte_zuordnung==='bestaetigt'?'dokumentierte_zuordnung_abgeglichen':'baureihenbereich_passt_exakter_beleg_offen';
      return {status,auszug:rails[auszug].label,primaerquelle:rails[auszug].source,
        grenze:'Abgleich dokumentierter Gerätefamilien und Betriebsarten. Produktmaße, ähnliche Namen und eine Beigabe allein ersetzen die genaue Herstellerzuordnung nicht.'};
    },{auszug:'hfc72',geraeterahmen:'miele_h6000_h7000',pyrolyse:'offen',backwagen:'offen',bosch_nutzung:'anderer_oder_offen',exakte_zuordnung:'offen'},
    {status:'pyrolysefunktion_klaeren',auszug:'HFC 72',primaerquelle:rails.hfc72.source}),

  tool('backofenzubehoer_reinigungsart_exakter_beleg',
    'Pyrolyse- und Spülmaschinenbelege für genaues Zubehör vom Merkmal des Backofens trennen — Evaluate the requested cleaning method from its actual scope.',
    {geraet:pick('Exakt bestätigtes Hauptgerät oder passender Herstellerbereich.','h2861bp_cleansteel_12144610','anderes_geraet','offen'),
      teil:pick('Eindeutig identifiziertes Teil.','hez638370','hfc72','hfc70','hfc70_c','hbb71','hubb71','rost','seitengitter','anderes','offen'),
      verfahren:pick('Nachzulesende Reinigungsart.','garraum_pyrolyse','geschirrspueler'),
      teil_zum_geraet_belegt:yes('Ist für genau dieses Gerät und Teil die Herstellerzuordnung bestätigt?'),
      anleitungsbefund:proof('Zusätzlicher eindeutiger Herstellerbeleg für genau diese Geräte-Teil-Methoden-Kombination. Offen, wenn nur das Gerät eine Reinigungsfunktion nennt.')},
    ({geraet,teil,verfahren,teil_zum_geraet_belegt,anleitungsbefund})=>{
      const included=['hfc70_c','hbb71','hubb71','rost','seitengitter'].includes(teil);
      let status, source=null;
      if(geraet==='offen'||teil==='offen'||!teil_zum_geraet_belegt) status='geraet_teil_und_anleitung_zuordnen';
      else if(geraet==='h2861bp_cleansteel_12144610'&&included){
        status='genannte_reinigungsart_laut_h2861bp_anleitung_ausgeschlossen';
        source=h2861Manual;
      } else if(anleitungsbefund!=='offen') status=anleitungsbefund==='bestaetigt'?'eingetragener_exakter_beleg':'eingetragener_ausschluss';
      else if(teil==='hfc72'&&verfahren==='garraum_pyrolyse'){
        status='pyrofit_am_teil_belegt_geraeteanleitung_abgleichen';
        source=rails.hfc72.source;
      } else status='teilbezogener_reinigungsbeleg_offen';
      return {status,primaerquelle:source,
        grenze:'Miele H 2861 BP Anleitung S. 101 für den genannten Lieferumfang. PerfectClean, Gerätepyrolyse oder Lieferumfang sind allein kein Beleg für Mitreinigung.'};
    },{geraet:'h2861bp_cleansteel_12144610',teil:'hfc70_c',verfahren:'garraum_pyrolyse',teil_zum_geraet_belegt:true,anleitungsbefund:'offen'},
    {status:'genannte_reinigungsart_laut_h2861bp_anleitung_ausgeschlossen',primaerquelle:h2861Manual}),

  tool('h2861bp_auszug_gitter_blech_packeinheit',
    'Den deutschen Serienlieferumfang nach individuellen Stücken und angenommenen Paaren abgleichen — Audit the exact H 2861 BP receipt without counting one rail as one pair.',
    {exakte_de_variante:yes('Bestätigtes H 2861 BP Edelstahl/CleanSteel mit Materialnummer 12144610.'),
      vertrag_enthaelt_serienumfang:yes('Wird der reguläre Lieferumfang für das konkrete Angebot ausdrücklich erwartet?'),
      hbb71:proof('Ist das einzelne HBB 71 als vorhanden bestätigt?'),hubb71:proof('Ist das einzelne HUBB 71 als vorhanden bestätigt?'),rost:proof('Ist der einzelne Back- und Bratrost als vorhanden bestätigt?'),
      flexiclip_paar:proof('Ist das vollständige HFC 70-C Paar als vorhanden bestätigt?'),gitter_paar:proof('Ist das vollständige separate Aufnahmegitterpaar als vorhanden bestätigt?')},
    ({exakte_de_variante,vertrag_enthaelt_serienumfang,hbb71,hubb71,rost,flexiclip_paar,gitter_paar})=>{
      const entries=[['hbb71',hbb71],['hubb71',hubb71],['rost',rost],['hfc70_c_paar',flexiclip_paar],['seitengitter_paar',gitter_paar]];
      const comparable=exakte_de_variante&&vertrag_enthaelt_serienumfang;
      return {offene_positionen:comparable?entries.filter(([,state])=>state==='offen').map(([part])=>part):null,
        festgestellte_abweichungen:comparable?entries.filter(([,state])=>state==='abweichend').map(([part])=>part):null,
        primaerquelle:h2861,grenze:'Die Herstellerliste enthält fünf Positionen mit je einer Packeinheit, zwei davon sind Paare. Gebrauchtangebot und tatsächlichen Empfang separat prüfen.'};
    },{exakte_de_variante:true,vertrag_enthaelt_serienumfang:true,hbb71:'bestaetigt',hubb71:'bestaetigt',rost:'bestaetigt',flexiclip_paar:'abweichend',gitter_paar:'offen'},
    {offene_positionen:['seitengitter_paar'],festgestellte_abweichungen:['hfc70_c_paar'],primaerquelle:h2861}),

  tool('miele_flexiclip_simultane_ebenen_paarbedarf',
    'Bereits vollständige passende Paare erst gegen wirklich gleichzeitig benötigte Auflageebenen rechnen — Count how many complete single-pair boxes remain needed.',
    {auszug:pick('Genau belegter Miele FlexiClip Typ.','hfc72','hfc70','hfc70_c'),
      zuordnung_gleichzeitig:yes('Sind die konkreten Ebenen und die gewünschte gleichzeitige Ausstattung für Gerät und Zubehör nach Unterlagen geprüft?'),
      benoetigte_ebenen:count('Anzahl der Ebenen, die im eigenen Ablauf gleichzeitig einen Auszug brauchen.'),
      bestaetigte_paare:count('Bereits vollständige passende Paare außerhalb der noch nicht bestätigten Beigaben.'),
      angekuendigte_paare:count('Zusätzlich zugesagte, aber am konkreten Gerät oder Paket noch nicht bestätigte Paare.')},
    ({auszug,zuordnung_gleichzeitig,benoetigte_ebenen,bestaetigte_paare,angekuendigte_paare})=>{
      whole(benoetigte_ebenen,bestaetigte_paare,angekuendigte_paare);
      const missing=Math.max(0,benoetigte_ebenen-bestaetigte_paare);
      return {kaufbedarf_ohne_offene_beigaben:zuordnung_gleichzeitig?missing:null,
        bedarf_falls_beigaben_bestaetigt:zuordnung_gleichzeitig?Math.max(0,missing-angekuendigte_paare):null,
        packeinheit_paar:1,primaerquelle:rails[auszug].source,
        grenze:'Jede dieser Miele-Packungen nennt ein Paar. Errechnet keine maximal zulässige Anzahl von Auszügen, keinen Bestand und keine Kompatibilität.'};
    },{auszug:'hfc70_c',zuordnung_gleichzeitig:true,benoetigte_ebenen:3,bestaetigte_paare:1,angekuendigte_paare:1},
    {kaufbedarf_ohne_offene_beigaben:2,bedarf_falls_beigaben_bestaetigt:1,packeinheit_paar:1}),

  tool('bosch_hez638370_feste_ebenen_arbeitsfolge',
    'Eine nacheinander genutzte Ebenenfolge mit den drei ausdrücklich genannten Bosch-Auszugsebenen abgleichen — Locate requested positions outside HEZ638370’s fixed coverage.',
    {exakte_zuordnung_belegt:yes('Ist HEZ638370 für die konkrete Gerätekennung und den beabsichtigten Einsatz bereits bestätigt?'),
      erste:level('Erste im eigenen Ablauf benutzte Ebene.'),zweite:level('Zweite im eigenen Ablauf benutzte Ebene.'),dritte:level('Dritte im eigenen Ablauf benutzte Ebene.')},
    ({exakte_zuordnung_belegt,erste,zweite,dritte})=>{
      whole(erste,zweite,dritte);
      const uncovered=[erste,zweite,dritte].flatMap((number,index)=>number>3?[index+1]:[]);
      return {belegte_feste_positionen:[1,2,3],ablaufschritte_ausserhalb:exakte_zuordnung_belegt?uncovered:null,
        primaerquelle:rails.hez638370.source,grenze:'Die Zahlen bezeichnen feste Ebenen, keine Zahl loser Schienen oder Packeinheiten. Den individuellen Ablauf nur für belegte Positionen beurteilen.'};
    },{exakte_zuordnung_belegt:true,erste:2,zweite:4,dritte:2},
    {belegte_feste_positionen:[1,2,3],ablaufschritte_ausserhalb:[2]}),

  tool('backofenauszug_paarbeleg_hinweis_auf_andere_ebene',
    'Einzeln belegte linke und rechte Schienen eines Angebots mit seiner konkreten Ebenenzuordnung prüfen — Verify that two observed rails actually document the same requested pair and position.',
    {beide_teile_sichtbar:yes('Sind linke und rechte Seite einzeln am tatsächlich angebotenen Set identifiziert?'),
      gleiche_paarzuordnung:proof('Sind beide Teile vom Hersteller dokumentiert als genau dieses Paar zugeordnet?'),
      geplante_ebene:level('Für den eigenen Plan benötigte Ebene.'),
      links_ebene:level('Anhand der Unterlagen belegte linke Position, Platzhalter 1 falls der Ebenenbeleg offen ist.'),
      rechts_ebene:level('Anhand der Unterlagen belegte rechte Position, Platzhalter 1 falls der Ebenenbeleg offen ist.'),
      beide_ebenenbelege:yes('Sind beide Positionsbelege für dieses Gerät verfügbar?')},
    ({beide_teile_sichtbar,gleiche_paarzuordnung,geplante_ebene,links_ebene,rechts_ebene,beide_ebenenbelege})=>{
      whole(geplante_ebene,links_ebene,rechts_ebene);
      const side=beide_teile_sichtbar&&beide_ebenenbelege?[links_ebene!==geplante_ebene?'links':null,rechts_ebene!==geplante_ebene?'rechts':null].filter(Boolean):null;
      return {seiten_mit_anderer_ebene:side,
        ergebnis:!beide_teile_sichtbar||!beide_ebenenbelege?'seiten_oder_ebenenbeleg_offen':side.length?'positionsbeleg_weicht_ab':gleiche_paarzuordnung==='bestaetigt'?'dokumentierter_paarumfang_fuer_ebene':gleiche_paarzuordnung==='abweichend'?'keine_belegte_paarung':'paarzuordnung_offen',
        grenze:'Paar und Ebene dokumentarisch abgleichen. Keine Aussage zur Montage oder zur mechanischen Verwendbarkeit.'};
    },{beide_teile_sichtbar:true,gleiche_paarzuordnung:'offen',geplante_ebene:2,links_ebene:2,rechts_ebene:3,beide_ebenenbelege:true},
    {seiten_mit_anderer_ebene:['rechts'],ergebnis:'positionsbeleg_weicht_ab'}),

  tool('backofenzubehoer_nachkauf_bestand_eigenes_exemplar',
    'Bei Angeboten für ein bestimmtes Schienenpaar einen ausdrücklichen Teilebeleg von bloßem Zustands- oder Shopbestand trennen — Check whether claimed seller stock is tied to a complete identified unit.',
    {passung_unabhaengig:proof('Exakte Herstellerzuordnung zum eigenen Gerät.'),
      anbieterstatus:pick('Vorliegender Verkäuferstatus.','paar_physisch_bestaetigt','nur_listenstatus','einzelteil_bestaetigt','offen'),
      aktuelles_exemplar:proof('Gehört die vorhandene Prüfung genau zum tatsächlich bereitgestellten Exemplar?'),
      anderer_ersatz_ausreichend:yes('Deckt vorhandenes, passend bestätigtes Zubehör den gewünschten Handgriff bereits ab?')},
    ({passung_unabhaengig,anbieterstatus,aktuelles_exemplar,anderer_ersatz_ausreichend})=>({
      kaufgrund:anderer_ersatz_ausreichend?'vorhandene_loesung_nutzen':passung_unabhaengig!=='bestaetigt'?'zuordnung_klaeren':anbieterstatus==='einzelteil_bestaetigt'?'vollstaendiges_paar_klaeren':
        anbieterstatus!=='paar_physisch_bestaetigt'||aktuelles_exemplar!=='bestaetigt'?'angebot_fuer_exaktes_paar_offen':'belege_fuer_paar_notiert',
      grenze:'Nur vorliegende Bestätigung einer konkreten Einheit. Keine Live-Verfügbarkeit, kein Preis und keine Bestellung.'}
    ),{passung_unabhaengig:'bestaetigt',anbieterstatus:'nur_listenstatus',aktuelles_exemplar:'offen',anderer_ersatz_ausreichend:false},
    {kaufgrund:'angebot_fuer_exaktes_paar_offen'}),

  tool('backofenauszug_tatsaechlich_sichtbare_blechtiefe',
    'Am kalten vorhandenen Aufbau die tatsächlich erreichbare Blechfläche mit der für deinen Griff benötigten Tiefe vergleichen — Check real access beyond the label full extension.',
    {kalte_probe_und_zuordnung:yes('Sind ausgezogenes Blech und Bezugskante am kalten und bestätigten Aufbau eindeutig dokumentiert?'),
      blechtiefe_mm:mm('Gesamte für die Aufgabe relevante Blechtiefe.'),verdeckt_mm:mm('Von hinten verbleibende unzugängliche Tiefe bei der beobachteten Auszugsstellung.'),
      erforderliche_sichttiefe_mm:mm('Für den eigenen Zugriff tatsächlich benötigte zugängliche Tiefe.')},
    ({kalte_probe_und_zuordnung,blechtiefe_mm,verdeckt_mm,erforderliche_sichttiefe_mm})=>{
      if(!blechtiefe_mm||verdeckt_mm>blechtiefe_mm) throw new RangeError('Beobachtete Blechtiefen');
      const accessible=blechtiefe_mm-verdeckt_mm;
      return {sichtzugang_mm:kalte_probe_und_zuordnung?round(accessible):null,rest_zum_eigenen_ziel_mm:kalte_probe_und_zuordnung?round(accessible-erforderliche_sichttiefe_mm):null,
        grenze:'Geometrische Sichtprobe an genau dieser Kombination. Begriffe wie Vollauszug belegen keinen Bedienweg und keine Belastbarkeit.'};
    },{kalte_probe_und_zuordnung:true,blechtiefe_mm:380,verdeckt_mm:45,erforderliche_sichttiefe_mm:350},
    {sichtzugang_mm:335,rest_zum_eigenen_ziel_mm:-15}),

  tool('h2861bp_plus_hfc_tabellenspalte_und_ebenenbezug',
    'Beim H 2861 BP die passende Tabellenkennzeichnung und zwei unterschiedlich bezeichnete Ebenen einordnen — Check +HFC versus −HFC and keep rail and food positions distinct.',
    {exakte_de_variante:yes('Bestätigter H 2861 BP Edelstahl/CleanSteel, Materialnummer 12144610, mit passender deutscher Anleitung.'),
      tabelle:pick('In der ausgewählten Handbuchspalte tatsächlich gelesene Kennzeichnung.','plus_hfc','minus_hfc','offen'),
      hfc70_c_im_abgleich:pick('Ist in der dokumentierten betrachteten Konfiguration HFC 70-C vorhanden?','ja','nein','offen'),
      schienenebene:level('Unabhängig belegte physische Schienenebene, Platzhalter 1 bei ungeklärtem Bezug.'),
      gargutebene:level('In der Tabelle oder Beobachtung ausdrücklich getrennt angegebene Gargutebene.'),
      beide_ebenen_eindeutig:yes('Sind die beiden eingetragenen Ebenen ausdrücklich verschieden bezeichnet und beide Angaben belegt?')},
    ({exakte_de_variante,tabelle,hfc70_c_im_abgleich,schienenebene,gargutebene,beide_ebenen_eindeutig})=>{
      whole(schienenebene,gargutebene);
      const known=exakte_de_variante&&hfc70_c_im_abgleich!=='offen'&&tabelle!=='offen';
      const levelsKnown=exakte_de_variante&&hfc70_c_im_abgleich==='ja'&&beide_ebenen_eindeutig;
      return {tabellenspalte_zur_konfiguration:known?(tabelle==='plus_hfc')===(hfc70_c_im_abgleich==='ja'):null,
        schienenebene_im_belegten_bereich:levelsKnown?schienenebene<=3:null,
        dokumentiertes_beispiel_erkannt:levelsKnown?schienenebene===1&&gargutebene===2:null,
        primaerquelle:h2861Manual,grenze:'H 2861 BP Anleitung S. 23, 42, 90 ff. Die genannte Beispielzuordnung ist kein allgemeiner Ebenenversatz. Keine Montage- oder Betriebsempfehlung.'};
    },{exakte_de_variante:true,tabelle:'minus_hfc',hfc70_c_im_abgleich:'ja',schienenebene:1,gargutebene:2,beide_ebenen_eindeutig:true},
    {tabellenspalte_zur_konfiguration:false,schienenebene_im_belegten_bereich:true,dokumentiertes_beispiel_erkannt:true}),

  tool('backofenauszug_obere_untere_kalte_greifspur',
    'Niedrigeren Abstand über einem kalten Blech vom tatsächlichen Greifraum davor unterscheiden — Compare the measured vertical access gap against a personal handling envelope.',
    {kalte_anordnung_geprueft:yes('Sind beide belegten Ebenen und die Bewegungsstellung am kalten Aufbau eindeutig beobachtet?'),
      unterkante_oben_mm:mm('Niedrigster Punkt des oberen Elements in der beobachteten Stellung.'),
      oberkante_unten_mm:mm('Höchster Punkt des unteren geplanten Blechaufbaus in derselben Stellung.'),greifraum_bedarf_mm:mm('Selbst gemessener zusätzlicher vertikaler Raum für den vorgesehenen Kontrollgriff.')},
    ({kalte_anordnung_geprueft,unterkante_oben_mm,oberkante_unten_mm,greifraum_bedarf_mm})=>{
      const gap=unterkante_oben_mm-oberkante_unten_mm;
      return {vertikaler_spalt_mm:kalte_anordnung_geprueft?round(gap):null,
        rest_fuer_eigenen_griff_mm:kalte_anordnung_geprueft?round(gap-greifraum_bedarf_mm):null,
        grenze:'Geometrie eines belegten kalten Punkts. Kein Nachweis zur Betriebsfreigabe, gleichzeitigen Nutzung oder Handhabung heißer Geräte.'};
    },{kalte_anordnung_geprueft:true,unterkante_oben_mm:870,oberkante_unten_mm:821,greifraum_bedarf_mm:65},
    {vertikaler_spalt_mm:49,rest_fuer_eigenen_griff_mm:-16}),

  tool('backofenzubehoer_entnahmebereich_vollstaendige_uebung',
    'Bei kalter Probe feststellen, ob ein bereits freier Auszug auch den geplanten zweiten Handgriff zulässt — Distinguish reaching a tray from completing the intended check.',
    {pruefaufbau_belegt:yes('Gerät, Auszug, Blech und zwei zusammengehörige Handgriffe wurden im kalten Vergleich bestätigt.'),
      griffpunkt_erreicht:yes('Wurde der erste Griffpunkt tatsächlich erreicht?'),
      vorderer_bereich:proof('Selbst beobachteter Zugriff im vorderen Bereich.'),hinterer_bereich:proof('Selbst beobachteter Zugriff im hinteren Bereich.'),
      hinten_erforderlich:yes('Ist der hintere Handgriff für den beabsichtigten Ablauf notwendig?')},
    ({pruefaufbau_belegt,griffpunkt_erreicht,vorderer_bereich,hinterer_bereich,hinten_erforderlich})=>({
      noetige_arbeitsprobe_bestaetigt:pruefaufbau_belegt?griffpunkt_erreicht&&vorderer_bereich==='bestaetigt'&&(!hinten_erforderlich||hinterer_bereich==='bestaetigt'):null,
      nochmal_ansehen:!pruefaufbau_belegt?['aufbau']:[griffpunkt_erreicht?null:'griff',vorderer_bereich==='bestaetigt'?null:'vorderer_bereich',hinten_erforderlich&&hinterer_bereich!=='bestaetigt'?'hinterer_bereich':null].filter(Boolean),
      grenze:'Gilt für beobachtete kalte Handgriffe. Offen und abweichend sind getrennte Beobachtungen und ersetzen keine Geräteanleitung.'}
    ),{pruefaufbau_belegt:true,griffpunkt_erreicht:true,vorderer_bereich:'bestaetigt',hinterer_bereich:'offen',hinten_erforderlich:true},
    {noetige_arbeitsprobe_bestaetigt:false,nochmal_ansehen:['hinterer_bereich']}),

  tool('backofenauszug_zwei_kalte_blickhoehen_ohne_umbau',
    'Bei zwei möglichen belegten Ebenen feststellen, ob alle nötigen Sichtpunkte ohne Positionswechsel erkennbar sind — Check alternative heights by uniquely visible required marks.',
    {marken_gleich:yes('Sind am kalten Aufbau in beiden betrachteten Stellungen dieselben erforderlichen Sichtmarken identifiziert?'),
      notwendig:count('Sichtmarken für einen vollständigen eigenen Kontrollschritt.'),in_a:count('Davon in Position A ohne Wechsel tatsächlich lesbare Marken.'),
      in_b:count('Davon in Position B ohne Wechsel tatsächlich lesbare Marken.'),in_beiden:count('Davon eindeutig dieselben in beiden Stellungen sichtbaren Marken.')},
    ({marken_gleich,notwendig,in_a,in_b,in_beiden})=>{
      whole(notwendig,in_a,in_b,in_beiden);
      if(in_beiden>Math.min(in_a,in_b)||in_a+in_b-in_beiden>notwendig||!notwendig) throw new RangeError('Zusammenhang der Sichtmarken');
      return {vollstaendig_ohne_wechsel:marken_gleich?[in_a===notwendig?'a':null,in_b===notwendig?'b':null].filter(Boolean):null,
        auch_mit_beiden_stellungen_offen:marken_gleich?notwendig-in_a-in_b+in_beiden:null,
        grenze:'Nur Sichtbeobachtung aus zwei bekannten Positionen. Kein Vorschlag, die Ebenen im Betrieb zu wechseln.'};
    },{marken_gleich:true,notwendig:7,in_a:4,in_b:5,in_beiden:3},
    {vollstaendig_ohne_wechsel:[],auch_mit_beiden_stellungen_offen:1}),

  tool('miele_flexiclip_materialnummer_und_ean_widerspruch',
    'Bei Miele HFC 70, HFC 70-C und HFC 72 zwei bekannte Kennungen auf Widerspruch prüfen — Detect conflicting material number and barcode evidence on the same accessory.',
    {gleicher_etikettbezug:yes('Sind Materialnummer und EAN nachweislich vom gleichen Etikett oder demselben eindeutig zugeordneten Originalartikel?'),
      materialnummer:{type:'string',description:'Sichtbare Hersteller-Materialnummer, nur Ziffern, keine Seriennummer. Bei ungeklärter Sicht leer lassen.'},
      ean:{type:'string',description:'Sichtbare EAN, nur Ziffern, keine Seriennummer. Bei ungeklärter Sicht leer lassen.'}},
    ({gleicher_etikettbezug,materialnummer,ean})=>{
      const values={hfc70:['9520650','4002515261323'],hfc70_c:['10581490','4002515797983'],hfc72:['9520670','4002515261347']};
      const article=materialnummer.trim(), barcode=ean.trim();
      if(!/^[0-9]{0,10}$/.test(article)||!/^[0-9]{0,13}$/.test(barcode)) throw new RangeError('Nur Ziffern der beiden Kennungen');
      const am=Object.keys(values).find(key=>values[key][0]===article.replace(/^0+/,''))??null;
      const em=Object.keys(values).find(key=>values[key][1]===barcode)??null;
      return {referenzen_material_und_ean:[am?rails[am].label:null,em?rails[em].label:null],
        gleicher_typ_belegt:gleicher_etikettbezug&&am&&em?am===em:null,
        status:!gleicher_etikettbezug?'etikettenbezug_klaeren':!am||!em?'kennungsumfang_offen':am!==em?'zwei_bekannte_kennungen_widersprechen':'beide_kennungen_entsprechen_demselben_typ',
        grenze:'Prüft ausschließlich die drei dokumentierten Originalartikel. Kennungen ersetzen keine Herstellerzuordnung, Zustandsprüfung oder Echtheitsprüfung.'};
    },{gleicher_etikettbezug:true,materialnummer:'09520650',ean:'4002515797983'},
    {referenzen_material_und_ean:['HFC 70','HFC 70-C'],gleicher_typ_belegt:false,status:'zwei_bekannte_kennungen_widersprechen'}),

  tool('backofenzubehoer_nur_ersetzen_wenn_funktion_fehlt',
    'Den Wunsch nach einem Auszug gegen einen anhand eigener Handgriffe belegten tatsächlichen Bedarf prüfen — Separate a genuine access gap from a feature already provided by existing equipment.',
    {anforderungen_belegt:yes('Sind zwei eigene Aufgaben und die tatsächlich vorhandene passende Ausrüstung überprüft?'),
      zugriff_noetig:yes('Ist herausziehbarer Zugriff für den eigenen Zweck erforderlich?'),zugriff_vorhanden:proof('Beobachtung zum herausziehbaren Zugriff am vorhandenen bestätigten Zubehör.'),
      zweite_ebene_zeitgleich:yes('Muss der eigene Ablauf eine zweite Ebene zur selben Zeit erreichen?'),beide_ebenen_vorhanden:proof('Beobachtung am tatsächlich vorhandenen und passend zugeordneten Aufbau.')},
    ({anforderungen_belegt,zugriff_noetig,zugriff_vorhanden,zweite_ebene_zeitgleich,beide_ebenen_vorhanden})=>{
      const needed=[...(zugriff_noetig?[['zugriff',zugriff_vorhanden]]:[]),...(zweite_ebene_zeitgleich?[['zeitgleiche_ebenen',beide_ebenen_vorhanden]]:[])];
      return {beobachtete_luecken:anforderungen_belegt?needed.filter(([,state])=>state==='abweichend').map(([name])=>name):null,
        zuerst_klaeren:anforderungen_belegt?needed.filter(([,state])=>state==='offen').map(([name])=>name):['ablauf'],
        bestehender_umfang_genuegt:anforderungen_belegt?needed.every(([,state])=>state==='bestaetigt'):null,
        grenze:'Beurteilt den eigenen beobachteten Zweck. Zubehörfreigaben oder sichere gemeinsame Nutzung bleiben separat zu prüfen.'};
    },{anforderungen_belegt:true,zugriff_noetig:true,zugriff_vorhanden:'bestaetigt',zweite_ebene_zeitgleich:true,beide_ebenen_vorhanden:'offen'},
    {beobachtete_luecken:[],zuerst_klaeren:['zeitgleiche_ebenen'],bestehender_umfang_genuegt:false}),

  tool('backofenauszug_einzelansicht_belegt_ebene_oder_satz',
    'Ein Foto einer einzigen ausgestatteten Ebene vom Beleg des vollständigen angebotenen Satzes trennen — Separate verified rail positions from coverage implied by a photo caption.',
    {auszug_mit_geraet_zugeordnet:yes('Sind alle Aufnahmen und das bestätigte Exemplar identisch zugeordnet?'),
      erwartete_positionen:count('Für dieses Angebot getrennt auf der Liste erwartete Positionen.'),
      beide_seiten_in_bild:count('Davon mit tatsächlich beidseitig sichtbarer Position.'),
      nur_eine_seite_in_bild:count('Weitere jeweils nur einseitig sichtbare Positionen.'),
      sicher_fehlend:count('Weitere durch unabhängigen Beleg als fehlend bestätigte Positionen.')},
    ({auszug_mit_geraet_zugeordnet,erwartete_positionen,beide_seiten_in_bild,nur_eine_seite_in_bild,sicher_fehlend})=>{
      whole(erwartete_positionen,beide_seiten_in_bild,nur_eine_seite_in_bild,sicher_fehlend);
      if(beide_seiten_in_bild+nur_eine_seite_in_bild+sicher_fehlend>erwartete_positionen) throw new RangeError('Einzelne Positionen getrennt zählen');
      return {einseitig_noch_klaeren:auszug_mit_geraet_zugeordnet?nur_eine_seite_in_bild:null,
        ohne_bild_und_befund:auszug_mit_geraet_zugeordnet?erwartete_positionen-beide_seiten_in_bild-nur_eine_seite_in_bild-sicher_fehlend:null,
        grenze:'Nur Positionen im angebotenen Umfang bewerten. Bildansichten bestätigen weder Satzzuordnung noch mechanischen Zustand.'};
    },{auszug_mit_geraet_zugeordnet:true,erwartete_positionen:3,beide_seiten_in_bild:1,nur_eine_seite_in_bild:1,sicher_fehlend:0},
    {einseitig_noch_klaeren:1,ohne_bild_und_befund:1}),

  tool('backofenauszug_kalte_paarstellung_bis_zum_anschlag',
    'Bei einem kalten Vorführstück linke und rechte Auszugsposition als gemessene Paarabweichung dokumentieren — Flag an observed left-right extension difference under equivalent measurement.',
    {vergleichbare_kalte_probe:yes('Sind gleicher Auszugspunkt, Seitenbezug und unveränderte unbelastete kalte Anordnung für beide Seiten belegt?'),
      links_mm:mm('Erfasster Abstand von der gewählten festen Bezugskante links.'),rechts_mm:mm('Entsprechender Abstand rechts.'),
      links_wiederholt_mm:mm('Zweite eigene Ablesung links am selben Punkt.'),rechts_wiederholt_mm:mm('Zweite eigene Ablesung rechts am selben Punkt.'),
      gemeinsame_spanne_mm:mm('Kombinierte Unsicherheit eines Links-rechts-Vergleichs.')},
    ({vergleichbare_kalte_probe,links_mm,rechts_mm,links_wiederholt_mm,rechts_wiederholt_mm,gemeinsame_spanne_mm})=>{
      const a=links_mm-rechts_mm,b=links_wiederholt_mm-rechts_wiederholt_mm;
      const repeat=(a>gemeinsame_spanne_mm&&b>gemeinsame_spanne_mm)||(a<-gemeinsame_spanne_mm&&b<-gemeinsame_spanne_mm);
      return {links_minus_rechts_je_probe_mm:vergleichbare_kalte_probe?[round(a),round(b)]:null,
        unterschiedliche_paarstellung_wiederholt:vergleichbare_kalte_probe?repeat:null,
        grenze:'Zwei kalte Sicht- und Maßproben. Ursache, Einstellung und mechanische Eignung einer auffälligen Paarstellung bleiben offen.'};
    },{vergleichbare_kalte_probe:true,links_mm:415,rechts_mm:405,links_wiederholt_mm:417,rechts_wiederholt_mm:406,gemeinsame_spanne_mm:4},
    {links_minus_rechts_je_probe_mm:[10,11],unterschiedliche_paarstellung_wiederholt:true}),

  tool('flexiclip_ein_paar_zwei_kalte_zeitfenster',
    'Zwei zur Wahl stehende Zeitfenster von der Angabe gleichzeitig verfügbarer FlexiClip-Paare trennen — Determine whether the logged tasks actually need simultaneous coverage.',
    {plan_fuer_dieses_geraet_belegt:yes('Sind gewünschte Ebenen und erlaubte getrennte kalte Nutzung beziehungsweise ein zulässiger Wechsel dokumentiert?'),
      ebene_a:level('Vorgesehene Ebene der ersten Aufgabe.'),ebene_b:level('Vorgesehene Ebene der zweiten Aufgabe.'),
      a_ende_min:num('Erste Tagesminute nach der Nutzung A.',0,1440),b_beginn_min:num('Erste Tagesminute der Nutzung B.',0,1440),
      eigener_wechselpuffer_min:num('Für die belegte kalte Zwischenphase vom Nutzer benötigte Minuten, ohne Geräte- oder Temperaturmodell.',0,1440)},
    ({plan_fuer_dieses_geraet_belegt,ebene_a,ebene_b,a_ende_min,b_beginn_min,eigener_wechselpuffer_min})=>{
      whole(ebene_a,ebene_b);
      const different=ebene_a!==ebene_b;
      const gap=b_beginn_min-a_ende_min;
      return {ueberschneidung_min:plan_fuer_dieses_geraet_belegt?round(Math.max(0,-gap)):null,
        kalenderbedarf:!plan_fuer_dieses_geraet_belegt?'kalte_folge_und_ebenen_klaeren':!different&&gap<0?'gleiche_ebene_zeitkonflikt':!different?'gleiche_ebene_nacheinander':gap<0?'gleichzeitig_verschiedene_ebenen':gap<eigener_wechselpuffer_min?'zeitpuffer_fuer_ein_paar_fehlt':'eine_paarbelegung_nacheinander_planbar',
        grenze:'Zeitlicher Abgleich eigener Beobachtungsdaten. Keine Anleitung zum Umsetzen und keine zulässige Abkühlzeit ableiten.'};
    },{plan_fuer_dieses_geraet_belegt:true,ebene_a:2,ebene_b:3,a_ende_min:710,b_beginn_min:735,eigener_wechselpuffer_min:35},
    {ueberschneidung_min:0,kalenderbedarf:'zeitpuffer_fuer_ein_paar_fehlt'}),

  tool('backofenauszug_auflageart_baugruppe_und_abmessungsbeleg',
    'Die veröffentlichte Auflageart eines Auszugs mit einem tatsächlich geprüften Blech oder Rost abgleichen — Separate documented tray categories from fit of one particular item.',
    {auszug:pick('Gewählter genau identifizierter Vollauszug.',...Object.keys(rails)),
      auflage:pick('Tatsächlich gewünschter aufliegender Gegenstand.','backblech','rost','universalpfanne','gourmet_braeter','andere_oder_offen'),
      auszug_geraet_belegt:yes('Ist der Auszug für das konkrete Hauptgerät nachvollziehbar zugeordnet?'),
      auflage_exakt:proof('Ist das genaue Blech, der genaue Rost oder die genaue Auflage laut Geräteunterlagen für diesen Gebrauch bestätigt?')},
    ({auszug,auflage,auszug_geraet_belegt,auflage_exakt})=>{
      const supported=auszug==='hez638370'?['backblech','rost','universalpfanne']:['backblech','rost','gourmet_braeter'];
      return {typ_in_produktbeschreibung_genannt:supported.includes(auflage),
        status:!auszug_geraet_belegt?'auszug_geraet_zuordnen':auflage_exakt==='bestaetigt'?'genaue_auflage_bestaetigt':auflage_exakt==='abweichend'?'abweichende_auflage_klaeren':'abmessung_und_genaue_aufnahmeteile_klaeren',
        primaerquelle:rails[auszug].source,
        grenze:'Die Kurzbeschreibung nennt allgemeine Auflagearten. Ähnliche Namen und die Bauform belegen keine Eignung eines konkreten Gegenstands.'};
    },{auszug:'hez638370',auflage:'universalpfanne',auszug_geraet_belegt:true,auflage_exakt:'offen'},
    {typ_in_produktbeschreibung_genannt:true,status:'abmessung_und_genaue_aufnahmeteile_klaeren'}),
];
