const PAGE='/produkte.html';
const SPEC='https://media3.bosch-home.com/Documents/specsheet/de-DE/SKS62E32EU.pdf';
const PRODUCT='https://www.bosch-home.com/de/de/product/SKS62E32EU';
const source=()=>({originalquelle_url:SPEC,markt:'DE',modell:'SKS62E32EU'});
const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const count=(description,maximum=200)=>num(description,0,maximum);
const yes=description=>({type:'boolean',description});
const choice=(description,values)=>({type:'string',description,enum:values});
const round=(x,digits=2)=>Number.isFinite(x)?Number(x.toFixed(digits))+0:null;
const observations=['erreicht','nicht_erreicht','offen'];

function task(name,description,properties,calculate,args,expect) {
  return {name,description,page:PAGE,properties,calculate,example:{args,expect}};
}
function whole(values) {
  if(!values.every(Number.isInteger))throw new RangeError('Die Zahl der Teile und Ladungen ganzzahlig angeben.');
}

export const kompaktspuelBelege=[
  task('bosch_sks62e32eu_eco50_quellenwerte_rundung',
    'Liest die getrennten Eco-50-Angaben pro Zyklus und pro 100 Zyklen für diesen deutschen Kompaktspüler — Read the exact model’s Eco 50 per-cycle figures and its rounded 100-cycle label.',
    {modell_de_belegt:yes('Deutsche Produktunterlage und genau der SKS62E32EU sind abgeglichen.'),
      bezug:choice('Für welchen Fall sollen die Angaben gelten?',['eco50_label','anderes_programm','eco_mit_option','haushaltsmessung','offen'])},
    ({modell_de_belegt,bezug})=>{
      const pass=modell_de_belegt&&bezug==='eco50_label';
      return {...source(),de_produktseite_url:PRODUCT,energie_kwh_pro_pruefzyklus:pass?0.613:null,
        label_kwh_je_100_zyklen:pass?61:null,wasser_l_pro_pruefzyklus:pass?8:null,dauer_pruefmin:pass?235:null,
        hinweis:'Deutsche Produktseite: 0,613 kWh pro Eco-Zyklus. Datenblatt: 61 kWh je 100 Eco-Zyklen gerundet, 8,0 l und 3 h 55 min im Eco 50 °C. Keine Verbrauchs- oder Zeitangabe für andere Programme, Optionen oder eigene Nutzung.'};
    },{modell_de_belegt:true,bezug:'eco50_label'},
    {energie_kwh_pro_pruefzyklus:0.613,label_kwh_je_100_zyklen:61,wasser_l_pro_pruefzyklus:8,dauer_pruefmin:235}),

  task('bosch_sks62e32eu_programm_oder_zusatzfunktion',
    'Ordnet einen angebotenen Betriebsnamen als Prüfprogramm, anderes Programm oder Zusatzfunktion ein — Classify a named mode as the Eco test program, another program or an option.',
    {bezeichnung:choice('Genaue Bezeichnung aus der deutschen Quelle.',['eco50','glas40','schnell45','intensiv70','auto45bis65',
      'vorspuelen','variospeed','extratrocknen','offen']),modell_de_belegt:yes('Unterlage passt genau zu SKS62E32EU.')},
    ({bezeichnung,modell_de_belegt})=>({
      ...source(),rolle:!modell_de_belegt||bezeichnung==='offen'?null:bezeichnung==='eco50'?'eco_pruefprogramm':
        ['variospeed','extratrocknen'].includes(bezeichnung)?'zusatzfunktion':'anderes_programm',
      hinweis:'Das Datenblatt S. 2 nennt die Funktionen separat. Die Benennung belegt keine Kombination mit einem bestimmten Programm oder dessen Verbrauch.'
    }),{bezeichnung:'extratrocknen',modell_de_belegt:true},{rolle:'zusatzfunktion'}),

  task('bosch_sks62e32eu_geraeuschklasse_und_energieklasse',
    'Trennt die Geräusch-Effizienzklasse von der Energieklasse und grenzt den Schallleistungswert vom Küchenmesswert ab — Keep the noise class, energy class and sound-power declaration distinct.',
    {gebrauch:choice('Welche Aussage soll aus der Quelle übernommen werden?',['etikettvergleich','pegel_am_eigenen_platz']),
      modell_de_belegt:yes('Der Quellenwert gehört zur exakten deutschen Modellangabe.')},
    ({gebrauch,modell_de_belegt})=>({
      ...source(),energieklasse:modell_de_belegt?'F':null,geraeuschklasse:modell_de_belegt?'C':null,
      deklarierte_schallleistung_db_a_re_1pw:modell_de_belegt?49:null,
      eigener_schalldruckbeleg_noetig:gebrauch==='pegel_am_eigenen_platz',
      hinweis:'49 dB(A) bezogen auf 1 pW bezeichnet die Schallleistung. Für eine Ablesung in der eigenen Küche fehlen Messort, Raum und Betriebszustand.'
    }),{gebrauch:'pegel_am_eigenen_platz',modell_de_belegt:true},
    {energieklasse:'F',geraeuschklasse:'C',deklarierte_schallleistung_db_a_re_1pw:49,eigener_schalldruckbeleg_noetig:true}),

  task('kompaktspuel_nennkapazitaet_und_kochgeschirr_bezug',
    'Unterscheidet die Nennkapazität von der dokumentierten eigenen Haushaltsladung — Distinguish standard place-setting capacity from a recorded household load.',
    {modell_de_belegt:yes('Gilt das deutsche Datenblatt SKS62E32EU?'),
      ladung:choice('Für welche Ladung wird die Zahl verwendet?',['normgerechte_gedecke','alltagsmix_mit_kochgeschirr','einzelstuecke','offen']),
      praxisladung_belegt:yes('Wurde der komplette eigene Mix in einer zulässigen beobachteten Beladung separat erfasst?')},
    ({modell_de_belegt,ladung,praxisladung_belegt})=>({
      ...source(),nennkapazitaet_massgedecke:modell_de_belegt?6:null,
      bezug:ladung==='normgerechte_gedecke'?'nennwert':ladung==='offen'?'aufgabe_offen':praxisladung_belegt?'praxisbeleg_getrennt':'ladeprobe_noetig',
      hinweis:'Sechs Maßgedecke sind eine Nennangabe. Unterschiedlich geformte Haushaltsstücke, Kochgeschirr und tatsächliche Belegung brauchen ihren eigenen Beleg.'
    }),{modell_de_belegt:true,ladung:'alltagsmix_mit_kochgeschirr',praxisladung_belegt:false},
    {nennkapazitaet_massgedecke:6,bezug:'ladeprobe_noetig'}),

  task('kompaktspuel_ladeprobe_passt_und_spruehraum_getrennt',
    'Hält Einlegen, freies Schließen und getrennten dokumentierten Sprühraum als eigene Ladebefunde fest — Separate loading, closure and documented spray clearance.',
    {eingesetzt:choice('Gemeldeter Einlegebefund der konkreten Gruppe.',['ja','nein','offen']),
      schluss:choice('Belegter normaler Schließzustand ohne Kraft.',['ja','nein','offen']),
      spruehraum:choice('Beleg zur Anordnung nach Anleitung, ohne laufende Maschine zu beobachten.',['ja','nein','offen'])},
    ({eingesetzt,schluss,spruehraum})=>{
      const befunde={eingesetzt,schluss,spruehraum};
      return {offen:Object.keys(befunde).filter(k=>befunde[k]==='offen'),
        nicht_erfuellt:Object.keys(befunde).filter(k=>befunde[k]==='nein'),ladebeleg_vollstaendig:Object.values(befunde).every(x=>x==='ja'),
        hinweis:'Schließen oder sichtbares Einlegen allein belegt keinen ungehinderten Sprühraum. Auf den dokumentierten eigenen Aufbau beschränkt.'};
    },{eingesetzt:'ja',schluss:'ja',spruehraum:'offen'},
    {offen:['spruehraum'],nicht_erfuellt:[],ladebeleg_vollstaendig:false}),

  task('kompaktspuel_pflichtgeschirr_bereitstellung_zwei_ausgaben',
    'Erfasst welche Pflichtgruppen der eigenen Mahlzeit nach Maschinenlauf und separat belegter Ergänzung noch fehlen — Find required groups left open after dishwasher and separately recorded completion.',
    {essgeschirr:choice('Geschirrgruppe am gemeinsamen Nutzungsendpunkt.',['maschine','zusatzaufgabe','offen','nicht_noetig']),
      kochgeschirr:choice('Kochgeschirr als Gruppe.',['maschine','zusatzaufgabe','offen','nicht_noetig']),
      serviergeschirr:choice('Serviergeschirr als Gruppe.',['maschine','zusatzaufgabe','offen','nicht_noetig'])},
    ({essgeschirr,kochgeschirr,serviergeschirr})=>{
      const daten={essgeschirr,kochgeschirr,serviergeschirr};
      return {offene_gruppen:Object.keys(daten).filter(k=>daten[k]==='offen'),
        separat_erledigt:Object.keys(daten).filter(k=>daten[k]==='zusatzaufgabe'),
        aufgabe_durch_maschinenlauf_allein_erledigt:Object.values(daten).every(x=>x==='maschine'||x==='nicht_noetig'),
        hinweis:'Ein Maschinenlauf und eine ergänzende Aufgabe erst gemeinsam als Erledigung werten, wenn beide denselben gewünschten Endpunkt belegen.'};
    },{essgeschirr:'maschine',kochgeschirr:'zusatzaufgabe',serviergeschirr:'offen'},
    {offene_gruppen:['serviergeschirr'],separat_erledigt:['kochgeschirr'],aufgabe_durch_maschinenlauf_allein_erledigt:false}),

  task('kompaktspuel_vergleich_teilladung_gleichzahl_andere_gruppen',
    'Erkennt dass dieselbe Zahl bereiter Teile trotz fehlender Pflichtgruppen keinen vollständigen Lastvergleich belegt — Check required-group matching even when the two load counts are equal.',
    {a_teile:count('Nutzbar dokumentierte Teile im bestehenden Betrieb.'),
      b_teile:count('Nutzbar dokumentierte Teile in der Kompaktprobe.'),
      gleiche_pflichtgruppen:yes('Alle tatsächlich benötigten Gruppen und die unterschiedlichen Stückformen wurden abgeglichen.'),
      gleiche_anforderung:yes('Beide erledigen denselben vereinbarten Reinigungs- und Nutzungsendpunkt?')},
    ({a_teile,b_teile,gleiche_pflichtgruppen,gleiche_anforderung})=>{
      whole([a_teile,b_teile]);
      return {gleiche_anzahl:a_teile===b_teile,vergleich_fuer_komplette_aufgabe:a_teile===b_teile&&a_teile>0&&gleiche_pflichtgruppen&&gleiche_anforderung,
        hinweis:'Teilezahl ist ein Zählbeleg. Ein fehlendes oft benötigtes Koch- oder Servierteil zählt auch bei gleicher Summe als Lastunterschied.'};
    },{a_teile:18,b_teile:18,gleiche_pflichtgruppen:false,gleiche_anforderung:true},
    {gleiche_anzahl:true,vergleich_fuer_komplette_aufgabe:false}),

  task('kompaktspuel_bestandsgeraet_kauf_bis_eigenbeleg',
    'Leitet einen prüfbaren Kauf- oder Behalten-Schritt aus der tatsächlich benötigten Haushaltsaufgabe ab — Decide whether to keep the existing setup or pursue verification for a compact replacement.',
    {bestand:choice('Beobachtete Tauglichkeit des bestehenden Ablaufs für die volle Aufgabe.',observations),
      kompaktprobe:choice('Derselbe Endpunkt in der geplanten oder bereits beobachteten Kompaktvariante.',observations),
      wechselgrund_belegt:yes('Ein getrennter konkreter Wechselgrund ist im eigenen Haushalt belegt.')},
    ({bestand,kompaktprobe,wechselgrund_belegt})=>({
      entscheidung:bestand==='offen'?'bestand_zuerst_beobachten':
        bestand==='erreicht'&&!wechselgrund_belegt?'bestehenden_ablauf_beibehalten':
        kompaktprobe==='erreicht'&&wechselgrund_belegt?'kompaktoption_weiter_pruefen':'kauf_zurueckstellen',
      hinweis:'Ein Etikettenwert allein macht ein anderes Gerät nicht sinnvoll. Die Entscheidung bleibt bei gemessener Aufgabe und bestätigtem Wechselgrund.'
    }),{bestand:'erreicht',kompaktprobe:'offen',wechselgrund_belegt:false},{entscheidung:'bestehenden_ablauf_beibehalten'}),

  task('bosch_sks62e32eu_korbmerkmal_oder_sonderzubehoer',
    'Liest einen Korbhinweis aus der Gerätebeschreibung getrennt von gelistetem Sonderzubehör — Distinguish a documented basket feature from separately listed special accessories.',
    {teil:choice('Vorliegende Bezeichnung.',['vario_besteckkorb','tassenetageren','sgz3003','unbekannt']),
      modell_de_belegt:yes('Exakte deutsche Produktunterlage für das Angebot verwendet?'),
      lieferung_bestaetigt:yes('Der Verkäufer oder eine eigene Bestandsliste weist das konkrete Teil dieser Lieferung zu.')},
    ({teil,modell_de_belegt,lieferung_bestaetigt})=>({
      ...source(),quellenbezug:!modell_de_belegt||teil==='unbekannt'?null:teil==='sgz3003'?'sonderzubehoer':'korbsystem',
      in_konkreter_lieferung_belegt:modell_de_belegt&&teil!=='unbekannt'?lieferung_bestaetigt:null,
      hinweis:'Das Datenblatt nennt Vario-Besteckkorb und Tassenetageren im Korbsystem und SGZ3003 als Sonderzubehör. Keine zusätzliche Korbkapazität aus Zubehörbildern ableiten.'
    }),{teil:'sgz3003',modell_de_belegt:true,lieferung_bestaetigt:false},
    {quellenbezug:'sonderzubehoer',in_konkreter_lieferung_belegt:false}),

  task('kompaktspuel_drei_pflichtgruppen_kleinster_belegter_teilplan',
    'Ermittelt aus tatsächlich erprobten Gruppenkombinationen die kleinste belegte Aufteilung einer Ladeaufgabe — Find the smallest known split from three required dish groups and verified loading combinations.',
    {einzeln_a:yes('Die vollständige Gruppe A ist einzeln erprobt.'),
      einzeln_b:yes('Die vollständige Gruppe B ist einzeln erprobt.'),
      einzeln_c:yes('Die vollständige Gruppe C ist einzeln erprobt.'),
      gemeinsam:yes('Alle drei Gruppen zusammen wurden für dieselbe Aufgabe vollständig erprobt.'),
      ab:yes('Nur A und B gemeinsam wurden als vollständige Kombination bestätigt.'),
      ac:yes('Nur A und C gemeinsam wurden vollständig bestätigt.'),bc:yes('Nur B und C gemeinsam wurden vollständig bestätigt.')},
    ({einzeln_a,einzeln_b,einzeln_c,gemeinsam,ab,ac,bc})=>{
      const plaene=[
        [gemeinsam,['abc']],
        [ab&&einzeln_c,['ab','c']],
        [ac&&einzeln_b,['ac','b']],
        [bc&&einzeln_a,['bc','a']],
        [einzeln_a&&einzeln_b&&einzeln_c,['a','b','c']],
      ];
      const plan=plaene.find(([belegt])=>belegt)?.[1]??null;
      return {belegte_aufteilung:plan,belegte_ladungen:plan?.length??null,
        hinweis:'Kleinste in den bereitgestellten Belegen auffindbare Aufteilung. Offene Kombinationen sind nicht als unmöglich bewertet. Nur zulässige vollständig beobachtete Gruppen eingeben.'};
    },{einzeln_a:false,einzeln_b:true,einzeln_c:false,gemeinsam:false,ab:false,ac:true,bc:false},
    {belegte_aufteilung:['ac','b'],belegte_ladungen:2}),

  task('kompaktspuel_nutzungstage_alltag_und_sonderladung',
    'Bilanziert für einen Beobachtungszeitraum verschieden häufige Kochaufgaben getrennt vom ungeprüften Rest — Measure coverage of actual routine and occasional loads without counting unexamined days.',
    {alltag:count('Erfasste Nutzungstage mit normaler kompletter Koch- und Geschirraufgabe.',365),
      sonder:count('Andere erfasste Nutzungstage mit eigener Sonderladung, ohne doppelte Tage.',365),
      alltag_belegt:count('Normale Nutzungstage mit komplett belegter Lösung.',365),
      sonder_belegt:count('Sondertage mit komplett belegter Lösung.',365),tage_offen:count('Weitere Nutzungstage ohne ausreichende Daten.',365)},
    ({alltag,sonder,alltag_belegt,sonder_belegt,tage_offen})=>{
      whole([alltag,sonder,alltag_belegt,sonder_belegt,tage_offen]);
      if(alltag_belegt>alltag||sonder_belegt>sonder)throw new RangeError('Belegte Fälle dürfen die jeweilige Gruppe nicht überschreiten.');
      return {alltag_ohne_vollbeleg:alltag-alltag_belegt,sonder_ohne_vollbeleg:sonder-sonder_belegt,weitere_offene_tage:tage_offen,
        hinweis:'Auf beobachtete Nutzungstage begrenzt. Gute Alltagstauglichkeit füllt keine offene Sonderlast, etwa wenn ein oft genutztes großes Stück nicht belegt ist.'};
    },{alltag:12,sonder:3,alltag_belegt:12,sonder_belegt:1,tage_offen:2},
    {alltag_ohne_vollbeleg:0,sonder_ohne_vollbeleg:2,weitere_offene_tage:2}),

  task('kompaktspuel_nicht_eingelegte_teile_auswahlgrund',
    'Trennt vorgeschriebene Ausnahmen, beobachtete Beladungsgrenzen und bisher ungeprüfte Stücke — Distinguish excluded items from observed fit issues and untested items.',
    {noetig:count('Unterschiedliche Stücke, die zum vollständigen Ergebnis gehören.'),
      eingelegt:count('Davon zulässig und normal eingelegt.'),
      material_ausgeschlossen:count('Davon durch genaue Unterlage als ungeeignet ausgegrenzt und nicht eingelegt.'),
      praktisch_kein_platz:count('Andere nicht eingelegte Stücke mit bereits belegtem Platzproblem.')},
    ({noetig,eingelegt,material_ausgeschlossen,praktisch_kein_platz})=>{
      whole([noetig,eingelegt,material_ausgeschlossen,praktisch_kein_platz]);
      const offen=noetig-eingelegt-material_ausgeschlossen-praktisch_kein_platz;
      if(offen<0)throw new RangeError('Beobachtungsgruppen müssen getrennte Stücke aus derselben Aufgabe enthalten.');
      return {nicht_eingelegt:noetig-eingelegt,fehlende_ladebeobachtung:offen,
        separate_bearbeitung_mit_grund:material_ausgeschlossen+praktisch_kein_platz,
        hinweis:'Hier werden Gründe des Nicht-Einlegens bilanziert. Kein fehlendes Stück als Waschfehler eines absolvierten Maschinenlaufs verbuchen.'};
    },{noetig:18,eingelegt:12,material_ausgeschlossen:2,praktisch_kein_platz:3},
    {nicht_eingelegt:6,fehlende_ladebeobachtung:1,separate_bearbeitung_mit_grund:5}),

  task('kompaktspuel_als_zweitgeraet_altgang_tatsaechlich_entfallen',
    'Ermittelt ob ein Kompaktlauf einen bestehenden Maschinenlauf tatsächlich ersetzte oder nur gut passende Stücke verlagerte — Check whether using a compact second unit actually displaced an existing run.',
    {bestand_ohne_kompakt:count('Vollständig beobachtete Läufe in der bisherigen Ausführung.'),
      bestand_mit_kompakt:count('Läufe des bisherigen Geräts während der zweiten erprobten Ausführung.'),
      kompakt_lauefe:count('Separat belegte Läufe des Kompaktgeräts.'),
      gleiche_gesamtaufgabe:yes('Kein Pflichtstück fehlt und vollständige Bereitstellung im gleichen Zeitraum nachgewiesen?')},
    ({bestand_ohne_kompakt,bestand_mit_kompakt,kompakt_lauefe,gleiche_gesamtaufgabe})=>{
      whole([bestand_ohne_kompakt,bestand_mit_kompakt,kompakt_lauefe]);
      return {bestehende_lauefe_entfallen:gleiche_gesamtaufgabe?Math.max(0,bestand_ohne_kompakt-bestand_mit_kompakt):null,
        gesamte_lauefe_aenderung:gleiche_gesamtaufgabe?bestand_mit_kompakt+kompakt_lauefe-bestand_ohne_kompakt:null,
        hinweis:'Nur vollständig erledigte eigene Abläufe. Aus der Verlagerung eines Teils folgt keine Einsparung von Wasser oder Energie.'};
    },{bestand_ohne_kompakt:1,bestand_mit_kompakt:1,kompakt_lauefe:1,gleiche_gesamtaufgabe:true},
    {bestehende_lauefe_entfallen:0,gesamte_lauefe_aenderung:1}),

  task('kompaktspuel_gemessener_wasseranteil_separater_pflichtteile',
    'Weist den Anteil der getrennten Bearbeitung von nicht mitgeladenem Pflichtgeschirr am gemessenen Aufgabenwasser aus — Attribute measured water to required items omitted from the compact load.',
    {maschine_l:num('Gemessene Liter für den eigenen Maschinenlauf.',0,1000),
      ergaenzung_l:num('Getrennt dokumentierte Liter für dabei nicht eingelegte Pflichtstücke.',0,1000),
      ergaenzung_belegt:yes('Die getrennte Menge ist tatsächlich gemessen und betrifft genau die nicht eingelegten Pflichtstücke.'),
      aufgabe_fertig:yes('Das ganze benötigte Geschirr ist tatsächlich bereitgestellt, ohne offenen weiteren Wasserweg.')},
    ({maschine_l,ergaenzung_l,ergaenzung_belegt,aufgabe_fertig})=>{
      const bekannt=ergaenzung_belegt&&aufgabe_fertig;
      const gesamt=maschine_l+ergaenzung_l;
      return {gemessene_aufgabenmenge_l:bekannt?round(gesamt):null,
        ergaenzungsanteil_prozent:bekannt&&gesamt>0?round(100*ergaenzung_l/gesamt):null,
        hinweis:'Die Menge für Erstbearbeitung ausgelassener Stücke ist getrennt zu belegen. Ein standardisierter Eco-Wert weist diesen zusätzlichen Wasserweg nicht aus.'};
    },{maschine_l:8.5,ergaenzung_l:3.5,ergaenzung_belegt:true,aufgabe_fertig:true},
    {gemessene_aufgabenmenge_l:12,ergaenzungsanteil_prozent:29.17}),

  task('kompaktspuel_trockenziel_kunststoff_und_sonstige_teilsets',
    'Prüft nach einer dokumentierten Extra-Trocknen-Nutzung, welche benötigte Teilgruppe noch eigene Trocknungsarbeit hatte — Record which required dish group still needed drying work after a documented Extra Dry run.',
    {option_belegt:yes('Option und der tatsächlich erprobte Programmzustand waren für das vorhandene Gerät dokumentiert?'),
      kunststoff:choice('Beleg für zur Nutzung benötigte geeignete Kunststoffteile.',['bereit','weiterer_schritt','offen','nicht_noetig']),
      andere_teile:choice('Beleg für andere benötigte Stücke zum gleichen selbst gesetzten Nutzungszeitpunkt.',['bereit','weiterer_schritt','offen','nicht_noetig'])},
    ({option_belegt,kunststoff,andere_teile})=>{
      const gruppe={kunststoff,andere_teile};
      return {trocknungsbedarf:option_belegt?Object.keys(gruppe).filter(k=>gruppe[k]==='weiterer_schritt'):null,
        fehlende_beobachtung:option_belegt?Object.keys(gruppe).filter(k=>gruppe[k]==='offen'):null,
        hinweis:'Festgehalten wird der eigene Bedarf nach dem Lauf. Aus dem Optionsnamen oder einzelnen Stücken keine allgemeine Trocknungsleistung und keine Materialeignung ableiten.'};
    },{option_belegt:true,kunststoff:'weiterer_schritt',andere_teile:'bereit'},
    {trocknungsbedarf:['kunststoff'],fehlende_beobachtung:[]}),

  task('kompaktspuel_kaufentscheidung_pilot_mit_abbruchgrenze',
    'Hält eine bewusst beendete Ladeprobe als Reichweitenbeleg fest, ohne eine nicht ausgeführte Reinigung mitzuzählen — Preserve the observed loading limit of an intentionally stopped trial.',
    {grund:choice('Dokumentierter Ausgang der Ladeprobe.',['plan_fertig','platzgrenze','materialbeleg_fehlt','anderer_grund','offen']),
      letzter_bestaetigter_satz:count('Anzahl kompletter eigener Gruppen mit überprüfter Vorbereitung.'),
      benoetigte_gruppen:count('Für diesen Einsatz notwendige Gruppen.'),
      maschinenlauf_belegt:yes('Für die erforderliche volle Ladung liegt ein abgeschlossener Nutzungsnachweis vor.')},
    ({grund,letzter_bestaetigter_satz,benoetigte_gruppen,maschinenlauf_belegt})=>{
      whole([letzter_bestaetigter_satz,benoetigte_gruppen]);
      const offen=Math.max(0,benoetigte_gruppen-letzter_bestaetigter_satz);
      return {offene_gruppen:grund==='offen'?null:offen,grund,
        voller_nutzungsbeleg:grund==='plan_fertig'&&benoetigte_gruppen>0&&offen===0&&maschinenlauf_belegt,
        hinweis:'Abbruch bei Platz oder ungeklärter Eignung ist kein Reinigungsfehler. Unbelegte Gruppen beim Kaufvergleich offenhalten.'};
    },{grund:'platzgrenze',letzter_bestaetigter_satz:2,benoetigte_gruppen:3,maschinenlauf_belegt:false},
    {offene_gruppen:1,grund:'platzgrenze',voller_nutzungsbeleg:false}),

  task('kompaktspuel_stromvergleich_teilaufgabe_untergrenze',
    'Prüft ob der gemessene Kompakt-Teil schon den Verbrauch der vollständigen bisherigen Aufgabe erreicht — Test whether the measured compact subset already uses the energy of the full existing workload.',
    {bestand_kwh:num('Gemessene kWh einer vollständigen bisherigen Haushaltsaufgabe.',0,100),
      kompakt_teil_kwh:num('Bereits gemessene kWh der begonnenen Kompaktvariante ohne offenen Rest.',0,100),
      messspiel_kwh:num('Abgeglichene Vergleichsbreite der beiden Zählerstände in kWh.',0,10),
      teilaufgabe_abgeglichen:yes('Es ist dieselbe gewünschte Arbeit, ein echter Teil der Aufgabe ist gemessen und der offene Rest kann nur Strom hinzufügen.')},
    ({bestand_kwh,kompakt_teil_kwh,messspiel_kwh,teilaufgabe_abgeglichen})=>({
      gemessene_untergrenze_kompakt_kwh:teilaufgabe_abgeglichen?kompakt_teil_kwh:null,
      bestehender_gesamtwert_schon_ueberschritten:teilaufgabe_abgeglichen?kompakt_teil_kwh>bestand_kwh+messspiel_kwh:null,
      hinweis:'Die Untergrenze enthält nur den gemessenen Teil. Ein noch niedrigerer Verbrauch zeigt keine Einsparung, solange der Rest der vollständigen Aufgabe offen ist.'
    }),{bestand_kwh:0.8,kompakt_teil_kwh:0.85,messspiel_kwh:0.02,teilaufgabe_abgeglichen:true},
    {gemessene_untergrenze_kompakt_kwh:0.85,bestehender_gesamtwert_schon_ueberschritten:true}),
];
