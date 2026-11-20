const page = '/produkte.html';
const manual = 'https://media.miele.com/downloads/0d/c6/04_C7F12828E3FE1FE0BB8C547A67460DC6.pdf';
const panSource = 'https://www.tefal.de/bedienungsanleitungen/kochgeschirr/toepfe-und-pfannen-mit-griff-aus-edelstahl/duetto-pfanne-24-cm-a70404/csp/2100120570';
const uSource = 'https://www.miele.de/support/customer-assistance/kochfelder-1180/alle_kategorien/u_in_der_anzeige-92670027531';
const checked = '2026-11-20';
const flag = description => ({type:'boolean', description});
const pick = (description, ...values) => ({type:'string', description, enum:values});
const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const mm = description => number(description, 1, 1000);
const minutes = description => number(description, 0, 240);
const model = flag('Genau Miele KM 7464 FR (11022890) und die deutsche Modellzeile in Handbuch 11 163 871 bestätigt');
const allZones = ['a','b','c','d','c+d'];
const modes = ['normal','twinbooster_1','twinbooster_2'];
const singleZones = allZones.slice(0, 4);
const zone = description => pick(description, ...allZones);
const singleZone = description => pick(description, ...singleZones);
const yesNoOpen = description => pick(description, 'ja', 'nein', 'offen');
const recognition = description => pick(description, 'erkannt', 'u', 'unbeobachtet');
const zones = {
  a:{position:'vorne links', round:[140,190], rect:null, watts:[1850,2500,3000]},
  b:{position:'hinten links', round:[100,160], rect:null, watts:[1400,1700,2200]},
  c:{position:'hinten rechts, einzeln', round:[150,230], rect:[[150,230],[150,190]], watts:[2100,3000,3650]},
  d:{position:'vorne rechts, einzeln', round:[150,230], rect:[[150,230],[150,190]], watts:[2100,3000,3650]},
  'c+d':{position:'beide rechten Zonen verbunden', round:[220,230], rect:[[220,230],[220,390]], watts:[3400,4800,7300]}
};
const paired = {a:'d', b:'c', c:'b', d:'a'};
const covers = key => key==='c+d' ? ['c','d'] : [key];
const fits = (value, interval) => value>=interval[0] && value<=interval[1];
const vacant = (key, blocked) => covers(key).every(part => !blocked.includes(part));
const range = ([min,max]) => ({min,max});
const rounded = value => Math.round(value*100)/100;

function entry(name, description, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example:{args, expect}};
}
function candidates(form, first, second) {
  return allZones.filter(key => form==='rund' ? fits(first,zones[key].round)
    : zones[key].rect && fits(first,zones[key].rect[0]) && fits(second,zones[key].rect[1]));
}
function metadata(pages) {
  return {herstellerquelle:manual, handbuchseiten:pages, stand:checked};
}

