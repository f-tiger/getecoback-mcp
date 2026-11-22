// Input is normalized German text. Exact product identity and operating cost
// use separate source sections, even when the electricity question names an EAN.
export function asksForN90ModelIdentity(query) {
  const ean = /\b8004399512351\b/;
  const model = /\b(?:pac[ -]*n[ -]*90|n90[ -]+eco[ -]+silent|pinguino[ -]+n90|de['’ -]?longhi[ -]+n90)\b/;
  if (!(ean.test(query) || model.test(query))) return false;
  if (/\b(?:strom[ -]?(?:kost\w*|verbrauch\w*)|energiekost\w*|energieverbrauch\w*|energie[ -]?(?:label|etikett)|verbrauch\w*|leistungsaufnahme|kwh|kilowattstunden?|watt|arbeitspreis|strompreis|zwischenzaehler|pro stunde|pro nacht)\b/.test(query)) return false;
  if (query.trim() === '8004399512351') return true;
  if (/\b(?:ean(?:[ -]?13)?|gtin|barcode|typenschild|typenbezeichnung\w*|modellnummer|modellbezeichnung\w*|artikel[ -]?(?:nummer|nr))\b/.test(query)) return true;
  const offer = /\b(?:angebot\w*|verkaeufer\w*|haendler\w*|etikett\w*)\b/.test(query);
  const comparison = /\b(?:variante\w*|modell\w*|version\w*)\b/.test(query) &&
    (ean.test(query) || /\b(?:gleich\w*|(?:der|die|das)selb\w*|identisch\w*|pass\w*|stimm\w*|richtig\w*|abweich\w*|widerspr\w*|unterscheid\w*)\b/.test(query));
  return offer && comparison;
}

export function namesAnotherPacWithoutN90(query) {
  return /\b(?:pac|pinguino|de['’ -]?longhi)[ -]*(?:ex|el|em|an|cn)[ -]*\d{2,3}\b/.test(query) &&
    !/\bn[ -]*90\b/.test(query);
}
