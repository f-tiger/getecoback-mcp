import {WINDOW_CONDENSATION_PAGE, WINDOW_CONDENSATION_URL} from '../site/assets/fenster-taucheck.mjs';

const productGuide = '/produkte.html';
const laundryGuide = '/guide/waesche-trocknen-wohnung.html';
const sections = new Map([
  ['Kaffeemaschinenpflege', [productGuide, 'kaffeevollautomat-pflege-und-kauf']],
  ['Waschmitteldosierung', [laundryGuide, 'waschmittel-automatische-dosierung']],
  ['Spülmittel und Wasserhärte', [productGuide, 'geschirrspueler-wasserhaerte-reiniger']],
  ['Bodenstaubsaugerpflege', [productGuide, 'bodenstaubsauger-belege']],
  ['Dampfbügelgeräte', [productGuide, 'philips-dampfbuegelgeraete-de-belege']],
  ['Stabmixer und Zubehör', [productGuide, 'stabmixer-belege']],
  ['Mikrowellenbelege', [productGuide, 'mikrowelle-bosch-bfl524-belege']],
  ['Küchenwaagen', [productGuide, 'beurer-kuechenwaagen-gebrauch']],
  ['Wasserkocherbelege', [productGuide, 'wasserkocher-bosch-twk8613p']],
  ['Toasterbelege', [productGuide, 'bosch-tat8613-toaster-belege']],
  ['Fenstersauger', [productGuide, 'fenstersauger-belege']],
  ['Modellunterlagen', ['/guide/luftbefeuchter-stromverbrauch.html', 'effizienz-vergleichen']],
]);

const toolSections = new Map([
  ['kaffeevollautomat_intenza_aquaclean_filterfamilie_modellpruefung', [productGuide, 'kaffee-wasserfilter']],
  ['glassvac_kalt_lagern_einschalten_laden_getrennt', [productGuide, 'bosch-glassvac-einsatz-und-pflege']],
  ['fenstersauger_170mm_saugduese_geraetezuordnung', [productGuide, 'kaercher-170mm-saugduese']],
  ['fenstersauger_wv3_wv8_led_muster_einordnen', [productGuide, 'kaercher-fenstersauger-einsatz-und-hinweise']],
]);

export function evidenceGuideUrl(category, page, name) {
  if (name === 'fenster_oberflaeche_taucheck' && page === WINDOW_CONDENSATION_PAGE) return WINDOW_CONDENSATION_URL;
  const section = toolSections.get(name) ?? sections.get(category);
  if (section && section[0] === page) return 'https://getecoback.com' + page + '#' + section[1];
  return undefined;
}
