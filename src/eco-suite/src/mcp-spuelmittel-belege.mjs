const page = '/produkte.html';
const miele = 'miele_g7673_scvi_autodos_e';
const builtIn = 'bosch_sbv4ebx00d';
const compact = 'bosch_sks62e32eu';
const manuals = {
  [miele]: {modell:'Miele G 7673 SCVi AutoDos E', anleitung:'G7673de-002 / M.-Nr. 12 780 570 / 02 / 002', quelle_url:'https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf'},
  [builtIn]: {modell:'Bosch SBV4EBX00D', anleitung:'9001790760_C', quelle_url:'https://media3.bsh-group.com/Documents/9001790760_C.pdf'},
  [compact]: {modell:'Bosch SKS62E32EU', anleitung:'9001707727_A', quelle_url:'https://media3.bosch-home.com/Documents/9001707727_A.pdf'},
};
const select = (description,...values) => ({type:'string',enum:values,description});
const yes = description => ({type:'boolean',description});
const num = (description,minimum,maximum) => ({type:'number',minimum,maximum,description});
const manualMatch = yes('Genaue deutsche Modellkennung und genannte Anleitung am konkreten Gerät abgeglichen?');
const anyModel = select('Genaues Modell aus den deutschen Unterlagen.',miele,builtIn,compact,'anderes_oder_offen');
const boschModel = select('Genaues Bosch-Modell aus den deutschen Unterlagen.',builtIn,compact,'anderes_oder_offen');
const hardness = num('Belegter Zahlenwert der Wasserhärte am Zulauf in °dH.',0,80);
const evidence = (model, verified) => verified && manuals[model]
  ? {markt:'DE', ...manuals[model]}
  : {markt:'DE', modell:null, anleitung:null, quelle_url:null};
const pick = (name,description,properties,calculate,args,expect) => ({name,description,page,properties,calculate,example:{args,expect}});

const hardnessRows = [
  {dh:[0,6], mmol:[0,1.1]},
  {dh:[7,8], mmol:[1.2,1.4]},
  {dh:[9,10], mmol:[1.5,1.8]},
  {dh:[11,12], mmol:[1.9,2.1]},
  {dh:[13,16], mmol:[2.2,2.9]},
  {dh:[17,21], mmol:[3,3.7]},
  {dh:[22,30], mmol:[3.8,5.4]},
];

