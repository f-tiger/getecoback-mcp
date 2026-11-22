import {dewPoint} from './fenster-taucheck.mjs';

export const CELLAR_VENTILATION_PAGE = '/guide/keller-lueften-sommer.html';
export const CELLAR_VENTILATION_ANCHOR = '#taupunkt';

export const CELLAR_VENTILATION_BOUNDS = {
  aussen_c: [-40, 60],
  aussen_rh_prozent: [5, 100],
  innen_c: [-40, 60],
  innen_rh_prozent: [1, 100],
  wand_c: [-40, 60],
};

export const CELLAR_VENTILATION_TITLES = {
  kondensationsrisiko: 'Kondensationsrisiko an der gemessenen Wand',
  keine_trocknung: 'Keine Trocknung durch diese Außenluft zu erwarten',
  grenzbereich_nachmessen: 'Messwerte liegen nah beieinander. Miss noch einmal.',
  probeweise_lueften: 'Diese Außenluft kann Feuchte abführen',
};

const round = value => Number(value.toFixed(1));
const epsilon = 1e-9;

export function checkCellarVentilation(values) {
  for (const [key, [min, max]] of Object.entries(CELLAR_VENTILATION_BOUNDS)) {
    const value = values?.[key];
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new RangeError('Missing or invalid measurement: ' + key);
    }
  }
  const {aussen_c, aussen_rh_prozent, innen_c, innen_rh_prozent, wand_c} = values;
  const outdoorDew = dewPoint(aussen_c, aussen_rh_prozent);
  const indoorDew = dewPoint(innen_c, innen_rh_prozent);
  const dryingMargin = indoorDew - outdoorDew;
  const wallMargin = wand_c - outdoorDew;
  // A one-degree band calls for remeasurement. It is not a sensor specification.
  let status = 'probeweise_lueften';
  if (wallMargin <= epsilon) status = 'kondensationsrisiko';
  else if (dryingMargin < -1 - epsilon) status = 'keine_trocknung';
  else if (wallMargin <= 1 + epsilon || dryingMargin <= 1 + epsilon) status = 'grenzbereich_nachmessen';

  return {
    status,
    aussen_taupunkt_c: round(outdoorDew),
    innen_taupunkt_c: round(indoorDew),
    abstand_wand_aussentaupunkt_c: round(wallMargin),
    abstand_innen_aussentaupunkt_c: round(dryingMargin),
    kondensation_innen_moeglich: wand_c <= indoorDew + epsilon,
    antwort: CELLAR_VENTILATION_TITLES[status],
  };
}
