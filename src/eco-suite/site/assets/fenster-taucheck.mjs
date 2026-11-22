export const WINDOW_CONDENSATION_PAGE = '/guide/fenster-beschlagen-innen.html';
export const WINDOW_CONDENSATION_URL = 'https://getecoback.com' + WINDOW_CONDENSATION_PAGE + '#fenstersauger-gegen-kondenswasser';

// Magnus approximation over water, as used by the existing moisture tools.
export function dewPoint(celsius, relativeHumidity) {
  const gamma = Math.log(relativeHumidity / 100) + 17.62 * celsius / (243.12 + celsius);
  return 243.12 * gamma / (17.62 - gamma);
}

export function checkWindowCondensation({room_c, room_rh_pct, surface_c}) {
  const dew = dewPoint(room_c, room_rh_pct);
  const margin = surface_c - dew;
  // Recheck close readings rather than interpreting rounded measurements as proof.
  // This orientation band does not estimate the precision of the user's sensors.
  const messlage = Math.abs(margin) <= 1 + 1e-9 ? 'nahe_am_taupunkt' :
    margin < 0 ? 'unter_taupunkt' : 'ueber_taupunkt';
  return {
    dew_point_c: Number(dew.toFixed(1)),
    surface_margin_c: Number(margin.toFixed(1)),
    condensation_possible: margin <= 1e-9,
    messlage,
  };
}
