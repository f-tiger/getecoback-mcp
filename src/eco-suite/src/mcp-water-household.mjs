const shower = '/guide/duschen-kosten-rechner.html';
const bath = '/guide/schimmel-bad-fugen.html';
const appliance = '/geraete-austausch-rechner.html';
const energy = '/guide/strom-sparen-haushalt.html';
const laundry = '/guide/waesche-trocknen-wohnung.html';
const laundryCosts = '/waeschetrockner-oder-luftentfeuchter.html';

const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const option = (description, ...values) => ({type:'string', description, enum:values});
const round = (value, places=3) => Number(value.toFixed(places));
// Snap only floating-point noise near an exact whole count.
function stableRatio(numerator, denominator) {
  const ratio = numerator / denominator;
  const nearest = Math.round(ratio);
  const tolerance = 4 * Number.EPSILON * Math.max(1,Math.abs(ratio));
  return Math.abs(ratio-nearest) <= tolerance ? nearest : ratio;
}
const waterHeat = 0.001163; // kWh per litre and kelvin.
const minute = description => number(description, 0, 1440);
const litres = description => number(description, 0, 1000);
const load = description => number(description, 0.01, 30);
const count = description => number(description, 1, 365);
const whole = (...values) => {
  if (!values.every(Number.isInteger)) throw new RangeError('Anzahl muss ganzzahlig sein');
};

