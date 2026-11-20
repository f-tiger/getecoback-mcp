const page='/produkte.html';
const checked='2026-11-20';
const manual='https://media3.bosch-home.com/Documents/8001267842_A.pdf';
const sheet='https://media3.bosch-home.com/Documents/specsheet/de-DE/TWK8613P.pdf';
const catalogue='https://media3.bosch-home.com/Documents/18940060_d_CO51_Bosch_Kleing_2021_Web.pdf';
const product='https://www.bosch-home.com/de/de/product/fruehstueck/wasserkocher/TWK8613P';
const flag=description=>({type:'boolean',description});
const choice=(description,...values)=>({type:'string',description,enum:values});
const status=description=>choice(description,'belegt','ausgeschlossen','offen');
const number=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const source=(url,fundstelle)=>({url,fundstelle,geprueft_am:checked});
const p=source(product,'Modell TWK8613P, deutsches Angebot und Ausstattung');
const s=source(sheet,'Deutsches Produktdatenblatt TWK8613P');
const matched=flag('Das Gerät ist als deutsches TWK8613P identifiziert und die angegebene TWK86-Anleitung über die E-Nummer zugeordnet.');
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}
function handbook(name,description,properties,calculate,args,expect,section,hinweis) {
  return tool(name,description,{anleitung_zugeordnet:matched,...properties},
    ({anleitung_zugeordnet,...inputs})=>({...calculate(inputs,anleitung_zugeordnet),beleg:anleitung_zugeordnet?source(manual,section):null,hinweis}),
    {anleitung_zugeordnet:true,...args},expect);
}

