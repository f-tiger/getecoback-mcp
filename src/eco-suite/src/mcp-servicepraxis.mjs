const guide = page => '/guide/' + page + '.html';
const radiator = guide('heizkoerper-wird-nicht-warm');
const thermostat = guide('smarte-heizkoerperthermostate-lohnen-sich');
const cooling = guide('mobile-klimaanlage-kuehlt-nicht');
const leak = guide('mobile-klimaanlage-tropft-wasser');
const smell = guide('mobile-klimaanlage-stinkt-schimmel');
const noise = guide('mobile-klimaanlage-zu-laut');
const extraction = guide('luftentfeuchter-zieht-kein-wasser');
const cellar = guide('luftentfeuchter-keller');
const humidifier = guide('luftbefeuchter-ratgeber');
const robot = guide('saugroboter-kaufberatung');
const tineco = guide('tineco-saugt-nicht-mehr');
const purchase = '/geraete-austausch-rechner.html';
const workshop = '/familienwerkstatt.html';
const filters = '/ersatzfilter.html';

const num = (description, minimum, maximum) => ({type:'number',minimum,maximum,description});
const time = description => num(description,0,1440);
const count = description => num(description,0,1000);
const state = (description, ...values) => ({type:'string',enum:values,description});
const yes = description => ({type:'boolean',description});
const round = value => Math.round(value*1000)/1000 || 0;
const omitted = fields => Object.entries(fields).filter(([,exists])=>!exists).map(([field])=>field);
const requireCount = (...values) => {
  if (values.some(value=>!Number.isInteger(value))) throw new RangeError('Anzahl muss ganzzahlig sein.');
};

