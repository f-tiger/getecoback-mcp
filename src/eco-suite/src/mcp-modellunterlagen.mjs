const number = (description, minimum, maximum) => ({type: 'number', description, minimum, maximum});
const bool = description => ({type: 'boolean', description});
const choice = (description, ...values) => ({type: 'string', description, enum: values});
const guide = slug => `/guide/${slug}.html`;
const signal = description => choice(description, 'belegt', 'ausgeschlossen', 'offen');
const round = value => Math.round(value * 100) / 100;

function requireWhole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Hier sind ganze Zahlen erforderlich.');
}

export const modellunterlagen = [
  {
    name: 'abluft_anschluss_nennweite_messkante',
    description: 'Prüfe, ob Soll- und Angebotsdurchmesser an derselben Anschlusskante stehen — Check that exhaust fitting diameters refer to the same interface',
    page: guide('abluftschlauch-verlaengern'),
    properties: {
      soll_mm: number('Durchmesser am Originalanschluss laut Modellunterlage', 1, 1000),
      angebot_mm: number('Durchmesser laut Zubehörzeichnung', 1, 1000),
      soll_kante: choice('Bezugsfläche beim Original', 'innen', 'aussen', 'unbekannt'),
      angebot_kante: choice('Bezugsfläche beim Zubehör', 'innen', 'aussen', 'unbekannt'),
      freigabe: signal('Freigabe des Zubehörs für die genaue Gerätevariante')
    },
    calculate({soll_mm, angebot_mm, soll_kante, angebot_kante, freigabe}) {
      const vergleichbar = soll_kante !== 'unbekannt' && soll_kante === angebot_kante;
      return {gleiche_messkante: vergleichbar, massabweichung_mm: vergleichbar ? round(angebot_mm - soll_mm) : null,
        naechster_schritt: freigabe === 'ausgeschlossen' ? 'Originalweg statt Zusatzteil prüfen' : 'Verbinder und Herstellerfreigabe anhand der Modellanleitung prüfen'};
    },
    example: {args: {soll_mm: 150, angebot_mm: 150, soll_kante: 'innen', angebot_kante: 'aussen', freigabe: 'offen'}, expect: {gleiche_messkante: false, massabweichung_mm: null}}
  },
  {
    name: 'klimafenster_platte_nennlaenge_hub',
    description: 'Vergleiche eine dokumentierte Teleskopspanne mit den Öffnungsmaßen eines Schiebefensters — Compare a sliding-window insert range with the actual opening',
    page: guide('fensterabdichtung-klimaanlage'),
    properties: {
      lichte_oeffnung_mm: number('Lichte Öffnung entlang der Verstellrichtung', 1, 5000),
      minimale_platte_mm: number('Kleinste Einbaulänge laut Zeichnung', 1, 5000),
      maximale_platte_mm: number('Größte Einbaulänge laut Zeichnung', 1, 5000),
      bauart_belegt: bool('Das Zubehör nennt die vorhandene Schiebefenster-Bauart')
    },
    calculate({lichte_oeffnung_mm, minimale_platte_mm, maximale_platte_mm, bauart_belegt}) {
      if (maximale_platte_mm < minimale_platte_mm) throw new RangeError('Kleinste und größte Einbaulänge prüfen.');
      return {mass_im_bereich: lichte_oeffnung_mm >= minimale_platte_mm && lichte_oeffnung_mm <= maximale_platte_mm,
        reserve_zur_obergrenze_mm: round(maximale_platte_mm - lichte_oeffnung_mm),
        bauart_belegt, grenze: 'Längenabgleich ersetzt keine Prüfung von Quermaß und Befestigung.'};
    },
    example: {args: {lichte_oeffnung_mm: 1220, minimale_platte_mm: 780, maximale_platte_mm: 1190, bauart_belegt: true}, expect: {mass_im_bereich: false, reserve_zur_obergrenze_mm: -30}}
  },
  {
    name: 'klima_selbstverdunstung_modusbereich',
    description: 'Unterscheide Selbstverdunstung im Kühlbetrieb und den dokumentierten Ablauf beim Entfeuchten — Distinguish cooling evaporation from drainage in dry mode',
    page: guide('mobile-klimaanlage-tropft-wasser'),
    properties: {
      einsatz: choice('Vorgesehener Betrieb', 'kuehlen', 'entfeuchten'),
      selbstverdunstung_kuehlen: signal('Selbstverdunstung ausdrücklich für den Kühlmodus'),
      ablauf_entfeuchten: signal('Ablauf ausdrücklich für den Entfeuchtungsmodus'),
      dauerlauf_geplant: bool('Längerer Betrieb ohne regelmäßiges Tankleeren geplant')
    },
    calculate({einsatz, selbstverdunstung_kuehlen, ablauf_entfeuchten, dauerlauf_geplant}) {
      return {modusbeleg: einsatz === 'kuehlen' ? selbstverdunstung_kuehlen : ablauf_entfeuchten,
        tankentleerung_weiter_einplanen: dauerlauf_geplant && (einsatz === 'kuehlen' || ablauf_entfeuchten !== 'belegt'),
        grenze: 'Selbstverdunstung im Kühlmodus sagt nichts über den Entfeuchtungsmodus aus und garantiert keinen leeren Tank.'};
    },
    example: {args: {einsatz: 'entfeuchten', selbstverdunstung_kuehlen: 'belegt', ablauf_entfeuchten: 'offen', dauerlauf_geplant: true}, expect: {modusbeleg: 'offen', tankentleerung_weiter_einplanen: true}}
  },
  {
    name: 'split_verbindungsleitung_und_abluft_lesen',
    description: 'Bestimme, welche Herstellerzeichnung zur Leitung einer mobilen Split- oder Monoblock-Anlage gehört — Identify the right drawing for a mobile AC connection',
    page: guide('midea-portasplit-kaufen'),
    properties: {
      bauart: choice('Bauweise des angebotenen Geräts', 'mobil_split', 'monoblock', 'unklar'),
      dokument: choice('Leitung in der Zubehörzeichnung', 'verbindung_innen_aussen', 'abluftschlauch', 'unklar'),
      modell_auf_zeichnung: bool('Dasselbe genaue Modell steht auf Zeichnung und Angebot')
    },
    calculate({bauart, dokument, modell_auf_zeichnung}) {
      const benoetigte_zeichnung = {mobil_split: 'verbindung_innen_aussen', monoblock: 'abluftschlauch', unklar: 'bauart_klaeren'}[bauart];
      return {benoetigte_zeichnung, modellbezogener_leitungsbeleg: modell_auf_zeichnung && dokument === benoetigte_zeichnung,
        grenze: 'Ein Monoblock-Abluftmaß ist keine Maßangabe für die Verbindung zwischen Split-Einheiten.'};
    },
    example: {args: {bauart: 'mobil_split', dokument: 'abluftschlauch', modell_auf_zeichnung: false}, expect: {benoetigte_zeichnung: 'verbindung_innen_aussen', modellbezogener_leitungsbeleg: false}}
  },
  {
    name: 'entfeuchter_pruefpunkt_betriebsfenster',
    description: 'Prüfe, welcher Teil der beobachteten Kellertemperatur im dokumentierten Betriebsfenster liegt — Check a cellar temperature span against the documented operating envelope',
    page: guide('luftentfeuchter-keller'),
    properties: {
      keller_min_c: number('Niedrigste beobachtete Kellertemperatur in °C', -40, 80),
      keller_max_c: number('Höchste beobachtete Kellertemperatur in °C', -40, 80),
      geraet_min_c: number('Untere Betriebsgrenze in °C laut Modellanleitung', -40, 80),
      geraet_max_c: number('Obere Betriebsgrenze in °C laut Modellanleitung', -40, 80),
      passender_pruefpunkt: bool('Wasserentzug bei ähnlicher Temperatur und relativer Feuchte dokumentiert')
    },
    calculate({keller_min_c, keller_max_c, geraet_min_c, geraet_max_c, passender_pruefpunkt}) {
      if (keller_min_c > keller_max_c || geraet_min_c > geraet_max_c) throw new RangeError('Die Bereichsgrenzen sind vertauscht.');
      return {kalte_unterdeckung_c: round(Math.max(0, geraet_min_c - keller_min_c)),
        warme_ueberschreitung_c: round(Math.max(0, keller_max_c - geraet_max_c)),
        entzugswert_dokumentiert: passender_pruefpunkt,
        grenze: 'Ein zugelassener Betriebsbereich belegt keine Entzugsleistung. Bei anhaltender Feuchte die Ursache klären.'};
    },
    example: {args: {keller_min_c: 3, keller_max_c: 16, geraet_min_c: 5, geraet_max_c: 35, passender_pruefpunkt: false}, expect: {kalte_unterdeckung_c: 2, warme_ueberschreitung_c: 0, entzugswert_dokumentiert: false}}
  },
  {
    name: 'luftreiniger_filterstufe_wirkbereich',
    description: 'Ordne dokumentierte Filterstufen der gewünschten Aufgabe zu — Match documented purifier filter stages to the intended job',
    page: guide('luftreiniger-ratgeber'),
    properties: {
      aufgabe: choice('Gewünschte Funktion', 'grobe_fusseln', 'schwebepartikel', 'geruch', 'co2_senken'),
      vorfilter: signal('Vorfilter in der Unterlage ausgewiesen'),
      partikelfilter: signal('Partikelfilter in der Unterlage ausgewiesen'),
      aktivkohle: signal('Aktivkohle in der Unterlage ausgewiesen')
    },
    calculate({aufgabe, vorfilter, partikelfilter, aktivkohle}) {
      return {dokumentierter_ansatz: {grobe_fusseln: vorfilter, schwebepartikel: partikelfilter, geruch: aktivkohle, co2_senken: 'frischluft_erforderlich'}[aufgabe],
        grenze: 'Die Filterart allein belegt keine Reinigungsleistung im eigenen Raum.'};
    },
    example: {args: {aufgabe: 'geruch', vorfilter: 'belegt', partikelfilter: 'belegt', aktivkohle: 'offen'}, expect: {dokumentierter_ansatz: 'offen'}}
  },
  {
    name: 'luftreiniger_cadr_luefterstrom_kennzeichnung',
    description: 'Berechne die Reinluftmenge eines Betriebsabschnitts nur aus ausgewiesener Partikel-CADR — Calculate clean-air volume only from a documented particle CADR',
    page: guide('luftreiniger-ratgeber'),
    properties: {
      angabe_m3_h: number('Aufgedruckter Volumenstrom in m³/h', 0, 100000),
      kennzeichnung: choice('Wie bezeichnet die Unterlage den Wert?', 'partikel_cadr', 'luefter_durchsatz', 'offen'),
      bezug: choice('Bezieht sich der Wert auf die tatsächlich eingesetzte Gerätestufe?', 'gleiche_stufe', 'andere_stufe', 'offen'),
      abschnitt_min: number('Minuten bei der betrachteten Stufe', 0, 1440)
    },
    calculate({angabe_m3_h, kennzeichnung, bezug, abschnitt_min}) {
      const verwendbar = kennzeichnung === 'partikel_cadr' && bezug === 'gleiche_stufe';
      return {rechnerische_reinluft_m3: verwendbar ? round(angabe_m3_h * abschnitt_min / 60) : null,
        grenze: 'Bewerteter Reinluftstrom für den Prüfstoff. Keine gemessene Konzentration und kein Frischluftvolumen.'};
    },
    example: {args: {angabe_m3_h: 240, kennzeichnung: 'partikel_cadr', bezug: 'gleiche_stufe', abschnitt_min: 35}, expect: {rechnerische_reinluft_m3: 140}}
  },
  {
    name: 'oskar_zubehoer_beigabe_anleitungsversion',
    description: 'Trenne beim Oskar little die Hygiene-Beigabe in Angebot, Produktseite und EU-Anleitung — Separate Oskar little hygiene accessory listings across documents',
    page: guide('luftbefeuchter-ratgeber'),
    properties: {
      typenschild_o060: bool('Weißes Gerät anhand der Kennung O-060 identifiziert'),
      lieferbeigabe: choice('Was im konkreten Angebot ausdrücklich enthalten ist', 'hygiene_tabs', 'water_cube', 'offen'),
      pflegebeleg: choice('Was die zur angebotenen Ausführung mitgelieferte Anleitung nennt', 'hygiene_tabs', 'water_cube', 'offen')
    },
    calculate({typenschild_o060, lieferbeigabe, pflegebeleg}) {
      return {ausfuehrungsbezogen_eindeutig: typenschild_o060 && lieferbeigabe !== 'offen' && lieferbeigabe === pflegebeleg,
        grenze: 'Die Produktseite nennt Hygiene Tabs, die verlinkte EU-Anleitung einen Water Cube. Zubehör nicht allein wegen des ähnlichen Zwecks austauschen.'};
    },
    example: {args: {typenschild_o060: true, lieferbeigabe: 'hygiene_tabs', pflegebeleg: 'water_cube'}, expect: {ausfuehrungsbezogen_eindeutig: false}}
  },
  {
    name: 'beurer_lb55_kalkpad_packungswiderspruch',
    description: 'Lies die konkrete Packungsstückzahl des dokumentierten LB-55-Kalkpads — Read the actual pack quantity for the documented LB 55 scale pad',
    page: guide('luftbefeuchter-ratgeber'),
    properties: {
      modell_68605: bool('LB-55-Geräteartikel 68605 am Typenschild identifiziert'),
      zubehoer_163141: bool('Angebot zeigt Kalkpad-Artikel 163141'),
      stueckzahl_belegt: bool('Stückzahl am konkreten Packungsaufdruck belegt'),
      packungsmenge: number('Stückzahl auf der Packung, 0 wenn nicht bekannt', 0, 200)
    },
    calculate({modell_68605, zubehoer_163141, stueckzahl_belegt, packungsmenge}) {
      requireWhole(packungsmenge);
      if (stueckzahl_belegt && packungsmenge === 0) throw new RangeError('Eine belegte Packung braucht eine positive Stückzahl.');
      return {artikelzuordnung: modell_68605 && zubehoer_163141,
        belegte_packungsmenge: stueckzahl_belegt ? packungsmenge : null,
        grenze: 'Wegen widersprüchlicher Herstellerangaben zur Menge zählt hier nur der konkrete Packungsaufdruck.'};
    },
    example: {args: {modell_68605: true, zubehoer_163141: true, stueckzahl_belegt: false, packungsmenge: 10}, expect: {artikelzuordnung: true, belegte_packungsmenge: null}}
  },
  {
    name: 'ventilator_durchsatz_einheiten_stufenbezug',
    description: 'Vereinheitliche Ventilator-Durchflusswerte und prüfe den Stufenbezug — Normalize fan airflow units and check operating speed context',
    page: guide('ventilator-kaufen-ratgeber'),
    properties: {
      wert_a: number('Luftdurchsatz von Gerät A', 0, 100000),
      wert_b: number('Luftdurchsatz von Gerät B', 0, 100000),
      einheit_a: choice('Einheit A', 'm3_min', 'm3_h'),
      einheit_b: choice('Einheit B', 'm3_min', 'm3_h'),
      gleicher_stufenbezug: bool('Beide Werte haben den gleichen dokumentierten Stufenbezug')
    },
    calculate({wert_a, wert_b, einheit_a, einheit_b, gleicher_stufenbezug}) {
      return {a_m3_h: round(wert_a * (einheit_a === 'm3_min' ? 60 : 1)),
        b_m3_h: round(wert_b * (einheit_b === 'm3_min' ? 60 : 1)),
        gleicher_stufenbezug, grenze: 'Gleiche Einheit und Stufenbezug sagen nichts über Luftgeschwindigkeit am Sitzplatz aus.'};
    },
    example: {args: {wert_a: 30, wert_b: 1850, einheit_a: 'm3_min', einheit_b: 'm3_h', gleicher_stufenbezug: false}, expect: {a_m3_h: 1800, b_m3_h: 1850, gleicher_stufenbezug: false}}
  },
  {
    name: 'ventilator_timer_nachtmodus_funktionsgrenze',
    description: 'Prüfe, ob Nachtmodus und automatisches Ausschalten laut Anleitung kombinierbar sind — Check whether the fan can combine night mode and automatic shutoff',
    page: guide('ventilator-nachts-schlafen'),
    properties: {
      abschaltung_nach_min: number('Gewünschte automatische Abschaltung nach Minuten', 1, 1440),
      timer_max_min: number('Längste laut Anleitung wählbare Laufzeit, 0 ohne Timer', 0, 1440),
      timer_im_nachtmodus: signal('Timer im Nachtmodus ausdrücklich dokumentiert'),
      zeitwert_in_liste: bool('Genau dieser Abschaltwert steht in den verfügbaren Timerstufen')
    },
    calculate({abschaltung_nach_min, timer_max_min, timer_im_nachtmodus, zeitwert_in_liste}) {
      requireWhole(abschaltung_nach_min, timer_max_min);
      const zeit_im_bereich = abschaltung_nach_min <= timer_max_min;
      return {zeit_im_bereich, kombinierbar: zeit_im_bereich && zeitwert_in_liste && timer_im_nachtmodus === 'belegt',
        grenze: 'Ein vorhandener Nachtmodus bestätigt keine automatische Abschaltung zu einer frei wählbaren Zeit.'};
    },
    example: {args: {abschaltung_nach_min: 90, timer_max_min: 240, timer_im_nachtmodus: 'belegt', zeitwert_in_liste: false}, expect: {zeit_im_bereich: true, kombinierbar: false}}
  },
  {
    name: 'pinguino_ex105_fensterkit_angebotsumfang',
    description: 'Trenne beim PAC EX105 den Geräte-Lieferumfang von einer zusätzlich angebotenen Fensterabdichtung — Verify whether a PAC EX105 offer adds the required window seal',
    page: guide('pinguino-pac-ex105-test'),
    properties: {
      modell_ex105: signal('Vollständige Modellbezeichnung PAC EX105 im Angebot bestätigt'),
      bietet_fensterabdichtung: signal('Der Händler nennt ausdrücklich eine Fensterabdichtung im Paket'),
      vorhandener_fenstertyp: choice('Fensterbauart am vorgesehenen Platz', 'dreh_kipp', 'schiebe', 'dach', 'offen'),
      kit_fenstertyp: choice('Vom Zubehörhersteller für das enthaltene Set benannte Bauart', 'dreh_kipp', 'schiebe', 'dach', 'offen')
    },
    calculate({modell_ex105, bietet_fensterabdichtung, vorhandener_fenstertyp, kit_fenstertyp}) {
      const bauart_abgleich = vorhandener_fenstertyp !== 'offen' && vorhandener_fenstertyp === kit_fenstertyp;
      return {zusatz_und_bauart_dokumentiert: modell_ex105 === 'belegt' && bietet_fensterabdichtung === 'belegt' && bauart_abgleich,
        grenze: 'Der Ratgeber beschreibt beim Gerätepaket keine Fensterabdichtung. Angebote mit zusätzlichem Kit separat und anhand der Fenstermaße prüfen.'};
    },
    example: {args: {modell_ex105: 'belegt', bietet_fensterabdichtung: 'belegt', vorhandener_fenstertyp: 'dach', kit_fenstertyp: 'dreh_kipp'}, expect: {zusatz_und_bauart_dokumentiert: false}}
  },
  {
    name: 'fritz_302_router_firmware_mindeststand',
    description: 'Prüfe die angegebenen DECT- und Firmwarevoraussetzungen für den FRITZ!Smart Thermo 302 — Check the documented DECT and firmware requirements for Thermo 302',
    page: guide('smarte-heizkoerperthermostate-lohnen-sich'),
    properties: {
      router: choice('Typbezeichnung der vorhandenen Box', '7312', '7412', 'anderes_fritz_modell', 'offen'),
      dect_basis: signal('Vorhandene integrierte DECT-Basis der Box'),
      firmware_hauptversion: number('Erste Zahl von FRITZ!OS, beispielsweise 6 bei 6.83', 0, 100),
      firmware_nebenversion: number('Zweite Zahl von FRITZ!OS, beispielsweise 83 bei 6.83', 0, 999)
    },
    calculate({router, dect_basis, firmware_hauptversion, firmware_nebenversion}) {
      requireWhole(firmware_hauptversion, firmware_nebenversion);
      const mindeststand = firmware_hauptversion > 6 || (firmware_hauptversion === 6 && firmware_nebenversion >= 83);
      return {firmware_mindeststand_erreicht: mindeststand,
        basisanforderungen_erfuellt: mindeststand && dect_basis === 'belegt' && router === 'anderes_fritz_modell',
        router_ausgenommen: router === '7312' || router === '7412',
        grenze: 'Die Prüfung des Routers sagt nichts über die Passung am Ventil aus.'};
    },
    example: {args: {router: 'anderes_fritz_modell', dect_basis: 'belegt', firmware_hauptversion: 6, firmware_nebenversion: 82}, expect: {firmware_mindeststand_erreicht: false, basisanforderungen_erfuellt: false}}
  },
  {
    name: 'bosch_ii_m_thread_zusatzbaustein',
    description: 'Ermittle den noch fehlenden Baustein für die direkte Matter-Einbindung beim Bosch II [+M] — Identify the missing component for direct Matter setup of Bosch II [+M]',
    page: guide('smarte-heizkoerperthermostate-lohnen-sich'),
    properties: {
      plus_m_am_angebot: signal('Das Angebot nennt die [+M]-Variante ausdrücklich'),
      matter_controller_eingerichtet: bool('Matter Controller und dessen App sind bereits eingerichtet'),
      controller_thread: signal('Der Controller hat integrierte Thread-Kommunikation'),
      externer_border_router: signal('Passender separater Thread Border Router bestätigt')
    },
    calculate({plus_m_am_angebot, matter_controller_eingerichtet, controller_thread, externer_border_router}) {
      const pruefpunkte = [];
      if (plus_m_am_angebot !== 'belegt') pruefpunkte.push('Variante [+M] am Angebot prüfen');
      if (!matter_controller_eingerichtet) pruefpunkte.push('Matter Controller und App einrichten');
      if (controller_thread !== 'belegt' && externer_border_router !== 'belegt') pruefpunkte.push('Thread-Kommunikation prüfen, gegebenenfalls Thread Border Router erforderlich');
      return {offene_pruefpunkte: pruefpunkte, dokumentationscheck_vollstaendig: pruefpunkte.length === 0,
        grenze: 'Funktionsumfang im gewählten System und Ventilfreigabe separat prüfen.'};
    },
    example: {args: {plus_m_am_angebot: 'belegt', matter_controller_eingerichtet: true, controller_thread: 'ausgeschlossen', externer_border_router: 'offen'}, expect: {dokumentationscheck_vollstaendig: false}}
  },
  {
    name: 'thermo_vorhang_packungsbreite_abdeckung',
    description: 'Rechne aus Artikelmaß und Stückzahl die Stoffabdeckung eines Vorhangsets — Calculate curtain coverage from the listed size and pack quantity',
    page: guide('thermovorhang-ratgeber'),
    properties: {
      etikettbreite_cm: number('Aufgedruckte Breite', 1, 2000),
      etikett_bezug: choice('Worauf bezieht sich die aufgedruckte Breite?', 'ein_schal', 'ganzes_set', 'offen'),
      schals_im_set: number('Anzahl Schals laut Packung', 1, 30),
      zielbreite_cm: number('Zu bedeckende Breite einschließlich selbst geplanter seitlicher Zugaben', 1, 5000),
      stofffaktor: number('Gewählte Stoffbreite je cm wirksamer Breite einschließlich gewünschter Falten', 1, 5)
    },
    calculate({etikettbreite_cm, etikett_bezug, schals_im_set, zielbreite_cm, stofffaktor}) {
      requireWhole(schals_im_set);
      const stoffbreite = etikettbreite_cm * (etikett_bezug === 'ein_schal' ? schals_im_set : 1);
      return {stoffbedarf_cm: round(zielbreite_cm * stofffaktor),
        reststoff_cm: etikett_bezug === 'offen' ? null : round(stoffbreite - zielbreite_cm * stofffaktor),
        grenze: 'Nur ein Maßabgleich. Wandabstand, Befestigung, Durchgang und freie Heizkörper vor Ort prüfen.'};
    },
    example: {args: {etikettbreite_cm: 140, etikett_bezug: 'ein_schal', schals_im_set: 2, zielbreite_cm: 200, stofffaktor: 1.5}, expect: {stoffbedarf_cm: 300, reststoff_cm: -20}}
  },
  {
    name: 'thermovorhang_pflegeetikett_verfahren',
    description: 'Vergleiche die gewünschte Reinigungsart mit dem Pflegeetikett des Vorhangs — Match curtain cleaning needs to the care label',
    page: guide('thermovorhang-ratgeber'),
    properties: {
      benoetigte_pflege: choice('Reinigungsart, die zu Hause möglich und gewünscht ist', 'maschine', 'handwaesche'),
      etikett: choice('Klar lesbare Waschfreigabe', 'maschinenwaesche', 'nur_handwaesche', 'nicht_waschen', 'offen'),
      temperatur_c: number('Geplante Waschtemperatur in °C', 1, 95),
      maximum_c: number('Vermerkte Höchsttemperatur in °C, 0 ohne Angabe', 0, 95)
    },
    calculate({benoetigte_pflege, etikett, temperatur_c, maximum_c}) {
      const verfahren_belegt = benoetigte_pflege === 'maschine' ? etikett === 'maschinenwaesche' : etikett === 'nur_handwaesche';
      return {verfahren_belegt, temperatur_im_etikettrahmen: maximum_c === 0 ? null : temperatur_c <= maximum_c,
        grenze: 'Gerätespezifisches Waschprogramm, Material und Aufhängung separat prüfen.'};
    },
    example: {args: {benoetigte_pflege: 'maschine', etikett: 'nur_handwaesche', temperatur_c: 30, maximum_c: 30}, expect: {verfahren_belegt: false, temperatur_im_etikettrahmen: true}}
  },
  {
    name: 'lb200_ziellicht_betriebshinweis',
    description: 'Lies beim Beurer LB 200 die Anzeige ohne leuchtenden Zielwert richtig — Interpret the Beurer LB 200 with no target light',
    page: guide('luftbefeuchter-ratgeber'),
    properties: {
      geraeteartikel_10069: bool('Die Typkennzeichnung bestätigt Beurer LB 200, Geräteartikel 10069'),
      dauert_betrieb_an: bool('Gerät ist laut Anzeige/Beobachtung weiterhin im normalen Betrieb'),
      licht: choice('Welcher Zielwert leuchtet?', '40', '50', '60', 'kein_zielwert', 'unklar')
    },
    calculate({geraeteartikel_10069, dauert_betrieb_an, licht}) {
      let anleitungsgrenze_prozent = null;
      if (geraeteartikel_10069 && dauert_betrieb_an && licht !== 'unklar') {
        anleitungsgrenze_prozent = licht === 'kein_zielwert' ? 70 : Number(licht);
      }
      return {anleitungsgrenze_prozent, grenze: 'Zielanzeige und beobachtete Raumfeuchte unterscheiden. Bei fehlendem Ziellicht nicht auf „aus“ schließen.'};
    },
    example: {args: {geraeteartikel_10069: true, dauert_betrieb_an: true, licht: 'kein_zielwert'}, expect: {anleitungsgrenze_prozent: 70}}
  },
  {
    name: 'lb55_dampfstufe_mengenbezug',
    description: 'Rechne die deklarierte Dampfstufe des Beurer LB 55 auf eine geplante Laufzeit um — Convert the documented LB 55 steam setting to a runtime quantity',
    page: guide('luftbefeuchter-ratgeber'),
    properties: {
      artikel_68605: bool('Art.-Nr. 68605 des Beurer LB 55 am konkreten Gerät abgeglichen'),
      dampfstufe: choice('Auf der Geräteanleitung ausgewiesene Stufe', '200_ml_h', '400_ml_h'),
      laufminuten: number('Vorgesehene aktive Laufzeit in Minuten', 0, 1440)
    },
    calculate({artikel_68605, dampfstufe, laufminuten}) {
      const ml_je_stunde = dampfstufe === '200_ml_h' ? 200 : 400;
      return {nennmenge_ml: artikel_68605 ? round(ml_je_stunde * laufminuten / 60) : null,
        grenze: 'Die Mengenrechnung ist kein Feuchteziel oder gemessener Raumwert. Bedarf separat messen und Pflege berücksichtigen.'};
    },
    example: {args: {artikel_68605: true, dampfstufe: '200_ml_h', laufminuten: 45}, expect: {nennmenge_ml: 150}}
  },
  {
    name: 'befeuchter_nennwatt_abgabeleistung_bezug',
    description: 'Prüfe, ob Wasserabgabe und Watt eines Luftbefeuchters aus derselben Betriebsstufe stammen und zur Effizienzrechnung taugen — Check whether humidifier output and power are comparable',
    page: guide('luftbefeuchter-stromverbrauch'),
    properties: {
      gemessene_wasserabgabe_ml_h: number('Dokumentierte abgegebene Wassermenge in ml/h', 1, 20000),
      elektrische_leistung_w: number('Dokumentierte Leistungsaufnahme in W', 1, 5000),
      gleiche_stufe_bedingung: bool('Beide Werte stammen aus derselben dokumentierten Stufe unter denselben Bedingungen')
    },
    calculate({gemessene_wasserabgabe_ml_h, elektrische_leistung_w, gleiche_stufe_bedingung}) {
      return {ml_pro_wh: gleiche_stufe_bedingung ? round(gemessene_wasserabgabe_ml_h / elektrische_leistung_w) : null,
        grenze: 'Nennwatt und Wasserabgabe aus getrennten Prüfungen belegen keine Effizienz. Abgabewert sagt nichts über den Bedarf im Raum.'};
    },
    example: {args: {gemessene_wasserabgabe_ml_h: 400, elektrische_leistung_w: 365, gleiche_stufe_bedingung: false}, expect: {ml_pro_wh: null}}
  },
  {
    name: 'saugwischer_vortrieb_arbeitsrichtung_beleg',
    description: 'Prüfe, ob Vortrieb die benötigte Arbeitsrichtung am Boden abdeckt — Check whether floor washer assistance covers the required direction',
    page: guide('saugwischer-kaufberatung'),
    properties: {
      modell: choice('Genaue Variante laut Angebot', 's7_flashdry', 'anderes'),
      vorgang: choice('Gesuchte Unterstützung', 'schieben', 'ziehen', 'beides', 'tragen'),
      angebot_variante_bestaetigt: bool('Vollständige Modellbezeichnung mit Anleitung abgeglichen')
    },
    calculate({modell, vorgang, angebot_variante_bestaetigt}) {
      const beleg = modell === 's7_flashdry' && angebot_variante_bestaetigt;
      return {status: vorgang === 'tragen' ? 'kein_vortrieb_beim_tragen' : beleg ? 'beide_richtungen_beschrieben' : 'modellbezogen_nachlesen',
        grenze: 'Vortrieb ist eine Funktion beim Führen; er beziffert weder nötige Handkraft noch Trageaufwand.'};
    },
    example: {args: {modell: 's7_flashdry', vorgang: 'ziehen', angebot_variante_bestaetigt: true}, expect: {status: 'beide_richtungen_beschrieben'}}
  },
  {
    name: 'saugwischer_selbstreinigung_restpflicht_lesen',
    description: 'Ermittle verbleibende manuelle Pflichtschritte trotz Selbstreinigungsmodus — Find manual steps still documented for a self-cleaning floor washer',
    page: guide('saugwischer-kaufberatung'),
    properties: {
      modell: choice('Genaue Modellvariante mit passender Anleitung', 's7_flashdry', 'h14_pro', 'f25_xt_ace_unterlage', 'andere'),
      pflegebereich: choice('Zu prüfender manueller Arbeitsschritt', 'schmutzwassertank', 'filter_wiedereinsetzen', 'schmutzwasserleitung')
    },
    calculate({modell, pflegebereich}) {
      const schritte = {
        s7_flashdry: {schmutzwassertank: 'Schmutzwassertank nach jedem Gebrauch reinigen.'},
        h14_pro: {schmutzwassertank: 'Tank nach der Nutzung sowie vor und nach der Selbstreinigung reinigen.', filter_wiedereinsetzen: 'Gewaschenen Filter erst vollständig trocken wieder einsetzen.'},
        f25_xt_ace_unterlage: {schmutzwassertank: 'Manuelle Tankpflege in der zur XT-Ausführung gehörenden Anleitung prüfen.', schmutzwasserleitung: 'ACE-Anleitung beschreibt manuelle Leitungspflege. Für gelieferte XT-Ausführung prüfen.'}
      };
      return {pflegehinweis: schritte[modell]?.[pflegebereich] ?? 'Schritt in der Anleitung der konkreten Ausführung prüfen.',
        grenze: 'Eine fehlende Angabe in dieser Übersicht hebt keine Pflegepflicht auf.'};
    },
    example: {args: {modell: 'h14_pro', pflegebereich: 'filter_wiedereinsetzen'}, expect: {pflegehinweis: 'Gewaschenen Filter erst vollständig trocken wieder einsetzen.'}}
  },
  {
    name: 'trockner_programmdauer_lastvergleich_lesen',
    description: 'Stelle Label-Programmdauern nur für gleiche Lastbezüge gegenüber — Compare dryer label cycle duration only for matching loads',
    page: '/geraete-austausch-rechner.html',
    properties: {
      minuten_a: number('Dokumentierte Programmdauer A in Minuten', 1, 1440),
      minuten_b: number('Dokumentierte Programmdauer B in Minuten', 1, 1440),
      prueflast_a_kg: number('Masse der ausgewiesenen Prüfladung A in kg', 0.1, 50),
      prueflast_b_kg: number('Masse der ausgewiesenen Prüfladung B in kg', 0.1, 50),
      gleiches_programm_und_pruefverfahren: bool('Gleiches Programmziel und Prüfverfahren dokumentiert')
    },
    calculate({minuten_a, minuten_b, prueflast_a_kg, prueflast_b_kg, gleiches_programm_und_pruefverfahren}) {
      const vergleichbar = prueflast_a_kg === prueflast_b_kg && gleiches_programm_und_pruefverfahren;
      return {vergleichbar, differenz_b_minus_a_min: vergleichbar ? minuten_b - minuten_a : null,
        grenze: 'Programmdauer ist kein Maß für Stromverbrauch, und eigene Laufzeiten können abweichen.'};
    },
    example: {args: {minuten_a: 165, minuten_b: 190, prueflast_a_kg: 8, prueflast_b_kg: 9, gleiches_programm_und_pruefverfahren: true}, expect: {vergleichbar: false, differenz_b_minus_a_min: null}}
  },
  {
    name: 'luftwaescher_partikelnachweis_unterlage',
    description: 'Prüfe die Art des Partikelnachweises hinter dem Begriff Luftwäscher — Check the type of particulate evidence behind an air washer claim',
    page: guide('luftbefeuchter-ratgeber'),
    properties: {
      werbebegriff: choice('Was steht auf der Werbung?', 'luftwaescher', 'befeuchter', 'kombigeraet'),
      belegart: choice('Herstellerunterlage für Partikelreinigung', 'nur_befeuchtungsdaten', 'filter_bezeichnung', 'gemessener_cadr', 'offen'),
      gleiches_modell_und_betrieb: bool('Partikelwert dem Modell und vorgesehenen Betriebsmodus zugeordnet')
    },
    calculate({werbebegriff, belegart, gleiches_modell_und_betrieb}) {
      return {partikel_abgabe_dokumentiert: belegart === 'gemessener_cadr' && gleiches_modell_und_betrieb,
        dokument_luecke: belegart === 'nur_befeuchtungsdaten' && werbebegriff !== 'befeuchter' ? 'separater_partikelpruefwert_fehlt' : null,
        grenze: 'Die Produktbezeichnung belegt keine Partikelreinigung. Befeuchtungsbedarf, gemessene Raumfeuchte und Lüftung getrennt prüfen.'};
    },
    example: {args: {werbebegriff: 'luftwaescher', belegart: 'nur_befeuchtungsdaten', gleiches_modell_und_betrieb: true}, expect: {partikel_abgabe_dokumentiert: false, dokument_luecke: 'separater_partikelpruefwert_fehlt'}}
  },
  {
    name: 'infrarot_panel_abschaltfunktion_unterlagen',
    description: 'Trenne die drei dokumentierten Abschaltfunktionen eines Standpanels — Distinguish the three documented shutoff functions on a freestanding panel',
    page: guide('infrarotheizung-standgeraet'),
    properties: {
      gewuenschte_abschaltung: choice('Wodurch soll das Gerät für den eigenen Ablauf abschalten?', 'temperatur', 'zeit', 'kippen'),
      thermostat: signal('Temperaturabhängige Abschaltung laut Hersteller'),
      zeitschaltung: signal('Zeitabhängige Abschaltung laut Hersteller'),
      kippschutz: signal('Kippabhängige Abschaltung laut Hersteller')
    },
    calculate({gewuenschte_abschaltung, thermostat, zeitschaltung, kippschutz}) {
      return {funktionsbeleg: {temperatur: thermostat, zeit: zeitschaltung, kippen: kippschutz}[gewuenschte_abschaltung],
        grenze: 'Die Angabe zu einer Abschaltfunktion ersetzt nicht die zur jeweils anderen Funktion. Die Modellanleitung für den Aufstellort lesen.'};
    },
    example: {args: {gewuenschte_abschaltung: 'zeit', thermostat: 'belegt', zeitschaltung: 'offen', kippschutz: 'belegt'}, expect: {funktionsbeleg: 'offen'}}
  },
  {
    name: 'ventilator_montageart_dokument_wahl',
    description: 'Finde anhand der Bauart die richtige Maßzeichnung für einen Ventilatorvergleich — Identify the right dimension drawing by fan design',
    page: guide('ventilator-kaufen-ratgeber'),
    properties: {
      ventilator_typ: choice('Bauart des genauen Modells', 'tisch', 'stand', 'turm', 'decke', 'akku'),
      angegebene_abmessung: choice('Welche Zeichnung liegt vor?', 'standfuss', 'montage', 'transportmass', 'rotordurchmesser', 'offen'),
      mobile_ablage: bool('Das Akkugerät soll auf einer vorhandenen Ablage stehen')
    },
    calculate({ventilator_typ, angegebene_abmessung, mobile_ablage}) {
      const dokumente = {decke: 'montage', tisch: 'standfuss', stand: 'standfuss', turm: 'standfuss', akku: mobile_ablage ? 'standfuss' : 'transportmass'};
      const benoetigt = dokumente[ventilator_typ];
      return {passendes_bezugsdokument: angegebene_abmessung === benoetigt, benoetigte_zeichnung: benoetigt,
        grenze: 'Die Wahl der Zeichnung bestätigt weder Platzbedarf im Betrieb noch Eignung des Montageorts.'};
    },
    example: {args: {ventilator_typ: 'decke', angegebene_abmessung: 'rotordurchmesser', mobile_ablage: false}, expect: {passendes_bezugsdokument: false, benoetigte_zeichnung: 'montage'}}
  }
];
