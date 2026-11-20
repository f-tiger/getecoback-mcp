const tariff = '/stromtarif-werkstatt.html';
const meter = '/strommess-protokoll.html';
const budget = '/guide/stromkosten-rechner.html';
const shower = '/guide/duschen-kosten-rechner.html';
const heat = '/guide/heizkosten-vergleich-rechner.html';
const savings = '/guide/strom-sparen-haushalt.html';

const number = (description, minimum = 0, maximum = 1000000) => ({type:'number', description, minimum, maximum});
const cents = (description, minimum = 0) => number(description, minimum, 100000000);
const boolean = description => ({type:'boolean', description});
const select = (description, ...values) => ({type:'string', description, enum:values});
const days = (description, minimum = 0) => number(description, minimum, 3660);
const round = value => Math.round(value*1000)/1000;
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Tage, Stückzahlen oder Centbeträge erforderlich.');
}

export const haushaltsbuch = [
  {
    name:'stromrechnung_messfenster_randtage',
    description:'Rechnungszeitraum aus einer längeren Messperiode anhand separat gemessener Randtage abgleichen — Match a bill window using measured leading and trailing periods.',
    page:meter,
    properties:{
      gesamt_tage:days('Tage im tatsächlich gemessenen Gesamtfenster.',1),
      abrechnung_tage:days('Tage auf der Rechnung.',1),
      vorlauf_tage:days('Gemessene Tage vor Beginn der Rechnung.'),
      nachlauf_tage:days('Gemessene Tage nach Ende der Rechnung.'),
      gesamt_kwh:number('Gemessene kWh im Gesamtfenster.'),
      vorlauf_kwh:number('Gemessene kWh vor Beginn der Rechnung.'),
      nachlauf_kwh:number('Gemessene kWh nach Ende der Rechnung.'),
      rechnung_kwh:number('Verbrauch laut Rechnung in kWh.'),
    },
    calculate({gesamt_tage,abrechnung_tage,vorlauf_tage,nachlauf_tage,gesamt_kwh,vorlauf_kwh,nachlauf_kwh,rechnung_kwh}) {
      whole(gesamt_tage,abrechnung_tage,vorlauf_tage,nachlauf_tage);
      if ((!vorlauf_tage&&vorlauf_kwh)||(!nachlauf_tage&&nachlauf_kwh)) throw new RangeError('Ohne Randtage gibt es keinen Randverbrauch.');
      if (vorlauf_kwh+nachlauf_kwh>gesamt_kwh+1e-9) throw new RangeError('Randverbrauch übersteigt Gesamtmessung.');
      if (abrechnung_tage+vorlauf_tage+nachlauf_tage!==gesamt_tage) return {status:'zeitfenster_offen',vergleich_kwh:null};
      const passend=gesamt_kwh-vorlauf_kwh-nachlauf_kwh;
      return {status:'randverbrauch_abgezogen',vergleich_kwh:round(passend),rechnung_minus_messung_kwh:round(rechnung_kwh-passend),
        hinweis:'Nur bei exakt passenden Stichtagen und gemeinsamem Zähler verwenden.'};
    },
    example:{args:{gesamt_tage:40,abrechnung_tage:30,vorlauf_tage:4,nachlauf_tage:6,gesamt_kwh:240,vorlauf_kwh:24,nachlauf_kwh:36,rechnung_kwh:183},expect:{vergleich_kwh:180,rechnung_minus_messung_kwh:3}},
  },
  {
    name:'stromexport_ueberlappung_entscheiden',
    description:'Zwei Energieexporte desselben Zählers nur bei abgestimmter Überlappungsmenge zusammenführen — Join two exports only when their measured overlap agrees.',
    page:meter,
    properties:{
      export_a_kwh:number('Gesamte kWh im ersten Export.'), export_b_kwh:number('Gesamte kWh im zweiten Export.'),
      schnitt_a_kwh:number('kWh derselben Überlappung laut erstem Export.'),
      schnitt_b_kwh:number('kWh derselben Überlappung laut zweitem Export.'),
      toleranz_kwh:number('Selbst gewählte maximale Differenz für diese Überlappung.',0,50),
      intervall_identisch:boolean('Passen Zähler, Start und Ende des verglichenen Überlappungsfensters?'),
    },
    calculate({export_a_kwh,export_b_kwh,schnitt_a_kwh,schnitt_b_kwh,toleranz_kwh,intervall_identisch}) {
      if (schnitt_a_kwh>export_a_kwh||schnitt_b_kwh>export_b_kwh) throw new RangeError('Überlappung übersteigt Export.');
      const differenz=Math.abs(schnitt_a_kwh-schnitt_b_kwh);
      if (!intervall_identisch||differenz>toleranz_kwh+1e-9) return {status:'ueberlappung_pruefen',vereinigt_kwh:null};
      return {status:'mit_ueberlappungsspanne',min_kwh:round(export_a_kwh+export_b_kwh-Math.max(schnitt_a_kwh,schnitt_b_kwh)),
        max_kwh:round(export_a_kwh+export_b_kwh-Math.min(schnitt_a_kwh,schnitt_b_kwh))};
    },
    example:{args:{export_a_kwh:21,export_b_kwh:22,schnitt_a_kwh:8,schnitt_b_kwh:9,toleranz_kwh:1,intervall_identisch:true},expect:{min_kwh:34,max_kwh:35}},
  },
  {
    name:'haushaltsstrom_abwesenheit_normalisieren',
    description:'Grundlast abziehen und Mehrverbrauch pro Anwesenheitstag zweier Wohnphasen vergleichen — Separate a measured background load from occupancy-day energy.',
    page:savings,
    properties:{
      a_tage:days('Kalendertage in der ersten Phase.',1), b_tage:days('Kalendertage in der zweiten Phase.',1),
      a_anwesend:days('Anwesenheitstage in der ersten Phase.'), b_anwesend:days('Anwesenheitstage in der zweiten Phase.'),
      a_kwh:number('Gemessene kWh in der ersten Phase.'), b_kwh:number('Gemessene kWh in der zweiten Phase.'),
      abwesenheit_kwh_tag:number('Gemessene Grundlast pro Abwesenheitstag als eigene Annahme für beide Phasen.',0,100),
    },
    calculate({a_tage,b_tage,a_anwesend,b_anwesend,a_kwh,b_kwh,abwesenheit_kwh_tag}) {
      whole(a_tage,b_tage,a_anwesend,b_anwesend);
      if (a_anwesend>a_tage||b_anwesend>b_tage) throw new RangeError('Anwesenheitstage übersteigen Zeitraum.');
      const a=a_kwh-a_tage*abwesenheit_kwh_tag;
      const b=b_kwh-b_tage*abwesenheit_kwh_tag;
      if (!a_anwesend||!b_anwesend||a< -1e-9||b< -1e-9) return {status:'annahme_oder_anwesenheit_pruefen',differenz_kwh_anwesenheitstag:null};
      return {a_kwh_anwesenheitstag:round(a/a_anwesend),b_kwh_anwesenheitstag:round(b/b_anwesend),
        differenz_kwh_anwesenheitstag:round(b/b_anwesend-a/a_anwesend),hinweis:'Szenario mit gleicher täglicher Grundlast und ohne Ursachenzuordnung.'};
    },
    example:{args:{a_tage:30,b_tage:30,a_anwesend:10,b_anwesend:20,a_kwh:40,b_kwh:75,abwesenheit_kwh_tag:1},expect:{a_kwh_anwesenheitstag:1,b_kwh_anwesenheitstag:2.25,differenz_kwh_anwesenheitstag:1.25}},
  },
  {
    name:'energierechnung_ersatzbeleg_verbuchen',
    description:'In der privaten Übersicht zwischen Ersatzrechnung und Zusatzbelastung unterscheiden — Apply an explicitly linked replacement or additional bill.',
    page:tariff,
    properties:{
      alt_cent:cents('Ursprünglich erfasste Forderung in Cent.'),
      neu_cent:cents('Betrag auf dem neu eingegangenen Beleg in Cent.',-100000000),
      bezahlt_cent:cents('Bereits bestätigte Zahlungen abzüglich Rückzahlungen in Cent.',-100000000),
      kennzeichnung:select('Wie bezeichnet der Beleg die Beziehung zur ursprünglichen Rechnung?','ersetzt','aenderung_zum_altbetrag','unbekannt'),
    },
    calculate({alt_cent,neu_cent,bezahlt_cent,kennzeichnung}) {
      whole(alt_cent,neu_cent,bezahlt_cent);
      if (kennzeichnung==='unbekannt') return {status:'belegbezug_offen',offen_cent:null};
      const wirksam=kennzeichnung==='ersetzt'?neu_cent:alt_cent+neu_cent;
      return {status:kennzeichnung,wirksam_cent:wirksam,offen_cent:wirksam-bezahlt_cent,
        aenderung_buchbestand_cent:wirksam-alt_cent,hinweis:'Ein negativer Saldo ist ein rechnerischer Überschuss in deinem Buch.'};
    },
    example:{args:{alt_cent:18000,neu_cent:16500,bezahlt_cent:17000,kennzeichnung:'ersetzt'},expect:{wirksam_cent:16500,offen_cent:-500,aenderung_buchbestand_cent:-1500}},
  },
  {
    name:'stromkosten_umzug_uebergabetag',
    description:'Eigene Stromkosten um einen Umzug mit gemessenem Übergabetag und offener Zuordnung aufteilen — Isolate the handover day between two household budget periods.',
    page:meter,
    properties:{
      vor_kwh:number('Gemessene kWh vor dem Übergabetag.'),
      tag_kwh:number('Separat gemessene kWh des Übergabetags.'),
      nach_kwh:number('Gemessene kWh nach dem Übergabetag.'),
      preis_cent_kwh:number('Über das betrachtete Fenster gleicher Arbeitspreis in Cent/kWh.',0,1000),
      uebergabe:select('Zuordnung des Übergabetags im eigenen Haushaltsbuch.','vorher','nachher','offen'),
    },
    calculate({vor_kwh,tag_kwh,nach_kwh,preis_cent_kwh,uebergabe}) {
      return {vorher_euro:round((vor_kwh+(uebergabe==='vorher'?tag_kwh:0))*preis_cent_kwh/100),
        nachher_euro:round((nach_kwh+(uebergabe==='nachher'?tag_kwh:0))*preis_cent_kwh/100),
        unzugeordnet_euro:round((uebergabe==='offen'?tag_kwh:0)*preis_cent_kwh/100),
        hinweis:'Verglichen werden ausschließlich variable Kosten im eigenen Haushaltsbuch.'};
    },
    example:{args:{vor_kwh:80,tag_kwh:10,nach_kwh:90,preis_cent_kwh:30,uebergabe:'offen'},expect:{vorher_euro:24,nachher_euro:27,unzugeordnet_euro:3}},
  },
  {
    name:'wasser_entgelt_basis_zeilen',
    description:'Trinkwasser- und Abwasserabrechnung gegen die jeweils ausgewiesene Volumenbasis prüfen — Reconcile separately priced water and wastewater quantity lines.',
    page:shower,
    properties:{
      wasser_m3:number('Abgerechnete Trinkwassermenge in m³.'),
      abwasser_m3:number('Abgerechnete Abwassermenge in m³.'),
      wasser_euro_m3:number('Preis der Trinkwasserzeile in Euro pro m³.',0,100),
      abwasser_euro_m3:number('Preis der Abwasserzeile in Euro pro m³.',0,100),
      beide_zeilen_euro:number('Summe beider mengenabhängigen Zeilen laut Beleg in Euro.'),
    },
    calculate({wasser_m3,abwasser_m3,wasser_euro_m3,abwasser_euro_m3,beide_zeilen_euro}) {
      const berechnet=wasser_m3*wasser_euro_m3+abwasser_m3*abwasser_euro_m3;
      return {berechnet_euro:round(berechnet),beleg_minus_rechnung_euro:round(beide_zeilen_euro-berechnet),
        effektiver_euro_pro_trinkwasser_m3:wasser_m3?round(berechnet/wasser_m3):null,
        mengenbasis_differenz_m3:round(wasser_m3-abwasser_m3),hinweis:'Mengenabhängige Zeilen ohne Grundgebühren und ohne Annahme gleicher Volumenbasis.'};
    },
    example:{args:{wasser_m3:10,abwasser_m3:8,wasser_euro_m3:2,abwasser_euro_m3:3,beide_zeilen_euro:44},expect:{berechnet_euro:44,beleg_minus_rechnung_euro:0,effektiver_euro_pro_trinkwasser_m3:4.4}},
  },
  {
    name:'haushaltsbuch_buendel_restkosten',
    description:'Paketabrechnung mit bestätigten Nicht-Energieposten und unzugeordneten Restbeträgen trennen — Isolate household utility costs in a mixed bill.',
    page:budget,
    properties:{
      gesamt_cent:cents('Endbetrag der Paketabrechnung einschließlich bestätigter Gutschriften.',-100000000),
      nicht_energie_cent:cents('Summe eindeutig anderer Posten nach ihren eigenen Gutschriften.',-100000000),
      bekannte_energie_cent:cents('Summe eindeutig zugeordneter Energieposten nach ihren eigenen Gutschriften.',-100000000),
      rest_nur_energie:boolean('Ist durch den Beleg bestätigt, dass der gesamte Rest zu Energieposten gehört?'),
    },
    calculate({gesamt_cent,nicht_energie_cent,bekannte_energie_cent,rest_nur_energie}) {
      whole(gesamt_cent,nicht_energie_cent,bekannte_energie_cent);
      const rest=gesamt_cent-nicht_energie_cent-bekannte_energie_cent;
      return {bestaetigte_energie_cent:bekannte_energie_cent,energie_gesamt_cent:rest_nur_energie?bekannte_energie_cent+rest:null,
        rest_eindeutig_energie_cent:rest_nur_energie?rest:null,unzugeordnet_cent:rest_nur_energie?0:rest};
    },
    example:{args:{gesamt_cent:12000,nicht_energie_cent:4000,bekannte_energie_cent:5000,rest_nur_energie:false},expect:{bestaetigte_energie_cent:5000,energie_gesamt_cent:null,unzugeordnet_cent:3000}},
  },
  {
    name:'energiekosten_auszug_beleg_meter_dreieck',
    description:'Eine bestätigte Belegsumme für denselben Zeitraum unabhängig gegen Zahlungsjournal und Zähler abgleichen — Locate money or quantity discrepancies without blending the two checks.',
    page:tariff,
    properties:{
      belegt_cent:cents('Belegsaldo für genau diese Rechnung in Cent.',-100000000),
      bezahlt_cent:cents('Bestätigter Netto-Zahlungsbetrag für genau diese Rechnung in Cent.',-100000000),
      belegt_kwh:number('Abgerechnete kWh laut Beleg.'), gemessen_kwh:number('Selbst gemessene kWh im passenden Fenster.'),
      geld_toleranz_cent:cents('Eigene Toleranz für die Geldprüfung in Cent.'),
      menge_toleranz_kwh:number('Eigene Ablesetoleranz in kWh.',0,500),
      fenster_bestaetigt:boolean('Messfenster, Zähler und Belegzuordnung sind geprüft?'),
    },
    calculate({belegt_cent,bezahlt_cent,belegt_kwh,gemessen_kwh,geld_toleranz_cent,menge_toleranz_kwh,fenster_bestaetigt}) {
      whole(belegt_cent,bezahlt_cent,geld_toleranz_cent);
      const geld=belegt_cent-bezahlt_cent;
      const menge=belegt_kwh-gemessen_kwh;
      return {zahlung_differenz_cent:geld,zaehler_differenz_kwh:fenster_bestaetigt?round(menge):null,
        zahlungen_pruefen:Math.abs(geld)>geld_toleranz_cent,
        menge_pruefen:fenster_bestaetigt?Math.abs(menge)>menge_toleranz_kwh+1e-9:null,fester_bezug:fenster_bestaetigt};
    },
    example:{args:{belegt_cent:9000,bezahlt_cent:9000,belegt_kwh:300,gemessen_kwh:290,geld_toleranz_cent:2,menge_toleranz_kwh:5,fenster_bestaetigt:true},expect:{zahlungen_pruefen:false,menge_pruefen:true,zaehler_differenz_kwh:10}},
  },
  {
    name:'energie_nachbuchung_periodenansicht',
    description:'Eine verspätet gezahlte Rechnung nach Verbrauchsmonat und Zahlungsmonat getrennt verfolgen — Separate service-period corrections from cash-period outflows.',
    page:budget,
    properties:{
      alter_monat_cent:cents('Bisher erfasste Kosten des Leistungsmonats in Cent.',-100000000),
      zahlungsmonat_cent:cents('Bisher erfasste Ausgaben des Zahlungsmonats in Cent.',-100000000),
      nachbuchung_cent:cents('Tatsächlich gebuchte Nachzahlung oder Erstattung in Cent.',-100000000),
      bereits_erfasst_cent:cents('Darin enthaltener schon im Leistungsmonat erfasster Betrag in Cent.',-100000000),
    },
    calculate({alter_monat_cent,zahlungsmonat_cent,nachbuchung_cent,bereits_erfasst_cent}) {
      whole(alter_monat_cent,zahlungsmonat_cent,nachbuchung_cent,bereits_erfasst_cent);
      return {leistung_neu_cent:alter_monat_cent+nachbuchung_cent-bereits_erfasst_cent,
        zahlungsmonat_neu_cent:zahlungsmonat_cent+nachbuchung_cent,leistungsmonat_korrektur_cent:nachbuchung_cent-bereits_erfasst_cent};
    },
    example:{args:{alter_monat_cent:6000,zahlungsmonat_cent:8500,nachbuchung_cent:2300,bereits_erfasst_cent:2000},expect:{leistung_neu_cent:6300,zahlungsmonat_neu_cent:10800,leistungsmonat_korrektur_cent:300}},
  },
  {
    name:'haushaltsenergie_auslage_ausgleichen',
    description:'Gemeinsame Energierechnung zwischen zwei Personen nach bereits geleisteten Auslagen und Rückzahlungen ausgleichen — Settle a shared utility bill after prior reimbursements.',
    page:budget,
    properties:{
      vorgestreckt_a_cent:cents('Direkt an den Anbieter gezahlte Auslage von A in Cent.'),
      vorgestreckt_b_cent:cents('Direkt an den Anbieter gezahlte Auslage von B in Cent.'),
      vereinbarter_anteil_a_cent:cents('Frei vereinbarter finaler Kostenanteil von A in Cent.'),
      netto_b_an_a_cent:cents('Frühere Erstattungen von B an A abzüglich solcher in Gegenrichtung in Cent.',-100000000),
    },
    calculate({vorgestreckt_a_cent,vorgestreckt_b_cent,vereinbarter_anteil_a_cent,netto_b_an_a_cent}) {
      whole(vorgestreckt_a_cent,vorgestreckt_b_cent,vereinbarter_anteil_a_cent,netto_b_an_a_cent);
      const gesamt=vorgestreckt_a_cent+vorgestreckt_b_cent;
      if (vereinbarter_anteil_a_cent>gesamt) throw new RangeError('Anteil übersteigt Gesamtauslage.');
      const offen=vorgestreckt_a_cent-netto_b_an_a_cent-vereinbarter_anteil_a_cent;
      return {b_an_a_cent:Math.max(0,offen),a_an_b_cent:Math.max(0,-offen),b_kostenanteil_cent:gesamt-vereinbarter_anteil_a_cent};
    },
    example:{args:{vorgestreckt_a_cent:6500,vorgestreckt_b_cent:3500,vereinbarter_anteil_a_cent:5000,netto_b_an_a_cent:2000},expect:{a_an_b_cent:500,b_an_a_cent:0,b_kostenanteil_cent:5000}},
  },
  {
    name:'gemeinsame_energiekosten_cent_rest',
    description:'Einen vereinbarten Rechnungsbetrag mit drei ganzzahligen Gewichten centgenau verteilen — Allocate all cents using a largest-remainder split with a declared tie-break.',
    page:budget,
    properties:{
      kosten_cent:cents('Zu verteilende nichtnegative Kosten in ganzen Cent.'),
      gewicht_a:number('Ganzzahliges vereinbartes Gewicht von A.',0,1000),
      gewicht_b:number('Ganzzahliges vereinbartes Gewicht von B.',0,1000),
      gewicht_c:number('Ganzzahliges vereinbartes Gewicht von C.',0,1000),
    },
    calculate({kosten_cent,gewicht_a,gewicht_b,gewicht_c}) {
      whole(kosten_cent,gewicht_a,gewicht_b,gewicht_c);
      const weights=[gewicht_a,gewicht_b,gewicht_c];
      const total=gewicht_a+gewicht_b+gewicht_c;
      if (!total) throw new RangeError('Mindestens ein Gewicht muss positiv sein.');
      const portions=weights.map(weight=>Math.floor(kosten_cent*weight/total));
      const rank=weights.map((weight,index)=>({index,remainder:kosten_cent*weight%total}));
      rank.sort((a,b)=>b.remainder-a.remainder||a.index-b.index);
      const remaining=kosten_cent-portions.reduce((sum,portion)=>sum+portion,0);
      for (const {index} of rank.slice(0,remaining)) portions[index]++;
      return {a_cent:portions[0],b_cent:portions[1],c_cent:portions[2],rest_vergeben_cent:remaining,
        hinweis:'Größte Bruchteile zuerst. Bei Gleichstand gilt die Reihenfolge A, B, C.'};
    },
    example:{args:{kosten_cent:100,gewicht_a:1,gewicht_b:1,gewicht_c:1},expect:{a_cent:34,b_cent:33,c_cent:33,rest_vergeben_cent:1}},
  },
  {
    name:'energiegutschrift_vortrag_abgleichen',
    description:'Vorgetragenes Guthaben über zwei Anbieterbelege bis zur Verrechnung oder Auszahlung verfolgen — Reconcile a carried credit with use, refund and the next opening balance.',
    page:tariff,
    properties:{
      anfang_cent:cents('Bestätigtes Guthaben zu Beginn in Cent.'), neu_cent:cents('In der Periode neu gewährtes Guthaben in Cent.'),
      verrechnet_cent:cents('Tatsächlich mit einer Forderung verrechnetes Guthaben in Cent.'),
      ausgezahlt_cent:cents('Tatsächlich ausgezahltes Guthaben in Cent.'),
      folgt_cent:cents('Im Folgebeleg angegebener Guthabenvortrag in Cent.'),
    },
    calculate({anfang_cent,neu_cent,verrechnet_cent,ausgezahlt_cent,folgt_cent}) {
      whole(anfang_cent,neu_cent,verrechnet_cent,ausgezahlt_cent,folgt_cent);
      const ende=anfang_cent+neu_cent-verrechnet_cent-ausgezahlt_cent;
      return {erwartet_cent:ende,folgebeleg_minus_erwartet_cent:folgt_cent-ende,
        status:ende<0?'guthaben_ueberzogen':folgt_cent===ende?'vortrag_stimmt':'guthabenbelege_pruefen'};
    },
    example:{args:{anfang_cent:4000,neu_cent:1200,verrechnet_cent:3200,ausgezahlt_cent:1000,folgt_cent:800},expect:{erwartet_cent:1000,folgebeleg_minus_erwartet_cent:-200,status:'guthabenbelege_pruefen'}},
  },
  {
    name:'stromjournal_zahlungszustaende',
    description:'Gebuchte, vorgemerkte und stornierte Stromzahlungen im Monatsjournal getrennt ausweisen — Reconcile cash actually settled against a payment feed with pending and reversed entries.',
    page:tariff,
    properties:{
      lastschriften_cent:cents('Summe tatsächlich gebuchter Abbuchungen in Cent.'),
      rueckbuchungen_cent:cents('Summe tatsächlich gebuchter Rückzahlungen in Cent.'),
      vorgemerkt_cent:cents('Summe noch offener Abbuchungsvormerkungen in Cent.'),
      aufgehoben_cent:cents('Teil der Vormerkungen, der bereits als aufgehoben bestätigt ist, in Cent.'),
    },
    calculate({lastschriften_cent,rueckbuchungen_cent,vorgemerkt_cent,aufgehoben_cent}) {
      whole(lastschriften_cent,rueckbuchungen_cent,vorgemerkt_cent,aufgehoben_cent);
      if (aufgehoben_cent>vorgemerkt_cent) throw new RangeError('Aufgehoben übersteigt gemeldete Vormerkungen.');
      const bestaetigt=lastschriften_cent-rueckbuchungen_cent;
      const offen=vorgemerkt_cent-aufgehoben_cent;
      return {bestaetigt_netto_cent:bestaetigt,vormerkungen_offen_cent:offen,
        wenn_alle_offenen_abgehen_cent:bestaetigt+offen,hinweis:'Bereits gebuchte Abbuchungen aus den Vormerkungen vor Eingabe entfernen.'};
    },
    example:{args:{lastschriften_cent:7000,rueckbuchungen_cent:3500,vorgemerkt_cent:5000,aufgehoben_cent:1000},expect:{bestaetigt_netto_cent:3500,vormerkungen_offen_cent:4000,wenn_alle_offenen_abgehen_cent:7500}},
  },
  {
    name:'stromjournal_mehrfachzahlung_kandidat',
    description:'Zwei gleich hohe Zahlungszeilen im privaten Haushaltsbuch nach Belegbezug und Datumsabstand einordnen — Flag a possible duplicate payment without deleting entries.',
    page:tariff,
    properties:{
      a_cent:cents('Erste gespeicherte Abbuchung in Cent.',1),
      b_cent:cents('Zweite gespeicherte Abbuchung in Cent.',1),
      abstand_tage:days('Absoluter Abstand der Buchungsdaten in Tagen.'),
      suchradius_tage:days('Selbst gewählte maximale Zahl an Tagen für den Suchhinweis.'),
      belegbezug:select('Laut vorliegenden Unterlagen betreffen die Zeilen denselben Beleg?','gleich','verschieden','offen'),
    },
    calculate({a_cent,b_cent,abstand_tage,suchradius_tage,belegbezug}) {
      whole(a_cent,b_cent,abstand_tage,suchradius_tage);
      const kandidat=a_cent===b_cent&&abstand_tage<=suchradius_tage&&belegbezug!=='verschieden';
      return {status:kandidat?(belegbezug==='gleich'?'gleicher_beleg_pruefen':'bezug_zuerst_klaeren'):'kein_treffer_nach_diesen_regeln',
        pruefbetrag_cent:kandidat?b_cent:null,hinweis:'Treffer erst mit Kontoauszug und Beleg prüfen. Keine Buchung wird automatisch entfernt.'};
    },
    example:{args:{a_cent:8500,b_cent:8500,abstand_tage:2,suchradius_tage:4,belegbezug:'offen'},expect:{status:'bezug_zuerst_klaeren',pruefbetrag_cent:8500}},
  },
  {
    name:'heizbuch_kaltphasen_standardisiert',
    description:'Zwei Heizfenster mit gemessenen milden und kalten Tagen über dieselbe Wetterzusammensetzung vergleichen — Compare heat use under a common two-bin weather mix.',
    page:heat,
    properties:{
      a_mild_tage:days('Milde Tage im Fenster A.',1), a_kalt_tage:days('Kalte Tage im Fenster A.',1),
      b_mild_tage:days('Milde Tage im Fenster B.',1), b_kalt_tage:days('Kalte Tage im Fenster B.',1),
      a_mild_kwh:number('Gemessene Heizenergie an milden Tagen in A.'),
      a_kalt_kwh:number('Gemessene Heizenergie an kalten Tagen in A.'),
      b_mild_kwh:number('Gemessene Heizenergie an milden Tagen in B.'),
      b_kalt_kwh:number('Gemessene Heizenergie an kalten Tagen in B.'),
      gemeinsam_kalt_prozent:number('In beiden Vergleichen angenommener Anteil kalter Tage in Prozent.',0,100),
      bins_gleich:boolean('Sind Tagesgrenzen, Heizaufgabe und Temperaturgruppen aus beiden Fenstern vergleichbar?'),
    },
    calculate({a_mild_tage,a_kalt_tage,b_mild_tage,b_kalt_tage,a_mild_kwh,a_kalt_kwh,b_mild_kwh,b_kalt_kwh,gemeinsam_kalt_prozent,bins_gleich}) {
      whole(a_mild_tage,a_kalt_tage,b_mild_tage,b_kalt_tage);
      if (!bins_gleich) return {vergleichbar:false,a_norm_kwh_tag:null,b_norm_kwh_tag:null};
      const cold=gemeinsam_kalt_prozent/100;
      const a=(1-cold)*a_mild_kwh/a_mild_tage+cold*a_kalt_kwh/a_kalt_tage;
      const b=(1-cold)*b_mild_kwh/b_mild_tage+cold*b_kalt_kwh/b_kalt_tage;
      return {vergleichbar:true,a_norm_kwh_tag:round(a),b_norm_kwh_tag:round(b),b_minus_a_kwh_tag:round(b-a),
        hinweis:'Ein rechnerischer Vergleich beobachteter Gruppen. Unterschiedliche Heizaufgaben oder Gebäude bleiben Einflussfaktoren.'};
    },
    example:{args:{a_mild_tage:10,a_kalt_tage:20,b_mild_tage:20,b_kalt_tage:10,a_mild_kwh:100,a_kalt_kwh:400,b_mild_kwh:220,b_kalt_kwh:180,gemeinsam_kalt_prozent:50,bins_gleich:true},expect:{a_norm_kwh_tag:15,b_norm_kwh_tag:14.5,b_minus_a_kwh_tag:-0.5}},
  },
  {
    name:'energiebuch_monatslaeufe_abdeckung',
    description:'Jahresübersicht mit belegten, geschätzten und fehlenden Monaten vor einem Vergleich kennzeichnen — Separate evidence coverage from a complete annual total.',
    page:budget,
    properties:{
      berichtet_monate:number('Monate mit bestätigten Einzelwerten.',0,12),
      geschaetzt_monate:number('Zusätzliche geschätzte Monate, ohne Dopplung mit bestätigten Monaten.',0,12),
      bestaetigt_cent:cents('Kosten der bestätigten Monate in Cent.',-100000000),
      geschaetzt_cent:cents('Kosten der geschätzten Monate in Cent.',-100000000),
    },
    calculate({berichtet_monate,geschaetzt_monate,bestaetigt_cent,geschaetzt_cent}) {
      whole(berichtet_monate,geschaetzt_monate,bestaetigt_cent,geschaetzt_cent);
      if (berichtet_monate+geschaetzt_monate>12||(!berichtet_monate&&bestaetigt_cent)||(!geschaetzt_monate&&geschaetzt_cent)) throw new RangeError('Monatsgrenzen prüfen.');
      const fehlt=12-berichtet_monate-geschaetzt_monate;
      return {fehlende_monate:fehlt,bestaetigte_abdeckung_prozent:round(100*berichtet_monate/12),
        erfasster_teil_cent:bestaetigt_cent+geschaetzt_cent,
        vollstaendig_bestaetigtes_jahr_cent:berichtet_monate===12?bestaetigt_cent:null};
    },
    example:{args:{berichtet_monate:9,geschaetzt_monate:2,bestaetigt_cent:54000,geschaetzt_cent:13000},expect:{fehlende_monate:1,bestaetigte_abdeckung_prozent:75,vollstaendig_bestaetigtes_jahr_cent:null}},
  },
  {
    name:'wasserjournal_liter_aufloesung',
    description:'Kleine Volumendifferenzen zwischen Wasserzählern mit gleichem Messumfang mit ihrer Rundungsauflösung einordnen — Bound a water-volume difference using separate display increments.',
    page:shower,
    properties:{
      a_liter:number('Volumen A aus zwei auf nächste Anzeigestufe gerundeten Ablesungen, in Litern.'),
      b_liter:number('Volumen B im gleichen Fenster und mit gleichem Leitungsumfang, in Litern.'),
      a_schritt_liter:number('Anzeigeschritt pro Ablesung für A in Litern.',0.001,1000),
      b_schritt_liter:number('Anzeigeschritt pro Ablesung für B in Litern.',0.001,1000),
    },
    calculate({a_liter,b_liter,a_schritt_liter,b_schritt_liter}) {
      const diff=b_liter-a_liter;
      const margin=a_schritt_liter+b_schritt_liter;
      return {b_minus_a_liter:round(diff),untergrenze_liter:round(diff-margin),obergrenze_liter:round(diff+margin),
        rundung_allein_reicht_rechnerisch:Math.abs(diff)<=margin+1e-9,
        hinweis:'Für zwei Volumina aus jeweils zwei auf die nächste Stufe gerundeten Ablesungen. Gerätemessfehler sind zusätzlich möglich.'};
    },
    example:{args:{a_liter:3000,b_liter:3020,a_schritt_liter:10,b_schritt_liter:10},expect:{untergrenze_liter:0,obergrenze_liter:40,rundung_allein_reicht_rechnerisch:true}},
  },
  {
    name:'haushaltsbuch_privater_strombeleg',
    description:'Stromkosten eigener Haushaltsgeräte von privaten oder beruflich separat geführten Kosten mit doppelten Abzügen abgrenzen — Reconcile overlapping exclusions from a home electricity ledger.',
    page:budget,
    properties:{
      gesamt_cent:cents('Gesamtkosten im betrachteten Haushaltsbuch und Zeitraum.'),
      privat_separat_cent:cents('Eigene separat geführte Bezugskosten, bereits im Gesamtbetrag enthalten.'),
      arbeit_separat_cent:cents('Für die Übersicht separat geführte Arbeitsstromkosten, im Gesamtbetrag enthalten.'),
      in_beiden_cent:cents('Betrag in der Schnittmenge der beiden Abzugslisten.'),
    },
    calculate({gesamt_cent,privat_separat_cent,arbeit_separat_cent,in_beiden_cent}) {
      whole(gesamt_cent,privat_separat_cent,arbeit_separat_cent,in_beiden_cent);
      if (in_beiden_cent>Math.min(privat_separat_cent,arbeit_separat_cent)) throw new RangeError('Doppelter Anteil ist größer als eine seiner Kategorien.');
      const abzug=privat_separat_cent+arbeit_separat_cent-in_beiden_cent;
      if (abzug>gesamt_cent) throw new RangeError('Abzüge überschreiten den erfassten Betrag.');
      return {im_haushalt_cent:gesamt_cent-abzug,separat_einmal_cent:abzug,doppelt_aussortiert_cent:in_beiden_cent,
        hinweis:'Kategorien der eigenen Übersicht, ohne Zuordnung zu einer Steuererklärung.'};
    },
    example:{args:{gesamt_cent:7000,privat_separat_cent:2000,arbeit_separat_cent:1500,in_beiden_cent:500},expect:{im_haushalt_cent:4000,separat_einmal_cent:3000}},
  },
  {
    name:'energiekosten_eigener_anteil_deckel',
    description:'Einen gemeinsam vereinbarten Höchstanteil pro Person anwenden und den Kapazitätsrest getrennt zeigen — Reallocate a capped shared bill using agreed capacities.',
    page:budget,
    properties:{
      kosten_cent:cents('Gemeinsame Kosten in Cent.'),
      vorschlag_a_cent:cents('Vorläufiger Anteil A in Cent.'),
      deckel_a_cent:cents('Vereinbarter maximaler Anteil A in Cent.'),
      deckel_b_cent:cents('Vereinbarter maximaler Anteil B in Cent.'),
    },
    calculate({kosten_cent,vorschlag_a_cent,deckel_a_cent,deckel_b_cent}) {
      whole(kosten_cent,vorschlag_a_cent,deckel_a_cent,deckel_b_cent);
      if (vorschlag_a_cent>kosten_cent) throw new RangeError('Anteil A übersteigt Gesamtkosten.');
      const a=Math.min(deckel_a_cent,Math.max(vorschlag_a_cent,kosten_cent-deckel_b_cent));
      const b=Math.min(deckel_b_cent,kosten_cent-a);
      return {a_cent:a,b_cent:b,nicht_deckbar_cent:kosten_cent-a-b,verschiebung_bei_a_cent:a-vorschlag_a_cent,
        hinweis:'Nur für die freiwillig vereinbarte interne Aufteilung mit zwei Obergrenzen.'};
    },
    example:{args:{kosten_cent:10000,vorschlag_a_cent:7000,deckel_a_cent:5000,deckel_b_cent:4000},expect:{a_cent:5000,b_cent:4000,nicht_deckbar_cent:1000}},
  },
  {
    name:'heizenergie_volumen_faktorstaffel',
    description:'Zwei getrennte Volumenzeiträume mit den jeweils belegten Umrechnungsfaktoren in kWh zusammenführen — Reconcile separately applied heat-billing volume factors.',
    page:heat,
    properties:{
      volumen_a_m3:number('Abgelesenes Volumen der ersten Teilperiode in m³.'),
      volumen_b_m3:number('Abgelesenes Volumen der zweiten Teilperiode in m³.'),
      faktor_a:number('Belegter Gesamtfaktor der ersten Teilperiode in kWh/m³.',0.001,10000),
      faktor_b:number('Belegter Gesamtfaktor der zweiten Teilperiode in kWh/m³.',0.001,10000),
      beleg_kwh:number('In der Rechnung ausgewiesene kWh über beide Teilperioden.',0,1000000000),
      abschnitte_bestaetigt:boolean('Sind die zugeordneten Teilperioden lückenlos und überschneidungsfrei?'),
    },
    calculate({volumen_a_m3,volumen_b_m3,faktor_a,faktor_b,beleg_kwh,abschnitte_bestaetigt}) {
      if (!abschnitte_bestaetigt) return {status:'zuordnung_pruefen',beleg_differenz_kwh:null};
      const a=volumen_a_m3*faktor_a;
      const b=volumen_b_m3*faktor_b;
      return {status:'abgeglichen',a_kwh:round(a),b_kwh:round(b),beleg_differenz_kwh:round(beleg_kwh-a-b),
        gewichteter_faktor_kwh_m3:volumen_a_m3+volumen_b_m3?round((a+b)/(volumen_a_m3+volumen_b_m3)):null};
    },
    example:{args:{volumen_a_m3:20,volumen_b_m3:30,faktor_a:10,faktor_b:11,beleg_kwh:535,abschnitte_bestaetigt:true},expect:{a_kwh:200,b_kwh:330,beleg_differenz_kwh:5,gewichteter_faktor_kwh_m3:10.6}},
  },
  {
    name:'wasserzaehler_anzeigeumlauf',
    description:'Verbrauch über einen dokumentierten Umlauf derselben Wasserzähleranzeige bestimmen — Recover water volume across one verified counter rollover.',
    page:shower,
    properties:{
      start_liter:number('Erste Anzeige in Litern.',0,100000000),
      ende_liter:number('Letzte Anzeige in Litern.',0,100000000),
      umlauf_liter:number('Vom Hersteller dokumentierter voller Anzeigezyklus in Litern, bis die Anzeige wieder null zeigt.',1,100000000),
      protokoll:select('Was bestätigt das Ableseprotokoll für dasselbe Gerät?','kein_umlauf','genau_ein_umlauf','unbekannt'),
    },
    calculate({start_liter,ende_liter,umlauf_liter,protokoll}) {
      whole(start_liter,ende_liter,umlauf_liter);
      if (start_liter>=umlauf_liter||ende_liter>=umlauf_liter) throw new RangeError('Anzeige liegt außerhalb des angegebenen Zyklus.');
      if (protokoll==='unbekannt'||(protokoll==='kein_umlauf'&&ende_liter<start_liter)) return {status:'umlauf_oder_ablesung_pruefen',verbrauch_liter:null};
      return {status:protokoll,verbrauch_liter:ende_liter-start_liter+(protokoll==='genau_ein_umlauf'?umlauf_liter:0),
        hinweis:'Ein kleinerer Stand allein beweist keinen Umlauf. Einen Zählertausch getrennt dokumentieren.'};
    },
    example:{args:{start_liter:9950,ende_liter:110,umlauf_liter:10000,protokoll:'genau_ein_umlauf'},expect:{verbrauch_liter:160}},
  },
  {
    name:'stromgeraet_anschaffung_monatsbuch',
    description:'Einen gezahlten Gerätebetrag in der eigenen Monatsübersicht centgenau verteilen und laufenden Strom getrennt zeigen — Track a historical purchase and metered electricity without booking the purchase twice.',
    page:budget,
    properties:{
      anschaffung_cent:cents('Tatsächlich gezahlter Kaufpreis abzüglich belegter Erstattungen in Cent.'),
      verteil_monate:number('Selbst gewählte ganze Anzahl an Monaten für die Vergleichsansicht.',1,600),
      laufend_monat:number('Nummer des Monats ab Kaufmonat, der zuerst als 1 gezählt wird.',1,1200),
      betrieb_cent:cents('Gemessene variable Stromkosten dieses Monats in Cent.'),
    },
    calculate({anschaffung_cent,verteil_monate,laufend_monat,betrieb_cent}) {
      whole(anschaffung_cent,verteil_monate,laufend_monat,betrieb_cent);
      const basis=Math.floor(anschaffung_cent/verteil_monate);
      const extra=anschaffung_cent%verteil_monate;
      const anteil=laufend_monat<=verteil_monate?basis+(laufend_monat<=extra?1:0):0;
      const vergangen=Math.min(laufend_monat,verteil_monate);
      const rest=anschaffung_cent-basis*vergangen-Math.min(vergangen,extra);
      return {kaufanteil_cent:anteil,strom_cent:betrieb_cent,vergleichsmonat_cent:anteil+betrieb_cent,kaufrest_cent:rest,
        hinweis:'Eine persönliche Vergleichsansicht. Im Zahlungsjournal erscheint der Kauf am Zahlungstag.'};
    },
    example:{args:{anschaffung_cent:10000,verteil_monate:3,laufend_monat:1,betrieb_cent:450},expect:{kaufanteil_cent:3334,vergleichsmonat_cent:3784,kaufrest_cent:6666}},
  },
  {
    name:'energiebuch_kohorten_bereinigter_vergleich',
    description:'Bei geänderten Messkanälen den gemeinsamen Teil zweier Stromsummen von Zu- und Abgängen trennen — Decompose ledger change into matched equipment and channel turnover.',
    page:meter,
    properties:{
      alt_gesamt_kwh:number('Gemessene Gesamtmenge der ersten Gruppe.'), neu_gesamt_kwh:number('Gemessene Gesamtmenge der zweiten Gruppe.'),
      nur_alt_kwh:number('Energie der Geräte, die nur im ersten Fenster enthalten sind.'),
      nur_neu_kwh:number('Energie der Geräte, die nur im zweiten Fenster enthalten sind.'),
      gleicher_umfang:boolean('Sind gemeinsame Geräte gleich erfasst und beide Messfenster gleich lang und vergleichbar?'),
    },
    calculate({alt_gesamt_kwh,neu_gesamt_kwh,nur_alt_kwh,nur_neu_kwh,gleicher_umfang}) {
      if (nur_alt_kwh>alt_gesamt_kwh||nur_neu_kwh>neu_gesamt_kwh) throw new RangeError('Teilmenge übersteigt die zugehörige Gesamtsumme.');
      return {sichtbare_aenderung_kwh:round(neu_gesamt_kwh-alt_gesamt_kwh),kanalwechsel_kwh:round(nur_neu_kwh-nur_alt_kwh),
        gemeinsam_aenderung_kwh:gleicher_umfang?round(neu_gesamt_kwh-nur_neu_kwh-alt_gesamt_kwh+nur_alt_kwh):null,
        hinweis:'Gemeinsame Geräte bilden nur bei vergleichbaren Messfenstern eine aussagekräftige Vergleichsgruppe.'};
    },
    example:{args:{alt_gesamt_kwh:50,neu_gesamt_kwh:60,nur_alt_kwh:8,nur_neu_kwh:22,gleicher_umfang:true},expect:{sichtbare_aenderung_kwh:10,kanalwechsel_kwh:14,gemeinsam_aenderung_kwh:-4}},
  },
  {
    name:'haushaltskosten_waerme_wasser_mischbeleg',
    description:'Bei separat bezahltem Wasser und zentralem Warmwasser enthaltene Wassermengenentgelte abgleichen — Keep centrally billed hot-water heat distinct from duplicated water charges.',
    page:shower,
    properties:{
      kaltwasserrechnung_cent:cents('Bestätigte Wasserabrechnung, die nach deiner Prüfung dieselbe Warmwassermenge enthalten kann.'),
      warmwasserrechnung_cent:cents('Zentraler Warmwasserbeleg in Cent.'),
      warmwasser_mengenanteil_cent:cents('Ausgewiesener Betrag für Wasser und Abwasser im Warmwasserbeleg, ohne Wärmekosten.'),
      ueberlappung:select('Ist derselbe Mengenanteil bereits auf der Wasserrechnung enthalten?','enthalten','zusaetzlich','offen'),
    },
    calculate({kaltwasserrechnung_cent,warmwasserrechnung_cent,warmwasser_mengenanteil_cent,ueberlappung}) {
      whole(kaltwasserrechnung_cent,warmwasserrechnung_cent,warmwasser_mengenanteil_cent);
      if (warmwasser_mengenanteil_cent>warmwasserrechnung_cent||(ueberlappung==='enthalten'&&warmwasser_mengenanteil_cent>kaltwasserrechnung_cent)) throw new RangeError('Mengenanteil übersteigt den Beleg.');
      return {warmwasser_ohne_mengenzeile_cent:warmwasserrechnung_cent-warmwasser_mengenanteil_cent,
        auslagen_cent:kaltwasserrechnung_cent+warmwasserrechnung_cent,
        bereinigte_auswertung_cent:ueberlappung==='offen'?null:kaltwasserrechnung_cent+warmwasserrechnung_cent-(ueberlappung==='enthalten'?warmwasser_mengenanteil_cent:0),
        hinweis:'Bereinigte private Kostenübersicht; die bestätigte Auslagensumme bleibt separat sichtbar.'};
    },
    example:{args:{kaltwasserrechnung_cent:5000,warmwasserrechnung_cent:4300,warmwasser_mengenanteil_cent:1200,ueberlappung:'enthalten'},expect:{warmwasser_ohne_mengenzeile_cent:3100,auslagen_cent:9300,bereinigte_auswertung_cent:8100}},
  },
  {
    name:'stromkosten_fixanteil_gleicher_zeitraum',
    description:'Fixe Kosten und veränderliche Zusatzposten aus zwei bezahlten Strommonaten abgrenzen — Compare the fixed-cost burden at different measured monthly usage.',
    page:tariff,
    properties:{
      a_cent:cents('Gesamtkosten A in Cent, einschließlich des gemeinsamen Fixbetrags.'),
      b_cent:cents('Gesamtkosten B in Cent, einschließlich des gemeinsamen Fixbetrags.'),
      fix_cent:cents('Belegter in beiden Zeiträumen identischer Fixbetrag in Cent.'),
      a_kwh:number('Gemessene kWh A.'), b_kwh:number('Gemessene kWh B.'),
      basis_gleich:boolean('Gleiche Dauer und gleiche Kostenabgrenzung ohne Sonderposten geprüft?'),
    },
    calculate({a_cent,b_cent,fix_cent,a_kwh,b_kwh,basis_gleich}) {
      whole(a_cent,b_cent,fix_cent);
      if (!basis_gleich||fix_cent>Math.min(a_cent,b_cent)) return {status:'kostenbasis_pruefen',a_fix_cent_kwh:null,b_fix_cent_kwh:null};
      return {status:'vergleichbar',a_fix_cent_kwh:a_kwh?round(fix_cent/a_kwh):null,b_fix_cent_kwh:b_kwh?round(fix_cent/b_kwh):null,
        a_veraenderlich_cent_kwh:a_kwh?round((a_cent-fix_cent)/a_kwh):null,b_veraenderlich_cent_kwh:b_kwh?round((b_cent-fix_cent)/b_kwh):null,
        hinweis:'Bei null kWh ist kein Betrag pro kWh definiert.'};
    },
    example:{args:{a_cent:8000,b_cent:5000,fix_cent:2000,a_kwh:200,b_kwh:100,basis_gleich:true},expect:{a_fix_cent_kwh:10,b_fix_cent_kwh:20,a_veraenderlich_cent_kwh:30,b_veraenderlich_cent_kwh:30}},
  },
];
