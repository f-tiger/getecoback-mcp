const page = '/produkte.html';
const checked = '2026-11-20';
const manual = 'https://www.bosch-diy.com/storage/de-de/glassvac-100045834-original-pdf-396340-de-de.pdf';

const pick = (description, ...values) => ({type:'string', description, enum:values});
const flag = description => ({type:'boolean', description});
const evidence = description => pick(description, 'belegt', 'ausgeschlossen', 'offen');

function entry(name, description, properties, section, decide, args, expect) {
  return {
    name, description, page,
    properties:{
      paketkennung:pick('Bestellnummer aus den Unterlagen des tatsächlichen deutschen Angebots.','06008B7000','06008B7200','anders','offen'),
      handbuch_zugeordnet:flag('Die GlassVAC-Anleitung F 016 L81 778 ist dem tatsächlichen Gerät zugeordnet.'),
      ...properties,
    },
    calculate({paketkennung, handbuch_zugeordnet, ...inputs}) {
      if (paketkennung !== '06008B7000' || !handbuch_zugeordnet) {
        return {status:'modell_oder_handbuch_offen', beleg:null,
          hinweis:'Bestellnummer des Bundles und zutreffende Anleitung beim Gerät abgleichen.'};
      }
      return {...decide(inputs), beleg:{url:manual, fundstelle:section, geprueft_am:checked}};
    },
    example:{args:{paketkennung:'06008B7000', handbuch_zugeordnet:true, ...args}, expect},
  };
}

