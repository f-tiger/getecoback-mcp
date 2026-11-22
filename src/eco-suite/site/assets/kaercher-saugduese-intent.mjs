export const glassvacModel = /\b(?:glass[ -]?vac|06008b7000)\b/;
const kaercherWindowVac = /\b(?:wv[ -]*[1-8]|kaercher[ -]+fenstersauger)\b/;
export const windowVacCharging = /\b(?:laden|aufladen|aufzuladen|aufladung|einstecken|ladenetzteil|ans\s+ladegeraet|(?:in|an)\s+die\s+steckdose)\b/;

export function focusWindowVacQuestion(query) {
  if (!glassvacModel.test(query) || !kaercherWindowVac.test(query)) return {query};
  const pivots = [...query.matchAll(/\b(?:stattdessen|korrektur|ich\s+(?:meine|meinte)|gemeint\s+ist|sondern|jetzt(?:\s+(?:habe\s+ich|nutze\s+ich|geht\s+es\s+um|zum))?)\b/g)];
  for (const pivot of pivots.reverse()) {
    const previous = query.slice(0,pivot.index);
    if (pivot[0] === 'jetzt' && !/\b(?:alt[a-z]*|frueher|zuvor|vorher|wollte|bislang)\b/.test(previous)) continue;
    const current = query.slice(pivot.index+pivot[0].length).trim();
    const bosch = current.match(glassvacModel);
    const kaercher = current.match(kaercherWindowVac);
    if (Boolean(bosch) === Boolean(kaercher)) continue;
    const model = bosch ?? kaercher;
    if (/\b(?:nicht|kein[a-z]*)\b/.test(current.slice(0,model.index))) continue;
    if (kaercher && glassvacModel.test(previous)) return {query:current, omitPrefix:'glassvac_'};
    if (bosch && kaercherWindowVac.test(previous)) return {query:current, omitPrefix:'fenstersauger_wv'};
  }
  // A charging question with two possible subjects has no single model limit.
  return windowVacCharging.test(query) ? null : {query};
}

const nozzlePart = /\b2[. -]?633[. -]?(?:112|512|532|605)[. -]?0\b(?![.-]\d)/;
const bladePart = /\b2[. -]?633[. -]?(?:104|513)[. -]?0\b/;

const windowVacModel = /\b(?:wv[ -]*[1-8]|fenstersauger)\b/;
export function asksForWindowVacClearance(query) {
  if (!windowVacModel.test(query) && !glassvacModel.test(query)) return false;
  if (/\b(?:zwischen\s+(?:\w+\s+){0,3}sprossen|(?:glas|scheib)\w*\s+ist\s+\d+[ -]*(?:mm|cm)\s+breit)\b/.test(query)) return true;
  return /\b(?:sprossen[a-z]*|glasbreite|lichte[nr]?\s+breite|rahmenreserve|seitenreserve)\b/.test(query) &&
    !/\b(?:artikelnummer|teilenummer|lieferumfang|paket|angebot|nachkaufen)\b/.test(query);
}

export function asksForNarrowKaercherNozzle(query) {
  if (glassvacModel.test(query) || /\b(?:bosch|staubsauger[a-z]*|hochdruck[a-z]*|dampfreiniger|bodenduese)\b/.test(query) || bladePart.test(query)) return false;
  if (/\b(?:leds?|blink[a-z]*|ladekabel|ladegeraet|akku[a-z]*|defekt[a-z]*|fehler[a-z]*|kaputt|streifen[a-z]*|schlieren[a-z]*|reinig[a-z]*|verstopft[a-z]*)\b/.test(query)) return false;
  const subject = query.replace(/\bnicht\s+(?:nur\s+)?(?:die\s+)?(?:ersatz|abzieh|gummi)?lippe\b/g, '');
  if (/\b(?:[a-z]*lippen?|ersatzgummi|gummistreifen)\b/.test(subject)) return false;
  if (asksForWindowVacClearance(query)) return false;
  if (nozzlePart.test(query)) return true;
  const windowVac = /\bwv[ -]*[1-8]\b/.test(query) ||
    (/\bkaercher\b/.test(query) && /\b(?:fenstersauger|absaugduese[n]?)\b/.test(query));
  const narrow = /\b(?:schmal[a-z]*|170[ -]*(?:mm|millimeter)|17[ -]*(?:cm|zentimeter))\b/.test(query);
  const head = /\b(?:(?:(?:ab)?saug|ersatz|fenster)?duesen?|(?:ab)?saugkopf|ersatzkopf|saugkoepfe)\b/.test(query);
  if (!windowVac || !narrow || !head) return false;
  return true;
}
