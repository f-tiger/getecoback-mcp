const guide = slug => `/guide/${slug}.html`;
const number = (description, minimum, maximum) => ({type: 'number', description, minimum, maximum});
const flag = description => ({type: 'boolean', description});
const choice = (description, ...values) => ({type: 'string', description, enum: values});
const minute = description => number(description, 0, 10080);
const litres = description => number(description, 0, 500);
const degrees = description => number(description, -45, 85);
const count = description => number(description, 0, 5000);
const round = value => Math.round(value * 100) / 100;

function span(start, end) {
  if (end < start) throw new RangeError('Zeitangaben müssen denselben Nullpunkt und die richtige Reihenfolge haben.');
  return end - start;
}

function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Für Stückzahlen sind ganze Zahlen erforderlich.');
}

export const raumuebergabe = [
  {
    name: 'hygrometer_umzug_erstes_stabiles_ablesefenster',
    description: 'Prüfe nach einem Raumwechsel, welche Ablesung frühestens dem neuen Raum zugeordnet werden kann — Find the first usable reading after relocating a hygrometer',
    page: guide('luftfeuchtigkeit-richtig-messen'),
    properties: {
      umzug_min: minute('Minute des Standortwechsels seit Beginn des Protokolls'),
      eigene_wartezeit_min: minute('Für diesen Sensor festgelegte Wartezeit, wie im Versuch protokolliert'),
      erstes_foto_min: minute('Minute der ersten Ablesung nach dem Wechsel'),
      zweites_foto_min: minute('Minute der zweiten Ablesung nach dem Wechsel'),
      messort_markiert: flag('Montagehöhe und genauer neuer Messpunkt eindeutig protokolliert')
    },
    calculate({umzug_min, eigene_wartezeit_min, erstes_foto_min, zweites_foto_min, messort_markiert}) {
      span(umzug_min, erstes_foto_min);
      span(erstes_foto_min, zweites_foto_min);
      const fruehestens = umzug_min + eigene_wartezeit_min;
      const kandidaten = [erstes_foto_min, zweites_foto_min].filter(zeit => zeit >= fruehestens);
      return {erste_verwendbare_minute: messort_markiert ? kandidaten[0] ?? null : null,
        anfang_der_neuen_reihe_min: fruehestens, grenze: 'Die Wartezeit stammt aus dem eigenen Versuch. Sie garantiert keine stabilisierte Messung.'};
    },
    example: {args: {umzug_min: 40, eigene_wartezeit_min: 22, erstes_foto_min: 52, zweites_foto_min: 71, messort_markiert: true}, expect: {erste_verwendbare_minute: 71, anfang_der_neuen_reihe_min: 62}}
  },
  {
    name: 'hygrometer_nachfolger_anzeigegrenzen_ueberlappung',
    description: 'Prüfe, ob ein Hygrometerwechsel die Auswertung alter Feuchtewarnungen einschränkt — Check whether a replacement hygrometer preserves a warning threshold',
    page: guide('luftfeuchtigkeit-richtig-messen'),
    properties: {
      altes_min_rh: number('Untere dokumentierte Anzeigegrenze des alten Sensors in % rF', 0, 100),
      altes_max_rh: number('Obere Anzeigegrenze des alten Sensors in % rF', 0, 100),
      neues_min_rh: number('Untere dokumentierte Anzeigegrenze des neuen Sensors in % rF', 0, 100),
      neues_max_rh: number('Obere Anzeigegrenze des neuen Sensors in % rF', 0, 100),
      warnschwelle_rh: number('Selbst gewählte Schwelle für eine Messnotiz in % rF', 0, 100)
    },
    calculate({altes_min_rh, altes_max_rh, neues_min_rh, neues_max_rh, warnschwelle_rh}) {
      if (altes_min_rh > altes_max_rh || neues_min_rh > neues_max_rh) throw new RangeError('Anzeigegrenzen prüfen.');
      const unten = Math.max(altes_min_rh, neues_min_rh);
      const oben = Math.min(altes_max_rh, neues_max_rh);
      return {gemeinsamer_anzeigebereich_rh: unten <= oben ? [unten, oben] : null,
        schwelle_in_beiden_aufloesbar: warnschwelle_rh > unten && warnschwelle_rh < oben,
        grenze: 'Eine Schwelle am Rand lässt auf einer Seite keine Abstufung zu. Anzeigegrenzen belegen keine Messgenauigkeit.'};
    },
    example: {args: {altes_min_rh: 10, altes_max_rh: 95, neues_min_rh: 25, neues_max_rh: 80, warnschwelle_rh: 80}, expect: {gemeinsamer_anzeigebereich_rh: [25, 80], schwelle_in_beiden_aufloesbar: false}}
  },
  {
    name: 'entfeuchter_raumwechsel_tankrest_zuteilen',
    description: 'Grenze die Wassermenge des zweiten Raums ohne Zwischenentleerung ein — Bound the second room’s collected water when a tank was carried over',
    page: guide('luftentfeuchter-keller'),
    properties: {
      endstand_l: litres('Gesamter Tankinhalt nach beiden Raumphasen in Litern'),
      wechsel_minimum_l: litres('Kleinster anhand der Übergabenotiz plausibler Tankstand beim Raumwechsel'),
      wechsel_maximum_l: litres('Größter anhand der Übergabenotiz plausibler Tankstand beim Raumwechsel'),
      tank_ununterbrochen_belegt: flag('Kein Entleeren, kein Überlaufen und kein Wechsel des Ablaufs dokumentiert')
    },
    calculate({endstand_l, wechsel_minimum_l, wechsel_maximum_l, tank_ununterbrochen_belegt}) {
      if (wechsel_maximum_l < wechsel_minimum_l || (tank_ununterbrochen_belegt && endstand_l < wechsel_minimum_l)) {
        throw new RangeError('Tankstände passen nicht zur dokumentierten Reihenfolge.');
      }
      return {raum_zwei_liter: tank_ununterbrochen_belegt ? [round(Math.max(0, endstand_l - wechsel_maximum_l)), round(endstand_l - wechsel_minimum_l)] : null,
        grenze: 'Nur erfasstes Tankwasser, kein Nachweis der gesamten Raumfeuchte oder der Ursache.'};
    },
    example: {args: {endstand_l: 2.7, wechsel_minimum_l: 0.9, wechsel_maximum_l: 1.5, tank_ununterbrochen_belegt: true}, expect: {raum_zwei_liter: [1.2, 1.8]}}
  },
  {
    name: 'entfeuchter_raumprotokoll_ablaufzweige',
    description: 'Halte ungezählten Direktablauf von messbaren Tank- und Sammelmengen getrennt — Track counted and unmetered dehumidifier drainage after a transfer',
    page: guide('luftentfeuchter-keller'),
    properties: {
      tank_l: litres('Im Tank für diesen Raum erfasste Liter, 0 wenn keine erfasst'),
      sammelbehaelter_l: litres('Separat im Sammelgefäß erfasste Liter, ohne Doppelzählung'),
      direktablauf_min: minute('Protokollierte Minuten mit ungezähltem Direktablauf'),
      raumphase_min: minute('Gesamtdauer der dokumentierten Raumphase'),
      alle_wege_erfasst: flag('Auch Leerungen, Überlauf und Moduswechsel sind im Protokoll abgedeckt')
    },
    calculate({tank_l, sammelbehaelter_l, direktablauf_min, raumphase_min, alle_wege_erfasst}) {
      if (direktablauf_min > raumphase_min) throw new RangeError('Ablaufzeit liegt außerhalb der Raumphase.');
      const belegt = round(tank_l + sammelbehaelter_l);
      return {erfasste_liter: belegt, vollstaendige_gesamtmenge_l: alle_wege_erfasst && direktablauf_min === 0 ? belegt : null,
        ungemessener_ablauf_prozent: raumphase_min > 0 ? round(100 * direktablauf_min / raumphase_min) : null,
        grenze: 'Ein Zeitanteil ohne Mengenmessung erlaubt keine Hochrechnung der Liter.'};
    },
    example: {args: {tank_l: 0.6, sammelbehaelter_l: 0.8, direktablauf_min: 40, raumphase_min: 100, alle_wege_erfasst: true}, expect: {erfasste_liter: 1.4, vollstaendige_gesamtmenge_l: null, ungemessener_ablauf_prozent: 40}}
  },
  {
    name: 'lueftungsprotokoll_tuerphase_auswertung_trennen',
    description: 'Entscheide, ob die nächste Messung eine durch Türöffnung unterbrochene Lüftungsprobe verlängern darf — Decide whether a reading can extend an interrupted ventilation trial',
    page: guide('luftfeuchtigkeit-richtig-messen'),
    properties: {
      vorher_min: minute('Minute der letzten Ablesung im vereinbarten Aufbau'),
      tuer_ab_min: minute('Beginn der geöffneten Tür im selben Protokoll'),
      tuer_zu_min: minute('Ende dieser Türphase'),
      nachher_min: minute('Minute der ersten Ablesung danach'),
      wiederanlauf_min: minute('Selbst festgelegte Wartezeit für einen neuen Ausgangspunkt')
    },
    calculate({vorher_min, tuer_ab_min, tuer_zu_min, nachher_min, wiederanlauf_min}) {
      const bis_unterbrechung = span(vorher_min, tuer_ab_min);
      const unterbrechung = span(tuer_ab_min, tuer_zu_min);
      const nach_schliessen = span(tuer_zu_min, nachher_min);
      return {tuer_offen_minuten: unterbrechung, alte_phase_ab_letzter_ablesung_nominal_min: bis_unterbrechung,
        fuer_neue_basis_vorgesehen: nach_schliessen >= wiederanlauf_min,
        grenze: 'Die Abschnitte trennen und den Ausgangszustand erneut messen. Die Türzeit ist keine Luftwechselmessung.'};
    },
    example: {args: {vorher_min: 15, tuer_ab_min: 25, tuer_zu_min: 45, nachher_min: 54, wiederanlauf_min: 12}, expect: {tuer_offen_minuten: 20, fuer_neue_basis_vorgesehen: false}}
  },
  {
    name: 'luftreiniger_leihe_filterstunden_mindeststand',
    description: 'Führe dokumentierte Laufstunden desselben Filters über eine Ausleihe fort — Carry verified purifier filter hours through a loan',
    page: '/ersatzfilter.html',
    properties: {
      filter_bisher_h: number('Belegte Laufstunden des eingesetzten Filters vor der Ausleihe', 0, 50000),
      leihbetrieb_belegt_h: number('Zusätzlich dokumentierte Stunden mit diesem Gerät im Betrieb', 0, 50000),
      unbelegter_zeitraum_h: number('Ausleihstunden ohne Betriebsprotokoll', 0, 50000),
      gleiche_filtereinheit: flag('Dieselbe Filtereinheit ist nach Rückgabe eindeutig identifiziert')
    },
    calculate({filter_bisher_h, leihbetrieb_belegt_h, unbelegter_zeitraum_h, gleiche_filtereinheit}) {
      const untergrenze = round(filter_bisher_h + leihbetrieb_belegt_h);
      return {filterstunden_bereich: gleiche_filtereinheit ? [untergrenze, round(untergrenze + unbelegter_zeitraum_h)] : null,
        grenze: 'Filterstunden ersetzen weder Zustandskontrolle noch die Anleitung zum passenden Modell.'};
    },
    example: {args: {filter_bisher_h: 116, leihbetrieb_belegt_h: 7, unbelegter_zeitraum_h: 23, gleiche_filtereinheit: true}, expect: {filterstunden_bereich: [123, 146]}}
  },
  {
    name: 'strommessung_raumzuordnung_ungeklaerter_anteil',
    description: 'Bilanziere nach der Weitergabe eines Messgeräts zuordenbare und ungeklärte Energie — Separate allocated and unassigned energy from a shared power meter',
    page: '/strommess-protokoll.html',
    properties: {
      zaehlerstart_kwh: number('Startwert am durchgehend geführten Zähler in kWh', 0, 100000),
      zaehlerende_kwh: number('Endwert desselben Zählers ohne Nullung', 0, 100000),
      raum_a_belegt_kwh: number('Nachweisbar in Raum A gemessene kWh', 0, 100000),
      raum_b_belegt_kwh: number('Nachweisbar in Raum B gemessene kWh', 0, 100000),
      belege_disjunkt: flag('Die einzeln belegten Teilmessungen überschneiden sich nicht')
    },
    calculate({zaehlerstart_kwh, zaehlerende_kwh, raum_a_belegt_kwh, raum_b_belegt_kwh, belege_disjunkt}) {
      const gesamt = zaehlerende_kwh - zaehlerstart_kwh;
      const offen = gesamt - raum_a_belegt_kwh - raum_b_belegt_kwh;
      if (gesamt < 0 || (belege_disjunkt && offen < -0.0000001)) throw new RangeError('Zählerwerte oder Teilmengen prüfen.');
      return {zwischenablesung_kwh: round(gesamt), nicht_zuordenbar_kwh: belege_disjunkt ? round(Math.max(0, offen)) : null,
        grenze: 'Der ungeklärte Rest bleibt ohne Raumzuordnung. Messgerät und Zeitgrenzen mitprotokollieren.'};
    },
    example: {args: {zaehlerstart_kwh: 8.3, zaehlerende_kwh: 11.4, raum_a_belegt_kwh: 1.2, raum_b_belegt_kwh: 1.5, belege_disjunkt: true}, expect: {zwischenablesung_kwh: 3.1, nicht_zuordenbar_kwh: 0.4}}
  },
  {
    name: 'waesche_trocknung_teilserie_raumwechsel',
    description: 'Prüfe, ob eine gewogene Wäscheladung nach dem Wechsel noch derselben Messreihe zugeordnet werden kann — Determine whether moved laundry still belongs to its original weigh-in series',
    page: guide('waesche-trocknen-wohnung'),
    properties: {
      masse_letzte_waegung_kg: number('Wäschemasse am Ende der ersten Raumphase in kg', 0.1, 40),
      masse_erste_waegung_kg: number('Masse direkt beim Beginn der zweiten Phase in kg', 0.1, 40),
      waage_toleranz_kg: number('Für beide Wägungen gewählte gemeinsame Differenztoleranz in kg', 0, 2),
      ladung_unveraendert: flag('Alle Stücke und der Abzug des Behälters sind gleich geblieben')
    },
    calculate({masse_letzte_waegung_kg, masse_erste_waegung_kg, waage_toleranz_kg, ladung_unveraendert}) {
      const wechselabweichung = masse_erste_waegung_kg - masse_letzte_waegung_kg;
      return {wechselabweichung_kg: round(wechselabweichung),
        gemeinsame_wiegebruecke: ladung_unveraendert && Math.abs(wechselabweichung) <= waage_toleranz_kg + 1e-10,
        grenze: 'Eine Zwischenlücke kann Trocknung enthalten. Den Gewichtsverlust in der Lücke keinem Raum zuschlagen.'};
    },
    example: {args: {masse_letzte_waegung_kg: 4.62, masse_erste_waegung_kg: 4.47, waage_toleranz_kg: 0.08, ladung_unveraendert: true}, expect: {wechselabweichung_kg: -0.15, gemeinsame_wiegebruecke: false}}
  },
  {
    name: 'saugroboter_raumkarte_teilflaeche_oder_doppelung',
    description: 'Führe alte und neue gereinigte Kartenausschnitte mit dokumentierter Überlappung zusammen — Combine robot cleaning map coverage without counting the same area twice',
    page: guide('saugroboter-kaufberatung'),
    properties: {
      vorher_m2: number('Bereits abgedeckte Fläche laut altem Protokoll in m²', 0, 1000),
      nachher_m2: number('Überprüfte Fläche im neuen Kartenausschnitt in m²', 0, 1000),
      ueberschneidung_m2: number('Fläche, die nachweisbar in beiden erfasst ist, in m²', 0, 1000),
      gleiche_kartengrenzen: flag('Ausschnitte sind trotz Umstellung auf dieselben Raumgrenzen bezogen')
    },
    calculate({vorher_m2, nachher_m2, ueberschneidung_m2, gleiche_kartengrenzen}) {
      if (ueberschneidung_m2 > Math.min(vorher_m2, nachher_m2)) throw new RangeError('Gemeinsame Teilfläche ist zu groß.');
      return {kombinierte_flaeche_m2: gleiche_kartengrenzen ? round(vorher_m2 + nachher_m2 - ueberschneidung_m2) : null,
        erstmals_abgedeckt_m2: gleiche_kartengrenzen ? round(nachher_m2 - ueberschneidung_m2) : null,
        grenze: 'Kartierte Fläche zeigt Fahrabdeckung, keine gemessene Reinigungswirkung.'};
    },
    example: {args: {vorher_m2: 41, nachher_m2: 25, ueberschneidung_m2: 14, gleiche_kartengrenzen: true}, expect: {kombinierte_flaeche_m2: 52, erstmals_abgedeckt_m2: 11}}
  },
  {
    name: 'saugwischer_geteilte_pflege_letzte_tankphase',
    description: 'Prüfe, ob ein dokumentierter Tankpflegeschritt nach der letzten Nutzung in beiden Räumen stattfand — Check if floor washer tank care followed the latest use',
    page: guide('saugwischer-kaufberatung'),
    properties: {
      raum_a_ende_min: minute('Ende der letzten Nutzung in Raum A im gemeinsamen Protokoll'),
      raum_b_ende_min: minute('Ende der letzten Nutzung in Raum B im selben Protokoll'),
      tankpflege_min: minute('Zeitpunkt der jüngsten dokumentierten Tankpflege'),
      tankpflege_nach_anleitung: flag('Dokumentierter Schritt betrifft den Schmutzwassertank nach der genauen Geräteanleitung')
    },
    calculate({raum_a_ende_min, raum_b_ende_min, tankpflege_min, tankpflege_nach_anleitung}) {
      const letzter_einsatz = Math.max(raum_a_ende_min, raum_b_ende_min);
      return {nach_letzter_nutzung_belegt: tankpflege_nach_anleitung && tankpflege_min >= letzter_einsatz,
        minuten_letzte_pflege_bis_ende: round(letzter_einsatz - tankpflege_min),
        grenze: 'Der Tankpflegenachweis sagt nichts über Rolle, Filter oder Selbstreinigungszyklus.'};
    },
    example: {args: {raum_a_ende_min: 15, raum_b_ende_min: 42, tankpflege_min: 20, tankpflege_nach_anleitung: true}, expect: {nach_letzter_nutzung_belegt: false, minuten_letzte_pflege_bis_ende: 22}}
  },
  {
    name: 'raumkuehlung_uebergabe_thermometer_belastungspaar',
    description: 'Vergleiche beim Raumwechsel nur geloggte Temperaturänderungen mit ähnlichem Innen-Außen-Abstand am Start — Compare logged cooling changes only within a matched starting temperature context',
    page: guide('mobile-klimaanlage-vergleich'),
    properties: {
      innen_a_start_c: degrees('Innenwert am Start in Raum A'),
      aussen_a_start_c: degrees('Außenwert gleichzeitig zu Raum A'),
      innen_a_ende_c: degrees('Innenwert am Ende desselben Messfensters in Raum A'),
      innen_b_start_c: degrees('Innenwert am Start in Raum B'),
      aussen_b_start_c: degrees('Außenwert gleichzeitig zu Raum B'),
      innen_b_ende_c: degrees('Innenwert am Ende in Raum B'),
      toleranz_c: number('Gewählte Toleranz des Start-Temperaturabstands in °C', 0, 15),
      modus_dauer_und_licht_vergleichbar: flag('Messdauer, Gerätemodus und Sonneneintrag waren ähnlich dokumentiert')
    },
    calculate(a) {
      const abstand = Math.abs((a.aussen_a_start_c - a.innen_a_start_c) - (a.aussen_b_start_c - a.innen_b_start_c));
      const vergleichbar = a.modus_dauer_und_licht_vergleichbar && abstand <= a.toleranz_c;
      return {startabstands_unterschied_c: round(abstand), senkung_b_minus_a_c: vergleichbar ? round(a.innen_b_start_c - a.innen_b_ende_c - (a.innen_a_start_c - a.innen_a_ende_c)) : null,
        grenze: 'Ähnliche Startbedingungen erlauben einen Praxisvergleich ohne Aussage über Normleistung oder die Ursache eines Unterschieds.'};
    },
    example: {args: {innen_a_start_c: 29, aussen_a_start_c: 32, innen_a_ende_c: 26.5, innen_b_start_c: 30, aussen_b_start_c: 34, innen_b_ende_c: 28.5, toleranz_c: 1, modus_dauer_und_licht_vergleichbar: true}, expect: {startabstands_unterschied_c: 1, senkung_b_minus_a_c: -1}}
  },
  {
    name: 'waermelogger_heizphase_setzwert_anteile',
    description: 'Teile eine Heizbeobachtung an einem protokollierten Sollwertwechsel in zwei Auswertungsphasen — Split a heating observation at a documented setpoint change',
    page: guide('smarte-heizkoerperthermostate-lohnen-sich'),
    properties: {
      fenster_start_min: minute('Beginn des betrachteten Messfensters'),
      wechsel_min: minute('Minute, in der der Sollwert nachweisbar geändert wurde'),
      fenster_ende_min: minute('Ende des Messfensters'),
      soll_vorher_c: degrees('Alter dokumentierter Sollwert'),
      soll_nachher_c: degrees('Neuer dokumentierter Sollwert')
    },
    calculate({fenster_start_min, wechsel_min, fenster_ende_min, soll_vorher_c, soll_nachher_c}) {
      const vorher = span(fenster_start_min, wechsel_min);
      const danach = span(wechsel_min, fenster_ende_min);
      return {vorher_min: vorher, nachher_min: danach, sollwertsprung_c: round(soll_nachher_c - soll_vorher_c),
        gemischtes_fenster: vorher > 0 && danach > 0 && soll_vorher_c !== soll_nachher_c,
        grenze: 'Solltemperaturen sind keine gemessenen Raumtemperaturen. Beide Abschnitte als eigene Versuchsphasen kennzeichnen.'};
    },
    example: {args: {fenster_start_min: 20, wechsel_min: 55, fenster_ende_min: 100, soll_vorher_c: 18, soll_nachher_c: 20}, expect: {vorher_min: 35, nachher_min: 45, gemischtes_fenster: true}}
  },
  {
    name: 'thermostat_raumwechsel_aktiver_zeitplan',
    description: 'Ermittle nach erneuter Raumzuordnung, ob Zeitplan oder lokaler Test den beobachteten Sollwert erklärt — Identify the active setpoint source after moving a smart thermostat',
    page: guide('smarte-heizkoerperthermostate-lohnen-sich'),
    properties: {
      kopf_fuer_neuen_raum_belegt: flag('Sichtkontrolle und App-Zuordnung beziehen sich eindeutig auf denselben Kopf im Zielraum'),
      beobachtung_min: minute('Minute des Ablesens im gemeinsamen Protokoll'),
      override_bis_min: minute('Ende der dokumentierten manuellen Übersteuerung, 0 ohne Übersteuerung'),
      alter_plan_aktiv: flag('Alter Raumzeitplan ist laut Anzeige weiterhin aktiv')
    },
    calculate({kopf_fuer_neuen_raum_belegt, beobachtung_min, override_bis_min, alter_plan_aktiv}) {
      const manuell_rest_min = Math.max(0, override_bis_min - beobachtung_min);
      const status = !kopf_fuer_neuen_raum_belegt ? 'kopfzuordnung_offen'
        : manuell_rest_min > 0 ? 'manuelle_phase_aktiv'
          : alter_plan_aktiv ? 'vorheriger_raumplan_gemeldet' : 'neuen_raumplan_ablesen';
      return {status, manuell_rest_min, grenze: 'Anzeige und dokumentierte Zeit trennen. Die Ventilpassung und tatsächliche Temperatur separat prüfen.'};
    },
    example: {args: {kopf_fuer_neuen_raum_belegt: true, beobachtung_min: 65, override_bis_min: 90, alter_plan_aktiv: true}, expect: {status: 'manuelle_phase_aktiv', manuell_rest_min: 25}}
  },
  {
    name: 'klimafenster_zubehoer_zielraum_luecke',
    description: 'Ermittle, für welche von zwei Aufstellungen nach der Übergabe noch ein passendes Fensterteil fehlt — Identify which room still lacks a documented compatible window accessory',
    page: guide('fensterabdichtung-klimaanlage'),
    properties: {
      teil_a_scope: choice('Vom Hersteller für Teil A bestätigter Einsatzzweck', 'nur_raum_a', 'nur_raum_b', 'beide', 'offen'),
      teil_b_scope: choice('Vom Hersteller für Teil B bestätigter Einsatzzweck', 'nur_raum_a', 'nur_raum_b', 'beide', 'offen'),
      teil_a_am_ort: choice('Nach der Übergabe auffindbar an', 'raum_a', 'raum_b', 'nicht_belegt'),
      teil_b_am_ort: choice('Nach der Übergabe auffindbar an', 'raum_a', 'raum_b', 'nicht_belegt')
    },
    calculate({teil_a_scope, teil_b_scope, teil_a_am_ort, teil_b_am_ort}) {
      const teile = [[teil_a_scope, teil_a_am_ort], [teil_b_scope, teil_b_am_ort]];
      const dort_passend = raum => teile.some(([freigabe, ort]) => ort === raum && (freigabe === 'beide' || freigabe === 'nur_' + raum));
      return {fehlender_nachweis_vor_ort: ['raum_a', 'raum_b'].filter(raum => !dort_passend(raum)),
        teile_nicht_aufgefunden: teile.filter(([, ort]) => ort === 'nicht_belegt').length,
        grenze: 'Die Eingaben setzen Abgleich von Fensterbauart, Maßen und Zubehörunterlage voraus. Kein Nachweis für die Montage.'};
    },
    example: {args: {teil_a_scope: 'nur_raum_a', teil_b_scope: 'nur_raum_b', teil_a_am_ort: 'raum_a', teil_b_am_ort: 'raum_a'}, expect: {fehlender_nachweis_vor_ort: ['raum_b'], teile_nicht_aufgefunden: 0}}
  },
  {
    name: 'nachtkuehlung_handoff_raumwerte_zeitbezug',
    description: 'Wähle bei wechselnder Belegung für jeden Raum die passgenaue nächtliche Temperaturablesung — Select night readings using the actual occupancy handoff',
    page: guide('bei-hitze-schlafen'),
    properties: {
      belegungswechsel_min: minute('Zeitpunkt des Wechsels von Raum A nach Raum B im Nachtprotokoll'),
      messung_a_min: minute('Zeit des eingegebenen Raum-A-Werts'),
      messung_b_min: minute('Zeit des eingegebenen Raum-B-Werts'),
      a_c: degrees('Gemessene Temperatur in Raum A'),
      b_c: degrees('Gemessene Temperatur in Raum B'),
      maximaler_abstand_min: minute('Größter Zeitabstand zum Wechsel, der für diese Beobachtung gelten soll')
    },
    calculate({belegungswechsel_min, messung_a_min, messung_b_min, a_c, b_c, maximaler_abstand_min}) {
      const a_passt = messung_a_min < belegungswechsel_min && belegungswechsel_min - messung_a_min <= maximaler_abstand_min;
      const b_passt = messung_b_min >= belegungswechsel_min && messung_b_min - belegungswechsel_min <= maximaler_abstand_min;
      return {phase_a_c: a_passt ? a_c : null, phase_b_c: b_passt ? b_c : null,
        grenze: 'Wert pro Aufenthaltsphase, keine kontinuierliche Temperatur und kein Einflussnachweis des Raumwechsels.'};
    },
    example: {args: {belegungswechsel_min: 80, messung_a_min: 55, messung_b_min: 84, a_c: 28.1, b_c: 25.6, maximaler_abstand_min: 20}, expect: {phase_a_c: null, phase_b_c: 25.6}}
  },
  {
    name: 'saugroboter_neue_karte_wischsperren_abgleich',
    description: 'Finde nach Übernahme einer neuen Karte unbestätigte Wischsperren des Roboters — Audit retained no-mop zones after migrating to a new map',
    page: guide('saugroboter-kaufberatung'),
    properties: {
      benoetigte_sperren: count('Anzahl bekannter Bereiche, die trocken bleiben sollen'),
      vor_ort_geprueft: count('Davon in der aktiven Karte verifiziert und vor Ort eindeutig abgegrenzt'),
      nur_altkarte: count('Weitere benötigte Bereiche mit Eintrag nur in der alten Karte'),
      aktive_karte_bestaetigt: flag('Geprüfte Karte stimmt mit der beim nächsten Lauf gewählten Karte überein')
    },
    calculate({benoetigte_sperren, vor_ort_geprueft, nur_altkarte, aktive_karte_bestaetigt}) {
      whole(benoetigte_sperren, vor_ort_geprueft, nur_altkarte);
      if (vor_ort_geprueft + nur_altkarte > benoetigte_sperren) throw new RangeError('Die Teilmengen dürfen sich nicht überschneiden.');
      return {noch_zu_pruefen: benoetigte_sperren - (aktive_karte_bestaetigt ? vor_ort_geprueft : 0),
        ohne_kartennachweis: benoetigte_sperren - vor_ort_geprueft - nur_altkarte,
        grenze: 'Alte Karten und Moppanhebung belegen keine Wischfreigabe. Vor Nassbetrieb Bodenfreigabe und aktive Karte prüfen.'};
    },
    example: {args: {benoetigte_sperren: 5, vor_ort_geprueft: 2, nur_altkarte: 2, aktive_karte_bestaetigt: true}, expect: {noch_zu_pruefen: 3, ohne_kartennachweis: 1}}
  },
  {
    name: 'saugwischer_uebergabe_bodenabschnitt_freigaben',
    description: 'Ermittle, für wie viel der Zielraumfläche die alte Wischfreigabe noch belegt ist — Determine which floor area is still covered by the retained washing approval',
    page: guide('saugwischer-kaufberatung'),
    properties: {
      zielraum_m2: number('Gesamte Zielraumfläche in m²', 0, 1000),
      bestaetigter_belag_m2: number('Teilfläche, die eindeutig derselben freigegebenen Belagsausführung und Pflegeanweisung zugeordnet ist', 0, 1000),
      ungeeignet_m2: number('Zusätzliche ausdrücklich ausgeschlossene Teilfläche', 0, 1000),
      gleiche_methode: flag('Gleiches Gerät, gleiche Wischmethode und gegebenenfalls gleiche freigegebene Lösung')
    },
    calculate({zielraum_m2, bestaetigter_belag_m2, ungeeignet_m2, gleiche_methode}) {
      if (bestaetigter_belag_m2 + ungeeignet_m2 > zielraum_m2 + 1e-10) throw new RangeError('Flächen übersteigen den Raum.');
      const beleg = gleiche_methode ? bestaetigter_belag_m2 : 0;
      return {belegte_flaeche_m2: round(beleg), vor_einsatz_klaeren_m2: round(Math.max(0, zielraum_m2 - beleg - ungeeignet_m2)),
        grenze: 'Materialname allein ist keine Freigabe. Bodenpflegevorgaben und genaue Geräteanleitung beachten.'};
    },
    example: {args: {zielraum_m2: 26, bestaetigter_belag_m2: 18, ungeeignet_m2: 3, gleiche_methode: true}, expect: {belegte_flaeche_m2: 18, vor_einsatz_klaeren_m2: 5}}
  },
  {
    name: 'sonnenschutz_raumuebernahme_doppelte_aufzeichnung',
    description: 'Führe zwei Beobachtungsintervalle desselben belegten Fensters ohne doppelte Beschattungsminuten zusammen — Reconcile overlapping shade observations for one window',
    page: guide('homeoffice-buero-kuehlen'),
    properties: {
      schicht_a_ab_min: minute('Beginn der ersten Beobachtung dokumentierter Beschattung'),
      schicht_a_bis_min: minute('Ende der ersten Beobachtung'),
      schicht_b_ab_min: minute('Beginn der zweiten Beobachtung im gleichen Zeitprotokoll'),
      schicht_b_bis_min: minute('Ende der zweiten Beobachtung'),
      fenster_und_zustand_gleich: flag('Beide Notizen betreffen dasselbe Fenster und denselben Beschattungszustand')
    },
    calculate({schicht_a_ab_min, schicht_a_bis_min, schicht_b_ab_min, schicht_b_bis_min, fenster_und_zustand_gleich}) {
      const a = span(schicht_a_ab_min, schicht_a_bis_min);
      const b = span(schicht_b_ab_min, schicht_b_bis_min);
      const zuschnitt = Math.max(0, Math.min(schicht_a_bis_min, schicht_b_bis_min) - Math.max(schicht_a_ab_min, schicht_b_ab_min));
      return {beschattung_belegt_min: fenster_und_zustand_gleich ? round(a + b - zuschnitt) : null,
        doppelt_erfasste_min: fenster_und_zustand_gleich ? round(zuschnitt) : null,
        grenze: 'Nur dokumentierte Zeit desselben Zustands. Ohne passende Wetter- und Fensterdaten keine Wärmemenge ableitbar.'};
    },
    example: {args: {schicht_a_ab_min: 120, schicht_a_bis_min: 170, schicht_b_ab_min: 150, schicht_b_bis_min: 183, fenster_und_zustand_gleich: true}, expect: {beschattung_belegt_min: 63, doppelt_erfasste_min: 20}}
  },
  {
    name: 'luftbefeuchter_raumwechsel_wasseralter_nachweis',
    description: 'Bestimme beim Weitergeben eines Befeuchters das maximal belegte Alter des Tankwassers — Track the oldest documented tank water through a humidifier handoff',
    page: guide('luftbefeuchter-ratgeber'),
    properties: {
      volle_neubefuellung_min: minute('Minute des letzten belegten vollständigen Wasserwechsels'),
      nachfuellen_min: minute('Minute des letzten belegten bloßen Nachfüllens; wie Wasserwechselminute setzen, wenn keines erfolgte'),
      uebergabe_min: minute('Minute der Geräteübergabe im gleichen Protokoll'),
      tankvorgang_vollstaendig_belegt: flag('Befüllen und Nachfüllen sind für dieselbe Tankeinheit nachvollziehbar')
    },
    calculate({volle_neubefuellung_min, nachfuellen_min, uebergabe_min, tankvorgang_vollstaendig_belegt}) {
      span(volle_neubefuellung_min, nachfuellen_min);
      const seit_nachfuellen = span(nachfuellen_min, uebergabe_min);
      return {seit_vollstaendigem_wasserwechsel_min: tankvorgang_vollstaendig_belegt ? uebergabe_min - volle_neubefuellung_min : null,
        seit_letztem_nachfuellen_min: tankvorgang_vollstaendig_belegt ? seit_nachfuellen : null,
        grenze: 'Nachfüllen setzt das Wasserwechselprotokoll nicht zurück. Wasser, Entleeren und Pflege nach Geräteanleitung beurteilen.'};
    },
    example: {args: {volle_neubefuellung_min: 100, nachfuellen_min: 280, uebergabe_min: 360, tankvorgang_vollstaendig_belegt: true}, expect: {seit_vollstaendigem_wasserwechsel_min: 260, seit_letztem_nachfuellen_min: 80}}
  },
  {
    name: 'dusche_durchflusswert_uebergabe_kopf_freigabe',
    description: 'Trenne gemessene Durchflüsse von zwei protokollierten Positionen eines übernommenen Duschkopfs — Separate measured flows for two settings of a transferred showerhead',
    page: guide('duschen-kosten-rechner'),
    properties: {
      alt_gemessen_l: litres('Gesammelte Liter bei der alten dokumentierten Strahlstellung'),
      alt_messdauer_s: number('Sammelzeit für die alte Messung in Sekunden', 1, 600),
      neu_gemessen_l: litres('Gesammelte Liter an der neuen Stelle'),
      neu_messdauer_s: number('Sammelzeit für die neue Messung in Sekunden', 1, 600),
      strahlstellung_identisch: flag('Strahlstellung und Handhabung des Reglers stimmen bei beiden Messungen überein')
    },
    calculate({alt_gemessen_l, alt_messdauer_s, neu_gemessen_l, neu_messdauer_s, strahlstellung_identisch}) {
      const alt = 60 * alt_gemessen_l / alt_messdauer_s;
      const neu = 60 * neu_gemessen_l / neu_messdauer_s;
      return {alt_l_min: round(alt), neu_l_min: round(neu),
        differenz_l_min: strahlstellung_identisch ? round(neu - alt) : null,
        grenze: 'Differenz nur bei gleicher Einstellung. Sie belegt keine Ursachen, Wasserkosten oder dauerhafte Einsparung.'};
    },
    example: {args: {alt_gemessen_l: 2.1, alt_messdauer_s: 15, neu_gemessen_l: 1.7, neu_messdauer_s: 12, strahlstellung_identisch: false}, expect: {alt_l_min: 8.4, neu_l_min: 8.5, differenz_l_min: null}}
  },
  {
    name: 'ventilator_uebergabe_markierte_stufenpaare',
    description: 'Prüfe, ob eine veraltete Stufenmarkierung einer anderen Steuerungsart entspricht — Compare marked fan settings by actual control mode after handoff',
    page: guide('ventilator-kaufen-ratgeber'),
    properties: {
      alte_markierung: choice('Bedeutung der alten Markierung laut Protokoll', 'feste_stufe', 'automatik', 'nachtmodus', 'offen'),
      neuer_modus: choice('Am neuen Standort beobachteter Modus', 'feste_stufe', 'automatik', 'nachtmodus', 'offen'),
      alte_stufe: count('Stufennummer, nur bei fester Stufe relevant'),
      neue_stufe: count('Am Ziel abgelesene Stufennummer'),
      bedienteil_unveraendert: flag('Derselbe Ventilator mit identischem Bedienteil')
    },
    calculate({alte_markierung, neuer_modus, alte_stufe, neue_stufe, bedienteil_unveraendert}) {
      whole(alte_stufe, neue_stufe);
      const gleich = bedienteil_unveraendert && alte_markierung !== 'offen' && alte_markierung === neuer_modus;
      return {gleiche_modusgruppe: gleich, sollstufe_minus_iststufe: gleich && neuer_modus === 'feste_stufe' ? alte_stufe - neue_stufe : null,
        grenze: 'Gleiche Stufenkennung garantiert keine gleiche Luftbewegung am neuen Sitz- oder Schlafplatz.'};
    },
    example: {args: {alte_markierung: 'feste_stufe', neuer_modus: 'nachtmodus', alte_stufe: 2, neue_stufe: 2, bedienteil_unveraendert: true}, expect: {gleiche_modusgruppe: false, sollstufe_minus_iststufe: null}}
  },
  {
    name: 'heizwaerme_uebergabe_temperaturpuffer_ortspaare',
    description: 'Finde vor einer Übergabe den Raum mit der kleineren gemessenen Reserve zum eigenen Wärmeziel — Identify which room has the smaller measured margin above its own heating target',
    page: guide('heizkoerper-wird-nicht-warm'),
    properties: {
      ist_a_c: degrees('Aktueller Messwert im Raum A am dokumentierten Nutzplatz'),
      ist_b_c: degrees('Aktueller Messwert im Raum B am dokumentierten Nutzplatz'),
      mindestziel_a_c: degrees('Eigene Mindesttemperatur für Raum A'),
      mindestziel_b_c: degrees('Eigene Mindesttemperatur für Raum B'),
      zeitbezug_und_orte_bestaetigt: flag('Messungen beziehen sich auf denselben Übergabeabschnitt und die vereinbarten Nutzplätze')
    },
    calculate({ist_a_c, ist_b_c, mindestziel_a_c, mindestziel_b_c, zeitbezug_und_orte_bestaetigt}) {
      const a = round(ist_a_c - mindestziel_a_c);
      const b = round(ist_b_c - mindestziel_b_c);
      return {reserve_a_c: a, reserve_b_c: b,
        kleinerer_puffer: !zeitbezug_und_orte_bestaetigt ? 'offen' : a === b ? 'gleich' : a < b ? 'raum_a' : 'raum_b',
        grenze: 'Momentaufnahme gegenüber eigenen Zielwerten. Heizungsursache und Dauer separat prüfen.'};
    },
    example: {args: {ist_a_c: 19.2, ist_b_c: 20.2, mindestziel_a_c: 18, mindestziel_b_c: 21, zeitbezug_und_orte_bestaetigt: true}, expect: {reserve_a_c: 1.2, reserve_b_c: -0.8, kleinerer_puffer: 'raum_b'}}
  },
  {
    name: 'keller_lueftungsnotiz_aussenwert_ersatzquelle',
    description: 'Prüfe bei fehlender Außenablesung, ob eine zeitnahe dokumentierte Ersatzquelle überhaupt eingeordnet werden kann — Audit the timing and placement of a substitute outdoor reading',
    page: guide('keller-lueften-sommer'),
    properties: {
      innen_min: minute('Zeit der zugehörigen Innenablesung'),
      alte_aussenquelle_min: minute('Zeit der letzten vorhandenen Außenablesung der bisherigen Quelle'),
      ersatzquelle_min: minute('Zeit der Außenablesung aus der Ersatzquelle'),
      maximaler_versatz_min: minute('Selbst festgelegter maximaler Versatz'),
      ersatzort_aehnlich: flag('Ein plausibel vergleichbarer Außenmessort ist dokumentiert')
    },
    calculate({innen_min, alte_aussenquelle_min, ersatzquelle_min, maximaler_versatz_min, ersatzort_aehnlich}) {
      const bisher = Math.abs(alte_aussenquelle_min - innen_min);
      const ersatz = Math.abs(ersatzquelle_min - innen_min);
      const bevorzugt = bisher <= maximaler_versatz_min ? 'bisherige_quelle'
        : ersatz <= maximaler_versatz_min && ersatzort_aehnlich ? 'ersatzquelle_gekennzeichnet' : 'aussenwert_offen';
      return {zeitversatz_bisher_min: bisher, zeitversatz_ersatz_min: ersatz, bevorzugte_belegquelle: bevorzugt,
        grenze: 'Eine zeitnahe Angabe ersetzt bei abweichendem Standort keine lokale Messung. Relative Feuchte nicht ohne Temperaturvergleich einordnen.'};
    },
    example: {args: {innen_min: 130, alte_aussenquelle_min: 95, ersatzquelle_min: 136, maximaler_versatz_min: 10, ersatzort_aehnlich: true}, expect: {zeitversatz_ersatz_min: 6, bevorzugte_belegquelle: 'ersatzquelle_gekennzeichnet'}}
  },
  {
    name: 'saugroboter_station_raumwechsel_servicezugang_plan',
    description: 'Vergleiche zwei Stationsplätze anhand der im Alltag wirklich benötigten Serviceöffnungen — Compare two docking locations for retained service access',
    page: guide('saugroboter-kaufberatung'),
    properties: {
      gebraucht: choice('Am exakten Stationsmodell im Alltag benötigter Zugang', 'oben', 'vorne', 'beide'),
      a_oben: flag('Lässt sich die obere Klappe oder der benötigte Tank in Raum A vollständig bedienen?'),
      a_vorne: flag('Ist der notwendige Zugang von vorne in Raum A frei?'),
      b_oben: flag('Lässt sich die obere Klappe oder der benötigte Tank in Raum B vollständig bedienen?'),
      b_vorne: flag('Ist der notwendige Zugang von vorne in Raum B frei?')
    },
    calculate({gebraucht, a_oben, a_vorne, b_oben, b_vorne}) {
      const ok = (oben, vorne) => (gebraucht === 'vorne' || oben) && (gebraucht === 'oben' || vorne);
      return {servicezugang_moeglich: [ok(a_oben, a_vorne) && 'raum_a', ok(b_oben, b_vorne) && 'raum_b'].filter(Boolean),
        grenze: 'Bedienzugang und Roboter-Anfahrweg sind getrennte Anforderungen. Exakte Stationsanleitung zusätzlich prüfen.'};
    },
    example: {args: {gebraucht: 'beide', a_oben: true, a_vorne: false, b_oben: true, b_vorne: true}, expect: {servicezugang_moeglich: ['raum_b']}}
  },
  {
    name: 'feuchteprotokoll_raumwechsel_logbuch_abdeckung',
    description: 'Ermittle, wie viel einer Messreihe nach einem Recorderwechsel noch auf denselben Messort zurückgeführt werden kann — Quantify location-resolved evidence after switching room loggers',
    page: guide('luftfeuchtigkeit-richtig-messen'),
    properties: {
      gesamtzahl: count('Anzahl aller Ablesungen im übernommenen Protokoll'),
      vor_wechsel_eindeutig: count('Ablesungen vor dem Wechsel mit eindeutig markiertem Messort'),
      nach_wechsel_eindeutig: count('Weitere Ablesungen nach dem Wechsel mit dem gleichen eindeutig markierten Messort'),
      doppelt_importiert: count('Zusätzlich als doppelt erkannte Protokolleinträge außerhalb der beiden Teilmengen')
    },
    calculate({gesamtzahl, vor_wechsel_eindeutig, nach_wechsel_eindeutig, doppelt_importiert}) {
      whole(gesamtzahl, vor_wechsel_eindeutig, nach_wechsel_eindeutig, doppelt_importiert);
      const einzigartig = gesamtzahl - doppelt_importiert;
      const belegt = vor_wechsel_eindeutig + nach_wechsel_eindeutig;
      if (belegt > einzigartig) throw new RangeError('Anzahl der Einträge und Teilmengen stimmen nicht überein.');
      return {messwerte_ohne_eindeutige_zuordnung: einzigartig - belegt,
        ortsbezogen_belegt_prozent: einzigartig > 0 ? round(100 * belegt / einzigartig) : null,
        grenze: 'Prozentanteil erhaltener Einträge, keine Zeitabdeckung. Fehlende Zuordnungen dokumentieren, nicht ergänzen.'};
    },
    example: {args: {gesamtzahl: 24, vor_wechsel_eindeutig: 11, nach_wechsel_eindeutig: 8, doppelt_importiert: 2}, expect: {messwerte_ohne_eindeutige_zuordnung: 3, ortsbezogen_belegt_prozent: 86.36}}
  }
];
