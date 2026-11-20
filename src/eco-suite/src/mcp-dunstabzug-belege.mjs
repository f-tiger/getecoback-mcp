const page = '/produkte.html';
const hoodSheet = 'https://media3.bosch-home.com/Documents/specsheet/de-DE/DWB66BC50.pdf';
const hoodMatrix = 'https://media3.bosch-home.com/Documents/25665283_EBG_Handbuch_Linie_2024_2025_150dpi_ePaper.pdf';
const boschKit = 'https://www.bosch-home.com/de/de/product/kochen-backen/kochzubehoer-backzubehoer/dunstabzugshauben/startersets-umluftbetrieb/DWZ1DX1I6';
const boschCarbon = 'https://www.bosch-home.com/de/de/product/kochen-backen/kochzubehoer-backzubehoer/dunstabzugshauben/aktivkohlefilter/DZZ1XX1B6';
const mieleLong = 'https://www.miele.de/product/10271450/regenerierbarer-longlife-airclean-geruchsfilter-dkf-12-r';
const mielePair = 'https://www.miele.de/product/11762660/active-airclean-geruchsfilter-mit-aktivkohle-dkf-16-p';
const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const pick = (description, ...values) => ({type:'string', description, enum:values});
const evidence = description => pick(description, 'belegt', 'ausgeschlossen', 'offen');
const units = description => number(description, 0, 500);
const mm = description => number(description, 0, 4000);
const minutes = description => number(description, 0, 1440);
const months = description => number(description, 0, 180);
const round = value => Math.round(value * 100) / 100;
const listedKits = ['DWZ1DX1I4', 'DWZ1DX1I6', 'DWZ1FX5C6'];
const namedFilters = ['DZZ1XX1B6', 'DKF12-R', 'DKF16-P'];
const checked = '2026-11-20';

function integerCounts(...input) {
  if (!input.every(Number.isInteger)) throw new RangeError('Stückzahlen müssen ganzzahlig sein.');
}
function span(from, to) {
  if (from > to) throw new RangeError('Zeitfolge oder gemeinsamen Bezug prüfen.');
  return to - from;
}
function entry(name, description, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example:{args, expect}};
}

