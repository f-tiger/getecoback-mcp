const page='/produkte.html';
const black='https://www.beurer.com/de/p/70311/';
const stainless='https://www.beurer.com/de/p/70312/';
const data='https://pim.beurer.com/images/attribut/703.11_KS34_2018-09-05_02_DS_DE_BEU.pdf';
const manual='https://res.cloudinary.com/beurer/image/upload/v1785412383/stibo-live/70311-13_KS34_2026-07-21_07_IM1_BEU.pdf';
const yes=description=>({type:'boolean',description});
const n=(description,maximum=30000)=>({type:'number',description,minimum:0,maximum});
const pick=(description,...values)=>({type:'string',description,enum:values});
const model=yes('Die deutsche Ausführung KS 34 XL Black 70311 ist am konkreten Gerät belegt?');
const doc=yes('Gehört die Ausgabe 70311-13_KS34_2026-07-21_07_IM1_BEU zur konkreten Waage?');
const info=(name,description,properties,calculate,args,expect)=>({name,description,page,properties,calculate,example:{args,expect}});

export const kuechenwaagenBelege=[
  info('beurer_ks34_artikelnummer_wiegeoberflaeche',
    'Wiegefläche der Beurer KS 34 nach deutscher Artikelnummer 70311 oder 70312 zuordnen — Resolve the documented contact surface from the exact German variant.',
    {nummer:pick('Vom Typenschild oder Angebot eindeutig zugeordnete Artikelnummer.','70311','70312','unklar'),nachweis:yes('Originalhersteller oder Typenschild ist belegt?')},
    ({nummer,nachweis})=>({wiegeflaeche:nachweis?({70311:'glas',70312:'edelstahl'})[nummer]??null:null,
      quelle:nummer==='70312'?stainless:black,hinweis:'Die Familienbezeichnung allein weist keine Materialausführung nach.'}),
    {nummer:'70312',nachweis:true},{wiegeflaeche:'edelstahl'}),

  info('beurer_ks34_tara_bruttolast_tragkraft',
    'Schüssel und Inhalt zusammen gegen die Tragkraft der Beurer KS 34 prüfen, auch wenn die Anzeige tariert ist — Count gross load against the documented limit even after tare.',
    {modell_belegt:model, gefaess_g:n('Gemessene Masse des leeren Gefäßes in Gramm.'), inhalt_g:n('Geplante Masse des Inhalts oder der Gesamtzutaten in Gramm.')},
    ({modell_belegt,gefaess_g,inhalt_g})=>{
      const last=gefaess_g+inhalt_g;
      return {bruttolast_g:last,dokumentierte_reserve_g:modell_belegt?15000-last:null,
        innerhalb_tragkraft:modell_belegt?last<=15000:null,quelle:data,hinweis:'Tara ändert den Anzeigebezug. Das Gefäß bleibt auf der Waage.'};
    },{modell_belegt:true,gefaess_g:2100,inhalt_g:13100},
    {bruttolast_g:15200,dokumentierte_reserve_g:-200,innerhalb_tragkraft:false}),

  info('beurer_ks34_wiegebereich_fuenf_gramm_und_einteilung',
    'Eine kleine Zutat mit der dokumentierten unteren Wiegegrenze und der 1-g-Einteilung abgleichen — Treat the smallest specified weighing load separately from the display graduation.',
    {anleitung_belegt:doc, menge_g:n('Abzuwiegende Masse in Gramm.')},
    ({anleitung_belegt,menge_g})=>({untergrenze_g:anleitung_belegt?5:null,einteilung_g:anleitung_belegt?1:null,
      im_dokumentierten_bereich:anleitung_belegt?menge_g>=5&&menge_g<=15000:null,quelle:manual,
      hinweis:'Die Displayteilung ist keine Zusage über absolute Genauigkeit.'}),
    {anleitung_belegt:true,menge_g:3},{untergrenze_g:5,einteilung_g:1,im_dokumentierten_bereich:false}),

  info('beurer_ks34_halteanzeige_protokollspeicher_unterschied',
    'Hold-Anzeige am Gerät und einen für spätere Nutzung gespeicherten Messwert unterscheiden — Check whether a visible held reading can satisfy a history requirement.',
    {modell_belegt:model, bedarf:pick('Was soll mit der Messung passieren?','anzeigen_abwiegen','spaeter_abrufbar','unklar')},
    ({modell_belegt,bedarf})=>({hold_vorhanden:modell_belegt?true:null, messwertspeicher_vorhanden:modell_belegt?false:null,
      bedarf_im_datenblatt_abgedeckt:modell_belegt&&bedarf!=='unklar'?bedarf==='anzeigen_abwiegen':null,
      quelle:black,hinweis:'Wenn eine spätere Historie nötig ist, Ergebnis separat festhalten.'}),
    {modell_belegt:true,bedarf:'spaeter_abrufbar'},{hold_vorhanden:true,messwertspeicher_vorhanden:false,bedarf_im_datenblatt_abgedeckt:false}),

  info('beurer_ks34_magic_led_schwarzes_display_beobachtung',
    'Dunkles Magic-LED-Display im Leerlauf und fehlende Anzeige bei einer Messung unterscheiden — Interpret the observable idle display behaviour independently of a possible fault.',
    {modell_belegt:model, messzustand:pick('Zeitpunkt einer dunklen Anzeige.','ohne_messung','waehrend_messung','unklar')},
    ({modell_belegt,messzustand})=>({leerlauf_dunkel_laut_datenblatt:modell_belegt&&messzustand!=='unklar'?messzustand==='ohne_messung':null,
      ursache_von_fehler_nachgewiesen:false,quelle:black,hinweis:'Die Herstellerseite führt Magic-LED und Abschaltautomatik auf. Ein Defekt ist durch Dunkelheit allein nicht belegt.'}),
    {modell_belegt:true,messzustand:'ohne_messung'},{leerlauf_dunkel_laut_datenblatt:true,ursache_von_fehler_nachgewiesen:false}),

  info('beurer_ks34_milliliter_fluid_unze_anzeigemodus',
    'Bei KS 34 70311 das Gewichtsfeld oz oder lb:oz von einer gewünschten Flüssigkeits-Volumeneinheit unterscheiden — Check whether the desired volume unit is actually supported.',
    {modell_belegt:model, einheit:pick('Gesuchte Einheit.','g','kg','oz','lb_oz','ml','fl_oz','unklar')},
    ({modell_belegt,einheit})=>({einheit_waehlbar:modell_belegt&&einheit!=='unklar'?['g','kg','oz','lb_oz'].includes(einheit):null,
      groesse:einheit==='unklar'?null:['ml','fl_oz'].includes(einheit)?'volumen':'masse',
      quelle:black,hinweis:'Für die Umrechnung von Volumen in Masse muss die tatsächliche Flüssigkeit berücksichtigt werden.'}),
    {modell_belegt:true,einheit:'fl_oz'},{einheit_waehlbar:false,groesse:'volumen'}),

  info('beurer_ks34_reinigung_feuchtes_tuch_kein_wasserbad',
    'Eine geplante Reinigung der Küchenwaage mit den Beurer-Vorgaben zu feuchtem Tuch und fließendem Wasser abgleichen — Check the surface-cleaning method against the matching instructions.',
    {anleitung_belegt:doc,methode:pick('Geplante Reinigungsmethode.','feuchtes_tuch','feuchtes_tuch_spuelmittel','abspuelen','eintauchen','unklar')},
    ({anleitung_belegt,methode})=>({methode_laut_anleitung:anleitung_belegt&&methode!=='unklar'?['feuchtes_tuch','feuchtes_tuch_spuelmittel'].includes(methode)?'genannt':'ausgeschlossen':null,
      quelle:manual,hinweis:'Das Gerät nicht unter fließendem Wasser oder im Wasserbad reinigen.'}),
    {anleitung_belegt:true,methode:'abspuelen'},{methode_laut_anleitung:'ausgeschlossen'}),

  info('beurer_ks34_wiederholungsmessung_aufstellung_funkumfeld',
    'Starkes elektromagnetisches Umfeld getrennt von Aufstellung und Last bei schwankender Waagenanzeige dokumentieren — Record setup and possible field interference without diagnosing a fault.',
    {anleitung_belegt:doc, wiederholung_schwankt:yes('Gleiche Last zeigte bei einer wiederholten Messung unterschiedliche Werte?'),
      fester_ebener_stand:yes('Fester und ebener Stand wurde beobachtet?'),quelle_in_naehe:yes('Eine mögliche starke Feldquelle steht im direkten Umfeld?')},
    ({anleitung_belegt,wiederholung_schwankt,fester_ebener_stand,quelle_in_naehe})=>({
      beobachtungen_abgleichen:wiederholung_schwankt?[!fester_ebener_stand?'aufstellung':null,anleitung_belegt&&quelle_in_naehe?'elektromagnetisches_umfeld':null].filter(Boolean):[],
      ursache_belegt:false,quelle:manual,hinweis:'Beurer nennt starke elektromagnetische Felder als mögliche Beeinflussung. Das ist keine Diagnose.'}),
    {anleitung_belegt:true,wiederholung_schwankt:true,fester_ebener_stand:true,quelle_in_naehe:true},
    {beobachtungen_abgleichen:['elektromagnetisches_umfeld'],ursache_belegt:false}),

  info('beurer_ks34_aaa_batteriesatz_mix_abgleichen',
    'Batteriesatz der KS 34 70311 mit der Typvorgabe und dem Herstellerhinweis zum Mischen abgleichen — Check the documented cell count, type and matched-battery condition.',
    {modell_belegt:model, typ:pick('Tatsächlicher Typ laut Beschriftung.','aaa_1_5v','aa','andere','unklar'),
      anzahl:n('Vorgesehene Anzahl Zellen.',20), mischung:pick('Sind Typen, Hersteller oder alte und neue Zellen gemischt?','ja','nein','unklar')},
    ({modell_belegt,typ,anzahl,mischung})=>({
      passende_grunddaten:modell_belegt&&typ!=='unklar'?typ==='aaa_1_5v'&&anzahl===4:null,
      mischung_laut_anleitung_ausgeschlossen:modell_belegt&&mischung!=='unklar'?mischung==='ja':null,
      quellen:[data,manual],hinweis:'Die Unterlagen für die konkrete Geräteausführung prüfen. Kein Hinweis zum Umrüsten des Geräts.'}),
    {modell_belegt:true,typ:'aaa_1_5v',anzahl:4,mischung:'ja'},
    {passende_grunddaten:true,mischung_laut_anleitung_ausgeschlossen:true}),

  info('beurer_ks34_aufbewahrung_feuchte_waerme_ort',
    'Einen Aufbewahrungsort mit Feuchte, Wärmequelle oder starken Temperaturschwankungen nach Herstellervorgabe einordnen — Screen the proposed storage location for documented exposure limits.',
    {anleitung_belegt:doc, feuchte:yes('Feuchtigkeit ist am geplanten Ort häufig?'), waermequelle:yes('Befindet sich der Ort nahe einer Wärmequelle?'),
      starke_schwankung:yes('Sind starke Temperaturschwankungen am Ort zu erwarten?')},
    ({anleitung_belegt,feuchte,waermequelle,starke_schwankung})=>({
      offene_ortsfaktoren:anleitung_belegt?[feuchte?'feuchte':null,waermequelle?'waermequelle':null,starke_schwankung?'temperaturschwankung':null].filter(Boolean):null,
      quelle:manual,hinweis:'Normale Lagerungsgestaltung, keine Angabe einer modellbezogenen Maximaltemperatur herleiten.'}),
    {anleitung_belegt:true,feuchte:false,waermequelle:true,starke_schwankung:true},
    {offene_ortsfaktoren:['waermequelle','temperaturschwankung']}),

  info('beurer_ks34_anzeigeabweichung_eigene_referenz_nicht_kalibrierung',
    'Eine beobachtete Abweichung zu einer separat belegten Referenzmasse ausgeben und die Modellfunktion prüfen — Record one reading difference without claiming a calibration or guaranteed tolerance.',
    {modell_belegt:model, referenz_verifiziert:yes('Liegt eine unabhängig dokumentierte Referenzmasse vor?'),
      referenz_g:n('Dokumentierte Referenzmasse in Gramm.'), anzeige_g:n('Beobachtete Gramm-Anzeige der Waage.')},
    ({modell_belegt,referenz_verifiziert,referenz_g,anzeige_g})=>({
      differenz_g:referenz_verifiziert?anzeige_g-referenz_g:null,
      kalibrierfunktion_dokumentiert:modell_belegt?false:null,quelle:black,
      hinweis:'Ein Einzelwert ist weder eine Kalibrierung noch eine Aussage über die Genauigkeit im übrigen Bereich.'}),
    {modell_belegt:true,referenz_verifiziert:true,referenz_g:500,anzeige_g:502},
    {differenz_g:2,kalibrierfunktion_dokumentiert:false}),

  info('beurer_ks34_versandgewicht_unverpackt_quellenabweichung',
    'Verpackte Masse, aktuelle unverpackte Herstellerangabe und älteres ungefähres Datenblattgewicht unterscheiden — Keep packed and unpacked weights and source revisions separate.',
    {modell_belegt:model, vergleichsbezug:pick('Benötigter Gewichtsbezug.','verpackt','unverpackt','ungeklaert')},
    ({modell_belegt,vergleichsbezug})=>({
      aktueller_herstellerwert_g:modell_belegt?({verpackt:1007,unverpackt:779})[vergleichsbezug]??null:null,
      aelteres_unverpacktes_datenblatt_ca_g:modell_belegt&&vergleichsbezug==='unverpackt'?725:null,
      quellen:[black,data],hinweis:'Abweichungen zwischen dem älteren Datenblatt und der aktuellen Seite transparent halten. Konkretes Stück bei Bedarf wiegen.'}),
    {modell_belegt:true,vergleichsbezug:'unverpackt'},{aktueller_herstellerwert_g:779,aelteres_unverpacktes_datenblatt_ca_g:725}),

  info('beurer_ks34_privathaushalt_oder_gewerbliche_verwendungsgrenze',
    'Die dokumentierte Zweckbestimmung der Waage für Haushalt oder gewerblichen Einsatz berücksichtigen — Check the manufacturer’s household-use limitation before selecting a scale.',
    {anleitung_belegt:doc,einsatz:pick('Geplanter Einsatz.','privathaushalt','gewerblich','unklar')},
    ({anleitung_belegt,einsatz})=>({
      hersteller_schliesst_gewerbe_aus:anleitung_belegt&&einsatz!=='unklar'?einsatz==='gewerblich':null,
      quelle:manual,hinweis:'Eine Tragkraft oder Anzeigeteilung sagt nichts über eine Freigabe für gewerblichen Einsatz aus.'}),
    {anleitung_belegt:true,einsatz:'gewerblich'},{hersteller_schliesst_gewerbe_aus:true})
];
