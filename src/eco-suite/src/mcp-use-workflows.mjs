const robot = '/guide/saugroboter-kaufberatung.html';
const wet = '/guide/saugwischer-kaufberatung.html';
const cold = '/guide/strom-sparen-haushalt.html';
const coldFit = '/geraete-austausch-rechner.html';
const workshop = '/familienwerkstatt.html';

const number = (description, minimum, maximum) => ({type:'number',description,minimum,maximum});
const flag = description => ({type:'boolean',description});
const choice = (description, ...values) => ({type:'string',description,enum:values});
const count = (description, maximum=100) => number(description,0,maximum);
const minutes = (description, maximum=1440) => number(description,0,maximum);
const cm = (description, maximum=1000) => number(description,0,maximum);
const round = value => Math.round(value*1000)/1000 || 0;
const integer = (...values) => {
  if (values.some(value=>!Number.isInteger(value))) throw new RangeError('Ganze Anzahl erforderlich');
};

export const useWorkflows = [
  {
    name:'saugroboter_kabelroute_vorbereiten',
    description:'Hindernisse am Boden vor dem geplanten Roboterlauf zuordnen — Route around unresolved cords and loose items before a robot run.',
    page:robot,
    properties:{
      lose_kabel:flag('Liegen noch lose Kabel im vorgesehenen Bereich?'),
      lose_kleinteile:flag('Liegen dort Kleinteile oder leicht mitziehbare Gegenstände?'),
      zone_ausschliessbar:flag('Lässt sich der betroffene Bereich nach Modellanleitung verlässlich aus dem Lauf ausnehmen?'),
    },
    calculate({lose_kabel,lose_kleinteile,zone_ausschliessbar}) {
      const items = [lose_kabel && 'kabel',lose_kleinteile && 'kleinteile'].filter(Boolean);
      return {
        offene_hindernisse:items,
        plan:items.length===0 ? 'strecke_vor_lauf_kontrollieren' : zone_ausschliessbar ? 'betroffenen_bereich_auslassen' : 'vor_dem_lauf_aufraeumen',
        hinweis:'Eine Sperrzone wirkt nur wie in der Modellanleitung beschrieben. Diese Prüfung ersetzt keine Beobachtung des Laufwegs und keine Absturzsicherung.',
      };
    },
    example:{args:{lose_kabel:true,lose_kleinteile:false,zone_ausschliessbar:false},expect:{offene_hindernisse:['kabel'],plan:'vor_dem_lauf_aufraeumen'}},
  },
  {
    name:'saugroboter_d10_wischmodul_nachlauf',
    description:'Nächsten Schritt zwischen Wischen und Laden beim Dreame D10 Plus Gen 2 prüfen — Check the documented mop removal and care sequence for the D10 Plus Gen 2.',
    page:robot,
    properties:{
      modell:choice('Modell laut Typenschild.','d10_plus_gen2','anderes','unbekannt'),
      modul_montiert:flag('Wischmodul noch eingesetzt?'),
      restwasser:flag('Restwasser befindet sich im Wischmodul?'),
      pad_gepflegt:flag('Pad ist gemäß Anleitung gewaschen und trocken?'),
    },
    calculate({modell,modul_montiert,restwasser,pad_gepflegt}) {
      if (modell!=='d10_plus_gen2') return {status:'genaue_modellanleitung_lesen',offen:[]};
      const offen = [modul_montiert && 'wischmodul_abnehmen',restwasser && 'restwasser_ausgiessen',
        !pad_gepflegt && 'pad_waschen_und_trocknen'].filter(Boolean);
      return {
        status:offen.length ? 'pflege_offen' : 'pflege_erfasst',offen,
        herstellerquelle:'https://dreametech.zendesk.com/hc/de/article_attachments/51078573935513',
        hinweis:'Die Vorgabe gilt für dieses Wischmodul und die genaue Generation. Die Absaugstation wäscht das Pad nicht.',
      };
    },
    example:{args:{modell:'d10_plus_gen2',modul_montiert:true,restwasser:true,pad_gepflegt:false},
      expect:{status:'pflege_offen',offen:['wischmodul_abnehmen','restwasser_ausgiessen','pad_waschen_und_trocknen']}},
  },
  {
    name:'saugroboter_absaugstation_beutelkontrolle',
    description:'Beutelfüllung und leeren Roboterbehälter nach dem Absaugen unterscheiden — Decide whether to inspect the bag or log an incomplete auto-empty.',
    page:robot,
    properties:{
      beutelsignal:choice('Beobachtung an der Station oder laut Anleitung.','voll','normal','unbekannt'),
      behaelter_leer:flag('Staubbehälter im Roboter nach dem Lauf augenscheinlich leer?'),
      absaugung_bestaetigt:flag('Vollständiger Absaugvorgang laut Anzeige oder eigener Beobachtung bestätigt?'),
    },
    calculate({beutelsignal,behaelter_leer,absaugung_bestaetigt}) {
      const status = beutelsignal==='voll' ? 'beutel_nach_anleitung_pruefen' :
        !absaugung_bestaetigt ? 'absaugvorgang_dokumentieren' :
          !behaelter_leer ? 'entleerungsproblem_dokumentieren' : 'beobachtung_unauffaellig';
      return {status,hinweis:'Die Absaugstation nimmt Beutel- und Behälterpflege nicht ab. Nur laut Anleitung zugängliche Teile kontrollieren. Eine Anzeige belegt keinen Teiledefekt.'};
    },
    example:{args:{beutelsignal:'normal',behaelter_leer:false,absaugung_bestaetigt:true},expect:{status:'entleerungsproblem_dokumentieren'}},
  },
  {
    name:'saugroboter_zonen_faelligkeit',
    description:'Fällige Raumreinigung für wiederkehrende Läufe aus deiner eigenen Taktung ableiten — Decide which zones are due under a household cleaning cadence.',
    page:robot,
    properties:{
      flur_tage:number('Vergangene Tage seit Kontrolle und Reinigung des Flurs.',0,3650),
      flur_intervall:number('Eigenes Prüfintervall für den Flur in Tagen.',1,365),
      wohnraum_tage:number('Vergangene Tage seit Kontrolle und Reinigung des Wohnraums.',0,3650),
      wohnraum_intervall:number('Eigenes Prüfintervall für Wohnräume in Tagen.',1,365),
    },
    calculate({flur_tage,flur_intervall,wohnraum_tage,wohnraum_intervall}) {
      const flur = Math.max(0,flur_intervall-flur_tage);
      const wohnraum = Math.max(0,wohnraum_intervall-wohnraum_tage);
      return {
        faellige_zonen:[flur===0 && 'flur',wohnraum===0 && 'wohnraum'].filter(Boolean),
        tage_bis_flur:round(flur),tage_bis_wohnraum:round(wohnraum),
        hinweis:'Die Wunschintervalle sind Planungseingaben. Vor Freigabe Fahrwege, Sperrzonen und aktuelle Verschmutzung kontrollieren.',
      };
    },
    example:{args:{flur_tage:4,flur_intervall:3,wohnraum_tage:5,wohnraum_intervall:7},
      expect:{faellige_zonen:['flur'],tage_bis_wohnraum:2}},
  },
  {
    name:'saugroboter_sensorhinweis_pflege',
    description:'Sensorhinweis von sichtbar verschmutzter zugänglicher Stelle trennen — Pick a manual-approved sensor care or support step after an alert.',
    page:robot,
    properties:{
      hinweis_erneut:flag('Derselbe Sensorhinweis trat nach korrekter zugelassener Pflege erneut auf?'),
      sichtbar_verschmutzt:flag('Die laut Anleitung zugängliche Sensorfläche ist sichtbar verschmutzt?'),
      pflege_dokumentiert:flag('Für diese Sensorfläche liegt eine Pflegemethode in der genauen Herstelleranleitung vor?'),
    },
    calculate({hinweis_erneut,sichtbar_verschmutzt,pflege_dokumentiert}) {
      const status = hinweis_erneut ? 'meldung_fuer_support_sichern' :
        sichtbar_verschmutzt && pflege_dokumentiert ? 'freigegebene_sensorpflege_pruefen' : 'modellhinweis_nachlesen';
      return {status,hinweis:'Bei unklarer Navigation den Bereich nicht weiter freigeben. Keine Sensoren abdecken, zerlegen oder durch Eigenversuche überlisten.'};
    },
    example:{args:{hinweis_erneut:true,sichtbar_verschmutzt:false,pflege_dokumentiert:true},expect:{status:'meldung_fuer_support_sichern'}},
  },
  {
    name:'saugroboter_restaufgaben_verteilen',
    description:'Nach Roboterlauf offen gebliebene Arbeiten für den nächsten manuellen Durchgang erfassen — Reserve separate work for stairs, edges and excluded flooring.',
    page:robot,
    properties:{
      treppen:flag('Treppen gehören zum Reinigungsziel?'),
      nicht_erreichbare_raender:flag('Sind sichtbare Ränder außerhalb der erreichbaren Roboterbahn offen?'),
      ausgeschlossene_belaege:flag('Sind Teppiche oder empfindliche Beläge aus der Roboterrunde ausgenommen?'),
    },
    calculate({treppen,nicht_erreichbare_raender,ausgeschlossene_belaege}) {
      return {
        manuelle_aufgaben:[treppen && 'treppen',nicht_erreichbare_raender && 'raender',ausgeschlossene_belaege && 'ausgeschlossene_belaege'].filter(Boolean),
        hinweis:'Sichtprüfung am Ende zählt. Für die verbleibenden Beläge geeignete Pflege nutzen. Ein Roboter reinigt keine Treppen.',
      };
    },
    example:{args:{treppen:true,nicht_erreichbare_raender:false,ausgeschlossene_belaege:true},
      expect:{manuelle_aufgaben:['treppen','ausgeschlossene_belaege']}},
  },
  {
    name:'saugroboter_staubbeutel_nutzungsplan',
    description:'Beutelwechsel an einer konkreten Roboterstation auf eigene Nutzungswochen umlegen — Estimate planned bag stock from observed runs per change.',
    page:robot,
    properties:{
      laeufe_pro_woche:count('Erwartete Läufe je Woche.',50),
      laeufe_je_beutel:number('Eigener beobachteter Durchschnitt an Läufen je Beutelwechsel.',1,1000),
      wochen:count('Betrachtungszeitraum in Wochen.',104),
      volle_beutel_vorhanden:count('Unbenutzte, bereits passende Beutel am Start.',200),
    },
    calculate({laeufe_pro_woche,laeufe_je_beutel,wochen,volle_beutel_vorhanden}) {
      integer(laeufe_pro_woche,wochen,volle_beutel_vorhanden);
      const planned = Math.ceil(laeufe_pro_woche*wochen/laeufe_je_beutel);
      return {geplante_beutel:planned,planungsfehlmenge:Math.max(0,planned-volle_beutel_vorhanden),
        hinweis:'Näherung bei ähnlicher Schmutzlast. Der Start zählt ab einem frischen Beutel. Nach Anzeige und Anleitung wechseln. Das ist keine Modellfreigabe.'};
    },
    example:{args:{laeufe_pro_woche:4,laeufe_je_beutel:20,wochen:12,volle_beutel_vorhanden:2},
      expect:{geplante_beutel:3,planungsfehlmenge:1}},
  },
  {
    name:'saugwischer_flachbetrieb_raumprofil',
    description:'Kopf und Gehäuse im zugelassenen Flachbetrieb getrennt mit Möbelprofil vergleichen — Compare head and body clearance for a wet cleaner under furniture.',
    page:wet,
    properties:{
      flachbetrieb_freigegeben:flag('Flachbetrieb ist in der Anleitung deiner exakten Ausführung erlaubt?'),
      kopf_benoetigt_cm:cm('Benötigte freie Höhe des Kopfes im zulässigen Modus.'),
      gehaeuse_benoetigt_cm:cm('Benötigte freie Höhe des Gehäuses im zulässigen Modus.'),
      kopfpfad_cm:cm('Kleinste lichte Höhe im Kopfpfad.'),
      gehaeusepfad_cm:cm('Kleinste lichte Höhe im Gehäusepfad.'),
    },
    calculate({flachbetrieb_freigegeben,kopf_benoetigt_cm,gehaeuse_benoetigt_cm,kopfpfad_cm,gehaeusepfad_cm}) {
      if (!flachbetrieb_freigegeben) return {status:'modellfreigabe_klaeren',kopf_rest_cm:null,gehaeuse_rest_cm:null};
      const kopf = round(kopfpfad_cm-kopf_benoetigt_cm);
      const gehaeuse = round(gehaeusepfad_cm-gehaeuse_benoetigt_cm);
      return {kopf_rest_cm:kopf,gehaeuse_rest_cm:gehaeuse,status:Math.min(kopf,gehaeuse)<=0?'kein_freier_pfad':'bewegungsspielraum_pruefen',
        hinweis:'Getrennte Messwerte zählen. Ein rechnerischer Rest beweist keine freie Bewegung bei Streben, Griffwinkel oder Bodenschwellen.'};
    },
    example:{args:{flachbetrieb_freigegeben:true,kopf_benoetigt_cm:9,gehaeuse_benoetigt_cm:15,kopfpfad_cm:10,gehaeusepfad_cm:14},
      expect:{kopf_rest_cm:1,gehaeuse_rest_cm:-1,status:'kein_freier_pfad'}},
  },
  {
    name:'saugwischer_treppentransport_touren',
    description:'Tragewege eines Saugwischers zwischen Abstellort, Stockwerken und Pflegestelle erfassen — Count one-way transfers between floors for a wet-cleaning plan.',
    page:wet,
    properties:{
      von_station:count('Einzelne notwendige Treppenübergänge vom Abstellort bis zur ersten Zone.'),
      zwischen_zonen:count('Treppenübergänge zwischen zu reinigenden Zonen.'),
      zur_pflege:count('Treppenübergänge zur Pflegestelle und danach zum Abstellort, ohne Doppelzählung.'),
      antrieb_vorhanden:flag('Das Gerät hat Vortrieb auf dem Boden?'),
    },
    calculate({von_station,zwischen_zonen,zur_pflege,antrieb_vorhanden}) {
      integer(von_station,zwischen_zonen,zur_pflege);
      return {transportwege:von_station+zwischen_zonen+zur_pflege,boden_vortrieb:antrieb_vorhanden,
        hinweis:'Vortrieb beim Führen verändert die Tragewege nicht. Keine Bewertung einer tragbaren Last. Transport nach Modellanleitung planen.'};
    },
    example:{args:{von_station:1,zwischen_zonen:1,zur_pflege:2,antrieb_vorhanden:true},expect:{transportwege:4}},
  },
  {
    name:'saugwischer_wartezeit_nachpflege',
    description:'Manuelle Pflege und automatische Trocknung mit dem nächsten Reinigungsbedarf abgleichen — Check the turnaround before a wet cleaner is needed again.',
    page:wet,
    properties:{
      manuell_min:minutes('Eigene aktive Nachpflege unmittelbar vor dem automatischen Zyklus in Minuten.'),
      zyklus_min:minutes('Beobachtete Dauer dieses Zyklus in Minuten.'),
      danach_min:minutes('Gegebenenfalls nötige weitere Schritte nach Zyklusende.'),
      nacheinander:flag('Schritte müssen in dieser Reihenfolge ohne Überlappung durchgeführt werden?'),
      pause_min:minutes('Zeit bis zum nächsten Bedarf in Minuten.'),
    },
    calculate({manuell_min,zyklus_min,danach_min,nacheinander,pause_min}) {
      const zeit = manuell_min+zyklus_min+danach_min;
      return {aktive_min:round(manuell_min+danach_min),
        frist_rest_min:nacheinander ? round(pause_min-zeit) : null,
        status:!nacheinander ? 'ablaufzeit_direkt_beobachten' : zeit>pause_min ? 'naechsten_einsatz_verschieben' : 'beobachtetes_zeitfenster_passt',
        hinweis:'Ein passender Zeitplan belegt weder vollständige Trocknung noch Pflege. Vor dem Einsatz die Anleitung einhalten.'};
    },
    example:{args:{manuell_min:8,zyklus_min:40,danach_min:3,nacheinander:true,pause_min:45},
      expect:{aktive_min:11,frist_rest_min:-6,status:'naechsten_einsatz_verschieben'}},
  },
  {
    name:'saugwischer_pflegestelle_entnahmeraum',
    description:'Entnahmeraum für Tank und Rolle am vorgesehenen Pflegeplatz prüfen — Check measured tank and roller access at a wet-cleaner service spot.',
    page:wet,
    properties:{
      benoetigt_oben_cm:cm('Gemessener Platz nach oben für die vorgesehene Tankentnahme.'),
      frei_oben_cm:cm('Tatsächlich freier Raum über dem Gerät an der Pflegestelle.'),
      benoetigt_seite_cm:cm('Gemessener seitlicher Platz zum Entnehmen der Rolle laut Anleitung.'),
      frei_seite_cm:cm('Tatsächlich freier seitlicher Raum an der Pflegestelle.'),
      zugriff_dokumentiert:flag('Entnahmerichtungen stimmen mit der genauen Anleitung überein?'),
    },
    calculate({benoetigt_oben_cm,frei_oben_cm,benoetigt_seite_cm,frei_seite_cm,zugriff_dokumentiert}) {
      const tank = round(frei_oben_cm-benoetigt_oben_cm);
      const rolle = round(frei_seite_cm-benoetigt_seite_cm);
      return {tank_rest_cm:zugriff_dokumentiert?tank:null,rolle_rest_cm:zugriff_dokumentiert?rolle:null,
        status:!zugriff_dokumentiert?'entnahmerichtung_pruefen':Math.min(tank,rolle)<=0?'pflegeplatz_verlagern':'grifffreiheit_pruefen',
        hinweis:'Gerade Entnahmemaße erfassen nur den ersten Platzbedarf. Den zulässigen Entnahmewinkel und genügend Platz für die Hand separat prüfen.'};
    },
    example:{args:{benoetigt_oben_cm:18,frei_oben_cm:15,benoetigt_seite_cm:20,frei_seite_cm:28,zugriff_dokumentiert:true},
      expect:{tank_rest_cm:-3,rolle_rest_cm:8,status:'pflegeplatz_verlagern'}},
  },
  {
    name:'saugwischer_reihenfolge_trockener_ausgang',
    description:'Freien Ausgang bei mehreren nacheinander gereinigten Hartbodenzonen einplanen — Preserve a dry exit route when scheduling floor zones.',
    page:wet,
    properties:{
      ausgangszone_frueh:flag('Liegt die zum Ausgang benötigte Zone früh in der geplanten Reihenfolge?'),
      anderer_trockener_weg:flag('Gibt es bis zur Rückkehr zum Ausgang einen anderen dauerhaft trockenen Weg?'),
      raeume_umstellbar:flag('Lässt sich die Reihenfolge der Reinigungszonen ändern?'),
    },
    calculate({ausgangszone_frueh,anderer_trockener_weg,raeume_umstellbar}) {
      const status = !ausgangszone_frueh || anderer_trockener_weg ? 'trockenen_weg_offenhalten' :
        raeume_umstellbar ? 'ausgangszone_zuletzt_planen' : 'in_getrennte_abschnitte_teilen';
      return {status,hinweis:'Plane nur freigegebene Böden ein und prüfe den tatsächlichen Zustand vor dem Betreten. Dieser Ablauf schätzt keine Trockenzeit und bewertet keine Rutschgefahr.'};
    },
    example:{args:{ausgangszone_frueh:true,anderer_trockener_weg:false,raeume_umstellbar:true},expect:{status:'ausgangszone_zuletzt_planen'}},
  },
  {
    name:'dreame_h14_pro_tank_selbstreinigung',
    description:'Beim H14 Pro die Tankpflege vor und nach der Selbstreinigung nachvollziehen — Apply the documented dirty-water-tank checks around H14 Pro self-cleaning.',
    page:wet,
    properties:{
      modell:choice('Exakte Typenschildangabe.','h14_pro','anderes','unbekannt'),
      vor_zyklus_gepflegt:flag('Schmutzwassertank vor dem Selbstreinigungszyklus nach Anleitung gereinigt?'),
      nach_zyklus_gepflegt:flag('Tank nach dem Selbstreinigungszyklus gereinigt?'),
    },
    calculate({modell,vor_zyklus_gepflegt,nach_zyklus_gepflegt}) {
      if (modell!=='h14_pro') return {status:'eigene_modellanleitung_pruefen',offene_schritte:[]};
      const offene_schritte = [!vor_zyklus_gepflegt && 'tankpflege_vor_zyklus',!nach_zyklus_gepflegt && 'tankpflege_nach_zyklus'].filter(Boolean);
      return {status:offene_schritte.length?'tankpflege_offen':'tankpflege_erfasst',offene_schritte,
        hinweis:'Die dokumentierte Reihenfolge gilt für den H14 Pro. Die sonstige Pflege nach Gebrauch bleibt erforderlich.'};
    },
    example:{args:{modell:'h14_pro',vor_zyklus_gepflegt:true,nach_zyklus_gepflegt:false},
      expect:{status:'tankpflege_offen',offene_schritte:['tankpflege_nach_zyklus']}},
  },
  {
    name:'kuehlgeraet_platz_waermeeintrag',
    description:'Kühlgerät am vorgesehenen Platz auf Wärmequellen und freie Gitter prüfen — Identify exposure and vent issues for an existing refrigerator placement.',
    page:cold,
    properties:{
      direkte_sonne:flag('Direkte Sonne trifft am Standort regelmäßig auf das Gerät?'),
      waermequelle:flag('Herd oder Heizkörper erwärmen unmittelbar den Stellbereich?'),
      gitter_frei:flag('Rückseitige Lüftungsöffnungen entsprechend der Anleitung frei?'),
    },
    calculate({direkte_sonne,waermequelle,gitter_frei}) {
      return {pruefpunkte:[direkte_sonne && 'sonneneinstrahlung',waermequelle && 'benachbarte_waermequelle',!gitter_frei && 'lueftungsgitter'].filter(Boolean),
        hinweis:'Freie Lüftung und Abstand nach eigener Anleitung prüfen. Der Standortcheck berechnet keine Energieersparnis.'};
    },
    example:{args:{direkte_sonne:true,waermequelle:false,gitter_frei:false},expect:{pruefpunkte:['sonneneinstrahlung','lueftungsgitter']}},
  },
  {
    name:'gefriergeraet_abtau_ersatzlager',
    description:'Für ein freigegebenes Abtauen Zwischenlager und Unterbrechung abgleichen — Check cold-storage capacity and a documented interruption window before defrosting.',
    page:cold,
    properties:{
      abtauen_erlaubt:flag('Manuelles Abtauen ist für dieses Gerät in der Modellanleitung beschrieben?'),
      umzulagern_l:number('Eigener geschätzter effektiver Platzbedarf der umzulagernden Waren in Litern.',0,2000),
      ersatz_frei_l:number('Tatsächlich freier nutzbarer Platz im vorgesehenen geeigneten Ersatzgerät in Litern.',0,2000),
      plan_min:minutes('Geplante Unterbrechung einschließlich Wiederanlauf gemäß Anleitung.'),
      verfuegbar_min:minutes('Verfügbarkeit des geeigneten Ersatzgeräts. Das ist keine Haltbarkeitsgrenze.'),
    },
    calculate({abtauen_erlaubt,umzulagern_l,ersatz_frei_l,plan_min,verfuegbar_min}) {
      const fehlend = Math.max(0,umzulagern_l-ersatz_frei_l);
      const reserve = verfuegbar_min-plan_min;
      return {fehlender_lagerraum_l:round(fehlend),zeitreserve_min:round(reserve),
        status:!abtauen_erlaubt?'handbuch_zuerst_pruefen':fehlend>0||reserve<0?'ersatzlager_oder_termin_klaeren':'planung_rechnerisch_passend',
        hinweis:'Keine Aussage zu Lebensmitteltemperaturen oder Lebensmittelsicherheit. Für geeignete durchgehende Lagerung die jeweiligen Empfehlungen beachten.'};
    },
    example:{args:{abtauen_erlaubt:true,umzulagern_l:32,ersatz_frei_l:24,plan_min:180,verfuegbar_min:210},
      expect:{fehlender_lagerraum_l:8,zeitreserve_min:30,status:'ersatzlager_oder_termin_klaeren'}},
  },
  {
    name:'kuehlschrank_tueroeffnung_alltag',
    description:'Offenzeiten beim Ausräumen und Einräumen aus dem eigenen Umlauf vergleichen — Find which fridge-door routine accounts for more observed open time.',
    page:cold,
    properties:{
      entnahmen:count('Anzahl beobachteter Entnahmen.'),
      entnahme_gesamt_s:number('An der offenen Tür beobachtete Sekunden aller Entnahmen zusammen.',0,86400),
      einraeumungen:count('Anzahl beobachteter Einräumungen im gleichen Zeitraum.'),
      einraeumen_gesamt_s:number('An der offenen Tür beobachtete Sekunden aller Einräumungen zusammen.',0,86400),
    },
    calculate({entnahmen,entnahme_gesamt_s,einraeumungen,einraeumen_gesamt_s}) {
      integer(entnahmen,einraeumungen);
      if ((!entnahmen && entnahme_gesamt_s) || (!einraeumungen && einraeumen_gesamt_s)) throw new RangeError('Anzahl und Gesamtdauer stimmen nicht');
      return {entnahme_mittel_s:entnahmen ? round(entnahme_gesamt_s/entnahmen):null,
        einraeumen_mittel_s:einraeumungen?round(einraeumen_gesamt_s/einraeumungen):null,
        laengere_gesamtdauer:entnahme_gesamt_s>einraeumen_gesamt_s?'entnahme':entnahme_gesamt_s<einraeumen_gesamt_s?'einraeumen':'gleich',
        hinweis:'Zeitprotokoll aus einem eigenen Zeitraum. Nur beobachtete Offenzeiten sind vergleichbar.'};
    },
    example:{args:{entnahmen:8,entnahme_gesamt_s:160,einraeumungen:2,einraeumen_gesamt_s:240},
      expect:{entnahme_mittel_s:20,einraeumen_mittel_s:120,laengere_gesamtdauer:'einraeumen'}},
  },
  {
    name:'kuehlgeraet_einbau_lueftungsabgleich',
    description:'Bauseitige Lüftungsöffnung mit der Einbauanleitung des vorhandenen Kühlgeräts abgleichen — Compare measured clear vent area to the manufacturer minimum.',
    page:coldFit,
    properties:{
      oeffnung_frei_cm2:number('Effektiv freier Lüftungsquerschnitt einschließlich Gitterabzügen, laut Messung.',0,50000),
      min_cm2:number('Mindestquerschnitt für genau diese Öffnung laut Modellanleitung.',0,50000),
      oeffnung_zugeordnet:flag('Anleitung, Variante und Position der gemessenen Öffnung eindeutig zugeordnet?'),
    },
    calculate({oeffnung_frei_cm2,min_cm2,oeffnung_zugeordnet}) {
      if (!oeffnung_zugeordnet || min_cm2===0) return {status:'einbauvorgabe_zuordnen',reserve_cm2:null};
      return {reserve_cm2:round(oeffnung_frei_cm2-min_cm2),
        status:oeffnung_frei_cm2<min_cm2?'querschnitt_unter_angabe':'weitere_einbauvorgaben_pruefen',
        hinweis:'Nur ein Querschnittsabgleich. Luftweg, weitere Öffnungen, Abstände und Einbaulage gemäß Hersteller separat prüfen.'};
    },
    example:{args:{oeffnung_frei_cm2:160,min_cm2:200,oeffnung_zugeordnet:true},
      expect:{reserve_cm2:-40,status:'querschnitt_unter_angabe'}},
  },
  {
    name:'kuehlgeraet_gitter_pflegeschritt',
    description:'Sichtbar verstaubtes Lüftungsgitter ohne Geräteeingriff als Pflegepunkt priorisieren — Choose a manual-approved or support step for dusty fridge vents.',
    page:cold,
    properties:{
      staub_sichtbar:flag('Staub ist außen an der vorgesehenen Lüftungsöffnung sichtbar?'),
      zugaenglich:flag('Die Öffnung ist ohne Ausbau oder Öffnen einer Gehäuseabdeckung zugänglich?'),
      pflege_erlaubt:flag('Die Methode für genau dieses Gitter ist in der Modellanleitung beschrieben?'),
    },
    calculate({staub_sichtbar,zugaenglich,pflege_erlaubt}) {
      return {status:!staub_sichtbar?'spaeter_sichtpruefung':zugaenglich&&pflege_erlaubt?'nur_beschriebene_pflege':'handbuch_oder_service',
        hinweis:'Der Standort und freie Lüftungsöffnungen beeinflussen den Betrieb. Keine Abdeckungen abbauen und keine nicht dokumentierte Reinigung ausführen.'};
    },
    example:{args:{staub_sichtbar:true,zugaenglich:false,pflege_erlaubt:true},expect:{status:'handbuch_oder_service'}},
  },
  {
    name:'gefriergeraet_eisschicht_verlauf',
    description:'Rasche Rückkehr einer Eisschicht als beobachteten Verlauf für den Service erfassen — Record repeat frost at the same location without diagnosing a defect.',
    page:cold,
    properties:{
      tage_seit_pflege:number('Vergangene Tage seit dem nach Anleitung abgeschlossenen Pflegevorgang.',0,3650),
      beobachtungen:count('Anzahl vergleichbarer Sichtkontrollen an derselben Stelle.',500),
      erneut_gesehen:count('Kontrollen mit erneut sichtbarer Eisschicht.',500),
      verfahrensgleich:flag('Vergleichbare Stelle und unverändertes Beobachtungsverfahren?'),
    },
    calculate({tage_seit_pflege,beobachtungen,erneut_gesehen,verfahrensgleich}) {
      integer(beobachtungen,erneut_gesehen);
      if (erneut_gesehen>beobachtungen) throw new RangeError('Mehr Wiederholungen als Sichtkontrollen');
      return {tage_seit_pflege,quote_prozent:verfahrensgleich&&beobachtungen ? round(100*erneut_gesehen/beobachtungen):null,
        status:!verfahrensgleich||!beobachtungen?'gleiche_stelle_dokumentieren':erneut_gesehen>0?'verlauf_fuer_herstellerpruefung':'kein_wiederauftreten_in_stichprobe',
        hinweis:'Sichtbefund statt Diagnose. Kein Eingriff ins Gerät und keine Schätzung der Wirkung aus Eisdicke oder Tagen.'};
    },
    example:{args:{tage_seit_pflege:10,beobachtungen:6,erneut_gesehen:3,verfahrensgleich:true},
      expect:{quote_prozent:50,status:'verlauf_fuer_herstellerpruefung'}},
  },
  {
    name:'kuehlschrank_einraeumfolge',
    description:'Kaltlagerung vorbereiten, damit warme Behälter und lange Türöffnungszeiten nicht zusammenfallen — Prepare a refrigerator loading sequence from container state and available space.',
    page:cold,
    properties:{
      behaelter_warm:flag('Unter den vorgesehenen Behältern ist mindestens einer noch warm?'),
      platz_vorbereitet:flag('Ablageplätze wurden bereits zugeordnet?'),
      zugriff_blockiert:flag('Beim Einräumen müssten weitere Behälter zuerst umgestellt werden?'),
    },
    calculate({behaelter_warm,platz_vorbereitet,zugriff_blockiert}) {
      return {vorbereitung:[behaelter_warm && 'geeignete_lagerung_fuer_warme_behaelter_klaeren',
        (!platz_vorbereitet||zugriff_blockiert) && 'ablage_vor_dem_einraeumen_planen'].filter(Boolean),
        hinweis:'Für Lebensmittel sichere Abkühl- und Lagerhinweise beachten. Dieses Tool gibt keine Wartezeit vor und beurteilt keine Lebensmittelsicherheit.'};
    },
    example:{args:{behaelter_warm:true,platz_vorbereitet:false,zugriff_blockiert:true},
      expect:{vorbereitung:['geeignete_lagerung_fuer_warme_behaelter_klaeren','ablage_vor_dem_einraeumen_planen']}},
  },
  {
    name:'schublade_faecher_reihenbreite',
    description:'Nettofachbreite für mehrere nebeneinanderliegende Schubladenfächer prüfen — Calculate usable width after divider thickness in a row of drawer bins.',
    page:workshop,
    properties:{
      innen_mm:number('Lichte Innenbreite an der engsten Stelle der Schublade.',1,2000),
      faecher:number('Anzahl gleicher Fächer in einer Reihe.',1,30),
      platten_mm:number('Tatsächliche Dicke einer zwischengelegten Trennplatte.',0,100),
      restspiel_mm:number('Summe der vorgesehenen seitlichen Spielräume.',0,2000),
    },
    calculate({innen_mm,faecher,platten_mm,restspiel_mm}) {
      integer(faecher);
      const netto = innen_mm-(faecher-1)*platten_mm-restspiel_mm;
      return {fachbreite_mm:netto>0?Math.floor(netto/faecher*1000)/1000:null,
        status:netto>0?'fachabmessungen_am_objekt_pruefen':'weniger_faecher_oder_abstaende_pruefen',
        hinweis:'Berechnung für lose Trennplatten ohne Endplatten oder Halterungen. Form, Wandwinkel und Gegenstände separat messen.'};
    },
    example:{args:{innen_mm:240,faecher:3,platten_mm:3,restspiel_mm:6},expect:{fachbreite_mm:76}},
  },
  {
    name:'schubladeneinsatz_aushebehoehe',
    description:'Herausheben eines losen Schubladeneinsatzes bei geöffneter Schublade prüfen — Check the measured vertical removal space before adding a removable drawer organizer.',
    page:workshop,
    properties:{
      lift_benoetigt_cm:cm('Höhe, um den geplanten Einsatz senkrecht über seine Führung oder Schubladenkante zu heben.'),
      lift_frei_cm:cm('Vertikal freier Raum über dem Einsatz bei vorgesehener Öffnungsstellung.'),
      zugang_dokumentiert:flag('Senkrechter Weg wurde bis zum höchsten Hindernis am tatsächlichen Ort gemessen?'),
    },
    calculate({lift_benoetigt_cm,lift_frei_cm,zugang_dokumentiert}) {
      const reserve = round(lift_frei_cm-lift_benoetigt_cm);
      return {senkrechte_reserve_cm:zugang_dokumentiert?reserve:null,
        status:!zugang_dokumentiert?'entnahmepfad_messen':reserve<=0?'senkrechter_weg_nicht_frei':'griff_und_tiefe_pruefen',
        hinweis:'Nur senkrechter Entnahmepfad eines losen, unbelasteten Einsatzes. Kein Nachweis für Kippen, Befestigen oder belastbare Ersatzteile.'};
    },
    example:{args:{lift_benoetigt_cm:7,lift_frei_cm:6,zugang_dokumentiert:true},
      expect:{senkrechte_reserve_cm:-1,status:'senkrechter_weg_nicht_frei'}},
  },
  {
    name:'maehroboter_passage_seitenspiel',
    description:'Freiraum zwischen starren Hindernissen in einer vorhandenen Mähroboterpassage dokumentieren — Compare usable passage width with a location-specific manual requirement for an installed mower.',
    page:workshop,
    properties:{
      lichte_cm:cm('Lichte Breite an der engsten Stelle zwischen festen Hindernissen.'),
      einragend_cm:cm('Zusätzlich gemessene Einragung von Ästen oder Kanten innerhalb dieser Breite.'),
      anleitung_cm:number('Passagenbreite für genau dieses Modell und Führungssystem in Zentimetern.',1,1000),
      genaue_fuehrung:flag('Breitenangabe gilt ausdrücklich für diese Führung und für diese Passagenart?'),
    },
    calculate({lichte_cm,einragend_cm,anleitung_cm,genaue_fuehrung}) {
      if (einragend_cm>lichte_cm) throw new RangeError('Einragung liegt außerhalb der Passage');
      const frei = lichte_cm-einragend_cm;
      return {freie_passage_cm:round(frei),reserve_cm:genaue_fuehrung ? round(frei-anleitung_cm):null,
        status:!genaue_fuehrung?'fuehrungsbedingung_pruefen':frei<anleitung_cm?'engstelle_ausklammern':'weitere_passagenbedingungen_pruefen',
        hinweis:'Ein Breitenabgleich belegt keine sichere Fahrt. Drahtführung, Rand, Gefälle und Passage nach eigener Anleitung beurteilen. Keine Drahtwerte auf Satellitennavigation übertragen.'};
    },
    example:{args:{lichte_cm:83,einragend_cm:11,anleitung_cm:75,genaue_fuehrung:true},
      expect:{freie_passage_cm:72,reserve_cm:-3,status:'engstelle_ausklammern'}},
  },
  {
    name:'schubladenfach_objekt_ausrichtung',
    description:'Messbares Rechteck in einem bestehenden Schubladenfach längs oder quer einordnen — Find a usable 90-degree orientation for a rectangular stored object.',
    page:workshop,
    properties:{
      fach_breite_cm:number('Nutzbare Breite des geplanten Fachs zwischen den Trennplatten.',0.1,250),
      fach_tiefe_cm:number('Nutzbare Tiefe des Fachs.',0.1,250),
      objekt_breite_cm:number('Breite des rechteckigen Umrisses einschließlich vorstehender Teile.',0.1,250),
      objekt_tiefe_cm:number('Tiefe dieses Umrisses.',0.1,250),
      griffspiel_cm:cm('Auf jeder Achse zusätzlich benötigter Gesamtspielraum zum Greifen.',30),
    },
    calculate({fach_breite_cm,fach_tiefe_cm,objekt_breite_cm,objekt_tiefe_cm,griffspiel_cm}) {
      const laengs = objekt_breite_cm+griffspiel_cm<=fach_breite_cm && objekt_tiefe_cm+griffspiel_cm<=fach_tiefe_cm;
      const quer = objekt_tiefe_cm+griffspiel_cm<=fach_breite_cm && objekt_breite_cm+griffspiel_cm<=fach_tiefe_cm;
      return {lage:[laengs && 'laengs',quer && 'quer'].filter(Boolean),
        hinweis:'Geometrische Probe für rechteckige Grundflächen. Höhe bei geschlossener Schublade, Öffnungsweg und Griffraum am Gegenstand separat messen.'};
    },
    example:{args:{fach_breite_cm:22,fach_tiefe_cm:13,objekt_breite_cm:10,objekt_tiefe_cm:19,griffspiel_cm:2},
      expect:{lage:['quer']}},
  },
];
