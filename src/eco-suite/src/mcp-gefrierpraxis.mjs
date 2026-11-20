const page = '/geraete-austausch-rechner.html';
const revision = '2026-08-27';
const models = {
  GSN33EWEV: {volumen_l:225, gefriervermoegen_kg_24h:19, jahreslabel_kwh:229, min_c:10, max_c:43, schallleistung_dba:39, schallklasse:'C',
    abmessung_mm:{hoehe:1760,breite:600,tiefe:650},
    datenblatt:'https://media3.bsh-group.com/Documents/eudatasheet/de-DE/GSN33EWEV.pdf'},
  GSN58DWDV: {volumen_l:366, gefriervermoegen_kg_24h:20.8, jahreslabel_kwh:222, min_c:10, max_c:43, schallleistung_dba:38, schallklasse:'C',
    abmessung_mm:{hoehe:1910,breite:700,tiefe:780},
    datenblatt:'https://media3.bsh-group.com/Documents/eudatasheet/de-DE/GSN58DWDV.pdf'}
};
const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const choice = (description, ...values) => ({type:'string', description, enum:values});
const kg = description => number(description, 0, 200);
const litre = description => number(description, 0, 1000);
const minute = description => number(description, 0, 10080);
const temp = description => number(description, -60, 75);
const dimension = description => number(description, 0, 5000);
const energy = description => number(description, 0, 5000);
const model = description => choice(description, ...Object.keys(models), 'offen');
const ready = description => choice(description, 'belegt', 'ausgeschlossen', 'offen');
const rounded = value => Math.round(value * 100) / 100;
const dayMinutes = 1440;

function source(entry) {
  return entry ? {datenblatt_de:entry.datenblatt, datenblatt_stand:revision} : null;
}
function span(start, end) {
  if (end < start) throw new RangeError('Zeitangaben müssen denselben Nullpunkt und die richtige Reihenfolge haben.');
  return end - start;
}
function entry(name, description, properties, calculate, args, expect) {
  return {name, description, page, properties, calculate, example:{args, expect}};
}

