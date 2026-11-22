// Both German finders supply text normalized to lowercase with ae/oe/ue spelling.
export function asksForDehumidifierDrainRoute(query) {
  const device = /\b(?:(?:luft|keller)?entfeuchter(?:s|n)?|(?:meacodry\s+)?arete\s+(?:one\s+(?:20|25)|two\s+12)\s*l|mddf[ -]?20den7(?![ -]*wf\b)|l-031e|d4000-eu)\b/.test(query);
  if (!device || /\b(?:waschmaschine|geschirrspueler|spuelmaschine|waeschetrockner|klimaanlage|aquarium)\b/.test(query)) return false;
  const hose = /\b(?:schlauch(?:weg)?|(?:kondensat|abfluss|ablauf)schlauch|(?:boden|dauer|kondensat)?ablauf|abfluss|waschbecken|ausguss|auslass|kondensatpumpe)\b/.test(query);
  const route = query.replace(/\bhoeher(?:e[nmrs]?)?\s+(?:relativ[a-z]*\s+)?(?:(?:luft|raum)?feucht[a-z]*|temperatur[a-z]*|leistung[a-z]*)\b/g,'');
  const rise = /\b(?:bergauf|aufwaerts|hochfuehr[a-z]*|hochleg[a-z]*|nach\s+oben|hoeher(?:e[nmrs]?)?|steigung|anstieg|ansteig[a-z]*|schwelle|t(u|ue)rschwelle|foerderhoehe)\b/.test(route);
  return hose && rise;
}
