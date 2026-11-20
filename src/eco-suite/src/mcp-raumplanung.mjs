const guide = slug => '/guide/' + slug + '.html';
const number = (description,minimum,maximum) => ({type:'number',description,minimum,maximum});
const cm = description => number(description,0,2000);
const signed = description => number(description,-2000,2000);
const area = description => number(description,0,1000);
const time = description => number(description,0,1440);
const flag = description => ({type:'boolean',description});
const choice = (description,...values) => ({type:'string',description,enum:values});
const round = value => Math.round(value*100)/100;
const overlap = (a,b,c,d) => Math.max(0,Math.min(b,d)-Math.max(a,c));

export const raumplanung = [
  {
    name:'raumgrundriss_l_flaeche',
    description:'Grundfläche eines L-förmigen Raums aus Außenmaß und rechteckiger Aussparung ermitteln — Measure an L-shaped room footprint from an enclosing rectangle and one corner cutout.',
    page:guide('btu-rechner'),
    properties:{
      aussen_breite_m:number('Breite des umschließenden Rechtecks, innen gemessen.',0.1,50),
      aussen_tiefe_m:number('Tiefe des umschließenden Rechtecks, innen gemessen.',0.1,50),
      ausschnitt_breite_m:number('Breite der rechteckigen Eck-Aussparung.',0.1,50),
      ausschnitt_tiefe_m:number('Tiefe der Eck-Aussparung.',0.1,50),
    },
    calculate({aussen_breite_m,aussen_tiefe_m,ausschnitt_breite_m,ausschnitt_tiefe_m}){
      if(ausschnitt_breite_m>=aussen_breite_m||ausschnitt_tiefe_m>=aussen_tiefe_m) throw new RangeError('Eckaussparung');
      return {
        grundflaeche_m2:round(aussen_breite_m*aussen_tiefe_m-ausschnitt_breite_m*ausschnitt_tiefe_m),
        hinweis:'Ein Rechteck mit genau einer rechteckigen Eck-Aussparung. Reine Innenmaße, keine rechtliche Wohnfläche und keine Kühlleistung.',
      };
    },
    example:{args:{aussen_breite_m:6,aussen_tiefe_m:4,ausschnitt_breite_m:2,ausschnitt_tiefe_m:1.5},expect:{grundflaeche_m2:21}},
  },
  {
    name:'dachraum_luftvolumen_aufmass',
    description:'Bei einer durchgehenden Dachschräge mittlere Höhe und Raumvolumen aus dem Aufmaß bestimmen — Calculate room air volume under one planar sloped ceiling.',
    page:guide('btu-rechner'),
    properties:{
      bodenflaeche_m2:number('Rechteckige Grundfläche unter der Schräge.',0.1,1000),
      hohe_seite_m:number('Lichte Höhe am hohen Rand in Metern.',0.1,20),
      niedrige_seite_m:number('Lichte Höhe am niedrigen parallelen Rand in Metern.',0,20),
      einheitliche_schraege:flag('Eine durchgehende ebene Schräge zwischen parallelen Kanten ohne Absätze?'),
    },
    calculate({bodenflaeche_m2,hohe_seite_m,niedrige_seite_m,einheitliche_schraege}){
      if(niedrige_seite_m>hohe_seite_m) throw new RangeError('Deckenhöhen vertauscht');
      const mean=(hohe_seite_m+niedrige_seite_m)/2;
      return {mittlere_hoehe_m:einheitliche_schraege?round(mean):null,
        luftvolumen_m3:einheitliche_schraege?round(mean*bodenflaeche_m2):null,
        hinweis:'Bei geknickten oder mehreren Dachflächen getrennte Teilräume messen. Volumen allein bestimmt keine notwendige Kühlleistung.'};
    },
    example:{args:{bodenflaeche_m2:24,hohe_seite_m:2.6,niedrige_seite_m:1.4,einheitliche_schraege:true},expect:{mittlere_hoehe_m:2,luftvolumen_m3:48}},
  },
  {
    name:'stellwand_freie_abschnitte_ermitteln',
    description:'Längsten zusammenhängenden freien Wandabschnitt trotz zwei Hindernissen finden — Find the longest clear wall span rather than adding separated gaps.',
    page:guide('infrarotheizung-decke-oder-wand'),
    properties:{
      wand_cm:cm('Wandbreite entlang einer Skizzenachse.'),
      a_start_cm:cm('Linke Kante des ersten blockierten Abschnitts ab Wandanfang.'),
      a_ende_cm:cm('Rechte Kante des ersten blockierten Abschnitts.'),
      b_start_cm:cm('Linke Kante des zweiten blockierten Abschnitts.'),
      b_ende_cm:cm('Rechte Kante des zweiten blockierten Abschnitts.'),
    },
    calculate({wand_cm,a_start_cm,a_ende_cm,b_start_cm,b_ende_cm}){
      if(wand_cm===0||a_start_cm>a_ende_cm||b_start_cm>b_ende_cm||a_ende_cm>wand_cm||b_ende_cm>wand_cm) throw new RangeError('Wandabschnitte');
      const blocked=[[a_start_cm,a_ende_cm],[b_start_cm,b_ende_cm]].filter(([start,end])=>end>start).sort((a,b)=>a[0]-b[0]);
      const free=[];
      let cursor=0;
      for(const [start,end] of blocked){
        if(start>cursor) free.push([cursor,start]);
        cursor=Math.max(cursor,end);
      }
      if(cursor<wand_cm) free.push([cursor,wand_cm]);
      return {freie_abschnitte_cm:free,laengste_freie_breite_cm:round(Math.max(0,...free.map(([a,b])=>b-a))),
        hinweis:'Nur eine bemaßte Wandlinie. Last, Befestigung, Heizungsabstände und freie Strahlungsfläche bleiben separat zu prüfen.'};
    },
    example:{args:{wand_cm:400,a_start_cm:65,a_ende_cm:140,b_start_cm:110,b_ende_cm:235},expect:{freie_abschnitte_cm:[[0,65],[235,400]],laengste_freie_breite_cm:165}},
  },
  {
    name:'stellplatz_tuerschwenk_ueberlagerung',
    description:'Eine geplante Gerätefläche auf Karte gegen die tatsächlich markierte Türbewegung abgleichen — Detect overlap between a device footprint and a measured door-sweep box.',
    page:guide('thermovorhang-ratgeber'),
    properties:{
      tuer_x_cm:cm('Linke Kante des Hüllrechtecks für den gemessenen Schwenk.'),
      tuer_y_cm:cm('Vordere Kante des Hüllrechtecks; derselbe Maßstab und Nullpunkt für beide Rechtecke.'),
      tuer_breite_cm:number('Breite des Hüllrechtecks um die gemessene Türbewegung.',0.1,2000),
      tuer_tiefe_cm:number('Tiefe des Tür-Hüllrechtecks.',0.1,2000),
      geraet_x_cm:cm('Linke Kante der Gerätefläche laut Plan.'),
      geraet_y_cm:cm('Vordere Kante der Gerätefläche laut Plan.'),
      geraet_breite_cm:number('Breite der vorgesehenen Gerätefläche.',0.1,2000),
      geraet_tiefe_cm:number('Tiefe der vorgesehenen Gerätefläche.',0.1,2000),
    },
    calculate({tuer_x_cm,tuer_y_cm,tuer_breite_cm,tuer_tiefe_cm,geraet_x_cm,geraet_y_cm,geraet_breite_cm,geraet_tiefe_cm}){
      const width=overlap(tuer_x_cm,tuer_x_cm+tuer_breite_cm,geraet_x_cm,geraet_x_cm+geraet_breite_cm);
      const depth=overlap(tuer_y_cm,tuer_y_cm+tuer_tiefe_cm,geraet_y_cm,geraet_y_cm+geraet_tiefe_cm);
      return {ueberlagerung_cm2:round(width*depth),stellplatz_neu_pruefen:width*depth>0,
        hinweis:'Die Türbewegung wird vorsichtig als Hüllrechteck erfasst. Eine Überlagerung ist nur ein Prüfhinweis; Randabstände und realen Durchgang vor Ort prüfen.'};
    },
    example:{args:{tuer_x_cm:0,tuer_y_cm:0,tuer_breite_cm:90,tuer_tiefe_cm:90,geraet_x_cm:80,geraet_y_cm:30,geraet_breite_cm:32,geraet_tiefe_cm:42},expect:{ueberlagerung_cm2:420,stellplatz_neu_pruefen:true}},
  },
  {
    name:'waeschestaender_textil_bodenfreiheit',
    description:'Bodenfreiheit unter hängenden Textilien für zwei behängte Ständerpositionen vergleichen — Compare the lowest hanging hem against the measured space below each line.',
    page:guide('waesche-trocknen-wohnung'),
    properties:{
      leinenhoehe_a_cm:cm('Leinenhöhe an Position A über dem tatsächlich höchsten Hindernis darunter.'),
      leinenhoehe_b_cm:cm('Leinenhöhe an Position B über dem tatsächlich höchsten Hindernis darunter.'),
      haengelaenge_cm:cm('Länge des tiefsten Saums ab Leine, tatsächlich nass aufgehängt gemessen.'),
      eigener_abstand_cm:cm('Persönlich geplanter Restabstand unter dem Saum.'),
    },
    calculate({leinenhoehe_a_cm,leinenhoehe_b_cm,haengelaenge_cm,eigener_abstand_cm}){
      const a=leinenhoehe_a_cm-haengelaenge_cm;
      const b=leinenhoehe_b_cm-haengelaenge_cm;
      return {rest_a_cm:round(a),rest_b_cm:round(b),positionen_mit_restabstand:[a>=eigener_abstand_cm?'A':null,b>=eigener_abstand_cm?'B':null].filter(Boolean),
        hinweis:'Hängelänge am realen feuchten Textil messen; Luftzirkulation, Durchgang und freies Fenster getrennt prüfen.'};
    },
    example:{args:{leinenhoehe_a_cm:105,leinenhoehe_b_cm:125,haengelaenge_cm:110,eigener_abstand_cm:10},expect:{rest_a_cm:-5,rest_b_cm:15,positionen_mit_restabstand:['B']}},
  },
  {
    name:'umstellplatz_zwei_moebel_zwischenparken',
    description:'Für eine reversible Umräumprobe einen gemeinsamen Ablagebereich für zwei Möbelstücke prüfen — Check simultaneous temporary parking for two rectangular furniture footprints.',
    page:guide('saugroboter-kaufberatung'),
    properties:{
      ablage_breite_cm:number('Freie Breite der vorgesehenen Zwischenfläche abzüglich eigener Durchgangsreserve.',0.1,2000),
      ablage_tiefe_cm:number('Freie Tiefe der vorgesehenen Zwischenfläche.',0.1,2000),
      a_breite_cm:number('Breite von Möbel A in der gewünschten Ausrichtung.',0.1,2000),
      a_tiefe_cm:number('Tiefe von Möbel A.',0.1,2000),
      b_breite_cm:number('Breite von Möbel B in der gewünschten Ausrichtung.',0.1,2000),
      b_tiefe_cm:number('Tiefe von Möbel B.',0.1,2000),
      trennspalt_cm:cm('Gewünschter Zwischenraum für Finger und Bewegung, bereits geplanter eigener Wert.'),
    },
    calculate({ablage_breite_cm,ablage_tiefe_cm,a_breite_cm,a_tiefe_cm,b_breite_cm,b_tiefe_cm,trennspalt_cm}){
      const beside=a_breite_cm+b_breite_cm+trennspalt_cm<=ablage_breite_cm&&Math.max(a_tiefe_cm,b_tiefe_cm)<=ablage_tiefe_cm;
      const behind=a_tiefe_cm+b_tiefe_cm+trennspalt_cm<=ablage_tiefe_cm&&Math.max(a_breite_cm,b_breite_cm)<=ablage_breite_cm;
      return {gemeinsam_nebeneinander:beside,gemeinsam_hintereinander:behind,
        einzeln_nutzbar:Math.max(a_breite_cm,b_breite_cm)<=ablage_breite_cm&&Math.max(a_tiefe_cm,b_tiefe_cm)<=ablage_tiefe_cm,
        hinweis:'Nur ebene Rechtecke in Ausgangsausrichtung, ohne Überstellen. Transport, Untergrund und realen Durchgang separat prüfen.'};
    },
    example:{args:{ablage_breite_cm:170,ablage_tiefe_cm:55,a_breite_cm:75,a_tiefe_cm:43,b_breite_cm:70,b_tiefe_cm:48,trennspalt_cm:10},expect:{gemeinsam_nebeneinander:true,gemeinsam_hintereinander:false,einzeln_nutzbar:true}},
  },
  {
    name:'saugroboter_umstellprobe_flaechengewinn',
    description:'Zusätzlich erreichte Bodenfläche nach einer einzigen Möbeländerung mit deren Aufwand vergleichen — Quantify newly cleaned floor area per minute of a reversible furniture move.',
    page:guide('saugroboter-kaufberatung'),
    properties:{
      vorher_m2:area('Nach dem Testlauf beobachtete gereinigte Fläche ohne Umstellen.'),
      nachher_m2:area('Beobachtete gereinigte Fläche mit derselben Einstellung nach einer Möbeländerung.'),
      umstell_min:number('Gemessener gesamter Aufwand für Umstellen und Zurückstellen in Minuten.',0.1,180),
      vergleichbar:flag('Gleicher Raum, Modus, übrige Hindernisse und ausreichend ähnlicher Testablauf?'),
    },
    calculate({vorher_m2,nachher_m2,umstell_min,vergleichbar}){
      const gain=nachher_m2-vorher_m2;
      return {flaechengewinn_m2:vergleichbar?round(gain):null,flaechengewinn_pro_minute:vergleichbar?round(gain/umstell_min):null,
        hinweis:'Beobachtete Testfläche, nicht bloß die Kartengrenzen der App. Ergebnis lässt sich nicht automatisch auf andere Räume übertragen.'};
    },
    example:{args:{vorher_m2:18,nachher_m2:22,umstell_min:2,vergleichbar:true},expect:{flaechengewinn_m2:4,flaechengewinn_pro_minute:2}},
  },
  {
    name:'reinigungszonen_nach_moebelrueckkehr',
    description:'Vor dem Zurückstellen die berührte Bodenfläche und die noch abzutrocknenden Stellen abgleichen — Identify pending floor patches where staged furniture footprints would cover wet zones.',
    page:guide('saugwischer-kaufberatung'),
    properties:{
      rueckstellflaeche_m2:area('Gesamte geplante Möbel-Standfläche.'),
      noch_feucht_unter_moebeln_m2:area('Davon bei einer Sichtkontrolle noch erkennbar feucht.'),
      noch_feucht_ausserhalb_m2:area('Noch feuchte Fläche außerhalb der Möbel-Standfläche.'),
    },
    calculate({rueckstellflaeche_m2,noch_feucht_unter_moebeln_m2,noch_feucht_ausserhalb_m2}){
      if(noch_feucht_unter_moebeln_m2>rueckstellflaeche_m2) throw new RangeError('Überdeckte Fläche');
      return {rueckstellung_vor_ort_erneut_pruefen:noch_feucht_unter_moebeln_m2>0,feucht_gesamt_m2:round(noch_feucht_unter_moebeln_m2+noch_feucht_ausserhalb_m2),
        hinweis:'Erfasst markierte oder sichtbare Teilflächen. Eine Sichtprüfung gibt den Boden nicht frei; die Vorgaben zu Boden und Reinigungsmittel beachten.'};
    },
    example:{args:{rueckstellflaeche_m2:2.5,noch_feucht_unter_moebeln_m2:0.6,noch_feucht_ausserhalb_m2:1},expect:{rueckstellung_vor_ort_erneut_pruefen:true,feucht_gesamt_m2:1.6}},
  },
  {
    name:'luftreiniger_ansaugseiten_freiflaeche',
    description:'Freiraum an den drei dokumentierten Ansaug- und Ausblasbereichen eines Stellplatzes einzeln prüfen — Check the individual intake and top outlet clearances from the exact model manual.',
    page:guide('luftreiniger-ratgeber'),
    properties:{
      links_ist_cm:cm('Freier Abstand an der linken Seite.'),
      rechts_ist_cm:cm('Freier Abstand an der rechten Seite.'),
      oben_ist_cm:cm('Freier Abstand über dem Auslass.'),
      links_soll_cm:cm('Für diese Seite in der Modellanleitung geforderter Abstand.'),
      rechts_soll_cm:cm('Für diese Seite in der Modellanleitung geforderter Abstand.'),
      oben_soll_cm:cm('Für den oberen Bereich in der Modellanleitung geforderter Abstand.'),
      bestimmung_geprueft:flag('Ansaug- und Ausblasrichtung für das exakte Modell samt Abständen bestätigt?'),
    },
    calculate({links_ist_cm,rechts_ist_cm,oben_ist_cm,links_soll_cm,rechts_soll_cm,oben_soll_cm,bestimmung_geprueft}){
      const margin={links:round(links_ist_cm-links_soll_cm),rechts:round(rechts_ist_cm-rechts_soll_cm),oben:round(oben_ist_cm-oben_soll_cm)};
      return {reserve_cm:bestimmung_geprueft?margin:null,zu_knapp:bestimmung_geprueft?Object.keys(margin).filter(k=>margin[k]<0):null,
        hinweis:'Nur drei bemaßte Bereiche. Anweisungen für weitere Öffnungen, Abstände, Filterwechsel und Untergrund getrennt prüfen.'};
    },
    example:{args:{links_ist_cm:12,rechts_ist_cm:28,oben_ist_cm:36,links_soll_cm:20,rechts_soll_cm:20,oben_soll_cm:30,bestimmung_geprueft:true},expect:{reserve_cm:{links:-8,rechts:8,oben:6},zu_knapp:['links']}},
  },
  {
    name:'luftreiniger_filter_entnahmeweg_stellplatz',
    description:'Maximalen Entnahmeweg des Filters am Stellplatz und an der Serviceposition abgleichen — Verify maintenance access along the filter extraction direction.',
    page:guide('luftreiniger-ratgeber'),
    properties:{
      filter_entnahme_cm:cm('Aus Handbuch oder einfacher Probe bestätigter Weg in Entnahmerichtung.'),
      griffreserve_cm:cm('Eigener zusätzlicher Platz für den Griff in derselben Richtung.'),
      normal_frei_cm:cm('Gemessener Weg am üblichen Stellplatz.'),
      service_frei_cm:cm('Gemessener Weg an der alternativen Serviceposition.'),
      entnahmerichtung_geprueft:flag('Die Werte beziehen sich auf die genaue Filter- und Klappenrichtung des Modells?'),
    },
    calculate({filter_entnahme_cm,griffreserve_cm,normal_frei_cm,service_frei_cm,entnahmerichtung_geprueft}){
      const required=filter_entnahme_cm+griffreserve_cm;
      return {benoetigt_cm:entnahmerichtung_geprueft?round(required):null,
        entnahme_am_platz:entnahmerichtung_geprueft?normal_frei_cm>=required:null,
        entnahme_am_serviceplatz:entnahmerichtung_geprueft?service_frei_cm>=required:null,
        hinweis:'Gerät nur gemäß Anleitung ausgeschaltet warten und versetzen. Seitliches Klappenschwenken oder nötiges Werkzeug bei Bedarf separat berücksichtigen.'};
    },
    example:{args:{filter_entnahme_cm:32,griffreserve_cm:8,normal_frei_cm:29,service_frei_cm:47,entnahmerichtung_geprueft:true},expect:{benoetigt_cm:40,entnahme_am_platz:false,entnahme_am_serviceplatz:true}},
  },
  {
    name:'luftreiniger_getrennte_raeume_belegungsueberschneidung',
    description:'Gleichzeitig belegte Zeit in getrennten Zimmern für einen eigenen Luftreiniger-Standortplan bestimmen — Identify simultaneous separate-room demand before sharing one portable purifier.',
    page:guide('luftreiniger-ratgeber'),
    properties:{
      a_ab_min:time('Beginn des Nutzungsfensters in Raum A, Minuten ab Tagesbeginn.'),
      a_bis_min:time('Ende des Nutzungsfensters in Raum A am selben Tag.'),
      b_ab_min:time('Beginn des Nutzungsfensters in Raum B.'),
      b_bis_min:time('Ende des Nutzungsfensters in Raum B am selben Tag.'),
      getrennte_zimmer:flag('Zwei getrennte Zimmer, die bei paralleler Belegung getrennt betrachtet werden sollen?'),
    },
    calculate({a_ab_min,a_bis_min,b_ab_min,b_bis_min,getrennte_zimmer}){
      if(a_ab_min>a_bis_min||b_ab_min>b_bis_min) throw new RangeError('Tagesfenster');
      const parallel=overlap(a_ab_min,a_bis_min,b_ab_min,b_bis_min);
      return {gleichzeitig_min:round(parallel),gleichzeitige_belegung_getrennt:getrennte_zimmer&&parallel>0,
        hinweis:'Nutzungszeiten allein sagen nichts über Luftreinigung, Luftaustausch zwischen Zimmern oder notwendige Gerätemenge.'};
    },
    example:{args:{a_ab_min:510,a_bis_min:690,b_ab_min:645,b_bis_min:800,getrennte_zimmer:true},expect:{gleichzeitig_min:45,gleichzeitige_belegung_getrennt:true}},
  },
  {
    name:'querlueften_richtungskarte_beobachten',
    description:'Luftbewegung an zwei Öffnungen und dazwischen mit einem frei gehaltenen Papierstreifen protokollieren — Map observed flow directions without estimating an air exchange rate.',
    page:guide('homeoffice-buero-kuehlen'),
    properties:{
      oeffnung_a:choice('Beobachtung in der ersten Öffnung bezogen auf den Raum.','einwaerts','auswaerts','wechselnd','unbestimmt'),
      innen:choice('Beobachtung ungefähr mittig auf der vermuteten Strecke.','von_a_nach_b','von_b_nach_a','wechselnd','unbestimmt'),
      oeffnung_b:choice('Beobachtung in der zweiten Öffnung bezogen auf den Raum.','einwaerts','auswaerts','wechselnd','unbestimmt'),
      gleichzeitig:flag('Zeitnah bei unveränderter Stellung von Türen und Fenstern beobachtet?'),
    },
    calculate({oeffnung_a,innen,oeffnung_b,gleichzeitig}){
      let beobachtete_richtung='nicht_eindeutig';
      if(gleichzeitig&&oeffnung_a==='einwaerts'&&oeffnung_b==='auswaerts'&&innen==='von_a_nach_b') beobachtete_richtung='a_nach_b';
      if(gleichzeitig&&oeffnung_b==='einwaerts'&&oeffnung_a==='auswaerts'&&innen==='von_b_nach_a') beobachtete_richtung='b_nach_a';
      return {beobachtete_richtung,hinweis:'Nur qualitative Momentaufnahme. Papier frei halten und nichts in Öffnungen oder Geräte einführen. Daraus folgen weder Luftmenge noch eine Lüftungsgarantie.'};
    },
    example:{args:{oeffnung_a:'einwaerts',innen:'von_a_nach_b',oeffnung_b:'auswaerts',gleichzeitig:true},expect:{beobachtete_richtung:'a_nach_b'}},
  },
  {
    name:'fensterplatte_markierungen_nach_abnahme',
    description:'Wieder eingesetzte Fensterplatte an zwei eigenen Markierungen mit der Ausgangslage abgleichen — Compare a removable panel reinstallation with two marked reference points.',
    page:guide('fensterabdichtung-selber-bauen'),
    properties:{
      start_links_cm:cm('Ursprünglich markierte Position links entlang derselben Rahmenkante.'),
      neu_links_cm:cm('Jetzt gemessene Position an der linken Markierung.'),
      start_rechts_cm:cm('Ursprünglich markierte Position rechts auf derselben Skala.'),
      neu_rechts_cm:cm('Jetzt gemessene Position an der rechten Markierung.'),
      toleranz_cm:cm('Eigene Mess- und Markiertoleranz je Punkt.'),
    },
    calculate({start_links_cm,neu_links_cm,start_rechts_cm,neu_rechts_cm,toleranz_cm}){
      if(start_links_cm>=start_rechts_cm||neu_links_cm>=neu_rechts_cm) throw new RangeError('Markierungen');
      const left=round(neu_links_cm-start_links_cm);
      const right=round(neu_rechts_cm-start_rechts_cm);
      return {verschiebung_links_cm:left,verschiebung_rechts_cm:right,
        lage_erneut_pruefen:Math.max(Math.abs(left),Math.abs(right))>toleranz_cm,
        hinweis:'Gleiche Rahmenkante ohne Versatz der Messskala benutzen. Die Markierungen weisen keine Dichtheit oder sichere Befestigung nach.'};
    },
    example:{args:{start_links_cm:3,neu_links_cm:3.2,start_rechts_cm:78,neu_rechts_cm:79.3,toleranz_cm:0.5},expect:{verschiebung_links_cm:0.2,verschiebung_rechts_cm:1.3,lage_erneut_pruefen:true}},
  },
  {
    name:'fensterrahmen_diagonalen_vor_zuschnitt',
    description:'Vor rechteckigem Zuschnitt die beiden Diagonalen der Einbauebene auf bedeutsame Abweichung prüfen — Compare measured frame diagonals with the rectangle implied by width and height.',
    page:guide('fensterabdichtung-selber-bauen'),
    properties:{
      breite_cm:number('Breite der vorgesehenen Einbauebene.',1,500),
      hoehe_cm:number('Höhe der vorgesehenen Einbauebene.',1,500),
      diagonal_a_cm:number('Erste gemessene Eckdiagonale in derselben Ebene.',1,800),
      diagonal_b_cm:number('Zweite gemessene Eckdiagonale in derselben Ebene.',1,800),
      messtoleranz_cm:cm('Eigene Toleranz für das Aufmaß.'),
    },
    calculate({breite_cm,hoehe_cm,diagonal_a_cm,diagonal_b_cm,messtoleranz_cm}){
      const square=Math.hypot(breite_cm,hoehe_cm);
      return {ideal_diagonale_cm:round(square),gemessene_differenz_cm:round(Math.abs(diagonal_a_cm-diagonal_b_cm)),
        schablone_oder_nachmessung:Math.max(Math.abs(diagonal_a_cm-square),Math.abs(diagonal_b_cm-square),Math.abs(diagonal_a_cm-diagonal_b_cm))>messtoleranz_cm,
        hinweis:'Ein Plausibilitätscheck fürs Aufmaß. Gleiche Diagonalen allein belegen keine rechten Winkel oder gleichmäßige Falztiefe.'};
    },
    example:{args:{breite_cm:60,hoehe_cm:80,diagonal_a_cm:100,diagonal_b_cm:103,messtoleranz_cm:1},expect:{ideal_diagonale_cm:100,gemessene_differenz_cm:3,schablone_oder_nachmessung:true}},
  },
  {
    name:'thermovorhang_heizkoerper_stoffkante',
    description:'Überdeckte Heizkörperbreite durch die geplante Stoffkante vor und nach Kürzung bestimmen — Find projected radiator overlap at the present and proposed curtain hem.',
    page:guide('thermovorhang-ratgeber'),
    properties:{
      heizung_links_cm:cm('Linke Heizkörperkante entlang der Wand.'),
      heizung_rechts_cm:cm('Rechte Heizkörperkante auf derselben Skala.'),
      stoff_links_cm:cm('Linke Stoffkante entlang derselben Achse vor dem Heizkörper.'),
      stoff_rechts_cm:cm('Rechte Stoffkante.'),
      heizung_oben_cm:cm('Oberkante des Heizkörpers ab Fußboden.'),
      saum_alt_cm:cm('Unterkante des vorhandenen Vorhangs ab Fußboden.'),
      saum_neu_cm:cm('Geplante neue Unterkante ab Fußboden.'),
    },
    calculate({heizung_links_cm,heizung_rechts_cm,stoff_links_cm,stoff_rechts_cm,heizung_oben_cm,saum_alt_cm,saum_neu_cm}){
      if(heizung_links_cm>=heizung_rechts_cm||stoff_links_cm>=stoff_rechts_cm||heizung_oben_cm===0) throw new RangeError('Kanten');
      const span=round(overlap(heizung_links_cm,heizung_rechts_cm,stoff_links_cm,stoff_rechts_cm));
      return {ueberdeckungsbreite_alt_cm:saum_alt_cm<heizung_oben_cm?span:0,ueberdeckungsbreite_neu_cm:saum_neu_cm<heizung_oben_cm?span:0,
        hinweis:'Reine Vorderansicht bei durchgehendem Stoff von oberhalb des Heizkörpers bis zum Saum. Abstände laut Anleitung, Stoffbewegung und Thermostat separat beachten.'};
    },
    example:{args:{heizung_links_cm:35,heizung_rechts_cm:100,stoff_links_cm:20,stoff_rechts_cm:70,heizung_oben_cm:75,saum_alt_cm:60,saum_neu_cm:84},expect:{ueberdeckungsbreite_alt_cm:35,ueberdeckungsbreite_neu_cm:0}},
  },
  {
    name:'kondensatschlauch_durchgang_kreuzung',
    description:'Auf einer Skizze prüfen, welche gezeichnete Kondensatschlauchroute den benutzten Durchgang kreuzt — Compare two proposed drain-hose paths against a measured passage band.',
    page:guide('luftentfeuchter-ratgeber'),
    properties:{
      durchgang_links_cm:cm('Linke Kante des genutzten Streifens auf der Querachse.'),
      durchgang_rechts_cm:cm('Rechte Kante desselben Streifens.'),
      weg_a_min_cm:cm('Kleinste Querposition der zusammenhängenden Schlauchstrecke A im betroffenen Bereich.'),
      weg_a_max_cm:cm('Größte Querposition der Strecke A.'),
      weg_b_min_cm:cm('Kleinste Querposition der zusammenhängenden Strecke B.'),
      weg_b_max_cm:cm('Größte Querposition der Strecke B.'),
    },
    calculate({durchgang_links_cm,durchgang_rechts_cm,weg_a_min_cm,weg_a_max_cm,weg_b_min_cm,weg_b_max_cm}){
      if(durchgang_links_cm>=durchgang_rechts_cm||weg_a_min_cm>weg_a_max_cm||weg_b_min_cm>weg_b_max_cm) throw new RangeError('Skizzenkoordinaten');
      const crosses=(a,b)=>b>=durchgang_links_cm&&a<=durchgang_rechts_cm;
      return {a_beruehrt_durchgang:crosses(weg_a_min_cm,weg_a_max_cm),b_beruehrt_durchgang:crosses(weg_b_min_cm,weg_b_max_cm),
        hinweis:'Geometrie im gemeinsam betrachteten Raumabschnitt, einschließlich Randberührung. Gefälle, Knicke, zulässige Länge und Ablaufsystem laut Anleitung separat prüfen.'};
    },
    example:{args:{durchgang_links_cm:100,durchgang_rechts_cm:190,weg_a_min_cm:80,weg_a_max_cm:120,weg_b_min_cm:15,weg_b_max_cm:82},expect:{a_beruehrt_durchgang:true,b_beruehrt_durchgang:false}},
  },
  {
    name:'sitzplaetze_beobachtete_schattenzone',
    description:'Zwei Sitzpositionen mit den Grenzen eines am Boden beobachteten Schattenflecks abgleichen — Classify two candidate seating positions in a marked rectangular patch of shade.',
    page:guide('homeoffice-buero-kuehlen'),
    properties:{
      schatten_links_cm:cm('Linke Grenze des momentan beobachteten Schatten-Rechtecks.'),
      schatten_rechts_cm:cm('Rechte Grenze des Rechtecks.'),
      schatten_vorn_cm:cm('Vordere Grenze auf der rechtwinkligen Skizzenachse.'),
      schatten_hinten_cm:cm('Hintere Grenze.'),
      platz_a_x_cm:cm('Erste Koordinate des markierten Platzes A.'),
      platz_a_y_cm:cm('Zweite Koordinate von A.'),
      platz_b_x_cm:cm('Erste Koordinate des markierten Platzes B.'),
      platz_b_y_cm:cm('Zweite Koordinate von B.'),
    },
    calculate({schatten_links_cm,schatten_rechts_cm,schatten_vorn_cm,schatten_hinten_cm,platz_a_x_cm,platz_a_y_cm,platz_b_x_cm,platz_b_y_cm}){
      if(schatten_links_cm>=schatten_rechts_cm||schatten_vorn_cm>=schatten_hinten_cm) throw new RangeError('Schattenfeld');
      const inside=(x,y)=>x>schatten_links_cm&&x<schatten_rechts_cm&&y>schatten_vorn_cm&&y<schatten_hinten_cm;
      return {platz_a_im_feld:inside(platz_a_x_cm,platz_a_y_cm),platz_b_im_feld:inside(platz_b_x_cm,platz_b_y_cm),
        hinweis:'Momentaufnahme eines markierten ebenen Rechtecks, Rand zählt nicht. Der Schatten kann wandern; Sitzhöhe, Helligkeit und Temperatur getrennt testen.'};
    },
    example:{args:{schatten_links_cm:40,schatten_rechts_cm:160,schatten_vorn_cm:65,schatten_hinten_cm:210,platz_a_x_cm:110,platz_a_y_cm:140,platz_b_x_cm:220,platz_b_y_cm:145},expect:{platz_a_im_feld:true,platz_b_im_feld:false}},
  },
  {
    name:'ventilator_stellort_kabelweg_zwei_varianten',
    description:'Zwei bemaßte Kabelwege für einen geplanten Ventilatorstandort mit dem vorhandenen Kabel vergleichen — Compare measured route length and occupied-path conflicts at two fan locations.',
    page:guide('ventilator-kaufen-ratgeber'),
    properties:{
      nutzbare_laenge_cm:cm('Tatsächlich nutzbare Länge des Originalkabels oder USB-Kabels.'),
      a_weg_cm:cm('An Position A am realen Verlauf gemessene Weglänge.'),
      b_weg_cm:cm('An Position B gemessene Weglänge.'),
      eigene_wegreserve_cm:cm('Eigene zusätzliche Wegreserve, etwa für bereits gemessene Ecken.'),
      a_kreuzt:flag('Der Weg an A würde eine regelmäßig benutzte Bodenpassage kreuzen?'),
      b_kreuzt:flag('Der Weg an B würde eine regelmäßig benutzte Bodenpassage kreuzen?'),
    },
    calculate({nutzbare_laenge_cm,a_weg_cm,b_weg_cm,eigene_wegreserve_cm,a_kreuzt,b_kreuzt}){
      const a=nutzbare_laenge_cm-a_weg_cm-eigene_wegreserve_cm;
      const b=nutzbare_laenge_cm-b_weg_cm-eigene_wegreserve_cm;
      return {rest_a_cm:round(a),rest_b_cm:round(b),wegoptionen_mit_reserve:[a>=0&&!a_kreuzt?'A':null,b>=0&&!b_kreuzt?'B':null].filter(Boolean),
        hinweis:'Nur Längen- und Wegvergleich für vorhandene Originalausstattung. Das ist keine Prüfung einer Stromversorgung oder einer Verlängerung.'};
    },
    example:{args:{nutzbare_laenge_cm:175,a_weg_cm:140,b_weg_cm:152,eigene_wegreserve_cm:15,a_kreuzt:true,b_kreuzt:false},expect:{rest_a_cm:20,rest_b_cm:8,wegoptionen_mit_reserve:['B']}},
  },
  {
    name:'ventilator_sitztausch_zwei_personen',
    description:'Nach dem örtlichen Luftstromversuch zwei Plätze so zuordnen, dass bestätigte Vorlieben zusammenpassen — Match two occupants to two seats from their own fan-comfort observations.',
    page:guide('turmventilator-vs-standventilator'),
    properties:{
      person_eins_a:flag('Person 1 empfand Platz A bei der gewählten Einstellung als passend?'),
      person_eins_b:flag('Person 1 empfand Platz B als passend?'),
      person_zwei_a:flag('Person 2 empfand Platz A als passend?'),
      person_zwei_b:flag('Person 2 empfand Platz B als passend?'),
      gleiche_einstellung:flag('Alle vier Rückmeldungen aus vergleichbarer Einstellung und Aufstellung?'),
    },
    calculate({person_eins_a,person_eins_b,person_zwei_a,person_zwei_b,gleiche_einstellung}){
      const options=[];
      if(person_eins_a&&person_zwei_b) options.push('eins_a_zwei_b');
      if(person_eins_b&&person_zwei_a) options.push('eins_b_zwei_a');
      return {getestete_passende_zuordnungen:gleiche_einstellung?options:null,
        hinweis:'Nur die beiden Rückmeldungen am tatsächlichen Platz. Luftströmung und Temperatur oder gesundheitliche Wirkung werden nicht berechnet.'};
    },
    example:{args:{person_eins_a:false,person_eins_b:true,person_zwei_a:true,person_zwei_b:true,gleiche_einstellung:true},expect:{getestete_passende_zuordnungen:['eins_b_zwei_a']}},
  },
  {
    name:'hygrometer_messpunkt_markierung_versatz',
    description:'Auf der Planskizze prüfen, ob ein Messpunkt nach einer Umstellung am alten Ort blieb — Compute marked sensor position displacement before combining a time series.',
    page:guide('luftfeuchtigkeit-richtig-messen'),
    properties:{
      alt_x_cm:signed('Ursprünglicher X-Abstand zu einer festen Raummarke.'),
      alt_y_cm:signed('Ursprünglicher Y-Abstand zu derselben Marke.'),
      alt_hoehe_cm:cm('Ursprüngliche Höhe des Sensors über Boden.'),
      neu_x_cm:signed('Neuer X-Abstand bei gleicher Achsenlage und Raummarke.'),
      neu_y_cm:signed('Neuer Y-Abstand.'),
      neu_hoehe_cm:cm('Neue Sensorhöhe.'),
      toleranz_cm:cm('Eigene Positionstoleranz für die wiederholte Aufstellung.'),
    },
    calculate({alt_x_cm,alt_y_cm,alt_hoehe_cm,neu_x_cm,neu_y_cm,neu_hoehe_cm,toleranz_cm}){
      const displacement=Math.hypot(alt_x_cm-neu_x_cm,alt_y_cm-neu_y_cm,alt_hoehe_cm-neu_hoehe_cm);
      return {versatz_cm:round(displacement),positionswechsel_notieren:displacement>toleranz_cm,
        hinweis:'Gleiche Raumachse, Bezugshöhe und Einbaurichtung vorausgesetzt. Änderungen an Sonne, Heizung, Fenster, Wäsche oder Möbeln separat erfassen.'};
    },
    example:{args:{alt_x_cm:40,alt_y_cm:70,alt_hoehe_cm:110,neu_x_cm:43,neu_y_cm:74,neu_hoehe_cm:110,toleranz_cm:3},expect:{versatz_cm:5,positionswechsel_notieren:true}},
  },
  {
    name:'haushaltsweg_begegnung_freie_breite',
    description:'Prüfen, ob zwei gemessene getragene Gegenstände einander in einem geplanten gemeinsamen Durchgangsabschnitt begegnen könnten — Check simultaneous passage width for two carried household items.',
    page:guide('saugwischer-kaufberatung'),
    properties:{
      engstelle_cm:cm('Tatsächlich kleinste freie Breite im betreffenden geraden Abschnitt.'),
      a_gesamt_cm:cm('Gemessene gesamte Breite von Person und Gegenstand A in Transportausrichtung.'),
      b_gesamt_cm:cm('Gemessene gesamte Breite von Person und Gegenstand B in Transportausrichtung.'),
      trennreserve_cm:cm('Eigener zusätzlich geplanter Zwischenraum.'),
    },
    calculate({engstelle_cm,a_gesamt_cm,b_gesamt_cm,trennreserve_cm}){
      const together=a_gesamt_cm+b_gesamt_cm+trennreserve_cm;
      const one=Math.max(a_gesamt_cm,b_gesamt_cm);
      return {rest_bei_begegnung_cm:round(engstelle_cm-together),einzelne_passage_im_aufmass:one<=engstelle_cm,
        nacheinander_planen:one<=engstelle_cm&&together>engstelle_cm,
        hinweis:'Nur eine Querbreite für bereits praktikable Einzeltransporte. Abbiegen, Boden, Handhabung und rechtliche Durchgangsanforderungen bleiben offen.'};
    },
    example:{args:{engstelle_cm:94,a_gesamt_cm:55,b_gesamt_cm:46,trennreserve_cm:8},expect:{rest_bei_begegnung_cm:-15,einzelne_passage_im_aufmass:true,nacheinander_planen:true}},
  },
  {
    name:'schreibtisch_geraeteklemme_kantenabgleich',
    description:'Bemaßte Tischkante für die im Gerätehandbuch genannte Lüfterklemme prüfen — Compare two desk-edge candidates against the documented clip geometry.',
    page:guide('ventilator-kaufen-ratgeber'),
    properties:{
      klemme_min_mm:number('Kleinste laut Handbuch passende Plattenstärke in mm.',0,250),
      klemme_max_mm:number('Größte laut Handbuch passende Plattenstärke in mm.',0,250),
      auflage_benoetigt_mm:number('Dokumentierte notwendige freie Auflagetiefe unter der Kante.',0,500),
      a_dicke_mm:number('Gemessene Plattenstärke an Kante A.',1,250),
      a_auflage_mm:number('Gemessene freie Auflagetiefe an Kante A.',0,500),
      b_dicke_mm:number('Gemessene Plattenstärke an Kante B.',1,250),
      b_auflage_mm:number('Gemessene freie Auflagetiefe an Kante B.',0,500),
    },
    calculate({klemme_min_mm,klemme_max_mm,auflage_benoetigt_mm,a_dicke_mm,a_auflage_mm,b_dicke_mm,b_auflage_mm}){
      if(klemme_max_mm<klemme_min_mm) throw new RangeError('Klemmmaße');
      const matches=(thick,depth)=>thick>=klemme_min_mm&&thick<=klemme_max_mm&&depth>=auflage_benoetigt_mm;
      return {kanten_im_massbereich:[matches(a_dicke_mm,a_auflage_mm)?'A':null,matches(b_dicke_mm,b_auflage_mm)?'B':null].filter(Boolean),
        hinweis:'Nur der geometrische Vergleich für ein laut Anleitung klemmbares Gerät. Untergrund, Tragfähigkeit, Rundungen und Ausrichtung sind gesondert zu prüfen.'};
    },
    example:{args:{klemme_min_mm:10,klemme_max_mm:36,auflage_benoetigt_mm:25,a_dicke_mm:26,a_auflage_mm:15,b_dicke_mm:32,b_auflage_mm:30},expect:{kanten_im_massbereich:['B']}},
  },
  {
    name:'entfeuchter_tankweg_tragstrecke',
    description:'Die in einem eigenen Zeitraum mit dem gefüllten Tank zurückgelegten Meter für zwei geplante Standorte vergleichen — Compare repeated carrying distance to the emptying point for two dehumidifier locations.',
    page:guide('luftentfeuchter-ratgeber'),
    properties:{
      weg_a_m:number('Am realen Weg gemessene einfache Tragstrecke von Standort A bis zur Entleerung.',0,500),
      weg_b_m:number('Am realen Weg gemessene einfache Tragstrecke von Standort B.',0,500),
      leerungen_a:number('Beobachtete Zahl der Tankentleerungen an A im Vergleichszeitraum.',0,100),
      leerungen_b:number('Beobachtete Zahl der Tankentleerungen an B in genauso vielen Tagen.',0,100),
      vergleichbare_raumziele:flag('Vergleichbare Zielbedingungen und vom Handbuch gedeckte Aufstellung an beiden Orten?'),
    },
    calculate({weg_a_m,weg_b_m,leerungen_a,leerungen_b,vergleichbare_raumziele}){
      if(!Number.isInteger(leerungen_a)||!Number.isInteger(leerungen_b)) throw new RangeError('Tankleerungen zählen');
      const a=weg_a_m*leerungen_a;
      const b=weg_b_m*leerungen_b;
      return {getragene_meter_a:round(a),getragene_meter_b:round(b),differenz_b_minus_a_m:vergleichbare_raumziele?round(b-a):null,
        hinweis:'Vergleicht nur die einfache Strecke mit gefülltem Tank, ohne Rückwege, Gewicht oder Treppenaufwand. Aus dem Ergebnis folgt keine Standortfreigabe.'};
    },
    example:{args:{weg_a_m:9,weg_b_m:5,leerungen_a:5,leerungen_b:6,vergleichbare_raumziele:true},expect:{getragene_meter_a:45,getragene_meter_b:30,differenz_b_minus_a_m:-15}},
  },
  {
    name:'klimageraet_serviceposition_markieren',
    description:'Verschiebeweg zum geplanten Servicepunkt gegen die real bemaßte freie Spur abgleichen — Check a straight repositioning distance for access to a switched-off portable unit.',
    page:guide('klimaanlage-reinigen'),
    properties:{
      geraet_tiefe_cm:number('Länge der Gerätefläche in geplanter Verschieberichtung.',0.1,500),
      spur_gesamt_cm:number('Freie zusammenhängende Länge derselben Spur einschließlich Ausgangsfläche.',0.1,2000),
      verschiebung_cm:cm('Gewünschter Versatz bis zur markierten Serviceposition.'),
      spur_breite_geprueft:flag('Ausreichende Spurbreite für das Gerät in dieser Ausrichtung vor Ort überprüft?'),
      verschieben_laut_handbuch:flag('Handbuch erlaubt diesen geraden Versatz beim ausgeschalteten Gerät mit gelösten Anschlüssen?'),
    },
    calculate({geraet_tiefe_cm,spur_gesamt_cm,verschiebung_cm,spur_breite_geprueft,verschieben_laut_handbuch}){
      const spare=spur_gesamt_cm-geraet_tiefe_cm-verschiebung_cm;
      return {laengenreserve_cm:round(spare),serviceposition_im_bemassten_weg:verschieben_laut_handbuch&&spur_breite_geprueft?spare>=0:null,
        hinweis:'Die Spur ist gerade und eben angenommen. Tragen, Steigung, Kabel, Schlauch, Standsicherheit und das Handbuch bleiben separat zu prüfen.'};
    },
    example:{args:{geraet_tiefe_cm:40,spur_gesamt_cm:120,verschiebung_cm:61,spur_breite_geprueft:true,verschieben_laut_handbuch:true},expect:{laengenreserve_cm:19,serviceposition_im_bemassten_weg:true}},
  },
];