export const wasserkocherBelege=[
  handbook('wasserkocher_twk8613p_360_sockel_originalbasis',
    'Prüft, ob der angebotene 360-Grad-Sockel für den konkreten Bosch-Wasserkocher tatsächlich als mitgelieferte Basis belegt ist — Check original kettle-base evidence without assuming cross-model interchangeability.',
    {basis:choice('Vorliegende Herkunft der Basis.','mitgelieferte_basis_belegt','anderer_sockel','nicht_vorhanden','offen'),
      nur_360_kennzeichnung:flag('Die einzige Zusatzangabe am Fremdteil ist die 360-Grad-Beschreibung.')},
    ({basis,nur_360_kennzeichnung},known)=>({mitgelieferte_basis_belegt:known&&basis!=='offen'?basis==='mitgelieferte_basis_belegt':null,
      naechster_schritt:known&&basis==='mitgelieferte_basis_belegt'?'zuordnung_belegt':'passende_basis_vor_kauf_oder_verwendung_klaeren',nur_drehfunktion_fuer_fremdteil_belegt:known&&basis==='anderer_sockel'&&nur_360_kennzeichnung,drehfunktion_als_passnachweis:false}),
    {basis:'anderer_sockel',nur_360_kennzeichnung:true},{mitgelieferte_basis_belegt:false,drehfunktion_als_passnachweis:false},
    'S. 6, nur mit der mitgelieferten Basis','Eine Drehfunktion beschreibt die Benutzung der zugehörigen Basis. Optische Ähnlichkeit belegt keine Zuordnung zu einem Fremdsockel.'),

  handbook('wasserkocher_twk8613p_wasser_milch_instant_einfuellen',
    'Prüft, ob frisches kaltes Wasser, Milch oder fertiges Instantgetränk laut Bosch in den Kessel gehört — Check the manufacturer’s kettle liquid scope against the household use case.',
    {fluessigkeit:choice('Geplanter Kanneninhalt.','frisches_kaltes_stilles_wasser','milch','fertiggetraenk','instantprodukt','kohlensaeurewasser','offen')},
    ({fluessigkeit},known)=>({im_handbuch_vorgesehen:known&&fluessigkeit!=='offen'?fluessigkeit==='frisches_kaltes_stilles_wasser':null}),
    {fluessigkeit:'milch'},{im_handbuch_vorgesehen:false},'S. 7, Sachschäden vermeiden','Die Herstellerfreigabe bezieht sich auf Wasser im Kessel. Fertiges Getränk und Milch kommen in das jeweilige Aufgussgefäß.'),

  handbook('wasserkocher_twk8613p_temperatur_blinkt_leuchtet',
    'Liest blinkende Wunschtemperatur und leuchtende erreichte Temperatur beim Bosch TWK8613P während des Aufheizens — Decode selected and reached temperature indicators during the documented heating phase.',
    {heizphase:status('Eine laufende Heizphase ist zum Zeitpunkt der Beobachtung belegt.'),signal:choice('Beobachtung des richtig identifizierten Temperaturfeldes.','blinkt','leuchtet_dauerhaft','aus','offen')},
    ({heizphase,signal},known)=>({anzeige_bedeutung:known&&heizphase==='belegt'?{blinkt:'eingestellte_temperatur',leuchtet_dauerhaft:'bisher_erreichte_temperatur',aus:'kein_wert_aus_diesem_signal',offen:'anzeige_offen'}[signal]:null}),
    {heizphase:'belegt',signal:'blinkt'},{anzeige_bedeutung:'eingestellte_temperatur'},'S. 8, Wasser kochen','Die Zuordnung gilt während der beschriebenen Heizphase. Eine blinkende Anzeige ist kein eigener Messwert im Wasser.'),

  handbook('wasserkocher_twk8613p_sollwert_aenderung_wasser_bereits_waermer',
    'Prüft, ob eine neue Temperaturwahl während laufender Heizphase höher als die bereits gemessene Wassertemperatur liegt — Check the documented live setpoint-change rule against a measured temperature.',
    {heizt:status('Das Gerät befindet sich noch in demselben Heizlauf.'),messwert_belegt:flag('Temperatur ist ein vorliegender geeigneter Messwert des gleichen Laufs.'),
      neue_stufe:choice('Gewünschte Stufe der Bedienung.','70','80','90','100'),messwert_c:number('Gemessene Wassertemperatur in °C.',0,115)},
    ({heizt,messwert_belegt,neue_stufe,messwert_c},known)=>({neuer_sollwert_laut_bedingung_moeglich:known&&heizt==='belegt'&&messwert_belegt?Number(neue_stufe)>messwert_c:null}),
    {heizt:'belegt',messwert_belegt:true,neue_stufe:'70',messwert_c:76},{neuer_sollwert_laut_bedingung_moeglich:false},'S. 8, Änderung der Stufe während des Heizens','Die Verstellung setzt einen höheren neuen Sollwert voraus. Die Bedienung kühlt bereits erwärmtes Wasser nicht herunter.'),

  handbook('wasserkocher_twk8613p_keep_warm_vor_heizende_aktivieren',
    'Prüft beim Bosch die belegte Keep-Warm-Aktivierung vor dem automatischen Heizende und deutet die Lampe getrennt — Check activation timing and indicator evidence for the Bosch hold mode.',
    {getroffen:choice('Zeitpunkt der beobachteten Wahl von Keep Warm.','vor_automatischem_ende','erst_danach','offen'),leuchte:status('Die beschriftete Keep-Warm-Leuchte wurde als leuchtend festgestellt.')},
    ({getroffen,leuchte},known)=>({aktivierung_im_vorgesehenen_abschnitt:known&&getroffen!=='offen'?getroffen==='vor_automatischem_ende':null,
      warmhaltezustand_aus_beiden_beobachtungen:known&&getroffen==='vor_automatischem_ende'&&leuchte==='belegt'?'aktivierung_belegt':'offen'}),
    {getroffen:'erst_danach',leuchte:'offen'},{aktivierung_im_vorgesehenen_abschnitt:false,warmhaltezustand_aus_beiden_beobachtungen:'offen'},'S. 8, Warmhalte-Funktion verwenden','Die 30 Minuten gehören zu einem vorher aktivierten Modus. Am Ende stehen keine gemessenen Wassertemperaturen fest.'),

  handbook('wasserkocher_twk8613p_abheben_basis_kochen_neustart',
    'Klärt beim TWK8613P, ob er nach dem Abheben vom Sockel automatisch weiter heizt und die Einstellungen behält — Determine how a documented lift interrupts a kettle heating run.',
    {vorgang:choice('Tatsächlicher Vorgang während des Heizens.','abgehoben_und_zurueckgestellt','ununterbrochen_auf_basis','offen')},
    ({vorgang},known)=>({automatische_fortsetzung:known&&vorgang==='abgehoben_und_zurueckgestellt'?false:null,
      einstellungen_nach_zurueckstellen:known&&vorgang==='abgehoben_und_zurueckgestellt'?'auf_standard_zurueckgesetzt':null}),
    {vorgang:'abgehoben_und_zurueckgestellt'},{automatische_fortsetzung:false,einstellungen_nach_zurueckstellen:'auf_standard_zurueckgesetzt'},'S. 8, Wasser kochen nach Anheben der Kanne','Das Handbuch beschreibt die Unterbrechung und Rücksetzung. Ein neuer Lauf lässt sich daraus nicht als begonnen ablesen.'),

  handbook('wasserkocher_twk8613p_abkuehlen_fuenf_minuten_nach_gebrauch',
    'Gleicht den geplanten nächsten Gebrauch des Bosch mit der dokumentierten Abkühlzeit ab — Check the separate five-minute cooldown requirement between kettle uses.',
    {voriger_gebrauch_ende_bestaetigt:flag('Ende des vorherigen Gebrauchs und verstrichene Zeit wurden beobachtet.'),
      vergangen_min:number('Zeit seit dem Ende des letzten Gebrauchs in Minuten.',0,2880)},
    ({voriger_gebrauch_ende_bestaetigt,vergangen_min},known)=>({min_abkuehlzeit_min:known?5:null,
      abkuehlbedingung_erfuellt:known&&voriger_gebrauch_ende_bestaetigt?vergangen_min>=5:null}),
    {voriger_gebrauch_ende_bestaetigt:true,vergangen_min:3.5},{min_abkuehlzeit_min:5,abkuehlbedingung_erfuellt:false},'S. 7, nach jedem Gebrauch abkühlen lassen','Das Zeitfenster betrifft die Herstelleranweisung für den Wiedergebrauch. Es ist keine Temperaturmessung oder Freigabe zum Berühren.'),

  handbook('wasserkocher_twk8613p_hoehenlage_2000_aufsicht',
    'Prüft Höhenlage und beaufsichtigte Nutzung für Bosch TWK8613P im geplanten Haushalt — Verify the documented altitude and observation conditions for the proposed use site.',
    {hoehe_belegt:flag('Höhenlage des konkreten Haushalts ist für die Entscheidung bekannt.'),meter:number('Höhe über dem Meeresspiegel in Metern.',-500,6000),
      beaufsichtigt:status('Beaufsichtigung während des geplanten Gebrauchs ist organisatorisch belegt.')},
    ({hoehe_belegt,meter,beaufsichtigt},known)=>({hoehenbereich:known&&hoehe_belegt?meter<=2000:null,
      aufsicht_belegt:known&&beaufsichtigt!=='offen'?beaufsichtigt==='belegt':null}),
    {hoehe_belegt:true,meter:2050,beaufsichtigt:'belegt'},{hoehenbereich:false,aufsicht_belegt:true},'S. 6, bestimmungsgemäßer Gebrauch','Höhenlage und Aufsicht sind zwei eigenständige Bedingungen. Die Höhenprüfung sagt nichts über die tatsächliche Siedetemperatur aus.'),

  handbook('wasserkocher_twk8613p_min_max_markierungen_ablesbar',
    'Prüft die lesbare MIN- und MAX-Markierung am konkreten Bosch-Wasserkocher und ob 1,5 Liter allein den Mindeststrich belegen — Check legible on-device fill-limit markings before using an exact kettle.',
    {min_ablesbar:status('MIN am konkreten Gerät eindeutig abgelesen.'),max_ablesbar:status('MAX am konkreten Gerät eindeutig abgelesen.'),
      gekennzeichnete_position:choice('Welche Füllung würde tatsächlich beobachtet?', 'innerhalb_beider_marken','unter_min','ueber_max','offen')},
    ({min_ablesbar,max_ablesbar,gekennzeichnete_position},known)=>({bekanntes_nennvolumen_l:known?1.5:null,beleg_nennvolumen:known?source(catalogue,'S. 33, TWK8613P Nennvolumen 1,5 l'):null,
      fuellung_innerhalb_bestaetigter_marken:known&&min_ablesbar==='belegt'&&max_ablesbar==='belegt'&&gekennzeichnete_position!=='offen'?gekennzeichnete_position==='innerhalb_beider_marken':null}),
    {min_ablesbar:'offen',max_ablesbar:'belegt',gekennzeichnete_position:'innerhalb_beider_marken'},{bekanntes_nennvolumen_l:1.5,fuellung_innerhalb_bestaetigter_marken:null},
    'S. 7–8, Wasserstandsanzeige und Füllgrenzen','Nennvolumen laut Modell. Maßgeblich sind die tatsächlichen Min- und Max-Markierungen. Aus dem Gesamtwert keinen Mindestwert schätzen.'),

  handbook('wasserkocher_twk8613p_vor_siedepunkt_abschaltung_sollwert',
    'Klärt, warum der Bosch Wasserkocher vor dem Siedepunkt abschaltet, mit Abgleich der Temperaturstufe und des beobachteten Verlaufs — Check whether an early-looking stop belongs to a lower setting or needs manufacturer review.',
    {wahl:choice('Beim gestoppten Lauf bestätigte Einstellung.','70_80_90','kochend','offen'),
      ende:choice('Direkt beobachtetes Ende.','stoppt_vor_sieden','heizlauf_unterbrochen','offen'),
      sichtbarer_kalk:status('Kalkablagerungen sind als eigene Beobachtung am kalten Gerät belegt.')},
    ({wahl,ende,sichtbarer_kalk},known)=>({einordnung:!known||wahl==='offen'||ende!=='stoppt_vor_sieden'?'ablauf_und_stufe_pruefen':wahl==='70_80_90'?'vor_sieden_mit_niedriger_stufe_vereinbar':'wartungshinweis_zur_verkalkung_im_handbuch_pruefen',
      kalk_separat_beobachtet:sichtbarer_kalk,ursache_bestaetigt:false}),
    {wahl:'70_80_90',ende:'stoppt_vor_sieden',sichtbarer_kalk:'offen'},{einordnung:'vor_sieden_mit_niedriger_stufe_vereinbar',ursache_bestaetigt:false},'S. 8–9, Wasser kochen und Störungen','Die Anleitung nennt Kalk als mögliche Zuordnung bei unerwartetem Abschalten vor dem Kochen. Beobachtung oder sichtbarer Kalk allein belegt keine Fehlerursache.'),

  handbook('wasserkocher_twk8613p_deckel_kalksieb_gebrauchsbeleg',
    'Prüft nach der Pflege, ob Deckel und entnehmbares Kalksieb wie vorgesehen am Bosch montiert und beobachtet sind — Confirm two documented kettle assembly conditions before use.',
    {deckel_geschlossen:status('Der Deckel ist am kalten Gerät geschlossen und das wurde beobachtet.'),sieb_eingesetzt:status('Das zugeordnete Kalksieb wurde am Platz beobachtet.')},
    ({deckel_geschlossen,sieb_eingesetzt},known)=>({beide_bedingungen:!known?'offen':[deckel_geschlossen,sieb_eingesetzt].includes('ausgeschlossen')?'unvollstaendig':deckel_geschlossen==='belegt'&&sieb_eingesetzt==='belegt'?'belegt':'offen'}),
    {deckel_geschlossen:'belegt',sieb_eingesetzt:'ausgeschlossen'},{beide_bedingungen:'unvollstaendig'},'S. 7, Deckel geschlossen und Kalksieb eingesetzt','Den kalten Geräteaufbau beobachten. Die zwei Beobachtungen treffen kein Gesamturteil über den Gerätezustand.'),

  handbook('wasserkocher_twk8613p_spuelmaschine_basis_kanne_sieb',
    'Prüft, ob die Bosch-Anleitung für Kanne, Basis oder separat betrachtetes Kalksieb eine Spülmaschinenpflege belegt — Separate forbidden dishwasher use from component-specific care evidence.',
    {teil:choice('Zu pflegendes Teil.','kanne','basis','anschlussleitung','kalksieb','offen')},
    ({teil},known)=>({spuelmaschine_einordnung:!known||teil==='offen'?'offen':teil==='kalksieb'?'separate_siebpflege_in_anleitung_pruefen':'spuelmaschine_ausgeschlossen'}),
    {teil:'basis'},{spuelmaschine_einordnung:'spuelmaschine_ausgeschlossen'},'S. 7–9, Reinigungshinweise und Kalksieb','Kessel, Basis und Leitung dürfen laut Anleitung nicht in einen Geschirrspüler. Die separate Siebpflege nach der Teileanweisung prüfen.'),

  handbook('wasserkocher_twk8613p_entkalken_taeglicher_betrieb_intervall',
    'Ordnet den Bosch-Pflegehinweis bei täglicher Nutzung ein und zeigt, ob ein fester Entkalkungsabstand belegt ist — Check usage-dependent kettle maintenance without inventing a fixed day count.',
    {nutzung:choice('Tatsächlich beobachtete Häufigkeit.','taeglich','weniger_als_taeglich','offen')},
    ({nutzung},known)=>({herstellerintervall:!known||nutzung==='offen'?null:nutzung==='taeglich'?'kuerzere_abstaende_vorgesehen':'regelmaessige_pflege',tage_aus_handbuch:null}),
    {nutzung:'taeglich'},{herstellerintervall:'kuerzere_abstaende_vorgesehen',tage_aus_handbuch:null},'S. 8, Gerät entkalken','Bosch nennt kürzere Abstände bei täglicher Nutzung. Die Angabe enthält keinen festen Rhythmus in Tagen.'),

  handbook('wasserkocher_twk8613p_kondenswasser_basis_wasserbeobachtung',
    'Ordnet eine Wasserbeobachtung an der Basis ein und hält Kondenswasser, Verschütten und sichtbare Schäden getrennt — Scope base moisture against the Bosch condensation note without inferring an electrical fault.',
    {ort:choice('Sicher beobachtete Lage des Wassers.','an_basis','anderswo','offen'),
      schaeden_oder_ueberlauf:status('Beschädigung, Verschütten oder Flüssigkeit an der Steckverbindung ist als Beobachtung belegt.')},
    ({ort,schaeden_oder_ueberlauf},known)=>({hersteller_erwaehnt_kondenswasser:known&&ort==='an_basis'?true:null,
      stand:!known?'modell_und_beobachtung_pruefen':schaeden_oder_ueberlauf==='belegt'?'betrieb_nicht_fortsetzen_zustand_abklaeren':ort==='an_basis'?'ursache_bleibt_offen':'ort_separat_abklaeren'}),
    {ort:'an_basis',schaeden_oder_ueberlauf:'offen'},{hersteller_erwaehnt_kondenswasser:true,stand:'ursache_bleibt_offen'},'S. 7 und 9, Schäden, Flüssigkeit und Kondenswasser an der Basis','Kondenswasser ist beschrieben. Die konkrete Flüssigkeitsquelle und Geräteeignung lassen sich daraus nicht diagnostizieren.'),

  handbook('wasserkocher_twk8613p_schrankbetrieb_dampf_aufstellort',
    'Prüft, ob ein gewünschter Aufstellort im Schrank mit dem Bosch-Hinweis zum Wasserkocherbetrieb vereinbar ist — Check the kettle’s documented in-cabinet restriction for a proposed location.',
    {lage:choice('Geplanter Ort im tatsächlichen Gebrauch.','im_schrank','freier_platz','offen'),
      lueftung_geprueft:status('Ausreichende Belüftung im genauen Aufbau ist separat bestätigt.')},
    ({lage,lueftung_geprueft},known)=>({im_schrank_laut_anleitung_ausgeschlossen:known&&lage!=='offen'?lage==='im_schrank':null,
      separat_gepruefte_belueftung:known?lueftung_geprueft:null}),
    {lage:'im_schrank',lueftung_geprueft:'offen'},{im_schrank_laut_anleitung_ausgeschlossen:true,separat_gepruefte_belueftung:'offen'},'S. 7, belüften und kein Schrankbetrieb','Die Anleitung nennt keinen pauschalen Abstand in Zentimetern. Einen freien und belüfteten Betriebsort für den tatsächlichen Gebrauch prüfen.'),

  tool('bosch_twk8613p_doppelwand_oberflaeche_beruehrbarkeit',
    'Prüft, was das Bosch-Doppelwand-Gehäuse zu reduzierter Außentemperatur belegt und ob damit eine konkrete berührbare Stelle nachgewiesen ist — Distinguish the double-wall feature from a measured touch-temperature result.',
    {modell_genau:flag('TWK8613P laut deutschem Produktblatt und Gerät eindeutig.'),
      anforderung:choice('Benötigter Nachweis.','doppelwand_konstruktionsmerkmal','temperatur_an_kontaktstelle','offen')},
    ({modell_genau,anforderung})=>({doppelwand_dokumentiert:modell_genau?true:null,konkrete_anforderung_im_datenblatt:modell_genau&&anforderung!=='offen'?anforderung==='doppelwand_konstruktionsmerkmal':null,
      beleg:modell_genau?s:null,hinweis:'Bosch beschreibt eine reduzierte äußere Oberflächentemperatur. Konkrete Temperaturen an Griff, Deckel und Kannenwand müssen getrennt belegt werden.'}),
    {modell_genau:true,anforderung:'temperatur_an_kontaktstelle'},{doppelwand_dokumentiert:true,konkrete_anforderung_im_datenblatt:false})
];