export const spuelmittelBelege = [
  pick('spueler_haertebereich_versorger_geraetestufe',
    'Wasserhärte vom Versorger auf Zulaufbezug und nutzbaren Zahlenwert prüfen — Check if household inlet evidence is suitable for a device-specific hardness table.',
    {
      angabe:select('Welche Angabe liegt vor?','nur_haertebereich','zahlenwert_mit_einheit','zahl_ohne_einheit','offen'),
      versorgungsbezug:select('Welche Stelle deckt die Angabe ab?','passender_zulauf','vor_zentraler_enthaertung','andere_versorgungszone','offen'),
    },({angabe,versorgungsbezug})=>{
      if (versorgungsbezug!=='passender_zulauf') return {fuer_modelltabelle_geklaert:false,status:versorgungsbezug==='vor_zentraler_enthaertung'?'wert_am_tatsaechlichen_zulauf_noetig':'versorgungsbezug_offen'};
      const ready=angabe==='zahlenwert_mit_einheit';
      return {fuer_modelltabelle_geklaert:ready,status:ready?'zahl_und_einheit_am_zulauf':'genaue_zahl_und_einheit_erfragen',
        hinweis:'Die deutschen WRMG-Bereiche weich, mittel und hart sind keine Geräte-Menüwerte.'};
    },{angabe:'nur_haertebereich',versorgungsbezug:'passender_zulauf'},
    {fuer_modelltabelle_geklaert:false,status:'genaue_zahl_und_einheit_erfragen'}),

  pick('bosch_spueler_haertetabelle_eingabeeinheit_grenze',
    'Den Gerätewert für SBV4EBX00D oder SKS62E32EU aus der jeweiligen Wasserhärtetabelle lesen — Look up the exact Bosch hardness setting without interpolating across printed rows.',
    {
      modell:boschModel,
      anleitung_bestaetigt:manualMatch,
      zulaufwert_bestaetigt:yes('Der Zahlenwert gehört zum Zulauf des konkreten Geschirrspülers?'),
      wert:num('Wert in der angegebenen Einheit, unverändert aus dem Beleg übernommen.',0,90),
      einheit:select('Einheit der bestätigten Wasserhärte: dh = °dH, mmol = mmol/l aus demselben Zulaufbeleg.','dh','mmol','offen'),
    },({modell,anleitung_bestaetigt,zulaufwert_bestaetigt,wert,einheit})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||!zulaufwert_bestaetigt||einheit==='offen') return {...source,status:'bezug_offen',einstellwert:null};
      const upper=modell===builtIn?{dh:[31,50],mmol:[5.5,8.9]}:{dh:[31,35],mmol:[5.5,6.2]};
      const index=[...hardnessRows,upper].findIndex(row=>wert>=row[einheit][0]&&wert<=row[einheit][1]);
      if (index<0) return {...source,status:wert>upper[einheit][1]?'oberhalb_der_modelltabelle':'zwischen_gedruckten_tabellenbereichen',einstellwert:null};
      return {...source,status:'tabellenzeile_belegt',einstellwert:modell===builtIn?`H0${index}`:`H:0${index}`,
        hinweis:'Tabellenwert aus der passenden Geräteschrift. Die Tabellenbereiche ersetzen weder eine Messung noch die WRMG-Klassifikation.'};
    },{modell:compact,anleitung_bestaetigt:true,zulaufwert_bestaetigt:true,wert:39,einheit:'dh'},
    {status:'oberhalb_der_modelltabelle',einstellwert:null}),

  pick('miele_g7673_schwankende_wasserhaerte_oberwert',
    'Bei dokumentiert schwankender Härte am Miele-Zulauf den vorgesehenen Höchstwert ausweisen — Read what the exact Miele manual calls for with a verified inlet range.',
    {
      anleitung_bestaetigt:manualMatch,
      intervall_grund:select('Warum liegen zwei Werte vor?','schwankung_am_selben_zulauf','nur_messunsicherheit','unterschiedliche_anschluesse','offen'),
      unterwert_dh:hardness,
      oberwert_dh:hardness,
    },({anleitung_bestaetigt,intervall_grund,unterwert_dh,oberwert_dh})=>{
      const source=evidence(miele,anleitung_bestaetigt);
      if (oberwert_dh<unterwert_dh) throw new RangeError('Unter- und Oberwert in aufsteigender Reihenfolge angeben.');
      const usable=anleitung_bestaetigt&&intervall_grund==='schwankung_am_selben_zulauf';
      if (usable&&oberwert_dh>70) return {...source,status:'oberhalb_des_dokumentierten_geraetebereichs',oberwert_dh:null};
      return {...source,status:usable?'hoechster_bestaetigter_wert':'schwankung_am_zulauf_offen',oberwert_dh:usable?oberwert_dh:null,
        hinweis:'Die werkseitigen 14 °dH sind ein Gerätevoreinstellwert. Die Aufgabe liest den Haushaltsbeleg in °dH.'};
    },{anleitung_bestaetigt:true,intervall_grund:'schwankung_am_selben_zulauf',unterwert_dh:10,oberwert_dh:15},
    {status:'hoechster_bestaetigter_wert',oberwert_dh:15}),

  pick('spueler_multitab_salzgrenze_packung_geraet',
    'Die Salzersatz-Angabe eines Multitabs an Geräteanleitung und tatsächlicher Wasserhärte prüfen — Intersect verified detergent and device limits before considering that use case.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      zulaufwert_bestaetigt:yes('Wert gilt tatsächlich am Zulauf dieses Geräts?'),
      wasserhaerte_dh:hardness,
      packung:select('Was belegt der Reiniger-Aufdruck?','salzersatz_mit_genauen_grenzen','salzersatz_grenze_fehlt','kein_salzersatz','offen'),
      packung_untergrenze_dh:num('Belegte untere Packungsgrenze in °dH. Bei einer reinen Bis-Angabe 0.',0,80),
      packung_obergrenze_dh:num('Belegte obere Packungsgrenze in °dH.',0,80),
    },({modell,anleitung_bestaetigt,zulaufwert_bestaetigt,wasserhaerte_dh,packung,packung_untergrenze_dh,packung_obergrenze_dh})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (packung==='salzersatz_mit_genauen_grenzen'&&packung_untergrenze_dh>packung_obergrenze_dh) throw new RangeError('Packungsgrenzen in aufsteigender Reihenfolge angeben.');
      if (!source.modell||!zulaufwert_bestaetigt) return {...source,status:'bezug_offen',packungsbereich_passt:null,geraetegrenze_passt:null};
      const device=modell===miele?wasserhaerte_dh<21:wasserhaerte_dh<=21;
      const label=packung==='salzersatz_mit_genauen_grenzen'?wasserhaerte_dh>=packung_untergrenze_dh&&wasserhaerte_dh<=packung_obergrenze_dh:null;
      const eligible=packung!=='kein_salzersatz'&&label!==false&&device;
      return {...source,status:!eligible?'multitab_fall_nicht_belegt':label?'beide_bereiche_passen':'packungsgrenze_offen',
        packungsbereich_passt:label,geraetegrenze_passt:device,
        hinweis:'Gilt für den Fall Salzersatz. Klarspüler und der gesonderte Weichwasserfall haben eigene Nachweise.'};
    },{modell:builtIn,anleitung_bestaetigt:true,zulaufwert_bestaetigt:true,wasserhaerte_dh:21,packung:'salzersatz_mit_genauen_grenzen',packung_untergrenze_dh:0,packung_obergrenze_dh:18},
    {status:'multitab_fall_nicht_belegt',packungsbereich_passt:false,geraetegrenze_passt:true}),

  pick('spueler_salzprodukt_etikett_geraetemodell',
    'Ein angegebenes Salzprodukt gegen die genaue deutsche Geschirrspüleranleitung lesen — Check catalog or package wording for the specified model.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      packung:select('Wörtlich bestätigter Produkttyp am Etikett.','koerniges_spezialsalz_geschirrspueler','reines_siedesalz','salztablette','nur_speisesalz','entkalkungstablette','offen'),
    },({modell,anleitung_bestaetigt,packung})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||packung==='offen') return {...source,status:'beleg_offen'};
      if (packung==='koerniges_spezialsalz_geschirrspueler'||modell===miele&&packung==='reines_siedesalz') return {...source,status:'produktkategorie_genannt'};
      if (modell===builtIn&&['salztablette','nur_speisesalz'].includes(packung)) return {...source,status:'in_dieser_anleitung_ausgeschlossen'};
      return {...source,status:'diese_deklaration_reicht_nicht'};
    },{modell:builtIn,anleitung_bestaetigt:true,packung:'salztablette'},
    {status:'in_dieser_anleitung_ausgeschlossen'}),

  pick('spueler_salzbehaelter_erstbefuellung_nachfuellen',
    'Wasserhinweis bei erster Salzfüllung vom Nachfüllen unterscheiden — Separate the documented first-fill water instruction from the refill case.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      fall:select('Belegte Vorgeschichte des Geräts.','erste_salzbefuellung','nachfuellen_im_betrieb','vorgeschichte_offen'),
    },({modell,anleitung_bestaetigt,fall})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||fall==='vorgeschichte_offen') return {...source,wasserhinweis:null,litern_ca:null,status:'befuellfall_offen'};
      if (fall==='nachfuellen_im_betrieb') return {...source,wasserhinweis:null,litern_ca:null,status:'erstbefuellhinweis_gilt_hier_nicht'};
      return {...source,status:'erstbefuellung_in_anleitung',wasserhinweis:modell===miele?'ca_1_5_l_vor_erster_salzfuellung':'behaelter_bei_erster_inbetriebnahme_voll',
        litern_ca:modell===miele?1.5:null,hinweis:'Vorgehen für das konkrete Gerät vollständig in der Anleitung nachlesen.'};
    },{modell:miele,anleitung_bestaetigt:true,fall:'erste_salzbefuellung'},
    {status:'erstbefuellung_in_anleitung',wasserhinweis:'ca_1_5_l_vor_erster_salzfuellung',litern_ca:1.5}),

  pick('spueler_salz_klarspueler_reiniger_fachbeleg',
    'Salz, Klarspüler und manuell dosierten Geschirrspülreiniger dem beschrifteten Fach zuordnen — Identify the correct compartment on documented appliances without handling a mix-up.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      mittel:select('Eindeutig auf der Packung deklarierte Mittelart.','regeneriersalz','klarspueler_haushaltsgeschirrspueler','geschirrspuelreiniger_manuell','offen'),
      fach:select('Sicher gelesene Fachkennzeichnung.','salzbehaelter','klarspueler_vorrat','reinigerfach','offen'),
      bereits_eingefuellt:yes('Das Mittel ist schon eingefüllt?'),
    },({modell,anleitung_bestaetigt,mittel,fach,bereits_eingefuellt})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      const targets={regeneriersalz:'salzbehaelter',klarspueler_haushaltsgeschirrspueler:'klarspueler_vorrat',geschirrspuelreiniger_manuell:'reinigerfach'};
      if (!source.modell||mittel==='offen'||fach==='offen') return {...source,status:'kennzeichnung_offen',dokumentiertes_fach:null};
      const target=targets[mittel];
      if (bereits_eingefuellt&&fach!==target) return {...source,status:'abweichung_herstellerhilfe_lesen',dokumentiertes_fach:null};
      return {...source,status:fach===target?'fachkennzeichnung_passt':'fachkennzeichnung_weicht_ab',dokumentiertes_fach:target};
    },{modell:compact,anleitung_bestaetigt:true,mittel:'regeneriersalz',fach:'klarspueler_vorrat',bereits_eingefuellt:true},
    {status:'abweichung_herstellerhilfe_lesen',dokumentiertes_fach:null}),

  pick('miele_g7673_solo_nach_multitab_mangelanzeige',
    'Bei einem Reinigerwechsel ausgeblendete Mangelanzeigen unabhängig vom Vorrat lesen — Identify the missing refill evidence when changing from a multi-function cleaner to solo detergent.',
    {
      anleitung_bestaetigt:manualMatch,
      wechsel:select('Belegter Wechsel beim konkreten Gerät.','multifunktion_zu_solo','powerdisk_zu_solo','kein_wechsel','offen'),
      mangelanzeige:select('Bekannter Anzeigezustand.','ausgeblendet','aktiv','offen'),
    },({anleitung_bestaetigt,wechsel,mangelanzeige})=>{
      const source=evidence(miele,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||wechsel==='offen'||mangelanzeige==='offen') return {...source,status:'wechsel_oder_anzeige_offen',vorrat_aus_anzeige_bestaetigt:false};
      if (!['multifunktion_zu_solo','powerdisk_zu_solo'].includes(wechsel)) return {...source,status:'kein_dokumentierter_wechselfall',vorrat_aus_anzeige_bestaetigt:false};
      return {...source,status:mangelanzeige==='ausgeblendet'?'getrennte_mittel_und_anzeigen_pruefen':'getrennte_mittel_pruefen',
        vorrat_aus_anzeige_bestaetigt:false,hinweis:'Beim Wechsel nennt Miele Salz und Klarspüler separat. Eine ausgeblendete Meldung belegt keinen Vorrat.'};
    },{anleitung_bestaetigt:true,wechsel:'multifunktion_zu_solo',mangelanzeige:'ausgeblendet'},
    {status:'getrennte_mittel_und_anzeigen_pruefen',vorrat_aus_anzeige_bestaetigt:false}),

  pick('spueler_klarspueler_schlieren_flecken_beobachten',
    'Schlieren und Wasserflecken anhand vergleichbarer Läufe unterscheiden — Scope the manual’s rinse-aid adjustment clues to observed results.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      art:select('Genau beobachtetes Ergebnis.','entfernbare_schlieren','wasserflecken','beides','nur_nasser_kunststoff','offen'),
      behaelter_befuellt:yes('Klarspüler war getrennt vorhanden und aktiviert?'),
      gleicher_programmbezug:yes('Programm beendigt und Dosierung, Beladung und Entladezeit vergleichbar?'),
      weiterer_hinweis:yes('Gibt es Anzeichen für blockierte Zugabe, Reinigerreste oder anderen dokumentierten Grund?'),
    },({modell,anleitung_bestaetigt,art,behaelter_befuellt,gleicher_programmbezug,weiterer_hinweis})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      const direction=art==='entfernbare_schlieren'?'weniger':art==='wasserflecken'?'mehr':null;
      const usable=source.modell&&behaelter_befuellt&&gleicher_programmbezug&&!weiterer_hinweis&&direction;
      return {...source,status:usable?'richtung_in_anleitung_belegt':'richtung_aus_beobachtung_offen',richtung_klarspueler:usable?direction:null,
        hinweis:'Die Richtung aus der Anleitung ist ein Prüfhinweis. Ein einzelnes Symptom kann verschiedene Ursachen haben.'};
    },{modell:miele,anleitung_bestaetigt:true,art:'entfernbare_schlieren',behaelter_befuellt:true,gleicher_programmbezug:true,weiterer_hinweis:false},
    {status:'richtung_in_anleitung_belegt',richtung_klarspueler:'weniger'}),

  pick('spueler_reinigerdosis_fachmarke_fuellmaximum',
    'Reiniger-Dosierung auf dem Etikett von der Füllgrenze des Reinigerfachs trennen — Distinguish package dose, chamber capacity and the fallback exact-model guidance.',
    {
      modell:select('Genaue Gerätevariante.',miele,builtIn,'anderes_oder_offen'),
      anleitung_bestaetigt:manualMatch,
      reiniger:select('Dokumentierte Form des manuell dosierten Geschirrspülreinigers.','tab','manuell_messbar_ml','offen'),
      packungsbezug:select('Passende Dosisangabe für den Fall.','packungswert_in_ml','packung_erlaubt_einen_tab','nur_gramm','keine_andere_angabe','offen'),
      packungsmenge_ml:num('Belegter Packungswert in ml, sonst 0.',0,500),
      manuell_und_normale_beladung:yes('Manuelles Fach und gewöhnliche Beladung für den gewählten Beleg bestätigt?'),
    },({modell,anleitung_bestaetigt,reiniger,packungsbezug,packungsmenge_ml,manuell_und_normale_beladung})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||!manuell_und_normale_beladung||reiniger==='offen') return {...source,status:'dosierfall_offen',fuellgrenze_ml:null,groesste_fachmarke_ml:null};
      const base={...source,fuellgrenze_ml:modell===miele?50:null,groesste_fachmarke_ml:modell===builtIn?50:null};
      if (reiniger==='tab'&&['packung_erlaubt_einen_tab','keine_andere_angabe'].includes(packungsbezug)) return {...base,status:'ein_tab_im_dokumentierten_fall',tabs:1};
      if (reiniger==='manuell_messbar_ml'&&packungsbezug==='packungswert_in_ml'&&packungsmenge_ml>0) {
        return {...base,status:packungsmenge_ml<=50?'packungsdosis_von_fachmarke_getrennt':'packungswert_ueber_fachmarke_klaeren',
          packungsdosis_ml:packungsmenge_ml};
      }
      if (reiniger==='manuell_messbar_ml'&&packungsbezug==='keine_andere_angabe') return {...base,status:'beschriebener_manueller_richtbereich',
        referenzdosis_ml:modell===miele?[20,30]:[20,25]};
      return {...base,status:'dosisbezug_oder_einheit_offen'};
    },{modell:builtIn,anleitung_bestaetigt:true,reiniger:'manuell_messbar_ml',packungsbezug:'packungswert_in_ml',packungsmenge_ml:24,manuell_und_normale_beladung:true},
    {status:'packungsdosis_von_fachmarke_getrennt',packungsdosis_ml:24,fuellgrenze_ml:null,groesste_fachmarke_ml:50}),

  pick('miele_g7673_powerdisk_auto_oder_manuell',
    'Beim Miele G 7673 den Dosiervorgang nach bestätigtem AutoDos- und PowerDisk-Zustand zuordnen — Resolve the active detergent path before adding anything.',
    {
      anleitung_bestaetigt:manualMatch,
      autodos:select('Tatsächlich bestätigter AutoDos-Zustand.','aktiv','deaktiviert','offen'),
      disk:select('Bestätigter Disk-Zustand für diese Entscheidung.','einsatzbereit','leer_mit_meldung','offen'),
    },({anleitung_bestaetigt,autodos,disk})=>{
      const source=evidence(miele,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||autodos==='offen') return {...source,status:'aktueller_dosierweg_offen',dosierweg:null};
      if (autodos==='deaktiviert') return {...source,status:'manueller_weg_dokumentiert',dosierweg:'manuelles_reinigerfach'};
      if (disk==='leer_mit_meldung') return {...source,status:'powerdisk_wechsel_oder_deaktivierung_angezeigt',dosierweg:null};
      return {...source,status:disk==='einsatzbereit'?'auto_weg_dokumentiert':'powerdisk_zustand_offen',dosierweg:disk==='einsatzbereit'?'autodos':null};
    },{anleitung_bestaetigt:true,autodos:'aktiv',disk:'leer_mit_meldung'},
    {status:'powerdisk_wechsel_oder_deaktivierung_angezeigt',dosierweg:null}),

  pick('spueler_tabrest_kurzprogramm_oder_blockade',
    'Bei Tab-Resten Hinweise aus Programm, Fach und Reinigerzustand getrennt sammeln — Keep multiple plausible explanations for a partially dissolved dishwasher tab.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      rest_nach_ende:yes('Tab-Rest nach dokumentiert beendetem Programm beobachtet?'),
      programm:select('Tatsächlich gelaufener und belegter Programmtyp.','bosch_verkuerzt','miele_quickpowerwash','anderes','offen'),
      fach:select('Tatsächlich beobachteter Zustand von Reinigerfach und Deckel.','sichtbar_blockiert','beim_einfuellen_feucht','belegt_frei_und_trocken','offen'),
      auffangschale_blockiert_b:yes('Nur bei SBV4EBX00D: Tab-Auffangschale am exakten Gerät dokumentiert und durch Geschirr versperrt?'),
      reiniger_verklumpt:yes('Schon vor einem Bosch-Lauf sichtbar verklumpter oder lange gelagerter Tab?'),
    },({modell,anleitung_bestaetigt,rest_nach_ende,programm,fach,auffangschale_blockiert_b,reiniger_verklumpt})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||!rest_nach_ende) return {...source,status:'vergleich_nicht_auswertbar',indizien:[]};
      const clues=[];
      if (modell===miele?programm==='miele_quickpowerwash':programm==='bosch_verkuerzt') clues.push('kurze_aufloesezeit_moeglich');
      if (fach==='sichtbar_blockiert') clues.push('reinigerfach_blockiert_beobachtet');
      if (fach==='beim_einfuellen_feucht') clues.push('feuchtes_reinigerfach_beobachtet');
      if (modell===builtIn&&auffangschale_blockiert_b) clues.push('bosch_auffangschale_blockiert_beobachtet');
      if (modell!==miele&&reiniger_verklumpt) clues.push('reinigerzustand_als_hinweis');
      return {...source,status:clues.length?'dokumentierte_hinweise':'ursache_offen',indizien:clues};
    },{modell:builtIn,anleitung_bestaetigt:true,rest_nach_ende:true,programm:'bosch_verkuerzt',fach:'sichtbar_blockiert',auffangschale_blockiert_b:false,reiniger_verklumpt:false},
    {status:'dokumentierte_hinweise',indizien:['kurze_aufloesezeit_moeglich','reinigerfach_blockiert_beobachtet']}),

  pick('spueler_vorbereitung_grobe_reste_auto_sensor',
    'Geschirrvorbereitung und maschineneigenes Vorspülen vor einem Automatikvergleich trennen — Separate scraping, rinsing under the tap and the machine’s internal prewash.',
    {
      vorbereitung:select('Welche Vorbereitung an dieser Ladung ist beobachtet?','grobe_reste_abgestreift','von_hand_stark_vorgespult','keine_vorbereitung','offen'),
      auto_sensor_belegt:yes('Lief nachweislich das dokumentierte sensorabhängige Automatikprogramm?'),
      maschinen_vorspuelphase:select('Was steht in der Tabelle für diesen internen Schritt?','vorhanden','nicht_vorhanden','sensorabhaengig','offen'),
    },({vorbereitung,auto_sensor_belegt,maschinen_vorspuelphase})=>{
      const limited=vorbereitung==='von_hand_stark_vorgespult'&&auto_sensor_belegt;
      return {status:vorbereitung==='offen'?'haushaltsvorbereitung_offen':limited?'sensorvergleich_eingeschraenkt':vorbereitung==='grobe_reste_abgestreift'?'vorbereitung_nach_uba':'grobe_reste_und_vorbereitung_pruefen',
        sensorvergleich_eingeschraenkt:limited,maschinen_vorspuelphase:maschinen_vorspuelphase==='offen'?null:maschinen_vorspuelphase,
        hinweis:'Das UBA empfiehlt, grobe Reste zu entfernen und auf übliches Vorspülen am Wasserhahn zu verzichten.'};
    },{vorbereitung:'von_hand_stark_vorgespult',auto_sensor_belegt:true,maschinen_vorspuelphase:'sensorabhaengig'},
    {status:'sensorvergleich_eingeschraenkt',sensorvergleich_eingeschraenkt:true,maschinen_vorspuelphase:'sensorabhaengig'}),

  pick('miele_g7673_zweites_zwischenspuelen_eco_ausnahme',
    'Beim Miele G 7673 die dokumentierte ECO-Ausnahme für das zweite Zwischenspülen prüfen — Check whether the persistent extra can apply to the selected program.',
    {
      anleitung_bestaetigt:manualMatch,
      programm:select('Tatsächlich ausgewähltes Programm.','eco','anderes_bestaetigtes_programm','offen'),
      zusatz:select('Dokumentierte Einstellung des zweiten Zwischenspülens.','aktiv','inaktiv','offen'),
    },({anleitung_bestaetigt,programm,zusatz})=>{
      const source=evidence(miele,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||programm==='offen') return {...source,status:'programmbezug_offen',zusatz_gilt:null};
      if (programm==='eco') return {...source,status:'eco_ausnahme',zusatz_gilt:false};
      if (zusatz==='offen') return {...source,status:'einstellung_offen',zusatz_gilt:null};
      return {...source,status:zusatz==='aktiv'?'ausserhalb_eco_aktiv':'einstellung_inaktiv',zusatz_gilt:zusatz==='aktiv',
        hinweis:'Miele nennt möglichen zusätzlichen Wasserverbrauch ohne Literwert für diesen Lauf.'};
    },{anleitung_bestaetigt:true,programm:'eco',zusatz:'aktiv'},
    {status:'eco_ausnahme',zusatz_gilt:false}),

  pick('bosch_kompakt_regeneration_variante_eco_basis',
    'Beim deutschen SKS62E32EU Zusatzaufwand für die Regeneration auf die 8-Liter-Eco-Referenz begrenzen — Read the exact compact dishwasher laboratory row, without mapping it onto a calendar.',
    {
      anleitung_bestaetigt:manualMatch,
      kurzbeleg_eco_l:num('Eco-50-Literangabe aus passender Kurzanleitung oder bestätigtem Modell-Datenblatt.',0,50),
      bedingung:select('Belegter Bezug für den Vergleich.','eco50_werkshaerte_13_bis_16_dh','abweichende_bedingung','offen'),
    },({anleitung_bestaetigt,kurzbeleg_eco_l,bedingung})=>{
      const source=evidence(compact,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||kurzbeleg_eco_l!==8) return {...source,status:'de_8_l_variante_nicht_bestaetigt',labortabelle:null};
      if (bedingung!=='eco50_werkshaerte_13_bis_16_dh') return {...source,status:'laborbedingung_nicht_bestaetigt',labortabelle:null};
      return {...source,status:'eco50_labortabelle_belegt',regeneration_nach_spuelgaengen:5,
        zusatz_max:{minuten:4,wasser_l:2.5,strom_kwh:0.03},
        hinweis:'Zusatzwerte aus der Hersteller-Labortabelle. Die zweite Tabellenzeile gehört einer 9-l-Gerätevariante an.'};
    },{anleitung_bestaetigt:true,kurzbeleg_eco_l:8,bedingung:'eco50_werkshaerte_13_bis_16_dh'},
    {status:'eco50_labortabelle_belegt',regeneration_nach_spuelgaengen:5,zusatz_max:{minuten:4,wasser_l:2.5,strom_kwh:0.03}}),

  pick('bosch_sbv4ebx00d_fluessigreiniger_vorspuelen_zeitvorwahl',
    'Beim Bosch SBV4EBX00D die zwei dokumentierten Einschränkungen für Flüssigreiniger prüfen — Match the liquid-detergent route to confirmed prewash and delay settings.',
    {
      anleitung_bestaetigt:manualMatch,
      reiniger:select('Bestätigte Reinigerform.','fluessigreiniger','pulver_oder_tab','offen'),
      internes_vorspuelen:select('Vorspülphase laut Programm-Unterlagen.','ohne','mit','offen'),
      zeitvorwahl:select('Tatsächliche Startvorwahl.','aktiv','inaktiv','offen'),
    },({anleitung_bestaetigt,reiniger,internes_vorspuelen,zeitvorwahl})=>{
      const source=evidence(builtIn,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||reiniger==='offen') return {...source,status:'bezug_offen',offene_bedingungen:[]};
      if (reiniger!=='fluessigreiniger') return {...source,status:'anderer_reinigerfall',offene_bedingungen:[]};
      const conditions=[];
      if (internes_vorspuelen!=='ohne') conditions.push('programm_ohne_vorspuelen');
      if (zeitvorwahl!=='inaktiv') conditions.push('keine_zeitvorwahl');
      return {...source,status:conditions.length?'bedingungen_nicht_bestaetigt':'bedingungen_der_anleitung_bestaetigt',offene_bedingungen:conditions};
    },{anleitung_bestaetigt:true,reiniger:'fluessigreiniger',internes_vorspuelen:'ohne',zeitvorwahl:'aktiv'},
    {status:'bedingungen_nicht_bestaetigt',offene_bedingungen:['keine_zeitvorwahl']}),

  pick('miele_g7673_salzmangel_nach_befuellen_einordnen',
    'Eine verbleibende Salzmangelmeldung direkt nach bestätigter Befüllung beim Miele G 7673 einordnen — Interpret a refill notice that persists immediately after filling without diagnosing a sensor.',
    {
      anleitung_bestaetigt:manualMatch,
      meldung:select('Abgelesene Meldung.','salz_einfuellen','keine_meldung','anderes_oder_offen'),
      zeitbezug:select('Zeitpunkt relativ zur bestätigten Salznachfüllung.','direkt_danach','spaeter_erneut','noch_nicht_nachgefuellt','offen'),
    },({anleitung_bestaetigt,meldung,zeitbezug})=>{
      const source=evidence(miele,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||zeitbezug==='offen'||meldung==='anderes_oder_offen') return {...source,status:'meldung_oder_zeitbezug_offen'};
      if (meldung==='keine_meldung') return {...source,status:'keine_sichtbare_meldung'};
      if (zeitbezug==='direkt_danach') return {...source,status:'voruebergehende_meldung_laut_anleitung_moeglich',
        hinweis:'Miele nennt noch nicht erreichte Salzkonzentration als möglichen dokumentierten Fall. Der tatsächliche Zustand bleibt ungeklärt.'};
      return {...source,status:zeitbezug==='noch_nicht_nachgefuellt'?'nachfuellmeldung_dokumentiert':'erneute_meldung_herstellerhilfe_lesen'};
    },{anleitung_bestaetigt:true,meldung:'salz_einfuellen',zeitbezug:'direkt_danach'},
    {status:'voruebergehende_meldung_laut_anleitung_moeglich'}),

  pick('spueler_klarspueler_menuewert_und_abgabe_trennen',
    'Klarspüler-Menüwert für das genaue Modell als Stufe oder ml-Sollwert lesen — Interpret a rinse-aid display without treating it as a measurement of actual delivery.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      gelesen:select('Im Gerät gelesene Einheit oder Darstellung.','bosch_stufe','miele_ml_sollwert','andere_oder_offen'),
      wert:num('Letzte gelesene Stufenzahl oder Miele-Sollwert. Beispiel r:04 → 4.',0,20),
    },({modell,anleitung_bestaetigt,gelesen,wert})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||gelesen==='andere_oder_offen') return {...source,status:'anzeigebezug_offen',tatsaechliche_abgabe_ml:null};
      const expected=modell===miele?'miele_ml_sollwert':'bosch_stufe';
      if (gelesen!==expected||wert>6||modell!==miele&&!Number.isInteger(wert)) return {...source,status:'anzeige_passt_nicht_zur_dokumentation',tatsaechliche_abgabe_ml:null};
      if (modell===miele) return {...source,status:'einstellwert_in_ml',sollwert_ml:wert,werkseinstellung_ml:3,tatsaechliche_abgabe_ml:null,
        hinweis:'Miele gibt an, dass die tatsächlich dosierte Menge programmabhängig höher liegen kann.'};
      return {...source,status:wert===0?'anlage_aus_an_dem_menuewert':'stufe_ohne_ml_zuordnung',stufe:wert,werkseinstellung_stufe:modell===builtIn?5:4,
        tatsaechliche_abgabe_ml:null};
    },{modell:compact,anleitung_bestaetigt:true,gelesen:'bosch_stufe',wert:4},
    {status:'stufe_ohne_ml_zuordnung',stufe:4,tatsaechliche_abgabe_ml:null}),

  pick('miele_g7673_autodos_mengenwahl_zielkonflikt',
    'Eine geplante Änderung der AutoDos-Menge als Zielkonflikt zwischen Disk-Nutzung und Reinigung lesen — Use the exact Miele manual’s qualitative tradeoff under confirmed conditions.',
    {
      anleitung_bestaetigt:manualMatch,
      autodos_aktiv:yes('Die automatische PowerDisk-Dosierung des exakten Geräts ist belegt aktiv?'),
      aenderung:select('Welche einzelne Mengenänderung soll beobachtet werden?','mehr','weniger','keine','offen'),
      programm_beladung_vergleichbar:yes('Programm, Einstellungen, Beladung und Verschmutzung sind für die Beobachtung vergleichbar?'),
    },({anleitung_bestaetigt,autodos_aktiv,aenderung,programm_beladung_vergleichbar})=>{
      const source=evidence(miele,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||!autodos_aktiv||!programm_beladung_vergleichbar||aenderung==='offen') return {...source,status:'vergleichsbezug_offen',disk_nutzungsdauer:null,reinigung:null};
      if (aenderung==='keine') return {...source,status:'kein_einstellungswechsel',disk_nutzungsdauer:null,reinigung:null};
      const less=aenderung==='weniger';
      return {...source,status:'qualitativer_herstellerhinweis',disk_nutzungsdauer:less?'kann_laenger_werden':'kuerzer_beschrieben',
        reinigung:less?'kann_schlechter_werden':'verbesserung_moeglich',hinweis:'Keine Einschätzung zu einer konkreten Zykluszahl oder dem Ergebnis einer Ladung.'};
    },{anleitung_bestaetigt:true,autodos_aktiv:true,aenderung:'weniger',programm_beladung_vergleichbar:true},
    {status:'qualitativer_herstellerhinweis',disk_nutzungsdauer:'kann_laenger_werden',reinigung:'kann_schlechter_werden'}),

  pick('spueler_nach_salzbehaelter_oeffnen_spuelbezug',
    'Die modelleigene Vorgabe nach Salzkontakt vom regulären Spülgang unterscheiden — Identify the documented after-fill or opened-cap case for the exact dishwasher manual.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      vorgang:select('Beobachteter Vorgang am eindeutig gekennzeichneten Salzbehälter.','salz_eingefuellt','nur_salzdeckel_geoeffnet','kein_vorgang','offen'),
    },({modell,anleitung_bestaetigt,vorgang})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||vorgang==='offen') return {...source,status:'vorgang_offen',bezug:null};
      if (vorgang==='kein_vorgang') return {...source,status:'kein_salzeingriff',bezug:null};
      if (modell===miele) return {...source,status:'miele_eigenes_programm_belegt',bezug:'salz_ausspuelen_ohne_spuelgut'};
      if (vorgang==='salz_eingefuellt') return {...source,status:'bosch_zeitbezug_belegt',bezug:'unmittelbar_vor_programmstart'};
      return {...source,status:'fuer_nur_deckel_keine_entsprechende_aussage',bezug:null};
    },{modell:miele,anleitung_bestaetigt:true,vorgang:'nur_salzdeckel_geoeffnet'},
    {status:'miele_eigenes_programm_belegt',bezug:'salz_ausspuelen_ohne_spuelgut'}),

  pick('miele_g7673_kunststoff_verfaerbung_naturfarbstoffe',
    'Farbveränderungen an Kunststoff von Tropfen und abwischbaren Resten unterscheiden — Check whether documented food-pigment staining is a plausible explanation on the exact Miele model.',
    {
      anleitung_bestaetigt:manualMatch,
      oberflaeche:select('Material und Beobachtung nach abgeschlossenem Spülgang.','kunststoff_verfaerbt','kunststoff_tropfen_oder_abwischbar','anderes_material','offen'),
      natuerliche_farbstoffe_belegt:yes('Karotten, Tomaten, Ketchup oder vergleichbare Lebensmittelreste waren beim selben Lauf beobachtet?'),
    },({anleitung_bestaetigt,oberflaeche,natuerliche_farbstoffe_belegt})=>{
      const source=evidence(miele,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||oberflaeche==='offen') return {...source,status:'material_oder_modell_offen',pigmenthinweis:null};
      if (oberflaeche!=='kunststoff_verfaerbt') return {...source,status:'anderer_beobachteter_fall',pigmenthinweis:null};
      return {...source,status:natuerliche_farbstoffe_belegt?'naturfarbstoff_als_moeglichkeit_dokumentiert':'quelle_der_verfaerbung_offen',
        pigmenthinweis:natuerliche_farbstoffe_belegt?true:null,hinweis:'Miele beschreibt Verfärbungen durch Naturfarbstoffe. Die Beobachtung allein weist weder die Ursache noch den Zustand des Kunststoffs nach.'};
    },{anleitung_bestaetigt:true,oberflaeche:'kunststoff_verfaerbt',natuerliche_farbstoffe_belegt:true},
    {status:'naturfarbstoff_als_moeglichkeit_dokumentiert',pigmenthinweis:true}),

  pick('spuelreiniger_blauer_engel_de_uz_201_produktbeleg',
    'Den Blauen Engel DE-UZ 201 am exakten Geschirrspülprodukt prüfen — Check an environmental label’s documented product match separately from machine compatibility.',
    {
      artikel:select('Produktkategorie laut genauer Bezeichnung.','reiniger_haushaltsgeschirrspueler','klarspueler_haushaltsgeschirrspueler','handspuelmittel','regeneriersalz','offen'),
      kennung:select('Gelesene Zeichenkennung.','de_uz_201','andere','offen'),
      verzeichnis:select('Abgleich von exaktem Produktnamen und Anbieter mit aktuellem Zeichen-Verzeichnis.','genau_bestaetigt','abweichend','nur_werbeaufdruck','offen'),
    },({artikel,kennung,verzeichnis})=>{
      if (['handspuelmittel','regeneriersalz'].includes(artikel)) return {status:'andere_produktgruppe',zeichen_beleg:false,geraeteeignung:null};
      if (artikel==='offen'||kennung==='offen'||verzeichnis==='offen') return {status:'produkt_oder_zeichen_offen',zeichen_beleg:null,geraeteeignung:null};
      if (kennung!=='de_uz_201'||verzeichnis==='abweichend') return {status:'beleg_fuer_de_uz_201_passt_nicht',zeichen_beleg:false,geraeteeignung:null};
      return {status:verzeichnis==='genau_bestaetigt'?'exakter_verzeichnistreffer':'zeichen_aufdruck_allein',
        zeichen_beleg:verzeichnis==='genau_bestaetigt'?true:null,geraeteeignung:null,
        hinweis:'Ein Umweltzeichen trifft keine Aussage zur Härte, Dosierung oder Geräteeignung dieses Kaufs.'};
    },{artikel:'reiniger_haushaltsgeschirrspueler',kennung:'de_uz_201',verzeichnis:'nur_werbeaufdruck'},
    {status:'zeichen_aufdruck_allein',zeichen_beleg:null,geraeteeignung:null}),

  pick('spueler_weichwasser_ohne_salz_geraetemodell',
    'Bei belegtem Weichwasser den getrennten Salzfall des exakten Modells prüfen — Use the model-specific soft-water boundary without relying on a multi-function tablet.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      zulauf:select('Bezug des Härtebereichs.','dauerhaft_am_zulauf_belegt','einzelwert_oder_anderer_anschluss','offen'),
      maximal_dh:hardness,
    },({modell,anleitung_bestaetigt,zulauf,maximal_dh})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell||zulauf!=='dauerhaft_am_zulauf_belegt') return {...source,status:'weichwasserfall_offen',salzausnahme_belegt:null};
      const fits=modell===miele?maximal_dh<5:maximal_dh<=6;
      return {...source,status:fits?'weichwasserfall_der_anleitung':'weichwassergrenze_ueberschritten',salzausnahme_belegt:fits,
        modellgrenze_dh:modell===miele?5:6,grenze_eingeschlossen:modell!==miele,
        hinweis:'Diese Aussage betrifft nur den getrennten Weichwasserfall des Geräts.'};
    },{modell:miele,anleitung_bestaetigt:true,zulauf:'dauerhaft_am_zulauf_belegt',maximal_dh:5},
    {status:'weichwassergrenze_ueberschritten',salzausnahme_belegt:false,modellgrenze_dh:5,grenze_eingeschlossen:false}),

  pick('bosch_sks62e32eu_glastruebung_ablesbarer_beleg',
    'Beim kompakten Bosch anhaltende Glastrübung von abwischbarer Auflage unterscheiden — Decide which evidence branch applies without diagnosing irreversible damage.',
    {
      anleitung_bestaetigt:manualMatch,
      zustand:select('Bereits festgestellter Zustand derselben Gläser.','abwischbare_auflage','anhaltende_truebung','beides_oder_offen'),
      glasdeklaration:select('Gelesene Angabe am exakten Glas oder in seinen Unterlagen.','spuelmaschinenfest','nur_spuelmaschinengeeignet','keine_oder_offen'),
    },({anleitung_bestaetigt,zustand,glasdeklaration})=>{
      const source=evidence(compact,anleitung_bestaetigt);
      if (!anleitung_bestaetigt||zustand==='beides_oder_offen') return {...source,status:'glasbeleg_offen',haltbarkeitsaussage:null};
      if (zustand==='abwischbare_auflage') return {...source,status:'andere_beobachtung_als_bleibende_truebung',haltbarkeitsaussage:null};
      return {...source,status:glasdeklaration==='nur_spuelmaschinengeeignet'?'langzeitaenderung_laut_anleitung_moeglich':'ursache_aus_beobachtung_offen',
        haltbarkeitsaussage:null,hinweis:'Bosch unterscheidet spülmaschinengeeignet und spülmaschinenfest. Anhaltende Trübung allein belegt keine irreversible Ursache.'};
    },{anleitung_bestaetigt:true,zustand:'anhaltende_truebung',glasdeklaration:'nur_spuelmaschinengeeignet'},
    {status:'langzeitaenderung_laut_anleitung_moeglich',haltbarkeitsaussage:null}),

  pick('spueler_geschirr_material_vor_einraeumen_beleg',
    'Vor dem Einräumen Werkstoff und explizite Geschirrfreigabe beim exakten Modell prüfen — Screen documented dishware and material limitations before loading.',
    {
      modell:anyModel,
      anleitung_bestaetigt:manualMatch,
      material:select('Dokumentierter Werkstoff oder Gegenstand.','holz','holzteile_oder_holzgriff','empfindliches_dekor_antik','kunststoff_nicht_hitzebestaendig','normales_glas_oder_porzellan','anderes_oder_offen'),
      geschirrhersteller:select('Originalangabe für genau dieses Geschirrteil.','geeignet_dokumentiert','nur_handreinigung','kein_passender_beleg'),
    },({modell,anleitung_bestaetigt,material,geschirrhersteller})=>{
      const source=evidence(modell,anleitung_bestaetigt);
      if (!source.modell) return {...source,status:'modellbezug_offen'};
      if (geschirrhersteller==='nur_handreinigung') return {...source,status:'handreinigung_am_geschirr_dokumentiert'};
      if (['holz','empfindliches_dekor_antik','kunststoff_nicht_hitzebestaendig'].includes(material)||modell===miele&&material==='holzteile_oder_holzgriff') return {...source,status:'material_in_geraeteanleitung_ausgeschlossen'};
      if (material==='normales_glas_oder_porzellan'&&geschirrhersteller==='geeignet_dokumentiert') return {...source,status:'geschirrhersteller_nennt_eignung'};
      return {...source,status:'eignung_offen'};
    },{modell:builtIn,anleitung_bestaetigt:true,material:'holz',geschirrhersteller:'kein_passender_beleg'},
    {status:'material_in_geraeteanleitung_ausgeschlossen'}),
];
