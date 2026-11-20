const guide = slug => `/guide/${slug}.html`;
const method = '/wie-wir-empfehlen.html';
const products = '/produkte.html';
const meter = '/strommess-protokoll.html';
const number = (description, minimum, maximum) => ({type: 'number', description, minimum, maximum});
const flag = description => ({type: 'boolean', description});
const choice = (description, ...values) => ({type: 'string', description, enum: values});
const count = (description, maximum = 10000) => number(description, 0, maximum);
const percent = description => number(description, 0, 100);
const signal = description => choice(description, 'belegt', 'ausgeschlossen', 'offen');
const round = value => Math.round(value * 100) / 100;

function whole(...counts) {
  if (!counts.every(Number.isInteger)) throw new RangeError('Diese Angaben müssen ganze Zahlen sein.');
}

function entry(name, description, page, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example: {args, expect}};
}

export const nachweispruefung = [
  entry('modellhandbuch_fertigungslos_geltungsgrenze',
    'Prüfe, ob eine Änderung der Bedienungsanleitung das dokumentierte Fertigungslos umfasst — Check whether a manual revision applies to the documented production batch',
    products, {
      modell_exakt: flag('Genaue Gerätevariante stimmt in Handbuch und Unterlagen überein'),
      los_position: count('Numerischer Losstand laut Hersteller innerhalb derselben geordneten Kennung', 100000000),
      ab_los_position: count('Untergrenze der Änderung innerhalb derselben Kennungsfolge', 100000000),
      bis_los_position: count('Obergrenze aus der ausdrücklich angegebenen Geltung', 100000000),
      losfolge_belegt: flag('Hersteller verwendet eine gemeinsame numerische Loskennungsfolge und nennt beide Grenzen ausdrücklich')
    }, ({modell_exakt, los_position, ab_los_position, bis_los_position, losfolge_belegt}) => {
      whole(los_position, ab_los_position, bis_los_position);
      if (bis_los_position < ab_los_position) throw new RangeError('Losgrenzen in der Herstellerangabe prüfen.');
      return {los_im_geltungsbereich: modell_exakt && losfolge_belegt ? los_position >= ab_los_position && los_position <= bis_los_position : null,
        grenze: 'Ein neuer Dokumentstand gilt nur für den ausdrücklich bestätigten Bereich. Keine Seriennummer oder andere persönliche Kennung eingeben.'};
    }, {modell_exakt: true, los_position: 118, ab_los_position: 120, bis_los_position: 135, losfolge_belegt: true},
    {los_im_geltungsbereich: false}),

  entry('anleitung_nachtrag_kapitel_uebernahme',
    'Entscheide, ob ein Nachtrag eine konkrete Anleitungsstelle ersetzt oder nur ergänzt — Decide whether a manual amendment supersedes a particular instruction',
    products, {
      variante_im_nachtrag: signal('Nachtrag nennt die gelieferte Variante einschließlich nötiger Modellendung'),
      sachstelle: choice('Im Nachtrag erkennbare Beziehung zum gesuchten Kapitel', 'ersetzt', 'ergaenzt', 'nicht_genannt', 'unklar'),
      anleitung_am_geraet_belegt: flag('Ursprüngliche Anleitung ist eindeutig der gelieferten Variante zugeordnet')
    }, ({variante_im_nachtrag, sachstelle, anleitung_am_geraet_belegt}) => {
      const status = variante_im_nachtrag === 'belegt' && sachstelle === 'ersetzt' ? 'nachtrag_fuer_dieses_kapitel'
        : variante_im_nachtrag === 'belegt' && sachstelle === 'ergaenzt' && anleitung_am_geraet_belegt ? 'beide_fundstellen_gemeinsam'
          : anleitung_am_geraet_belegt && (sachstelle === 'nicht_genannt' || variante_im_nachtrag === 'ausgeschlossen') ? 'gelieferte_anleitung'
            : 'herstellerzuordnung_offen';
      return {status, grenze: 'Ein ergänztes Kapitel hebt die übrige Anleitung nicht auf.'};
    }, {variante_im_nachtrag: 'belegt', sachstelle: 'ergaenzt', anleitung_am_geraet_belegt: true},
    {status: 'beide_fundstellen_gemeinsam'}),

  entry('vergleichstest_gewichtung_rangwechsel',
    'Prüfe, ob andere Prioritäten die Reihenfolge zweier belegter Testprofile drehen — Check whether a user weighting reverses two documented test profiles',
    method, {
      a_aufgabe: percent('Testpunkte A für Aufgabe auf einer gemeinsamen Skala von 0 bis 100'),
      a_pflege: percent('Testpunkte A für Pflege auf derselben Skala'),
      b_aufgabe: percent('Testpunkte B für dieselbe Aufgabe'),
      b_pflege: percent('Testpunkte B für denselben Pflegeaspekt'),
      gewicht_bericht: percent('Anteil der Aufgabe in der nachgewiesenen Testgewichtung in Prozent'),
      gewicht_eigen: percent('Eigener Aufgabenanteil für einen Vergleich in Prozent'),
      vergleichbare_teilnoten: flag('Beide Teilnoten stammen aus demselben Test oder nachweislich gleichem Verfahren, mehr Punkte ist jeweils besser')
    }, ({a_aufgabe, a_pflege, b_aufgabe, b_pflege, gewicht_bericht, gewicht_eigen, vergleichbare_teilnoten}) => {
      const differenz = gewicht => ((a_aufgabe - b_aufgabe) * gewicht + (a_pflege - b_pflege) * (100 - gewicht)) / 100;
      const bericht = differenz(gewicht_bericht);
      const eigen = differenz(gewicht_eigen);
      return {bericht_a_minus_b: vergleichbare_teilnoten ? round(bericht) : null,
        eigen_a_minus_b: vergleichbare_teilnoten ? round(eigen) : null,
        rangwechsel: vergleichbare_teilnoten ? bericht * eigen < 0 : null,
        grenze: 'Rechenvergleich für zwei veröffentlichte Kriterien. Keine eigene Testnote oder Prognose für jedes Angebot.'};
    }, {a_aufgabe: 90, a_pflege: 50, b_aufgabe: 70, b_pflege: 80, gewicht_bericht: 80, gewicht_eigen: 40, vergleichbare_teilnoten: true},
    {bericht_a_minus_b: 10, eigen_a_minus_b: -10, rangwechsel: true}),

  entry('vergleichstest_teilnoten_spannweite_luecke',
    'Grenze einen gewichteten Vergleich ein, wenn eine Teilnote fehlt — Bound a weighted test comparison when one component score is missing',
    method, {
      note_belegt: percent('Vorliegende Teilnote auf der vereinbarten Skala 0 bis 100'),
      gewicht_belegt: percent('Gewicht der vorliegenden Teilnote in Prozent'),
      volle_andere_note: percent('Gesamtnote des Vergleichsgeräts für dieselben beiden Kriterien'),
      skala_und_gewichte_belegt: flag('Beide Teilnoten sind auf 0 bis 100 begrenzt; Kriterien, Gewichtung und Modellabgleich bestätigt')
    }, ({note_belegt, gewicht_belegt, volle_andere_note, skala_und_gewichte_belegt}) => {
      const unten = note_belegt * gewicht_belegt / 100;
      const oben = unten + 100 - gewicht_belegt;
      const lage = volle_andere_note < unten ? 'a_liegt_sicher_hoeher'
        : volle_andere_note > oben ? 'b_liegt_sicher_hoeher' : 'reihenfolge_offen';
      return {moeglicher_punktebereich: skala_und_gewichte_belegt ? [round(unten), round(oben)] : null,
        lage: skala_und_gewichte_belegt ? lage : 'gewichtung_offen',
        grenze: 'Nur rechnerische Extremwerte der fehlenden Note. Kein Ersatz für den fehlenden Testwert.'};
    }, {note_belegt: 80, gewicht_belegt: 75, volle_andere_note: 70, skala_und_gewichte_belegt: true},
    {moeglicher_punktebereich: [60, 85], lage: 'reihenfolge_offen'}),

  entry('produkttest_replikation_einheiten_und_chargen',
    'Trenne wiederholte Testläufe von mehreren tatsächlich geprüften Geräten und Fertigungslosen — Distinguish repeat runs from tested units and production batches',
    method, {
      laeufe: count('Abgeschlossene Testläufe mit zugeordnetem Prüfgerät'),
      geraete: count('Zahl unterschiedlicher physischer Geräte mit mindestens einem Lauf'),
      lose: count('Zahl unterschiedlicher Fertigungslose unter den identifizierten Geräten'),
      lose_lueckenlos: flag('Alle Geräte sind einem dokumentierten Los zugeordnet')
    }, ({laeufe, geraete, lose, lose_lueckenlos}) => {
      whole(laeufe, geraete, lose);
      if (geraete > laeufe || lose > geraete || (lose_lueckenlos && geraete > 0 && lose === 0)) throw new RangeError('Belegmengen stimmen nicht überein.');
      return {zusatzlaeufe_an_denselben_geraeten: laeufe - geraete, getestete_geraete: geraete,
        mindestens_lose: lose, chargenuebergreifend_belegt: lose >= 2,
        grenzen_der_losabdeckung_offen: !lose_lueckenlos,
        grenze: 'Mehrere Testgeräte und Lose sind keine zufällige Stichprobe der Serie.'};
    }, {laeufe: 16, geraete: 3, lose: 2, lose_lueckenlos: false},
    {zusatzlaeufe_an_denselben_geraeten: 13, getestete_geraete: 3, chargenuebergreifend_belegt: true}),

  entry('vergleichstest_gleiche_prueflinge_querwert',
    'Prüfe, wie viele physische Prüfgeräte beide Teile eines kombinierten Testversprechens belegen — Count units with both parts of a combined performance claim',
    method, {
      geraete_gesamt: count('Unterschiedliche physische Geräte desselben Modells im betrachteten Bericht'),
      leistung_belegt: count('Davon Geräte mit beobachteter Leistungsmessung'),
      verbrauch_belegt: count('Davon Geräte mit klar zugeordneter Verbrauchsmessung'),
      beide_je_geraet: count('Davon Geräte, für die beide Messungen in passenden Betriebsbedingungen zugeordnet sind'),
      identitaet_nachvollziehbar: flag('Prüflingseinheiten und Messbedingungen beider Tabellen sind abgleichbar')
    }, ({geraete_gesamt, leistung_belegt, verbrauch_belegt, beide_je_geraet, identitaet_nachvollziehbar}) => {
      whole(geraete_gesamt, leistung_belegt, verbrauch_belegt, beide_je_geraet);
      if (Math.max(leistung_belegt, verbrauch_belegt) > geraete_gesamt || beide_je_geraet > Math.min(leistung_belegt, verbrauch_belegt)) {
        throw new RangeError('Gerätezahlen prüfen.');
      }
      return {kombination_belegte_geraete: identitaet_nachvollziehbar ? beide_je_geraet : null,
        quote_der_berichteten_geraete_prozent: identitaet_nachvollziehbar && geraete_gesamt ? round(100 * beide_je_geraet / geraete_gesamt) : null,
        grenze: 'Zwei Modelltabellen ohne gemeinsame Prüflingszuordnung erlauben keine gepaarte Aussage.'};
    }, {geraete_gesamt: 8, leistung_belegt: 5, verbrauch_belegt: 6, beide_je_geraet: 3, identitaet_nachvollziehbar: true},
    {kombination_belegte_geraete: 3, quote_der_berichteten_geraete_prozent: 37.5}),

  entry('vergleichstest_ziel_vorab_oder_nachtraeglich',
    'Unterscheide vorab definierte Vergleichskriterien von nachträglich ausgewählten Beobachtungen — Distinguish preregistered criteria from retrospectively selected observations',
    method, {
      kriterium_vor_lauf: signal('Kriterium steht in der vor Beginn datierten Methodik'),
      grenze_vor_lauf: signal('Grenzwert und Richtung des Kriteriums wurden dort vorab festgehalten'),
      identische_auswertung: signal('Stichprobe und Auswertung entsprechen der damaligen Festlegung')
    }, ({kriterium_vor_lauf, grenze_vor_lauf, identische_auswertung}) => {
      const teile = [kriterium_vor_lauf, grenze_vor_lauf, identische_auswertung];
      return {nachweisstatus: teile.every(x => x === 'belegt') ? 'vorab_definierter_vergleich'
        : teile.includes('ausgeschlossen') ? 'abweichung_explizit_ausweisen' : 'vorabfestlegung_ungeklaert',
        grenze: 'Vorab definierte Kriterien belegen weder eine repräsentative Auswahl noch die Eignung im eigenen Haushalt.'};
    }, {kriterium_vor_lauf: 'belegt', grenze_vor_lauf: 'ausgeschlossen', identische_auswertung: 'belegt'},
    {nachweisstatus: 'abweichung_explizit_ausweisen'}),

  entry('testvoraussetzung_inklusive_und_exklusive_mengen',
    'Prüfe, ob zwei Verbrauchszahlen dieselben Bestandteile eines Testlaufs enthalten — Reconcile consumption figures with different test boundaries',
    meter, {
      wert_a_kwh: number('Dokumentierter Gesamtwert A in kWh', 0, 100000),
      wert_b_kwh: number('Dokumentierter Gesamtwert B in kWh', 0, 100000),
      nur_a_teil_kwh: number('Belastbar erfasster Bestandteil in A außerhalb des gemeinsamen Umfangs', 0, 100000),
      nur_b_teil_kwh: number('Belastbar erfasster Bestandteil in B außerhalb des gemeinsamen Umfangs', 0, 100000),
      abgrenzung_und_gleiche_aufgabe: flag('Ein- und Ausschlüsse sind vollständig gemessen und die gemeinsame Aufgabe stimmt überein')
    }, ({wert_a_kwh, wert_b_kwh, nur_a_teil_kwh, nur_b_teil_kwh, abgrenzung_und_gleiche_aufgabe}) => {
      if (nur_a_teil_kwh > wert_a_kwh || nur_b_teil_kwh > wert_b_kwh) throw new RangeError('Teilenergie übersteigt Gesamtwert.');
      const a = wert_a_kwh - nur_a_teil_kwh;
      const b = wert_b_kwh - nur_b_teil_kwh;
      return {vergleichsgrundlage_kwh: abgrenzung_und_gleiche_aufgabe ? [round(a), round(b)] : null,
        b_minus_a_gleicher_umfang_kwh: abgrenzung_und_gleiche_aufgabe ? round(b - a) : null,
        grenze: 'Nur separat erfasste Bestandteile abziehen. Keine Gleichsetzung von Labelwerten mit Haushaltsmessungen.'};
    }, {wert_a_kwh: 1.6, wert_b_kwh: 1.4, nur_a_teil_kwh: 0.4, nur_b_teil_kwh: 0.1, abgrenzung_und_gleiche_aufgabe: true},
    {vergleichsgrundlage_kwh: [1.2, 1.3], b_minus_a_gleicher_umfang_kwh: 0.1}),

  entry('verbrauchstest_zielmenge_unterdeckung',
    'Prüfe, ob ein niedriger Energieverbrauch nur durch weniger erledigte Nutzmenge entstanden sein kann — Check whether a lower energy figure reflects lower delivered quantity',
    '/geraete-austausch-rechner.html', {
      a_kwh: number('Für A gemessene Energie in kWh', 0, 10000),
      b_kwh: number('Für B gemessene Energie in kWh', 0, 10000),
      a_nutzmenge: number('Bei A vollständig erledigte Nutzmenge in einer gemeinsamen Einheit', 0.1, 10000),
      b_nutzmenge: number('Bei B vollständig erledigte Nutzmenge in derselben Einheit', 0.1, 10000),
      vergleichbares_ergebnis: flag('Qualität und Definition der erledigten Nutzmenge sind gleich')
    }, ({a_kwh, b_kwh, a_nutzmenge, b_nutzmenge, vergleichbares_ergebnis}) => {
      const delta_total = b_kwh - a_kwh;
      const delta_pro_einheit = b_kwh / b_nutzmenge - a_kwh / a_nutzmenge;
      return {b_minus_a_kwh: round(delta_total), b_minus_a_kwh_pro_einheit: vergleichbares_ergebnis ? round(delta_pro_einheit) : null,
        richtung_kehrt_sich_um: vergleichbares_ergebnis ? delta_total * delta_pro_einheit < 0 : null,
        grenze: 'Verhältnis für die beobachteten Testmengen. Keine lineare Hochrechnung auf volle Beladung oder einen anderen Modus.'};
    }, {a_kwh: 0.9, b_kwh: 0.8, a_nutzmenge: 6, b_nutzmenge: 4, vergleichbares_ergebnis: true},
    {b_minus_a_kwh: -0.1, b_minus_a_kwh_pro_einheit: 0.05, richtung_kehrt_sich_um: true}),

  entry('vergleichstest_typischer_wert_quantilangabe',
    'Prüfe, welcher Aussageumfang hinter einem als typisch beworbenen Testwert steht — Verify the rank and coverage behind a reported typical test value',
    method, {
      kennzahl: choice('In der Testmethodik ausdrücklich genannte Kennzahl', 'mittelwert', 'median', 'p90', 'einzelwert', 'offen'),
      geordnete_beobachtungen: count('Zahl vollständiger, passend abgegrenzter Beobachtungen'),
      rang_unter_oder_gleich: count('Zahl der Beobachtungen unter oder gleich dem veröffentlichten Wert'),
      gleicher_auswertungsumfang: flag('Bericht und Rangzählung verwenden nachweisbar dieselben Beobachtungen')
    }, ({kennzahl, geordnete_beobachtungen, rang_unter_oder_gleich, gleicher_auswertungsumfang}) => {
      whole(geordnete_beobachtungen, rang_unter_oder_gleich);
      if (rang_unter_oder_gleich > geordnete_beobachtungen) throw new RangeError('Beobachtungszahlen stimmen nicht überein.');
      const quote = gleicher_auswertungsumfang && geordnete_beobachtungen
        ? round(100 * rang_unter_oder_gleich / geordnete_beobachtungen) : null;
      return {ausgewiesene_kennzahl: kennzahl, empirisch_bis_zu_diesem_wert_prozent: quote,
        grenze: 'Empirischer Anteil im belegten Datensatz. Vor allem bei Gleichständen und kleinen Stichproben folgt daraus keine Überschreitungswahrscheinlichkeit für andere Geräte.'};
    }, {kennzahl: 'mittelwert', geordnete_beobachtungen: 25, rang_unter_oder_gleich: 16, gleicher_auswertungsumfang: true},
    {ausgewiesene_kennzahl: 'mittelwert', empirisch_bis_zu_diesem_wert_prozent: 64}),

  entry('datenvergleich_punktschaetzung_aufgerundete_klasse',
    'Bestimme, wie viele Planungspunkte eines Datensatzes oberhalb einer belegten Gerätegrenze liegen — Count which published planning cases exceed a documented equipment limit',
    '/daten.html', {
      fall_a: number('Planungswert für Fall A in gemeinsamer Einheit', 0, 100000),
      fall_b: number('Planungswert für Fall B in derselben Einheit', 0, 100000),
      fall_c: number('Planungswert für Fall C in derselben Einheit', 0, 100000),
      leistung_grenze: number('Belegte Leistung des genauen Gerätebetriebs in derselben Einheit', 0, 100000),
      grundlagen_abgeglichen: flag('Einheit und Betriebsart sind abgeglichen. Die Planungspunkte sind keine beobachteten Messwerte.')
    }, ({fall_a, fall_b, fall_c, leistung_grenze, grundlagen_abgeglichen}) => {
      const faelle = {a: fall_a, b: fall_b, c: fall_c};
      return {oberhalb_der_angabe: grundlagen_abgeglichen ? Object.keys(faelle).filter(key => faelle[key] > leistung_grenze) : null,
        gleichstand: grundlagen_abgeglichen ? Object.keys(faelle).filter(key => faelle[key] === leistung_grenze) : null,
        grenze: 'Nur Vorauswahl per Faustregel. Der Abgleich belegt keine Eignung für reale Räume.'};
    }, {fall_a: 6500, fall_b: 9500, fall_c: 7000, leistung_grenze: 7000, grundlagen_abgeglichen: true},
    {oberhalb_der_angabe: ['b'], gleichstand: ['c']}),

  entry('ersatzteil_nachfolger_rueckrichtung_passbereich',
    'Trenne den belegten Nachfolger eines Ersatzteils von einer nicht belegten Rückrichtung — Check the documented direction of a replacement part succession',
    '/ersatzfilter.html', {
      artikel_und_geraet_bestaetigt: flag('Beide Artikelnummern und die konkrete Gerätevariante sind in der Fundstelle eindeutig'),
      nachfolger_fuer_alt: signal('Hersteller nennt das neue Teil ausdrücklich als Ersatz für eine alte Ausführung'),
      alt_fuer_neues_geraet: signal('Hersteller nennt das alte Teil ausdrücklich für das neuere Gerät'),
      pruefrichtung: choice('Welche Einbaurichtung wird benötigt?', 'neuteil_im_altgeraet', 'altteil_im_neugeraet')
    }, ({artikel_und_geraet_bestaetigt, nachfolger_fuer_alt, alt_fuer_neues_geraet, pruefrichtung}) => ({
      nachweis_fuer_diese_richtung: !artikel_und_geraet_bestaetigt ? 'offen'
        : pruefrichtung === 'neuteil_im_altgeraet' ? nachfolger_fuer_alt : alt_fuer_neues_geraet,
      grenze: 'Die ausdrückliche Nachfolgebeziehung begründet keine gegenseitige Kompatibilität.'
    }), {artikel_und_geraet_bestaetigt: true, nachfolger_fuer_alt: 'belegt', alt_fuer_neues_geraet: 'offen', pruefrichtung: 'altteil_im_neugeraet'},
    {nachweis_fuer_diese_richtung: 'offen'}),

  entry('ersatzteil_teilerfolg_vor_komplettmeldung',
    'Trenne die dokumentierte Montage eines Ersatzteils vom wiederhergestellten Gebrauch — Separate proof of part installation from restored operation',
    products, {
      genaue_teilenummer: flag('Ersatzteil ist über die Herstellerunterlage dem Gerät zugeordnet'),
      montage_notiert: flag('Einbau des passenden Teils im Protokoll notiert'),
      beobachtung_vorher: choice('Bisheriger beobachteter Zustand', 'funktion_ausgefallen', 'funktion_schwach', 'offen'),
      vergleichbarer_nachtest: choice('Funktion nach Einbau im gleichen vorgesehenen Modus', 'wieder_brauchbar', 'weiter_auffaellig', 'offen')
    }, ({genaue_teilenummer, montage_notiert, beobachtung_vorher, vergleichbarer_nachtest}) => ({
      montage_dokumentiert: genaue_teilenummer && montage_notiert,
      zweck_wieder_beobachtet: beobachtung_vorher !== 'offen' && vergleichbarer_nachtest === 'wieder_brauchbar',
      grenze: 'Eine sichtbare Montage ist keine Funktionsmessung. Die Beobachtung gilt nur für die protokollierte Aufgabe.'
    }), {genaue_teilenummer: true, montage_notiert: true, beobachtung_vorher: 'funktion_schwach', vergleichbarer_nachtest: 'offen'},
    {montage_dokumentiert: true, zweck_wieder_beobachtet: false}),

  entry('geraetemessung_originaldatei_teilzitat_abdeckung',
    'Prüfe, welchen Teil eines Originalzeitraums ein weitergereichter Messauszug belegt — Check how much of the original time span a forwarded measurement excerpt covers',
    meter, {
      original_start_min: count('Beginn des ursprünglichen Protokolls ab gemeinsamer Zeitbasis'),
      original_ende_min: count('Ende des ursprünglichen Protokolls ab gemeinsamer Zeitbasis'),
      auszug_start_min: count('Erster Zeitstempel des weitergegebenen Auszugs'),
      auszug_ende_min: count('Letzter Zeitstempel des Auszugs'),
      identische_originalversion: flag('Auszug ist eindeutig demselben unveränderten Export zugeordnet')
    }, ({original_start_min, original_ende_min, auszug_start_min, auszug_ende_min, identische_originalversion}) => {
      if (original_ende_min <= original_start_min || auszug_ende_min < auszug_start_min) throw new RangeError('Zeitgrenzen prüfen.');
      const innerhalb = auszug_start_min >= original_start_min && auszug_ende_min <= original_ende_min;
      return {auszug_am_original_verankerbar: identische_originalversion && innerhalb,
        umspannter_originalanteil_prozent: identische_originalversion && innerhalb
          ? round(100 * (auszug_ende_min - auszug_start_min) / (original_ende_min - original_start_min)) : null,
        grenze: 'Ein Auszug zwischen zwei Zeitstempeln belegt keine durchgehend vorhandenen Zwischenmessungen.'};
    }, {original_start_min: 50, original_ende_min: 290, auszug_start_min: 110, auszug_ende_min: 170, identische_originalversion: true},
    {auszug_am_original_verankerbar: true, umspannter_originalanteil_prozent: 25}),

  entry('dampfreiniger_sc2_maximaldruck_dauermessung',
    'Unterscheide beim SC 2 EasyFix maximalen Dampfdruck und den belegten Druck bei einer Arbeitsstufe — Separate maximum steam pressure from a documented SC 2 operating measurement',
    products, {
      artikel_15126000: flag('SC 2 EasyFix mit Händlerreferenz 1.512-600.0 eindeutig identifiziert'),
      leistungsangabe: choice('Art der vorliegenden Druckangabe', 'maximalwert', 'messwert_arbeitsstufe', 'offen'),
      angabe_bar: number('Gefundener Druckwert in bar', 0, 15),
      gleiche_stufe_und_protokoll: flag('Messstelle, Stufe und beobachtete Dauer des Arbeitsvorgangs sind belegt')
    }, ({artikel_15126000, leistungsangabe, angabe_bar, gleiche_stufe_und_protokoll}) => ({
      dokumentierter_maximaldruck_bar: artikel_15126000 ? 3.2 : null,
      arbeitswert_bar: artikel_15126000 && leistungsangabe === 'messwert_arbeitsstufe' && gleiche_stufe_und_protokoll ? angabe_bar : null,
      grenze: 'Die Seite nennt 3,2 bar maximal für dieses Modell. Ein Maximalwert sagt nichts über den Arbeitsdruck am Zubehör oder den Reinigungsnutzen.'
    }), {artikel_15126000: true, leistungsangabe: 'maximalwert', angabe_bar: 3.2, gleiche_stufe_und_protokoll: true},
    {dokumentierter_maximaldruck_bar: 3.2, arbeitswert_bar: null}),

  entry('dampfreiniger_sc3_nachfuellen_arbeitszeit_beleg',
    'Trenne die belegte Nachfüllmöglichkeit des SC 3 EasyFix von tatsächlich beobachteter Arbeitszeit — Separate the SC 3 refill feature from measured working time',
    products, {
      artikel_15136500: flag('SC 3 EasyFix in der Ausführung 1.513-650.0 bestätigt'),
      durchgang_min: number('Gesamtdauer eines eigenen vollständig protokollierten Durchgangs', 0, 1440),
      startphase_min: number('Davon Minuten vor Beginn der Reinigungsaufgabe', 0, 1440),
      nachfuellen_min: number('Weitere Minuten mit Nachfüllen, in denen die Aufgabe stillstand', 0, 1440),
      vollstaendig_protokolliert: flag('Die beiden Teilzeiten sind ohne Überschneidung erfasst und andere Pausen sind ausgeschlossen')
    }, ({artikel_15136500, durchgang_min, startphase_min, nachfuellen_min, vollstaendig_protokolliert}) => {
      const arbeitszeit = durchgang_min - startphase_min - nachfuellen_min;
      if (arbeitszeit < -1e-10) throw new RangeError('Stillstandszeit übersteigt die Durchgangsdauer.');
      return {nachfuellbarer_tank_dokumentiert: artikel_15136500 ? true : null,
        aufgabenzeit_aus_protokoll_min: vollstaendig_protokolliert ? round(Math.max(0, arbeitszeit)) : null,
        grenze: 'Die Herstellerangabe zum wiederbefüllbaren Tank belegt keine Nachfüllzeit von null Minuten.'};
    }, {artikel_15136500: true, durchgang_min: 25, startphase_min: 1, nachfuellen_min: 2, vollstaendig_protokolliert: true},
    {nachfuellbarer_tank_dokumentiert: true, aufgabenzeit_aus_protokoll_min: 22}),

  entry('glassvac_set_saugkoepfe_nachweis_offene_position',
    'Prüfe anhand zweier gelieferter Köpfe, ob der nachgewiesene GlassVAC-Lieferumfang vollständig ist — Audit the two nozzle roles in a confirmed GlassVAC set',
    products, {
      paketkennung: choice('Bosch-Paketkennung des konkreten Geräts', '06008B7000', '06008B7200', 'offen'),
      grosser_kopf: signal('Großer Saugkopf liegt laut Sichtkontrolle vor'),
      kleiner_kopf: signal('Kleiner Saugkopf liegt laut Sichtkontrolle vor')
    }, ({paketkennung, grosser_kopf, kleiner_kopf}) => {
      const koepfe = {gross: grosser_kopf, klein: kleiner_kopf};
      return {abgleich_mit_zwei_koepfen: paketkennung === '06008B7000',
        fehlende_koepfe: paketkennung === '06008B7000' ? Object.keys(koepfe).filter(key => koepfe[key] === 'ausgeschlossen') : null,
        ungepruefte_koepfe: paketkennung === '06008B7000' ? Object.keys(koepfe).filter(key => koepfe[key] === 'offen') : null,
        grenze: 'Das Set 06008B7000 nennt zwei Köpfe. Diesen Lieferumfang nicht vom Set auf Solo Plus 06008B7200 übertragen.'};
    }, {paketkennung: '06008B7000', grosser_kopf: 'belegt', kleiner_kopf: 'offen'},
    {abgleich_mit_zwei_koepfen: true, fehlende_koepfe: [], ungepruefte_koepfe: ['klein']}),

  entry('fenstersauger_wv3_enge_felder_duesenreserve',
    'Prüfe beim WV 3 Comfort Precision+, welche bestätigte Düse in zwei freie Glasbreiten passt — Match confirmed WV 3 nozzle widths to two measured glass openings',
    products, {
      paket_16336980: flag('Exakte Paketkennung 1.633-698.0 ist belegt'),
      schmale_duese_vorhanden: flag('Die dokumentierte 170-mm-Düse ist im konkreten Angebot bestätigt'),
      glas_a_mm: number('Engste freie Breite von Glasfeld A, nach Abzug der Messreserve', 1, 3000),
      glas_b_mm: number('Engste freie Breite von Glasfeld B, nach Abzug der Messreserve', 1, 3000)
    }, ({paket_16336980, schmale_duese_vorhanden, glas_a_mm, glas_b_mm}) => {
      const wahl = breite => breite >= 280 ? '280_mm' : breite >= 170 && schmale_duese_vorhanden ? '170_mm' : null;
      return {breiteste_geometrisch_passende_duese: paket_16336980 ? {a: wahl(glas_a_mm), b: wahl(glas_b_mm)} : null,
        grenze: 'Geometrische Vorauswahl aus Herstellermaßen. Rahmenform und Handhabung separat prüfen.'};
    }, {paket_16336980: true, schmale_duese_vorhanden: true, glas_a_mm: 190, glas_b_mm: 300},
    {breiteste_geometrisch_passende_duese: {a: '170_mm', b: '280_mm'}}),

  entry('fenstersauger_wv8_herstellergrenzen_doppelengpass',
    'Prüfe Laufzeit und Tankvolumen des WV 8 Signature Line gegen einen vollständig gemessenen Durchgang — Check which documented WV 8 limit binds for a measured task',
    products, {
      variante_16337850: flag('WV 8 Signature Line, Artikel 1.633-785.0 bestätigt'),
      aktive_zeit_min: number('Aus einem vergleichbaren Versuch benötigte aktive Minuten', 0, 300),
      gesammeltes_wasser_ml: number('Im vergleichbaren Versuch aufgefangene Wassermenge', 0, 3000),
      ohne_pause_geplant: flag('Die Aufgabe soll in einer einzigen Akku- und Tankphase abgeschlossen werden')
    }, ({variante_16337850, aktive_zeit_min, gesammeltes_wasser_ml, ohne_pause_geplant}) => {
      const ueberschritten = [aktive_zeit_min > 55 && 'hersteller_laufzeit', gesammeltes_wasser_ml > 150 && 'tankvolumen'].filter(Boolean);
      return {ueberschrittene_nennwerte: variante_16337850 && ohne_pause_geplant ? ueberschritten : null,
        grenze: 'Bis zu 55 Minuten und 150 ml sind getrennte Herstellerwerte. Unter beiden Werten zu liegen belegt keinen unterbrechungsfreien Lauf.'};
    }, {variante_16337850: true, aktive_zeit_min: 40, gesammeltes_wasser_ml: 220, ohne_pause_geplant: true},
    {ueberschrittene_nennwerte: ['tankvolumen']}),

  entry('kaercher_wd418_laufzeit_testakku_scope',
    'Prüfe, ob die publizierte WD-4-18-Laufzeit auf den nachgewiesenen Akkusatz bezogen ist — Verify the documented WD 4-18 runtime battery configuration',
    products, {
      set_16286010: flag('Dokumentiertes Set 1.628-601.0 mit genauer Variantenkennung bestätigt'),
      akku_a_ah: number('Aufgedruckte Kapazität des ersten bestätigten kompatiblen Akkus in Ah', 0.1, 30),
      akku_b_ah: number('Aufgedruckte Kapazität des zweiten bestätigten kompatiblen Akkus in Ah', 0.1, 30),
      kompatibler_satz_belegt: flag('Zwei kompatible 18-V-Akkus im konkreten Paket bestätigt'),
      eigener_bedarf_min: number('Benötigte aktive Minuten für die eigene Aufgabe', 0, 1440)
    }, ({set_16286010, akku_a_ah, akku_b_ah, kompatibler_satz_belegt, eigener_bedarf_min}) => {
      const basis = set_16286010 && kompatibler_satz_belegt && akku_a_ah === 5 && akku_b_ah === 5;
      return {herstellerbasis_akku_bestaetigt: basis,
        bedarf_minus_richtwert_min: basis ? round(eigener_bedarf_min - 28) : null,
        grenze: 'Rund 28 Minuten nennt der Hersteller mit zwei 5,0-Ah-Akkus. Laufzeit nicht aus der Summe anderer Kapazitäten hochrechnen.'};
    }, {set_16286010: true, akku_a_ah: 5, akku_b_ah: 4, kompatibler_satz_belegt: true, eigener_bedarf_min: 31},
    {herstellerbasis_akku_bestaetigt: false, bedarf_minus_richtwert_min: null}),

  entry('nass_trockensauger_wd3_anleitung_filterwechselpunkt',
    'Ermittle, ob zum Einsatzwechsel am WD 3 ein belegter Filter- und Beutelzustand gehört — Audit filter and bag documentation for a WD 3 use transition',
    products, {
      wd3_referenz: flag('Typenschild und Anleitung nennen WD 3 V-17/4/20, 1.628-130.0'),
      richtung: choice('Richtung des dokumentierten Aufgabenwechsels', 'trocken_zu_nass', 'nass_zu_trocken'),
      patronenfilter_vorgabe: signal('Die tatsächlich vorhandene Filterkonfiguration passt zum Zielmodus laut Anleitung'),
      beutel_vorgabe: signal('Vorhandener oder entfernter Beutel entspricht für den Zielmodus der Anleitung')
    }, ({wd3_referenz, richtung, patronenfilter_vorgabe, beutel_vorgabe}) => {
      const offen = wd3_referenz ? [patronenfilter_vorgabe !== 'belegt' && 'filter', beutel_vorgabe !== 'belegt' && 'beutel'].filter(Boolean)
        : ['passende_modellanleitung'];
      return {zielmodus: richtung === 'trocken_zu_nass' ? 'nass' : 'trocken', offene_abgleiche: offen,
        grenze: 'Die Teileliste belegt keine Konfiguration. Filter- und Beutelvorgaben der Anleitung für die konkrete Aufgabe gelten.'};
    }, {wd3_referenz: true, richtung: 'trocken_zu_nass', patronenfilter_vorgabe: 'belegt', beutel_vorgabe: 'offen'},
    {zielmodus: 'nass', offene_abgleiche: ['beutel']}),

  entry('bosch_wth83v03_ablaufschlauch_nein_bezug',
    'Unterscheide beim WTH83V03 fehlenden Lieferumfang und nachgewiesene Anschlussmöglichkeit — Distinguish an omitted drain hose from documented drain capability',
    products, {
      wth83v03_bestaetigt: flag('Exakte Bosch-Referenz WTH83V03 am konkreten Angebot bestätigt'),
      haendler_nennt_zusatzschlauch: signal('Aktuelles Angebot führt den Ablaufschlauch als zusätzlich enthalten'),
      anschluss_modellanleitung: signal('Passende Geräteanleitung bestätigt den tatsächlich gewünschten Ablaufschlaucheinsatz'),
      ziel_ohne_tank: flag('Eigene Nutzung setzt den Schlauch statt Tankentleerung voraus')
    }, ({wth83v03_bestaetigt, haendler_nennt_zusatzschlauch, anschluss_modellanleitung, ziel_ohne_tank}) => ({
      originalpaket_schlauch: wth83v03_bestaetigt ? 'nicht_aufgefuehrt' : 'offen',
      kaufbedingung_abgedeckt: !ziel_ohne_tank ? null : wth83v03_bestaetigt && anschluss_modellanleitung === 'belegt' && haendler_nennt_zusatzschlauch === 'belegt',
      grenze: 'Die geprüfte Ausstattungsseite führt den Schlauch mit Nein. Diese Paketangabe entscheidet keine Anschlussfrage.'
    }), {wth83v03_bestaetigt: true, haendler_nennt_zusatzschlauch: 'belegt', anschluss_modellanleitung: 'offen', ziel_ohne_tank: true},
    {originalpaket_schlauch: 'nicht_aufgefuehrt', kaufbedingung_abgedeckt: false}),

  entry('trockner_wqg241001_programmlimit_statt_nennladung',
    'Vergleiche die eigene Trockenladung mit der belegten Grenze des gewählten Programms — Compare the actual load with the documented cycle limit',
    products, {
      wqg241001: flag('Exakte Trocknerreferenz WQG241001 bestätigt'),
      ladung_kg: number('Tatsächliche Ladung in kg, nach Definition der Programmangabe', 0, 40),
      grenze_programm_kg: number('Zulässige Last im gewählten Programm, 0 wenn nicht belegt', 0, 20),
      gleiche_programmkennung: flag('Dokumentation nennt bei derselben Variante das vorgesehene Programm ausdrücklich')
    }, ({wqg241001, ladung_kg, grenze_programm_kg, gleiche_programmkennung}) => {
      if (wqg241001 && gleiche_programmkennung && grenze_programm_kg > 9) throw new RangeError('Programmlimit und Gerätenennlast abgleichen.');
      return {maximale_geraeteangabe_kg: wqg241001 ? 9 : null,
        programmreserve_kg: wqg241001 && gleiche_programmkennung && grenze_programm_kg > 0 ? round(grenze_programm_kg - ladung_kg) : null,
        grenze: 'Gerätenennlast und Programmgrenze sind zwei verschiedene Werte. Pflege und Textilfreigabe separat beachten.'};
    }, {wqg241001: true, ladung_kg: 5.5, grenze_programm_kg: 4, gleiche_programmkennung: true},
    {maximale_geraeteangabe_kg: 9, programmreserve_kg: -1.5}),

  entry('braun_wk3000_45sekunden_pruefmenge_bezug',
    'Prüfe, ob die Braun-Angabe von 45 Sekunden zur eigenen gemessenen Wassermenge passt — Scope the Braun 45-second claim to its documented water quantity',
    products, {
      wk3000bk: flag('Braun PurEase WK 3000 BK mit Referenz WK304AI-WK3000BK bestätigt'),
      versuch_ml: number('Bei der eigenen Messung tatsächlich aufgeheizte Wassermenge', 1, 5000),
      versuch_s: number('Beobachtete Sekunden bis zum gewählten Ende', 0, 3600),
      gleiche_messbedingung: flag('Anfangstemperatur, Messstart und Ende sind nach Vorgabe ausreichend vergleichbar')
    }, ({wk3000bk, versuch_ml, versuch_s, gleiche_messbedingung}) => ({
      hersteller_bezugsmenge_ml: wk3000bk ? 200 : null,
      sekunden_abstand_zur_angabe: wk3000bk && versuch_ml === 200 && gleiche_messbedingung ? round(versuch_s - 45) : null,
      grenze: '45 Sekunden beziehen sich auf 200 ml. Für andere Mengen und Ausgangstemperaturen keine Hochrechnung aus der Werbeangabe.'
    }), {wk3000bk: true, versuch_ml: 200, versuch_s: 49, gleiche_messbedingung: true},
    {hersteller_bezugsmenge_ml: 200, sekunden_abstand_zur_angabe: 4}),

  entry('tfa_305055_komfortstatus_rohdaten_getrennt',
    'Erhalte beim TFA 30.5055.01 die Feuchterohwerte, wenn Komfortmodi wechseln — Preserve raw humidity comparison when the TFA comfort mode changes',
    products, {
      modell_30505501: flag('Dasselbe Gerät 30.5055.01 für beide Ablesungen eindeutig dokumentiert'),
      modus_a: choice('Erster Komfortmodus', 'raumklima', 'musikinstrumente', 'schildkroete', 'humidor', 'offen'),
      modus_b: choice('Zweiter Komfortmodus', 'raumklima', 'musikinstrumente', 'schildkroete', 'humidor', 'offen'),
      rh_a: percent('Feuchteanzeige der ersten Ablesung in Prozent'),
      rh_b: percent('Feuchteanzeige der zweiten Ablesung in Prozent'),
      ort_und_temperatur_passend: flag('Messort, Zeitbezug und Temperaturvergleich sind dokumentiert')
    }, ({modell_30505501, modus_a, modus_b, rh_a, rh_b, ort_und_temperatur_passend}) => ({
      komfortbewertung_gleicher_modus: modell_30505501 && modus_a === modus_b && modus_a !== 'offen',
      rohe_anzeigedifferenz_pp: modell_30505501 && ort_und_temperatur_passend ? round(rh_b - rh_a) : null,
      grenze: 'Die Modi bewerten unterschiedlich. Eine Komfortanzeige belegt keine Ursache oder Freigabe für andere Einsatzgebiete.'
    }), {modell_30505501: true, modus_a: 'raumklima', modus_b: 'humidor', rh_a: 54, rh_b: 57, ort_und_temperatur_passend: true},
    {komfortbewertung_gleicher_modus: false, rohe_anzeigedifferenz_pp: 3}),

  entry('roger_little_textil_und_dualfilter_pflegebeleg',
    'Weise beim Roger little den gefundenen Waschhinweis dem richtigen Filterteil zu — Assign a Roger little wash instruction to the correct filter component',
    products, {
      roger_little_r015: flag('Roger little weiß R-015 mit deutscher Produktunterlage bestätigt'),
      waschhinweis_fundstelle: choice('Filterteil, das der gefundene Hinweis ausdrücklich nennt', 'textiler_vorfilter', 'dualfilter', 'ganzer_satz_ohne_teil', 'offen'),
      geplanter_pflegeschritt: choice('Zu pflegender Bestandteil', 'textiler_vorfilter', 'dualfilter', 'beide')
    }, ({roger_little_r015, waschhinweis_fundstelle, geplanter_pflegeschritt}) => ({
      waschbeleg_klar_zugeordnet: roger_little_r015 && waschhinweis_fundstelle === 'textiler_vorfilter' && geplanter_pflegeschritt === 'textiler_vorfilter',
      dokumentiertes_waschbares_teil: roger_little_r015 ? 'textiler_vorfilter' : null,
      grenze: 'Der belegte Vorfilterhinweis gilt nicht für den HEPA-/Aktivkohle-Dual-Filter. Die genaue Teileanleitung lesen.'
    }), {roger_little_r015: true, waschhinweis_fundstelle: 'textiler_vorfilter', geplanter_pflegeschritt: 'beide'},
    {waschbeleg_klar_zugeordnet: false, dokumentiertes_waschbares_teil: 'textiler_vorfilter'}),

  entry('bosch_air4000i_fernfunktion_quellen_schnitt',
    'Entscheide, ob eine App-Funktionsangabe für das angebotene Bosch-Air-Modell überhaupt zugeordnet ist — Determine whether a Bosch Air app feature is documented for the offered variant',
    products, {
      geraet: choice('Vollständige Produktidentifikation', 'air_4000_7733701943', 'air_4000i', 'offen'),
      quellenvariante: choice('Modell auf der Fundstelle zur App-Funktion', 'air_4000', 'air_4000i', 'offen'),
      app_funktion_explizit: signal('Genau die vorgesehene Funktion wird beschrieben, nicht nur ein App-Logo'),
      angebot_kennung_geprueft: flag('Modellkennung im Angebot ist vollständig geprüft')
    }, ({geraet, quellenvariante, app_funktion_explizit, angebot_kennung_geprueft}) => {
      const passende_quelle = {air_4000_7733701943: 'air_4000', air_4000i: 'air_4000i'}[geraet];
      const status = !angebot_kennung_geprueft || !passende_quelle ? 'angebot_offen'
        : quellenvariante === 'offen' ? 'fundstelle_offen'
          : passende_quelle !== quellenvariante ? 'andere_modellvariante' : app_funktion_explizit;
      return {status, grenze: 'Das dokumentierte Air 4000 erhält keine Internetfunktionen allein durch die Ähnlichkeit mit Air 4000i.'};
    }, {geraet: 'air_4000_7733701943', quellenvariante: 'air_4000i', app_funktion_explizit: 'belegt', angebot_kennung_geprueft: true},
    {status: 'andere_modellvariante'}),

  entry('stadler_peter_p018_stufenvergleich_altangebot',
    'Erkenne bei einem alten Peter-Angebot eine widersprüchliche Stufenzahl gegenüber der aktuellen P-018-Quelle — Spot a fan speed-count mismatch against the current P-018 listing',
    products, {
      typ: choice('Auf Gerät oder Modellunterlage bestätigter Typ', 'p018', 'p015', 'offen'),
      messquelle: choice('Woher stammt die Stufenzahl?', 'geraeteanleitung', 'haendlertext', 'eigene_beobachtung', 'offen'),
      anzahl_stufen: count('Genannte oder beobachtete Anzahl der Stufen', 100),
      anzahl_direkt_belegt: flag('Die Zahl bezieht sich auf feste Leistungsstufen ohne zusätzliche Modi')
    }, ({typ, messquelle, anzahl_stufen, anzahl_direkt_belegt}) => {
      whole(anzahl_stufen);
      return {aktuelle_p018_stufen: typ === 'p018' ? 6 : null,
        widerspruch_zur_aktuellen_p018_seite: typ === 'p018' && messquelle !== 'offen' && anzahl_direkt_belegt ? anzahl_stufen !== 6 : null,
        grenze: 'Die aktuelle Seite nennt sechs Stufen. Bei abweichendem Altangebot zuerst die Anleitung der gelieferten Generation klären.'};
    }, {typ: 'p018', messquelle: 'geraeteanleitung', anzahl_stufen: 4, anzahl_direkt_belegt: true},
    {aktuelle_p018_stufen: 6, widerspruch_zur_aktuellen_p018_seite: true}),

  entry('beurer_lr401_raumflaechenangabe_hoehenbezug',
    'Rechne die LR-401-Flächenangabe in ihr geometrisches Bezugsvolumen um — Interpret the LR 401 published area at its documented ceiling height',
    products, {
      lr401_68013: flag('Beurer LR 401, Artikel 68013, anhand der deutschen Herstellerunterlage bestätigt'),
      hersteller_flaeche_m2: number('Vom Hersteller für 2,4 m Deckenhöhe genannte Vergleichsfläche', 0.1, 500),
      wohnungshoehe_m: number('Mittlere Höhe des gemessenen Raums in Metern', 0.5, 20),
      wohnungsflaeche_m2: number('Gemessene Grundfläche dieses Raums', 0.1, 500)
    }, ({lr401_68013, hersteller_flaeche_m2, wohnungshoehe_m, wohnungsflaeche_m2}) => {
      const eigenes_volumen = wohnungshoehe_m * wohnungsflaeche_m2;
      return {eigenes_raumvolumen_m3: round(eigenes_volumen),
        geometrischer_abstand_zum_bezugsvolumen_m3: lr401_68013 ? round(eigenes_volumen - 2.4 * hersteller_flaeche_m2) : null,
        grenze: 'Reiner Volumenvergleich. Deckenhöhe, Luftführung und Filterzustand ändern die tatsächliche Wirkung; keine Flächenfreigabe ableiten.'};
    }, {lr401_68013: true, hersteller_flaeche_m2: 40, wohnungshoehe_m: 3, wohnungsflaeche_m2: 35},
    {eigenes_raumvolumen_m3: 105, geometrischer_abstand_zum_bezugsvolumen_m3: 9}),

  entry('pinguino_typnummer_kuehlleistung_nachweisgrenze',
    'Prüfe, ob eine Kühlleistung fälschlich aus der Pinguino-Typnummer abgeleitet wurde — Spot cooling capacity inferred from a Pinguino model code',
    guide('delonghi-pinguino-vergleich'), {
      behauptete_btuh: number('Zu prüfende behauptete Kühlleistung in BTU/h', 1, 100000),
      beleg_btuh: number('Auf dem exakten Datenblatt dokumentierte Leistung in BTU/h; 0 wenn unbekannt', 0, 100000),
      genaue_variante: flag('Das angezeigte Datenblatt stimmt mit der vollständigen Gerätebezeichnung überein'),
      aus_namenszahl: flag('Die Behauptung wurde rechnerisch aus einem Teil der Typnummer abgeleitet')
    }, ({behauptete_btuh, beleg_btuh, genaue_variante, aus_namenszahl}) => ({
      namensableitung_als_nachweis_verwerfen: aus_namenszahl,
      differenz_zum_datenblatt_btuh: genaue_variante && beleg_btuh > 0 ? round(behauptete_btuh - beleg_btuh) : null,
      grenze: 'Ein Namensmuster ist kein veröffentlichter Hersteller-Schlüssel. Nur das genaue Datenblatt als Quelle der Kühlleistung verwenden.'
    }), {behauptete_btuh: 9000, beleg_btuh: 9800, genaue_variante: true, aus_namenszahl: true},
    {namensableitung_als_nachweis_verwerfen: true, differenz_zum_datenblatt_btuh: -800}),

  entry('mobil_split_gesamtleitung_nutzlaenge_nachweis',
    'Trenne veröffentlichte Gesamtlänge und nutzbare Strecke der konkreten Split-Verbindung — Separate the advertised total connection length from its documented usable reach',
    guide('midea-portasplit-ausverkauft-alternativen'), {
      modell: choice('Exakt identifizierte Gerätevariante', 'midea_portasplit', 'remko_rkl495dc', 'anderes_oder_offen'),
      nutzbar_cm: number('Für diesen Aufbau laut Hersteller nutzbare Leitungsstrecke; 0 ohne Bestätigung', 0, 1000),
      gemessener_weg_cm: number('Vor Ort entlang der vorgesehenen Führung gemessener Weg', 0, 1000),
      nutzlaenge_fuer_aufbau_belegt: flag('Modellanleitung oder Hersteller bestätigt ausdrücklich den nutzbaren Anteil einschließlich Endstücken')
    }, ({modell, nutzbar_cm, gemessener_weg_cm, nutzlaenge_fuer_aufbau_belegt}) => {
      const gesamt = {midea_portasplit: 200, remko_rkl495dc: 300}[modell] ?? null;
      if (gesamt !== null && nutzlaenge_fuer_aufbau_belegt && nutzbar_cm > gesamt) throw new RangeError('Nutzlänge und Gesamtlänge für dieses Modell abgleichen.');
      return {hersteller_gesamtlaenge_cm: gesamt,
        reserve_aus_nutzlaenge_cm: gesamt !== null && nutzlaenge_fuer_aufbau_belegt && nutzbar_cm > 0 ? round(nutzbar_cm - gemessener_weg_cm) : null,
        grenze: 'Die Gesamtlänge bestätigt keine Aufstellung oder Veränderung der Leitung. Die genaue Herstelleranleitung ist maßgeblich.'};
    }, {modell: 'remko_rkl495dc', nutzbar_cm: 0, gemessener_weg_cm: 245, nutzlaenge_fuer_aufbau_belegt: false},
    {hersteller_gesamtlaenge_cm: 300, reserve_aus_nutzlaenge_cm: null}),

  entry('dachfenster_schwingfluegel_abdichtung_beide_spalte',
    'Prüfe die dokumentierte Abdeckung oberhalb und unterhalb der Achse eines Schwingfensters getrennt — Verify roof-window seal coverage on both sides of the pivot',
    guide('klimaanlage-dachfenster'), {
      oben_spalt_mm: number('Größte freie Öffnung oberhalb der Schwingachse am vorgesehenen Punkt', 0, 1000),
      unten_spalt_mm: number('Größte freie Öffnung unterhalb der Schwingachse am vorgesehenen Punkt', 0, 1000),
      oben_kit_mm: number('Dokumentierte und für dieses Fenster nutzbare Abdeckung oberhalb der Achse', 0, 1000),
      unten_kit_mm: number('Dokumentierte und für dieses Fenster nutzbare Abdeckung unterhalb der Achse', 0, 1000),
      achse_und_fluegelposition_bestaetigt: flag('Alle Maße gehören zur gleichen Öffnungsposition und Fensterbauart')
    }, ({oben_spalt_mm, unten_spalt_mm, oben_kit_mm, unten_kit_mm, achse_und_fluegelposition_bestaetigt}) => ({
      deckungsluecke_mm: achse_und_fluegelposition_bestaetigt ? {
        oberhalb: round(Math.max(0, oben_spalt_mm - oben_kit_mm)), unterhalb: round(Math.max(0, unten_spalt_mm - unten_kit_mm))
      } : null,
      grenze: 'Zwei dokumentierte Messstellen. Damit sind Dichtheit, ganzer Flügelumfang und Bedienbarkeit nicht bestätigt.'
    }), {oben_spalt_mm: 82, unten_spalt_mm: 110, oben_kit_mm: 95, unten_kit_mm: 90, achse_und_fluegelposition_bestaetigt: true},
    {deckungsluecke_mm: {oberhalb: 0, unterhalb: 20}}),

  entry('fensterabdichtung_klebeband_oberflaeche_temperaturbeleg',
    'Gleiche die Klebebandangabe mit der gemessenen Rahmenoberfläche statt der Luft ab — Match a seal-tape rating to the measured frame surface, not air temperature',
    guide('fensterabdichtung-klimaanlage'), {
      rahmen_spitze_c: number('Gemessene maximale Oberflächentemperatur an der Klebestelle in °C', -10, 100),
      luft_spitze_c: number('Zeitgleich erfasste Lufttemperatur in °C', -10, 100),
      bandgrenze_c: number('Für das konkrete Klebeband dokumentierte obere Betriebstemperatur', -10, 150),
      temperaturbezug: choice('Explizite Bezugsgröße der Angabe', 'oberflaeche_im_betrieb', 'nur_luft', 'nur_verarbeitung', 'offen')
    }, ({rahmen_spitze_c, luft_spitze_c, bandgrenze_c, temperaturbezug}) => ({
      rahmen_minus_luft_c: round(rahmen_spitze_c - luft_spitze_c),
      oberflaechenreserve_c: temperaturbezug === 'oberflaeche_im_betrieb' ? round(bandgrenze_c - rahmen_spitze_c) : null,
      grenze: 'Verarbeitungstemperatur und Temperatur im Betrieb getrennt halten. Material und Löseeigenschaften separat prüfen.'
    }), {rahmen_spitze_c: 50, luft_spitze_c: 33, bandgrenze_c: 47, temperaturbezug: 'oberflaeche_im_betrieb'},
    {rahmen_minus_luft_c: 17, oberflaechenreserve_c: -3}),

  entry('fensterbeschlag_fotopaar_innen_aussen_abgleich',
    'Prüfe, welcher Scheibenseite eine zeitlich passende Beschlagbeobachtung zugeordnet werden kann — Attribute matched condensation evidence to the observed glass surface',
    guide('fenster-beschlagen-aussen'), {
      foto_seite: choice('Scheibenseite, die das erste Foto nachweisbar zeigt', 'innen', 'aussen', 'offen'),
      gegenprobe_seite: choice('Scheibenseite der zweiten protokollierten Sichtbeobachtung', 'innen', 'aussen', 'offen'),
      gegenprobe_beschlagen: flag('Auf der zweiten protokollierten Seite war Beschlag sichtbar'),
      zeitabstand_min: number('Abstand der beiden Beobachtungen in Minuten', 0, 1440),
      toleranz_min: number('Größter für diese Beobachtung noch akzeptierter Zeitabstand', 0, 1440)
    }, ({foto_seite, gegenprobe_seite, gegenprobe_beschlagen, zeitabstand_min, toleranz_min}) => {
      const paar = foto_seite !== 'offen' && gegenprobe_seite !== 'offen' && foto_seite !== gegenprobe_seite && zeitabstand_min <= toleranz_min;
      return {beschlag_belegte_seiten: paar ? (gegenprobe_beschlagen ? ['innen', 'aussen'] : [foto_seite]) : null,
        gegenprobe_zeitlich_unpassend: zeitabstand_min > toleranz_min,
        grenze: 'Das Paar dokumentiert sichtbaren Beschlag auf bestimmten Oberflächen. Es klärt Ursache und Zustand zwischen den Scheiben nicht.'};
    }, {foto_seite: 'aussen', gegenprobe_seite: 'innen', gegenprobe_beschlagen: false, zeitabstand_min: 4, toleranz_min: 6},
    {beschlag_belegte_seiten: ['aussen'], gegenprobe_zeitlich_unpassend: false}),

  entry('geraeteservice_fehlerbild_gleiche_stufe_pruefkarte',
    'Erfasse, wo ein gemeldeter Fehler nach Gerätepflege unter denselben dokumentierten Laststufen wieder sichtbar ist — Map a recurring climate-device issue to matched test stages',
    guide('mobile-klimaanlage-kuehlt-nicht'), {
      stufe_niedrig_vorher: flag('Beschriebenes Verhalten vor Pflege auf der niedrigen Stufe beobachtet'),
      stufe_hoch_vorher: flag('Beschriebenes Verhalten vor Pflege auf der höheren Stufe beobachtet'),
      stufe_niedrig_nachher: choice('Nach-Pflege-Beobachtung auf gleicher niedriger Stufe', 'auffaellig', 'unauffaellig', 'nicht_geprueft'),
      stufe_hoch_nachher: choice('Nach-Pflege-Beobachtung auf gleicher höherer Stufe', 'auffaellig', 'unauffaellig', 'nicht_geprueft'),
      prueflast_aehnlich: flag('Aufstellung, Gerätemodus, Testdauer und Belastung entsprechen der vorherigen Beobachtung')
    }, ({stufe_niedrig_vorher, stufe_hoch_vorher, stufe_niedrig_nachher, stufe_hoch_nachher, prueflast_aehnlich}) => {
      const zuvor = [['niedrig', stufe_niedrig_vorher, stufe_niedrig_nachher], ['hoch', stufe_hoch_vorher, stufe_hoch_nachher]]
        .filter(([, vorher]) => vorher);
      return {wieder_beobachtete_stufen: prueflast_aehnlich ? zuvor.filter(([, , nachher]) => nachher === 'auffaellig').map(([stufe]) => stufe) : null,
        fehlende_nachproben: zuvor.filter(([, , nachher]) => nachher === 'nicht_geprueft').map(([stufe]) => stufe),
        grenze: 'Nur zuvor dokumentierte Auffälligkeiten werden nachverfolgt. Andere Stufen und die Fehlerursache bleiben unabhängig davon offen.'};
    }, {stufe_niedrig_vorher: true, stufe_hoch_vorher: true, stufe_niedrig_nachher: 'auffaellig', stufe_hoch_nachher: 'nicht_geprueft', prueflast_aehnlich: true},
    {wieder_beobachtete_stufen: ['niedrig'], fehlende_nachproben: ['hoch']}),

  entry('bedienunterlagen_geraeteanzeige_verschiedene_zustaende',
    'Prüfe, ob dasselbe Anzeigesymbol in zwei Modellunterlagen unterschiedliche Zustände trägt — Detect one display symbol documented with different meanings',
    guide('luftentfeuchter-zieht-kein-wasser'), {
      laeuft_am_geraet: flag('Anzeigezustand am eigenen Gerät einschließlich Leuchten oder Blinken exakt beobachtet'),
      anleitung_a_passt: flag('Anleitung A ist dem Typ, der Version und gegebenenfalls Anzeigefolge eindeutig zugeordnet'),
      anleitung_b_passt: flag('Anleitung B ist dem Typ, der Version und gegebenenfalls Anzeigefolge eindeutig zugeordnet'),
      bedeutung_a: choice('In Anleitung A ausdrücklich zugewiesene Bedeutung', 'tank', 'wartephase', 'betrieb', 'offen'),
      bedeutung_b: choice('In Anleitung B ausdrücklich zugewiesene Bedeutung', 'tank', 'wartephase', 'betrieb', 'offen')
    }, ({laeuft_am_geraet, anleitung_a_passt, anleitung_b_passt, bedeutung_a, bedeutung_b}) => {
      const bedeutungen = [...new Set([anleitung_a_passt ? bedeutung_a : 'offen', anleitung_b_passt ? bedeutung_b : 'offen'].filter(x => x !== 'offen'))];
      return {einordnungsstatus: !laeuft_am_geraet || !bedeutungen.length ? 'anzeige_oder_anleitung_offen'
        : bedeutungen.length > 1 ? 'passende_unterlagen_widersprechen_sich' : bedeutungen[0],
        grenze: 'Die Anzeige wird anhand des dokumentierten Symbols gelesen. Ein Status beweist keine technische Ursache.'};
    }, {laeuft_am_geraet: true, anleitung_a_passt: true, anleitung_b_passt: false, bedeutung_a: 'wartephase', bedeutung_b: 'tank'},
    {einordnungsstatus: 'wartephase'}),

  entry('bosch_wqg235d00_kondensatorpflege_zahl_inventur',
    'Bestimme, welcher Anteil eines Pflegeplans beim WQG235D00 separat geprüft werden muss — Scope the WQG235D00 condenser feature within a household care plan',
    products, {
      wqg235d00: flag('Trockner anhand der vollständigen Kennung WQG235D00 bestätigt'),
      pflegevorgaenge: count('Anzahl unterschiedlicher bisher im Pflegeplan geführter Vorgänge'),
      kondensatorvorgaenge: count('Davon Vorgänge ausschließlich zur Kondensator-Selbstreinigung'),
      restmodell_abgeglichen: count('Weitere Vorgänge, die für das exakte Modell bereits manuell mit der Anleitung abgeglichen wurden')
    }, ({wqg235d00, pflegevorgaenge, kondensatorvorgaenge, restmodell_abgeglichen}) => {
      whole(pflegevorgaenge, kondensatorvorgaenge, restmodell_abgeglichen);
      if (kondensatorvorgaenge + restmodell_abgeglichen > pflegevorgaenge) throw new RangeError('Pflegevorgänge getrennt zählen.');
      return {selbstreinigender_kondensator_belegt: wqg235d00 ? true : null,
        andere_pflegevorgaenge_offen: wqg235d00 ? pflegevorgaenge - kondensatorvorgaenge - restmodell_abgeglichen : null,
        grenze: 'Die ausgewiesene Selbstreinigung ist auf den Kondensator bezogen. Maßgeblich für alle Pflegevorgänge bleibt die Geräteanleitung.'};
    }, {wqg235d00: true, pflegevorgaenge: 6, kondensatorvorgaenge: 1, restmodell_abgeglichen: 2},
    {selbstreinigender_kondensator_belegt: true, andere_pflegevorgaenge_offen: 3}),

  entry('geraeuschbericht_dezibel_ausgabeform_zeitprofil',
    'Entscheide, ob ein veröffentlichtes Geräuschprofil die gesuchte ruhige Zeit überhaupt abdeckt — Verify silent-window coverage in a documented noise profile',
    guide('mobile-klimaanlage-zu-laut'), {
      messdauer_min: number('Dauer des ausgewerteten Schallprotokolls in Minuten', 0, 1440),
      ruhige_min: number('Darin für denselben Messort ununterbrochen unter dem Vergleichswert dokumentierte Minuten', 0, 1440),
      ziel_min: number('Gewünschte Dauer unter dem gewählten Vergleichswert', 0, 1440),
      ausgabeart: choice('Darstellung, der die ruhige Zeit entnommen wurde', 'zeitverlauf', 'mittelwert', 'einzelwert', 'offen'),
      gleiche_messbasis: flag('Gleiche Pegelgröße, Messposition und gewünschte Gerätephase dokumentiert')
    }, ({messdauer_min, ruhige_min, ziel_min, ausgabeart, gleiche_messbasis}) => {
      if (ruhige_min > messdauer_min) throw new RangeError('Ruhiger Abschnitt kann die Messdauer nicht überschreiten.');
      const basis = ausgabeart === 'zeitverlauf' && gleiche_messbasis;
      return {gewuenschte_dauer_im_beleg: basis ? ruhige_min >= ziel_min : null,
        fehlende_ruhige_min: basis ? round(Math.max(0, ziel_min - ruhige_min)) : null,
        grenze: 'Nur für den konkreten Messort und Lauf. Ein Pegelmittelwert belegt keine durchgehende ruhige Phase.'};
    }, {messdauer_min: 60, ruhige_min: 19, ziel_min: 35, ausgabeart: 'zeitverlauf', gleiche_messbasis: true},
    {gewuenschte_dauer_im_beleg: false, fehlende_ruhige_min: 16}),

  entry('produkttest_technikwechsel_gemischter_pruefaufbau',
    'Prüfe, ob eine Verbesserung repliziert wurde oder nur beim gleichzeitigen Technik- und Aufstellwechsel auftrat — Separate replicated improvement from a bundled change in setup',
    method, {
      grundlaeufe: count('Vergleichsläufe mit geändertem Modell und sonst dokumentiert unverändertem Aufbau'),
      nach_modellwechsel_allein: count('Davon Läufe, in denen sich ausschließlich das Modell änderte und das Ziel erreicht wurde'),
      nach_doppelwechsel: count('Weitere positive Läufe, bei denen sich Modell und Aufstellung gleichzeitig änderten'),
      laeufe_mit_doppelwechsel_gesamt: count('Alle dokumentierten Läufe mit gleichzeitigem Modell- und Aufstellwechsel'),
      gleiche_zielgroesse: flag('In beiden Reihen wurde dasselbe vorab definierte Ergebnismerkmal geprüft')
    }, ({grundlaeufe, nach_modellwechsel_allein, nach_doppelwechsel, laeufe_mit_doppelwechsel_gesamt, gleiche_zielgroesse}) => {
      whole(grundlaeufe, nach_modellwechsel_allein, nach_doppelwechsel, laeufe_mit_doppelwechsel_gesamt);
      if (nach_modellwechsel_allein > grundlaeufe || nach_doppelwechsel > laeufe_mit_doppelwechsel_gesamt) throw new RangeError('Positive Beobachtungen können die Zahl der Läufe nicht überschreiten.');
      return {isoliert_gepruefte_treffer: gleiche_zielgroesse ? nach_modellwechsel_allein : null,
        nur_zusammen_beobachtet: gleiche_zielgroesse && nach_doppelwechsel > 0 && nach_modellwechsel_allein === 0,
        grenze: 'Positive Beobachtungen beim Doppelwechsel lassen keine Zuordnung zu nur einer Änderung zu. Die Zählung ist kein statistischer Wirkungsnachweis.'};
    }, {grundlaeufe: 3, nach_modellwechsel_allein: 0, nach_doppelwechsel: 2, laeufe_mit_doppelwechsel_gesamt: 2, gleiche_zielgroesse: true},
    {isoliert_gepruefte_treffer: 0, nur_zusammen_beobachtet: true}),

  entry('klima_testbedingungen_verbundflaeche_messorte',
    'Vergleiche die gemeldete Kühl-Abdeckung bei offener Tür mit der tatsächlich dokumentierten Raumgruppe — Scope a cooling test claim to the rooms actually observed',
    guide('mobile-klimaanlage-vergleich'), {
      getestete_hauptflaeche_m2: number('Grundfläche des im Test direkt beobachteten Raums', 0.1, 500),
      verbundflaeche_m2: number('Zusätzliche Grundfläche, die der Bericht als verbunden nennt', 0, 500),
      verbund_beobachtet_m2: number('Davon zusätzliche Fläche, für die Ziel und Messorte nachvollziehbar protokolliert wurden', 0, 500),
      messziel_und_tueren_belegt: flag('Ziel, Türen und Position der Messpunkte sind im Bericht dokumentiert')
    }, ({getestete_hauptflaeche_m2, verbundflaeche_m2, verbund_beobachtet_m2, messziel_und_tueren_belegt}) => {
      if (verbund_beobachtet_m2 > verbundflaeche_m2) throw new RangeError('Gemessene Teilfläche kann die verbundene Fläche nicht überschreiten.');
      return {durch_messorte_abgedeckte_flaeche_m2: messziel_und_tueren_belegt ? round(getestete_hauptflaeche_m2 + verbund_beobachtet_m2) : null,
        nur_verbundene_flaeche_m2: round(verbundflaeche_m2 - verbund_beobachtet_m2),
        grenze: 'Die Beobachtung einzelner Räume belegt keine gleichmäßige Kühlung ihrer gesamten Grundfläche.'};
    }, {getestete_hauptflaeche_m2: 21, verbundflaeche_m2: 12, verbund_beobachtet_m2: 5, messziel_und_tueren_belegt: true},
    {durch_messorte_abgedeckte_flaeche_m2: 26, nur_verbundene_flaeche_m2: 7})
];
