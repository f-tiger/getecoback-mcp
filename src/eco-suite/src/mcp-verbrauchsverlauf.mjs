const meter = '/strommess-protokoll.html';
const tariff = '/stromtarif-werkstatt.html';
const power = '/guide/stromkosten-rechner.html';
const water = '/guide/duschen-kosten-rechner.html';
const heat = '/guide/heizkosten-vergleich-rechner.html';
const drying = '/waeschetrockner-oder-luftentfeuchter.html';
const cooling = '/guide/klimaanlage-stromkosten.html';
const efficiency = '/guide/strom-sparen-haushalt.html';

const number = (description, minimum = 0, maximum = 1000000) => ({type:'number', description, minimum, maximum});
const days = (description, minimum = 0) => number(description, minimum, 3660);
const count = (description, minimum = 0) => number(description, minimum, 1000000);
const minutes = (description, minimum = 0) => number(description, minimum, 5270400);
const rate = description => number(description, 0, 1000);
const boolean = description => ({type:'boolean', description});
const choice = (description, ...values) => ({type:'string', description, enum:values});
const round = value => Math.round(value*10000)/10000;
function whole(...values) {
  if (!values.every(Number.isInteger)) throw new RangeError('Ganze Tage oder Anzahlen erforderlich.');
}

export const verbrauchsverlauf = [
  {
    name:'geraeteverlauf_zyklus_randschnitt',
    description:'Angefangene und vollständig gemessene Gerätezyklen für den Verbrauch je Nutzung trennen — Keep cycles cut by the start or end of a log out of the complete-cycle mean.',
    page:drying,
    properties:{
      vollstaendige_zyklen:count('Zahl vollständig beobachteter Zyklen mit gleichen Endbedingungen.'),
      kwh_vollstaendig:number('kWh ausschließlich der vollständig beobachteten Zyklen.'),
      kwh_anfangsfragment:number('kWh des angeschnittenen Zyklus am Anfang, sonst 0.'),
      kwh_endfragment:number('kWh des angeschnittenen Zyklus am Ende, sonst 0. Beide Fragmente überschneiden sich nicht.'),
    },
    calculate({vollstaendige_zyklen,kwh_vollstaendig,kwh_anfangsfragment,kwh_endfragment}) {
      whole(vollstaendige_zyklen);
      if (!vollstaendige_zyklen&&kwh_vollstaendig) throw new RangeError('Energie kompletter Zyklen ohne beobachteten Zyklus.');
      return {beobachtet_kwh:round(kwh_vollstaendig+kwh_anfangsfragment+kwh_endfragment),
        kwh_pro_vollstaendigem_zyklus:vollstaendige_zyklen?round(kwh_vollstaendig/vollstaendige_zyklen):null,
        ausgeschlossene_fragment_kwh:round(kwh_anfangsfragment+kwh_endfragment),
        hinweis:'Fragmentenergie ist für den Zeitraum sichtbar, aber kein abgeschlossener Nutzungsfall.'};
    },
    example:{args:{vollstaendige_zyklen:3,kwh_vollstaendig:5.4,kwh_anfangsfragment:0.4,kwh_endfragment:0.2},expect:{beobachtet_kwh:6,kwh_pro_vollstaendigem_zyklus:1.8,ausgeschlossene_fragment_kwh:0.6}},
  },
  {
    name:'entfeuchter_standzeit_ereignis_wartefenster',
    description:'Eine noch laufende Wartezeit nach dem Abschalten mit einer früheren gemessenen Wiederanlaufpause vergleichen — Distinguish a still-censored off interval from an observed delay.',
    page:'/guide/luftentfeuchter-dauerbetrieb-stromkosten.html',
    properties:{
      referenz_pause_min:minutes('Frühere vollständig beobachtete Pause zwischen Abschalten und Wiederanlauf.',0.001),
      fenster_bis_jetzt_min:minutes('Aktueller Beobachtungszeitraum seit dem Abschalten.'),
      wiederanlauf_min:minutes('Aktuelle Minuten bis zum beobachteten Wiederanlauf, sonst 0.'),
      wieder_an:boolean('Wurde innerhalb des Fensters ein aktueller Wiederanlauf tatsächlich beobachtet?'),
      gleiches_protokoll:boolean('Sind Auslöser, Einstellung und Messmethode der Pausen vergleichbar?'),
    },
    calculate({referenz_pause_min,fenster_bis_jetzt_min,wiederanlauf_min,wieder_an,gleiches_protokoll}) {
      if (wiederanlauf_min>fenster_bis_jetzt_min||(!wieder_an&&wiederanlauf_min)) throw new RangeError('Wiederanlauf und Fenster widersprechen sich.');
      const covered=wieder_an?wiederanlauf_min:fenster_bis_jetzt_min;
      return {pause_mindestens_min:covered,volle_pause_min:wieder_an?wiederanlauf_min:null,
        laenger_als_referenz:gleiches_protokoll?(covered>referenz_pause_min?true:wieder_an?false:null):null,
        hinweis:'Ein bis Protokollende nicht beobachteter Start beweist keinen Defekt und keinen späteren Startzeitpunkt.'};
    },
    example:{args:{referenz_pause_min:25,fenster_bis_jetzt_min:30,wiederanlauf_min:0,wieder_an:false,gleiches_protokoll:true},expect:{pause_mindestens_min:30,volle_pause_min:null,laenger_als_referenz:true}},
  },
  {
    name:'stromjournal_umstellung_uebergangszeit_ausgrenzen',
    description:'Eine dokumentierte Übergangsphase beim Nutzungswechsel vom Vorher-Nachher-Vergleich abtrennen — Exclude the transition period from a before/after consumption comparison.',
    page:meter,
    properties:{
      vor_tage:days('Vollständige Tage vor der Änderung.',1),
      vor_kwh:number('Gemessener Verbrauch der vollständigen Tage vor der Änderung.'),
      uebergang_tage:days('Separat dokumentierte Übergangstage.'),
      uebergang_kwh:number('Verbrauch ausschließlich der Übergangstage.'),
      nach_tage:days('Vollständige Tage unter dem neuen Nutzungsablauf.',1),
      nach_kwh:number('Gemessener Verbrauch unter dem neuen Nutzungsablauf.'),
      aufgabe_gleich:boolean('Gleiche erfasste Geräte und vergleichbare Haushaltsaufgabe?'),
    },
    calculate({vor_tage,vor_kwh,uebergang_tage,uebergang_kwh,nach_tage,nach_kwh,aufgabe_gleich}) {
      whole(vor_tage,uebergang_tage,nach_tage);
      if (!uebergang_tage&&uebergang_kwh) throw new RangeError('Übergangsverbrauch ohne Übergangstage.');
      const before=vor_kwh/vor_tage;
      const after=nach_kwh/nach_tage;
      return {vor_kwh_tag:round(before),nach_kwh_tag:round(after),uebergang_separat_kwh:uebergang_kwh,
        stabile_aenderung_kwh_tag:aufgabe_gleich?round(after-before):null,
        hinweis:'Eine Änderung nach dem Übergang belegt keine Ursache. Wetter oder Nutzungsintensität gesondert notieren.'};
    },
    example:{args:{vor_tage:5,vor_kwh:30,uebergang_tage:2,uebergang_kwh:28,nach_tage:5,nach_kwh:25,aufgabe_gleich:true},expect:{vor_kwh_tag:6,nach_kwh_tag:5,uebergang_separat_kwh:28,stabile_aenderung_kwh_tag:-1}},
  },
  {
    name:'stromausfall_nachlauf_und_ruhe',
    description:'Stromaufnahme nach einer dokumentierten Unterbrechung vom vorherigen Ruhen und einem Folgetag abgrenzen — Compare a measured restart block against a separate same-duration idle baseline.',
    page:meter,
    properties:{
      block_min:minutes('Länge beider tatsächlich beobachteter Vergleichsfenster.',1),
      nach_wiederkehr_wh:number('Verbrauch nach Stromwiederkehr in Wh.'),
      normalruhe_wh:number('Verbrauch eines Fensters gleicher Länge ohne Unterbrechung und ohne übliche aktive Nutzung, in Wh.'),
      folgetag_wh:number('Verbrauch eines dritten gleich langen Fensters am Folgetag, in Wh.'),
      gleiche_verbraucher:boolean('Sind Zählerumfang und übliche Lasten in allen Fenstern tatsächlich vergleichbar?'),
    },
    calculate({block_min,nach_wiederkehr_wh,normalruhe_wh,folgetag_wh,gleiche_verbraucher}) {
      const nach=nach_wiederkehr_wh-normalruhe_wh;
      const folge=folgetag_wh-normalruhe_wh;
      return {vergleichsfenster_min:block_min,wiederkehr_minus_ruhe_wh:gleiche_verbraucher?round(nach):null,
        folgetag_minus_ruhe_wh:gleiche_verbraucher?round(folge):null,
        erhoehung_nur_im_wiederkehrfenster:gleiche_verbraucher?nach>0&&folge<=0:null,
        hinweis:'Zeitliche Zuordnung zu dokumentierten Fenstern. Keine Arbeit an der Installation und kein Nachweis der verursachenden Geräte.'};
    },
    example:{args:{block_min:90,nach_wiederkehr_wh:180,normalruhe_wh:130,folgetag_wh:128,gleiche_verbraucher:true},expect:{wiederkehr_minus_ruhe_wh:50,folgetag_minus_ruhe_wh:-2,erhoehung_nur_im_wiederkehrfenster:true}},
  },
  {
    name:'strompreis_grenzblock_kostenband',
    description:'Die Kosten einer ungeteilten Verbrauchsmenge direkt am Tarifwechsel eingrenzen — Bound charges for a metered block that straddles a known rate boundary.',
    page:tariff,
    properties:{
      vor_sicher_kwh:number('Menge vollständig vor der Preisgrenze.'),
      danach_sicher_kwh:number('Menge vollständig nach der Preisgrenze.'),
      grenzblock_kwh:number('Nur der beiden Zeitfenstern noch nicht zuordenbare, separat gemessene Verbrauchsblock.'),
      vor_cent_kwh:rate('Belegter variabler Preis vor der Grenze in Cent/kWh.'),
      danach_cent_kwh:rate('Belegter variabler Preis nach der Grenze in Cent/kWh.'),
    },
    calculate({vor_sicher_kwh,danach_sicher_kwh,grenzblock_kwh,vor_cent_kwh,danach_cent_kwh}) {
      const base=vor_sicher_kwh*vor_cent_kwh+danach_sicher_kwh*danach_cent_kwh;
      return {sicher_zugeordnet_euro:round(base/100),untergrenze_euro:round((base+grenzblock_kwh*Math.min(vor_cent_kwh,danach_cent_kwh))/100),
        obergrenze_euro:round((base+grenzblock_kwh*Math.max(vor_cent_kwh,danach_cent_kwh))/100),
        hinweis:'Erfasst ausschließlich den Arbeitspreis und vergibt die unbekannte Grenzmenge an keinen festen Zeitraum.'};
    },
    example:{args:{vor_sicher_kwh:100,danach_sicher_kwh:80,grenzblock_kwh:20,vor_cent_kwh:25,danach_cent_kwh:35},expect:{sicher_zugeordnet_euro:53,untergrenze_euro:58,obergrenze_euro:60}},
  },
  {
    name:'stromrechnung_stichtag_kostenverschiebung',
    description:'Kosten einer belegten Korrektur des Zwischenstands bei unveränderten Endständen nachvollziehen — Reprice a verified boundary-reading correction without changing total consumption.',
    page:tariff,
    properties:{
      start_kwh:number('Kumulierter Stand am Anfang.'),
      ende_kwh:number('Kumulierter Stand am Ende.'),
      alter_schnitt_kwh:number('Früher angesetzter kumulierter Stand am Tarifwechsel.'),
      korrigierter_schnitt_kwh:number('Korrigierter kumulierter Stand am Tarifwechsel.'),
      vor_cent_kwh:rate('Belegter Arbeitspreis vor dem Stichtag.'),
      nach_cent_kwh:rate('Belegter Arbeitspreis ab dem Stichtag.'),
    },
    calculate({start_kwh,ende_kwh,alter_schnitt_kwh,korrigierter_schnitt_kwh,vor_cent_kwh,nach_cent_kwh}) {
      if (start_kwh>Math.min(alter_schnitt_kwh,korrigierter_schnitt_kwh)||ende_kwh<Math.max(alter_schnitt_kwh,korrigierter_schnitt_kwh)) throw new RangeError('Stände müssen auf demselben aufsteigenden Register liegen.');
      const moved=korrigierter_schnitt_kwh-alter_schnitt_kwh;
      return {gesamt_unveraendert_kwh:round(ende_kwh-start_kwh),verschoben_in_fruehere_periode_kwh:round(moved),
        neue_periode_vor_kwh:round(korrigierter_schnitt_kwh-start_kwh),neue_periode_nach_kwh:round(ende_kwh-korrigierter_schnitt_kwh),
        arbeitskosten_neu_minus_alt_euro:round(moved*(vor_cent_kwh-nach_cent_kwh)/100)};
    },
    example:{args:{start_kwh:100,ende_kwh:400,alter_schnitt_kwh:200,korrigierter_schnitt_kwh:220,vor_cent_kwh:25,nach_cent_kwh:35},expect:{gesamt_unveraendert_kwh:300,verschoben_in_fruehere_periode_kwh:20,arbeitskosten_neu_minus_alt_euro:-2}},
  },
  {
    name:'stromablesung_mittleren_wert_korrigieren',
    description:'Einen korrigierten Zwischenstand in den beiden benachbarten Verbrauchsintervallen fortschreiben — Propagate one replaced historical meter reading into exactly two incident intervals.',
    page:meter,
    properties:{
      frueher_kwh:number('Bestätigter Stand vor der korrigierten Ablesung.'),
      spaeter_kwh:number('Bestätigter Stand nach der korrigierten Ablesung.'),
      fraglich_kwh:number('Bisher erfasster Zwischenstand.'),
      ersetzt_kwh:number('Durch einen Beleg ersetzter Zwischenstand.'),
      selbes_register:boolean('Alle Stände demselben unveränderten Register zugeordnet?'),
    },
    calculate({frueher_kwh,spaeter_kwh,fraglich_kwh,ersetzt_kwh,selbes_register}) {
      if (!selbes_register||spaeter_kwh<frueher_kwh||ersetzt_kwh<frueher_kwh||ersetzt_kwh>spaeter_kwh) return {status:'register_und_ablesung_pruefen',intervall_vor_kwh:null,intervall_nach_kwh:null};
      const valid=fraglich_kwh>=frueher_kwh&&fraglich_kwh<=spaeter_kwh;
      return {status:valid?'zwischenstand_ersetzt':'frueherer_zwischenstand_unplausibel',
        intervall_vor_kwh:round(ersetzt_kwh-frueher_kwh),intervall_nach_kwh:round(spaeter_kwh-ersetzt_kwh),
        gesamtdifferenz_kwh:round(spaeter_kwh-frueher_kwh),alter_verlauf_einsetzbar:valid};
    },
    example:{args:{frueher_kwh:200,spaeter_kwh:270,fraglich_kwh:290,ersetzt_kwh:240,selbes_register:true},expect:{status:'frueherer_zwischenstand_unplausibel',intervall_vor_kwh:40,intervall_nach_kwh:30,alter_verlauf_einsetzbar:false}},
  },
  {
    name:'stromrechnung_preisperioden_gegenprobe',
    description:'Gleich hohe Gesamtkilowattstunden auf vertauschte abgerechnete Preisperioden prüfen — Detect a possible swap of pre- and post-change invoice quantities.',
    page:tariff,
    properties:{
      mess_vor_kwh:number('Bestätigter Verbrauch vor der Preisgrenze.'),
      mess_nach_kwh:number('Bestätigter Verbrauch nach der Preisgrenze.'),
      rechnung_vor_kwh:number('Vor der Preisgrenze abgerechnete Menge.'),
      rechnung_nach_kwh:number('Nach der Preisgrenze abgerechnete Menge.'),
      toleranz_kwh:number('Eigene Prüfspanne je Zeile, etwa wegen Anzeigerundung.',0,1000),
    },
    calculate({mess_vor_kwh,mess_nach_kwh,rechnung_vor_kwh,rechnung_nach_kwh,toleranz_kwh}) {
      const near=(a,b)=>Math.abs(a-b)<=toleranz_kwh+1e-9;
      const aligned=near(mess_vor_kwh,rechnung_vor_kwh)&&near(mess_nach_kwh,rechnung_nach_kwh);
      const swapped=near(mess_vor_kwh,rechnung_nach_kwh)&&near(mess_nach_kwh,rechnung_vor_kwh);
      return {status:aligned?(swapped?'perioden_innerhalb_toleranz_nicht_unterscheidbar':'periodenstimmig'):swapped?'periodentausch_pruefen':'weitere_abweichung_klaeren',
        gesamt_diff_kwh:round(rechnung_vor_kwh+rechnung_nach_kwh-mess_vor_kwh-mess_nach_kwh),
        hinweis:'Zeitstichtage und Zählerzuordnung anhand der Originalbelege prüfen.'};
    },
    example:{args:{mess_vor_kwh:90,mess_nach_kwh:110,rechnung_vor_kwh:110,rechnung_nach_kwh:90,toleranz_kwh:1},expect:{status:'periodentausch_pruefen',gesamt_diff_kwh:0}},
  },
  {
    name:'wasserverlauf_allein_doppelt_belegung',
    description:'Beobachtete Wasserentnahme von Ein- und Zweipersonentagen gegen zwei persönliche Routinen prüfen — Compare shared occupancy consumption with both observed solo routines.',
    page:water,
    properties:{
      nur_a_l_tag:number('Beobachtete Liter pro Tag, an dem ausschließlich A anwesend war.'),
      nur_b_l_tag:number('Beobachtete Liter pro Tag, an dem ausschließlich B anwesend war.'),
      beide_l_tag:number('Beobachtete Liter pro Tag mit beiden Personen.'),
      einmal_gemeinsam_l_tag:number('In beiden Solomessungen enthaltene, bei gemeinsamer Anwesenheit jedoch nur einmal anfallende beobachtete Aufgabe in Litern.'),
      aufgabe_gleich:boolean('Sind Tagesdauer, Wasserzählerumfang und erledigte Aufgaben vergleichbar?'),
    },
    calculate({nur_a_l_tag,nur_b_l_tag,beide_l_tag,einmal_gemeinsam_l_tag,aufgabe_gleich}) {
      if (einmal_gemeinsam_l_tag>Math.min(nur_a_l_tag,nur_b_l_tag)) throw new RangeError('Gemeinsamer Anteil übersteigt eine Solomessung.');
      const ref=nur_a_l_tag+nur_b_l_tag-einmal_gemeinsam_l_tag;
      return {solo_aufgaben_einmal_l_tag:aufgabe_gleich?round(ref):null,beide_minus_vergleich_l_tag:aufgabe_gleich?round(beide_l_tag-ref):null,
        hinweis:'Eine Abweichung kann aus anderen Gewohnheiten entstehen; keine personengenaue Verbrauchszurechnung.'};
    },
    example:{args:{nur_a_l_tag:70,nur_b_l_tag:80,beide_l_tag:120,einmal_gemeinsam_l_tag:20,aufgabe_gleich:true},expect:{solo_aufgaben_einmal_l_tag:130,beide_minus_vergleich_l_tag:-10}},
  },
  {
    name:'heizverbrauch_lueftungsereignis_zeitfolge',
    description:'Ein Heizsignal als vor, nach oder zeitlich nicht eindeutig zu einem Lüftungsereignis einordnen — Check whether time uncertainty permits temporal attribution of a heating response.',
    page:'/guide/richtig-lueften-im-winter.html',
    properties:{
      lueften_ab_min:minutes('Frühestmöglicher Lüftungsbeginn auf gemeinsamer Uhr.'),
      lueften_bis_min:minutes('Spätestmöglicher Lüftungsbeginn auf derselben Uhr.'),
      heizsignal_ab_min:minutes('Frühestmöglicher Beginn des beobachteten Heizsignals.'),
      heizsignal_bis_min:minutes('Spätestmöglicher Beginn des beobachteten Heizsignals.'),
    },
    calculate({lueften_ab_min,lueften_bis_min,heizsignal_ab_min,heizsignal_bis_min}) {
      if (lueften_ab_min>lueften_bis_min||heizsignal_ab_min>heizsignal_bis_min) throw new RangeError('Zeitgrenzen sind nicht aufsteigend.');
      const first=heizsignal_ab_min-lueften_bis_min;
      const last=heizsignal_bis_min-lueften_ab_min;
      return {zeitfolge:first>0?'heizen_sicher_spaeter':last<0?'heizen_sicher_frueher':'zeitfolge_offen',
        fruehester_abstand_min:round(first),spaetester_abstand_min:round(last),hinweis:'Die Reihenfolge allein zeigt keine Ursache.'};
    },
    example:{args:{lueften_ab_min:50,lueften_bis_min:58,heizsignal_ab_min:56,heizsignal_bis_min:65},expect:{zeitfolge:'zeitfolge_offen',fruehester_abstand_min:-2,spaetester_abstand_min:15}},
  },
  {
    name:'stromverlauf_freie_und_belegte_stunden',
    description:'Mehrverbrauch einer teilweise belegten Phase aus separat belegten Ruhe- und Nutzungsstunden herauslesen — Assess the energy associated with occupied hours without treating every calendar hour as use.',
    page:efficiency,
    properties:{
      phase_stunden:number('Gemessene Dauer des gesamten späteren Fensters in Stunden.',0.001,8760),
      belegte_stunden:number('Dokumentierte tatsächlich belegte Stunden innerhalb des Fensters.',0,8760),
      phase_wh:number('Gemessene Gesamtenergie des späteren Fensters in Wh.'),
      ruhe_wh_stunde:number('In einer separat gemessenen, vergleichbaren Ruhephase ermittelte Wh je Stunde.'),
    },
    calculate({phase_stunden,belegte_stunden,phase_wh,ruhe_wh_stunde}) {
      if (belegte_stunden>phase_stunden) throw new RangeError('Belegung liegt außerhalb der Messphase.');
      const quiet=(phase_stunden-belegte_stunden)*ruhe_wh_stunde;
      if (quiet>phase_wh+1e-9) return {status:'ruheschatzung_pruefen',belegte_wh_stunde:null};
      return {status:'ruheanteil_eingeordnet',ruhezeit_wh_modell:round(quiet),
        belegte_wh_stunde:belegte_stunden?round((phase_wh-quiet)/belegte_stunden):null,
        hinweis:'Ruherate gilt hier nur für unbelegte Stunden. Eine unveränderte Grundlast für belegte Stunden wird nicht angenommen.'};
    },
    example:{args:{phase_stunden:20,belegte_stunden:5,phase_wh:600,ruhe_wh_stunde:20},expect:{ruhezeit_wh_modell:300,belegte_wh_stunde:60}},
  },
  {
    name:'stromhistorie_strukturbruch_drei_fenster',
    description:'Einen beobachteten Stromverbrauchssprung zwischen drei geordneten Messfenstern von einer einmaligen Spitze unterscheiden — Screen a documented change against a following persistence check.',
    page:meter,
    properties:{
      basis_kwh:number('Verbrauch im gleich langen Fenster vor dem bekannten Ereignis.'),
      direkt_kwh:number('Verbrauch im gleich langen ersten Fenster nach dem Ereignis.'),
      spaeter_kwh:number('Verbrauch im gleich langen zweiten Fenster nach dem Ereignis.'),
      mindestabstand_kwh:number('Eigener positiver Prüfspielraum für eine Abweichung.',0.001),
      messaufgabe_gleich:boolean('Sind Messumfang und Haushaltsaufgabe vergleichbar geblieben?'),
    },
    calculate({basis_kwh,direkt_kwh,spaeter_kwh,mindestabstand_kwh,messaufgabe_gleich}) {
      const early=direkt_kwh-basis_kwh;
      const late=spaeter_kwh-basis_kwh;
      const a=Math.abs(early)>=mindestabstand_kwh;
      const b=Math.abs(late)>=mindestabstand_kwh;
      const status=!messaufgabe_gleich?'vergleich_offen':a&&b&&Math.sign(early)===Math.sign(late)?'gleiche_richtung_beide_fenster':a&&b?'richtungswechsel':a?'nur_fruehes_fenster':b?'nur_spaetes_fenster':'beide_im_pruefspielraum';
      return {status,fruehe_abweichung_kwh:messaufgabe_gleich?round(early):null,spaete_abweichung_kwh:messaufgabe_gleich?round(late):null,
        hinweis:'Zwei spätere Beobachtungen belegen keine dauerhafte Entwicklung oder Ursache.'};
    },
    example:{args:{basis_kwh:32,direkt_kwh:50,spaeter_kwh:33,mindestabstand_kwh:5,messaufgabe_gleich:true},expect:{status:'nur_fruehes_fenster',fruehe_abweichung_kwh:18,spaete_abweichung_kwh:1}},
  },
  {
    name:'stromverlauf_aktualisierung_resttage',
    description:'Seit der letzten Planung beobachtete Tage einsetzen und nur die noch offenen Tage neu ansetzen — Roll forward a historical energy projection by keeping observations and future assumptions separate.',
    page:power,
    properties:{
      plan_tage:days('Zahl Tage im bereits definierten Gesamtfenster.',1),
      bisher_gemessen_tage:days('Bereits vollständige beobachtete Tage.'),
      angefangen_gemessen_kwh:number('Belegter Verbrauch dieser vollständigen Tage.'),
      urspruenglich_kwh_tag:number('Früher im gesamten Fenster angenommener Verbrauch pro Tag.'),
      neu_rest_kwh_tag:number('Aktuell nur für die noch offenen Tage angenommener Verbrauch pro Tag.'),
    },
    calculate({plan_tage,bisher_gemessen_tage,angefangen_gemessen_kwh,urspruenglich_kwh_tag,neu_rest_kwh_tag}) {
      whole(plan_tage,bisher_gemessen_tage);
      if (bisher_gemessen_tage>plan_tage||(!bisher_gemessen_tage&&angefangen_gemessen_kwh)) throw new RangeError('Bisherige Tage und Verbrauch passen nicht zusammen.');
      const remaining=plan_tage-bisher_gemessen_tage;
      return {beobachtet_kwh:angefangen_gemessen_kwh,offene_tage:remaining,restannahme_kwh:round(remaining*neu_rest_kwh_tag),
        korrektur_bis_heute_kwh:round(angefangen_gemessen_kwh-bisher_gemessen_tage*urspruenglich_kwh_tag),
        planrevision_rest_kwh:round(remaining*(neu_rest_kwh_tag-urspruenglich_kwh_tag)),stand_einschliesslich_annahme_kwh:round(angefangen_gemessen_kwh+remaining*neu_rest_kwh_tag)};
    },
    example:{args:{plan_tage:30,bisher_gemessen_tage:12,angefangen_gemessen_kwh:72,urspruenglich_kwh_tag:5,neu_rest_kwh_tag:4},expect:{offene_tage:18,restannahme_kwh:72,korrektur_bis_heute_kwh:12,planrevision_rest_kwh:-18,stand_einschliesslich_annahme_kwh:144}},
  },
  {
    name:'stromverlauf_budgetgrenze_ablesungen',
    description:'Ermitteln, zwischen welchen bestätigten Ablesungen der kumulierte Verbrauch erstmals das eigene Budget erreichte — Bracket the first threshold crossing in a monotone three-reading history.',
    page:power,
    properties:{
      erster_kwh:number('Erster Verbrauchsstand relativ zum Beginn des Budgets.'),
      zweiter_kwh:number('Zweiter Verbrauchsstand auf derselben relativen Skala.'),
      dritter_kwh:number('Dritter Verbrauchsstand auf derselben relativen Skala.'),
      grenze_kwh:number('Gewählte positive Budgetgrenze in kWh.',0.001),
      monoton_belegt:boolean('Einheit, Register und durchgehend kumulierende Verbrauchsmessung sind bestätigt?'),
    },
    calculate({erster_kwh,zweiter_kwh,dritter_kwh,grenze_kwh,monoton_belegt}) {
      if (!monoton_belegt||erster_kwh>zweiter_kwh||zweiter_kwh>dritter_kwh) return {erreicht:null,erstes_ableseintervall:null};
      const bounds=grenze_kwh<=erster_kwh?'spaetestens_bei_erster':grenze_kwh<=zweiter_kwh?'nach_erster_bis_zweiter':grenze_kwh<=dritter_kwh?'nach_zweiter_bis_dritter':null;
      return {erreicht:bounds!==null,erstes_ableseintervall:bounds,rest_nach_dritter_kwh:round(Math.max(0,grenze_kwh-dritter_kwh)),
        hinweis:'Kein genauer Zeitpunkt ohne zusätzliche Ablesung.'};
    },
    example:{args:{erster_kwh:32,zweiter_kwh:53,dritter_kwh:77,grenze_kwh:65,monoton_belegt:true},expect:{erreicht:true,erstes_ableseintervall:'nach_zweiter_bis_dritter',rest_nach_dritter_kwh:0}},
  },
  {
    name:'stromlauf_mischplan_rueckrechnung_profilfehler',
    description:'Ein historisches Verbrauchsprofil gegen beobachtete Phasen nach Dauerfehler und Rate aufschlüsseln — Separate forecast discrepancies caused by mode duration from discrepancies within mode.',
    page:meter,
    properties:{
      geplant_aktiv_stunden:number('In einer vergangenen Phase ursprünglich erwartete aktive Stunden.',0,8760),
      beobachtet_aktiv_stunden:number('Beobachtete aktive Stunden dieser Phase.',0,8760),
      geplant_aktiv_wh_stunde:number('Erwartete Wh je aktiver Stunde im alten Plan.'),
      langsame_ruhe_wh_stunde:number('Im alten Plan genutzte Wh je nicht aktiver Stunde.'),
      beobachtet_gesamt_wh:number('Durchgehend gemessene Wh des gesamten Fensters.'),
      fenster_stunden:number('Gesamtdauer des Plan- und Messfensters.',0.001,8760),
    },
    calculate({geplant_aktiv_stunden,beobachtet_aktiv_stunden,geplant_aktiv_wh_stunde,langsame_ruhe_wh_stunde,beobachtet_gesamt_wh,fenster_stunden}) {
      if (Math.max(geplant_aktiv_stunden,beobachtet_aktiv_stunden)>fenster_stunden) throw new RangeError('Aktive Stunden übersteigen das Fenster.');
      const plan=geplant_aktiv_stunden*geplant_aktiv_wh_stunde+(fenster_stunden-geplant_aktiv_stunden)*langsame_ruhe_wh_stunde;
      const mix=(beobachtet_aktiv_stunden-geplant_aktiv_stunden)*(geplant_aktiv_wh_stunde-langsame_ruhe_wh_stunde);
      return {plan_wh:round(plan),abweichung_durch_stundenmix_wh:round(mix),
        rest_nach_stundenmix_wh:round(beobachtet_gesamt_wh-plan-mix),gesamt_abweichung_wh:round(beobachtet_gesamt_wh-plan),
        hinweis:'Der Rest kann Änderungen der aktiven Rate, Ruhestrom oder andere Verbrauchsquellen enthalten.'};
    },
    example:{args:{geplant_aktiv_stunden:5,beobachtet_aktiv_stunden:8,geplant_aktiv_wh_stunde:100,langsame_ruhe_wh_stunde:20,beobachtet_gesamt_wh:915,fenster_stunden:10},expect:{plan_wh:600,abweichung_durch_stundenmix_wh:240,rest_nach_stundenmix_wh:75,gesamt_abweichung_wh:315}},
  },
  {
    name:'haushaltsstrom_tagesgrenzen_mit_teilaufzeichnung',
    description:'Einen Tageswert aus zwei vollständig erfassten Blöcken und einem über Mitternacht ungeteilten Block vorsichtig ausweisen — Report allocatable day totals without splitting a shared overnight energy block arbitrarily.',
    page:meter,
    properties:{
      tag_a_sicher_wh:number('Energie eindeutig am ersten Tag.'),
      tag_b_sicher_wh:number('Energie eindeutig am zweiten Tag.'),
      gemeinsam_offen_wh:number('Separater ungeteilter Verbrauch zwischen beiden Tagen.'),
      tag_a_oberleistung_w:number('Begründete obere Wirkleistung für den Anteil des ungeteilten Blocks am ersten Tag.',0,50000),
      tag_a_offen_min:minutes('Zeitanteil des ungeteilten Blocks am ersten Tag.'),
      deckel_belegt:boolean('Ist die Leistungsgrenze für genau diesen Teil belegt?'),
    },
    calculate({tag_a_sicher_wh,tag_b_sicher_wh,gemeinsam_offen_wh,tag_a_oberleistung_w,tag_a_offen_min,deckel_belegt}) {
      const cap=tag_a_offen_min===0?0:deckel_belegt?Math.min(gemeinsam_offen_wh,tag_a_oberleistung_w*tag_a_offen_min/60):gemeinsam_offen_wh;
      return {a_min_wh:tag_a_sicher_wh,a_max_wh:round(tag_a_sicher_wh+cap),
        b_min_wh:round(tag_b_sicher_wh+gemeinsam_offen_wh-cap),b_max_wh:round(tag_b_sicher_wh+gemeinsam_offen_wh),
        beide_tage_exakt_wh:round(tag_a_sicher_wh+tag_b_sicher_wh+gemeinsam_offen_wh),
        hinweis:'Nur für einen vollständig gemessenen und eindeutig abgegrenzten gemeinsamen Block. Genaue Tageswerte bleiben offen.'};
    },
    example:{args:{tag_a_sicher_wh:300,tag_b_sicher_wh:500,gemeinsam_offen_wh:100,tag_a_oberleistung_w:120,tag_a_offen_min:30,deckel_belegt:true},expect:{a_max_wh:360,b_min_wh:540,beide_tage_exakt_wh:900}},
  },
  {
    name:'nachtwasser_ereignisse_und_restvolumen',
    description:'Wasserstandsdifferenz in einem ruhigen Fenster gegen tatsächlich protokollierte Einzelentnahmen prüfen — Reconcile known water-use events against the quiet-period meter delta.',
    page:water,
    properties:{
      fenster_l:number('Zählerdifferenz des gesamten beobachteten Fensters in Litern.'),
      dokumentierte_entnahmen_l:number('Summe der direkt gemessenen Entnahmen innerhalb desselben Fensters.'),
      spielraum_l:number('Eigener begründeter kombinierter Messspielraum in Litern.'),
      gemeinsamer_zaehlerumfang:boolean('Sind die Entnahmen diesem Zähler und demselben Zeitfenster zugeordnet?'),
    },
    calculate({fenster_l,dokumentierte_entnahmen_l,spielraum_l,gemeinsamer_zaehlerumfang}) {
      if (!gemeinsamer_zaehlerumfang) return {status:'fenster_oder_umfang_offen',rest_l:null};
      const diff=fenster_l-dokumentierte_entnahmen_l;
      return {rest_l:round(diff),status:diff>spielraum_l?'weitere_entnahme_pruefen':diff< -spielraum_l?'messumfang_pruefen':'innerhalb_spielraum',
        hinweis:'Ein Restvolumen weist noch keine Leckage nach. Automatische oder nicht protokollierte Entnahmen können dazugehören.'};
    },
    example:{args:{fenster_l:57,dokumentierte_entnahmen_l:50,spielraum_l:2,gemeinsamer_zaehlerumfang:true},expect:{rest_l:7,status:'weitere_entnahme_pruefen'}},
  },
  {
    name:'heizwaerme_aufgabe_warmwasserfenster_abzug',
    description:'Raumheizenergie zweier Zeitfenster vergleichen, wenn die zentrale Warmwasserbereitung mitgemessen und getrennt belegt ist — Remove measured domestic-hot-water production before comparing space heat.',
    page:heat,
    properties:{
      frueher_gesamt_kwh:number('Wärme aller einbezogenen Aufgaben im früheren Fenster.'),
      frueher_warmwasser_kwh:number('Separat belegte Wärme im früheren Fenster für Warmwasserbereitung.'),
      aktuell_gesamt_kwh:number('Wärme aller einbezogenen Aufgaben im späteren Fenster.'),
      aktuell_warmwasser_kwh:number('Separat belegte Wärme im späteren Fenster für Warmwasserbereitung.'),
      nur_zwei_aufgaben:boolean('Enthält die Messgrenze nachweislich nur diese zwei Zwecke in gleich langen Fenstern?'),
    },
    calculate({frueher_gesamt_kwh,frueher_warmwasser_kwh,aktuell_gesamt_kwh,aktuell_warmwasser_kwh,nur_zwei_aufgaben}) {
      if (frueher_warmwasser_kwh>frueher_gesamt_kwh||aktuell_warmwasser_kwh>aktuell_gesamt_kwh) throw new RangeError('Teilenergie übersteigt Gesamtwärme.');
      const a=frueher_gesamt_kwh-frueher_warmwasser_kwh;
      const b=aktuell_gesamt_kwh-aktuell_warmwasser_kwh;
      return {gesamt_aenderung_kwh:round(aktuell_gesamt_kwh-frueher_gesamt_kwh),raumwaerme_aenderung_kwh:nur_zwei_aufgaben?round(b-a):null,
        warmwasser_aenderung_kwh:round(aktuell_warmwasser_kwh-frueher_warmwasser_kwh),
        hinweis:'Vor der Deutung des Heizvergleichs auch Wetter und Heizaufgabe abgleichen.'};
    },
    example:{args:{frueher_gesamt_kwh:300,frueher_warmwasser_kwh:40,aktuell_gesamt_kwh:310,aktuell_warmwasser_kwh:60,nur_zwei_aufgaben:true},expect:{gesamt_aenderung_kwh:10,raumwaerme_aenderung_kwh:-10,warmwasser_aenderung_kwh:20}},
  },
  {
    name:'kuehlverbrauch_anteilswechsel_nur_kuehltage',
    description:'Kühllast eines dokumentierten Raumkühlers von veränderten Anteilen kühler und warmer Tage unterscheiden — Separate observed cooling-day intensity from the number of cooling days.',
    page:cooling,
    properties:{
      a_tage:days('Tage im ersten vollständig gemessenen Fenster.',1), b_tage:days('Tage im zweiten vollständig gemessenen Fenster.',1),
      a_kuehltage:days('Tage mit protokollierter Kühlung im ersten Fenster.'), b_kuehltage:days('Tage mit protokollierter Kühlung im zweiten Fenster.'),
      a_aktiv_kwh:number('Für Kühlung erfasste aktive Energie im ersten Fenster, ohne Bereitschaft.'),
      b_aktiv_kwh:number('Für Kühlung erfasste aktive Energie im zweiten Fenster, ohne Bereitschaft.'),
    },
    calculate({a_tage,b_tage,a_kuehltage,b_kuehltage,a_aktiv_kwh,b_aktiv_kwh}) {
      whole(a_tage,b_tage,a_kuehltage,b_kuehltage);
      if (a_kuehltage>a_tage||b_kuehltage>b_tage||(!a_kuehltage&&a_aktiv_kwh)||(!b_kuehltage&&b_aktiv_kwh)) throw new RangeError('Aktive Energie und Kühltage passen nicht.');
      const a=a_kuehltage?a_aktiv_kwh/a_kuehltage:null;
      const b=b_kuehltage?b_aktiv_kwh/b_kuehltage:null;
      return {a_anteil_kuehltage_prozent:round(100*a_kuehltage/a_tage),b_anteil_kuehltage_prozent:round(100*b_kuehltage/b_tage),
        delta_je_kuehltag_kwh:a===null||b===null?null:round(b-a),delta_je_kalendertag_kwh:round(b_aktiv_kwh/b_tage-a_aktiv_kwh/a_tage),
        hinweis:'Nur beobachtete Tage. Raumaufgabe und Wetter beeinflussen beide Raten.'};
    },
    example:{args:{a_tage:10,b_tage:10,a_kuehltage:2,b_kuehltage:5,a_aktiv_kwh:6,b_aktiv_kwh:10},expect:{a_anteil_kuehltage_prozent:20,b_anteil_kuehltage_prozent:50,delta_je_kuehltag_kwh:-1,delta_je_kalendertag_kwh:0.4}},
  },
  {
    name:'trocknung_rueckstand_fertigmeldungen',
    description:'Eine Wochenmessung mit begonnenen und fertig getrockneten Ladungen gegen den offenen Rückstand abgleichen — Reconcile the drying-work queue before comparing energy per finished batch.',
    page:drying,
    properties:{
      offen_start:count('Ladungen, die bei Beginn schon in Bearbeitung waren.'),
      begonnen:count('Neu in Bearbeitung genommene Ladungen im betrachteten Zeitraum.'),
      fertig:count('In diesem Zeitraum tatsächlich fertig getrocknete Ladungen.'),
      abgebrochen:count('In diesem Zeitraum abgebrochene, ausdrücklich als erledigt entfernte Ladungen.'),
      endbestand_gesehen:count('Am Ende tatsächlich gezählte noch in Bearbeitung befindliche Ladungen.'),
    },
    calculate({offen_start,begonnen,fertig,abgebrochen,endbestand_gesehen}) {
      whole(offen_start,begonnen,fertig,abgebrochen,endbestand_gesehen);
      const expected=offen_start+begonnen-fertig-abgebrochen;
      if (expected<0) throw new RangeError('Mehr Ausgänge als gestartete oder mitgebrachte Ladungen.');
      return {erwartet_offen:expected,offen_abweichung:endbestand_gesehen-expected,
        start_und_endmenge_gleich:offen_start===endbestand_gesehen,status:expected===endbestand_gesehen?'bestand_abgeglichen':'ladeprotokoll_pruefen',
        hinweis:'Auch gleiche Bestände belegen keine vollständige Energieerfassung je Ladung.'};
    },
    example:{args:{offen_start:2,begonnen:7,fertig:6,abgebrochen:1,endbestand_gesehen:3},expect:{erwartet_offen:2,offen_abweichung:1,status:'ladeprotokoll_pruefen'}},
  },
  {
    name:'stromhistorie_tagesverschiebung_oder_rueckgang',
    description:'Bei sinkendem Tageswert prüfen, wie viel eines Rückgangs in der folgenden Nacht wieder auftaucht — Distinguish observed demand shifting from a full-window reduction.',
    page:meter,
    properties:{
      alt_tag_wh:number('Verbrauch im früheren Tagesfenster.'),
      alt_nacht_wh:number('Verbrauch in der darauf folgenden früheren Nacht.'),
      neu_tag_wh:number('Verbrauch im späteren entsprechenden Tagesfenster.'),
      neu_nacht_wh:number('Verbrauch in der darauf folgenden späteren Nacht.'),
      fenster_passen:boolean('Dauer, Verbrauchsgrenze und vergleichbare Aufgaben sind in beiden Profilen geprüft?'),
    },
    calculate({alt_tag_wh,alt_nacht_wh,neu_tag_wh,neu_nacht_wh,fenster_passen}) {
      if (!fenster_passen) return {delta_gesamt_wh:null,gegenbewegung_wh:null};
      const a=neu_tag_wh-alt_tag_wh;
      const b=neu_nacht_wh-alt_nacht_wh;
      return {delta_tag_wh:round(a),delta_nacht_wh:round(b),delta_gesamt_wh:round(a+b),
        gegenbewegung_wh:a*b<0?round(Math.min(Math.abs(a),Math.abs(b))):0,
        hinweis:'Gegenläufige Änderungen können mit einer Verlagerung vereinbar sein. Das Protokoll weist die Ursache nicht automatisch nach.'};
    },
    example:{args:{alt_tag_wh:1200,alt_nacht_wh:400,neu_tag_wh:900,neu_nacht_wh:700,fenster_passen:true},expect:{delta_tag_wh:-300,delta_nacht_wh:300,delta_gesamt_wh:0,gegenbewegung_wh:300}},
  },
  {
    name:'stromhistorie_spaete_ablesung_versionsfolge',
    description:'Für einen bereits abgeschlossenen Zeitraum als vorläufig und bestätigt abgelegte Zählerwerte zeitlich rekonstruieren — Identify the value available at a historical report cutoff versus a later validated reading.',
    page:meter,
    properties:{
      verwendeter_kwh:number('Für das Fenster damals verfügbarer vorläufiger Verbrauchswert.'),
      bestaetigt_kwh:number('Später validierter Verbrauchswert für genau dasselbe Fenster.'),
      korrektur_eingang_tag:days('Tag des dokumentierten Eingangs der Bestätigung, ab gemeinsamem Tag 0.'),
      bericht_stichtag:days('Tag des abzubildenden Berichts, ab demselben Tag 0.'),
      zeitraum_identisch:boolean('Beide Angaben verwenden dieselben Messgrenzen und dasselbe Register?'),
    },
    calculate({verwendeter_kwh,bestaetigt_kwh,korrektur_eingang_tag,bericht_stichtag,zeitraum_identisch}) {
      whole(korrektur_eingang_tag,bericht_stichtag);
      if (!zeitraum_identisch) return {status:'bezug_pruefen',am_stichtag_bekannt_kwh:null};
      const available=korrektur_eingang_tag<=bericht_stichtag;
      return {status:available?'bestaetigung_schon_verfuegbar':'bestaetigung_erst_spaeter',
        am_stichtag_bekannt_kwh:available?bestaetigt_kwh:verwendeter_kwh,
        nachtraegliche_abweichung_kwh:available?0:round(bestaetigt_kwh-verwendeter_kwh),aktuell_bestaetigt_kwh:bestaetigt_kwh};
    },
    example:{args:{verwendeter_kwh:90,bestaetigt_kwh:105,korrektur_eingang_tag:12,bericht_stichtag:10,zeitraum_identisch:true},expect:{status:'bestaetigung_erst_spaeter',am_stichtag_bekannt_kwh:90,nachtraegliche_abweichung_kwh:15}},
  },
  {
    name:'stromprotokoll_netzausfall_nulllast_einordnen',
    description:'Fehlende Stromlogger-Abschnitte mit unabhängig belegtem Netzausfall von ungeklärten Ausfällen trennen — Classify missing import records without treating all missing time as zero.',
    page:meter,
    properties:{
      fehlend_min:minutes('Dokumentierte Dauer aller fehlenden Loggerabschnitte.'),
      ohne_netzzufuhr_min:minutes('Davon unabhängig als ohne Stromzufuhr belegt, passend zur gemessenen Netzimportgrenze.'),
      import_only:boolean('Messgröße ist ausschließlich aus dieser Versorgung importierter Strom?'),
    },
    calculate({fehlend_min,ohne_netzzufuhr_min,import_only}) {
      if (ohne_netzzufuhr_min>fehlend_min) throw new RangeError('Belegter Ausfall ist kein Teil der eingegebenen Lücke.');
      const zero=import_only?ohne_netzzufuhr_min:0;
      return {netzimport_null_belegt_min:zero,weiterhin_unbekannt_min:round(fehlend_min-zero),
        hinweis:'Zeitabschnitte ohne Netzimport liefern keine Aussage zur Versorgung oder Funktion einzelner Geräte.'};
    },
    example:{args:{fehlend_min:50,ohne_netzzufuhr_min:35,import_only:true},expect:{netzimport_null_belegt_min:35,weiterhin_unbekannt_min:15}},
  },
  {
    name:'heizverlauf_restwinter_gleiche_jahresphase',
    description:'Einen bereits gemessenen Teil der Heizsaison und einen getrennten Rest aus einem belegten Vorjahresprofil einordnen — Back a remaining-season heat scenario with a separately matched historical season share.',
    page:heat,
    properties:{
      aktuell_bis_stichtag_kwh:number('Aktuell beobachtete Wärmemenge bis zum gemeinsamen Saisonstichtag.'),
      vorjahr_bis_stichtag_kwh:number('Vorjahreswärme bis exakt zur vergleichbaren Saisonstelle.'),
      vorjahr_rest_kwh:number('Vorjahreswärme ab dieser Saisonstelle bis Saisonende.'),
      fortschreiben:boolean('Soll dieselbe beobachtete Abweichungsquote auch für den Rest als ausdrückliche Annahme verwendet werden?'),
      basis_passend:boolean('Sind wiederkehrende Heizaufgaben, Zeitgrenzen und Herkunft beider Teile ausreichend vergleichbar?'),
    },
    calculate({aktuell_bis_stichtag_kwh,vorjahr_bis_stichtag_kwh,vorjahr_rest_kwh,fortschreiben,basis_passend}) {
      if (!basis_passend||(fortschreiben&&!vorjahr_bis_stichtag_kwh)) return {beobachtet_kwh:aktuell_bis_stichtag_kwh,restannahme_kwh:null,saison_szenario_kwh:null};
      const factor=fortschreiben?aktuell_bis_stichtag_kwh/vorjahr_bis_stichtag_kwh:1;
      const rest=vorjahr_rest_kwh*factor;
      return {beobachtet_kwh:aktuell_bis_stichtag_kwh,restannahme_kwh:round(rest),saison_szenario_kwh:round(aktuell_bis_stichtag_kwh+rest),
        hinweis:'Rückgriff auf ausdrücklich ausgewählte Vorjahreswerte. Künftiges Wetter und Heizverhalten bleiben offen.'};
    },
    example:{args:{aktuell_bis_stichtag_kwh:350,vorjahr_bis_stichtag_kwh:400,vorjahr_rest_kwh:200,fortschreiben:true,basis_passend:true},expect:{beobachtet_kwh:350,restannahme_kwh:175,saison_szenario_kwh:525}},
  },
  {
    name:'wasser_nutzungsfreie_nacht_ratenvergleich',
    description:'Zwei unterschiedlich lange Fenster ohne bekannte Entnahme auf Vereinbarkeit mit gleichmäßiger Wasserentnahme prüfen — Test whether quiet-window water changes are consistent with one constant rate.',
    page:water,
    properties:{
      a_min:minutes('Dauer des ersten überprüften Fensters ohne bekannte Entnahme.',1),
      b_min:minutes('Dauer des zweiten solchen Fensters.',1),
      a_l:number('Zählerdifferenz im früheren Fenster in Litern.'), b_l:number('Zählerdifferenz im späteren Fenster in Litern.'),
      spielraum_a_l:number('Belegter Volumenspielraum A in Litern.'), spielraum_b_l:number('Belegter Volumenspielraum B in Litern.'),
    },
    calculate({a_min,b_min,a_l,b_l,spielraum_a_l,spielraum_b_l}) {
      const a=[60*Math.max(0,a_l-spielraum_a_l)/a_min,60*(a_l+spielraum_a_l)/a_min];
      const b=[60*Math.max(0,b_l-spielraum_b_l)/b_min,60*(b_l+spielraum_b_l)/b_min];
      const low=Math.max(a[0],b[0]);
      const high=Math.min(a[1],b[1]);
      return {gemeinsame_rate_moeglich:low<=high+1e-9,gemeinsamer_bereich_l_h:low<=high?[round(low),round(high)]:null,
        a_l_h:round(60*a_l/a_min),b_l_h:round(60*b_l/b_min),
        hinweis:'Eine gemeinsame Rate ist rechnerisch möglich, ohne einen durchgehend gleichen Durchfluss oder eine Leckage zu belegen.'};
    },
    example:{args:{a_min:60,b_min:120,a_l:12,b_l:26,spielraum_a_l:2,spielraum_b_l:2},expect:{gemeinsame_rate_moeglich:true,gemeinsamer_bereich_l_h:[12,14],a_l_h:12,b_l_h:13}},
  },
  {
    name:'waeschetrocknung_betriebspause_wasserergebnis',
    description:'Zwei überwachte Trocknungsphasen pro tatsächlich entzogenem Liter vergleichen und die Pause separat zeigen — Compare measured water removal yields during resumed drying while retaining the idle block.',
    page:drying,
    properties:{
      vor_kwh:number('Gemessene Energie während des aktiven Fensters vor der Pause.'),
      vor_liter:number('Nachweislich in diesem aktiven Fenster entzogene Wassermenge, Liter.'),
      pause_kwh:number('Separat gemessener Verbrauch während der Pause.'),
      nach_kwh:number('Gemessene Energie während des aktiven Fensters nach der Pause.'),
      nach_liter:number('Nachweislich im späteren aktiven Fenster entzogene Wassermenge, Liter.'),
      gleiche_erfassung:boolean('Wasserentzug in beiden aktiven Phasen auf dieselbe Weise und mit sauberem Übergang erfasst?'),
    },
    calculate({vor_kwh,vor_liter,pause_kwh,nach_kwh,nach_liter,gleiche_erfassung}) {
      return {vor_kwh_l:gleiche_erfassung&&vor_liter?round(vor_kwh/vor_liter):null,
        nach_kwh_l:gleiche_erfassung&&nach_liter?round(nach_kwh/nach_liter):null,pause_kwh,
        beobachtet_gesamt_kwh:round(vor_kwh+pause_kwh+nach_kwh),
        hinweis:'Spätere Trocknungsphasen bearbeiten häufig anders feuchte Wäsche. Unterschiede belegen keinen Effekt der Pause.'};
    },
    example:{args:{vor_kwh:1,vor_liter:2,pause_kwh:0.1,nach_kwh:0.6,nach_liter:0.5,gleiche_erfassung:true},expect:{vor_kwh_l:0.5,nach_kwh_l:1.2,pause_kwh:0.1,beobachtet_gesamt_kwh:1.7}},
  },
  {
    name:'heizprotokoll_komfort_erfuellung_vergleich',
    description:'Heizenergie nur gemeinsam mit tatsächlich erreichten Komfortstunden vor und nach einer Änderung vergleichen — Check whether lower heating energy came with reduced hours meeting the same target.',
    page:heat,
    properties:{
      a_kwh:number('Wärmeenergie im vollständigen früheren Fenster.'),
      b_kwh:number('Wärmeenergie im vollständigen späteren gleich langen Fenster.'),
      a_ziel_stunden:number('Frühere belegte Stunden, in denen das selbst gewählte Zielband eingehalten wurde.',0,8760),
      b_ziel_stunden:number('Spätere belegte Stunden, in denen dasselbe Zielband eingehalten wurde.',0,8760),
      ziel_dauer_stunden:number('Gleiche Dauer der tatsächlich relevanten Belegungsstunden in beiden Zeitfenstern.',0.001,8760),
      gleicher_messort:boolean('Gleiches Zielband, gleicher Messort und gleichwertige Erfassung belegt?'),
    },
    calculate({a_kwh,b_kwh,a_ziel_stunden,b_ziel_stunden,ziel_dauer_stunden,gleicher_messort}) {
      if (Math.max(a_ziel_stunden,b_ziel_stunden)>ziel_dauer_stunden) throw new RangeError('Zielstunden übersteigen Belegungsstunden.');
      return {delta_kwh:round(b_kwh-a_kwh),
        zielabdeckung_delta_pp:gleicher_messort?round(100*(b_ziel_stunden-a_ziel_stunden)/ziel_dauer_stunden):null,
        mit_geringerer_zielabdeckung:gleicher_messort?b_kwh<a_kwh&&b_ziel_stunden<a_ziel_stunden:null,
        hinweis:'Zielerfüllung beschreibt die beobachteten Stunden. Wetter, Wärmequelle und Betrieb zusammen prüfen.'};
    },
    example:{args:{a_kwh:30,b_kwh:25,a_ziel_stunden:8,b_ziel_stunden:6,ziel_dauer_stunden:10,gleicher_messort:true},expect:{delta_kwh:-5,zielabdeckung_delta_pp:-20,mit_geringerer_zielabdeckung:true}},
  },
  {
    name:'stromtarif_verlauf_spaete_aufbuchung_arbeitspreis',
    description:'Dokumentierte Verbrauchsnachbuchung aus zwei alten Preisabschnitten mit dem heutigen Preis gegenprüfen — Check whether a later posting used historical block rates or a current rate.',
    page:tariff,
    properties:{
      alt_a_kwh:number('Nachgebuchte Verbrauchsmenge im alten Abschnitt A.'),
      alt_b_kwh:number('Nachgebuchte Verbrauchsmenge im alten Abschnitt B.'),
      alt_a_cent:rate('Belegter damaliger Arbeitspreis A in Cent/kWh.'),
      alt_b_cent:rate('Belegter damaliger Arbeitspreis B in Cent/kWh.'),
      jetzt_cent:rate('Dokumentierter Arbeitspreis des Buchungszeitpunkts in Cent/kWh.'),
      nachbuchung_euro:number('Ausgewiesener nachgebuchter reiner Arbeitskostenbetrag, in Euro.'),
      spielraum_euro:number('Eigener Spielraum für den Rechenabgleich in Euro.',0,1000),
    },
    calculate({alt_a_kwh,alt_b_kwh,alt_a_cent,alt_b_cent,jetzt_cent,nachbuchung_euro,spielraum_euro}) {
      const old=(alt_a_kwh*alt_a_cent+alt_b_kwh*alt_b_cent)/100;
      const current=(alt_a_kwh+alt_b_kwh)*jetzt_cent/100;
      return {arbeitskosten_alt_euro:round(old),arbeitskosten_aktuell_euro:round(current),
        mit_alten_preisen_vereinbar:Math.abs(nachbuchung_euro-old)<=spielraum_euro+1e-9,
        mit_aktuellem_preis_vereinbar:Math.abs(nachbuchung_euro-current)<=spielraum_euro+1e-9,
        hinweis:'Rechenabgleich mit eingegebenen dokumentierten Preisen. Preisgültigkeit anhand des Belegs prüfen.'};
    },
    example:{args:{alt_a_kwh:10,alt_b_kwh:20,alt_a_cent:20,alt_b_cent:25,jetzt_cent:35,nachbuchung_euro:10.5,spielraum_euro:0.01},expect:{arbeitskosten_alt_euro:7,arbeitskosten_aktuell_euro:10.5,mit_alten_preisen_vereinbar:false,mit_aktuellem_preis_vereinbar:true}},
  },
  {
    name:'stromexport_intervallstempel_tarifkante',
    description:'Ein Messintervall je nach Start- oder Endstempel relativ zur Tarifkante einordnen — Interpret a signed interval timestamp using its documented timestamp convention.',
    page:tariff,
    properties:{
      stempel_min:minutes('Zeitstempel des Verbrauchsintervalls ab gemeinsamem Zeitnullpunkt.'),
      dauer_min:minutes('Tatsächliche Dauer dieses Messintervalls.',0.001),
      tarifwechsel_min:minutes('Zeitpunkt des Preiswechsels auf derselben Uhr.'),
      stempel_bedeutung:choice('Ist der Zeitstempel als Beginn oder Ende des Intervalls dokumentiert?','beginn','ende','unbekannt'),
    },
    calculate({stempel_min,dauer_min,tarifwechsel_min,stempel_bedeutung}) {
      if (stempel_bedeutung==='unbekannt') return {fenster:'konvention_offen',vor_dem_wechsel_min:null};
      const start=stempel_bedeutung==='beginn'?stempel_min:stempel_min-dauer_min;
      if (start<0) throw new RangeError('Gemeinsamen Zeitnullpunkt vor beide Fenster legen.');
      const before=Math.max(0,Math.min(dauer_min,tarifwechsel_min-start));
      return {fenster:before===0?'danach':before===dauer_min?'davor':'ueber_der_grenze',
        vor_dem_wechsel_min:round(before),nach_dem_wechsel_min:round(dauer_min-before),
        hinweis:'Zeitanteile liefern ohne Teilmessung keine sicheren Energieanteile.'};
    },
    example:{args:{stempel_min:70,dauer_min:20,tarifwechsel_min:60,stempel_bedeutung:'ende'},expect:{fenster:'ueber_der_grenze',vor_dem_wechsel_min:10,nach_dem_wechsel_min:10}},
  },
  {
    name:'wasserhistorie_regelwechsel_zeitweilige_gasttage',
    description:'Wasserverbrauch eines geänderten Haushaltsablaufs bei zeitweiligen Gästen vorsichtig einordnen — Remove separately observed guest-specific events before comparing routine water totals.',
    page:water,
    properties:{
      vorher_l:number('Gesamtwasser im früheren gleich langen Vergleichsfenster.'),
      nachher_l:number('Gesamtwasser im späteren gleich langen Vergleichsfenster.'),
      gast_sicher_l:number('Nachweislich nur durch Gäste hinzugekommene, direkt gemessene Entnahmen im späteren Fenster.'),
      gast_weiter_max_l:number('Begründete Obergrenze weiterer möglicher Gästeentnahmen, zusätzlich zur sicheren Menge.'),
      grenze_belegt:boolean('Ist die Obergrenze der weiteren Gästeentnahmen für exakt dieses Fenster nachvollziehbar?'),
    },
    calculate({vorher_l,nachher_l,gast_sicher_l,gast_weiter_max_l,grenze_belegt}) {
      if (gast_sicher_l>nachher_l) throw new RangeError('Sichere Teilmenge übersteigt Gesamtmenge.');
      return {roh_delta_l:round(nachher_l-vorher_l),moegliches_delta_max_l:round(nachher_l-gast_sicher_l-vorher_l),
        moegliches_delta_min_l:grenze_belegt?round(Math.max(0,nachher_l-gast_sicher_l-gast_weiter_max_l)-vorher_l):null,
        hinweis:'Nur bestätigte oder nachvollziehbar begrenzte Entnahmen berücksichtigen. Andere Verhaltensänderungen bleiben möglich.'};
    },
    example:{args:{vorher_l:230,nachher_l:250,gast_sicher_l:12,gast_weiter_max_l:14,grenze_belegt:true},expect:{roh_delta_l:20,moegliches_delta_max_l:8,moegliches_delta_min_l:-6}},
  },
  {
    name:'entfeuchter_tankleerungen_zeitbilanz',
    description:'Kondensat eines Beobachtungszeitraums aus Tankbeständen und protokollierten Leerungen rekonstruieren — Recover collected condensate from start and end stock plus documented emptying.',
    page:'/guide/luftentfeuchter-dauerbetrieb-stromkosten.html',
    properties:{
      tank_anfang_l:number('Kondensat im Behälter zum ersten Messzeitpunkt.',0,100),
      tank_ende_l:number('Kondensat im Behälter zum letzten Messzeitpunkt.',0,100),
      entleert_l:number('Gemessene Summe aller zwischendurch ausgeleerten Mengen in Litern.',0,10000),
      leerungen_vollstaendig:boolean('Sind alle Leerungen erfasst und andere Zu- oder Abflüsse ausgeschlossen?'),
    },
    calculate({tank_anfang_l,tank_ende_l,entleert_l,leerungen_vollstaendig}) {
      const amount=tank_ende_l+entleert_l-tank_anfang_l;
      if (!leerungen_vollstaendig||amount< -1e-9) return {status:'bestandsprotokoll_pruefen',gesammelt_l:null};
      return {status:'tankbestand_abgeglichen',gesammelt_l:round(Math.max(0,amount)),
        hinweis:'Erfasst Kondensat im protokollierten Behälter. Wasser in Textilien, Wänden oder Raumluft wird nicht direkt gemessen.'};
    },
    example:{args:{tank_anfang_l:0.8,tank_ende_l:0.6,entleert_l:3.4,leerungen_vollstaendig:true},expect:{status:'tankbestand_abgeglichen',gesammelt_l:3.2}},
  },
  {
    name:'wasserhistorie_sperrzeit_nachlauf_pruefung',
    description:'Dokumentierte Nichtverfügbarkeit einer Verbrauchsstelle vom gemessenen Wasserbedarf nach Rückkehr trennen — Distinguish deferred water use from remembered use during an unavailable window.',
    page:water,
    properties:{
      ausfall_l:number('Gemessenes Zählervolumen des Zeitfensters ohne nutzbare betrachtete Zapfstelle.'),
      sonstige_l:number('Eindeutig anderen Stellen zugeordnete gemessene Liter im Ausfallfenster.'),
      nachher_l:number('Gesamtvolumen im anschließenden Fenster.'),
      nachgeholt_l:number('Davon direkt gemessene, nachgewiesenermaßen nachgeholte Entnahmen.'),
    },
    calculate({ausfall_l,sonstige_l,nachher_l,nachgeholt_l}) {
      if (nachgeholt_l>nachher_l) throw new RangeError('Nachgeholte Entnahmen übersteigen das Anschlussfenster.');
      return {ausfall_rest_l:round(ausfall_l-sonstige_l),anschluss_regulaer_l:round(nachher_l-nachgeholt_l),
        nachgeholt_l,status:sonstige_l>ausfall_l?'ausfallmessung_pruefen':'zeitzuordnung_getrennt',
        hinweis:'Nachgeholte Entnahmen verbleiben im tatsächlichen Wasserverbrauch der Zeit nach dem Ausfall.'};
    },
    example:{args:{ausfall_l:40,sonstige_l:36,nachher_l:100,nachgeholt_l:20},expect:{ausfall_rest_l:4,anschluss_regulaer_l:80,nachgeholt_l:20}},
  },
  {
    name:'stromzaehler_intervalltempo_ungleiche_abstaende',
    description:'Verbrauchstempo zwischen ungleich weit auseinanderliegenden kumulierten Stromablesungen vergleichen — Compare observed slope rather than raw differences in a three-point meter history.',
    page:meter,
    properties:{
      erster_stand_kwh:number('Erster bestätigter Stand eines unveränderten Registers.'),
      mittlerer_stand_kwh:number('Nachfolgender bestätigter Stand desselben Registers.'),
      letzter_stand_kwh:number('Dritter bestätigter Stand desselben Registers.'),
      erstes_intervall_h:number('Echte Stunden zwischen den ersten beiden Ablesungen.',0.001,87600),
      zweites_intervall_h:number('Echte Stunden zwischen den letzten beiden Ablesungen.',0.001,87600),
    },
    calculate({erster_stand_kwh,mittlerer_stand_kwh,letzter_stand_kwh,erstes_intervall_h,zweites_intervall_h}) {
      if (erster_stand_kwh>mittlerer_stand_kwh||mittlerer_stand_kwh>letzter_stand_kwh) throw new RangeError('Kumulierte Verbrauchsstände müssen aufsteigen.');
      const a=mittlerer_stand_kwh-erster_stand_kwh;
      const b=letzter_stand_kwh-mittlerer_stand_kwh;
      return {erste_kwh:round(a),zweite_kwh:round(b),erstes_tempo_kwh_tag:round(24*a/erstes_intervall_h),
        zweites_tempo_kwh_tag:round(24*b/zweites_intervall_h),
        zweite_menge_hoeher_aber_tempo_niedriger:b>a&&b/zweites_intervall_h<a/erstes_intervall_h,
        hinweis:'Mittleres Tempo in abgeschlossenen Fenstern. Lastspitzen und zeitlicher Verlauf bleiben offen.'};
    },
    example:{args:{erster_stand_kwh:100,mittlerer_stand_kwh:110,letzter_stand_kwh:125,erstes_intervall_h:24,zweites_intervall_h:48},expect:{erste_kwh:10,zweite_kwh:15,erstes_tempo_kwh_tag:10,zweites_tempo_kwh_tag:7.5,zweite_menge_hoeher_aber_tempo_niedriger:true}},
  },
  {
    name:'abtauereignis_energie_lueckenfreie_zuordnung',
    description:'Ein protokolliertes Abtaufenster und den anschließend beobachteten Wiederanlauf mit einem passenden Kühlschrankfenster vergleichen — Quantify logged defrost and recovery energy before interpreting a daily refrigerator total.',
    page:efficiency,
    properties:{
      tag_kwh:number('Durchgehend gemessener Verbrauch des Gerätetags.'),
      abtauen_kwh:number('Separat erfasster Anteil im dokumentierten Abtaufenster.'),
      wiederanlauf_kwh:number('Separat erfasster Anteil im unmittelbar anschließenden Wiederanlauffenster.'),
      normal_diese_dauer_kwh:number('Verbrauch im unabhängigen üblichen Fenster gleicher Gesamtdauer beider Abschnitte.'),
      nicht_ueberlappend:boolean('Sind beide Abschnitte exklusiv, enthalten im Tag und gegenüber der Normalmessung zeitlich passend?'),
    },
    calculate({tag_kwh,abtauen_kwh,wiederanlauf_kwh,normal_diese_dauer_kwh,nicht_ueberlappend}) {
      const sum=abtauen_kwh+wiederanlauf_kwh;
      if (!nicht_ueberlappend||sum>tag_kwh+1e-9) return {fenster_auswertbar:false,mehr_kwh:null};
      return {fenster_auswertbar:true,rest_des_tages_kwh:round(Math.max(0,tag_kwh-sum)),
        mehr_kwh:round(sum-normal_diese_dauer_kwh),
        hinweis:'Aus dem Fenstervergleich folgen keine Angaben zur vorgesehenen Abtauhäufigkeit oder Gerätefunktion.'};
    },
    example:{args:{tag_kwh:1.2,abtauen_kwh:0.15,wiederanlauf_kwh:0.25,normal_diese_dauer_kwh:0.18,nicht_ueberlappend:true},expect:{rest_des_tages_kwh:0.8,mehr_kwh:0.22}},
  },
  {
    name:'heizverlauf_brennstoffkosten_und_liefermenge',
    description:'Zwei dokumentierte Brennstoffzugänge von Verbrauch und Kosten der tatsächlich genutzten Mengen unterscheiden — Reconcile purchased and consumed heat fuel across a known unit-cost boundary.',
    page:heat,
    properties:{
      menge_vorher:number('Anfangsbestand in einer für alle Angaben gleichen Brennstoffeinheit.'),
      alt_verbraucht:number('Davon nachweislich während der Periode verbrauchte Einheiten.'),
      neu_geliefert:number('Später im selben Zeitraum neu gelieferte Brennstoffeinheiten.'),
      neu_verbraucht:number('Von dieser Lieferung nachweislich verbrauchte Einheiten.'),
      alt_euro_einheit:rate('Belegter Preis der älteren Menge in Euro je Einheit.'),
      neu_euro_einheit:rate('Belegter Preis der neuen Menge in Euro je Einheit.'),
    },
    calculate({menge_vorher,alt_verbraucht,neu_geliefert,neu_verbraucht,alt_euro_einheit,neu_euro_einheit}) {
      if (alt_verbraucht>menge_vorher||neu_verbraucht>neu_geliefert) throw new RangeError('Verbrauch übersteigt den Bestand eines Zugangs.');
      return {rest_einheiten:round(menge_vorher-alt_verbraucht+neu_geliefert-neu_verbraucht),
        einkauf_euro:round(neu_geliefert*neu_euro_einheit),
        aus_verbrauch_zugeordnet_euro:round(alt_verbraucht*alt_euro_einheit+neu_verbraucht*neu_euro_einheit),
        hinweis:'Private Rückschau. Nur bei belegter Zuordnung der verbrauchten Mengen zu beiden Mengenbeständen.'};
    },
    example:{args:{menge_vorher:60,alt_verbraucht:40,neu_geliefert:30,neu_verbraucht:15,alt_euro_einheit:2,neu_euro_einheit:3},expect:{rest_einheiten:35,einkauf_euro:90,aus_verbrauch_zugeordnet_euro:125}},
  },
  {
    name:'stromrechnung_arbeitspreis_trennmenge_rueckschluss',
    description:'Prüfen, ob ein reiner Arbeitskostenbetrag und Gesamtverbrauch den Mengenanteil zweier bekannter Tarife überhaupt eingrenzen — Infer a feasible quantity split from the bill rather than inventing interval readings.',
    page:tariff,
    properties:{
      gesamt_kwh:number('Gesamtverbrauch der beiden Preisperioden.'),
      a_cent_kwh:rate('Geprüfter Arbeitspreis A in Cent/kWh.'),
      b_cent_kwh:rate('Geprüfter Arbeitspreis B in Cent/kWh.'),
      kosten_euro:number('Nur der für dieselbe Menge ausgewiesene Arbeitspreisbetrag in Euro.'),
      kostenspielraum_euro:number('Absoluter Spielraum des Betrags, etwa aus Zeilenrundung.',0,1000),
    },
    calculate({gesamt_kwh,a_cent_kwh,b_cent_kwh,kosten_euro,kostenspielraum_euro}) {
      const a=gesamt_kwh*a_cent_kwh;
      const b=gesamt_kwh*b_cent_kwh;
      const low=100*(kosten_euro-kostenspielraum_euro);
      const high=100*(kosten_euro+kostenspielraum_euro);
      if (high<Math.min(a,b)-1e-9||low>Math.max(a,b)+1e-9) return {status:'summe_mit_preisen_unvereinbar',a_kwh_spannweite:null};
      const diff=a_cent_kwh-b_cent_kwh;
      if (!diff) return {status:'gleicher_preis_kein_mengenhinweis',a_kwh_spannweite:[0,gesamt_kwh]};
      const x=(low-b)/diff;
      const y=(high-b)/diff;
      return {status:'rechnerische_mengenspanne',a_kwh_spannweite:[round(Math.max(0,Math.min(gesamt_kwh,x,y))),round(Math.min(gesamt_kwh,Math.max(0,x,y)))],
        hinweis:'Die Spanne ist eine Rechenfolge zweier angenommener gültiger Arbeitspreise. Sie ersetzt keine Zählerablesung.'};
    },
    example:{args:{gesamt_kwh:100,a_cent_kwh:20,b_cent_kwh:40,kosten_euro:28,kostenspielraum_euro:1},expect:{status:'rechnerische_mengenspanne',a_kwh_spannweite:[55,65]}},
  },
  {
    name:'stromverlauf_planband_vs_messband',
    description:'Eine vorab dokumentierte Verbrauchsspanne mit dem späteren Messintervall statt nur mit dessen Mittelwert beurteilen — Backtest a projected range against independently bounded observations.',
    page:meter,
    properties:{
      plan_min_kwh:number('Vorab dokumentierte untere Annahme für den späteren Gesamtverbrauch.'),
      plan_max_kwh:number('Vorab dokumentierte obere Annahme für dasselbe Fenster.'),
      mess_min_kwh:number('Nachträglich begründete untere Grenze des gemessenen Verbrauchs.'),
      mess_max_kwh:number('Nachträglich begründete obere Grenze des gemessenen Verbrauchs.'),
      gleiches_fenster:boolean('Zeit, Zählerumfang und Verbrauchsaufgabe stimmen zwischen Plan und Messung überein?'),
    },
    calculate({plan_min_kwh,plan_max_kwh,mess_min_kwh,mess_max_kwh,gleiches_fenster}) {
      if (plan_min_kwh>plan_max_kwh||mess_min_kwh>mess_max_kwh) throw new RangeError('Spannen müssen aufsteigend sein.');
      if (!gleiches_fenster) return {status:'vergleich_offen',sicherer_abstand_kwh:null};
      const gap=Math.max(plan_min_kwh-mess_max_kwh,mess_min_kwh-plan_max_kwh,0);
      const status=mess_max_kwh<plan_min_kwh?'sicher_unter_plan':mess_min_kwh>plan_max_kwh?'sicher_ueber_plan':
        mess_min_kwh>=plan_min_kwh&&mess_max_kwh<=plan_max_kwh?'vollstaendig_im_plan':'nur_teilweise_im_plan';
      return {status,sicherer_abstand_kwh:round(gap),ueberlappung_kwh:round(Math.max(0,Math.min(plan_max_kwh,mess_max_kwh)-Math.max(plan_min_kwh,mess_min_kwh)))};
    },
    example:{args:{plan_min_kwh:50,plan_max_kwh:65,mess_min_kwh:60,mess_max_kwh:70,gleiches_fenster:true},expect:{status:'nur_teilweise_im_plan',sicherer_abstand_kwh:0,ueberlappung_kwh:5}},
  },
  {
    name:'heizverlauf_aufgabenwechsel_aufwaermkosten_stufen',
    description:'Bei dokumentiertem Nutzungswechsel Aufwärmenergie der ersten Nutzung von späterem Haltebetrieb pro belegter Stunde trennen — Distinguish the observed cold-start burden from consumption after the room has reached its chosen band.',
    page:heat,
    properties:{
      aufwaermen_kwh:number('Gemessene Heizenergie bis zum erstmaligen Erreichen des Zielbands.'),
      aufwaermen_min:minutes('Gemessene Dauer bis zur erstmaligen Zielerreichung.',1),
      halten_kwh:number('Gemessene Heizenergie im darauf folgenden Haltefenster.'),
      halten_min:minutes('Dauer des Haltefensters.',1),
      ziel_erreicht:boolean('Wurde der Übergang am unveränderten Messort durch die tatsächliche Zielerreichung bestätigt?'),
    },
    calculate({aufwaermen_kwh,aufwaermen_min,halten_kwh,halten_min,ziel_erreicht}) {
      if (!ziel_erreicht) return {status:'zieluebergang_offen',halten_kwh_pro_stunde:null};
      const a=60*aufwaermen_kwh/aufwaermen_min;
      const b=60*halten_kwh/halten_min;
      return {status:'phasen_getrennt',aufwaermen_kwh_pro_stunde:round(a),halten_kwh_pro_stunde:round(b),
        anteil_start_prozent:aufwaermen_kwh+halten_kwh?round(100*aufwaermen_kwh/(aufwaermen_kwh+halten_kwh)):null,
        hinweis:'Messphasen dieses Verlaufs. Die Halterate beschreibt kein anderes Haus und kein prognostiziertes Sparpotenzial.'};
    },
    example:{args:{aufwaermen_kwh:3,aufwaermen_min:90,halten_kwh:1,halten_min:120,ziel_erreicht:true},expect:{aufwaermen_kwh_pro_stunde:2,halten_kwh_pro_stunde:0.5,anteil_start_prozent:75}},
  },
  {
    name:'wasserverlauf_erste_spuelung_verbrauchsdosis',
    description:'Bei einer protokollierten Folge kurzer Zapfungen eine anfängliche Spülmenge nur einmal auf die tatsächlich erledigten Nutzungen beziehen — Separate one documented initial purge from later water draws.',
    page:water,
    properties:{
      gesamtliter:number('Gemessene Wassermenge der vollständigen Folge.'),
      anfangs_liter:number('Direkt gemessene einmalige Spülmenge vor den Nutzungen.'),
      abgeschlossene_nutzungen:count('Zahl der vollständig in der Folge erledigten, vergleichbaren Nutzungen.',1),
      entnahmen_auswertbar:boolean('Sind keine weiteren Vorläufe, Unterbrechungen oder unvollständigen Nutzungen im Gesamtwert enthalten?'),
    },
    calculate({gesamtliter,anfangs_liter,abgeschlossene_nutzungen,entnahmen_auswertbar}) {
      whole(abgeschlossene_nutzungen);
      if (anfangs_liter>gesamtliter) throw new RangeError('Erste Spülmenge übersteigt Gesamtverbrauch.');
      return {beobachtet_l_je_nutzung:entnahmen_auswertbar?round(gesamtliter/abgeschlossene_nutzungen):null,
        ohne_einmaligen_vorlauf_l_je_nutzung:entnahmen_auswertbar?round((gesamtliter-anfangs_liter)/abgeschlossene_nutzungen):null,
        einmaliger_vorlauf_l:anfangs_liter,
        hinweis:'Private Daten aus genau diesem Ablauf. Kein Hinweis, eine vorgesehene Spülung auszulassen.'};
    },
    example:{args:{gesamtliter:26,anfangs_liter:6,abgeschlossene_nutzungen:4,entnahmen_auswertbar:true},expect:{beobachtet_l_je_nutzung:6.5,ohne_einmaligen_vorlauf_l_je_nutzung:5,einmaliger_vorlauf_l:6}},
  },
  {
    name:'stromhistorie_feiertag_wochentag_vergleichsmenge',
    description:'Zwei gemessene Wochenblöcke mit unterschiedlich vielen dokumentierten Sondertagen auf verbleibende Vergleichstage prüfen — Remove actual non-routine days before contrasting ordinary consumption.',
    page:meter,
    properties:{
      a_tage:days('Vollständig gemessene Tage im früheren Block.',1),
      b_tage:days('Vollständig gemessene Tage im späteren Block.',1),
      a_sondertage:days('Davon abweichende Ferien-, Besuchs- oder Feiertage im früheren Block.'),
      b_sondertage:days('Davon abweichende Ferien-, Besuchs- oder Feiertage im späteren Block.'),
      a_kwh:number('Gesamter früherer Verbrauch.'),
      b_kwh:number('Gesamter späterer Verbrauch.'),
      a_sonder_kwh:number('Ausschließlich an früheren Sondertagen tatsächlich gemessene kWh.'),
      b_sonder_kwh:number('Ausschließlich an späteren Sondertagen tatsächlich gemessene kWh.'),
    },
    calculate({a_tage,b_tage,a_sondertage,b_sondertage,a_kwh,b_kwh,a_sonder_kwh,b_sonder_kwh}) {
      whole(a_tage,b_tage,a_sondertage,b_sondertage);
      if (a_sondertage>a_tage||b_sondertage>b_tage||a_sonder_kwh>a_kwh||b_sonder_kwh>b_kwh||(!a_sondertage&&a_sonder_kwh)||(!b_sondertage&&b_sonder_kwh)||
          (a_sondertage===a_tage&&a_sonder_kwh!==a_kwh)||(b_sondertage===b_tage&&b_sonder_kwh!==b_kwh)) throw new RangeError('Sondertage oder deren Teilmenge prüfen.');
      const a=a_tage-a_sondertage;
      const b=b_tage-b_sondertage;
      return {vergleichstage_a:a,vergleichstage_b:b,roh_delta_kwh_tag:round(b_kwh/b_tage-a_kwh/a_tage),
        delta_routine_kwh_tag:a&&b?round((b_kwh-b_sonder_kwh)/b-(a_kwh-a_sonder_kwh)/a):null,
        hinweis:'Gemessene Sondertage werden einmal abgezogen. Verbleibende Tage brauchen vergleichbare Nutzungsbedingungen.'};
    },
    example:{args:{a_tage:7,b_tage:7,a_sondertage:1,b_sondertage:2,a_kwh:42,b_kwh:50,a_sonder_kwh:12,b_sonder_kwh:25},expect:{vergleichstage_a:6,vergleichstage_b:5,roh_delta_kwh_tag:1.1429,delta_routine_kwh_tag:0}},
  },
  {
    name:'wasserverlauf_verzoegerte_anlage_ereignisvolumen',
    description:'Nach dokumentierter Nutzung eine einmalige spätere automatische Wasserentnahme im Beobachtungsfenster erfassen — Attribute a delayed but confirmed water event to the logged task without moving the meter timestamp.',
    page:water,
    properties:{
      nutzung_l:number('Gemessene Wasserentnahme während einer abgeschlossenen Haushaltsaufgabe.'),
      nachlauf_fenster_l:number('Gemessene Wasserentnahme eines separat abgegrenzten späteren Fensters.'),
      bestaetigt_nachlauf_l:number('Davon nachweislich als zur Aufgabe gehörende spätere automatische Entnahme gemessen.'),
      nachlauf_zuordnung:boolean('Sind Zeitstempel, Gerätedokumentation und Volumen der späteren Entnahme nachvollziehbar zugeordnet?'),
    },
    calculate({nutzung_l,nachlauf_fenster_l,bestaetigt_nachlauf_l,nachlauf_zuordnung}) {
      if (bestaetigt_nachlauf_l>nachlauf_fenster_l) throw new RangeError('Zugeordneter Nachlauf übersteigt das spätere Messfenster.');
      return {direkte_nutzung_l:nutzung_l,spaeter_tatsaechlich_gemessen_l:nachlauf_fenster_l,
        aufgabenbezogen_gesamt_l:nachlauf_zuordnung?round(nutzung_l+bestaetigt_nachlauf_l):null,
        spaeter_nicht_zugeordnet_l:nachlauf_zuordnung?round(nachlauf_fenster_l-bestaetigt_nachlauf_l):nachlauf_fenster_l,
        hinweis:'Die aufgabenbezogene Summe lässt die tatsächlich dokumentierten Zeitstempel bestehen.'};
    },
    example:{args:{nutzung_l:18,nachlauf_fenster_l:9,bestaetigt_nachlauf_l:5,nachlauf_zuordnung:true},expect:{aufgabenbezogen_gesamt_l:23,spaeter_nicht_zugeordnet_l:4,spaeter_tatsaechlich_gemessen_l:9}},
  },
];
