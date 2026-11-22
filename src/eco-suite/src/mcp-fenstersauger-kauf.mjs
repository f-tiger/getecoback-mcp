import {WINDOW_ENTRY_URL} from './fenstersauger-entry.mjs';

const checked = '2026-11-20';
const kaercher = 'https://www.karcher.com/de/de/home-and-garden/produkte/';
const packages = [
  {
    modell:'Kärcher WV 2 Plus Multi Edition', artikel:'1.633-662.0', arbeitsbreiten_mm:[280],
    quelle:kaercher + 'wv-2-plus-multi-edition-p16336620',
  },
  {
    modell:'Kärcher WV 3 Comfort Precision+ Black', artikel:'1.633-698.0', arbeitsbreiten_mm:[170,280],
    quelle:kaercher + 'wv-3-comfort-precision-black-p16336980',
  },
  {
    modell:'Kärcher WV 8 Signature Line', artikel:'1.633-785.0', arbeitsbreiten_mm:[170,280],
    quelle:kaercher + 'wv-8-signature-line-p16337850',
  },
  {
    modell:'Bosch GlassVAC Set', artikel:'06008B7000', arbeitsbreiten_mm:[133,266],
    quelle:'https://www.bosch-diy.com/de/de/p/glassvac-06008b7000',
    anleitung:'https://www.bosch-diy.com/storage/de-de/glassvac-100045834-original-pdf-396340-de-de.pdf',
  },
];

export const fenstersaugerSprossenKauf = {
  name:'fenstersauger_sprossenfenster_duesenbreite',
  description:'Welche Düse passt in ein schmales Sprossenfenster? Vergleicht vorhandene Düse und vier deutsche Fenstersauger-Sets anhand der gemessenen lichten Breite und Reserve je Seite. — Shortlist four German window-vacuum packages after measuring the narrowest clear pane and allowing a side margin.',
  page:'/produkte.html',
  properties:{
    lichte_breite_mm:{type:'number',minimum:0,maximum:5000,description:'Engste freie Breite des zu reinigenden Glasfelds in mm, quer zur Zugrichtung zwischen den Hindernissen gemessen. 0 bei fehlender Messung.'},
    spiel_pro_seite_mm:{type:'number',minimum:0,maximum:1000,description:'Eigene zusätzliche Reserve in mm je Seite für Rahmen und Handhabung. Die Reserve gilt auf beiden Seiten.'},
    vorhandene_duese_mm:{type:'number',minimum:0,maximum:3000,description:'Arbeitsbreite in mm einer vorhandenen, zum eigenen Gerät bestätigten Düse. 0, wenn keine kompatible Düse verfügbar ist. Bei ungeklärter vorhandener Düse zuerst die Kompatibilität prüfen.'},
    kauf_geplant:{type:'boolean',description:'Ein Gerätekauf ist nach eigener Prüfung ausdrücklich geplant.'},
  },
  calculate({lichte_breite_mm,spiel_pro_seite_mm,vorhandene_duese_mm,kauf_geplant}) {
    const messungVorhanden = lichte_breite_mm > 0;
    const nutzbreite = messungVorhanden ? Math.max(0, lichte_breite_mm - 2 * spiel_pro_seite_mm) : null;
    const vorhandeneDuesePasst = messungVorhanden && vorhandene_duese_mm > 0 ? vorhandene_duese_mm <= nutzbreite : null;
    const passendePakete = messungVorhanden ? packages.map(paket => ({
      ...paket,
      arbeitsbreiten_mm:[...paket.arbeitsbreiten_mm],
      passende_arbeitsbreiten_mm:paket.arbeitsbreiten_mm.filter(breite => breite <= nutzbreite),
    })).filter(paket => paket.passende_arbeitsbreiten_mm.length > 0) : [];
    const kaufvergleich = kauf_geplant && vorhandeneDuesePasst !== true && passendePakete.length > 0;
    let folgeschritt = 'vorhandenen_einwascher_oder_abzieher_pruefen';
    if (!messungVorhanden) folgeschritt = 'erst_lichte_breite_messen';
    else if (vorhandeneDuesePasst) folgeschritt = 'vorhandene_duese_zuerst_probesetzen';
    else if (kaufvergleich) folgeschritt = 'genaues_originalpaket_und_platzbedarf_pruefen';
    return {
      nutzbreite_mm:nutzbreite,
      vorhandene_duese_nominell_passend:vorhandeneDuesePasst,
      nominell_passende_originalpakete:passendePakete,
      folgeschritt,
      ...(kaufvergleich ? {entry_url:WINDOW_ENTRY_URL} : {}),
      quellen_geprueft_am:checked,
      hinweis:'Die Arbeitsbreite ergibt eine Vorauswahl für die gemessene Stelle. Vor einem Kauf die äußere Kopfbreite, Rahmenform, Zugrichtung und den tatsächlichen Lieferumfang des deutschen Originalpakets prüfen. Ein vorhandener Einwascher mit Abzieher kann für wenige Scheiben genügen.',
    };
  },
  example:{
    args:{lichte_breite_mm:170,spiel_pro_seite_mm:5,vorhandene_duese_mm:0,kauf_geplant:false},
    expect:{nutzbreite_mm:160,vorhandene_duese_nominell_passend:null,folgeschritt:'vorhandenen_einwascher_oder_abzieher_pruefen'},
  },
};
