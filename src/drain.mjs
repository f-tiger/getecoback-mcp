// Port of sites/getecoback/src/mcp-drain.mjs in f-tiger/agi-site.
import { createRequire } from 'node:module';
const catalog = createRequire(import.meta.url)('./drain-sources.json');

const citationUrl = 'https://getecoback.com/guide/luftentfeuchter-keller.html';
const guideUrl = citationUrl + '?utm_source=eco-mcp&utm_medium=referral&utm_campaign=keller-ablauf#ablauf-vor-kauf';
const disclosure = 'EcoBack-Ratgeber mit gekennzeichneten Affiliate-Links auf der Website.';

const routes = {
  downhill: {
    outcome: 'gravity_check',
    answer: 'Ein Schwerkraftablauf kommt infrage, wenn der Schlauch vom Geräteauslass bis zum Abfluss durchgehend mit Gefälle und ohne Knick verläuft. Prüfe Anschluss, Schlauchmaß und Verlegung in der Anleitung deines Modells.',
  },
  level_or_uphill: {
    outcome: 'pump_check',
    answer: 'Auch eine kurze Schwelle unterbricht das durchgehende Gefälle, selbst wenn der Zielablauf tiefer liegt. Prüfe eine für das genaue Modell freigegebene Pumpe, ihre zulässige Förderhöhe und die bestätigte Schlauchstrecke. Ein Schlauchanschluss allein belegt keine Pumpe. Bis zur Klärung kommen Tankbetrieb oder ein anderer Standort infrage.',
  },
  no_drain: {
    outcome: 'tank',
    answer: 'Prüfe, ob der vorgesehene Tank zum Entnehmen und Leeren erreichbar ist. Lass den Tankalarm aktiv. Falls das regelmäßige Leeren nicht möglich ist, prüfe einen anderen geeigneten Standort, bevor du ein Gerät kaufst.',
  },
  unknown: {
    outcome: 'inspect_route',
    answer: 'Vergleiche die Höhe des Geräteauslasses mit dem Zielablauf und prüfe die ganze Schlauchstrecke auf Anstiege und Knicke. Erst dann lässt sich ein Schwerkraftablauf beurteilen.',
  },
};
const moistureAdvice = {
  unknown: 'Miss zuerst Luftfeuchte und Temperatur über mehrere Tage. Der Wasserweg allein begründet keinen Gerätekauf.',
  normal: 'Bei unauffälligen Messwerten lässt sich aus dem Ablauf kein Bedarf für einen Entfeuchter ableiten.',
  persistently_high: 'Kläre die Feuchtequelle. In einem kalten Keller zählen Entzugsleistung und Stromaufnahme bei vergleichbarer Temperatur und Luftfeuchte.',
  damage: 'Bei Wassereintritt, nassen Wänden oder Schimmel zuerst die Ursache fachlich klären. Der Ablaufcheck kann den Schaden nicht beurteilen.',
};

