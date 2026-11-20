const replace='/geraete-austausch-rechner.html';
const robot='/guide/saugroboter-kaufberatung.html';
const wet='/guide/saugwischer-kaufberatung.html';
const cooling='/guide/klimaanlage-reinigen.html';
const dehum='/guide/luftentfeuchter-ratgeber.html';
const drain='/guide/luftentfeuchter-zieht-kein-wasser.html';
const filters='/ersatzfilter.html';
const humidity='/guide/luftbefeuchter-ratgeber.html';
const laundry='/waeschetrockner-oder-luftentfeuchter.html';
const workshop='/familienwerkstatt.html';
const methods='/wie-wir-empfehlen.html';

const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const pick=(description,...values)=>({type:'string',description,enum:values});
const count=description=>num(description,0,500);
const day=description=>num(description,0,20000);
const minute=description=>num(description,0,1440);
const round=(value,digits=2)=>Number(value.toFixed(digits)) + 0;
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Ganze Stückzahlen oder Tage erforderlich.');
}
function tool(name,description,page,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const gebrauchtgeraete=[
  tool('gebrauchtgeraet_zustandswort_mit_einzelbefund_abgleichen',
    'Pauschalen Angebotszustand gegen tatsächlich untersuchte Punkte abgleichen — Translate broad seller condition language into observed and open checks.',methods,
    {untersuchte_punkte:count('Anzahl der selbst oder unabhängig begutachteten einzeln bezeichneten Punkte.'),
      abweichungen:count('Davon tatsächlich abweichend von der angebotenen Zustandsbeschreibung.'),
      nur_behauptet:count('Weitere bei der Besichtigung unbestätigte Punkte, die nur der Anbieter angegeben hat.'),
      ungefragt_offen:count('Weitere für die Entscheidung nötige Punkte ohne Angabe.')},
    ({untersuchte_punkte,abweichungen,nur_behauptet,ungefragt_offen})=>{
      whole(untersuchte_punkte,abweichungen,nur_behauptet,ungefragt_offen);
      if(abweichungen>untersuchte_punkte) throw new RangeError('Anzahl abweichender Stellen');
      return {direkt_bestaetigt:untersuchte_punkte-abweichungen,direkt_abweichend:abweichungen,
        noch_ohne_unabhaengigen_befund:nur_behauptet+ungefragt_offen,naechster_schritt:abweichungen?'abweichung_klaeren':nur_behauptet+ungefragt_offen?'offene_punkte_zuerst_pruefen':'erfasste_punkte_abgeglichen',
        grenze:'Keine Aussage zum Gesamtzustand. Jeder gezählte Punkt ist nur so gut wie seine konkrete Beobachtung.'};
    },{untersuchte_punkte:5,abweichungen:2,nur_behauptet:3,ungefragt_offen:1},
    {direkt_bestaetigt:3,direkt_abweichend:2,noch_ohne_unabhaengigen_befund:4,naechster_schritt:'abweichung_klaeren'}),

  tool('gebrauchtgeraet_fotos_nach_letzter_aenderung',
    'Vorliegende Fotos auf den Zustand nach der zuletzt genannten Änderung begrenzen — Separate usable current pictures from pre-change images.',methods,
    {objekt_belegt:yes('Zeigen die Fotos nachweislich genau das angebotene Exemplar?'),
      letzter_eingriff_tag:day('Tag der letzten für den Zustand relevanten Änderung.'),foto_front_tag:day('Bekannter Aufnahmetag der Front.'),
      foto_zugang_tag:day('Bekannter Aufnahmetag des zugänglichen Prüfbereichs.'),uhrzeit_gleichentag:yes('Ist bei Gleichstand am Änderungstag die Aufnahme nach der Änderung eindeutig belegt?')},
    ({objekt_belegt,letzter_eingriff_tag,foto_front_tag,foto_zugang_tag,uhrzeit_gleichentag})=>{
      whole(letzter_eingriff_tag,foto_front_tag,foto_zugang_tag);
      const stale=[['front',foto_front_tag],['zugang',foto_zugang_tag]].filter(([,date])=>date<letzter_eingriff_tag||date===letzter_eingriff_tag&&!uhrzeit_gleichentag).map(([name])=>name);
      return {gezielt_neues_foto:objekt_belegt?stale:['exemplar_zuordnen'],spaeterer_stand_sichtbar:objekt_belegt&&stale.length===0,
        grenze:'Vergleicht Bilddaten. Ein späteres Bild zeigt nur sichtbar Aufgenommenes.'};
    },{objekt_belegt:true,letzter_eingriff_tag:35,foto_front_tag:35,foto_zugang_tag:38,uhrzeit_gleichentag:false},
    {gezielt_neues_foto:['front'],spaeterer_stand_sichtbar:false}),

  tool('gebrauchtgeraet_sammlung_einzelfoto_oder_muster',
    'Bei einem Angebot mit mehreren Geräten Musterbilder und eindeutige Ansichten des ausgewählten Exemplars trennen — Check the evidence scope of a multi-unit listing.',methods,
    {sammelangebot:yes('Umfasst das Angebot mehr als ein Exemplar?'),
      identitaet_im_bild:yes('Ist das ausgewählte Exemplar auf der Übersichtsaufnahme eindeutig zugeordnet?'),
      detail_beim_exemplar:yes('Gehört die gezeigte Nahaufnahme eindeutig zu dieser Übersicht und demselben Exemplar?'),
      austausch_vor_abholung:yes('Darf der Anbieter laut Abmachung ein anderes Exemplar bereitstellen?')},
    ({sammelangebot,identitaet_im_bild,detail_beim_exemplar,austausch_vor_abholung})=>({
      exemplarbefund_verwendbar:identitaet_im_bild&&detail_beim_exemplar&&!austausch_vor_abholung,
      vor_zusage_pruefen:!identitaet_im_bild?'angebotenes_exemplar_zuordnen':!detail_beim_exemplar?'detailfoto_zuordnen':austausch_vor_abholung?'tatsaechlich_bereitgestelltes_exemplar_pruefen':sammelangebot?'ausschliesslich_dieses_exemplar_bewerten':'sichtbefund_dieses_exemplars_nutzen',
      grenze:'Benötigt keine Seriennummer als Eingabe. Bilder ändern eine Austauschvereinbarung nicht.'
    }),{sammelangebot:true,identitaet_im_bild:true,detail_beim_exemplar:true,austausch_vor_abholung:true},
    {exemplarbefund_verwendbar:false,vor_zusage_pruefen:'tatsaechlich_bereitgestelltes_exemplar_pruefen'}),

  tool('gebrauchtgeraet_unbenutzt_behauptung_nach_zaehlerwechsel',
    'Bei behaupteter Nichtbenutzung prüfen, was ein zurückgesetzter oder gewechselter Zähler überhaupt belegt — Limit a zero counter reading to the documented counter history.',replace,
    {verkaeufer_sagt_unbenutzt:yes('Behauptet der Anbieter ausdrücklich bisher keine Benutzung?'),
      zaehlerstand:num('Beobachtete Anzahl Einsätze im betreffenden Zähler.',0,100000),
      historie:pick('Nachgewiesener Bezug des Zählers zum gesamten Zeitraum.','durchgehend_belegt','reset_oder_tausch_belegt','offen'),
      zaehler_definition_belegt:yes('Wurde bestätigt, dass jedes relevante Ereignis mit dieser Anzeige tatsächlich erfasst wird?')},
    ({verkaeufer_sagt_unbenutzt,zaehlerstand,historie,zaehler_definition_belegt})=>{
      whole(zaehlerstand);
      return {aussage_im_widerspruch_zu_zaehler:verkaeufer_sagt_unbenutzt&&zaehler_definition_belegt?zaehlerstand>0:null,
        zeitraum:!zaehler_definition_belegt?'zaehlerumfang_offen':historie==='durchgehend_belegt'?'zaehlverlauf_dokumentiert':historie==='reset_oder_tausch_belegt'?'nur_seit_reset_oder_tausch':'beginn_offen',
        grenze:'Auch eine Nullanzeige beweist keinen neuwertigen Zustand, keine frühere Lagerung und keine Restlebensdauer.'};
    },{verkaeufer_sagt_unbenutzt:true,zaehlerstand:0,historie:'reset_oder_tausch_belegt',zaehler_definition_belegt:true},
    {aussage_im_widerspruch_zu_zaehler:false,zeitraum:'nur_seit_reset_oder_tausch'}),

  tool('gebrauchtgeraet_nutzungsprotokolle_ueberschneidung',
    'Zwei nachweislich lückenlos gezählte Einsatzzeiträume mit genau einer bekannten Überlappung zusammenführen — Sum confirmed lifetime-use subsets without counting overlap twice.',replace,
    {gleiches_exemplar_und_einheit:yes('Beziehen sich beide Protokolle auf dasselbe Exemplar und dieselbe Definition eines Einsatzes?'),
      gruppe_a:count('Bestätigte einzelne Einsätze der ersten Liste.'),gruppe_b:count('Bestätigte einzelne Einsätze der zweiten Liste.'),
      doppelte:count('Davon individuell nachvollziehbar in beiden Listen auftauchende gleiche Einsätze.'),davor_offen:yes('Ist die Gerätegeschichte vor beiden Listen unvollständig?')},
    ({gleiches_exemplar_und_einheit,gruppe_a,gruppe_b,doppelte,davor_offen})=>{
      whole(gruppe_a,gruppe_b,doppelte);
      if(doppelte>Math.min(gruppe_a,gruppe_b)) throw new RangeError('Überlappung der bestätigten Einsätze');
      return {einmalig_belegte_einsaetze:gleiches_exemplar_und_einheit?gruppe_a+gruppe_b-doppelte:null,
        umfang:!gleiches_exemplar_und_einheit?'protokolle_getrennt_lassen':davor_offen?'untergrenze_mit_offener_vorgeschichte':'nur_erfasste_protokolle',
        grenze:'Mengen beziehen sich auf dokumentierte Einsätze und sind kein Verschleißmodell.'};
    },{gleiches_exemplar_und_einheit:true,gruppe_a:42,gruppe_b:28,doppelte:10,davor_offen:true},
    {einmalig_belegte_einsaetze:60,umfang:'untergrenze_mit_offener_vorgeschichte'}),

  tool('gebrauchtgeraet_lang_gelagert_lagerzeit_nachweisgrenze',
    'Bekannten und unbelegten Teil der Lagerzeit einer gebrauchten Ware getrennt halten — Bound the documented storage coverage before evaluating a used appliance.',cooling,
    {belege_geordnet:yes('Betreffen die vorhandenen Angaben dasselbe gelagerte Exemplar?'),
      eingelagert_tag:day('Erster behaupteter Lagertag.'),ausgelagert_tag:day('Erster Tag nach dem behaupteten Lagerzeitraum.'),
      beleg_start:day('Erster Tag einer lückenlos dokumentierten Lagerstrecke innerhalb dieses Zeitraums.'),beleg_ende:day('Erster Tag nach der belegten Strecke.')},
    ({belege_geordnet,eingelagert_tag,ausgelagert_tag,beleg_start,beleg_ende})=>{
      whole(eingelagert_tag,ausgelagert_tag,beleg_start,beleg_ende);
      if(eingelagert_tag>beleg_start||beleg_start>beleg_ende||beleg_ende>ausgelagert_tag) throw new RangeError('Lagerintervalle');
      return {luecke_vorher_nachher_tage:belege_geordnet?[beleg_start-eingelagert_tag,ausgelagert_tag-beleg_ende]:null,
        abgedeckte_tage:belege_geordnet?beleg_ende-beleg_start:null,grenze:'Folgetag jeweils exklusiv. Dauer und Dokumentation allein belegen keine Einhaltung von Lagerbedingungen.'};
    },{belege_geordnet:true,eingelagert_tag:30,ausgelagert_tag:90,beleg_start:43,beleg_ende:80},
    {luecke_vorher_nachher_tage:[13,10],abgedeckte_tage:37}),

  tool('gebrauchtgeraet_angebot_sichtprobe_fotoausschnitt',
    'Bei verdeckten Fotobereichen festhalten, welche behaupteten Gebrauchsspuren ungeprüft bleiben — Prioritize a follow-up view of a claimed clear but obscured section.',methods,
    {zuordnung_belegt:yes('Gehört das Bild nachweislich zum betrachteten Exemplar?'),
      pruefabschnitte:count('Eindeutig identifizierte Prüfabschnitte insgesamt.'),
      nicht_gezeigt:count('Durch Zuschnitt oder Abdeckung nicht ausreichend dargestellte Abschnitte.'),
      ohne_spur_behauptet:count('Davon ausdrücklich als spurenfrei beworbene Abschnitte.'),
      spur_sichtbar:count('Bei den tatsächlich sichtbaren Abschnitten auffällige Stellen.')},
    ({zuordnung_belegt,pruefabschnitte,nicht_gezeigt,ohne_spur_behauptet,spur_sichtbar})=>{
      whole(pruefabschnitte,nicht_gezeigt,ohne_spur_behauptet,spur_sichtbar);
      if(nicht_gezeigt+spur_sichtbar>pruefabschnitte||ohne_spur_behauptet>nicht_gezeigt) throw new RangeError('Sichtbare und verdeckte Abschnitte');
      return {gezielt_nachfordern:zuordnung_belegt?ohne_spur_behauptet:null,weitere_abschnitte_offen:zuordnung_belegt?nicht_gezeigt-ohne_spur_behauptet:null,
        spur_sichtbar:zuordnung_belegt?spur_sichtbar:null,grenze:'Verdeckte Abschnitte beurteilen. Sichtbare Spuren belegen keine Ursache oder Funktion.'};
    },{zuordnung_belegt:true,pruefabschnitte:12,nicht_gezeigt:4,ohne_spur_behauptet:3,spur_sichtbar:2},
    {gezielt_nachfordern:3,weitere_abschnitte_offen:1,spur_sichtbar:2}),

  tool('gebrauchtgeraet_seit_wartung_tatsaechliche_einsaetze',
    'Nach einer behaupteten Wartung getrennt ausweisen, welche beobachteten Einsätze davor oder danach lagen — Establish which actual-use records follow maintenance.',filters,
    {wartung_art_und_bezug:yes('Sind die Arbeit, ihr Tag und das konkrete betroffene Bauteil belegt?'),
      davor:count('Protokollierte Einsätze vor diesem Tag.'),tag_gleich:count('Protokollierte Einsätze am selben Tag ohne belegte Uhrzeitfolge.'),
      danach:count('Eindeutig später protokollierte Einsätze.'),tage_unerfasst:count('Zusätzliche Tage ohne Nutzungsnachweis nach der Wartung.')},
    ({wartung_art_und_bezug,davor,tag_gleich,danach,tage_unerfasst})=>{
      whole(davor,tag_gleich,danach,tage_unerfasst);
      return {fruehere_einsaetze_sicher:wartung_art_und_bezug?davor:null,spaetere_einsaetze_sicher:wartung_art_und_bezug?danach:null,
        am_selben_tag_offen:wartung_art_und_bezug?tag_gleich:null,danach_protokollluecken_tage:wartung_art_und_bezug?tage_unerfasst:null,
        grenze:'Nur bereits gezählte Einsätze zeitlich einordnen. Keine Restdauer, Nutzungsrate oder Wirkung der Wartung ableiten.'};
    },{wartung_art_und_bezug:true,davor:20,tag_gleich:2,danach:11,tage_unerfasst:4},
    {fruehere_einsaetze_sicher:20,spaetere_einsaetze_sicher:11,am_selben_tag_offen:2,danach_protokollluecken_tage:4}),

  tool('gebrauchtgeraet_nutzungsprofil_alter_vs_umfang',
    'Zwei angebotene Geräte nur bei vergleichbar gezählten Gebrauchsanteilen auf Monatsraten vergleichen — Separate calendar age from observed use intensity.',replace,
    {gleiche_erfassung:yes('Sind die beiden bekannten Zeiträume lückenlos und dieselben Einsatzarten erfasst?'),
      a_monate:num('Vollständig belegte Monate von A.',0.1,240),a_einsaetze:count('Darin einzeln protokollierte Einsätze von A.'),
      b_monate:num('Vollständig belegte Monate von B.',0.1,240),b_einsaetze:count('Darin einzeln protokollierte Einsätze von B.')},
    ({gleiche_erfassung,a_monate,a_einsaetze,b_monate,b_einsaetze})=>{
      whole(a_einsaetze,b_einsaetze);
      const a=a_einsaetze/a_monate,b=b_einsaetze/b_monate;
      return {erfasste_einsaetze_pro_monat:gleiche_erfassung?[round(a),round(b)]:null,
        hoehere_erfasste_rate:!gleiche_erfassung?null:Math.abs(a-b)<1e-9?'gleich':a>b?'a':'b',
        grenze:'Nur belegte Zeiträume vergleichbar. Nutzungsintensität allein weist weder einen Defekt noch verbleibende Nutzungsdauer nach.'};
    },{gleiche_erfassung:true,a_monate:15,a_einsaetze:60,b_monate:8,b_einsaetze:48},
    {erfasste_einsaetze_pro_monat:[4,6],hoehere_erfasste_rate:'b'}),

  tool('gebrauchtgeraet_dokumentierter_zubehoerwechsel_vor_test',
    'Prüfen, ob ein Lauf das mitverkaufte Zubehör oder nur ein später entferntes Teil zeigt — Match a demonstration run to the accessories that would actually transfer.',robot,
    {selbes_zubehoer_am_lauf:yes('War im gezeigten Lauf nachweislich genau das für die Übergabe vorgesehene Zubehör verbaut?'),
      altteil_mitgegeben:yes('Wird das Zubehör aus der Vorführung ausdrücklich mit übergeben?'),
      teilwechsel_nach_lauf:yes('Ist ein Wechsel des gezeigten Teils nach dem Lauf dokumentiert?'),
      nachtest_mit_ersatz:yes('Gibt es einen eindeutig zugeordneten Nachtest mit dem tatsächlich mitgegebenen Ersatz?')},
    ({selbes_zubehoer_am_lauf,altteil_mitgegeben,teilwechsel_nach_lauf,nachtest_mit_ersatz})=>({
      belegt_mit_uebergabekonfiguration:nachtest_mit_ersatz||selbes_zubehoer_am_lauf&&altteil_mitgegeben&&!teilwechsel_nach_lauf,
      heranziehen:nachtest_mit_ersatz?'dokumentierten_nachtest':selbes_zubehoer_am_lauf&&altteil_mitgegeben&&!teilwechsel_nach_lauf?'urspruenglichen_lauf':'konfiguration_bei_uebergabe_klaeren',
      grenze:'Bezieht sich nur auf die gezeigte Konfiguration und geprüfte Aufgabe. Keine Aussage über weitere Zubehörkompatibilität.'
    }),{selbes_zubehoer_am_lauf:false,altteil_mitgegeben:false,teilwechsel_nach_lauf:true,nachtest_mit_ersatz:true},
    {belegt_mit_uebergabekonfiguration:true,heranziehen:'dokumentierten_nachtest'}),

  tool('gebrauchtgeraet_oberflaechenspur_in_funktionszone',
    'Sichtbare Spuren in berührten Funktionszonen vor dem Kauf separat begutachten lassen — Distinguish wear on a working interface from nearby cosmetic marks.',methods,
    {bereiche_belegt:yes('Ist anhand der vorgesehenen Arbeitsweise bekannt, wo Teile tatsächlich anliegen oder sich bewegen?'),
      an_funktionsflaeche:count('Sichtbare Spuren im Kontakt- oder Bewegungsbereich.'),daneben:count('Separat beobachtete Spuren daneben.'),
      lage_offen:count('Weitere Spuren mit noch ungeklärter Lage.'),betrieb_unauffaellig_behauptet:yes('Hat der Anbieter lediglich störungsfreien Betrieb behauptet?')},
    ({bereiche_belegt,an_funktionsflaeche,daneben,lage_offen,betrieb_unauffaellig_behauptet})=>{
      whole(an_funktionsflaeche,daneben,lage_offen);
      return {kontaktzone_separat_pruefen:bereiche_belegt?an_funktionsflaeche:null,daneben_sichtbar:bereiche_belegt?daneben:null,
        offene_lagen:lage_offen+(bereiche_belegt?0:an_funktionsflaeche+daneben),
        reine_funktionsaussage:betrieb_unauffaellig_behauptet,grenze:'Lage beschreibt Sichtbefunde. Weder Kosmetik noch störungsfreier Betrieb lassen sich pauschal ableiten.'};
    },{bereiche_belegt:true,an_funktionsflaeche:2,daneben:4,lage_offen:1,betrieb_unauffaellig_behauptet:true},
    {kontaktzone_separat_pruefen:2,daneben_sichtbar:4,offene_lagen:1,reine_funktionsaussage:true}),

  tool('gebraucht_behaelter_sitz_linke_rechte_auflage',
    'Bei sichtbarer Abweichung zweier gleichartiger Auflagen Messspiel und Beobachtung trennen — Compare visible seated-container alignment against your measurement tolerance.',wet,
    {gleichartige_auflagen:yes('Sind beide Messpunkte laut Unterlagen im selben Sollzustand vergleichbar und ohne Eingriff zugänglich?'),
      links_mm:num('Beobachteter Spalt links in mm.',0,50),rechts_mm:num('Beobachteter Spalt rechts in mm.',0,50),
      messspanne_mm:num('Selbst ermittelte gemeinsame Unsicherheit in mm.',0,25),sitz_auffaellig:yes('Ist der ohne Eingriff beobachtete Sitz zusätzlich auffällig?')},
    ({gleichartige_auflagen,links_mm,rechts_mm,messspanne_mm,sitz_auffaellig})=>{
      const delta=links_mm-rechts_mm;
      return {links_minus_rechts_mm:gleichartige_auflagen?round(delta):null,
        beobachtung:!gleichartige_auflagen?'messpunkte_klaeren':sitz_auffaellig||Math.abs(delta)>messspanne_mm?'sitz_vor_entscheidung_abklaeren':'kein_unterschied_in_dieser_probe_erkennbar',
        grenze:'Nur Sicht- und Vergleichsmessung, kein Nachweis von Dichtheit, Passung oder Zulässigkeit.'};
    },{gleichartige_auflagen:true,links_mm:2.8,rechts_mm:1.1,messspanne_mm:0.6,sitz_auffaellig:false},
    {links_minus_rechts_mm:1.7,beobachtung:'sitz_vor_entscheidung_abklaeren'}),

  tool('gebrauchtgeraet_spur_nach_dem_transport_neu_einordnen',
    'Vorher und nachher getrennt dokumentierte sichtbare Stellen nach der Abholung abgleichen — Identify confirmed newly visible marks without guessing who caused them.',methods,
    {gleich_abgebildet:yes('Sind dieselben Prüfabschnitte bei vergleichbarer Sicht dokumentiert?'),
      gemeinsame_pruefstellen:count('Eindeutig in beiden Aufnahmen vergleichbare Stellen.'),
      neu_sichtbar:count('Davon erst in der späteren Aufnahme sichtbar auffällige Stellen.'),
      schon_vorher:count('Davon in beiden Aufnahmen bereits sichtbar auffällige Stellen.'),
      nicht_vergleichbar:count('Weitere Stellen ohne vergleichbare Aufnahme.')},
    ({gleich_abgebildet,gemeinsame_pruefstellen,neu_sichtbar,schon_vorher,nicht_vergleichbar})=>{
      whole(gemeinsame_pruefstellen,neu_sichtbar,schon_vorher,nicht_vergleichbar);
      if(neu_sichtbar+schon_vorher>gemeinsame_pruefstellen) throw new RangeError('Doppelt gezählte Stellen');
      return {neu_dokumentiert:gleich_abgebildet?neu_sichtbar:null,bereits_vorher_dokumentiert:gleich_abgebildet?schon_vorher:null,
        bildvergleich_offen:nicht_vergleichbar+(gleich_abgebildet?0:gemeinsame_pruefstellen),
        grenze:'„Neu sichtbar“ ist keine Schadensursache, kein Entstehungsdatum und keine Aussage zu Ansprüchen.'};
    },{gleich_abgebildet:true,gemeinsame_pruefstellen:9,neu_sichtbar:2,schon_vorher:3,nicht_vergleichbar:2},
    {neu_dokumentiert:2,bereits_vorher_dokumentiert:3,bildvergleich_offen:2}),

  tool('gebraucht_kondensatspur_vor_nach_stillstand',
    'Bei bereits ausgeschaltetem Gerät eine äußerlich beobachtete Spur nach Lage und Wiederauftreten dokumentieren — Separate previously visible marks from an observed recurrence while idle.',drain,
    {gleiches_exemplar_und_untergrund:yes('Gehören Zeitpunkte, Bodenstelle und Gerät eindeutig zusammen?'),
      trocken_beobachtet:yes('Wurde der markierte Bereich zwischen den Beobachtungen tatsächlich trocken gesehen?'),
      neu_sichtbar:yes('Wurde später am markierten Bereich erneut Wasser beobachtet?'),
      andere_wasserquelle_offen:yes('Kommt nach den vorhandenen Beobachtungen eine andere Wasserquelle infrage?')},
    ({gleiches_exemplar_und_untergrund,trocken_beobachtet,neu_sichtbar,andere_wasserquelle_offen})=>({
      wiederauftreten_beobachtet:gleiches_exemplar_und_untergrund&&trocken_beobachtet?neu_sichtbar:null,
      status:!gleiches_exemplar_und_untergrund||!trocken_beobachtet?'zeitfolge_und_stelle_klaeren':!neu_sichtbar?'kein_wiederauftreten_in_probe':andere_wasserquelle_offen?'quelle_offen':'wiederauftreten_gezielt_abklaeren',
      grenze:'Nur äußerliche Beobachtungen. Wasserquelle und Gerätezustand getrennt prüfen. Gerät dafür nicht öffnen oder einschalten.'
    }),{gleiches_exemplar_und_untergrund:true,trocken_beobachtet:true,neu_sichtbar:true,andere_wasserquelle_offen:true},
    {wiederauftreten_beobachtet:true,status:'quelle_offen'}),

  tool('gebraucht_rolle_arbeitsbreite_ausgebrochene_abschnitte',
    'Sichtbare Lücken entlang einer zugänglichen Reinigungsrolle als überlappende Längenbereiche dokumentieren — Record distinct visibly affected spans along a roller without projecting cleaning performance.',wet,
    {zugang_laut_anleitung:yes('Ist die äußere Sichtprüfung an der ausgebaut vorliegenden Rolle ohne weiteren Eingriff zulässig?'),
      breite:num('Gemessene Arbeitsbreite in mm.',1,800),
      a_von:num('Startmarke der ersten sichtbaren Auffälligkeit in mm.',0,800),a_bis:num('Endmarke der ersten Auffälligkeit.',0,800),
      b_von:num('Startmarke der zweiten sichtbaren Auffälligkeit in mm.',0,800),b_bis:num('Endmarke der zweiten Auffälligkeit.',0,800)},
    ({zugang_laut_anleitung,breite,a_von,a_bis,b_von,b_bis})=>{
      if(a_bis<a_von||b_bis<b_von||Math.max(a_bis,b_bis)>breite) throw new RangeError('Messabschnitte an der Rollenbreite');
      const overlap=Math.max(0,Math.min(a_bis,b_bis)-Math.max(a_von,b_von));
      const affected=a_bis-a_von+b_bis-b_von-overlap;
      return {einmalig_auffaellige_mm:zugang_laut_anleitung?round(affected):null,sichtanteil_prozent:zugang_laut_anleitung?round(100*affected/breite):null,
        grenze:'Nur beobachtete äußere Längenabschnitte. Der Anteil sagt nichts über Reinigungswirkung oder die Eignung für Weiterbetrieb.'};
    },{zugang_laut_anleitung:true,breite:270,a_von:10,a_bis:35,b_von:27,b_bis:48},
    {einmalig_auffaellige_mm:38,sichtanteil_prozent:14.07}),

  tool('gebraucht_auflagepads_unterschied_kompressionsprobe',
    'Zwei gleichartige gebrauchte Auflagen anhand einer bereits dokumentierten Vergleichsmessung unterscheiden — Compare a pad pair’s observed compression without making a material-lifetime claim.',wet,
    {bedingungen_gleich:yes('Sind trockener Zustand, Auflagentyp, Belastung und Messstelle beider Proben vergleichbar?'),
      a_unbelastet:num('Dicke A unbelastet in mm.',0,100),a_belastet:num('Dicke A bei gleicher dokumentierter Belastung.',0,100),
      b_unbelastet:num('Dicke B unbelastet in mm.',0,100),b_belastet:num('Dicke B unter der gleichen Belastung.',0,100),
      messspanne:num('Selbst bestimmte kombinierte Unsicherheit der Differenzen.',0,100)},
    ({bedingungen_gleich,a_unbelastet,a_belastet,b_unbelastet,b_belastet,messspanne})=>{
      const compression=[a_unbelastet-a_belastet,b_unbelastet-b_belastet];
      if(Math.min(...compression)<0||!a_unbelastet||!b_unbelastet) throw new RangeError('Dicken und Kompression');
      return {kompression_a_b_mm:bedingungen_gleich?compression.map(value=>round(value)):null,
        unterschied_ueber_messspanne:bedingungen_gleich?Math.abs(compression[0]-compression[1])>messspanne+1e-9:null,
        grenze:'Gilt nur für diese Auflagen und Messung. Weicht Anfangsdicke oder Lage stark ab, Maße und Teilzuordnung separat nachprüfen.'};
    },{bedingungen_gleich:true,a_unbelastet:7,a_belastet:5,b_unbelastet:8,b_belastet:5,messspanne:0.4},
    {kompression_a_b_mm:[2,3],unterschied_ueber_messspanne:true}),

  tool('gebraucht_klimageraet_abluftstrecke_uebergabezustand',
    'Den sichtbaren Zustand der mitgegebenen, getrennt betrachteten Abluftteile dokumentieren — Separate accessory condition at each end from the state of the flexible span.',cooling,
    {nur_aussen_einsehbar:yes('Sind die drei Bereiche ohne Öffnen des Geräts laut Anleitung sichtbar und eindeutig dem Satz zugeordnet?'),
      erstes_ende:pick('Beobachtung am ersten lösbaren Anschlussstück.','gesehen_unauffaellig','auffaellig','unbekannt'),
      zweites_ende:pick('Beobachtung am anderen lösbaren Anschlussstück.','gesehen_unauffaellig','auffaellig','unbekannt'),
      schlauchstrecke:pick('Beobachtung an der einsehbaren Außenhülle.','gesehen_unauffaellig','auffaellig','unbekannt')},
    ({nur_aussen_einsehbar,erstes_ende,zweites_ende,schlauchstrecke})=>{
      const findings=[['ende_a',erstes_ende],['ende_b',zweites_ende],['schlauchstrecke',schlauchstrecke]];
      return {gezielt_auffaellig:nur_aussen_einsehbar?findings.filter(([,state])=>state==='auffaellig').map(([name])=>name):[],
        offene_ansichten:nur_aussen_einsehbar?findings.filter(([,state])=>state==='unbekannt').map(([name])=>name):['sichtumfang_und_zuordnung'],
        grenze:'Nur gewöhnliches, getrennt mitgegebenes Abluftzubehör beurteilen. Kein Kältemittelanschluss, kein Dichtheitstest.'};
    },{nur_aussen_einsehbar:true,erstes_ende:'unbekannt',zweites_ende:'auffaellig',schlauchstrecke:'gesehen_unauffaellig'},
    {gezielt_auffaellig:['ende_b'],offene_ansichten:['ende_a']}),

  tool('gebrauchtgeraet_bedienmarken_lesbarkeit_bedarfsweg',
    'Lesbare Anzeigen und Symbole mit der konkret vorgesehenen Bedienung verknüpfen — Check whether a worn control label affects the intended local workflow.',methods,
    {ablauf_belegt:yes('Sind benötigte Bedienpunkte und Anzeige im eigenen geplanten Ablauf anhand der Anleitung identifiziert?'),
      pflicht_marken:count('Für den geplanten Ablauf benötigte einzelne Bedien- oder Ablesepunkte.'),
      vor_ort_lesbar:count('Davon am vorgesehenen Standort direkt lesbar.'),
      belegte_externe_hilfe:count('Von den übrigen Punkten mit separat bestätigter dauerhaft verfügbarer Ablese- oder Orientierungshilfe.')},
    ({ablauf_belegt,pflicht_marken,vor_ort_lesbar,belegte_externe_hilfe})=>{
      whole(pflicht_marken,vor_ort_lesbar,belegte_externe_hilfe);
      if(vor_ort_lesbar+belegte_externe_hilfe>pflicht_marken) throw new RangeError('Nur zusätzliche Hilfen zählen');
      return {direkt_lesbar:ablauf_belegt?vor_ort_lesbar:null,noch_ohne_zuverlaessige_bedieninformation:ablauf_belegt?pflicht_marken-vor_ort_lesbar-belegte_externe_hilfe:null,
        grenze:'Eine Orientierungshilfe ersetzt keine Warnkennzeichnung oder Bedienungsanleitung.'};
    },{ablauf_belegt:true,pflicht_marken:6,vor_ort_lesbar:3,belegte_externe_hilfe:1},
    {direkt_lesbar:3,noch_ohne_zuverlaessige_bedieninformation:2}),

  tool('gebraucht_dichtung_zugangsabschnitte_sichtbefund',
    'Sichtbare Dichtungsabschnitte einer Behälteröffnung nach fehlender Ansicht und Auffälligkeit bilanzieren — Keep obscured portions out of a visual gasket inspection.',dehum,
    {sichtpruefung_zulaessig:yes('Ist die sichtbare Dichtung der vorgesehenen zugänglichen Öffnung ohne Eingriff erkennbar?'),
      laenge_cm:num('Am zugänglichen Verlauf markierte Gesamtstrecke in cm.',0.1,500),
      verdeckt_cm:num('Davon nicht beurteilbare Strecke in cm.',0,500),sichtspur_cm:num('Weitere Strecke mit tatsächlich sichtbarer Auffälligkeit in cm.',0,500),
      probe_im_gebrauch_gezeigt:yes('Wurde die identische Öffnung zusätzlich bei zulässigem normalen Gebrauch beobachtet?')},
    ({sichtpruefung_zulaessig,laenge_cm,verdeckt_cm,sichtspur_cm,probe_im_gebrauch_gezeigt})=>{
      if(verdeckt_cm+sichtspur_cm>laenge_cm+1e-9) throw new RangeError('Dichtungsverlauf');
      return {sichtbar_ohne_notierte_spur_cm:sichtpruefung_zulaessig?round(laenge_cm-verdeckt_cm-sichtspur_cm):null,
        erneute_ansicht_cm:sichtpruefung_zulaessig?verdeckt_cm:null,gebrauch_separat_gezeigt:probe_im_gebrauch_gezeigt,
        grenze:'Längen protokollieren nur eine Sichtprüfung. Dichtheit und zulässiger Zustand lassen sich daraus nicht feststellen.'};
    },{sichtpruefung_zulaessig:true,laenge_cm:54,verdeckt_cm:8,sichtspur_cm:6,probe_im_gebrauch_gezeigt:false},
    {sichtbar_ohne_notierte_spur_cm:40,erneute_ansicht_cm:8,gebrauch_separat_gezeigt:false}),

  tool('gebrauchtgeraet_schatten_kamerawinkel_gegenprobe',
    'Eine auffällige Stelle bei zwei Blickrichtungen und veränderter Beleuchtung als Beobachtung einordnen — Separate a reproducible mark from a view-dependent appearance.',methods,
    {gleiche_stelle:yes('Ist dieselbe Stelle ohne Verschieben des Teils eindeutig wiedergefunden?'),
      blick_a:yes('War sie bei Blickrichtung A sichtbar?'),blick_b:yes('War sie bei Blickrichtung B sichtbar?'),
      sicht_bei_lichtwechsel:yes('Blieb sie bei dokumentiert veränderter Beleuchtung sichtbar?')},
    ({gleiche_stelle,blick_a,blick_b,sicht_bei_lichtwechsel})=>({
      beobachtung:!gleiche_stelle?'stelle_erneut_zuordnen':blick_a&&blick_b&&sicht_bei_lichtwechsel?'in_verschiedenen_ansichten_sichtbar':blick_a||blick_b||sicht_bei_lichtwechsel?'ansichtsabhaengige_beobachtung':'bei_diesen_ansichten_ohne_befund',
      grenze:'Eine Ansicht beweist keinen Materialfehler. Fotos unter dokumentiert vergleichbaren Bedingungen dienen nur der Sichtprüfung.'
    }),{gleiche_stelle:true,blick_a:true,blick_b:false,sicht_bei_lichtwechsel:false},
    {beobachtung:'ansichtsabhaengige_beobachtung'}),

  tool('gebrauchtangebot_teilabholung_aufteilung_nach_beleg',
    'Ein zweigeteiltes Abholangebot auf ausstehende unersetzbare Teile begrenzen — Decide whether the first partial pickup covers a self-contained intended task.',workshop,
    {beide_teilelisten_belegt:yes('Sind beide Lieferumfänge und die zur ersten Aufgabe notwendigen Teile bestätigt?'),
      direkt_notwendig:count('Einzeln erfasste Teile für die erste beabsichtigte Aufgabe.'),erste_abholung:count('Davon bereits bestätigt in der ersten Übergabe.'),
      in_zweiter:count('Weitere davon, die ausdrücklich erst in der zweiten Übergabe zugesagt sind.'),
      zweite_auch_tatsaechlich_uebergeben:yes('Sind die Teile der zweiten Übergabe bereits tatsächlich geprüft übergeben?')},
    ({beide_teilelisten_belegt,direkt_notwendig,erste_abholung,in_zweiter,zweite_auch_tatsaechlich_uebergeben})=>{
      whole(direkt_notwendig,erste_abholung,in_zweiter);
      if(erste_abholung+in_zweiter>direkt_notwendig) throw new RangeError('Doppelte Zuordnung');
      const current=erste_abholung+(zweite_auch_tatsaechlich_uebergeben?in_zweiter:0);
      return {aktuell_fehlend:beide_teilelisten_belegt?direkt_notwendig-current:null,ohne_zusage_fehlend:beide_teilelisten_belegt?direkt_notwendig-erste_abholung-in_zweiter:null,
        grenze:'Die Zusage der zweiten Abholung zählt für die Planung, tatsächliche Übergabe separat prüfen.'};
    },{beide_teilelisten_belegt:true,direkt_notwendig:6,erste_abholung:3,in_zweiter:2,zweite_auch_tatsaechlich_uebergeben:false},
    {aktuell_fehlend:3,ohne_zusage_fehlend:1}),

  tool('gebrauchtgeraet_originalkarton_aufgedruckt_enthalten',
    'Zubehörbilder auf einem mitgegebenen Karton von tatsächlich bestätigten Einzelteilen trennen — Avoid counting printed pack contents as received components.',methods,
    {karton_zuordnung_geprueft:yes('Gehört der Karton nachweislich zur angebotenen Variante?'),
      karton_zeigt:count('Für den eigenen Zweck relevante, auf dem Karton abgebildete Zubehörpositionen.'),durchgesehen:count('Davon bei geprüfter Öffnung überprüfte Positionen.'),
      davon_gefunden:count('Davon im Paket überprüft vorhandene, passende einzelne Positionen.')},
    ({karton_zuordnung_geprueft,karton_zeigt,durchgesehen,davon_gefunden})=>{
      whole(karton_zeigt,durchgesehen,davon_gefunden);
      if(davon_gefunden>durchgesehen||durchgesehen>karton_zeigt) throw new RangeError('Bild- und Durchsichtmengen');
      return {vorhanden_geprueft:karton_zuordnung_geprueft?davon_gefunden:null,
        nach_durchsicht_nicht_gefunden:karton_zuordnung_geprueft?durchgesehen-davon_gefunden:null,noch_offen:karton_zuordnung_geprueft?karton_zeigt-durchgesehen:null,
        grenze:'Ein Bild oder Karton belegt den aktuellen Lieferumfang nicht. Ungeöffnete Positionen separat als offen führen.'};
    },{karton_zuordnung_geprueft:true,karton_zeigt:7,durchgesehen:5,davon_gefunden:4},
    {vorhanden_geprueft:4,nach_durchsicht_nicht_gefunden:1,noch_offen:2}),

  tool('gebrauchtgeraet_reset_und_eigene_einrichtung_trennen',
    'Eine behauptete Rücksetzung von der praktisch bestätigten Ersteinrichtung beim Besitzerwechsel trennen — Verify device handover state without collecting account information.',robot,
    {bisherige_kopplung:pick('Belegter Zustand der bisherigen Kontobindung.','geloest','gebunden','offen','nicht_erforderlich'),
      lokaler_start:yes('Wurde der laut Anleitung reguläre Start ohne Bindung praktisch beobachtet?'),
      funktionen_konto_noetig:yes('Braucht der gewünschte eigene Ablauf laut Anleitung eine Einrichtung mit Konto?'),
      eigene_einrichtung_bestaetigt:yes('Wurde die vorgesehene eigene Einrichtung bereits bestätigt?')},
    ({bisherige_kopplung,lokaler_start,funktionen_konto_noetig,eigene_einrichtung_bestaetigt})=>{
      const released=bisherige_kopplung==='geloest'||bisherige_kopplung==='nicht_erforderlich';
      return {bisherige_bindung_klaeren:!released,
        vorgesehener_ablauf_belegt:released&&(funktionen_konto_noetig?eigene_einrichtung_bestaetigt:lokaler_start),
        grenze:'Nur die Zustände der offiziellen Übergabe beschreiben. Keine Zugangsdaten eingeben, keine Sperren umgehen.'};
    },{bisherige_kopplung:'offen',lokaler_start:true,funktionen_konto_noetig:true,eigene_einrichtung_bestaetigt:false},
    {bisherige_bindung_klaeren:true,vorgesehener_ablauf_belegt:false}),

  tool('gebrauchtgeraet_rueckgabe_vorentscheidung_claim_klaeren',
    'Anbieterhinweise zur Rückgabe und individuell bestätigte Bedingungen vor Zusage getrennt festhalten — Compare seller headline and actual written return terms.',methods,
    {rueckgabe_beworben:yes('Wird in der Angebotsübersicht allgemein Rückgabe genannt?'),
      frist_exemplar:yes('Liegt eine konkrete schriftliche Frist für genau dieses Angebot vor?'),
      zustandsbedingungen_klar:yes('Sind Bedingungen für Zustand und Vollständigkeit des Exemplars eindeutig angegeben?'),
      rueckgabeweg_klar:yes('Ist der tatsächlich akzeptierte Rückgabeweg angegeben?')},
    ({rueckgabe_beworben,frist_exemplar,zustandsbedingungen_klar,rueckgabeweg_klar})=>({
      ueberschrift_vorhanden:rueckgabe_beworben,vor_zusage_klaeren:[['frist',frist_exemplar],['zustand_und_umfang',zustandsbedingungen_klar],['weg',rueckgabeweg_klar]].filter(([,ok])=>!ok).map(([name])=>name),
      grenze:'Nur vorhandene Anbieterangaben auflisten. Kein Urteil zu Widerruf, gesetzlichen Ansprüchen oder Erstattung.'
    }),{rueckgabe_beworben:true,frist_exemplar:true,zustandsbedingungen_klar:false,rueckgabeweg_klar:true},
    {ueberschrift_vorhanden:true,vor_zusage_klaeren:['zustand_und_umfang']}),

  tool('gebrauchtangebot_erstbesichtigung_eigner_terminbeleg',
    'Ohne unabhängige Vorführung die Wirkung eines vereinbarten Prüfslots auf offene Kaufpunkte festhalten — Distinguish monitorable acceptance checks from checks disallowed at pickup.',workshop,
    {pruefliste_vereinbart:yes('Sind die einzeln vorgesehenen gewöhnlichen Dokumenten- und Sichtprüfungen für den Übergabetermin abgestimmt?'),
      entscheidungspunkte:count('Alle noch offenen Schritte, die für diese Entscheidung nötig sind.'),
      beim_termin_gezeigt:count('Davon vor einer Zusage beim Termin ausdrücklich möglich.'),
      aus_unabhaengigem_beleg:count('Weitere davon durch unabhängige Unterlagen bereits beantwortete Schritte.')},
    ({pruefliste_vereinbart,entscheidungspunkte,beim_termin_gezeigt,aus_unabhaengigem_beleg})=>{
      whole(entscheidungspunkte,beim_termin_gezeigt,aus_unabhaengigem_beleg);
      if(beim_termin_gezeigt+aus_unabhaengigem_beleg>entscheidungspunkte) throw new RangeError('Nur getrennte Prüfpunkte zählen');
      return {vor_ort_noch_zu_pruefen:pruefliste_vereinbart?beim_termin_gezeigt:null,
        ausserhalb_des_termins_offen:pruefliste_vereinbart?entscheidungspunkte-beim_termin_gezeigt-aus_unabhaengigem_beleg:null,
        grenze:'Ein geplanter Termin bestätigt weder Verfügbarkeit noch Zustand. Keine Zahlung oder Zusage auslösen.'};
    },{pruefliste_vereinbart:true,entscheidungspunkte:8,beim_termin_gezeigt:4,aus_unabhaengigem_beleg:3},
    {vor_ort_noch_zu_pruefen:4,ausserhalb_des_termins_offen:1}),

  tool('gebraucht_angebote_pflichtteil_kategorien_luecken',
    'Zwei unvollständige Angebote nur nach den zwingend benötigten Zubehörgruppen abgleichen — Find offer-specific missing requirements instead of comparing total included pieces.',wet,
    {gleicher_verwendungszweck:yes('Sind beide Angebote für denselben vorgesehenen Zweck geprüft?'),
      schluesselteil_noetig:yes('Ist für den eigenen Zweck das spezielle Zusatzteil erforderlich?'),
      a_grundteil:yes('Grundteil bei A passend bestätigt.'),a_schluesselteil:yes('Zusatzteil bei A passend bestätigt.'),
      b_grundteil:yes('Grundteil bei B passend bestätigt.'),b_schluesselteil:yes('Zusatzteil bei B passend bestätigt.')},
    ({gleicher_verwendungszweck,schluesselteil_noetig,a_grundteil,a_schluesselteil,b_grundteil,b_schluesselteil})=>{
      const missing=(base,key)=>[base?null:'grundteil',schluesselteil_noetig&&!key?'zusatzteil':null].filter(Boolean);
      return {a_nicht_bestaetigt:gleicher_verwendungszweck?missing(a_grundteil,a_schluesselteil):null,
        b_nicht_bestaetigt:gleicher_verwendungszweck?missing(b_grundteil,b_schluesselteil):null,
        grenze:'Fehlende Bestätigung bedeutet unbekannt oder schriftlich ausgeschlossen. Keine Aussage über Preis, Zustand oder Herkunft.'};
    },{gleicher_verwendungszweck:true,schluesselteil_noetig:true,a_grundteil:true,a_schluesselteil:false,b_grundteil:false,b_schluesselteil:true},
    {a_nicht_bestaetigt:['zusatzteil'],b_nicht_bestaetigt:['grundteil']}),

  tool('gebrauchtgeraet_mehrfachbeigabe_ohne_gebrauchsnachweis',
    'Bei als neu beiliegenden Verbrauchsteilen belegte und offene Mengen von bereits eingebauten Teilen abgrenzen — Audit unverified extras without treating them as usable spares.',filters,
    {gleiche_varianten_belegt:yes('Sind Grundteil und einzelne beigelegte Verbrauchsteile dem angebotenen Exemplar korrekt zugeordnet?'),
      extras_vorhanden:count('Zusätzlich physisch beiliegende Einzelteile.'),
      geoeffnet_oder_benutzt:count('Davon sichtbar geöffnet oder in Benutzung protokolliert.'),
      intakt_belegt:count('Davon getrennt belegbar unbenutzt und original verpackt.'),
      eingebaut_gezaehlt:count('Bereits eingebaute Teile, die separat aufgeführt sind.')},
    ({gleiche_varianten_belegt,extras_vorhanden,geoeffnet_oder_benutzt,intakt_belegt,eingebaut_gezaehlt})=>{
      whole(extras_vorhanden,geoeffnet_oder_benutzt,intakt_belegt,eingebaut_gezaehlt);
      if(geoeffnet_oder_benutzt+intakt_belegt>extras_vorhanden) throw new RangeError('Beigabenstatus');
      return {unbenutzte_beigabe_dokumentiert:gleiche_varianten_belegt?intakt_belegt:null,
        beiliegender_zustand_offen:gleiche_varianten_belegt?extras_vorhanden-geoeffnet_oder_benutzt-intakt_belegt:null,
        separat_eingebaut:eingebaut_gezaehlt,grenze:'Keine bereits eingebauten Teile als zusätzliche Beigaben rechnen. Eignung, Lagerung und laut Anleitung zulässigen Einsatz prüfen.'};
    },{gleiche_varianten_belegt:true,extras_vorhanden:8,geoeffnet_oder_benutzt:3,intakt_belegt:4,eingebaut_gezaehlt:1},
    {unbenutzte_beigabe_dokumentiert:4,beiliegender_zustand_offen:1,separat_eingebaut:1}),

  tool('gebrauchtgeraet_demo_medien_verkaufsangebot_abgleich',
    'Eine Vorführung mit angebotener Anleitungsversion und späterer Notiz konkret inhaltlich verknüpfen — Check whether the offered configuration agrees with the documented live demo.',humidity,
    {zeitgleiche_ansicht:yes('Gibt es eine eindeutig zum Vorführzeitpunkt gehörige Ansicht der Einstellung?'),
      demo_anzeige_eindeutig:yes('Lässt sich der relevante Bedienzustand darauf ablesen?'),
      spaetere_textnotiz:pick('Verhältnis der späteren vom Anbieter genannten Einstellung zum sichtbaren Zustand.','gleich','abweichend','kein_text'),
      einstellung_fuer_zweck_entscheidend:yes('Ändert diese Einstellung nach der Anleitung die wesentliche Aufgabe?')},
    ({zeitgleiche_ansicht,demo_anzeige_eindeutig,spaetere_textnotiz,einstellung_fuer_zweck_entscheidend})=>({
      sichtbare_demo_einstellung_belegt:zeitgleiche_ansicht&&demo_anzeige_eindeutig,
      abweichung_des_vorfuehrmodus_klaeren:einstellung_fuer_zweck_entscheidend&&(!zeitgleiche_ansicht||!demo_anzeige_eindeutig||spaetere_textnotiz==='abweichend'),
      grenze:'Eine spätere Notiz ändert den tatsächlich beobachteten Zustand nicht. Keine Leistung aus einem Modusnamen ableiten.'
    }),{zeitgleiche_ansicht:true,demo_anzeige_eindeutig:true,spaetere_textnotiz:'abweichend',einstellung_fuer_zweck_entscheidend:true},
    {sichtbare_demo_einstellung_belegt:true,abweichung_des_vorfuehrmodus_klaeren:true}),

  tool('gebrauchtgeraet_fehler_haeufigkeit_angabe_widerspruch',
    'Eine Aussage wie „selten“ gegen dokumentierte Einsatzanteile mit offenem Zeitraum prüfen — Detect an explicit intermittent-fault frequency mismatch from comparable records.',replace,
    {stoerung_gleich_erfasst:yes('Bezeichnet das Protokoll genau dieselbe benannte Störung und denselben Zeitraum wie die Aussage?'),
      vollstaendig_gesehene_einsaetze:count('Vollständig protokollierte Einsätze mit bekannter Störung oder störungsfreiem Abschluss.'),
      davon_stoerung:count('Davon Einsätze mit der betrachteten Störung.'),nicht_protokolliert:count('Weitere bekannte Einsätze ohne verfügbares Ergebnis.'),
      genannte_obergrenze_prozent:num('Explizit vom Anbieter genannte vergleichbare Prozentobergrenze.',0,100)},
    ({stoerung_gleich_erfasst,vollstaendig_gesehene_einsaetze,davon_stoerung,nicht_protokolliert,genannte_obergrenze_prozent})=>{
      whole(vollstaendig_gesehene_einsaetze,davon_stoerung,nicht_protokolliert);
      if(davon_stoerung>vollstaendig_gesehene_einsaetze) throw new RangeError('Störungsmengen');
      const total=vollstaendig_gesehene_einsaetze+nicht_protokolliert;
      const low=total?100*davon_stoerung/total:null, high=total?100*(davon_stoerung+nicht_protokolliert)/total:null;
      return {dokumentierte_spannweite_prozent:stoerung_gleich_erfasst&&total?[round(low),round(high)]:null,
        eindeutig_ueber_claim:stoerung_gleich_erfasst&&total?low>genannte_obergrenze_prozent:null,
        grenze:'Spannweite nur für die bekannten Einsätze. Keine Vorhersage und keine Schätzung der Ursache.'};
    },{stoerung_gleich_erfasst:true,vollstaendig_gesehene_einsaetze:20,davon_stoerung:4,nicht_protokolliert:5,genannte_obergrenze_prozent:10},
    {dokumentierte_spannweite_prozent:[16,36],eindeutig_ueber_claim:true}),

  tool('gebrauchtgeraet_ausstattung_geaendertes_angebot_version',
    'Zwei bestätigte Angebotsfassungen auf inzwischen weggefallenes entscheidendes Zubehör abgleichen — Detect material reductions in the latest recorded used-device offer.',methods,
    {gleiches_angebot:yes('Sind beide Fassungen demselben Exemplar und Anbieter zugeordnet?'),
      vorher_relevant:count('Für den eigenen Zweck notwendige Positionen der früheren Fassung.'),
      weiterhin_explizit:count('Davon in der aktuellen Fassung erneut ausdrücklich enthalten.'),entfall_explizit:count('Weitere davon aktuell ausdrücklich ausgeschlossen.')},
    ({gleiches_angebot,vorher_relevant,weiterhin_explizit,entfall_explizit})=>{
      whole(vorher_relevant,weiterhin_explizit,entfall_explizit);
      if(weiterhin_explizit+entfall_explizit>vorher_relevant) throw new RangeError('Angebotsabgleich');
      return {weggefallen:gleiches_angebot?entfall_explizit:null,erneut_klaeren:gleiches_angebot?vorher_relevant-weiterhin_explizit-entfall_explizit:null,
        grenze:'Nicht erneut genannte Positionen bleiben offen. Aktuellen Lieferumfang schriftlich abgleichen.'};
    },{gleiches_angebot:true,vorher_relevant:6,weiterhin_explizit:3,entfall_explizit:1},
    {weggefallen:1,erneut_klaeren:2}),

  tool('gebrauchtgeraet_video_ausschnitt_vollstaendiger_start',
    'Bei zwei Videosegmenten feststellen, ob der entscheidende Startmoment wirklich sichtbar ist — Detect gaps in recorded proof of a used-appliance start.',methods,
    {gleicher_lauf_belegt:yes('Sind beide Ausschnitte eindeutig demselben Lauf und derselben Zeitachse zugeordnet?'),
      clip_a_start:minute('Erste Zeitmarke von Segment A.'),clip_a_end:minute('Letzte sichtbare Zeitmarke A.'),
      clip_b_start:minute('Erste Zeitmarke B.'),clip_b_end:minute('Letzte sichtbare Zeitmarke B.'),
      start_ab:minute('Erste Zeitmarke des zu belegenden kritischen Übergangs.'),start_bis:minute('Letzte Zeitmarke dieses Übergangs.')},
    ({gleicher_lauf_belegt,clip_a_start,clip_a_end,clip_b_start,clip_b_end,start_ab,start_bis})=>{
      if(clip_a_start>clip_a_end||clip_b_start>clip_b_end||start_ab>=start_bis) throw new RangeError('Videozeitbereiche');
      const spans=[[clip_a_start,clip_a_end],[clip_b_start,clip_b_end]].sort(([a],[b])=>a-b);
      const [a,b]=spans;
      const continuous=b[0]<=a[1]?[[a[0],Math.max(a[1],b[1])]]:spans;
      return {kritischer_uebergang_lueckenlos:gleicher_lauf_belegt?continuous.some(([left,right])=>left<=start_ab&&right>=start_bis):null,
        grenze:'Gilt für tatsächlich sichtbare gleichzeitige Belege. Schneiden kann Übergänge auslassen; Funktion separat beurteilen.'};
    },{gleicher_lauf_belegt:true,clip_a_start:0,clip_a_end:8,clip_b_start:10,clip_b_end:28,start_ab:7,start_bis:11},
    {kritischer_uebergang_lueckenlos:false}),

  tool('gebrauchtgeraet_vorfuehrung_kaltstart_nur_belegt',
    'Bezeichneten Start nach Ruhe von einer Fortsetzung aus dem bereits betriebenen Zustand trennen — Distinguish a demonstrated cold start from an already-running unit.',cooling,
    {voraussetzung_belegt:yes('Ist die Startvoraussetzung laut Anleitung oder vereinbartem Vergleich für das konkrete Vorführziel dokumentiert?'),
      geforderter_ruhezustand:yes('Ist der vorherige Ruhe- oder Ausgangszustand dokumentiert?'),neu_start_gesehen:yes('Ist der anschließende tatsächliche Start im selben Ablauf sichtbar?'),
      vorheriger_lauf_beobachtet:yes('War unmittelbar vorher ein Lauf zu sehen, der dem geforderten Ausgangszustand widerspricht?')},
    ({voraussetzung_belegt,geforderter_ruhezustand,neu_start_gesehen,vorheriger_lauf_beobachtet})=>({
      startabfolge:!voraussetzung_belegt?'voraussetzung_klaeren':vorheriger_lauf_beobachtet?'bereits_betrieb_beobachtet':geforderter_ruhezustand&&neu_start_gesehen?'geforderten_start_beobachtet':'ausgangszustand_oder_start_offen',
      grenze:'Keine Ruhezeit ableiten. Bei tatsächlichem Transport oder Lagerung gelten die Betriebsbedingungen der Anleitung.'
    }),{voraussetzung_belegt:true,geforderter_ruhezustand:false,neu_start_gesehen:true,vorheriger_lauf_beobachtet:true},
    {startabfolge:'bereits_betrieb_beobachtet'}),

  tool('gebrauchtgeraet_vorfuehrung_stoppursache_qualifiziert',
    'Das beobachtete Programmende von Abbruch und unbekanntem Ende getrennt notieren — Distinguish a completed demonstration from a seller-stopped or unobserved run.',robot,
    {eindeutig_gleicher_lauf:yes('Gehören Beginn, Ablauf und gegebene Endmeldung zum selben vorgeführten Programm?'),
      ende:pick('Beobachteter Zustand bei Ende der Aufzeichnung.','normal_signal','manueller_stopp','abbruchmeldung','nicht_sichtbar'),
      ergebnis_geprueft:yes('Ist das für den Käufer relevante Ergebnis am Ende tatsächlich geprüft?')},
    ({eindeutig_gleicher_lauf,ende,ergebnis_geprueft})=>({
      laufbeleg:!eindeutig_gleicher_lauf?'lauf_zuordnen':ende==='normal_signal'&&ergebnis_geprueft?'ende_und_ergebnis_gesehen':ende==='normal_signal'?'nur_endsignal':ende,
      grenze:'Erfasst einen beobachteten Lauf, keine Fehlerdiagnose. Ein Endsignal allein belegt kein verwertbares Ergebnis.'
    }),{eindeutig_gleicher_lauf:true,ende:'manueller_stopp',ergebnis_geprueft:false},
    {laufbeleg:'manueller_stopp'}),

  tool('gebrauchtgeraet_testlauf_vorherige_befuellung_effekt',
    'In einer Entfeuchter-Vorführung bereits vorhandenes Tankwasser vom gemessenen Zuwachs trennen — Correct a used-unit demonstration for pre-existing tank contents.',drain,
    {messung_durchgehend:yes('Sind beide Ablesungen in derselben normalen beobachteten Betriebsphase mit unverändertem Tank und ohne Zugabe erfolgt?'),
      vorher_ml:num('Im Tank vor Vorführung dokumentierte Menge, in ml.',0,15000),nachher_ml:num('Im Tank am Ende dokumentierte Menge, in ml.',0,15000),
      messspanne_ml:num('Gemeinsame Ableseunsicherheit, in ml.',0,15000)},
    ({messung_durchgehend,vorher_ml,nachher_ml,messspanne_ml})=>{
      const delta=nachher_ml-vorher_ml;
      return {gemessene_aenderung_ml:messung_durchgehend?round(delta):null,
        beobachtung:!messung_durchgehend?'mengen_getrennt_lassen':delta>messspanne_ml?'positive_aenderung_beobachtet':delta< -messspanne_ml?'abnahme_klaeren':'innerhalb_messspanne',
        grenze:'Eine Vorführung belegt unter anderen Raumbedingungen keine Entzugsleistung. Bei sichtbarer Nässe Ursache klären.'};
    },{messung_durchgehend:true,vorher_ml:320,nachher_ml:335,messspanne_ml:20},
    {gemessene_aenderung_ml:15,beobachtung:'innerhalb_messspanne'}),

  tool('gebrauchtgeraet_vorfuehrung_eigene_last_untergrenze',
    'Eine gezeigte Gebrauchslast mit dem kleinsten eigenen Einsatz und dessen Zubehörzustand vergleichen — Check whether a demonstration actually covers the buyer’s minimum workload.',laundry,
    {gleiche_aufgabe:yes('Sind Material, Programm und verwendete Teile für die beabsichtigte Aufgabe tatsächlich vergleichbar?'),
      gezeigt_kg:num('In der Vorführung vor Start gewogene anrechenbare Last in kg.',0,50),
      eigener_bedarf_kg:num('Kleinste relevante Last im eigenen Ablauf in kg.',0.1,50),
      gezeigtes_ergebnis_geprueft:yes('Wurde das relevante Endergebnis des vorgeführten Laufs praktisch geprüft?')},
    ({gleiche_aufgabe,gezeigt_kg,eigener_bedarf_kg,gezeigtes_ergebnis_geprueft})=>({
      lastluecke_kg:gleiche_aufgabe?round(Math.max(0,eigener_bedarf_kg-gezeigt_kg)):null,
      bedarf_in_probe_gezeigt:gleiche_aufgabe&&gezeigtes_ergebnis_geprueft&&gezeigt_kg>=eigener_bedarf_kg,
      grenze:'Das ist keine maximale zulässige Füllmenge. Für Gerät, Material und Einstellungen gelten die Herstellerangaben.'
    }),{gleiche_aufgabe:true,gezeigt_kg:2.7,eigener_bedarf_kg:4.1,gezeigtes_ergebnis_geprueft:true},
    {lastluecke_kg:1.4,bedarf_in_probe_gezeigt:false}),

  tool('gebrauchtgeraet_test_reihenfolge_nutzermodus_wiederfinden',
    'Eine gezeigte Funktion auf unabhängige Wiederholbarkeit der bestätigten Bedienfolge prüfen — Check whether observed success depended on an unrecorded operator action.',humidity,
    {regulaere_folge_bestaetigt:yes('Sind Voraussetzungen und zulässige Bedienfolge für den vorgesehenen Modus bekannt?'),
      ergebnisse_gleich:yes('War das relevante Ergebnis in zwei beobachteten Wiederholungen gleich?'),
      eingriff_a:pick('Beobachteter zusätzlicher Eingriff in Wiederholung A.','kein','dokumentiert','nicht_zugeordnet'),
      eingriff_b:pick('Beobachteter zusätzlicher Eingriff in Wiederholung B.','kein','dokumentiert','nicht_zugeordnet')},
    ({regulaere_folge_bestaetigt,ergebnisse_gleich,eingriff_a,eingriff_b})=>({
      zusatzschritte_klaeren:[['a',eingriff_a],['b',eingriff_b]].filter(([,state])=>state==='nicht_zugeordnet').map(([name])=>name),
      standardablauf_wiederholt_gesehen:regulaere_folge_bestaetigt&&ergebnisse_gleich&&eingriff_a==='kein'&&eingriff_b==='kein',
      grenze:'Beobachtung unter bekannten Bedingungen. Daraus folgen kein allgemeiner Funktionsnachweis und keine Anleitung für Sonderbedienungen.'
    }),{regulaere_folge_bestaetigt:true,ergebnisse_gleich:true,eingriff_a:'kein',eingriff_b:'nicht_zugeordnet'},
    {zusatzschritte_klaeren:['b'],standardablauf_wiederholt_gesehen:false}),

  tool('gebrauchtgeraet_laufzeiten_verschiedene_zeitgrenzen',
    'Zwei angebliche Programmdauern nur aus vergleichbaren Start- und Endmarken neu bilden — Normalize seller-reported duration for omitted startup and finish segments.',replace,
    {beide_abschnitte_belegt:yes('Sind Aufgaben, Anfangs- und Endmarken sowie fehlende Abschnitte beider Läufe wirklich vergleichbar?'),
      a_kern_min:minute('Separat aufgezeichneter Kernlauf A.'),a_ausgelassen_min:minute('Belegte notwendige Minuten außerhalb dieser Aufzeichnung A.'),
      b_kern_min:minute('Separat aufgezeichneter Kernlauf B.'),b_ausgelassen_min:minute('Belegte notwendige Minuten außerhalb dieser Aufzeichnung B.')},
    ({beide_abschnitte_belegt,a_kern_min,a_ausgelassen_min,b_kern_min,b_ausgelassen_min})=>{
      if(!a_kern_min||!b_kern_min) throw new RangeError('Belegte Kerndauer');
      const totals=[a_kern_min+a_ausgelassen_min,b_kern_min+b_ausgelassen_min];
      return {vergleichbare_gesamtdauer_a_b:beide_abschnitte_belegt?totals.map(value=>round(value)):null,
        rangfolge_kehrt_sich_um:beide_abschnitte_belegt?(a_kern_min-b_kern_min)*(totals[0]-totals[1])<0:null,
        grenze:'Nur tatsächlich bekannte nicht überlappende Abschnitte ergänzen. Geschwindigkeit allein sagt nichts über Ergebnis oder Zustand.'};
    },{beide_abschnitte_belegt:true,a_kern_min:32,a_ausgelassen_min:16,b_kern_min:36,b_ausgelassen_min:4},
    {vergleichbare_gesamtdauer_a_b:[48,40],rangfolge_kehrt_sich_um:true}),

  tool('gebrauchtgeraet_testprotokoll_normalfall_nachtrag',
    'Bei nachgereichten Vorführläufen erkennen, ob ursprünglich nur positive Beispiele ausgewählt waren — Detect a changed result mix when documented omitted runs are restored.',methods,
    {gleiches_kriterium:yes('Sind Exemplar, Aufgabe und Kriterium aller zuerst gezeigten und nachgereichten Läufe vergleichbar?'),
      zuerst_gesamt:count('Zuerst gezeigte dokumentierte Läufe.'),zuerst_ok:count('Davon für die Aufgabe passend beendet.'),
      nachtrag_gesamt:count('Zusätzliche vorher ausgelassene, nun dokumentierte Läufe.'),nachtrag_ok:count('Davon für dasselbe Kriterium passend beendet.')},
    ({gleiches_kriterium,zuerst_gesamt,zuerst_ok,nachtrag_gesamt,nachtrag_ok})=>{
      whole(zuerst_gesamt,zuerst_ok,nachtrag_gesamt,nachtrag_ok);
      if(zuerst_ok>zuerst_gesamt||nachtrag_ok>nachtrag_gesamt) throw new RangeError('Ergänzung zählt keine doppelten Läufe');
      const usable=gleiches_kriterium&&zuerst_gesamt>0&&nachtrag_gesamt>0;
      const first=zuerst_gesamt?100*zuerst_ok/zuerst_gesamt:0;
      const joined=zuerst_gesamt+nachtrag_gesamt?100*(zuerst_ok+nachtrag_ok)/(zuerst_gesamt+nachtrag_gesamt):0;
      return {beobachtete_anteile_vorher_mit_nachtrag:usable?[round(first),round(joined)]:null,
        differenz_prozentpunkte:usable?round(joined-first):null,grenze:'Auswahlbeobachtung, keine Ausfallprognose und kein unterstelltes Motiv des Anbieters.'};
    },{gleiches_kriterium:true,zuerst_gesamt:4,zuerst_ok:4,nachtrag_gesamt:4,nachtrag_ok:2},
    {beobachtete_anteile_vorher_mit_nachtrag:[100,75],differenz_prozentpunkte:-25}),

  tool('gebrauchtgeraet_testlast_eigener_ablauf_nur_kombination',
    'Zwei einzeln gezeigte Teilfunktionen von der benötigten Kombination im selben Arbeitsgang trennen — Verify whether a buyer-required joint use was actually demonstrated.',wet,
    {kombination_laut_anleitung:yes('Sind die gewünschte Kombination und die geplanten Teile für den gleichen Arbeitsgang freigegeben?'),
      a_einzeln:yes('Wurde die erste Teilaufgabe einzeln mit Ergebnis gezeigt?'),b_einzeln:yes('Wurde die zweite Teilaufgabe einzeln mit Ergebnis gezeigt?'),
      beide_ein_arbeitsgang:yes('Wurden beide Teilaufgaben in demselben bestätigten Arbeitsgang mit geprüftem Ergebnis gezeigt?')},
    ({kombination_laut_anleitung,a_einzeln,b_einzeln,beide_ein_arbeitsgang})=>({
      teilbelege:[a_einzeln,b_einzeln],gemeinsamer_gewaehlter_ablauf_gezeigt:kombination_laut_anleitung&&beide_ein_arbeitsgang,
      grenze:'Einzelversuche werden nicht zu einem beobachteten gemeinsamen Ablauf. Bestätigt keine Geräteeignung außerhalb der gezeigten Nutzung.'
    }),{kombination_laut_anleitung:true,a_einzeln:true,b_einzeln:true,beide_ein_arbeitsgang:false},
    {teilbelege:[true,true],gemeinsamer_gewaehlter_ablauf_gezeigt:false}),

  tool('gebrauchtgeraet_wartungsbeleg_zielbauteil_gegen_kit',
    'Einen Servicebeleg auf den darin ausdrücklich genannten Teil eines mehrteiligen gebrauchten Sets begrenzen — Check which sold assemblies are actually covered by a maintenance receipt.',robot,
    {beleg_diesem_set_zugeordnet:yes('Kann der Beleg nachweislich diesem verkauften Satz zugeordnet werden?'),
      geraet:pick('Erwähnung des Grundgeräts.','pflege_explizit','nur_erwaehnt','offen'),
      station:pick('Erwähnung der für den Kauf entscheidenden Station.','pflege_explizit','nur_erwaehnt','offen','nicht_teil_des_angebots'),
      einsatzteil:pick('Erwähnung des entscheidenden lose mitgegebenen Einsatzteils.','pflege_explizit','nur_erwaehnt','offen','nicht_teil_des_angebots')},
    ({beleg_diesem_set_zugeordnet,geraet,station,einsatzteil})=>{
      const parts=[['geraet',geraet],['station',station],['einsatzteil',einsatzteil]];
      return {wartung_explizit:beleg_diesem_set_zugeordnet?parts.filter(([,state])=>state==='pflege_explizit').map(([name])=>name):[],
        wartungsumfang_offen:parts.filter(([,state])=>state!=='nicht_teil_des_angebots'&&(!beleg_diesem_set_zugeordnet||state!=='pflege_explizit')).map(([name])=>name),
        grenze:'Ein belegter Pflegeschritt sagt nichts über andere Komponenten, aktuellen Zustand oder Alter aus.'};
    },{beleg_diesem_set_zugeordnet:true,geraet:'pflege_explizit',station:'nur_erwaehnt',einsatzteil:'nicht_teil_des_angebots'},
    {wartung_explizit:['geraet'],wartungsumfang_offen:['station']}),
];
