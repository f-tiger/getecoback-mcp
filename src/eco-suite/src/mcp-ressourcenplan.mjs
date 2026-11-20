const resource = '/guide/strom-sparen-haushalt.html';
const meter = '/strommess-protokoll.html';
const clock = '/guide/strompreis-radar.html';
const tariff = '/stromtarif-werkstatt.html';
const power = '/guide/stromkosten-rechner.html';
const shower = '/guide/duschen-kosten-rechner.html';
const laundry = '/waeschetrockner-oder-luftentfeuchter.html';
const heating = '/guide/heizkosten-vergleich-rechner.html';
const cooling = '/guide/klimaanlage-stromkosten.html';

const number = (description, minimum = 0, maximum = 100000) => ({type:'number', description, minimum, maximum});
const flag = description => ({type:'boolean', description});
const energy = description => number(description, 0, 20000);
const euro = description => number(description, 0, 50000);
const price = description => number(description, -5, 10);
const count = (description, maximum = 366) => number(description, 0, maximum);
const round = (value, digits = 2) => Number(value.toFixed(digits));
function requireCounts(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Anzahl muss ganzzahlig sein');
}
const whole = (value, size) => Math.floor((value + Number.EPSILON * Math.max(value,size) * 4)/size);

export const ressourcenplan = [
  {
    name:'stromfenster_mehrphasen_start',
    description:'Ein Gerät mit zwei unterschiedlich energieintensiven Phasen über bekannte Preisfenster einplanen — Find the cheapest contiguous start for a two-phase load.',
    page:clock,
    properties:{
      preis_1_eur_kwh:price('Endpreis im ersten gleich langen Zeitfenster, Euro pro kWh.'),
      preis_2_eur_kwh:price('Endpreis im zweiten gleich langen Zeitfenster, Euro pro kWh.'),
      preis_3_eur_kwh:price('Endpreis im dritten gleich langen Zeitfenster, Euro pro kWh.'),
      preis_4_eur_kwh:price('Endpreis im vierten gleich langen Zeitfenster, Euro pro kWh.'),
      phase_1_kwh:energy('Gemessene Energie in kWh während der ersten Gerätephase.'),
      phase_2_kwh:energy('Gemessene Energie in kWh während der zweiten Gerätephase.'),
    },
    calculate({preis_1_eur_kwh,preis_2_eur_kwh,preis_3_eur_kwh,preis_4_eur_kwh,phase_1_kwh,phase_2_kwh}) {
      const prices=[preis_1_eur_kwh,preis_2_eur_kwh,preis_3_eur_kwh,preis_4_eur_kwh];
      const costs=prices.slice(0,-1).map((value,i)=>value*phase_1_kwh+prices[i+1]*phase_2_kwh);
      const best=Math.min(...costs);
      return {guenstigste_startfenster:costs.flatMap((cost,i)=>Math.abs(cost-best)<1e-9?[i+1]:[]),
        guenstigste_kosten_eur:round(best), kosten_nach_start_eur:costs.map(cost=>round(cost)),
        hinweis:'Ein Fenster je Gerätephase. Alle drei Starts müssen laut Anleitung und eigenen Zeitvorgaben zulässig sein. Reale Endpreise verwenden.'};
    },
    example:{args:{preis_1_eur_kwh:0.3,preis_2_eur_kwh:0.2,preis_3_eur_kwh:0.4,preis_4_eur_kwh:0.25,phase_1_kwh:0.8,phase_2_kwh:0.2},
      expect:{guenstigste_startfenster:[2],guenstigste_kosten_eur:0.24}}
  },
  {
    name:'unterbrechbare_last_preisfenster_verteilen',
    description:'Benötigte Energie einer unterbrechbaren Aufgabe auf verfügbare Preisfenster verteilen — Allocate interruptible energy across known time slots with capacity limits.',
    page:clock,
    properties:{
      bedarf_kwh:number('Zielmenge in kWh.',0.01,1000),
      preis_1_eur_kwh:price('Bekannter Endpreis für Fenster 1, Euro pro kWh.'),
      preis_2_eur_kwh:price('Bekannter Endpreis für Fenster 2, Euro pro kWh.'),
      preis_3_eur_kwh:price('Bekannter Endpreis für Fenster 3, Euro pro kWh.'),
      verfuegbar_1_kwh:energy('In Fenster 1 tatsächlich für diese Aufgabe verfügbare kWh.'),
      verfuegbar_2_kwh:energy('In Fenster 2 tatsächlich für diese Aufgabe verfügbare kWh.'),
      verfuegbar_3_kwh:energy('In Fenster 3 tatsächlich für diese Aufgabe verfügbare kWh.'),
    },
    calculate({bedarf_kwh,preis_1_eur_kwh,preis_2_eur_kwh,preis_3_eur_kwh,verfuegbar_1_kwh,verfuegbar_2_kwh,verfuegbar_3_kwh}) {
      const slots=[preis_1_eur_kwh,preis_2_eur_kwh,preis_3_eur_kwh].map((unitPrice,i)=>({
        i,unitPrice,capacity:[verfuegbar_1_kwh,verfuegbar_2_kwh,verfuegbar_3_kwh][i],
      })).sort((a,b)=>a.unitPrice-b.unitPrice);
      const allocation=[0,0,0];
      let remaining=bedarf_kwh;
      let cost=0;
      for (const slot of slots) {
        const take=Math.min(slot.capacity,remaining);
        allocation[slot.i]=take;
        remaining-=take;
        cost+=take*slot.unitPrice;
      }
      return {ziel_erreichbar:remaining<1e-9, verteilung_kwh:allocation.map(value=>round(value,4)),
        fehlend_kwh:round(remaining,4), kosten_der_zuweisung_eur:round(cost),
        hinweis:'Nur für Aufgaben, deren Energiemenge aufgeteilt werden darf; unvollständige Zuweisung liefert keine fertige Aufgabe.'};
    },
    example:{args:{bedarf_kwh:3,preis_1_eur_kwh:0.25,preis_2_eur_kwh:0.2,preis_3_eur_kwh:0.35,verfuegbar_1_kwh:2,verfuegbar_2_kwh:1.5,verfuegbar_3_kwh:2},
      expect:{ziel_erreichbar:true,verteilung_kwh:[1.5,1.5,0],kosten_der_zuweisung_eur:0.68}}
  },
  {
    name:'strompreis_zwei_geraete_ruhefenster',
    description:'Zwei unterschiedlich energieintensive Läufe ohne zeitliche Überlagerung auf erlaubte Zeitfenster verteilen — Pick distinct low-cost slots for two planned chores that must not overlap.',
    page:clock,
    properties:{
      a_kwh:energy('Gemessene kWh des vollständigen Laufs A.'),
      b_kwh:energy('Gemessene kWh des vollständigen Laufs B.'),
      preis_1_eur_kwh:price('Bekannter Endpreis in Zeitfenster 1.'),
      preis_2_eur_kwh:price('Bekannter Endpreis in Zeitfenster 2.'),
      preis_3_eur_kwh:price('Bekannter Endpreis in Zeitfenster 3.'),
      a_nur_vor_fenster_3:flag('Lauf A muss vor dem dritten Zeitfenster beendet sein?'),
      b_nur_nach_fenster_1:flag('Lauf B darf frühestens im zweiten Zeitfenster beginnen?'),
    },
    calculate({a_kwh,b_kwh,preis_1_eur_kwh,preis_2_eur_kwh,preis_3_eur_kwh,a_nur_vor_fenster_3,b_nur_nach_fenster_1}) {
      const prices=[preis_1_eur_kwh,preis_2_eur_kwh,preis_3_eur_kwh];
      const plans=[];
      for (let a=0;a<(a_nur_vor_fenster_3?2:3);a++) {
        for (let b=b_nur_nach_fenster_1?1:0;b<3;b++) {
          if (a===b) continue;
          plans.push({a_fenster:a+1,b_fenster:b+1,cost:a_kwh*prices[a]+b_kwh*prices[b]});
        }
      }
      const best=Math.min(...plans.map(plan=>plan.cost));
      return {belegungen:plans.filter(plan=>Math.abs(plan.cost-best)<1e-9).map(({a_fenster,b_fenster})=>({a_fenster,b_fenster})),
        kosten_eur:round(best), hinweis:'Jeder Lauf passt vollständig in sein Zeitfenster. Die getrennte Belegung ist eine Planvorgabe, keine Prüfung eines Stromkreises.'};
    },
    example:{args:{a_kwh:2,b_kwh:1,preis_1_eur_kwh:0.3,preis_2_eur_kwh:0.2,preis_3_eur_kwh:0.4,a_nur_vor_fenster_3:true,b_nur_nach_fenster_1:false},
      expect:{belegungen:[{a_fenster:2,b_fenster:1}],kosten_eur:0.7}}
  },
  {
    name:'strombudget_optionale_zyklen_priorisieren',
    description:'Zwei Arten geplanter Zusatzläufe nach eigener Priorität unter einem verbleibenden Strombudget einteilen — Allocate full optional runs in priority order after essential use and reserve.',
    page:meter,
    properties:{
      budget_kwh:energy('Gesamtgrenze des gewählten Zeitraums in kWh.'),
      grundbedarf_kwh:energy('Bereits eingeplanter unverzichtbarer Bedarf in kWh.'),
      reserve_kwh:energy('Vorab freizuhaltende Reserve in kWh.'),
      wichtige_zyklen:count('Gewünschte Anzahl der wichtigeren optionalen Läufe.',100),
      wichtiger_zyklus_kwh:number('Gemessene kWh pro wichtigem Lauf.',0.0001,1000),
      weitere_zyklen:count('Gewünschte Anzahl der weniger wichtigen optionalen Läufe.',100),
      weiterer_zyklus_kwh:number('Gemessene kWh pro weiterem Lauf.',0.0001,1000),
    },
    calculate({budget_kwh,grundbedarf_kwh,reserve_kwh,wichtige_zyklen,wichtiger_zyklus_kwh,weitere_zyklen,weiterer_zyklus_kwh}) {
      requireCounts(wichtige_zyklen,weitere_zyklen);
      const raw=budget_kwh-grundbedarf_kwh-reserve_kwh;
      const remaining=Math.max(0,raw);
      const priority=Math.min(wichtige_zyklen,whole(remaining,wichtiger_zyklus_kwh));
      const afterPriority=Math.max(0,remaining-priority*wichtiger_zyklus_kwh);
      const other=Math.min(weitere_zyklen,whole(afterPriority,weiterer_zyklus_kwh));
      return {wichtig_einplanbar:priority,weitere_einplanbar:other,
        budget_ohne_reserve_uebrig_kwh:round(Math.max(0,afterPriority-other*weiterer_zyklus_kwh),4),
        grundbedarf_und_reserve_budgetluecke_kwh:round(Math.max(0,-raw),4),
        hinweis:'Verwendet eigene Prioritäten und ganze Läufe. Grundbedarf und Reserve werden vor zusätzlichen Läufen abgezogen.'};
    },
    example:{args:{budget_kwh:17,grundbedarf_kwh:8,reserve_kwh:2,wichtige_zyklen:2,wichtiger_zyklus_kwh:2,weitere_zyklen:4,weiterer_zyklus_kwh:1},
      expect:{wichtig_einplanbar:2,weitere_einplanbar:3}}
  },
  {
    name:'strombudget_restwochenpfad',
    description:'Ein laufendes Monatslimit nach Zwischensaldo auf verbleibende Werktage und Wochenendtage umlegen — Find the remaining workday allowance after actual usage and planned weekend loads.',
    page:meter,
    properties:{
      budget_kwh:energy('Eigenes Monatslimit in kWh.'),
      bisher_kwh:energy('Schon gemessener Monatsverbrauch in kWh.'),
      werktage_offen:count('Verbleibende Werktage.',31),
      wochenendtage_offen:count('Verbleibende Wochenendtage beziehungsweise Tage mit höherem Bedarf.',31),
      wochenendtag_kwh:energy('Geplanter Verbrauch je solchem Tag in kWh.'),
    },
    calculate({budget_kwh,bisher_kwh,werktage_offen,wochenendtage_offen,wochenendtag_kwh}) {
      requireCounts(werktage_offen,wochenendtage_offen);
      if (werktage_offen+wochenendtage_offen>31) throw new RangeError('Zu viele Tage für einen Monatsrest');
      const open=budget_kwh-bisher_kwh-wochenendtage_offen*wochenendtag_kwh;
      return {werktag_limit_kwh:werktage_offen&&open>=0?round(open/werktage_offen,4):null,
        bekannte_budgetluecke_kwh:round(Math.max(0,-open),4), noch_zu_verteilen_kwh:round(Math.max(0,open),4),
        hinweis:'Eigener Zielpfad mit fest eingeplanten Wochenendtagen. Die Rechnung beschreibt keine Verbrauchsprognose.'};
    },
    example:{args:{budget_kwh:100,bisher_kwh:48,werktage_offen:10,wochenendtage_offen:4,wochenendtag_kwh:8},
      expect:{werktag_limit_kwh:2,noch_zu_verteilen_kwh:20}}
  },
  {
    name:'strombudget_hitzetage_reserve',
    description:'Mehrverbrauch warmer Tage in einer bereits geplanten Verbrauchsperiode reservieren — Find the headroom for hot days above the measured normal-day baseline.',
    page:cooling,
    properties:{
      tage:count('Gesamtzahl der geplanten Tage.'),
      normal_kwh_tag:energy('Gemessener Tagesverbrauch unter normalen Bedingungen.'),
      heiss_kwh_tag:energy('Gemessener Tagesverbrauch an vergleichbar heißen Tagen.'),
      budget_kwh:energy('Eigenes Verbrauchslimit der Periode in kWh.'),
    },
    calculate({tage,normal_kwh_tag,heiss_kwh_tag,budget_kwh}) {
      requireCounts(tage);
      if (heiss_kwh_tag<=normal_kwh_tag) throw new RangeError('Ein Mehrverbrauch muss messbar sein');
      const spare=budget_kwh-tage*normal_kwh_tag;
      const add=heiss_kwh_tag-normal_kwh_tag;
      return {hitzetage_im_budget:spare<0?0:Math.min(tage,whole(spare,add)),
        grundplan_budgetluecke_kwh:round(Math.max(0,-spare),4), zusaetzlich_pro_hitzetag_kwh:round(add,4),
        hinweis:'Ersetzt normale Tage durch heiße Tage. Weder Wetterprognose noch eine Vorgabe, Kühlung abzuschalten.'};
    },
    example:{args:{tage:20,normal_kwh_tag:4,heiss_kwh_tag:7,budget_kwh:100},
      expect:{hitzetage_im_budget:6,zusaetzlich_pro_hitzetag_kwh:3}}
  },
  {
    name:'strombudget_maximaler_arbeitspreis',
    description:'Preisobergrenze für ein Eurobudget bei fest geplantem Verbrauch und Gebühren bestimmen — Compute the maximum all-in variable rate a fixed consumption budget can absorb.',
    page:tariff,
    properties:{
      budget_eur:euro('Gesamtbudget des Betrachtungszeitraums in Euro.'),
      plan_kwh:number('Eingeplanter Verbrauch in diesem Zeitraum.',0.01,20000),
      fixkosten_eur:euro('Alle festen, auf denselben Zeitraum entfallenden Gebühren in Euro.'),
      angebot_eur_kwh:price('Bekannter alternativer Brutto-Arbeitspreis in Euro pro kWh.'),
    },
    calculate({budget_eur,plan_kwh,fixkosten_eur,angebot_eur_kwh}) {
      const limit=(budget_eur-fixkosten_eur)/plan_kwh;
      return {maximaler_arbeitspreis_eur_kwh:round(limit,5),
        preisreserve_eur_kwh:round(limit-angebot_eur_kwh,5),
        angebot_im_budget:angebot_eur_kwh<=limit+1e-9,
        hinweis:'Ein negativer Grenzwert bedeutet: Selbst ein Arbeitspreis von null würde bei unveränderten Fixkosten nicht ausreichen.'};
    },
    example:{args:{budget_eur:100,plan_kwh:300,fixkosten_eur:10,angebot_eur_kwh:0.28},
      expect:{maximaler_arbeitspreis_eur_kwh:0.3,preisreserve_eur_kwh:0.02}}
  },
  {
    name:'strommessung_unterzaehler_netzbaum',
    description:'Doppelzählung einer Gerätegruppe unter einem gemeinsamen Zwischenzähler aus der Bilanz entfernen — Reconcile a nested submeter plus independent loads without counting its measured child twice.',
    page:meter,
    properties:{
      gesamt_kwh:energy('Gesamter Haushalt im gemeinsamen Zeitraum in kWh.'),
      gruppenzaehler_kwh:energy('Gemeinsamer Zwischenzähler für mehrere Geräte, inklusive Teilgerät.'),
      teilgeraet_kwh:energy('Gemessenes Teilgerät innerhalb der Gruppe.'),
      gruppe_aussen_kwh:energy('Unabhängig außerhalb der Gruppe gemessene Verbraucher.'),
      gleicher_zeitraum:flag('Alle Werte decken denselben Zeitraum und dieselbe Flussrichtung ab?'),
    },
    calculate({gesamt_kwh,gruppenzaehler_kwh,teilgeraet_kwh,gruppe_aussen_kwh,gleicher_zeitraum}) {
      if (gleicher_zeitraum && (teilgeraet_kwh>gruppenzaehler_kwh+1e-9 || gruppenzaehler_kwh+gruppe_aussen_kwh>gesamt_kwh+1e-9)) {
        throw new RangeError('Messgrenzen oder Zählerumfang passen nicht zusammen');
      }
      return {rest_der_gruppe_kwh:gleicher_zeitraum?round(Math.max(0,gruppenzaehler_kwh-teilgeraet_kwh),4):null,
        haushalt_nicht_zugeordnet_kwh:gleicher_zeitraum?round(Math.max(0,gesamt_kwh-gruppenzaehler_kwh-gruppe_aussen_kwh),4):null,
        vermiedene_doppelzaehlung_kwh:gleicher_zeitraum?teilgeraet_kwh:null,
        hinweis:'Gruppen- und Teilzähler beschreiben eine Hierarchie. Verluste oder Messfehler werden nicht einer Person zugeschrieben.'};
    },
    example:{args:{gesamt_kwh:20,gruppenzaehler_kwh:6,teilgeraet_kwh:2,gruppe_aussen_kwh:8,gleicher_zeitraum:true},
      expect:{rest_der_gruppe_kwh:4,haushalt_nicht_zugeordnet_kwh:6,vermiedene_doppelzaehlung_kwh:2}}
  },
  {
    name:'haushaltsstrom_geteilte_nutzung_szenario',
    description:'Getrennt gemessene Verbräuche und gemeinsame Stromkosten nach eigenen Schlüsseln aufteilen — Build a private two-party household cost-sharing scenario from direct and shared usage.',
    page:tariff,
    properties:{
      a_eigen_kwh:energy('Nur Person A zugeordneter Verbrauch im Zeitraum.'),
      b_eigen_kwh:energy('Nur Person B zugeordneter Verbrauch im Zeitraum.'),
      gemeinsam_kwh:energy('Getrennt gemessener gemeinsamer Verbrauch ohne die beiden Einzelposten.'),
      preis_eur_kwh:price('Geplanter einheitlicher Arbeitspreis für alle drei Verbrauchsmengen.'),
      fix_eur:euro('Festkosten desselben Zeitraums.'),
      a_gemeinsam_prozent:number('Abgesprochener prozentualer Anteil von A am gemeinsamen Verbrauch.',0,100),
      a_fix_prozent:number('Abgesprochener prozentualer Anteil von A an den Fixkosten.',0,100),
    },
    calculate({a_eigen_kwh,b_eigen_kwh,gemeinsam_kwh,preis_eur_kwh,fix_eur,a_gemeinsam_prozent,a_fix_prozent}) {
      const total=(a_eigen_kwh+b_eigen_kwh+gemeinsam_kwh)*preis_eur_kwh+fix_eur;
      const a=(a_eigen_kwh+gemeinsam_kwh*a_gemeinsam_prozent/100)*preis_eur_kwh+fix_eur*a_fix_prozent/100;
      return {a_eur:round(a),b_eur:round(round(total)-round(a)),gesamt_eur:round(total),
        hinweis:'Rechenbeispiel mit selbst gewählten Schlüsseln. Eine bestehende Abrechnung oder Vereinbarung wird damit nicht beurteilt.'};
    },
    example:{args:{a_eigen_kwh:40,b_eigen_kwh:20,gemeinsam_kwh:30,preis_eur_kwh:0.3,fix_eur:20,a_gemeinsam_prozent:60,a_fix_prozent:50},
      expect:{a_eur:27.4,b_eur:19.6,gesamt_eur:47}}
  },
  {
    name:'strombedarf_zwei_zeitfenster_aufschubkosten',
    description:'Zusätzlichen Warteverbrauch eines verschobenen Starts gegen den Tarifvorteil rechnen — Check whether standby energy during a delayed cycle offsets tariff savings.',
    page:clock,
    properties:{
      lauf_kwh:energy('Gemessene kWh eines vollständigen Laufs.'),
      frueh_eur_kwh:price('Aktueller Endpreis für einen vollständigen frühen Lauf.'),
      spaet_eur_kwh:price('Späterer Endpreis für einen vollständigen späten Lauf.'),
      warte_kwh:energy('Zusätzliche gemessene Standby-kWh der Verzögerung gegenüber sofortigem Start.'),
      warte_eur_kwh:price('Verbrauchsgewichteter Endpreis allein für den zusätzlichen Warteverbrauch.'),
    },
    calculate({lauf_kwh,frueh_eur_kwh,spaet_eur_kwh,warte_kwh,warte_eur_kwh}) {
      const early=lauf_kwh*frueh_eur_kwh, late=lauf_kwh*spaet_eur_kwh+warte_kwh*warte_eur_kwh;
      return {kosten_frueh_eur:round(early,4),kosten_spaet_eur:round(late,4),
        spaet_guenstiger:late<early-1e-9,vorteil_spaet_eur:round(early-late,4),
        hinweis:'Vergleicht denselben vollständigen Lauf. Zusätzliche Warteenergie muss separat bestimmt werden.'};
    },
    example:{args:{lauf_kwh:1,frueh_eur_kwh:0.35,spaet_eur_kwh:0.25,warte_kwh:0.5,warte_eur_kwh:0.3},
      expect:{kosten_spaet_eur:0.4,spaet_guenstiger:false}}
  },
  {
    name:'stromsparplan_massnahmen_ueberlappung',
    description:'Gemeinsamen Einsparanteil zweier Maßnahmen vor einem Zielvergleich nur einmal zählen — Avoid double-counting overlapping measured electricity savings.',
    page:resource,
    properties:{
      a_kwh:energy('Geschätzter oder gemessener Effekt von Maßnahme A in kWh.'),
      b_kwh:energy('Geschätzter oder gemessener Effekt von Maßnahme B in kWh.'),
      ueberlappung_kwh:energy('Gemeinsamer Anteil beider Effekte im selben Zeitraum in kWh.'),
      ziel_kwh:energy('Eigenes Einsparziel desselben Zeitraums in kWh.'),
    },
    calculate({a_kwh,b_kwh,ueberlappung_kwh,ziel_kwh}) {
      if (ueberlappung_kwh>Math.min(a_kwh,b_kwh)) throw new RangeError('Gemeinsamer Effekt größer als einer der Teile');
      const net=a_kwh+b_kwh-ueberlappung_kwh;
      return {kombinierter_effekt_kwh:round(net,4),ziel_erreicht:net+1e-9>=ziel_kwh,
        noch_benoetigt_kwh:round(Math.max(0,ziel_kwh-net),4),
        hinweis:'Unterstellt, dass der gemeinsame Anteil aus vergleichbaren Nutzungsbedingungen bekannt ist. Wechselwirkungen gesondert messen.'};
    },
    example:{args:{a_kwh:40,b_kwh:35,ueberlappung_kwh:20,ziel_kwh:60},
      expect:{kombinierter_effekt_kwh:55,noch_benoetigt_kwh:5}}
  },
  {
    name:'stromrechnung_ruecklage_geplant',
    description:'Bisherige Zahlungen, geplante weitere Abschläge und einen eigenen Rechnungskorridor zum Rücklagenplan verbinden — Estimate a monthly reserve from a supplied final-bill range.',
    page:tariff,
    properties:{
      rechnung_untergrenze_eur:euro('Eigene Untergrenze für die gesamte Jahresrechnung.'),
      rechnung_obergrenze_eur:euro('Eigene Obergrenze für die gesamte Jahresrechnung.'),
      bereits_gezahlt_eur:euro('Tatsächlich bereits gezahlte Abschläge.'),
      weitere_zahlungen_eur:euro('Abschläge, die noch vor der Rechnung geplant sind.'),
      monate_bis_rechnung:count('Verbleibende Monate bis zur geplanten Rücklage, 0 = sofort.',36),
      vorhandene_ruecklage_eur:euro('Schon vorhandene, separat gehaltene Rücklage.'),
    },
    calculate({rechnung_untergrenze_eur,rechnung_obergrenze_eur,bereits_gezahlt_eur,weitere_zahlungen_eur,monate_bis_rechnung,vorhandene_ruecklage_eur}) {
      requireCounts(monate_bis_rechnung);
      if (rechnung_untergrenze_eur>rechnung_obergrenze_eur) throw new RangeError('Rechnungsspanne vertauscht');
      const covered=bereits_gezahlt_eur+weitere_zahlungen_eur+vorhandene_ruecklage_eur;
      const low=Math.max(0,rechnung_untergrenze_eur-covered), high=Math.max(0,rechnung_obergrenze_eur-covered);
      return {fehlende_ruecklage_eur:[round(low),round(high)],
        monatlich_zusaetzlich_eur:monate_bis_rechnung?[round(low/monate_bis_rechnung),round(high/monate_bis_rechnung)]:null,
        hinweis:'Nur Liquiditätsplanung mit einer selbst vorgegebenen Rechnungsspanne. Geplante Abschläge müssen tatsächlich bezahlt werden.'};
    },
    example:{args:{rechnung_untergrenze_eur:950,rechnung_obergrenze_eur:1100,bereits_gezahlt_eur:800,weitere_zahlungen_eur:100,monate_bis_rechnung:2,vorhandene_ruecklage_eur:50},
      expect:{fehlende_ruecklage_eur:[0,150],monatlich_zusaetzlich_eur:[0,75]}}
  },
  {
    name:'duschwasserbudget_zwei_personen',
    description:'Gemeinsames Duschwasserbudget auf zwei selbst vorgegebene Mindestzeiten und gleiche Zusatzzeit verteilen — Allocate a shared water allowance when two showers have different measured flow rates.',
    page:shower,
    properties:{
      budget_l:number('Verfügbares gemeinsames Wasserbudget in Litern.',0,3000),
      a_l_min:number('Gemessener Durchfluss an Dusche A in Litern je Minute.',0.1,60),
      b_l_min:number('Gemessener Durchfluss an Dusche B in Litern je Minute.',0.1,60),
      a_mindest_min:number('Selbst gewählte Mindestzeit A in Minuten.',0,60),
      b_mindest_min:number('Selbst gewählte Mindestzeit B in Minuten.',0,60),
    },
    calculate({budget_l,a_l_min,b_l_min,a_mindest_min,b_mindest_min}) {
      const reserved=a_mindest_min*a_l_min+b_mindest_min*b_l_min;
      const extra=Math.max(0,budget_l-reserved)/(a_l_min+b_l_min);
      return {mindestens_benoetigt_l:round(reserved),fehlend_l:round(Math.max(0,reserved-budget_l)),
        gleiche_zusatzzeit_min:budget_l<reserved?null:round(extra),
        hinweis:'Gleiche Zusatzzeit ist hier ein gewählter Aufteilungsschlüssel. Die eigenen Mindestzeiten sind keine Empfehlungen.'};
    },
    example:{args:{budget_l:90,a_l_min:8,b_l_min:10,a_mindest_min:4,b_mindest_min:4},
      expect:{mindestens_benoetigt_l:72,fehlend_l:0,gleiche_zusatzzeit_min:1}}
  },
  {
    name:'spuelprogramme_wasser_strom_zielkonflikt',
    description:'Zwei vollständig gemessene Spülprogramme auf Wasser- und Stromlimit prüfen und Zielkonflikte sichtbar machen — Check measured dishwashing cycles against independent water and electricity limits.',
    page:resource,
    properties:{
      a_kwh:energy('Gemessener Energieverbrauch je vollständigen Lauf A.'),
      a_l:number('Gemessener Wasserverbrauch je vollständigen Lauf A in Litern.'),
      b_kwh:energy('Gemessener Energieverbrauch je vollständigen Lauf B.'),
      b_l:number('Gemessener Wasserverbrauch je vollständigen Lauf B in Litern.'),
      limit_kwh:energy('Eigenes Stromlimit je gleichwertigem Spülgang.'),
      limit_l:number('Eigenes Wasserlimit je gleichwertigem Spülgang.'),
      gleiche_aufgabe:flag('Beladung und erreichte Reinigungsaufgabe sind in beiden Messungen vergleichbar?'),
    },
    calculate({a_kwh,a_l,b_kwh,b_l,limit_kwh,limit_l,gleiche_aufgabe}) {
      const dominates=(energyA,waterA,energyB,waterB)=>energyA<=energyB && waterA<=waterB && (energyA<energyB || waterA<waterB);
      return {im_limit:gleiche_aufgabe?[...(a_kwh<=limit_kwh && a_l<=limit_l?['A']:[]),...(b_kwh<=limit_kwh && b_l<=limit_l?['B']:[])]:null,
        vorteil:!gleiche_aufgabe?'unbekannt':dominates(a_kwh,a_l,b_kwh,b_l)?'A':dominates(b_kwh,b_l,a_kwh,a_l)?'B':a_kwh===b_kwh && a_l===b_l?'gleich':'zielkonflikt',
        hinweis:'Ein Zielkonflikt bleibt offen. Wasser und Strom werden nicht mit einem willkürlichen gemeinsamen Gewicht bewertet.'};
    },
    example:{args:{a_kwh:0.6,a_l:12,b_kwh:0.8,b_l:9,limit_kwh:0.7,limit_l:12,gleiche_aufgabe:true},
      expect:{im_limit:['A'],vorteil:'zielkonflikt'}}
  },
  {
    name:'brause_duschdauer_wasser_und_waerme_limit',
    description:'Längere Dusche nach Brausenwechsel gegen den bisherigen Wasser- und Wärmeverbrauch gleichzeitig abgleichen — Find a comparable shower duration that keeps both water and heat within the old use.',
    page:shower,
    properties:{
      vorher_l_min:number('Gemessener Durchfluss vorher, Liter pro Minute.',0.1,60),
      vorher_min:number('Beobachtete Duschdauer vorher in Minuten.',0,60),
      vorher_delta_k:number('Differenz von Kalt- zu Mischwasser vorher, Kelvin.',0,70),
      nachher_l_min:number('Gemessener Durchfluss der neuen Brause, Liter pro Minute.',0.1,60),
      nachher_delta_k:number('Differenz von Kalt- zu Mischwasser im neuen Szenario, Kelvin.',0,70),
    },
    calculate({vorher_l_min,vorher_min,vorher_delta_k,nachher_l_min,nachher_delta_k}) {
      const volume=vorher_l_min*vorher_min;
      const waterLimit=volume/nachher_l_min;
      const heatLimit=nachher_delta_k?volume*vorher_delta_k/(nachher_l_min*nachher_delta_k):null;
      return {grenze_wasser_min:round(waterLimit,4),grenze_nutzwaerme_min:heatLimit===null?null:round(heatLimit,4),
        gemeinsame_grenze_min:round(Math.min(waterLimit,heatLimit??Infinity),4),
        hinweis:'Vergleicht nur Mischwassermenge und Nutzwärme bei konstantem Durchfluss. Keine Temperatur- oder Brausenempfehlung.'};
    },
    example:{args:{vorher_l_min:10,vorher_min:6,vorher_delta_k:24,nachher_l_min:8,nachher_delta_k:30},
      expect:{grenze_wasser_min:7.5,grenze_nutzwaerme_min:6,gemeinsame_grenze_min:6}}
  },
  {
    name:'waesche_wochenbedarf_leine_und_trockner',
    description:'Ganze Wochenladungen zuerst auf verfügbare Leinenzyklen und dann auf gemessene Trocknerläufe verteilen — Check weekly dryer energy needed when outdoor or rack slots are limited.',
    page:laundry,
    properties:{
      ladungen:count('Gleich große trockenzubringende Ladungen in der betrachteten Woche.',50),
      leine_plaetze:count('Tatsächlich verfügbare Leinenplätze in derselben Woche, als vollständige Ladungen.',50),
      trockner_plaetze:count('Zusätzlich verfügbare vollständige Trocknerläufe in derselben Woche.',50),
      trockner_kwh_ladung:energy('Gemessene kWh je vollständige Trocknerladung für diesen Trocknungsgrad.'),
    },
    calculate({ladungen,leine_plaetze,trockner_plaetze,trockner_kwh_ladung}) {
      requireCounts(ladungen,leine_plaetze,trockner_plaetze);
      const line=Math.min(ladungen,leine_plaetze);
      const dryer=Math.min(ladungen-line,trockner_plaetze);
      return {leine_ladungen:line,trockner_ladungen:dryer,offene_ladungen:ladungen-line-dryer,
        direkte_trockner_kwh:round(dryer*trockner_kwh_ladung,4),
        hinweis:'Leine zuerst nur bei geeigneten Bedingungen. Raumwärme, Lüftung, Zeit und Handarbeit fehlen in den direkten kWh.'};
    },
    example:{args:{ladungen:7,leine_plaetze:4,trockner_plaetze:2,trockner_kwh_ladung:1.1},
      expect:{leine_ladungen:4,trockner_ladungen:2,offene_ladungen:1,direkte_trockner_kwh:2.2}}
  },
  {
    name:'strombudget_verbrauch_messspanne',
    description:'Ein kWh-Limit gegen die gemeinsame Messunsicherheit zweier getrennter Verbrauchsgruppen bewerten — Decide whether a budget is certainly met, exceeded, or unresolved under two measurement bounds.',
    page:meter,
    properties:{
      a_kwh:energy('Gemessene kWh der ersten Gruppe über den gesamten Budgetzeitraum.'),
      b_kwh:energy('Gemessene kWh der zweiten Gruppe im selben Zeitraum, ohne Überlappung.'),
      a_fehler_kwh:energy('Maximale absolute Messabweichung der ersten Gruppe in kWh.'),
      b_fehler_kwh:energy('Maximale absolute Messabweichung der zweiten Gruppe in kWh.'),
      budget_kwh:energy('KWh-Limit für diese beiden Gruppen in diesem Zeitraum.'),
    },
    calculate({a_kwh,b_kwh,a_fehler_kwh,b_fehler_kwh,budget_kwh}) {
      const lower=Math.max(0,a_kwh-a_fehler_kwh)+Math.max(0,b_kwh-b_fehler_kwh);
      const upper=a_kwh+a_fehler_kwh+b_kwh+b_fehler_kwh;
      return {moeglicher_verbrauch_kwh:[round(lower,4),round(upper,4)],
        status:upper<=budget_kwh+1e-9?'eingehalten':lower>budget_kwh+1e-9?'ueberschritten':'offen',
        hinweis:'Verwendet feste Fehlergrenzen beider Gruppen im selben Zeitraum. Die Spanne ist keine statistische Wahrscheinlichkeit.'};
    },
    example:{args:{a_kwh:4,b_kwh:2.5,a_fehler_kwh:0.2,b_fehler_kwh:0.4,budget_kwh:7},
      expect:{moeglicher_verbrauch_kwh:[5.9,7.1],status:'offen'}}
  },
  {
    name:'heizpause_durchlaufen_wiederaufheizen',
    description:'Für eine konkrete Abwesenheit die gemessene Wiederaufheizenergie gegen das Heizen in der Pause rechnen — Compare matched heating sessions with and without an intervening pause.',
    page:heating,
    properties:{
      pause_h:number('Geplante Abwesenheit zwischen zwei Nutzungsblöcken in Stunden.',0,120),
      weiter_kwh_h:energy('Gemessener Verbrauch pro Stunde beim Weiterbetrieb während der Pause.'),
      langsamer_kwh_h:energy('Gemessener Verbrauch pro Stunde bei abgesenkter Einstellung während der Pause.'),
      wieder_kwh:energy('Zusätzliche gemessene Energie zur Wiederherstellung derselben Nutzungstemperatur.'),
      gleiche_temperaturen:flag('Nutzungszustand zu Beginn und Ende sowie Außenbedingungen sind vergleichbar?'),
    },
    calculate({pause_h,weiter_kwh_h,langsamer_kwh_h,wieder_kwh,gleiche_temperaturen}) {
      const continuous=pause_h*weiter_kwh_h, restart=pause_h*langsamer_kwh_h+wieder_kwh;
      return {durchlaufen_kwh:round(continuous,4),pause_plus_wiederaufheizen_kwh:round(restart,4),
        beobachteter_vorteil_pause_kwh:gleiche_temperaturen?round(continuous-restart,4):null,
        hinweis:'Verwendet gemessene Werte und setzt denselben Endzustand voraus. Keine Empfehlung zur Mindesttemperatur oder Gerätefreigabe.'};
    },
    example:{args:{pause_h:3,weiter_kwh_h:0.8,langsamer_kwh_h:0.25,wieder_kwh:0.5,gleiche_temperaturen:true},
      expect:{durchlaufen_kwh:2.4,pause_plus_wiederaufheizen_kwh:1.25,beobachteter_vorteil_pause_kwh:1.15}}
  },
  {
    name:'stromkosten_preis_und_menge_abgleichen',
    description:'Änderungen zwischen zwei Stromperioden in Fixkosten-, Mengen- und Preiseffekt zerlegen — Reconcile a higher bill into fixed, usage, and rate effects by a fixed calculation order.',
    page:tariff,
    properties:{
      alt_kwh:energy('Verbrauch der alten, gleich langen Periode in kWh.'),
      neu_kwh:energy('Verbrauch der neuen Periode in kWh.'),
      alt_eur_kwh:price('Einheitlicher Brutto-Arbeitspreis der alten Periode.'),
      neu_eur_kwh:price('Einheitlicher Brutto-Arbeitspreis der neuen Periode.'),
      alt_fix_eur:euro('Fixkosten der alten Periode.'),
      neu_fix_eur:euro('Fixkosten der neuen Periode.'),
    },
    calculate({alt_kwh,neu_kwh,alt_eur_kwh,neu_eur_kwh,alt_fix_eur,neu_fix_eur}) {
      const usage=(neu_kwh-alt_kwh)*alt_eur_kwh;
      const rate=neu_kwh*(neu_eur_kwh-alt_eur_kwh);
      const fixed=neu_fix_eur-alt_fix_eur;
      return {mengenanteil_eur:round(usage),preisanteil_eur:round(rate),fixanteil_eur:round(fixed),
        gesamtveraenderung_eur:round(usage+rate+fixed),
        hinweis:'Rechnet zuerst die Menge zum alten Preis um und bewertet dann die neue Menge zum Preisunterschied. Bei anderer Reihenfolge verteilen sich die Effekte anders.'};
    },
    example:{args:{alt_kwh:100,neu_kwh:120,alt_eur_kwh:0.3,neu_eur_kwh:0.35,alt_fix_eur:10,neu_fix_eur:12},
      expect:{mengenanteil_eur:6,preisanteil_eur:6,fixanteil_eur:2,gesamtveraenderung_eur:14}}
  },
  {
    name:'stromrechnung_zeilenrundung_abgleichen',
    description:'Abweichung zwischen Einzelrundung mehrerer Preisintervalle und erst am Ende gerundetem Gesamtbetrag bestimmen — Reconcile per-line cents against rounding the combined electricity amount.',
    page:tariff,
    properties:{
      a_kwh:energy('kWh der ersten Rechnungsposition.'),
      b_kwh:energy('kWh der zweiten Rechnungsposition.'),
      c_kwh:energy('kWh der dritten Rechnungsposition.'),
      a_eur_kwh:price('Brutto-Arbeitspreis der ersten Position.'),
      b_eur_kwh:price('Brutto-Arbeitspreis der zweiten Position.'),
      c_eur_kwh:price('Brutto-Arbeitspreis der dritten Position.'),
    },
    calculate({a_kwh,b_kwh,c_kwh,a_eur_kwh,b_eur_kwh,c_eur_kwh}) {
      const raw=[a_kwh*a_eur_kwh,b_kwh*b_eur_kwh,c_kwh*c_eur_kwh];
      const cents=value=>Math.sign(value)*Math.round((Math.abs(value)+Number.EPSILON)*100);
      const perLine=raw.map(cents).reduce((a,b)=>a+b,0);
      const total=cents(raw.reduce((a,b)=>a+b,0));
      return {einzelrundung_eur:perLine/100,gesamtrundung_eur:total/100,differenz_cent:perLine-total,
        hinweis:'Ein Rechenszenario mit drei bruttobepreisten Positionen. Beim Anbieter können weitere Tarifbestandteile oder andere Regeln gelten.'};
    },
    example:{args:{a_kwh:1,b_kwh:1,c_kwh:1,a_eur_kwh:0.333,b_eur_kwh:0.333,c_eur_kwh:0.333},
      expect:{einzelrundung_eur:0.99,gesamtrundung_eur:1,differenz_cent:-1}}
  },
  {
    name:'beleuchtung_schaltgruppen_belegung',
    description:'Strombedarf zweier separat schaltbarer Leuchtengruppen mit gemeinsamem und getrenntem Nutzungsanteil vergleichen — Estimate the benefit of separately switching two light groups during partly shared use.',
    page:resource,
    properties:{
      a_w:number('Gemessene Leistungsaufnahme Leuchtengruppe A in Watt.',0,10000),
      b_w:number('Gemessene Leistungsaufnahme Leuchtengruppe B in Watt.',0,10000),
      nur_a_h:number('Stunden, in denen nur Gruppe A benötigt wird.',0,24),
      nur_b_h:number('Stunden, in denen nur Gruppe B benötigt wird.',0,24),
      beide_h:number('Stunden, in denen beide Gruppen benötigt werden.',0,24),
    },
    calculate({a_w,b_w,nur_a_h,nur_b_h,beide_h}) {
      if (nur_a_h+nur_b_h+beide_h>24) throw new RangeError('Zeitanteile müssen einen Kalendertag beschreiben');
      const grouped=(a_w+b_w)*(nur_a_h+nur_b_h+beide_h)/1000;
      const separate=(a_w*(nur_a_h+beide_h)+b_w*(nur_b_h+beide_h))/1000;
      return {gemeinsam_schalten_kwh:round(grouped,4),getrennt_schalten_kwh:round(separate,4),
        vermeidbarer_verbrauch_kwh:round(grouped-separate,4),
        hinweis:'Vergleicht Schaltzeiten bei gegebener Ausstattung. Keine Arbeiten an der Installation und keine Bewertung der Beleuchtungsgüte.'};
    },
    example:{args:{a_w:20,b_w:30,nur_a_h:2,nur_b_h:1,beide_h:1},
      expect:{gemeinsam_schalten_kwh:0.2,getrennt_schalten_kwh:0.12,vermeidbarer_verbrauch_kwh:0.08}}
  },
  {
    name:'geraetelauf_aufsichtswechsel_zeitplan',
    description:'Eine Aufgabe mit getrennten Start- und Endhandgriffen gegen tatsächlich besetzte Zeitfenster prüfen — Find a feasible finish when different people handle launch and unload at known times.',
    page:laundry,
    properties:{
      lauf_min:number('Beobachtete Dauer des unbeeinflussten Programms in Minuten.',1,1440),
      a_bis_min:number('Letzter möglicher Start durch Person A, Minuten seit Beginn des Planungstages.',0,1439),
      b_von_min:number('Früheste mögliche Entnahme durch Person B, Minuten seit Beginn des Planungstages.',0,1439),
      b_bis_min:number('Letzte mögliche Entnahme durch Person B, Minuten seit Beginn des Planungstages.',0,1439),
      warte_limit_min:number('Selbst gewählte maximale Zeit von Ende bis Entnahme.',0,360),
      betrieb_erlaubt:flag('Hersteller erlaubt die geplante Betriebsart und Haushaltsregeln sind geprüft?'),
    },
    calculate({lauf_min,a_bis_min,b_von_min,b_bis_min,warte_limit_min,betrieb_erlaubt}) {
      if (b_bis_min<b_von_min) throw new RangeError('Entnahmefenster vertauscht');
      const first=Math.max(0,b_von_min-warte_limit_min-lauf_min);
      const last=Math.min(a_bis_min,b_bis_min-lauf_min);
      return {startfenster_min:betrieb_erlaubt&&first<=last?[round(first,4),round(last,4)]:null,
        betriebsart_bestaetigt:betrieb_erlaubt,
        hinweis:'Person A kann von Tagesbeginn bis zum angegebenen Ende starten. Liefert nur Zeitplanung, keine Gerätefreigabe.'};
    },
    example:{args:{lauf_min:100,a_bis_min:620,b_von_min:740,b_bis_min:800,warte_limit_min:40,betrieb_erlaubt:true},
      expect:{startfenster_min:[600,620],betriebsart_bestaetigt:true}}
  },
  {
    name:'haushalt_strommessgeraete_wochenrotation',
    description:'Geeignete Messgeräte für vollständige Wochenprotokolle auf mehrere Geräte verteilen — Plan how many non-overlapping batches of simultaneous household measurements are needed.',
    page:meter,
    properties:{
      geraete:count('Anzahl Haushaltsgeräte mit jeweils einem vollständigen Protokoll.',100),
      messgeraete:number('Anzahl tatsächlich geeigneter und frei verfügbarer Messgeräte.',1,100),
      protokoll_tage:number('Gleiche feste Protokolldauer je Haushaltsgerät in Tagen.',1,60),
      zeitbudget_tage:count('Gesamter verfügbarer Zeitraum in Tagen.'),
    },
    calculate({geraete,messgeraete,protokoll_tage,zeitbudget_tage}) {
      requireCounts(geraete,messgeraete,protokoll_tage,zeitbudget_tage);
      const rounds=Math.ceil(geraete/messgeraete);
      const covered=Math.min(geraete,Math.floor(zeitbudget_tage/protokoll_tage)*messgeraete);
      return {messrunden_benoetigt:rounds,fruehester_gesamtabschluss_tage:rounds*protokoll_tage,
        im_zeitbudget_vollstaendig:covered,noch_offen:geraete-covered,
        hinweis:'Gleiche Protokolldauer und vollständig verfügbare geeignete Messgeräte vorausgesetzt. Keine elektrischen Anschluss- oder Lastfreigaben.'};
    },
    example:{args:{geraete:5,messgeraete:2,protokoll_tage:7,zeitbudget_tage:14},
      expect:{messrunden_benoetigt:3,fruehester_gesamtabschluss_tage:21,im_zeitbudget_vollstaendig:4,noch_offen:1}}
  },
  {
    name:'haushaltsgeraete_tagesfenster_energierahmen',
    description:'Energierahmen aufeinanderfolgender Routinen aus einem eigenen mittleren Verbrauchsziel bestimmen — Allocate a household energy envelope to a timed block and show the remainder.',
    page:power,
    properties:{
      block_h:number('Geplante Gesamtdauer des eigenen Betrachtungsblocks in Stunden.',0.25,24),
      eigenes_mittel_kw:number('Selbst gewähltes durchschnittliches Verbrauchsziel für den Block in kW.',0,50),
      verbindlich_kwh:energy('Erwartete, unverzichtbare gemessene kWh im Block.'),
      optional_kwh:energy('Zusätzliche erwartete kWh für eine optionale vollständige Routine im Block.'),
    },
    calculate({block_h,eigenes_mittel_kw,verbindlich_kwh,optional_kwh}) {
      const envelope=block_h*eigenes_mittel_kw;
      const used=verbindlich_kwh+optional_kwh;
      return {energierahmen_kwh:round(envelope,4),
        option_passt:used<=envelope+1e-9, durchschnitt_mit_option_kw:round(used/block_h,4),
        fehlend_mit_option_kwh:round(Math.max(0,used-envelope),4),
        hinweis:'Nur ein arithmetischer Mittelwert über den gesamten Zeitblock. Er beschreibt keine Spitzenlast, Anschlussleistung oder technische Sicherheit.'};
    },
    example:{args:{block_h:4,eigenes_mittel_kw:0.5,verbindlich_kwh:1.3,optional_kwh:0.9},
      expect:{energierahmen_kwh:2,option_passt:false,durchschnitt_mit_option_kw:0.55,fehlend_mit_option_kwh:0.2}}
  },
];
