const filters='/ersatzfilter.html';
const humidifier='/guide/luftbefeuchter-ratgeber.html';
const robot='/guide/saugroboter-kaufberatung.html';
const wet='/guide/saugwischer-kaufberatung.html';
const tineco='/guide/tineco-saugt-nicht-mehr.html';
const workshop='/familienwerkstatt.html';
const replacement='/geraete-austausch-rechner.html';
const granulate='/guide/luftentfeuchter-granulat-oder-elektrisch.html';
const cleaner='/guide/klimaanlage-reinigen.html';

const number=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const flag=description=>({type:'boolean',description});
const choice=(description,...values)=>({type:'string',description,enum:values});
const count=description=>number(description,0,500);
const days=description=>number(description,0,3650);
const ml=description=>number(description,0,10000);
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Stückzahlen und ganze Tage');
}
function tool(name,description,page,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}

export const weiterverwendung=[
  tool('filter_vorfilter_komplette_saetze_binden',
    'Vor- und Hauptfilter bei dokumentiert zusammengehörigen Sätzen getrennt bilanzieren — Count complete verified filter sets without crossing declared kit groups.',filters,
    {satzregel_belegt:flag('Bestätigt die genaue Anleitung den Satzaufbau mit je einem Vor- und Hauptfilter in den getrennten Gruppen?'),
      haupt_a:count('Unbenutzte Hauptfilter der bestätigten Gruppe A.'),vor_a:count('Unbenutzte Vorfilter der bestätigten Gruppe A.'),
      haupt_b:count('Unbenutzte Hauptfilter der bestätigten Gruppe B.'),vor_b:count('Unbenutzte Vorfilter der bestätigten Gruppe B.')},
    ({satzregel_belegt,haupt_a,vor_a,haupt_b,vor_b})=>{
      whole(haupt_a,vor_a,haupt_b,vor_b);
      const a=Math.min(haupt_a,vor_a), b=Math.min(haupt_b,vor_b);
      return {vollstaendige_saetze:satzregel_belegt?[a,b]:null,
        einzelne_hauptfilter:satzregel_belegt?[haupt_a-a,haupt_b-b]:null,einzelne_vorfilter:satzregel_belegt?[vor_a-a,vor_b-b]:null,
        grenze:'Reihenfolge A, B. Keine Gruppen vermischen. Typ und zulässige Satzbildung der gültigen Anleitung entnehmen.'};
    },{satzregel_belegt:true,haupt_a:6,vor_a:2,haupt_b:2,vor_b:5},
    {vollstaendige_saetze:[2,2],einzelne_hauptfilter:[4,0],einzelne_vorfilter:[0,3]}),

  tool('filter_lagerprotokoll_fach_status_klaeren',
    'Original verpackte Filter nach überprüfter Lagerhistorie getrennt bereitstellen — Triage spare filters after uncertain storage without guessing usability.',filters,
    {lagerbedingungen_belegt:flag('Sind die Lagervorgaben für genau diese Filter bekannt?'),
      nachvollziehbar:count('Intakte unbenutzte Stücke mit nachvollziehbar eingehaltenen Vorgaben.'),
      zeitweise_unbelegt:count('Zusätzliche Stücke mit zeitweise unklarer Lagerung.'),
      ausserhalb_vorgaben:count('Zusätzliche Stücke mit dokumentierter Abweichung oder beschädigter Verpackung.')},
    ({lagerbedingungen_belegt,nachvollziehbar,zeitweise_unbelegt,ausserhalb_vorgaben})=>{
      whole(nachvollziehbar,zeitweise_unbelegt,ausserhalb_vorgaben);
      return {fuer_bestandsplanung:lagerbedingungen_belegt?nachvollziehbar:0,
        lagerhistorie_klaeren:zeitweise_unbelegt+(lagerbedingungen_belegt?0:nachvollziehbar),getrennt_bewerten:ausserhalb_vorgaben,
        grenze:'Nur disjunkte Stücklisten. Passung und Zustand vor Verwendung zusätzlich prüfen. Unklare Stücke getrennt halten.'};
    },{lagerbedingungen_belegt:true,nachvollziehbar:4,zeitweise_unbelegt:2,ausserhalb_vorgaben:1},
    {fuer_bestandsplanung:4,lagerhistorie_klaeren:2,getrennt_bewerten:1}),

  tool('filter_waschrotation_nach_gepruefter_trocknung',
    'Zwei separat protokollierte Pflegeteile über zwei geplante Einsätze rotieren — Plan two compatible washable parts around verified availability and drying downtime.',tineco,
    {rotation_belegt:flag('Sind beide Teile passend, als waschbar bestätigt und die geplante erneute Verwendung nach Prüfung vorgesehen?'),
      a_bereit_tag:days('Frühester Prüf- und Bereitstellungstag für Teil A.'),b_bereit_tag:days('Frühester Prüf- und Bereitstellungstag für Teil B.'),
      einsatz_eins:days('Erster Einsatztag.'),einsatz_zwei:days('Zweiter Einsatztag, strikt nach dem ersten.'),
      sperrtage:days('Eigene vollständige Sperrtage nach Nutzung bis zur nächsten Kontrolle desselben Teils, mindestens ein Tag.')},
    ({rotation_belegt,a_bereit_tag,b_bereit_tag,einsatz_eins,einsatz_zwei,sperrtage})=>{
      whole(a_bereit_tag,b_bereit_tag,einsatz_eins,einsatz_zwei,sperrtage);
      if(einsatz_eins>=einsatz_zwei || !sperrtage) throw new RangeError('Einsatzfolge');
      const ready=[a_bereit_tag,b_bereit_tag];
      const plan=[];
      if(rotation_belegt){
        for(const day of [einsatz_eins,einsatz_zwei]){
          const available=ready.findIndex(value=>value<=day);
          plan.push(available<0?null:['a','b'][available]);
          if(available>=0) ready[available]=day+sperrtage;
        }
      }
      return {teile_je_einsatz:rotation_belegt?plan:null,
        status:!rotation_belegt?'pflegeweg_pruefen':plan.includes(null)?'einsatz_offen':'teile_vor_einsatz_pruefen',
        grenze:'Tage sind selbst geplante Prüfpunkte. Gewaschene Teile erst nach der vorgeschriebenen und tatsächlich vollständigen Trocknung einsetzen.'};
    },{rotation_belegt:true,a_bereit_tag:1,b_bereit_tag:2,einsatz_eins:1,einsatz_zwei:2,sperrtage:3},
    {teile_je_einsatz:['a','b'],status:'teile_vor_einsatz_pruefen'}),

  tool('ersatzteile_unterstuetzte_alternativen_zuordnen',
    'Zwei vorrätige Teile auf Bedarfsposten mit unterschiedlicher belegter Passung verteilen — Preserve scarce interchangeable equipment parts for tasks with no supported alternative.',robot,
    {bestaende_geprueft:flag('Sind Teilekennungen, Stückzahlen und die eingetragenen Freigaben geprüft?'),
      flexibel:count('Bedarfsposten, die je ein Teil A oder B verwenden dürfen.'),
      nur_a:count('Bedarfsposten mit exakt einem Teil A und ohne belegte Alternative.'),
      a_vorrat:count('Verwendbare unbenutzte Teile A.'),b_vorrat:count('Verwendbare unbenutzte Teile B.')},
    ({bestaende_geprueft,flexibel,nur_a,a_vorrat,b_vorrat})=>{
      whole(flexibel,nur_a,a_vorrat,b_vorrat);
      if(!bestaende_geprueft) return {a_fest:null,b_flexibel:null,a_flexibel:null,fehlend:null,grenze:'Teile und Freigaben vor einer Zuordnung getrennt belegen.'};
      const fixed=Math.min(nur_a,a_vorrat);
      const primary=Math.min(flexibel,b_vorrat);
      const secondary=Math.min(flexibel-primary,a_vorrat-fixed);
      return {a_fest:fixed,b_flexibel:primary,a_flexibel:secondary,fehlend:[nur_a-fixed,flexibel-primary-secondary],
        grenze:'Fehlmengen: erst feste, dann flexible Posten. Belegte Alternativen verwenden und tatsächliche Teilekennungen zuordnen.'};
    },{bestaende_geprueft:true,flexibel:5,nur_a:3,a_vorrat:4,b_vorrat:2},
    {a_fest:3,b_flexibel:2,a_flexibel:1,fehlend:[0,2]}),

  tool('verbrauchsmittel_zwei_originalbehaelter_einzelbedarf',
    'Zwei Originalgebinde nach bestätigter Nutzungsfrist für ganze Anwendungen einplanen — Allocate whole uses from two original containers without combining remnants.',wet,
    {vorgaben_bestaetigt:flag('Sind beide Gebinde exakt passend und sind Fristen und Mengen für diese Anwendungen belegt?'),
      a_ml:ml('Nutzbare Restmenge in Originalgebinde A.'),b_ml:ml('Nutzbare Restmenge in Originalgebinde B.'),
      a_bis:days('Letzter belegter Nutzungstag für A.'),b_bis:days('Letzter belegter Nutzungstag für B.'),
      termin:days('Tag der geplanten Anwendungen.'),je_arbeit_ml:ml('Bereits belegte Menge je Anwendung.'),bedarf:count('Anzahl ganzer Anwendungen am Termin.')},
    ({vorgaben_bestaetigt,a_ml,b_ml,a_bis,b_bis,termin,je_arbeit_ml,bedarf})=>{
      whole(a_bis,b_bis,termin,bedarf);
      if(!je_arbeit_ml) throw new RangeError('Menge je Anwendung');
      if(!vorgaben_bestaetigt) return {ganze_anwendungen_a:null,ganze_anwendungen_b:null,ungedeckt:null,grenze:'Passung und Nutzungsvorgaben zuerst klären.'};
      const available=[termin<=a_bis?Math.floor(a_ml/je_arbeit_ml+1e-9):0,termin<=b_bis?Math.floor(b_ml/je_arbeit_ml+1e-9):0];
      const priority=a_bis<=b_bis?0:1;
      const used=[0,0];
      used[priority]=Math.min(bedarf,available[priority]);
      used[1-priority]=Math.min(bedarf-used[priority],available[1-priority]);
      return {ganze_anwendungen_a:used[0],ganze_anwendungen_b:used[1],ungedeckt:bedarf-used[0]-used[1],
        grenze:'Nur eigenständig ausreichende freigegebene Originalgebinde. Das Tool gibt keine Dosierung an und führt Restmengen nicht zusammen.'};
    },{vorgaben_bestaetigt:true,a_ml:95,b_ml:125,a_bis:7,b_bis:14,termin:5,je_arbeit_ml:50,bedarf:4},
    {ganze_anwendungen_a:1,ganze_anwendungen_b:2,ungedeckt:1}),

  tool('verbrauchsmittel_charge_bis_klaerung_sperren',
    'Zur Prüfung zurückgelegte Packungskennungen vom nutzbaren Bestand getrennt führen — Exclude held and untraceable consumables when checking immediate coverage.',filters,
    {charge_lesbar:flag('Sind die Kennungen der als bestätigt gezählten Stücke eindeutig und dem Produkt zugeordnet?'),
      nutzbar_bestaetigt:count('Stücke außerhalb der Klärfälle mit bestätigter Passung und Zustand.'),
      prueflos:count('Getrennte Stücke mit klärungsbedürftiger Kennung.'),kennung_unlesbar:count('Weitere Stücke mit nicht mehr zuordenbarer Kennung.'),
      bedarf_jetzt:count('Tatsächlich vorgesehener Bedarf vor Ende der Klärung.')},
    ({charge_lesbar,nutzbar_bestaetigt,prueflos,kennung_unlesbar,bedarf_jetzt})=>{
      whole(nutzbar_bestaetigt,prueflos,kennung_unlesbar,bedarf_jetzt);
      const usable=charge_lesbar?nutzbar_bestaetigt:0;
      return {planbarer_bestand:usable,separat_zu_klaeren:prueflos+kennung_unlesbar+nutzbar_bestaetigt-usable,
        offene_sofortmenge:Math.max(0,bedarf_jetzt-usable),
        grenze:'Drei getrennte Gruppen zählen. Freigabe und weitere Behandlung offener Chargen anhand der Originalunterlagen klären.'};
    },{charge_lesbar:true,nutzbar_bestaetigt:3,prueflos:4,kennung_unlesbar:1,bedarf_jetzt:5},
    {planbarer_bestand:3,separat_zu_klaeren:5,offene_sofortmenge:2}),

  tool('geraet_nach_reparatur_eigenes_ersatzgeraet_abbauen',
    'Vor Abgabe eines übergangsweise bereitgehaltenen Zweitgeräts aufeinanderfolgende Nutzungstage prüfen — Review a documented trial before releasing a temporary backup.',replacement,
    {regelbetrieb_belegt:flag('Ist das reparierte Gerät nach dokumentierter Rückmeldung für genau diese Routine einsatzbereit?'),
      plan_tage:days('Selbst geplante Mindestzahl zusammenhängend beobachteter Nutzungstage.'),
      belegt_tage:days('Anzahl tatsächlich aufeinanderfolgender beobachteter Nutzungstage.'),
      stoerung_beobachtet:flag('Trat währenddessen eine relevante Störung oder eine vom Service ausgeschlossene Nutzung auf?'),
      reserve_tage:days('Tage, die das Zweitgerät ab heute weiter bereitgehalten werden kann.')},
    ({regelbetrieb_belegt,plan_tage,belegt_tage,stoerung_beobachtet,reserve_tage})=>{
      whole(plan_tage,belegt_tage,reserve_tage);
      if(!plan_tage) throw new RangeError('Positive eigene Beobachtungsdauer');
      const remaining=!regelbetrieb_belegt || stoerung_beobachtet?null:Math.max(0,plan_tage-belegt_tage);
      const status=!regelbetrieb_belegt || stoerung_beobachtet?'stoerung_oder_freigabe_abklaeren':remaining===0?'weitere_reserve_neu_bewerten':
        remaining>reserve_tage?'reserve_laeuft_vor_beobachtungsende_aus':'beobachtung_fortsetzen';
      return {weitere_beobachtungstage:remaining,status,
        grenze:'Organisiert den eigenen Beobachtungszeitraum. Die Servicefreigabe muss vor Nutzung vorliegen; weder Testtage noch Rechenwert sagen etwas über künftige Ausfälle.'};
    },{regelbetrieb_belegt:true,plan_tage:5,belegt_tage:2,stoerung_beobachtet:false,reserve_tage:2},
    {weitere_beobachtungstage:3,status:'reserve_laeuft_vor_beobachtungsende_aus'}),

  tool('geraet_zubehoer_beim_wechsel_getrennt_verplanen',
    'Noch benötigtes und belegbar übernehmbares Zubehör beim Gerätewechsel getrennt zählen — Keep a working fallback equipped while transferring verified spares.',workshop,
    {wechsel_passung_belegt:flag('Sind Zustand und Übernahme der gleichartigen Zubehörteile für beide Geräte belegt?'),
      einsatzbereit:count('Nutzbare geeignete Teile des betrachteten Typs.'),
      beim_altgeraet:count('Mindestzahl, die bis zur bestätigten Umstellung am bisherigen Gerät bleiben soll.'),
      beim_zielgeraet:count('Zahl der für den Start am Zielgerät notwendigen Teile.'),
      ziel_hat_bereits:count('Zusätzliche bereits vorhandene bestätigte Teile am Zielgerät.')},
    ({wechsel_passung_belegt,einsatzbereit,beim_altgeraet,beim_zielgeraet,ziel_hat_bereits})=>{
      whole(einsatzbereit,beim_altgeraet,beim_zielgeraet,ziel_hat_bereits);
      const reserve=Math.min(einsatzbereit,beim_altgeraet);
      const gap=Math.max(0,beim_zielgeraet-ziel_hat_bereits);
      const transfer=wechsel_passung_belegt?Math.min(einsatzbereit-reserve,gap):0;
      return {beim_altgeraet_eingeplant:reserve,freier_rest_altgeraet:einsatzbereit-reserve-transfer,
        freigegeben_geplante_uebernahme:transfer,am_ziel_offen:gap-transfer,altgeraet_offen:beim_altgeraet-reserve,
        grenze:'Nur dasselbe Zubehör einzeln erfassen. Bisherige Geräteeignung belegt die Übernahme nicht.'};
    },{wechsel_passung_belegt:true,einsatzbereit:5,beim_altgeraet:3,beim_zielgeraet:4,ziel_hat_bereits:1},
    {beim_altgeraet_eingeplant:3,freier_rest_altgeraet:0,freigegeben_geplante_uebernahme:2,am_ziel_offen:1,altgeraet_offen:0}),

  tool('haushaltsgeraet_weitergabe_optionale_ausstattung',
    'Pflichtausstattung bei Weitergabe von dokumentiert optionalem Zubehör trennen, das weiter im Einsatz bleiben kann — Preserve useful optional equipment without weakening a handover kit.',workshop,
    {umfang_belegt:flag('Sind Pflichtteile, verträgliche optionale Teile und eigene Weiterverwendung vollständig geprüft?'),
      pflicht_fehlend:count('Einzeln erfasste fehlende Pflichtteile dieses Geräts.'),
      optionen_teilweise:count('Passende optionale Teile, die nach Vereinbarung mitgegeben werden sollen.'),
      wunsch_alt_weiter:count('Weitere optionale Teile, die an einem anderen bestätigten Gerät benötigt werden.'),
      optionen_frei:count('Tatsächlich vorhandene unbenutzte optionale Teile derselben kompatiblen Ausführung.')},
    ({umfang_belegt,pflicht_fehlend,optionen_teilweise,wunsch_alt_weiter,optionen_frei})=>{
      whole(pflicht_fehlend,optionen_teilweise,wunsch_alt_weiter,optionen_frei);
      const handover=Math.min(optionen_teilweise,optionen_frei);
      const remain=Math.min(wunsch_alt_weiter,optionen_frei-handover);
      return {pflichtteile_offen:umfang_belegt?pflicht_fehlend:null,
        optionen_fest_zugeordnet:umfang_belegt?handover:null,am_anderen_geraet_eingeplant:umfang_belegt?remain:null,
        zusagen_optionen_offen:umfang_belegt?optionen_teilweise-handover:null,
        grenze:'Vereinbarte Optionen zuerst zuordnen. Offene Pflichtteile vor Weitergabe klären. Der Check bewertet weder den Gerätezustand noch die Passung selbst.'};
    },{umfang_belegt:true,pflicht_fehlend:1,optionen_teilweise:2,wunsch_alt_weiter:3,optionen_frei:4},
    {pflichtteile_offen:1,optionen_fest_zugeordnet:2,am_anderen_geraet_eingeplant:2,zusagen_optionen_offen:0}),

  tool('vorhandenes_geraet_routine_und_sonderbedarf',
    'Ein vorhandenes Gerät behalten und ausschließlich die belegte Funktionslücke separat planen — Check whether a verified complement covers only the uncovered household tasks.',replacement,
    {aufgaben_vergleichbar:flag('Sind die Aufgaben beider Geräte auf derselben Grundlage und im eigenen Haushalt geprüft?'),
      routine_je_woche:count('Geplante Routinevorgänge pro Woche.'),vorhanden_routine:count('Mit vorhandenem Gerät bestätigte Routinen pro Woche.'),
      sonder_je_woche:count('Geplante Sondervorgänge pro Woche.'),vorhanden_sonder:count('Mit vorhandenem Gerät bestätigte Sondervorgänge pro Woche.'),
      ergaenzung_sonder:count('Zusätzliche bestätigte Sondervorgänge durch vorhandene Ergänzung oder bereits verfügbare Leihoption.')},
    ({aufgaben_vergleichbar,routine_je_woche,vorhanden_routine,sonder_je_woche,vorhanden_sonder,ergaenzung_sonder})=>{
      whole(routine_je_woche,vorhanden_routine,sonder_je_woche,vorhanden_sonder,ergaenzung_sonder);
      const routine=Math.max(0,routine_je_woche-vorhanden_routine);
      const special=Math.max(0,sonder_je_woche-vorhanden_sonder);
      return {routine_offen:aufgaben_vergleichbar?routine:null,sonderaufgaben_vor_ergaenzung_offen:aufgaben_vergleichbar?special:null,
        nach_ergaenzung_offen:aufgaben_vergleichbar?routine+Math.max(0,special-ergaenzung_sonder):null,
        grenze:'Belegte Kapazitäten müssen gleichzeitig verfügbar sein. Die Rechnung bewertet Einsatzabdeckung, weder Kosten noch Gerätezustand.'};
    },{aufgaben_vergleichbar:true,routine_je_woche:9,vorhanden_routine:10,sonder_je_woche:3,vorhanden_sonder:1,ergaenzung_sonder:1},
    {routine_offen:0,sonderaufgaben_vor_ergaenzung_offen:2,nach_ergaenzung_offen:1}),

  tool('ersatzbestellung_nach_fund_aenderungsbedarf',
    'Eine bereits ausgelöste Ersatzteilbestellung nach Fund verwendbarer Teile auf Änderungsbedarf prüfen — Separate avoidable order quantities from already committed units.',filters,
    {teile_geprueft:flag('Sind gefundene Teile bestätigt verwendbar und Bestellstatus sowie Änderungsrecht tatsächlich geprüft?'),
      gesamtbedarf:count('Gesamtmenge der betroffenen geplanten Wechsel.'),neu_gefunden:count('Zusätzliche bestätigte und noch nicht eingeplante Teile.'),
      fest_ausgeloest:count('Stückzahl im Auftrag, die sich nicht mehr ändern lässt.'),offen_aenderbar:count('Zusätzliche Stückzahl, die noch angepasst werden kann.')},
    ({teile_geprueft,gesamtbedarf,neu_gefunden,fest_ausgeloest,offen_aenderbar})=>{
      whole(gesamtbedarf,neu_gefunden,fest_ausgeloest,offen_aenderbar);
      const fixed=neu_gefunden+fest_ausgeloest;
      const kept=Math.min(offen_aenderbar,Math.max(0,gesamtbedarf-fixed));
      return {aenderbare_position_benoetigt:teile_geprueft?kept:null,
        reduktion_pruefen:teile_geprueft?offen_aenderbar-kept:null,
        ende_fehlend:teile_geprueft?Math.max(0,gesamtbedarf-fixed-kept):null,
        grenze:'Keine Bestellung oder Stornierung auslösen. Händlerstatus, genaue Artikelversion und tatsächlich zählbaren Bedarf prüfen.'};
    },{teile_geprueft:true,gesamtbedarf:8,neu_gefunden:3,fest_ausgeloest:2,offen_aenderbar:6},
    {aenderbare_position_benoetigt:3,reduktion_pruefen:3,ende_fehlend:0}),

  tool('geraet_ersatz_ausloeser_fehlende_zusatzfunktion',
    'Bei Ersatzabsicht nachhalten, ob die entscheidende Gerätefunktion nach einer bestätigten Änderung jetzt belegt ist — Revisit a replacement trigger only for the verified missing function.',replacement,
    {mangel:choice('Welcher Bedarf hat den Ersatzvergleich ausgelöst?','routine','zusatzfunktion','beides'),
      routine_beleg:choice('Stand der Routinefunktion nach der bestätigten Änderung.','erfuellt','offen','nicht_erfuellt'),
      zusatz_beleg:choice('Stand der Zusatzfunktion nach der bestätigten Änderung.','erfuellt','offen','nicht_erfuellt'),
      aenderung_nachweis:flag('Sind Änderung und Ergebnis auf Ansatz und Zweck des genauen Geräts bezogen belegt?')},
    ({mangel,routine_beleg,zusatz_beleg,aenderung_nachweis})=>{
      const evidence=mangel==='beides'?[routine_beleg,zusatz_beleg]:[mangel==='routine'?routine_beleg:zusatz_beleg];
      const status=!aenderung_nachweis || evidence.includes('offen')?'bedarf_und_aenderung_nachpruefen':
        evidence.includes('nicht_erfuellt')?'urspruengliche_luecke_bleibt':'ersatzbedarf_fuer_diesen_zweck_neu_bewerten';
      return {bewertete_ausloeser:mangel==='beides'?2:1,status,
        grenze:'Bewertet denselben Auslöser nach einer dokumentierten Änderung. Andere Gründe wie Betriebssicherheit oder schwankender Bedarf separat behandeln.'};
    },{mangel:'zusatzfunktion',routine_beleg:'offen',zusatz_beleg:'erfuellt',aenderung_nachweis:true},
    {bewertete_ausloeser:1,status:'ersatzbedarf_fuer_diesen_zweck_neu_bewerten'}),

  tool('filter_pflegejournal_verspaetete_eintraege',
    'Protokollierte Filterpflege am richtigen Ereignistag je Pflegeart verbuchen — Reconcile a later data entry with the underlying wash or replacement event.',filters,
    {ereignis:choice('Art des belegten Ereignisses.','reinigung','vollstaendiger_wechsel','unbekannt'),
      ereignistag:days('Tag, an dem die Pflege tatsächlich stattfand.'),eingabetag:days('Tag der Protokollierung; gleicher Tag Null wie alle anderen Eingaben.'),
      letzter_wechsel:days('Bisher belegter jüngster Tag eines vollständigen Wechsels.'),
      letzte_reinigung:days('Bisher belegter jüngster Tag einer Reinigung.')},
    ({ereignis,ereignistag,eingabetag,letzter_wechsel,letzte_reinigung})=>{
      whole(ereignistag,eingabetag,letzter_wechsel,letzte_reinigung);
      if(Math.max(ereignistag,letzter_wechsel,letzte_reinigung)>eingabetag) throw new RangeError('Ereignis nach Buchungsdatum');
      return {tage_bis_zur_dokumentation:eingabetag-ereignistag,
        letzter_wechsel:ereignis==='vollstaendiger_wechsel'?Math.max(ereignistag,letzter_wechsel):letzter_wechsel,
        letzte_reinigung:ereignis==='reinigung'?Math.max(ereignistag,letzte_reinigung):letzte_reinigung,
        status:ereignis==='unbekannt'?'ereignisart_klaeren':'ereignistag_erfasst',
        grenze:'Dokumentiert ausschließlich tatsächliche Pflegeereignisse. Der Buchungstag verlängert keine Frist und setzt keine Anzeige zurück.'};
    },{ereignis:'reinigung',ereignistag:16,eingabetag:23,letzter_wechsel:5,letzte_reinigung:18},
    {tage_bis_zur_dokumentation:7,letzter_wechsel:5,letzte_reinigung:18,status:'ereignistag_erfasst'}),

  tool('haushaltsgeraet_teilen_freie_rueckgabefenster',
    'Ein bereits verfügbares Leihgerät vor oder nach einer festen Reservierung einplanen — Find a feasible undivided borrowing slot including handback time.',workshop,
    {gemeinsamer_einsatz_belegt:flag('Ist die Nutzung durch alle Beteiligten vereinbart und ist das konkrete Gerät für die geplanten Aufgaben geeignet?'),
      frei_ab:days('Tag, ab dem das Gerät im Plan grundsätzlich verfügbar ist.'),frei_bis:days('Erster Tag außerhalb des gesamten Verfügbarkeitsfensters.'),
      block_ab:days('Beginn einer bereits festen Nutzung im Verfügbarkeitsfenster.'),block_bis:days('Erster Tag nach der bereits festen Nutzung.'),
      eigene_dauer:days('Zusammenhängende Tage für den eigenen Einsatz.'),rueckgabe_puffer:days('Weitere Tage für vereinbarte Rückgabe und Pflege.')},
    ({gemeinsamer_einsatz_belegt,frei_ab,frei_bis,block_ab,block_bis,eigene_dauer,rueckgabe_puffer})=>{
      whole(frei_ab,frei_bis,block_ab,block_bis,eigene_dauer,rueckgabe_puffer);
      if(frei_ab>block_ab || block_ab>=block_bis || block_bis>frei_bis || !eigene_dauer) throw new RangeError('Reihenfolge der Zeitfenster');
      const demand=eigene_dauer+rueckgabe_puffer;
      const results=[[frei_ab,block_ab],[block_bis,frei_bis]].filter(([start,end])=>end-start>=demand);
      return {moegliche_frueheste_starttage:gemeinsamer_einsatz_belegt?results.map(([start])=>start):[],
        vorzusehende_tage:demand,status:!gemeinsamer_einsatz_belegt?'vereinbarung_und_aufgabe_pruefen':results.length?'fenster_klaeren':'kein_durchgehendes_fenster',
        grenze:'Endtage sind exklusiv. Die Nutzung und Rückgabe mit den Beteiligten absprechen; der Rechner nimmt keine Buchung vor.'};
    },{gemeinsamer_einsatz_belegt:true,frei_ab:1,frei_bis:14,block_ab:5,block_bis:7,eigene_dauer:4,rueckgabe_puffer:1},
    {moegliche_frueheste_starttage:[7],vorzusehende_tage:5,status:'fenster_klaeren'}),

  tool('verbrauchsmittel_zweite_packung_erst_bei_luecke',
    'Mit dokumentierter Öffnungs- und Verwendungsfrist prüfen, ob eine ungeöffnete Reservepackung gebraucht wird — Delay opening a sealed pack until a dated need exceeds usable stock.',humidifier,
    {verwendung_belegt:flag('Sind die Packungsvorgaben, die Kompatibilität und die beiden Bedarfstermine bestätigt?'),
      angebrochen:count('Bestätigt nutzbare Stücke in der angebrochenen Packung.'),offen_bis:days('Letzter belegter Nutzungstag für angebrochene Stücke.'),
      reserve_inhalt:count('Bestätigte Stückzahl der ungeöffneten Reserve.'),reserve_geschlossen_bis:days('Letzter belegter Tag für das erstmalige Öffnen der Reserve.'),
      reserve_nach_oeffnung_tage:days('Zusätzlich bestätigte Höchstdauer nach Öffnung der Reserve; die äußerste Frist gilt weiterhin.'),
      a_tag:days('Tag des ersten Bedarfs.'),a_stueck:count('Menge am ersten Termin.'),
      b_tag:days('Tag des späteren Bedarfs.'),b_stueck:count('Menge am späteren Termin.')},
    ({verwendung_belegt,angebrochen,offen_bis,reserve_inhalt,reserve_geschlossen_bis,reserve_nach_oeffnung_tage,a_tag,a_stueck,b_tag,b_stueck})=>{
      whole(angebrochen,offen_bis,reserve_inhalt,reserve_geschlossen_bis,reserve_nach_oeffnung_tage,a_tag,a_stueck,b_tag,b_stueck);
      if(a_tag>=b_tag) throw new RangeError('Zwei aufsteigende Bedarfstermine');
      if(!verwendung_belegt) return {reserve_oeffnungstag:null,ungedeckt:null,grenze:'Herkunft, Passung und Fristen prüfen.'};
      let open=angebrochen, reserve=reserve_inhalt, openedAt=null;
      const unmet=[[a_tag,a_stueck],[b_tag,b_stueck]].map(([day,need])=>{
        const fromOpen=day<=offen_bis?Math.min(open,need):0;
        open-=fromOpen;
        if(need>fromOpen && reserve && day<=reserve_geschlossen_bis) openedAt=openedAt??day;
        const fromReserve=openedAt!==null && day<=Math.min(openedAt+reserve_nach_oeffnung_tage,reserve_geschlossen_bis)?Math.min(reserve,need-fromOpen):0;
        reserve-=fromReserve;
        return need-fromOpen-fromReserve;
      });
      return {reserve_oeffnungstag:openedAt,ungedeckt:unmet,
        grenze:'Geplante Entnahmen in Terminreihenfolge. Die äußere Frist wird unabhängig von der Öffnung eingehalten; keine Frist für ein Produkt erfinden.'};
    },{verwendung_belegt:true,angebrochen:3,offen_bis:4,reserve_inhalt:5,reserve_geschlossen_bis:10,reserve_nach_oeffnung_tage:3,a_tag:3,a_stueck:2,b_tag:7,b_stueck:4},
    {reserve_oeffnungstag:7,ungedeckt:[0,0]}),

  tool('filterwechsel_teilwechsel_ohne_satzreset',
    'Bei einzeln gepflegten Komponenten den nächsten fälligen Teil verfolgen — Keep the earlier due component visible after a partial maintenance event.',filters,
    {separate_pflege_belegt:flag('Sind beide Komponenten getrennt nach dokumentiertem Plan zu pflegen?'),
      tag_heute:days('Heutiger Tag auf derselben Zeitachse.'),a_letzter_wechsel:days('Tag des nachweisbaren Wechsels von A.'),a_frist:days('Belegte Planungsdauer für A ab Wechsel, falls der Zustand keinen früheren Schritt erfordert.'),
      b_letzter_wechsel:days('Tag des nachweisbaren Wechsels von B.'),b_frist:days('Belegte Planungsdauer für B ab Wechsel, falls der Zustand keinen früheren Schritt erfordert.')},
    ({separate_pflege_belegt,tag_heute,a_letzter_wechsel,a_frist,b_letzter_wechsel,b_frist})=>{
      whole(tag_heute,a_letzter_wechsel,a_frist,b_letzter_wechsel,b_frist);
      if(Math.max(a_letzter_wechsel,b_letzter_wechsel)>tag_heute || !a_frist || !b_frist) throw new RangeError('Wartungstage und beiderseitige Frist');
      const due=[a_letzter_wechsel+a_frist-tag_heute,b_letzter_wechsel+b_frist-tag_heute];
      return {planresttage_a_b:separate_pflege_belegt?due:null,
        zuerst_planen:!separate_pflege_belegt?null:due[0]===due[1]?'beide':due[0]<due[1]?'a':'b',
        grenze:'Negativer Wert bedeutet überfälligen Planungspunkt. Zustand und Gerätehinweise je Teil prüfen. Teilwechsel setzt keine Frist anderer Teile zurück.'};
    },{separate_pflege_belegt:true,tag_heute:42,a_letzter_wechsel:41,a_frist:30,b_letzter_wechsel:10,b_frist:28},
    {planresttage_a_b:[29,-4],zuerst_planen:'b'}),

  tool('geraeteablage_saisonstart_teilzuordnung',
    'Gelagerte Saisonkomponenten zur nächsten Inbetriebnahme nach Herstellerablauf kontrollieren — Audit which stored set pieces still need checking before seasonal use.',cleaner,
    {modell_und_ablauf:flag('Sind die Lager- und Startvorgaben für das genaue Gerät geprüft?'),
      am_geraet:count('Bereits geprüft zugeordnete Teile des dokumentierten Satzes am Gerät.'),in_box:count('Weitere geprüft zugeordnete Teile im Lagerkarton.'),
      pflege_offen:count('Weitere vorhandene Satzteile, bei denen die vorgeschriebene Pflege oder Trocknung noch nicht bestätigt ist.'),
      soll:count('Vollständige Anzahl der dokumentierten Pflichtteile am Start.')},
    ({modell_und_ablauf,am_geraet,in_box,pflege_offen,soll})=>{
      whole(am_geraet,in_box,pflege_offen,soll);
      if(am_geraet+in_box+pflege_offen>soll) throw new RangeError('Nur disjunkte Pflichtteile zählen');
      return {aus_lager_holen:modell_und_ablauf?in_box:null,erst_pflege_belegen:modell_und_ablauf?pflege_offen:null,
        fehlende_satzteile:modell_und_ablauf?soll-am_geraet-in_box-pflege_offen:null,
        grenze:'Nur unverwechselbar zugeordnete Pflichtteile erfassen. Die vollständige Zahl allein gibt den Start nicht frei.'};
    },{modell_und_ablauf:true,am_geraet:2,in_box:3,pflege_offen:1,soll:7},
    {aus_lager_holen:3,erst_pflege_belegen:1,fehlende_satzteile:1}),

  tool('granulatbox_einsatzbereich_nach_umzug_pruefen',
    'Vorhandene Granulatbox nach Umzug auf tatsächlichen Einsatz, Ursache und Herstellerfreigabe prüfen — Reassess a retained passive absorber for a changed use case.',granulate,
    {einsatz:choice('Vorgesehener Einsatz.','kleines_geschlossenes_fach','wohnraum','offen'),
      anhaltende_feuchtequelle:flag('Gibt es eine erkennbare andauernde oder ungeklärte Feuchtequelle?'),
      box_bestaetigt:flag('Wurde die vorhandene Box für den exakten Einsatzort anhand der Anleitung bestätigt?'),
      zustand_geprueft:flag('Sind Aufstellung, Auffangbehälter und vorgesehener Einsatz der Box vor Ort geprüft?'),
      bedarf_gemessen:flag('Liegt eine für den geplanten Einsatz wiederholte Beobachtung eines Bedarfs vor?')},
    ({einsatz,anhaltende_feuchtequelle,box_bestaetigt,zustand_geprueft,bedarf_gemessen})=>{
      const status=anhaltende_feuchtequelle || einsatz==='wohnraum'?'feuchtequelle_und_raumloesung_pruefen':!bedarf_gemessen?'erst_bedarf_beobachten':
        einsatz==='offen' || !box_bestaetigt || !zustand_geprueft?'einsatzort_und_vorgaben_klaeren':'vorhandene_box_als_ergaenzung_einplanen';
      return {status,grenze:'Passives Granulat ist keine Lösung für eine andauernde Feuchtequelle. Kein Rückschluss auf Entzugsleistung oder Erfolg.'};
    },{einsatz:'kleines_geschlossenes_fach',anhaltende_feuchtequelle:false,box_bestaetigt:true,zustand_geprueft:true,bedarf_gemessen:false},
    {status:'erst_bedarf_beobachten'}),

  tool('geraet_geteilt_verbrauch_bis_rueckgabe',
    'Gemeinsam genutztes Gerät samt Verbrauchsteilen zu späteren Übergaben planen — Track what a borrower should return with a shared household device.',robot,
    {teile_passend:flag('Sind die exakten Teile und die Mengen der vereinbarten Übergaben bestätigt?'),
      uebergeben:count('Bei der ersten Übergabe vorhandene nutzbare Verbrauchsteile.'),
      vereinbarte_einsaetze:count('Vor der Rückgabe geplante Einsätze mit Wechsel.'),je_wechsel:count('Teile je vollständigem geplanten Wechsel.'),
      eigentuemer_reserve:count('Bei der Rückgabe vereinbarter Sollbestand.'),mitgebrachtes_material:count('Zusätzliche bestätigte nutzbare Teile, die bereitgelegt werden.')},
    ({teile_passend,uebergeben,vereinbarte_einsaetze,je_wechsel,eigentuemer_reserve,mitgebrachtes_material})=>{
      whole(uebergeben,vereinbarte_einsaetze,je_wechsel,eigentuemer_reserve,mitgebrachtes_material);
      if(!je_wechsel && vereinbarte_einsaetze) throw new RangeError('Teilebedarf je Wechsel');
      const available=uebergeben+mitgebrachtes_material;
      const used=vereinbarte_einsaetze*je_wechsel;
      return {wechsel_ungedeckt:teile_passend?Math.max(0,used-available):null,
        nach_geplanten_wechseln:teile_passend?Math.max(0,available-used):null,
        vor_rueckgabe_zusaetzlich_einplanen:teile_passend?Math.max(0,used+eigentuemer_reserve-available):null,
        grenze:'Zeigt die getrennten Planungsmengen für Betrieb und Übergabe. Verbrauch und gelieferte Teile bei der Rückgabe neu zählen.'};
    },{teile_passend:true,uebergeben:5,vereinbarte_einsaetze:2,je_wechsel:2,eigentuemer_reserve:3,mitgebrachtes_material:1},
    {wechsel_ungedeckt:0,nach_geplanten_wechseln:2,vor_rueckgabe_zusaetzlich_einplanen:1}),

  tool('geraetezubehoer_ruecklauf_vollstaendigkeitsfolge',
    'Bei Gerätewechsel zugesagtes wiederverwendbares Zubehör in bestätigter Ankunftsfolge abgleichen — Identify the earliest dated accessory arrival that completes a specific plan.',workshop,
    {ruecklauf_belegt:flag('Sind Zubehörpassung und Verfügbarkeit je Rücklauf für den neuen Einsatz bestätigt?'),
      bedarf:count('Einzelteile desselben Typs, die zusammen für die Umstellung gebraucht werden.'),jetzt:count('Vor der Umstellung verfügbare bestätigte Teile.'),
      erste_menge:count('Zusätzliche verwendbare Teile beim ersten Rücklauf.'),erster_tag:days('Tag des ersten Rücklaufs.'),
      zweite_menge:count('Weitere verwendbare Teile beim zweiten Rücklauf.'),zweiter_tag:days('Tag des zweiten Rücklaufs.')},
    ({ruecklauf_belegt,bedarf,jetzt,erste_menge,erster_tag,zweite_menge,zweiter_tag})=>{
      whole(bedarf,jetzt,erste_menge,erster_tag,zweite_menge,zweiter_tag);
      if(erster_tag>=zweiter_tag) throw new RangeError('Aufsteigende Rücklauftermine');
      const stock=[jetzt,jetzt+erste_menge,jetzt+erste_menge+zweite_menge];
      const stage=stock.findIndex(available=>available>=bedarf);
      return {fruehester_planungstag:ruecklauf_belegt?([0,erster_tag,zweiter_tag][stage]??null):null,
        fehlend_am_zweiten_tag:ruecklauf_belegt?Math.max(0,bedarf-stock[2]):null,
        grenze:'Tag null bezeichnet heute. Nur passende tatsächlich rückkehrende Stücke reservieren; voller Bestand bedeutet keine Betriebsfreigabe.'};
    },{ruecklauf_belegt:true,bedarf:8,jetzt:3,erste_menge:2,erster_tag:3,zweite_menge:4,zweiter_tag:6},
    {fruehester_planungstag:6,fehlend_am_zweiten_tag:0}),

  tool('ersatzmaterial_regalflaeche_ohne_umfuellen',
    'Gemessenen Platzbedarf vorhandener Gebinde mit haltbarer Lagerung und Zugang abgleichen — Test whether original consumable packs fit in a documented storage zone.',wet,
    {lagerort_zulaessig:flag('Sind alle Lagerbedingungen für genau diese verschlossenen Originalgebinde am vorgesehenen Ort dokumentiert erfüllt?'),
      fach_breite:number('Freie Stellbreite in cm.',0,500),fach_tiefe:number('Freie Stelltiefe in cm.',0,500),
      pack_breite:number('Breite eines in vorgeschriebener Lage stehenden Originalgebindes in cm.',1,500),
      pack_tiefe:number('Tiefe desselben Gebindes in cm.',1,500),
      zugriffszone:number('Eigene zusammenhängende Tiefenreserve für Zugriff in cm.',0,500),
      anz:count('Anzahl gleich großer Gebinde; nur eine Lage vergleichen.')},
    ({lagerort_zulaessig,fach_breite,fach_tiefe,pack_breite,pack_tiefe,zugriffszone,anz})=>{
      whole(anz);
      const spaces=Math.floor(fach_breite/pack_breite)*Math.floor(Math.max(0,fach_tiefe-zugriffszone)/pack_tiefe);
      return {plaetze_aus_passmass:lagerort_zulaessig?spaces:null,nicht_in_diesem_fach:lagerort_zulaessig?Math.max(0,anz-spaces):null,
        grenze:'Eine ebene Lage in einer festen Richtung. Freiraum, Höhe, Traglast und Vorgaben vor Ort prüfen. Gebinde nicht zur Platzoptimierung umfüllen.'};
    },{lagerort_zulaessig:true,fach_breite:38,fach_tiefe:30,pack_breite:12,pack_tiefe:11,zugriffszone:7,anz:8},
    {plaetze_aus_passmass:6,nicht_in_diesem_fach:2}),

  tool('ersatzmaterial_doppelt_reservierte_stuecke',
    'Gemeinsame Ersatzmaterialliste auf doppelt reservierte Einzelstücke prüfen — Detect inventory reservations that refer to the same identified pieces.',filters,
    {einzelzuordnung_belegt:flag('Sind Bestand und Reservierungen desselben passenden Artikels anhand gekennzeichneter Einzelstücke abgeglichen?'),
      bestand:count('Einmalig gezählter Gesamtbestand an bestätigten Stücken.'),
      reservierung_a:count('Stücke mit Reservierung A.'),reservierung_b:count('Stücke mit Reservierung B.'),
      zugleich_a_und_b:count('Stücke, die in beiden Reservierungen als dasselbe Einzelstück identifiziert wurden.'),
      termin_gleichzeitig:flag('Werden beide Reservierungen gleichzeitig benötigt?')},
    ({einzelzuordnung_belegt,bestand,reservierung_a,reservierung_b,zugleich_a_und_b,termin_gleichzeitig})=>{
      whole(bestand,reservierung_a,reservierung_b,zugleich_a_und_b);
      const reserved=reservierung_a+reservierung_b-zugleich_a_und_b;
      if(zugleich_a_und_b>Math.min(reservierung_a,reservierung_b) || reserved>bestand) throw new RangeError('Nicht vereinbare Einzelstückzählung');
      return {doppelt_beansprucht:einzelzuordnung_belegt?zugleich_a_und_b:null,
        noch_nicht_zugeordnet:einzelzuordnung_belegt?bestand-reserved:null,
        uebrig_nach_konfliktersatz:einzelzuordnung_belegt && termin_gleichzeitig?bestand-reservierung_a-reservierung_b:null,
        grenze:'Negativer Rest bei gleichzeitigem Bedarf ist eine Fehlmenge. Zeitversetzte Nutzung erfordert eine separat bestätigte Rückgabe und Eignung.'};
    },{einzelzuordnung_belegt:true,bestand:7,reservierung_a:4,reservierung_b:5,zugleich_a_und_b:3,termin_gleichzeitig:true},
    {doppelt_beansprucht:3,noch_nicht_zugeordnet:1,uebrig_nach_konfliktersatz:-2}),

  tool('haushaltsgeraet_ersatz_unabhaengige_engpaesse',
    'Ersatz vorerst verschieben, wenn die tatsächlich knappen Arbeitsgänge durch bestätigte Terminwechsel abgedeckt werden — Check whether rescheduling covers only transferable workload.',replacement,
    {leistung_bestaetigt:flag('Sind Gerät, Aufgaben und alle angegebenen Einsatzkapazitäten tatsächlich bestätigt?'),
      heute_fest:count('Heute zwingend fällige gleichartige Aufgaben.'),heute_verschiebbar:count('Zusätzliche Aufgaben, die erst morgen enden dürfen.'),
      heute_platz:count('Bestätigte Gerätekontingente für heute.'),morgen_fest:count('Morgen bereits zwingend fällige Aufgaben.'),morgen_platz:count('Bestätigte Gerätekontingente morgen.')},
    ({leistung_bestaetigt,heute_fest,heute_verschiebbar,heute_platz,morgen_fest,morgen_platz})=>{
      whole(heute_fest,heute_verschiebbar,heute_platz,morgen_fest,morgen_platz);
      const deferrable=heute_verschiebbar-Math.min(heute_verschiebbar,Math.max(0,heute_platz-heute_fest));
      const deferred=Math.min(deferrable,Math.max(0,morgen_platz-morgen_fest));
      return {feste_luecke_heute:leistung_bestaetigt?Math.max(0,heute_fest-heute_platz):null,
        auf_morgen_verschoben:leistung_bestaetigt?deferred:null,
        morgen_gesamt_offen:leistung_bestaetigt?Math.max(0,morgen_fest-morgen_platz)+deferrable-deferred:null,
        grenze:'Zwei Tage mit derselben bestätigten Aufgabe. Verfügbare Plätze gelten nach notwendiger Rüst- und Pflegezeit.'};
    },{leistung_bestaetigt:true,heute_fest:3,heute_verschiebbar:4,heute_platz:4,morgen_fest:3,morgen_platz:5},
    {feste_luecke_heute:0,auf_morgen_verschoben:2,morgen_gesamt_offen:1}),

  tool('saugroboter_buerstenpflege_erneut_gleiche_zone',
    'Vor einem unnötigen Bürstenkauf dokumentierte Nachkontrollen nach Pflege auf derselben Testfläche prüfen — Compare repeat observations before replacing a cleaned brush.',robot,
    {zugelassene_pflege_bestaetigt:flag('War die durchgeführte Pflege zulässig, das Teil passend und die Testfläche unverändert?'),
      feste_stellen:count('Zahl festgelegter Stellen mit gleichem Prüfkriterium in allen Beobachtungen.'),
      auffaellig_vorher:count('Auffällige Stellen vor der Pflege.'),test_1:count('Auffällige Stellen im ersten vergleichbaren Lauf danach.'),
      test_2:count('Auffällige Stellen im zweiten vergleichbaren Lauf danach.'),toleriert:count('Vor den Läufen selbst festgelegte Zahl auffälliger Stellen, die für die Aufgabe akzeptiert wird.')},
    ({zugelassene_pflege_bestaetigt,feste_stellen,auffaellig_vorher,test_1,test_2,toleriert})=>{
      whole(feste_stellen,auffaellig_vorher,test_1,test_2,toleriert);
      if(!feste_stellen || Math.max(auffaellig_vorher,test_1,test_2,toleriert)>feste_stellen) throw new RangeError('Feste Beobachtungsstellen');
      const repeated=[test_1,test_2].filter(value=>value<=toleriert).length;
      return {verbesserung_je_lauf:zugelassene_pflege_bestaetigt?[auffaellig_vorher-test_1,auffaellig_vorher-test_2]:null,
        laeufe_innerhalb_toleranz:zugelassene_pflege_bestaetigt?repeated:null,
        status:!zugelassene_pflege_bestaetigt?'vergleichsbedingungen_klaeren':repeated===2?'buerste_fuer_diese_aufgabe_erneut_beobachten':'modellbezogen_weiter_pruefen',
        grenze:'Nur beobachtete Stellen vergleichen. Die Ursache von Abweichungen und die Restlebensdauer der Bürste bleiben offen.'};
    },{zugelassene_pflege_bestaetigt:true,feste_stellen:12,auffaellig_vorher:6,test_1:2,test_2:3,toleriert:2},
    {verbesserung_je_lauf:[4,3],laeufe_innerhalb_toleranz:1,status:'modellbezogen_weiter_pruefen'}),

  tool('ersatzteil_mengenabgleich_einzelpackung_rueckbehalt',
    'Ungeöffnete, unterschiedlich große Ersatzpackungen nach Mindestreserve gezielt aufzählen — Select as few whole sealed packs as needed for a verified reserve.',filters,
    {packungsinhalt_belegt:flag('Sind alle Packungen verschlossen und für dieselbe dokumentierte Variante passend?'),
      klein_anz:count('Verfügbare kleine Packungen.'),klein_inhalt:count('Einzelstücke je kleiner Packung.'),
      gross_anz:count('Verfügbare große Packungen.'),gross_inhalt:count('Einzelstücke je großer Packung.'),
      ziel:count('Mindestreserve in Einzelstücken, die zugeordnet werden soll.')},
    ({packungsinhalt_belegt,klein_anz,klein_inhalt,gross_anz,gross_inhalt,ziel})=>{
      whole(klein_anz,klein_inhalt,gross_anz,gross_inhalt,ziel);
      if(!klein_inhalt || gross_inhalt<=klein_inhalt) throw new RangeError('Unterschiedliche positive Packungsgrößen');
      const total=klein_anz*klein_inhalt+gross_anz*gross_inhalt;
      let best=null;
      if(packungsinhalt_belegt && total>=ziel){
        for(let gross=0;gross<=gross_anz;gross++){
          const klein=Math.ceil(Math.max(0,ziel-gross*gross_inhalt)/klein_inhalt);
          if(klein>klein_anz) continue;
          const excess=gross*gross_inhalt+klein*klein_inhalt-ziel;
          const packs=gross+klein;
          if(!best || packs<best.packs || (packs===best.packs && excess<best.excess)) best={gross,klein,packs,excess};
        }
      }
      return {packungen_klein_gross:best?[best.klein,best.gross]:null,ueber_mindestreserve:best?.excess??null,
        stuecke_ungedeckt:packungsinhalt_belegt?Math.max(0,ziel-total):null,
        grenze:'Reserviert ungeöffnete, vorhandene Packungen. Ziel ist zuerst die kleinste Packungszahl und dann der kleinste Überschuss.'};
    },{packungsinhalt_belegt:true,klein_anz:4,klein_inhalt:3,gross_anz:3,gross_inhalt:5,ziel:8},
    {packungen_klein_gross:[1,1],ueber_mindestreserve:0,stuecke_ungedeckt:0}),
];
