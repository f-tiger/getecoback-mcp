const meter = '/strommess-protokoll.html';
const tariff = '/stromtarif-werkstatt.html';
const efficiency = '/guide/strom-sparen-haushalt.html';
const cooling = '/guide/klimaanlage-stromkosten.html';
const drying = '/waeschetrockner-oder-luftentfeuchter.html';
const heating = '/guide/heizkosten-vergleich-rechner.html';
const shower = '/guide/duschen-kosten-rechner.html';
const workshop = '/familienwerkstatt.html';
const purifier = '/guide/luftreiniger-ratgeber.html';
const cellar = '/guide/luftentfeuchter-keller.html';
const n = (description, minimum = 0, maximum = 1000000) => ({type:'number', minimum, maximum, description});
const duration = (description, minimum = 0) => n(description, minimum, 525600);
const watts = description => n(description, 0, 100000);
const yes = description => ({type:'boolean',description});
const choice = (description,...values) => ({type:'string',enum:values,description});
const r = value => Math.round(value*10000)/10000 + 0;
const max0 = x => Math.max(0,x);
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Anzahlen erforderlich.');
}
function task(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const mehrgeraetebetrieb = [
  task('stromgruppe_vier_betriebszustaende_wechselwirkung',
    'Gemessene Einzellasten und gemeinsamen Betrieb gegen dieselbe Ruhephase auf Nichtadditivität prüfen — Reconcile all four observed activation states under comparable conditions.',
    meter,{
      ruhe_wh:n('Gemessene Energie, wenn beide Geräte inaktiv waren.'),
      a_allein_wh:n('Gemessene Energie, nur Gerät A aktiv.'),
      b_allein_wh:n('Gemessene Energie, nur Gerät B aktiv.'),
      zusammen_wh:n('Gemessene Energie, beide Geräte gleichzeitig aktiv.'),
      fenster_gleich:yes('Sind Dauer, Messgrenze und sonstige Nutzung in allen vier Fenstern vergleichbar?'),
    },({ruhe_wh,a_allein_wh,b_allein_wh,zusammen_wh,fenster_gleich})=>{
      if (!fenster_gleich) return {additiv_erwartet_wh:null,gemeinsam_minus_additiv_wh:null};
      const additive=a_allein_wh+b_allein_wh-ruhe_wh;
      return {additiv_erwartet_wh:r(additive),gemeinsam_minus_additiv_wh:r(zusammen_wh-additive),
        hinweis:'Abweichungen können durch gegenseitige Einflüsse oder andere Lasten entstehen. Das Kontrollfenster dient nur der Messauswertung.'};
    },{ruhe_wh:20,a_allein_wh:120,b_allein_wh:220,zusammen_wh:304,fenster_gleich:true},
    {additiv_erwartet_wh:320,gemeinsam_minus_additiv_wh:-16}),

  task('stromgruppe_geraeteband_aus_gesamtmessung',
    'Den möglichen Verbrauch eines Geräts aus einer Gesamtmessung und belegten Bandbreiten der anderen Lasten eingrenzen — Bound one device from aggregate energy and independently justified remaining-load ranges.',
    meter,{
      gesamt_wh:n('Gemessene Energie aller bestätigten Lasten im selben Fenster.'),
      andere_min_wh:n('Belegte untere Grenze für alle übrigen Lasten zusammen.'),
      andere_max_wh:n('Belegte obere Grenze für diese übrigen Lasten.'),
      gemeinsamer_messumfang:yes('Sind Zählerumfang und die Grenzen für sämtliche übrigen Lasten bestätigt?'),
    },({gesamt_wh,andere_min_wh,andere_max_wh,gemeinsamer_messumfang})=>{
      if (andere_min_wh>andere_max_wh) throw new RangeError();
      if (!gemeinsamer_messumfang||andere_min_wh>gesamt_wh) return {status:'bezug_oder_grenzen_pruefen',verbleibendes_geraet_wh:null};
      return {status:'beitrag_eingegrenzt',verbleibendes_geraet_wh:[r(max0(gesamt_wh-andere_max_wh)),r(gesamt_wh-andere_min_wh)],
        hinweis:'Eine rechnerische Spanne, keine gemessene exakte Zuordnung.'};
    },{gesamt_wh:500,andere_min_wh:300,andere_max_wh:360,gemeinsamer_messumfang:true},
    {status:'beitrag_eingegrenzt',verbleibendes_geraet_wh:[140,200]}),

  task('geraeteaktivitaet_ueberlappung_zeitnachweis',
    'Gemeinsame Aktivzeit aus zwei Betriebsdauern und einer separat erfassten mindestens-ein-Gerät-Dauer rekonstruieren — Recover joint device time from a separately logged union.',
    meter,{
      fenster_min:duration('Dauer des gemeinsamen Beobachtungsfensters.',1),
      a_aktiv_min:duration('Vollständig protokollierte Aktivminuten A.'),
      b_aktiv_min:duration('Vollständig protokollierte Aktivminuten B.'),
      mindestens_eins_min:duration('Minuten mit mindestens einem aktiven der beiden Geräte, aus einem separaten Zustandsprotokoll.'),
    },({fenster_min,a_aktiv_min,b_aktiv_min,mindestens_eins_min})=>{
      if (mindestens_eins_min>fenster_min||mindestens_eins_min<Math.max(a_aktiv_min,b_aktiv_min)||mindestens_eins_min>a_aktiv_min+b_aktiv_min) throw new RangeError();
      return {gemeinsam_aktiv_min:r(a_aktiv_min+b_aktiv_min-mindestens_eins_min),beide_inaktiv_min:r(fenster_min-mindestens_eins_min),
        aktivitaet_ohne_gleichzeitigkeit_min:r(2*mindestens_eins_min-a_aktiv_min-b_aktiv_min),
        hinweis:'Nur dieselbe Zeitachse und konsistent erfasste Aktivdefinition. Aktivzeit allein misst keine Leistung.'};
    },{fenster_min:100,a_aktiv_min:65,b_aktiv_min:40,mindestens_eins_min:80},
    {gemeinsam_aktiv_min:25,beide_inaktiv_min:20,aktivitaet_ohne_gleichzeitigkeit_min:55}),

  task('stromspitze_zwei_lasten_einzelursache_pruefen',
    'Ein Gruppenmaximum gegen belegte Einzel- und Hintergrundobergrenzen auf mögliche Überlagerung prüfen — Rule out a lone active load only when all relevant peak ceilings are documented.',
    meter,{
      gruppenmaximum_w:watts('Auf demselben Zeitmaß gemessenes mittleres Gruppenmaximum.'),
      a_max_w:watts('Belegte Obergrenze von Gerät A allein.'),
      b_max_w:watts('Belegte Obergrenze von Gerät B allein.'),
      rest_max_w:watts('Belegte Obergrenze des ganzen übrigen Verbrauchs, einschließlich Ruhestrom.'),
      grenzen_belegt:yes('Sind alle drei Grenzen im betrachteten Zeitraum und Messraster nachvollziehbar?'),
    },({gruppenmaximum_w,a_max_w,b_max_w,rest_max_w,grenzen_belegt})=>{
      if (!grenzen_belegt) return {status:'messgrenzen_offen'};
      const lone=rest_max_w+Math.max(a_max_w,b_max_w);
      const both=rest_max_w+a_max_w+b_max_w;
      return {status:gruppenmaximum_w>both?'ausgangswerte_widersprechen':gruppenmaximum_w>lone?'einzelbetrieb_reicht_nicht':'einzelbetrieb_moeglich',
        maximale_einzelsituation_w:lone,
        hinweis:'Eine Messhypothese über Lastanteile. Keine Freigabe für Leitungen, Mehrfachsteckdosen oder gleichzeitiges Betreiben.'};
    },{gruppenmaximum_w:680,a_max_w:400,b_max_w:350,rest_max_w:120,grenzen_belegt:true},
    {status:'einzelbetrieb_reicht_nicht',maximale_einzelsituation_w:520}),

  task('stromgruppe_anlaufstaffel_kosten_und_messspitze',
    'Zwei bereits erprobte Startfolgen nach Energie und gemessenem Maximum unabhängig vergleichen — Check whether a staggered start lowered the observed peak while using more energy.',
    meter,{
      gleichzeitig_wh:n('Energie des vollständigen Versuchs mit gemeinsamem Start.'),
      gestaffelt_wh:n('Energie des vollständigen Versuchs mit gestaffelten Starts.'),
      gleichzeitig_max_w:watts('Höchste Intervallmittel-Leistung bei gemeinsamem Start.'),
      gestaffelt_max_w:watts('Höchste Intervallmittel-Leistung bei gestaffelten Starts.'),
      aufgabe_und_raster_gleich:yes('Sind Aufgabenergebnis, Messgrenze und Auflösung vergleichbar?'),
    },({gleichzeitig_wh,gestaffelt_wh,gleichzeitig_max_w,gestaffelt_max_w,aufgabe_und_raster_gleich})=>{
      const power=gestaffelt_max_w-gleichzeitig_max_w;
      const energy=gestaffelt_wh-gleichzeitig_wh;
      return {delta_wh:aufgabe_und_raster_gleich?r(energy):null,delta_intervallmaximum_w:aufgabe_und_raster_gleich?r(power):null,
        zielkonflikt:aufgabe_und_raster_gleich?power<0&&energy>0:null,
        hinweis:'Nur dokumentierte Abläufe. Ein Intervallmaximum ist keine kurzzeitige Spitze und keine Installationsfreigabe.'};
    },{gleichzeitig_wh:900,gestaffelt_wh:950,gleichzeitig_max_w:950,gestaffelt_max_w:780,aufgabe_und_raster_gleich:true},
    {delta_wh:50,delta_intervallmaximum_w:-170,zielkonflikt:true}),

  task('stromgruppe_arbeitspreis_stufe_zusatzauftrag',
    'Zusatzkosten zweier Aufgaben an einer belegten Mengenstufe abhängig von ihrer Reihenfolge aufschlüsseln — Attribute marginal task costs across a documented progressive usage threshold.',
    tariff,{
      freie_menge_erster_stufe_kwh:n('Im Zeitraum verbleibende Menge bis zur belegten Preisstufe.'),
      a_kwh:n('Gemessene zusätzliche Energiemenge für A.'), b_kwh:n('Gemessene zusätzliche Energiemenge für B.'),
      stufe_eins_cent:n('Preis der verbleibenden ersten Stufe in Cent/kWh.',0,1000),
      stufe_zwei_cent:n('Preis nur weiterer kWh ab der Grenze in Cent/kWh.',0,1000),
    },({freie_menge_erster_stufe_kwh,a_kwh,b_kwh,stufe_eins_cent,stufe_zwei_cent})=>{
      const cost=kwh=>(Math.min(kwh,freie_menge_erster_stufe_kwh)*stufe_eins_cent+max0(kwh-freie_menge_erster_stufe_kwh)*stufe_zwei_cent)/100;
      const total=cost(a_kwh+b_kwh);
      return {gesamt_euro:r(total),a_wenn_zuerst_euro:r(cost(a_kwh)),a_wenn_zweitens_euro:r(total-cost(b_kwh)),
        hinweis:'Nur eine progressive Mengenstaffel verwenden, bei der der höhere Abschnitt frühere Mengen nicht nachträglich neu bepreist.'};
    },{freie_menge_erster_stufe_kwh:2,a_kwh:3,b_kwh:2,stufe_eins_cent:20,stufe_zwei_cent:40},
    {gesamt_euro:1.6,a_wenn_zuerst_euro:0.8,a_wenn_zweitens_euro:1.2}),

  task('haushaltsgruppe_ersatzablauf_ohne_neuanteil',
    'Getrennte Alt- und Neugeräte-Aufgaben prüfen, wenn nur ein Teil der Haushaltsleistung wirklich ersetzt wurde — Compute observed energy change only for demonstrably displaced work.',
    efficiency,{
      alt_gesamt_wh:n('Frühere Energie des bisherigen Ablaufs für alle Aufgaben.'),
      alt_ersetzt_wh:n('Separat belegte frühere Energie genau der Aufgaben, die jetzt übernommen werden.'),
      neu_ersetzt_wh:n('Jetzt gemessene Energie für dieselben übernommenen Aufgaben.'),
      neu_zusatz_wh:n('Jetzt gemessene Energie für zusätzlich hinzugekommene Aufgaben.'),
      rest_weiter_gleich:yes('Wird der verbleibende alte Ablauf nachweislich gleich fortgeführt?'),
    },({alt_gesamt_wh,alt_ersetzt_wh,neu_ersetzt_wh,neu_zusatz_wh,rest_weiter_gleich})=>{
      if (alt_ersetzt_wh>alt_gesamt_wh) throw new RangeError();
      const delta=neu_ersetzt_wh-alt_ersetzt_wh;
      return {delta_ersetzte_aufgaben_wh:r(delta),neue_zusatzaufgaben_wh:neu_zusatz_wh,
        delta_in_gesamtablauf_wh:rest_weiter_gleich?r(delta+neu_zusatz_wh):null,
        hinweis:'Messwerte nur bei vergleichbarem Aufgabenergebnis. Zusatzdienste getrennt betrachten.'};
    },{alt_gesamt_wh:500,alt_ersetzt_wh:220,neu_ersetzt_wh:170,neu_zusatz_wh:90,rest_weiter_gleich:true},
    {delta_ersetzte_aufgaben_wh:-50,neue_zusatzaufgaben_wh:90,delta_in_gesamtablauf_wh:40}),

  task('geraetegruppe_aufgabenpaket_vollstaendigkeit',
    'Zwei Darstellungen gemeinsamer Leistung unterscheiden: fertige Aufgabenpakete und nicht nutzbare Überkapazität eines Einzelschritts — Infer full paired service from output counts only when pairing is verified.',
    drying,{
      a_fertig:n('Zahl abgeschlossener Einheiten des ersten Schritts.'),
      b_fertig:n('Zahl abgeschlossener Einheiten des zweiten Schritts.'),
      tatsaechlich_gepaart:n('Zahl belegter Einheiten, die nachweislich beide Schritte durchlaufen haben.'),
      gesamt_wh:n('Energie aller Schritte aus dem gemeinsamen Versuchsfenster.'),
    },({a_fertig,b_fertig,tatsaechlich_gepaart,gesamt_wh})=>{
      whole(a_fertig,b_fertig,tatsaechlich_gepaart);
      if (tatsaechlich_gepaart>Math.min(a_fertig,b_fertig)) throw new RangeError();
      return {nur_erster_schritt:a_fertig-tatsaechlich_gepaart,nur_zweiter_schritt:b_fertig-tatsaechlich_gepaart,
        bruttorate_wh_je_fertiges_paket:tatsaechlich_gepaart?r(gesamt_wh/tatsaechlich_gepaart):null,
        hinweis:'Bruttorate enthält auch Aufwand für Teilergebnisse; diese gegebenenfalls separat messen.'};
    },{a_fertig:8,b_fertig:7,tatsaechlich_gepaart:6,gesamt_wh:3000},
    {nur_erster_schritt:2,nur_zweiter_schritt:1,bruttorate_wh_je_fertiges_paket:500}),

  task('gruppenmessung_zwei_geraeteraten_identifizierbar',
    'Zwei unbekannte mittlere Geräteraten aus zwei Messfenstern mit verschiedenem Zeitmix auflösbar prüfen — Solve a two-window mixing model only when the operating profiles differ enough.',
    meter,{
      a_fenster_eins_h:n('Aktive Stunden von Gerät A im ersten Fenster.',0,168),
      b_fenster_eins_h:n('Aktive Stunden von Gerät B im ersten Fenster.',0,168),
      a_fenster_zwei_h:n('Aktive Stunden von A im zweiten Fenster.',0,168),
      b_fenster_zwei_h:n('Aktive Stunden von B im zweiten Fenster.',0,168),
      fenster_eins_wh:n('Gemeinsame aktive Energie beider Geräte ohne belegte Hintergrundenergie.'),
      fenster_zwei_wh:n('Gemeinsame aktive Energie ohne Hintergrundenergie im zweiten Fenster.'),
      raten_konstant_annahme:yes('Ist die Annahme unveränderter Geräteraten und Linearität begründet?'),
    },({a_fenster_eins_h,b_fenster_eins_h,a_fenster_zwei_h,b_fenster_zwei_h,fenster_eins_wh,fenster_zwei_wh,raten_konstant_annahme})=>{
      const determinant=a_fenster_eins_h*b_fenster_zwei_h-b_fenster_eins_h*a_fenster_zwei_h;
      if (!raten_konstant_annahme||Math.abs(determinant)<1e-6) return {status:'nicht_unterscheidbar',rate_a_w:null,rate_b_w:null};
      const a=(fenster_eins_wh*b_fenster_zwei_h-fenster_zwei_wh*b_fenster_eins_h)/determinant;
      const b=(a_fenster_eins_h*fenster_zwei_wh-a_fenster_zwei_h*fenster_eins_wh)/determinant;
      if (a<0||b<0) return {status:'mix_oder_messung_pruefen',rate_a_w:null,rate_b_w:null};
      return {status:'unter_annahme_aufgeloest',rate_a_w:r(a),rate_b_w:r(b),
        hinweis:'Ähnliche Mischungen reagieren empfindlich auf Fehler. Einzelmessung vorzuziehen, wenn die Annahmen unsicher sind.'};
    },{a_fenster_eins_h:2,b_fenster_eins_h:1,a_fenster_zwei_h:1,b_fenster_zwei_h:3,fenster_eins_wh:250,fenster_zwei_wh:250,raten_konstant_annahme:true},
    {status:'unter_annahme_aufgeloest',rate_a_w:100,rate_b_w:50}),

  task('stromgruppe_unbeobachtete_gemeinsamlast_erkennung',
    'Aus einem dokumentierten Zeitsaldo prüfen, ob unerwarteter Verbrauch sicher außerhalb beider bekannten Betriebsfenster vorkommt — Detect unexplained energy in recorded both-idle periods.',
    meter,{
      beide_ruhig_wh:n('Gemessene Energie in vollständig dokumentierten Phasen ohne aktive Nutzung beider Geräte.'),
      beide_ruhig_min:duration('Gesamtdauer dieser überschneidungsfreien Phasen.'),
      gruppenruhe_max_w:watts('Vergleichbar gemessene oder belegte gemeinsame obere Ruhestromrate mit allen bekannten Geräten.'),
      ruhe_belegt:yes('Sind Betriebszustände und Messumfang für diese Zeiten unabhängig bestätigt?'),
    },({beide_ruhig_wh,beide_ruhig_min,gruppenruhe_max_w,ruhe_belegt})=>{
      if (!beide_ruhig_min&&beide_ruhig_wh) throw new RangeError();
      const cap=gruppenruhe_max_w*beide_ruhig_min/60;
      return {bekannte_ruhe_ober_wh:ruhe_belegt?r(cap):null,zu_pruefender_rest_wh:ruhe_belegt?r(max0(beide_ruhig_wh-cap)):null,
        hinweis:'Abweichung zeigt einen Prüfzeitraum. Verdeckte geplante Nutzungen, Messfehler und unbekannte Lasten getrennt betrachten.'};
    },{beide_ruhig_wh:60,beide_ruhig_min:120,gruppenruhe_max_w:20,ruhe_belegt:true},
    {bekannte_ruhe_ober_wh:40,zu_pruefender_rest_wh:20}),

  task('wassergruppen_ueberlappung_mindestdurchfluss',
    'Bei einem protokollierten Mehrgeräteversuch prüfen, welche Nutzung nur während der Überlagerung unter ihrem gewählten Mindestdurchfluss lag — Compare individual solo and overlapping water flows against distinct task requirements.',
    shower,{
      a_allein_l_min:n('Vor Ort gemessener Durchfluss A ohne B.',0,100),
      b_allein_l_min:n('Vor Ort gemessener Durchfluss B ohne A.',0,100),
      a_parallel_l_min:n('Durchfluss A während desselben gemeinsamen Versuchsfensters.',0,100),
      b_parallel_l_min:n('Durchfluss B während desselben Fensters.',0,100),
      a_mindest_l_min:n('Selbst gewähltes Vergleichsminimum für Aufgabe A.',0,100),
      b_mindest_l_min:n('Selbst gewähltes Vergleichsminimum für Aufgabe B.',0,100),
    },({a_allein_l_min,b_allein_l_min,a_parallel_l_min,b_parallel_l_min,a_mindest_l_min,b_mindest_l_min})=>{
      const affected=[];
      if (a_allein_l_min>=a_mindest_l_min&&a_parallel_l_min<a_mindest_l_min) affected.push('A');
      if (b_allein_l_min>=b_mindest_l_min&&b_parallel_l_min<b_mindest_l_min) affected.push('B');
      return {nur_parallel_unter_ziel:affected,gemeinsam_summe_l_min:r(a_parallel_l_min+b_parallel_l_min),
        hinweis:'Gleiche Messpunkte, Einstellungen und echte gleichzeitige Ablesungen voraussetzen. Keine Aussage über Eignung der Installation.'};
    },{a_allein_l_min:8,b_allein_l_min:7,a_parallel_l_min:4,b_parallel_l_min:6,a_mindest_l_min:5,b_mindest_l_min:5},
    {nur_parallel_unter_ziel:['A'],gemeinsam_summe_l_min:10}),

  task('haushaltsaufgaben_verteilter_vorrat_teilbar',
    'Gemeinsamen zulässigen Nachfüllvorrat ausweisen, wenn zwei vorhandene Bestände nur ihrer jeweiligen Aufgabe dienen — Reserve enough shared refill water after respecting non-transferable supplies.',
    workshop,{
      bedarf_a_l:n('Gemessener Wasserbedarf der Aufgabe A.'), bedarf_b_l:n('Gemessener Wasserbedarf von B.'),
      nur_a_l:n('Schon vorhandener, ausschließlich für A freigegebener Vorrat.'),
      nur_b_l:n('Schon vorhandener, ausschließlich für B freigegebener Vorrat.'),
      flexibel_l:n('Vorab geprüfter, beliebig teilbarer Vorrat für beide Aufgaben.'),
    },({bedarf_a_l,bedarf_b_l,nur_a_l,nur_b_l,flexibel_l})=>{
      const a=max0(bedarf_a_l-nur_a_l);
      const b=max0(bedarf_b_l-nur_b_l);
      return {flexibel_verbraucht_min_l:r(a+b),fehlmenge_l:r(max0(a+b-flexibel_l)),
        rest_nicht_uebertragbar_l:r(max0(nur_a_l-bedarf_a_l)+max0(nur_b_l-bedarf_b_l)),
        hinweis:'Nur bereits geeignete Wasservorräte und erlaubte Nutzung abgleichen.'};
    },{bedarf_a_l:5,bedarf_b_l:6,nur_a_l:9,nur_b_l:1,flexibel_l:4},
    {flexibel_verbraucht_min_l:5,fehlmenge_l:1,rest_nicht_uebertragbar_l:4}),

  task('raumgeraete_heizen_kuehlen_gegenarbeit_messung',
    'Gleichzeitig gemessene Heiz- und Kühlwirkung im selben Kontrollraum als thermische Gegenarbeit aufschlüsseln — Quantify balanced opposing thermal output during one verified overlap window.',
    heating,{
      heiz_abgegeben_kwh:n('Gemessene abgegebene Wärme ausschließlich im Überlappungsfenster.'),
      kuehl_abgefuehrt_kwh:n('Gemessene abgeführte Wärme ausschließlich im selben Fenster.'),
      zusammen_strom_kwh:n('Gemessener Stromverbrauch beider Geräte im selben Fenster.'),
      gemeinsame_raumgrenze:yes('Betreffen die Wärmemengen denselben abgeschlossenen Messbereich, ohne Latentwärme oder doppelte Messung?'),
    },({heiz_abgegeben_kwh,kuehl_abgefuehrt_kwh,zusammen_strom_kwh,gemeinsame_raumgrenze})=>{
      return {thermisch_gegengerichtet_kwh:gemeinsame_raumgrenze?r(Math.min(heiz_abgegeben_kwh,kuehl_abgefuehrt_kwh)):null,
        thermisch_netto_heizen_kwh:gemeinsame_raumgrenze?r(heiz_abgegeben_kwh-kuehl_abgefuehrt_kwh):null,
        strom_beobachtet_kwh:zusammen_strom_kwh,
        hinweis:'Beschreibt Teilwirkungen, keine erreichbare Einsparung oder vollständige Gebäudeenergiebilanz.'};
    },{heiz_abgegeben_kwh:3,kuehl_abgefuehrt_kwh:2,zusammen_strom_kwh:2.1,gemeinsame_raumgrenze:true},
    {thermisch_gegengerichtet_kwh:2,thermisch_netto_heizen_kwh:1,strom_beobachtet_kwh:2.1}),

  task('raumgeraetekombination_zwei_zielquoten',
    'Zwei gemessene Betriebsvarianten mit je zwei tatsächlich erreichten Raumzielen auswerten — Compare energy only across modes meeting both measured room outcomes.',
    cooling,{
      a_komfort_h:n('Komfortstunden im Temperaturzielband unter Variante A.',0,168), b_komfort_h:n('Komfortstunden im Zielband unter Variante B.',0,168),
      a_feuchte_h:n('Stunden im eigenen Feuchtezielband unter A.',0,168), b_feuchte_h:n('Stunden im Zielband unter B.',0,168),
      ziel_beide_h:n('Geforderte Stunden je Ziel, getrennt bewertet.',0,168),
      a_wh:n('Energie der vollständigen Variante A.'), b_wh:n('Energie der vollständigen Variante B.'),
      fenster_und_ort_gleich:yes('Sind Dauer, Messeinstellungen, Raumaufgabe und Ausgangsbedingungen vergleichbar?'),
    },({a_komfort_h,b_komfort_h,a_feuchte_h,b_feuchte_h,ziel_beide_h,a_wh,b_wh,fenster_und_ort_gleich})=>{
      if (!fenster_und_ort_gleich) return {auswertbar:false,vergleich:null};
      const a=Math.min(a_komfort_h,a_feuchte_h)>=ziel_beide_h;
      const b=Math.min(b_komfort_h,b_feuchte_h)>=ziel_beide_h;
      return {auswertbar:true,a_erfuellt_beide_quoten:a,b_erfuellt_beide_quoten:b,
        gemeinsam_zielgerecht_delta_wh:a&&b?r(b_wh-a_wh):null,
        hinweis:'Bewertet die Mindeststunden je Ziel separat. Belegt keine gleichzeitige Einhaltung beider Zielbänder in jeder Einzelstunde.'};
    },{a_komfort_h:5,b_komfort_h:6,a_feuchte_h:4,b_feuchte_h:5,ziel_beide_h:5,a_wh:600,b_wh:680,fenster_und_ort_gleich:true},
    {auswertbar:true,a_erfuellt_beide_quoten:false,b_erfuellt_beide_quoten:true,gemeinsam_zielgerecht_delta_wh:null}),

  task('entfeuchtung_sammelsystem_beide_wege_abgleich',
    'Gemeinsame Kondensatmessung mit getrennt beobachtetem Tank- und Schlauchanteil abgleichen — Reconcile asynchronous collection paths without silently ignoring a differing observation window.',
    cellar,{
      sammlung_gesamt_l:n('Unabhängig belegte Gesamtmenge aus beiden Geräten oder Erfassungswegen im Messfenster.',0,1000),
      tank_l:n('Separat erfasster Tankanteil im Messfenster.',0,1000),
      schlauch_l:n('Separat erfasste Kondensatmenge im Schlauchweg im Messfenster.',0,1000),
      transfer_l:n('Davon nachweislich bereits im Tank gezählte und anschließend nochmals im Schlauchweg erfasste Menge.',0,1000),
      gleicher_stichtag:yes('Gleiche Zeitgrenzen und vollständige Berücksichtigung etwaiger Restmengen an beiden Wegen?'),
    },({sammlung_gesamt_l,tank_l,schlauch_l,transfer_l,gleicher_stichtag})=>{
      if (transfer_l>Math.min(tank_l,schlauch_l)) throw new RangeError();
      const net=tank_l+schlauch_l-transfer_l;
      return {eindeutig_erfasst_l:gleicher_stichtag?r(net):null,gesamt_minus_wege_l:gleicher_stichtag?r(sammlung_gesamt_l-net):null,
        doppelt_erfasst_l:transfer_l,hinweis:'Nur bekannte Aufzeichnungen bilanzieren. Für eine Installation gilt die Geräteanleitung.'};
    },{sammlung_gesamt_l:5,tank_l:3,schlauch_l:2.8,transfer_l:1,gleicher_stichtag:true},
    {eindeutig_erfasst_l:4.8,gesamt_minus_wege_l:0.2,doppelt_erfasst_l:1}),

  task('geraetegruppe_energievorteil_verbrauchsmaterial_ausgleich',
    'Zwei beobachtete Geräteabläufe mit gleicher Aufgabe anhand zusätzlicher Verbrauchsmaterialkosten und Strommenge vergleichen — Determine when material overhead offsets a measured energy advantage.',
    efficiency,{
      a_kwh:n('Gemessener Stromverbrauch des ersten vollständigen Ablaufs.'),
      b_kwh:n('Gemessener Stromverbrauch des zweiten vollständigen Ablaufs.'),
      a_material_euro:n('Tatsächlich angewandter Materialeinsatz, bewertet mit dem eigenen belegten Preis.'),
      b_material_euro:n('Entsprechend belegter Materialeinsatz im zweiten Ablauf.'),
      preis_cent_kwh:n('Derselbe dokumentierte Arbeitspreis in Cent/kWh.',0,1000),
      leistung_gleich:yes('Wurde ein gleiches, vorab festgelegtes Arbeitsergebnis erreicht?'),
    },({a_kwh,b_kwh,a_material_euro,b_material_euro,preis_cent_kwh,leistung_gleich})=>{
      const power=(b_kwh-a_kwh)*preis_cent_kwh/100;
      const material=b_material_euro-a_material_euro;
      return {delta_strom_euro:leistung_gleich?r(power):null,delta_material_euro:leistung_gleich?r(material):null,
        delta_beobachtete_laufkosten_euro:leistung_gleich?r(power+material):null,
        stromvorteil_durch_material_aufgebraucht:leistung_gleich?power<0&&power+material>=0:null,
        hinweis:'Nur direkt dokumentierte variable Kosten. Keine Annahmen über Lebensdauer, Reparatur oder künftige Preise.'};
    },{a_kwh:2,b_kwh:1,a_material_euro:0.2,b_material_euro:0.8,preis_cent_kwh:35,leistung_gleich:true},
    {delta_strom_euro:-0.35,delta_material_euro:0.6,delta_beobachtete_laufkosten_euro:0.25,stromvorteil_durch_material_aufgebraucht:true}),

  task('geraetefolge_teilpuffer_nach_lieferung',
    'Zwei Gerätedurchgänge gegen einen konkret belegten Zwischenbestand und die nächste gleichartige Nachlieferung prüfen — Test a staged production buffer while keeping both timed resource commitments visible.',
    workshop,{
      puffer_anfang:n('Nutzbare Einheiten am Anfang.'),
      a_entnimmt:n('Gemessener Bedarf für die erste Aufgabe.'),
      neu_nach_a:n('Verlässlich nach A und vor B ankommende weitere Einheiten.'),
      b_entnimmt:n('Gemessener Bedarf für die zweite Aufgabe.'),
      mindestrest:n('Vereinbarter Mindestbestand nach der zweiten Aufgabe.'),
    },({puffer_anfang,a_entnimmt,neu_nach_a,b_entnimmt,mindestrest})=>{
      whole(puffer_anfang,a_entnimmt,neu_nach_a,b_entnimmt,mindestrest);
      const a= puffer_anfang-a_entnimmt;
      const b= a+neu_nach_a-b_entnimmt;
      return {erster_rechnerischer_engpass:a<0?'beim_ersten_durchgang':b<0?'beim_zweiten_durchgang':b<mindestrest?'beim_mindestrest':null,
        vor_erstem_durchgang_noetige_zusatzeinheiten:Math.max(0,-a,mindestrest-b),
        hinweis:'Vorausgesetzt wird ein identischer, zulässiger Vorrat für beide Aufgaben und keine andere Nutzung.'};
    },{puffer_anfang:7,a_entnimmt:8,neu_nach_a:5,b_entnimmt:4,mindestrest:3},
    {erster_rechnerischer_engpass:'beim_ersten_durchgang',vor_erstem_durchgang_noetige_zusatzeinheiten:3}),

  task('stromgruppe_steuergeraet_weckvorgaenge_abgleich',
    'Gemessene Weckvorgänge und einzeln dokumentierte Befehle gegenüberstellen, wenn ein Aufwecken mehrere Befehle bedient — Audit which shared controller wakeups replaced repeated wake events.',
    efficiency,{
      befehle_a:n('Zahl der protokollierten Anforderungen von Gerät A.'),
      befehle_b:n('Zahl der protokollierten Anforderungen von Gerät B.'),
      ohne_wecken_allein:n('Zahl einzeln protokollierter Anforderungen während bereits laufender Dauerphasen, ohne gemeinsamen Weckvorgang.'),
      weckvorgaenge:n('Gemessene Weckvorgänge, jeweils ausgelöst durch mindestens eine der übrigen Anforderungen.'),
      weckenergie_wh:n('Gemessene Gesamtenergie der abgegrenzten Weckvorgänge.'),
    },({befehle_a,befehle_b,ohne_wecken_allein,weckvorgaenge,weckenergie_wh})=>{
      whole(befehle_a,befehle_b,ohne_wecken_allein,weckvorgaenge);
      const eligible=befehle_a+befehle_b-ohne_wecken_allein;
      if (eligible<weckvorgaenge||(!weckvorgaenge&&(weckenergie_wh||eligible))) throw new RangeError();
      return {weitere_befehle_im_selben_weckzyklus:eligible-weckvorgaenge,gemessene_wh_pro_weckvorgang:weckvorgaenge?r(weckenergie_wh/weckvorgaenge):null,
        hinweis:'Nur vollständig verknüpfte Protokolle desselben Steuergeräts. Einzelne mehrteilige Befehle vorher zusammenfassen.'};
    },{befehle_a:7,befehle_b:5,ohne_wecken_allein:3,weckvorgaenge:6,weckenergie_wh:12},
    {weitere_befehle_im_selben_weckzyklus:3,gemessene_wh_pro_weckvorgang:2}),

  task('raumgeraete_komfortquote_schnittmenge_band',
    'Schranken für gemeinsamen Temperatur- und Feuchtekomfort aus zwei getrennt ausgewiesenen Zeitanteilen gewinnen — Bound simultaneous target time when paired measurements were not retained.',
    cooling,{
      gesamt_min:duration('Vollständig erfasste Dauer auf gemeinsamer Zeitachse.',1),
      temperaturziel_min:duration('Dauer im eigenen Temperaturband.'),
      feuchteziel_min:duration('Dauer im eigenen Feuchteband.'),
      gemeinsames_ziel_min:duration('Vereinbarte Mindestdauer mit gleichzeitiger Erfüllung beider Ziele.'),
      zeitbasis_gleich:yes('Sind beide Dauerangaben vollständig und auf exakt dasselbe Zeitfenster bezogen?'),
    },({gesamt_min,temperaturziel_min,feuchteziel_min,gemeinsames_ziel_min,zeitbasis_gleich})=>{
      if (!zeitbasis_gleich) return {minimum_beide_min:null,maximum_beide_min:null,status:'zeitbezug_offen'};
      if (Math.max(temperaturziel_min,feuchteziel_min)>gesamt_min) throw new RangeError();
      const lower=max0(temperaturziel_min+feuchteziel_min-gesamt_min);
      const upper=Math.min(temperaturziel_min,feuchteziel_min);
      return {minimum_beide_min:r(lower),maximum_beide_min:r(upper),
        status:lower>=gemeinsames_ziel_min?'mindestziel_rechnerisch_erfuellt':upper<gemeinsames_ziel_min?'mindestziel_nicht_erreichbar':'paarung_offen',
        hinweis:'Die Schranken zeigen keine konkrete Phase gemeinsamen Komforts.'};
    },{gesamt_min:120,temperaturziel_min:85,feuchteziel_min:75,gemeinsames_ziel_min:60,zeitbasis_gleich:true},
    {minimum_beide_min:40,maximum_beide_min:75,status:'paarung_offen'}),

  task('haushaltskreislauf_zwei_endpunkte_eine_messung',
    'Prüfen, ob eine Effizienzbewertung am Ende des ersten Geräts den späteren Ressourcenbedarf des fertigen Auftrags übersieht — Compare intermediate and complete workflow rankings with measured follow-on consumption.',
    drying,{
      a_erster_wh:n('Gemessene Energie des ersten Abschnitts von Ablauf A.'),
      a_folge_wh:n('Weitere gemessene Energie bis zum identischen Ziel in Ablauf A.'),
      b_erster_wh:n('Gemessene Energie des ersten Abschnitts von Ablauf B.'),
      b_folge_wh:n('Weitere gemessene Energie bis zum Ziel in Ablauf B.'),
      ziel_bestaetigt:yes('Sind Menge, gewünschter Endzustand und vollständiger Verbrauch für beide Abläufe belegt?'),
    },({a_erster_wh,a_folge_wh,b_erster_wh,b_folge_wh,ziel_bestaetigt})=>{
      if (!ziel_bestaetigt) return {rang_wechselt:null,gesamt_delta_wh:null};
      const first=b_erster_wh-a_erster_wh;
      const all=first+b_folge_wh-a_folge_wh;
      return {rang_wechselt:first*all<0,erster_delta_wh:r(first),gesamt_delta_wh:r(all),
        hinweis:'Ein nur früher sichtbarer Stromvorteil beschreibt keine vollständige Aufgabe.'};
    },{a_erster_wh:300,a_folge_wh:500,b_erster_wh:450,b_folge_wh:150,ziel_bestaetigt:true},
    {rang_wechselt:true,erster_delta_wh:150,gesamt_delta_wh:-200}),

  task('stromgruppe_drei_paare_messziel',
    'Drei mögliche Gerätepaare gegen ein selbst gewähltes Messziel unter bereits beobachteter Hintergrundlast vergleichen — List the pairs within a budgeting target for interval-average power.',
    meter,{
      a_w:watts('Vergleichbar gemessene mittlere Last von A.'), b_w:watts('Mittlere Last von B.'),
      c_w:watts('Mittlere Last von C.'), rest_w:watts('Separat gemessene zusätzliche Hintergrundlast.'),
      messziel_w:watts('Eigenes Auswertungsziel für die modellierte mittlere Last, kein elektrischer Grenzwert.'),
      additiv_belegt:yes('Sind die Eingaben vom gleichen Messraster und ist eine additive Modellrechnung hier begründet?'),
    },({a_w,b_w,c_w,rest_w,messziel_w,additiv_belegt})=>{
      if (!additiv_belegt) return {paare_im_messziel:null};
      const pairs=[['AB',a_w+b_w],['AC',a_w+c_w],['BC',b_w+c_w]];
      return {paare_im_messziel:pairs.filter(([,sum])=>sum+rest_w<=messziel_w+1e-9).map(([pair])=>pair),
        kleinstes_paar_mit_rest_w:r(rest_w+Math.min(...pairs.map(([,sum])=>sum))),
        hinweis:'Nur mittlere Modellleistung für eine Messauswertung. Keine Aussage über Anschluss, Stromkreis, Anschlussleisten oder kurzzeitige Spitzen.'};
    },{a_w:300,b_w:200,c_w:600,rest_w:50,messziel_w:850,additiv_belegt:true},
    {paare_im_messziel:['AB','BC'],kleinstes_paar_mit_rest_w:550}),

  task('gruppenmessung_stichprobe_anteil_betriebsprofile',
    'Aus getrennt beobachteten Geräteanteilen für zwei Betriebsprofile einen belegten Gesamtanteil rekonstruieren — Weight device shares by aggregate energy in the matching profiles.',
    meter,{
      a_gruppe_wh:n('Gemessene Gesamtenergie des gesamten Profils A.'),
      b_gruppe_wh:n('Gemessene Gesamtenergie des gesamten Profils B.'),
      a_geraet_prozent:n('Repräsentativ einzeln gemessener Geräteanteil innerhalb von Profil A.',0,100),
      b_geraet_prozent:n('Entsprechend belegter Geräteanteil innerhalb von Profil B.',0,100),
      stichproben_passend:yes('Sind beide Stichproben für ihr Profil belegt und überschneiden sich die Profile nicht?'),
    },({a_gruppe_wh,b_gruppe_wh,a_geraet_prozent,b_geraet_prozent,stichproben_passend})=>{
      const sum=a_gruppe_wh+b_gruppe_wh;
      if (!sum||!stichproben_passend) return {gewichteter_geraeteanteil_prozent:null,geraete_wh_hochgerechnet:null};
      const weighted=(a_gruppe_wh*a_geraet_prozent+b_gruppe_wh*b_geraet_prozent)/sum;
      return {gewichteter_geraeteanteil_prozent:r(weighted),geraete_wh_hochgerechnet:r(weighted*sum/100),
        hinweis:'Anteile anhand der tatsächlich für jedes Profil erfassten Energiemenge gewichten. Als Hochrechnung kennzeichnen.'};
    },{a_gruppe_wh:200,b_gruppe_wh:800,a_geraet_prozent:70,b_geraet_prozent:20,stichproben_passend:true},
    {gewichteter_geraeteanteil_prozent:30,geraete_wh_hochgerechnet:300}),

  task('geraetepool_ausfall_uebernahme_exklusiv',
    'Nach einem Geräteausfall prüfen, wie viele dokumentierte Aufgaben das verbleibende Gerät tatsächlich übernehmen kann — Recover only interchangeable work from a measured failed-device backlog.',
    workshop,{
      a_nur_ausgefallen:n('Noch offene Aufgaben, die nur am ausgefallenen Gerät erledigt werden können.'),
      a_verlagerbar:n('Noch offene Aufgaben, die laut bestätigtem Ablauf beide Geräte erledigen können.'),
      b_eigenbelegung_min:duration('Belegte Zeit des verbleibenden Geräts für seine eigenen Aufgaben.'),
      b_verfuegbar_min:duration('Tatsächlich nutzbare Gesamtzeit des verbleibenden Geräts.'),
      dauer_uebernahme_min:duration('Vollständig gemessene Dauer je übernommener Aufgabe am verbleibenden Gerät.',0.001),
    },({a_nur_ausgefallen,a_verlagerbar,b_eigenbelegung_min,b_verfuegbar_min,dauer_uebernahme_min})=>{
      whole(a_nur_ausgefallen,a_verlagerbar);
      const spare=max0(b_verfuegbar_min-b_eigenbelegung_min);
      const reassigned=Math.min(a_verlagerbar,Math.floor((spare+1e-9)/dauer_uebernahme_min));
      return {uebernehmbar:reassigned,uebertragbar_aber_offen:a_verlagerbar-reassigned,
        ausschliesslich_ausgefallen_offen:a_nur_ausgefallen,fehlende_eigenzeit_min:r(max0(b_eigenbelegung_min-b_verfuegbar_min)),
        hinweis:'Nur bestätigte Wechselaufgaben. Zusammenhängende tatsächlich verfügbare Zeit und freigegebene Geräteverwendung prüfen.'};
    },{a_nur_ausgefallen:4,a_verlagerbar:6,b_eigenbelegung_min:40,b_verfuegbar_min:100,dauer_uebernahme_min:22},
    {uebernehmbar:2,uebertragbar_aber_offen:4,ausschliesslich_ausgefallen_offen:4,fehlende_eigenzeit_min:0}),

  task('geraetegruppe_zubehoer_symptom_wandert',
    'Mit einem bereits dokumentierten freigegebenen Tausch zweier Zubehörteile prüfen, ob ein Befund mit dem Teil oder Gerät verbunden blieb — Classify a recorded cross-swap without assuming it proves a component defect.',
    purifier,{
      a_vorher_auffaellig:yes('War Gerät A ursprünglich mit seinem eigenen Zubehörteil auffällig?'),
      b_vorher_auffaellig:yes('War Gerät B ursprünglich mit seinem eigenen Zubehörteil auffällig?'),
      a_nachher_auffaellig:yes('War A nach dem dokumentierten Tausch mit dem früheren Teil von B auffällig?'),
      b_nachher_auffaellig:yes('War B nach dem dokumentierten Tausch mit dem früheren Teil von A auffällig?'),
      vergleich_bestaetigt:yes('Sind Zubehör für beide Geräte freigegeben, vollständiger Tausch, gleiche Aufgabe und dasselbe Befundkriterium belegt?'),
    },({a_vorher_auffaellig,b_vorher_auffaellig,a_nachher_auffaellig,b_nachher_auffaellig,vergleich_bestaetigt})=>{
      if (!vergleich_bestaetigt||a_vorher_auffaellig===b_vorher_auffaellig) return {befund:'vergleich_offen'};
      if (a_nachher_auffaellig===b_nachher_auffaellig) return {befund:'nach_tausch_nicht_eindeutig'};
      return {befund:a_nachher_auffaellig===a_vorher_auffaellig?'bleibt_am_geraet':'wandert_mit_zubehoer',
        urspruenglich_auffaellig:a_vorher_auffaellig?'A':'B',
        hinweis:'Beschreibt den beobachteten Verlauf. Kein Defektnachweis und keine Anleitung zum Umbau oder Austausch.'};
    },{a_vorher_auffaellig:true,b_vorher_auffaellig:false,a_nachher_auffaellig:false,b_nachher_auffaellig:true,vergleich_bestaetigt:true},
    {befund:'wandert_mit_zubehoer',urspruenglich_auffaellig:'A'}),

  task('heizgruppe_gemeinsame_waerme_laufmittel',
    'Zwei gleichzeitig arbeitende Wärmequellen als gemeinsam gemessene Wärme pro Eingangsenergie auswerten — Combine unequal input energies and outputs without averaging two individual ratios.',
    heating,{
      a_eingang_kwh:n('Separat gemessene zugeführte Energie A im vollständigen gemeinsamen Abschnitt.'),
      b_eingang_kwh:n('Separat gemessene zugeführte Energie B im selben Abschnitt.'),
      a_nutzwaerme_kwh:n('Nutzwärme A an ihrer bestätigten Messgrenze.'),
      b_nutzwaerme_kwh:n('Nutzwärme B an ihrer bestätigten Messgrenze.'),
      abgabe_distinkt:yes('Keine zusätzliche Zählung derselben Wärme durch das zweite Gerät und gleiche Zeitgrenzen?'),
    },({a_eingang_kwh,b_eingang_kwh,a_nutzwaerme_kwh,b_nutzwaerme_kwh,abgabe_distinkt})=>{
      const input=a_eingang_kwh+b_eingang_kwh;
      if (!abgabe_distinkt||!input||(!a_eingang_kwh&&a_nutzwaerme_kwh)||(!b_eingang_kwh&&b_nutzwaerme_kwh)) return {gemeinsamer_messquotient:null};
      return {gemeinsamer_messquotient:r((a_nutzwaerme_kwh+b_nutzwaerme_kwh)/input),
        anteil_b_eingang_prozent:r(100*b_eingang_kwh/input),
        hinweis:'Rechnerischer Quotient der beobachteten Messgrenzen; kein Jahreswert und keine Gerätespezifikation.'};
    },{a_eingang_kwh:1,b_eingang_kwh:3,a_nutzwaerme_kwh:3,b_nutzwaerme_kwh:3,abgabe_distinkt:true},
    {gemeinsamer_messquotient:1.5,anteil_b_eingang_prozent:75}),

  task('haushaltsgeraete_zeitversatz_teilzustellung',
    'Bei gemeinsamer Aufgabe mit erst später verfügbarem Zwischenprodukt ausweisen, wie viele Teile das Folgegerät rechtzeitig bearbeiten kann — Schedule a second-stage batch with a separate confirmed partial release.',
    drying,{
      erste_charge_um_min:duration('Zeitpunkt, zu dem ein Teil vollständig für den zweiten Schritt freigegeben ist.'),
      erste_charge_stueck:n('Zahl der an diesem ersten Zeitpunkt tatsächlich nutzbaren Stücke.'),
      rest_charge_um_min:duration('Späterer bestätigter Zeitpunkt für die übrigen Stücke.'),
      rest_charge_stueck:n('Zahl der später verfügbaren Stücke.'),
      je_stueck_min:duration('Beobachtete Zeit je Stück im festen zweiten Ablauf.',0.001),
      frist_min:duration('Gewünschter Fertigzeitpunkt auf derselben Achse.'),
    },({erste_charge_um_min,erste_charge_stueck,rest_charge_um_min,rest_charge_stueck,je_stueck_min,frist_min})=>{
      whole(erste_charge_stueck,rest_charge_stueck);
      if (rest_charge_um_min<erste_charge_um_min) throw new RangeError();
      const first=Math.min(erste_charge_stueck,Math.floor(max0(Math.min(rest_charge_um_min,frist_min)-erste_charge_um_min)/je_stueck_min));
      const unlock=Math.max(rest_charge_um_min,erste_charge_um_min+first*je_stueck_min);
      const later=Math.min(erste_charge_stueck-first+rest_charge_stueck,Math.floor(max0(frist_min-unlock)/je_stueck_min));
      return {fertig_vor_zweiter_freigabe:first,fertig_nach_zweiter_freigabe:later,
        bis_frist_gesamt:first+later,offen_bei_frist:erste_charge_stueck+rest_charge_stueck-first-later,
        hinweis:'Dieses Protokoll sieht vor der zweiten Freigabe nur vollständige Zyklen vor. Zeit für weitere Handgriffe gegebenenfalls ergänzen.'};
    },{erste_charge_um_min:10,erste_charge_stueck:4,rest_charge_um_min:35,rest_charge_stueck:4,je_stueck_min:10,frist_min:75},
    {fertig_vor_zweiter_freigabe:2,fertig_nach_zweiter_freigabe:4,bis_frist_gesamt:6,offen_bei_frist:2}),

  task('stromgruppe_zeitreihe_hoechstwert_nicht_addieren',
    'Gemessene Einzelmaxima von zwei Geräten nur dann zu einem gemeinsamen Messwert verbinden, wenn die Spitzen tatsächlich denselben Abschnitt betreffen — Verify coincidence before interpreting summed individual peaks.',
    meter,{
      a_max_w:watts('Gemessenes Höchst-Intervallmittel A.'), b_max_w:watts('Gemessenes Höchst-Intervallmittel B.'),
      a_max_index:n('Index eines Intervalls mit dem Höchstwert von A.'),
      b_max_index:n('Index eines Intervalls mit dem Höchstwert von B.'),
      summenmaximum_w:watts('Unabhängig aufgezeichnetes Maximum nur der Summe beider Geräte, auf demselben Raster.'),
      raster_gleich:yes('Sind Zeitgrenzen, Ausrichtung und Messdefinition für alle Werte gleich?'),
    },({a_max_w,b_max_w,a_max_index,b_max_index,summenmaximum_w,raster_gleich})=>{
      whole(a_max_index,b_max_index);
      if (!raster_gleich) return {maxima_gleichzeitig:null,delta_zur_summe_einzelmaxima_w:null};
      const aligned=a_max_index===b_max_index;
      const delta=a_max_w+b_max_w-summenmaximum_w;
      const gleiche_spitze=Math.abs(delta)<=1e-9;
      const auffaellig=delta< -1e-9||summenmaximum_w+1e-9<Math.max(a_max_w,b_max_w)||(aligned&&!gleiche_spitze);
      return {maxima_gleichzeitig:auffaellig?null:gleiche_spitze,angegebene_maxstellen_gleich:aligned,
        delta_zur_summe_einzelmaxima_w:r(delta),auffaellig,
        hinweis:'Für dieselben Messintervalle und nichtnegative Einzellasten ohne weitere Lasten. Unterschiedliche markierte Intervalle lassen gemeinsame Höchstwerte bei Plateaus zu. Messauflösung separat prüfen. Keine elektrische Freigabe.'};
    },{a_max_w:700,b_max_w:500,a_max_index:0,b_max_index:1,summenmaximum_w:1200,raster_gleich:true},
    {maxima_gleichzeitig:true,angegebene_maxstellen_gleich:false,delta_zur_summe_einzelmaxima_w:0,auffaellig:false}),

  task('gruppenbetrieb_doppelbelegung_stueckverdraengung',
    'Bei einem gemeinsamen Arbeitsbereich dokumentierte Doppelstarts von gleichzeitig tatsächlich nutzbaren Arbeitsplätzen unterscheiden — Measure output lost to overlapping equipment occupancy while respecting confirmed work positions.',
    workshop,{
      a_starts:n('Tatsächlich protokollierte Aufgabenstarts von A.'),
      b_starts:n('Tatsächlich protokollierte Aufgabenstarts von B.'),
      doppelte_startpaare:n('Nicht überlappende Paare von Starts desselben Durchgangs.'),
      platzbedingt_abgebrochen:n('Bestätigte Paare, in denen genau ein Start wegen des gemeinsamen Platzes abgebrochen wurde.'),
    },({a_starts,b_starts,doppelte_startpaare,platzbedingt_abgebrochen})=>{
      whole(a_starts,b_starts,doppelte_startpaare,platzbedingt_abgebrochen);
      if (doppelte_startpaare>Math.min(a_starts,b_starts)||platzbedingt_abgebrochen>doppelte_startpaare) throw new RangeError();
      return {starts_ohne_gleichzeitiges_paar:a_starts+b_starts-2*doppelte_startpaare,
        starts_nach_bestaetigten_abbruechen:a_starts+b_starts-platzbedingt_abgebrochen,
        anteil_paare_mit_abbruch_prozent:doppelte_startpaare?r(100*platzbedingt_abgebrochen/doppelte_startpaare):null,
        hinweis:'Aus den verbliebenen Starts folgt keine bestätigte Fertigstellung.'};
    },{a_starts:9,b_starts:6,doppelte_startpaare:5,platzbedingt_abgebrochen:2},
    {starts_ohne_gleichzeitiges_paar:5,starts_nach_bestaetigten_abbruechen:13,anteil_paare_mit_abbruch_prozent:40}),

  task('klimageraete_waermeeintrag_im_kuehlraum_einordnen',
    'Bei Raumkühlung gemessene elektrische Zusatzlast innerhalb der Kühlzone von Lasten außerhalb abgrenzen — Compare a justified indoor waste-heat contribution with measured sensible cooling.',
    cooling,{
      innere_geraete_kwh:n('Gemessene elektrische Energie der betrachteten Zusatzgeräte innerhalb der Zone.'),
      lokal_waermeanteil_prozent:n('Für diese Nutzung belegter, im Raum verbleibender Wärmeanteil.',0,100),
      ausserhalb_kwh:n('Separat erfasste elektrische Geräteenergie außerhalb der Kühlzone.'),
      kuehlwaerme_kwh:n('Gemessene sensible abgeführte Wärme im selben Fenster.'),
      messgrenze_belegt:yes('Gleicher Zeitraum; die betrachteten Geräte sind in der abgeführten Wärme bilanziell erfassbar?'),
    },({innere_geraete_kwh,lokal_waermeanteil_prozent,ausserhalb_kwh,kuehlwaerme_kwh,messgrenze_belegt})=>{
      const heat=innere_geraete_kwh*lokal_waermeanteil_prozent/100;
      return {waerme_im_raum_kwh:messgrenze_belegt?r(heat):null,ausserhalb_separat_kwh:ausserhalb_kwh,
        anteil_an_gemessener_kuehlwaerme_prozent:messgrenze_belegt&&kuehlwaerme_kwh?r(100*heat/kuehlwaerme_kwh):null,
        hinweis:'Nur beobachtete Raumgrenze; Lüftung, Sonnenwärme und zeitliche Speicherung bleiben getrennt.'};
    },{innere_geraete_kwh:1,lokal_waermeanteil_prozent:60,ausserhalb_kwh:0.5,kuehlwaerme_kwh:2.4,messgrenze_belegt:true},
    {waerme_im_raum_kwh:0.6,ausserhalb_separat_kwh:0.5,anteil_an_gemessener_kuehlwaerme_prozent:25}),

  task('stromgruppe_restaufgaben_preiskappung_minimalkosten',
    'Unteilbare gemessene Aufträge einem begrenzt günstigen Energieblock zuordnen, dessen Restmenge auch ungenutzt bleiben darf — Optimize two all-or-nothing reservations when cheap capacity is scarce.',
    tariff,{
      guenstig_rest_kwh:n('Verbleibende Energie im bereits freigegebenen günstigen Nutzungsblock.'),
      a_kwh:n('Vollständig dokumentierter Energiebedarf des unteilbaren Auftrags A.',0.001),
      b_kwh:n('Vollständig dokumentierter Energiebedarf des unteilbaren Auftrags B.',0.001),
      guenstig_cent:n('Belegter Preis im günstigen Block in Cent/kWh.',0,1000),
      spaeter_cent:n('Belegter späterer Preis in Cent/kWh.',0,1000),
      zeitlich_machbar:yes('Sind beide Buchungen einzeln zeitlich machbar und gemeinsam machbar, falls die Menge reicht?'),
    },({guenstig_rest_kwh,a_kwh,b_kwh,guenstig_cent,spaeter_cent,zeitlich_machbar})=>{
      if (!zeitlich_machbar) return {auswahl_guenstig:null};
      const options=[['keiner',0],['A',a_kwh],['B',b_kwh],['beide',a_kwh+b_kwh]].filter(([,usage])=>usage<=guenstig_rest_kwh+1e-9);
      const margin=(spaeter_cent-guenstig_cent)/100;
      const best=Math.max(...options.map(([,usage])=>usage*margin));
      return {auswahl_guenstig:options.filter(([,usage])=>Math.abs(usage*margin-best)<1e-9).map(([option])=>option),
        euro_gegen_nur_spaeter:r(best),
        hinweis:'Vorausgesetzt werden vergleichbare vollständige Aufträge und rechtzeitig erlaubte Nutzungszeit. Energieblock ist keine Anschlussfreigabe.'};
    },{guenstig_rest_kwh:4,a_kwh:3,b_kwh:2,guenstig_cent:20,spaeter_cent:35,zeitlich_machbar:true},
    {auswahl_guenstig:['A'],euro_gegen_nur_spaeter:0.45}),

  task('stromgruppe_gegenlaeufige_lastwechsel_netto',
    'Ein kaum verändertes Gruppenmittel trotz zweier entgegengesetzter Geräteänderungen anhand separater Messung einordnen — Identify real load cancellation hidden in the observed aggregate change.',
    meter,{
      gruppe_vor_w:watts('Gruppenmittel im ersten Messabschnitt.'), gruppe_nach_w:watts('Gruppenmittel im zweiten Abschnitt.'),
      a_zunahme_w:watts('Separat gemessener Zuwachs von A zwischen den beiden Abschnitten.'),
      b_abnahme_w:watts('Separat gemessener Rückgang von B zwischen den beiden Abschnitten.'),
      kombifehler_w:watts('Belegter kombinierter Fehlerrahmen der Änderungsschätzung.'),
      zeitsynchron:yes('Sind alle Werte aus denselben Zeitabschnitten und ohne Überschneidung der Gerätegrenzen?'),
    },({gruppe_vor_w,gruppe_nach_w,a_zunahme_w,b_abnahme_w,kombifehler_w,zeitsynchron})=>{
      if (!zeitsynchron) return {restveraenderung_w:null,rest_erklaerung_offen:null};
      const residual=gruppe_nach_w-gruppe_vor_w-a_zunahme_w+b_abnahme_w;
      return {restveraenderung_w:r(residual),verdeckt_in_gegenrichtung_w:r(Math.min(a_zunahme_w,b_abnahme_w)),
        rest_erklaerung_offen:Math.abs(residual)>kombifehler_w+1e-9,
        hinweis:'Mittlere beobachtete Leistungsänderungen, kein Hinweis zur Eignung einer Stromversorgung.'};
    },{gruppe_vor_w:250,gruppe_nach_w:260,a_zunahme_w:100,b_abnahme_w:80,kombifehler_w:5,zeitsynchron:true},
    {restveraenderung_w:-10,verdeckt_in_gegenrichtung_w:80,rest_erklaerung_offen:true}),

  task('geraetegruppen_uebergabe_verbrauchsstelle_wechselbilanz',
    'Beim Wechsel eines gemessenen Geräts zwischen zwei Gruppenbilanzen eine ausstehende Zuordnung erkennen — Check the preserved total across a verified device reassignment between meters.',
    meter,{
      a_alt_wh:n('Gespeicherte Energie der Ausgangsgruppe A für genau dieses Beobachtungsfenster.'),
      b_alt_wh:n('Gespeicherte Energie der empfangenden Gruppe B für dasselbe Beobachtungsfenster.'),
      wechsel_wh:n('Energie des nachweislich in A enthaltenen und künftig B zugeordneten Geräts in diesem Fenster.'),
      b_neuer_bericht_wh:n('Tatsächlich neu berichteter Gruppentotalwert B für dasselbe Beobachtungsfenster.'),
      messgrenze_sauber:yes('Ist das Gerät vor der Korrektur nur A und keinem gemeinsam gezählten Oberzähler zugeordnet?'),
    },({a_alt_wh,b_alt_wh,wechsel_wh,b_neuer_bericht_wh,messgrenze_sauber})=>{
      if (wechsel_wh>a_alt_wh) throw new RangeError();
      if (!messgrenze_sauber) return {a_neu_wh:null,erwartet_b_neu_wh:null,bericht_rest_wh:null};
      return {a_neu_wh:r(a_alt_wh-wechsel_wh),erwartet_b_neu_wh:r(b_alt_wh+wechsel_wh),
        bericht_rest_wh:r(b_neuer_bericht_wh-b_alt_wh-wechsel_wh),erhaltener_gesamtwert_wh:r(a_alt_wh+b_alt_wh)};
    },{a_alt_wh:255,b_alt_wh:110,wechsel_wh:45,b_neuer_bericht_wh:160,messgrenze_sauber:true},
    {a_neu_wh:210,erwartet_b_neu_wh:155,bericht_rest_wh:5,erhaltener_gesamtwert_wh:365}),

  task('geraetegruppe_gemeinsamer_vorlauf_auftragswechsel',
    'Energie eines tatsächlich gemeinsam nutzbaren Vorlaufs von zwei vollständigen Einzelstarts bei gleichem Ergebnis abgrenzen — Compare a batched workflow with duplicated preparation overhead.',
    meter,{
      getrennt_a_wh:n('Vollständiger Verbrauch des getrennten Auftrags A mit eigener Vorbereitung.'),
      getrennt_b_wh:n('Vollständiger Verbrauch des getrennten Auftrags B mit eigener Vorbereitung.'),
      gruppen_vorlauf_wh:n('Gemessener einmaliger gemeinsamer Vorbereitungsteil im zweiten Ablauf.'),
      gruppen_nach_vorlauf_wh:n('Alle weiteren gemessenen Wh bis zu beiden fertigen Aufträgen.'),
      ergebnis_gleich:yes('Identische vollständige Leistung beider Abläufe und bestätigter gemeinsamer Vorlauf?'),
    },({getrennt_a_wh,getrennt_b_wh,gruppen_vorlauf_wh,gruppen_nach_vorlauf_wh,ergebnis_gleich})=>{
      const group=gruppen_vorlauf_wh+gruppen_nach_vorlauf_wh;
      return {gemeinsam_gemessen_wh:r(group),gemeinsam_minus_getrennt_wh:ergebnis_gleich?r(group-getrennt_a_wh-getrennt_b_wh):null,
        vorlaufanteil_gemeinsam_prozent:group?r(100*gruppen_vorlauf_wh/group):null,
        hinweis:'Die Differenz erfasst den ganzen Ablauf einschließlich Änderungen nach der Vorbereitung.'};
    },{getrennt_a_wh:210,getrennt_b_wh:290,gruppen_vorlauf_wh:70,gruppen_nach_vorlauf_wh:380,ergebnis_gleich:true},
    {gemeinsam_gemessen_wh:450,gemeinsam_minus_getrennt_wh:-50,vorlaufanteil_gemeinsam_prozent:15.5556}),

  task('haushaltsablaeufe_ressourcen_dominanz_beobachtet',
    'Zwei vollständige Mehrgeräteabläufe auf einen echten Zielkonflikt zwischen Energie, Wasser und Zeit prüfen — Detect resource dominance without imposing a preference or price on remaining trade-offs.',
    '/waeschetrockner-oder-luftentfeuchter.html',{
      a_wh:n('Gesamte gemessene Wh des vollständigen Ablaufs A.'), b_wh:n('Entsprechend gemessene Wh von B.'),
      a_l:n('Gesamtwasser A in Litern.'), b_l:n('Gesamtwasser B in Litern.'),
      a_min:duration('Verstrichene Gesamtzeit A.'), b_min:duration('Verstrichene Gesamtzeit B.'),
      gleicher_output:yes('Gleiches vollständiges Ergebnis und dieselben Bilanzgrenzen in allen drei Dimensionen?'),
    },({a_wh,b_wh,a_l,b_l,a_min,b_min,gleicher_output})=>{
      if (!gleicher_output) return {status:'vergleich_offen'};
      const delta=[b_wh-a_wh,b_l-a_l,b_min-a_min];
      const less=delta.some(x=>x<0);
      const greater=delta.some(x=>x>0);
      return {status:less&&greater?'zielkonflikt':less?'b_dominiert':greater?'a_dominiert':'gleich',
        delta_wh:r(delta[0]),delta_l:r(delta[1]),delta_min:r(delta[2]),
        hinweis:'Nur beobachtete Aufträge. Andere Kriterien wie Bedienaufwand können abweichen.'};
    },{a_wh:800,b_wh:700,a_l:14,b_l:17,a_min:40,b_min:35,gleicher_output:true},
    {status:'zielkonflikt',delta_wh:-100,delta_l:3,delta_min:-5}),

  task('geraetepaar_wiederverwendung_gemeinsames_medium',
    'Ermitteln, wie stark ein belegter zulässiger Rücklauf den frischen Ressourceneinsatz einer Folgeaufgabe verändert — Trace a recovered medium through two device tasks without double-counting procurement.',
    workshop,{
      erste_frisch_einheiten:n('Tatsächlich frisch eingesetzte Menge an der ersten Aufgabe.'),
      wieder_nutzbar_einheiten:n('Davon nach dem ersten Gerät nachweislich unverändert nutzbar und zur zweiten Aufgabe zugelassen.'),
      zweite_bedarf_einheiten:n('Gemessener Bedarf der zweiten Aufgabe in derselben Einheit.'),
      uebertrag_verlust_einheiten:n('Tatsächlich beim vereinbarten Übergang nicht mehr nutzbare Menge.'),
      medium_geprueft:yes('Ist die konkrete Wiederverwendung zulässig und vollständig belegt?'),
    },({erste_frisch_einheiten,wieder_nutzbar_einheiten,zweite_bedarf_einheiten,uebertrag_verlust_einheiten,medium_geprueft})=>{
      if (wieder_nutzbar_einheiten>erste_frisch_einheiten||uebertrag_verlust_einheiten>wieder_nutzbar_einheiten) throw new RangeError();
      if (!medium_geprueft) return {belegt_wiederverwendet:null,frischer_einsatz_gesamt:null};
      const reused=Math.min(zweite_bedarf_einheiten,wieder_nutzbar_einheiten-uebertrag_verlust_einheiten);
      return {belegt_wiederverwendet:r(reused),frischer_einsatz_gesamt:r(erste_frisch_einheiten+zweite_bedarf_einheiten-reused),
        rest_nutzbar_nach_b:r(wieder_nutzbar_einheiten-uebertrag_verlust_einheiten-reused),
        hinweis:'Nur belegte unveränderte Nutzung. Keine Freigabe, Geräteflüssigkeiten, Reinigungsmittel oder Wasser erneut einzusetzen.'};
    },{erste_frisch_einheiten:10,wieder_nutzbar_einheiten:6,zweite_bedarf_einheiten:7,uebertrag_verlust_einheiten:2,medium_geprueft:true},
    {belegt_wiederverwendet:4,frischer_einsatz_gesamt:13,rest_nutzbar_nach_b:0}),

  task('geraetegruppe_getrennte_geraetezahl_schattenkosten',
    'Bei zwei in derselben Zeitspanne abgeschlossenen Reihen prüfen, ob der kleinere Einzellastverbrauch durch mehr Gerätezeit erkauft wird — Compare metered energy with measured occupied device-minutes.',
    efficiency,{
      a_wh:n('Vollständige beobachtete Energie des Ablaufs A.'), b_wh:n('Entsprechend gemessene Energie von B.'),
      a_geraeteminuten:duration('Summierte belegte Minuten aller eingesetzten Geräte in A.'),
      b_geraeteminuten:duration('Summierte belegte Minuten aller eingesetzten Geräte in B.'),
      gleicher_zeitrahmen:yes('Gleiche Aufgabenzahl und gleiche verstrichene Kalenderdauer in beiden Abläufen?'),
    },({a_wh,b_wh,a_geraeteminuten,b_geraeteminuten,gleicher_zeitrahmen})=>{
      if (!gleicher_zeitrahmen) return {delta_wh:null,delta_geraeteminuten:null};
      const wattsDelta=b_wh-a_wh;
      const minutesDelta=b_geraeteminuten-a_geraeteminuten;
      return {delta_wh:r(wattsDelta),delta_geraeteminuten:r(minutesDelta),
        mehr_bindung_je_beobachtetes_wh_weniger:wattsDelta<0&&minutesDelta>0?r(minutesDelta/-wattsDelta):null,
        hinweis:'Geräteminuten laufen bei Parallelbetrieb getrennt. Die Kennzahl ist keine monetäre Bewertung.'};
    },{a_wh:350,b_wh:300,a_geraeteminuten:55,b_geraeteminuten:75,gleicher_zeitrahmen:true},
    {delta_wh:-50,delta_geraeteminuten:20,mehr_bindung_je_beobachtetes_wh_weniger:0.4}),

  task('geraeteprogramm_je_freigabefenster_anzahlband',
    'Bei getrennten Gerätefunktionen unsichere Nutzungsdauer auf garantierte und mögliche gemeinsame Auftragszahl abbilden — Bound two-resource service capacity from documented availability intervals.',
    workshop,{
      a_verfuegbar_min:duration('Belegte nutzbare, zusammenhängende Dauer auf Gerät A.'),
      b_verfuegbar_min:duration('Belegte entsprechende Dauer auf Gerät B.'),
      a_kurz_min:duration('Untere beobachtete Dauergrenze je Aufgabe auf A für diesen Ablauf.',0.001),
      a_lang_min:duration('Obere entsprechend begründete Dauergrenze auf A.',0.001),
      b_kurz_min:duration('Untere Dauergrenze je Aufgabe auf B.',0.001),
      b_lang_min:duration('Obere Dauergrenze je Aufgabe auf B.',0.001),
    },({a_verfuegbar_min,b_verfuegbar_min,a_kurz_min,a_lang_min,b_kurz_min,b_lang_min})=>{
      if (a_kurz_min>a_lang_min||b_kurz_min>b_lang_min) throw new RangeError();
      const a=[Math.floor(a_verfuegbar_min/a_lang_min),Math.floor(a_verfuegbar_min/a_kurz_min)];
      const b=[Math.floor(b_verfuegbar_min/b_lang_min),Math.floor(b_verfuegbar_min/b_kurz_min)];
      return {paarweise_kapazitaet_spannweite:[Math.min(a[0],b[0]),Math.min(a[1],b[1])],
        engpass_bei_oberen_laufzeiten:a[0]===b[0]?'gleich':a[0]<b[0]?'A':'B',
        hinweis:'Jede Aufgabe benötigt einen vollständigen unabhängigen Durchgang auf beiden Geräten. Übergabe- oder Warteabhängigkeiten sind hier nicht enthalten.'};
    },{a_verfuegbar_min:100,b_verfuegbar_min:120,a_kurz_min:12,a_lang_min:20,b_kurz_min:15,b_lang_min:30},
    {paarweise_kapazitaet_spannweite:[4,8],engpass_bei_oberen_laufzeiten:'B'}),

  task('haushaltsgruppe_realbetrieb_einzelauftrag_ersatzplan',
    'Bekannte Kosten eines kombinierten Ablaufs gegen den Stand der abgebrochenen Aufträge und belegte Fertigstellungskosten abgleichen — Reconcile a completed-work cost where some device tasks need redo.',
    efficiency,{
      versucht:n('Zahl aller begonnenen gleichartigen Aufträge im gemeinsamen Ablauf.'),
      fertig:n('Davon tatsächlich mit dem geforderten Ergebnis abgeschlossen.'),
      verbraucht_wh:n('Bisher gemessene Energie einschließlich abgebrochener Aufträge.'),
      wiederholung_wh_je:n('Gemessene Energie des dokumentierten separaten Ersatzablaufs je offener Aufgabe.'),
      reste_ausfuehrbar:yes('Sind alle offenen Aufgaben mit diesem geprüften Ersatzablauf vergleichbar erledigbar?'),
    },({versucht,fertig,verbraucht_wh,wiederholung_wh_je,reste_ausfuehrbar})=>{
      whole(versucht,fertig);
      if (fertig>versucht||(!versucht&&verbraucht_wh)) throw new RangeError();
      const pending=versucht-fertig;
      return {offen:pending,bisher_wh:verbraucht_wh,
        gesamt_bis_fertig_wh:!pending?verbraucht_wh:reste_ausfuehrbar?r(verbraucht_wh+pending*wiederholung_wh_je):null,
        hinweis:'Die weitere Energie ist eine bedingte Übertragung der beobachteten Ersatzaufgabe.'};
    },{versucht:10,fertig:8,verbraucht_wh:470,wiederholung_wh_je:55,reste_ausfuehrbar:true},
    {offen:2,bisher_wh:470,gesamt_bis_fertig_wh:580}),

  task('stromgruppe_vollstaendigkeitsrabatt_gesamtverlust',
    'Prüfen, ob das Verschieben eines Auftrags die Obergrenze für einen belegten Gruppenrabatt wieder einhält — Audit a documented threshold rebate separately from variable energy cost.',
    tariff,{
      bisher_kwh:n('Bereits bestätigte Verbrauchsmenge der gemeinsamen Abrechnung.'),
      a_zusatz_kwh:n('Gemessene Zusatzmenge des im Zeitraum verbleibenden Auftrags A.'),
      b_zusatz_kwh:n('Gemessene Energiemenge des innerhalb oder außerhalb des Abrechnungsfensters möglichen Auftrags B.'),
      rabatt_bis_kwh:n('Belegte Obergrenze für einen einmaligen, betragsfesten Gesamtrabatt.'),
      rabatt_euro:n('Betrag des einmaligen Rabatts.'),
      restbedingungen_bestaetigt:yes('Sind alle anderen Rabattbedingungen geprüft und jeweils erfüllt?'),
    },({bisher_kwh,a_zusatz_kwh,b_zusatz_kwh,rabatt_bis_kwh,rabatt_euro,restbedingungen_bestaetigt})=>{
      const without=bisher_kwh+a_zusatz_kwh;
      const withBoth=without+b_zusatz_kwh;
      return {mit_beiden_kwh:r(withBoth),ohne_b_kwh:r(without),
        rabatt_unterschied_euro:restbedingungen_bestaetigt?r(withBoth>rabatt_bis_kwh+1e-9&&without<=rabatt_bis_kwh+1e-9?rabatt_euro:0):null,
        hinweis:'Nur ein belegter, fixer Rabatt mit inklusiver Verbrauchsobergrenze. Spätere Verbrauchskosten separat berücksichtigen.'};
    },{bisher_kwh:95,a_zusatz_kwh:3,b_zusatz_kwh:4,rabatt_bis_kwh:100,rabatt_euro:10,restbedingungen_bestaetigt:true},
    {mit_beiden_kwh:102,ohne_b_kwh:98,rabatt_unterschied_euro:10}),

  task('gruppenbetrieb_verbrauchskosten_gleiche_teilauftraege',
    'Getrennt abgefragte Paketkosten und optionale Teilkosten auf tatsächlich doppelt abgerechnete Aufgaben prüfen — Detect duplicate workflow quoting when a base package already contains a documented extra.',
    workshop,{
      paket_euro:n('Belegter Preis des vollständigen geplanten Ablaufs.'),
      zusatz_a_euro:n('Belegter Preis des separat gelisteten Zusatzauftrags A.'),
      zusatz_b_euro:n('Belegter Preis des separat gelisteten Zusatzauftrags B.'),
      paket_enthaelt_a:choice('Ist exakt dieselbe Einheit von A ausdrücklich im Paket enthalten?','ja','nein','offen'),
      paket_enthaelt_b:choice('Ist exakt dieselbe Einheit von B ausdrücklich im Paket enthalten?','ja','nein','offen'),
    },({paket_euro,zusatz_a_euro,zusatz_b_euro,paket_enthaelt_a,paket_enthaelt_b})=>{
      const a=paket_enthaelt_a==='nein'?zusatz_a_euro:0;
      const b=paket_enthaelt_b==='nein'?zusatz_b_euro:0;
      const unknown=(paket_enthaelt_a==='offen'?zusatz_a_euro:0)+(paket_enthaelt_b==='offen'?zusatz_b_euro:0);
      return {belegtes_minimum_euro:r(paket_euro+a+b),oberer_szenariobetrag_euro:r(paket_euro+a+b+unknown),
        sicher_doppelt_angesetztes_euro:r((paket_enthaelt_a==='ja'?zusatz_a_euro:0)+(paket_enthaelt_b==='ja'?zusatz_b_euro:0)),
        hinweis:'Nur identische, separat prüfbare Aufgaben als enthalten werten. Die Spanne berücksichtigt keine weiteren Kosten.'};
    },{paket_euro:12,zusatz_a_euro:4,zusatz_b_euro:5,paket_enthaelt_a:'ja',paket_enthaelt_b:'offen'},
    {belegtes_minimum_euro:12,oberer_szenariobetrag_euro:17,sicher_doppelt_angesetztes_euro:4}),
];
