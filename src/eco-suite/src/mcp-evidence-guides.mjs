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

export function evidenceGuideUrl(category, page) {
  const section = sections.get(category);
  if (section && section[0] === page) return 'https://getecoback.com' + page + '#' + section[1];
  return undefined;
}
