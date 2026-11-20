const page = '/guide/strom-sparen-haushalt.html';
const number = (description,minimum=0,maximum=1000000) => ({type:'number',minimum,maximum,description});
const yes = description => ({type:'boolean',description});
const select = (description,...values) => ({type:'string',enum:values,description});
const status = description => select(description,'ja','nein','offen');
const sourceScope = description => select(description,'kugel_360','kegel_120','kegel_90','offen');
const round = value => Math.round(value*10000)/10000;

function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Anzahlen erforderlich.');
}
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const ledkauf = [
  tool('led_ersatzfassung_schnittstelle_geraetehuelle',
    'Sockel, dokumentierte Versorgung und äußere Lampenmaße eines LED-Ersatzes gemeinsam prüfen — Screen a household replacement against the existing fixture specifications.',
    {
      sockel:status('Stimmen die ausdrücklich dokumentierten Sockelkennungen überein?'),
      versorgung:status('Stimmen die angegebenen Versorgungsdaten laut den Modellunterlagen überein?'),
      lampe_laenge_mm:number('Gesamtlänge der Lampe an der dokumentierten Bezugsfläche.',0.01,1000),
      lampe_durchmesser_mm:number('Größter angegebener Lampendurchmesser.',0.01,1000),
      fassung_laenge_max_mm:number('Dokumentierte maximal verfügbare Länge in derselben Bezugslage.',0.01,1000),
      fassung_durchmesser_max_mm:number('Dokumentierter größter vorgesehener Lampendurchmesser.',0.01,1000),
      achsen_bestaetigt:yes('Sind Referenzkanten, Gehäuseform und gerätespezifisches Datenblatt für dieselbe Kombination geklärt?'),
    },({sockel,versorgung,lampe_laenge_mm,lampe_durchmesser_mm,fassung_laenge_max_mm,fassung_durchmesser_max_mm,achsen_bestaetigt})=>{
      const length=fassung_laenge_max_mm-lampe_laenge_mm;
      const diameter=fassung_durchmesser_max_mm-lampe_durchmesser_mm;
      const excluded=sockel==='nein'||versorgung==='nein'||achsen_bestaetigt&&Math.min(length,diameter)<0;
      return {status:excluded?'dokumentiertes_merkmal_weicht_ab':sockel==='offen'||versorgung==='offen'||!achsen_bestaetigt?'einzelbeleg_offen':'dokumentwerte_stimmen_ueberein',
        laengenreserve_mm:achsen_bestaetigt?round(length):null,durchmesserreserve_mm:achsen_bestaetigt?round(diameter):null,
        hinweis:'Datenvergleich ohne Anschluss-, Wärme- oder Einbaufreigabe. Für ein bestehendes Gehäuse gelten die Geräteunterlagen.'};
    },{sockel:'ja',versorgung:'ja',lampe_laenge_mm:52,lampe_durchmesser_mm:50,fassung_laenge_max_mm:56,fassung_durchmesser_max_mm:48,achsen_bestaetigt:true},
    {status:'dokumentiertes_merkmal_weicht_ab',laengenreserve_mm:4,durchmesserreserve_mm:-2}),

  tool('led_leuchte_austauschpiktogramm_lichtquelle_betriebsgeraet',
    'Herstellerzeichen zur Austauschbarkeit von Lichtquelle und Betriebsgerät getrennt lesen — Separate the declared user or professional replacement routes for both parts.',
    {
      lichtquelle:select('Rolle laut Angabe ausschließlich für die eingebaute Lichtquelle.','endnutzer','qualifizierte_person','nicht_austauschbar','offen'),
      betriebsgeraet:select('Rolle laut Angabe ausschließlich für das Betriebsgerät.','endnutzer','qualifizierte_person','nicht_austauschbar','kein_separates_belegt','offen'),
      dokumentkonflikt:yes('Widersprechen sich Verpackung und Anleitung bei derselben Modellvariante?'),
      genaue_leuchte_bestaetigt:yes('Piktogramm/Anleitung betreffen die vollständige exakte Leuchte?'),
    },({lichtquelle,betriebsgeraet,dokumentkonflikt,genaue_leuchte_bestaetigt})=>{
      if (!genaue_leuchte_bestaetigt||dokumentkonflikt) return {status:dokumentkonflikt?'konflikt_klaeren':'modellbezug_offen',lichtquelle:null,betriebsgeraet:null};
      return {status:'komponenten_getrennt_gelesen',lichtquelle:lichtquelle==='offen'?null:lichtquelle,
        betriebsgeraet:betriebsgeraet==='offen'?null:betriebsgeraet,
        hinweis:'Aus einer austauschbaren Lichtquelle folgt kein austauschbares Betriebsgerät. Keine Öffnungs- oder Anschlussanleitung.'};
    },{lichtquelle:'endnutzer',betriebsgeraet:'qualifizierte_person',dokumentkonflikt:false,genaue_leuchte_bestaetigt:true},
    {status:'komponenten_getrennt_gelesen',lichtquelle:'endnutzer',betriebsgeraet:'qualifizierte_person'}),

  tool('led_eu_label_lichtquelle_umgebendes_produkt',
    'Die Energieklasse einer Lichtquelle dem richtigen Gegenstand zuordnen, wenn Leuchte und Lichtquelle zusammen verkauft werden — Classify the label scope before comparing packaged offers.',
    {
      angebot:select('Belegter Angebotsumfang.','einzelne_verpackte_lichtquelle','produkt_mit_lichtquelle','offen'),
      klassifizierung:select('Was ist laut exakt zugeordneter Dokumentation als Lichtquelle ausgewiesen?','enthaltene_quelle','ganzes_produkt_als_lichtquelle','offen'),
      label_kennungsbezug:yes('Das konkrete Label/Produktdatenblatt lässt sich dem ausgewiesenen Gegenstand eindeutig zuordnen?'),
    },({angebot,klassifizierung,label_kennungsbezug})=>{
      if (angebot==='offen'||!label_kennungsbezug) return {etikett_bezieht_sich_auf:null,status:'kennungsbezug_offen'};
      const scope=angebot==='einzelne_verpackte_lichtquelle'?'einzelne_lichtquelle':klassifizierung==='offen'?null:klassifizierung;
      return {etikett_bezieht_sich_auf:scope,status:scope?'bezugsgegenstand_belegt':'produktklasse_offen',
        hinweis:'Die Kennzeichnung einer enthaltenen Lichtquelle ist keine gemeinsame Effizienzklasse aller Funktionen ihrer Leuchte.'};
    },{angebot:'produkt_mit_lichtquelle',klassifizierung:'enthaltene_quelle',label_kennungsbezug:true},
    {etikett_bezieht_sich_auf:'enthaltene_quelle',status:'bezugsgegenstand_belegt'}),

  tool('led_eprel_qr_modellbeleg_verpackung',
    'Einen gelesenen QR-Verweis mit der Modellkennung auf der Verpackung abgleichen — Check the EPREL destination and model identity, not the mere presence of a QR code.',
    {
      qr_ziel:select('Vorliegendes Ziel des gedruckten Codes.','eprel_modell','anbieter_oder_katalog','anderes','nicht_aufgeloest'),
      marke:status('Stimmt der Anbieter im gelesenen Datensatz mit dem Label überein?'),
      modell:status('Stimmt die vollständige Modellkennung einschließlich Zusätzen überein?'),
      datenblatt_zur_packung:yes('Wurde die Zuordnung für diese konkrete Verpackung und denselben Markt belegt?'),
    },({qr_ziel,marke,modell,datenblatt_zur_packung})=>{
      if (qr_ziel!=='eprel_modell') return {status:qr_ziel==='nicht_aufgeloest'?'qr_ziel_offen':'kein_eprel_modellbeleg'};
      return {status:marke==='nein'||modell==='nein'?'abweichende_kennung':marke==='ja'&&modell==='ja'&&datenblatt_zur_packung?'eprel_zuordnung_belegt':'modellbezug_offen',
        hinweis:'Ein übereinstimmender Datenbankeintrag ist kein Sockel-, Dimmer- oder Verfügbarkeitsnachweis.'};
    },{qr_ziel:'eprel_modell',marke:'ja',modell:'nein',datenblatt_zur_packung:true},
    {status:'abweichende_kennung'}),

  tool('ledvance_par16_4099854059810_zwei_modellkennungen',
    'Die zwei dokumentierten Revisionen derselben deutschen LEDVANCE-PAR16-Faltschachtel anhand der vollständigen Modellkennung trennen — Disambiguate the two variants published for one exact retail GTIN.',
    {
      gtin:select('Vollständige bereits belegte GTIN der Faltschachtel.','4099854059810','andere','offen'),
      modell:select('Vollständige Kennung aus dem exakten Label/Herstellerbeleg. Leerzeichen bei AC-Kennungen weglassen.','AC45730','AC58031','andere','offen'),
      markt_de:yes('Ist die deutsche Herstellerseite die passende Quelle?'),
    },({gtin,modell,markt_de})=>{
      if (gtin!=='4099854059810'||!markt_de) return {status:'andere_packung_oder_markt_offen',bestaetigte_modellkennung:null};
      const candidates=['AC45730','AC58031'];
      const confirmed=candidates.includes(modell);
      return {status:confirmed?'modellkennung_zugeordnet':modell==='offen'?'gtin_allein_mehrdeutig':'modellkennung_nicht_in_dieser_liste',
        bestaetigte_modellkennung:confirmed?modell:null,hersteller_kandidaten:candidates,
        hinweis:'Die GTIN ist hier keine eindeutige Revision. EPREL-ID und Dimmerbeleg für die einzelne Modellkennung separat prüfen.'};
    },{gtin:'4099854059810',modell:'offen',markt_de:true},
    {status:'gtin_allein_mehrdeutig',bestaetigte_modellkennung:null,hersteller_kandidaten:['AC45730','AC58031']}),

  tool('led_halbwertswinkel_nutzlichtstrom_messkegel_90_120_360',
    'Den dokumentierten Halbwertswinkel vom Messkegel für den Nutzlichtstrom unterscheiden — Interpret the 90°, 120° and 360° flux reporting scopes without confusing them with beam width.',
    {
      lichttyp:select('Dokumentierte Lichtquellenklasse.','gebuendelt','ungebuendelt','offen'),
      groesster_winkel_grad:number('Größter Halbwertswinkel der Ebenen in der dokumentierten Referenzeinstellung. Für ungebündelt 0 eingeben.',0,180),
      aufdruck:sourceScope('Tatsächlich gelesener Bezugsraum für den Nutzlichtstrom.'),
      quelle_und_einstellung_bestaetigt:yes('Lichtquellentyp, exaktes Modell und Referenzeinstellung sind nachvollziehbar belegt?'),
    },({lichttyp,groesster_winkel_grad,aufdruck,quelle_und_einstellung_bestaetigt})=>{
      if (!quelle_und_einstellung_bestaetigt||lichttyp==='offen'||lichttyp==='gebuendelt'&&!groesster_winkel_grad) return {dokumentarische_referenz:null,aufdruck_abgleich:null};
      const expected=lichttyp==='ungebuendelt'?'kugel_360':groesster_winkel_grad>=90?'kegel_120':'kegel_90';
      return {dokumentarische_referenz:expected,aufdruck_abgleich:aufdruck==='offen'?null:expected===aufdruck,
        hinweis:'Regelbezug für den Nutzlichtstrom, keine Behauptung zur Lichtverteilung im Raum. Bei einstellbarem Winkel die dokumentierte Referenzeinstellung verwenden.'};
    },{lichttyp:'gebuendelt',groesster_winkel_grad:36,aufdruck:'kegel_90',quelle_und_einstellung_bestaetigt:true},
    {dokumentarische_referenz:'kegel_90',aufdruck_abgleich:true}),

  tool('led_lumen_candela_lux_bezugsraum_vergleichen',
    'Zwei Lichtangaben nur bei gleicher Messgröße und vergleichbarem Messbezug zahlenmäßig gegeneinander halten — Preserve photometric quantity and scope rather than converting one number blindly.',
    {
      a_wert:number('Erster ausgewiesener Lichtwert in der angegebenen Einheit.'),
      b_wert:number('Zweiter ausgewiesener Lichtwert in der angegebenen Einheit.'),
      a_groesse:select('Einheit samt Bezug des ersten Originalwerts.','lm_360','lm_120','lm_90','cd_spitze','lx_messpunkt','offen'),
      b_groesse:select('Einheit samt Bezug des zweiten Originalwerts.','lm_360','lm_120','lm_90','cd_spitze','lx_messpunkt','offen'),
      vergleichsbedingung_gleich:yes('Gleiche Einstellung, Messart und bei Lux auch gleiche Fläche, Distanz und Ausrichtung?'),
    },({a_wert,b_wert,a_groesse,b_groesse,vergleichsbedingung_gleich})=>{
      const compatible=a_groesse!=='offen'&&a_groesse===b_groesse&&vergleichsbedingung_gleich;
      return {zahlenvergleich_moeglich:compatible,differenz_b_minus_a:compatible?round(b_wert-a_wert):null,
        hinweis:'Lumen beschreiben Lichtstrom, Candela Lichtstärke in einer Richtung, Lux Beleuchtungsstärke an einer Stelle. Kein pauschaler Umrechnungsfaktor.'};
    },{a_wert:230,b_wert:230,a_groesse:'lm_90',b_groesse:'lm_360',vergleichsbedingung_gleich:true},
    {zahlenvergleich_moeglich:false,differenz_b_minus_a:null}),

  tool('led_spot_halbwertskreis_geometrie_arbeitsflaeche',
    'Für einen symmetrischen Spot den geometrischen Halbwerts-Durchmesser auf einer senkrechten Fläche veranschaulichen — Estimate the idealized beam footprint rather than inferring desk lux.',
    {
      winkel_grad:number('Dokumentierter voller Halbwertswinkel; kein Messkegel des Nutzlichtstroms.',0.01,170),
      lotabstand_m:number('Abstand zur idealisiert senkrecht zur optischen Achse liegenden Fläche in Metern.',0.01,100),
      zielbreite_m:number('Eigenes geometrisches Ziel auf derselben gedachten Fläche.',0,100),
      symmetrisch_und_senkrecht:yes('Dieser Vergleich nimmt ein rundes Strahlbild und dieselbe senkrechte Achse an?'),
    },({winkel_grad,lotabstand_m,zielbreite_m,symmetrisch_und_senkrecht})=>{
      if (!symmetrisch_und_senkrecht) return {halbwertsdurchmesser_m:null,ziel_geometrisch_erreicht:null};
      const width=2*lotabstand_m*Math.tan(winkel_grad*Math.PI/360);
      return {halbwertsdurchmesser_m:round(width),ziel_geometrisch_erreicht:width>=zielbreite_m,
        hinweis:'Teilfläche mit Halbwertsgrenze unter Modellannahmen, kein scharfer Lichtkegel und keine Beleuchtungsstärke.'};
    },{winkel_grad:36,lotabstand_m:1,zielbreite_m:0.7,symmetrisch_und_senkrecht:true},
    {halbwertsdurchmesser_m:0.6498,ziel_geometrisch_erreicht:false}),

  tool('led_energielabel_1000_stunden_aufgerundet_pon',
    'Die auf ganze kWh je 1.000 Stunden aufgerundete Ein-Zustandsangabe gegen einen passenden dezimalen Wattwert halten — Check rounding coherence rather than reading the label as exact watts or annual energy.',
    {
      label_kwh_1000h:number('Ganzzahliges Feld kWh/1.000 h im Ein-Zustand, nicht Jahresverbrauch.'),
      datenblatt_pon_w:number('Deklarierter dezimaler Leistungswert P_on derselben Lichtquelle in W.'),
      selbe_lichtquelle_und_betriebsbasis:yes('Angebot, Datenblatt, Modellkennung und Ein-Zustand sind eindeutig dieselben?'),
    },({label_kwh_1000h,datenblatt_pon_w,selbe_lichtquelle_und_betriebsbasis})=>{
      whole(label_kwh_1000h);
      const expected=Math.ceil(datenblatt_pon_w);
      return {erwartet_aufgerundet_kwh_1000h:selbe_lichtquelle_und_betriebsbasis?expected:null,
        rundung_passt:selbe_lichtquelle_und_betriebsbasis?expected===label_kwh_1000h:null,
        hinweis:'Beobachtet nur deklarierte Werte im gleichen Ein-Zustand. Kein Maß für Standby oder Jahresbedarf und kein Urteil über Labelkonformität.'};
    },{label_kwh_1000h:4,datenblatt_pon_w:3.4,selbe_lichtquelle_und_betriebsbasis:true},
    {erwartet_aufgerundet_kwh_1000h:4,rundung_passt:true}),

  tool('led_kelvin_farben_wiedergeben_getrennte_kaufziele',
    'Die ähnlich deklarierte Lichtfarbe und den gewünschten Mindestwert der Farbwiedergabe getrennt abgleichen — Keep correlated colour temperature and Ra as separate buying criteria.',
    {
      alt_kelvin:number('Ausgewiesene ähnliche Farbtemperatur der vorhandenen Lichtquelle in K.',1000,20000),
      neu_kelvin:number('Ausgewiesene ähnliche Farbtemperatur des Ersatzes für die passende Einstellung in K.',1000,20000),
      toleranz_kelvin:number('Selbst gewählte maximale Abweichung der Farbtemperatur in K.',0,5000),
      neu_ra:number('Ausgewiesener allgemeiner Farbwiedergabeindex Ra des Ersatzes.',0,100),
      mindest_ra:number('Eigener Mindestwert für diese Aufgabe.',0,100),
      einstellung_und_werte_belegt:yes('Gelten alle Werte für die genannte Einstellung und genau diese Lichtquellen?'),
    },({alt_kelvin,neu_kelvin,toleranz_kelvin,neu_ra,mindest_ra,einstellung_und_werte_belegt})=>{
      if (!einstellung_und_werte_belegt) return {lichtfarbe_im_eigenen_band:null,ra_im_eigenen_band:null};
      return {lichtfarbe_im_eigenen_band:Math.abs(neu_kelvin-alt_kelvin)<=toleranz_kelvin,ra_im_eigenen_band:neu_ra>=mindest_ra,
        kelvin_delta:neu_kelvin-alt_kelvin,hinweis:'Kelvin ist keine Farbwiedergabe. Beide Angaben belegen weder identische Spektren noch die Wirkung am Arbeitsplatz.'};
    },{alt_kelvin:2700,neu_kelvin:2700,toleranz_kelvin:100,neu_ra:80,mindest_ra:90,einstellung_und_werte_belegt:true},
    {lichtfarbe_im_eigenen_band:true,ra_im_eigenen_band:false,kelvin_delta:0}),

  tool('ledvance_par16_ac45730_merten_meg5137_dimmertest',
    'Für eine LEDVANCE-PAR16-Kombination die veröffentlichte Dimmertestzeile nur bei exakt passender Lampenzahl lesen — Retrieve the historical AC45730 × MEG5137-0000 result for one or four lamps only.',
    {
      lampe:select('Bestätigte Kennung auf dem exakten LEDVANCE-Label.','AC45730','AC58031','andere','offen'),
      dimmer:select('Bestätigte vollständige Merten-Kennung aus vorhandenen Unterlagen.','MEG5137-0000','andere','offen'),
      stueck:number('Zahl der identischen Lampen im vorliegenden dokumentierten Fall.',1,100),
      identischer_testbezug:yes('Sind Lampenmodell, Dimmernummer und die angegebenen Bedingungen anhand der vorhandenen Unterlagen abgeglichen?'),
    },({lampe,dimmer,stueck,identischer_testbezug})=>{
      whole(stueck);
      if (!identischer_testbezug||lampe!=='AC45730'||dimmer!=='MEG5137-0000'||![1,4].includes(stueck)) return {status:'keine_passende_testzeile_in_diesem_beleg',testbereich_prozent:null};
      const lower=stueck===1?39:0;
      return {status:stueck===1?'hersteller_testbereich_eingeschraenkt':'hersteller_testbereich_belegt',
        testbereich_prozent:[lower,100],quelle_stand:'2023-07',hinweis:'Herstellertest in der angegebenen Konfiguration. Keine Kauf-, Funktions- oder Installationsfreigabe. Ein fehlender Tabelleneintrag ist kein Gegenbeweis.'};
    },{lampe:'AC45730',dimmer:'MEG5137-0000',stueck:1,identischer_testbezug:true},
    {status:'hersteller_testbereich_eingeschraenkt',testbereich_prozent:[39,100],quelle_stand:'2023-07'}),

  tool('led_dimmen_minimum_start_schon_leuchtend',
    'Bei einer vorhandenen, bereits beobachteten Kombination den niedrigsten stabilen Wert nach Start vom niedrigsten Einschaltwert trennen — Distinguish low-level restart from dimming an already operating lamp.',
    {
      bedarf_untergrenze_prozent:number('Eigene gewünschte niedrigste Stufe in Prozent der dokumentierten Lichtskala.',0,100),
      minimal_laufend_prozent:number('Niedrigster stabil belegter Wert, nachdem die Lampe bereits leuchtete.',0,100),
      minimal_start_prozent:number('Niedrigster Wert, bei dem sie laut Beobachtung aus dem ausgeschalteten Zustand stabil anlief.',0,100),
      selbe_lichtskala_bestaetigt:yes('Selbe Lampe, Dimmer, Lampenzahl, Messbasis und vergleichbare Bedingungen in den vorhandenen Beobachtungen?'),
    },({bedarf_untergrenze_prozent,minimal_laufend_prozent,minimal_start_prozent,selbe_lichtskala_bestaetigt})=>{
      if (!selbe_lichtskala_bestaetigt) return {im_lauf_beobachtet:null,beim_start_beobachtet:null};
      return {im_lauf_beobachtet:minimal_laufend_prozent<=bedarf_untergrenze_prozent,
        beim_start_beobachtet:minimal_start_prozent<=bedarf_untergrenze_prozent,
        differenz_untere_stufen_pp:round(minimal_start_prozent-minimal_laufend_prozent),
        hinweis:'Nur belegte Beobachtungen. Bedienstellung, Lichtanteil und standardisierter Dimmer-Testbereich sind verschiedene Größen.'};
    },{bedarf_untergrenze_prozent:12,minimal_laufend_prozent:8,minimal_start_prozent:20,selbe_lichtskala_bestaetigt:true},
    {im_lauf_beobachtet:true,beim_start_beobachtet:false,differenz_untere_stufen_pp:12}),

  tool('led_flimmermass_pstlm_svm_dimmlage_beleg',
    'PstLM und SVM auf die richtige Art der Zeitlichtbeobachtung und die tatsächlich dokumentierte Dimmlage begrenzen — Keep distinct temporal-light metrics tied to their declared operating state.',
    {
      messwert:select('Welcher ausdrücklich bezeichnete Kennwert liegt vor?','pstlm','svm','offen'),
      entscheidung:select('Welcher Aspekt soll gelesen werden?','flimmern','stroboskopischer_effekt'),
      beleg_stufe:select('Dokumentierte Betriebsstufe, auf die sich der Kennwert bezieht.','vollast','gewuenschte_dimmlage','offen'),
      anfrage_stufe:select('Tatsächlich interessierende Stufe.','vollast','gewuenschte_dimmlage'),
      modell_und_zustand_bestaetigt:yes('Modell und Betriebsstufe sind für die konkrete Angabe geprüft?'),
    },({messwert,entscheidung,beleg_stufe,anfrage_stufe,modell_und_zustand_bestaetigt})=>{
      const expected=entscheidung==='flimmern'?'pstlm':'svm';
      return {gewuenschter_kennwert:expected,zur_frage_auswertbar:modell_und_zustand_bestaetigt&&messwert===expected&&beleg_stufe===anfrage_stufe,
        hinweis:'Ein Wert bei Volllast belegt keine gleiche Wirkung in gedimmter Stellung. Keine medizinische oder persönliche Verträglichkeitsaussage.'};
    },{messwert:'pstlm',entscheidung:'flimmern',beleg_stufe:'vollast',anfrage_stufe:'gewuenschte_dimmlage',modell_und_zustand_bestaetigt:true},
    {gewuenschter_kennwert:'pstlm',zur_frage_auswertbar:false}),

  tool('led_lebensdauer_l70b50_garantie_unterscheiden',
    'Eine L70/B50-Angabe, Schaltzyklen und schriftliche Garantie nach ihrer dokumentierten Aussage unterscheiden — Identify what a lifespan claim can support before relying on it for one lamp.',
    {
      angabe:select('Tatsächlich dokumentierte Art der Angabe.','l70b50','schaltzyklen','verbindliche_angebotene_garantieurkunde','unspezifische_stunden','offen'),
      frage:select('Welcher Beleg wird für die aktuelle Entscheidung gesucht?','lichtstromerhalt_einer_population','schaltzahl','schriftliche_garantiebedingungen'),
      modell_bestaetigt:yes('Ist die Angabe auf genau dieses Modell und die angegebenen Bedingungen bezogen?'),
    },({angabe,frage,modell_bestaetigt})=>{
      if (!modell_bestaetigt||angabe==='offen'||angabe==='unspezifische_stunden') return {aussage_verwendbar:null,bezug:null};
      const supplied={l70b50:'lichtstromerhalt_einer_population',schaltzyklen:'schaltzahl',verbindliche_angebotene_garantieurkunde:'schriftliche_garantiebedingungen'}[angabe];
      return {aussage_verwendbar:supplied===frage,bezug:supplied,
        hinweis:'L70/B50 beschreibt eine Population am Lichtstromkriterium. Die Laufzeit eines einzelnen Exemplars und Garantiebedingungen bleiben eigenständige Fragen.'};
    },{angabe:'l70b50',frage:'schriftliche_garantiebedingungen',modell_bestaetigt:true},
    {aussage_verwendbar:false,bezug:'lichtstromerhalt_einer_population'}),

  tool('led_ersatz_geschlossenes_gehaeuse_umgebung_beleg',
    'Eine modellbezogene Angabe zum geschlossenen Leuchtengehäuse von Innenraum- oder Außeneignung trennen — Check the specific enclosure condition instead of generalizing an indoor-use claim.',
    {
      gehaeuse:select('Belegte vom Leuchtenhersteller beschriebene Bauform.','geschlossen','offen','unklar'),
      quellenbeleg:select('Ausdrücklich dokumentierte Aussage der konkreten Lichtquelle.','geschlossen_belegt','geschlossen_ausgeschlossen','nur_allgemeiner_einsatz','unklar'),
      identische_einsatzbedingungen:yes('Genaue Modelle und die zum Nutzort gehörenden Bedingungen wurden abgeglichen?'),
    },({gehaeuse,quellenbeleg,identische_einsatzbedingungen})=>{
      if (gehaeuse==='unklar'||!identische_einsatzbedingungen) return {status:'anwendungskontext_offen'};
      if (gehaeuse!=='geschlossen') return {status:'andere_leuchtenbauform'};
      return {status:quellenbeleg==='geschlossen_belegt'?'ausdruecklicher_gehaeusebezug':quellenbeleg==='geschlossen_ausgeschlossen'?'gehaeuse_ausgeschlossen':'spezieller_gehaeusenachweis_fehlt',
        hinweis:'Keine Aussage zur sicheren Montage oder zum Öffnen eines Gehäuses. Aus allgemeiner Innen- oder Außeneignung folgt kein Nachweis für ein geschlossenes Gehäuse.'};
    },{gehaeuse:'geschlossen',quellenbeleg:'nur_allgemeiner_einsatz',identische_einsatzbedingungen:true},
    {status:'spezieller_gehaeusenachweis_fehlt'}),

  tool('led_arbeitsflaeche_drei_luxpunkte_gegen_basis',
    'In einem dokumentierten Leuchtenvergleich prüfen, ob die zusätzliche Beleuchtung nur den Mittelpunkt verbessert — Check a matched centre-and-edge lux comparison before treating a spot as an even task light.',
    {
      basis_mitte_lx:number('Stabile Beleuchtungsstärke ohne Zusatzlicht in der Mitte.'),
      basis_rand_a_lx:number('Dieselbe Referenz an Randpunkt A.'),
      basis_rand_b_lx:number('Dieselbe Referenz an Randpunkt B.'),
      test_mitte_lx:number('Mit Zusatzlicht gemessener Wert an derselben Mitte.'),
      test_rand_a_lx:number('Mit Zusatzlicht gemessener Wert an demselben Randpunkt A.'),
      test_rand_b_lx:number('Mit Zusatzlicht gemessener Wert an demselben Randpunkt B.'),
      zusatzziel_lx:number('Eigene Mindestverbesserung, die an jedem dieser Punkte benötigt wird.',0.01,1000000),
      gleiche_messpunkte_und_umgebung:yes('Fläche, Messpunkte, Ausrichtung, Messgerät und getrennte Fremdbeleuchtung vergleichbar?'),
    },({basis_mitte_lx,basis_rand_a_lx,basis_rand_b_lx,test_mitte_lx,test_rand_a_lx,test_rand_b_lx,zusatzziel_lx,gleiche_messpunkte_und_umgebung})=>{
      if (!gleiche_messpunkte_und_umgebung) return {nur_mitte_erreicht:null,geringster_zuwachs_lx:null};
      const middle=test_mitte_lx-basis_mitte_lx;
      const a=test_rand_a_lx-basis_rand_a_lx, b=test_rand_b_lx-basis_rand_b_lx;
      return {nur_mitte_erreicht:middle>=zusatzziel_lx&&Math.max(a,b)<zusatzziel_lx,
        geringster_zuwachs_lx:round(Math.min(middle,a,b)),
        unter_dem_eigenen_ziel:[['mitte',middle],['rand_a',a],['rand_b',b]].filter(([,value])=>value<zusatzziel_lx).map(([name])=>name),
        hinweis:'Drei vorhandene Messpunkte illustrieren die beobachtete Aufgabe, keine vollständig geprüfte Fläche.'};
    },{basis_mitte_lx:100,basis_rand_a_lx:95,basis_rand_b_lx:90,test_mitte_lx:230,test_rand_a_lx:142,test_rand_b_lx:125,zusatzziel_lx:70,gleiche_messpunkte_und_umgebung:true},
    {nur_mitte_erreicht:true,geringster_zuwachs_lx:35,unter_dem_eigenen_ziel:['rand_a','rand_b']}),
];
