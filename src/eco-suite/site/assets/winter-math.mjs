export const bounds={thermostat:{base:[0,50000],saving:[0,100],cost:[0,10000],running:[0,1000]},shower:{flow:[.1,40],newflow:[.1,40],minutes:[.1,120],count:[1,5000],cold:[0,40],warm:[1,55],factor:[.1,8],price:[0,5],water:[0,30],cost:[0,1000]},lights:{watts:[0,5000],hours:[0,24],newhours:[0,24],days:[1,366],price:[0,5],timer:[0,100]}};
export function calculate(kind,input){
 const range=bounds[kind];if(!range)throw new RangeError('Unbekannter Rechner.');
 const x={};for(const [key,[lo,hi]]of Object.entries(range)){const raw=input[key];if(raw===''||raw===null||typeof raw==='boolean'||raw===undefined)throw new RangeError('Bitte alle Zahlenfelder ausfüllen.');const n=Number(raw);if(!Number.isFinite(n)||n<lo||n>hi)throw new RangeError('Bitte die zulässigen Wertebereiche beachten.');x[key]=n;}
 if(kind==='thermostat'){const gross=x.base*x.saving/100,net=gross-x.running;return {gross,net,payback:net>0?x.cost/net:null};}
 if(kind==='shower'){
  if(x.warm<=x.cold)throw new RangeError('Die Duschtemperatur muss über der Kaltwassertemperatur liegen.');
  const cost=flow=>{const litres=flow*x.minutes,heat=litres*(x.warm-x.cold)*.001163;return {litres,heat,energy:heat/x.factor,cost:heat/x.factor*x.price+litres/1000*x.water};};
  const before=cost(x.flow),after=cost(x.newflow),annual=(before.cost-after.cost)*x.count;
  return {before,after,annual,waterSaved:(before.litres-after.litres)*x.count/1000,payback:annual>0?x.cost/annual:null};
 }
 const before=x.watts*x.hours*x.days/1000,after=(x.watts*x.newhours+x.timer*24)*x.days/1000;
 return {before,after,beforeCost:before*x.price,afterCost:after*x.price,saving:(before-after)*x.price};
}
