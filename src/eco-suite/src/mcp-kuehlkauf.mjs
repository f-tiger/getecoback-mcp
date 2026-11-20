const page = '/geraete-austausch-rechner.html';
const eu = 'https://eur-lex.europa.eu/eli/reg_del/2019/2016/2023-09-30';
const commission = 'https://energy-efficient-products.ec.europa.eu/product-list/fridges-and-freezers_en';
const rescale = 'https://energy-efficient-products.ec.europa.eu/faqs-0/how-do-i-compare-products-still-have-old-label-those-have-received-new-label_en';
const boschSheet = 'https://media3.bsh-group.com/Documents/eudatasheet/de-DE/KGN39VXCT.pdf';
const bosch = 'https://www.bosch-home.com/de/de/product/kuehlen-gefrieren/kuehl-gefrier-kombinationen/freistehende-kuehl-gefrier-kombinationen-gefrierteil-unten/KGN39VXCT';
const buyer = 'https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/so-finden-sie-den-passenden-kuehlschrank-10573';
const checked = '2026-11-20';
const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const pick = (description, ...values) => ({type:'string', description, enum:values});
const flag = description => ({type:'boolean', description});
const status = description => pick(description, 'belegt', 'ausgeschlossen', 'offen');
const litre = description => number(description, 0, 1500);
const kwh = description => number(description, 0, 5000);
const degrees = description => number(description, -40, 70);
const minutes = description => number(description, 0, 10080);
const letters = description => pick(description, 'A','B','C','D','E','F','G');
const round = value => Math.round(value*100)/100;
const climate = {SN:[10,32], N:[16,32], ST:[16,38], T:[16,43]};
const starTarget = {null_sterne:0, ein_stern:-6, zwei_sterne:-12, drei_sterne:-18, vier_sterne:-18};
const exactModel = 'KGN39VXCT';
const exactChoice = description => pick(description, exactModel, 'anderes_modell', 'offen');
const regime = description => pick(description, 'eu_2019_2016', 'alt_a_plus', 'offen');
const range = (start, end) => {
  if (start>end) throw new RangeError('Oberes und unteres Ende in derselben Einheit und in richtiger Reihenfolge angeben.');
};
const source = (quelle, bezug) => ({quelle, bezug, geprueft_am:checked});
function entry(name, description, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example:{args, expect}};
}

