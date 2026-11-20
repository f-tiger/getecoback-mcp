const wet='/guide/saugwischer-kaufberatung.html';
const robot='/guide/saugroboter-kaufberatung.html';
const laundry='/guide/waesche-trocknen-wohnung.html';
const closet='/guide/schimmel-kleiderschrank.html';
const humidifier='/guide/luftbefeuchter-ratgeber.html';
const cleaner='/guide/klimaanlage-reinigen.html';
const filters='/ersatzfilter.html';
const tineco='/guide/tineco-saugt-nicht-mehr.html';
const workshop='/familienwerkstatt.html';
const bath='/guide/schimmel-bad-fugen.html';
const drying='/waeschetrockner-oder-luftentfeuchter.html';

const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const pick=(description,...values)=>({type:'string',description,enum:values});
const count=description=>num(description,0,300);
const minute=description=>num(description,0,1440);
const clock=minute;
const mass=description=>num(description,0,20000);
const round=value=>Number(value.toFixed(2));
const attention=label=>pick(label,'bestaetigt','offen','abweichend');
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Ganzzahlige Mengen erforderlich');
}
function tool(name,description,page,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const pflegeablaeufe=[
  tool('pflegeablage_sauber_schmutzig_nacheinander',
    'Einen gemeinsam genutzten Arbeitsplatz mit beobachtetem Freiräum- und Prüfschritt umstellen — Check a sequential switch between used and clean work materials.',wet,
    {belegt:yes('Sind Trennung, Aufstellort und Umstellablauf für die Teile belegt?'),ende_benutzt:clock('Tagesminute, zu der die benutzten Teile weg können.'),
      wegraeumen_min:minute('Beobachtete Dauer bis diese Teile getrennt abgelegt sind.'),pruefen_min:minute('Zeit für den vorgesehenen Prüfschritt der leeren Ablage.'),
      sauber_ab:clock('Tagesminute, zu der die sauberen Teile eingeplant sind.'),separate_ablage:yes('Ist eine bestätigte, davon unabhängige saubere Ablage frei?')},
    ({belegt,ende_benutzt,wegraeumen_min,pruefen_min,sauber_ab,separate_ablage})=>{
      const ready=ende_benutzt+wegraeumen_min+pruefen_min;
      return {gleiche_ablage_fruehestens_min:belegt?round(ready):null,
        plan:!belegt?'ablagen_und_ablauf_klaeren':ready<=sauber_ab?'gleiche_ablage_nach_kontrolle':separate_ablage?'bestaetigte_separate_ablage':'sauberen_ablageschritt_verschieben',
        grenze:'Gilt für die geplante Zeitfolge. Die anschließende Nutzung hängt vom tatsächlich kontrollierten Zustand der Ablage ab.'};
    },{belegt:true,ende_benutzt:540,wegraeumen_min:8,pruefen_min:5,sauber_ab:550,separate_ablage:true},
    {gleiche_ablage_fruehestens_min:553,plan:'bestaetigte_separate_ablage'}),

  tool('pflegekorb_entleeren_teilmenge_nach_bearbeitung',
    'Nur die tatsächlich bearbeiteten Teile aus einem gekennzeichneten Sammelkorb ausbuchen — Keep unfinished pieces visible after a partial clearing of a used-items basket.',laundry,
    {mengen_zugeordnet:yes('Sind Anfangszahl, Zugang und vollständig entnommene Stücke ohne Doppelzählung erfasst?'),
      am_start:count('Zu Beginn vorhandene benutzte Teile.'),neu_dazu:count('Bis zur Kontrolle zusätzlich eingelegte Teile.'),
      vollstaendig_bearbeitet:count('Davon entnommen und für den vorgesehenen Schritt quittiert.'),herausgelegt_offen:count('Davon zwar separat herausgelegt, aber noch mit offenem Schritt.')},
    ({mengen_zugeordnet,am_start,neu_dazu,vollstaendig_bearbeitet,herausgelegt_offen})=>{
      whole(am_start,neu_dazu,vollstaendig_bearbeitet,herausgelegt_offen);
      const total=am_start+neu_dazu;
      if(vollstaendig_bearbeitet+herausgelegt_offen>total) throw new RangeError('Entnommene Teile übersteigen Ausgangsmenge');
      return {direkt_im_korb:mengen_zugeordnet?total-vollstaendig_bearbeitet-herausgelegt_offen:null,
        insgesamt_offen:mengen_zugeordnet?total-vollstaendig_bearbeitet:null,
        grenze:'Separat bereitgelegte Teile zählen als offen. Bearbeitungszustand vor Weiterverwendung prüfen.'};
    },{mengen_zugeordnet:true,am_start:11,neu_dazu:3,vollstaendig_bearbeitet:6,herausgelegt_offen:2},
    {direkt_im_korb:6,insgesamt_offen:8}),

  tool('pflege_einsatzort_erst_nach_trockenablage_wechseln',
    'Ein teilfertiges Pflegeset nur mit geeignetem getrennten Platz in einen zweiten Raum verlagern — Decide whether a care-in-progress kit can be staged in another room.',wet,
    {fuer_kurzzeit_bestaetigt:yes('Erlaubt der dokumentierte Ablauf eine Zwischenablage dieser Teile?'),
      trockene_teile:count('Einzeln geprüfte trockene Teile.'),offene_teile:count('Teile in noch offenem feuchtem oder ungeklärtem Zustand.'),
      ziel_trockenplaetze:count('Passende getrennte trockene Plätze im Zielraum.'),ziel_offenplaetze:count('Für diese offenen Teile ausdrücklich geeignete, separat geführte Plätze.')},
    ({fuer_kurzzeit_bestaetigt,trockene_teile,offene_teile,ziel_trockenplaetze,ziel_offenplaetze})=>{
      whole(trockene_teile,offene_teile,ziel_trockenplaetze,ziel_offenplaetze);
      const dry=Math.min(trockene_teile,ziel_trockenplaetze);
      const pending=fuer_kurzzeit_bestaetigt?Math.min(offene_teile,ziel_offenplaetze):0;
      return {getrennt_trocken_verlagern:dry,offen_verlagern:pending,am_bisherigen_ort_einplanen:trockene_teile+offene_teile-dry-pending,
        grenze:'Nur bereits geeignete Aufbewahrungsorte zählen. Keine feuchten und trockenen Teile zusammen verpacken.'};
    },{fuer_kurzzeit_bestaetigt:false,trockene_teile:5,offene_teile:3,ziel_trockenplaetze:4,ziel_offenplaetze:3},
    {getrennt_trocken_verlagern:4,offen_verlagern:0,am_bisherigen_ort_einplanen:4}),

  tool('pflege_restaufgaben_mit_einem_gesamtstopp',
    'Unterbrochene Routine anhand eines erreichbaren, belegt zulässigen Unterbrechungspunkts neu einteilen — Find a permitted stopping point before a household interruption.',humidifier,
    {teilbarkeit_belegt:yes('Sind der Unterbrechungspunkt und die Fortsetzung genau dieses Verfahrens zulässig?'),
      vor_stopp_min:minute('Aktive Minuten vor dem Unterbrechungspunkt.'),danach_min:minute('Aktive Minuten nach Wiederbeginn.'),
      bis_unterbrechung_min:minute('Verfügbare durchgehende Minuten bis zur Unterbrechung.'),danach_frei_min:minute('Verfügbare durchgehende Minuten nach der Unterbrechung.')},
    ({teilbarkeit_belegt,vor_stopp_min,danach_min,bis_unterbrechung_min,danach_frei_min})=>{
      const first=bis_unterbrechung_min-vor_stopp_min;
      const second=danach_frei_min-danach_min;
      return {reserve_vorher_nachher:teilbarkeit_belegt?[round(first),round(second)]:null,
        plan:!teilbarkeit_belegt?'zusammenhaengendes_fenster_pruefen':first<0?'abbruchpunkt_nicht_erreichbar':second<0?'fortsetzung_neu_einplanen':'folge_im_zeitfenster',
        grenze:'Nur aktive Planungszeiten. Vorgegebene Wartephasen, Aufbewahrung und tatsächlichen Abschluss separat prüfen.'};
    },{teilbarkeit_belegt:true,vor_stopp_min:9,danach_min:7,bis_unterbrechung_min:10,danach_frei_min:6},
    {reserve_vorher_nachher:[1,-1],plan:'fortsetzung_neu_einplanen'}),

  tool('pflege_spuelstelle_separater_ruecklauf',
    'Erneute Arbeit an einer bereits quittierten Spülstelle ohne Rückführung fertiger Teile planen — Isolate only the pieces affected when a rinse step must be revisited.',wet,
    {betroffene_zugeordnet:yes('Sind die von der Unterbrechung betroffenen Teile eindeutig zugeordnet?'),
      bereits_getrennt_fertig:count('Vor der Unterbrechung fertig geprüfte und separat weggelegte Teile.'),
      gruppenreste:count('Weitere Teile, deren dokumentierter Spülschritt unvollständig ist.'),
      zustand_unklar:count('Weitere Teile ohne nachvollziehbaren Bearbeitungsstand.')},
    ({betroffene_zugeordnet,bereits_getrennt_fertig,gruppenreste,zustand_unklar})=>{
      whole(bereits_getrennt_fertig,gruppenreste,zustand_unklar);
      return {separat_fertig_belassen:betroffene_zugeordnet?bereits_getrennt_fertig:0,
        vorgesehene_fortsetzung:betroffene_zugeordnet?gruppenreste:null,
        vor_fortsetzung_einordnen:zustand_unklar+(betroffene_zugeordnet?0:bereits_getrennt_fertig+gruppenreste),
        grenze:'Nur bestätigte Trennung und Statuszuordnung auswerten. Die erforderlichen Schritte stehen in der jeweiligen Anleitung.'};
    },{betroffene_zugeordnet:true,bereits_getrennt_fertig:5,gruppenreste:3,zustand_unklar:2},
    {separat_fertig_belassen:5,vorgesehene_fortsetzung:3,vor_fortsetzung_einordnen:2}),

  tool('pflege_uebergabe_rueckfrage_zu_geraeteteil',
    'Bei geteilter Gerätepflege fehlende Rückmeldungen konkret dem bearbeiteten Teil zuweisen — Show which care stages still need a part-specific confirmation.',tineco,
    {identitaet_belegt:yes('Sind Gerät und die getrennt dokumentierten Teile für alle Beteiligten dieselben?'),
      vorbereitung:attention('Beleg für den ersten vereinbarten Vorbereitungsschritt.'),
      behaelter:attention('Beleg für den separaten Behälterschritt.'),
      einsatzteil:attention('Beleg für die vereinbarte Pflege des zugänglichen Einsatzteils.'),
      sichtkontrolle:attention('Beleg für die abschließende Sichtkontrolle vor dem nächsten Gebrauch.')},
    ({identitaet_belegt,vorbereitung,behaelter,einsatzteil,sichtkontrolle})=>{
      const stages=[['vorbereitung',vorbereitung],['behaelter',behaelter],['einsatzteil',einsatzteil],['sichtkontrolle',sichtkontrolle]];
      return {rueckfrage:identitaet_belegt?stages.filter(([,state])=>state==='offen').map(([name])=>name):['teilzuordnung'],
        abweichungen:identitaet_belegt?stages.filter(([,state])=>state==='abweichend').map(([name])=>name):[],
        grenze:'Übergabenotiz, keine Prüffreigabe. Für offengebliebene oder abweichende Schritte gilt die genaue Geräteanleitung.'};
    },{identitaet_belegt:true,vorbereitung:'bestaetigt',behaelter:'offen',einsatzteil:'abweichend',sichtkontrolle:'offen'},
    {rueckfrage:['behaelter','sichtkontrolle'],abweichungen:['einsatzteil']}),

  tool('waschraum_unterschiedliche_abholbereitschaft',
    'Textilien einer gemeinsamen Waschraumablage erst auf bereits abholbare Stücke begrenzen — Split collection work into independently confirmed owners and readiness.',laundry,
    {kennzeichnung_geprueft:yes('Sind Kennzeichnungen und Abholstatus am gemeinsamen Platz geprüft?'),
      a_bereit:count('Abholbereite Stücke von Person A.'),a_offen:count('Weitere Stücke von A mit offenem Trocknen oder Prüfen.'),
      b_bereit:count('Abholbereite Stücke von Person B.'),nicht_zugeteilt:count('Weitere Stücke ohne sichere Zuordnung.'),
      heutige_abholung:pick('Person, die heute abholt.','a','b','beide')},
    ({kennzeichnung_geprueft,a_bereit,a_offen,b_bereit,nicht_zugeteilt,heutige_abholung})=>{
      whole(a_bereit,a_offen,b_bereit,nicht_zugeteilt);
      const collected=(heutige_abholung!=='b'?a_bereit:0)+(heutige_abholung!=='a'?b_bereit:0);
      return {heute_abholbar:kennzeichnung_geprueft?collected:0,
        spaeter_abholen:kennzeichnung_geprueft?a_bereit+b_bereit-collected:null,
        noch_bearbeiten:a_offen,zuordnung_klaeren:nicht_zugeteilt+(kennzeichnung_geprueft?0:a_bereit+b_bereit),
        grenze:'Abholstatus getrennt von der Zuordnung prüfen. Offene und geklärte Stücke getrennt bereitstellen.'};
    },{kennzeichnung_geprueft:true,a_bereit:4,a_offen:2,b_bereit:6,nicht_zugeteilt:1,heutige_abholung:'b'},
    {heute_abholbar:6,spaeter_abholen:4,noch_bearbeiten:2,zuordnung_klaeren:1}),

  tool('pflege_tiefenwechsel_reinigung_oberhalb_boden',
    'Beobachtete Boden-Nacharbeit vermeiden, indem freigegebene obere Pflegeschritte passend zur Bodenrunde abschließen — Check whether overhead work overlaps a finished floor pass.',wet,
    {abfolge_zulaessig:yes('Dürfen die betrachteten Pflegeschritte verändert angeordnet werden?'),
      oben_ende:clock('Geplantes Ende der betroffenen oberen Arbeiten einschließlich Rückstände aufnehmen.'),
      boden_start:clock('Beginn des vorgesehenen Bodenabschnitts darunter.'),
      boden_dauer:minute('Beobachtete Arbeitsdauer für genau diesen Abschnitt.'),
      fenster_ende:clock('Letzte mögliche Tagesminute für das Ende der Bodenarbeit.')},
    ({abfolge_zulaessig,oben_ende,boden_start,boden_dauer,fenster_ende})=>{
      if(boden_start>fenster_ende) throw new RangeError('Bodenfenster');
      const aligned=Math.max(oben_ende,boden_start);
      return {ueberschneidung_der_reihenfolge:oben_ende>boden_start,
        start_nach_oberer_arbeit:abfolge_zulaessig?round(aligned):null,
        im_fenster:abfolge_zulaessig?aligned+boden_dauer<=fenster_ende:null,
        grenze:'Für bereits freigegebene Verfahren und denselben Abschnitt. Sichtbar nachfallende Rückstände vor der Bodenrunde aufnehmen.'};
    },{abfolge_zulaessig:true,oben_ende:570,boden_start:563,boden_dauer:18,fenster_ende:590},
    {ueberschneidung_der_reihenfolge:true,start_nach_oberer_arbeit:570,im_fenster:true}),

  tool('textil_einzelwaesche_ausnahme_korb',
    'Bekannte Vorgaben für Einzelpflege vor der Verteilung einer gemischten Sammelmenge getrennt auflösen — Pull documented single-item exceptions out before grouping textiles.',closet,
    {hauptweg_bestaetigt:yes('Ist für die normalen Stücke derselbe Pflegeweg nach Etikett bestätigt?'),
      gemeinsam:count('Stücke mit demselben bestätigten Weg.'),einzeln:count('Weitere Stücke mit einzeln vorgeschriebener Pflege.'),
      abweichend:count('Weitere Stücke mit einem bekannten anderen Pflegeweg.'),unlesbar:count('Weitere Stücke, deren Pflegehinweis noch zu klären ist.'),
      einzelslots:count('Im Plan tatsächlich vorgesehene Einzeltermine.')},
    ({hauptweg_bestaetigt,gemeinsam,einzeln,abweichend,unlesbar,einzelslots})=>{
      whole(gemeinsam,einzeln,abweichend,unlesbar,einzelslots);
      return {im_hauptweg:hauptweg_bestaetigt?gemeinsam:0,einzeltermine_eingeplant:Math.min(einzeln,einzelslots),
        einzeltermine_offen:Math.max(0,einzeln-einzelslots),anderer_belegter_weg:abweichend,
        pflegeweg_klaeren:unlesbar+(hauptweg_bestaetigt?0:gemeinsam),grenze:'Für jedes Stück die genaue Pflegevorgabe einhalten. Die Gruppenzählung leitet kein Waschprogramm ab.'};
    },{hauptweg_bestaetigt:true,gemeinsam:10,einzeln:3,abweichend:4,unlesbar:1,einzelslots:2},
    {im_hauptweg:10,einzeltermine_eingeplant:2,einzeltermine_offen:1,anderer_belegter_weg:4,pflegeweg_klaeren:1}),

  tool('bodenpflege_kantenwechsel_wechselauflage',
    'Markierte Auflagen bei einem beobachteten Wechsel zwischen Arbeitsbereichen getrennt zurücklegen — Check a one-way clean/used transfer at a floor-care boundary.',wet,
    {auflageneinsatz_belegt:yes('Sind Auflagentausch und Ablagen für den Vorgang und beide Bereiche bestätigt?'),
      saubere_auflagen:count('Jetzt bereitliegende passende Auflagen vor dem Wechsel.'),
      abzugebende_auflagen:count('Beim beendeten Abschnitt getrennt zurückzugebende benutzte Auflagen.'),
      plaetze_benutzt:count('Freie gekennzeichnete Plätze für genau diese benutzten Auflagen.'),
      naechster_bedarf:count('Frische Auflagen für den nächsten Arbeitsabschnitt.')},
    ({auflageneinsatz_belegt,saubere_auflagen,abzugebende_auflagen,plaetze_benutzt,naechster_bedarf})=>{
      whole(saubere_auflagen,abzugebende_auflagen,plaetze_benutzt,naechster_bedarf);
      return {rueckgabeplaetze_offen:auflageneinsatz_belegt?Math.max(0,abzugebende_auflagen-plaetze_benutzt):null,
        frische_auflagen_offen:auflageneinsatz_belegt?Math.max(0,naechster_bedarf-saubere_auflagen):null,
        getrennte_uebergabe_moeglich:auflageneinsatz_belegt?saubere_auflagen>=naechster_bedarf && plaetze_benutzt>=abzugebende_auflagen:null,
        grenze:'Zwei getrennte Übergaben. Ersatzauflagen nur bei belegter Passung und geprüftem Zustand einsetzen.'};
    },{auflageneinsatz_belegt:true,saubere_auflagen:5,abzugebende_auflagen:4,plaetze_benutzt:3,naechster_bedarf:5},
    {rueckgabeplaetze_offen:1,frische_auflagen_offen:0,getrennte_uebergabe_moeglich:false}),

  tool('pflege_spuelbecken_belegt_ausweichfolge',
    'Zwei Spülschritte mit einem belegten gemeinsamen Becken koordinieren — Find a free complete rinse slot without interrupting a prerequisite.',wet,
    {beckennutzung_belegt:yes('Sind Becken, Reihenfolge und Spülvorgang für das konkrete Teil vorgesehen?'),
      bereit_ab:clock('Teil ist ab dieser Tagesminute für den Spülschritt vorbereitet.'),spuelzeit:minute('Ununterbrochene Dauer des Spülschritts.'),
      belegt_ab:clock('Beginn der anderen Beckennutzung.'),belegt_bis:clock('Ende der anderen Beckennutzung.'),abgabe_bis:clock('Tagesminute, bis zu der das Teil in die nächste Phase gehen soll.')},
    ({beckennutzung_belegt,bereit_ab,spuelzeit,belegt_ab,belegt_bis,abgabe_bis})=>{
      if(belegt_ab>belegt_bis || !spuelzeit) throw new RangeError('Beckenzeit');
      const start=bereit_ab+spuelzeit<=belegt_ab?bereit_ab:Math.max(bereit_ab,belegt_bis);
      const done=start+spuelzeit;
      return {fruehester_spuelbeginn:beckennutzung_belegt?round(start):null,
        beim_ziel_mehrzeit:beckennutzung_belegt?round(Math.max(0,done-abgabe_bis)):null,
        grenze:'Nur Tagesplan mit belegter Benutzung und einem durchgehenden Spülschritt. Anleitung und tatsächliche Verfügbarkeit entscheidend.'};
    },{beckennutzung_belegt:true,bereit_ab:635,spuelzeit:8,belegt_ab:640,belegt_bis:650,abgabe_bis:656},
    {fruehester_spuelbeginn:650,beim_ziel_mehrzeit:2}),

  tool('pflegeabschluss_zwei_quittungen_vorzeitigkeit',
    'Zwei dokumentierte Abschlüsse darauf prüfen, ob die Quittung zum richtigen Arbeitsschritt gehört — Detect close-out notes timestamped before their own work could finish.',workshop,
    {gleiche_runde:yes('Sind Uhr und zwei Arbeitsschritte in der tatsächlich protokollierten Reihenfolge eindeutig zugeordnet?'),
      erster_start:clock('Start des ersten Arbeitsschritts.'),erster_dauer:minute('Tatsächliche Dauer des ersten Schritts.'),
      erster_quittiert:clock('Tagesminute des zugehörigen ersten Häkchens.'),
      zweiter_start:clock('Start des zweiten Arbeitsschritts.'),zweiter_dauer:minute('Tatsächliche Dauer des zweiten Schritts.'),
      zweiter_quittiert:clock('Tagesminute des zugehörigen zweiten Häkchens.')},
    ({gleiche_runde,erster_start,erster_dauer,erster_quittiert,zweiter_start,zweiter_dauer,zweiter_quittiert})=>{
      const lag=[erster_quittiert-erster_start-erster_dauer,zweiter_quittiert-zweiter_start-zweiter_dauer];
      return {quittierung_minus_arbeitsende_min:gleiche_runde?lag.map(round):null,
        zu_frueh_quittiert:gleiche_runde?lag.flatMap((value,index)=>value<0?[['erster','zweiter'][index]]:[]):[],
        grenze:'Negative Werte markieren zeitlich verfrühte Einträge. Ein passender Zeitstempel beweist die Ausführung des Schritts nicht.'};
    },{gleiche_runde:true,erster_start:530,erster_dauer:7,erster_quittiert:542,zweiter_start:545,zweiter_dauer:9,zweiter_quittiert:552},
    {quittierung_minus_arbeitsende_min:[5,-2],zu_frueh_quittiert:['zweiter']}),

  tool('textil_markierung_abnahme_erst_nach_kontrolle',
    'Pflegekennzeichnung für vorübergehend zusammen bereitgelegte Stücke bis zur geprüften Abholung erhalten — Decide which temporary care tags can be removed after handover.',laundry,
    {zuordnung_belegt:yes('Lassen sich die Stücke und vorübergehenden Markierungen eindeutig zuordnen?'),
      abholung_quittiert:count('Mit bestätigter Abholung und geschlossener Einzeldokumentation.'),
      nur_bereitgelegt:count('Weitere bereitgelegte, aber nicht abgeholte Stücke.'),
      extra_pruefung:count('Weitere Stücke mit offenem Pflegeschritt.'),
      markierungen_ersetzt:count('Von den nicht abgeholten Stücken mit sicher ersetzter vorübergehender Markierung.')},
    ({zuordnung_belegt,abholung_quittiert,nur_bereitgelegt,extra_pruefung,markierungen_ersetzt})=>{
      whole(abholung_quittiert,nur_bereitgelegt,extra_pruefung,markierungen_ersetzt);
      if(markierungen_ersetzt>nur_bereitgelegt) throw new RangeError('Ersetzte Markierungen');
      return {alte_markierung_entfernbar:zuordnung_belegt?abholung_quittiert+markierungen_ersetzt:0,
        alte_markierung_noch_benoetigt:zuordnung_belegt?nur_bereitgelegt+extra_pruefung-markierungen_ersetzt:null,
        grenze:'Nur selbst angebrachte vorübergehende Markierungen bewerten. Die originalen Pflegeetiketten bleiben maßgeblich.'};
    },{zuordnung_belegt:true,abholung_quittiert:4,nur_bereitgelegt:5,extra_pruefung:2,markierungen_ersetzt:2},
    {alte_markierung_entfernbar:6,alte_markierung_noch_benoetigt:5}),

  tool('pflege_tischfreigabe_zwei_genutzte_seiten',
    'Bei geteilter Arbeitsfläche geprüft freie und noch beanspruchte Seiten vor Rückkehr der nächsten Person abgleichen — Confirm whether a person needs one side or the entire shared surface.',workshop,
    {von_beiden_kontrolliert:yes('Sind beide Seiten auf aktuellen Zustand und verbindliche Belegung geprüft?'),
      a:pick('Status der ersten Seite.','frei_geprueft','benutzt','offen'),b:pick('Status der zweiten Seite.','frei_geprueft','benutzt','offen'),
      naechster_bedarf:pick('Platzbedarf der nächsten Aufgabe.','eine_seite','beide_seiten')},
    ({von_beiden_kontrolliert,a,b,naechster_bedarf})=>{
      const ready=[a,b].flatMap((value,index)=>value==='frei_geprueft'?[['a','b'][index]]:[]);
      const required=naechster_bedarf==='eine_seite'?1:2;
      return {belegbar:von_beiden_kontrolliert?ready:[],weitere_seiten_noetig:von_beiden_kontrolliert?Math.max(0,required-ready.length):null,
        grenze:'Bereit bedeutet hier frei und vor Ort geprüft. Für getrennt zu haltende Arbeitsmittel weiterhin passende Stellflächen einplanen.'};
    },{von_beiden_kontrolliert:true,a:'frei_geprueft',b:'offen',naechster_bedarf:'beide_seiten'},
    {belegbar:['a'],weitere_seiten_noetig:1}),

  tool('kleiderschrank_trockene_zwischenlagerung_umraeumfolge',
    'Trockene Textilien während einer belegten Schrankpflege mit begrenzten Zwischenplätzen umräumen — Check whether phased move-out can fit without compressing or stacking extra pieces.',closet,
    {zwischenplatz_geprueft:yes('Sind Zwischenplätze trocken und für die Stücke ausreichend und ist abschnittsweises Vorgehen möglich?'),
      a:count('Stücke im Fach A, das zuerst frei geräumt wird.'),b:count('Stücke im Fach B.'),
      zwischenplaetze:count('Separat nutzbare Plätze an geeignetem Zwischenort.'),
      a_vor_b_zurueck:yes('Kann Fach A nach tatsächlicher Kontrolle vor dem Räumen von B wieder bestückt werden?')},
    ({zwischenplatz_geprueft,a,b,zwischenplaetze,a_vor_b_zurueck})=>{
      whole(a,b,zwischenplaetze);
      const peak=a_vor_b_zurueck?Math.max(a,b):a+b;
      return {zeitgleich_noetige_plaetze:zwischenplatz_geprueft?peak:null,
        weitere_zwischenplaetze:zwischenplatz_geprueft?Math.max(0,peak-zwischenplaetze):null,
        grenze:'Rücke nur tatsächlich trockene Stücke auf belegbar geeignete Plätze. Umfang und Ursache eines Feuchteproblems getrennt prüfen.'};
    },{zwischenplatz_geprueft:true,a:6,b:9,zwischenplaetze:10,a_vor_b_zurueck:true},
    {zeitgleich_noetige_plaetze:9,weitere_zwischenplaetze:0}),

  tool('pflege_urspruenglicher_platz_nach_entleeren',
    'Ein Arbeitsgefäß nach der vorgesehenen Leerung zur richtigen Ablage zurückführen — Reconcile a container’s return condition with its marked storage place.',humidifier,
    {ablauf_geprueft:yes('Sind Entleerung und weitere vorgeschriebene Pflege für dieses Gefäß eindeutig dokumentiert?'),
      entleert:yes('Ist das Gefäß tatsächlich vollständig entleert?'),entleeren_ausreichend:yes('Nennt die Anleitung für diese Ablage das leere Gefäß als ausreichend?'),
      weitere_pflege_bestaetigt:yes('Ist die gegebenenfalls erforderliche weitere Pflege für genau dieses Gefäß quittiert?'),
      regelplatz_verfuegbar:yes('Ist sein markierter Lagerplatz tatsächlich frei und für seinen jetzigen Zustand geeignet?')},
    ({ablauf_geprueft,entleert,entleeren_ausreichend,weitere_pflege_bestaetigt,regelplatz_verfuegbar})=>{
      const steps=[['entleerung',entleert],['pflege',entleeren_ausreichend||weitere_pflege_bestaetigt],['lagerplatz',regelplatz_verfuegbar]];
      return {offene_punkte:ablauf_geprueft?steps.filter(([,complete])=>!complete).map(([name])=>name):['ablauf'],
        regelplatz_einplanen:ablauf_geprueft&&steps.every(([,complete])=>complete),
        grenze:'Quittiert nur den eingegebenen Bearbeitungsstand. Weitere Anforderungen am genauen Gefäß und am Lagerplatz prüfen.'};
    },{ablauf_geprueft:true,entleert:true,entleeren_ausreichend:false,weitere_pflege_bestaetigt:false,regelplatz_verfuegbar:true},
    {offene_punkte:['pflege'],regelplatz_einplanen:false}),

  tool('pflege_packen_nach_eigenen_pruefpunkten',
    'Zusammen gehörende Teile erst nach ihren getrennten Kontrollen zu einem Pflegeset packen — Determine the earliest pack-up time when each component has a separate check.',cleaner,
    {packen_belegt:yes('Ist die geplante Verpackung nach der Vorgabe erlaubt, und sind die Prüfpunkte für genau diese Gruppe dokumentiert?'),
      a_geprueft_ab:clock('Früheste eingeplante Kontrolle für Teil A.'),b_geprueft_ab:clock('Früheste eingeplante Kontrolle für Teil B.'),
      c_geprueft_ab:clock('Früheste eingeplante Kontrolle für Teil C.'),packen_bis:clock('Gewünschter spätester Beginn des Packens.')},
    ({packen_belegt,a_geprueft_ab,b_geprueft_ab,c_geprueft_ab,packen_bis})=>{
      const times=[a_geprueft_ab,b_geprueft_ab,c_geprueft_ab];
      const latest=Math.max(...times);
      return {packtermin_fruehestens:packen_belegt?latest:null,
        bestimmen_packtermin:packen_belegt?times.flatMap((value,index)=>value===latest?[['a','b','c'][index]]:[]):[],
        spaeter_einplanen:packen_belegt?round(Math.max(0,latest-packen_bis)):null,
        grenze:'Prüfzeit ist kein bestandener Check. Nur tatsächlich kontrollierte und nach Anleitung geeignete Teile einpacken.'};
    },{packen_belegt:true,a_geprueft_ab:590,b_geprueft_ab:630,c_geprueft_ab:630,packen_bis:615},
    {packtermin_fruehestens:630,bestimmen_packtermin:['b','c'],spaeter_einplanen:15}),

  tool('textilpflege_entnehmbarer_einsatz_zuerst_abtrennen',
    'Abnehmbare Einlagen vor getrennter Textilpflege auf fehlende Zuordnung zum Hauptstück prüfen — Keep detachable inserts matched to their original textile before separate care.',closet,
    {einlagentrennung_belegt:yes('Erlaubt die Pflegeanleitung die Entnahme und wurden Einlagen sowie Teile eindeutig zugeordnet?'),
      abnehmbare_teile:count('Hauptstücke mit genau einer separat zu pflegenden Einlage.'),
      einlagen_entnommen:count('Davon tatsächlich entnommene Einlagen.'),
      sicher_markiert:count('Davon zusätzlich eindeutig dem jeweiligen Hauptstück zugeordnete Einlagen.'),
      pflegeweg_einlagen_bekannt:yes('Ist der getrennte Pflegeweg dieser Einlagen bestätigt?')},
    ({einlagentrennung_belegt,abnehmbare_teile,einlagen_entnommen,sicher_markiert,pflegeweg_einlagen_bekannt})=>{
      whole(abnehmbare_teile,einlagen_entnommen,sicher_markiert);
      if(sicher_markiert>einlagen_entnommen||einlagen_entnommen>abnehmbare_teile) throw new RangeError('Reihenfolge der Stückzahlen');
      return {einlagen_noch_im_hauptstueck:einlagentrennung_belegt?abnehmbare_teile-einlagen_entnommen:null,
        offen_zuordnen:einlagentrennung_belegt?einlagen_entnommen-sicher_markiert:null,
        getrennt_zur_bestaetigten_pflege:einlagentrennung_belegt&&pflegeweg_einlagen_bekannt?sicher_markiert:0,
        grenze:'Die Statistik ersetzt die Pflegekennzeichnungen nicht. Hauptstücke und Einlagen nur mit belegtem getrenntem Ablauf sortieren.'};
    },{einlagentrennung_belegt:true,abnehmbare_teile:6,einlagen_entnommen:4,sicher_markiert:3,pflegeweg_einlagen_bekannt:true},
    {einlagen_noch_im_hauptstueck:2,offen_zuordnen:1,getrennt_zur_bestaetigten_pflege:3}),

  tool('pflege_benutztes_set_durchgang_zum_sammelplatz',
    'Benutzte Teile auf belegter direkter Route zur Sammelstelle bewegen, bevor der gemeinsame Zugang angefragt wird — Check whether a used-item return blocks a separate planned access window.',wet,
    {routenfreigabe:yes('Sind Sammelstelle, Weg und getrennter Transport dieser benutzten Teile belegt?'),
      route_start:clock('Abmarsch zur Sammelstelle.'),hinweg:minute('Beobachtete Dauer bis dorthin.'),abgabe:minute('Beobachtete Dauer der Abgabe.'),
      rueckweg:minute('Beobachtete Dauer für die Rückkehr.'),zugang_ab:clock('Zeit, zu der die andere Nutzung den Durchgang benötigt.'),
      rueckweg_gleicher_engpass:yes('Wird derselbe nur einzeln nutzbare Durchgang auch bei der Rückkehr belegt?')},
    ({routenfreigabe,route_start,hinweg,abgabe,rueckweg,zugang_ab,rueckweg_gleicher_engpass})=>{
      const until=route_start+hinweg+(rueckweg_gleicher_engpass?abgabe+rueckweg:0);
      return {durchgang_puffer_min:routenfreigabe?round(zugang_ab-until):null,
        plan:!routenfreigabe?'weg_und_sammelort_klaeren':until<=zugang_ab?'getrennter_zugang_im_plan':'zugang_zeitlich_trennen',
        grenze:'Planungszeiten bei tatsächlich nur einzeln verfügbarem Zugang. Das Tool prüft keine körperliche Tragbarkeit.'};
    },{routenfreigabe:true,route_start:510,hinweg:5,abgabe:3,rueckweg:7,zugang_ab:522,rueckweg_gleicher_engpass:true},
    {durchgang_puffer_min:-3,plan:'zugang_zeitlich_trennen'}),

  tool('pflege_ungeplante_abgaenge_trockene_reserve',
    'Für einen abgebrochenen Pflegeschritt zwischen bestätigtem Ersatz und offenem Rücklauf unterscheiden — Keep replacement stock separate from incomplete items after a care interruption.',robot,
    {freigaben_belegt:yes('Sind die konkreten Ersatzteile geprüft und bereits für den Einsatz bereit?'),
      abschnitt_bedarf:count('Teile des betrachteten Typs für den nächsten Abschnitt.'),eingesetzt:count('Bereits passend in diesem Abschnitt eingesetzte Teile.'),
      unabh_reserve:count('Weitere bestätigte saubere und passende Teile.'),
      unterbrochene_pflege:count('Weitere Teile, die nach Unterbrechung erst geprüft werden müssen.')},
    ({freigaben_belegt,abschnitt_bedarf,eingesetzt,unabh_reserve,unterbrochene_pflege})=>{
      whole(abschnitt_bedarf,eingesetzt,unabh_reserve,unterbrochene_pflege);
      if(eingesetzt>abschnitt_bedarf) throw new RangeError('Gezählte eingesetzte Teile');
      const missing=abschnitt_bedarf-eingesetzt;
      const reserve=freigaben_belegt?Math.min(missing,unabh_reserve):0;
      return {ersatz_bereitstellen:reserve,auch_mit_reserve_offen:missing-reserve,
        getrennt_zur_pflege:unterbrochene_pflege,grenze:'Offene Teile bleiben getrennt. Geplante Reserve nicht als erfolgten Pflegeschritt verbuchen.'};
    },{freigaben_belegt:true,abschnitt_bedarf:5,eingesetzt:1,unabh_reserve:2,unterbrochene_pflege:4},
    {ersatz_bereitstellen:2,auch_mit_reserve_offen:2,getrennt_zur_pflege:4}),

  tool('pflege_schrittfolge_aufgabe_naechster_offener_schritt',
    'Eine ausdrücklich linear vorgeschriebene Pflegefolge mit beobachteten Abschlüssen fortsetzen — Find the first unresolved prerequisite in a fixed care sequence.',tineco,
    {dokumentierte_reihenfolge:yes('Sind diese vier Schritte in genau dieser Reihenfolge für das konkrete Gerät vorgesehen?'),
      entleert:yes('Wurde der vorgeschriebene Entleerungsschritt bestätigt?'),gespuelt:yes('Wurde der folgende vorgeschriebene Spülschritt bestätigt?'),
      getrocknet:yes('Wurde die Trocknung nach den Vorgaben bestätigt?'),zusammengesetzt:yes('Wurde der anschließende Zusammenbau quittiert?')},
    ({dokumentierte_reihenfolge,entleert,gespuelt,getrocknet,zusammengesetzt})=>{
      const observed=[entleert,gespuelt,getrocknet,zusammengesetzt];
      const phases=['entleeren','spuelen','trocknen','zusammensetzen'];
      const first=observed.indexOf(false);
      return {naechster_abgleich:!dokumentierte_reihenfolge?'reihenfolge_belegen':first<0?'endzustand_vor_ort_checken':phases[first],
        spaetere_eintraege_klaeren:dokumentierte_reihenfolge&&first>=0?phases.filter((_,index)=>index>first&&observed[index]):[],
        grenze:'Dieser Ablauf gilt nur, wenn ihn die Anleitung für das genaue Teil bestätigt. Eine Quittierung hebt frühere offene Schritte nicht auf.'};
    },{dokumentierte_reihenfolge:true,entleert:true,gespuelt:false,getrocknet:true,zusammengesetzt:false},
    {naechster_abgleich:'spuelen',spaetere_eintraege_klaeren:['trocknen']}),

  tool('pflegegruppe_ein_teil_bearbeitet_rest_nachhalten',
    'Eine bestätigte Gruppenpflege nach einem betroffenen Einzelteil erneut abgrenzen — Identify which finished groups need a repeat check after one piece was involved.',cleaner,
    {trennung_belegt:yes('Sind Gruppen und Ereignis vor Ort eindeutig erfasst?'),
      teil_a:pick('Beobachtung zur fertig abgelegten Gruppe A.','getrennt','betroffen','offen'),
      teil_b:pick('Beobachtung zur fertig abgelegten Gruppe B.','getrennt','betroffen','offen'),
      teil_c:pick('Beobachtung zur fertig abgelegten Gruppe C.','getrennt','betroffen','offen'),
      folge_bekannt:yes('Ist die gegebenenfalls nötige Reaktion für betroffene Teile dokumentiert?')},
    ({trennung_belegt,teil_a,teil_b,teil_c,folge_bekannt})=>{
      const groups=[['a',teil_a],['b',teil_b],['c',teil_c]];
      return {fertig_belassen:trennung_belegt?groups.filter(([,state])=>state==='getrennt').map(([name])=>name):[],
        erneut_pruefen:trennung_belegt&&folge_bekannt?groups.filter(([,state])=>state==='betroffen').map(([name])=>name):[],
        zuerst_klaeren:groups.filter(([,state])=>!trennung_belegt||state==='offen'||state==='betroffen'&&!folge_bekannt).map(([name])=>name),
        grenze:'Nur dokumentierte Maßnahmen der passenden Anleitung. Das Tool entscheidet nicht über Wirksamkeit oder Ursache.'};
    },{trennung_belegt:true,teil_a:'betroffen',teil_b:'getrennt',teil_c:'offen',folge_bekannt:true},
    {fertig_belassen:['b'],erneut_pruefen:['a'],zuerst_klaeren:['c']}),

  tool('pflege_tuchseite_beobachteter_wechselpunkt',
    'Bei einer erlaubten Tuchwendung die beobachtete Stückzahl pro frischer Seite ohne Übertrag ausrechnen — Estimate how many allowed fresh-face changes are needed for a grouped task.',wet,
    {seitenfolge_zulaessig:yes('Ist die vorgesehene Nutzung frischer Seiten bei dieser Aufgabe zulässig und am Material erprobt?'),
      abschnitte:count('Kleine gleichartige Abschnitte in der geplanten zusammenhängenden Gruppe.'),
      pro_seite:count('Beobachtete Anzahl solcher Abschnitte bis zur eigenen definierten Seitenwechsel-Grenze.'),
      pro_tuch:count('Unabhängig verwendbare, belegbar frische Seiten je vorbereitetem Tuch.'),
      tuecher:count('Passende Tücher für diese eine Gruppe im sauberen Vorrat.')},
    ({seitenfolge_zulaessig,abschnitte,pro_seite,pro_tuch,tuecher})=>{
      whole(abschnitte,pro_seite,pro_tuch,tuecher);
      if(!pro_seite || !pro_tuch) throw new RangeError('Beobachtete Teilkapazität');
      const sides=Math.ceil(abschnitte/pro_seite);
      return {frische_seiten_einplanen:seitenfolge_zulaessig?sides:null,
        ganze_tuecher_einplanen:seitenfolge_zulaessig?Math.ceil(sides/pro_tuch):null,
        abschnitte_ohne_freie_seite:seitenfolge_zulaessig?Math.max(0,abschnitte-tuecher*pro_tuch*pro_seite):null,
        grenze:'Gilt nicht über Gruppen hinweg. Zustand, getrennte Flächen und tatsächlichen Wechsel vor Ort prüfen; keine Aussage zur Reinigungswirkung.'};
    },{seitenfolge_zulaessig:true,abschnitte:17,pro_seite:3,pro_tuch:2,tuecher:2},
    {frische_seiten_einplanen:6,ganze_tuecher_einplanen:3,abschnitte_ohne_freie_seite:5}),

  tool('pflege_notiz_vor_reset_quittierung_ohne_verlust',
    'Vor einem dokumentierten Bedienungsreset prüfen, ob nur bestätigte abgeschlossene Aufgaben ausgeblendet werden — Preserve unresolved upkeep notes before a reset or dismissal.',filters,
    {reset_belegt:yes('Sind Anlass und Reset-Wirkung für genau diese Anzeige dokumentiert?'),
      bearbeitet_bestaetigt:yes('Ist der zum Reset gehörende tatsächliche Pflegeschritt quittiert?'),
      weitere_anzeigen:count('Zusätzliche Meldungen, die laut Dokumentation mit verschwinden würden.'),
      davon_ausserhalb_notiert:count('Davon separat mit bisherigem Bearbeitungsstand festgehalten.')},
    ({reset_belegt,bearbeitet_bestaetigt,weitere_anzeigen,davon_ausserhalb_notiert})=>{
      whole(weitere_anzeigen,davon_ausserhalb_notiert);
      if(davon_ausserhalb_notiert>weitere_anzeigen) throw new RangeError('Anzahl der Zusatzmeldungen');
      return {vorab_noch_dokumentieren:reset_belegt?weitere_anzeigen-davon_ausserhalb_notiert:null,
        status:!reset_belegt?'reset_auswirkung_klaeren':!bearbeitet_bestaetigt?'pflege_quittierung_fehlend':weitere_anzeigen!==davon_ausserhalb_notiert?'zusatzmeldungen_sichern':'belegten_bedienweg_pruefen',
        grenze:'Löst keinen Reset aus. Bedienungsanleitung und tatsächlichen Pflegezustand beachten.'};
    },{reset_belegt:true,bearbeitet_bestaetigt:true,weitere_anzeigen:3,davon_ausserhalb_notiert:1},
    {vorab_noch_dokumentieren:2,status:'zusatzmeldungen_sichern'}),

  tool('textil_nahtbereit_gegen_falte_umlegen',
    'Beim Umlegen eines bereits kontrollierten Stücks nicht erneut belegte Prüfpunkte erkennen — Keep track of textile checks whose accessibility changed after refolding.',laundry,
    {punkte_identifiziert:yes('Sind dieselben Stellen vor und nach dem Umlegen eindeutig identifiziert?'),
      sichtpunkte:count('Insgesamt vorgesehene Prüfpunkte.'),schon_kontrolliert:count('Vor dem Umlegen bereits kontrollierte Punkte.'),
      danach_verdeckt:count('Nach dem Umlegen verdeckte Punkte.'),davon_schon_kontrolliert:count('Schnittmenge der verdeckten und bereits kontrollierten Punkte.')},
    ({punkte_identifiziert,sichtpunkte,schon_kontrolliert,danach_verdeckt,davon_schon_kontrolliert})=>{
      whole(sichtpunkte,schon_kontrolliert,danach_verdeckt,davon_schon_kontrolliert);
      if(davon_schon_kontrolliert>Math.min(danach_verdeckt,schon_kontrolliert)||schon_kontrolliert+danach_verdeckt-davon_schon_kontrolliert>sichtpunkte) throw new RangeError('Nicht vereinbare Prüfpunkte');
      const hidden=danach_verdeckt-davon_schon_kontrolliert;
      return {zum_pruefen_wieder_entfalten:punkte_identifiziert?hidden:null,
        unmittelbar_sichtbar_und_offen:punkte_identifiziert?sichtpunkte-schon_kontrolliert-hidden:null,
        grenze:'Prüfpunkte sind keine Garantie für den Gesamtzustand. Langes Zwischenlagern kann eine erneute Prüfung erforderlich machen.'};
    },{punkte_identifiziert:true,sichtpunkte:9,schon_kontrolliert:5,danach_verdeckt:4,davon_schon_kontrolliert:2},
    {zum_pruefen_wieder_entfalten:2,unmittelbar_sichtbar_und_offen:2}),

  tool('pflege_ablage_trocken_teillieferung_reihenfolge',
    'Vorbereitete Trockenplätze bei unterbrochenem Rücklauf so reservieren, dass priorisierte Stücke Platz behalten — Reserve a fixed portion of the drying area for a later required group.',laundry,
    {plaetze_freigegeben:yes('Sind Ablauf und getrennte Trockenplätze für die vorgesehenen Gruppen bestätigt?'),
      plaetze_gesamt:count('Geeignete und derzeit nicht anderweitig belegte Plätze.'),frueh_vorhanden:count('Stücke der aktuell angekommenen Gruppe.'),
      spaeter_prioritaet:count('Für die später vorrangige Gruppe zu reservierende Plätze.'),
      frueh_muss_gleich:count('Davon Stücke, die nach belegter eigener Planung nicht später anfangen können.')},
    ({plaetze_freigegeben,plaetze_gesamt,frueh_vorhanden,spaeter_prioritaet,frueh_muss_gleich})=>{
      whole(plaetze_gesamt,frueh_vorhanden,spaeter_prioritaet,frueh_muss_gleich);
      if(frueh_muss_gleich>frueh_vorhanden) throw new RangeError('Frühbedarf');
      const reserved=Math.min(plaetze_gesamt,spaeter_prioritaet);
      const early=Math.min(frueh_vorhanden,plaetze_gesamt-reserved);
      return {frueh_verplanbar:plaetze_freigegeben?early:null,
        aktuell_dringend_offen:plaetze_freigegeben?Math.max(0,frueh_muss_gleich-early):null,
        spaet_priorisiert_fehlend:plaetze_freigegeben?spaeter_prioritaet-reserved:null,
        grenze:'Früh belegte Plätze bleiben im Modell bis zum späteren Termin belegt. Tatsächliche Eignung, Luftwege und Trockenzustand prüfen.'};
    },{plaetze_freigegeben:true,plaetze_gesamt:12,frueh_vorhanden:8,spaeter_prioritaet:7,frueh_muss_gleich:6},
    {frueh_verplanbar:5,aktuell_dringend_offen:1,spaet_priorisiert_fehlend:0}),

  tool('waschraum_uebergabebeutel_tara_einzeln_erfassen',
    'Bei geteilter Wäsche den zu übergebenden Teil ohne unterschiedliche Beutelgewichte nachvollziehen — Verify the net handover mass after independently taring both bags.',drying,
    {gleiche_charge:yes('Sind Ausgangsgewicht, zurückbehaltener Teil und gemessene Übergabe derselben Gruppe zugeordnet?'),
      start_netto_g:mass('Bekannte Netto-Ausgangsmasse der Gruppe bei gleichem Feuchtezustand.'),
      rueck_brutto_g:mass('Gemessene Bruttomasse des zurückbehaltenen Teils mit Beutel.'),rueck_tara_g:mass('Gemessene Masse dieses leeren Beutels.'),
      abgabe_brutto_g:mass('Gemessene Bruttomasse der Übergabe mit anderem Beutel.'),abgabe_tara_g:mass('Gemessene Masse des leeren Übergabebeutels.'),
      messspanne_g:mass('Selbst ermittelte kombinierte Messspanne.')},
    ({gleiche_charge,start_netto_g,rueck_brutto_g,rueck_tara_g,abgabe_brutto_g,abgabe_tara_g,messspanne_g})=>{
      const left=rueck_brutto_g-rueck_tara_g, given=abgabe_brutto_g-abgabe_tara_g;
      if(left<0 || given<0 || !start_netto_g) throw new RangeError('Brutto und Tara');
      const delta=left+given-start_netto_g;
      return {abgabe_netto_g:round(given),abweichung_gesamt_g:gleiche_charge?round(delta):null,
        nachwiegen:gleiche_charge?Math.abs(delta)>messspanne_g:null,
        grenze:'Nur bei nachweislich gleichem Feuchtezustand bilanzieren. Gleiche Masse beweist keinen identischen Inhalt.'};
    },{gleiche_charge:true,start_netto_g:1000,rueck_brutto_g:455,rueck_tara_g:80,abgabe_brutto_g:650,abgabe_tara_g:50,messspanne_g:15},
    {abgabe_netto_g:600,abweichung_gesamt_g:-25,nachwiegen:true}),

  tool('pflege_entnahmeteil_nachlauf_fremde_benutzung',
    'Nach einer dokumentierten Zwischenentnahme feststellen, welche spätere Benutzung die ursprüngliche Pflegeprüfung berührt — Check if interim use invalidates one part’s prior handover check.',humidifier,
    {ereignisse_belegt:yes('Sind die Ereignisse am selben zugänglichen Teil lückenlos in ihrer Zeitfolge belegt?'),
      pflege_ende:clock('Tagesminute der bestätigten Pflege an diesem Teil.'),
      entnahme_min:clock('Tagesminute der folgenden Zwischenentnahme.'),entnahme_nachbearbeitung:yes('Ist nach dieser Entnahme laut passender Anleitung erneut ein Bearbeitungsschritt erforderlich?'),
      rueckgabe_ohne_nutzung:yes('Wurde das Teil ohne Benutzung und unter dokumentiert gleichen zulässigen Bedingungen zurückgegeben?')},
    ({ereignisse_belegt,pflege_ende,entnahme_min,entnahme_nachbearbeitung,rueckgabe_ohne_nutzung})=>{
      if(entnahme_min<pflege_ende) throw new RangeError('Reihenfolge');
      return {zeit_seit_pflege_min:ereignisse_belegt?round(entnahme_min-pflege_ende):null,
        status:!ereignisse_belegt?'letzte_entnahme_klaeren':entnahme_nachbearbeitung||!rueckgabe_ohne_nutzung?'teil_vor_weitergabe_erneut_pruefen':'vorliegenden_pflegestand_zuordnen',
        grenze:'Nur vorhandene Vorgaben und beobachtete Benutzung zuordnen. Keine Ferndiagnose für den Zustand eines Teils.'};
    },{ereignisse_belegt:true,pflege_ende:625,entnahme_min:649,entnahme_nachbearbeitung:false,rueckgabe_ohne_nutzung:false},
    {zeit_seit_pflege_min:24,status:'teil_vor_weitergabe_erneut_pruefen'}),

  tool('pflege_stellflaeche_schutzauflage_abnehmen',
    'Bei einer geschützten Arbeitsfläche die Nachkontrolle nach tatsächlicher Abnahme der Auflage erfassen — Check the hand-back state after a protective sheet is removed.',wet,
    {verwendung_belegt:yes('Ist die Auflage bei dieser Arbeit zulässig und ist der vorgesehene Abschluss der Fläche bekannt?'),
      auflage_abgenommen:yes('Ist die Auflage vollständig separat weggelegt?'),
      flaeche_oben_gecheckt:yes('Ist die Fläche unter der Auflage nach Abnahme geprüft?'),
      kante_gecheckt:yes('Ist die tatsächlich berührte Kante nach Abnahme geprüft?'),
      auffaellig:yes('Wurde nach der Abnahme eine Abweichung wie Restfeuchte oder Rückstand beobachtet?')},
    ({verwendung_belegt,auflage_abgenommen,flaeche_oben_gecheckt,kante_gecheckt,auffaellig})=>({
      oberflaeche_und_kante_geprueft:verwendung_belegt&&auflage_abgenommen&&flaeche_oben_gecheckt&&kante_gecheckt,
      status:!verwendung_belegt?'ablauf_belegen':!auflage_abgenommen?'auflage_getrennt_weglegen':auffaellig?'abweichung_abklaeren':
        !flaeche_oben_gecheckt||!kante_gecheckt?'abgedeckte_bereiche_kontrollieren':'zustand_fuer_uebergabe_quittieren',
      grenze:'Nur tatsächlich beobachtete Punkte am Arbeitsort. Die Auflage allein belegt keinen bereitstehenden Oberflächenzustand.'
    }),{verwendung_belegt:true,auflage_abgenommen:true,flaeche_oben_gecheckt:true,kante_gecheckt:false,auffaellig:false},
    {oberflaeche_und_kante_geprueft:false,status:'abgedeckte_bereiche_kontrollieren'}),

  tool('pflege_ausruestung_geordneter_handwechsel',
    'Mit beobachteten Handgriffen prüfen, ob die nötigen Teile ohne ungeplante gemeinsame Ablage erreichbar bleiben — Find handover steps that need an independent temporary place.',workshop,
    {handgriffe_geprueft:yes('Stammen alle Zahlen aus derselben beobachteten Folge mit passenden Stellplätzen?'),
      greifmittel:count('Teile, die beim ersten geplanten Griff beide Hände oder denselben Ablagepunkt belegen.'),
      schon_sicher_abgestellt:count('Davon vor dem nächsten Griff getrennt und geeignet abgelegt.'),
      zwischenplaetze:count('Weitere passende freie Zwischenplätze vor dem nächsten Griff.'),
      griff_brauch_frei:yes('Benötigt der nächste Griff vorher alle bisher noch gehaltenen Teile weggelegt?')},
    ({handgriffe_geprueft,greifmittel,schon_sicher_abgestellt,zwischenplaetze,griff_brauch_frei})=>{
      whole(greifmittel,schon_sicher_abgestellt,zwischenplaetze);
      if(schon_sicher_abgestellt>greifmittel) throw new RangeError('Ablagezählung');
      const need=griff_brauch_frei?greifmittel-schon_sicher_abgestellt:0;
      return {weitere_teile_ablegen:handgriffe_geprueft?need:null,
        fehlende_ablageplaetze:handgriffe_geprueft?Math.max(0,need-zwischenplaetze):null,
        grenze:'Zählt Plätze für bereits beobachtete Handgriffe. Tragbarkeit, Freiraum und Eignung für nasse Teile vor Ort prüfen.'};
    },{handgriffe_geprueft:true,greifmittel:4,schon_sicher_abgestellt:1,zwischenplaetze:2,griff_brauch_frei:true},
    {weitere_teile_ablegen:3,fehlende_ablageplaetze:1}),

  tool('duschplatz_abziehen_und_kante_getrennt_uebergeben',
    'Gemeinsame Badpflege an Duschfläche und Rand gezielt quittieren — Separate the squeegee pass from the edge-wipe handover.',bath,
    {flaechen_belegt:yes('Sind die tatsächlich zu pflegenden Flächen und der zulässige Ablauf bekannt?'),
      abziehen:attention('Beobachteter Abschluss am vorgesehenen Duschwandabschnitt.'),kante:attention('Beobachteter Abschluss an der vorgesehenen Kante.'),
      neu_benetzt:yes('Wurde der Arbeitsbereich nach der Abschlussmeldung erneut benutzt und benetzt?')},
    ({flaechen_belegt,abziehen,kante,neu_benetzt})=>{
      const tasks=[['duschwand',abziehen],['kante',kante]];
      return {gezielt_pruefen:flaechen_belegt?tasks.filter(([,state])=>state!=='bestaetigt'||neu_benetzt).map(([name])=>name):['flaechenzuordnung'],
        status:!flaechen_belegt?'pflegebereich_klaeren':neu_benetzt?'neue_benutzung_eintragen':tasks.some(([,state])=>state!=='bestaetigt')?'offenen_handgriff_abgleichen':'abschluss_getrennt_erfasst',
        grenze:'Quittiert beobachtete Handgriffe. Beurteilt weder Feuchteursache noch Wirksamkeit.'};
    },{flaechen_belegt:true,abziehen:'bestaetigt',kante:'offen',neu_benetzt:false},
    {gezielt_pruefen:['kante'],status:'offenen_handgriff_abgleichen'}),

  tool('bad_fugenplan_abschnitte_nach_material_trennen',
    'Unbekannte und auffällige Fugenabschnitte aus einer bereits dokumentierten Pflegeroutine herausnehmen — Partition routine joint-care sections from unresolved materials and damage.',bath,
    {freigabe_geprueft:yes('Ist die passende Pflegeroutine für die bereits identifizierten und intakten Abschnitte belegt?'),
      intakter_moertel:count('Bekannte intakte Mörtelabschnitte.'),intaktes_silikon:count('Weitere bekannte intakte Silikonabschnitte.'),
      material_offen:count('Weitere Abschnitte mit unbekanntem Material.'),fuge_auffaellig:count('Weitere auffällige Abschnitte, deren Zustand zuerst begutachtet werden muss.')},
    ({freigabe_geprueft,intakter_moertel,intaktes_silikon,material_offen,fuge_auffaellig})=>{
      whole(intakter_moertel,intaktes_silikon,material_offen,fuge_auffaellig);
      return {routine_moertel_silikon:freigabe_geprueft?[intakter_moertel,intaktes_silikon]:null,
        material_klaeren:material_offen,zustand_abklaeren:fuge_auffaellig,
        grenze:'Nur disjunkte Abschnitte zählen. Kein Pflegemittel ableiten, keine Ferndiagnose und keine Zusage, dass eine auffällige Fuge durch Pflege instand gesetzt wird.'};
    },{freigabe_geprueft:true,intakter_moertel:6,intaktes_silikon:2,material_offen:1,fuge_auffaellig:2},
    {routine_moertel_silikon:[6,2],material_klaeren:1,zustand_abklaeren:2}),

  tool('pflege_teilrunde_arbeitsmittel_als_gruppe_zurueck',
    'Einfach zusammengehörige Arbeitsteile erst nach vollzähligem Rücklauf als Set zusammenlegen — Find which necessary member is missing from a partial return.',workshop,
    {satz_zuordnung:yes('Ist die Kombination der Teile für diese Haushaltstätigkeit eindeutig dokumentiert?'),
      griff:pick('Rücklaufstatus des ersten vorgesehenen Teils.','an_ablage','noch_im_einsatz','nicht_zugeordnet'),
      einsatzteil:pick('Rücklaufstatus des zweiten Teils.','an_ablage','noch_im_einsatz','nicht_zugeordnet'),
      schutzzubehoer:pick('Rücklaufstatus eines ausdrücklich vorgesehenen Zubehörteils.','an_ablage','noch_im_einsatz','nicht_zugeordnet','nicht_erforderlich')},
    ({satz_zuordnung,griff,einsatzteil,schutzzubehoer})=>{
      const entries=[['griff',griff],['einsatzteil',einsatzteil],['schutzzubehoer',schutzzubehoer]];
      return {im_einsatz_aufsuchen:satz_zuordnung?entries.filter(([,state])=>state==='noch_im_einsatz').map(([name])=>name):[],
        identitaet_abgleichen:satz_zuordnung?entries.filter(([,state])=>state==='nicht_zugeordnet').map(([name])=>name):['liste'],
        satz_zusammenlegen:satz_zuordnung&&entries.every(([,state])=>state==='an_ablage'||state==='nicht_erforderlich'),
        grenze:'Teile getrennt prüfen; Abgabe am Platz bezeichnet keinen trockenen, sauberen oder einsatzbereiten Zustand.'};
    },{satz_zuordnung:true,griff:'an_ablage',einsatzteil:'noch_im_einsatz',schutzzubehoer:'nicht_erforderlich'},
    {im_einsatz_aufsuchen:['einsatzteil'],identitaet_abgleichen:[],satz_zusammenlegen:false}),

  tool('pflege_reihenfolge_uebergebene_feste_aufgaben',
    'Feste Pflegerollen ergänzen, wenn eine teilbare Aufgabe mit zwei verschieden langen Helferfenstern zusammenfällt — Allocate only the documented shareable steps to the available second person.',workshop,
    {aufteilung_belegt:yes('Sind gleich lange, unabhängig einzeln übergebbare Schritte und zuständige Personen vereinbart?'),
      a_fest:count('Schritte, die nur Person A übernehmen kann.'),b_fest:count('Schritte, die nur Person B übernehmen kann.'),teilbar:count('Zusätzliche unabhängige Schritte, die beide übernehmen dürfen.'),
      a_slots:count('Bestätigte freie Slots von A.'),b_slots:count('Bestätigte freie Slots von B.')},
    ({aufteilung_belegt,a_fest,b_fest,teilbar,a_slots,b_slots})=>{
      whole(a_fest,b_fest,teilbar,a_slots,b_slots);
      const first=Math.min(teilbar,Math.max(0,a_slots-a_fest));
      const second=Math.min(teilbar-first,Math.max(0,b_slots-b_fest));
      return {fest_ungedeckt_a_b:aufteilung_belegt?[Math.max(0,a_fest-a_slots),Math.max(0,b_fest-b_slots)]:null,
        teilbar_zuordnen_a_b:aufteilung_belegt?[first,second]:null,teilbar_offen:aufteilung_belegt?teilbar-first-second:null,
        grenze:'Schritte müssen unabhängig übertragbar sein. Feste Pflegerollen nicht rechnerisch auf eine andere Person übertragen.'};
    },{aufteilung_belegt:true,a_fest:4,b_fest:2,teilbar:5,a_slots:3,b_slots:6},
    {fest_ungedeckt_a_b:[1,0],teilbar_zuordnen_a_b:[0,4],teilbar_offen:1}),

  tool('pflege_flurschrank_abholfach_nicht_entleert',
    'In einem gemeinsamen Abholfach Nachschub erst bei wirklich quittierter Abholung einplanen — Check a cleared pickup cubby before adding the next owner’s textile group.',closet,
    {zustand_und_fach_geprueft:yes('Sind das Fach, die trockenen Stücke und die jeweiligen Zuordnungen überprüft?'),
      fach_plaetze:count('Geprüfte nutzbare Plätze in diesem Fach.'),
      erster_belegt:count('Davon für die erste Abholung bereits bereitgelegte Stücke.'),
      erste_abgeholt:count('Davon nachweislich abgeholt.'),zweite_gruppe:count('Stücke der zweiten Gruppe, die bereitgelegt werden sollen.'),
      klare_resttrennung:yes('Kann anhand geeigneter getrennt markierter Bereiche neben der ersten Restgruppe abgelegt werden?')},
    ({zustand_und_fach_geprueft,fach_plaetze,erster_belegt,erste_abgeholt,zweite_gruppe,klare_resttrennung})=>{
      whole(fach_plaetze,erster_belegt,erste_abgeholt,zweite_gruppe);
      if(erste_abgeholt>erster_belegt||erster_belegt>fach_plaetze) throw new RangeError('Fachbelegung');
      const rest=erster_belegt-erste_abgeholt;
      const available=rest&&!klare_resttrennung?0:fach_plaetze-rest;
      return {erste_gruppe_tatsaechlich_im_fach:zustand_und_fach_geprueft?rest:null,
        zweite_getrennt_ablegen:zustand_und_fach_geprueft?Math.min(available,zweite_gruppe):0,
        zweite_ausserhalb_belassen:zustand_und_fach_geprueft?Math.max(0,zweite_gruppe-available):zweite_gruppe,
        grenze:'Eine angekündigte Abholung schafft keinen tatsächlichen Platz. Nur tatsächlich getrennte, geeignete Bereiche verwenden.'};
    },{zustand_und_fach_geprueft:true,fach_plaetze:7,erster_belegt:4,erste_abgeholt:3,zweite_gruppe:4,klare_resttrennung:false},
    {erste_gruppe_tatsaechlich_im_fach:1,zweite_getrennt_ablegen:0,zweite_ausserhalb_belassen:4}),

  tool('pflege_behaelter_rest_neben_haushaltsbedarf',
    'Nach einer Teilrunde dokumentiert verbleibende Mengen nach ihrem vorgesehenen weiteren Weg getrennt ausweisen — Keep documented carryover separate from an unverified remainder.',wet,
    {teilmengen_und_wege_belegt:yes('Sind die getrennten Reste in Originalgebinden gemessen und die vorgesehenen Wege belegt?'),
      direkt_geplant_ml:num('Getrennte Menge für eine bereits bestätigte weitere Anwendung, in ml.',0,10000),
      aufheben_belegt_ml:num('Weitere Menge mit dokumentierter erlaubter Aufbewahrung, in ml.',0,10000),
      offen_ml:num('Separat verbliebene Menge ohne bestätigten weiteren Weg, in ml.',0,10000),
      gesamt_ml:num('Unabhängig gezählte Summe der Restmengen, in ml.',0,30000),
      messspanne_ml:num('Geschätzte gemeinsame Unsicherheit der Ablesungen, in ml.',0,1000)},
    ({teilmengen_und_wege_belegt,direkt_geplant_ml,aufheben_belegt_ml,offen_ml,gesamt_ml,messspanne_ml})=>{
      const parts=direkt_geplant_ml+aufheben_belegt_ml+offen_ml;
      const valid=teilmengen_und_wege_belegt&&Math.abs(gesamt_ml-parts)<=messspanne_ml;
      return {bilanzdifferenz_ml:round(gesamt_ml-parts),zugeordnete_mengen_ml:valid?[direkt_geplant_ml,aufheben_belegt_ml,offen_ml]:null,
        naechster_abgleich:!teilmengen_und_wege_belegt?'gebinde_und_wege_klaeren':!valid?'mengen_nachpruefen':offen_ml?'offenen_rest_separat_klaeren':'vorgesehene_wege_protokollieren',
        grenze:'Reihenfolge weitere Verwendung, Aufbewahrung, offene Menge. Keine Reste zusammenführen oder ungeprüft umfüllen.'};
    },{teilmengen_und_wege_belegt:true,direkt_geplant_ml:40,aufheben_belegt_ml:65,offen_ml:20,gesamt_ml:127,messspanne_ml:3},
    {bilanzdifferenz_ml:2,zugeordnete_mengen_ml:[40,65,20],naechster_abgleich:'offenen_rest_separat_klaeren'}),

  tool('pflege_kleinteile_ausgehoben_unterlage_bestandskontrolle',
    'Freigegebene Kleinteile vor Abnahme einer Arbeitsunterlage mit ihrem Ablageschema vergleichen — Check the capture of loose pieces after an allowed maintenance step.',cleaner,
    {teileplan_belegt:yes('Dürfen diese Kleinteile laut genauer Anleitung für die Nutzerpflege gelöst werden?'),
      plan:count('Laut Ablauf zu erfassende Kleinteile.'),in_faechern:count('Eindeutig zugeordnet in Einzelablagen eingelegte Teile.'),
      lose_gefunden:count('Weitere auf der Unterlage tatsächlich wiedergefundene passende Teile.'),offen_zugeordnet:count('Weitere gefundene Stücke mit unklarer Zuordnung.')},
    ({teileplan_belegt,plan,in_faechern,lose_gefunden,offen_zugeordnet})=>{
      whole(plan,in_faechern,lose_gefunden,offen_zugeordnet);
      const known=in_faechern+lose_gefunden;
      if(known>plan) throw new RangeError('Nur eindeutig zugeordnete Pflichtteile zählen');
      return {fehlend:teileplan_belegt?plan-known:null,
        vor_abnehmen_einsortieren:teileplan_belegt?lose_gefunden:null,
        teile_bis_klaerung_separat:offen_zugeordnet,
        status:!teileplan_belegt?'pflegeumfang_klaeren':known!==plan||lose_gefunden||offen_zugeordnet?'unterlage_vorlaeufig_belassen':'vollstaendigkeit_vor_ort_quittieren',
        grenze:'Nur gefahrlos zugängliche, ausdrücklich für die Benutzerpflege vorgesehene Teile. Bei offenen Teilen Anleitung prüfen.'};
    },{teileplan_belegt:true,plan:7,in_faechern:4,lose_gefunden:2,offen_zugeordnet:1},
    {fehlend:1,vor_abnehmen_einsortieren:2,teile_bis_klaerung_separat:1,status:'unterlage_vorlaeufig_belassen'}),

  tool('pflege_ersatzkorb_vor_leerfahrt_entlasten',
    'Zwei getrennte verwendete Sammelkörbe auf eine bestätigte Entleerungsrunde verteilen — Reserve separate room for two used-item groups on the same planned trip.',wet,
    {separate_kapazitaeten_belegt:yes('Sind die Fächer getrennt und für ihre jeweilige Gruppe beim Transport geeignet?'),
      gruppe_a:count('Eindeutig zugeordnete Teile der ersten Gruppe.'),gruppe_b:count('Eindeutig zugeordnete Teile der zweiten Gruppe.'),
      a_je_fahrt:count('Geeignete Plätze der ersten Gruppe je Runde.'),b_je_fahrt:count('Geeignete Plätze der zweiten Gruppe je Runde.'),
      runden:count('Bis zur geplanten Leerung verfügbare Runden.')},
    ({separate_kapazitaeten_belegt,gruppe_a,gruppe_b,a_je_fahrt,b_je_fahrt,runden})=>{
      whole(gruppe_a,gruppe_b,a_je_fahrt,b_je_fahrt,runden);
      const blocked=(gruppe_a>0&&!a_je_fahrt)||(gruppe_b>0&&!b_je_fahrt);
      const enough=separate_kapazitaeten_belegt&&!blocked;
      return {noetige_runden:enough?Math.max(a_je_fahrt?Math.ceil(gruppe_a/a_je_fahrt):0,b_je_fahrt?Math.ceil(gruppe_b/b_je_fahrt):0):null,
        verbleibend_a_b:separate_kapazitaeten_belegt?[Math.max(0,gruppe_a-runden*a_je_fahrt),Math.max(0,gruppe_b-runden*b_je_fahrt)]:null,
        grenze:'Nur vorgesehene getrennte Fächer belegen. Die Rechnung bewertet weder Gewichte noch tatsächliche Tragbarkeit.'};
    },{separate_kapazitaeten_belegt:true,gruppe_a:7,gruppe_b:11,a_je_fahrt:4,b_je_fahrt:3,runden:2},
    {noetige_runden:4,verbleibend_a_b:[0,5]}),

  tool('kleiderschrank_inventar_mit_fehlendem_rueckzettel',
    'Entnommene Textilien im gemeinsamen Schrank nach bestätigten und ungeklärten Rückgabeorten verfolgen — Track temporarily relocated clothing without assuming that an empty slot means loss.',closet,
    {liste_und_schrank_geprueft:yes('Sind vor Räumung erfasste Stücke und alle geprüften Rückgabeorte eindeutig derselben Liste zugeordnet?'),
      entnommen:count('Vor der Arbeit bestätigte entnommene Stücke.'),wieder_im_schrank:count('Eindeutig am vorgesehenen Schrankplatz festgestellt.'),
      anderer_platz:count('Weitere eindeutig an einem trockenen Übergabeplatz dokumentierte Stücke.'),
      ohne_zuordnung:count('Weitere gefundene, aber noch nicht sicher zugeordnete Stücke.')},
    ({liste_und_schrank_geprueft,entnommen,wieder_im_schrank,anderer_platz,ohne_zuordnung})=>{
      whole(entnommen,wieder_im_schrank,anderer_platz,ohne_zuordnung);
      if(wieder_im_schrank+anderer_platz>entnommen) throw new RangeError('Doppelt erfasste Rückgaben');
      const unresolved=entnommen-wieder_im_schrank-anderer_platz;
      return {bekannt_ausserhalb:liste_und_schrank_geprueft?anderer_platz:null,
        rueckgabe_ungeklaert:liste_und_schrank_geprueft?unresolved:null,
        mindestens_noch_aufsuchen:liste_und_schrank_geprueft?Math.max(0,unresolved-ohne_zuordnung):null,
        grenze:'Eine mögliche Zuordnung erst anhand der einzelnen Stücke bestätigen. Fehlende Stücke bedeuten keine Feststellung eines Verlustes.'};
    },{liste_und_schrank_geprueft:true,entnommen:12,wieder_im_schrank:7,anderer_platz:2,ohne_zuordnung:1},
    {bekannt_ausserhalb:2,rueckgabe_ungeklaert:3,mindestens_noch_aufsuchen:2}),

  tool('pflege_nutzungswechsel_beschriftung_sichtprobe',
    'Nach einem Wechsel des gemeinsam genutzten Pflegeplatzes die Lesbarkeit der vorhandenen Kennzeichnung prüfen — Check label readability from the actual approach and working position.',workshop,
    {gleiche_markierung:yes('Wurde an beiden Plätzen dieselbe Kennzeichnung auf derselben Fläche unter den üblichen Bedingungen verglichen?'),
      zugang_alt:yes('War die Kennzeichnung am alten Platz beim Herangehen aus normaler Position eindeutig lesbar?'),
      arbeit_alt:yes('War sie am alten Platz während der üblichen Handgriffe sichtbar?'),zugang_neu:yes('Ist sie am neuen Platz beim Herangehen lesbar?'),
      arbeit_neu:yes('Ist sie am neuen Platz während der üblichen Handgriffe sichtbar?')},
    ({gleiche_markierung,zugang_alt,arbeit_alt,zugang_neu,arbeit_neu})=>{
      const lost=[];
      if(gleiche_markierung&&zugang_alt&&!zugang_neu) lost.push('zugang');
      if(gleiche_markierung&&arbeit_alt&&!arbeit_neu) lost.push('arbeit');
      return {weggefallene_sichtpunkte:lost,neuer_platz_beobachtet:gleiche_markierung?[zugang_neu,arbeit_neu]:null,
        naechster_schritt:!gleiche_markierung?'beobachtung_wiederholen':!zugang_neu||!arbeit_neu?'kennzeichnung_nachplatzieren':'kennzeichnung_beibehalten',
        grenze:'Nur reversible Haushaltsmarkierungen ergänzen. Hersteller- und Pflegekennzeichnungen nicht verdecken.'};
    },{gleiche_markierung:true,zugang_alt:true,arbeit_alt:true,zugang_neu:true,arbeit_neu:false},
    {weggefallene_sichtpunkte:['arbeit'],neuer_platz_beobachtet:[true,false],naechster_schritt:'kennzeichnung_nachplatzieren'}),
];
