// The model label and the offered bag type are independent inputs. A short C2
// label can open the single-device check but cannot select a particular bag.
export function mieleBagTask(query) {
  if (/\b(?:bosch|philips|dyson|aeg|siemens|roborock|vorwerk|rowenta|boost|blizzard|beutellos[a-z]*)\b/.test(query)) return null;
  const exactPack = /\b(?:12421170|12421180|12557060|12557080)\b/.test(query) &&
    /\b(?:originalpack[a-z]*|originalpaket[a-z]*|originalbeutel[a-z]*|materialnummer|artikelnummer)\b/.test(query);
  const hasBag = /\b(?:[a-z]*beutel(?:s|n|typ(?:en)?|familie)?|hyclean|gn|fjm|tu|co(?!₂))\b/.test(query);
  if (!hasBag && !exactPack) return null;
  if (/\b(?:[a-z]*anzeige[a-z]*|reset[a-z]*|zuruecksetz[a-z]*|leuchte[a-z]*|blink[a-z]*|saugkraft|saugleistung|feinstaub|fusseln|verstopf[a-z]*|sperrklinke|halteplatte|halterung|einsetzen|eingesetzt|geruch|riecht|vorteilspack|xxl|motorschutzfilter|stueckzahl|mengenbedarf|fehlermeldung|klappe|rastet|gerissen|abgerissen)\b/.test(query)) return null;
  if (/\b(?:wie\s+(?:oft|lange|wechsel[a-z]*|wechsle|tausch[a-z]*)|wann\s+.{0,35}(?:wechsel|tausch)|wie\s+viele?|alle\s+[a-z0-9-]+\s+monate|beutelwechsel|bagless)\b/.test(query)) return null;
  if (/\b(?:wie|wann)\b.{0,65}\b(?:wechseln|tauschen|auswechseln|einbauen|entnehmen|ausbauen|einlegen)\b/.test(query)) return null;
  if (/\b(?:deckel|gehaeuse)\b.{0,35}\b(?:blockiert|schliesst\s+nicht)\b/.test(query)) return null;
  if (/\b(?:nicht|halb|kaum)\s+voll\b|\b(?:ist|scheint|zeigt)\s+(?:schon\s+)?(?:voll|leer|rot)\b|\bsaugt\s+(?:kaum|nicht)\b/.test(query)) return null;
  if (!exactPack && /\b(?:packungsinhalt|lieferumfang)\b/.test(query)) return null;
  const matches = [...query.matchAll(/\b(guard|classic|complete|compact)[ -]*([clsm])[ -]*([123])\b/g)];
  const models = new Set(matches.map(match => match[1] + match[2] + match[3]));
  if ([...models].some(key => !/^(?:guard[lsm]1|classicc1|completec[123]|compactc[12])$/.test(key))) return null;
  const miele = /\bmiele\b/.test(query);
  if (!miele && !models.size) return null;
  // Count an abbreviated second model in phrases such as “Guard S1 und L1”.
  const labels = new Set([...query.matchAll(/\b([clms])[ -]*([123])\b/g)].map(match => match[1] + match[2]));
  if (!models.size && !labels.size) return null;
  const familyCount = Math.max(models.size, labels.size);
  if (exactPack && models.size === 1 && labels.size === 1) return 'single';
  const sharedStock = /\b(?:beide|dieselb[a-z]*|gleich[a-z]*|gemeinsam[a-z]*|teilen|vorrat)\b/.test(query);
  const namesBags = /\b[a-z]*beutel(?:s|n)?\b/.test(query) || (sharedStock && /\b(?:gn|fjm|tu|co)\b/.test(query));
  if (/\b(?:abluftfilter|hepa[a-z]*|sf[ -]?ha|airclean)\b/.test(query) && (!namesBags || familyCount < 2)) return null;
  const correctsModel = /\b(?:sondern|korrektur|ich meine|ich meinte)\b/.test(query);
  const namesAlternatives = matches.some((match,index) => index > 0 &&
    /\boder\b/.test(query.slice(matches[index-1].index+matches[index-1][0].length,match.index)));
  const incompleteLabel = /\bnur\s+c[ -]*[12]\b/.test(query);
  if (familyCount > 1 && !correctsModel && (sharedStock || (!namesAlternatives && !incompleteLabel))) return 'pair';
  return 'single';
}
