// Local decision rules, not a fault diagnosis or compatibility certification.
export const CARE = Object.freeze({model:['s5','s7-flashdry','other'],symptom:['weak','tank','odor','stops','burnt','worn'],care:['not-yet','dry','unsure']});
export const CURTAIN = Object.freeze({place:['door','window','unsure'],radiator:['clear','covered','unsure'],opening:['clear','blocked','unsure']});
export const SOURCES = Object.freeze({s5:'https://de.tineco.com/support/faqs/floor-one-s5/',s7:'https://de.tineco.com/support/troubleshooting/floor-one-s7-flashdry/solution/1432.html',heat:'https://www.verbraucherzentrale.de/wissen/energie/heizen-und-warmwasser/heizung-10-einfache-tipps-zum-heizkosten-sparen-13892'});
const valid=(v,schema)=>v&&Object.entries(schema).every(([k,values])=>values.includes(v[k]));
const result=(code,title,steps,source,shop=false)=>({code,title,steps,source,shop});
export function careDecision(v){
 if(!valid(v,CARE))return null;
 const source=v.model==='s7-flashdry'?SOURCES.s7:SOURCES.s5;
 if(v.symptom==='burnt')return result('stop','Nicht weiter benutzen – Kundendienst kontaktieren',[
  'Gerät ausschalten, nicht erneut testen oder laden und nicht öffnen. Bei Rauch Abstand halten; bei unmittelbarer Gefahr den Notruf wählen.',
  'Tineco unterscheidet beim S7 FlashDry muffigen Geruch ausdrücklich von verbranntem oder elektrischem Geruch und verweist dafür an den Kundendienst. Das ist kein Filter-Kaufsignal.'
 ],SOURCES.s7);
 if(v.model==='other')return result('identify','Zuerst die genaue Modellbezeichnung klären',[
  'Dieser Check deckt nur FLOOR ONE S5 und FLOOR ONE S7 FlashDry ab. S5 Combo, Stretch, Pro und andere Varianten sind nicht automatisch gleich.',
  'Modell auf dem Typenschild mit der eigenen Anleitung abgleichen. Keine Anleitung oder Teileempfehlung eines anderen Modells übernehmen.'
 ],'https://de.tineco.com/support/');
 if(v.symptom==='worn')return result('compatibility','Ersatzteil zuerst anhand des genauen Modells prüfen',[
  'Ein sichtbar beschädigter Filter oder eine beschädigte Walze kann eine Ersatzteilprüfung begründen. Die passende Teilenummer ist hier nicht verifiziert.',
  'Beim Hersteller Modellvariante, Teilenummer und Lieferumfang abgleichen. Nicht nach Foto oder allein nach „Tineco-kompatibel“ kaufen; bei unklarer Beschädigung den Kundendienst fragen.'
 ],source);
 if(v.symptom==='stops')return result('service','Meldung prüfen – Abschalten beweist keinen Akkudefekt',[
  v.model==='s5'?'Beim S5 kann ein voller Schmutzwassertank einen automatischen Stopp auslösen. Anzeige und Sprachmeldung mit der S5-Anleitung abgleichen.':'Anzeige und Sprachmeldung mit der Anleitung des S7 FlashDry abgleichen. Die hier verlinkte Geruchshilfe diagnostiziert keine Abschaltursache.',
  'Bleibt das Problem nach den freigegebenen Schritten bestehen, dem Kundendienst Modell und Meldung nennen. Kein Akku- oder Schlauchtausch auf Verdacht.'
 ],source);
 if(v.model==='s7-flashdry'&&['weak','tank'].includes(v.symptom))return result('manual','Für dieses Symptom die genaue Modellhilfe nutzen',[
  'Die hier geprüfte S7-FlashDry-Quelle behandelt Geruch. Sie belegt keine Diagnose für schwache Saugleistung, Tankmeldungen oder Blockaden.',
  'Die entsprechende Meldung in der eigenen S7-FlashDry-Anleitung nachschlagen oder den Kundendienst fragen. S5-Pflegeschritte und Ersatzteile nicht ungeprüft übertragen.'
 ],'https://de.tineco.com/support/');
 if(v.care!=='dry')return result('care','Zuerst die freigegebene Pflege erledigen',[
  v.model==='s5'?'S5: Filter nur wie vom Hersteller beschrieben reinigen und vor dem Wiedereinsetzen vollständig trocknen lassen. Bei Tank- oder Blockadehinweisen die entsprechenden Herstellerhinweise prüfen.':'S7 FlashDry: Bei muffigem Geruch nennt die offizielle Hilfe Filter, Schmutzwassertank, Walze und Schmutzkanal. Den gereinigten Filter vor dem Einsetzen vollständig trocknen lassen.',
  'Gerät für die Pflege ausschalten und die eigene Anleitung beachten. Keine pauschale Essig-, Lösungsmittel- oder interne Reparaturempfehlung. Schwache Saugleistung allein beweist keinen Teiledefekt.',
  'Erst vollständig und korrekt zusammensetzen. Bei erneutem Fehler nicht wiederholt auf Verdacht nachkaufen.'
 ],source);
 return result('service','Nach erlaubter Pflege weiterhin auffällig: Support',[
  'Das Symptom besteht nach Reinigung und vollständiger Trocknung weiter. Daraus folgt weder ein sicherer Filterdefekt noch ein verschlissener Akku.',
  'Modell, genaue Meldung und bereits erledigte Pflegeschritte für den Kundendienst bereithalten. Interne Bauteile hier nicht öffnen; Ersatzteile erst nach modellbezogener Klärung prüfen.'
 ],source);
}
export function curtainDecision(v){
 if(!valid(v,CURTAIN))return null;
 const steps=[];
 if(v.radiator==='covered')steps.push('Den geplanten Stoffverlauf ändern: Heizkörper und Thermostat frei lassen. Herstellerabstände von elektrischen Heizgeräten beachten; Stoff nicht darüber hängen.');
 if(v.opening==='blocked')steps.push('Tür oder Fenster muss sich weiterhin vollständig bedienen lassen. Durchgang und Fluchtweg frei halten; die Montage so noch nicht auswählen.');
 if(steps.length)return result('conflict','Erst den Montagekonflikt lösen',steps.concat(['Lüftungsöffnungen nicht verschließen. Ein Vorhang behebt keine defekte Dichtung und garantiert keine Heizkostenersparnis.']),SOURCES.heat);
 if(Object.values(v).includes('unsure'))return result('inspect','Vor dem Kauf vor Ort prüfen',[
  'Position von Heizkörper, Thermostat, Lüftungsöffnungen und dem geöffneten Tür- oder Fensterflügel ansehen. Kaltgefühl allein beweist keinen undichten Spalt.',
  'Breite, Höhe, Befestigung und Bewegungsraum fehlen noch. Daher keine Größen- oder Produktempfehlung; bei unklarem Zug oder baulichen Mängeln Vermieter oder Fachbetrieb einbeziehen.'
 ],SOURCES.heat);
 return result('measure','Die Lage wirkt grundsätzlich prüfbar – jetzt ausmessen',[
  v.place==='door'?'Tür: Zugquelle und Zustand vorhandener Dichtungen prüfen. Eine vorgeschriebene Lüftungsöffnung oder Luftüberströmung nicht zustellen; bei Unklarheit vor Montage abklären.':'Fenster: Kaltstrahlung, Luftbewegung und echte Undichtigkeit unterscheiden. Die Scheibe und Rahmen regelmäßig auf Feuchtigkeit prüfen; Vorhang zum Lüften öffnen.',
  'Vor dem Kauf Breite, Höhe, Träger-/Flügeldicke und vollständigen Öffnungsweg messen. Bei Klemmmontage die Freigabe des Fenster- und Zubehörherstellers prüfen; „ohne Bohren“ ist keine Zusage für Schadenfreiheit.',
  'Die Auswahl ist keine Passformprüfung. Eine Einsparung in Euro oder Prozent lässt sich daraus nicht ableiten. Vorhandenen Vorhang nutzen, wenn er geeignet ist.'
 ],SOURCES.heat,true);
}
export function upkeepEvent(action){return ['view','example','decision','share'].includes(action)?'eco_upkeep_'+action:null;}
