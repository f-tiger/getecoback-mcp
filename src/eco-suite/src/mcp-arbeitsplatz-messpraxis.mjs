const pc='/guide/pc-ueberhitzt-sommer.html';
const cool='/guide/homeoffice-buero-kuehlen.html';
const warm='/guide/homeoffice-warm-bleiben.html';
const meter='/strommess-protokoll.html';
const num=(description,minimum=0,maximum=10000)=>({type:'number',minimum,maximum,description});
const temp=description=>num(description,-20,180);
const seconds=description=>num(description,0,86400);
const yes=description=>({type:'boolean',description});
const option=(description,...values)=>({type:'string',enum:values,description});
const round=value=>Math.round(value*100)/100+0;
function whole(...values) {
  if(values.some(value=>!Number.isInteger(value))) throw new RangeError();
}
function ordered(...values) {
  if(values.some((value,i)=>i>0&&value<values[i-1])) throw new RangeError();
}
function tool(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const arbeitsplatzMesspraxis=[
  tool('pc_chip_und_ansaugluft_abstand_zerlegen',
    'Bei zwei gleichartigen PC-Läufen Temperaturänderung am Chip und an seiner Ansaugluft getrennt bilanzieren — Decompose the observed chip change into inlet and chip-to-inlet terms.',
    pc,{
      a_chip_c:temp('Integrierter Chipmesswert in Lauf A nach derselben Messdauer.'),
      a_ansaug_c:temp('Zeitgleicher äußerer Messwert der Ansaugluft in Lauf A.'),
      b_chip_c:temp('Derselbe Chipmesswert in Lauf B.'),
      b_ansaug_c:temp('Zeitgleicher Wert an derselben Ansaugstelle in B.'),
      lasten_und_leistung_vergleichbar:yes('Gleiche Lastart, Messdauer und Leistung ausreichend belegt?'),
    },({a_chip_c,a_ansaug_c,b_chip_c,b_ansaug_c,lasten_und_leistung_vergleichbar})=>{
      const ansaug=b_ansaug_c-a_ansaug_c,chip=b_chip_c-a_chip_c;
      return {chip_aenderung_c:round(chip),ansaug_aenderung_c:round(ansaug),
        rest_innenabstand_c:lasten_und_leistung_vergleichbar?round(chip-ansaug):null,
        hinweis:'Messdifferenzen aus den eigenen Läufen. Der Rest belegt keine bestimmte Ursache oder zulässige Chiptemperatur.'};
    },{a_chip_c:71,a_ansaug_c:26,b_chip_c:77,b_ansaug_c:30,lasten_und_leistung_vergleichbar:true},
    {chip_aenderung_c:6,ansaug_aenderung_c:4,rest_innenabstand_c:2}),

  tool('pc_ansaugluft_zu_raum_und_auslass',
    'Bei einem stationären PC gleichzeitig warmen Ansaugort und warmen Abluftbereich gegenüber dem fernen Raumwert dokumentieren — Distinguish three simultaneous PC observation points from a room-temperature claim.',
    pc,{
      raum_fern_c:temp('Möglichst unbeeinflusster zeitgleicher Raummesswert abseits des Arbeitsplatzes.'),
      ansaug_c:temp('Äußerer Messwert an der Ansaugseite, ohne die Öffnung zu verdecken.'),
      auslass_c:temp('Äußerer Messwert im gesonderten Auslassbereich.'),
      unterscheidbar_c:num('Vorab begründete kleinste unterscheidbare Temperaturdifferenz in K.',0,30),
      messorte_getrennt:yes('Alle drei Messorte und Zeiten sind eindeutig getrennt protokolliert.'),
    },({raum_fern_c,ansaug_c,auslass_c,unterscheidbar_c,messorte_getrennt})=>{
      const a=ansaug_c-raum_fern_c,b=auslass_c-ansaug_c;
      return {ansaugort_waermer_als_fernraum:messorte_getrennt?a>unterscheidbar_c:null,
        warmer_auslass_eigens_unterscheidbar:messorte_getrennt?b>unterscheidbar_c:null,
        hinweis:'Räumliche Staffelung allein beweist keine Rückströmung. Keine Änderung am Gerät, Gehäuse oder Luftweg ableiten.'};
    },{raum_fern_c:25,ansaug_c:29,auslass_c:37,unterscheidbar_c:1,messorte_getrennt:true},
    {ansaugort_waermer_als_fernraum:true,warmer_auslass_eigens_unterscheidbar:true}),

  tool('pc_cpu_gpu_lastmix_zu_gepaarten_proben',
    'Vor einem CPU/GPU-Vergleich Läufe mit Wiederholung beider protokollierter Lastabschnitte von einseitigen Proben trennen — Select PC trials that repeat both recorded workload segments.',
    pc,{
      paare_gesamt:num('Zahl aller geplanten Vergleichspaare derselben Geräte.'),
      nur_cpu_passend:num('Paare mit geeignetem CPU-Abschnitt, aber ungeeignetem GPU-Abschnitt.'),
      nur_gpu_passend:num('Andere Paare mit passendem GPU-Abschnitt, aber ungeeignetem CPU-Abschnitt.'),
      beide_geeignet:num('Weitere Paare mit vergleichbarem CPU- und GPU-Abschnitt, auch nach Leistungsprotokoll.'),
    },({paare_gesamt,nur_cpu_passend,nur_gpu_passend,beide_geeignet})=>{
      whole(paare_gesamt,nur_cpu_passend,nur_gpu_passend,beide_geeignet);
      if(nur_cpu_passend+nur_gpu_passend+beide_geeignet>paare_gesamt) throw new RangeError();
      return {gemeinsame_auswertung:beide_geeignet,nur_cpu_auswertbar:nur_cpu_passend,nur_gpu_auswertbar:nur_gpu_passend,
        ohne_vergleich:paare_gesamt-nur_cpu_passend-nur_gpu_passend-beide_geeignet,
        hinweis:'Dasselbe Geräteprotokoll, dieselbe Aufgabe und Leistungsphase abgleichen. Ein passender Teil ersetzt keinen fehlenden zweiten Lastabschnitt.'};
    },{paare_gesamt:11,nur_cpu_passend:3,nur_gpu_passend:1,beide_geeignet:5},
    {gemeinsame_auswertung:5,nur_cpu_auswertbar:3,nur_gpu_auswertbar:1,ohne_vergleich:2}),

  tool('pc_temperaturmaximum_aufgaben_nachlauf',
    'Das erste protokollierte Temperaturmaximum als Last, Nachlauf oder nicht zuordenbare Messung einordnen — Locate a logged PC temperature maximum relative to load and measured cooldown.',
    pc,{
      aufgabe_ab_s:seconds('Beginn der beobachteten Aufgabe auf der gemeinsamen Zeitachse.'),
      aufgabe_bis_s:seconds('Ende dieser Aufgabe.'),
      nachlauf_bis_s:seconds('Ende des lückenlos anschließenden beobachteten Nachlaufs.'),
      maximum_s:seconds('Erstes protokolliertes Auftreten des höchsten erfassten Werts derselben Sensorquelle.'),
      uhren_und_log_geprueft:yes('Zeitbezug und Abdeckung sind geprüft, Maximum ist eine beobachtete Ablesung.'),
    },({aufgabe_ab_s,aufgabe_bis_s,nachlauf_bis_s,maximum_s,uhren_und_log_geprueft})=>{
      ordered(aufgabe_ab_s,aufgabe_bis_s,nachlauf_bis_s);
      if(aufgabe_ab_s===aufgabe_bis_s) throw new RangeError();
      return {beobachtete_phase:!uhren_und_log_geprueft?null:maximum_s<aufgabe_ab_s||maximum_s>nachlauf_bis_s?'außerhalb':
        maximum_s<aufgabe_bis_s?'Aufgabe':maximum_s===aufgabe_bis_s?'Übergang':'Nachlauf',
        nach_aufgabenende_s:uhren_und_log_geprueft&&maximum_s>aufgabe_bis_s&&maximum_s<=nachlauf_bis_s?round(maximum_s-aufgabe_bis_s):null,
        hinweis:'Erstes beobachtetes Auftreten des Aufzeichnungsmaximums. Die tatsächliche Spitze kann zwischen Ablesungen liegen. Keine Chipgrenze oder Ursache daraus ableiten.'};
    },{aufgabe_ab_s:150,aufgabe_bis_s:460,nachlauf_bis_s:520,maximum_s:473,uhren_und_log_geprueft:true},
    {beobachtete_phase:'Nachlauf',nach_aufgabenende_s:13}),

  tool('pc_leistungsabfall_und_begrenzungsmeldung',
    'Bei einem langsamer gewordenen identischen Lauf eine ausdrückliche Temperaturmeldung von anderen Ursachen und fehlenden Daten trennen — Distinguish a recorded thermal-limit signal from slow work alone.',
    pc,{
      arbeit_gleich:yes('Aufgabe, Auflösung und Ausgabe sind gegenüber der Bezugsprobe vergleichbar.'),
      bezug_ausgaben_pro_min:num('Gemessener Arbeitsdurchsatz der Bezugsprobe.',0,1000000),
      probe_ausgaben_pro_min:num('Entsprechend gemessener Durchsatz in der untersuchten Probe.',0,1000000),
      protokollgrund:option('Nur den im Geräteprotokoll für denselben Abschnitt ausdrücklich gelieferten Grund wählen.','temperatur','temperatur und weitere','andere Begrenzung','keine Angabe'),
    },({arbeit_gleich,bezug_ausgaben_pro_min,probe_ausgaben_pro_min,protokollgrund})=>{
      if(!bezug_ausgaben_pro_min) throw new RangeError();
      const faktor=probe_ausgaben_pro_min/bezug_ausgaben_pro_min;
      if(!Number.isFinite(faktor*10000)) throw new RangeError();
      return {durchsatz_delta_prozent:arbeit_gleich?round(100*(faktor-1)):null,
        gemeldete_thermische_begrenzung:protokollgrund==='keine Angabe'?null:protokollgrund==='temperatur'||protokollgrund==='temperatur und weitere',
        hinweis:'Meldung und Durchsatz sind getrennte Beobachtungen. Ein langsamer Lauf allein weist keine thermische Begrenzung nach.'};
    },{arbeit_gleich:true,bezug_ausgaben_pro_min:120,probe_ausgaben_pro_min:108,protokollgrund:'keine Angabe'},
    {durchsatz_delta_prozent:-10,gemeldete_thermische_begrenzung:null}),

  tool('pc_leistungsprotokoll_ansaugfenster_wechselabstand',
    'Eine Temperaturablesung nur einer bekannten PC-Aufgabe zuordnen, wenn pünktliche Lastgrenze und bekannter Messverzug das erlauben — Keep delayed thermal samples out of mixed workload phases.',
    pc,{
      aufgabe_start_s:seconds('Beginn des nachweislich zusammenhängend gleichartigen Aufgabenabschnitts.'),
      aufgabe_ende_s:seconds('Ende des Aufgabenabschnitts auf derselben Achse.'),
      thermik_ablesung_s:seconds('Zeitstempel der betreffenden Temperaturablesung.'),
      maximaler_verzug_s:seconds('Dokumentierte maximale Verzögerung der protokollierten Ablesung.'),
    },({aufgabe_start_s,aufgabe_ende_s,thermik_ablesung_s,maximaler_verzug_s})=>{
      ordered(aufgabe_start_s,aufgabe_ende_s);
      if(aufgabe_start_s===aufgabe_ende_s) throw new RangeError();
      const frueh=thermik_ablesung_s-maximaler_verzug_s;
      return {ablesung_eindeutig_im_abschnitt:frueh>=aufgabe_start_s&&thermik_ablesung_s<aufgabe_ende_s,
        uebergang_kann_enthalten_sein:frueh<aufgabe_start_s&&thermik_ablesung_s>=aufgabe_start_s||
          frueh<aufgabe_ende_s&&thermik_ablesung_s>=aufgabe_ende_s,
        hinweis:'Der Zeitstempel darf tatsächliche Erfassung verzögert anzeigen. Datenverzug und physische Wärmeträgheit sind verschieden.'};
    },{aufgabe_start_s:130,aufgabe_ende_s:300,thermik_ablesung_s:136,maximaler_verzug_s:10},
    {ablesung_eindeutig_im_abschnitt:false,uebergang_kann_enthalten_sein:true}),

  tool('pc_benchmark_aufzeichnung_mindestlauf_ausschluss',
    'Prüfen, ob abgebrochene Aufnahmen überproportional in einer Lastgruppe liegen — Compare incomplete PC runs by workload group before using performance averages.',
    pc,{
      a_begonnen:num('Begonnene Proben der ersten gleich definierten PC-Aufgabe.'),
      a_unvollstaendig:num('Davon ohne verlangten Ergebnis- und Temperaturendpunkt.'),
      b_begonnen:num('Begonnene Proben der zweiten gleich definierten Aufgabenklasse.'),
      b_unvollstaendig:num('Davon entsprechend unvollständige Proben.'),
    },({a_begonnen,a_unvollstaendig,b_begonnen,b_unvollstaendig})=>{
      whole(a_begonnen,a_unvollstaendig,b_begonnen,b_unvollstaendig);
      if(!a_begonnen||!b_begonnen||a_unvollstaendig>a_begonnen||b_unvollstaendig>b_begonnen) throw new RangeError();
      const a=a_unvollstaendig/a_begonnen,b=b_unvollstaendig/b_begonnen;
      return {vollstaendige_a:a_begonnen-a_unvollstaendig,vollstaendige_b:b_begonnen-b_unvollstaendig,
        anteil_unvollstaendig_a_minus_b_pp:round(100*(a-b)),
        hinweis:'Die Ausfallzählung gibt keine Fehlerursache an. Ergebnisse aus tatsächlich vollständigen Proben separat betrachten.'};
    },{a_begonnen:8,a_unvollstaendig:2,b_begonnen:10,b_unvollstaendig:4},
    {vollstaendige_a:6,vollstaendige_b:6,anteil_unvollstaendig_a_minus_b_pp:-15}),

  tool('pc_laufpaar_startzustand_vorherige_arbeit',
    'Für einen Vergleich zweier identischer PC-Aufgaben unterscheiden, ob jeweils direkt davor Leerlauf oder eine andere Aufgabe dokumentiert war — Check thermal carryover from the last recorded workload rather than the current output alone.',
    pc,{
      a_vorzustand:option('Zustand unmittelbar vor Lauf A aus der vollständigen vorangegangenen Aufzeichnung.','Leerlauf','Arbeit','offen'),
      b_vorzustand:option('Zustand unmittelbar vor Lauf B aus der vollständigen vorangegangenen Aufzeichnung.','Leerlauf','Arbeit','offen'),
      vorherige_aufgabe_gleich:yes('Wenn zuvor beide aktiv waren, ist auch die vorherige Aufgabe vergleichbar.'),
      gleiche_pruefaufgabe:yes('Die beiden eigentlichen vollständigen Vergleichsläufe sind deckungsgleich geplant und dokumentiert.'),
    },({a_vorzustand,b_vorzustand,vorherige_aufgabe_gleich,gleiche_pruefaufgabe})=>{
      const bekannt=a_vorzustand!=='offen'&&b_vorzustand!=='offen';
      return {vergleichbare_vorphase:bekannt?a_vorzustand===b_vorzustand&&(a_vorzustand==='Leerlauf'||vorherige_aufgabe_gleich):null,
        gesamte_paarbasis_bestaetigt:gleiche_pruefaufgabe&&bekannt&&a_vorzustand===b_vorzustand&&(a_vorzustand==='Leerlauf'||vorherige_aufgabe_gleich),
        hinweis:'Gleicher Vorzustand ist ein Protokollmerkmal und kein Nachweis identischer Starttemperatur. Temperatur und Dauer separat abgleichen.'};
    },{a_vorzustand:'Arbeit',b_vorzustand:'Leerlauf',vorherige_aufgabe_gleich:false,gleiche_pruefaufgabe:true},
    {vergleichbare_vorphase:false,gesamte_paarbasis_bestaetigt:false}),

  tool('pc_zwei_ansaugseiten_lokal_mehrlast_probe',
    'Nach unabhängiger Zuordnung der vorhandenen Ansaugbereiche entscheiden, ob ein einzelner äußerer Messpunkt beide abbildet — Test whether one inlet observation can stand for two documented intake locations.',
    pc,{
      gehaeuseseite_a_c:temp('Zeitgleiche Lufttemperatur außen an Ansaugbereich A.'),
      gehaeuseseite_b_c:temp('Zeitgleiche Lufttemperatur außen an unabhängig bestätigtem Ansaugbereich B.'),
      messgrenze_c:num('Eigene Toleranz für diese Frage in K.',0,30),
      beide_ansaug_und_nicht_versperrt:yes('Beide Positionen sind am vorhandenen Aufbau eindeutig Ansaugpunkte und wurden frei beobachtet.'),
    },({gehaeuseseite_a_c,gehaeuseseite_b_c,messgrenze_c,beide_ansaug_und_nicht_versperrt})=>{
      const delta=gehaeuseseite_b_c-gehaeuseseite_a_c;
      return {lokaler_unterschied_c:beide_ansaug_und_nicht_versperrt?round(delta):null,
        beide_getrennt_protokollieren:beide_ansaug_und_nicht_versperrt?Math.abs(delta)>messgrenze_c:null,
        hinweis:'Kein Schluss über Luftmengen, Kühlung oder Montage. Öffnungen während der Beobachtung frei lassen.'};
    },{gehaeuseseite_a_c:25,gehaeuseseite_b_c:28.2,messgrenze_c:1.4,beide_ansaug_und_nicht_versperrt:true},
    {lokaler_unterschied_c:3.2,beide_getrennt_protokollieren:true}),

  tool('pc_thermik_bildrate_und_aufloesung_abgleich',
    'In einer PC-Beobachtung Messpaare mit geändertem Ausgabeziel vor und nach einem Leistungsabfall aussortieren — Keep changed display-output settings out of matched thermal-performance observations.',
    pc,{
      abschnitte:num('Vorbereitete zeitlich gepaarte Temperatur- und Aufgabenabschnitte.'),
      aufloesung_geaendert:num('Davon Abschnitte mit geänderter protokollierter Ausgabeauflösung.'),
      rahmenlimit_geaendert:num('Weitere Abschnitte mit geändertem ausdrücklich protokolliertem Bildratenlimit.'),
      belastung_offen:num('Weitere Abschnitte ohne ausreichenden Nachweis vergleichbarer Aufgabenlast.'),
    },({abschnitte,aufloesung_geaendert,rahmenlimit_geaendert,belastung_offen})=>{
      whole(abschnitte,aufloesung_geaendert,rahmenlimit_geaendert,belastung_offen);
      const ausgeschlossen=aufloesung_geaendert+rahmenlimit_geaendert+belastung_offen;
      if(ausgeschlossen>abschnitte) throw new RangeError();
      return {gepaarte_vergleichsproben:abschnitte-ausgeschlossen,ausgabewechsel:aufloesung_geaendert+rahmenlimit_geaendert,
        hinweis:'Jeden Abschnitt einmal in dieser Reihenfolge einordnen. Nach Ausschluss verbleibende Bedingungen und Sensordaten separat prüfen.'};
    },{abschnitte:18,aufloesung_geaendert:2,rahmenlimit_geaendert:3,belastung_offen:4},
    {gepaarte_vergleichsproben:9,ausgabewechsel:5}),

  tool('arbeitsplatz_technikumschaltung_eindeutige_proben',
    'Beim Wechsel von Bildschirm und Schreibtischlicht nur Abschnitte auswerten, in denen genau ein dokumentierter Zustand neu war — Recover single-change monitor or desk-light observations before comparing temperatures.',
    cool,{
      nachproben:num('Zahl aller Nachproben mit protokollierten Umschaltungen.'),
      nur_bildschirm:num('Davon Proben, in denen nur der Bildschirmzustand geändert war.'),
      nur_licht:num('Weitere Proben, in denen nur der Lichtzustand geändert war.'),
      beide_wechsel:num('Weitere Proben mit beiden Wechseln vor der Nachprobe.'),
      pc_last_gleich:yes('PC-Last und Messposition blieben in den Einzelwechseln ausreichend vergleichbar.'),
    },({nachproben,nur_bildschirm,nur_licht,beide_wechsel,pc_last_gleich})=>{
      whole(nachproben,nur_bildschirm,nur_licht,beide_wechsel);
      if(nur_bildschirm+nur_licht+beide_wechsel>nachproben) throw new RangeError();
      return {bildschirm_einzelproben:pc_last_gleich?nur_bildschirm:null,licht_einzelproben:pc_last_gleich?nur_licht:null,
        untrennbare_wechselproben:beide_wechsel,reststatus_offen:nachproben-nur_bildschirm-nur_licht-beide_wechsel,
        hinweis:'Veränderte Leuchten- und Bildschirmzustände sind ein Protokollhinweis. Eine Einzeländerung beweist noch keinen Wärmebeitrag.'};
    },{nachproben:13,nur_bildschirm:3,nur_licht:4,beide_wechsel:2,pc_last_gleich:true},
    {bildschirm_einzelproben:3,licht_einzelproben:4,untrennbare_wechselproben:2,reststatus_offen:4}),

  tool('arbeitsplatz_waerme_quelle_zwei_on_off_aufzeichnungen',
    'Nach zwei Schaltprotokollen prüfen, ob eine Temperaturablesung nur PCs, zusätzlich Bildschirm oder zusätzlich Licht zeitgleich erfasste — Label a local desk reading by the equipment states actually documented at that instant.',
    cool,{
      rechner_last:yes('PC-Aufgabe lief am dokumentierten Zeitpunkt.'),
      monitor_ab_s:seconds('Beginn der bestätigten Einschaltphase des Monitors.'),
      monitor_bis_s:seconds('Ende dieser Einschaltphase.'),
      licht_ab_s:seconds('Beginn der bestätigten Einschaltphase der Schreibtischlampe.'),
      licht_bis_s:seconds('Ende dieser Einschaltphase.'),
      messung_s:seconds('Zeitpunkt der Temperaturablesung auf derselben Achse.'),
      uhren_abgeglichen:yes('Alle drei Zustandsprotokolle betreffen dieselbe Achse und waren am Zeitpunkt vollständig.'),
    },({rechner_last,monitor_ab_s,monitor_bis_s,licht_ab_s,licht_bis_s,messung_s,uhren_abgeglichen})=>{
      ordered(monitor_ab_s,monitor_bis_s);
      ordered(licht_ab_s,licht_bis_s);
      const aktiv=[rechner_last?'PC':null,messung_s>=monitor_ab_s&&messung_s<monitor_bis_s?'Bildschirm':null,
        messung_s>=licht_ab_s&&messung_s<licht_bis_s?'Licht':null].filter(Boolean);
      return {parallel_protokolliert:uhren_abgeglichen?aktiv:null,
        einzelzustand_protokolliert:uhren_abgeglichen?aktiv.length===1:null,
        hinweis:'Kennzeichnet Zustände, keine Ursache. Endpunkte gelten jeweils als nicht mehr eingeschaltet. Andere Wärmequellen separat notieren.'};
    },{rechner_last:true,monitor_ab_s:130,monitor_bis_s:600,licht_ab_s:50,licht_bis_s:140,messung_s:150,uhren_abgeglichen:true},
    {parallel_protokolliert:['PC','Bildschirm'],einzelzustand_protokolliert:false}),

  tool('arbeitsplatz_bildschirm_licht_brauchbare_feinprobe',
    'Für vorhandene Schreibtischlichtvarianten nur bereits erprobte Ergebnisse mit gleicher Bildschirmanforderung nach Strom vergleichen — Compare lighting draw among two setups whose task and screen visibility were checked.',
    cool,{
      a_brauchbar:yes('Variante A reichte in der Beobachtung für dieselbe Bildschirm- und Leseaufgabe.'),
      b_brauchbar:yes('Variante B reichte in der Beobachtung für dieselbe Aufgabe.'),
      a_wh:num('Gemessene Wh der Beleuchtung während derselben vollständigen Beobachtungsdauer.'),
      b_wh:num('Gemessene entsprechende Wh in Variante B.'),
      tageslicht_bildschirm_konstant:yes('Tageslicht, Bildschirmzustand und Messgrenze für beide Beobachtungen ähnlich.'),
    },({a_brauchbar,b_brauchbar,a_wh,b_wh,tageslicht_bildschirm_konstant})=>{
      const nutzbar=[a_brauchbar?'A':null,b_brauchbar?'B':null].filter(Boolean);
      return {ausreichend_erprobt:nutzbar,
        stromvergleich_wh:tageslicht_bildschirm_konstant&&nutzbar.length===2?round(b_wh-a_wh):null,
        hinweis:'Eigene Lese- und Sehbedingung der Probe. Kein Arbeitsplatzgrenzwert und keine Einschätzung der Wirkung auf Raumwärme.'};
    },{a_brauchbar:true,b_brauchbar:false,a_wh:14,b_wh:8,tageslicht_bildschirm_konstant:true},
    {ausreichend_erprobt:['A'],stromvergleich_wh:null}),

  tool('arbeitsplatz_luefter_probe_luftwert_und_empfinden',
    'Wenn am Schreibtisch ein Luftstrom als kühler erlebt wird, die lokale Luftmessung getrennt von der persönlichen Rückmeldung prüfen — Report whether desk fan comfort moved independently of measured air temperature.',
    cool,{
      vorher_luft_c:temp('Eigener Messwert auf derselben Höhe vor der Luftstromprobe.'),
      nachher_luft_c:temp('Luftmesswert bei der Beobachtung am gleichen Messpunkt.'),
      messband_k:num('Abgeleitete eigene Grenze der Luftvergleichsmessung in K.',0,30),
      persoenlich_kuehler:yes('Die Person berichtete bei derselben Aufgabe ein kühleres Gefühl.'),
      probe_vergleichbar:yes('Arbeitsplatz, Aufgabe, Kleidung und direkter Sonneneinfall blieben vergleichbar.'),
    },({vorher_luft_c,nachher_luft_c,messband_k,persoenlich_kuehler,probe_vergleichbar})=>{
      const delta=nachher_luft_c-vorher_luft_c;
      return {luftdifferenz_c:probe_vergleichbar?round(delta):null,
        kuehler_empfunden_ohne_messbar_kuehlere_luft:probe_vergleichbar?persoenlich_kuehler&&delta>=-messband_k:null,
        hinweis:'Lufttemperatur und persönliches Empfinden sind verschiedene Ergebnisse. Keine Raumkühlung oder individuelle gesundheitliche Wirkung ableiten.'};
    },{vorher_luft_c:28.3,nachher_luft_c:28.2,messband_k:0.3,persoenlich_kuehler:true,probe_vergleichbar:true},
    {luftdifferenz_c:-0.1,kuehler_empfunden_ohne_messbar_kuehlere_luft:true}),

  tool('arbeitsplatz_oberflaeche_sonnenstreifen_messpunkte',
    'Die am Schreibtisch erwärmte Fläche von einer zugleich beschatteten Stelle und dem zugehörigen Luftwert getrennt beschreiben — Compare paired desk surfaces and concurrent air without assuming either surface represents the room.',
    cool,{
      helle_flaeche_c:temp('Messwert eines markierten beleuchteten Oberflächenpunkts am Arbeitsplatz.'),
      schatten_flaeche_c:temp('Zeitgleicher Messwert einer beschatteten Stelle aus vergleichbarem Material.'),
      luft_c:temp('Zeitgleicher Luftwert am vorgesehenen Sitzplatz, außerhalb direkter Bestrahlung des Fühlers.'),
      material_und_messweise_gleich:yes('Für die zwei Oberflächenstellen gleiche geeignete Messweise bei vergleichbarem Material belegt.'),
    },({helle_flaeche_c,schatten_flaeche_c,luft_c,material_und_messweise_gleich})=>{
      return {sonnenstelle_minus_schatten_c:material_und_messweise_gleich?round(helle_flaeche_c-schatten_flaeche_c):null,
        schatten_minus_luft_c:material_und_messweise_gleich?round(schatten_flaeche_c-luft_c):null,
        hinweis:'Eigene lokale Messpunkte. Der jeweils gemessene Unterschied ist keine Heizlast oder Ursache für die Lufttemperatur.'};
    },{helle_flaeche_c:34.3,schatten_flaeche_c:27.2,luft_c:26.6,material_und_messweise_gleich:true},
    {sonnenstelle_minus_schatten_c:7.1,schatten_minus_luft_c:0.6}),

  tool('arbeitsplatz_fusshoehe_sitzhoehe_wiederkehrmuster',
    'Am selben Schreibtisch wiederholt kühle Fußzone von durchgängig kühler Sitzluft unterscheiden — Classify a repeated colder foot-zone observation separately from a whole-seat drop.',
    warm,{
      a_fuss_c:temp('Erste Messung auf Fußhöhe.'),
      a_sitz_c:temp('Erster zeitgleicher Messwert auf Sitzhöhe.'),
      b_fuss_c:temp('Spätere Messung an genau demselben Fußpunkt.'),
      b_sitz_c:temp('Zweiter zeitgleicher Wert auf Sitzhöhe.'),
      differenz_relevant_k:num('Eigene Mindestdifferenz für diese Messung, in K.',0,30),
      aufbau_wiederholt:yes('Messorte, Gerät und Versuchsaufbau blieben gleich.'),
    },({a_fuss_c,a_sitz_c,b_fuss_c,b_sitz_c,differenz_relevant_k,aufbau_wiederholt})=>{
      const lokalA=a_sitz_c-a_fuss_c>differenz_relevant_k,lokalB=b_sitz_c-b_fuss_c>differenz_relevant_k;
      return {kuehlere_fusszone_in_beiden_paaren:aufbau_wiederholt?lokalA&&lokalB:null,
        sitzluft_spaeter_messbar_kaelter:aufbau_wiederholt?a_sitz_c-b_sitz_c>differenz_relevant_k:null,
        hinweis:'Eigene Messpaare an festen Höhen. Die Beobachtung sagt nichts über Dämmung, Zugluftursache oder eine geeignete Heizung aus.'};
    },{a_fuss_c:17.7,a_sitz_c:20,b_fuss_c:17.9,b_sitz_c:19.8,differenz_relevant_k:1,aufbau_wiederholt:true},
    {kuehlere_fusszone_in_beiden_paaren:true,sitzluft_spaeter_messbar_kaelter:false}),

  tool('arbeitsplatz_warme_optionen_unterschiedlicher_zielbereich',
    'Persönlichen Wärmekomfort und gemessenen Raumwunsch bei zwei vorhandenen Routinen separat abgleichen — Compare observed personal comfort and room warming as different completion criteria.',
    warm,{
      a_komfort_bestaetigt:yes('Persönlicher Wärmewunsch bei Aufgabe mit Ablauf A bestätigt.'),
      b_komfort_bestaetigt:yes('Entsprechender persönlicher Wunsch bei Ablauf B bestätigt.'),
      a_raumziel_bestaetigt:yes('Selbst gesetztes Raumziel am vorgesehenen Messpunkt mit A bestätigt.'),
      b_raumziel_bestaetigt:yes('Entsprechendes tatsächlich gemessenes Raumziel bei B bestätigt.'),
      beobachtung_vergleichbar:yes('Aufgabe und die für beide Fragen jeweils gleichen Bedingungen sind genügend dokumentiert.'),
    },({a_komfort_bestaetigt,b_komfort_bestaetigt,a_raumziel_bestaetigt,b_raumziel_bestaetigt,beobachtung_vergleichbar})=>{
      return {persoenlich_brauchbar:beobachtung_vergleichbar?[a_komfort_bestaetigt?'A':null,b_komfort_bestaetigt?'B':null].filter(Boolean):null,
        raumziel_belegt:beobachtung_vergleichbar?[a_raumziel_bestaetigt?'A':null,b_raumziel_bestaetigt?'B':null].filter(Boolean):null,
        hinweis:'Raumziel und persönlicher Wärmewunsch sind freiwillige Kriterien. Beides getrennt prüfen, Betriebs- und Aufsichtsvorgaben einhalten.'};
    },{a_komfort_bestaetigt:true,b_komfort_bestaetigt:true,a_raumziel_bestaetigt:false,b_raumziel_bestaetigt:true,beobachtung_vergleichbar:true},
    {persoenlich_brauchbar:['A','B'],raumziel_belegt:['B']}),

  tool('arbeitsplatz_technik_waerme_nach_pause_aufbauklasse',
    'Bei der Rückkehr an den Arbeitsplatz warmen Gerätebereich und weiterhin warme Raumluft mit unabhängigen Referenzen trennen — Label local hardware warmth after an observed pause without inferring room cooldown.',
    cool,{
      geraetenah_c:temp('Luftwert nahe dem Gerät zum Ende der protokollierten Pause.'),
      sitz_c:temp('Zeitgleicher Luftwert am Sitzplatz.'),
      raum_referenz_vorher_c:temp('Belegter Referenzwert am Sitzplatz vor der zugehörigen Arbeitsphase.'),
      vergleichsgrenze_k:num('Eigene kleinste unterscheidbare Differenz in K.',0,30),
    },({geraetenah_c,sitz_c,raum_referenz_vorher_c,vergleichsgrenze_k})=>{
      const lokal=geraetenah_c-sitz_c>vergleichsgrenze_k,raum=sitz_c-raum_referenz_vorher_c>vergleichsgrenze_k;
      return {lokaler_waermebereich_beobachtet:lokal,sitzluft_ueber_ausgang:raum,
        naechste_probe:lokal&&!raum?'Gerätenähe getrennt beobachten':raum?'Arbeitsplatz und Umgebung erneut beobachten':'kein vergleichbarer Wärmeüberschuss',
        hinweis:'Keine Ursache zugeordnet. Luftwerte und Referenzphase aus denselben vergleichbaren Messpunkten verwenden.'};
    },{geraetenah_c:29,sitz_c:25.1,raum_referenz_vorher_c:24.8,vergleichsgrenze_k:0.6},
    {lokaler_waermebereich_beobachtet:true,sitzluft_ueber_ausgang:false,naechste_probe:'Gerätenähe getrennt beobachten'}),

  tool('pc_log_betriebsarten_gemischte_fenster_grenze',
    'Aus zählbaren PC-Messintervallen isolierte Arbeit, dokumentierten Leerlauf und überlagerte Zeiträume auseinanderhalten — Audit state coverage before comparing idle against active thermal readings.',
    pc,{
      eintraege_gesamt:num('Intervalle im exportierten Beobachtungsfenster.'),
      ausschliesslich_arbeit:num('Davon vollständig in bestätigter gleichartiger Arbeit.'),
      ausschliesslich_leerlauf:num('Davon andere Zeitabschnitte, vollständig als Leerlauf dokumentiert.'),
      uebergang_gesichert:num('Weitere Abschnitte mit erkanntem Wechsel während des Messintervalls.'),
      minimum_je_zustand:num('Eigenes vorab gesetztes Minimum auswertbarer Abschnitte für beide Gruppen.'),
    },({eintraege_gesamt,ausschliesslich_arbeit,ausschliesslich_leerlauf,uebergang_gesichert,minimum_je_zustand})=>{
      whole(eintraege_gesamt,ausschliesslich_arbeit,ausschliesslich_leerlauf,uebergang_gesichert,minimum_je_zustand);
      const frei=eintraege_gesamt-ausschliesslich_arbeit-ausschliesslich_leerlauf-uebergang_gesichert;
      if(frei<0||!minimum_je_zustand) throw new RangeError();
      return {arbeit_nachbeobachten:Math.max(0,minimum_je_zustand-ausschliesslich_arbeit),
        leerlauf_nachbeobachten:Math.max(0,minimum_je_zustand-ausschliesslich_leerlauf),zustand_offen:frei,
        hinweis:'Überlagerte Phasen gehen nur in eine getrennte Auswertung ein. Das Stichprobenziel ist selbst gesetzt.'};
    },{eintraege_gesamt:20,ausschliesslich_arbeit:10,ausschliesslich_leerlauf:4,uebergang_gesichert:2,minimum_je_zustand:6},
    {arbeit_nachbeobachten:0,leerlauf_nachbeobachten:2,zustand_offen:4}),

  tool('pc_sensorquellen_cpu_gpu_wechsel_nicht_verketten',
    'Nach Wechsel der Monitoring-Ansicht klären, welche alten und neuen Sensorreihen für CPU und GPU getrennt fortgeführt werden können — Preserve independent CPU and GPU log continuity after a telemetry-view change.',
    pc,{
      cpu_identitaet:option('Dokumentierter Abgleich der CPU-Sensorquelle in beiden Ansichten.','gleich','gewechselt','offen'),
      gpu_identitaet:option('Dokumentierter Abgleich der GPU-Sensorquelle in beiden Ansichten.','gleich','gewechselt','offen'),
      temperaturart_gleich:yes('Sind Format, Maßeinheit und bei allen identischen Quellen zugleich die Ableseart belegt?'),
    },({cpu_identitaet,gpu_identitaet,temperaturart_gleich})=>{
      const paare=[['CPU',cpu_identitaet],['GPU',gpu_identitaet]];
      return {fortsetzbare_reihen:temperaturart_gleich?paare.filter(([,status])=>status==='gleich').map(([name])=>name):null,
        getrennt_ausweisen:paare.filter(([,status])=>status==='gewechselt').map(([name])=>name),
        sensornachweis_offen:paare.filter(([,status])=>status==='offen').map(([name])=>name),
        hinweis:'Gleiche Einheit und ähnliche Zahlen genügen nicht. Die Prüfung verändert weder Logging-Einstellungen noch Gerät.'};
    },{cpu_identitaet:'gleich',gpu_identitaet:'gewechselt',temperaturart_gleich:true},
    {fortsetzbare_reihen:['CPU'],getrennt_ausweisen:['GPU'],sensornachweis_offen:[]}),

  tool('pc_dauerlog_aufgabenzeit_und_wandzeit_trennen',
    'Einen Lastzeitpunkt aus der kumulierten Arbeitszeit wieder auf die gemeinsame Uhr setzen, wenn genau eine protokollierte Pause dazwischen lag — Map a task-runtime marker to wall time across one verified pause.',
    pc,{
      start_uhr_s:seconds('Beginn der durchgängig protokollierten Sitzung auf der gemeinsamen Uhr.'),
      pause_ab_aktiv_s:seconds('Kumulierter Arbeitszeitwert beim Beginn der einzigen Pause.'),
      pause_dauer_s:seconds('Separat protokollierte Pausendauer auf der gemeinsamen Uhr.'),
      marker_aktiv_s:seconds('Kumulierter Arbeitszeitwert des zuzuordnenden Ereignisses.'),
      uhr_lief_nur_bei_arbeit:yes('Der aktive Zähler stoppte in genau dieser Pause, ohne Neustart oder weitere Pausen.'),
    },({start_uhr_s,pause_ab_aktiv_s,pause_dauer_s,marker_aktiv_s,uhr_lief_nur_bei_arbeit})=>{
      const mehrdeutig=pause_dauer_s>0&&marker_aktiv_s===pause_ab_aktiv_s;
      const ort=start_uhr_s+marker_aktiv_s+(marker_aktiv_s>pause_ab_aktiv_s?pause_dauer_s:0);
      return {uhrzeit_s:uhr_lief_nur_bei_arbeit&&!mehrdeutig?ort:null,
        marker_am_pausenrand_offen:uhr_lief_nur_bei_arbeit?mehrdeutig:null,
        hinweis:'Der inaktive Zähler kann am Pausenrand mehrere Uhrzeiten bedeuten. Zeitbezug und Vollständigkeit vor Paarungen bestätigen.'};
    },{start_uhr_s:1200,pause_ab_aktiv_s:90,pause_dauer_s:35,marker_aktiv_s:120,uhr_lief_nur_bei_arbeit:true},
    {uhrzeit_s:1355,marker_am_pausenrand_offen:false}),

  tool('laptop_strommessung_akku_startsaldo_proben',
    'Zwei Steckdosenmessungen bei gleicher Laptop-Aufgabe nach protokollierter Ladestandsänderung auf trennbare Bilanz prüfen — Flag unequal battery movement as a confound in two plugged-in laptop energy records.',
    meter,{
      a_start_pct:num('Anzeige des Akkus vor Lauf A in Prozent.',0,100),
      a_ende_pct:num('Entsprechende Anzeige am Ende von A.',0,100),
      b_start_pct:num('Anzeige vor Lauf B in Prozent.',0,100),
      b_ende_pct:num('Entsprechende Anzeige am Ende von B.',0,100),
      toleranz_pp:num('Eigene kleinste unterscheidbare Veränderung der Anzeige in Prozentpunkten.',0,100),
      akkuanzeige_vergleichbar:yes('Dasselbe Gerät, dieselbe Akkuanzeige und vergleichbare Ablesebedingungen.'),
    },({a_start_pct,a_ende_pct,b_start_pct,b_ende_pct,toleranz_pp,akkuanzeige_vergleichbar})=>{
      const a=a_ende_pct-a_start_pct,b=b_ende_pct-b_start_pct;
      return {ladungsaenderungen_pp:akkuanzeige_vergleichbar?[round(a),round(b)]:null,
        ungleicher_akkuspeicherverlauf:akkuanzeige_vergleichbar?Math.abs(a-b)>toleranz_pp:null,
        hinweis:'Akkuprozent sind keine Wh. Selbst eine ähnliche Anzeige beweist keine identische Akkuenergie. Einstellungen und Anschlüsse unverändert lassen.'};
    },{a_start_pct:54,a_ende_pct:61,b_start_pct:88,b_ende_pct:89,toleranz_pp:2,akkuanzeige_vergleichbar:true},
    {ladungsaenderungen_pp:[7,1],ungleicher_akkuspeicherverlauf:true}),

  tool('monitor_sichtprobe_raumlicht_und_bildinhalt',
    'Vor einem Helligkeitsvergleich Monitorproben mit geändertem Bildinhalt und geändertem Tageslicht getrennt aussondern — Audit screen appearance observations for content and room-light confounders.',
    cool,{
      paare:num('Anzahl ursprünglich gepaarter Beobachtungen desselben Monitors.'),
      gleicher_inhalt:num('Davon Paare mit unverändertem Referenzbild.'),
      gleiches_raumlicht:num('Davon wiederum Paare mit ausreichend gleichem Umgebungslicht und gleicher Beobachtungsposition.'),
      modus_ueberprueft:num('Davon wiederum Paare mit nachvollziehbar gleichem vorgesehenem Monitormodus.'),
    },({paare,gleicher_inhalt,gleiches_raumlicht,modus_ueberprueft})=>{
      whole(paare,gleicher_inhalt,gleiches_raumlicht,modus_ueberprueft);
      ordered(modus_ueberprueft,gleiches_raumlicht,gleicher_inhalt,paare);
      return {inhalt_ausschluss:paare-gleicher_inhalt,umgebung_ausschluss:gleicher_inhalt-gleiches_raumlicht,
        mit_vollstaendigem_bezug:modus_ueberprueft,
        hinweis:'Verschachtelte Gruppen. Das Ergebnis ist eine Beobachtung am eigenen Schreibtisch, keine Kalibrierung oder Sehempfehlung.'};
    },{paare:16,gleicher_inhalt:13,gleiches_raumlicht:10,modus_ueberprueft:7},
    {inhalt_ausschluss:3,umgebung_ausschluss:3,mit_vollstaendigem_bezug:7}),

  tool('arbeitsplatz_lichtmessung_bildschirm_lichtquelle_abgrenzen',
    'Die bestehende Lichtmessung am Tisch nur dann als Beleuchtungsreferenz verwenden, wenn die Bildschirmphase als eigene Quelle abgegrenzt ist — Compare controlled black-screen and reference-image readings at a fixed work surface.',
    cool,{
      dunkelbild_lux:num('Gemessene Beleuchtungsstärke am Schreibtisch mit dunklem Referenzbild.',0,100000),
      referenzbild_lux:num('Entsprechende Messung am gleichen Ort mit dokumentiertem Referenzbild.',0,100000),
      toleranz_lux:num('Kleinster eigener unterscheidbarer Messabstand in Lux.',0,100000),
      raumlicht_konstant:yes('Tageslicht, Lampen, Monitorposition und Beobachtungspunkt blieben in beiden Proben gleich.'),
    },({dunkelbild_lux,referenzbild_lux,toleranz_lux,raumlicht_konstant})=>{
      const delta=referenzbild_lux-dunkelbild_lux;
      return {beobachtete_bildabhaengige_lux_aenderung:raumlicht_konstant?round(delta):null,
        referenzbild_im_lichtprotokoll_nennen:raumlicht_konstant?Math.abs(delta)>toleranz_lux:null,
        hinweis:'Lokale Messung der Lichtbedingung. Verändert weder Einstellungen noch belegt sie einen bestimmten Bedarf oder Wärmeeintrag.'};
    },{dunkelbild_lux:112,referenzbild_lux:120,toleranz_lux:4,raumlicht_konstant:true},
    {beobachtete_bildabhaengige_lux_aenderung:8,referenzbild_im_lichtprotokoll_nennen:true}),

  tool('pc_ansaugluft_drei_ablesungen_eigenes_stillstandsband',
    'Aus drei gleichartigen Ansaugluftablesungen die beobachtete Schwankung prüfen, bevor eine kurze Phase als stationär beschrieben wird — Verify a recorded inlet plateau across three unchanged operating samples.',
    pc,{
      anfang_c:temp('Ansaugluftwert zu Beginn des gleichartigen beobachteten Abschnitts.'),
      mitte_c:temp('Zweiter Ansaugluftwert im Abschnitt.'),
      ende_c:temp('Dritter Wert am Ende des Abschnitts.'),
      band_k:num('Selbst begründete maximale Schwankung innerhalb der drei Ablesungen.',0,30),
      gleiche_laufart:yes('Aufgabe, Messort und relevanter Gerätezustand sind unverändert belegt.'),
    },({anfang_c,mitte_c,ende_c,band_k,gleiche_laufart})=>{
      const s=Math.max(anfang_c,mitte_c,ende_c)-Math.min(anfang_c,mitte_c,ende_c);
      return {belegtes_ansaugband_k:gleiche_laufart?round(s):null,
        endpunkte_verdecken_zwischenauslenkung:gleiche_laufart?Math.abs(anfang_c-ende_c)<=band_k&&s>band_k:null,
        hinweis:'Drei Ablesungen bleiben eine Stichprobe. Das eigene Band ist keine technische Grenztemperatur.'};
    },{anfang_c:26.2,mitte_c:28.4,ende_c:26.5,band_k:0.8,gleiche_laufart:true},
    {belegtes_ansaugband_k:2.2,endpunkte_verdecken_zwischenauslenkung:true}),

  tool('arbeitsplatz_tischluefter_messabdeckung_abseits_strahl',
    'Bei einem örtlichen Lüfterversuch Raumrepräsentanz nur mit zeitgleichen Ablesungen außerhalb des direkten Luftstroms beurteilen — Separate in-stream and off-stream data completeness in a desk fan trial.',
    cool,{
      luefterpaare:num('Zeitgleich geplante Paare aus Strahlmesspunkt und abseits liegendem Referenzpunkt.'),
      beides_erfasst:num('Davon Paare mit beiden belegten Messpunkten.'),
      nur_strahl:num('Weitere Paare mit nur am Luftstrompunkt abgelesenem Wert.'),
      referenzposition_bestaetigt:yes('Der Referenzpunkt blieb außerhalb des direkten Stroms, bei gleicher Messweise.'),
    },({luefterpaare,beides_erfasst,nur_strahl,referenzposition_bestaetigt})=>{
      whole(luefterpaare,beides_erfasst,nur_strahl);
      if(beides_erfasst+nur_strahl>luefterpaare) throw new RangeError();
      return {zeitgleiche_raumreferenzen:referenzposition_bestaetigt?beides_erfasst:null,
        lokale_proben_ohne_raumbezug:nur_strahl,weitere_luecken:luefterpaare-beides_erfasst-nur_strahl,
        hinweis:'Ein Referenzpunkt ergänzt den lokalen Messwert. Er allein belegt keine gleichmäßige Temperatur im gesamten Zimmer.'};
    },{luefterpaare:14,beides_erfasst:9,nur_strahl:4,referenzposition_bestaetigt:true},
    {zeitgleiche_raumreferenzen:9,lokale_proben_ohne_raumbezug:4,weitere_luecken:1}),

  tool('pc_displayphase_puffer_zweiseitig',
    'Bei einem Wärmeprotokoll die getrennt gewählten Abstände vor und nach einem bekannten Bildschirmwechsel aus der Vergleichsphase heraushalten — Trim an observed desk thermal log around a known display transition.',
    cool,{
      protokoll_ab_s:seconds('Beginn eines sonst gleichartig protokollierten PC-Abschnitts.'),
      displaywechsel_s:seconds('Zeitpunkt des bekannten Bildschirmzustandswechsels.'),
      protokoll_bis_s:seconds('Ende des Abschnitts.'),
      abstand_vorher_s:seconds('Eigenes vorab gewähltes Ausschlussfenster vor der beobachteten Umschaltung.'),
      abstand_nachher_s:seconds('Eigenes vorab gewähltes Ausschlussfenster nach dem Wechsel.'),
    },({protokoll_ab_s,displaywechsel_s,protokoll_bis_s,abstand_vorher_s,abstand_nachher_s})=>{
      ordered(protokoll_ab_s,displaywechsel_s,protokoll_bis_s);
      return {vergleichbar_vorher_s:round(Math.max(0,displaywechsel_s-abstand_vorher_s-protokoll_ab_s)),
        vergleichbar_nachher_s:round(Math.max(0,protokoll_bis_s-displaywechsel_s-abstand_nachher_s)),
        hinweis:'Zeitliche Filterregel für das eigene Protokoll. Andere Zustandswechsel und fehlende Messwerte zusätzlich prüfen.'};
    },{protokoll_ab_s:65,displaywechsel_s:112,protokoll_bis_s:210,abstand_vorher_s:20,abstand_nachher_s:35},
    {vergleichbar_vorher_s:27,vergleichbar_nachher_s:63}),

  tool('arbeitsplatz_druckphase_waermeprotokoll',
    'Eine lokale Temperaturänderung nur dann separat einem protokollierten Druckfenster gegenüberstellen, wenn PC und Beleuchtung unverändert dokumentiert sind — Isolate a logged printer episode from changes to other desk loads.',
    cool,{
      drucker_vorher_waerme_c:temp('Messwert an einem fest markierten lokalen Punkt vor der Druckphase.'),
      drucker_nachher_waerme_c:temp('Messwert an demselben Punkt nach der definierten Phase.'),
      pc_und_bildschirm_unveraendert:yes('PC-Arbeitslast und Bildschirmzustand sind währenddessen überwacht und blieben ähnlich.'),
      licht_und_sonne_unveraendert:yes('Künstliches Licht und Sonne veränderten sich am Messpunkt währenddessen nicht wesentlich.'),
      druckereignis_belegt:yes('Die Druckphase ist im gleichen Zeitfenster tatsächlich dokumentiert.'),
    },({drucker_vorher_waerme_c,drucker_nachher_waerme_c,pc_und_bildschirm_unveraendert,licht_und_sonne_unveraendert,druckereignis_belegt})=>{
      return {lokale_aenderung_in_isolierter_probe_c:pc_und_bildschirm_unveraendert&&licht_und_sonne_unveraendert&&druckereignis_belegt?
        round(drucker_nachher_waerme_c-drucker_vorher_waerme_c):null,
        fehlende_kontrollen:[!pc_und_bildschirm_unveraendert?'PC und Bildschirm':null,!licht_und_sonne_unveraendert?'Licht':null,!druckereignis_belegt?'Druckphase':null].filter(Boolean),
        hinweis:'Ein zeitlich abgegrenzter Zusammenhang ist kein Nachweis für die gesamte abgegebene Wärme oder Wirkung im Raum.'};
    },{drucker_vorher_waerme_c:26.4,drucker_nachher_waerme_c:27.8,pc_und_bildschirm_unveraendert:true,licht_und_sonne_unveraendert:false,druckereignis_belegt:true},
    {lokale_aenderung_in_isolierter_probe_c:null,fehlende_kontrollen:['Licht']}),

  tool('arbeitsplatz_sitzdauer_waermerueckmeldung_abdeckung',
    'Bei einem beobachteten Arbeitsplatzwechsel die eigene Rückmeldung von allen Zeitabschnitten ohne dokumentierte Sitznutzung trennen — Count evidenced personal comfort across an interrupted desk session.',
    warm,{
      arbeitszeit_min:num('Dauer der gesamten betrachteten Arbeitszeit in Minuten.',0,1440),
      eigener_platz_min:num('Davon protokollierte Minuten am eigentlichen Arbeitsplatz.',0,1440),
      persoenlich_warm_min:num('Davon Minuten mit ausdrücklich erfasster brauchbarer persönlicher Wärme.',0,1440),
      erfassung_sitzblock_vollstaendig:yes('Der dokumentierte Sitzblock war vollständig mit Rückmeldungen abgedeckt.'),
    },({arbeitszeit_min,eigener_platz_min,persoenlich_warm_min,erfassung_sitzblock_vollstaendig})=>{
      ordered(persoenlich_warm_min,eigener_platz_min,arbeitszeit_min);
      return {sitzminuten_ohne_brauchbaren_warmnachweis:round(eigener_platz_min-persoenlich_warm_min),
        andere_abschnitte_min:round(arbeitszeit_min-eigener_platz_min),
        eigener_sitz_warmanteil_prozent:erfassung_sitzblock_vollstaendig&&eigener_platz_min>0?round(100*persoenlich_warm_min/eigener_platz_min):null,
        hinweis:'Freiwillige persönliche Beobachtung. Zeiten ohne Aussage oder an einem anderen Ort bleiben offen.'};
    },{arbeitszeit_min:96,eigener_platz_min:75,persoenlich_warm_min:54,erfassung_sitzblock_vollstaendig:true},
    {sitzminuten_ohne_brauchbaren_warmnachweis:21,andere_abschnitte_min:21,eigener_sitz_warmanteil_prozent:72}),

  tool('pc_cpu_gpu_gleiches_zeitfenster_spitzenreihenfolge',
    'Auf derselben PC-Lastachse prüfen, ob CPU- und GPU-Messspitzen zeitlich unterscheidbar oder wegen Ableseauflösung uneindeutig sind — Compare recorded CPU and GPU peak timing using the actual clock resolution.',
    pc,{
      cpu_spitze_s:seconds('Zeitstempel des ersten Auftretens des höchsten beobachteten CPU-Werts.'),
      gpu_spitze_s:seconds('Zeitstempel des ersten Auftretens des entsprechenden GPU-Maximums.'),
      zeitliche_grenze_s:seconds('Belegte kleinste unterscheidbare Zeitdifferenz beider Reihen gemeinsam.'),
      gleicher_lauf_und_spitzenabdeckung:yes('Beide Reihen decken denselben Lauf vollständig ab, mit einheitlicher Zeitbasis.'),
    },({cpu_spitze_s,gpu_spitze_s,zeitliche_grenze_s,gleicher_lauf_und_spitzenabdeckung})=>{
      const delta=cpu_spitze_s-gpu_spitze_s;
      return {beobachtete_reihenfolge:gleicher_lauf_und_spitzenabdeckung?
        (Math.abs(delta)<=zeitliche_grenze_s?'zeitlich nicht trennbar':delta<0?'CPU zuerst':'GPU zuerst'):null,
        zeitabstand_s:gleicher_lauf_und_spitzenabdeckung?round(Math.abs(delta)):null,
        hinweis:'Bezieht sich auf beobachtete höchste Ablesungen im angegebenen Abschnitt. Keine Aussage zu Ausbreitungspfad, Ursache oder Gerätegrenzwert.'};
    },{cpu_spitze_s:295,gpu_spitze_s:311,zeitliche_grenze_s:7,gleicher_lauf_und_spitzenabdeckung:true},
    {beobachtete_reihenfolge:'CPU zuerst',zeitabstand_s:16}),
];
