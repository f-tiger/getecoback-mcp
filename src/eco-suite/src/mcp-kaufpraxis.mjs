const costPage = '/geraete-austausch-rechner.html';
const methodPage = '/wie-wir-empfehlen.html';
const productPage = '/produkte.html';
const purifierPage = '/guide/luftreiniger-ratgeber.html';
const humidifierPage = '/guide/luftbefeuchter-ratgeber.html';
const cleanerPage = '/guide/saugwischer-kaufberatung.html';
const coolingAccessories = '/guide/klimaanlage-zubehoer-guenstig.html';
const climateAlternatives = '/guide/midea-portasplit-ausverkauft-alternativen.html';
const filtersPage = '/ersatzfilter.html';

const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const money = description => number(description,0,50000);
const bool = description => ({type:'boolean', description});
const choice = (description,...values) => ({type:'string', description, enum:values});
const days = description => number(description,0,1095);
const cycles = description => number(description,1,20000);
const rounded = value => Math.round(value*100)/100;

export const kaufpraxis = [
  {
    name:'waesche_trocknungswechsel_kaufschwelle',
    description:'Lohnt sich ein Luftentfeuchter zum Wäschetrocknen, wenn ein Teil der Waschladungen im Winter weiter in den Trockner geht? Vergleiche gemessene Stromkosten, Anschaffung und Amortisation je Saison — Check the payback when replacing only some dryer loads.',
    page:'/waeschetrockner-oder-luftentfeuchter.html',
    guide_url:'https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html#laundry-check',
    properties:{
      ladungen_saison:number('Anzahl aller vergleichbaren Ladungen je Trocknungssaison, als Ganzzahl.',1,2000),
      ladungen_ersetzbar:number('Davon realistisch mit dem Entfeuchter getrocknete Ladungen, als Ganzzahl.',0,2000),
      trockner_kwh:number('Gemessene kWh je vollständiger Ladung im bisherigen Trockner.',0,100),
      entfeuchter_kwh:number('Gemessene kWh je vollständiger Ladung mit Entfeuchter, einschließlich elektrischer Zusatzgeräte.',0,100),
      tarif_eur_kwh:number('Eigener Arbeitspreis je kWh in Euro.',0,5),
      anschaffung_eur:money('Zusätzliche Anschaffung einschließlich nötigen Zubehörs. Null, wenn alles schon vorhanden ist.'),
      ladungen_vergleichbar:bool('Gleiche Wäschemenge, Schleuderdrehzahl und Endtrockenheit beim Messen?'),
      zusatzstrom_erfasst:bool('Ist der gesamte Strom für diesen Trocknungsweg erfasst, etwa auch für einen Ventilator oder eine elektrische Zusatzheizung?'),
    },
    calculate({ladungen_saison,ladungen_ersetzbar,trockner_kwh,entfeuchter_kwh,tarif_eur_kwh,anschaffung_eur,ladungen_vergleichbar,zusatzstrom_erfasst}) {
      if (![ladungen_saison,ladungen_ersetzbar].every(Number.isInteger) || ladungen_ersetzbar>ladungen_saison) {
        throw new RangeError('Vergleichbare und ersetzbare Ladungen je Saison');
      }
      const grenze='Vergleich eigener Messungen. Prüfe Raumfeuchte, Lüftung, Platz und verfügbare Zeit vor dem Kauf. Nicht erfasste Heizwärme, Wartung, Lebensdauer und Tarifänderungen fehlen in der Rechnung.';
      const continued = ladungen_saison-ladungen_ersetzbar;
      if (!ladungen_vergleichbar || !zusatzstrom_erfasst) {
        return {status:'erst_vergleichbar_messen',trocknerladungen_weiter:continued,bisher_saison_eur:null,
          gemischt_saison_eur:null,stromersparnis_saison_eur:null,kostendeckung_saisons:null,grenze};
      }
      const oldCost = ladungen_saison*trockner_kwh*tarif_eur_kwh;
      const mixedCost = (continued*trockner_kwh+ladungen_ersetzbar*entfeuchter_kwh)*tarif_eur_kwh;
      const savedCents = Math.round((trockner_kwh-entfeuchter_kwh)*ladungen_ersetzbar*tarif_eur_kwh*100);
      const outlayCents = Math.round(anschaffung_eur*100);
      const status = savedCents<=0 ? 'kein_stromkostenvorteil' : outlayCents===0 ? 'vorhandene_option_stromguenstiger' : 'rechnerische_kostendeckung';
      return {status,trocknerladungen_weiter:continued,bisher_saison_eur:rounded(oldCost),gemischt_saison_eur:rounded(mixedCost),
        stromersparnis_saison_eur:(savedCents || 0)/100,kostendeckung_saisons:savedCents>0?Math.ceil(outlayCents/savedCents):null,grenze};
    },
    example:{args:{ladungen_saison:100,ladungen_ersetzbar:60,trockner_kwh:1.4,entfeuchter_kwh:0.6,tarif_eur_kwh:0.35,anschaffung_eur:100,ladungen_vergleichbar:true,zusatzstrom_erfasst:true},
      expect:{status:'rechnerische_kostendeckung',trocknerladungen_weiter:40,bisher_saison_eur:49,gemischt_saison_eur:32.2,stromersparnis_saison_eur:16.8,kostendeckung_saisons:6}},
  },
  {
    name:'geraetekauf_raten_gegen_barpreis',
    description:'Ausgewiesene Raten, Schlusszahlung und Gebühren zum Barpreisvergleich addieren — Compare the stated installment total with the full cash price.',
    page:costPage,
    properties:{
      bar_eur:money('Vollständiger Barpreis für dasselbe Angebot.'),
      anzahlung_eur:money('Ausgewiesene Anzahlung in Euro.'),
      anzahl_raten:number('Anzahl gleicher vollständiger Raten, ohne Schlusszahlung.',1,120),
      rate_eur:money('Betrag einer regulären Rate in Euro.'),
      schluss_eur:money('Separate Schlusszahlung in Euro, sonst null Euro.'),
      gebuehren_eur:money('Zusätzlich ausgewiesene Gebühren in Euro.'),
    },
    calculate({bar_eur,anzahlung_eur,anzahl_raten,rate_eur,schluss_eur,gebuehren_eur}) {
      if (!Number.isInteger(anzahl_raten)) throw new RangeError('Anzahl gleicher Raten');
      const sum=anzahlung_eur+anzahl_raten*rate_eur+schluss_eur+gebuehren_eur;
      return {teilzahlung_summe_eur:rounded(sum),mehrbetrag_gegen_bar_eur:rounded(sum-bar_eur),
        grenze:'Summenvergleich der bekannten Zahlungen. Kein effektiver Jahreszins, keine Bewertung eines Finanzierungsvertrags.'};
    },
    example:{args:{bar_eur:500,anzahlung_eur:100,anzahl_raten:12,rate_eur:30,schluss_eur:50,gebuehren_eur:10},
      expect:{teilzahlung_summe_eur:520,mehrbetrag_gegen_bar_eur:20}},
  },
  {
    name:'geraeteaufpreis_strompreisband',
    description:'Prüfen, ob sich ein Geräteaufpreis bei niedrigen und hohen eigenen Strompreisen innerhalb der Nutzungsfrist ausgleicht — Test the purchase premium across a range of energy prices.',
    page:costPage,
    properties:{
      aufpreis_eur:money('Aufpreis des sparsameren Geräts in Euro.'),
      ersparnis_kwh_jahr:number('Vergleichbare jährliche kWh-Ersparnis.',0,5000),
      jahre:number('Angenommene gleich lange Nutzungszeit in Jahren.',1,30),
      tarif_tief:number('Eigenes unteres Szenario in Euro pro kWh.',0,5),
      tarif_hoch:number('Eigenes oberes Szenario in Euro pro kWh.',0,5),
    },
    calculate({aufpreis_eur,ersparnis_kwh_jahr,jahre,tarif_tief,tarif_hoch}) {
      if (tarif_tief>tarif_hoch) throw new RangeError('Tarifband');
      const energy=ersparnis_kwh_jahr*jahre;
      const low=energy*tarif_tief-aufpreis_eur, high=energy*tarif_hoch-aufpreis_eur;
      return {netto_tief_eur:rounded(low),netto_hoch_eur:rounded(high),
        deckt_aufpreis:low>=0?'im_ganzen_band':high<0?'nirgends_im_band':'tarifabhaengig',
        grenze:'Gleiche Leistung, Nutzung und Prüfgrundlage vorausgesetzt. Tarifband und Lebensdauer sind eigene Annahmen, ohne Wartung oder Restwert.'};
    },
    example:{args:{aufpreis_eur:180,ersparnis_kwh_jahr:100,jahre:5,tarif_tief:0.25,tarif_hoch:0.45},
      expect:{netto_tief_eur:-55,netto_hoch_eur:45,deckt_aufpreis:'tarifabhaengig'}},
  },
  {
    name:'geraete_gebraucht_restnutzungs_schwelle',
    description:'Mindestzahl gleichwertiger Einsätze berechnen, die ein Gebrauchtgerät für denselben Anschaffungspreis pro Einsatz erreichen müsste — Find the used appliance usage threshold relative to a new one.',
    page:costPage,
    properties:{
      gebraucht_eur:money('Zahlung für das einsatzbereite Gebrauchtgerät.'),
      neu_eur:money('Zahlung für ein gleich nutzbares Neugerät.'),
      neu_einsaetze:cycles('Eigene Szenario-Anzahl Einsätze für das Neugerät.'),
      gebraucht_einsaetze:number('Eigene erwartete verbleibende Einsätze des Gebrauchtgeräts.',0,20000),
    },
    calculate({gebraucht_eur,neu_eur,neu_einsaetze,gebraucht_einsaetze}) {
      const axis=neu_eur/neu_einsaetze;
      const threshold=axis>0?Math.ceil(gebraucht_eur/axis):gebraucht_eur>0?null:0;
      return {mindest_einsaetze_gebraucht:threshold,
        differenz_zur_annahme:threshold===null?null:gebraucht_einsaetze-threshold,
        grenze:'Vergleicht nur Anschaffung pro gleichwertigem Einsatz. Tatsächliche Lebensdauer, Betriebskosten und Reparaturbedarf bleiben offen.'};
    },
    example:{args:{gebraucht_eur:120,neu_eur:300,neu_einsaetze:600,gebraucht_einsaetze:200},
      expect:{mindest_einsaetze_gebraucht:240,differenz_zur_annahme:-40}},
  },
  {
    name:'geraet_reparatur_ausfallkosten',
    description:'Einen Reparaturkostenvoranschlag um tatsächlich nötige Übergangsnutzung während des Ausfalls ergänzen — Add necessary downtime costs to a household repair quote.',
    page:costPage,
    properties:{
      reparatur_eur:money('Vollständiger Reparaturvoranschlag.'),
      ausfall_tage:days('Im Szenario erwartete Ausfallzeit.'),
      freie_tage:days('Davon Tage, die ohne zusätzliche Zahlung überbrückt werden können.'),
      ersatz_pro_tag_eur:money('Eigene Übergangskosten pro verbleibendem Tag.'),
      ersatzbudget_eur:money('Eigenes Budget für Reparatur plus Überbrückung.'),
    },
    calculate({reparatur_eur,ausfall_tage,freie_tage,ersatz_pro_tag_eur,ersatzbudget_eur}) {
      if(freie_tage>ausfall_tage) throw new RangeError('Überbrückungstage');
      const bridge=(ausfall_tage-freie_tage)*ersatz_pro_tag_eur;
      return {ueberbrueckung_eur:rounded(bridge),reparaturpfad_eur:rounded(reparatur_eur+bridge),
        budgetrest_eur:rounded(ersatzbudget_eur-reparatur_eur-bridge),
        grenze:'Ausfallzeit und Ersatzaufwand stammen aus der Eingabe. Reparaturerfolg und Restlebensdauer sind nicht festgestellt.'};
    },
    example:{args:{reparatur_eur:100,ausfall_tage:8,freie_tage:3,ersatz_pro_tag_eur:6,ersatzbudget_eur:160},
      expect:{ueberbrueckung_eur:30,reparaturpfad_eur:130,budgetrest_eur:30}},
  },
  {
    name:'geraet_bundle_aufpreis_gebrauchswert',
    description:'Aufpreis eines Pakets nur gegen die Einzelpreise tatsächlich benötigter, bestätigter Extra-Teile rechnen — Value only wanted and confirmed extras when comparing a bundle premium.',
    page:productPage,
    properties:{
      basis_eur:money('Gesamtpreis des Basispakets.'),
      paket_eur:money('Gesamtpreis des größeren Pakets für dieselbe Grundvariante.'),
      extras_separat_eur:money('Gesamte Einzelkosten bestätigter Extras, die du tatsächlich kaufen würdest.'),
      teile_geprueft:bool('Sind benötigte Extras und deren Kompatibilität für dasselbe Gerät belegt?'),
    },
    calculate({basis_eur,paket_eur,extras_separat_eur,teile_geprueft}) {
      return {paket_aufpreis_eur:rounded(paket_eur-basis_eur),
        mehrbetrag_gegen_einzel_eur:teile_geprueft?rounded(paket_eur-basis_eur-extras_separat_eur):null,
        grenze:'Unbenötigte Zugaben haben in dieser Rechnung keinen Wert. Paketinhalt und Kosten der Einzelbeschaffung vorher am Angebot prüfen.'};
    },
    example:{args:{basis_eur:250,paket_eur:285,extras_separat_eur:30,teile_geprueft:true},
      expect:{paket_aufpreis_eur:35,mehrbetrag_gegen_einzel_eur:5}},
  },
  {
    name:'reiniger_zeitgewinn_gegen_aufpreis',
    description:'Bewerten, welchen eigenen Mindestwert je gesparter Stunde ein Reinigungsgeräte-Aufpreis benötigt — Quantify the break-even personal value per hour of active cleaning time saved.',
    page:cleanerPage,
    properties:{
      aufpreis_eur:money('Kaufpreisaufschlag für den neuen Weg in Euro.'),
      minuten_alt:number('Aktive Minuten pro gleichwertigem Einsatz für den alten Weg, inklusive Pflege.',0,600),
      minuten_neu:number('Aktive Minuten für den neuen Weg, inklusive Pflege.',0,600),
      einsaetze:cycles('Vorgesehene Anzahl gleichwertiger Einsätze.'),
    },
    calculate({aufpreis_eur,minuten_alt,minuten_neu,einsaetze}) {
      const hours=(minuten_alt-minuten_neu)*einsaetze/60;
      return {gesamtstunden_gewonnen:rounded(hours),mindestwert_stunde_eur:hours>0?rounded(aufpreis_eur/hours):null,
        grenze:'Eigener Zeitwert und gleichwertig saubere Fläche vorausgesetzt. Laufzeit ohne eigene Tätigkeit zählt nicht als aktive Arbeitszeit.'};
    },
    example:{args:{aufpreis_eur:120,minuten_alt:25,minuten_neu:19,einsaetze:100},
      expect:{gesamtstunden_gewonnen:10,mindestwert_stunde_eur:12}},
  },
  {
    name:'thermostat_erprobung_wiederverwendungskosten',
    description:'Beim Thermostatversuch mit einem Raum unterscheiden, was bei einem Ausbau weiter nutzbar ist und welche Kosten zusätzlich bleiben — Compare pilot and direct expansion costs after crediting confirmed reusable components.',
    page:'/guide/smarte-heizkoerperthermostate-lohnen-sich.html',
    properties:{
      pilot_eur:money('Ausgaben für einen tatsächlich vergleichbaren Ein-Raum-Versuch.'),
      reuse_eur:money('Davon belegbarer Wert der Komponenten, die Käufe im Ausbau ersetzen.'),
      direkt_eur:money('Komplette Kosten des geplanten Mehrraum-Ausbaus ohne Versuch.'),
      generation_gleich:bool('Ist die Weiterverwendung genau dieser Generation für den geplanten Ausbau geklärt?'),
    },
    calculate({pilot_eur,reuse_eur,direkt_eur,generation_gleich}) {
      if (reuse_eur>pilot_eur || reuse_eur>direkt_eur) throw new RangeError('Wiederverwendungsanteil');
      return {mehrkosten_versuch_eur:generation_gleich?rounded(pilot_eur-reuse_eur):null,
        gesamt_mit_versuch_eur:generation_gleich?rounded(pilot_eur+direkt_eur-reuse_eur):null,
        grenze:'Eine kompatible Zentrale oder ein wiederverwendbarer Kopf zählt nur, wenn er nachweislich einen Kauf im Ausbau ersetzt.'};
    },
    example:{args:{pilot_eur:70,reuse_eur:50,direkt_eur:210,generation_gleich:true},
      expect:{mehrkosten_versuch_eur:20,gesamt_mit_versuch_eur:230}},
  },
  {
    name:'kuehlloesung_uebergangsbudget_gegen_aufpreis',
    description:'Eigene Kosten einer Zwischenlösung einer sofort verfügbaren Klimageräte-Alternative gegenüberstellen — Compare bridging costs with the premium for a verified immediate alternative.',
    page:climateAlternatives,
    properties:{
      wunsch_eur:money('Angenommene spätere Gesamtkosten der Wunschlösung.'),
      sofort_eur:money('Bestätigte Gesamtkosten des aktuellen Alternativangebots.'),
      uebergang_eur:money('Eigene erwartete Ausgaben für die Zwischenlösung bis dahin.'),
      aufstellung_belegt:bool('Sind beide Optionen für die beabsichtigte Aufstellung überprüft?'),
    },
    calculate({wunsch_eur,sofort_eur,uebergang_eur,aufstellung_belegt}) {
      return {spaeter_mit_uebergang_eur:rounded(wunsch_eur+uebergang_eur),
        sofort_mehrbetrag_eur:aufstellung_belegt?rounded(sofort_eur-wunsch_eur-uebergang_eur):null,
        grenze:'Die spätere Lieferung und der spätere Preis werden nicht vorhergesagt. Kurzfristiger Komfort und Eignung separat abwägen.'};
    },
    example:{args:{wunsch_eur:400,sofort_eur:475,uebergang_eur:25,aufstellung_belegt:true},
      expect:{spaeter_mit_uebergang_eur:425,sofort_mehrbetrag_eur:50}},
  },
  {
    name:'oskar_filtermatten_gemeinsamer_vorrat',
    description:'Vorhandene O-030-Matten auf geplante vollständige Wechsel bei Oskar und Oskar little aufteilen — Plan a shared stock of verified O-030 mat packs across the two compatible humidifiers.',
    page:humidifierPage,
    properties:{
      oskar_wechsel:number('Geplante vollständige Wechsel am Oskar O-020.',0,50),
      little_wechsel:number('Geplante vollständige Wechsel am Oskar little O-060.',0,50),
      vorhanden:number('Vorhandene passende unbenutzte einzelne O-030-Matten.',0,150),
    },
    calculate({oskar_wechsel,little_wechsel,vorhanden}) {
      if (![oskar_wechsel,little_wechsel,vorhanden].every(Number.isInteger)) throw new RangeError('Matten und Wechsel sind Ganzzahlen');
      const need=oskar_wechsel*2+little_wechsel;
      const packs=Math.ceil(Math.max(0,need-vorhanden)/2);
      return {bedarf_matten:need,zusaetzliche_zweierpacks:packs,uebrige_matten:vorhanden+packs*2-need,
        grenze:'O-030 gilt hier für die dokumentierten Oskar/Oskar little Ausführungen. Eigenen Wechselbedarf und tatsächlichen Packungsinhalt prüfen.'};
    },
    example:{args:{oskar_wechsel:2,little_wechsel:3,vorhanden:2},
      expect:{bedarf_matten:7,zusaetzliche_zweierpacks:3,uebrige_matten:1}},
  },
  {
    name:'verbrauchsmaterial_parallel_beschaffen',
    description:'Bei mehreren unverzichtbaren Verbrauchsteilen den bestätigten Lieferengpass im geplanten Startfenster ermitteln — Identify the critical delivery time when all mandatory consumables are needed.',
    page:filtersPage,
    properties:{
      teil_a_tage:days('Bestätigte Lieferzeit des ersten notwendigen passenden Teils.'),
      teil_b_tage:days('Bestätigte Lieferzeit des zweiten notwendigen passenden Teils.'),
      bis_einsatz_tage:days('Tage bis zum geplanten Einsatz.'),
      beide_bestaetigt:bool('Gilt die Lieferangabe für beide exakt passenden Artikel?'),
    },
    calculate({teil_a_tage,teil_b_tage,bis_einsatz_tage,beide_bestaetigt}) {
      const last=Math.max(teil_a_tage,teil_b_tage);
      return {fruehester_geplanter_start_tage:beide_bestaetigt?last:null,
        puffer_tage:beide_bestaetigt?bis_einsatz_tage-last:null,
        engpass:!beide_bestaetigt?null:teil_a_tage===teil_b_tage?'beide':teil_a_tage>teil_b_tage?'teil_a':'teil_b',
        grenze:'Annahme: parallel bestellt; alle Teile werden benötigt. Lieferangaben sind Beobachtungen und keine Garantie.'};
    },
    example:{args:{teil_a_tage:3,teil_b_tage:8,bis_einsatz_tage:6,beide_bestaetigt:true},
      expect:{fruehester_geplanter_start_tage:8,puffer_tage:-2,engpass:'teil_b'}},
  },
  {
    name:'beurer_lb200_filter_frist_auslastung',
    description:'Für den LB 200 Laufzeit-Hinweis und späteste Kalenderfrist im eigenen geplanten Einsatz ins Verhältnis setzen — Compare the documented runtime alert and maximum calendar replacement interval for a Beurer LB 200 filter.',
    page:humidifierPage,
    properties:{
      bisher_stunden:number('Seit dem letzten Filterwechsel angefallene Betriebsstunden.',0,20000),
      stunden_monat:number('Für die verbleibende Zeit erwartete Monats-Betriebsstunden.',0,744),
      vergangene_monate:number('Seit dem letzten Filterwechsel vergangene Zeit in Monaten.',0,48),
      sichtbefund:choice('Sichtbarer Zustand des passenden Filters.', 'unauffaellig','auffaellig','nicht_geprueft'),
    },
    calculate({bisher_stunden,stunden_monat,vergangene_monate,sichtbefund}) {
      const time=bisher_stunden>=1440?0:stunden_monat>0?(1440-bisher_stunden)/stunden_monat:null;
      const calendar=Math.max(0,6-vergangene_monate);
      return {hinweis_in_monaten:time===null?null:rounded(time),
        kalender_rest_monate:rounded(calendar),
        zuerst:sichtbefund==='auffaellig'?'sichtbefund':sichtbefund==='nicht_geprueft'?'zustand_pruefen':
          time!==null&&time<=calendar?'wechselhinweis':'kalendergrenze',
        grenze:'Exakter LB 200 mit Filter 110005. Die Anleitung nennt den Wechselhinweis ab 1.440 Betriebsstunden und spätestens sechs Monate; auffälliger Zustand kann früheren Wechsel erfordern.'};
    },
    example:{args:{bisher_stunden:1000,stunden_monat:220,vergangene_monate:3,sichtbefund:'unauffaellig'},
      expect:{hinweis_in_monaten:2,kalender_rest_monate:3,zuerst:'wechselhinweis'}},
  },
  {
    name:'saugwischer_gebraucht_startmaterial_budget',
    description:'Beim Kauf eines gebrauchten Nassreinigers die Kosten fehlender oder planmäßig auszutauschender Start-Verbrauchsteile ergänzen — Add verified consumable needs to the used wet cleaner start-up budget.',
    page:cleanerPage,
    properties:{
      geraet_eur:money('Gesamtpreis des Gebrauchtangebots ohne die folgenden Verbrauchsteile.'),
      walze_eur:money('Preis einer notwendigen richtigen Rolle; bei keinem Bedarf null Euro.'),
      filter_eur:money('Preis des notwendigen richtigen Filters; bei keinem Bedarf null Euro.'),
      mittel_eur:money('Ausgabe für benötigte freigegebene Lösung; bei keinem Bedarf null Euro.'),
      passung_geprueft:bool('Bestätigung für genau dieses Modell und die nötigen Teile liegt vor?'),
    },
    calculate({geraet_eur,walze_eur,filter_eur,mittel_eur,passung_geprueft}) {
      const parts=walze_eur+filter_eur+mittel_eur;
      return {verbrauchsteile_start_eur:passung_geprueft?rounded(parts):null,
        einstieg_gebraucht_eur:passung_geprueft?rounded(geraet_eur+parts):null,
        grenze:'Dient nur zur Kalkulation. Zustand, Reinigung, spätere Verfügbarkeit und Wiederverwendung vorhandener Teile separat klären.'};
    },
    example:{args:{geraet_eur:130,walze_eur:22,filter_eur:9,mittel_eur:10,passung_geprueft:true},
      expect:{verbrauchsteile_start_eur:41,einstieg_gebraucht_eur:171}},
  },
  {
    name:'saugwischer_handbuch_ace_xt_abgleichen',
    description:'F25 XT, die referenzierte ACE-Anleitung und andere F25-Varianten für einen konkreten Beleg auseinanderhalten — Distinguish the exact F25 XT variant from the related ACE manual and other trims.',
    page:cleanerPage,
    properties:{
      angebot:choice('Vollständig gelesene Modellvariante im Angebot.', 'f25_xt','f25_ace','f25_alt','f25_rt','f25_combo','f25_ultra','unbekannt'),
      quelle:choice('Beleg, den du für die konkrete Aussage vorliegen hast.', 'exakte_xt_anleitung','referenzierte_ace_anleitung','konkrete_modellbestaetigung','allgemeine_f25_angabe'),
      behauptung:choice('Worum geht es?', 'pflege_ablauf','ersatzteil','bodenfreigabe'),
    },
    calculate({angebot,quelle,behauptung}) {
      const record=angebot==='f25_xt'&&(quelle==='exakte_xt_anleitung'||quelle==='konkrete_modellbestaetigung');
      const bounded=angebot==='f25_xt'&&quelle==='referenzierte_ace_anleitung'&&behauptung==='pflege_ablauf';
      return {belegstatus:record?'exakten_beleg_am_detail_pruefen':bounded?'ace_pflege_als_verweis':'exakte_ausfuehrung_nachweisen',
        grenze:'Die genannte ACE-Unterlage belegt keine pauschale XT-Ersatzteil- oder Bodenfreigabe; den Inhalt der exakten Anleitung immer lesen.'};
    },
    example:{args:{angebot:'f25_xt',quelle:'referenzierte_ace_anleitung',behauptung:'ersatzteil'},
      expect:{belegstatus:'exakte_ausfuehrung_nachweisen'}},
  },
  {
    name:'klima_zubehoerbudget_verteilreserve',
    description:'Ein Preislimit auf bereits bestätigte Klima-Zubehörteile und die noch ungeklärten Positionen aufteilen — Partition an accessory budget into verified quotes and remaining allowance.',
    page:coolingAccessories,
    properties:{
      budget_eur:money('Eigenes Gesamtbudget für notwendiges Zubehör in Euro.'),
      feste_teile_eur:money('Summe der bereits passenden und bepreisten Teile.'),
      reserviert_eur:money('Betrag für bekannte Nebenkosten und Montagebedarf.'),
      offene_teile:number('Anzahl weiterer noch nicht bepreister notwendiger Positionen.',1,20),
    },
    calculate({budget_eur,feste_teile_eur,reserviert_eur,offene_teile}) {
      if(!Number.isInteger(offene_teile)) throw new RangeError('Offene Positionen');
      const open=budget_eur-feste_teile_eur-reserviert_eur;
      return {rest_eur:rounded(open),gleich_verteilte_obergrenze_pro_offenem_teil_eur:open>=0?rounded(open/offene_teile):null,
        grenze:'Gleichverteilung ist ein Einkaufsrahmen. Die Rechnung bestätigt weder Passung noch tatsächliche Zubehörpreise.'};
    },
    example:{args:{budget_eur:75,feste_teile_eur:29,reserviert_eur:10,offene_teile:2},
      expect:{rest_eur:36,gleich_verteilte_obergrenze_pro_offenem_teil_eur:18}},
  },
  {
    name:'angebote_gueltigkeitsfenster_ueberschneidung',
    description:'Den gemeinsamen Zeitraum zweier schriftlich befristeter Geräteangebote für den direkten Vergleich finden — Find the overlap between two confirmed quote-validity windows.',
    page:methodPage,
    properties:{
      beginn_a:days('Erster ausgewiesener Gültigkeitstag für A, gezählt ab demselben Stichtag.'),
      ende_a:days('Letzter ausgewiesener Gültigkeitstag für A einschließlich.'),
      beginn_b:days('Erster ausgewiesener Gültigkeitstag für B, gleicher Stichtag.'),
      ende_b:days('Letzter ausgewiesener Gültigkeitstag für B einschließlich.'),
      schriftlich:bool('Beide Anbieter nennen diese Zeiträume ausdrücklich für die konkreten Angebote?'),
    },
    calculate({beginn_a,ende_a,beginn_b,ende_b,schriftlich}) {
      if (![beginn_a,ende_a,beginn_b,ende_b].every(Number.isInteger)||ende_a<beginn_a||ende_b<beginn_b) {
        throw new RangeError('Gültigkeitszeitraum');
      }
      const start=Math.max(beginn_a,beginn_b), end=Math.min(ende_a,ende_b);
      return {vergleichsfenster:schriftlich&&start<=end?{ab_tag:start,bis_tag:end}:null,
        gemeinsame_tage:schriftlich?Math.max(0,end-start+1):null,
        grenze:'Ein belegtes gemeinsames Preisfenster ist keine Zusage für Bestand, Liefertermin oder ausnahmslose Bindung. Aktuelles Angebot vor Kauf prüfen.'};
    },
    example:{args:{beginn_a:0,ende_a:4,beginn_b:3,ende_b:8,schriftlich:true},
      expect:{vergleichsfenster:{ab_tag:3,bis_tag:4},gemeinsame_tage:2}},
  },
  {
    name:'geraete_label_rundung_abstand',
    description:'Feststellen, ob die bekannte Anzeigerundung eine kleine Differenz zwischen vergleichbaren Verbrauchswerten erklären kann — Check whether report rounding alone could explain a small difference between two comparable labels.',
    page:costPage,
    properties:{
      a_kwh:number('Abgelesener Energiekennwert A auf der gleichen Bezugsbasis.',0,20000),
      b_kwh:number('Abgelesener Energiekennwert B.',0,20000),
      schritt_a_kwh:number('Belegte Rundungsstufe für A in kWh.',0,1000),
      schritt_b_kwh:number('Belegte Rundungsstufe für B in kWh.',0,1000),
      basis_gleich:bool('Gleiche Prüfbasis und Rundung auf den jeweils nächsten Schritt belegt?'),
    },
    calculate({a_kwh,b_kwh,schritt_a_kwh,schritt_b_kwh,basis_gleich}) {
      const low=Math.max(0,a_kwh-schritt_a_kwh/2)-(b_kwh+schritt_b_kwh/2);
      const high=a_kwh+schritt_a_kwh/2-Math.max(0,b_kwh-schritt_b_kwh/2);
      return {kleinste_differenz_a_minus_b_kwh:basis_gleich?rounded(low):null,
        groesste_differenz_a_minus_b_kwh:basis_gleich?rounded(high):null,
        richtung_durch_rundung_offen:basis_gleich?low<=0&&high>=0:null,
        grenze:'Nur mathematische Rundungsbreite; Prüftoleranzen, abweichende Prüfungen und eigener Verbrauch sind nicht enthalten.'};
    },
    example:{args:{a_kwh:101,b_kwh:100,schritt_a_kwh:2,schritt_b_kwh:2,basis_gleich:true},
      expect:{kleinste_differenz_a_minus_b_kwh:-1,groesste_differenz_a_minus_b_kwh:3,richtung_durch_rundung_offen:true}},
  },
  {
    name:'luftreiniger_cadr_wert_pruefvergleich',
    description:'Veröffentlichte CADR-Werte nur für übereinstimmende Partikelkategorie, Stufe und Prüfbasis vergleichen — Check comparability of advertised CADR for the required particle category and operating setting.',
    page:purifierPage,
    properties:{
      a_m3_h:number('Ausgewiesener Partikel-CADR A in Kubikmeter pro Stunde.',0,3000),
      b_m3_h:number('Ausgewiesener Partikel-CADR B in Kubikmeter pro Stunde.',0,3000),
      partikel_gleich:bool('Sind die Partikelkategorien der zwei Werte gleich?'),
      stufe_gleich:bool('Betreffen beide Werte die zu vergleichende Betriebsstufe?'),
      methode_gleich:bool('Ist die Prüfmethode für beide Werte vergleichbar dokumentiert?'),
    },
    calculate({a_m3_h,b_m3_h,partikel_gleich,stufe_gleich,methode_gleich}) {
      const offen=Object.entries({partikel_gleich,stufe_gleich,methode_gleich}).filter(([,v])=>!v).map(([k])=>k);
      return {offen,differenz_a_minus_b_m3_h:offen.length?null:rounded(a_m3_h-b_m3_h),
        grenze:'Partikel-CADR ist weder ein Geruchs-Abscheidebeleg noch eine Garantie für die Luftqualität in einem konkreten Raum.'};
    },
    example:{args:{a_m3_h:230,b_m3_h:210,partikel_gleich:false,stufe_gleich:true,methode_gleich:true},
      expect:{offen:['partikel_gleich'],differenz_a_minus_b_m3_h:null}},
  },
  {
    name:'geraet_verpackungsmass_datenblatt_abgrenzen',
    description:'Bei einem Platzvergleich sicherstellen, dass Maße des ausgerichteten Geräts statt Versandkartons oder ungeprüfter Händlermaße verwendet werden — Separate unpacked operating dimensions from carton measurements before a buying shortlist.',
    page:productPage,
    properties:{
      fach_breite_cm:number('Breite am geprüften vorgesehenen Platz in Zentimetern.',0,1500),
      mass_cm:number('Abgelesene Breite in Zentimetern.',0.1,1500),
      dimensionsquelle:choice('Auf die Angabe zutreffender Kontext.', 'betrieb_ausgerichtet','verpackung','unspezifisch'),
      erforderlicher_freiraum_cm:number('Für diese Seite belegte Summe der zusätzlichen Freiräume in Zentimetern.',0,500),
      freiraum_belegt:bool('Freiraum und Messrichtung aus der konkreten Anleitung abgeglichen?'),
    },
    calculate({fach_breite_cm,mass_cm,dimensionsquelle,erforderlicher_freiraum_cm,freiraum_belegt}) {
      const useful=dimensionsquelle==='betrieb_ausgerichtet'&&freiraum_belegt;
      return {platzreserve_cm:useful?rounded(fach_breite_cm-mass_cm-erforderlicher_freiraum_cm):null,
        offen:useful?null:dimensionsquelle==='verpackung'?'geraetebreite_statt_karton_pruefen':'betriebsmasse_und_freiraum_pruefen',
        grenze:'Prüft nur die Breite in der gemessenen Richtung und ersetzt weder den Abgleich der anderen Dimensionen noch eine Montagefreigabe.'};
    },
    example:{args:{fach_breite_cm:50,mass_cm:44,dimensionsquelle:'verpackung',erforderlicher_freiraum_cm:2,freiraum_belegt:true},
      expect:{platzreserve_cm:null,offen:'geraetebreite_statt_karton_pruefen'}},
  },
  {
    name:'angebot_rabatt_ungeplante_fuellerkosten',
    description:'Einen belegten Rabatt gegen zusätzlich nötigen, ungeplanten Warenkorbwert aufrechnen — Test a coupon against items you would not otherwise buy.',
    page:methodPage,
    properties:{
      sollkorb_eur:money('Warenwert des tatsächlich geplanten Einkaufs ohne Versand.'),
      mindestwert_eur:money('Belegter Mindestwarenwert für genau diesen Rabatt.'),
      zusatz_eur:money('Kosten der erforderlichen Zusatzartikel, die nicht auf dem Einkaufsplan waren.'),
      rabatt_eur:money('Gesamtrabatt, der laut Bedingungen für den so gefüllten Korb gilt.'),
      bedingungen_geprueft:bool('Artikelberechtigung, Rabattbetrag und unterschiedliche Versandkosten geprüft; Versandkosten sind in beiden Fällen gleich?'),
    },
    calculate({sollkorb_eur,mindestwert_eur,zusatz_eur,rabatt_eur,bedingungen_geprueft}) {
      const eligible=sollkorb_eur+zusatz_eur>=mindestwert_eur;
      if (bedingungen_geprueft&&eligible&&rabatt_eur>sollkorb_eur+zusatz_eur) throw new RangeError('Rabatt über Warenkorbwert');
      return {fehlender_wert_eur:rounded(Math.max(0,mindestwert_eur-sollkorb_eur)),
        mehrbetrag_durch_aktion_eur:bedingungen_geprueft&&eligible?rounded(zusatz_eur-rabatt_eur):null,
        grenze:'Gleicher Versand vorausgesetzt. Ungeplante Extras als Ausgabe rechnen. Händlerbedingungen und Endpreis vergleichen.'};
    },
    example:{args:{sollkorb_eur:45,mindestwert_eur:60,zusatz_eur:18,rabatt_eur:10,bedingungen_geprueft:true},
      expect:{fehlender_wert_eur:15,mehrbetrag_durch_aktion_eur:8}},
  },
  {
    name:'kaufangebot_rueckgabe_szenario_budget',
    description:'Maximale eigene Kosten eines ausdrücklich kalkulierten Rückgabe-Szenarios mit neuem Kauf gegenüber dem direkten passenden Kauf berechnen — Estimate a return-and-rebuy budget from confirmed fees and refund assumptions.',
    page:methodPage,
    properties:{
      zahlung_eur:money('Tatsächlich im Szenario zu zahlender Gesamtbetrag für den ersten Kauf.'),
      erstattung_eur:money('Unter diesen Bedingungen belegter Erstattungsbetrag.'),
      ruecksendung_eur:money('Eigene belegte Rückgabekosten zusätzlich zur ersten Zahlung.'),
      ersatz_eur:money('Bestätigte Gesamtkosten der Alternative.'),
      kosten_belegt:bool('Rückgabebedingungen, Erstattung und Zusatzkosten für das genaue Angebot bekannt?'),
    },
    calculate({zahlung_eur,erstattung_eur,ruecksendung_eur,ersatz_eur,kosten_belegt}) {
      if (erstattung_eur>zahlung_eur) throw new RangeError('Erstattung über Zahlung');
      const loss=zahlung_eur-erstattung_eur+ruecksendung_eur;
      return {verbleibende_rueckgabekosten_eur:kosten_belegt?rounded(loss):null,
        ersatzpfad_gesamt_eur:kosten_belegt?rounded(loss+ersatz_eur):null,
        grenze:'Reines Kostenszenario mit bestätigten Angaben, keine Aussage über Rückgaberechte, Genehmigung oder tatsächliche Auszahlung.'};
    },
    example:{args:{zahlung_eur:230,erstattung_eur:215,ruecksendung_eur:12,ersatz_eur:250,kosten_belegt:true},
      expect:{verbleibende_rueckgabekosten_eur:27,ersatzpfad_gesamt_eur:277}},
  },
  {
    name:'oskar_luftbefeuchter_zielstufe_dokumentiert',
    description:'Eine gewünschte feste Zielstufe mit der dokumentierten Regelung von Oskar oder Oskar little abgleichen — Check whether Oskar or Oskar little documents the requested target-humidity control setting.',
    page:humidifierPage,
    properties:{
      modell:choice('Vollständig bestätigtes Modell im Angebot.', 'oskar_o020','oskar_little_o060','unbekannt'),
      gewuenscht:number('Gewünschte dokumentierte Zielstufe in relativen Prozent; keine Empfehlung.',0,100),
      automatische_regelung_noetig:bool('Ist automatische Zielstufenregelung eine feste Voraussetzung?'),
    },
    calculate({modell,gewuenscht,automatische_regelung_noetig}) {
      const options=modell==='oskar_o020'?[40,45,50,55]:modell==='oskar_little_o060'?[]:null;
      const exists=options?options.includes(gewuenscht):null;
      return {dokumentierte_zielstufen_prozent:options,gewuenschte_stufe_dokumentiert:exists,
        faktische_anforderung_erfuellt:automatische_regelung_noetig?exists:null,
        grenze:'Die Zielstufe ist kein gemessener Raumwert. Keine Empfehlung für bestimmte Raumfeuchte. Oskar little verlangt eine getrennte Messung und manuelle Regelung.'};
    },
    example:{args:{modell:'oskar_o020',gewuenscht:45,automatische_regelung_noetig:true},
      expect:{dokumentierte_zielstufen_prozent:[40,45,50,55],faktische_anforderung_erfuellt:true}},
  },
  {
    name:'kuehltechnik_varianten_beleg_inverter',
    description:'Ob eine behauptete Leistungsregelung wirklich für die angebotene Klimageräte-Variante beschrieben ist, von Formfaktor und Werbewort trennen — Qualify evidence for inverter modulation without inferring it from split versus monoblock.',
    page:'/guide/delonghi-pinguino-vergleich.html',
    properties:{
      angebotsform:choice('Bauform des angebotenen Geräts.', 'split','monoblock','unbekannt'),
      modell_gleich:bool('Gilt das technische Dokument genau für den angebotenen Artikel und Markt?'),
      beschreibung:choice('Wortlaut der technischen Unterlage.', 'drehzahlregelung_beschrieben','nur_werbebegriff','ein_aus_beschrieben','nicht_genannt'),
    },
    calculate({angebotsform,modell_gleich,beschreibung}) {
      return {bauform:angebotsform,drehzahlregelung_dokumentiert:modell_gleich&&beschreibung==='drehzahlregelung_beschrieben',
        naechster_schritt:modell_gleich&&beschreibung==='drehzahlregelung_beschrieben'?'teillastdaten_bei_passenden_bedingungen_pruefen':'exakte_technische_beschreibung_pruefen',
        grenze:'Bauform und Regelprinzip allein beziffern weder Stromkosten noch Lautstärke; dokumentierte Betriebsdaten sind separat nötig.'};
    },
    example:{args:{angebotsform:'split',modell_gleich:true,beschreibung:'nur_werbebegriff'},
      expect:{drehzahlregelung_dokumentiert:false,naechster_schritt:'exakte_technische_beschreibung_pruefen'}},
  },
  {
    name:'klima_alternativen_gemeinsames_ausschlusskriterium',
    description:'Für zwei Klimageräte-Alternativen prüfen, welche wegen desselben konkret dokumentierten Aufstellungsbedarfs aus der Auswahl fallen — Compare two alternatives against one actual non-negotiable setup requirement.',
    page:climateAlternatives,
    properties:{
      notwendigkeit:choice('Ein einziges zwingendes Kriterium am vorgesehenen Platz.', 'ohne_aussenteil','verlaengerung_nicht_erforderlich','entwaesserung_vorhanden','fensterweg_passend'),
      option_a:choice('Beleglage für genau dieses Kriterium bei A.', 'bestaetigt','widersprochen','offen'),
      option_b:choice('Beleglage für genau dieses Kriterium bei B.', 'bestaetigt','widersprochen','offen'),
    },
    calculate({notwendigkeit,option_a,option_b}) {
      const passend=[], offen=[], ausgeschlossen=[];
      for(const [id,status] of [['a',option_a],['b',option_b]]) {
        (status==='bestaetigt'?passend:status==='offen'?offen:ausgeschlossen).push(id);
      }
      return {kriterium:notwendigkeit,passend,offen,ausgeschlossen,
        grenze:'Nur ein vom Käufer belegtes Kriterium, Angebote und sonstige Einsatzbedingungen separat prüfen. Keine Montage-, Elektro- oder Gebäudefreigabe.'};
    },
    example:{args:{notwendigkeit:'ohne_aussenteil',option_a:'widersprochen',option_b:'offen'},
      expect:{passend:[],offen:['b'],ausgeschlossen:['a']}},
  },
  {
    name:'geblaese_leistungsangabe_betriebsart',
    description:'Bei Klimageräten auf einen Verbrauchswert für die richtige Betriebsart achten und unklare Werte vor einer Kostenschätzung aussortieren — Identify whether an input-power figure refers to fan-only or compressor cooling.',
    page:'/guide/klimaanlage-stromkosten.html',
    properties:{
      benoetigt:choice('Betriebsart, für die geplant werden soll.', 'luefter','kuehlen'),
      ausgewiesen:choice('Betriebsart laut Quelle für diesen Leistungswert.', 'luefter','kuehlen','kombinationswert','unbekannt'),
      wert_w:number('Eingangsleistung laut Prüf- oder Modellunterlage in Watt.',0,8000),
      bezug_geprueft:bool('Ist elektrische Aufnahme für dieses Modell bestätigt statt abgegebener Kühlleistung?'),
    },
    calculate({benoetigt,ausgewiesen,wert_w,bezug_geprueft}) {
      const valid=bezug_geprueft&&benoetigt===ausgewiesen;
      return {planbare_aufnahme_w:valid?wert_w:null,offen:valid?null:!bezug_geprueft?'aufnahmeleistung_pruefen':'wert_fuer_gewuenschte_betriebsart_beschaffen',
        grenze:'Dokumentierte Aufnahme für genau die Betriebsart. Daraus folgt ohne gemessene Laufzeit kein Verbrauch im eigenen Raum.'};
    },
    example:{args:{benoetigt:'kuehlen',ausgewiesen:'luefter',wert_w:45,bezug_geprueft:true},
      expect:{planbare_aufnahme_w:null,offen:'wert_fuer_gewuenschte_betriebsart_beschaffen'}},
  },
  {
    name:'ersatzteil_erneuerung_passung_und_einsatzzeit',
    description:'Vergleichen, ob ein altes Gerät mit einem bestätigten Ersatzteil früher wieder nutzbar wäre als der bereits geprüfte Ersatz — Compare repair-part lead time and setup time with a confirmed replacement path.',
    page:'/familienwerkstatt.html',
    properties:{
      teil_tage:days('Bestätigte Lieferzeit des exakt passenden Ersatzteils.'),
      einbau_tage:days('Zusätzliche Zeit im Reparaturangebot bis zur Nutzbarkeit.'),
      ersatz_bereit_tage:days('Bestätigte Zeit bis zum einsatzbereiten Ersatzgerät.'),
      wechsel_belegt:bool('Passung, Umsetzbarkeit und Termin der Reparatur für das konkrete Gerät wurden geprüft?'),
    },
    calculate({teil_tage,einbau_tage,ersatz_bereit_tage,wechsel_belegt}) {
      return {geplanter_reparaturweg_tage:wechsel_belegt?teil_tage+einbau_tage:null,
        reparatur_minus_ersatz_tage:wechsel_belegt?teil_tage+einbau_tage-ersatz_bereit_tage:null,
        grenze:'Rechnet zugesagte beziehungsweise dokumentierte Zeitangaben zusammen. Keine Selbstreparaturanleitung oder Zusage von Erfolg und Liefertermin.'};
    },
    example:{args:{teil_tage:7,einbau_tage:3,ersatz_bereit_tage:6,wechsel_belegt:true},
      expect:{geplanter_reparaturweg_tage:10,reparatur_minus_ersatz_tage:4}},
  },
];