export const servicepraxis = [
  {
    name:'heizmeldung_raumabdeckung_zusammenfassen',
    description:'Geprüfte und ungeprüfte Räume in einer Heizungsmeldung auseinanderhalten — Summarize coverage of a heating-fault report across rooms.',
    page:radiator,
    properties:{
      relevante_raeume: num('Räume, für die die Meldung gelten soll.',1,100),
      zeitgleich_gemessen:count('Räume mit Messung im gleichen Beobachtungsfenster.'),
      ziel_unterschritten:count('Unter den gemessenen Räumen unter dem jeweiligen Zielwert.'),
      warmwasser_beobachtung:state('Beobachteter Warmwasserzustand.','auffaellig','unauffaellig','unbekannt'),
    },
    calculate({relevante_raeume,zeitgleich_gemessen,ziel_unterschritten,warmwasser_beobachtung}) {
      requireCount(relevante_raeume,zeitgleich_gemessen,ziel_unterschritten);
      if (zeitgleich_gemessen>relevante_raeume || ziel_unterschritten>zeitgleich_gemessen) throw new RangeError('Raumzahlen widersprechen sich.');
      return {
        ungeprueft:relevante_raeume-zeitgleich_gemessen,
        dokumentierter_umfang:zeitgleich_gemessen===0?'keine_raumbeobachtung':zeitgleich_gemessen<relevante_raeume?'teilmenge':'alle_genannten_raeume',
        gemessen_zu_kuehl:ziel_unterschritten,warmwasser_beobachtung,
        hinweis:'Raum, Zeitpunkt und Einstellung separat an die zuständige Stelle geben. Die Zahl grenzt den Bericht ein, sie ermittelt keine Ursache.',
      };
    },
    example:{args:{relevante_raeume:5,zeitgleich_gemessen:3,ziel_unterschritten:2,warmwasser_beobachtung:'unbekannt'},expect:{ungeprueft:2,dokumentierter_umfang:'teilmenge',gemessen_zu_kuehl:2}},
  },
  {
    name:'heizmeldung_sollwertzeit_messbezug',
    description:'Prüfen, ob ein gemeldeter Raumwert zu dem damals eingestellten Heizprogramm gehört — Reconcile an indoor reading with the active heating setpoint.',
    page:radiator,
    properties:{
      beobachtung_min:time('Messzeit als Minute des beobachteten Tages.'),
      wechsel_min:time('Letzter Sollwertwechsel als Minute desselben Tages.'),
      sollwert_c:num('Zur Messung angenommener Sollwert in °C.',5,35),
      gemessen_c:num('Gemessene Raumluft in °C.',-5,50),
      programm_abgeglichen:yes('Zeitprogramm und mögliche manuelle Änderung für den Zeitpunkt tatsächlich geprüft?'),
    },
    calculate({beobachtung_min,wechsel_min,sollwert_c,gemessen_c,programm_abgeglichen}) {
      if (wechsel_min>beobachtung_min) throw new RangeError('Sollwertwechsel liegt nach der Messung.');
      return {
        minuten_seit_wechsel:programm_abgeglichen?round(beobachtung_min-wechsel_min):null,
        ist_minus_soll_c:programm_abgeglichen?round(gemessen_c-sollwert_c):null,
        naechster_schritt:programm_abgeglichen?'zeit_und_ergebnis_in_meldung_uebernehmen':'aktives_programm_nachtragen',
        hinweis:'Die Messung beweist keine Aufheizzeit und keinen Defekt. Sollwert, Messzeit und Istwert zusammen dokumentieren.',
      };
    },
    example:{args:{beobachtung_min:490,wechsel_min:450,sollwert_c:21,gemessen_c:18.1,programm_abgeglichen:true},expect:{minuten_seit_wechsel:40,ist_minus_soll_c:-2.9}},
  },
  {
    name:'thermostat_service_zeitplan_wiederherstellung',
    description:'Vor einer vom Hersteller angeordneten Neueinrichtung feststellen, welche Zeitpläne danach überprüft werden müssen — Inventory heating schedules before a support-directed reconfiguration.',
    page:thermostat,
    properties:{
      zeitplaene:count('Anzahl aktuell genutzter Zeitpläne.'),
      export_verifiziert:count('Davon als lesbarer Export geprüft.'),
      von_hand_notiert:count('Zusätzlich ohne Export vollständig notierte Zeitpläne.'),
      manuelle_bedienung_geprueft:yes('Manuelle Bedienmöglichkeit dieses Modells vorab in der Anleitung geklärt?'),
    },
    calculate({zeitplaene,export_verifiziert,von_hand_notiert,manuelle_bedienung_geprueft}) {
      requireCount(zeitplaene,export_verifiziert,von_hand_notiert);
      if (export_verifiziert+von_hand_notiert>zeitplaene) throw new RangeError('Dieselben Zeitpläne nicht doppelt zählen.');
      return {
        noch_zu_sichern:zeitplaene-export_verifiziert-von_hand_notiert,
        nachtagesplan_pruefen:zeitplaene>0,manuelle_bedienung_geprueft,
        hinweis:'Nur Dokumentationshilfe. Wiederherstellung und eventuelle Datenauswirkungen für die konkrete Generation mit dem Hersteller klären.',
      };
    },
    example:{args:{zeitplaene:5,export_verifiziert:2,von_hand_notiert:1,manuelle_bedienung_geprueft:true},expect:{noch_zu_sichern:2,nachtagesplan_pruefen:true}},
  },
  {
    name:'klima_geraeuschmeldung_ausschnitt_abdeckung',
    description:'Vorhandenen Geräuschausschnitt auf Grundbetrieb, Ereignis und Rückkehr prüfen — Check whether an existing clip contains the noise transition and context.',
    page:noise,
    properties:{
      aufnahme_s:num('Länge der vorhandenen Aufnahme in Sekunden.',1,3600),
      geraeusch_start_s:num('Erster beobachteter Geräuschbeginn in der Aufnahme.',0,3600),
      geraeusch_ende_s:num('Beobachtetes oder letztes sichtbares Geräuschende in Sekunden.',0,3600),
      ende_tatsaechlich_erfasst:yes('Ende gehört bzw. im Verlauf tatsächlich festgehalten?'),
    },
    calculate({aufnahme_s,geraeusch_start_s,geraeusch_ende_s,ende_tatsaechlich_erfasst}) {
      if (geraeusch_ende_s<geraeusch_start_s || geraeusch_ende_s>aufnahme_s) throw new RangeError('Zeitmarken passen nicht zur Aufnahme.');
      return {
        vorher_s:round(geraeusch_start_s),dauer_bis_letzter_marke_s:round(geraeusch_ende_s-geraeusch_start_s),
        nachher_s:ende_tatsaechlich_erfasst?round(aufnahme_s-geraeusch_ende_s):null,
        fehlt:[geraeusch_start_s===0 && 'vorlauf',(!ende_tatsaechlich_erfasst || geraeusch_ende_s===aufnahme_s) && 'nachlauf'].filter(Boolean),
        hinweis:'Smartphone-Audio ist kein genormter Schallpegelnachweis. Stimmen, Namen und Gerätekennungen nicht mit übermitteln.',
      };
    },
    example:{args:{aufnahme_s:70,geraeusch_start_s:20,geraeusch_ende_s:60,ende_tatsaechlich_erfasst:true},expect:{vorher_s:20,dauer_bis_letzter_marke_s:40,nachher_s:10,fehlt:[]}},
  },
  {
    name:'klima_wasserspur_betriebszeit_melden',
    description:'Zeitmarke einer vorhandenen Wasserspur mit Lauf und Abschalten vergleichen — Put a documented leak on an appliance operating timeline.',
    page:leak,
    properties:{
      start_min:time('Start des bereits vergangenen Laufs.'),
      stopp_min:time('Ende desselben Laufs.'),
      entdeckt_min:time('Zeitpunkt der ersten Beobachtung, keine angenommene Entstehungszeit.'),
      trockener_anfang_gesehen:yes('Standort unmittelbar vor diesem Lauf sichtbar trocken?'),
    },
    calculate({start_min,stopp_min,entdeckt_min,trockener_anfang_gesehen}) {
      if (start_min>stopp_min) throw new RangeError('Einzelnen zusammenhängenden Tageslauf angeben.');
      return {
        entdeckt:entdeckt_min<start_min?'vor_lauf':entdeckt_min<=stopp_min?'waehrend_lauf':'nach_abschalten',
        minuten_nach_stopp:entdeckt_min>stopp_min?round(entdeckt_min-stopp_min):null,
        entstehungsfenster_eingrenzbar:trockener_anfang_gesehen && entdeckt_min>=start_min,
        hinweis:'Zeitpunkt der Entdeckung ist kein Nachweis der Leckursache. Bereits beobachtete Spuren dokumentieren; ein betroffenes Gerät für diese Meldung nicht erneut einschalten.',
      };
    },
    example:{args:{start_min:420,stopp_min:480,entdeckt_min:495,trockener_anfang_gesehen:true},expect:{entdeckt:'nach_abschalten',minuten_nach_stopp:15}},
  },
  {
    name:'klima_geruchsmeldung_raum_und_betriebsphase',
    description:'In einer Geruchsmeldung zwischen Beobachtungen im Raum und an der laufenden Klimaanlage unterscheiden — Use prior on/off observations to prepare a non-diagnostic odour report.',
    page:smell,
    properties:{
      vorher:state('Beobachtung im Raum vor dem bereits vergangenen Lauf.','riechbar','nicht_riechbar','nicht_beobachtet'),
      waehrend:state('Beobachtungsort während des bereits vergangenen Laufs.','geraetenah','nur_raum','nicht_eindeutig'),
      nach_stopp:state('Beobachtung während einer protokollierten Pause.','riechbar','nicht_riechbar','nicht_beobachtet'),
      raumbedingungen_geaendert:yes('Gab es gleichzeitig eine andere Raumnutzung oder eine geänderte Lüftung?'),
    },
    calculate({vorher,waehrend,nach_stopp,raumbedingungen_geaendert}) {
      return {
        auffaelligkeit_vor_lauf:vorher==='nicht_beobachtet'?null:vorher==='riechbar',
        phase_am_geraet_erfasst:waehrend==='geraetenah',
        pause_dokumentiert:nach_stopp!=='nicht_beobachtet',
        geeigneter_vergleich:vorher!=='nicht_beobachtet'&&nach_stopp!=='nicht_beobachtet'&&!raumbedingungen_geaendert,
        hinweis:'Geruchsort und Betriebsphase für die Meldung trennen. Die Beobachtung belegt weder eine Quelle noch Schimmel. Gerät bei anhaltender Auffälligkeit nicht für eine neue Probe laufen lassen.',
      };
    },
    example:{args:{vorher:'nicht_riechbar',waehrend:'geraetenah',nach_stopp:'nicht_beobachtet',raumbedingungen_geaendert:false},expect:{auffaelligkeit_vor_lauf:false,phase_am_geraet_erfasst:true,pause_dokumentiert:false,geeigneter_vergleich:false}},
  },
  {
    name:'klima_service_modus_laufabgleich',
    description:'Zwei bereits notierte Klimageräteläufe nach Modus und Zieltemperatur gegenüberstellen — Identify whether a reported mode or setpoint was changed between observed runs.',
    page:cooling,
    properties:{
      normaler_modus:state('Modus während des früheren Referenzlaufs.','kuehlen','lueften','entfeuchten','unbekannt'),
      auffaelliger_modus:state('Modus während des späteren beobachteten Laufs.','kuehlen','lueften','entfeuchten','unbekannt'),
      soll_vorher_c:num('Notierter Sollwert des Referenzlaufs in °C.',5,50),
      soll_nachher_c:num('Notierter Sollwert des gemeldeten Laufs in °C.',5,50),
      sollwerte_belegt:yes('Beide Sollwerte zur jeweiligen Zeit dokumentiert?'),
    },
    calculate({normaler_modus,auffaelliger_modus,soll_vorher_c,soll_nachher_c,sollwerte_belegt}) {
      return {
        modus_abweichung:[normaler_modus,auffaelliger_modus].includes('unbekannt')?null:normaler_modus!==auffaelliger_modus,
        sollwert_aenderung_c:sollwerte_belegt?round(soll_nachher_c-soll_vorher_c):null,
        hinweis:'Geänderte Einstellungen bei der Meldung mit angeben. Gleicher Modus und Sollwert sind allein kein Nachweis gleicher Aufstellung oder Leistung.',
      };
    },
    example:{args:{normaler_modus:'kuehlen',auffaelliger_modus:'lueften',soll_vorher_c:20,soll_nachher_c:23,sollwerte_belegt:true},expect:{modus_abweichung:true,sollwert_aenderung_c:3}},
  },
  {
    name:'entfeuchter_abtauzeit_im_protokoll',
    description:'Laufzeit mit belegter Abtauanzeige getrennt von unbekannten Unterbrechungen erfassen — Separate logged defrost time from unexplained periods in a service report.',
    page:extraction,
    properties:{
      protokoll_min:num('Länge des vorhandenen Protokolls in Minuten.',1,1440),
      abtauanzeige_min:time('Zeit mit für dieses Modell bestätigter Abtauanzeige.'),
      unklar_min:time('Zusätzliche Minuten ohne belastbar bekannten Betriebszustand.'),
      anzeige_belegt:yes('Zuordnung der Anzeige zum Abtauen in der Modellanleitung bestätigt?'),
    },
    calculate({protokoll_min,abtauanzeige_min,unklar_min,anzeige_belegt}) {
      if (abtauanzeige_min+unklar_min>protokoll_min) throw new RangeError('Statuszeiten dürfen sich nicht überschneiden.');
      return {
        belegtes_abtauen_prozent:anzeige_belegt?round(100*abtauanzeige_min/protokoll_min):null,
        nicht_zugeordnet_min:round(unklar_min+(anzeige_belegt?0:abtauanzeige_min)),
        sonstige_protokollzeit_min:round(protokoll_min-abtauanzeige_min-unklar_min),
        hinweis:'Die Restzeit ist keine belegte Entfeuchtungszeit. Kein Sollanteil oder Defektgrenzwert; Temperatur und Modell mit angeben.',
      };
    },
    example:{args:{protokoll_min:120,abtauanzeige_min:24,unklar_min:8,anzeige_belegt:true},expect:{belegtes_abtauen_prozent:20,nicht_zugeordnet_min:8,sonstige_protokollzeit_min:88}},
  },
  {
    name:'entfeuchter_ablaufmeldung_schlauchsegmente',
    description:'Vorhandene Hinweise auf sichtbare Ablaufstrecke, Tank oder Pumpe zuordnen — Make a support note that distinguishes observed water paths from unknown sections.',
    page:cellar,
    properties:{
      ablaufart:state('Aktuelle Abführung nach der exakten Anleitung.','tank','gefaelle','pumpe','unbekannt'),
      verbindung_aussen_sichtbar:yes('Anschluss außen ohne Öffnen sichtbar?'),
      wasser_ausserhalb_gefunden:yes('Wasser wurde außen außerhalb des vorgesehenen Wegs beobachtet?'),
      ablaufende_sichtbar:yes('Bei einem Schlauch: Zielende von außen sichtbar?'),
    },
    calculate({ablaufart,verbindung_aussen_sichtbar,wasser_ausserhalb_gefunden,ablaufende_sichtbar}) {
      const strecke = ablaufart==='gefaelle' || ablaufart==='pumpe';
      return {
        dokumentierbare_strecke:strecke ? (verbindung_aussen_sichtbar&&ablaufende_sichtbar?'beide_endpunkte':'nur_teilweise') :
          ablaufart==='tank'?'nur_tankbetrieb':'ablaufart_offen',
        fehlende_nachweise:strecke ? omitted({geraeteanschluss:verbindung_aussen_sichtbar,zielablauf:ablaufende_sichtbar}) : [],
        wasser_ausserhalb_gefunden,
        hinweis:'Sichtbare Endpunkte beweisen weder eine zulässige Förderhöhe noch die Leckquelle. Keine Schlauch- oder Geräteinnenteile für die Meldung öffnen.',
      };
    },
    example:{args:{ablaufart:'pumpe',verbindung_aussen_sichtbar:true,wasser_ausserhalb_gefunden:true,ablaufende_sichtbar:false},expect:{dokumentierbare_strecke:'nur_teilweise',fehlende_nachweise:['zielablauf']}},
  },
  {
    name:'luftbefeuchter_service_bedienanzeigen_abgleich',
    description:'Anzeige am Gerät mit Sollwert und aktivem Modus für die Herstellerfrage dokumentieren — Separate a missing setpoint display from a recorded manual mode.',
    page:humidifier,
    properties:{
      modell:state('Exakte Modellfamilie in der vorhandenen Bedienungsanleitung.','beurer_lb_200','anderes','unbekannt'),
      anzeige:state('Beobachtete Anzeige.','zielwert_leuchtet','kein_zielwert_leuchtet','unleserlich'),
      modus_dokumentiert:yes('Betriebsart in der eigenen Meldung mitnotiert?'),
      lesbare_anleitung:yes('Anzeigeabschnitt für die eigene Variante griffbereit?'),
    },
    calculate({modell,anzeige,modus_dokumentiert,lesbare_anleitung}) {
      return {
        offene_belege:omitted({modell:modell!=='unbekannt',modus:modus_dokumentiert,modellabschnitt:lesbare_anleitung,anzeige:anzeige!=='unleserlich'}),
        wichtiger_hinweis:modell==='beurer_lb_200'&&anzeige==='kein_zielwert_leuchtet'?'fehlende_zielwertanzeige_ist_kein_aus_nachweis':'anzeige_in_modellanleitung_einordnen',
        hinweis:'Anzeige und gewählte Betriebsart vor einer Bewertung zusammen prüfen. Keine Aussage zur Genauigkeit eines Feuchtesensors.',
      };
    },
    example:{args:{modell:'beurer_lb_200',anzeige:'kein_zielwert_leuchtet',modus_dokumentiert:false,lesbare_anleitung:true},expect:{offene_belege:['modus'],wichtiger_hinweis:'fehlende_zielwertanzeige_ist_kein_aus_nachweis'}},
  },
  {
    name:'roboter_service_dockversuche_zaehlen',
    description:'Dokumentierte Anfahrten und vollständig bestätigte Dockvorgänge für den Service trennen — Summarize docking reliability from observed attempts.',
    page:robot,
    properties:{
      beobachtete_anfahrten:num('Anfahrten, die tatsächlich beobachtet wurden.',1,1000),
      docking_bestaetigt:count('Vorgänge mit bestätigtem erfolgreichem Andocken.'),
      endzustand_offen:count('Anfahrten, bei denen der Endzustand nicht beobachtet wurde.'),
      gleiche_station:yes('Unveränderte Station, Bodensituation und relevante Einstellungen?'),
    },
    calculate({beobachtete_anfahrten,docking_bestaetigt,endzustand_offen,gleiche_station}) {
      requireCount(beobachtete_anfahrten,docking_bestaetigt,endzustand_offen);
      const entschiedene=beobachtete_anfahrten-endzustand_offen;
      if (entschiedene<docking_bestaetigt) throw new RangeError('Ergebnisse übersteigen die beobachteten Anfahrten.');
      return {
        erfolg_unter_bekannten_prozent:gleiche_station && entschiedene>0?round(100*docking_bestaetigt/entschiedene):null,
        fehlschlaege_bestaetigt:entschiedene-docking_bestaetigt,endzustand_offen,
        hinweis:'Einstieg, Station und sichtbare Anzeige notieren. Kein Blockieren der Sensoren und keine Ursache aus Prozenten ableiten.',
      };
    },
    example:{args:{beobachtete_anfahrten:10,docking_bestaetigt:6,endzustand_offen:2,gleiche_station:true},expect:{erfolg_unter_bekannten_prozent:75,fehlschlaege_bestaetigt:2}},
  },
  {
    name:'roboter_service_kartenausschnitt_meldung',
    description:'Eines von zwei bereits vorhandenen Kartenbildern anhand der für eine Fehlermeldung sichtbaren Angaben auswählen — Choose a low-detail evidence crop for a navigation issue.',
    page:robot,
    properties:{
      eng_stoerstelle_sichtbar:yes('Im engeren Ausschnitt sind Störstelle und betroffener Streckenabschnitt erkennbar?'),
      eng_zeit_zugeordnet:yes('Engerer Ausschnitt ist dem betroffenen Lauf eindeutig zugeordnet?'),
      weit_nur_noetiges:yes('Der weitere Ausschnitt zeigt ebenfalls nur die für die Meldung erforderlichen Kartenbereiche?'),
      weit_stoerstelle_sichtbar:yes('Im weiteren Ausschnitt sind Störstelle und Streckenabschnitt erkennbar?'),
    },
    calculate({eng_stoerstelle_sichtbar,eng_zeit_zugeordnet,weit_nur_noetiges,weit_stoerstelle_sichtbar}) {
      return {
        auswahl:eng_stoerstelle_sichtbar&&eng_zeit_zugeordnet?'enger_ausschnitt':
          weit_nur_noetiges&&weit_stoerstelle_sichtbar?'weiteren_ausschnitt_lauf_zuordnen':'anonymisierte_skizze_oder_text',
        hinweis:'Datei und Kontodaten bleiben beim Nutzer. Bei Bedarf nur Weg und beobachteten Abbruch skizzieren. Der Ausschnitt ist kein Nachweis der Auslöser.',
      };
    },
    example:{args:{eng_stoerstelle_sichtbar:true,eng_zeit_zugeordnet:true,weit_nur_noetiges:false,weit_stoerstelle_sichtbar:true},expect:{auswahl:'enger_ausschnitt'}},
  },
  {
    name:'saugwischer_service_testlauf_abbruchquote',
    description:'Beobachtete vollständige Durchgänge und Abbrüche nach Herstellerpflege für den Service vergleichen — Compare documented completion rates before and after the recorded care step.',
    page:tineco,
    properties:{
      laeufe_vorher:num('Anzahl protokollierter Durchgänge vor der Pflege.',1,1000),
      abbrueche_vorher:count('Davon vor dem vorgesehenen Ende abgebrochen.'),
      laeufe_nachher:num('Anzahl protokollierter Durchgänge danach.',1,1000),
      abbrueche_nachher:count('Davon vor dem vorgesehenen Ende abgebrochen.'),
      gleiche_aufgabe:yes('Boden, Laufaufgabe, Modus und Definition des Abbruchs vergleichbar?'),
    },
    calculate({laeufe_vorher,abbrueche_vorher,laeufe_nachher,abbrueche_nachher,gleiche_aufgabe}) {
      requireCount(laeufe_vorher,abbrueche_vorher,laeufe_nachher,abbrueche_nachher);
      if (abbrueche_vorher>laeufe_vorher || abbrueche_nachher>laeufe_nachher) throw new RangeError('Abbrüche übersteigen die Zahl der Läufe.');
      return {
        aenderung_abbruchquote_pp:gleiche_aufgabe?round(100*(abbrueche_nachher/laeufe_nachher-abbrueche_vorher/laeufe_vorher)):null,
        abbrueche_nachher, vergleichbar:gleiche_aufgabe,
        hinweis:'Nur vorhandene Beobachtungen auswerten. Abbrüche können verschiedene Gründe haben und belegen weder einen Akku- noch Filterdefekt.',
      };
    },
    example:{args:{laeufe_vorher:8,abbrueche_vorher:4,laeufe_nachher:4,abbrueche_nachher:1,gleiche_aufgabe:true},expect:{aenderung_abbruchquote_pp:-25,abbrueche_nachher:1}},
  },
  {
    name:'luftreiniger_filteranzeige_ereignisse_trennen',
    description:'Vorhandene Hinweise an Einbau, dokumentierten Bedienvorgang und erneut sichtbare Meldung knüpfen — Reconstruct a filter indicator timeline without inferring a replacement need.',
    page:filters,
    properties:{
      einbau_min:time('Zeitmarke des bereits erfolgten Einbaus.'),
      hinweis_min:time('Zeitmarke des danach beobachteten Hinweises.'),
      schritt_dokumentiert:yes('Ein vorgesehener Bedienvorgang wurde dokumentiert?'),
      schritt_min:time('Dessen Zeitmarke, bei fehlender Dokumentation 0.'),
    },
    calculate({einbau_min,hinweis_min,schritt_dokumentiert,schritt_min}) {
      if (hinweis_min<einbau_min || (schritt_dokumentiert && schritt_min<einbau_min)) throw new RangeError('Reihenfolge ab Einbau prüfen.');
      return {
        seit_einbau_min:round(hinweis_min-einbau_min),
        hinweis_zum_bedienvorgang:!schritt_dokumentiert?'unbekannt':hinweis_min<schritt_min?'davor':hinweis_min>schritt_min?'danach':'gleicher_zeitpunkt',
        hinweis:'Eine Anzeige ist keine direkte Messung des Filterzustands. Modell und genauen Bedienvorgang nach Anleitung prüfen, statt einen Zähler pauschal zurückzusetzen.',
      };
    },
    example:{args:{einbau_min:480,hinweis_min:690,schritt_dokumentiert:true,schritt_min:500},expect:{seit_einbau_min:210,hinweis_zum_bedienvorgang:'danach'}},
  },
  {
    name:'geraet_service_mehrere_aenderungen_einordnen',
    description:'Nach einer Reparatur erkennen, ob eine Verbesserung einem einzelnen dokumentierten Eingriff zugeordnet werden kann — Flag confounding service changes before claiming a cause.',
    page:purchase,
    properties:{
      service_schritte:count('Anzahl unterschiedlicher dokumentierter Arbeiten im betrachteten Zeitraum.'),
      schritte_bis_erster_veraenderung:count('Davon vor der ersten notierten Verbesserung erledigt.'),
      zeitfolge_belegt:yes('Bearbeitung und Beobachtung zeitlich nachvollziehbar?'),
      bedingungen_geaendert:yes('Aufgabe, Einstellungen oder wesentliche Umgebungsbedingungen auch verändert?'),
    },
    calculate({service_schritte,schritte_bis_erster_veraenderung,zeitfolge_belegt,bedingungen_geaendert}) {
      requireCount(service_schritte,schritte_bis_erster_veraenderung);
      if (schritte_bis_erster_veraenderung>service_schritte) throw new RangeError('Teilmenge übersteigt die Arbeiten.');
      return {
        auswertung:!zeitfolge_belegt?'chronologie_offen':bedingungen_geaendert||schritte_bis_erster_veraenderung>1?'mehrere_einfluesse':
          schritte_bis_erster_veraenderung===1?'ein_schritt_zeitlich_vorangegangen':'keine_arbeit_vor_beobachtung',
        hinweis:'Auch zeitliche Reihenfolge liefert keinen Kausalnachweis. Für die Behalten-oder-Ersetzen-Entscheidung dieselbe tatsächliche Aufgabe vergleichen.',
      };
    },
    example:{args:{service_schritte:3,schritte_bis_erster_veraenderung:2,zeitfolge_belegt:true,bedingungen_geaendert:false},expect:{auswertung:'mehrere_einfluesse'}},
  },
  {
    name:'ersatzfilter_lieferung_verbaute_menge_abgleichen',
    description:'Bestätigten Vorrat nach Lieferung, Einbau und ungeklärten Filterstücken neu abstimmen — Reconcile physically verified usable spare filter inventory after partial delivery.',
    page:filters,
    properties:{
      start_stueck:count('Passende, unbenutzte Ausgangsmenge.'),
      geliefert_passend:count('Seitdem gelieferte und als passend bestätigte Stücke.'),
      eingebaut:count('Seitdem verbaute Stücke aus diesem Vorrat.'),
      ungeklaert_geliefert:count('Zusätzlich gelieferte Stücke, deren Ausführung noch ungeklärt ist.'),
    },
    calculate({start_stueck,geliefert_passend,eingebaut,ungeklaert_geliefert}) {
      requireCount(start_stueck,geliefert_passend,eingebaut,ungeklaert_geliefert);
      if (eingebaut>start_stueck+geliefert_passend) throw new RangeError('Einbaumenge übersteigt bestätigten Vorrat.');
      return {
        bestaetigter_vorrat:start_stueck+geliefert_passend-eingebaut,ungeklaert:ungeklaert_geliefert,
        hinweis:'Nur bestätigte genaue Varianten zählen. Ungeklärte Stücke getrennt halten; eine Händlerbezeichnung ist kein Herstellerbeleg.',
      };
    },
    example:{args:{start_stueck:1,geliefert_passend:2,eingebaut:1,ungeklaert_geliefert:1},expect:{bestaetigter_vorrat:2,ungeklaert:1}},
  },
  {
    name:'ersatzteil_service_offene_positionen_lieferbeleg',
    description:'Fehlende und ungeklärte Positionen einer Herstellerliste für eine Teileanfrage getrennt zählen — Reconcile documented required part lines for an existing appliance.',
    page:tineco,
    properties:{
      positionen:count('Benötigte Positionen der konkreten angefragten Herstellerliste.'),
      vorhanden_bestaetigt:count('Positionen mit richtiger Ausführung und vollständiger Stückzahl.'),
      vorhanden_unklar:count('Physisch vorhandene Positionen mit ungeklärter Teilenummer oder Menge.'),
      liste_bestaetigt:yes('Zur exakten Modellvariante passende Liste bestätigt?'),
    },
    calculate({positionen,vorhanden_bestaetigt,vorhanden_unklar,liste_bestaetigt}) {
      requireCount(positionen,vorhanden_bestaetigt,vorhanden_unklar);
      if (vorhanden_bestaetigt+vorhanden_unklar>positionen) throw new RangeError('Positionen wurden doppelt gezählt.');
      return {
        fehlt_physisch:liste_bestaetigt?positionen-vorhanden_bestaetigt-vorhanden_unklar:null,
        nachweis_offen:vorhanden_unklar,
        hinweis:'Positionen sind verschiedene Artikelzeilen, keine einzelnen Stücke. Kein Austausch ohne Freigabe und eindeutige Teilenummer.',
      };
    },
    example:{args:{positionen:4,vorhanden_bestaetigt:1,vorhanden_unklar:2,liste_bestaetigt:true},expect:{fehlt_physisch:1,nachweis_offen:2}},
  },
  {
    name:'geraet_service_ergebnis_gegen_auftrag',
    description:'Nach dem Service vereinbarte, bestätigte und erprobte Funktionen getrennt festhalten — Reconcile the requested repair scope with reported work and checked household functions.',
    page:purchase,
    properties:{
      vereinbart:count('Einzeln benannte Aufgaben im Auftrag.'),
      als_erledigt_bestaetigt:count('Davon laut Rückmeldung abgeschlossen.'),
      bestaetigt_und_erprobt:count('Davon zusätzlich in bereits beobachteter eigener Nutzung erprobt.'),
      aufgabe_gleich:yes('Eigene Prüfung mit der ursprünglich vereinbarten Aufgabe vergleichbar?'),
    },
    calculate({vereinbart,als_erledigt_bestaetigt,bestaetigt_und_erprobt,aufgabe_gleich}) {
      requireCount(vereinbart,als_erledigt_bestaetigt,bestaetigt_und_erprobt);
      if (als_erledigt_bestaetigt>vereinbart || bestaetigt_und_erprobt>als_erledigt_bestaetigt) throw new RangeError('Zählmengen liegen nicht ineinander.');
      return {
        ohne_bestaetigung:vereinbart-als_erledigt_bestaetigt,
        bestaetigt_ohne_vergleichbare_erprobung:als_erledigt_bestaetigt-(aufgabe_gleich?bestaetigt_und_erprobt:0),
        hinweis:'Eigenbeobachtung ist keine technische Abnahme. Offene Aufgaben beim Fachbetrieb klären; keine Geräte zerlegen.',
      };
    },
    example:{args:{vereinbart:4,als_erledigt_bestaetigt:3,bestaetigt_und_erprobt:2,aufgabe_gleich:true},expect:{ohne_bestaetigung:1,bestaetigt_ohne_vergleichbare_erprobung:1}},
  },
  {
    name:'geraet_service_leihzeit_anschlussfenster',
    description:'Eine Rückgabefrist für ein vorhandenes Ersatzgerät mit dem bestätigten Übergabefenster abgleichen — Identify a potential service-loaner coverage gap.',
    page:purchase,
    properties:{
      rueckgabe_tag:num('Letzter verfügbarer Tag des Leihgeräts als Tag ab heute.',0,3650),
      uebergabe_frueh_tag:num('Frühester dokumentierter Tag der Geräteübergabe im selben Raster.',0,3650),
      uebergabe_spaet_tag:num('Spätester dokumentierter Übergabetag oder eigene obere Planungsgrenze.',0,3650),
      fenster_bestaetigt:yes('Das Übergabefenster ist vom Service ausdrücklich bestätigt?'),
    },
    calculate({rueckgabe_tag,uebergabe_frueh_tag,uebergabe_spaet_tag,fenster_bestaetigt}) {
      requireCount(rueckgabe_tag,uebergabe_frueh_tag,uebergabe_spaet_tag);
      if (uebergabe_spaet_tag<uebergabe_frueh_tag) throw new RangeError('Übergabefenster ist umgekehrt.');
      return {
        minimale_luecke_tage:Math.max(0,uebergabe_frueh_tag-rueckgabe_tag),
        maximale_geplante_luecke_tage:Math.max(0,uebergabe_spaet_tag-rueckgabe_tag),
        status:fenster_bestaetigt?'bestaetigtes_planungsfenster':'annahme_mit_service_abgleichen',
        hinweis:'Abstand der Tagesgrenzen, ohne Uhrzeit am Übergabetag. Die tatsächliche Verfügbarkeit und Eignung des Leihgeräts separat klären.',
      };
    },
    example:{args:{rueckgabe_tag:9,uebergabe_frueh_tag:8,uebergabe_spaet_tag:12,fenster_bestaetigt:true},expect:{minimale_luecke_tage:0,maximale_geplante_luecke_tage:3}},
  },
  {
    name:'werkstatt_probestueck_passbereich_streuung',
    description:'Die Spannweite mehrerer bereits vermessener ungefährlicher Probestücke mit einem gewählten Passbereich abgleichen — Compare variation of organizer prototypes with user-measured target bounds.',
    page:workshop,
    properties:{
      untergrenze_mm:num('Untere selbst festgelegte Zielabmessung in mm.',0.1,1000),
      obergrenze_mm:num('Obere selbst festgelegte Zielabmessung in mm.',0.1,1000),
      kleinstes_mm:num('Kleinster Messwert der Probestücke in mm.',0.1,1000),
      groesstes_mm:num('Größter Messwert der Probestücke in mm.',0.1,1000),
      stuecke:num('Anzahl einzeln vermessener Probestücke.',2,200),
    },
    calculate({untergrenze_mm,obergrenze_mm,kleinstes_mm,groesstes_mm,stuecke}) {
      requireCount(stuecke);
      if (untergrenze_mm>obergrenze_mm || kleinstes_mm>groesstes_mm) throw new RangeError('Grenzen bzw. Messwerte sind vertauscht.');
      return {
        gemessene_spannweite_mm:round(groesstes_mm-kleinstes_mm),
        stichprobe_im_ziel:kleinstes_mm>=untergrenze_mm && groesstes_mm<=obergrenze_mm,
        hinweis:'Gilt nur für diese vermessenen einfachen Organizer-Proben. Ohne Aussagen über Materialfestigkeit, künftige Teile oder sicherheitskritische Passung.',
      };
    },
    example:{args:{untergrenze_mm:19.9,obergrenze_mm:20.1,kleinstes_mm:19.85,groesstes_mm:20.05,stuecke:4},expect:{gemessene_spannweite_mm:0.2,stichprobe_im_ziel:false}},
  },
  {
    name:'maehroboter_service_passage_ereignisstelle',
    description:'Wiederkehrende Haltepunkte in einer bestehenden Passage auf eine Beobachtungszone eingrenzen — Locate a repeated observed stop for model-specific yard support.',
    page:workshop,
    properties:{
      passage_cm:num('Bereits bekannter Weg von Beginn bis Ende der untersuchten Passage in cm.',1,20000),
      erster_punkt_cm:num('Erster beobachteter Haltepunkt gemessen ab Beginn in cm.',0,20000),
      weiterer_punkt_cm:num('Weiterer beobachteter Haltepunkt ab demselben Beginn in cm.',0,20000),
      selbe_fahrtrichtung:yes('Gab es beide Ereignisse aus derselben Richtung?'),
    },
    calculate({passage_cm,erster_punkt_cm,weiterer_punkt_cm,selbe_fahrtrichtung}) {
      if (Math.max(erster_punkt_cm,weiterer_punkt_cm)>passage_cm) throw new RangeError('Haltepunkt liegt außerhalb der Passage.');
      return {
        zone_von_cm:Math.min(erster_punkt_cm,weiterer_punkt_cm),
        zone_bis_cm:Math.max(erster_punkt_cm,weiterer_punkt_cm),
        gleiche_richtung:selbe_fahrtrichtung,
        hinweis:'Fahrtrichtung, Untergrund und genaue Modelltechnik für die Meldung notieren. Abstände aus einer Anleitung für Begrenzungsdraht gelten nicht für andere Systeme.',
      };
    },
    example:{args:{passage_cm:500,erster_punkt_cm:190,weiterer_punkt_cm:210,selbe_fahrtrichtung:true},expect:{zone_von_cm:190,zone_bis_cm:210,gleiche_richtung:true}},
  },
  {
    name:'klima_service_lose_teile_uebergabe',
    description:'Vom Service bestätigte Zubehörteile einer bestehenden Klimageräteübergabe zuordnen — Decide which loose accessory categories still need explicit handover clarification.',
    page:guide('mobile-klimaanlage-ueberwintern'),
    properties:{
      auftrag_zubehoer:state('Was hat der Service zur Mitgabe schriftlich genannt?','nur_geraet','mit_zubehoer','unbekannt'),
      schlauch_liste:yes('Schlauch in der schriftlichen Liste aufgeführt?'),
      adapter_liste:yes('Adapter in der schriftlichen Liste aufgeführt?'),
      nur_lose_teile:yes('Sämtliches betrachtetes Zubehör bereits lose, ohne Arbeiten am Gerät?'),
    },
    calculate({auftrag_zubehoer,schlauch_liste,adapter_liste,nur_lose_teile}) {
      return {
        klaerung:(!nur_lose_teile || auftrag_zubehoer==='unbekannt')?'lieferumfang_mit_service_klaeren':
          auftrag_zubehoer==='nur_geraet'?'zubehoer_separat_aufbewahren':'nur_gelistetes_zubehoer_zuordnen',
        gelistete_lose_teile:nur_lose_teile&&auftrag_zubehoer==='mit_zubehoer'?
          [schlauch_liste&&'schlauch',adapter_liste&&'adapter'].filter(Boolean):[],
        hinweis:'Nur eine Übergabeliste für bereits lose Teile. Transportlage, Verpackung und Umgang mit montierten Teilen für das konkrete Modell mit dem Service klären.',
      };
    },
    example:{args:{auftrag_zubehoer:'mit_zubehoer',schlauch_liste:true,adapter_liste:false,nur_lose_teile:true},expect:{klaerung:'nur_gelistetes_zubehoer_zuordnen',gelistete_lose_teile:['schlauch']}},
  },
  {
    name:'entfeuchter_service_mengenablesung_spannweite',
    description:'Unsicherheit eines vorhandenen Messgefäß-Werts in die gemeldete Entnahme aufnehmen — Report a bounded collected-water rate from the readable graduation range.',
    page:extraction,
    properties:{
      unten_ml:num('Kleinster plausibler abgelesener Volumenwert in ml.',0,20000),
      oben_ml:num('Größter plausibler abgelesener Volumenwert in ml.',0,20000),
      gemessen_min:num('Gemessene Zeit des dokumentierten Intervalls in Minuten.',1,1440),
      gesamtes_wasser_erfasst:yes('In diesem Intervall nur aus dem Gerät stammendes und vollständig aufgefangenes Wasser?'),
    },
    calculate({unten_ml,oben_ml,gemessen_min,gesamtes_wasser_erfasst}) {
      if (unten_ml>oben_ml) throw new RangeError('Ablesegrenzen sind vertauscht.');
      return {
        beobachtete_l_pro_stunde:gesamtes_wasser_erfasst?[round(unten_ml*0.06/gemessen_min),round(oben_ml*0.06/gemessen_min)]:null,
        ablesespanne_ml:round(oben_ml-unten_ml),
        hinweis:'Nur Intervallwert unter den notierten Bedingungen. Keine Tagesleistung, keine lineare Hochrechnung und kein technischer Grenzwert.',
      };
    },
    example:{args:{unten_ml:150,oben_ml:180,gemessen_min:90,gesamtes_wasser_erfasst:true},expect:{beobachtete_l_pro_stunde:[0.1,0.12],ablesespanne_ml:30}},
  },
  {
    name:'geraet_service_ersatzfunktion_voruebergehend_decken',
    description:'Bei einem geliehenen oder vorhandenen Ersatzgerät einzelne bestätigte Kernfunktionen von offenen Aufgaben trennen — Check temporary task coverage while the original appliance is at service.',
    page:purchase,
    properties:{
      pflichtaufgaben:count('Einzeln erfasste Pflichtaufgaben während der Abwesenheit des Geräts.'),
      ersatz_belegt:count('Davon mit dem Ersatzgerät vergleichbar beobachtet.'),
      vorhandenes_verfahren:count('Zusätzliche Pflichtaufgaben, die ein vorhandenes Verfahren vollständig übernimmt.'),
      mehrarbeit_min:num('Bereits geschätzte Mehrarbeit für alle erfassten Übergangslösungen pro Woche.',0,10080),
    },
    calculate({pflichtaufgaben,ersatz_belegt,vorhandenes_verfahren,mehrarbeit_min}) {
      requireCount(pflichtaufgaben,ersatz_belegt,vorhandenes_verfahren);
      const covered=ersatz_belegt+vorhandenes_verfahren;
      if (covered>pflichtaufgaben) throw new RangeError('Pflichtaufgaben nicht doppelt zuordnen.');
      return {
        pflichtaufgaben_offen:pflichtaufgaben-covered,
        anteil_ueberbrueckt_prozent:pflichtaufgaben>0?round(100*covered/pflichtaufgaben):null,
        zusaetzlicher_aufwand_h_woche:round(mehrarbeit_min/60),
        hinweis:'Nur für die beobachteten Aufgaben und eine vorübergehende Lösung. Geräte können sich bei Leistung, Kapazität und erlaubtem Einsatz unterscheiden.',
      };
    },
    example:{args:{pflichtaufgaben:5,ersatz_belegt:2,vorhandenes_verfahren:2,mehrarbeit_min:90},expect:{pflichtaufgaben_offen:1,anteil_ueberbrueckt_prozent:80,zusaetzlicher_aufwand_h_woche:1.5}},
  },
];
