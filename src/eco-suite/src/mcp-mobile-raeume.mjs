const winter = '/guide/wohnmobil-feuchtigkeit-winter.html';
const parked = '/guide/auto-bei-hitze-kuehlen.html';
const summer = '/guide/klimaanlage-wohnmobil.html';
const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const choice = (description, ...values) => ({type:'string', description, enum:values});
const flag = description => ({type:'boolean', description});
const count = description => number(description, 0, 1000);
const day = description => number(description, 0, 730);
const minutes = description => number(description, 0, 1440);
const temp = description => number(description, -45, 95);
const rh = description => number(description, 0, 100);
const gram = description => number(description, 0, 50000);
const round = value => Math.round(value * 100) / 100 + 0;

function whole(...values) {
  if (values.some(value=>!Number.isInteger(value))) throw new RangeError('Stückzahlen müssen ganzzahlig sein.');
}
function span(start, end) {
  if (start>end) throw new RangeError('Zeitfolge und gemeinsamen Bezug prüfen.');
  return end-start;
}
function entry(name, description, page, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example:{args, expect}};
}

export const mobileRaeume = [
  entry('campereinwinterung_innenzonen_pruefstatus',
    'Ordne zugängliche und verdeckte Zonen des abgestellten Campers nach ihrem tatsächlichen Sichtbefund — Triage accessible and hidden camper zones from the actual inspection',
    winter, {
      fensterrahmen:choice('Befund am Fensterrahmen', 'trocken_gesehen','feucht_gesehen','nicht_zugaenglich','noch_nicht_geprueft'),
      polsterruecken:choice('Befund auf der verdeckten Rückseite des Polsters', 'trocken_gesehen','feucht_gesehen','nicht_zugaenglich','noch_nicht_geprueft'),
      staukasten:choice('Befund in der tiefen Zone des Staukastens', 'trocken_gesehen','feucht_gesehen','nicht_zugaenglich','noch_nicht_geprueft')
    }, ({fensterrahmen,polsterruecken,staukasten}) => {
      const zonen={fensterrahmen,polsterruecken,staukasten};
      return {sichtbar_feucht:Object.keys(zonen).filter(key=>zonen[key]==='feucht_gesehen'),
        im_besuch_nicht_einsehbar:Object.keys(zonen).filter(key=>zonen[key]==='nicht_zugaenglich'),
        noch_am_ort_pruefen:Object.keys(zonen).filter(key=>zonen[key]==='noch_nicht_geprueft'),
        grenze:'Ein trockener sichtbarer Abschnitt sagt nichts über die verdeckten Seiten oder die Feuchteursache.'};
    }, {fensterrahmen:'feucht_gesehen',polsterruecken:'nicht_zugaenglich',staukasten:'noch_nicht_geprueft'},
    {sichtbar_feucht:['fensterrahmen'],im_besuch_nicht_einsehbar:['polsterruecken'],noch_am_ort_pruefen:['staukasten']}),

  entry('camper_standkontrollen_nach_hintereinander_ausfall',
    'Ermittle die längste tatsächlich offene Pause zwischen protokollierten Winterbesuchen — Find the longest unobserved interval between completed winter visits',
    winter, {
      start_tag:day('Tag der vollständigen ersten Winterbegehung'),
      besuch_a_tag:day('Erster späterer belegter Besuch'),
      besuch_b_tag:day('Zweiter späterer belegter Besuch, bei fehlendem zweitem Besuch wie A'),
      auswertungstag:day('Tag der Auswertung'),
      intervallgrenze_tage:day('Persönlich gesetzte längste akzeptierte Beobachtungslücke')
    }, ({start_tag,besuch_a_tag,besuch_b_tag,auswertungstag,intervallgrenze_tage}) => {
      const luecken=[span(start_tag,besuch_a_tag),span(besuch_a_tag,besuch_b_tag),span(besuch_b_tag,auswertungstag)];
      const laengste=Math.max(...luecken);
      return {laengste_offene_pause_tage:round(laengste),aktuell_offen_tage:round(luecken[2]),
        ziel_in_mindestens_einer_pause_verfehlt:laengste>intervallgrenze_tage,
        grenze:'Nur tatsächliche Besuchsabstände. Ein Termin belegt weder lückenlose Feuchtewerte noch jede verdeckte Stelle.'};
    }, {start_tag:0,besuch_a_tag:24,besuch_b_tag:61,auswertungstag:70,intervallgrenze_tage:30},
    {laengste_offene_pause_tage:37,aktuell_offen_tage:9,ziel_in_mindestens_einer_pause_verfehlt:true}),

  entry('camper_winter_sichtkontrolle_zone_einmessfenster',
    'Prüfe, ob alle zugänglichen Innenzonen während desselben Besuchs für die Übergabe erfasst wurden — Check whether three inspection zones belong to the same camper visit',
    winter, {
      besuch_ab_min:minutes('Besuchsfenster ab gemeinsamer Tageszeit'),
      besuch_bis_min:minutes('Ende desselben Besuchs'),
      rahmen_min:minutes('Zeit der aufgenommenen Rahmenbeobachtung'),
      polster_min:minutes('Zeit der aufgenommenen Polsterbeobachtung'),
      stauraum_min:minutes('Zeit der aufgenommenen Staufachbeobachtung'),
      ortsmarken_eindeutig:flag('Alle Aufzeichnungen zeigen die richtige Stelle desselben Fahrzeugs')
    }, ({besuch_ab_min,besuch_bis_min,rahmen_min,polster_min,stauraum_min,ortsmarken_eindeutig}) => {
      span(besuch_ab_min,besuch_bis_min);
      const zeiten={rahmen:rahmen_min,polster:polster_min,stauraum:stauraum_min};
      return {ausserhalb_des_besuchs:ortsmarken_eindeutig ? Object.keys(zeiten).filter(key=>zeiten[key]<besuch_ab_min || zeiten[key]>besuch_bis_min) : null,
        grenze:'Ein gemeinsamer Besuch erzeugt keine gleichzeitige Messung. Für Feuchtepaare Zeitstempel und Öffnungszustand beachten.'};
    }, {besuch_ab_min:600,besuch_bis_min:630,rahmen_min:605,polster_min:618,stauraum_min:680,ortsmarken_eindeutig:true},
    {ausserhalb_des_besuchs:['stauraum']}),

  entry('camper_granulat_waegung_boxwechsel_tara',
    'Trenne die sichtbare Masseänderung einer Granulatbox vom Gewichtsunterschied zweier Behälter — Separate tare changes from observed mass gain in a winter absorber',
    winter, {
      gesamt_alt_g:gram('Vorher gewogene Gesamtmasse einschließlich Behälter'),
      tara_alt_g:gram('Vorheriger leerer Behälter laut Wiegeprotokoll'),
      gesamt_neu_g:gram('Später gewogene Gesamtmasse einschließlich des verwendeten Behälters'),
      tara_neu_g:gram('Tara des später verwendeten Behälters'),
      inhalt_unveraendert_uebernommen:flag('Derselbe Inhalt vollständig übernommen, keine Entleerung oder Nachfüllung zwischen den Wägungen')
    }, ({gesamt_alt_g,tara_alt_g,gesamt_neu_g,tara_neu_g,inhalt_unveraendert_uebernommen}) => {
      if (gesamt_alt_g<tara_alt_g || gesamt_neu_g<tara_neu_g) throw new RangeError('Tara ist größer als Gesamtmasse.');
      return {sichtbare_gesamtveraenderung_g:round(gesamt_neu_g-gesamt_alt_g),
        korrigierte_inhaltsveraenderung_g:inhalt_unveraendert_uebernommen ? round((gesamt_neu_g-tara_neu_g)-(gesamt_alt_g-tara_alt_g)) : null,
        grenze:'Gewichtsänderung ist keine bekannte verbleibende Aufnahmekapazität. Herstellerhinweise des genauen Behälters gelten.'};
    }, {gesamt_alt_g:665,tara_alt_g:85,gesamt_neu_g:743,tara_neu_g:118,inhalt_unveraendert_uebernommen:true},
    {sichtbare_gesamtveraenderung_g:78,korrigierte_inhaltsveraenderung_g:45}),

  entry('camper_granulat_zwei_besuche_saettigungsintervall',
    'Grenze für zwei Zonen ein, wann eine belegte Auffanggrenze zwischen Besuchen erreicht wurde — Bound when winter reservoir limits were reached between visits',
    winter, {
      erster_tag:day('Früherer Besuch, an dem beide Boxen nachweislich unter ihrer Hersteller-Kontrollmarkierung lagen'),
      zweiter_tag:day('Tag des späteren Besuchs'),
      wohnraum:choice('Wohnraum beim späteren Besuch', 'marke_erreicht','darunter','nicht_abgelesen'),
      heck:choice('Heckstauraum beim späteren Besuch', 'marke_erreicht','darunter','nicht_abgelesen'),
      kontinuierliche_boxzuordnung:flag('Identische Boxen ohne dokumentierte Entleerung oder Austausch in denselben Zonen')
    }, ({erster_tag,zweiter_tag,wohnraum,heck,kontinuierliche_boxzuordnung}) => {
      const dauer=span(erster_tag,zweiter_tag);
      return {marke_im_intervall_belegt:kontinuierliche_boxzuordnung ? Object.entries({wohnraum,heck}).filter(([,befund])=>befund==='marke_erreicht').map(([zone])=>zone) : null,
        zeitgenauigkeit_tage:kontinuierliche_boxzuordnung ? round(dauer) : null,
        ohne_zweiten_wert:[wohnraum==='nicht_abgelesen' && 'wohnraum',heck==='nicht_abgelesen' && 'heck'].filter(Boolean),
        grenze:'Markierung und trockener Inhalt sind verschiedene Zustände. Aus zwei Besuchen kein genaues Datum oder zukünftige Rate berechnen.'};
    }, {erster_tag:18,zweiter_tag:43,wohnraum:'marke_erreicht',heck:'nicht_abgelesen',kontinuierliche_boxzuordnung:true},
    {marke_im_intervall_belegt:['wohnraum'],zeitgenauigkeit_tage:25,ohne_zweiten_wert:['heck']}),

  entry('wohnmobil_lokale_taureserve_fenster_polster_paar',
    'Zeige, wo der dokumentierte Abstand zum gleichen Innen-Taupunkt kleiner war — Compare paired dew-point margins at a metal frame and behind upholstery',
    winter, {
      rahmen_c:temp('Oberflächentemperatur am dokumentierten Metallrahmen'),
      hinter_polster_c:temp('Temperatur der Oberfläche direkt hinter dem Polster'),
      innen_taupunkt_c:temp('Aus zeitgleicher Fahrzeugluft ermittelter Taupunkt'),
      toleranz_c:number('Eigene kombinierte Toleranz für die beiden Abstände',0,8),
      gleiche_luft_belegt:flag('Gemeinsamer Taupunkt ist für die beiden geprüften Stellen plausibel; andernfalls getrennt messen')
    }, ({rahmen_c,hinter_polster_c,innen_taupunkt_c,toleranz_c,gleiche_luft_belegt}) => {
      const rahmen=rahmen_c-innen_taupunkt_c;
      const polster=hinter_polster_c-innen_taupunkt_c;
      return {abstaende_c:gleiche_luft_belegt ? {rahmen:round(rahmen),polster:round(polster)} : null,
        kleinere_reserve:!gleiche_luft_belegt || Math.abs(rahmen-polster)<=toleranz_c+1e-9 ? null : rahmen<polster ? 'rahmen' : 'polster',
        grenze:'Momentvergleich zweier Oberflächen. Getrennte Mikroklimata und Messfehler bleiben zu prüfen.'};
    }, {rahmen_c:4.4,hinter_polster_c:5.8,innen_taupunkt_c:4.1,toleranz_c:0.4,gleiche_luft_belegt:true},
    {abstaende_c:{rahmen:0.3,polster:1.7},kleinere_reserve:'rahmen'}),

  entry('wohnmobil_polster_vorne_hinten_seitenwechsel_befund',
    'Erkenne nach Wenden eines Polsters, ob die feuchte Beobachtung der Textilseite oder der Einbaulage folgte — Track a damp observation after turning a camper cushion',
    winter, {
      zuerst:choice('Feuchte Beobachtung vor dem Wenden', 'nur_vorne','nur_hinten','beide','offen'),
      spaeter:choice('Feuchte Beobachtung nach dem Wenden', 'nur_vorne','nur_hinten','beide','offen'),
      seiten_markiert:flag('Dasselbe Polster wurde eindeutig gewendet und Vorder-/Hinterlage in beiden Notizen gleich bezeichnet'),
      umgebung_aehnlich:flag('Ähnliche Bedingungen und gleiche Beobachtungsmethode nach dem Umlagern')
    }, ({zuerst,spaeter,seiten_markiert,umgebung_aehnlich}) => {
      const einzeln=[zuerst,spaeter].every(wert=>wert==='nur_vorne' || wert==='nur_hinten');
      return {beobachtungsmuster:seiten_markiert && umgebung_aehnlich && einzeln
        ? zuerst===spaeter ? 'gleiche_einbaulage' : 'gleiche_textilseite' : 'nicht_trennbar',
        grenze:'Wenden kann Luftkontakt ändern. Das Muster allein beweist weder Materialschaden noch Feuchteursache.'};
    }, {zuerst:'nur_hinten',spaeter:'nur_vorne',seiten_markiert:true,umgebung_aehnlich:true},
    {beobachtungsmuster:'gleiche_textilseite'}),

  entry('wohnmobil_messpunkt_nach_polsterrueckkehr_verdeckt',
    'Prüfe, ob der alte Vergleichspunkt nach dem Rückstellen des Polsters noch messbar ist — Audit whether an original measurement point remains accessible after restoring upholstery',
    winter, {
      markierung_sichtbar:flag('Ursprüngliche Messpunktmarkierung ist nach Rückstellen erkennbar'),
      alter_punkt_unverdeckt:flag('Der ursprüngliche Punkt ist mit dem gleichen Verfahren ohne Verschieben des Polsters ablesbar'),
      neuer_punkt_gleichzeitig_gemessen:flag('Ersatzpunkt und Originalpunkt wurden vorher zeitgleich unter denselben Bedingungen beobachtet')
    }, ({markierung_sichtbar,alter_punkt_unverdeckt,neuer_punkt_gleichzeitig_gemessen}) => {
      const original=markierung_sichtbar && alter_punkt_unverdeckt;
      return {messortentscheidung:original ? 'vergleich_am_originalpunkt' :
        neuer_punkt_gleichzeitig_gemessen ? 'neuen_punkt_mit_paarbeleg_getrennt_fuehren' : 'neue_basis_am_ersatzpunkt_erheben',
        grenze:'Zeitgleiche Werte allein machen den Ersatzpunkt nicht identisch. Polsterlage und Luftkontakt dokumentieren.'};
    }, {markierung_sichtbar:true,alter_punkt_unverdeckt:false,neuer_punkt_gleichzeitig_gemessen:true},
    {messortentscheidung:'neuen_punkt_mit_paarbeleg_getrennt_fuehren'}),

  entry('camper_staufach_winter_nachbesuch_neu_abgedeckt',
    'Berechne, wie viele tatsächlich neue Stauraumpunkte der zweite Winterbesuch abgedeckt hat — Deduplicate two inspections of camper storage points',
    winter, {
      auf_plan:count('Anzahl eindeutiger Stauraumpunkte auf dem eigenen Plan'),
      erstbesuch:count('Punkte mit vollständigem Sichtbefund beim ersten Besuch'),
      zweitbesuch:count('Punkte mit vollständigem Sichtbefund beim zweiten Besuch'),
      gemeinsam:count('Dieselben markierten Punkte mit Befund an beiden Besuchen'),
      plan_unveraendert:flag('Die Fahrzeugbereiche wurden zwischen den Besuchen gleich bezeichnet und nicht umgebaut')
    }, ({auf_plan,erstbesuch,zweitbesuch,gemeinsam,plan_unveraendert}) => {
      whole(auf_plan,erstbesuch,zweitbesuch,gemeinsam);
      const mindestens_einmal=erstbesuch+zweitbesuch-gemeinsam;
      if (gemeinsam>Math.min(erstbesuch,zweitbesuch) || mindestens_einmal>auf_plan) throw new RangeError('Punktmengen prüfen.');
      return {erstmals_beim_zweiten:zweitbesuch-gemeinsam,noch_ohne_befund:plan_unveraendert ? auf_plan-mindestens_einmal : null,
        grenze:'Abdeckung des Plans, keine Aussage über den heutigen Zustand älterer Sichtbefunde.'};
    }, {auf_plan:9,erstbesuch:5,zweitbesuch:5,gemeinsam:3,plan_unveraendert:true},
    {erstmals_beim_zweiten:2,noch_ohne_befund:2}),

  entry('wohnmobil_zutritt_messreihe_vor_tueroeffnung',
    'Kennzeichne, ob die gespeicherte Standmessung vor dem ersten Öffnen lag — Determine whether a stored measurement preceded the first door opening',
    winter, {
      letzter_loggerpunkt_min:minutes('Minute der letzten automatisch gespeicherten Innenablesung im Tagesprotokoll'),
      tueroeffnung_min:minutes('Minute der ersten eindeutig beobachteten Türöffnung'),
      kontrollablesung_min:minutes('Minute des Innenmesswerts während des Besuchs'),
      uhrabweichung_min:minutes('Größter möglicher Zeitversatz zwischen Logger und Besuchsnotiz')
    }, ({letzter_loggerpunkt_min,tueroeffnung_min,kontrollablesung_min,uhrabweichung_min}) => {
      if (kontrollablesung_min<tueroeffnung_min) throw new RangeError('Besuchsablesung liegt vor der Öffnung.');
      const vorlauf=tueroeffnung_min-letzter_loggerpunkt_min;
      return {loggerpunkt_sicher_vor_oeffnung:vorlauf>uhrabweichung_min,
        kontrolle_seit_oeffnung_min:round(kontrollablesung_min-tueroeffnung_min),
        grenze:'Vor Öffnung und beim Besuch sind verschiedene Phasen. Keine Veränderung allein dem Öffnen zuschreiben.'};
    }, {letzter_loggerpunkt_min:545,tueroeffnung_min:550,kontrollablesung_min:560,uhrabweichung_min:3},
    {loggerpunkt_sicher_vor_oeffnung:true,kontrolle_seit_oeffnung_min:10}),

  entry('camper_stellplatzwechsel_vorher_nachher_quellenscope',
    'Unterscheide einen dokumentierten Stellplatzwechsel von einem gleichzeitig umgeräumten Innenraum — Scope an observed camper change when placement and contents change together',
    winter, {
      standort_alt:choice('Beobachtete vorige Umgebung', 'ueberdacht','offen','offen_unter_nicht_bestaetigten_bedingungen'),
      standort_neu:choice('Spätere beobachtete Umgebung', 'ueberdacht','offen','offen_unter_nicht_bestaetigten_bedingungen'),
      polster_und_fachstellung_gleich:flag('Textilien und Fächer unverändert'),
      vergleichbare_witterung:flag('Die dokumentierten Beobachtungsfenster hatten ähnliche Witterung')
    }, ({standort_alt,standort_neu,polster_und_fachstellung_gleich,vergleichbare_witterung}) => {
      const unklar='offen_unter_nicht_bestaetigten_bedingungen';
      const standortunterschied_belegt=standort_alt!==unklar && standort_neu!==unklar && standort_alt!==standort_neu;
      return {standortunterschied_belegt,
        innenzustand_und_wetter_unveraendert:polster_und_fachstellung_gleich && vergleichbare_witterung,
        grenze:'Vergleich dokumentierter Kategorien. Er weist keine Wirkung der Überdachung nach.'};
    }, {standort_alt:'offen',standort_neu:'ueberdacht',polster_und_fachstellung_gleich:false,vergleichbare_witterung:true},
    {standortunterschied_belegt:true,innenzustand_und_wetter_unveraendert:false}),

  entry('wohnmobil_kondensatspur_foto_zonenrichtung',
    'Ordne einen gemeinsamen Fotobefund ein, ohne die höchste sichtbare Spur mit der Eintrittsstelle gleichzusetzen — Compare upper and lower visible traces without inferring an entry point',
    winter, {
      obere_kante:choice('Obere markierte Fensterkante', 'tropfen','trockene_spur','trocken_gesehen','offen'),
      untere_kante:choice('Untere markierte Fensterkante', 'tropfen','trockene_spur','trocken_gesehen','offen'),
      beide_vor_abwischen:flag('Beide Befunde wurden beim selben Besuch vor Abwischen oder Öffnungsänderung aufgenommen')
    }, ({obere_kante,untere_kante,beide_vor_abwischen}) => {
      const sichtbar=wert=>wert==='tropfen' || wert==='trockene_spur';
      return {sichtbare_spur_nur_unten:beide_vor_abwischen && obere_kante!=='offen' && untere_kante!=='offen' ? sichtbar(untere_kante) && !sichtbar(obere_kante) : null,
        unbeobachtete_kanten:[obere_kante==='offen'&&'oben',untere_kante==='offen'&&'unten'].filter(Boolean),
        grenze:'Spurlage grenzt die Beobachtung ein. Wasserweg, Eintrittsstelle und Taupunktursache separat klären.'};
    }, {obere_kante:'trocken_gesehen',untere_kante:'trockene_spur',beide_vor_abwischen:true},
    {sichtbare_spur_nur_unten:true,unbeobachtete_kanten:[]}),

  entry('wohnmobil_rueckkehr_trockenkontrolle_materialpaar',
    'Prüfe, welche ausgelagerten Textilien zusammen mit ihrer Einbaustelle tatsächlich trocken beobachtet wurden — Match dry stored items to separately inspected camper locations',
    winter, {
      polster_trocken:flag('Polster auf den zugänglichen Seiten trocken beobachtet'),
      wand_hinter_polster_trocken:flag('Einbaufläche hinter dem Polster separat trocken beobachtet'),
      teppich_trocken:flag('Loser Teppich auf beiden zugänglichen Seiten trocken beobachtet'),
      boden_unter_teppich_trocken:flag('Bodenfläche darunter separat trocken beobachtet')
    }, ({polster_trocken,wand_hinter_polster_trocken,teppich_trocken,boden_unter_teppich_trocken}) => {
      const paar=[
        ['polster',polster_trocken,wand_hinter_polster_trocken],
        ['teppich',teppich_trocken,boden_unter_teppich_trocken]
      ];
      return {paarweise_trocken_beobachtet:paar.filter(([,teil,flaeche])=>teil && flaeche).map(([name])=>name),
        nur_teil_trocken_beobachtet:paar.filter(([,teil,flaeche])=>teil && !flaeche).map(([name])=>name),
        grenze:'Sichtbefunde zum Rückkehrtermin, keine Materialfeuchtemessung oder Freigabe.'};
    }, {polster_trocken:true,wand_hinter_polster_trocken:false,teppich_trocken:true,boden_unter_teppich_trocken:true},
    {paarweise_trocken_beobachtet:['teppich'],nur_teil_trocken_beobachtet:['polster']}),

  entry('camper_absorber_rueckkehr_vor_offener_besuchspause',
    'Prüfe, ob eine belegte Kontrollfrist vor dem nächsten bestätigten Zugang endet — Match a documented absorber check deadline against actual access',
    winter, {
      letzter_check_tag:day('Tag der jüngsten tatsächlich dokumentierten Kontrolle'),
      kontrollfrist_tage:day('Zuvor festgelegter Abstand bis zur Kontrolle, gestützt auf eigene Beobachtung oder Produktunterlage'),
      naechster_tag:day('Frühester bestätigter Zugang zum abgestellten Fahrzeug'),
      zugang_zugesagt:flag('Der nächste Zugang ist tatsächlich zugesagt und erlaubt die Kontrolle des betreffenden Bereichs')
    }, ({letzter_check_tag,kontrollfrist_tage,naechster_tag,zugang_zugesagt}) => {
      span(letzter_check_tag,naechster_tag);
      const deadline=letzter_check_tag+kontrollfrist_tage;
      return {kontrolle_geplant_bis_tag:round(deadline),
        tage_ohne_zugang_nach_frist:zugang_zugesagt ? round(Math.max(0,naechster_tag-deadline)) : null,
        grenze:'Zugangsplanung anhand der eigenen Frist. Kein Nachweis, wie lange der Absorber aufnimmt.'};
    }, {letzter_check_tag:12,kontrollfrist_tage:31,naechster_tag:50,zugang_zugesagt:true},
    {kontrolle_geplant_bis_tag:43,tage_ohne_zugang_nach_frist:7}),

  entry('camper_heckfach_verschlusswechsel_luftsignal_kontrolle',
    'Prüfe, ob das Luftbewegungssignal am Heckfach nur bei geöffneter Fachtür erschien und der vorgelagerte Kontrollpunkt stabil blieb — Compare a storage door intervention against a stable cabin airflow control',
    winter, {
      heck_offen:flag('Am selben Heckfach-Messpunkt bei offener Fachtür Bewegung beobachtet'),
      heck_zu:flag('Am selben Heckfach-Messpunkt in der zulässigen geschlossenen Kontrollstellung Bewegung beobachtet'),
      kontrolle_offen:flag('Zeitgleich mit offenem Fach im vorgelagerten Wohnbereich Bewegung beobachtet'),
      kontrolle_zu:flag('Zeitgleich mit geschlossenem Fach dort Bewegung beobachtet'),
      nur_fachstellung_gewechselt:flag('Übrige Aufstellung, Messmethoden und Zeitbedingungen sind dokumentiert vergleichbar')
    }, ({heck_offen,heck_zu,kontrolle_offen,kontrolle_zu,nur_fachstellung_gewechselt}) => ({
      signal_nur_bei_offenem_fach:heck_offen && !heck_zu,
      vergleich_mit_stabiler_kontrolle:nur_fachstellung_gewechselt && kontrolle_offen && kontrolle_zu ? heck_offen && !heck_zu : null,
      grenze:'Zwei Sichtproben zeigen das lokale Luftsignal; sie belegen weder Durchlüftung des gesamten Fachs noch Luftmenge.'
    }), {heck_offen:true,heck_zu:false,kontrolle_offen:true,kontrolle_zu:false,nur_fachstellung_gewechselt:true},
    {signal_nur_bei_offenem_fach:true,vergleich_mit_stabiler_kontrolle:null}),

  entry('camper_tiefster_messwert_klimadaten_kaltperiode',
    'Trenne die Temperatur am Besuchstag vom gespeicherten Minimum der stillgelegten Fahrzeugzone — Interpret a winter minimum separately from the visit temperature',
    winter, {
      tiefstwert_c:temp('Abgelesenes Minimum des Winterspeichers in einer Fahrzeugzone'),
      besuch_c:temp('Aktuelle Temperatur am gleichen Sensor'),
      modell_untergrenze_c:temp('Laut genauer Geräteunterlage untere Grenze für den betrachteten Betrieb'),
      speicher_seit_stilllegung_belegt:flag('Sensor blieb in der betrachteten Zone und der Speicher deckt den gesamten betrachteten Abschnitt ab')
    }, ({tiefstwert_c,besuch_c,modell_untergrenze_c,speicher_seit_stilllegung_belegt}) => {
      if (speicher_seit_stilllegung_belegt && tiefstwert_c>besuch_c) throw new RangeError('Minimum und aktueller Wert passen nicht zum bestätigten Speicherzeitraum.');
      return {besuch_oberhalb_untergrenze:besuch_c>=modell_untergrenze_c,
        winterminimum_darunter:speicher_seit_stilllegung_belegt ? tiefstwert_c<modell_untergrenze_c : null,
        grenze:'Ein Minimum zeigt keine Dauer oder Entzugsleistung. Nennwerte nur für ihre belegten Prüfbedingungen verwenden.'};
    }, {tiefstwert_c:1,besuch_c:10,modell_untergrenze_c:5,speicher_seit_stilllegung_belegt:true},
    {besuch_oberhalb_untergrenze:true,winterminimum_darunter:true}),

  entry('wohnmobil_polster_rueckkehr_fachzugang_termin',
    'Trenne den Zeitpunkt, an dem ein Fach wieder zugänglich ist, vom möglichen Termin zum Rückstellen ausgelagerter Polster — Compare camper storage access with the later return of furnishings',
    winter, {
      fach_sichtpruefung_tag:day('Tag des bestätigten freien Zugangs und der Sichtprüfung der ursprünglichen Einbaustelle'),
      polster_bereit_tag:day('Bestätigter Tag, an dem die ausgelagerten Polster wieder bereitliegen'),
      nutzung_tag:day('Tag, bis zu dem der Platz für seine gewöhnliche Aufgabe wieder benötigt wird'),
      beide_zeiten_bestaetigt:flag('Keiner der Termine ist lediglich vorgesehen')
    }, ({fach_sichtpruefung_tag,polster_bereit_tag,nutzung_tag,beide_zeiten_bestaetigt}) => {
      const bereit=Math.max(fach_sichtpruefung_tag,polster_bereit_tag);
      return {fruehester_gemeinsamer_termin_tag:beide_zeiten_bestaetigt ? bereit : null,
        versatz_nach_nutzungswunsch_tage:beide_zeiten_bestaetigt ? round(Math.max(0,bereit-nutzung_tag)) : null,
        grenze:'Terminvergleich. Zustand von Polster und Auflagefläche vor Rückstellen getrennt prüfen.'};
    }, {fach_sichtpruefung_tag:102,polster_bereit_tag:109,nutzung_tag:105,beide_zeiten_bestaetigt:true},
    {fruehester_gemeinsamer_termin_tag:109,versatz_nach_nutzungswunsch_tage:4}),

  entry('camper_heckfach_stichprobe_oeffnung_veraendert',
    'Erkenne, ob nach dem Öffnen eines Staufachs nur dessen eigener Feuchtewert oder gleichzeitig der Wohnbereich wechselte — Compare the storage reading shift with the living-area reference after opening',
    winter, {
      fach_vor_rh:rh('Im geschlossenen Fach erfasste relative Feuchte vor Öffnung'),
      fach_nach_rh:rh('Späterer Wert desselben Sensors im Fach'),
      gang_vor_rh:rh('Zeitgleicher früherer Wert im Wohnbereich'),
      gang_nach_rh:rh('Zeitgleicher späterer Wert im Wohnbereich'),
      toleranz_pp:number('Eigene gemeinsame Toleranz des Feuchtevergleichs in Prozentpunkten',0,20),
      temperaturbedingungen_passend:flag('Temperaturen je Messpaar und Reaktionszeiten ausreichend ähnlich')
    }, ({fach_vor_rh,fach_nach_rh,gang_vor_rh,gang_nach_rh,toleranz_pp,temperaturbedingungen_passend}) => {
      const fach=fach_nach_rh-fach_vor_rh;
      const gang=gang_nach_rh-gang_vor_rh;
      return {beobachtete_aenderung_pp:{fach:round(fach),wohnteil:round(gang)},
        nur_fach_deutlich_geaendert:temperaturbedingungen_passend ? Math.abs(fach)>toleranz_pp && Math.abs(gang)<=toleranz_pp : null,
        grenze:'Relative Feuchte nahe der Fachtür kann auf Öffnen reagieren. Kein Nachweis für Feuchte in Polstern oder Wänden.'};
    }, {fach_vor_rh:73,fach_nach_rh:63,gang_vor_rh:58,gang_nach_rh:59,toleranz_pp:3,temperaturbedingungen_passend:true},
    {beobachtete_aenderung_pp:{fach:-10,wohnteil:1},nur_fach_deutlich_geaendert:true}),

  entry('wohnmobil_nachwinter_befund_neu_oder_wiederholt',
    'Unterscheide neue von bereits dokumentierten Feuchtebefunden an denselben markierten Fahrzeugstellen — Separate new sightings from repeated findings after winter',
    winter, {
      alt_befunde:count('Anzahl markierter Stellen mit alter Beobachtung'),
      neu_befunde:count('Anzahl markierter Stellen mit Feuchtebefund in der erneuten Begehung'),
      gleiche_punkte:count('Davon mit Befund in beiden Protokollen an identischer Stelle'),
      alt_nicht_wieder_pruefbar:count('Weitere alte Befundstellen ohne aktuelle Sichtprüfung'),
      gleiche_bezeichnungen:flag('Ortscodes bezeichnen nachweislich dieselben Stellen und Beobachtungsmerkmale')
    }, ({alt_befunde,neu_befunde,gleiche_punkte,alt_nicht_wieder_pruefbar,gleiche_bezeichnungen}) => {
      whole(alt_befunde,neu_befunde,gleiche_punkte,alt_nicht_wieder_pruefbar);
      if (gleiche_punkte>neu_befunde || gleiche_punkte+alt_nicht_wieder_pruefbar>alt_befunde) throw new RangeError('Überlappung der Befunde prüfen.');
      return {erstmals_beschriebene_stellen:gleiche_bezeichnungen ? neu_befunde-gleiche_punkte : null,
        altbefunde_ohne_nachkontrolle:alt_nicht_wieder_pruefbar,
        grenze:'Erstmals beschrieben bedeutet nicht frisch entstanden. Beobachtungslücken bleiben explizit.'};
    }, {alt_befunde:6,neu_befunde:5,gleiche_punkte:3,alt_nicht_wieder_pruefbar:2,gleiche_bezeichnungen:true},
    {erstmals_beschriebene_stellen:2,altbefunde_ohne_nachkontrolle:2}),

  entry('camper_standwinter_polster_massengang_referenz',
    'Vergleiche die tatsächliche Masseänderung eines ausgelagerten Polsters mit einer passenden trockenen Kontrolle — Compare mass change of stored upholstery against a dry control',
    winter, {
      polster_vor_g:gram('Vorher gewogene Masse des ausgelagerten Polsters'),
      polster_nach_g:gram('Später gewogene Masse desselben Polsters'),
      referenz_vor_g:gram('Früherer Wert eines gleich beschaffenen trockenen Kontrollstücks'),
      referenz_nach_g:gram('Späterer Wert dieses Kontrollstücks'),
      wiegepaare_passend:flag('Unveränderte Einzelstücke, trockene Kontrollablage, vergleichbare Messbedingungen und getrennte Masseabzüge')
    }, ({polster_vor_g,polster_nach_g,referenz_vor_g,referenz_nach_g,wiegepaare_passend}) => {
      const p=polster_nach_g-polster_vor_g;
      const r=referenz_nach_g-referenz_vor_g;
      return {polsteraenderung_g:round(p),aenderung_gegen_kontrolle_g:wiegepaare_passend ? round(p-r) : null,
        grenze:'Nur relative Massenänderung im eigenen Aufbau. Keine Schätzung des absoluten Wassergehalts.'};
    }, {polster_vor_g:1680,polster_nach_g:1650,referenz_vor_g:1625,referenz_nach_g:1620,wiegepaare_passend:true},
    {polsteraenderung_g:-30,aenderung_gegen_kontrolle_g:-25}),

  entry('wohnmobil_nachwinter_kalte_zonen_wiederholungswechsel',
    'Erkenne, welche von zwei Zonen in zwei ähnlichen morgendlichen Stichproben die kältere Oberfläche hatte — Check whether the colder camper surface changed between winter visits',
    winter, {
      rahmen_a_c:temp('Erster Morgen: Wert am markierten Fensterrahmen'),
      stauraum_a_c:temp('Erster Morgen: Wert an markierter Staufachwand'),
      rahmen_b_c:temp('Zweiter Morgen: Wert am selben Fensterrahmen'),
      stauraum_b_c:temp('Zweiter Morgen: Wert an derselben Staufachwand'),
      mindestabstand_c:number('Eigene Differenztoleranz zwischen zwei Messstellen',0,15),
      gleiche_messbedingungen:flag('Vergleichbare Tagesphase, Sensorverfahren und Positionen')
    }, ({rahmen_a_c,stauraum_a_c,rahmen_b_c,stauraum_b_c,mindestabstand_c,gleiche_messbedingungen}) => {
      const a=rahmen_a_c-stauraum_a_c;
      const b=rahmen_b_c-stauraum_b_c;
      return {wechsel_der_kaelteren_stelle:gleiche_messbedingungen ? a*b<0 && Math.min(Math.abs(a),Math.abs(b))>mindestabstand_c+1e-9 : null,
        differenz_rahmen_minus_staufach_c:[round(a),round(b)],
        grenze:'Morgenstichproben sagen nichts über unbeobachtete Nächte oder Ursachen der kalten Stellen.'};
    }, {rahmen_a_c:3.2,stauraum_a_c:4.5,rahmen_b_c:4.8,stauraum_b_c:3.9,mindestabstand_c:0.5,gleiche_messbedingungen:true},
    {wechsel_der_kaelteren_stelle:true,differenz_rahmen_minus_staufach_c:[-1.3,0.9]}),

  entry('auto_parksonne_vorderseite_fensterseite_verschattung',
    'Prüfe, ob ein fester Schattenspender beide beobachteten Scheibenseiten während der Parkphase erreichte — Audit front and side shade across two phases of a parked vehicle',
    parked, {
      vorne_a:flag('Frontscheibenbereich zu Beginn im beobachteten Schatten'),
      seite_a:flag('Betrachtete Seitenscheibe zu Beginn im Schatten'),
      vorne_b:flag('Frontscheibenbereich bei der späteren Stichprobe im Schatten'),
      seite_b:flag('Betrachtete Seitenscheibe bei der späteren Stichprobe im Schatten'),
      selber_parkplatz:flag('Unveränderter Standplatz und unveränderte Ausrichtung')
    }, ({vorne_a,seite_a,vorne_b,seite_b,selber_parkplatz}) => ({
      schatten_in_beiden_stichproben:selber_parkplatz
        ? [vorne_a && vorne_b && 'front',seite_a && seite_b && 'seite'].filter(Boolean) : null,
      verloren_in_zweiter_stichprobe:selber_parkplatz
        ? [vorne_a && !vorne_b && 'front',seite_a && !seite_b && 'seite'].filter(Boolean) : null,
      grenze:'Zwei Beobachtungen am abgestellten Fahrzeug. Kein fortlaufender Schattennachweis und keine Aussage zum Aufenthalt.'
    }), {vorne_a:true,seite_a:true,vorne_b:true,seite_b:false,selber_parkplatz:true},
    {schatten_in_beiden_stichproben:['front'],verloren_in_zweiter_stichprobe:['seite']}),

  entry('auto_parkprobe_sonnenschutz_zeitversatz_am_selben_platz',
    'Trenne die dokumentierte Zeit ohne aufgelegten Sonnenschutz von der anschließenden geschützten Phase — Separate unprotected and protected time in a parked sunshade trial',
    parked, {
      standbeginn_min:minutes('Beginn der bestätigten unbewegten Parkphase'),
      schutz_aufgelegt_min:minutes('Erste Minute mit belegter Schutzposition an der Frontscheibe'),
      erste_flaechenmessung_min:minutes('Minute der frühen Temperaturablesung am Lenkrad'),
      zweite_flaechenmessung_min:minutes('Minute der späteren Ablesung am gleichen Punkt'),
      ausrichtung_unveraendert:flag('Fahrzeug und Messpunkt befinden sich während der Probe unverändert am selben Ort')
    }, ({standbeginn_min,schutz_aufgelegt_min,erste_flaechenmessung_min,zweite_flaechenmessung_min,ausrichtung_unveraendert}) => {
      const ungeschuetzt=span(standbeginn_min,schutz_aufgelegt_min);
      span(erste_flaechenmessung_min,zweite_flaechenmessung_min);
      const geordnet=erste_flaechenmessung_min>=standbeginn_min && erste_flaechenmessung_min<schutz_aufgelegt_min && zweite_flaechenmessung_min>=schutz_aufgelegt_min;
      return {vor_schutz_verstrichen_min:ausrichtung_unveraendert ? round(ungeschuetzt) : null,
        ablesungen_trennen_die_phasen:ausrichtung_unveraendert ? geordnet : null,
        grenze:'Nur Zuordnung des dokumentierten Schutzwechsels, ohne Aussage zur Dauer der direkten Sonne oder zur Wirkung.'
      };
    }, {standbeginn_min:585,schutz_aufgelegt_min:610,erste_flaechenmessung_min:597,zweite_flaechenmessung_min:640,ausrichtung_unveraendert:true},
    {vor_schutz_verstrichen_min:25,ablesungen_trennen_die_phasen:true}),

  entry('camper_granulat_stellvergleich_spitzen_und_mittelwert',
    'Vergleiche konzentrierte und verteilte Aufstellung anhand zweier Zonen und markiere unterschiedliche Aussagen von Spitze und Mittel — Compare peak and mean humidity under two absorber layouts',
    winter, {
      wohnraum_einzel_rh:rh('Wohnraumwert nach dem beobachteten Versuch mit zentralem Absorber'),
      heck_einzel_rh:rh('Zeitgleich gemessener Heckfachwert beim zentralen Aufbau'),
      wohnraum_verteilt_rh:rh('Wohnraumwert beim späteren Versuch mit verteilter Aufstellung'),
      heck_verteilt_rh:rh('Zeitgleicher Heckfachwert beim verteilten Aufbau'),
      aehnliche_versuche:flag('Gleiche Messorte, vergleichbare Temperatur und Messdauer sowie gleiche bestätigte Gesamtmaterialmenge')
    }, ({wohnraum_einzel_rh,heck_einzel_rh,wohnraum_verteilt_rh,heck_verteilt_rh,aehnliche_versuche}) => {
      const maximum=Math.max(wohnraum_verteilt_rh,heck_verteilt_rh)-Math.max(wohnraum_einzel_rh,heck_einzel_rh);
      const mittel=(wohnraum_verteilt_rh+heck_verteilt_rh-wohnraum_einzel_rh-heck_einzel_rh)/2;
      return {aenderung_hoechster_wert_pp:aehnliche_versuche ? round(maximum) : null,
        aenderung_mittel_zweier_messpunkte_pp:aehnliche_versuche ? round(mittel) : null,
        grenze:'Mittel zweier Messstellen ist kein Fahrzeugmittel. Unterschiedliche Luftwege und Feuchtequellen weiter prüfen.'};
    }, {wohnraum_einzel_rh:48,heck_einzel_rh:72,wohnraum_verteilt_rh:61,heck_verteilt_rh:65,aehnliche_versuche:true},
    {aenderung_hoechster_wert_pp:-7,aenderung_mittel_zweier_messpunkte_pp:3}),

  entry('camper_standwinter_logger_zwischen_auslese_und_umzug',
    'Prüfe, ob ein gespeicherter Winterabschnitt beide Stellplätze enthält und daher nicht einzeln zugeordnet werden kann — Scope stored winter data across a campsite move',
    winter, {
      speicher_start_tag:day('Erster sicher übernommener Tag im Speicher'),
      umzug_tag:day('Dokumentierter Tag des Stellplatzwechsels'),
      speicher_ende_tag:day('Letzter sicher übernommener Tag im Speicher'),
      sensor_aufzeichnung_bestaetigt:flag('Gleiches Fahrzeug, unveränderte Sensorposition und vollständig dokumentierte Zeitbasis')
    }, ({speicher_start_tag,umzug_tag,speicher_ende_tag,sensor_aufzeichnung_bestaetigt}) => {
      span(speicher_start_tag,speicher_ende_tag);
      return {stellplatz_umfang:sensor_aufzeichnung_bestaetigt
        ? umzug_tag<speicher_start_tag ? 'nur_neuer_platz'
          : umzug_tag>speicher_ende_tag ? 'nur_alter_platz' : 'umzugstag_im_protokoll'
        : 'zeitumfang_offen',
        grenze:'Bei gleicher Tagesangabe sind genauere Uhrzeiten nötig. Ein gespeicherter Extremwert hat ohne Zeitmarke keinen eindeutigen Stellplatz.'};
    }, {speicher_start_tag:15,umzug_tag:36,speicher_ende_tag:67,sensor_aufzeichnung_bestaetigt:true},
    {stellplatz_umfang:'umzugstag_im_protokoll'}),

  entry('wohnmobil_saisonwechsel_erster_getrennter_eindruck',
    'Ermittle, ob beim Auswintern eine dokumentierte Zwischenkontrolle vor Neueinräumen überhaupt möglich war — Find the observable window between unpacking the camper and restoring furnishings',
    winter, {
      bestand_entfernt_min:minutes('Minute, in der lose gelagerte Stücke für die erste Sichtprüfung entfernt waren'),
      erste_neue_auflage_min:minutes('Minute, in der die erste neue Auflage die zu beurteilende Fläche wieder bedeckt'),
      kontrolle_min:minutes('Belegter Zeitpunkt der Sichtprüfung derselben Fläche'),
      gleicher_bereich:flag('Zeitpunkte und Nachweis betreffen dieselbe Fläche')
    }, ({bestand_entfernt_min,erste_neue_auflage_min,kontrolle_min,gleicher_bereich}) => {
      const fenster=span(bestand_entfernt_min,erste_neue_auflage_min);
      return {freie_beobachtungsdauer_min:gleicher_bereich ? round(fenster) : null,
        kontrolle_ungedeckt:gleicher_bereich ? kontrolle_min>=bestand_entfernt_min && kontrolle_min<erste_neue_auflage_min : null,
        grenze:'Dokumentationsfenster. Späterer Zustand unter der neu eingelegten Auflage bleibt offen.'};
    }, {bestand_entfernt_min:540,erste_neue_auflage_min:573,kontrolle_min:559,gleicher_bereich:true},
    {freie_beobachtungsdauer_min:33,kontrolle_ungedeckt:true}),

  entry('wohnmobil_staurouten_zwei_fachstellungen_nutzen',
    'Vergleiche, welche Stellung zweier Innenfächer bei der Saisonübernahme für die jeweilige Aufgabe beobachtet wurde — Map two camper cabinet positions to storage or access needs',
    winter, {
      gang_benoetigt_freien_durchgang:flag('Der aktuelle Arbeitsschritt benötigt den vollen gemessenen Durchgang'),
      fach_vorne:choice('Zustand der vorderen Fachtür', 'offen_ragt_in_gang','offen_ohne_eintrag','geschlossen','offen_unbekannt'),
      fach_hinten:choice('Zustand der hinteren Fachtür', 'offen_ragt_in_gang','offen_ohne_eintrag','geschlossen','offen_unbekannt'),
      fachstellung_markiert:flag('Beide Stellungen wurden für die aktuelle Aufgabe direkt kontrolliert')
    }, ({gang_benoetigt_freien_durchgang,fach_vorne,fach_hinten,fachstellung_markiert}) => {
      const faecher={vorne:fach_vorne,hinten:fach_hinten};
      return {sichtbar_im_arbeitsweg:fachstellung_markiert && gang_benoetigt_freien_durchgang
        ? Object.keys(faecher).filter(key=>faecher[key]==='offen_ragt_in_gang') : null,
        unbekannt_ob_frei:Object.keys(faecher).filter(key=>faecher[key]==='offen_unbekannt'),
        grenze:'Nur Betriebsorganisation des abgestellten Fahrzeugs. Eine offene Fachtür belegt keine Luftumwälzung oder zulässige Stellung auf der Fahrt.'};
    }, {gang_benoetigt_freien_durchgang:true,fach_vorne:'offen_ragt_in_gang',fach_hinten:'offen_unbekannt',fachstellung_markiert:true},
    {sichtbar_im_arbeitsweg:['vorne'],unbekannt_ob_frei:['hinten']}),

  entry('wohnmobil_kuehlung_luftpfad_gepackt_gegen_leer',
    'Prüfe, ob die beobachtete Luftverteilung beim Übergang vom leeren zum gepackten Standaufbau unverändert blieb — Compare outlet-flow coverage in the empty and packed camper',
    summer, {
      sitz_ungeladen:flag('Im leeren Aufbau am markierten Sitzmesspunkt Strömung festgestellt'),
      heck_ungeladen:flag('Im leeren Aufbau am markierten Heckmesspunkt Strömung festgestellt'),
      sitz_gepackt:flag('Am gleichen Sitzmesspunkt im gepackten Aufbau Strömung festgestellt'),
      heck_gepackt:flag('Am gleichen Heckmesspunkt im gepackten Aufbau Strömung festgestellt'),
      modus_und_orte_gleich:flag('Gleiche bestätigte Geräteeinstellung, gleiche Messanordnung und vergleichbare Außenbedingungen')
    }, ({sitz_ungeladen,heck_ungeladen,sitz_gepackt,heck_gepackt,modus_und_orte_gleich}) => {
      const zonen=[['sitz',sitz_ungeladen,sitz_gepackt],['heck',heck_ungeladen,heck_gepackt]];
      return {beobachtete_luftbewegung_verloren:modus_und_orte_gleich ? zonen.filter(([,leer,gepackt])=>leer&&!gepackt).map(([zone])=>zone) : null,
        grenze:'Lokale Beobachtung im gepackten Fahrzeug. Kein Nachweis der Kühlleistung oder der Ursache einer Veränderung.'};
    }, {sitz_ungeladen:true,heck_ungeladen:true,sitz_gepackt:true,heck_gepackt:false,modus_und_orte_gleich:true},
    {beobachtete_luftbewegung_verloren:['heck']}),

  entry('wohnmobil_standwinter_belueftung_vom_befund_trennen',
    'Unterscheide beim erneuten trockenen Sichtbefund ein zuvor geändertes Lüftungsmuster von erledigter Ursachenprüfung — Separate a cleared visual symptom from a resolved source in the camper',
    winter, {
      erste_stelle:choice('Zuerst beobachtetes Merkmal an der markierten Stelle', 'sichtbar_feucht','trocken_gesehen','offen'),
      zweite_stelle:choice('Spätere Sichtkontrolle am selben markierten Punkt', 'sichtbar_feucht','trocken_gesehen','offen'),
      fachtuer_zustand_gewechselt:flag('Zwischen den Begehungen wurde die Fachtürstellung dokumentiert geändert'),
      quelle_unabhaengig_geprueft:flag('Mögliche weitere Feuchteursachen wurden separat durch die verantwortliche Person geprüft')
    }, ({erste_stelle,zweite_stelle,fachtuer_zustand_gewechselt,quelle_unabhaengig_geprueft}) => ({
      sichtbare_aenderung_nach_stellungswechsel:erste_stelle==='sichtbar_feucht' && zweite_stelle==='trocken_gesehen' && fachtuer_zustand_gewechselt,
      ursachenpruefung_dokumentiert:quelle_unabhaengig_geprueft,
      grenze:'Sichtbare Veränderung kann vorübergehend sein. Eigenständige Quellenprüfung bedeutet keine Bestätigung einer behobenen Ursache.'
    }), {erste_stelle:'sichtbar_feucht',zweite_stelle:'trocken_gesehen',fachtuer_zustand_gewechselt:true,quelle_unabhaengig_geprueft:false},
    {sichtbare_aenderung_nach_stellungswechsel:true,ursachenpruefung_dokumentiert:false}),

  entry('wohnmobil_klima_parkmessung_vorbetrieb_kennzeichnen',
    'Bestimme, welche geparkte Kabinenmessung noch zum unbeeinflussten Ausgangspunkt oder schon zum Kühlbetrieb gehört — Classify cabin samples before or during a documented cooling trial',
    summer, {
      abgestellt_min:minutes('Minute, ab der das Fahrzeug am Messplatz stand'),
      kuehlung_ab_min:minutes('Protokollierter Beginn der beobachteten Kühlung'),
      messung_a_min:minutes('Zeitpunkt der früheren Ablesung, gleiche Tageszeitbasis'),
      messung_b_min:minutes('Zeitpunkt der späteren Ablesung'),
      ununterbrochener_betrieb:flag('Betrieb bis zur späteren Ablesung und unveränderte Aufstellung bestätigt')
    }, ({abgestellt_min,kuehlung_ab_min,messung_a_min,messung_b_min,ununterbrochener_betrieb}) => {
      span(abgestellt_min,kuehlung_ab_min);
      span(messung_a_min,messung_b_min);
      const qualifizieren=zeit=>zeit<abgestellt_min?'vor_standphase':zeit<kuehlung_ab_min?'vor_kuehlbeginn'
        :ununterbrochener_betrieb?'im_kuehlbetrieb':'betriebszustand_offen';
      return {phasen:{a:qualifizieren(messung_a_min),b:qualifizieren(messung_b_min)},
        grenze:'Zeitliche Zuordnung einer Beobachtung. Frühere Fahrbedingungen, Sonneneintrag und die tatsächliche Kühlwirkung bleiben getrennt.'};
    }, {abgestellt_min:620,kuehlung_ab_min:645,messung_a_min:635,messung_b_min:670,ununterbrochener_betrieb:true},
    {phasen:{a:'vor_kuehlbeginn',b:'im_kuehlbetrieb'}})
];