export const kuehlkauf = [
  entry('kuehlschrank_klimaklasse_sn_n_st_t_typenschild',
    'Entschlüsselt SN, N, ST und T als Umgebungstemperaturen des Kühlschranks und hält ungesicherte Kombinationen offen — Decode refrigerator climate classes and retain uncertainty for a paired badge',
    {kuerzel:pick('Klimaangabe laut Kühlschrankunterlage, SN–T nur wählen, wenn genau diese Paarung vorliegt.', 'SN','N','ST','T','SN_T','offen'),
      modellbereich_aus_datenblatt:flag('Bei einer Paarung sind die exakten beiden zulässigen Endpunkte separat im Produktdatenblatt des Modells bestätigt.'),
      untergrenze_bei_paarung_c:degrees('Dokumentierte Mindest-Umgebungstemperatur, nur für die bestätigte Paarung ausgewertet.'),
      obergrenze_bei_paarung_c:degrees('Dokumentierte Höchst-Umgebungstemperatur, nur für die bestätigte Paarung ausgewertet.')},
    ({kuerzel,modellbereich_aus_datenblatt,untergrenze_bei_paarung_c,obergrenze_bei_paarung_c})=>{
      if (kuerzel==='SN_T'&&modellbereich_aus_datenblatt) range(untergrenze_bei_paarung_c,obergrenze_bei_paarung_c);
      const einzelklasse=climate[kuerzel]??null;
      const modellbereich=kuerzel==='SN_T'&&modellbereich_aus_datenblatt ? [untergrenze_bei_paarung_c,obergrenze_bei_paarung_c] : null;
      return {normbereich_einzelklasse_c:einzelklasse,dokumentierter_modellbereich_c:modellbereich,
        beleg:source(eu,'Anhang IV Nr. 1 Buchstabe j'),hinweis:'Die Klimaklasse bezieht sich auf die Luft am Aufstellort und die Lagerbedingungen aller Fächer. Paarung und Bereich im genauen Datenblatt prüfen, bevor eine Standortentscheidung getroffen wird.'};
    },{kuerzel:'SN_T',modellbereich_aus_datenblatt:false,untergrenze_bei_paarung_c:10,obergrenze_bei_paarung_c:43},
    {normbereich_einzelklasse_c:null,dokumentierter_modellbereich_c:null}),

  entry('kuehlkombi_kgn39vxct_winterschaltung_belegt',
    'Prüft, ob eine angebotene Bosch KGN39VXCT für unbeheizte Räume eine ausgewiesene Winterschaltung hat — Verify the named fridge-freezer winter-setting claim against its German EU sheet',
    {modell:exactChoice('Genaue Modellkennung laut dem konkret ausgewählten deutschen Angebot.'),
      angeboten:status('Wird die Winterschaltung im vorliegenden Angebot ausdrücklich behauptet?')},
    ({modell,angeboten})=>{
      const match=modell===exactModel;
      return {winterschaltung_im_de_datenblatt:match?false:null,
        mindestumgebung_c:match?10:null,hoechstumgebung_c:match?43:null,
        angebotskonflikt:match&&angeboten!=='offen' ? angeboten==='belegt' : null,
        beleg:match?source(boschSheet,'Seite 1, Deutsches Produktdatenblatt vom 27.08.2026'):null,
        hinweis:'Die Winterschaltung ist ein eigenes Datenblattfeld. Auch wenn ein anderes Modell sie ausweist, den dokumentierten Standortbereich gesondert prüfen.'};
    },{modell:exactModel,angeboten:'belegt'},
    {winterschaltung_im_de_datenblatt:false,mindestumgebung_c:10,hoechstumgebung_c:43,angebotskonflikt:true}),

  entry('kuehlgefrier_kombi_kuehlvolumen_gefrierliter_mindestbedarf',
    'Prüft den gleichzeitig benötigten Kühl- und Gefrierfachinhalt einer Kühl-Gefrier-Kombination getrennt und findet den begrenzenden Teil — Screen two distinct fridge-freezer volume requirements at once',
    {kuehl_l:litre('Kühl- und Kaltlagerliter laut Label des exakten Modells.'),gefrier_l:litre('Tiefkühlliter laut Label desselben Modells.'),
      braucht_kuehl_l:litre('Gleichzeitig benötigter Kühl- und Kaltlagerinhalt nach bisheriger Haushaltsnutzung.'),
      braucht_gefrier_l:litre('Gleichzeitig benötigter Tiefkühlinhalt nach bisheriger Haushaltsnutzung.'),
      zwei_labelwerte_bestaetigt:flag('Beide Werte sind für dieses Gerät und dieselbe Konfiguration belegt. Bei nicht vorhandenem Fach ist null gesichert.')},
    ({kuehl_l,gefrier_l,braucht_kuehl_l,braucht_gefrier_l,zwei_labelwerte_bestaetigt})=>{
      const limits=[['kuehlen',round(kuehl_l-braucht_kuehl_l)],['gefrieren',round(gefrier_l-braucht_gefrier_l)]];
      return {reserve_kuehlliter:zwei_labelwerte_bestaetigt?limits[0][1]:null,reserve_gefrierliter:zwei_labelwerte_bestaetigt?limits[1][1]:null,
        nennvolumen_engpass:zwei_labelwerte_bestaetigt?limits.filter(([,reserve])=>reserve<0).map(([fach])=>fach):null,
        beleg:source(commission,'Felder 4 und 5 des Etiketts'),hinweis:'Eine Reserve in einem Bereich gleicht keinen Fehlbetrag im anderen aus. Große Behälter und tatsächliche Einteilung separat prüfen.'};
    },{kuehl_l:260,gefrier_l:103,braucht_kuehl_l:200,braucht_gefrier_l:120,zwei_labelwerte_bestaetigt:true},
    {reserve_kuehlliter:60,reserve_gefrierliter:-17,nennvolumen_engpass:['gefrieren']}),

  entry('kuehlschrank_drei_vier_sterne_einfrieren_fachtyp',
    'Liest das belegte Sternfach für Lagerung und geplantes Einfrieren frischer Ware, besonders den Unterschied zwischen drei und vier Sternen — Interpret a documented freezer compartment type before buying',
    {fachtyp:pick('Fachtyp aus Produktdatenblatt des exakten Modells.', 'null_sterne','ein_stern','zwei_sterne','drei_sterne','vier_sterne','offen'),
      bedarf_frische_ware:flag('Der Haushalt muss zusätzlich frische Ware einfrieren und nicht nur Tiefkühlware lagern.')},
    ({fachtyp,bedarf_frische_ware})=>({
      deklarierte_zieltemperatur_c:starTarget[fachtyp]??null,
      gefriervermoegen_als_fachanforderung:fachtyp==='offen'?null:fachtyp==='vier_sterne',
      vier_sterne_nachweis_fuer_plan:bedarf_frische_ware?(fachtyp==='offen'?'offen':fachtyp==='vier_sterne'?'belegt':'nicht_belegt'):'kein_frischgefrierbedarf_erfasst',
      beleg:source(eu,'Anhang I und Anhang IV Tabelle 3'),hinweis:'Drei und vier Sterne haben dieselbe Zieltemperatur von −18 °C. Das Vier-Sterne-Fach muss zusätzlich ein bestimmtes Gefriervermögen erfüllen. Eine Lagertemperatur allein liefert kein Modellvermögen und kein Urteil über Lebensmittel.'}),
    {fachtyp:'drei_sterne',bedarf_frische_ware:true},
    {deklarierte_zieltemperatur_c:-18,gefriervermoegen_als_fachanforderung:false,vier_sterne_nachweis_fuer_plan:'nicht_belegt'}),

  entry('kuehlschrank_zwei_sterne_abteil_eingebettet_volumen',
    'Klärt, ob ausgewiesene Zwei-Sterne-Liter zusätzlich zum Hauptfach zählen oder schon darin liegen — Reconcile compartment volume without double-counting a two-star subsection',
    {hauptfach_l:litre('Dokumentierter Rauminhalt des genannten Hauptfachs.'),zwei_sterne_l:litre('Separat genannte Liter des Zwei-Sterne-Bereichs.'),
      volumenbezug:pick('Die Fachübersicht lässt erkennen, wie die beiden angegebenen Volumen zueinander stehen.', 'im_hauptfachvolumen_enthalten','zwei_getrennte_volumenangaben','offen')},
    ({hauptfach_l,zwei_sterne_l,volumenbezug})=>{
      if(volumenbezug==='im_hauptfachvolumen_enthalten'&&zwei_sterne_l>hauptfach_l) throw new RangeError('Das eingeschlossene Teilvolumen kann das Hauptfachvolumen nicht überschreiten.');
      return {gesamt_nur_einmal_l:volumenbezug==='offen'?null:volumenbezug==='im_hauptfachvolumen_enthalten'?hauptfach_l:round(hauptfach_l+zwei_sterne_l),
        volumenbeziehung_offen:volumenbezug==='offen',beleg:source(eu,'Anhang I Zwei-Sterne-Abteil und Anhang V Fachparameter'),
        hinweis:'Ein Zwei-Sterne-Abteil kann Teil eines Drei- oder Vier-Sterne-Fachs sein. Addiere Liter nur, wenn die konkreten Werte als getrennte Volumen dokumentiert sind.'};
    },{hauptfach_l:100,zwei_sterne_l:15,volumenbezug:'im_hauptfachvolumen_enthalten'},
    {gesamt_nur_einmal_l:100,volumenbeziehung_offen:false}),

  entry('kuehlgeraet_verstellbarer_raumteiler_label_pruefstellung',
    'Ordnet Labelverbrauch und Labelvolumen bei einem verschiebbaren Fachtrenner der vorgesehenen Prüfstellung zu — Locate the test state of an adjustable-volume refrigerator divider',
    {volumen_zweier_faecher_gekoppelt:status('Der Nutzer kann mit einem Fachtrenner den relativen Rauminhalt dieser beiden Fächer verstellen.'),
      waermeres_fach_in_nutzung:pick('Position für das Fach mit höherer Zieltemperatur.', 'kleinster_raum','groesserer_raum','offen')},
    ({volumen_zweier_faecher_gekoppelt,waermeres_fach_in_nutzung})=>({
      eu_pruefstellung_waermeres_fach:volumen_zweier_faecher_gekoppelt==='belegt'?'kleinster_raum':null,
      raumteilerstellung_stimmt_ueberein:volumen_zweier_faecher_gekoppelt==='belegt'&&waermeres_fach_in_nutzung!=='offen'?waermeres_fach_in_nutzung==='kleinster_raum':null,
      beleg:source(eu,'Anhang IV Mess- und Berechnungsmethoden'),hinweis:'Die Prüfregel betrifft relativ zueinander einstellbare Fachvolumen. Ein versetzbarer Einlegeboden allein weist diese Funktion nicht nach. Aus der Einstufung folgt kein eigener Verbrauchswert.'}),
    {volumen_zweier_faecher_gekoppelt:'belegt',waermeres_fach_in_nutzung:'groesserer_raum'},
    {eu_pruefstellung_waermeres_fach:'kleinster_raum',raumteilerstellung_stimmt_ueberein:false}),

  entry('kuehlkombi_wechselzone_zugleich_kuehl_gefrierbedarf',
    'Verteilt ein ausdrücklich umschaltbares Kühlschrankfach bei gleichzeitigem Kühl- und Gefrierbedarf genau einer Funktion — Test mutual exclusivity of a convertible cooling zone at the buying stage',
    {kuehl_fest_l:litre('Für Kühlen fest belegte Liter ohne das Wechselfach.'),gefrier_fest_l:litre('Für Gefrieren fest belegte Liter ohne das Wechselfach.'),
      wechsel_l:litre('Laut exakter Unterlage in beiden Modi belegte gleiche Liter desselben Fachs.'),
      kuehlbedarf_l:litre('Eigener gleichzeitiger Kühlbedarf.'),gefrierbedarf_l:litre('Eigener gleichzeitiger Tiefkühlbedarf.'),
      wechselmodus_belegt:flag('Ein und dasselbe Fach ist in den genannten Modi abwechselnd belegbar, Volumen und Modus sind beim Hersteller bestätigt.')},
    ({kuehl_fest_l,gefrier_fest_l,wechsel_l,kuehlbedarf_l,gefrierbedarf_l,wechselmodus_belegt})=>({
      moegliche_einzelbelegungen:wechselmodus_belegt?[
        ['wechsel_fach_kuehlt',kuehl_fest_l+wechsel_l>=kuehlbedarf_l&&gefrier_fest_l>=gefrierbedarf_l],
        ['wechsel_fach_gefriert',kuehl_fest_l>=kuehlbedarf_l&&gefrier_fest_l+wechsel_l>=gefrierbedarf_l]
      ].filter(([,passt])=>passt).map(([belegung])=>belegung):null,
      beleg:source(eu,'Anhang V Fach mit variabler Temperatur'),hinweis:'Die beiden Modi gelten alternativ. Herstellerbereiche, Umschaltzeit und echte Behälterpassung müssen gesondert geprüft werden.'}),
    {kuehl_fest_l:150,gefrier_fest_l:50,wechsel_l:40,kuehlbedarf_l:170,gefrierbedarf_l:75,wechselmodus_belegt:true},
    {moegliche_einzelbelegungen:[]}),

  entry('kuehlschrank_luftschallemissionsklasse_db_schwellen',
    'Überprüft A bis D für EU-Kühlschrank-Luftschallemissionen und unterscheidet das besondere geräuscharme Kühlgerät — Read the noise class and special low-noise definition from the correct sound-power value',
    {wert_dba:number('Deklarierter Schallwert des Modells, falls bekannt.',0,120),
      wertbezug:pick('Bezugsgröße des angegebenen Werts.', 'schallleistung_re_1_pw','schalldruck_im_raum','offen'),
      dampfkompression:status('Dampfkompression ist für das exakt zugeordnete Gerät dokumentiert oder ausdrücklich ausgeschlossen.')},
    ({wert_dba,wertbezug,dampfkompression})=>{
      const declared=wertbezug==='schallleistung_re_1_pw';
      return {luftschallemissionsklasse:declared?(wert_dba<30?'A':wert_dba<36?'B':wert_dba<42?'C':'D'):null,
        geraeuscharmes_kuehlgeraet_im_sinn_der_verordnung:!declared?null:wert_dba>=27||dampfkompression==='belegt'?false:dampfkompression==='offen'?null:true,
        beleg:source(eu,'Anhang I und Anhang II Tabelle 2'),hinweis:'Schallleistung mit Bezugsleistung 1 pW ist ein Gerätewert. Raumpegel und Hörplatz benötigen eine eigene Beobachtung oder Messung.'};
    },{wert_dba:29,wertbezug:'schallleistung_re_1_pw',dampfkompression:'ausgeschlossen'},
    {luftschallemissionsklasse:'A',geraeuscharmes_kuehlgeraet_im_sinn_der_verordnung:false}),

  entry('kuehlkombi_kgn39vxct_led_effizienzklasse_geraet',
    'Ordnet C und G im deutschen Bosch-Datenblatt dem Kühlschrank oder seiner LED-Lichtquelle zu — Separate appliance and light-source efficiency ratings in an exact fiche',
    {modell:exactChoice('Modellkennung aus dem vorliegenden deutschen Angebot.'),
      feld:pick('Zu klärende Zeile des Produktdatenblatts.', 'geraete_effizienz','lichtquellenparameter','beide')},
    ({modell,feld})=>{
      const match=modell===exactModel;
      return {geraete_effizienzklasse:match&&feld!=='lichtquellenparameter'?'C':null,
        lichtquellen_effizienzklasse:match&&feld!=='geraete_effizienz'?'G':null,
        beleg:match?source(boschSheet,'Seiten 1–2, Deutsches Produktdatenblatt vom 27.08.2026'):null,
        hinweis:'Lichtquelle und Gesamtgerät haben getrennte Energieeffizienzparameter. Buchstaben des Lichts dürfen nicht als Geräteeffizienz übernommen werden.'};
    },{modell:exactModel,feld:'beide'},
    {geraete_effizienzklasse:'C',lichtquellen_effizienzklasse:'G'}),

  entry('kuehlschrank_altes_a_plus_label_neues_eu_label_vergleich',
    'Prüft beim Altgeräteersatz, ob die alte A-Plus-Skala direkt zur neuen Kühlschrank-Skala A bis G passt — Check label generations without cross-walking old and new efficiency letters',
    {alt_regime:regime('Gelesene Skala auf vorhandenem Altgerät.'),neu_regime:regime('Gelesene Skala auf dem ausgewählten Ersatzangebot.')},
    ({alt_regime,neu_regime})=>({
      gleiche_referenzskala:alt_regime==='offen'||neu_regime==='offen'?null:alt_regime===neu_regime,
      direkter_buchstabenvergleich:alt_regime==='offen'||neu_regime==='offen'?'skala_klaeren':alt_regime===neu_regime?'skala_gleich_geraetefunktion_pruefen':'keine_umrechnung_zwischen_skalen',
      beleg:source(rescale,'Methode und Schwellen bei Neuskalierung'),hinweis:'Mit der Neuskalierung änderten sich Prüf- und Berechnungsgrundlagen. Bei gemischten Angaben einen eigenen Altgeräte-Messwert und die neue deklarierte Jahresangabe getrennt kennzeichnen.'}),
    {alt_regime:'alt_a_plus',neu_regime:'eu_2019_2016'},
    {gleiche_referenzskala:false,direkter_buchstabenvergleich:'keine_umrechnung_zwischen_skalen'}),

  entry('kuehlschrank_effizienzklasse_gegen_absolute_jahres_kwh_rangfolge',
    'Erkennt, wenn der besser klassifizierte Kühlschrank in absoluten Jahres-kWh höher liegt, und hält die beiden Rangfolgen getrennt — Identify a fridge efficiency-class versus annual-energy ranking inversion',
    {a_klasse:letters('Energieeffizienzklasse von Gerät A auf der aktuellen EU-Skala.'),b_klasse:letters('Energieeffizienzklasse von Gerät B auf derselben aktuellen EU-Skala.'),
      a_kwh:kwh('Deklarierte Jahresenergie von A.'),b_kwh:kwh('Deklarierte Jahresenergie von B.'),
      grundlage_bestaetigt:flag('Beide Angaben stammen aus der aktuellen Regelung für dieselbe Produktgruppe und aus exakt zugeordneten Unterlagen.'),
      beide_funktionsprofile_passen:flag('Kühl- und Gefriervolumen und Anforderungen des Haushalts sind bei beiden Angeboten geprüft.')},
    ({a_klasse,b_klasse,a_kwh,b_kwh,grundlage_bestaetigt,beide_funktionsprofile_passen})=>{
      const rang=(a,b)=>a===b?'gleich':a<b?'a':'b';
      const effizienz=rang(a_klasse,b_klasse), energie=rang(a_kwh,b_kwh);
      return {bessere_effizienzklasse:grundlage_bestaetigt?effizienz:null,niedrigere_label_jahresenergie:grundlage_bestaetigt?energie:null,
        rangfolgen_kehren_sich_um:grundlage_bestaetigt?effizienz!=='gleich'&&energie!=='gleich'&&effizienz!==energie:null,
        labelvergleich_als_kaufgrundlage:grundlage_bestaetigt&&beide_funktionsprofile_passen,
        beleg:source(commission,'Effizienzindex und jährlicher Energieverbrauch'),hinweis:'Die Klasse stützt sich auf einen Effizienzindex und die Jahreszahl auf deklarierte absolute kWh. Einen Bedarf an größeren oder anderen Fächern zuerst klären.'};
    },{a_klasse:'B',b_klasse:'C',a_kwh:175,b_kwh:130,grundlage_bestaetigt:true,beide_funktionsprofile_passen:false},
    {bessere_effizienzklasse:'a',niedrigere_label_jahresenergie:'b',rangfolgen_kehren_sich_um:true,labelvergleich_als_kaufgrundlage:false}),

  entry('kuehlschrank_eulabel_prueftemperatur_16_32_haushaltsprognose',
    'Liest die Standard-Umgebungstemperaturen hinter dem Jahreslabel eines Kühlschranks und hält eine Wohnungsprognose offen — Identify label test conditions without inferring annual energy at a household temperature',
    {art:pick('Gerätekategorie für das Prüfverfahren laut Produktdatenblatt.', 'regulaeres_kuehlgeraet','geraeuscharmes_kuehlgeraet','offen'),
      standort_c:degrees('Beschriebene typische Umgebungstemperatur am gewünschten Standort, keine Temperatur im Kühlfach.')},
    ({art,standort_c})=>({
      bekannte_norm_pruefpunkte_c:art==='regulaeres_kuehlgeraet'?[16,32]:art==='geraeuscharmes_kuehlgeraet'?[25]:null,
      standort_zwischen_norm_pruefpunkten:art==='regulaeres_kuehlgeraet'?standort_c>=16&&standort_c<=32:null,
      wohnungsprognose_kwh:null,beleg:source(eu,'Anhang IV Nr. 3, jährlicher Energieverbrauch'),
      hinweis:'Die Prüfbedingungen ersetzen keinen erlaubten Standortbereich. Auch zwischen den Prüfpunkten lässt sich aus einem Jahreslabel allein kein eigener Wert interpolieren.'}),
    {art:'regulaeres_kuehlgeraet',standort_c:20},
    {bekannte_norm_pruefpunkte_c:[16,32],standort_zwischen_norm_pruefpunkten:true,wohnungsprognose_kwh:null}),

  entry('kuehlschrank_eulabel_fachliter_erst_summieren_dann_runden',
    'Erklärt Literabweichungen zwischen zwei EU-Fachzeilen und dem zugehörigen Labelpiktogramm durch Runden erst nach der Summe — Reconcile two compartment values with the rounded EU label total',
    {gruppe:pick('Gemeinsame Piktogrammgruppe beider Fachzeilen.', 'tiefkuehlfaecher','kaltlager_und_kuehlfaecher'),
      fach_a_l:litre('Liter der ersten Fachzeile aus dem Datenblatt.'),fach_b_l:litre('Liter der zweiten Fachzeile aus demselben Datenblatt.'),
      etikett_l:litre('Ganze Zahl am dazugehörigen Piktogramm.'),
      vollstaendige_gruppe:flag('Die beiden Werte sind überschneidungsfrei, decken die Gruppe ab und betreffen dieselbe Modellkonfiguration.')},
    ({gruppe,fach_a_l,fach_b_l,etikett_l,vollstaendige_gruppe})=>{
      if(!Number.isInteger(etikett_l)) throw new RangeError('Das Etikett gibt die Summe in ganzen Litern an.');
      const summe=fach_a_l+fach_b_l;
      return {gruppe,erwartete_anzeige_l:vollstaendige_gruppe?Math.round(summe):null,
        abweichung_durch_labelrundung_vereinbar:vollstaendige_gruppe?Math.round(summe)===etikett_l:null,
        beleg:source(eu,'Anhang III Nr. 1.2 Punkte VII und VIII'),hinweis:'Einzelne Fachliter vor dem Addieren nicht runden. Bei fehlenden oder überlappenden Fachzeilen ist die Kontrolle offen.'};
    },{gruppe:'kaltlager_und_kuehlfaecher',fach_a_l:141.6,fach_b_l:39.6,etikett_l:181,vollstaendige_gruppe:true},
    {erwartete_anzeige_l:181,abweichung_durch_labelrundung_vereinbar:true}),

  entry('kuehlkombi_kgn39vxct_vitafresh_kaltlagerfach_eulabel',
    'Ordnet VitaFresh-Werbung und das gesonderte Kaltlagerfach-Feld der deutschen KGN39VXCT dem richtigen Dokument zu — Distinguish a marketed refrigerator drawer from a declared regulatory compartment',
    {modell:exactChoice('Vollständig gelesene deutsche Modellkennung.'),
      beworbene_schublade:status('Das eingegebene Angebot ordnet die VitaFresh-Schublade ausdrücklich genau diesem Modell zu.')},
    ({modell,beworbene_schublade})=>{
      const match=modell===exactModel;
      return {modellseite_nennt_vitafresh:match?true:null,offizielles_datenblatt_separates_kaltlagerfach:match?false:null,
        werbebegriff_und_fachtyp_getrennt_lesen:match&&beworbene_schublade!=='offen'?beworbene_schublade==='belegt':null,
        beleg:match?[source(bosch,'Deutsche Modellseite, Highlights'),source(boschSheet,'Seite 2, Lagerfach für frische Lebensmittel 260 l und Kaltlagerfach Nein')]:null,
        hinweis:'Die beworbene Schublade ist kein zusätzliches ausgeschriebenes Fachvolumen. Kein Rückschluss auf garantierte Haltbarkeit oder gemessene Temperaturen.'};
    },{modell:exactModel,beworbene_schublade:'belegt'},
    {modellseite_nennt_vitafresh:true,offizielles_datenblatt_separates_kaltlagerfach:false,werbebegriff_und_fachtyp_getrennt_lesen:true}),

  entry('kuehlkombi_kgn39vxct_kuehlkreislauf_getrennt_strom',
    'Prüft beim KGN39VXCT, ob zwei Kühlkreisläufe getrennte Einstellungen belegen und ob man einen Bereich einzeln abschalten kann — Interpret what the two documented cooling circuits actually establish',
    {modell:exactChoice('Exakt bezeichnete deutsche Kühl-Gefrier-Kombination.'),
      anforderung:pick('Für den Haushalt notwendige Eigenschaft.', 'getrennte_temperatureinstellung','einzeln_abschaltbar','unabhaengige_stromversorgung')},
    ({modell,anforderung})=>({
      zwei_kuehlkreislaeufe_in_modellbeschreibung:modell===exactModel?true:null,
      anforderung_aus_modellbeschreibung:modell===exactModel&&anforderung==='getrennte_temperatureinstellung'?'belegt':'offen',
      beleg:modell===exactModel?source(bosch,'Deutsche Modellseite, Zwei Kühlkreisläufe'):null,
      hinweis:'Die Modellbeschreibung belegt getrennte Steuerbarkeit. Abschaltbarkeit, Anzahl der Verdichter oder Weiterbetrieb bei Ausfall daraus nicht ableiten.'}),
    {modell:exactModel,anforderung:'einzeln_abschaltbar'},
    {zwei_kuehlkreislaeufe_in_modellbeschreibung:true,anforderung_aus_modellbeschreibung:'offen'}),

  entry('kuehlkombi_geraetetausch_uebergangsfenster_kuehl_gefrier',
    'Findet beim Kühlschranktausch die Zeit ohne belegten Kühl- und Gefrierersatz getrennt, wenn das Übergangsgerät nur eine Aufgabe übernimmt — Flag independent cold-storage coverage gaps through replacement',
    {alt_ende_min:minutes('Bestätigtes Ende der Verfügbarkeit des alten Geräts seit vereinbartem Zeitnullpunkt.'),
      neu_bereit_min:minutes('Bestätigte Verfügbarkeit des neuen Geräts laut passender Anleitung und tatsächlichem Ablauf, gleicher Zeitnullpunkt.'),
      uebergang_ab_min:minutes('Verfügbarkeit des Übergangsgeräts beginnt, gleicher Zeitnullpunkt.'),
      uebergang_bis_min:minutes('Verfügbarkeit des Übergangsgeräts endet, gleicher Zeitnullpunkt.'),
      kuehlen_ueberbrueckt:status('Übergangsgerät deckt Kühlbedarf in diesem Zeitfenster nach überprüfter Kapazität und Zugriff.'),
      gefrieren_ueberbrueckt:status('Übergangsgerät deckt Gefrierbedarf in diesem Zeitfenster nach überprüfter Kapazität und Zugriff.')},
    ({alt_ende_min,neu_bereit_min,uebergang_ab_min,uebergang_bis_min,kuehlen_ueberbrueckt,gefrieren_ueberbrueckt})=>{
      range(uebergang_ab_min,uebergang_bis_min);
      const luecke=Math.max(0,neu_bereit_min-alt_ende_min);
      const deckung=Math.max(0,Math.min(neu_bereit_min,uebergang_bis_min)-Math.max(alt_ende_min,uebergang_ab_min));
      const offen=wert=>luecke===0||deckung===0?luecke:wert==='offen'?null:wert==='belegt'?luecke-deckung:luecke;
      return {zeit_ohne_altes_oder_neues_geraet_min:luecke,kuehlen_nicht_abgedeckt_min:offen(kuehlen_ueberbrueckt),
        gefrieren_nicht_abgedeckt_min:offen(gefrieren_ueberbrueckt),beleg:source(commission,'Getrennte Fachfunktionen und Lagerraum. Die Zeiten kommen vom Haushalt.'),
        hinweis:'Auswertung der verfügbaren Ausstattung. Keine Aussage über erlaubte Unterbrechung, Temperatur oder Lebensmittelsicherheit.'};
    },{alt_ende_min:60,neu_bereit_min:180,uebergang_ab_min:90,uebergang_bis_min:200,kuehlen_ueberbrueckt:'belegt',gefrieren_ueberbrueckt:'ausgeschlossen'},
    {zeit_ohne_altes_oder_neues_geraet_min:120,kuehlen_nicht_abgedeckt_min:30,gefrieren_nicht_abgedeckt_min:120}),

  entry('kuehlschrank_wechsel_geraetepaar_labelvergleich_bestand',
    'Vergleicht die Jahresenergie beim Wechsel zur Kühlkombi und berücksichtigt, ob der separate Gefrierschrank weiterläuft — Reconcile a one-versus-two cabinet replacement energy scenario',
    {alt_kuehl_kwh:kwh('Vergleichbar deklarierte oder eigens ermittelte Jahres-kWh des ersetzten Kühlschranks.'),
      alt_gefrier_kwh:kwh('Jahres-kWh des vorhandenen separaten Gefriergeräts auf derselben belegten Vergleichsgrundlage.'),
      neu_kombi_kwh:kwh('Jahres-kWh der Kombi auf derselben belegten Vergleichsgrundlage.'),
      gefriergeraet_danach:pick('Zustand des separaten Gefriergeräts nach dem Umstieg.', 'weiter_im_betrieb','ausser_betrieb','offen'),
      lasten_gleich_und_belegt:flag('Fachbedarf nach der Umstellung und einheitliche Vergleichsgrundlage sind belegt und zusätzlicher eigener Betrieb ist berücksichtigt.')},
    ({alt_kuehl_kwh,alt_gefrier_kwh,neu_kombi_kwh,gefriergeraet_danach,lasten_gleich_und_belegt})=>{
      const vorher=round(alt_kuehl_kwh+alt_gefrier_kwh);
      const nachher=round(neu_kombi_kwh+(gefriergeraet_danach==='weiter_im_betrieb'?alt_gefrier_kwh:0));
      const vergleichbar=lasten_gleich_und_belegt&&gefriergeraet_danach!=='offen';
      return {vorher_szenario_kwh:lasten_gleich_und_belegt?vorher:null,nachher_szenario_kwh:vergleichbar?nachher:null,
        differenz_nachher_minus_vorher_kwh:vergleichbar?round(nachher-vorher):null,beleg:source(buyer,'Bedarf, Gerätekombination und Energieangaben'),
        hinweis:'Der Vergleich setzt dieselbe Funktion und vergleichbare Jahresgrundlagen voraus. Ein weiterlaufendes Gerät fällt aus der Energiebilanz nicht heraus. Individuelle Betriebsänderungen separat prüfen.'};
    },{alt_kuehl_kwh:155,alt_gefrier_kwh:240,neu_kombi_kwh:162,gefriergeraet_danach:'weiter_im_betrieb',lasten_gleich_und_belegt:true},
    {vorher_szenario_kwh:395,nachher_szenario_kwh:402,differenz_nachher_minus_vorher_kwh:7}),

  entry('kuehlkombi_freistehend_perfect_fit_nische_einbauart',
    'Klärt für die deutsche KGN39VXCT, was „Perfect Fit“ für Nische und Einbaumöbel belegt, und fordert die passende Zeichnung für den tatsächlichen Standort — Separate a freestanding model niche claim from built-in installation evidence',
    {modell:exactChoice('Vollständig identifizierte deutsche Modellkennung.'),
      aufstellung:pick('Geplanter Standort.', 'offene_nische','umbautes_einbaumoebel','freier_stellplatz'),
      konkrete_aufstellung_aus_montageblatt:status('Das genaue deutsche Montageblatt umfasst die belegte konkrete Einbausituation mit erforderlichen Freiräumen.')},
    ({modell,aufstellung,konkrete_aufstellung_aus_montageblatt})=>({
      bauart:modell===exactModel?'freistehend':null,
      werbeaussage_nische:modell===exactModel?true:null,
      standort_beleg:modell===exactModel?konkrete_aufstellung_aus_montageblatt:'offen',aufstellung,
      beleg:modell===exactModel?[source(bosch,'Deutsche Modellseite, Perfect Fit'),source(boschSheet,'Seite 1, Bauart')]:null,
      hinweis:'Eine Aussage über eine Nische weist kein Einbaugerät aus. Maßzeichnung, Luftwege und Entnahmebewegung für die tatsächliche Lage separat prüfen.'}),
    {modell:exactModel,aufstellung:'umbautes_einbaumoebel',konkrete_aufstellung_aus_montageblatt:'offen'},
    {bauart:'freistehend',werbeaussage_nische:true,standort_beleg:'offen'}),

  entry('kuehlschrank_kaltes_fach_grosse_schale_ablagebelegung',
    'Prüft die praktisch nutzbare Kühlablage für eine große Schale zusammen mit belegter zweiter Ablage, wenn der restliche Kühlschrankinhalt bleiben soll — Check simultaneous tray and shelf use in one witnessed refrigerator layout',
    {gleiche_ablagenstellung:flag('Die Beobachtungen stammen aus demselben Aufbau mit beiden Dingen gleichzeitig oder einer überprüften maßgleichen Stellprobe.'),
      schale_einschieben:status('Die größte eigene Schale kann in der notwendigen Lage vollständig in die Kühlablage geschoben werden.'),
      restbestand_bleibt:status('Die zweite Ablage im benötigten Höhenbereich bleibt mit dem normalen restlichen Inhalt nutzbar.'),
      tuer_schliesst:status('Die Tür schließt mit genau dieser gleichzeitigen Belegung und ohne Gegenstand im Dichtbereich.')},
    ({gleiche_ablagenstellung,schale_einschieben,restbestand_bleibt,tuer_schliesst})=>{
      const beobachtung=[schale_einschieben,restbestand_bleibt,tuer_schliesst];
      return {gleichzeitiger_aufbau:!gleiche_ablagenstellung?'offen':beobachtung.includes('ausgeschlossen')?'ausgeschlossen':beobachtung.every(wert=>wert==='belegt')?'belegt':'offen',
        einzelne_belege:{schale_einschieben,restbestand_bleibt,tuer_schliesst},beleg:source(buyer,'Gerätegröße und eigener Platzbedarf, praktische Ergebnisse sind Nutzerbeobachtungen'),
        hinweis:'Ein freies Regalfach in einer anderen Stellung zählt nicht. Das Etikett liefert Liter, keine Anordnung für beide Gegenstände.'};
    },{gleiche_ablagenstellung:true,schale_einschieben:'belegt',restbestand_bleibt:'ausgeschlossen',tuer_schliesst:'belegt'},
    {gleichzeitiger_aufbau:'ausgeschlossen'}),

  entry('kuehlschrank_kellerfach_kaltlagerfach_zieltemperatur_datenblatt',
    'Ordnet Kellerfach, Kaltlagerfach oder Frischlebensmittelfach der richtigen Zieltemperatur im EU-Datenblatt zu — Distinguish cellar, chill and fresh-food compartment test targets',
    {fach:pick('Technisch ausgewiesener Fachtyp des exakten Geräts.', 'kellerfach','kaltlagerfach','frische_lebensmittel','offen'),
      gesuchte_zieltemperatur_c:degrees('Positive oder negative Zieltemperatur, nach der im Fachtyp gesucht wird. Keine gemessene Temperatur.')},
    ({fach,gesuchte_zieltemperatur_c})=>{
      const ziel={kellerfach:12,kaltlagerfach:2,frische_lebensmittel:4}[fach]??null;
      return {standard_ziel_c:ziel,fachtyp_hat_gesuchten_normwert:ziel===null?null:gesuchte_zieltemperatur_c===ziel,
        beleg:source(eu,'Anhang I und Anhang IV Tabelle 3'),hinweis:'Kellerfach bezeichnet einen Fachtyp im Gerät. Die Zieltemperatur beschreibt den Prüfbezug, keine tatsächliche Temperatur, Lebensmitteltauglichkeit oder Eignung für einen Kellerstandort.'};
    },{fach:'kellerfach',gesuchte_zieltemperatur_c:2},
    {standard_ziel_c:12,fachtyp_hat_gesuchten_normwert:false})
];
