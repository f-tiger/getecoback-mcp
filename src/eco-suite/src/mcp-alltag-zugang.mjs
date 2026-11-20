const humidifier = '/guide/luftbefeuchter-ratgeber.html';
const dehumidifier = '/guide/luftentfeuchter-ratgeber.html';
const hygrometer = '/guide/luftfeuchtigkeit-richtig-messen.html';
const thermostat = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
const fan = '/guide/ventilator-kaufen-ratgeber.html';
const wet = '/guide/saugwischer-kaufberatung.html';
const robot = '/guide/saugroboter-kaufberatung.html';
const workshop = '/familienwerkstatt.html';
const household = '/guide/strom-sparen-haushalt.html';
const filters = '/ersatzfilter.html';
const drying = '/guide/waesche-trocknen-wohnung.html';
const number = (description,minimum,maximum) => ({type:'number',description,minimum,maximum});
const flag = description => ({type:'boolean',description});
const select = (description,...values) => ({type:'string',description,enum:values});
const cm = (description, minimum=0) => number(description,minimum,1000);
const minutes = description => number(description,0,1440);
const whole = (description,maximum=100) => number(description,0,maximum);
const round = x => Math.round(x*1000)/1000 || 0;
function integers(...values) {
  if (values.some(value=>!Number.isInteger(value))) throw new RangeError('Ganze Anzahl erforderlich');
}

