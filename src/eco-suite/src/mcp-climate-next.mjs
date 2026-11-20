const number = (description, minimum, maximum) => ({type: 'number', description, minimum, maximum});
const choice = (description, ...values) => ({type: 'string', description, enum: values});
const flag = description => ({type: 'boolean', description});
const approval = description => choice(description, 'ja', 'nein', 'unbekannt');
const guide = slug => '/guide/' + slug + '.html';
const round = (value, digits = 2) => Number(value.toFixed(digits));
const roomTemp = description => number(description, -10, 65);
const dba = description => number(description, 10, 130);

function aboveThreshold(start, end) {
  if (start <= 0 && end <= 0) return {fraction: 0, degreeFraction: 0};
  if (start >= 0 && end >= 0) return {fraction: 1, degreeFraction: (start + end) / 2};
  const peak = Math.max(start, end);
  const fraction = peak / Math.abs(end - start);
  return {fraction, degreeFraction: peak * fraction / 2};
}

export const climateNext = [
  {
    name: 'klimageraet_geraeusch_hintergrund',
    description: 'Geräuschanteil eines laufenden Klimageräts bei bekanntem Hintergrund abschätzen — Estimate the unit contribution from matched on/off sound recordings.',
    page: guide('mobile-klimaanlage-zu-laut'),
    properties: {
      an_dba: dba('Energieäquivalenter A-bewerteter Schalldruckpegel mit Gerät (LAeq).'),
      aus_dba: dba('Hintergrundpegel ohne Gerät (LAeq) am gleichen Ort.'),
      gleicher_hintergrund: flag('Gleiche Messdauer, Position, Raum und gleichbleibende Hintergrundgeräusche?'),
    },
    calculate({an_dba, aus_dba, gleicher_hintergrund}) {
      const difference = an_dba - aus_dba;
      const usable = gleicher_hintergrund && difference >= 3;
      return {
        differenz_db: round(difference), schaetzung_dba: usable ? round(an_dba + 10 * Math.log10(1 - 10 ** (-difference / 10))) : null,
        hinweis: 'Energetische Subtraktion für unabhängigen, gleichbleibenden Hintergrund. Unter drei dB Abstand wird keine Schätzung ausgegeben. Keine Schallleistungsangabe und kein Nachweis eines Grenzwerts.',
      };
    },
    example: {args: {an_dba: 55, aus_dba: 45, gleicher_hintergrund: true}, expect: {schaetzung_dba: 54.54}},
  },
  {
    name: 'klimageraet_geraeusch_zeitmittel',
    description: 'Gemessene leisere und lautere Betriebsabschnitte energetisch mitteln — Combine distinct sound measurement periods into one time-weighted LAeq.',
    page: guide('mobile-klimaanlage-zu-laut'),
    properties: {
      a_dba: dba('LAeq des ersten zusammenhängenden Betriebsabschnitts.'),
      b_dba: dba('LAeq des zweiten, nicht überlappenden Abschnitts am gleichen Messort.'),
      minuten_a: number('Dauer des ersten Abschnitts in Minuten.', 0.1, 1440),
      minuten_b: number('Dauer des zweiten Abschnitts in Minuten.', 0.1, 1440),
      gleiche_messposition: flag('Dasselbe Messgerät, dieselbe A-Bewertung und gleiche Position?'),
    },
    calculate({a_dba, b_dba, minuten_a, minuten_b, gleiche_messposition}) {
      const minutes = minuten_a + minuten_b;
      const energy = (minuten_a * 10 ** (a_dba / 10) + minuten_b * 10 ** (b_dba / 10)) / minutes;
      return {
        betrachtete_minuten: round(minutes), laeq_dba: gleiche_messposition ? round(10 * Math.log10(energy)) : null,
        hinweis: 'Abschnitte energetisch und nach Dauer gewichtet. Impulse, Aufwachereignisse und einzelne Maximalpegel bleiben separat.',
      };
    },
    example: {args: {a_dba: 40, b_dba: 50, minuten_a: 30, minuten_b: 30, gleiche_messposition: true}, expect: {laeq_dba: 47.4}},
  },
  {
    name: 'schlafzimmer_hitzestunden_messreihe',
    description: 'Dauer über einem selbst gesetzten Temperaturziel aus vier Nachtmessungen abschätzen — Estimate hot hours and degree-hours from four equally spaced readings.',
    page: guide('bei-hitze-schlafen'),
    properties: {
      start_c: roomTemp('Erster Messwert in °C.'),
      danach_c: roomTemp('Zweiter Messwert in °C.'),
      spaeter_c: roomTemp('Dritter Messwert in °C.'),
      ende_c: roomTemp('Vierter Messwert in °C.'),
      intervall_min: number('Gleich großer Zeitabstand in Minuten zwischen allen aufeinanderfolgenden Messungen.', 1, 240),
      ziel_c: roomTemp('Eigener Vergleichswert in °C, kein Gesundheits- oder Sicherheitswert.'),
    },
    calculate({start_c, danach_c, spaeter_c, ende_c, intervall_min, ziel_c}) {
      const values = [start_c, danach_c, spaeter_c, ende_c].map(value => value - ziel_c);
      const segments = values.slice(1).map((end, index) => aboveThreshold(values[index], end));
      return {
        stunden_darueber: round(segments.reduce((sum, segment) => sum + segment.fraction, 0) * intervall_min / 60),
        gradstunden_darueber: round(segments.reduce((sum, segment) => sum + segment.degreeFraction, 0) * intervall_min / 60),
        hoechster_messwert_c: Math.max(start_c, danach_c, spaeter_c, ende_c),
        hinweis: 'Lineare Verbindung zwischen vier Messwerten. Nicht erfasste Spitzen oder Messlücken sind nicht abgebildet.',
      };
    },
    example: {args: {start_c: 28, danach_c: 26, spaeter_c: 24, ende_c: 22, intervall_min: 60, ziel_c: 25}, expect: {stunden_darueber: 1.5, gradstunden_darueber: 2.25}},
  },
  {
    name: 'schlafplatz_luftstrom_messen',
    description: 'Luftgeschwindigkeit am Schlafplatz vor und nach Umstellen des Geräts vergleichen — Compare measured bed-level air speed after changing airflow direction.',
    page: guide('klimaanlage-zugluft-nackenschmerzen'),
    properties: {
      zuvor_m_s: number('Gemittelte Luftgeschwindigkeit am selben Schlafplatz in m/s vor der Änderung.', 0, 20),
      danach_m_s: number('Gemittelte Luftgeschwindigkeit dort nach der Änderung in m/s.', 0, 20),
      einzel_fehler_m_s: number('Absoluter Toleranzbetrag pro Messung in m/s.', 0, 5),
      gleicher_modus: flag('Gleiche Lüfterstufe, Fensterstellungen, Messposition und ausreichend lange Messdauer?'),
    },
    calculate({zuvor_m_s, danach_m_s, einzel_fehler_m_s, gleicher_modus}) {
      const difference = zuvor_m_s - danach_m_s;
      const separated = gleicher_modus && Math.abs(difference) > 2 * einzel_fehler_m_s;
      return {
        weniger_m_s: round(difference, 3),
        befund: separated ? (difference > 0 ? 'schwaecher' : 'staerker') : 'kein_eindeutiger_vergleich',
        hinweis: 'Nur Vergleich der gemessenen Strömung am Schlafplatz. Erfasst keine Komfort-, Gesundheits- oder Sicherheitsgrenze.',
      };
    },
    example: {args: {zuvor_m_s: 0.6, danach_m_s: 0.2, einzel_fehler_m_s: 0.05, gleicher_modus: true}, expect: {weniger_m_s: 0.4, befund: 'schwaecher'}},
  },
  {
    name: 'balkon_schattenkante_schaetzen',
    description: 'Seitlichen Versatz der Schattenkante einer waagerechten Verschattung abschätzen — Project a balcony shade edge at a known solar elevation.',
    page: guide('balkon-terrasse-beschatten'),
    properties: {
      hoehenabstand_m: number('Senkrechter Abstand zwischen Schattenkante oben und Ziel-Ebene in Metern.', 0.1, 10),
      sonnenhoehe_grad: number('Sonnenhöhe über dem Horizont in Grad für Datum und Uhrzeit.', 2, 90),
    },
    calculate({hoehenabstand_m, sonnenhoehe_grad}) {
      return {
        versatz_von_kante_m: round(hoehenabstand_m / Math.tan(sonnenhoehe_grad * Math.PI / 180)),
        hinweis: 'Versatz in Richtung weg von der Sonne auf einer waagerechten Fläche. Sonnenrichtung, seitliche Begrenzung und Befestigung separat prüfen. Keine statische Beurteilung.',
      };
    },
    example: {args: {hoehenabstand_m: 2, sonnenhoehe_grad: 45}, expect: {versatz_von_kante_m: 2}},
  },
  {
    name: 'sonnenschutzfolie_glasfreigabe',
    description: 'Vor dem Kauf einer Sonnenschutzfolie Glasaufbau und Herstellerfreigabe abgleichen — Screen glazing and installation-side evidence for a solar film.',
    page: guide('hitzeschutz-fenster'),
    properties: {
      glasaufbau_bekannt: flag('Aufbau, Beschichtung und Scheibentyp identifiziert?'),
      seite: choice('Vorgesehene Seite.', 'innen', 'aussen', 'unbekannt'),
      freigabe: approval('Schriftlicher Abgleich des konkreten Folienprodukts mit Glasaufbau und Montageseite?'),
    },
    calculate({glasaufbau_bekannt, seite, freigabe}) {
      const status = freigabe === 'nein' ? 'andere_variante' :
        glasaufbau_bekannt && seite !== 'unbekannt' && freigabe === 'ja' ? 'dokumentation_liegt_vor' : 'freigabe_klaeren';
      return {status, hinweis: 'Dokumentation für Glas und Folie, Garantie und örtliche Zuständigkeit abgleichen. Eine pauschale Empfehlung aus einer Glasanzahl wäre keine Materialfreigabe.'};
    },
    example: {args: {glasaufbau_bekannt: true, seite: 'innen', freigabe: 'unbekannt'}, expect: {status: 'freigabe_klaeren'}},
  },
  {
    name: 'dachfenster_schwenkraum_rechnen',
    description: 'Engste Stelle zwischen Dachfenster-Bewegungsraum und montierter Abdichtung prüfen — Check the measured roof-window swing envelope before adding a seal frame.',
    page: guide('klimaanlage-dachfenster'),
    properties: {
      restspalt_mm: number('Kleinster gemessener freier Abstand am geplanten Montageort über den gesamten erlaubten Öffnungsweg.', 0, 500),
      aufbau_mm: number('Gesamte Aufbauhöhe am selben Punkt inklusive Rahmen, Befestigung und auftragender Teile.', 0, 500),
      reserve_mm: number('Geforderter zusätzlicher Bewegungsabstand aus Handbuch oder Montageplanung.', 0, 500),
    },
    calculate({restspalt_mm, aufbau_mm, reserve_mm}) {
      const remaining = restspalt_mm - aufbau_mm;
      return {
        frei_nach_aufbau_mm: round(remaining), reserve_geometrisch_erreicht: remaining >= reserve_mm,
        hinweis: 'Prüft nur den angegebenen Abstand am engsten Punkt. Verschluss, Befestigung, Lüftungs- und Fluchtfunktion nach Herstellerunterlagen separat prüfen.',
      };
    },
    example: {args: {restspalt_mm: 35, aufbau_mm: 22, reserve_mm: 10}, expect: {frei_nach_aufbau_mm: 13, reserve_geometrisch_erreicht: true}},
  },
  {
    name: 'raum_temperaturschichtung_messen',
    description: 'Temperaturunterschied zwischen Bodennähe und Kopfhöhe aus Vergleichsmessungen erkennen — Check for a vertical air temperature gradient at one indoor location.',
    page: guide('infrarotheizung-decke-oder-wand'),
    properties: {
      unten_c: roomTemp('Gleichzeitig gemessene Lufttemperatur unten in °C.'),
      oben_c: roomTemp('Gleichzeitig gemessene obere Lufttemperatur in °C.'),
      hoehenabstand_m: number('Senkrechter Abstand beider Messpunkte in Metern.', 0.1, 15),
      fehler_je_c: number('Absoluter Messfehler pro Thermometer in °C.', 0, 5),
    },
    calculate({unten_c, oben_c, hoehenabstand_m, fehler_je_c}) {
      const delta = oben_c - unten_c;
      return {
        oben_minus_unten_k: round(delta), gradient_k_m: round(delta / hoehenabstand_m),
        groesser_als_messspielraum: Math.abs(delta) > 2 * fehler_je_c,
        hinweis: 'Gleicher Raum, gleiche Zeit und ohne direkt bestrahlte Sensoren. Luftmessungen beschreiben keine Strahlungstemperatur oder Komfortgarantie.',
      };
    },
    example: {args: {unten_c: 19, oben_c: 22, hoehenabstand_m: 1.5, fehler_je_c: 0.3}, expect: {gradient_k_m: 2, groesser_als_messspielraum: true}},
  },
  {
    name: 'klima_zu_und_rueckluft_messen',
    description: 'Gemessene Temperaturspreizung zwischen Ansaug- und Ausblasluft im Kühlbetrieb einordnen — Estimate supply-to-return temperature difference from paired AC readings.',
    page: guide('mobile-klimaanlage-kuehlt-nicht'),
    properties: {
      rueckluft_c: roomTemp('Luft vor dem Ansaugpunkt in °C, nicht die Raumtemperatur anderswo.'),
      zuluft_c: roomTemp('Zeitgleich gemessene Ausblasluft in °C. Messfühler außen halten.'),
      fehler_je_c: number('Absoluter Fehler je Messung in °C.', 0, 5),
      stabiler_kuehlmodus: flag('Stabiler Kühlbetrieb gemäß Handbuch, keine reine Lüfterstufe und kein gerade wechselnder Zustand?'),
    },
    calculate({rueckluft_c, zuluft_c, fehler_je_c, stabiler_kuehlmodus}) {
      const delta = rueckluft_c - zuluft_c;
      return {
        spreizung_k: round(delta), messintervall_k: [round(delta - 2 * fehler_je_c), round(delta + 2 * fehler_je_c)],
        abkuehlung_messbar: stabiler_kuehlmodus ? delta > 2 * fehler_je_c : null,
        hinweis: 'Nur lokale Luftmessung. Ohne Volumenstrom, Feuchte und Prüfbedingungen keine Kühlleistungs- oder Defektdiagnose.',
      };
    },
    example: {args: {rueckluft_c: 26, zuluft_c: 14, fehler_je_c: 0.5, stabiler_kuehlmodus: true}, expect: {spreizung_k: 12, messintervall_k: [11, 13], abkuehlung_messbar: true}},
  },
  {
    name: 'klima_waermeabgabe_kreislauf',
    description: 'Abgeführte Wärme und elektrische Aufnahme zu einer idealen Warmseitenbilanz zusammenführen — Estimate hot-side heat rejection from matched cooling capacity and electrical input.',
    page: guide('raum-ohne-fenster-kuehlen'),
    properties: {
      kaelteleistung_w: number('Vom Kältekreislauf abgeführte Nutzwärme in Watt am angegebenen Betriebspunkt.', 0, 30000),
      aufnahme_w: number('Elektrische Aufnahme der bilanzierten Einheit in Watt am gleichen Betriebspunkt.', 0, 30000),
      gleicher_betriebspunkt: flag('Leistungswerte gleichzeitig oder aus demselben Hersteller-Prüfpunkt?'),
    },
    calculate({kaelteleistung_w, aufnahme_w, gleicher_betriebspunkt}) {
      return {
        idealisierte_warmseitenlast_w: gleicher_betriebspunkt ? round(kaelteleistung_w + aufnahme_w) : null,
        hinweis: 'Stationäre Energiebilanz unter Vernachlässigung sonstiger Wärmewege. Keine Schlauch-, Gebäude- oder Installationsfreigabe. Bei vom Raum getrennter Warmseite auf dieselbe Bilanzgrenze achten.',
      };
    },
    example: {args: {kaelteleistung_w: 2500, aufnahme_w: 1000, gleicher_betriebspunkt: true}, expect: {idealisierte_warmseitenlast_w: 3500}},
  },
  {
    name: 'klimaanlage_mietwohnung_unterlagencheck',
    description: 'Fehlende Unterlagen für die geplante Klimaanlagen-Aufstellung in einer Mietwohnung erfassen — Identify missing model, placement and approval documents before an installation decision.',
    page: guide('klimaanlage-mietwohnung'),
    properties: {
      eingriff: choice('Geplanter Eingriff in Fenster, Fassade oder Bausubstanz.', 'keiner', 'geplant', 'unbekannt'),
      schriftliche_klaerung: approval('Sofern ein Eingriff geplant ist: schriftliche Abstimmung für genau diese Ausführung vorhanden?'),
      unterlagen: flag('Herstellerunterlagen mit Aufstellungs- und Abluftweg vorhanden?'),
      standort_skizziert: flag('Aufstellort und betroffene Bauteile dokumentiert?'),
    },
    calculate({eingriff, schriftliche_klaerung, unterlagen, standort_skizziert}) {
      const missing = [];
      if (eingriff === 'unbekannt') missing.push('eingriff_klaeren');
      if (eingriff === 'geplant' && schriftliche_klaerung !== 'ja') missing.push('schriftliche_klaerung');
      if (!unterlagen) missing.push('modellunterlagen');
      if (!standort_skizziert) missing.push('standort');
      return {offene_punkte: missing, hinweis: 'Dokumentationscheck. Vertragslage, örtliche Vorgaben, Lärm und konkrete Freigaben für die eigene Wohnung separat klären.'};
    },
    example: {args: {eingriff: 'geplant', schriftliche_klaerung: 'unbekannt', unterlagen: true, standort_skizziert: false}, expect: {offene_punkte: ['schriftliche_klaerung', 'standort']}},
  },
  {
    name: 'befeuchter_weissen_belag_einordnen',
    description: 'Weißen Belag nach Befeuchtertechnik und verwendeter Wasserart einordnen — Triage potential mineral residue from a humidifier without diagnosing its origin.',
    page: guide('luftbefeuchter-weisser-staub'),
    properties: {
      technik: choice('Gerätetechnik laut Handbuch.', 'ultraschall', 'verdunstung', 'dampf', 'unbekannt'),
      belag_ausserhalb: flag('Belag auf Oberflächen nahe am laufenden Gerät bemerkt?'),
      wasser_handbuchkonform: approval('Wasserart laut Modellanleitung abgeglichen?'),
    },
    calculate({technik, belag_ausserhalb, wasser_handbuchkonform}) {
      const status = belag_ausserhalb && technik === 'ultraschall' ? 'mineralien_moeglich' : technik === 'unbekannt' ? 'technik_pruefen' : 'herkunft_offen';
      return {status, wasser_pruefen: wasser_handbuchkonform !== 'ja', hinweis: 'Gerät für die Kontrolle ausschalten und Wasser- und Pflegehinweise der genauen Anleitung lesen. Beobachtung belegt weder Zusammensetzung noch hygienischen Zustand.'};
    },
    example: {args: {technik: 'ultraschall', belag_ausserhalb: true, wasser_handbuchkonform: 'unbekannt'}, expect: {status: 'mineralien_moeglich', wasser_pruefen: true}},
  },
  {
    name: 'entfeuchter_geruch_eingrenzen',
    description: 'Geruchszeitpunkt und sichtbare Hinweise beim Luftentfeuchter für die nächste Pflege- oder Serviceentscheidung einordnen — Triage dehumidifier odour with observation and manual-approved actions.',
    page: guide('luftentfeuchter-stinkt'),
    properties: {
      geruch: choice('Beobachteter Geruch.', 'muffig', 'verschmort', 'unbekannt'),
      zeitpunkt: choice('Wann tritt er vor allem auf?', 'start', 'tank_voll', 'dauerhaft', 'unbekannt'),
      nach_pflege: flag('Geruch auch nach Reinigung der ausdrücklich zugänglichen Teile gemäß Anleitung vorhanden?'),
    },
    calculate({geruch, zeitpunkt, nach_pflege}) {
      let next = 'hersteller_pruefhinweise_lesen';
      if (geruch === 'verschmort' || nach_pflege) next = 'betrieb_stoppen_service_kontaktieren';
      else if (geruch === 'muffig' && zeitpunkt === 'tank_voll') next = 'tank_nach_anleitung_pruefen';
      return {naechster_schritt: next, hinweis: 'Geruch allein weist keine Ursache nach. Wartung nur nach Handbuch bei ausgeschaltetem Gerät; Gehäuse und Elektrik geschlossen lassen.'};
    },
    example: {args: {geruch: 'muffig', zeitpunkt: 'tank_voll', nach_pflege: false}, expect: {naechster_schritt: 'tank_nach_anleitung_pruefen'}},
  },
  {
    name: 'bad_feuchte_erholung_protokoll',
    description: 'Gemessene Rückkehr in den eigenen Feuchtebereich nach einer Badnutzung bewerten — Check bathroom humidity recovery against the measured baseline.',
    page: guide('richtig-lueften-im-winter'),
    properties: {
      vorher_rh: number('Relative Feuchte vor der Nutzung in Prozent.', 0, 100),
      spitze_rh: number('Erfasster Spitzenwert nach der Nutzung in Prozent.', 0, 100),
      spaeter_rh: number('Relative Feuchte nach dem selbst gewählten Beobachtungszeitraum.', 0, 100),
      minuten: number('Beobachtungsdauer nach der Nutzung in Minuten.', 1, 360),
      toleranz_pp: number('Eigener Vergleichsbereich oberhalb des gemessenen Ausgangswerts in Prozentpunkten.', 0, 20),
      aehnliche_temperatur: flag('Lufttemperatur am selben Sensorort vor und später hinreichend ähnlich?'),
    },
    calculate({vorher_rh, spitze_rh, spaeter_rh, minuten, toleranz_pp, aehnliche_temperatur}) {
      if (spitze_rh < spaeter_rh) throw new RangeError('Spitzenwert und spätere Messung abgleichen.');
      const residual = spaeter_rh - vorher_rh;
      return {
        rest_ueber_eigenem_ausgang_pp: round(residual), beobachtungszeit_min: minuten,
        erholung: !aehnliche_temperatur ? 'temperaturwechsel_pruefen' : residual <= toleranz_pp ? 'eigenen_bereich_erreicht' : 'noch_ueber_eigenem_bereich',
        gemessene_spitze_ueber_ausgang_pp: round(spitze_rh - vorher_rh),
        hinweis: 'Ein Vergleich dieser Messreihe. Keine Aussage über trockene Bauteile oder Schimmelfreiheit.',
      };
    },
    example: {args: {vorher_rh: 47, spitze_rh: 72, spaeter_rh: 58, minuten: 20, toleranz_pp: 5, aehnliche_temperatur: true}, expect: {rest_ueber_eigenem_ausgang_pp: 11, erholung: 'noch_ueber_eigenem_bereich'}},
  },
  {
    name: 'wand_oberflaechenfaktor_abschaetzen',
    description: 'Temperaturfaktor einer gemessenen Innenoberfläche bei stationären Bedingungen bestimmen — Calculate the measured surface-to-air temperature factor.',
    page: guide('fenster-beschlagen-innen'),
    properties: {
      innen_c: roomTemp('Innenluft in °C.'),
      aussen_c: roomTemp('Außenluft in °C.'),
      oberflaeche_c: roomTemp('Innenoberfläche in °C.'),
      stabil: flag('Hinreichend stabile Bedingungen ohne Sonne, wechselndes Lüften oder starke zusätzliche Strahlungsquellen?'),
    },
    calculate({innen_c, aussen_c, oberflaeche_c, stabil}) {
      const difference = innen_c - aussen_c;
      const usable = stabil && difference >= 5 && oberflaeche_c >= aussen_c && oberflaeche_c <= innen_c;
      return {
        innen_aussen_k: round(difference), temperaturfaktor: usable ? round((oberflaeche_c - aussen_c) / difference, 3) : null,
        hinweis: 'Quotient aus eigenen Messwerten, keine normgerechte Prüfung eines Bauteils. Werte für Bauphysik oder Feuchteschäden fachlich einordnen lassen.',
      };
    },
    example: {args: {innen_c: 20, aussen_c: 0, oberflaeche_c: 12, stabil: true}, expect: {temperaturfaktor: 0.6}},
  },
  {
    name: 'heizwaerme_gradtag_szenario',
    description: 'Gemessene Raumheizwärme mit eigenen Heizgradtagen für ein Vergleichswetter abschätzen — Normalize heating-only energy to a reference degree-day period.',
    page: guide('nachtabsenkung-heizung'),
    properties: {
      heizwaerme_kwh: number('Gemessene Energie nur für Raumheizung im betrachteten Zeitraum.', 0, 300000),
      gradtage_gemessen: number('Heizgradtage desselben Zeitraums in K·d nach gewählter Methode.', 1, 10000),
      gradtage_vergleich: number('Heizgradtage des Vergleichszeitraums nach derselben Methode und mit gleichem Klimabezug.', 0, 10000),
      betrieb_vergleichbar: flag('Unveränderte Gebäudehülle, Nutzung und Heizstrategie?'),
    },
    calculate({heizwaerme_kwh, gradtage_gemessen, gradtage_vergleich, betrieb_vergleichbar}) {
      const factor = heizwaerme_kwh / gradtage_gemessen;
      return {
        gemessene_kwh_pro_kd: round(factor, 4),
        szenario_kwh: betrieb_vergleichbar ? round(factor * gradtage_vergleich) : null,
        hinweis: 'Lineare Wetter-Näherung ohne Warmwasser; gleiche Heizgradtagmethode verwenden. Solar- und Windunterschiede, Anlagenverluste und geänderte Nutzung bleiben außen vor.',
      };
    },
    example: {args: {heizwaerme_kwh: 1800, gradtage_gemessen: 450, gradtage_vergleich: 400, betrieb_vergleichbar: true}, expect: {gemessene_kwh_pro_kd: 4, szenario_kwh: 1600}},
  },
  {
    name: 'thermostat_betrieb_ohne_cloud',
    description: 'Manuelle Bedienung und lokal gespeicherten Zeitplan eines Thermostats bei Internetausfall getrennt prüfen — Check documented offline controls independently of app or hub access.',
    page: guide('smarte-heizkoerperthermostate-lohnen-sich'),
    properties: {
      genaue_variante: flag('Exakte Variante und Firmware oder Handbuchversion identifiziert?'),
      manuell: approval('Manuelle Verstellung am Kopf ohne Internet laut Anleitung möglich?'),
      zeitplan_lokal: approval('Gespeicherter eigener Zeitplan ohne Internet funktionsfähig laut Anleitung?'),
      zentralseitige_abhaengigkeit_geprueft: flag('Abhängigkeiten von Zentrale, Strom und Funk für den konkreten Aufbau separat geklärt?'),
    },
    calculate({genaue_variante, manuell, zeitplan_lokal, zentralseitige_abhaengigkeit_geprueft}) {
      const checks = genaue_variante && zentralseitige_abhaengigkeit_geprueft;
      return {
        quelle_auswertbar: checks,
        manuell_dokumentiert: checks ? manuell : 'unbekannt', zeitplan_dokumentiert: checks ? zeitplan_lokal : 'unbekannt',
        hinweis: 'Dokumentationscheck für bekannte Firmware und Aufbau. Manuelle Regelung, lokale Zeitpläne und Fernzugriff sind getrennte Funktionen.',
      };
    },
    example: {args: {genaue_variante: true, manuell: 'ja', zeitplan_lokal: 'nein', zentralseitige_abhaengigkeit_geprueft: true}, expect: {manuell_dokumentiert: 'ja', zeitplan_dokumentiert: 'nein'}},
  },
  {
    name: 'heizluefter_abschaltung_muster',
    description: 'Normales Erreichen der Solltemperatur und auffällige Abschaltungen eines Heizlüfters auseinanderhalten — Triage observed portable heater shutdown behavior.',
    page: guide('heizluefter-schaltet-sich-aus'),
    properties: {
      soll_erreicht: approval('Solltemperatur beim Abschalten erreicht?'),
      kippmeldung: flag('Gerät meldet Kippschutz oder steht nicht wie im Handbuch vorgesehen?'),
      brandzeichen: flag('Brandgeruch, Rauch, auffällige Überhitzung oder beschädigter Stecker?'),
      wiederholt: flag('Abschaltung wiederholt sich mit korrekter Aufstellung und weiter zu kaltem Raum?'),
    },
    calculate({soll_erreicht, kippmeldung, brandzeichen, wiederholt}) {
      let step = 'beobachtung_nach_handbuch_einordnen';
      if (brandzeichen || wiederholt) step = 'betrieb_beenden_fachlich_klaeren';
      else if (kippmeldung) step = 'betrieb_beenden_aufstellung_klaeren';
      else if (soll_erreicht === 'ja') step = 'regelzyklus_moeglich';
      return {naechster_schritt: step, hinweis: 'Keine Defektdiagnose oder Freigabe. Schutzfunktionen niemals überbrücken. Hinweise am Gerät und in der Modellanleitung befolgen.'};
    },
    example: {args: {soll_erreicht: 'ja', kippmeldung: false, brandzeichen: true, wiederholt: false}, expect: {naechster_schritt: 'betrieb_beenden_fachlich_klaeren'}},
  },
  {
    name: 'infrarot_sichtlinie_arbeitsplatz',
    description: 'Mögliche Abschattung der Strahlungsfläche zu einem Sitzplatz anhand der Sichtlinie einordnen — Check an unobstructed line of sight for radiant heating placement.',
    page: guide('infrarotheizung-decke-oder-wand'),
    properties: {
      freie_sichtlinie: flag('Sichtlinie vom vorgesehenen Sitzplatz zur Heizfläche ohne Möbel, Textilien oder andere größere Hindernisse?'),
      montageart: choice('Laut Modellanleitung vorgesehene Position.', 'decke', 'wand', 'unbekannt'),
      laut_handbuch_geprueft: flag('Vom Hersteller vorgeschriebene Montageposition und Abstände geprüft?'),
    },
    calculate({freie_sichtlinie, montageart, laut_handbuch_geprueft}) {
      const status = !freie_sichtlinie ? 'abschattung_pruefen' : montageart === 'unbekannt' || !laut_handbuch_geprueft ? 'modellhandbuch_pruefen' : 'sichtlinie_frei';
      return {status, hinweis: 'Prüft die dokumentierte Sichtlinie. Keine Aussage über tatsächlich am Platz ankommende Leistung und keine Montagefreigabe.'};
    },
    example: {args: {freie_sichtlinie: false, montageart: 'wand', laut_handbuch_geprueft: true}, expect: {status: 'abschattung_pruefen'}},
  },
  {
    name: 'bad_heizgeraet_freigabe_unterlagen',
    description: 'Für geplante Badheizung Modellunterlagen und fachliche Prüfung des konkreten Standorts erfassen — Identify missing bathroom-specific documentation before considering an electric heater.',
    page: guide('infrarotheizung-badezimmer'),
    properties: {
      modell_geeignet_dokumentiert: approval('Hersteller dokumentiert Verwendung im Bad für die genaue Variante?'),
      ort_fachlich_geprueft: approval('Der konkrete Standort und Anschluss wurden von einer Elektrofachkraft anhand örtlicher Anforderungen geprüft?'),
      befestigung_geprueft: flag('Untergrund und vorgesehene Befestigung wurden für genau diese Variante geprüft?'),
    },
    calculate({modell_geeignet_dokumentiert, ort_fachlich_geprueft, befestigung_geprueft}) {
      const pending = [];
      if (modell_geeignet_dokumentiert !== 'ja') pending.push('modellunterlagen');
      if (ort_fachlich_geprueft !== 'ja') pending.push('standort_anschluss');
      if (!befestigung_geprueft) pending.push('befestigung');
      return {
        offene_punkte: pending,
        hinweis: 'Erfasst nur, welche Nachweise laut Eingabe vorliegen. Das Tool bewertet keine Schutzbereiche, Schutzarten oder Anschlüsse und erteilt keine Freigabe.',
      };
    },
    example: {args: {modell_geeignet_dokumentiert: 'ja', ort_fachlich_geprueft: 'unbekannt', befestigung_geprueft: false}, expect: {offene_punkte: ['standort_anschluss', 'befestigung']}},
  },
  {
    name: 'warmwasser_aufheizzeit_ideal',
    description: 'Ideale Wiederaufheizdauer einer bekannten Wassermenge aus thermischer Leistung abschätzen — Estimate an ideal hot-water recovery time from delivered heat.',
    page: guide('duschen-kosten-rechner'),
    properties: {
      liter: number('Tatsächlich wieder erwärmte Wassermenge in Litern.', 1, 3000),
      temperaturhub_k: number('Beobachteter Temperaturhub im Rechenszenario in Kelvin.', 0, 65),
      thermisch_kw: number('Bekannte mittlere thermische Leistung an das Wasser in kW.', 0.1, 100),
    },
    calculate({liter, temperaturhub_k, thermisch_kw}) {
      const heat = liter * temperaturhub_k * 0.001163;
      return {
        nutzwaerme_kwh: round(heat, 3), ideale_minuten: round(60 * heat / thermisch_kw),
        hinweis: 'Ideale Energiebilanz, ohne Verluste, Nachspeisung, Temperatur-Schichtung oder wechselnde Anlagenleistung. Speichertemperatur und Hygieneeinstellungen unverändert lassen.',
      };
    },
    example: {args: {liter: 100, temperaturhub_k: 20, thermisch_kw: 2}, expect: {nutzwaerme_kwh: 2.326, ideale_minuten: 69.78}},
  },
  {
    name: 'dusche_temperatur_streuung',
    description: 'Schwankung aus drei gemessenen Warmwassertemperaturen während eines gleich eingestellten Duschtests auswerten — Summarize observed tap-temperature stability from three readings.',
    page: guide('duschen-kosten-rechner'),
    properties: {
      start_c: number('Erster Messwert nach der anfänglichen Wartezeit in °C.', 0, 70),
      mitte_c: number('Mittlerer Messwert in °C.', 0, 70),
      ende_c: number('Letzter Messwert in °C.', 0, 70),
      fehler_je_c: number('Absoluter Fehler pro Messung in °C.', 0, 5),
      ohne_aenderung: flag('Armaturenstellung, Durchfluss und Messort gleich gehalten?'),
    },
    calculate({start_c, mitte_c, ende_c, fehler_je_c, ohne_aenderung}) {
      const range = Math.max(start_c, mitte_c, ende_c) - Math.min(start_c, mitte_c, ende_c);
      return {
        gemessene_spannweite_k: round(range), groesser_als_messspielraum: ohne_aenderung ? range > 2 * fehler_je_c : null,
        hinweis: 'Zwischen den Messzeitpunkten sind Spitzen unbekannt. Erfasst keine Sicherheits- oder Hygienefreigabe und diagnostiziert keine Anlagenstörung.',
      };
    },
    example: {args: {start_c: 37, mitte_c: 39, ende_c: 38, fehler_je_c: 0.3, ohne_aenderung: true}, expect: {gemessene_spannweite_k: 2, groesser_als_messspielraum: true}},
  },
  {
    name: 'wandfeuchte_beobachtung_dokumentieren',
    description: 'Mess- und Ereignisprotokoll für auffällige Feuchte an einer Wand zusammenstellen — Identify missing chronology and observations for a damp-wall assessment.',
    page: guide('luftentfeuchter-gegen-schimmel'),
    properties: {
      ort_und_verlauf_dokumentiert: flag('Datum, betroffene Stelle und Veränderung der Fläche dokumentiert? Keine Adresse eingeben.'),
      klima_protokolliert: flag('Raumtemperatur, Luftfeuchte und Lüftungsereignisse im selben Zeitraum notiert?'),
      regen_oder_leitungsereignis: flag('Verdacht auf Zusammenhang mit Regen, Leck oder anderem Wassereintritt?'),
      wiederkehrend: flag('Die Stelle tritt wiederholt auf, bleibt nass oder es zeigt sich sichtbarer Befall?'),
    },
    calculate({ort_und_verlauf_dokumentiert, klima_protokolliert, regen_oder_leitungsereignis, wiederkehrend}) {
      const missing = [];
      if (!ort_und_verlauf_dokumentiert) missing.push('stelle_zeitverlauf');
      if (!klima_protokolliert) missing.push('raumklima_lueftung');
      return {
        fehlende_beobachtungen: missing, ursache_fachlich_klaeren: regen_oder_leitungsereignis || wiederkehrend,
        hinweis: 'Dokumentierhilfe. Aus zeitlichem Zusammenhang allein folgen weder Diagnose noch Verantwortung oder geeignete Sanierung.',
      };
    },
    example: {args: {ort_und_verlauf_dokumentiert: true, klima_protokolliert: false, regen_oder_leitungsereignis: true, wiederkehrend: false}, expect: {fehlende_beobachtungen: ['raumklima_lueftung'], ursache_fachlich_klaeren: true}},
  },
  {
    name: 'lueftung_co2_abklingtest',
    description: 'Luftwechsel aus einer gemessenen CO₂-Abklingkurve grob abschätzen — Estimate apparent air changes from measured CO₂ decay and known outdoor background.',
    page: guide('unterschied-klimaanlage-lueftungsanlage'),
    properties: {
      start_ppm: number('Zu Beginn des Beobachtungszeitraums bereits gemessener Innenwert in ppm.', 300, 10000),
      ende_ppm: number('Späterer Innenwert in ppm am selben Messort.', 300, 10000),
      aussen_ppm: number('Gemessener ungefähr konstanter Außenwert in ppm.', 300, 3000),
      minuten: number('Dauer des unbelegten Messabschnitts in Minuten.', 5, 240),
      fehler_je_ppm: number('Absoluter Toleranzbetrag je Messwert laut Sensorunterlagen.', 0, 400),
      gueltiger_abschnitt: flag('Keine CO₂-Quelle im Zeitraum, ungefähr konstant durchmischter Raum und Lüftungszustand?'),
    },
    calculate({start_ppm, ende_ppm, aussen_ppm, minuten, fehler_je_ppm, gueltiger_abschnitt}) {
      const excessStart = start_ppm - aussen_ppm;
      const excessEnd = ende_ppm - aussen_ppm;
      const usable = gueltiger_abschnitt && excessEnd > 2 * fehler_je_ppm && start_ppm - ende_ppm > 2 * fehler_je_ppm;
      return {
        luftwechsel_pro_stunde: usable ? round(Math.log(excessStart / excessEnd) * 60 / minuten) : null,
        hinweis: 'Ein-Zonen-Abklingmodell mit konstantem Außenwert. Verwendet vorhandene Messwerte. Keine Aussage zur Gesundheit, Luftqualität, Normerfüllung oder Filterleistung.',
      };
    },
    example: {args: {start_ppm: 1200, ende_ppm: 750, aussen_ppm: 450, minuten: 30, fehler_je_ppm: 50, gueltiger_abschnitt: true}, expect: {luftwechsel_pro_stunde: 1.83}},
  },
];
