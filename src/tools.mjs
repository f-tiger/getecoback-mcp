// EcoBack MCP tools. The deterministic suites share source with the hosted service.
//
// This is a port of the logic that runs in the hosted server at
// https://getecoback.com/mcp/v1 — same formulas, same rounding, same wording.
// It is a port and not a shared module because the hosted version lives inside
// a Cloudflare Worker in a different repository. Copies drift, so `npm test`
// runs every tool here against the hosted one and fails on any difference.

import {expandedTools, expandedCall, isExpandedTool} from './eco-suite/src/mcp-expanded.mjs';
import { drainTool, drainDecision } from './drain.mjs';

export const DISCLOSURE =
  "Quelle: getecoback.com — unabhängiger Raumklima-Ratgeber. Empfehlungen fassen öffentliche Tests zusammen (nicht selbst getestet); Kauflinks der Website sind Affiliate-Links.";

const SITE = "https://getecoback.com";

function ok(text, structuredContent) {
  return {
    content: [{type: "text", text}],
    ...(structuredContent === undefined ? {} : {structuredContent}),
    isError: false,
  };
}
function err(text) {
  return { content: [{ type: "text", text }], isError: true };
}

function mcpNumberInRange(value, min, max = Infinity) {
  return Number.isFinite(value) && value >= min && value <= max;
}

