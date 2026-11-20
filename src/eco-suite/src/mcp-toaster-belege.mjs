const page='/produkte.html';
const scope={markt:'DE',modell:'Bosch TAT8613',quelle_url:'https://media3.bosch-home.com/Documents/9001690573_A.pdf'};
const flag=description=>({type:'boolean',description});
const choice=(description,...values)=>({type:'string',description,enum:values});
const n=(description,maximum=1000)=>({type:'number',description,minimum:0,maximum});
const proof=flag('Bosch TAT8613 und deutsche Herstellerunterlagen am betreffenden Gerät oder Angebot bestätigt?');
function tool(name,description,fields,calculate,args,expect){
  return {name,description,page,properties:{modell_de_bestaetigt:proof,...fields},
    calculate:({modell_de_bestaetigt,...values})=>modell_de_bestaetigt?{...scope,...calculate(values)}:{markt:'DE',modell:null,status:'modellbezug_offen'},
    example:{args:{modell_de_bestaetigt:true,...args},expect}};
}

export const toasterBelege=[
  tool('bosch_tat8613_schlitzanzahl_scheibenmass_abgrenzen',
    'Zwei Röstschlitze von belegten Innenmaßen für eine Brotscheibe unterscheiden — Check slot count and distinguish it from fit evidence.',
    {scheiben:n('Zahl der einzelnen Brotscheiben für einen gemeinsamen Durchgang.',20),
      eigene_passprobe:choice('Sicher beobachteter früherer Passzustand mit derselben Brotsorte und Dicke.','passt_frei','passt_nicht','offen')},
    ({scheiben,eigene_passprobe})=>{
      if (!Number.isInteger(scheiben)||scheiben<1) throw new RangeError('Mindestens eine ganze Scheibe angeben.');
      return {schlitze:2,status:scheiben>2?'mehr_scheiben_als_schlitze':eigene_passprobe==='offen'?'innenmass_oder_passung_offen':eigene_passprobe,
        innenmass_mm:null};
    },{scheiben:2,eigene_passprobe:'offen'},{schlitze:2,status:'innenmass_oder_passung_offen',innenmass_mm:null}),

  tool('bosch_tat8613_broetchenaufsatz_integriert_ersatzbeleg',
    'Den integrierten Brötchenaufsatz vom Nachweis eines losen Ersatzteils trennen — Identify the published rack configuration before buying an accessory.',
    {angebot:choice('Art des gefundenen Angebots.','geraet_mit_aufsatz','loser_aufsatz','offen'),
      ersatzteil_bestaetigt:flag('Ist ein loser Aufsatz laut Herstellerunterlagen genau für die volle E-Nummer gelistet?')},
    ({angebot,ersatzteil_bestaetigt})=>({werksbauart:'integriert_versenkbar',status:angebot==='loser_aufsatz'?(ersatzteil_bestaetigt?'eigener_ersatzbeleg_vorhanden':'loser_aufsatz_nicht_zugeordnet'):'integrierter_aufsatz_der_modellbeschreibung'}),
    {angebot:'loser_aufsatz',ersatzteil_bestaetigt:false},{werksbauart:'integriert_versenkbar',status:'loser_aufsatz_nicht_zugeordnet'}),

  tool('bosch_tat8613_aufbacken_max_stufe_aufsatzbedingungen',
    'Maximale Aufbackstufe für den Brötchenaufsatz und Parallelbetrieb des Röstschachts prüfen — Verify the rack mode and its published maximum level.',
    {aufsatz_ausgefahren:flag('Integrierter Brötchenaufsatz ist ausgefahren?'),parallel_toasten:flag('Gleichzeitig Toast im Röstschacht vorgesehen?'),
      folie_oder_tropfendes:flag('Alufolie oder tropfendes Aufbackgut vorgesehen?'),stufe:n('Am Gerät lesbare Stufe.',9)},
    ({aufsatz_ausgefahren,parallel_toasten,folie_oder_tropfendes,stufe})=>{
      const blocked=!aufsatz_ausgefahren||parallel_toasten||folie_oder_tropfendes||stufe<1||stufe>2||!Number.isInteger(stufe);
      return {status:blocked?'kombination_ausserhalb_des_herstellerfalls':'dokumentierter_aufsatzfall',maximalstufe:2,anzeige_maximalstufe:[1,3]};
    },{aufsatz_ausgefahren:true,parallel_toasten:true,folie_oder_tropfendes:false,stufe:2},{status:'kombination_ausserhalb_des_herstellerfalls',maximalstufe:2,anzeige_maximalstufe:[1,3]}),

  tool('bosch_tat8613_auftauen_aufwaermen_ersichtlicher_modus',
    'Bei Toast zwischen Auftauen, Aufwärmen und regulärer Bräunung unterscheiden — Match the selected control to the known bread state.',
    {brotzustand:choice('Beobachteter Zustand des geeigneten Toastguts.','gefroren','kalt_nur_aufwaermen','normal_braeunen','offen'),
      bedienung:choice('Aktuelle Einstellung oder Zusatztaste.','aufwaermsymbol','defrost_mit_roestgrad','normaler_roestgrad','offen')},
    ({brotzustand,bedienung})=>{
      const expected={gefroren:'defrost_mit_roestgrad',kalt_nur_aufwaermen:'aufwaermsymbol',normal_braeunen:'normaler_roestgrad'}[brotzustand]??null;
      return {dokumentierter_modus:expected, passt:expected&&bedienung!=='offen'?expected===bedienung:null};
    },{brotzustand:'gefroren',bedienung:'aufwaermsymbol'},{dokumentierter_modus:'defrost_mit_roestgrad',passt:false}),

  tool('bosch_tat8613_roestband_brotsorte_eine_scheibe',
    'Herstellerbereich für Brotart und Hinweis für eine einzelne Scheibe lesen — Read the guide’s browning bands without predicting the result.',
    {sorte:choice('Beschriebene Brotart.','trocken_toast','feuchter_graubrot_vollkorn','dickes_schwarzbrot','offen'),
      anzahl:choice('Tatsächliche Beladung.','eine','zwei','offen')},
    ({sorte,anzahl})=>({referenzstufen:{trocken_toast:[1,5],feuchter_graubrot_vollkorn:[6,7],dickes_schwarzbrot:[8,9]}[sorte]??null,
      einzelhinweis:anzahl==='eine'?'bei_einer_scheibe_kleiner_als_bei_zwei':null}),
    {sorte:'feuchter_graubrot_vollkorn',anzahl:'eine'},{referenzstufen:[6,7],einzelhinweis:'bei_einer_scheibe_kleiner_als_bei_zwei'}),

  tool('bosch_tat8613_zwei_leds_roestgrad_ablesen',
    'Zwei gleichzeitig angezeigte Röstgradzahlen beim TAT8613 als Zwischenstufe lesen — Decode consecutive odd markings while the selected level is shown.',
    {anzeigephase:choice('Beobachtete Anzeigephase.','eingestellter_wert','laufende_fortschrittsanzeige','offen'),
      links:n('Erste sichtbare Ziffer.',9),rechts:n('Zweite sichtbare Ziffer, bei nur einer 0.',9)},
    ({anzeigephase,links,rechts})=>{
      const marks=[1,3,5,7,9];
      const level=anzeigephase==='eingestellter_wert'&&marks.includes(links)?rechts===0?links:marks.includes(rechts)&&rechts===links+2?links+1:null:null;
      return {roestgrad:level,status:level===null?'stufenanzeige_offen':'roestgrad_aus_anzeige'};
    },{anzeigephase:'eingestellter_wert',links:3,rechts:5},{roestgrad:4,status:'roestgrad_aus_anzeige'}),

  tool('bosch_tat8613_memory_nach_stromunterbrechung',
    'Beim Wiederanschalten die gespeicherte Röstgradwahl als möglichen Grund für die gelesene Einstellung erkennen — Read what the memory function preserves after power interruption.',
    {vorgang:choice('Was ist seit der letzten dokumentierten Stufe passiert?','ausgeschaltet','ausgesteckt','stromausfall','anderer_oder_offen'),
      neue_auswahl:flag('Seitdem wurde manuell eine neue Auswahl vorgenommen?')},
    ({vorgang,neue_auswahl})=>({alte_wahl_speicherbar:!neue_auswahl&&vorgang!=='anderer_oder_offen'?true:null,
      status:neue_auswahl?'wahl_wurde_geaendert':vorgang==='anderer_oder_offen'?'ablauf_offen':'memory_erklaert_alte_auswahl'}),
    {vorgang:'ausgesteckt',neue_auswahl:false},{alte_wahl_speicherbar:true,status:'memory_erklaert_alte_auswahl'}),

  tool('bosch_tat8613_roestvorgang_stopp_ende_highlift',
    'Stopp, automatisches Anheben und High Lift getrennt einordnen — Distinguish early user cancellation, the observed end and the extraction aid.',
    {beobachtung:choice('Dokumentiertes Ereignis.','stopptaste_gedrueckt','toast_automatisch_angehoben','hebel_nach_ende_angehoben','ziffern_leuchten','offen')},
    ({beobachtung})=>({status:{stopptaste_gedrueckt:'manueller_stopp',toast_automatisch_angehoben:'dokumentiertes_programmende',
      hebel_nach_ende_angehoben:'entnahmehilfe',ziffern_leuchten:'fortschritt_ohne_minutenbeleg',offen:'ereignis_offen'}[beobachtung]}),
    {beobachtung:'hebel_nach_ende_angehoben'},{status:'entnahmehilfe'}),

  tool('bosch_tat8613_kruemelschublade_oder_broetchenaufsatz_pflege',
    'Krümelschublade, Aufsatzbereich und Gehäuse nach sicherem Abkühlen unterscheiden — Match the documented cleaning method to the observed location.',
    {stelle:choice('Wo soll gepflegt werden?','kruemelschublade','unter_broetchenaufsatz','aussengehaeuse','roestschacht_oder_offen'),
      abgekuehlt_und_ausgesteckt:flag('Toaster ist vollständig abgekühlt und der Netzstecker gezogen?')},
    ({stelle,abgekuehlt_und_ausgesteckt})=>({hinweis:abgekuehlt_und_ausgesteckt?{kruemelschublade:'schublade_herausziehen_und_abwischen',unter_broetchenaufsatz:'harter_pinsel_laut_anleitung',aussengehaeuse:'feucht_abwischen'}[stelle]??null:null,
      status:abgekuehlt_und_ausgesteckt?'nur_aussenpflege_zugeordnet':'vor_pflege_abkuehlen_und_stecker_ziehen'}),
    {stelle:'kruemelschublade',abgekuehlt_und_ausgesteckt:true},{hinweis:'schublade_herausziehen_und_abwischen',status:'nur_aussenpflege_zugeordnet'}),

  tool('bosch_tat8613_kruemelschublade_vor_betrieb_vorhanden',
    'Beim Gebrauchtkauf eine vorhandene Krümelschublade als Betriebsvoraussetzung prüfen — Check the removable tray as required equipment.',
    {schublade:choice('Am exakten Gerät bestätigter Zustand.','vorhanden_und_eingesetzt','fehlt','entnommen','offen')},
    ({schublade})=>({bedingung_erfuellt:schublade==='offen'?null:schublade==='vorhanden_und_eingesetzt',
      status:schublade==='offen'?'vorhandensein_offen':schublade==='vorhanden_und_eingesetzt'?'schublade_eingesetzt':'betrieb_ohne_schublade_nicht_vorgesehen'}),
    {schublade:'fehlt'},{bedingung_erfuellt:false,status:'betrieb_ohne_schublade_nicht_vorgesehen'}),
];