export const glassvacBelege = [
  entry('glassvac_aufnahme_glatte_nicht_poroese_flaeche',
    'Prüft, ob der Bosch GlassVAC Fenstersauger zur Wasseraufnahme auf der vorliegenden glatten oder porösen Fläche geeignet ist — Check documented liquid pickup and surface scope, including dry dust.',
    {
      flaeche:pick('Vorliegende Oberflächeneigenschaft.', 'glatt_nicht_poroes', 'poroes_oder_saugend', 'offen'),
      aufnahme:pick('Was soll abgesaugt werden?', 'wasser_kuehl_oder_zimmerwarm', 'trockener_staub', 'heisses_wasser', 'brennbare_fluessigkeit', 'offen'),
    }, 'S. 3–4, Benutzung und bestimmungsgemäßer Gebrauch', ({flaeche, aufnahme}) => {
      const ausgeschlossen = flaeche === 'poroes_oder_saugend' ||
        ['trockener_staub','heisses_wasser','brennbare_fluessigkeit'].includes(aufnahme);
      return {
        im_geprueften_einsatzbereich:ausgeschlossen ? false : flaeche === 'offen' || aufnahme === 'offen' ? null : true,
        hinweis:'Die Eignungsaussage bezieht sich auf kühles oder zimmerwarmes Wasser auf glatten, nicht porösen Flächen. Sie sagt nichts über eine Reinigungsleistung aus.',
      };
    }, {flaeche:'poroes_oder_saugend', aufnahme:'wasser_kuehl_oder_zimmerwarm'}, {im_geprueften_einsatzbereich:false}),

  entry('glassvac_kalt_lagern_einschalten_laden_getrennt',
    'Vergleicht die aktuell gemessene Umgebungstemperatur mit den Bedingungen für Lagerung, Einschalten und Aufladen des Bosch GlassVAC Sets. Frost vergangener Stunden ersetzt keine aktuelle Messung — Check current temperature against storage, startup and charging limits.',
    {umgebung_c:{type:'number', description:'Vor Ort gemessene Umgebungstemperatur in °C für den betreffenden Vorgang.', minimum:-70, maximum:100}},
    'S. 4–5, technische Daten und Fußnoten zur Umgebungstemperatur', ({umgebung_c}) => ({
      im_lagerbereich:umgebung_c >= -20 && umgebung_c <= 50,
      einschalten_im_temperaturbereich:umgebung_c >= -5 && umgebung_c <= 50,
      im_empfohlenen_ladebereich:umgebung_c >= 0 && umgebung_c <= 45,
      leistungsbeschraenkung_im_startbereich:umgebung_c >= -5 && umgebung_c < 0,
      hinweis:'Bei weniger als −5 °C das Gerät nicht einschalten. Die Ladeempfehlung bezieht sich auf die Umgebung und sagt nichts über Ladezustand oder Betriebssicherheit im Einzelfall aus.',
    }), {umgebung_c:-8}, {im_lagerbereich:true, einschalten_im_temperaturbereich:false, im_empfohlenen_ladebereich:false}),

  entry('glassvac_schmutzwassertank_spuelen_oeffnung_ablass',
    'Prüft die richtige Öffnung zum Einfüllen oder Ablassen von Spülwasser bei der Reinigung des GlassVAC Schmutzwassertanks — Distinguish rinse fill from drainage using the Bosch maintenance procedure.',
    {
      vorgang:pick('Geplanter Schritt der Tankpflege.', 'spuelwasser_einfuellen', 'spuelwasser_ablassen', 'offen'),
      oeffnung:pick('Welche Öffnung soll verwendet werden?', 'saugkopfoeffnung', 'ablassoeffnung', 'offen'),
      saugkopf_entfernt:evidence('Der Saugkopf wurde vor dem Einfüllen vom Hauptkörper abgenommen.'),
    }, 'S. 6, Wartung und Reinigung, Abb. J–K', ({vorgang, oeffnung, saugkopf_entfernt}) => {
      const einfuellen = vorgang === 'spuelwasser_einfuellen';
      const passendeOeffnung = vorgang === 'offen' ? null : einfuellen ? 'saugkopfoeffnung' : 'ablassoeffnung';
      let schrittBelegt = null;
      if (passendeOeffnung && oeffnung !== 'offen') {
        if (oeffnung !== passendeOeffnung || (einfuellen && saugkopf_entfernt === 'ausgeschlossen')) schrittBelegt = false;
        else if (!einfuellen || saugkopf_entfernt === 'belegt') schrittBelegt = true;
      }
      return {passende_oeffnung:passendeOeffnung, oeffnung_und_vorbereitung_passend:schrittBelegt,
        hinweis:'Zum Spülen sauberes warmes Wasser bis zur Max-Markierung einfüllen. Heißes oder kochendes Wasser und das Eintauchen des Geräts sind ausgeschlossen.'};
    }, {vorgang:'spuelwasser_einfuellen', oeffnung:'ablassoeffnung', saugkopf_entfernt:'belegt'},
    {passende_oeffnung:'saugkopfoeffnung', oeffnung_und_vorbereitung_passend:false}),

  entry('glassvac_streifen_auf_glas_wischblatt_sichtbefund',
    'Trennt echte Streifen auf der Scheibe, einen sichtbaren Wischblattschaden und kosmetische Linien am Kunststoff des Bosch GlassVAC — Distinguish a replacement indication from cosmetic marks.',
    {
      streifen_auf_glas:evidence('Nach dem Absaugen sind tatsächlich Streifen auf der Scheibe sichtbar.'),
      wischblatt_schaden:evidence('Ein funktionaler Wischblattschaden wie ein Riss wurde am Blatt festgestellt.'),
      kunststofflinien:evidence('Linien oder Flecken sind am Kunststoff des Kopfes zu sehen.'),
    }, 'S. 6, Fehlersuche und Pflege des Saugkopfs', ({streifen_auf_glas, wischblatt_schaden, kunststofflinien}) => {
      const ersatzBelegt = streifen_auf_glas === 'belegt' && wischblatt_schaden === 'belegt';
      const nurKosmetisch = streifen_auf_glas === 'ausgeschlossen' && wischblatt_schaden === 'ausgeschlossen' && kunststofflinien === 'belegt';
      return {ersatzhinweis_fuer_beobachteten_streifenfall:ersatzBelegt ? true : nurKosmetisch ? false : null,
        naechster_schritt:ersatzBelegt ? 'passendes_wischblatt_nach_artikelnummer_pruefen' : nurKosmetisch ? 'keine_ersatzentscheidung_aus_kosmetik' : 'blatt_und_andruck_getrennt_pruefen',
        hinweis:'Auch unpassender Anpressdruck kann Streifen verursachen. Streifen allein belegen weder die Druckrichtung noch ein defektes Blatt.'};
    }, {streifen_auf_glas:'ausgeschlossen', wischblatt_schaden:'ausgeschlossen', kunststofflinien:'belegt'},
    {ersatzhinweis_fuer_beobachteten_streifenfall:false, naechster_schritt:'keine_ersatzentscheidung_aus_kosmetik'}),

  entry('glassvac_spruehapplikator_tropft_montage_ursache',
    'Ordnet austretendes Wasser am GlassVAC Sprühapplikator oder am separaten Sauggerät dem passenden Prüfschritt zu — Check a loose spray-applicator assembly without assigning a suction-unit leak to it.',
    {
      austritt:pick('Wo tritt die Flüssigkeit nach Sichtprüfung aus?', 'spruehapplikatorkopf', 'sauggeraet', 'offen'),
      spruehkopf_sitzt_korrekt:evidence('Der Sprühkopf sitzt gemäß der Montageabbildung richtig.'),
    }, 'S. 5–6, Abb. E und Fehlersuche zu Wasseraustritt', ({austritt, spruehkopf_sitzt_korrekt}) => {
      const amSprueher = austritt === 'spruehapplikatorkopf';
      return {
        spruehkopf_montage_pruefen:amSprueher && spruehkopf_sitzt_korrekt !== 'belegt',
        naechster_schritt:amSprueher && spruehkopf_sitzt_korrekt !== 'belegt' ? 'spruehkopf_mit_abbildung_abgleichen' :
          austritt === 'offen' ? 'austrittsstelle_getrennt_feststellen' : 'geraet_bei_fortbestehendem_austritt_nicht_weiterbenutzen_und_service_fragen',
        hinweis:'Ein dokumentierter Montagehinweis für den Sprühapplikator belegt keine Ursache im Sauggerät. Das Gehäuse bleibt geschlossen.',
      };
    }, {austritt:'spruehapplikatorkopf', spruehkopf_sitzt_korrekt:'ausgeschlossen'},
    {spruehkopf_montage_pruefen:true, naechster_schritt:'spruehkopf_mit_abbildung_abgleichen'}),
];
