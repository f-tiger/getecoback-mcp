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

const checkedNozzles = new Map([
  ['2.633-112.0', {
    models: ['WV 2 Plus Multi Edition'],
    url: 'https://www.karcher.com/de/de/home-and-garden/produkte/absaugduese-schmal-fuer-wv-2-wv-5-p26331120',
  }],
  ['2.633-605.0', {
    models: ['WV 3 Comfort Precision+ Black'],
    url: 'https://www.karcher.com/de/de/home-and-garden/produkte/schmale-absaugduese-170-mm-wv-1-go-wv-1-compact-wv-2-universal-wv-3-comfort-p26336050',
  }],
  ['2.633-512.0', {
    models: ['WV 4-4 Plus', 'WV 6 + KV 4', 'WV 6 Plus'],
    url: 'https://www.karcher.com/de/de/home-and-garden/produkte/absaugduese-schmal-170-mm-gelb-fuer-wv-6-p26335120',
  }],
  ['2.633-532.0', {
    models: ['WV 5 Ultra Care', 'WV 6 + KV 4 Premium', 'WV 6 Plus', 'WV 8 Signature Line'],
    url: 'https://www.karcher.com/de/de/home-and-garden/produkte/absaugduese-schmal-170-mm-weiss-fuer-wv-4-4-wv-5-ultra-wv-6-wv-7-wv-8-p26335320',
  }],
]);
const unclear = 'unbekannt';
const knownDevices = [...new Set([...checkedNozzles.values()].flatMap(({models}) => models))];

export const kaercherFensterduese = {
  name: 'fenstersauger_170mm_saugduese_geraetezuordnung',
  description: 'Gleiche eine komplette schmale Kärcher 170-mm-Absaugdüse anhand der Teilenummer 2.633-112.0, 2.633-605.0, 2.633-512.0 oder 2.633-532.0 und des exakten WV-Geräts ab. Unterscheide Saugkopf und Gummilippe — Check an exact German model and complete narrow suction nozzle.',
  page: '/produkte.html',
  properties: {
    geraet: {
      type: 'string',
      enum: [...knownDevices, unclear],
      description: 'Vollständig bestätigte Kärcher-Gerätevariante. Wähle bei einem Kürzel wie WV 6 oder bei nicht eindeutig zugeordneten Bundles unbekannt.',
    },
    teilenummer: {
      type: 'string',
      enum: [...checkedNozzles.keys(), unclear],
      description: 'Bestätigte Kärcher-Artikelnummer des Angebots in Originalschreibweise. Wähle bei anderer oder fehlender Nummer unbekannt.',
    },
    angebotsart: {
      type: 'string',
      enum: ['komplette_saugduese', 'nur_abziehlippe', unclear],
      description: 'Tatsächlich bestätigter Angebotsumfang. Eine Abziehlippe allein ist der Gummistreifen. Bei Widerspruch zwischen Artikelnummer und Beschreibung wähle unbekannt.',
    },
  },
  calculate({geraet, teilenummer, angebotsart}) {
    const offered = checkedNozzles.get(teilenummer);
    const matches = [...checkedNozzles].filter(([, {models}]) => models.includes(geraet));
    let status = 'zuordnung_offen';
    if (angebotsart === 'nur_abziehlippe') {
      status = 'nur_abziehlippe';
    } else if (angebotsart === 'komplette_saugduese' && offered && geraet !== unclear) {
      status = offered.models.includes(geraet) ? 'herstellerliste_bestaetigt' : 'kombination_nicht_belegt';
    }
    const evidence = offered ? new Map([[teilenummer, offered], ...matches]) : new Map(matches);
    return {
      status,
      markt: 'Deutschland',
      dokumentierte_duesen: matches.map(([number]) => number),
      vor_kauf: status === 'herstellerliste_bestaetigt'
        ? 'passende_vorhandene_duese_weiterverwenden_sonst_angebotsumfang_abgleichen'
        : 'kauf_zurueckstellen_und_geraetevariante_teileart_oder_kennung_klaeren',
      hinweis: '170 mm ist die Nennbreite. Prüfe die Gerätevariante, die vollständige Artikelnummer und den Angebotsumfang. Ein Treffer in der deutschen Zubehörliste belegt weder die Ausstattung eines Sets noch die Kompatibilität unbelegter Varianten.',
      belege: [...evidence].map(([number, {url}]) => ({
        teilenummer: number,
        url,
        fundstelle: 'Kärcher Deutschland, kompatible Geräte der Absaugdüse',
        geprueft_am: '2026-11-22',
      })),
    };
  },
  example: {
    args: {geraet:'WV 6 Plus', teilenummer:'2.633-532.0', angebotsart:'komplette_saugduese'},
    expect: {status:'herstellerliste_bestaetigt', dokumentierte_duesen:['2.633-512.0', '2.633-532.0']},
  },
};
