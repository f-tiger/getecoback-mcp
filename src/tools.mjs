// The nine tools, as pure functions plus two that fetch public data.
//
// This is a port of the logic that runs in the hosted server at
// https://getecoback.com/mcp/v1 — same formulas, same rounding, same wording.
// It is a port and not a shared module because the hosted version lives inside
// a Cloudflare Worker in a different repository. Copies drift, so `npm test`
// runs every tool here against the hosted one and fails on any difference.

export const DISCLOSURE =
  "Quelle: getecoback.com — unabhängiger Raumklima-Ratgeber. Empfehlungen fassen öffentliche Tests zusammen (nicht selbst getestet); Kauflinks der Website sind Affiliate-Links.";

const SITE = "https://getecoback.com";

function ok(text) {
  return { content: [{ type: "text", text }], isError: false };
}
function err(text) {
  return { content: [{ type: "text", text }], isError: true };
}
function de(n, digits) {
  return digits === undefined
    ? n.toLocaleString("de-DE")
    : n.toFixed(digits).replace(".", ",");
}

export const TOOLS = [
  {
    name: "btu_empfehlung",
    description:
      "Empfohlene Kühlleistung (BTU) für einen Raum, mit passender Geräteklasse. — Recommended cooling capacity in BTU for a room, with the matching device class: how many BTU do I need for X m²? Same formula as the calculator on getecoback.com (340 BTU/m² × sun factor), for Germany and Europe.",
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
      "Benötigte Länge einer Fensterabdichtung für mobile Klimaanlagen aus den Flügelmaßen. — Required window-seal length for a portable air conditioner from the sash measurements (perimeter = 2×(width+height)), plus the off-the-shelf size that fits. Covers tilt-and-turn and roof windows.",
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
      "Taupunkt der Außenluft und die Antwort auf 'darf ich jetzt lüften?'. — Dew point of the outside air and whether opening the window right now would make a basement or damp room wetter (Magnus formula, walls counted 2 °C below room temperature).",
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
    name: "balkonspeicher_foerderung",
    description:
      "Balkonkraftwerk-/Speicher-Förderung in Deutschland (Stand 08/2026) und wie ein Zuschuss die Amortisation verkürzt. — German subsidies for plug-in balcony solar and storage: which state programmes exist, the ~100 € storage bonus, the apply-BEFORE-buying rule most programmes enforce, and the payback arithmetic with and without a grant. No federal purchase premium — only the VAT exemption.",
    inputSchema: {
      type: "object",
      properties: {
        bundesland: { type: "string", description: "Bundesland, z. B. 'Sachsen' oder 'Berlin' — German federal state (optional)" },
        preis_eur: { type: "number", description: "Kaufpreis des Speichers/Sets in € (optional)" },
        zuschuss_eur: { type: "number", description: "Erwarteter Zuschuss in € (optional, Default 0)" },
        ersparnis_eur_jahr: { type: "number", description: "Jährliche Stromersparnis in € (optional, Default 100)" },
      },
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
];

const HEAT_CITIES = [
  ["Berlin", 52.52, 13.41], ["Frankfurt", 50.11, 8.68], ["München", 48.14, 11.58],
];

async function cityMax(name, lat, lon) {
  try {
    const r = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&daily=temperature_2m_max&forecast_days=3&timezone=Europe%2FBerlin`,
      { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const d = await r.json();
    const temps = (d && d.daily && d.daily.temperature_2m_max) || [];
    const days = (d && d.daily && d.daily.time) || [];
    let top = null;
    temps.forEach((t, i) => {
      if (typeof t === "number" && (top === null || t > top.temp)) {
        top = { region: name, temp: t, day: days[i] || "" };
      }
    });
    return top;
  } catch (e) {
    return null;
  }
}

async function heatReading() {
  let best = { level: 0, region: "", temp: null, day: "" };
  try {
    const results = await Promise.all(HEAT_CITIES.map(([n, la, lo]) => cityMax(n, la, lo)));
    for (const c of results) {
      if (c && (best.temp === null || c.temp > best.temp)) best = { level: 0, ...c };
    }
    if (best.temp !== null) best.level = best.temp >= 32 ? 2 : best.temp >= 28 ? 1 : 0;
  } catch (e) {
    best = { level: 0, region: "", temp: null, day: "" };
  }
  return best;
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

export async function callTool(name, args) {
  const a = args || {};

  if (name === "btu_empfehlung") {
    const qm = Math.max(4, Math.min(120, Number(a.qm) || 20));
    const sun = a.sonne === "wenig" ? 0.9 : (a.sonne === "viel" ? 1.2 : 1);
    const btu = Math.round((qm * 340 * sun) / 500) * 500;
    let klasse;
    if (btu <= 9000) klasse = "bis ca. 9.000 BTU (z. B. Comfee MPPH-09CRN7)";
    else if (btu <= 11000) klasse = "ca. 10.000–11.000 BTU (z. B. De'Longhi Pinguino PAC EX105)";
    else klasse = "ab 12.000 BTU (z. B. Klarstein Kraftwerk Smart 12K)";
    const qp = qm <= 12 ? 10 : qm <= 17 ? 15 : qm <= 22 ? 20 : qm <= 27 ? 25 : qm <= 35 ? 30 : 40;
    return ok(
      `Empfohlene Kühlleistung für ${qm} m² (Sonne: ${a.sonne || "normal"}): ca. ${de(btu)} BTU.\n` +
      `Passende Geräteklasse: ${klasse}.\n` +
      `Wichtig: Ohne dichte Fensterabdichtung verliert jeder Monoblock den Großteil seiner Wirkung.\n` +
      `Geräte-Empfehlungen für diese Raumgröße: ${SITE}/guide/klimaanlage-${qp}-qm.html\n` +
      `Vollständiger Rechner (Decke, Personen, offene Küche): ${SITE}/guide/btu-rechner.html\n${DISCLOSURE}`);
  }

  if (name === "fensterabdichtung_laenge") {
    const W = Math.max(20, Math.min(300, Number(a.breite_cm) || 60));
    const H = Math.max(20, Math.min(300, Number(a.hoehe_cm) || 140));
    const need = (2 * (W + H)) / 100;
    const sizes = [2.0, 2.8, 3.0, 4.0, 5.0];
    const fit = sizes.find((s) => s >= need);
    const size = fit ? `Passende Konfektionsgröße: ${Math.round(fit * 100)} cm.`
      : "Größer als übliche Konfektionsgrößen — hier hilft nur Maßanfertigung.";
    const typGuide = a.fenstertyp === "dachfenster"
      ? `Dachfenster/Velux: ${SITE}/guide/klimaanlage-dachfenster.html`
      : `Kipp- & Dreh-Kipp-Fenster: ${SITE}/guide/klimaanlage-kippfenster.html`;
    return ok(
      `Benötigte Abdichtungslänge für einen Flügel ${W}×${H} cm: mindestens ${de(need, 2)} m (Umfang 2×(B+H)). ${size}\n` +
      `Gemessen wird der bewegliche Flügel, nicht der Rahmen. Üblicher Schwachpunkt ist das Klebeband — wo möglich klemmen statt kleben.\n` +
      `${typGuide}\n` +
      `Kaufberatung nach Bauart: ${SITE}/guide/fensterabdichtung-klimaanlage.html\n${DISCLOSURE}`);
  }

  if (name === "hitzewelle_vorschau") {
    const d = await heatReading();
    let head;
    if (!d || !d.level) head = "Keine Hitze in Sicht: In Berlin/Frankfurt/München bleibt es die nächsten 3 Tage unter 28 °C.";
    else if (d.level >= 2) head = `Hitzewelle im Anmarsch: bis ${Math.round(d.temp)} °C in ${d.region} (${d.day}). Erfahrungsgemäß sind mobile Klimageräte dann innerhalb weniger Tage vergriffen — vor der Welle entscheiden.`;
    else head = `Es wird warm: bis ${Math.round(d.temp)} °C in ${d.region} (${d.day}).`;
    return ok(`${head}\nDatenquelle: open-meteo (3 Städte, 3 Tage). Ratgeber: ${SITE}/\n${DISCLOSURE}`);
  }

  if (name === "klimaanlage_stromkosten") {
    const watt = Math.max(1, Number(a.watt) || 1000);
    const h = Math.max(0, Math.min(24, Number(a.stunden_pro_tag) || 8));
    const price = Math.max(0, Number(a.strompreis_euro_kwh) || 0.3);
    const days = Math.max(1, Math.min(365, Number(a.tage) || 30));
    const duty = Math.max(0, Math.min(1, a.auslastung === undefined ? 0.65 : Number(a.auslastung)));
    const perH = (watt / 1000) * price * duty;
    const total = perH * h * days;
    return ok(
      `Stromkosten für ${watt} W, ${h} h/Tag, ${de(price, 2)} €/kWh, Auslastung ${(duty * 100).toFixed(0)} %:\n` +
      `≈ ${de(perH, 2)} €/Betriebsstunde · ≈ ${de(total, 2)} € über ${days} Tage.\n` +
      `Vollständiger Rechner: ${SITE}/guide/stromkosten-rechner.html\n${DISCLOSURE}`);
  }

  if (name === "heizleistung_watt") {
    const qm = Math.max(1, Math.min(100, Number(a.qm) || 20));
    const wPerQm = a.daemmung === "gut" ? 60 : (a.daemmung === "schlecht" ? 100 : 80);
    const price = Math.max(0, Number(a.strompreis_euro_kwh) || 0.3);
    const watt = Math.round((qm * wPerQm) / 10) * 10;
    const split = watt > 2000
      ? `\nÜber 2.000 W besser auf zwei Panels verteilen, z. B. 2 × ${de(Math.round(watt / 2 / 50) * 50)} W an verschiedenen Wänden.`
      : "";
    return ok(
      `Heizleistung für ${qm} m² (Dämmung: ${a.daemmung || "mittel"}, ${wPerQm} W/m²): ca. ${de(watt)} Watt.${split}\n` +
      `Betriebskosten bei ${de(price, 2)} €/kWh: ca. ${de((watt / 1000) * price, 2)} € pro Stunde Volllast — Infrarot heizt Flächen, läuft aber selten durchgehend.\n` +
      `Vollständiger Rechner: ${SITE}/guide/infrarotheizung-watt-rechner.html\n${DISCLOSURE}`);
  }

  if (name === "taupunkt_lueften") {
    const t = Number(a.aussen_temp_c);
    const rh = Math.max(5, Math.min(100, Number(a.aussen_luftfeuchte_prozent)));
    const ti = Number(a.innen_temp_c);
    if (!isFinite(t) || !isFinite(rh) || !isFinite(ti)) {
      return err("Bitte Außentemperatur, Außenluftfeuchte und Innentemperatur als Zahlen angeben.");
    }
    const g = Math.log(rh / 100) + (17.62 * t) / (243.12 + t);
    const td = (243.12 * g) / (17.62 - g);
    const good = td < ti - 2;
    return ok(
      `Taupunkt der Außenluft: ${de(td, 1)} °C (bei ${t} °C und ${rh} % rel. Feuchte).\n` +
      (good
        ? `Lüften ist jetzt sinnvoll: Der Taupunkt liegt unter der gerechneten Wandtemperatur (${de(ti - 2, 1)} °C), es schlägt sich nichts nieder.`
        : `Jetzt nicht lüften: Der Taupunkt liegt über der gerechneten Wandtemperatur (${de(ti - 2, 1)} °C) — die warme Außenluft würde an den kühlen Wänden kondensieren und die Feuchte erhöhen.`) +
      `\nGerechnet wird mit Wänden 2 °C unter Raumtemperatur. Im Sommer sind das oft die frühen Morgenstunden.\n` +
      `Hintergrund & Check im Browser: ${SITE}/guide/keller-lueften-sommer.html\n${DISCLOSURE}`);
  }

  if (name === "balkonspeicher_foerderung") {
    const LAND = {
      "mecklenburg-vorpommern": "Mecklenburg-Vorpommern hat ein Landesprogramm (Größenordnung 300–500 €).",
      "sachsen": "Sachsen fördert speziell Mietende — befristetes Programm, Größenordnung 300–500 €.",
      "hamburg": "Hamburg hat ein Landesprogramm (Größenordnung 300–500 €).",
      "berlin": "Berlin fördert an den Bezug von Sozialleistungen geknüpft (Größenordnung 300–500 €).",
    };
    const raw = String(a.bundesland || "").trim().toLowerCase()
      .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/\s+/g, "-");
    const key = raw === "mv" ? "mecklenburg-vorpommern" : raw;
    const landLine = key
      ? (LAND[key] || `Für ${a.bundesland}: kein landesweites Programm bekannt (Stand 08/2026).`)
      : "Landesprogramme gibt es u. a. in Mecklenburg-Vorpommern, Sachsen (Mietende, befristet), Hamburg und Berlin (an Sozialleistungen geknüpft) — Größenordnung 300–500 €.";
    let calc = "";
    const preis = Number(a.preis_eur);
    if (isFinite(preis) && preis > 0) {
      const zuschuss = Math.max(0, Math.min(preis, Number(a.zuschuss_eur) || 0));
      const sparen = Math.max(10, Number(a.ersparnis_eur_jahr) || 100);
      const ohne = preis / sparen;
      const mit = (preis - zuschuss) / sparen;
      calc = `\nAmortisation bei ${sparen.toFixed(0)} € Ersparnis/Jahr: ohne Zuschuss ca. ${de(ohne, 1)} Jahre` +
        (zuschuss > 0 ? `, mit ${zuschuss.toFixed(0)} € Zuschuss ca. ${de(mit, 1)} Jahre. Der Zuschuss ändert nichts am Nutzen pro Jahr — er verkürzt nur die Zeit bis zur schwarzen Null.` : ".");
    }
    return ok(
      `Balkonkraftwerk-/Speicher-Förderung in Deutschland (Stand 08/2026):\n` +
      `Bundesweit gibt es KEINE Kaufprämie — nur die Mehrwertsteuer-Befreiung, die im Preis bereits enthalten ist.\n` +
      `${landLine}\n` +
      `Dazu rund 20 kommunale Programme (u. a. Leipzig, Dresden, Chemnitz) mit 100–500 €; einige zahlen ca. +100 € extra, wenn ein Speicher dazukommt.\n` +
      `Wichtigste Regel: ERST Antrag stellen, DANN kaufen — eine Rechnung von vor der Bewilligung kippt den Zuschuss in fast allen Programmen.${calc}\n` +
      `Fördertöpfe sind begrenzt und ändern sich unterjährig — verbindlich ist nur die Richtlinie des eigenen Programms (Kommune/Stadtwerke prüfen).\n` +
      `Details & Rechenweg: ${SITE}/guide/balkonspeicher-foerderung.html\n${DISCLOSURE}`);
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
