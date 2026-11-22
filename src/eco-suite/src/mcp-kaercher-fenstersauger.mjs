const page = '/produkte.html';
const checked = '2026-11-20';
const productBase = 'https://www.karcher.com/de/de/home-and-garden/produkte/';
const oldSafety = 'https://dp6jru56judg7.cloudfront.net/BTA/000/BTA-5548307-000-05.pdf';
const newSafety = 'https://dp6jru56judg7.cloudfront.net/BTA/000/BTA-6001552-000-02.pdf';
const wv2 = '1.633-662.0';
const wv3 = '1.633-698.0';
const wv8 = '1.633-785.0';
const products = new Map([
  [wv2, {url: productBase + 'wv-2-plus-multi-edition-p16336620', safety: oldSafety, fluidLimitMl: 25}],
  [wv3, {url: productBase + 'wv-3-comfort-precision-black-p16336980', safety: newSafety, fluidLimitMl: 40}],
  [wv8, {url: productBase + 'wv-8-signature-line-p16337850', safety: newSafety, fluidLimitMl: 40}],
]);
const choices = (description, ...values) => ({type:'string', description, enum:values});
const model = choices('Am Gerät oder Paket bestätigter Artikel laut deutscher Kärcher-Produktseite.', wv2, wv3, wv8, 'offen');
const recentModel = choices('Am Gerät oder Paket bestätigter Artikel des WV 3 Comfort Precision+ Black oder WV 8 Signature Line.', wv3, wv8, 'offen');
const documented = {type:'boolean', description:'Der verlinkte deutsche Sicherheitshinweis gehört nachweislich zur eigenen Geräteausführung.'};
const source = (url, fundstelle) => ({url, fundstelle, geprueft_am:checked});
const tool = (name,description,properties,calculate,args,expect) =>
  ({name,description,page,properties,calculate,example:{args,expect}});

