const page = '/guide/waesche-trocknen-wohnung.html';
const bosch = 'https://media3.bosch-home.com/Documents/9001735129_F.pdf';
const miele = 'https://media.miele.com/downloads/10/4b/01_C7F13838F4DC1EEF92E2ED555227104B.pdf';
const hardness = 'https://www.gesetze-im-internet.de/wrmg/__9.html';
const uba = 'https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/haushalt-wohnen/waesche-waschen-waschmittel';
const checked = '2026-11-20';
const boschModel = 'Bosch WGB244A40 · DE · 9001735129_F';
const mieleModel = 'Miele WWR 880 WPS · DE · 11 767 692';

const choice = (description,...values) => ({type:'string',description,enum:values});
const flag = description => ({type:'boolean',description});
const number = (description,minimum,maximum) => ({type:'number',description,minimum,maximum});
const ml = description => number(description,0,1000);
const kg = description => number(description,0,30);
const sure = 'passend_bestaetigt';
const deviceScope = (description) => choice(description,sure,'abweichend','offen');
const boschScope = deviceScope('Stehen WGB244A40 und der E-Nr.-Index am eigenen Gerät und ist dafür die deutsche Anleitung 9001735129_F bestätigt?');
const mieleScope = deviceScope('Sind WWR 880 WPS und die am eigenen Gerät einschlägige deutsche Anleitung M.-Nr. 11 767 692 bestätigt?');
const combinedScope = flag('Sind Modell, Ausführung und die genau angegebene deutsche Anleitung dem eigenen Gerät zugeordnet, bei Bosch einschließlich E-Nr.-Index?');
const boschOption = 'bosch_wgb244a40_9001735129_f';
const mieleOption = 'miele_wwr880_wps_11767692';
const bothModels = choice('Tatsächliches Gerät und genau zugeordnete deutsche Anleitung.',boschOption,mieleOption,'andere_oder_offen');
const programState = (description) => choice(description,'aktiv','aus','offen');
const readState = (description) => choice(description,'bestaetigt','abweichend','offen');

function tool(name,description,properties,calculate,args,expect,refs){
  return {
    name,description,page,properties,
    calculate(input){
      return {...calculate(input),primaerquellen:refs,quellen_geprueft_am:checked};
    },
    example:{args,expect},
  };
}

function scoped(name,description,scope,model,manual,pages,properties,calculate,args,expect,extra=[]){
  return tool(name,description,{modellbeleg:scope,...properties},input=>{
    const result=input.modellbeleg===sure?calculate(input):{
      status:'geraet_und_deutsche_handbuchausgabe_abgleichen',
      modellbeleg:input.modellbeleg,
    };
    return {...result,geltungsbereich:model,handbuchseite:pages};
  },{modellbeleg:sure,...args},expect,[manual,...extra]);
}

const boschTool = (name,description,pages,properties,calculate,args,expect,extra) =>
  scoped(name,description,boschScope,boschModel,bosch,pages,properties,calculate,args,expect,extra);
const mieleTool = (name,description,pages,properties,calculate,args,expect,extra) =>
  scoped(name,description,mieleScope,mieleModel,miele,pages,properties,calculate,args,expect,extra);
const manualByModel = {[boschOption]:boschModel,[mieleOption]:mieleModel};

function combined(name,description,pages,properties,calculate,args,expect){
  return tool(name,description,{geraet:bothModels,modell_und_ausgabe_bestaetigt:combinedScope,...properties},input=>{
    if(!input.modell_und_ausgabe_bestaetigt||!Object.hasOwn(manualByModel,input.geraet)){
      return {status:'geraet_und_deutsche_handbuchausgabe_abgleichen'};
    }
    return {...calculate(input),geltungsbereich:manualByModel[input.geraet],handbuchseite:pages[input.geraet]};
  },{modell_und_ausgabe_bestaetigt:true,...args},expect,[bosch,miele]);
}

const ultraPhasePresets = {weich:[46,36],mittel:[58,45],hart:[70,54]};
const mieleDetergents = {
  express_20:['colorwaschmittel_fluessig'],
  jeans:['colorwaschmittel_fluessig','spezialwaschmittel'],
  wolle_handwaeschesymbol:['fein_oder_wollwaschmittel','spezialwaschmittel'],
  seide_handwaeschesymbol:['fein_oder_wollwaschmittel','spezialwaschmittel'],
  outdoor:['fein_oder_wollwaschmittel','spezialwaschmittel'],
  gardinen:['universalwaschmittel_pulver','spezialwaschmittel'],
};
const prewashMinutes = {normal:25,plus_6:31,plus_9:34,plus_12:37};

