// Pure scenario arithmetic. No tariff feed, label class conversion or product ranking.
export const US_GALLON=3.785411784;
export const HEAT=0.001163; // kWh per litre per kelvin, water approximation
export const bounds={rate:[0,10],heatRate:[0,10],waterRate:[0,100],cycles:[0,2000],years:[1,30],energyA:[0,20000],energyB:[0,20000],priceA:[0,100000],priceB:[0,100000],machineEnergy:[0,20],machineWater:[0,200],machineHotWater:[0,200],handWater:[0,500],lift:[0,60],ratio:[0.1,10],flowA:[0,200],flowB:[0,200],minutes:[0,60],showers:[0,10000],headCost:[0,10000]};
export const enums={market:['DE','AT','CH','NL','GB','FR','US','CA'],mode:['label','dish','shower'],machineHeat:['included','external'],category:['dryer','fridge','dishwasher'],unitA:['hundred','cycle','year'],unitB:['hundred','cycle','year'],comparable:['yes','no'],flowUnit:['litre','usgal'],compatible:['unknown','yes','electric','pump']};
export function defaults(market='DE'){return {market,mode:'label',machineHeat:'included',machineHotWater:6,category:'dryer',unitA:'hundred',unitB:'hundred',comparable:'yes',flowUnit:'litre',compatible:'unknown',rate:0.3,heatRate:0.1,waterRate:4,cycles:160,years:10,energyA:240,energyB:120,priceA:450,priceB:700,machineEnergy:0.75,machineWater:9,handWater:20,lift:30,ratio:0.85,flowA:10,flowB:7,minutes:6,showers:365,headCost:35};}
export function validate(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('schema');
 const keys=[...Object.keys(bounds),...Object.keys(enums)];if(Object.keys(raw).length!==keys.length||Object.keys(raw).some(k=>!keys.includes(k)))throw Error('schema');
 const out={};for(const [k,[min,max]] of Object.entries(bounds)){const n=raw[k];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(k);out[k]=n;}
 for(const [k,values] of Object.entries(enums)){if(!values.includes(raw[k]))throw Error(k);out[k]=raw[k];}if(out.flowUnit==='usgal'&&(out.flowA*US_GALLON>200||out.flowB*US_GALLON>200))throw Error('flowA');if(out.mode==='dish'&&out.machineHeat==='external'&&out.machineHotWater>out.machineWater)throw Error('machineHotWater');return out;
}
export function annual(value,unit,cycles){if(unit==='year')return value;if(unit==='hundred')return value/100*cycles;if(unit==='cycle')return value*cycles;throw Error('unit');}
export function payback(extra,saving){return saving>0?Math.max(0,extra)/saving:null;}
export function calculate(raw){const s=validate(raw);if(s.mode==='label'){
 const a=annual(s.energyA,s.unitA,s.cycles),b=annual(s.energyB,s.unitB,s.cycles),ca=a*s.rate,cb=b*s.rate;
 // Annual standardised test values must not be silently mixed with household cycle estimates.
 const comparable=s.comparable==='yes'&&((s.unitA==='year')===(s.unitB==='year'));
 return {a,b,ca,cb,totalA:s.priceA+ca*s.years,totalB:s.priceB+cb*s.years,saving:comparable?ca-cb:null,payback:comparable?payback(s.priceB-s.priceA,ca-cb):null,comparable};
 }
 if(s.mode==='dish'){
 const perL=HEAT*s.lift/s.ratio*s.heatRate+s.waterRate/1000;
 const external=s.machineHeat==='external'?s.machineHotWater*HEAT*s.lift/s.ratio*s.heatRate:0;
 const ca=s.machineEnergy*s.rate+external+s.machineWater*s.waterRate/1000,cb=s.handWater*perL;
 return {a:s.machineEnergy,b:s.handWater*HEAT*s.lift/s.ratio,ca:ca*s.cycles,cb:cb*s.cycles,waterA:s.machineWater*s.cycles,waterB:s.handWater*s.cycles,threshold:perL>0?ca/perL:null,saving:(cb-ca)*s.cycles};
 }
 const factor=s.flowUnit==='usgal'?US_GALLON:1,litres=(s.flowA-s.flowB)*factor*s.minutes*s.showers;
 const heat=litres*HEAT*s.lift/s.ratio,saving=heat*s.heatRate+litres*s.waterRate/1000;
 return {litres,heat,saving,payback:s.compatible==='yes'?payback(s.headCost,saving):null,compatible:s.compatible==='yes'};
}
export function parseShare(hash){if(!hash.startsWith('#eco-buy-v1='))return null;if(hash.length>5000)throw Error('length');return validate(JSON.parse(decodeURIComponent(hash.slice(12))));}
export function scenarioURL(canonical,state){const u=new URL(canonical);u.search='';u.hash='eco-buy-v1='+encodeURIComponent(JSON.stringify(validate(state)));return u.href;}
