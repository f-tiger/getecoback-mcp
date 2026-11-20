const page = '/geraete-austausch-rechner.html';
const cutover = '2021-03-01';
const dayMs = 86400000;
const products = ['haushaltsgeschirrspueler','haushaltswaschmaschine','haushaltswaschtrockner'];
const references = {
  haushaltsgeschirrspueler:'VO (EU) 2019/2022, Anhang II Nr. 5',
  haushaltswaschmaschine:'VO (EU) 2019/2023, Anhang II Nr. 8',
  haushaltswaschtrockner:'VO (EU) 2019/2023, Anhang II Nr. 8',
};

const quant = (description, minimum=0, maximum=1000000) => ({type:'number',minimum,maximum,description});
const flag = description => ({type:'boolean',description});
const pick = (description,...values) => ({type:'string',enum:values,description});
const date = description => ({type:'string',description:description+' Datum YYYY-MM-DD, leer wenn unbekannt.'});
const device = () => pick('Bestätigte Haushaltsgeräteart nach Herstellerunterlagen.',...products);
const group = () => pick('Bereits anhand der zutreffenden Verordnung bestätigte Teilegruppe.','absatz_1_a','absatz_1_b','offen');
const round = value => Math.round(value*100)/100;

function parse(value) {
  if (value==='') return null;
  if (!/^(?:19|20|21)\d{2}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Datum von 1900 bis 2199 als YYYY-MM-DD eingeben.');
  const utc=Date.parse(value+'T00:00:00Z');
  if (!Number.isFinite(utc)||new Date(utc).toISOString().slice(0,10)!==value) throw new RangeError('Ungültiges Kalenderdatum.');
  return utc;
}
function yearMark(value, years) {
  const target=String(Number(value.slice(0,4))+years)+value.slice(4);
  return value.endsWith('-02-29')&&new Date(target+'T00:00:00Z').getUTCMonth()!==1?null:target;
}
function integer(...args) {
  if (!args.every(Number.isInteger)) throw new RangeError('Ganze Anzahlen erforderlich.');
}
function define(name,description,properties,calculate,args,expect) {
  return {name,description,page,properties,calculate,example:{args,expect}};
}

const partsA = {
  dish:['motor','umwaelz_oder_ablaufpumpe','heizelement_oder_waermepumpe','rohrleitung_und_zubehoer','tuer_innenstruktur','leiterplatte_oder_anzeige','druckschalter_thermostat_sensor','software_firmware_reset'],
  washer:['motor','motorkohlen','kraftuebertragung_motor_trommel','pumpe','stossdaempfer_oder_feder','trommel_lagerkreuz_kugellager','heizelement_oder_waermepumpe','rohrleitung_und_zubehoer','leiterplatte_oder_anzeige','druckschalter_thermostat_sensor','software_firmware_reset'],
};
const partsB = {
  dish:['tuerscharnier_oder_tuerdichtung','sonstige_dichtung','sprueharm','ablauffilter_spueler','geschirrkorb_oder_kunststoffzubehoer_spueler'],
  washer:['komplette_tuer','tuerscharnier_oder_tuerdichtung','sonstige_dichtung','tuerverriegelungsbaugruppe','kunststoffzubehoer_waesche'],
};
const parts = [...new Set([...Object.values(partsA).flat(),...Object.values(partsB).flat()]),'nicht_eindeutig'];

export const ersatzteilnachweis = [
  define('oekodesign_reparatur_geraeteart_anwendungsbeleg',
    'Geräteart, Ausnahme und dokumentiertes EU-Inverkehrbringen für die beiden genannten Verordnungen zusammen prüfen — Check the scope evidence for the two household appliance repair annexes.',
    {
      art:pick('Geräteart aus der Herstellererklärung. Konventioneller Trockner bedeutet Haushaltstrockner ohne Waschfunktion.',
        ...products,'separater_waeschetrockner','anderes','offen'),
      ausnahme:pick('Fällt das Gerät nach geprüfter Erklärung aus dem gewählten Anwendungsbereich, etwa gewerbliche Maschinenrichtlinie oder ausschließlich Akku mit optionalem separat erworbenem Netzgleichrichter?','keine_belegt','ausnahme_bestaetigt','offen'),
      eu_datum:date('Belegtes EU-Inverkehrbringen des betrachteten Geräts.'),
    },({art,ausnahme,eu_datum})=>{
      parse(eu_datum);
      const reference=Object.hasOwn(references,art)?references[art]:null;
      if (art==='offen') return {status:'geraeteart_offen',fundstelle:null};
      if (!reference||ausnahme==='ausnahme_bestaetigt') return {status:'anderer_anwendungsbereich',fundstelle:reference};
      if (!eu_datum||ausnahme==='offen') return {status:'geltung_offen',fundstelle:reference};
      return {status:eu_datum<cutover?'vor_anwendungsbeginn':'im_datums_und_geraeterahmen',fundstelle:reference,
        hinweis:'Der betrachtete Beginn für diese Ersatzteilanforderungen ist der 01.03.2021. Kaufdatum ist nicht EU-Inverkehrbringen.'};
    },{art:'haushaltswaschtrockner',ausnahme:'keine_belegt',eu_datum:'2023-06-05'},
    {status:'im_datums_und_geraeterahmen',fundstelle:'VO (EU) 2019/2023, Anhang II Nr. 8'}),

  define('oekodesign_teilgruppe_rollenweg_de',
    'Eine genaue Teileart dem vorgesehenen Endnutzer- oder Fachreparaturweg in Deutschland zuordnen — Distinguish annex-listed consumer and possibly registered-professional part routes.',
    {
      art:device(), teil:pick('Genaue belegte Teilart. Rohrleitungszubehör umfasst darin benannte Schläuche, Ventile, Filter und Aquastops.',...parts),
      rolle:pick('Rolle der anfragenden Partei.','endnutzer','fachreparatur_registriert','fachreparatur_registrierung_offen'),
      geltung_bestaetigt:flag('Konkrete Modellvariante und Geltung der angegebenen Verordnung bereits belegt?'),
    },({art,teil,rolle,geltung_bestaetigt})=>{
      const key=art===products[0]?'dish':'washer';
      const a=partsA[key].includes(teil), b=partsB[key].includes(teil);
      if (!geltung_bestaetigt||(!a&&!b)) return {status:'teil_oder_geltung_offen',absatz:null,weg:null};
      return {status:'teilgruppe_eingeordnet',absatz:a?'absatz_1_a':'absatz_1_b',
        weg:b?'endnutzer_und_fachreparatur':rolle==='fachreparatur_registriert'?'registrierter_fachkanal':'fachkanal_kann_registrierung_verlangen',
        fundstelle:references[art],hinweis:'Teilegruppe und Zugangsweg sind keine Aussage zu Lagerbestand, Preis oder Passung einer konkreten Nummer.'};
    },{art:'haushaltsgeschirrspueler',teil:'ablauffilter_spueler',rolle:'endnutzer',geltung_bestaetigt:true},
    {status:'teilgruppe_eingeordnet',absatz:'absatz_1_b',weg:'endnutzer_und_fachreparatur'}),

  define('oekodesign_letztmodell_mindestzeit_bezugstag',
    'Eine Fristuntergrenze aus dem belegten Inverkehrbringen des letzten Modellexemplars berechnen — Compute an informational minimum calendar marker from the last unit placed on the EU market.',
    {
      art:device(), gruppe:group(), letzter_eu_tag:date('Belegtes EU-Inverkehrbringen des letzten Exemplars genau dieses Modells.'),
      stichtag:date('Gewählter Tag für den reinen Kalendervergleich.'),
      geltung_bestaetigt:flag('Konkrete Teilegruppe, Modell und Geltung der Verordnung belegt?'),
    },({art,gruppe,letzter_eu_tag,stichtag,geltung_bestaetigt})=>{
      const last=parse(letzter_eu_tag); parse(stichtag);
      if (!geltung_bestaetigt||gruppe==='offen'||last===null||letzter_eu_tag<cutover) return {status:'bezug_offen',kalender_marke:null};
      const years=art===products[0]&&gruppe==='absatz_1_a'?7:10;
      const bound=yearMark(letzter_eu_tag,years);
      return {status:bound?'mindestzeit_berechnet':'schalttag_fristberechnung_pruefen',mindestjahre:years,kalender_marke:bound,
        stichtag_vor_marke:bound&&stichtag?stichtag<bound:null,fundstelle:references[art],
        hinweis:'Orientierende Jahresmarke, keine Beurteilung eines Rechtsanspruchs oder heutigen Vorrats. Kauf- und Produktionsdatum ersetzen den Marktbeleg nicht.'};
    },{art:'haushaltsgeschirrspueler',gruppe:'absatz_1_a',letzter_eu_tag:'2023-10-30',stichtag:'2029-01-01',geltung_bestaetigt:true},
    {status:'mindestzeit_berechnet',mindestjahre:7,kalender_marke:'2030-10-30',stichtag_vor_marke:true}),

  define('oekodesign_katalog_veroeffentlichung_erster_markttag',
    'Für eine belegte Teilegruppe den unterschiedlichen Zeitbezug der öffentlichen Liste vor dem Ende des Verfügbarkeitszeitraums ausweisen — Compute the publication reference from the first model unit rather than the last.',
    {
      art:device(), gruppe:group(), erster_eu_tag:date('Belegter Tag des EU-Inverkehrbringens des ersten Exemplars dieses Modells.'),
      stichtag:date('Gewählter Zeitpunkt, zu dem der öffentliche Nachweis gesucht wird.'),
      im_verfuegbarkeitszeitraum:flag('Belegter Geltungsbereich und nachweislich beobachteter Stichtag innerhalb des einschlägigen Zeitraums?'),
    },({art,gruppe,erster_eu_tag,stichtag,im_verfuegbarkeitszeitraum})=>{
      parse(erster_eu_tag); parse(stichtag);
      if (!im_verfuegbarkeitszeitraum||!erster_eu_tag||erster_eu_tag<cutover||gruppe==='offen') return {status:'zeitbezug_offen',publikationsmarke:null};
      const b=gruppe==='absatz_1_b';
      const mark=b?erster_eu_tag:yearMark(erster_eu_tag,2);
      return {status:mark?'kalenderbezug':'schalttag_fristberechnung_pruefen',publikationsmarke:mark,
        unterlagen:b?['teileliste','bestellweg','reparaturanleitungen']:['teileliste','bestellweg'],
        stichtag_ab_marke:mark&&stichtag?stichtag>=mark:null,fundstelle:references[art],
        hinweis:'Die Öffentlichkeit der Liste sagt nichts darüber, ob eine bestimmte Fachkomponente für Endnutzer bestellbar ist.'};
    },{art:'haushaltswaschmaschine',gruppe:'absatz_1_b',erster_eu_tag:'2022-03-15',stichtag:'2024-07-01',im_verfuegbarkeitszeitraum:true},
    {status:'kalenderbezug',publikationsmarke:'2022-03-15',stichtag_ab_marke:true,unterlagen:['teileliste','bestellweg','reparaturanleitungen']}),

  define('oekodesign_bestelleingang_lieferung_arbeitstage',
    'Für eine bestätigte Ersatzteilbestellung die beobachteten Arbeitstage nach Bestellungseingang dokumentieren — Count workdays from received order to documented delivery, excluding documented non-working days.',
    {
      art:device(), eingang:date('Belegter Eingang der Bestellung beim zuständigen Anbieter.'),
      geliefert:date('Belegte Lieferung des passenden Teils. Leer bei offener Lieferung.'),
      beobachtet_am:date('Belegter Stichtag bei noch offener Lieferung, sonst leer.'),
      ausnahmen_werktag:quant('Zusätzliche nicht zählende Tage Montag bis Freitag nach Eingang bis zum Endtag. Laut geprüftem Arbeitskalender, keine Wochenendtage.',0,400),
      kalender_mo_fr_belegt:flag('Gilt für diese Auswertung ein unabhängig geprüfter Montag-bis-Freitag-Kalender inklusive der eingegebenen Ausnahmen?'),
      teilezeitraum_und_rolle_bestaetigt:flag('Sind Teil, Zugangsweg und Bestellung innerhalb des einschlägigen Zeitraums bestätigt?'),
    },({art,eingang,geliefert,beobachtet_am,ausnahmen_werktag,kalender_mo_fr_belegt,teilezeitraum_und_rolle_bestaetigt})=>{
      const start=parse(eingang), delivered=parse(geliefert), observed=parse(beobachtet_am);
      integer(ausnahmen_werktag);
      if (delivered!==null&&observed!==null) throw new RangeError('Entweder Lieferung oder Beobachtungsstichtag angeben.');
      const end=delivered??observed;
      if (start===null||end===null||!kalender_mo_fr_belegt||!teilezeitraum_und_rolle_bestaetigt) return {status:'datum_kalender_oder_geltung_offen',beobachtete_arbeitstage:null};
      const days=(end-start)/dayMs;
      if (days<0||days>400) throw new RangeError('Bitte ein chronologisches Fenster von höchstens 400 Tagen eingeben.');
      const weekday=new Date(start).getUTCDay();
      let working=Math.floor(days/7)*5;
      for (let d=1;d<=days%7;d++) { const w=(weekday+d)%7; if (w>0&&w<6) working++; }
      if (ausnahmen_werktag>working) throw new RangeError('Mehr Ausnahmen als Werktage im eingegebenen Zeitraum.');
      const counted=working-ausnahmen_werktag;
      return {status:delivered!==null?'lieferung_belegt':'lieferung_weiterhin_offen',
        beobachtete_arbeitstage:counted,ueber_referenz_von_15_arbeitstagen:counted>15,
        fundstelle:references[art]+' (2)',
        hinweis:'Zählt ohne Eingangstag und einschließlich des belegten Endtags entsprechend dem eingegebenen Kalender. Reine Dokumentation, keine abschließende Fristprüfung.'};
    },{art:'haushaltsgeschirrspueler',eingang:'2026-11-02',geliefert:'2026-11-23',beobachtet_am:'',ausnahmen_werktag:0,kalender_mo_fr_belegt:true,teilezeitraum_und_rolle_bestaetigt:true},
    {status:'lieferung_belegt',beobachtete_arbeitstage:15,ueber_referenz_von_15_arbeitstagen:false}),

  define('oekodesign_fachzugang_registrierung_anfrage_stufen',
    'Bei Reparaturinformationen den dokumentierten Registrierungsantrag von einer späteren Einzelanfrage unterscheiden — Track the five-day registration and one-day information reference as distinct case stages.',
    {
      art:device(), registrierung:pick('Belegstatus der Registrierung für die zuständige Stelle.','nicht_beantragt','beantragt','angenommen','abgelehnt','offen'),
      registrierung_zeit_arbeitstage:quant('Belegt gezählte Arbeitstage seit Eingang des Registrierungsantrags bis Antwort oder Stichtag.',0,400),
      anfrage_gesendet:flag('Ist nach Registrierung eine eigenständige Informationsanfrage nachweislich eingegangen?'),
      info_zeit_arbeitstage:quant('Belegt gezählte Arbeitstage vom Eingang dieser Anfrage bis Antwort oder Stichtag.',0,400),
      zugang_zeitraum_bestaetigt:flag('Fachrolle, Geltung und Zeitfenster für diese Reparaturinformationen sind bereits belegt?'),
    },({art,registrierung,registrierung_zeit_arbeitstage,anfrage_gesendet,info_zeit_arbeitstage,zugang_zeitraum_bestaetigt})=>{
      integer(registrierung_zeit_arbeitstage,info_zeit_arbeitstage);
      if ((!anfrage_gesendet&&info_zeit_arbeitstage)||(anfrage_gesendet&&registrierung!=='angenommen')) throw new RangeError('Antrags- und Informationsphase getrennt dokumentieren.');
      if (!zugang_zeitraum_bestaetigt||registrierung==='offen') return {status:'evidenz_offen',registrierungsvergleich:null,infostufe:null};
      return {status:registrierung,registrierungsvergleich:registrierung==='nicht_beantragt'?null:registrierung_zeit_arbeitstage>5,
        infostufe:anfrage_gesendet?info_zeit_arbeitstage>1:null,
        fundstelle:references[art]+' (3)',
        hinweis:'Fünf Arbeitstage für die Entscheidung über die Registrierung, ein Arbeitstag für die angeforderten Informationen nach Registrierung. Keine Zugangszusage.'};
    },{art:'haushaltswaschmaschine',registrierung:'angenommen',registrierung_zeit_arbeitstage:4,anfrage_gesendet:true,info_zeit_arbeitstage:2,zugang_zeitraum_bestaetigt:true},
    {status:'angenommen',registrierungsvergleich:false,infostufe:true}),

  define('ersatzteil_marktbeleg_typenschild_kaufserie',
    'Eine Datumsangabe auf ihren Bezug zum letzten EU-Modellexemplar prüfen, bevor sie als Fristanker dient — Distinguish a documented last placing from purchase, production and discontinuation.',
    {
      datum:date('Datum laut vorliegendem Beleg.'),
      bezeichnet:pick('Welches Ereignis nennt die Quelle ausdrücklich?','letztes_eu_exemplar','letzte_produktion','kauf_des_eigenen_geraets','ankundigung_modellende','unklar'),
      modell_variante_eindeutig:flag('Betrifft der Beleg die eindeutige Modellkennung und die benötigte Variante?'),
      quelle_primar:flag('Stammt die Angabe von der zuständigen Marktbereitstellung oder einem darauf zurückverfolgten Primärbeleg?'),
    },({datum,bezeichnet,modell_variante_eindeutig,quelle_primar})=>{
      parse(datum);
      const confirmed=Boolean(datum&&bezeichnet==='letztes_eu_exemplar'&&modell_variante_eindeutig&&quelle_primar);
      return {als_letzter_markttag_verwendbar:confirmed,markttag:confirmed?datum:null,
        nachweis_luecken:[...(datum?[]:['datum']),...(bezeichnet==='letztes_eu_exemplar'?[]:['markt_die_letzte_einheit']),...(modell_variante_eindeutig?[]:['modellbezug']),...(quelle_primar?[]:['primaerbeleg'])]};
    },{datum:'2023-10-30',bezeichnet:'kauf_des_eigenen_geraets',modell_variante_eindeutig:true,quelle_primar:false},
    {als_letzter_markttag_verwendbar:false,markttag:null,nachweis_luecken:['markt_die_letzte_einheit','primaerbeleg']}),

  define('ersatzteil_losbereich_an_fertigungsgrenze',
    'Zwei belegte Teilenummern mit getrennten Losbereichen nach gemeinsamer Herstellerskala unterscheiden — Identify a documented part branch from the model lot marker without taking a full serial number.',
    {
      geraetelot:quant('Ganzzahliger Losindex aus der dokumentierten Herstellerskala, keine vollständige Seriennummer.'),
      a_von:quant('Erster einschließlicher Index, für den Teil A dokumentiert ist.'), a_bis:quant('Letzter einschließlicher Index für A.'),
      b_von:quant('Erster einschließlicher Index für Teil B.'), b_bis:quant('Letzter einschließlicher Index für B.'),
      modell_und_ordnung_belegt:flag('Sind Modell, beide Grenzen, Teilnummern und die einheitliche Reihenfolge der Losindizes belegt?'),
    },({geraetelot,a_von,a_bis,b_von,b_bis,modell_und_ordnung_belegt})=>{
      integer(geraetelot,a_von,a_bis,b_von,b_bis);
      if (a_von>a_bis||b_von>b_bis) throw new RangeError();
      if (!modell_und_ordnung_belegt) return {status:'modell_oder_index_offen',teilzweig:null};
      const a=geraetelot>=a_von&&geraetelot<=a_bis, b=geraetelot>=b_von&&geraetelot<=b_bis;
      return {status:a&&b?'doppelte_loszuordnung_pruefen':a||b?'loszweig_belegt':'los_nicht_abgedeckt',teilzweig:a!==b?(a?'A':'B'):null,
        hinweis:'Ausgewiesen wird ausschließlich die Zuordnung in eingegebenen Herstellergrenzen. Lieferstatus und Reparatur bleiben offen.'};
    },{geraetelot:201,a_von:100,a_bis:200,b_von:201,b_bis:350,modell_und_ordnung_belegt:true},
    {status:'loszweig_belegt',teilzweig:'B'}),

  define('ersatzteil_erweitertes_set_getrennte_positionen',
    'Bei gleicher Grundnummer prüfen, ob eine angebotene Ersatzteilrevision nur mit ausdrücklich mitgelieferten Zusatzteilen verwendbar belegt ist — Audit conditional manufacturer supersession instead of assuming identical function from a part number.',
    {
      direkte_nachfolge:pick('Hat die zuständige Stelle die neue Nummer als exakten Ersatz der alten dokumentiert?','uneingeschraenkt','nur_mit_set','nicht_bestaetigt'),
      set_komplett:pick('Sind alle ausdrücklich erforderlichen Set-Bestandteile im Angebot einzeln belegt?','ja','nein','offen'),
      gleiche_variante:flag('Betrifft die Herstellerzuordnung genau dieses Modell, seinen Typenstand und seinen Markt?'),
    },({direkte_nachfolge,set_komplett,gleiche_variante})=>{
      if (!gleiche_variante||direkte_nachfolge==='nicht_bestaetigt') return {status:'ersetzung_offen'};
      if (direkte_nachfolge==='uneingeschraenkt') return {status:'zuordnung_ausdruecklich_belegt'};
      return {status:set_komplett==='ja'?'zuordnung_nur_als_belegtes_set':set_komplett==='nein'?'angebotsset_unvollstaendig':'setumfang_offen',
        hinweis:'Eine einseitige Zuordnung rückwärts nicht übertragen. Keine Montage- oder Bezugszusage.'};
    },{direkte_nachfolge:'nur_mit_set',set_komplett:'offen',gleiche_variante:true},
    {status:'setumfang_offen'}),

  define('ersatzteil_angebotskanal_lagerstatus_timestamp',
    'Einen aktuellen belegten Lieferhinweis von datierten Katalog- und Marktplatzaussagen trennen — Check stale listing evidence without treating absent stock proof as out of stock.',
    {
      aktuell_am:date('Tag der Prüfung.'),
      status_am:date('Tag der Anbieterbestätigung für das exakte Teil.'),
      quelle:pick('Art der vorliegenden Aussage.','lagerbestaetigung','bestellbar_ohne_bestand','nur_katalog','nicht_lieferbar_bestaetigt','offen'),
      max_alter_tage:quant('Selbst gewähltes Höchstalter des Belegs als Plausibilitätsfilter.',0,365),
      teil_und_anbieter_geprueft:flag('Exakte Servicenummer einschließlich Variante sowie der tatsächliche Anbieter wurden abgeglichen?'),
    },({aktuell_am,status_am,quelle,max_alter_tage,teil_und_anbieter_geprueft})=>{
      const now=parse(aktuell_am), then=parse(status_am);
      integer(max_alter_tage);
      if (now===null||then===null||!teil_und_anbieter_geprueft) return {status:'nicht_belegbar',alter_tage:null};
      const age=(now-then)/dayMs;
      if (age<0) throw new RangeError();
      return {status:age>max_alter_tage?'erneut_pruefen':quelle,alter_tage:age,
        hinweis:'Der Nachweis stammt aus einem bestimmten Zeitpunkt. Selbst ein frischer Hinweis belegt keine Reservierung oder spätere Lieferung.'};
    },{aktuell_am:'2026-11-20',status_am:'2026-11-10',quelle:'lagerbestaetigung',max_alter_tage:3,teil_und_anbieter_geprueft:true},
    {status:'erneut_pruefen',alter_tage:10}),

  define('ersatzteil_lieferbeleg_teilung_teilpositionen',
    'Bei getrennten Lieferungen festhalten, welche ausdrücklich passenden Teilepositionen zum Stichtag tatsächlich vorlagen — Reconcile two chronological delivery batches against the set required for one confirmed repair.',
    {
      benoetigte_positionen:quant('Konkrete erforderliche und gleich gezählte Bestellpositionen.'),
      passend_erste:quant('Passende vollständige Positionen in der früheren Lieferung.'),
      passend_zweite:quant('Weitere passende Positionen in der späteren Lieferung, einschließlich etwaiger Wiederholung aus der ersten.'),
      auch_in_erster:quant('Übereinstimmende Positionen, in beiden Liefersätzen vollständig vorhanden.'),
      storno_ausdruecklich:quant('Weitere, bis zum Stichtag ausdrücklich stornierte erforderliche Positionen ohne passenden Empfang.'),
    },({benoetigte_positionen,passend_erste,passend_zweite,auch_in_erster,storno_ausdruecklich})=>{
      integer(benoetigte_positionen,passend_erste,passend_zweite,auch_in_erster,storno_ausdruecklich);
      const distinct=passend_erste+passend_zweite-auch_in_erster;
      if (auch_in_erster>Math.min(passend_erste,passend_zweite)||distinct+storno_ausdruecklich>benoetigte_positionen) throw new RangeError();
      return {bis_stichtag_komplett_geliefert:distinct,storniert_bestaetigt:storno_ausdruecklich,
        weiter_offen:benoetigte_positionen-distinct-storno_ausdruecklich,
        hinweis:'Positionen einmal zählen. Storno ist kein Erfüllungsnachweis für eine Reparatur.'};
    },{benoetigte_positionen:7,passend_erste:3,passend_zweite:3,auch_in_erster:2,storno_ausdruecklich:1},
    {bis_stichtag_komplett_geliefert:4,storniert_bestaetigt:1,weiter_offen:2}),

  define('reparaturangebot_diagnoseabrechnung_zwei_ausgaenge',
    'Ein Reparaturangebot mit unterschiedlich abgerechneter Diagnose bei Ausführung und bei Verzicht auseinanderrechnen — Compare explicitly quoted costs for proceeding versus stopping after diagnosis.',
    {
      diagnose_euro:quant('Angebotene Diagnosegebühr in Euro.'),
      reparatur_ohne_diagnose_euro:quant('Separater Preis der bestätigten Reparatur, ohne Diagnose gerechnet.'),
      diagnose_erlass_bei_auftrag_euro:quant('Bei Reparaturauftrag ausdrücklich gutgeschriebener Anteil der Diagnosegebühr.'),
      rueckgabe_ohne_reparatur_euro:quant('Zusätzlich bestätigte Rückgabekosten bei Verzicht auf Reparatur.'),
      vertragsumfang_belegt:flag('Beide Abläufe, Gesamtabgaben und die Zuordnung aller Beträge sind im Angebot nachvollziehbar?'),
    },({diagnose_euro,reparatur_ohne_diagnose_euro,diagnose_erlass_bei_auftrag_euro,rueckgabe_ohne_reparatur_euro,vertragsumfang_belegt})=>{
      if (diagnose_erlass_bei_auftrag_euro>diagnose_euro) throw new RangeError();
      if (!vertragsumfang_belegt) return {bei_reparatur_euro:null,bei_verzicht_euro:null};
      const repair=diagnose_euro-diagnose_erlass_bei_auftrag_euro+reparatur_ohne_diagnose_euro;
      const stop=diagnose_euro+rueckgabe_ohne_reparatur_euro;
      return {bei_reparatur_euro:round(repair),bei_verzicht_euro:round(stop),entscheidung_differenz_euro:round(repair-stop),
        hinweis:'Rechenhilfe für ausdrücklich bestätigte Beträge, keine Preis- oder Reparaturzusage.'};
    },{diagnose_euro:45,reparatur_ohne_diagnose_euro:125,diagnose_erlass_bei_auftrag_euro:30,rueckgabe_ohne_reparatur_euro:16,vertragsumfang_belegt:true},
    {bei_reparatur_euro:140,bei_verzicht_euro:61,entscheidung_differenz_euro:79}),

  define('reparaturangebot_annahme_material_fristkonflikt',
    'Prüfen, ob ein belegter Annahmetermin mit der separat zugesicherten Teilebindung zeitlich zusammenpasst — Detect when reservation expires before an offer can actually be accepted.',
    {
      angebot_bis:date('Letzter ausdrücklich bestätigter Annahmetag des schriftlichen Angebots.'),
      teil_reserviert_bis:date('Letzter ausdrücklich belegter Tag der separaten Teilreservierung.'),
      annahme_fruehestens:date('Tatsächlich frühester möglicher Annahmetag.'),
      gleicher_auftrag:flag('Betreffen Zusagen dasselbe konkrete Gerät, dieselbe Teileversion und denselben Anbieter?'),
    },({angebot_bis,teil_reserviert_bis,annahme_fruehestens,gleicher_auftrag})=>{
      const offer=parse(angebot_bis), part=parse(teil_reserviert_bis), start=parse(annahme_fruehestens);
      if ([offer,part,start].includes(null)||!gleicher_auftrag) return {status:'bezug_offen',gemeinsam_bis:null};
      const last=offer<=part?angebot_bis:teil_reserviert_bis;
      return {status:start<=Math.min(offer,part)?'zeitfenster_im_beleg':'kein_gemeinsames_annahmefenster',
        gemeinsam_bis:last,frueherer_ablauf:offer===part?'gleich':offer<part?'angebot':'reservierung',
        hinweis:'Inklusive der ausdrücklich bestätigten Tage, ohne Uhrzeiten. Ein Warenkorb ist keine belegte Reservierung.'};
    },{angebot_bis:'2026-11-24',teil_reserviert_bis:'2026-11-22',annahme_fruehestens:'2026-11-23',gleicher_auftrag:true},
    {status:'kein_gemeinsames_annahmefenster',gemeinsam_bis:'2026-11-22',frueherer_ablauf:'reservierung'}),

  define('ersatzteil_folgearbeit_angebot_evidenzmoment',
    'Im Ersatzteilangebot zwischen physischem Teil, notwendiger Herstellerfreigabe und bestätigter Folgearbeit unterscheiden — Screen whether a parts quote also covers every separately required service dependency.',
    {
      angebot_exaktes_teil:flag('Exakte für diese Variante bestätigte Teilenummer im Angebot?'),
      folgearbeit_noetig:pick('Anhand autorisierter Modellunterlagen: erfordert der Tausch separat angebotene Facharbeit zusätzlich zur Teilelieferung?','ja','nein','offen'),
      folgearbeit_im_angebot:pick('Hat die zuständige Werkstatt diese Nacharbeit im Angebot eindeutig berücksichtigt?','ja','nein','offen'),
      modellfreigabe_bestaetigt:flag('Herstellerunterlage und Fachangebot gelten für dasselbe Modell und denselben Stand?'),
    },({angebot_exaktes_teil,folgearbeit_noetig,folgearbeit_im_angebot,modellfreigabe_bestaetigt})=>{
      if (!angebot_exaktes_teil||!modellfreigabe_bestaetigt||folgearbeit_noetig==='offen') return {status:'umfang_offen'};
      return {status:folgearbeit_noetig==='nein'?'kein_separater_schritt_belegt':folgearbeit_im_angebot==='ja'?'folgearbeit_angeboten':folgearbeit_im_angebot==='nein'?'separates_fachangebot_fehlt':'angebotsumfang_klaeren',
        hinweis:'Das Angebot wird dokumentiert. Das Tool beschreibt keine Durchführung.'};
    },{angebot_exaktes_teil:true,folgearbeit_noetig:'ja',folgearbeit_im_angebot:'nein',modellfreigabe_bestaetigt:true},
    {status:'separates_fachangebot_fehlt'}),

  define('ersatzteil_verpackung_beleg_widerspruch_inhalt',
    'Bestellbestätigung, äußeres Etikett und vom Anbieter bestätigten Inhalt auf Abweichungen abgleichen — Hold a package identity mismatch instead of accepting an outer label as proof.',
    {
      bestaetigung_richtig:flag('Nennt die Bestellbestätigung die bestätigte benötigte Teilenummer und Variante?'),
      etikett:pick('Laut vorhandener Fotodokumentation nennt das äußere Etikett dieselbe Variante?','gleich','abweichend','nicht_lesbar'),
      inhalt:pick('Ist die exakte Nummer der tatsächlichen Ware unabhängig durch die zuständige Stelle bestätigt?','gleich','abweichend','unbestaetigt'),
    },({bestaetigung_richtig,etikett,inhalt})=>{
      if (!bestaetigung_richtig) return {status:'bestellbezug_klaeren'};
      return {status:inhalt==='abweichend'?'inhalt_abweichend':etikett==='abweichend'?'etikett_klaeren':inhalt==='gleich'?'belegte_nummer_stimmt':'inhalt_offen',
        hinweis:'Keine Anweisung, eine Verpackung zu öffnen, einen Teil einzubauen oder auf ein Rückgaberecht zu vertrauen.'};
    },{bestaetigung_richtig:true,etikett:'gleich',inhalt:'unbestaetigt'},
    {status:'inhalt_offen'}),

  define('ersatzteil_angebotsalternativen_gemeinsames_lager',
    'Zwei konkrete lieferbar ausgewiesene Angebote auf denselben bestätigten Erfüllungsweg prüfen — Distinguish two seller listings from independently supported fulfillment.',
    {
      a_bestandsaussage_bestaetigt:flag('Spezifisches Teil, Menge und Lagerangabe in Angebot A direkt bestätigt?'),
      b_bestandsaussage_bestaetigt:flag('Dasselbe für Angebot B?'),
      lagerbezug:pick('Wie hängen die tatsächlich zuständigen Lagereigentümer für A und B laut Beleg zusammen?','dasselbe_lager','verschiedene_lager','offen'),
    },({a_bestandsaussage_bestaetigt,b_bestandsaussage_bestaetigt,lagerbezug})=>{
      const confirmed=Number(a_bestandsaussage_bestaetigt)+Number(b_bestandsaussage_bestaetigt);
      return {angebote_mit_bestaetigtem_hinweis:confirmed,
        unabhaengige_lagerwege:confirmed<2?confirmed:lagerbezug==='offen'?null:lagerbezug==='dasselbe_lager'?1:2,
        hinweis:'Zählt belegte Lagerwege. Bestandsmeldung ist keine reservierte Menge oder Liefergarantie.'};
    },{a_bestandsaussage_bestaetigt:true,b_bestandsaussage_bestaetigt:true,lagerbezug:'dasselbe_lager'},
    {angebote_mit_bestaetigtem_hinweis:2,unabhaengige_lagerwege:1}),

  define('reparaturangebot_kostenband_deckel_nachtrag',
    'Angebotssumme, belegte Nachtragsgrenze und nicht begrenzte Zusatzposition als unterschiedliche Kostenevidenz erfassen — Bound documented repair expenditure only when every included extra is capped.',
    {
      basis_euro:quant('Fixer bestätigter Grundbetrag desselben Angebots.'),
      nachtrag_unten_euro:quant('Belegter minimaler Zusatz für eine bekannte Position.'),
      nachtrag_deckel_euro:quant('Belegter oberer Zusatzbetrag für dieselbe Position.'),
      weitere_offene_kosten:flag('Kann eine weitere notwendige Position ohne belegte Obergrenze hinzukommen?'),
      eigener_deckel_euro:quant('Eigene Obergrenze für dieses Angebot, ohne Aussage zu Rechten.'),
    },({basis_euro,nachtrag_unten_euro,nachtrag_deckel_euro,weitere_offene_kosten,eigener_deckel_euro})=>{
      if (nachtrag_unten_euro>nachtrag_deckel_euro) throw new RangeError();
      const low=basis_euro+nachtrag_unten_euro, high=basis_euro+nachtrag_deckel_euro;
      return {minimum_euro:round(low),obergrenze_euro:weitere_offene_kosten?null:round(high),
        status:low>eigener_deckel_euro+1e-9?'schon_minimum_ueber_budget':weitere_offene_kosten?'obergrenze_offen':high<=eigener_deckel_euro+1e-9?'rechnerisch_im_budget':'nur_ohne_vollen_nachtrag_im_budget',
        hinweis:'Nur belegte Angebotsbedingungen. Vor unerwarteten Kosten schützt eine Szenariorechnung allein nicht.'};
    },{basis_euro:80,nachtrag_unten_euro:10,nachtrag_deckel_euro:40,weitere_offene_kosten:false,eigener_deckel_euro:100},
    {minimum_euro:90,obergrenze_euro:120,status:'nur_ohne_vollen_nachtrag_im_budget'}),

  define('ersatzteil_softwarestand_angebot_abweichende_generation',
    'Ein dokumentiertes Software- oder Firmwareangebot nach Gerätestand und neuer Teileversion einordnen — Separate documented support for a variant from a generic software download.',
    {
      geraetevariante:pick('Bezug auf die reparaturbezogene exakte Gerätevariante laut Anbieter.','bestaetigt','abweichend','offen'),
      hardwareteil:pick('Bezug auf die tatsächlich angebotene Hardwarefassung.','bestaetigt','abweichend','offen'),
      offizieller_dienst:flag('Quelle wurde als zuständiger Hersteller- oder freigegebener Fachkanal nachgewiesen?'),
      angegebener_zugangsweg:pick('Ausdrücklich genannter Zugang.','fachkanal','oeffentlicher_download','offen'),
    },({geraetevariante,hardwareteil,offizieller_dienst,angegebener_zugangsweg})=>{
      if (geraetevariante==='abweichend'||hardwareteil==='abweichend') return {status:'abweichende_variante',zugang:null};
      if (!offizieller_dienst||geraetevariante==='offen'||hardwareteil==='offen') return {status:'zuordnung_offen',zugang:null};
      return {status:'modellbezug_belegt',zugang:angegebener_zugangsweg==='offen'?null:angegebener_zugangsweg,
        hinweis:'Prüft nur die Unterlagen. Keine Freigabe zum Herunterladen, Verändern oder Aufspielen.'};
    },{geraetevariante:'bestaetigt',hardwareteil:'offen',offizieller_dienst:true,angegebener_zugangsweg:'oeffentlicher_download'},
    {status:'zuordnung_offen',zugang:null}),

  define('ersatzteil_fachangebot_diagnose_gleichnamiger_fehler',
    'Ein zugeordnetes Ersatzteil vom Verkaufsvorschlag unterscheiden, wenn dieselbe Fehlermeldung mehrere Ursachen haben kann — Check whether the quoted part follows the confirmed diagnosis for this case.',
    {
      meldung_zum_modell:flag('Die Fehlermeldung wurde im genauen Modellkontext dokumentiert?'),
      fachdiagnose:pick('Befund zur Teileursache für genau dieses Gerät.','eindeutig_teil','mehrere_moeglich','keine','anderes_teil'),
      angebot_match:flag('Die Werkstatt ordnet dieselbe exakte Teilenummer dem bestätigten Befund ausdrücklich zu?'),
    },({meldung_zum_modell,fachdiagnose,angebot_match})=>{
      if (!meldung_zum_modell||fachdiagnose==='keine'||fachdiagnose==='mehrere_moeglich') return {diagnose_teilstatus:'ursache_offen'};
      return {diagnose_teilstatus:fachdiagnose==='anderes_teil'?'angebot_bezug_widerspricht':angebot_match?'diagnose_und_angebot_verbunden':'teilnummer_zur_diagnose_offen',
        hinweis:'Reparaturakte strukturieren. Das Tool liest weder Fehlercodes aus noch stellt es Diagnosen.'};
    },{meldung_zum_modell:true,fachdiagnose:'eindeutig_teil',angebot_match:false},
    {diagnose_teilstatus:'teilnummer_zur_diagnose_offen'}),

  define('ersatzteil_kaufpause_reparatur_nutzwerthorizont',
    'Ermitteln, ob die zugesagte Wartezeit das selbst gesetzte Zeitfenster für eine noch nutzbare Reparatur aufbraucht — Compare repair wait with a documented end-of-use date rather than assuming the device remains wanted.',
    {
      ab_heute_bedarf_tage:quant('Tage ab heute, bis dieser konkrete Haushalt das Gerät voraussichtlich ohnehin nicht mehr nutzt.',0,3650),
      einsetzbar_frueh_tage:quant('Belegter frühester bestätigter Tag bis Einsatzbereitschaft, in Tagen ab heute.',0,3650),
      einsetzbar_spaet_tage:quant('Spätester bereits begründeter Tag bis Einsatzbereitschaft, ab heute.',0,3650),
      zeitangaben_belegt:flag('Sind Laufzeit der Haushaltsaufgabe, Teilebezug und Werkstatttermin in diesem Zeitkorridor geklärt?'),
    },({ab_heute_bedarf_tage,einsetzbar_frueh_tage,einsetzbar_spaet_tage,zeitangaben_belegt})=>{
      if (einsetzbar_frueh_tage>einsetzbar_spaet_tage) throw new RangeError();
      if (!zeitangaben_belegt) return {restnutzungsfenster_tage:null};
      return {restnutzungsfenster_tage:[Math.max(0,ab_heute_bedarf_tage-einsetzbar_spaet_tage),Math.max(0,ab_heute_bedarf_tage-einsetzbar_frueh_tage)],
        selbst_im_fruehesten_fall_zu_spaet:einsetzbar_frueh_tage>=ab_heute_bedarf_tage,
        hinweis:'Nur dokumentierte Plandaten. Reparaturerfolg, tatsächliche künftige Nutzung und Gerätelebensdauer sind darin nicht enthalten.'};
    },{ab_heute_bedarf_tage:25,einsetzbar_frueh_tage:12,einsetzbar_spaet_tage:28,zeitangaben_belegt:true},
    {restnutzungsfenster_tage:[0,13],selbst_im_fruehesten_fall_zu_spaet:false}),
];
