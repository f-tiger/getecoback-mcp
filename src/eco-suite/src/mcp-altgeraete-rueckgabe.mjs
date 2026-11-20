const page = '/geraete-austausch-rechner.html';
const statute = 'ElektroG § 17';
const num = (description, minimum=0, maximum=1000000) => ({type:'number',minimum,maximum,description});
const yes = description => ({type:'boolean',description});
const pick = (description,...values) => ({type:'string',enum:values,description});
const date = description => ({type:'string',description:description+' YYYY-MM-DD, leer wenn nicht belegt.'});
const round = value => Math.round(value*100)/100;
const dayMs = 86400000;

function parseDate(value) {
  if (value==='') return null;
  if (!/^20\d{2}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Kalenderdatum 2000 bis 2099 erforderlich.');
  const at=Date.parse(value+'T00:00:00Z');
  if (!Number.isFinite(at)||new Date(at).toISOString().slice(0,10)!==value) throw new RangeError('Ungültiges Datum.');
  return at;
}
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Stückzahlen erforderlich.');
}
function tool(name,description,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const altgeraeteRueckgabe = [
  tool('elektrog_altgeraete_flaechenbasis_haendler',
    'Beim stationären oder entfernten Verkauf prüfen, ob der belegte Flächenwert zur richtigen Bezugsgröße der allgemeinen Händlerregel gehört — Match a verified area to the proper shop or distance-selling threshold.',
    {
      kanal:pick('Kanal des tatsächlich zuständigen Anbieters.','laden','fernabsatz'),
      bereich:pick('Für wen wurde die Flächenzahl erhoben?','elektrovertrieb','lebensmittelvertrieb'),
      flaechenart:pick('Exakte dokumentierte Bezugsgröße.','verkauf_elektro','verkauf_gesamt','lager_versand_elektro','lager_versand_gesamt','offen'),
      flaeche_m2:num('Belegte Quadratmeter anhand derselben Bezugsgröße, sonst 0 bei offener Flächenart.'),
      elektroangebot:pick('Zeitbezug des Elektronikangebots eines Lebensmittelvertriebs.','mehrmals_oder_dauerhaft','nicht_mehrmals','offen','nicht_erforderlich'),
    },({kanal,bereich,flaechenart,flaeche_m2,elektroangebot})=>{
      const food=bereich==='lebensmittelvertrieb';
      const expected=(kanal==='laden'?'verkauf_':'lager_versand_')+(food?'gesamt':'elektro');
      const min=food?800:400;
      const basis=flaechenart===expected;
      const frequency=food?(elektroangebot==='mehrmals_oder_dauerhaft'?true:elektroangebot==='nicht_mehrmals'?false:null):true;
      return {flaechenreferenz_m2:min,passende_flaechenart:expected,abstand_zur_referenz_m2:basis?round(flaeche_m2-min):null,
        allgemeine_merkmale_belegt:basis?(flaeche_m2<min||frequency===false?false:frequency):null,
        hinweis:'Vergleich anhand belegter Flächen des tatsächlichen Vertreibers. Daraus folgt keine Einzelfallentscheidung.',
        fundstelle:statute+' Abs. 1 und 2'};
    },{kanal:'fernabsatz',bereich:'lebensmittelvertrieb',flaechenart:'lager_versand_gesamt',flaeche_m2:800,elektroangebot:'mehrmals_oder_dauerhaft'},
    {flaechenreferenz_m2:800,passende_flaechenart:'lager_versand_gesamt',abstand_zur_referenz_m2:0,allgemeine_merkmale_belegt:true}),

  tool('elektrog_kleingeraete_dreifach_mass_anzahl',
    'Eine dokumentierte Geräteart anhand ihrer größten äußeren Abmessung und der Zahl im selben Vorhaben mit der 0:1-Regel abgleichen — Check the inclusive size threshold and the per-type small-device count together.',
    {
      a_cm:num('Erste äußere Abmessung des betrachteten Altgeräts in Zentimetern.',0.01,1000),
      b_cm:num('Zweite äußere Abmessung in Zentimetern.',0.01,1000),
      c_cm:num('Dritte äußere Abmessung in Zentimetern.',0.01,1000),
      spielraum_cm:num('Begründete maximale absolute Abweichung je Abmessung. Exakten Beleg mit 0 kennzeichnen.',0,100),
      stueck_gleiche_art:num('Anzahl gleichartig bestätigter Altgeräte im selben Vorhaben. Die gemessenen Maße gelten für alle hier gezählten Stücke.',1,1000),
      gleiche_bauform_und_art_belegt:yes('Äußere Abmessungen und genau dieselbe Geräteart aller gezählten Stücke sind belegt?'),
    },({a_cm,b_cm,c_cm,spielraum_cm,stueck_gleiche_art,gleiche_bauform_und_art_belegt})=>{
      whole(stueck_gleiche_art);
      const max=Math.max(a_cm,b_cm,c_cm);
      const status=!gleiche_bauform_und_art_belegt?'mass_oder_art_offen':max+spielraum_cm<=25+1e-9?'im_25_cm_rahmen':
        max-spielraum_cm>25+1e-9?'ueber_25_cm':'messspanne_schneidet_25_cm';
      return {status,groesstes_nennmass_cm:max,stueck_innerhalb_dreier_referenz:status==='im_25_cm_rahmen'?Math.min(stueck_gleiche_art,3):null,
        stueck_ueber_der_referenz:status==='im_25_cm_rahmen'?Math.max(0,stueck_gleiche_art-3):null,
        hinweis:'Gilt für die Geräteaußenmaße und dieselbe bestätigte Geräteart. Händlerrahmen und Rückgabeweg separat belegen.',
        fundstelle:statute+' Abs. 1 Satz 1 Nr. 2'};
    },{a_cm:25,b_cm:18,c_cm:10,spielraum_cm:0,stueck_gleiche_art:4,gleiche_bauform_und_art_belegt:true},
    {status:'im_25_cm_rahmen',groesstes_nennmass_cm:25,stueck_innerhalb_dreier_referenz:3,stueck_ueber_der_referenz:1}),

  tool('elektrog_eins_zu_eins_geraeteart_kernfunktionen',
    'Für den Austausch eines Haushaltsgeräts gleiche Geräteart und im Wesentlichen gleiche Funktionen getrennt anhand des Belegs einordnen — Check like-for-like scope without inferring functional equivalence from a common marketing category.',
    {
      neue_abgabe:pick('Status der tatsächlich dokumentierten Abgabe eines Neugeräts an den Endnutzer.','bestaetigt','keine','offen'),
      gleiche_art:pick('Gehören Alt- und Neugerät nach den überprüften Gerätebeschreibungen zur gleichen Geräteart?','ja','nein','offen'),
      kernfunktionen:pick('Erfüllen Alt- und Neugerät im Wesentlichen dieselben bestätigten Funktionen?','gleich','abweichend','offen'),
      genaue_geraete_belegt:yes('Beide Beschreibungen gelten für die konkret betroffenen Geräte?'),
    },({neue_abgabe,gleiche_art,kernfunktionen,genaue_geraete_belegt})=>{
      if (!genaue_geraete_belegt) return {status:'geraetebezug_offen'};
      const confirmed=neue_abgabe==='bestaetigt'&&gleiche_art==='ja'&&kernfunktionen==='gleich';
      const absent=neue_abgabe==='keine'||gleiche_art==='nein'||kernfunktionen==='abweichend';
      return {status:confirmed?'1_zu_1_merkmale_belegt':absent?'vergleichsmerkmal_nicht_erfuellt':'vergleichsmerkmal_offen',
        offen:[...(neue_abgabe==='offen'?['neue_abgabe']:[]),...(gleiche_art==='offen'?['geraeteart']:[]),...(kernfunktionen==='offen'?['kernfunktionen']:[])],
        hinweis:'Nur Geräteart, Funktionen und Neugeräteabgabe einordnen. Aus Bezeichnungen wie Kombi oder ähnlichen Maßen keine Gleichartigkeit ableiten.',
        fundstelle:statute+' Abs. 1 Satz 1 Nr. 1'};
    },{neue_abgabe:'bestaetigt',gleiche_art:'offen',kernfunktionen:'gleich',genaue_geraete_belegt:true},
    {status:'vergleichsmerkmal_offen',offen:['geraeteart']}),

  tool('elektrog_fernabsatz_kategorie_annahmeweg',
    'Beim bestätigten Fernabsatz-Rückgabeweg die dokumentierte Produktkategorie und den tatsächlichen Abgabeort zusammen lesen — Distinguish home pickup from an appropriate reachable return route in distance selling.',
    {
      fall:pick('Belegtes Rückgabemodell.','ersatzkauf_1_zu_1','ohne_kauf_0_zu_1','offen'),
      kategorie:pick('Bestätigte Produktkategorie gemäß § 2 Absatz 1, keine bloße Größenvermutung.','1_waermeuebertraeger','2_bildschirm','3_lampe','4_grossgeraet','5_kleingeraet','6_kleine_it','offen'),
      neuabgabe_ort:pick('Dokumentierter Abgabeort des neuen Geräts bzw. kein Kauf.','privater_haushalt','anderer_ort','kein_neugeraet','offen'),
      fernabsatz_und_merkmale_belegt:yes('Zuständiger Vertreiber, Fernabsatz und Merkmale des jeweiligen Rückgabemodells sind bereits geklärt?'),
    },({fall,kategorie,neuabgabe_ort,fernabsatz_und_merkmale_belegt})=>{
      if (!fernabsatz_und_merkmale_belegt||fall==='offen') return {abgleichsweg:null};
      if (fall==='ohne_kauf_0_zu_1') return {abgleichsweg:'geeignete_rueckgabemoeglichkeit_in_zumutbarer_entfernung',fundstelle:statute+' Abs. 2'};
      if (neuabgabe_ort==='kein_neugeraet') throw new RangeError();
      if (kategorie==='offen') return {abgleichsweg:null};
      if (/^[356]_/.test(kategorie)) return {abgleichsweg:'geeignete_rueckgabemoeglichkeit_in_zumutbarer_entfernung',fundstelle:statute+' Abs. 2'};
      return {abgleichsweg:neuabgabe_ort==='offen'?null:neuabgabe_ort==='privater_haushalt'?'abholung_bei_haushaltslieferung':'ort_der_neuabgabe_oder_naehe',
        fundstelle:statute+' Abs. 1 und 2',
        hinweis:'Nur abstrakten Weg anhand bestätigter Eingaben zuordnen. Konkrete Abholung oder angemessene Entfernung mit den Anbieterangaben abgleichen.'};
    },{fall:'ersatzkauf_1_zu_1',kategorie:'1_waermeuebertraeger',neuabgabe_ort:'privater_haushalt',fernabsatz_und_merkmale_belegt:true},
    {abgleichsweg:'abholung_bei_haushaltslieferung'}),

  tool('elektrog_geraetekategorie_bezeichner_anlage',
    'Eine klar dokumentierte Haushaltsgeräteart mit Beispielen der Anlage 1 abgleichen, ohne die Schwellen für 0:1 und ElektroG-Kategorien zu vermischen — Identify listed household examples with the necessary category-specific size evidence.',
    {
      art:pick('Belegte Haushaltsgeräteart.','kuehl_oder_gefriergeraet','klimageraet_oder_entfeuchter','waermepumpentrockner','waschmaschine_oder_geschirrspueler','toaster_oder_wasserkocher','led_lampe','unbestimmt'),
      groesstes_mass_cm:num('Größtes nachweisliches äußeres Gerätemaß in Zentimetern, nicht Transportmaß. Bei unbekanntem Wert 0 verwenden.',0,1000),
      geraeteart_bestaetigt:yes('Gilt die bestätigte Beschreibung für genau dieses Gerät und liegt kein Sonderfall vor?'),
    },({art,groesstes_mass_cm,geraeteart_bestaetigt})=>{
      if (!geraeteart_bestaetigt||art==='unbestimmt') return {kategorie:null};
      const heat=['kuehl_oder_gefriergeraet','klimageraet_oder_entfeuchter','waermepumpentrockner'].includes(art);
      const result=heat?1:art==='led_lampe'?3:art==='waschmaschine_oder_geschirrspueler'&&groesstes_mass_cm>50?4:
        art==='toaster_oder_wasserkocher'&&groesstes_mass_cm>0&&groesstes_mass_cm<=50?5:null;
      return {kategorie:result,bezugsregel:result===null?null:result===4||result===5?'50_cm_kategorieschwelle':'geraeteart_in_anlage_1',
        hinweis:'Ungeklärte Sonderausführungen bleiben offen. 50 cm ist hier eine Kategoriegrenze, 25 cm betrifft die Rückgabe ohne Neukauf.',
        fundstelle:'ElektroG § 2 Abs. 1 und Anlage 1'};
    },{art:'waermepumpentrockner',groesstes_mass_cm:60,geraeteart_bestaetigt:true},
    {kategorie:1,bezugsregel:'geraeteart_in_anlage_1'}),

  tool('altgeraete_abholhinweis_vertragsmoment_beleg',
    'Bei einer geplanten Haushaltslieferung Informationen und tatsächliche Nachfrage zur Altgeräteabgabe beim Vertragsschluss getrennt belegen — Audit which checkout disclosures were actually observed without turning them into a booking.',
    {
      haushaltslieferung_bestaetigt:yes('Neugeräteabgabe im privaten Haushalt für diesen Kauf tatsächlich vereinbart?'),
      hinweis_rueckgabe:yes('Enthält der gesicherte Vertragsschritt einen Hinweis auf die unentgeltliche Rückgabe?'),
      hinweis_abholung:yes('Wurde dort auch über die unentgeltliche Abholung informiert?'),
      absicht_erfragt:yes('Wurde im gesicherten Vertragsschritt eine konkrete Rückgabeabsicht erfragt?'),
      ausschnitt_vollstaendig:yes('Liegt der relevante Abschnitt des tatsächlich genutzten Vertragsschritts vollständig vor?'),
    },({haushaltslieferung_bestaetigt,hinweis_rueckgabe,hinweis_abholung,absicht_erfragt,ausschnitt_vollstaendig})=>{
      if (!haushaltslieferung_bestaetigt||!ausschnitt_vollstaendig) return {status:'belegausschnitt_offen',fehlende_belege:null};
      const missing=[['rueckgabehinweis',hinweis_rueckgabe],['abholhinweis',hinweis_abholung],['abfrage_der_absicht',absicht_erfragt]].filter(([,v])=>!v).map(([k])=>k);
      return {status:missing.length?'im_ausschnitt_nicht_belegt':'drei_angaben_belegt',fehlende_belege:missing,
        hinweis:'Der belegte Hinweis bestätigt noch keine Mitnahme im konkreten Zustellauftrag.',
        fundstelle:statute+' Abs. 1 Sätze 2 und 3'};
    },{haushaltslieferung_bestaetigt:true,hinweis_rueckgabe:true,hinweis_abholung:false,absicht_erfragt:true,ausschnitt_vollstaendig:true},
    {status:'im_ausschnitt_nicht_belegt',fehlende_belege:['abholhinweis']}),

  tool('altgeraete_marktplatz_verkaeufer_logistikkette',
    'Marktplatz, vertraglichen Vertreiber und ausführenden Abholdienst in den konkreten Belegen auseinanderhalten — Trace a pickup commitment to the seller or its verified carrier.',
    {
      vertragspartner_bestaetigt:yes('Der tatsächliche Verkäufer ist aus der konkreten Bestellunterlage eindeutig bestimmbar?'),
      zusage_von:pick('Wer bestätigte die konkrete Altgeräteabholung?','vertragspartner','marktplatz_allgemein','logistikdienst','offen'),
      logistik_beauftragung_belegt:yes('Ist bei Logistikzusage die Beauftragung durch denselben Verkäufer für diese Bestellung belegt?'),
      zusage_exakt_fuer_bestellung:yes('Bezieht sich die Zusage ausdrücklich auf dieselbe Bestellung und die Altgerätemitnahme?'),
    },({vertragspartner_bestaetigt,zusage_von,logistik_beauftragung_belegt,zusage_exakt_fuer_bestellung})=>{
      if (!vertragspartner_bestaetigt||!zusage_exakt_fuer_bestellung) return {status:'bestell_oder_verkaeuferbezug_offen'};
      return {status:zusage_von==='vertragspartner'?'direkter_zusagebeleg':zusage_von==='logistikdienst'&&logistik_beauftragung_belegt?'zusage_mit_beauftragung_belegt':'zustaendigkeit_offen',
        hinweis:'Anbieteridentität und Auftrag nachvollziehen. Verbindlichkeit oder tatsächliche Abholung folgen daraus nicht automatisch.'};
    },{vertragspartner_bestaetigt:true,zusage_von:'logistikdienst',logistik_beauftragung_belegt:false,zusage_exakt_fuer_bestellung:true},
    {status:'zustaendigkeit_offen'}),

  tool('altgeraete_termin_neulieferung_verschoben_mitnahme',
    'Bei einer verschobenen Lieferung zwischen ausdrücklich mitverschobener und separat am alten Termin bestätigter Altgeräteabholung unterscheiden — Preserve a pickup status when the new-device delivery date changes.',
    {
      alter_liefertag:date('Ursprünglich bestätigter Tag der Neulieferung.'),
      neuer_liefertag:date('Später bestätigter neuer Liefertag derselben Bestellung.'),
      abholnachtrag:pick('Was steht im Änderungsbeleg zur Mitnahme?','mit_neuer_lieferung_bestaetigt','am_alten_tag_separat_bestaetigt','aufgehoben','nicht_erwaehnt'),
      gleicher_auftrag:yes('Gilt der Änderungsbeleg für denselben Verkäufer, dieselbe Bestellung und dasselbe Altgerät?'),
    },({alter_liefertag,neuer_liefertag,abholnachtrag,gleicher_auftrag})=>{
      parseDate(alter_liefertag); parseDate(neuer_liefertag);
      if (!alter_liefertag||!neuer_liefertag||!gleicher_auftrag) return {status:'aenderungsbezug_offen',abholtag:null};
      if (alter_liefertag===neuer_liefertag) return {status:'kein_datumswechsel',abholtag:null};
      return {status:abholnachtrag==='nicht_erwaehnt'?'mitnahme_nach_wechsel_offen':abholnachtrag,
        abholtag:abholnachtrag==='mit_neuer_lieferung_bestaetigt'?neuer_liefertag:abholnachtrag==='am_alten_tag_separat_bestaetigt'?alter_liefertag:null,
        hinweis:'Nur Tagseltung der schriftlichen Bestätigung; keine Uhrzeit oder tatsächliche Leistung daraus ableiten.'};
    },{alter_liefertag:'2026-11-22',neuer_liefertag:'2026-11-26',abholnachtrag:'nicht_erwaehnt',gleicher_auftrag:true},
    {status:'mitnahme_nach_wechsel_offen',abholtag:null}),

  tool('altgeraete_kosten_beleg_getrennte_leistungen',
    'Gesamtpreis einer Zustellung anhand einzeln ausgewiesener Lieferung, vereinbarter Zusatzleistung und Mitnahme nachvollziehen — Separate the take-back line from paid delivery and optional ancillary work.',
    {
      gesamt_euro:num('Schriftlich ausgewiesener Gesamtbetrag der betrachteten Servicepositionen.'),
      zustellung_euro:num('Ausgewiesener Betrag nur der Neulieferung.'),
      zusatz_euro:num('Explizit ausgewiesene weitere Leistung.'),
      mitnahme_euro:num('Ausgewiesener separater Betrag für die Altgerätemitnahme.'),
      mitnahme_art:pick('Mitnahmekanal laut konkret belegter Vereinbarung.','gesetzlicher_abgleich','freiwillige_zusaetzliche_abholung','offen'),
      gleiche_betragsbasis:yes('Alle Beträge aus demselben Angebot, auf derselben Steuerbasis, ohne doppelt eingerechnete Positionen?'),
    },({gesamt_euro,zustellung_euro,zusatz_euro,mitnahme_euro,mitnahme_art,gleiche_betragsbasis})=>{
      if (!gleiche_betragsbasis) return {rest_euro:null,mitnahmeeinordnung:'betragsbasis_offen'};
      return {rest_euro:round(gesamt_euro-zustellung_euro-zusatz_euro-mitnahme_euro),
        mitnahmeeinordnung:mitnahme_euro===0?'kein_separater_betrag':mitnahme_art==='freiwillige_zusaetzliche_abholung'?'freiwillige_abholung_separat_bepreist':'mitnahmebetrag_und_grundlage_klaeren',
        hinweis:'Rechenabgleich. § 17 Absatz 4 unterscheidet eine zusätzlich angebotene Abholleistung im freiwilligen Weg; keine Bewertung einzelner Rechnungsansprüche.'};
    },{gesamt_euro:65,zustellung_euro:30,zusatz_euro:25,mitnahme_euro:10,mitnahme_art:'offen',gleiche_betragsbasis:true},
    {rest_euro:0,mitnahmeeinordnung:'mitnahmebetrag_und_grundlage_klaeren'}),

  tool('altgeraete_abholvorgang_tatsaechliche_uebergabe',
    'Eine für dieselbe Bestellung protokollierte Altgeräteabholung von Neu-Zustellung, erfolglosem Versuch und Terminankündigung unterscheiden — Reconcile actual handover separately from delivery of the replacement.',
    {
      neu_abgegeben:yes('Wurde die Neulieferung bestätigt abgeschlossen?'),
      abholstatus:pick('Was belegt das tatsächliche Ergebnis der Altgerätemitnahme?','uebergeben','versuch_ohne_uebergabe','nur_termin','keine_dokumentation'),
      altgeraet_eindeutig:yes('Bezieht sich der aufgezeichnete Status eindeutig auf das vereinbarte Altgerät und nicht auf eine andere Sendung?'),
    },({neu_abgegeben,abholstatus,altgeraet_eindeutig})=>{
      return {neu_abgegeben,altgeraet_uebergabe:!altgeraet_eindeutig?'zuordnung_offen':abholstatus,
        neu_ohne_bestaetigte_altuebergabe:neu_abgegeben&&(!altgeraet_eindeutig||abholstatus!=='uebergeben'),
        hinweis:'Die Zustellung des neuen Geräts ist kein Entsorgungs- oder Mitnahmebeleg für das alte Gerät.'};
    },{neu_abgegeben:true,abholstatus:'versuch_ohne_uebergabe',altgeraet_eindeutig:true},
    {neu_abgegeben:true,altgeraet_uebergabe:'versuch_ohne_uebergabe',neu_ohne_bestaetigte_altuebergabe:true}),

  tool('altgeraete_mitnahmewunsch_zur_zustelltour',
    'Von einer gesendeten Rückgabeabsicht bis zur ausdrücklichen Übernahme in den Zustellauftrag sichtbare Belegstufen unterscheiden — Track an old-appliance request through checkout confirmation to the carrier work order.',
    {
      wunsch_gesendet:yes('Die Abholabsicht wurde nachweislich übermittelt?'),
      in_kaufbestaetigung:yes('Die Kaufbestätigung nennt ausdrücklich die Mitnahme desselben Altgeräts?'),
      im_zustellauftrag:yes('Der Zustellauftrag nennt ausdrücklich dieselbe Mitnahme?'),
      varianten_zuordnung_geprueft:yes('Belege, Händler und Altgerät gehören eindeutig zu derselben Bestellung?'),
    },({wunsch_gesendet,in_kaufbestaetigung,im_zustellauftrag,varianten_zuordnung_geprueft})=>{
      if (!varianten_zuordnung_geprueft) return {status:'bestellbezug_offen',weiterer_beleg:null};
      if (im_zustellauftrag) return {status:'in_zustellauftrag_dokumentiert',weiterer_beleg:'tatsaechliche_uebergabe'};
      return {status:in_kaufbestaetigung?'durch_verkaeufer_bestaetigt':wunsch_gesendet?'absicht_uebermittelt':'keine_absicht_bestaetigt',
        weiterer_beleg:in_kaufbestaetigung?'zustellauftrag':wunsch_gesendet?'bestaetigung_der_mitnahme':'wunsch_oder_anschlussbeleg',
        hinweis:'Kundenwunsch und Auftrag sind getrennte Zustände. Keine Erklärung wird versandt.'};
    },{wunsch_gesendet:true,in_kaufbestaetigung:true,im_zustellauftrag:false,varianten_zuordnung_geprueft:true},
    {status:'durch_verkaeufer_bestaetigt',weiterer_beleg:'zustellauftrag'}),

  tool('altgeraete_neuannahme_abbruch_mitnahmebindung',
    'Bei ausgefallener Neulieferung unterscheiden, ob ein schriftlicher Mitnahmeauftrag ausdrücklich unabhängig bleibt oder nur mit der Neulieferung galt — Check the pickup dependency when the replacement is not handed over.',
    {
      neue_lieferung:pick('Tatsächlicher Stand der Neugeräteübergabe.','ausgefallen','nicht_angenommen','noch_offen','angenommen'),
      mitnahme_bedingung:pick('Ausdrückliche Bindung im konkreten Zustellauftrag.','nur_mit_erfolgter_neuabgabe','getrennt_bestaetigt','nicht_dokumentiert'),
      altbereits_uebergeben:yes('Wurde das Altgerät bereits tatsächlich übergeben?'),
      korrekter_bestellbezug:yes('Die Vorgänge betreffen exakt das alte und das neue Gerät dieser Bestellung?'),
    },({neue_lieferung,mitnahme_bedingung,altbereits_uebergeben,korrekter_bestellbezug})=>{
      if (!korrekter_bestellbezug) return {status:'bestellbezug_offen'};
      if (altbereits_uebergeben) return {status:'altuebergabe_tatsaechlich_belegt'};
      if (neue_lieferung==='angenommen') return {status:'stand_der_altuebergabe_separat_pruefen'};
      return {status:mitnahme_bedingung==='getrennt_bestaetigt'?'getrennte_mitnahme_bestaetigt':mitnahme_bedingung==='nur_mit_erfolgter_neuabgabe'?'dokumentierte_bedingung_noch_nicht_erfuellt':'mitnahmestand_nach_ausfall_offen',
        hinweis:'Nur den dokumentierten Zusammenhang beurteilen. Neue Termine und die bestehende Rückgabeoption schriftlich klären.'};
    },{neue_lieferung:'nicht_angenommen',mitnahme_bedingung:'nur_mit_erfolgter_neuabgabe',altbereits_uebergeben:false,korrekter_bestellbezug:true},
    {status:'dokumentierte_bedingung_noch_nicht_erfuellt'}),

  tool('altgeraete_annahmeort_umzug_zwei_belegorte',
    'Bei einer Bestellung mit zwei Wohnorten prüfen, welcher ausdrücklich beauftragte Ort für das Altgerät gilt — Compare documented pickup and replacement delivery places without collecting addresses.',
    {
      abgabeort_neu:pick('Im Auftrag bestätigter neuer Abgabeort.','alter_haushalt','neuer_haushalt','abholstelle','offen'),
      mitnahme_ort:pick('Im Auftrag ausdrücklich angegebener Altgeräteort.','alter_haushalt','neuer_haushalt','abholstelle','offen'),
      tatsaechlicher_altort:pick('Tatsächlicher Standort des Altgeräts für den Vorgang.','alter_haushalt','neuer_haushalt','abholstelle','offen'),
      belege_gleicher_vorgang:yes('Sind beides Angaben derselben Bestellung mit eindeutig zugeordnetem Altgerät?'),
    },({abgabeort_neu,mitnahme_ort,tatsaechlicher_altort,belege_gleicher_vorgang})=>{
      if (!belege_gleicher_vorgang||[abgabeort_neu,mitnahme_ort,tatsaechlicher_altort].includes('offen')) return {altort_passt_zum_auftrag:null,orte_identisch:null};
      return {altort_passt_zum_auftrag:mitnahme_ort===tatsaechlicher_altort,orte_identisch:abgabeort_neu===mitnahme_ort,
        hinweis:'Es werden nur bestätigte Ortsrollen verglichen. Kein Umstellungs-, Transport- oder Abholauftrag.'};
    },{abgabeort_neu:'neuer_haushalt',mitnahme_ort:'neuer_haushalt',tatsaechlicher_altort:'alter_haushalt',belege_gleicher_vorgang:true},
    {altort_passt_zum_auftrag:false,orte_identisch:true}),

  tool('altgeraete_wechsel_nutzungsluecke_tatsaechlich',
    'Nach der tatsächlichen Übergabe des Altgeräts die beobachtete Lücke bis zur ersten bestätigten Neunutzung nachvollziehen — Compute an observed service gap using the first usable replacement date rather than a delivery promise.',
    {
      alt_letzte_nutzung:date('Letzter Tag belegter Nutzung des Altgeräts.'),
      alt_abgegeben:date('Tatsächlich bestätigter Tag der Übergabe des Altgeräts.'),
      neu_geliefert:date('Tag der dokumentiert erfolgten Neulieferung.'),
      neu_erstmals_nutzbar:date('Erster Tag der bestätigten Nutzbarkeit des neuen Geräts für dieselbe Aufgabe.'),
    },({alt_letzte_nutzung,alt_abgegeben,neu_geliefert,neu_erstmals_nutzbar})=>{
      const [last,handover,delivery,use]=[alt_letzte_nutzung,alt_abgegeben,neu_geliefert,neu_erstmals_nutzbar].map(parseDate);
      if ((last!==null&&handover!==null&&last>handover)||(delivery!==null&&use!==null&&delivery>use)) throw new RangeError('Zeitfolge prüfen.');
      return {tage_alt_ausser_nutzung_vor_uebergabe:last!==null&&handover!==null?(handover-last)/dayMs:null,
        tage_nach_uebergabe_bis_nutzbarkeit:handover!==null&&use!==null?Math.max(0,(use-handover)/dayMs):null,
        tage_neugeraet_geliefert_aber_nicht_nutzbar:delivery!==null&&use!==null?(use-delivery)/dayMs:null,
        hinweis:'Abstände der belegten Kalendertage. Andere vorübergehende Geräte oder Tage ohne Bedarf sind darin nicht berücksichtigt.'};
    },{alt_letzte_nutzung:'2026-11-01',alt_abgegeben:'2026-11-03',neu_geliefert:'2026-11-03',neu_erstmals_nutzbar:'2026-11-05'},
    {tage_alt_ausser_nutzung_vor_uebergabe:2,tage_nach_uebergabe_bis_nutzbarkeit:2,tage_neugeraet_geliefert_aber_nicht_nutzbar:2}),

  tool('altgeraete_annahmestelle_betreiber_nachweis',
    'Eine kommunale Sammelstelle, eine bestätigte Händlerstelle und eine unklare Verweisung auseinanderhalten — Identify the documented return-point operator before treating locations as interchangeable.',
    {
      betreiber:pick('Wer betreibt den genauen genannten Annahmepunkt laut Primärquelle?','oeffentlich_rechtlicher_traeger','vertreiber_oder_bestaetigt_beauftragt','anderer','offen'),
      haendler_verweist_dorthin:yes('Nennt der Händler dieselbe Stelle als Rückgabehinweis?'),
      annahme_geraeteart_bestaetigt:yes('Die zuständige Stelle bestätigt die Annahme dieser Geräteart für diesen Vorgang?'),
    },({betreiber,haendler_verweist_dorthin,annahme_geraeteart_bestaetigt})=>{
      if (betreiber==='offen') return {annahmeweg:null,vorgangsbezug:'betreiber_offen'};
      const kommunal=betreiber==='oeffentlich_rechtlicher_traeger';
      return {annahmeweg:kommunal?'kommunale_sammlung':betreiber==='vertreiber_oder_bestaetigt_beauftragt'?'haendlerweg':'weiterer_weg',
        vorgangsbezug:!annahme_geraeteart_bestaetigt?'annahme_fuer_geraeteart_offen':kommunal&&haendler_verweist_dorthin?'kommunaler_hinweis_separat_vom_haendlerweg':'annahmehinweis_belegt',
        hinweis:'Kommunale Sammlung und Händler-Rücknahme getrennt dokumentieren. Der Hinweis eines Dritten belegt keine Annahme.',
        fundstelle:'ElektroG § 13 und § 17 Abs. 4'};
    },{betreiber:'oeffentlich_rechtlicher_traeger',haendler_verweist_dorthin:true,annahme_geraeteart_bestaetigt:true},
    {annahmeweg:'kommunale_sammlung',vorgangsbezug:'kommunaler_hinweis_separat_vom_haendlerweg'}),

  tool('altgeraete_trotz_gleicher_tour_zuordnung_zwei_auftraege',
    'Eine gemeinsame Zustelltour mit getrennten Aufträgen auf die eindeutige Zuordnung der Altgerätemitnahme prüfen — Ensure a shared delivery route does not merge unrelated pickup orders.',
    {
      gleiche_tour_bestaetigt:yes('Beide bestätigten Aufträge nutzen tatsächlich dieselbe Tour?'),
      neuer_auftrag_a:yes('Ist Neugeräteauftrag A konkret belegt?'),
      neuer_auftrag_b:yes('Ist der separate Neugeräteauftrag B konkret belegt?'),
      mitnahme_zuweisung:pick('Welcher Bestellvorgang nennt das hier betrachtete Altgerät ausdrücklich?','a','b','beide','keiner','offen'),
    },({gleiche_tour_bestaetigt,neuer_auftrag_a,neuer_auftrag_b,mitnahme_zuweisung})=>{
      if (!gleiche_tour_bestaetigt||!neuer_auftrag_a||!neuer_auftrag_b) return {status:'tour_oder_auftragsbezug_offen',gesicherter_auftrag:null};
      if (mitnahme_zuweisung==='a'||mitnahme_zuweisung==='b') return {status:'eindeutig_zugeordnet',gesicherter_auftrag:mitnahme_zuweisung};
      return {status:mitnahme_zuweisung==='beide'?'doppelte_zuordnung_klaeren':'keine_eindeutige_mitnahmezeile',gesicherter_auftrag:null,
        hinweis:'Für dasselbe Altgerät nur einen Auftrag bestätigen. Keine Änderung am Zustellplan.'};
    },{gleiche_tour_bestaetigt:true,neuer_auftrag_a:true,neuer_auftrag_b:true,mitnahme_zuweisung:'beide'},
    {status:'doppelte_zuordnung_klaeren',gesicherter_auftrag:null}),

  tool('altgeraete_zusteller_vertretung_fuer_alt_und_neu',
    'Eine abgestimmte Vertretung bei Lieferung auf die separat bestätigten Rollen für Neuannahme und Altübergabe prüfen — Keep replacement acceptance separate from the confirmed delegation of the old appliance.',
    {
      person_bestaetigt:yes('Die vertretende erwachsene Person hat die konkreten Aufgaben angenommen?'),
      neu_annahme_moeglich:pick('Status der Neugeräteannahme durch die Vertretung laut konkretem Anbieterbeleg.','bestaetigt','ausgeschlossen','offen'),
      alt_uebergabe_moeglich:pick('Status der Altgeräteübergabe durch dieselbe Vertretung.','bestaetigt','ausgeschlossen','offen'),
      selber_termin:yes('Gelten die Belege für denselben vereinbarten Termin?'),
    },({person_bestaetigt,neu_annahme_moeglich,alt_uebergabe_moeglich,selber_termin})=>{
      if (!person_bestaetigt||!selber_termin) return {beide_aufgaben_bestaetigt:null,offen:null};
      const roles=[['neuannahme',neu_annahme_moeglich],['altuebergabe',alt_uebergabe_moeglich]];
      return {beide_aufgaben_bestaetigt:roles.every(([,v])=>v==='bestaetigt'),offen:roles.filter(([,v])=>v==='offen').map(([k])=>k),
        ausgeschlossen:roles.filter(([,v])=>v==='ausgeschlossen').map(([k])=>k),
        hinweis:'Nur nachweislich bestätigte Rollen auswerten. Keine Vollmacht erzeugen oder persönliche Kontaktdaten erfassen.'};
    },{person_bestaetigt:true,neu_annahme_moeglich:'bestaetigt',alt_uebergabe_moeglich:'offen',selber_termin:true},
    {beide_aufgaben_bestaetigt:false,offen:['altuebergabe'],ausgeschlossen:[]}),

  tool('altgeraete_symbol_anlage_drei_weglese',
    'Eine beobachtete durchgestrichene Tonne vom Sammelstellen-Symbol unterscheiden — Tell a separate-collection mark from the marked route to a collection point.',
    {
      symbol:pick('Welches Zeichen wurde eindeutig beobachtet?','durchgestrichene_tonne','elektrogeraete_ruecknahmesymbol','beides','nicht_eindeutig'),
      ort:pick('Wo befand sich die dokumentierte Kennzeichnung?','am_geraet','am_regal','am_eingang_sammelstelle','in_bestellanzeige','offen'),
      beobachtung_bestaetigt:yes('Ort und Zeichen sind durch eine vollständige Beobachtung eindeutig belegt?'),
    },({symbol,ort,beobachtung_bestaetigt})=>{
      if (!beobachtung_bestaetigt||ort==='offen'||symbol==='nicht_eindeutig') return {getrennte_erfassung_erkennbar:null,hinweis_auf_ruecknahmestelle:null};
      return {getrennte_erfassung_erkennbar:symbol!=='elektrogeraete_ruecknahmesymbol',hinweis_auf_ruecknahmestelle:symbol!=='durchgestrichene_tonne'&&ort!=='am_geraet',
        fundstelle:'ElektroG § 18a und Anlagen 3 und 3a',
        hinweis:'Zeichen erklären allgemeine Wege. Sie bestätigen weder eine konkrete Annahme noch eine Abholung für diese Bestellung.'};
    },{symbol:'durchgestrichene_tonne',ort:'am_regal',beobachtung_bestaetigt:true},
    {getrennte_erfassung_erkennbar:true,hinweis_auf_ruecknahmestelle:false}),

  tool('altgeraete_annahme_und_weiterverwendung_beleg',
    'Altgeräteannahme und ausdrücklich dokumentierten weiteren Verbleib getrennt festhalten — Avoid inferring reuse or recycling from a handover receipt alone.',
    {
      altuebergabe_bestaetigt:yes('Tatsächliche Annahme des bezeichneten Altgeräts bestätigt?'),
      weiterer_beleg:pick('Späterer belegter Status für dasselbe Altgerät.','wiederverwendung_tatsaechlich','vorbereitung_zur_wiederverwendung','verwertung_tatsaechlich','nur_annahme','offen'),
      geraetebezug_eindeutig:yes('Weiterer Beleg und Übergabe gehören eindeutig zum gleichen Vorgang?'),
    },({altuebergabe_bestaetigt,weiterer_beleg,geraetebezug_eindeutig})=>{
      if (!altuebergabe_bestaetigt||!geraetebezug_eindeutig) return {verbleib:null};
      return {verbleib:weiterer_beleg==='nur_annahme'||weiterer_beleg==='offen'?null:weiterer_beleg,
        weiterverwendung_bestaetigt:weiterer_beleg==='wiederverwendung_tatsaechlich'?true:null,
        hinweis:'Annahme, Vorbereitungsstatus und tatsächlicher Verbleib sind verschiedene Belege. Aus bloßer Annahme keine Ergebnisquote ableiten.',
        fundstelle:statute+' Abs. 5'};
    },{altuebergabe_bestaetigt:true,weiterer_beleg:'vorbereitung_zur_wiederverwendung',geraetebezug_eindeutig:true},
    {verbleib:'vorbereitung_zur_wiederverwendung',weiterverwendung_bestaetigt:null}),

  tool('altgeraete_abholversuch_grund_und_erneute_zusage',
    'Nach einem erfolglosen Mitnahmeversuch einen schriftlichen Hinderungsgrund von einem belegten Folgetermin unterscheiden — Triage an unsuccessful pickup using the documented obstacle and latest reassignment.',
    {
      ergebnis:pick('Bestätigtes Ergebnis des ersten Termins.','nicht_mitgenommen','mitgenommen','offen'),
      grund:pick('Vom zuständigen Dienst dokumentierter Hinderungsgrund.','nicht_im_auftrag','abweichendes_geraet','zugang_offen','annahmebedingungen_klaeren','offen'),
      folgetermin_bestaetigt:yes('Ein neuer Termin für dasselbe Altgerät wurde ausdrücklich bestätigt?'),
      grund_aufgeloest:yes('Der Anbieter hat den dokumentierten Hinderungsgrund ausdrücklich als geklärt bestätigt?'),
    },({ergebnis,grund,folgetermin_bestaetigt,grund_aufgeloest})=>{
      if (ergebnis!=='nicht_mitgenommen') return {status:ergebnis==='offen'?'erstversuch_offen':'uebergabe_belegt',offener_punkt:null};
      const open=!grund_aufgeloest||grund==='offen';
      return {status:folgetermin_bestaetigt?(open?'neuer_termin_aber_hindernis_offen':'folgetermin_mit_geklaertem_grund'):'folgetermin_offen',
        offener_punkt:open?grund:null,
        hinweis:'Für Zugänglichkeit oder Zustand ausschließlich die zuständige Stelle fragen. Ein neuer Termin belegt keine erfolgreiche Annahme.'};
    },{ergebnis:'nicht_mitgenommen',grund:'nicht_im_auftrag',folgetermin_bestaetigt:true,grund_aufgeloest:false},
    {status:'neuer_termin_aber_hindernis_offen',offener_punkt:'nicht_im_auftrag'}),
];
