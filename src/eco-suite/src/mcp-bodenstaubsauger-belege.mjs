const page='/produkte.html';
const verified='2026-11-20';
const matrix='https://www.miele.de/c/staubsaugerbeutel-und-filter-10520.htm';
const gn='https://www.miele.de/product/12421170/4-staubsaugerbeutel-gn-hyclean-pure';
const gnXxl='https://www.miele.de/product/12498270/16-staubsaugerbeutel-zum-vorteilspreis-gn-xxl-hyclean-pure';
const fjm='https://www.miele.de/product/12421180/4-staubsaugerbeutel-fjm-hyclean-pure';
const tu='https://www.miele.de/product/12557060/4-staubsaugerbeutel-tu-hyclean-pure';
const co='https://www.miele.de/product/12557080/4-staubsaugerbeutel-co-hyclean-pure';
const guard='https://www.miele.de/product/12558870/bodenstaubsauger-mit-beutel-guard-l1-nordicblau';
const guardManual='https://media.miele.com/downloads/10/76/00_C7F128282CE91FE199B027081E511076.pdf';
const marketingGuard='https://www.miele.de/de/m/die-neue-guard-baureihe-auf-einen-blick-7424.htm';
const hepa30='https://www.miele.de/product/12785370/hepa-airclean-filter-sf-ha-30-1';
const hepa50='https://www.miele.de/product/12785390/hepa-airclean-filter-sf-ha-50-1';
const c3='https://media.miele.com/downloads/e-/de/FS_12031650_DED_DE-de-DE.pdf';
const c3CatDog='https://media.miele.com/downloads/e-/de/FS_10653390_DED_DE-de-DE.pdf';
const support='https://www.miele.de/support/customer-assistance/bodenstaubsauger_mit_oder_ohne_beutel-1194/alle_kategorien/reinigungsleistung_nimmt_ab_staubsauger_mit_beutel-92265764619';
const earlyFull='https://www.miele.de/support/customer-assistance/bodenstaubsauger_mit_oder_ohne_beutel-1194/alle_kategorien/staubsaugerbeutel_wechselanzeige_zeigt_vollen_staubsaugerbeutel_an-92374394507';
const lateFull='https://www.miele.de/support/customer-assistance/bodenstaubsauger_mit_oder_ohne_beutel-1194/alle_kategorien/staubsaugerbeutel_wechselanzeige_zeigt_leeren_staubsaugerbeutel_an-92264372107';
const turbo='https://media.miele.com/downloads/48/7a/04_C7F12828660B1FD09CBB7CF230ED487A.pdf';
const boost='https://www.miele.de/product/11602420/bodenstaubsauger-ohne-beutel-boost-cx1-cat-und-dog-powerline-obsidianschwarz';
const boostManual='https://media.miele.com/downloads/0a/3d/00_C7F12828EA7E1FD083C4AF3F279F0A3D.pdf';
const unresolved='beleg_offen';
const flag=description=>({type:'boolean',description});
const choose=(description,...values)=>({type:'string',description,enum:values});
const number=(description,minimum,maximum)=>({type:'number',description,minimum,maximum});
const count=description=>number(description,0,250);
const checks=description=>choose(description,'ja','nein','offen');
const hs22=flag('Deutsche Guard L1 Ausführung mit Typ HS22 und zugeordneter Anleitung M.-Nr. 13 114 040 bestätigt');
const cx1=flag('Deutsche Boost CX1 Cat & Dog PowerLine-Ausführung 11602420 und zugeordnete Anleitung bestätigt');
const roles=['beutel','motorschutz','abluftfilter'];
const bagPacks={
  GN:{url:gn,artikelnummer:'12421170',beutel:4,motorschutzfilter:1,abluftfilter:1},
  FJM:{url:fjm,artikelnummer:'12421180',beutel:4,motorschutzfilter:1,abluftfilter:1},
  TU:{url:tu,artikelnummer:'12557060',beutel:4,motorschutzfilter:0,abluftfilter:1,abluftfilter_art:'AirClean'},
  CO:{url:co,artikelnummer:'12557080',beutel:4,motorschutzfilter:0,abluftfilter:1,abluftfilter_art:'AirClean'},
};
const vacuumFamily={
  classic_c1:{bag:'GN',hepa:'SF-HA 30-1'},
  complete_c1:{bag:'FJM',hepa:'SF-HA 30-1'},
  complete_c2:{bag:'GN',hepa:'SF-HA 50-1'},
  complete_c3:{bag:'GN',hepa:'SF-HA 50-1'},
  compact_c1:{bag:'FJM',hepa:'SF-HA 50-1'},
  compact_c2:{bag:'FJM',hepa:'SF-HA 50-1'},
  guard_s1:{bag:'TU',hepa:'SF-HA 50-1'},
  guard_l1:{bag:'TU',hepa:'SF-HA 50-1'},
  guard_m1:{bag:'CO',hepa:'SF-HA 50-1'}
};
const family=(description)=>choose(description,...Object.keys(vacuumFamily),'nur_c1','nur_c2','unbekannt');
function entry(name,description,properties,calculate,args,expect){
  return {name,description,page,properties,calculate,example:{args,expect}};
}
function proof(quelle,abschnitt,grenze){
  return {herstellerquelle:quelle,abschnitt,quellen_geprueft:verified,grenze};
}
function whole(...numbers){
  if(!numbers.every(Number.isInteger)) throw new RangeError('Ganze Stückzahl angeben.');
}

