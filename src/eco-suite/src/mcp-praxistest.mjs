const robot = '/guide/saugroboter-kaufberatung.html';
const floor = '/guide/saugwischer-kaufberatung.html';
const kitchen = '/produkte.html';
const appliances = '/geraete-austausch-rechner.html';
const workshop = '/familienwerkstatt.html';
const count = description => ({type:'number', minimum:0, maximum:1000, description});
const duration = description => ({type:'number', minimum:0, maximum:1440, description});
const flag = description => ({type:'boolean', description});
const round = value => Math.round(value * 100) / 100;
function integers(...values) {
  if (values.some(value => !Number.isInteger(value))) throw new RangeError();
}
function subset(part, total) {
  if (part > total) throw new RangeError();
}
function tool(name, description, page, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example:{args, expect}};
}

export const praxistest = [
  tool('roboter_wiederaufnahme_doppelpass',
    'Nach einer manuellen Pause doppelt befahrene Abschnitte und ausgelassene Aufgaben erfassen. — Measure repeated segments and skipped work after a manual pause.',
    robot, {
      abschnitte:count('Markierte Abschnitte der geplanten Route insgesamt.'),
      vor_pause_erledigt:count('Abschnitte, die vor der Pause fertig waren.'),
      davon_wiederholt:count('Bereits fertige Abschnitte, die der Roboter nach der Pause wiederholt hat.'),
      danach_neu_erledigt:count('Vor der Pause offene Abschnitte, die nach der Pause fertig wurden.'),
    }, ({abschnitte, vor_pause_erledigt, davon_wiederholt, danach_neu_erledigt}) => {
      integers(abschnitte, vor_pause_erledigt, davon_wiederholt, danach_neu_erledigt);
      if (!abschnitte) throw new RangeError();
      subset(vor_pause_erledigt + danach_neu_erledigt, abschnitte);
      subset(davon_wiederholt, vor_pause_erledigt);
      return {offen:abschnitte - vor_pause_erledigt - danach_neu_erledigt, doppelt:davon_wiederholt,
        hinweis:'Abschnitte für den Test vorab markieren. Die Wiederaufnahme gilt für diesen Lauf und diese Einstellung.'};
    }, {abschnitte:8, vor_pause_erledigt:4, davon_wiederholt:2, danach_neu_erledigt:3}, {offen:1, doppelt:2}),

  tool('roboter_tuerfreigabe_nachholrunde',
    'Bei einem normalen Türwechsel prüfen, welche gesperrten Räume der Roboter später selbst nachholt. — Check which previously closed rooms are recovered without a second start.',
    robot, {
      wieder_geoeffnet:count('Geplante Räume, deren Türen erst im laufenden Durchgang wieder geöffnet wurden.'),
      selbst_nachgeholt:count('Davon im selben Durchgang ohne neuen Auftrag gereinigte Räume.'),
      mit_neustart_nachgeholt:count('Weitere dieser Räume, die erst ein späterer Auftrag erreicht hat.'),
    }, ({wieder_geoeffnet, selbst_nachgeholt, mit_neustart_nachgeholt}) => {
      integers(wieder_geoeffnet, selbst_nachgeholt, mit_neustart_nachgeholt);
      if (!wieder_geoeffnet) throw new RangeError();
      subset(selbst_nachgeholt + mit_neustart_nachgeholt, wieder_geoeffnet);
      return {zusaetzlicher_auftrag_fuer:mit_neustart_nachgeholt,
        auch_danach_offen:wieder_geoeffnet - selbst_nachgeholt - mit_neustart_nachgeholt,
        hinweis:'Unbeobachtete Räume separat prüfen. Ein Lauf belegt kein generelles Verhalten der Kartensoftware.'};
    }, {wieder_geoeffnet:4, selbst_nachgeholt:1, mit_neustart_nachgeholt:2}, {zusaetzlicher_auftrag_fuer:2, auch_danach_offen:1}),

  tool('roboter_nacharbeit_ersatzroute',
    'Die manuelle Ersatzrunde nach einer ausgelassenen Roboterzone auf ein Zeitfenster zuschneiden. — Fit manual backup work after a skipped robot zone into a time slot.',
    robot, {
      prioritaetsstellen:count('Offene Pflichtstellen laut eigener Planung.'),
      gesamtstellen:count('Alle offenen und für die Ersatzrunde vorgesehenen Stellen.'),
      minuten_pro_stelle:duration('Für eine vergleichbare Stelle gemessene Minuten von Hand.'),
      zeitfenster_minuten:duration('Heute verfügbares Zeitfenster für die Nacharbeit.'),
    }, ({prioritaetsstellen, gesamtstellen, minuten_pro_stelle, zeitfenster_minuten}) => {
      integers(prioritaetsstellen, gesamtstellen);
      subset(prioritaetsstellen, gesamtstellen);
      if (!minuten_pro_stelle) throw new RangeError();
      const quotient = zeitfenster_minuten / minuten_pro_stelle;
      const machbar = Math.min(gesamtstellen, Math.floor(quotient * (1 + Number.EPSILON)));
      return {pflichtstellen_offen:Math.max(0, prioritaetsstellen - machbar),
        stellen_auf_spaeter:gesamtstellen - machbar,
        hinweis:'Erst die Pflichtstellen bearbeiten. Die gemessene Zeit sollte bereits den üblichen Wechsel zwischen Stellen enthalten.'};
    }, {prioritaetsstellen:4, gesamtstellen:7, minuten_pro_stelle:2.5, zeitfenster_minuten:12}, {pflichtstellen_offen:0, stellen_auf_spaeter:3}),

  tool('roboter_hindernis_umweg_bedienzeit',
    'Beobachtete Rückfahrten am Durchgang von der eigentlichen Bedienzeit trennen. — Separate observed passage detours from hands-on intervention.',
    robot, {
      messfahrten:count('Gleiche Fahrten durch denselben Durchgang.'),
      rueckfahrten_dabei:count('Zusätzliche Rückfahrten oder Wendemanöver am Durchgang.'),
      bedieneingriffe:count('Fahrten, bei denen eine Person eingreifen musste.'),
      eingriffsminuten:duration('Gemessene aktive Eingriffsminuten insgesamt.'),
    }, ({messfahrten, rueckfahrten_dabei, bedieneingriffe, eingriffsminuten}) => {
      integers(messfahrten, rueckfahrten_dabei, bedieneingriffe);
      if (!messfahrten || (!bedieneingriffe && eingriffsminuten)) throw new RangeError();
      subset(bedieneingriffe, messfahrten);
      return {rueckfahrten_je_fahrt:round(rueckfahrten_dabei / messfahrten),
        minuten_je_eingriff:bedieneingriffe ? round(eingriffsminuten / bedieneingriffe) : null,
        hinweis:'Rückfahrt und menschlicher Eingriff sind getrennte Beobachtungen. Verschiedene Raumaufbauten getrennt auswerten.'};
    }, {messfahrten:5, rueckfahrten_dabei:8, bedieneingriffe:2, eingriffsminuten:3}, {rueckfahrten_je_fahrt:1.6, minuten_je_eingriff:1.5}),

  tool('roboter_eingriffsbudget_serienprobe',
    'Drei aufeinanderfolgende beobachtete Roboterläufe gegen das eigene Eingriffsbudget prüfen. — Check three consecutive robot runs against a personal intervention budget.',
    robot, {
      eingriffe_lauf_eins:count('Manuelle Eingriffe in Lauf eins.'),
      eingriffe_lauf_zwei:count('Manuelle Eingriffe in Lauf zwei.'),
      eingriffe_lauf_drei:count('Manuelle Eingriffe in Lauf drei.'),
      maximal_je_lauf:count('Für die Alltagsroutine akzeptierte Eingriffe pro Lauf.'),
    }, ({eingriffe_lauf_eins, eingriffe_lauf_zwei, eingriffe_lauf_drei, maximal_je_lauf}) => {
      const serie = [eingriffe_lauf_eins, eingriffe_lauf_zwei, eingriffe_lauf_drei];
      integers(...serie, maximal_je_lauf);
      return {laeufe_im_budget:serie.filter(wert => wert <= maximal_je_lauf).length,
        folgelauf_ueber_budget:serie[1] > maximal_je_lauf && serie[2] > maximal_je_lauf,
        hinweis:'Läufe mit vergleichbarem Aufbau beurteilen. Geplante manuelle Schritte und Störungen vor der Messung abgrenzen.'};
    }, {eingriffe_lauf_eins:0, eingriffe_lauf_zwei:2, eingriffe_lauf_drei:3, maximal_je_lauf:1}, {laeufe_im_budget:1, folgelauf_ueber_budget:true}),

  tool('bodenpflege_sichtspuren_trockenprobe',
    'Nach dem Trocknen entfernte, verschobene und neu sichtbare Stellen getrennt zählen. — Separate cleared, spread and newly visible marks after a floor dries.',
    floor, {
      flecken_vorher:count('Vor dem Wischen markierte Stellen.'),
      entfernt:count('Markierte Stellen, die nach dem Trocknen sichtbar sauber erscheinen.'),
      sichtbar_verschoben:count('Andere markierte Stellen, deren Spur verschoben oder verteilt erscheint.'),
      neue_stellen:count('Zusätzliche sichtbare Stellen außerhalb der ursprünglichen Markierungen.'),
    }, ({flecken_vorher, entfernt, sichtbar_verschoben, neue_stellen}) => {
      integers(flecken_vorher, entfernt, sichtbar_verschoben, neue_stellen);
      subset(entfernt + sichtbar_verschoben, flecken_vorher);
      return {unveraendert:flecken_vorher - entfernt - sichtbar_verschoben,
        spuren_nachher:flecken_vorher - entfernt + neue_stellen,
        netto_weniger_spuren:entfernt - neue_stellen,
        hinweis:'Nur freigegebene Böden prüfen. Bei gleicher Beleuchtung zählen und verschobene alte Spuren nur einmal erfassen.'};
    }, {flecken_vorher:8, entfernt:5, sichtbar_verschoben:2, neue_stellen:1}, {unveraendert:1, spuren_nachher:4, netto_weniger_spuren:4}),

  tool('bodenpflege_referenzstellen_gegenprobe',
    'Die Wiedererkennbarkeit sichtbarer Stellen mit unbearbeiteten Referenzstellen prüfen. — Check visibility against untouched reference marks.',
    floor, {
      teststellen:count('Markierte, im Test bearbeitete Stellen.'),
      teststellen_unsichtbar:count('Bearbeitete Stellen, die bei der Nachkontrolle unsichtbar waren.'),
      referenzstellen:count('Bearbeitungsfreie Referenzstellen mit ähnlichen sichtbaren Spuren.'),
      referenzstellen_unsichtbar:count('Davon bei der Nachkontrolle unsichtbare Referenzstellen.'),
    }, ({teststellen, teststellen_unsichtbar, referenzstellen, referenzstellen_unsichtbar}) => {
      integers(teststellen, teststellen_unsichtbar, referenzstellen, referenzstellen_unsichtbar);
      if (!teststellen || !referenzstellen) throw new RangeError();
      subset(teststellen_unsichtbar, teststellen);
      subset(referenzstellen_unsichtbar, referenzstellen);
      return {sichtbarkeitskontrolle_wiederholen:referenzstellen_unsichtbar > 0,
        sichtdifferenz_prozentpunkte:round(100 * (teststellen_unsichtbar / teststellen - referenzstellen_unsichtbar / referenzstellen)),
        hinweis:'Vergleiche dieselben Lichtbedingungen. Die Differenz ist eine lokale Sichtbeobachtung für freigegebene Oberflächen.'};
    }, {teststellen:6, teststellen_unsichtbar:5, referenzstellen:3, referenzstellen_unsichtbar:1}, {sichtbarkeitskontrolle_wiederholen:true, sichtdifferenz_prozentpunkte:50}),

  tool('saugwischer_wendemanoever_nacharbeit',
    'Zwei Laufwege auf Wendemanöver und dadurch beobachtete erneute Durchgänge vergleichen. — Compare turns and observed rework on two floor-cleaning routes.',
    floor, {
      wendungen_alt:count('Wendemanöver im bisherigen Laufweg auf derselben Fläche.'),
      wendungen_neu:count('Wendemanöver im geänderten Laufweg.'),
      erneut_alt:count('Wendemanöver, nach denen der bisherige Lauf erneut angesetzt werden musste.'),
      erneut_neu:count('Wendemanöver, nach denen der geänderte Lauf erneut angesetzt werden musste.'),
      gleiche_abdeckung:flag('Die gleiche freigegebene Fläche wurde in beiden Läufen vollständig bearbeitet.'),
    }, ({wendungen_alt, wendungen_neu, erneut_alt, erneut_neu, gleiche_abdeckung}) => {
      integers(wendungen_alt, wendungen_neu, erneut_alt, erneut_neu);
      subset(erneut_alt, wendungen_alt);
      subset(erneut_neu, wendungen_neu);
      return {weniger_wendungen:wendungen_alt - wendungen_neu, weniger_neue_ansaetze:erneut_alt - erneut_neu,
        vergleichbar:gleiche_abdeckung, hinweis:'Bei unterschiedlicher Abdeckung gelten die gezählten Unterschiede nur für die Protokolle. Für einen Vergleich dieselbe Fläche prüfen.'};
    }, {wendungen_alt:14, wendungen_neu:8, erneut_alt:4, erneut_neu:2, gleiche_abdeckung:true},
    {weniger_wendungen:6, weniger_neue_ansaetze:2, vergleichbar:true}),

  tool('bodenpflege_teilchen_auffangprobe',
    'Bei der Sichtprobe verschobene Teilchen von erfassten Teilchen trennen. — Separate visibly captured debris from debris displaced to the adjacent area.',
    floor, {
      teilchen_vorher:count('Natürlich vorhandene, sichtbare und für das Gerät geeignete Teilchen in einem abgegrenzten Abschnitt.'),
      im_behaelter:count('Davon im Auffangbehälter sichtbar wiedergefundene Teilchen.'),
      im_nachbarabschnitt:count('Davon nach dem Lauf sichtbar in angrenzende, zuvor freie Abschnitte verschobene Teilchen.'),
      im_testabschnitt:count('Davon weiterhin sichtbar im ursprünglichen Abschnitt.'),
    }, ({teilchen_vorher, im_behaelter, im_nachbarabschnitt, im_testabschnitt}) => {
      integers(teilchen_vorher, im_behaelter, im_nachbarabschnitt, im_testabschnitt);
      const zugeordnet = im_behaelter + im_nachbarabschnitt + im_testabschnitt;
      if (!teilchen_vorher) throw new RangeError();
      subset(zugeordnet, teilchen_vorher);
      return {nacharbeit_sichtbar:im_nachbarabschnitt + im_testabschnitt, ungeklaert:teilchen_vorher - zugeordnet,
        hinweis:'Keine Prüfpartikel ausbringen. Fehlende Teilchen bleiben unklar und werden nicht als entfernt gezählt.'};
    }, {teilchen_vorher:12, im_behaelter:6, im_nachbarabschnitt:3, im_testabschnitt:2}, {nacharbeit_sichtbar:5, ungeklaert:1}),

  tool('spuelgang_sichtbare_reste_schwerpunkt',
    'Nach gleicher Beladung sichtbare Nacharbeit nach Korb und Zugänglichkeit einordnen. — Find where visible rework concentrates after equal dishwasher loads.',
    appliances, {
      teile_oben:count('Kontrollierte Teile im oberen Korb.'),
      teile_unten:count('Kontrollierte Teile im unteren Korb.'),
      sichtreste_oben:count('Oben kontrollierte Teile mit sichtbaren Resten.'),
      sichtreste_unten:count('Unten kontrollierte Teile mit sichtbaren Resten.'),
    }, ({teile_oben, teile_unten, sichtreste_oben, sichtreste_unten}) => {
      integers(teile_oben, teile_unten, sichtreste_oben, sichtreste_unten);
      if (!teile_oben || !teile_unten) throw new RangeError();
      subset(sichtreste_oben, teile_oben);
      subset(sichtreste_unten, teile_unten);
      const oben = sichtreste_oben / teile_oben;
      const unten = sichtreste_unten / teile_unten;
      return {sichtreste_oben_prozent:round(100 * oben), sichtreste_unten_prozent:round(100 * unten),
        schwerpunkt:oben === unten ? 'kein Unterschied' : oben > unten ? 'oberer Korb' : 'unterer Korb',
        hinweis:'Vergleichbare Teile, Programme und Ausgangsbedingungen verwenden. Sichtprüfung ist keine Hygieneprüfung.'};
    }, {teile_oben:12, teile_unten:20, sichtreste_oben:3, sichtreste_unten:2},
    {sichtreste_oben_prozent:25, sichtreste_unten_prozent:10, schwerpunkt:'oberer Korb'}),

  tool('spuelgang_verdeckte_innenflaechen_probe',
    'Sichtbare Speisereste in zuvor verdeckten und frei angeordneten gleichen Teilen vergleichen. — Compare visible residue on previously nested versus unobstructed pieces.',
    appliances, {
      verdeckte_teile:count('Kontrollierte gleiche Teile mit im Lauf teilweise verdeckter Innenfläche.'),
      freie_teile:count('Kontrollierte gleiche Teile mit frei erreichbarer Innenfläche.'),
      verdeckte_mit_resten:count('Verdeckte Teile mit sichtbaren Resten nach dem Lauf.'),
      freie_mit_resten:count('Frei angeordnete Teile mit sichtbaren Resten nach dem Lauf.'),
    }, ({verdeckte_teile, freie_teile, verdeckte_mit_resten, freie_mit_resten}) => {
      integers(verdeckte_teile, freie_teile, verdeckte_mit_resten, freie_mit_resten);
      if (!verdeckte_teile || !freie_teile) throw new RangeError();
      subset(verdeckte_mit_resten, verdeckte_teile);
      subset(freie_mit_resten, freie_teile);
      const abstand = verdeckte_mit_resten / verdeckte_teile - freie_mit_resten / freie_teile;
      return {mehr_sichtreste_prozentpunkte:round(abstand * 100), freie_anordnung_erproben:abstand > 0,
        hinweis:'Nur Beladungen nach Herstelleranleitung vergleichen. Einzelprobe für sichtbare Reste, ohne Aussage zur Hygiene.'};
    }, {verdeckte_teile:4, freie_teile:5, verdeckte_mit_resten:2, freie_mit_resten:1},
    {mehr_sichtreste_prozentpunkte:30, freie_anordnung_erproben:true}),

  tool('spuelmaschine_ablagepuffer_spitzenbedarf',
    'Beim Ausräumen die tatsächlich beobachtete Spitzenbelegung der Zwischenablage prüfen. — Compare peak staging demand with space while unloading.',
    appliances, {
      peak_vorher:count('Größte gleichzeitig auf der Ablage gezählte Anzahl im bisherigen Ablauf.'),
      peak_nachher:count('Größte gleichzeitig gezählte Anzahl beim geänderten Ablauf mit derselben Ladung.'),
      ablageplaetze:count('Tatsächlich nutzbare Plätze auf dieser Ablage bei gleicher Teilegröße.'),
    }, ({peak_vorher, peak_nachher, ablageplaetze}) => {
      integers(peak_vorher, peak_nachher, ablageplaetze);
      return {vermiedener_spitzenbedarf:peak_vorher - peak_nachher,
        ausweichplaetze_neu:Math.max(0, peak_nachher - ablageplaetze),
        hinweis:'Auch eine genutzte Ausweichablage in der Spitzenbelegung mitzählen. Kein Nachweis einer Tragfähigkeit.'};
    }, {peak_vorher:15, peak_nachher:9, ablageplaetze:8}, {vermiedener_spitzenbedarf:6, ausweichplaetze_neu:1}),

  tool('spuelgang_nachsortieren_besteckprobe',
    'Messen, wie viel Vorsortieren beim Besteck das spätere Umsortieren verändert. — Measure the effect of pre-sorting cutlery on secondary handling.',
    appliances, {
      gleiche_anzahl_besteckteile:count('Pro Ablauf gleich viele Besteckteile.'),
      vorsortiergriffe_alt:count('Zusätzliche Sortiergriffe vor dem Lauf im bisherigen Ablauf.'),
      vorsortiergriffe_neu:count('Zusätzliche Sortiergriffe vor dem Lauf im geänderten Ablauf.'),
      nachsortiergriffe_alt:count('Zusätzliche Sortiergriffe nach dem Lauf bisher.'),
      nachsortiergriffe_neu:count('Zusätzliche Sortiergriffe nach dem Lauf im geänderten Ablauf.'),
    }, ({gleiche_anzahl_besteckteile, vorsortiergriffe_alt, vorsortiergriffe_neu, nachsortiergriffe_alt, nachsortiergriffe_neu}) => {
      integers(gleiche_anzahl_besteckteile, vorsortiergriffe_alt, vorsortiergriffe_neu, nachsortiergriffe_alt, nachsortiergriffe_neu);
      if (!gleiche_anzahl_besteckteile) throw new RangeError();
      const gespart = vorsortiergriffe_alt + nachsortiergriffe_alt - vorsortiergriffe_neu - nachsortiergriffe_neu;
      return {sortiergriffe_gespart:gespart, weniger_nachsortiergriffe:nachsortiergriffe_alt - nachsortiergriffe_neu,
        hinweis:'Normales Ein- und Ausräumen in beiden Vergleichen gleich behandeln. Beladungsvorgaben des Herstellers befolgen.'};
    }, {gleiche_anzahl_besteckteile:24, vorsortiergriffe_alt:3, vorsortiergriffe_neu:7, nachsortiergriffe_alt:13, nachsortiergriffe_neu:4},
    {sortiergriffe_gespart:5, weniger_nachsortiergriffe:9}),

  tool('kuehlschrank_entnahme_umraeumgriffe',
    'Messen, wie viele andere Behälter beim Zugriff auf häufig genutzte Behälter bewegt werden. — Compare moves of other containers when retrieving frequently used ones.',
    appliances, {
      gleiche_entnahmen:count('Gleiche Probeentnahmen mit jedem der beiden Fachaufbauten.'),
      umraeumgriffe_alt:count('Andere Behälter vorher bewegt, einschließlich Rückstellen.'),
      umraeumgriffe_neu:count('Andere Behälter nach der Änderung bewegt, einschließlich Rückstellen.'),
      neue_umraeumfaelle:count('Probeentnahmen, bei denen im neuen Aufbau erstmals ein anderer Behälter bewegt werden musste.'),
    }, ({gleiche_entnahmen, umraeumgriffe_alt, umraeumgriffe_neu, neue_umraeumfaelle}) => {
      integers(gleiche_entnahmen, umraeumgriffe_alt, umraeumgriffe_neu, neue_umraeumfaelle);
      if (!gleiche_entnahmen) throw new RangeError();
      subset(neue_umraeumfaelle, Math.min(gleiche_entnahmen, umraeumgriffe_neu));
      return {griffe_je_entnahme_gespart:round((umraeumgriffe_alt - umraeumgriffe_neu) / gleiche_entnahmen),
        neue_huerden:neue_umraeumfaelle,
        hinweis:'Dieselben Behälter in beiden Aufbauten prüfen. Geeignete Lagerbereiche des Geräts bleiben maßgeblich.'};
    }, {gleiche_entnahmen:10, umraeumgriffe_alt:19, umraeumgriffe_neu:5, neue_umraeumfaelle:2},
    {griffe_je_entnahme_gespart:1.4, neue_huerden:2}),

  tool('kuehlfach_auffindprobe_verwechslungszahl',
    'Zwei Anordnungen nach tatsächlich verwechselten und weiterhin nicht gefundenen Verpackungen vergleichen. — Compare mix-ups and misses in a refrigerator retrieval task.',
    appliances, {
      suchaufgaben:count('Anzahl identischer Suchaufgaben je Anordnung.'),
      verwechselt_alt:count('Aufgaben mit zuerst falsch ausgewählter Verpackung vor der Änderung.'),
      verwechselt_neu:count('Aufgaben mit zuerst falsch ausgewählter Verpackung nach der Änderung.'),
      nicht_gefunden_alt:count('Andere Aufgaben, in denen ohne Auswahl abgebrochen wurde, vor der Änderung.'),
      nicht_gefunden_neu:count('Andere Aufgaben, in denen ohne Auswahl abgebrochen wurde, nach der Änderung.'),
    }, ({suchaufgaben, verwechselt_alt, verwechselt_neu, nicht_gefunden_alt, nicht_gefunden_neu}) => {
      integers(suchaufgaben, verwechselt_alt, verwechselt_neu, nicht_gefunden_alt, nicht_gefunden_neu);
      if (!suchaufgaben) throw new RangeError();
      subset(verwechselt_alt + nicht_gefunden_alt, suchaufgaben);
      subset(verwechselt_neu + nicht_gefunden_neu, suchaufgaben);
      return {weniger_verwechslungen:verwechselt_alt - verwechselt_neu,
        weniger_abbrueche:nicht_gefunden_alt - nicht_gefunden_neu, direkt_gefunden_neu:suchaufgaben - verwechselt_neu - nicht_gefunden_neu,
        hinweis:'Jede Aufgabe einmal zählen. Mit der echten Alltagsbesetzung prüfen und bei Wiederholung die Reihenfolge ändern.'};
    }, {suchaufgaben:8, verwechselt_alt:3, verwechselt_neu:1, nicht_gefunden_alt:2, nicht_gefunden_neu:1},
    {weniger_verwechslungen:2, weniger_abbrueche:1, direkt_gefunden_neu:6}),

  tool('gefrierfach_leerbehaelter_rueckstellprobe',
    'Mit leeren Behältern prüfen, welche beim Zurückstellen im Gefrierfach einen zweiten Griff brauchen. — Use empty containers to check freezer-drawer restowing friction.',
    appliances, {
      rueckstellversuche:count('Alle vorgesehenen Rückstellversuche mit leeren Alltagsbehältern.'),
      direkt_passend:count('Davon ohne Umorientieren zurückgestellte Behälter.'),
      nach_drehung_passend:count('Davon mit erst nach Drehen oder Verschieben erreichtem vorgesehenem Platz.'),
    }, ({rueckstellversuche, direkt_passend, nach_drehung_passend}) => {
      integers(rueckstellversuche, direkt_passend, nach_drehung_passend);
      if (!rueckstellversuche) throw new RangeError();
      subset(direkt_passend + nach_drehung_passend, rueckstellversuche);
      return {anteil_direkt_prozent:round(100 * direkt_passend / rueckstellversuche),
        ohne_platz:rueckstellversuche - direkt_passend - nach_drehung_passend,
        hinweis:'Leer und ohne Kraft prüfen. Bei geänderter Beladung lassen sich die Anteile nicht übertragen.'};
    }, {rueckstellversuche:12, direkt_passend:7, nach_drehung_passend:3}, {anteil_direkt_prozent:58.33, ohne_platz:2}),

  tool('kuehlfach_reserveplaetze_alltagswechsel',
    'Mit regulären Entnahmen prüfen, wie zuverlässig ein reservierter Ablageplatz bis zum nächsten Nachfüllen frei wird. — Check how reliably a dedicated staging place clears by the next refill.',
    appliances, {
      nachfuelltermine:count('Beobachtete Termine zum Nachfüllen derselben Behälterart.'),
      frei_zu_beginn:count('Davon Termine, an denen der dafür vorgesehene Platz schon frei war.'),
      mit_umraeumen:count('Weitere Termine, an denen der Platz erst durch Umräumen frei wurde.'),
      gewuenscht_frei_prozent:{type:'number', minimum:0, maximum:100, description:'Eigener gewünschter Anteil direkt nutzbarer Termine in Prozent.'},
    }, ({nachfuelltermine, frei_zu_beginn, mit_umraeumen, gewuenscht_frei_prozent}) => {
      integers(nachfuelltermine, frei_zu_beginn, mit_umraeumen);
      if (!nachfuelltermine) throw new RangeError();
      subset(frei_zu_beginn + mit_umraeumen, nachfuelltermine);
      const direkt = 100 * frei_zu_beginn / nachfuelltermine;
      return {direkt_nutzbar_prozent:round(direkt), ziel_erreicht:direkt >= gewuenscht_frei_prozent,
        ohne_freien_platz:nachfuelltermine - frei_zu_beginn - mit_umraeumen,
        hinweis:'Erfasst die beobachtete Alltagstauglichkeit des Platzes. Vorgesehene Lagerbereiche und Luftwege frei halten.'};
    }, {nachfuelltermine:8, frei_zu_beginn:5, mit_umraeumen:2, gewuenscht_frei_prozent:75},
    {direkt_nutzbar_prozent:62.5, ziel_erreicht:false, ohne_freien_platz:1}),

  tool('heissluft_portionen_nachlaufprobe',
    'Beobachtete Portionen beim ersten Servieren und die erst später verfügbaren Portionen getrennt zählen. — Count first-service portions and portions deferred to a later round.',
    kitchen, {
      portionen_geplant:count('Geplante gleich große Portionen für denselben Anlass.'),
      portionen_erster_termin:count('Davon beim ersten Servieren tatsächlich bereitgestellte Portionen.'),
      portionen_spaeter:count('Weitere für diesen Anlass tatsächlich später bereitgestellte Portionen.'),
      abstand_minuten:duration('Beobachteter Abstand zwischen erstem und letztem Servieren, bei einem Termin null.'),
    }, ({portionen_geplant, portionen_erster_termin, portionen_spaeter, abstand_minuten}) => {
      integers(portionen_geplant, portionen_erster_termin, portionen_spaeter);
      if (!portionen_geplant || (!portionen_spaeter && abstand_minuten) ||
          (portionen_spaeter && (!abstand_minuten || !portionen_erster_termin))) throw new RangeError();
      subset(portionen_erster_termin + portionen_spaeter, portionen_geplant);
      return {zum_ersten_termin_fehlten:portionen_geplant - portionen_erster_termin,
        gar_nicht_serviert:portionen_geplant - portionen_erster_termin - portionen_spaeter,
        servierabstand_minuten:abstand_minuten,
        hinweis:'Erfasst nur den Ablauf einer realen Mahlzeit. Keine Aussage zu Garzeit, Garzustand oder sicheren Wartezeiten.'};
    }, {portionen_geplant:8, portionen_erster_termin:5, portionen_spaeter:2, abstand_minuten:11},
    {zum_ersten_termin_fehlten:3, gar_nicht_serviert:1, servierabstand_minuten:11}),

  tool('heissluft_zonenwechsel_bedienprobe',
    'Bei gleichen Küchenaufgaben zusätzliche Einstellungsschritte und Korrekturen mit Zonentrennung beobachten. — Measure setting changes and correction steps with or without split zones.',
    kitchen, {
      wechsel_alt:count('Bedienwechsel zwischen zwei wiederholten Aufgaben im bisherigen Aufbau.'),
      korrigiert_alt:count('Davon Wechsel mit nachträglich korrigierter Auswahl.'),
      wechsel_neu:count('Bedienwechsel bei denselben Aufgaben im geänderten Aufbau.'),
      korrigiert_neu:count('Davon Wechsel mit nachträglich korrigierter Auswahl.'),
    }, ({wechsel_alt, korrigiert_alt, wechsel_neu, korrigiert_neu}) => {
      integers(wechsel_alt, korrigiert_alt, wechsel_neu, korrigiert_neu);
      subset(korrigiert_alt, wechsel_alt);
      subset(korrigiert_neu, wechsel_neu);
      return {weniger_wechsel:wechsel_alt - wechsel_neu, weniger_korrekturen:korrigiert_alt - korrigiert_neu,
        weniger_beobachtete_bedienschritte:wechsel_alt + korrigiert_alt - wechsel_neu - korrigiert_neu,
        hinweis:'Ein Wechsel mit Korrektur zählt als zwei protokollierte Schritte. Nur vorgesehene Zonen und Programme vergleichen.'};
    }, {wechsel_alt:8, korrigiert_alt:2, wechsel_neu:6, korrigiert_neu:3},
    {weniger_wechsel:2, weniger_korrekturen:-1, weniger_beobachtete_bedienschritte:1}),

  tool('kontaktgrill_uebergabe_rueckstau',
    'Bei beobachteten Grilldurchgängen feststellen, ob die Übergabe mehr Behälter abarbeitet, als neu hinzukommen. — Check whether staging output keeps pace with new arrivals between grill rounds.',
    kitchen, {
      zuvor_wartende_behaelter:count('Zu Beginn des beobachteten Zeitfensters auf Übergabe wartende Behälter.'),
      neu_hinzugekommen:count('Innerhalb des Zeitfensters neu zur Übergabe hinzugekommene Behälter.'),
      uebergeben:count('Innerhalb des Zeitfensters an ihrem vorgesehenen Platz angekommene Behälter.'),
      davon_aus_startbestand:count('Davon Behälter, die schon zu Beginn auf Übergabe warteten.'),
    }, ({zuvor_wartende_behaelter, neu_hinzugekommen, uebergeben, davon_aus_startbestand}) => {
      integers(zuvor_wartende_behaelter, neu_hinzugekommen, uebergeben, davon_aus_startbestand);
      subset(davon_aus_startbestand, Math.min(zuvor_wartende_behaelter, uebergeben));
      subset(uebergeben - davon_aus_startbestand, neu_hinzugekommen);
      return {rueckstand_am_ende:zuvor_wartende_behaelter + neu_hinzugekommen - uebergeben,
        rueckstand_entwickelt_sich_um:neu_hinzugekommen - uebergeben,
        aus_startbestand_noch_wartend:zuvor_wartende_behaelter - davon_aus_startbestand,
        hinweis:'Nur Ablauf und Ablage bewerten. Keine Empfehlungen für Lebensmitteltemperatur oder Wartezeit.'};
    }, {zuvor_wartende_behaelter:3, neu_hinzugekommen:5, uebergeben:4, davon_aus_startbestand:2},
    {rueckstand_am_ende:4, rueckstand_entwickelt_sich_um:1, aus_startbestand_noch_wartend:1}),

  tool('kuechengeraet_ersatzmethode_bereitschaft',
    'Die im Alltag verfügbare Ersatzmethode nach einem belegten Küchengerät anhand echter Einsätze prüfen. — Evaluate fallback readiness from observed kitchen appliance conflicts.',
    kitchen, {
      belegungskonflikte:count('Beobachtete Fälle, in denen das zuerst gewählte Gerät belegt war.'),
      direkt_ersetzt:count('Davon mit der bestehenden Ersatzmethode ohne zusätzliche Vorbereitung erledigte Aufgaben.'),
      nach_vorbereitung_ersetzt:count('Weitere mit der bestehenden Ersatzmethode erst nach Vorbereitung erledigte Aufgaben.'),
    }, ({belegungskonflikte, direkt_ersetzt, nach_vorbereitung_ersetzt}) => {
      integers(belegungskonflikte, direkt_ersetzt, nach_vorbereitung_ersetzt);
      if (!belegungskonflikte) throw new RangeError();
      subset(direkt_ersetzt + nach_vorbereitung_ersetzt, belegungskonflikte);
      return {mit_bestehendem_ersatz_erledigt:direkt_ersetzt + nach_vorbereitung_ersetzt,
        ohne_ersatz:belegungskonflikte - direkt_ersetzt - nach_vorbereitung_ersetzt,
        hinweis:'Nur Aufgaben mit gleichwertigem Ziel vergleichen. Vor Anschaffung erst prüfen, ob eine vorhandene Methode genügt.'};
    }, {belegungskonflikte:8, direkt_ersetzt:5, nach_vorbereitung_ersetzt:2}, {mit_bestehendem_ersatz_erledigt:7, ohne_ersatz:1}),

  tool('werkstatt_fachtrenner_rueckgabeprobe',
    'Prüfen, ob eine Schubladeneinteilung wiederholt zu richtig zurückgelegten Gegenständen führt. — Verify repeated correct returns after adding dividers to a drawer.',
    workshop, {
      rueckgaben_vorher:count('Beobachtete Rückgaben mit der alten Einteilung.'),
      falsch_vorher:count('Davon Gegenstände im falschen Fach oder außerhalb des vorgesehenen Platzes.'),
      rueckgaben_nachher:count('Beobachtete Rückgaben mit der geänderten Einteilung.'),
      falsch_nachher:count('Davon Gegenstände im falschen Fach oder außerhalb des vorgesehenen Platzes.'),
    }, ({rueckgaben_vorher, falsch_vorher, rueckgaben_nachher, falsch_nachher}) => {
      integers(rueckgaben_vorher, falsch_vorher, rueckgaben_nachher, falsch_nachher);
      if (!rueckgaben_vorher || !rueckgaben_nachher) throw new RangeError();
      subset(falsch_vorher, rueckgaben_vorher);
      subset(falsch_nachher, rueckgaben_nachher);
      return {fehlrueckgaben_prozent_neu:round(100 * falsch_nachher / rueckgaben_nachher),
        verbesserung_prozentpunkte:round(100 * (falsch_vorher / rueckgaben_vorher - falsch_nachher / rueckgaben_nachher)),
        hinweis:'Vergleichbare Rückgaben und Nutzergruppen erfassen. Bei wenigen Fällen die Beobachtung wiederholen.'};
    }, {rueckgaben_vorher:10, falsch_vorher:4, rueckgaben_nachher:8, falsch_nachher:1},
    {fehlrueckgaben_prozent_neu:12.5, verbesserung_prozentpunkte:27.5}),

  tool('werkstatt_mehrfachgriff_platzwechselprobe',
    'Greifen und Wiederholen desselben Griffs vor und nach einer neuen Werkzeugposition erfassen. — Measure repeat reaches before and after moving a tool.',
    workshop, {
      aufgaben_pro_platz:count('Pro Position gleich viele einfache Aufgaben mit demselben Werkzeug.'),
      fehlgriffe_alt:count('Zusätzliche Such- oder Korrekturgriffe am bisherigen Platz.'),
      fehlgriffe_neu:count('Zusätzliche Such- oder Korrekturgriffe am neuen Platz.'),
      danach_unterbrochen_neu:count('Aufgaben, die am neuen Platz nach erfolglosem Greifen unterbrochen wurden.'),
    }, ({aufgaben_pro_platz, fehlgriffe_alt, fehlgriffe_neu, danach_unterbrochen_neu}) => {
      integers(aufgaben_pro_platz, fehlgriffe_alt, fehlgriffe_neu, danach_unterbrochen_neu);
      if (!aufgaben_pro_platz) throw new RangeError();
      subset(danach_unterbrochen_neu, Math.min(aufgaben_pro_platz, fehlgriffe_neu));
      return {korrekturgriffe_je_aufgabe_gespart:round((fehlgriffe_alt - fehlgriffe_neu) / aufgaben_pro_platz),
        weiterhin_unterbrochen:danach_unterbrochen_neu,
        hinweis:'Nur gefahrlose Entnahme und Rückgabe prüfen. Werkzeugtyp und Aufgabe zwischen den Proben gleich lassen.'};
    }, {aufgaben_pro_platz:10, fehlgriffe_alt:11, fehlgriffe_neu:3, danach_unterbrochen_neu:1},
    {korrekturgriffe_je_aufgabe_gespart:0.8, weiterhin_unterbrochen:1}),

  tool('werkstatt_probedruck_nacharbeit_serienentscheid',
    'Aus wiederholt beobachteter Nacharbeit entscheiden, ob ein einfacher Trenner schon in kleiner Serie taugt. — Decide whether a small run of drawer dividers fits your measured rework budget.',
    workshop, {
      gepruefte_trenner:count('Geprüfte Probe-Trenner derselben Geometrie und Herstellung.'),
      nachbearbeitet:count('Davon erst nach ungefährlicher Nachbearbeitung verwendbare Trenner.'),
      verworfen:count('Andere nicht verwendbare Probe-Trenner.'),
      minuten_nacharbeit:duration('Gesamte aktive Nachbearbeitungszeit der akzeptierten Proben.'),
      maximal_minuten_je_verwendbar:duration('Eigene Grenze für aktive Nachbearbeitung je verwendbarem Trenner.'),
    }, ({gepruefte_trenner, nachbearbeitet, verworfen, minuten_nacharbeit, maximal_minuten_je_verwendbar}) => {
      integers(gepruefte_trenner, nachbearbeitet, verworfen);
      if (!gepruefte_trenner || (!nachbearbeitet && minuten_nacharbeit)) throw new RangeError();
      subset(nachbearbeitet + verworfen, gepruefte_trenner);
      const verwendbar = gepruefte_trenner - verworfen;
      const mittel = verwendbar ? minuten_nacharbeit / verwendbar : null;
      return {verwendbar, minuten_pro_verwendbarem_trenner:mittel === null ? null : round(mittel),
        erst_kleine_probe_behalten:verworfen > 0 || (mittel !== null && mittel > maximal_minuten_je_verwendbar),
        hinweis:'Nur für einfache Schubladeneinteilung. Aktive Nacharbeit ausgeschiedener Stücke separat betrachten.'};
    }, {gepruefte_trenner:5, nachbearbeitet:2, verworfen:1, minuten_nacharbeit:6, maximal_minuten_je_verwendbar:2},
    {verwendbar:4, minuten_pro_verwendbarem_trenner:1.5, erst_kleine_probe_behalten:true}),

  tool('werkstatt_trenner_wechsel_ohne_umraeumen',
    'Bei einem verstellbaren Schubladentrenner messen, wie viele Alltagswechsel ohne vollständiges Ausräumen gelingen. — Measure how often a divider can be repositioned without emptying the drawer.',
    workshop, {
      vorgesehene_wechsel:count('Begonnene Wechsel zwischen vorgesehenen Trennerpositionen einschließlich abgebrochener Versuche.'),
      direkt:count('Davon Wechsel ohne Gegenstände zu entnehmen.'),
      teilweise:count('Davon Wechsel mit Entnahme einiger Gegenstände.'),
      ganz_leeren:count('Davon Wechsel mit vollständigem Ausräumen.'),
    }, ({vorgesehene_wechsel, direkt, teilweise, ganz_leeren}) => {
      integers(vorgesehene_wechsel, direkt, teilweise, ganz_leeren);
      if (!vorgesehene_wechsel) throw new RangeError();
      subset(direkt + teilweise + ganz_leeren, vorgesehene_wechsel);
      return {abgebrochen:vorgesehene_wechsel - direkt - teilweise - ganz_leeren, ohne_ausraeumen:direkt,
        teilweise_umraeumen:teilweise, hinweis:'Den gleichen Gegenstandsmix verwenden. Bei Widerstand den Wechsel abbrechen.'};
    }, {vorgesehene_wechsel:8, direkt:3, teilweise:2, ganz_leeren:1},
    {abgebrochen:2, ohne_ausraeumen:3, teilweise_umraeumen:2}),
]
