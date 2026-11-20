const rack='/guide/beheizter-waeschestaender.html';
const laundry='/guide/waesche-trocknen-wohnung.html';
const comparison='/waeschetrockner-oder-luftentfeuchter.html';
const measure='/guide/luftfeuchtigkeit-richtig-messen.html';
const power='/strommess-protokoll.html';

const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const pick=(description,...values)=>({type:'string',description,enum:values});
const grams=description=>num(description,0,40000);
const mins=description=>num(description,0,1440);
const kwh=description=>num(description,0,100);
const count=description=>num(description,0,300);
const humidity=description=>num(description,0,100);
const round = value => Number(value.toFixed(3)) + 0;
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Ganzzahlige Stückzahlen erforderlich');
}
function tool(name,description,page,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const trocknungswaerme=[
  tool('heizwaesche_rueckstandsgruppen_gewicht_unabhaengig',
    'Restfeuchte an Kontakt- und freien Positionen jeweils gegen ihr eigenes Ziel prüfen — Identify which weighed placement group still keeps a heated-rack load unfinished.',rack,
    {proben_zugeordnet:yes('Sind die zwei Stoffgruppen seit dem Trockenziel-Bezug und bei jeder Wägung unverändert zugeordnet?'),
      kontakt_abstand_g:num('Vorzeichenbehafteter Überschuss zur trockenen Referenz an der Kontaktgruppe in g.',-1000,20000),
      frei_abstand_g:num('Vorzeichenbehafteter Überschuss zur trockenen Referenz in der freien Gruppe in g.',-1000,20000),
      ziel_kontakt_g:grams('Eigener zulässiger Beobachtungsrest für die Kontaktgruppe.'),ziel_frei_g:grams('Eigener zulässiger Beobachtungsrest für die freie Gruppe.'),
      messspanne_g:grams('Kombinierte Unsicherheit je Restwert.')},
    ({proben_zugeordnet,kontakt_abstand_g,frei_abstand_g,ziel_kontakt_g,ziel_frei_g,messspanne_g})=>{
      const reasons=[['kontakt',kontakt_abstand_g-ziel_kontakt_g],['frei',frei_abstand_g-ziel_frei_g]];
      return {klar_nicht_am_ziel:proben_zugeordnet?reasons.filter(([,delta])=>delta>messspanne_g).map(([name])=>name):[],
        grenzbereich:proben_zugeordnet?reasons.filter(([,delta])=>Math.abs(delta)<=messspanne_g).map(([name])=>name):[],
        aufzeichnung:proben_zugeordnet?'gruppen_jeweils_beurteilt':'probenreferenzen_klaeren',
        grenze:'Werte je Gruppe abgleichen. Eine trockene Gruppe gleicht Restfeuchte anderswo nicht aus.'};
    },{proben_zugeordnet:true,kontakt_abstand_g:7,frei_abstand_g:23,ziel_kontakt_g:5,ziel_frei_g:10,messspanne_g:3},
    {klar_nicht_am_ziel:['frei'],grenzbereich:['kontakt'],aufzeichnung:'gruppen_jeweils_beurteilt'}),

  tool('heizwaesche_fertige_teile_aus_massenspur_entfernen',
    'Eine Massenkurve um vollständig entnommene Teile berichtigen — Correct apparent mass loss when some finished pieces were removed during heated-rack weighing.',rack,
    {gleiche_waage_und_teile:yes('Sind Behälter, alle entnommenen Teile und die beiden Wägungen lückenlos zugeordnet?'),
      anfang_g:grams('Netto-Gesamtmasse vor der Beobachtungsphase.'),ende_rest_g:grams('Netto-Gesamtmasse der auf dem Ständer verbliebenen Textilien am Ende.'),
      entnommen_g:grams('Zeitgleich bei der tatsächlichen Entnahme gewogene Netto-Masse aller entfernten Textilien.')},
    ({gleiche_waage_und_teile,anfang_g,ende_rest_g,entnommen_g})=>{
      const delta=anfang_g-ende_rest_g-entnommen_g;
      return {massenverlust_korrigiert_g:gleiche_waage_und_teile?round(delta):null,entnahmeanteil_g:entnommen_g,
        pruefung:!gleiche_waage_und_teile?'waegungen_neu_zuordnen':delta<0?'zunahme_oder_bilanzluecke_pruefen':'verlust_bis_eigenem_messende',
        grenze:'Für entnommene Stücke endet die Bilanz bei ihrer Entnahme. Die Änderung der Gesamtmasse ist keine Messung der Raumfeuchte.'};
    },{gleiche_waage_und_teile:true,anfang_g:2800,ende_rest_g:1370,entnommen_g:1100},
    {massenverlust_korrigiert_g:330,entnahmeanteil_g:1100,pruefung:'verlust_bis_eigenem_messende'}),

  tool('heizwaesche_massenplateau_vor_wirklichem_ziel',
    'Zwei ruhige Messintervalle von einem belegten trockenen Endzustand unterscheiden — Detect a measured drying plateau while still above the target mass.',rack,
    {gleiche_ladung:yes('Wurden Ladung, Waage und Umgebung der drei aufeinanderfolgenden Messpunkte nicht verändert?'),
      ziel_g:grams('Bereits gemessene Zielmasse der gleichen Ladung.'),a_g:grams('Masse am ersten Messpunkt.'),b_g:grams('Masse am zweiten Messpunkt.'),c_g:grams('Masse am dritten Messpunkt.'),
      spannweite_g:grams('Kombinierte Unsicherheit für Differenzen.')},
    ({gleiche_ladung,ziel_g,a_g,b_g,c_g,spannweite_g})=>{
      const stable=Math.abs(a_g-b_g)<=spannweite_g&&Math.abs(b_g-c_g)<=spannweite_g;
      return {stabile_folge:gleiche_ladung?stable:null,
        ziel_offen_trotz_plateau:gleiche_ladung?stable&&c_g-ziel_g>spannweite_g:null,
        unterschied_zum_ziel_g:gleiche_ladung?round(c_g-ziel_g):null,
        grenze:'Zwei geringe Änderungen zeigen nur diese Messfolge. Bedingungen und die noch feuchtesten Stellen überprüfen.'};
    },{gleiche_ladung:true,ziel_g:1040,a_g:1130,b_g:1128,c_g:1127,spannweite_g:5},
    {stabile_folge:true,ziel_offen_trotz_plateau:true,unterschied_zum_ziel_g:87}),

  tool('heizwaesche_reststand_neu_aufgelegt_nach_ruhezustand',
    'Beim Wiederauslegen derselben Stücke eine beobachtete Massenzunahme nach Ruhe separat festhalten — Flag observable rebound after reorganizing checked textiles.',laundry,
    {waegung_vergleichbar:yes('Sind dieselben Stücke ohne Zufuhr fremder Teile im gleichen Messaufbau zugeordnet?'),
      abgelegt_g:grams('Netto-Masse unmittelbar vor dem Ablegen.'),neu_ausgelegt_g:grams('Netto-Masse derselben Stücke nach der Ruhephase.'),
      messspanne_g:grams('Kombinierte Unsicherheit beider Wägungen.'),sichtbefund:pick('Beobachtung an den zwischenzeitlich verdeckten Stellen.','auffaellig','unauffaellig','nicht_geprueft')},
    ({waegung_vergleichbar,abgelegt_g,neu_ausgelegt_g,messspanne_g,sichtbefund})=>{
      const delta=neu_ausgelegt_g-abgelegt_g;
      return {zunahme_ueber_messspanne:waegung_vergleichbar?delta>messspanne_g:null,
        nachkontrolle:!waegung_vergleichbar?'waegung_klaeren':delta>messspanne_g||sichtbefund==='auffaellig'?'offenen_zustand_abklaeren':sichtbefund==='nicht_geprueft'?'verdeckte_stellen_pruefen':'kein_hinweis_in_dieser_probe',
        grenze:'Keine Herkunft der Mehrmasse oder Aussage zur Lagerfähigkeit ableiten.'};
    },{waegung_vergleichbar:true,abgelegt_g:890,neu_ausgelegt_g:906,messspanne_g:6,sichtbefund:'nicht_geprueft'},
    {zunahme_ueber_messspanne:true,nachkontrolle:'offenen_zustand_abklaeren'}),

  tool('heizwaesche_positionsreihe_abstand_einflussgrenze',
    'Prüfen, welche Vergleichspaare den Abstand von Textilien tatsächlich isolieren — Separate a spacing comparison from trials with altered load or ventilation.',rack,
    {a_nur_abstand:yes('Wurde beim ersten Vergleichspaar ausschließlich der innerhalb der Anleitung zulässige Abstand verändert?'),
      b_nur_abstand:yes('Wurde beim zweiten Vergleichspaar ausschließlich der Abstand verändert?'),
      a_rest_eng_g:grams('Beobachteter Restwert bei engerem Abstand im ersten Paar.'),a_rest_weit_g:grams('Beobachteter Restwert bei weiterem Abstand im ersten Paar.'),
      b_rest_eng_g:grams('Beobachteter Restwert bei engerem Abstand im zweiten Paar.'),b_rest_weit_g:grams('Beobachteter Restwert bei weiterem Abstand im zweiten Paar.')},
    ({a_nur_abstand,b_nur_abstand,a_rest_eng_g,a_rest_weit_g,b_rest_eng_g,b_rest_weit_g})=>({
      restdifferenz_eng_minus_weit_g:[a_nur_abstand?round(a_rest_eng_g-a_rest_weit_g):null,b_nur_abstand?round(b_rest_eng_g-b_rest_weit_g):null],
      beide_einzeln_vergleichbar:a_nur_abstand&&b_nur_abstand,
      grenze:'Gleicher Messzeitpunkt, vergleichbare Ladung und wiederholter Messaufbau vorausgesetzt. Keine pauschale Wirkung oder zulässigen Mindestabstände ableiten.'
    }),{a_nur_abstand:true,b_nur_abstand:false,a_rest_eng_g:190,a_rest_weit_g:160,b_rest_eng_g:130,b_rest_weit_g:100},
    {restdifferenz_eng_minus_weit_g:[30,null],beide_einzeln_vergleichbar:false}),

  tool('heizwaesche_endpunkt_zwischen_zwei_stichproben',
    'Den tatsächlichen Zielzeitpunkt zwischen belegten Nass- und Trockenbeobachtungen eingrenzen — Find the bounded window in which a verified textile target was first observed.',rack,
    {miteinander_vergleichbar:yes('Waren die zuverlässig zugeordneten Stichproben ohne zwischenzeitliche Neunutzung derselben Ladung vergleichbar?'),
      letzter_negativ_min:mins('Tagesminute der letzten Probe, die das Trockenziel klar verfehlte.'),
      erste_passend_min:mins('Tagesminute der ersten nachfolgenden Probe, die das Ziel tatsächlich bestätigte.'),
      schaltzeit_min:mins('Tatsächlich beobachtete Abschaltzeit in derselben Tagesachse.')},
    ({miteinander_vergleichbar,letzter_negativ_min,erste_passend_min,schaltzeit_min})=>{
      if(letzter_negativ_min>=erste_passend_min) throw new RangeError('Endpunktgrenzen');
      return {endpunkt_intervall_min:miteinander_vergleichbar?[letzter_negativ_min,erste_passend_min]:null,
        abschaltzeit_lage:!miteinander_vergleichbar?'nicht_zuordenbar':schaltzeit_min<=letzter_negativ_min?'vor_bestaetigtem_endpunkt':schaltzeit_min>=erste_passend_min?'bei_oder_nach_bestaetigung':'innerhalb_offenem_zeitraum',
        grenze:'Die linke Grenze war noch negativ, die rechte erstmals bestätigt. Der genaue Zeitpunkt dazwischen ist unbekannt.'};
    },{miteinander_vergleichbar:true,letzter_negativ_min:780,erste_passend_min:820,schaltzeit_min:805},
    {endpunkt_intervall_min:[780,820],abschaltzeit_lage:'innerhalb_offenem_zeitraum'}),

  tool('heizwaesche_untersuchte_flaechenproben_minimum',
    'Zeitgleich geprüfte Teile und ungeprüfte Positionen nach Ständerzone trennen — Check whether observed zone coverage is sufficient for a load-wide conclusion.',rack,
    {teile_lueckenlos_zugeordnet:yes('Sind alle vorhandenen Positionen und untersuchten Stücke eindeutig zugeordnet?'),
      oben_gesamt:count('Stücke in der oberen betrachteten Lage.'),oben_bestaetigt:count('Davon wirklich und sicher am Ziel bestätigte Stücke.'),
      unten_gesamt:count('Stücke in der unteren betrachteten Lage.'),unten_bestaetigt:count('Davon wirklich und sicher am Ziel bestätigte Stücke.')},
    ({teile_lueckenlos_zugeordnet,oben_gesamt,oben_bestaetigt,unten_gesamt,unten_bestaetigt})=>{
      whole(oben_gesamt,oben_bestaetigt,unten_gesamt,unten_bestaetigt);
      if(oben_bestaetigt>oben_gesamt||unten_bestaetigt>unten_gesamt) throw new RangeError('Bestätigte Teilmengen');
      const unchecked=[oben_gesamt-oben_bestaetigt,unten_gesamt-unten_bestaetigt];
      return {ohne_zielbestaetigung_oben_unten:teile_lueckenlos_zugeordnet?unchecked:null,
        beobachtungsprioritaet:!teile_lueckenlos_zugeordnet?'zuordnen':unchecked[0]===unchecked[1]?'beide_lagen_vergleichen':unchecked[0]>unchecked[1]?'oben':'unten',
        grenze:'Offen umfasst ungeprüfte und nicht bestätigte Stücke. Priorisiert die nächste Sichtung, nicht eine modellierte Trockenwirkung.'};
    },{teile_lueckenlos_zugeordnet:true,oben_gesamt:6,oben_bestaetigt:5,unten_gesamt:8,unten_bestaetigt:3},
    {ohne_zielbestaetigung_oben_unten:[1,5],beobachtungsprioritaet:'unten'}),

  tool('heizwaesche_zeitgleiche_ladetiefen_teilvergleich',
    'Einen geänderten Beladungsversuch nur über die in beiden Runden gleich bestückten Bereiche vergleichen — Keep regrouped pieces out of a matched heated-rack trial.',comparison,
    {zeit_und_start_belegt:yes('Sind Startzustand und Messzeitpunkt vergleichbar?'),
      gleich_belegte_zonen:count('Eindeutig gleiche Stoffe an derselben Stelle oder messbar gleichen Lage.'),
      veraenderte_zonen:count('Separat erfasste neu oder anders belegte Zonen.'),
      gleiche_zonen_a_g:grams('Summe der Restmassen ausschließlich in gleich belegten Zonen in Versuch A.'),
      gleiche_zonen_b_g:grams('Summe derselben Art in Versuch B.')},
    ({zeit_und_start_belegt,gleich_belegte_zonen,veraenderte_zonen,gleiche_zonen_a_g,gleiche_zonen_b_g})=>{
      whole(gleich_belegte_zonen,veraenderte_zonen);
      return {teilvergleich_b_minus_a_g:zeit_und_start_belegt&&gleich_belegte_zonen?round(gleiche_zonen_b_g-gleiche_zonen_a_g):null,
        aus_teilvergleich_ausgenommen:veraenderte_zonen,grenze:'Teilvergleich gilt nur für die gleich belegten Zonen. Er belegt weder einen Gesamteffekt noch unabhängige Zonenwirkung.'};
    },{zeit_und_start_belegt:true,gleich_belegte_zonen:4,veraenderte_zonen:2,gleiche_zonen_a_g:125,gleiche_zonen_b_g:112},
    {teilvergleich_b_minus_a_g:-13,aus_teilvergleich_ausgenommen:2}),

  tool('heizwaesche_relative_und_absolute_richtung',
    'Sinkende relative Feuchte bei zunehmender absoluter Feuchte als unterschiedliche Beobachtung einordnen — Interpret opposing humidity changes during a drying trial.',rack,
    {gleicher_messort:yes('Sind Zeitachse, Messort und Berechnungsgrundlage an beiden Punkten vergleichbar?'),
      rh_vor:humidity('Relative Feuchte vor der Phase in %.'),rh_nach:humidity('Relative Feuchte nach der Phase in %.'),
      abs_vor:num('Aus Messwerten ermittelte absolute Feuchte vorher in g/m³.',0,40),abs_nach:num('Absolute Feuchte nachher in g/m³.',0,40),
      rh_spanne:num('Gemeinsame Unsicherheit in Prozentpunkten.',0,100),abs_spanne:num('Gemeinsame Unsicherheit der absoluten Werte in g/m³.',0,40)},
    ({gleicher_messort,rh_vor,rh_nach,abs_vor,abs_nach,rh_spanne,abs_spanne})=>{
      const percent=rh_nach-rh_vor, water=abs_nach-abs_vor;
      return {aenderung_rh_und_absolute_feuchte:gleicher_messort?[round(percent),round(water)]:null,
        gegenlaeufig_belegt:gleicher_messort?(percent<-rh_spanne&&water>abs_spanne||percent>rh_spanne&&water<-abs_spanne):null,
        grenze:'Änderungen am Messpunkt. Relative Feuchte hängt von der Temperatur ab und weist allein keine Wasserabfuhr nach.'};
    },{gleicher_messort:true,rh_vor:63,rh_nach:55,abs_vor:10.1,abs_nach:11.5,rh_spanne:2,abs_spanne:0.4},
    {aenderung_rh_und_absolute_feuchte:[-8,1.4],gegenlaeufig_belegt:true}),

  tool('heizwaesche_lueftungsphase_stabile_waage_gegenprobe',
    'Beim Beobachten einer Lüftungsphase Wäschegewicht und Gehalt der Raumluft getrennt lesen — Recognize air dry-down without a resolved textile mass change.',rack,
    {gekoppelte_messphase:yes('Gehören Beginn und Ende der Wägung und des repräsentativen Luftmesspunkts zum selben Lüftungsfenster?'),
      textil_a_g:grams('Textilmasse zu Beginn.'),textil_b_g:grams('Textilmasse am Ende.'),waage_spanne_g:grams('Gemeinsame Unsicherheit der Textilwägungen.'),
      luft_abnahme:num('Beobachtete positive Abnahme der absoluten Feuchte in g/m³; bei Anstieg negativen Wert eintragen.',-40,40),luft_spanne:num('Gemeinsame Unsicherheit in g/m³.',0,40)},
    ({gekoppelte_messphase,textil_a_g,textil_b_g,waage_spanne_g,luft_abnahme,luft_spanne})=>{
      const cloth=textil_a_g-textil_b_g;
      return {textilabnahme_g:gekoppelte_messphase?round(cloth):null,
        luftabnahme_ohne_aufgeloesten_textilverlust:gekoppelte_messphase?luft_abnahme>luft_spanne&&Math.abs(cloth)<=waage_spanne_g:null,
        grenze:'Die beiden Messgrößen müssen sich nicht gleich bewegen. Lüftung, Materialien und andere Feuchtequellen bleiben eigenständige Einflüsse.'};
    },{gekoppelte_messphase:true,textil_a_g:1610,textil_b_g:1604,waage_spanne_g:9,luft_abnahme:1.8,luft_spanne:0.4},
    {textilabnahme_g:6,luftabnahme_ohne_aufgeloesten_textilverlust:true}),

  tool('heizwaesche_luftprobe_waermequelle_zeitfenster',
    'Feuchtemessphasen mit getrennt und gemeinsam laufenden Hilfen im Protokoll unterscheiden — Find a stand-alone observation window inside a paired-use drying log.',rack,
    {zeitachsen_bestaetigt:yes('Sind Rack, zweites Gerät und Luftmessung auf derselben Tagesachse protokolliert?'),
      rack_start:mins('Erste Tagesminute des beobachteten Ständerbetriebs.'),rack_ende:mins('Erste Tagesminute nach dem Ständerbetrieb.'),
      hilfe_start:mins('Erste Tagesminute des Hilfsbetriebs.'),hilfe_ende:mins('Erste Tagesminute nach dem Hilfsbetrieb.'),
      zusammenhaengend_min:mins('Eigene erforderliche Mindestdauer eines einzelnen nicht überlappenden Rack-Messblocks.')},
    ({zeitachsen_bestaetigt,rack_start,rack_ende,hilfe_start,hilfe_ende,zusammenhaengend_min})=>{
      if(rack_start>=rack_ende||hilfe_start>=hilfe_ende||!zusammenhaengend_min) throw new RangeError('Betriebsintervalle');
      const alone=[[rack_start,Math.min(rack_ende,hilfe_start)],[Math.max(rack_start,hilfe_ende),rack_ende]].filter(([a,b])=>b-a>=zusammenhaengend_min);
      return {eigene_messbloecke:zeitachsen_bestaetigt?alone:[],
        ueberlappung_min:zeitachsen_bestaetigt?round(Math.max(0,Math.min(rack_ende,hilfe_ende)-Math.max(rack_start,hilfe_start))):null,
        grenze:'Nur Zeitabgleich. Ein getrenntes Fenster allein isoliert keinen Effekt, weil Raum und Wäsche ihre Vorgeschichte behalten.'};
    },{zeitachsen_bestaetigt:true,rack_start:420,rack_ende:540,hilfe_start:445,hilfe_ende:500,zusammenhaengend_min:30},
    {eigene_messbloecke:[[500,540]],ueberlappung_min:55}),

  tool('heizwaesche_luftvolumen_massendifferenz_ohne_zutritt',
    'In einer Trocknungsprobe gemessenen Wasserrückgang, Auffangmenge und mögliche Luftspeicherung getrennt bilanzieren — Reconcile measured transfers without attributing an unresolved moisture remainder.',rack,
    {gemeinsame_grenze:yes('Sind gleiches Zeitfenster und Bilanzgrenzen belegt, ohne doppelte Zuordnung von Auffangwasser?'),
      textilverlust_g:grams('Gemessener Netto-Massenverlust derselben Textilmenge.'),aufgefangen_g:grams('Im Fenster netto gemessenes Auffangwasser.'),
      luftvolumen_m3:num('Beobachtetes Raumvolumen in m³.',1,1000),absolut_delta:num('Repräsentative Änderung absoluter Feuchte in g/m³, mit Vorzeichen.',-40,40)},
    ({gemeinsame_grenze,textilverlust_g,aufgefangen_g,luftvolumen_m3,absolut_delta})=>{
      const air=luftvolumen_m3*absolut_delta;
      return {idealisierte_aenderung_luft_g:gemeinsame_grenze?round(air):null,
        bilanzrest_ohne_zuordnung_g:gemeinsame_grenze?round(textilverlust_g-aufgefangen_g-air):null,
        grenze:'Der Rest umfasst auch Luftaustausch, Materialaustausch, andere Quellen und Messfehler. Das Luftmodell beschreibt keinen erlaubten Wäschevorrat.'};
    },{gemeinsame_grenze:true,textilverlust_g:620,aufgefangen_g:400,luftvolumen_m3:30,absolut_delta:2},
    {idealisierte_aenderung_luft_g:60,bilanzrest_ohne_zuordnung_g:160}),

  tool('heizwaesche_spaete_kondensatbeobachtung_vorbefund',
    'Nasse Flächen nach dem Wäscheständerlauf zeitlich zum dokumentierten Vorbefund abgrenzen — Distinguish a pre-existing wet surface from newly observed wetness.',rack,
    {gleiche_oberflaeche:yes('Wurde dieselbe markierte Stelle in allen Phasen geprüft?'),
      vor_betrieb:pick('Vor dem Lauf.','nass','trocken','unbekannt'),bis_ende:pick('Beim beobachteten Betriebsende.','nass','trocken','unbekannt'),
      spaet:pick('Bei der späteren Nachkontrolle.','nass','trocken','unbekannt')},
    ({gleiche_oberflaeche,vor_betrieb,bis_ende,spaet})=>({
      beweisgrenze:!gleiche_oberflaeche?'oberflaeche_erst_zuordnen':vor_betrieb==='nass'?'naesse_bereits_vorher':vor_betrieb==='unbekannt'?'vorbefund_fehlt':bis_ende==='nass'?'bis_betriebsende_gesehen':
        spaet==='nass'&&bis_ende==='trocken'?'erst_in_nachkontrolle_gesehen':spaet==='nass'?'zeitpunkt_offen':'keine_neue_naesse_belegt',
      grenze:'Sichtbare Nässe zeigt weder ihre Quelle noch ein zulässiges Raumklima. Bei wiederkehrender Nässe Ursache und kalte Flächen prüfen.'}
    ),{gleiche_oberflaeche:true,vor_betrieb:'trocken',bis_ende:'trocken',spaet:'nass'},
    {beweisgrenze:'erst_in_nachkontrolle_gesehen'}),

  tool('heizwaesche_nahmessung_gegen_lufttrend_fern',
    'Widersprüchliche Veränderungen nah am Ständer und am freien Raum-Messpunkt erkennen — Identify unresolved spatial moisture patterns instead of generalizing a local reading.',measure,
    {zeitlich_gepaart:yes('Sind beide Orte dokumentiert und ihre Änderungen aus exakt denselben Zeitpunkten abgeleitet?'),
      nahe_delta:num('Änderung absoluter Feuchte nahe am Rack in g/m³.',-40,40),frei_delta:num('Änderung absoluter Feuchte am freien Raumpunkt in g/m³.',-40,40),
      nahe_unsicherheit:num('Unsicherheit der nahen Änderung.',0,40),frei_unsicherheit:num('Unsicherheit der freien Änderung.',0,40)},
    ({zeitlich_gepaart,nahe_delta,frei_delta,nahe_unsicherheit,frei_unsicherheit})=>{
      const opposite=nahe_delta>nahe_unsicherheit&&frei_delta<-frei_unsicherheit||nahe_delta<-nahe_unsicherheit&&frei_delta>frei_unsicherheit;
      return {ortsveraenderungen_g_m3:zeitlich_gepaart?[nahe_delta,frei_delta]:null,
        raumwert_verallgemeinern:zeitlich_gepaart?(opposite?'nein_gegenlaeufige_trends':'weiterhin_nur_zwei_orte'):'zeitmarken_klaeren',
        grenze:'Ergibt keine Aussage zum gesamten Raum oder zur Ursache. Messeinflüsse durch Wärme, Fenster und Lage beachten.'};
    },{zeitlich_gepaart:true,nahe_delta:1.1,frei_delta:-0.7,nahe_unsicherheit:0.3,frei_unsicherheit:0.4},
    {ortsveraenderungen_g_m3:[1.1,-0.7],raumwert_verallgemeinern:'nein_gegenlaeufige_trends'}),

  tool('heizwaesche_protokoll_trockenraum_hintergrund_vergleich',
    'Die Feuchteänderung bei Trocknung neben den Verlauf eines dokumentierten Fensters ohne Wäsche stellen — Compare rack observations with a matched empty-room baseline.',rack,
    {vergleichbarer_raum:yes('Sind Raumaufteilung, Lüftung, übrige Feuchtequellen und Länge beider Stillstands- und Nutzungsfenster vergleichbar?'),
      mit_waesche_delta:num('Änderung absoluter Feuchte mit Wäsche in g/m³.',-40,40),ohne_waesche_delta:num('Änderung absoluter Feuchte im dokumentierten Fenster ohne Wäsche in g/m³.',-40,40),
      unsicherheit:num('Gemeinsame Unsicherheit der Differenz in g/m³.',0,40)},
    ({vergleichbarer_raum,mit_waesche_delta,ohne_waesche_delta,unsicherheit})=>{
      const delta=mit_waesche_delta-ohne_waesche_delta;
      return {aenderungen_nebeneinander:vergleichbarer_raum?[mit_waesche_delta,ohne_waesche_delta]:null,
        differenz_absolut_g_m3:vergleichbarer_raum?round(delta):null,
        ausserhalb_messspanne:vergleichbarer_raum?Math.abs(delta)>unsicherheit:null,
        grenze:'Vergleich zweier beobachteter Fenster. Ein Unterschied beweist weder eine Einzelursache noch einen vollständig gemischten Raum.'};
    },{vergleichbarer_raum:true,mit_waesche_delta:1.8,ohne_waesche_delta:0.7,unsicherheit:0.5},
    {aenderungen_nebeneinander:[1.8,0.7],differenz_absolut_g_m3:1.1,ausserhalb_messspanne:true}),

  tool('heizwaesche_hilfsentfeuchter_stop_weiteres_abtrocknen',
    'Gewichtsverlust und gemessene Feuchte direkt nach dem Ende des Hilfsbetriebs getrennt erfassen — Determine whether measured textiles kept losing mass after an auxiliary device stopped.',rack,
    {zeitlich_zugeordnet:yes('Sind die Messpunkte rund um das tatsächliche Ende des Hilfsbetriebs ohne andere Änderungen zugeordnet?'),
      masse_am_stopp:grams('Textilmasse beim Hilfsgeräte-Stopp.'),masse_spaeter:grams('Textilmasse bei der ersten Nachkontrolle.'),waegeunsicherheit:grams('Kombinierte Messunsicherheit in g.'),
      luft_delta:num('Änderung der absoluten Feuchte an derselben Raumstelle.',-40,40),luft_unsicherheit:num('Kombinierte Unsicherheit der Änderung.',0,40)},
    ({zeitlich_zugeordnet,masse_am_stopp,masse_spaeter,waegeunsicherheit,luft_delta,luft_unsicherheit})=>({
      phase_nach_stopp:!zeitlich_zugeordnet?'messfenster_offen':masse_am_stopp-masse_spaeter>waegeunsicherheit&&luft_delta>luft_unsicherheit?'textilverlust_und_luftzunahme':
        masse_am_stopp-masse_spaeter>waegeunsicherheit?'textilverlust_luftzunahme_nicht_belegt':'textilverlust_nicht_aufgeloest',
      grenze:'Zeitliche Beobachtung, keine Ursache oder Nettoabfuhr ableiten. Luftbewegung und andere Quellen können beitragen.'}
    ),{zeitlich_zugeordnet:true,masse_am_stopp:1680,masse_spaeter:1580,waegeunsicherheit:10,luft_delta:1.2,luft_unsicherheit:0.5},
    {phase_nach_stopp:'textilverlust_und_luftzunahme'}),

  tool('heizwaesche_luftprobe_zeitpunkt_einem_abschnitt_zuordnen',
    'Eine nachträglich notierte Raummessung bei begrenzter Uhrzeitunsicherheit richtig einer Rack-Phase zuordnen — Check whether a moisture reading could straddle a phase boundary.',measure,
    {uhr_gemeinsam:yes('Sind Phasen und Messzeit auf derselben Uhrzeitskala dokumentiert?'),
      phase_ab:mins('Wirklicher Beginn der beobachteten Phase (inklusive).'),phase_bis:mins('Erste Minute außerhalb dieser Phase.'),
      geschaetzt_min:mins('Geschätzte Uhrzeit der Messung.'),plus_minus:mins('Maximale Abweichung dieser Uhrzeit in Minuten.')},
    ({uhr_gemeinsam,phase_ab,phase_bis,geschaetzt_min,plus_minus})=>{
      if(phase_ab>=phase_bis||geschaetzt_min-plus_minus<0||geschaetzt_min+plus_minus>1440) throw new RangeError('Zeitfenster');
      const early=geschaetzt_min-plus_minus, late=geschaetzt_min+plus_minus;
      return {messzeit_moeglicher_bereich:uhr_gemeinsam?[early,late]:null,
        phase:!uhr_gemeinsam?'zeitabgleich_fehlt':early>=phase_ab&&late<phase_bis?'innerhalb':late<phase_ab||early>=phase_bis?'ausserhalb':'kann_phasengrenze_ueberschreiten',
        grenze:'Nur Zeitzuordnung der Messung. Kurze Ablesedauer beweist keine mittlere Raumfeuchte.'};
    },{uhr_gemeinsam:true,phase_ab:360,phase_bis:480,geschaetzt_min:474,plus_minus:8},
    {messzeit_moeglicher_bereich:[466,482],phase:'kann_phasengrenze_ueberschreiten'}),

  tool('heizwaesche_hochpunkt_ruhe_nach_entnahme',
    'Vor und nach einer vollständigen Wäscheentnahme einen beobachteten Feuchtehöchstwert gegen dieselbe Ausgangsmessung stellen — Retain a delayed peak after all textiles have left the room.',rack,
    {randbedingungen_zwischendurch_belegt:yes('Betreffen beide Höchstwerte dieselbe Zeitreihe ohne bekannte neue Feuchtequelle?'),
      ausgang:num('Absolute Feuchte vor dem Versuch in g/m³.',0,40),max_vor:num('Beobachteter Höchstwert bis unmittelbar vor Textilentnahme.',0,40),
      max_nach:num('Beobachteter Höchstwert im zugeordneten Nachlauf nach vollständiger Entnahme.',0,40),
      differenz_spanne:num('Unsicherheit des Vergleichs der Spitzen.',0,40)},
    ({randbedingungen_zwischendurch_belegt,ausgang,max_vor,max_nach,differenz_spanne})=>({
      spitzendifferenz_zum_start:randbedingungen_zwischendurch_belegt?[round(max_vor-ausgang),round(max_nach-ausgang)]:null,
      spaeter_hoechststand_deutlich:randbedingungen_zwischendurch_belegt?max_nach-max_vor>differenz_spanne:null,
      grenze:'Zwei Höchststände der Messreihe. Ein späterer Anstieg weist weder ein Versäumnis noch die Herkunft des Wassers nach.'}
    ),{randbedingungen_zwischendurch_belegt:true,ausgang:9.5,max_vor:11.2,max_nach:12.1,differenz_spanne:0.4},
    {spitzendifferenz_zum_start:[1.7,2.6],spaeter_hoechststand_deutlich:true}),

  tool('heizwaesche_verbrauch_am_trockenziel_eingrenzen',
    'Strom am unbekannten Trocknungsziel zwischen zwei dokumentierten Zählerständen eingrenzen — Bound energy at a verified drying endpoint without interpolating it.',power,
    {derselbe_umfang:yes('Umfassen beide Ablesungen denselben Zähler und alle betrachteten Geräte seit Versuchsbeginn?'),
      zuletzt_noch_feucht_kwh:kwh('Kumuliert beim letzten eindeutig noch nicht erreichten Ziel.'),zuerst_trocken_kwh:kwh('Kumuliert bei der ersten eindeutigen Trockenzielbestätigung.'),
      kostenbudget_kwh:kwh('Selbst gewählter Arbeitsgrenzwert in kWh, ohne Betriebsfreigabe.')},
    ({derselbe_umfang,zuletzt_noch_feucht_kwh,zuerst_trocken_kwh,kostenbudget_kwh})=>{
      if(zuletzt_noch_feucht_kwh>zuerst_trocken_kwh) throw new RangeError('Kumulative Messwerte');
      return {beobachtungsband_kwh:derselbe_umfang?[zuletzt_noch_feucht_kwh,zuerst_trocken_kwh]:null,
        budget_gegen_band:!derselbe_umfang?'zaehlergrenze_klaeren':kostenbudget_kwh<zuletzt_noch_feucht_kwh?'bereits_vor_ziel_ueberschritten':kostenbudget_kwh>=zuerst_trocken_kwh?'innerhalb_band':'zeitpunkt_des_ziels_unbekannt',
        grenze:'Keine gleichmäßige Leistung voraussetzen. Stundenwerte und ungemessene Hilfen sind nicht durch diesen Bereich ersetzt.'};
    },{derselbe_umfang:true,zuletzt_noch_feucht_kwh:0.7,zuerst_trocken_kwh:0.95,kostenbudget_kwh:0.8},
    {beobachtungsband_kwh:[0.7,0.95],budget_gegen_band:'zeitpunkt_des_ziels_unbekannt'}),

  tool('heizwaesche_teilprotokoll_zusatzgeraet_subtraktion',
    'Bei gemeinsamer Messung die nicht getrennt erfasste Hilfsphase offen lassen — Recover only the provably attributable share of a mixed-device drying meter log.',power,
    {zaehler_und_geraete_belegt:yes('Ist belegt, dass nur die beiden genannten Geräte im Gesamtzähler erfasst wurden?'),
      gesamt_kwh:kwh('Gemessene Summe der beiden Geräte über das ganze Fenster.'),rack_sicher_kwh:kwh('Direkt und separat belegter Teil der Rack-Energie.'),hilfe_sicher_kwh:kwh('Direkt und separat belegter Teil der Hilfsenergie.')},
    ({zaehler_und_geraete_belegt,gesamt_kwh,rack_sicher_kwh,hilfe_sicher_kwh})=>{
      const rest=gesamt_kwh-rack_sicher_kwh-hilfe_sicher_kwh;
      if(rest< -1e-9) throw new RangeError('Gemessene Teilwerte übersteigen Summe');
      return {nicht_zurechenbar_kwh:zaehler_und_geraete_belegt?round(Math.max(0,rest)):null,
        rack_grenzen_kwh:zaehler_und_geraete_belegt?[rack_sicher_kwh,round(gesamt_kwh-hilfe_sicher_kwh)]:null,
        grenze:'Ungemessene Verteilung bleibt unbekannt. Ein Gesamtstromvergleich erfordert außerdem die gleiche tatsächlich erreichte Trocknung.'};
    },{zaehler_und_geraete_belegt:true,gesamt_kwh:1.42,rack_sicher_kwh:0.57,hilfe_sicher_kwh:0.48},
    {nicht_zurechenbar_kwh:0.37,rack_grenzen_kwh:[0.57,0.94]}),

  tool('heizwaesche_hilfe_zeitgewinn_mehrstrom_budget',
    'Einen belegten Zeitgewinn mit separat erfasstem Mehrstrom je gewünschter Zeiteinheit vergleichen — Evaluate an observed time saving against a household marginal energy budget.',rack,
    {gleicher_endzustand:yes('Sind Trockenmasse, Startfeuchte und tatsächlich kontrollierter Endzustand vergleichbar, und ist der Strom aller beteiligten Geräte erfasst?'),
      ohne_min:mins('Gemessene Dauer ohne zusätzliche Hilfe.'),mit_min:mins('Gemessene Dauer mit zusätzlicher Hilfe.'),
      ohne_kwh:kwh('Gesamtenergie ohne Hilfe.'),mit_kwh:kwh('Gesamtenergie einschließlich Hilfe.'),
      grenzwert_kwh_je_stunde:num('Eigene Grenze zusätzlichen Stroms je beobachteter gesparter Stunde.',0,40)},
    ({gleicher_endzustand,ohne_min,mit_min,ohne_kwh,mit_kwh,grenzwert_kwh_je_stunde})=>{
      if(!ohne_min||!mit_min) throw new RangeError('Beobachtete Durchgangsdauer');
      const saved=ohne_min-mit_min, extra=mit_kwh-ohne_kwh;
      const rate=saved>0?60*extra/saved:null;
      return {beobachteter_zeitgewinn_min:gleicher_endzustand?round(saved):null,
        zusaetzliche_kwh_je_gesparter_stunde:gleicher_endzustand&&rate!==null?round(rate):null,
        eigener_rahmen:!gleicher_endzustand?'durchgaenge_nicht_vergleichbar':rate===null?'keine_positive_zeitersparnis':rate<=grenzwert_kwh_je_stunde?'im_selbst_gewaehlten_rahmen':'ueber_selbst_gewaehltem_rahmen',
        grenze:'Bewertet zwei beobachtete Durchgänge. Kein Preis, keine Prognose und keine Empfehlung für Parallelbetrieb.'};
    },{gleicher_endzustand:true,ohne_min:295,mit_min:235,ohne_kwh:0.95,mit_kwh:1.25,grenzwert_kwh_je_stunde:0.25},
    {beobachteter_zeitgewinn_min:60,zusaetzliche_kwh_je_gesparter_stunde:0.3,eigener_rahmen:'ueber_selbst_gewaehltem_rahmen'}),

  tool('heizwaesche_messung_tara_vor_und_nach_wechsel',
    'Bei neuem Wiegekorb ein gemeinsam beobachtetes Zwischengewicht als Brücke verwenden — Reconcile two drying-log series through a same-mass anchor at a basket change.',laundry,
    {uebergabe_gleichzeitig:yes('Wurde dieselbe Netto-Masse am Übergang in beiden unveränderten Aufbauten direkt gewogen?'),
      alt_letzte_g:grams('Letzte Brutto-Wägung im alten Korb.'),neu_erste_g:grams('Zeitgleiche erste Brutto-Wägung im neuen Korb.'),
      spaeter_neu_g:grams('Spätere Brutto-Wägung im neuen Korb.'),vorher_alt_g:grams('Frühere Brutto-Wägung im alten Korb.')},
    ({uebergabe_gleichzeitig,alt_letzte_g,neu_erste_g,spaeter_neu_g,vorher_alt_g})=>({
      abnahme_vor_und_nach_g:uebergabe_gleichzeitig?[round(vorher_alt_g-alt_letzte_g),round(neu_erste_g-spaeter_neu_g)]:null,
      gesamtabnahme_g:uebergabe_gleichzeitig?round(vorher_alt_g-alt_letzte_g+neu_erste_g-spaeter_neu_g):null,
      grenze:'Waagen und jeweilige Körbe bleiben je Teilreihe gleich. Ohne zeitgleichen Anker bleibt die Änderung beim Umsetzen ungemessen.'}
    ),{uebergabe_gleichzeitig:true,alt_letzte_g:1830,neu_erste_g:1560,spaeter_neu_g:1400,vorher_alt_g:2020},
    {abnahme_vor_und_nach_g:[190,160],gesamtabnahme_g:350}),

  tool('heizwaesche_weitergabe_trockene_teilmasse_vorrang',
    'Bereits geprüfte Stücke nach einer eigenen Mengenpriorität entnehmen, ohne feuchte Gruppen rechnerisch gutzuschreiben — Determine if a verified dry subset meets a planned first delivery.',laundry,
    {zustand_und_zuordnung_belegt:yes('Sind alle Stückgruppen getrennt gewogen und zielgerecht kontrolliert?'),
      prioritaet_g:grams('Tatsächlich am Ziel bestätigte Masse der zuerst benötigten Gruppe.'),
      andere_fertig_g:grams('Weitere davon getrennte, am Ziel bestätigte Trockenmasse.'),
      prioritaet_min_g:grams('Eigener Mindestbedarf für die erste Übergabe.'),andere_darf_ausgleichen:yes('Sind andere trockene Stücke vom Zweck her als Ersatz bestätigt?')},
    ({zustand_und_zuordnung_belegt,prioritaet_g,andere_fertig_g,prioritaet_min_g,andere_darf_ausgleichen})=>{
      const replacement=andere_darf_ausgleichen?Math.min(Math.max(0,prioritaet_min_g-prioritaet_g),andere_fertig_g):0;
      return {trockener_ersatz_g:zustand_und_zuordnung_belegt?replacement:null,
        erste_uebergabe_offen_g:zustand_und_zuordnung_belegt?round(Math.max(0,prioritaet_min_g-prioritaet_g-replacement)):null,
        grenze:'Nur verifizierte trockene und wirklich austauschbare Stücke. Das Gewicht ersetzt die Stückzuordnung vor der Übergabe nicht.'};
    },{zustand_und_zuordnung_belegt:true,prioritaet_g:620,andere_fertig_g:300,prioritaet_min_g:950,andere_darf_ausgleichen:true},
    {trockener_ersatz_g:300,erste_uebergabe_offen_g:30}),

  tool('heizwaesche_raumbelegung_freiraum_und_messziel',
    'Geräumte Stellfläche und ein individuell gewähltes Messziel vor der nächsten Nutzung des Trocknungsraums getrennt prüfen — Distinguish physical room clearance from a documented humidity observation.',rack,
    {gemeinsamer_plan_belegt:yes('Sind der vereinbarte Messpunkt und die Anforderungen der nächsten Raumnutzung dokumentiert?'),
      naechster_beginn:mins('Tagesminute der nächsten geplanten Nutzung.'),stellzone_frei_ab:mins('Minute, ab der der nutzbare Platz tatsächlich freigeräumt wurde.'),
      letzte_messung_min:mins('Minute der tatsächlich berücksichtigten Raumbeobachtung.'),
      ziel_am_messpunkt_bestaetigt:yes('Wurde der vorab gewählte Vergleichswert an diesem Messpunkt erreicht?')},
    ({gemeinsamer_plan_belegt,naechster_beginn,stellzone_frei_ab,letzte_messung_min,ziel_am_messpunkt_bestaetigt})=>{
      const clear=stellzone_frei_ab<=naechster_beginn;
      const room=letzte_messung_min>=stellzone_frei_ab&&letzte_messung_min<=naechster_beginn&&ziel_am_messpunkt_bestaetigt;
      return {stellzone_rechtzeitig_frei:gemeinsamer_plan_belegt?clear:null,
        raumbeobachtung_nach_freiraeumen:gemeinsamer_plan_belegt?room:null,
        offene_vereinbarung:!gemeinsamer_plan_belegt?['plan']:[clear?null:'stellzone',room?null:'zeitgerechte_beobachtung'].filter(Boolean),
        grenze:'Nur Zeitpunkt und Ziel am gewählten Beobachtungspunkt, keine Bewertung der Sicherheit, Feuchteursache oder Eignung für sonstige Nutzungen.'};
    },{gemeinsamer_plan_belegt:true,naechster_beginn:850,stellzone_frei_ab:823,letzte_messung_min:810,ziel_am_messpunkt_bestaetigt:true},
    {stellzone_rechtzeitig_frei:true,raumbeobachtung_nach_freiraeumen:false,offene_vereinbarung:['zeitgerechte_beobachtung']}),

  tool('heizwaesche_zwei_trockenziele_veraenderter_endpunkt',
    'Bei Wechsel vom schnellen Zwischenziel zum gewünschten Endzustand bereits gemessene Energie getrennt halten — Separate a documented partial drying target from the final one.',comparison,
    {dieselbe_ladung:yes('Sind Zwischen- und Endwert am selben unveränderten Satz Textilien und derselben Stromgrenze belegt?'),
      zwischen_min:mins('Zeitpunkt der zuerst dokumentierten Zwischenstufe.'),ende_min:mins('Zeitpunkt der dokumentierten endgültigen Stufe.'),
      zwischen_kwh:kwh('Kumulierte Energie am Zwischenzustand.'),ende_kwh:kwh('Kumulierte Energie beim Endzustand.'),
      endziel_bestaetigt:yes('Wurde der Endzustand für diese konkrete Ladung wirklich bestätigt?')},
    ({dieselbe_ladung,zwischen_min,ende_min,zwischen_kwh,ende_kwh,endziel_bestaetigt})=>{
      if(ende_min<zwischen_min||ende_kwh<zwischen_kwh) throw new RangeError('Aufsteigende Zeit- und Energiewerte');
      const valid=dieselbe_ladung&&endziel_bestaetigt;
      return {mehraufwand_min:valid?round(ende_min-zwischen_min):null,mehraufwand_kwh:valid?round(ende_kwh-zwischen_kwh):null,
        endzustand_fuer_vergleich_belegt:valid,grenze:'Wertet nur tatsächlich erreichte und protokollierte Stufen aus. Kein Energiebedarf für zukünftige Chargen.'};
    },{dieselbe_ladung:true,zwischen_min:475,ende_min:518,zwischen_kwh:0.56,ende_kwh:0.79,endziel_bestaetigt:true},
    {mehraufwand_min:43,mehraufwand_kwh:0.23,endzustand_fuer_vergleich_belegt:true}),

  tool('heizwaesche_teilfolge_beaufsichtigte_messpunkte',
    'Einen bereits erlaubten Trocknungsversuch vor Beginn auf erreichbare manuelle Messpunkte prüfen — Check whether both required observations can be actually taken.',rack,
    {eigenes_fenster_geprueft:yes('Stammen die angegebenen Zeiten aus einem tatsächlich erlaubten und betreuten Aufbau?'),
      a_start:mins('Ankunft am ersten Messfenster.'),a_ende:mins('Letzte erreichbare Minute im ersten Messfenster.'),
      b_start:mins('Ankunft am zweiten Messfenster.'),b_ende:mins('Letzte erreichbare Minute im zweiten Messfenster.'),
      abstand_noetig:mins('Für den eigenen Beobachtungsplan benötigter Mindestabstand der Ablesungen.')},
    ({eigenes_fenster_geprueft,a_start,a_ende,b_start,b_ende,abstand_noetig})=>{
      if(a_start>a_ende||a_ende>b_start||b_start>b_ende) throw new RangeError('Geordnete Messfenster');
      const firstB=Math.max(b_start,a_start+abstand_noetig);
      return {frueheste_messzeiten:eigenes_fenster_geprueft&&firstB<=b_ende?[a_start,firstB]:null,
        plan:eigenes_fenster_geprueft?(firstB<=b_ende?'beide_ablesungen_einplanen':'fenster_oder_messablauf_anpassen'):'ablauf_klaeren',
        grenze:'Nur Erreichbarkeit zweier persönlicher Beobachtungen. Erlaubnis und Beaufsichtigung eines Betriebs daraus nicht ableiten.'};
    },{eigenes_fenster_geprueft:true,a_start:600,a_ende:620,b_start:645,b_ende:680,abstand_noetig:55},
    {frueheste_messzeiten:[600,655],plan:'beide_ablesungen_einplanen'}),

  tool('heizwaesche_anfangsmasse_nassbezug_trockenbezug',
    'Gleich schwere Nassladungen mit unterschiedlichen trockenen Bezugsmassen vor einem Vergleich unterscheiden — Detect mismatched starting moisture in equally heavy wet loads.',comparison,
    {bezug_gemessen:yes('Liegt für beide Wäschezusammensetzungen eine jeweils tatsächlich gewogene trockenheitsgleiche Referenz vor?'),
      a_nass_g:grams('Nasse Masse vor Versuch A.'),a_trocken_g:grams('Trockenreferenz für A.'),
      b_nass_g:grams('Nasse Masse vor Versuch B.'),b_trocken_g:grams('Trockenreferenz für B.'),
      nassspanne_g:grams('Gemeinsame Spanne zum Vergleich der Nassmassen.'),wasser_spanne_g:grams('Gemeinsame Spanne zum Vergleich der anfänglichen Wasserüberschüsse.')},
    ({bezug_gemessen,a_nass_g,a_trocken_g,b_nass_g,b_trocken_g,nassspanne_g,wasser_spanne_g})=>{
      if(!a_trocken_g||!b_trocken_g||a_nass_g<a_trocken_g||b_nass_g<b_trocken_g) throw new RangeError('Nass- und Trockenmasse');
      const water=[a_nass_g-a_trocken_g,b_nass_g-b_trocken_g];
      return {anfangsueberschuss_a_b_g:bezug_gemessen?water.map(round):null,
        nassmasse_aehnlich_startwasser_verschieden:bezug_gemessen?Math.abs(a_nass_g-b_nass_g)<=nassspanne_g&&Math.abs(water[0]-water[1])>wasser_spanne_g:null,
        grenze:'Trockenbezug für jede Charge getrennt messen. Gleiche Anfangsfeuchte allein belegt keine vergleichbare Textilzusammensetzung.'};
    },{bezug_gemessen:true,a_nass_g:1600,a_trocken_g:980,b_nass_g:1608,b_trocken_g:1200,nassspanne_g:15,wasser_spanne_g:30},
    {anfangsueberschuss_a_b_g:[620,408],nassmasse_aehnlich_startwasser_verschieden:true}),

  tool('heizwaesche_raumziel_zwei_vergleichbare_beobachtungen',
    'Zwei bei gleicher Endtrockenheit beobachtete Abläufe nach eigenen unabhängigen Raum- und Energiegrenzen einordnen — Screen comparable drying trials against both measured room and energy criteria.',rack,
    {fertig_und_messrahmen_gleich:yes('Sind tatsächlicher Endzustand, gleiche Nutzlast und Messumfang mit Hilfsgeräten bestätigt?'),
      a_energie_kwh:kwh('Beobachtete Gesamtenergie A.'),b_energie_kwh:kwh('Beobachtete Gesamtenergie B.'),
      a_feuchtezunahme:num('Größte beobachtete Zunahme absoluter Feuchte am gewählten Messpunkt in A, relativ zum Ausgangswert.',-40,40),
      b_feuchtezunahme:num('Entsprechend beobachteter Wert B.',-40,40),grenze_kwh:kwh('Eigene gewählte Energiegrenze.'),
      eigene_feuchtegrenze:num('Selbst gewählter Beobachtungswert für die Zunahme, in g/m³, keine Freigabe.',0,40)},
    ({fertig_und_messrahmen_gleich,a_energie_kwh,b_energie_kwh,a_feuchtezunahme,b_feuchtezunahme,grenze_kwh,eigene_feuchtegrenze})=>{
      const observations=[['a',a_energie_kwh,a_feuchtezunahme],['b',b_energie_kwh,b_feuchtezunahme]];
      return {beide_eigene_grenzen_beobachtet:fertig_und_messrahmen_gleich?observations.filter(([,energy,humidity])=>energy<=grenze_kwh&&humidity<=eigene_feuchtegrenze).map(([name])=>name):null,
        je_ablauf_offene_zielwerte:fertig_und_messrahmen_gleich?observations.map(([,energy,water])=>[energy>grenze_kwh?'energie':null,water>eigene_feuchtegrenze?'raumbeobachtung':null].filter(Boolean)):null,
        grenze:'Eigene Vergleichsgrenzen der gemessenen Läufe. Kein allgemeiner Feuchteschwellenwert und keine Aussage zur Sicherheit oder Gebäudeursache.'};
    },{fertig_und_messrahmen_gleich:true,a_energie_kwh:0.8,b_energie_kwh:1.15,a_feuchtezunahme:2.2,b_feuchtezunahme:0.9,grenze_kwh:1.2,eigene_feuchtegrenze:1.5},
    {beide_eigene_grenzen_beobachtet:['b'],je_ablauf_offene_zielwerte:[['raumbeobachtung'],[]]}),

  tool('heizwaesche_langsamere_zone_rangwechsel_im_verlauf',
    'Erkennen, ob die anfangs feuchtere Gruppe später nicht mehr den Trocknungsendpunkt bestimmt — Detect a rank reversal between unchanged placement groups within one drying run.',rack,
    {bezug_und_platz_fest:yes('Wurden beide Stoffgruppen an ihren Positionen belassen und Restwerte auf einen vergleichbaren Trockenbezug normiert?'),
      a_frueh:num('Früher Restwasserwert A in g je 100 g eigener trockener Masse.',0,300),b_frueh:num('Entsprechender früher Wert B.',0,300),
      a_spaet:num('Späterer Restwasserwert A in denselben Einheiten.',0,300),b_spaet:num('Entsprechender späterer Wert B.',0,300),
      differenzspanne:num('Kombinierte Unsicherheit für den Unterschied je Zeitpunkt.',0,300)},
    ({bezug_und_platz_fest,a_frueh,b_frueh,a_spaet,b_spaet,differenzspanne})=>{
      const differences=[a_frueh-b_frueh,a_spaet-b_spaet];
      const order=differences.map(value=>value>differenzspanne?'a':value<-differenzspanne?'b':'offen');
      return {gruppe_mit_mehr_restwasser_frueh_spaet:bezug_und_platz_fest?order:null,
        rangwechsel_belegt:bezug_und_platz_fest?!order.includes('offen')&&order[0]!==order[1]:null,
        grenze:'Zwei Zeitpunkte desselben Durchgangs, kein prognostiziertes Ergebnis. Vor Abschluss beide Gruppen tatsächlich kontrollieren.'};
    },{bezug_und_platz_fest:true,a_frueh:49,b_frueh:35,a_spaet:9,b_spaet:19,differenzspanne:3},
    {gruppe_mit_mehr_restwasser_frueh_spaet:['a','b'],rangwechsel_belegt:true}),

  tool('heizwaesche_letzte_kontrolle_hilfsgeraet_nachlauf',
    'Nur tatsächlich beobachteten zusätzlichen Hilfsgerätebetrieb nach der letzten Trockenzielkontrolle ermitteln — Separate measured auxiliary use after the endpoint from total trial energy.',rack,
    {hilfsgeraet_getrennt_gemessen:yes('Sind beide kumulierten Werte am gleichen, nur dem Hilfsgerät zugeordneten Zähler abgelesen?'),
      ziel_zeit:mins('Zeit, zu der der Endzustand der Ladung sicher kontrolliert wurde.'),
      zaehler_zum_ziel_kwh:kwh('Kumulierter Zählerstand genau zu diesem Zeitpunkt.'),abschaltung_zeit:mins('Beobachtetes Ende des Hilfsbetriebs.'),
      zaehler_am_ende_kwh:kwh('Kumulierter Zählerstand am beobachteten Ende.'),weiterer_zweck:yes('Wurde als eigener separater Zweck noch ein weiterer Raumeinsatz dokumentiert?')},
    ({hilfsgeraet_getrennt_gemessen,ziel_zeit,zaehler_zum_ziel_kwh,abschaltung_zeit,zaehler_am_ende_kwh,weiterer_zweck})=>{
      if(abschaltung_zeit<ziel_zeit||zaehler_am_ende_kwh<zaehler_zum_ziel_kwh) throw new RangeError('Nachlaufmessung');
      return {minuten_nach_ziel:round(abschaltung_zeit-ziel_zeit),
        gemessene_hilfsenergie_nach_ziel_kwh:hilfsgeraet_getrennt_gemessen?round(zaehler_am_ende_kwh-zaehler_zum_ziel_kwh):null,
        eigene_raumaufgabe_notiert:weiterer_zweck,grenze:'Erfasst Zeitfolge und Energie. Zusätzliche Raumpflege oder notwendige Feuchteabfuhr bleiben als eigener Zweck zu prüfen.'};
    },{hilfsgeraet_getrennt_gemessen:true,ziel_zeit:830,zaehler_zum_ziel_kwh:0.48,abschaltung_zeit:870,zaehler_am_ende_kwh:0.63,weiterer_zweck:true},
    {minuten_nach_ziel:40,gemessene_hilfsenergie_nach_ziel_kwh:0.15,eigene_raumaufgabe_notiert:true}),
];
