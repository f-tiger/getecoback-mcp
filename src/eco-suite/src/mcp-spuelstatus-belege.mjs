const products = '/produkte.html';
const n = (description,minimum=0,maximum=1000000) => ({type:'number',description,minimum,maximum});
const minute = description => n(description,0,1440);
const amount = description => n(description,0,1000);
const count = description => n(description,0,1000000);
const flag = description => ({type:'boolean',description});
const choices = (description,...values) => ({type:'string',description,enum:values});
const reading = description => choices(description,'gelesen','fehlend','unlesbar');
const round = value => Math.round(value*1000)/1000;
function ordered(...pairs) {
  if (pairs.some(([start,end])=>end<start)) throw new RangeError('Zeitpunkte in der gleichen Reihenfolge erfassen.');
}
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Zahl der Einträge ganzzahlig angeben.');
}
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page:products,properties,calculate,example:{args,expect}};
}

export const spuelstatusBelege = [
  tool('miele_g7673_spuelanzeige_phase_eco_feedback',
    'Eine beobachtete Anzeige des Miele G 7673 SCVi AutoDos E dem richtigen Zustand zuordnen — Identify forecast bars, completed-run actuals, totals or remaining time.',
    {
      g7673_de_belegt:flag('G 7673 SCVi AutoDos E und Anleitung G7673de-002 am konkreten Gerät belegt?'),
      anzeige:choices('Tatsächlich gelesene Anzeigeart.','prognosebalken','verbrauch_abgelaufener_lauf','gesamtverbrauch','restzeit','nicht_lesbar'),
      belegphase:choices('In der Anzeige dokumentierter Abschnitt.','vor_start','laufend','nach_ende','informationen','unbekannt')
    },({g7673_de_belegt,anzeige,belegphase})=>{
      const belegt={
        prognosebalken:belegphase==='vor_start',
        verbrauch_abgelaufener_lauf:belegphase==='nach_ende',
        gesamtverbrauch:belegphase==='informationen',
        restzeit:belegphase==='vor_start'||belegphase==='laufend'
      };
      return {angezeigte_belegart:g7673_de_belegt&&belegt[anzeige]?anzeige:null,
        erfasst_abgeschlossenen_einzellauf:Boolean(g7673_de_belegt&&belegt[anzeige]&&anzeige==='verbrauch_abgelaufener_lauf'),
        hinweis:'G7673de-002 trennt Prognose, abgelaufenen Lauf und Gesamtverbrauch. Die Restzeit ist keine Ablesung von Wasser oder Strom.'};
    },{g7673_de_belegt:true,anzeige:'prognosebalken',belegphase:'vor_start'},
    {angezeigte_belegart:'prognosebalken',erfasst_abgeschlossenen_einzellauf:false}),

  tool('spuelgang_ende_marker_und_autoopen_beobachtung',
    'Das gelesene Ende-Zeichen und die beobachtete Türbewegung getrennt als Laufbelege führen — Distinguish a program completion marker from a door event.',
    {
      passende_anleitung:flag('Der beobachtete Ende-Text ist in der passenden Herstelleranleitung ausdrücklich als Programmende belegt.'),
      ende_text_gelesen:flag('Ende wurde an diesem Lauf tatsächlich gelesen.'),
      tuer_automatisch_beobachtet:flag('Automatische Türbewegung an diesem Lauf unabhängig beobachtet.'),
      restzeit_beim_oeffnen:choices('Anzeige bei beobachteter Türbewegung.','positiv_gelesen','null_oder_ende','nicht_gelesen')
    },({passende_anleitung,ende_text_gelesen,tuer_automatisch_beobachtet,restzeit_beim_oeffnen})=>({
      ende_durch_text_belegt:passende_anleitung&&ende_text_gelesen,
      tuerereignis_belegt:tuer_automatisch_beobachtet,
      restzeit_beim_ereignis:tuer_automatisch_beobachtet?restzeit_beim_oeffnen:null,
      hinweis:'Eine bewegte Tür ist ein eigener Zeitmarker. Je nach Modell und Programm kann AutoOpen bei verbleibender Restzeit auftreten.'}
    ),{passende_anleitung:true,ende_text_gelesen:false,tuer_automatisch_beobachtet:true,restzeit_beim_oeffnen:'positiv_gelesen'},
    {ende_durch_text_belegt:false,tuerereignis_belegt:true,restzeit_beim_ereignis:'positiv_gelesen'}),

  tool('miele_quickpowerwash_autoopen_zehnminuten_geltungsfall',
    'Die Herstellerangabe zur möglichen AutoOpen-Verzögerung nur auf den nachgewiesenen QuickPowerWash-Fall beziehen — Restrict the ten-minute support note to its documented branch.',
    {
      herstellerfall_zugeordnet:flag('Ist der Miele-Unterstützungshinweis genau diesem Modell und Funktionsstand zugeordnet?'),
      quickpowerwash_belegt:flag('Das gewählte Programm war dokumentiert QuickPowerWash.'),
      ende_autoopen_gelesen:flag('Die Anzeige Ende/AutoOpen wurde am Programmende abgelesen.'),
      keine_manuelle_oeffnung_oder_aus:flag('Das Gerät blieb bis zum Ende der Beobachtung ohne manuelles Öffnen oder Ausschalten.'),
      automatisches_oeffnen_beobachtet:flag('Eine automatische Türbewegung wurde tatsächlich beobachtet.')
    },({herstellerfall_zugeordnet,quickpowerwash_belegt,ende_autoopen_gelesen,keine_manuelle_oeffnung_oder_aus,automatisches_oeffnen_beobachtet})=>{
      const quelle=herstellerfall_zugeordnet&&quickpowerwash_belegt&&ende_autoopen_gelesen&&keine_manuelle_oeffnung_oder_aus;
      return {hinweis_ab_ende_min:quelle?10:null,
        bewegung_selbst_belegt:automatisches_oeffnen_beobachtet,
        fall:quelle?'nur_belegter_quickpowerwash_hinweis':'zuordnung_oder_bedingung_offen',
        hinweis:'Die Herstelleraussage zum Fall ist kein beobachtetes Türereignis und gilt nicht pauschal für andere Programme.'};
    },{herstellerfall_zugeordnet:true,quickpowerwash_belegt:true,ende_autoopen_gelesen:true,keine_manuelle_oeffnung_oder_aus:true,automatisches_oeffnen_beobachtet:false},
    {hinweis_ab_ende_min:10,bewegung_selbst_belegt:false,fall:'nur_belegter_quickpowerwash_hinweis'}),

  tool('miele_g7673_einzellauf_anzeige_nach_ausschalten',
    'Nach Ausschalten den belegten letzten Spüllauf von fehlenden nur vorübergehend sichtbaren Angaben trennen — Preserve previously recorded values without reconstructing a cleared display.',
    {
      passendes_geraet:flag('G 7673 SCVi AutoDos E nach G7673de-002 und laufbezogene Verbrauchsanzeige belegt?'),
      ausschalten_nach_ende:flag('Ist Ausschalten nach dem Ende dieses Laufs dokumentiert?'),
      stromwert_notiert:flag('Stromanzeige wurde davor für diesen Lauf lesbar übernommen.'),
      wasserwert_notiert:flag('Wasseranzeige wurde davor für diesen Lauf lesbar übernommen.')
    },({passendes_geraet,ausschalten_nach_ende,stromwert_notiert,wasserwert_notiert})=>({
      aktuelle_einzellaufanzeige_nach_handbuch_geloescht:passendes_geraet&&ausschalten_nach_ende?true:null,
      notizen_nutzbar:passendes_geraet?[stromwert_notiert?'strom':null,wasserwert_notiert?'wasser':null].filter(Boolean):[],
      offen:[!stromwert_notiert?'strom':null,!wasserwert_notiert?'wasser':null].filter(Boolean),
      hinweis:'Das Handbuch nennt das Löschen der Einzelanzeige beim Ausschalten nach Ende. Bereits getrennt festgehaltene Notizen gehen dadurch nicht verloren.'}
    ),{passendes_geraet:true,ausschalten_nach_ende:true,stromwert_notiert:true,wasserwert_notiert:false},
    {aktuelle_einzellaufanzeige_nach_handbuch_geloescht:true,notizen_nutzbar:['strom'],offen:['wasser']}),

  tool('spuelanzeige_zwei_personen_strom_wasser_zuordnung',
    'Getrennte Strom- und Wasserablesungen zweier Personen nur beim bestätigten selben Lauf zusammenführen — Join partial findings from two people without fabricating an absent value.',
    {
      gleicher_einzellauf_belegt:flag('Beide Notizen beziehen sich auf dieselbe am Ende identifizierte einzelne Runde.'),
      erste_stromablesung:reading('Erste Person hat die Stromanzeige dieses Laufs gelesen.'),
      kwh:amount('Nur bei gelesenem Wert den notierten kWh-Wert angeben, sonst 0.'),
      zweite_wasserablesung:reading('Zweite Person hat die Wasseranzeige dieses Laufs gelesen.'),
      liter:amount('Nur bei gelesenem Wert die notierten Liter angeben, sonst 0.'),
      beide_einheiten_lesbar:flag('Die jeweils vorhandenen Zahlen sind eindeutig kWh beziehungsweise Liter zugeordnet.')
    },({gleicher_einzellauf_belegt,erste_stromablesung,kwh,zweite_wasserablesung,liter,beide_einheiten_lesbar})=>{
      if(erste_stromablesung!=='gelesen'&&kwh!==0||zweite_wasserablesung!=='gelesen'&&liter!==0) throw new RangeError('Ohne gelesenen Wert keine Menge eintragen.');
      const vergleich=gleicher_einzellauf_belegt&&beide_einheiten_lesbar;
      return {notiz_kwh:vergleich&&erste_stromablesung==='gelesen'?kwh:null,
        notiz_liter:vergleich&&zweite_wasserablesung==='gelesen'?liter:null,
        hinweis:'Übernimmt Geräteanzeigen wörtlich. Fehlende Einzelwerte bleiben offen.'};
    },{gleicher_einzellauf_belegt:true,erste_stromablesung:'gelesen',kwh:0.72,zweite_wasserablesung:'fehlend',liter:0,beide_einheiten_lesbar:true},
    {notiz_kwh:0.72,notiz_liter:null}),

  tool('spuelprogramm_anzeige_istvergleich_extras_und_beladung',
    'Zwei belegte Ist-Anzeigewerte nur mit vergleichbarer Programmauswahl und Beladung einordnen — Keep same-program displayed actuals comparable.',
    {
      a_liter:amount('Abgelesener Literwert zum abgeschlossenen Lauf A.'),b_liter:amount('Entsprechender Wert B.'),
      gleiches_programm:flag('Programm für beide abgeschlossenen Läufe bestätigt gleich.'),
      gleiche_extras:flag('Zusatzoptionen bei beiden Läufen bestätigt gleich.'),
      beladung_und_umgebung_vergleichbar:flag('Menge, Ausgangslage und beobachtete Umgebung vergleichbar.'),
      wirklich_einzel_istwerte:flag('Beide Zeilen sind jeweils die Einzelanzeige nach Abschluss.')
    },({a_liter,b_liter,gleiches_programm,gleiche_extras,beladung_und_umgebung_vergleichbar,wirklich_einzel_istwerte})=>({
      beobachtete_displaydifferenz_l:gleiches_programm&&gleiche_extras&&beladung_und_umgebung_vergleichbar&&wirklich_einzel_istwerte?round(b_liter-a_liter):null,
      anders_oder_offen:[!gleiches_programm?'programm':null,!gleiche_extras?'extras':null,
        !beladung_und_umgebung_vergleichbar?'beladung_umgebung':null,!wirklich_einzel_istwerte?'belegart':null].filter(Boolean),
      hinweis:'Zwei Anzeigen vergleichen. Die Differenz begründet weder Ursache noch eine künftige Verbrauchserwartung.'}
    ),{a_liter:8.6,b_liter:9.8,gleiches_programm:true,gleiche_extras:false,beladung_und_umgebung_vergleichbar:true,wirklich_einzel_istwerte:true},
    {beobachtete_displaydifferenz_l:null,anders_oder_offen:['extras']}),

  tool('spuelprognose_balken_symbol_zwei_notizen_register',
    'Zwei Vorabbalken nur zuordnen, wenn Energie- oder Wassersymbol und Auswahlbedingungen belegbar sind — Audit the labels on qualitative forecast notes.',
    {
      a_symbol:choices('Abgelesenes Symbol bei Notiz A.','energie','wasser','unbekannt'),
      b_symbol:choices('Abgelesenes Symbol bei Notiz B.','energie','wasser','unbekannt'),
      gleiche_auswahl_und_beladung:flag('Programm, Extras, Beladung und übliche Bedingungen sind in beiden Notizen gleich belegt.'),
      beide_vor_start:flag('Beide Notizen stammen von der Vorhersage vor dem Start.')
    },({a_symbol,b_symbol,gleiche_auswahl_und_beladung,beide_vor_start})=>({
      vergleichszeichen:beide_vor_start&&gleiche_auswahl_und_beladung&&a_symbol!=='unbekannt'&&a_symbol===b_symbol?a_symbol:null,
      offene_zusammenfuehrung:[!beide_vor_start?'anzeigephase':null,
        !gleiche_auswahl_und_beladung?'auswahlkontext':null,a_symbol!==b_symbol||a_symbol==='unbekannt'?'symbol':null].filter(Boolean),
      hinweis:'Balken bleiben qualitative Vorabinformation. Keine Werte in kWh oder Litern aus Balken ableiten.'}
    ),{a_symbol:'energie',b_symbol:'wasser',gleiche_auswahl_und_beladung:true,beide_vor_start:true},
    {vergleichszeichen:null,offene_zusammenfuehrung:['symbol']}),

  tool('spuelprognose_auswahlwechsel_balkenfoto_zeitzuordnung',
    'Ein Prognosefoto anhand der laufenden Auswahlfolge und des tatsächlich beobachteten Wechsels zur Restzeit zuordnen — Determine which selection the saved view could belong to.',
    {
      auswahl_a_ab:minute('Zeitpunkt der bestätigten Auswahl A.'),
      auswahl_b_ab:minute('Spätere bestätigte Auswahl B.'),
      restanzeige_b_ab:minute('Beobachteter Wechsel von der Prognose B zur Restanzeige.'),
      foto_min:minute('Zeitpunkt des gespeicherten Fotos auf derselben Skala.'),
      beides_prognosesymbol:flag('Das Foto zeigt erkennbar Prognosesymbole anstelle einer Zeitanzeige.')
    },({auswahl_a_ab,auswahl_b_ab,restanzeige_b_ab,foto_min,beides_prognosesymbol})=>{
      ordered([auswahl_a_ab,auswahl_b_ab],[auswahl_b_ab,restanzeige_b_ab]);
      const zwischen=foto_min>=auswahl_b_ab&&foto_min<restanzeige_b_ab;
      return {auswahl_b_zeitlich_belegt:beides_prognosesymbol&&zwischen,
        alte_auswahl_nicht_automatisch_zuordnen:foto_min<auswahl_b_ab,
        hinweis:'Nur die bestätigte Prognosephase B zuordnen. Ältere Fotos ohne den konkreten Phasenbeleg separat prüfen.'};
    },{auswahl_a_ab:600,auswahl_b_ab:603,restanzeige_b_ab:604,foto_min:604,beides_prognosesymbol:true},
    {auswahl_b_zeitlich_belegt:false,alte_auswahl_nicht_automatisch_zuordnen:false}),

  tool('miele_g7673_optische_endanzeige_dunkel_geschlossen',
    'Optische Funktionskontrolle bei geschlossener Tür von unabhängig gelesenem Ende unterscheiden — Interpret the documented closing-side lamp evidence with its conditions.',
    {
      g7673_de_bestaetigt:flag('G 7673 SCVi AutoDos E und passende Anleitung bestätigt?'),
      tuer_geschlossen_beobachtet:flag('Tür war bei dieser Lampenbeobachtung tatsächlich geschlossen.'),
      licht:choices('Was wurde an der optischen Funktionskontrolle gesehen?','langsam_blinkend','dunkel','anderes','unbekannt'),
      ende_im_display:flag('Ende am selben Lauf separat im Display gelesen.')
    },({g7673_de_bestaetigt,tuer_geschlossen_beobachtet,licht,ende_im_display})=>({
      lichtbefund_beim_ende:g7673_de_bestaetigt&&tuer_geschlossen_beobachtet&&licht==='langsam_blinkend'?'handbuchgemaesser_endhinweis':'licht_allein_nicht_zuordenbar',
      ende_durch_display_belegt:g7673_de_bestaetigt&&ende_im_display,
      hinweis:'Bei geschlossener Tür erlischt die optische Funktionskontrolle laut G7673de-002 zehn Minuten nach Ende. Dunkelheit allein beweist keinen abgeschlossenen Lauf.'}
    ),{g7673_de_bestaetigt:true,tuer_geschlossen_beobachtet:true,licht:'dunkel',ende_im_display:false},
    {lichtbefund_beim_ende:'licht_allein_nicht_zuordenbar',ende_durch_display_belegt:false}),

  tool('spuelstatus_unterbrechung_fortsetzung_neustart_abgrenzen',
    'Eine beobachtete Spülpause von einem Abbruch oder bestätigten Folgelauf unterscheiden — Keep resumed operation distinct from a newly identified run.',
    {
      pause_oder_abbruch:choices('Tatsächlich protokollierter Zustand.','unterbrochen','abgebrochen','unbekannt'),
      fortsetzung_belegt:flag('Der exakt selbe Lauf ist als fortgesetzt unabhängig belegt.'),
      neuer_start_belegt:flag('Ein separater, neuer Programmstart ist für den nächsten Eintrag separat belegt.'),
      ende_vor_ereignis:flag('Ende des ursprünglichen Laufs vor dem Ereignis separat belegt.')
    },({pause_oder_abbruch,fortsetzung_belegt,neuer_start_belegt,ende_vor_ereignis})=>({
      laufbezug:neuer_start_belegt?'separater_start':fortsetzung_belegt&&pause_oder_abbruch==='unterbrochen'&&!ende_vor_ereignis?'derselbe_lauf_fortgesetzt':
        pause_oder_abbruch==='abgebrochen'?'alter_lauf_abgebrochen':'nicht_zugeordnet',
      urspruengliches_ende_belegt:ende_vor_ereignis,
      hinweis:'Nur bereits beobachtete Marker auswerten. Die Tür oder ein weiterlaufender Zeitwert legt die Laufidentität nicht allein fest.'}
    ),{pause_oder_abbruch:'unterbrochen',fortsetzung_belegt:true,neuer_start_belegt:false,ende_vor_ereignis:false},
    {laufbezug:'derselbe_lauf_fortgesetzt',urspruengliches_ende_belegt:false}),

  tool('spuelstatus_restzeit_und_echte_enduhrzeit_abgleich',
    'Eine abgelesene Restzeit zur selben Uhrzeit mit dem später tatsächlich beobachteten Ende abgleichen — Compare a displayed expectation with a separately observed completion event.',
    {
      ablesung_min:minute('Zeitpunkt, an dem eine Restzeit abgelesen wurde.'),
      restanzeige_min:minute('Damals angezeigte Restzeit in Minuten.'),
      ende_min:minute('Uhrzeit des beobachteten Ende-Markers auf derselben Zeitachse.'),
      lauf_ohne_ersatz:flag('Die Anzeige und das abgelesene Ende waren nachweislich derselbe Lauf und kein neuer Start.')
    },({ablesung_min,restanzeige_min,ende_min,lauf_ohne_ersatz})=>{
      if(lauf_ohne_ersatz) ordered([ablesung_min,ende_min]);
      return {beobachtetes_delta_zur_frueheren_anzeige_min:lauf_ohne_ersatz?round(ende_min-ablesung_min-restanzeige_min):null,
        hinweis:'Die Differenz beschreibt nur die frühere Anzeige und das beobachtete Ende. Sie plant kein späteres Programm.'};
    },{ablesung_min:630,restanzeige_min:25,ende_min:662,lauf_ohne_ersatz:true},
    {beobachtetes_delta_zur_frueheren_anzeige_min:7}),

  tool('miele_g7673_automatisch_aus_dokumentierter_bezug',
    'Den dokumentierten automatischen Abschaltbezug von Ausschalten und Fehlern im beobachteten Ablauf trennen — Scope the ten-minute automatic-off behavior without asserting that it happened.',
    {
      genauer_handbuchbezug:flag('Genaues G 7673 SCVi AutoDos E und G7673de-002 bestätigt?'),
      laufstatus:choices('Belegter Programmzustand zur fraglichen Zeit.','laufend','nicht_laufend','unbekannt'),
      anzeigefehler:choices('Belegter Fehlerzustand zur fraglichen Zeit.','fehler','kein_fehler','unbekannt'),
      letzter_bezug:choices('Letztes belegtes Bezugsereignis laut Notiz.','programmende','sensortaste','unbekannt'),
      ausschaltbeobachtung:flag('Ausschalten wurde separat am Gerät beobachtet.')
    },({genauer_handbuchbezug,laufstatus,anzeigefehler,letzter_bezug,ausschaltbeobachtung})=>{
      const belegt=genauer_handbuchbezug&&laufstatus==='nicht_laufend'&&anzeigefehler==='kein_fehler'&&letzter_bezug!=='unbekannt';
      return {dokumentierter_bezug:belegt?letzter_bezug:null,
        vorgabe_min:belegt?10:null,aus_tatsaechlich_beobachtet:ausschaltbeobachtung,
        hinweis:'Handbuchbezug, kein Ereignisnachweis. Während laufender Programme und bei Fehlern gilt die automatische Abschaltung laut Anleitung nicht.'};
    },{genauer_handbuchbezug:true,laufstatus:'nicht_laufend',anzeigefehler:'fehler',letzter_bezug:'programmende',ausschaltbeobachtung:false},
    {dokumentierter_bezug:null,vorgabe_min:null,aus_tatsaechlich_beobachtet:false}),
  tool('miele_g7673_ende_trocknungsgeblaese_beobachtungsgrenze',
    'Bei belegtem Programmende ein weiter beobachtetes Trocknungsgebläse separat notieren — Separate the end marker from the post-run fan observation.',
    {
      modell_zugeordnet:flag('G 7673 SCVi AutoDos E und zugehöriges Handbuch bestätigt?'),
      ende_gelesen:flag('Ende im Display am fraglichen Lauf tatsächlich gelesen.'),
      geblaese:choices('Zustand zu einem gesondert notierten Zeitpunkt.','laeuft_beobachtet','steht_beobachtet','unbekannt'),
      geblaese_nach_ende:flag('Ist diese Beobachtung nach dem gelesenen Ende zeitlich belegt?')
    },({modell_zugeordnet,ende_gelesen,geblaese,geblaese_nach_ende})=>({
      programmabschluss:modell_zugeordnet&&ende_gelesen?'ende_belegt':'nicht_durch_geblaese_bestimmt',
      geblaese_nach_ende_protokoll:modell_zugeordnet&&ende_gelesen&&geblaese_nach_ende&&geblaese!=='unbekannt'?geblaese:null,
      hinweis:'Das Handbuch nennt möglichen Nachlauf. Geräusch oder Stille bezeichnet allein weder den Ende-Marker noch den Wasserverbrauch.'}
    ),{modell_zugeordnet:true,ende_gelesen:true,geblaese:'laeuft_beobachtet',geblaese_nach_ende:true},
    {programmabschluss:'ende_belegt',geblaese_nach_ende_protokoll:'laeuft_beobachtet'}),

  tool('spuelanzeige_externer_zaehler_gleicher_messumfang',
    'Einzelanzeige im Gerät und externen Messwert nur auf bestätigtem gleichem Zeitraum gegenüberstellen — Check whether an external meter and the display cover the same cycle.',
    {
      display_kwh:amount('Abgelesener kWh-Wert für den abgeschlossenen Einzellauf.'),
      extern_kwh:amount('Extern gemessene kWh ausschließlich für das bezeichnete Gerät.'),
      gleicher_lauf:flag('Sind beide Quellen demselben abgeschlossenen Lauf zugeordnet?'),
      gleicher_zeitumfang:flag('Sind identische Zeitgrenzen einschließlich eventuellem Nachlauf belegt?'),
      gleicher_energieumfang:flag('Erfassen beide belegten Werte dieselbe Energieart desselben Geräts?')
    },({display_kwh,extern_kwh,gleicher_lauf,gleicher_zeitumfang,gleicher_energieumfang})=>({
      extern_minus_anzeige_kwh:gleicher_lauf&&gleicher_zeitumfang&&gleicher_energieumfang?round(extern_kwh-display_kwh):null,
      massbezug_offen:[!gleicher_lauf?'lauf':null,!gleicher_zeitumfang?'zeitgrenzen':null,!gleicher_energieumfang?'energieumfang':null].filter(Boolean),
      hinweis:'Zahlen sind Beobachtungen aus zwei getrennten Quellen. Differenz außerhalb gemeinsamer Bilanzgrenzen bleibt offen.'}
    ),{display_kwh:0.71,extern_kwh:0.75,gleicher_lauf:true,gleicher_zeitumfang:false,gleicher_energieumfang:true},
    {extern_minus_anzeige_kwh:null,massbezug_offen:['zeitgrenzen']}),

  tool('spuelgesamtanzeige_intervall_geraetewechsel_beleg',
    'Zwei Gesamtanzeigen nur beim belegten selben physikalischen Gerät und fortlaufendem Zählerstand vergleichen — Avoid subtracting lifetime displays across replacement units.',
    {
      anfang_l:n('Belegter erster Gesamt-Literwert in Informationen.'),
      schluss_l:n('Belegter zweiter Gesamt-Literwert in Informationen.'),
      selbes_einzelgeraet:flag('Dasselbe einzelne Gerät jenseits desselben Modellnamens bestätigt?'),
      anzeige_fortlaufend:flag('Unveränderte Zählergrundlage zwischen den Ablesungen unabhängig belegt?'),
      einheit_und_gesamtfeld:flag('Beide Werte stammen aus dem gleichen Gesamtfeld und sind in Litern erfasst.')
    },({anfang_l,schluss_l,selbes_einzelgeraet,anzeige_fortlaufend,einheit_und_gesamtfeld})=>{
      const belegt=selbes_einzelgeraet&&anzeige_fortlaufend&&einheit_und_gesamtfeld;
      return {intervall_gesamt_l:belegt&&schluss_l>=anfang_l?round(schluss_l-anfang_l):null,
        nachpruefen:!selbes_einzelgeraet?'geraeteidentitaet':!anzeige_fortlaufend?'zaehlerbezug':!einheit_und_gesamtfeld?'feldbezug':
          schluss_l<anfang_l?'ruecklaeufiger_stand':'keine_offene_zuordnung',
        hinweis:'Intervall einer belegten Gesamtanzeige. Das Ergebnis wird keinem einzelnen Spülgang zugeteilt.'};
    },{anfang_l:309,schluss_l:320,selbes_einzelgeraet:false,anzeige_fortlaufend:true,einheit_und_gesamtfeld:true},
    {intervall_gesamt_l:null,nachpruefen:'geraeteidentitaet'}),

  tool('spuelstatus_gesamtzaehler_programmmenge_laufnotizen',
    'Bei bestätigtem unverändertem Programmzähler Lücken in einer Liste abgeschlossener Läufe erkennen — Reconcile a documented run count against individual records.',
    {
      zaehler_vorher:count('Abgelesene Zahl vor dem Betrachtungsintervall.'),
      zaehler_nachher:count('Abgelesene Zahl danach.'),
      eindeutige_notizen:count('Bestätigte unterschiedliche Liste abgeschlossener Läufe im Intervall.'),
      zaehler_bedeutung_belegt:flag('Die genaue Zählerbedeutung entspricht den betrachteten abgeschlossenen Läufen.'),
      einheitliche_zaehlerbasis:flag('Dasselbe Gerät, derselbe Intervallbezug und gleicher Programmzähler belegt.')
    },({zaehler_vorher,zaehler_nachher,eindeutige_notizen,zaehler_bedeutung_belegt,einheitliche_zaehlerbasis})=>{
      whole(zaehler_vorher,zaehler_nachher,eindeutige_notizen);
      const abgleichbar=zaehler_bedeutung_belegt&&einheitliche_zaehlerbasis&&zaehler_nachher>=zaehler_vorher;
      const delta=zaehler_nachher-zaehler_vorher-eindeutige_notizen;
      return {gesicherte_notizluecken:abgleichbar&&delta>=0?delta:null,
        mehr_notizen_als_zaehleranlaesse:abgleichbar?delta<0:null,
        hinweis:'Zählt belegte Notizen. Fehlende Verbrauchswerte oder Inhalte werden aus der Zahl nicht ergänzt.'};
    },{zaehler_vorher:105,zaehler_nachher:112,eindeutige_notizen:5,zaehler_bedeutung_belegt:true,einheitliche_zaehlerbasis:true},
    {gesicherte_notizluecken:2,mehr_notizen_als_zaehleranlaesse:false}),

  tool('spuelbeleg_doppelnotiz_gleiche_zahlen_laufidentitaet',
    'Zwei Verbrauchsnotizen mit gleichen Zahlen erst bei belegtem selben Lauf als Duplikat zählen — Preserve run identity rather than deduplicating by numeric equality.',
    {
      laufbezug:choices('Tatsächlicher bestätigter Ereignisbezug der Notizen.','derselbe_lauf','zwei_laeufe','unklar'),
      zahlen_gleich:flag('Die jeweils gleichartigen und lesbaren Angaben haben dieselben Zahlen.'),
      gleiche_anzeigeart:flag('Beide Belege gehören zu derselben Einzelanzeigeart.')
    },({laufbezug,zahlen_gleich,gleiche_anzeigeart})=>({
      anzahl_belegter_laeufe:laufbezug==='derselbe_lauf'?1:laufbezug==='zwei_laeufe'?2:null,
      zusammenfuehrung:laufbezug==='unklar'?'identitaet_offen':laufbezug==='zwei_laeufe'?'getrennt_fuehren':
        !gleiche_anzeigeart?'anzeigeart_pruefen':zahlen_gleich?'gleicher_lauf_und_gleiche_zahlen':'widerspruch_im_selben_lauf',
      hinweis:'Gleiche Zahlen allein belegen keine Identität zweier Läufe.'}
    ),{laufbezug:'unklar',zahlen_gleich:true,gleiche_anzeigeart:true},
    {anzahl_belegter_laeufe:null,zusammenfuehrung:'identitaet_offen'}),

  tool('spuelbeleg_fotoaufnahme_weitergabe_ausschalten',
    'Bei einer erst später weitergereichten Spülanzeige Aufnahme und Versand getrennt zeitlich belegen — Keep capture time distinct from message forwarding.',
    {
      ende_min:minute('Zeit des für diesen Lauf gelesenen Ende-Markers.'),
      aus_min:minute('Separat beobachtetes Ausschalten desselben Geräts.'),
      aufnahme_min:minute('Belegter Zeitpunkt, zu dem der angezeigte Verbrauch tatsächlich fotografiert wurde.'),
      weitergabe_min:minute('Zeitpunkt der späteren Weitergabe der Notiz auf derselben Zeitbasis.'),
      zeitachsen_und_anzeige_geprueft:flag('Sind alle Zeiten mit gemeinsamer Zeitbasis und demselben Lauf dokumentiert?')
    },({ende_min,aus_min,aufnahme_min,weitergabe_min,zeitachsen_und_anzeige_geprueft})=>{
      if(zeitachsen_und_anzeige_geprueft) ordered([ende_min,aus_min],[aufnahme_min,weitergabe_min]);
      return {aufnahme_vor_aus_nach_ende:zeitachsen_und_anzeige_geprueft?aufnahme_min>=ende_min&&aufnahme_min<aus_min:null,
        weitergabe_nach_aus:zeitachsen_und_anzeige_geprueft?weitergabe_min>=aus_min:null,
        hinweis:'Nur einen eindeutig gelesenen Einzelwert annehmen, wenn die Aufnahme belegt ist. Versandzeit ist kein Aufnahmezeitpunkt.'};
    },{ende_min:810,aus_min:819,aufnahme_min:815,weitergabe_min:840,zeitachsen_und_anzeige_geprueft:true},
    {aufnahme_vor_aus_nach_ende:true,weitergabe_nach_aus:true}),

  tool('miele_g7673_einstellungen_wlan_ruecksetzbelege',
    'Bei vorhandener Rücksetznotiz die dokumentierten Einstellungen und den getrennten WLAN-Bereich auseinanderhalten — Determine retained evidence without initiating any reset.',
    {
      g7673_handbuch_belegt:flag('Genaues Gerät und passende Anleitung G7673de-002 bestätigt.'),
      werksbereich_belegt:flag('Eine separate Bestätigung zum Einstellungsbereich liegt vor.'),
      wlan_vorhanden:choices('Ist ein entsprechender WLAN-Bereich laut Unterlagen vorhanden?','ja','nein','unklar'),
      wlan_belegt:flag('Für vorhandenen WLAN-Bereich liegt eine separate Bestätigung vor.')
    },({g7673_handbuch_belegt,werksbereich_belegt,wlan_vorhanden,wlan_belegt})=>({
      einstellungen_belegt:g7673_handbuch_belegt?werksbereich_belegt:null,
      wlan_belegstatus:!g7673_handbuch_belegt||wlan_vorhanden==='unklar'?'zuordnung_offen':
        wlan_vorhanden==='nein'?'nicht_anwendbar':wlan_belegt?'separat_belegt':'separater_beleg_fehlt',
      gesamtverbrauch_zurueckgesetzt:null,
      hinweis:'Laut Handbuch sind Einstellungsbereich und WLAN, falls vorhanden, getrennt. Daraus folgt kein Beleg für Änderungen am Gesamtverbrauch.'}
    ),{g7673_handbuch_belegt:true,werksbereich_belegt:true,wlan_vorhanden:'ja',wlan_belegt:false},
    {einstellungen_belegt:true,wlan_belegstatus:'separater_beleg_fehlt',gesamtverbrauch_zurueckgesetzt:null}),

  tool('spuelbeleg_umzug_geraetevermerk_von_raumlabel_trennen',
    'Verbrauchsnotizen nach einem Umzug auf Gerätezuordnung und lokales Raumlabel getrennt prüfen — Keep moved-appliance evidence attached to the right physical unit.',
    {
      alt_einzelgeraet_belegt:flag('Altbeleg ist eindeutig einem einzelnen Gerät zugeordnet.'),
      nach_transport_einzelgeraet_belegt:flag('Zuordnung am neuen Ort ist unabhängig dokumentiert.'),
      einzelgeraet_gleich:flag('Die beiden unabhängigen Zuordnungen bestätigen dasselbe einzelne Gerät.'),
      nur_raumlabel_geaendert:flag('Die Umbenennung der Küche oder des Listenlabels ist separat dokumentiert.')
    },({alt_einzelgeraet_belegt,nach_transport_einzelgeraet_belegt,einzelgeraet_gleich,nur_raumlabel_geaendert})=>{
      const belegt=alt_einzelgeraet_belegt&&nach_transport_einzelgeraet_belegt;
      return {zuordnung_des_altbelegs:!belegt?'geraet_offen':einzelgeraet_gleich?'beim_selben_geraet':'beim_frueheren_geraet',
        raumlabel_separat_fuehren:nur_raumlabel_geaendert,
        hinweis:'Die Verbindung der Notizen belegt weder gleichen Anlagenzustand noch vergleichbaren Verbrauch am neuen Ort.'};
    },{alt_einzelgeraet_belegt:true,nach_transport_einzelgeraet_belegt:false,einzelgeraet_gleich:false,nur_raumlabel_geaendert:true},
    {zuordnung_des_altbelegs:'geraet_offen',raumlabel_separat_fuehren:true}),

  tool('spuelinformationsmenue_auslesefelder_geraetevermerk',
    'Bei einer Geräteübergabe Zählerfelder, Modellbezug und Softwarevermerk getrennt dokumentieren — Select the proper information field for the intended reference.',
    {
      genaues_miele_handbuch:flag('Das bezeichnete Informationsmenü ist in der Anleitung des Geräts belegt.'),
      zweck:choices('Welche Belegart wird für die Übergabenotiz gesucht?','laufzaehler','betriebsstunden','software','geraeteidentitaet','einzellaufverbrauch'),
      aufgezeichnetes_feld:choices('Tatsächlich abgelesenes Feld.','programmablaeufe','betriebsstunden','softwareversion','typenschild','gesamtverbrauch','einzellaufverbrauch','unklar')
    },({genaues_miele_handbuch,zweck,aufgezeichnetes_feld})=>{
      const zuordnung={laufzaehler:'programmablaeufe',betriebsstunden:'betriebsstunden',software:'softwareversion',
        geraeteidentitaet:'typenschild',einzellaufverbrauch:'einzellaufverbrauch'};
      const erwartet=zuordnung[zweck];
      return {feld_erwartet:genaues_miele_handbuch?erwartet:null,
        passende_notiz:genaues_miele_handbuch&&aufgezeichnetes_feld!=='unklar'?aufgezeichnetes_feld===erwartet:null,
        hinweis:'Informationsfelder sind unterschiedliche Belege. Der Gesamtverbrauch ist keine Einzelanzeige nach Ende.'};
    },{genaues_miele_handbuch:true,zweck:'software',aufgezeichnetes_feld:'typenschild'},
    {feld_erwartet:'softwareversion',passende_notiz:false}),

  tool('miele_g7673_programmdauer_erste_auswahl_kaltwasserbasis',
    'Eine anfängliche Zeitangabe bei erstmaliger Programmauswahl als dokumentierten Referenzwert erkennen — Separate the first cold-water average from a running countdown.',
    {
      modell_und_anzeige_belegt:flag('Genaues Modell G 7673 SCVi AutoDos E und Zeitfeld identifiziert.'),
      erste_programmauswahl:flag('Die erste Auswahl dieses Programms ist tatsächlich bestätigt.'),
      vor_start:flag('Die Ablesung war vor dem Start.'),
      zeit_gelesen:flag('Der Minutenwert wurde für diese Auswahl tatsächlich gelesen.'),
      dauer_min:minute('Gelesene Dauer. Wenn nichts gelesen wurde, 0 eingeben.')
    },({modell_und_anzeige_belegt,erste_programmauswahl,vor_start,zeit_gelesen,dauer_min})=>{
      if(!zeit_gelesen&&dauer_min!==0) throw new RangeError('Eine unlesbare Anzeige liefert keine Dauer.');
      const belegt=modell_und_anzeige_belegt&&erste_programmauswahl&&vor_start;
      return {basis:belegt?'durchschnittlicher_startwert_kaltwasser':'keine_zuordnung_zum_ersten_startwert',
        notierter_referenzwert_min:belegt&&zeit_gelesen?dauer_min:null,
        hinweis:'Das Handbuch bezeichnet den ersten Wert als durchschnittliche Programmdauer bei Kaltwasseranschluss. Er beweist keinen tatsächlichen Endzeitpunkt.'};
    },{modell_und_anzeige_belegt:true,erste_programmauswahl:true,vor_start:true,zeit_gelesen:true,dauer_min:130},
    {basis:'durchschnittlicher_startwert_kaltwasser',notierter_referenzwert_min:130}),

  tool('spuelstatus_ende_um_timer_ende_zeittext_unterscheiden',
    'Eine protokollierte Anzeige Ende um als Timerwunsch vom Marker Ende unterscheiden — Identify whether a time label is a schedule, estimate or observed end.',
    {
      textart:choices('Vollständig gelesener Text oder eindeutig belegtes Feld.','ende_um','start_um','restzeit','ende','nicht_eindeutig'),
      quelle_und_geraet_bestaetigt:flag('Angezeigtes Feld und genaue Anleitung für dieses Gerät verbunden?'),
      am_lauf_gelesen:flag('Der Text wurde für den bezeichneten Lauf tatsächlich abgelesen.')
    },({textart,quelle_und_geraet_bestaetigt,am_lauf_gelesen})=>{
      const zuordnung={ende_um:'timerwunsch',start_um:'timerwunsch',restzeit:'abschaetzung',ende:'endmarker'};
      const art=quelle_und_geraet_bestaetigt&&am_lauf_gelesen?zuordnung[textart]??null:null;
      return {zeitbelegart:art,ende_durch_label_belegt:art==='endmarker',
        hinweis:'Ein Timerwunsch enthält eine gewünschte Uhrzeit und keinen beobachteten Abschluss.'};
    },{textart:'ende_um',quelle_und_geraet_bestaetigt:true,am_lauf_gelesen:true},
    {zeitbelegart:'timerwunsch',ende_durch_label_belegt:false}),

  tool('spuelbeleg_verbrauch_dialog_und_zahlenablesung',
    'Bei einem Foto mit Verbrauchshinweis eine bloße Dialogbeschriftung von tatsächlich lesbaren Zahlen trennen — Check whether a captured prompt carries any actual consumption measurement.',
    {
      hinweis_sichtbar:flag('Die Meldung zur Verbrauchsanzeige ist auf dem vorhandenen Foto lesbar.'),
      energiezahl_lesbar:flag('Ein vollständiger Energiewert mit zugehöriger Einheit ist zusätzlich lesbar.'),
      wasserzahl_lesbar:flag('Ein vollständiger Wasserwert mit zugehöriger Einheit ist zusätzlich lesbar.'),
      aktuelle_einzellaufanzeige:flag('Es ist belegt, dass die abgelesenen Zahlen zum tatsächlich abgeschlossenen einzelnen Lauf gehören.')
    },({hinweis_sichtbar,energiezahl_lesbar,wasserzahl_lesbar,aktuelle_einzellaufanzeige})=>({
      belegte_zahlenfelder:aktuelle_einzellaufanzeige?[energiezahl_lesbar?'energie':null,wasserzahl_lesbar?'wasser':null].filter(Boolean):[],
      nur_hinweis_ohne_zahlen:hinweis_sichtbar&&!energiezahl_lesbar&&!wasserzahl_lesbar,
      hinweis:'Ein beschrifteter Dialog ist kein Verbrauchswert. Fehlende Zahlen werden auch bei sichtbarem Wort Verbrauch nicht ergänzt.'}
    ),{hinweis_sichtbar:true,energiezahl_lesbar:false,wasserzahl_lesbar:false,aktuelle_einzellaufanzeige:true},
    {belegte_zahlenfelder:[],nur_hinweis_ohne_zahlen:true}),
];
