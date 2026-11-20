const page = '/guide/waesche-trocknen-wohnung.html';
const symbols = 'https://ginetex.de/pflegekennzeichnung/pflegesymbole/';
const scheme = 'https://ginetex.de/pflegekennzeichnung/';
const placement = 'https://ginetex.de/pflegekennzeichnung/anbringungsorte/';
const edition = 'https://www.iso.org/standard/74401.html';
const isoChanges = 'https://www.ginetex.net/article/GB/iso-37582023-standard-has-been-published';
const germanFibreLaw = 'https://www.gesetze-im-internet.de/textilkennzg_2016/__4.html';
const clevercare = 'https://ginetex.de/pflegekennzeichnung/clevercare/';
const checked = '2026-11-20';

const choice = (description, ...values) => ({type:'string', description, enum:values});
const flag = description => ({type:'boolean', description});
const familyChoices = ['waschen','bleichen','trocknen','buegeln','fachpflege'];
const family = description => choice(description,...familyChoices);
const origin = choice('Wo wurde das konkrete Zeichen gelesen? Eine Zuordnung zum Stück separat prüfen.',
  'eingenaeht_am_stueck','foto_des_stuecks','zugeordnete_herstellerunterlage','shopangabe','unbekannt');
const marking = choice('Lesbare Anzahl Balken unterhalb des Zeichens.','kein','ein','zwei','unlesbar');
const seen = choice('Nach vollständiger Sicht am Stück.','eindeutig','verbot','unklar','fehlt');

function tool(name, description, properties, run, args, expect, sources = [symbols]) {
  return {
    name, description, page, properties,
    calculate(input) {
      const result = run(input);
      return {...result, primaerquellen:sources, quellen_geprueft_am:checked};
    },
    example:{args, expect},
  };
}

const washMarks = {
  '30':['kein','ein','zwei'],
  '40':['kein','ein','zwei'],
  '60':['kein','ein'],
  '95':['kein'],
};
const washMechanics = {kein:'normal',ein:'mild',zwei:'sehr_mild'};
const ironCeilings = {eins:120,zwei:160,drei:210,eins_ohne_dampf:120};
const mixedSources = [scheme,placement];
const processFamily = choice('Vom Betrieb oder Etikett eindeutig benanntes professionelles Verfahren.',
  'trocken_p','trocken_f','nass_w','unbekannt');
const professionalLevel = choice('Vollständig ablesbare Balkenstufe. Kein Balken = normal.',
  'normal','mild','sehr_mild','unklar');
const levels = {normal:0,mild:1,sehr_mild:2};

