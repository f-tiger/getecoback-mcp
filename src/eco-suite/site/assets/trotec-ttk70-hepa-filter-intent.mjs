// Match the documented main filter and the exact dehumidifier family; its HEPA
// model suffix alone is not a request for a replacement part.
export function asksForTrotecTtk70Filter(query) {
  const model = /\bttk[ -]*70[ -]*hepa(?:[ -]*plus\b|\b\+?)/g;
  const namesModel = model.test(query);
  const subject = query.replace(model, ' ');
  const part = /\b7[. -]?710[. -]?000[. -]?(?:024|077)\b(?![.-]\d)/.test(subject);
  if (!part && !namesModel) return false;

  // Reject a different named appliance or variant rather than extending the
  // TTK 70 evidence to it solely because the search contains the part number.
  if (/\b(?:ttk[ -]*\d|philips|levoit|beurer|bosch|dyson|meaco|arete|comfee|mddf|luftreiniger|airgo)[a-z0-9]*/.test(subject) ||
      /\bttk[ -]*70[ -]*hepa(?:[ -]*(?:plus|\+))?[ -]*(?:pro|mini|deluxe|ii|2\.0)\b/.test(query)) return false;
  if (/\b(?:wie\s+(?:oft|haeufig|lange)|intervall[a-z]*|wechselturnus|lebensdauer|reinig[a-z]*|wasch[a-z]*|auswasch[a-z]*|absaug[a-z]*|saeuber[a-z]*|pflege[a-z]*|reset[a-z]*|zuruecksetz[a-z]*|blinkt|leuchtet|standzeit|filterlaufzeit)\b/.test(subject)) return false;
  if (/\b(?:wann|wie)\b.*\b(?:wechs(?:el|le)[a-z]*|tausch[a-z]*)\b|\b(?:filterwechsel|filtertausch)\b.*\b(?:wann|intervall|monate[n]?)\b/.test(subject)) return false;
  if (/\b(?:wie\s*viel\s+strom|stromverbrauch|stromkosten|energieverbrauch|laerm|lautstaerke|entfeuchtungsleistung|luftdurchsatz)\b/.test(subject)) return false;
  if (/\balle\s+[a-z0-9-]+\s+(?:tage|wochen|monate|jahre)\b/.test(subject)) return false;
  if (part) return true;

  const dustFilter = /\b(?:staub[ -]?(?:vor[ -]?)?filter|vor[ -]?filter|7[. -]?710[. -]?000[. -]?080)\b/.test(subject);
  const mainFilter = /\b(?:hepa[ -]?filter|hauptfilter)\b/.test(subject);
  if (dustFilter && !mainFilter) return false;
  return mainFilter || /\b(?:ersatzfilter|filterpatrone|filternummer|filtergeneration|filtermodell|filter)\b/.test(subject);
}
