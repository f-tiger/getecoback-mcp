const guide = slug => '/guide/' + slug + '.html';
const shower = guide('duschen-kosten-rechner');
const drying = guide('waesche-trocknen-wohnung');
const floor = '/geraete-austausch-rechner.html';
const products = '/produkte.html';
const dehumidifier = guide('luftentfeuchter-ratgeber');
const n = (description,minimum,maximum) => ({type:'number',description,minimum,maximum});
const litres = description => n(description,0,150);
const minutes = description => n(description,0,1440);
const seconds = description => n(description,0,3600);
const count = description => n(description,0,500);
const flag = description => ({type:'boolean',description});
const select = (description,...values) => ({type:'string',description,enum:values});
const round = value => Math.round(value*1000)/1000;
const overlap = (a,b,c,d) => Math.max(0,Math.min(b,d)-Math.max(a,c));
function ordered(...pairs) {
  if (pairs.some(([a,b])=>b<a)) throw new RangeError('Beginn und Ende oder Unter- und Obergrenze sind vertauscht.');
}
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Stückzahlen müssen ganz sein.');
}
function tool(name,description,page,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const wasserwege = [
  tool('warmwasser_parallelzapfung_abweichungsprobe',
    'Gleichzeitige Zapfung und eigene Referenzläufe getrennt auf späteres Erreichen der Wunschtemperatur prüfen — Compare simultaneous draw with individual warm-up trials.',
    shower, {
      a_einzeln:seconds('Sekunden bis zum Wunschwert an A im Einzellauf.'), b_einzeln:seconds('Entsprechender Einzellauf an B.'),
      a_parallel:seconds('Sekunden bis zum Wunschwert an A bei gleichzeitiger Entnahme.'), b_parallel:seconds('Entsprechender paralleler Lauf an B.'),
      bedingungen_gleich:flag('Waren vorherige Nutzungen, Zielwerte und beobachtete Zapfeinstellungen je Stelle vergleichbar?')
    }, ({a_einzeln,b_einzeln,a_parallel,b_parallel,bedingungen_gleich}) => ({
      delta_a_s:bedingungen_gleich?a_parallel-a_einzeln:null,delta_b_s:bedingungen_gleich?b_parallel-b_einzeln:null,
      protokoll:bedingungen_gleich?'zeiten_vergleichen':'referenz_wiederholen',
      hinweis:'Gilt für diese Zapfversuche. Eine technische Ursache oder zulässige Belastung lässt sich daraus nicht bestimmen.'
    }), {a_einzeln:18,b_einzeln:24,a_parallel:35,b_parallel:30,bedingungen_gleich:true}, {delta_a_s:17,delta_b_s:6}),

  tool('warmwasser_erholung_zwei_gepruefte_pausen',
    'Kürzere der beobachteten brauchbaren Erholungspausen vor einer Folgeentnahme auswählen — Pick the shortest observed acceptable recovery gap.',
    shower, {
      kurze_pause_min:minutes('Kürzerer getesteter Abstand nach derselben Vorentnahme.'),
      lange_pause_min:minutes('Längerer getesteter Abstand.'),
      kurz_ziel_erreicht:flag('Ziel während der ganzen Folgeentnahme nach kurzer Pause beobachtet?'),
      lang_ziel_erreicht:flag('Ziel während der ganzen Folgeentnahme nach langer Pause beobachtet?'),
      gleiche_versuche:flag('Vorentnahme, Folgeentnahme und gewähltes Ziel waren vergleichbar.')
    }, ({kurze_pause_min,lange_pause_min,kurz_ziel_erreicht,lang_ziel_erreicht,gleiche_versuche}) => {
      ordered([kurze_pause_min,lange_pause_min]);
      const uneinheitlich=kurz_ziel_erreicht&&!lang_ziel_erreicht ||
        kurze_pause_min===lange_pause_min&&kurz_ziel_erreicht!==lang_ziel_erreicht;
      return {kuerzeste_brauchbare_probe_min:!gleiche_versuche||uneinheitlich?null:
        kurz_ziel_erreicht?kurze_pause_min:lang_ziel_erreicht?lange_pause_min:null,
        wiederholen:!gleiche_versuche||uneinheitlich,
        hinweis:'Die kürzeste brauchbare Probe ist nur ein beobachteter Abstand. Andere Entnahmen oder vorherige Nutzungen können das Ergebnis ändern.'};
    }, {kurze_pause_min:20,lange_pause_min:45,kurz_ziel_erreicht:false,lang_ziel_erreicht:true,gleiche_versuche:true},
    {kuerzeste_brauchbare_probe_min:45,wiederholen:false}),

  tool('warmwasser_nutzungsfolge_festtermine_tausch',
    'Zwei bereits beobachtete Reihenfolgen für verschiedene Warmwassernutzungen gegen feste Termine prüfen — Fit two measured use orders to actual household deadlines.',
    shower, {
      start:minutes('Frühester Start, Minuten seit Mitternacht.'),
      a_frist:minutes('Spätestes Ende der Nutzung A.'), b_frist:minutes('Spätestes Ende der Nutzung B.'),
      a_dauer:minutes('Dauer von A ohne Pause.'), b_dauer:minutes('Dauer von B ohne Pause.'),
      pause_a_b:minutes('Bei dieser A–B-Folge beobachteter brauchbarer Abstand.'),
      pause_b_a:minutes('Bei der umgekehrten Folge beobachteter brauchbarer Abstand.'),
      beide_proben_passend:flag('Wurden beide Folgen bei vergleichbarem Ausgangszustand vollständig beobachtet?')
    }, ({start,a_frist,b_frist,a_dauer,b_dauer,pause_a_b,pause_b_a,beide_proben_passend}) => {
      const ab=start+a_dauer<=a_frist&&start+a_dauer+pause_a_b+b_dauer<=b_frist;
      const ba=start+b_dauer<=b_frist&&start+b_dauer+pause_b_a+a_dauer<=a_frist;
      return {terminfolgen:beide_proben_passend?[ab?'a_dann_b':null,ba?'b_dann_a':null].filter(Boolean):null,
        hinweis:'Prüft Zeitplanung anhand eigener Versuche. Abstände ersetzen keine Beobachtung am tatsächlichen Termin.'};
    }, {start:420,a_frist:455,b_frist:500,a_dauer:15,b_dauer:20,pause_a_b:30,pause_b_a:22,beide_proben_passend:true},
    {terminfolgen:['a_dann_b']}),

  tool('warmwasser_neustart_standzeit_ueberfluss',
    'Bei einem unterbrochenen Nutzungsvorgang zusätzlichen Anlauf vom ersten Anlauf trennen — Isolate restart run-up from the original draw.',
    shower, {
      erster_anlauf_l:litres('Gemessene Menge bis zum ersten Erreichen des Wunschwerts.'),
      wiederanlauf_l:litres('Gemessene Menge bis zur Wiederkehr dieses Werts nach der Pause.'),
      geplant_zweck_l:litres('Bei diesem Wiederanlauf tatsächlich anderweitig sinnvoll genutzte Menge.'),
      pause_min:minutes('Beobachtete Zeit, in der die Entnahme geschlossen war.')
    }, ({erster_anlauf_l,wiederanlauf_l,geplant_zweck_l,pause_min}) => {
      if (geplant_zweck_l>wiederanlauf_l) throw new RangeError('Genutzte Menge übersteigt den Wiederanlauf.');
      return {beide_anlaeufe_l:round(erster_anlauf_l+wiederanlauf_l),
        wiederanlauf_ohne_weitere_nutzung_l:round(wiederanlauf_l-geplant_zweck_l),beobachtete_pause_min:pause_min,
        hinweis:'Nur gemessene Volumina zählen. Die Pause und der Zweck beschreiben diesen Ablauf.'};
    }, {erster_anlauf_l:2.5,wiederanlauf_l:1.5,geplant_zweck_l:0.4,pause_min:8},
    {beide_anlaeufe_l:4,wiederanlauf_ohne_weitere_nutzung_l:1.1,beobachtete_pause_min:8}),

  tool('warmwasser_nutzfenster_profil_unterbrechung',
    'Bei gemessenem Warmwasserprofil nutzbare zusammenhängende Phasen von einer Unterbrechung trennen — Check continuous usability across a recorded temperature interruption.',
    shower, {
      erster_beginn:seconds('Erstes Erreichen des Wunschbereichs ab Start.'),
      erstes_ende:seconds('Ende der ersten lückenlos beobachteten Phase im Wunschbereich.'),
      zweiter_beginn:seconds('Erneutes Erreichen des Bereichs.'), zweites_ende:seconds('Ende der zweiten lückenlos beobachteten Phase.'),
      mindestdauer:seconds('Selbst gewählte notwendige Dauer eines zusammenhängenden Abschnitts.'),
      vermerk_durchgaengig:flag('Wurden beide durchgängigen Abschnitte statt nur Einzelwerte beobachtet?')
    }, ({erster_beginn,erstes_ende,zweiter_beginn,zweites_ende,mindestdauer,vermerk_durchgaengig}) => {
      ordered([erster_beginn,erstes_ende],[erstes_ende,zweiter_beginn],[zweiter_beginn,zweites_ende]);
      const laengster=Math.max(erstes_ende-erster_beginn,zweites_ende-zweiter_beginn);
      return {unterbrechung_s:vermerk_durchgaengig?zweiter_beginn-erstes_ende:null,
        zusammenhaengend_s:vermerk_durchgaengig?laengster:null,wunschdauer_beobachtet:vermerk_durchgaengig?laengster>=mindestdauer:null,
        hinweis:'Nur das dokumentierte Temperaturziel wird betrachtet. Zeitpunkt und Nutzung beim Wiederholen abgleichen.'};
    }, {erster_beginn:20,erstes_ende:100,zweiter_beginn:130,zweites_ende:260,mindestdauer:140,vermerk_durchgaengig:true},
    {unterbrechung_s:30,zusammenhaengend_s:130,wunschdauer_beobachtet:false}),

  tool('warmwasser_folgezapfung_ungeplante_entnahme',
    'Abweichende Warmwasserprobe mit einer dazwischen gemeldeten Nutzung markieren — Identify contaminated repeat trials with an intervening draw.',
    shower, {
      referenz_vorher_ende:minutes('Ende der vorgesehenen Referenz-Vorentnahme.'),
      folge_ab:minutes('Beginn der geplanten Folgeprobe am selben Tag.'),
      weiterer_beginn:minutes('Bekannter Beginn der zusätzlichen Entnahme.'),
      weiteres_ende:minutes('Ende der zusätzlichen Entnahme.'),
      gleiche_versorgung_bestaetigt:flag('Ist beim Vergleich dieselbe gemeinsam genutzte Warmwasserversorgung bestätigt?')
    }, ({referenz_vorher_ende,folge_ab,weiterer_beginn,weiteres_ende,gleiche_versorgung_bestaetigt}) => {
      ordered([referenz_vorher_ende,folge_ab],[weiterer_beginn,weiteres_ende]);
      return {pause_mit_weiterer_entnahme_min:gleiche_versorgung_bestaetigt?
        overlap(referenz_vorher_ende,folge_ab,weiterer_beginn,weiteres_ende):null,
        hinweis:'Markiert einen Unterschied im Versuchsablauf. Die Minute beschreibt keine entzogene Wärme.'};
    }, {referenz_vorher_ende:420,folge_ab:450,weiterer_beginn:445,weiteres_ende:455,gleiche_versorgung_bestaetigt:true},
    {pause_mit_weiterer_entnahme_min:5}),

  tool('duschprotokoll_timer_trockenphasen_anteil',
    'Wasserlaufzeiten aus einer Duschzeituhr mit zwei belegten Trockenphasen rekonstruieren — Subtract verified water-off phases from an elapsed timer.',
    shower, {
      timer_s:seconds('Gesamtdauer des gestarteten Timers.'),
      aus_a_ab:seconds('Beginn der ersten vollständig wasserfreien Phase ab Timerstart.'), aus_a_bis:seconds('Ende der ersten Phase.'),
      aus_b_ab:seconds('Beginn der zweiten wasserfreien Phase.'), aus_b_bis:seconds('Ende der zweiten Phase.'),
      alle_stopps_erfasst:flag('Sind sämtliche vollständig geschlossenen Phasen in diesen Zeiten enthalten?')
    }, ({timer_s,aus_a_ab,aus_a_bis,aus_b_ab,aus_b_bis,alle_stopps_erfasst}) => {
      ordered([aus_a_ab,aus_a_bis],[aus_b_ab,aus_b_bis],[Math.max(aus_a_bis,aus_b_bis),timer_s]);
      const trocken=aus_a_bis-aus_a_ab+aus_b_bis-aus_b_ab-overlap(aus_a_ab,aus_a_bis,aus_b_ab,aus_b_bis);
      return {erfasst_wasserfrei_s:trocken,rekonstruierter_wasserlauf_s:alle_stopps_erfasst?timer_s-trocken:null,
        hinweis:'Die Rechnung liefert Wasserlaufzeit. Bei wechselndem Durchfluss muss die Wassermenge unabhängig gemessen werden.'};
    }, {timer_s:480,aus_a_ab:120,aus_a_bis:180,aus_b_ab:170,aus_b_bis:250,alle_stopps_erfasst:true},
    {erfasst_wasserfrei_s:130,rekonstruierter_wasserlauf_s:350}),

  tool('duschstart_wasseraufteilung_start_zweck_ablauf',
    'Gemessenen Anlauf einer Dusche zwischen separat genutztem und nicht aufgefangenem Wasser aufteilen — Reconcile measured run-up, secondary use and uncaptured water.',
    shower, {
      gesamt_anlauf_l:litres('Gesamte gemessene Anlaufmenge derselben Entnahme.'),
      genutzt_l:litres('Aufgefangene Menge, die tatsächlich für den vorgesehenen anderen Zweck eingesetzt wurde.'),
      noch_im_gefaess_l:litres('Aufgefangener Anteil, der zum Protokollstichtag noch im Gefäß war.'),
      spaeter_abgeleitet_l:litres('Zuerst aufgefangenes und anschließend ohne andere Nutzung abgegebenes Wasser.'),
      gleiche_entnahme:flag('Gehören alle Mengen zur gleichen gemessenen Entnahme?')
    }, ({gesamt_anlauf_l,genutzt_l,noch_im_gefaess_l,spaeter_abgeleitet_l,gleiche_entnahme}) => {
      const aufgefangen=genutzt_l+noch_im_gefaess_l+spaeter_abgeleitet_l;
      if (gleiche_entnahme&&aufgefangen>gesamt_anlauf_l+1e-9) throw new RangeError('Teilmengen übersteigen den Anlauf.');
      return {nicht_aufgefangen_l:gleiche_entnahme?round(Math.max(0,gesamt_anlauf_l-aufgefangen)):null,
        nach_auffangen_abgeleitet_l:gleiche_entnahme?spaeter_abgeleitet_l:null,
        andere_nutzung_bestaetigt_l:gleiche_entnahme?genutzt_l:null,
        hinweis:'Rest im Gefäß bleibt als Bestand getrennt. Der Zweck und die Eignung dafür werden vor Ort entschieden.'};
    }, {gesamt_anlauf_l:5.4,genutzt_l:3,noch_im_gefaess_l:0.9,spaeter_abgeleitet_l:0.5,gleiche_entnahme:true},
    {nicht_aufgefangen_l:1,nach_auffangen_abgeleitet_l:0.5,andere_nutzung_bestaetigt_l:3}),

  tool('dusche_ablauf_hilfe_raumbelegung_puffer',
    'Duschzeit, geplante Unterstützung und anschließende Raumfreigabe in einem belegten Zeitfenster abstimmen — Align an assisted shower routine with the room’s booked handover.',
    shower, {
      raum_ab:minutes('Beginn der alleine für diesen Ablauf verfügbaren Raumzeit.'),
      raum_bis:minutes('Verbindliches Ende der Raumzeit.'),
      hilfe_ab:minutes('Zugesagte Hilfe ab Minute.'), hilfe_bis:minutes('Zugesagte Hilfe bis Minute.'),
      gemeinsam_min:minutes('Mit der beteiligten Person vereinbarte Dauer, in der beide anwesend sein müssen.'),
      danach_frei_min:minutes('Eingeplante Minuten nach dieser Phase bis zur Zimmerfreigabe.')
    }, ({raum_ab,raum_bis,hilfe_ab,hilfe_bis,gemeinsam_min,danach_frei_min}) => {
      ordered([raum_ab,raum_bis],[hilfe_ab,hilfe_bis]);
      const start=Math.max(raum_ab,hilfe_ab);
      const letzter=Math.min(hilfe_bis,raum_bis-danach_frei_min);
      const nutzbar=Math.max(0,letzter-start);
      return {gemeinsam_verfuegbar_min:nutzbar,fehlend_min:Math.max(0,gemeinsam_min-nutzbar),
        hinweis:'Termine und gewünschte Unterstützung vor Ort abstimmen. Der Plan beurteilt keine individuelle Unterstützungseignung.'};
    }, {raum_ab:440,raum_bis:490,hilfe_ab:450,hilfe_bis:480,gemeinsam_min:30,danach_frei_min:15},
    {gemeinsam_verfuegbar_min:25,fehlend_min:5}),

  tool('duschkopf_alltagsprobe_pause_weiterlauf_getrennt',
    'Beim Vergleich zweier Duschabläufe Mehrwasser nach einer Pause vom normalen Wasserlauf trennen — Separate restart volume from the in-use change in a matched trial.',
    shower, {
      a_gesamt_l:litres('Gemessene Gesamtmenge A.'), b_gesamt_l:litres('Gemessene Gesamtmenge B.'),
      a_neustart_l:litres('In A gemessene Teilmenge vom Wiederöffnen bis zum Nutzungsstart.'),
      b_neustart_l:litres('Entsprechende Teilmenge B.'),
      gleicher_ablauf:flag('Waren Aufgabe, anfänglicher Start und Zahl der Pausen vergleichbar?')
    }, ({a_gesamt_l,b_gesamt_l,a_neustart_l,b_neustart_l,gleicher_ablauf}) => {
      if (a_neustart_l>a_gesamt_l||b_neustart_l>b_gesamt_l) throw new RangeError('Neustart zählt als Teilmenge.');
      return {zusatz_neustart_b_l:gleicher_ablauf?round(b_neustart_l-a_neustart_l):null,
        delta_ohne_neustart_b_l:gleicher_ablauf?round((b_gesamt_l-b_neustart_l)-(a_gesamt_l-a_neustart_l)):null,
        hinweis:'Vergleicht gemessene Teilmengen. Daraus ergibt sich keine allgemeine Durchflussangabe für den Duschkopf.'};
    }, {a_gesamt_l:37,b_gesamt_l:36,a_neustart_l:1,b_neustart_l:3,gleicher_ablauf:true},
    {zusatz_neustart_b_l:2,delta_ohne_neustart_b_l:-3}),

  tool('warmwasser_erste_probe_dauer_ausschluss_unnotiert',
    'Eine protokollierte Warmwasserwartezeit mit nachträglich bekannt gewordener Timer-Vorlaufzeit korrigieren — Restore elapsed run-up from deliberate or accidental timer lead.',
    shower, {
      timerstart:seconds('Timerstart auf einer gemeinsamen Sekundenskala.'),
      oeffnen_fruehestens:seconds('Frühester anhand der Aufzeichnung erkennbarer Moment des Öffnens.'),
      oeffnen_spaetestens:seconds('Spätester anhand der Aufzeichnung erkennbarer Moment.'),
      ziel:seconds('Dokumentierter Zeitpunkt, an dem der gewählte Zustand erstmals beobachtet wurde.'),
      gleiche_aufzeichnung:flag('Stammen alle vier Zeitpunkte aus derselben durchgehenden Aufzeichnung?')
    }, ({timerstart,oeffnen_fruehestens,oeffnen_spaetestens,ziel,gleiche_aufzeichnung}) => {
      ordered([timerstart,oeffnen_fruehestens],[oeffnen_fruehestens,oeffnen_spaetestens],[oeffnen_spaetestens,ziel]);
      return {anlaufband_s:gleiche_aufzeichnung?[ziel-oeffnen_spaetestens,ziel-oeffnen_fruehestens]:null,
        timer_roh_s:gleiche_aufzeichnung?ziel-timerstart:null,
        hinweis:'Das Band entsteht allein aus den sichtbaren Zeitmarken. Zwischen unverbundenen Aufzeichnungen erneut messen.'};
    }, {timerstart:5,oeffnen_fruehestens:12,oeffnen_spaetestens:15,ziel:43,gleiche_aufzeichnung:true},
    {anlaufband_s:[28,31],timer_roh_s:38}),

  tool('gefaess_refill_zwei_abnehmer_verlustreserve',
    'Zwei belegte Füllmengen an Zielorten aus dem Vorrat nach eigenen Umfüllverlusten reservieren — Reserve source volume for two measured transfer routes.',
    products, {
      bereit_l:litres('Verfügbarer gemessener Startbestand.'),
      ziel_a_l:litres('Am ersten Ziel benötigte ankommende Menge.'),
      ziel_b_l:litres('Am zweiten Ziel benötigte ankommende Menge.'),
      verlust_a_l:litres('Zusätzlich im erprobten Gefäß und beim Umfüllen zu Ziel A verbleibende Menge.'),
      verlust_b_l:litres('Entsprechende Menge für Ziel B.'),
      routen_erprobt:flag('Sind beide Verlustmengen auf der vorgesehenen Route erprobt?')
    }, ({bereit_l,ziel_a_l,ziel_b_l,verlust_a_l,verlust_b_l,routen_erprobt}) => {
      const delta=bereit_l-ziel_a_l-ziel_b_l-verlust_a_l-verlust_b_l;
      return {reserve_l:routen_erprobt?round(delta):null,beide_zielmengen_planbar:routen_erprobt?delta>=-1e-9:null,
        hinweis:'Bei Restmengen aus getrennten Routen auf einen gemeinsamen Messumfang achten.'};
    }, {bereit_l:12,ziel_a_l:5,ziel_b_l:6,verlust_a_l:0.3,verlust_b_l:1,routen_erprobt:true},
    {reserve_l:-0.3,beide_zielmengen_planbar:false}),

  tool('gefaess_umfuellen_zwischenrest_ruecklauf',
    'Transportrest beim Zwischengefäß von bewusst zurückgebrachtem Volumen trennen — Account for heel volume separately from liquid carried back.',
    products, {
      start_l:litres('Am Start in das Transportgefäß gefüllte Menge.'),
      ziel_l:litres('Am Ziel tatsächlich abgegebene Menge.'),
      ruecklauf_l:litres('Tatsächlich in den Startbehälter zurückgegebener Rest.'),
      bodensatz_l:litres('Separat gemessener Rest im Transportgefäß nach der Rückgabe.')
    }, ({start_l,ziel_l,ruecklauf_l,bodensatz_l}) => {
      const summe=ziel_l+ruecklauf_l+bodensatz_l;
      if (summe>start_l+1e-9) throw new RangeError('Abgabe, Rücklauf und Rest sind größer als die Startmenge.');
      return {nicht_zugeordnet_l:round(Math.max(0,start_l-summe)),aus_startbestand_entnommen_l:round(start_l-ruecklauf_l),
        hinweis:'Nur denselben Vorgang auswerten. Nicht zugeordnete Menge ist eine Differenz, kein belegter Verlustort.'};
    }, {start_l:8,ziel_l:5,ruecklauf_l:2,bodensatz_l:0.3}, {nicht_zugeordnet_l:0.7,aus_startbestand_entnommen_l:6}),

  tool('wassertransport_relais_zwei_personen_uebergabe',
    'Übergabe eines vorgesehenen Wassergefäßes zwischen zwei Personen mit beider Zeitfenstern prüfen — Fit a measured two-person handoff to both schedules.',
    products, {
      ankunft_a:minutes('Beobachtet erreichbare Ankunft am vereinbarten Übergabeort.'),
      a_bis:minutes('Bis wann Person A am selben Tag am Ort bleiben kann.'),
      b_ab:minutes('Frühestes Eintreffen von Person B.'), b_bis:minutes('Spätester Aufbruch von Person B.'),
      uebergabe_min:minutes('Vor Ort beobachtete Dauer der Übergabe einschließlich Abstellen.'),
      uebergabeort_geprueft:flag('Sind der Ort, geeignete Gefäße und die Handhabung bei der tatsächlichen Füllung bestätigt?')
    }, ({ankunft_a,a_bis,b_ab,b_bis,uebergabe_min,uebergabeort_geprueft}) => {
      ordered([ankunft_a,a_bis],[b_ab,b_bis]);
      const gemeinsam=overlap(ankunft_a,a_bis,b_ab,b_bis);
      return {gemeinsame_min:gemeinsam,fehlend_min:uebergabeort_geprueft?Math.max(0,uebergabe_min-gemeinsam):null,
        hinweis:'Der Zeitabgleich ersetzt die örtliche Prüfung der Handhabung nicht.'};
    }, {ankunft_a:615,a_bis:640,b_ab:630,b_bis:660,uebergabe_min:12,uebergabeort_geprueft:true},
    {gemeinsame_min:10,fehlend_min:2}),

  tool('wassertragen_mehrweg_kleine_fuellungen_zeit',
    'Zwei vor Ort geprüfte Tragewege mit verschieden großen Füllungen nach erledigten Gängen vergleichen — Compare trips and time with route-specific carried volumes.',
    products, {
      aufgabe_l:litres('Insgesamt zu transportierende Menge ohne Zusatzaufgabe am Ziel.'),
      a_pro_gang_l:n('Erprobte Füllmenge je Gang über A in Litern.',0.01,150),
      b_pro_gang_l:n('Erprobte Füllmenge je Gang über B in Litern.',0.01,150),
      a_umlauf_s:seconds('Gemessene Dauer von Füllen, Tragen, Abgeben und Rückweg bei A.'),
      b_umlauf_s:seconds('Gemessene Dauer eines vollständigen Umlaufs bei B.'),
      a_letzter_s:seconds('Gemessene Dauer des letzten Gangs ohne Rückweg bei A.'),
      b_letzter_s:seconds('Entsprechende Dauer bei B.'), wege_geprueft:flag('Sind beide Wege und die Handhabung mit der jeweiligen Füllung erprobt?')
    }, ({aufgabe_l,a_pro_gang_l,b_pro_gang_l,a_umlauf_s,b_umlauf_s,a_letzter_s,b_letzter_s,wege_geprueft}) => {
      const gaenge=menge=>aufgabe_l===0?0:Math.max(1,Math.ceil(aufgabe_l/menge-1e-9));
      const dauer=(zahl,umlauf,letzter)=>zahl?((zahl-1)*umlauf+letzter):0;
      return {a_gaenge:wege_geprueft?gaenge(a_pro_gang_l):null,b_gaenge:wege_geprueft?gaenge(b_pro_gang_l):null,
        a_dauer_s:wege_geprueft?dauer(gaenge(a_pro_gang_l),a_umlauf_s,a_letzter_s):null,
        b_dauer_s:wege_geprueft?dauer(gaenge(b_pro_gang_l),b_umlauf_s,b_letzter_s):null,
        hinweis:'Die letzte Teilfüllung wird wie die beobachtete letzte Strecke geplant. Persönliche Tragegrenzen vor Ort beachten.'};
    }, {aufgabe_l:9,a_pro_gang_l:3,b_pro_gang_l:5,a_umlauf_s:60,b_umlauf_s:90,a_letzter_s:35,b_letzter_s:70,wege_geprueft:true},
    {a_gaenge:3,b_gaenge:2,a_dauer_s:155,b_dauer_s:160}),

  tool('wassertransport_kurven_duo_oder_einzelgefaess',
    'Bei zwei Engstellen prüfen, ob zwei Gefäße gemeinsam durch die gemessene Route passen — Decide whether to stage two vessels together or carry them separately.',
    products, {
      gang_a_cm:n('Nutzbare Breite an der ersten Engstelle.',0,500),
      gang_b_cm:n('Nutzbare Breite an der zweiten Engstelle.',0,500),
      einzel_cm:n('Größte gemessene Breite eines Gefäßes mit der erprobten Handhabung.',0,500),
      duo_cm:n('Gemessene Gesamtbreite beider Gefäße in der gemeinsamen Handhabung.',0,500),
      zusatz_cm:n('Vor Ort selbst gewählter zusätzlicher Platzbedarf für den Weg.',0,100),
      kurven_erprobt:flag('Wurden Drehungen, Schwellen und Handhabung separat vor Ort erprobt?')
    }, ({gang_a_cm,gang_b_cm,einzel_cm,duo_cm,zusatz_cm,kurven_erprobt}) => {
      ordered([einzel_cm,duo_cm]);
      const schmal=Math.min(gang_a_cm,gang_b_cm);
      return {engste_stelle_cm:schmal,abmessung:duo_cm+zusatz_cm<=schmal?'duo':einzel_cm+zusatz_cm<=schmal?'einzeln':'keine_option',
        vor_ort_weiter_pruefen:!kurven_erprobt,
        hinweis:'Die Breite allein erfasst weder Kurven noch Gewicht oder Handhabung gefüllter Gefäße.'};
    }, {gang_a_cm:85,gang_b_cm:64,einzel_cm:28,duo_cm:64,zusatz_cm:6,kurven_erprobt:false},
    {engste_stelle_cm:64,abmessung:'einzeln',vor_ort_weiter_pruefen:true}),

  tool('nachfuellstelle_quellwechsel_wegezeit_anlauf',
    'Eine vertraute und eine nähere Nachfüllstelle nach gemessener Startmenge und kompletter Wegzeit vergleichen — Compare water run-up and travel for two verified refill points.',
    shower, {
      a_weg_s:seconds('Erprobte notwendige Wegzeit über A.'), b_weg_s:seconds('Wegzeit über B.'),
      a_fuell_s:seconds('Gemessene Gesamtzeit vom Öffnen bis zur Zielmenge bei A.'), b_fuell_s:seconds('Entsprechende Gesamtzeit bei B.'),
      a_anlauf_l:litres('Bei A gemessene Menge vor der vorgesehenen Entnahme.'), b_anlauf_l:litres('Entsprechende Anfangsmenge bei B.'),
      ziel_und_nutzung_gleich:flag('Gleicher bestätigter Zweck und gleiche benötigte Zielmenge an beiden Stellen?')
    }, ({a_weg_s,b_weg_s,a_fuell_s,b_fuell_s,a_anlauf_l,b_anlauf_l,ziel_und_nutzung_gleich}) => ({
      zeit_b_minus_a_s:ziel_und_nutzung_gleich?b_weg_s+b_fuell_s-a_weg_s-a_fuell_s:null,
      wasser_vorlauf_b_minus_a_l:ziel_und_nutzung_gleich?round(b_anlauf_l-a_anlauf_l):null,
      hinweis:'Wegzeit und Anlaufmenge getrennt bewerten. Freigabe der Entnahmestelle für den Zweck vorab klären.'
    }), {a_weg_s:55,b_weg_s:18,a_fuell_s:32,b_fuell_s:60,a_anlauf_l:1,b_anlauf_l:4,ziel_und_nutzung_gleich:true},
    {zeit_b_minus_a_s:-9,wasser_vorlauf_b_minus_a_l:3}),

  tool('wassergefaess_leergut_fuellrunde_bestandsgrenze',
    'Vor einer Nachfüllrunde fehlende passende Leergefäße für zwei getrennte Verwendungen erkennen — Count missing returned vessels by their designated use.',
    products, {
      a_benoetigt:count('Für Zweck A zur Nachfüllung benötigte, vorher eindeutig zugeordnete Gefäße.'),
      b_benoetigt:count('Für Zweck B benötigte Gefäße.'),
      a_leer_zurueck:count('Vor Beginn passend zurückgekehrte leere Gefäße für A.'),
      b_leer_zurueck:count('Passend zurückgekehrte Gefäße für B.'),
      unzugeordnet:count('Zusätzlich vorhandene Gefäße ohne bestätigte Zuordnung.')
    }, ({a_benoetigt,b_benoetigt,a_leer_zurueck,b_leer_zurueck,unzugeordnet}) => {
      whole(a_benoetigt,b_benoetigt,a_leer_zurueck,b_leer_zurueck,unzugeordnet);
      return {fehlend_a:Math.max(0,a_benoetigt-a_leer_zurueck),fehlend_b:Math.max(0,b_benoetigt-b_leer_zurueck),
        vor_zuteilung_pruefen:unzugeordnet,
        hinweis:'Gefäße ohne bestätigten Zweck bleiben getrennt. Die Einteilung bestätigt keine Eignung für Trinkwasser.'};
    }, {a_benoetigt:4,b_benoetigt:3,a_leer_zurueck:2,b_leer_zurueck:4,unzugeordnet:1},
    {fehlend_a:2,fehlend_b:0,vor_zuteilung_pruefen:1}),

  tool('wasserroute_zwischenablage_fuellgefaesse_puffer',
    'Eine Zwischenablage für ankommende und fertig abgeholte Wassergefäße getrennt bilanzieren — Find peak staging demand from known placements and pickups.',
    products, {
      plaetze:count('Vor Ort bestätigte getrennte Plätze für die konkret erprobten Gefäße.'),
      start:count('Am Anfang bereits belegte Plätze.'),
      ankunft_a:count('Gefäße aus erster Ankunft.'), abholung:count('Vor zweiter Ankunft tatsächlich abgeholte Gefäße.'),
      ankunft_b:count('Gefäße aus zweiter Ankunft.')
    }, ({plaetze,start,ankunft_a,abholung,ankunft_b}) => {
      whole(plaetze,start,ankunft_a,abholung,ankunft_b);
      const nach_a=start+ankunft_a;
      if (abholung>nach_a) throw new RangeError('Abholung übersteigt den Zwischenbestand.');
      const nach_b=nach_a-abholung+ankunft_b;
      const spitze=Math.max(nach_a,nach_b);
      return {spitzenbelegung:spitze,fehlende_plaetze:Math.max(0,spitze-plaetze),vor_abholung_zuerst: nach_a>=nach_b,
        hinweis:'Nur mit einzeln bestätigten Stellplätzen planen. Die Rechnung prüft weder Tragfähigkeit noch Kippsicherheit.'};
    }, {plaetze:5,start:2,ankunft_a:4,abholung:3,ankunft_b:2},
    {spitzenbelegung:6,fehlende_plaetze:1,vor_abholung_zuerst:true}),

  tool('fenstersauger_unterkante_auffangprobe_verlagerung',
    'Bei zwei vergleichbaren Fensterläufen Wasser im Gerät und Tropfen unter dem Rahmen getrennt beurteilen — Check whether a change merely moves captured water out of the tank.',
    products, {
      tank_a_ml:n('Gemessene Wassermenge im Tank nach A in Millilitern.',0,3000),
      tank_b_ml:n('Tankmenge nach B.',0,3000),
      unten_a_ml:n('Separat gemessene Auffangmenge unter der Kante in A.',0,3000),
      unten_b_ml:n('Separat gemessene Auffangmenge unter der Kante in B.',0,3000),
      gleiche_flaeche_und_naesse:flag('Waren Fläche, Ausgangsnässe und Sammelgrenze gleich?')
    }, ({tank_a_ml,tank_b_ml,unten_a_ml,unten_b_ml,gleiche_flaeche_und_naesse}) => ({
      tank_b_minus_a_ml:gleiche_flaeche_und_naesse?round(tank_b_ml-tank_a_ml):null,
      unten_b_minus_a_ml:gleiche_flaeche_und_naesse?round(unten_b_ml-unten_a_ml):null,
      gesamt_erfasst_b_minus_a_ml:gleiche_flaeche_und_naesse?round(tank_b_ml+unten_b_ml-tank_a_ml-unten_a_ml):null,
      hinweis:'Nur tatsächlich aufgefangenes Wasser vergleichen. Nicht gemessene Restfeuchte bleibt offen.'
    }), {tank_a_ml:80,tank_b_ml:60,unten_a_ml:5,unten_b_ml:24,gleiche_flaeche_und_naesse:true},
    {tank_b_minus_a_ml:-20,unten_b_minus_a_ml:19,gesamt_erfasst_b_minus_a_ml:-1}),

  tool('fensterbank_tropfen_nachlauf_messgrenze',
    'Nach einer Fensterreinigung frühe und späte Tropfenmengen anhand zweier gelesener Sammelstände trennen — Split measured late drips from the initial collection.',
    products, {
      erster_stand_ml:n('Früher Stand des geleerten und danach verwendeten Sammelbehälters.',0,3000),
      spaeter_stand_ml:n('Später kumulierter Stand desselben Behälters.',0,3000),
      abstand_min:minutes('Beobachtete Minuten zwischen den Ständen.'),
      behoelter_unveraendert:flag('War der Behälter am selben Ort und blieb er ungeleert?')
    }, ({erster_stand_ml,spaeter_stand_ml,abstand_min,behoelter_unveraendert}) => {
      if (behoelter_unveraendert) ordered([erster_stand_ml,spaeter_stand_ml]);
      const delta=spaeter_stand_ml-erster_stand_ml;
      return {spaet_erfasst_ml:behoelter_unveraendert?delta:null,
        spaet_erfasst_ml_min:behoelter_unveraendert&&abstand_min>0?round(delta/abstand_min):null,
        hinweis:'Der Durchschnitt beschreibt nur den beobachteten Sammelabschnitt. Verdunstung oder ausgelassene Tropfen können den Stand verändern.'};
    }, {erster_stand_ml:30,spaeter_stand_ml:42,abstand_min:8,behoelter_unveraendert:true},
    {spaet_erfasst_ml:12,spaet_erfasst_ml_min:1.5}),

  tool('entfeuchter_tankereignis_protokoll_zweistand',
    'Tankstände vor und nach einem bestätigten Ereignis auf getrennte Füllabschnitte prüfen — Distinguish continued fill from logged emptying between two readings.',
    dehumidifier, {
      vorher_l:litres('Erster gelesener Tankstand im selben Gerät.'),
      nachher_l:litres('Späterer gelesener Stand im selben Tank.'),
      messintervall_zustand:select('Bekannter Zustand zwischen den Messungen.','keine_leerung','vollstaendig_gemessen_geleert','unklar'),
      ausgeleert_l:litres('Bei vollständig gemessenen Leerungen insgesamt erfasste Liter. Bei bestätigter Nichtleerung 0.')
    }, ({vorher_l,nachher_l,messintervall_zustand,ausgeleert_l}) => {
      if (messintervall_zustand==='keine_leerung'&&ausgeleert_l>0) throw new RangeError('Leermenge passt nicht zum gemeldeten Zustand.');
      const delta=nachher_l-vorher_l+ausgeleert_l;
      return {neu_gesammelt_l:messintervall_zustand!=='unklar'&&delta>=-1e-9?round(Math.max(0,delta)):null,
        protokoll_luecke:messintervall_zustand==='unklar'||delta<-1e-9,
        hinweis:'Bestandsrechnung über denselben Tank. Bei unklarem Ereignis Leerung oder Messstand zuerst verifizieren.'};
    }, {vorher_l:2.1,nachher_l:0.6,messintervall_zustand:'vollstaendig_gemessen_geleert',ausgeleert_l:2.4},
    {neu_gesammelt_l:0.9,protokoll_luecke:false}),

  tool('entfeuchter_beobachtung_sammelgefaess_wechselkennung',
    'Nach Wechsel eines externen Messgefäßes die gültige Skala für zwei abgelesene Werte belegen — Match readings to the correct collection vessel mark after a change.',
    dehumidifier, {
      a_passend:flag('Zuordnung der ersten Ablesung zum beschrifteten Messgefäß bestätigt?'),
      b_passend:flag('Zuordnung der zweiten Ablesung bestätigt?'),
      neue_skala:flag('Wurde das Gefäß mit einer anderen Skala verwendet?'),
      neue_kalibrierung:flag('Wurde die Volumenablesung am Ersatzgefäß unabhängig geprüft?'),
      a_l:litres('Erstes gelesene Volumen.'), b_l:litres('Zweites gelesene Volumen.')
    }, ({a_passend,b_passend,neue_skala,neue_kalibrierung,a_l,b_l}) => {
      const b_gueltig=b_passend&&(!neue_skala||neue_kalibrierung);
      return {gesichert_l:round((a_passend?a_l:0)+(b_gueltig?b_l:0)),
        offene_ablesungen:[!a_passend?'a':null,!b_gueltig?'b':null].filter(Boolean),
        hinweis:'Nur separat vollständig gesammelte Abschnitte addieren. Die Prüfung betrifft die Messskala, nicht einen Geräteablauf.'};
    }, {a_passend:true,b_passend:true,neue_skala:true,neue_kalibrierung:false,a_l:0.7,b_l:0.9},
    {gesichert_l:0.7,offene_ablesungen:['b']}),

  tool('dampfreiniger_nachfuellpause_zwei_arbeitsinseln',
    'Bei einem dokumentierten Nachfüllstopp eine getrennte trockene Aufgabe in die beobachtete Wartezeit einpassen — Schedule a separate dry task during a documented refill wait.',
    products, {
      warte_min:minutes('Beobachtete gesamte Wartezeit nach Anleitung für das konkrete Gerät.'),
      bewegung_min:minutes('Zeit zur trockenen Aufgabe und zurück.'),
      aufgabe_min:minutes('Benötigte zusammenhängende Zeit für die separate trockene Aufgabe.'),
      unbeaufsichtigt_zulaessig:flag('Ist der vorgeschriebene Gerätezustand während der eigenen Abwesenheit laut passender Anleitung zulässig?')
    }, ({warte_min,bewegung_min,aufgabe_min,unbeaufsichtigt_zulaessig}) => ({
      frei_nutzbar_min:unbeaufsichtigt_zulaessig?Math.max(0,warte_min-bewegung_min):null,
      als_zwischenaufgabe_planbar:unbeaufsichtigt_zulaessig?aufgabe_min+bewegung_min<=warte_min:null,
      hinweis:'Den vorgeschriebenen Gerätezustand und die Wartezeit vollständig einhalten. Diese Aufgabe legt keine Nachfüllmethode fest.'
    }), {warte_min:14,bewegung_min:4,aufgabe_min:11,unbeaufsichtigt_zulaessig:true},
    {frei_nutzbar_min:10,als_zwischenaufgabe_planbar:false}),

  tool('geschirr_ausraeumen_restwasser_trageweg',
    'Zwei Ausräumrouten für beobachtete Restwassermengen in Gefäßvertiefungen vergleichen — Compare how much observed residual dish water crosses the transport route.',
    floor, {
      a_entlang_ml:n('Gemessenes Restwasser, das bei Route A aus dem Spülbereich getragen wird.',0,3000),
      b_entlang_ml:n('Entsprechendes mitgetragenes Restwasser bei Route B.',0,3000),
      a_trocknungszeit_s:seconds('Gemessene zusätzliche Bedienzeit bei A.'),
      b_trocknungszeit_s:seconds('Entsprechende zusätzliche Bedienzeit bei B.'),
      ladung_und_beobachtung_gleich:flag('Gleiche Gefäße, beobachtete Bereiche und Wartezeit nach dem Zyklus?')
    }, ({a_entlang_ml,b_entlang_ml,a_trocknungszeit_s,b_trocknungszeit_s,ladung_und_beobachtung_gleich}) => ({
      b_weniger_getragen_ml:ladung_und_beobachtung_gleich?round(a_entlang_ml-b_entlang_ml):null,
      b_zusaetzliche_zeit_s:ladung_und_beobachtung_gleich?b_trocknungszeit_s-a_trocknungszeit_s:null,
      hinweis:'Der Vergleich beschreibt Transport und Zeit bei dieser Ladung.'}
    ), {a_entlang_ml:28,b_entlang_ml:4,a_trocknungszeit_s:0,b_trocknungszeit_s:18,ladung_und_beobachtung_gleich:true},
    {b_weniger_getragen_ml:24,b_zusaetzliche_zeit_s:18}),

  tool('spuelroutine_vorspuelwasser_belegte_ladungen',
    'Gemessenes zusätzliches Vorspülwasser auf die tatsächlich bearbeiteten Ladungen beziehen — Isolate pre-rinse water from the machine’s measured cycle volume.',
    floor, {
      mit_vorspuelen:count('Vollständig beobachtete Ladungen mit einer zusätzlichen Vorspülhandlung.'),
      ohne_vorspuelen:count('Vollständig beobachtete Ladungen ohne zusätzliche Vorspülhandlung.'),
      vorspuel_l:litres('Für die erste Gruppe separat gemessener Vorspülverbrauch.'),
      maschinen_l:litres('Gemessener Maschinenverbrauch zusammen über beide Gruppen.'),
      bilanzbereiche_getrennt:flag('Wurde das Vorspülen außerhalb der Maschinenmessung erfasst?')
    }, ({mit_vorspuelen,ohne_vorspuelen,vorspuel_l,maschinen_l,bilanzbereiche_getrennt}) => {
      whole(mit_vorspuelen,ohne_vorspuelen);
      if ((!mit_vorspuelen&&vorspuel_l>0)||!mit_vorspuelen&&!ohne_vorspuelen) throw new RangeError('Ladungszahl und Vorspülmenge prüfen.');
      return {vorspuel_l_je_betroffene_ladung:bilanzbereiche_getrennt&&mit_vorspuelen?round(vorspuel_l/mit_vorspuelen):null,
        gesamt_gemessen_l:bilanzbereiche_getrennt?round(vorspuel_l+maschinen_l):null,
        hinweis:'Aus dieser Mengenrechnung lässt sich kein Reinigungsergebnis ableiten.'};
    }, {mit_vorspuelen:3,ohne_vorspuelen:2,vorspuel_l:6,maschinen_l:45,bilanzbereiche_getrennt:true},
    {vorspuel_l_je_betroffene_ladung:2,gesamt_gemessen_l:51}),

  tool('spuelbecken_nutzungsuebergabe_abtropfzone',
    'Die bestätigte Nebenfläche zur Übergabe eines belegten Spülbeckens zeitlich einrechnen — Check whether a verified drip area keeps the sink available for its next use.',
    floor, {
      nass_ende:minutes('Ende der ersten beobachteten Wasseraufgabe.'),
      abtropf_min:minutes('Gewünschte Zeit bis zur nächsten Handhabung der Gegenstände.'),
      becken_faellig:minutes('Nächster fest verabredeter Beginn am selben Tag.'),
      umsetzen_min:minutes('Gemessene Zeit zum vollständigen Räumen des Beckens bei Nutzung der Nebenfläche.'),
      nebenflaeche_geprueft:flag('Platz und Wasseraufnahme an der Nebenfläche vor Ort bestätigt?')
    }, ({nass_ende,abtropf_min,becken_faellig,umsetzen_min,nebenflaeche_geprueft}) => ({
      verspaetung_im_becken_min:Math.max(0,nass_ende+abtropf_min-becken_faellig),
      verspaetung_mit_nebenflaeche_min:nebenflaeche_geprueft?Math.max(0,nass_ende+umsetzen_min-becken_faellig):null,
      hinweis:'Der Abgleich betrifft die Beckenbelegung. Abtropfende Gegenstände und Flächen für den jeweiligen Zweck getrennt prüfen.'
    }), {nass_ende:650,abtropf_min:35,becken_faellig:675,umsetzen_min:5,nebenflaeche_geprueft:true},
    {verspaetung_im_becken_min:10,verspaetung_mit_nebenflaeche_min:0}),

  tool('waesche_sammelwanne_zwei_tropfphasen_wechsel',
    'Bei zwei beobachteten Abtropfphasen prüfen, ob eine gemeinsam genutzte Sammelwanne rechtzeitig zum zweiten Ort wechseln kann — Time a single tray move between observed drip events.',
    drying, {
      a_letzter_tropf_min:minutes('Zeitpunkt der letzten sichtbaren Tropfen an A beim vergleichbaren Versuch.'),
      b_erster_tropf_min:minutes('Zeitpunkt der ersten sichtbaren Tropfen an B im vorgesehenen Ablauf.'),
      wechseln_und_leeren_min:minutes('Erprobte Dauer zum Entleeren, Umsetzen und Abstellen.'),
      reserve_min:minutes('Eigene gewünschte Zusatzzeit vor Beginn der zweiten Phase.'),
      uebertragung_geprueft:flag('Sind die beobachteten Pflegewege und das Abtropfverhalten für diesen Ablauf vergleichbar?')
    }, ({a_letzter_tropf_min,b_erster_tropf_min,wechseln_und_leeren_min,reserve_min,uebertragung_geprueft}) => {
      const delta=b_erster_tropf_min-a_letzter_tropf_min-wechseln_und_leeren_min-reserve_min;
      return {wechselreserve_min:uebertragung_geprueft?delta:null,
        gleiche_wanne_planbar:uebertragung_geprueft?delta>=0:null,
        hinweis:'Die Abschätzung verwendet beobachtete Abtropfzeiten. Textilien und Stellorte bei Änderungen nochmals prüfen.'};
    }, {a_letzter_tropf_min:720,b_erster_tropf_min:727,wechseln_und_leeren_min:5,reserve_min:4,uebertragung_geprueft:true},
    {wechselreserve_min:-2,gleiche_wanne_planbar:false}),

  tool('warmwasser_anlauf_abbruch_ziel_ungemessen',
    'Eine abgebrochene Warmwasserprobe als Untergrenze statt als erreichte Wartezeit festhalten — Keep a stopped trial as a censored observation.',
    shower, {
      beobachtet_s:seconds('Länge des lückenlos beobachteten Versuchs ab Öffnen.'),
      ziel_erreicht:flag('Wurde der selbst gesetzte Zielzustand tatsächlich beobachtet?'),
      ziel_sekunde:seconds('Beobachteter Sekundenwert beim Erreichen. Ohne beobachtetes Ziel 0.'),
      plan_grenze_s:seconds('Eigene Vergleichszeit, bis zu der das Ziel erreicht sein soll.')
    }, ({beobachtet_s,ziel_erreicht,ziel_sekunde,plan_grenze_s}) => {
      if (ziel_sekunde>beobachtet_s||!ziel_erreicht&&ziel_sekunde) throw new RangeError('Zielzeit passt nicht zur Beobachtung.');
      return {belegter_zielzeitpunkt_s:ziel_erreicht?ziel_sekunde:null,
        bis_hier_nicht_erreicht_s:ziel_erreicht?null:beobachtet_s,
        planpruefung:ziel_erreicht?ziel_sekunde<=plan_grenze_s?'innerhalb':'spaeter':beobachtet_s>=plan_grenze_s?'bis_grenze_offen':'beobachtung_zu_kurz',
        hinweis:'Der Abbruch belegt keine spätere Zielzeit.'};
    }, {beobachtet_s:60,ziel_erreicht:false,ziel_sekunde:0,plan_grenze_s:80},
    {belegter_zielzeitpunkt_s:null,bis_hier_nicht_erreicht_s:60,planpruefung:'beobachtung_zu_kurz'}),

  tool('geschirrkorb_ausraeumfolge_tropfen_unten',
    'Zwei Ausräumfolgen auf neu benetzte Teile im unteren Korb prüfen — Compare lower-rack drips after two observed unloading orders.',
    floor, {
      teile_unten:n('Je Probe gleich viele unten kontrollierte Teile.',1,500),
      neu_nass_a:count('Teile, die beim Ausräumen in Folge A zusätzlich Tropfen bekamen.'),
      neu_nass_b:count('Entsprechende Teile in Folge B.'),
      gleichartige_proben:flag('Sind Anordnung, voriger Spülgang und Beobachtung bis zum Ausräumen vergleichbar?')
    }, ({teile_unten,neu_nass_a,neu_nass_b,gleichartige_proben}) => {
      whole(teile_unten,neu_nass_a,neu_nass_b);
      if (Math.max(neu_nass_a,neu_nass_b)>teile_unten) throw new RangeError('Benetzte Teile übersteigen die kontrollierten Teile.');
      return {zusatznasse_teile_b_minus_a:gleichartige_proben?neu_nass_b-neu_nass_a:null,
        jeweils_geprueft:teile_unten,
        hinweis:'Nur neu sichtbare Tropfen während der Bedienung zählen. Restwasser direkt nach dem Spülgang getrennt protokollieren.'};
    }, {teile_unten:12,neu_nass_a:6,neu_nass_b:2,gleichartige_proben:true},
    {zusatznasse_teile_b_minus_a:-4,jeweils_geprueft:12}),

  tool('wasserprobe_gefaesswaage_tarawechsel',
    'Zwei Auffangstände trotz verschiedener Gefäßgewichte in reine Wassermassen umrechnen — Compare two water-only masses with different recorded vessel tares.',
    drying, {
      a_voll_g:n('Bruttomasse des ersten Sammelgefäßes in Gramm.',0,50000),
      a_leer_g:n('Trockene Leermasse genau dieses Gefäßes.',0,50000),
      b_voll_g:n('Bruttomasse des zweiten Sammelgefäßes.',0,50000),
      b_leer_g:n('Trockene Leermasse des zweiten Gefäßes.',0,50000),
      inhalt_wasser_und_waage_gleich:flag('Enthielten beide nur das beobachtete Wasser, auf derselben Waage gemessen?')
    }, ({a_voll_g,a_leer_g,b_voll_g,b_leer_g,inhalt_wasser_und_waage_gleich}) => {
      ordered([a_leer_g,a_voll_g],[b_leer_g,b_voll_g]);
      return {a_nettowasser_g:inhalt_wasser_und_waage_gleich?round(a_voll_g-a_leer_g):null,
        b_nettowasser_g:inhalt_wasser_und_waage_gleich?round(b_voll_g-b_leer_g):null,
        b_minus_a_g:inhalt_wasser_und_waage_gleich?round(b_voll_g-b_leer_g-a_voll_g+a_leer_g):null,
        hinweis:'Bei wechselnder Skala oder zusätzlichem Inhalt getrennt protokollieren. Ergebnis ist eine Masse.'};
    }, {a_voll_g:425,a_leer_g:305,b_voll_g:385,b_leer_g:240,inhalt_wasser_und_waage_gleich:true}, {a_nettowasser_g:120,b_nettowasser_g:145,b_minus_a_g:25}),

  tool('fensterwasser_abgrenzung_regen_zeitstempel',
    'Eine nasse Fensterbank zwischen beobachtetem Regenkontakt und Reinigungsphase zeitlich einordnen — Flag overlapping sources before comparing a wet windowsill.',
    products, {
      putz_ab:minutes('Beginn beobachteter Reinigungsphase.'), putz_bis:minutes('Ende beobachteter Phase.'),
      regen_ab:minutes('Beginn beobachteten Außenwasserkontakts.'), regen_bis:minutes('Ende dieses Kontakts.'),
      nass_ab:minutes('Frühester Zeitpunkt der eigenen Nassbeobachtung.'), nass_bis:minutes('Letzte Minute dieses beobachteten Abschnitts.'),
      randbedingungen_belegt:flag('Gleicher Tag und gleicher Fensterbereich mit bekannten Zeitgrenzen?')
    }, ({putz_ab,putz_bis,regen_ab,regen_bis,nass_ab,nass_bis,randbedingungen_belegt}) => {
      ordered([putz_ab,putz_bis],[regen_ab,regen_bis],[nass_ab,nass_bis]);
      const p=overlap(putz_ab,putz_bis,nass_ab,nass_bis), r=overlap(regen_ab,regen_bis,nass_ab,nass_bis);
      return {reinigung_ueberlappt_min:randbedingungen_belegt?p:null,regen_ueberlappt_min:randbedingungen_belegt?r:null,
        getrennte_beobachtung_noetig:!randbedingungen_belegt||p>0&&r>0,
        hinweis:'Gleichzeitigkeit weist keine Herkunft nach. Andere Feuchteursachen separat beobachten.'};
    }, {putz_ab:600,putz_bis:640,regen_ab:630,regen_bis:660,nass_ab:635,nass_bis:652,randbedingungen_belegt:true},
    {reinigung_ueberlappt_min:5,regen_ueberlappt_min:17,getrennte_beobachtung_noetig:true}),

  tool('wassergefaess_umlauf_kennzeichen_mehrfachablesung',
    'Drei angezeigte Sammelmengen nur bei getrennten Umläufen als drei Beiträge zählen — Reconcile repeated reads without counting the same collected water twice.',
    dehumidifier, {
      a_l:litres('Erster kumulierter Stand.'), b_l:litres('Zweiter kumulierter Stand.'), c_l:litres('Dritter kumulierter Stand.'),
      leer_nach_a:flag('Vor der nächsten Ablesung nach A vollständig erfasst und geleert?'),
      leer_nach_b:flag('Vor der nächsten Ablesung nach B vollständig erfasst und geleert?'),
      umlaeufe_bestaetigt:flag('Ist für beide Übergänge belegbar, ob derselbe Sammelumlauf weiterlief?')
    }, ({a_l,b_l,c_l,leer_nach_a,leer_nach_b,umlaeufe_bestaetigt}) => {
      if (umlaeufe_bestaetigt) {
        if (!leer_nach_a) ordered([a_l,b_l]);
        if (!leer_nach_b) ordered([b_l,c_l]);
      }
      return {gesamt_l:umlaeufe_bestaetigt?round(c_l+(leer_nach_a?a_l:0)+(leer_nach_b?b_l:0)):null,
        unterschiedliche_umlaeufe:umlaeufe_bestaetigt?1+Number(leer_nach_a)+Number(leer_nach_b):null,
        hinweis:'Pro vollständig erfasstem Sammelumlauf zählt der letzte Stand. Ungemessene Leervorgänge als Lücke notieren.'};
    }, {a_l:0.8,b_l:1.1,c_l:0.7,leer_nach_a:false,leer_nach_b:true,umlaeufe_bestaetigt:true},
    {gesamt_l:1.8,unterschiedliche_umlaeufe:2}),

  tool('wischwasser_getrenntes_gefaess_vor_folgetermin',
    'Ein bereits benutztes Wassergefäß für die nächste bestätigte Aufgabe nur nach dokumentierter Zustandsübergabe einplanen — Track whether the designated vessel is ready for a distinct next task.',
    guide('saugwischer-kaufberatung'), {
      termin_min:minutes('Beginn der nächsten Aufgabe am selben Tag.'), fruehestens_min:minutes('Frühester Beginn dokumentierter Vorbereitung.'),
      vorbereiten_min:minutes('Gemessene Dauer der erlaubten Vorbereitung.'),
      wechselgefaess_passend:flag('Ist ein separat vorbereitetes passendes Gefäß verfügbar?'),
      zweckwechsel_geprueft:flag('Ist die nächste Handhabung des bisherigen Gefäßes für den anderen Zweck vollständig geklärt?')
    }, ({termin_min,fruehestens_min,vorbereiten_min,wechselgefaess_passend,zweckwechsel_geprueft}) => {
      const fehlend=Math.max(0,fruehestens_min+vorbereiten_min-termin_min);
      return {fehlende_vorbereitungszeit_min:zweckwechsel_geprueft?fehlend:null,
        option:zweckwechsel_geprueft&&fehlend===0?'vorhandenes_vorbereiten':wechselgefaess_passend?'getrenntes_gefaess':'vorbereitung_offen',
        hinweis:'Nur bestätigte Zweckzuordnung und Herstellerpflege verwenden. Der Plan bewertet keine hygienische Eignung.'};
    }, {termin_min:600,fruehestens_min:590,vorbereiten_min:20,wechselgefaess_passend:true,zweckwechsel_geprueft:true},
    {fehlende_vorbereitungszeit_min:10,option:'getrenntes_gefaess'}),

  tool('kondensat_messgrenze_geteilte_auffangstelle',
    'Eine gemeinsam benutzte Auffangstelle nur mit getrennten Proben als Gerätemessung verwenden — Separate attributable collections from mixed collection volumes.',
    dehumidifier, {
      einzeln_a_l:litres('Separat beobachtete Wassermenge mit nur Gerät A.'),
      einzeln_b_l:litres('Separat beobachtete Wassermenge mit nur Gerät B.'),
      gemeinsam_l:litres('Gemessenes Sammelwasser während beider dokumentierten Nutzungen.'),
      sammelwege_voll_erfasst:flag('Sind die drei Abschnitte vollständig und ohne Übertrag aus einem vorherigen Behälter?')
    }, ({einzeln_a_l,einzeln_b_l,gemeinsam_l,sammelwege_voll_erfasst}) => ({
      a_sicher_einzeln_l:sammelwege_voll_erfasst?einzeln_a_l:null,
      b_sicher_einzeln_l:sammelwege_voll_erfasst?einzeln_b_l:null,
      nicht_einem_geraet_zugeteilt_l:sammelwege_voll_erfasst?gemeinsam_l:null,
      hinweis:'Gemeinsam erfasstes Wasser kann keiner einzelnen Quelle zugeordnet werden. Nur bereits vorhandene genehmigte Sammelwege auswerten.'
    }), {einzeln_a_l:0.5,einzeln_b_l:0.8,gemeinsam_l:1.4,sammelwege_voll_erfasst:true},
    {a_sicher_einzeln_l:0.5,b_sicher_einzeln_l:0.8,nicht_einem_geraet_zugeteilt_l:1.4}),

  tool('waschplatz_kurze_freigabe_nachfuellstaffel',
    'Zwei notwendige Befüllungen an einer nur kurz nutzbaren Wasserstelle gegen eine vorbereitete Pufferfüllung abgleichen — Use confirmed staged water to reduce work within a short refill window.',
    products, {
      offen_min:minutes('Bestätigte Dauer, für die die passende Wasserstelle nutzbar ist.'),
      a_bedarf_l:litres('Benötigte Wassermenge für Ziel A.'), b_bedarf_l:litres('Benötigte Wassermenge für Ziel B.'),
      b_vorbereitet_l:litres('Passend vorbereitete Menge für B.'),
      liter_min:n('Gemessene Füllrate für diese kurze Entnahme in Litern je Minute.',0.01,100),
      umsetzen_min:minutes('Gemessene Zeit zum Gefäßwechsel an der Wasserstelle.')
    }, ({offen_min,a_bedarf_l,b_bedarf_l,b_vorbereitet_l,liter_min,umsetzen_min}) => {
      const b_rest=Math.max(0,b_bedarf_l-b_vorbereitet_l);
      const zeit=(a_bedarf_l+b_rest)/liter_min+(a_bedarf_l>0&&b_rest>0?umsetzen_min:0);
      return {b_noch_zu_fuellen_l:round(b_rest),nachfuellzeit_min:round(zeit),reserve_min:round(offen_min-zeit),
        hinweis:'Gilt für die erprobte Rate und getrennt bestätigte Gefäße. Zum Zweck passende Versorgung vor Ort prüfen.'};
    }, {offen_min:7,a_bedarf_l:8,b_bedarf_l:6,b_vorbereitet_l:4,liter_min:2,umsetzen_min:1},
    {b_noch_zu_fuellen_l:2,nachfuellzeit_min:6,reserve_min:1}),

  tool('duschwasser_messbecher_obergrenze_fehlmengen',
    'Bei gesättigtem Messgefäß gemessene Teilmenge und entgangene Mengen getrennt berichten — Keep an overflowed capture as a lower bound.',
    shower, {
      volumen_abgelesen_l:litres('Erfasste Menge bis zur genutzten Ablesegrenze.'),
      uebergelaufen:flag('Ging dabei beobachtet Wasser am Messgefäß vorbei?'),
      extra_gemessen_l:litres('Separat vollständig erfasste Zusatzmenge.'),
      extra_vollstaendig:flag('Ist bei Überlauf die separat gemessene Aufnahmemenge nachweislich vollständig?')
    }, ({volumen_abgelesen_l,uebergelaufen,extra_gemessen_l,extra_vollstaendig}) => {
      if (!uebergelaufen&&extra_gemessen_l>0) throw new RangeError('Zusatzmenge ohne Überlauf nicht zuordnen.');
      const summe=round(volumen_abgelesen_l+extra_gemessen_l);
      return {belegt_mindestens_l:summe,gesamt_l:!uebergelaufen||extra_vollstaendig?summe:null,
        erneut_vollstaendig_messen:uebergelaufen&&!extra_vollstaendig,
        hinweis:'Nur nicht überlappende Mengen addieren. Bei möglichem Verlust bleibt die Gesamtmenge offen.'};
    }, {volumen_abgelesen_l:2,uebergelaufen:true,extra_gemessen_l:0.3,extra_vollstaendig:false},
    {belegt_mindestens_l:2.3,gesamt_l:null,erneut_vollstaendig_messen:true}),

  tool('warmwasser_einmaliger_wasserweg_folge_nutzung',
    'Zwei tatsächlich beobachtete Verwendungen nach demselben Anlauf als eine Entnahme zählen — Avoid charging measured shared run-up twice across two immediate tasks.',
    shower, {
      entnommen_gesamt_l:litres('Gemessene Gesamtentnahme für beide Verwendungen aus einer gemeinsamen Messung.'),
      anlauf_l:litres('Darin einmal erfasster Anlauf.'),
      nutzung_a_l:litres('Separat erfasste Teilmenge für die erste Verwendung.'),
      nutzung_b_l:litres('Separat erfasste Teilmenge für die zweite Verwendung.'),
      genauso_gemessen:flag('Wurde die Entnahme ohne weiteren unbemerkten Start und ohne doppelte Teilmessung erfasst?')
    }, ({entnommen_gesamt_l,anlauf_l,nutzung_a_l,nutzung_b_l,genauso_gemessen}) => {
      const delta=entnommen_gesamt_l-anlauf_l-nutzung_a_l-nutzung_b_l;
      if (genauso_gemessen&&delta<-1e-9) throw new RangeError('Teilvolumina übersteigen den gemessenen gemeinsamen Gesamtwert.');
      return {einmaliger_anlauf_l:genauso_gemessen?anlauf_l:null,
        nicht_erfasster_nutzungsanteil_l:genauso_gemessen?round(Math.max(0,delta)):null,
        hinweis:'Der einmalige Anlauf wird nur beim tatsächlich gemeinsamen Messumfang belegt.'};
    }, {entnommen_gesamt_l:12.5,anlauf_l:1.5,nutzung_a_l:6,nutzung_b_l:4,genauso_gemessen:true},
    {einmaliger_anlauf_l:1.5,nicht_erfasster_nutzungsanteil_l:1}),

  tool('fenstersauger_messaufgabe_mulde_einzweck',
    'Eine Messprobe mit Wasser aus Glasfläche und Gerätepflege nach Quelle auftrennen — Keep rinse water out of the suction performance measurement.',
    products, {
      sammelgesamt_ml:n('Gemessene Flüssigkeit über den ganzen Ablauf.',0,10000),
      vorher_im_tank_ml:n('Beim Start bestätigte bereits enthaltene Flüssigkeit.',0,10000),
      pflege_ml:n('Beim anschließenden, dokumentierten Pflegeschritt zusätzlich erfasste Menge.',0,10000),
      zeitfenster_getrennt:flag('Sind Beginn, Reinigung der Glasfläche und anschließende Pflege klar getrennt dokumentiert?')
    }, ({sammelgesamt_ml,vorher_im_tank_ml,pflege_ml,zeitfenster_getrennt}) => {
      const netto=sammelgesamt_ml-vorher_im_tank_ml-pflege_ml;
      if (zeitfenster_getrennt&&netto<-1e-9) throw new RangeError('Pflege und Startbestand übersteigen die Gesamtmenge.');
      return {neu_von_glas_erfasst_ml:zeitfenster_getrennt?round(Math.max(0,netto)):null,
        hinweis:'Nur bei derselben dokumentierten Erfassung und ohne weitere ungemessene Quellen verwenden.'};
    }, {sammelgesamt_ml:180,vorher_im_tank_ml:20,pflege_ml:45,zeitfenster_getrennt:true}, {neu_von_glas_erfasst_ml:115}),

  tool('waesche_umsetzen_wasserflecken_wegbefund',
    'Wasserflecken vor und nach zwei getrennten Transportabschnitten lokalisieren — Separate marks that appeared on a carry leg from marks present beforehand.',
    drying, {
      vor_start:count('Schon vorher auf der abgegrenzten Route sichtbare Wasserflecken.'),
      nach_a:count('Nach Abschnitt A dort kumuliert sichtbare Flecken.'),
      nach_b:count('Nach Abschnitt B dort kumuliert sichtbare Flecken.'),
      kein_zwischenwischen:flag('Wurde auf derselben markierten Fläche ohne Zwischenwischen und andere dokumentierte Nutzung beobachtet?')
    }, ({vor_start,nach_a,nach_b,kein_zwischenwischen}) => {
      whole(vor_start,nach_a,nach_b);
      if (kein_zwischenwischen) ordered([vor_start,nach_a],[nach_a,nach_b]);
      return {neu_nach_a:kein_zwischenwischen?nach_a-vor_start:null,neu_nach_b:kein_zwischenwischen?nach_b-nach_a:null,
        hinweis:'Markierungen zeigen eine Beobachtung am Weg. Herkunft und Wassermenge sind damit nicht bestimmt.'};
    }, {vor_start:2,nach_a:5,nach_b:6,kein_zwischenwischen:true}, {neu_nach_a:3,neu_nach_b:1}),
];
