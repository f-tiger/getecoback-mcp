const page='/produkte.html';
const azurManual='https://ot-dam.versuni.com/adaptivemedia/rendition?id=c23feb03942aa27d2d04f2cc0ab5dfefca7ad367';
const azurSpecs='https://www.documents.philips.com/assets/20221203/953954635d7d47f9b150af600125d8d2.pdf';
const station='https://www.philips.de/p-p/PSG7140_70/perfectcare-7000-series-dampfbuegelstation';
const stationManual='https://dam.versuni.com/m/4466b01bbea5bd6/original/PerfectCare-7000-series_WEU_-17993-_user-manual.pdf';
const supportAzur='https://www.home.id/de-DE/DST7040';
const supportStation='https://www.home.id/de-DE/PSG7140';
const manualDate='2026-11-20';
const pick=(description,...values)=>({type:'string',description,enum:values});
const yes=description=>({type:'boolean',description});
const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const model=description=>pick(description,'dst7040_80','psg7140_70','anderes_oder_offen');
const proof=description=>pick(description,'bestaetigt','abweichend','offen');
const ml=description=>num(description,0,3000);
const min=description=>num(description,0,600);
const round=value=>Number(value.toFixed(3));
const known={
  dst7040_80:{system:'Quick Calc Release',tank:300,steam:50,burst:250,pressure:null,source:azurSpecs},
  psg7140_70:{system:'Easy De-Calc Plus',tank:1800,steam:120,burst:600,pressure:8,source:station},
};
function tool(name,description,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}
function from(quelle){
  const handbuchseite=quelle===azurManual?supportAzur:quelle===stationManual?supportStation:null;
  return {quelle,handbuchseite,quelle_geprueft_am:manualDate};
}
function withSource(quelle,grenze){
  return {...from(quelle),grenze};
}

