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

export function laundryTariff(price,currency,locale='de-DE'){
 return new Intl.NumberFormat(locale,{style:'currency',currency,maximumFractionDigits:20}).format(price);
}

export function laundryShareText(input,provenance='entered'){
 const result=laundry(input),{currency}=input;
 const energy=new Intl.NumberFormat('de-DE',{maximumFractionDigits:10});
 const cost=new Intl.NumberFormat('de-DE',{style:'currency',currency});
 const price=laundryTariff(input.price,currency);
 const dryerBasis=input.dryerBasis==='hundred'?'Labelwert je 100 Zyklen ÷ 100':'eingegebene kWh je Ladung';
 const dehumBasis=input.method==='estimate'?'aus mittlerer Leistung × Laufzeit geschätzt':'eingegebene kWh je Durchgang';
 const basis={example:'Rechenbeispiel',shared:'Werte aus einem geteilten Szenario',entered:'Eingegebene Werte'}[provenance]??'Eingegebene Werte';
 const comparison=result.winner==='unconfirmed'?'Wäschemenge oder Endtrockenheit nicht als gleich bestätigt. Keine Aussage, welches Verfahren bei gleicher Trocknung günstiger ist.':
  'Gleiche Wäschemenge und Endtrockenheit sind für den Vergleich vorausgesetzt.';
 return [
  'Direkte Stromkosten je vollständigem Trocknungsdurchgang',
  `${basis}. Trockner: ${dryerBasis}. Entfeuchter: ${dehumBasis}.`,
  `Trockner: ${energy.format(result.dryer)} kWh × ${price}/kWh = ${cost.format(result.dryerCost)}`,
  `Entfeuchter: ${energy.format(result.dehum)} kWh × ${price}/kWh = ${cost.format(result.dehumCost)}`,
  comparison,
  'Raumheizung, Lüftungswärme, Kaufpreis und Zeit sind nicht enthalten.',
  `Rechenweg bei EcoBack: ${LAUNDRY_SHARE_URL}`,
 ].join('\n');
}
