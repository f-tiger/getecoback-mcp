const ROOF = '/guide/klimaanlage-dachfenster.html';
const SEAL = '/guide/fensterabdichtung-klimaanlage.html';
const TILT = '/guide/klimaanlage-kippfenster.html';
const PANEL = '/guide/fensterabdichtung-selber-bauen.html';
const HOSE = '/guide/abluftschlauch-verlaengern.html';
const SHADE = '/guide/hitzeschutz-fenster.html';
const BALCONY = '/guide/balkon-terrasse-beschatten.html';
const VENT = '/guide/richtig-lueften-bei-hitze.html';
const COOL = '/guide/mobile-klimaanlage-kuehlt-nicht.html';
const NOISE = '/guide/mobile-klimaanlage-zu-laut.html';
const COST = '/guide/klimaanlage-stromkosten.html';
const RENT = '/guide/klimaanlage-mietwohnung.html';

const num = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const state = (description, values) => ({type:'string', description, enum:values});
const yes = (description) => ({type:'boolean', description});
const mm = (description) => num(description + ' in mm.', 0, 4000);
const mins = (description) => num(description + ' in Minuten.', 0, 1440);
const temp = (description) => num(description + ' in °C.', -30, 80);
const count = (description) => num(description, 0, 200);
const round = (value, digits = 2) => Number.isFinite(value) ? Number(value.toFixed(digits)) + 0 : null;

function tool(name, description, page, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example:{args, expect}};
}

function validCounts(values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Anzahlen als ganze Zahlen eintragen.');
}

