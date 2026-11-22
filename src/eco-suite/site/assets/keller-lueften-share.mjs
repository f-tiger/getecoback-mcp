import {CELLAR_VENTILATION_ANCHOR, CELLAR_VENTILATION_PAGE, checkCellarVentilation} from './keller-lueften-check.mjs';

export const CELLAR_SHARE_TITLE = 'Keller lüften? Taupunkte und kalte Wand vergleichen';
export const CELLAR_SHARE_URL = 'https://getecoback.com' + CELLAR_VENTILATION_PAGE + CELLAR_VENTILATION_ANCHOR;

const advice = {
  kondensationsrisiko: 'Für die Trocknung auf andere Außenbedingungen warten.',
  keine_trocknung: 'Für die Trocknung auf einen niedrigeren Außentaupunkt warten.',
  grenzbereich_nachmessen: 'Innen, außen und an der kältesten Wand zeitgleich nachmessen.',
  probeweise_lueften: 'Kurz probeweise lüften und anschließend erneut messen.',
};
const basis = {
  example: 'Rechenbeispiel',
  shared: 'Werte aus einem geteilten Szenario',
  entered: 'Eingegebene Werte, nicht unabhängig geprüft',
};
const number = new Intl.NumberFormat('de-DE', {maximumSignificantDigits:17, useGrouping:false});

export function cellarVentilationShareText(values, provenance = 'entered') {
  const check = checkCellarVentilation(values);
  const outdoor = `${number.format(values.aussen_c)} °C / ${number.format(values.aussen_rh_prozent)} % r. F.`;
  const indoor = `${number.format(values.innen_c)} °C / ${number.format(values.innen_rh_prozent)} % r. F.`;
  const wall = `${number.format(values.wand_c)} °C`;
  const condensation = check.kondensation_innen_moeglich
    ? ' Auch vorhandene Kellerluft kann an dieser Wand kondensieren.' : '';
  return [
    `Keller lüften · ${basis[provenance]}`,
    `Außen ${outdoor} → Taupunkt ca. ${number.format(check.aussen_taupunkt_c)} °C. Innen ${indoor} → ca. ${number.format(check.innen_taupunkt_c)} °C. Kälteste geprüfte Wand: ${wall}.`,
    `${check.antwort.replace(/\.$/, '')}. ${advice[check.status]}${condensation}`,
    'Bei sichtbarer Nässe zuerst die Ursache klären. Notwendige Lüftung für die Luftqualität bleibt separat.',
    `Rechenweg und Quellen im EcoBack-Ratgeber (enthält Affiliate-Links): ${CELLAR_SHARE_URL}`,
  ].join('\n');
}
