const page='/guide/saugroboter-kaufberatung.html';
const verified='2026-11-20';
const d10='https://dreametech.zendesk.com/hc/de/article_attachments/51078573935513';
const l10='https://dreametech.zendesk.com/hc/de/article_attachments/51026741756057';
const saros='https://support.roborock.com/hc/de/article_attachments/46144394789529';
const irobotEmpty='https://support.irobot.de/articles/de/Knowledge/32656';
const irobotCombo='https://support.irobot.de/articles/de/Knowledge/54001';
const irobotCharge='https://support.irobot.de/articles/de/Knowledge/26166';
const irobot36='https://support.irobot.de/articles/de/Knowledge/31109';
const irobotJ9Software='https://support.irobot.de/articles/de/Knowledge/32666';
const sarosKit='https://de.roborock.com/products/roborock-saros-10r-zubehorset';
const sources={
  d10_filter:'https://de.dreametech.com/products/fliter-fur-dreamebot-l10s-ultra',
  l10_gen2_filter:'https://de.dreametech.com/products/filter-2-fur-dreame-l10sproultra-x30ultra-x40ultracomplete-x40master-l10sultragen2-l40ultra',
  combo_4785887:'https://www.irobot.de/de_DE/roomba-accessories/4785887.html',
  saros_10r_set:sarosKit
};
const modelNames={
  d10_plus_gen2:'Dreame D10 Plus Gen 2 · RLD32GD',
  l10s_ultra_gen2:'Dreame L10s Ultra Gen 2 · RLL32SE',
  saros_10r:'Roborock Saros 10R · S91COP',
  combo_j5_plus:'Roomba Combo j5+',
  combo_j7:'Roomba Combo j7',
  combo_j7_plus:'Roomba Combo j7+',
  combo_j9_plus:'Roomba Combo j9+',
  combo_10_max:'Roomba Combo 10 Max',
  roomba_j7_plus:'Roomba j7+ ohne Combo',
  roomba_i7_plus:'Roomba i7+'
};
const dreameNames=['d10_plus_gen2','l10s_ultra_gen2'];
const manuals={d10_plus_gen2:d10,l10s_ultra_gen2:l10,saros_10r:saros};
const flags=description=>({type:'boolean',description});
const pick=(description,...values)=>({type:'string',description,enum:values});
const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yesNo=description=>pick(description,'ja','nein','offen');
const models=(...keys)=>pick('Vollständiger Modellname am Gerät für die deutsche Ausführung',...keys,'anderes_oder_offen');
const exact=label=>flags(`${label} auf dem Typenschild oder in den Unterlagen zum beobachteten Gerät bestätigt`);
const unknown='beleg_offen';
function entry(name,description,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}
function proof(quelle,abschnitt,grenze){
  return {herstellerquelle:quelle,abschnitt,quellen_geprueft:verified,grenze};
}
function fixed(known,status){
  return known?status:unknown;
}

