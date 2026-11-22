// Compare one equally dry load. Inputs are scenarios, not product tests.
const bound=(x,lo,hi,key)=>{if(!Number.isFinite(x)||x<lo||x>hi)throw new RangeError(key);return x;};
export function laundry(x){
 if(!['cycle','hundred'].includes(x.dryerBasis)||!['measured','estimate'].includes(x.method)||!['EUR','GBP','USD'].includes(x.currency)||typeof x.comparable!=='boolean')throw new RangeError('basis');
 const dryer=bound(x.dryer,0,2000,'dryer')/(x.dryerBasis==='hundred'?100:1);bound(dryer,0,20,'dryer per load');
 const dehum=x.method==='measured'?bound(x.dehum,0,100,'dehum'):bound(x.watts,0,5000,'watts')*bound(x.hours,0,72,'hours')/1000;
 const price=bound(x.price,0,5,'price'),cycles=bound(x.loads,0,30,'loads')*52,purchase=bound(x.purchase,0,50000,'purchase');
 const dryerCost=dryer*price,dehumCost=dehum*price,annualDifference=(dryerCost-dehumCost)*cycles;
 return {dryer,dehum,dryerCost,dehumCost,annualDryer:dryerCost*cycles,annualDehum:dehumCost*cycles,annualDifference,
 winner:!x.comparable?'unconfirmed':Math.abs(dryerCost-dehumCost)<1e-9?'tie':dryerCost>dehumCost?'dehum':'dryer',
 breakEvenHours:x.method==='estimate'&&x.watts>0?dryer*1000/x.watts:null,
 payback:x.comparable&&annualDifference>0?purchase/annualDifference:null};
}

export const LAUNDRY_SHARE_URL='https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html#laundry-check';
export const LAUNDRY_SINGLE_SHARE_URL='https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html#luftentfeuchter-waesche-kosten';

export function laundrySingle(input) {
 const {method,dehum,watts,hours,price}=input;
 const fields=method==='measured'?['method','dehum','price']:['method','watts','hours','price'];
 if (!['measured','estimate'].includes(method)||Object.keys(input).some(key=>!fields.includes(key))) {
   throw new RangeError('Messung oder Schätzung eindeutig angeben.');
 }
 const kwh=method==='measured'?bound(dehum,0,100,'dehum'):
   bound(watts,0,5000,'watts')*bound(hours,0,72,'hours')/1000;
 return {kwh,cost:kwh*bound(price,0,5,'price')};
}

export function laundrySingleShareText(input) {
 const {kwh,cost}=laundrySingle(input);
 const energy=new Intl.NumberFormat('de-DE',{maximumFractionDigits:10}).format(kwh);
 const amount=Number(cost.toFixed(10)).toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 const provenance=input.method==='measured'?'Eingegebener Messwert für den ganzen Trocknungsgang':
   'Schätzung aus mittlerer Leistung und Laufzeit';
 return [
   'Direkte Stromkosten für einen Wäschedurchgang mit Luftentfeuchter',
   `${provenance}: ${energy} kWh × ${laundryTariff(input.price,'EUR')}/kWh = ${amount}.`,
   'Erfasst ist der Strom des Luftentfeuchters. Raumheizung und weitere Geräte sind getrennt zu berücksichtigen.',
   `Rechenweg bei EcoBack: ${LAUNDRY_SINGLE_SHARE_URL}`,
 ].join('\n');
}

export function laundryTariff(price,currency,locale='de-DE'){
 return new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:20}).format(price);
}

export function laundryShareText(input,provenance='entered'){
 const result=laundry(input),{currency}=input;
 const energy=new Intl.NumberFormat('de-DE',{maximumFractionDigits:10});
 const cost=new Intl.NumberFormat('de-DE',{style:'currency',currency});
 const amount=value=>cost.format(Number(value.toFixed(10)));
 const price=laundryTariff(input.price,currency);
 const dryerBasis=input.dryerBasis==='hundred'?'Labelwert je 100 Zyklen ÷ 100':'eingegebene kWh je Ladung';
 const dehumBasis=input.method==='estimate'?'aus mittlerer Leistung × Laufzeit geschätzt':'eingegebene kWh je Durchgang';
 const basis={example:'Rechenbeispiel',shared:'Werte aus einem geteilten Szenario',entered:'Eingegebene Werte'}[provenance]??'Eingegebene Werte';
 const comparison=result.winner==='unconfirmed'?'Wäschemenge oder Endtrockenheit nicht als gleich bestätigt. Keine Aussage, welches Verfahren bei gleicher Trocknung günstiger ist.':
  'Gleiche Wäschemenge und Endtrockenheit sind für den Vergleich vorausgesetzt.';
 return [
  'Direkte Stromkosten je vollständigem Trocknungsdurchgang',
  `${basis}. Trockner: ${dryerBasis}. Entfeuchter: ${dehumBasis}.`,
  `Trockner: ${energy.format(result.dryer)} kWh × ${price}/kWh = ${amount(result.dryerCost)}`,
  `Entfeuchter: ${energy.format(result.dehum)} kWh × ${price}/kWh = ${amount(result.dehumCost)}`,
  comparison,
  'Raumheizung, Lüftungswärme, Kaufpreis und Zeit sind nicht enthalten.',
  `Rechenweg bei EcoBack: ${LAUNDRY_SHARE_URL}`,
 ].join('\n');
}