export const gefrierpraxis = [
  entry('gefrierschrank_24h_haushaltsspitze_und_bestandsvolumen',
    'Vergleiche zwei dokumentierte Gefrierschränke nach rollierender Frischmenge und belegtem Bestandsvolumen — Compare models by rolling 24-hour fresh load and retained volume',
    {
      a_min:minute('Zeit der ersten beobachteten Frischladung seit Beginn der Erfassung'),
      a_kg:kg('Frisch zu gefrierende Masse der ersten Ladung'),
      b_min:minute('Zeit der nächsten Frischladung im selben Zeitmaßstab'),
      b_kg:kg('Frisch zu gefrierende Masse der zweiten Ladung'),
      c_min:minute('Zeit der dritten Frischladung im selben Zeitmaßstab'),
      c_kg:kg('Frisch zu gefrierende Masse der dritten Ladung'),
      maximales_bestandsvolumen_l:litre('Größter gleichzeitig geplanter Bestand einschließlich Neuware, als gemessenes beanspruchtes Volumen'),
      komplette_ladungsreihe:flag('Alle relevanten Frischladungen und mindestens die vorangehenden 24 Stunden sind erfasst; keine zeitgleiche Doppelzählung')
    }, ({a_min,a_kg,b_min,b_kg,c_min,c_kg,maximales_bestandsvolumen_l,komplette_ladungsreihe}) => {
      span(a_min,b_min);
      span(b_min,c_min);
      if(!komplette_ladungsreihe) return {rollierende_spitze_kg:null, modellvergleich:null,
        grenze:'Eine lückenhafte Ladungsreihe lässt den tatsächlichen Spitzenwert offen.'};
      const ladungen=[[a_min,a_kg],[b_min,b_kg],[c_min,c_kg]];
      const spitze=Math.max(...ladungen.map(([ende])=>ladungen.reduce((summe,[zeit,masse])=>
        zeit<=ende && zeit>ende-dayMinutes ? summe+masse : summe,0)));
      return {rollierende_spitze_kg:rounded(spitze),
        modellvergleich:Object.entries(models).map(([modell, daten])=>({
          modell, reserve_kg_24h:rounded(daten.gefriervermoegen_kg_24h-spitze),
          reserve_nennvolumen_l:rounded(daten.volumen_l-maximales_bestandsvolumen_l),
          quelle:source(daten)
        })),
        grenze:'Rollierendes Fenster ist links offen. Frischlast und belegtes Volumen sind unabhängige Größen. Labelreserve garantiert weder Formpassung noch den tatsächlichen Gefriervorgang.'};
    }, {a_min:1390,a_kg:9,b_min:1445,b_kg:8,c_min:1590,c_kg:3,maximales_bestandsvolumen_l:240,komplette_ladungsreihe:true},
    {rollierende_spitze_kg:20,modellvergleich:[
      {modell:'GSN33EWEV',reserve_kg_24h:-1,reserve_nennvolumen_l:-15,
        quelle:{datenblatt_de:'https://media3.bsh-group.com/Documents/eudatasheet/de-DE/GSN33EWEV.pdf',datenblatt_stand:'2026-08-27'}},
      {modell:'GSN58DWDV',reserve_kg_24h:0.8,reserve_nennvolumen_l:126,
        quelle:{datenblatt_de:'https://media3.bsh-group.com/Documents/eudatasheet/de-DE/GSN58DWDV.pdf',datenblatt_stand:'2026-08-27'}}
    ]}),

  entry('gefrierladung_waegeunbekannte_packung_massenintervall',
    'Begrenze die frisch zu gefrierende Masse, wenn ein Teil der gewogenen Packungen noch nicht getrennt ist — Bound fresh loading mass when packaging or already frozen contents are unresolved',
    {
      frisch_eindeutig_kg:kg('Netto gewogene eindeutig frische Ladung'),
      mischmasse_kg:kg('Weitere Bruttomasse aus noch gemischten Paketen'),
      sicher_nicht_frisch_min_kg:kg('Belegte Untergrenze aus Verpackung und bereits gefrorenem Inhalt in dieser Mischmasse'),
      sicher_nicht_frisch_max_kg:kg('Belegte Obergrenze für dieselben Anteile'),
      mischung_separat:flag('Mischmasse und eindeutig frische Ladung wurden getrennt gewogen')
    }, ({frisch_eindeutig_kg,mischmasse_kg,sicher_nicht_frisch_min_kg,sicher_nicht_frisch_max_kg,mischung_separat}) => {
      if(sicher_nicht_frisch_min_kg>sicher_nicht_frisch_max_kg || sicher_nicht_frisch_max_kg>mischmasse_kg) throw new RangeError('Gewichtsgrenzen prüfen.');
      return {frischmasse_kg:mischung_separat ? [
        rounded(frisch_eindeutig_kg+mischmasse_kg-sicher_nicht_frisch_max_kg),
        rounded(frisch_eindeutig_kg+mischmasse_kg-sicher_nicht_frisch_min_kg)
      ] : null, grenze:'Eine Masse für die Bestandsplanung. Unbekannte Teilmengen nicht als null behandeln; kein Urteil über den Zustand der Lebensmittel.'};
    }, {frisch_eindeutig_kg:9,mischmasse_kg:11,sicher_nicht_frisch_min_kg:2,sicher_nicht_frisch_max_kg:7,mischung_separat:true},
    {frischmasse_kg:[13,18]}),

  entry('gefrierschrank_schnelleinfrieren_protokoll_vorlauf',
    'Prüfe, ob eine dokumentierte Schnelleinfrierphase rechtzeitig zum beobachteten Beladen begann — Verify the observed lead time for the manual-documented fast-freeze mode',
    {
      genaues_modell:model('Genaue deutsche Modellkennung laut Typenschild'),
      modus_ab_min:minute('Protokollierter Beginn der bestätigten Funktion auf gemeinsamer Zeitbasis'),
      ladung_ab_min:minute('Zeitpunkt des Beladens auf gleicher Zeitbasis'),
      vorlauf_soll_min:minute('Zum Ladungsfall dokumentierter Vorlauf aus passender Geräteanleitung'),
      modus_und_ladungsscope_bestaetigt:flag('Anleitung bestätigt den Vorgang und die beobachtete Aktivierung für diesen Fall')
    }, ({genaues_modell,modus_ab_min,ladung_ab_min,vorlauf_soll_min,modus_und_ladungsscope_bestaetigt}) => {
      const versatz=ladung_ab_min-modus_ab_min;
      const daten=models[genaues_modell];
      return {funktion_im_de_datenblatt:daten ? true : null,
        fristreserve_min:daten && modus_und_ladungsscope_bestaetigt ? rounded(versatz-vorlauf_soll_min) : null,
        quelle:source(daten),
        grenze:'Beide Datenblätter nennen die Funktion. Der genaue Vorlauf muss zur Modellanleitung und Ladung gehören. Keine Aussage zur tatsächlichen Abkühlung.'};
    }, {genaues_modell:'GSN33EWEV',modus_ab_min:120,ladung_ab_min:350,vorlauf_soll_min:240,modus_und_ladungsscope_bestaetigt:false},
    {funktion_im_de_datenblatt:true,fristreserve_min:null}),

  entry('gefrierschrank_aufstellort_klimaband_messabdeckung',
    'Beurteile die dokumentierte Zeit unter und über dem Modell-Klimaband inklusive offener Zeit — Scope logged ambient conditions to the exact freezer climate envelope',
    {
      genaues_modell:model('Genaue deutsche Modellkennung'),
      dauer_min:minute('Gesamtdauer der geplanten Aufstellortbeobachtung'),
      luecke_min:minute('Minuten ohne verwertbare Messwerte'),
      unter_10_min:minute('Belegte Minuten unter 10 °C am vorgesehenen Gerätelufteintritt'),
      ueber_43_min:minute('Belegte Minuten über 43 °C am selben Messort'),
      messpunkte_passend:flag('Zeitanteile sind getrennt und repräsentieren den Aufstellort, keine Wetter-App oder Innenfachtemperatur')
    }, ({genaues_modell,dauer_min,luecke_min,unter_10_min,ueber_43_min,messpunkte_passend}) => {
      if(luecke_min+unter_10_min+ueber_43_min>dauer_min+1e-8) throw new RangeError('Temperatur- und Lückenminuten getrennt zählen.');
      const daten=models[genaues_modell];
      const belegt=daten && messpunkte_passend;
      return {de_klimaband_c:daten ? [daten.min_c,daten.max_c] : null,
        winterschaltung:daten ? 'nein' : 'offen',
        ausserhalb_belegt_min:belegt ? rounded(unter_10_min+ueber_43_min) : null,
        innerhalb_belegt_min:belegt ? rounded(Math.max(0,dauer_min-luecke_min-unter_10_min-ueber_43_min)) : null,
        offen_min:luecke_min, quelle:source(daten),
        grenze:'Nur dieses Protokoll. Fehlende Minuten können außerhalb der Spanne liegen; keine Schlussfolgerung über Betrieb in einer anderen Jahreszeit.'};
    }, {genaues_modell:'GSN58DWDV',dauer_min:1500,luecke_min:90,unter_10_min:130,ueber_43_min:0,messpunkte_passend:true},
    {de_klimaband_c:[10,43],winterschaltung:'nein',ausserhalb_belegt_min:130,innerhalb_belegt_min:1280,offen_min:90}),

  entry('gefrierschrank_klimaband_besuchsminimum_referenzpunkt',
    'Trenne einen protokollierten kalten Aufstellpunkt von einem gleichzeitig wärmeren Raumreferenzwert — Separate a cold freezer placement reading from an in-room reference',
    {
      genaues_modell:model('Genaue deutsche Modellkennung'),
      lufteintritt_min_c:temp('Niedrigste dokumentierte Lufttemperatur direkt am künftig betrachteten Aufstellpunkt'),
      referenz_zeitgleich_c:temp('Wert im gleichen Moment am zentralen Raumreferenzpunkt'),
      gemeinsame_uhr_und_ort:flag('Kaltpunkt und Referenz wurden gleichzeitig als Luftmessung belegt')
    }, ({genaues_modell,lufteintritt_min_c,referenz_zeitgleich_c,gemeinsame_uhr_und_ort}) => {
      const daten=models[genaues_modell];
      return {raum_minus_aufstellpunkt_c:gemeinsame_uhr_und_ort ? rounded(referenz_zeitgleich_c-lufteintritt_min_c) : null,
        referenz_verdeckt_unterschreitung:daten && gemeinsame_uhr_und_ort ? lufteintritt_min_c<daten.min_c && referenz_zeitgleich_c>=daten.min_c : null,
        quelle:source(daten),
        grenze:'Zeitgleiches Ortsgefälle. Einen einzelnen Raumwert nicht zur Einstufung der ganzen Aufstellperiode heranziehen.'};
    }, {genaues_modell:'GSN33EWEV',lufteintritt_min_c:8.5,referenz_zeitgleich_c:13.4,gemeinsame_uhr_und_ort:true},
    {raum_minus_aufstellpunkt_c:4.9,referenz_verdeckt_unterschreitung:true}),

  entry('gefrierschrank_stromausfall_dauer_zwischen_ankern',
    'Grenze die Länge einer belegten Unterbrechung aus vier verlässlichen Strombeobachtungen ein — Bound the outage duration from four verified power observations',
    {
      letzter_strom_min:minute('Letzte Beobachtung mit Versorgung vor dem Ausfall'),
      erstmals_aus_min:minute('Erste Beobachtung ohne Versorgung'),
      zuletzt_aus_min:minute('Letzte Beobachtung ohne Versorgung'),
      erstmals_wieder_strom_min:minute('Erste Beobachtung mit Versorgung nach dem Ausfall'),
      ein_ausfall_und_uhr_bestaetigt:flag('Eindeutig dieselbe zusammenhängende Unterbrechung, alle Zeiten auf einer Referenz')
    }, ({letzter_strom_min,erstmals_aus_min,zuletzt_aus_min,erstmals_wieder_strom_min,ein_ausfall_und_uhr_bestaetigt}) => {
      span(letzter_strom_min,erstmals_aus_min);
      const minimum=span(erstmals_aus_min,zuletzt_aus_min);
      span(zuletzt_aus_min,erstmals_wieder_strom_min);
      return {dauer_min:ein_ausfall_und_uhr_bestaetigt ? [rounded(minimum),rounded(erstmals_wieder_strom_min-letzter_strom_min)] : null,
        unbekannter_beginn_min:ein_ausfall_und_uhr_bestaetigt ? [letzter_strom_min,erstmals_aus_min] : null,
        grenze:'Eine Stromzeitspanne ist keine gemessene Fachtemperatur und bestimmt nicht den Zustand des Inhalts.'};
    }, {letzter_strom_min:120,erstmals_aus_min:145,zuletzt_aus_min:230,erstmals_wieder_strom_min:260,ein_ausfall_und_uhr_bestaetigt:true},
    {dauer_min:[85,140],unbekannter_beginn_min:[120,145]}),

  entry('gefrierschrank_stoerakte_tuer_und_temperaturzeitpunkt',
    'Kennzeichne, welche Beobachtungen sicher in die stromlose Phase fallen — Classify door and temperature evidence inside the confirmed outage window',
    {
      aus_sicher_ab_min:minute('Beginn der direkt bestätigten stromlosen Teilphase'),
      aus_sicher_bis_min:minute('Ende derselben direkt bestätigten Teilphase'),
      tuer_min:minute('Zeitpunkt der ersten dokumentierten Öffnung, falls beobachtet'),
      temperatur_min:minute('Zeitpunkt der letzten direkt erfassten Fachtemperatur, falls beobachtet'),
      tuer_erfasst:flag('Türöffnung tatsächlich mit Zeitstempel beobachtet'),
      fach_temp_erfasst:flag('Fachtemperatur mit Zeitstempel und eindeutigem Messort beobachtet')
    }, ({aus_sicher_ab_min,aus_sicher_bis_min,tuer_min,temperatur_min,tuer_erfasst,fach_temp_erfasst}) => {
      span(aus_sicher_ab_min,aus_sicher_bis_min);
      const innen=zeit=>zeit>=aus_sicher_ab_min && zeit<=aus_sicher_bis_min;
      return {tuer_in_bestaetigter_ausphase:tuer_erfasst ? innen(tuer_min) : null,
        letzte_fachmessung_in_bestaetigter_ausphase:fach_temp_erfasst ? innen(temperatur_min) : null,
        offene_informationen:[!tuer_erfasst&&'tuerzeit',!fach_temp_erfasst&&'letzter_fachwert'].filter(Boolean),
        grenze:'Außerhalb der bestätigten Teilphase heißt nicht zwingend außerhalb des ganzen Ausfalls. Kein Urteil über eingefrorene Lebensmittel.'};
    }, {aus_sicher_ab_min:145,aus_sicher_bis_min:230,tuer_min:158,temperatur_min:0,tuer_erfasst:true,fach_temp_erfasst:false},
    {tuer_in_bestaetigter_ausphase:true,letzte_fachmessung_in_bestaetigter_ausphase:null,offene_informationen:['letzter_fachwert']}),

  entry('gefrierfach_nach_stoerung_displayquelle_gegensichten',
    'Trenne nach Stromrückkehr einen Sollwert oder Speicherwert von einer neuen Fachmessung — Distinguish a setpoint or stored alarm reading from new temperature evidence',
    {
      art:choice('Was zeigt die zum Modell passende Anzeige laut Anleitung?', 'sollwert','alarm_speicherwert','aktuelle_fachmessung','offen'),
      display_c:temp('Zahl auf der Anzeige, wenn lesbar'),
      unabhaengiger_sensor_c:temp('Gleichzeitige bekannte Fachmessung mit unabhängigem Sensor'),
      messort_und_minute_bestaetigt:flag('Unabhängige Messung war zeitgleich, am zugehörigen dokumentierten Ort und im passenden Anzeigebereich')
    }, ({art,display_c,unabhaengiger_sensor_c,messort_und_minute_bestaetigt}) => ({
      display_als_aktivwert_vergleichbar:art==='aktuelle_fachmessung' && messort_und_minute_bestaetigt,
      aktiver_anzeigeabstand_c:art==='aktuelle_fachmessung' && messort_und_minute_bestaetigt
        ? rounded(display_c-unabhaengiger_sensor_c) : null,
      anzeigeart:art,
      grenze:'Stromrückkehr, Anzeige und Fachzustand sind getrennte Belege. Ein Vergleich ist keine Kalibrierung oder Zustandsfreigabe.'
    }), {art:'alarm_speicherwert',display_c:-8,unabhaengiger_sensor_c:-15,messort_und_minute_bestaetigt:true},
    {display_als_aktivwert_vergleichbar:false,aktiver_anzeigeabstand_c:null,anzeigeart:'alarm_speicherwert'}),

  entry('gefrierschrank_label_tagesanteil_gegen_eigene_messung',
    'Stelle gemessenen Verbrauch dem rechnerischen Zeitanteil des Jahreslabels gegenüber — Compare observed energy with the prorated annual label reference',
    {
      genaues_modell:model('Genaue deutsche Modellkennung der Vergleichsbasis'),
      dauer_h:number('Stunden der vollständigen Geräte-Einzelmessung',1,8784),
      gemessen_kwh:energy('Tatsächlich über diesen Messzeitraum gemessene kWh'),
      scope_und_zeit_bestaetigt:flag('Zähler erfasst nur dieses Gerät und den vollständigen Messzeitraum ohne bekannten Reset')
    }, ({genaues_modell,dauer_h,gemessen_kwh,scope_und_zeit_bestaetigt}) => {
      const daten=models[genaues_modell];
      const referenz=daten ? daten.jahreslabel_kwh*dauer_h/(365*24) : null;
      return {label_kwh_a:daten?.jahreslabel_kwh ?? null,
        label_zeitanteil_kwh:referenz===null ? null : rounded(referenz),
        eigene_messung_minus_labelzeitanteil_kwh:referenz!==null && scope_und_zeit_bestaetigt ? rounded(gemessen_kwh-referenz):null,
        quelle:source(daten),
        grenze:'Der Zeitanteil des Labels ist ein Rechenbezug, keine Herstellerzusage für diesen Zeitraum oder eine Jahresprognose aus der Stichprobe.'};
    }, {genaues_modell:'GSN33EWEV',dauer_h:168,gemessen_kwh:4.7,scope_und_zeit_bestaetigt:true},
    {label_kwh_a:229,label_zeitanteil_kwh:4.39,eigene_messung_minus_labelzeitanteil_kwh:0.31}),

  entry('gefrierschrank_zaehler_reset_downtime_energieluecke',
    'Trenne beim Zählerreset zwei belegte Gefrierphasen von einem ungemessenen Wiederanlauf — Account for a freezer energy logging gap after a meter reset',
    {
      davor_kwh:energy('Bereits gesicherte Energie vor dem Reset'),
      danach_kwh:energy('Ab späterer stabiler Zähleraufzeichnung erneut gesicherte Energie'),
      unterbrechung_min:minute('Unprotokollierte Dauer vom Ende der alten bis zum Start der neuen Zählerreihe'),
      davon_stromlos_belegt_min:minute('Teil der Lücke, der unabhängig nachweisbar ohne Versorgung war'),
      gleiche_steckdose_nur_geraet:flag('Beide Messdateien gehören zum gleichen Gerät und Verbrauchsumfang')
    }, ({davor_kwh,danach_kwh,unterbrechung_min,davon_stromlos_belegt_min,gleiche_steckdose_nur_geraet}) => {
      if(davon_stromlos_belegt_min>unterbrechung_min) throw new RangeError('Stromloser Anteil liegt außerhalb der Datenlücke.');
      return {energie_belegter_abschnitte_kwh:gleiche_steckdose_nur_geraet ? rounded(davor_kwh+danach_kwh):null,
        ungemessen_mit_moeglicher_versorgung_min:rounded(unterbrechung_min-davon_stromlos_belegt_min),
        grenze:'Unbeobachteter Verbrauch bleibt offen. Eine nachweislich stromlose Zeit ist etwas anderes als ein fehlender Messdatensatz.'};
    }, {davor_kwh:1.9,danach_kwh:1.34,unterbrechung_min:140,davon_stromlos_belegt_min:90,gleiche_steckdose_nur_geraet:true},
    {energie_belegter_abschnitte_kwh:3.24,ungemessen_mit_moeglicher_versorgung_min:50}),

  entry('gefrierschrank_tuerraum_durchgang_bei_90_grad',
    'Prüfe die verbleibende Durchgangsbreite bei belegter geöffneter Gerätetür — Check passage left beside a documented open freezer door',
    {
      genaues_modell:model('Genaue deutsche Modellkennung'),
      gesamte_tiefe_bis_gegenkante_mm:dimension('Vom Gerätebezug bis zur gegenüberliegenden Begrenzung gemessene Breite'),
      offene_tiefe_90_mm:dimension('Gesamttiefe ab genau demselben Bezug bei 90° geöffneter Tür, aus Anleitung oder Sichtprobe'),
      durchgang_benoetigt_mm:dimension('Selbst gemessene benötigte Durchgangsbreite für den geplanten Ablauf'),
      offene_tiefe_passend_belegt:flag('Quellenbezug benennt 90° und die Darstellung schließt Griff und vorgesehene Aufstellung ein')
    }, ({genaues_modell,gesamte_tiefe_bis_gegenkante_mm,offene_tiefe_90_mm,durchgang_benoetigt_mm,offene_tiefe_passend_belegt}) => {
      const daten=models[genaues_modell];
      const rest=gesamte_tiefe_bis_gegenkante_mm-offene_tiefe_90_mm;
      if(daten && offene_tiefe_passend_belegt && offene_tiefe_90_mm<daten.abmessung_mm.tiefe) throw new RangeError('Bezug der geöffneten Tiefe und Gehäusetiefe prüfen.');
      return {geschlossene_geraetetiefe_mm:daten?.abmessung_mm.tiefe ?? null,
        restdurchgang_mm:daten && offene_tiefe_passend_belegt ? rounded(rest):null,
        reserve_zum_eigenen_bedarf_mm:daten && offene_tiefe_passend_belegt ? rounded(rest-durchgang_benoetigt_mm):null,
        quelle:source(daten),
        grenze:'Nur der gemessene Querschnitt bei 90°. Das EU-Datenblatt nennt keine offene Tiefe. Bewegungsweg und Modellanleitung gesondert prüfen.'};
    }, {genaues_modell:'GSN33EWEV',gesamte_tiefe_bis_gegenkante_mm:1720,offene_tiefe_90_mm:1230,durchgang_benoetigt_mm:550,offene_tiefe_passend_belegt:true},
    {geschlossene_geraetetiefe_mm:650,restdurchgang_mm:490,reserve_zum_eigenen_bedarf_mm:-60}),

  entry('gefrierschrank_tuerwinkel_schublade_entnahme_pruefung',
    'Trenne die dokumentierte Türöffnung für gewöhnlichen Zugriff vom Winkel zur Schubladenentnahme — Separate ordinary access and full drawer-removal door angles',
    {
      am_standort_erreichbar_grad:number('Erreichbarer maximaler Türwinkel ohne Hindernis',0,180),
      zugriff_min_grad:number('Dokumentiertes Minimum für Zugriff auf die vorgesehene Schublade',0,180),
      entnahme_min_grad:number('Separat dokumentiertes Minimum für die vollständige Entnahme derselben Schublade',0,180),
      zugriff_und_entnahme_geprueft:flag('Bezug der Winkel, Türanschlag und Schublade anhand Modellunterlagen oder eigener Sichtprobe bestätigt')
    }, ({am_standort_erreichbar_grad,zugriff_min_grad,entnahme_min_grad,zugriff_und_entnahme_geprueft}) => {
      if(zugriff_und_entnahme_geprueft && entnahme_min_grad<zugriff_min_grad) throw new RangeError('Winkeldokumentation der gleichen Schublade prüfen.');
      return {zugriff_im_winkelbereich:zugriff_und_entnahme_geprueft ? am_standort_erreichbar_grad>=zugriff_min_grad : null,
        winkelreserve_entnahme_grad:zugriff_und_entnahme_geprueft ? rounded(am_standort_erreichbar_grad-entnahme_min_grad) : null,
        grenze:'Geometrischer Winkelabgleich. Griffe, Schienen, Einbauten und der Bewegungsraum der Schublade separat prüfen.'};
    }, {am_standort_erreichbar_grad:95,zugriff_min_grad:85,entnahme_min_grad:110,zugriff_und_entnahme_geprueft:true},
    {zugriff_im_winkelbereich:true,winkelreserve_entnahme_grad:-15}),

  entry('gefrierschrank_versorgungsrueckkehr_anzeige_separat',
    'Prüfe, ob die beobachtete Geräteanzeige nach belegter Stromrückkehr überhaupt zeitlich zugeordnet werden kann — Separate power restoration from display restart evidence',
    {
      versorgung_min:minute('Erste unabhängige bestätigte Versorgung auf gemeinsamer Zeitbasis'),
      display_min:minute('Zeitpunkt der ersten belegten Anzeige am genau identifizierten Gerät'),
      kontrollfenster_min:minute('Selbst festgelegte Dauer der geplanten Nachkontrolle ab bestätigter Versorgung'),
      display_und_versorgung_gleicher_bezug:flag('Zeitmarken betreffen das passende Gerät und den richtigen Versorgungsumfang')
    }, ({versorgung_min,display_min,kontrollfenster_min,display_und_versorgung_gleicher_bezug}) => {
      const abstand=display_min-versorgung_min;
      return {anzeige_beobachtet_nach_rueckkehr:display_und_versorgung_gleicher_bezug ? abstand>=0 : null,
        ausserhalb_des_kontrollfensters:display_und_versorgung_gleicher_bezug ? abstand<0 || abstand>kontrollfenster_min : null,
        zeitabstand_min:display_und_versorgung_gleicher_bezug ? rounded(abstand):null,
        grenze:'Erste beobachtete Anzeige ist nicht die tatsächliche Startzeit des Geräts und zeigt keinen dokumentierten Wiederanlauf des Kompressors.'};
    }, {versorgung_min:250,display_min:285,kontrollfenster_min:25,display_und_versorgung_gleicher_bezug:true},
    {anzeige_beobachtet_nach_rueckkehr:true,ausserhalb_des_kontrollfensters:true,zeitabstand_min:35}),

  entry('gefrierschrank_stoerstunden_herstellerwert_scope',
    'Ordne die Herstellerangabe zur Störlagerung einer belegten oder offenen Ausfalldauer zu — Scope the documented holdover figure against the recorded outage duration',
    {
      genaues_modell:model('Genaue deutsche Modellkennung'),
      aus_unten_h:number('Untere Grenze der belegten Dauer in Stunden',0,168),
      aus_oben_h:number('Obere Grenze der belegten Dauer in Stunden',0,168),
      dauergrenzen_belegt:flag('Beide beobachteten Zeitgrenzen gelten für diesen einen Ausfall')
    }, ({genaues_modell,aus_unten_h,aus_oben_h,dauergrenzen_belegt}) => {
      if(aus_unten_h>aus_oben_h) throw new RangeError('Dauergrenzen prüfen.');
      const stunden={GSN33EWEV:9,GSN58DWDV:12}[genaues_modell] ?? null;
      const belegt=stunden!==null && dauergrenzen_belegt;
      return {technische_herstellerangabe_h:stunden,
        lage:!belegt?'offen':aus_unten_h>stunden?'dauer_ganz_oberhalb':aus_oben_h<stunden?'dauer_ganz_unterhalb':'angabe_im_zeitintervall',
        quelle_produktseite:stunden===null ? null : genaues_modell==='GSN33EWEV'
          ? 'https://www.bosch-home.com/de/de/product/kuehlen-gefrieren/gefrierschraenke/gefrierschraenke-freistehend/GSN33EWEV'
          : 'https://www.bosch-home.com/de/de/product/kundensortimente/GSN58DWDV',
        grenze:'Technische Zeitangabe aus der deutschen Produktseite, kein Messwert im eigenen Gerät und keine Entscheidung über Lebensmittelzustand oder Verzehr.'};
    }, {genaues_modell:'GSN33EWEV',aus_unten_h:7,aus_oben_h:11,dauergrenzen_belegt:true},
    {technische_herstellerangabe_h:9,lage:'angabe_im_zeitintervall'}),

  entry('gefrierschrank_no_frost_fachscope_nachweis',
    'Trenne die ausgewiesene automatische Entfrostung des Vier-Sterne-Fachs von beobachteten Feuchtespuren — Separate declared auto-defrost scope from observed frost or moisture',
    {
      genaues_modell:model('Genaue deutsche Modellkennung der geprüften Variante'),
      fundort:choice('Ort der tatsächlichen Beobachtung', 'vier_sterne_fach','dichtung','aussengehaeuse','unklar'),
      geraetewert_zugeschrieben:flag('Die Beobachtung wurde demselben Gerät und der aktiven Nutzung zugeordnet')
    }, ({genaues_modell,fundort,geraetewert_zugeschrieben}) => {
      const daten=models[genaues_modell];
      return {entfrostungsart_vier_sterne:daten ? 'automatisch' : 'offen',
        ort_im_deklarierten_fach:daten && geraetewert_zugeschrieben && fundort!=='unklar' ? fundort==='vier_sterne_fach' : null,
        quelle:source(daten),
        grenze:'Das EU-Feld zur Entfrostung trifft eine Aussage über das Fach. Es erklärt keine beobachtete Spur und erteilt keine Pflege- oder Reparaturfreigabe.'};
    }, {genaues_modell:'GSN58DWDV',fundort:'dichtung',geraetewert_zugeschrieben:true},
    {entfrostungsart_vier_sterne:'automatisch',ort_im_deklarierten_fach:false}),

  entry('gefrierschrank_schalllabel_kaufgrenze_gleicher_kenngruppe',
    'Filtere beide Gefrierschränke nach dem gewünschten Label-Schallleistungswert statt nur dem Klassenbuchstaben — Screen both freezer labels against a sound-power preference within one class',
    {
      maximum_lw_dba:number('Selbst gewählte Obergrenze für den Label-Schallleistungswert in dB(A) re 1 pW',0,120),
      vorgabebezug:choice('Bezugsgröße der eigenen Anforderung', 'label_luftschallleistung','schalldruck_im_raum','offen')
    }, ({maximum_lw_dba,vorgabebezug}) => ({
      belegt_in_gleicher_schallklasse:Object.values(models).every(daten=>daten.schallklasse==='C'),
      modelle_im_gewuenschten_labelbereich:vorgabebezug==='label_luftschallleistung' ?
        Object.entries(models).filter(([,daten])=>daten.schallleistung_dba<=maximum_lw_dba).map(([modell, daten])=>({modell,lw_dba:daten.schallleistung_dba,quelle:source(daten)})):null,
      grenze:'Vergleich deklarierter Schallleistung. Eine Klasse enthält verschiedene Werte; daraus folgt kein Pegel am Platz im Zimmer.'
    }), {maximum_lw_dba:38,vorgabebezug:'label_luftschallleistung'},
    {belegt_in_gleicher_schallklasse:true,modelle_im_gewuenschten_labelbereich:[
      {modell:'GSN58DWDV',lw_dba:38,quelle:{datenblatt_de:'https://media3.bsh-group.com/Documents/eudatasheet/de-DE/GSN58DWDV.pdf',datenblatt_stand:'2026-08-27'}}]}),

  entry('gefrierfach_ladungsversuch_gleichzeitige_ereignisse',
    'Trenne eine zusammenhängend belegte Ladungsphase von zusätzlicher Tür- und Wärmelast — Check whether a fresh-load energy observation remained isolated',
    {
      ladung_beginnt_min:minute('Beginn des beobachteten Beladens'),
      nachprobe_ende_min:minute('Ende des vorab geplanten Nachbeobachtungsfensters'),
      weitere_tuer_erste_min:minute('Erste weitere Türöffnung nach Beginn; 0 wenn keine erfasst'),
      raumereignis_min:minute('Erste getrennte Änderung der Wärmebelastung, 0 ohne beobachtete Änderung'),
      lueckenlose_beobachtung:flag('Tür- und Aufstellraumprotokoll liegen für das gesamte Fenster vor')
    }, ({ladung_beginnt_min,nachprobe_ende_min,weitere_tuer_erste_min,raumereignis_min,lueckenlose_beobachtung}) => {
      span(ladung_beginnt_min,nachprobe_ende_min);
      const innen=zeit=>zeit>0 && zeit>=ladung_beginnt_min && zeit<nachprobe_ende_min;
      const ereignisse=[innen(weitere_tuer_erste_min) && 'weitere_tuerphase',innen(raumereignis_min) && 'raumwaerme'].filter(Boolean);
      return {ausgewertete_stoereignisse:lueckenlose_beobachtung ? ereignisse:null,
        ladung_allein_dokumentiert:lueckenlose_beobachtung ? !ereignisse.length:null,
        grenze:'Fehlende Begleitmessung belegt keinen isolierten Verbrauch. Die Zuordnung beweist keinen Einfluss der Beladung.'};
    }, {ladung_beginnt_min:330,nachprobe_ende_min:510,weitere_tuer_erste_min:477,raumereignis_min:560,lueckenlose_beobachtung:true},
    {ausgewertete_stoereignisse:['weitere_tuerphase'],ladung_allein_dokumentiert:false}),

  entry('gefrierschrank_beleuchtung_beleg_entnahmezugang',
    'Kläre, ob die im EU-Datenblatt ausgewiesene Lichtquelle eine benötigte Sichtprüfung tatsächlich unterstützt — Scope declared freezer lighting to the observed drawer access task',
    {
      genaues_modell:model('Genaue deutsche Modellkennung'),
      sichtprobe:ready('Beleg im eigenen Ablauf, dass Beschriftung in der unteren Schublade bei geöffneter Tür lesbar war'),
      probebeleuchtung_passend:flag('Gleiche Raumbeleuchtung und gleiche Schubladenposition wie im geplanten Einsatz')
    }, ({genaues_modell,sichtprobe,probebeleuchtung_passend}) => ({
      lichtquelle_de_datenblatt:genaues_modell==='GSN58DWDV' ? 'led_klasse_g' : genaues_modell==='GSN33EWEV' ? 'nicht_ausgewiesen' : 'modell_offen',
      sichtaufgabe_belegt:probebeleuchtung_passend ? sichtprobe : 'offen',
      quelle:source(models[genaues_modell]),
      grenze:'Ein fehlender Fiche-Eintrag ist kein bestätigtes Fehlen einer Leuchte. Die Lichtquellenklasse ist keine Sichtprüfung am Platz.'
    }), {genaues_modell:'GSN58DWDV',sichtprobe:'ausgeschlossen',probebeleuchtung_passend:true},
    {lichtquelle_de_datenblatt:'led_klasse_g',sichtaufgabe_belegt:'ausgeschlossen'}),
];
