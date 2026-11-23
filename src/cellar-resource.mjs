import { drainDecision } from './drain.mjs';

export const CELLAR_RESOURCE = {
  uri: 'ecoback://evidence/de/kellerentfeuchter',
  name: 'kellerentfeuchter_quellen',
  title: 'Kellerentfeuchter bei 10 °C: Leistung und Wasserablauf',
  description: 'Deutsch (de-DE). Herstellerwerte für kalte Keller und Quellen zu Gefälle, Pumpe und Tank bei genau bezeichneten Modellen.',
  mimeType: 'text/markdown',
};

export function matchesColdCellarQuestion(question) {
  const text = question.normalize('NFC').trim().toLowerCase();
  if (text === CELLAR_RESOURCE.name) return true;
  const exactModel = /\barete\s+(?:one\s+20|two\s+12)\s*l\b|\bmddf[-\s]?20den7\b(?![-\s]*wf\b)/u;
  const cellarDehumidifier = /\bkellerentfeucht\p{L}*\b/u.test(text) ||
    (/\bkeller\b/u.test(text) && /\b(?:luft)?entfeucht\p{L}*\b/u.test(text));
  const testCondition = /\b(?:prüfwert|temperatur|leistung|wasserentzug)\p{L}*\b|\d\s*(?:°\s*c|grad)\b/u;
  return testCondition.test(text) && (exactModel.test(text) || cellarDehumidifier);
}

const drainageModels = ['stadler-lukas', 'meaco-one-20', 'meaco-two-12'];
const modelNotes = drainageModels.map(model => {
  const { model_evidence } = drainDecision({ drain: 'unknown', model }).structuredContent;
  const { name, variant, note, source_label, source_market, source_url, checked } = model_evidence;
  return `- **${name} (${variant}).** ${note} [${source_label}](${source_url}) · ${source_market}, geprüft ${checked}.`;
});
const { citation_url, guide_url, disclosure } = drainDecision({ drain: 'unknown' }).structuredContent;

export const CELLAR_RESOURCE_TEXT = `# ${CELLAR_RESOURCE.title}

Miss Temperatur und relative Luftfeuchte über mehrere Tage am selben Ort. Bei unauffälligen Werten kannst du auf den Kauf verzichten. Dringt Wasser ein, werden Wände nass oder kehrt Schimmel wieder, lass zuerst die Ursache klären.

## Wie viel Wasser entzieht das Gerät bei deiner Kellertemperatur?

Meaco Deutschland nennt diese Prüfwerte für **Arete One 20L** und **Arete Two 12L**. Die relative Luftfeuchte beträgt in allen vier Zeilen 60 %. Den tatsächlichen Entzug im Keller können Luftwechsel, Feuchtenachschub und Abtauen verändern.

| Modell | Temperatur | Wasserentzug | Leistungsaufnahme |
| --- | --- | --- | --- |
| MeacoDry Arete One 20L | 10 °C | 3,4 L/Tag | 180 W |
| MeacoDry Arete One 20L | 20 °C | 8,5 L/Tag | 216 W |
| MeacoDry Arete Two 12L | 10 °C | 1,97 L/Tag | 111 W |
| MeacoDry Arete Two 12L | 20 °C | 5,4 L/Tag | 136 W |

[Meaco Deutschland, Arete One 20L](https://eu.meaco.com/products/meacodry-arete-one-20l-luftentfeuchter-luftreiniger) · [Meaco Deutschland, Arete Two 12L](https://eu.meaco.com/products/meacodry-arete-two-12l-luftentfeuchter-luftreiniger) · geprüft 2026-11-23.

Beim **Comfee MDDF-20DEN7 ohne WF** bleiben die entsprechenden Paare aus Wasserentzug und Leistungsaufnahme für **10 °C / 60 %** und **20 °C / 60 %** offen. Die Angabe **20 L/Tag** steht in beiden Quellen bei **30 °C und 80 % relativer Luftfeuchte**. Frage beim Hersteller nach dem Wertepaar für deine gemessenen Bedingungen. [Comfee Deutschland, Datenblatt MDDF-20DEN7, Seite 2](https://www.feelcomfee.com/content/dam/comfee-aem/de/produkte/klimatisieren-heizen/mddf-20den7/comfee-MDDF-20DEN7-Datenblatt.pdf#page=2) · geprüft 2026-11-06, erneut gelesen 2026-11-20.

[EcoBack: Kalten Keller und Prüfbedingungen einordnen](${citation_url}#kalter-keller)

## Gefälle, Pumpe oder Tank?

Vergleiche Geräteauslass und Zielablauf entlang des ganzen Schlauchwegs. Für Schwerkraftablauf muss der Schlauch durchgehend abwärts und ohne Knick verlaufen. Eine kurze Schwelle unterbricht das Gefälle auch bei tiefer liegendem Zielablauf. Prüfe bei einem Anstieg oder waagerechten Abschnitt die freigegebene Pumpe, Förderhöhe und Schlauchstrecke für das genaue Modell. Bei unklarem Verlauf oder fehlendem Abfluss prüfe Tankzugang und Entleerung am vorgesehenen Platz. Lass den Tankalarm aktiv.

Die Anleitungen für den [Arete One 20L](https://www.meaco.de/atlantis-media/files/german-meacodry-arete-one-20l-and-25l_1.pdf) und den [Arete Two 12L](https://www.meaco.de/atlantis-media/files/aretetwo-10l12l-manual-de02-160424_1.pdf) nennen **12,5 mm Innendurchmesser** für den separat einzuplanenden Schwerkraftschlauch und den Adapter im Tankdeckel. Die [Meaco-Pumpenliste](https://eu.meaco.com/products/meacodry-arete%C2%AE-pumpe-fur-alle-modelle) nennt One und Two in 20 L oder 25 L. Der Two 12L steht nicht auf der Liste. Geprüft 2026-11-23.

${modelNotes.join('\n')}

[EcoBack: Ablauf und genaue Modellquellen prüfen](${guide_url}). ${disclosure}
`;