export const alltagZugang = [
  {
    name:'hygrometer_anzeige_vom_sitzplatz',
    description:'Zwei Displayhöhen anhand des tatsächlichen Sitzplatzes vergleichen — Compare two hygrometer display positions from the usual reading seat.',
    page:hygrometer,
    properties:{
      augenhoehe_cm:cm('Augenhöhe am üblichen Sitzplatz in cm.'),
      waagerechter_abstand_cm:cm('Waagerechter Abstand zum Display in beiden Positionen in cm.',1),
      display_a_cm:cm('Höhe der Anzeigemitte bei Position A in cm.'),
      display_b_cm:cm('Höhe der Anzeigemitte bei Position B in cm.'),
    },
    calculate({augenhoehe_cm,waagerechter_abstand_cm,display_a_cm,display_b_cm}) {
      const angle = height => Math.atan2(height-augenhoehe_cm,waagerechter_abstand_cm)*180/Math.PI;
      const a=angle(display_a_cm), b=angle(display_b_cm);
      return {
        blickwinkel_a_grad:round(a),
        blickwinkel_b_grad:round(b),
        naeher_an_waagerechter_sicht:Math.abs(a)===Math.abs(b)?'gleich':Math.abs(a)<Math.abs(b)?'a':'b',
        hinweis:'Geometrie für einen senkrechten Bildschirm. Kontrast, Schriftgröße und Spiegelung selbst prüfen. Das Hygrometer am repräsentativen Messort lassen.',
      };
    },
    example:{args:{augenhoehe_cm:120,waagerechter_abstand_cm:100,display_a_cm:20,display_b_cm:120},expect:{blickwinkel_a_grad:-45,blickwinkel_b_grad:0,naeher_an_waagerechter_sicht:'b'}},
  },
  {
    name:'hygrometer_minmax_ablesen_uebergabe',
    description:'Nach der Ableseübergabe klären, zu welchem Zeitraum ein Min-Max-Wert gehört — Identify whether a minimum or maximum can be assigned to the intended observation window.',
    page:hygrometer,
    properties:{
      fensterbeginn_min:minutes('Beobachtungsbeginn in Minuten seit Tagesbeginn.'),
      ruecksetzung_min:minutes('Letztes protokolliertes Zurücksetzen am selben Tag, bei unbekanntem Zeitpunkt 0.'),
      ablesung_min:minutes('Ablesung am selben Tag in Minuten seit Tagesbeginn.'),
      ruecksetzung_bekannt:flag('Rücksetzung und Zeitpunkt wurden tatsächlich dokumentiert?'),
    },
    calculate({fensterbeginn_min,ruecksetzung_min,ablesung_min,ruecksetzung_bekannt}) {
      if (ablesung_min<fensterbeginn_min || (ruecksetzung_bekannt && ruecksetzung_min>ablesung_min)) throw new RangeError('Zeiten widersprechen sich');
      return {
        beobachtungsdauer_min:round(ablesung_min-fensterbeginn_min),
        min_max_fenster:ruecksetzung_bekannt
          ? (ruecksetzung_min===fensterbeginn_min?'gleiches_fenster':ruecksetzung_min<fensterbeginn_min?'enthaelt_fruehere_werte':'anfang_fehlt')
          :'unbekannt',
        naechste_uebergabe:'Reset, Zeitpunkt und Min/Max-Werte zusammen notieren. Bedienung laut Anleitung prüfen.',
      };
    },
    example:{args:{fensterbeginn_min:480,ruecksetzung_min:540,ablesung_min:720,ruecksetzung_bekannt:true},expect:{beobachtungsdauer_min:240,min_max_fenster:'anfang_fehlt'}},
  },
  {
    name:'saugwischer_bedienphasen_pausenfenster',
    description:'Abschnitte einer Wischrunde mit der selbst gewünschten Pausenlänge abgleichen — Find which active stages exceed a household’s chosen uninterrupted-work window.',
    page:wet,
    properties:{
      vorbereiten_min:minutes('Gemessene aktive Zeit zum Bereitstellen.'),
      wischabschnitt_min:minutes('Längster tatsächlich zusammenhängender Wischabschnitt.'),
      nachpflege_min:minutes('Längster nicht aufgeteilter aktiver Pflegeabschnitt laut Ablauf.'),
      eigenes_zeitfenster_min:minutes('Selbst gewünschte maximale zusammenhängende Dauer, in Minuten.'),
    },
    calculate({vorbereiten_min,wischabschnitt_min,nachpflege_min,eigenes_zeitfenster_min}) {
      const phases={vorbereitung:vorbereiten_min,wischen:wischabschnitt_min,nachpflege:nachpflege_min};
      return {
        laengster_abschnitt_min:Math.max(...Object.values(phases)),
        verschiebbare_planung_pruefen:Object.entries(phases).filter(([,m])=>m>eigenes_zeitfenster_min).map(([phase])=>phase),
        hinweis:'Den Wischweg in tatsächlich trennbare Abschnitte teilen oder Pflege mit einer zweiten Person organisieren. Vorrang haben die Pflegevorgaben und der sichere Zwischenzustand laut Anleitung.',
      };
    },
    example:{args:{vorbereiten_min:4,wischabschnitt_min:14,nachpflege_min:6,eigenes_zeitfenster_min:10},expect:{laengster_abschnitt_min:14,verschiebbare_planung_pruefen:['wischen']}},
  },
  {
    name:'saugwischer_griffwechsel_routine',
    description:'Häufige Griffwechsel zweier Bedienabläufe anhand einer eigenen Proberunde vergleichen — Compare observed grip changes during two wet-cleaner control layouts.',
    page:wet,
    properties:{
      wechsel_a:whole('Griffwechsel bei Ablauf A in einer vergleichbaren vollständigen Nutzung.'),
      wechsel_b:whole('Griffwechsel bei Ablauf B in derselben Aufgabe.'),
      runden_woche:whole('Geplante vergleichbare Runden pro Woche.'),
      gleiche_aufgabe:flag('War derselbe Bedienablauf vollständig berücksichtigt, etwa Start, Modi und Stopp?'),
    },
    calculate({wechsel_a,wechsel_b,runden_woche,gleiche_aufgabe}) {
      integers(wechsel_a,wechsel_b,runden_woche);
      return {
        differenz_b_minus_a_pro_woche:gleiche_aufgabe?(wechsel_b-wechsel_a)*runden_woche:null,
        bedienschritte_vergleichbar:gleiche_aufgabe,
        hinweis:'Gezählte Wechsel beschreiben den ausprobierten Handgriff. Anleitung und geeignete Handhabung direkt am Gerät prüfen; keine Freigabe für einhändige Benutzung.',
      };
    },
    example:{args:{wechsel_a:5,wechsel_b:2,runden_woche:3,gleiche_aufgabe:true},expect:{differenz_b_minus_a_pro_woche:-9,bedienschritte_vergleichbar:true}},
  },
  {
    name:'saugwischer_tanklast_vor_nach_entleeren',
    description:'Eigene Leer- und Vollmessungen für die Handhabung eines abnehmbaren Tanks nebeneinanderstellen — Compare the measured empty and loaded mass of a removable wet-cleaner tank.',
    page:wet,
    properties:{
      tank_leer_kg:number('Leergewicht des entnommenen Tanks auf deiner Waage in kg.',0.01,20),
      tank_befuellt_kg:number('Gewicht desselben Tanks mit dem üblichen Inhalt in kg.',0.01,20),
      gleiche_teile:flag('Gleicher Tank und Deckel wurden beide Male auf derselben Waage gewogen?'),
    },
    calculate({tank_leer_kg,tank_befuellt_kg,gleiche_teile}) {
      if (gleiche_teile && tank_befuellt_kg<tank_leer_kg) throw new RangeError('Gefüllter Tank leichter als leerer Tank');
      return {
        inhalt_kg:gleiche_teile?round(tank_befuellt_kg-tank_leer_kg):null,
        massedifferenz_vergleichbar:gleiche_teile,
        hinweis:'Position und Griff nach der Anleitung planen. Die Masse ist ein Vergleich der Behälter; daraus folgt keine individuell tragbare Last.',
      };
    },
    example:{args:{tank_leer_kg:0.6,tank_befuellt_kg:1.2,gleiche_teile:true},expect:{inhalt_kg:0.6,massedifferenz_vergleichbar:true}},
  },
  {
    name:'saugroboter_laufstatus_haushalt_uebergabe',
    description:'Bei der Übergabe zwischen zwei Personen entscheiden, ob ein Roboterlauf noch offen ist — Decide what to hand off after an interrupted or unverified robot run.',
    page:robot,
    properties:{
      status:select('Beobachteter Laufstatus laut passender Anzeige.','beendet','unterbrochen','unbekannt'),
      zielzone_kontrolliert:flag('Wurde die Zielzone nach dem Lauf tatsächlich kontrolliert?'),
      naechster_termin_min:minutes('Wie viele Minuten bleiben bis zur gewünschten Nutzung der Zone?'),
      eigener_kurzcheck_min:minutes('Geschätzte Dauer der Sichtkontrolle oder kurzen Nacharbeit.'),
    },
    calculate({status,zielzone_kontrolliert,naechster_termin_min,eigener_kurzcheck_min}) {
      const endConfirmed=status==='beendet'&&zielzone_kontrolliert;
      return {
        uebergabe:endConfirmed?'ergebnis_bestaetigt':status==='unterbrochen'?'letzten_bekannten_bereich_markieren':'zielzone_vor_neustart_pruefen',
        restzeit_nach_kurzcheck_min:endConfirmed?null:round(naechster_termin_min-eigener_kurzcheck_min),
        hinweis:'Keine automatisch wiederholte Runde aus einem unbekannten Status ableiten. Grund einer Unterbrechung vor einer Fortsetzung klären.',
      };
    },
    example:{args:{status:'unterbrochen',zielzone_kontrolliert:false,naechster_termin_min:20,eigener_kurzcheck_min:7},expect:{uebergabe:'letzten_bekannten_bereich_markieren',restzeit_nach_kurzcheck_min:13}},
  },
  {
    name:'saugroboter_start_ohne_telefon_ersatzplan',
    description:'Einen lokalen Ablauf für einen Roboterlauf ohne verfügbares Telefon planen — Identify documented on-device alternatives when the phone is unavailable.',
    page:robot,
    properties:{
      aufgabe:select('Gewünschte Aktion bei fehlendem Telefon.','alles_saugen','bestimmte_zone','pause'),
      lokaler_start_belegt:flag('Handbuch oder erfolgreicher Test belegt ausdrücklich einen lokalen Start für die ganze vorbereitete Fläche?'),
      lokale_zonenwahl_belegt:flag('Der konkrete Gerätezugang ermöglicht die vorgesehene Zonenwahl vor Ort?'),
      lokale_pause_belegt:flag('Vor-Ort-Pause ist für das Modell nach Anleitung nachgewiesen?'),
    },
    calculate({aufgabe,lokaler_start_belegt,lokale_zonenwahl_belegt,lokale_pause_belegt}) {
      const proven={alles_saugen:lokaler_start_belegt,bestimmte_zone:lokale_zonenwahl_belegt,pause:lokale_pause_belegt}[aufgabe];
      return {
        naechster_schritt:proven?'belegten_lokalen_weg_nutzen':aufgabe==='pause'?'bedienweg_zuverlaessig_klaeren':'manuelle_alternative_oder_verschieben',
        gepruefte_aktion:aufgabe,
        hinweis:'Lokaler Gesamtstart ersetzt keine Zonenwahl. Nur passende Anleitung und vorbereiteten Fahrweg verwenden.',
      };
    },
    example:{args:{aufgabe:'bestimmte_zone',lokaler_start_belegt:true,lokale_zonenwahl_belegt:false,lokale_pause_belegt:true},expect:{naechster_schritt:'manuelle_alternative_oder_verschieben',gepruefte_aktion:'bestimmte_zone'}},
  },
  {
    name:'entfeuchter_tank_zwischenablage_abgleichen',
    description:'Eine vorgesehene Zwischenablage für den entnommenen Tank mit den gemessenen Tankmaßen abgleichen — Check usable shelf dimensions for a removed dehumidifier tank.',
    page:dehumidifier,
    properties:{
      tank_breite_cm:cm('Tatsächliche äußere Breite des abnehmbaren Tanks in seiner vorgesehenen Position.',1),
      tank_tiefe_cm:cm('Tatsächliche äußere Tiefe des Tanks.',1),
      ablage_breite_cm:cm('Frei nutzbare Breite der ebenen Ablage in cm.'),
      ablage_tiefe_cm:cm('Frei nutzbare Tiefe der ebenen Ablage in cm.'),
    },
    calculate({tank_breite_cm,tank_tiefe_cm,ablage_breite_cm,ablage_tiefe_cm}) {
      return {
        rest_breite_cm:round(ablage_breite_cm-tank_breite_cm),
        rest_tiefe_cm:round(ablage_tiefe_cm-tank_tiefe_cm),
        naechster_schritt:ablage_breite_cm<tank_breite_cm||ablage_tiefe_cm<tank_tiefe_cm?'andere_ablage_messen':'stand_und_handabstand_pruefen',
        hinweis:'Reine Maßprüfung. Belastbarkeit, fester Stand, Verschütten und Greifraum vor Ort prüfen. Tankstellung laut Anleitung beachten.',
      };
    },
    example:{args:{tank_breite_cm:24,tank_tiefe_cm:18,ablage_breite_cm:27,ablage_tiefe_cm:16},expect:{rest_breite_cm:3,rest_tiefe_cm:-2,naechster_schritt:'andere_ablage_messen'}},
  },
  {
    name:'entfeuchter_tankmeldung_uebergabe',
    description:'Einen getesteten Empfangsweg für die Tankmeldung festlegen — Assign a checked human handoff when the dehumidifier tank indication is hard to notice.',
    page:dehumidifier,
    properties:{
      ton_bemerkt:flag('War der vorgesehene Ton am üblichen Aufenthaltsort im normalen Zustand tatsächlich zu hören?'),
      sichtmeldung_bemerkt:flag('Wurde die Anzeige am üblichen Kontrollort tatsächlich gesehen?'),
      app_meldung_bemerkt:flag('Wurde eine passende Modellmeldung ohne Betreten des Raums im vorgesehenen Test tatsächlich empfangen?'),
      kontrollabstand_min:minutes('Geplanter Abstand für bewusstes Nachsehen am Gerät, 0 falls noch nicht eingeplant.'),
    },
    calculate({ton_bemerkt,sichtmeldung_bemerkt,app_meldung_bemerkt,kontrollabstand_min}) {
      const observed=[ton_bemerkt&&'ton',sichtmeldung_bemerkt&&'anzeige',app_meldung_bemerkt&&'app'].filter(Boolean);
      return {
        gepruefte_meldewege:observed,
        manuelle_kontrolle_min:kontrollabstand_min||null,
        uebergabe:observed.length?'getesteten_meldeweg_und_zustaendigkeit_notieren':kontrollabstand_min?'manuelles_nachsehen_einplanen':'kontrollweg_festlegen',
        hinweis:'Getestete Meldungen hängen von Türen, Lautstärke und Verbindung ab. Den Tankalarm eingeschaltet lassen. Ein Kontrollabstand ist keine Zusage gegen Überlauf.',
      };
    },
    example:{args:{ton_bemerkt:false,sichtmeldung_bemerkt:false,app_meldung_bemerkt:false,kontrollabstand_min:45},expect:{gepruefte_meldewege:[],manuelle_kontrolle_min:45,uebergabe:'manuelles_nachsehen_einplanen'}},
  },
  {
    name:'entfeuchter_bedienmatrix_ohne_app',
    description:'Für einen gemeinsam genutzten Entfeuchter prüfen, welche konkreten Schritte direkt am Gerät möglich sind — Map which household dehumidifier operations have a verified local control.',
    page:dehumidifier,
    properties:{
      einstellen:flag('Lässt sich das gewünschte Ziel bzw. der gewählte Modus nachweislich vor Ort einstellen?'),
      zustand_lesen:flag('Ist der tatsächliche Zustand vor Ort eindeutig ablesbar?'),
      zeitplan_aendern:flag('Kann die für den Haushalt benötigte Zeitfunktion vor Ort geändert werden?'),
      zeitplan_noetig:flag('Eine Änderung der Zeitfunktion gehört in dieser Situation tatsächlich zur Aufgabe?'),
    },
    calculate({einstellen,zustand_lesen,zeitplan_aendern,zeitplan_noetig}) {
      const missing=[!einstellen&&'ziel_oder_modus',!zustand_lesen&&'zustand',zeitplan_noetig&&!zeitplan_aendern&&'zeitfunktion'].filter(Boolean);
      return {
        ohne_app_offene_aktionen:missing,
        naechster_schritt:missing.length?'offene_aktionen_zur_uebergabe_markieren':'lokale_schritte_kurz_notieren',
        hinweis:'Am genauen Modell prüfen. Die bloße Angabe App oder Timer belegt keine lokale Bedienung einer konkreten Funktion.',
      };
    },
    example:{args:{einstellen:true,zustand_lesen:true,zeitplan_aendern:false,zeitplan_noetig:false},expect:{ohne_app_offene_aktionen:[],naechster_schritt:'lokale_schritte_kurz_notieren'}},
  },
  {
    name:'luftbefeuchter_nachfuellen_kleine_portionen',
    description:'Nachfüllportionen mit einem vorhandenen kleinen Gefäß planen — Calculate hand-carried refill portions when the device instructions permit in-place filling.',
    page:humidifier,
    properties:{
      nachfuellmenge_ml:number('Beabsichtigte Nachfüllmenge unterhalb der Markierung in ganzen ml.',0,10000),
      gefaess_ml:number('Tatsächlich gewählte Füllmenge je Gefäß in ganzen ml.',1,5000),
      vor_ort_freigegeben:flag('Erlaubt die Anleitung der genauen Variante das Befüllen am vorgesehenen Standort?'),
    },
    calculate({nachfuellmenge_ml,gefaess_ml,vor_ort_freigegeben}) {
      integers(nachfuellmenge_ml,gefaess_ml);
      const portions=Math.ceil(nachfuellmenge_ml/gefaess_ml);
      return {
        portionen:vor_ort_freigegeben?portions:null,
        letzte_portion_ml:vor_ort_freigegeben?round(nachfuellmenge_ml-Math.max(0,portions-1)*gefaess_ml):null,
        hinweis:'Füllmarke und Modellanleitung haben Vorrang. Diese Mengenrechnung bewertet weder Greifen noch Tragen.',
      };
    },
    example:{args:{nachfuellmenge_ml:1100,gefaess_ml:400,vor_ort_freigegeben:true},expect:{portionen:3,letzte_portion_ml:300}},
  },
  {
    name:'luftbefeuchter_lokale_regelung_ersatzroutine',
    description:'Für die Übergabe klären, ob ein festes Feuchteziel am Gerät eingestellt oder separat kontrolliert werden muss — Distinguish a local target selector from a simple humidifier output setting.',
    page:humidifier,
    properties:{
      bedienung:select('Wofür gibt es am genauen Modell nachweislich eine lokale Einstellung?','feuchteziel','nur_leistungsstufe','unbekannt'),
      hygrometer_vorhanden:flag('Steht ein separates Hygrometer an einem geeigneten Messort zur Verfügung?'),
      anzeige_zugeordnet:flag('Ist klar, ob die Anzeige Ziel, Messwert oder Leistungsstufe zeigt?'),
    },
    calculate({bedienung,hygrometer_vorhanden,anzeige_zugeordnet}) {
      return {
        uebergabe:bedienung==='unbekannt'||!anzeige_zugeordnet?'anzeige_und_anleitung_klaeren':bedienung==='feuchteziel'?'ziel_und_messwert_getrennt_notieren':hygrometer_vorhanden?'leistungsstufe_und_externen_messwert_notieren':'separaten_messweg_klaeren',
        hinweis:'Leistungsstufe und Raumfeuchte sind verschiedene Angaben. Eine Geräteanzeige am Auslass ist nicht automatisch repräsentativ für den Raum.',
      };
    },
    example:{args:{bedienung:'nur_leistungsstufe',hygrometer_vorhanden:true,anzeige_zugeordnet:true},expect:{uebergabe:'leistungsstufe_und_externen_messwert_notieren'}},
  },
  {
    name:'ventilator_fernbedienung_nutzplaetze',
    description:'Eine Fernbedienung am eigenen Bett und Sitzplatz anhand wiederholter Versuche vergleichen — Compare observed remote-control reception at two usual fan-use positions.',
    page:fan,
    properties:{
      versuche_je_ort:whole('Versuche je Ort unter vergleichbaren Bedingungen, mindestens 1.',30),
      erfolge_a:whole('Erfolgreiche gleiche Befehle von Position A aus.',30),
      erfolge_b:whole('Erfolgreiche gleiche Befehle von Position B aus.',30),
      gleicher_befehl:flag('Befehl, Batteriezustand und Gerätestellung waren jeweils gleich?'),
    },
    calculate({versuche_je_ort,erfolge_a,erfolge_b,gleicher_befehl}) {
      integers(versuche_je_ort,erfolge_a,erfolge_b);
      if (!versuche_je_ort||Math.max(erfolge_a,erfolge_b)>versuche_je_ort) throw new RangeError('Ungültige Versuchszahl');
      return {
        beobachtete_erfolge_a_prozent:gleicher_befehl?round(100*erfolge_a/versuche_je_ort):null,
        beobachtete_erfolge_b_prozent:gleicher_befehl?round(100*erfolge_b/versuche_je_ort):null,
        hinweis:'Nur Stichprobe für diese Plätze. Sichtverbindung und Batteriezustand prüfen; physischen Bedienweg erreichbar halten.',
      };
    },
    example:{args:{versuche_je_ort:5,erfolge_a:5,erfolge_b:3,gleicher_befehl:true},expect:{beobachtete_erfolge_a_prozent:100,beobachtete_erfolge_b_prozent:60}},
  },
  {
    name:'ventilator_stufenwahl_tastendruecke',
    description:'Bei nachweislich zyklischer Lüftersteuerung die Zahl der Tastendrücke bis zur Zielstufe ermitteln — Count presses needed on a documented cyclic fan control.',
    page:fan,
    properties:{
      stufen:whole('Zahl der Positionen im belegten Umlauf ohne separate Aus-Taste.',30),
      aktuell:whole('Aktuelle Position, von 1 bis zur Zahl der Positionen.',30),
      ziel:whole('Gewünschte Position, in derselben Reihenfolge.',30),
      zyklus:flag('Ein Druck schaltet laut Modellanleitung oder direktem Test genau eine Position weiter und springt danach zu 1?'),
    },
    calculate({stufen,aktuell,ziel,zyklus}) {
      integers(stufen,aktuell,ziel);
      if (!stufen||aktuell<1||ziel<1||Math.max(aktuell,ziel)>stufen) throw new RangeError('Position außerhalb des Umlaufs');
      return {
        tastendruecke:zyklus?(ziel-aktuell+stufen)%stufen:null,
        hinweis:'Nur für den tatsächlich bestätigten Umlauf der Bedientaste. Direkttasten, Aus, Moduswechsel und Gedrückthalten können anders funktionieren.',
      };
    },
    example:{args:{stufen:5,aktuell:4,ziel:2,zyklus:true},expect:{tastendruecke:3}},
  },
  {
    name:'ventilator_schwenkbereich_sitzplaetze',
    description:'Die gemessenen Seitenwinkel zweier Sitzplätze mit dem beobachteten Schwenkweg vergleichen — Check whether an observed fan sweep geometrically reaches both chosen seats.',
    page:fan,
    properties:{
      links_grad:number('Beobachtete linke Grenze von der Mitte in Grad.',0,90),
      rechts_grad:number('Beobachtete rechte Grenze von der Mitte in Grad.',0,90),
      platz_a_grad:number('Gemessene Richtung von Sitz A, links negativ und rechts positiv.',-90,90),
      platz_b_grad:number('Gemessene Richtung von Sitz B auf derselben Achse.',-90,90),
    },
    calculate({links_grad,rechts_grad,platz_a_grad,platz_b_grad}) {
      const outside = angle=>Math.max(0,angle-rechts_grad,-links_grad-angle);
      return {
        fehlwinkel_a_grad:round(outside(platz_a_grad)),
        fehlwinkel_b_grad:round(outside(platz_b_grad)),
        hinweis:'Nur geometrischer Schwenkweg. Luftstrom, Entfernung, Hindernisse und persönliche Präferenz separat prüfen.',
      };
    },
    example:{args:{links_grad:25,rechts_grad:40,platz_a_grad:-32,platz_b_grad:30},expect:{fehlwinkel_a_grad:7,fehlwinkel_b_grad:0}},
  },
  {
    name:'thermostat_manuelle_aenderung_ueberlappt_termin',
    description:'Geplantes Ende einer dokumentierten manuellen Sollwertänderung mit der tatsächlichen Nutzungszeit abgleichen — Check whether a documented manual hold covers the intended occupancy window.',
    page:thermostat,
    properties:{
      bis_benoetigt_min:minutes('Gewünschtes Ende der Raum-Nutzung in Minuten seit Tagesbeginn.'),
      bis_thermostat_min:minutes('Laut Geräteanzeige oder Anleitung tatsächliches Ende der laufenden Änderung am gleichen Tag.'),
      rueckkehr_bestaetigt:flag('Ist das Ende bzw. der Rücksprung für diese Modellstellung nachweislich geklärt?'),
    },
    calculate({bis_benoetigt_min,bis_thermostat_min,rueckkehr_bestaetigt}) {
      const diff=rueckkehr_bestaetigt?round(bis_thermostat_min-bis_benoetigt_min):null;
      return {
        minuten_nach_nutzungsende:diff,
        uebergabe:diff===null?'rueckkehr_erst_klaeren':diff<0?'zeitplan_wechselt_vor_nutzungsende':diff>0?'sollwert_haelt_nach_nutzungsende':'zeiten_decken_sich',
        hinweis:'Nur Abgleich zweier Zeiten am selben Tag. Kein Nachweis für erreichte Raumtemperatur oder Einsparungen.',
      };
    },
    example:{args:{bis_benoetigt_min:1140,bis_thermostat_min:1080,rueckkehr_bestaetigt:true},expect:{minuten_nach_nutzungsende:-60,uebergabe:'zeitplan_wechselt_vor_nutzungsende'}},
  },
  {
    name:'thermostat_wechselakku_ladefenster',
    description:'Bei abnehmbaren Herstellerakkus die gleichzeitig zu ladenden Packs und die Gesamtzeit planen — Plan charging batches for a verified removable thermostat battery pack.',
    page:thermostat,
    properties:{
      akkus:whole('Anzahl der gerade zum Laden vorgesehenen gleichen Hersteller-Akkus.'),
      ladeplaetze:whole('Anzahl gleichzeitig nutzbarer dokumentierter Ladeplätze.'),
      ladezeit_pro_runde_min:minutes('Eigene beobachtete Dauer je Charge in Minuten.'),
      abnehmbar_bestaetigt:flag('Genaues Modell, abnehmbare Packs und zulässiges Ladeverfahren sind bestätigt?'),
    },
    calculate({akkus,ladeplaetze,ladezeit_pro_runde_min,abnehmbar_bestaetigt}) {
      integers(akkus,ladeplaetze);
      const batches=abnehmbar_bestaetigt&&ladeplaetze>0?Math.ceil(akkus/ladeplaetze):null;
      return {
        laderunden:batches,
        geplante_ladezeit_min:batches===null?null:round(batches*ladezeit_pro_runde_min),
        hinweis:'Nur für dieselbe dokumentierte Pack-Variante. Nicht wiederaufladbare Batterien nicht einplanen. Modellanleitung zu Ladegerät, Entnahme und Betrieb währenddessen prüfen.',
      };
    },
    example:{args:{akkus:3,ladeplaetze:2,ladezeit_pro_runde_min:90,abnehmbar_bestaetigt:true},expect:{laderunden:2,geplante_ladezeit_min:180}},
  },
  {
    name:'thermostat_kopfzuordnung_raumplan',
    description:'Eindeutige Bezeichnungen für mehrere Heizkörper im selben Zimmer planen — Count thermostat labels missing from a room with multiple radiator heads.',
    page:thermostat,
    properties:{
      koepfe_im_raum:whole('Zahl der tatsächlich vorhandenen Thermostatköpfe im Raum.'),
      eindeutig_markiert:whole('Davon vor Ort und im Verzeichnis eindeutig wiedererkennbare Köpfe.'),
      zimmername_eindeutig:flag('Ist der Name des Raums bei Übergaben eindeutig?'),
    },
    calculate({koepfe_im_raum,eindeutig_markiert,zimmername_eindeutig}) {
      integers(koepfe_im_raum,eindeutig_markiert);
      if (eindeutig_markiert>koepfe_im_raum) throw new RangeError('Mehr Zuordnungen als Heizkörper');
      return {
        fehlende_kopfbezeichnungen:koepfe_im_raum-eindeutig_markiert,
        raumname_klaeren:!zimmername_eindeutig&&koepfe_im_raum>0,
        hinweis:'Für mehrere Köpfe pro Raum unterscheidbare Ortsmerkmale notieren. Eine eigene Bezeichnung ändert keine Gerätezuordnung im System.',
      };
    },
    example:{args:{koepfe_im_raum:3,eindeutig_markiert:1,zimmername_eindeutig:false},expect:{fehlende_kopfbezeichnungen:2,raumname_klaeren:true}},
  },
  {
    name:'schublade_zugriff_hintere_tiefe',
    description:'Für häufig gebrauchte Teile die tatsächlich herausfahrende Tiefe des Auszugs berechnen — Find how much of a drawer stays behind the cabinet front.',
    page:workshop,
    properties:{
      innentiefe_cm:cm('Nutzbare Tiefe innen in der Schublade.',1),
      freiliegend_cm:cm('Bei normaler Öffnung vor der Schrankkante frei sichtbare Tiefe.'),
      teil_hinterkante_cm:cm('Tiefe bis zur hinteren Kante des häufig gebrauchten Teils ab Schubladenvorderkante.'),
    },
    calculate({innentiefe_cm,freiliegend_cm,teil_hinterkante_cm}) {
      if (Math.max(freiliegend_cm,teil_hinterkante_cm)>innentiefe_cm) throw new RangeError('Angabe größer als Innentiefe');
      return {
        verdeckte_tiefe_cm:round(innentiefe_cm-freiliegend_cm),
        fehlender_freier_zugriff_cm:round(Math.max(0,teil_hinterkante_cm-freiliegend_cm)),
        hinweis:'Nur geometrisch verdeckte Tiefe. Hebe- und Greifraum separat prüfen; Auszug nicht gewaltsam über den vorgesehenen Weg öffnen.',
      };
    },
    example:{args:{innentiefe_cm:50,freiliegend_cm:36,teil_hinterkante_cm:43},expect:{verdeckte_tiefe_cm:14,fehlender_freier_zugriff_cm:7}},
  },
  {
    name:'schubladen_markierungen_zuordnen',
    description:'Bei ähnlich aussehenden Fächern fehlende Orientierungsmarken und die gemessene Beschriftungsbreite ermitteln — Plan how many distinct drawer labels are still needed and check the space for a tested label.',
    page:workshop,
    properties:{
      faecher_gesamt:whole('Anzahl der häufig verwechselten Fächer.'),
      eindeutig_markiert:whole('Davon in eigener Zugriffsprobe schon ohne Nachsehen eindeutig erkannt.'),
      freie_frontbreite_cm:cm('Kleinste freie Breite an der vorgesehenen Position auf den übrigen Fronten.'),
      getestete_marke_breite_cm:cm('Breite der ausprobierten visuellen oder tastbaren Marke inklusive eigenem Randbedarf.',1),
    },
    calculate({faecher_gesamt,eindeutig_markiert,freie_frontbreite_cm,getestete_marke_breite_cm}) {
      integers(faecher_gesamt,eindeutig_markiert);
      if (eindeutig_markiert>faecher_gesamt) throw new RangeError('Mehr erkannte Fächer als vorhanden');
      const missing=faecher_gesamt-eindeutig_markiert;
      const reserve=round(freie_frontbreite_cm-getestete_marke_breite_cm);
      return {
        weitere_unterscheidbare_marken:missing,
        breite_reserve_cm:missing>0?reserve:null,
        naechster_schritt:missing===0?'vorhandene_zuordnung_beibehalten':reserve<0?'andere_markenposition_ausprobieren':'unterschiedliche_marken_in_zugriffsprobe_testen',
        hinweis:'Jede verbleibende Verwechslung mit eigener Sicht- oder Tastprobe prüfen. Die Maßrechnung bewertet keine Lesbarkeit oder Haftung. Griff und Auszug frei lassen.',
      };
    },
    example:{args:{faecher_gesamt:6,eindeutig_markiert:2,freie_frontbreite_cm:4,getestete_marke_breite_cm:5},expect:{weitere_unterscheidbare_marken:4,breite_reserve_cm:-1,naechster_schritt:'andere_markenposition_ausprobieren'}},
  },
  {
    name:'kuehlschrank_griffseite_routinenvergleich',
    description:'Zwei vor Ort geprüfte Anordnungen anhand der nötigen Umgehungen am Kühlschrank vergleichen — Compare how often a measured refrigerator door routine requires walking around the door.',
    page:household,
    properties:{
      oeffnungen_pro_tag:whole('Beobachtete Zahl der vergleichbaren täglichen Öffnungen.',200),
      umgehungen_a:whole('Davon nötige Umgehungen bei einer geprüften Anordnung A.',200),
      umgehungen_b:whole('Davon nötige Umgehungen bei einer geprüften Anordnung B.',200),
      gleichtag:flag('Sind Aufteilung, Nutzung und Beobachtungsumfang vergleichbar?'),
    },
    calculate({oeffnungen_pro_tag,umgehungen_a,umgehungen_b,gleichtag}) {
      integers(oeffnungen_pro_tag,umgehungen_a,umgehungen_b);
      if (Math.max(umgehungen_a,umgehungen_b)>oeffnungen_pro_tag) throw new RangeError('Mehr Umgehungen als Öffnungen');
      return {
        umgehungen_b_minus_a_pro_tag:gleichtag?umgehungen_b-umgehungen_a:null,
        hinweis:'Beobachtete Laufwege für diese Anordnung. Türanschlag nur ändern, wenn das genaue Modell es erlaubt; Montage, Lüftungsraum und vollständiges Schließen prüfen.',
      };
    },
    example:{args:{oeffnungen_pro_tag:12,umgehungen_a:6,umgehungen_b:2,gleichtag:true},expect:{umgehungen_b_minus_a_pro_tag:-4}},
  },
  {
    name:'luftreiniger_filterwechsel_anzeige_uebergabe',
    description:'Bei geteilter Pflege einen physischen Filterwechsel getrennt vom Anzeige-Reset übergeben — Distinguish a completed physical replacement from a display reset during care handoff.',
    page:filters,
    properties:{
      tatsaechlich_gewechselt:select('Festgehaltener Status des physischen Filterwechsels.','ja','nein','unbekannt'),
      anzeige_zurueckgesetzt:flag('Hat jemand laut Übergabe die Anzeige zurückgesetzt?'),
      modellhinweis_bestaetigt:flag('Ist die Modellanleitung zum Zurücksetzen bekannt?'),
    },
    calculate({tatsaechlich_gewechselt,anzeige_zurueckgesetzt,modellhinweis_bestaetigt}) {
      const next=tatsaechlich_gewechselt==='unbekannt'?'physischen_status_klaeren':tatsaechlich_gewechselt==='nein'?'stand_pruefen_ohne_wechsel_zu_buchen':!anzeige_zurueckgesetzt?'anzeige_nach_modellanleitung_pruefen':'wechsel_und_anzeige_getrennt_notieren';
      return {
        uebergabe:next,
        anleitung_fehlend:!modellhinweis_bestaetigt,
        hinweis:'Ein Reset beweist keinen physischen Wechsel. Reinigung, Austausch und Anzeige gemäß ihrer eigenen Hinweise dokumentieren.',
      };
    },
    example:{args:{tatsaechlich_gewechselt:'unbekannt',anzeige_zurueckgesetzt:true,modellhinweis_bestaetigt:true},expect:{uebergabe:'physischen_status_klaeren',anleitung_fehlend:false}},
  },
  {
    name:'waeschestaender_leinen_reichweite',
    description:'Nutzbare Leinen für die bevorzugte Arbeitshöhe summieren — Count drying lines inside a self-measured preferred height range.',
    page:drying,
    properties:{
      hoehe_a_cm:cm('Höhe der Leinen in der ersten Ebene.'),
      anzahl_a:whole('Anzahl Leinen in der ersten Ebene.'),
      hoehe_b_cm:cm('Höhe der Leinen in der zweiten Ebene.'),
      anzahl_b:whole('Anzahl Leinen in der zweiten Ebene.'),
      unten_cm:cm('Selbst gewählte untere Grenze für häufige Handgriffe.'),
      oben_cm:cm('Selbst gewählte obere Grenze für häufige Handgriffe.'),
    },
    calculate({hoehe_a_cm,anzahl_a,hoehe_b_cm,anzahl_b,unten_cm,oben_cm}) {
      integers(anzahl_a,anzahl_b);
      if (oben_cm<unten_cm) throw new RangeError('Grenzen nicht aufsteigend');
      const inside=(h,n)=>h>=unten_cm&&h<=oben_cm?n:0;
      const reachable=inside(hoehe_a_cm,anzahl_a)+inside(hoehe_b_cm,anzahl_b);
      return {
        leinen_im_eigenen_bereich:reachable,
        leinen_ausserhalb:anzahl_a+anzahl_b-reachable,
        hinweis:'Nur Höhenvergleich. Tiefe, Abstand, Beladung und stabiler Stand bleiben separat zu prüfen.',
      };
    },
    example:{args:{hoehe_a_cm:95,anzahl_a:8,hoehe_b_cm:155,anzahl_b:6,unten_cm:80,oben_cm:120},expect:{leinen_im_eigenen_bereich:8,leinen_ausserhalb:6}},
  },
  {
    name:'steckdosenleiste_schalter_zugriffsweg',
    description:'Bei einer vorgesehenen schaltbaren Leiste freie Strecke zum vorhandenen Schalter prüfen — Check obstruction-free physical access to an existing switched power strip.',
    page:household,
    properties:{
      freier_weg_cm:cm('Am vorgesehenen Ort gemessene freie Breite im Zugang zum Schalter.'),
      probe_bedarf_cm:cm('In einer trockenen Probe gemessene Breite für den eigenen Handzugriff.',1),
      schalter_sichtbar:flag('Der vorhandene Schalter ist aus der vorgesehenen Zugriffsposition sichtbar?'),
    },
    calculate({freier_weg_cm,probe_bedarf_cm,schalter_sichtbar}) {
      return {
        reserve_zur_probe_cm:round(freier_weg_cm-probe_bedarf_cm),
        zugriff:freier_weg_cm<probe_bedarf_cm?'anderen_zugang_suchen':schalter_sichtbar?'schalterposition_markieren':'sicht_bei_eingeraeumtem_moebel_pruefen',
        hinweis:'Nur Hand- und Sichtzugriff. Keine Beurteilung elektrischer Eignung, Kühlung oder Installation; Herstellerhinweise einhalten.',
      };
    },
    example:{args:{freier_weg_cm:8,probe_bedarf_cm:10,schalter_sichtbar:true},expect:{reserve_zur_probe_cm:-2,zugriff:'anderen_zugang_suchen'}},
  },
];
