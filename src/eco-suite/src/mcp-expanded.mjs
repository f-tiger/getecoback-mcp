import {householdSuite} from './mcp-household.mjs';
import {moistureSuite} from './mcp-moisture-suite.mjs';
import {coolingSuite} from './mcp-cooling-suite.mjs';
import {winterSuite} from './mcp-winter-suite.mjs';
import {efficiencySuite} from './mcp-efficiency-suite.mjs';
import {fitSuite} from './mcp-fit-suite.mjs';
import {energyNext} from './mcp-energy-next.mjs';
import {climateNext} from './mcp-climate-next.mjs';
import {careNext} from './mcp-care-next.mjs';
import {evidenceNext} from './mcp-evidence-next.mjs';
import {waterHousehold} from './mcp-water-household.mjs';
import {envelopeSuite} from './mcp-envelope.mjs';
import {useWorkflows} from './mcp-use-workflows.mjs';
import {measurementLab} from './mcp-measurement-lab.mjs';
import {alltagZugang} from './mcp-alltag-zugang.mjs';
import {saisonWechsel} from './mcp-saison-wechsel.mjs';
import {kaufpraxis} from './mcp-kaufpraxis.mjs';
import {ressourcenplan} from './mcp-ressourcenplan.mjs';
import {raumplanung} from './mcp-raumplanung.mjs';
import {wetterpraxis} from './mcp-wetterpraxis.mjs';
import {kuechenpraxis} from './mcp-kuechenpraxis.mjs';
import {servicepraxis} from './mcp-servicepraxis.mjs';
import {belegeAbgleichen} from './mcp-belege-abgleichen.mjs';
import {textilpraxis} from './mcp-textilpraxis.mjs';
import {luftpfade} from './mcp-luftpfade.mjs';
import {modellunterlagen} from './mcp-modellunterlagen.mjs';
import {haushaltsbuch} from './mcp-haushaltsbuch.mjs';
import {praxistest} from './mcp-praxistest.mjs';
import {messunsicherheit} from './mcp-messunsicherheit.mjs';
import {geraeteablauf} from './mcp-geraeteablauf.mjs';
import {weiterverwendung} from './mcp-weiterverwendung.mjs';
import {raumuebergabe} from './mcp-raumuebergabe.mjs';
import {wohnszenarien} from './mcp-wohnszenarien.mjs';
import {verbrauchsverlauf} from './mcp-verbrauchsverlauf.mjs';
import {fensterbetrieb} from './mcp-fensterbetrieb.mjs';
import {pflegeablaeufe} from './mcp-pflegeablaeufe.mjs';
import {haushaltskoordination} from './mcp-haushaltskoordination.mjs';
import {nachweispruefung} from './mcp-nachweispruefung.mjs';
import {wasserwege} from './mcp-wasserwege.mjs';
import {raumakustik} from './mcp-raumakustik.mjs';
import {mehrgeraetebetrieb} from './mcp-mehrgeraetebetrieb.mjs';
import {gebrauchtgeraete} from './mcp-gebrauchtgeraete.mjs';
import {kuechenressourcen} from './mcp-kuechenressourcen.mjs';
import {klimaverlauf} from './mcp-klimaverlauf.mjs';
import {mobileRaeume} from './mcp-mobile-raeume.mjs';
import {arbeitsplatzMesspraxis} from './mcp-arbeitsplatz-messpraxis.mjs';
import {punktwaerme} from './mcp-punktwaerme.mjs';
import {luftkuehlerpraxis} from './mcp-luftkuehlerpraxis.mjs';
import {trocknungswaerme} from './mcp-trocknungswaerme.mjs';
import {gartenalltag} from './mcp-gartenalltag.mjs';
import {gefrierpraxis} from './mcp-gefrierpraxis.mjs';
import {spuelerEinbau} from './mcp-spueler-einbau.mjs';
import {waschTrockenSaeule} from './mcp-wasch-trocken-saeule.mjs';
import {lueftungsKaufpraxis} from './mcp-lueftungs-kaufpraxis.mjs';
import {ersatzteilnachweis} from './mcp-ersatzteilnachweis.mjs';
import {dunstabzugBelege} from './mcp-dunstabzug-belege.mjs';
import {backofenzubehoer} from './mcp-backofenzubehoer.mjs';
import {brausenZubehoer} from './mcp-brausen-zubehoer.mjs';
import {geraeterollenBelege} from './mcp-geraeterollen-belege.mjs';
import {altgeraeteRueckgabe} from './mcp-altgeraete-rueckgabe.mjs';
import {induktionsgeschirrBelege} from './mcp-induktionsgeschirr-belege.mjs';
import {betriebszustandBelege} from './mcp-betriebszustand-belege.mjs';
import {spuelstatusBelege} from './mcp-spuelstatus-belege.mjs';
import {airfryerBehaelter} from './mcp-airfryer-behaelter.mjs';
import {kompaktspuelBelege} from './mcp-kompaktspuel-belege.mjs';
import {filterkannen} from './mcp-filterkannen.mjs';
import {textilzeichen} from './mcp-textilzeichen.mjs';
import {tuerspalt} from './mcp-tuerspalt.mjs';
import {roboterpflege} from './mcp-roboterpflege.mjs';
import {kuehlkauf} from './mcp-kuehlkauf.mjs';
import {ledkauf} from './mcp-ledkauf.mjs';
import {kaffeePflegebelege} from './mcp-kaffee-pflegebelege.mjs';
import {waschdosierungBelege} from './mcp-waschdosierung-belege.mjs';
import {spuelmittelBelege} from './mcp-spuelmittel-belege.mjs';
import {bodenstaubsaugerBelege} from './mcp-bodenstaubsauger-belege.mjs';
import {dampfbuegelBelege} from './mcp-dampfbuegel-belege.mjs';
import {stabmixerBelege} from './mcp-stabmixer-belege.mjs';
import {mikrowellenBelege} from './mcp-mikrowellen-belege.mjs';
import {kuechenwaagenBelege} from './mcp-kuechenwaagen-belege.mjs';
import {wasserkocherBelege} from './mcp-wasserkocher-belege.mjs';
import {toasterBelege} from './mcp-toaster-belege.mjs';
import {kaercherFensterlippe} from './mcp-kaercher-fensterteile.mjs';
import {kaercherFenstersaugerTools} from './mcp-kaercher-fenstersauger.mjs';
import {glassvacBelege} from './mcp-glassvac-belege.mjs';
import {evidenceGuideUrl} from './mcp-evidence-guides.mjs';

