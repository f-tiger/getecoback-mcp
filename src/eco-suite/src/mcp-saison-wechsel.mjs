const n = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const select = (description, ...values) => ({type:'string', description, enum:values});
const page = slug => '/guide/' + slug + '.html';
const round = value => Number(value.toFixed(3));
const clock = description => n(description + ' Minuten seit Beginn des Planungstages, bei Bedarf über Mitternacht hinaus.', 0, 10080);
const duration = description => n(description + ' In Minuten.', 0, 2880);
const temp = description => n(description + ' In °C.', -25, 65);
const energy = description => n(description + ' In kWh.', 0, 1500);

export const saisonWechsel = [
  {
    name:'klimageraet_fruehjahrsstart_ruhezeit',
    description:'Den ersten Start der mobilen Klimaanlage nach der modellbezogenen Ruhezeit planen — Schedule a portable AC restart after the documented settling period.',
    page:page('mobile-klimaanlage-ueberwintern'),
    properties:{
      aufgestellt_min:clock('Wann stand das Gerät am Zielort in der vorgeschriebenen Position?'),
      start_geplant_min:clock('Gewünschte Startzeit.'),
      ruhezeit_min:duration('Ruhezeit aus der Anleitung für die konkrete Transportlage, bei fehlender Angabe 0 eintragen.'),
      vorgabe_bekannt:flag('Liegt eine eindeutige Modellvorgabe für diese Transportlage vor?'),
    },
    calculate({aufgestellt_min,start_geplant_min,ruhezeit_min,vorgabe_bekannt}) {
      const earliest=aufgestellt_min+ruhezeit_min;
      return {fruehestens_min:vorgabe_bekannt?earliest:null,aufschub_min:vorgabe_bekannt?Math.max(0,earliest-start_geplant_min):null,
        hinweis:'Zeitplanung für eine dokumentierte Ruhezeit. Die übrigen Prüfungen für den Saisonstart folgen der Anleitung. Ohne eindeutige Vorgabe zuerst beim Hersteller klären.'};
    },
    example:{args:{aufgestellt_min:480,start_geplant_min:720,ruhezeit_min:360,vorgabe_bekannt:true},expect:{fruehestens_min:840,aufschub_min:120}},
  },
  {
    name:'klima_herbst_trocknungsfenster_planen',
    description:'Den dokumentierten Trocknungslauf vor dem Transport in ein freies Herbst-Zeitfenster einplanen — Fit a documented end-of-season drying run before pick-up.',
    page:page('mobile-klimaanlage-ueberwintern'),
    properties:{
      fenster_ab:clock('Beginn des laut Anleitung nutzbaren Zeitfensters.'),
      abholung_min:clock('Geplanter Zeitpunkt des Transports oder Verpackens.'),
      trocknung_min:duration('Ununterbrochene Dauer laut Geräteanleitung.'),
      nachlauf_min:duration('Eigener Puffer für die anschließende Sichtkontrolle und übrigen Schritte.'),
      vorgabe_bekannt:flag('Sind Betriebsart und erforderliche Dauer für das genaue Modell belegt?'),
    },
    calculate({fenster_ab,abholung_min,trocknung_min,nachlauf_min,vorgabe_bekannt}) {
      if (abholung_min<fenster_ab) throw new RangeError('Zeitfenster');
      const latest=abholung_min-trocknung_min-nachlauf_min;
      return {spaetester_beginn_min:vorgabe_bekannt&&latest>=fenster_ab?latest:null,
        fehlender_puffer_min:vorgabe_bekannt?Math.max(0,fenster_ab-latest):null,
        hinweis:'Ein rechnerisches Zeitfenster bestätigt die Trocknung nicht. Prüfe den Zustand und befolge Betriebsart und Schritte der Modellanleitung vor dem Verpacken.'};
    },
    example:{args:{fenster_ab:480,abholung_min:1260,trocknung_min:720,nachlauf_min:45,vorgabe_bekannt:true},expect:{spaetester_beginn_min:495,fehlender_puffer_min:0}},
  },
  {
    name:'klima_abschalttimer_mitternacht',
    description:'Eine Zieluhrzeit nach Mitternacht in die Schritte eines relativen Abschalttimers umrechnen — Set a delay-based overnight switch-off timer at the nearest earlier supported step.',
    page:page('klimaanlage-nachts-laufen-lassen'),
    properties:{
      jetzt_min:n('Aktuelle Uhrzeit in Minuten seit Mitternacht.',0,1439),
      aus_uhr_min:n('Gewünschte Abschaltuhrzeit in Minuten seit Mitternacht. Ein früherer Wert meint den Folgetag.',0,1439),
      schritt_min:n('Abstand der verfügbaren Timer-Einstellungen in Minuten.',1,120),
      maximum_min:n('Größte in der Anleitung erlaubte Einstellung in Minuten.',1,1440),
    },
    calculate({jetzt_min,aus_uhr_min,schritt_min,maximum_min}) {
      if (![jetzt_min,aus_uhr_min,schritt_min,maximum_min].every(Number.isInteger)) throw new RangeError('Minuten');
      const wanted=(aus_uhr_min-jetzt_min+1440)%1440;
      const delay=Math.floor(Math.min(wanted,maximum_min)/schritt_min)*schritt_min;
      return {timer_min:delay||null,minuten_vor_wunsch:wanted-delay,
        hinweis:'Für einen Abschalttimer mit gleichmäßigen Schritten ab sofort. 0 bedeutet keine positive passende Einstellung. Keine Berechnung für eine eingebaute absolute Schaltuhr.'};
    },
    example:{args:{jetzt_min:1380,aus_uhr_min:110,schritt_min:30,maximum_min:480},expect:{timer_min:150,minuten_vor_wunsch:20}},
  },
  {
    name:'mobilklima_zweiraum_folgeplan',
    description:'Ein vorhandenes Mobilgerät vor zwei aufeinanderfolgenden Raumterminen einplanen — Check when one portable unit can serve two rooms in a fixed sequence.',
    page:page('mobile-klimaanlage-vergleich'),
    properties:{
      erster_termin_min:clock('Zeitpunkt, für den der erste Raum vorbereitet sein soll.'),
      zweiter_termin_min:clock('Zeitpunkt für den zweiten Raum.'),
      erste_phase_min:duration('Vor Ort gemessene Kühlzeit bis zum selbst gesetzten Ziel in Raum 1.'),
      zweite_phase_min:duration('Entsprechende, separat gemessene Zeit in Raum 2.'),
      wechsel_min:duration('Realer Wechselaufwand inklusive der laut Anleitung nötigen Schritte.'),
    },
    calculate({erster_termin_min,zweiter_termin_min,erste_phase_min,zweite_phase_min,wechsel_min}) {
      if (zweiter_termin_min<erster_termin_min) throw new RangeError('Terminreihenfolge');
      const first=erster_termin_min-erste_phase_min;
      return {beginn_raum_eins_min:first>=0?first:null,fristreserve_raum_zwei_min:zweiter_termin_min-erster_termin_min-wechsel_min-zweite_phase_min,
        hinweis:'Raum 1 bleibt bis zum ersten Termin eingeplant. Eine negative Reserve bedeutet Überlappung im Plan. Gemessene Zeiten gelten für ähnliche Ausgangsbedingungen und Anleitungskonformität bleibt separat zu prüfen.'};
    },
    example:{args:{erster_termin_min:1140,zweiter_termin_min:1290,erste_phase_min:90,zweite_phase_min:90,wechsel_min:30},expect:{beginn_raum_eins_min:1050,fristreserve_raum_zwei_min:30}},
  },
  {
    name:'schlafzimmer_kuehlpause_reserve',
    description:'Aus einer gemessenen Wiedererwärmung abschätzen, wie lange die Kühlpause unter deinem Temperaturziel bleibt — Estimate the remaining off-period before a chosen indoor temperature is reached.',
    page:page('bei-hitze-schlafen'),
    properties:{
      beim_abschalten_c:temp('Gemessene Raumtemperatur am Anfang des Versuchs.'),
      spaeter_c:temp('Gemessene Raumtemperatur am Ende der Kühlpause.'),
      messdauer_min:n('Dauer der beobachteten Kühlpause in Minuten.',1,720),
      ziel_c:temp('Persönliche Komfortmarke.'),
      geplante_pause_min:duration('Geplante Kühlauszeit unter vergleichbaren Bedingungen.'),
    },
    calculate({beim_abschalten_c,spaeter_c,messdauer_min,ziel_c,geplante_pause_min}) {
      const warmup=(spaeter_c-beim_abschalten_c)/messdauer_min;
      const crossing=ziel_c<=beim_abschalten_c?0:warmup>0?(ziel_c-beim_abschalten_c)/warmup:null;
      return {ziel_erreicht_nach_min:crossing===null?null:round(crossing),restpause_min:crossing===null?null:round(crossing-geplante_pause_min),
        hinweis:'Lineare Abschätzung aus genau einer Pause mit vergleichbarer Belegung und Außenbedingungen. Null Reserve ist kein medizinischer oder sicherheitstechnischer Grenzwert.'};
    },
    example:{args:{beim_abschalten_c:24,spaeter_c:26,messdauer_min:90,ziel_c:27,geplante_pause_min:120},expect:{ziel_erreicht_nach_min:135,restpause_min:15}},
  },
  {
    name:'klima_nachtregime_ziel_und_verbrauch',
    description:'Timer und durchgehenden Betrieb anhand gemessener Energie und Zielzeit vergleichen — Choose the least energy-intensive observed night regime that met your coverage requirement.',
    page:page('klimaanlage-nachts-laufen-lassen'),
    properties:{
      timer_kwh:energy('Gemessener Verbrauch für die ganze Timernacht.'),
      dauerhaft_kwh:energy('Gemessener Verbrauch für die Vergleichsnacht mit Dauerprogramm.'),
      timer_ziel_min:duration('Minuten am selbst gesetzten Temperaturziel während der Timernacht.'),
      dauerhaft_ziel_min:duration('Entsprechende Minuten in der Vergleichsnacht.'),
      mindest_ziel_min:duration('Gewünschte Mindestzahl dieser Minuten.'),
      vergleichbar:flag('Gleiche Messdauer, ähnliche Start- und Außenbedingungen und identische Zieldefinition?'),
    },
    calculate({timer_kwh,dauerhaft_kwh,timer_ziel_min,dauerhaft_ziel_min,mindest_ziel_min,vergleichbar}) {
      const allowed=[];
      if (vergleichbar&&timer_ziel_min>=mindest_ziel_min) allowed.push(['timer',timer_kwh]);
      if (vergleichbar&&dauerhaft_ziel_min>=mindest_ziel_min) allowed.push(['dauerprogramm',dauerhaft_kwh]);
      allowed.sort((a,b)=>a[1]-b[1]);
      const winner=allowed.length===2&&allowed[0][1]===allowed[1][1]?'gleichauf':allowed[0]?.[0]??null;
      return {beobachteter_verbrauchssieger:winner,gemessene_abweichung_kwh:vergleichbar?round(dauerhaft_kwh-timer_kwh):null,
        hinweis:'Vergleich zweier dokumentierter Nächte. Verwende Minuten mit derselben Komfortdefinition. Ergebnis ist weder Verbrauchsgarantie noch Freigabe für Dauerbetrieb.'};
    },
    example:{args:{timer_kwh:1.1,dauerhaft_kwh:2.1,timer_ziel_min:220,dauerhaft_ziel_min:480,mindest_ziel_min:250,vergleichbar:true},expect:{beobachteter_verbrauchssieger:'dauerprogramm',gemessene_abweichung_kwh:1}},
  },
  {
    name:'ventilator_wochenbudget_nachtmix',
    description:'Aus zwei gemessenen Nachtprofilen berechnen, wie viele intensivere Nächte in dein Wochenbudget passen — Allocate stronger fan nights while reserving the measured baseline for every night.',
    page:page('ventilator-stromverbrauch'),
    properties:{
      naechte:n('Anzahl der betroffenen Nächte.',1,31),
      ruhige_nacht_kwh:energy('Gemessene Energie für das sparsamere, persönlich ausreichende Lüfterprofil.'),
      starke_nacht_kwh:energy('Gemessene Energie für das intensivere Lüfterprofil.'),
      budget_kwh:energy('Eigenes Energie-Budget für alle Nächte.'),
    },
    calculate({naechte,ruhige_nacht_kwh,starke_nacht_kwh,budget_kwh}) {
      if (!Number.isInteger(naechte)||starke_nacht_kwh<=ruhige_nacht_kwh) throw new RangeError('Profile');
      const surplus=budget_kwh-naechte*ruhige_nacht_kwh;
      return {basisbudget_erfuellt:surplus>=-1e-9,
        maximal_starke_naechte:surplus< -1e-9?null:Math.min(naechte,Math.floor(surplus/(starke_nacht_kwh-ruhige_nacht_kwh)+1e-9)),
        hinweis:'Jede Nacht behält mindestens das gemessene Basisprofil. Nur bei vergleichbarer Dauer und Einstellung auf den Zeitraum übertragbar.'};
    },
    example:{args:{naechte:7,ruhige_nacht_kwh:0.2,starke_nacht_kwh:0.5,budget_kwh:2.3},expect:{maximal_starke_naechte:3}},
  },
  {
    name:'wechselzeit_heiz_kuehl_schaltung',
    description:'Für einen Frühjahrs- oder Herbsttag den Abstand zwischen Heiz- und Kühlgrenzen und die daraus folgenden Messentscheidungen prüfen — Classify a mild-season morning, noon and evening against your chosen mode boundaries.',
    page:page('klimaanlage-mit-heizfunktion'),
    properties:{
      heizen_unter_c:temp('Eigene Grenze für Heizbedarf.'),
      kuehlen_ueber_c:temp('Eigene Grenze für Kühlbedarf.'),
      morgens_c:temp('Gemessene Raumtemperatur am Morgen.'),
      mittags_c:temp('Gemessene Raumtemperatur am Mittag.'),
      abends_c:temp('Gemessene Raumtemperatur am Abend.'),
    },
    calculate({heizen_unter_c,kuehlen_ueber_c,morgens_c,mittags_c,abends_c}) {
      const gap=kuehlen_ueber_c-heizen_unter_c;
      const modes=gap<0?null:[morgens_c,mittags_c,abends_c].map(t=>t<heizen_unter_c?'heizbedarf':t>kuehlen_ueber_c?'kuehlbedarf':'neutral');
      return {neutrale_spanne_c:round(gap),ueberlappende_anforderungen:gap<0,bedarf_morgen_mittag_abend:modes,
        hinweis:'Drei Stichproben und selbst gewählte Grenzen. Kein tatsächlicher Schaltplan. Automatik, Modusverfügbarkeit und Mindestpausen nach Hersteller prüfen.'};
    },
    example:{args:{heizen_unter_c:20,kuehlen_ueber_c:25,morgens_c:18,mittags_c:26,abends_c:22},expect:{neutrale_spanne_c:5,bedarf_morgen_mittag_abend:['heizbedarf','kuehlbedarf','neutral']}},
  },
  {
    name:'thermostat_ferienprogramm_rueckkehr',
    description:'Ein dokumentiertes Abwesenheitsende mit der gemessenen Anlaufzeit vor der Rückkehr abgleichen — Identify a recovery shortfall around holiday mode and the first scheduled heating period.',
    page:page('smarte-heizkoerperthermostate-lohnen-sich'),
    properties:{
      heimkehr_min:clock('Geplante Rückkehr im gleichen Zeitbezug.'),
      urlaub_ende_min:clock('Zeitpunkt, zu dem der Abwesenheitsmodus endet.'),
      erster_heizblock_min:clock('Beginn der ersten Heizphase im normalen Plan.'),
      beobachteter_vorlauf_min:duration('In vergleichbarem Wetter beobachtete Vorlaufzeit nach dem Abwesenheitsbetrieb.'),
      modusfreigabe_bekannt:flag('Die Heizung startet nach Urlaubsende frühestens mit dem nächsten regulären Heizblock laut Geräteeinstellung?'),
    },
    calculate({heimkehr_min,urlaub_ende_min,erster_heizblock_min,beobachteter_vorlauf_min,modusfreigabe_bekannt}) {
      const effective=Math.max(urlaub_ende_min,erster_heizblock_min);
      const latest=heimkehr_min-beobachteter_vorlauf_min;
      return {spaetester_heizstart_min:latest>=0?latest:null,effektiver_heizstart_min:modusfreigabe_bekannt?effective:null,
        vorlauf_fehlt_min:modusfreigabe_bekannt?Math.max(0,effective-latest):null,
        hinweis:'Modell für diese konkrete Programmlogik. Für automatische Wiederaufnahme, abweichenden Kalender oder Wetterbedingungen die Anleitung und tatsächlichen Einstellungen prüfen.'};
    },
    example:{args:{heimkehr_min:1080,urlaub_ende_min:900,erster_heizblock_min:1020,beobachteter_vorlauf_min:120,modusfreigabe_bekannt:true},expect:{effektiver_heizstart_min:1020,vorlauf_fehlt_min:60}},
  },
  {
    name:'thermostat_fensterpause_verzoegerung',
    description:'Beim Stoßlüften modellieren, wie lange eine beobachtete Thermostatpause nach Fensterschluss noch dauert — Compare a measured ventilation stop with a documented fixed thermostat pause.',
    page:page('smarte-heizkoerperthermostate-lohnen-sich'),
    properties:{
      lueftung_min:duration('Zeit mit offenem Fenster.'),
      erkennung_min:duration('Beobachtete Zeit zwischen Öffnen und Beginn der Pause.'),
      feste_pause_min:duration('In der Anleitung oder Einstellung dokumentierte feste Pausendauer ab Erkennung.'),
      feste_pause:flag('Die Pause endet ausschließlich nach dieser festen Laufzeit, ohne automatische Reaktion auf das Schließen?'),
    },
    calculate({lueftung_min,erkennung_min,feste_pause_min,feste_pause}) {
      const triggered=erkennung_min<lueftung_min;
      const end=erkennung_min+feste_pause_min;
      return {pause_nach_schliessen_min:feste_pause?(triggered?Math.max(0,end-lueftung_min):0):null,
        fenster_offen_nach_pauseschluss_min:feste_pause?(triggered?Math.max(0,lueftung_min-end):lueftung_min):null,
        hinweis:'Modell für genau eine feste, bereits bestätigte Gerätefunktion. Erkennung, Neustarts und variable Pausen allgemeiner Modelle lassen sich daraus nicht ableiten.'};
    },
    example:{args:{lueftung_min:7,erkennung_min:2,feste_pause_min:20,feste_pause:true},expect:{pause_nach_schliessen_min:15}},
  },
  {
    name:'heizkoerper_saison_warmefreigabe_pruefen',
    description:'Beim Herbststart den ersten Heizbedarf mit der zentralen Wärmeanforderung abgleichen — Trace the first heating demand through known room and central controls.',
    page:page('heizkoerper-wird-nicht-warm'),
    properties:{
      raum_fordert:flag('Meldet der Raumregler gerade Heizbedarf?'),
      anlage_freigabe:select('Beobachteter Status der zentralen Heizfunktion.','heizbetrieb_freigegeben','noch_sommer','unbekannt'),
      zentralanforderung:select('Was zeigt die zugängliche zentrale Steuerung zur Wärmeanforderung?','angefordert','nicht_angefordert','unbekannt'),
    },
    calculate({raum_fordert,anlage_freigabe,zentralanforderung}) {
      let next='warmelieferung_und_regelung_protokollieren';
      if (!raum_fordert) next='raumprogramm_und_sollwert_pruefen';
      else if (anlage_freigabe==='noch_sommer') next='saisonumschaltung_abklaeren';
      else if (anlage_freigabe==='unbekannt') next='zentralen_betriebsmodus_erfragen';
      else if (zentralanforderung!=='angefordert') next='zentrale_anforderung_pruefen';
      return {naechster_pruefpunkt:next,
        hinweis:'Gliedert Beobachtungen an zugänglichen Bedienelementen. Keine Ferndiagnose von Ventil oder Heizkreis. In Mietobjekten kann die Gebäudeanlage getrennt gesteuert sein.'};
    },
    example:{args:{raum_fordert:true,anlage_freigabe:'noch_sommer',zentralanforderung:'nicht_angefordert'},expect:{naechster_pruefpunkt:'saisonumschaltung_abklaeren'}},
  },  {
    name:'kwl_winter_rueckwaerme_messquote',
    description:'Die beobachtete zuluftseitige Temperaturänderung der Wohnraumlüftung im Winter einordnen — Estimate an apparent single-point supply-air heat-recovery ratio.',
    page:page('unterschied-klimaanlage-lueftungsanlage'),
    properties:{
      aussen_c:temp('Temperatur der eintretenden Außenluft.'),
      abluft_c:temp('Temperatur der aus den Räumen eintretenden Abluft.'),
      zuluft_c:temp('Temperatur der Zuluft nach dem Wärmetauscher.'),
      stabil_ohne_zusatz:flag('Stabiler Betrieb mit aktiver Rückgewinnung, ohne Zusatzheizung, Frostschutzumschaltung oder offenen Bypass?'),
    },
    calculate({aussen_c,abluft_c,zuluft_c,stabil_ohne_zusatz}) {
      const range=abluft_c-aussen_c;
      const usable=stabil_ohne_zusatz&&range>0&&zuluft_c>=aussen_c&&zuluft_c<=abluft_c;
      return {messquote_prozent:usable?round(100*(zuluft_c-aussen_c)/range):null,
        hinweis:'Reine Zuluft-Temperaturquote an einem Betriebspunkt. Keine Leistungs-, Wirkungsgrad- oder Jahresersparniszusage. Bei kleinen Temperaturabständen wirken Messfehler besonders stark.'};
    },
    example:{args:{aussen_c:0,abluft_c:20,zuluft_c:15,stabil_ohne_zusatz:true},expect:{messquote_prozent:75}},
  },
  {
    name:'kwl_sommerbypass_kuehlgewinn_probe',
    description:'Bei aktiver Nachtlüftung die gemessene Zuluft mit offenem und geschlossenem Sommer-Bypass vergleichen — Compare matched summer bypass supply temperatures against a personal target.',
    page:page('unterschied-klimaanlage-lueftungsanlage'),
    properties:{
      zu_offen_c:temp('Zulufttemperatur bei offen bestätigtem Bypass.'),
      zu_geschlossen_c:temp('Zulufttemperatur bei geschlossen bestätigtem Bypass.'),
      zuluft_ziel_c:temp('Eigene gewünschte maximale Zulufttemperatur für den Vergleich.'),
      gleiche_bedingungen:flag('Gleiche Außentemperatur, Ablufttemperatur und Lüfterstufe, keine Zusatzkühlung?'),
    },
    calculate({zu_offen_c,zu_geschlossen_c,zuluft_ziel_c,gleiche_bedingungen}) {
      return {gemessene_zuluftsenkung_c:gleiche_bedingungen?round(zu_geschlossen_c-zu_offen_c):null,
        ziel_mit_bypass_beobachtet:gleiche_bedingungen?zu_offen_c<=zuluft_ziel_c:null,
        hinweis:'Ergibt den Unterschied am Messpunkt. Der Bypass ist keine aktive Kühlung. Der Luftwechselbedarf und die bestimmungsgemäße Lüftung bleiben separat.'};
    },
    example:{args:{zu_offen_c:19,zu_geschlossen_c:23,zuluft_ziel_c:20,gleiche_bedingungen:true},expect:{gemessene_zuluftsenkung_c:4,ziel_mit_bypass_beobachtet:true}},
  },
  {
    name:'keller_sommer_lueften_messfenster',
    description:'Aus drei gleichmäßig aufgenommenen Außenmessungen konservativ Zeitabschnitte für eine Kellerlüftungsprobe markieren — Select observed summer basement airing windows from absolute humidity and sensor uncertainty.',
    page:page('keller-lueften-sommer'),
    properties:{
      keller_g_m3:n('Gemessene absolute Feuchte im Keller in g/m³.',0,50),
      aussen_anfang_g_m3:n('Erste Außenprobe in g/m³.',0,50),
      aussen_mitte_g_m3:n('Zweite Außenprobe in g/m³.',0,50),
      aussen_ende_g_m3:n('Dritte Außenprobe in g/m³.',0,50),
      intervall_min:n('Gleicher Zeitraum zwischen aufeinanderfolgenden Proben in Minuten.',1,180),
      unsicherheit_g_m3:n('Gemeinsamer oberer Schätzfehler für die Differenz Außen minus Innen.',0,15),
    },
    calculate({keller_g_m3,aussen_anfang_g_m3,aussen_mitte_g_m3,aussen_ende_g_m3,intervall_min,unsicherheit_g_m3}) {
      const max=keller_g_m3-unsicherheit_g_m3;
      const series=[aussen_anfang_g_m3,aussen_mitte_g_m3,aussen_ende_g_m3];
      const intervals=series.slice(1).map((end,i)=>end<max&&series[i]<max);
      return {intervalle_mit_trockeneren_endpunkten:intervals,markierte_minuten:intervals.filter(Boolean).length*intervall_min,
        hinweis:'Markiert zurückliegende Intervalle nur nach den gemessenen Endpunkten; Feuchtespitzen dazwischen und kalte Oberflächen bleiben unbekannt. Vor späterem Lüften neu messen.'};
    },
    example:{args:{keller_g_m3:10,aussen_anfang_g_m3:7,aussen_mitte_g_m3:8,aussen_ende_g_m3:11,intervall_min:30,unsicherheit_g_m3:1},expect:{intervalle_mit_trockeneren_endpunkten:[true,false],markierte_minuten:30}},
  },
  {
    name:'entfeuchter_mindestpause_zeitplan',
    description:'Eine Wiederanlaufpause des Entfeuchters gegen das nächste begrenzte Betriebsfenster rechnen — Schedule the next dehumidification interval using the exact documented restart delay.',
    page:page('luftentfeuchter-dauerbetrieb-stromkosten'),
    properties:{
      zuletzt_aus_min:clock('Zeitpunkt des letzten Stopps.'),
      fenster_ab:clock('Beginn des Verfügbarkeitsfensters.'),
      fenster_bis:clock('Ende des Verfügbarkeitsfensters.'),
      wiederanlaufpause_min:duration('Nachgewiesene Mindestpause für den konkreten Betriebszustand.'),
      pause_bekannt:flag('Ist die Restart-Regel für dieses Gerät und diese Betriebsart dokumentiert?'),
    },
    calculate({zuletzt_aus_min,fenster_ab,fenster_bis,wiederanlaufpause_min,pause_bekannt}) {
      if (fenster_bis<fenster_ab) throw new RangeError('Zeitfenster');
      const start=Math.max(fenster_ab,zuletzt_aus_min+wiederanlaufpause_min);
      return {naechster_start_im_fenster_min:pause_bekannt&&start<fenster_bis?start:null,
        nutzbares_fenster_min:pause_bekannt?Math.max(0,fenster_bis-start):null,
        hinweis:'Arithmetik für ein nachgewiesenes Zeitfenster. Keine Vorgabe für Pause, automatische Wiederaufnahme oder externe Zeitschalter. Schutzfunktionen nicht umgehen.'};
    },
    example:{args:{zuletzt_aus_min:590,fenster_ab:600,fenster_bis:620,wiederanlaufpause_min:15,pause_bekannt:true},expect:{naechster_start_im_fenster_min:605,nutzbares_fenster_min:15}},
  },
  {
    name:'entfeuchtung_rueckkehr_nach_pause',
    description:'Aus drei absoluten Feuchteproben den Anteil der Entfeuchtungswirkung bestimmen, der nach einer Gerätepause zurückgegangen ist — Report moisture rebound after a documented drying interval.',
    page:page('luftentfeuchter-ratgeber'),
    properties:{
      davor_g_m3:n('Absolute Feuchte vor dem Entfeuchten, in g/m³.',0,60),
      stop_g_m3:n('Absolute Feuchte am Ende der Entfeuchtung, in g/m³.',0,60),
      danach_g_m3:n('Absolute Feuchte am Ende der anschließenden Pause, in g/m³.',0,60),
      zeit_seit_stop_min:n('Abstand zwischen Abschalten und letzter Probe in Minuten.',1,1440),
      messung_vergleichbar:flag('Alle Proben am selben repräsentativen Messort, mit bewusst dokumentierter Nutzung und Fensterstellung?'),
    },
    calculate({davor_g_m3,stop_g_m3,danach_g_m3,zeit_seit_stop_min,messung_vergleichbar}) {
      const drop=davor_g_m3-stop_g_m3;
      return {wiederanstieg_g_m3:messung_vergleichbar?round(danach_g_m3-stop_g_m3):null,
        wirkung_zurueck_prozent:messung_vergleichbar&&drop>0?round(100*(danach_g_m3-stop_g_m3)/drop):null,beobachtungszeit_min:zeit_seit_stop_min,
        hinweis:'Ein negativer Anteil zeigt weiteres Absinken; über 100 % liegt die letzte Probe höher als die erste. Wasser aus Flächen, Luftwechsel und neue Quellen können beteiligt sein.'};
    },
    example:{args:{davor_g_m3:12,stop_g_m3:8,danach_g_m3:10,zeit_seit_stop_min:90,messung_vergleichbar:true},expect:{wirkung_zurueck_prozent:50,wiederanstieg_g_m3:2}},
  },
  {
    name:'keller_entfeuchter_saisonstunden_abdeckung',
    description:'Erfasste Kellerstunden nach einem bestätigten unteren Einsatztemperaturwert einordnen — Estimate how much of a sampled cold-season dehumidification window falls within the documented temperature range.',
    page:page('luftentfeuchter-keller'),
    properties:{
      anleitung_min_c:temp('Bestätigte untere Einsatztemperatur des konkreten Geräts.'),
      anleitung_max_c:temp('Bestätigte obere Einsatztemperatur.'),
      kuehl_c:temp('Temperatur im kühlen protokollierten Zeitblock.'),
      kuelldauer_h:n('Dauer des kühlen Zeitblocks in Stunden.',0,744),
      mild_c:temp('Temperatur im milderen protokollierten Zeitblock.'),
      milddauer_h:n('Dauer des milden Zeitblocks in Stunden.',0,744),
      grenzen_bekannt:flag('Beide Einsatzgrenzen wurden für die Gerätevariante nachgewiesen?'),
    },
    calculate({anleitung_min_c,anleitung_max_c,kuehl_c,kuelldauer_h,mild_c,milddauer_h,grenzen_bekannt}) {
      if (anleitung_min_c>anleitung_max_c) throw new RangeError('Einsatzgrenzen');
      const total=kuelldauer_h+milddauer_h;
      const within=(value,hours)=>value>=anleitung_min_c&&value<=anleitung_max_c?hours:0;
      const covered=within(kuehl_c,kuelldauer_h)+within(mild_c,milddauer_h);
      return {abgedeckte_stunden:grenzen_bekannt?round(covered):null,anteil_prozent:grenzen_bekannt&&total>0?round(100*covered/total):null,
        hinweis:'Temperaturprüfung für zwei beobachtete Zeitblöcke. Der zugelassene Bereich sagt nichts über Entfeuchtungsleistung, Frostzyklen, Luftfeuchte oder den konkreten Aufstellort aus.'};
    },
    example:{args:{anleitung_min_c:10,anleitung_max_c:32,kuehl_c:8,kuelldauer_h:18,mild_c:13,milddauer_h:6,grenzen_bekannt:true},expect:{abgedeckte_stunden:6,anteil_prozent:25}},
  },
  {
    name:'luftreiniger_zweistufen_aussenluftvergleich',
    description:'Für hohen Vorlauf und leiseren Weiterbetrieb das äquivalente Partikelfiltervolumen getrennt von der Außenluftbilanz berechnen — Estimate the clean-air contribution of a high and a quiet filter phase without counting fresh air.',
    page:page('luftreiniger-ratgeber'),
    properties:{
      vorlauf_cadr:n('Bestätigter CADR der hohen Stufe in m³/h.',0,3000),
      vorlauf_min:duration('Dauer der hohen Stufe.'),
      leise_cadr:n('Bestätigter CADR der leisen Stufe in m³/h.',0,3000),
      leise_min:duration('Dauer der leisen Stufe.'),
      raum_m3:n('Raumvolumen in m³.',1,3000),
    },
    calculate({vorlauf_cadr,vorlauf_min,leise_cadr,leise_min,raum_m3}) {
      const front=vorlauf_cadr*vorlauf_min/60;
      const quiet=leise_cadr*leise_min/60;
      return {filtervolumen_vorlauf_m3:round(front),filtervolumen_leise_m3:round(quiet),
        gesamte_filtrationsdosis_raumvolumen:round((front+quiet)/raum_m3),
        hinweis:'Integrierte äquivalente Reinluftmenge aus zwei CADR-Angaben; kein Austausch mit Frischluft und keine Vorhersage eines individuellen Partikelwerts. Aufstellung und Nachschub fehlen.'};
    },
    example:{args:{vorlauf_cadr:300,vorlauf_min:20,leise_cadr:90,leise_min:40,raum_m3:40},expect:{filtervolumen_vorlauf_m3:100,filtervolumen_leise_m3:60,gesamte_filtrationsdosis_raumvolumen:4}},
  },
  {
    name:'klima_lueftung_aufgaben_uebergabe',
    description:'Beim Wechsel zur Umluftkühlung erkennen, ob für die Frischluftaufgabe ein eigener Plan bleibt — Identify missing outdoor-air provision after switching to recirculating cooling.',
    page:page('unterschied-klimaanlage-lueftungsanlage'),
    properties:{
      luftwechsel:select('Wie ist der beabsichtigte Frischluftaustausch eingeplant?','fensterzeit','eigene_lueftungsanlage','kein_plan'),
      kuehlart:select('Was bestätigt die Anleitung zum Kühlgerät?','umlufteinheit','aussenluftanteil_ohne_nachweis','unbekannt'),
      lueftungsprofil_geaendert:flag('Wird das bisherige Frischluftprofil beim Saisonwechsel reduziert oder beendet?'),
    },
    calculate({luftwechsel,kuehlart,lueftungsprofil_geaendert}) {
      const gap=luftwechsel==='kein_plan'||lueftungsprofil_geaendert;
      return {frischluftaufgabe_neu_abgleichen:gap,
        kuehlgeraet_als_lueftungsnachweis:false,geraeteangabe_unsicher:kuehlart==='unbekannt',
        hinweis:'Umluftkühlung belegt keinen Außenluftaustausch. Ordnet die beiden Aufgaben getrennt zu; keine Aussage über erforderlichen Luftwechsel, Anlagefreigabe oder Luftqualität.'};
    },
    example:{args:{luftwechsel:'eigene_lueftungsanlage',kuehlart:'umlufteinheit',lueftungsprofil_geaendert:true},expect:{frischluftaufgabe_neu_abgleichen:true,kuehlgeraet_als_lueftungsnachweis:false}},
  },  {
    name:'thermostat_uebergang_zeitplan_umgehung',
    description:'Einen beim Saisonwechsel ignorierten Zeitplan anhand der am Thermostat sichtbaren Betriebsart eingrenzen — Distinguish manual overrides and automation rules from a normal scheduled setpoint.',
    page:page('smarte-heizkoerperthermostate-lohnen-sich'),
    properties:{
      anzeige:select('Was zeigt die Steuerung jetzt am Gerät oder in der installierten App?','manuell','zeitplan','urlaub','unbekannt'),
      soll_plan_c:temp('Solltemperatur, die im regulären Zeitplan jetzt steht.'),
      soll_aktiv_c:temp('Jetzt am Gerät angezeigte Solltemperatur.'),
      automation_aktiv:flag('Zusätzliches Zeitprogramm oder Automatisierung im Hub aktiv?'),
    },
    calculate({anzeige,soll_plan_c,soll_aktiv_c,automation_aktiv}) {
      const different=soll_plan_c!==soll_aktiv_c;
      const next=!different?'kein_abweichender_sollwert':anzeige==='manuell'||anzeige==='urlaub'?'aktiven_modus_pruefen':
        automation_aktiv?'hub_regeln_und_prioritaet_pruefen':'aktives_profil_und_geraeteuhr_pruefen';
      return {abweichung_soll_c:round(soll_aktiv_c-soll_plan_c),naechster_pruefpunkt:next,
        hinweis:'Vergleicht Sollwerte, nicht gemessene Raumtemperatur. Ob eine Priorität tatsächlich greift, folgt aus Gerät und Systemkonfiguration.'};
    },
    example:{args:{anzeige:'zeitplan',soll_plan_c:20,soll_aktiv_c:17,automation_aktiv:true},expect:{abweichung_soll_c:-3,naechster_pruefpunkt:'hub_regeln_und_prioritaet_pruefen'}},
  },
  {
    name:'raeumzeit_profil_thermostat_kalenderwechsel',
    description:'Erkennen, wie viel der veränderten Belegungszeit nach einer Zeitplanumstellung außerhalb der Heizphase liegt — Compare changed workday occupancy with an existing scheduled heating interval.',
    page:page('heizkosten-senken-als-mieter'),
    properties:{
      nutzung_ab:clock('Beginn des neuen Anwesenheitsblocks.'),
      nutzung_bis:clock('Ende dieses Anwesenheitsblocks.'),
      heizblock_ab:clock('Beginn des bestehenden Komfortblocks.'),
      heizblock_bis:clock('Ende des bestehenden Komfortblocks.'),
    },
    calculate({nutzung_ab,nutzung_bis,heizblock_ab,heizblock_bis}) {
      if (nutzung_bis<nutzung_ab||heizblock_bis<heizblock_ab) throw new RangeError('Zeitfolge');
      const covered=Math.max(0,Math.min(nutzung_bis,heizblock_bis)-Math.max(nutzung_ab,heizblock_ab));
      return {nutzung_ausserhalb_min:nutzung_bis-nutzung_ab-covered,heizprofil_ausserhalb_min:heizblock_bis-heizblock_ab-covered,
        hinweis:'Zeitliche Überlappung zweier Blöcke, ohne thermische Trägheit. Für die wirkliche Zusatzlaufzeit Vorlauf, Raumtemperatur und vorhandene Regelung messen.'};
    },
    example:{args:{nutzung_ab:480,nutzung_bis:660,heizblock_ab:420,heizblock_bis:540},expect:{nutzung_ausserhalb_min:120,heizprofil_ausserhalb_min:60}},
  },
  {
    name:'heizdecke_saison_vorlauf_abschaltcheck',
    description:'Ein dokumentiertes Vorwärmprogramm mit gewünschtem Ende vor der Nutzung abgleichen — Verify whether a documented blanket preheat timer ends before the chosen use time.',
    page:page('heizdecke-stromverbrauch'),
    properties:{
      vorwaermen_ab:clock('Geplanter Beginn des Vorwärmprogramms.'),
      nutzung_ab:clock('Beginn der vorgesehenen Nutzung.'),
      abschaltzeit_min:duration('Für gewählte Funktion verifizierte automatische Abschaltdauer.'),
      ablauf_bekannt:flag('Dokumentiert die konkrete Anleitung dieses Vorwärmprogramm mit fester Abschaltung?'),
    },
    calculate({vorwaermen_ab,nutzung_ab,abschaltzeit_min,ablauf_bekannt}) {
      if (nutzung_ab<vorwaermen_ab) throw new RangeError('Zeiten');
      const end=vorwaermen_ab+abschaltzeit_min;
      return {dokumentiertes_programmende_min:ablauf_bekannt?end:null,restlauf_zur_nutzung_min:ablauf_bekannt?Math.max(0,end-nutzung_ab):null,
        hinweis:'Prüft die zeitliche Überdeckung bei dokumentierter Abschaltung. Keine Empfehlung zum Schlafbetrieb oder zu externen Schaltern. Zulässige Verwendung richtet sich nach der Anleitung.'};
    },
    example:{args:{vorwaermen_ab:1200,nutzung_ab:1260,abschaltzeit_min:45,ablauf_bekannt:true},expect:{dokumentiertes_programmende_min:1245,restlauf_zur_nutzung_min:0}},
  },
  {
    name:'ventilator_nacht_geraeuschprofil_kompromiss',
    description:'Zwei beobachtete Lüfterstufen für die Nacht anhand eigener Luftstrom- und Geräuschgrenzen filtern — Find which measured fan settings meet independently chosen air speed and sound criteria.',
    page:page('ventilator-nachts-schlafen'),
    properties:{
      a_luft_m_s:n('Luftgeschwindigkeit beim Liegeplatz in Stufe A.',0,15),
      b_luft_m_s:n('Luftgeschwindigkeit beim selben Liegeplatz in Stufe B.',0,15),
      a_dba:n('A-bewerteter Pegel am Liegeplatz bei Stufe A.',10,130),
      b_dba:n('A-bewerteter Pegel am Liegeplatz bei Stufe B.',10,130),
      mindestens_luft_m_s:n('Selbst gewählter Mindestluftstrom beim Liegeplatz.',0,15),
      hoechstens_dba:n('Selbst gewählte obere Geräuschmarke.',10,130),
      vergleichbar:flag('Gleicher Messort und ähnliche Raum- und Hintergrundbedingungen?'),
    },
    calculate({a_luft_m_s,b_luft_m_s,a_dba,b_dba,mindestens_luft_m_s,hoechstens_dba,vergleichbar}) {
      const fit=(air,sound)=>air>=mindestens_luft_m_s&&sound<=hoechstens_dba;
      return {stufen_am_eigenen_ziel:vergleichbar?[...(fit(a_luft_m_s,a_dba)?['a']:[]),...(fit(b_luft_m_s,b_dba)?['b']:[])]:null,
        hinweis:'Zwei persönliche Auswahlgrenzen, keine Gesundheits- oder Nachbarschaftsnorm. Geräuschmessung und Luftstrom erfassen keine Raumtemperaturänderung.'};
    },
    example:{args:{a_luft_m_s:0.25,b_luft_m_s:0.65,a_dba:31,b_dba:42,mindestens_luft_m_s:0.2,hoechstens_dba:35,vergleichbar:true},expect:{stufen_am_eigenen_ziel:['a']}},
  },
  {
    name:'raumklimageraet_modus_nach_strompause',
    description:'Nach einer beobachteten Stromunterbrechung den angezeigten Klimamodus, Sollwert und aktiven Timer protokollieren — Check which previously scheduled room-climate settings actually returned after an observed outage.',
    page:page('klimaanlage-nachts-laufen-lassen'),
    properties:{
      beobachtung_vorhanden:flag('Die Displays oder die reguläre App wurden vor und nach einer bereits geschehenen Unterbrechung abgelesen?'),
      modus_identisch:flag('Modus ist nach Unterbrechung so angezeigt wie vorher?'),
      sollwert_identisch:flag('Sollwert ist gleich angezeigt wie vorher?'),
      timer_aktiv:flag('Der zuvor gesetzte Timer wird nach der Unterbrechung mit dem erwarteten Zeitpunkt als aktiv angezeigt?'),
    },
    calculate({beobachtung_vorhanden,modus_identisch,sollwert_identisch,timer_aktiv}) {
      const misses=[];
      if (!modus_identisch) misses.push('modus');
      if (!sollwert_identisch) misses.push('sollwert');
      if (!timer_aktiv) misses.push('timer');
      return {abweichende_oder_fehlende_anzeigen:beobachtung_vorhanden?misses:null,
        hinweis:'Für eine bereits beobachtete Unterbrechung, nicht als Testanleitung. Anzeige belegt kein zukünftiges Startverhalten; automatische Wiederaufnahme und Betriebsbedingungen mit der Modellanleitung klären.'};
    },
    example:{args:{beobachtung_vorhanden:true,modus_identisch:true,sollwert_identisch:false,timer_aktiv:false},expect:{abweichende_oder_fehlende_anzeigen:['sollwert','timer']}},
  },];
