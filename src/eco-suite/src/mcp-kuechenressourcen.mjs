const kitchen='/produkte.html';
const appliance='/geraete-austausch-rechner.html';
const meter='/strommess-protokoll.html';
const water='/guide/duschen-kosten-rechner.html';
const household='/guide/strom-sparen-haushalt.html';
const n=(description,maximum=1000)=>({type:'number',minimum:0,maximum,description});
const yn=description=>({type:'boolean',description});
const r=value=>Math.round(value*100)/100 + 0;
const positive=value=>Math.max(0,value);
function whole(...values) {
  if (values.some(value=>!Number.isInteger(value))) throw new RangeError();
}
function tool(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const kuechenressourcen=[
  tool('backofen_vorheizanteil_getrennte_laeufe',
    'Bei gleichem Backergebnis den gemessenen Vorheizanteil einer gemeinsamen und zweier getrennter Sitzungen vergleichen — Compare measured preheat shares for one combined session and two separate sessions.',
    meter,{
      gemeinsam_kwh:n('Gesamter Messwert der gemeinsamen Sitzung in kWh.'),
      gemeinsam_vorheizen_kwh:n('Darin enthaltenes Vorheizen in kWh.'),
      getrennt_kwh:n('Gesamtwert der zwei getrennten Sitzungen in kWh.'),
      getrennt_vorheizen_kwh:n('Darin enthaltene beide Vorheizphasen zusammen in kWh.'),
      gleiche_aufgabe:yn('Waren Menge, geeignetes Programm und angestrebtes Ergebnis vergleichbar?'),
    },({gemeinsam_kwh,gemeinsam_vorheizen_kwh,getrennt_kwh,getrennt_vorheizen_kwh,gleiche_aufgabe})=>{
      if (gemeinsam_vorheizen_kwh>gemeinsam_kwh||getrennt_vorheizen_kwh>getrennt_kwh) throw new RangeError();
      return {vorheizdifferenz_kwh:gleiche_aufgabe?r(getrennt_vorheizen_kwh-gemeinsam_vorheizen_kwh):null,
        restdifferenz_kwh:gleiche_aufgabe?r(getrennt_kwh-getrennt_vorheizen_kwh-gemeinsam_kwh+gemeinsam_vorheizen_kwh):null,
        hinweis:'Beide Messreihen gleich abgrenzen. Keine Empfehlung, erforderliches Vorheizen oder Programme zu ändern.'};
    },{gemeinsam_kwh:1.4,gemeinsam_vorheizen_kwh:0.3,getrennt_kwh:1.95,getrennt_vorheizen_kwh:0.7,gleiche_aufgabe:true},
    {vorheizdifferenz_kwh:0.4,restdifferenz_kwh:0.15}),

  tool('backofen_blech_sichtprobe_mitte_und_rand',
    'Zwei auf demselben Backblech dokumentierte Sichtproben auf ungleich verteilte Ergebnisse abgleichen — Compare center and edge outcome counts for a fixed tray placement.',
    kitchen,{
      mitte_geprueft:n('Gleichartige Stücke an den mittleren Prüfpositionen.'),
      rand_geprueft:n('Entsprechende Stücke an den Randpositionen.'),
      mitte_ziel_aussehen:n('Geprüfte mittlere Stücke mit dem vorher festgelegten sichtbaren Merkmal.'),
      rand_ziel_aussehen:n('Geprüfte Randstücke mit demselben Merkmal.'),
    },({mitte_geprueft,rand_geprueft,mitte_ziel_aussehen,rand_ziel_aussehen})=>{
      whole(mitte_geprueft,rand_geprueft,mitte_ziel_aussehen,rand_ziel_aussehen);
      if(!mitte_geprueft||!rand_geprueft||mitte_ziel_aussehen>mitte_geprueft||rand_ziel_aussehen>rand_geprueft) throw new RangeError();
      return {mitte_minus_rand_prozentpunkte:r(100*(mitte_ziel_aussehen/mitte_geprueft-rand_ziel_aussehen/rand_geprueft)),
        hinweis:'Nur ein sichtbares Merkmal der eigenen Probe. Daraus folgen weder Temperaturmessung noch Aussage zum Garzustand.'};
    },{mitte_geprueft:6,rand_geprueft:5,mitte_ziel_aussehen:5,rand_ziel_aussehen:2},{mitte_minus_rand_prozentpunkte:43.33}),

  tool('backofen_blechwechsel_gleichwertige_messpaare',
    'Beim Wechsel zwischen zwei zugelassenen Blechen vergleichbare Proben anhand dokumentierter Belegung trennen — Identify admissible measurements when tray shape or loading changed.',
    kitchen,{
      probepaare:n('Beobachtete Versuchspaare für denselben Zweck.'),
      gleiche_belegung:n('Paare mit gleichartiger Belegung, Menge und demselben Programm.'),
      abweichende_blechposition:n('Davon Paare mit abweichender Einschubhöhe, obwohl nur das Blech verglichen werden sollte.'),
      anderes_blech_wie_geplant:n('Davon abweichende Bleche am ursprünglich vorgesehenen Platz und mit vollständiger Beobachtung.'),
    },({probepaare,gleiche_belegung,abweichende_blechposition,anderes_blech_wie_geplant})=>{
      whole(probepaare,gleiche_belegung,abweichende_blechposition,anderes_blech_wie_geplant);
      if(gleiche_belegung>probepaare||abweichende_blechposition+anderes_blech_wie_geplant>gleiche_belegung) throw new RangeError();
      return {blechpaare_auswertbar:anderes_blech_wie_geplant,platzwechsel_getrennt:abweichende_blechposition,
        andere_unvollstaendige:probepaare-anderes_blech_wie_geplant-abweichende_blechposition,
        hinweis:'Die beiden Gruppen innerhalb der gleichen Belegung getrennt zählen. Vor Gerätevergleichen Programmvorgaben und Eignung prüfen.'};
    },{probepaare:9,gleiche_belegung:7,abweichende_blechposition:2,anderes_blech_wie_geplant:4},
    {blechpaare_auswertbar:4,platzwechsel_getrennt:2,andere_unvollstaendige:3}),

  tool('heissluft_gemeinsam_getrennt_messwert_je_ausgabe',
    'Eine gemeinsam gemessene Heißluftnutzung je ausgegebene Portion gegen zwei getrennt gemessene Nutzungen vergleichen — Compare per-serving draw from simultaneous and separate dual-basket use.',
    kitchen,{
      beide_kwh:n('Gemessener Gesamtbedarf bei Nutzung beider zugelassenen Zonen.'),
      beide_portionen:n('Tatsächlich erhaltene vergleichbare Portionen daraus.'),
      getrennt_kwh:n('Gesamtbedarf der zwei einzeln gemessenen Zonenläufe.'),
      getrennt_portionen:n('Tatsächlich erhaltene vergleichbare Portionen daraus.'),
      vergleichbar:yn('Sind Rezept, Portionengröße und Endergebnis für diesen Vergleich gleichartig?'),
    },({beide_kwh,beide_portionen,getrennt_kwh,getrennt_portionen,vergleichbar})=>{
      whole(beide_portionen,getrennt_portionen);
      if(!beide_portionen||!getrennt_portionen) throw new RangeError();
      return {gesamtvergleich_kwh:vergleichbar?r(getrennt_kwh-beide_kwh):null,
        je_portion_vorteil_wh:vergleichbar?r(1000*(getrennt_kwh/getrennt_portionen-beide_kwh/beide_portionen)):null,
        hinweis:'Bei verschiedener Ausgabemenge beide Zahlen getrennt lesen. Nur vergleichbare, zugelassene Läufe verwenden.'};
    },{beide_kwh:0.7,beide_portionen:5,getrennt_kwh:0.9,getrennt_portionen:6,vergleichbar:true},
    {gesamtvergleich_kwh:0.2,je_portion_vorteil_wh:10}),

  tool('heissluft_teilauslastung_messwert_mehrportion',
    'Aus zwei gewogenen Auslastungen den zusätzlichen Strombedarf der zusätzlich erhaltenen gleichartigen Portionen ablesen — Attribute incremental measured electricity to extra servings at a documented load.',
    kitchen,{
      kleinstlauf_kwh:n('Eigener vollständiger Messwert für die kleinere erlaubte Ausgabe.'),
      groesser_kwh:n('Vollständiger Messwert der größeren erlaubten Ausgabe.'),
      kleine_portionen:n('Zahl gleichartiger Portionen aus dem kleinen Lauf.'),
      grosse_portionen:n('Zahl gleichartiger Portionen aus dem größeren Lauf.'),
    },({kleinstlauf_kwh,groesser_kwh,kleine_portionen,grosse_portionen})=>{
      whole(kleine_portionen,grosse_portionen);
      if(!kleine_portionen||grosse_portionen<=kleine_portionen) throw new RangeError();
      return {zusaetzliche_portionen:grosse_portionen-kleine_portionen,
        zusaetzliche_wh_je_mehrportion:r(1000*(groesser_kwh-kleinstlauf_kwh)/(grosse_portionen-kleine_portionen)),
        hinweis:'Gleiche Einstellungen und vergleichbares Ergebnis voraussetzen. Verbrauch außerhalb beider gemessener Füllungen bleibt unbekannt.'};
    },{kleinstlauf_kwh:0.36,groesser_kwh:0.48,kleine_portionen:2,grosse_portionen:5},
    {zusaetzliche_portionen:3,zusaetzliche_wh_je_mehrportion:40}),

  tool('kontaktgrill_kontaktflaeche_formprobe_stuecke',
    'Bei erlaubtem festen Zustand Stücke mit brauchbarer Auflage, Teilauflage und freiem Platz getrennt beobachten — Count observed fit categories on a cold, stationary grill surface.',
    kitchen,{
      vorgesehene_stuecke:n('Anzahl gleich geformter Prüfmuster für dieselbe zulässige Aufstellung.'),
      voll_aufgelegt:n('Davon Stücke mit der vorgesehenen vollständigen Auflage.'),
      teilweise_aufgelegt:n('Weitere Stücke, die nur teilweise auf der nutzbaren Fläche liegen.'),
    },({vorgesehene_stuecke,voll_aufgelegt,teilweise_aufgelegt})=>{
      whole(vorgesehene_stuecke,voll_aufgelegt,teilweise_aufgelegt);
      if(voll_aufgelegt+teilweise_aufgelegt>vorgesehene_stuecke) throw new RangeError();
      return {ohne_freien_platz:vorgesehene_stuecke-voll_aufgelegt-teilweise_aufgelegt,
        fuer_vollflaechige_auflage_offen:vorgesehene_stuecke-voll_aufgelegt,
        hinweis:'Nur geeignete kalte Formprobe. Auflageflächen und Beladung laut Anleitung prüfen. Keine Aussage zum Garzustand.'};
    },{vorgesehene_stuecke:7,voll_aufgelegt:4,teilweise_aufgelegt:2},
    {ohne_freien_platz:1,fuer_vollflaechige_auflage_offen:3}),

  tool('wasserkocher_giessprobe_rest_und_verlust',
    'Die gemessene Füllung nach mehreren Ausgaben zwischen eingeschenkten Mengen, Rest und ungeklärter Differenz bilanzieren — Reconcile cold pour-test water across cups and jug remainder.',
    kitchen,{
      vorher_ml:n('Zu Beginn gemessene Menge kalten Wassers in ml.',10000),
      tasse_a_ml:n('In Gefäß A tatsächlich eingetroffene Menge in ml.',10000),
      tasse_b_ml:n('In Gefäß B tatsächlich eingetroffene Menge in ml.',10000),
      rest_ml:n('Gemessener Rest im Gefäß nach den beiden Ausgaben in ml.',10000),
      messgrenze_ml:n('Selbst abgeleitete Messabweichung für die Summe in ml.',10000),
    },({vorher_ml,tasse_a_ml,tasse_b_ml,rest_ml,messgrenze_ml})=>{
      const saldo=vorher_ml-tasse_a_ml-tasse_b_ml-rest_ml;
      return {durch_messgrenze_erklaerbar:Math.abs(saldo)<=messgrenze_ml,ungeklaerte_bilanz_ml:r(saldo),
        hinweis:'Mit kaltem Wasser prüfen. Vorzeichen unterscheiden rechnerische Minder- und Mehrmengen. Die Ursache erfordert eine Beobachtung.'};
    },{vorher_ml:610,tasse_a_ml:245,tasse_b_ml:240,rest_ml:115,messgrenze_ml:8},
    {durch_messgrenze_erklaerbar:false,ungeklaerte_bilanz_ml:10}),

  tool('wasserkocher_warmhalte_innenmessung_grenzpunkt',
    'Nach zwei eigenen Messversuchen den zusätzlichen Bedarf des dokumentierten Haltemodus zwischen zwei Zeitpunkten ablesen — Estimate measured marginal kettle holding electricity without extrapolating beyond the observation.',
    kitchen,{
      bis_a_min:n('Minuten nach Beginn des gleichen Haltemodus zur ersten Ablesung.'),
      bis_b_min:n('Minuten nach Beginn des Haltemodus zur späteren Ablesung.'),
      a_wh:n('Bis zur ersten Ablesung seit Haltebeginn gemessene Wh.'),
      b_wh:n('Bis zum späteren Zeitpunkt seit Haltebeginn gemessene Wh.'),
    },({bis_a_min,bis_b_min,a_wh,b_wh})=>{
      if(bis_b_min<=bis_a_min||b_wh<a_wh) throw new RangeError();
      const mittlereLeistung=60*(b_wh-a_wh)/(bis_b_min-bis_a_min);
      if(!Number.isFinite(mittlereLeistung*100)) throw new RangeError();
      return {mehrverbrauch_wh:r(b_wh-a_wh),mittlere_leistung_im_abschnitt_w:r(mittlereLeistung),
        hinweis:'Nur für den beobachteten Haltemodus, mit gleicher Füllung und ohne erneuten Aufheizbeginn. Einstellungen und Grenzen der Anleitung einhalten.'};
    },{bis_a_min:10,bis_b_min:25,a_wh:9,b_wh:23},{mehrverbrauch_wh:14,mittlere_leistung_im_abschnitt_w:56}),

  tool('messbecher_zwei_marken_nutzteilung_abweichung',
    'Mit zwei kalten Wiegeproben prüfen, ob die Differenz benachbarter Messbecherstriche gleich groß ausfällt wie markiert — Check a measuring jug increment independently of absolute mark offsets.',
    kitchen,{
      marke_a_ml:n('Nennmarke A des Bechers in ml.',10000),
      marke_b_ml:n('Höhere Nennmarke B in ml.',10000),
      wasser_a_g:n('Bei separat tarierter kalter Probe an Marke A ermittelte Wassermasse in Gramm.',10000),
      wasser_b_g:n('Entsprechend ermittelte Wassermasse an Marke B in Gramm.',10000),
    },({marke_a_ml,marke_b_ml,wasser_a_g,wasser_b_g})=>{
      if(marke_b_ml<=marke_a_ml||wasser_b_g<wasser_a_g) throw new RangeError();
      return {abweichung_einzelabschnitt_ml_naeherung:r(wasser_b_g-wasser_a_g-marke_b_ml+marke_a_ml),
        hinweis:'Für kaltes Wasser näherungsweise 1 g/ml. Ablese- und Waagengenauigkeit begrenzen die Prüfung. Andere Flüssigkeiten separat prüfen.'};
    },{marke_a_ml:300,marke_b_ml:500,wasser_a_g:288,wasser_b_g:482},{abweichung_einzelabschnitt_ml_naeherung:-6}),

  tool('kuechenwaage_tara_behaelterwechsel_charge',
    'Die getrennten Tara-Werte zweier Küchenbehälter bei einer Umfüllprobe berücksichtigen — Track material transfer using separate container tare weights.',
    kitchen,{
      behaelter_a_g:n('Geleerter Behälter A in Gramm.',20000),
      a_mit_inhalt_g:n('Bruttogewicht A vor dem Umfüllen.',20000),
      behaelter_b_g:n('Geleerter Behälter B in Gramm.',20000),
      b_mit_inhalt_g:n('Bruttogewicht B nach dem Umfüllen.',20000),
      rest_a_g:n('Nach dem Umfüllen separat beobachteter Inhaltsrest in A.',20000),
    },({behaelter_a_g,a_mit_inhalt_g,behaelter_b_g,b_mit_inhalt_g,rest_a_g})=>{
      const a=a_mit_inhalt_g-behaelter_a_g,b=b_mit_inhalt_g-behaelter_b_g;
      if(a<0||b<0||rest_a_g>a) throw new RangeError();
      return {umgefuellt_g:r(b),im_ursprungsgefaess_g:rest_a_g,nicht_zugeordnet_g:r(a-b-rest_a_g),
        hinweis:'Nur dieselbe Menge mit denselben geprüften Waageneinstellungen vergleichen. Negative Bilanz kann auf Messfehler hinweisen.'};
    },{behaelter_a_g:255,a_mit_inhalt_g:765,behaelter_b_g:142,b_mit_inhalt_g:638,rest_a_g:9},
    {umgefuellt_g:496,im_ursprungsgefaess_g:9,nicht_zugeordnet_g:5}),

  tool('kochtopf_deckelprobe_verdunstung_energie',
    'Eigene Deckelproben bei identischer Aufgabe nach Wasserverlust und Strom getrennt beurteilen — Separate evaporation and power differences in matched lidded pot trials.',
    household,{
      mit_deckel_wasserverlust_g:n('Gemessener Wasserverlust mit passendem zugelassenem Deckel.'),
      ohne_deckel_wasserverlust_g:n('Gemessener Wasserverlust im zulässigen Vergleich ohne Deckel.'),
      mit_deckel_wh:n('Gemessener elektrischer Energiebedarf mit Deckel.',10000),
      ohne_deckel_wh:n('Gemessener elektrischer Energiebedarf ohne Deckel.',10000),
      gleiche_bedingungen:yn('Wasserstartmenge, Topf, Küchenaufgabe und Messgrenze waren vergleichbar.'),
    },({mit_deckel_wasserverlust_g,ohne_deckel_wasserverlust_g,mit_deckel_wh,ohne_deckel_wh,gleiche_bedingungen})=>{
      return {beobachtet_weniger_verdunstet_g:gleiche_bedingungen?r(ohne_deckel_wasserverlust_g-mit_deckel_wasserverlust_g):null,
        beobachtet_weniger_energie_wh:gleiche_bedingungen?r(ohne_deckel_wh-mit_deckel_wh):null,
        hinweis:'Nur gemessene Unterschiede. Modell- und Rezeptvorgaben sowie sicheren Umgang beachten. Wasserverlust beweist keine Ursache der Stromdifferenz.'};
    },{mit_deckel_wasserverlust_g:34,ohne_deckel_wasserverlust_g:91,mit_deckel_wh:170,ohne_deckel_wh:214,gleiche_bedingungen:true},
    {beobachtet_weniger_verdunstet_g:57,beobachtet_weniger_energie_wh:44}),

  tool('kochwasser_herd_oder_kanne_transferbilanz',
    'Für dieselbe Nutzwassermenge die gemessenen Schritte bis zum Topf vollständig vergleichen — Include observed transfer loss and follow-on heating when comparing kettle versus stovetop.',
    household,{
      herd_wh:n('Gemessener Bedarf direkt im Topf bis zum beobachteten gleichen Übergabepunkt.',10000),
      kanne_wh:n('Gemessene Energie für das Erwärmen in der Kanne.',10000),
      nacherhitzen_wh:n('Zusätzlich gemessene Energie im Topf nach Übergabe aus der Kanne.',10000),
      brauchbare_menge_g:n('Gleiche Menge, die am Ende jedes Vergleichs tatsächlich zur Verfügung stand.',10000),
    },({herd_wh,kanne_wh,nacherhitzen_wh,brauchbare_menge_g})=>{
      if(brauchbare_menge_g<1) throw new RangeError();
      const delta=herd_wh-kanne_wh-nacherhitzen_wh;
      return {unterschied_wh:r(delta),unterschied_wh_je_kg:r(1000*delta/brauchbare_menge_g),
        hinweis:'Gleichen Endpunkt und tatsächliche Nutzmenge vergleichen. Fehlende Teilmessung nicht als null einsetzen. Anschluss- und Geräteanleitung beachten.'};
    },{herd_wh:146,kanne_wh:94,nacherhitzen_wh:17,brauchbare_menge_g:690},
    {unterschied_wh:35,unterschied_wh_je_kg:50.72}),

  tool('handspuelen_becken_und_hahn_mengenbilanz',
    'Beim selben Handspülvorgang Beckenfüllungen und zusätzliche laufende Entnahmen ohne Doppelerfassung addieren — Combine recorded basin fill and separate tap use without overlap.',
    appliance,{
      becken_gefuellt_l:n('Summe aller gemessenen Beckenfüllungen in Litern.'),
      hahn_gesamt_l:n('Gesamte gemessene Hahnmenge desselben protokollierten Vorgangs in Litern.'),
      becken_aus_diesem_hahn_l:n('Anteil der Beckenfüllungen, der schon in der Hahnmenge gezählt ist.'),
      auswertung_vollstaendig:yn('Erfasst das Protokoll alle benutzten Wasserquellen für diesen Vorgang?'),
    },({becken_gefuellt_l,hahn_gesamt_l,becken_aus_diesem_hahn_l,auswertung_vollstaendig})=>{
      if(becken_aus_diesem_hahn_l>Math.min(becken_gefuellt_l,hahn_gesamt_l)) throw new RangeError();
      return {zusatz_aus_hahn_l:r(hahn_gesamt_l-becken_aus_diesem_hahn_l),
        gesamt_l:auswertung_vollstaendig?r(becken_gefuellt_l+hahn_gesamt_l-becken_aus_diesem_hahn_l):null,
        hinweis:'Nur getrennte, dokumentierte Mengen verwenden. Temperatur und Spülergebnis separat beurteilen.'};
    },{becken_gefuellt_l:7,hahn_gesamt_l:10,becken_aus_diesem_hahn_l:6,auswertung_vollstaendig:true},
    {zusatz_aus_hahn_l:4,gesamt_l:11}),

  tool('spuelmaschine_nachlauf_messfenster_energiesignal',
    'Maschinenenergie zwischen zwei gemessenen Programmenden in Hauptlauf und belegten Nachlauf trennen — Keep measured dishwasher follow-on energy outside a runtime reading.',
    meter,{
      heiz_und_spuelfertig_kwh:n('Kumulativer Messwert seit Start bei dokumentierter Markierung des Hauptlaufendes.'),
      nachlauf_fertig_kwh:n('Kumulativer Messwert seit Start nach dem vollständigen Programm einschließlich Nachlauf.'),
      nachlauf_aktiv_min:n('Gemessene Dauer zwischen beiden Markierungen in Minuten.'),
    },({heiz_und_spuelfertig_kwh,nachlauf_fertig_kwh,nachlauf_aktiv_min})=>{
      if(heiz_und_spuelfertig_kwh>nachlauf_fertig_kwh||(!nachlauf_aktiv_min&&heiz_und_spuelfertig_kwh<nachlauf_fertig_kwh)) throw new RangeError();
      return {vor_markierung_kwh:heiz_und_spuelfertig_kwh,nachlauf_wh:r(1000*(nachlauf_fertig_kwh-heiz_und_spuelfertig_kwh)),
        hinweis:'Die Markierung nach Herstellerangabe wählen. Das vollständige Programm zugrunde legen. Der Abschnitt beweist keine gezielte Trocknungsfunktion.'};
    },{heiz_und_spuelfertig_kwh:0.67,nachlauf_fertig_kwh:0.78,nachlauf_aktiv_min:32},{vor_markierung_kwh:0.67,nachlauf_wh:110}),

  tool('spuelmaschine_abtropfplan_restwassergrenze',
    'Bei einem eigenen Abstellversuch Restwasser nach zwei beobachteten Wartezeiten mit der verfügbaren Zeit abgleichen — Choose among measured draining results after unloading.',
    appliance,{
      fruehe_probe_min:n('Gemessene Minuten nach der vorgesehenen Entnahme zur ersten Probe.'),
      spaete_probe_min:n('Gemessene Minuten nach der vorgesehenen Entnahme zur zweiten Probe.'),
      fruehes_restwasser_ml:n('Bis zum Ende der ersten Wartezeit noch gemessene Restmenge.'),
      spaetes_restwasser_ml:n('Bis zum Ende der späten Wartezeit noch gemessene Restmenge.'),
      grenze_ml:n('Selbst festgelegte Grenze für die Menge, die auf die vorgesehene Ablage tropft.'),
      zeit_verfuegbar_min:n('Maximal verfügbare Wartezeit vor der Ablagenutzung.'),
    },({fruehe_probe_min,spaete_probe_min,fruehes_restwasser_ml,spaetes_restwasser_ml,grenze_ml,zeit_verfuegbar_min})=>{
      if(spaete_probe_min<=fruehe_probe_min) throw new RangeError();
      const a=fruehe_probe_min<=zeit_verfuegbar_min&&fruehes_restwasser_ml<=grenze_ml;
      const b=spaete_probe_min<=zeit_verfuegbar_min&&spaetes_restwasser_ml<=grenze_ml;
      return {erste_passende_beobachtung_min:a?fruehe_probe_min:b?spaete_probe_min:null,
        spaetere_probe_weniger_ml:r(fruehes_restwasser_ml-spaetes_restwasser_ml),
        hinweis:'Messwerte für gleiche Vergleichsteile und vorgesehene Ablage verwenden. Keine Freigabe zur vorzeitigen Entnahme.'};
    },{fruehe_probe_min:5,spaete_probe_min:12,fruehes_restwasser_ml:9,spaetes_restwasser_ml:3,grenze_ml:4,zeit_verfuegbar_min:15},
    {erste_passende_beobachtung_min:12,spaetere_probe_weniger_ml:6}),

  tool('spuelmaschine_ladung_kompensierte_teilwiederholung',
    'Beim Beobachten derselben Gesamtaufgabe gezielt wiederholte Teilmengen von der erstmaligen Ausgabe trennen — Compare unique usable items and machine cycles after partial repeat loads.',
    appliance,{
      teile_gesamt:n('Erstkandidaten in der Beobachtung vor jeder Wiederholung.'),
      erstlauf_nutzbar:n('Im ersten Lauf nach eigener üblicher Kontrolle nutzbar gewordene Teile.'),
      wiederholt:n('Anschließend mit vollständiger Wiederholung bearbeitete, vorher offene Teile.'),
      wiederholt_nutzbar:n('Davon nach dem Wiederholen nutzbare Teile.'),
    },({teile_gesamt,erstlauf_nutzbar,wiederholt,wiederholt_nutzbar})=>{
      whole(teile_gesamt,erstlauf_nutzbar,wiederholt,wiederholt_nutzbar);
      if(erstlauf_nutzbar+wiederholt>teile_gesamt||wiederholt_nutzbar>wiederholt) throw new RangeError();
      return {einmalig_nutzbare_teile:erstlauf_nutzbar+wiederholt_nutzbar,
        beobachtete_teile_durchlaeufe:teile_gesamt+wiederholt,weiter_offen:teile_gesamt-erstlauf_nutzbar-wiederholt_nutzbar,
        hinweis:'Jedes Stück in der Ausgabe nur einmal zählen. Das Zählergebnis gibt keine Hygienebewertung ab.'};
    },{teile_gesamt:15,erstlauf_nutzbar:11,wiederholt:3,wiederholt_nutzbar:2},
    {einmalig_nutzbare_teile:13,beobachtete_teile_durchlaeufe:18,weiter_offen:2}),

  tool('kuehlschrank_tuerroutine_ereignisse_sammelphase',
    'Bei länger erfassten Kühlschrankläufen eindeutig einzelne Zugriffsfenster von untrennbaren Gruppen unterscheiden — Decide which logged door periods can serve as isolated observations.',
    meter,{
      einzeln_vorgemerkt:n('Ursprünglich als isolierte Zugriffsfenster vorgemerkte Phasen.'),
      weitere_oeffnung_darin:n('Davon Phasen mit einer weiteren Öffnung vor Ende des nachbeobachteten Abschnitts.'),
      davon_erneut_ganz_geloggt:n('Separat neu beobachtete und vollständig protokollierte Einzelfenster für die ursprünglich überlagerten Phasen.'),
      nachbeobachtung_gleich:yn('Für alle Fenster war dieselbe nachbeobachtete Dauer eindeutig erfasst.'),
    },({einzeln_vorgemerkt,weitere_oeffnung_darin,davon_erneut_ganz_geloggt,nachbeobachtung_gleich})=>{
      whole(einzeln_vorgemerkt,weitere_oeffnung_darin,davon_erneut_ganz_geloggt);
      if(weitere_oeffnung_darin>einzeln_vorgemerkt||davon_erneut_ganz_geloggt>weitere_oeffnung_darin) throw new RangeError();
      return {isoliert_auswertbar:nachbeobachtung_gleich?einzeln_vorgemerkt-weitere_oeffnung_darin+davon_erneut_ganz_geloggt:null,
        noch_ohne_ersatz:weitere_oeffnung_darin-davon_erneut_ganz_geloggt,
        hinweis:'Zählt Messfenster, keine Temperatur- oder Einsparprognose. Andere Einflüsse wie Raumwärme separat berücksichtigen.'};
    },{einzeln_vorgemerkt:12,weitere_oeffnung_darin:5,davon_erneut_ganz_geloggt:2,nachbeobachtung_gleich:true},
    {isoliert_auswertbar:9,noch_ohne_ersatz:3}),

  tool('kuehlgeraet_stromsignal_raumwaerme_vergleichbar',
    'Bei zwei eigenen Kühlschrankmessungen Wärme am Aufstellort als Vergleichsgrenze ausweisen — Gate a refrigerator energy comparison by observed room-temperature comparability.',
    meter,{
      raum_a_c:n('Gemessener Raum-Mittelwert A in °C.',60),
      raum_b_c:n('Gemessener Raum-Mittelwert B in °C.',60),
      toleranz_c:n('Vorab selbst festgelegter höchster Abstand für den Messvergleich.',30),
      a_kwh:n('Verbrauch von A in einem gleich langen vollständigen Intervall.'),
      b_kwh:n('Verbrauch von B in einem gleich langen vollständigen Intervall.'),
    },({raum_a_c,raum_b_c,toleranz_c,a_kwh,b_kwh})=>{
      const delta=Math.abs(raum_a_c-raum_b_c);
      return {raumwerte_naeherungsweise_vergleichbar:delta<=toleranz_c,raumdifferenz_c:r(delta),
        nutzbare_verbrauchsdifferenz_kwh:delta<=toleranz_c?r(b_kwh-a_kwh):null,
        hinweis:'Vergleichbarkeit setzt übliche, gleichartige Nutzung voraus. Raumtoleranz ist eine selbst gesetzte Auswertungsgrenze.'};
    },{raum_a_c:20,raum_b_c:23,toleranz_c:1.5,a_kwh:0.81,b_kwh:0.92},
    {raumwerte_naeherungsweise_vergleichbar:false,raumdifferenz_c:3,nutzbare_verbrauchsdifferenz_kwh:null}),

  tool('gefrierfach_nach_abtaukontrolle_energieabschnitte',
    'Einen dokumentierten Wiederanlauf nach vollständiger Pflege aus einem mehrtägigen Vergleich gesondert ausweisen — Separate a noted freezer restart block from routine energy observation.',
    meter,{
      gesamt_kwh:n('Erfasste Energie des gesamten Protokolls.'),
      gesamt_h:n('Gesamtlänge desselben Protokolls in Stunden.'),
      wiederanlauf_kwh:n('Darin gemessene Energie einer getrennt protokollierten Wiederanlaufphase.'),
      wiederanlauf_h:n('Gemessene Dauer genau dieser Phase in Stunden.'),
    },({gesamt_kwh,gesamt_h,wiederanlauf_kwh,wiederanlauf_h})=>{
      if(wiederanlauf_h>=gesamt_h||wiederanlauf_kwh>gesamt_kwh||(!wiederanlauf_h&&wiederanlauf_kwh)) throw new RangeError();
      return {routine_messstunden:r(gesamt_h-wiederanlauf_h),routine_kwh_ohne_wiederanlauf:r(gesamt_kwh-wiederanlauf_kwh),
        hinweis:'Sonderphase und Alltagsmessung getrennt berichten. Keine Geräteeinstellung, Wiederanlauffreigabe oder Jahresprognose ableiten.'};
    },{gesamt_kwh:3.82,gesamt_h:96,wiederanlauf_kwh:0.51,wiederanlauf_h:5},
    {routine_messstunden:91,routine_kwh_ohne_wiederanlauf:3.31}),

  tool('kuehlfach_flaechenprobe_mischbehaelter_zwischenraum',
    'Auf einer vorhandenen Ablage zugeschnittene, für Luftwege reservierte Fläche vom nutzbaren Rest trennen — Compare usable shelf footprint after a separately reserved gap.',
    appliance,{
      ablage_cm2:n('Tatsächlich gemessene gesamte ebene Ablagefläche in cm².',100000),
      bleibt_frei_cm2:n('Laut bestehender dokumentierter Aufstellung freizuhaltende Fläche in cm².',100000),
      bedarf_geplant_cm2:n('Gemessene Stellfläche der passend geprüften Behälter in cm².',100000),
      aufstellung_erprobt:yn('Kollisionen, Form und freizuhaltende Luftwege sind in dieser konkreten Ablage geprüft.'),
    },({ablage_cm2,bleibt_frei_cm2,bedarf_geplant_cm2,aufstellung_erprobt})=>{
      if(bleibt_frei_cm2>ablage_cm2) throw new RangeError();
      return {nutzbar_cm2:r(ablage_cm2-bleibt_frei_cm2),
        verbleibende_flaeche_cm2:aufstellung_erprobt?r(ablage_cm2-bleibt_frei_cm2-bedarf_geplant_cm2):null,
        hinweis:'Flächenbilanz allein beweist keine geometrische Passung, zulässige Last oder Lagerbedingungen.'};
    },{ablage_cm2:1120,bleibt_frei_cm2:180,bedarf_geplant_cm2:880,aufstellung_erprobt:true},
    {nutzbar_cm2:940,verbleibende_flaeche_cm2:60}),

  tool('kuechenarbeitsplatte_zwei_freizonen_einmal_abziehen',
    'Auf der Arbeitsplatte zwei überlappende, bereits freigehaltene Bereiche bei der nutzbaren Fläche nur einmal abziehen — Reconcile overlapping retained clear areas on a countertop.',
    kitchen,{
      flaeche_cm2:n('Tatsächlich vermessene ebene Arbeitsfläche in cm².',100000),
      zone_a_cm2:n('Davon erste gemessene unbenutzbare oder freigehaltene Fläche.',100000),
      zone_b_cm2:n('Davon zweite gemessene unbenutzbare oder freigehaltene Fläche.',100000),
      gemeinsame_cm2:n('Bereich, der in beiden Zonen enthalten ist.',100000),
      belegung_cm2:n('Platz der vorgesehenen Gegenstände laut bereits geprüftem Aufstellplan.',100000),
    },({flaeche_cm2,zone_a_cm2,zone_b_cm2,gemeinsame_cm2,belegung_cm2})=>{
      const gesperrt=zone_a_cm2+zone_b_cm2-gemeinsame_cm2;
      if(gemeinsame_cm2>Math.min(zone_a_cm2,zone_b_cm2)||gesperrt>flaeche_cm2) throw new RangeError();
      return {frei_bilanz_cm2:r(flaeche_cm2-gesperrt),unterschuss_cm2:r(positive(gesperrt+belegung_cm2-flaeche_cm2)),
        hinweis:'Fläche ist nur eine Bilanz. Form, Freiraum und Geräteaufstellung anhand der geprüften Anordnung beurteilen.'};
    },{flaeche_cm2:6500,zone_a_cm2:2200,zone_b_cm2:1300,gemeinsame_cm2:350,belegung_cm2:3600},
    {frei_bilanz_cm2:3350,unterschuss_cm2:250}),

  tool('kuechenablage_blech_quer_oder_laengs_probe',
    'Bei kalter Stellprobe entscheiden, ob ein vorhandenes Blech auf eine zuvor freigeräumte rechteckige Ablage passt — Compare both rectangular orientations for a cold baking tray.',
    kitchen,{
      frei_lang_cm:n('Gemessene durchgehend freie Länge der bereits vorgesehenen Ablage.'),
      frei_breit_cm:n('Gemessene durchgehend freie Breite derselben Ablage.'),
      blech_lang_cm:n('Außenlänge des vorhandenen kalten Blechs einschließlich Seitenrändern.'),
      blech_breit_cm:n('Außenbreite des Blechs einschließlich Griffen oder Rändern.'),
      stellplatz_bestaetigt:yn('Ist die Ablage für den vorgesehenen konkreten Zweck geprüft?'),
    },({frei_lang_cm,frei_breit_cm,blech_lang_cm,blech_breit_cm,stellplatz_bestaetigt})=>{
      if(!blech_lang_cm||!blech_breit_cm) throw new RangeError();
      return {passende_kalte_stellungen:stellplatz_bestaetigt?
        [blech_lang_cm<=frei_lang_cm&&blech_breit_cm<=frei_breit_cm?'längs':null,blech_breit_cm<=frei_lang_cm&&blech_lang_cm<=frei_breit_cm?'quer':null].filter(Boolean):null,
        hinweis:'Kalte Probe und rechteckige Außenmaße. Tragfähigkeit oder Eignung für heiße Gegenstände folgt daraus nicht.'};
    },{frei_lang_cm:37,frei_breit_cm:49,blech_lang_cm:46,blech_breit_cm:35,stellplatz_bestaetigt:true},
    {passende_kalte_stellungen:['quer']}),

  tool('kuechenvorbereitung_schneidbrett_ablagen_verlust',
    'Beim selben Vorbereitungsvorgang volle, überfüllte und unbenutzte Sammelschalen aus einer Sichtprobe zählen — Identify capacity lost to incompatible prep bowls.',
    kitchen,{
      schalen:n('Bereitgestellte, gleichartige und für den kalten Versuch vorgesehene Schalen.'),
      normal_benutzt:n('Schalen, die ohne zusätzliches Umfüllen benutzt werden konnten.'),
      umgefuellt_weil_voll:n('Andere Schalen, deren Inhalt wegen der erwarteten Füllgrenze separat umgefüllt wurde.'),
      grund_fuer_umfuellen_bestaetigt:yn('Bei jeder dafür gezählten Schale wurde die Füllgrenze als konkreter Anlass protokolliert.'),
    },({schalen,normal_benutzt,umgefuellt_weil_voll,grund_fuer_umfuellen_bestaetigt})=>{
      whole(schalen,normal_benutzt,umgefuellt_weil_voll);
      if(normal_benutzt+umgefuellt_weil_voll>schalen) throw new RangeError();
      return {noch_unbenutzt:schalen-normal_benutzt-umgefuellt_weil_voll,
        beobachtete_ueberlauf_ersatzfaelle:grund_fuer_umfuellen_bestaetigt?umgefuellt_weil_voll:null,
        hinweis:'Erfasst besetzte Schalen und tatsächlich beobachtetes Umfüllen, keine Füllstands- oder Lebensmittelvorgabe.'};
    },{schalen:7,normal_benutzt:4,umgefuellt_weil_voll:2,grund_fuer_umfuellen_bestaetigt:true},
    {noch_unbenutzt:1,beobachtete_ueberlauf_ersatzfaelle:2}),

  tool('kochutensilien_set_ersatz_nur_nach_pruefung',
    'Ein vorhandenes Küchenwerkzeug-Set um tatsächlich freigegebene Ersatzteile ergänzen und den restlichen Mangel bestimmen — Count complete tool capacity after verified substitutes.',
    kitchen,{
      benoetigte_plaetze:n('Unterschiedliche für den abgesprochenen Ablauf benötigte Positionen.'),
      passend_vorhanden:n('Davon bereits mit nachweislich geeigneten vorhandenen Werkzeugen belegt.'),
      ersatz_eindeutig:n('Weitere Positionen mit je einem anderen belegbar geeigneten Ersatz.'),
      ersatz_mehrfach_zugeordnet:n('Weitere Positionen, die nur demselben einzelnen Ersatz zugeordnet wurden.'),
    },({benoetigte_plaetze,passend_vorhanden,ersatz_eindeutig,ersatz_mehrfach_zugeordnet})=>{
      whole(benoetigte_plaetze,passend_vorhanden,ersatz_eindeutig,ersatz_mehrfach_zugeordnet);
      if(passend_vorhanden+ersatz_eindeutig+ersatz_mehrfach_zugeordnet>benoetigte_plaetze) throw new RangeError();
      const abgedeckt=passend_vorhanden+ersatz_eindeutig+Number(ersatz_mehrfach_zugeordnet>0);
      return {gleichzeitig_abgedeckt:abgedeckt,offen_bis_entscheidung:benoetigte_plaetze-abgedeckt,
        hinweis:'Jedes konkrete Werkzeug einmal zuordnen. Verwendbarkeit folgt aus der bestätigten Eignung der vorgesehenen Nutzung.'};
    },{benoetigte_plaetze:8,passend_vorhanden:3,ersatz_eindeutig:2,ersatz_mehrfach_zugeordnet:2},
    {gleichzeitig_abgedeckt:6,offen_bis_entscheidung:2}),

  tool('heissluft_schublade_einsaetze_auflageflaechen',
    'Bei zwei zugelassenen Einsätzen die wirklich nutzbare Bodenfläche getrennt von der belegten Randzone vergleichen — Compare the observed usable tray surface of two compatible inserts.',
    kitchen,{
      boden_cm2:n('Tatsächlich vermessene ebene Bodenfläche des Garraums in cm².',10000),
      rand_a_cm2:n('Davon belegte oder laut Anleitung freizuhaltende Teilfläche bei Einsatz A.',10000),
      rand_b_cm2:n('Davon entsprechende Teilfläche bei Einsatz B.',10000),
      benoetigt_cm2:n('Vorab für die kalte Passprobe begründete nötige zusammenhängende Fläche.',10000),
      formen_geprueft:yn('Beide verbleibenden Flächen wurden in der benötigten Form und Aufstellung geprüft.'),
    },({boden_cm2,rand_a_cm2,rand_b_cm2,benoetigt_cm2,formen_geprueft})=>{
      if(rand_a_cm2>boden_cm2||rand_b_cm2>boden_cm2||!benoetigt_cm2) throw new RangeError();
      return {vergleichbare_varianten:formen_geprueft?
        [boden_cm2-rand_a_cm2>=benoetigt_cm2?'A':null,boden_cm2-rand_b_cm2>=benoetigt_cm2?'B':null].filter(Boolean):null,
        flaechenvorteil_a_cm2:r(rand_b_cm2-rand_a_cm2),
        hinweis:'Erfasst nur geometrische Passung. Anleitung zu zulässigen Einsätzen, Füllgrenzen und freien Luftwegen beachten.'};
    },{boden_cm2:660,rand_a_cm2:180,rand_b_cm2:230,benoetigt_cm2:460,formen_geprueft:true},
    {vergleichbare_varianten:['A'],flaechenvorteil_a_cm2:50}),

  tool('kueche_tropfablage_abgetrennte_auflagenprobe',
    'In einer kalten Abtropfprobe Wasser auf zwei Ablagen und tatsächlich in der Schale getrennt messen — Identify which observed surface contributed water outside the drip tray.',
    water,{
      in_schale_ml:n('Gemessene Menge in der dafür vorgesehenen Auffangschale.',10000),
      neben_a_ml:n('Daneben auf Ablage A unabhängig aufgefangene Menge.',10000),
      neben_b_ml:n('Daneben auf Ablage B unabhängig aufgefangene Menge.',10000),
      messung_alle_flaechen:yn('Die kalte Probe erfasste beide Ablagen und die Schale ohne Übertragung.'),
    },({in_schale_ml,neben_a_ml,neben_b_ml,messung_alle_flaechen})=>{
      const abseits=neben_a_ml+neben_b_ml,gemessen=in_schale_ml+abseits;
      return {aufgefangen_prozent:messung_alle_flaechen&&gemessen>0?r(100*in_schale_ml/gemessen):null,
        auffaelligere_nebenflaeche:messung_alle_flaechen&&neben_a_ml!==neben_b_ml?(neben_a_ml>neben_b_ml?'A':'B'):null,
        hinweis:'Vergleicht erfasste Mengen einer einzelnen Probe. Unbeobachtete Tropfen sind nicht in der Bilanz.'};
    },{in_schale_ml:120,neben_a_ml:14,neben_b_ml:6,messung_alle_flaechen:true},
    {aufgefangen_prozent:85.71,auffaelligere_nebenflaeche:'A'}),

  tool('kochtopf_gemessene_waermekapazitaet_wasser_export',
    'Die idealisierte abgegebene Wärme nur für die Wassermenge aus einer abgeschlossenen Messung berechnen — Bound the sensible heat stored in the measured water and compare it with metered input.',
    household,{
      wasser_g:n('Tatsächlich beibehaltene Wassermasse im Beobachtungsabschnitt in Gramm.',20000),
      anstieg_c:n('Gemessener Temperaturanstieg im Wasser in K ohne Siedevorgang.',90),
      eingang_wh:n('Gemessene Stromaufnahme desselben Vorgangs in Wh.',10000),
      kein_wasserverlust:yn('Die Wassermenge war näherungsweise unverändert und blieb flüssig.'),
    },({wasser_g,anstieg_c,eingang_wh,kein_wasserverlust})=>{
      if(!wasser_g||!eingang_wh) throw new RangeError();
      const ideal=wasser_g*anstieg_c*0.001163;
      return {gespeichert_wh_naeherung:kein_wasserverlust?r(ideal):null,
        input_minus_wasserwaerme_wh:kein_wasserverlust?r(eingang_wh-ideal):null,
        messabweichung_offen:kein_wasserverlust&&ideal>eingang_wh,
        hinweis:'Berechnet nur Wasserwärme aus bereits erfassten Daten. Gefäß, Wärmeverluste und Wechselwirkungen sind getrennt. Keine Wirkungsgradgarantie.'};
    },{wasser_g:1000,anstieg_c:40,eingang_wh:66,kein_wasserverlust:true},
    {gespeichert_wh_naeherung:46.52,input_minus_wasserwaerme_wh:19.48,messabweichung_offen:false}),

  tool('kuechen_spuelmittel_gesamtverbrauch_nachfuellen',
    'Bei protokollierter Nachfüllung den verbrauchten Teil einer vorhandenen Spülmittelpackung von einer reinen Bestandsänderung unterscheiden — Account for additions when measuring detergent stock use.',
    appliance,{
      anfang_g:n('Gemessene Nettomenge im dokumentierten Behälter zu Beginn in Gramm.',10000),
      nachgefuellt_g:n('Tatsächlich hinzugefügte und separat bestätigte Menge in Gramm.',10000),
      ende_g:n('Gemessene Nettomenge am Ende in Gramm.',10000),
      umgefuellt_g:n('Dazwischen für andere Zwecke entnommene oder zur Aufbewahrung umgefüllte Menge in Gramm.',10000),
    },({anfang_g,nachgefuellt_g,ende_g,umgefuellt_g})=>{
      const verbraucht=anfang_g+nachgefuellt_g-ende_g-umgefuellt_g;
      if(verbraucht<0) throw new RangeError();
      return {protokollierter_bestandsabgang_g:r(anfang_g+nachgefuellt_g-ende_g),der_nutzung_zugeordnet_g:r(verbraucht),
        hinweis:'Diese Bilanz ist keine Dosierungsangabe. Nur bekannten Bestand desselben Mittels erfassen und vorgesehene Anwendung beachten.'};
    },{anfang_g:360,nachgefuellt_g:150,ende_g:415,umgefuellt_g:35},
    {protokollierter_bestandsabgang_g:95,der_nutzung_zugeordnet_g:60}),

  tool('kuechen_dosierloeffel_stueckbedarf_stufenplan',
    'Bei zwei tatsächlich verfügbaren, für denselben kalten Stoff geprüften Löffelgrößen eine geplante Mengenstufe ohne Teilfüllung treffen — Match one quantity using measured whole dry scoops of two sizes.',
    kitchen,{
      ziel_g:n('Vorgeplante Trockenmenge in Gramm.',10000),
      klein_g:n('Gemessene Gramm eines gestrichenen kleinen Löffels.',10000),
      gross_g:n('Gemessene Gramm eines gestrichenen großen Löffels.',10000),
      max_grosse_loeffel:n('Wie viele große Löffel sollen im Vergleich höchstens eingesetzt werden?',50),
    },({ziel_g,klein_g,gross_g,max_grosse_loeffel})=>{
      whole(ziel_g,klein_g,gross_g,max_grosse_loeffel);
      if(!klein_g||gross_g<klein_g) throw new RangeError();
      const kandidaten=Array.from({length:Math.min(max_grosse_loeffel,Math.floor(ziel_g/gross_g))+1},(_,gross)=>{
        const rest=ziel_g-gross*gross_g;
        return rest%klein_g===0?{gross,klein:rest/klein_g}:null;
      }).filter(Boolean).sort((a,b)=>a.gross+a.klein-b.gross-b.klein);
      return {mit_ganzen_loeffeln_genau:kandidaten[0]??null,
        hinweis:'Gilt für einen eigenen kalten Mengentest mit vollen, gestrichenen Löffeln. Keine Medikamenten- oder Reinigungsmitteldosierung.'};
    },{ziel_g:41,klein_g:4,gross_g:11,max_grosse_loeffel:3},
    {mit_ganzen_loeffeln_genau:{gross:3,klein:2}}),

  tool('spuelgut_nutzbar_ersatz_vorrat_ausgabefolge',
    'Beim gestaffelten Bereitstellen verfügbares Geschirr um bestätigte Rückläufe ergänzen, ohne schon benutzte Stücke vorzeitig zu zählen — Allocate clean pieces across two rounds using only observed eligible returns.',
    appliance,{
      ausgang_nutzbar:n('Vor der ersten Runde nutzbare Stücke eines gleichartigen Typs.'),
      erste_runde_geplant:n('Benötigte Stücke in Runde eins.'),
      vor_runde_zwei_zurueck:n('Davon vor Runde zwei nach bestehendem Ablauf wieder nutzbar gewordene Stücke.'),
      zweite_runde_geplant:n('Benötigte Stücke in Runde zwei.'),
    },({ausgang_nutzbar,erste_runde_geplant,vor_runde_zwei_zurueck,zweite_runde_geplant})=>{
      whole(ausgang_nutzbar,erste_runde_geplant,vor_runde_zwei_zurueck,zweite_runde_geplant);
      const ausgegeben=Math.min(ausgang_nutzbar,erste_runde_geplant);
      if(vor_runde_zwei_zurueck>ausgegeben) throw new RangeError();
      return {erste_runde_offen:erste_runde_geplant-ausgegeben,
        zweite_runde_offen:positive(zweite_runde_geplant-ausgang_nutzbar+ausgegeben-vor_runde_zwei_zurueck),
        hinweis:'Nur tatsächlich wieder nutzbare Rückläufe eintragen. Keine Aussage zum Zustand ungeprüfter Stücke.'};
    },{ausgang_nutzbar:12,erste_runde_geplant:8,vor_runde_zwei_zurueck:2,zweite_runde_geplant:9},
    {erste_runde_offen:0,zweite_runde_offen:3}),

  tool('spuelmaschine_temperatur_einlauf_abschnitte',
    'Bei dokumentiert geeignetem Wasseranschluss zwei geplante Zulaufabschnitte getrennt nach gemessener Wärmemenge erfassen — Estimate measured incoming water heat across two dishwasher fill segments.',
    appliance,{
      a_l:n('Gemessene Liter der ersten Wasserentnahme.',100),
      a_anstieg_k:n('Gemessener Temperaturabstand des ersten Zulaufs zu seinem bekannten Kaltbezug in K.',90),
      b_l:n('Gemessene Liter der zweiten Wasserentnahme.',100),
      b_anstieg_k:n('Entsprechender gemessener Temperaturabstand des zweiten Zulaufs in K.',90),
      warmwasser_eignung_belegt:yn('Anschlussart ist laut Anleitung für genau dieses Gerät und diese Messung geeignet.'),
    },({a_l,a_anstieg_k,b_l,b_anstieg_k,warmwasser_eignung_belegt})=>{
      return {waerme_zulauf_wh_naeherung:warmwasser_eignung_belegt?r(1.163*(a_l*a_anstieg_k+b_l*b_anstieg_k)):null,
        mittl_anstieg_k:warmwasser_eignung_belegt&&a_l+b_l>0?r((a_l*a_anstieg_k+b_l*b_anstieg_k)/(a_l+b_l)):null,
        hinweis:'Vergleicht gemessene Wasserwärme. Heizverluste und Maschinenstrom sind andere Größen. Keine Empfehlung zur Anschlussänderung.'};
    },{a_l:4,a_anstieg_k:22,b_l:6,b_anstieg_k:13,warmwasser_eignung_belegt:true},
    {waerme_zulauf_wh_naeherung:193.06,mittl_anstieg_k:16.6}),

  tool('kontaktgrill_programmstrom_leerlauf_ohne_ausgabe',
    'Bei einer vollständigen Nutzung unproduktive gemessene Warteaufnahme als eigene Stromposition ausweisen — Report measured grill waiting energy without assuming it is avoidable.',
    meter,{
      komplett_wh:n('Messwert der ganzen Sitzung in Wh.',10000),
      warten_leerlauf_wh:n('Im Gesamtwert enthaltene und als tatsächliches Warten protokollierte Wh.',10000),
      ausgegebene_portionen:n('Zahl der tatsächlich gleichartigen ausgegebenen Portionen.'),
      protokoll_vollstaendig:yn('Sind Messanfang, Messende und Warteabschnitt eindeutig dokumentiert?'),
    },({komplett_wh,warten_leerlauf_wh,ausgegebene_portionen,protokoll_vollstaendig})=>{
      whole(ausgegebene_portionen);
      if(warten_leerlauf_wh>komplett_wh) throw new RangeError();
      return {warteanteil_prozent:protokoll_vollstaendig&&komplett_wh?r(100*warten_leerlauf_wh/komplett_wh):null,
        gemessen_wh_pro_portion:protokoll_vollstaendig&&ausgegebene_portionen?r(komplett_wh/ausgegebene_portionen):null,
        hinweis:'Nur beobachtete Abschnitte. Die Warteaufnahme ist wegen möglicher Programmpflichten nicht automatisch vermeidbar.'};
    },{komplett_wh:426,warten_leerlauf_wh:81,ausgegebene_portionen:6,protokoll_vollstaendig:true},
    {warteanteil_prozent:19.01,gemessen_wh_pro_portion:71}),

  tool('kuechenprogramm_gleiches_ende_schwankung_messen',
    'Für dieselbe Ausgabe zwei gewählte Programme nach eigener Messstreuung und kleinster belegter Differenz vergleichen — Compare observed energy ranges from repeated runs with the same outcome.',
    meter,{
      a_min_wh:n('Kleinster beobachteter Bedarf bei mehreren vollständigen Läufen A.',10000),
      a_max_wh:n('Größter beobachteter Bedarf dieser Läufe.',10000),
      b_min_wh:n('Kleinster beobachteter Bedarf bei mehreren vollständigen Läufen B.',10000),
      b_max_wh:n('Größter beobachteter Bedarf dieser Läufe.',10000),
      ergebnis_und_messaufbau_gleich:yn('Die tatsächliche Menge, das Nutzungsziel und Messgrenzen waren vergleichbar.'),
    },({a_min_wh,a_max_wh,b_min_wh,b_max_wh,ergebnis_und_messaufbau_gleich})=>{
      if(a_min_wh>a_max_wh||b_min_wh>b_max_wh) throw new RangeError();
      const diff=Math.max(b_min_wh-a_max_wh,a_min_wh-b_max_wh);
      return {bei_diesen_messungen_eindeutig_weniger:ergebnis_und_messaufbau_gleich&&diff>0?(b_min_wh>a_max_wh?'A':'B'):null,
        kleinster_abstand_wh:ergebnis_und_messaufbau_gleich?r(positive(diff)):null,
        hinweis:'Beobachtete Spannweiten sind keine Vorhersage. Nur vollständige passende Programme und gleichwertiges Ergebnis berücksichtigen.'};
    },{a_min_wh:343,a_max_wh:361,b_min_wh:370,b_max_wh:408,ergebnis_und_messaufbau_gleich:true},
    {bei_diesen_messungen_eindeutig_weniger:'A',kleinster_abstand_wh:9}),

  tool('kueche_teigformen_passprobe_getrennte_innenmasse',
    'An einer vorhandenen kalten Form zwischen nominellem Volumen und geprüftem Einsetzen eines Zubehörs unterscheiden — Check a cold insert against usable internal form dimensions.',
    kitchen,{
      gemessen_tiefe_cm:n('Kleinste vorgesehene nutzbare Tiefe der Form in cm, an der eingesetzten Höhe.'),
      gemessen_breite_cm:n('Kleinste entsprechende Innenbreite in cm.'),
      einsatz_tiefe_cm:n('Maximale äußere Tiefe des Zubehörs in dieser Stellung.'),
      einsatz_breite_cm:n('Maximale äußere Breite des Zubehörs in dieser Stellung.'),
      geprueftes_spiel_cm:n('Dokumentierter seitlicher Abstand pro Seite in cm für diese Probe.'),
    },({gemessen_tiefe_cm,gemessen_breite_cm,einsatz_tiefe_cm,einsatz_breite_cm,geprueftes_spiel_cm})=>{
      if(!einsatz_tiefe_cm||!einsatz_breite_cm) throw new RangeError();
      return {fehlende_tiefe_cm:r(positive(einsatz_tiefe_cm+2*geprueftes_spiel_cm-gemessen_tiefe_cm)),
        fehlende_breite_cm:r(positive(einsatz_breite_cm+2*geprueftes_spiel_cm-gemessen_breite_cm)),
        hinweis:'Passprobe für dieselbe kalte Stellung. Keine Freigabe für Temperatur, Garraum oder Betrieb ableiten.'};
    },{gemessen_tiefe_cm:25,gemessen_breite_cm:21,einsatz_tiefe_cm:24,einsatz_breite_cm:20.8,geprueftes_spiel_cm:0.3},
    {fehlende_tiefe_cm:0,fehlende_breite_cm:0.4}),

  tool('spuelbecken_kaltfuellung_stufenwechsel_zeitpunkt',
    'Bei zwei vermessenen Kaltwasserstufen bestimmen, in welchem beobachteten Abschnitt die geplante Beckenfüllung erreicht wurde — Locate a basin fill mark within a measured two-rate cold-water sequence.',
    water,{
      ziel_l:n('Eigene Zielmenge in Litern bis zum vorgesehenen Füllstrich.',100),
      erste_fuellung_l:n('Menge beim Wechsel von der ersten auf die zweite beobachtete Stufe.',100),
      erste_dauer_s:n('Gemessene Dauer bis zum Stufenwechsel in Sekunden.',3600),
      zweite_rate_l_min:n('Separat bei derselben Stufe gemessene Liter pro Minute.',150),
      zweite_dauer_s:n('Bis zum Ende tatsächlich erfasste Dauer der zweiten Stufe in Sekunden.',3600),
    },({ziel_l,erste_fuellung_l,erste_dauer_s,zweite_rate_l_min,zweite_dauer_s})=>{
      if(!ziel_l||!erste_dauer_s||!zweite_rate_l_min) throw new RangeError();
      const rest=ziel_l-erste_fuellung_l, zweiteMenge=zweite_rate_l_min*zweite_dauer_s/60;
      const phase=rest<=0?'erste Stufe':rest<=zweiteMenge?'zweite Stufe':null;
      return {fuellstrich_beobachteter_abschnitt:phase,
        sekunde_ab_start_fuer_zweite_stufe:phase==='zweite Stufe'?r(erste_dauer_s+60*rest/zweite_rate_l_min):null,
        noch_unter_fuellstrich_l:r(positive(rest-zweiteMenge)),
        hinweis:'Konstanter gemessener Durchfluss nur für die zweite Stufe. Für die erste Stufe ist kein genauer Zwischenzeitpunkt ableitbar.'};
    },{ziel_l:7,erste_fuellung_l:3,erste_dauer_s:26,zweite_rate_l_min:9,zweite_dauer_s:45},
    {fuellstrich_beobachteter_abschnitt:'zweite Stufe',sekunde_ab_start_fuer_zweite_stufe:52.67,noch_unter_fuellstrich_l:0}),

  tool('kochplatten_leerplatz_geschirrwechsel_uebersicht',
    'Mit zwei passenden vorhandenen Gefäßen prüfen, welches davon eine kalte Zwischenablage belegt und welches die Fläche freihält — Track cold-vessel availability through a staged cleanup.',
    kitchen,{
      gefaesse_bereit:n('Gleichartige geeignete Gefäße am Beginn.'),
      bleibt_auf_ablage:n('Davon nach dem vereinbarten Ablauf weiter belegt.'),
      in_pflege_weg:n('Weitere zur vorgesehenen Pflege entfernte Gefäße.'),
      naechster_abschnitt_benoetigt:n('Gefäße, die als Nächstes an derselben Stelle bereit sein sollen.'),
    },({gefaesse_bereit,bleibt_auf_ablage,in_pflege_weg,naechster_abschnitt_benoetigt})=>{
      whole(gefaesse_bereit,bleibt_auf_ablage,in_pflege_weg,naechster_abschnitt_benoetigt);
      if(bleibt_auf_ablage+in_pflege_weg>gefaesse_bereit) throw new RangeError();
      const frei=gefaesse_bereit-bleibt_auf_ablage-in_pflege_weg;
      return {unmittelbar_bereit:frei,erst_zu_entlasten:positive(naechster_abschnitt_benoetigt-frei),
        hinweis:'Jedes Gefäß genau einem Status zuordnen. Pausen, geeignete Abstellplätze und Pflege beibehalten.'};
    },{gefaesse_bereit:5,bleibt_auf_ablage:1,in_pflege_weg:2,naechster_abschnitt_benoetigt:3},
    {unmittelbar_bereit:2,erst_zu_entlasten:1}),

  tool('kuehlfach_behaeltertausch_gebrauchte_deckelpaare',
    'Nur tatsächlich zueinander passende Vorratsdosen und Deckel für die nächste dokumentierte Ablage zählen — Count usable container pairs by observed compatibility families.',
    appliance,{
      dosen_a:n('Geeignete Vorratsdosen mit bestätigtem Anschluss A.'),
      deckel_a:n('Passende brauchbare Deckel A.'),
      dosen_b:n('Weitere Dosen mit anderem, zu A unpassendem Anschluss B.'),
      deckel_b:n('Entsprechend passende, brauchbare Deckel B.'),
      brauche_paare:n('Vollständige für die nächste Ablage gesuchte Paare.'),
    },({dosen_a,deckel_a,dosen_b,deckel_b,brauche_paare})=>{
      whole(dosen_a,deckel_a,dosen_b,deckel_b,brauche_paare);
      const paare=Math.min(dosen_a,deckel_a)+Math.min(dosen_b,deckel_b);
      return {bestaetigte_paare:paare,fehlende_paare:positive(brauche_paare-paare),
        unpaarige_teile:dosen_a+deckel_a+dosen_b+deckel_b-2*paare,
        hinweis:'Nur eindeutig passende unbeschädigte Teile zählen. Geeignete Einsatz- und Lagerbedingungen separat prüfen.'};
    },{dosen_a:5,deckel_a:3,dosen_b:2,deckel_b:4,brauche_paare:6},
    {bestaetigte_paare:5,fehlende_paare:1,unpaarige_teile:4}),

  tool('wasserkocher_portionsprobe_mindestmengenrest',
    'Bei einer schon gemessenen Getränkezubereitung überschüssige erhitzte Menge von der vorgeschriebenen Mindestfüllung unterscheiden — Separate mandatory fill surplus from additional measured excess.',
    kitchen,{
      erhitzt_ml:n('Bereits im vorgesehenen Kocher gemessene erhitzte Wassermenge.',10000),
      benoetigt_ml:n('Gemessene Menge für dieselbe Aufgabe, einschließlich beobachteter Verluste.',10000),
      minimum_ml:n('Dokumentierte Mindestfüllung für das exakt benutzte Modell und die Anwendung.',10000),
    },({erhitzt_ml,benoetigt_ml,minimum_ml})=>{
      if(!minimum_ml||erhitzt_ml<Math.max(benoetigt_ml,minimum_ml)) throw new RangeError();
      const mindestens=Math.max(benoetigt_ml,minimum_ml);
      return {durch_mindestfuellung_mehr_ml:r(mindestens-benoetigt_ml),
        ueber_beide_grenzen_erhitzt_ml:r(erhitzt_ml-mindestens),
        hinweis:'Bilanz für diesen einen dokumentierten Lauf. Mindest- und Höchstfüllung einhalten. Keine Empfehlung zur weiteren Nutzung des Restwassers.'};
    },{erhitzt_ml:550,benoetigt_ml:265,minimum_ml:400},
    {durch_mindestfuellung_mehr_ml:135,ueber_beide_grenzen_erhitzt_ml:150}),

  tool('kueche_portionsverpackung_restmasse_ausgabe',
    'Nach getrenntem Abwiegen Menge in vollständigen, teilweise gefüllten und noch ausstehenden Portionen unterscheiden — Reconcile completed servings and partially prepared amounts by weight.',
    kitchen,{
      insgesamt_g:n('In dieser Beobachtung auszugebende Masse vor der Verteilung in Gramm.',30000),
      vollstaendig_g:n('Gemessene Masse in fertigen, gleich großen Portionen in Gramm.',30000),
      vorportioniert_g:n('Weitere bereits getrennt vorbereitete, aber unvollständige Menge in Gramm.',30000),
      regelportion_g:n('Für diesen Versuch verwendete normale Portionsmasse in Gramm.',2000),
    },({insgesamt_g,vollstaendig_g,vorportioniert_g,regelportion_g})=>{
      if(regelportion_g<1||vollstaendig_g+vorportioniert_g>insgesamt_g) throw new RangeError();
      const rest=insgesamt_g-vollstaendig_g-vorportioniert_g;
      return {nicht_zur_ausgabe_verteilt_g:r(rest),ganze_portionen_nur_aus_unverteiltem:Math.floor(rest/regelportion_g),
        hinweis:'Bezieht sich auf gewogene Ausgabe. Teilportionen gelten nur bei tatsächlich vorgesehener gleich großer Verteilung. Keine Lagervorgabe.'};
    },{insgesamt_g:1170,vollstaendig_g:600,vorportioniert_g:130,regelportion_g:150},
    {nicht_zur_ausgabe_verteilt_g:440,ganze_portionen_nur_aus_unverteiltem:2}),

  tool('kueche_messprotokoll_gemeinsamer_zaehler_zwei_pausen',
    'Zwischen zwei belegten Arbeitsabschnitten prüfen, ob beide Verbrauchswerte aus gemeinsamen kumulativen Ablesungen trennbar sind — Derive nonoverlapping kitchen-use segments from an intact meter reading sequence.',
    meter,{
      start_wh:n('Abgelesener kumulativer Messwert vor dem ersten Abschnitt in Wh.',1000000),
      zwischen_a_wh:n('Ablesung direkt nach dem Ende des ersten Abschnitts.',1000000),
      zwischen_b_wh:n('Ablesung nach der gemeinsamen Pause und vor dem zweiten Abschnitt.',1000000),
      ende_wh:n('Ablesung nach Ende des zweiten Abschnitts.',1000000),
      selbe_skala:yn('Messgerät, Zählerstandsskala und Zeitachse blieben unverändert.'),
    },({start_wh,zwischen_a_wh,zwischen_b_wh,ende_wh,selbe_skala})=>{
      if(selbe_skala&&(start_wh>zwischen_a_wh||zwischen_a_wh>zwischen_b_wh||zwischen_b_wh>ende_wh)) throw new RangeError();
      return {abschnitt_eins_wh:selbe_skala?r(zwischen_a_wh-start_wh):null,
        pause_wh:selbe_skala?r(zwischen_b_wh-zwischen_a_wh):null,
        abschnitt_zwei_wh:selbe_skala?r(ende_wh-zwischen_b_wh):null,
        hinweis:'Gemessener Bedarf der Ableseintervalle. Wenn mehrere Geräte gleichzeitig aktiv waren, ist Einzelzuordnung ohne separate Messung ungeklärt.'};
    },{start_wh:600,zwischen_a_wh:760,zwischen_b_wh:786,ende_wh:909,selbe_skala:true},
    {abschnitt_eins_wh:160,pause_wh:26,abschnitt_zwei_wh:123}),
];
