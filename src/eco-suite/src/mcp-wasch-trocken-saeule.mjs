const products='/produkte.html';
// German manufacturer product pages and exact dryer manual.
const kits={
  wtv_501:{label:'WTV 501',height:25,feature:'ohne_auszug',source:'https://www.miele.de/product/9256130/wasch-trocken-verbindungssatz-wtv-501',article:'09256130',ean:'4002515105917'},
  wtv_511:{label:'WTV 511',height:120,feature:'schublade',source:'https://www.miele.de/product/9351780/wasch-trocken-verbindungssatz-wtv-511',article:'09351780',ean:'4002515156742'},
  wtv_512:{label:'WTV 512',height:120,feature:'schublade',source:'https://www.miele.de/product/9351790/wasch-trocken-verbindungssatz-wtv-512',article:'09351790',ean:'4002515156759'},
  wtz27410:{label:'WTZ27410',height:35,feature:'ohne_auszug',source:'https://www.bosch-home.com/de/de/product/WTZ27410',article:'00717525'},
  wtz27400:{label:'WTZ27400',height:42,feature:'arbeitsplatte',source:'https://www.bosch-home.com/de/de/product/WTZ27400',article:'17001528'},
};
const boschManual='https://media3.bosch-home.com/Documents/9001984634_A.pdf';
const boschDryer={width:598,bodyDepth:613,closedDepth:648,openDepth:1096};
const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const pick=(description,...values)=>({type:'string',description,enum:values});
const mm=description=>num(description,0,5000);
const span=description=>num(description,0,300);
const count=description=>num(description,0,500);
const kit=description=>pick(description,...Object.keys(kits));
const proof=description=>pick(description,'bestaetigt','abweichend','offen');
const round=value=>Number(value.toFixed(2));
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Stückzahlen müssen ganzzahlig sein');
}
function tool(name,description,properties,calculate,args,expect){
  return {name,description,page:products,properties,calculate,example:{args,expect}};
}

