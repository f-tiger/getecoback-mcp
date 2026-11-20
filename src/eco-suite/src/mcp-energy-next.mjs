// All money and measurement inputs are supplied by the caller.
const meter = '/strommess-protokoll.html';
const tariff = '/stromtarif-werkstatt.html';
const spot = '/guide/strompreis-radar.html';
const household = '/guide/strom-sparen-haushalt.html';
const replace = '/geraete-austausch-rechner.html';
const scalar = (description,minimum=0,maximum=1000000) => ({type:'number',description,minimum,maximum});
const flag = description => ({type:'boolean',description});
const energy = description => scalar(description);
const euros = description => scalar(description,0,100000);
const rate = description => scalar(description,0,5);
const day = description => scalar(description,0,366);
const round = (value,digits=3) => Number(value.toFixed(digits)) || 0;
const money = value => round(value,2);
const allIntegers = (...values) => values.every(Number.isInteger);

export const energyNext = [
  {
    name:'stromzaehler_wechsel_protokoll',
    description:'Verbrauch über einen Stromzählerwechsel aus den getrennten Ständen berechnen. — Reconcile energy across a documented meter replacement.',
    page:meter,
    properties:{
      alt_start:energy('Stand des Altzählers zu Beginn in kWh.'),
      alt_ausbau:energy('Schlussstand des Altzählers laut Übergabeprotokoll in kWh.'),
      neu_einbau:energy('Anfangsstand des Neuzählers laut Übergabeprotokoll in kWh.'),
      neu_ende:energy('Aktueller Endstand des Neuzählers in kWh.'),
    },
    calculate(a) {
      const oldEnergy=a.alt_ausbau-a.alt_start, newEnergy=a.neu_ende-a.neu_einbau;
      if (oldEnergy<0 || newEnergy<0) throw new RangeError('Zählerstände je Gerät prüfen.');
      return {alt_kwh:round(oldEnergy),neu_kwh:round(newEnergy),gesamt_kwh:round(oldEnergy+newEnergy),
        annahme:'Zwei Bezugszähler mit passenden Übergabezeitpunkten. Keine Verbrauchsschätzung für Lücken, keine Einspeisewerte.'};
    },
    example:{args:{alt_start:8000,alt_ausbau:8240,neu_einbau:7,neu_ende:137},expect:{gesamt_kwh:370}},
  },
  {
    name:'stromzaehler_doppelregister_abgleichen',
    description:'Verbrauch zweier Bezugstarifregister mit dem Gesamtregister abgleichen. — Cross-check two import tariff registers against the total register.',
    page:meter,
    properties:{
      tarif_a_kwh:energy('Verbrauchsdifferenz des ersten Bezugstarifregisters in kWh.'),
      tarif_b_kwh:energy('Verbrauchsdifferenz des zweiten Bezugstarifregisters in kWh.'),
      gesamt_kwh:energy('Verbrauchsdifferenz des Gesamtbezugsregisters in kWh.'),
      toleranz_kwh:scalar('Zulässige Rundungsdifferenz in kWh.',0,10),
    },
    calculate(a) {
      const sum=a.tarif_a_kwh+a.tarif_b_kwh;
      return {summierte_tarife_kwh:round(sum),differenz_kwh:round(sum-a.gesamt_kwh),
        innerhalb_toleranz:Math.abs(sum-a.gesamt_kwh)<=a.toleranz_kwh+1e-9,
        annahme:'Gleicher Zähler und Zeitraum. Gesamtregister nicht zusätzlich zu Teilregistern addieren. Registerbezeichnungen beim Messstellenbetreiber prüfen.'};
    },
    example:{args:{tarif_a_kwh:110.1,tarif_b_kwh:80.2,gesamt_kwh:190.4,toleranz_kwh:.2},expect:{summierte_tarife_kwh:190.3,innerhalb_toleranz:true}},
  },
  {
    name:'stromzaehler_stichtag_einordnen',
    description:'Fehlenden Zählerstand zwischen zwei belegten Ablesungen als Szenario einordnen. — Interpolate an unobserved meter reading with bounds from two dated readings.',
    page:meter,
    properties:{
      davor_kwh:energy('Bestätigter Bezugstand am früheren Ablesetag.'),
      danach_kwh:energy('Bestätigter Bezugstand am späteren Ablesetag.'),
      abstand_tage:scalar('Tage zwischen beiden Ablesungen.',1,366),
      stichtag_tage:day('Tage von der ersten Ablesung bis zum gesuchten Stichtag.'),
    },
    calculate(a) {
      if (a.danach_kwh<a.davor_kwh || a.stichtag_tage>a.abstand_tage || !allIntegers(a.stichtag_tage,a.abstand_tage)) {
        throw new RangeError('Nur monotone Stände und einen Stichtag dazwischen verwenden.');
      }
      const fraction=a.stichtag_tage/a.abstand_tage;
      const exact = fraction===0 ? a.davor_kwh : fraction===1 ? a.danach_kwh : null;
      return {szenario_kwh:round(a.davor_kwh+(a.danach_kwh-a.davor_kwh)*fraction),
        belegt:exact!==null || a.danach_kwh===a.davor_kwh,
        untergrenze_kwh:exact??a.davor_kwh,obergrenze_kwh:exact??a.danach_kwh,
        annahme:'Lineare Näherung bei gleichmäßigem Bezug. Der tatsächliche Zwischenstand kann jede Höhe zwischen den belegten Grenzen haben.'};
    },
    example:{args:{davor_kwh:1100,danach_kwh:1220,abstand_tage:30,stichtag_tage:10},expect:{szenario_kwh:1140,belegt:false}},
  },
  {
    name:'strommessung_zeitabdeckung',
    description:'Prüfen, wie viel einer Messperiode tatsächlich mit Messintervallen belegt ist. — Audit interval coverage before treating an electricity log as complete.',
    page:meter,
    properties:{
      ziel_minuten:scalar('Gesamte Untersuchungsdauer in Minuten.',1,1000000),
      volle_intervalle:scalar('Zahl eindeutiger, vollständiger beobachteter Intervalle.',0,1000000),
      intervall_minuten:scalar('Dauer eines vollständigen Intervalls in Minuten.',.01,1440),
    },
    calculate(a) {
      const observed=a.volle_intervalle*a.intervall_minuten;
      if (!allIntegers(a.volle_intervalle) || observed>a.ziel_minuten+1e-8) throw new RangeError('Eindeutige Intervalle innerhalb der Periode zählen.');
      return {gemessen_prozent:round(100*observed/a.ziel_minuten,2),
        luecke_minuten:round(Math.max(0,a.ziel_minuten-observed)),
        vollstaendig:Math.abs(a.ziel_minuten-observed)<1e-8,
        annahme:'Intervalle sind überschneidungsfrei. Energie in Lücken ist unbekannt. Bei Sommerzeit die echte Dauer statt 24 Stunden ansetzen.'};
    },
    example:{args:{ziel_minuten:1440,volle_intervalle:90,intervall_minuten:15},expect:{luecke_minuten:90,vollstaendig:false}},
  },
  {
    name:'strommessgeraet_kostenfehler',
    description:'Euroanzeige eines Steckdosenmessgeräts nach einer falschen Preiseinstellung umrechnen. — Correct a meter cost display calculated with the wrong tariff.',
    page:meter,
    properties:{
      anzeige_eur:euros('Angezeigte Verbrauchskosten ohne zusätzliche Gebühren.'),
      eingestellt:scalar('Im Gerät gespeicherter Preis in €/kWh.',.001,5),
      richtig:rate('Tatsächlich anzusetzender Arbeitspreis in €/kWh.'),
    },
    calculate(a) {
      const implied=a.anzeige_eur/a.eingestellt;
      return {aus_anzeige_abgeleitet_kwh:round(implied),korrigiert_eur:money(implied*a.richtig),
        annahme:'Nur bei proportionaler Kostenanzeige im selben Zeitraum. Wegen Euro-Rundung möglichst den direkt gemessenen kWh-Wert verwenden.'};
    },
    example:{args:{anzeige_eur:9,eingestellt:.5,richtig:.35},expect:{aus_anzeige_abgeleitet_kwh:18,korrigiert_eur:6.3}},
  },
  {
    name:'messreihe_haushaltsgeraet_ausreisser',
    description:'Fünf Wiederholungsmessungen derselben Geräteaufgabe auf einen auffälligen Einzelwert prüfen. — Flag an unusual repeat measurement without discarding it automatically.',
    page:meter,
    properties:{
      lauf_1:energy('Energie des ersten Laufs in kWh.'),lauf_2:energy('Energie des zweiten Laufs in kWh.'),
      lauf_3:energy('Energie des dritten Laufs in kWh.'),lauf_4:energy('Energie des vierten Laufs in kWh.'),
      lauf_5:energy('Energie des fünften Laufs in kWh.'),
      grenze_kwh:scalar('Dein absoluter Prüfspielraum in kWh, mindestens Auflösung und relevante Messabweichung berücksichtigen.',0,1000),
    },
    calculate(a) {
      const rows=[a.lauf_1,a.lauf_2,a.lauf_3,a.lauf_4,a.lauf_5];
      const median=[...rows].sort((x,y)=>x-y)[2];
      return {median_kwh:round(median,6),auffaellige_laeufe:rows.flatMap((value,index)=>Math.abs(value-median)>a.grenze_kwh+1e-9?[index+1]:[]),
        annahme:'Gleiche Aufgabe und Ergebnisqualität. Prüfmarkierung ist kein statistischer Nachweis. Vor Ausschluss eines Werts Bedingungen prüfen und Lauf wiederholen.'};
    },
    example:{args:{lauf_1:.81,lauf_2:.84,lauf_3:1.61,lauf_4:.8,lauf_5:.82,grenze_kwh:.12},expect:{median_kwh:.82,auffaellige_laeufe:[3]}},
  },
  {
    name:'steckdosenmessgeraet_einsatzgrenze',
    description:'Vor einer Steckdosenmessung prüfen, ob eine bestätigte Gerätegrenze zur beobachteten Last passt. — Check documented plug-meter capacity and load-type approval before measuring.',
    page:meter,
    properties:{
      last_w:scalar('Höchste dokumentierte normale Wirkleistung des Geräts in W.',0,20000),
      limit_w:scalar('Vom Messgerätehersteller für die Lastart erlaubte Wirkleistung in W.',1,20000),
      lastart_freigabe:flag('Messgeräteanleitung bestätigt diese Lastart samt Einsatzbedingungen und Einschaltlast.'),
    },
    calculate(a) {
      return {rechnerischer_abstand_w:round(a.limit_w-a.last_w,1),im_angegebenen_rahmen:a.lastart_freigabe && a.last_w<=a.limit_w,
        annahme:'Keine Sicherheitsprüfung. Zulässige Stromstärke, Dauerlast, Steckertyp und Einschaltstrom nach Anleitung prüfen. Unklare oder nicht freigegebene Lasten nicht anschließen.'};
    },
    example:{args:{last_w:2100,limit_w:2300,lastart_freigabe:false},expect:{rechnerischer_abstand_w:200,im_angegebenen_rahmen:false}},
  },
  {
    name:'stromtarif_grundpreis_tage',
    description:'Prüfen, welcher Anteil eines jährlichen Grundpreises zu einem kürzeren Abrechnungszeitraum gehört. — Check a partial-period fixed charge under a day-based billing method.',
    page:tariff,
    properties:{
      grund_jahr:euros('Jahresgrundpreis in Euro brutto, nur ein gültiger Preis.'),
      berechnete_tage:day('Zahl der berechneten Tage laut Abrechnung.'),
      jahresbasis:scalar('Vertragliche Zahl der Tage für die anteilige Berechnung.',360,366),
      rechnung_grund:euros('Tatsächlich berechneter Grundpreis für genau diesen Zeitraum.'),
    },
    calculate(a) {
      if (!allIntegers(a.berechnete_tage,a.jahresbasis) || a.berechnete_tage>a.jahresbasis) throw new RangeError('Tagesbasis und Teilzeitraum prüfen.');
      const expected=a.grund_jahr*a.berechnete_tage/a.jahresbasis;
      return {anteil_eur:money(expected),rechnung_minus_szenario_eur:money(a.rechnung_grund-expected),
        annahme:'Eine Tagespauschale bei unverändertem Preis. Monatliche Pauschalen, Preiswechsel und vertragliche Abrechnungsmethoden separat prüfen.'};
    },
    example:{args:{grund_jahr:146,berechnete_tage:91,jahresbasis:365,rechnung_grund:36.4},expect:{anteil_eur:36.4,rechnung_minus_szenario_eur:0}},
  },
  {
    name:'stromtarif_boersenpreis_endpreis',
    description:'Börsenwert und vertragliche variable Aufschläge in einen Endkunden-Arbeitspreis umrechnen. — Translate a wholesale quote and your known surcharges into an estimated gross unit price.',
    page:spot,
    properties:{
      boerse_eur_mwh:scalar('Derselbe Börsenpreis und dasselbe Zeitintervall wie im Vertrag, in €/MWh netto.',-3000,3000),
      beruecksichtigter_anteil:scalar('Vertragsfaktor auf den Börsenpreis, bei eins zu eins 1.',0,3),
      aufschlaege_ct_kwh:scalar('Summe aller variablen vertraglichen Aufschläge in ct/kWh netto.',0,200),
      steuer_prozent:scalar('Umsatzsteuer auf diesen Preis laut Vertrag in Prozent.',0,40),
    },
    calculate(a) {
      const wholesale=a.boerse_eur_mwh/10*a.beruecksichtigter_anteil;
      const net=wholesale+a.aufschlaege_ct_kwh;
      return {netto_ct_kwh:round(net),brutto_ct_kwh:round(net*(1+a.steuer_prozent/100)),
        arbeitspreis_negativ:net<0,annahme:'Keine Preisprognose. Nur das eingegebene lineare Preisbild ohne Mindestpreis, Rundungs- oder Sonderregeln. Feste Kosten bleiben offen.'};
    },
    example:{args:{boerse_eur_mwh:-80,beruecksichtigter_anteil:1,aufschlaege_ct_kwh:19,steuer_prozent:19},expect:{brutto_ct_kwh:13.09,arbeitspreis_negativ:false}},
  },
  {
    name:'stromtarif_verbrauchsgewichteter_preis',
    description:'Eigene Verbrauchsmengen zu drei bekannten Preisfenstern zu einem effektiven Arbeitspreis zusammenführen. — Calculate the unit price you actually paid from interval energy and gross prices.',
    page:spot,
    properties:{
      kwh_a:energy('Energie in Fenster A in kWh.'),preis_a:scalar('Brutto-Arbeitspreis A in €/kWh.',-5,5),
      kwh_b:energy('Energie in Fenster B in kWh.'),preis_b:scalar('Brutto-Arbeitspreis B in €/kWh.',-5,5),
      kwh_c:energy('Energie in Fenster C in kWh, bei keinem dritten Fenster 0.'),preis_c:scalar('Brutto-Arbeitspreis C in €/kWh.',-5,5),
    },
    calculate(a) {
      const used=a.kwh_a+a.kwh_b+a.kwh_c;
      const usageCost=a.kwh_a*a.preis_a+a.kwh_b*a.preis_b+a.kwh_c*a.preis_c;
      return {verbrauch_kwh:round(used),arbeitspreiskosten_eur:money(usageCost),
        gewichtet_eur_kwh:used===0?null:round(usageCost/used,5),
        annahme:'Gewichtung nach kWh, keine Durchschnittsbildung über die Dauer allein. Zeitfenster dürfen sich nicht überschneiden. Ohne fixe Kosten.'};
    },
    example:{args:{kwh_a:10,preis_a:.2,kwh_b:30,preis_b:.4,kwh_c:0,preis_c:0},expect:{gewichtet_eur_kwh:.35}},
  },
  {
    name:'stromtarif_teilgarantie_szenario',
    description:'Preisänderung unter einer nur teilweise geltenden Preisgarantie durchspielen. — Stress-test the annual cost when only part of a tariff is covered by a price guarantee.',
    page:tariff,
    properties:{
      jahres_kwh:energy('Jahresverbrauch in kWh.'),grund_jahr:euros('Als unverändert angenommener Jahresgrundpreis in Euro.'),
      garantiert:rate('Geschützter Anteil des Arbeitspreises in Brutto-€/kWh.'),
      ungeschuetzt:rate('Heutiger ungeschützter Anteil in Brutto-€/kWh.'),
      aenderung_prozent:scalar('Angenommene Änderung nur des ungeschützten Teils in Prozent.',-100,500),
    },
    calculate(a) {
      const unprotected=a.ungeschuetzt*(1+a.aenderung_prozent/100);
      const oldTotal=a.grund_jahr+a.jahres_kwh*(a.garantiert+a.ungeschuetzt);
      return {bisher_eur_jahr:money(oldTotal),szenario_eur_jahr:money(a.grund_jahr+a.jahres_kwh*(a.garantiert+unprotected)),
        differenz_eur_jahr:money(a.jahres_kwh*(unprotected-a.ungeschuetzt)),
        annahme:'Vorgegebene Garantiebausteine sind Eingaben. Tarifdokument prüfen. Keine Prognose für Netzentgelte, Steuern oder Anbieterpreise.'};
    },
    example:{args:{jahres_kwh:3000,grund_jahr:120,garantiert:.18,ungeschuetzt:.1,aenderung_prozent:20},expect:{szenario_eur_jahr:1020,differenz_eur_jahr:60}},
  },
  {
    name:'stromtarif_vorauszahlung_kapital',
    description:'Kapitalbindung einer Vorauszahlung gegenüber Monatszahlungen abschätzen. — Estimate the opportunity cost of paying a full year up front.',
    page:tariff,
    properties:{
      voraus_eur:euros('Gesamter heute im Voraus fälliger Preis in Euro.'),
      monat_eur:euros('Preis einer konstanten Monatszahlung in Euro.'),
      rechenzins_prozent:scalar('Selbst gewählter jährlicher Vergleichszins in Prozent.',0,40),
    },
    calculate(a) {
      const pv=Array.from({length:12},(_,month)=>a.monat_eur/(1+a.rechenzins_prozent/100)**(month/12)).reduce((total,payment)=>total+payment,0);
      return {monatszahlungen_heutiger_wert_eur:money(pv),vorteil_vorauszahlung_heutiger_wert_eur:money(pv-a.voraus_eur),
        annahme:'Zwölf Zahlungen zu Monatsbeginn, die erste sofort. Anbieter-, Ausfall- und Erstattungsrisiko ist nicht eingepreist. Keine Vertragsbewertung.'};
    },
    example:{args:{voraus_eur:1140,monat_eur:100,rechenzins_prozent:0},expect:{vorteil_vorauszahlung_heutiger_wert_eur:60}},
  },
  {
    name:'stromrechnung_steuerbasis_abgleich',
    description:'Netto-, Steuer- und Bruttobetrag einer Stromrechnungsposition rechnerisch abgleichen. — Reconcile net, gross and the stated tax rate for one bill line.',
    page:tariff,
    properties:{
      netto:euros('Nettobetrag in Euro für eine einzelne Position.'),
      brutto:euros('Bruttobetrag in Euro derselben Position.'),
      steuer_prozent:scalar('Auf dieser Position ausgewiesener Prozentsatz.',0,40),
    },
    calculate(a) {
      const amount=money(a.netto*a.steuer_prozent/100);
      return {erwartete_steuer_eur:amount,erwartet_brutto_eur:money(a.netto+amount),abweichung_eur:money(a.brutto-a.netto-amount),
        annahme:'Eine Position und ein eingegebener Steuersatz. Mehrere Rundungsebenen separat prüfen. Keine Aussage über den rechtlich anzuwendenden Satz.'};
    },
    example:{args:{netto:100,brutto:119,steuer_prozent:19},expect:{erwartete_steuer_eur:19,abweichung_eur:0}},
  },
  {
    name:'stromtarif_bonus_bedingungen_check',
    description:'Bei einem Neukundenbonus offene Bedingungen und den Unterschied bei ausbleibender Zahlung sichtbar machen. — Identify unresolved bonus conditions before budgeting a conditional credit.',
    page:tariff,
    properties:{
      kosten_ohne_bonus:euros('Kosten im ersten Tarifjahr ohne Bonus in Euro.'),
      bonus_eur:euros('Einmaliger Bonus in Euro laut Angebot.'),
      bezugsdauer_ok:flag('Vorgeschriebene tatsächliche Belieferungsdauer wurde oder wird belegbar erfüllt.'),
      kundenstatus_ok:flag('Bedingung zum Neukundenstatus ist anhand der Tarifunterlagen geprüft.'),
      weitere_bedingungen_ok:flag('Weitere Bonusbedingungen und die Auszahlung sind anhand der Unterlagen geprüft.'),
    },
    calculate(a) {
      const checks={belieferungsdauer:a.bezugsdauer_ok,kundenstatus:a.kundenstatus_ok,weitere_bedingungen:a.weitere_bedingungen_ok};
      return {budget_ohne_bonus_eur:money(a.kosten_ohne_bonus),szenario_mit_bonus_eur:money(a.kosten_ohne_bonus-a.bonus_eur),
        noch_offen:Object.entries(checks).filter(([,checked])=>!checked).map(([name])=>name),
        annahme:'Prüfliste anhand der Eingaben. Eine bestätigte Prüfung ist weder Zahlungsbeleg noch Nachweis eines Anspruchs.'};
    },
    example:{args:{kosten_ohne_bonus:1120,bonus_eur:120,bezugsdauer_ok:false,kundenstatus_ok:true,weitere_bedingungen_ok:true},expect:{szenario_mit_bonus_eur:1000,noch_offen:['belieferungsdauer']}},
  },
  {
    name:'stromtarif_niedertarif_mindestanteil',
    description:'Benötigten Anteil des Verbrauchs im günstigen Zeitfenster gegenüber einem Einheitstarif bestimmen. — Find how much consumption must fall in the low-rate band to match a flat offer.',
    page:tariff,
    properties:{
      jahres_kwh:scalar('Erwarteter Jahresverbrauch in kWh.',1,100000),
      grund_flat:euros('Jahresgrundpreis des Einheitstarifs.'),preis_flat:rate('Brutto-€/kWh des Einheitstarifs.'),
      grund_zeit:euros('Jahresgrundpreis des Zweizeit-Tarifs.'),preis_hoch:rate('Brutto-€/kWh außerhalb des günstigen Fensters.'),
      preis_niedrig:rate('Brutto-€/kWh im günstigen Fenster.'),
    },
    calculate(a) {
      if (a.preis_hoch<=a.preis_niedrig) throw new RangeError('Ein wirklich günstigeres Zeitfenster eingeben.');
      const extraAtHigh=a.grund_zeit-a.grund_flat+a.jahres_kwh*(a.preis_hoch-a.preis_flat);
      const share=extraAtHigh/(a.jahres_kwh*(a.preis_hoch-a.preis_niedrig));
      return {mindestanteil_prozent:share>1+1e-9?null:round(Math.min(1,Math.max(0,share))*100,3),
        erreichbar:share<=1+1e-9,zeit_tarif_bei_null_niedertarif_teurer:extraAtHigh>1e-8,
        annahme:'Konstante Preise für zwei feste Bänder und gleicher Jahresverbrauch, ohne Boni; kein Tarif- oder Zählerangebot.'};
    },
    example:{args:{jahres_kwh:2400,grund_flat:120,preis_flat:.32,grund_zeit:120,preis_hoch:.38,preis_niedrig:.26},expect:{mindestanteil_prozent:50,erreichbar:true}},
  },
  {
    name:'spuelmaschine_beladung_vergleichen',
    description:'Für dieselbe Anzahl Maßgedecke passende Beladungen und deren Strom- und Wasserbedarf prüfen. — Compare different dishwasher load sizes for the same number of clean place settings.',
    page:household,
    properties:{
      gesamt_gedecke:scalar('Anzahl gleicher zu reinigender Maßgedecke.',1,1000),
      gedecke_a:scalar('Gedecke je Lauf in Variante A.',1,30),
      gedecke_b:scalar('Gedecke je Lauf in Variante B.',1,30),
      kwh_a:scalar('Gemessene kWh je Lauf in Variante A.',0,20),
      kwh_b:scalar('Gemessene kWh je Lauf in Variante B.',0,20),
      liter_a:scalar('Gemessene Liter je Lauf in Variante A.',0,200),
      liter_b:scalar('Gemessene Liter je Lauf in Variante B.',0,200),
    },
    calculate(a) {
      if (!allIntegers(a.gesamt_gedecke,a.gedecke_a,a.gedecke_b)) throw new RangeError('Gedecke als ganze Zahl eingeben.');
      const loadA=Math.ceil(a.gesamt_gedecke/a.gedecke_a),loadB=Math.ceil(a.gesamt_gedecke/a.gedecke_b);
      return {laeufe_a:loadA,laeufe_b:loadB,a_kwh:round(loadA*a.kwh_a),b_kwh:round(loadB*a.kwh_b),
        a_liter:round(loadA*a.liter_a),b_liter:round(loadB*a.liter_b),
        annahme:'Gleiches Reinigungsergebnis und zulässige Beladungen. Jeder Lauf einschließlich einer Restladung wird zu den eingegebenen Werten angesetzt.'};
    },
    example:{args:{gesamt_gedecke:24,gedecke_a:6,gedecke_b:12,kwh_a:.63,kwh_b:.82,liter_a:8,liter_b:11},expect:{laeufe_a:4,laeufe_b:2,a_kwh:2.52,b_kwh:1.64}},
  },
  {
    name:'kuehlschrank_temperaturprotokoll',
    description:'Wiederholte Temperaturmessungen im gleichen Kühlschrankfach mit deinem Zielband abgleichen. — Check repeated thermometer readings against your target range before changing settings.',
    page:household,
    properties:{
      morgens_c:scalar('Stabilisierter Messwert am Morgen am gleichen Messort.',-5,30),
      mittags_c:scalar('Stabilisierter Messwert mittags am gleichen Messort.',-5,30),
      abends_c:scalar('Stabilisierter Messwert abends am gleichen Messort.',-5,30),
      ziel_unten_c:scalar('Untere Zielgrenze für genau dieses Fach in °C.',-5,30),
      ziel_oben_c:scalar('Obere Zielgrenze für genau dieses Fach in °C.',-5,30),
    },
    calculate(a) {
      if (a.ziel_unten_c>a.ziel_oben_c) throw new RangeError('Untere und obere Zielgrenze prüfen.');
      const values=[a.morgens_c,a.mittags_c,a.abends_c];
      const minimum=Math.min(...values),maximum=Math.max(...values);
      return {min_c:minimum,max_c:maximum,spanne_c:round(maximum-minimum,1),
        messungen_ausserhalb:values.filter(value=>value<a.ziel_unten_c||value>a.ziel_oben_c).length,
        annahme:'Drei Stichproben sind kein durchgehender Temperaturverlauf. Anleitungen für Fach und Lebensmittel beachten. Ergebnis beurteilt weder Sicherheit noch Verderb.'};
    },
    example:{args:{morgens_c:5,mittags_c:7.8,abends_c:6.4,ziel_unten_c:4,ziel_oben_c:7},expect:{messungen_ausserhalb:1,spanne_c:2.8}},
  },
  {
    name:'led_lichtstrom_und_watt_vergleich',
    description:'LED-Angebote bei gleichem vorgesehenem Lichtstrom anhand der Lumen-pro-Watt-Angabe einordnen. — Compare lamp efficacy only for alternatives that deliver comparable intended light.',
    page:household,
    properties:{
      lumen_a:scalar('Deklarierter Lichtstrom A in lm.',1,20000),
      lumen_b:scalar('Deklarierter Lichtstrom B in lm.',1,20000),
      watt_a:scalar('Deklarierte Leistungsaufnahme A in W.',.1,400),
      watt_b:scalar('Deklarierte Leistungsaufnahme B in W.',.1,400),
      lichtaufgabe_gleich:flag('Lampen sollen dieselbe Lichtaufgabe erfüllen und Abstrahlung ist vergleichbar.'),
      toleranz_prozent:scalar('Maximale akzeptierte Differenz des Lichtstroms relativ zu A in Prozent.',0,100),
    },
    calculate(a) {
      const comparable=a.lichtaufgabe_gleich && Math.abs(a.lumen_b-a.lumen_a)<=a.lumen_a*a.toleranz_prozent/100;
      const ratioA=a.lumen_a/a.watt_a,ratioB=a.lumen_b/a.watt_b;
      return {a_lumen_pro_w:round(ratioA,1),b_lumen_pro_w:round(ratioB,1),vergleichbar:comparable,
        ergebnis:!comparable?'lichtaufgabe_pruefen':ratioA===ratioB?'gleich':ratioA>ratioB?'a':'b',
        annahme:'Lichtstrom ist kein Lux-Messwert am Arbeitsplatz. Sockel, Dimmung, Ausrichtung und Einbaubedingungen separat prüfen.'};
    },
    example:{args:{lumen_a:800,lumen_b:820,watt_a:9,watt_b:7,lichtaufgabe_gleich:true,toleranz_prozent:10},expect:{vergleichbar:true,ergebnis:'b'}},
  },
  {
    name:'wasserkocher_mehrmenge_szenario',
    description:'Zusätzlichen Strombedarf für regelmäßig zu viel eingefülltes Kochwasser abschätzen. — Estimate how much energy goes into repeatedly heating water you do not use.',
    page:household,
    properties:{
      eingefuellt_l:scalar('Tatsächlich eingefüllte Menge in Litern.',.05,5),
      benoetigt_l:scalar('Benötigte Menge in Litern, Hersteller-Mindestfüllung einhalten.',.05,5),
      temperaturhub_c:scalar('Gemessener Temperaturanstieg in °C.',0,100),
      wirkungsgrad:scalar('Angenommener Anteil des Stroms, der das Wasser erwärmt, zwischen 0 und 1.',.1,1),
      vorgaenge:scalar('Zahl vergleichbarer Kochvorgänge im betrachteten Zeitraum.',0,5000),
      strompreis:rate('Bruttoarbeitspreis in €/kWh.'),
    },
    calculate(a) {
      if (a.benoetigt_l>a.eingefuellt_l || !allIntegers(a.vorgaenge)) throw new RangeError('Füllmengen und Zahl der Vorgänge prüfen.');
      const excess=a.eingefuellt_l-a.benoetigt_l;
      const energy=excess*a.temperaturhub_c*.001163/a.wirkungsgrad;
      return {mehrmenge_l:round(excess),zusaetzlich_kwh_pro_vorgang:round(energy,5),
        zusaetzlich_kwh_zeitraum:round(energy*a.vorgaenge),
        zusaetzlich_eur_zeitraum:money(energy*a.vorgaenge*a.strompreis),
        annahme:'Näherung aus Wärmekapazität und angenommenem Wirkungsgrad. Mindestfüllhöhe und Anleitung einhalten. Richtwert für Mehrwasser, keine Gerätemessung.'};
    },
    example:{args:{eingefuellt_l:1,benoetigt_l:.5,temperaturhub_c:80,wirkungsgrad:1,vorgaenge:100,strompreis:.3},expect:{zusaetzlich_kwh_zeitraum:4.652,zusaetzlich_eur_zeitraum:1.4}},
  },
  {
    name:'geraet_reparaturpreis_grenze',
    description:'Bei einem Defekt den maximal vergleichbaren Reparaturpreis für einen festgelegten Nutzungszeitraum bestimmen. — Find the repair quote at which repairing and replacing would have equal costs over a shared horizon.',
    page:replace,
    properties:{
      reparaturangebot:euros('Reparaturangebot einschließlich Arbeit, Teilen und Anfahrt.'),
      neukaufpreis:euros('Vollständiger Preis eines funktional passenden Ersatzes nach Abzug sicherer Erlöse.'),
      alt_kwh_jahr:energy('Geschätzter Jahresverbrauch des reparierten Geräts.'),
      neu_kwh_jahr:energy('Geschätzter Jahresverbrauch des Ersatzgeräts.'),
      jahre:scalar('Für beide Optionen angesetzte verbleibende Vergleichsjahre.',.1,20),
      strompreis:rate('Bruttoarbeitspreis in €/kWh.'),
      reparaturdauer_bestaetigt:flag('Eine ausreichende weitere Nutzungsdauer nach Reparatur ist für das Szenario plausibel begründet.'),
    },
    calculate(a) {
      const cap=a.neukaufpreis+(a.neu_kwh_jahr-a.alt_kwh_jahr)*a.strompreis*a.jahre;
      return {kostengleichstand_reparatur_eur:money(cap),
        reparatur_kostenguenstiger_im_szenario:a.reparaturdauer_bestaetigt?a.reparaturangebot<cap:null,
        annahme:'Gleicher Nutzwert und konstante Jahreswerte. Reparaturdauer, Folgereparaturen und Restwerte separat prüfen. Ein negativer Schwellenwert lässt keinen positiven Reparaturpreis als günstigere Option zu.'};
    },
    example:{args:{reparaturangebot:180,neukaufpreis:550,alt_kwh_jahr:320,neu_kwh_jahr:200,jahre:5,strompreis:.3,reparaturdauer_bestaetigt:true},expect:{kostengleichstand_reparatur_eur:370,reparatur_kostenguenstiger_im_szenario:true}},
  },
  {
    name:'waesche_schleudern_gesamtenergie',
    description:'Zwei Schleuderprogramme nach dem gemeinsamen Strombedarf von Waschen und anschließendem Trocknen vergleichen. — Compare washer spin settings on total wash-to-dry energy from measured loads.',
    page:'/waeschetrockner-oder-luftentfeuchter.html',
    properties:{
      waschen_a:scalar('Gemessene kWh Waschen und Schleudern bei Einstellung A.',0,20),
      trocken_a:scalar('Gemessene kWh für die anschließende Trocknung bei Einstellung A.',0,40),
      waschen_b:scalar('Gemessene kWh Waschen und Schleudern bei Einstellung B.',0,20),
      trocken_b:scalar('Gemessene kWh für die anschließende Trocknung bei Einstellung B.',0,40),
      vergleichbar:flag('Gleiche Wäsche, gleiche Endtrockenheit und für das Textil geeignete Einstellungen.'),
    },
    calculate(a) {
      const totalA=a.waschen_a+a.trocken_a,totalB=a.waschen_b+a.trocken_b;
      return {gesamt_a_kwh:round(totalA),gesamt_b_kwh:round(totalB),
        b_spart_kwh:a.vergleichbar?round(totalA-totalB):null,
        annahme:'Mehr Strom beim Schleudern kann durch weniger Trocknungsenergie ausgeglichen werden. Gewebeverträglichkeit und Messunsicherheit prüfen. Ein negativer Wert bedeutet Mehrverbrauch.'};
    },
    example:{args:{waschen_a:.6,trocken_a:1.2,waschen_b:.7,trocken_b:.85,vergleichbar:true},expect:{gesamt_a_kwh:1.8,gesamt_b_kwh:1.55,b_spart_kwh:.25}},
  },
  {
    name:'waschtrockner_label_nutzungsmix',
    description:'Waschtrockner aus dem kWh-Label für Waschläufe und aus dem separaten Wert für Wasch-Trocken-Läufe auf deinen Nutzungsmix umrechnen. — Interpret both ratings on a washer-dryer without double-counting the wash in combined cycles.',
    page:replace,
    properties:{
      label_waschen:scalar('Labelwert für Nur-Waschen in kWh je 100 Zyklen.',0,5000),
      label_kombiniert:scalar('Labelwert für den vollständigen kombinierten Wasch-Trocken-Zyklus in kWh je 100 Zyklen.',0,5000),
      nur_waschen_zyklen:scalar('Nur-Waschzyklen pro Jahr, außer den kombinierten Zyklen.',0,1000),
      kombiniert_zyklen:scalar('Vollständige kombinierte Wasch-Trocken-Zyklen pro Jahr.',0,1000),
      label_trocken_kg:scalar('Nennbeladung für den kombinierten Zyklus laut Label in kg.',.1,30),
      geplant_kg:scalar('Geplante Masse je kombiniertem Lauf in kg.',.1,30),
    },
    calculate(a) {
      if (!allIntegers(a.nur_waschen_zyklen,a.kombiniert_zyklen)) throw new RangeError('Nur ganze Zyklen zählen.');
      const fits=a.kombiniert_zyklen===0 || a.geplant_kg<=a.label_trocken_kg;
      return {modell_kwh_jahr:fits?round((a.label_waschen*a.nur_waschen_zyklen+a.label_kombiniert*a.kombiniert_zyklen)/100):null,
        kombinationsladung_passt:fits,
        annahme:'Der kombinierte Wert enthält das Waschen bereits. Labelwerte sind normierte Vergleiche, keine Messung im Haushalt. Eine zu große Kombinationsladung erfordert eine neue Zyklusplanung.'};
    },
    example:{args:{label_waschen:50,label_kombiniert:300,nur_waschen_zyklen:100,kombiniert_zyklen:40,label_trocken_kg:5,geplant_kg:4},expect:{modell_kwh_jahr:170,kombinationsladung_passt:true}},
  },
  {
    name:'strommessung_va_w_einordnen',
    description:'VA-Anzeige und W-Anzeige eines Steckdosenmessgeräts für dieselbe Messung auseinanderhalten. — Distinguish apparent power from the active power used for energy billing.',
    page:meter,
    properties:{
      schein_va:scalar('Gemessene Scheinleistung in VA.',0,20000),
      wirk_w:scalar('Gleichzeitig gemessene Wirkleistung in W.',0,20000),
      toleranz_w:scalar('Absoluter Rundungs- und Messspielraum in W bzw. VA.',0,100),
    },
    calculate(a) {
      const plausible=a.wirk_w<=a.schein_va+a.toleranz_w;
      return {leistungsfaktor:plausible && a.schein_va>0?round(Math.min(1,a.wirk_w/a.schein_va),4):null,
        werte_plausibel:plausible,
        annahme:'Für Haushalts-Verbrauchskosten gemessene aktive kWh verwenden. Ergebnis prüft keine Installation, Lastfreigabe oder Zählergenauigkeit.'};
    },
    example:{args:{schein_va:100,wirk_w:72,toleranz_w:2},expect:{leistungsfaktor:.72,werte_plausibel:true}},
  },
  {
    name:'stromverbrauch_lastfenster_audit',
    description:'Drei gemessene, unterschiedlich lange Lastfenster anhand der mittleren Leistung einordnen. — Identify the highest average-demand window without confusing a long window with a high peak.',
    page:meter,
    properties:{
      a_kwh:energy('Gemessene Energie in Fenster A in kWh.'),a_min:scalar('Dauer Fenster A in Minuten.',1,1440),
      b_kwh:energy('Gemessene Energie in Fenster B in kWh.'),b_min:scalar('Dauer Fenster B in Minuten.',1,1440),
      c_kwh:energy('Gemessene Energie in Fenster C in kWh.'),c_min:scalar('Dauer Fenster C in Minuten.',1,1440),
    },
    calculate(a) {
      const watts={a:a.a_kwh*60000/a.a_min,b:a.b_kwh*60000/a.b_min,c:a.c_kwh*60000/a.c_min};
      const highest=Math.max(...Object.values(watts));
      return {a_mittel_w:round(watts.a,1),b_mittel_w:round(watts.b,1),c_mittel_w:round(watts.c,1),
        hoechste_lastfenster:Object.keys(watts).filter(key=>Math.abs(watts[key]-highest)<1e-7),
        annahme:'Mittelwerte der jeweiligen Messfenster. Kurzzeitige Leistungsspitzen bleiben unbekannt. Fenster und Zählerbezug dokumentieren.'};
    },
    example:{args:{a_kwh:1,a_min:60,b_kwh:.7,b_min:15,c_kwh:2,c_min:180},expect:{b_mittel_w:2800,hoechste_lastfenster:['b']}},
  },
];
