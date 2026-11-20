const products='/produkte.html';
const dual='https://www.philips.de/c-p/NA352_00/3000-series-dual-basket-airfryer';
const xxl='https://acc.philips.de/c-p/HD9875_90/connected-airfryer-xxl-serie-7000';
const forms='https://www.philips.de/c-f/XC000015318/welche-art-von-backform-kann-ich-im-philips-airfryer-verwenden/1000';
const kitSource='https://www.philips.de/c-p/NA352_00/3000-series-dual-basket-airfryer/support';
const matchedFamilies=['na350','na351','na352'];
const capacity={na352_00:{levels:[6,3],basis:'zwei_getrennte_koerbe',source:dual},hd9875_90:{levels:[8.3],basis:'gesamtvolumen_der_pfanne',source:xxl}};
const formLimits={klein:[180,90,70],gross:[170,180,70]};
const num=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const yes=description=>({type:'boolean',description});
const pick=(description,...values)=>({type:'string',description,enum:values});
const proof=description=>pick(description,'bestaetigt','abweichend','offen');
const basket=description=>pick(description,'klein','gross','offen');
const family=description=>pick(description,'na350','na351','na352','andere','offen');
const mm=description=>num(description,0,600);
const minutes=description=>num(description,0,1440);
const count=description=>num(description,0,100);
const round=value=>Number(value.toFixed(3));
function whole(...values){
  if(!values.every(Number.isInteger)) throw new RangeError('Ganze Mengen erforderlich');
}
function tool(name,description,properties,calculate,args,expect){
  return {name,description,page:products,properties,calculate,example:{args,expect}};
}