export const dunstabzugBelege = [
  entry('dunstabzug_de_modell_set_filter_belegkette',
    'Kläre beim deutschen Modell, ob ein Starterset oder der Ersatzfilter für ein bereits bestimmtes Set belegt ist — Distinguish a documented recirculation kit from an installed-kit replacement',
    {
      haube:pick('Exakt identifizierte Haube mit deutschem Modellbezug', 'DWB66BC50', 'DA7006_D', 'andere_oder_offen'),
      arbeit:pick('Gesuchte Rolle des Zubehörs', 'erstes_umluftset','ersatz_fuer_bestehendes_set'),
      starterset:pick('In Frage kommendes oder bereits vorhandenes exaktes Set', ...listedKits, 'anderes_oder_offen'),
      filter:pick('In Frage kommender Ersatzfilter', ...namedFilters, 'anderer_oder_offen'),
      exaktes_geraet_am_markt:flag('Vollständige Kennung einschließlich E-Nr-Suffix oder Materialnummer und deutscher Modellbezug stimmen'),
      hersteller_bestaetigt_einzelzuordnung:flag('Genau das Paar aus tatsächlich verwendetem Set und Ersatzfilter ist für diese Haube separat schriftlich bestätigt')
    }, ({haube,arbeit,starterset,filter,exaktes_geraet_am_markt,hersteller_bestaetigt_einzelzuordnung}) => {
      let status = 'modellbeleg_offen';
      if (exaktes_geraet_am_markt && haube === 'DWB66BC50') {
        if (arbeit === 'erstes_umluftset') {
          status = listedKits.includes(starterset) ? 'starterset_in_de_tabelle'
            : filter === 'DZZ1XX1B6' ? 'ersatzfilter_kein_starterset' : 'starterset_offen';
        } else {
          status = filter === 'DZZ1XX1B6' && starterset === 'DWZ1FX5C6' ? 'set_und_ersatz_in_de_tabelle'
            : hersteller_bestaetigt_einzelzuordnung && starterset !== 'anderes_oder_offen' && filter === 'DZZ1XX1B6' ? 'einzelzuordnung_dokumentiert'
              : 'direkte_ersatzzuordnung_offen';
        }
      }
      if (exaktes_geraet_am_markt && haube === 'DA7006_D') {
        status = arbeit === 'ersatz_fuer_bestehendes_set' && filter === 'DKF16-P' ? 'haube_fuer_filterpack_de_genannt'
          : arbeit === 'erstes_umluftset' ? 'starterset_offen' : 'direkte_ersatzzuordnung_offen';
      }
      return {status,
        paar_nicht_in_setliste_bestaetigt:exaktes_geraet_am_markt && haube === 'DWB66BC50' && arbeit === 'ersatz_fuer_bestehendes_set'
          && starterset === 'DWZ1DX1I6' && filter === 'DZZ1XX1B6' && !hersteller_bestaetigt_einzelzuordnung,
        herstellerquelle:haube === 'DWB66BC50' ? hoodMatrix : haube === 'DA7006_D' ? mielePair : null,
        quellen_geprueft:checked,
        grenze:'Gerätezeile und Set-zu-Filter-Tabelle getrennt lesen. Ein fehlender Tabelleneintrag ist keine bestätigte Unverträglichkeit. Keine Montagefreigabe.'};
    }, {haube:'DWB66BC50',arbeit:'ersatz_fuer_bestehendes_set',starterset:'DWZ1DX1I6',filter:'DZZ1XX1B6',exaktes_geraet_am_markt:true,hersteller_bestaetigt_einzelzuordnung:false},
    {status:'direkte_ersatzzuordnung_offen',paar_nicht_in_setliste_bestaetigt:true}),

  entry('dunstabzug_starterset_17004061_paketrolleninventur',
    'Prüfe den Bestand der ausdrücklich genannten Rollen im Bosch-Starterset, bevor ein einzelner Ersatzfilter bestellt wird — Audit the documented contents of Bosch starter kit 17004061',
    {
      set_17004061:flag('Paketkennung DWZ1DX1I6 / 17004061 am Angebot oder vorhandenen Karton bestätigt'),
      halterung:evidence('Filterhalterung im Paket tatsächlich erfasst'),
      kohle:evidence('Clean Air Plus Aktivkohlefilter tatsächlich erfasst'),
      flexschlauch:evidence('Flexschlauch tatsächlich erfasst'),
      schlauchschellen:units('Anzahl tatsächlich erfasster Schlauchschellen'),
      schellen_vollstaendig_gezaehlt:flag('Alle enthaltenen Schellen sind überprüft; 0 ist sonst ein Platzhalter'),
      befestigungsmaterial:evidence('Befestigungsmaterial als Rolle erfasst, ohne Prüfung einer konkreten Montage')
    }, ({set_17004061,halterung,kohle,flexschlauch,schlauchschellen,schellen_vollstaendig_gezaehlt,befestigungsmaterial}) => {
      integerCounts(schlauchschellen);
      const bestand={halterung,kohle,flexschlauch,befestigungsmaterial,schellen:schellen_vollstaendig_gezaehlt
        ? schlauchschellen>=2 ? 'belegt' : 'ausgeschlossen' : 'offen'};
      return {fehlende_rollen:set_17004061 ? Object.keys(bestand).filter(key=>bestand[key]==='ausgeschlossen') : null,
        offene_rollen:set_17004061 ? Object.keys(bestand).filter(key=>bestand[key]==='offen') : null,
        fehlende_schellen_zur_listenzahl:set_17004061 && schellen_vollstaendig_gezaehlt ? Math.max(0,2-schlauchschellen) : null,
        herstellerquelle:boschKit, grenze:'Nur Bestandsprüfung gegen die öffentliche Paketliste. Ein vollständig erfasstes Paket bestätigt keinen Einbau und keine E-Nr-Freigabe.'};
    }, {set_17004061:true,halterung:'belegt',kohle:'belegt',flexschlauch:'offen',schlauchschellen:1,schellen_vollstaendig_gezaehlt:true,befestigungsmaterial:'belegt'},
    {fehlende_rollen:['schellen'],offene_rollen:['flexschlauch'],fehlende_schellen_zur_listenzahl:1}),

  entry('dunstabzug_dwb66bc50_normale_maxstufe_kenndaten',
    'Rufe die belegten Werte der höchsten Normalstufe nur für die passende DWB66BC50-Konfiguration ab — Retrieve model-specific airflow and sound power for a documented operating mode',
    {
      de_modell_dwb66bc50:flag('Deutsche Modellkennung und Ausführung des Gerätedatenblatts bestätigt'),
      modus:pick('Betriebsart dieser Angabe', 'abluft','umluft_clean_air_plus','umluft_standard','umluft_set_unbekannt'),
      stufe:pick('Bezug des verlangten Werts', 'hoechste_normalstufe','andere_stufe','unbekannt'),
      kit_am_geraet_bestaetigt:flag('Bei Umluft wurde die dazugehörige Clean Air Plus Ausstattung am Gerät bestätigt')
    }, ({de_modell_dwb66bc50,modus,stufe,kit_am_geraet_bestaetigt}) => {
      const beleg=de_modell_dwb66bc50 && stufe==='hoechste_normalstufe';
      const abluft=beleg && modus==='abluft';
      const plus=beleg && modus==='umluft_clean_air_plus' && kit_am_geraet_bestaetigt;
      return {volumenstrom_m3_h:abluft ? 621 : plus ? 422 : null,
        schallleistung_dba_re_1pw:abluft ? 69 : plus ? 74 : null,
        herstellerquelle:hoodSheet, quellen_geprueft:checked,
        grenze:'Deklarierte höchste Normalstufe. Keine Übertragung auf Standard-Umluft, andere Stufen, Schlafzimmerpegel oder eine reale Küche.'};
    }, {de_modell_dwb66bc50:true,modus:'umluft_clean_air_plus',stufe:'hoechste_normalstufe',kit_am_geraet_bestaetigt:true},
    {volumenstrom_m3_h:422,schallleistung_dba_re_1pw:74}),

  entry('dunstabzug_gehaeusehoehe_je_betriebsbauform',
    'Vergleiche den dokumentierten Gehäuseraum der genauen DWB66BC50-Variante mit der eigenen Bezugshöhe — Compare the hood outline height for the documented configuration',
    {
      de_modell_dwb66bc50:flag('Deutsche Modellkennung entspricht dem verwendeten Datenblatt'),
      umhuellung:pick('Explizit dokumentierte Zeile der Maßzeichnung', 'abluft','umluft_unspezifiziert','plus_innenkanal','plus_aussenkanal','offen'),
      freie_hoehe_mm:mm('Verfügbare freie Höhe am gleichen oberen und unteren Gehäusebezug wie in der gewählten Zeile'),
      gleicher_bezug:flag('Maßrichtung, Gehäusegrenzen und Konfiguration eindeutig zugeordnet')
    }, ({de_modell_dwb66bc50,umhuellung,freie_hoehe_mm,gleicher_bezug}) => {
      const grenzen={abluft:[635,965],umluft_unspezifiziert:[635,1075],plus_innenkanal:[833,1163],plus_aussenkanal:[703,703]}[umhuellung];
      const regel=de_modell_dwb66bc50 && gleicher_bezug && grenzen;
      return {referenzbereich_hoehe_mm:regel ? grenzen : null,
        reserve_zum_unteren_rand_mm:regel ? round(freie_hoehe_mm-grenzen[0]) : null,
        breite_und_tiefe_mm:regel ? [600,500] : null,
        herstellerquelle:hoodSheet,
        grenze:'Äußere Gerätemaße, ohne Arbeits-, Sicherheits- oder Serviceabstände. Generische Umluft-Zeile benennt kein konkretes Set.'};
    }, {de_modell_dwb66bc50:true,umhuellung:'plus_innenkanal',freie_hoehe_mm:810,gleicher_bezug:true},
    {referenzbereich_hoehe_mm:[833,1163],reserve_zum_unteren_rand_mm:-23,breite_und_tiefe_mm:[600,500]}),

  entry('dunstabzug_metall_kohle_pflegeauftrag_abgrenzen',
    'Ordne einen belegten Geschirrspülerhinweis nur dem tatsächlich benannten Metallfettfilter zu — Keep grease-filter dishwasher evidence separate from carbon-filter care',
    {
      de_modell_dwb66bc50:flag('Deutsches Bosch-Datenblatt DWB66BC50 gehört zur Haube'),
      beobachtetes_teil:pick('Welches Teil soll im Pflegeplan erscheinen?', 'metallfettfilter','aktivkohlefilter','beide','offen'),
      teil_material_belegt:flag('Genaue Baugruppe und Filterart lassen sich vor Ort eindeutig unterscheiden')
    }, ({de_modell_dwb66bc50,beobachtetes_teil,teil_material_belegt}) => {
      const scope=de_modell_dwb66bc50 && teil_material_belegt;
      return {spuelmaschinenhinweis:!scope ? 'modell_und_teil_offen' : beobachtetes_teil==='metallfettfilter' ? 'metallfettfilter_de_genannt'
        : beobachtetes_teil==='beide' ? 'nur_metallfettfilter_genannt' : 'fuer_dieses_teil_nicht_bestaetigt',
        herstellerquelle:hoodSheet, grenze:'Zulässigkeit einzelner Teile und Behandlung des Kohlefilters immer mit der genauen Anleitung abgleichen. Keine Pflegeanleitung.'};
    }, {de_modell_dwb66bc50:true,beobachtetes_teil:'beide',teil_material_belegt:true},
    {spuelmaschinenhinweis:'nur_metallfettfilter_genannt'}),

  entry('dunstabzug_aktivkohle_tausch_zeitband_hersteller',
    'Prüfe, ob ein beobachteter Wechsel innerhalb, vor oder nach der dokumentierten Zeitangabe des exakten Filters liegt — Classify a recorded exchange against the exact filter’s published guidance',
    {
      filter:pick('Identität des betrachteten geöffneten oder benutzten Ersatzfilters', 'DZZ1XX1B6','DKF16-P','offen'),
      alter_beim_tausch_monate:months('Beobachtetes Alter seit belegtem Einsetzen bis zum tatsächlichen Wechsel'),
      einbau_und_teil_bestaetigt:flag('Genauer Filter, Markt und Einbauzeit sind für denselben Einsatz belegt')
    }, ({filter,alter_beim_tausch_monate,einbau_und_teil_bestaetigt}) => {
      const ref=filter==='DZZ1XX1B6' ? [12,18] : filter==='DKF16-P' ? [6,6] : null;
      return {hersteller_zeitangabe_monate:ref,
        lage_zur_zeitangabe:!ref || !einbau_und_teil_bestaetigt ? 'offen' :
          alter_beim_tausch_monate<ref[0] ? 'davor' : alter_beim_tausch_monate>ref[1] ? 'danach' : 'im_zeitbezug',
        art_der_angabe:filter==='DZZ1XX1B6' ? 'angegebene_lebensdauer' : filter==='DKF16-P' ? 'empfohlener_wechselabstand' : 'offen',
        herstellerquelle:filter==='DZZ1XX1B6' ? boschCarbon : filter==='DKF16-P' ? mielePair : null,
        grenze:'Zeitangabe ist kein individueller Zustandswert. Modell, Nutzung und Herstellerpflege getrennt berücksichtigen.'};
    }, {filter:'DKF16-P',alter_beim_tausch_monate:7,einbau_und_teil_bestaetigt:true},
    {hersteller_zeitangabe_monate:[6,6],lage_zur_zeitangabe:'danach',art_der_angabe:'empfohlener_wechselabstand'}),

  entry('dunstabzug_dkf12r_regeneration_und_gesamtalter',
    'Führe beim DKF 12-R Regenerationsabstand und Gesamtalter getrennt weiter — Keep regeneration timing separate from total service age for DKF 12-R',
    {
      materialnummer_10271450:flag('Exakter Miele DKF 12-R, Materialnummer 10271450, bestätigt'),
      einbau_monat:months('Monat der Erstinbetriebnahme im eigenen fortlaufenden Zeitraum'),
      regeneration_monat:months('Monat der zuletzt dokumentierten Regeneration, bei keiner wie Erstinbetriebnahme'),
      auswertung_monat:months('Auswertungszeitpunkt auf derselben Zeitskala'),
      zeiten_und_teil_bestaetigt:flag('Alle Zeitangaben gehören zu demselben physischen Filter')
    }, ({materialnummer_10271450,einbau_monat,regeneration_monat,auswertung_monat,zeiten_und_teil_bestaetigt}) => {
      span(einbau_monat,regeneration_monat);
      const seitRegeneration=span(regeneration_monat,auswertung_monat);
      const gesamt=auswertung_monat-einbau_monat;
      const belegt=materialnummer_10271450 && zeiten_und_teil_bestaetigt;
      return {seit_letzter_regeneration_monate:belegt ? round(seitRegeneration) : null,
        laufzeit_gesamt_monate:belegt ? round(gesamt) : null,
        halbjahresabstand_erreicht:belegt ? seitRegeneration>=6 : null,
        angegebene_gesamtzeit_erreicht:belegt ? gesamt>=36 : null,
        herstellerquelle:mieleLong, grenze:'Die Herstellerseite nennt halbjährliche Regeneration und drei Jahre Lebensdauer. Die letzte Regeneration setzt das Gesamtalter nicht zurück.'};
    }, {materialnummer_10271450:true,einbau_monat:0,regeneration_monat:33,auswertung_monat:37,zeiten_und_teil_bestaetigt:true},
    {seit_letzter_regeneration_monate:4,laufzeit_gesamt_monate:37,halbjahresabstand_erreicht:false,angegebene_gesamtzeit_erreicht:true}),

  entry('dunstabzug_dkf16p_zweierpack_einsatznachweis',
    'Trenne eine dokumentierte Packung für die DA 7006 D von einem einzeln aufgefundenen DKF 12-P — Verify the documented two-piece DKF 16-P pack before counting a complete replacement',
    {
      da7006_d_belegt:flag('Haube ist als Miele DA 7006 D bestätigt'),
      beleg_material_11762660:flag('Paket zeigt DKF 16-P / Materialnummer 11762660'),
      dkf12p_eindeutig_gefunden:units('Tatsächlich als DKF 12-P identifizierte Filter aus dieser Packung'),
      ungepruefte_teile:units('Weitere Filter in derselben Packung, deren genaue Kennung noch offen ist')
    }, ({da7006_d_belegt,beleg_material_11762660,dkf12p_eindeutig_gefunden,ungepruefte_teile}) => {
      integerCounts(dkf12p_eindeutig_gefunden,ungepruefte_teile);
      const bezug=da7006_d_belegt && beleg_material_11762660;
      return {vom_hersteller_genannter_packinhalt:bezug ? 2 : null,
        packung_abweichung_oder_offen:!bezug ? 'bezug_offen' : dkf12p_eindeutig_gefunden>2 || dkf12p_eindeutig_gefunden+ungepruefte_teile>2 ? 'zu_viele_teile_zugeordnet'
          : dkf12p_eindeutig_gefunden===2 ? 'zwei_identifizierte_filter'
            : ungepruefte_teile ? 'vorhandene_kennungen_pruefen' : 'stueckzahl_unter_packangabe',
        herstellerquelle:mielePair, grenze:'Prüft Verpackungsinhalt. Anzahl der vor Ort einzusetzenden Teile und Gerätekennung anhand der separaten Anleitung prüfen.'};
    }, {da7006_d_belegt:true,beleg_material_11762660:true,dkf12p_eindeutig_gefunden:1,ungepruefte_teile:1},
    {vom_hersteller_genannter_packinhalt:2,packung_abweichung_oder_offen:'vorhandene_kennungen_pruefen'}),

  entry('dunstabzug_abgelesene_kennziffern_set_oder_filter',
    'Prüfe bei zwei ähnlich bezeichneten Bosch-Artikeln, ob Angebot und vorhandene Packung die gleiche Zubehörrolle haben — Detect a Bosch listing that swaps the starter and replacement article identities',
    {
      kennung_a:pick('Erste direkt gelesene Bestell- oder Materialnummer', 'DWZ1DX1I6','17004061','DZZ1XX1B6','17004083','DSZ5201','offen'),
      kennung_b:pick('Zweite direkt gelesene Bestell- oder Materialnummer', 'DWZ1DX1I6','17004061','DZZ1XX1B6','17004083','DSZ5201','offen'),
      deutsch_quellmarkt:flag('Beide Kennungen stammen aus dem deutschen Artikelbezug')
    }, ({kennung_a,kennung_b,deutsch_quellmarkt}) => {
      const ids={DWZ1DX1I6:'starterset',17004061:'starterset',DZZ1XX1B6:'ersatzfilter',17004083:'ersatzfilter',DSZ5201:'aeltere_referenz'};
      const a=ids[kennung_a];
      const b=ids[kennung_b];
      const eindeutig=Boolean(deutsch_quellmarkt && a && b);
      return {rollen:eindeutig ? [a,b] : null,
        alter_ersatzverweis:eindeutig && [a,b].includes('aeltere_referenz') && [a,b].includes('ersatzfilter'),
        haendlerangaben_unterschiedliche_rollen:eindeutig && a!=='aeltere_referenz' && b!=='aeltere_referenz' ? a!==b : null,
        herstellerquellen:[boschKit,boschCarbon],
        grenze:'Nummernidentität und Ersatzverweis sind keine Kompatibilitätsprüfung einer Haube oder eines Filtersitzes.'};
    }, {kennung_a:'17004061',kennung_b:'17004083',deutsch_quellmarkt:true},
    {rollen:['starterset','ersatzfilter'],alter_ersatzverweis:false,haendlerangaben_unterschiedliche_rollen:true}),

  entry('dunstabzug_b_label_zwei_unterschiedliche_bezuege',
    'Prüfe, auf welche Kennzahl ein beim DWB66BC50 verwendeter Buchstabe tatsächlich bezogen ist — Disambiguate the hood energy, fan, lighting and grease classes',
    {
      exakt_de_dwb66bc50:flag('Deutsche DWB66BC50-Dokumentation gehört zur betrachteten Haube'),
      behaupteter_buchstabe:pick('Abgelesener Buchstabe', 'A','B','C','D','offen'),
      genannter_bezug:pick('Der Buchstabe wird in der vorliegenden Aussage für Folgendes verwendet', 'energie','fettfilter','luefter','beleuchtung','offen')
    }, ({exakt_de_dwb66bc50,behaupteter_buchstabe,genannter_bezug}) => {
      const kennwerte={energie:'B',fettfilter:'B',luefter:'A',beleuchtung:'A'};
      const bezug=exakt_de_dwb66bc50 ? kennwerte[genannter_bezug] ?? null : null;
      return {dokumentierter_buchstabe_fuer_bezug:bezug,
        andere_im_datenblatt_gleich_bezeichnet:exakt_de_dwb66bc50 && behaupteter_buchstabe!=='offen'
          ? Object.keys(kennwerte).filter(key=>kennwerte[key]===behaupteter_buchstabe && key!==genannter_bezug) : null,
        behaupteter_wert_stimmt:bezug && behaupteter_buchstabe!=='offen' ? behaupteter_buchstabe===bezug : null,
        herstellerquelle:hoodSheet, grenze:'Klassen beschreiben unterschiedliche Prüfkennzahlen. Ein gleicher Buchstabe macht sie nicht vergleichbar.'};
    }, {exakt_de_dwb66bc50:true,behaupteter_buchstabe:'B',genannter_bezug:'energie'},
    {dokumentierter_buchstabe_fuer_bezug:'B',andere_im_datenblatt_gleich_bezeichnet:['fettfilter'],behaupteter_wert_stimmt:true}),

  entry('dunstabzug_umluft_und_fensterprogramm_zuordnung',
    'Trenne einen gemessenen oder angegebenen Umluftstrom der Haube vom getrennt nachgewiesenen Außenbezug — Keep cooker-hood recirculation apart from independently documented outdoor airflow',
    {
      haubenmodus:pick('Vorgang laut eigener Beobachtung oder Modellunterlage', 'umluft','abluft','offen'),
      haubenwert_m3_h:number('Für diese Betriebsart dokumentierter Haubenwert in m³/h',0,4000),
      aussen_zusatz_m3_h:number('Separat belegter, zeitgleich beobachteter Außenluftvolumenstrom in m³/h',0,4000),
      aussen_zusatz_belegt:flag('Separater Außenweg, gleiche Bezugszeit und keine Doppelzählung bestätigt')
    }, ({haubenmodus,haubenwert_m3_h,aussen_zusatz_m3_h,aussen_zusatz_belegt}) => ({
      haubenwert_als_umluft_m3_h:haubenmodus==='umluft' ? haubenwert_m3_h : null,
      separat_beobachteter_aussenstrom_m3_h:aussen_zusatz_belegt ? aussen_zusatz_m3_h : null,
      grenze:'Hauben-Abluft ist kein gemessener Zuluftwert. Umluftwert und Außenbezug nicht zu einer Frischluftmenge addieren. Kein Lüftungsnachweis.'
    }), {haubenmodus:'umluft',haubenwert_m3_h:422,aussen_zusatz_m3_h:0,aussen_zusatz_belegt:false},
    {haubenwert_als_umluft_m3_h:422,separat_beobachteter_aussenstrom_m3_h:null}),

  entry('dunstabzug_geruchsprobe_kueche_nachbarraum_gemeinsame_basis',
    'Prüfe, ob eine lokale Geruchsbeobachtung auch im angrenzenden Raum nachgewiesen ist — Compare kitchen and adjacent-room odor observations under matched cooking conditions',
    {
      kueche_a:number('Eigene Geruchseinstufung vor Änderung in der Küche, Skala 0 bis 5',0,5),
      nebenraum_a:number('Zeitgleiche Einstufung am zweiten Ort vor Änderung',0,5),
      kueche_b:number('Einstufung am gleichen Küchenort bei der getrennten Nachprobe',0,5),
      nebenraum_b:number('Zeitgleiche Einstufung am gleichen zweiten Ort bei der Nachprobe',0,5),
      koch_und_tuerzustand_vergleichbar:flag('Gleiche Art der Kochaufgabe, ähnliche Startbedingungen, gleiche Zeitbezüge und Türen')
    }, ({kueche_a,nebenraum_a,kueche_b,nebenraum_b,koch_und_tuerzustand_vergleichbar}) => {
      const deltas={kueche:round(kueche_b-kueche_a),nebenraum:round(nebenraum_b-nebenraum_a)};
      return {eigene_skalenveraenderung:koch_und_tuerzustand_vergleichbar ? deltas : null,
        nur_kueche_niedriger:koch_und_tuerzustand_vergleichbar ? deltas.kueche<0 && deltas.nebenraum>=0 : null,
        grenze:'Sinneseindruck aus dem eigenen Ablauf. Daraus weder Schadstoffkonzentration noch die Wirkung auf Feuchte oder Luftaustausch ableiten.'};
    }, {kueche_a:4,nebenraum_a:2,kueche_b:2,nebenraum_b:2,koch_und_tuerzustand_vergleichbar:true},
    {eigene_skalenveraenderung:{kueche:-2,nebenraum:0},nur_kueche_niedriger:true}),

  entry('dunstabzug_licht_probe_kochfeld_ecken_unterschied',
    'Prüfe, ob ein eigener Lichtzielwert an beiden Kochfeldpositionen im gleichen Aufbau erreicht wurde — Compare measured illumination at two hood work positions',
    {
      de_modell_bestaetigt:flag('Deutscher DWB66BC50 Datenblattbezug bestätigt'),
      vorne_gemessen_lux:number('Eigene Messung vorne am dokumentierten Arbeitsbereich in Lux',0,100000),
      hinten_gemessen_lux:number('Eigene Messung hinten am dokumentierten Arbeitsbereich in Lux',0,100000),
      eigener_min_lux:number('Selbst gesetzter Vergleichswert für denselben Arbeitsbereich',0,100000),
      beleuchtung_und_sensor_gleich:flag('Sensororientierung, Raumlicht und Haubenlicht für beide Ortsablesungen dokumentiert')
    }, ({de_modell_bestaetigt,vorne_gemessen_lux,hinten_gemessen_lux,eigener_min_lux,beleuchtung_und_sensor_gleich}) => ({
      herstellerreferenz_lux:de_modell_bestaetigt ? 99 : null,
      unter_eigenem_ziel:beleuchtung_und_sensor_gleich
        ? [vorne_gemessen_lux<eigener_min_lux&&'vorne',hinten_gemessen_lux<eigener_min_lux&&'hinten'].filter(Boolean) : null,
      herstellerquelle:hoodSheet,
      grenze:'99 Lux aus dem Gerätedatenblatt sind keine Messung an deinem Kochfeld. Eigenes Ziel ist kein Normwert.'
    }), {de_modell_bestaetigt:true,vorne_gemessen_lux:109,hinten_gemessen_lux:83,eigener_min_lux:90,beleuchtung_und_sensor_gleich:true},
    {herstellerreferenz_lux:99,unter_eigenem_ziel:['hinten']}),

  entry('dunstabzug_filterzugriff_ansicht_nach_position',
    'Trenne sichtbaren Metallfilter und tatsächlich dokumentierten Zugang zum Geruchsfilter des verwendeten Sets — Separate visible grease-filter access from confirmed odor-filter access',
    {
      metall_zugriff:evidence('Metallfettfilter ist vom vorgesehenen Bedienort in der dokumentierten Benutzerpflege erreichbar'),
      kohle_fundort:pick('Geruchsfilter am tatsächlich verbauten Set laut Unterlagen', 'im_kamin','auf_kamin','hinter_metallfilter','offen'),
      kohle_zugriff:evidence('Zugriff im dokumentierten Benutzerablauf an dieser Aufstellung ohne Umbau bestätigt'),
      nur_sichtmetall_pruefung:flag('Vorhandene Sichtkontrolle zeigte nur die Metallfilterunterseite')
    }, ({metall_zugriff,kohle_fundort,kohle_zugriff,nur_sichtmetall_pruefung}) => ({
      bekannte_pflegezugriffe:{metall:metall_zugriff,kohle:kohle_fundort!=='offen' ? kohle_zugriff:'offen'},
      deckt_metallfoto_kohle_ab:nur_sichtmetall_pruefung ? false : null,
      herstellerquelle:hoodMatrix,
      grenze:'Die dokumentierte Position hängt vom verwendeten Set ab. Ein Foto der Unterseite klärt keinen Zugang zu einem getrennten Kohlefilter.'
    }), {metall_zugriff:'belegt',kohle_fundort:'im_kamin',kohle_zugriff:'offen',nur_sichtmetall_pruefung:true},
    {bekannte_pflegezugriffe:{metall:'belegt',kohle:'offen'},deckt_metallfoto_kohle_ab:false}),

  entry('dunstabzug_kohlefilter_beleg_alter_zwischen_belegen',
    'Grenze das Alter eines benutzten Filters ein, wenn der Einbau nur zwischen zwei Belegen datiert ist — Bound active filter age when the original fitting date is uncertain',
    {
      fruehester_einbau_monat:months('Frühester durch alte Aufzeichnung gestützter Einbaumonat'),
      spaetester_einbau_monat:months('Spätester durch spätere Aufzeichnung gestützter Einbaumonat'),
      auswertung_monat:months('Auswertung auf identischer Zeitskala'),
      erster_geplanter_pruefabstand_monate:months('Eigener nächster Kontrollabstand seit Einbau für das genaue Produkt'),
      physisch_gleicher_filter:flag('Die Zeitgrenzen und die aktuelle Sichtung gehören zum selben physischen Filter')
    }, ({fruehester_einbau_monat,spaetester_einbau_monat,auswertung_monat,erster_geplanter_pruefabstand_monate,physisch_gleicher_filter}) => {
      span(fruehester_einbau_monat,spaetester_einbau_monat);
      const min=span(spaetester_einbau_monat,auswertung_monat);
      const max=auswertung_monat-fruehester_einbau_monat;
      return {alter_monate:physisch_gleicher_filter ? [round(min),round(max)] : null,
        kontrollzeitlage:!physisch_gleicher_filter ? 'offen' : min>=erster_geplanter_pruefabstand_monate ? 'in_beiden_faellen_erreicht'
          : max>=erster_geplanter_pruefabstand_monate ? 'abhaengig_vom_einbau' : 'noch_nicht_erreicht',
        grenze:'Zeitbelege ersetzen keine Zustandsprüfung. Karton- und Bestelldatum allein belegen keinen Einbau.'};
    }, {fruehester_einbau_monat:3,spaetester_einbau_monat:7,auswertung_monat:17,erster_geplanter_pruefabstand_monate:12,physisch_gleicher_filter:true},
    {alter_monate:[10,14],kontrollzeitlage:'abhaengig_vom_einbau'}),

  entry('dunstabzug_geruchsprobe_spitze_dauer_entscheidung',
    'Erkenne, ob die schwächere Geruchsspitze in der eigenen Nachprobe mit einer längeren Beobachtungszeit einherging — Distinguish odor intensity from persistence in a matched kitchen trial',
    {
      vor_spitze:number('Eigene höchste beobachtete Einstufung vor Änderung auf der Skala 0 bis 5',0,5),
      nach_spitze:number('Entsprechend höchste beobachtete Einstufung nach Änderung',0,5),
      vor_dauer_min:minutes('Minuten mit belegter Geruchswahrnehmung im ersten vollständigen Fenster'),
      nach_dauer_min:minutes('Entsprechende Minuten in der vollständigen Nachprobe'),
      gleiche_skala_und_dauer:flag('Gleiche Einstufung, Kochaufgabe, Umgebung und vollständige Fensterdauer bestätigt')
    }, ({vor_spitze,nach_spitze,vor_dauer_min,nach_dauer_min,gleiche_skala_und_dauer}) => ({
      spitzen_delta_eigene_skala:gleiche_skala_und_dauer ? round(nach_spitze-vor_spitze) : null,
      wahrnehmungsdauer_delta_min:gleiche_skala_und_dauer ? round(nach_dauer_min-vor_dauer_min) : null,
      geringere_spitze_aber_laenger:gleiche_skala_und_dauer ? nach_spitze<vor_spitze && nach_dauer_min>vor_dauer_min : null,
      grenze:'Wahrnehmung und Dauer sind verschiedene Größen. Sie erlauben keine Aussage über Luftqualität oder Filterwirkung.'
    }), {vor_spitze:4,nach_spitze:2,vor_dauer_min:12,nach_dauer_min:19,gleiche_skala_und_dauer:true},
    {spitzen_delta_eigene_skala:-2,wahrnehmungsdauer_delta_min:7,geringere_spitze_aber_laenger:true}),


  entry('dunstabzug_pflegeangebot_filterpaket_und_arbeitsumfang',
    'Vergleiche, ob ein tatsächliches Serviceangebot die benötigte Material- und Pflegeaufgabe vollständig enthält — Identify scope gaps in a hood maintenance quote',
    {
      gebraucht:pick('Bestätigte gewünschte Aufgabe', 'nur_material','nur_pflege','material_und_pflege'),
      filter_material:evidence('Exakt zugeordneter Geruchsfilter als Materialposition im vorliegenden Angebot'),
      pflegeschritt:evidence('Gewünschte Pflegeaufgabe am passenden Gerät schriftlich enthalten'),
      angebot_gehoert_zum_geraet:flag('Identische Haube und tatsächliche Setvariante werden im Angebot genannt')
    }, ({gebraucht,filter_material,pflegeschritt,angebot_gehoert_zum_geraet}) => {
      const bedarf={nur_material:{filter_material},nur_pflege:{pflegeschritt},material_und_pflege:{filter_material,pflegeschritt}}[gebraucht];
      return {geklaerte_aufgaben:angebot_gehoert_zum_geraet ? Object.keys(bedarf).filter(key=>bedarf[key]==='belegt') : null,
        offen_im_angebot:angebot_gehoert_zum_geraet ? Object.keys(bedarf).filter(key=>bedarf[key]!=='belegt') : null,
        grenze:'Schriftlicher Angebotsumfang. Keine Empfehlung, Arbeiten selbst auszuführen oder nicht ausdrücklich bestätigte Zubehörteile zu bestellen.'};
    }, {gebraucht:'material_und_pflege',filter_material:'belegt',pflegeschritt:'offen',angebot_gehoert_zum_geraet:true},
    {geklaerte_aufgaben:['filter_material'],offen_im_angebot:['pflegeschritt']}),
];