export const expandedDefinitions = [
  ['Strom & Haushalt', householdSuite],
  ['Feuchte', moistureSuite],
  ['Kühlen', coolingSuite],
  ['Heizen', winterSuite],
  ['Strom & Haushalt', efficiencySuite],
  ['Passform', fitSuite],
  ['Energie prüfen', energyNext],
  ['Raumkomfort prüfen', climateNext],
  ['Geräte pflegen', careNext],
  ['Quellen & Kaufprüfung', evidenceNext],
  ['Wasser & Wäsche', waterHousehold],
  ['Gebäude & Fenster', envelopeSuite],
  ['Geräte im Alltag', useWorkflows],
  ['Messpraxis', measurementLab],
  ['Zugang & Alltag', alltagZugang],
  ['Saisonwechsel', saisonWechsel],
  ['Kaufpraxis', kaufpraxis],
  ['Ressourcen planen', ressourcenplan],
  ['Raumplanung', raumplanung],
  ['Wetterpraxis', wetterpraxis],
  ['Küchenpraxis', kuechenpraxis],
  ['Servicevorbereitung', servicepraxis],
  ['Belege abgleichen', belegeAbgleichen],
  ['Textilpraxis', textilpraxis],
  ['Luftpfade', luftpfade],
  ['Modellunterlagen', modellunterlagen],
  ['Haushaltsbuch', haushaltsbuch],
  ['Praxistests', praxistest],
  ['Messunsicherheit', messunsicherheit],
  ['Geräteablauf', geraeteablauf],
  ['Weiterverwendung', weiterverwendung],
  ['Raumübergabe', raumuebergabe],
  ['Wohnszenarien', wohnszenarien],
  ['Verbrauchsverlauf', verbrauchsverlauf],
  ['Fensterbetrieb', fensterbetrieb],
  ['Pflegeabläufe', pflegeablaeufe],
  ['Haushaltskoordination', haushaltskoordination],
  ['Nachweisprüfung', nachweispruefung],
  ['Wasserwege', wasserwege],
  ['Raumakustik', raumakustik],
  ['Mehrgerätebetrieb', mehrgeraetebetrieb],
  ['Gebrauchtgeräte', gebrauchtgeraete],
  ['Küchenressourcen', kuechenressourcen],
  ['Klimaverlauf', klimaverlauf],
  ['Wohnmobil', mobileRaeume],
  ['Arbeitsplatz-Messpraxis', arbeitsplatzMesspraxis],
  ['Lokale Wärme', punktwaerme],
  ['Luftkühler', luftkuehlerpraxis],
  ['Wäsche mit Wärme', trocknungswaerme],
  ['Gartenalltag', gartenalltag],
  ['Gefrierpraxis', gefrierpraxis],
  ['Geschirrspüler-Einbau', spuelerEinbau],
  ['Wäschesäule', waschTrockenSaeule],
  ['Lüftungskauf', lueftungsKaufpraxis],
  ['Ersatzteilnachweis', ersatzteilnachweis],
  ['Dunstabzug', dunstabzugBelege],
  ['Backofenzubehör', backofenzubehoer],
  ['Brausenzubehör', brausenZubehoer],
  ['Rollenzubehör', geraeterollenBelege],
  ['Altgeräte-Rücknahme', altgeraeteRueckgabe],
  ['Induktionsgeschirr', induktionsgeschirrBelege],
  ['Betriebszustände', betriebszustandBelege],
  ['Spülstatus', spuelstatusBelege],
  ['Airfryer-Behälter', airfryerBehaelter],
  ['Kompaktspülen', kompaktspuelBelege],
  ['Filterkannen', filterkannen],
  ['Textilzeichen', textilzeichen],
  ['Türbodenspalt', tuerspalt],
  ['Roboterpflege', roboterpflege],
  ['Kühlgerätekauf', kuehlkauf],
  ['LED-Kaufprüfung', ledkauf],
  ["Kaffeemaschinenpflege", kaffeePflegebelege],
  ["Waschmitteldosierung", waschdosierungBelege],
  ["Spülmittel und Wasserhärte", spuelmittelBelege],
  ["Bodenstaubsaugerpflege", bodenstaubsaugerBelege],
  ["Dampfbügelgeräte", dampfbuegelBelege],
  ["Stabmixer und Zubehör", stabmixerBelege],
  ["Mikrowellenbelege", mikrowellenBelege],
  ["Küchenwaagen", kuechenwaagenBelege],
  ["Wasserkocherbelege", wasserkocherBelege],
  ["Toasterbelege", toasterBelege],
  ['Fenstersauger', [kaercherFensterlippe, ...kaercherFenstersaugerTools, ...glassvacBelege]],
].flatMap(([category, definitions]) => definitions.map(tool => {
  const guide_url = evidenceGuideUrl(category, tool.page);
  return {...tool, category, ...(guide_url ? {guide_url} : {})};
}));