export const induktionsgeschirrBelege = [
  entry('induktion_km7464f_de_kochboden_zonenauswahl',
    'Ordne ein vorhandenes Gefäß am belegten deutschen KM 7464 FR anhand der Bodenform und des Bodenmaßes einer dokumentierten Zone zu — Find documented zone envelopes for a cookware base',
    {
      modell_bestaetigt:model,
      gefaess:pick('Bodenmaß laut exakter Tefal-Quelle oder am flachen Gefäßboden erfasst', 'rund_boden_gemessen','rechteck_boden_gemessen','tefal_a7040463','nur_rand_oder_offen'),
      boden_durchmesser_oder_breite_mm:mm('Runder Bodendurchmesser oder rechteckige Breite quer zum Feld; bei Herstellerwert oder offener Bodenform wird die Eingabe ignoriert'),
      bodentiefe_mm:mm('Rechteckige Tiefe von vorn nach hinten; wird bei Rundform, Herstellerwert oder offener Bodenform ignoriert')
    }, a => {
      const known = a.modell_bestaetigt && a.gefaess!=='nur_rand_oder_offen';
      const tefal = a.gefaess==='tefal_a7040463';
      const form = a.gefaess==='rechteck_boden_gemessen' ? 'rechteck' : 'rund';
      const base = tefal ? 175 : a.boden_durchmesser_oder_breite_mm;
      const eligible = known ? candidates(form,base,a.bodentiefe_mm) : null;
      return {
        status:!known?'beleg_offen':eligible.length?'tabellenmass_innerhalb':'kein_passendes_tabellenmass',
        passende_zonen:eligible?.map(key => ({zone:key, lage:zones[key].position})) ?? null,
        tefal_nennmass_cm:tefal?24:null,
        tefal_boden_mm:tefal?175:null,
        massbereiche:a.modell_bestaetigt ? allZones.map(key=>({zone:key, lage:zones[key].position,
          rund_mm:range(zones[key].round), rechteck_mm:zones[key].rect?.map(range)??null})) : null,
        ...metadata([38,43,65]), gefaessquelle:tefal?panSource:null,
        grenze:'Boden statt oberem Rand lesen. Rechteckmaß gilt in der eingegebenen Ausrichtung. Eine Maßübereinstimmung bestätigt weder Material noch Erkennung.'
      };
    },{modell_bestaetigt:true,gefaess:'tefal_a7040463',boden_durchmesser_oder_breite_mm:240,bodentiefe_mm:1},
    {status:'tabellenmass_innerhalb',passende_zonen:[{zone:'a',lage:'vorne links'},{zone:'c',lage:'hinten rechts, einzeln'},{zone:'d',lage:'vorne rechts, einzeln'}],tefal_boden_mm:175}),

  entry('induktion_zwei_gefaesse_exklusive_zonen_belegung',
    'Prüfe, ob zwei vorhandene Böden gleichzeitig unterschiedlichen Zonen zugeordnet werden können, wenn eine rechte Verbundzone beide Einzelzonen belegt — Solve a simultaneous two-vessel zone assignment',
    {
      modell_bestaetigt:model,
      erstes_rechteck:flag('Erstes Gefäß rechteckig; andernfalls rund'),
      erste_breite_mm:mm('Gemessen am Boden, runder Durchmesser oder rechteckige Breite'),
      erste_tiefe_mm:mm('Rechteckige Bodentiefe; bei rundem Boden ignoriert'),
      zweites_rechteck:flag('Zweites Gefäß rechteckig; andernfalls rund'),
      zweite_breite_mm:mm('Gemessen am Boden, runder Durchmesser oder rechteckige Breite'),
      zweite_tiefe_mm:mm('Rechteckige Bodentiefe; bei rundem Boden ignoriert'),
      bodenmasse_belegt:flag('Maße und gegebenenfalls Ausrichtung beider Gefäße sind nachvollziehbar')
    }, a => {
      const known=a.modell_bestaetigt&&a.bodenmasse_belegt;
      const first=known?candidates(a.erstes_rechteck?'rechteck':'rund',a.erste_breite_mm,a.erste_tiefe_mm):[];
      const next=known?candidates(a.zweites_rechteck?'rechteck':'rund',a.zweite_breite_mm,a.zweite_tiefe_mm):[];
      const pairs=first.flatMap(zoneA=>next.filter(zoneB=>vacant(zoneB,covers(zoneA))).map(zoneB=>[zoneA,zoneB]));
      return {
        status:!known?'beleg_offen':pairs.length?'getrennte_belegung_moeglich':first.length&&next.length?'einzeln_abgedeckt_gleichzeitig_konflikt':'mindestens_ein_boden_nicht_abgedeckt',
        getrennte_belegungen:known?pairs:null,
        ...metadata([43]), grenze:'Nur dokumentierte Bodenbereiche und belegte Kochzonen. Rand, Griffe, Erkennung und Leistungsaufteilung separat betrachten.'
      };
    },{modell_bestaetigt:true,erstes_rechteck:true,erste_breite_mm:225,erste_tiefe_mm:310,zweites_rechteck:false,zweite_breite_mm:201,zweite_tiefe_mm:1,bodenmasse_belegt:true},
    {status:'einzeln_abgedeckt_gleichzeitig_konflikt',getrennte_belegungen:[]}),

  entry('induktion_anzeige_u_beobachtungszweige',
    'Trenne bei einem festgehaltenen u der Miele-Anzeige fehlendes Gefäß, unbekannten Boden und fehlenden Modellbeleg — Triage recorded induction cookware recognition evidence',
    {
      anzeige:recognition('Auf der betroffenen Anzeige beobachteter Status'),
      gefaess_auf_zone:yesNoOpen('Zum selben Zeitpunkt stand ein Gefäß mittig auf der beobachteten Zone'),
      hersteller_induktion:yesNoOpen('Herstellerangabe zur Induktion für genau dieses Gefäß'),
      bodenmasse_im_bereich:yesNoOpen('Bodenmaß, Form und aktive Zonenart gegen exakte Handbuchzeile geprüft')
    }, a => {
      const reasons=[];
      if(a.anzeige==='u') {
        if(a.gefaess_auf_zone==='nein') reasons.push('gefaess_fehlt_beim_signal');
        if(a.gefaess_auf_zone!=='nein'&&a.hersteller_induktion==='nein') reasons.push('gefaess_laut_hersteller_ungeeignet');
        if(a.gefaess_auf_zone!=='nein'&&a.bodenmasse_im_bereich==='nein') reasons.push('boden_ausserhalb_zonenbereich');
      }
      const open=Object.entries({aufstellung:a.gefaess_auf_zone,herstellerangabe:a.hersteller_induktion,bodenmasse:a.bodenmasse_im_bereich})
        .filter(([,value])=>value==='offen').map(([key])=>key);
      return {beobachtetes_signal:a.anzeige, belegte_erklaerungskandidaten:reasons, offene_belege:open,
        herstellerquelle:uSource, grenze:'Das Zeichen allein unterscheidet die dokumentierten Ursachen nicht. Bei belegten Voraussetzungen und weiterem u bleiben weitere Ursachen offen.'};
    },{anzeige:'u',gefaess_auf_zone:'ja',hersteller_induktion:'ja',bodenmasse_im_bereich:'offen'},
    {beobachtetes_signal:'u',belegte_erklaerungskandidaten:[],offene_belege:['bodenmasse']}),

  entry('induktion_erkennung_wechselseitige_probe_zuordnung',
    'Lies zwei bereits beobachtete Gefäße in zwei Einzelzonen als Wechselprobe, um einen gefäß- oder zonengebundenen Hinweis zu unterscheiden — Interpret a paired cookware–zone recognition swap',
    {
      gefaess_a_zone_1:recognition('Beobachtung für A auf Zone 1'),
      gefaess_a_zone_2:recognition('Beobachtung für A auf Zone 2'),
      gefaess_b_zone_1:recognition('Beobachtung für B auf Zone 1'),
      gefaess_b_zone_2:recognition('Beobachtung für B auf Zone 2'),
      erkennungsbedingungen_gleich:flag('Zwei verschiedene Einzelzonen und zwei Gefäße, jeweils gleicher Erkennungsmodus, mittige Platzierung und dokumentierte Bodenbereiche')
    }, a => {
      const observations=[a.gefaess_a_zone_1,a.gefaess_a_zone_2,a.gefaess_b_zone_1,a.gefaess_b_zone_2];
      const known=a.erkennungsbedingungen_gleich&&!observations.includes('unbeobachtet');
      const [a1,a2,b1,b2]=observations;
      const vessel=a1===a2&&b1===b2&&a1!==b1;
      const zonePattern=a1===b1&&a2===b2&&a1!==a2;
      return {muster:!known?'vergleich_offen':vessel?'folgt_gefaess':zonePattern?'folgt_zone':
        observations.every(value=>value===a1)?'einheitlich':'wechselwirkung_oder_streuung',
        erkennung_offen_beobachtungen:observations.filter(value=>value==='unbeobachtet').length,
        herstellerquelle:uSource, grenze:'Ein Wechselmuster beschreibt Aufzeichnungen. Es belegt weder einen Defekt noch eine vollständige Kompatibilität.'};
    },{gefaess_a_zone_1:'u',gefaess_a_zone_2:'u',gefaess_b_zone_1:'erkannt',gefaess_b_zone_2:'erkannt',erkennungsbedingungen_gleich:true},
    {muster:'folgt_gefaess',erkennung_offen_beobachtungen:0}),

  entry('induktion_powerflex_aktivierte_rechte_zonen_beleg',
    'Unterscheide bei einem beobachteten PowerFlex-Vorgang zwischen einer Größenannahme, dokumentierter Zonenverbindung und unbelegter Steckbriefangabe — Confirm whether observed right-side zones were actually linked',
    {
      modell_bestaetigt:model,
      beleg:pick('Im selben Vorgang dokumentierter Anzeigenstatus', 'verbindung_angezeigt','zwei_einzelzonen_angezeigt','nur_gefaess_oder_groessenangabe','unbekannt'),
      angezeigte_verwendung:pick('Selbe Zeit und rechte Seite eindeutig zugeordnet', 'relevante_zeit_und_rechte_seite','anderer_zeitpunkt_oder_unbekannt'),
      gefaess_auf_beiden_rechts:yesNoOpen('Ein einziges Gefäß bedeckte nach der Beobachtung beide rechten Einzelzonen')
    }, a => {
      const known=a.modell_bestaetigt&&a.angezeigte_verwendung==='relevante_zeit_und_rechte_seite';
      const active=known&&a.beleg==='verbindung_angezeigt';
      return {rechte_zonenart:active?'verbunden':known&&a.beleg==='zwei_einzelzonen_angezeigt'?'einzeln':'offen',
        gefaess_und_verbund_gemeinsam_belegt:active&&a.gefaess_auf_beiden_rechts==='ja',
        ...metadata([43,48,56]), grenze:'Die Anzeige bezieht sich auf die beobachtete Verbindung. Ein großes Gefäß, die Werbeabmessung oder eine Aktivierung allein zeigt keine gemessene Wärmeverteilung.'};
    },{modell_bestaetigt:true,beleg:'nur_gefaess_oder_groessenangabe',angezeigte_verwendung:'relevante_zeit_und_rechte_seite',gefaess_auf_beiden_rechts:'ja'},
    {rechte_zonenart:'offen',gefaess_und_verbund_gemeinsam_belegt:false}),

  entry('induktion_km7464f_modus_wattangabe_zonenbezug',
    'Prüfe, zu welcher Zone und Leistungsstufe eine kopierte Wattangabe im Modellhandbuch gehört — Match a quoted watt figure to an exact zone and mode',
    {
      modell_bestaetigt:model,
      kochzone:zone('Zone anhand der Modellzeichnung; c+d gilt ausschließlich für verbundenen PowerFlex-Bereich'),
      modus:pick('Modus, auf den sich die Angabe ausdrücklich bezieht',...modes,'nicht_genannt'),
      angebot_watt:number('Kopierter einzelner Leistungswert in Watt, keine Summe mehrerer Zonen',1,15000)
    }, a => {
      const part=a.modell_bestaetigt?zones[a.kochzone]:null;
      const modeIndex=modes.indexOf(a.modus);
      const watt=part && modeIndex!==-1 ? part.watts[modeIndex] : null;
      const same=part ? modes.filter((_,i)=>part.watts[i]===a.angebot_watt) : null;
      return {tabellenwert_w:watt, status:!part||watt===null?'bezugsbeleg_offen':
        watt===a.angebot_watt?'stimmt_mit_zonenmodus':'weicht_vom_zonenmodus_ab',
        zitierter_wert_auf_dieser_zone_in_modus:same,
        maximale_betriebswerte_w:part?Object.fromEntries(modes.map((mode,i)=>[mode,part.watts[i]])):null,
        ...metadata([43,46]), grenze:'Herstellerwerte für die ausgewiesene Zone und Betriebsart. Die tatsächliche Leistung hängt auch von Gefäß und Leistungszuteilung ab. Keine Aussage zur Anschlussleistung.'};
    },{modell_bestaetigt:true,kochzone:'c',modus:'twinbooster_1',angebot_watt:3650},
    {tabellenwert_w:3000,status:'weicht_vom_zonenmodus_ab',zitierter_wert_auf_dieser_zone_in_modus:['twinbooster_2']}),

  entry('induktion_zonenpaar_leistungsabgabe_signalfolge',
    'Ordne eine dokumentierte Leistungsänderung zeitlich dem im Handbuch zugeordneten Einzelzonenpaar zu — Check observed power-sharing changes against the manual zone pair',
    {
      modell_bestaetigt:model,
      angefordert_auf:singleZone('Einzelzone, auf der eine Leistungserhöhung angefordert wurde'),
      beobachtet_auf:singleZone('Andere Einzelzone mit erfasstem Status'),
      beobachtung:pick('Beobachtete Änderung', 'leistungsstufe_sank','ankochautomatik_endete','booster_endete','zone_ging_aus','keine_aenderung','unbekannt'),
      aenderung_folgte:yesNoOpen('Die Statusänderung trat nach der Anforderung auf; gleicher Lauf, Zeitpunkt nachvollziehbar'),
      weiterer_eingriff:yesNoOpen('Weitere Einstellung oder andere gleichzeitige Eingriffe dokumentiert')
    }, a => {
      if(a.angefordert_auf===a.beobachtet_auf) throw new RangeError('Zwei verschiedene Einzelzonen angeben.');
      const partner=a.modell_bestaetigt?paired[a.angefordert_auf]:null;
      const observed=!['keine_aenderung','unbekannt'].includes(a.beobachtung);
      const status=!partner?'modell_offen':partner!==a.beobachtet_auf?'kein_zugeordnetes_einzelpaar':
        a.beobachtung==='keine_aenderung'?'keine_aenderung_beobachtet':observed&&a.aenderung_folgte==='ja'&&a.weiterer_eingriff==='nein'
          ?'zeitfolge_passt_zur_dokumentierten_leistungsabgabe':'kausalitaet_offen';
      return {zugeordnete_partnerzone:partner,status,...metadata([43,46]),
        grenze:'Eine zeitlich passende Beobachtung erklärt den protokollierten Hinweis plausibel. Sie liefert keine Messung der Leistungsaufnahme oder Diagnose eines Geräts.'};
    },{modell_bestaetigt:true,angefordert_auf:'a',beobachtet_auf:'d',beobachtung:'booster_endete',aenderung_folgte:'ja',weiterer_eingriff:'nein'},
    {zugeordnete_partnerzone:'d',status:'zeitfolge_passt_zur_dokumentierten_leistungsabgabe'}),

  entry('induktion_booster_laufzeit_und_beobachtete_phase',
    'Ordne das beobachtete Booster-Ende und eine Leistungsprobe dem passenden Abschnitt zu — Distinguish an observed booster interval from subsequent operation',
    {
      modell_bestaetigt:model,
      start_bestaetigt:flag('Aktivierung auf genau derselben Zone mit Zeitstempel dokumentiert'),
      ende_beobachtet:flag('Ende des Boosterstatus ausdrücklich beobachtet'),
      ende_ab_start_min:minutes('Beobachtetes Ende ab Aktivierung, bei fehlender Ende-Beobachtung ignoriert'),
      probe_start_min:minutes('Beginn des ausgewerteten Intervalls, relativ zur Aktivierung'),
      probe_ende_min:minutes('Ende des ausgewerteten Intervalls, relativ zur Aktivierung')
    }, a => {
      if(a.probe_ende_min<=a.probe_start_min) throw new RangeError('Messintervall braucht ein späteres Ende.');
      const known=a.modell_bestaetigt&&a.start_bestaetigt;
      const end=known&&a.ende_beobachtet?a.ende_ab_start_min:null;
      return {maximaldauer_min:known?15:null, ende_status:end===null?'offen':end<15?'vor_tabellengrenze':
        end===15?'an_tabellengrenze':'zeitbezug_und_modus_pruefen',
        messphase:end===null||end>15?'offen':a.probe_ende_min<=end?'vor_beobachtetem_ende':
          a.probe_start_min>=end?'nach_beobachtetem_ende':'ueber_boosterwechsel',
        ...metadata([56]), grenze:'Den Zeitstempel der tatsächlichen Aktivierung benutzen. Ein früherer Wechsel hat mehrere mögliche Ursachen. Eine Maximaldauer ist keine garantierte Laufzeit.'};
    },{modell_bestaetigt:true,start_bestaetigt:true,ende_beobachtet:true,ende_ab_start_min:12.5,probe_start_min:11,probe_ende_min:14},
    {maximaldauer_min:15,ende_status:'vor_tabellengrenze',messphase:'ueber_boosterwechsel'}),

  entry('induktion_timer_akustisch_gegen_konkret_abgeschaltet',
    'Unterscheide den Küchenwecker von belegter Abschaltung der vorgesehenen Kochzone — Separate an audible timer event from zone shutoff',
    {
      modell_bestaetigt:model,
      timeranzeige:pick('Vorher tatsächlich dokumentierter Timer', 'kurzzeitwecker','abschaltung_zone','beide','unbekannt'),
      zielzone_zugeordnet:yesNoOpen('Eine Anzeige der Abschaltfunktion war eindeutig gerade dieser Zone zugeordnet'),
      signal_gehoert:flag('Ein Tonsignal wurde im betrachteten Zeitraum erfasst'),
      zone_nachher:pick('Status der betroffenen Zone unmittelbar nach dem Zeitpunkt', 'aus','aktiv','unbeobachtet'),
      gleicher_zeitpunkt:flag('Timerende und Zonenstatus Zeitstempel aus diesem selben Lauf')
    }, a => {
      const assigned=a.modell_bestaetigt&&a.zielzone_zugeordnet==='ja'&&['abschaltung_zone','beide'].includes(a.timeranzeige);
      const stop=assigned&&a.gleicher_zeitpunkt&&a.zone_nachher==='aus';
      return {zonen_komponente_dokumentiert:assigned,status:stop?'zonenzuordnung_und_aussignal_beobachtet':
        a.gleicher_zeitpunkt&&a.zone_nachher==='aktiv'?'zone_blieb_nach_zeitpunkt_aktiv':
          a.signal_gehoert?'ton_allein':'zonenende_offen',
        ...metadata([48,49,58,59]), grenze:'Kurzzeitwecker und Abschaltzeiten können parallel laufen. Auch bei beobachteter Abschaltung gelten nur die zugeordnete Zone und der erfasste Lauf.'};
    },{modell_bestaetigt:true,timeranzeige:'beide',zielzone_zugeordnet:'offen',signal_gehoert:true,zone_nachher:'unbeobachtet',gleicher_zeitpunkt:false},
    {zonen_komponente_dokumentiert:false,status:'ton_allein'}),

  entry('induktion_gefaessgriffe_kalte_aussenkontur_probe',
    'Prüfe eine dokumentierte Kaltprobe auf überlappende Außenkonturen entlang einer geraden Trennlinie, nachdem die Böden den Zonen zugeordnet sind — Evaluate the observed cold side-by-side footprint including handles',
    {
      trennabstand_mm:mm('Gemessener Abstand der beiden Gefäßmitten entlang der betrachteten geraden Linie'),
      erster_ueberstand_mm:mm('Reichweite von Mitte A nach B, einschließlich Griff, in exakt der beobachteten Ausrichtung'),
      zweiter_ueberstand_mm:mm('Reichweite von Mitte B nach A, einschließlich Griff, in exakt der beobachteten Ausrichtung'),
      eigener_mindestabstand_mm:number('Gewünschter rein geometrischer Zwischenraum, kein Sicherheitsabstand',0,400),
      kontur_in_gemeinsamer_linie:flag('Beide Reichweiten liegen auf demselben relevanten Streifen; bei seitlich versetzten Griffen erst Kaltprobe nachsehen')
    }, a => {
      const leftover=a.kontur_in_gemeinsamer_linie ? a.trennabstand_mm-a.erster_ueberstand_mm-a.zweiter_ueberstand_mm : null;
      return {rechnerischer_zwischenraum_mm:leftover===null?null:rounded(leftover),
        status:leftover===null?'aufstellung_offen':leftover<0?'konturen_ueberlappen_in_der_linienprobe':
          leftover<a.eigener_mindestabstand_mm?'eigener_zwischenraum_unterschritten':'eigener_zwischenraum_erreicht',
        ...metadata([43,65]), grenze:'Kalte statische Probe einer Richtung. Die Handbuchtabelle beschreibt Böden. Rand und fest montierte Griffe dennoch separat als Nutzermaß betrachten.'};
    },{trennabstand_mm:320,erster_ueberstand_mm:180,zweiter_ueberstand_mm:120,eigener_mindestabstand_mm:25,kontur_in_gemeinsamer_linie:true},
    {rechnerischer_zwischenraum_mm:20,status:'eigener_zwischenraum_unterschritten'}),

  entry('induktion_waermeverlauf_gefaess_als_versuchsfaktor',
    'Vergleiche bereits gemessene Zeiten zu demselben selbst definierten Beobachtungspunkt mit zwei Gefäßen, sofern das Gefäß der einzige geänderte Faktor war — Compare observed repeat timings while changing only the vessel',
    {
      faktor_gleich:flag('Gleiche Kochzone, Modus und gemessene Ausgangsbedingungen einschließlich gleicher Füllmenge und desselben beobachteten Endpunkts'),
      minuten_a1:minutes('Erster beobachteter Lauf mit A'),
      minuten_a2:minutes('Zweiter beobachteter Lauf mit A'),
      minuten_b1:minutes('Erster beobachteter Lauf mit B'),
      minuten_b2:minutes('Zweiter beobachteter Lauf mit B'),
      zeitablesung_toleranz_min:number('Bekannte kombinierte Unsicherheit des Vergleichs in Minuten',0,30)
    }, a => {
      const times=[a.minuten_a1,a.minuten_a2,a.minuten_b1,a.minuten_b2];
      if(times.includes(0)) throw new RangeError('Vier bereits dokumentierte Laufzeiten größer null angeben.');
      const sep=Math.max(Math.min(a.minuten_a1,a.minuten_a2)-Math.max(a.minuten_b1,a.minuten_b2),
        Math.min(a.minuten_b1,a.minuten_b2)-Math.max(a.minuten_a1,a.minuten_a2));
      return {muster:!a.faktor_gleich?'mehrere_veraenderte_faktoren':sep<=a.zeitablesung_toleranz_min?
        'beobachtungsfenster_nicht_klar_getrennt':Math.max(a.minuten_a1,a.minuten_a2)<Math.min(a.minuten_b1,a.minuten_b2)
          ?'a_erreichte_messpunkt_in_diesen_proben_frueher':'b_erreichte_messpunkt_in_diesen_proben_frueher',
        kleinster_beobachteter_abstand_min:a.faktor_gleich?rounded(Math.max(0,sep)):null,
        ...metadata([43]), grenze:'Zeit zum gleichen beobachteten Punkt ist eine Nutzerbeobachtung. Daraus keine genaue elektrische Leistung, neue Gerätespezifikation, Garzeit oder allgemeine Eignung ableiten.'};
    },{faktor_gleich:true,minuten_a1:6.2,minuten_a2:6.5,minuten_b1:7.2,minuten_b2:7.1,zeitablesung_toleranz_min:0.3},
    {muster:'a_erreichte_messpunkt_in_diesen_proben_frueher',kleinster_beobachteter_abstand_min:0.6}),

  entry('induktion_magnet_am_boden_hersteller_widerspruch',
    'Werte die Magnetprobe am kalten Gefäßboden gemeinsam mit der exakten Herstellerkennzeichnung aus — Reconcile a cold base magnet observation and the exact cookware specification',
    {
      hersteller_induktion:yesNoOpen('Explizite Eignung für Induktion, bezogen auf genau die vorliegende Gefäßvariante'),
      magnet_probe:pick('Protokollierte Beobachtung am kalten Gefäß', 'am_boden_haftet','am_boden_haftet_nicht','nur_rand_oder_griff','keine_probe'),
      quelle_zur_variante:flag('Herstellerdokument und vorhandenes oder angebotenes Gefäß anhand der exakten Kennung zugeordnet')
    }, a => {
      const declaration=a.quelle_zur_variante?a.hersteller_induktion:'offen';
      const attracted=a.magnet_probe==='am_boden_haftet';
      const notAttracted=a.magnet_probe==='am_boden_haftet_nicht';
      const discrepancy=(declaration==='ja'&&notAttracted)||(declaration==='nein'&&attracted);
      return {status:discrepancy?'beobachtung_und_angabe_widersprechen_sich':
        declaration!=='offen'?(declaration==='ja'?'eignung_laut_hersteller':'laut_hersteller_nicht_vorgesehen'):
          attracted?'allgemeiner_hinweis_aus_bodenprobe':notAttracted?'keine_haftung_beobachtet':'bodenbeleg_offen',
        ...metadata([64,65]), grenze:'Eine Bodenprobe liefert einen Hinweis. Materialbezeichnung am Rand, passender Bodendurchmesser und tatsächliche Erkennung beantworten unterschiedliche Fragen.'};
    },{hersteller_induktion:'ja',magnet_probe:'am_boden_haftet_nicht',quelle_zur_variante:true},
    {status:'beobachtung_und_angabe_widersprechen_sich'}),

  entry('induktion_stop_go_laufende_timer_pausenannahme',
    'Prüfe anhand des beobachteten Stop&Go-Intervalls, wie viel einer vorher belegten Timerzeit ohne Eingriff abläuft — Compare a recorded Stop&Go interval to the running timer',
    {
      modell_bestaetigt:model,
      stoppmodus_dokumentiert:flag('Stop&Go war für dieses Intervall tatsächlich angezeigt'),
      bekannter_timer:pick('Vorher nachweislich laufende Zeit', 'kurzzeitwecker','abschaltzeit_zone','boosterzeit','ankochzeit','unbekannt'),
      rest_beim_beginn_s:number('Dokumentierte verbleibende Sekunden dieses Timers zum Beginn von Stop&Go',0,36000),
      stop_go_dauer_s:number('Tatsächlich beobachtete Sekunden im ausgewerteten Stop&Go-Intervall',0,36000),
      ununterbrochene_zuordnung:flag('Selber Lauf und Timer, ohne unaufgeklärte Unterbrechung oder früher erkanntes Ende')
    }, a => {
      const known=a.modell_bestaetigt&&a.stoppmodus_dokumentiert&&a.bekannter_timer!=='unbekannt'&&a.ununterbrochene_zuordnung;
      const valid=known&&a.stop_go_dauer_s<3600;
      return {timer_nominaler_rest_s:valid?rounded(Math.max(0,a.rest_beim_beginn_s-a.stop_go_dauer_s)):null,
        status:!known?'intervall_oder_timer_offen':!valid?'ausschaltereignis_nach_einer_stunde_pruefen':
          a.stop_go_dauer_s>=a.rest_beim_beginn_s?'timerfenster_rechnerisch_abgelaufen':'timerfenster_rechnerisch_noch_offen',
        ...metadata([48,57]), grenze:'Laufende Zeiten werden durch Stop&Go nicht angehalten. Der rechnerische Ablauf muss mit dem tatsächlich beobachteten Ereignis abgeglichen werden.'};
    },{modell_bestaetigt:true,stoppmodus_dokumentiert:true,bekannter_timer:'abschaltzeit_zone',rest_beim_beginn_s:150,stop_go_dauer_s:45,ununterbrochene_zuordnung:true},
    {timer_nominaler_rest_s:105,status:'timerfenster_rechnerisch_noch_offen'}),

  entry('induktion_topferkennung_auswahl_und_stufe_getrennt',
    'Lies ausgewählte Zone und eingestellte Leistungsstufe getrennt aus derselben Beobachtung — Distinguish automatic cookware selection from a recorded assigned setting',
    {
      modell_bestaetigt:model,
      permanente_erkennung_aktiv:yesNoOpen('Einstellung der permanenten Topferkennung zum Zeitpunkt bekannt'),
      beobachtung:pick('Dokumentierter Ablauf auf derselben Zone', 'nur_anzeige_blinkt_nach_aufstellen','wert_blinkt_nach_auswahl_einer_stufe','wert_bleibt_nach_auswahl_konstant','unbekannt'),
      stufenbedienung_bestaetigt:flag('Zur selben Kochzone ist eine tatsächlich ausgewählte Leistungsstufe protokolliert')
    }, a => {
      const value=a.beobachtung==='wert_bleibt_nach_auswahl_konstant'||a.beobachtung==='wert_blinkt_nach_auswahl_einer_stufe';
      const selection=a.beobachtung==='nur_anzeige_blinkt_nach_aufstellen'&&a.permanente_erkennung_aktiv==='ja';
      return {status:!a.modell_bestaetigt?'modellbeleg_offen':value&&a.stufenbedienung_bestaetigt?'leistungsstufe_im_vorgang_belegt':
        selection&&!a.stufenbedienung_bestaetigt?'automatische_zonenauswahl_belegt':'anzeigestatus_offen',
        ...metadata([47,55,56]), grenze:'Blinken nach dem Aufstellen steht im Zusammenhang mit der Zonenauswahl. Ein ausgewählter Wert ist keine gemessene Heizleistung.'};
    },{modell_bestaetigt:true,permanente_erkennung_aktiv:'ja',beobachtung:'nur_anzeige_blinkt_nach_aufstellen',stufenbedienung_bestaetigt:false},
    {status:'automatische_zonenauswahl_belegt'}),

  entry('induktion_ankochautomatik_fortkochstufe_zeitbeleg',
    'Vergleiche die beobachtete Dauer des Ankochstoßes mit der Handbuchzeile der bestätigten Fortkochstufe — Read Auto Heat-up duration against its exact continuation setting',
    {
      modell_bestaetigt:model,
      fortkochstufe:pick('Fortkochstufe. Punkt kennzeichnet die belegte Zwischenstufe',
        '1','1.','2','2.','3','3.','4','4.','5','5.','6','6.','7','7.','8','8.','9'),
      modus_und_zwischenstufe_belegt:flag('Ankochautomatik und genaue Stufe dokumentiert, Zwischenstufen bei einem Punkt aktiviert'),
      beobachtetes_ende_s:number('Beobachteter Statuswechsel nach Aktivierung auf derselben Zone, in Sekunden',1,3600),
      messfenster_s:number('Eigene kombinierte Zeitmessunsicherheit, keine Herstellertoleranz',0,120),
      kein_zeitgleicher_eingriff_bekannt:flag('Keine manuelle Stufenänderung und keine beobachtete Stufen- oder Leistungsaufteilungsänderung in diesem Lauf')
    }, a => {
      const tabulated={'1':15,'1.':15,'2':15,'2.':15,'3':25,'3.':25,'4':50,'4.':50,'5':120,'5.':350,
        '6':350,'6.':170,'7':170,'7.':170,'8':170,'8.':170};
      const reference=a.modell_bestaetigt&&a.modus_und_zwischenstufe_belegt ? tabulated[a.fortkochstufe]??null : null;
      const difference=reference===null?null:a.beobachtetes_ende_s-reference;
      return {handbuch_richtwert_s:reference, abstand_beobachtung_s:difference===null?null:rounded(difference),
        status:!a.modell_bestaetigt||!a.modus_und_zwischenstufe_belegt?'bezugsbeleg_offen':
          reference===null?'keine_ankochzeit_fuer_diese_stufe_angegeben':
            !a.kein_zeitgleicher_eingriff_bekannt?'anderer_einfluss_moeglich':
              Math.abs(difference)<=a.messfenster_s?'innerhalb_eigener_zeitablesung':'abweichender_beobachteter_verlauf',
        ...metadata([48,57,58]), grenze:'Die Tabellenzeiten sind ungefähre Ablaufzeiten der Funktion. Aus der Abweichung folgen weder Defektnachweis noch Temperatur oder Garzeit.'};
    },{modell_bestaetigt:true,fortkochstufe:'5.',modus_und_zwischenstufe_belegt:true,beobachtetes_ende_s:344,messfenster_s:8,kein_zeitgleicher_eingriff_bekannt:true},
    {handbuch_richtwert_s:350,abstand_beobachtung_s:-6,status:'innerhalb_eigener_zeitablesung'}),

  entry('induktion_abschaltzeiten_kurzeste_restzeit_anzeigequelle',
    'Ordne die kürzeste angezeigte Restzeit bei zwei laufenden Abschaltzeiten anhand der pulsierenden Zonentaste zu — Interpret the shared countdown when two shutdown timers run',
    {
      modell_bestaetigt:model,
      zone_a:singleZone('Erste eindeutig identifizierte Einzelzone'),
      zone_b:singleZone('Zweite eindeutig identifizierte Einzelzone'),
      zwei_abschaltzeiten_laufen:flag('Genau diese beiden Abschaltzeiten der Zonen wurden zum selben Zeitpunkt als laufend beobachtet'),
      pulsierende_taste:pick('Im selben Ausschnitt zugeordnete pulsierende Taste', 'zone_a','zone_b','keine_eindeutige'),
      kurzzeit_ausgewaehlt:yesNoOpen('In diesem Ausschnitt war die Kurzzeit oder eine andere Restzeit manuell zur Anzeige gewählt'),
      restzeit_banner_s:number('Beobachtete angezeigte Restzeit in Sekunden',0,36000)
    }, a => {
      if(a.zone_a===a.zone_b) throw new RangeError('Zwei verschiedene Einzelzonen angeben.');
      const known=a.modell_bestaetigt&&a.zwei_abschaltzeiten_laufen&&a.kurzzeit_ausgewaehlt==='nein'
        &&a.pulsierende_taste!=='keine_eindeutige';
      return {zone_der_angezeigten_restzeit:known?a[a.pulsierende_taste]:null,
        kuerzeste_beobachtete_abschaltzeit_s:known?a.restzeit_banner_s:null,
        ...metadata([59]), grenze:'Die nächste zugeordnete Abschaltzeit ist eine Anzeigeablesung. Die Restzeit einer anderen Zone und ihre tatsächliche Abschaltung bleiben separat.'};
    },{modell_bestaetigt:true,zone_a:'a',zone_b:'c',zwei_abschaltzeiten_laufen:true,pulsierende_taste:'zone_b',kurzzeit_ausgewaehlt:'nein',restzeit_banner_s:185},
    {zone_der_angezeigten_restzeit:'c',kuerzeste_beobachtete_abschaltzeit_s:185}),


  entry('induktion_vorfuehrgeraet_demomodus_heizbeleg',
    'Prüfe bei einem Vorführ- oder Gebrauchtgerät, ob eine Aufzeichnung nur den dokumentierten Demomodus oder auch eine beobachtete Heizfunktion belegt — Check second-hand or showroom heating evidence against demo mode',
    {
      modell_bestaetigt:model,
      start_timersignal:pick('Beim Start auf genau diesem Gerät aufgezeichneter Timertext', 'de_kurz_nach_start','ausdruecklich_anderer_text','nicht_erfasst'),
      heizbeobachtung:pick('Bereits protokollierte Heizbeobachtung, keine neue Prüfung auslösen', 'heizung_im_selben_lauf_beobachtet','keine_heizung_im_selben_lauf_beobachtet','nur_display_bedienbar','unbeobachtet'),
      gleicher_lauf_und_geraet:flag('Anzeige und beobachtete Funktion sind demselben Gerät und Start eindeutig zugeordnet')
    }, a => {
      const known=a.modell_bestaetigt&&a.gleicher_lauf_und_geraet;
      const demo=a.start_timersignal==='de_kurz_nach_start';
      const heated=a.heizbeobachtung==='heizung_im_selben_lauf_beobachtet';
      return {status:!known?'geraet_oder_aufzeichnung_offen':demo&&heated?'anzeige_und_heizbeleg_widerspruechlich':
        demo?'demomodus_kein_heizbeleg':heated?'heizung_fuer_diesen_lauf_beobachtet':'heizbeleg_offen',
        ...metadata([71]), grenze:'Kurzes dE beim Start mit fehlender Erwärmung kennzeichnet laut Handbuch den Demomodus. Aus einem anderen oder unlesbaren Code folgt keine Defektdiagnose.'};
    },{modell_bestaetigt:true,start_timersignal:'de_kurz_nach_start',heizbeobachtung:'nur_display_bedienbar',gleicher_lauf_und_geraet:true},
    {status:'demomodus_kein_heizbeleg'}),

  entry('induktion_gefaessbestandsluecke_nutzungsbelege_priorisieren',
    'Entscheide für eine konkrete Nutzung, ob ein bereits vorhandenes Gefäß den geplanten Kauf ersetzen kann oder zuerst ein Beleg fehlt — Prioritize a missing proof before replacing cookware',
    {
      vorhandenes_gefaess:flag('Mindestens ein bestimmtes vorhandenes Gefäß für den dokumentierten Arbeitsschritt bekannt'),
      beobachtete_nutzung:pick('Status aus derselben vorgesehenen Kochzone und Betriebsart', 'vorhandenes_bewaehrte_sich_fuer_die_aufgabe','erkannt_aber_aufgabe_nicht_beobachtet','nicht_erkannt','offen'),
      mass_und_ausrichtung:yesNoOpen('Bodengröße und Ausrichtung des vorhandenen Gefäßes für die vorgesehene Zone bestätigt'),
      benoetigte_kapazitaet:yesNoOpen('Das benutzte Volumen oder die Arbeitsfläche deckte den tatsächlichen Bedarf in diesem dokumentierten Fall'),
      weiterer_vorhandener_kandidat:flag('Ein anderes vorhandenes Gefäß mit Belegen für diesen Zweck ist noch zu prüfen')
    }, a => {
      if(!a.vorhandenes_gefaess) return {naechster_schritt:'zuerst_bestand_identifizieren',
        ...metadata([43,65]), grenze:'Nutzungsbelege sind auf diese Aufgabe und Kochzone beschränkt.'};
      const reusable=a.beobachtete_nutzung==='vorhandenes_bewaehrte_sich_fuer_die_aufgabe'&&a.mass_und_ausrichtung==='ja'&&a.benoetigte_kapazitaet==='ja';
      const failed=a.beobachtete_nutzung==='nicht_erkannt'||a.mass_und_ausrichtung==='nein'||a.benoetigte_kapazitaet==='nein';
      const inconsistent=a.beobachtete_nutzung==='vorhandenes_bewaehrte_sich_fuer_die_aufgabe'&&failed;
      return {naechster_schritt:reusable?'vorhandenes_fuer_diese_aufgabe_behalten':inconsistent?'widerspruechliche_nutzungsbelege_klaeren':
        failed?a.weiterer_vorhandener_kandidat?'anderen_vorhandenen_kandidaten_pruefen':'gezielte_anforderung_dokumentieren':
          a.mass_und_ausrichtung==='offen'?'bodenbeleg_nachtragen':'ergebnis_und_kapazitaet_der_aufgabe_pruefen',
        ...metadata([43,65]), grenze:'Nur die konkret beobachtete Aufgabe bewerten. Ein Erkennungshinweis allein ersetzt den Kapazitäts- und Nutzungsnachweis nicht.'};
    },{vorhandenes_gefaess:true,beobachtete_nutzung:'vorhandenes_bewaehrte_sich_fuer_die_aufgabe',mass_und_ausrichtung:'ja',benoetigte_kapazitaet:'ja',weiterer_vorhandener_kandidat:false},
    {naechster_schritt:'vorhandenes_fuer_diese_aufgabe_behalten'})
];