export const bodenstaubsaugerBelege=[
  entry('miele_hyclean_beutel_vollstaendige_modellzeile',
    'Lies die eindeutige Classic-, Complete-, Compact- oder Guard-Bezeichnung ab und prüfe den vorgesehenen Beuteltyp — Match an exact German Miele vacuum model to its documented bag family',
    {
      modellfamilie:family('Vollständige deutsche Modellbezeichnung auf Typenschild oder Anleitung'),
      beutel_am_angebot:choose('Sichtbarer Typ auf der konkreten Packung oder im Angebot','GN','FJM','TU','CO','unbekannt')
    }, a=>{
      const row=vacuumFamily[a.modellfamilie];
      const product=a.beutel_am_angebot==='unbekannt'?null:a.beutel_am_angebot;
      const {url, ...lieferumfang}=bagPacks[row?.bag]??{};
      return {dokumentierter_beuteltyp:row?.bag??null,
        status:!row?'vollstaendigen_modellnamen_pruefen':!product?'beuteltyp_am_angebot_pruefen':
          row.bag===product?'gleich_mit_de_herstellerliste':'typ_weicht_von_de_herstellerliste_ab',
        ...proof(matrix,'Modellauswahl der deutschen Beutel- und Filterliste',
          'Classic C1 und Complete C1 sowie Compact C2 und Complete C2 stehen getrennt. Ein Kürzel wie C1 oder C2 reicht allein nicht.'),
        beleg_zum_passenden_originalpack:url??null,
        dokumentierter_de_originalpack:url?{...lieferumfang,geprueft_am:'2026-11-22'}:null};
    },{modellfamilie:'compact_c2',beutel_am_angebot:'GN'},
    {dokumentierter_beuteltyp:'FJM',status:'typ_weicht_von_de_herstellerliste_ab'}),

  entry('miele_zwei_sauger_vorrat_beutel_abluftfilter_getrennt',
    'Ordne einen gemeinsamen Ersatzvorrat für zwei Geräte nach Beutel und genau bezeichnetem Abluftfilter getrennt zu — Check which consumable role two Miele vacuums can share',
    {
      erstes_modell:family('Vollständige deutsche Modellreihe des ersten Saugers'),
      zweites_modell:family('Vollständige deutsche Modellreihe des zweiten Saugers'),
      vorrat_soll_hepa_serie_abdecken:flag('Der Vergleich bezieht sich beim Abluftfilter ausdrücklich auf die gelisteten Teile SF-HA 30-1 und SF-HA 50-1')
    }, a=>{
      const first=vacuumFamily[a.erstes_modell];
      const second=vacuumFamily[a.zweites_modell];
      const known=first&&second;
      return {gemeinsamer_beuteltyp:known&&first.bag===second.bag?first.bag:null,
        beleg_geteilter_beuteltyp:known?first.bag===second.bag:null,
        gemeinsamer_gelisteter_hepa_filter:known&&a.vorrat_soll_hepa_serie_abdecken&&first.hepa===second.hepa?first.hepa:null,
        beleg_geteilter_hepa_filter:known&&a.vorrat_soll_hepa_serie_abdecken?first.hepa===second.hepa:null,
        ...proof(matrix,'Getrennte Herstellerlisten für Beutel und HEPA – nur dokumentierte Rollen vergleichen',
          'Gleiche Beuteltyp-Kennung belegt keinen gemeinsamen Abluftfilter. Andere Abluftfilter-Ausführungen einzeln zuordnen.')};
    },{erstes_modell:'classic_c1',zweites_modell:'complete_c3',vorrat_soll_hepa_serie_abdecken:true},
    {gemeinsamer_beuteltyp:'GN',beleg_geteilter_beuteltyp:true,gemeinsamer_gelisteter_hepa_filter:null,beleg_geteilter_hepa_filter:false}),

  entry('miele_gn_packbedarf_drei_teile_aus_bestand',
    'Berechne, ob vorhandene passende Teile oder ein dokumentierter Original-GN-Pack die tatsächlich fehlenden drei Rollen abdecken — Compare verified GN pack contents against actual remaining needs',
    {
      modell_gn_belegt:flag('Deutsches Gerät und GN-Kompatibilität wurden eindeutig belegt'),
      gewaehltes_pack:choose('Exakt geplanter Herstellerpack','gn_4_12421170','gn_16_12498270','kein_offizieller_pack_belegt'),
      geplante_beutel:count('Beutel bis zum eigenen Planungstermin, aus eigenem belegten Bedarf'),
      geplante_motorschutzfilter:count('Nachweislich passende zusätzlich benötigte Standard-Motorschutzfilter'),
      geplante_abluftfilter:count('Nur tatsächlich benötigte passende AirClean-Abluftfilter im Gitter, ohne HEPA-Kassette'),
      beutel_vorhanden:count('Bereits vorhandene passende unbenutzte Beutel'),
      motorschutz_vorhanden:count('Bereits vorhandene passende Standard-Motorschutzfilter'),
      abluftfilter_vorhanden:count('Bereits vorhandene passende unverbrauchte AirClean-Abluftfilter im Gitter')
    }, a=>{
      const desired=[a.geplante_beutel,a.geplante_motorschutzfilter,a.geplante_abluftfilter];
      const present=[a.beutel_vorhanden,a.motorschutz_vorhanden,a.abluftfilter_vorhanden];
      whole(...desired,...present);
      const missing=desired.map((n,i)=>Math.max(0,n-present[i]));
      const {beutel,motorschutzfilter,abluftfilter}=bagPacks.GN;
      const references={gn_4_12421170:{n:[beutel,motorschutzfilter,abluftfilter],url:gn},gn_16_12498270:{n:[16,4,4],url:gnXxl}};
      const pack=references[a.gewaehltes_pack]??null;
      const contents=a.modell_gn_belegt&&pack?pack.n:null;
      const short=contents?missing.map((n,i)=>Math.max(0,n-contents[i])):null;
      const pairs=values=>values?Object.fromEntries(roles.map((key,i)=>[key,values[i]])):null;
      return {fehlmenge_vor_pack:a.modell_gn_belegt?pairs(missing):null,
        fehlmenge_nach_pack:pairs(short),
        status:!a.modell_gn_belegt?unresolved:missing.every(n=>n===0)?'vorhandener_bestand_genuegt':
          !contents?'packungsinhalt_offen':short.every(n=>n===0)?'gewaehlter_pack_deckt_bedarf':'weitere_einzelteile_noetig',
        ...proof(pack?.url??matrix,'Offiziell deklarierte GN-Packungsinhalte',
          'Die Abluftrolle gilt für AirClean-Einlegefilter. Weder ein HEPA-Filter noch Verbrauch pro Stunde sind aus der Beutelzahl ableitbar.')};
    },{modell_gn_belegt:true,gewaehltes_pack:'gn_4_12421170',geplante_beutel:5,geplante_motorschutzfilter:1,geplante_abluftfilter:2,
      beutel_vorhanden:1,motorschutz_vorhanden:0,abluftfilter_vorhanden:0},
    {fehlmenge_vor_pack:{beutel:4,motorschutz:1,abluftfilter:2},fehlmenge_nach_pack:{beutel:0,motorschutz:0,abluftfilter:1},status:'weitere_einzelteile_noetig'}),

  entry('miele_abluftfilter_serienausstattung_gegen_nachruestliste',
    'Trenne den Abluftfilter der deutschen Gerätekonfiguration vom gelisteten Zubehör und vom Zustand des eigenen Saugers — Separate documented factory filter, optional part and current installation',
    {
      materialnummer:choose('Exakt aufgelöste deutsche Materialnummer','12558870','12031650','10653390','unbekannt'),
      etikett_am_eigenen_filter:choose('Typ am eigenen eingebauten Filter abgelesen','airclean','active_airclean','sf_ha_50_1','unbekannt'),
      geraeteeintrag_passend:flag('Name und Materialnummer des deutschen Produktdokuments stimmen eindeutig')
    }, a=>{
      const rows={
        '12558870':{original:'airclean',doc:guard},
        '12031650':{original:'airclean',doc:c3},
        '10653390':{original:'active_airclean',doc:c3CatDog}
      };
      const row=a.geraeteeintrag_passend?rows[a.materialnummer]:null;
      const actual=a.etikett_am_eigenen_filter==='unbekannt'?null:a.etikett_am_eigenen_filter;
      return {dokumentierte_serienausstattung:row?.original??null,aktuell_abgelesen:actual,
        sf_ha_50_1_gelistetes_zubehoer:row?true:null,
        status:!row?'deutsche_geraetefassung_offen':!actual?'aktuell_eingesetzter_filter_offen':
          row.original===actual?'aktueller_typ_entspricht_datenblatt':'aktuelle_ausstattung_weicht_vom_datenblatt_ab',
        ...proof(row?.doc??null,'Deutsche Produkt- oder Datenblattzeile Abluftfilter',
          'Originalkonfiguration, Zubehörliste und heutiger Einbau sind getrennte Belege. Eine Shop-Empfehlung beweist keinen Lieferumfang.'),
        zubehoerquelle:hepa50};
    },{materialnummer:'12558870',etikett_am_eigenen_filter:'unbekannt',geraeteeintrag_passend:true},
    {dokumentierte_serienausstattung:'airclean',aktuell_abgelesen:null,sf_ha_50_1_gelistetes_zubehoer:true,status:'aktuell_eingesetzter_filter_offen'}),

  entry('miele_guard_l1_abluftfilter_gitter_wechselrichtung',
    'Kläre, in welcher Richtung bei bestätigtem Filtertyp das passende Gitter benötigt wird — Identify the grille requirement for the documented HS22 filter conversion',
    {
      hs22_bestaetigt:hs22,
      eingebaut:choose('Vor dem Wechsel festgestelltes Abluftsystem','airclean_einlage','freigegebene_kassette','offen'),
      ziel:choose('Geplanter laut Anleitung kompatibler Abluftfilter','airclean_einlage','freigegebene_kassette','offen'),
      vorhandenes_gitter:checks('Für die AirClean-Einlage liegt ein bestätigtes passendes Filtergitter vor')
    }, a=>{
      const known=a.hs22_bestaetigt&&a.eingebaut!=='offen'&&a.ziel!=='offen';
      const switches=known&&a.eingebaut!==a.ziel;
      return {status:!known?unresolved:!switches?'kein_systemwechsel_erfasst':a.ziel==='freigegebene_kassette'?
        'kassette_an_stelle_des_filtergitters_belegt':a.vorhandenes_gitter==='ja'?'airclean_mit_passendem_gitter_belegt':
          a.vorhandenes_gitter==='nein'?'passendes_gitter_fehlt':'passendes_gitter_noch_offen',
        gleichzeitige_abluftfilter_laut_anleitung:a.hs22_bestaetigt?1:null,
        ...proof(guardManual,'DE S. 14, 19–20, Abluftfilter und Filtergitter',
          'Die Prüfung gilt nur für das belegte HS22-System. Keine zwei Abluftfilter übereinander einplanen. Nur vom Hersteller freigegebene Teile abgleichen.')};
    },{hs22_bestaetigt:true,eingebaut:'freigegebene_kassette',ziel:'airclean_einlage',vorhandenes_gitter:'nein'},
    {status:'passendes_gitter_fehlt',gleichzeitige_abluftfilter_laut_anleitung:1}),

  entry('miele_timestrip_rot_aktivierung_filteranzeige',
    'Ordne eine rote Anzeige einem bestätigten und tatsächlich aktivierten timestrip am Abluftfilter zu — Read a documented time-strip state separately from the vacuum display',
    {
      filtertyp:choose('Schriftzug auf dem konkret eingebauten Filter', 'airclean_einlage','airclean_plus_50','silence_50_mit_timestrip',
        'active_50_mit_timestrip','hepa_50_mit_timestrip','unbekannt'),
      anzeigeort:choose('Wo war das Signal tatsächlich zu sehen','direkt_am_filter','am_geraet','unbekannt'),
      aktivierung_dokumentiert:checks('Aktivierung genau dieses Filters gemäß passender Anleitung dokumentiert'),
      signal:choose('Abgelesener Zustand dieses Streifens','voll_rot','schmaler_roter_anfang','sonst_oder_offen')
    }, a=>{
      const strip=['silence_50_mit_timestrip','active_50_mit_timestrip','hepa_50_mit_timestrip'].includes(a.filtertyp);
      return {status:a.anzeigeort==='am_geraet'?'geraeteanzeige_getrennt_pruefen':
        ['airclean_einlage','airclean_plus_50'].includes(a.filtertyp)?'keinen_timestrip_dieses_typs_belegt':
          !strip||a.anzeigeort!=='direkt_am_filter'||a.aktivierung_dokumentiert!=='ja'?unresolved:
          a.signal==='voll_rot'?'wechselhinweis_am_bestaetigten_filter':a.signal==='schmaler_roter_anfang'?'aktivierungsmarke_beobachtet':unresolved,
        ...proof(support,'DE Miele Service: Abluftfilter und timestrip',
          'Nur auf die belegte Ausführung mit Streifen anwenden. Ein roter Streifen oder Gerätesymbol misst keinen Staubgehalt.')};
    },{filtertyp:'hepa_50_mit_timestrip',anzeigeort:'direkt_am_filter',aktivierung_dokumentiert:'ja',signal:'voll_rot'},
    {status:'wechselhinweis_am_bestaetigten_filter'}),

  entry('miele_guard_l1_abluftanzeige_reset_vor_wechsel',
    'Prüfe nach einem bestätigten Wechsel, ob der aktuelle Anzeigezustand zum beschriebenen Zurücksetzen am Guard L1 passt — Decide whether the documented appliance reminder reset has its preconditions',
    {
      hs22_bestaetigt:hs22,
      geraeteanzeige_leuchtet:checks('Abluftfilter-Wechselanzeige am Gerät leuchtet jetzt eindeutig'),
      abluftfilter_gewechselt:checks('Passender Abluftfilter wurde in diesem Vorgang tatsächlich ausgetauscht'),
      nur_filterstreifen_erfasst:flag('Beleg betrifft die Anzeige am Ersatzfilter statt am Gerät')
    }, a=>{
      const known=a.hs22_bestaetigt&&!a.nur_filterstreifen_erfasst;
      const status=!known?unresolved:a.geraeteanzeige_leuchtet==='nein'?'zwischenzeit_laut_anleitung_nicht_ruecksetzbar':
        a.geraeteanzeige_leuchtet==='ja'&&a.abluftfilter_gewechselt==='ja'?'ruecksetzvoraussetzungen_erfasst':
          a.geraeteanzeige_leuchtet==='ja'&&a.abluftfilter_gewechselt==='nein'?'wechselhinweis_noch_offen':unresolved;
      return {status,...proof(guardManual,'DE S. 15, 19–20, Abluftfilter-Wechselanzeige',
        'Die Geräteanzeige ist eine Wartungserinnerung nach ungefähr 50 Betriebsstunden. Anwendbar nur auf die dokumentierte Gerätefassung, ohne elektrischen Eingriff.')};
    },{hs22_bestaetigt:true,geraeteanzeige_leuchtet:'nein',abluftfilter_gewechselt:'ja',nur_filterstreifen_erfasst:false},
    {status:'zwischenzeit_laut_anleitung_nicht_ruecksetzbar'}),

  entry('miele_beutelsignal_feinstaub_fusseln_abgleichen',
    'Ordne eine Abweichung zwischen Beutelanzeige und sichtbar erfasster Füllung nach der zuletzt beobachteten Staubart ein — Reconcile early or delayed bag-full signals with the recorded material',
    {
      beutelsauger_bestaetigt:flag('Miele Beutelmodell mit dokumentierter Wechselanzeige bestätigt'),
      signal:choose('Vor einer Kontrolle abgelesene Geräteanzeige','wechsel_sichtbar','kein_wechselhinweis','offen'),
      sichtzustand:choose('Direkt dokumentierter Zustand am ausgeschalteten Gerät','nicht_offensichtlich_voll','prall_gefuellt','offen'),
      sauggut:choose('Was in der vorliegenden Aufzeichnung überwog','feiner_staubsaugergeeigneter_staub','haare_oder_fusseln','gemischt_oder_offen')
    }, a=>{
      const early=a.signal==='wechsel_sichtbar'&&a.sichtzustand==='nicht_offensichtlich_voll';
      const late=a.signal==='kein_wechselhinweis'&&a.sichtzustand==='prall_gefuellt';
      return {status:!a.beutelsauger_bestaetigt?unresolved:early&&a.sauggut==='feiner_staubsaugergeeigneter_staub'?
        'frueher_hinweis_passt_zu_feinem_staub':late&&a.sauggut==='haare_oder_fusseln'?
          'spaeter_hinweis_passt_zu_haaren_oder_fusseln':early||late?'abweichung_ohne_zugeordnetes_sauggut':unresolved,
        ...proof(late?lateFull:earlyFull,'DE Miele Service · Anzeige für Mischstaub ausgelegt',
          'Die Anzeige ist keine Volumenmessung. Poren und sichtbare Füllung können unterschiedliche Hinweise geben. Aus einer Abweichung allein folgt kein Defekt.')};
    },{beutelsauger_bestaetigt:true,signal:'wechsel_sichtbar',sichtzustand:'nicht_offensichtlich_voll',sauggut:'feiner_staubsaugergeeigneter_staub'},
    {status:'frueher_hinweis_passt_zu_feinem_staub'}),

  entry('miele_guard_l1_beutelanzeige_pruefbedingungen',
    'Prüfe, ob die protokollierte Ablesung der Beutelanzeige unter den vorgesehenen Bedingungen stattfand — Confirm the observed Guard L1 bag-indicator measurement setup',
    {
      hs22_bestaetigt:hs22,
      umschaltbare_bodenduese:checks('Umschaltbare Bodendüse des vorgesehenen Prüfschritts eingesetzt'),
      maximale_stufe_belegt:checks('Maximale Saugstufe wurde bei der Ablesung eindeutig eingestellt'),
      duese_abgehoben:checks('Düse war bei der Ablesung ein Stück vom Boden abgehoben'),
      ablesung:choose('Beobachteter Anzeigestatus','wechsel','kein_wechsel','offen')
    }, a=>{
      const inputs={bodenduese:a.umschaltbare_bodenduese,stufe:a.maximale_stufe_belegt,abgehoben:a.duese_abgehoben};
      const gaps=Object.keys(inputs).filter(key=>inputs[key]!=='ja');
      return {fehlende_pruefbedingungen:a.hs22_bestaetigt?gaps:null,
        protokollierte_ablesung:a.hs22_bestaetigt&&gaps.length===0&&a.ablesung!=='offen'?a.ablesung:null,
        ...proof(guardManual,'DE S. 18, Staubsaugerbeutel-Wechselanzeige, „Zur Prüfung“',
          'Bewertet eine vorliegende Ablesung mit passender Bodendüse. Ein am Boden festsitzender Saugkopf liefert keinen vergleichbaren Befund.')};
    },{hs22_bestaetigt:true,umschaltbare_bodenduese:'ja',maximale_stufe_belegt:'ja',duese_abgehoben:'nein',ablesung:'wechsel'},
    {fehlende_pruefbedingungen:['abgehoben'],protokollierte_ablesung:null}),

  entry('miele_guard_l1_tu_halteplatte_sperrklinke',
    'Prüfe vor einem weiteren Beutelkauf, welche sichtbare Einrastbedingung am ausgeschalteten HS22 offen ist — Locate the missing TU seating proof before replacing a bag',
    {
      hs22_bestaetigt:hs22,
      tu_typ_belegt:checks('TU-Typ auf passender Packung eindeutig zugeordnet'),
      halteplatte_beide_seiten:checks('Platte in beiden Führungen bis zum Anschlag sichtbar erfasst'),
      sperrklinke_eingerastet:checks('Türkise Sperrklinke schließt mit eindeutiger Einrast-Bestätigung'),
      deckel_blockiert:checks('Bedienbarer Staubraumdeckel wurde bei normaler Handhabung als blockiert beobachtet')
    }, a=>{
      const confirmed=a.hs22_bestaetigt;
      const status=!confirmed?unresolved:a.tu_typ_belegt==='nein'?'beuteltyp_klaeren':
        a.halteplatte_beide_seiten==='nein'||a.sperrklinke_eingerastet==='nein'?'einrastbedingung_nicht_bestaetigt':
          a.tu_typ_belegt==='ja'&&a.halteplatte_beide_seiten==='ja'&&a.sperrklinke_eingerastet==='ja'?
            a.deckel_blockiert==='ja'?'blockade_trotz_belegter_sitzmerkmale_hersteller_pruefen':'dokumentierte_sitzmerkmale_erfasst':unresolved;
      return {status,...proof(guardManual,'DE S. 18–20, Staubsaugerbeutel entnehmen und einsetzen',
        'Nicht mit Gewalt schließen oder eine Sperre überbrücken. Aus dem beschriebenen Sitz folgt keine Diagnose des Deckels.')};
    },{hs22_bestaetigt:true,tu_typ_belegt:'ja',halteplatte_beide_seiten:'nein',sperrklinke_eingerastet:'offen',deckel_blockiert:'ja'},
    {status:'einrastbedingung_nicht_bestaetigt'}),

  entry('miele_guard_l1_lifetime_motorschutz_gegen_packungsfilter',
    'Ordne Motorschutzpflege der dokumentierten Lifetime-Ausführung zu, bevor ein Packungsfilter als Ersatz eingeplant wird — Separate HS22 lifetime motor filter care from legacy pack inserts',
    {
      hs22_bestaetigt:hs22,
      lifetime_teil_bestaetigt:checks('Das vorliegende Teil ist der in der Anleitung genannte Lifetime-Motorschutzfilter'),
      verschmutzung_sichtbar:checks('An der zugänglichen Filterfläche ist laut Beobachtung Schmutz sichtbar'),
      abluft_hinweis_leuchtet:checks('Die zugeordnete Geräteanzeige für den Abluftfilter leuchtet')
    }, a=>{
      const known=a.hs22_bestaetigt&&a.lifetime_teil_bestaetigt==='ja';
      const due=a.verschmutzung_sichtbar==='ja'||a.abluft_hinweis_leuchtet==='ja';
      const clean=a.verschmutzung_sichtbar==='nein'&&a.abluft_hinweis_leuchtet==='nein';
      return {plan:!known?unresolved:due?'trockenpflege_laut_modellanleitung':clean?'lifetime_filter_bleibt_im_bestand':'pflegebedarf_offen',
        regulaerer_austausch_als_verbrauchsteil:known?false:null,
        ...proof(guardManual,'DE S. 15, 21, Lifetime-Motorschutzfilter',
          'Bei diesem belegten Motorschutzfilter nennt die Anleitung trockene Pflege. Eine Verwechslung mit Abluftfilter oder Beutel vermeiden.')};
    },{hs22_bestaetigt:true,lifetime_teil_bestaetigt:'ja',verschmutzung_sichtbar:'offen',abluft_hinweis_leuchtet:'ja'},
    {plan:'trockenpflege_laut_modellanleitung'}),

  entry('miele_turboteq_305_teppich_drehzahl_abgleich',
    'Trenne einen beobachteten Drehzahlabfall auf dichtem Teppich von einem Problem auf weiteren freigegebenen Flächen — Localize a documented air-driven TurboTeQ slowdown',
    {
      stb_305_belegt:flag('Genaue Turbobürste STB 305-3 am Gerät identifiziert'),
      dichter_kurzflor:checks('Freigegebener dichter Kurzflor wurde beim beobachteten Lauf erfasst'),
      abfall_auf_teppich:checks('Bürste wurde auf genau diesem Teppich sichtbar langsamer'),
      gleiches_symptom_anderswo:checks('Dasselbe Symptom auf weiterer zulässiger Fläche mit unverändertem Vorsatz und gleicher Einstellung beobachtet')
    }, a=>{
      const known=a.stb_305_belegt&&a.abfall_auf_teppich==='ja';
      return {status:!known?unresolved:a.gleiches_symptom_anderswo==='ja'?'symptom_auch_auf_anderer_flaeche':
        a.dichter_kurzflor==='ja'&&a.gleiches_symptom_anderswo==='nein'?'lokales_luftstrommuster_passt_zum_herstellerhinweis':unresolved,
        ...proof(turbo,'DE Anleitung TurboTeQ STB 305-3, Nebenluft und dichtgewebter Teppich',
          'Dokumentiert den Kontext eines vergangenen Laufs. Keine Aussage zu elektrischem Fehler, Teppicheignung oder sicherem weiteren Betrieb.')};
    },{stb_305_belegt:true,dichter_kurzflor:'ja',abfall_auf_teppich:'ja',gleiches_symptom_anderswo:'nein'},
    {status:'lokales_luftstrommuster_passt_zum_herstellerhinweis'}),

  entry('miele_beutelsauger_leistungsverlust_grosse_teile',
    'Dokumentiere eine abrupte Veränderung des Saugwegs nach sperrigem Sauggut getrennt von schrittweisem Filterbedarf — Localize a documented onset of restriction after bulky material',
    {
      beutelmodell_bestaetigt:flag('Vorliegendes Miele Beutelgerät eindeutig identifiziert'),
      abfall:choose('Zeitlicher Verlauf aus Beobachtung','abrupt','schrittweise','offen'),
      sperrgut_vor_abfall:checks('Unmittelbar davor wurde sperriges trockenes Sauggut beobachtet'),
      warmes_gehaeuse:checks('Ungewöhnlich warmes Gehäuse wurde im selben Vorgang beobachtet'),
      sichtbares_hindernis:checks('Nach Abschalten und Trennen war an einer zulässigen äußeren Verbindung ein Hindernis sichtbar')
    }, a=>{
      const known=a.beutelmodell_bestaetigt;
      return {status:!known?unresolved:a.abfall==='abrupt'&&a.sperrgut_vor_abfall==='ja'&&a.sichtbares_hindernis==='ja'?
        'erscheinung_und_sichtbares_saugweghindernis_erfasst':
        a.abfall==='abrupt'&&a.sperrgut_vor_abfall==='ja'?'saugwegbeleg_nach_sperrigem_material_offen':
          a.abfall==='schrittweise'?'beutel_und_filterverlauf_getrennt_pruefen':unresolved,
        warmebeobachtung_fuer_service:known&&a.warmes_gehaeuse==='ja',
        ...proof(support,'DE Miele Service: Saugweg und Verstopfung',
          'Nicht erneut testen, wenn das Gerät ungewöhnlich warm wurde oder das Hindernis nicht äußerlich zugänglich ist. Keine Demontage.')};
    },{beutelmodell_bestaetigt:true,abfall:'abrupt',sperrgut_vor_abfall:'ja',warmes_gehaeuse:'ja',sichtbares_hindernis:'offen'},
    {status:'saugwegbeleg_nach_sperrigem_material_offen',warmebeobachtung_fuer_service:true}),

  entry('miele_guard_l1_parksystem_pause_oder_aufbewahrung',
    'Prüfe bei dem dokumentierten Guard, ob die gewählte Parkposition für eine kurze Pause oder die Abstellung vorgesehen ist — Match the documented HS22 parking position to the intended use',
    {
      hs22_bestaetigt:hs22,
      zweck:choose('Eigene Absicht','kurze_pause','aufbewahrung','unbekannt'),
      flaeche:choose('Beobachtete Lage des vorgesehenen Platzes','eben','schraeg','unbekannt'),
      parkaufnahme:choose('Identifizierte Aufnahme laut Abbildung','pause','unterseite','unbekannt')
    }, a=>{
      const expected=a.zweck==='kurze_pause'?'pause':a.zweck==='aufbewahrung'?'unterseite':null;
      return {status:!a.hs22_bestaetigt||!expected?unresolved:a.flaeche==='schraeg'?a.zweck==='kurze_pause'?'schraeger_pausenplatz_ausgeschlossen':'aufrechter_aufbewahrungsplatz_offen':
        a.parkaufnahme==='unbekannt'||a.flaeche==='unbekannt'?unresolved:
          a.parkaufnahme===expected?'aufnahmerolle_passt':'andere_parkaufnahme_fuer_diesen_zweck',
        ...proof(guardManual,'DE S. 17, Parksystem Abb. 21/22',
          'Kurze Pause und aufrechte Abstellung verwenden unterschiedliche Aufnahmen. Ein Parknocken belegt keine automatische Abschaltung.')};
    },{hs22_bestaetigt:true,zweck:'aufbewahrung',flaeche:'eben',parkaufnahme:'pause'},
    {status:'andere_parkaufnahme_fuer_diesen_zweck'}),

  entry('miele_guard_app_registrierung_gegen_wechselmeldung',
    'Unterscheide die Anzeige passenden Zubehörs nach Registrierung von einer aktiven Wechselmeldung beim belegten L1 Comfort — Check whether app registration actually proves a connected replacement notification',
    {
      modell:choose('Vollständig erfasste Guard-Variante','guard_l1_comfort','guard_l1_nordicblau_12558870','guard_s1','guard_m1','offen'),
      registrierung_beobachtet:checks('Das passende Gerät ist mit seiner Modellkennung im Profil erfasst'),
      vernetzung_bestaetigt:checks('Aktive Verbindung genau dieses Geräts war protokolliert'),
      gesuchter_beleg:choose('Was möchte ich unterscheiden','zubehoer_in_app','aktive_wechselmeldung','unbekannt')
    }, a=>{
      const known=a.modell!=='offen'&&a.gesuchter_beleg!=='unbekannt';
      return {status:!known?unresolved:a.gesuchter_beleg==='zubehoer_in_app'?
        a.registrierung_beobachtet==='ja'?'registrierter_zubehoerzugriff_belegt':'registrierung_offen':
          a.modell!=='guard_l1_comfort'?'aktive_wechselmeldung_fuer_diese_variante_nicht_belegt':
            a.vernetzung_bestaetigt==='ja'?'aktive_vernetzung_als_voraussetzung_belegt':'aktive_vernetzung_offen',
        ...proof(marketingGuard,'DE Guard-Baureihenübersicht, Abschnitt Vernetzung',
          'Vernetzung und Registrierung belegen keine tatsächliche Zustellung einer Meldung. Vom L1-Namen oder dem Zubehörverzeichnis allein keine Comfort-Funktion ableiten.')};
    },{modell:'guard_l1_nordicblau_12558870',registrierung_beobachtet:'ja',vernetzung_bestaetigt:'offen',gesuchter_beleg:'aktive_wechselmeldung'},
    {status:'aktive_wechselmeldung_fuer_diese_variante_nicht_belegt'}),

  entry('miele_boost_cx1_maxmarkierung_behaelter',
    'Lies die direkte Max-Markierung des belegten Boost-CX1-Behälters statt einer Wechselanzeige für Beutel — Inspect the documented bagless container fill line',
    {
      cx1_bestaetigt:cx1,
      markierung_sichtbar:checks('Max-Markierung am eigenen Staubbehälter war eindeutig zu sehen'),
      fuellstand:choose('Direkt bei abgeschaltetem Gerät aufgezeichneter Vergleich','unter_max','an_max','ueber_max','offen'),
      nur_aus_saugleistung_vermutet:flag('Es liegt nur die Vermutung aus schwächerer Saugleistung vor')
    }, a=>{
      const known=a.cx1_bestaetigt&&a.markierung_sichtbar==='ja'&&!a.nur_aus_saugleistung_vermutet;
      return {status:!known||a.fuellstand==='offen'?unresolved:
        a.fuellstand==='unter_max'?'unter_der_sichtbaren_markierung':'entleerungsgrenze_laut_anleitung_erreicht',
        belegter_beutelfreier_behaelter:a.cx1_bestaetigt?true:null,
        ...proof(boostManual,'HS20 M.-Nr. 12 837 480, DE S. 16, Staubbehälter und Max-Markierung',
          'Der Füllstand ist unabhängig von der Filterpflege. Schwache Saugleistung beweist keine volle Box.')};
    },{cx1_bestaetigt:true,markierung_sichtbar:'ja',fuellstand:'an_max',nur_aus_saugleistung_vermutet:false},
    {status:'entleerungsgrenze_laut_anleitung_erreicht',belegter_beutelfreier_behaelter:true}),

  entry('miele_boost_cx1_gepflegte_flaeche_reinigungsmedium',
    'Kläre die Herstellervorgabe je nach tatsächlicher Filterfläche oder Rahmen beim belegten Boost CX1 — Separate surface-specific care media for the documented Boost CX1 filter assembly',
    {
      cx1_bestaetigt:cx1,
      teil:choose('Im HS20-Ersatzbild eindeutig identifizierte Fläche',
        'plissierte_seite_feinstaubfilter','filtermatte','vorfilter_oder_filtereinsatz','rahmen_oder_seitenklappe','abluftfilter','offen'),
      vorliegende_methode:choose('Für diese Fläche belegte oder geplante Methode',
        'kaltes_wasser_ohne_spuelmittel_und_spuelbuerste','reinigungswerkzeug_laut_anleitung','leicht_feuchtes_tuch_mildes_spuelmittel','offen')
    }, a=>{
      const wet=['plissierte_seite_feinstaubfilter','filtermatte'].includes(a.teil);
      const brush=a.teil==='vorfilter_oder_filtereinsatz';
      const cloth=a.teil==='rahmen_oder_seitenklappe';
      const method=!a.cx1_bestaetigt?null:wet?'kaltes_wasser_ohne_spuelmittel_und_spuelbuerste':brush?
        'reinigungswerkzeug_laut_anleitung':cloth?'leicht_feuchtes_tuch_mildes_spuelmittel':null;
      return {methode_laut_anleitung:method,
        status:!method?unresolved:a.vorliegende_methode==='offen'?'methode_zu_diesem_teil_belegt':a.vorliegende_methode===method?
          'aufzeichnung_entspricht_dieser_methode':'keine_uebereinstimmung_mit_der_ausgewaehlten_methode',
        ...proof(boostManual,'HS20 DE S. 17–18, Feinstaubfilter, Filtermatte, Vorfilter und Filterrahmen',
          'Für die plissierte Seite ist zusätzlich trockene Pflege dokumentiert. Hier geht es um die benannte Methode. Andere Flächen und Abluftfilter haben eigene Hinweise.')};
    },{cx1_bestaetigt:true,teil:'vorfilter_oder_filtereinsatz',vorliegende_methode:'kaltes_wasser_ohne_spuelmittel_und_spuelbuerste'},
    {methode_laut_anleitung:'reinigungswerkzeug_laut_anleitung',status:'keine_uebereinstimmung_mit_der_ausgewaehlten_methode'}),

  entry('miele_boost_cx1_filtermatte_lage_entnahmeoese',
    'Vergleiche an der bereits identifizierten trockenen Boost-CX1-Filtermatte die Einlegelage mit den zwei sichtbaren Merkmalen — Verify documented orientation of a dry Boost CX1 filter mat',
    {
      cx1_bestaetigt:cx1,
      trockenheit_beider_teile:checks('Separat zugeordnete Filtermatte und Feinstaubfilter wurden bereits entsprechend Anleitung getrocknet'),
      weiche_seite_oben:checks('Die weiche Mattseite zeigt laut dokumentierter Ansicht nach oben'),
      entnahmeoese_sichtbar:checks('Die Entnahmeöse der Matte ist auf derselben Ansicht sichtbar')
    }, a=>{
      const known=a.cx1_bestaetigt&&a.trockenheit_beider_teile==='ja';
      const wrong=a.weiche_seite_oben==='nein'||a.entnahmeoese_sichtbar==='nein';
      const both=a.weiche_seite_oben==='ja'&&a.entnahmeoese_sichtbar==='ja';
      return {status:!known?unresolved:wrong?'lage_weicht_von_dokumentierten_merkmalen_ab':both?'beide_lagemerkmale_erfasst':unresolved,
        fehlende_lagemerkmale:known?[a.weiche_seite_oben!=='ja'&&'weiche_seite_oben',a.entnahmeoese_sichtbar!=='ja'&&'entnahmeoese'].filter(Boolean):null,
        ...proof(boostManual,'HS20 DE S. 17, Abb. 35',
          'Lage und Trocknung sind getrennte Belege. Die Anleitung nennt nach Nasspflege mindestens 24 Stunden für beide Teile.')};
    },{cx1_bestaetigt:true,trockenheit_beider_teile:'ja',weiche_seite_oben:'nein',entnahmeoese_sichtbar:'ja'},
    {status:'lage_weicht_von_dokumentierten_merkmalen_ab',fehlende_lagemerkmale:['weiche_seite_oben']}),

  entry('miele_boost_cx1_feinstaubfilter_oder_abluftteil',
    'Ordne CX FSF und SF-HA 60 der beobachteten Filterstelle des belegten Boost CX1 zu — Match related replacement part names to the actual filter stage',
    {
      cx1_bestaetigt:cx1,
      vorliegendes_teil:choose('Abgelesene Handelsbezeichnung','cx_fsf','sf_ha_60','sf_ha_50_1','offen'),
      betroffene_stelle:choose('Welches Teil im Gerätebild wirklich betrachtet wird','hinter_staubsammelbehaelter','abluftfilterfach','offen')
    }, a=>{
      const ref={cx_fsf:'hinter_staubsammelbehaelter',sf_ha_60:'abluftfilterfach'}[a.vorliegendes_teil];
      const allowed=a.cx1_bestaetigt&&a.betroffene_stelle!=='offen'&&a.vorliegendes_teil!=='offen';
      return {dokumentierte_position:a.cx1_bestaetigt?ref??null:null,
        status:!allowed?unresolved:!ref?'teil_fuer_dieses_beutellose_modell_nicht_belegt':
          ref===a.betroffene_stelle?'teil_und_filterstufe_stimmen_ueberein':'teil_gehoert_in_andere_filterstufe',
        ...proof(boostManual,'HS20 DE S. 17–19, CX FSF und HEPA AirClean SF-HA 60',
          'Die Produktanleitung unterscheidet Feinstaubfilter und Abluftfach. Ähnliche HEPA-Bezeichnungen für Beutelmodelle sind kein Zuordnungsbeleg.'),
        hersteller_produktseite:boost};
    },{cx1_bestaetigt:true,vorliegendes_teil:'cx_fsf',betroffene_stelle:'abluftfilterfach'},
    {dokumentierte_position:'hinter_staubsammelbehaelter',status:'teil_gehoert_in_andere_filterstufe'}),

  entry('miele_boost_cx1_fadenheber_oder_bodenduesenersatz',
    'Prüfe bei der dokumentierten Bodendüse, ob der sichtbare Verschleiß nur die separat vorgesehenen Fadenheber betrifft — Distinguish a worn replaceable lint strip from the nozzle itself',
    {
      cx1_bestaetigt:cx1,
      originale_duese_aus_abbildung:checks('Die vorliegende umschaltbare Bodendüse entspricht dem dokumentierten Typ mit Steckeinsätzen'),
      flor_am_fadenheber_verschlissen:checks('Flor am Fadenheber sichtbar verschlissen'),
      duese_anderswo_beschaedigt:checks('Außerhalb des Fadenhebers liegt eine sichtbare Beschädigung der Düse vor')
    }, a=>{
      const known=a.cx1_bestaetigt&&a.originale_duese_aus_abbildung==='ja';
      return {status:!known?unresolved:a.duese_anderswo_beschaedigt==='ja'?'schaeden_der_duese_separat_beurteilen':
        a.duese_anderswo_beschaedigt==='nein'&&a.flor_am_fadenheber_verschlissen==='ja'?'fadenheber_als_einzelteil_pruefen':
          a.flor_am_fadenheber_verschlissen==='nein'?'kein_fadenheberverschleiss_erfasst':unresolved,
        ...proof(boostManual,'HS20 DE S. 19, Fadenheber Abb. 44',
          'Nur Düsen mit separat ausgewiesenen und austauschbaren Fadenhebern einbeziehen. Bei einer anderen Düse zunächst Modellbeleg beschaffen.')};
    },{cx1_bestaetigt:true,originale_duese_aus_abbildung:'ja',flor_am_fadenheber_verschlissen:'ja',duese_anderswo_beschaedigt:'nein'},
    {status:'fadenheber_als_einzelteil_pruefen'}),

  entry('miele_guard_l1_kombiduese_fuge_polster_bestand',
    'Prüfe, ob die vorhandene 2-in-1-Düse den gesuchten Fugen- oder Polsteraufsatz bereits abdeckt — Identify an existing combined nozzle by its documented two positions',
    {
      hs22_bestaetigt:hs22,
      kombiduese_bestaetigt:checks('Vorhandene Polster- und Fugendüse entspricht der dokumentierten 2-in-1-Ausführung im Zubehörfach'),
      position:choose('Tatsächlich beobachtete Stellung','grundstellung','eingeschwenkt_und_eingerastet','offen'),
      gesuchte_rolle:choose('Art der anstehenden geeigneten Fläche','fuge','polster','offen')
    }, a=>{
      const known=a.hs22_bestaetigt&&a.kombiduese_bestaetigt==='ja'&&a.position!=='offen'&&a.gesuchte_rolle!=='offen';
      const actual=a.position==='grundstellung'?'fuge':'polster';
      return {status:!known?unresolved:actual===a.gesuchte_rolle?'vorhandene_stellung_fuer_rolle_belegt':'andere_stellung_des_selben_zubehoers_pruefen',
        aktuell_belegte_rolle:known?actual:null,
        ...proof(guardManual,'HS22 DE S. 16–17, kombinierte 2-in-1-Polster- und Fugendüse',
          'Nur am vorhandenen genauen Zubehör auswerten. Die Polsterstellung gilt erst bei klarer Einrast-Bestätigung. Materialpflege separat prüfen.')};
    },{hs22_bestaetigt:true,kombiduese_bestaetigt:'ja',position:'grundstellung',gesuchte_rolle:'polster'},
    {status:'andere_stellung_des_selben_zubehoers_pruefen',aktuell_belegte_rolle:'fuge'}),

  entry('miele_guard_l1_saugpinsel_handgriff_2_0_abnahmebeleg',
    'Prüfe, ob das beschriebene Abnehmen des Saugpinsels für das eigene Handgriffmodell belegt ist — Scope detachable dusting brush evidence to the documented Comfort 2.0 handle',
    {
      hs22_bestaetigt:hs22,
      griff:choose('Griff am Gerät exakt identifiziert','comfort_handgriff_2_0','comfort_ohne_2_0','unbekannt'),
      pinsel_am_griff_bestaetigt:checks('Saugpinsel und auf dem Griff dokumentierte Führung visuell zugeordnet'),
      zweck:choose('Welche Nutzung soll geprüft werden','am_handgriff','separat_am_saugrohr','offen')
    }, a=>{
      const known=a.hs22_bestaetigt&&a.griff!=='unbekannt'&&a.pinsel_am_griff_bestaetigt==='ja'&&a.zweck!=='offen';
      return {status:!known?unresolved:a.zweck==='am_handgriff'?'integrierter_saugpinsel_am_griff_belegt':
        a.griff==='comfort_handgriff_2_0'?'separate_nutzung_laut_2_0_anleitung_belegt':'separate_nutzung_fuer_diesen_griff_offen',
        ...proof(guardManual,'HS22 DE S. 17, Abb. 17–20, Saugpinsel am Handgriff',
          'Die gesonderte Rohrposition ist nur für das beschriebene Zubehör belegt. Griff nicht mit Kraft trennen.')};
    },{hs22_bestaetigt:true,griff:'comfort_ohne_2_0',pinsel_am_griff_bestaetigt:'ja',zweck:'separat_am_saugrohr'},
    {status:'separate_nutzung_fuer_diesen_griff_offen'})
];
