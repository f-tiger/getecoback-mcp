const method = '/wie-wir-empfehlen.html';
const data = '/daten.html';
const use = '/strommess-protokoll.html';
const replacement = '/geraete-austausch-rechner.html';
const dry = '/guide/luftentfeuchter-keller.html';
const filter = '/guide/luftreiniger-ratgeber.html';
const heating = '/guide/klimaanlage-mit-heizfunktion.html';
const thermostat = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const boolean = description => ({type:'boolean', description});
const select = (description, ...labels) => ({type:'string', description, enum:labels});
const count = description => number(description, 0, 1000000);
const positive = description => number(description, 0.001, 1000000);
const round = value => Math.round(value*1000)/1000;
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Stückzahlen erforderlich');
}

export const belegeAbgleichen = [
  {
    name:'beleg_quellenstamm_zaehlen',
    description:'Eigene Prüfungen und Mehrfachzitate desselben Prüfberichts zählen — Count distinct primary evidence behind repeated citations.',
    page:method,
    properties:{
      fundstellen:count('Zahl der sichtbaren Artikel oder Verweise.'),
      primaerquellen:count('Zahl unterschiedlicher nachverfolgter Primärbelege, ohne Mehrfachzitate.'),
      ungeklaert:count('Zahl der Fundstellen mit noch unbekannter Herkunft.'),
    },
    calculate({fundstellen,primaerquellen,ungeklaert}) {
      whole(fundstellen,primaerquellen,ungeklaert);
      if (primaerquellen+ungeklaert>fundstellen) throw new RangeError('Fundstellen');
      return {nachgewiesene_quellen:primaerquellen, ohne_neuen_nachweis:fundstellen-primaerquellen-ungeklaert,
        herkunft_offen:ungeklaert, grenze:'Unterschiedliche Primärbelege können dieselbe Prüfanordnung oder Datenbasis nutzen.'};
    },
    example:{args:{fundstellen:7,primaerquellen:2,ungeklaert:1},expect:{nachgewiesene_quellen:2,ohne_neuen_nachweis:4}},
  },
  {
    name:'datenblatt_korrektur_widerspruch',
    description:'Zwei widersprüchliche Zahlen nach Modell, Prüfpunkt und ausdrücklicher Korrektur einordnen — Reconcile two numeric specifications using scope and explicit corrections.',
    page:method,
    properties:{
      a:number('Erster Zahlenwert in bereits vereinheitlichter Einheit.',-1000000,1000000),
      b:number('Zweiter Zahlenwert in derselben Einheit.',-1000000,1000000),
      zeile_gleich:boolean('Identisches Modell, dieselbe Messgröße und gleicher Prüfpunkt?'),
      korrektur:select('Welche Zahl ersetzt laut ausdrücklicher Notiz die andere für diese Zeile?', 'a_ersetzt_b','b_ersetzt_a','keine_bestaetigte'),
    },
    calculate({a,b,zeile_gleich,korrektur}) {
      if (!zeile_gleich) return {status:'geltung_klaeren', verwendbarer_wert:null};
      if (a===b) return {status:'uebereinstimmend', verwendbarer_wert:a};
      if (korrektur!=='keine_bestaetigte') return {status:'korrektur_dokumentiert', verwendbarer_wert:korrektur==='a_ersetzt_b'?a:b};
      return {status:'widerspruch_offen', verwendbarer_wert:null,differenz_b_minus_a:round(b-a),
        grenze:'Ein neueres Datum allein weist keine Korrektur nach.'};
    },
    example:{args:{a:210,b:250,zeile_gleich:true,korrektur:'keine_bestaetigte'},expect:{status:'widerspruch_offen',differenz_b_minus_a:40}},
  },
  {
    name:'testfelder_gemeinsame_modelle_abgrenzen',
    description:'Überlappung zweier Testfelder aus exakten Modellvarianten bestimmen — Measure exact-model overlap before comparing two test cohorts.',
    page:method,
    properties:{
      modellzahl_a:count('Anzahl geprüfter Varianten in Testfeld A.'),
      modellzahl_b:count('Anzahl geprüfter Varianten in Testfeld B.'),
      exakt_gemeinsam:count('Anzahl in beiden Feldern exakt identifizierter Varianten.'),
      abgleich_abgeschlossen:boolean('Sind alle Variantenkennungen überprüft?'),
    },
    calculate({modellzahl_a,modellzahl_b,exakt_gemeinsam,abgleich_abgeschlossen}) {
      whole(modellzahl_a,modellzahl_b,exakt_gemeinsam);
      if (exakt_gemeinsam>Math.min(modellzahl_a,modellzahl_b)) throw new RangeError('Schnittmenge');
      return {nur_a:abgleich_abgeschlossen?modellzahl_a-exakt_gemeinsam:null,
        nur_b:abgleich_abgeschlossen?modellzahl_b-exakt_gemeinsam:null,
        gemeinsam_bestaetigt:exakt_gemeinsam, gemeinsame_anzahl_einmalig:abgleich_abgeschlossen?modellzahl_a+modellzahl_b-exakt_gemeinsam:null,
        grenze:'Gemeinsame Modelle machen unterschiedliche Prüfungen oder Gewichtungen nicht vergleichbar.'};
    },
    example:{args:{modellzahl_a:8,modellzahl_b:9,exakt_gemeinsam:3,abgleich_abgeschlossen:true},expect:{nur_a:5,nur_b:6,gemeinsame_anzahl_einmalig:14}},
  },
  {
    name:'produkttest_ausgeschlossene_ergebnisse',
    description:'Im Testbericht fehlende und abgebrochene Messungen im Nenner sichtbar machen — Check a comparison report for omitted or stopped trials.',
    page:method,
    properties:{
      geplant:count('Anzahl laut Bericht eingeplanter Messläufe.'),
      ausgewertet:count('Anzahl mit ausgewertetem Ergebnis.'),
      abgebrochen:count('Anzahl ausdrücklich als abgebrochen dokumentierter, nicht ausgewerteter Läufe.'),
    },
    calculate({geplant,ausgewertet,abgebrochen}) {
      whole(geplant,ausgewertet,abgebrochen);
      if (ausgewertet+abgebrochen>geplant) throw new RangeError('Läufe');
      return {auswertung_prozent:geplant?round(100*ausgewertet/geplant):null,
        abgebrochen, status_ungeklaert:geplant-ausgewertet-abgebrochen,
        grenze:'Fehlende Messwerte weder als erfolgreich noch als null einsetzen.'};
    },
    example:{args:{geplant:10,ausgewertet:8,abgebrochen:1},expect:{auswertung_prozent:80,status_ungeklaert:1}},
  },
  {
    name:'sparaussage_bis_zu_referenzwert',
    description:'Eine maximale Werbe-Ersparnis mit dokumentiertem Bezugswert und eigener Messung einordnen — Interpret an up-to savings claim against its stated baseline.',
    page:'/guide/nachtabsenkung-heizung.html',
    properties:{
      maximal_prozent:number('Beworbene Obergrenze in Prozent.',0,100),
      referenz_kwh:positive('Verbrauch der ausdrücklich zugehörigen Referenz in kWh.'),
      beobachtet_kwh:number('Verbrauch bei der beobachteten Alternative in kWh.',0,1000000),
      bedingungen_gleich:boolean('Gleiche Wärmeaufgabe, Nutzungsdauer und passende Bedingungen belegt?'),
    },
    calculate({maximal_prozent,referenz_kwh,beobachtet_kwh,bedingungen_gleich}) {
      return {beworbene_obergrenze_kwh:round(referenz_kwh*maximal_prozent/100),
        beobachtete_aenderung_referenz_minus_versuch_kwh:bedingungen_gleich?round(referenz_kwh-beobachtet_kwh):null,
        grenze:'Die Obergrenze ist weder ein Mittelwert noch eine Zusage für deinen Haushalt.'};
    },
    example:{args:{maximal_prozent:30,referenz_kwh:40,beobachtet_kwh:37,bedingungen_gleich:true},expect:{beworbene_obergrenze_kwh:12,beobachtete_aenderung_referenz_minus_versuch_kwh:3}},
  },
  {
    name:'folgemodell_messwert_uebernahme',
    description:'Prüfen, wie ein Messwert beim Wechsel zu einer neuen Modellgeneration bezeichnet werden darf — Separate unchanged specifications from measured performance of a successor.',
    page:'/guide/delonghi-pinguino-vergleich.html',
    properties:{
      gen:select('Bezug des ursprünglichen Messprotokolls.', 'genaue_neue_variante','vorgaenger','unbekannt'),
      vergleichspunkt:boolean('Betriebsart und Messbedingungen dokumentiert?'),
      hersteller_uebernahme:boolean('Übernahme genau dieser Spezifikation auf die neue Variante schriftlich dokumentiert?'),
    },
    calculate({gen,vergleichspunkt,hersteller_uebernahme}) {
      return {kennzeichnung:gen==='genaue_neue_variante'&&vergleichspunkt?'messwert_der_neuen_variante'
        :hersteller_uebernahme?'herstellerangabe_zur_uebernahme':'wert_nur_mit_urspruenglicher_variante',
        grenze:'Ein gleicher Name oder eine erklärte Spezifikationsübernahme ersetzt keine neue Messung.'};
    },
    example:{args:{gen:'vorgaenger',vergleichspunkt:true,hersteller_uebernahme:true},expect:{kennzeichnung:'herstellerangabe_zur_uebernahme'}},
  },
  {
    name:'raumdaten_altfeld_verwendung_pruefen',
    description:'Beim Import von EcoBack-Raumdaten veraltete Feuchte- oder Kapazitätsdeutung erkennen — Check old table fields before using sizing data in a new tool.',
    page:data,
    properties:{
      version:select('Formatversion im übernommenen Export.', 'eins','zwei','unbekannt'),
      feld:select('Verwendetes Datenmerkmal.', 'mould_threshold_rh_percent','humidity_review_rh_percent','liters_per_day','btuh_per_sqm'),
      zweck:select('Geplante Weiterverwendung.', 'schimmelgrenze','messanlass','entfeuchter_dimensionieren','orientierung'),
    },
    calculate({version,feld,zweck}) {
      const action=feld==='mould_threshold_rh_percent'?'aktuellen_export_pruefen'
        :zweck==='schimmelgrenze'?'nicht_als_grenze_verwenden'
        :feld==='liters_per_day'?'nur_pruefhinweise_lesen'
        :version!=='zwei'?'version_klaeren'
        :feld==='humidity_review_rh_percent'&&zweck!=='messanlass'?'nur_als_messanlass'
        :feld==='btuh_per_sqm'&&zweck!=='orientierung'?'nur_kuehlorientierung':'im_genannten_rahmen';
      return {aktion:action, datensatz_url:'https://getecoback.com/sizing-data.json',
        grenze:'Faustwerte und Messanlässe sind keine Messwerte oder Schimmelfrei-Garantie.'};
    },
    example:{args:{version:'zwei',feld:'liters_per_day',zweck:'entfeuchter_dimensionieren'},expect:{aktion:'nur_pruefhinweise_lesen'}},
  },
  {
    name:'geraetewechsel_co2_szenario_schwelle',
    description:'Eigene Betriebs- und Herstellungswerte für einen eng abgegrenzten Geräteaustausch vergleichen — Estimate when documented operating emissions could offset extra production emissions.',
    page:replacement,
    properties:{
      ersparnis_kwh_jahr:number('Dokumentierte jährliche Stromersparnis bei gleicher Nutzung in kWh, negatives Vorzeichen bei Mehrverbrauch.',-1000000,1000000),
      betriebsfaktor_kg_kwh:number('Vom Nutzer belegter Emissionsfaktor in kg CO2e je kWh.',0,25),
      mehr_herstellung_kg:number('Zusätzliche dokumentierte Herstellungswirkung des Ersatzes in kg CO2e.',0,1000000),
      jahre:number('Gewählter Zeitraum in Jahren.',0,50),
      grenzen_gleich:boolean('Vergleichbare Aufgabe und kompatible Emissionsgrenzen belegt?'),
    },
    calculate({ersparnis_kwh_jahr,betriebsfaktor_kg_kwh,mehr_herstellung_kg,jahre,grenzen_gleich}) {
      const betriebsersparnis=ersparnis_kwh_jahr*betriebsfaktor_kg_kwh;
      return {jahresschwelle:grenzen_gleich&&betriebsersparnis>0?round(mehr_herstellung_kg/betriebsersparnis):null,
        netto_szenario_kg_co2e:grenzen_gleich?round(betriebsersparnis*jahre-mehr_herstellung_kg):null,
        grenze:'Konstanter eingegebener Faktor; Transport, Wartung und Entsorgung fehlen. Keine vollständige Ökobilanz.'};
    },
    example:{args:{ersparnis_kwh_jahr:100,betriebsfaktor_kg_kwh:0.4,mehr_herstellung_kg:160,jahre:5,grenzen_gleich:true},expect:{jahresschwelle:4,netto_szenario_kg_co2e:40}},
  },
  {
    name:'umweltaussage_stromanteil_abgrenzen',
    description:'Den Anteil des Verbrauchs bestimmen, für den ein eingegebener Strom-Emissionsfaktor belegt ist — Scope an environmental claim to the documented share of electricity use.',
    page:replacement,
    properties:{
      gesamt_kwh:positive('Gesamtstromverbrauch im betrachteten, identischen Zeitraum.'),
      belegt_kwh:number('Davon Verbrauch mit zeitlich und sachlich zugeordnetem Emissionsfaktor.',0,1000000),
      faktor_kg_kwh:number('Eingegebener, zu diesem Teil dokumentierter Faktor in kg CO2e pro kWh.',0,25),
    },
    calculate({gesamt_kwh,belegt_kwh,faktor_kg_kwh}) {
      if (belegt_kwh>gesamt_kwh) throw new RangeError('Teilmenge');
      return {beleganteil_prozent:round(100*belegt_kwh/gesamt_kwh),
        belegter_teil_kg_co2e:round(belegt_kwh*faktor_kg_kwh),
        unbelegter_strom_kwh:round(gesamt_kwh-belegt_kwh),
        grenze:'Fehlende Stromfaktoren sind nicht null. Herstellung und übrige Lebenszyklusphasen sind nicht berücksichtigt.'};
    },
    example:{args:{gesamt_kwh:200,belegt_kwh:140,faktor_kg_kwh:0.3},expect:{beleganteil_prozent:70,belegter_teil_kg_co2e:42,unbelegter_strom_kwh:60}},
  },
  {
    name:'heizwaerme_saisonquotient_aus_abschnitten',
    description:'Abgegebene Wärme und Strom zweier Heizabschnitte zunächst summieren und dann vergleichen — Form a weighted heating performance quotient from matching energy totals.',
    page:heating,
    properties:{
      waerme_a_kwh:number('Gemessene beziehungsweise dokumentierte Nutzwärme im ersten Abschnitt.',0,1000000),
      strom_a_kwh:positive('Zugeordneter Strom im ersten Abschnitt.'),
      waerme_b_kwh:number('Zugeordnete Nutzwärme im zweiten Abschnitt.',0,1000000),
      strom_b_kwh:positive('Zugeordneter Strom im zweiten Abschnitt.'),
      gleiche_grenze:boolean('Nicht überlappende Abschnitte mit gleicher Geräte- und Bilanzgrenze?'),
    },
    calculate({waerme_a_kwh,strom_a_kwh,waerme_b_kwh,strom_b_kwh,gleiche_grenze}) {
      return {quotient_kwh_waerme_pro_kwh_strom:gleiche_grenze?round((waerme_a_kwh+waerme_b_kwh)/(strom_a_kwh+strom_b_kwh)):null,
        stromgewicht_b_prozent:gleiche_grenze?round(100*strom_b_kwh/(strom_a_kwh+strom_b_kwh)):null,
        grenze:'Der Quotient gilt nur für die erfassten Abschnitte und ist kein genormter SCOP.'};
    },
    example:{args:{waerme_a_kwh:40,strom_a_kwh:10,waerme_b_kwh:60,strom_b_kwh:30,gleiche_grenze:true},expect:{quotient_kwh_waerme_pro_kwh_strom:2.5,stromgewicht_b_prozent:75}},
  },
  {
    name:'klimageraet_testbericht_mode_energieanteil',
    description:'Prüfen, welchen Anteil des protokollierten Stroms ein Werbevergleich für einen ausgewählten Modus erfasst — Check how much of the recorded AC energy a single-mode comparison covers.',
    page:'/guide/klimaanlage-stromkosten.html',
    properties:{
      gesamt_kwh:positive('Im Protokoll erfasster Gesamtstrom.'),
      modus_kwh:number('Davon dem ausdrücklich beworbenen Modus zugeordneter Strom.',0,1000000),
      protokoll_vollstaendig:boolean('Stimmen Messzeitraum und Gerät, wurden Umschaltvorgänge und Pausen erfasst?'),
    },
    calculate({gesamt_kwh,modus_kwh,protokoll_vollstaendig}) {
      if (modus_kwh>gesamt_kwh) throw new RangeError('Teilmenge');
      return {modusanteil_prozent:protokoll_vollstaendig?round(100*modus_kwh/gesamt_kwh):null,
        uebriger_aufgenommener_strom_kwh:protokoll_vollstaendig?round(gesamt_kwh-modus_kwh):null,
        grenze:'Ein Modusanteil belegt keine Ersparnis gegenüber einem anderen Gerät.'};
    },
    example:{args:{gesamt_kwh:10,modus_kwh:3,protokoll_vollstaendig:true},expect:{modusanteil_prozent:30,uebriger_aufgenommener_strom_kwh:7}},
  },
  {
    name:'betriebsgeraeusch_raumwechsel_beleg',
    description:'Bewerten, ob der protokollierte Schalldruck am eigenen Hörplatz überhaupt belegt ist — Scope a sound pressure observation to the documented listening placement.',
    page:'/guide/mobile-klimaanlage-zu-laut.html',
    properties:{
      fundstelle:select('Messort des Ausgangswerts.', 'eigener_hoerplatz','anderer_platz_oder_raum','unbekannt'),
      aufstellung:boolean('Entspricht die Aufstellung dem eigenen Szenario?'),
      betriebsphase:boolean('Entspricht die beobachtete Phase dem gewünschten Betrieb einschließlich Kompressor?'),
    },
    calculate({fundstelle,aufstellung,betriebsphase}) {
      return {belegumfang:fundstelle==='eigener_hoerplatz'&&aufstellung&&betriebsphase?'gleicher_hoerplatz_gleiche_phase':'eigene_beobachtung_erforderlich',
        offene_bedingungen:[...(!aufstellung?['aufstellung']:[]),...(!betriebsphase?['betriebsphase']:[])],
        grenze:'Reflexion und Hintergrundgeräusche ändern sich mit dem Raum. Kein Schalldruckwert für einen anderen Platz ableitbar.'};
    },
    example:{args:{fundstelle:'eigener_hoerplatz',aufstellung:true,betriebsphase:false},expect:{belegumfang:'eigene_beobachtung_erforderlich',offene_bedingungen:['betriebsphase']}},
  },
  {
    name:'thermostat_adapter_pruefbeleg_zuordnen',
    description:'Eine dokumentierte Thermostat-Passprobe mit oder ohne Adapter getrennt ausweisen — Separate observed fit with an adapter from direct-fit evidence.',
    page:thermostat,
    properties:{
      ventil_und_kopf_exakt:boolean('Ventil, Kopf und Generation im Protokoll identifiziert?'),
      testaufbau:select('Bei der dokumentierten Passprobe verwendet.', 'mit_adapter','ohne_adapter','unbekannt'),
      adapter_exakt:boolean('Bei Adapterbetrieb genaue Adapterbezeichnung erfasst?'),
    },
    calculate({ventil_und_kopf_exakt,testaufbau,adapter_exakt}) {
      return {belegfassung:!ventil_und_kopf_exakt||testaufbau==='unbekannt'?'pruefaufbau_nachtragen'
        :testaufbau==='ohne_adapter'?'beobachtung_ohne_adapter'
        :adapter_exakt?'beobachtung_mit_identifiziertem_adapter':'adapterbezeichnung_nachtragen',
        grenze:'Eine dokumentierte Passprobe gilt nur für diesen Aufbau und ist keine allgemeine Montagefreigabe.'};
    },
    example:{args:{ventil_und_kopf_exakt:true,testaufbau:'mit_adapter',adapter_exakt:false},expect:{belegfassung:'adapterbezeichnung_nachtragen'}},
  },
  {
    name:'entfeuchter_testpunkte_rangwechsel',
    description:'Vergleichen, ob die Reihenfolge bei zwei geprüften Kellerbedingungen wechselt — Detect rank reversal across two verified dehumidifier test conditions.',
    page:dry,
    properties:{
      a_p1:number('Entzug A am Prüfpunkt 1 in Liter pro Tag.',0,1000), b_p1:number('Entzug B am selben Prüfpunkt 1.',0,1000),
      a_p2:number('Entzug A am Prüfpunkt 2 in Liter pro Tag.',0,1000), b_p2:number('Entzug B am selben Prüfpunkt 2.',0,1000),
      punkte_bestaetigt:boolean('Sind jeweils Temperatur, Feuchte, Prüfablauf und Modellvarianten passend dokumentiert?'),
    },
    calculate({a_p1,b_p1,a_p2,b_p2,punkte_bestaetigt}) {
      if (!punkte_bestaetigt) return {rangwechsel:null,differenz_p1_liter_tag:null,differenz_p2_liter_tag:null};
      const first=a_p1-b_p1, second=a_p2-b_p2;
      return {rangwechsel:(first<0&&second>0)||(first>0&&second<0),
        differenz_p1_liter_tag:round(first),differenz_p2_liter_tag:round(second),
        grenze:'Ein möglicher Wechsel gilt für die zwei Punkte. Keine Interpolation oder Energie-Rangfolge.'};
    },
    example:{args:{a_p1:5,b_p1:4,a_p2:6,b_p2:7,punkte_bestaetigt:true},expect:{rangwechsel:true,differenz_p1_liter_tag:1,differenz_p2_liter_tag:-1}},
  },
  {
    name:'entfeuchter_nennwert_und_messvolumen_scope',
    description:'Bei dokumentiert konstantem Prüfpunkt das tatsächlich erfasste Teilvolumen richtig beschriften — Report captured water without equating a partial collection with a nameplate rating.',
    page:dry,
    properties:{
      gesammelt_l:number('Während der protokollierten Zeit tatsächlich aufgefangenes Wasser in Liter.',0,1000),
      laufzeit_h:positive('Dauer des gesamten Protokollfensters in Stunden einschließlich möglicher Pausen.'),
      nennweg:select('Wie wurde Wasser im Protokoll erfasst?', 'vollstaendig','tank_oder_schlauch_teilweise','ungeklaert'),
      pruefpunkt_stabil:boolean('Temperatur und relative Feuchte waren beim Durchlauf stabil und dokumentiert?'),
    },
    calculate({gesammelt_l,laufzeit_h,nennweg,pruefpunkt_stabil}) {
      return {beobachtet_l:gesammelt_l, beobachtete_rate_l_h:nennweg==='vollstaendig'&&pruefpunkt_stabil?round(gesammelt_l/laufzeit_h):null,
        kennzeichnung:nennweg==='vollstaendig'?'erfasster_versuch':'nur_aufgefangener_teil',
        grenze:'Die stündliche Rate gilt für dieses Zeitfenster, nicht für den gesamten Tag.'};
    },
    example:{args:{gesammelt_l:1.2,laufzeit_h:4,nennweg:'tank_oder_schlauch_teilweise',pruefpunkt_stabil:true},expect:{beobachtet_l:1.2,beobachtete_rate_l_h:null}},
  },
  {
    name:'luftreiniger_cadr_watt_paarbeleg',
    description:'Einen veröffentlichten CADR und die Leistungsaufnahme derselben Betriebsstufe als Quotient einordnen — Compute clean air delivery per watt only for a documented matching mode.',
    page:filter,
    properties:{
      cadr_m3_h:number('Veröffentlichter Partikel-CADR in Kubikmeter pro Stunde.',0,5000),
      leistung_w:positive('Dokumentierte elektrische Leistungsaufnahme in Watt.'),
      stufe_gleich:boolean('Sind beide Werte der gleichen Stufe und dem gleichen Filterzustand zugeordnet?'),
      pruefung_dokumentiert:boolean('Ist der Partikeltest und der dazugehörige Betriebspunkt erkennbar?'),
    },
    calculate({cadr_m3_h,leistung_w,stufe_gleich,pruefung_dokumentiert}) {
      return {cadr_m3_h_pro_w:stufe_gleich&&pruefung_dokumentiert?round(cadr_m3_h/leistung_w):null,
        grenze:'Kein Quotient aus Maximal-CADR und niedrigstem Verbrauch. Partikelwerte belegen keinen Geruchs- oder CO₂-Abbau.'};
    },
    example:{args:{cadr_m3_h:150,leistung_w:30,stufe_gleich:true,pruefung_dokumentiert:true},expect:{cadr_m3_h_pro_w:5}},
  },
  {
    name:'feuchteaenderung_prozentpunkte_ausweisen',
    description:'Eine protokollierte Änderung relativer Raumfeuchte in Prozentpunkten korrekt beschriften — Distinguish relative humidity points from proportional changes and moisture removal.',
    page:'/guide/luftfeuchtigkeit-richtig-messen.html',
    properties:{
      vorher_rh:number('Abgelesene relative Feuchte vorher in Prozent.',0,100),
      nachher_rh:number('Abgelesene relative Feuchte nachher in Prozent.',0,100),
      temperatur_vorher_c:number('Raumtemperatur vorher in Grad Celsius.',-30,65),
      temperatur_nachher_c:number('Raumtemperatur nachher in Grad Celsius.',-30,65),
    },
    calculate({vorher_rh,nachher_rh,temperatur_vorher_c,temperatur_nachher_c}) {
      return {aenderung_rh_prozentpunkte:round(nachher_rh-vorher_rh),
        aenderung_raumtemperatur_c:round(temperatur_nachher_c-temperatur_vorher_c),
        hinweis:'Relative Feuchte und Temperatur zusammen ausweisen. Die Zahl in Prozentpunkten ist keine entfernte Wassermenge.'};
    },
    example:{args:{vorher_rh:72,nachher_rh:62,temperatur_vorher_c:18,temperatur_nachher_c:21},expect:{aenderung_rh_prozentpunkte:-10,aenderung_raumtemperatur_c:3}},
  },
  {
    name:'beleg_datum_redaktionsstand_trennen',
    description:'Testzeitpunkt, Abruf und Seitenaktualisierung im Nachweis auseinanderhalten — Separate the actual test date from article and retrieval dates.',
    page:method,
    properties:{
      test_strukturiert:boolean('Testzeitpunkt steht im Primärbericht?'),
      aktualisierung:boolean('Auf der Zusammenfassung ist nur ein eigenes Aktualisierungsdatum genannt?'),
      abruf_notiert:boolean('Eigenes Abrufdatum nachvollziehbar notiert?'),
    },
    calculate({test_strukturiert,aktualisierung,abruf_notiert}) {
      return {datum_im_testzitat:test_strukturiert?'testzeitpunkt_getrennt_nennen':'testzeitpunkt_offen',
        redaktionsdatum_nur_metadatum:aktualisierung, abruf_ergaenzen:!abruf_notiert,
        grenze:'Auch ein aktueller Abruf beweist keine Wiederholung des Tests.'};
    },
    example:{args:{test_strukturiert:false,aktualisierung:true,abruf_notiert:true},expect:{datum_im_testzitat:'testzeitpunkt_offen',redaktionsdatum_nur_metadatum:true}},
  },
  {
    name:'strombeleg_nutzungsaufgabe_kategorisieren',
    description:'Katalogwert, Rechenbeispiel und eigenes Stromprotokoll in einer Tabelle eindeutig kennzeichnen — Keep evidence classes distinct in a household electricity table.',
    page:use,
    properties:{
      herkunft:select('Primäre Herkunft der Zahl.', 'datenblatt','vorbelegung','eigenes_messprotokoll','unbekannt'),
      gesamte_nutzung:boolean('Bei eigener Messung: vollständiger, repräsentativer Betriebszyklus erfasst?'),
      zeit_einheit:boolean('Dauer und Einheit ausdrücklich dokumentiert?'),
    },
    calculate({herkunft,gesamte_nutzung,zeit_einheit}) {
      const labels={datenblatt:'herstellerangabe',vorbelegung:'rechenbeispiel',eigenes_messprotokoll:'eigene_beobachtung',unbekannt:'herkunft_pruefen'};
      return {tabellenkennzeichen:labels[herkunft],
        repraesentative_hochrechnung:herkunft==='eigenes_messprotokoll'&&gesamte_nutzung&&zeit_einheit,
        grenze:'Auch ein vollständig protokollierter Durchlauf ist auf die dokumentierte Nutzung begrenzt.'};
    },
    example:{args:{herkunft:'vorbelegung',gesamte_nutzung:true,zeit_einheit:true},expect:{tabellenkennzeichen:'rechenbeispiel',repraesentative_hochrechnung:false}},
  },
  {
    name:'stromeinsparung_rechnung_teilverbrauch_scope',
    description:'Eine behauptete Prozentersparnis an einem Gerät auf den dokumentierten Anteil der HaushaltskWh begrenzen — Translate a component energy claim to its maximum stated whole-use share.',
    page:'/guide/strom-sparen-haushalt.html',
    properties:{
      haushalt_kwh:positive('Gesamtstrom im identischen Zeitraum in kWh.'),
      teil_kwh:number('Tatsächlich enthaltene kWh der betroffenen Anwendung.',0,1000000),
      einsparung_teil_prozent:number('Belegte relative Einsparung dieser Anwendung in Prozent.',0,100),
      gleiche_nutzung:boolean('Sind Zeitfenster und gewünschte Leistung vergleichbar?'),
    },
    calculate({haushalt_kwh,teil_kwh,einsparung_teil_prozent,gleiche_nutzung}) {
      if (teil_kwh>haushalt_kwh) throw new RangeError('Teilmenge');
      return {teilanteil_prozent:round(100*teil_kwh/haushalt_kwh),
        szenario_gesamt_kwh_weniger:gleiche_nutzung?round(teil_kwh*einsparung_teil_prozent/100):null,
        szenario_gesamt_prozent_weniger:gleiche_nutzung?round(teil_kwh/haushalt_kwh*einsparung_teil_prozent):null,
        grenze:'Annahme: Der übrige Verbrauch ändert sich nicht. Prozentwerte zum einzelnen Gerät gelten nicht für die Gesamtanlage.'};
    },
    example:{args:{haushalt_kwh:1000,teil_kwh:200,einsparung_teil_prozent:20,gleiche_nutzung:true},expect:{teilanteil_prozent:20,szenario_gesamt_prozent_weniger:4}},
  },
  {
    name:'kuehltechnik_beleg_raumtemperatur_empfindung',
    description:'Einen dokumentierten Kühleffekt als Raumwert, lokale Lufttemperatur oder Empfindung beschriften — Clarify what the reported cooling endpoint actually describes.',
    page:'/guide/klimaanlage-vs-luftkuehler.html',
    properties:{
      endpunkt:select('Im Prüfbeleg erfasste Zielgröße.', 'raumtemperatur','luft_am_auslass','empfindung','unbekannt'),
      referenz_gleich:boolean('Vergleichsbedingungen, Dauer und Messort stimmen überein?'),
      temperaturabfall_c:number('Dokumentierter Abfall in Grad Celsius; 0 falls kein Temperaturwert.',-40,40),
    },
    calculate({endpunkt,referenz_gleich,temperaturabfall_c}) {
      const room=endpunkt==='raumtemperatur'&&referenz_gleich;
      return {zielgroesse:endpunkt, vergleichbarer_raumabfall_c:room?temperaturabfall_c:null,
        grenze:'Ein kühlerer Luftstrahl oder berichtetes Wohlgefühl belegt keine Änderung der mittleren Raumtemperatur.'};
    },
    example:{args:{endpunkt:'luft_am_auslass',referenz_gleich:true,temperaturabfall_c:6},expect:{vergleichbarer_raumabfall_c:null}},
  },
  {
    name:'strompreis_zeitreihe_vollstaendigkeit_beleg',
    description:'Für eine veröffentlichte Statistik über Börsenpreisstunden die fehlenden Werte getrennt ausweisen — Report observed coverage before quoting a negative-price share.',
    page:'/guide/strompreis-radar.html',
    properties:{
      erwartete_stunden:count('Zahl erwarteter Stundenwerte im definierten Bezugszeitraum inklusive Zeitumstellung.'),
      vorhandene_stunden:count('Zahl tatsächlich vorliegender, eindeutiger Stundenwerte.'),
      negative_stunden:count('Zahl negativer Preise unter den vorhandenen Stundenwerten.'),
    },
    calculate({erwartete_stunden,vorhandene_stunden,negative_stunden}) {
      whole(erwartete_stunden,vorhandene_stunden,negative_stunden);
      if (negative_stunden>vorhandene_stunden||vorhandene_stunden>erwartete_stunden) throw new RangeError('Zeitreihenabdeckung');
      return {fehlend:erwartete_stunden-vorhandene_stunden,
        anteil_negativ_vorhandene_prozent:vorhandene_stunden?round(100*negative_stunden/vorhandene_stunden):null,
        vollstaendige_zeitreihe:erwartete_stunden>0&&vorhandene_stunden===erwartete_stunden,
        grenze:'Fehlende Stunden bleiben unbekannt. Der Börsenpreis ist nicht der Haushaltsendpreis.'};
    },
    example:{args:{erwartete_stunden:24,vorhandene_stunden:20,negative_stunden:3},expect:{fehlend:4,anteil_negativ_vorhandene_prozent:15,vollstaendige_zeitreihe:false}},
  },
  {
    name:'waeschetest_einseits_ladungswechsel_beleg',
    description:'Bei einem publizierten Trocknungsvergleich eine geänderte Ladungszusammensetzung als Beleggrenze markieren — Detect when a fabric mix changes only on one side of a drying comparison.',
    page:'/waeschetrockner-oder-luftentfeuchter.html',
    properties:{
      gesamt_a_g:positive('Ausgangs-Trockenmasse der Ladung A in Gramm.'),
      schwer_a_g:number('Masse der gesondert erfassten schweren Textilgruppe in A in Gramm.',0,1000000),
      gesamt_b_g:positive('Ausgangs-Trockenmasse der Ladung B in Gramm.'),
      schwer_b_g:number('Masse derselben Textilgruppe in B in Gramm.',0,1000000),
    },
    calculate({gesamt_a_g,schwer_a_g,gesamt_b_g,schwer_b_g}) {
      if (schwer_a_g>gesamt_a_g||schwer_b_g>gesamt_b_g) throw new RangeError('Textilanteil');
      const a=100*schwer_a_g/gesamt_a_g,b=100*schwer_b_g/gesamt_b_g;
      return {schwer_anteil_a_prozent:round(a),schwer_anteil_b_prozent:round(b),
        verschiebung_b_minus_a_prozentpunkte:round(b-a),
        grenze:'Ein gleicher Anteil garantiert keine gleiche Anfangsfeuchte, Endtrockenheit oder Energie.'};
    },
    example:{args:{gesamt_a_g:3000,schwer_a_g:1200,gesamt_b_g:3500,schwer_b_g:2100},expect:{schwer_anteil_a_prozent:40,schwer_anteil_b_prozent:60,verschiebung_b_minus_a_prozentpunkte:20}},
  },
  {
    name:'diagramm_hervorgehobener_schnitt_zeitreihe',
    description:'Einen hervorgehobenen Verbrauchsausschnitt relativ zur Länge des Gesamtprotokolls einordnen — Show how much of the record is represented by a selected chart window.',
    page:use,
    properties:{
      gesamte_messung_h:positive('Vollständige Dauer des verfügbaren Protokolls in Stunden.'),
      ausschnitt_h:number('Dauer der separat hervorgehobenen Messungen in Stunden.',0,1000000),
      gesamtsumme_kwh:number('Dazugehörige Stromsumme für das Gesamtprotokoll in kWh.',0,1000000),
      ausschnitt_kwh:number('Teilmenge des Stroms für denselben hervorgehobenen Messabschnitt.',0,1000000),
    },
    calculate({gesamte_messung_h,ausschnitt_h,gesamtsumme_kwh,ausschnitt_kwh}) {
      if (ausschnitt_h>gesamte_messung_h||ausschnitt_kwh>gesamtsumme_kwh||(ausschnitt_h===0&&ausschnitt_kwh>0)) throw new RangeError('Ausschnitt');
      return {zeitanteil_prozent:round(ausschnitt_h/gesamte_messung_h*100),
        energieanteil_prozent:gesamtsumme_kwh?round(ausschnitt_kwh/gesamtsumme_kwh*100):null,
        grenze:'Ein gezielt hervorgehobenes Zeitfenster ist kein unabhängiger oder repräsentativer Vergleich.'};
    },
    example:{args:{gesamte_messung_h:24,ausschnitt_h:6,gesamtsumme_kwh:8,ausschnitt_kwh:4},expect:{zeitanteil_prozent:25,energieanteil_prozent:50}},
  },
];
