const PAGE='/guide/heizkosten-senken-als-mieter.html';
const TESA='https://www.tesa.com/de-de/buero-und-zuhause/';
const FIRE='https://www.dibt.de/de/bauprodukte/informationsportal-bauprodukte-und-bauarten/produktgruppen/bauprodukte-detail/bauprodukt/feuerschutzabschluesse-als-innentueren-1';
const AIR='https://www.verbraucherzentrale.de/wissen/energie/energetische-sanierung/was-muessen-sie-fuer-die-planung-einer-lueftungsanlage-wissen-5411';
const ACCESS='https://www.bundesfachstelle-barrierefreiheit.de/SharedDocs/Downloads/DE/Veroeffentlichungen/checkliste-paragraf-8-bgg';
const PROFILES={
  '05433':{de_artikel:'05433-00100-03',max_spalt_mm:12,belaege:['glatt','leicht_uneben'],montage:'kleben',abnahme:'laut_hersteller_nicht_rueckstandsfrei',url:TESA+'tesa-insulation-tuerbuerstendichtung-fuer-glatte-und-leicht-unebene-boeden.html'},
  '05403':{de_artikel:'05403-00100-03',max_spalt_mm:15,belaege:['teppich'],montage:'kleben',abnahme:'laut_hersteller_nicht_rueckstandsfrei',url:TESA+'tesa-insulation-tuerbuerstendichtung-fuer-teppichboeden.html'},
  '05405':{de_artikel:'05405-00100-03',max_spalt_mm:15,belaege:['uneben'],montage:'kleben',abnahme:'laut_hersteller_nicht_rueckstandsfrei',url:TESA+'tesa-insulation-tuerbuerstendichtung-fuer-unebene-boeden.html'},
  '05418':{de_artikel:'05418-00001-07',max_spalt_mm:22,belaege:['glatt'],montage:'ohne_kleben_oder_bohren',abnahme:'laut_hersteller_rueckstandsfrei',url:TESA+'tesa-insulation-tuerbodendoppeldichtung.html'}
};
const choose=(description,enumValues)=>({type:'string',description,enum:enumValues});
const bool=description=>({type:'boolean',description});
const num=(description,maximum=200,minimum=0)=>({type:'number',description,minimum,maximum});
const check=description=>choose(description,['ja','nein','offen']);
const floor=description=>choose(description,['glatt','leicht_uneben','uneben','teppich','wechselnd','offen']);
const type=choose('Nutzung der konkreten Tür.',['raumtuer','wohnungseingang','offen']);
const protectedStatus=choose('Beleg zur Schutzfunktion der konkreten Tür.',['schutz_belegt','ohne_schutz_belegt','offen']);
const airflow=choose('Beleg zur Funktion des Bodenspalts.',['erforderlich','entbehrlich_bestaetigt','offen']);
const gate={
  tuerart:type,schutzstatus:protectedStatus,luftweg:airflow
};
const verifiedRoom={tuerart:'raumtuer',schutzstatus:'ohne_schutz_belegt',luftweg:'entbehrlich_bestaetigt'};
const article=choose('Artikelgruppe laut deutscher Herstellerseite.',['05433','05403','05405','05418']);
const rounding=x=>Number(x.toFixed(2));
const scope='Ausschließlich eigene Beobachtungen zur konkreten Tür. Keine Aussage zur baurechtlichen oder technischen Eignung.';
const protection='Bei bestätigter oder ungeklärter Schutzfunktion keine Änderung aus dieser Auswertung ableiten. Verwaltung, Hersteller des Türsystems oder Fachbetrieb einbeziehen.';
const gateReason=({tuerart,schutzstatus,luftweg})=>{
  if(schutzstatus!=='ohne_schutz_belegt')return 'schutz_klaeren_oder_fachlich_pruefen';
  if(tuerart!=='raumtuer')return 'tuerart_und_funktion_klaeren';
  if(luftweg==='erforderlich')return 'luftweg_freihalten';
  if(luftweg!=='entbehrlich_bestaetigt')return 'luftweg_klaeren';
  return null;
};
function task(name,description,properties,calculate,args,expect) {
  return {name,description,page:PAGE,properties,calculate,example:{args,expect}};
}