export const waschTrockenSaeule=[
  tool('wasch_trocken_saeule_herstellerkombination_beleg',
    'Dokumentierte Miele-Baureihen und Bosch WQG241001 Bedingungen nach Verbindungssatz prüfen — Verify the exact published scope and exceptions of a stacking kit.',
    {satz:kit('Exakt gekennzeichneter Verbindungssatz.'),trockner:pick('Am konkreten Trockner bestätigte Variante.','miele_t1_white','miele_t1_chrome','miele_t1_classic','bosch_wqg241001','andere','offen'),
      waesche_modell:pick('Am unteren Gerät bestätigte Geräteart oder Baureihe.','miele_wtzh','miele_wtw','miele_w1000','miele_w3000','miele_w5000','miele_w_classic','andere_bestaetigte_miele_waschmaschine','bosch_waschmaschine','anderer_hersteller','offen'),
      miele_blende:pick('Blendenform laut Unterlagen, soweit für WTV 501 relevant.','gerade','nicht_gerade','offen'),
      bosch_waschmaschine:proof('Bei WQG241001: exakte Bosch-Waschmaschine als geeignet bestätigt, gleiche Breite und Tiefe jeweils mit gleicher Maßbasis sowie Arbeitsplattentiefe >550 mm. Bei anderer Marke offen.'),
      podest:pick('Wird für die Bosch-Säule ein Podest eingeplant?','nein','ja','offen')},
    ({satz,trockner,waesche_modell,miele_blende,bosch_waschmaschine,podest})=>{
      const isBosch=satz.startsWith('wtz');
      const allowed=satz==='wtv_512'?['miele_t1_white']:isBosch?['bosch_wqg241001']:['miele_t1_chrome','miele_t1_classic'];
      let outcome;
      if(trockner==='offen') outcome='trockner_identifizieren';
      else if(!allowed.includes(trockner)) outcome='trockner_ausserhalb_beleg';
      else if(waesche_modell==='offen') outcome='unteres_geraet_identifizieren';
      else if(isBosch){
        if(waesche_modell!=='bosch_waschmaschine') outcome='anderer_hersteller_im_bosch_abgleich';
        else if(podest==='ja') outcome='podest_widerspricht_anleitung';
        else if(bosch_waschmaschine==='abweichend') outcome='unteres_geraet_oder_masse_abweichend';
        else if(podest==='offen'||bosch_waschmaschine==='offen') outcome='bosch_bedingungen_offen';
        else outcome='dokumentierte_bosch_bedingungen_abgeglichen';
      } else if(!waesche_modell.startsWith('miele_')&&waesche_modell!=='andere_bestaetigte_miele_waschmaschine') outcome='keine_miele_waschmaschine_bestaetigt';
      else if(waesche_modell==='miele_wtzh'||(satz==='wtv_501'?waesche_modell==='miele_w1000':waesche_modell==='miele_wtw')) outcome='baureihe_ausdruecklich_ausgenommen';
      else if(satz==='wtv_501'&&waesche_modell==='miele_wtw') outcome='wtw_konkretes_untergeraet_pruefen';
      else if(satz==='wtv_501'&&['miele_w3000','miele_w5000','miele_w_classic'].includes(waesche_modell)&&miele_blende!=='gerade') outcome=miele_blende==='offen'?'blendenform_offen':'gerade_blende_erforderlich';
      else outcome='dokumentierter_miele_baureihenbereich';
      return {status:outcome,satz:kits[satz].label,primaerquelle:kits[satz].source,
        weitere_anleitung:isBosch?boschManual:null,
        grenze:'Abgleich des veröffentlichten Bedingungsbereichs. Exakte Gerätekombination und Montageunterlagen separat prüfen.'};
    },{satz:'wtv_501',trockner:'miele_t1_chrome',waesche_modell:'miele_w5000',miele_blende:'offen',bosch_waschmaschine:'offen',podest:'offen'},
    {status:'blendenform_offen',satz:'WTV 501',primaerquelle:kits.wtv_501.source,weitere_anleitung:null}),

  tool('stapelsatz_typenschild_artikelnummer_beleg',
    'Eine am Bauteil oder Originaletikett gelesene Kennung dem gewünschten Stapelsatz zuordnen — Match a visible material code or verified EAN to the exact kit.',
    {satz:kit('Im Angebot gewünschter exakter Verbindungssatz.'),
      kennung_ort:pick('Herkunft der tatsächlich abgelesenen Kennung.','originaletikett_am_teil','originaletikett_nur_karton','angebotstitel','offen'),
      kennung_art:pick('Art der Kennung.','artikelnummer','ean'),
      kennung:{type:'string',description:'Nur sichtbare Hersteller-Artikelnummer oder EAN eingeben, keine Seriennummer. Bei offenem Beleg leer lassen.'}},
    ({satz,kennung_ort,kennung_art,kennung})=>{
      const digits=kennung.trim().replace(/[ -]/g,'');
      if(digits.length>16||!/^[0-9]*$/.test(digits)) throw new RangeError('Nur Artikelnummer oder EAN in Ziffern');
      const expected=kennung_art==='ean'?kits[satz].ean:kits[satz].article;
      const normalize=value=>kennung_art==='artikelnummer'?value.replace(/^0+/,''):value;
      const matches=expected&&digits?normalize(digits)===normalize(expected):null;
      return {eingabe_zur_herstellerkennung:matches,
        exemplar_belegt:matches===true&&kennung_ort==='originaletikett_am_teil',
        status:!expected?'kennungsart_hier_nicht_belegt':matches===null||kennung_ort==='offen'?'originaletikett_pruefen':matches?'herkunft_des_etiketts_beachten':'kennung_weicht_ab',
        grenze:'Karton oder Titel belegen nicht, welches Teil tatsächlich beiliegt. Kennungsabgleich ist keine Gerätekombinationsfreigabe.'};
    },{satz:'wtv_512',kennung_ort:'originaletikett_nur_karton',kennung_art:'artikelnummer',kennung:'9351790'},
    {eingabe_zur_herstellerkennung:true,exemplar_belegt:false,status:'herkunft_des_etiketts_beachten'}),

  tool('wasch_trocken_saeule_exakte_hoehenbilanz',
    'Summe aus den Gerätehöhen und der veröffentlichten Satzhöhe gegen die niedrigste Nischenstelle rechnen — Estimate nominal stacked height and remaining clearance.',
    {satz:kit('Exakt dokumentierter Verbindungssatz.'),messbasis_gleich:yes('Sind Maße von Nischenboden aus vergleichbar und tritt laut Zeichnung keine doppelt gezählte Einstecktiefe auf?'),
      wascher_hoehe_mm:mm('Tatsächliche Planungshöhe des unteren Geräts mit vorgesehenem Fußstand.'),
      trockner_hoehe_mm:mm('Dokumentierte Planungshöhe des oberen Geräts.'),nische_niedrig_mm:mm('Kleinste gemessene lichte Höhe im vorgesehenen Aufbau.'),
      reserve_mm:mm('Zusätzlicher eigener oder ausdrücklich belegter Freiraum, separat von der Gerätehöhe.')},
    ({satz,messbasis_gleich,wascher_hoehe_mm,trockner_hoehe_mm,nische_niedrig_mm,reserve_mm})=>{
      if(!wascher_hoehe_mm||!trockner_hoehe_mm||!nische_niedrig_mm) throw new RangeError('Positive Maße');
      const height=wascher_hoehe_mm+trockner_hoehe_mm+kits[satz].height;
      return {satz_nominal_mm:kits[satz].height,addierte_planhoehe_mm:messbasis_gleich?round(height):null,
        verbleibend_nach_reserve_mm:messbasis_gleich?round(nische_niedrig_mm-height-reserve_mm):null,
        quelle_satz:kits[satz].source,grenze:'Bosch-Satzhöhe ist die veröffentlichte Außenhöhe. Einstecken, Füße, Bodenunebenheiten und Montagewege mit der vollständigen Zeichnung prüfen.'};
    },{satz:'wtv_501',messbasis_gleich:true,wascher_hoehe_mm:850,trockner_hoehe_mm:850,nische_niedrig_mm:1750,reserve_mm:10},
    {satz_nominal_mm:25,addierte_planhoehe_mm:1725,verbleibend_nach_reserve_mm:15}),

  tool('wqg241001_tiefen_gemeinsame_messkante',
    'Bosch WQG241001 Gehäuse-, Schließtür- und Öffnungstiefe bei einer Maßangabe auseinanderhalten — Compare a dryer dimension using the correct documented reference depth.',
    {modell_belegt:yes('Ist der Trockner Bosch WQG241001 auf Typenschild und Anleitung bestätigt?'),
      vergleichsmass:pick('Auf welchen Umfang bezieht sich das hier zu vergleichende Maß?','gehaeuse','tuer_geschlossen','tuer_offen','offen'),
      gemessen_mm:mm('Geprüfte Gegenmessung ab derselben hinteren Referenzkante in mm.'),unsicherheit_mm:span('Gemeinsame Messtoleranz in mm.')},
    ({modell_belegt,vergleichsmass,gemessen_mm,unsicherheit_mm})=>{
      const depths={gehaeuse:boschDryer.bodyDepth,tuer_geschlossen:boschDryer.closedDepth,tuer_offen:boschDryer.openDepth};
      const ref=modell_belegt?depths[vergleichsmass]??null:null;
      return {dokumentiertes_bezugsmass_mm:ref,abweichung_mm:ref===null?null:round(gemessen_mm-ref),
        innerhalb_messspanne:ref===null?null:Math.abs(gemessen_mm-ref)<=unsicherheit_mm,
        primaerquelle:boschManual,grenze:'Bosch-Anleitung S. 48. Die Zahl bei geöffneter Tür ist keine Geräte- oder Stellplattentiefe für eine Herstellerkombination.'};
    },{modell_belegt:true,vergleichsmass:'tuer_geschlossen',gemessen_mm:649,unsicherheit_mm:3},
    {dokumentiertes_bezugsmass_mm:648,abweichung_mm:1,innerhalb_messspanne:true}),

  tool('stapelsaeule_auszug_und_tuer_gemeinsamer_betriebsraum',
    'Tür und Auszug mit gemeinsamem vorderen Bezug nach Tiefe und Höhenzonen abgleichen — Distinguish aisle occupation from a possible overlap between stacked moving parts.',
    {lot_und_hoehen_geprueft:yes('Sind Türbewegung und Auszug bei vollständigem Öffnen in derselben Tiefen- und Höhenreferenz vermessen?'),
      freie_tiefe_mm:mm('Freie Tiefe vor der gemeinsamen Bezugslinie.'),tuer_ausladung_mm:mm('Größte Ausladung der Tür davor.'),auszug_ausladung_mm:mm('Größte Ausladung des Auszugs davor.'),
      tuer_unten_mm:mm('Niedrigster Punkt des vollständigen Türschwenks.'),tuer_oben_mm:mm('Höchster Punkt des vollständigen Türschwenks.'),
      auszug_unten_mm:mm('Niedrigster Punkt des ausgezogenen Teils.'),auszug_oben_mm:mm('Höchster Punkt des ausgezogenen Teils.')},
    ({lot_und_hoehen_geprueft,freie_tiefe_mm,tuer_ausladung_mm,auszug_ausladung_mm,tuer_unten_mm,tuer_oben_mm,auszug_unten_mm,auszug_oben_mm})=>{
      if(tuer_unten_mm>=tuer_oben_mm||auszug_unten_mm>=auszug_oben_mm) throw new RangeError('Gemessene Höhenbereiche');
      const gap=Math.max(tuer_unten_mm,auszug_unten_mm)-Math.min(tuer_oben_mm,auszug_oben_mm);
      return {gangrest_mm:lot_und_hoehen_geprueft?round(freie_tiefe_mm-Math.max(tuer_ausladung_mm,auszug_ausladung_mm)):null,
        hoehenhuellen_beruehren_oder_ueberlappen:lot_und_hoehen_geprueft?gap<=0:null,
        grenze:'Nur Ausladungen und Höhenhüllen. Berührung oder Überlappung erfordert Prüfung der wirklichen Bewegungsbahnen. Keine Aussage zu zulässiger gleichzeitiger Betätigung.'};
    },{lot_und_hoehen_geprueft:true,freie_tiefe_mm:900,tuer_ausladung_mm:490,auszug_ausladung_mm:355,tuer_unten_mm:1020,tuer_oben_mm:1460,auszug_unten_mm:930,auszug_oben_mm:980},
    {gangrest_mm:410,hoehenhuellen_beruehren_oder_ueberlappen:false}),

  tool('stapelsatz_ablagefunktion_gegen_nutzungszweck',
    'Eine gewünschte Zwischenablage zur Arbeitsplatte oder Stauraumschublade des konkreten Satzes abgleichen — Distinguish a pull-out worktop from storage when choosing a kit.',
    {satz:kit('Exakt bezeichneter Satz.'),zweck:pick('Eigene wesentliche Aufgabe.','kurz_zum_be_und_entladen','utensilien_verstauen','kein_auszug_noetig'),
      eigenes_getrenntes_moebel:yes('Wird derselbe Zweck durch ein tatsächlich nutzbares unabhängiges Möbel am Einsatzort abgedeckt?')},
    ({satz,zweck,eigenes_getrenntes_moebel})=>{
      const documented=kits[satz].feature;
      const wanted=zweck==='kurz_zum_be_und_entladen'?'arbeitsplatte':zweck==='utensilien_verstauen'?'schublade':null;
      return {dokumentierte_funktion:documented,
        funktion_am_satz_belegt:wanted?documented===wanted:null,
        zubehoerfunktion_entscheidend:Boolean(wanted&&!eigenes_getrenntes_moebel),primaerquelle:kits[satz].source,
        grenze:'Veröffentlichte Funktion und persönlicher Bedarf. Aus Bezeichnungen oder einem Foto keine zulässige Belastung ableiten.'};
    },{satz:'wtv_511',zweck:'kurz_zum_be_und_entladen',eigenes_getrenntes_moebel:false},
    {dokumentierte_funktion:'schublade',funktion_am_satz_belegt:false,zubehoerfunktion_entscheidend:true}),

  tool('stapelsaeule_oberes_bedienfeld_und_tankgriff',
    'Ans Bedienfeld reichen und einen Kondenswasserbehälter handhaben als getrennte Anforderungen prüfen — Compare projected access for two different upper-unit tasks.',
    {messbasis_bestaetigt:yes('Sind Unterkante des Trockners und Griffhöhen im gleichen geplanten Fußbodenbezug dokumentiert?'),
      unterkante_trockner_mm:mm('Abgesicherte geometrische Höhe der Trocknerunterkante.'),bedienfeld_ab_unten_mm:mm('Bedienpunkt oberhalb dieser Unterkante.'),
      tankgriff_ab_unten_mm:mm('Tankgriff oberhalb dieser Unterkante.'),eigene_bediengrenze_mm:mm('Selbst beobachtete bequeme Reichhöhe für kurze Betätigung.'),
      eigene_tankgrenze_mm:mm('Selbst beobachtete Reichhöhe für den vorgesehenen Umgang mit dem Behälter.')},
    ({messbasis_bestaetigt,unterkante_trockner_mm,bedienfeld_ab_unten_mm,tankgriff_ab_unten_mm,eigene_bediengrenze_mm,eigene_tankgrenze_mm})=>{
      const heights=[unterkante_trockner_mm+bedienfeld_ab_unten_mm,unterkante_trockner_mm+tankgriff_ab_unten_mm];
      return {absolute_bedien_tankhoehe_mm:messbasis_bestaetigt?heights.map(round):null,
        eigene_reichgrenze_nicht_erfuellt:messbasis_bestaetigt?[heights[0]>eigene_bediengrenze_mm?'bedienfeld':null,heights[1]>eigene_tankgrenze_mm?'tankgriff':null].filter(Boolean):null,
        grenze:'Nur geometrische Reichhöhe für zwei Handgriffe. Griffweg, Füllgewicht und individuelle Handhabung vor Ort beurteilen.'};
    },{messbasis_bestaetigt:true,unterkante_trockner_mm:892,bedienfeld_ab_unten_mm:740,tankgriff_ab_unten_mm:690,eigene_bediengrenze_mm:1700,eigene_tankgrenze_mm:1500},
    {absolute_bedien_tankhoehe_mm:[1632,1582],eigene_reichgrenze_nicht_erfuellt:['tankgriff']}),

  tool('stapelsatz_schublade_inhalt_geschlossen_entnehmbar',
    'Bisher gut passende Utensilien auch auf den verfügbaren Entnahmeweg aus der Schublade prüfen — Check whether contents fit beneath the closed drawer envelope and can still lift out.',
    {satz:kit('Genauer Verbindungssatz.'),masse_belegt:yes('Sind lichte Maße und tatsächlich nutzbarer Entnahmeweg dieser eingesetzten Schublade vor Ort dokumentiert?'),
      objekt_hoehe_mm:mm('Höhe des Gegenstands in der vorgesehenen erlaubten Position.'),fach_geschlossen_mm:mm('Kleinste lichte Höhe bei geschlossener Schublade.'),
      hochheben_mm:mm('Zusätzlicher beobachteter Hub bis der Gegenstand aus der Schublade entnommen werden kann.'),
      frei_oben_offen_mm:mm('Gemessene lichte Höhe am vorgesehenen Greif- und Entnahmeort.')},
    ({satz,masse_belegt,objekt_hoehe_mm,fach_geschlossen_mm,hochheben_mm,frei_oben_offen_mm})=>{
      if(!objekt_hoehe_mm) throw new RangeError('Positive Gegenstandshöhe');
      const check=masse_belegt&&kits[satz].feature==='schublade';
      return {geschlossen_rest_mm:check?round(fach_geschlossen_mm-objekt_hoehe_mm):null,
        entnahme_rest_mm:check?round(frei_oben_offen_mm-objekt_hoehe_mm-hochheben_mm):null,
        status:kits[satz].feature!=='schublade'?'keine_dokumentierte_stauraumschublade':masse_belegt?'entnahmeweg_geometrisch_abgeglichen':'lichte_masse_und_entnahmeweg_messen',
        grenze:'Nur Höhenvergleich für den eingegebenen Entnahmeweg. Inhaltseignung, Schubladenbelastung und Kinderzugriff werden nicht bewertet.'};
    },{satz:'wtv_512',masse_belegt:true,objekt_hoehe_mm:58,fach_geschlossen_mm:65,hochheben_mm:20,frei_oben_offen_mm:73},
    {geschlossen_rest_mm:7,entnahme_rest_mm:-5,status:'entnahmeweg_geometrisch_abgeglichen'}),

  tool('stapelsaeule_tank_vollentnahme_und_arbeitsfreiraum',
    'Den langen Auszug eines Kondenswasserbehälters von bloßer Erreichbarkeit seines Griffs unterscheiden — Check the full removal envelope as well as separate carrying room.',
    {tankweg_geprueft:yes('Ist der vorgesehene Entnahmeweg dieses Behälters aus der passenden Anleitung oder einer tatsächlichen unbelasteten Beobachtung bekannt?'),
      freie_tiefe_mm:mm('Freie Tiefe vor der Gerätefront entlang der Entnahme.'),voll_entnahme_mm:mm('Äußerster Punkt des vollständigen Entnahmewegs ab Front.'),
      eigene_arbeitsreserve_mm:mm('Zusätzlich selbst benötigter gleichzeitig freier Bereich entlang derselben Tiefenlinie.'),
      trageweg_verlegt:yes('Ist nach der Entnahme ein davon unabhängiger, tatsächlich verfügbarer Trageweg bestätigt?')},
    ({tankweg_geprueft,freie_tiefe_mm,voll_entnahme_mm,eigene_arbeitsreserve_mm,trageweg_verlegt})=>{
      if(!voll_entnahme_mm) throw new RangeError('Vollständiger Entnahmeweg');
      const gap=freie_tiefe_mm-voll_entnahme_mm;
      return {behaelterweg_rest_mm:tankweg_geprueft?round(gap):null,
        reserve_gleichzeitig_rest_mm:tankweg_geprueft?round(gap-eigene_arbeitsreserve_mm):null,
        trageweg_separat_bestaetigt:trageweg_verlegt,
        grenze:'Keine Aussage zur zulässigen Handhabung oder Tragbarkeit. Ein getrennt bestätigter Trageweg ersetzt fehlenden Raum für die eigentliche Entnahme nicht.'};
    },{tankweg_geprueft:true,freie_tiefe_mm:460,voll_entnahme_mm:430,eigene_arbeitsreserve_mm:90,trageweg_verlegt:true},
    {behaelterweg_rest_mm:30,reserve_gleichzeitig_rest_mm:-60,trageweg_separat_bestaetigt:true}),

  tool('wqg241001_tank_oder_ablauf_platzentscheidung',
    'Den geplanten Umgang mit Kondenswasser an der Bosch-Säule als Tank- oder dokumentierten Ablaufpfad prüfen — Distinguish user access from an independently verified drainage configuration.',
    {wqg241001_belegt:yes('Ist das Gerät nach seinem eigenen Typenschild Bosch WQG241001?'),
      modus:pick('Der aktuell nachweislich geplante Kondenswasserweg.','behaelter','direkter_ablauf','offen'),
      tankfuehrung_erreichbar:proof('Griff und ganzer Behälterweg am Standort geometrisch abgeglichen.'),
      ablauf_passend_bestaetigt:proof('Exaktes Zubehör und die konkrete Anschlussplanung laut Unterlagen überprüft, falls direkter Ablauf vorgesehen.')},
    ({wqg241001_belegt,modus,tankfuehrung_erreichbar,ablauf_passend_bestaetigt})=>{
      const basis=modus==='behaelter'?tankfuehrung_erreichbar:modus==='direkter_ablauf'?ablauf_passend_bestaetigt:'offen';
      return {entscheidende_pruefung:!wqg241001_belegt||modus==='offen'?'geraet_oder_kondensatweg_klaeren':modus==='behaelter'?'behaelterzugang':'ablaufbeleg',
        belegstatus:wqg241001_belegt?basis:'offen',handbuch_zubehoer:wqg241001_belegt&&modus==='direkter_ablauf'?'WTZ1110':null,
        primaerquelle:boschManual,grenze:'Handbuch S. 27 nennt WTZ1110 als Ablaufschlauch. Der Check dokumentiert nur Voraussetzungen und prüft keinen konkreten Anschluss.'};
    },{wqg241001_belegt:true,modus:'direkter_ablauf',tankfuehrung_erreichbar:'bestaetigt',ablauf_passend_bestaetigt:'offen'},
    {entscheidende_pruefung:'ablaufbeleg',belegstatus:'offen',handbuch_zubehoer:'WTZ1110'}),

  tool('stapelsaeule_einzelgeraetwechsel_alter_satz_neuer_beleg',
    'Bei Austausch nur eines Geräts die frühere Kombination von der neuen Herstellerzuordnung trennen — Recheck a retained kit when one of the two appliances changes.',
    {satz:kit('Exakt gekennzeichneter bisheriger Verbindungssatz.'),
      wechsel:pick('Was ändert sich laut der geplanten neuen Kombination?','oberes_geraet','unteres_geraet','beide'),
      bisherige_zuordnung:proof('Herstellerbeleg für die bisherige Paarung.'),
      neue_zuordnung:proof('Unabhängig abgeglichener Herstellerbeleg für genau das neue Gerätepaar und diesen Satz.'),
      weiterverwendung_satz:proof('Wiederverwendbarkeit nach Herstellerunterlagen und für das tatsächliche Teil geprüft.')},
    ({satz,wechsel,bisherige_zuordnung,neue_zuordnung,weiterverwendung_satz})=>({
      satz:kits[satz].label,veraendert:wechsel,beide_neuen_punkte_belegt:neue_zuordnung==='bestaetigt'&&weiterverwendung_satz==='bestaetigt',
      altbeleg_allein:neue_zuordnung==='offen'&&bisherige_zuordnung==='bestaetigt',
      separat_abgleichen:[neue_zuordnung==='bestaetigt'?null:'neues_paar',weiterverwendung_satz==='bestaetigt'?null:'vorhandener_satz'].filter(Boolean),
      grenze:'Gleiche Abmessungen oder der bisherige Aufbau ersetzen weder die genaue neue Zuordnung noch den Zustandsbeleg des vorhandenen Satzes.'}
    ),{satz:'wtv_511',wechsel:'unteres_geraet',bisherige_zuordnung:'bestaetigt',neue_zuordnung:'offen',weiterverwendung_satz:'bestaetigt'},
    {satz:'WTV 511',veraendert:'unteres_geraet',beide_neuen_punkte_belegt:false,altbeleg_allein:true,separat_abgleichen:['neues_paar']}),

  tool('miele_stapelsatz_demontage_deckelbeleg_offen',
    'Bei einem gebrauchten Miele-Untergerät nach früherem Ausbau eines WTV 511 oder 512 den dokumentierten Deckelzustand abfragen — Identify the unresolved cover evidence after a previously installed kit was removed.',
    {entfernter_satz:pick('Belegt früher montierter Satz.','wtv_511','wtv_512','anderer','offen'),
      demontage_bestaetigt:yes('Ist die tatsächliche Demontage am konkreten Gerät belegt?'),
      deckelzustand_nachher_belegt:proof('Liegt ein nachvollziehbarer Beleg zum Zustand des Deckels nach der Demontage vor?')},
    ({entfernter_satz,demontage_bestaetigt,deckelzustand_nachher_belegt})=>({
      satzbezogene_anleitung:entfernter_satz==='wtv_511'||entfernter_satz==='wtv_512'?'https://media.miele.com/downloads/c9/e5/00_56D762FF8C918420E10080000AB5C9E5.pdf':null,
      vor_weitergabe_pruefen:entfernter_satz!=='wtv_511'&&entfernter_satz!=='wtv_512'?'satz_und_anleitung_klaeren':!demontage_bestaetigt?'geraetehistorie_klaeren':deckelzustand_nachher_belegt==='bestaetigt'?'vorliegenden_deckelbeleg_pruefen':'deckelzustand_durch_fachstelle_klaeren',
      grenze:'Die Herstelleranleitung behandelt den Deckelzustand nach Rückbau gesondert. Der Check gibt keine Reparaturmethode oder Freigabe aus.'}
    ),{entfernter_satz:'wtv_512',demontage_bestaetigt:true,deckelzustand_nachher_belegt:'offen'},
    {vor_weitergabe_pruefen:'deckelzustand_durch_fachstelle_klaeren'}),

  tool('stapelsaeule_auszugsnutzen_zwei_getrennte_arbeitsproben',
    'An einem zulässigen Vergleichsaufbau die wirkliche Zahl verbleibender externer Zwischenablagen vergleichen — Check whether a pull-out worktop actually replaces a separate staging step in your routine.',
    {paar_vergleichbar:yes('Waren benutzte Wäschemenge, Arbeitsschritt und beide zulässigen Vergleichsaufbauten nachvollziehbar gleichwertig?'),
      ohne_auszug_extern:count('Bei der Probe ohne lokale Arbeitsplatte beobachtete externe Zwischenablagen.'),
      mit_auszug_extern:count('Bei der Probe mit zulässiger leer gestarteter Arbeitsplatte weiterhin beobachtete externe Zwischenablagen.'),
      eigenes_ziel:count('Mindestens beobachtet zu ersetzende externe Ablagen für den eigenen Nutzen.')},
    ({paar_vergleichbar,ohne_auszug_extern,mit_auszug_extern,eigenes_ziel})=>{
      whole(ohne_auszug_extern,mit_auszug_extern,eigenes_ziel);
      const difference=ohne_auszug_extern-mit_auszug_extern;
      return {externe_ablagen_weniger:paar_vergleichbar?difference:null,
        beobachtetes_ziel_erreicht:paar_vergleichbar?difference>=eigenes_ziel:null,
        grenze:'Nur tatsächlich beobachtete Zwischenablagen desselben Vorgangs. Das Ergebnis ist keine Tragfähigkeits-, Kauf- oder Zeitersparniszusage.'};
    },{paar_vergleichbar:true,ohne_auszug_extern:5,mit_auszug_extern:2,eigenes_ziel:4},
    {externe_ablagen_weniger:3,beobachtetes_ziel_erreicht:false}),

  tool('stapelsaeule_paketabholung_teilstuecke_getrennt_passmass',
    'Bei Anlieferung der Einzelgeräte Verpackungsmessungen statt der Nennbreite der Säule verwenden — Verify whether each separate package clears the same narrow route.',
    {gemessene_kartons_und_route:yes('Sind echte Außenmaße der getrennten Kartons in beibehaltenem Format und die engste Stelle auf der Strecke bekannt?'),
      freie_breite_mm:mm('Niedrigster Wert der lichten Wegebreite an der betrachteten geraden Stelle.'),
      wascher_paket_mm:mm('Gemessene Breite des unteren Gerätepakets in vereinbarter Lage.'),trockner_paket_mm:mm('Gemessene Breite des oberen Gerätepakets in vereinbarter Lage.'),
      handhabung_reserve_mm:mm('Eigene gewünschte zusätzliche Gesamtreserve über beide Seiten.'),
      verpackung_darf_entfallen:yes('Wurde vom Zuständigen bestätigt, dass am Messpunkt ein bereits separat neu zu prüfender unverpackter Transport möglich wäre?')},
    ({gemessene_kartons_und_route,freie_breite_mm,wascher_paket_mm,trockner_paket_mm,handhabung_reserve_mm,verpackung_darf_entfallen})=>{
      if(!freie_breite_mm||!wascher_paket_mm||!trockner_paket_mm) throw new RangeError('Positive Breiten');
      const margins=[freie_breite_mm-wascher_paket_mm-handhabung_reserve_mm,freie_breite_mm-trockner_paket_mm-handhabung_reserve_mm];
      return {breitenrest_verpackt_unten_oben_mm:gemessene_kartons_und_route?margins.map(round):null,
        weg_neu_vermessen:!gemessene_kartons_und_route?'paketmasse_offen':margins.every(value=>value>=0)?'gerade_stelle_abgeglichen':verpackung_darf_entfallen?'unverpackte_masse_separat_bestaetigen':'liefermassen_oder_weg_klaeren',
        grenze:'Gerade Engstelle, getrennte Pakete und gemessene Lage. Kurven, Wendefläche, Verpackungs- und Handhabungsvorgaben gesondert berücksichtigen.'};
    },{gemessene_kartons_und_route:true,freie_breite_mm:710,wascher_paket_mm:695,trockner_paket_mm:672,handhabung_reserve_mm:25,verpackung_darf_entfallen:true},
    {breitenrest_verpackt_unten_oben_mm:[-10,13],weg_neu_vermessen:'unverpackte_masse_separat_bestaetigen'}),

  tool('stapelsaeule_nische_tiefe_versatz_vorderkanten',
    'Verschiedene Gerätefronten aus gemeinsamem Wandbezug mit dem tatsächlichen Versatz abbilden — Find differing front setbacks under a shared niche line.',
    {vor_ort_dokumentiert:yes('Sind vordere Kanten bei geschlossenen Türen ohne Verwechslung mit Gehäusemaßen von derselben hinteren Bezugslinie gemessen?'),
      obere_front_mm:mm('Oberes Gerät, vorderster gemessener Punkt ab Bezug.'),untere_front_mm:mm('Unteres Gerät, gleicher Bezug.'),
      nischenlinie_mm:mm('Vordere zulässige Nischenlinie ab demselben Bezug laut eigener Raumplanung.'),
      sichtbare_stufe_stoert:yes('Ist ein bündiger Frontverlauf selbst eine Anforderung dieser Situation?')},
    ({vor_ort_dokumentiert,obere_front_mm,untere_front_mm,nischenlinie_mm,sichtbare_stufe_stoert})=>{
      const offset=obere_front_mm-untere_front_mm;
      return {oberes_gegen_unteres_mm:vor_ort_dokumentiert?round(offset):null,
        vorderste_kante_ueber_linie_mm:vor_ort_dokumentiert?round(Math.max(0,obere_front_mm-nischenlinie_mm,untere_front_mm-nischenlinie_mm)):null,
        eigene_buendigkeit_nicht_erfuellt:vor_ort_dokumentiert?sichtbare_stufe_stoert&&Math.abs(offset)>1e-9:null,
        grenze:'Beschreibung der geschlossenen Fronten. Ein bündiger Anblick oder gleicher Überstand beweist keine Gerätekompatibilität.'};
    },{vor_ort_dokumentiert:true,obere_front_mm:648,untere_front_mm:625,nischenlinie_mm:640,sichtbare_stufe_stoert:true},
    {oberes_gegen_unteres_mm:23,vorderste_kante_ueber_linie_mm:8,eigene_buendigkeit_nicht_erfuellt:true}),

  tool('wqg241001_untergeraet_gehaeuse_und_arbeitsplattentiefe',
    'Beim Bosch WQG241001 Gleichmaß und die separate Arbeitsplattentiefe des Untergeräts dokumentieren — Check comparable cabinet dimensions and the distinct worktop depth criterion.',
    {satz:pick('Einer der im Bosch WQG241001 Handbuch genannten Sätze.','wtz27400','wtz27410'),
      modell_belegt:yes('Ist Bosch WQG241001 am angebotenen Trockner belegt?'),
      massbasis:pick('Umfang der Untergerätemaße im Vergleich.','vergleichbare_gehaeusemasse','andere_bezugskante','offen'),
      wascher_breite_mm:mm('Dokumentierte Breite des unteren Geräts.'),wascher_tiefe_mm:mm('Dokumentierte Gehäusetiefe des unteren Geräts.'),
      wascher_arbeitsplatte_bekannt:yes('Ist die Arbeitsplattentiefe der unteren Waschmaschine separat dokumentiert?'),arbeitsplatte_mm:mm('Separat dokumentierte Arbeitsplattentiefe in mm, bei ungeklärter Angabe 0.')},
    ({satz,modell_belegt,massbasis,wascher_breite_mm,wascher_tiefe_mm,wascher_arbeitsplatte_bekannt,arbeitsplatte_mm})=>{
      if(massbasis==='vergleichbare_gehaeusemasse'&&(!wascher_breite_mm||!wascher_tiefe_mm)||wascher_arbeitsplatte_bekannt&&!arbeitsplatte_mm) throw new RangeError('Positive bestätigte Maße');
      const differences=[wascher_breite_mm-boschDryer.width,wascher_tiefe_mm-boschDryer.bodyDepth];
      const comparable=modell_belegt&&massbasis==='vergleichbare_gehaeusemasse';
      return {differenzen_breite_gehaeusetiefe_mm:comparable?differences.map(round):null,
        gleiche_angegebene_gehaeusemasse:comparable?differences.every(value=>value===0):null,
        arbeitsplatte_strikt_ueber_550_mm:modell_belegt&&wascher_arbeitsplatte_bekannt?arbeitsplatte_mm>550:null,
        handbuch:boschManual,zubehoerquelle:kits[satz].source,
        grenze:'Gehäusemaße 598 × 613 mm laut Trockneranleitung. Die Zubehörseite nennt separat >550 mm Arbeitsplattentiefe. Hersteller, konkretes Untergerät und Kombination zusätzlich prüfen.'};
    },{satz:'wtz27410',modell_belegt:true,massbasis:'vergleichbare_gehaeusemasse',wascher_breite_mm:598,wascher_tiefe_mm:613,wascher_arbeitsplatte_bekannt:true,arbeitsplatte_mm:550},
    {differenzen_breite_gehaeusetiefe_mm:[0,0],gleiche_angegebene_gehaeusemasse:true,arbeitsplatte_strikt_ueber_550_mm:false}),

  tool('wasch_trocken_stapel_gegen_nebeneinander_arbeitskante',
    'Einen Stapelaufbau und zwei ebenerdige Geräte nach der dokumentiert belegten Arbeitskante vergleichen — Compare two layouts against actual one-sided usable frontage.',
    {frontplaene_vermessen:yes('Sind beide Arbeitskanten inklusive der tatsächlich zu berücksichtigenden Seitenräume vergleichbar dokumentiert?'),
      lichte_front_mm:mm('Tatsächlich verfügbare zusammenhängende Frontbreite.'),stapel_front_mm:mm('Gemessene Planbreite des Stapelaufbaus einschließlich seiner belegten Nebenflächen.'),
      wascher_front_mm:mm('Gemessene Planbreite unten bei Nebeneinanderstellung.'),trockner_front_mm:mm('Gemessene Planbreite des anderen Geräts bei Nebeneinanderstellung.'),
      dazwischen_mm:mm('Eigener bzw. dokumentierter Trennbereich zwischen den nebeneinander stehenden Geräten.'),
      stapelhoehe_und_kombination_belegt:yes('Sind die separat geprüften Höhen und die dokumentierte Kombinationszuordnung für den Stapelansatz bereits bekannt?')},
    ({frontplaene_vermessen,lichte_front_mm,stapel_front_mm,wascher_front_mm,trockner_front_mm,dazwischen_mm,stapelhoehe_und_kombination_belegt})=>{
      if(!lichte_front_mm||!stapel_front_mm||!wascher_front_mm||!trockner_front_mm) throw new RangeError('Positive Frontbreiten');
      const side=wascher_front_mm+trockner_front_mm+dazwischen_mm;
      return {front_rest_stapel_nebeneinander_mm:frontplaene_vermessen?[round(lichte_front_mm-stapel_front_mm),round(lichte_front_mm-side)]:null,
        eigene_frontersparnis_mm:frontplaene_vermessen?round(side-stapel_front_mm):null,
        stapelhoehe_und_paarung_nachpruefen:!stapelhoehe_und_kombination_belegt,
        grenze:'Frontbreiten vergleichen. Zugänge, Höhe, Gerätezuordnung und tatsächlicher Standort stellen eigenständige Anforderungen.'};
    },{frontplaene_vermessen:true,lichte_front_mm:1100,stapel_front_mm:640,wascher_front_mm:610,trockner_front_mm:620,dazwischen_mm:15,stapelhoehe_und_kombination_belegt:false},
    {front_rest_stapel_nebeneinander_mm:[460,-145],eigene_frontersparnis_mm:605,stapelhoehe_und_paarung_nachpruefen:true}),
];
