const number = (description, minimum, maximum) => ({type:'number', description, minimum, maximum});
const choice = (description, ...values) => ({type:'string', enum:values, description});
const flag = description => ({type:'boolean', description});
const guide = slug => '/guide/' + slug + '.html';
const mm = description => number(description, 0, 10000);
const cm = description => number(description, 0, 10000);
const temp = description => number(description, -40, 70);
const minute = description => number(description, 0, 1440);
const rounded = value => Math.round(value * 100) / 100;

export const envelopeSuite = [
  {
    name:'fensterdichtung_falz_profilabgleich',
    description:'Das Dichtprofil anhand der vorhandenen Nut und seiner angegebenen Spaltbreite prüfen — Match a replacement window gasket to its documented groove and gap range.',
    page:guide('fenster-zugluft-mietwohnung'),
    properties:{
      spalt_min_mm:mm('Kleinster vor Ort gemessener Spalt am betreffenden Flügel.'),
      spalt_max_mm:mm('Größter gemessener Spalt am gleichen Flügel.'),
      profil_min_mm:mm('Unteres geeignetes Spaltmaß laut Unterlagen des Dichtprofils.'),
      profil_max_mm:mm('Oberes geeignetes Spaltmaß laut Unterlagen des Dichtprofils.'),
      nut_und_material_bestaetigt:flag('Nutform, Anschluss und Material sind für genau dieses Fenster bestätigt?')
    },
    calculate({spalt_min_mm,spalt_max_mm,profil_min_mm,profil_max_mm,nut_und_material_bestaetigt}) {
      if (spalt_min_mm > spalt_max_mm || profil_min_mm > profil_max_mm) throw new RangeError('Spaltbereich');
      const bereich_abgedeckt = spalt_min_mm >= profil_min_mm && spalt_max_mm <= profil_max_mm;
      return {
        bereich_abgedeckt,
        auswahl_status:bereich_abgedeckt && nut_und_material_bestaetigt ? 'masse_und_profil_bestaetigt' : 'nicht_bestaetigt',
        hinweis:'Der Hersteller muss die Kombination bestätigen. Schließbarkeit und freie Entwässerung vor und nach der Maßnahme kontrollieren.'
      };
    },
    example:{args:{spalt_min_mm:2,spalt_max_mm:5,profil_min_mm:2,profil_max_mm:4,nut_und_material_bestaetigt:true},expect:{bereich_abgedeckt:false,auswahl_status:'nicht_bestaetigt'}}
  },
  {
    name:'fensterrahmen_entwaesserung_dokumentieren',
    description:'Eine beobachtete Öffnung im Fensterrahmen vor dem Abdichten richtig einordnen — Decide what to document when a window-frame opening might be drainage.',
    page:guide('fenster-zugluft-mietwohnung'),
    properties:{
      oeffnung:choice('Funktion laut Unterlagen des Fensters.', 'entwaesserung','vorgesehene_lueftung','sonstige_dokumentierte_oeffnung','ungeklaert'),
      sichtbar_verdeckt:flag('Ist die Öffnung bereits ganz oder teilweise verdeckt?'),
      wasser_im_rahmen:flag('Steht nach Regen sichtbar Wasser im betroffenen Rahmenabschnitt?')
    },
    calculate({oeffnung,sichtbar_verdeckt,wasser_im_rahmen}) {
      const funktionsweg = oeffnung === 'entwaesserung' || oeffnung === 'vorgesehene_lueftung';
      return {
        offen_lassen:funktionsweg || oeffnung === 'ungeklaert',
        befund_melden:wasser_im_rahmen || (funktionsweg && sichtbar_verdeckt),
        hinweis:'Öffnung und benachbarten Rahmen fotografieren und bei unklarer Funktion Unterlagen oder zuständige Stelle prüfen. Keine eigenständige Änderung des Profils.'
      };
    },
    example:{args:{oeffnung:'entwaesserung',sichtbar_verdeckt:true,wasser_im_rahmen:false},expect:{offen_lassen:true,befund_melden:true}}
  },
  {
    name:'innentuer_zugluftstopper_breite',
    description:'Eine abnehmbare Bodendichtung anhand der gemessenen Türöffnung und der notwendigen Luftwege beurteilen — Check draft-stopper coverage and clearance for an ordinary interior door.',
    page:guide('heizkosten-senken-als-mieter'),
    properties:{
      tuerspalt_cm:cm('Breite des zu erfassenden Bodenspalts.'),
      abdeckung_cm:cm('Wirksame Breite der abnehmbaren Abdeckung.'),
      bewegung_geprueft:flag('Tür lässt sich mit der geplanten Abdeckung vollständig und leicht öffnen?'),
      luftweg_oder_sondertuer:choice('Vorgesehener Luftweg oder Tür mit besonderer Funktion?', 'ja','nein','ungeklaert')
    },
    calculate({tuerspalt_cm,abdeckung_cm,bewegung_geprueft,luftweg_oder_sondertuer}) {
      if (!tuerspalt_cm || !abdeckung_cm) throw new RangeError('Breite');
      return {
        offene_breite_cm:rounded(Math.max(0,tuerspalt_cm-abdeckung_cm)),
        nutzung_pruefbar:abdeckung_cm >= tuerspalt_cm && bewegung_geprueft && luftweg_oder_sondertuer === 'nein',
        hinweis:'Notwendige Luftwege und Türfunktionen frei lassen. Eine rechnerisch abgedeckte Breite beweist weder Dichtheit noch eine Energieeinsparung.'
      };
    },
    example:{args:{tuerspalt_cm:90,abdeckung_cm:85,bewegung_geprueft:true,luftweg_oder_sondertuer:'nein'},expect:{offene_breite_cm:5,nutzung_pruefbar:false}}
  },
  {
    name:'thermovorhang_bahnenbedarf',
    description:'Mit Wunschüberstand und Kräuselmaß die Anzahl gleich großer Vorhangbahnen bestimmen — Calculate curtain panels from measured coverage and the chosen fullness.',
    page:guide('thermovorhang-ratgeber'),
    properties:{
      oeffnung_cm:cm('Zu bedeckende Breite der gemessenen Öffnung.'),
      ueberstand_links_cm:cm('Gewollte Überdeckung links, in der Aufhängung verfügbar.'),
      ueberstand_rechts_cm:cm('Gewollte Überdeckung rechts, in der Aufhängung verfügbar.'),
      stofffaktor:number('Verhältnis flache Stoffbreite zu fertiger Breite entlang der Schiene.', 1, 4),
      bahn_flach_cm:number('Flache Stoffbreite einer verwendbaren Bahn in cm.', 1, 1000)
    },
    calculate({oeffnung_cm,ueberstand_links_cm,ueberstand_rechts_cm,stofffaktor,bahn_flach_cm}) {
      if (!oeffnung_cm) throw new RangeError('Öffnung');
      const deckbreite = oeffnung_cm + ueberstand_links_cm + ueberstand_rechts_cm;
      const stoff = deckbreite * stofffaktor;
      return {
        deckbreite_cm:rounded(deckbreite), stoff_flach_cm:rounded(stoff),
        bahnen:Math.ceil(stoff/bahn_flach_cm),
        hinweis:'Breiten beziehen sich auf nutzbaren Stoff. Nahtzugaben, Aufhängung und Waschschrumpfung separat prüfen. Die Überdeckung belegt keine Dämmleistung.'
      };
    },
    example:{args:{oeffnung_cm:120,ueberstand_links_cm:10,ueberstand_rechts_cm:10,stofffaktor:1.5,bahn_flach_cm:110},expect:{stoff_flach_cm:210,bahnen:2}}
  },
  {
    name:'vorhang_parkbreite_fensterweg',
    description:'Aus gemessenem Stoffpaket und Bedienweg die offene Fensterbreite abschätzen — Check whether a parked curtain stack intrudes into the opening or handle path.',
    page:guide('thermovorhang-ratgeber'),
    properties:{
      fenster_frei_soll_cm:cm('Benötigter freier Bereich in der Ebene des Vorhangs, einschließlich Griffweg.'),
      schiene_links_frei_cm:cm('Nutzbare Parkstrecke links außerhalb dieses Bereichs.'),
      schiene_rechts_frei_cm:cm('Nutzbare Parkstrecke rechts außerhalb dieses Bereichs.'),
      paket_links_cm:cm('Gemessene Breite des gerafften linken Pakets, sonst 0.'),
      paket_rechts_cm:cm('Gemessene Breite des gerafften rechten Pakets, sonst 0.')
    },
    calculate({fenster_frei_soll_cm,schiene_links_frei_cm,schiene_rechts_frei_cm,paket_links_cm,paket_rechts_cm}) {
      const vorstand = Math.max(0,paket_links_cm-schiene_links_frei_cm) + Math.max(0,paket_rechts_cm-schiene_rechts_frei_cm);
      return {
        ungestoerte_breite_cm:rounded(Math.max(0,fenster_frei_soll_cm-vorstand)),
        stoert_bedienfeld:vorstand > 0,
        hinweis:'Diese Rechnung gilt in der Schienenebene. Schwenkweg, Heizkörper, Thermostat und Luftöffnungen vor Ort prüfen.'
      };
    },
    example:{args:{fenster_frei_soll_cm:125,schiene_links_frei_cm:15,schiene_rechts_frei_cm:30,paket_links_cm:24,paket_rechts_cm:26},expect:{ungestoerte_breite_cm:116,stoert_bedienfeld:true}}
  },
  {
    name:'innenrollo_lichtspalt_pruefen',
    description:'Die Stofffläche eines Klemmrollos mit der Glasfläche vergleichen — Check side light gaps using cloth width rather than mounting-bracket width.',
    page:guide('hitzeschutz-fenster'),
    properties:{
      glas_cm:cm('Sichtbare Glasbreite.'),
      stoff_cm:cm('Tatsächliche Stoffbreite laut genauem Modell.'),
      gesamt_cm:cm('Gesamtbreite des Rollos inklusive Haltern.'),
      montagezone_cm:cm('Nutzbare Breite für die Halter ohne Griffe und Kollisionen.')
    },
    calculate({glas_cm,stoff_cm,gesamt_cm,montagezone_cm}) {
      if (!glas_cm || !stoff_cm || stoff_cm > gesamt_cm) throw new RangeError('Rollobreiten');
      return {
        seitlicher_lichtspalt_bei_mittiger_pos_cm:rounded(Math.max(0,glas_cm-stoff_cm)/2),
        passt_in_breite:gesamt_cm <= montagezone_cm,
        hinweis:'Rechnerischer Spalt je Seite. Seitenprofile, Stoffausrichtung und Abstand zur Scheibe verändern das sichtbare Licht.'
      };
    },
    example:{args:{glas_cm:80,stoff_cm:76,gesamt_cm:81,montagezone_cm:83},expect:{seitlicher_lichtspalt_bei_mittiger_pos_cm:2,passt_in_breite:true}}
  },
  {
    name:'sonnenschutz_system_gwert_vergleichen',
    description:'Zwei deklarierte Gesamtenergiedurchlassgrade nur bei passender Verglasung vergleichen — Compare glazing-and-shade g-tot values at equivalent rating conditions.',
    page:guide('hitzeschutz-fenster'),
    properties:{
      alt_g_tot:number('Anteil durchgelassener Sonnenenergie für das alte System, 0 bis 1.', 0, 1),
      neu_g_tot:number('Entsprechende Angabe für das vorgesehene System, 0 bis 1.', 0, 1),
      vergleichbar:flag('Für beide stehen kombinierte g-tot-Werte für dieselbe Verglasung und vergleichbare Prüfbedingungen bereit?')
    },
    calculate({alt_g_tot,neu_g_tot,vergleichbar}) {
      return {
        vergleichbar,
        delta_prozentpunkte:vergleichbar ? rounded(100*(neu_g_tot-alt_g_tot)) : null,
        hinweis:'Ein niedrigerer g-tot lässt unter den angegebenen Prüfbedingungen weniger Sonnenenergie durch. Stoffdurchlässigkeit und kombinierter g-tot sind verschiedene Angaben. Keine Prognose der Raumtemperatur.'
      };
    },
    example:{args:{alt_g_tot:0.6,neu_g_tot:0.25,vergleichbar:true},expect:{delta_prozentpunkte:-35}}
  },
  {
    name:'sonnenschutz_tageslicht_platzmessung',
    description:'Orientierungswert für verbleibendes Tageslicht an einem Arbeitsplatz berechnen — Compare matched light-meter readings with a shade open and closed.',
    page:guide('hitzeschutz-fenster'),
    properties:{
      offen_lux:number('Beleuchtungsstärke am Platz bei geöffnetem Sonnenschutz.', 1, 200000),
      geschlossen_lux:number('Beleuchtungsstärke am gleichen Punkt bei geschlossenem Sonnenschutz.', 0, 200000),
      vergleichbare_bedingungen:flag('Gleiche Sensorlage, gleiches Kunstlicht und ungefähr gleiche Himmelshelligkeit?')
    },
    calculate({offen_lux,geschlossen_lux,vergleichbare_bedingungen}) {
      return {
        tageslicht_verbleib_prozent:vergleichbare_bedingungen ? rounded(100*geschlossen_lux/offen_lux) : null,
        hinweis:'Ergebnis gilt am Messpunkt. Helligkeit ist eine andere Messgröße als Blendung, UV-Schutz oder Wärmeeintrag.'
      };
    },
    example:{args:{offen_lux:800,geschlossen_lux:500,vergleichbare_bedingungen:true},expect:{tageslicht_verbleib_prozent:62.5}}
  },
  {
    name:'fassadenbeschattung_zeitfenster_ueberlappung',
    description:'Für die beobachtete Sonnenzeit an der Fassade die nicht beschatteten Minuten bestimmen — Compare one observed direct-sun interval with the planned shade schedule.',
    page:guide('balkon-terrasse-beschatten'),
    properties:{
      sonne_ab:minute('Beobachteter Start direkter Sonne auf der Glasfläche, Minuten seit Mitternacht.'),
      sonne_bis:minute('Beobachtetes Ende direkter Sonne am selben Tag.'),
      schatten_ab:minute('Beginn der geplanten wirksamen Beschattung.'),
      schatten_bis:minute('Ende der geplanten wirksamen Beschattung am selben Tag.')
    },
    calculate({sonne_ab,sonne_bis,schatten_ab,schatten_bis}) {
      if (sonne_ab > sonne_bis || schatten_ab > schatten_bis) throw new RangeError('Zeitfolge');
      const overlap = Math.max(0,Math.min(sonne_bis,schatten_bis)-Math.max(sonne_ab,schatten_ab));
      return {
        beschattete_minuten:rounded(overlap), offen_sonnenminuten:rounded(sonne_bis-sonne_ab-overlap),
        hinweis:'Nur die beobachtete Glasfläche und der betrachtete Tag. Wetter, Tageszeit und Jahreszeit verändern den Sonnenlauf; Temperaturen lassen sich daraus nicht berechnen.'
      };
    },
    example:{args:{sonne_ab:750,sonne_bis:1140,schatten_ab:830,schatten_bis:1200},expect:{beschattete_minuten:310,offen_sonnenminuten:80}}
  },
  {
    name:'sitzplatz_operative_temperatur_einordnen',
    description:'Luft- und mittlere Strahlungstemperatur am Sitzplatz als Komfortorientierung zusammenführen — Estimate operative temperature under low air movement.',
    page:guide('infrarotheizung-decke-oder-wand'),
    properties:{
      luft_c:temp('Gemessene Lufttemperatur am gewählten Platz, nicht an einem Sonnentreffer.'),
      mittlere_strahlung_c:temp('Separat ermittelte mittlere Strahlungstemperatur am gleichen Platz, nicht eine einzelne Wand.'),
      geringe_luftbewegung:flag('Geringe Luftbewegung und keine direkte intensive Strahlungsquelle am Messplatz?')
    },
    calculate({luft_c,mittlere_strahlung_c,geringe_luftbewegung}) {
      return {
        operative_naeherung_c:geringe_luftbewegung ? rounded((luft_c+mittlere_strahlung_c)/2) : null,
        strahlung_minus_luft_k:rounded(mittlere_strahlung_c-luft_c),
        hinweis:'Gleichgewichtete Näherung für ähnlich wirksamen konvektiven und strahlenden Wärmeaustausch am Platz. Keine Bewertung der Gesundheit oder Heizungsdimensionierung.'
      };
    },
    example:{args:{luft_c:22,mittlere_strahlung_c:17,geringe_luftbewegung:true},expect:{operative_naeherung_c:19.5,strahlung_minus_luft_k:-5}}
  },
  {
    name:'raumtrennung_mischszenario_temperatur',
    description:'Ein theoretisches Mischszenario für zwei unterschiedlich warme Räume prüfen — Estimate the limiting temperature if two room-air volumes fully mix.',
    page:guide('raum-ohne-fenster-kuehlen'),
    properties:{
      raum_a_m3:number('Luftvolumen des ersten Raums in m³.', 1, 1000),
      raum_b_m3:number('Luftvolumen des zweiten Raums in m³.', 1, 1000),
      raum_a_c:temp('Lufttemperatur vor Durchmischung im ersten Raum.'),
      raum_b_c:temp('Lufttemperatur vor Durchmischung im zweiten Raum.')
    },
    calculate({raum_a_m3,raum_b_m3,raum_a_c,raum_b_c}) {
      return {
        ideal_gemischt_c:rounded((raum_a_m3*raum_a_c+raum_b_m3*raum_b_c)/(raum_a_m3+raum_b_m3)),
        aenderung_raum_a_k:rounded(raum_b_m3*(raum_b_c-raum_a_c)/(raum_a_m3+raum_b_m3)),
        hinweis:'Idealbild nur für vollständig gemischte Luft mit angenähert gleicher Dichte und ohne Außenluft, Möbel, Wände oder laufende Geräte. Öffnen einer Tür garantiert weder Durchmischung noch Kühlung.'
      };
    },
    example:{args:{raum_a_m3:30,raum_b_m3:60,raum_a_c:28,raum_b_c:22},expect:{ideal_gemischt_c:24,aenderung_raum_a_k:-4}}
  },
  {
    name:'klimafenster_plattenzuschnitt_materialbedarf',
    description:'Für mehrere gleich große abnehmbare Fensterplatten das benötigte Rohplattenformat planen — Estimate rectangular stock-sheet yield with edge and cutting allowances.',
    page:guide('fensterabdichtung-selber-bauen'),
    properties:{
      roh_breite_mm:mm('Nutzbare Breite der Rohplatte nach Randbeschnitt.'),
      roh_hoehe_mm:mm('Nutzbare Höhe der Rohplatte nach Randbeschnitt.'),
      teil_breite_mm:mm('Fertige Breite je rechteckigem Teil.'),
      teil_hoehe_mm:mm('Fertige Höhe je rechteckigem Teil.'),
      schnittabstand_mm:number('Zwischen zwei Teilen erforderliche Schnittzugabe in mm.', 0, 100),
      anzahl:number('Anzahl gleich großer rechteckiger Teile.', 1, 200)
    },
    calculate({roh_breite_mm,roh_hoehe_mm,teil_breite_mm,teil_hoehe_mm,schnittabstand_mm,anzahl}) {
      if (!roh_breite_mm || !roh_hoehe_mm || !teil_breite_mm || !teil_hoehe_mm || !Number.isInteger(anzahl)) throw new RangeError('Plattenmaße');
      const count = (length,size) => Math.floor((length+schnittabstand_mm)/(size+schnittabstand_mm));
      const waagerecht = count(roh_breite_mm,teil_breite_mm)*count(roh_hoehe_mm,teil_hoehe_mm);
      const gedreht = count(roh_breite_mm,teil_hoehe_mm)*count(roh_hoehe_mm,teil_breite_mm);
      const proPlatte = Math.max(waagerecht,gedreht);
      return {
        raster_teile_pro_platte:proPlatte, rohplatten_im_raster:proPlatte ? Math.ceil(anzahl/proPlatte) : null,
        hinweis:'Rechteckiges einheitliches Raster mit normaler oder gedrehter Ausrichtung. Bei Materialrichtung oder Hohlkammern kann Drehung unzulässig sein. Freigabe und Sitz der Platte gesondert prüfen.'
      };
    },
    example:{args:{roh_breite_mm:1000,roh_hoehe_mm:600,teil_breite_mm:450,teil_hoehe_mm:280,schnittabstand_mm:5,anzahl:5},expect:{raster_teile_pro_platte:4,rohplatten_im_raster:2}}
  },
  {
    name:'abluftanschluss_kupplung_abgleichen',
    description:'Die Steckverbindung eines Monoblock-Abluftadapters nach Anschlussart und maßgeblichem Durchmesser prüfen — Compare the actual mating diameters and connector types of an exhaust cuff.',
    page:guide('abluftschlauch-verlaengern'),
    properties:{
      stutzen_aussen_mm:mm('Außendurchmesser des vorgesehenen Steckstutzens laut Maßblatt.'),
      muffe_innen_mm:mm('Innendurchmesser der vorgesehenen Gegenmuffe laut Maßblatt.'),
      spiel_min_mm:mm('Dokumentiertes unteres diametrales Spiel für die Steckverbindung.'),
      spiel_max_mm:mm('Dokumentiertes oberes diametrales Spiel für die Steckverbindung.'),
      gleiche_anschlussart:flag('Anschlussart, Verriegelung und Freigabe für das konkrete Gerät wurden als passend dokumentiert?')
    },
    calculate({stutzen_aussen_mm,muffe_innen_mm,spiel_min_mm,spiel_max_mm,gleiche_anschlussart}) {
      if (!stutzen_aussen_mm || !muffe_innen_mm || spiel_min_mm > spiel_max_mm) throw new RangeError('Anschlussmaße');
      const spiel = muffe_innen_mm-stutzen_aussen_mm;
      return {
        spiel_mm:rounded(spiel),
        dokumentierter_steckbereich:gleiche_anschlussart && spiel >= spiel_min_mm && spiel <= spiel_max_mm,
        hinweis:'Gilt nur für die gemessene Steckgeometrie. Schlauch-Längen- und Gerätefreigaben, Temperaturbeständigkeit und Verriegelung separat prüfen.'
      };
    },
    example:{args:{stutzen_aussen_mm:150,muffe_innen_mm:151,spiel_min_mm:0,spiel_max_mm:2,gleiche_anschlussart:false},expect:{spiel_mm:1,dokumentierter_steckbereich:false}}
  },
  {
    name:'abluftgitter_freien_querschnitt_lesen',
    description:'Anlagefläche und freien Querschnitt eines Gitters gegenüberstellen — Estimate net open area from a documented open-area ratio.',
    page:guide('abluftschlauch-verlaengern'),
    properties:{
      breite_cm:cm('Breite der als Bezug angegebenen rechteckigen Gitterfläche.'),
      hoehe_cm:cm('Höhe derselben Bezugsfläche.'),
      offen_prozent:number('Dokumentierter freier Flächenanteil des Gitters in Prozent.', 1, 100),
      gefordert_cm2:number('Vom Geräteanbieter dokumentierte Mindestfläche in cm²; 0 wenn unbekannt.', 0, 100000)
    },
    calculate({breite_cm,hoehe_cm,offen_prozent,gefordert_cm2}) {
      if (!breite_cm || !hoehe_cm) throw new RangeError('Gitterfläche');
      const frei = breite_cm*hoehe_cm*offen_prozent/100;
      return {
        freie_flaeche_cm2:rounded(frei),
        dokumentierte_mindestflaeche_erreicht:gefordert_cm2 ? frei >= gefordert_cm2 : null,
        hinweis:'Flächenrechnung ohne Druckverlust. Lamellenform, Gitter und Filter können den Luftstrom drosseln. Keine Aussage zu Zulässigkeit, Brandschutz oder Lüftungsanforderungen.'
      };
    },
    example:{args:{breite_cm:20,hoehe_cm:15,offen_prozent:60,gefordert_cm2:200},expect:{freie_flaeche_cm2:180,dokumentierte_mindestflaeche_erreicht:false}}
  },
  {
    name:'heizkoerper_reflektor_flaechenbedarf',
    description:'Das gemessene freie Wandfeld hinter einem Heizkörper mit dem verfügbaren Reflektorformat vergleichen — Size reflector material for a single unobstructed rectangular wall patch.',
    page:guide('heizkosten-senken-als-mieter'),
    properties:{
      wandfeld_breite_cm:cm('Breite des tatsächlich freien rechteckigen Felds hinter dem Heizkörper.'),
      wandfeld_hoehe_cm:cm('Höhe desselben Felds ohne Halterungen und Ventil.'),
      folie_breite_cm:cm('Nutzbare Rollenbreite nach Randverlust.'),
      folie_laenge_cm:cm('Nutzbare zugeschnittene Länge der verfügbaren Folie.'),
      drehbar:flag('Das Produkt und der Zuschnitt dürfen laut Unterlagen in beiden Richtungen verwendet werden?')
    },
    calculate({wandfeld_breite_cm,wandfeld_hoehe_cm,folie_breite_cm,folie_laenge_cm,drehbar}) {
      if (!wandfeld_breite_cm || !wandfeld_hoehe_cm || !folie_breite_cm || !folie_laenge_cm) throw new RangeError('Materialfläche');
      const inBreite = folie_breite_cm >= wandfeld_breite_cm && folie_laenge_cm >= wandfeld_hoehe_cm;
      const rotated = drehbar && folie_breite_cm >= wandfeld_hoehe_cm && folie_laenge_cm >= wandfeld_breite_cm;
      return {
        wandfeld_m2:rounded(wandfeld_breite_cm*wandfeld_hoehe_cm/10000),
        aus_einem_stueck:inBreite || rotated,
        hinweis:'Geometrie eines freien Rechtecks, keine Empfehlung für Befestigung oder Material am Gerät und keine Aussage zur Energieeinsparung.'
      };
    },
    example:{args:{wandfeld_breite_cm:100,wandfeld_hoehe_cm:50,folie_breite_cm:60,folie_laenge_cm:105,drehbar:true},expect:{wandfeld_m2:0.5,aus_einem_stueck:true}}
  },
  {
    name:'dachfenster_hitzeschutz_typabgleich',
    description:'Das geplante Dachfenster-Zubehör anhand der schriftlichen Typzuordnung überprüfen — Match roof-window shade documentation to the exact existing window type.',
    page:guide('dachgeschoss-kuehlen'),
    properties:{
      kennzeichnung_ablesbar:flag('Lässt sich die vollständige Fensterkennzeichnung inklusive Größen- und Typcode ablesen?'),
      modellcode_gelistet:flag('Führt die Zubehörunterlage diesen exakten Fenster- und Größencode auf?'),
      oeffnungsart_bestaetigt:flag('Ist die Öffnungsart für diese Kombination dokumentiert?'),
      bestandszubehoer_geprueft:flag('Ist vorhandenes Zubehör laut Produktunterlagen zur Kombination geeignet oder keines vorhanden?')
    },
    calculate(args) {
      const offen = Object.entries(args).filter(([,confirmed])=>!confirmed).map(([question])=>question);
      return {
        dokumentation_vollstaendig:offen.length === 0, offene_pruefungen:offen,
        hinweis:'Dachfenster können bei gleichem sichtbaren Glasmaß unterschiedliche Typcodes haben. Montagebedingungen und Bedienbarkeit vor Ort gesondert klären.'
      };
    },
    example:{args:{kennzeichnung_ablesbar:true,modellcode_gelistet:true,oeffnungsart_bestaetigt:true,bestandszubehoer_geprueft:false},expect:{offene_pruefungen:['bestandszubehoer_geprueft'],dokumentation_vollstaendig:false}}
  },
  {
    name:'dachdurchwaermung_spitzenverzug_protokoll',
    description:'Die zeitliche Verzögerung zwischen einer gemessenen Dachoberflächen- und Raumspitze dokumentieren — Calculate the observed time lag between matched roof and indoor peaks.',
    page:guide('dachgeschoss-kuehlen'),
    properties:{
      dach_spitze_min:minute('Zeitpunkt des höchsten erfassten Dachoberflächenwertes in Minuten seit Mitternacht.'),
      raum_spitze_min:minute('Zeitpunkt des höchsten erfassten Raumluftwertes an demselben Kalendertag.'),
      intervall_min:number('Größte Messlücke in der betrachteten Reihe in Minuten.', 1, 180),
      ganze_spitzen_erfasst:flag('Beide Reihen erfassen Anstieg und anschließenden Rückgang am gleichen Tag ausreichend?')
    },
    calculate({dach_spitze_min,raum_spitze_min,intervall_min,ganze_spitzen_erfasst}) {
      return {
        beobachteter_raumverzug_min:ganze_spitzen_erfasst ? rounded(raum_spitze_min-dach_spitze_min) : null,
        groesste_abtastluecke_min:intervall_min,
        hinweis:'Zeitabstand zweier erfasster Maxima, kein Nachweis einer Ursache oder Dämmleistung. Spitzen können zwischen Messpunkten liegen. Keine Zuordnung über verschiedene Tage.'
      };
    },
    example:{args:{dach_spitze_min:840,raum_spitze_min:1010,intervall_min:15,ganze_spitzen_erfasst:true},expect:{beobachteter_raumverzug_min:170}}
  },
  {
    name:'klimafenster_tag_nutzungswechsel',
    description:'Abluftbetrieb und zeitgleiche Bedienung desselben Fensters im Haushalt abstimmen — Find whether a removable hose insert conflicts with scheduled daytime window use.',
    page:guide('klimaanlage-kippfenster'),
    properties:{
      kuehlen_ab:minute('Beginn des geplanten Kühlfensters an diesem Tag.'),
      kuehlen_bis:minute('Ende des geplanten Kühlfensters.'),
      fensterbedarf_ab:minute('Beginn der Zeit, in der derselbe Flügel anderweitig vollständig bedienbar sein muss.'),
      fensterbedarf_bis:minute('Ende der Zeit, in der der Flügel vollständig bedienbar sein muss.'),
      einsatz_blockiert_funktion:flag('Der Einsatz und Schlauch blockieren die benötigte Funktion in ihrem vorgesehenen Betriebszustand?')
    },
    calculate({kuehlen_ab,kuehlen_bis,fensterbedarf_ab,fensterbedarf_bis,einsatz_blockiert_funktion}) {
      if (kuehlen_ab > kuehlen_bis || fensterbedarf_ab > fensterbedarf_bis) throw new RangeError('Zeitfolge');
      const overlap = Math.max(0,Math.min(kuehlen_bis,fensterbedarf_bis)-Math.max(kuehlen_ab,fensterbedarf_ab));
      return {
        belegungskonflikt_min:rounded(einsatz_blockiert_funktion ? overlap : 0),
        hinweis:'Planung innerhalb eines Tages. Bei einem Konflikt getrennte Zeitslots oder ein anderes geeignetes Fenster prüfen. Keine automatische Freigabe des Betriebszustands.'
      };
    },
    example:{args:{kuehlen_ab:630,kuehlen_bis:990,fensterbedarf_ab:960,fensterbedarf_bis:1020,einsatz_blockiert_funktion:true},expect:{belegungskonflikt_min:30}}
  },
  {
    name:'klima_abluftrichtung_fassadenbeobachtung',
    description:'Offene Fenster, Türen und Ansaugöffnungen im beobachteten Abluftweg dokumentieren — Identify nearby openings to record when outdoor exhaust may be reaching them.',
    page:guide('mobile-klimaanlage-zu-laut'),
    properties:{
      auslass_pfadrichtung:choice('Beobachtung unmittelbar vor dem vorgesehenen Auslass.', 'freies_feld','zu_gebaeudeoeffnung','richtung_unklar'),
      rueckstrom_beobachtet:flag('Am eigenen Fenster tritt beobachtbar warme Abluft wieder ein?'),
      aufstellort_dokumentiert:flag('Gerätemodell und Auslassposition sind für die Beobachtung erfasst?')
    },
    calculate({auslass_pfadrichtung,rueckstrom_beobachtet,aufstellort_dokumentiert}) {
      const beobachten = auslass_pfadrichtung !== 'freies_feld' || rueckstrom_beobachtet;
      return {
        ruecklauf_oder_oeffnung_pruefen:beobachten,
        lage_nachdokumentieren:!aufstellort_dokumentiert,
        hinweis:'Eine Beobachtung bei einer Windrichtung schließt spätere Rückströmung nicht aus. Geeignete alternative Gerätepositionen mit der Anleitung abgleichen. Keine Aussage zu Nachbarrecht oder Lärmwerten.'
      };
    },
    example:{args:{auslass_pfadrichtung:'zu_gebaeudeoeffnung',rueckstrom_beobachtet:false,aufstellort_dokumentiert:false},expect:{ruecklauf_oder_oeffnung_pruefen:true,lage_nachdokumentieren:true}}
  },
  {
    name:'split_klima_transportweg_masscheck',
    description:'Für ein noch verpacktes Klimagerät die geradlinige Öffnung an der engsten Stelle prüfen — Check shipping dimensions against the narrowest straight doorway in the intended orientation.',
    page:guide('split-klimaanlage-ohne-kernbohrung'),
    properties:{
      paket_breit_cm:cm('Breite des Kartons in der geplanten laut Unterlagen erlaubten Transportlage.'),
      paket_hoch_cm:cm('Höhe des Kartons in genau dieser Lage.'),
      durchgang_breit_cm:cm('Tatsächliche lichte Breite an der engsten geraden Stelle bei vollständig geöffneter Tür.'),
      durchgang_hoch_cm:cm('Lichte Höhe an derselben Stelle.'),
      rangieren_erforderlich:flag('Gibt es zusätzlich enge Kurven, Schwellen oder Ortswechsel in der Ausrichtung?')
    },
    calculate({paket_breit_cm,paket_hoch_cm,durchgang_breit_cm,durchgang_hoch_cm,rangieren_erforderlich}) {
      if (!paket_breit_cm || !paket_hoch_cm || !durchgang_breit_cm || !durchgang_hoch_cm) throw new RangeError('Transportmaße');
      const breit = durchgang_breit_cm-paket_breit_cm;
      const hoch = durchgang_hoch_cm-paket_hoch_cm;
      return {
        breitenreserve_cm:rounded(breit), hoehenreserve_cm:rounded(hoch),
        geometrie_gerader_weg_passt:breit > 0 && hoch > 0,
        rangierprobe_noetig:rangieren_erforderlich,
        hinweis:'Nur lichte Maße in einer festen Lage. Trageabstand, Tiefe, Kurven, Handhabung und erlaubte Lage gemäß Herstellerunterlagen getrennt prüfen.'
      };
    },
    example:{args:{paket_breit_cm:76,paket_hoch_cm:54,durchgang_breit_cm:74,durchgang_hoch_cm:195,rangieren_erforderlich:true},expect:{breitenreserve_cm:-2,geometrie_gerader_weg_passt:false}}
  },
  {
    name:'klimafenster_stoffkit_schadensbild',
    description:'Reißverschluss, Stoff und Haltepunkte eines wiederverwendeten Fensterkits beurteilen — Identify which fabric window-kit component needs inspection before reuse.',
    page:guide('fensterabdichtung-klimaanlage'),
    properties:{
      verschluss:choice('Beobachtung am Reißverschluss.', 'schliesst','klemmt','klafft','unbekannt'),
      loch_im_stoff:flag('Ein Riss oder Loch ist jenseits der vorgesehenen Schlauchöffnung sichtbar?'),
      rand_loest_sich:flag('Der Stoff oder Halter löst sich am Rahmen?')
    },
    calculate({verschluss,loch_im_stoff,rand_loest_sich}) {
      const bauteile = [];
      if (verschluss !== 'schliesst') bauteile.push('verschluss');
      if (loch_im_stoff) bauteile.push('stoff');
      if (rand_loest_sich) bauteile.push('randbefestigung');
      return {
        pruefstellen:bauteile,
        hinweis:'Nur Sichtbefund am abnehmbaren Kit. Ersatzteilangebot und Befestigungsart mit Herstellerunterlagen klären. Auch ohne sichtbaren Schaden können Leckagen bestehen.'
      };
    },
    example:{args:{verschluss:'klafft',loch_im_stoff:false,rand_loest_sich:true},expect:{pruefstellen:['verschluss','randbefestigung']}}
  },
  {
    name:'raumtuer_schallmessung_a_b',
    description:'An einem Nachbarraumpunkt den Unterschied zwischen offener und geschlossener Innentür messen — Report the measured adjacent-room level difference with one door open versus closed.',
    page:guide('mobile-klimaanlage-zu-laut'),
    properties:{
      offen_dba:number('Gleichartig gemessener A-bewerteter Pegel bei offener Tür am Vergleichsort.', 15, 120),
      geschlossen_dba:number('Pegel an exakt gleicher Stelle bei geschlossener Tür.', 15, 120),
      gleicher_betriebspunkt:flag('Gerätestufe, Messdauer, Sensorlage und andere Geräusche waren gleich?')
    },
    calculate({offen_dba,geschlossen_dba,gleicher_betriebspunkt}) {
      return {
        pegelunterschied_offen_minus_geschlossen_db:gleicher_betriebspunkt ? rounded(offen_dba-geschlossen_dba) : null,
        hinweis:'Pegeländerung unter diesen Bedingungen. Umwege und Hintergrund zählen mit; kein Schalldämmmaß der Tür und keine Aussage zu Grenzwerten.'
      };
    },
    example:{args:{offen_dba:49,geschlossen_dba:41,gleicher_betriebspunkt:true},expect:{pegelunterschied_offen_minus_geschlossen_db:8}}
  },
  {
    name:'klima_schallabstand_freifeld_szenario',
    description:'Relative Änderung bei zwei Abständen im idealisierten Freifeld berechnen — Estimate distance-only sound-level change for an ideal point source outside.',
    page:guide('mobile-klimaanlage-zu-laut'),
    properties:{
      referenz_m:number('Erster Abstand derselben Quelle in Metern.', 1, 300),
      ziel_m:number('Zweiter Abstand derselben Quelle in Metern.', 1, 300),
      freie_sicht_ohne_reflexion:flag('Soll ausdrücklich freie Ausbreitung ohne Wände, Vorsprünge oder angekoppelte Schwingungen betrachtet werden?')
    },
    calculate({referenz_m,ziel_m,freie_sicht_ohne_reflexion}) {
      return {
        pegel_aenderung_db:freie_sicht_ohne_reflexion ? rounded(20*Math.log10(referenz_m/ziel_m)) : null,
        hinweis:'Nur geometrische Ausbreitung einer idealen Punktquelle. Fassadenreflexionen, Richtwirkung, Hintergrund und Körperschall bleiben außen vor. Keine Gerätefreigabe oder Grenzwertprüfung.'
      };
    },
    example:{args:{referenz_m:3,ziel_m:6,freie_sicht_ohne_reflexion:true},expect:{pegel_aenderung_db:-6.02}}
  },
  {
    name:'monoblock_kuehlmodus_einstellung_pruefen',
    description:'Fehlende Kühlung zunächst anhand von Betriebsart, Sollwert und aktivem Timer einordnen — Troubleshoot obvious control settings before treating a running portable AC as defective.',
    page:guide('mobile-klimaanlage-kuehlt-nicht'),
    properties:{
      modus:choice('Aktuell angezeigte Betriebsart.', 'kuehlen','luefter','entfeuchten','auto','unbekannt'),
      raum_c:temp('Raumtemperatur am Aufstellort.'),
      soll_c:temp('Derzeit eingestellter Zielwert.'),
      einschaltverzoegerung:flag('Das Gerät zeigt einen Timer oder eine laut Anleitung laufende Einschaltverzögerung?')
    },
    calculate({modus,raum_c,soll_c,einschaltverzoegerung}) {
      const checks = [];
      if (modus !== 'kuehlen') checks.push('betriebsart_klaeren');
      if (soll_c >= raum_c) checks.push('sollwert_und_raumwert_abgleichen');
      if (einschaltverzoegerung) checks.push('timer_oder_wartezeit_pruefen');
      return {
        einstellungspruefungen:checks, ursache_festgestellt:false,
        hinweis:'Sollwert und Betriebsart können den Kühlstart erklären. Regelhysterese, Startverzögerung, Filter und Abluft sind modellabhängig. Das Tool diagnostiziert keinen Defekt.'
      };
    },
    example:{args:{modus:'luefter',raum_c:27,soll_c:28,einschaltverzoegerung:false},expect:{einstellungspruefungen:['betriebsart_klaeren','sollwert_und_raumwert_abgleichen']}}
  },
];
