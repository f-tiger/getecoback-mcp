import {calculate as calculateTariff} from '../site/assets/energy-tariff-model.mjs';
import {annual as annualLabel, calculate as calculateProduct, defaults as productDefaults} from '../site/assets/product-decision-model.mjs';

const tariffPage = '/stromtarif-werkstatt.html';
const meterPage = '/strommess-protokoll.html';
const labelPage = '/geraete-austausch-rechner.html';
const householdBenchmark = {'1': 1200, '2': 1900, '3': 2400, '4': 2600};

function number(description, minimum, maximum) {
  return {type: 'number', description, minimum, maximum};
}
function choice(description, values) {
  return {type: 'string', description, enum: values};
}
const kwh = description => number(description, 0, 100000);
const euro = description => number(description, 0, 100000);
const rate = description => number(description, 0, 5);
const rounded = (value, digits = 2) => Number(value.toFixed(digits)) || 0;

function flatOffer(price, fixed, bonus) {
  return {mode: 'flat', rates: [price], fixed, powerKW: [], powerRates: [], bonus};
}

export const efficiencySuite = [
  {
    name: 'stromtarife_bonus_vergleichen',
    description: 'Zwei Stromtarife mit Bonus, Wechselkosten und Folgekosten vergleichen. — Compare two electricity offers including one-time incentives and recurring costs.',
    page: tariffPage,
    properties: {
      jahresverbrauch_kwh: number('Erwarteter Jahresverbrauch in kWh.', 1, 100000),
      arbeit_a: rate('Arbeitspreis A als Brutto-€/kWh.'),
      grund_a: euro('Grundpreis A in Euro pro Jahr.'),
      bonus_a: euro('Einmaliger Bonus A in Euro, soweit die Bedingungen erfüllt sind.'),
      arbeit_b: rate('Arbeitspreis B als Brutto-€/kWh.'),
      grund_b: euro('Grundpreis B in Euro pro Jahr.'),
      bonus_b: euro('Einmaliger Bonus B in Euro, soweit die Bedingungen erfüllt sind.'),
      wechselkosten: euro('Einmalige Zusatzkosten für B in Euro.'),
    },
    calculate(a) {
      const r = calculateTariff({
        version: 1, market: 'de', own: true, kwh: [a.jahresverbrauch_kwh],
        A: flatOffer(a.arbeit_a, a.grund_a, a.bonus_a),
        B: flatOffer(a.arbeit_b, a.grund_b, a.bonus_b),
        switchCost: a.wechselkosten, shift: 0, stress: 0,
      });
      return {
        tarif_a_erstes_jahr_eur: rounded(r.A.first), tarif_b_erstes_jahr_eur: rounded(r.B.first),
        tarif_a_danach_eur_pro_jahr: rounded(r.A.recurring), tarif_b_danach_eur_pro_jahr: rounded(r.B.recurring),
        vorteil_b_ueber_zwei_jahre_eur: rounded(r.twoYearSaving), b_nur_im_ersten_jahr_guenstiger: r.bonusTrap,
        annahme: 'Gleicher Verbrauch und unveränderte Preise. Laufzeit und Bonusbedingungen beim Anbieter prüfen.',
      };
    },
    example: {
      args: {jahresverbrauch_kwh: 2500, arbeit_a: 0.32, grund_a: 100, bonus_a: 0, arbeit_b: 0.30, grund_b: 180, bonus_b: 100, wechselkosten: 0},
      expect: {tarif_b_erstes_jahr_eur: 830, b_nur_im_ersten_jahr_guenstiger: true},
    },
  },
  {
    name: 'stromtarif_verbrauchsschwelle',
    description: 'Verbrauchsschwelle zwischen niedrigem Grundpreis und niedrigem Arbeitspreis bestimmen. — Find the annual usage where two flat tariffs break even.',
    page: tariffPage,
    properties: {
      arbeit_a: rate('Arbeitspreis A als Brutto-€/kWh.'), grund_a: euro('Grundpreis A in Euro pro Jahr.'),
      arbeit_b: rate('Arbeitspreis B als Brutto-€/kWh.'), grund_b: euro('Grundpreis B in Euro pro Jahr.'),
    },
    calculate(a) {
      const slope = rounded(a.arbeit_a - a.arbeit_b, 12);
      const intercept = rounded(a.grund_a - a.grund_b, 10);
      const root = slope === 0 ? null : -intercept / slope;
      const threshold = root !== null && root >= 0 && Number.isFinite(root) ? root : null;
      const winner = difference => difference > 0 ? 'b' : difference < 0 ? 'a' : 'gleich';
      return {
        gleichstand_kwh_pro_jahr: threshold === null ? null : rounded(threshold),
        bei_null_verbrauch_guenstiger: winner(intercept),
        bei_hohem_verbrauch_guenstiger: winner(slope || intercept),
        annahme: 'Laufende Preise ohne Einmalbonus. Null bedeutet Gleichstand ohne Verbrauch. Bei null als JSON-Leerwert gibt es keine einzelne Schwelle im nichtnegativen Verbrauchsbereich.',
      };
    },
    example: {args: {arbeit_a: 0.35, grund_a: 100, arbeit_b: 0.30, grund_b: 200}, expect: {gleichstand_kwh_pro_jahr: 2000}},
  },
  {
    name: 'stromabschlag_abgleichen',
    description: 'Stromrechnung und tatsächlich gezahlte Abschläge abstimmen. — Reconcile an electricity bill with instalments and credits already paid.',
    page: tariffPage,
    properties: {
      abrechnung_eur: euro('Gesamtkosten des Abrechnungszeitraums vor Anrechnung von Guthaben.'),
      abschlaege_eur: euro('Summe der tatsächlich geleisteten Abschläge desselben Zeitraums.'),
      gutschriften_eur: euro('Anrechenbare Gutschriften, die noch nicht in den Kosten oder Abschlägen enthalten sind.'),
    },
    calculate(a) {
      const balance = rounded(a.abrechnung_eur - a.abschlaege_eur - a.gutschriften_eur);
      return {
        nachzahlung_eur: Math.max(balance, 0), guthaben_eur: Math.max(-balance, 0),
        annahme: 'Alle Beträge müssen zum selben Abrechnungszeitraum gehören. Jeden Abschlag und jede Gutschrift nur einmal zählen.',
      };
    },
    example: {args: {abrechnung_eur: 940, abschlaege_eur: 900, gutschriften_eur: 75}, expect: {guthaben_eur: 35, nachzahlung_eur: 0}},
  },
  {
    name: 'strompreiswechsel_zaehlerstand',
    description: 'Verbrauchskosten vor und nach einem Preiswechsel aus drei Zählerständen prüfen. — Rebuild both usage charges when a rate changes during the billing period.',
    page: meterPage,
    properties: {
      start_kwh: kwh('Zählerstand zu Beginn der Abrechnung.'),
      wechsel_kwh: kwh('Zählerstand am Tag des Preiswechsels.'),
      ende_kwh: kwh('Zählerstand am Ende der Abrechnung.'),
      arbeit_alt: rate('Alter Brutto-Arbeitspreis in €/kWh.'),
      arbeit_neu: rate('Neuer Brutto-Arbeitspreis in €/kWh.'),
    },
    calculate(a) {
      if (a.wechsel_kwh < a.start_kwh || a.ende_kwh < a.wechsel_kwh) throw new RangeError('Zeitlich sortierte Stände desselben Bezugszählers verwenden.');
      const before = a.wechsel_kwh - a.start_kwh;
      const after = a.ende_kwh - a.wechsel_kwh;
      return {
        alt_kwh: rounded(before, 3), neu_kwh: rounded(after, 3),
        arbeitspreiskosten_eur: rounded(before * a.arbeit_alt + after * a.arbeit_neu),
        annahme: 'Nur Verbrauchskosten. Grundpreis, Boni und Abschläge separat prüfen. Bei Zählerwechsel einen Übergabestand je Gerät berücksichtigen.',
      };
    },
    example: {args: {start_kwh: 1000, wechsel_kwh: 1600, ende_kwh: 2000, arbeit_alt: 0.3, arbeit_neu: 0.4}, expect: {arbeitspreiskosten_eur: 340}},
  },
  {
    name: 'stromlast_zeitfenster_verschieben',
    description: 'Kosten einer verschiebbaren Ladung für zwei bekannte Zeitfenster vergleichen. — Compare the gross running cost of a flexible load in two known tariff windows.',
    page: '/guide/strompreis-radar.html',
    properties: {
      ladung_kwh: kwh('Energie für einen vollständigen Lauf in kWh.'),
      preis_jetzt: number('Brutto-Arbeitspreis im ersten Zeitfenster in €/kWh.', -5, 5),
      preis_spaeter: number('Brutto-Arbeitspreis im alternativen Zeitfenster in €/kWh.', -5, 5),
    },
    calculate(a) {
      return {
        kosten_erstes_fenster_eur: rounded(a.ladung_kwh * a.preis_jetzt),
        kosten_alternatives_fenster_eur: rounded(a.ladung_kwh * a.preis_spaeter),
        vorteil_verschiebung_eur: rounded(a.ladung_kwh * (a.preis_jetzt - a.preis_spaeter)),
        annahme: 'Für den ganzen Lauf gilt der jeweilige eingegebene Endkundenpreis. Preiswechsel während des Laufs nach Energie je Preisintervall rechnen. Der Börsenpreis allein ist kein Endkundenpreis.',
      };
    },
    example: {args: {ladung_kwh: 3, preis_jetzt: 0.40, preis_spaeter: 0.25}, expect: {vorteil_verschiebung_eur: 0.45}},
  },
  {
    name: 'strombudget_verbrauchsgrenze',
    description: 'Aus Monatsbudget und Tarif ein jährliches Verbrauchslimit ableiten. — Turn a monthly electricity budget into a maximum annual consumption target.',
    page: tariffPage,
    properties: {
      monatsbudget_eur: euro('Durchschnittlich vorgesehenes Monatsbudget in Euro.'),
      grund_eur_jahr: euro('Feste jährliche Tarifkosten in Euro.'),
      arbeit: number('Brutto-Arbeitspreis in €/kWh.', 0.001, 5),
      geplant_kwh_jahr: kwh('Aktuell erwarteter Jahresverbrauch in kWh.'),
    },
    calculate(a) {
      const variableBudget = a.monatsbudget_eur * 12 - a.grund_eur_jahr;
      const limit = variableBudget >= 0 ? Math.floor(variableBudget / a.arbeit + 1e-10) : null;
      return {
        budgetgrenze_kwh_jahr: limit, grundpreis_passt_ins_budget: variableBudget >= 0,
        geplanter_monatsdurchschnitt_eur: rounded((a.geplant_kwh_jahr * a.arbeit + a.grund_eur_jahr) / 12),
        annahme: 'Monatsdurchschnitt über ein ganzes Jahr ohne Boni. Ein Nullwert als JSON-Leerwert bedeutet, dass bereits der Grundpreis das Budget übersteigt.',
      };
    },
    example: {args: {monatsbudget_eur: 100, grund_eur_jahr: 120, arbeit: 0.30, geplant_kwh_jahr: 4000}, expect: {budgetgrenze_kwh_jahr: 3600, geplanter_monatsdurchschnitt_eur: 110}},
  },
  {
    name: 'strompaket_auslastung_pruefen',
    description: 'Festes kWh-Paket gegen einen Normaltarif auf Mehrverbrauch und ungenutzte Menge prüfen. — Check the cost of a prepaid kWh bundle against ordinary marginal billing.',
    page: tariffPage,
    properties: {
      verbrauch_kwh: kwh('Erwarteter Jahresverbrauch in kWh.'),
      paket_kwh: kwh('Im Jahrespaket enthaltene kWh ohne Rückvergütung bei Mindernutzung.'),
      paketpreis_eur: euro('Gesamter Paketpreis pro Jahr einschließlich fixer Kosten.'),
      mehrpreis: rate('Brutto-€/kWh für den Verbrauch oberhalb des Pakets.'),
      normalpreis: rate('Brutto-Arbeitspreis des Vergleichstarifs in €/kWh.'),
      normalgrund_eur: euro('Grundpreis des Vergleichstarifs pro Jahr in Euro.'),
    },
    calculate(a) {
      const excess = Math.max(0, a.verbrauch_kwh - a.paket_kwh);
      const packageCost = a.paketpreis_eur + excess * a.mehrpreis;
      const regularCost = a.normalgrund_eur + a.verbrauch_kwh * a.normalpreis;
      return {
        ungenutzt_kwh: Math.max(0, a.paket_kwh - a.verbrauch_kwh), mehrverbrauch_kwh: excess,
        paket_eur_pro_jahr: rounded(packageCost), normaltarif_eur_pro_jahr: rounded(regularCost),
        vorteil_paket_eur_pro_jahr: rounded(regularCost - packageCost),
        annahme: 'Festes Paket ohne Erstattung oder Übertrag, ein Preis für Mehrverbrauch. Vertragsdetails vor dem Vergleich prüfen.',
      };
    },
    example: {args: {verbrauch_kwh: 2800, paket_kwh: 3000, paketpreis_eur: 920, mehrpreis: 0.5, normalpreis: 0.28, normalgrund_eur: 120}, expect: {ungenutzt_kwh: 200, vorteil_paket_eur_pro_jahr: -16}},
  },
  {
    name: 'stromschaetzung_abweichung',
    description: 'Einen geschätzten Ablesewert mit einem Stand vom selben Datum abgleichen. — Quantify the difference between an estimated bill reading and a contemporaneous actual reading.',
    page: meterPage,
    properties: {
      vorher_kwh: kwh('Letzter bestätigter Startwert desselben Zählers.'),
      geschaetzt_kwh: kwh('Geschätzter Endstand auf der Abrechnung.'),
      tatsaechlich_kwh: kwh('Tatsächlich abgelesener Stand am selben Enddatum.'),
      arbeit: rate('Konstanter Arbeitspreis in Brutto-€/kWh.'),
    },
    calculate(a) {
      if (Math.min(a.geschaetzt_kwh, a.tatsaechlich_kwh) < a.vorher_kwh) throw new RangeError('Kein rückwärts laufender Bezugszähler.');
      const difference = rounded(a.tatsaechlich_kwh - a.geschaetzt_kwh, 3);
      return {
        korrektur_kwh: difference,
        korrektur_verbrauchskosten_eur: rounded(difference * a.arbeit),
        annahme: 'Gleicher Zähler und gleicher Stichtag. Ein späterer Stand allein belegt keine frühere Abweichung. Ergebnis ist eine Differenzrechnung ohne Entscheidung über eine Erstattung.',
      };
    },
    example: {args: {vorher_kwh: 1500, geschaetzt_kwh: 1800, tatsaechlich_kwh: 1710, arbeit: 0.4}, expect: {korrektur_kwh: -90, korrektur_verbrauchskosten_eur: -36}},
  },
  {
    name: 'steckdosenmessung_mindestdauer',
    description: 'Messdauer für einen kleinen, gleichmäßigen Verbraucher aus der Anzeigeauflösung planen. — Estimate how long a steady low-power load needs to register on a plug meter.',
    page: meterPage,
    properties: {
      last_w: number('Erwartete konstante Wirkleistung in Watt.', 0.01, 4000),
      schritt_kwh: number('Kleinste darstellbare Änderung der Energieanzeige in kWh.', 0.000001, 1),
      ziel_schritte: number('Zahl der gewünschten Anzeigeschritte.', 1, 1000),
    },
    calculate(a) {
      return {
        dauer_stunden_geplant: Math.ceil(a.schritt_kwh * Math.ceil(a.ziel_schritte) * 100000 / a.last_w) / 100,
        annahme: 'Nur Anzeigeauflösung. Prüfe die Mindestlast, den Messfehler laut Hersteller und die zulässige Last; ein Zähler kann trotz langer Dauer zu kleine Lasten verfehlen.',
      };
    },
    example: {args: {last_w: 2, schritt_kwh: 0.01, ziel_schritte: 3}, expect: {dauer_stunden_geplant: 15}},
  },
  {
    name: 'strommessung_a_b_messfehler',
    description: 'Zwei Messläufe derselben Aufgabe unter Berücksichtigung der Fehlergrenzen vergleichen. — Check whether a measured mode change exceeds the stated measurement uncertainty.',
    page: meterPage,
    properties: {
      a_kwh: kwh('Gemessene kWh des ersten Laufs.'), b_kwh: kwh('Gemessene kWh des zweiten Laufs.'),
      fehler_a_kwh: kwh('Absolute Fehlergrenze für die erste Messung in kWh.'),
      fehler_b_kwh: kwh('Absolute Fehlergrenze für die zweite Messung in kWh.'),
      aufgabe_identisch: {type: 'boolean', description: 'Wurde dieselbe Aufgabe bis zum gleichen Ergebnis unter vergleichbaren Bedingungen erledigt?'},
    },
    calculate(a) {
      const delta = rounded(a.a_kwh - a.b_kwh, 9);
      const maxError = rounded(a.fehler_a_kwh + a.fehler_b_kwh, 9);
      const verdict = !a.aufgabe_identisch ? 'nicht_vergleichbar' : Math.abs(delta) <= maxError ? 'innerhalb_fehlergrenze' : delta > 0 ? 'b_braucht_weniger' : 'a_braucht_weniger';
      return {a_minus_b_kwh: delta, fehlergrenze_der_differenz_kwh: maxError, befund: verdict};
    },
    example: {args: {a_kwh: 1.02, b_kwh: 1.00, fehler_a_kwh: 0.015, fehler_b_kwh: 0.015, aufgabe_identisch: true}, expect: {befund: 'innerhalb_fehlergrenze'}},
  },
  {
    name: 'strombilanz_restverbrauch',
    description: 'Erkennen, wie viel Verbrauch noch keinem einzeln gemessenen Gerät zugeordnet ist. — Reconcile a total meter reading with disjoint appliance measurements.',
    page: meterPage,
    properties: {
      haushalt_kwh: kwh('Verbrauch laut Gesamtzähler im betrachteten Zeitraum.'),
      zugeordnet_kwh: kwh('Summe der einzeln gemessenen Geräte im selben Zeitraum ohne Doppelzählung.'),
    },
    calculate(a) {
      const residual = rounded(a.haushalt_kwh - a.zugeordnet_kwh, 6);
      return {
        rest_kwh: residual < 0 ? null : residual,
        rest_prozent: a.haushalt_kwh > 0 && residual >= 0 ? rounded(residual / a.haushalt_kwh * 100, 1) : null,
        messdaten_pruefen: residual < 0,
        annahme: 'Gleicher Zeitraum und gleiche Bilanzgrenze. Der Rest zeigt, wo noch nicht gemessen wurde. Ohne weitere Messung lässt er sich keinem Gerät zuordnen.',
      };
    },
    example: {args: {haushalt_kwh: 14, zugeordnet_kwh: 10.5}, expect: {rest_kwh: 3.5, rest_prozent: 25}},
  },
  {
    name: 'stromzaehler_impulsleistung',
    description: 'Mittlere Bezugsleistung aus gezählten sichtbaren Zählerimpulsen ableiten. — Estimate average import power from an optical meter pulse count without touching the installation.',
    page: meterPage,
    properties: {
      impulse: number('Gezählte Impulse des Bezugszählers.', 0, 100000),
      impulse_pro_kwh: number('Am Zähler angegebene Impulse pro kWh.', 1, 100000),
      sekunden: number('Beobachtungsfenster in Sekunden.', 1, 86400),
    },
    calculate(a) {
      if (!Number.isInteger(a.impulse)) throw new RangeError('Impulse müssen eine ganze Anzahl sein.');
      const intervalWatt = 3.6e6 / (a.impulse_pro_kwh * a.sekunden);
      return {
        mittlere_wirkleistung_w: rounded(a.impulse * intervalWatt, 1),
        ein_impuls_entspricht_w: rounded(intervalWatt, 1),
        annahme: 'Nur für die am Gerät gekennzeichnete Bezugsimpulsanzeige. Bei wenigen Impulsen ist die Auflösung grob. Zählergehäuse geschlossen lassen.',
      };
    },
    example: {args: {impulse: 5, impulse_pro_kwh: 1000, sekunden: 60}, expect: {mittlere_wirkleistung_w: 300, ein_impuls_entspricht_w: 60}},
  },
  {
    name: 'geraetetakt_aus_messung',
    description: 'Aus dem Energiezähler effektive Laufzeit eines Geräts mit zwei stabilen Leistungsstufen abschätzen. — Infer the operating time of a two-state appliance from measured energy.',
    page: meterPage,
    properties: {
      energie_kwh: kwh('Im Beobachtungsfenster gemessene kWh.'),
      stunden: number('Dauer des Beobachtungsfensters in Stunden.', 0.01, 8760),
      ruhe_w: number('Konstante gemessene Wirkleistung in Ruhe in Watt.', 0, 4000),
      betrieb_w: number('Konstante gemessene Wirkleistung im Betrieb in Watt.', 0.01, 4000),
    },
    calculate(a) {
      if (a.betrieb_w <= a.ruhe_w) throw new RangeError('Betrieb muss mehr Leistung als Ruhe benötigen.');
      const expectedWattHours = a.energie_kwh * 1000 - a.ruhe_w * a.stunden;
      const equivalentHours = expectedWattHours / (a.betrieb_w - a.ruhe_w);
      const fits = equivalentHours >= -1e-8 && equivalentHours <= a.stunden + 1e-8;
      const hours = fits ? Math.min(a.stunden, Math.max(0, equivalentHours)) : null;
      return {
        laufzeit_stunden_geschaetzt: hours === null ? null : rounded(hours, 3),
        laufanteil_prozent_geschaetzt: hours === null ? null : rounded(100 * hours / a.stunden, 1),
        zweistufenmodell_passt: fits,
        annahme: 'Rechnerische Laufzeit aus zwei konstanten Stufen. Variable Leistung oder weitere Betriebsmodi erfordern eine Messung des Zeitverlaufs.',
      };
    },
    example: {args: {energie_kwh: 0.22, stunden: 2, ruhe_w: 20, betrieb_w: 200}, expect: {laufzeit_stunden_geschaetzt: 1, laufanteil_prozent_geschaetzt: 50}},
  },
  {
    name: 'energielabel_messwert_abgleichen',
    description: 'Energieetikett und eigene Messreihe bei gleicher Anzahl vergleichbarer Zyklen abgleichen. — Compare EU label cycle energy with household measurements for the same type of cycle.',
    page: labelPage,
    properties: {
      label_kwh_je_100: kwh('Energie laut Label in kWh je 100 Zyklen.'),
      gemessen_kwh: kwh('Energie deiner beobachteten Zyklen zusammen in kWh.'),
      gemessene_zyklen: number('Anzahl beobachteter Zyklen.', 1, 1000),
      vergleichbar: {type: 'boolean', description: 'Programm, Beladung und Ergebnis sind für den Szenarienvergleich hinreichend ähnlich.'},
    },
    calculate(a) {
      if (!Number.isInteger(a.gemessene_zyklen)) throw new RangeError('Vollständige Zyklen zählen.');
      const label = annualLabel(a.label_kwh_je_100, 'hundred', a.gemessene_zyklen);
      return {
        label_fuer_messreihe_kwh: rounded(label, 3),
        messwert_kwh_je_zyklus: rounded(a.gemessen_kwh / a.gemessene_zyklen, 3),
        abweichung_kwh: a.vergleichbar ? rounded(a.gemessen_kwh - label, 3) : null,
        annahme: 'Für Labels mit kWh je 100 Zyklen. Haushaltsmessungen ersetzen keine standardisierte Prüfung.',
      };
    },
    example: {args: {label_kwh_je_100: 60, gemessen_kwh: 3.4, gemessene_zyklen: 5, vergleichbar: true}, expect: {label_fuer_messreihe_kwh: 3, abweichung_kwh: 0.4}},
  },
  {
    name: 'spuelmaschine_handspuelen_kosten',
    description: 'Spülmaschine und Handwäsche für dieselbe Geschirrmenge inklusive Warmwasser vergleichen. — Compare dishwashing costs for the same load with hot water and electricity.',
    page: labelPage,
    properties: {
      maschine_kwh: number('Strom für ein vollständiges Maschinenprogramm bei Kaltwasseranschluss.', 0, 20),
      maschine_l: number('Maschinenwasser in Litern pro Programm.', 0, 200),
      hand_l: number('Warmwasser für das Handspülen derselben Geschirrmenge in Litern.', 0, 500),
      temperaturhub_c: number('Unterschied zwischen Zulauf- und Handspültemperatur in °C.', 0, 60),
      waermefaktor: number('Nutzwärme je Energieeinheit der Warmwasserbereitung. Beispiel: Wirkungsgrad 0,85.', 0.1, 8),
      strom_eur_kwh: rate('Brutto-Strompreis in €/kWh für die Maschine.'),
      waerme_eur_kwh: rate('Brutto-Preis des Energieeinsatzes zur Warmwasserbereitung in €/kWh.'),
      wasser_eur_m3: number('Kombinierter Wasser- und Abwasserpreis in €/m³.', 0, 100),
    },
    calculate(a) {
      const r = calculateProduct({
        ...productDefaults(), mode: 'dish', machineHeat: 'included', cycles: 1,
        machineEnergy: a.maschine_kwh, machineWater: a.maschine_l, handWater: a.hand_l,
        lift: a.temperaturhub_c, ratio: a.waermefaktor, rate: a.strom_eur_kwh,
        heatRate: a.waerme_eur_kwh, waterRate: a.wasser_eur_m3,
      });
      return {
        maschine_eur_pro_ladung: rounded(r.ca, 3), hand_eur_pro_ladung: rounded(r.cb, 3),
        gleichstand_hand_liter: r.threshold === null ? null : rounded(r.threshold, 1),
        annahme: 'Gleiche Geschirrmenge und vergleichbares Ergebnis. Kaltwasseranschluss an der Maschine, kein Vorspülen, keine Waschmittel- oder Gerätekosten.',
      };
    },
    example: {args: {maschine_kwh: 1, maschine_l: 10, hand_l: 20, temperaturhub_c: 30, waermefaktor: 1, strom_eur_kwh: 0.3, waerme_eur_kwh: 0.3, wasser_eur_m3: 5}, expect: {maschine_eur_pro_ladung: 0.35}},
  },
  {
    name: 'wohnungsstrom_stromspiegel',
    description: 'Jahresverbrauch einer Wohnung mit passender Haushaltsgröße nach Stromspiegel einordnen. — Benchmark apartment electricity against the cited German household averages.',
    page: '/guide/stromvergleich-check.html',
    properties: {
      personen: choice('Personen im Haushalt als Auswahl. Nur Wohnungen.', Object.keys(householdBenchmark)),
      jahresverbrauch_kwh: kwh('Bezug in kWh aus einer vollständigen Jahresabrechnung.'),
      warmwasser_elektrisch: {type: 'boolean', description: 'Wird das Warmwasser elektrisch bereitet? Bei ja sind diese Referenzwerte nicht anwendbar.'},
    },
    calculate(a) {
      const reference = a.warmwasser_elektrisch ? null : householdBenchmark[a.personen];
      return {
        referenz_kwh_pro_jahr: reference,
        abstand_kwh_pro_jahr: reference === null ? null : rounded(a.jahresverbrauch_kwh - reference, 1),
        annahme: 'Gerundete Wohnungswerte aus dem verlinkten Stromspiegel 2025 ohne elektrische Warmwasserbereitung. Keine individuelle Verbrauchsdiagnose.',
      };
    },
    example: {args: {personen: '2', jahresverbrauch_kwh: 2400, warmwasser_elektrisch: false}, expect: {referenz_kwh_pro_jahr: 1900, abstand_kwh_pro_jahr: 500}},
  },
  {
    name: 'standby_steckdosengruppe_abschalten',
    description: 'Nettoeinsparung einer abschaltbaren Gerätegruppe mit Eigenverbrauch der Steuerung prüfen. — Work out whether a safely switchable standby group saves energy after controller overhead.',
    page: '/guide/strom-sparen-haushalt.html',
    properties: {
      standby_w: number('Gemessene gemeinsame Ruhe-Wirkleistung in Watt.', 0, 4000),
      abschaltzeit_h_tag: number('Sichere Abschaltdauer in Stunden pro Tag.', 0, 24),
      steuerung_w: number('Mittlere Dauerleistung der Schaltsteuerung in Watt. Bei einer mechanisch abschaltbaren Leiste ohne Eigenverbrauch 0.', 0, 100),
      arbeit: rate('Brutto-Arbeitspreis in €/kWh.'),
      geeignet: {type: 'boolean', description: 'Alle Geräte dürfen laut Anleitung vollständig vom Strom getrennt werden und müssen keine Aufgaben im Hintergrund erledigen.'},
    },
    calculate(a) {
      const difference = (a.standby_w * a.abschaltzeit_h_tag - a.steuerung_w * 24) * 365 / 1000;
      return {
        netto_ersparnis_kwh_pro_jahr: a.geeignet ? rounded(difference, 3) : null,
        netto_ersparnis_eur_pro_jahr: a.geeignet ? rounded(difference * a.arbeit) : null,
        annahme: 'Konstanter Tagesplan und unveränderte Nutzung. Eine negative Ersparnis bedeutet zusätzlichen Verbrauch. Bei unklarer Eignung Geräte angeschlossen lassen.',
      };
    },
    example: {args: {standby_w: 5, abschaltzeit_h_tag: 12, steuerung_w: 1, arbeit: 0.3, geeignet: true}, expect: {netto_ersparnis_kwh_pro_jahr: 13.14}},
  },
];
