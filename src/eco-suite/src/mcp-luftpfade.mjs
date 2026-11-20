const number = (description, minimum, maximum) => ({ type: 'number', description, minimum, maximum });
const flag = (description) => ({ type: 'boolean', description });
const choice = (description, values) => ({ type: 'string', description, enum: values });
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) + 0 : null;

const purifier = '/guide/luftreiniger-ratgeber.html';
const fan = '/guide/ventilator-kaufen-ratgeber.html';
const hotAir = '/guide/richtig-lueften-bei-hitze.html';
const winterAir = '/guide/richtig-lueften-im-winter.html';
const outdoorAir = '/guide/unterschied-klimaanlage-lueftungsanlage.html';
const adjacent = '/guide/raum-ohne-fenster-kuehlen.html';
const fanNight = '/guide/ventilator-nachts-schlafen.html';
const particle = (label) => number(label + ' in µg/m³ der selben PM-Fraktion.', 0, 2000);
const minutes = (label) => number(label + ' in Minuten.', 0, 1440);
const flow = (label) => number(label + ' in m³/h.', 0, 5000);
const temperature = (label) => number(label + ' in °C.', -30, 70);
const speed = (label) => number(label + ' in m/s.', 0, 20);
const percent = (label) => number(label + ' in Prozent.', 0, 100);

function tool(name, description, page, properties, calculate, args, expect) {
  return { name, description, page, properties, calculate, example: { args, expect } };
}