export const fensterbetrieb = [
  tool('dachfenster_stoffkit_kantenreserve_einzeln',
    'Prüft die einzelnen Kanten eines abnehmbaren Dachfensterkits statt nur seines Umfangs — Compare separately dimensioned edges of a removable roof-window seal.',
    ROOF, {
      oben_fenster_mm:mm('Obere Kante entlang der Hersteller-Messlinie'), oben_kit_mm:mm('Nutzbare obere Kitkante'),
      seite_fenster_mm:mm('Längere der beiden Seitenkanten auf derselben Messlinie'), seite_kit_mm:mm('Kürzere nutzbare Kitseitenkante'),
      unten_fenster_mm:mm('Untere Kante auf derselben Messlinie'), unten_kit_mm:mm('Nutzbare untere Kitkante')
    }, ({oben_fenster_mm,oben_kit_mm,seite_fenster_mm,seite_kit_mm,unten_fenster_mm,unten_kit_mm}) => {
      const kanten = {oben:oben_kit_mm-oben_fenster_mm,seite:seite_kit_mm-seite_fenster_mm,unten:unten_kit_mm-unten_fenster_mm};
      return {reserve_mm:kanten, zu_kurz:Object.keys(kanten).filter(kante => kanten[kante] < 0),
        hinweis:'Nur für Kitkanten mit eindeutig dokumentierter Zuordnung. Der Längenvergleich erfasst keine Ecken, Befestigung oder Geometrie im Schwenkbereich.'};
    }, {oben_fenster_mm:700,oben_kit_mm:720,seite_fenster_mm:940,seite_kit_mm:910,unten_fenster_mm:730,unten_kit_mm:740},
    {reserve_mm:{oben:20,seite:-30,unten:10},zu_kurz:['seite']}),

  tool('dachfenster_haftstellen_wiederholungsprobe',
    'Vergleicht nur tatsächlich beobachtete Ablösungen nach einer gleich langen Nutzungsfolge — Compare observed roof-window seal detachments after equal sequences of use.',
    ROOF, {
      gepruefte_ecken:count('Zahl gleicher, von innen sichtbarer Eckstellen in beiden Durchgängen.'),
      lose_frueher:count('Beim ersten Durchgang gelöste Eckstellen.'),
      lose_spaeter:count('Beim zweiten Durchgang gelöste Eckstellen.'),
      zyklus_gleich:yes('Gleiche Zahl regulärer Nutzungswechsel, Beobachtungsdauer und Eckstellen?')
    }, ({gepruefte_ecken,lose_frueher,lose_spaeter,zyklus_gleich}) => {
      validCounts([gepruefte_ecken,lose_frueher,lose_spaeter]);
      if (Math.max(lose_frueher,lose_spaeter)>gepruefte_ecken) throw new RangeError('Mehr gelöste als geprüfte Eckstellen.');
      return {gepruefte_ecken, lose_frueher, lose_spaeter,
        veraenderung_ecken:zyklus_gleich&&gepruefte_ecken>0?lose_spaeter-lose_frueher:null,
        hinweis:'Beobachtete Ablösungen sind kein Haltbarkeitsnachweis. Nur reguläre Nutzung nach Anleitung vergleichen, ohne am offenen Fenster nachzuhelfen.'};
    }, {gepruefte_ecken:4,lose_frueher:1,lose_spaeter:3,zyklus_gleich:true},
    {gepruefte_ecken:4,veraenderung_ecken:2}),

  tool('dachfenster_anlagelinie_rahmen_fluegel_abgleichen',
    'Unterscheidet die dokumentierte Anlagelinie für den Stoff vom vermessenen Fensterteil — Compare the documented length reference with the frame or sash that was measured.',
    ROOF, {
      vorgabe:state('In der Anleitung bezeichnete Länge.', ['rahmen','fluegel','umlauf_beide','unklar']),
      gemessen:state('Teil entlang dessen die vorhandene Länge gemessen wurde.', ['rahmen','fluegel','umlauf_beide','unklar']),
      laenge_mm:mm('Gemessene Länge entlang der angegebenen Linie')
    }, ({vorgabe,gemessen,laenge_mm}) => ({
      mass_verwendbar:vorgabe==='unklar'||gemessen==='unklar'?null:vorgabe===gemessen,
      laenge_mm:vorgabe===gemessen&&vorgabe!=='unklar'?laenge_mm:null,
      hinweis:'Stoffkits können unterschiedliche Anlagelinien vorgeben. Eine Flügellänge ist ohne Herstellerbeleg nicht gegen eine Rahmenlänge austauschbar.'
    }), {vorgabe:'umlauf_beide',gemessen:'fluegel',laenge_mm:3220}, {mass_verwendbar:false,laenge_mm:null}),

  tool('dachfenster_griffzugang_ohne_krafteinwirkung',
    'Hält fest, ob der übliche Griff im beobachteten Aufbau ohne Umgreifen erreichbar blieb — Record access to the normal handle without reaching across a temporary seal.',
    ROOF, {
      griff_vorher:yes('Ist der übliche Griff bei entfernten Zubehörteilen vom normalen Bedienplatz erreichbar?'),
      griff_mit_kit:state('Sichtbeobachtung beim vorhandenen Zustand.', ['erreichbar','verdeckt','nicht_beobachtet']),
      umgreifen_noetig:yes('Wäre ein zusätzlicher Zugriff um Stoff oder Platte herum nötig?')
    }, ({griff_vorher,griff_mit_kit,umgreifen_noetig}) => ({
      griffzugang_eingeschraenkt:griff_vorher&&griff_mit_kit!=='nicht_beobachtet'?griff_mit_kit==='verdeckt'||umgreifen_noetig:null,
      sichtbeobachtung:griff_mit_kit,
      hinweis:'Nur vorhandenen Zugriff von innen dokumentieren. Nicht um Hindernisse greifen, keinen Griff erzwingen oder eine Störung am geöffneten Fenster beheben.'
    }), {griff_vorher:true,griff_mit_kit:'verdeckt',umgreifen_noetig:true},
    {griffzugang_eingeschraenkt:true,sichtbeobachtung:'verdeckt'}),

  tool('dachfenster_oeffnung_spaltprofil_kitbereich',
    'Vergleicht drei statische Spaltmaße mit dem deklarierten Arbeitsbereich eines konkreten Stoffkits — Check three fixed-position gap measurements against the documented fabric kit range.',
    ROOF, {
      spalt_unten_mm:mm('Spalt unten bei derselben Öffnungsstellung'), spalt_mitte_mm:mm('Spalt mittig'),
      spalt_oben_mm:mm('Spalt oben'), kit_min_mm:mm('Dokumentierter Mindestspalt dieses Kits'),
      kit_max_mm:mm('Dokumentierter Höchstspalt dieses Kits')
    }, ({spalt_unten_mm,spalt_mitte_mm,spalt_oben_mm,kit_min_mm,kit_max_mm}) => {
      if (kit_min_mm>kit_max_mm) throw new RangeError('Der Mindestspalt des Kits darf den Höchstspalt nicht überschreiten.');
      const spalte = {unten:spalt_unten_mm,mitte:spalt_mitte_mm,oben:spalt_oben_mm};
      return {spannweite_mm:Math.max(...Object.values(spalte))-Math.min(...Object.values(spalte)),
        abweichende_lagen:Object.keys(spalte).filter(k => spalte[k]<kit_min_mm||spalte[k]>kit_max_mm),
        hinweis:'Statische Maße des eigenen Aufbaus vergleichen. Erreichbare Messpunkte, Fensterbauart und Einbauanleitung bestimmen die Anwendbarkeit.'};
    }, {spalt_unten_mm:70,spalt_mitte_mm:90,spalt_oben_mm:135,kit_min_mm:60,kit_max_mm:120},
    {spannweite_mm:65,abweichende_lagen:['oben']}),

  tool('dachfenster_kit_abnahme_vor_fensterzustand',
    'Klärt dokumentierte Anforderungen zur Kitabnahme vor einem geplanten Wechsel der Fensterstellung — Check whether documented removal was observed before a roof-window mode change.',
    ROOF, {
      anleitung:state('Vorgabe für den konkreten Wechsel.', ['abnehmen','wechsel_dokumentiert','unklar']),
      stoff_ab:yes('Stoff war vor dem Wechsel vollständig abgenommen.'),
      adapter_ab:yes('Auslassadapter war vor dem Wechsel vollständig abgenommen.')
    }, ({anleitung,stoff_ab,adapter_ab}) => ({
      abnahmebedarf:anleitung,
      abnahme_belegt:stoff_ab&&adapter_ab,
      fehlende_bestaetigung:anleitung==='abnehmen'?[...(!stoff_ab?['stoff']:[]),...(!adapter_ab?['adapter']:[])]:[],
      hinweis:'Dokumentationsabgleich vor Bewegung. Keine Kraftanwendung und keine Freigabe für eine ungeklärte Stellung.'
    }), {anleitung:'abnehmen',stoff_ab:true,adapter_ab:false},
    {abnahmebedarf:'abnehmen',abnahme_belegt:false,fehlende_bestaetigung:['adapter']}),

  tool('dachfenster_kit_abnahme_zeitstreuung',
    'Ermittelt die beobachtete Dauerstreuung bis ein Dachfenster nach Kitabnahme geschlossen war — Find the observed range of normal closure times after kit removal.',
    ROOF, {
      erster_min:mins('Zeit vom regulären Abschalten bis zum dokumentierten Fensterschluss im ersten Versuch'),
      zweiter_min:mins('Zeit im zweiten gleichartigen Versuch'), dritter_min:mins('Zeit im dritten gleichartigen Versuch'),
      vorlauf_min:mins('Verfügbare Zeit vor einem bereits feststehenden Termin')
    }, ({erster_min,zweiter_min,dritter_min,vorlauf_min}) => {
      const [minimum,median,maximum] = [erster_min,zweiter_min,dritter_min].sort((a,b)=>a-b);
      return {minimum_min:minimum,median_min:median,maximum_min:maximum,
        rest_mit_langsamstem_versuch_min:round(vorlauf_min-maximum),
        hinweis:'Messwerte dienen der Alltagsplanung. Sie sind keine Eignung für Störungen, Wetterumschwung oder einen Notfall.'};
    }, {erster_min:3,zweiter_min:5,dritter_min:4,vorlauf_min:7},
    {minimum_min:3,median_min:4,maximum_min:5,rest_mit_langsamstem_versuch_min:2}),

  tool('dachfenster_auslass_sichtgrenze_von_innen',
    'Dokumentiert, welche Teile eines Dachfensterauslasses ohne Hinauslehnen überhaupt überprüfbar waren — Record which roof-window outlet sections were visible from indoors.',
    ROOF, {
      ende:state('Auslassende vom sicheren Innenstandort.', ['sichtbar_frei','sichtbar_auffaellig','nicht_sichtbar']),
      adapter:state('Verbindung am Auslassadapter.', ['sichtbar_frei','sichtbar_auffaellig','nicht_sichtbar']),
      stoff:state('Stoff unmittelbar am Adapter.', ['sichtbar_frei','sichtbar_auffaellig','nicht_sichtbar'])
    }, ({ende,adapter,stoff}) => {
      const punkte = {ende,adapter,stoff};
      return {offene_sichtstellen:Object.keys(punkte).filter(k=>punkte[k]==='nicht_sichtbar'),
        auffaellige_sichtstellen:Object.keys(punkte).filter(k=>punkte[k]==='sichtbar_auffaellig'),
        hinweis:'Erfasst nur von innen erkennbare Befunde am ausgeschalteten Gerät. Nicht hinauslehnen oder aufsteigen. Sichtbarkeit belegt weder Durchsatz noch Außensicherheit.'};
    }, {ende:'nicht_sichtbar',adapter:'sichtbar_frei',stoff:'sichtbar_auffaellig'},
    {offene_sichtstellen:['ende'],auffaellige_sichtstellen:['stoff']}),

  tool('dachfenster_sonnenschutz_schaltstellungen_abgleichen',
    'Prüft beobachtete Kombinationen aus Dachfensterschutz und Abluftstellung für zwei unterschiedliche Nutzungsziele — Distinguish tested shade positions for light control and exhaust operation.',
    ROOF, {
      lichtziel:state('Für das eigene Lichtziel tatsächlich genutzte Position.', ['offen','teilweise','geschlossen']),
      beim_kuehlen:state('Beobachtete Position während des dokumentierten Kühlaufbaus.', ['offen','teilweise','geschlossen','unbekannt']),
      gleichzeitig_beobachtet:yes('Beide Funktionen waren in derselben Position gleichzeitig sichtbar nutzbar.')
    }, ({lichtziel,beim_kuehlen,gleichzeitig_beobachtet}) => ({
      gleiche_position:beim_kuehlen==='unbekannt'?null:lichtziel===beim_kuehlen,
      gemeinsamer_betrieb_beobachtet:beim_kuehlen==='unbekannt'?null:lichtziel===beim_kuehlen&&gleichzeitig_beobachtet,
      hinweis:'Eigene dokumentierte Stellung vergleichen. Stoff oder Rollo nicht vor einen Auslass bringen. Der beobachtete Betrieb ersetzt keine Herstellerangabe.'
    }), {lichtziel:'teilweise',beim_kuehlen:'offen',gleichzeitig_beobachtet:false},
    {gleiche_position:false,gemeinsamer_betrieb_beobachtet:false}),

  tool('dachfenster_kit_randskizze_offene_abschnitte',
    'Addiert sichtbar unbedeckte, getrennte Abschnitte am ruhenden Rand eines vorhandenen Stoffkits — Total visible nonoverlapping gaps in a stationary roof-window seal.',
    ROOF, {
      oben_mm:mm('Unbedeckter Randabschnitt oben'), links_mm:mm('Unbedeckter Randabschnitt links ohne Ecküberlappung'),
      rechts_mm:mm('Unbedeckter Randabschnitt rechts ohne Ecküberlappung'), komplett_einsehbar:yes('Alle drei Abschnitte waren vollständig von innen sichtbar.')
    }, ({oben_mm,links_mm,rechts_mm,komplett_einsehbar}) => ({
      sichtbare_luecken_mm:round(oben_mm+links_mm+rechts_mm),
      drei_abschnitte_vollstaendig:komplett_einsehbar,
      beobachtete_abschnitte_mit_luecke:[oben_mm,links_mm,rechts_mm].filter(m=>m>0).length,
      hinweis:'Nur getrennte, sichtbare Ränder messen. Länge sichtbarer Lücken ist weder freie Querschnittsfläche noch tatsächlicher Luftstrom.'
    }), {oben_mm:18,links_mm:0,rechts_mm:22,komplett_einsehbar:false},
    {sichtbare_luecken_mm:40,drei_abschnitte_vollstaendig:false,beobachtete_abschnitte_mit_luecke:2}),

  tool('klimafenster_schliessbeleg_nach_kitabnahme',
    'Hält Schließstellung und sichtbare Griffstellung nach vollständiger Kitabnahme getrennt fest — Record sash closure and normal handle position separately after kit removal.',
    TILT, {
      kit_status:state('Status der temporären Teile.', ['abgenommen','teile_verblieben','unbekannt']),
      fluegel:state('Beobachtete Endstellung des Flügels.', ['geschlossen','nicht_geschlossen','unbekannt']),
      griff:state('Beobachteter Griffzustand.', ['normale_schliessstellung','abweichend','unbekannt'])
    }, ({kit_status,fluegel,griff}) => ({
      rueckbau_und_schliessstellung_belegt:kit_status==='abgenommen'&&fluegel==='geschlossen'&&griff==='normale_schliessstellung',
      unbeobachtete_punkte:Object.entries({kit_status,fluegel,griff}).filter(([,wert])=>wert==='unbekannt').map(([punkt])=>punkt),
      hinweis:'Nur beobachtete Zustände. Schließstellung allein belegt keine Verriegelung, Dichtheit oder Einbruchsicherheit. Bei Widerstand Abstand nehmen und klären.'
    }), {kit_status:'abgenommen',fluegel:'geschlossen',griff:'unbekannt'},
    {rueckbau_und_schliessstellung_belegt:false,unbeobachtete_punkte:['griff']}),

  tool('klimafenster_stoffklappe_rueckkehr_in_lage',
    'Bilanziert normale Zyklen bei denen eine Stoffklappe nach Ende des Luftstroms sichtbar zurückkehrte — Count observed return-to-rest cycles of an existing fabric flap.',
    SEAL, {
      gesehen:count('Vollständig beobachtete reguläre Zyklen.'), zurueck:count('Davon mit Rückkehr an die Ausgangsmarke.'),
      selbst_gewaehltes_ziel:count('Gewünschte Zahl vollständiger, erfolgreicher Beobachtungen.')
    }, ({gesehen,zurueck,selbst_gewaehltes_ziel}) => {
      validCounts([gesehen,zurueck,selbst_gewaehltes_ziel]);
      if (zurueck>gesehen) throw new RangeError('Rückkehrfälle müssen eine Teilmenge der beobachteten Zyklen sein.');
      return {ohne_sichtbare_rueckkehr:gesehen-zurueck,fehlende_zielbeobachtungen:Math.max(0,selbst_gewaehltes_ziel-zurueck),
        hinweis:'Nur eine sichtbare Rückkehr zur selbst gesetzten Marke. Die Zählung misst keine Dichtheit. Klappenstellung nicht bei laufendem Gerät verändern.'};
    }, {gesehen:8,zurueck:6,selbst_gewaehltes_ziel:8}, {ohne_sichtbare_rueckkehr:2,fehlende_zielbeobachtungen:2}),

  tool('fensterabdichtung_randgeraeusch_quellenvergleich',
    'Vergleicht den gemessenen Unterschied zwischen zwei Randpunkten vor und nach einem Kitwechsel — Compare changes in a measured noise-level difference between two seal edges.',
    NOISE, {
      vorher_a_db:num('Pegel an Rand A vor dem Wechsel in dB(A).',0,120), vorher_b_db:num('Pegel an Rand B vor dem Wechsel in dB(A).',0,120),
      nachher_a_db:num('Pegel an Rand A nach dem Wechsel in dB(A).',0,120), nachher_b_db:num('Pegel an Rand B nach dem Wechsel in dB(A).',0,120),
      quelle_gleich:yes('Vergleichbare Quelle, Fensterstellung, Messdistanz und Messdauer?')
    }, ({vorher_a_db,vorher_b_db,nachher_a_db,nachher_b_db,quelle_gleich}) => ({
      randabstand_vorher_db:round(vorher_a_db-vorher_b_db),randabstand_nachher_db:round(nachher_a_db-nachher_b_db),
      veraenderung_randabstand_db:quelle_gleich?round((nachher_a_db-nachher_b_db)-(vorher_a_db-vorher_b_db)):null,
      hinweis:'Pegelunterschied zwischen Messpunkten, keine Schalldämmkennzahl. Außengeräusche, Messgerät und weitere Luftwege können Werte verschieben.'
    }), {vorher_a_db:48,vorher_b_db:43,nachher_a_db:44,nachher_b_db:42,quelle_gleich:true},
    {randabstand_vorher_db:5,randabstand_nachher_db:2,veraenderung_randabstand_db:-3}),

  tool('fensterplatte_auflage_eckkontakt_sichtkarte',
    'Trennt sichtbare Auflageunterbrechungen und verdeckte Ecken einer vorhandenen Fensterplatte — Locate visible gaps in currently observed corner contact.',
    PANEL, {
      oben_links:state('Sichtbefund oben links.', ['kontakt','luecke','verdeckt']),
      oben_rechts:state('Sichtbefund oben rechts.', ['kontakt','luecke','verdeckt']),
      unten_links:state('Sichtbefund unten links.', ['kontakt','luecke','verdeckt']),
      unten_rechts:state('Sichtbefund unten rechts.', ['kontakt','luecke','verdeckt'])
    }, ({oben_links,oben_rechts,unten_links,unten_rechts}) => {
      const ecken = {oben_links,oben_rechts,unten_links,unten_rechts};
      return {luecken:Object.keys(ecken).filter(e=>ecken[e]==='luecke'),verdeckt:Object.keys(ecken).filter(e=>ecken[e]==='verdeckt'),
        diagonal_getrennte_luecken:(oben_links==='luecke'&&unten_rechts==='luecke')||(oben_rechts==='luecke'&&unten_links==='luecke'),
        hinweis:'Die Sichtprüfung zeigt keine Tragfähigkeit. Platte weder belasten noch von außen nachjustieren.'};
    }, {oben_links:'luecke',oben_rechts:'kontakt',unten_links:'verdeckt',unten_rechts:'luecke'},
    {luecken:['oben_links','unten_rechts'],verdeckt:['unten_links'],diagonal_getrennte_luecken:true}),

  tool('fensterplatte_schliessprobe_abnahme_wiederholung',
    'Erfasst wiederkehrende Einschränkungen am Fenster nach Entnahme derselben Platte — Evaluate repeated changes in normal closure after removing the same plate.',
    PANEL, {
      versuche:count('Normal beobachtete Schließvorgänge nach vollständiger Entnahme.'),
      auffaellig:count('Davon mit sichtbarer Abweichung von der regulären Stellung.'),
      baseline_belegt:yes('War die reguläre Schließstellung vor dem ersten Einsatz dokumentiert?')
    }, ({versuche,auffaellig,baseline_belegt}) => {
      validCounts([versuche,auffaellig]);
      if (auffaellig>versuche) throw new RangeError('Auffällige Fälle dürfen die Versuche nicht überschreiten.');
      return {auffaellige_versuche:auffaellig,vergleich_mit_ausgangslage:baseline_belegt&&versuche>0,
        anteil_auffaellig_prozent:baseline_belegt&&versuche>0?round(100*auffaellig/versuche):null,
        hinweis:'Beobachtete Schließzustände reichen nicht für eine Aussage über die Ursache. Widerstand nicht durch Kraft überwinden.'};
    }, {versuche:5,auffaellig:2,baseline_belegt:true},
    {auffaellige_versuche:2,vergleich_mit_ausgangslage:true,anteil_auffaellig_prozent:40}),

  tool('klimafenster_nasses_randbild_zeitfolge',
    'Ordnet Feuchtespuren an einer Fensterabdichtung zeitlich zu einem beobachteten Regenschauer ein — Relate visible seal moisture to a recorded rainfall timeline.',
    SEAL, {
      zuerst_nass_min:mins('Erste bereits dokumentierte sichtbare Feuchte als Minute der Beobachtung'),
      regen_start_min:mins('Beginn des beobachteten Regens in derselben Minute-Zählung'),
      innen_und_aussen_getrennt:yes('Waren Raumseite und Außenseite im Protokoll unterscheidbar?')
    }, ({zuerst_nass_min,regen_start_min,innen_und_aussen_getrennt}) => ({
      feuchte_minus_regen_min:round(zuerst_nass_min-regen_start_min),
      seitenbeleg_vorhanden:innen_und_aussen_getrennt,
      ursache_offen:true,
      hinweis:'Zeitliche Nähe belegt keinen Regeneintritt oder Kondensation. Nur schon dokumentierte Beobachtungen verwenden und bei Regen nicht am Aufbau arbeiten.'
    }), {zuerst_nass_min:28,regen_start_min:24,innen_und_aussen_getrennt:false},
    {feuchte_minus_regen_min:4,seitenbeleg_vorhanden:false,ursache_offen:true}),

  tool('klimafenster_reissverschluss_zwei_endpositionen',
    'Vergleicht am ruhenden Stoff die nutzbaren Reißverschlusspositionen mit zwei eigenen Auslasspositionen — Match recorded zipper travel to two outlet locations in the same seal.',
    TILT, {
      min_position_mm:mm('Dokumentierter Anfang der nutzbaren Positionen ab Stoffmarke'),
      max_position_mm:mm('Dokumentiertes Ende ab derselben Marke'),
      auslass_a_mm:mm('Gemessener Sollpunkt der ersten Anordnung ab derselben Marke'),
      auslass_b_mm:mm('Sollpunkt der zweiten Anordnung ab derselben Marke')
    }, ({min_position_mm,max_position_mm,auslass_a_mm,auslass_b_mm}) => {
      if (min_position_mm>max_position_mm) throw new RangeError('Die minimale Position muss vor der maximalen liegen.');
      const gap = position=>round(Math.max(0,min_position_mm-position,position-max_position_mm));
      return {position_a_ausserhalb_mm:gap(auslass_a_mm),position_b_ausserhalb_mm:gap(auslass_b_mm),
        hinweis:'Nur Längspositionen auf derselben Messlinie am ruhenden Kit vergleichen. Schlauchzug, Material und Zubehörfreigabe sind getrennt zu prüfen.'};
    }, {min_position_mm:90,max_position_mm:520,auslass_a_mm:480,auslass_b_mm:580},
    {position_a_ausserhalb_mm:0,position_b_ausserhalb_mm:60}),

  tool('fensterplatte_lagertiefe_mit_oder_ohne_adapter',
    'Berechnet die nötige Lagertiefe einer ausgebauten Platte bei zwei dokumentierten Adapterzuständen — Compare storage depth with a removable outlet adapter attached or separately packed.',
    PANEL, {
      platte_mm:mm('Größte gemessene Dicke der Platte ohne Adapter'),
      adapter_ueberstand_mm:mm('Gemessener zusätzlicher Überstand des eingesetzten Adapters'),
      huellenraum_mm:mm('Gesamtes zusätzliches Platzmaß für die vorgesehene Hülle'),
      fach_mm:mm('Freie Tiefe des trockenen Lagerfachs'),
      abnahme_dokumentiert:yes('Ist die getrennte Lagerung des Adapters dokumentiert möglich?')
    }, ({platte_mm,adapter_ueberstand_mm,huellenraum_mm,fach_mm,abnahme_dokumentiert}) => {
      const montiert = platte_mm+adapter_ueberstand_mm+huellenraum_mm;
      return {platz_mit_adapter_mm:round(montiert),reserve_mit_adapter_mm:round(fach_mm-montiert),
        reserve_getrennt_mm:abnahme_dokumentiert?round(fach_mm-platte_mm-huellenraum_mm):null,
        hinweis:'Verglichen wird nur die Fach-Tiefe für die ausgebaute Platte. Fläche, Transport, zulässige Lage und separate Teileaufbewahrung prüfen.'};
    }, {platte_mm:22,adapter_ueberstand_mm:90,huellenraum_mm:8,fach_mm:70,abnahme_dokumentiert:true},
    {platz_mit_adapter_mm:120,reserve_mit_adapter_mm:-50,reserve_getrennt_mm:40}),

  tool('mietfenster_klebeflaeche_fotodeckung_vor_nach',
    'Prüft, welche markierten Klebeflächen nach Abnahme im Fotovergleich tatsächlich abgedeckt sind — Identify matching before-and-after photo coverage of adhesive sites.',
    RENT, {
      markierte_stellen:count('Gesamtzahl vorab eindeutig markierter Stellen.'),
      vorher_bilder:count('Davon vor Anbringung in vergleichbaren Fotos dokumentiert.'),
      nachher_bilder:count('Davon nach Abnahme vergleichbar dokumentiert.'),
      bildpaare:count('Stellen mit beiden vergleichbaren Bildern am selben Ort.')
    }, ({markierte_stellen,vorher_bilder,nachher_bilder,bildpaare}) => {
      validCounts([markierte_stellen,vorher_bilder,nachher_bilder,bildpaare]);
      if (vorher_bilder>markierte_stellen||nachher_bilder>markierte_stellen||bildpaare>Math.min(vorher_bilder,nachher_bilder)||
          vorher_bilder+nachher_bilder-bildpaare>markierte_stellen) throw new RangeError('Fotozahlen passen nicht zur Anzahl der eindeutig markierten Stellen.');
      return {ohne_bildpaar:markierte_stellen-bildpaare,nur_vorher:vorher_bilder-bildpaare,nur_nachher:nachher_bilder-bildpaare,
        hinweis:'Bildabdeckung sagt nichts über Materialzustand oder Rückstandsfreiheit. Keine Reinigungsvorschrift oder mietrechtliche Bewertung.'};
    }, {markierte_stellen:10,vorher_bilder:8,nachher_bilder:7,bildpaare:6},
    {ohne_bildpaar:4,nur_vorher:2,nur_nachher:1}),

  tool('klimafenster_rueckbau_ereignisse_zeitfolge',
    'Prüft Zeitstempel eines abgeschlossenen Rückbaus auf dokumentierte Reihenfolge — Check the recorded sequence of shutdown, kit removal and window closure.',
    TILT, {
      aus_min:mins('Beobachtetes reguläres Abschalten ab Beginn des Protokolls'),
      abnahme_fertig_min:mins('Beobachtete vollständige Abnahme'),
      geschlossen_min:mins('Dokumentierter Fensterschluss'),
      gleicher_zeitbezug:yes('Stammen alle drei Werte aus demselben Protokoll mit gemeinsamem Zeitnullpunkt?')
    }, ({aus_min,abnahme_fertig_min,geschlossen_min,gleicher_zeitbezug}) => ({
      zeitfolge_nachvollziehbar:gleicher_zeitbezug&&aus_min<abnahme_fertig_min&&abnahme_fertig_min<geschlossen_min,
      minuten_zwischen_abschalten_schluss:gleicher_zeitbezug&&aus_min<=geschlossen_min?round(geschlossen_min-aus_min):null,
      gleiche_minutenmarken:gleicher_zeitbezug&&(aus_min===abnahme_fertig_min||abnahme_fertig_min===geschlossen_min),
      hinweis:'Einträge mit gleicher Minutenmarke erlauben keine genaue Reihenfolge innerhalb der Minute. Bedienvorgaben nach Anleitung prüfen.'
    }), {aus_min:15,abnahme_fertig_min:19,geschlossen_min:20,gleicher_zeitbezug:true},
    {zeitfolge_nachvollziehbar:true,minuten_zwischen_abschalten_schluss:5,gleiche_minutenmarken:false}),

  tool('sonnenschutz_geteilte_scheiben_schattenanteil',
    'Gewichtet beobachtete Schattenflächen nach den tatsächlichen Flächen zweier ungleich großer Scheiben — Calculate area-weighted observed shade across two unequal panes.',
    SHADE, {
      scheibe_a_m2:num('Sichtbare Fläche der ersten Scheibe in m².',0.01,25), scheibe_b_m2:num('Sichtbare Fläche der zweiten Scheibe in m².',0.01,25),
      schatten_a_prozent:num('Geschätzter Anteil im sichtbaren Schatten, Scheibe A.',0,100),
      schatten_b_prozent:num('Geschätzter Anteil im sichtbaren Schatten, Scheibe B zur selben Zeit.',0,100)
    }, ({scheibe_a_m2,scheibe_b_m2,schatten_a_prozent,schatten_b_prozent}) => {
      const bedeckt=(scheibe_a_m2*schatten_a_prozent+scheibe_b_m2*schatten_b_prozent)/100;
      return {geschaetzt_beschattet_m2:round(bedeckt), geschaetzt_beschattet_prozent:round(100*bedeckt/(scheibe_a_m2+scheibe_b_m2)),
        hinweis:'Sichtbarer Schatten ist eine Momentaufnahme. Er bestimmt weder g-Wert noch solaren Wärmeeintrag oder Glasfreigabe.'};
    }, {scheibe_a_m2:1,scheibe_b_m2:2,schatten_a_prozent:30,schatten_b_prozent:90},
    {geschaetzt_beschattet_m2:2.1,geschaetzt_beschattet_prozent:70}),

  tool('balkonschatten_sitzplatzwechsel_stichproben',
    'Ermittelt den kleinsten Sitzwechselbedarf für drei bereits beobachtete Schattenzustände — Find the fewest seat changes across three sampled balcony shade states.',
    BALCONY, {
      startplatz:state('Aktueller frei nutzbarer Sitzplatz.', ['a','b']),
      erste_probe:state('Im Schatten sichtbare Plätze in der ersten Stichprobe.', ['a','b','beide','keiner','unbekannt']),
      zweite_probe:state('Schatten in der zweiten Stichprobe.', ['a','b','beide','keiner','unbekannt']),
      dritte_probe:state('Schatten in der dritten Stichprobe.', ['a','b','beide','keiner','unbekannt'])
    }, ({startplatz,erste_probe,zweite_probe,dritte_probe}) => {
      let platz=startplatz;
      let wechsel=0;
      const reihe=[erste_probe,zweite_probe,dritte_probe];
      for (const probe of reihe) {
        if ((probe==='a'||probe==='b')&&platz!==probe) { platz=probe; wechsel++; }
      }
      const luecken=reihe.flatMap((probe,index)=>probe==='keiner'||probe==='unbekannt'?[index+1]:[]);
      return {wechsel_fuer_belegte_probezeitpunkte:wechsel,proben_ohne_bestaetigten_schatten:luecken,
        hinweis:'Nur Stichproben an bereits nutzbaren Plätzen. Schatten zwischen den Messpunkten und sichere Nutzung im Freien separat beurteilen.'};
    }, {startplatz:'a',erste_probe:'beide',zweite_probe:'b',dritte_probe:'keiner'},
    {wechsel_fuer_belegte_probezeitpunkte:1,proben_ohne_bestaetigten_schatten:[3]}),

  tool('innenbehang_lueftung_licht_bedienprobe',
    'Findet beobachtete Behangstellungen, in denen Fensterbedienung und eigenes Lichtziel zugleich möglich waren — Identify shade positions that met window operation and light preferences in the same observation.',
    SHADE, {
      oben:state('Befund mit hochgezogenem Behang.', ['beides','nur_licht','nur_bedienung','keins','nicht_geprueft']),
      mitte:state('Befund mit teilweise geschlossenem Behang.', ['beides','nur_licht','nur_bedienung','keins','nicht_geprueft']),
      unten:state('Befund mit vollständig geschlossenem Behang.', ['beides','nur_licht','nur_bedienung','keins','nicht_geprueft'])
    }, ({oben,mitte,unten}) => {
      const lagen={oben,mitte,unten};
      return {beide_ziele_beobachtet:Object.keys(lagen).filter(k=>lagen[k]==='beides'),
        noch_unbekannt:Object.keys(lagen).filter(k=>lagen[k]==='nicht_geprueft'),
        hinweis:'Lichtziel ist selbst gewählt. Leicht erreichbare Bedienung beobachten, keine Behangteile in den Fensterschluss bringen.'};
    }, {oben:'nur_bedienung',mitte:'beides',unten:'nicht_geprueft'},
    {beide_ziele_beobachtet:['mitte'],noch_unbekannt:['unten']}),

  tool('fenster_teilverschattung_punktlicht_kontrast',
    'Berechnet den Beleuchtungsunterschied an zwei gleich gemessenen Stellen vor und nach Teilverschattung — Compare measured light-level contrast at two points before and after partial shading.',
    SHADE, {
      vorher_hell_lux:num('Heller Messpunkt vor der Änderung in lx.',0,200000), vorher_dunkel_lux:num('Zweiter Messpunkt vor der Änderung in lx.',0,200000),
      nachher_hell_lux:num('Erster Messpunkt nach der Änderung in lx.',0,200000), nachher_dunkel_lux:num('Zweiter Messpunkt nach der Änderung in lx.',0,200000),
      aussenlicht_aehnlich:yes('Waren Position, Sensorwinkel und Außenlicht bei beiden Messungen vergleichbar?')
    }, ({vorher_hell_lux,vorher_dunkel_lux,nachher_hell_lux,nachher_dunkel_lux,aussenlicht_aehnlich}) => {
      const vorher=Math.abs(vorher_hell_lux-vorher_dunkel_lux);
      const nachher=Math.abs(nachher_hell_lux-nachher_dunkel_lux);
      return {punktunterschied_vorher_lx:round(vorher),punktunterschied_nachher_lx:round(nachher),
        aenderung_punktunterschied_lx:aussenlicht_aehnlich?round(nachher-vorher):null,
        hinweis:'Der Unterschied ist keine amtliche Blendbewertung. Zwei Luxwerte ermitteln weder Leuchtdichte im Blickfeld noch Wärmeschutz.'};
    }, {vorher_hell_lux:1400,vorher_dunkel_lux:300,nachher_hell_lux:650,nachher_dunkel_lux:350,aussenlicht_aehnlich:true},
    {punktunterschied_vorher_lx:1100,punktunterschied_nachher_lx:300,aenderung_punktunterschied_lx:-800}),

  tool('innenverschattung_oberflaechenabstand_zur_raumluft',
    'Vergleicht beobachtete Temperaturabstände zur Raumluft an zwei erreichbaren Oberflächen rund um einen Behang — Compare measured surface-to-air temperature contrasts around a shade.',
    SHADE, {
      fensternahe_flaeche_c:temp('Vergleichbar gemessene zugängliche Fläche auf der Fensterseite'),
      raumnahe_flaeche_c:temp('Vergleichbar gemessene zugängliche Fläche auf der Raumseite'),
      raumluft_c:temp('Zeitgleiche Raumlufttemperatur im Schatten'),
      oberflaechen_vergleichbar:yes('Gleiche Messmethode und bei Infrarotmessung geeignete Oberflächen?')
    }, ({fensternahe_flaeche_c,raumnahe_flaeche_c,raumluft_c,oberflaechen_vergleichbar}) => ({
      fensterseite_minus_raumluft_c:round(fensternahe_flaeche_c-raumluft_c), raumseite_minus_raumluft_c:round(raumnahe_flaeche_c-raumluft_c),
      seitendifferenz_c:oberflaechen_vergleichbar?round(fensternahe_flaeche_c-raumnahe_flaeche_c):null,
      hinweis:'Nur Vergleich der gemessenen Stellen. Infrarotwerte durch reflektierendes Glas oder von verschiedenen Materialien können täuschen. Daraus folgen weder Glasfreigabe noch Wirkungsgrad.'
    }), {fensternahe_flaeche_c:37,raumnahe_flaeche_c:30,raumluft_c:28,oberflaechen_vergleichbar:true},
    {fensterseite_minus_raumluft_c:9,raumseite_minus_raumluft_c:2,seitendifferenz_c:7}),

  tool('balkon_schirmstellung_freie_spur_vergleich',
    'Vergleicht frei gemessene Durchgangsbreiten in zwei bereits genutzten Schirmstellungen — Compare the observed walkway beside a movable sunshade in two existing positions.',
    BALCONY, {
      spur_a_mm:mm('Engste beobachtete freie Spur in der ersten Schirmstellung'),
      spur_b_mm:mm('Engste beobachtete freie Spur in der zweiten Schirmstellung'),
      persoenlicher_bedarf_mm:mm('Selbst gemessener Breitenbedarf des üblichen Wegs'),
      zusatzspiel_mm:mm('Selbst gewünschter zusätzlicher Platz')
    }, ({spur_a_mm,spur_b_mm,persoenlicher_bedarf_mm,zusatzspiel_mm}) => ({
      reserve_spur_a_mm:round(spur_a_mm-persoenlicher_bedarf_mm-zusatzspiel_mm),
      reserve_spur_b_mm:round(spur_b_mm-persoenlicher_bedarf_mm-zusatzspiel_mm),
      hinweis:'Nur Maße bereits beobachteter Stellungen. Bewegungen des Schirms, Wind und erforderliche Verkehrs- oder Fluchtwege getrennt prüfen. Keine Aufstellfreigabe.'
    }), {spur_a_mm:720,spur_b_mm:860,persoenlicher_bedarf_mm:700,zusatzspiel_mm:50},
    {reserve_spur_a_mm:-30,reserve_spur_b_mm:110}),

  tool('fenster_sonnenschutz_messreihe_wolkenwechsel',
    'Prüft welche Phasen einer Fensterbeschattungsprobe mit unverändertem Wolkenzustand überhaupt auswertbar waren — Identify parts of a shade measurement with consistently observed cloud cover.',
    SHADE, {
      gleich_min:mins('Minuten mit für beide Fälle gleichartigem beobachtetem Himmel'),
      geaendert_min:mins('Minuten mit sichtbarem Wechsel in einem der Fälle'),
      unbekannt_min:mins('Minuten ohne Himmelbeobachtung. Gruppen dürfen sich nicht überlappen.')
    }, ({gleich_min,geaendert_min,unbekannt_min}) => {
      const gesamt=gleich_min+geaendert_min+unbekannt_min;
      return {auswertbar_nach_wolken_min:gleich_min, bewusst_ausgelassen_min:round(geaendert_min+unbekannt_min),
        vergleichbarer_zeitanteil_prozent:gesamt>0?round(100*gleich_min/gesamt):null,
        hinweis:'Wolkenbeobachtung ist nur ein Auswahlkriterium. Sonnenstand, Fensterlage und Sensor bleiben getrennt zu prüfen.'};
    }, {gleich_min:30,geaendert_min:10,unbekannt_min:20},
    {auswertbar_nach_wolken_min:30,bewusst_ausgelassen_min:30,vergleichbarer_zeitanteil_prozent:50}),

  tool('sommerlueftung_stossfolgen_zwischenwaerme',
    'Trennt zwei gemessene Abkühlungen während des Lüftens von der Wiedererwärmung zwischen den beiden Stoßphasen — Separate two observed cooling intervals from warming between them.',
    VENT, {
      vor_erster_phase_c:temp('Raumwert vor erster Öffnung'), nach_erster_phase_c:temp('Wert nach erstem Fensterschluss'),
      vor_zweiter_phase_c:temp('Wert vor zweiter Öffnung'), nach_zweiter_phase_c:temp('Wert nach zweitem Fensterschluss')
    }, ({vor_erster_phase_c,nach_erster_phase_c,vor_zweiter_phase_c,nach_zweiter_phase_c}) => ({
      summe_abkuehlung_offene_phasen_c:round(vor_erster_phase_c-nach_erster_phase_c+vor_zweiter_phase_c-nach_zweiter_phase_c),
      waermer_dazwischen_c:round(vor_zweiter_phase_c-nach_erster_phase_c),
      netto_abkuehlung_c:round(vor_erster_phase_c-nach_zweiter_phase_c),
      hinweis:'Gleicher Messort und geordnete Zeitpunkte. Differenzen beschreiben Beobachtungen, sie isolieren keine Ursache oder Luftwechselrate.'
    }), {vor_erster_phase_c:27,nach_erster_phase_c:25,vor_zweiter_phase_c:26,nach_zweiter_phase_c:24},
    {summe_abkuehlung_offene_phasen_c:4,waermer_dazwischen_c:1,netto_abkuehlung_c:3}),

  tool('sommerlueftung_tiefpunkte_zur_offenphase',
    'Ordnet gemessene Innen- und Außentiefpunkte der protokollierten Fensteröffnung zu — Locate observed indoor and outdoor minimum temperatures relative to window opening.',
    VENT, {
      aussen_tief_min:mins('Minute des niedrigsten beobachteten Außenwerts ab Start'),
      innen_tief_min:mins('Minute des niedrigsten beobachteten Innenwerts ab demselben Start'),
      offen_ab_min:mins('Protokollierte Öffnung ab demselben Start'),
      geschlossen_ab_min:mins('Protokollierter Fensterschluss'),
      gleicher_zeitbezug:yes('Gleiche Uhrzeitbasis, vergleichbare Abtastrate und dasselbe Beobachtungsfenster?')
    }, ({aussen_tief_min,innen_tief_min,offen_ab_min,geschlossen_ab_min,gleicher_zeitbezug}) => {
      if (geschlossen_ab_min<=offen_ab_min) throw new RangeError('Zum Öffnungsabschnitt gehört ein späterer Fensterschluss.');
      const phase=minute=> {
        if (minute===offen_ab_min||minute===geschlossen_ab_min) return 'am_wechsel';
        if (minute<offen_ab_min) return 'davor';
        return minute<geschlossen_ab_min?'offen':'danach';
      };
      return {lage_aussentief:gleicher_zeitbezug?phase(aussen_tief_min):null,
        lage_innentief:gleicher_zeitbezug?phase(innen_tief_min):null,
        beobachteter_innenversatz_min:gleicher_zeitbezug?round(innen_tief_min-aussen_tief_min):null,
        hinweis:'Tiefpunkte aus Stichproben können zwischen Ablesungen liegen. Eine gleiche Minutenmarke belegt keine genaue Reihenfolge.'};
    }, {aussen_tief_min:65,innen_tief_min:84,offen_ab_min:55,geschlossen_ab_min:77,gleicher_zeitbezug:true},
    {lage_aussentief:'offen',lage_innentief:'danach',beobachteter_innenversatz_min:19}),

  tool('nachtlueftung_auswahl_mit_schliesspuffer',
    'Wählt aus zwei bereits gemessenen kühlen Zeitabschnitten, die einen nötigen Puffer zum Fensterschluss enthalten — Compare two sampled cool periods with an explicit time allowance for closing.',
    VENT, {
      abschnitt_a_min:mins('Verfügbare Zeit im zuerst beobachteten geeigneten Abschnitt'),
      abschnitt_b_min:mins('Verfügbare Zeit im zweiten geeigneten Abschnitt'),
      schliesspuffer_min:mins('Selbst gewählte Zeit für reguläres Schließen'),
      ziel_offen_min:mins('Gewünschte durchgehende Öffnungszeit')
    }, ({abschnitt_a_min,abschnitt_b_min,schliesspuffer_min,ziel_offen_min}) => {
      const a=Math.max(0,abschnitt_a_min-schliesspuffer_min);
      const b=Math.max(0,abschnitt_b_min-schliesspuffer_min);
      return {nutzbar_a_min:round(a),nutzbar_b_min:round(b), erstpassend:abschnitt_a_min>=ziel_offen_min+schliesspuffer_min?'a':
        abschnitt_b_min>=ziel_offen_min+schliesspuffer_min?'b':null,
        hinweis:'Beide Abschnitte müssen bereits nach eigenen Messungen und beobachteten Bedingungen als geeignet eingeordnet sein. Keine Wetter- oder Sicherheitsfreigabe.'};
    }, {abschnitt_a_min:12,abschnitt_b_min:22,schliesspuffer_min:4,ziel_offen_min:15},
    {nutzbar_a_min:8,nutzbar_b_min:18,erstpassend:'b'}),

  tool('monoblock_auslass_freiraum_beobachtungsbeleg',
    'Vergleicht gemessenen Freiraum am Auslass mit der ausdrücklich dafür dokumentierten Vorgabe — Compare measured clearance at the outlet with its documented requirement.',
    HOSE, {
      soll_mm:mm('Ausdrückliche Mindestvorgabe genau für den Auslass dieses Modells'),
      sichtbar_frei_mm:mm('Bereits gefahrlos bemaßter freier Abstand in der vorgegebenen Richtung'),
      gleiche_richtung:yes('Sind Bezugsfläche, Richtung und Gerätemodus identisch?'),
      abstand_belegt:yes('Liegt der gemessene Abstand ohne Schätzung verdeckter Bereiche vor?')
    }, ({soll_mm,sichtbar_frei_mm,gleiche_richtung,abstand_belegt}) => ({
      vergleich_vorhanden:gleiche_richtung&&abstand_belegt,
      abstandsreserve_mm:gleiche_richtung&&abstand_belegt?round(sichtbar_frei_mm-soll_mm):null,
      hinweis:'Nur dokumentierte Richtung und vorhandene Messung vergleichen. Keine Auslassposition ändern, nicht hinauslehnen und die Rechnung nicht als Betriebsfreigabe verwenden.'
    }), {soll_mm:250,sichtbar_frei_mm:210,gleiche_richtung:true,abstand_belegt:true},
    {vergleich_vorhanden:true,abstandsreserve_mm:-40}),

  tool('monoblock_schlauch_sichtstrecke_ohne_doppelzaehlung',
    'Ermittelt sichtbare und noch ungeklärte Schlauchlänge aus zwei teilweise überlappenden Sichtaufnahmen — Account for visible and unseen hose lengths across two overlapping observations.',
    HOSE, {
      gesamter_verlauf_mm:mm('Dokumentierte Länge entlang der Mitte des vorhandenen Schlauchs'),
      sichtbar_a_mm:mm('In Aufnahme A sichtbare Länge entlang der Mitte'), sichtbar_b_mm:mm('In Aufnahme B sichtbare Länge'),
      ueberlappung_mm:mm('Nachweislich in beiden Aufnahmen sichtbare Strecke')
    }, ({gesamter_verlauf_mm,sichtbar_a_mm,sichtbar_b_mm,ueberlappung_mm}) => {
      const sichtbar=sichtbar_a_mm+sichtbar_b_mm-ueberlappung_mm;
      if (ueberlappung_mm>Math.min(sichtbar_a_mm,sichtbar_b_mm)||sichtbar>gesamter_verlauf_mm) {
        throw new RangeError('Sichtstrecken und Überlappung müssen zur dokumentierten Gesamtlänge passen.');
      }
      return {eindeutig_sichtbar_mm:round(sichtbar),ohne_sichtbeleg_mm:round(gesamter_verlauf_mm-sichtbar),
        hinweis:'Bereits vorhandene Aufnahmen mit gleichem Maßstab verwenden. Keine Teile zur Inspektion bewegen. Auch sichtbare Länge bestätigt keine unbeschädigte Leitung.'};
    }, {gesamter_verlauf_mm:1400,sichtbar_a_mm:700,sichtbar_b_mm:650,ueberlappung_mm:150},
    {eindeutig_sichtbar_mm:1200,ohne_sichtbeleg_mm:200}),

  tool('monoblock_schlauch_sichtform_achsenvergleich',
    'Beschreibt das Achsenverhältnis an einer bereits vermessenen sichtbaren Stelle des unveränderten Schlauchs — Describe the axis ratio of a measured hose cross-section without inferring airflow.',
    HOSE, {
      a_mm:mm('Erste äußere Achse der Stelle im dokumentierten Zustand'), b_mm:mm('Senkrechte zweite äußere Achse derselben Stelle'),
      referenz_a_mm:mm('Erste Achse an derselben Stelle in der vorhandenen Referenzaufnahme'),
      referenz_b_mm:mm('Senkrechte zweite Achse in der Referenzaufnahme'),
      massstab_geprueft:yes('Gleicher Maßstab und Blickrichtung nachweisbar?')
    }, ({a_mm,b_mm,referenz_a_mm,referenz_b_mm,massstab_geprueft}) => {
      const ratio=(a,b)=>Math.max(a,b)>0&&Math.min(a,b)>0?100*Math.min(a,b)/Math.max(a,b):null;
      const jetzt=ratio(a_mm,b_mm);
      const vorher=ratio(referenz_a_mm,referenz_b_mm);
      return {achsenverhaeltnis_prozent:jetzt===null?null:round(jetzt),
        veraenderung_prozentpunkte:massstab_geprueft&&jetzt!==null&&vorher!==null?round(jetzt-vorher):null,
        hinweis:'Äußere Achsenmaße beschreiben sichtbare Form. Daraus folgen weder Innendurchmesser, Luftleistung noch eine Erlaubnis, einen Schlauch zu knicken oder zu ändern.'};
    }, {a_mm:150,b_mm:120,referenz_a_mm:150,referenz_b_mm:150,massstab_geprueft:true},
    {achsenverhaeltnis_prozent:80,veraenderung_prozentpunkte:-20}),

  tool('monoblock_kuehlprobe_betrieb_nach_startphase',
    'Trennt den gemessenen Zeitraum vor stabilem Kühlbetrieb von der nutzbaren Beobachtungszeit — Separate observed startup from the later stable measurement window.',
    COOL, {
      protokoll_min:mins('Gesamtdauer einer beendeten Beobachtung ab regulärem Start'),
      anlauf_min:mins('Zeit bis zum beobachteten regulären Kühlbetrieb oder bis zum Ende'),
      kuehlbetrieb_belegt:yes('War der Beginn des Kühlbetriebs anhand der Anzeige oder Protokollangabe belegt?'),
      gewuenscht_min:mins('Selbst gewählte Dauer für eine vergleichbare Messung nach dem Anlauf')
    }, ({protokoll_min,anlauf_min,kuehlbetrieb_belegt,gewuenscht_min}) => {
      if (anlauf_min>protokoll_min) throw new RangeError('Die Anlaufbeobachtung muss im Protokoll liegen.');
      const nutzbar=kuehlbetrieb_belegt?protokoll_min-anlauf_min:null;
      return {belegte_restzeit_min:nutzbar===null?null:round(nutzbar),
        fehlende_messzeit_min:nutzbar===null?null:round(Math.max(0,gewuenscht_min-nutzbar)),
        hinweis:'Nur reguläre Abläufe beobachten. Bei unterbrochenem Kühlbetrieb nutzbare Abschnitte separat feststellen. Keine Wiederanlaufverzögerung umgehen.'};
    }, {protokoll_min:33,anlauf_min:8,kuehlbetrieb_belegt:true,gewuenscht_min:30},
    {belegte_restzeit_min:25,fehlende_messzeit_min:5}),

  tool('klimafenster_kitvergleich_strom_gleiches_kuehlziel',
    'Vergleicht gemessene Kosten zweier Fensteraufbauten bis zum selben selbst gewählten Temperaturziel — Compare measured energy costs of two window setups to the same temperature endpoint.',
    COST, {
      a_kwh:num('Gemessener Verbrauch für Versuch A in kWh.',0,1000), b_kwh:num('Gemessener Verbrauch für Versuch B in kWh.',0,1000),
      erreicht_a:yes('Beobachtete Temperatur in A erreichte das vorher gesetzte Ziel.'),
      erreicht_b:yes('Dieselbe beobachtete Zieltemperatur wurde in B erreicht.'),
      vergleichbar:yes('Gleicher Startwert, Beobachtungsort und ähnliche Bedingungen wie Außenluft, Sonne und Raumnutzung?'),
      preis_eur_kwh:num('Eigener Arbeitspreis in €/kWh.',0,5)
    }, ({a_kwh,b_kwh,erreicht_a,erreicht_b,vergleichbar,preis_eur_kwh}) => ({
      a_eur:round(a_kwh*preis_eur_kwh), b_eur:round(b_kwh*preis_eur_kwh),
      mehrkosten_b_eur:erreicht_a&&erreicht_b&&vergleichbar?round((b_kwh-a_kwh)*preis_eur_kwh):null,
      hinweis:'Nur Kosten der gemessenen Läufe. Bei Zielverfehlung bleibt der direkte Vergleich offen. Das Ergebnis belegt weder Jahresverbrauch noch Effizienzklasse.'}
    ), {a_kwh:0.8,b_kwh:1.1,erreicht_a:true,erreicht_b:true,vergleichbar:true,preis_eur_kwh:0.4},
    {a_eur:0.32,b_eur:0.44,mehrkosten_b_eur:0.12}),

  tool('klimafenster_kuehlprobe_zwei_nutzungsorte',
    'Prüft bei einer Raumprobe die Abweichung von zwei selbst gewählten Temperaturzielen an zwei konkreten Nutzungsplätzen — Check a single run against two user-chosen temperature targets at separate locations.',
    COOL, {
      sitz_c:temp('Messwert am regelmäßig genutzten Sitzplatz'),
      zweiter_ort_c:temp('Zeitgleicher Messwert am zweiten Nutzungsort'),
      ziel_sitz_c:temp('Eigener Vergleichszielwert am Sitzplatz'), ziel_zweiter_c:temp('Eigener Vergleichszielwert am zweiten Ort'),
      ortswerte_vergleichbar:yes('Sensoren und Abschattung geprüft, zur selben Zeit beobachtet?')
    }, ({sitz_c,zweiter_ort_c,ziel_sitz_c,ziel_zweiter_c,ortswerte_vergleichbar}) => ({
      abweichung_sitz_c:round(sitz_c-ziel_sitz_c),abweichung_zweiter_ort_c:round(zweiter_ort_c-ziel_zweiter_c),
      beide_im_ziel:ortswerte_vergleichbar?sitz_c<=ziel_sitz_c&&zweiter_ort_c<=ziel_zweiter_c:null,
      hinweis:'Selbst gesetzte Zielwerte und zwei lokale Messorte. Kühlere Luft am Ausblas belegt keine gleichmäßige Raumkühlung.'}
    ), {sitz_c:25,zweiter_ort_c:24,ziel_sitz_c:24,ziel_zweiter_c:25,ortswerte_vergleichbar:true},
    {abweichung_sitz_c:1,abweichung_zweiter_ort_c:-1,beide_im_ziel:false}),

  tool('monoblock_kuehlrate_protokollierte_standortpaare',
    'Stellt zwei unterschiedlich lange Kühlbeobachtungen derselben Raumnutzung als °C pro Stunde gegenüber — Normalize observed air cooling across two differently timed placement trials.',
    COOL, {
      abnahme_a_c:num('Gemessener Temperaturabfall am gleichen Raumort im ersten Durchgang; negativ bei Anstieg.',-35,35),
      abnahme_b_c:num('Gemessener Temperaturabfall im zweiten Durchgang.',-35,35),
      dauer_a_min:num('Beobachtungsdauer A in Minuten.',1,720), dauer_b_min:num('Beobachtungsdauer B in Minuten.',1,720),
      vergleichbar:yes('Vergleichbare Anfangslage, Sonne, Außenzustand und Einstellungen?')
    }, ({abnahme_a_c,abnahme_b_c,dauer_a_min,dauer_b_min,vergleichbar}) => {
      const a=60*abnahme_a_c/dauer_a_min;
      const b=60*abnahme_b_c/dauer_b_min;
      return {rate_a_c_h:round(a),rate_b_c_h:round(b),differenz_b_minus_a_c_h:vergleichbar?round(b-a):null,
        hinweis:'Mittlere Beobachtungsraten sind keine Prognose für die nächste Stunde. Vergleichbare Fensterbedingungen und gleicher Messort sind wesentlich.'};
    }, {abnahme_a_c:2,abnahme_b_c:2.5,dauer_a_min:30,dauer_b_min:50,vergleichbar:true},
    {rate_a_c_h:4,rate_b_c_h:3,differenz_b_minus_a_c_h:-1}),

  tool('monoblock_kuehlunterbrechung_restzeit_unbekannt',
    'Bilanziert protokollierte Kühlzeit, Fensterunterbrechung und Bedienpausen mit separat ungeklärter Restzeit — Account for recorded cooling, window interruptions and user pauses with an unknown remainder.',
    COOL, {
      beobachtet_min:mins('Gesamtdauer des einheitlich geführten Protokolls'),
      gekuehlt_min:mins('Darin belegter Kühlbetrieb'),
      fensterunterbrechung_min:mins('Davon getrennt protokollierte Unterbrechung am Fenster'),
      bedienpause_min:mins('Weitere belegte manuelle Pause ohne Überlappung')
    }, ({beobachtet_min,gekuehlt_min,fensterunterbrechung_min,bedienpause_min}) => {
      const belegt=gekuehlt_min+fensterunterbrechung_min+bedienpause_min;
      if (belegt-beobachtet_min>1e-8) throw new RangeError('Belegte, nicht überlappende Abschnitte passen nicht in die Gesamtzeit.');
      return {belegte_abschnitte_min:round(belegt),ungeklaert_min:round(Math.max(0,beobachtet_min-belegt)),
        beobachtete_kuehlzeit_min:gekuehlt_min,
        hinweis:'Ungeklärte Zeit belegt weder Pause noch Kühlung. Die Zählung beschreibt den Ablauf und bestimmt keine Störungsursache.'};
    }, {beobachtet_min:90,gekuehlt_min:55,fensterunterbrechung_min:12,bedienpause_min:8},
    {belegte_abschnitte_min:75,ungeklaert_min:15,beobachtete_kuehlzeit_min:55}),

  tool('klimafenster_umbauzeit_grenzwert_zwei_plaene',
    'Vergleicht belegte Bedienarbeit bei täglichem Abbau mit einem dokumentierten Aufbau für kürzere gemeinsame Nutzung — Compare user handling time for two documented short-term window routines.',
    TILT, {
      tage:count('Geplante Nutzungstage.'), auf_und_ab_min:mins('Beobachtete Bedienzeit für regulären Aufbau plus Abnahme'),
      variante_b_wechselsumme_min:mins('Summe kurzzeitiger, dokumentiert nutzbarer Bedienwechsel in Variante B im selben Zeitraum'),
      variante_b_betrieb_belegt:yes('Waren die Bedingungen für Variante B über alle geplanten Zeiten dokumentiert?')
    }, ({tage,auf_und_ab_min,variante_b_wechselsumme_min,variante_b_betrieb_belegt}) => {
      validCounts([tage]);
      return {bedienzeit_variante_a_min:round(tage*auf_und_ab_min),
        bedienzeit_b_minus_a_min:variante_b_betrieb_belegt?round(variante_b_wechselsumme_min-tage*auf_und_ab_min):null,
        hinweis:'Nur Bedienzeit vergleichen, keine unbeaufsichtigten Fensterzustände aus der Zeitrechnung ableiten. Herstellerangaben und Haushaltsbedingungen einhalten.'};
    }, {tage:4,auf_und_ab_min:12,variante_b_wechselsumme_min:30,variante_b_betrieb_belegt:true},
    {bedienzeit_variante_a_min:48,bedienzeit_b_minus_a_min:-18}),

  tool('fenster_kuehlpause_nach_passiver_probe',
    'Ermittelt aus zwei vorhandenen Messpunkten, ob das eigene Temperaturziel nach passiver Kühlung noch erfüllt war — Check whether two post-cooling readings still meet a user target before considering active cooling.',
    VENT, {
      frueher_c:temp('Erste nach passiver Kühlung am Nutzungsplatz beobachtete Temperatur'),
      spaeter_c:temp('Spätere Ablesung beim nächsten Nutzungsbeginn'), ziel_c:temp('Eigener Vergleichszielwert für diesen Platz'),
      gleiche_messstelle:yes('Gleicher Ort und vergleichbare Messung für beide Ablesungen?')
    }, ({frueher_c,spaeter_c,ziel_c,gleiche_messstelle}) => ({
      ziel_am_nutzungsbeginn_beobachtet:spaeter_c<=ziel_c,
      ziel_noch_in_beiden_stichproben:gleiche_messstelle?frueher_c<=ziel_c&&spaeter_c<=ziel_c:null,
      abstand_zum_ziel_beim_beginn_c:round(spaeter_c-ziel_c),
      hinweis:'Die zwei Messpunkte belegen keinen kontinuierlichen Verlauf. Liegt der eigene Nutzungswert bereits im Ziel, kann man zunächst weiter beobachten.'
    }), {frueher_c:23.5,spaeter_c:24.5,ziel_c:25,gleiche_messstelle:true},
    {ziel_am_nutzungsbeginn_beobachtet:true,ziel_noch_in_beiden_stichproben:true,abstand_zum_ziel_beim_beginn_c:-0.5}),

  tool('abluftfenster_schlussbeleg_vor_abwesenheit',
    'Prüft ob der dokumentierte Fensterschluss vor dem tatsächlichen Verlassen des Raums lag — Compare recorded normal window closure with the start of an absence.',
    '/guide/klimaanlage-fenster-einbruchschutz.html', {
      abwesend_ab_min:mins('Beginn der beobachteten Abwesenheit ab Protokollbeginn'),
      schluss_min:mins('Zeitpunkt des beobachteten regulären Fensterschlusses, wenn belegt'),
      schluss_belegt:yes('War der normale Fensterschluss tatsächlich beobachtet und im selben Zeitbezug dokumentiert?')
    }, ({abwesend_ab_min,schluss_min,schluss_belegt}) => ({
      schluss_vor_abwesenheit_belegt:schluss_belegt&&schluss_min!==abwesend_ab_min?schluss_min<abwesend_ab_min:null,
      abstand_bis_abwesenheit_min:schluss_belegt?round(abwesend_ab_min-schluss_min):null,
      hinweis:'Bei gleicher Minutenmarke ist die Reihenfolge ungeklärt. Die Zeitangaben sind kein Nachweis für Verriegelung, Einbruchsicherheit oder unbeaufsichtigten Betrieb.'
    }), {abwesend_ab_min:120,schluss_min:112,schluss_belegt:true},
    {schluss_vor_abwesenheit_belegt:true,abstand_bis_abwesenheit_min:8}),
];