export const waterHousehold = [
  {
    name:'dusche_zeit_bei_wasserbudget',
    description:'Mit gemessenem Durchfluss die Zeit für ein Duschwasserbudget bestimmen — Find the shower time allowed by a personal water budget.',
    page:shower,
    properties:{
      budget_l:litres('Budget für gemischtes Duschwasser in Litern.'),
      durchfluss_l_min:number('Gemessener Durchfluss bei üblicher Einstellung in Litern pro Minute.',0.01,50),
    },
    calculate({budget_l,durchfluss_l_min}) {
      return {maximale_minuten:round(budget_l/durchfluss_l_min),
        grenze:'Rechnet mit unverändertem Durchfluss und der Zeit mit laufendem Wasser. Wasser während des Anlaufens separat vom Budget abziehen.'};
    },
    example:{args:{budget_l:72,durchfluss_l_min:9},expect:{maximale_minuten:8}},
  },
  {
    name:'brause_fliessdruck_bereich',
    description:'Gemessenen Fließdruck mit dem dokumentierten Brausenbereich abgleichen — Check a measured running pressure against the specified showerhead range.',
    page:shower,
    properties:{
      druck_bar:number('Abgelesener Druck in bar.',0,20),
      betriebsdruck:flag('Wurde der Druck bei laufender Entnahme am vorgesehenen Messpunkt erfasst?'),
      untergrenze_bar:number('Dokumentierter minimaler Fließdruck in bar.',0,20),
      obergrenze_bar:number('Dokumentierter maximaler Fließdruck in bar.',0,20),
    },
    calculate({druck_bar,betriebsdruck,untergrenze_bar,obergrenze_bar}) {
      if (untergrenze_bar>obergrenze_bar) throw new RangeError('Druckbereich');
      const check = !betriebsdruck?'fliessdruck_fehlt':druck_bar<untergrenze_bar?'darunter':
        druck_bar>obergrenze_bar?'darueber':'im_bereich';
      return {druckabgleich:check,grenze:'Der Zahlenabgleich betrifft nur den dokumentierten Fließdruck. Anschluss, Warmwassergerät und Herstellerfreigabe separat prüfen.'};
    },
    example:{args:{druck_bar:2,betriebsdruck:false,untergrenze_bar:1,obergrenze_bar:5},expect:{druckabgleich:'fliessdruck_fehlt'}},
  },
  {
    name:'brauseschlauch_anschluesse_abgleichen',
    description:'Beide Enden eines Ersatz-Brauseschlauchs mit Armatur und Handbrause abgleichen — Check both ends of a replacement shower hose against the documented connectors.',
    page:shower,
    properties:{
      armatur:option('Dokumentierte Größe an der Armatur.', 'g_halb','g_dreiviertel','unbekannt'),
      brause:option('Dokumentierte Größe an der Handbrause.', 'g_halb','g_dreiviertel','unbekannt'),
      schlauch_armatur:option('Dokumentierte Größe am Armaturende des Schlauchs.', 'g_halb','g_dreiviertel','unbekannt'),
      schlauch_brause:option('Dokumentierte Größe am Brauseende des Schlauchs.', 'g_halb','g_dreiviertel','unbekannt'),
    },
    calculate({armatur,brause,schlauch_armatur,schlauch_brause}) {
      const compare = (one,two) => [one,two].includes('unbekannt')?'unbekannt':one===two?'gleich':'abweichend';
      return {armatur_abgleich:compare(armatur,schlauch_armatur),brause_abgleich:compare(brause,schlauch_brause),
        grenze:'g_halb steht für G 1/2, g_dreiviertel für G 3/4. Größe, Innen- oder Außengewinde, Dichtsitz und Freigabe insgesamt abgleichen.'};
    },
    example:{args:{armatur:'g_halb',brause:'g_dreiviertel',schlauch_armatur:'g_halb',schlauch_brause:'unbekannt'},expect:{armatur_abgleich:'gleich',brause_abgleich:'unbekannt'}},
  },
  {
    name:'dusche_waermeleistungsbedarf',
    description:'Kontinuierliche Wärmeleistung beim Duschen aus Durchfluss und Temperaturhub abschätzen — Estimate the continuous thermal output needed at a given shower flow.',
    page:shower,
    properties:{
      durchfluss_l_min:number('Durchfluss bei gewählter Einstellung in Litern pro Minute.',0.01,50),
      kalt_c:number('Gemessene Kaltwassertemperatur in Grad Celsius.',0,40),
      misch_c:number('Gemessene Mischwassertemperatur in Grad Celsius.',0,50),
      nutzwaerme_kw:number('Dokumentierte, an das Wasser übertragene Leistungsgrenze in kW beim betrachteten Betriebspunkt.',0,100),
    },
    calculate({durchfluss_l_min,kalt_c,misch_c,nutzwaerme_kw}) {
      if (misch_c<kalt_c) throw new RangeError('Temperaturhub');
      const need=durchfluss_l_min*60*(misch_c-kalt_c)*waterHeat;
      return {waermebedarf_kw:round(need),rechnerische_reserve_kw:round(nutzwaerme_kw-need),
        grenze:'Stationäres Rechenmodell ohne Verteilverluste, Ein- und Ausschaltschwellen oder Regelungsverhalten. Die elektrische Anschlussleistung ist keine nachgewiesene Nutzwärmeleistung.'};
    },
    example:{args:{durchfluss_l_min:10,kalt_c:15,misch_c:35,nutzwaerme_kw:16},expect:{waermebedarf_kw:13.956,rechnerische_reserve_kw:2.044}},
  },
  {
    name:'duschfolge_warmwasservorrat_einordnen',
    description:'Aus gemessenem Mischwasservolumen abschätzen, wie viele gleich lange Duschen ohne Nachheizen hineinpassen — Estimate consecutive showers using a known usable mixed-water volume.',
    page:shower,
    properties:{
      nutzbares_mischwasser_l:litres('Nutzbares Mischwasservolumen aus dokumentierter Prüfung bei vergleichbarer Temperatur, in Litern. Kein bloßes Tankvolumen.'),
      durchfluss_l_min:number('Gemessener Duschdurchfluss in Litern pro Minute.',0.1,50),
      minuten_je_dusche:number('Minuten mit laufendem Wasser je Dusche.',0.1,90),
    },
    calculate({nutzbares_mischwasser_l,durchfluss_l_min,minuten_je_dusche}) {
      const perUse=durchfluss_l_min*minuten_je_dusche;
      const wholeUses=Math.floor(stableRatio(nutzbares_mischwasser_l,perUse));
      return {ganze_duschen_im_modell:wholeUses,restvolumen_l:round(Math.max(0,nutzbares_mischwasser_l-wholeUses*perUse)),
        grenze:'Gleicher Durchfluss und gleiche Mischtemperatur vorausgesetzt. Keine Aussage zu Nachheizung, Speichertemperatur oder hygienischen Anforderungen.'};
    },
    example:{args:{nutzbares_mischwasser_l:125,durchfluss_l_min:8,minuten_je_dusche:7},expect:{ganze_duschen_im_modell:2,restvolumen_l:13}},
  },
  {
    name:'warmwasser_wartezeit_zapfstellen',
    description:'Unabhängige Anlaufzeiten zweier Warmwasser-Zapfstellen einordnen — Compare waiting times at two taps measured from independent cold starts.',
    page:shower,
    properties:{
      zeit_a_s:number('Sekunden bis zur gleichen beobachteten Zieltemperatur an Stelle A.',0,900),
      zeit_b_s:number('Sekunden bis zur gleichen beobachteten Zieltemperatur an Stelle B.',0,900),
      unabhaengig:flag('Beide Messungen begannen nach vergleichbarer Abkühlung ohne vorgewärmte gemeinsame Leitung?'),
      gleiche_entnahme:flag('Entnahmerate und Zieltemperatur der Messungen entsprechen sich?'),
    },
    calculate({zeit_a_s,zeit_b_s,unabhaengig,gleiche_entnahme}) {
      const comparable=unabhaengig&&gleiche_entnahme;
      return {vergleichbar:comparable,differenz_b_minus_a_s:comparable?round(zeit_b_s-zeit_a_s):null,
        grenze:'Der Vergleich bewertet Wartezeit. Daraus folgen weder eine Diagnose der Leitungsführung noch Empfehlungen zur Anlagentemperatur.'};
    },
    example:{args:{zeit_a_s:24,zeit_b_s:61,unabhaengig:true,gleiche_entnahme:true},expect:{vergleichbar:true,differenz_b_minus_a_s:37}},
  },
  {
    name:'warmwasser_rechnung_fix_und_variabel',
    description:'Auf der Warmwasserabrechnung Grundkosten und den variablen Anteil eines Volumen-Szenarios trennen — Separate fixed charges from the volume-dependent part of a stated hot-water billing plan.',
    page:shower,
    properties:{
      fix_eur:number('Fixe Gebühren im betrachteten Abrechnungszeitraum in Euro.',0,10000),
      arbeitspreis_eur_m3:number('Volumenabhängiger Warmwasser-Arbeitspreis in Euro pro Kubikmeter.',0,150),
      volumen_m3:number('Abgerechnetes Warmwasservolumen im Zeitraum in Kubikmetern.',0,10000),
      weniger_l:litres('Geplante Minderentnahme im selben Zeitraum in Litern.'),
    },
    calculate({fix_eur,arbeitspreis_eur_m3,volumen_m3,weniger_l}) {
      const reduction=weniger_l/1000;
      if(reduction>volumen_m3) throw new RangeError('Minderentnahme');
      const variable=volumen_m3*arbeitspreis_eur_m3;
      return {modellbetrag_eur:round(fix_eur+variable,2),variabel_eur:round(variable,2),
        vermeidbarer_betrag_eur:round(reduction*arbeitspreis_eur_m3,2),
        grenze:'Nur für diesen ausdrücklich volumengebundenen Tarif. Andere Verteilerschlüssel, zusätzliche Gebühren und veränderte Tarife sind nicht enthalten.'};
    },
    example:{args:{fix_eur:50,arbeitspreis_eur_m3:12,volumen_m3:10,weniger_l:500},expect:{modellbetrag_eur:170,variabel_eur:120,vermeidbarer_betrag_eur:6}},
  },
  {
    name:'armatur_tropfverlust_schaetzen',
    description:'Eine aufgefangene Tropfmenge auf einen begrenzten Zeitraum hochrechnen — Project a captured drip rate over a limited observation period.',
    page:bath,
    properties:{
      aufgefangen_ml:number('Aufgefangene Wassermenge in Millilitern.',0,10000),
      messdauer_min:number('Dauer der Beobachtung in Minuten.',0.1,1440),
      tage:number('Vergleichbare Tage bei angenommener unveränderter Tropfrate.',0,365),
    },
    calculate({aufgefangen_ml,messdauer_min,tage}) {
      const daily=aufgefangen_ml/1000*1440/messdauer_min;
      return {liter_pro_tag:round(daily),liter_im_zeitraum:round(daily*tage),
        grenze:'Lineare Hochrechnung einer beobachteten Tropfstelle, keine Ferndiagnose. Die Rate kann sich ändern. Sichtbar austretendes oder fortschreitendes Wasser zeitnah klären lassen.'};
    },
    example:{args:{aufgefangen_ml:25,messdauer_min:10,tage:7},expect:{liter_pro_tag:3.6,liter_im_zeitraum:25.2}},
  },
  {
    name:'wasserzaehler_ruhezustand_einordnen',
    description:'Zwei abgelesene Wasserzählerstände ohne geplante Entnahme einordnen — Interpret two observed water meter readings during a no-draw interval.',
    page:bath,
    properties:{
      start_m3:number('Anfangsstand desselben Wasserzählers in Kubikmetern.',0,1000000),
      ende_m3:number('Endstand in Kubikmetern.',0,1000000),
      schritt_l:number('Kleinster ablesbarer Schritt in Litern.',0.01,1000),
      entnahmen_bekannt_aus:flag('Waren geplante und automatisch ausgelöste Wasserentnahmen im beobachteten Bereich ausgeschlossen?'),
    },
    calculate({start_m3,ende_m3,schritt_l,entnahmen_bekannt_aus}) {
      if (ende_m3<start_m3) throw new RangeError('Zählerstand');
      const delta=round((ende_m3-start_m3)*1000,6);
      return {ablesedifferenz_l:round(delta),befund:!entnahmen_bekannt_aus?'entnahmen_ungeklaert':
        delta>=schritt_l?'zaehleranstieg_abklaeren':'kein_sicher_aufgeloester_anstieg',
        grenze:'Der Zähler lokalisiert kein Leck. Kleine oder zeitweise Entnahmen können unter der Ableseauflösung bleiben.'};
    },
    example:{args:{start_m3:100.2,ende_m3:100.203,schritt_l:1,entnahmen_bekannt_aus:true},expect:{ablesedifferenz_l:3,befund:'zaehleranstieg_abklaeren'}},
  },
  {
    name:'duschbereich_naesse_ausserhalb',
    description:'Wasser außerhalb des Duschbereichs anhand des Zeitpunkts zur Abklärung einordnen — Distinguish observations during use from water that reappears after the shower is off.',
    page:bath,
    properties:{
      nur_beim_duschen:flag('War die Nässe ausschließlich bei laufender Dusche sichtbar?'),
      kehrt_ohne_entnahme_zurueck:flag('Wurde die trocken gewischte Stelle ohne weitere Nutzung erneut nass?'),
      tritt_aus_fuge_oder_wand:flag('War austretendes Wasser an einer Fuge, der Wand oder am Bodenübergang beobachtbar?'),
    },
    calculate({nur_beim_duschen,kehrt_ohne_entnahme_zurueck,tritt_aus_fuge_oder_wand}) {
      if (nur_beim_duschen&&kehrt_ohne_entnahme_zurueck) throw new RangeError('Widersprüchliche Zeitangaben');
      const next = kehrt_ohne_entnahme_zurueck||tritt_aus_fuge_oder_wand?'ursache_durch_fachperson_klaeren':
        nur_beim_duschen?'spritzwasserweg_beobachten':'zeitpunkt_dokumentieren';
      return {naechster_schritt:next,grenze:'Beobachtungshilfe für einen begrenzten nicht akuten Befund. Ein zeitlicher Zusammenhang beweist weder Leckage noch dichte Anschlüsse.'};
    },
    example:{args:{nur_beim_duschen:false,kehrt_ohne_entnahme_zurueck:true,tritt_aus_fuge_oder_wand:false},expect:{naechster_schritt:'ursache_durch_fachperson_klaeren'}},
  },
  {
    name:'warmwasser_nutzwaerme_gegen_zaehler',
    description:'Gemischte Wasserentnahme mit einem zugehörigen Wärmezählerwert plausibilisieren — Compare useful draw heat with a thermal meter covering the agreed boundary.',
    page:shower,
    properties:{
      mischvolumen_l:litres('Volumen des entnommenen Mischwassers in Litern.'),
      hub_k:number('Temperaturdifferenz gegenüber Kaltwasser in Kelvin.',0,80),
      zaehler_kwh:number('Wärmezählerdifferenz für denselben Zeitraum in kWh, kein Stromzähler.',0,1000),
      gleiche_bilanzgrenze:flag('Gehört der Wärmezählerwert ausschließlich zum untersuchten Warmwasserbereich und Zeitraum?'),
    },
    calculate({mischvolumen_l,hub_k,zaehler_kwh,gleiche_bilanzgrenze}) {
      const useful=mischvolumen_l*hub_k*waterHeat;
      return {nutzwaerme_schaetzung_kwh:round(useful),
        zaehler_minus_nutzwaerme_kwh:gleiche_bilanzgrenze?round(zaehler_kwh-useful):null,
        grenze:'Die Restdifferenz kann Messabweichungen, Leitungs- oder Bereitschaftswärme enthalten. Sie ist ohne weitere Prüfung keine Verlustdiagnose und kein Wirkungsgrad.'};
    },
    example:{args:{mischvolumen_l:100,hub_k:20,zaehler_kwh:3,gleiche_bilanzgrenze:true},expect:{nutzwaerme_schaetzung_kwh:2.326,zaehler_minus_nutzwaerme_kwh:0.674}},
  },
  {
    name:'spuelgang_nachwaschaufwand',
    description:'Gemessenen Wasser- und Stromaufwand zusätzlicher Spülgänge pro gewünschter fertiger Ladung aufschlüsseln — Account for actual repeat cycles when assessing dishwasher results.',
    page:appliance,
    properties:{
      ladungen:count('Gewünschte fertig gespülte Ladungen im Protokoll.'),
      nachgaenge:number('Zusätzlich nötige vollständige Maschinengänge im Protokoll.',0,365),
      nachgang_l:litres('Liter pro beobachtetem Nachgang.'),
      nachgang_kwh:number('kWh pro beobachtetem Nachgang.',0,15),
    },
    calculate({ladungen,nachgaenge,nachgang_l,nachgang_kwh}) {
      whole(ladungen,nachgaenge);
      return {durchgaenge_gesamt:ladungen+nachgaenge,
        zusatz_l_pro_fertiger_ladung:round(nachgaenge*nachgang_l/ladungen),
        zusatz_kwh_pro_fertiger_ladung:round(nachgaenge*nachgang_kwh/ladungen),
        grenze:'Die Zählung bildet zusätzlichen Maschinenbetrieb ab. Gemessene Einzelwerte bevorzugen und nur vergleichbar sauberes Geschirr gegenüberstellen.'};
    },
    example:{args:{ladungen:4,nachgaenge:1,nachgang_l:12,nachgang_kwh:0.8},expect:{durchgaenge_gesamt:5,zusatz_l_pro_fertiger_ladung:3,zusatz_kwh_pro_fertiger_ladung:0.2}},
  },
  {
    name:'spuelprogramm_fertig_bis',
    description:'Prüfen, ob das Geschirr mit einem passenden Spülprogramm bis zur gewünschten Nutzung fertig ist — Check whether a suitable programme fits a dish-ready deadline.',
    page:energy,
    properties:{
      verfuegbare_min:minute('Zeit von jetzt bis zum gewünschten Zeitpunkt in Minuten.'),
      start_in_min:minute('Geplanter Start in Minuten ab jetzt.'),
      programm_min:minute('Dokumentierte oder beobachtete Dauer des passenden Programms.'),
      ausraeumen_min:minute('Eigener Puffer zum Entnehmen oder Ausräumen.'),
    },
    calculate({verfuegbare_min,start_in_min,programm_min,ausraeumen_min}) {
      const timing=verfuegbare_min-start_in_min-programm_min-ausraeumen_min;
      return {im_zeitfenster:timing>=0,zeitreserve_min:round(timing),
        grenze:'Programmdauer kann sich abhängig von Ladung, Sensorik und Zulauf ändern. Zeit allein sagt nichts über Energieverbrauch oder Spülergebnis.'};
    },
    example:{args:{verfuegbare_min:230,start_in_min:15,programm_min:200,ausraeumen_min:20},expect:{im_zeitfenster:false,zeitreserve_min:-5}},
  },
  {
    name:'spuelmaschine_warmzulauf_freigabe',
    description:'Dokumentierte Warmwasser-Zulauffreigabe und Obergrenze eines Geschirrspülers prüfen — Check the exact appliance manual for permission and a maximum warm inlet temperature.',
    page:appliance,
    properties:{
      anleitung_exakt:flag('Gilt die Anleitung für die genaue Modellvariante?'),
      warm_zulaessig:flag('Ist Warmwasseranschluss laut dieser Anleitung ausdrücklich zulässig?'),
      maximum_c:number('Dokumentierte obere Zulauftemperatur in Grad Celsius; bei fehlender Angabe 0.',0,95),
      zulauf_c:number('Beobachtete höchste Zulauftemperatur in Grad Celsius.',0,95),
    },
    calculate({anleitung_exakt,warm_zulaessig,maximum_c,zulauf_c}) {
      const result=!anleitung_exakt?'modellbeleg_fehlt':!warm_zulaessig?'warmzulauf_nicht_bestaetigt':
        maximum_c===0?'temperaturlimit_fehlt':zulauf_c>maximum_c?'beobachtung_ueber_limit':'temperaturwert_innerhalb_limit';
      return {herstellerabgleich:result,grenze:'Vergleicht nur vorgelegte Angaben zu Zulaufart und Temperatur. Anschlussvorschriften und weitere Voraussetzungen gelten separat.'};
    },
    example:{args:{anleitung_exakt:true,warm_zulaessig:true,maximum_c:60,zulauf_c:65},expect:{herstellerabgleich:'beobachtung_ueber_limit'}},
  },
  {
    name:'kontaktgrill_platten_spuelmaschine_beleg',
    description:'Spülmaschinenfreigabe abnehmbarer Kontaktgrillplatten für dokumentierte Modellvarianten nachschlagen — Look up the exact documented contact-grill plate cleaning claim.',
    page:'/produkte.html',
    properties:{
      modell:option('Exakte Produktvariante aus dem redaktionellen Katalog.', 'tefal_gc750d12','severin_kg2394_10002394000','severin_kg2395','unbekannt'),
    },
    calculate({modell}) {
      return {plattenfreigabe:modell==='tefal_gc750d12'?'hersteller_nennt_spuelmaschinengeeignet':'im_katalog_nicht_belegt',
        grenze:'Die Angabe betrifft nur die abnehmbaren Platten der belegten Variante. Bei abweichender Modellreferenz oder anderen Teilen die eigene Anleitung heranziehen.'};
    },
    example:{args:{modell:'tefal_gc750d12'},expect:{plattenfreigabe:'hersteller_nennt_spuelmaschinengeeignet'}},
  },
  {
    name:'spuelmaschine_label_wasser_bezug',
    description:'Wassermessung je Spülgang mit dem vergleichbaren Eco-Labelwert abgleichen — Compare actual dishwasher litres per cycle with the applicable Eco label value.',
    page:appliance,
    properties:{
      gemessene_l:litres('Gemessene Gesamtmenge in Litern für die erfassten Gänge.'),
      gaenge:count('Zahl der vollständig gemessenen Maschinenzyklen.'),
      label_l_pro_gang:litres('Labelwert in Litern je Zyklus.'),
      eco_vergleichbar:flag('Wurden ECO-Labelprogramm und vergleichbare Ladung gewählt und nur der Maschinenzulauf erfasst?'),
    },
    calculate({gemessene_l,gaenge,label_l_pro_gang,eco_vergleichbar}) {
      whole(gaenge);
      const mean=gemessene_l/gaenge;
      return {gemessen_l_pro_gang:round(mean),abweichung_zum_eco_label_l:eco_vergleichbar?round(mean-label_l_pro_gang):null,
        grenze:'Das Label beruht auf seiner Prüfgrundlage. Auch ein vergleichbarer Haushaltswert ist kein Nachweis für einen Serienfehler.'};
    },
    example:{args:{gemessene_l:30,gaenge:3,label_l_pro_gang:9.5,eco_vergleichbar:true},expect:{gemessen_l_pro_gang:10,abweichung_zum_eco_label_l:0.5}},
  },
  {
    name:'spuelmaschine_ablaufweg_anleitung',
    description:'Geplanten Spülmaschinen-Ablaufweg mit den dokumentierten Höhen- und Längengrenzen abgleichen — Check dishwasher drain route measurements against the exact provided manual limits.',
    page:appliance,
    properties:{
      hoehe_cm:number('Gemessene Bezugshöhe am Ablauf nach Definition der Geräteanleitung in cm.',0,500),
      schlauch_cm:number('Vorgesehene gesamte Schlauchlänge in cm.',0,1000),
      min_hoehe_cm:number('Laut Anleitung kleinstzulässige Ablaufhöhe in cm.',0,500),
      max_hoehe_cm:number('Laut Anleitung größtzulässige Ablaufhöhe in cm.',0,500),
      max_schlauch_cm:number('Laut Anleitung größtzulässige Schlauchlänge in cm.',1,1000),
    },
    calculate({hoehe_cm,schlauch_cm,min_hoehe_cm,max_hoehe_cm,max_schlauch_cm}) {
      if (min_hoehe_cm>max_hoehe_cm) throw new RangeError('Höhenbereich');
      return {hoehe_im_bereich:hoehe_cm>=min_hoehe_cm&&hoehe_cm<=max_hoehe_cm,laenge_im_bereich:schlauch_cm<=max_schlauch_cm,
        grenze:'Nur für die eingegebenen modellbezogenen Grenzwerte und die Höhenmessung nach Anleitung. Montage, Geruchsverschluss und Rückflussbedingungen nicht bewertet.'};
    },
    example:{args:{hoehe_cm:88,schlauch_cm:230,min_hoehe_cm:40,max_hoehe_cm:100,max_schlauch_cm:200},expect:{hoehe_im_bereich:true,laenge_im_bereich:false}},
  },
  {
    name:'trockner_programm_trockenmasse',
    description:'Trockene Bezugsmasse mit der Kapazität des konkreten Trocknerprogramms vergleichen — Check a load against the selected dryer programme’s stated capacity.',
    page:appliance,
    properties:{
      trockenmasse_kg:load('Vor dem Waschen gewogene Trockenmasse der Ladung in kg.'),
      programm_max_kg:load('In der Anleitung für genau dieses Programm erlaubte Bezugsmasse in kg.'),
      kapazitaetsbasis:flag('Nutzt die Anleitung für dieses Programm dieselbe Trockenmasse-Basis?'),
    },
    calculate({trockenmasse_kg,programm_max_kg,kapazitaetsbasis}) {
      return {kapazitaet_einordenbar:kapazitaetsbasis,
        reserve_kg:kapazitaetsbasis?round(programm_max_kg-trockenmasse_kg):null,
        grenze:'Gesamt-Nennfüllmenge und tatsächliches Programmmaximum können sich unterscheiden. Textilfreigabe und Trockenstufe zusätzlich berücksichtigen.'};
    },
    example:{args:{trockenmasse_kg:5,programm_max_kg:4,kapazitaetsbasis:true},expect:{kapazitaet_einordenbar:true,reserve_kg:-1}},
  },
  {
    name:'waschtrockner_waschladung_aufteilen',
    description:'Eine Waschladung für die niedrigere Trockenfüllmenge eines Kombigeräts aufteilen — Estimate dry-only batches after a separately completed wash load in a washer-dryer.',
    page:appliance,
    properties:{
      trockenmasse_kg:load('Trockenmasse der bereits gewaschenen Gesamtladung in kg.'),
      trocknen_max_kg:load('Dokumentiertes Trockenprogramm-Limit auf Trockenmasse bezogen in kg.'),
      trockengang_min:minute('Planzeit je getrennt gestartetem Trockenprogramm in Minuten.'),
      teilbar:flag('Kann diese Ladung in passende Teilladungen getrennt werden?'),
    },
    calculate({trockenmasse_kg,trocknen_max_kg,trockengang_min,teilbar}) {
      const batches=Math.ceil(stableRatio(trockenmasse_kg,trocknen_max_kg));
      const possible=teilbar||batches===1;
      return {durchgaenge_noetig:possible?batches:null,geraetebelegung_min:possible?round(batches*trockengang_min):null,
        grenze:'Schätzt getrennt gestartete Trockengänge nach abgeschlossenem Waschgang. Laufzeit kleinerer Ladungen oder eines unterbrechungsfreien Kombiprogramms kann abweichen.'};
    },
    example:{args:{trockenmasse_kg:7,trocknen_max_kg:4,trockengang_min:95,teilbar:true},expect:{durchgaenge_noetig:2,geraetebelegung_min:190}},
  },
  {
    name:'waesche_pflegeetikett_programmabgleich',
    description:'Eine geplante Maschinenwäsche mit den angegebenen Pflegeetikett-Grenzen abgleichen — Check selected machine-wash settings against a garment’s supplied care label.',
    page:'/guide/schimmel-kleiderschrank.html',
    properties:{
      etikett:option('Maschinenwäsche laut Etikett.', 'ja','nein','unbekannt'),
      max_c:number('Auf dem Etikett genannte höchste Temperatur in Grad Celsius; bei unbekanntem Wert 0.',0,95),
      programm_c:number('Gewählte Programmtemperatur in Grad Celsius.',0,95),
      schonend_noetig:flag('Schongang laut Etikett erforderlich?'),
      schonend_gewaehlt:flag('Ausgewähltes Programm erfüllt laut Bedienungsanleitung den geforderten Schongang?'),
    },
    calculate({etikett,max_c,programm_c,schonend_noetig,schonend_gewaehlt}) {
      const status=etikett==='nein'?'maschinenwaesche_nicht_freigegeben':etikett==='unbekannt'||max_c===0?'pflegeetikett_pruefen':
        programm_c>max_c||schonend_noetig&&!schonend_gewaehlt?'programm_weicht_ab':'erfasste_grenzen_eingehalten';
      return {etikett_abgleich:status,grenze:'Prüft nur die eingegebenen Hinweise zur Maschinenwäsche. Trocknung, Bleichen, Schleudern und besondere Kleidungsvorgaben separat bewerten.'};
    },
    example:{args:{etikett:'ja',max_c:30,programm_c:30,schonend_noetig:true,schonend_gewaehlt:false},expect:{etikett_abgleich:'programm_weicht_ab'}},
  },
  {
    name:'waesche_zwei_maschinen_zeitplan',
    description:'Mehrere gleiche Ladungen über getrennte Waschmaschine und Trockner zeitlich planen — Schedule repeated laundry batches through two separate appliances.',
    page:laundryCosts,
    properties:{
      ladungen:count('Zahl gleichartiger, für beide Geräte geeigneter Ladungen.'),
      wasch_min:number('Belegungszeit der Waschmaschine je Ladung in Minuten.',1,720),
      trocken_min:number('Belegungszeit des Trockners je Ladung in Minuten.',1,720),
      deadline_min:number('Verfügbares Zeitfenster ab dem ersten Start in Minuten.',0,600000),
    },
    calculate({ladungen,wasch_min,trocken_min,deadline_min}) {
      whole(ladungen);
      const total=wasch_min+trocken_min+(ladungen-1)*Math.max(wasch_min,trocken_min);
      return {fruehestes_ende_min:round(total),zeitreserve_min:round(deadline_min-total),
        engpass:wasch_min===trocken_min?'gleich':wasch_min>trocken_min?'waschmaschine':'trockner',
        grenze:'Planungsmodell mit sofortiger Übergabe bei freiem Trockner und ohne Zusatzpausen. Beide Geräte müssen für unabhängigen Betrieb vorgesehen sein.'};
    },
    example:{args:{ladungen:3,wasch_min:60,trocken_min:90,deadline_min:350},expect:{fruehestes_ende_min:330,zeitreserve_min:20,engpass:'trockner'}},
  },
  {
    name:'waesche_abholzeit_trommel',
    description:'Feuchte Wartezeit einer Ladung zwischen Programmende und geplanter Entnahme berechnen — Calculate how long finished wet laundry would wait before collection.',
    page:laundry,
    properties:{
      start_in_min:minute('Geplanter Programmstart in Minuten ab jetzt.'),
      laufzeit_min:minute('Beobachtete Laufzeit des Programms in Minuten.'),
      abholen_in_min:minute('Mögliche Entnahme in Minuten ab jetzt.'),
    },
    calculate({start_in_min,laufzeit_min,abholen_in_min}) {
      const finish=start_in_min+laufzeit_min;
      return {fertig_in_min:round(finish),abholung_vor_fertig:abholen_in_min<finish,
        wartezeit_nach_ende_min:round(Math.max(0,abholen_in_min-finish)),
        grenze:'Rechnet mit der angegebenen Laufzeit. Die Wartezeit ist ein Planungswert, keine Hygienegrenze.'};
    },
    example:{args:{start_in_min:10,laufzeit_min:80,abholen_in_min:120},expect:{fertig_in_min:90,wartezeit_nach_ende_min:30,abholung_vor_fertig:false}},
  },
  {
    name:'waescheleine_trockner_ladeanteil',
    description:'Eine gemischte Ladung nach vorliegender Trocknerfreigabe in Trockenwege aufteilen — Split the supplied dry load mass into dryer-permitted and separately dried laundry.',
    page:laundry,
    properties:{
      gesamt_trocken_kg:load('Gesamte ursprüngliche Trockenmasse der Ladung in kg.'),
      trockner_freigegeben_kg:number('Trockenmasse der ausdrücklich trocknergeeigneten Stücke in kg.',0,30),
      trockner_limit_kg:load('Programmbezogene Trockenmassegrenze des Trockners in kg.'),
    },
    calculate({gesamt_trocken_kg,trockner_freigegeben_kg,trockner_limit_kg}) {
      if (trockner_freigegeben_kg>gesamt_trocken_kg) throw new RangeError('Teilmasse');
      const dryer=Math.min(trockner_freigegeben_kg,trockner_limit_kg);
      return {fuer_einen_trockengang_kg:round(dryer),anders_zu_trocknen_oder_weiterer_gang_kg:round(gesamt_trocken_kg-dryer),
        zwingend_anders_zu_trocknen_kg:round(gesamt_trocken_kg-trockner_freigegeben_kg),
        grenze:'Planung nach deiner ausdrücklich bestätigten Textilfreigabe. Auch passende Massen belegen keine Programmtauglichkeit oder Trockenzeit.'};
    },
    example:{args:{gesamt_trocken_kg:7,trockner_freigegeben_kg:5,trockner_limit_kg:4},expect:{fuer_einen_trockengang_kg:4,anders_zu_trocknen_oder_weiterer_gang_kg:3,zwingend_anders_zu_trocknen_kg:2}},
  },
  {
    name:'trockner_ende_feuchte_stichprobe',
    description:'Ergebnis einer Trocknerladung gegen den geplanten Verwendungszweck einordnen — Check whether the observed dryness of the slowest-drying items suits the intended next step.',
    page:laundryCosts,
    properties:{
      ziel:option('Geplante Verwendung nach dem Trocknen.', 'verstauen','buegeln','weiter_aufhaengen'),
      geeignet_bestaetigt:flag('Ist die gewünschte Restfeuchte am langsamsten trocknenden geprüften Stück beobachtet?'),
      stichprobe_passend:flag('Wurden die relevanten langsam trocknenden Stücke und dicke Stellen tatsächlich einbezogen?'),
      nur_programmende:flag('Stützt sich die Angabe allein auf das Signal zum Programmende?'),
    },
    calculate({ziel,geeignet_bestaetigt,stichprobe_passend,nur_programmende}) {
      const confirmed=!nur_programmende&&stichprobe_passend&&geeignet_bestaetigt;
      return {ziel,restfeuchteziel_beobachtet:confirmed,naechster_schritt:confirmed?'geplanten_schritt_ausfuehren':'restfeuchte_am_textil_pruefen',
        grenze:'Das Programmende beweist die Restfeuchte einer konkreten Ladung nicht. Das Tool leitet weder eine zusätzliche Laufzeit noch ein Gesundheitsurteil ab.'};
    },
    example:{args:{ziel:'verstauen',geeignet_bestaetigt:true,stichprobe_passend:false,nur_programmende:true},expect:{restfeuchteziel_beobachtet:false,naechster_schritt:'restfeuchte_am_textil_pruefen'}},
  },
];
