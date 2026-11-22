// This source concerns the original standard bracket on an inward-opening window.
export function namesDifferentPortaSplit(query) {
  return /\bporta[ -]*split[ -]*(?:pro|lite|mini|plus|cool|e|ii|2(?:[.,]0)?)\b/.test(query);
}

export function asksForPortaSplitWindowLip(query) {
  if (!/\b(?:porta[ -]*split|4048164116478)\b/.test(query) || namesDifferentPortaSplit(query)) return false;
  if (/\b(?:dachfenster|universal[ -]?halterung|franzoesisch\w*\s+balkon\w*|schiebefenster|nach aussen|aussen\s+oeffn\w*|monoblock)\b/.test(query)) return false;
  const windowLip = /\b(?:fenster[ -]?falz\w*|falz[ -]?(?:breite|hoehe|mass)\w*)\b/.test(query);
  const frameOrSeal = /\b(?:falz|fensterrahmen|rahmenfalz|rahmen[ -]?dicke|gummi[ -]?dichtung|dichtung)\w*\b/.test(query);
  const measures = /\b(?:mess\w*|ausmess\w*|mitmess\w*|mitzaehl\w*|zusammendrueck\w*|breit\w*|hoch|hoehe|pass\w*)\b|\d\s*(?:cm|mm)\b/.test(query);
  return windowLip || (frameOrSeal && measures);
}
