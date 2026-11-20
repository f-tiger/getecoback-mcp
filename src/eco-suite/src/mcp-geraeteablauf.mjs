const robot = '/guide/saugroboter-kaufberatung.html';
const mop = '/guide/saugwischer-kaufberatung.html';
const products = '/produkte.html';
const appliances = '/geraete-austausch-rechner.html';
const dry = '/waeschetrockner-oder-luftentfeuchter.html';
const humid = '/guide/luftbefeuchter-ratgeber.html';
const cellar = '/guide/luftentfeuchter-keller.html';
const ac = '/guide/klimaanlage-nachts-laufen-lassen.html';
const fan = '/guide/ventilator-kaufen-ratgeber.html';
const lights = '/guide/lichterkette-stromkosten.html';
const heating = '/guide/smarte-heizkoerperthermostate-lohnen-sich.html';
const num = (description, maximum = 1440) => ({type:'number',minimum:0,maximum,description});
const count = description => num(description, 1000);
const flag = description => ({type:'boolean',description});
const pick = (description, ...values) => ({type:'string',enum:values,description});
const round = value => Math.round(value * 100) / 100;
const positive = value => Math.max(0, value);
function whole(...values) {
  if (values.some(value => !Number.isInteger(value))) throw new RangeError();
}
function ranges(...intervals) {
  if (intervals.some(([start,end]) => end < start)) throw new RangeError();
}
function tool(name, description, page, properties, calculate, args, expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const geraeteablauf = [
  tool('saugroboter_zwei_raumtermine_reihenfolge',
    'Mit beobachteten Fahrzeiten prüfen, in welcher Reihenfolge beide Räume rechtzeitig fertig werden. — Choose the feasible order for two robot-cleaning deadlines.',
    robot, {
      a_dauer_min:num('Beobachtete Fahrminuten in Raum A.'),
      b_dauer_min:num('Beobachtete Fahrminuten in Raum B.'),
      wechsel_min:num('Beobachteter Übergang zwischen Räumen in beiden Richtungen.'),
      a_spaetestens_min:num('Frist für Raum A in Minuten ab dem gemeinsamen möglichen Start.'),
      b_spaetestens_min:num('Frist für Raum B in Minuten ab demselben Start.'),
    }, ({a_dauer_min,b_dauer_min,wechsel_min,a_spaetestens_min,b_spaetestens_min}) => {
      if (!a_dauer_min || !b_dauer_min) throw new RangeError();
      const ende = a_dauer_min + wechsel_min + b_dauer_min;
      const ab = a_dauer_min <= a_spaetestens_min && ende <= b_spaetestens_min;
      const ba = b_dauer_min <= b_spaetestens_min && ende <= a_spaetestens_min;
      return {a_vor_b:ab,b_vor_a:ba,gesamt_min:round(ende),
        hinweis:'Vorausgesetzt werden freigegebene Wege und vergleichbare Übergänge. Vorbereitung, Rückkehr und Ladezeiten separat berücksichtigen.'};
    }, {a_dauer_min:20,b_dauer_min:30,wechsel_min:5,a_spaetestens_min:60,b_spaetestens_min:35},
    {a_vor_b:false,b_vor_a:true,gesamt_min:55}),

  tool('saugroboter_dockbesuch_ruhefenster',
    'Bei einer ruhigen Zeit getrennt prüfen, ob ein erwarteter Dockbesuch Fahren, Absaugung oder beides hineinlegt. — Find the parts of a documented dock visit that extend into quiet hours.',
    robot, {
      retour_min:num('Erwarteter Beginn der Rückfahrt auf einer gemeinsamen Minutenachse ab Tagesbeginn.'),
      ankunft_min:num('Erwartete Ankunft an der Station auf derselben Achse.'),
      ende_absaugung_min:num('Beobachtetes Ende der Absaugung. Bei deaktivierter Funktion gleich Ankunft.'),
      ruhe_start_min:num('Beginn der bewusst freigehaltenen Ruhezeit auf derselben Achse.'),
      ruhe_ende_min:num('Ende der Ruhezeit auf derselben Achse.'),
    }, ({retour_min,ankunft_min,ende_absaugung_min,ruhe_start_min,ruhe_ende_min}) => {
      ranges([retour_min,ankunft_min],[ankunft_min,ende_absaugung_min],[ruhe_start_min,ruhe_ende_min]);
      return {
        rueckfahrt_in_ruhe_min:round(positive(Math.min(ankunft_min,ruhe_ende_min)-Math.max(retour_min,ruhe_start_min))),
        stationsphase_in_ruhe_min:round(positive(Math.min(ende_absaugung_min,ruhe_ende_min)-Math.max(ankunft_min,ruhe_start_min))),
        hinweis:'Stationsphase ab Ankunft umfasst auch einen beobachteten Vorlauf. Zeitpunkte am eigenen Modell prüfen. Ein Ruhemodus belegt keine lautlose Station.'};
    }, {retour_min:1230,ankunft_min:1238,ende_absaugung_min:1242,ruhe_start_min:1235,ruhe_ende_min:1260},
    {rueckfahrt_in_ruhe_min:3,stationsphase_in_ruhe_min:4}),

  tool('saugroboter_wischen_nach_trockenauftrag',
    'Bei zwei tatsächlichen Aufträgen die bestätigte Umrüstung neben der schon eingeplanten Pause ausweisen. — Budget the verified dry-to-wet changeover separately from idle time.',
    robot, {
      abstand_min:num('Pause zwischen trockenem Auftrag und geplantem Start der feuchten Reinigung.'),
      station_nachlauf_min:num('Erst abzuwartender beobachteter Stationsnachlauf.'),
      umruesten_min:num('Danach erforderliche bestätigte aktive Minuten für den vorgesehenen Wechsel.'),
      boden_und_wechsel_bestaetigt:flag('Sind die feuchte Reinigung für den Boden und der Wechsel für das genaue Modell geklärt?'),
    }, ({abstand_min,station_nachlauf_min,umruesten_min,boden_und_wechsel_bestaetigt}) => {
      const luecke = abstand_min - station_nachlauf_min - umruesten_min;
      return {nachlauf_und_wechsel_passen:boden_und_wechsel_bestaetigt ? luecke >= 0 : null,
        startverschiebung_min:boden_und_wechsel_bestaetigt ? round(positive(-luecke)) : null,
        hinweis:'Nur vorgesehene Schritte einplanen. Bei unklarer Freigabe für Boden oder Gerätekonfiguration zuerst die Anleitungen klären.'};
    }, {abstand_min:12,station_nachlauf_min:8,umruesten_min:6,boden_und_wechsel_bestaetigt:true},
    {nachlauf_und_wechsel_passen:false,startverschiebung_min:2}),

  tool('saugwischer_dock_laden_trocknen_ablauf',
    'Für denselben Dockplatz paralleles und nacheinander ausgeführtes Laden und Trocknen auseinanderhalten. — Compare dock occupancy with verified simultaneous versus sequential charging and drying.',
    mop, {
      trocknen_min:num('Protokollierte oder dokumentierte Freigabezeit des vorgesehenen Trocknungsablaufs.'),
      laden_min:num('Benötigte Zeit bis zum vorher festgelegten Ladezustand unter vergleichbaren Bedingungen.'),
      verfuegbar_min:num('Zeit bis zur nächsten geplanten Nutzung.'),
      gleichzeitigkeit:pick('Betriebsart für genau diese Dockstation und dieses Modell laut Anleitung.','parallel','nacheinander','ungeklaert'),
    }, ({trocknen_min,laden_min,verfuegbar_min,gleichzeitigkeit}) => {
      const belegt = gleichzeitigkeit === 'parallel' ? Math.max(trocknen_min,laden_min) : trocknen_min + laden_min;
      return {dock_belegt_min:gleichzeitigkeit === 'ungeklaert' ? null : round(belegt),
        verspaetung_min:gleichzeitigkeit === 'ungeklaert' ? null : round(positive(belegt-verfuegbar_min)),
        hinweis:'Start erst nach der vorgesehenen Reinigung. Herstelleranleitung beachten und den benötigten Ladezustand vor erneuter Nutzung prüfen.'};
    }, {trocknen_min:40,laden_min:70,verfuegbar_min:80,gleichzeitigkeit:'parallel'},
    {dock_belegt_min:70,verspaetung_min:0}),

  tool('saugwischer_fuellstelle_vor_abschnitt',
    'Zwei Reinigungsabschnitte mit eigenem gemessenem Verbrauch und einer erlaubten Nachfüllstelle abgleichen. — Check whether the next approved refill point arrives before either cleaning segment runs short.',
    mop, {
      start_ml:num('Tatsächlich eingefüllte nutzbare Menge beim Start in Millilitern.',20000),
      a_bedarf_ml:num('Auf ähnlicher freigegebener Fläche gemessener Bedarf für Abschnitt A.',20000),
      b_bedarf_ml:num('Gemessener Bedarf für Abschnitt B mit derselben Einstellung.',20000),
      nachfuellen_ml:num('Zwischen beiden Abschnitten an der vorgesehenen Stelle verfügbare, zugelassene Nachfüllmenge.',20000),
      tank_max_ml:num('Praktisch nutzbare Tankfüllung laut Anleitung in Millilitern.',20000),
    }, ({start_ml,a_bedarf_ml,b_bedarf_ml,nachfuellen_ml,tank_max_ml}) => {
      if (!tank_max_ml || start_ml > tank_max_ml || nachfuellen_ml > tank_max_ml) throw new RangeError();
      const hinweis = 'Nur das freigegebene Füllen modellieren. Schmutzwassertank, Restmengen und Akkuladung separat prüfen.';
      const nachA = start_ml - a_bedarf_ml;
      if (nachA < 0) return {erster_engpass:'Abschnitt A',fehlmenge_ml:round(-nachA),fuellung_vor_b_ml:null,hinweis};
      const vorB = Math.min(tank_max_ml,nachA+nachfuellen_ml);
      return {erster_engpass:vorB < b_bedarf_ml ? 'Abschnitt B' : null,
        fehlmenge_ml:round(positive(b_bedarf_ml-vorB)),fuellung_vor_b_ml:round(vorB),
        hinweis};
    }, {start_ml:400,a_bedarf_ml:280,b_bedarf_ml:450,nachfuellen_ml:400,tank_max_ml:500},
    {erster_engpass:null,fehlmenge_ml:0,fuellung_vor_b_ml:500}),

  tool('spuelmaschine_deckel_belegen_tellerplaetze',
    'Prüfen, wie viele Tellerplätze nach einer zulässigen Deckelbeladung gemeinsam nutzbar bleiben. — Account for plate positions displaced by compatible lids.',
    appliances, {
      tellerplaetze_ohne_deckel:count('Tatsächlich nutzbare Tellerplätze ohne Deckel.'),
      deckel_geplant:count('Zulässig eingeplante gleichartige Deckel.'),
      tellerplaetze_je_deckel:count('Durch jeden Deckel zusätzlich belegte Tellerplätze bei gleicher Anordnung.'),
      teller_geplant:count('Teller, die gleichzeitig mit den Deckeln in die Ladung sollen.'),
    }, ({tellerplaetze_ohne_deckel,deckel_geplant,tellerplaetze_je_deckel,teller_geplant}) => {
      whole(tellerplaetze_ohne_deckel,deckel_geplant,tellerplaetze_je_deckel,teller_geplant);
      const uebrig = tellerplaetze_ohne_deckel - deckel_geplant*tellerplaetze_je_deckel;
      return {deckelplatz_rechnerisch_machbar:uebrig >= 0,gleichzeitig_passende_teller:Math.min(teller_geplant,positive(uebrig)),
        teller_auf_anderen_lauf:teller_geplant-Math.min(teller_geplant,positive(uebrig)),
        hinweis:'Plätze in einer echten Beladeprobe zählen. Nur zulässige Anordnung mit freien Sprüharmen und eindeutig belegten Deckelplätzen.'};
    }, {tellerplaetze_ohne_deckel:14,deckel_geplant:3,tellerplaetze_je_deckel:2,teller_geplant:10},
    {deckelplatz_rechnerisch_machbar:true,gleichzeitig_passende_teller:8,teller_auf_anderen_lauf:2}),

  tool('spuelmaschine_zubehoer_korb_umbauwechsel',
    'Zwei tatsächlich getestete Korbpositionen für hohe Gläser und hohe Teile auf einen unveränderlichen Lauf prüfen. — Compare feasible baskets layouts when one run must hold both tall glasses and tall pieces.',
    appliances, {
      glaeser:count('Benötigte Zahl der gleich hohen Gläser.'),
      grosse_teile:count('Benötigte Zahl der hohen Teile im anderen Korb.'),
      glaeser_stellung_a:count('Gemeinsam nutzbare hohe Glasplätze bei Stellung A.'),
      teile_stellung_a:count('Gemeinsam nutzbare Plätze für die hohen Teile bei Stellung A.'),
      glaeser_stellung_b:count('Gemeinsam nutzbare hohe Glasplätze bei Stellung B.'),
      teile_stellung_b:count('Gemeinsam nutzbare Plätze für die hohen Teile bei Stellung B.'),
    }, ({glaeser,grosse_teile,glaeser_stellung_a,teile_stellung_a,glaeser_stellung_b,teile_stellung_b}) => {
      whole(glaeser,grosse_teile,glaeser_stellung_a,teile_stellung_a,glaeser_stellung_b,teile_stellung_b);
      const a = positive(glaeser-glaeser_stellung_a) + positive(grosse_teile-teile_stellung_a);
      const b = positive(glaeser-glaeser_stellung_b) + positive(grosse_teile-teile_stellung_b);
      return {ungedeckt_stellung_a:a,ungedeckt_stellung_b:b,bevorzugte_stellung:a === b ? 'gleich' : a < b ? 'A' : 'B',
        hinweis:'Nur für die getesteten Formen. Umbau und Höhengrenzen laut Anleitung, Sprüharmfreiheit prüfen.'};
    }, {glaeser:5,grosse_teile:6,glaeser_stellung_a:4,teile_stellung_a:6,glaeser_stellung_b:6,teile_stellung_b:4},
    {ungedeckt_stellung_a:1,ungedeckt_stellung_b:2,bevorzugte_stellung:'A'}),

  tool('spuelmaschine_zwischenlauf_abstellfolge',
    'Zwischen zwei geplanten Läufen Ausräumen und Nachladen mit der tatsächlich verfügbaren Person abstimmen. — Confirm separate unloading and loading availability between two dishwasher runs.',
    appliances, {
      zuerst_fertig_min:num('Erster Lauf fertig auf der gemeinsamen Minutenachse.'),
      spaetestens_zweiter_start_min:num('Spätester Start des nächsten Laufs auf derselben Achse.'),
      person_frei_ab_min:num('Beginn der im Übergang verfügbaren Bedienzeit.'),
      person_frei_bis_min:num('Ende derselben zusammenhängenden Bedienzeit.'),
      aus_und_einraeumen_min:num('Gemessene Gesamtzeit für beide Arbeiten ohne laufendes Programm.'),
    }, ({zuerst_fertig_min,spaetestens_zweiter_start_min,person_frei_ab_min,person_frei_bis_min,aus_und_einraeumen_min}) => {
      ranges([person_frei_ab_min,person_frei_bis_min]);
      const start = Math.max(zuerst_fertig_min,person_frei_ab_min);
      const ende = Math.min(spaetestens_zweiter_start_min,person_frei_bis_min);
      const machbar = ende >= start && start + aus_und_einraeumen_min <= ende;
      return {uebergang_machbar:machbar,fruehester_neustart_min:machbar ? round(start+aus_und_einraeumen_min) : null,
        fehlende_bedienminuten:round(positive(aus_und_einraeumen_min-positive(ende-start))),
        hinweis:'Als Fertigzeit den vorgabegerechten Zeitpunkt zum Ausräumen verwenden, einschließlich erforderlicher Wartephase.'};
    }, {zuerst_fertig_min:810,spaetestens_zweiter_start_min:860,person_frei_ab_min:835,person_frei_bis_min:845,aus_und_einraeumen_min:12},
    {uebergang_machbar:false,fruehester_neustart_min:null,fehlende_bedienminuten:2}),

  tool('heissluft_unterbrechungsfreies_programmfenster',
    'Ein laut Anleitung ununterbrochenes Heißluftprogramm zwischen zwei festen Küchenbelegungen einpassen. — Fit a documented uninterrupted cycle between two fixed kitchen uses.',
    products, {
      luecke_vorher_min:num('Zusammenhängend freie Zeit vor der anderen Nutzung.'),
      luecke_nachher_min:num('Zusammenhängend freie Zeit nach der anderen Nutzung.'),
      startvorbereitung_min:num('Zuvor am selben Platz erforderliche Vorbereitungszeit.'),
      programm_min:num('Eigene gemessene Dauer des unverändert vorgesehenen Programms.'),
      vorgaben_bestaetigt:flag('Sind Aufstellung, Programm und Belegung für genau dieses Modell geklärt?'),
    }, ({luecke_vorher_min,luecke_nachher_min,startvorbereitung_min,programm_min,vorgaben_bestaetigt}) => {
      if (!programm_min) throw new RangeError();
      const block = startvorbereitung_min + programm_min;
      return {zusammenhaengend_noetig_min:round(block),
        passende_luecken:vorgaben_bestaetigt ? [luecke_vorher_min >= block ? 'vorher' : null,luecke_nachher_min >= block ? 'nachher' : null].filter(Boolean) : null,
        hinweis:'Freie Teilfenster dürfen hier nicht addiert werden. Das Modell gibt keine Rezept-, Gar- oder Bedienfreigabe.'};
    }, {luecke_vorher_min:18,luecke_nachher_min:30,startvorbereitung_min:5,programm_min:22,vorgaben_bestaetigt:true},
    {zusammenhaengend_noetig_min:27,passende_luecken:['nachher']}),

  tool('heissluft_folgelauf_vorheizen_konfiguration',
    'Einen gemessenen ersten und zweiten Vorheizabschnitt als Teil zweier dokumentiert zulässiger Folgeläufe einordnen. — Evaluate the extra heat-up occupation observed in a compatible follow-on cycle.',
    products, {
      erster_vorlauf_min:num('Protokollierte Vorheizzeit bei einem üblichen Einzelstart.'),
      zweiter_vorlauf_min:num('Protokollierte Vorheizzeit für dasselbe Programm im zulässigen Folgelauf.'),
      wechsel_min:num('Zusätzliche Zeit dazwischen beim zulässigen Folgelauf gegenüber zwei Einzelstarts.'),
      gleiche_einstellung:flag('Erfolgten die Durchgänge mit vergleichbarem Programm und gleichen Einstellungen laut Anleitung?'),
    }, ({erster_vorlauf_min,zweiter_vorlauf_min,wechsel_min,gleiche_einstellung}) => {
      return {vorheizzeit_unterschied_min:gleiche_einstellung ? round(erster_vorlauf_min-zweiter_vorlauf_min) : null,
        nettobelegung_weniger_min:gleiche_einstellung ? round(erster_vorlauf_min-zweiter_vorlauf_min-wechsel_min) : null,
        hinweis:'Nur eigene gemessene Zeit für den zugelassenen Ablauf. Vorheizen, Temperatur, Garzustand und vorgeschriebene Pausen bleiben Geräte- und Rezeptvorgaben.'};
    }, {erster_vorlauf_min:8,zweiter_vorlauf_min:2,wechsel_min:3,gleiche_einstellung:true},
    {vorheizzeit_unterschied_min:6,nettobelegung_weniger_min:3}),

  tool('kontaktgrill_platten_spuelgang_ladeschluss',
    'Den Freigabezeitpunkt zugelassener Grillplatten mit dem letzten Beladezeitpunkt des Spülgangs vergleichen. — Determine whether eligible grill plates reach the current dishwasher loading cutoff.',
    products, {
      freigegeben:flag('Sind genau diese abnehmbaren Platten auch für die Spülmaschine freigegeben?'),
      nach_pflegevorgabe_frei_min:num('Zeitpunkt, ab dem die Platten gemäß Anleitung beladen werden können.'),
      ladeschluss_min:num('Spätester Beginn des Spülgangs auf derselben Minutenachse.'),
      laden_min:num('Gemessene zusätzliche Minuten für das Einräumen der Platten.'),
    }, ({freigegeben,nach_pflegevorgabe_frei_min,ladeschluss_min,laden_min}) => {
      const delta = ladeschluss_min - nach_pflegevorgabe_frei_min - laden_min;
      return {in_diesen_lauf:freigegeben && delta >= 0,verspaetung_min:freigegeben ? round(positive(-delta)) : null,
        hinweis:'Geräteanleitung für sicheren Umgang, Abkühlung und Pflege einhalten. Ohne Freigabe separat nach Anleitung pflegen.'};
    }, {freigegeben:true,nach_pflegevorgabe_frei_min:1120,ladeschluss_min:1122,laden_min:4},
    {in_diesen_lauf:false,verspaetung_min:2}),

  tool('heissluft_rost_entnahme_ablage_nachlauf',
    'Die zeitliche Überschneidung der vorgesehenen Rostablage mit dem später geplanten Küchenplatz erkennen. — Check whether a compatible heat-resistant rack rest is occupied when the next task needs it.',
    products, {
      rost_ablage_bestaetigt:flag('Ist diese Ablage für Zubehör und Nutzung nach beiden Anleitungen zulässig?'),
      rost_belegt_ab_min:num('Beobachteter Beginn der Belegung durch den Rost auf der Minutenachse.'),
      rost_belegt_bis_min:num('Beobachteter Zeitpunkt, zu dem die Ablage nach Vorgaben wieder frei war.'),
      folgeaufgabe_ab_min:num('Gewünschter Zeitpunkt für dieselbe Ablage, auf derselben Achse.'),
    }, ({rost_ablage_bestaetigt,rost_belegt_ab_min,rost_belegt_bis_min,folgeaufgabe_ab_min}) => {
      ranges([rost_belegt_ab_min,rost_belegt_bis_min]);
      const konflikt = folgeaufgabe_ab_min >= rost_belegt_ab_min && folgeaufgabe_ab_min < rost_belegt_bis_min;
      return {ablage_konflikt:rost_ablage_bestaetigt ? konflikt : null,
        versatz_bis_frei_min:rost_ablage_bestaetigt ? (konflikt ? round(rost_belegt_bis_min-folgeaufgabe_ab_min) : 0) : null,
        hinweis:'Kein Schätzwert für sichere Abkühlzeit. Die eingetragene Freigabe folgt der Anleitung und der beobachteten Situation.'};
    }, {rost_ablage_bestaetigt:true,rost_belegt_ab_min:100,rost_belegt_bis_min:130,folgeaufgabe_ab_min:117},
    {ablage_konflikt:true,versatz_bis_frei_min:13}),

  tool('wasch_trockner_zweiladung_uebergabestau',
    'Zwei Waschladungen und einen separaten Trockner anhand beobachteter Laufzeiten verzahnen. — Quantify when a second washed load waits for the dryer in a two-load sequence.',
    dry, {
      waesche_eins_fertig_min:num('Zeitpunkt des ersten Waschendes auf einer gemeinsamen Minutenachse.'),
      waesche_zwei_fertig_min:num('Zeitpunkt des zweiten Waschendes auf derselben Achse.'),
      erster_trockengang_min:num('Gemessene Dauer des ersten Trockengangs bis zur möglichen Entnahme.'),
      wechsel_min:num('Gemessene Minuten für den Wechsel zwischen den Trocknerladungen.'),
      getrennte_geraete:flag('Können Waschmaschine und Trockner als separate Geräte nach Anleitung gleichzeitig arbeiten?'),
    }, ({waesche_eins_fertig_min,waesche_zwei_fertig_min,erster_trockengang_min,wechsel_min,getrennte_geraete}) => {
      ranges([waesche_eins_fertig_min,waesche_zwei_fertig_min]);
      if (!erster_trockengang_min) throw new RangeError();
      const frei = waesche_eins_fertig_min + erster_trockengang_min + wechsel_min;
      return {zweite_ladung_wartet_min:getrennte_geraete ? round(positive(frei-waesche_zwei_fertig_min)) : null,
        zweiter_trocknerstart_fruehestens_min:getrennte_geraete ? round(Math.max(frei,waesche_zwei_fertig_min)) : null,
        hinweis:'Erste Übergabe gilt am ersten Waschende als sofort verfügbar. Nur getrennte Geräte mit geeigneten Ladungen und bestätigtem Ablauf verwenden.'};
    }, {waesche_eins_fertig_min:600,waesche_zwei_fertig_min:650,erster_trockengang_min:55,wechsel_min:8,getrennte_geraete:true},
    {zweite_ladung_wartet_min:13,zweiter_trocknerstart_fruehestens_min:663}),

  tool('trockner_zeitfenster_nachlauf_und_raum',
    'Vor gemeinsamem Raumwechsel den beobachteten Geräte- und Entnahmenachlauf einzeln zeitlich berücksichtigen. — Keep a shared room reservation separate from a dryer’s automatic and manual occupation.',
    dry, {
      hauptprogramm_fertig_min:num('Beobachtetes Ende der Hauptphase auf der Minutenachse.'),
      automatischer_nachlauf_min:num('Beobachtete erforderliche Geräte-Nachlaufminuten bis zur möglichen Entnahme.'),
      waesche_entnehmen_min:num('Anschließend benötigte aktive Minuten für Entnahme und Mitnahme.'),
      raum_naechste_nutzung_min:num('Bestätigter Beginn der nachfolgenden Raumnutzung auf derselben Achse.'),
    }, ({hauptprogramm_fertig_min,automatischer_nachlauf_min,waesche_entnehmen_min,raum_naechste_nutzung_min}) => {
      const geraetFrei = hauptprogramm_fertig_min+automatischer_nachlauf_min;
      return {geraet_frei_min:round(geraetFrei),raum_frei_min:round(geraetFrei+waesche_entnehmen_min),
        geraet_blockiert_folgenutzung:geraetFrei>raum_naechste_nutzung_min,
        entnahme_bis_folgestart_nicht_fertig:waesche_entnehmen_min>0 && geraetFrei+waesche_entnehmen_min>raum_naechste_nutzung_min,
        hinweis:'Nachlauf, sichere Entnahme und so bestätigte Entnahmezeit für das konkrete Programm verwenden. Keine vorzeitige Entnahme ableiten.'};
    }, {hauptprogramm_fertig_min:800,automatischer_nachlauf_min:10,waesche_entnehmen_min:7,raum_naechste_nutzung_min:815},
    {geraet_frei_min:810,raum_frei_min:817,geraet_blockiert_folgenutzung:false,entnahme_bis_folgestart_nicht_fertig:true}),

  tool('entfeuchter_tankleerung_zwei_zeitpunkte',
    'Eine Tankleerung zwischen zwei beaufsichtigten Messabschnitten so einplanen, dass der eigene beobachtete Bedarf passt. — Check one manual tank emptying between two supervised dehumidifier sessions.',
    cellar, {
      anfangsfrei_ml:num('Zu Beginn praktisch freier Tankinhalt bis zum dokumentierten Füllstopp.',50000),
      tank_frei_nach_leeren_ml:num('Praktisch freier Tankinhalt direkt nach vorgabegerechtem vollständigen Entleeren.',50000),
      sammlung_a_ml:num('Bei vergleichbarer Temperatur und Feuchte beobachtete Sammelmenge im ersten Abschnitt.',50000),
      sammlung_b_ml:num('Ebenso beobachtete Sammelmenge im zweiten Abschnitt.',50000),
      leerung_zwischenzeit:flag('Ist eine Person zwischen beiden Abschnitten für die Tankleerung verfügbar?'),
    }, ({anfangsfrei_ml,tank_frei_nach_leeren_ml,sammlung_a_ml,sammlung_b_ml,leerung_zwischenzeit}) => {
      if (!tank_frei_nach_leeren_ml || anfangsfrei_ml>tank_frei_nach_leeren_ml) throw new RangeError();
      const freiB = leerung_zwischenzeit ? tank_frei_nach_leeren_ml : positive(anfangsfrei_ml-sammlung_a_ml);
      return {tankreserve_a_ml:round(anfangsfrei_ml-sammlung_a_ml),
        tankreserve_b_ml:sammlung_a_ml>anfangsfrei_ml ? null : round(freiB-sammlung_b_ml),
        zuerst_kleineren_abschnitt_waehlen:sammlung_a_ml>anfangsfrei_ml,
        hinweis:'Vergleichbare eigene Messbedingungen sind erforderlich. Der Füllstopp bleibt aktiv. Zeitpunkt und Möglichkeit des Neustarts am Modell prüfen.'};
    }, {anfangsfrei_ml:900,tank_frei_nach_leeren_ml:1800,sammlung_a_ml:750,sammlung_b_ml:1200,leerung_zwischenzeit:true},
    {tankreserve_a_ml:150,tankreserve_b_ml:600,zuerst_kleineren_abschnitt_waehlen:false}),

  tool('luftbefeuchter_zweistufen_tank_restmenge',
    'Für zwei schon vermessene Stufen bestimmen, welche nach dem Wechsel noch aus dem vorhandenen Wasser läuft. — Budget measured water for two humidifier modes without projecting a room effect.',
    humid, {
      wasser_ml:num('Nutzbares Wasser oberhalb der dokumentierten Mindestgrenze vor dem ersten Abschnitt.',30000),
      erster_bedarf_ml:num('Bei vergleichbaren Bedingungen gemessene Menge im ersten Abschnitt.',30000),
      zweiter_bedarf_je_stunde_ml:num('Beobachtete Nutzung pro Stunde in der zweiten Stufe.',30000),
      zweite_stufe_min:num('Geplante Minuten in der zweiten Stufe.'),
      wechsel_bestaetigt:flag('Ist der Wechsel mit dieser Restfüllung beim konkreten Modell nach Anleitung möglich?'),
    }, ({wasser_ml,erster_bedarf_ml,zweiter_bedarf_je_stunde_ml,zweite_stufe_min,wechsel_bestaetigt}) => {
      const nachErster = wasser_ml-erster_bedarf_ml;
      const bedarfZwei = zweiter_bedarf_je_stunde_ml*zweite_stufe_min/60;
      return {erste_stufe_abgedeckt:wechsel_bestaetigt ? nachErster>=0 : null,
        zweite_stufe_abgedeckt:wechsel_bestaetigt && nachErster>=0 ? nachErster>=bedarfZwei : null,
        fehlmenge_nach_wechsel_ml:wechsel_bestaetigt && nachErster>=0 ? round(positive(bedarfZwei-nachErster)) : null,
        hinweis:'Variabler Betrieb kann die gemessene Abgabe verändern. Herstellervorgaben zu Wasser, Pflege und verbleibendem Wasser einhalten.'};
    }, {wasser_ml:420,erster_bedarf_ml:220,zweiter_bedarf_je_stunde_ml:160,zweite_stufe_min:90,wechsel_bestaetigt:true},
    {erste_stufe_abgedeckt:true,zweite_stufe_abgedeckt:false,fehlmenge_nach_wechsel_ml:40}),

  tool('luftbefeuchter_betrieb_nach_routinewechsel',
    'Ermitteln, ob ein laut Anleitung austauschbarer und geeigneter Vorratstank zwischen zwei Sitzungen tatsächlich einen Pflegeengpass löst. — Compare a normally cleaned tank with an existing, approved ready tank at the next session.',
    humid, {
      bisheriger_tank_frei_ab_min:num('Zeitpunkt nach der vollständigen vorgeschriebenen Routine beim verwendeten Tank.'),
      ersatztank_frei_ab_min:num('Entsprechender Zeitpunkt beim bereits vorhandenen geeigneten Ersatz.'),
      start_ziel_min:num('Gewünschter Start der nächsten Sitzung auf derselben Minutenachse.'),
      ersatz_bestaetigt:flag('Eigenes Modell, verwendeter Ersatz und alle weiteren Schritte sind für diesen Wechsel freigegeben.'),
    }, ({bisheriger_tank_frei_ab_min,ersatztank_frei_ab_min,start_ziel_min,ersatz_bestaetigt}) => {
      const normal = positive(bisheriger_tank_frei_ab_min-start_ziel_min);
      const mitErsatz = positive(Math.min(bisheriger_tank_frei_ab_min,ersatztank_frei_ab_min)-start_ziel_min);
      return {normal_spaeter_min:round(normal),mit_bestaetigtem_ersatz_spaeter_min:ersatz_bestaetigt ? round(mitErsatz) : null,
        ersatz_macht_start_puenktlich:ersatz_bestaetigt ? normal>0 && mitErsatz===0 : null,
        hinweis:'Reguläre Pflege, sauberes Wasser und die Anleitung des konkreten Modells beachten. Der Tank ersetzt keine fällige Pflege weiterer Bauteile.'};
    }, {bisheriger_tank_frei_ab_min:615,ersatztank_frei_ab_min:580,start_ziel_min:600,ersatz_bestaetigt:true},
    {normal_spaeter_min:15,mit_bestaetigtem_ersatz_spaeter_min:0,ersatz_macht_start_puenktlich:true}),

  tool('klimageraet_ein_aus_timer_kombinationsbeleg',
    'Ein geplantes Klimafenster gegen dokumentierten Starttimer, Stopptimer und deren gleichzeitige Nutzbarkeit prüfen. — Verify that both ends of an AC window can be automated together.',
    ac, {
      einschalten:pick('Stand der Anleitung für einen Einschalt-Timer.','belegt','fehlt','offen'),
      ausschalten:pick('Stand der Anleitung für einen Ausschalt-Timer.','belegt','fehlt','offen'),
      kombiniert:pick('Stand der Anleitung zur gleichzeitigen Programmierung beider Ereignisse im selben Modus.','belegt','fehlt','offen'),
    }, ({einschalten,ausschalten,kombiniert}) => {
      if (kombiniert==='belegt' && [einschalten,ausschalten].includes('fehlt')) throw new RangeError();
      const status = [einschalten,ausschalten,kombiniert];
      return {beide_timer_einzeln_belegt:einschalten==='belegt' && ausschalten==='belegt',
        fenster_automatisch:status.includes('fehlt') ? false : kombiniert==='belegt' ? true : null,
        hinweis:'Für genaue Referenz, Modus und Bedienweg prüfen. Ein Abschalt-Timer oder die Werbung mit Timer belegt keine vollständige Start-und-Ende-Planung.'};
    }, {einschalten:'belegt',ausschalten:'belegt',kombiniert:'offen'}, {beide_timer_einzeln_belegt:true,fenster_automatisch:null}),

  tool('klimageraet_timer_moduswechsel_uebergang',
    'Zwischen zwei dokumentiert nutzbaren Betriebsarten den Wechselpuffer bis zur nächsten Buchung prüfen. — Reserve a manual-verified changeover and any documented restart delay.',
    ac, {
      erster_modus_fertig_min:num('Ende des ersten Modus auf der gemeinsamen Minutenachse.'),
      umruecken_min:num('Dauer für den zuvor dokumentierten notwendigen manuellen Wechsel.'),
      freigabe_warte_min:num('Danach erforderliche Wartezeit gemäß der konkreten Anleitung.'),
      folgetermin_min:num('Gewünschter Start der nächsten Betriebsart auf derselben Achse.'),
      anleitung_geprueft:flag('Der genaue Moduswechsel, seine Reihenfolge und die Wartezeit sind anhand der Anleitung geklärt.'),
    }, ({erster_modus_fertig_min,umruecken_min,freigabe_warte_min,folgetermin_min,anleitung_geprueft}) => {
      const bereit = erster_modus_fertig_min+umruecken_min+freigabe_warte_min;
      return {bereit_ab_min:anleitung_geprueft ? round(bereit) : null,
        spaeter_als_termin_min:anleitung_geprueft ? round(positive(bereit-folgetermin_min)) : null,
        hinweis:'Nur bestätigte Reihenfolge und Mindestwartezeit übernehmen. Timer für den neuen Modus separat einstellen und prüfen.'};
    }, {erster_modus_fertig_min:670,umruecken_min:11,freigabe_warte_min:7,folgetermin_min:680,anleitung_geprueft:true},
    {bereit_ab_min:688,spaeter_als_termin_min:8}),

  tool('ventilator_timer_wiederholtage_abdecken',
    'Eine einmalige Timerfunktion von einer für die geplanten Wochentage belegten Wiederholung unterscheiden. — Compare supported repeat days with the planned weekly fan routine.',
    fan, {
      geplante_wochentage:num('Anzahl der Wochentage mit je einem vorgesehenen Betriebsfenster.',7),
      eingerichtet_wochentage:num('Anzahl genau dieser Tage mit wiederkehrend belegter und eingerichteter passender Zeitsteuerung.',7),
      wiederholung:pick('Stand der Anleitung für die Zeitfunktion im ausgewählten Modus.','belegt','einmalig','offen'),
    }, ({geplante_wochentage,eingerichtet_wochentage,wiederholung}) => {
      whole(geplante_wochentage,eingerichtet_wochentage);
      if (eingerichtet_wochentage>geplante_wochentage || (wiederholung!=='belegt' && eingerichtet_wochentage>0)) throw new RangeError();
      return {wiederholt_abgedeckte_tage:wiederholung==='offen' ? null : eingerichtet_wochentage,
        tage_mit_manueller_einrichtung:wiederholung==='offen' ? null : geplante_wochentage-eingerichtet_wochentage,
        hinweis:'Je Tag wird nur ein Fenster beurteilt. Genaue Timerart, Bedienweg und gewünschte Einstellung laut Anleitung prüfen.'};
    }, {geplante_wochentage:5,eingerichtet_wochentage:3,wiederholung:'belegt'},
    {wiederholt_abgedeckte_tage:3,tage_mit_manueller_einrichtung:2}),

  tool('lichterkette_timer_einschaltfenster_vergleichen',
    'Bei einem bestätigten Tageszyklus prüfen, wie viele gewünschte Einschaltminuten ein gewählter Start tatsächlich trifft. — Intersect a documented daily light timer with the intended clock window.',
    lights, {
      timer_start_min:num('Start der Einschaltphase als Minuten ab Mitternacht, kleiner als 1440.'),
      timer_an_min:num('Dokumentierte aktive Minuten innerhalb eines genauen 24-Stunden-Zyklus.'),
      wunsch_start_min:num('Beginn des gewünschten Fensters als Minuten ab Mitternacht, kleiner als 1440.'),
      wunsch_dauer_min:num('Länge des gewünschten Fensters in Minuten, auch über Mitternacht.'),
      tageszyklus_bestaetigt:flag('Genau dieser Einschaltzyklus wiederholt sich laut Anleitung jeden Tag.'),
    }, ({timer_start_min,timer_an_min,wunsch_start_min,wunsch_dauer_min,tageszyklus_bestaetigt}) => {
      if (timer_start_min>=1440 || wunsch_start_min>=1440) throw new RangeError();
      const davon = [-1440,0,1440].reduce((sum,versatz) => sum+positive(
        Math.min(wunsch_start_min+wunsch_dauer_min,timer_start_min+versatz+timer_an_min)-
        Math.max(wunsch_start_min,timer_start_min+versatz)),0);
      return {wunsch_beides_an_min:tageszyklus_bestaetigt ? round(davon) : null,
        ausserhalb_wunsch_an_min:tageszyklus_bestaetigt ? round(positive(timer_an_min-davon)) : null,
        hinweis:'Nur Uhrzeitvergleich. Timerprogramm, Zeitzone und Einsatzort anhand des Modells prüfen.'};
    }, {timer_start_min:1380,timer_an_min:360,wunsch_start_min:1410,wunsch_dauer_min:180,tageszyklus_bestaetigt:true},
    {wunsch_beides_an_min:180,ausserhalb_wunsch_an_min:180}),

  tool('heizthermostat_ausnahme_normalplan_rueckkehr',
    'Ein bestätigtes vorübergehendes Thermostatprofil gegen das nächste reguläre Zeitfenster abgleichen. — Identify whether a documented temporary override shortens or masks the next ordinary thermostat period.',
    heating, {
      normal_start_min:num('Beginn des nächsten normalen Profilfensters auf der Minutenachse.'),
      normal_ende_min:num('Ende dieses Fensters auf derselben Achse.'),
      ausnahme_ende_min:num('Geplantes Ende der schon vorher aktiven Ausnahme auf derselben Achse.'),
      rueckkehr:pick('Dokumentiertes Verhalten im lokalen Setup.','ende_ausnahme','naechster_programmwechsel','ungeklaert'),
    }, ({normal_start_min,normal_ende_min,ausnahme_ende_min,rueckkehr}) => {
      ranges([normal_start_min,normal_ende_min]);
      const verdrangt = rueckkehr==='ende_ausnahme' ? positive(Math.min(normal_ende_min,ausnahme_ende_min)-normal_start_min) : 0;
      return {normales_fenster_verdeckt_min:rueckkehr==='ungeklaert' ? null : round(verdrangt),
        normales_fenster_verbleibt_min:rueckkehr==='ungeklaert' ? null : round(normal_ende_min-normal_start_min-verdrangt),
        hinweis:'Nur Verhalten der Reglerlogik. Das Zeitprofil garantiert keine Raumtemperatur. Modus und Priorität anhand des konkreten Systems prüfen.'};
    }, {normal_start_min:420,normal_ende_min:510,ausnahme_ende_min:450,rueckkehr:'ende_ausnahme'},
    {normales_fenster_verdeckt_min:30,normales_fenster_verbleibt_min:60}),

  tool('gefrierfach_hohe_boxen_flexplatzbedarf',
    'Gemessene große und kleine Behälterplätze so zuordnen, dass die nur für hohe Boxen geeigneten Plätze genutzt werden. — Allocate high and short freezer containers across restricted and flexible positions.',
    appliances, {
      hohe_boxen:count('Einzuordnende gleich hohe hohe Boxen aus derselben Passprobe.'),
      niedrige_boxen:count('Einzuordnende gleich niedrige Boxen aus derselben Passprobe.'),
      nur_hohe_plaetze:count('Bestätigte Plätze, in die nach Grundfläche und Höhe nur Boxen der höheren Sorte passen.'),
      nur_niedrige_plaetze:count('Bestätigte Plätze, in die nach Grundfläche und Höhe nur Boxen der niedrigeren Sorte passen.'),
      flexible_plaetze:count('Weitere gleichzeitig nutzbare Plätze, die jeweils eine hohe oder niedrige Box aufnehmen.'),
    }, ({hohe_boxen,niedrige_boxen,nur_hohe_plaetze,nur_niedrige_plaetze,flexible_plaetze}) => {
      whole(hohe_boxen,niedrige_boxen,nur_hohe_plaetze,nur_niedrige_plaetze,flexible_plaetze);
      const hoheOffen = positive(hohe_boxen-nur_hohe_plaetze);
      const niedrigeOffen = positive(niedrige_boxen-nur_niedrige_plaetze);
      const flexibleFuerHohe = Math.min(flexible_plaetze,hoheOffen);
      return {hohe_boxen_ohne_platz:hoheOffen-flexibleFuerHohe,
        niedrige_boxen_ohne_platz:positive(niedrigeOffen-(flexible_plaetze-flexibleFuerHohe)),
        freie_flexplaetze:positive(flexible_plaetze-hoheOffen-niedrigeOffen),
        hinweis:'Hohe Boxen haben hier Vorrang an Flexplätzen. Nur bei tatsächlich gleichzeitig nutzbaren Plätzen aus der Passprobe. Schubladenfunktion, Luftwege und Anleitung beachten.'};
    }, {hohe_boxen:4,niedrige_boxen:5,nur_hohe_plaetze:2,nur_niedrige_plaetze:3,flexible_plaetze:3},
    {hohe_boxen_ohne_platz:0,niedrige_boxen_ohne_platz:1,freie_flexplaetze:0}),

  tool('heizdecke_abschaltautomatik_einzelnutzung',
    'Die dokumentierte einmalige Abschaltautomatik in einem bereits zulässigen, beaufsichtigten Nutzungsabschnitt zeitlich berücksichtigen. — Account for documented auto-off within one already permitted, attended use.',
    '/guide/heizdecke-stromverbrauch.html', {
      gewuenscht_min:num('Geplante beaufsichtigte Nutzungszeit in Minuten.'),
      dokumentiert_abschalt_min:num('Abschaltminuten ab Betriebsstart laut Anleitung genau dieses Modells und dieser Stufe.'),
      nutzung_bestaetigt:flag('Anleitung bestätigt diese konkrete Nutzungsart, Aufsicht, Stufe und Abschaltautomatik.'),
    }, ({gewuenscht_min,dokumentiert_abschalt_min,nutzung_bestaetigt}) => {
      if (nutzung_bestaetigt && !dokumentiert_abschalt_min) throw new RangeError();
      return {vor_auto_aus_min:nutzung_bestaetigt ? round(Math.min(gewuenscht_min,dokumentiert_abschalt_min)) : null,
        restfenster_nach_auto_aus_min:nutzung_bestaetigt ? round(positive(gewuenscht_min-dokumentiert_abschalt_min)) : null,
        hinweis:'Die Automatik belegt keine anderweitige Freigabe der Nutzungsdauer. Kein Neustart und keine Verlängerung über die Herstellervorgaben ableiten.'};
    }, {gewuenscht_min:80,dokumentiert_abschalt_min:60,nutzung_bestaetigt:true},
    {vor_auto_aus_min:60,restfenster_nach_auto_aus_min:20}),

  tool('waschtrockner_kombilauf_entnahmefaelle',
    'Vor einem Kombilauf prüfen, ob die gewählte Waschmischung einen Eingriff zwischen Waschen und Trocknen verlangt. — Detect which pieces prevent a documented no-handoff wash-to-dry batch.',
    appliances, {
      teile_in_waschladung:count('Teile der geplanten Waschladung.'),
      davon_nur_waschen:count('Teile ohne Freigabe für das konkret gewählte Trockenprogramm laut Kennzeichnung.'),
      davon_trocknung_offen:count('Weitere Teile mit noch ungeklärter Freigabe.'),
      gesamtlast_kg:num('Gesamte Trockenmasse der ausgewählten Waschladung in Kilogramm.',80),
      kombilast_kg:num('Dokumentierte maximale Trockenmasse des genau gewählten Kombiprogramms in Kilogramm.',80),
      durchlauf_bestaetigt:flag('Unterstützt das gewählte Kombiprogramm den vorgesehenen Lauf ohne Eingriff zwischen Waschen und Trocknen?'),
    }, ({teile_in_waschladung,davon_nur_waschen,davon_trocknung_offen,gesamtlast_kg,kombilast_kg,durchlauf_bestaetigt}) => {
      whole(teile_in_waschladung,davon_nur_waschen,davon_trocknung_offen);
      if (!teile_in_waschladung || !gesamtlast_kg || !kombilast_kg ||
          davon_nur_waschen+davon_trocknung_offen>teile_in_waschladung) throw new RangeError();
      return {durchlauf_ohne_entnahme_geprueft:durchlauf_bestaetigt && davon_nur_waschen===0 && davon_trocknung_offen===0 && gesamtlast_kg<=kombilast_kg,
        erst_pflegekennzeichnung_klaeren:davon_trocknung_offen,
        vorher_zu_trennen:davon_nur_waschen,ueber_kombilast_kg:round(positive(gesamtlast_kg-kombilast_kg)),
        hinweis:'Bei Teilentnahme neu wiegen. Gerät muss den geplanten Ablauf unterstützen. Pflegezeichen und die Grenzen des Wasch- und Trockenprogramms einhalten.'};
    }, {teile_in_waschladung:12,davon_nur_waschen:2,davon_trocknung_offen:1,gesamtlast_kg:4.5,kombilast_kg:5,durchlauf_bestaetigt:true},
    {durchlauf_ohne_entnahme_geprueft:false,erst_pflegekennzeichnung_klaeren:1,vorher_zu_trennen:2,ueber_kombilast_kg:0}),
];
