import {namesDifferentPortaSplit} from './portasplit-fensterfalz-intent.mjs?v=66ae5fbd590d';

export function asksForCoolingNoiseComparison(query) {
  if (namesDifferentPortaSplit(query) ||
      /\b(?:ratter\w*|klacker\w*|schepper\w*|vibrier\w*|defekt\w*|fensterfalz\w*|halterung\w*|stromkosten\w*|stromverbrauch\w*|laufkosten\w*|kwh|btu)\b/.test(query)) return false;
  const n90 = /\b(?:pac[ -]*n[ -]*90|pinguino[ -]+n[ -]*90|de[ '’.-]*longhi[ -]+n[ -]*90|8004399512351)\b/.test(query);
  const namedPair = n90 && /\bporta[ -]*split\b/.test(query);
  const cooling = n90 || /\b(?:klima(?:anlage|geraet|kauf)\w*|monoblock\w*|porta[ -]*split)\b/.test(query);
  const bothQuantities = /\bschall[ -]?druck\w*\b/.test(query) && /\bschall[ -]?leistung\w*\b/.test(query);
  const compare = /\b(?:leiser|lauter|lautstaerke|vergleich\w*|gleich\s+laut|differenz\w*|unterschied\w*|vs|versus|schlafzimmer|bett)\b/.test(query);
  const values = query.match(/\b\d{1,3}(?:[.,]\d+)?\s*(?:dba?|dezibel)\b/g)?.length ?? 0;
  const pairedValues = values >= 2 || /\b\d{1,3}(?:\s*[/–-]\s*|\s+(?:und|oder)\s+)\d{1,3}\s*(?:dba?|dezibel)\b/.test(query);
  return cooling && pairedValues && (bothQuantities || (namedPair && compare));
}
