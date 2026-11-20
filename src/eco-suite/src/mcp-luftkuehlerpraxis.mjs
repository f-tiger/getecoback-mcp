const COOLER='/guide/bester-luftkuehler.html';
const AIR_AC='/guide/klimaanlage-vs-luftkuehler.html';
const ICE='/guide/ventilator-mit-eis.html';
const NO_INSTALL='/guide/zimmer-kuehlen-ohne-installation.html';
const HUMIDITY='/guide/luftfeuchtigkeit-richtig-messen.html';

const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const state=(description,values)=>({type:'string',description,enum:values});
const temp=description=>num(description+' in °C.',-20,60);
const rel=description=>num(description+' in % relativer Feuchte.',0,100);
const water=description=>num(description+' in ml.',0,50000);
const min=description=>num(description+' in Minuten.',0,1440);
const air=description=>num(description+' in m/s.',0,30);
const round=(value,digits=2)=>Number.isFinite(value)?Number(value.toFixed(digits))+0:null;

function tool(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const luftkuehlerpraxis=[
  tool('luftkuehler_nass_trocken_einlassabgleich',
    'Vergleicht die lokale Abkühlung am Auslass mit dem jeweiligen Einlasswert zweier erprobter Betriebsarten — Compare wet and dry outlet cooling against each run’s own intake temperature.',
    COOLER,{
      nass_ein_c:temp('Trockener Sensor am Einlass in der Nassprobe'),nass_aus_c:temp('Trockener Sensor im Auslass-Luftstrom'),
      trocken_ein_c:temp('Einlasswert in der dokumentierten trockenen Probe'),trocken_aus_c:temp('Auslasswert in dieser Probe'),
      vergleichbar:yes('Gleicher Luftstrom, gleiche Geometrie, vergleichbare Feuchte und Betriebsdauer? Beide Betriebsarten sind dokumentiert.')
    },({nass_ein_c,nass_aus_c,trocken_ein_c,trocken_aus_c,vergleichbar})=>{
      const nass=nass_ein_c-nass_aus_c,trocken=trocken_ein_c-trocken_aus_c;
      return {nass_lokale_abnahme_c:round(nass),trocken_lokale_abnahme_c:round(trocken),
        nass_zusaetzliche_abnahme_c:vergleichbar?round(nass-trocken):null,
        hinweis:'Nur gemessener Unterschied im Luftstrom. Aus dem Auslasswert ergibt sich keine Absenkung der Raumtemperatur.'};
    },{nass_ein_c:30,nass_aus_c:26,trocken_ein_c:29,trocken_aus_c:28.5,vergleichbar:true},
    {nass_lokale_abnahme_c:4,trocken_lokale_abnahme_c:0.5,nass_zusaetzliche_abnahme_c:3.5}),

  tool('luftkuehler_modalternativen_lufttempo_partner',
    'Wählt aus zwei gemessenen Trockenstufen den geeigneteren Vergleichspartner für eine Nassprobe — Find the closest measured dry fan setting to an established wet-mode airflow.',
    COOLER,{
      nass:air('Tempo am Nutzplatz im Nassbetrieb'),trocken_a:air('Tempo bei der ersten erlaubten Trockenstufe'),
      trocken_b:air('Tempo bei der zweiten erlaubten Trockenstufe'),toleranz:air('Eigene maximal zulässige Differenz'),
      ort_gleich:yes('Wurden alle Ablesungen am selben Messort auf gleichartige Weise erhoben?')
    },({nass,trocken_a,trocken_b,toleranz,ort_gleich})=>{
      const a=Math.abs(trocken_a-nass),b=Math.abs(trocken_b-nass);
      return {abstand_a:round(a),abstand_b:round(b),
        vergleichspartner:!ort_gleich||Math.min(a,b)>toleranz?null:Math.abs(a-b)<1e-9?'beide':a<b?'a':'b',
        hinweis:'Gleiches Tempo reduziert einen Unterschied zwischen den Proben. Wasserzustand, Raumluft und direkte Anströmung separat prüfen.'};
    },{nass:1.2,trocken_a:0.8,trocken_b:1.3,toleranz:0.15,ort_gleich:true},
    {abstand_a:0.4,abstand_b:0.1,vergleichspartner:'b'}),

  tool('luftkuehler_lokale_probe_kaufbedarf',
    'Leitet den nächsten Prüfschritt aus Bedarf und beobachteten vorhandenen Optionen ab — Choose the next test or a no-buy decision from an observed local cooling need.',
    NO_INSTALL,{
      ziel:state('Gesuchte Wirkung.', ['luft_am_nutzplatz','raumtemperatur','noch_offen']),
      vorhanden_trocken_reicht:state('Bestandener örtlicher Test mit vorhandenem Luftstrom.', ['ja','nein','offen']),
      nassprobe_geeignet:state('Vergleichbare Nassprobe mit lokalem Nutzen und akzeptiertem Raumfeuchteverlauf.', ['ja','nein','offen'])
    },({ziel,vorhanden_trocken_reicht,nassprobe_geeignet})=>{
      const schritt=ziel==='raumtemperatur'?'waermeabfuhr_pruefen':ziel==='noch_offen'?'eigenes_ziel_klaeren':
        vorhanden_trocken_reicht==='ja'?'vorhandenen_luftstrom_nutzen':
        vorhanden_trocken_reicht==='offen'?'vorhandenen_luftstrom_pruefen':
        nassprobe_geeignet==='ja'?'nassoption_im_erprobten_fall_vergleichen':'kauf_zurueckstellen';
      return {naechster_schritt:schritt,
        hinweis:'Nur ein bestätigtes örtliches Ziel kann mit Haushaltsversuchen verglichen werden. Unklarer Test begründet keinen Kauf.'};
    },{ziel:'luft_am_nutzplatz',vorhanden_trocken_reicht:'nein',nassprobe_geeignet:'offen'},{naechster_schritt:'kauf_zurueckstellen'}),

  tool('luftkuehler_trockenkontrolle_restfeuchte_beleg',
    'Prüft ob der Referenzlauf als trockene Probe dokumentiert ist — Check whether a fan-only control was actually documented as dry.',
    COOLER,{
      modus_hersteller:state('Dokumentierter Betrieb.', ['trocken_erlaubt','trocken_nicht_belegt','unklar']),
      wasserzufuhr:state('Zustand vor Beginn der Probe.', ['nachweislich_aus','aktiv','unbekannt']),
      matte:state('Zuvor dokumentierter Zustand der Matte.', ['trocken','restfeucht','unbekannt'])
    },({modus_hersteller,wasserzufuhr,matte})=>({
      trockene_referenz_belegt:modus_hersteller==='trocken_erlaubt'&&wasserzufuhr==='nachweislich_aus'&&matte==='trocken',
      restverdunstung_offen:matte==='unbekannt',restfeuchte_beobachtet:matte==='restfeucht',
      hinweis:'Betriebsart und trockene Bedingung separat belegen. Kein Gerät zu einem undokumentierten Leerlauf mit leerem Tank betreiben.'
    }),{modus_hersteller:'trocken_erlaubt',wasserzufuhr:'nachweislich_aus',matte:'restfeucht'},
    {trockene_referenz_belegt:false,restverdunstung_offen:false,restfeuchte_beobachtet:true}),

  tool('luftkuehler_auslassmessung_nasser_fuehler_ausschluss',
    'Prüft ob ein aufgezeichneter Auslasswert zur trockenen Lufttemperatur-Messung taugt — Flag an outlet measurement exposed to wetting of the temperature sensor.',
    COOLER,{
      auslass_c:temp('Vorliegender Wert am Auslass'),
      fuehler:state('Dokumentierter Zustand des Temperaturfühlers.', ['trocken','tropfen_oder_film','nicht_beobachtet']),
      messweg_frei:yes('War der Fühler frei im Austrittsstrom und ohne Kontakt zur Matte oder zum Gehäuse?')
    },({auslass_c,fuehler,messweg_frei})=>({
      nutzbarer_trockentemperaturwert_c:fuehler==='trocken'&&messweg_frei?auslass_c:null,
      beobachtete_sensorbenaessung:fuehler==='tropfen_oder_film',
      hinweis:'Verdunstung am benetzten Fühler kann den Messwert ändern. Den Wert in dieser Lage nicht der unbenetzten Lufttemperatur zuschreiben.'
    }),{auslass_c:21.8,fuehler:'tropfen_oder_film',messweg_frei:true},
    {nutzbarer_trockentemperaturwert_c:null,beobachtete_sensorbenaessung:true}),

  tool('luftkuehler_mattemuster_nasszonen_nachlauf',
    'Trennt wiederholt trockene Mattenfelder von nur einmal beobachteten trockenen Feldern — Distinguish repeatedly dry pad areas from one-off readings after use.',
    COOLER,{
      felder:num('Anzahl gleicher, auf vorhandenen Bildern sichtbarer Felder.',1,100),
      trocken_a:num('Trockene Felder nach erstem Lauf.',0,100),trocken_b:num('Trockene Felder nach zweitem Lauf.',0,100),
      dieselben:num('In beiden Bildern dieselben trockenen Felder.',0,100),
      gleiche_nachlaufzeit:yes('Gleiche Sichtseite und gleich lange Zeit bis zur vorhandenen Sichtbeobachtung?')
    },({felder,trocken_a,trocken_b,dieselben,gleiche_nachlaufzeit})=>{
      if (![felder,trocken_a,trocken_b,dieselben].every(Number.isInteger)||dieselben>Math.min(trocken_a,trocken_b)||
        trocken_a+trocken_b-dieselben>felder) throw new RangeError('Feldzahlen müssen dieselbe markierte Fläche ohne Doppelzählung beschreiben.');
      return {wiederholt_trocken_felder:gleiche_nachlaufzeit?dieselben:null,
        nur_einmal_trocken_felder:gleiche_nachlaufzeit?trocken_a+trocken_b-2*dieselben:null,
        hinweis:'Nur vorhandene Sichtbelege am ausgeschalteten Gerät nach Anleitung. Aus dem Muster folgen weder Fördermenge noch Fehlerursache.'};
    },{felder:12,trocken_a:4,trocken_b:5,dieselben:3,gleiche_nachlaufzeit:true},
    {wiederholt_trocken_felder:3,nur_einmal_trocken_felder:3}),

  tool('luftkuehler_feuchteband_paarprobe_auslassnutzen',
    'Vergleicht gemessenen lokalen Zusatznutzen einer Nassstufe aus zwei getrennt beobachteten Feuchtebereichen — Compare measured wet-mode benefit in two evidenced humidity bands.',
    AIR_AC,{
      start_a:rel('Start der vergleichbaren Probenreihe A'),start_b:rel('Start der Probenreihe B am selben Einlass'),
      nutzen_a_c:num('Aus gepaarten Nass- und Trockenproben gemessener lokaler Zusatzabfall A in °C.',-20,20),
      nutzen_b_c:num('Entsprechend gemessener lokaler Zusatzabfall B in °C.',-20,20),
      ausser_feuchte_gleich:yes('Temperatur, Luftführung und Auswertung sind vergleichbar?')
    },({start_a,start_b,nutzen_a_c,nutzen_b_c,ausser_feuchte_gleich})=>({
      feuchterer_block:start_a===start_b?null:start_b>start_a?'b':'a',
      zusatznutzen_im_feuchteren_minus_trockeneren_c:ausser_feuchte_gleich&&start_a!==start_b?
        round(start_b>start_a?nutzen_b_c-nutzen_a_c:nutzen_a_c-nutzen_b_c):null,
      hinweis:'Zwei eigene Bedingungen, ohne Schwelle für andere Tage oder Geräte abzuleiten. Relevant ist nur der beobachtete Luftstrom.'
    }),{start_a:42,start_b:67,nutzen_a_c:3,nutzen_b_c:1,ausser_feuchte_gleich:true},
    {feuchterer_block:'b',zusatznutzen_im_feuchteren_minus_trockeneren_c:-2}),

  tool('luftkuehler_ortsprobe_kuehler_und_schwuel_empfunden',
    'Hält persönlichen Kühlgewinn und Feuchtenachteil aus demselben Nass-Trocken-Vergleich getrennt fest — Separate felt cooling from perceived stuffiness in a matched wet/dry trial.',
    AIR_AC,{
      nass_lokal:state('Eigener Eindruck gegenüber trocken bei gleicher Luftbewegung.', ['kuehler','gleich','waermer','offen']),
      nass_raumgefuehl:state('Getrennter Eindruck der Raumluft.', ['angenehmer','gleich','schwueler','offen']),
      gleiche_nutzung:yes('Gleicher Sitzplatz, ähnliche Belastung und vergleichbares Zeitfenster?')
    },({nass_lokal,nass_raumgefuehl,gleiche_nutzung})=>({
      nutzen_und_nachteil:!gleiche_nutzung||[nass_lokal,nass_raumgefuehl].includes('offen')?null:
        nass_lokal==='kuehler'&&nass_raumgefuehl==='schwueler',
      komforturteil:nass_lokal,raumurteil:nass_raumgefuehl,
      hinweis:'Persönliche Eindrücke, keine Messwerte oder Gesundheitsbewertung. Bei unklarem Gesamtnutzen bleibt ein Kauf offen.'
    }),{nass_lokal:'kuehler',nass_raumgefuehl:'schwueler',gleiche_nutzung:true},
    {nutzen_und_nachteil:true,komforturteil:'kuehler',raumurteil:'schwueler'}),

  tool('luftkuehler_tankbilanz_ueber_wasserwege',
    'Trennt Tankabnahme, dokumentierte Verluste und die zusätzlich in der Matte verbleibende Flüssigkeit — Account for reservoir drawdown, measured losses and retained water separately.',
    COOLER,{
      start_ml:water('Gemessener Tankstand zu Beginn'),nachgefuellt_ml:water('Tatsächlich während des Blocks zugegebene Menge'),
      ende_ml:water('Gemessener Tankstand zum Ende'),anders_ab_ml:water('Getrennt belegter Flüssigkeitsabgang ohne Verdunstung'),
      matte_mehr_ml:water('Gegenüber dem Start zusätzlich belegt in der Matte gebundene Menge'),
      wege_bilanziert:yes('Sind Flüssigkeitswege und Messzeitpunkte einschließlich Mattenzustand vollständig belegt?')
    },({start_ml,nachgefuellt_ml,ende_ml,anders_ab_ml,matte_mehr_ml,wege_bilanziert})=>{
      const abnahme=start_ml+nachgefuellt_ml-ende_ml;
      const rest=abnahme-anders_ab_ml-matte_mehr_ml;
      if (rest< -1e-8) throw new RangeError('Belegte Abgänge passen nicht zur Tankabnahme.');
      return {abnahme_mit_nachfuellung_ml:round(abnahme),offener_bilanzrest_ml:round(Math.max(0,rest)),
        verdunstung_unter_bilanzannahmen_ml:wege_bilanziert?round(Math.max(0,rest)):null,
        hinweis:'Verdunstungsmodell nur bei vollständigen Flüssigkeitswegen und ohne Nettoaustritt aus der vorher feuchteren Matte. Sonst lediglich offener Rest.'};
    },{start_ml:1200,nachgefuellt_ml:400,ende_ml:850,anders_ab_ml:30,matte_mehr_ml:120,wege_bilanziert:false},
    {abnahme_mit_nachfuellung_ml:750,offener_bilanzrest_ml:600,verdunstung_unter_bilanzannahmen_ml:null}),

  tool('luftkuehler_tankstand_ruecklauf_nach_stopp',
    'Prüft wie viel der Abnahme im laufenden Betrieb nach dokumentiertem Stopp wieder im selben Tank sichtbar wurde — Quantify the observed return to the reservoir after normal stop.',
    COOLER,{
      vor_run_ml:water('Tankstand vor Laufbeginn'),beim_stopp_ml:water('Tankstand beim dokumentierten Stopp'),
      nach_restzeit_ml:water('Später im selben Tank abgelesener Wert'),
      nur_ruecklauf:yes('Derselbe ruhende Tank und keine Nachfüllung, Entnahme oder andere bekannte Veränderung?')
    },({vor_run_ml,beim_stopp_ml,nach_restzeit_ml,nur_ruecklauf})=>{
      const abnahme=vor_run_ml-beim_stopp_ml;
      const ruecklauf=nach_restzeit_ml-beim_stopp_ml;
      return {scheinbare_abnahme_beim_stopp_ml:round(abnahme),spaetere_zunahme_ml:round(ruecklauf),
        rueckgewonnener_anteil_prozent:nur_ruecklauf&&abnahme>0&&ruecklauf>=0&&ruecklauf<=abnahme?round(100*ruecklauf/abnahme):null,
        hinweis:'Spätere Tankzunahme ist eine Beobachtung. Sie zeigt, warum der Stand beim Stopp den dauerhaften Wasserabgang überschätzen kann.'};
    },{vor_run_ml:1000,beim_stopp_ml:760,nach_restzeit_ml:880,nur_ruecklauf:true},
    {scheinbare_abnahme_beim_stopp_ml:240,spaetere_zunahme_ml:120,rueckgewonnener_anteil_prozent:50}),

  tool('luftkuehler_betriebswahl_wasser_und_lokalziel',
    'Wählt unter zwei gemessenen Programmen nach lokalem Temperaturziel und eigenem Wasserbudget — Compare measured programs against a local cooling target and water budget.',
    COOLER,{
      abnahme_a_c:num('Lokale erwiesene Abnahme im Programmlauf A in °C.',-20,20),
      abnahme_b_c:num('Lokale erwiesene Abnahme im Programmlauf B in °C.',-20,20),
      wasser_a_ml:water('Gemessene erforderliche Wassermenge für A'),wasser_b_ml:water('Gemessene erforderliche Wassermenge für B'),
      ziel_abnahme_c:num('Eigene Mindestabnahme am Nutzort in °C.',0,20),budget_ml:water('Wasserbudget für denselben Nutzungsblock'),
      gleiche_probe:yes('Beide Programme haben gleiche Nutzungsdauer und vergleichbare Luft- und Feuchtebedingungen?')
    },({abnahme_a_c,abnahme_b_c,wasser_a_ml,wasser_b_ml,ziel_abnahme_c,budget_ml,gleiche_probe})=>{
      const a=abnahme_a_c>=ziel_abnahme_c&&wasser_a_ml<=budget_ml;
      const b=abnahme_b_c>=ziel_abnahme_c&&wasser_b_ml<=budget_ml;
      return {geeignete_eigene_probe:!gleiche_probe?null:a&&b?(wasser_a_ml===wasser_b_ml?'beide':wasser_a_ml<wasser_b_ml?'a':'b'):a?'a':b?'b':'keine',
        hinweis:'Entscheidung nur für die gemessene Nutzungsdauer am lokalen Messort. Ist keine Probe geeignet, ist Mehrverbrauch oder Kauf nicht automatisch sinnvoll.'};
    },{abnahme_a_c:2,abnahme_b_c:3,wasser_a_ml:250,wasser_b_ml:500,ziel_abnahme_c:1.5,budget_ml:300,gleiche_probe:true},
    {geeignete_eigene_probe:'a'}),

  tool('luftkuehler_wasserverlust_stillstand_kontrolllauf',
    'Vergleicht Tankabnahmen bei regulärem Betrieb und beobachtetem Stillstand in demselben Zustand — Compare active-mode and stopped reservoir changes under matched conditions.',
    COOLER,{
      abnahme_aktiv_ml:water('Tankabnahme während des aktiven Blocks'),abnahme_ruhe_ml:water('Tankabnahme im separaten Ruheblock'),
      gleiche_dauer:yes('Dauern, Standort, Startmenge und Mattenzustand wurden für beide Blöcke abgeglichen?')
    },({abnahme_aktiv_ml,abnahme_ruhe_ml,gleiche_dauer})=>({
      abnahme_ohne_betrieb_beobachtet:abnahme_ruhe_ml>0,
      aktive_abnahme_gegen_ruhe_ml:gleiche_dauer?round(abnahme_aktiv_ml-abnahme_ruhe_ml):null,
      hinweis:'Die Ruheprobe dokumentiert Tankabnahme ohne normalen Betrieb, bestimmt aber weder Leck noch Verdunstung. Nur belegte Herstellerbetriebszustände beobachten.'
    }),{abnahme_aktiv_ml:260,abnahme_ruhe_ml:55,gleiche_dauer:true},
    {abnahme_ohne_betrieb_beobachtet:true,aktive_abnahme_gegen_ruhe_ml:205}),

  tool('luftkuehler_fuellsicht_minimum_ohne_interpolation',
    'Ordnet einen vorhandenen Sichtstand den dokumentierten Mindest- und Höchstzeichen zu — Place a measured tank level against documented fill marks without inferring volume.',
    COOLER,{
      untere_marke_mm:num('Höhe der dokumentierten Mindestmarke ab demselben Nullpunkt in mm.',0,500),
      obere_marke_mm:num('Höhe der dokumentierten Höchstmarke ab demselben Nullpunkt in mm.',0,500),
      iststand_mm:num('Beobachteter ruhender Füllstand in mm.',0,600),
      bezug_abgeglichen:yes('Montagelage und beide Markierungen gelten nachweislich für diesen Tank und Betriebszustand?')
    },({untere_marke_mm,obere_marke_mm,iststand_mm,bezug_abgeglichen})=>{
      if (untere_marke_mm>=obere_marke_mm) throw new RangeError('Die dokumentierte Mindestmarke muss unter der Höchstmarke liegen.');
      return {fuellstand_lage:!bezug_abgeglichen?null:iststand_mm<untere_marke_mm?'unter_minimum':
        iststand_mm>obere_marke_mm?'ueber_maximum':'zwischen_marken',
        abstand_untere_marke_mm:bezug_abgeglichen?round(iststand_mm-untere_marke_mm):null,
        hinweis:'Vertikaler Stand ist keine Literangabe. Die beiden Markierungen zeigen Rahmenbedingungen, keine Betriebsfreigabe.'};
    },{untere_marke_mm:30,obere_marke_mm:115,iststand_mm:24,bezug_abgeglichen:true},
    {fuellstand_lage:'unter_minimum',abstand_untere_marke_mm:-6}),

  tool('luftkuehler_tank_marken_messwerte_abgrenzen',
    'Findet ein Volumenintervall aus zwei eigenen Füllmessungen um einen neuen Sichtstand — Bound volume from two measured fill observations surrounding a new level.',
    COOLER,{
      hierzu_unten_mm:num('Niedrigerer gemessener Stand in mm.',0,600),
      hierzu_oben_mm:num('Höherer gemessener Stand in mm.',0,600),
      unten_ml:water('Beim niedrigeren Stand tatsächlich gemessenes Volumen'),
      oben_ml:water('Beim höheren Stand tatsächlich gemessenes Volumen'),
      stand_mm:num('Neuer Sichtstand in mm.',0,600),
      gleicher_tank:yes('Gleicher ruhender Tank und gleiche Bezugslinie in allen Ablesungen?')
    },({hierzu_unten_mm,hierzu_oben_mm,unten_ml,oben_ml,stand_mm,gleicher_tank})=>{
      if (hierzu_unten_mm>=hierzu_oben_mm||unten_ml>oben_ml) throw new RangeError('Gemessene Kalibrierpunkte müssen in Reihenfolge stehen.');
      const bereich=!gleicher_tank||stand_mm<hierzu_unten_mm||stand_mm>hierzu_oben_mm?null:
        stand_mm===hierzu_unten_mm?[unten_ml,unten_ml]:stand_mm===hierzu_oben_mm?[oben_ml,oben_ml]:[unten_ml,oben_ml];
      return {volumenbereich_ml:bereich,
        hinweis:'Zwischen gemessenen Punkten nur eine Spanne, keine lineare Umrechnung. Oberhalb und unterhalb der vorhandenen Messung bleibt das Volumen offen.'};
    },{hierzu_unten_mm:20,hierzu_oben_mm:40,unten_ml:180,oben_ml:530,stand_mm:32,gleicher_tank:true},
    {volumenbereich_ml:[180,530]}),

  tool('luftkuehler_pflegedokument_tank_matte_unterscheiden',
    'Prüft ob die Unterlagen Tankentnahme und Pflege der konkreten Matte getrennt beschreiben — Verify model-specific and separate care instructions for the reservoir and evaporative pad.',
    COOLER,{
      modell_eindeutig:yes('Exaktes Modell und passende Handbuchausgabe liegen vor.'),
      tank_beschrieben:yes('Die Anleitung beschreibt Behandlung und Entnahme des Tanks.'),
      matte:state('Die konkrete Matte laut Anleitung.', ['wartung_beschrieben','austausch_beschrieben','nur_sichtbar','offen'])
    },({modell_eindeutig,tank_beschrieben,matte})=>({
      tank_und_mattenbeleg:modell_eindeutig&&tank_beschrieben&&['wartung_beschrieben','austausch_beschrieben'].includes(matte),
      mattenweg:modell_eindeutig?matte:null,
      hinweis:'Die Behandlung eines anderen Modells oder des Tanks nicht auf die Matte übertragen. Bei fehlenden Angaben Klarheit vor Kauf oder Eingriff suchen.'
    }),{modell_eindeutig:true,tank_beschrieben:true,matte:'nur_sichtbar'},
    {tank_und_mattenbeleg:false,mattenweg:'nur_sichtbar'}),

  tool('luftkuehler_kuehlakku_pegelversatz_tank',
    'Prüft ob sich die Sichtmarke bei gleicher abgemessener Wassermenge mit dem dokumentierten Kühlakku verschiebt — Compare measured tank levels at a fixed water volume with and without a documented cooling pack.',
    COOLER,{
      ohne_mm:num('Bereits gemessener Stand ohne Kühlakku in mm.',0,600),
      mit_mm:num('Bereits gemessener Stand mit Kühlakku ab derselben Linie in mm.',0,600),
      gleicher_inhalt:yes('Gleiche abgemessene Wassermenge und gleiche ruhende Tanklage?'),
      akku_belegt:yes('Akku und beobachtete Einlage sind in der Anleitung für diesen Tank beschrieben.')
    },({ohne_mm,mit_mm,gleicher_inhalt,akku_belegt})=>({
      beobachtete_standverschiebung_mm:gleicher_inhalt&&akku_belegt?round(mit_mm-ohne_mm):null,
      hinweis:'Eine andere Anzeige bei gleichem Wasserinhalt belegt keinen Wasserverbrauch. Keine Annahme über verdrängtes Volumen oder zulässige Füllmenge.'
    }),{ohne_mm:62,mit_mm:68,gleicher_inhalt:true,akku_belegt:true},
    {beobachtete_standverschiebung_mm:6}),

  tool('luftkuehler_kuehlakku_einsatzgrenzen_belegt',
    'Prüft ob genau dieser Kühlakku für den konkreten Tank und Einsatz beschrieben ist — Verify whether this specific cooling pack and its intended placement are documented.',
    COOLER,{modell:yes('Stimmen Gerät und Tankvariante mit der Anleitung überein?'),
      akku:state('Beleg für genau diesen Akku.', ['zugelassen','anderer_akku','offen']),
      einlage:yes('Die Einsatzposition für die beabsichtigte Betriebsart ist beschrieben.')},
    ({modell,akku,einlage})=>({dokumentation_verwendbar:modell&&akku==='zugelassen'&&einlage,
      hinweis:'Keinen undokumentierten Akku oder Gegenstand in Tank oder Auslass einsetzen. Ein Produktfoto belegt keine Freigabe.'}),
    {modell:true,akku:'offen',einlage:true},{dokumentation_verwendbar:false}),

  tool('luftkuehler_kuehlakku_vor_nach_gegen_wasserprobe',
    'Trennt den Zusatznutzen eines Kühlakkus vor und nach dem belegten Ende seiner Kältephase — Compare a cooling pack’s early and late added effect against water-only readings.',
    ICE,{frueh_c:temp('Luftstromwert am Nutzplatz in der frühen erprobten Akkuphase'),
      spaet_c:temp('Entsprechender Wert nach Ende dieser Phase'),
      wasser_frueh_c:temp('Wasserprobe ohne Akku mit passendem frühem Messpunkt'),
      wasser_spaet_c:temp('Wasserprobe ohne Akku mit passendem spätem Messpunkt'),
      phasen_belegt:yes('Vergleichbare Betriebszustände, Akkuphase und Raumwerte dokumentiert?')},
    ({frueh_c,spaet_c,wasser_frueh_c,wasser_spaet_c,phasen_belegt})=>({
      frueher_zusatzabfall_c:phasen_belegt?round(wasser_frueh_c-frueh_c):null,
      spaeter_zusatzabfall_c:phasen_belegt?round(wasser_spaet_c-spaet_c):null,
      hinweis:'Aufgezeichnete örtliche Unterschiede. Einen Startvorteil weder zeitlich verlängern noch auf den Raum übertragen.'}),
    {frueh_c:24,spaet_c:27,wasser_frueh_c:27,wasser_spaet_c:27,phasen_belegt:true},
    {frueher_zusatzabfall_c:3,spaeter_zusatzabfall_c:0}),

  tool('kuehlakku_uebergangsfenster_messpunkt_zuordnen',
    'Ordnet einen Temperaturwert der belegten Kältephase, einer offenen Übergangszeit oder dem Danach zu — Locate a reading relative to an observed end of the cooling-pack stage.',
    ICE,{letzter_kaltbeleg:min('Letzter eindeutig kühler Akkuzustand ab Protokollbeginn'),
      erster_endbeleg:min('Erster belegter Zeitpunkt nach Kälteende'),
      messpunkt:min('Zeitpunkt der Temperaturmessung'),gleiche_uhr:yes('Alle Marken liegen auf derselben Zeitachse und im beobachteten Lauf.')},
    ({letzter_kaltbeleg,erster_endbeleg,messpunkt,gleiche_uhr})=>{
      if(letzter_kaltbeleg>=erster_endbeleg)throw new RangeError('Belege für die Kälte- und Endphase in zeitlicher Reihenfolge angeben.');
      return {messphase:!gleiche_uhr?null:messpunkt<=letzter_kaltbeleg?'bis_kaltbeleg':messpunkt>=erster_endbeleg?'ab_endbeleg':'offener_uebergang',
        hinweis:'Zwischen den Zustandsbelegen ist die Phase offen. Aus einem Messpunkt im Übergang keine Wirkungsdauer ableiten.'};
    },{letzter_kaltbeleg:12,erster_endbeleg:19,messpunkt:16,gleiche_uhr:true},{messphase:'offener_uebergang'}),

  tool('luftkuehler_kuehlakku_zusatzsignal_auslass_sitz',
    'Prüft ob ein gegenüber Wasserbetrieb gemessener Akkueffekt am Auslass auch am Sitz erscheint — Check whether extra cooling at the outlet also reaches the chosen seat.',
    ICE,{auslass_zusatz_c:num('Gemessener zusätzlicher Temperaturabfall am Auslass in °C.',-30,30),
      sitz_zusatz_c:num('Gemessener Zusatzabfall am Sitzplatz in °C.',-30,30),
      toleranz_c:num('Unterscheidungsbreite der Messreihe in °C.',0,20),
      gleiche_phase:yes('Zeitgleiche Werte aus derselben dokumentierten Akkuphase, jeweils relativ zur passenden Wasserprobe?')},
    ({auslass_zusatz_c,sitz_zusatz_c,toleranz_c,gleiche_phase})=>({
      signal_nur_am_auslass:gleiche_phase?auslass_zusatz_c>toleranz_c&&sitz_zusatz_c<=toleranz_c:null,
      hinweis:'Eine nicht vom Messspiel unterscheidbare Änderung am Sitz belegt keinen Nutzen dort. Das Ergebnis sagt nichts über die übrige Raumluft.'}),
    {auslass_zusatz_c:2.5,sitz_zusatz_c:0.3,toleranz_c:0.5,gleiche_phase:true},{signal_nur_am_auslass:true}),

  tool('luftkuehler_wasser_kalt_luftsignal_unter_messspiel',
    'Erkennt einen beobachteten kälteren Tank ohne entsprechend belegtes kühleres Auslasssignal — Distinguish a measured cooler tank from outlet cooling beyond measurement noise.',
    COOLER,{wasserabfall_c:num('Gemessener Temperaturabfall im Wasser in °C.',-30,30),
      luftabfall_c:num('Gemessener korrigierter Auslassabfall relativ zur Einlasstemperatur in °C.',-30,30),
      wasser_messspiel:num('Eigene Unterscheidungsgrenze für die Wassermessung in °C.',0,20),
      luft_messspiel:num('Unterscheidungsgrenze für die Luftmessung in °C.',0,20),
      paare_passend:yes('Beide Änderungen aus vergleichbaren eigenen Zuständen und Zeitfenstern?')},
    ({wasserabfall_c,luftabfall_c,wasser_messspiel,luft_messspiel,paare_passend})=>({
      wasser_signal:paare_passend?wasserabfall_c>wasser_messspiel:null,
      luft_signal:paare_passend?luftabfall_c>luft_messspiel:null,
      hinweis:'Wasser- und Luftmessung beantworten unterschiedliche Fragen. Ein kälterer Tank ist kein Ersatz für einen belegten Wert im Luftstrom.'}),
    {wasserabfall_c:5,luftabfall_c:0.2,wasser_messspiel:1,luft_messspiel:0.4,paare_passend:true},
    {wasser_signal:true,luft_signal:false}),

  tool('eisprobe_gemessene_schmelzmasse_waermeanteil',
    'Rechnet die gemessene Schmelzmasse aus einer vorhandenen reinen Eisprobe in einen theoretischen Wärmeanteil um — Estimate latent heat from measured melting of known pure water ice.',
    ICE,{geschmolzen_g:num('Getrennt gewogene, vollständig geschmolzene Eismasse in g.',0,5000),
      reines_wassereis_belegt:yes('Bekannte reine Wassereisprobe, getrennt von vorhandenem Wasser oder unbekannter Akkufüllung?')},
    ({geschmolzen_g,reines_wassereis_belegt})=>({
      idealer_schmelzwaermeanteil_kj:reines_wassereis_belegt?round(geschmolzen_g*0.3335):null,
      hinweis:'Modellwert mit rund 333,5 kJ je kg Wassereis beim Schmelzen. Ohne Erwärmung oder Herkunft der Wärme zu bilanzieren. Kein Nachweis für Geräteleistung oder Raumkühlung.'}),
    {geschmolzen_g:200,reines_wassereis_belegt:true},{idealer_schmelzwaermeanteil_kj:66.7}),

  tool('luftkuehler_nachfuellfolge_wassertemperatur_rueckbezug',
    'Prüft ob die Wassertemperatur nach einer bereits erfolgten Nachfüllung wieder ins Vergleichsband zurückkehrte — Check when a recorded refill no longer differs from the prior tank-temperature band.',
    COOLER,{vorher_c:temp('Wasserwert vor der dokumentierten Nachfüllung'),direkt_c:temp('Erste geeignete Ablesung nach der Nachfüllung'),
      spaeter_c:temp('Spätere Ablesung vor der Vergleichsprobe'),band:num('Selbst gewählte Temperaturbreite in °C.',0,20)},
    ({vorher_c,direkt_c,spaeter_c,band})=>({
      direkt_ausserhalb:Math.abs(direkt_c-vorher_c)>band,spaeter_im_band:Math.abs(spaeter_c-vorher_c)<=band,
      hinweis:'Drei Tankmessungen, keine konstante Wassertemperatur zwischen Proben. Bei abweichendem Stand die Kontrolle entsprechend kennzeichnen.'}),
    {vorher_c:22,direkt_c:17,spaeter_c:21.5,band:1},{direkt_ausserhalb:true,spaeter_im_band:true}),

  tool('luftkuehler_alternierende_nassphasen_sitzzeit',
    'Rechnet aus tatsächlichen Betriebsdauern nach, wie lange die Nassphase am Nutzplatz überhaupt genutzt wurde — Separate observed wet operation from the part actually used in the airflow.',
    COOLER,{nass_gesamt:min('Bestätigte Gesamtdauer der Nassphasen'),davon_platz:min('Ihr belegter Teil mit Nutzung am direkt angeströmten Platz'),
      weitere_lokale_min:min('Getrennte Nutzungsminuten an diesem Platz ohne Nassphase')},
    ({nass_gesamt,davon_platz,weitere_lokale_min})=>{
      if(davon_platz>nass_gesamt)throw new RangeError('Gleichzeitige Nutzung ist Teil der Nassphase.');
      return {nass_ohne_lokale_nutzung_min:round(nass_gesamt-davon_platz),
        nassanteil_lokale_nutzung_prozent:davon_platz+weitere_lokale_min>0?round(100*davon_platz/(davon_platz+weitere_lokale_min)):null,
        hinweis:'Nur bestätigte zeitliche Nutzung. Laufzeit ohne belegte Nutzung dient nicht als Nachweis einer Raumwirkung.'};
    },{nass_gesamt:50,davon_platz:20,weitere_lokale_min:30},
    {nass_ohne_lokale_nutzung_min:30,nassanteil_lokale_nutzung_prozent:40}),

  tool('luftkuehler_feuchtemessung_nahstrahl_raumvertretung',
    'Trennt Feuchtewerte aus direktem Austrittsstrom von einem gleichzeitig erfassten Raumpunkt — Classify a humidity reading by its documented exposure to the cooler’s jet.',
    HUMIDITY,{sichtwert:rel('Angezeigte relative Feuchte am ersten Punkt'),zweiter_wert:rel('Angezeigte Feuchte an einem zweiten Punkt'),
      erster_standort:state('Lage der ersten Messung.', ['auslassstrahl','raum','unklar']),
      zweiter_raum_belegt:yes('Zweiter Sensor außerhalb direkter Anströmung an einem dokumentierten Raumpunkt?')},
    ({sichtwert,zweiter_wert,erster_standort,zweiter_raum_belegt})=>({
      gemeldeter_auslassfeuchtewert:erster_standort==='auslassstrahl'?sichtwert:null,
      getrennt_belegter_raumwert:zweiter_raum_belegt?zweiter_wert:erster_standort==='raum'?sichtwert:null,
      hinweis:'Relative Feuchte hängt von Temperatur und Ort ab. Werte nicht zu einem Raumwert mischen und nicht in Wassermengen umdeuten.'}),
    {sichtwert:74,zweiter_wert:58,erster_standort:'auslassstrahl',zweiter_raum_belegt:true},
    {gemeldeter_auslassfeuchtewert:74,getrennt_belegter_raumwert:58}),

  tool('luftkuehler_mehrfeuchte_je_lokalgrad_probe',
    'Bezieht einen gemessenen Feuchtezuwachs im Raum auf den beobachteten Kühlgewinn im örtlichen Luftstrom — Relate a measured room humidity change to an observed local cooling benefit.',
    AIR_AC,{mehrfeuchte_g_m3:num('Differenz der absoluten Raumfeuchte zur vergleichbaren Trockenprobe in g/m³.',-30,30),
      lokaler_gewinn_c:num('Zusätzlicher gemessener Temperaturabfall am Nutzplatz in °C.',-30,30),
      temp_messspiel:num('Eigene Unterscheidungsbreite der Temperaturmessung in °C.',0,20),
      laeufe_paarig:yes('Zeitgleich abgeglichene lokale Luftwerte und getrennte Raumwerte in passenden Nass-Trocken-Proben?')},
    ({mehrfeuchte_g_m3,lokaler_gewinn_c,temp_messspiel,laeufe_paarig})=>({
      beobachteter_feuchtezuwachs_g_m3_je_c:laeufe_paarig&&mehrfeuchte_g_m3>=0&&lokaler_gewinn_c>temp_messspiel?
        round(mehrfeuchte_g_m3/lokaler_gewinn_c):null,
      hinweis:'Verhältnis zweier eigener Messdifferenzen. Keine Stoffbilanz für den Raum oder Vorhersage für andere Luftfeuchte.'}),
    {mehrfeuchte_g_m3:1.2,lokaler_gewinn_c:2,temp_messspiel:0.4,laeufe_paarig:true},
    {beobachteter_feuchtezuwachs_g_m3_je_c:0.6}),

  tool('verdunster_raumfeuchte_versuchsabbruch_zielbelegt',
    'Berichtet einen örtlichen Erfolg und eine spätere vorgegebene Abbruchmarke als getrennte Befunde — Preserve a measured local improvement and a later user-set trial stop as separate outcomes.',
    AIR_AC,{lokaler_nutzen:state('Ausgang der örtlichen Probe.', ['erreicht','nicht_erreicht','offen']),
      gestoppt:state('Belegter Grund des Testendes.', ['eigene_feuchtegrenze','regulaeres_ende','sonstiger_grund','offen']),
      nutzzeit:min('Bis Testende dokumentierte aktive Nutzungsdauer')},
    ({lokaler_nutzen,gestoppt,nutzzeit})=>({
      lokaler_befund:lokaler_nutzen,ganzer_plan_abschliessend_belegt:gestoppt==='regulaeres_ende',
      auszuwertende_nutzzeit_min:nutzzeit,
      hinweis:'Ein örtlich gutes Ergebnis vor Abbruch ist kein Nachweis für die gesamte geplante Zeit. Die eigene Feuchtegrenze ist kein allgemeiner Ratschlag.'}),
    {lokaler_nutzen:'erreicht',gestoppt:'eigene_feuchtegrenze',nutzzeit:25},
    {lokaler_befund:'erreicht',ganzer_plan_abschliessend_belegt:false,auszuwertende_nutzzeit_min:25}),

  tool('luftkuehler_luftgeschwindigkeit_kopf_und_tischzone',
    'Vergleicht eine räumliche Zielverteilung des Luftstroms zwischen Sitzhöhe und Tischhöhe — Check a two-zone airflow arrangement against distinct personal goals.',
    NO_INSTALL,{oben:air('Beobachtete Luftbewegung am Sitzplatz'),unten:air('Beobachtete Luftbewegung auf gleicher Achse am Tisch'),
      sitz_min:air('Eigener gewünschter Mindestwert am Sitzplatz'),tisch_max:air('Eigener gewünschter Höchstwert am Tisch'),
      gleicher_zustand:yes('Gleiche Einstellung und zur selben Ausrichtung gehörende Messungen?')},
    ({oben,unten,sitz_min,tisch_max,gleicher_zustand})=>({
      sitzreserve_m_s:round(oben-sitz_min),tischreserve_m_s:round(tisch_max-unten),
      verteilung_erfuellt:gleicher_zustand?oben>=sitz_min&&unten<=tisch_max:null,
      hinweis:'Eigene Messorte und verschiedene Wunschrichtungen. Keine Geräteempfehlung bei ungeklärter Luftverteilung.'}),
    {oben:1.1,unten:0.7,sitz_min:1,tisch_max:0.5,gleicher_zustand:true},
    {sitzreserve_m_s:0.1,tischreserve_m_s:-0.2,verteilung_erfuellt:false}),

  tool('luftkuehler_betriebswechsel_pumpe_luft_getrennte_belege',
    'Erfasst den beobachteten Gebläsezustand und den getrennt bestätigten Wasserweg bei einem normalen Betriebswechsel — Record independently verified airflow and wet circulation after a normal mode change.',
    COOLER,{luft:state('Beobachtete Luftbewegung am Auslass.', ['vorhanden','nicht_beobachtet','keine']),
      wasser:state('Aus einer dokumentierten externen Geräteanzeige oder dem vorhandenen Protokoll bestätigter Wasserweg.', ['aktiv','aus','unbekannt']),
      alternative_trocken_belegt:yes('Hersteller beschreibt den gewählten Luftbetrieb mit deaktiviertem Wasserweg.')},
    ({luft,wasser,alternative_trocken_belegt})=>({
      vorgenommener_trockenlauf_dokumentiert:alternative_trocken_belegt&&luft==='vorhanden'&&wasser==='aus',
      getrennte_wasserbeobachtung:wasser,
      hinweis:'Luftbewegung allein zeigt keine Wasserförderung. Keine Verkleidung öffnen und keine unbekannte Betriebsart erzwingen.'}),
    {luft:'vorhanden',wasser:'unbekannt',alternative_trocken_belegt:true},
    {vorgenommener_trockenlauf_dokumentiert:false,getrennte_wasserbeobachtung:'unbekannt'}),

  tool('luftkuehler_vergleich_ein_tankvolumen_getrennte_laufarten',
    'Prüft ob eine Tanklaufzeitangabe aus dem gesuchten Nassbetrieb oder nur aus einer anderen Nutzung stammt — Verify whether a published tank runtime refers to the intended wet-use setup.',
    COOLER,{betriebsart:state('Betriebsart hinter der Angabe.', ['nass','trocken','wechselnd','offen']),
      nutzvolumen_belegt:yes('Die Messung ist dem nutzbaren Volumen desselben Tanks zugeordnet.'),
      luftstufe_belegt:yes('Die für den Vergleich benötigte beobachtete Luftstufe ist angegeben.'),
      lokaler_nutzen_belegt:yes('Die Angaben belegen auch eine Messung am eigenen Nutzplatz.')},
    ({betriebsart,nutzvolumen_belegt,luftstufe_belegt,lokaler_nutzen_belegt})=>({
      nasslaufzeit_zuordenbar:betriebsart==='nass'&&nutzvolumen_belegt&&luftstufe_belegt,
      eigener_nutzen_belegt:lokaler_nutzen_belegt,
      hinweis:'Eine Tankangabe allein belegt weder die Laufzeit in einem anderen Modus noch den Nutzen am eigenen Platz. Bei ungeklärten Daten Vergleich oder Kauf offenlassen.'}),
    {betriebsart:'wechselnd',nutzvolumen_belegt:true,luftstufe_belegt:true,lokaler_nutzen_belegt:false},
    {nasslaufzeit_zuordenbar:false,eigener_nutzen_belegt:false}),
];