export const roboterpflege=[
  entry('roboter_ersatzfilter_exakte_de_zuordnung',
    'Ordne ein genau bezeichnetes Ersatzteil dem richtigen deutschen Robotermodell zu, bevor ein vorhandenes Teil getauscht wird — Check the exact German compatibility listing for a robot replacement part',
    {
      modell:models(...Object.keys(modelNames)),
      teil:pick('Exakte gefundene Herstellerseite zum vorliegenden Teil',...Object.keys(sources),'anderes_oder_offen'),
      teilidentitaet_belegt:flags('Artikelnummer oder vollständiger Herstellername des Paketangebots abgeglichen')
    }, a=>{
      const listed={
        d10_filter:['d10_plus_gen2'],
        l10_gen2_filter:['l10s_ultra_gen2'],
        combo_4785887:['combo_j7','combo_j7_plus','combo_j9_plus','combo_10_max'],
        saros_10r_set:['saros_10r']
      };
      const source=sources[a.teil]??null;
      const known=a.teilidentitaet_belegt&&source&&modelNames[a.modell];
      return {modell:modelNames[a.modell]??null,
        status:!known?unknown:listed[a.teil].includes(a.modell)?'modell_ausdruecklich_genannt':'keine_bestaetigte_zuordnung_aus_dieser_liste',
        ...proof(source,'Offizielle deutsche Zubehörbeschreibung',
          'Dieser Rechner deckt nur die auswählbaren Geräte ab. Einen fehlenden Treffer beim Hersteller klären. Ähnliche Namen, ein passender Beutel und eine Shop-Kategorie belegen andere Teile nicht.')};
    },{modell:'roomba_j7_plus',teil:'combo_4785887',teilidentitaet_belegt:true},
    {status:'keine_bestaetigte_zuordnung_aus_dieser_liste'}),

  entry('saros10r_zubehoerset_bedarf_nach_teilrollen',
    'Entscheide bei vorhandenen brauchbaren Ersatzteilen, welche unterschiedlichen Rollen des Original-Sets für den Saros 10R überhaupt benötigt werden — Match a confirmed Saros 10R kit against separate missing part roles',
    {
      modell_bestaetigt:exact('Saros 10R und offiziell gelistetes Zubehörset für den 10R'),
      filter_fehlt:flags('Ein zusätzlicher Roboterfilter wird begründet benötigt'),
      seitenbuerste_fehlt:flags('Eine Seitenbürste wird begründet benötigt'),
      abdeckung_fehlt:flags('Die passende Hauptbürstenabdeckung wird begründet benötigt'),
      sonstiger_kaufbedarf:flags('Ein weiteres Teil aus dem Set wird nachweislich benötigt')
    }, a=>{
      const roles=['filter','seitenbuerste','abdeckung'].filter(role=>a[role+'_fehlt']);
      return {belegte_bedarfsrollen:a.modell_bestaetigt?roles:null,
        status:!a.modell_bestaetigt?unknown:a.sonstiger_kaufbedarf?'weitere_teile_einzeln_zuordnen':
          roles.length===0?'vorhandene_teile_weiterverwenden':roles.length===1?'einzelteil_zuerst_abgleichen':'set_und_einzelteile_getrennt_vergleichen',
        ...proof(sarosKit,'Lieferumfang des Saros-10R-Zubehörsets',
          'Filter, Seitenbürsten und Hauptbürstenabdeckung sind getrennte Rollen im Set. Sichtbarer Bedarf begründet keine Mengen-, Preis- oder Verfügbarkeitsaussage.')};
    },{modell_bestaetigt:true,filter_fehlt:true,seitenbuerste_fehlt:false,abdeckung_fehlt:false,sonstiger_kaufbedarf:false},
    {belegte_bedarfsrollen:['filter'],status:'einzelteil_zuerst_abgleichen'}),

  entry('dreame_station_orange_weiss_signalzustand',
    'Ordne ein Stationslicht der tatsächlich beobachteten Dreame-Station und Signalart zu — Interpret a status light using the exact listed Dreame dock manual',
    {
      modell:models(...dreameNames),
      signal:pick('Signal an der Station, nicht am Roboter','weiss_dauerhaft','weiss_pulsierend','orange_blinkt','orange_dauerhaft','dunkel','nicht_erfasst'),
      standort_belegt:flags('Licht stammt eindeutig von der zum Modell dokumentierten Station')
    }, a=>{
      const key=a.modell;
      const map={d10_plus_gen2:{weiss_dauerhaft:'versorgung_angezeigt',weiss_pulsierend:'laden_angezeigt',orange_blinkt:'stationsfehler_angezeigt'},
        l10s_ultra_gen2:{weiss_dauerhaft:'versorgung_angezeigt',orange_dauerhaft:'stationsfehler_angezeigt'}};
      const signal=a.standort_belegt?map[key]?.[a.signal]:null;
      return {status:signal??unknown,ladestand_dadurch_belegt:false,
        ...proof(manuals[key]??null,'Deutsche Produktübersicht S. 37 des zugeordneten Modells',
          'Die Farbe und das Blinkmuster gehören zusammen. Eine Stationsanzeige allein verrät weder Akkustand noch Defekt oder Ersatzbedarf.')};
    },{modell:'d10_plus_gen2',signal:'weiss_pulsierend',standort_belegt:true},
    {status:'laden_angezeigt',ladestand_dadurch_belegt:false}),

  entry('roboter_aufladung_fenster_mit_start_und_ende',
    'Vergleiche eine tatsächlich vollständige Aufladung ab niedrigem Akku mit dem Richtwert des exakten Dreame-Modells — Check completed charging evidence against the documented low-to-full reference',
    {
      modell:models(...dreameNames),
      start_niedrig:yesNo('Beginn bei ausdrücklich niedrigem Akku und Startzeit dokumentiert'),
      ende_voll:yesNo('Vollständige Ladung laut Anzeige und Endzeit dokumentiert'),
      beobachtete_minuten:num('Dauer dieses zusammenhängenden Versuchs in Minuten',1,1440),
      unterbrechung:yesNo('Ein zwischenzeitlicher Abbruch oder Verlassen der Station wurde beobachtet'),
      gleiche_bedingungen:flags('Temperaturbereich laut passender Anleitung und keine abweichende Ladebedingung bekannt')
    }, a=>{
      const expected={d10_plus_gen2:360,l10s_ultra_gen2:210}[a.modell]??null;
      const comparable=expected!==null&&a.start_niedrig==='ja'&&a.ende_voll==='ja'&&a.unterbrechung==='nein'&&a.gleiche_bedingungen;
      return {hersteller_richtwert_min:expected,
        abstand_zum_richtwert_min:comparable?Math.round((a.beobachtete_minuten-expected)*100)/100:null,
        status:comparable?'abgelesene_vollladung_vergleichbar':'ladefenster_unvollstaendig_oder_andere_bedingungen',
        ...proof(manuals[a.modell]??null,a.modell==='d10_plus_gen2'?'S. 53 Fehlersuche':'S. 54 Fehlersuche',
          'Ungefähre Herstellerzeit von niedrig bis voll. Eine Abweichung oder ein Teilfenster bestimmt weder Restkapazität noch einen Akkuwechsel.')};
    },{modell:'l10s_ultra_gen2',start_niedrig:'ja',ende_voll:'nein',beobachtete_minuten:260,unterbrechung:'nein',gleiche_bedingungen:true},
    {hersteller_richtwert_min:210,abstand_zum_richtwert_min:null,status:'ladefenster_unvollstaendig_oder_andere_bedingungen'}),

  entry('roomba_aufladefehler21_aufnahme_und_ladeverlust',
    'Trenne dokumentierten Ladeverlust auf der Station von einer probeweise fehlenden Kontaktbestätigung — Compare a recorded on-dock charge loss with iRobot code 21',
    {
      roomba_modell_belegt:flags('Roomba-Modell und zugehörige Home Base oder Clean Base identifiziert'),
      fehler_21:yesNo('Wörtlicher Ladefehler 21 von diesem Vorgang gesichert'),
      durchgehend_auf_dock:yesNo('Der Roboter blieb zwischen beiden abgelesenen Akkuständen an derselben Station'),
      start_prozent:num('Gemeldeter Akkustand zu Beginn. Nur mit zwei bestätigten Ablesungen auswerten',0,100),
      ende_prozent:num('Gemeldeter Akkustand am Ende',0,100),
      beide_ablesungen_belegt:flags('Beide Zahlen wurden in dieser Reihenfolge und am selben Gerät abgelesen')
    }, a=>{
      const trace=a.roomba_modell_belegt&&a.durchgehend_auf_dock==='ja'&&a.beide_ablesungen_belegt;
      const diff=trace?a.ende_prozent-a.start_prozent:null;
      return {aenderung_prozentpunkte:diff,
        status:!a.roomba_modell_belegt?unknown:a.fehler_21==='ja'&&diff!==null&&diff<0?'code_21_und_ladeverlust_erfasst':
          a.fehler_21==='ja'?'code_21_belegt_verlauf_offen':diff!==null&&diff<0?'ladeverlust_erfasst_code_nicht_bestaetigt':'kein_zugeordneter_ladeverlust_belegt',
        ...proof(irobotCharge,'DE-Supportartikel zu Aufladefehler 21',
          'Beim zugeordneten Code die belegte Kontaktpflege für das genaue Modell prüfen. Ein Verlauf in Prozentpunkten allein belegt weder Kontakt- noch Akkudefekt.')};
    },{roomba_modell_belegt:true,fehler_21:'ja',durchgehend_auf_dock:'ja',start_prozent:41,ende_prozent:34,beide_ablesungen_belegt:true},
    {aenderung_prozentpunkte:-7,status:'code_21_und_ladeverlust_erfasst'}),

  entry('roboter_stationskontakt_und_sensor_pflegemethode',
    'Verhindere die Übertragung einer feuchten Kontaktpflege auf optische Flächen oder ein anderes Gerät — Separate documented care media for contacts and sensor windows',
    {
      modell:models(...dreameNames,'saros_10r','roomba_j7_plus','roomba_i7_plus'),
      stelle:pick('Äußerlich zugängliche Stelle im exakten Pflegebild','ladekontakt','signal_oder_sensorfenster','unbekannt'),
      flaeche_und_modell_belegt:flags('Die Stelle wurde bei ausgeschaltetem Gerät und stromloser Station ohne Öffnen identifiziert')
    }, a=>{
      const roomba=['roomba_i7_plus','roomba_j7_plus'].includes(a.modell);
      const source=roomba?irobotEmpty:manuals[a.modell]??null;
      return {belegte_methode:a.flaeche_und_modell_belegt&&source&&a.stelle!=='unbekannt'
          ?roomba&&a.stelle==='ladekontakt'?'zugelassenes_leicht_angefeuchtetes_material':'sauberes_weiches_trockenes_tuch'
          :null,
        ...proof(source,'Wartung von Signalfenstern oder Ladekontakten',
          'Feuchtigkeitsempfehlungen gelten nur für die bezeichnete Fläche am bestätigten Modell. Keine Flüssigkeit in Öffnungen geben. Bei Beschädigung oder unklarer Stelle Kundendienst fragen.')};
    },{modell:'roomba_j7_plus',stelle:'signal_oder_sensorfenster',flaeche_und_modell_belegt:true},
    {belegte_methode:'sauberes_weiches_trockenes_tuch'}),

  entry('dreame_d10_absaugung_nicht_stoeren_verlauf',
    'Vergleiche einen ausgelassenen D10-Absaugvorgang mit der wirklich aktiven Nicht-stören-Einstellung — Check whether recorded D10 auto-empty suppression matches the applicable DND state',
    {
      modell_bestaetigt:exact('Dreame D10 Plus Gen 2 mit zugehöriger Absaugstation'),
      rueckkehr_bestaetigt:flags('Rückkehr zur Basis nach der Reinigung wurde beobachtet'),
      absaugung:yesNo('Automatische Entleerung bei dieser Rückkehr vollständig beobachtet'),
      nicht_stoeren:yesNo('Nicht stören war zum Zeitpunkt der Rückkehr in der App aktiv'),
      absaugung_konfiguriert:yesNo('Automatische Entleerung wäre für diese Rückkehr ohne Nicht-stören-Einstellung fällig gewesen')
    }, a=>{
      const known=a.modell_bestaetigt&&a.rueckkehr_bestaetigt&&a.absaugung==='nein';
      const status=!known?unknown:a.nicht_stoeren==='ja'&&a.absaugung_konfiguriert==='ja'?'auslassung_passt_zu_nicht_stoeren':
        a.absaugung_konfiguriert==='nein'?'absaugung_im_vorgang_nicht_faellig':
          a.nicht_stoeren==='nein'&&a.absaugung_konfiguriert==='ja'?'auslassung_ausserhalb_dnd_pruefen':unknown;
      return {status,...proof(d10,'S. 54 Fehlersuche',
        'Maßgeblich ist die dokumentierte Einstellung beim Andocken. Eine ausgebliebene Absaugung beweist keinen vollen Beutel oder Gerätedefekt.')};
    },{modell_bestaetigt:true,rueckkehr_bestaetigt:true,absaugung:'nein',nicht_stoeren:'ja',absaugung_konfiguriert:'ja'},
    {status:'auslassung_passt_zu_nicht_stoeren'}),

  entry('roboter_zwischenladen_rueckkehrart_fortsetzung',
    'Unterscheide eine selbst eingeleitete Ladepause von einer manuell ausgelösten Rückkehr, bevor ein fehlender Restlauf als Fehler gewertet wird — Explain why a documented cleaning run did not resume after docking',
    {
      modell:models(...dreameNames,'saros_10r'),
      rueckkehrart:pick('Vor dem Laden dokumentierte Rückkehrart',
        'automatisch_bei_niedrigem_akku','manuell_aufgesetzt','per_taste_oder_app_zurueck','unbekannt'),
      vorgang_pausiert:yesNo('Derselbe Auftrag war noch nicht fertig; bei manuellem Aufsetzen war er pausiert'),
      dnd_beim_ladeende:yesNo('Für die Dreame-Modelle war Nicht stören beim Ladeende tatsächlich aktiv'),
      fortsetzung:yesNo('Der Rest desselben Auftrags wurde nach der Ladung beobachtet')
    }, a=>{
      const dreame=dreameNames.includes(a.modell);
      const sarosMatch=a.modell==='saros_10r';
      let status=unknown;
      if (a.fortsetzung==='nein'&&a.vorgang_pausiert==='ja'){
        if ((dreame&&['manuell_aufgesetzt','per_taste_oder_app_zurueck'].includes(a.rueckkehrart))||
            (sarosMatch&&a.rueckkehrart==='manuell_aufgesetzt')) status='keine_fortsetzung_nach_manueller_rueckkehr_erwartet';
        else if (dreame&&a.dnd_beim_ladeende==='ja') status='nicht_stoeren_als_dokumentierter_kandidat';
        else if (a.rueckkehrart==='automatisch_bei_niedrigem_akku'&&(sarosMatch||(dreame&&a.dnd_beim_ladeende==='nein')))
          status='offene_fortsetzung_fuer_service_dokumentieren';
      }
      return {status,...proof(manuals[a.modell]??null,sarosMatch?'C, Pausieren und Reinigung starten':'Fehlersuche: Fortsetzung nach dem Laden',
        'Ursprünglichen Restauftrag, Ladeende und Rückkehrart desselben Laufs belegen. Kein Austauschschluss aus einer Unterbrechung.')};
    },{modell:'d10_plus_gen2',rueckkehrart:'per_taste_oder_app_zurueck',vorgang_pausiert:'ja',dnd_beim_ladeende:'nein',fortsetzung:'nein'},
    {status:'keine_fortsetzung_nach_manueller_rueckkehr_erwartet'}),

  entry('dreame_l10s_wasserstand_waschplatte_sichtbelege',
    'Priorisiere äußere Sichtbelege für einen ungewöhnlichen Wasserstand in der Waschplatte des L10s Ultra Gen 2 — Isolate documented abnormal washboard drainage observations',
    {
      modell_bestaetigt:exact('Dreame L10s Ultra Gen 2 mit werkseitiger Tankstation'),
      wasserstand_auffaellig:yesNo('Abweichungen an der Waschplatte wurden laut Modellhinweis beobachtet'),
      tank_sitzt:yesNo('Schmutzwassertank und zugängliche Dichtung sitzen laut Betriebsanleitung korrekt'),
      ablauf_sichtbar_frei:yesNo('An der entnehmbaren Waschplatte ist die laut Handbuch sichtbare Abflussstelle frei'),
      loesung_freigegeben:yesNo('Nur Wasser oder die für das Modell vom Hersteller zugelassene Lösung dokumentiert')
    }, a=>{
      const observations={tank_und_dichtung:a.tank_sitzt,ablauf:a.ablauf_sichtbar_frei,reinigungsfluessigkeit:a.loesung_freigegeben};
      const known=a.modell_bestaetigt&&a.wasserstand_auffaellig==='ja';
      return {nicht_erfuellte_pruefpunkte:known?Object.keys(observations).filter(key=>observations[key]==='nein'):null,
        offene_pruefpunkte:known?Object.keys(observations).filter(key=>observations[key]==='offen'):null,
        ...proof(l10,'S. 55 Fehlersuche',
          'Nur außen sichtbare Punkte an der ausgeschalteten Station beurteilen. Bei anhaltendem Problem Hersteller kontaktieren, ohne Pumpe oder Leitungen zu öffnen.')};
    },{modell_bestaetigt:true,wasserstand_auffaellig:'ja',tank_sitzt:'ja',ablauf_sichtbar_frei:'nein',loesung_freigegeben:'offen'},
    {nicht_erfuellte_pruefpunkte:['ablauf'],offene_pruefpunkte:['reinigungsfluessigkeit']}),

  entry('dreame_l10s_resttropfen_tank_gegen_wiederkehrende_naesse',
    'Unterscheide Resttropfen am Tanksitz nach Entnahme von wiederkehrendem Wasser außerhalb der Station — Distinguish a documented tank-seat residual from recurring external wetness',
    {
      modell_bestaetigt:exact('Dreame L10s Ultra Gen 2 mit Frischwassertank'),
      ort:pick('Wasser an welcher beobachteten Stelle','direkt_im_tanksitz_oder_dichtung','unter_oder_neben_station','unbekannt'),
      direkt_nach_entnahme:yesNo('Wenige Tropfen unmittelbar beim Entnehmen dokumentiert'),
      wiederkehr_ohne_entnahme:yesNo('Auch in späterer Beobachtung ohne Tankentnahme erneut Wasser dokumentiert')
    }, a=>{
      let status=unknown;
      if(a.modell_bestaetigt){
        if(a.ort==='unter_oder_neben_station'||a.wiederkehr_ohne_entnahme==='ja') status='nicht_als_tankrest_einordnen_service';
        else if(a.ort==='direkt_im_tanksitz_oder_dichtung'&&a.direkt_nach_entnahme==='ja'&&a.wiederkehr_ohne_entnahme==='nein')
          status='passt_zum_dokumentierten_tankrest';
      }
      return {status,...proof(l10,'S. 55 Fehlersuche',
        'Die Restwasser-Erläuterung betrifft nur den Bereich unmittelbar am entnommenen Frischwassertank. Bei externer Nässe Betrieb unterlassen und Unterstützung einholen.')};
    },{modell_bestaetigt:true,ort:'unter_oder_neben_station',direkt_nach_entnahme:'nein',wiederkehr_ohne_entnahme:'ja'},
    {status:'nicht_als_tankrest_einordnen_service'}),

  entry('dreame_l10s_andocken_rampenbeobachtung_ort',
    'Ordne festgehaltenes Steckenbleiben beim L10s Ultra Gen 2 der offenen Route oder dem unmittelbaren Rampenbereich zu — Localize an observed docking failure without repeating an unsafe attempt',
    {
      modell_bestaetigt:exact('Dreame L10s Ultra Gen 2 mit Tankstation'),
      letzter_ort:pick('Wo endete der beobachtete Rücklauf','vor_geschlossener_tuer_oder_hindernis','unmittelbar_vor_rampe','nach_auffahren','unbeobachtet'),
      boden_vor_rampe_nass:yesNo('Am selben Ort und im selben Vorgang war sichtbare übermäßige Nässe auf dem Boden'),
      verlaengerungsplatte_sitz:yesNo('Äußerlich erkennbarer Sitz der dokumentierten Rampenverlängerungsplatte')
    }, a=>{
      let status=unknown;
      if(a.modell_bestaetigt){
        if(a.letzter_ort==='vor_geschlossener_tuer_oder_hindernis') status='rueckweg_blockiert_dokumentiert';
        else if(a.letzter_ort==='unmittelbar_vor_rampe'){
          if(a.boden_vor_rampe_nass==='ja') status='naesse_an_der_anfahrt_dokumentiert';
          else if(a.verlaengerungsplatte_sitz==='nein') status='abgleich_der_rampenplatte_offen';
        }
      }
      return {status,...proof(l10,'S. 54 Fehlersuche',
        'Ort und sichtbare Bedingungen eines vorhandenen Protokolls. Keine Probefahrt auf nassem Boden oder Einbauanleitung.')};
    },{modell_bestaetigt:true,letzter_ort:'unmittelbar_vor_rampe',boden_vor_rampe_nass:'ja',verlaengerungsplatte_sitz:'offen'},
    {status:'naesse_an_der_anfahrt_dokumentiert'}),

  entry('saros10r_waschdock_laufstart_und_stationswechsel',
    'Prüfe, ob Startpunkt und Stationsverlauf eine automatische Dockwäsche überhaupt belegen können — Audit documented conditions for a Saros 10R automatic wash return',
    {
      modell_bestaetigt:exact('Saros 10R mit Tankstation'),
      wischbetrieb:yesNo('Ein Wischlauf statt einer reinen Saugrunde aktiv und zugeordnet'),
      von_station_gestartet:yesNo('Dieser Auftrag begann an der Station'),
      station_waehrend_lauf_bewegt:yesNo('Diese Station wurde vor der erwarteten Wäsche während desselben Auftrags bewegt'),
      waschrueckkehr_beobachtet:yesNo('Rückkehr zur automatischen Wäsche tatsächlich beobachtet')
    }, a=>{
      const same=a.modell_bestaetigt&&a.wischbetrieb==='ja';
      const setup=a.von_station_gestartet==='ja'&&a.station_waehrend_lauf_bewegt==='nein';
      const missing=a.von_station_gestartet==='nein'||a.station_waehrend_lauf_bewegt==='ja';
      return {status:!same?unknown:a.waschrueckkehr_beobachtet==='ja'?'waschrueckkehr_beobachtet':
        missing?'dokumentierte_startbedingung_verletzt':setup?'startbedingung_belegt_automatik_weiter_offen':unknown,
        ...proof(saros,'C · Moppwäsche S. 33',
          'Frequenz und Modus der Wäsche hängen von der Einstellung ab. Diese Prüfung allein diagnostiziert keine Dock- oder Wischstörung.')};
    },{modell_bestaetigt:true,wischbetrieb:'ja',von_station_gestartet:'ja',station_waehrend_lauf_bewegt:'ja',waschrueckkehr_beobachtet:'nein'},
    {status:'dokumentierte_startbedingung_verletzt'}),

  entry('saros10r_trocknung_luftauslass_und_modus',
    'Trenne einen tatsächlich angezeigten Dock-Trocknungslauf von einer bloß erwarteten Automatik und einem verdeckten Luftauslass — Check recorded Saros drying mode and outlet condition separately',
    {
      modell_bestaetigt:exact('Saros 10R mit Tankstation'),
      automatik_freigegeben:yesNo('Automatisch Trocknen war für die betrachtete Zeit aktiviert'),
      trocknung_erfasst:yesNo('Dock-Trocknung für denselben Zeitraum in Status oder App beobachtet'),
      auslass_offen:yesNo('Trocknungs-Luftauslass war von außen gesehen frei')
    }, a=>{
      return {status:!a.modell_bestaetigt?unknown:a.trocknung_erfasst==='ja'&&a.auslass_offen==='nein'?'luftauslass_zum_lauf_verdeckt':
        a.trocknung_erfasst==='nein'&&a.automatik_freigegeben==='nein'?'automatik_fuer_diesen_zeitraum_aus':
          a.trocknung_erfasst==='ja'&&a.auslass_offen==='ja'?'lauf_und_freier_auslass_beobachtet':unknown,
        ...proof(saros,'C · Trocknen S. 34',
          'Belegter Modus und freie Auslässe zeigen keinen vollständig trockenen Mopp. Keine Teile an der arbeitenden Dockingstation anfassen.')};
    },{modell_bestaetigt:true,automatik_freigegeben:'ja',trocknung_erfasst:'ja',auslass_offen:'nein'},
    {status:'luftauslass_zum_lauf_verdeckt'}),

  entry('saros10r_reinigungsfluessigkeit_kartusche_rolle',
    'Prüfe, ob ein vorliegender Stationsbefund die optionale Lösungskartusche statt des Reinwassertanks betrifft — Distinguish a supported Saros solution cartridge from the water tank',
    {
      modell_bestaetigt:exact('Saros 10R mit Tankstation'),
      beobachteter_ort:pick('Ort der Lösung oder fehlenden Nachfüllung','kartusche','reinwassertank','ort_unbekannt'),
      fluessigkeit:pick('Dokumentierte Flüssigkeit','roborock_freigegebene_loesung','desinfektionsmittel','nur_wasser','unbekannt'),
      nachfuellen_erwartet:yesNo('Intelligentes Nachfüllen war bewusst eingestellt und gewünscht')
    }, a=>{
      const mode=a.modell_bestaetigt;
      const status=!mode?unknown:a.fluessigkeit==='desinfektionsmittel'?'hersteller_schliesst_desinfektionsmittel_aus':
        a.fluessigkeit==='roborock_freigegebene_loesung'&&a.beobachteter_ort==='reinwassertank'?'loesung_dem_falschen_behaelter_zugeordnet':
          a.fluessigkeit==='nur_wasser'&&a.nachfuellen_erwartet==='nein'?'kartuschenschritt_optional':
            a.fluessigkeit==='roborock_freigegebene_loesung'&&a.beobachteter_ort==='kartusche'?'kartuschenrolle_bestaetigt':unknown;
      return {status,...proof(saros,'C1 bis C2 S. 32',
        'Herstellerangaben gelten für die benannte Tankstation. Bei unbekannter Flüssigkeit zuerst Herstelleranleitung oder Service prüfen. Keine Dosier- oder Reparaturempfehlung.')};
    },{modell_bestaetigt:true,beobachteter_ort:'reinwassertank',fluessigkeit:'roborock_freigegebene_loesung',nachfuellen_erwartet:'ja'},
    {status:'loesung_dem_falschen_behaelter_zugeordnet'}),

  entry('roomba_combo_j5_behaelterrolle_selbstentleerung',
    'Prüfe bei fehlender Selbstentleerung, ob im genau genannten Roomba der dafür vorgesehene Behälter eingesetzt war — Account for the documented bin-dependent self-empty function',
    {
      modell:models('combo_j5_plus'),
      behaelter:pick('Am Roboter für diesen Lauf sicher zugeordneter Behälter','combo_behaelter','original_absaugbehaelter','unbekannt'),
      clean_base_bestaetigt:flags('Zugehörige Clean Base für dieses Gerät und denselben Lauf dokumentiert'),
      keine_selbstentleerung_beobachtet:flags('Ausbleiben der Selbstentleerung wurde direkt beobachtet')
    }, a=>{
      const known=a.modell==='combo_j5_plus'&&a.clean_base_bestaetigt&&a.keine_selbstentleerung_beobachtet;
      return {status:!known?unknown:a.behaelter==='combo_behaelter'?'selbstentleerung_fuer_diesen_combo_behaelter_nicht_vorgesehen':
        a.behaelter==='original_absaugbehaelter'?'behaelterrolle_passt_ursache_offen':unknown,
        ...proof(irobotCombo,'Combo i-Serie und Combo j5/j5+ · Einrichtung',
          'Die Belegprüfung hier gilt für den genannten j5+. Andere Combo-Varianten und Dock-Generationen separat prüfen.')};
    },{modell:'combo_j5_plus',behaelter:'combo_behaelter',clean_base_bestaetigt:true,keine_selbstentleerung_beobachtet:true},
    {status:'selbstentleerung_fuer_diesen_combo_behaelter_nicht_vorgesehen'}),

  entry('roomba_absaugdock_app_taste_und_manueller_erfolg',
    'Trenne lokale Entleerungsfunktion von einem fehlenden App-Bedienelement beim zugeordneten Roomba — Distinguish the documented communication path when local evacuation works',
    {
      modell:models('roomba_i7_plus','roomba_j7_plus'),
      autoempty_dock_bestaetigt:flags('Zugeordnete AutoEmpty- oder Clean-Base-Station und passender Absaugbehälter bestätigt'),
      lokale_entleerung_beobachtet:yesNo('Lokaler Vorgang wurde an dieser Station tatsächlich vollständig beobachtet'),
      app_taste:yesNo('Schaltfläche zum Leeren in der App bei angedocktem Gerät sichtbar')
    }, a=>{
      const known=a.autoempty_dock_bestaetigt&&a.lokale_entleerung_beobachtet==='ja'&&a.app_taste==='nein';
      return {status:!known?unknown:a.modell==='roomba_j7_plus'?'j_serie_keine_ir_ursache_ableiten_kontaktbeleg_pruefen':
        a.modell==='roomba_i7_plus'?'kommunikationspfad_laut_support_pruefen':unknown,
        ...proof(irobotEmpty,'Punkt 5 · fehlende App-Schaltfläche und Ausnahme der j-Serie',
          'Lokaler Erfolg schließt Kommunikationsprobleme nicht aus. App, Kontakt und Sensorpflege nur für das exakte System prüfen. Keine Demontage.')};
    },{modell:'roomba_j7_plus',autoempty_dock_bestaetigt:true,lokale_entleerung_beobachtet:'ja',app_taste:'nein'},
    {status:'j_serie_keine_ir_ursache_ableiten_kontaktbeleg_pruefen'}),

  entry('roomba_absaugdock_rotes_blinken_und_neuversuche',
    'Ordne rotes Blinken oder wiederholte Evakuierungszyklen dem belegten AutoEmpty-Symptom zu — Interpret recorded AutoEmpty blockage signals without disassembly',
    {
      modell:models('roomba_i7_plus','roomba_j7_plus'),
      station_bestaetigt:flags('Kompatible automatische Absaugstation im Supportartikel eindeutig zugeordnet'),
      anzeige:pick('Anzeige vorn an der Station','rot_blinkt','rot_oder_weiss_dauerhaft','andere_oder_offen'),
      anzahl_zyklen:num('Tatsächlich gehörte Evakuierungszyklen desselben Dockbesuchs; 0 nur wenn Beobachtung offen',0,10)
    }, a=>{
      if(!Number.isInteger(a.anzahl_zyklen)) throw new RangeError('Ganze Anzahl der beobachteten Zyklen angeben.');
      const known=a.station_bestaetigt&&['roomba_i7_plus','roomba_j7_plus'].includes(a.modell);
      return {status:!known?unknown:a.anzeige==='rot_blinkt'?'verstopfungssignal_laut_support':
        a.anzahl_zyklen===3?'wiederholte_absaugung_supportbeleg_sichern':
          a.anzeige==='rot_oder_weiss_dauerhaft'?'beutel_und_zugelassenen_behaelter_zuordnen':unknown,
        ...proof(irobotEmpty,'Punkte 1 und 6c · AutoEmpty Dock',
          'Sicht- und Hörprotokoll gibt Hinweise für den Hersteller. Verriegelung nicht überbrücken und Dock nicht öffnen.')};
    },{modell:'roomba_i7_plus',station_bestaetigt:true,anzeige:'rot_blinkt',anzahl_zyklen:3},
    {status:'verstopfungssignal_laut_support'}),

  entry('roomba_combo10max_absaugstart_kurze_wartebeobachtung',
    'Bewerte, ob eine kurze Beobachtung nach dem Andocken des Combo 10 Max die dokumentierte Verzögerung überhaupt abdeckt — Check observation coverage for the Combo 10 Max auto-empty delay',
    {
      modell:models('combo_10_max'),
      automatik_faellig:yesNo('Absaugung war für den konkreten Lauf laut Einrichtung fällig'),
      andocken_zeitpunkt_belegt:flags('Ende des Andockens eindeutig dokumentiert'),
      beobachtungsdauer_s:num('Lückenlose beobachtete Sekunden ab bestätigtem Andocken',0,600),
      beginn_absaugung_belegt:yesNo('Beginn der Entleerung innerhalb dieser Beobachtung bestätigt')
    }, a=>{
      const known=a.modell==='combo_10_max'&&a.automatik_faellig==='ja'&&a.andocken_zeitpunkt_belegt;
      return {status:!known?unknown:a.beginn_absaugung_belegt==='ja'?'beginn_beobachtet':
        a.beobachtungsdauer_s<=10?'beobachtung_fuer_typischen_start_zu_kurz':
          a.beginn_absaugung_belegt==='nein'?'innerhalb_des_fensters_kein_beginn_beobachtet':unknown,
        ...proof(irobotEmpty,'Punkt 4 · Hinweis zum Roomba Combo 10 Max',
          'Ungefähr zehn Sekunden gelten laut Support für dieses Modell. Die normale Verzögerung ist keine garantierte Startzeit, und ohne Fälligkeit bleibt der Befund offen.')};
    },{modell:'combo_10_max',automatik_faellig:'ja',andocken_zeitpunkt_belegt:true,beobachtungsdauer_s:8,beginn_absaugung_belegt:'nein'},
    {status:'beobachtung_fuer_typischen_start_zu_kurz'}),

  entry('roboter_filter_waschhinweis_nach_exakter_rolle',
    'Prüfe, ob für den konkret ausgebauten Staubfilter tatsächlich eine Waschfreigabe gilt — Compare explicit washing instructions for a documented robot dust filter',
    {
      modell:models('combo_j5_plus','saros_10r'),
      teilrolle:pick('Teil anhand der Anleitung tatsächlich identifiziert','roboter_staubfilter','dock_waschmodulfilter','unbekannt'),
      originales_teil_zugeordnet:flags('Vorliegender Typ und Variante passen zum genannten Originalteil der Anleitung'),
      wasser_kontakt:yesNo('Bei diesem Teil wurde bereits Wasserkontakt beobachtet')
    }, a=>{
      const known=a.teilrolle==='roboter_staubfilter'&&a.originales_teil_zugeordnet;
      const method=!known?null:a.modell==='combo_j5_plus'?'nicht_waschen':a.modell==='saros_10r'?'waschbar_mit_modellbedingungen':null;
      return {belegte_waschfreigabe:method,
        status:method==='nicht_waschen'&&a.wasser_kontakt==='ja'?'wasserwiderspruch_vor_wiedereinsetzen_klaeren':method?'pflegemethode_belegt':unknown,
        ...proof(a.modell==='combo_j5_plus'?irobotCombo:a.modell==='saros_10r'?saros:null,
          a.modell==='combo_j5_plus'?'Wartungstabelle des Combo-Behälters':'D5/D6 · Staubbehälter und waschbarer Filter',
          'Eine Waschfreigabe des Geräts gilt nur für diesen Filtertyp. Stationselemente und fremde Filter separat abgleichen.')};
    },{modell:'combo_j5_plus',teilrolle:'roboter_staubfilter',originales_teil_zugeordnet:true,wasser_kontakt:'ja'},
    {belegte_waschfreigabe:'nicht_waschen',status:'wasserwiderspruch_vor_wiedereinsetzen_klaeren'}),

  entry('roomba_j_volle_behaeltermeldung_nach_evakuierung',
    'Trenne bei Fehler 36 eine bestätigte Entleerung mit verbleibender Meldung von einer fehlgeschlagenen Entleerung — Correlate Roomba error 36 with the observed result of the same evacuation',
    {
      modell:models('roomba_j7_plus','combo_j7_plus','combo_10_max'),
      fehler_36:flags('Fehler 36 ausdrücklich für denselben Dockbesuch aufgezeichnet'),
      absaugung_und_fuellzustand:pick('Dokumentation dieses Vorgangs',
        'transport_und_leerer_behaelter_belegt','kein_transport_behaelter_noch_voll','nur_geraeusch_oder_offen'),
      meldung_nach_aussenpflege:yesNo('Die Meldung kam nach freigegebener äußerer Pflege bei bestätigter Entleerung erneut')
    }, a=>{
      const known=['roomba_j7_plus','combo_j7_plus','combo_10_max'].includes(a.modell)&&a.fehler_36;
      const empty=a.absaugung_und_fuellzustand==='transport_und_leerer_behaelter_belegt';
      const failed=a.absaugung_und_fuellzustand==='kein_transport_behaelter_noch_voll';
      return {status:!known?unknown:empty&&a.meldung_nach_aussenpflege==='ja'?'wiederkehr_mit_leerem_behaelter_fuer_service':
        empty?'sensorhinweis_trotz_belegter_entleerung':failed?'tatsaechlicher_entleerungsfehler_belegt':unknown,
        ...proof(irobot36,'Fehler 36 · Roomba j-Serie und Combo 10 Max',
          'Eine Geräuschaufnahme allein belegt keinen Schmutztransport. Nur laut Anleitung zugängliche Messstellen prüfen und Station nicht öffnen.')};
    },{modell:'roomba_j7_plus',fehler_36:true,absaugung_und_fuellzustand:'transport_und_leerer_behaelter_belegt',meldung_nach_aussenpflege:'ja'},
    {status:'wiederkehr_mit_leerem_behaelter_fuer_service'}),

  entry('roomba_comboj9_stationstaste_sicherung_nachweis',
    'Ordne eine ohne Reaktion beobachtete Clean-Base-Taste beim Combo j9+ der tatsächlich dokumentierten Sperrfunktion zu — Check recorded dock-button lock evidence before diagnosing an unresponsive dock',
    {
      modell:models('combo_j9_plus'),
      genaue_nachfuellstation:flags('Beobachtung an der automatischen Absaug- und Nachfüllstation des Combo j9+'),
      funktionsstand_bestaetigt:flags('Installierter Softwarestand mit der ab Version 23.37.12 dokumentierten Stationssperre bestätigt'),
      sicherung_aktiv:yesNo('Kinder-/Haustiersicherung war laut Aufzeichnung in genau diesem Zeitraum aktiv'),
      lokale_reaktion:yesNo('Die Taste der Station zeigte in genau diesem Zeitraum eine Reaktion')
    }, a=>{
      const known=a.modell==='combo_j9_plus'&&a.genaue_nachfuellstation&&a.funktionsstand_bestaetigt&&a.lokale_reaktion==='nein';
      return {status:!known?unknown:a.sicherung_aktiv==='ja'?'befund_passt_zur_dokumentierten_tastensperre':
        a.sicherung_aktiv==='nein'?'tastenausfall_mit_inaktiver_sperre_dokumentieren':unknown,
        ...proof(irobotJ9Software,'Combo j9 · Software 23.37.12 vom 7. Dezember 2023',
          'Das Versionsprotokoll beschreibt diese Station und ihre Taste. Schutzfunktionen weder für einen Versuch ändern noch umgehen.')};
    },{modell:'combo_j9_plus',genaue_nachfuellstation:true,funktionsstand_bestaetigt:true,sicherung_aktiv:'ja',lokale_reaktion:'nein'},
    {status:'befund_passt_zur_dokumentierten_tastensperre'}),

  entry('roboter_stillstand_letzte_dokumentierte_ladung',
    'Prüfe eine längere dokumentierte Nichtnutzung gegen die Aufbewahrungsvorgabe und markiere eine fehlende letzte Ladung — Check complete months since a documented storage charge',
    {
      modell:models(...dreameNames,'saros_10r'),
      laengere_lagerung:flags('Es geht um eine aufbewahrte und länger nicht benutzte Einheit'),
      letzte_ladung_bestaetigt:flags('Letzte dokumentierte Ladung mit eindeutigem Kalendertag am genau zugeordneten Roboter'),
      volle_monate_seit_ladung:num('Volle Kalendermonate seit dieser Ladung; bei fehlendem Datum nur Platzhalter',0,180)
    }, a=>{
      if(!Number.isInteger(a.volle_monate_seit_ladung)) throw new RangeError('Nur volle Kalendermonate angeben.');
      const source=manuals[a.modell]??null;
      const known=source&&a.laengere_lagerung&&a.letzte_ladung_bestaetigt;
      return {intervall_monate:source&&a.laengere_lagerung?3:null,
        status:!known?unknown:a.volle_monate_seit_ladung>3?'laenger_als_das_lagerintervall':
          a.volle_monate_seit_ladung===3?'jetzt_lagerhinweis_abgleichen':'noch_unter_drei_vollen_monaten',
        ...proof(source,'Sicherheit und Akkupflege bei längerer Aufbewahrung',
          'Die Anleitung für das bestätigte Modell verlangt mindestens alle drei Monate eine Ladung. Lücken im Protokoll sagen nichts über Akkuzustand oder Nutzbarkeit aus.')};
    },{modell:'saros_10r',laengere_lagerung:true,letzte_ladung_bestaetigt:true,volle_monate_seit_ladung:4},
    {intervall_monate:3,status:'laenger_als_das_lagerintervall'}),

  entry('dreame_station_tank_oder_absaugfunktion_erwartung',
    'Prüfe, welche Wasserfunktion der Station bei der bestätigten Ausführung erwartet werden darf, bevor Zubehör gesucht wird — Verify whether the actual dock offers the expected water function',
    {
      modell:models(...dreameNames),
      serienausfuehrung_belegt:flags('Normale deutsche Serienausführung mit werkseitiger zugehöriger Station, ohne optionales Wasseranschlussset'),
      ziel:pick('Gesuchte Stationsfunktion','wassertanks_an_basis','automatische_roboter_wassernachfuellung','wischen_am_roboter','unbekannt'),
      tanks_vorhanden:yesNo('Bei der Basis die bezeichneten entnehmbaren Tanks tatsächlich identifiziert')
    }, a=>{
      const known=dreameNames.includes(a.modell)&&a.serienausfuehrung_belegt&&a.ziel!=='unbekannt';
      const d10Model=a.modell==='d10_plus_gen2';
      const status=!known?unknown:a.ziel==='wischen_am_roboter'?'wischfunktion_am_roboter_dokumentiert':
        d10Model?'keine_dokumentierte_wasserfunktion_dieser_basis':a.tanks_vorhanden==='nein'?'fehlende_serientanks_fuer_service_abgleichen':
          a.tanks_vorhanden==='ja'?'tankstation_und_funktion_belegt':'ausstattung_vor_zubehoerkauf_klaeren';
      return {status,...proof(manuals[a.modell]??null,'Deutsche Produktübersicht · Wischmodul und Basisstation',
        'Werkseitige Station und optionales Zubehör getrennt prüfen. Der dokumentierte Auslass belegt keinen aktuellen Wasserfluss. Keine Anleitung für Leitungsanschlüsse.')};
    },{modell:'d10_plus_gen2',serienausfuehrung_belegt:true,ziel:'automatische_roboter_wassernachfuellung',tanks_vorhanden:'nein'},
    {status:'keine_dokumentierte_wasserfunktion_dieser_basis'}),

  entry('saros10r_pausenzeit_und_schlafzustand',
    'Ordne eine nach längerer Pause beobachtete Anzeige dem dokumentierten Schlafzustand statt einer vermuteten Störung zu — Interpret the Saros pause timeline independently of the charger',
    {
      modell_bestaetigt:exact('Saros 10R · S91COP'),
      aufladung:yesNo('Der Roboter wurde während des fraglichen Zeitraums aufgeladen'),
      pause_min:num('Lückenlos dokumentierte Minuten seit Beginn einer normalen Pause',0,1440),
      dokumentierter_zustand:pick('Wirklich am Roboter beobachteter letzter Zustand','blinkt_alle_paar_sekunden','aus','anderer_oder_offen'),
      pause_ohne_fehlerhinweis:flags('Gleiche normale Pause, ohne gesonderte Fehlermeldung oder erneuten Auftrag')
    }, a=>{
      const known=a.modell_bestaetigt&&a.pause_ohne_fehlerhinweis;
      let status=unknown;
      if(known){
        if(a.aufladung==='ja') status='dokumentierter_schlafmodus_gilt_beim_laden_nicht';
        else if(a.aufladung==='nein'&&a.pause_min>10&&a.dokumentierter_zustand==='blinkt_alle_paar_sekunden')
          status='anzeige_passt_zum_schlaf_nach_pause';
        else if(a.aufladung==='nein'&&a.pause_min>730&&a.dokumentierter_zustand==='aus')
          status='dauer_passt_zum_moeglichen_automatischen_ausschalten';
      }
      return {status,...proof(saros,'C · Schlafen S. 33',
        'In normaler Pause erst nach mehr als zehn Minuten Schlafmodus; Ausschalten nach mehr als zwölf Stunden im Schlaf. Ein dunkles Gerät allein beweist keinen Defekt.')};
    },{modell_bestaetigt:true,aufladung:'nein',pause_min:22,dokumentierter_zustand:'blinkt_alle_paar_sekunden',pause_ohne_fehlerhinweis:true},
    {status:'anzeige_passt_zum_schlaf_nach_pause'})
];
