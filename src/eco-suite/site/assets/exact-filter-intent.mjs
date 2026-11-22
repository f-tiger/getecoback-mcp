// Input is normalized German text. Return a catalogue model only for an exact filter lookup.
export function exactGermanFilterModel(query) {
  if (!/\b(?:[a-z]*filter(?:s|nummer|modell)?|69309)\b/.test(query)) return null;
  if (/\b(?:philips|bosch|xiaomi|dyson|rowenta|winix|sharp|honeywell|coway|blueair|miele|samsung|trotec)\b/.test(query)) return null;
  if (/\b(?:wasch[a-z]*|auswasch[a-z]*|abwasch[a-z]*|reinig[a-z]*|gereinigt|wie\s+(?:wechsle|wechsel[a-z]*|tausche)|filterwechselanzeige|pflege|filteranzeige|filterlicht|leucht[a-z]*|reset[a-z]*|zuruecksetzen|wechselintervall|wie\s+(?:oft|lange)|wann|(?:filter)?kosten[a-z]*|kostet|preis[a-z]*|beschaedigt[a-z]*|kaputt|schimmel[a-z]*)\b/.test(query)) return null;
  if (/\b(?:lr[ -]*401|core[ -]*300[ -]*s)\b\s+(?:plus|max|ultra|premium)\b/.test(query)) return null;
  const beurer = /\blr[ -]*401\b/.test(query);
  const levoit = /\bcore[ -]*300[ -]*s\b/.test(query);
  if (beurer === levoit) return null;
  if (beurer) {
    if (Array.from(query.matchAll(/\blr[ -]*(\d{3})\b/g)).some(model => model[1] !== '401')) return null;
    if (/\blevoit\b|\b(?:lr[ -]*)?(?:400|405|500)\b|\blr[ -]*401[-/][a-z0-9]/.test(query)) return null;
    return 'beurer-lr401';
  }
  const variant = query.replace(/\bohne\s+(?:den\s+)?pro(?:[ -]zusatz)?\b/g,'');
  if (/\b(?:beurer|pro|spezialfilter|haustierfilter|haustier|pet|smoke|toxin|allergie[a-z]*|aktivkohlefilter)\b|\b300s[-/][a-z0-9]|\b300s\s+p\b|\b(?:kein(?:en)?|ohne|statt|nicht)\s+(?:den\s+)?standard(?:filter)?\b|\bcore[ -]*(?:200|300(?![ -]*s\b)|400|600)/.test(variant)) return null;
  return 'levoit-core-300s';
}