export const tuerspalt=[
  task('tuerzugluft_raumtuer_wohnungseingang_naechster_schritt',
    "Ordnet Zugluft an Zimmertür oder Wohnungseingang vor einer Änderung nach Schutzfunktion und Luftweg ein. — Triage drafts at a room or apartment entrance door by its protection role and planned airflow before any change.",
    gate,input=>({naechster_schritt:gateReason(input)||'normalen_raumtuerbefund_pruefen',originalquelle_url:FIRE,
      hinweis:protection+' Ein erforderlicher Überströmweg bleibt frei.'}),
    {tuerart:'wohnungseingang',schutzstatus:'offen',luftweg:'offen'},
    {naechster_schritt:'schutz_klaeren_oder_fachlich_pruefen'}),

  task('tuer_schutzkennzeichnung_bauunterlage_belegstatus',
    "Trennt Systemunterlagen zur genau betrachteten Tür von sichtbaren Einzelmerkmalen wie Türschließer und unlesbarem Schild. — Distinguish records for the exact door assembly from clues such as a closer or an unreadable label.",
    {fund:choose('Verfügbarer Beleg.',['zugeordnete_unterlage_mit_schutz','zugeordnete_unterlage_ohne_schutz',
      'nur_schliesser_oder_schild','unlesbares_schild','nicht_zugeordnet','kein_beleg']),identitaet_bestaetigt:bool('Unterlage gehört zur eingebauten Tür.')},
    ({fund,identitaet_bestaetigt})=>({belegstatus:identitaet_bestaetigt&&fund==='zugeordnete_unterlage_mit_schutz'?'schutz_belegt':
      identitaet_bestaetigt&&fund==='zugeordnete_unterlage_ohne_schutz'?'ohne_schutz_belegt':'offen',
      originalquelle_url:FIRE,hinweis:protection+' Ein einzelnes sichtbares Bauteil oder ein fehlendes Schild beantwortet die Frage nicht.'}),
    {fund:'nur_schliesser_oder_schild',identitaet_bestaetigt:true},{belegstatus:'offen'}),

  task('schutztuer_fachliche_anfrage_systembezug_unterlagen',
    "Zeigt fehlende Angaben für eine fachliche Anfrage zum konkreten Feuer- oder Rauchschutz-Türsystem. — Identify missing details for a professional enquiry about the exact fire or smoke door assembly.",
    {tuer_identifiziert:bool('Die eingebaute Tür ist in den Unterlagen zugeordnet.'),
      systemunterlage:bool('Eine Systemunterlage zum eingebauten Abschluss liegt vor.'),
      vorhaben_dokumentiert:bool('Die gewünschte Änderung ist für die Anfrage konkret beschrieben.'),
      ansprechstelle_bekannt:bool('Zuständige Stelle für die Prüfung ist bekannt.')},
    input=>({fehlend:['tuer_identifiziert','systemunterlage','vorhaben_dokumentiert','ansprechstelle_bekannt'].filter(key=>!input[key]),originalquelle_url:FIRE,hinweis:protection+' Die Liste dient der Anfrage.'}),
    {tuer_identifiziert:true,systemunterlage:false,vorhaben_dokumentiert:true,ansprechstelle_bekannt:false},
    {fehlend:['systemunterlage','ansprechstelle_bekannt']}),

  task('tuerschliesser_normale_endstellung_ereignisbeleg',
    "Erfasst die sichtbare Endstellung einer selbstschließenden Tür im beobachteten üblichen Ablauf. — Record the visible final position of a self-closing door during normal use.",
    {endlage:choose('Sichtbares Ergebnis ohne Eingriff.',['geschlossen_sichtbar','offen_geblieben','nicht_sichtbar']),
      fremdeinwirkung:check('Gab es im dokumentierten Ablauf eine bekannte Fremdeinwirkung?')},
    ({endlage,fremdeinwirkung})=>({ereignis:fremdeinwirkung==='nein'&&endlage!=='nicht_sichtbar'?endlage:null,
      ansprechstelle_informieren:endlage==='offen_geblieben',originalquelle_url:FIRE,
      hinweis:'Bei auffälligem Schließen Verwaltung oder Fachbetrieb informieren. Sichtbare Endlage belegt weder Einrasten noch Schutzwirkung. Schließer und Tür unverändert lassen.'}),
    {endlage:'offen_geblieben',fremdeinwirkung:'nein'},{ereignis:'offen_geblieben',ansprechstelle_informieren:true}),

  task('tuerbodenspalt_geplanter_ueberstroemweg_abluftzuordnung',
    "Klärt anhand von Unterlagen, welches Überströmelement die mechanische Abluft in Bad, Küche oder WC versorgt. — Read the documented transfer-air path for mechanical exhaust in a bathroom, kitchen, or WC.",
    {abluftzone:choose('Konkreter Abluftraum.',['bad','kueche','wc','offen']),
      zuordnung:choose('Unterlage ordnet dem Abluftraum seinen Überströmweg zu.',['dieser_bodenspalt','anderer_weg_ersetzt_diesen_spalt','keine_zuordnung']),
      bezieht_sich_auf_tuer:bool('Die dokumentierte Tür und der Raum entsprechen der Einbausituation.')},
    ({abluftzone,zuordnung,bezieht_sich_auf_tuer})=>({dokumentierter_luftweg:abluftzone!=='offen'&&bezieht_sich_auf_tuer&&zuordnung!=='keine_zuordnung'?zuordnung:null,
      originalquelle_url:AIR,hinweis:'Mechanische Abluft kann über Türspalte oder andere Überströmöffnungen nachversorgt werden. Ein sichtbares Überströmgitter belegt seine Funktion für diese Tür nicht.'}),
    {abluftzone:'bad',zuordnung:'anderer_weg_ersetzt_diesen_spalt',bezieht_sich_auf_tuer:false},
    {dokumentierter_luftweg:null}),

  task('tuerzugluft_abluft_an_aus_beobachtung',
    "Vergleicht Zugluftmeldungen im normalen Betrieb mit und ohne aktive mechanische Abluft bei gleicher Tür- und Fenstersituation. — Compare observed drafts during normal exhaust-on and exhaust-off periods with comparable door and window conditions.",
    {abluft_aktiv:check('Zugluft beobachtet während üblicher aktiver Abluft?'),
      abluft_inaktiv:check('Zugluft beobachtet während üblicher inaktiver Abluft?'),
      gleiche_lage:bool('Tür, Fenster und äußere Bedingungen waren für beide Beobachtungen vergleichbar.')},
    ({abluft_aktiv,abluft_inaktiv,gleiche_lage})=>({beobachtung:!gleiche_lage||[abluft_aktiv,abluft_inaktiv].includes('offen')?null:
      abluft_aktiv===abluft_inaktiv?'kein_unterschied_belegt':abluft_aktiv==='ja'?'nur_bei_aktiver_abluft':'nur_bei_inaktiver_abluft',
      originalquelle_url:AIR,hinweis:'Beobachteter Zusammenhang dient der Klärung des Luftwegs. Keine Aussage zu Ursache oder Luftmenge. Lüftungsaufgabe und Türspalt erhalten.'}),
    {abluft_aktiv:'ja',abluft_inaktiv:'nein',gleiche_lage:true},{beobachtung:'nur_bei_aktiver_abluft'}),

  task('tesa_tuerbodenprofil_belag_groesster_spalt',
    "Vergleicht den größten von drei senkrecht gemessenen Bodenspalten einer gewöhnlichen Zimmertür mit der deutschen tesa-Angabe für das konkrete Bodenprofil. — Compare the largest of three measured door-bottom gaps and the flooring with the German tesa profile specification.",
    {...gate,gruppe:article,belag:floor('Fester Bodenbelag im Bereich der Dichtung.'),
      bandseite_mm:num('Senkrechter Spalt am Bandende in mm.'),
      mitte_mm:num('Senkrechter Spalt in der Mitte in mm.'),
      griffseite_mm:num('Senkrechter Spalt am Griffende in mm.')},
    input=>{
      const row=PROFILES[input.gruppe];
      const maximum=Math.max(input.bandseite_mm,input.mitte_mm,input.griffseite_mm);
      const block=gateReason(input);
      const within=input.belag==='offen'?null:row.belaege.includes(input.belag)&&maximum>0&&maximum<=row.max_spalt_mm;
      return {de_artikel:row.de_artikel,originalquelle_url:row.url,max_hersteller_mm:row.max_spalt_mm,groesster_spalt_mm:maximum,
        blockierung:block,belag_und_spalt_im_datenbereich:block?null:within,
        hinweis:'Teilabgleich für Belag und größte Spalthöhe. Bewegungsweg, Produktmaße und Türfunktion getrennt prüfen.'};
    },{...verifiedRoom,gruppe:'05433',belag:'leicht_uneben',bandseite_mm:9,mitte_mm:12,griffseite_mm:11},
    {de_artikel:'05433-00100-03',max_hersteller_mm:12,groesster_spalt_mm:12,blockierung:null,belag_und_spalt_im_datenbereich:true}),

  task('tesa_tuerbodendichtung_montage_rueckstandsfrei',
    "Liest die deutsche tesa-Angabe zu Montage und rückstandsfreier Abnahme für die betroffene Türbodendichtung. — Read the German tesa specification for attachment and residue-free removal of the named door-bottom seal.",
    {gruppe:article,rueckstandsfrei_erforderlich:bool('Rückstandsfreie Abnahme ist eine eigene Anforderung.')},
    ({gruppe,rueckstandsfrei_erforderlich})=>{
      const row=PROFILES[gruppe];
      return {de_artikel:row.de_artikel,montageart:row.montage,herstellerangabe_abnahme:row.abnahme,originalquelle_url:row.url,
        rueckstandsfrei_belegt_fuer_anforderung:rueckstandsfrei_erforderlich?row.abnahme==='laut_hersteller_rueckstandsfrei':null,
        hinweis:'Herstellerangabe für diese Artikelgruppe. Zustand der eigenen Oberfläche und Eignung der konkreten Tür separat klären.'};
    },{gruppe:'05418',rueckstandsfrei_erforderlich:true},
    {de_artikel:'05418-00001-07',montageart:'ohne_kleben_oder_bohren',rueckstandsfrei_belegt_fuer_anforderung:true}),

  task('tuerbodendichtung_innenbeleg_ausseneinsatz_uebertragen',
    "Prüft, ob Innenraum- und Bodenbezug einer Produktseite auf den beabsichtigten Wohnungseingang oder einen wetterbeanspruchten Einsatz übertragbar belegt sind. — Check whether separate evidence covers using an indoor door-bottom seal on an apartment entrance or exposed door.",
    {gruppe:article,einsatz:choose('Tatsächlich beabsichtigter Einsatz.',['trockene_innenraumtuer','wohnungseingang','wetterseite','offen']),
      herstellerbeleg_genau_einsatz:bool('Eine separate Herstellerangabe nennt genau diesen Einsatz am selben Artikel.')},
    ({gruppe,einsatz,herstellerbeleg_genau_einsatz})=>({originalquelle_url:PROFILES[gruppe].url,
      einsatzbezug:einsatz==='offen'?'einsatz_offen':einsatz==='trockene_innenraumtuer'?'innenraumbezug':
        herstellerbeleg_genau_einsatz?'separaten_beleg_zur_tuerfunktion_pruefen':'separater_einsatzbeleg_noetig',
      hinweis:'Der Bodenbezug einer Produktseite liefert keine Aussage über Witterung, Wohnungseingang, Schutzanforderungen oder Zulässigkeit.'}),
    {gruppe:'05405',einsatz:'wetterseite',herstellerbeleg_genau_einsatz:false},{einsatzbezug:'separater_einsatzbeleg_noetig'}),

  task('tuerbodendoppeldichtung_05418_zwei_bodenseiten_abgleich',
    "Prüft den beidseitigen glatten Bodenbezug der deutschen tesa 05418 bei Belagwechsel über einer normalen Zimmertür. — Compare the flooring on both sides of an ordinary room door with the smooth-floor scope of the German tesa 05418 double seal.",
    {...gate,seite_band:floor('Belag auf der Öffnungsseite im betroffenen Bewegungsbereich.'),
      seite_gegenueber:floor('Belag auf der Gegenseite im betroffenen Bewegungsbereich.')},
    input=>{
      const block=gateReason(input);
      const sides=[input.seite_band,input.seite_gegenueber];
      return {originalquelle_url:PROFILES['05418'].url,blockierung:block,zwei_glatte_seiten:block||sides.includes('offen')?null:sides.every(x=>x==='glatt'),
        hinweis:'Der Hersteller nennt glatte Böden. Die Doppeldichtung hat zwei bodennahe Seiten. Der Vergleich liefert keine Aussage zur Türblattpassform oder zur Schwelle.'};
    },{...verifiedRoom,seite_band:'glatt',seite_gegenueber:'teppich'},{blockierung:null,zwei_glatte_seiten:false}),

  task('tuerbodenspalt_schwellenoberkante_bezug',
    "Rechnet einen dokumentierten Bodenspalt von einer gemeinsamen Referenzhöhe auf die tatsächliche Schwellenoberkante um. — Derive the door-bottom gap from door and threshold heights measured at the same point and reference level.",
    {tuerkante_ueber_bezug_mm:num('Unterkante über gemeinsamer Referenz.'),
      schwelle_ueber_bezug_mm:num('Schwellenoberkante über derselben Referenz.'),
      gleicher_ort_und_bezug:bool('Beide Höhen haben denselben Bezug und denselben Ort unter der Tür.')},
    ({tuerkante_ueber_bezug_mm,schwelle_ueber_bezug_mm,gleicher_ort_und_bezug})=>{
      const diff=tuerkante_ueber_bezug_mm-schwelle_ueber_bezug_mm;
      return {senkrechter_spalt_zur_schwelle_mm:gleicher_ort_und_bezug&&diff>=0?rounding(diff):null,
        hinweis:'Eine Messung fern der Schwelle ist nicht übertragbar. Bei widersprüchlicher Geometrie Bezug und Messstelle prüfen. Aus diesem Messwert folgt keine Empfehlung zur Änderung.'};
    },{tuerkante_ueber_bezug_mm:16,schwelle_ueber_bezug_mm:4,gleicher_ort_und_bezug:true},{senkrechter_spalt_zur_schwelle_mm:12}),

  task('tuer_bodenberuehrung_bewegungsphase_ort',
    "Ordnet bereits beobachtete Bodenberührung in getrennten Öffnungs- und Schließphasen einer normalen Tür zu. — Record where already observed contact occurred while opening or closing an ordinary door.",
    {oeffnen:choose('Beobachtete Berührung beim Öffnen.',['schwelle','fester_boden','loser_teppich','keine','offen']),
      schliessen:choose('Beobachtete Berührung beim Schließen.',['schwelle','fester_boden','loser_teppich','keine','offen'])},
    ({oeffnen,schliessen})=>({kontaktphasen:Object.entries({oeffnen,schliessen}).filter(([,where])=>!['keine','offen'].includes(where)).map(([phase,ort])=>({phase,ort})),
      offen:[oeffnen,schliessen].includes('offen'),hinweis:'Vorliegende Beobachtungen eintragen. Keine Berührung provozieren und keine Distanzgrenze aus den Angaben ableiten.'}),
    {oeffnen:'loser_teppich',schliessen:'keine'},{kontaktphasen:[{phase:'oeffnen',ort:'loser_teppich'}],offen:false}),

  task('tuer_bestehender_kontakt_aenderung_zeitpunkt',
    "Ordnet eine Bodenberührung danach ein, ob sie schon vor einer bereits genehmigt umgesetzten Maßnahme an der gewöhnlichen Zimmertür dokumentiert war. — Classify whether previously recorded floor contact predated an authorised change to an ordinary room door.",
    {...gate,vorher:check('Bodenberührung vor der Maßnahme dokumentiert?'),
      nachher:check('Bodenberührung nach der Maßnahme dokumentiert?'),
      gleiche_lage:bool('Belag, Ort und Bewegungsphase stimmen zwischen den Aufzeichnungen überein.')},
    input=>{
      const block=gateReason(input);
      return {blockierung:block,zeitlicher_befund:block||!input.gleiche_lage||[input.vorher,input.nachher].includes('offen')?null:
        input.vorher==='ja'?'vorher_bereits_dokumentiert':input.nachher==='ja'?'erst_nachher_dokumentiert':'kein_kontakt_dokumentiert',
        hinweis:'Bereits dokumentierte Zustände verwenden. Zeitpunkt allein bestimmt die Ursache nicht. Bei auffälligem Bewegungs- oder Schließverhalten Verantwortliche einbeziehen.'};
    },{...verifiedRoom,vorher:'ja',nachher:'ja',gleiche_lage:true},
    {blockierung:null,zeitlicher_befund:'vorher_bereits_dokumentiert'}),

  task('tuergriff_kraft_wirksamer_hebel_moment',
    "Rechnet eine bereits dokumentierte Öffnungskraft mit ihrem wirksamen senkrechten Hebelarm in ein Moment um. — Convert a documented opening force and its effective perpendicular lever arm to opening torque.",
    {kraft_n:num('Bereits dokumentierte Kraft in N.',1000),
      hebelarm_cm:num('Dokumentierter senkrechter Abstand zur Wirkungslinie in cm.',200,0.1),
      gemeinsam_dokumentiert:bool('Kraft und wirksamer Hebelarm stammen von demselben beobachteten Türzustand.')},
    ({kraft_n,hebelarm_cm,gemeinsam_dokumentiert})=>({beobachtetes_moment_nm:gemeinsam_dokumentiert?rounding(kraft_n*hebelarm_cm/100):null,
      originalquelle_url:ACCESS,hinweis:'Kraft und Öffnungsmoment bezeichnen unterschiedliche Größen. Aus der Bundescheckliste für Bestandsgebäude des Bundes werden hier keine Anforderungen für Wohnungen übernommen. Keine Prüfung an der Tür oder Veränderung des Schließers vornehmen.'}),
    {kraft_n:12,hebelarm_cm:75,gemeinsam_dokumentiert:true},{beobachtetes_moment_nm:9}),

  task('tuer_selbstschliessen_persoenlicher_durchgang_zeitbezug',
    "Vergleicht einen eigenen dokumentierten Zeitbedarf und die beobachtete Freigabezeit einer selbstschließenden Tür für denselben Durchgang. — Compare a person's documented passage time with the observed time available at the same self-closing doorway.",
    {eigener_bedarf_s:num('Dokumentierter persönlicher Zeitbedarf bis zum Bezugsort in s.',300,0.1),
      beobachtete_zeit_s:num('Beobachtete Zeit bis zum selben Bezugsort im normalen Ablauf in s.',300),
      vergleichbar:bool('Gleiche Strecke und gleicher Startpunkt in bereits vorhandenen Aufzeichnungen.')},
    ({eigener_bedarf_s,beobachtete_zeit_s,vergleichbar})=>({beobachtete_zeit_abzueglich_bedarf_s:vergleichbar?rounding(beobachtete_zeit_s-eigener_bedarf_s):null,
      bedarf_zeitlich_abgedeckt:vergleichbar?beobachtete_zeit_s>=eigener_bedarf_s:null,originalquelle_url:ACCESS,
      hinweis:'Eigenen Zugang beim Verantwortlichen klären, falls Bedarf und beobachtete Zeit auseinanderliegen. Schließlauf nicht testen oder verändern. Keine Aussage zur sicheren Passage.'}),
    {eigener_bedarf_s:7,beobachtete_zeit_s:5,vergleichbar:true},
    {beobachtete_zeit_abzueglich_bedarf_s:-2,bedarf_zeitlich_abgedeckt:false}),

  task('tuerzugang_griff_manoevrieren_passage_getrennt',
    "Hält für einen bereits beobachteten persönlichen Türdurchgang Griffzugang, Manövrieren und Passage getrennt fest. — Record handle reach, manoeuvring and passage separately for an already observed door use.",
    {griff:check('Konnte die betreffende Person in der dokumentierten Nutzung zum Griff gelangen?'),
      manoever:check('War die benötigte Bewegung vor oder hinter der Tür in dieser Beobachtung möglich?'),
      passage:check('Gelang der dokumentierte Durchgang mit der verwendeten Unterstützung?')},
    input=>({nicht_erreicht:['griff','manoever','passage'].filter(key=>input[key]==='nein'),offen:['griff','manoever','passage'].filter(key=>input[key]==='offen'),
      originalquelle_url:ACCESS,hinweis:'Die Angaben helfen beim Beschreiben der Barriere gegenüber der zuständigen Verwaltung. Sie belegen keine allgemeine Barrierefreiheit.'}),
    {griff:'ja',manoever:'nein',passage:'offen'},{nicht_erreicht:['manoever'],offen:['passage']}),

  task('tuerzugluft_unterkante_und_falz_getrennte_stellen',
    "Erfasst, ob an der geschlossenen Tür Zugluft unten, am Falz oder an beiden Bereichen wiederholt beobachtet wurde. — Record repeated drafts at the bottom edge, around the frame, or in both places on a closed door.",
    {unterkante:check('Zug an der Unterkante wurde wiederholt dokumentiert?'),
      falz:check('Zug entlang von Falz oder Rahmen wurde wiederholt dokumentiert?'),
      geschlossene_tuer_gleiche_lage:bool('Wiederholungen betrafen dieselbe geschlossene Tür und vergleichbare Bedingungen.')},
    ({unterkante,falz,geschlossene_tuer_gleiche_lage})=>({beobachtungsorte:geschlossene_tuer_gleiche_lage?
      Object.entries({unterkante,falz}).filter(([,status])=>status==='ja').map(([ort])=>ort):null,
      offener_befund:!geschlossene_tuer_gleiche_lage||[unterkante,falz].includes('offen'),
      hinweis:'Ein Befund am Rahmen begründet kein Bodenprodukt. Die Zuordnung beschreibt Wahrnehmungsorte, keinen nachgewiesenen Leckagepfad.'}),
    {unterkante:'nein',falz:'ja',geschlossene_tuer_gleiche_lage:true},{beobachtungsorte:['falz'],offener_befund:false}),

  task('tuerbodenprodukt_spalthoehe_vs_buerstenlaenge_beleg',
    "Unterscheidet beim konkreten tesa-Angebot den dokumentierten Zahlenbezug zum Bodenspalt von Bürstenlänge, Türblattbreite und Verkäufertext. — Distinguish the manufacturer's maximum gap height for a tesa product from brush length, door width and seller wording.",
    {gruppe:article,zahlenbezug:choose('Art der Angabe im Angebot.',['bodenspalt_aus_exakter_herstellerseite','buerstenlaenge','tuerblattbreite','verkaeufer_unbestimmt']),
      quelle_genaue_gruppe:bool('Die Herstellerseite ist der konkreten Artikelgruppe zugeordnet.')},
    ({gruppe,zahlenbezug,quelle_genaue_gruppe})=>({als_bodenspalt_belegt:quelle_genaue_gruppe&&zahlenbezug==='bodenspalt_aus_exakter_herstellerseite',
      originalquelle_url:PROFILES[gruppe].url,hersteller_spaltgrenze_mm:quelle_genaue_gruppe&&zahlenbezug==='bodenspalt_aus_exakter_herstellerseite'?PROFILES[gruppe].max_spalt_mm:null,
      hinweis:'Produktmaß und maximale Bodenspalthöhe haben getrennte Bezugsgrößen. Aus dem Verkäufertext wird kein Einsatzbereich abgeleitet.'}),
    {gruppe:'05403',zahlenbezug:'buerstenlaenge',quelle_genaue_gruppe:true},
    {als_bodenspalt_belegt:false,hersteller_spaltgrenze_mm:null}),

  task('tuer_zugluftstopper_lose_durchgangsbeobachtung',
    "Unterscheidet einen vorhandenen losen Zugluftstopper außerhalb des Durchgangs von beobachtetem Hindernis oder Verlagerung beim Alltagseinsatz. — Record whether a loose draught stopper stays outside the passage, moves into it or obstructs observed use.",
    {gegenstand:choose('Bereits beobachtete Position im Verlauf der normalen Nutzung.',['ausserhalb','quer_im_weg','wechselt','offen']),
      beeintraechtigung:check('War in dieser Situation der Durchgang sichtbar beeinträchtigt?')},
    ({gegenstand,beeintraechtigung})=>({durchgangsbefund:beeintraechtigung==='ja'?'beeintraechtigung_beobachtet':
      gegenstand==='quer_im_weg'||gegenstand==='wechselt'?'lage_und_durchgang_klaeren':
      gegenstand==='offen'||beeintraechtigung==='offen'?'offen':'ausserhalb_ohne_beobachtete_beeintraechtigung',
      hinweis:'Bezieht sich auf den konkreten Durchgang. Flucht-, Lüftungs- und Schutzfunktionen zuerst erhalten. Keine Aussage zur Eignung eines losen Gegenstands.'}),
    {gegenstand:'wechselt',beeintraechtigung:'nein'},{durchgangsbefund:'lage_und_durchgang_klaeren'}),

  task('rauchschutztuer_offenstellung_system_nachweis_zuordnung',
    "Unterscheidet bei einer offen beobachteten Schutztür die dokumentierte systembezogene Offenhaltung von einem losen Gegenstand oder ungeklärtem Zustand. — Distinguish documented system-specific hold-open equipment from a loose object or an unresolved condition on a protective door.",
    {beobachtung:choose('Bereits festgestellte Form der Offenhaltung.',['feststellvorrichtung','loser_gegenstand','keine_vorrichtung_erkennbar','offen']),
      systembeleg_zugeordnet:bool('Der Verantwortliche konnte einen Systembeleg genau dieser eingebauten Vorrichtung zuordnen.')},
    ({beobachtung,systembeleg_zugeordnet})=>({dokumentationsbefund:beobachtung==='feststellvorrichtung'&&systembeleg_zugeordnet?
      'systembeleg_zugeordnet':'verantwortliche_stelle_klaeren',originalquelle_url:FIRE,
      hinweis:protection+' Der Beleg zur Vorrichtung ersetzt weder die Prüfung ihrer Funktion noch die Prüfung des gesamten Abschlusses.'}),
    {beobachtung:'loser_gegenstand',systembeleg_zugeordnet:true},{dokumentationsbefund:'verantwortliche_stelle_klaeren'}),

  task('tuerzugluft_wiederholung_nutzung_kaufpruefung',
    "Ordnet vor einer Kaufentscheidung ein, ob wiederkehrende Zugluft am üblichen geschlossenen Zustand eine tatsächlich dokumentierte Alltagsbeeinträchtigung ist. — Check whether repeated drafts at a normally closed door cause a documented everyday problem before considering a purchase.",
    {...gate,tuer_ueblich_geschlossen:bool('Der Befund betraf die Tür in ihrem üblichen geschlossenen Zustand.'),
      wiederholt:check('Der Befund wiederholte sich unter vergleichbaren Bedingungen.'),
      alltagsbedarf:check('Die konkrete Nutzung wird im Haushalt dadurch beeinträchtigt.')},
    input=>{
      const block=gateReason(input);
      return {blockierung:block,naechster_schritt:block?'funktion_vor_produkt_klaeren':
        input.alltagsbedarf==='nein'?'kein_kaufbedarf_aus_beobachtung':
        input.tuer_ueblich_geschlossen&&input.wiederholt==='ja'&&input.alltagsbedarf==='ja'?'ursache_vor_auswahl_klaeren':'alltagsbefund_weiter_beobachten',
        hinweis:scope};
    },{...verifiedRoom,tuer_ueblich_geschlossen:true,wiederholt:'ja',alltagsbedarf:'nein'},
    {blockierung:null,naechster_schritt:'kein_kaufbedarf_aus_beobachtung'})
];
