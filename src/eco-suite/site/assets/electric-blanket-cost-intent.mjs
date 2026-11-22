const blanket = /\b(?:heiz[ -]?(?:decke|zudecke)n?|waermezudecken?|(?:beurer\s+)?hd[ -]*75)\b/;
const compound = /\b(?:heiz(?:decke|zudecke)n?|waermezudecken?)(?:strom|energie)(?:kosten|verbrauch)\b/;
const otherAppliance = /\b(?:klimaanlagen?|delonghi|pinguino|pac[ -]*n90|n90|8004399512351|heizluefter|waermeunterbetten?|heizkissen|fusswaermer)\b/;

export function isElectricBlanketQuestion(query) {
  return (blanket.test(query) || compound.test(query)) && !otherAppliance.test(query);
}

// Input is normalized German text. A model or a timer alone is not a running-cost request.
export function asksForElectricBlanketCost(query) {
  if (!isElectricBlanketQuestion(query) ||
      /\b(?:kaufpreis\w*|anschaffung\w*|kaufen|amazon|angebot\w*|test\s?sieger|reparier\w*|wasch\w*|reinig\w*|einschlaf\w*|schlaf\w*|nachts|ueber nacht|sicher|darf|erlaubt|brand\w*|vergleich\w*|versus|vs|gasheizung|raumheizung|heizkosten sparen|gemessen\w*|messgeraet|zwischenzaehler)\b/.test(query)) return false;
  const explicitlyElectric = compound.test(query) ||
    /\b(?:stromkosten|stromverbrauch|energieverbrauch|energiekosten|betriebskosten|strom (?:verbrauch\w*|braucht|zieht))\b/.test(query);
  const cost = /\b(?:kost\w*|verbrauch\w*|preis\w*|cent|ct|eur|euro|chf)\b/.test(query);
  const usage = /\b(?:kwh|kilowattstunden?|watt|stunden?|minuten?|abend(?:s|e|en)?|betrieb|nutzung\w*|pro tag|an strom)\b|\d\s?(?:h|w)\b/.test(query);
  return explicitlyElectric || (cost && usage);
}
