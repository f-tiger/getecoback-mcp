const checked = '2026-11-20';
const compatible = new Map([
  ['26331040', {
    model: 'wv3_precision_black_16336980',
    url: 'https://www.karcher.com/de/de/home-and-garden/produkte/wv-abziehlippen-schwarz-170-mm-p26331040',
  }],
  ['26335130', {
    model: 'wv8_signature_16337850',
    url: 'https://www.karcher.com/de/de/home-and-garden/produkte/wv-4-4-wv-5-ultra-wv-6-wv-7-wv-8-abziehlippen-170-mm-p26335130',
  }],
]);

export const kaercherFensterlippe = {
  name: 'fenstersauger_170mm_abziehlippe_geraetefamilie',
  description: 'Prüfe 170-mm-Ersatzlippen und Gummilippen für Kärcher WV 3 (WV3) und WV 8 (WV8) anhand der Teilenummer 2.633-104.0 oder 2.633-513.0 — Check exact manufacturer compatibility for two narrow window-vacuum blades.',
  page: '/produkte.html',
  properties: {
    geraet: {
      type: 'string',
      enum: ['wv3_precision_black_16336980', 'wv8_signature_16337850', 'anderes_oder_unbekannt'],
      description: 'Am Typenschild bestätigte Gerätevariante. WV 3 Comfort Precision+ Black 1.633-698.0 oder WV 8 Signature Line 1.633-785.0.',
    },
    schmale_originalduese: {
      type: 'boolean',
      description: 'Die angegebene schmale Originaldüse ist als die am Gerät verwendete Düse bestätigt.',
    },
    teilenummer: {
      type: 'string',
      enum: ['26331040', '26335130', 'andere_oder_unbekannt'],
      description: 'Am Angebot bestätigte Kärcher-Teilenummer 2.633-104.0 oder 2.633-513.0, ohne Trennzeichen.',
    },
  },
  calculate({geraet, schmale_originalduese, teilenummer}) {
    const offer = compatible.get(teilenummer);
    let status = 'offen';
    if (geraet !== 'anderes_oder_unbekannt' && schmale_originalduese && offer) {
      status = offer.model === geraet ? 'herstellerliste_bestaetigt' : 'kombination_nicht_aufgelistet';
    }
    return {
      status,
      vor_kauf: status === 'herstellerliste_bestaetigt' ? 'teilenummer_am_konkreten_angebot_erneut_abgleichen' : 'kauf_zurueckstellen_und_zuordnung_klaeren',
      hinweis: '170 mm bezeichnet die Breite. Die für dieses Gerät vorgesehene Originaldüse und die exakte Ersatzteilnummer müssen zusammen belegt sein.',
      beleg: offer ? {url:offer.url, fundstelle:'Kärcher Deutschland, kompatible Geräte der angebotenen Abziehlippe', geprueft_am:checked} : null,
    };
  },
  example: {
    args: {geraet:'wv8_signature_16337850', schmale_originalduese:true, teilenummer:'26331040'},
    expect: {status:'kombination_nicht_aufgelistet', vor_kauf:'kauf_zurueckstellen_und_zuordnung_klaeren'},
  },
};
