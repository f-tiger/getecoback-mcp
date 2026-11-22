export function namesTrotecTtk75Eco(query) {
  return /\bttk[ -]*75[ -]*eco\b/.test(query) &&
    !/\bnicht\s+(?:(?:den|der|das|dem|die|trotec)\s+)*ttk[ -]*75[ -]*eco\b/.test(query) &&
    !/\bttk[ -]*75[ -]*eco[ -]+(?:pro|plus|mini|ii|2(?:[.,]0)?)\b/.test(query);
}

export function asksForTrotecTtk75EcoConditions(query) {
  if (!namesTrotecTtk75Eco(query) ||
      /\b(?:filter\w*|ersatzteil\w*|wartung\w*|reinig\w*|preis\w*|lieferbar\w*|repar\w*|lautstaerke\w*|geraeusch\w*)\b/.test(query)) return false;
  const capacity = /\b(?:liter\w*|entfeuchtungsleist\w*|entfeuchtungsmenge\w*|entzieht|pruefpunkt\w*|pruefbeding\w*|betriebsbereich\w*|betriebstemperatur\w*)\b/.test(query) ||
    /\b\d+(?:[.,]\d+)?\s*l\s*(?:\/\s*(?:tag|24\s*h)|pro\s+tag)\b/.test(query);
  const temperature = /\b(?:kalt\w*|ungeheizt\w*|temperatur\w*|keller\w*)\b|\b\d{1,2}\s*(?:°\s*c|grad)\b/.test(query);
  const otherTask = /\b(?:strom\w*|watt\w*|kosten\w*|kwh|schlauch\w*|ablauf\w*)\b/.test(query);
  return capacity || (temperature && !otherTask);
}