export const kaercherFenstersaugerTools = [
  tool('fenstersauger_kaercher_fluessigkeitsgrenze_und_tank',
    'Prüft für drei konkrete Kärcher-Fenstersauger die Flüssigkeitsgrenze laut zugeordneter Anleitung und trennt sie vom Schmutzwassertank — Check whether the documented intended-use liquid limit is exceeded.',
    {artikel:model, sicherheitsblatt_bestaetigt:documented,
      aufgabe:choices('Art der zu bearbeitenden Stelle.', 'feuchte_glatte_flaeche','verschuettete_fluessigkeit','kein_feuchter_glatter_belag','offen'),
      menge_bestaetigt:{type:'boolean',description:'Die für genau diese Aufgabe aufzusaugende Menge ist bekannt.'},
      fluessigkeit_ml:{type:'number', minimum:0, maximum:10000, description:'Zu entfernende Flüssigkeitsmenge in Millilitern.'}},
    ({artikel,sicherheitsblatt_bestaetigt,aufgabe,menge_bestaetigt,fluessigkeit_ml}) => {
      const item = sicherheitsblatt_bestaetigt ? products.get(artikel) : undefined;
      const exceeds = item && menge_bestaetigt ? fluessigkeit_ml > item.fluidLimitMl : null;
      const unsuitable = aufgabe === 'verschuettete_fluessigkeit' || aufgabe === 'kein_feuchter_glatter_belag';
      const action = !item ? 'modell_und_anleitung_pruefen'
        : unsuitable || exceeds ? 'anders_aufnehmen'
        : aufgabe === 'offen' || !menge_bestaetigt ? 'anwendung_oder_menge_klaeren'
        : 'mengenobergrenze_eingehalten_weitere_bedingungen_pruefen';
      return {mengenobergrenze_laut_sicherheitsblatt_ml:item?.fluidLimitMl ?? null,
        anleitungsgrenze_ueberschritten:exceeds, folgeschritt:action,
        beleg:item ? source(item.safety,'S. 3, Bestimmungsgemäße Verwendung') : null,
        hinweis:'Mengenobergrenze und Tankvolumen stehen getrennt in den Herstellerunterlagen. Für verschüttete Flüssigkeit ein geeignetes Tuch oder einen geeigneten Wischer verwenden.'};
    },
    {artikel:wv2,sicherheitsblatt_bestaetigt:true,aufgabe:'feuchte_glatte_flaeche',menge_bestaetigt:true,fluessigkeit_ml:30},
    {mengenobergrenze_laut_sicherheitsblatt_ml:25,anleitungsgrenze_ueberschritten:true,folgeschritt:'anders_aufnehmen'}),

  tool('fenstersauger_wv3_wv8_led_muster_einordnen',
    'Ordnet das dokumentierte Blinkmuster und den Betriebszustand beim Kärcher WV 3 oder WV 8 ein — Decode the exact LED pattern with the phase shown in the German troubleshooting table.',
    {artikel:recentModel,sicherheitsblatt_bestaetigt:documented,
      muster:choices('Genau beobachtetes LED-Muster.', 'eine_led_lang_an_kurz_aus','eine_led_kurz_an_lang_aus','eine_led_schnell',
        'untere_led_lang_an_lang_aus','alle_leds_zweimal_kurz_dann_lange_pause','alle_leds_kurz_an_kurz_aus','offen'),
      zustand:choices('Gerätezustand beim Auftreten des Musters. Während der Nutzung beobachtete Blinkfolgen bleiben dieser Phase zugeordnet, auch wenn der Motor danach ausgeht.', 'waehrend_betrieb','waehrend_laden','motor_aus','offen')},
    ({artikel,sicherheitsblatt_bestaetigt,muster,zustand}) => {
      const wv3Signals = {
        eine_led_lang_an_kurz_aus:'akku_fast_entladen',
        eine_led_kurz_an_lang_aus:'akku_entladen',
      };
      const wv8Signals = {
        untere_led_lang_an_lang_aus:'akku_entladen',
        alle_leds_zweimal_kurz_dann_lange_pause:'akkutemperatur_zu_hoch_oder_zu_tief',
        alle_leds_kurz_an_kurz_aus:'motor_blockiert_laut_tabelle',
      };
      let meaning = null;
      if (sicherheitsblatt_bestaetigt && artikel === wv3) {
        meaning = wv3Signals[muster] ?? null;
        if (muster === 'eine_led_schnell') {
          if (zustand === 'waehrend_laden') meaning = 'laden_nicht_moeglich';
          if (zustand === 'waehrend_betrieb') meaning = 'turbine_ueberhitzt_oder_blockiert_laut_tabelle';
        }
      }
      if (sicherheitsblatt_bestaetigt && artikel === wv8 && zustand === 'motor_aus') meaning = wv8Signals[muster] ?? null;
      let action = 'muster_modell_und_betriebszustand_pruefen';
      if (meaning?.startsWith('akku_') && meaning.endsWith('entladen')) action = 'mit_zugelassenem_ladezubehoer_laden';
      if (meaning === 'akkutemperatur_zu_hoch_oder_zu_tief' || meaning === 'laden_nicht_moeglich') action = 'auf_wohnraumtemperatur_kommen_lassen';
      if (meaning === 'motor_blockiert_laut_tabelle' || meaning === 'turbine_ueberhitzt_oder_blockiert_laut_tabelle') action = 'ausgeschaltet_lassen_und_bei_fortdauer_service_kontaktieren';
      return {tabellenbedeutung:meaning,folgeschritt:action,
        beleg:sicherheitsblatt_bestaetigt && (artikel === wv3 || artikel === wv8)
          ? source(newSafety,'S. 4–5, LED-Codes und Störungsbehebungen') : null,
        hinweis:'Das Handbuch ordnet Blinkfolgen ein. Daraus lässt sich keine Akkukapazität bestimmen.'};
    },
    {artikel:wv8,sicherheitsblatt_bestaetigt:true,muster:'alle_leds_zweimal_kurz_dann_lange_pause',zustand:'motor_aus'},
    {tabellenbedeutung:'akkutemperatur_zu_hoch_oder_zu_tief',folgeschritt:'auf_wohnraumtemperatur_kommen_lassen'}),

  tool('fenstersauger_wv3_wv8_akkuwechsel_service_oder_reserve',
    'Prüft beim Kauf eines Kärcher WV 3 oder WV 8, ob der Herstellertext einen Akkutausch im Servicefall oder eine zweite Batterie für den laufenden Einsatz belegt — Separate service replacement from a detachable spare pack.',
    {artikel:recentModel,ziel:choices('Grund für die Akkutausch-Prüfung.', 'ersatz_bei_verschleiss','wechselakku_fuer_laufenden_einsatz','offen')},
    ({artikel,ziel}) => {
      const item = artikel === wv3 || artikel === wv8 ? products.get(artikel) : undefined;
      const action = !item ? 'genauen_artikel_pruefen'
        : ziel === 'ersatz_bei_verschleiss' ? 'serviceweg_und_teilfreigabe_klaeren'
        : ziel === 'wechselakku_fuer_laufenden_einsatz' ? 'vor_kauf_wechselakku_gesondert_bestaetigen' : 'bedarf_klaeren';
      return {akkutausch_im_servicefall_dokumentiert:item ? true : null,
        wechselakku_fuer_laufenden_einsatz_durch_diese_angabe_belegt:item ? false : null,
        folgeschritt:action, beleg:item ? source(item.url,'Produktvorteile, austauschbarer Lithium-Ionen-Akku') : null,
        hinweis:'Kärcher beschreibt einen Tausch im Servicefall. Vor einem Kauf mit Wechselakku-Anforderung die genaue Freigabe erfragen.'};
    },
    {artikel:wv3,ziel:'wechselakku_fuer_laufenden_einsatz'},
    {akkutausch_im_servicefall_dokumentiert:true,wechselakku_fuer_laufenden_einsatz_durch_diese_angabe_belegt:false,folgeschritt:'vor_kauf_wechselakku_gesondert_bestaetigen'}),

  tool('fenstersauger_kaercher_glasreiniger_schaum_spiritus',
    'Prüft, ob die Reinigungsmittel-Kategorie zur Anleitung eines konkreten Kärcher-Fenstersaugers passt — Check documented cleaner scope without inferring material compatibility.',
    {artikel:model,sicherheitsblatt_bestaetigt:documented,
      mittel:choices('Kategorie laut Kennzeichnung oder Herstellerangabe.', 'herkoemmlicher_glas_oder_fensterreiniger','schaumreiniger','spiritus','anderer_reiniger','offen')},
    ({artikel,sicherheitsblatt_bestaetigt,mittel}) => {
      const item = sicherheitsblatt_bestaetigt ? products.get(artikel) : undefined;
      const state = !item || mittel === 'offen' ? 'offen'
        : mittel === 'herkoemmlicher_glas_oder_fensterreiniger' ? 'mittelgruppe_vorgesehen'
        : mittel === 'schaumreiniger' || mittel === 'spiritus' ? 'ausdruecklich_ausgeschlossen'
        : 'durch_diese_anleitung_nicht_belegt';
      return {mittelbewertung:state,
        beleg:item ? source(item.safety,'S. 3, Bestimmungsgemäße Verwendung') : null,
        hinweis:'Die Einordnung nennt die Mittelgruppe. Materialfreigabe und Dosierung des konkreten Mittels separat prüfen.'};
    },
    {artikel:wv8,sicherheitsblatt_bestaetigt:true,mittel:'schaumreiniger'},
    {mittelbewertung:'ausdruecklich_ausgeschlossen'}),

  tool('fenstersauger_wv3_wv8_hochglanz_glas_temperatur_probe',
    'Prüft beim Kärcher WV 3 oder WV 8, ob Oberflächentemperatur oder fehlende Probe auf Hochglanz gegen die Anwendung sprechen — Check the documented temperature exclusion and inconspicuous microfiber test.',
    {artikel:recentModel,sicherheitsblatt_bestaetigt:documented,
      temperatur:choices('Zustand der Oberfläche beim geplanten Einsatz.', 'nicht_sehr_warm_oder_kalt','sehr_warm_oder_kalt','heiss_oder_gefroren','offen'),
      hochglanz:choices('Ist die Fläche empfindlich oder hochglänzend?', 'ja','nein','offen'),
      probestelle:choices('Ergebnis einer kleinen verdeckten Probe mit dem Wischbezug.', 'unauffaellig','auffaellig','noch_nicht','offen')},
    ({artikel,sicherheitsblatt_bestaetigt,temperatur,hochglanz,probestelle}) => {
      const confirmed = sicherheitsblatt_bestaetigt && (artikel === wv3 || artikel === wv8);
      const temperatureBans = temperatur === 'sehr_warm_oder_kalt' || temperatur === 'heiss_oder_gefroren';
      const action = !confirmed ? 'modell_und_anleitung_pruefen'
        : temperatureBans ? 'nicht_anwenden'
        : temperatur === 'offen' || hochglanz === 'offen' ? 'oberflaeche_klaeren'
        : hochglanz === 'nein' || probestelle === 'unauffaellig' ? 'weitere_materialfreigabe_pruefen'
        : probestelle === 'auffaellig' ? 'nicht_flaechig_anwenden'
        : 'an_unauffaelliger_stelle_pruefen';
      return {folgeschritt:action, temperatur_ausgeschlossen:confirmed && temperatur !== 'offen' ? temperatureBans : null,
        beleg:confirmed ? source(newSafety,'S. 2, Bedienung und Achtungshinweise') : null,
        hinweis:'Die Anleitung nennt keine numerischen Temperaturgrenzen. Eine kleine Probe ersetzt keine Materialfreigabe.'};
    },
    {artikel:wv3,sicherheitsblatt_bestaetigt:true,temperatur:'nicht_sehr_warm_oder_kalt',hochglanz:'ja',probestelle:'noch_nicht'},
    {folgeschritt:'an_unauffaelliger_stelle_pruefen',temperatur_ausgeschlossen:false}),
];