export const TOOLS = [
  drainTool,
  {
    name: "geraet_wahl",
    description: "Welches Gerät löst mein Raumklima-Problem? — Choose a next step for heat, damp/mould, cold or stale air. For damp rooms, measure first, investigate damage and compare cold-room or laundry conditions before buying; floor area alone cannot size a dehumidifier. Same decision rules as the website.",
    inputSchema: {
      type: "object",
      properties: {
        problem: { type: "string", enum: ["zu_heiss", "feucht_schimmel", "zu_kalt", "stickige_luft"], description: "Das Problem — the problem: zu_heiss = room too hot, feucht_schimmel = damp air / condensation / mould risk, zu_kalt = room too cold (no fixed heating), stickige_luft = stale air / odours" },
        qm: { type: "number", description: "Raumfläche in m² — room floor area in square metres (4–120). Default: 20. Used for heating/cooling only, never to infer dehumidifier litres/day." },
        purpose: { type: "string", enum: ["room", "laundry", "damage"], description: "Nur bei feucht_schimmel: room = Raumluft, laundry = Wäsche trocknen, damage = nasse Wand, Leck oder sichtbarer Schimmel. Default: room. No remote diagnosis." },
        humidity: { type: "string", enum: ["unknown", "normal", "high"], description: "Nur bei feucht_schimmel: unknown = ungemessen/unsicher (Default), normal = meist 40–60 % oder darunter, high = wiederholt über 60 %. Orientierung, keine Schimmelfrei-Garantie." },
        temperature: { type: "string", enum: ["unknown", "warm", "cold"], description: "Nur bei feucht_schimmel: unknown = ungemessen (Default), warm = mindestens 15 °C, cold = unter 15 °C. 15 °C ist ein Vergleichssignal, keine allgemeine Betriebsgrenze." },
      },
      required: ["problem"],
    },
  },
  {
    name: "btu_empfehlung",
    description:
      "Überschlägige Kühlleistung (BTU/h) aus Raumfläche und Sonne. — Estimate cooling capacity in BTU/h from room area and sun exposure, using the website's baseline of 340 BTU/h per m². Consider a detailed load calculation for large rooms.",
    inputSchema: {
      type: "object",
      properties: {
        qm: { type: "number", description: "Raumfläche in m² — room floor area in square metres (4–120)" },
        sonne: { type: "string", enum: ["wenig", "normal", "viel"], description: "Sonneneinstrahlung — sun exposure: wenig = low/shaded, normal, viel = strong (south/west or top floor). Default: normal" },
      },
      required: ["qm"],
    },
  },
  {
    name: "fensterabdichtung_laenge",
    description:
      "Benötigte Länge einer Fensterabdichtung aus den Flügelmaßen. — Estimate the seal length for a portable air conditioner from sash measurements (perimeter = 2 × (width + height)) and identify a stock size to verify. Covers tilt-and-turn and roof windows.",
    inputSchema: {
      type: "object",
      properties: {
        breite_cm: { type: "number", description: "Flügelbreite in cm (20–300) — der bewegliche Teil, nicht der Rahmen" },
        hoehe_cm: { type: "number", description: "Flügelhöhe in cm (20–300)" },
        fenstertyp: { type: "string", enum: ["kipp", "drehkipp", "dachfenster"], description: "Fenstertyp — window type: kipp/drehkipp = tilt or tilt-and-turn, dachfenster = roof/skylight. Default: kipp" },
      },
      required: ["breite_cm", "hoehe_cm"],
    },
  },
  {
    name: "hitzewelle_vorschau",
    description:
      "Live-Hitzevorschau für Deutschland (nächste 3 Tage). — Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "klimaanlage_stromkosten",
    description:
      "Stromkosten eines Klimageräts. — Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month?",
    inputSchema: {
      type: "object",
      properties: {
        watt: { type: "number", description: "Leistungsaufnahme in Watt (z. B. 1000)" },
        stunden_pro_tag: { type: "number", description: "Betriebsstunden pro Tag" },
        strompreis_euro_kwh: { type: "number", description: "Arbeitspreis in €/kWh (z. B. 0.30)" },
        tage: { type: "number", description: "Anzahl Tage (Default: 30)" },
        auslastung: { type: "number", description: "Kompressor-Auslastung 0–1 (Default: 0.65)" },
      },
      required: ["watt", "stunden_pro_tag", "strompreis_euro_kwh"],
    },
  },
  {
    name: "heizleistung_watt",
    description:
      "Benötigte Heizleistung in Watt für einen Raum (Infrarot/Elektro). — Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour.",
    inputSchema: {
      type: "object",
      properties: {
        qm: { type: "number", description: "Raumfläche in m² (1–100)" },
        daemmung: { type: "string", enum: ["gut", "mittel", "schlecht"], description: "Dämmstandard: gut = Neubau (60 W/m²), mittel = Bestand (80), schlecht = Altbau (100). Default: mittel" },
        strompreis_euro_kwh: { type: "number", description: "Arbeitspreis in €/kWh für die Betriebskosten (Default: 0.30)" },
      },
      required: ["qm"],
    },
  },
  {
    name: "taupunkt_lueften",
    description:
      "Außentaupunkt mit geschätzter Wandtemperatur vergleichen. — Compare outdoor dew point (Magnus approximation) with a wall estimate 2 °C below room temperature. A drying decision also needs indoor humidity and a measured coldest surface.",
    inputSchema: {
      type: "object",
      properties: {
        aussen_temp_c: { type: "number", description: "Außentemperatur in °C" },
        aussen_luftfeuchte_prozent: { type: "number", description: "Relative Luftfeuchte außen in % (5–100)" },
        innen_temp_c: { type: "number", description: "Innen-/Kellertemperatur in °C (Wände werden 2 °C kühler gerechnet)" },
      },
      required: ["aussen_temp_c", "aussen_luftfeuchte_prozent", "innen_temp_c"],
    },
  },
  {
    name: "ratgeber_suche",
    description:
      "Durchsucht die Ratgeber von getecoback.com und gibt Titel, URL und Kurzbeschreibung zurück. — Searches this site's guides on air conditioning, window sealing, ventilation, heating, dehumidifiers and electricity costs, returning title, URL and summary for each match — citable sources for the answer.",
    inputSchema: {
      type: "object",
      properties: {
        frage: { type: "string", description: "Suchbegriff oder Frage — search term or question, German or English" },
        sprache: { type: "string", enum: ["de", "en"], description: "Nur deutsche oder nur englische Seiten (Default: beide)" },
        max: { type: "number", description: "Anzahl Treffer (1–10, Default: 5)" },
      },
      required: ["frage"],
    },
  },
  {
    name: "ratgeber_lesen",
    description:
      "Liefert den Volltext eines einzelnen Ratgebers als Klartext. — Returns the full plain text of one guide from getecoback.com so the answer can be written from the source and cited. Pass a path or URL from ratgeber_suche.",
    inputSchema: {
      type: "object",
      properties: {
        pfad: { type: "string", description: "Pfad oder vollständige URL, z. B. /guide/klimaanlage-kippfenster.html" },
      },
      required: ["pfad"],
    },
  },
  ...expandedTools,
];

