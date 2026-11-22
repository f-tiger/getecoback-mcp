// Input is normalized German text. Keep placement changes and calibration separate.
export function asksForHygrometerComparison(query) {
  if (!/\b(?:[a-z]*hygrometer(?:n)?|feuchtemesser(?:n)?)\b/.test(query)) return false;
  if (/\b(?:kalibr\w*|justier\w*|[a-z]*referenz\w*|salztest|vorher|nachher|vor dem lueften|nach dem lueften|nacheinander|in unterschiedlichen raeumen|verschiedene raeume|fensterbank|am heizkoerper)\b/.test(query)) return false;
  const pair = /\b(?:zwei|2|beide[nr]?|zweier)\b|\b(?:das|mein) eine\b.*\b(?:das|mein) andere\b|\bhygrometer\s+a\b.*\b(?:hygrometer\s+)?b\b/.test(query);
  const conditions = /\b(?:nebeneinander|(?:selben|gleichen)\s+(?:ort|platz|messort|standort)|gleiche[nmr]?\s+(?:messort|standort|standbedingungen|hoehe)|toleranz\w*|genauigkeit\w*|messfehler\w*|prozentpunkt\w*)\b|±\s*\d/.test(query);
  const difference = /\b(?:abweich\w*|unterscheid\w*|unterschied\w*|differenz\w*|verschieden\w*|toleranz\w*|genauigkeit\w*|vergleic\w*|stimmt|austausch\w*)\b|\b\d+(?:[,.]\d+)?\s*(?:%|prozent(?:punkt\w*)?\b)/.test(query);
  return pair && conditions && difference;
}