// The model IDs match the reviewed German cellar catalog. A pump accessory
// documented for one variant is never inherited by another.
const verifiedProducts = new Map(catalog.products.filter(p => p.status === 'verified').map(p => [p.id, p]));
const sourceMarkets = [
  ['https://www.bosch-homecomfort.com/de/de/', 'DE'],
  ['https://www.meaco.de/produkt/', 'DE'],
  ['https://www.stadlerform.com/de-de/', 'DE'],
  ['https://www.feelcomfee.com/de/', 'DE'],
  ['https://www.meaco.com/products/', 'UK'],
];
const areteOneAccessory = {
  note: 'Der deutsche Meaco-Vertrieb führt die separat erhältliche Pumpe für den Arete One 20L. Er nennt bis zu 2,5 m Förderhöhe und einen mitgelieferten 3-m-Schlauch für die Pumpe. Ein Wasserweg mit 6 m am Boden und weiteren 1,5 m Anstieg ist damit nicht bestätigt. Eine längere Schlauchstrecke und den Lieferumfang des Grundgeräts separat klären.',
  source_url: 'https://www.meaco.de/produkt/meaco-dry-arete-one-pumpe/',
  source_label: 'Deutscher Meaco-Vertrieb (AirSain): Arete One Pumpenzubehör',
  source_market: 'DE',
  checked: '2026-11-22',
};
const notes = {
  'stadler-lukas': 'Beim Lukas weiss L-031E gehört ein 100-cm-Schlauch zum Lieferumfang. Sein Ende muss tiefer liegen als der Anfang. Daraus folgt keine Freigabe für eine Förderung nach oben.',
  'meaco-two-12': 'Der deutsche Anbieter nennt für den Arete Two 12L einen kontinuierlichen Kondensatablauf. Die Pumpenangabe zur Arete One 20L belegt keine Eignung für diese 12-Liter-Variante.',
};
const input = {
  drain: {type: 'string', enum: Object.keys(routes), description: 'Gesamter Schlauchweg: downhill = durchgehend abwärts, level_or_uphill = waagerechtes oder ansteigendes Teilstück, no_drain = kein Zielablauf, unknown = ungeklärt.'},
  model: {type: 'string', enum: ['unknown', ...verifiedProducts.keys()], description: 'Optionaler exakter Katalogschlüssel. Bei abweichender oder unbekannter Modellvariante unknown verwenden.'},
  moisture: {type: 'string', enum: Object.keys(moistureAdvice), description: 'Bisheriger Befund: unbekannt, unauffällig, anhaltend hoch oder sichtbarer Schaden. Optional.'},
};

export const drainTool = {
  name: 'entfeuchter_ablaufcheck',
  title: 'Kellerentfeuchter: Gefälle, Pumpe oder Tank?',
  description: 'Prüft für Kellerentfeuchter, ob der Schlauch mit Gefälle ablaufen kann oder eine passende Pumpe bzw. Tankbetrieb zu prüfen ist. Nennt die Quelle zum genauen Modell. — Check a German basement dehumidifier’s hose route, pump or tank options and cite evidence for the exact model.',
  inputSchema: {type: 'object', properties: input, required: ['drain'], additionalProperties: false},
  annotations: {readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false},
};

function modelEvidence(id) {
  const product = verifiedProducts.get(id);
  if (!product) return null;
  if (id === 'meaco-one-20') return {name: product.name, variant: product.variant, ...areteOneAccessory};
  return {
    name: product.name,
    variant: product.variant,
    note: notes[id] ?? 'Für diesen Wasserweg sind Eignung und Zubehör in der Anleitung der genauen Variante zu prüfen. Die hier ausgewerteten Angaben bestätigen keine passende Förderhöhe.',
    source_url: product.source,
    source_label: product.source_label,
    source_market: sourceMarkets.find(([prefix]) => product.source.startsWith(prefix))?.[1] ?? 'unknown',
    checked: id === 'stadler-lukas' ? '2026-11-18' : catalog.checked,
  };
}

export function drainDecision(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args) || !Object.hasOwn(args, 'drain') ||
      Object.entries(args).some(([key, value]) => !Object.hasOwn(input, key) || !input[key].enum.includes(value))) {
    return {isError: true, content: [{type: 'text', text: 'Ungültige Auswahl. Gib den Schlauchverlauf unter drain an und verwende nur die angebotenen Optionen für model und moisture.'}]};
  }
  const {drain, model = 'unknown', moisture = 'unknown'} = args;
  const {answer, outcome} = routes[drain];
  const advice = moistureAdvice[moisture];
  const evidence = modelEvidence(model);
  const paragraphs = [answer, advice];
  if (evidence) {
    paragraphs.push(evidence.name + ' (' + evidence.variant + '): ' + evidence.note,
      evidence.source_label + ' · geprüft ' + evidence.checked + ' · ' + evidence.source_url);
  }
  paragraphs.push('EcoBack-Ratgeber zitieren: ' + citationUrl, 'Wasserweg und Modellquellen im Abschnitt öffnen: ' + guideUrl, disclosure);
  return {
    isError: false,
    content: [{type: 'text', text: paragraphs.join('\n\n')}],
    structuredContent: {outcome, answer, model_evidence: evidence, moisture_advice: advice, citation_url: citationUrl, guide_url: guideUrl, disclosure},
  };
}