const handlers = new Map(expandedDefinitions.map(tool => [tool.name, tool]));
export const isExpandedTool = name => handlers.has(name);

export function catalogueExample(name) {
  const tool = handlers.get(name);
  if (!tool) return {example:null};
  const citation_url = 'https://getecoback.com' + tool.page;
  return {
    example:{arguments:tool.example.args, expected_fields:tool.example.expect},
    citation_url,
    citation_markdown_url:citation_url.replace(/\.html$/,'.md'),
  };
}

export const expandedTools = expandedDefinitions.map(({name, description, properties}) => ({
  name, description,
  inputSchema: {type:'object', properties, required:Object.keys(properties), additionalProperties:false},
  annotations: {readOnlyHint:true, openWorldHint:false},
}));

export const expandedCatalog = expandedTools.map((tool, index) => {
  const {category, page, guide_url} = expandedDefinitions[index];
  return {...tool, category, page, ...(guide_url ? {guide_url} : {})};
});

function valid(schema, value) {
  if (typeof value !== schema.type || (schema.enum && !schema.enum.includes(value))) return false;
  if (schema.type !== 'number') return true;
  return Number.isFinite(value) &&
    value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
}

function toolError(text) {
  return {isError:true, content:[{type:'text', text}]};
}

export function expandedCall(name, args) {
  const tool = handlers.get(name);
  if (!tool) return null;
  const properties = Object.entries(tool.properties);
  if (!args || typeof args !== 'object' || Array.isArray(args) ||
      Object.keys(args).length !== properties.length ||
      !properties.every(([key, schema]) => Object.hasOwn(args,key) && valid(schema,args[key]))) {
    return toolError('Eingaben mit tools/list abgleichen. Das Tool braucht alle angegebenen Werte und Einheiten.');
  }

  let data;
  try {
    data = tool.calculate(args);
  } catch (error) {
    if (error instanceof RangeError) return toolError('Die Kombination der Eingaben liegt außerhalb des Rechenmodells.');
    throw error;
  }
  const structuredContent = {
    ...data,
    citation_url:'https://getecoback.com'+tool.page,
    ...(tool.guide_url ? {guide_url:tool.guide_url} : {}),
    disclosure:'Quelle: EcoBack. Die Website enthält gekennzeichnete Affiliate-Links.',
  };
  const text = JSON.stringify(structuredContent, null, 2);
  return {isError:false, structuredContent, content:[{type:'text', text}]};
}