export const waschdosierungBelege = [
  tool('waschmittel_dosiertabelle_wasserhaerte_intervall',
    'Waschmittel-Dosierspalten bei schwankender Wasserhärte am Anschluss bestimmen — Identify every hardness column supported by a recorded local interval.',
    {anschlussbezug:readState('Sind Quelle, Zeitpunkt und der Waschmaschinenanschluss eindeutig zugeordnet?'),
      einheit:choice('Einheit und Grundlage der Gesamthärte. Keine Zahl aus ppm oder Carbonathärte übernehmen.',
        'mmol_calciumcarbonat_je_liter','andere_oder_offen'),
      minimum:number('Untere belegte Gesamthärte in mmol CaCO₃/L. Bei unbekannter Einheit Wert nicht auswertbar.',0,50),
      maximum:number('Obere belegte Gesamthärte in derselben Einheit und am selben Anschluss.',0,50),
      packung:choice('Lesbarkeit der Härtespalten am aktuellen Mittel.','alle_drei_lesbar','teilweise_oder_offen')},
    ({anschlussbezug,einheit,minimum,maximum,packung})=>{
      if(anschlussbezug!=='bestaetigt'||einheit!=='mmol_calciumcarbonat_je_liter'){
        return {status:'anschluss_und_einheit_belegen',moegliche_spalten:[]};
      }
      if(minimum>maximum) throw new RangeError('Obergrenze kleiner als Untergrenze');
      const columns=[];
      if(minimum<1.5) columns.push('weich');
      if(maximum>=1.5&&minimum<=2.5) columns.push('mittel');
      if(maximum>2.5) columns.push('hart');
      return {status:columns.length>1?'mehrere_spalten_kommen_in_frage':packung==='alle_drei_lesbar'?'eine_spalte_eindeutig':'passende_packungsspalte_pruefen',
        moegliche_spalten:columns,packungsspalten_komplett:packung==='alle_drei_lesbar',
        grenze:'Klassifiziert die belegte Spanne. Die ml-Angabe ergibt sich zusätzlich aus der aktuellen Packung, der Beladung und dem Verschmutzungsgrad.'};
    },
    {anschlussbezug:'bestaetigt',einheit:'mmol_calciumcarbonat_je_liter',minimum:2.4,maximum:2.6,packung:'alle_drei_lesbar'},
    {status:'mehrere_spalten_kommen_in_frage',moegliche_spalten:['mittel','hart']},[hardness,uba]),

  tool('waschmittel_packung_alter_dosierplan_abgleich',
    'Gleiche Härte, Wäschemenge und Verschmutzung an aktueller Packung und altem Dosierplan vergleichen — Reconcile a saved detergent dose with the package currently in use.',
    {aktuelle_packung:readState('Ist die Dosierangabe genau der jetzt verwendeten Packung lesbar?'),
      gleicher_tabellenbezug:flag('Beziehen sich beide Werte auf dieselbe Wasserhärte, denselben Verschmutzungsgrad und dieselbe Wäschemenge?'),
      packung_ml:ml('Dafür auf der aktuellen Packung abgelesene ml. Bei fehlendem Beleg 0.'),
      alter_plan_ml:ml('Dafür gespeicherte ml im alten Dosierplan. Bei fehlendem Beleg 0.')},
    ({aktuelle_packung,gleicher_tabellenbezug,packung_ml,alter_plan_ml})=>{
      if(aktuelle_packung!=='bestaetigt'||packung_ml===0) return {status:'aktuelle_packungsangabe_suchen',vergleich_ml:null};
      if(!gleicher_tabellenbezug||alter_plan_ml===0) return {status:'alten_planbezug_klaeren',vergleich_ml:null};
      const delta = Number((packung_ml-alter_plan_ml).toPrecision(12));
      return {status:delta===0?'packung_und_plan_stimmen_ueberein':'alten_plan_mit_packung_abgleichen',
        aktuelle_packung_ml:packung_ml,vergleich_ml:delta,
        grenze:'Die Differenz bezieht sich nur auf die zwei belegten Tabellenwerte. Sie ist keine Aussage zur Konzentration oder Waschleistung.'};
    },
    {aktuelle_packung:'bestaetigt',gleicher_tabellenbezug:true,packung_ml:48,alter_plan_ml:38},
    {status:'alten_plan_mit_packung_abgleichen',aktuelle_packung_ml:48,vergleich_ml:10},[uba]),

  boschTool('bosch_wgb244a40_idos_45kg_basis_oder_istmenge',
    'Bosch WGB244A40 i-DOS Basisdosierung für 4,5 kg normal verschmutzte Wäsche mit Packung abgleichen — Distinguish the Bosch base setting from an actual cycle dose.',
    '21, 35 · § 15.4',
    {packungswert_bezug:readState('Stammt der Vergleichswert aus der aktuellen Verpackung für 4,5 kg normal verschmutzte Wäsche und die örtliche Wasserhärte?'),
      basis_anzeige_ml:ml('Eindeutig als Basisdosiermenge des benutzten Behälters abgelesener Displaywert. 0, wenn nicht erfasst.'),
      vergleich_packung_ml:ml('Dosierempfehlung der Packung für genau den beschriebenen Bezug. 0 bei unbekannt.'),
      aktuelle_ladung_kg:kg('Separat festgehaltene trockene Beladung für den aktuellen Lauf. 0 bei unbekannt.')},
    ({packungswert_bezug,basis_anzeige_ml,vergleich_packung_ml,aktuelle_ladung_kg})=>{
      const compare=packungswert_bezug==='bestaetigt'&&basis_anzeige_ml>0&&vergleich_packung_ml>0;
      const same=compare?basis_anzeige_ml===vergleich_packung_ml:null;
      return {status:same===null?'basis_und_packungsbezug_pruefen':same?'basis_stimmt_mit_packungswert_ueberein':'basis_und_packung_weichen_ab',
        referenzladung_kg:4.5,aktuelle_ladung_kg:aktuelle_ladung_kg||null,basis_vergleich:same,ist_dosis_ml:null,
        grenze:'Die Basis ist ein Einstellwert für 4,5 kg normal verschmutzte Wäsche. Die tatsächliche Abgabe einzelner Waschgänge geht aus dem Vergleich nicht hervor.'};
    },
    {packungswert_bezug:'bestaetigt',basis_anzeige_ml:50,vergleich_packung_ml:50,aktuelle_ladung_kg:2.3},
    {status:'basis_stimmt_mit_packungswert_ueberein',referenzladung_kg:4.5,ist_dosis_ml:null},[uba]),

  boschTool('bosch_wgb244a40_idos_pulver_manuell_kollision',
    'Beim Bosch WGB244A40 aktives i-DOS und zusätzlich geplantes manuelles Waschpulver für dieselbe Hauptwäsche erkennen — Detect duplicate main-detergent paths before starting.',
    '33–34 · § 15.1–15.2',
    {i_dos_fluessig:programState('Ist die automatische Flüssigwaschmitteldosierung für diesen Lauf laut Anzeige an, aus oder offen?'),
      manuelles_mittel:choice('Manuelles Vorhaben für diesen Lauf.','pulver_hauptwaesche','kein_zweites_hauptwaschmittel','anderes_oder_offen')},
    ({i_dos_fluessig,manuelles_mittel})=>{
      if(i_dos_fluessig==='offen'||manuelles_mittel==='anderes_oder_offen') return {status:'beide_dosierwege_vor_start_ablesen'};
      const conflict=i_dos_fluessig==='aktiv'&&manuelles_mittel==='pulver_hauptwaesche';
      return {status:conflict?'zwei_hauptwaschmittelpfade_geplant':'kein_doppelpfad_aus_beiden_angaben',
        doppelter_hauptwaschmittelpfad:conflict,
        grenze:'Die Prüfung betrifft automatisches und manuelles Hauptwaschmittel. Separat dokumentierte Pflegemittel sind eine andere Frage.'};
    },
    {i_dos_fluessig:'aktiv',manuelles_mittel:'pulver_hauptwaesche'},
    {status:'zwei_hauptwaschmittelpfade_geplant',doppelter_hauptwaschmittelpfad:true}),

  boschTool('bosch_wgb244a40_idos_behaelter2_rolle_ruecksetzung',
    'Nach Umstellung von Bosch i-DOS Behälter 2 zwischen Weichspüler und Flüssigwaschmittel die zurückgesetzte Basis prüfen — Verify the base setting after changing the tank role.',
    '35 · § 15.3–15.4',
    {bisher:choice('Bisher eindeutig belegte Rolle von Behälter 2.','weichspueler','fluessigwaschmittel','offen'),
      jetzt:choice('Nachweisbar neu eingestellte Rolle von Behälter 2.','weichspueler','fluessigwaschmittel','offen'),
      neue_basis_belegt:flag('Wurde nach dem Wechsel eine passende neue Basis für Produkt und örtliche Härte dokumentiert?')},
    ({bisher,jetzt,neue_basis_belegt})=>{
      if(bisher==='offen'||jetzt==='offen') return {status:'bisherige_und_neue_behaelterrolle_pruefen'};
      if(bisher===jetzt) return {status:'keine_rollenaenderung_aus_diesen_angaben',ruecksetzung_durch_rollenwechsel:false};
      return {status:neue_basis_belegt?'rollenwechsel_mit_neuer_basis_dokumentiert':'neue_basis_nach_ruecksetzung_pruefen',
        ruecksetzung_durch_rollenwechsel:true,neue_rolle:jetzt};
    },
    {bisher:'weichspueler',jetzt:'fluessigwaschmittel',neue_basis_belegt:false},
    {status:'neue_basis_nach_ruecksetzung_pruefen',ruecksetzung_durch_rollenwechsel:true}),

  boschTool('bosch_wgb244a40_idos_zwei_fluessigmittel_tankwahl',
    'Bei zwei i-DOS-Behältern mit Flüssigwaschmittel den für diesen Bosch-Lauf ausgewählten Tank identifizieren — Determine which of two configured detergent tanks is selected.',
    '35 · § 15.3',
    {beide_tanks_fluessig:readState('Ist die Gerätekonfiguration beider Behälter als Flüssigwaschmittel bestätigt?'),
      auswahl:choice('Für den aktuellen Lauf eindeutig angezeigter Behälter.','behaelter_1','behaelter_2','offen')},
    ({beide_tanks_fluessig,auswahl})=>{
      if(beide_tanks_fluessig!=='bestaetigt') return {status:'konfiguration_beider_tanks_abgleichen',ausgewaehlter_behaelter:null};
      return {status:auswahl==='offen'?'gewaehlten_behaelter_fuer_diesen_lauf_ablesen':'behaelterwahl_des_laufs_belegt',
        ausgewaehlter_behaelter:auswahl==='offen'?null:auswahl,ist_abgabe_ml:null,
        grenze:'Die Wahl bezieht sich auf diesen Lauf. Tankinhalt und tatsächliche Abgabe sind getrennt zu prüfen.'};
    },
    {beide_tanks_fluessig:'bestaetigt',auswahl:'behaelter_2'},
    {status:'behaelterwahl_des_laufs_belegt',ausgewaehlter_behaelter:'behaelter_2',ist_abgabe_ml:null}),

  combined('waschmaschine_vorwaesche_bosch_miele_dosierweg',
    'Vorwäsche und Dosierweg bei Bosch WGB244A40 oder Miele WWR 880 WPS zusammen lesen — Check the documented main detergent route when prewash is selected.',
    {[boschOption]:'24 · Tasten und Vorwäsche',[mieleOption]:'32–33 · Waschmittel-Einspülkasten'},
    {vorwaesche:programState('Ist Vorwäsche im konkreten Programm aktiviert?'),
      dosierweg:choice('Für die Hauptwäsche beabsichtigter und beobachteter Dosierweg.',
        'automatik_aktiv_und_unterstuetzt','manuell_fluessig_hauptwaesche','manuell_andere_hauptwaesche','offen')},
    ({geraet,vorwaesche,dosierweg})=>{
      if(vorwaesche==='offen'||dosierweg==='offen') return {status:'vorwaesche_und_dosierweg_ablesen'};
      if(vorwaesche==='aus') return {status:'vorwaesche_nicht_aktiv',vorwaesche_zuordnung:null};
      if(geraet===boschOption){
        if(dosierweg==='automatik_aktiv_und_unterstuetzt'){
          return {status:'bosch_automatik_fuer_beide_phasen_beschrieben',vorwaesche_zuordnung:'automatik',hauptwaesche_zuordnung:'automatik'};
        }
        return {status:'getrennte_bosch_wege_fuer_manuelle_dosierung',vorwaesche_zuordnung:'trommel',hauptwaesche_zuordnung:'manuelles_fach',
          grenze:'Diese Stellenbeschreibung allein belegt keine Freigabe einer bestimmten manuellen Flüssigwaschmittel-Variante.'};
      }
      if(dosierweg==='manuell_fluessig_hauptwaesche'){
        return {status:'miele_manuelles_fluessigmittel_hauptwaesche_bei_vorwaesche_ausgeschlossen'};
      }
      return {status:dosierweg==='automatik_aktiv_und_unterstuetzt'?'miele_verweist_auf_twindos_bei_vorwaesche':'miele_faecher_und_mittel_separat_pruefen'};
    },
    {geraet:mieleOption,vorwaesche:'aktiv',dosierweg:'manuell_fluessig_hauptwaesche'},
    {status:'miele_manuelles_fluessigmittel_hauptwaesche_bei_vorwaesche_ausgeschlossen'}),

  boschTool('bosch_wgb244a40_idos_schalter_bleibt_gespeichert',
    'Gespeicherten i-DOS-Schalter am Bosch WGB244A40 bei gemeinsam genutzter Maschine von der zuletzt gewählten Temperatur unterscheiden — Identify which prior operator changes persist.',
    '31 · § 13.3',
    {i_dos_letzte_aenderung:choice('Zuletzt am Gerät von einer beteiligten Person beobachteter Wechsel.','aktiviert','deaktiviert','kein_wechsel_erfasst'),
      programmtemperatur_geaendert:flag('Wurde zugleich die Programmeinstellung für die Temperatur geändert?')},
    ({i_dos_letzte_aenderung,programmtemperatur_geaendert})=>({
      status:i_dos_letzte_aenderung==='kein_wechsel_erfasst'?'aktuellen_idos_status_ablesen':'beobachteter_idos_wechsel_wird_gespeichert',
      gespeicherter_schalter_aus_letzter_beobachtung:i_dos_letzte_aenderung==='kein_wechsel_erfasst'?null:i_dos_letzte_aenderung,
      gewaehlte_temperatur_dauerhaft_gespeichert:programmtemperatur_geaendert?false:null,
      grenze:'Der zuletzt beobachtete Wechsel ist keine Live-Anzeige. Bei nächster Nutzung aktuellen Schalter und Programm am Gerät ablesen.',
    }),
    {i_dos_letzte_aenderung:'deaktiviert',programmtemperatur_geaendert:true},
    {status:'beobachteter_idos_wechsel_wird_gespeichert',gespeicherter_schalter_aus_letzter_beobachtung:'deaktiviert',gewaehlte_temperatur_dauerhaft_gespeichert:false}),

  boschTool('bosch_wgb244a40_sportswear_weichspueler_auswahl',
    'Beim Bosch WGB244A40 im bestätigten Sportswear-Programm die geplante Weichspülerzugabe und die dokumentierte Beladungsgrenze prüfen — Check the exact sport-cycle constraints without inferring dose from a full tank.',
    '27 · Programmtabelle Sportswear',
    {sportswear_ausgewaehlt:readState('Ist ausdrücklich das Programm Sportswear für diesen Lauf gewählt?'),
      weichspueler:choice('Tatsächliche geplante Zugabe in diesem Lauf.','zugabe_belegt','zugabe_ausgeschlossen','nur_tank_gefuellt_oder_offen'),
      trockengewicht_kg:kg('Gewicht der trockenen Ladung. Bei unbekannt 0.')},
    ({sportswear_ausgewaehlt,weichspueler,trockengewicht_kg})=>{
      if(sportswear_ausgewaehlt!=='bestaetigt') return {status:'sportswear_auswahl_am_geraet_pruefen'};
      const weight=trockengewicht_kg>0?trockengewicht_kg<=2:null;
      return {status:weichspueler==='zugabe_belegt'?'geplante_weichspuelerzugabe_widerspricht_sportswear':
        weichspueler==='nur_tank_gefuellt_oder_offen'?'zugabe_fuer_diesen_lauf_unklar':'weichspueler_ausgeschlossen',
        nennbeladung_kg:2,gewicht_im_rahmen:weight,
        grenze:'Das Bosch-Handbuch nennt für Sportswear ein Waschmittel für Sporttextilien und keinen Weichspüler. Die Pflegefreigabe am Stück separat lesen.'};
    },
    {sportswear_ausgewaehlt:'bestaetigt',weichspueler:'zugabe_belegt',trockengewicht_kg:1.4},
    {status:'geplante_weichspuelerzugabe_widerspricht_sportswear',gewicht_im_rahmen:true}),

  mieleTool('miele_wwr880_cap_oder_pod_richtiger_eingabeweg',
    'Bei Miele WWR 880 WPS Waschmittel-Pods von ausgewiesenen Miele Caps für CapDosing unterscheiden — Identify the documented input path for a laundry pod or a Miele cap.',
    '33–34 · Waschmittel und Cap-Dosierung',
    {einheit:choice('Physisch abgelesene Kennzeichnung auf der Packung.','normaler_tab_oder_pod','miele_cap','unbekannt'),
      geplant:choice('Wo soll die identifizierte Einheit laut bisherigem Plan ankommen?','trommel','cap_aufnahme','normales_einspuelfach','offen')},
    ({einheit,geplant})=>{
      const routes={normaler_tab_oder_pod:'trommel',miele_cap:'cap_aufnahme',unbekannt:null};
      const route=routes[einheit];
      if(route===null||geplant==='offen') return {status:'produktkennzeichnung_und_eingabeweg_pruefen',handbuchweg:route};
      return {status:geplant===route?'eingabeweg_entspricht_handbuch':'eingabeweg_weicht_vom_handbuch_ab',handbuchweg:route,
        capdosing_auswahl_zusaetzlich_zu_pruefen:einheit==='miele_cap'};
    },
    {einheit:'normaler_tab_oder_pod',geplant:'cap_aufnahme'},
    {status:'eingabeweg_weicht_vom_handbuch_ab',handbuchweg:'trommel',capdosing_auswahl_zusaetzlich_zu_pruefen:false}),

  mieleTool('miele_wwr880_caps_anzahl_und_vorwaeschefunktion',
    'CapDosing der Miele WWR 880 WPS auf eine Cap je Lauf und die Funktion der ausgewählten Cap prüfen — Check that cap count and purpose fit one wash programme.',
    '33 · Cap-Dosierung',
    {geplante_caps:number('Geplante Caps in diesem einen Lauf, ganze Stückzahl.',0,20),
      cap_funktion:choice('Eindeutig abgelesene Funktion der einzelnen geplanten Cap.','waschmittel','additiv','textilpflegemittel','offen'),
      waschmittel_cap_fuer_vorwaesche:flag('Soll diese Waschmittel-Cap laut Plan die Vorwäsche abdecken?')},
    ({geplante_caps,cap_funktion,waschmittel_cap_fuer_vorwaesche})=>{
      if(!Number.isInteger(geplante_caps)) throw new RangeError('Caps als ganze Anzahl eingeben');
      if(geplante_caps>1) return {status:'mehr_als_eine_cap_fuer_diesen_lauf',belegte_maximale_cap_anzahl:1};
      if(geplante_caps===0) return {status:'keine_cap_geplant',belegte_maximale_cap_anzahl:1};
      if(cap_funktion==='offen') return {status:'cap_funktion_auf_der_packung_lesen',belegte_maximale_cap_anzahl:1};
      return {status:waschmittel_cap_fuer_vorwaesche?'geplanter_vorwaesche_ersatz_nicht_belegt':'eine_cap_funktion_zugeordnet',
        belegte_maximale_cap_anzahl:1,belegte_funktion:cap_funktion==='waschmittel'?'nur_hauptwaesche':cap_funktion};
    },
    {geplante_caps:1,cap_funktion:'waschmittel',waschmittel_cap_fuer_vorwaesche:true},
    {status:'geplanter_vorwaesche_ersatz_nicht_belegt',belegte_maximale_cap_anzahl:1,belegte_funktion:'nur_hauptwaesche'}),

  mieleTool('miele_wwr880_twindos_ultraphase_gegenfach_reset',
    'Nach Wechsel vom UltraPhase-Paar auf Colorwaschmittel oder ein anderes Mittel die Gegenseite im TwinDos-Menü prüfen — Review the opposite compartment after replacing the matched product pair.',
    '96 · Einstellungen, Programmablauf, TwinDos',
    {paar_vorher:readState('War vor der beobachteten Änderung UltraPhase 1 und 2 als Paar eingerichtet?'),
      aenderung:choice('Tatsächlich beobachtete Änderung im TwinDos-Menü.',
        'anderes_mittel_ausgewaehlt','kein_mittel_fuer_dieses_fach','andere_auswahl_oder_offen')},
    ({paar_vorher,aenderung})=>{
      if(aenderung==='kein_mittel_fuer_dieses_fach') return {status:'ausgewaehltes_fach_ausser_betrieb',gegenfach_neu_pruefen:null};
      if(aenderung!=='anderes_mittel_ausgewaehlt'||paar_vorher!=='bestaetigt') return {status:'vorheriges_paar_und_neue_auswahl_ablesen',gegenfach_neu_pruefen:null};
      return {status:'gegenfach_einstellung_geloescht',gegenfach_neu_pruefen:true,passende_nachfuellkartusche_erforderlich:true,
        grenze:'Die Angabe betrifft die Konfiguration im Gerät. Sie belegt nicht, welche Mittel physisch in den zwei Fächern stehen.'};
    },
    {paar_vorher:'bestaetigt',aenderung:'anderes_mittel_ausgewaehlt'},
    {status:'gegenfach_einstellung_geloescht',gegenfach_neu_pruefen:true,passende_nachfuellkartusche_erforderlich:true}),

  mieleTool('miele_wwr880_twindos_verschmutzung_und_spuelmenge',
    'Leicht, normal oder stark bei Miele TwinDos als gemeinsame Vorgabe für Dosierung und Spülwassermenge lesen — Identify the two process inputs affected by the selectable soil level.',
    '31–32, 96 · TwinDos und Einstellungen',
    {auswahl_im_programm:choice('Ist das Feld Verschmutzungsgrad bei diesem Programm tatsächlich wählbar?','ja','nein','offen'),
      beobachtete_stufe:choice('Am Gerät lesbar gewählte Stufe.','leicht','normal','stark','offen')},
    ({auswahl_im_programm,beobachtete_stufe})=>{
      if(auswahl_im_programm==='nein') return {status:'verschmutzung_in_diesem_programm_nicht_waehlbar',menue_werte_ausgewertet:false};
      if(auswahl_im_programm==='offen'||beobachtete_stufe==='offen') return {status:'programm_und_auswahl_der_stufe_belegen',menue_werte_ausgewertet:false};
      return {status:'stufe_beeinflusst_zwei_prozessgroessen',menue_werte_ausgewertet:true,
        gewaehlte_stufe:beobachtete_stufe,beeinflusst:['twindos_dosierung','spuelwassermenge'],
        ist_waschmittel_ml:null,ist_spuelwasser_l:null};
    },
    {auswahl_im_programm:'ja',beobachtete_stufe:'stark'},
    {status:'stufe_beeinflusst_zwei_prozessgroessen',beeinflusst:['twindos_dosierung','spuelwassermenge'],ist_spuelwasser_l:null}),

  mieleTool('miele_wwr880_twindos_neue_kartusche_anzeige_zaehler',
    'Bei neu eingesetzter TwinDos-Kartusche und weiterhin leerer Anzeige am WWR 880 WPS den Zählerrücksetzbeleg einordnen — Separate the counter reset from the physical cartridge volume.',
    '62, 71 · TwinDos-Kartusche tauschen und Meldungen',
    {neue_kartusche_belegt:readState('Ist der Wechsel auf eine neue, passende Kartusche im betroffenen Fach sicher beobachtet?'),
      beim_wechsel:choice('Tatsächlich bekannter Gerätezustand beim Einsetzen.','eingeschaltet','ausgeschaltet','offen'),
      display_bestaetigung:choice('Wurden zugehörige Displaymeldungen des Wechsels bestätigt?','ja','nein','offen')},
    ({neue_kartusche_belegt,beim_wechsel,display_bestaetigung})=>{
      if(neue_kartusche_belegt!=='bestaetigt'||beim_wechsel==='offen') return {status:'kartuschenwechsel_und_geraetezustand_klaeren',zaehlerruecksetzung_belegt:false};
      if(beim_wechsel==='ausgeschaltet') return {status:'neue_kartusche_leeranzeige_zaehler_unbestaetigt',zaehlerruecksetzung_belegt:false};
      if(display_bestaetigung!=='ja') return {status:'wechselmeldung_und_zaehlerruecksetzung_pruefen',zaehlerruecksetzung_belegt:false};
      return {status:'handbuchablauf_fuer_zaehlerruecksetzung_belegt',zaehlerruecksetzung_belegt:true,restvolumen_ml:null};
    },
    {neue_kartusche_belegt:'bestaetigt',beim_wechsel:'ausgeschaltet',display_bestaetigung:'nein'},
    {status:'neue_kartusche_leeranzeige_zaehler_unbestaetigt',zaehlerruecksetzung_belegt:false}),

  combined('waschmaschine_idos_twindos_nachfuellanzeige_lesen',
    'Blinkendes Bosch i-DOS oder „wenige Waschgänge“ und „TwinDos leer“ bei Miele als unterschiedliche Nachfüllsignale lesen — Separate status signals from exact remaining volume and wash outcome.',
    {[boschOption]:'21 · Display',[mieleOption]:'70 · TwinDos-Meldungen'},
    {meldung:choice('Genau abgelesener Gerätestatus.',
      'bosch_idos_leuchtet','bosch_idos_blinkt','miele_nur_wenige_waschgaenge','miele_twindos_leer_ergebnis_kontrollieren','offen')},
    ({geraet,meldung})=>{
      const boschStatus={bosch_idos_leuchtet:'automatik_aktiv',bosch_idos_blinkt:'mindestfuellstand_unterschritten'};
      const mieleStatus={miele_nur_wenige_waschgaenge:'kartusche_bald_aufgebraucht',miele_twindos_leer_ergebnis_kontrollieren:'abgabe_fuer_betroffenen_lauf_moeglicherweise_zu_gering'};
      const status=(geraet===boschOption?boschStatus:mieleStatus)[meldung];
      return {status:status??'meldung_am_richtigen_geraet_abgleichen',restvolumen_ml:null,
        ungefaehre_handbuchspanne_waschgaenge:status==='kartusche_bald_aufgebraucht'?[4,8]:null,
        grenze:'Die Miele-Spanne ist eine ungefähre Handbuchangabe. Keines dieser Signale misst ml oder bestätigt das Waschergebnis.'};
    },
    {geraet:mieleOption,meldung:'miele_twindos_leer_ergebnis_kontrollieren'},
    {status:'abgabe_fuer_betroffenen_lauf_moeglicherweise_zu_gering',restvolumen_ml:null,ungefaehre_handbuchspanne_waschgaenge:null}),

  mieleTool('miele_wwr880_hauptwasch_cap_twindos_anzeige',
    'Bei gewählter Hauptwasch-Cap der Miele WWR 880 WPS die weiterhin sichtbare TwinDos-Anzeige erklären — Check the documented display exception when a main-wash cap disables TwinDos dosing.',
    '34 · Cap einlegen',
    {cap_auswahl:choice('In den Programmeinstellungen tatsächlich gewählte Cap-Funktion.',
      'hauptwaschmittel_cap','pflege_oder_additiv_cap','keine','offen'),
      twin_dos_anzeige:programState('Ist die TwinDos-Anzeige im Display sichtbar aktiv, aus oder nicht ablesbar?')},
    ({cap_auswahl,twin_dos_anzeige})=>{
      if(cap_auswahl!=='hauptwaschmittel_cap') return {status:'hauptwasch_cap_ausnahme_nicht_belegt',twindos_abgabe_laut_cap_regel:null};
      return {status:twin_dos_anzeige==='aktiv'?'sichtbare_anzeige_bleibt_trotz_abschaltung':'hauptwasch_cap_schaltet_twindos_dosierung_aus',
        twindos_abgabe_laut_cap_regel:false,
        grenze:'Das Handbuch beschreibt die Programmlogik bei tatsächlich gewählter Hauptwasch-Cap. Es liefert keine Messung einer einzelnen Dosierung.'};
    },
    {cap_auswahl:'hauptwaschmittel_cap',twin_dos_anzeige:'aktiv'},
    {status:'sichtbare_anzeige_bleibt_trotz_abschaltung',twindos_abgabe_laut_cap_regel:false}),

  boschTool('bosch_wgb244a40_idos_nachfuellen_gleiches_mittel',
    'Beim Bosch i-DOS Nachfüllen desselben Mittels von Wechsel auf ein anderes Produkt unterscheiden — Identify when a product change needs the documented detergent drawer preparation.',
    '30, 34 · Waschmittel und § 15.1',
    {produktabgleich:choice('Beziehung zwischen Restinhalt und geplantem Nachfüllmittel.',
      'identisches_konkretes_produkt','anderes_produkt','restinhalt_offen'),
      mittelzustand:choice('Für den Behälter bestätigter Produktzustand, soweit bekannt.',
        'geeignet_und_selbstfliessend','stark_verdickt_oder_ungeeignet','offen')},
    ({produktabgleich,mittelzustand})=>{
      if(mittelzustand==='stark_verdickt_oder_ungeeignet') return {status:'geplantes_mittel_laut_handbuch_ungeeignet'};
      if(mittelzustand==='offen'||produktabgleich==='restinhalt_offen') return {status:'restinhalt_und_eignung_des_mittels_klaeren'};
      return {status:produktabgleich==='anderes_produkt'?'produktwechsel_mit_vorheriger_schubladenvorbereitung':'gleiches_produkt_fuer_nachfuellen_belegt',
        produktwechsel:produktabgleich==='anderes_produkt',
        grenze:'Beim Wechsel nennt die Anleitung vorherige Reinigung der Waschmittelschublade. Dieses Ergebnis bewertet nur die beobachtete Produktgleichheit und Eignung.'};
    },
    {produktabgleich:'anderes_produkt',mittelzustand:'geeignet_und_selbstfliessend'},
    {status:'produktwechsel_mit_vorheriger_schubladenvorbereitung',produktwechsel:true}),

  mieleTool('miele_wwr880_singlewash_halbladung_dosiergrenze',
    'Miele WWR 880 WPS SingleWash unter 1 kg und die Empfehlung zur Hälfte des Halbladungswerts prüfen — Compute the documented small-load reference from the package half-load dose.',
    '46, 48 · SingleWash und verfügbare Extras',
    {singlewash:programState('Ist SingleWash im konkreten Programm tatsächlich aktiviert?'),
      trocken_kg:kg('Trockene Beladung in kg. 0, falls noch nicht gewogen.'),
      fluessig:flag('Ist das laut eigener Packung geeignete Mittel flüssig?'),
      halbladung_ml:ml('Packungswert für eine halbe Ladung und die passenden Dosierbedingungen. 0, falls nicht belegt.')},
    ({singlewash,trocken_kg,fluessig,halbladung_ml})=>{
      if(singlewash!=='aktiv'||trocken_kg===0) return {status:'singlewash_und_kleine_ladung_pruefen',hoechstens_ml_laut_empfehlung:null};
      if(trocken_kg>=1) return {status:'angegebene_singlewash_ladung_nicht_unter_einem_kg',hoechstens_ml_laut_empfehlung:null};
      if(!fluessig||halbladung_ml===0) return {status:'fluessigmittel_und_packungswert_fuer_halbe_ladung_pruefen',hoechstens_ml_laut_empfehlung:null};
      return {status:'singlewash_oberer_referenzwert',hoechstens_ml_laut_empfehlung:halbladung_ml/2,
        grenze:'Verwendet 50 Prozent eines ausdrücklich passenden Halbladungswerts. Ergibt keine gemessene Dosis oder allgemeine Dosierformel.'};
    },
    {singlewash:'aktiv',trocken_kg:0.8,fluessig:true,halbladung_ml:34},
    {status:'singlewash_oberer_referenzwert',hoechstens_ml_laut_empfehlung:17},[uba]),

  mieleTool('miele_wwr880_ultraphase_original_h1_h2_werkstabelle',
    'Die zwei UltraPhase-Startwerte in der WWR-880-WPS-Werkstabelle je Wasserhärte getrennt nachsehen — Read separate original UltraPhase setup references without inferring real consumption.',
    '21–22 · TwinDos-Inbetriebnahme',
    {originalpaar:readState('Ist das originale UltraPhase-1/2-Paar im Geltungsbereich genau dieser Werksangabe bestätigt?'),
      haerte:choice('Dem Waschmaschinenanschluss zugeordneter Härtebereich.','weich','mittel','hart','offen')},
    ({originalpaar,haerte})=>{
      if(originalpaar!=='bestaetigt'||haerte==='offen'){
        return {status:'originalpaar_haerte_und_packung_abgleichen',ersteinrichtung_phase_1_ml:null,ersteinrichtung_phase_2_ml:null};
      }
      const [first,second]=ultraPhasePresets[haerte];
      return {status:'handbuchwerte_fuer_originalpaar_zugeordnet',ersteinrichtung_phase_1_ml:first,ersteinrichtung_phase_2_ml:second,
        grenze:'Die Tabelle nennt Referenzen bei der Ersteinrichtung für dieses Paar. Aktuelle Packungsangaben prüfen. Die zwei Werte sind kein Verbrauch je Waschgang.'};
    },
    {originalpaar:'bestaetigt',haerte:'mittel'},
    {status:'handbuchwerte_fuer_originalpaar_zugeordnet',ersteinrichtung_phase_1_ml:58,ersteinrichtung_phase_2_ml:45},[hardness]),

  mieleTool('miele_wwr880_programm_waschmittelklasse_fussnote',
    'Für Express 20, Jeans, Wolle, Seide, Outdoor oder Gardinen die Waschmittelklasse und Fußnote des Miele-Handbuchs lesen — Decode the detergent types and physical forms recommended for named programmes.',
    '61 · Waschmittelempfehlungen',
    {programm:choice('Genau benanntes Programm auf dem WWR-880-WPS-Display.',
      ...Object.keys(mieleDetergents),'anderes_oder_offen')},
    ({programm})=>{
      const recommendations=mieleDetergents[programm];
      return {status:recommendations?'tabellenzeile_mit_fussnote_gelesen':'programm_in_seiner_handbuchtabelle_suchen',
        empfohlen_laut_zeile:recommendations??[],
        grenze:'Gibt nur die Empfehlung der Modell-Tabelle wieder. Die Packungsangaben und die Pflegekennzeichnung des konkreten Stücks separat prüfen.'};
    },
    {programm:'express_20'},
    {status:'tabellenzeile_mit_fussnote_gelesen',empfohlen_laut_zeile:['colorwaschmittel_fluessig']}),

  mieleTool('miele_wwr880_wasser_plus_und_zusatzspuelgang',
    'Wasser Plus, Zusatzspülgang und maximales Spülniveau der Miele WWR 880 WPS als unterschiedliche Wasseroptionen lesen — Distinguish higher level from a selected extra rinse.',
    '46, 48, 96–97 · Extras und Einstellungen',
    {wasser_plus:programState('Wasser Plus an diesem Programm tatsächlich aktiv, aus oder unklar.'),
      zusatzspuelgang:programState('Ein ausdrücklich zusätzlicher Spülgang tatsächlich gewählt, aus oder unklar.'),
      maximales_spuelniveau:programState('Separates maximales Spülniveau in den Einstellungen aktiv, aus oder unklar.')},
    ({wasser_plus,zusatzspuelgang,maximales_spuelniveau})=>({
      wasserstand_waschen_und_spuelen_durch_wasser_plus:wasser_plus==='offen'?null:wasser_plus==='aktiv',
      extra_spuelgang_als_option_gewaehlt:zusatzspuelgang==='offen'?null:zusatzspuelgang==='aktiv',
      maximales_spuelniveau_separat_gewaehlt:maximales_spuelniveau==='offen'?null:maximales_spuelniveau==='aktiv',
      tatsaechliche_wassermenge_l:null,
      grenze:'Dokumentiert drei unterschiedliche Einstellungen. Andere Programmbedingungen können zusätzliche Spülgänge auslösen. Mengen und tatsächlich ausgeführte Spülgänge separat beobachten.',
    }),
    {wasser_plus:'aktiv',zusatzspuelgang:'aus',maximales_spuelniveau:'aus'},
    {wasserstand_waschen_und_spuelen_durch_wasser_plus:true,extra_spuelgang_als_option_gewaehlt:false,tatsaechliche_wassermenge_l:null}),

  mieleTool('miele_wwr880_cap_restwasser_nach_programmende',
    'Kleine Wassermenge in der Miele Cap nach dokumentiertem Programmende einordnen — Distinguish the described residual water from proof that the whole cap dose was delivered.',
    '34 · Cap-Dosierung nach dem Programm',
    {programmende:readState('Ist das Programmende am Gerät unabhängig vom Aussehen der Cap bestätigt?'),
      beobachtung:choice('Was wurde unmittelbar danach an der benutzten Cap beobachtet?',
        'kleine_menge_wasser','klar_groessere_oder_unbestimmte_menge','kein_rest_sichtbar','nicht_beobachtet')},
    ({programmende,beobachtung})=>{
      if(programmende!=='bestaetigt'||beobachtung==='nicht_beobachtet') return {status:'programmende_und_cap_beobachtung_fehlend',vollstaendige_abgabe_belegt:false};
      return {status:beobachtung==='kleine_menge_wasser'?'kleiner_wasserrest_im_handbuch_beschrieben':
        beobachtung==='kein_rest_sichtbar'?'kein_sichtbarer_rest_beobachtet':'rest_liegt_ausserhalb_der_belegten_beschreibung',
        vollstaendige_abgabe_belegt:false,gramm_oder_ml_tatsaechlicher_abgabe:null};
    },
    {programmende:'bestaetigt',beobachtung:'kleine_menge_wasser'},
    {status:'kleiner_wasserrest_im_handbuch_beschrieben',vollstaendige_abgabe_belegt:false}),

  mieleTool('miele_wwr880_baumwolle_vorwaeschzeit_stufen',
    'Die Vorwaschzeit bei Miele WWR 880 WPS Baumwolle mit Normal, +6, +9 oder +12 Minuten dem dokumentierten Phasenwert zuordnen — Read the timed cotton prewash phase without treating it as total cycle duration.',
    '97 · Vorwaschzeit Baumwolle',
    {baumwolle:readState('Ist das dort genannte normale Programm Baumwolle gewählt?'),
      vorwaesche:programState('Ist Vorwäsche im konkreten Lauf ausgewählt?'),
      stufe:choice('Abgelesene Einstellung zur Vorwaschzeit.','normal','plus_6','plus_9','plus_12','offen')},
    ({baumwolle,vorwaesche,stufe})=>{
      if(baumwolle!=='bestaetigt'||vorwaesche!=='aktiv'||stufe==='offen') return {status:'baumwolle_aktive_vorwaesche_und_stufe_pruefen',handbuch_vorwaschzeit_min:null};
      return {status:'vorwaschphase_laut_handbuch_zugeordnet',handbuch_vorwaschzeit_min:prewashMinutes[stufe],gesamtdauer_min:null};
    },
    {baumwolle:'bestaetigt',vorwaesche:'aktiv',stufe:'plus_9'},
    {status:'vorwaschphase_laut_handbuch_zugeordnet',handbuch_vorwaschzeit_min:34,gesamtdauer_min:null}),
];