export const airfryerBehaelter=[
  tool('philips_airfryer_ungeteiltes_stueck_nennvolumen',
    'Ein unteilbares Stück mit dem einzelnen Korb vergleichen und Gesamtpfannenvolumen getrennt kennzeichnen — Check an indivisible volume against the stated vessel scope.',
    {modell:pick('Vollständige deutsche Gerätevariante.','na352_00','hd9875_90','anderes_oder_offen'),
      unteilbar:yes('Muss dieses Stück ungeteilt in ein Gefäß?'),volumen_l:num('Unabhängig bekanntes Volumen des ungeteilten Stücks in Litern, keine Schätzung aus dem Gesamtgewicht.',0.01,30)},
    ({modell,unteilbar,volumen_l})=>{
      const specs=capacity[modell];
      const status=!specs?'genaues_modell_klaeren':!unteilbar?'ungeteilte_anforderung_nicht_gegeben':modell==='hd9875_90'?'pfannenangabe_keine_nutzbare_stueckgroesse':
        volumen_l>specs.levels[0]?'einzelkorb_nennwert_unterschreitet_volumen':'nennwert_allein_belegt_keine_passung';
      return {hersteller_volumen_l:specs?.levels??null,basis:specs?.basis??null,status,primaerquelle:specs?.source??null,
        grenze:'6 + 3 Liter ergeben keinen durchgängigen Behälter. Nennvolumen berücksichtigt weder Form, Füllmarken noch den erforderlichen Luftweg.'};
    },{modell:'na352_00',unteilbar:true,volumen_l:6.2},
    {hersteller_volumen_l:[6,3],basis:'zwei_getrennte_koerbe',status:'einzelkorb_nennwert_unterschreitet_volumen'}),

  tool('philips_hd9875_90_gewichtsaussage_lebensmittelbezug',
    'Den 2-kg-Wert des HD9875/90 nur mit der klar belegten Beispielkategorie vergleichen — Keep the documented frozen-fries mass claim tied to its stated example.',
    {modell_belegt:yes('Ist die genaue deutsche Variante HD9875/90 anhand ihrer eigenen Gerätekennzeichnung bestätigt?'),
      bezug:pick('Kategorie des zu vergleichenden Angebots oder Nachweises.','tiefgekuehlte_pommes','haehnchen','anderes','offen'),
      verglichen_kg:num('Zu prüfender genannter Gewichtsvergleich in kg.',0.01,20),herkunft_gleich:yes('Bezieht sich die Zahl auf genau dieses Lebensmittel bei diesem einzelnen Gerät und auf die Kapazitätsangabe, nicht auf ein Gefäßvolumen?')},
    ({modell_belegt,bezug,verglichen_kg,herkunft_gleich})=>{
      const exact=modell_belegt&&herkunft_gleich&&bezug==='tiefgekuehlte_pommes';
      return {belegter_vergleichswert_kg:exact?2:null,abweichung_kg:exact?round(verglichen_kg-2):null,
        status:exact?'beispielbezug_abgeglichen':!modell_belegt||!herkunft_gleich?'varianten_und_angabenbezug_pruefen':'andere_lebensmittelangabe_offen',
        primaerquelle:xxl,grenze:'Nur Vergleich mit dem Herstellerbeispiel für tiefgekühlte Pommes. Keine erlaubte Füllmenge für ein Rezept und keine Aussage zu Ergebnis oder Lebensmittelsicherheit.'};
    },{modell_belegt:true,bezug:'tiefgekuehlte_pommes',verglichen_kg:2.4,herkunft_gleich:true},
    {belegter_vergleichswert_kg:2,abweichung_kg:0.4,status:'beispielbezug_abgeglichen'}),

  tool('philips_na35x_backform_rahmenmasse_korbwahl',
    'Gemessene Außenkanten einer Rechteckform gegen die dokumentierte NA350/351/352 Korbgrenze prüfen — Match an actual measured rectangular dish to the selected family basket.',
    {geraet:family('Genau am Gerät bestätigte Modellfamilie.'),korb:basket('Bestätigt betrachteter Korb.'),aussenmasse_belegt:yes('Wurden alle tatsächlichen Außenkanten inklusive Griffen und Höhe derselben Form gemessen?'),
      seite_a_mm:mm('Erste Außenkante in eingeplanter Orientierung.'),seite_b_mm:mm('Quer dazu liegende zweite Außenkante.'),hoehe_mm:mm('Größte Außenhöhe der Form.'),
      gedrehte_lage_belegt:yes('Ist eine Drehung um 90 Grad im tatsächlich bestätigten Aufbau anderweitig geometrisch möglich?')},
    ({geraet,korb,aussenmasse_belegt,seite_a_mm,seite_b_mm,hoehe_mm,gedrehte_lage_belegt})=>{
      if(aussenmasse_belegt&&(!seite_a_mm||!seite_b_mm||!hoehe_mm)) throw new RangeError('Bestätigte Maße müssen positiv sein');
      const limits=matchedFamilies.includes(geraet)?formLimits[korb]:undefined;
      const usable=Boolean(limits&&aussenmasse_belegt);
      const margins=usable?[limits[0]-seite_a_mm,limits[1]-seite_b_mm,limits[2]-hoehe_mm]:null;
      return {dokumentierte_aussenmasse_mm:limits??null,rest_planlage_mm:margins?.map(round)??null,
        rahmen_eingehalten:usable?margins.every(value=>value>=0):null,
        gedreht_im_rahmen:usable&&gedrehte_lage_belegt?seite_b_mm<=limits[0]&&seite_a_mm<=limits[1]&&hoehe_mm<=limits[2]:null,
        primaerquelle:forms,grenze:'Nur rechteckige Außenmaße für NA350/351/352. Die FAQ verlangt seitlich Luft. Ein eingehaltenes Maximalmaß ist keine Freigabe für Material, Luftweg oder Betrieb.'};
    },{geraet:'na352',korb:'klein',aussenmasse_belegt:true,seite_a_mm:87,seite_b_mm:175,hoehe_mm:62,gedrehte_lage_belegt:true},
    {dokumentierte_aussenmasse_mm:[180,90,70],rest_planlage_mm:[93,-85,8],rahmen_eingehalten:false,gedreht_im_rahmen:true}),

  tool('philips_hd9945_korb_und_originalteil_beleg',
    'Das Philips Backset HD9945/01 in den drei erfassten Gerätefamilien gegen den dokumentierten großen Korb abgleichen — Check the actual HD9945 kit and its specified basket.',
    {geraet:family('Genaue Modellfamilie auf dem Gerät.'),korb:basket('Tatsächlich vorgesehener Korb.'),
      artikel:pick('Abgelesene Artikelkennung des angebotenen oder vorhandenen Sets.','hd9945_01','hd9945_ohne_untervariante','anderer','offen'),
      kennung_am_tatsaechlichen_teil:yes('Wurde seine Kennung am Artikel selbst oder an der eindeutig zugehörigen Originalpackung verifiziert?')},
    ({geraet,korb,artikel,kennung_am_tatsaechlichen_teil})=>{
      const matched=matchedFamilies.includes(geraet);
      const status=!matched?'familie_ausserhalb_dieses_abgleichs':korb==='offen'?'korb_klaeren':korb==='klein'?'faq_nennt_nur_grossen_korb':
        artikel==='anderer'?'genannter_artikel_weicht_ab':artikel!=='hd9945_01'||!kennung_am_tatsaechlichen_teil?'exakten_artikelbeleg_sichern':'genannter_grosser_korb_und_artikel_abgeglichen';
      return {status,primaerquelle:forms,artikelquelle:kitSource,
        grenze:'Die deutsche FAQ nennt für diese Familien ausdrücklich den großen Korb. Ähnliche Artikelnummern und andere Familien werden dadurch nicht zugeordnet.'};
    },{geraet:'na351',korb:'klein',artikel:'hd9945_01',kennung_am_tatsaechlichen_teil:true},
    {status:'faq_nennt_nur_grossen_korb'}),

  tool('philips_hd9945_originalteile_und_fremdteile_pflege',
    'Bei gemischtem Backset sicher belegte Originalteile von Ersatzformen ohne eigene Pflegeangabe abgrenzen — Keep the documented dishwasher claim attached to identified kit components.',
    {hd9945_01_belegt:yes('Ist die genau betrachtete Originalausführung HD9945/01 belegt?'),
      originale_backform:proof('Zustand der Herkunftszuordnung der vorhandenen Back- und Auflaufform.'),
      originale_foermchen:count('Eindeutig zum Originalkit zugeordnete Silikonförmchen.'),
      andere_foermchen:count('Separat vorhandene Silikonförmchen ohne belegte Zuordnung zum Originalkit.'),
      andere_eigene_pflegeangabe:count('Davon durch ihre eigenen Unterlagen bestätigte Förmchen für dieselbe Reinigungsart.')},
    ({hd9945_01_belegt,originale_backform,originale_foermchen,andere_foermchen,andere_eigene_pflegeangabe})=>{
      whole(originale_foermchen,andere_foermchen,andere_eigene_pflegeangabe);
      if(andere_eigene_pflegeangabe>andere_foermchen) throw new RangeError('Zuordnung weiterer Förmchen');
      return {kit_beleg_fuer_form:hd9945_01_belegt&&originale_backform!=='offen'?originale_backform==='bestaetigt':null,
        kit_beleg_fuer_foermchen:hd9945_01_belegt?originale_foermchen:null,foermchen_eigener_beleg_offen:andere_foermchen-andere_eigene_pflegeangabe,
        primaerquelle:kitSource,grenze:'Philips nennt die Spülmaschineneignung für das Originalset. Diese Angabe gilt weder für lose Fremdteile noch für Gerätekörbe oder deren Einsätze.'};
    },{hd9945_01_belegt:true,originale_backform:'bestaetigt',originale_foermchen:9,andere_foermchen:3,andere_eigene_pflegeangabe:1},
    {kit_beleg_fuer_form:true,kit_beleg_fuer_foermchen:9,foermchen_eigener_beleg_offen:2}),

  tool('philips_na352_sync_anzeige_und_eigene_endbeobachtung',
    'Gleichzeitig angezeigtes Programmende von zwei tatsächlich beobachteten Abschlusszeitpunkten trennen — Compare synchronized display ends with documented task observations.',
    {gleicher_lauf:yes('Sind genau NA352/00, beide Anzeigen und beide persönlichen Abschlussbeobachtungen demselben Durchlauf eindeutig zugeordnet?'),
      sync_belegt:yes('Ist die Nutzung der Zeitsynchronisierung für diesen Lauf ausdrücklich beobachtet?'),
      anzeigen_differenz_min:num('Abstand der zwei tatsächlich gesehenen Anzeigenenden in Minuten.',0,1440),
      gross_check_min:minutes('Tagesminute, zu der eigene Beobachtung am großen Korb beendet wurde.'),klein_check_min:minutes('Entsprechende Minute am kleinen Korb.'),
      zeitgrenze_min:minutes('Eigene für dieses Protokoll festgelegte Toleranz für gleichzeitig.')},
    ({gleicher_lauf,sync_belegt,anzeigen_differenz_min,gross_check_min,klein_check_min,zeitgrenze_min})=>{
      const observed=Math.abs(gross_check_min-klein_check_min);
      return {beobachtungsabstand_min:gleicher_lauf?round(observed):null,
        nur_anzeigen_gleichzeitig:gleicher_lauf&&sync_belegt?anzeigen_differenz_min<=zeitgrenze_min&&observed>zeitgrenze_min:null,
        primaerquelle:dual,grenze:'Die Synchronisation stimmt Programmzeiten ab. Eigene Beobachtungszeit ist von tatsächlichem Garzustand oder Lebensmittelsicherheit getrennt.'};
    },{gleicher_lauf:true,sync_belegt:true,anzeigen_differenz_min:0,gross_check_min:720,klein_check_min:727,zeitgrenze_min:2},
    {beobachtungsabstand_min:7,nur_anzeigen_gleichzeitig:true}),

  tool('philips_na352_copy_status_gegen_sync_verwechseln',
    'Bei einer Werbeaussage über denselben Zeitplan COPY und synchronisiertes Ende auseinanderhalten — Separate identical programmed settings from the scheduling function.',
    {modell_belegt:yes('Exakte deutsche NA352/00-Ausführung belegt.'),beobachtete_funktion:pick('Im dokumentierten Lauf verwendete Funktion.','copy','sync','keine','offen'),
      dauer_gleich_gezeigt:yes('War dieselbe anfängliche Programmdauer an beiden Anzeigen tatsächlich sichtbar?'),temperatur_gleich_gezeigt:yes('War derselbe eingestellte Temperaturwert tatsächlich sichtbar?'),
      ende_gleich_behauptet:yes('Wird nur ein gleichzeitiges Ende als Beleg für gleiche Einstellungen angeführt?')},
    ({modell_belegt,beobachtete_funktion,dauer_gleich_gezeigt,temperatur_gleich_gezeigt,ende_gleich_behauptet})=>({
      gleiche_einstellungen_direkt_gesehen:modell_belegt?dauer_gleich_gezeigt&&temperatur_gleich_gezeigt:null,
      nur_endzeit_als_beleg:modell_belegt?ende_gleich_behauptet&&!(dauer_gleich_gezeigt&&temperatur_gleich_gezeigt):null,
      funktionsbefund:!modell_belegt||beobachtete_funktion==='offen'?'funktion_offen':beobachtete_funktion==='copy'?'gemeinsame_einstellungen_pruefen':beobachtete_funktion==='sync'?'programm_endzeiten_pruefen':'kein_funktionsbeleg',
      primaerquelle:dual,grenze:'Produktbeschreibung trennt Kopieren von Einstellungen und Zeitsynchronisierung. Nur tatsächlich beobachtete Anzeigen werden verglichen.'}
    ),{modell_belegt:true,beobachtete_funktion:'sync',dauer_gleich_gezeigt:false,temperatur_gleich_gezeigt:false,ende_gleich_behauptet:true},
    {gleiche_einstellungen_direkt_gesehen:false,nur_endzeit_als_beleg:true,funktionsbefund:'programm_endzeiten_pruefen'}),

  tool('philips_na35x_max_marke_korb_beobachtung',
    'Eine eigene kalte Beobachtung in einem einzelnen Korb gegen genau dessen sichtbare MAX-Markierung lesen — Compare the observed fill height with the same basket’s actual MAX mark.',
    {geraet:family('Belegte Gerätefamilie.'),korb:basket('Einzelner zu dieser Ablesung gehörender Korb.'),gleiches_lot_belegt:yes('Sind MAX-Markierung, oberste Stelle der beobachteten Füllung und gemeinsamer Höhenbezug am selben kalten Korb sichtbar?'),
      fuellung_mm:mm('Höchster beobachteter Punkt über dem vereinbarten Nullpunkt.'),maxmarke_mm:mm('Abgelesene Höhe der tatsächlichen MAX-Linie über demselben Nullpunkt.'),messspanne_mm:mm('Gemeinsame Unsicherheit der Höhendifferenz.')},
    ({geraet,korb,gleiches_lot_belegt,fuellung_mm,maxmarke_mm,messspanne_mm})=>{
      if(gleiches_lot_belegt&&!maxmarke_mm) throw new RangeError('Belegte MAX-Marke muss eine messbare Höhe haben');
      const comparable=matchedFamilies.includes(geraet)&&korb!=='offen'&&gleiches_lot_belegt;
      const difference=fuellung_mm-maxmarke_mm;
      return {lage_gegen_maxmarke_mm:comparable?round(difference):null,
        beobachtung:!comparable?'korb_und_markierung_zuordnen':difference>messspanne_mm?'oberhalb_gesehen':difference< -messspanne_mm?'unterhalb_gesehen':'im_messgrenzbereich',
        primaerquelle:'https://dam.versuni.com/m/11ba80be418a7f33/original/NA35x-Quick-Start-Guide.pdf',
        grenze:'Nur Beobachtung relativ zur echten Markierung desselben Korbs. Nicht in Liter oder Kilogramm übertragen und keine Empfehlung zur Füllung ableiten.'};
    },{geraet:'na352',korb:'gross',gleiches_lot_belegt:true,fuellung_mm:61,maxmarke_mm:65,messspanne_mm:5},
    {lage_gegen_maxmarke_mm:-4,beobachtung:'im_messgrenzbereich'}),

  tool('philips_backform_erst_seitenfreiraum_belegen',
    'Bei einer bereits geometrisch geprüften Form die tatsächlich sichtbaren Seiten getrennt vermerken — Verify that an apparent fit leaves observable space on all four sides.',
    {modell_und_form_bestaetigt:yes('Sind der genaue Korb, seine Formreferenz und dieselbe kalte Aufstellung bekannt?'),
      vorn:proof('Platz vor der Form am ganzen relevanten Rand sichtbar.'),hinten:proof('Entsprechender Platz hinter der Form.'),
      links:proof('Entsprechender Platz links.'),rechts:proof('Entsprechender Platz rechts.')},
    ({modell_und_form_bestaetigt,vorn,hinten,links,rechts})=>{
      const sides=[['vorn',vorn],['hinten',hinten],['links',links],['rechts',rechts]];
      return {sichtbar_kein_freiraum:modell_und_form_bestaetigt?sides.filter(([,state])=>state==='abweichend').map(([side])=>side):null,
        sichtprobe_offen:modell_und_form_bestaetigt?sides.filter(([,state])=>state==='offen').map(([side])=>side):['zuordnung'],
        primaerquelle:forms,grenze:'Philips verlangt seitlich Platz. Ein sichtbarer Spalt belegt weder eine vorgeschriebene Breite noch den tatsächlich ausreichenden Luftstrom im Betrieb.'};
    },{modell_und_form_bestaetigt:true,vorn:'bestaetigt',hinten:'offen',links:'abweichend',rechts:'bestaetigt'},
    {sichtbar_kein_freiraum:['links'],sichtprobe_offen:['hinten']}),

  tool('philips_na35x_rundform_durchmesser_quellenluecke',
    'Bei einer runden Form die getrennte Höhe aus der FAQ mit der noch offenen Durchmesserangabe abgleichen — Keep a usable height reference when the round-dish size needs separate verification.',
    {geraet:family('Belegte Modellfamilie des genauen Geräts.'),korb:basket('Identifizierter Korb.'),
      hoehe_mm:mm('Gemessene Außenhöhe der Form einschließlich ihrer unlösbaren Aufbauten.'),aussendurchmesser_mm:mm('Gemessener größter Außendurchmesser der Form.'),
      beide_masse_gemessen:yes('Sind beide Maße genau an dieser runden Form kalten Zustands gemessen?'),
      durchmesser_eigenquelle:proof('Liegt für genau diesen Korb und die runde Form eine separat klare, tatsächlich lesbare Herstellerquelle vor?')},
    ({geraet,korb,hoehe_mm,aussendurchmesser_mm,beide_masse_gemessen,durchmesser_eigenquelle})=>{
      if(beide_masse_gemessen&&(!hoehe_mm||!aussendurchmesser_mm)) throw new RangeError('Gemessener Durchmesser und Höhe');
      const scoped=matchedFamilies.includes(geraet)&&korb!=='offen';
      return {dokumentierte_hoehe_mm:scoped?70:null,hoehe_im_dokumentierten_rahmen:scoped&&beide_masse_gemessen?hoehe_mm<=70:null,
        erfasster_durchmesser_mm:beide_masse_gemessen?aussendurchmesser_mm:null,
        durchmesser_beleg:!scoped?'familie_oder_korb_offen':durchmesser_eigenquelle==='bestaetigt'?'separate_quelle_heranziehen':durchmesser_eigenquelle==='abweichend'?'separaten_widerspruch_klaeren':'durchmesser_als_offen_fuehren',
        primaerquelle:forms,grenze:'Keine runde Freigabe aus einem Rechteckmaß berechnen. Form, Material und Luftweg separat prüfen.'};
    },{geraet:'na352',korb:'gross',hoehe_mm:65,aussendurchmesser_mm:165,beide_masse_gemessen:true,durchmesser_eigenquelle:'offen'},
    {dokumentierte_hoehe_mm:70,hoehe_im_dokumentierten_rahmen:true,erfasster_durchmesser_mm:165,durchmesser_beleg:'durchmesser_als_offen_fuehren'}),

  tool('philips_hd9945_foermchenbedarf_kalt_gepruefte_stellplaetze',
    'Neun belegte Förmchen im Set von den tatsächlich nutzbaren Einzelplätzen der eigenen kalten Anordnung trennen — Plan a cold mock-up using observed cup positions, not nominal package count.',
    {originalkit_und_korb_bestaetigt:yes('Ist HD9945/01 und sein richtiger Korb bestätigt, und ist die Anordnung im kalten Prüfaufbau beobachtet?'),
      bei_mir_original:count('Tatsächlich passende Originalförmchen im eigenen Bestand.'),
      erprobte_stellplaetze:count('Einzeln beobachtete gleichzeitig freibleibende Stellplätze, ohne Linien oder Fläche hochzurechnen.'),
      gewuenschte_plaetze:count('Für die eigene Geometrieprobe gewünschte Plätze.')},
    ({originalkit_und_korb_bestaetigt,bei_mir_original,erprobte_stellplaetze,gewuenschte_plaetze})=>{
      whole(bei_mir_original,erprobte_stellplaetze,gewuenschte_plaetze);
      const present=Math.min(bei_mir_original,erprobte_stellplaetze);
      return {foermchen_im_serienkit:9,bei_kalter_probe_zaehlbar:originalkit_und_korb_bestaetigt?present:null,
        platzluecke:originalkit_und_korb_bestaetigt?Math.max(0,gewuenschte_plaetze-erprobte_stellplaetze):null,
        bestandsluecke:originalkit_und_korb_bestaetigt?Math.max(0,Math.min(gewuenschte_plaetze,erprobte_stellplaetze)-bei_mir_original):null,
        primaerquelle:kitSource,grenze:'Packungszahl ist keine zulässige gleichzeitige Befüllung. Beschreibt eine beobachtete kalte Aufteilung, keine Backempfehlung.'};
    },{originalkit_und_korb_bestaetigt:true,bei_mir_original:6,erprobte_stellplaetze:7,gewuenschte_plaetze:8},
    {foermchen_im_serienkit:9,bei_kalter_probe_zaehlbar:6,platzluecke:1,bestandsluecke:1}),

  tool('philips_na352_sync_spaetere_anzeigen_weitergabe',
    'Nach einer anfänglichen Synchronisationsanzeige den zuletzt belegten gemeinsamen Zeitstand für die Küchenübergabe bestimmen — Preserve separate evidence when only one programmed end time changed.',
    {gleiche_sitzung_verfolgt:yes('Gehören Anfangs- und spätere Anzeigen derselben NA352/00-Sitzung an?'),
      letzter_gemeinsamer_stand:yes('Waren anfangs beide angezeigten Endzeiten tatsächlich zusammen dokumentiert?'),
      gross_endanzeige:proof('Ist die neueste Endanzeige am großen Korb separat erneut abgelesen?'),
      klein_endanzeige:proof('Ist die neueste Endanzeige am kleinen Korb separat erneut abgelesen?'),
      lage_nach_aenderung:pick('Tatsächliche beobachtete Beziehung der neuesten Endanzeigen.','gleich','verschieden','offen')},
    ({gleiche_sitzung_verfolgt,letzter_gemeinsamer_stand,gross_endanzeige,klein_endanzeige,lage_nach_aenderung})=>{
      const complete=gleiche_sitzung_verfolgt&&gross_endanzeige==='bestaetigt'&&klein_endanzeige==='bestaetigt';
      return {juengster_gemeinsamer_beleg:complete&&lage_nach_aenderung!=='offen'?lage_nach_aenderung:null,
        nur_alter_gemeinsamer_stand:gleiche_sitzung_verfolgt&&letzter_gemeinsamer_stand&&(!complete||lage_nach_aenderung==='offen'),
        neue_ablesung_noetig:gleiche_sitzung_verfolgt?[gross_endanzeige==='bestaetigt'?null:'gross',klein_endanzeige==='bestaetigt'?null:'klein'].filter(Boolean):['laufzuordnung'],
        primaerquelle:dual,grenze:'Dokumentation der sichtbaren Anzeigen. Der Check steuert keine Zeitsynchronisierung und leitet aus Zeitangaben keinen Garzustand ab.'};
    },{gleiche_sitzung_verfolgt:true,letzter_gemeinsamer_stand:true,gross_endanzeige:'bestaetigt',klein_endanzeige:'offen',lage_nach_aenderung:'offen'},
    {juengster_gemeinsamer_beleg:null,nur_alter_gemeinsamer_stand:true,neue_ablesung_noetig:['klein']}),

  tool('philips_dualkorb_ungeteilte_form_kaltes_musterstueck',
    'Ein ungeteiltes langes Musterstück nur auf tatsächlich vorhandene zusammenhängende Korbfläche prüfen — Preserve shape evidence for a one-piece footprint without adding basket areas.',
    {ein_stueck_dokumentiert:yes('Bezieht sich dieselbe kalte Probe auf ein zusammenhängendes Musterstück, seine geprüfte Orientierung und beide echten Körbe?'),
      benoetigte_freie_laenge_mm:mm('Gemessene Länge des starren Musters entlang der vorgesehenen belegten Linie.'),
      gross_frei_mm:mm('Durchgängige, tatsächlich gemessene freie Länge auf dieser Linie im großen Korb.'),
      klein_frei_mm:mm('Entsprechende separat gemessene Linie im kleinen Korb.'),
      linie_allein_ausreichend:yes('Wurden Breite, Höhe, Seitenraum und Zweck zusätzlich unabhängig für die jeweilige Konfiguration bestätigt?')},
    ({ein_stueck_dokumentiert,benoetigte_freie_laenge_mm,gross_frei_mm,klein_frei_mm,linie_allein_ausreichend})=>{
      if(ein_stueck_dokumentiert&&!benoetigte_freie_laenge_mm) throw new RangeError('Positive Länge des Musters');
      const margins=[gross_frei_mm-benoetigte_freie_laenge_mm,klein_frei_mm-benoetigte_freie_laenge_mm];
      return {linienrest_gross_klein_mm:ein_stueck_dokumentiert?margins.map(round):null,
        kein_korb_mit_ausreichender_gemessener_linie:ein_stueck_dokumentiert?margins.every(value=>value<0):null,
        andere_kanten_separat_pruefen:!linie_allein_ausreichend,
        grenze:'Eine vermessene Linie nur für die dokumentierte Orientierung lesen. Daraus folgt keine allgemeine Stückpassform oder zulässige Verwendung.'};
    },{ein_stueck_dokumentiert:true,benoetigte_freie_laenge_mm:192,gross_frei_mm:180,klein_frei_mm:169,linie_allein_ausreichend:false},
    {linienrest_gross_klein_mm:[-12,-23],kein_korb_mit_ausreichender_gemessener_linie:true,andere_kanten_separat_pruefen:true}),

  tool('philips_na352_programmende_signal_ausgabe_unbekannt',
    'Ein einzelnes fotografiertes Ende ohne Zuordnung zum kleinen oder großen Korb im Protokoll offen lassen — Resolve ambiguous end evidence instead of inferring the other basket’s state.',
    {modell_und_sitzung_belegt:yes('Gehören Anzeige oder Notiz eindeutig zu einer Sitzung am deutschen NA352/00?'),
      eindeutige_endanzeige:pick('Welchem Korb ist das neueste bestätigte Ende anhand der Aufzeichnung zugeordnet?','gross','klein','beide','offen'),
      meldung_anzeige_unterstuetzt:yes('Ist die betrachtete Meldung tatsächlich als Programmende dieser Anzeige identifiziert?'),
      sync_markierung_gesehen:yes('Wurde die Synchronisierungsmarkierung unabhängig davon im selben Lauf gesehen?')},
    ({modell_und_sitzung_belegt,eindeutige_endanzeige,meldung_anzeige_unterstuetzt,sync_markierung_gesehen})=>({
      individuell_belegte_anzeigenenden:modell_und_sitzung_belegt&&meldung_anzeige_unterstuetzt?eindeutige_endanzeige==='beide'?['gross','klein']:eindeutige_endanzeige==='offen'?[]:[eindeutige_endanzeige]:[],
      nachweis_noch_offen:!modell_und_sitzung_belegt?'sitzung_zuordnen':!meldung_anzeige_unterstuetzt?'meldung_zuordnen':eindeutige_endanzeige==='beide'?'keine_zweite_anzeige_offen':'zweiten_anzeigebeleg_getrennt_pruefen',
      sync_markierung_getrennt:modell_und_sitzung_belegt?sync_markierung_gesehen:null,
      primaerquelle:dual,grenze:'Programmende dokumentieren. Unklare Zuordnung oder eine Synchronisierungsanzeige belegt kein Ende am anderen Korb und keinen Garzustand.'}
    ),{modell_und_sitzung_belegt:true,eindeutige_endanzeige:'gross',meldung_anzeige_unterstuetzt:true,sync_markierung_gesehen:true},
    {individuell_belegte_anzeigenenden:['gross'],nachweis_noch_offen:'zweiten_anzeigebeleg_getrennt_pruefen',sync_markierung_getrennt:true}),

  tool('philips_backset_gebrauchsspuren_originalform_vergleichen',
    'Einen gebrauchten Formkörper und überstehende Griffe technisch getrennt als Sichtbefund einordnen — Check whether observed rim changes invalidate an older exterior measurement.',
    {messungen_am_gleichen_teil:yes('Sind ältere Außenmessung und heutige kalte Beobachtung sicher genau derselben Form zugeordnet?'),
      alter_rahmen_mm:mm('Ältere größte gemessene Außenbreite einschließlich Griffen.'),
      neuer_rahmen_mm:mm('Aktuell beobachtete größte Außenbreite einschließlich Griffen.'),messspanne_mm:mm('Kombinierte Unsicherheit dieser Breiten.'),
      rand_auffaellig:yes('Ist am Rand oder Griffbereich eine tatsächliche äußerliche Auffälligkeit dokumentiert?')},
    ({messungen_am_gleichen_teil,alter_rahmen_mm,neuer_rahmen_mm,messspanne_mm,rand_auffaellig})=>{
      if(messungen_am_gleichen_teil&&(!alter_rahmen_mm||!neuer_rahmen_mm)) throw new RangeError('Bestätigte Außenmaße');
      const delta=neuer_rahmen_mm-alter_rahmen_mm;
      return {neue_minus_alte_breite_mm:messungen_am_gleichen_teil?round(delta):null,
        fruehere_passprobe_neu_abgleichen:messungen_am_gleichen_teil?Math.abs(delta)>messspanne_mm||rand_auffaellig:null,
        primaerquelle:forms,grenze:'Nur erneuter Maß- und Sichtabgleich. Keine Aussage zu Ursache, Oberfläche, Reparatur oder weiterer Verwendung.'};
    },{messungen_am_gleichen_teil:true,alter_rahmen_mm:171,neuer_rahmen_mm:179,messspanne_mm:3,rand_auffaellig:true},
    {neue_minus_alte_breite_mm:8,fruehere_passprobe_neu_abgleichen:true}),

  tool('philips_na352_sync_versetzter_beginn_beobachtung',
    'Zeitversetzte programmierte Starts bei beobachtetem gemeinsamen Ende protokollieren — Separate observed start offset from the claim of a synchronized finish.',
    {start_ende_desselben_laufs:yes('Sind alle vier angezeigten Ereignisse am exakt bestätigten NA352/00 derselben Sitzung zugeordnet?'),
      gross_start_min:minutes('Tatsächlich beobachtete Programmstartminute des großen Korbs.'),klein_start_min:minutes('Entsprechender Start des kleinen Korbs.'),
      gross_ende_min:minutes('Beobachtete Programmendeminute des großen Korbs.'),klein_ende_min:minutes('Entsprechendes Ende des kleinen Korbs.'),
      genauigkeit_min:minutes('Gemeinsame Beobachtungstoleranz für Start- und Endabstände.')},
    ({start_ende_desselben_laufs,gross_start_min,klein_start_min,gross_ende_min,klein_ende_min,genauigkeit_min})=>{
      if(start_ende_desselben_laufs&&(gross_start_min>=gross_ende_min||klein_start_min>=klein_ende_min)) throw new RangeError('Beobachtete Tagesabläufe');
      const start=klein_start_min-gross_start_min, end=klein_ende_min-gross_ende_min;
      return {startversatz_klein_minus_gross_min:start_ende_desselben_laufs?round(start):null,
        endversatz_klein_minus_gross_min:start_ende_desselben_laufs?round(end):null,
        gemeinsam_endend_trotz_versetztem_beginn:start_ende_desselben_laufs?Math.abs(start)>genauigkeit_min&&Math.abs(end)<=genauigkeit_min:null,
        primaerquelle:dual,grenze:'Ordnet tatsächlich beobachtete Programmmarken ein. Daraus lassen sich keine Garzeiten oder Aussagen zum Inhalt ableiten.'};
    },{start_ende_desselben_laufs:true,gross_start_min:680,klein_start_min:689,gross_ende_min:709,klein_ende_min:710,genauigkeit_min:2},
    {startversatz_klein_minus_gross_min:9,endversatz_klein_minus_gross_min:1,gemeinsam_endend_trotz_versetztem_beginn:true}),

  tool('philips_na352_kit_einsatzzweck_statt_shoptitel',
    'Ein vorhandenes oder angebotenes Philips Kit nach seiner dokumentierten Aufgabe statt nach dem Shop-Sammelbegriff auswählen — Distinguish HD9945/01 bakeware and HD9920/00 rack-and-skewer evidence.',
    {na352_00_belegt:yes('Ist das deutsche NA352/00 am eigenen Gerät genau identifiziert?'),
      tatsaechlicher_artikel:pick('Eindeutig abgelesenes Originalteil-Set.','hd9945_01','hd9920_00','anderes_oder_offen'),
      gewuenschter_zweck:pick('Eigener beabsichtigter Zubehörzweck.','back_und_auflaufform','muffinfoermchen','grillrost_mit_spiessen'),
      passendes_bereits_vorhanden:yes('Ist passendes Zubehör für diesen Zweck bereits unabhängig bestätigt und vorhanden?')},
    ({na352_00_belegt,tatsaechlicher_artikel,gewuenschter_zweck,passendes_bereits_vorhanden})=>{
      const purposes={hd9945_01:['back_und_auflaufform','muffinfoermchen'],hd9920_00:['grillrost_mit_spiessen']};
      const documented=na352_00_belegt&&purposes[tatsaechlicher_artikel]?purposes[tatsaechlicher_artikel].includes(gewuenschter_zweck):null;
      return {zweck_im_beleg_genannt:documented,
        naechster_schritt:passendes_bereits_vorhanden?'vorhandenes_zubehoer_nutzen':documented===null?'geraet_und_artikel_zuordnen':!documented?'passenden_artikelabgleich_suchen':'konkreten_korb_separat_zuordnen',
        primaerquelle:kitSource,grenze:'Die deutsche Unterstützung listet beide Sets. Ein allgemein gelistetes Set belegt nicht dieselbe Korbzuordnung für alle Zubehörteile.'};
    },{na352_00_belegt:true,tatsaechlicher_artikel:'hd9920_00',gewuenschter_zweck:'muffinfoermchen',passendes_bereits_vorhanden:false},
    {zweck_im_beleg_genannt:false,naechster_schritt:'passenden_artikelabgleich_suchen'}),
];