export const dampfbuegelBelege=[
  tool('philips_buegelgeraet_kalksystem_typenschild_abgleich',
    'Bei Azur oder PerfectCare das Entkalkungssystem nur dem passenden Typenschild und der deutschen Quelle zuordnen — Identify the documented descaling system from the exact model plate.',
    {typenschild:model('Vollständiger am Gerät bestätigter Code.'),angebot:pick('Im Angebot genannter Name des Systems.','quick_calc_release','easy_de_calc_plus','easy_de_calc','smart_calc_clean','offen')},
    ({typenschild,angebot})=>{
      const specs=known[typenschild];
      const status=!specs?'exakten_code_klaeren':angebot==='offen'?'angebotsangabe_offen':
        typenschild==='psg7140_70'&&angebot==='easy_de_calc'?'kurzname_im_produkttext_vollname_im_datenblatt':
          (typenschild==='dst7040_80'?angebot==='quick_calc_release':angebot==='easy_de_calc_plus')?'angabe_passt':'abweichende_angabe';
      return {dokumentiertes_system:specs?.system??null,status,...withSource(typenschild==='dst7040_80'?azurManual:specs?.source??null,'Die Namenszuordnung belegt weder die Wartung eines Exemplars noch Zubehörkompatibilität.')};
    },{typenschild:'psg7140_70',angebot:'easy_de_calc'},
    {dokumentiertes_system:'Easy De-Calc Plus',status:'kurzname_im_produkttext_vollname_im_datenblatt'}),

  tool('philips_buegeleisen_hartes_wasser_dokumentempfehlung',
    'Für Azur DST7040 Leitungswasser, hartes Wasser und unbekannte Härte gegen die deutsche Anleitung abgleichen — Match the DST7040 manual to the known local water hardness.',
    {typenschild:model('Exakter am eigenen Gerät bestätigter Code.'),haerte:pick('Vor Ort bekannte Eigenschaft des Leitungswassers.','hart','nicht_hart','unbekannt')},
    ({typenschild,haerte})=>{
      const exact=typenschild==='dst7040_80';
      return {leitungswasser_grundsaetzlich_genannt:exact?true:null,empfehlung:!exact?'passende_geraeteanleitung_klaeren':haerte==='hart'?'gleichteile_leitungswasser_und_destilliertes_oder_demineralisiertes_wasser':
        haerte==='nicht_hart'?'leitungswasser_in_anleitung_genannt':'wasserhaerte_zuerst_klaeren',
        ...withSource(exact?azurManual:null,'Diese konkrete Härteempfehlung stammt aus der DST7040 Anleitung. Die Härte wird aus den Eingaben übernommen.')};
    },{typenschild:'dst7040_80',haerte:'hart'},
    {leitungswasser_grundsaetzlich_genannt:true,empfehlung:'gleichteile_leitungswasser_und_destilliertes_oder_demineralisiertes_wasser'}),

  tool('philips_azur_wassermischung_gleichteile_abmessen',
    'Zwei getrennt gemessene Mengen für die dokumentierte Gleichteile-Regel des Azur DST7040 bei hartem Wasser vergleichen — Compare two measured amounts against the Azur manual’s equal-parts rule.',
    {geltung:yes('Sind DST7040, geltende Anleitung, hartes Leitungswasser und der passende zweite Wassertyp bestätigt?'),leitungswasser_ml:ml('Separat gemessene Leitungswassermenge.'),zweite_menge_ml:ml('Separat gemessene Menge destillierten oder demineralisierten Wassers.'),
      messtoleranz_ml:num('Eigene Vergleichstoleranz für die gemessene Differenz in ml.',0,100)},
    ({geltung,leitungswasser_ml,zweite_menge_ml,messtoleranz_ml})=>{
      const compared=geltung&&leitungswasser_ml>0&&zweite_menge_ml>0;
      const delta=Math.abs(leitungswasser_ml-zweite_menge_ml);
      return {differenz_ml:compared?round(delta):null,gleichteile_in_eigener_toleranz:compared?delta<=messtoleranz_ml:null,
        ...withSource(azurManual,'Auswertung der abgemessenen Mengen. Die eigene Messtoleranz ist keine Herstellertoleranz. Die Füllmarke gilt separat.')};
    },{geltung:true,leitungswasser_ml:68,zweite_menge_ml:62,messtoleranz_ml:2},
    {differenz_ml:6,gleichteile_in_eigener_toleranz:false}),

  tool('philips_azur_wasserzusatz_anleitung_abgrenzung',
    'Eine einzelne Flüssigkeit im Azur DST7040 der dokumentierten Liste ausgeschlossener Zusätze und Wässer zuordnen — Check a single liquid or additive against the Azur manual.',
    {dst7040_belegt:yes('Ordnet die Kennzeichnung das Gerät der gelesenen DST7040 Anleitung zu?'),
      fluessigkeit:pick('Bekannte Herkunft der gewählten Flüssigkeit.','parfuem','trockner_kondensat','essig','staerke','entkalkungsmittel','buegelzusatz','chemisch_enthaertet','leitungswasser','unbekannt')},
    ({dst7040_belegt,fluessigkeit})=>{
      const status=!dst7040_belegt?'geraeteanleitung_klaeren':fluessigkeit==='unbekannt'?'zusammensetzung_klaeren':fluessigkeit==='leitungswasser'?'leitungswasser_genannt_haerte_gesondert_pruefen':'in_anleitung_ausgeschlossen';
      return {status,...withSource(azurManual,'Die Zuordnung ist auf die genannten Fälle dieser Geräteanleitung begrenzt. Bereits eingefüllte unbekannte Flüssigkeit mit dem Hersteller besprechen.')};
    },{dst7040_belegt:true,fluessigkeit:'trockner_kondensat'},
    {status:'in_anleitung_ausgeschlossen'}),

  tool('philips_buegelgeraet_tankangabe_vs_gemessene_max_marke',
    'Die Nennangabe des Wassertanks mit einer am selben Behälter separat erfassten MAX-Markierung einordnen — Keep stated tank size separate from a measured reservoir mark.',
    {typenschild:model('Code des eigenen Geräts.'),behaelterzuordnung:proof('Gehört der tatsächlich gemessene Tank eindeutig zu diesem Gerät?'),
      max_beobachtet:yes('Wurde die MAX-Markierung abgelesen und als Volumen separat protokolliert?'),messung_ml:ml('Selbst erfasstes Volumen bis zur beobachteten MAX-Markierung.')},
    ({typenschild,behaelterzuordnung,max_beobachtet,messung_ml})=>{
      const specs=known[typenschild];
      const observed=Boolean(specs&&behaelterzuordnung==='bestaetigt'&&max_beobachtet&&messung_ml>0);
      return {hersteller_nennwert_ml:specs?.tank??null,protokollierte_max_marke_ml:observed?messung_ml:null,
        basis:observed?'eigene_markenmessung_separat':'markenmessung_offen',...withSource(specs?.source??null,'Nennvolumen und eigene Messung bleiben getrennt. Angaben sind keine Empfehlung für eine konkrete Füllung.')};
    },{typenschild:'dst7040_80',behaelterzuordnung:'offen',max_beobachtet:true,messung_ml:287},
    {hersteller_nennwert_ml:300,protokollierte_max_marke_ml:null,basis:'markenmessung_offen'}),

  tool('philips_perfectcare_wassertank_entnahme_eigenes_exemplar',
    'Bei der PSG7140/70 die Kaufanforderung abnehmbarer Wassertank vom erfassten konkreten Gebrauchtangebot unterscheiden — Verify a detachable tank requirement and specimen evidence.',
    {psg7140_70_belegt:yes('Ist die vollständige Kennung am angebotenen Gerät belegt?'),abnehmbar_erforderlich:yes('Ist separat abnehmbarer Tank eine persönliche Kaufanforderung?'),
      tank_am_exemplar:pick('Beleg am angebotenen Exemplar.','eigener_tank_gezeigt','fehlt','fremder_tank_gezeigt','offen')},
    ({psg7140_70_belegt,abnehmbar_erforderlich,tank_am_exemplar})=>{
      const status=!psg7140_70_belegt?'modellbeleg_offen':!abnehmbar_erforderlich?'keine_kaufhuerde':tank_am_exemplar==='eigener_tank_gezeigt'?'geraetemerkmal_und_exemplarbeleg_erfasst':
        tank_am_exemplar==='fehlt'?'tank_fehlt_am_angebot':tank_am_exemplar==='fremder_tank_gezeigt'?'zuordnung_des_ersatzes_offen':'tank_des_exemplars_belegen';
      return {abnehmbar_laut_hersteller:psg7140_70_belegt?true:null,status,...withSource(station,'Die Herstellerangabe ist kein Nachweis für Vollständigkeit, Dichtheit oder passende Ersatzteilnummer.')};
    },{psg7140_70_belegt:true,abnehmbar_erforderlich:true,tank_am_exemplar:'fremder_tank_gezeigt'},
    {abnehmbar_laut_hersteller:true,status:'zuordnung_des_ersatzes_offen'}),

  tool('philips_buegeldampf_dauerstoss_druck_vergleichsart',
    'Je nach Messgröße die deutschen /80- und /70-Modellangaben für Durchfluss, Dampfstoß und Druck getrennt vergleichen — Compare matching steam specification types without equating different units.',
    {typenschild:model('Variante mit bestätigtem Schrägstrich-Suffix.'),messgroesse:pick('Bezug der zu prüfenden Zahl.','dauer_g_min','stoss_g','druck_bar','nur_dampf_ohne_einheit'),
      angebotszahl:num('Im Angebot genannte Zahl entsprechend dem angegebenen Bezug.',0,2000)},
    ({typenschild,messgroesse,angebotszahl})=>{
      const specs=known[typenschild];
      const values=specs&&{dauer_g_min:specs.steam,stoss_g:specs.burst,druck_bar:specs.pressure};
      const value=values?.[messgroesse]??null;
      return {herstellerwert:value,abweichung:value===null?null:round(angebotszahl-value),status:value===null?'vergleich_ohne_bezug_offen':'gleiche_messgroesse_abgeglichen',
        ...withSource(specs?.source??null,'Herstellerwerte der gewählten Kategorie. Dampfmenge, Dampfstrom und Druck erlauben hier keine Aussage über Ergebnisse oder Zeitbedarf.')};
    },{typenschild:'psg7140_70',messgroesse:'stoss_g',angebotszahl:120},
    {herstellerwert:600,abweichung:-480,status:'gleiche_messgroesse_abgeglichen'}),

  tool('philips_perfectcare_gewicht_handteil_station_verpackung',
    'Bei der PSG7140/70 ein persönlich gesetztes Gewichtslimit der tatsächlich bewegten Einheit zuordnen — Apply a personal weight budget to the handpiece, combined station or retail box.',
    {psg7140_70_belegt:yes('Ist der genaue /70 Code bestätigt?'),bewegte_einheit:pick('Welche Einheit soll als Ganzes bewegt werden?','handteil','handteil_mit_basis','originalverpackung','offen'),
      eigenes_limit_kg:num('Persönliches Gewichtslimit für den Vergleich mit der Herstellerangabe.',0,40)},
    ({psg7140_70_belegt,bewegte_einheit,eigenes_limit_kg})=>{
      const weights={handteil:0.8,handteil_mit_basis:3.85,originalverpackung:5.3};
      const value=psg7140_70_belegt?weights[bewegte_einheit]??null:null;
      return {herstellergewicht_kg:value,rest_zum_eigenen_limit_kg:value===null?null:round(eigenes_limit_kg-value),
        ...withSource(station,'Spezifikationsvergleich. Tatsächliches Gewicht mit Flüssigkeit und Beigaben ist gesondert zu erfassen. Das eigene Limit beschreibt keine sichere Traglast.')};
    },{psg7140_70_belegt:true,bewegte_einheit:'handteil_mit_basis',eigenes_limit_kg:3.5},
    {herstellergewicht_kg:3.85,rest_zum_eigenen_limit_kg:-0.35}),

  tool('philips_perfectcare_trageverriegelung_exemplarbeleg',
    'Die Trageverriegelung der PSG7140/70 vom tatsächlich beobachteten Zustand am eigenen Exemplar unterscheiden — Separate the stated carry lock feature from an observed lock state.',
    {psg7140_70_belegt:yes('Ist genau PSG7140/70 am Exemplar bestätigt?'),einrasten:proof('Ist der Zustand des eigenen Verschlusses eindeutig beobachtet?'),
      nur_verkaeuferangabe:yes('Beruht der Zustand ausschließlich auf der Aussage des Verkäufers?')},
    ({psg7140_70_belegt,einrasten,nur_verkaeuferangabe})=>{
      const observed=psg7140_70_belegt&&!nur_verkaeuferangabe&&einrasten!=='offen';
      return {dokumentierte_verriegelung:psg7140_70_belegt?true:null,exemplarbeobachtung:observed?einrasten:null,
        status:observed?'eigenen_verschlusszustand_erfasst':'eigenen_verschlusszustand_klaeren',
        ...withSource(station,'Die Funktion und Beobachtung sind getrennte Belege. Keine Aussage über Abkühlung, Traglast oder Transportfreigabe.')};
    },{psg7140_70_belegt:true,einrasten:'bestaetigt',nur_verkaeuferangabe:true},
    {dokumentierte_verriegelung:true,exemplarbeobachtung:null,status:'eigenen_verschlusszustand_klaeren'}),

  tool('philips_perfectcare_statusleuchte_wasser_vs_entkalkung',
    'Bei PSG7140/70 eine eindeutig erkannte Wassertankanzeige oder Entkalkungserinnerung dem passenden Dokumentabschnitt zuordnen — Identify the next documentation section by the confirmed indicator.',
    {psg7140_70_belegt:yes('Genau PSG7140/70 anhand der Gerätekennung bestätigt?'),
      anzeige:pick('Anhand Text, Symbollegende oder Bedienungsanleitung eindeutig erkannte Anzeige.','wasser','entkalkung','beide','nur_leuchten_gesehen')},
    ({psg7140_70_belegt,anzeige})=>{
      const map={wasser:['wassertank'],entkalkung:['reinigung_und_wartung'],beide:['wassertank','reinigung_und_wartung']};
      const sections=psg7140_70_belegt?map[anzeige]??[]:[];
      return {abschnitte:sections,status:sections.length?'anzeigen_gemeldet':'anzeige_oder_modell_zuerst_klaeren',
        ...withSource(station,'Die Produktseite führt Anzeigen separat. Leuchtenfarbe allein ist hier keine Zuordnung und eine Anzeige keine Diagnose.')};
    },{psg7140_70_belegt:true,anzeige:'beide'},
    {abschnitte:['wassertank','reinigung_und_wartung'],status:'anzeigen_gemeldet'}),

  tool('philips_azur_autoabschaltung_ruhelage_dokumentwert',
    'Für den bestätigten DST7040 die dokumentierten Auto-Abschaltzeiten auf Sohle und Standfläche unterscheiden — Read the specified idle threshold for the two documented resting positions.',
    {dst7040_belegt:yes('Ist der eigene DST7040 von der gelesenen Anleitung erfasst?'),
      position:pick('Während der gesamten Beobachtung bestätigte Ruhelage.','auf_der_sohle','auf_standflaeche','wechselnd_oder_offen'),
      ruhe_sekunden:num('Eigene beobachtete Zeit ohne Benutzung in dieser Position.',0,3600)},
    ({dst7040_belegt,position,ruhe_sekunden})=>{
      const times={auf_der_sohle:30,auf_standflaeche:480};
      const limit=dst7040_belegt?times[position]??null:null;
      return {dokumentierte_schwelle_s:limit,ruhe_laut_protokoll_laenger:limit===null?null:ruhe_sekunden>limit,
        ...withSource(azurManual,'Vergleich der dokumentierten Anzeigezeit. Keine Aussage über den Zustand dieses Exemplars, Restwärme oder beaufsichtigungsfreien Betrieb.')};
    },{dst7040_belegt:true,position:'auf_standflaeche',ruhe_sekunden:90},
    {dokumentierte_schwelle_s:480,ruhe_laut_protokoll_laenger:false}),

  tool('philips_azur_calc_pflegefenster_kalender_und_anlass',
    'Für den DST7040 das empfohlene Kalenderintervall getrennt von dokumentierten braunen Flecken oder braunem Wasser prüfen — Separate the manual’s calendar maintenance range from an observed trigger.',
    {dst7040_belegt:yes('Ist genau DST7040 in der zum Gerät gehörigen Ausgabe identifiziert?'),
      vollmonate_seit_calc:num('Vollständig verstrichene Kalendermonate seit eindeutig protokollierter letzter Calc-Pflege.',0,120),
      datum_belegt:yes('Ist der letzte Vorgang datiert und dem gleichen Exemplar zugeordnet?'),hart:proof('Ist hartes Wasser vor Ort belegt?'),
      braun:pick('Eigenes Protokoll von braunen Flecken oder braunem Wasser.','gesehen','nicht_gesehen','offen')},
    ({dst7040_belegt,vollmonate_seit_calc,datum_belegt,hart,braun})=>{
      if(!Number.isInteger(vollmonate_seit_calc)) throw new RangeError('Nur vollständige Monate');
      const interval=dst7040_belegt&&datum_belegt;
      const band=!interval?null:vollmonate_seit_calc>3?'nach_empfohlenem_bereich':vollmonate_seit_calc>=1?'im_empfohlenen_bereich':'vor_empfohlenem_bereich';
      const priority=!dst7040_belegt?'anleitung_zuordnen':braun==='gesehen'?'anlass_in_anleitung_genannt':hart==='bestaetigt'?'haerteres_wasser_haeufiger_beruecksichtigen':band??'verlaessliches_wartungsdatum_klaeren';
      return {dokumentierter_bereich_monate:dst7040_belegt?[1,3]:null,kalenderbezug:band,naechster_beleg:priority,
        ...withSource(azurManual,'Die Anleitung nennt bei hartem Wasser häufigere Pflege ohne eigenen Zahlenwert. Braune Spuren sind kein Beweis für eine einzelne Ursache.')};
    },{dst7040_belegt:true,vollmonate_seit_calc:0,datum_belegt:true,hart:'offen',braun:'gesehen'},
    {dokumentierter_bereich_monate:[1,3],kalenderbezug:'vor_empfohlenem_bereich',naechster_beleg:'anlass_in_anleitung_genannt'}),

  tool('philips_azur_spray_dampfart_beobachtung_zuordnen',
    'Beim DST7040 Wasserspray, vertikalen Dampfstoß und fortlaufenden Dampf nach beobachtetem Bedienelement unterscheiden — Attribute an observed spray or steam event to its confirmed control and position.',
    {dst7040_belegt:yes('Ist DST7040 im Gerätehandbuch zugeordnet?'),
      bedienelement:pick('Bestätigt beobachtete Eingabe.','wassertaste','dampfstoss_kurz','dampfstoss_gehalten','regler','offen'),
      lage:pick('Beobachtete Lage beim Vorgang.','vertikal','horizontal','offen')},
    ({dst7040_belegt,bedienelement,lage})=>{
      const kind=!dst7040_belegt?'modell_offen':bedienelement==='wassertaste'?'wasserspray':bedienelement==='dampfstoss_kurz'&&lage!=='offen'?'dampfstoss':
        bedienelement==='dampfstoss_gehalten'&&lage==='vertikal'?'vertikal_gehalten_kein_konstanter_dampf_laut_anleitung':
          bedienelement==='regler'?'gewaehlter_reglermodus_separat_erfassen':'beobachtung_unvollstaendig';
      return {zuordnung:kind,...withSource(azurManual,'Das Handbuch unterscheidet die Bedienelemente. Die Zuordnung bestätigt keinen tatsächlichen Ausstoß oder eine Eignung für das Textil.')};
    },{dst7040_belegt:true,bedienelement:'dampfstoss_gehalten',lage:'vertikal'},
    {zuordnung:'vertikal_gehalten_kein_konstanter_dampf_laut_anleitung'}),

  tool('philips_azur_sohle_pflegeaussage_eigener_nachweis',
    'Beim DST7040 einen angebotenen Sohlenreiniger von den ausdrücklich ausgeschlossenen Reinigungsarten unterscheiden — Classify a proposed soleplate cleaning method against the Azur manual.',
    {dst7040_belegt:yes('Ist die Geräteanleitung für das eigene DST7040 bestätigt?'),
      pflegeart:pick('Geprüfte Reinigungsart für die Bügelsohle.','feuchtes_tuch','scheuerschwamm','essig','chemischer_reiniger','fliessendes_wasser_am_geraet','unbekannt')},
    ({dst7040_belegt,pflegeart})=>{
      const status=!dst7040_belegt?'dokumentzuordnung_offen':pflegeart==='unbekannt'?'pflegeart_klaeren':pflegeart==='feuchtes_tuch'?'anleitung_nennt_feuchtes_tuch':'anleitung_schliesst_diese_pflegeart_aus';
      return {status,...withSource(azurManual,'Sohlenpflege laut DST7040 Anleitung. Die Auswertung bewertet weder Beschichtungsschäden noch Gerätereparaturen.')};
    },{dst7040_belegt:true,pflegeart:'scheuerschwamm'},
    {status:'anleitung_schliesst_diese_pflegeart_aus'}),

  tool('philips_perfectcare_bewegungssensor_automatik_beobachtung',
    'Bei der PSG7140/70 einen gemeldeten Dampfausstoß mit dokumentierter Automatik und tatsächlich beobachteter Bewegung einordnen — Attribute an event to automatic steam only when its trigger was observed.',
    {psg7140_70_belegt:yes('Ist der Code PSG7140/70 belegt?'),automatik:proof('War der Automatikbezug laut Anzeige oder dem bestätigten Handbuch eindeutig geklärt?'),
      ausloeser:pick('Für den fraglichen Dampfausstoß konkret beobachteter Auslöser.','nur_bewegung','manuell_ausgeloest','beides','unbekannt')},
    ({psg7140_70_belegt,automatik,ausloeser})=>{
      const status=!psg7140_70_belegt?'geraet_klaeren':ausloeser==='manuell_ausgeloest'?'manueller_ausloeser_protokolliert':
        automatik==='bestaetigt'&&ausloeser==='nur_bewegung'?'bewegung_und_automatik_protokolliert':'ausloeser_oder_automatik_offen';
      return {bewegungssensor_laut_hersteller:psg7140_70_belegt?true:null,status,
        ...withSource(station,'Der Bewegungssensor ist für dieses Modell dokumentiert. Die Funktion ergibt weder eine Diagnose bei fehlendem Dampf noch eine Dampfmengenprognose.')};
    },{psg7140_70_belegt:true,automatik:'bestaetigt',ausloeser:'beides'},
    {bewegungssensor_laut_hersteller:true,status:'ausloeser_oder_automatik_offen'}),

  tool('philips_perfectcare_zweistundenangabe_eigene_arbeitszeit',
    'Den oberen Zwei-Stunden-Werbewert der PSG7140/70 mit der Nettozeit eines eigenen protokollierten Durchgangs beschreiben — Isolate observed active time from the maker’s up-to-two-hours statement.',
    {psg7140_70_belegt:yes('Ist genau die eigene /70 Variante bestätigt?'),durchlauf_belegt:yes('Start, Ende und Pausen aus demselben beobachteten Durchlauf?'),
      brutto_min:min('Verstrichene beobachtete Minuten.'),pausen_min:min('Darin enthaltene, separat beobachtete Pausen in Minuten.'),
      nachfuellungen:num('Separat beobachtete Anzahl weiterer Tankfüllungen, ohne die Startfüllung.',0,50)},
    ({psg7140_70_belegt,durchlauf_belegt,brutto_min,pausen_min,nachfuellungen})=>{
      if(!Number.isInteger(nachfuellungen)||pausen_min>brutto_min) throw new RangeError('Pausen oder Nachfüllungen stimmen nicht mit dem Protokoll überein');
      const measured=psg7140_70_belegt&&durchlauf_belegt;
      return {genannte_obergrenze_min:psg7140_70_belegt?120:null,netto_beobachtet_min:measured?round(brutto_min-pausen_min):null,
        nachfuellungen_beobachtet:measured?nachfuellungen:null,
        ...withSource(station,'Philips bewirbt eine Dauer bis zu zwei Stunden. Die individuelle Laufzeit bleibt ein Protokollwert. Keine modellierte Tankreichweite.')};
    },{psg7140_70_belegt:true,durchlauf_belegt:true,brutto_min:128,pausen_min:25,nachfuellungen:1},
    {genannte_obergrenze_min:120,netto_beobachtet_min:103,nachfuellungen_beobachtet:1}),

  tool('philips_perfectcare_aufbewahrung_schlauchfach_klett',
    'Bei der dokumentierten PerfectCare-7000-Aufbewahrung Schlauchfach und Kabel-Klett aus einem Foto des abgekühlten Exemplars separat nachweisen — Document the distinct hose and cable storage evidence.',
    {anleitung_am_geraet_bestaetigt:yes('Ist genau die verlinkte west-europäische Anleitungsrevision dem eigenen Gerät zugeordnet?'),
      gleiches_exemplar:yes('Sind beide Fotos oder Beobachtungen demselben abgekühlten Gerät zugeordnet?'),
      schlauchfach:proof('Ist die Zuordnung des Schlauchs zum Fach im eigenen Protokoll eindeutig?'),
      kabel_klett:proof('Ist der Klettverschluss für das Kabel im eigenen Protokoll eindeutig erfasst?')},
    ({anleitung_am_geraet_bestaetigt,gleiches_exemplar,schlauchfach,kabel_klett})=>{
      const keyed=anleitung_am_geraet_bestaetigt&&gleiches_exemplar;
      const seen=keyed?{schlauchfach,kabel_klett}:null;
      return {abstellbelege:seen,status:!keyed?'zuordnung_des_protokolls_offen':schlauchfach==='bestaetigt'&&kabel_klett==='bestaetigt'?'beide_aufbewahrungspunkte_erfasst':'getrennte_belege_nachtragen',
        ...withSource(stationManual,'Die verlinkte Anleitung nennt verschiedene Aufbewahrungsorte für Schlauch und Kabel. Das Foto bestätigt keine vollständige Lager- oder Transportfreigabe.')};
    },{anleitung_am_geraet_bestaetigt:true,gleiches_exemplar:true,schlauchfach:'bestaetigt',kabel_klett:'offen'},
    {abstellbelege:{schlauchfach:'bestaetigt',kabel_klett:'offen'},status:'getrennte_belege_nachtragen'}),

  tool('philips_azur_tropfstopp_eigene_beobachtung',
    'Beim DST7040/80 das Tropfstopp-Merkmal vom selbst beobachteten Ursprung eines einzelnen Tropfens trennen — Log observed droplet origin independently of the Drip Stop feature.',
    {dst7040_80_belegt:yes('Ist die vollständige /80 Variante für das beobachtete Gerät bestätigt?'),
      beobachtet:pick('Direkt beobachteter Ursprung.','sohlenaustritt','tankbereich','nur_fleck','kein_tropfen','offen'),
      gleicher_durchlauf:yes('Ist der Beobachtung der tatsächlich identifizierte Durchlauf eindeutig zugeordnet?')},
    ({dst7040_80_belegt,beobachtet,gleicher_durchlauf})=>{
      const usable=dst7040_80_belegt&&gleicher_durchlauf;
      const locus=usable&&['sohlenaustritt','tankbereich'].includes(beobachtet)?beobachtet:null;
      return {tropfstopp_laut_datenblatt:dst7040_80_belegt?true:null,beobachtungsort:locus,
        status:!usable?'beobachtungsbezug_offen':locus?'austrittsort_protokolliert':beobachtet==='kein_tropfen'?'kein_tropfen_in_diesem_lauf_beobachtet':'austrittsort_offen',
        ...withSource(azurSpecs,'Tropfstopp ist eine dokumentierte Funktion. Ein einzelner Durchlauf stellt keinen Funktionsnachweis oder eine Fehlerdiagnose dar.')};
    },{dst7040_80_belegt:true,beobachtet:'nur_fleck',gleicher_durchlauf:true},
    {tropfstopp_laut_datenblatt:true,beobachtungsort:null,status:'austrittsort_offen'}),

  tool('philips_perfectcare_ersatzteil_tank_auffangkappe_artikelcode',
    'In der deutschen PSG7140/70 Teileliste die Kennungen für Ersatztank und Auffangkappe dem tatsächlichen Angebotscode zuordnen — Verify the listed spare reservoir or collector cap reference.',
    {psg7140_70_belegt:yes('Ist die vollständige Kennung PSG7140/70 des Zielgeräts belegt?'),
      rolle:pick('Teil, das im eigenen Gerät fehlt.','wassertank','auffangkappe','andere_oder_offen'),
      angebotscode:pick('Kennung direkt am angebotenen Ersatzteil oder zugeordneter Verpackung.','cp2030_02','cp2029_05','abweichend','nicht_belegt')},
    ({psg7140_70_belegt,rolle,angebotscode})=>{
      const listed={wassertank:['cp2030_02','CP2030/02'],auffangkappe:['cp2029_05','CP2029/05']};
      const ref=psg7140_70_belegt?listed[rolle]:undefined;
      return {herstellerartikel:ref?.[1]??null,status:!ref?'modell_oder_teilrolle_klaeren':angebotscode==='nicht_belegt'?'angebotsartikel_klaeren':
        angebotscode===ref[0]?'artikelcode_stimmt_mit_liste_ueberein':'code_abweichend',
        ...withSource(station,'Herstellerliste des exakten Modells. Der Codeabgleich enthält keine Aussage zu Zustand, Vollständigkeit oder Verfügbarkeit.')};
    },{psg7140_70_belegt:true,rolle:'auffangkappe',angebotscode:'cp2030_02'},
    {herstellerartikel:'CP2029/05',status:'code_abweichend'}),

  tool('philips_perfectcare_bereitlicht_nachfuellanzeige_protokoll',
    'Für eine passende deutsche 7000er Anleitung die Bereitschaftsanzeige nach einem Tankhinweis durch beobachtete Reihenfolge einordnen — Distinguish readiness from a water alert using recorded display order.',
    {anleitung_am_geraet_bestaetigt:yes('Ist genau die verlinkte west-europäische Anleitung vom Hersteller oder anhand der Originalunterlagen dem eigenen Gerät zugeordnet?'),
      vorgang:pick('Verlauf in demselben beobachteten Vorgang.','start','nach_wasserhinweis','zeitfolge_offen'),
      bereitschaft:pick('Tatsächlich beobachtete Bereitschaftsanzeige für diesen Vorgang.','dauerhaft','blinkend','nicht_beobachtet')},
    ({anleitung_am_geraet_bestaetigt,vorgang,bereitschaft})=>{
      const keyed=anleitung_am_geraet_bestaetigt&&vorgang!=='zeitfolge_offen';
      return {dokumentstatus:!keyed?'anleitung_oder_vorgang_offen':bereitschaft==='dauerhaft'?'dokumentiertes_bereitschaftssignal_beobachtet':'dauerhafte_bereitschaft_nicht_belegt',
        vorgang:keyed?vorgang:null,
        ...withSource(stationManual,'Nur auf die bestätigte Anleitungsrevision anwendbar. Eine beobachtete Anzeige ersetzt weder Zustandsdiagnose noch Temperaturmessung.')};
    },{anleitung_am_geraet_bestaetigt:true,vorgang:'nach_wasserhinweis',bereitschaft:'blinkend'},
    {dokumentstatus:'dauerhafte_bereitschaft_nicht_belegt',vorgang:'nach_wasserhinweis'}),

  tool('philips_perfectcare_schlauchpfad_reichweite_reserve',
    'Bei der PSG7140/70 einen gemessenen Schlauchweg inklusive eigener Bewegungsreserve mit der dokumentierten Gesamtlänge abgleichen — Compare the workspace path and user reserve with the listed hose length.',
    {psg7140_70_belegt:yes('Ist PSG7140/70 exakt belegt?'),weg_belegt:yes('Ist der tatsächliche freie Weg getrennt von der geraden Entfernung gemessen?'),
      gemessener_weg_cm:num('Tatsächlich erforderliche Weglänge in cm, bereits mit bestätigten Umwegen.',0,500),
      eigene_bewegungsreserve_cm:num('Zusätzliche eigene Organisationsreserve in cm.',0,200)},
    ({psg7140_70_belegt,weg_belegt,gemessener_weg_cm,eigene_bewegungsreserve_cm})=>{
      const comparable=psg7140_70_belegt&&weg_belegt&&gemessener_weg_cm>0;
      const required=gemessener_weg_cm+eigene_bewegungsreserve_cm;
      return {nennlaenge_cm:psg7140_70_belegt?170:null,geplanter_weg_mit_reserve_cm:comparable?round(required):null,
        status:!comparable?'weg_und_modell_klaeren':required>170?'geplanter_weg_ueber_nennlaenge':'freie_nutzlaenge_separat_belegen',
        ...withSource(station,'Die Herstellerangabe beschreibt die Gesamtlänge des Schlauchs. Nutzlänge, Bewegungsfreiheit und der Betrieb am Platz bleiben separat zu prüfen.')};
    },{psg7140_70_belegt:true,weg_belegt:true,gemessener_weg_cm:149,eigene_bewegungsreserve_cm:25},
    {nennlaenge_cm:170,geplanter_weg_mit_reserve_cm:174,status:'geplanter_weg_ueber_nennlaenge'}),

  tool('philips_perfectcare_energiesparangabe_normal_max_bezug',
    'Den beworbenen Energievergleich der PSG7140/70 auf genau die dokumentierten Gerätemodi und den genannten Prüfbezug begrenzen — Match the maker’s energy comparison to the stated modes and test basis.',
    {psg7140_70_belegt:yes('Ist genau PSG7140/70 für diese Angabe bestätigt?'),
      gegenstand:pick('Worauf sich die zu bewertende Aussage bezieht.','normal_gegen_max_gleiches_geraet','gegen_anderes_geraet','stromkosten_zuhause','unbekannt'),
      pruefnorm_belegt:yes('Ist derselbe Hersteller-Prüfbezug IEC 60331-1 in der Aussage ausdrücklich angegeben?')},
    ({psg7140_70_belegt,gegenstand,pruefnorm_belegt})=>{
      const matched=psg7140_70_belegt&&gegenstand==='normal_gegen_max_gleiches_geraet'&&pruefnorm_belegt;
      return {oberer_herstellervergleich_prozent:matched?30:null,pruefbezug:matched?'IEC 60331-1':'eigener_vergleich_offen',
        ...withSource(station,'Die Herstellerfußnote nennt bis zu 30 Prozent im NORMAL-Modus gegenüber MAX. Ein Haushaltsvergleich braucht eigene vergleichbare Messungen.')};
    },{psg7140_70_belegt:true,gegenstand:'gegen_anderes_geraet',pruefnorm_belegt:true},
    {oberer_herstellervergleich_prozent:null,pruefbezug:'eigener_vergleich_offen'}),

  tool('philips_azur_lagerung_leer_beobachtung_schrittgrenze',
    'Für DST7040 den dokumentierten Lagerhinweis zum Wassertank mit dem eigenen nach Abkühlung erfassten Zustand abgleichen — Record whether the documented empty-tank storage item is actually observed.',
    {dst7040_belegt:yes('Ist DST7040 mit der vorliegenden Anleitung bestätigt?'),eigenes_exemplar:yes('Gehört die Beobachtung zum selben Gerät und erfolgte sie nach bestätigter Abkühlung?'),
      tankzustand:pick('Protokollierter Zustand nach dem Durchgang.','leer_beobachtet','restwasser_beobachtet','nur_ausgeschaltet','offen')},
    ({dst7040_belegt,eigenes_exemplar,tankzustand})=>{
      const observed=dst7040_belegt&&eigenes_exemplar&&['leer_beobachtet','restwasser_beobachtet'].includes(tankzustand);
      return {dokumentpunkt:dst7040_belegt?'verbleibendes_wasser_vor_aufbewahrung_entleeren':null,eigener_tankzustand:observed?tankzustand:null,
        status:!dst7040_belegt?'anleitung_offen':!observed?'tankstatus_separat_pruefen':tankzustand==='leer_beobachtet'?'tankzustand_protokolliert':'restwasser_protokolliert',
        ...withSource(azurManual,'Dieser Beleg erfasst nur den Wassertankzustand. Die Lagerhinweise des Herstellers gelten insgesamt.')};
    },{dst7040_belegt:true,eigenes_exemplar:true,tankzustand:'nur_ausgeschaltet'},
    {dokumentpunkt:'verbleibendes_wasser_vor_aufbewahrung_entleeren',eigener_tankzustand:null,status:'tankstatus_separat_pruefen'}),

  tool('philips_perfectcare_refill_zeitpunkt_anforderung_beleg',
    'Für die PSG7140/70 dokumentiertes Nachfüllen während des Gebrauchs von der behaupteten ununterbrochenen Dampfleistung unterscheiden — Separate the refill capability from a continuous-flow assumption.',
    {psg7140_70_belegt:yes('Ist exakt PSG7140/70 am betrachteten Gerät bestätigt?'),
      anforderung:pick('Eigene zwingende Anforderung.','waehrend_gebrauch_auffuellbar','dampf_ohne_pause_beim_nachfuellen','ohne_nachfuellen','offen'),
      nachfuellvorgang_selbst_erfasst:yes('Wurde die tatsächliche Unterbrechung am Exemplar bereits selbst dokumentiert?')},
    ({psg7140_70_belegt,anforderung,nachfuellvorgang_selbst_erfasst})=>{
      const status=!psg7140_70_belegt?'modell_klaeren':anforderung==='waehrend_gebrauch_auffuellbar'?'auffuellbarkeit_dokumentiert':
        anforderung==='dampf_ohne_pause_beim_nachfuellen'?(nachfuellvorgang_selbst_erfasst?'eigene_unterbrechung_separat_auswerten':'unterbrechung_am_exemplar_offen'):
          anforderung==='ohne_nachfuellen'?'eigener_durchlauf_zu_pruefen':'anforderung_klaeren';
      return {wiederbefuellbarkeit_laut_hersteller:psg7140_70_belegt?true:null,status,
        ...withSource(station,'Die Produktmerkmale benennen Nachfüllbarkeit. Eine garantierte Dampfabgabe beim Nachfüllen oder feste Reichweite folgt daraus nicht.')};
    },{psg7140_70_belegt:true,anforderung:'dampf_ohne_pause_beim_nachfuellen',nachfuellvorgang_selbst_erfasst:false},
    {wiederbefuellbarkeit_laut_hersteller:true,status:'unterbrechung_am_exemplar_offen'}),
];