const HEAT_CITIES = [
  ["Berlin", 52.52, 13.41], ["Frankfurt", 50.11, 8.68], ["München", 48.14, 11.58],
];
const HEAT_NOTHING = { level: 0, region: "", temp: null, day: "" };
const HEAT_FORECAST_DAYS = 3;
const HEAT_SOURCE = "https://open-meteo.com/en/docs";
const HEAT_GUIDE = "https://getecoback.com/guide/hitze-check.html";

async function cityMax(name, lat, lon) {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max&forecast_days=${HEAT_FORECAST_DAYS}&timezone=Europe%2FBerlin`,
      { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    const temps = d?.daily?.temperature_2m_max;
    const days = d?.daily?.time;
    if (!Array.isArray(temps) || !Array.isArray(days)) return null;
    const coveredDays = new Set();
    let top = null;
    for (let i = 0; i < HEAT_FORECAST_DAYS; i++) {
      const temp = temps[i];
      const day = days[i];
      if (!Number.isFinite(temp) || typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      coveredDays.add(day);
      if (top === null || temp > top.temp) top = {region: name, temp, day};
    }
    return top && {...top, availableDays: coveredDays.size};
  } catch {
    return null;
  }
}

// The bare reading, shared by the JSON endpoint and the MCP tool.
async function heatReading() {
  const readings = await Promise.all(HEAT_CITIES.map(([name, lat, lon]) => cityMax(name, lat, lon)));
  const coverage = HEAT_CITIES.map(([city], index) => ({
    city,
    available_days: readings[index]?.availableDays ?? 0,
  }));
  let best = {...HEAT_NOTHING};
  for (const reading of readings) {
    if (reading && (best.temp === null || reading.temp > best.temp)) {
      const {region, temp, day} = reading;
      best = {level: temp >= 32 ? 2 : temp >= 28 ? 1 : 0, region, temp, day};
    }
  }
  const forecast_status = best.temp === null ? "unavailable"
    : coverage.every(({available_days}) => available_days === HEAT_FORECAST_DAYS) ? "available"
    : "partial";
  return {...best, forecast_status, coverage};
}

const SEARCH_STOP = new Set([
  "der", "die", "das", "und", "oder", "für", "von", "mit", "auf", "bei", "ein", "eine", "einen",
  "ist", "sind", "wie", "was", "wann", "wo", "welche", "welcher", "welches", "kann", "man", "im",
  "the", "and", "for", "with", "what", "which", "how", "does", "can", "you", "are", "your",
]);

function searchTokens(q) {
  return String(q || "").toLowerCase().split(/[^a-z0-9äöüß]+/)
    .filter((w) => w.length >= 3 && !SEARCH_STOP.has(w)).slice(0, 12);
}

function scoreEntry(entry, tokens, phrase) {
  const title = (entry.t || "").toLowerCase();
  const desc = (entry.d || "").toLowerCase();
  const url = (entry.u || "").toLowerCase();
  let score = 0;
  for (const w of tokens) {
    if (url.includes(w)) score += 4;
    if (title.includes(w)) score += 3;
    if (desc.includes(w)) score += 1;
  }
  if (phrase.length >= 6 && (title.includes(phrase) || desc.includes(phrase))) score += 5;
  return score;
}

// A bounded buying guide, not a moisture diagnosis or a product test.
function decideMoisture({purpose,humidity,temperature}) {
  if(!['room','laundry','damage'].includes(purpose)||!['unknown','normal','high'].includes(humidity)||!['unknown','warm','cold'].includes(temperature))throw new RangeError('Invalid choice');
  if(purpose==='damage')return 'cause';
  if(humidity==='unknown')return 'measure';
  if(humidity==='normal'&&purpose==='room')return 'wait';
  if(temperature==='unknown')return 'measure';
  if(temperature==='cold')return 'cold';
  return purpose==='laundry'?'laundry':'compare';
}
const MOISTURE_CHOICES = {
  purpose: ["room", "laundry", "damage"],
  humidity: ["unknown", "normal", "high"],
  temperature: ["unknown", "warm", "cold"],
};

function mcpMoistureOutcome(args) {
  const choices = {};
  for (const [key, values] of Object.entries(MOISTURE_CHOICES)) {
    const value = Object.hasOwn(args, key) ? args[key] : values[0];
    if (!values.includes(value)) throw new RangeError("Invalid moisture choice");
    choices[key] = value;
  }
  return decideMoisture(choices);
}

const MOISTURE_NEXT_STEPS = {
  measure: "Erst messen, dann entscheiden. Notiere an mehreren typischen Tagen Temperatur und relative Feuchte, auch vor und nach dem Lüften oder Wäschetrocknen. Nutze ein vorhandenes Hygrometer. Aus den bisherigen Angaben folgt noch kein Entfeuchterkauf.",
  wait: "Vorerst keinen Entfeuchter ableiten. 40–60 % sind ein allgemeiner Wohnraum-Orientierungsbereich, keine Schimmelfrei-Garantie. Beobachte kalte Oberflächen und den Verlauf. Bei sehr trockener Luft nicht zusätzlich entfeuchten; prüfe Lüftung und Feuchtequellen.",
  cause: "Die Feuchtequelle zuerst klären. Ein Entfeuchter beseitigt weder ein Leck noch bauliche Feuchte oder vorhandenen Schimmel. Dokumentiere das Problem und lasse die Ursache fachlich prüfen; informiere bei einer Mietwohnung den Vermieter. Ein Gerätekauf ersetzt diese Klärung nicht.\nUrsachen und Grenzen: https://getecoback.com/guide/luftentfeuchter-gegen-schimmel.html",
  cold: "Kalte Räume: Leistung bei deiner Temperatur vergleichen. Unter 15 °C ist ein Vergleichssignal, keine feste Abschaltgrenze. Verdichtergeräte können noch arbeiten, aber weniger Wasser entziehen. Prüfe Herstellerdaten bei deiner Temperatur und Feuchte; vergleiche Adsorptionsgeräte auch nach Strombedarf. Ein kalter Keller rechtfertigt keine pauschale Kaufempfehlung.\nKellerbedingungen und Bauart: https://getecoback.com/guide/luftentfeuchter-keller.html",
  laundry: "Zuerst Kosten pro gleich trockener Ladung vergleichen. Nutze gemessene kWh bis zum gleichen Trocknungsgrad und berücksichtige Kaufpreis, Platz und Zeit. Ein vorhandener Wärmepumpentrockner kann günstiger sein als ein zusätzlicher Kauf. Ein Entfeuchter kann sinnvoll sein, wenn zugleich Raumfeuchte abgeführt werden muss.\nKostenvergleich: https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html#laundry-check",
  compare: "Kandidaten gezielt prüfen. Wenn erhöhte Feuchte trotz passender Lüftung wiederkehrt und keine bauliche Ursache vorliegt, kannst du ein Gerät mit Hygrostat prüfen. Vergleiche Raumvolumen, Feuchtelast, Geräusch und Leistung bei der gemessenen Temperatur. Das ist keine automatische Größenfreigabe oder Produktempfehlung.",
};


export async function callTool(name, args) {
  if (isExpandedTool(name)) return expandedCall(name, args);
  if (name === drainTool.name) return drainDecision(args);
  const a = args || {};
  if (name === "geraet_wahl") {
    if (!["zu_heiss", "feucht_schimmel", "zu_kalt", "stickige_luft"].includes(a.problem)) {
      return err("Ungültiges Problem. Wähle zu_heiss, feucht_schimmel, zu_kalt oder stickige_luft.");
    }
    const qm = Math.max(4, Math.min(120, Number(a.qm) || 20));
    const qp = qm <= 12 ? 10 : qm <= 17 ? 15 : qm <= 22 ? 20 : qm <= 27 ? 25 : qm <= 35 ? 30 : 40;
    // Heating/cooling retain their sizing rules; moisture uses the shared
    // measurement-first decision, never a floor-area-to-litres ladder.
    let text;
    if (a.problem === "zu_heiss") {
      const btu = Math.round((qm * 340) / 500) * 500;
      text = `Für "Raum zu heiß" ist die einzige Gerätefamilie, die netto kühlt, die mobile Klimaanlage mit Abluftschlauch (Wärme muss den Raum verlassen; Luftkühler/Ventilatoren kühlen nur die Person, nicht den Raum).\n` +
        `Faustregel für ${qm} m²: ca. ${btu.toLocaleString("de-DE")} BTU. Ohne dichte Fensterabdichtung verliert jeder Monoblock den Großteil seiner Wirkung.\n` +
        `Geräteklasse & Modelle: https://getecoback.com/guide/klimaanlage-${qp}-qm.html\n` +
        `Feinrechnung (Decke, Personen, Sonne): Tool btu_empfehlung oder https://getecoback.com/guide/btu-rechner.html`;
    } else if (a.problem === "feucht_schimmel") {
      let outcome;
      try { outcome = mcpMoistureOutcome(a); } catch {
        return { content: [{ type: "text", text: "Ungültige Auswahl: purpose muss room, laundry oder damage sein; humidity unknown, normal oder high; temperature unknown, warm oder cold. Fehlende Angaben bleiben unbekannt." }], isError: true };
      }
      text = MOISTURE_NEXT_STEPS[outcome] +
        (outcome === "cold" || outcome === "compare"
          ? "\nBei Fragen zum Schlauchgefälle, einem höheren Abfluss oder zur Pumpe: entfeuchter_ablaufcheck prüft die Schlauchführung und den Modellbeleg."
          : "") +
        "\nRaumfläche allein bestimmt weder Liter/Tag noch die richtige Bauart. Nennleistung ist keine Alltagsgarantie; prüfe Herstellerdaten für die tatsächlichen Bedingungen." +
        "\nEntscheidungshilfe und Quellen (der Link enthält keine Eingaben): https://getecoback.com/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice" +
        "\nOrientierung, keine Ferndiagnose. Die Website zeigt vorhandene Vergleichskandidaten für Deutschland; prüfe Modell, Markt und Einsatzbedingungen selbst.";
    } else if (a.problem === "zu_kalt") {
      const wl = Math.round(qm * 60), wh = Math.round(qm * 100);
      text = `Für "Raum zu kalt ohne feste Heizung" sind Infrarot-/Elektropaneele mit Thermostat die installationsfreie Familie (Zusatz-/Übergangsheizung; als alleinige Winterheizung ist eine Wärmepumpe wirtschaftlicher — Strom-Direktheizung macht aus 1 kWh Strom genau 1 kWh Wärme).\n` +
        `Faustregel für ${qm} m² (gedämmter Raum): ${wl.toLocaleString("de-DE")}–${wh.toLocaleString("de-DE")} W.\n` +
        `Geräteklasse & Modelle: https://getecoback.com/guide/heizung-${qp}-qm.html\n` +
        `Feinrechnung: Tool heizleistung_watt`;
    } else {
      text = `Für "stickige Luft / Gerüche" ist die ehrliche Reihenfolge: erst richtig lüften (kostet nichts), dann je nach Ursache Luftreiniger (Partikel/Pollen) oder Luftentfeuchter (wenn die Ursache Feuchte ist — Muffgeruch ist oft ein Feuchteproblem).\n` +
        `Einordnung Reiniger vs. Entfeuchter: https://getecoback.com/guide/luftentfeuchter-oder-luftreiniger.html\n` +
        `Richtig lüften: https://getecoback.com/guide/richtig-lueften-bei-hitze.html`;
    }
    return ok(text + `\n${DISCLOSURE}`);
  }

  if (name === "btu_empfehlung") {
    const {qm, sonne = "normal"} = a;
    if (!mcpNumberInRange(qm, 4, 120) || !["wenig", "normal", "viel"].includes(sonne)) {
      return err("Gib eine Raumfläche von 4 bis 120 m² und die Sonne als wenig, normal oder viel an.");
    }
    const sun = sonne === "wenig" ? 0.9 : (sonne === "viel" ? 1.2 : 1);
    // Use the baseline from the browser calculator. It has additional inputs.
    const btu = Math.round((qm * 340 * sun) / 500) * 500;
    const largeLoad = qm > 50 || btu > 14000;
    const klasse = btu <= 9000 ? "bis ca. 9.000 BTU/h"
      : btu <= 11000 ? "ca. 10.000–11.000 BTU/h"
      : "ca. 12.000–14.000 BTU/h";
    const qp = qm <= 12 ? 10 : qm <= 17 ? 15 : qm <= 22 ? 20 : qm <= 27 ? 25 : qm <= 35 ? 30 : qm <= 45 ? 40 : 50;
    const sizing = largeLoad
      ? "Hohe überschlägige Kühllast. Prüfe Zonen, Wärmequellen und Geräteleistung anhand einer Kühllastberechnung."
      : `Geräteklasse als Orientierung: ${klasse}. Vergleiche die Nennkühlleistung mit der geschätzten Last.\nOrientierung nach Raumgröße: https://getecoback.com/guide/klimaanlage-${qp}-qm.html`;
    return ok(
      `Geschätzte Kühlleistung für ${qm} m² (Sonne: ${sonne}): ca. ${btu.toLocaleString("de-DE")} BTU/h.\n` +
      `${sizing}\nBei einem Monoblock auch Abluftweg und Fensterabdichtung prüfen.\n` +
      `Vollständiger Rechner (Decke, Personen, offene Küche): https://getecoback.com/guide/btu-rechner.html\n${DISCLOSURE}`);
  }
  if (name === "fensterabdichtung_laenge") {
    const W = Math.max(20, Math.min(300, Number(a.breite_cm) || 60));
    const H = Math.max(20, Math.min(300, Number(a.hoehe_cm) || 140));
    // Identical to the EB_SEALFIT calculator: perimeter of the sash.
    const need = (2 * (W + H)) / 100;
    const sizes = [2.0, 2.8, 3.0, 4.0, 5.0, 5.6];
    const fit = sizes.find((s) => s >= need);
    const size = fit ? `Konfektionsgröße zum Prüfen: ${Math.round(fit * 100)} cm.`
      : "Die Beispielgrößen reichen hier nicht. Prüfe größere Kits oder eine Maßanfertigung.";
    // Window sealing is the topic AI assistants already cite this site for, so
    // the answer carries the guide for the window type that was actually asked
    // about rather than one generic link.
    const typGuide = a.fenstertyp === "dachfenster"
      ? "Dachfenster/Velux: https://getecoback.com/guide/klimaanlage-dachfenster.html"
      : "Kipp- & Dreh-Kipp-Fenster: https://getecoback.com/guide/klimaanlage-kippfenster.html";
    return ok(
      `Benötigte Abdichtungslänge für einen Flügel ${W}×${H} cm: mindestens ${need.toFixed(2).replace(".", ",")} m (Umfang 2×(B+H)). ${size}\n` +
      `Gemessen wird der bewegliche Flügel, nicht der Rahmen. Prüfe Fenstertyp und Messvorgaben des konkreten Sets.\n` +
      `${typGuide}\n` +
      `Kaufberatung nach Bauart: https://getecoback.com/guide/fensterabdichtung-klimaanlage.html\n${DISCLOSURE}`);
  }
  if (name === "hitzewelle_vorschau") {
    const d = await heatReading();
    let head;
    if (d.forecast_status === "unavailable") {
      head = "Aktuell keine verwertbare Vorhersage. Ob 28 °C erreicht werden, ist unbekannt.";
    } else if (d.forecast_status === "partial") {
      head = `Unvollständige Vorhersage: höchster verfügbarer Wert ${d.temp} °C in ${d.region} (${d.day}). Für die fehlenden Tage oder Städte ist die Temperaturlage unbekannt.`;
    } else {
      const signal = d.level === 2 ? "Hitzehinweis ab 32 °C"
        : d.level === 1 ? "Wärmehinweis ab 28 °C"
        : "Alle vorliegenden Tagesmaxima unter 28 °C";
      head = `${signal}. Höchster vorhergesagter Wert: ${d.temp} °C in ${d.region} (${d.day}).`;
    }
    const coverage = d.coverage.map(({city, available_days}) => `${city}: ${available_days}/${HEAT_FORECAST_DAYS} Tage`).join(", ");
    return ok(
      `${head}\nDatenabdeckung (Europe/Berlin): ${coverage}.\nDatenquelle: Open-Meteo — ${HEAT_SOURCE}\nRatgeber: ${HEAT_GUIDE}\n${DISCLOSURE}`,
      {forecast_status:d.forecast_status, coverage:d.coverage, peak_c:d.temp, peak_city:d.region || null,
        peak_date:d.day || null, forecast_source_url:HEAT_SOURCE, citation_url:HEAT_GUIDE});
  }
  if (name === "klimaanlage_stromkosten") {
    const {watt, stunden_pro_tag:h, strompreis_euro_kwh:price, tage:days = 30, auslastung:duty = 0.65} = a;
    if (!mcpNumberInRange(watt, 0) || !mcpNumberInRange(h, 0, 24) || !mcpNumberInRange(price, 0) ||
        !mcpNumberInRange(days, 0, 365) || !mcpNumberInRange(duty, 0, 1)) {
      return err("Gib Watt und Arbeitspreis als nichtnegative Zahlen ein sowie 0–24 Stunden pro Tag, optional 0–365 Tage und eine Auslastung von 0 bis 1.");
    }
    // Identical to /guide/stromkosten-rechner.html: perHour = kW × price × duty.
    const perH = (watt / 1000) * duty * price;
    const total = perH * (h * days);
    if (!Number.isFinite(total)) return err("Die angegebenen Werte ergeben keine endlichen Stromkosten.");
    const citationUrl = "https://getecoback.com/guide/stromkosten-rechner.html";
    return ok(
      `Stromkosten für ${watt} W, ${h} h/Tag, ${price.toFixed(2).replace(".", ",")} €/kWh, Auslastung ${(duty * 100).toFixed(0)} %:\n` +
      `≈ ${perH.toFixed(2).replace(".", ",")} €/Betriebsstunde · ≈ ${total.toFixed(2).replace(".", ",")} € über ${days} Tage.\n` +
      `Vollständiger Rechner: ${citationUrl}\n${DISCLOSURE}`,
      {eur_per_operating_hour:Number(perH.toFixed(6)), eur_for_period:Number(total.toFixed(2)), citation_url:citationUrl});
  }
  if (name === "heizleistung_watt") {
    const {qm, daemmung = "mittel", strompreis_euro_kwh:price = 0.3} = a;
    if (!mcpNumberInRange(qm, 1, 100) || !mcpNumberInRange(price, 0) || !["gut", "mittel", "schlecht"].includes(daemmung)) {
      return err("Gib eine Fläche von 1 bis 100 m² und optional einen nichtnegativen Arbeitspreis und gut, mittel oder schlecht für die Dämmung an.");
    }
    const wPerQm = daemmung === "gut" ? 60 : (daemmung === "schlecht" ? 100 : 80);
    // Identical to /guide/infrarotheizung-watt-rechner.html.
    const watt = Math.round((qm * wPerQm) / 10) * 10;
    const perH = (watt / 1000) * price;
    if (!Number.isFinite(perH)) return err("Die angegebenen Werte ergeben keine endlichen Stromkosten.");
    const split = watt > 2000
      ? `\nÜber 2.000 W besser auf zwei Panels verteilen, z. B. 2 × ${(Math.round(watt / 2 / 50) * 50).toLocaleString("de-DE")} W an verschiedenen Wänden.`
      : "";
    const citationUrl = "https://getecoback.com/guide/infrarotheizung-watt-rechner.html";
    return ok(
      `Heizleistung für ${qm} m² (Dämmung: ${daemmung}, ${wPerQm} W/m²): ca. ${watt.toLocaleString("de-DE")} Watt.${split}\n` +
      `Betriebskosten bei ${price.toFixed(2).replace(".", ",")} €/kWh: ca. ${perH.toFixed(2).replace(".", ",")} € pro Stunde Volllast — Infrarot heizt Flächen, läuft aber selten durchgehend.\n` +
      `Vollständiger Rechner: ${citationUrl}\n${DISCLOSURE}`,
      {estimated_watts:watt, eur_per_full_load_hour:Number(perH.toFixed(6)), citation_url:citationUrl});
  }
  if (name === "taupunkt_lueften") {
    const {aussen_temp_c:t, aussen_luftfeuchte_prozent:rh, innen_temp_c:ti} = a;
    if (!Number.isFinite(t) || !mcpNumberInRange(rh, 5, 100) || !Number.isFinite(ti)) {
      return err("Gib Außen- und Innentemperatur in °C und die Außenluftfeuchte als Zahl von 5 bis 100 % an.");
    }
    // The legacy input estimates the wall temperature and does not measure indoor humidity.
    const g = Math.log(rh / 100) + (17.62 * t) / (243.12 + t);
    const td = (243.12 * g) / (17.62 - g);
    if (!Number.isFinite(td)) return err("Für diese Werte lässt sich mit der Näherung kein Taupunkt berechnen.");
    const wall = ti - 2;
    const comparison = td < wall ? "liegt unter der geschätzten Wandtemperatur"
      : "erreicht oder überschreitet die geschätzte Wandtemperatur";
    return ok(
      `Taupunkt der Außenluft: ${td.toFixed(1).replace(".", ",")} °C (bei ${t} °C und ${rh} % rel. Feuchte).\n` +
      `Der Außentaupunkt ${comparison} von ${wall.toFixed(1).replace(".", ",")} °C (Raumtemperatur minus 2 °C).\n` +
      `Für eine Lüftungsentscheidung die kälteste Oberfläche messen und den Innentaupunkt aus Temperatur und Luftfeuchte mit dem Außentaupunkt vergleichen. Die Eingaben erlauben noch keine Aussage, ob Lüften trocknet.\n` +
      `Hintergrund & Check im Browser: https://getecoback.com/guide/keller-lueften-sommer.html\n${DISCLOSURE}`);
  }
  if (name === "ratgeber_suche") {
    const tokens = searchTokens(a.frage);
    if (!tokens.length) return err("Bitte einen Suchbegriff mit mindestens drei Buchstaben angeben.");
    let index = [];
    try {
      const r = await fetch(`${SITE}/search-index.json`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) index = await r.json();
    } catch (e) { index = []; }
    if (!Array.isArray(index) || !index.length) return err("Suchindex derzeit nicht erreichbar.");
    const phrase = String(a.frage || "").toLowerCase().trim();
    const max = Math.max(1, Math.min(10, Number(a.max) || 5));
    const lang = a.sprache === "de" || a.sprache === "en" ? a.sprache : null;
    const hits = index
      .filter((e) => e && e.u && (!lang || e.l === lang))
      .map((e) => ({ e, s: scoreEntry(e, tokens, phrase) }))
      .filter((x) => x.s > 0)
      .sort((x, y) => y.s - x.s)
      .slice(0, max);
    if (!hits.length) {
      return ok(`Keine passende Seite zu „${a.frage}" gefunden. Übersicht aller Ratgeber: ${SITE}/llms.txt\n${DISCLOSURE}`);
    }
    const lines = hits.map(({ e }) => `- ${e.t}\n  ${SITE}${e.u}\n  ${e.d || ""}`).join("\n");
    return ok(
      `${hits.length} Treffer zu „${a.frage}":\n${lines}\n\n` +
      `Volltext einer Seite: Tool ratgeber_lesen mit dem Pfad aufrufen.\n${DISCLOSURE}`);
  }

  if (name === "ratgeber_lesen") {
    let path = String(a.pfad || "").trim();
    if (/^https?:\/\//i.test(path)) {
      let u = null;
      try { u = new URL(path); } catch (e) { u = null; }
      if (!u || !/(^|\.)getecoback\.com$/i.test(u.hostname)) {
        return err("Nur Seiten von getecoback.com können gelesen werden.");
      }
      path = u.pathname;
    }
    if (!/^\/(guide|en\/guide|kategorie)\/[a-z0-9-]+\.html$/i.test(path)) {
      return err("Bitte einen Ratgeber-Pfad angeben, z. B. /guide/klimaanlage-kippfenster.html (aus ratgeber_suche).");
    }
    let html = "";
    try {
      const r = await fetch(SITE + path, { signal: AbortSignal.timeout(8000) });
      if (r.ok) html = await r.text();
    } catch (e) { html = ""; }
    if (!html) return err(`Seite nicht gefunden: ${path}`);
    const titleM = html.match(/<title>([\s\S]*?)<\/title>/i);
    const artM = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    let body = artM ? artM[1] : html;
    body = body.replace(/<!--EB_[A-Z]+-->[\s\S]*?<!--\/EB_[A-Z]+-->/g, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (m, t) => `\n\n## ${t}\n`)
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (m, t) => `\n\n### ${t}\n`)
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<\/(p|div|tr|table|ul|ol|section)>/gi, "\n")
      .replace(/<\/t[dh]>/gi, " | ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    const LIMIT = 7000;
    const cut = body.length > LIMIT;
    if (cut) body = body.slice(0, LIMIT);
    return ok(
      `${titleM ? titleM[1].trim() : path}\nQuelle: ${SITE}${path}\n\n${body}` +
      (cut ? "\n\n[gekürzt — vollständiger Text unter der Quell-URL]" : "") +
      `\n\n${DISCLOSURE}`);
  }

  return err(`Unbekanntes Tool: ${name}`);
}