export const luftpfade = [
  tool('luftreiniger_stufenplan_reinluftmenge',
    'Berechnet die restliche Laufzeit auf einer leiseren Stufe für eine vorgegebene Reinluftmenge — Calculate remaining quiet-stage time toward a specified clean-air volume.',
    purifier, {
      ziel_m3: number('Gewünschtes rechnerisches Reinluftvolumen in m³.', 1, 10000),
      erste_stufe_m3h: flow('Partikel-CADR der ersten Stufe'),
      erste_min: minutes('Laufzeit der ersten Stufe'),
      zweite_stufe_m3h: flow('Partikel-CADR der zweiten Stufe')
    }, ({ ziel_m3, erste_stufe_m3h, erste_min, zweite_stufe_m3h }) => {
      const geliefert = erste_stufe_m3h * erste_min / 60;
      const rest = Math.max(0, ziel_m3 - geliefert);
      const dauer = rest === 0 ? 0 : zweite_stufe_m3h > 0 ? Math.ceil(60 * rest / zweite_stufe_m3h) : null;
      return {
        erste_stufe_reinluft_m3: round(geliefert), rest_m3: round(rest),
        zweite_stufe_min_aufgerundet: Number.isFinite(dauer) ? dauer : null,
        hinweis: 'CADR beider Stufen für dieselbe Partikelfraktion verwenden. Das Volumen ist ein Rechenwert, keine gleichmäßige Reinigung oder Frischluftzufuhr.'
      };
    }, { ziel_m3: 150, erste_stufe_m3h: 300, erste_min: 15, zweite_stufe_m3h: 120 },
    { erste_stufe_reinluft_m3: 75, rest_m3: 75, zweite_stufe_min_aufgerundet: 38 }),

  tool('lueftung_aussenluft_umluftrate_aufteilen',
    'Trennt dokumentierte Außenluft und Umluft eines gemischten Zuluftstroms — Split a specified supply flow into outdoor air and recirculation.',
    outdoorAir, {
      zuluft_m3h: flow('Gesamter dokumentierter Zuluftstrom im betrachteten Modus'),
      aussenanteil_prozent: percent('Dokumentierter Außenluftanteil desselben Modus'),
      betriebsmin: minutes('Laufzeit dieses Modus')
    }, ({ zuluft_m3h, aussenanteil_prozent, betriebsmin }) => {
      const aussenrate = zuluft_m3h * aussenanteil_prozent / 100;
      const umluftrate = zuluft_m3h - aussenrate;
      return {
        aussenluft_m3h: round(aussenrate), umluft_m3h: round(umluftrate),
        aussenluft_m3: round(aussenrate * betriebsmin / 60), umluft_m3: round(umluftrate * betriebsmin / 60),
        hinweis: 'Nur für dokumentierten oder gemessenen Außenluftanteil. Umluft ersetzt keinen Außenluftstrom.'
      };
    }, { zuluft_m3h: 240, aussenanteil_prozent: 25, betriebsmin: 30 },
    { aussenluft_m3h: 60, umluft_m3h: 180, aussenluft_m3: 30, umluft_m3: 90 }),

  tool('ventilator_schwenkzyklus_luft_am_platz',
    'Ermittelt die beobachteten Luftstrom-Minuten an einem Platz bei Schwenkbetrieb — Estimate observed draft minutes at a seat using a measured oscillation cycle.',
    fan, {
      zyklus_sek: number('Dauer einer vollständigen Schwenkperiode in Sekunden.', 1, 3600),
      luft_am_platz_sek: number('Sekunden je Periode, in denen am Platz Luftstrom beobachtet wird.', 0, 3600),
      laufzeit_min: minutes('Nutzungsdauer mit derselben Einstellung')
    }, ({ zyklus_sek, luft_am_platz_sek, laufzeit_min }) => {
      if (luft_am_platz_sek > zyklus_sek) throw new RangeError('Der Luftstromabschnitt darf nicht länger als eine volle Periode sein.');
      const anteil = luft_am_platz_sek / zyklus_sek;
      return {
        beobachteter_zeitanteil_prozent: round(100 * anteil),
        hochgerechnete_luftstrom_min: round(laufzeit_min * anteil),
        hinweis: 'Hochrechnung für gleichbleibenden Schwenkbetrieb. Ob der Luftstrom empfunden wird, hängt vom Beobachter und seiner Position ab.'
      };
    }, { zyklus_sek: 18, luft_am_platz_sek: 6, laufzeit_min: 60 },
    { beobachteter_zeitanteil_prozent: 33.33, hochgerechnete_luftstrom_min: 20 }),

  tool('lueftung_belegungswechsel_zeitfenster',
    'Prüft wie viel freie Lüftungszeit vor der nächsten Raumnutzung tatsächlich bleibt — Check a vacant ventilation interval before the next occupancy.',
    winterAir, {
      nutzungsende_min: minutes('Ende der ersten Nutzung als Minute desselben Tages ab Mitternacht'),
      lueftungsstart_min: minutes('Geplanter Lüftungsstart als Tagesminute'),
      folgetermin_min: minutes('Beginn der folgenden Nutzung als Tagesminute'),
      zielzeit_min: minutes('Selbst gewählte Lüftungsdauer')
    }, ({ nutzungsende_min, lueftungsstart_min, folgetermin_min, zielzeit_min }) => {
      if (folgetermin_min < nutzungsende_min) throw new RangeError('Beide Nutzungen in chronologischer Reihenfolge desselben Tages angeben.');
      const frei = Math.max(0, folgetermin_min - Math.max(nutzungsende_min, lueftungsstart_min));
      return {
        verfuegbar_min: frei, fehlend_min: Math.max(0, zielzeit_min - frei),
        hinweis: 'Das ist ein Zeitfenster. Die gelüftete Luftmenge und die Qualität der Raumluft sind daraus nicht bestimmbar.'
      };
    }, { nutzungsende_min: 600, lueftungsstart_min: 605, folgetermin_min: 620, zielzeit_min: 20 },
    { verfuegbar_min: 15, fehlend_min: 5 }),

  tool('luftreiniger_gleichzeitige_cadr_staffelung',
    'Bilanziert zwei nach gleicher Methode angegebene CADR im selben Raum mit versetzten Laufzeiten — Account for two comparable purifier ratings with staggered starts in one room.',
    purifier, {
      cadr_a_m3h: flow('Partikel-CADR Gerät A'),
      cadr_b_m3h: flow('Partikel-CADR Gerät B für gleiche Prüfmethode und Partikelfraktion'),
      nur_a_min: minutes('Laufzeit nur von Gerät A'),
      beide_min: minutes('Gemeinsame Laufzeit beider Geräte'),
      nur_b_min: minutes('Laufzeit nur von Gerät B')
    }, ({ cadr_a_m3h, cadr_b_m3h, nur_a_min, beide_min, nur_b_min }) => {
      const gesamtzeit = nur_a_min + beide_min + nur_b_min;
      const modellvolumen = (cadr_a_m3h * (nur_a_min + beide_min) + cadr_b_m3h * (nur_b_min + beide_min)) / 60;
      return {
        modellvolumen_reinluft_m3: round(modellvolumen),
        modellmittel_m3h: gesamtzeit > 0 ? round(modellvolumen * 60 / gesamtzeit) : null,
        gemeinsamer_betrieb_min: beide_min,
        hinweis: 'Idealisierte Addition vergleichbarer Partikel-CADR. Sich überlagernde Luftpfade und schlecht durchmischte Ecken werden damit nicht erfasst.'
      };
    }, { cadr_a_m3h: 180, cadr_b_m3h: 120, nur_a_min: 15, beide_min: 30, nur_b_min: 15 },
    { modellvolumen_reinluft_m3: 225, modellmittel_m3h: 225, gemeinsamer_betrieb_min: 30 }),

  tool('luftoeffnung_teilflaechen_nettostrom',
    'Schätzt den Nettostrom durch zwei Teilflächen mit beobachteter Gegenströmung — Estimate net flow through two opening sections carrying opposing flow.',
    hotAir, {
      hinein_flaeche_m2: number('Freie, einwärts durchströmte Teilfläche in m².', 0, 20),
      hinein_m_s: speed('Mittlere Geschwindigkeit senkrecht einwärts über diese Teilfläche'),
      heraus_flaeche_m2: number('Freie, auswärts durchströmte Teilfläche in m².', 0, 20),
      heraus_m_s: speed('Mittlere Geschwindigkeit senkrecht auswärts über diese Teilfläche')
    }, ({ hinein_flaeche_m2, hinein_m_s, heraus_flaeche_m2, heraus_m_s }) => {
      const hinein = hinein_flaeche_m2 * hinein_m_s * 3600;
      const heraus = heraus_flaeche_m2 * heraus_m_s * 3600;
      return {
        modell_einwaerts_m3h: round(hinein), modell_auswaerts_m3h: round(heraus),
        modell_netto_einwaerts_m3h: round(hinein - heraus),
        hinweis: 'Beide senkrechten Geschwindigkeiten müssen repräsentative Flächenmittel derselben Messphase sein. Eine einzelne Punktmessung genügt dafür nicht.'
      };
    }, { hinein_flaeche_m2: 0.25, hinein_m_s: 0.4, heraus_flaeche_m2: 0.2, heraus_m_s: 0.25 },
    { modell_einwaerts_m3h: 360, modell_auswaerts_m3h: 180, modell_netto_einwaerts_m3h: 180 }),

  tool('lueftungsrichtung_intervallanteile',
    'Verdichtet wiederholte Richtungsbeobachtungen zu Zeitanteilen für eine Öffnung — Summarize equal-length airflow direction observations for an opening.',
    hotAir, {
      einwaerts: number('Anzahl gleich langer Intervalle mit beobachtetem Einwärtsstrom.', 0, 1440),
      auswaerts: number('Anzahl gleich langer Intervalle mit beobachtetem Auswärtsstrom.', 0, 1440),
      wechselnd_oder_unklar: number('Anzahl gleich langer Intervalle mit Wechsel oder unklarem Befund.', 0, 1440)
    }, ({ einwaerts, auswaerts, wechselnd_oder_unklar }) => {
      if (![einwaerts, auswaerts, wechselnd_oder_unklar].every(Number.isInteger)) throw new RangeError('Intervalle als ganze Anzahl eingeben.');
      const gesamt = einwaerts + auswaerts + wechselnd_oder_unklar;
      return {
        intervalle: gesamt,
        einwaerts_prozent: gesamt > 0 ? round(100 * einwaerts / gesamt) : null,
        auswaerts_prozent: gesamt > 0 ? round(100 * auswaerts / gesamt) : null,
        unklar_prozent: gesamt > 0 ? round(100 * wechselnd_oder_unklar / gesamt) : null,
        hinweis: 'Beobachtungsanteile messen keine Geschwindigkeit oder Frischluftmenge. Öffnung und Länge der Intervalle konstant halten.'
      };
    }, { einwaerts: 5, auswaerts: 3, wechselnd_oder_unklar: 2 },
    { intervalle: 10, einwaerts_prozent: 50, auswaerts_prozent: 30, unklar_prozent: 20 }),

  tool('fensterloser_raum_luftpfad_vorkuehlzeit',
    'Plant die Vorkühlzeit eines Nebenraums und den anschließenden Transfer getrennt — Back-plan adjacent-room cooldown and subsequent air-transfer stages.',
    adjacent, {
      start_tagesmin: minutes('Beginn der gemessenen kühlen Außenphase als Tagesminute'),
      ende_tagesmin: minutes('Ende des geplanten Wegs als Tagesminute desselben Tages'),
      vorkuehlung_min: minutes('Aus eigener Beobachtung: Zeit bis der Nebenraum den Zielzustand hatte'),
      transfer_min: minutes('Aus eigener Beobachtung: anschließend benötigte Transferdauer')
    }, ({ start_tagesmin, ende_tagesmin, vorkuehlung_min, transfer_min }) => {
      if (ende_tagesmin < start_tagesmin) throw new RangeError('Das Zeitfenster muss innerhalb desselben Tages chronologisch sein.');
      const reserve = ende_tagesmin - start_tagesmin - vorkuehlung_min - transfer_min;
      return {
        zeitreserve_min: reserve,
        abfolge_passt: reserve >= 0,
        spaetester_start_tagesmin: reserve >= 0 ? start_tagesmin + reserve : null,
        hinweis: 'Die zwei Phasen werden nacheinander geplant. Eigene Zeiten sind nur bei ähnlichem Temperaturgefälle und Luftweg ein brauchbarer Ansatz.'
      };
    }, { start_tagesmin: 360, ende_tagesmin: 435, vorkuehlung_min: 35, transfer_min: 25 },
    { zeitreserve_min: 15, abfolge_passt: true, spaetester_start_tagesmin: 375 }),

  tool('luftreiniger_partikelverlauf_nach_abschalten',
    'Vergleicht den Partikelmesswert beim Abschalten und nach einer festgehaltenen Wartezeit — Measure particle reading rebound after a purifier is switched off.',
    purifier, {
      beim_abschalten: particle('Messwert an derselben Stelle beim Abschalten'),
      nachher: particle('Späterer Messwert'),
      abstand_min: number('Wartezeit zwischen den Messungen in Minuten.', 1, 720),
      quelle_geaendert: flag('Kam eine erkennbare Partikelquelle hinzu oder fiel eine Quelle weg?')
    }, ({ beim_abschalten, nachher, abstand_min, quelle_geaendert }) => {
      const differenz = nachher - beim_abschalten;
      return {
        beobachtete_aenderung_ug_m3: round(differenz),
        aenderung_ug_m3_je_10_min: quelle_geaendert ? null : round(10 * differenz / abstand_min),
        quellenwechsel_gemeldet: quelle_geaendert,
        hinweis: 'Zwei Zeitpunkte zeigen keinen stetigen Verlauf. Luftfeuchte, Lüftung und Quellen können den Messwert verändern.'
      };
    }, { beim_abschalten: 8, nachher: 14, abstand_min: 30, quelle_geaendert: false },
    { beobachtete_aenderung_ug_m3: 6, aenderung_ug_m3_je_10_min: 2, quellenwechsel_gemeldet: false }),

  tool('luftreiniger_sensorabstand_nah_und_aufenthalt',
    'Vergleicht Partikeländerungen am Gerät und an einem Aufenthaltsort mit einer Kontrollmessung — Compare particle changes near the purifier and at an occupied location after a baseline check.',
    purifier, {
      nah_vorher: particle('Messwert A am Gerät zu Beginn'),
      fern_vorher: particle('Messwert B am Aufenthaltsort zu Beginn desselben Zeitfensters'),
      nah_nachher: particle('Messwert A am Gerät zum Ende'),
      fern_nachher: particle('Messwert B am Aufenthaltsort zum Ende desselben Zeitfensters'),
      sensoren_kontrollmessung_aehnlich: flag('Zeigten die beiden Sensoren bei einer Kontrollmessung nebeneinander unter gleichen Bedingungen ähnliche Werte?')
    }, ({ nah_vorher, fern_vorher, nah_nachher, fern_nachher, sensoren_kontrollmessung_aehnlich }) => {
      const nah = nah_nachher - nah_vorher;
      const fern = fern_nachher - fern_vorher;
      return {
        nah_aenderung_ug_m3: round(nah), fern_aenderung_ug_m3: round(fern),
        differenz_der_aenderungen_ug_m3: sensoren_kontrollmessung_aehnlich ? round(nah - fern) : null,
        hinweis: 'Die Kontrollmessung ersetzt keine Kalibrierung. Bleiben Unterschiede bestehen, prüfen ob der Sensor nahe Ansaugung oder Ausblas misst.'
      };
    }, { nah_vorher: 20, fern_vorher: 18, nah_nachher: 6, fern_nachher: 13, sensoren_kontrollmessung_aehnlich: true },
    { nah_aenderung_ug_m3: -14, fern_aenderung_ug_m3: -5, differenz_der_aenderungen_ug_m3: -9 }),

  tool('tuerventilator_raumgefaelle_versuch',
    'Vergleicht Temperaturgefälle zwischen zwei Räumen mit und ohne aktiven Türventilator — Compare observed room-temperature gaps with and without a doorway fan.',
    adjacent, {
      nebenraum_ohne_c: temperature('Temperatur Nebenraum am Ende ohne Ventilator'),
      zielraum_ohne_c: temperature('Temperatur Zielraum am Ende ohne Ventilator'),
      nebenraum_mit_c: temperature('Temperatur Nebenraum am Ende mit Ventilator'),
      zielraum_mit_c: temperature('Temperatur Zielraum am Ende mit Ventilator'),
      startwerte_und_dauer_vergleichbar: flag('Waren Starttemperaturen, Öffnungen sowie Messdauer beider Versuche vergleichbar?')
    }, ({ nebenraum_ohne_c, zielraum_ohne_c, nebenraum_mit_c, zielraum_mit_c, startwerte_und_dauer_vergleichbar }) => {
      const ohne = zielraum_ohne_c - nebenraum_ohne_c;
      const mit = zielraum_mit_c - nebenraum_mit_c;
      return {
        gefaelle_ohne_c: round(ohne), gefaelle_mit_c: round(mit),
        aenderung_abstand_c: startwerte_und_dauer_vergleichbar ? round(Math.abs(mit) - Math.abs(ohne)) : null,
        hinweis: 'Kleinerer Temperaturabstand kann bedeuten, dass sich der Nebenraum erwärmt. Zielraumtemperatur und Umstände separat vergleichen.'
      };
    }, { nebenraum_ohne_c: 22, zielraum_ohne_c: 27, nebenraum_mit_c: 23, zielraum_mit_c: 25, startwerte_und_dauer_vergleichbar: true },
    { gefaelle_ohne_c: 5, gefaelle_mit_c: 2, aenderung_abstand_c: -3 }),

  tool('luftreiniger_stellort_luftstrom_sichtprobe',
    'Vergleicht den gemessenen Ausblasstrom an zwei Stellorten, ohne Filter oder Stufe zu wechseln — Compare outlet airspeed after moving an intact purifier.',
    purifier, {
      vorher_m_s: speed('Ausblasgeschwindigkeit am ersten Ort'),
      nachher_m_s: speed('Ausblasgeschwindigkeit am zweiten Ort'),
      vergleichbare_messung: flag('Gleiche Stufe, Filter, Messdistanz und Sensorwinkel?')
    }, ({ vorher_m_s, nachher_m_s, vergleichbare_messung }) => ({
      vorher_m_s, nachher_m_s,
      aenderung_m_s: vergleichbare_messung ? round(nachher_m_s - vorher_m_s) : null,
      hinweis: 'Die Messung am Ausblas zeigt nur Unterschiede an dieser Stelle. Stellabstände des Herstellers einhalten. Keine Einbauten oder Abdeckungen verändern.'
    }), { vorher_m_s: 1.3, nachher_m_s: 1.7, vergleichbare_messung: true },
    { vorher_m_s: 1.3, nachher_m_s: 1.7, aenderung_m_s: 0.4 }),

  tool('luftreiniger_filterrahmen_belegstatus',
    'Ordnet Sichtbelege für Filterpassform und Gehäuseschluss nach einem Filterwechsel ein — Track evidence of filter fit and cover closure after replacement.',
    purifier, {
      herstelleranleitung: flag('Liegt eine passende Herstelleranleitung für das genaue Gerät vor?'),
      filter_passform_geprueft: flag('Wurde der Sitz des vorgesehenen Filters nach Herstelleranleitung geprüft?'),
      deckel_geprueft: flag('Wurde der vollständige Gehäuseschluss nach Anleitung geprüft?')
    }, ({ herstelleranleitung, filter_passform_geprueft, deckel_geprueft }) => ({
      offene_sichtbelege: [
        ...(!herstelleranleitung ? ['herstelleranleitung'] : []),
        ...(!filter_passform_geprueft ? ['filter_passform'] : []),
        ...(!deckel_geprueft ? ['gehaeuseschluss'] : [])
      ],
      hinweis: 'Sichtbelege am ausgeschalteten und vom Strom getrennten Gerät nach Anleitung erfassen. Sie weisen keine Dichtheit oder Filterwirkung nach.'
    }), { herstelleranleitung: true, filter_passform_geprueft: false, deckel_geprueft: true },
    { offene_sichtbelege: ['filter_passform'] }),

  tool('ventilator_timer_bedienbedarf_nach_abschaltung',
    'Plant Neustarts, wenn ein Abschalttimer kürzer als das gewünschte Lüfterfenster ist — Count manual restarts when an off-timer is shorter than a selected fan window.',
    fan, {
      ziel_min: minutes('Gewünschte Lüfterzeit'),
      timer_max_min: number('Längste tatsächlich nutzbare Abschaltzeit des Timers in Minuten.', 1, 1440),
      ohne_neustart_geplant: flag('Soll im gesamten Zeitraum niemand manuell neu starten?')
    }, ({ ziel_min, timer_max_min, ohne_neustart_geplant }) => ({
      manuelle_neustarts_fuer_ziel: Math.max(0, Math.ceil(ziel_min / timer_max_min) - 1),
      fehlend_ohne_neustart_min: Math.max(0, ziel_min - timer_max_min),
      zeitraum_mit_bedienplan_passend: !ohne_neustart_geplant || timer_max_min >= ziel_min,
      hinweis: 'Das zählt Bedienvorgänge. Die Herstelleranleitung klärt zulässige Betriebsarten und Nutzung ohne Aufsicht.'
    }), { ziel_min: 190, timer_max_min: 60, ohne_neustart_geplant: true },
    { manuelle_neustarts_fuer_ziel: 3, fehlend_ohne_neustart_min: 130, zeitraum_mit_bedienplan_passend: false }),

  tool('ventilator_timer_pause_wiederanlauf_beobachtung',
    'Prüft den beobachteten Wiederanlauf mit Timer nach einer regulären Bedienpause — Check timer resumption after a normal control-panel pause.',
    fanNight, {
      rest_vor_pause_min: minutes('Angezeigte Restzeit vor der Bedienpause'),
      pause_min: minutes('Länge der Pause'),
      rest_nach_pause_min: minutes('Angezeigte Restzeit nach dem Wiederanlauf'),
      anzeige_sichtbar: flag('Waren beide Timerwerte am Gerät sichtbar?')
    }, ({ rest_vor_pause_min, pause_min, rest_nach_pause_min, anzeige_sichtbar }) => ({
      rest_bei_mitlaufendem_timer_min: Math.max(0, rest_vor_pause_min - pause_min),
      aenderung_timeranzeige_min: anzeige_sichtbar ? round(rest_nach_pause_min - rest_vor_pause_min) : null,
      hinweis: 'Die Werte stammen aus einer Bedienbeobachtung. Ein Ergebnis für diese Pause belegt kein Verhalten bei Stromausfall.'
    }), { rest_vor_pause_min: 40, pause_min: 5, rest_nach_pause_min: 40, anzeige_sichtbar: true },
    { rest_bei_mitlaufendem_timer_min: 35, aenderung_timeranzeige_min: 0 }),

  tool('tueroeffnung_luftschichtung_drei_hoehen',
    'Hält gegensätzliche Luftströmung über drei Höhen einer Türöffnung fest — Record opposing doorway flow observations at three relative heights.',
    adjacent, {
      unten: choice('Beobachtung nahe Türunterkante.', ['in_den_zielraum', 'aus_dem_zielraum', 'unklar']),
      mitte: choice('Beobachtung auf mittlerer Höhe.', ['in_den_zielraum', 'aus_dem_zielraum', 'unklar']),
      oben: choice('Beobachtung nahe Türoberkante.', ['in_den_zielraum', 'aus_dem_zielraum', 'unklar'])
    }, ({ unten, mitte, oben }) => {
      const richtungen = [unten, mitte, oben];
      return {
        gegenlaeufige_hoehen_beobachtet: richtungen.includes('in_den_zielraum') && richtungen.includes('aus_dem_zielraum'),
        eindeutige_hoehen: richtungen.filter((richtung) => richtung !== 'unklar').length,
        hinweis: 'Bei gleicher Türstellung möglichst zeitnah beobachten und ohne Rauch prüfen. Drei Höhen zeigen die Richtung und liefern keine Luftmenge.'
      };
    }, { unten: 'in_den_zielraum', mitte: 'unklar', oben: 'aus_dem_zielraum' },
    { gegenlaeufige_hoehen_beobachtet: true, eindeutige_hoehen: 2 }),

  tool('luftreiniger_staubstreifen_beobachtungsanteil',
    'Vergleicht sichtbare Staubspuren entlang gleich großer Beobachtungsflächen — Compare the area fraction with visible dust marks on equally sized observation strips.',
    purifier, {
      abschnitte_je_streifen: number('Gleiche Anzahl gleich großer Abschnitte pro Streifen.', 1, 100),
      sichtbare_abschnitte_a: number('Abschnitte mit sichtbaren Spuren an Ort A.', 0, 100),
      sichtbare_abschnitte_b: number('Abschnitte mit sichtbaren Spuren an Ort B.', 0, 100),
      gleicher_zeitraum: flag('Hatten beide Streifen dieselbe Dauer, Fläche, Oberfläche und Beleuchtung?')
    }, ({ abschnitte_je_streifen, sichtbare_abschnitte_a, sichtbare_abschnitte_b, gleicher_zeitraum }) => {
      const werte = [abschnitte_je_streifen, sichtbare_abschnitte_a, sichtbare_abschnitte_b];
      if (!werte.every(Number.isInteger) || Math.max(sichtbare_abschnitte_a, sichtbare_abschnitte_b) > abschnitte_je_streifen) {
        throw new RangeError('Ganze Anzahlen eingeben, die je Streifen höchstens der Zahl markierter Abschnitte entsprechen.');
      }
      return {
        sichtbar_a_prozent: round(100 * sichtbare_abschnitte_a / abschnitte_je_streifen),
        sichtbar_b_prozent: round(100 * sichtbare_abschnitte_b / abschnitte_je_streifen),
        differenz_prozentpunkte: gleicher_zeitraum ? round(100 * (sichtbare_abschnitte_a - sichtbare_abschnitte_b) / abschnitte_je_streifen) : null,
        hinweis: 'Die Abschnitte dokumentieren sichtbare Ablagerung. Sie messen weder Staubmasse noch PM-Konzentration in der Luft.'
      };
    }, { abschnitte_je_streifen: 10, sichtbare_abschnitte_a: 4, sichtbare_abschnitte_b: 2, gleicher_zeitraum: true },
    { sichtbar_a_prozent: 40, sichtbar_b_prozent: 20, differenz_prozentpunkte: 20 }),

  tool('raumluft_geruch_und_co2_getrennt_beobachten',
    'Hält die empfundene Geruchsänderung und die gleichzeitig gemessene CO₂-Änderung getrennt fest — Record perceived odour and measured CO₂ changes separately.',
    outdoorAir, {
      geruch_veraendert: choice('Subjektiver Geruchseindruck am selben Standort.', ['schwaecher', 'gleich', 'staerker', 'unklar']),
      co2_vor_ppm: number('CO₂-Sensor vor dem Versuch in ppm.', 0, 10000),
      co2_nach_ppm: number('CO₂-Sensor nach dem Versuch in ppm.', 0, 10000),
      co2_messung_vergleichbar: flag('Wurden mit demselben CO₂-Sensor am selben Standort vergleichbare Messungen vorgenommen?')
    }, ({ geruch_veraendert, co2_vor_ppm, co2_nach_ppm, co2_messung_vergleichbar }) => ({
      geruch_subjektiv: geruch_veraendert,
      co2_aenderung_ppm: co2_messung_vergleichbar ? round(co2_nach_ppm - co2_vor_ppm) : null,
      hinweis: 'Geruchswahrnehmung ist subjektiv und kann sich ohne CO₂-Rückgang ändern. Ein CO₂-Messwert beschreibt keine Gerüche, Partikel oder sonstigen Gase.'
    }), { geruch_veraendert: 'schwaecher', co2_vor_ppm: 900, co2_nach_ppm: 950, co2_messung_vergleichbar: true },
    { geruch_subjektiv: 'schwaecher', co2_aenderung_ppm: 50 }),

  tool('nachtlueftung_temperaturruecklauf_nach_schliessen',
    'Misst wie viel der zuvor beobachteten Abkühlung nach Fensterschluss erhalten bleibt — Check how much measured cooling remains after the windows close.',
    hotAir, {
      vor_lueftung_c: temperature('Temperatur im Zielraum vor der Lüftung'),
      bei_schluss_c: temperature('Temperatur unmittelbar beim Fensterschluss'),
      spaeter_c: temperature('Temperatur zur angegebenen Zeit nach Fensterschluss'),
      pause_min: number('Minuten seit dem Schließen.', 1, 720)
    }, ({ vor_lueftung_c, bei_schluss_c, spaeter_c, pause_min }) => {
      const anfang = vor_lueftung_c - bei_schluss_c;
      return {
        urspruengliche_abkuehlung_c: round(anfang),
        aenderung_nach_schliessen_c: round(spaeter_c - bei_schluss_c),
        erhaltene_abkuehlung_c: round(vor_lueftung_c - spaeter_c),
        erhaltene_abkuehlung_prozent: anfang > 0 ? round(100 * (vor_lueftung_c - spaeter_c) / anfang) : null,
        beobachtungsdauer_min: pause_min,
        hinweis: 'Negative Werte bedeuten einen Anstieg über den Ausgangswert, Werte über 100 % bedeuten weitere Abkühlung. Messort, Sonne und innere Wärmequellen dokumentieren.'
      };
    }, { vor_lueftung_c: 27, bei_schluss_c: 23, spaeter_c: 24.5, pause_min: 45 },
    { urspruengliche_abkuehlung_c: 4, aenderung_nach_schliessen_c: 1.5, erhaltene_abkuehlung_c: 2.5, erhaltene_abkuehlung_prozent: 62.5, beobachtungsdauer_min: 45 }),

  tool('luftpfad_zwei_tueren_gemeinsam_offen',
    'Berechnet die echte Überlappung zweier erlaubter Türöffnungszeiten entlang eines Luftpfads — Calculate the overlap when both permitted doorways in a route can remain open.',
    adjacent, {
      tuer_a_start: minutes('Beginn des verfügbaren Zeitfensters für Tür A als Tagesminute'),
      tuer_a_ende: minutes('Ende für Tür A als Tagesminute desselben Tages'),
      tuer_b_start: minutes('Beginn des verfügbaren Zeitfensters für Tür B als Tagesminute'),
      tuer_b_ende: minutes('Ende für Tür B als Tagesminute desselben Tages')
    }, ({ tuer_a_start, tuer_a_ende, tuer_b_start, tuer_b_ende }) => {
      if (tuer_a_ende < tuer_a_start || tuer_b_ende < tuer_b_start) throw new RangeError('Beim jeweiligen Zeitfenster muss das Ende am selben Tag nach dem Start liegen.');
      const start = Math.max(tuer_a_start, tuer_b_start);
      const ende = Math.min(tuer_a_ende, tuer_b_ende);
      return {
        offener_durchgang_min: Math.max(0, ende - start),
        gemeinsamer_start: start < ende ? start : null,
        gemeinsames_ende: start < ende ? ende : null,
        hinweis: 'Die Überlappung belegt nur freie Zeit für einen möglichen Luftweg. Brandschutz- und Rauchschutztüren nicht für die Lüftung offen halten.'
      };
    }, { tuer_a_start: 360, tuer_a_ende: 420, tuer_b_start: 390, tuer_b_ende: 450 },
    { offener_durchgang_min: 30, gemeinsamer_start: 390, gemeinsames_ende: 420 }),

  tool('raumluft_zielwert_erreichung_nach_start',
    'Wertet aus, zwischen welchen Messzeitpunkten ein eigener Temperaturzielwert erstmals beobachtet wurde — Locate the first sampled time window meeting a user-chosen room temperature target.',
    hotAir, {
      ziel_c: temperature('Eigener Vergleichszielwert'),
      start_c: temperature('Messwert bei Beginn'),
      erster_wert_c: temperature('Temperatur zum ersten Messpunkt nach Beginn'),
      zweiter_wert_c: temperature('Temperatur zum zweiten Messpunkt'),
      erster_min: number('Zeitpunkt des ersten Messpunkts seit Beginn in Minuten.', 1, 1440),
      zweiter_min: number('Zeitpunkt des zweiten Messpunkts seit Beginn in Minuten.', 1, 1440)
    }, ({ ziel_c, start_c, erster_wert_c, zweiter_wert_c, erster_min, zweiter_min }) => {
      if (zweiter_min <= erster_min) throw new RangeError('Der zweite Messzeitpunkt muss nach dem ersten liegen.');
      const messwerte = [{ min: 0, wert: start_c }, { min: erster_min, wert: erster_wert_c }, { min: zweiter_min, wert: zweiter_wert_c }];
      const index = messwerte.findIndex(({ wert }) => wert <= ziel_c);
      return {
        erster_messpunkt_im_ziel_min: index < 0 ? null : messwerte[index].min,
        voriger_messpunkt_min: index > 0 ? messwerte[index - 1].min : null,
        hinweis: 'Der Zeitpunkt der ersten tatsächlichen Unterschreitung ist zwischen Stichproben unbekannt. Der Zielwert stammt aus der Eingabe.'
      };
    }, { ziel_c: 24, start_c: 27, erster_wert_c: 25, zweiter_wert_c: 23, erster_min: 10, zweiter_min: 20 },
    { erster_messpunkt_im_ziel_min: 20, voriger_messpunkt_min: 10 }),

  tool('lueftung_oeffnungsstufen_durchzug_grenze',
    'Vergleicht zwei Fensteröffnungen mit einer persönlich gesetzten Zugluftgrenze — Compare two opening positions against a user-set local airspeed limit.',
    winterAir, {
      oeffnung_a_m_s: speed('Höchster beobachteter Messwert am gleichen Aufenthaltsort bei Stellung A'),
      oeffnung_b_m_s: speed('Höchster beobachteter Messwert am gleichen Aufenthaltsort bei Stellung B'),
      persoenliche_grenze_m_s: speed('Selbst gewählte Vergleichsgrenze am Aufenthaltsort'),
      versuche_vergleichbar: flag('Waren Position, Messdauer und Wetter bei beiden Versuchen vergleichbar?')
    }, ({ oeffnung_a_m_s, oeffnung_b_m_s, persoenliche_grenze_m_s, versuche_vergleichbar }) => ({
      a_innerhalb_eigener_grenze: oeffnung_a_m_s <= persoenliche_grenze_m_s,
      b_innerhalb_eigener_grenze: oeffnung_b_m_s <= persoenliche_grenze_m_s,
      a_minus_b_m_s: versuche_vergleichbar ? round(oeffnung_a_m_s - oeffnung_b_m_s) : null,
      hinweis: 'Der selbst gewählte Messwert ist keine Komfortnorm. Zugluft an einem Sitzplatz bestimmt die Außenluftzufuhr im gesamten Raum nicht.'
    }), { oeffnung_a_m_s: 0.8, oeffnung_b_m_s: 0.3, persoenliche_grenze_m_s: 0.5, versuche_vergleichbar: true },
    { a_innerhalb_eigener_grenze: false, b_innerhalb_eigener_grenze: true, a_minus_b_m_s: 0.5 }),

  tool('raumluft_zwei_sensoren_platztausch_probe',
    'Vergleicht Messdifferenzen vor und nach dem Tausch zweier PM-Messgeräte — Compare location differences before and after two particle sensors swap positions.',
    purifier, {
      ort_a_geraet_1: particle('Ort A mit Gerät 1 vor dem Platztausch'),
      ort_b_geraet_2: particle('Ort B mit Gerät 2 vor dem Platztausch'),
      ort_a_geraet_2: particle('Ort A mit Gerät 2 nach dem Platztausch'),
      ort_b_geraet_1: particle('Ort B mit Gerät 1 nach dem Platztausch'),
      bedingungen_stabil: flag('Blieben Lüftung, Quellen und Betriebsstufe während des Vergleichs ähnlich?')
    }, ({ ort_a_geraet_1, ort_b_geraet_2, ort_a_geraet_2, ort_b_geraet_1, bedingungen_stabil }) => {
      const vorher = ort_a_geraet_1 - ort_b_geraet_2;
      const nachher = ort_a_geraet_2 - ort_b_geraet_1;
      return {
        ortsdifferenz_vorher_ug_m3: round(vorher), ortsdifferenz_nachher_ug_m3: round(nachher),
        gleiches_vorzeichen: bedingungen_stabil && vorher !== 0 && nachher !== 0 ? Math.sign(vorher) === Math.sign(nachher) : null,
        hinweis: 'Ein gleiches Vorzeichen stützt nur die Wiederholbarkeit des beobachteten Ortsunterschieds. Der Tausch liefert keine Sensorkalibrierung.'
      };
    }, { ort_a_geraet_1: 19, ort_b_geraet_2: 10, ort_a_geraet_2: 16, ort_b_geraet_1: 13, bedingungen_stabil: true },
    { ortsdifferenz_vorher_ug_m3: 9, ortsdifferenz_nachher_ug_m3: 3, gleiches_vorzeichen: true }),

  tool('luftreiniger_cadr_taktbetrieb_reinluftbilanz',
    'Berechnet die idealisierte Reinluftmenge über mehrere beobachtete Ein-Aus-Intervalle — Calculate idealized clean-air volume for repeated observed on/off cycles.',
    purifier, {
      cadr_betrieb_m3h: flow('Dokumentierter Partikel-CADR während der Ein-Phase'),
      ein_min: minutes('Gemessene laufende Dauer eines Takts'),
      aus_min: minutes('Gemessene Pause je Takt'),
      volle_takte: number('Anzahl vollständiger gleichartiger Takte.', 0, 200)
    }, ({ cadr_betrieb_m3h, ein_min, aus_min, volle_takte }) => {
      if (!Number.isInteger(volle_takte)) throw new RangeError('Vollständige Takte als ganze Anzahl eingeben.');
      const beobachtet = (ein_min + aus_min) * volle_takte;
      const reinluft = cadr_betrieb_m3h * ein_min * volle_takte / 60;
      return {
        beobachtet_min: beobachtet,
        modell_reinluft_m3: round(reinluft),
        modell_cadr_mittel_m3h: beobachtet > 0 ? round(60 * reinluft / beobachtet) : null,
        hinweis: 'Das Modell setzt während jeder Ein-Phase denselben CADR an. Es bildet Quellen oder den Verlauf in den Pausen nicht ab.'
      };
    }, { cadr_betrieb_m3h: 240, ein_min: 10, aus_min: 20, volle_takte: 4 },
    { beobachtet_min: 120, modell_reinluft_m3: 160, modell_cadr_mittel_m3h: 80 }),

  tool('lueftungsversuch_aussen_delta_raumhintergrund',
    'Vergleicht PM-Änderungen innen und außen während desselben beobachteten Öffnungsversuchs — Compare matched indoor and outdoor particle changes during a window-opening observation.',
    hotAir, {
      innen_start: particle('Innenmesswert zum Start'),
      innen_ende: particle('Innenmesswert zum Ende'),
      aussen_start: particle('Außenmesswert zum selben Start'),
      aussen_ende: particle('Außenmesswert zum selben Ende'),
      instrumente_abgeglichen: flag('Wurden PM-Fraktion, Uhrzeiten und Vergleichbarkeit der Sensoren geprüft?')
    }, ({ innen_start, innen_ende, aussen_start, aussen_ende, instrumente_abgeglichen }) => {
      const innen = innen_ende - innen_start;
      const aussen = aussen_ende - aussen_start;
      return {
        innen_aenderung_ug_m3: round(innen), aussen_aenderung_ug_m3: round(aussen),
        innen_minus_aussen_delta_ug_m3: instrumente_abgeglichen ? round(innen - aussen) : null,
        hinweis: 'Das Ergebnis beschreibt zwei Messreihen. Es trennt Innenquellen, feuchtebedingte Messabweichung und Außenluftanteil nicht.'
      };
    }, { innen_start: 14, innen_ende: 19, aussen_start: 20, aussen_ende: 22, instrumente_abgeglichen: true },
    { innen_aenderung_ug_m3: 5, aussen_aenderung_ug_m3: 2, innen_minus_aussen_delta_ug_m3: 3 }),
];
