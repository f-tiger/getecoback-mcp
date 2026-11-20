const products = '/produkte.html';
const household = '/guide/strom-sparen-haushalt.html';
const appliances = '/geraete-austausch-rechner.html';
const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const choice = (description, ...values) => ({type:'string', description, enum:values});
const ml = description => number(description,0,5000);
const minutes = description => number(description,0,1440);
const count = description => number(description,0,500);
const coordinate = description => number(description,0,1440);
const round = (value, places=3) => Number(value.toFixed(places));
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Anzahl muss ganzzahlig sein');
}

export const kuechenpraxis = [
  {
    name:'wasserkocher_fuellsplitt_mindestmenge',
    description:'Schon bekannten Wasserbedarf auf erlaubte Kannenfüllungen verteilen — Schedule equal kettle batches within the documented minimum and maximum.',
    page:products,
    properties:{bedarf_ml:ml('Benötigte Gesamtmenge in Millilitern.'),min_ml:ml('Mindestfüllung laut Anleitung.'),max_ml:ml('Höchstfüllung laut Anleitung.')},
    calculate({bedarf_ml,min_ml,max_ml}){
      if(max_ml<=0 || min_ml>max_ml) throw new RangeError('Füllgrenzen');
      if(!bedarf_ml) return {durchgaenge:0,gleichmaessig_ml:0,unvermeidbarer_ueberschuss_ml:0,
        grenze:'Ohne Wasserbedarf keinen Durchgang vorsehen.'};
      const count=Math.ceil(bedarf_ml/max_ml);
      const batch=Math.max(min_ml,bedarf_ml/count);
      return {durchgaenge:count,gleichmaessig_ml:round(batch),unvermeidbarer_ueberschuss_ml:round(batch*count-bedarf_ml),
        grenze:'Grenzen des genauen Wasserkochers eintragen. Die gerundete Anzeige ist keine Markierung am Gerät.'};
    },
    example:{args:{bedarf_ml:1900,min_ml:400,max_ml:1700},expect:{durchgaenge:2,gleichmaessig_ml:950,unvermeidbarer_ueberschuss_ml:0}},
  },
  {
    name:'wasserkocher_wahlstufe_abgleichen',
    description:'Gewünschten Sollwert mit dokumentierten Temperaturstufen des Wasserkochers vergleichen — Match a kettle target to a documented evenly spaced setting.',
    page:products,
    properties:{
      ziel_c:number('Gewünschter Sollwert in °C.',0,110),
      untergrenze_c:number('Erste wählbare Stufe laut Anleitung.',0,110),
      obergrenze_c:number('Letzte wählbare Stufe laut Anleitung.',0,110),
      schritt_c:number('Einheitlicher Abstand zwischen den Stufen laut Anleitung.',1,110),
      toleranz_c:number('Maximal akzeptierte Abweichung der Einstellung vom gewählten Ziel.',0,110),
    },
    calculate({ziel_c,untergrenze_c,obergrenze_c,schritt_c,toleranz_c}){
      const range=obergrenze_c-untergrenze_c;
      if(range<0 || Math.abs(range/schritt_c-Math.round(range/schritt_c))>1e-9) throw new RangeError('Stufenraster');
      const documented=Array.from({length:Math.round(range/schritt_c)+1},(_,index)=>untergrenze_c+index*schritt_c);
      const settings=documented.filter(value=>Math.abs(value-ziel_c)<=toleranz_c+1e-9);
      return {passende_sollwerte_c:settings.map(value=>round(value)),exakt_waehlbar:settings.some(value=>Math.abs(value-ziel_c)<1e-9),
        grenze:'Vergleich von Einstellungen. Die tatsächliche Wassertemperatur oder Eignung für ein Getränk wird nicht bestimmt.'};
    },
    example:{args:{ziel_c:77,untergrenze_c:40,obergrenze_c:100,schritt_c:5,toleranz_c:2},expect:{passende_sollwerte_c:[75],exakt_waehlbar:false}},
  },
  {
    name:'wasserkocher_tassenmarke_messbecher',
    description:'Praktische Tassenanzeige mit zwei gemessenen Kaltwasserfüllungen prüfen — Compare a kettle’s cup mark against the volume of your serving cup.',
    page:products,
    properties:{
      linie_ml:ml('Mit Messbecher abgelesene Kaltwassermenge an der ausgewählten Kannenmarke.'),
      tasse_ml:ml('Am gewünschten Pegel mit Messbecher bestimmte Tassenfüllung.'),
      messspanne_ml:ml('Geschätzte gesamte Unsicherheit beider abgelesenen Mengen zusammen.'),
    },
    calculate({linie_ml,tasse_ml,messspanne_ml}){
      if(!linie_ml || !tasse_ml) throw new RangeError('Kaltwassermenge');
      const delta=linie_ml-tasse_ml;
      return {marke_minus_tasse_ml:round(delta),abgleich:Math.abs(delta)<=messspanne_ml?'innerhalb_messspanne':delta>0?'marke_enthaelt_mehr':'marke_enthaelt_weniger',
        grenze:'Nur Vergleich der kalten Messmengen. Ausschließlich innerhalb der Füllgrenzen aus der Anleitung betreiben.'};
    },
    example:{args:{linie_ml:260,tasse_ml:230,messspanne_ml:10},expect:{marke_minus_tasse_ml:30,abgleich:'marke_enthaelt_mehr'}},
  },
  {
    name:'wasserkocher_entkalkung_zeitfenster',
    description:'Aus der Modellanleitung bekannte Pflegephasen bis zur nächsten Benutzung einplanen — Reserve an uninterrupted window for the kettle’s documented care steps.',
    page:products,
    properties:{
      vorgang_beschrieben:flag('Ist die gesamte Pflegefolge laut Anleitung für dieses Modell bekannt?'),
      vorbereitung_min:minutes('Eigene Dauer der Vorbereitung.'),
      einwirkzeit_min:minutes('Dokumentierte Wartezeit für die vorgesehene Pflege.'),
      spuelgaenge:count('Anzahl vorgeschriebener Spülgänge.'),
      je_spuelgang_min:minutes('Eigene Dauer je Spülgang.'),
      verfuegbar_min:minutes('Verfügbare Zeit bis zum nächsten geplanten Gebrauch.'),
    },
    calculate({vorgang_beschrieben,vorbereitung_min,einwirkzeit_min,spuelgaenge,je_spuelgang_min,verfuegbar_min}){
      whole(spuelgaenge);
      const duration=vorbereitung_min+einwirkzeit_min+spuelgaenge*je_spuelgang_min;
      return {vorgang_min:vorgang_beschrieben?round(duration):null,
        zeitreserve_min:vorgang_beschrieben?round(verfuegbar_min-duration):null,
        status:!vorgang_beschrieben?'pflegefolge_klaeren':duration<=verfuegbar_min?'zeitfenster_reicht_rechnerisch':'pflege_vorziehen_oder_spaeter_nutzen',
        grenze:'Reine Zeitplanung für die Pflegevorgaben der Anleitung. Keine Mittel, Dosierungen oder Ersatzverfahren ableiten.'};
    },
    example:{args:{vorgang_beschrieben:true,vorbereitung_min:4,einwirkzeit_min:20,spuelgaenge:3,je_spuelgang_min:2,verfuegbar_min:25},expect:{vorgang_min:30,zeitreserve_min:-5}},
  },
  {
    name:'wasserkocher_warmhalte_schlussabgleich',
    description:'Geplante Entnahmen mit einem dokumentierten Warmhaltefenster nach dem Aufheizen abgleichen — Check serving times against the kettle’s documented holding interval.',
    page:products,
    properties:{
      modus_bestaetigt:flag('Anleitung bestätigt den Warmhaltemodus in der gewählten Einstellung.'),
      dauer_min:minutes('Dokumentierte Zeit bis zum Ende des Warmhaltemodus.'),
      erste_entnahme_min:minutes('Minuten zwischen abgeschlossenem Aufheizen und der ersten Entnahme.'),
      spaeteste_entnahme_min:minutes('Minuten zwischen abgeschlossenem Aufheizen und der letzten Entnahme.'),
    },
    calculate({modus_bestaetigt,dauer_min,erste_entnahme_min,spaeteste_entnahme_min}){
      if(erste_entnahme_min>spaeteste_entnahme_min) throw new RangeError('Reihenfolge der Entnahmen');
      return {erste_innerhalb:modus_bestaetigt?erste_entnahme_min<=dauer_min:null,
        letzte_innerhalb:modus_bestaetigt?spaeteste_entnahme_min<=dauer_min:null,
        letzte_zeitreserve_min:modus_bestaetigt?round(dauer_min-spaeteste_entnahme_min):null,
        grenze:'Prüft ausschließlich den dokumentierten Timer. Keine Aussage zur tatsächlichen Temperatur oder Aufbewahrung.'};
    },
    example:{args:{modus_bestaetigt:true,dauer_min:30,erste_entnahme_min:8,spaeteste_entnahme_min:35},expect:{erste_innerhalb:true,letzte_innerhalb:false,letzte_zeitreserve_min:-5}},
  },
  {
    name:'wasserkocher_zwei_aufguesse_servierplan',
    description:'Zwei vorgegebene Ziehzeiten mit einer gemeinsam benutzten Kanne rückwärts planen — Schedule two passive infusion timers with one kettle and a common serving time.',
    page:products,
    properties:{
      bis_servieren_min:minutes('Verbleibende Minuten bis zum geplanten Servieren.'),
      aufheizen_a_min:minutes('Eigene gemessene Heizdauer für Aufguss A.'),
      aufheizen_b_min:minutes('Eigene gemessene Heizdauer für Aufguss B.'),
      ziehen_a_min:minutes('Vorgegebene Ziehzeit von Aufguss A.'),
      ziehen_b_min:minutes('Vorgegebene Ziehzeit von Aufguss B.'),
      wechsel_min:minutes('Eigene Zeit für Ausgießen und Neubefüllen zwischen den Durchgängen.'),
    },
    calculate({bis_servieren_min,aufheizen_a_min,aufheizen_b_min,ziehen_a_min,ziehen_b_min,wechsel_min}){
      const pourA=bis_servieren_min-ziehen_a_min;
      const pourB=bis_servieren_min-ziehen_b_min;
      const first=pourA<=pourB?'A':'B';
      const startA=pourA-aufheizen_a_min;
      const startB=pourB-aufheizen_b_min;
      const gap=first==='A'?startB-pourA-wechsel_min:startA-pourB-wechsel_min;
      return {zuerst:first,start_a_ab_jetzt_min:round(startA),start_b_ab_jetzt_min:round(startB),
        reserveminuten_zwischen_heizphasen:round(gap),gemeinsam_puenktlich:startA>=0&&startB>=0&&gap>=0,
        grenze:'Plant gemessene Heizzeiten und vorgegebene Timer. Füllmengen, Arbeitsschritte und die Eignung des Aufgusses separat klären.'};
    },
    example:{args:{bis_servieren_min:20,aufheizen_a_min:3,aufheizen_b_min:2,ziehen_a_min:9,ziehen_b_min:5,wechsel_min:1},expect:{zuerst:'A',start_a_ab_jetzt_min:8,start_b_ab_jetzt_min:13,gemeinsam_puenktlich:true}},
  },
  {
    name:'heissluft_zonen_temperaturbedarf',
    description:'Zwei festgelegte Programme für eine gemeinsame oder zwei unabhängige Garzonen einordnen — Determine when a planned parallel run requires independently adjustable zones.',
    page:products,
    properties:{
      zonen:choice('Welche Bedienung ist bei der genauen Variante dokumentiert?', 'gemeinsam','getrennt','unbekannt'),
      modus_a:choice('Vorgegebener Betriebsmodus für A.', 'heissluft','grill','anderer'),
      modus_b:choice('Vorgegebener Betriebsmodus für B.', 'heissluft','grill','anderer'),
      temperatur_a_c:number('Vorgegebene Programmeinstellung für A in °C.',0,300),
      temperatur_b_c:number('Vorgegebene Programmeinstellung für B in °C.',0,300),
      gemeinsam_erlaubt:flag('Gemeinsamer Betrieb dieser beiden Aufgaben ist laut Anleitung geklärt. Andere Modi im Zweifelsfall separat prüfen.'),
    },
    calculate({zonen,modus_a,modus_b,temperatur_a_c,temperatur_b_c,gemeinsam_erlaubt}){
      const separate=modus_a!==modus_b||temperatur_a_c!==temperatur_b_c;
      return {getrennte_einstellungen_noetig:separate,status:!gemeinsam_erlaubt||zonen==='unbekannt'?'kombination_im_handbuch_klaeren':
        separate&&zonen==='gemeinsam'?'getrennt_oder_nacheinander_planen':'einstellungen_rechnerisch_vereinbar',
        grenze:'Vergleicht übergebene Einstellungen. Keine Aussage über passende Garzeiten, Portionen oder Garzustand.'};
    },
    example:{args:{zonen:'gemeinsam',modus_a:'heissluft',modus_b:'heissluft',temperatur_a_c:180,temperatur_b_c:200,gemeinsam_erlaubt:true},expect:{getrennte_einstellungen_noetig:true,status:'getrennt_oder_nacheinander_planen'}},
  },
  {
    name:'heissluft_zwei_mengen_zonenwahl',
    description:'Zwei bekannte Portionsmengen auf asymmetrischen Schubladen verteilen — Compare both assignments using observed recipe-specific batch capacities.',
    page:products,
    properties:{
      a_portionen:count('Gewünschte Anzahl Portionen der Aufgabe A.'),
      b_portionen:count('Gewünschte Anzahl Portionen der Aufgabe B.'),
      a_zone1:count('Beobachtete passende Portionen von A in Zone 1 für eine Runde.'),
      a_zone2:count('Beobachtete passende Portionen von A in Zone 2 für eine Runde.'),
      b_zone1:count('Beobachtete passende Portionen von B in Zone 1 für eine Runde.'),
      b_zone2:count('Beobachtete passende Portionen von B in Zone 2 für eine Runde.'),
      parallel_geprueft:flag('Beide Kombinationen wurden in der konkret geplanten Anordnung auf zulässige Nutzung geprüft.'),
    },
    calculate({a_portionen,b_portionen,a_zone1,a_zone2,b_zone1,b_zone2,parallel_geprueft}){
      whole(a_portionen,b_portionen,a_zone1,a_zone2,b_zone1,b_zone2);
      if(!parallel_geprueft) return {beide_in_einer_runde:null,moegliche_belegung:[],grenze:'Dokumentierte Zonen, Gerätevorgaben und beobachtete Mengen zuerst abgleichen.'};
      const options=[];
      if(a_portionen<=a_zone1&&b_portionen<=b_zone2) options.push('A_in_1_B_in_2');
      if(a_portionen<=a_zone2&&b_portionen<=b_zone1) options.push('A_in_2_B_in_1');
      return {beide_in_einer_runde:options.length>0,moegliche_belegung:options,
        grenze:'Gilt für die beobachtete Zusammenstellung. Nennliter liefern keine verlässliche Portionszahl.'};
    },
    example:{args:{a_portionen:4,b_portionen:2,a_zone1:5,a_zone2:2,b_zone1:3,b_zone2:2,parallel_geprueft:true},expect:{beide_in_einer_runde:true,moegliche_belegung:['A_in_1_B_in_2']}},
  },
  {
    name:'heissluft_schubladenpause_zonenzeit',
    description:'Tatsächliche Unterbrechung beider Zonen beim Öffnen einer Schublade protokollieren — Quantify observed zone downtime when a drawer is accessed.',
    page:products,
    properties:{
      vorgaenge:count('Anzahl vergleichbarer Entnahmevorgänge.'),
      pause_1_gesamt_s:number('Beobachtete Aussetzzeit von Zone 1 zusammen in Sekunden.',0,86400),
      pause_2_gesamt_s:number('Beobachtete Aussetzzeit von Zone 2 zusammen in Sekunden.',0,86400),
      gleiche_vorgaenge:flag('Beide Summen beziehen sich auf dieselben Öffnungen und denselben Betriebszustand.'),
    },
    calculate({vorgaenge,pause_1_gesamt_s,pause_2_gesamt_s,gleiche_vorgaenge}){
      whole(vorgaenge);
      if(!vorgaenge&&(pause_1_gesamt_s||pause_2_gesamt_s)) throw new RangeError('Aussetzzeit ohne Öffnung');
      return {vergleichbar:gleiche_vorgaenge&&vorgaenge>0,
        pause_2_je_vorgang_s:gleiche_vorgaenge&&vorgaenge>0?round(pause_2_gesamt_s/vorgaenge):null,
        zusatzpause_zone_2_s:gleiche_vorgaenge&&vorgaenge>0?round(Math.max(0,pause_2_gesamt_s-pause_1_gesamt_s)):null,
        grenze:'Misst nur protokollierte Aussetzzeit. Gemeinsame Schublade bedeutet nicht automatisch gleiches Pausenverhalten.'};
    },
    example:{args:{vorgaenge:3,pause_1_gesamt_s:35,pause_2_gesamt_s:42,gleiche_vorgaenge:true},expect:{vergleichbar:true,pause_2_je_vorgang_s:14,zusatzpause_zone_2_s:7}},
  },
  {
    name:'heissluft_trennwand_umruestfenster',
    description:'Freie Pause für den dokumentierten Wechsel zwischen geteilter und gemeinsamer Schublade prüfen — Reserve an idle slot for a documented divider reconfiguration.',
    page:products,
    properties:{
      entnehmbare_trennung:flag('Die Anleitung der genauen Variante bestätigt die entnehmbare Trennwand.'),
      frei_ab_min:coordinate('Minute ab Planbeginn, ab der die gesamte Schublade unbelegt ist.'),
      naechste_nutzung_min:coordinate('Minute ab Planbeginn, ab der die nächste Aufgabe die Schublade braucht.'),
      vorbereiten_min:minutes('Eigene Dauer inklusive der in der Anleitung geforderten Vorbereitung.'),
      umruesten_min:minutes('Eigene Dauer für das Umrüsten nach der vorgesehenen Anleitung.'),
    },
    calculate({entnehmbare_trennung,frei_ab_min,naechste_nutzung_min,vorbereiten_min,umruesten_min}){
      const ready=frei_ab_min+vorbereiten_min+umruesten_min;
      return {fruehestens_umgeruestet_min:entnehmbare_trennung?round(ready):null,
        reserve_min:entnehmbare_trennung?round(naechste_nutzung_min-ready):null,
        status:!entnehmbare_trennung?'variante_und_anleitung_klaeren':ready<=naechste_nutzung_min?'zeitlich_planbar':'aufgaben_nacheinander_verschieben',
        grenze:'Zeitplanung ohne Anleitung zum Umbau. In einer gemeinsamen Schublade keine Nutzung gleichzeitig mit dem Umrüsten vorsehen.'};
    },
    example:{args:{entnehmbare_trennung:true,frei_ab_min:30,naechste_nutzung_min:42,vorbereiten_min:9,umruesten_min:4},expect:{fruehestens_umgeruestet_min:43,reserve_min:-1,status:'aufgaben_nacheinander_verschieben'}},
  },
  {
    name:'heissluft_zonen_handgriff_kollision',
    description:'Je einen notwendigen Bediengriff zweier Programme für eine einzelne Person auf Überschneidung prüfen — Check whether one operator can perform both time-sensitive basket actions.',
    page:products,
    properties:{
      a_frueh_min:coordinate('Erster zulässiger Beginn des Bediengriffs A laut eigenem Ablaufplan.'),
      a_spaet_min:coordinate('Spätester zulässiger Beginn von A.'),
      a_dauer_min:minutes('Eigene beobachtete Dauer des Bediengriffs A.'),
      b_frueh_min:coordinate('Erster zulässiger Beginn des Bediengriffs B.'),
      b_spaet_min:coordinate('Spätester zulässiger Beginn von B.'),
      b_dauer_min:minutes('Eigene beobachtete Dauer des Bediengriffs B.'),
    },
    calculate({a_frueh_min,a_spaet_min,a_dauer_min,b_frueh_min,b_spaet_min,b_dauer_min}){
      if(a_frueh_min>a_spaet_min||b_frueh_min>b_spaet_min) throw new RangeError('Bedienfenster');
      const aFirst=Math.max(b_frueh_min,a_frueh_min+a_dauer_min)<=b_spaet_min;
      const bFirst=Math.max(a_frueh_min,b_frueh_min+b_dauer_min)<=a_spaet_min;
      return {moegliche_reihenfolgen:[aFirst?'A_dann_B':null,bFirst?'B_dann_A':null].filter(Boolean),
        kollision_unvermeidbar:!aFirst&&!bFirst,
        grenze:'Nur Zwei-Aufgaben-Planung. Garvorgaben und zulässige Bedienfenster müssen vorab aus Anleitung und eigenem Ablauf vorliegen.'};
    },
    example:{args:{a_frueh_min:10,a_spaet_min:11,a_dauer_min:3,b_frueh_min:10,b_spaet_min:12,b_dauer_min:4},expect:{moegliche_reihenfolgen:[],kollision_unvermeidbar:true}},
  },
  {
    name:'heissluft_grillrost_lieferumfang_pruefen',
    description:'Für einen geplanten Grillvorgang den vorhandenen Rost mit der dokumentierten Gerätereferenz abgleichen — Check whether a cooking plan relies on a supplied rack or needs accessory confirmation.',
    page:products,
    properties:{
      variante:choice('Genaue Referenz am Gerät.', 'tefal_ey505815','andere','unbekannt'),
      grillrost_noetig:flag('Der gewählte, bereits dokumentierte Ablauf benötigt einen Grillrost.'),
      rost_vorhanden:flag('Passender Rost ist mit erkennbarer Zuordnung zum Gerät vorhanden.'),
    },
    calculate({variante,grillrost_noetig,rost_vorhanden}){
      return {rost_in_quelle_genannt:variante==='tefal_ey505815'?true:null,
        status:!grillrost_noetig?'ablauf_ohne_rost':rost_vorhanden?'anleitung_fuer_gewaehlten_ablauf_pruefen':'rost_oder_alternativen_ablauf_klaeren',
        grenze:'EcoBack dokumentiert den Herstellerlieferumfang der Tefal-Referenz EY505815. Einzelne Angebote, Ersatzteile und andere Varianten separat prüfen.'};
    },
    example:{args:{variante:'tefal_ey505815',grillrost_noetig:true,rost_vorhanden:false},expect:{rost_in_quelle_genannt:true,status:'rost_oder_alternativen_ablauf_klaeren'}},
  },
  {
    name:'backofen_zweiblech_einstellkorridor',
    description:'Zwei vorgegebene Einstellbereiche für einen gemeinsamen Backofenlauf schneiden — Find the overlapping permitted settings for a one-chamber tray plan.',
    page:products,
    properties:{
      a_min_c:number('Unterer dokumentierter Sollwert für Aufgabe A.',0,300),
      a_max_c:number('Oberer dokumentierter Sollwert für Aufgabe A.',0,300),
      b_min_c:number('Unterer dokumentierter Sollwert für Aufgabe B.',0,300),
      b_max_c:number('Oberer dokumentierter Sollwert für Aufgabe B.',0,300),
      gleicher_modus:flag('Beide Aufgaben erlauben denselben Ofenmodus.'),
      zwei_bleche_erlaubt:flag('Gleichzeitige Nutzung zweier Ebenen ist für Gerät und Abläufe bestätigbar.'),
    },
    calculate({a_min_c,a_max_c,b_min_c,b_max_c,gleicher_modus,zwei_bleche_erlaubt}){
      if(a_min_c>a_max_c||b_min_c>b_max_c) throw new RangeError('Einstellbereich');
      const lo=Math.max(a_min_c,b_min_c),hi=Math.min(a_max_c,b_max_c);
      const usable=lo<=hi&&gleicher_modus&&zwei_bleche_erlaubt;
      return {planbar:usable,gemeinsamer_bereich_c:usable?[lo,hi]:null,
        grenze:'Nur Schnittmenge vorgegebener Sollwerte. Einschub, Zugänglichkeit, Anleitung und tatsächlichen Ablauf separat berücksichtigen.'};
    },
    example:{args:{a_min_c:175,a_max_c:190,b_min_c:180,b_max_c:200,gleicher_modus:true,zwei_bleche_erlaubt:true},expect:{planbar:true,gemeinsamer_bereich_c:[180,190]}},
  },
  {
    name:'kontaktgrill_offen_geschlossen_servierfolge',
    description:'Für eine vorgegebene Menge offene und geschlossene Grillabläufe vergleichen — Compare measured serving throughput in the two documented contact-grill modes.',
    page:products,
    properties:{
      menge:count('Benötigte Anzahl gleicher Portionen.'),
      offen_erlaubt:flag('Für das Gerät und diesen Ablauf ist offener Betrieb dokumentiert.'),
      offen_je_runde:count('Beobachtete Portionen pro zulässiger offener Runde.'),
      kontakt_je_runde:count('Beobachtete Portionen pro zulässiger geschlossener Runde.'),
      offen_runde_min:minutes('Beobachtete Dauer einschließlich Beschicken im offenen Modus.'),
      kontakt_runde_min:minutes('Beobachtete Dauer einschließlich Beschicken im Kontaktmodus.'),
      offen_vorbereitung_min:minutes('Einmalige eigene Vorbereitungsdauer für den offenen Modus.'),
      kontakt_vorbereitung_min:minutes('Einmalige eigene Vorbereitungsdauer für den Kontaktmodus.'),
    },
    calculate({menge,offen_erlaubt,offen_je_runde,kontakt_je_runde,offen_runde_min,kontakt_runde_min,offen_vorbereitung_min,kontakt_vorbereitung_min}){
      whole(menge,offen_je_runde,kontakt_je_runde);
      const time=(capacity,cycle,setup)=>!capacity?null:!menge?0:round(setup+Math.ceil(menge/capacity)*cycle);
      return {offen_min:offen_erlaubt?time(offen_je_runde,offen_runde_min,offen_vorbereitung_min):null,
        kontakt_min:time(kontakt_je_runde,kontakt_runde_min,kontakt_vorbereitung_min),
        grenze:'Zeiten nur aus vergleichbaren eigenen Durchläufen. Kein Modus wird freigegeben, keine Garzeit wird empfohlen.'};
    },
    example:{args:{menge:7,offen_erlaubt:true,offen_je_runde:4,kontakt_je_runde:2,offen_runde_min:9,kontakt_runde_min:4,offen_vorbereitung_min:5,kontakt_vorbereitung_min:3},expect:{offen_min:23,kontakt_min:19}},
  },
  {
    name:'kontaktgrill_signaltyp_zeitplan',
    description:'Klären, welche Anzeige ein geplantes Minutenprotokoll tragen kann — Distinguish a documented countdown from a qualitative grill-stage display.',
    page:products,
    properties:{
      variante:choice('Bestätigte Tefal-Referenz am Typenschild.', 'gc750d12','gc772d10','andere','unbekannt'),
      minutenwerte_noetig:flag('Der Ablaufplan braucht numerische Restminuten statt reiner Stufenkennzeichnung.'),
      unabhaengiger_timer:flag('Ein unabhängiger Timer steht zur Erfassung des eigenen Zeitplans zur Verfügung.'),
    },
    calculate({variante,minutenwerte_noetig,unabhaengiger_timer}){
      const beleg={gc750d12:'countdown_beschrieben',gc772d10:'farbige_stufenanzeige_beschrieben'};
      const display=beleg[variante]??'keine_zuordnung_im_katalog';
      return {anzeigebeleg:display,zeitprotokoll:minutenwerte_noetig&&display!=='countdown_beschrieben'?
        (unabhaengiger_timer?'unabhaengigen_timer_einplanen':'timer_oder_ausgabeform_klaeren'):'geplanten_ablauf_abgleichen',
        grenze:'Eine Anzeige dokumentiert die Programmrückmeldung. Sie bestätigt weder Garzustand noch Lebensmittelsicherheit.'};
    },
    example:{args:{variante:'gc772d10',minutenwerte_noetig:true,unabhaengiger_timer:true},expect:{anzeigebeleg:'farbige_stufenanzeige_beschrieben',zeitprotokoll:'unabhaengigen_timer_einplanen'}},
  },
  {
    name:'kontaktgrill_pflegegruppe_abtropfplatz',
    description:'Pflegefreigaben und Ablageplätze für Platten und Auffangbehälter als gemeinsamen Ablauf erfassen — Plan a cooling and cleaning handoff for only the documented removable components.',
    page:products,
    properties:{
      freigegebene_platten:count('Anzahl laut Anleitung entnehmbarer Platten mit geklärtem Pflegeweg.'),
      auffangbehaelter:count('Anzahl laut Anleitung entnehmbarer Behälter mit geklärtem Pflegeweg.'),
      separate_plaetze:count('Verfügbare passende Ablagen, wenn alle Teile einzeln abgelegt werden müssen.'),
      stapeln_ausgeschlossen:flag('Eigene vorgesehene Pflege verlangt einzelne Ablageplätze und kein Stapeln.'),
    },
    calculate({freigegebene_platten,auffangbehaelter,separate_plaetze,stapeln_ausgeschlossen}){
      whole(freigegebene_platten,auffangbehaelter,separate_plaetze);
      const parts=freigegebene_platten+auffangbehaelter;
      return {eingeplante_teile:parts,fehlende_plaetze:stapeln_ausgeschlossen?Math.max(0,parts-separate_plaetze):null,
        grenze:'Zählt vorgesehene Ablagen für die dokumentierte Pflege. Weder Stapelbarkeit noch Reinigungs- oder Berührungstemperatur werden bestimmt.'};
    },
    example:{args:{freigegebene_platten:2,auffangbehaelter:1,separate_plaetze:2,stapeln_ausgeschlossen:true},expect:{eingeplante_teile:3,fehlende_plaetze:1}},
  },
  {
    name:'kontaktgrill_haeufigkeit_auffangbehaelter_protokoll',
    description:'Reinigungspausen für wiederholte Grillrunden mit dem eigenen Protokoll abschätzen — Estimate when recorded runoff would reach a chosen manual-compatible service point.',
    page:products,
    properties:{
      grenze_ml:ml('Zulässiger Pflegepunkt der Auffangschale, als Menge eingegeben.'),
      start_ml:ml('Beobachteter Behälterinhalt vor dem vorgesehenen Block.'),
      max_je_runde_ml:ml('Größter protokollierter Zuwachs unter vergleichbaren Bedingungen.'),
      szenario_geprueft:flag('Herstellervorgaben zu Auffangbehälter und Pflege sind für den vorgesehenen Ablauf geklärt.'),
    },
    calculate({grenze_ml,start_ml,max_je_runde_ml,szenario_geprueft}){
      const spare=Math.max(0,grenze_ml-start_ml);
      return {beobachtungsreserve_ml:szenario_geprueft?round(spare):null,
        ganze_runden_bis_punkt:szenario_geprueft&&max_je_runde_ml>0?Math.floor((spare+1e-9)/max_je_runde_ml):null,
        pflegepunkt_bereits_erreicht:szenario_geprueft?start_ml>=grenze_ml:null,
        grenze:'Nur Planung mit eigener Obergrenze und beobachtetem Zuwachs. Nicht beim heißen Betrieb entnehmen und die konkrete Pflegefolge ausschließlich der Anleitung entnehmen.'};
    },
    example:{args:{grenze_ml:140,start_ml:55,max_je_runde_ml:30,szenario_geprueft:true},expect:{beobachtungsreserve_ml:85,ganze_runden_bis_punkt:2,pflegepunkt_bereits_erreicht:false}},
  },
  {
    name:'kuehlschrank_entnahmeliste_kennzeichnungsluecke',
    description:'Für eine vorbereitete Entnahmeliste die fehlenden eindeutigen Behälterhinweise zählen — Identify which container identifications to prepare before opening the fridge.',
    page:household,
    properties:{
      geplante_entnahmen:count('Anzahl verschiedener geplanter Behälterentnahmen.'),
      eindeutig_markiert:count('Davon ohne Rätsel eindeutig identifizierbare Behälter.'),
      markierungen_verfuegbar:count('Noch verfügbare eindeutige Kennzeichnungen für ungeklärte Behälter.'),
    },
    calculate({geplante_entnahmen,eindeutig_markiert,markierungen_verfuegbar}){
      whole(geplante_entnahmen,eindeutig_markiert,markierungen_verfuegbar);
      if(eindeutig_markiert>geplante_entnahmen) throw new RangeError('Anzahl der Entnahmen');
      const gap=geplante_entnahmen-eindeutig_markiert;
      return {noch_zu_klaeren:gap,fehlende_kennzeichnungen:Math.max(0,gap-markierungen_verfuegbar),
        grenze:'Unterstützt eine vorbereitete Entnahme. Keine Rückschlüsse auf Lagergeeignetheit, Haltbarkeit oder Temperatur.'};
    },
    example:{args:{geplante_entnahmen:9,eindeutig_markiert:5,markierungen_verfuegbar:2},expect:{noch_zu_klaeren:4,fehlende_kennzeichnungen:2}},
  },
  {
    name:'kuehlgeraet_tueranzeige_protokollabgleich',
    description:'Vorhandene Türsignale mit selbst gemessenen Öffnungen abgleichen — Check whether observed door events correspond to the exact model’s alarm delay.',
    page:household,
    properties:{
      alarm_verzoegerung_s:number('Auslöseverzögerung in Sekunden laut Anleitung für die gegebene Einstellung.',0,86400),
      kuerzestes_signal_s:number('Kürzeste protokollierte Öffnung mit Signal.',0,86400),
      laengste_ohne_signal_s:number('Längste protokollierte Öffnung ohne Signal.',0,86400),
      bedingungen_passend:flag('Gleicher Modus, gleiche Tür und eindeutig dokumentiertes Signal in beiden Fällen.'),
    },
    calculate({alarm_verzoegerung_s,kuerzestes_signal_s,laengste_ohne_signal_s,bedingungen_passend}){
      if(!bedingungen_passend||!alarm_verzoegerung_s) return {status:'modell_und_beobachtung_abgleichen',fruehes_signal:null,fehlendes_signal_nach_schwelle:null};
      const early=kuerzestes_signal_s<alarm_verzoegerung_s;
      const missing=laengste_ohne_signal_s>alarm_verzoegerung_s;
      return {fruehes_signal:early,fehlendes_signal_nach_schwelle:missing,status:early||missing?'signalablauf_dokumentieren':'keine_abweichung_in_diesen_stichproben',
        grenze:'Kein Anlass, die Tür für einen Test länger offen zu halten. Beobachtung allein weist weder einen Fehler noch ausreichende Kühlung nach.'};
    },
    example:{args:{alarm_verzoegerung_s:60,kuerzestes_signal_s:72,laengste_ohne_signal_s:66,bedingungen_passend:true},expect:{fruehes_signal:false,fehlendes_signal_nach_schwelle:true,status:'signalablauf_dokumentieren'}},
  },
  {
    name:'kuehlgeraet_fachvolumen_bedarfsabgleich',
    description:'Eigenen Platzbedarf in Kühl- und Gefrierfach getrennt mit den dokumentierten Nutzvolumina abgleichen — Identify the actual compartment capacity shortfall rather than combining both figures.',
    page:appliances,
    properties:{
      kuehlfach_nutz_l:number('Nutzvolumen des Kühlfachs laut Datenblatt des genauen Modells.',0,2000),
      gefrierfach_nutz_l:number('Nutzvolumen des Gefrierfachs laut Datenblatt des genauen Modells.',0,2000),
      eigene_kuehlboxen_l:number('Gemessenes beanspruchtes Volumen der fürs Kühlfach vorgesehenen Behälter.',0,2000),
      eigene_gefrierboxen_l:number('Gemessenes beanspruchtes Volumen der fürs Gefrierfach vorgesehenen Behälter.',0,2000),
      getrennt_ausgewiesen:flag('Beide Nutzvolumina sind für die konkreten Fächer getrennt dokumentiert.'),
    },
    calculate({kuehlfach_nutz_l,gefrierfach_nutz_l,eigene_kuehlboxen_l,eigene_gefrierboxen_l,getrennt_ausgewiesen}){
      if(!getrennt_ausgewiesen) return {kuehlfach_reserve_l:null,gefrierfach_reserve_l:null,status:'getrennte_nutzvolumina_klaeren'};
      const cold=kuehlfach_nutz_l-eigene_kuehlboxen_l;
      const frozen=gefrierfach_nutz_l-eigene_gefrierboxen_l;
      return {kuehlfach_reserve_l:round(cold),gefrierfach_reserve_l:round(frozen),
        status:cold<0||frozen<0?'fachbedarf_nicht_gedeckt':'einzelfach_form_und_luftweg_pruefen',
        grenze:'Volumenüberschüsse sind nicht zwischen verschiedenen Fächern übertragbar. Form, vorhandene Einbauten, Luftführung und Eignung bleiben zu prüfen.'};
    },
    example:{args:{kuehlfach_nutz_l:130,gefrierfach_nutz_l:28,eigene_kuehlboxen_l:118,eigene_gefrierboxen_l:36,getrennt_ausgewiesen:true},expect:{kuehlfach_reserve_l:12,gefrierfach_reserve_l:-8,status:'fachbedarf_nicht_gedeckt'}},
  },
  {
    name:'spuelmaschine_tassenbestand_vor_servieren',
    description:'Vor einer Mahlzeit verfügbares Geschirr mit einer laufenden Ladung anhand der beobachteten Zeitreserve planen — Determine likely clean place settings available from existing stock and the current wash.',
    page:appliances,
    properties:{
      benoetigte_tassen:count('Für den Termin benötigte Tassen.'),
      bereits_sauber:count('Aktuell verfügbare saubere Tassen.'),
      im_lauf:count('Weitere Tassen im bereits laufenden Programm.'),
      restlauf_min:minutes('Abgelesene oder selbst beobachtete Restlaufzeit.'),
      ausraeumen_min:minutes('Eigene eingeplante Zeit vom Laufende bis zur Verfügbarkeit.'),
      bis_servieren_min:minutes('Verbleibende Zeit bis zum Bedarf.'),
    },
    calculate({benoetigte_tassen,bereits_sauber,im_lauf,restlauf_min,ausraeumen_min,bis_servieren_min}){
      whole(benoetigte_tassen,bereits_sauber,im_lauf);
      const gap=bis_servieren_min-restlauf_min-ausraeumen_min;
      const available=bereits_sauber+(gap>=0?im_lauf:0);
      return {zeitreserve_min:round(gap),eingeplante_verfuegbare_tassen:available,
        noch_fehlende_tassen:Math.max(0,benoetigte_tassen-available),
        grenze:'Gilt für die eingegebene Restzeit und setzt voraus, dass das Geschirr anschließend für den geplanten Zweck nutzbar ist.'};
    },
    example:{args:{benoetigte_tassen:10,bereits_sauber:6,im_lauf:7,restlauf_min:26,ausraeumen_min:5,bis_servieren_min:29},expect:{zeitreserve_min:-2,eingeplante_verfuegbare_tassen:6,noch_fehlende_tassen:4}},
  },
  {
    name:'spuelmaschine_eco_sperrzeit_budget',
    description:'Beobachtete Laufzeiten anhand einer nachfolgenden bewusst freigehaltenen Küchenzeit planen — Compare how far a measured dishwasher cycle would extend into a shared-room no-run interval.',
    page:household,
    properties:{
      start_min:coordinate('Geplanter Start als Minute ab demselben Planbeginn.'),
      eco_dauer_min:minutes('Eigene beobachtete Dauer des gewählten Eco-Programms.'),
      alternative_dauer_min:minutes('Eigene beobachtete Dauer eines zugelassenen alternativen Programms.'),
      sperre_beginnt_min:coordinate('Beginn des freigehaltenen Intervalls.'),
      sperre_endet_min:coordinate('Ende des freigehaltenen Intervalls.'),
    },
    calculate({start_min,eco_dauer_min,alternative_dauer_min,sperre_beginnt_min,sperre_endet_min}){
      if(sperre_beginnt_min>sperre_endet_min) throw new RangeError('Intervall');
      const overlap=duration=>round(Math.max(0,Math.min(start_min+duration,sperre_endet_min)-Math.max(start_min,sperre_beginnt_min)));
      return {eco_ueberschneidung_min:overlap(eco_dauer_min),alternative_ueberschneidung_min:overlap(alternative_dauer_min),
        grenze:'Nur Zeitvergleich vorhandener Programme. Keine Aussage zur Lautstärke, Reinigungswirkung oder Energieersparnis.'};
    },
    example:{args:{start_min:80,eco_dauer_min:135,alternative_dauer_min:90,sperre_beginnt_min:180,sperre_endet_min:240},expect:{eco_ueberschneidung_min:35,alternative_ueberschneidung_min:0}},
  },
  {
    name:'spuelmaschine_teller_tassen_getrennte_engpaesse',
    description:'Bei einer gemischten Beladung den Engpass zwischen vorhandenen Plätzen für Teller und Tassen ermitteln — Identify which space constraint dominates a mixed dishwasher batch plan.',
    page:appliances,
    properties:{
      teller:count('Anzahl der zu verteilenden geeigneten Teller.'),
      tassen:count('Anzahl der zu verteilenden geeigneten Tassen.'),
      teller_pro_ladung:count('Beobachtete Tellerplätze bei bestätigter gleichzeitiger Nutzung.'),
      tassen_pro_ladung:count('Beobachtete Tassenplätze bei bestätigter gleichzeitiger Nutzung.'),
      beide_plaetze_gleichzeitig:flag('Teller- und Tassenplätze lassen sich so gleichzeitig belegen.'),
    },
    calculate({teller,tassen,teller_pro_ladung,tassen_pro_ladung,beide_plaetze_gleichzeitig}){
      whole(teller,tassen,teller_pro_ladung,tassen_pro_ladung);
      if(!beide_plaetze_gleichzeitig||teller>0&&!teller_pro_ladung||tassen>0&&!tassen_pro_ladung){
        return {ladungen:null,engpass:'gemischte_beladung_klaeren'};
      }
      const plates=teller?Math.ceil(teller/teller_pro_ladung):0;
      const cups=tassen?Math.ceil(tassen/tassen_pro_ladung):0;
      return {ladungen:Math.max(plates,cups),engpass:plates>cups?'tellerplaetze':plates<cups?'tassenplaetze':'gleich',
        grenze:'Zählt nur gleichzeitig nutzbare Plätze. Sprühwege, zulässige Teile, Beladung und Reinigungswirkung separat prüfen.'};
    },
    example:{args:{teller:21,tassen:7,teller_pro_ladung:8,tassen_pro_ladung:6,beide_plaetze_gleichzeitig:true},expect:{ladungen:3,engpass:'tellerplaetze'}},
  },
  {
    name:'spuelmaschine_ladung_entnahme_stationen',
    description:'Ausgeräumte Sets einer Ladung auf zwei Verwendungsplätze bis zum nächsten Bedarf verteilen — Plan which of two stations can be restocked from a known batch of usable dishes.',
    page:appliances,
    properties:{
      sets_sauber:count('Tatsächlich für beide Stationen nutzbare Sets aus der Ladung.'),
      bedarf_a:count('Fehlende Sets an Station A.'),
      bedarf_b:count('Fehlende Sets an Station B.'),
      vorrang:choice('Station mit zeitlichem Vorrang laut eigener Planung.', 'A','B'),
    },
    calculate({sets_sauber,bedarf_a,bedarf_b,vorrang}){
      whole(sets_sauber,bedarf_a,bedarf_b);
      const first=Math.min(sets_sauber,vorrang==='A'?bedarf_a:bedarf_b);
      const second=Math.min(sets_sauber-first,vorrang==='A'?bedarf_b:bedarf_a);
      const a=vorrang==='A'?first:second;
      const b=vorrang==='A'?second:first;
      return {an_a:a,an_b:b,fehlend_a:bedarf_a-a,fehlend_b:bedarf_b-b,uebrig:sets_sauber-a-b,
        grenze:'Verteilt nur bereits als nutzbar gezählte Sets zwischen zwei Stationen. Kein Urteil über Reinigungswirkung.'};
    },
    example:{args:{sets_sauber:9,bedarf_a:6,bedarf_b:5,vorrang:'B'},expect:{an_a:4,an_b:5,fehlend_a:2,fehlend_b:0,uebrig:0}},
  },
];