export const textilzeichen = [
  tool('waschzeichen_grad_balken_ablesen',
    'Zahl im Waschbottich und Balken darunter als zwei Pflegegrenzen lesen, etwa 40 Grad mit zwei Strichen — Read wash temperature and mechanical treatment from one symbol.',
    {quelle:origin,zahl:choice('Abgelesene Zahl im Bottich als Text. Andere Kombinationen anhand der zugehörigen Legende klären.',
      '30','40','60','95','andere','unlesbar'),balken:marking},
    ({quelle,zahl,balken})=>{
      const temperature = Object.hasOwn(washMarks,zahl) ? Number(zahl) : null;
      if (!washMarks[zahl]?.includes(balken)) {
        return {status:'zeichen_oder_legende_pruefen',quelle,zahl_ablesbar_c:temperature,
          maximaltemperatur_c:null,mechanische_behandlung:null};
      }
      return {status:'waschsymbol_gelesen',quelle,zahl_ablesbar_c:temperature,
        maximaltemperatur_c:temperature,mechanische_behandlung:washMechanics[balken],
        hinweis:'Die Zahl ist eine Obergrenze. Der Balken ist eine eigene Vorgabe zur mechanischen Behandlung. Programmnamen werden hier nicht zugeordnet.'};
    },
    {quelle:'eingenaeht_am_stueck',zahl:'40',balken:'zwei'},
    {status:'waschsymbol_gelesen',maximaltemperatur_c:40,mechanische_behandlung:'sehr_mild'}),

  tool('waschzeichen_handwaesche_umgebung_oder_40',
    'Handwäsche bis 40 Grad, schonende Handwäsche bei Umgebungstemperatur und durchgestrichenen Waschbottich auseinanderhalten — Distinguish both hand-wash symbols and no household washing.',
    {quelle:origin,zeichen:choice('Variante aus der passenden Legende. Bei einem unscharfen Handzeichen „nicht_eindeutig“ wählen.',
      'hand_max_40','hand_umgebung','bottich_durchgestrichen','nicht_eindeutig')},
    ({quelle,zeichen})=>{
      const meanings = {
        hand_max_40:{haushaltswaesche:'handwaesche',obergrenze_c:40,umgebungstemperatur:false},
        hand_umgebung:{haushaltswaesche:'schonende_handwaesche',obergrenze_c:null,umgebungstemperatur:true},
        bottich_durchgestrichen:{haushaltswaesche:'verboten',obergrenze_c:null,umgebungstemperatur:null},
        nicht_eindeutig:{haushaltswaesche:'unklar',obergrenze_c:null,umgebungstemperatur:null},
      };
      return {quelle,...meanings[zeichen],maschinenwaesche_aus_zeichen_belegt:false};
    },
    {quelle:'foto_des_stuecks',zeichen:'hand_umgebung'},
    {haushaltswaesche:'schonende_handwaesche',obergrenze_c:null,umgebungstemperatur:true},
    [symbols,isoChanges]),

  tool('bleichzeichen_dreieck_markierung_ablesen',
    'Leeres, gestreiftes oder durchgestrichenes Dreieck auf dem Pflegeetikett lesen — Decode all bleaching, oxygen-only bleaching or no bleaching.',
    {quelle:origin,dreieck:choice('Zeichen vollständig abgelesen.','leer','zwei_schraegstriche','durchgestrichen','unklar')},
    ({quelle,dreieck})=>{
      const permissions = {
        leer:[true,true],zwei_schraegstriche:[true,false],durchgestrichen:[false,false],unklar:[null,null],
      };
      const [sauerstoffbleiche,chlorbleiche] = permissions[dreieck];
      return {quelle,sauerstoffbleiche,chlorbleiche,
        hinweis:'Gibt die Bedeutung des Zeichens wieder. Ob ein bestimmtes Produkt Bleichmittel enthält, steht in seiner eigenen Deklaration.'};
    },
    {quelle:'eingenaeht_am_stueck',dreieck:'zwei_schraegstriche'},
    {sauerstoffbleiche:true,chlorbleiche:false}),

  tool('trocknerzeichen_kreis_im_quadrat_punkte',
    'Kreis im Quadrat mit einem oder zwei Punkten oder als durchgestrichenes Trocknerzeichen lesen — Decode normal, mild or prohibited drum drying.',
    {quelle:origin,zeichen:choice('Ganzes Quadrat mit sichtbarem Kreis. Leeres Quadrat hier als „unklar“ eintragen.',
      'ein_punkt','zwei_punkte','durchgestrichen','unklar')},
    ({quelle,zeichen})=>{
      const modes = {
        ein_punkt:{trommeltrocknung:'schonend',temperatur_der_legende_c:60},
        zwei_punkte:{trommeltrocknung:'normal',temperatur_der_legende_c:80},
        durchgestrichen:{trommeltrocknung:'verboten',temperatur_der_legende_c:null},
        unklar:{trommeltrocknung:'unklar',temperatur_der_legende_c:null},
      };
      return {quelle,...modes[zeichen],
        hinweis:'Die Zahlen stammen aus der GINETEX-Legende. Für die Zuordnung einer Gerätestufe ist die Anleitung des konkreten Trockners nötig.'};
    },
    {quelle:'eingenaeht_am_stueck',zeichen:'ein_punkt'},
    {trommeltrocknung:'schonend',temperatur_der_legende_c:60}),

  tool('naturtrocknen_quadrat_striche_schatten',
    'Horizontale und senkrechte Linien, zwei Striche sowie die Schattendiagonale im Naturtrocknungsquadrat lesen — Decode flat or line drying, dripping wet and shade.',
    {quelle:origin,richtung:choice('Linien im Naturtrocknungsquadrat ohne Trommelkreis.',
      'waagerecht','senkrecht','unklar'),anzahl:choice('Anzahl paralleler waagerechter oder senkrechter Linien.','eine','zwei','unklar'),
      schattendiagonale:choice('Diagonalen für Schatten an der vorgesehenen Ecke der Vorlage.','vorhanden','sicher_keine','nicht_lesbar')},
    ({quelle,richtung,anzahl,schattendiagonale})=>({
      quelle,lage:{waagerecht:'liegend',senkrecht:'waescheleine',unklar:null}[richtung],
      aus_tropfnassem_zustand:{eine:false,zwei:true,unklar:null}[anzahl],
      schatten_vorgegeben:{vorhanden:true,sicher_keine:false,nicht_lesbar:null}[schattendiagonale],
      status:richtung==='unklar'||anzahl==='unklar'||schattendiagonale==='nicht_lesbar'?'teilweise_geprueft':'naturzeichen_gelesen',
    }),
    {quelle:'foto_des_stuecks',richtung:'waagerecht',anzahl:'zwei',schattendiagonale:'vorhanden'},
    {lage:'liegend',aus_tropfnassem_zustand:true,schatten_vorgegeben:true}),

  tool('buegelzeichen_punkte_dampf_normausgabe',
    'Bügeleisen mit Punkten, neuem Ohne-Dampf-Zeichen oder Kreuz lesen und Celsius nur bei belegter ISO-Ausgabe zuordnen — Read ironing heat and steam markings with edition-aware ceilings.',
    {quelle:origin,eisen:choice('Vollständige Zeichenvariante der passenden Legende.',
      'eins','zwei','drei','eins_ohne_dampf','durchgestrichen','unklar'),
      normausgabe:choice('Zu diesem Zeichen belegte Legende.','iso_3758_2023','aelter_oder_unbekannt')},
    ({quelle,eisen,normausgabe})=>{
      const heat = {eins:'niedrig',zwei:'mittel',drei:'hoch',eins_ohne_dampf:'niedrig',durchgestrichen:'verboten',unklar:null};
      const steam = {eins:'keine_dampffreigabe_ableitbar',zwei:'nach_2023_legende_moeglich',
        drei:'nach_2023_legende_moeglich',eins_ohne_dampf:'verboten',durchgestrichen:'buegeln_verboten',unklar:'unklar'};
      const current = normausgabe==='iso_3758_2023';
      return {quelle,temperaturstufe:heat[eisen],maximale_sohlentemperatur_c:current ? ironCeilings[eisen] ?? null : null,
        dampf:!current && ['zwei','drei'].includes(eisen)?'alte_oder_ungeklaerte_legende_pruefen':steam[eisen],
        hinweis:'Punkte bezeichnen Stufen. Der Zahlenwert gilt nur für die belegte Ausgabe; bei einem Punkt ohne Dampfzeichen weist GINETEX zusätzlich auf mögliche Dampfschäden hin.'};
    },
    {quelle:'zugeordnete_herstellerunterlage',eisen:'eins_ohne_dampf',normausgabe:'iso_3758_2023'},
    {temperaturstufe:'niedrig',maximale_sohlentemperatur_c:120,dampf:'verboten'},[symbols,edition,isoChanges]),

  tool('fachpflegezeichen_kreis_p_f_w_unterscheiden',
    'P, F, W sowie ein Verbot von Trocken- oder Nassreinigung als Angaben für den Textilreinigungsbetrieb unterscheiden — Identify dry and wet professional care from the garment circle.',
    {quelle:origin,zeichen:choice('Lesbares Zeichen aus der zugehörigen Legende. Ein gefüllter durchgestrichener Kreis ist das Nassreinigungsverbot.',
      'p','f','w','trocken_durchgestrichen','nass_durchgestrichen','unlesbar')},
    ({quelle,zeichen})=>{
      const process = {p:['trocken_p','gekennzeichnet'],f:['trocken_f','gekennzeichnet'],w:['nass_w','gekennzeichnet'],
        trocken_durchgestrichen:['trocken_allgemein','verboten'],nass_durchgestrichen:['nass_w','verboten'],unlesbar:[null,'unklar']};
      const [verfahren,status] = process[zeichen];
      return {quelle,verfahren,status,haushaltswaesche_aus_kreis_belegt:false,
        hinweis:'Der Kreis bezeichnet nur professionelle Pflege. Balken, weitere Zeichen und das tatsächliche Verfahren lässt du vom Betrieb abgleichen.'};
    },
    {quelle:'eingenaeht_am_stueck',zeichen:'w'},
    {verfahren:'nass_w',status:'gekennzeichnet',haushaltswaesche_aus_kreis_belegt:false}),

  tool('fachpflege_balken_mit_betriebsangebot_abgleichen',
    'Balkenstufe eines lesbaren P-, F- oder W-Kreises mit dem vom Reinigungsbetrieb ausdrücklich zugesagten Prozess abgleichen — Check that a quote names the same professional process and respects its mildness.',
    {etikett_verfahren:processFamily,etikett_stufe:professionalLevel,
      betrieb_verfahren:processFamily,betrieb_stufe:professionalLevel},
    ({etikett_verfahren,etikett_stufe,betrieb_verfahren,betrieb_stufe})=>{
      if ([etikett_verfahren,betrieb_verfahren].includes('unbekannt') ||
          [etikett_stufe,betrieb_stufe].includes('unklar')) return {status:'prozessdetails_nachfragen'};
      if (etikett_verfahren!==betrieb_verfahren) return {status:'abweichendes_verfahren_vom_betrieb_klaeren'};
      if (etikett_verfahren!=='nass_w' && [etikett_stufe,betrieb_stufe].includes('sehr_mild')) {
        return {status:'balken_in_zugehoeriger_legende_pruefen'};
      }
      return {status:levels[betrieb_stufe]<levels[etikett_stufe]?'angebot_staerker_als_zeichen':'buchstabe_und_mildheit_passen',
        hinweis:'Der Abgleich deckt die zwei eingegebenen Merkmale ab. Den gesamten Pflegehinweis übergeben und das konkrete Vorgehen vom Betrieb bestätigen lassen.'};
    },
    {etikett_verfahren:'nass_w',etikett_stufe:'sehr_mild',betrieb_verfahren:'nass_w',betrieb_stufe:'mild'},
    {status:'angebot_staerker_als_zeichen'}),

  tool('pflegeetikett_naturweg_bei_trocknerverbot',
    'Bei durchgestrichenem Trommeltrockner nach einer ausdrücklich dokumentierten Methode für natürliches Trocknen suchen — Confirm a separate air-drying instruction when drum drying is prohibited.',
    {trocknerverbot:flag('Ist das durchgestrichene Trommeltrocknersymbol am Stück eindeutig?'),
      naturangabe:choice('Bereits abgelesene und demselben Stück sicher zugeordnete Zusatzangabe.',
        'liegend','waescheleine','fehlt_oder_unlesbar')},
    ({trocknerverbot,naturangabe})=>({
      trommeltrocknung:trocknerverbot?'verboten':'hier_nicht_geprueft',
      naturweg:naturangabe==='fehlt_oder_unlesbar'?null:naturangabe,
      status:naturangabe==='fehlt_oder_unlesbar'?'naturweg_separat_klaeren':'getrennte_naturangabe_vorhanden',
      hinweis:'Das durchgestrichene Trommelzeichen schreibt weder Aufhängen noch Liegen vor. Schatten und tropfnassen Zustand getrennt ablesen.',
    }),
    {trocknerverbot:true,naturangabe:'fehlt_oder_unlesbar'},
    {trommeltrocknung:'verboten',naturweg:null,status:'naturweg_separat_klaeren'}),

  tool('pflegeetikett_foto_zeichenrand_und_balken',
    'Auf einem abgeschnittenen Etikettfoto prüfen, ob der Bereich für Unterstriche sichtbar ist und welche Information offenbleibt — Distinguish readable centers from cropped treatment bars.',
    {bereich:choice('Nur Waschbottich oder professioneller Kreis.','waschbottich','fachpflegekreis'),
      mitte_lesbar:flag('Sind Zahl oder Buchstabe und eine mögliche Durchstreichung klar lesbar?'),
      rand_unten:choice('Bereich mit möglichen Balken unterhalb des Zeichens.','ganz_lesbar','abgeschnitten','unscharf')},
    ({bereich,mitte_lesbar,rand_unten})=>({
      bereich,mitte_auswertbar:mitte_lesbar,balkenzahl_auswertbar:rand_unten==='ganz_lesbar',
      naechster_beleg:rand_unten==='ganz_lesbar'&&mitte_lesbar?'vorhandenes_foto':'komplettes_zeichen_mit_unterrand_fotografieren',
      hinweis:'Ohne sichtbaren Unterrand bleibt die Balkenzahl ungeklärt. Das gilt auch bei gut lesbarer Zahl oder gut lesbarem Buchstaben.',
    }),
    {bereich:'waschbottich',mitte_lesbar:true,rand_unten:'abgeschnitten'},
    {mitte_auswertbar:true,balkenzahl_auswertbar:false,naechster_beleg:'komplettes_zeichen_mit_unterrand_fotografieren'}),

  tool('pflegeetikett_fuenf_symbolgruppen_reihenfolge',
    'Bei fünf abgelesenen Pflegezeichen die GINETEX-Grundreihenfolge prüfen und fehlende Gruppen einzeln erkennen — Check completeness and order of a five-position care row.',
    {platz_1:choice('Position 1 abgelesen.',...familyChoices,'nicht_lesbar'),
      platz_2:choice('Position 2 abgelesen.',...familyChoices,'nicht_lesbar'),
      platz_3:choice('Position 3 abgelesen.',...familyChoices,'nicht_lesbar'),
      platz_4:choice('Position 4 abgelesen.',...familyChoices,'nicht_lesbar'),
      platz_5:choice('Position 5 abgelesen.',...familyChoices,'nicht_lesbar')},
    ({platz_1,platz_2,platz_3,platz_4,platz_5})=>{
      const row = [platz_1,platz_2,platz_3,platz_4,platz_5];
      const missing = familyChoices.filter(group=>!row.includes(group));
      return {reihenfolge_bestaetigt:row.every((group,index)=>group===familyChoices[index]),
        gruppen_ohne_eindeutigen_nachweis:missing,
        hinweis:'Prüft die fünf Felder der deutschen GINETEX-Grundreihe. Weitere Trocknungs- oder Reinigungshinweise separat lesen. Nicht erkannt bedeutet ungeklärt.'};
    },
    {platz_1:'waschen',platz_2:'bleichen',platz_3:'trocknen',platz_4:'nicht_lesbar',platz_5:'fachpflege'},
    {reihenfolge_bestaetigt:false,gruppen_ohne_eindeutigen_nachweis:['buegeln']},[scheme]),

  tool('pflegeetikett_shoptext_widerspruch_am_stueck',
    'Pflegehinweis des Shops gegen das lesbare Etikett des vorliegenden Kleidungsstücks prüfen — Determine what can be established when a seller contradicts a sewn-in garment tag.',
    {pflegegruppe:family('Untersuchte Pflegegruppe.'),am_stueck:seen,
      shop_bezug:choice('Zuordnung der Shopangabe.','exakte_variante_belegt','andere_variante','unklar'),
      inhalt:choice('Tatsächlicher Inhaltsvergleich gleichartiger Aussagen für diese Gruppe.',
        'stimmt_ueberein','widerspricht','nicht_vergleichbar')},
    ({pflegegruppe,am_stueck,shop_bezug,inhalt})=>{
      if (['unklar','fehlt'].includes(am_stueck)) return {pflegegruppe,status:'stueckbezogenen_herstellerbeleg_anfragen'};
      if (shop_bezug!=='exakte_variante_belegt') return {pflegegruppe,status:'shophinweis_nicht_dem_stueck_zugeordnet',quelle:'etikett_am_stueck'};
      if (inhalt==='widerspricht') return {pflegegruppe,status:'widerspruch_vor_behandlung_klaeren',quelle:'beide_belege_festhalten'};
      return {pflegegruppe,status:inhalt==='stimmt_ueberein'?'uebereinstimmung':'nur_etikett_auswertbar',quelle:'etikett_am_stueck'};
    },
    {pflegegruppe:'trocknen',am_stueck:'verbot',shop_bezug:'exakte_variante_belegt',inhalt:'widerspricht'},
    {status:'widerspruch_vor_behandlung_klaeren',quelle:'beide_belege_festhalten'},mixedSources),

  tool('pflegeetikett_zwei_eingenaehte_gesamtangaben_widerspruch',
    'Zwei widersprüchliche eingenähte Pflegeetiketten für dieselbe Behandlung des ganzen Stücks erkennen und die betroffene Gruppe eingrenzen — Isolate a genuine whole-garment conflict.',
    {pflegegruppe:family('Dieselbe Behandlung auf beiden Etiketten.'),
      geltung:choice('Gelten beide Kennzeichnungen eindeutig für das gesamte Kleidungsstück?',
        'beide_gesamt','einzelteile','unklar'),
      vergleich:choice('Lesbarkeit und Inhalt beider Angaben.','gleich','widerspruch','mindestens_eins_unlesbar')},
    ({pflegegruppe,geltung,vergleich})=>{
      if (geltung==='einzelteile') return {status:'teilbezogene_angaben_getrennt_bewerten',betroffene_gruppe:null};
      if (geltung==='unklar'||vergleich==='mindestens_eins_unlesbar') return {status:'geltung_oder_lesbarkeit_klaeren',betroffene_gruppe:pflegegruppe};
      return {status:vergleich==='widerspruch'?'gesamtwiderspruch_hersteller_klaeren':'gruppe_uebereinstimmend',
        betroffene_gruppe:pflegegruppe,
        hinweis:'Bei Widerspruch keine Variante allein aus der Reihenfolge der Etiketten auswählen. Andere Gruppen sind mit diesem Vergleich nicht geprüft.'};
    },
    {pflegegruppe:'waschen',geltung:'beide_gesamt',vergleich:'widerspruch'},
    {status:'gesamtwiderspruch_hersteller_klaeren',betroffene_gruppe:'waschen'},mixedSources),

  tool('pflegeetikett_schriftzusatz_und_symbol_bedingungen',
    'Schriftliche Vorbedingungen wie „auf links“ oder „Reißverschluss schließen“ zusätzlich zum Pflegezeichen fürs konkrete Stück erfassen — Keep a written garment preparation instruction separate from the symbol limit.',
    {pflegegruppe:family('Pflegegruppe, der der Schriftzusatz eindeutig zugeordnet ist.'),
      zusatz:choice('Art des am Stück oder in eindeutig zugeordneten Angaben gelesenen Zusatzes.',
        'auf_links','verschluss_schliessen','aehnliche_farben','symbolabweichung','kein_lesbarer_zusatz'),
      vorbereitet:flag('Ist genau die eingegebene Vorbedingung schon erfüllt? Nur für die drei Vorbereitungen auswertbar.')},
    ({pflegegruppe,zusatz,vorbereitet})=>{
      if (zusatz==='symbolabweichung') return {pflegegruppe,status:'symbol_und_wortlaut_klaeren',symbolgrenze_bleibt:true};
      if (zusatz==='kein_lesbarer_zusatz') return {pflegegruppe,status:'zusatz_nicht_belegt',symbolgrenze_bleibt:true};
      return {pflegegruppe,vorbedingung:zusatz,status:vorbereitet?'zusatz_erfuellt':'vorbedingung_offen',symbolgrenze_bleibt:true,
        hinweis:'Bewertet nur den für dieses Stück eingegebenen Zusatz. Das Pflegesymbol und weitere Angaben gelten weiterhin.'};
    },
    {pflegegruppe:'waschen',zusatz:'auf_links',vorbereitet:false},
    {vorbedingung:'auf_links',status:'vorbedingung_offen',symbolgrenze_bleibt:true},[scheme]),

  tool('textilfaserangabe_und_pflegekennzeichnung_trennen',
    'Baumwoll-, Woll- oder Mischgewebeangabe von einer eigenständigen Pflegekennzeichnung unterscheiden — Track the separate evidence for fibre composition and garment care.',
    {faserangabe:flag('Steht eine eindeutige Faserzusammensetzung auf dem Textil oder in der zugeordneten Kennzeichnung?'),
      pflegeangabe:flag('Liegt für die gesuchte Behandlung eine eindeutige Pflegeangabe dieses konkreten Stücks vor?')},
    ({faserangabe,pflegeangabe})=>({
      faserzusammensetzung_belegt:faserangabe,pflegeangabe_separat_belegt:pflegeangabe,
      pflege_rueckschluss_aus_faser:false,
      status:pflegeangabe?'pflegeangabe_separat_lesen':'pflegeangabe_fuer_das_stueck_beschaffen',
      hinweis:'Die deutsche Faserkennzeichnung behandelt die Zusammensetzung. Einen Pflegeweg oder eine Bügeltemperatur aus dem Faseranteil allein ableiten reicht nicht.',
    }),
    {faserangabe:true,pflegeangabe:false},
    {faserzusammensetzung_belegt:true,pflegeangabe_separat_belegt:false,pflege_rueckschluss_aus_faser:false},
    [germanFibreLaw,symbols]),

  tool('pflegeetikett_import_legende_des_konkreten_zeichens',
    'Bei Importware prüfen, ob das Etikett sicher zur GINETEX-Legende oder zu einem anderen belegten Zeichensystem gehört — Choose the proper care legend without inferring the system from a country.',
    {etikettsystem:choice('Durch Hersteller oder eindeutig passende Legende zugeordnetes System des Etiketts.',
      'ginetex_iso','anderes_benannt','unbekannt'),
      zeichen_eindeutig:flag('Passt das vollständig sichtbare Symbol zur genannten Legende?')},
    ({etikettsystem,zeichen_eindeutig})=>{
      const action = {ginetex_iso:'ginetex_legende_verwenden',anderes_benannt:'legende_dieses_systems_verwenden',
        unbekannt:'zeichnungssystem_beim_hersteller_klaeren'};
      return {status:!zeichen_eindeutig?'vollstaendiges_zeichen_und_legende_klaeren':action[etikettsystem],
        ginetex_ablesung_belegt:zeichen_eindeutig&&etikettsystem==='ginetex_iso',
        hinweis:'Verkaufsland, Herstellungsland und die Form eines einzelnen Zeichens reichen für die Zuordnung allein nicht aus.'};
    },
    {etikettsystem:'anderes_benannt',zeichen_eindeutig:true},
    {status:'legende_dieses_systems_verwenden',ginetex_ablesung_belegt:false},[scheme,edition]),

  tool('pflegeetikett_shop_farb_und_artikelvariante_vor_kauf',
    'Vor dem Kauf prüfen, ob das gezeigte Pflegeetikett zur ausgewählten Artikelnummer und Farb- oder Materialvariante gehört — Qualify care evidence for a specific shopping variant.',
    {artikelnummer:choice('Abgleich ausgewählter Artikelnummer mit der des Etikettfotos.','gleich','verschieden','nicht_gesehen'),
      variante:choice('Hersteller- oder Shopnachweis zur ausgewählten Farb- bzw. Materialvariante.',
        'genau_zugeordnet','andere_variante','ausdruecklich_fuer_alle_varianten','nicht_zugeordnet'),
      gruppe_lesbar:flag('Ist die benötigte Pflegegruppe auf dem zugehörigen Beleg lesbar?')},
    ({artikelnummer,variante,gruppe_lesbar})=>{
      if (artikelnummer==='verschieden'||variante==='andere_variante') return {status:'beleg_gehoert_anderer_ausfuehrung'};
      if (artikelnummer==='nicht_gesehen'||variante==='nicht_zugeordnet') return {status:'etikettfoto_fuer_ausgewaehlte_variante_anfragen'};
      return {status:gruppe_lesbar?'variante_und_gruppe_belegt':'detail_der_passenden_variante_erneut_anfragen'};
    },
    {artikelnummer:'gleich',variante:'nicht_zugeordnet',gruppe_lesbar:true},
    {status:'etikettfoto_fuer_ausgewaehlte_variante_anfragen'},mixedSources),

  tool('bleichzeichen_gegen_waschmittel_herstellerdeklaration',
    'Ein am Stoff eindeutig gelesenes Bleichdreieck gegen die Herstellerdeklaration des Wasch- oder Fleckenmittels abgleichen — Check the declared bleaching class against a garment restriction.',
    {etikett:choice('Bereits sicher interpretiertes Dreieck am konkreten Stück.',
      'alle_bleicharten','nur_sauerstoff','nicht_bleichen','unklar'),
      deklaration:choice('Explizite Deklaration des konkreten Mittels. Marketingwörter allein als „kein_klassenbeleg“ erfassen.',
        'sauerstoff_und_chlorfrei','chlorbleiche','ausdruecklich_ohne_bleichmittel','kein_klassenbeleg')},
    ({etikett,deklaration})=>{
      if (etikett==='unklar'||deklaration==='kein_klassenbeleg') return {status:'bleichgrenze_oder_mitteldeklaration_pruefen'};
      const conflict = deklaration!=='ausdruecklich_ohne_bleichmittel' &&
        (etikett==='nicht_bleichen'||etikett==='nur_sauerstoff'&&deklaration==='chlorbleiche');
      return {status:conflict?'deklarierte_bleichart_widerspricht_etikett':'bleichklasse_ohne_erkannten_widerspruch',
        hinweis:'Vergleicht nur die Bleichklasse der eindeutigen Angaben. Es ist keine Aussage zur gesamten Verträglichkeit, Anwendung oder Dosierung.'};
    },
    {etikett:'nicht_bleichen',deklaration:'sauerstoff_und_chlorfrei'},
    {status:'deklarierte_bleichart_widerspricht_etikett'}),

  tool('pflegeetikett_clevercare_logo_und_symbolreihe_trennen',
    'Clevercare-Logo oder Link mit Spartipps von der ablesbaren Pflegekennzeichnung des tatsächlichen Kleidungsstücks trennen — Separate informational care tips from the garment limits.',
    {zusatz:choice('Beobachteter Zusatz auf dem Etikett oder Anhänger.','clevercare_logo','clevercare_link','unbekanntes_logo'),
      eigene_zeichen_lesbar:flag('Ist die benötigte eigene Pflegegruppe auf dem Stück oder eindeutig zugeordneten Herstellerbeleg vollständig lesbar?')},
    ({zusatz,eigene_zeichen_lesbar})=>({
      zusatz,kategorienfreigabe_durch_logo:false,
      status:eigene_zeichen_lesbar?'pflegesymbol_des_stuecks_auswerten':'eigenes_etikett_oder_herstellerangabe_suchen',
      hinweis:'GINETEX beschreibt Clevercare als Zusatzinformationen zur Textilpflege. Die zulässige Behandlung steht in der eigentlichen Pflegekennzeichnung.',
    }),
    {zusatz:'clevercare_logo',eigene_zeichen_lesbar:false},
    {kategorienfreigabe_durch_logo:false,status:'eigenes_etikett_oder_herstellerangabe_suchen'},[clevercare,scheme]),

  tool('pflegeetikett_fehlendes_eingenaehtes_etikett_suchweg',
    'Bei einem fehlenden Pflegeetikett zuerst den empfohlenen Anbringungsort und dann stückbezogene Ersatzdokumentation prüfen — Find a care authority when a garment appears to have no sewn-in label.',
    {anbringung:choice('Ergebnis der Sicht am für die Artikelart empfohlenen Ort.',
      'etikett_lesbar','etikett_entfernt_oder_unlesbar','noch_nicht_geprueft'),
      unterlage:choice('Alternative Herstellerunterlage zum konkreten Stück.',
        'eindeutig_zugeordnet','allgemeine_materialtipps','fehlt')},
    ({anbringung,unterlage})=>{
      if (anbringung==='etikett_lesbar') return {status:'direktes_pflegeetikett_auswerten'};
      if (anbringung==='noch_nicht_geprueft') return {status:'empfohlenen_anbringungsort_pruefen'};
      return {status:unterlage==='eindeutig_zugeordnet'?'zugeordnete_herstellerangabe_auswerten':'konkrete_pflegeangabe_anfragen'};
    },
    {anbringung:'etikett_entfernt_oder_unlesbar',unterlage:'allgemeine_materialtipps'},
    {status:'konkrete_pflegeangabe_anfragen'},mixedSources),
];
