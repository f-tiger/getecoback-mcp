import {exactGermanFilterModel} from './exact-filter-intent.mjs';
import {philipsHumidifierFilterSection} from './philips-humidifier-filter-intent.mjs';
import {asksForElectricBlanketCost, isElectricBlanketQuestion} from './electric-blanket-cost-intent.mjs';
import {asksForCellarVentilationCheck} from './cellar-ventilation-intent.mjs';
import {asksForDehumidifierDrainRoute} from './dehumidifier-drain-intent.mjs';

const german = {ä:'ae', ö:'oe', ü:'ue', ß:'ss'};
const normalize = value => String(value).toLowerCase()
  .replace(/[äöüß]/g, letter => german[letter]).normalize('NFD').replace(/\p{Diacritic}/gu, '');
const words = value => normalize(value)
  .replace(/\b(\d{3})\.(\d{3})\.(\d{2})\b/g, '$1$2$3')
  .match(/[a-z0-9]+/g) || [];

function ownedGuide(value) {
  if (typeof value !== 'string') return null;
  try {
    const origin = 'https://getecoback.com';
    const url = new URL(value, origin);
    const canonical = /^\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.html$/.test(url.pathname);
    return url.origin === origin && canonical && !url.search && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

// Keep catalogue navigation on the canonical guide, optionally at its supplied section.
export function toolGuidePath({citation_url, guide_url}) {
  const citation = ownedGuide(citation_url);
  if (!citation || citation.hash) return null;
  const guide = ownedGuide(guide_url);
  if (guide?.pathname === citation.pathname && /^#[a-z0-9-]{1,100}$/.test(guide.hash)) {
    return guide.pathname + guide.hash;
  }
  return citation.pathname;
}

const questionWords = new Set((
  'wie was wann wo welche welcher welches welchen welchem wer weswegen wieso weshalb wieviel ' +
  'kann kannst koennen soll sollte ich du er sie es wir ihr uns mir mein meine meinen meiner meinem unseren unserem unsere unser euren ' +
  'ist sind war waren sei wird werden wurde wurden hat hatte haben habe hast gibt brauche braucht brauchen ' +
  'richtig richtige richtigen geeignet passende viel viele finde finden suche suchen vergleiche ' +
  'den dem der die das des ein eine einen einem einer eines ' +
  'auf aus mit bei beim im in am fuer fuers und oder ins zum zur vom von vor nach an ueber durch ohne unter bis seit ' +
  'darf muss muessen mache machen wenn ob auch noch nur schon dann trotzdem damit dazu dabei hier dort heute gerade ' +
  'dieses dieser diesen dieselbe dasselbe solche beiden beide jeden jedem jeder ihnen jemand ihn diese kommt steckt bitte hilfe helfen ' +
  'what how which can need should does would the my that with and for from but'
).split(' '));

// Common words for tools whose formal identifiers differ from everyday German.
const taskWords = new Map([
  ["fenstersauger_kaercher_fluessigkeitsgrenze_und_tank", "multi edition aufsaugen tank fuellstand tankvolumen tankgroesse pfuetze verschuettet verschuettete fluessigkeit 25ml 40ml mengenobergrenze"],
  ["fenstersauger_wv3_wv8_led_muster_einordnen", "blinkfolge blinkt blinken leds zweimal kurz blitz motor kontrollleuchte untere lampe ladevorgang"],
  ["fenstersauger_wv3_wv8_akkuwechsel_service_oder_reserve", "comfort signature austauschen zweiten zweiter zweitakku reserveakku akkupack einsetzen waehrend fensterputzen akku austauschbar"],
  ["fenstersauger_kaercher_glasreiniger_schaum_spiritus", "fensterreiniger schaumreiniger glasreiniger reinigungsmittel detergent zusatz"],
  ["fenstersauger_wv3_wv8_hochglanz_glas_temperatur_probe", "mikrofaserbezug wischbezug hochglanzflaeche empfindlich probestelle gefroren heisse scheibe oberflaechentemperatur"],
  ["waschmittel_dosiertabelle_wasserhaerte_intervall", "versorger versorgungsgebiet calciumcarbonat mmol gesamthaerte wasserhaerte haertebereich dosiertabelle dosierspalte schwankung grenzwert spalte"],
  ["miele_wwr880_twindos_verschmutzung_und_spuelmenge", "verschmutzt verschmutzungsgrad verschmutzung stark normal leicht spuelwasser spuelwassermenge dosiermenge waesche"],
  ["waschmaschine_idos_twindos_nachfuellanzeige_lesen", "idos twindos symbol leuchtet blinkt blinkendes mindestfuellstand fuellstand wenige waschgaenge restmenge nachfuellhinweis milliliter"],
  ["miele_wwr880_programm_waschmittelklasse_fussnote", "express express20 colorwaschmittel fluessig gardinen pulver jeans feinwaschmittel wollwaschmittel spezialwaschmittel waschmittelempfehlungen fussnote"],
  ["spueler_salzprodukt_etikett_geraetemodell", "salztablette salztabletten spuelsalz spezialsalz regeneriersalz speisesalz kuechensalz siedesalz koernig koernigem koerniges salzprodukt"],
  ["spueler_klarspueler_menuewert_und_abgabe_trennen", "klarspuelerstufe klarspueler eingestellte stufe stufencode menueanzeige r04 r05 abgabe abgegeben dosiert ausdosiert milliliter milliliterwert"],
  ["spueler_nach_salzbehaelter_oeffnen_spuelbezug", "salzbehaelterdeckel deckel salzverschluss salzdeckel geoeffnet ausspuelen spuelgut salzreste salzsole spuelzyklus"],
  ["spueler_geschirr_material_vor_einraeumen_beleg", "holzgriff holzgriffe dekor antik kristall empfindlich hitzebestaendig hitzebestaendigem kunststoff herstellerfreigabe geschirrmaterial spuelmaschinengeeignet"],
  ["miele_gn_packbedarf_drei_teile_aus_bestand", "12421170 12498270 hyclean gn xxl originalpack packungsinhalt staubsaugerbeutel filterbeutel motorschutzfilter abluftfilter airclean einlagen fehlmenge stueck"],
  ["miele_abluftfilter_serienausstattung_gegen_nachruestliste", "nordicblau 12558870 12031650 10653390 complete c3 serienmaessig serienmaessige serienausstattung ausgeliefert abluftfilter airclean sfha501 zubehoer datenblatt materialnummer"],
  ["miele_guard_l1_abluftanzeige_reset_vor_wechsel", "hs22 13114040 abluftfilter filterwechselanzeige abluftfilterwechselanzeige zurueckgesetzt zuruecksetzen reset zwischenzeit geraeteanzeige leuchtet gewechselt"],
  ["miele_beutelsignal_feinstaub_fusseln_abgleichen", "staubsaugerbeutel wechselanzeige beutelwechselanzeige feinstaub feiner mischstaub fusseln haare poren frueh prall voll"],
  ["miele_boost_cx1_gepflegte_flaeche_reinigungsmedium", "hs20 vorfilter filtereinsatz seitenklappe nasspflege kalt spuelmittel spuelbuerste reinigungswerkzeug filtermatte"],
  ["philips_buegelgeraet_kalksystem_typenschild_abgleich", "kalksystem entkalkungssystem easy plus quick release typenschild angebot"],
  ["philips_buegeleisen_hartes_wasser_dokumentempfehlung", "hartes leitungswasser wasserhärte deutsch anleitung wasserempfehlung azur dst7040"],
  ["philips_azur_wassermischung_gleichteile_abmessen", "mischungsverhältnis mischung gleichteile demineralisiert destilliert abmessen toleranz"],
  ["philips_azur_wasserzusatz_anleitung_abgrenzung", "trocknerkondensat essig wasserzusatz destillat parfüm stärke ausschluss"],
  ["philips_buegelgeraet_tankangabe_vs_gemessene_max_marke", "nennvolumen tankgröße max markierung tankvergleich tankangabe füllmarke nominal"],
  ["philips_perfectcare_wassertank_entnahme_eigenes_exemplar", "abnehmbar wassertank gebrauchtangebot specimen angebotsfoto ersatztank"],
  ["philips_buegeldampf_dauerstoss_druck_vergleichsart", "dampfstoß gramm dauerhafter dampfausstoß minute druck bar durchfluss"],
  ["philips_perfectcare_gewicht_handteil_station_verpackung", "gewicht handteil basisstation bewegtes gewicht wiegt karton"],
  ["philips_perfectcare_trageverriegelung_exemplarbeleg", "trageverriegelung transportverschluss eingerastet verkäufer gebraucht"],
  ["philips_perfectcare_statusleuchte_wasser_vs_entkalkung", "statusleuchte niedriger wasserstand entkalkungserinnerung signal anzeige"],
  ["philips_azur_autoabschaltung_ruhelage_dokumentwert", "abschaltautomatik autoabschaltung bügelsohle standfläche ruhelage zeit position"],
  ["philips_azur_calc_pflegefenster_kalender_und_anlass", "calc pflegetermin braune flecken pflegeintervall quick release calc-pflege"],
  ["philips_azur_spray_dampfart_beobachtung_zuordnen", "dampfstoßauslöser wasserspray vertikal gedrückt stetiger dampf"],
  ["philips_azur_sohle_pflegeaussage_eigener_nachweis", "sohlenpflege scheuerschwamm sohlenreiniger feuchtes tuch reinigungsarten"],
  ["philips_perfectcare_bewegungssensor_automatik_beobachtung", "automatischer dampfausstoß bewegungssensor taste dampfereignis bewegung auslöser"],
  ["philips_perfectcare_zweistundenangabe_eigene_arbeitszeit", "zwei stunden zweistundenangabe nettozeit anwendungsdauer pause laufzeit erneut auffüllen"],
  ["philips_perfectcare_aufbewahrung_schlauchfach_klett", "schlauchaufbewahrung kabel klett schlauchfach ordnung aufbewahren"],
  ["philips_azur_tropfstopp_eigene_beobachtung", "tropfstopp wasseraustritt fleck tropfen austrittsort sohle"],
  ["philips_perfectcare_ersatzteil_tank_auffangkappe_artikelcode", "cp2030 cp2029 auffangkappe ersatztank teilenummer herstellerreferenz"],
  ["philips_perfectcare_bereitlicht_nachfuellanzeige_protokoll", "bereitschaftsanzeige wassertankhinweis blinkt dauerhaft bereit signal"],
  ["philips_perfectcare_schlauchpfad_reichweite_reserve", "schlauchlänge reichweite gemessener weg reserve bewegungsreserve"],
  ["philips_perfectcare_energiesparangabe_normal_max_bezug", "max normal energieeinsparung 60331 stromkosten vergleich mode"],
  ["philips_azur_lagerung_leer_beobachtung_schrittgrenze", "restwasser aufbewahrung ausgeschaltet leeren abgekühlt tankstatus"],
  ["philips_perfectcare_refill_zeitpunkt_anforderung_beleg", "auffüllen nachfüllen gebrauch dampf ohne pause unterbrechung befüllen"],
  ["mikrowelle_gefaessfreigabe_korpus_deckel_dekor_unterscheiden", "schuessel geschirr behalter zierrand goldrand metallrand dekor deckelfreigabe freigegeben mikrowellentauglich"],
  ["beurer_ks34_wiederholungsmessung_aufstellung_funkumfeld", "handy mobiltelefon funk elektromagnetisch messwert springt schwankt untergrund arbeitsplatte aufstellung"],
  ["roboter_ersatzfilter_exakte_de_zuordnung", "irobot roomba 4785887 filterpack ersatzfilter hochleistungsfilter packliste kompatibel kompatibilitaet combo j7 j9 d10 l10s"],
  ["saros10r_zubehoerset_bedarf_nach_teilrollen", "roborock saros 10r zubehoerset filter filterpack seitenbuerste abdeckung hauptbuerstenabdeckung set ersatzteil einzelteil"],
  ["dreame_station_orange_weiss_signalzustand", "dreame d10 l10s gen basisstation ladestation led kontrollleuchte licht weiss weisse pulsiert pulsierend orange blinkt zustandsanzeige statusanzeige"],
  ["roboter_aufladung_fenster_mit_start_und_ende", "dreame l10s d10 ultra gen akku ladezeit ladedauer vollladung vollstaendig ladevorgang minuten stunden abbruch station herstellerwert"],
  ["roomba_aufladefehler21_aufnahme_und_ladeverlust", "irobot roomba clean base home ladefehler aufladefehler fehlercode dock ladeverlust ladestand akku akkuprozent akkuanzeige"],
  ["roboter_stationskontakt_und_sensor_pflegemethode", "roomba j7 i7 ladekontakte ladekontakt sensorfenster optisch optische fenster angefeuchtet angefeuchtetes melaminschwamm mikrofaser reinigen trocken"],
  ["roboter_zwischenladen_rueckkehrart_fortsetzung", "dreame d10 l10s gen weiter weitermachen fortsetzt fortsetzen fortsetzung reinigung reinigungsauftrag unfertig pausiert laden ladepause manuell zurueckgeschickt"],
  ["saros10r_reinigungsfluessigkeit_kartusche_rolle", "roborock saros 10r tankstation nachfuellen nachfuellung reinigungsloesung reinigungsfluessigkeit loesung reinwassertank frischwassertank reinigungsmittel kartusche"],
  ["roomba_absaugdock_app_taste_und_manueller_erfolg", "irobot roomba j7 i7 absaugbehaelter entleerung clean base schaltflaeche taste leerung lokal infrarot infrarotproblem kommunikation kontakterkennung"],
  ["roomba_absaugdock_rotes_blinken_und_neuversuche", "irobot roomba i7 j7 clean base autoempty absaugstation absauganschluss rot rote blinkt blinkte licht frontleuchte verstopfung evakuierung evakuierungen wiederholt"],
  ["roomba_combo10max_absaugstart_kurze_wartebeobachtung", "irobot roomba combo 10max max dockte andocken angedockt absaugung entleerung sekunden verzug verzoegerung wartezeit startet entleerungsstart"],
  ["roboter_filter_waschhinweis_nach_exakter_rolle", "irobot roomba combo j5 staubfilter originalfilter filter nass geworden ausspuelen waschen waschbar wartungshinweis wiedereinsetzen"],
  ["roboter_stillstand_letzte_dokumentierte_ladung", "roborock saros 10r ladung eingelagert einlagern nichtgebrauch aufbewahrung aufbewahrungsintervall stillstand lagerung gelagert monate kalendermonate"],
  ["roomba_j_volle_behaeltermeldung_nach_evakuierung", "irobot roomba j7 fehlercode fehler 036 meldete auffangbehaelter voll leer leerer behaelter entleerung schmutztransport fuellstandssensor behaeltersensor wiederkehr"],
  ["dreame_station_tank_oder_absaugfunktion_erwartung", "dreame d10 l10s gen basis tankstation tanks wasser wasserversorgung versorgen nachfuellung wassernachfuellung serienausfuehrung absaugstation wischmodul"],
  ["led_ersatzfassung_schnittstelle_geraetehuelle", "gu10 gu5 e14 e27 fassung sockel spannung spannungsangabe einbaumass einbautiefe einbaulaenge bauform durchmesser aussendurchmesser lampenlaenge passt ersatzleuchtmittel"],
  ["led_eu_label_lichtquelle_umgebendes_produkt", "energieetikett effizienzklasse energieeffizienzklasse energieklasse deckenleuchte stehlampe leuchte enthaltene leuchtmittel umgebendes produkt lichtquelle"],
  ["led_dimmen_minimum_start_schon_leuchtend", "einschalten einschaltstufe einschaltwert starthelligkeit mindesthelligkeit anlaufen anspringen springt herunterregeln dimmer stabil helligkeit minimum dimmstufe"],
  ['tuerbodenprodukt_spalthoehe_vs_buerstenlaenge_beleg', 'tuerbodendichtung tuerbuerste buerstenlaenge borstenlaenge maximale geeignete spalthoehe bodenspalt produktmass'],
  ["bleichzeichen_dreieck_markierung_ablesen", "waescheschild waescheetikett pflegesymbole bleichsymbol dreieck gestreift schraeg schraege schraegen strichen diagonalen sauerstoffbleiche"],
  ["fachpflege_balken_mit_betriebsangebot_abgleichen", "reinigungsangebot reinigung angebot betrieb zusage unterstrichen doppelt einfach balken stufe nassreinigung verfahren"],
  ["pflegeetikett_naturweg_bei_trocknerverbot", "waeschetrockner trockner trommel durchgestrichen trocknerverbot pulli aufhaengen haengen leine waescheleine liegend lufttrocknen"],
  ["pflegeetikett_foto_zeichenrand_und_balken", "waschsymbol waschzeichen waschbottich etikettfoto foto aufnahme ausschnitt unten unterrand abgeschnitten abgeschnittenes striche balken unlesbar"],
  ["pflegeetikett_shoptext_widerspruch_am_stueck", "shop website produkttext onlinebeschreibung widerspruch widerspricht erlaubt verbietet eingenaeht eingenaehtes trockner buegeln saum kennzeichnung pflegehinweis bluse"],
  ["textilfaserangabe_und_pflegekennzeichnung_trennen", "baumwolle wolle polyester prozent faser faserangabe faserzusammensetzung wollangabe wollanteil baumwollanteil rohstoffangabe materialangabe kleidungsstueck buegeln material stoff buegelstufe buegelzeichen trockner etikett zusammensetzung buegeln"],
  ["pflegeetikett_shop_farb_und_artikelvariante_vor_kauf", "haendler shop pulli farbvariante artikelnummer farbe rote roten braune variante foto bestellen kaufen"],
  ["bleichzeichen_gegen_waschmittel_herstellerdeklaration", "jeans bleichdreieck bleichmittel waschmittel fleckenmittel reiniger chlorfrei chlorfreie sauerstoffbleiche deklaration durchgestrichen chlorbleiche widerspricht pflegehinweis"],
  ["pflegeetikett_fehlendes_eingenaehtes_etikett_suchweg", "eingenaehtes pflegeetikett fehlt abgeschnitten gebraucht gebrauchten mantel anbringungsort ersatzbeleg kleid pflegezettel angenaeht auskunft"],
  ["waschzeichen_grad_balken_ablesen", "waschsymbol waschzettel waschbottich temperatur grad strich doppelstrich doppeltem balken zwei sehr schonend pflegeleicht"],
  ["waschzeichen_handwaesche_umgebung_oder_40", "handwaesche handwaeschesymbol handwaeschezeichen raumtemperatur umgebungstemperatur temperaturgrenze schonende hand maximal vierzig"],
  ["pflegeetikett_schriftzusatz_und_symbol_bedingungen", "pflegezettel schriftzusatz waschhinweis links auflinks reissverschluss verschluss farben vorbedingung"],
  ["brita_kartusche_namenswechsel_altbestand_abgleichen", "brita maxtra pro all in 1 allin1 vorgaenger alte aufschrift maxtra plus pure performance derselbe artikel nachfolger generationswechsel umbenennung"],
  ["brita_filterkanne_teil_und_spuelprogramm_beleg", "brita flow spuelmaschine spuelmaschinengeeignet deckel memo trichter style eco 50 grad led smart light dichtungsring handreinigung"],
  ["brita_maxtra_mengenjournal_mit_zwischenstand_wechsel", "brita maxtra kartusche dieselbe andere kanne gesetzt umgezogen spaeter ersetzt ersetzt liter gehoeren welche kartusche protokoll mengenjournal kannenwechsel"],
  ["brita_maxtra_pro_kartuschenvariante_haertedaten_lesen", "brita pure performance extra kalkschutz versorger hartem wasser haerteklasse kalk kartuschenwahl"],
  ["brita_deckelanzeige_zeit_oder_zeit_und_menge", "brita memo smart light zaehlt nur zeit gefilterte menge beruecksichtigt volumen zeitzaehler timer liter erinnerung"],
  ["brita_maxtra_kanne_eingangswasser_quellenrahmen", "kannenanleitung kaltes wasser oeffentliches versorgungsnetz brunnenwasser eigene quelle oeffentlichen netz vorgewaermt eingangswasser"],
  ['dusche_zeit_bei_wasserbudget', 'duschen litern liter wasserbudget duschdauer lange'],
  ['saugroboter_kabelroute_vorbereiten', 'roboter kabel faehrt ueberfaehrt kabelsalat'],
  ['kellerentfeuchter_pruefpunkt_abgleichen', 'prueftemperatur entfeuchtungsleistung entzieht liter watt grad luftfeuchtigkeit prozent pruefbedingungen'],
  ['tado_x_oventrop_ventiladapter_pruefen', 'oventrop ventil heizungsventil heizkoerperventil unidh unil vindo th gewinde gewindesteigung 30mm m30 adapterring 1011445 4026755228717'],
  ['pac_n90_energielabel_zu_stromkosten', 'delonghi pinguino n90 eco silent 8004399512351 labelstunde energielabel energieetikett stromverbrauch arbeitspreis strompreis cent zwischenzaehler gemessen verbrauch lauf stand stunden kw kwh kosten kostet'],
  ['entfeuchter_ablaufcheck', 'abflussschlauch ablaufschlauch abfluss auslass keller oben hoeher fuehren ableiten kondensat'],
  ['fenster_oberflaeche_taucheck', 'fenstersauger kondenswasser kondensat glas innenscheibe taupunkt scheibentemperatur wischen wischlappen tuch'],
  ['luftreiniger_ersatzfilter_zuordnung', 'passt ersatzfilter luftreinigermodell luftreiniger filternummer'],
  ['waesche_trockenweg_sortierplan', 'liegeplaetze leine liegend liegen haengend'],
  ['textil_masshaltigkeit_vor_nach_pflege', 'stoff waschen eingelaufen geschrumpft schrumpfung'],
  ['lueftung_aussenluft_umluftrate_aufteilen', 'frischluft aussenluftanteil'],
  ['stromjournal_mehrfachzahlung_kandidat', 'stromrechnung doppelt zweimal bezahlt doppelzahlung'],
  ['stromrechnung_messfenster_randtage', 'zaehlermessung zaehlerdaten abrechnungszeitraum'],
  ['saugwischer_selbstreinigung_restpflicht_lesen', 'nasssauger waschsauger schmutzwassertank selbstreinigung entleeren leeren restpflege'],
  ['wasch_trockner_zweiladung_uebergabestau', 'waschladung wartezeit wartet nacheinander zweite'],
  ['vergleichstest_teilnoten_spannweite_luecke', 'klimageraetevergleich gesamtnote endnote teilbewertung'],
  ['modellhandbuch_fertigungslos_geltungsgrenze', 'bedienungsanleitung nachtrag serienlos revisionsnachtrag'],
  ['stromablesung_mittleren_wert_korrigieren', 'zaehlerstand zwischenstand ablesung berichtigen verschrieben abschnitt'],
  ['dachfenster_stoffkit_kantenreserve_einzeln', 'stoffabdichtung umfang seitenlaenge randlaenge'],
  ['pflege_uebergabe_rueckfrage_zu_geraeteteil', 'rueckmeldung pflegen geraetepflege pflegestatus bestaetigung'],
  ['querlueften_koordination_zwei_bedienfenster', 'gemeinsam gleichzeitig zeitfenster ueberschneidung'],
  ['warmwasser_parallelzapfung_abweichungsprobe', 'dusche zapfstelle wasserhahn gleichzeitig parallelentnahme'],
  ['pc_chip_und_ansaugluft_abstand_zerlegen', 'cpu prozessor pc raumluft ansaugluft angesaugt waermer temperaturabstand'],
  ['luftkuehler_tankbilanz_ueber_wasserwege', 'luftkuehler tank wasser ruecklauf tropfwasser wasserverlust wasserbilanz'],
  ['heizwaesche_massenplateau_vor_wirklichem_ziel', 'waesche heizwaesche beheizt waeschestaender leichter gewicht trocken stehengeblieben plateau trockenziel'],
  ['gefrierschrank_24h_haushaltsspitze_und_bestandsvolumen', 'gefrierschrank grosseinkauf kilo kilogramm gefriergut liter stunden gefriervermoegen vorrat vorratsvolumen gsn33ewev gsn58dwdv'],
  ['bosch_sbv4ebx00d_nische_tueroeffnung_abgleichen', 'geschirrspueler spuelertuer tueroeffnung gang grad durchgang offen'],
  ['wasch_trocken_saeule_herstellerkombination_beleg', 'waschmaschine trockner miele bosch wtv 501 511 512 t1 classic white chrome stapelsatz verbindungssatz'],
  ['q350_tr_250m3_schallweg_druckpunkte_v0126', 'comfoair zehnder q350 v0126 laut schallleistung kubikmetern stunde pascal zuluftseite abluftseite'],
  ['oekodesign_teilgruppe_rollenweg_de', 'ersatzteil ersatzteile spuelmaschine geschirrspueler waschmaschine ablauffilter pumpe sprueharm reparaturbetrieb verbraucher'],
  ['dunstabzug_de_modell_set_filter_belegkette', 'bosch dwb66bc50 umluftset dwz1dx1i6 dzz1xx1b6 ersatzfilter starterset filter kompatibilitaet'],
  ['backofenzubehoer_reinigungsart_exakter_beleg', 'miele h2861bp 2861 flexiclip hfc hfc70 hfc70c pyrolyse selbstreinigung selbstreinigungsprogramm schiene backofen reinigung drin'],
  ['tisken_50400307_zwei_wandfelder_oberflaeche', 'ikea tisken saugnapfhalter saugnapf saugscheibe fliese fliesenspiegel fliesenfuge kacheln glatt glatten fuge fliesenkante naht kontaktflaeche duschhalter'],
  ['venta_6060_kompatibilitaetslisten_modellkonflikt', 'venta rollgestell rollwagen lw24 lw25 lw44 lw45 ah530 ah535 ah550 ah555 modelllisten modellkonflikt kompatibilitaet'],
  ['pulsify_artikel_strahlart_techniktabelle_drei_bar', 'hansgrohe pulsify 24121000 24151000 powderrain'],
  ['elektrog_kleingeraete_dreifach_mass_anzahl', 'toaster klein kleinelektro zentimeter elektrohandel haendler altgeraete altgeraet abgeben rueckgabe ruecknahme ohne kauf neukauf drei'],
  ['induktion_km7464f_de_kochboden_zonenauswahl', 'miele km7464fr km7464 7464 duetto pfanne pfannenboden topfboden boden kochzone vorne hinten links'],
  ['miele_h7460_bp_betriebswert_genaues_datenblatt', 'miele h7460 7460 11105690 ofen ausgeschaltet auszustand standby wlan netzwerksignal leistungsaufnahme bereitschaft'],
  ['miele_g7673_spuelanzeige_phase_eco_feedback', 'miele g7673 7673 scvi autodos ecofeedback verbrauchsanzeige striche balken prognose schaetzt messwerte verbrauchte liter wasser energie'],
  ['spuelgang_ende_marker_und_autoopen_beobachtung', 'geschirrspuelertuer spueler restzeit countdown automatisch autoopen klappe display ende programmende offen oeffnet fertig trocknungsphase spuelgang'],
  ['philips_hd9945_korb_und_originalteil_beleg', 'philips hd9945 na352 backset zubehoer originalteil korb gross klein'],
  ['bosch_sks62e32eu_eco50_quellenwerte_rundung', 'bosch sks62e32eu eco50 eco sparprogramm tischgeschirrspueler kompaktgeschirrspueler wasser strom kwh etikett verbrauch spuelgang dauer laufzeit'],
]);

// Group common noun endings while retaining a meaningful root.
function stem(word) {
  const root = word.replace(/(?:ern|en|er|es|e|n|s)$/, '');
  if (root.length < 4) return word;
  // A genitive can still retain the noun's regular ending, as in "Fensters".
  const consistent = root.replace(/(?:er|e)$/, '');
  return consistent.length >= 4 ? consistent : root;
}

function lexicon(value) {
  const exact = new Set(words(value));
  const roots = new Set([...exact].map(stem));
  return {exact, roots};
}

function wordMatch(term, root, field, compound) {
  if (field.exact.has(term)) return 3;
  if (term.length >= 5 && field.roots.has(root)) return 2;
  if (!compound || root.length < 4) return 0;
  for (const fieldRoot of field.roots) {
    const fieldIsShorter = fieldRoot.length < root.length;
    const shorter = fieldIsShorter ? fieldRoot : root;
    const longer = fieldIsShorter ? root : fieldRoot;
    if (shorter.length >= 4 && longer.length - shorter.length >= 3 &&
        (longer.startsWith(shorter) || longer.endsWith(shorter))) return 1;
  }
  return 0;
}

export function indexCatalogue(tools) {
  return tools.map(tool => ({
    tool,
    name: normalize(tool.name),
    identifiers: lexicon(tool.name),
    aliases: lexicon(taskWords.get(tool.name) || ''),
    description: lexicon(tool.description),
    reference: lexicon([tool.category, (tool.page || tool.citation_url || '').split('/').at(-1).replace(/\.html$/, '')].join(' ')),
  }));
}

function matchWeight(term, root, entry) {
  const identifier = wordMatch(term, root, entry.identifiers, true);
  const alias = wordMatch(term, root, entry.aliases, false);
  if (identifier || alias) return Math.max(identifier ? identifier + 4 : 0, alias ? alias + 3 : 0);
  const body = wordMatch(term, root, entry.description, true);
  const reference = wordMatch(term, root, entry.reference, true);
  return Math.max(body, Math.min(reference, 2));
}

function asksForLaundryCostComparison(terms) {
  return terms.some(term => /^(?:waesche)?trockner(?:s|n)?$/.test(term)) &&
    terms.some(term => /^(?:luft)?entfeuchter(?:s|n)?$/.test(term)) &&
    terms.some(term => /^(?:(?:waesche|wasch)?ladung(?:en)?|trocknungsgang|trocknungsgaenge)$/.test(term)) &&
    terms.some(term => /^(?:kosten|kostet|stromkosten|stromgeld|euro|billiger|guenstiger)$/.test(term)) &&
    !terms.some(term => /^(?:kaufpreis|anschaffung|amortis|rentier|rechnet|gleichzeitig$|ausgeschaltet$|abgeschaltet$)/.test(term));
}

const singleLaundryTool = 'luftentfeuchter_waesche_einzelkosten';
function asksForSingleLaundryCost(query) {
  if (!/\b(?:luft)?entfeuchter(?:s|n)?\b/.test(query) ||
      !/\b(?:kostet|kosten|stromkosten|strompreis|stromgeld|euro|cent)\b/.test(query)) return false;
  if (/\b(?:gleichzeitig|parallel|zusammen|abgeschaltet|ausgeschaltet|kaufpreis|anschaffung[a-z]*|amortis[a-z]*|rentier[a-z]*|rechnet|typenschild|nennleistung|nennwatt|herstellerangabe[a-z]*)\b/.test(query)) return false;
  const hasDryer = /\b(?:waesche)?trockner(?:s|n)?\b/.test(query);
  if (hasDryer && !/\b(?:kein(?:en)?|ohne(?:\s+(?:den|einen|meinen))?)\s+(?:waesche)?trockner\b/.test(query)) return false;
  return /\b(?:waesche(?:ladung(?:en)?)?|waschladung(?:en)?|ladung(?:en)?|trocknungsgang|trocknungsdurchgang)\b/.test(query) ||
    /\b(?:durchschnittlich[a-z]*|mittler[a-z]*|gemittelt[a-z]*)\b/.test(query) && /\b(?:stunden?|laufzeit)\b/.test(query);
}

const fritzValveTool = 'fritz_302_danfoss_adapter';
function asksForFritzValveAdapter(query) {
  const model = /\b(?:fritz[!\s-]*(?:(?:smart[ -]*)?thermo(?:stat)?[ -]*|dect[ -]*|heizkoerperthermostat[ -]*)?302|20003120)\b/.test(query);
  if (!model || /\b(?:tado|bosch|homematic|heimeier|oventrop|301|firmware|fritzos|fritz!os|router|usb|repeater|batterie[a-z]*|heizkosten|zeitplan[a-z]*)\b/.test(query)) return false;
  const namedValve = /\b(?:danfoss|ravl|rav|ra)\b/.test(query);
  if (namedValve && /\b(?:adapter[a-z]*|[a-z]*adapter|pin|dabei|beiliegt|mitgeliefert[a-z]*|enthalten|dazukaufen|lieferumfang|paket|pass[te][a-z]*|montier[a-z]*)\b/.test(query)) return true;
  if (namedValve && /\bseparat\b[^?!.]*\b(?:gekauft|kaufen|bestellt|bestellen)\b/.test(query)) return true;
  const adapter = /\b(?:ventiladapter|adapter|adapters|ventil(?:typ|modell)?|heizungsventil)\b/.test(query);
  return adapter && /\b(?:welche[rsnm]?|unbekannt[a-z]*|unklar[a-z]*|nicht\s+(?:erkenn[a-z]*|identifizier[a-z]*|sicher)|erkenne\b[^?!.]*\bnicht)\b/.test(query);
}

function asksForHumidifierEfficiency(query) {
  const comparesModels = /\blb[\s-]*55\b/.test(query) && /\boskar\b/.test(query);
  const namesHumidifier = /\b(?:luft)?befeuchter(?:s|n)?\b/.test(query);
  const hasPower = /\b(?:nennwatt|watt|nennleistung|leistungsaufnahme)\b|\b\d+\s*w\b/.test(query);
  const asksForOutput = /\b(?:(?:energie)?effizien[a-z]*|wasserabgabe|feuchteabgabe|befeuchtungsleistung|abgabeleistung)\b/.test(query);
  const asksForWaterInAir = /\b(?:mehr|weniger)\s+wasser\s+(?:an|in)\s+die\s+(?:raum)?luft\b/.test(query);
  return (comparesModels || namesHumidifier) && hasPower &&
    (asksForOutput || (comparesModels && asksForWaterInAir));
}

const glassvacTemperatureTool = 'glassvac_kalt_lagern_einschalten_laden_getrennt';
const glassvacModel = /\b(?:glass[ -]?vac|06008b7000)\b/;
const kaercherWindowVac = /\b(?:wv[ -]*[238]|kaercher[ -]+fenstersauger)\b/;
const windowVacCharging = /\b(?:laden|aufladen|aufzuladen|aufladung|einstecken|ladenetzteil|ans\s+ladegeraet|(?:in|an)\s+die\s+steckdose)\b/;

function asksForGlassvacTemperature(query) {
  const cold = /\b(?:frost[a-z]*|bodenfrost|gefroren[a-z]*|gefrier[a-z]*|minus[a-z]*|kaelte|unter\s+null)\b|[−-]\s*\d+(?:[,.]\d+)?\s*(?:°\s*c|grad)\b/.test(query);
  return glassvacModel.test(query) && cold && windowVacCharging.test(query);
}

function asksForGlassvacConnectorPhoto(query) {
  return glassvacModel.test(query) && /\b(?:ladeanschluss|usb[ -]?anschluss|ladebuchse)\b/.test(query) &&
    /\b(?:foto|angebotsfoto|abbildung)\b/.test(query);
}

function asksAboutGlassvacFault(query) {
  return glassvacModel.test(query) && /\b(?:leds?|blink[a-z]*)\b/.test(query) &&
    /\b(?:kaputt|defekt[a-z]*|fehler|fehlersuche)\b/.test(query);
}

function focusWindowVacQuestion(query) {
  if (!glassvacModel.test(query) || !kaercherWindowVac.test(query)) return {query};
  const pivots = [...query.matchAll(/\b(?:stattdessen|korrektur|ich\s+(?:meine|meinte)|gemeint\s+ist|sondern|jetzt(?:\s+(?:habe\s+ich|nutze\s+ich|geht\s+es\s+um|zum))?)\b/g)];
  for (const pivot of pivots.reverse()) {
    const previous = query.slice(0,pivot.index);
    if (pivot[0] === 'jetzt' && !/\b(?:alt[a-z]*|frueher|zuvor|vorher|wollte|bislang)\b/.test(previous)) continue;
    const current = query.slice(pivot.index+pivot[0].length).trim();
    const bosch = current.match(glassvacModel);
    const kaercher = current.match(kaercherWindowVac);
    if (Boolean(bosch) === Boolean(kaercher)) continue;
    const model = bosch ?? kaercher;
    if (/\b(?:nicht|kein[a-z]*)\b/.test(current.slice(0,model.index))) continue;
    if (kaercher && glassvacModel.test(previous)) return {query:current, omitPrefix:'glassvac_'};
    if (bosch && kaercherWindowVac.test(previous)) return {query:current, omitPrefix:'fenstersauger_wv'};
  }
  // A charging question with two possible subjects has no single model limit.
  return windowVacCharging.test(query) ? null : {query};
}

export function findCatalogueTools(index, {query='', category='', name=null}={}) {
  const bounded = query.slice(0, 512);
  const exact = normalize(bounded.trim());
  const focus = focusWindowVacQuestion(exact);
  if (focus === null) return [];
  const eligible = entry => (!category || category === entry.tool.category) &&
    (name === null || name === entry.tool.name) &&
    (!focus.omitPrefix || !entry.tool.name.startsWith(focus.omitPrefix));
  if (!exact) return query.length === bounded.length ? index.filter(eligible).map(entry => entry.tool) : [];
  if (query.length === bounded.length) {
    const exactEntry = index.find(entry => entry.name === exact);
    if (exactEntry) return eligible(exactEntry) ? [exactEntry.tool] : [];
  }

  const tokens = words(focus.query).filter(token =>
    (token.length >= 3 || /^[a-z][0-9]$/.test(token)) && !questionWords.has(token));
  const observed = new Map();
  for (const term of tokens) {
    const root = stem(term);
    if (!observed.has(root)) observed.set(root, {term, root, strongFrequency:0});
  }
  const unique = [...observed.values()];
  if (!unique.length) return [];
  const terms = unique.length > 24 ? [...unique.slice(0, 12), ...unique.slice(-12)] : unique;
  const cellarVentilation = asksForCellarVentilationCheck(focus.query);
  const cellarVentilationTool = 'keller_lueften_taupunkt_messwerte';
  const philipsFilter = philipsHumidifierFilterSection(focus.query);
  const philipsFilterTool = 'philips_verdunsterfilter_zuordnung';
  const blanketQuestion = isElectricBlanketQuestion(focus.query);
  const blanketCost = asksForElectricBlanketCost(focus.query);
  const blanketCostTool = 'heizdecke_stromkosten_nennleistung';
  const singleLaundry = asksForSingleLaundryCost(focus.query);
  const fritzValve = asksForFritzValveAdapter(focus.query);
  const termCount = terms.length;
  const matches = [];
  for (const entry of index) {
    if (entry.tool.name === cellarVentilationTool && !cellarVentilation) continue;
    if (entry.tool.name === philipsFilterTool && !philipsFilter) continue;
    if (entry.tool.name === blanketCostTool && !blanketCost) continue;
    if (entry.tool.name === 'pac_n90_energielabel_zu_stromkosten' && blanketQuestion) continue;
    if (entry.tool.name === fritzValveTool && !fritzValve) continue;
    if (fritzValve && (entry.tool.name === 'fritz_302_router_firmware_mindeststand' ||
        entry.tool.name === 'tado_x_oventrop_ventiladapter_pruefen')) continue;
    if (entry.tool.name === singleLaundryTool && !singleLaundry) continue;
    const weights = terms.map(({term, root}) => matchWeight(term, root, entry));
    const matched = weights.filter(Boolean).length;
    if (!matched) continue;
    for (let i = 0; i < terms.length; i++) {
      if (weights[i] >= 5) terms[i].strongFrequency++;
    }
    if (eligible(entry)) matches.push({tool:entry.tool, weights, matched});
  }

  const required = termCount <= 2 ? termCount : Math.max(3, Math.ceil(termCount / 2));
  const rareLimit = Math.max(4, Math.floor(index.length / 10));
  const ranked = [];
  for (const {tool, weights, matched} of matches) {
    const strong = weights.filter(weight => weight >= 5).length;
    const distinctive = weights.some((weight, i) => weight >= 5 && terms[i].strongFrequency <= rareLimit);
    // A single term needs a full word or an identifier match, not a weak compound fragment.
    const ordinary = termCount === 1 ? weights[0] >= 2 :
      matched >= required && (strong > 0 || matched >= 3);
    const concise = termCount === 3 && matched >= 2 && strong >= 2 && distinctive;
    // Extra context must still contain several corroborating terms, including a rare tool term.
    const contextual = termCount >= 4 && matched >= Math.max(3, Math.ceil(termCount / 5)) && strong >= 2 && distinctive;
    if (!ordinary && !concise && !contextual) continue;
    const score = weights.reduce((sum, weight, i) =>
      sum + weight * (weight >= 5 && terms[i].strongFrequency <= rareLimit ? 2 : 1), 0);
    ranked.push({tool, score});
  }
  const results = ranked.sort((a, b) => b.score - a.score).map(result => result.tool);
  let preferredName;
  if (exactGermanFilterModel(focus.query)) preferredName = 'luftreiniger_ersatzfilter_zuordnung';
  else if (philipsFilter) preferredName = philipsFilterTool;
  else if (blanketCost) preferredName = blanketCostTool;
  else if (asksForDehumidifierDrainRoute(focus.query)) preferredName = 'entfeuchter_ablaufcheck';
  else if (cellarVentilation) preferredName = cellarVentilationTool;
  else if (fritzValve) preferredName = fritzValveTool;
  else if (singleLaundry) preferredName = singleLaundryTool;
  else if (asksForLaundryCostComparison(tokens)) preferredName = 'waesche_trocknungskosten';
  else if (asksForHumidifierEfficiency(focus.query)) preferredName = 'befeuchter_nennwatt_abgabeleistung_bezug';
  else if (asksAboutGlassvacFault(focus.query)) return results.filter(tool => tool.name !== glassvacTemperatureTool);
  else if (asksForGlassvacTemperature(focus.query)) preferredName = glassvacTemperatureTool;
  else if (asksForGlassvacConnectorPhoto(focus.query)) return results.filter(tool => tool.name !== glassvacTemperatureTool);
  else return results;

  // These questions can match too few published terms for the ordinary threshold.
  const preferred = index.find(entry => entry.tool.name === preferredName && eligible(entry));
  return preferred ? [preferred.tool, ...results.filter(tool => tool.name !== preferredName)] : results;
}
