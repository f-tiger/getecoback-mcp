export function asksForTesamollWindowProfile(query) {
  if (/\b(?:porta[ -]*split|dusch\w*|kuehlschrank\w*|tuer[ -]?boden\w*)\b/.test(query)) return false;
  const window = /\b(?:[a-z]*fenster(?:[ns]|dicht\w*|rahmen\w*|falz\w*|spalt\w*)?|fenster[ -]?dichtung\w*)\b/.test(query);
  const fit = /\b(?:profil\w*|dicht\w*|fensterdicht\w*|spalt\w*|nut\w*|klebe\w*|[epd][ -]?(?:profil|dichtung)\w*)\b/.test(query);
  const tesamoll = /\btesa[ -]?moll\b/.test(query);
  const profileOptions = /\b[epd](?:[ -]?(?:profil|dichtung)\w*|-)?(?:\s*[,/]\s*|\s+(?:oder|und|vs|versus)\s+)[epd](?:[ -]?(?:profil|dichtung)\w*)?\b/.test(query);
  const alternate = /\b(?:andere[nsrm]? hersteller[ns]?|fremdprofil\w*|unbekannte[nsrm]? hersteller[ns]?|(?:nicht|kein(?:e[nsrm]?)?) tesa[ -]?moll|silikon\w*|schaumstoff\w*|i[ -]?profil\w*|premium flexible)\b/.test(query);
  const explicitDoor = /\b(?:[a-z]*tuer(?:en|dichtung\w*|rahmen\w*)?|tuer[ -]?spalt\w*)\b/.test(query);
  return !alternate && ((window && (profileOptions || (fit && tesamoll))) || (tesamoll && profileOptions && !explicitDoor));
}
