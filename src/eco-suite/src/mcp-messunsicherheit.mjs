const meter = '/strommess-protokoll.html';
const humidity = '/guide/luftfeuchtigkeit-richtig-messen.html';
const water = '/guide/duschen-kosten-rechner.html';

const number = (description, minimum = 0, maximum = 1000000) => ({type:'number', description, minimum, maximum});
const count = (description, minimum = 0) => number(description, minimum);
const seconds = description => number(description, 0, 31622400);
const signed = description => number(description, -1000000, 1000000);
const rh = description => number(description, 0, 100);
const boolean = description => ({type:'boolean', description});
const select = (description, ...values) => ({type:'string', description, enum:values});
const round = value => Math.round(value*10000)/10000;
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Einträge oder Zählerstände erforderlich.');
}

export const messunsicherheit = [
  {
    name:'messlogger_raster_dubletten_auswertbar',
    description:'Eindeutig belegte, doppelte und widersprüchliche Rasterzeiten in einem Messprotokoll getrennt zählen — Audit usable timestamp slots without mistaking duplicates for coverage.',
    page:meter,
    properties:{
      soll_zeiten:count('Erwartete Rasterzeiten im abgegrenzten Protokoll.',1),
      zeilen_im_raster:count('Zeilen mit passender Zeit einschließlich Wiederholungen.'),
      unterschiedliche_zeiten:count('Verschiedene Rasterzeiten, für die mindestens eine Zeile vorliegt.'),
      widerspruch_zeiten:count('Verschiedene Rasterzeiten mit inhaltlich widersprüchlichen Werten.'),
      zeilen_ausserhalb:count('Weitere Zeilen außerhalb des vereinbarten Rasters.'),
    },
    calculate({soll_zeiten,zeilen_im_raster,unterschiedliche_zeiten,widerspruch_zeiten,zeilen_ausserhalb}) {
      whole(soll_zeiten,zeilen_im_raster,unterschiedliche_zeiten,widerspruch_zeiten,zeilen_ausserhalb);
      const duplicates=zeilen_im_raster-unterschiedliche_zeiten;
      if (unterschiedliche_zeiten>soll_zeiten||widerspruch_zeiten>Math.min(unterschiedliche_zeiten,duplicates)) throw new RangeError('Rasterzeiten und Zeilen prüfen.');
      return {auswertbare_rasterzeiten:unterschiedliche_zeiten-widerspruch_zeiten,fehlende_rasterzeiten:soll_zeiten-unterschiedliche_zeiten,
        wiederholte_zeilen:duplicates,konflikte:widerspruch_zeiten,ausserhalb:zeilen_ausserhalb,
        hinweis:'Gleiche Wiederholungen nur einmal übernehmen. Widersprüche vor dem Vergleich klären.'};
    },
    example:{args:{soll_zeiten:60,zeilen_im_raster:56,unterschiedliche_zeiten:53,widerspruch_zeiten:2,zeilen_ausserhalb:4},expect:{auswertbare_rasterzeiten:51,fehlende_rasterzeiten:7,wiederholte_zeilen:3}},
  },
  {
    name:'raumlogger_ereignis_raster_grenzfall',
    description:'Einen unscharf protokollierten Lüftungsbeginn nur bei eindeutiger Lage einem Messintervall zuordnen — Assign an uncertain event time to a single fixed-width log bin when possible.',
    page:humidity,
    properties:{
      fruehestens_s:seconds('Frühester möglicher Beginn, Sekunden ab Rasterursprung.'),
      spaetestens_s:seconds('Spätester möglicher Beginn, Sekunden ab Rasterursprung.'),
      raster_s:number('Konstante Rasterbreite in Sekunden.',1,86400),
    },
    calculate({fruehestens_s,spaetestens_s,raster_s}) {
      if (spaetestens_s<fruehestens_s) throw new RangeError('Späteste Zeit liegt vor der frühesten Zeit.');
      const first=Math.floor(fruehestens_s/raster_s);
      const last=Math.floor(spaetestens_s/raster_s);
      return {erstes_moegliches_intervall:first,letztes_moegliches_intervall:last,zugeordnetes_intervall:first===last?first:null,
        hinweis:'Intervall 0 beginnt am gemeinsamen Ursprung. Ein Zeitpunkt genau auf der Grenze gehört zum späteren Intervall.'};
    },
    example:{args:{fruehestens_s:299,spaetestens_s:305,raster_s:300},expect:{erstes_moegliches_intervall:0,letztes_moegliches_intervall:1,zugeordnetes_intervall:null}},
  },
  {
    name:'messluecken_ereignisgruppen_verdecken',
    description:'Prüfen, ob einzelne Lücken ein ganzes Ereignis verdecken, obwohl das Protokoll insgesamt dicht ist — Distinguish total missing time from the longest blind spot.',
    page:meter,
    properties:{
      fenster_s:number('Dauer des Zielzeitraums, Sekunden.',1,31622400),
      alle_luecken_s:seconds('Summe überschneidungsfreier unbeobachteter Zeitfenster.'),
      laengste_luecke_s:seconds('Dauer der längsten einzelnen unbeobachteten Zeitspanne.'),
      kuerzestes_ereignis_s:number('Kürzeste Dauer des gesuchten Ereignisses, Sekunden.',0.001,31622400),
    },
    calculate({fenster_s,alle_luecken_s,laengste_luecke_s,kuerzestes_ereignis_s}) {
      if (laengste_luecke_s>alle_luecken_s||alle_luecken_s>fenster_s||(alle_luecken_s>0&&!laengste_luecke_s)) throw new RangeError('Lückenzeiten prüfen.');
      return {beobachtet_prozent:round(100*(fenster_s-alle_luecken_s)/fenster_s),
        ganzes_ereignis_in_einer_luecke_moeglich:laengste_luecke_s>=kuerzestes_ereignis_s,
        reserve_zur_ereignislaenge_s:round(kuerzestes_ereignis_s-laengste_luecke_s),
        hinweis:'Gilt für als Zeitabschnitte bekannte Lücken. Eine Abtastung zwischen diesen Lücken kann weitere Blindstellen haben.'};
    },
    example:{args:{fenster_s:3600,alle_luecken_s:180,laengste_luecke_s:120,kuerzestes_ereignis_s:90},expect:{beobachtet_prozent:95,ganzes_ereignis_in_einer_luecke_moeglich:true,reserve_zur_ereignislaenge_s:-30}},
  },
  {
    name:'stromlog_integrationsmethode_abstand',
    description:'Aus drei Leistungswerten zwei ausdrücklich angenommene Integrationsarten vergleichen — Test sensitivity to step-hold versus linear interpretation of three unevenly spaced power samples.',
    page:meter,
    properties:{
      anfang_w:number('Wirkleistung am ersten abgelesenen Punkt in Watt.',0,50000),
      mitte_w:number('Wirkleistung am mittleren abgelesenen Punkt in Watt.',0,50000),
      ende_w:number('Wirkleistung am letzten abgelesenen Punkt in Watt.',0,50000),
      erster_abschnitt_min:number('Minuten vom ersten zum zweiten Punkt.',0.001,1440),
      zweiter_abschnitt_min:number('Minuten vom zweiten zum dritten Punkt.',0.001,1440),
    },
    calculate({anfang_w,mitte_w,ende_w,erster_abschnitt_min,zweiter_abschnitt_min}) {
      const hold=(anfang_w*erster_abschnitt_min+mitte_w*zweiter_abschnitt_min)/60;
      const linear=((anfang_w+mitte_w)*erster_abschnitt_min+(mitte_w+ende_w)*zweiter_abschnitt_min)/120;
      return {letzten_wert_halten_wh:round(hold),linear_wh:round(linear),linear_minus_halten_wh:round(linear-hold),
        hinweis:'Zwei Rechenannahmen aus Punktwerten. Weder Extremwerte noch ein garantiertes Energieintervall werden daraus beobachtet.'};
    },
    example:{args:{anfang_w:0,mitte_w:120,ende_w:0,erster_abschnitt_min:30,zweiter_abschnitt_min:10},expect:{letzten_wert_halten_wh:20,linear_wh:40,linear_minus_halten_wh:20}},
  },
  {
    name:'messreihe_konstante_anzeige_kontrollwechsel',
    description:'Gleichbleibende Sensorwerte nach einem unabhängig beobachteten Kontrollwechsel prüfen — Screen a flat trace against a documented above-resolution reference change.',
    page:humidity,
    properties:{
      spannweite_anzeige:number('Spannweite der aufgezeichneten Werte in einer einheitlichen Einheit.'),
      spannweite_referenz:number('An demselben Ort gemessene Referenzspannweite in derselben Einheit.'),
      kleinster_sichtbarer_schritt:number('Dokumentierte Anzeigestufe der geprüften Messgröße.',0.0001),
      messfenster_gleich:boolean('Sind Messgröße, Ort, Zeit und Reaktionszeit für die Kontrolle vergleichbar?'),
    },
    calculate({spannweite_anzeige,spannweite_referenz,kleinster_sichtbarer_schritt,messfenster_gleich}) {
      if (!messfenster_gleich) return {status:'kontrolle_nicht_vergleichbar',statischer_export_auffaellig:null};
      const auffaellig=spannweite_anzeige===0&&spannweite_referenz>kleinster_sichtbarer_schritt;
      return {status:auffaellig?'anzeige_und_export_pruefen':'kein_treffer_nach_diesem_kriterium',
        statischer_export_auffaellig:auffaellig,referenz_in_anzeigestufen:round(spannweite_referenz/kleinster_sichtbarer_schritt),
        hinweis:'Wenn die Anzeige reagiert und der Export gleich bleibt, zuerst Export oder Übertragung prüfen. Kein Defektnachweis.'};
    },
    example:{args:{spannweite_anzeige:0,spannweite_referenz:5,kleinster_sichtbarer_schritt:1,messfenster_gleich:true},expect:{statischer_export_auffaellig:true,referenz_in_anzeigestufen:5}},
  },
  {
    name:'messprotokoll_zeitpaarung_viele_zeilen',
    description:'Vor dem Zusammenführen von Klima- und Verbrauchsprotokoll künstlich vervielfachte Zeilen im Zeitjoin erkennen — Quantify many-to-many row inflation before joining timestamped logs.',
    page:meter,
    properties:{
      andere_eindeutige_paare:count('Eins-zu-eins-Paare außerhalb des fraglichen Zeitstempels.'),
      klima_zeilen_zeit:count('Klimazeilen am fraglichen gemeinsamen Zeitstempel.',1),
      verbrauch_zeilen_zeit:count('Verbrauchszeilen an demselben Zeitstempel.',1),
    },
    calculate({andere_eindeutige_paare,klima_zeilen_zeit,verbrauch_zeilen_zeit}) {
      whole(andere_eindeutige_paare,klima_zeilen_zeit,verbrauch_zeilen_zeit);
      const pairings=klima_zeilen_zeit*verbrauch_zeilen_zeit;
      return {zeilen_bei_blindem_join:andere_eindeutige_paare+pairings,mehrdeutige_paare_am_zeitpunkt:pairings>1?pairings:0,
        ohne_zusatzschluessel_sichere_paare:andere_eindeutige_paare+(pairings===1?1:0),
        hinweis:'Passende Sensor-ID oder Abtastperiode belegen. Reihenfolge im Export allein löst Mehrdeutigkeit nicht.'};
    },
    example:{args:{andere_eindeutige_paare:50,klima_zeilen_zeit:2,verbrauch_zeilen_zeit:3},expect:{zeilen_bei_blindem_join:56,mehrdeutige_paare_am_zeitpunkt:6,ohne_zusatzschluessel_sichere_paare:50}},
  },
  {
    name:'haushaltswaage_nullpunkt_driftspanne',
    description:'Gewichtsmessung mit Nullanzeige vor und nach dem Wiegen samt Restunsicherheit einordnen — Bound tare drift using verified zero readings at both ends.',
    page:'/waeschetrockner-oder-luftentfeuchter.html',
    properties:{
      anzeige_g:number('Angezeigte Bruttomasse in Gramm.'),
      null_vor_g:signed('Anzeige der leeren Wiegefläche vor dem Versuch, Gramm.'),
      null_nach_g:signed('Anzeige der leeren Wiegefläche nach dem Versuch, Gramm.'),
      restspielraum_g:number('Zusätzlicher begründeter absoluter Spielraum in Gramm, ohne erneut eingerechnete Nullpunktdrift.'),
      zwischenwerte_begrenzt:boolean('Darf der Nullpunkt im betrachteten Fenster auf den Bereich der beiden Kontrollwerte begrenzt werden?'),
    },
    calculate({anzeige_g,null_vor_g,null_nach_g,restspielraum_g,zwischenwerte_begrenzt}) {
      const drift=Math.abs(null_nach_g-null_vor_g);
      if (!zwischenwerte_begrenzt) return {nullpunkt_aenderung_g:round(drift),untergrenze_g:null,obergrenze_g:null};
      const min=anzeige_g-Math.max(null_vor_g,null_nach_g)-restspielraum_g;
      const max=anzeige_g-Math.min(null_vor_g,null_nach_g)+restspielraum_g;
      if (max<0) return {nullpunkt_aenderung_g:round(drift),untergrenze_g:null,obergrenze_g:null,status:'werte_pruefen'};
      return {nullpunkt_aenderung_g:round(drift),untergrenze_g:round(Math.max(0,min)),obergrenze_g:round(max),
        hinweis:'Rechnungsgrenze für die eigene Wägung, abhängig von der Annahme über den Nullpunkt zwischen den Kontrollen.'};
    },
    example:{args:{anzeige_g:504,null_vor_g:1,null_nach_g:3,restspielraum_g:1,zwischenwerte_begrenzt:true},expect:{nullpunkt_aenderung_g:2,untergrenze_g:500,obergrenze_g:504}},
  },
  {
    name:'hygrometer_zweipunkt_referenz_abgleich',
    description:'Feuchteanzeige zwischen zwei extern belegten Referenzpunkten linear einordnen — Estimate a bounded two-point humidity comparison without extrapolating.',
    page:humidity,
    properties:{
      anzeige_tief_rh:rh('Verglichene Anzeige am niedrigeren Prüfpunkt.'),
      anzeige_hoch_rh:rh('Verglichene Anzeige am höheren Prüfpunkt.'),
      referenz_tief_rh:rh('Externer Referenzwert am niedrigeren Prüfpunkt.'),
      referenz_hoch_rh:rh('Externer Referenzwert am höheren Prüfpunkt.'),
      anzeige_neu_rh:rh('Anzeige, für die der Vergleichswert eingeordnet werden soll.'),
      vergleichbar:boolean('Referenzwerte unabhängig belegt und Bedingungen einschließlich Temperatur vergleichbar?'),
    },
    calculate({anzeige_tief_rh,anzeige_hoch_rh,referenz_tief_rh,referenz_hoch_rh,anzeige_neu_rh,vergleichbar}) {
      if (anzeige_hoch_rh<=anzeige_tief_rh||referenz_hoch_rh<=referenz_tief_rh) throw new RangeError('Zwei verschiedene aufsteigende Punkte je Reihe erforderlich.');
      if (!vergleichbar||anzeige_neu_rh<anzeige_tief_rh||anzeige_neu_rh>anzeige_hoch_rh) return {status:'vergleich_offen',vergleich_rh:null};
      const value=referenz_tief_rh+(anzeige_neu_rh-anzeige_tief_rh)*(referenz_hoch_rh-referenz_tief_rh)/(anzeige_hoch_rh-anzeige_tief_rh);
      return {status:'linear_zwischen_referenzen',vergleich_rh:round(value),vergleich_minus_anzeige_pp:round(value-anzeige_neu_rh),
        hinweis:'Lineare Rechenannahme zwischen zwei extern belegten Punkten. Kein Nachweis einer Kalibrierung oder Herstellerfreigabe.'};
    },
    example:{args:{anzeige_tief_rh:35,anzeige_hoch_rh:75,referenz_tief_rh:40,referenz_hoch_rh:80,anzeige_neu_rh:51,vergleichbar:true},expect:{vergleich_rh:56,vergleich_minus_anzeige_pp:5}},
  },
  {
    name:'strommessung_gemeinsamer_offset_differenz',
    description:'Beim A/B-Vergleich belegten gemeinsamen additiven Messfehler von laufabhängigen Fehlern trennen — Bound a power difference with or without verified common-mode cancellation.',
    page:meter,
    properties:{
      a_w:number('Gemessene Wirkleistung A in Watt.',0,50000),
      b_w:number('Gemessene Wirkleistung B in Watt.',0,50000),
      rest_a_w:number('Unterschiedlicher laufabhängiger maximaler Fehler A in Watt.',0,50000),
      rest_b_w:number('Unterschiedlicher laufabhängiger maximaler Fehler B in Watt.',0,50000),
      offset_grenze_w:number('Maximaler additiver Offset je Messung in Watt.',0,50000),
      gleicher_offset_belegt:boolean('Ist für beide Werte derselbe unveränderte additive Offset belegt?'),
    },
    calculate({a_w,b_w,rest_a_w,rest_b_w,offset_grenze_w,gleicher_offset_belegt}) {
      const diff=b_w-a_w;
      const spielraum=rest_a_w+rest_b_w+(gleicher_offset_belegt?0:2*offset_grenze_w);
      return {differenz_b_minus_a_w:round(diff),untere_differenz_w:round(diff-spielraum),obere_differenz_w:round(diff+spielraum),
        richtung_aus_grenzen:diff-spielraum>1e-9?'b_hoeher':diff+spielraum< -1e-9?'b_niedriger':'offen',
        hinweis:'Ein unveränderter additiver Offset hebt sich in der Differenz auf. Prozentfehler und Drift separat begrenzen.'};
    },
    example:{args:{a_w:100,b_w:108,rest_a_w:1,rest_b_w:2,offset_grenze_w:5,gleicher_offset_belegt:true},expect:{untere_differenz_w:5,obere_differenz_w:11,richtung_aus_grenzen:'b_hoeher'}},
  },
  {
    name:'stromversuch_streuung_gruppen_zusammen',
    description:'Standardabweichung zweier gleich abgegrenzter Versuchsgruppen aus Anzahlen, Mittelwerten und Gruppenstreuungen kombinieren — Pool individual energy-run variation while preserving between-group differences.',
    page:meter,
    properties:{
      a_laeufe:count('Zahl gültiger unabhängiger Messläufe in A.',2), b_laeufe:count('Zahl gültiger unabhängiger Messläufe in B.',2),
      a_mittel_kwh:number('Verbrauchsmittel A in kWh.'), b_mittel_kwh:number('Verbrauchsmittel B in kWh.'),
      a_stichprobe_sd_kwh:number('Stichproben-Standardabweichung A in kWh, berechnet mit n−1.'),
      b_stichprobe_sd_kwh:number('Stichproben-Standardabweichung B in kWh, berechnet mit n−1.'),
      vergleichbar:boolean('Sind Messendpunkt, Aufgabe und Einheit gleich sowie die Versuche überschneidungsfrei?'),
    },
    calculate({a_laeufe,b_laeufe,a_mittel_kwh,b_mittel_kwh,a_stichprobe_sd_kwh,b_stichprobe_sd_kwh,vergleichbar}) {
      whole(a_laeufe,b_laeufe);
      if (!vergleichbar) return {zusammenfassbar:false,gemeinsame_streuung_kwh:null};
      const n=a_laeufe+b_laeufe;
      const mittel=(a_laeufe*a_mittel_kwh+b_laeufe*b_mittel_kwh)/n;
      const innerhalb=(a_laeufe-1)*a_stichprobe_sd_kwh**2+(b_laeufe-1)*b_stichprobe_sd_kwh**2;
      const zwischen=(a_laeufe*b_laeufe/n)*(a_mittel_kwh-b_mittel_kwh)**2;
      return {zusammenfassbar:true,anzahl_laeufe:n,gesamtmittel_kwh:round(mittel),
        gemeinsame_streuung_kwh:round(Math.sqrt((innerhalb+zwischen)/(n-1))),
        anteil_quadratsumme_zwischen_prozent:innerhalb+zwischen?round(100*zwischen/(innerhalb+zwischen)):null,
        hinweis:'Beschreibt die Beobachtungen. Die gepoolte Streuung ist kein Messgerätefehler und keine Vorhersagespanne.'};
    },
    example:{args:{a_laeufe:3,b_laeufe:3,a_mittel_kwh:1,b_mittel_kwh:3,a_stichprobe_sd_kwh:0,b_stichprobe_sd_kwh:0,vergleichbar:true},expect:{anzahl_laeufe:6,gesamtmittel_kwh:2,gemeinsame_streuung_kwh:1.0954,anteil_quadratsumme_zwischen_prozent:100}},
  },
  {
    name:'raumfeuchte_mittelwert_schwellenanteil',
    description:'Aus einem Bereich und Zeitmittel ableiten, welchen Schwellenanteil das Protokoll höchstens und mindestens zulässt — Bound time at or above a humidity threshold when only aggregate data survive.',
    page:humidity,
    properties:{
      zeitmittel_rh:rh('Belegtes, zeitgewichtetes Mittel im vollständigen Fenster.'),
      unterste_moegliche_rh:rh('Belegte Untergrenze der Feuchte im Fenster.'),
      oberste_moegliche_rh:rh('Belegte Obergrenze der Feuchte im Fenster.'),
      schwelle_rh:rh('Selbst gewählte Prüfschwelle in % relativer Feuchte.'),
    },
    calculate({zeitmittel_rh,unterste_moegliche_rh,oberste_moegliche_rh,schwelle_rh}) {
      if (zeitmittel_rh<unterste_moegliche_rh||zeitmittel_rh>oberste_moegliche_rh) throw new RangeError('Das Mittel liegt außerhalb des eingegebenen Bereichs.');
      if (schwelle_rh<=unterste_moegliche_rh) return {mindestens_prozent:100,hoechstens_prozent:100};
      if (schwelle_rh>oberste_moegliche_rh) return {mindestens_prozent:0,hoechstens_prozent:0};
      const min=schwelle_rh===oberste_moegliche_rh
        ? Number(zeitmittel_rh===schwelle_rh)
        : Math.max(0,(zeitmittel_rh-schwelle_rh)/(oberste_moegliche_rh-schwelle_rh));
      const max=Math.min(1,(zeitmittel_rh-unterste_moegliche_rh)/(schwelle_rh-unterste_moegliche_rh));
      return {mindestens_prozent:round(100*min),hoechstens_prozent:round(100*max),
        hinweis:'Rechengrenzen für die Dauer auf oder über der Schwelle. Das Zeitmittel weist keinen konkreten Verlauf nach.'};
    },
    example:{args:{zeitmittel_rh:65,unterste_moegliche_rh:40,oberste_moegliche_rh:80,schwelle_rh:60},expect:{mindestens_prozent:25,hoechstens_prozent:100}},
  },
  {
    name:'stromexport_gerundete_bloecke_summieren',
    description:'Eine Summe einzeln gerundeter Verbrauchsblöcke gegen einen unabhängigen Gesamtzähler prüfen — Audit the accumulated rounding range in a block energy export.',
    page:meter,
    properties:{
      bloecke:count('Zahl separat gerundeter, gleich aufgelöster Blöcke.',1),
      summe_wh:number('Summe der separat gerundeten Energieblöcke in Wh.'),
      rundungsschritt_wh:number('Exportstufe in Wh; Rundung auf die nächste Stufe vorausgesetzt.',0.001,1000),
      gesamt_wh:number('Unabhängig gemeldeter Gesamtwert für exakt dieselben Blöcke in Wh.'),
      gesamt_spielraum_wh:number('Belegter maximaler Fehler des Gesamtwerts in Wh.'),
    },
    calculate({bloecke,summe_wh,rundungsschritt_wh,gesamt_wh,gesamt_spielraum_wh}) {
      whole(bloecke);
      const margin=bloecke*rundungsschritt_wh/2;
      const min=Math.max(0,summe_wh-margin);
      const max=summe_wh+margin;
      return {export_untere_wh:round(min),export_obere_wh:round(max),roh_differenz_wh:round(gesamt_wh-summe_wh),
        bereiche_ueberlappen:max+1e-9>=gesamt_wh-gesamt_spielraum_wh&&gesamt_wh+gesamt_spielraum_wh+1e-9>=min,
        hinweis:'Gilt für getrennte Rundung auf die nächste Stufe und identische Zeitfenster. Abschneiden oder fehlende Zeilen ändern die Rechnung.'};
    },
    example:{args:{bloecke:10,summe_wh:200,rundungsschritt_wh:2,gesamt_wh:213,gesamt_spielraum_wh:2},expect:{export_untere_wh:190,export_obere_wh:210,bereiche_ueberlappen:false}},
  },
  {
    name:'duschdurchfluss_start_stopp_zeitfehler',
    description:'Einen protokollierten Eimertest mit Start- und Stoppungenauigkeit als Durchflussspanne lesen — Bound water flow with independently bounded endpoint timing error.',
    page:water,
    properties:{
      wasser_liter:number('Aufgefangene gemessene Wassermenge in Litern.',0.001,100),
      dauer_s:number('Abgelesene Versuchsdauer in Sekunden.',0.001,3600),
      start_fehler_s:number('Maximale absolute Abweichung des Startpunkts in Sekunden.',0,3600),
      stopp_fehler_s:number('Maximale absolute Abweichung des Stopppunkts in Sekunden.',0,3600),
    },
    calculate({wasser_liter,dauer_s,start_fehler_s,stopp_fehler_s}) {
      const margin=start_fehler_s+stopp_fehler_s;
      return {nominal_l_min:round(60*wasser_liter/dauer_s),minimum_l_min:round(60*wasser_liter/(dauer_s+margin)),
        maximum_l_min:dauer_s>margin?round(60*wasser_liter/(dauer_s-margin)):null,
        hinweis:'Betrachtet nur den Zeitfehler. Die Mengenmessung und konstante Strahlstärke ebenfalls prüfen.'};
    },
    example:{args:{wasser_liter:6,dauer_s:60,start_fehler_s:10,stopp_fehler_s:10},expect:{nominal_l_min:6,minimum_l_min:4.5,maximum_l_min:9}},
  },
  {
    name:'stromzaehler_sprung_leistungsplausibilitaet',
    description:'Sprung zwischen zwei bestätigten Stromzählerständen gegen eine dokumentierte obere Wirkleistung prüfen — Flag a cumulative-meter jump beyond the supported energy bound.',
    page:meter,
    properties:{
      zaehler_sprung_wh:number('Anstieg des kumulierten Verbrauchszählers in Wh.'),
      dauer_s:number('Belegte verstrichene Zeit zwischen den Ablesungen in Sekunden.',0.001,31622400),
      maximale_wirkleistung_w:number('Dokumentierte obere Wirkleistung genau am gemessenen Anschluss in Watt.',0,50000),
      ablesespielraum_wh:number('Maximaler kombinierter Spielraum beider Ablesungen in Wh.'),
      gleiche_skala_belegt:boolean('Sind Gerät, Register, Einheiten und Ablesepunkte bestätigt?'),
    },
    calculate({zaehler_sprung_wh,dauer_s,maximale_wirkleistung_w,ablesespielraum_wh,gleiche_skala_belegt}) {
      if (!gleiche_skala_belegt) return {status:'skala_und_register_pruefen',sprung_innerhalb_grenze:null};
      const ceiling=maximale_wirkleistung_w*dauer_s/3600;
      const available=zaehler_sprung_wh<=ceiling+ablesespielraum_wh+1e-9;
      return {status:available?'durch_obere_grenze_nicht_ausgeschlossen':'sprung_pruefen',maximal_moegliche_wh:round(ceiling),
        sprung_innerhalb_grenze:available,ueber_grenze_einschliesslich_spielraum_wh:round(Math.max(0,zaehler_sprung_wh-ceiling-ablesespielraum_wh)),
        hinweis:'Eine Überschreitung signalisiert einen Prüfbedarf. Aus zwei Ständen allein folgt kein Gerätedefekt.'};
    },
    example:{args:{zaehler_sprung_wh:500,dauer_s:180,maximale_wirkleistung_w:3000,ablesespielraum_wh:10,gleiche_skala_belegt:true},expect:{sprung_innerhalb_grenze:false,maximal_moegliche_wh:150,ueber_grenze_einschliesslich_spielraum_wh:340}},
  },
  {
    name:'stromvergleich_ausfall_nach_modus',
    description:'Ungleich verteilte Messausfälle in zwei Betriebsmodi sichtbar machen, bevor deren Verbrauch verglichen wird — Assess selective missingness by operating mode rather than global uptime.',
    page:meter,
    properties:{
      a_geplant:count('Geplante auswertbare Intervalle im unabhängig dokumentierten Modus A.',1),
      a_erfasst:count('Erfasste Intervalle in A.'), b_geplant:count('Geplante auswertbare Intervalle in Modus B.',1),
      b_erfasst:count('Erfasste Intervalle in B.'), abstand_limit_pp:number('Eigene Prüfschwelle für den Abstand der Erfassungsquoten in Prozentpunkten.',0,100),
    },
    calculate({a_geplant,a_erfasst,b_geplant,b_erfasst,abstand_limit_pp}) {
      whole(a_geplant,a_erfasst,b_geplant,b_erfasst);
      if (a_erfasst>a_geplant||b_erfasst>b_geplant) throw new RangeError('Erfasste Intervalle übersteigen das Soll.');
      const a=100*a_erfasst/a_geplant;
      const b=100*b_erfasst/b_geplant;
      return {erfasst_a_prozent:round(a),erfasst_b_prozent:round(b),abstand_pp:round(Math.abs(a-b)),
        selektiven_ausfall_pruefen:Math.abs(a-b)>abstand_limit_pp+1e-9,
        hinweis:'Gleiche Quoten beweisen keinen unabhängigen Ausfall. Unbekannte Zeiträume nicht mit null Verbrauch auffüllen.'};
    },
    example:{args:{a_geplant:40,a_erfasst:36,b_geplant:60,b_erfasst:45,abstand_limit_pp:10},expect:{erfasst_a_prozent:90,erfasst_b_prozent:75,abstand_pp:15,selektiven_ausfall_pruefen:true}},
  },
  {
    name:'stromprotokoll_lueckensumme_anker',
    description:'Fehlende Intervallwerte über einen passenden kumulierten Gesamtanker mengenmäßig eingrenzen — Recover only the aggregate energy of missing bins from a matched reference total.',
    page:meter,
    properties:{
      gesamt_wh:number('Gesamtverbrauch aus zwei Ankerständen über alle Zielintervalle in Wh.'),
      vorhanden_wh:number('Summe der lückenlos belegten einzelnen Intervallwerte in Wh.'),
      anker_fehler_wh:number('Maximaler Fehler der Gesamtmessung in Wh.'),
      intervalle_fehler_wh:number('Maximaler Fehler der Summe der vorhandenen Intervalle in Wh.'),
      grenzen_passend:boolean('Sind Zählerumfang, Zeitgrenzen und überschneidungsfreie vorhandene Intervalle bestätigt?'),
    },
    calculate({gesamt_wh,vorhanden_wh,anker_fehler_wh,intervalle_fehler_wh,grenzen_passend}) {
      if (!grenzen_passend) return {status:'ankerbezug_offen',fehlend_min_wh:null,fehlend_max_wh:null};
      const diff=gesamt_wh-vorhanden_wh;
      const margin=anker_fehler_wh+intervalle_fehler_wh;
      if (diff+margin< -1e-9) return {status:'summen_widersprechen',fehlend_min_wh:null,fehlend_max_wh:null};
      return {status:'lueckensumme_begrenzt',fehlend_min_wh:round(Math.max(0,diff-margin)),fehlend_max_wh:round(Math.max(0,diff+margin)),
        hinweis:'Die fehlenden Intervalle bleiben einzeln unbekannt. Die Rechnung setzt nichtnegative Verbrauchsenergie voraus.'};
    },
    example:{args:{gesamt_wh:800,vorhanden_wh:680,anker_fehler_wh:10,intervalle_fehler_wh:5,grenzen_passend:true},expect:{fehlend_min_wh:105,fehlend_max_wh:135}},
  },
  {
    name:'stromexport_einheit_metadaten_abgleichen',
    description:'Explizit deklarierte Wh- und kWh-Exportspalten vor einer Zusammenführung gegenprüfen — Normalize documented energy units while leaving unknown labels unresolved.',
    page:meter,
    properties:{
      a_wert:number('Exportwert A für dieselbe Energiemenge.'),
      a_einheit:select('Energieeinheit laut dokumentiertem Export A.','wh','kwh','fehlend'),
      b_wert:number('Exportwert B für dieselbe Energiemenge.'),
      b_einheit:select('Energieeinheit laut dokumentiertem Export B.','wh','kwh','fehlend'),
      vergleichbar:boolean('Handelt es sich nachweislich um dasselbe Register und Intervall?'),
    },
    calculate({a_wert,a_einheit,b_wert,b_einheit,vergleichbar}) {
      if (!vergleichbar||a_einheit==='fehlend'||b_einheit==='fehlend') return {status:'einheit_oder_bezug_offen',b_minus_a_wh:null};
      const a=a_wert*(a_einheit==='kwh'?1000:1);
      const b=b_wert*(b_einheit==='kwh'?1000:1);
      return {status:'einheiten_belegt',a_wh:round(a),b_wh:round(b),b_minus_a_wh:round(b-a),
        hinweis:'Fehlende Einheiten nie aus einem ungefähr tausendfachen Verhältnis ableiten.'};
    },
    example:{args:{a_wert:1.7,a_einheit:'kwh',b_wert:1704,b_einheit:'wh',vergleichbar:true},expect:{a_wh:1700,b_wh:1704,b_minus_a_wh:4}},
  },
  {
    name:'stromlogger_spitzenmittel_ausreisserabstand',
    description:'Ein protokolliertes Leistungsmaximum gegen einen passend aggregierten Mittelwert und bekannten Spitzenabschnitt prüfen — Test consistency of peak duration and aggregate energy.',
    page:meter,
    properties:{
      fenster_s:number('Dauer des gesamten betrachteten Fensters in Sekunden.',0.001,31622400),
      mittel_w:number('Über die gesamte Dauer integriertes Zeitmittel in Watt.',0,50000),
      spitze_mindestens_w:number('Belegte Mindestlast über den gesamten Spitzenabschnitt in Watt.',0,50000),
      spitzenabschnitt_s:seconds('Gemessene Dauer dieses Spitzenabschnitts innerhalb des Fensters.'),
      gleicher_umfang:boolean('Sind beide Angaben für dieselbe Verbrauchsgrenze und Zeitbasis belegt?'),
    },
    calculate({fenster_s,mittel_w,spitze_mindestens_w,spitzenabschnitt_s,gleicher_umfang}) {
      if (spitzenabschnitt_s>fenster_s) throw new RangeError('Spitzenabschnitt liegt außerhalb des Fensters.');
      if (!gleicher_umfang) return {vereinbar:null,spitze_mindestens_wh:null};
      const peak=spitze_mindestens_w*spitzenabschnitt_s/3600;
      const total=mittel_w*fenster_s/3600;
      return {vereinbar:peak<=total+1e-9,spitze_mindestens_wh:round(peak),gesamt_wh:round(total),
        hinweis:'Gilt für nichtnegative Last. Ein einzelner Spitzenwert belegt keine durchgehende Spitzenlast.'};
    },
    example:{args:{fenster_s:3600,mittel_w:10,spitze_mindestens_w:100,spitzenabschnitt_s:600,gleicher_umfang:true},expect:{vereinbar:false,spitze_mindestens_wh:16.6667,gesamt_wh:10}},
  },
  {
    name:'duschdurchfluss_vergleich_menge_zeitband',
    description:'Mehrere Eimertests anhand ihrer Mengen- und Zeitgrenzen auf eine verlässlich höhere Durchflussrate prüfen — Compare flow ranges from independently bounded volumes and durations.',
    page:water,
    properties:{
      a_min_l:number('Kleinste mögliche Menge in Test A in Litern.',0,100), a_max_l:number('Größte mögliche Menge in Test A.',0,100),
      a_min_s:number('Kürzeste mögliche Dauer A in Sekunden.',0.01,3600), a_max_s:number('Längste mögliche Dauer A.',0.01,3600),
      b_min_l:number('Kleinste mögliche Menge in Test B in Litern.',0,100), b_max_l:number('Größte mögliche Menge in Test B.',0,100),
      b_min_s:number('Kürzeste mögliche Dauer B in Sekunden.',0.01,3600), b_max_s:number('Längste mögliche Dauer B.',0.01,3600),
    },
    calculate({a_min_l,a_max_l,a_min_s,a_max_s,b_min_l,b_max_l,b_min_s,b_max_s}) {
      if (a_min_l>a_max_l||a_min_s>a_max_s||b_min_l>b_max_l||b_min_s>b_max_s) throw new RangeError('Mengen- und Zeitgrenzen sind nicht aufsteigend.');
      const a=[60*a_min_l/a_max_s,60*a_max_l/a_min_s];
      const b=[60*b_min_l/b_max_s,60*b_max_l/b_min_s];
      return {a_l_min_bereich:a.map(round),b_l_min_bereich:b.map(round),
        richtung:a[1]+1e-9<b[0]?'b_hoeher':b[1]+1e-9<a[0]?'a_hoeher':'offen',
        hinweis:'Die Raten gelten für die jeweiligen Tests. Ohne ähnliche Einstellungen und Messaufbau keine Ursachenzuordnung.'};
    },
    example:{args:{a_min_l:7,a_max_l:8,a_min_s:60,a_max_s:60,b_min_l:9,b_max_l:10,b_min_s:60,b_max_s:60},expect:{a_l_min_bereich:[7,8],b_l_min_bereich:[9,10],richtung:'b_hoeher'}},
  },
  {
    name:'messreihe_grenzwert_rundung_faelle',
    description:'Beim Zählen von Feuchtewerten nahe der Prüfschwelle sichere und rundungsbedingt offene Fälle trennen — Bound the count above a threshold from three categories of rounded observations.',
    page:humidity,
    properties:{
      sicher_unterhalb:count('Zahl der Beobachtungen, deren ganze Rundungsspanne unter der Schwelle liegt.'),
      sicher_ab_schwelle:count('Zahl der Beobachtungen, deren ganze Rundungsspanne auf oder über der Schwelle liegt.'),
      spannweite_schneidet:count('Zahl der Beobachtungen mit Rundungsspanne auf beiden Seiten der Schwelle.'),
      ungueltige_beobachtungen:count('Weitere nicht auswertbare oder fehlende Beobachtungen dieser Reihe.'),
    },
    calculate({sicher_unterhalb,sicher_ab_schwelle,spannweite_schneidet,ungueltige_beobachtungen}) {
      whole(sicher_unterhalb,sicher_ab_schwelle,spannweite_schneidet,ungueltige_beobachtungen);
      const valid=sicher_unterhalb+sicher_ab_schwelle+spannweite_schneidet;
      return {min_faelle_gueltig:sicher_ab_schwelle,max_faelle_gueltig:sicher_ab_schwelle+spannweite_schneidet,
        min_anteil_gueltiger_prozent:valid?round(100*sicher_ab_schwelle/valid):null,
        max_anteil_gueltiger_prozent:valid?round(100*(sicher_ab_schwelle+spannweite_schneidet)/valid):null,
        ungueltig:ungueltige_beobachtungen,hinweis:'Gültige Einzelwerte und fehlende Fälle getrennt ausweisen. Fallanteile belegen keine Zeitdauer.'};
    },
    example:{args:{sicher_unterhalb:9,sicher_ab_schwelle:3,spannweite_schneidet:3,ungueltige_beobachtungen:2},expect:{min_faelle_gueltig:3,max_faelle_gueltig:6,min_anteil_gueltiger_prozent:20,max_anteil_gueltiger_prozent:40}},
  },
  {
    name:'klimalog_zeitpaar_naechster_eindeutiger_wert',
    description:'Einen Verbrauchspunkt dem eindeutig nächstliegenden von zwei Klimawerten zuordnen — Pair an anchor sample to its unique nearest timestamp within a chosen tolerance.',
    page:humidity,
    properties:{
      anker_s:seconds('Zeit des Verbrauchspunkts ab gemeinsamer Referenz in Sekunden.'),
      vorher_s:seconds('Zeit des unmittelbar vorhergehenden Klimawerts in Sekunden, exakt gleichzeitig möglich.'),
      nachher_s:seconds('Zeit des unmittelbar nachfolgenden Klimawerts in Sekunden, exakt gleichzeitig möglich.'),
      toleranz_s:seconds('Maximal vertretbarer Zeitabstand für die Messaufgabe.'),
    },
    calculate({anker_s,vorher_s,nachher_s,toleranz_s}) {
      if (vorher_s>anker_s||nachher_s<anker_s||vorher_s>=nachher_s) throw new RangeError('Zwei unterschiedliche, den Anker einrahmende Zeitpunkte eingeben.');
      const before=anker_s-vorher_s;
      const after=nachher_s-anker_s;
      const gap=Math.min(before,after);
      const status=gap>toleranz_s?'ausserhalb_toleranz':before===after?'gleichstand':before<after?'vorher':'nachher';
      return {status,zugeordnet_s:status==='vorher'?vorher_s:status==='nachher'?nachher_s:null,kleinster_abstand_s:round(gap),
        hinweis:'Gemeinsame Zeitbasis vorausgesetzt. Bei schnellen Änderungen kann auch das nächste Zeitpaar fachlich ungeeignet sein.'};
    },
    example:{args:{anker_s:600,vorher_s:540,nachher_s:630,toleranz_s:60},expect:{status:'nachher',zugeordnet_s:630,kleinster_abstand_s:30}},
  },
  {
    name:'stromlogger_sequenz_counter_luecke',
    description:'Mit drei in Zeitreihenfolge exportierten Sequenznummern zwischen fortlaufenden, fehlenden und neu begonnenen Paketen unterscheiden — Audit packet counters separately from metered values.',
    page:meter,
    properties:{
      erste_nummer:count('Erste exportierte Paketnummer des durchgehend genutzten Senders.'),
      zweite_nummer:count('Zweite exportierte Paketnummer desselben Senders.'),
      dritte_nummer:count('Dritte exportierte Paketnummer desselben Senders.'),
      ohne_neustart_dokumentiert:boolean('Ist ein Neustart oder Nummernumlauf in beiden Abständen ausgeschlossen und wird pro Paket um eins erhöht?'),
    },
    calculate({erste_nummer,zweite_nummer,dritte_nummer,ohne_neustart_dokumentiert}) {
      whole(erste_nummer,zweite_nummer,dritte_nummer);
      const first=zweite_nummer-erste_nummer;
      const second=dritte_nummer-zweite_nummer;
      if (!ohne_neustart_dokumentiert||Math.min(first,second)<1) return {status:'reihenfolge_oder_neustart_pruefen',fehlende_pakete:null};
      return {status:'paketfolge_ausgewertet',fehlend_vor_zweiter:first-1,fehlend_vor_dritter:second-1,fehlende_pakete:first+second-2,
        hinweis:'Paketlücken belegen nur die fehlenden Exportpakete. Energiedifferenzen separat anhand des Zählerwerts prüfen.'};
    },
    example:{args:{erste_nummer:20,zweite_nummer:21,dritte_nummer:25,ohne_neustart_dokumentiert:true},expect:{fehlend_vor_zweiter:0,fehlend_vor_dritter:3,fehlende_pakete:3}},
  },
  {
    name:'messlogger_raster_phasen_gleichzeit',
    description:'Ermitteln, ob zwei regelmäßig getaktete Logger bei festem Zeitversatz je exakt gleichzeitig erfassen — Check whether fixed periodic logs have any exact timestamp coincidences.',
    page:humidity,
    properties:{
      raster_a_s:number('Periodendauer des ersten Loggers in ganzen Sekunden.',1,86400),
      raster_b_s:number('Periodendauer des zweiten Loggers in ganzen Sekunden.',1,86400),
      erster_versatz_s:seconds('Abstand der ersten geplanten Stichproben in ganzen Sekunden.'),
    },
    calculate({raster_a_s,raster_b_s,erster_versatz_s}) {
      whole(raster_a_s,raster_b_s,erster_versatz_s);
      let a=raster_a_s;
      let b=raster_b_s;
      while (b) [a,b]=[b,a%b];
      const possible=erster_versatz_s%a===0;
      return {exakte_gemeinsame_zeiten_moeglich:possible,wiederholung_s:possible?(raster_a_s/a)*raster_b_s:null,
        kleinster_rasterabstand_s:Math.min(erster_versatz_s%a,a-erster_versatz_s%a),
        hinweis:'Nur ein Rechenmuster bei driftfreien Uhren. Ob eine Begegnung im Export liegt, hängt von dessen Laufzeiten ab.'};
    },
    example:{args:{raster_a_s:60,raster_b_s:90,erster_versatz_s:15},expect:{exakte_gemeinsame_zeiten_moeglich:false,wiederholung_s:null,kleinster_rasterabstand_s:15}},
  },
  {
    name:'klimageraet_schallzeit_mittel_zwei_phasen',
    description:'Zwei vergleichbare Schall-Zeitmittel eines Klimageräts über ihre Zeitanteile zusammenfassen — Combine two separately measured equivalent A-weighted levels on an energy basis.',
    page:'/guide/mobile-klimaanlage-zu-laut.html',
    properties:{
      a_laeq_dba:number('Äquivalenter A-bewerteter Dauerschallpegel LAeq in Phase A.',0,130),
      a_dauer_s:number('Gemessene Dauer der Phase A in Sekunden.',1,86400),
      b_laeq_dba:number('Äquivalenter A-bewerteter Dauerschallpegel LAeq in Phase B.',0,130),
      b_dauer_s:number('Gemessene Dauer der Phase B in Sekunden.',1,86400),
      messart_gleich:boolean('Wurden beide Pegel als LAeq mit gleicher Messposition und Einstellung in getrennten Phasen erfasst?'),
    },
    calculate({a_laeq_dba,a_dauer_s,b_laeq_dba,b_dauer_s,messart_gleich}) {
      if (!messart_gleich) return {auswertbar:false,gemeinsamer_laeq_dba:null};
      const a=a_dauer_s*10**(a_laeq_dba/10);
      const b=b_dauer_s*10**(b_laeq_dba/10);
      return {auswertbar:true,gemeinsamer_laeq_dba:round(10*Math.log10((a+b)/(a_dauer_s+b_dauer_s))),
        a_expositionsanteil_prozent:round(100*a/(a+b)),
        hinweis:'Verwendet nur tatsächlich dokumentierte LAeq-Werte an demselben Ort. Kein Rückschluss auf Schallleistung, Gesundheits- oder Rechtsgrenzwerte.'};
    },
    example:{args:{a_laeq_dba:50,a_dauer_s:60,b_laeq_dba:50,b_dauer_s:180,messart_gleich:true},expect:{auswertbar:true,gemeinsamer_laeq_dba:50,a_expositionsanteil_prozent:25}},
  },
  {
    name:'stromimpuls_export_ereignisabgleich',
    description:'Die Zahl erfasster Zählerimpulse mit einer unabhängigen Energiespanne und unbekannter Randphase abgleichen — Cross-check recorded pulse counts against a documented energy-per-pulse scale.',
    page:meter,
    properties:{
      energie_unter_wh:number('Belegte untere Energiegrenze im vollständigen Zeitfenster, in Wh.'),
      energie_ober_wh:number('Belegte obere Energiegrenze im vollständigen Zeitfenster, in Wh.'),
      wh_je_impuls:number('Dokumentierte Wh pro Verbrauchsimpuls für genau dieses Register.',0.001,1000000),
      erfasst_impulse:count('Tatsächlich exportierte Impulse im selben Zeitfenster.'),
      gleiche_grenzen:boolean('Sind Zeitgrenzen und Verbrauchsregister beider Messquellen belegt?'),
    },
    calculate({energie_unter_wh,energie_ober_wh,wh_je_impuls,erfasst_impulse,gleiche_grenzen}) {
      whole(erfasst_impulse);
      if (energie_unter_wh>energie_ober_wh) throw new RangeError('Energiegrenzen sind nicht aufsteigend.');
      if (!gleiche_grenzen) return {status:'zeitgrenzen_oder_register_offen',vereinbar:null};
      const minimum=Math.floor(energie_unter_wh/wh_je_impuls);
      const maximum=Math.ceil(energie_ober_wh/wh_je_impuls);
      return {status:'impulsbereich_abgeglichen',minimal_moegliche_impulse:minimum,maximal_moegliche_impulse:maximum,
        vereinbar:minimum<=erfasst_impulse&&erfasst_impulse<=maximum,
        hinweis:'Gilt für gleich große Verbrauchsimpulse und eine einheitliche Zählkonvention am Fensterrand. Keine Ursache aus fehlenden Signalen ableiten.'};
    },
    example:{args:{energie_unter_wh:30,energie_ober_wh:35,wh_je_impuls:4,erfasst_impulse:6,gleiche_grenzen:true},expect:{minimal_moegliche_impulse:7,maximal_moegliche_impulse:9,vereinbar:false}},
  },
];
