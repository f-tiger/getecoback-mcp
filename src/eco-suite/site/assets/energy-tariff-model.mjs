// Annual, all-inclusive user-entered prices; no supplier feed or price forecast.
export const VERSION = 1;
export const MARKETS = {de:{bands:1,power:0},fr:{bands:2,power:0},es:{bands:3,power:2},it:{bands:3,power:1}};
function number(x,max=1e7){if(typeof x!=='number'||!Number.isFinite(x)||x<0||x>max)throw Error('number');return x;}
function list(x,n,max){if(!Array.isArray(x)||x.length!==n)throw Error('length');return x.map(v=>number(v,max));}
export function normalize(x){
 if(!x||x.version!==VERSION||!Object.hasOwn(MARKETS,x.market)||typeof x.own!=='boolean')throw Error('scenario');
 const m=MARKETS[x.market];const offer=o=>{if(!o||!['flat','period'].includes(o.mode))throw Error('offer');return {mode:o.mode,rates:list(o.rates,m.bands,100),fixed:number(o.fixed),powerKW:list(o.powerKW,m.power,1000),powerRates:list(o.powerRates,m.power,1e5),bonus:number(o.bonus)};};
 const s={version:VERSION,market:x.market,own:x.own,kwh:list(x.kwh,m.bands,1e6),A:offer(x.A),B:offer(x.B),switchCost:number(x.switchCost),shift:number(x.shift,1e6),stress:number(x.stress,90)};
 if(s.kwh.reduce((a,b)=>a+b,0)<=0||s.shift>s.kwh[0]||(m.bands===1&&s.shift!==0))throw Error('consumption');return s;
}
const energy=(o,q)=>q.reduce((a,v,i)=>a+v*o.rates[o.mode==='flat'?0:i],0);
export function calculate(input){
 const s=normalize(input),m=MARKETS[s.market],total=s.kwh.reduce((a,b)=>a+b,0);
 const bill=o=>{const usage=energy(o,s.kwh),power=o.powerKW.reduce((a,k,i)=>a+k*o.powerRates[i]*(s.market==='es'?365:1),0);return {energy:usage,fixed:o.fixed,power,recurring:usage+o.fixed+power};};
 const A=bill(s.A),B=bill(s.B);A.first=A.recurring-s.A.bonus;B.first=B.recurring-s.B.bonus+s.switchCost;
 const firstSaving=A.first-B.first,recurringSaving=A.recurring-B.recurring;
 const shifted=[...s.kwh];shifted[0]-=s.shift;shifted[m.bands-1]+=s.shift;
 let threshold=null;if(s.market==='fr'&&s.A.mode==='flat'&&s.B.mode==='period'&&s.B.rates[0]>s.B.rates[1])threshold=(s.B.fixed-s.A.fixed+total*(s.B.rates[0]-s.A.rates[0]))/(total*(s.B.rates[0]-s.B.rates[1]));
 return {A,B,total,firstSaving,recurringSaving,twoYearSaving:firstSaving+recurringSaving,bonusTrap:firstSaving>0&&recurringSaving<0,shiftSaving:energy(s.B,s.kwh)-energy(s.B,shifted),threshold,stressLow:B.recurring-B.energy*s.stress/100,stressHigh:B.recurring+B.energy*s.stress/100};
}
export function example(market='de'){
 if(!Object.hasOwn(MARKETS,market))throw Error('market');const m=MARKETS[market];const offer=(mode,rates,fixed,bonus=0)=>({mode,rates,fixed,bonus,powerKW:Array(m.power).fill(market==='es'?4.6:3),powerRates:market==='es'?[.08,.02]:market==='it'?[24]:[]});
 const cases={de:{kwh:[3000],A:offer('flat',[.32],144),B:offer('flat',[.30],180,100)},fr:{kwh:[2100,900],A:offer('flat',[.22,.22],180),B:offer('period',[.24,.16],192)},es:{kwh:[900,600,1500],A:offer('flat',[.20,.20,.20],36),B:offer('period',[.24,.18,.12],48)},it:{kwh:[900,900,900],A:offer('flat',[.28,.28,.28],120),B:offer('period',[.31,.27,.23],144)}};
 return normalize({version:VERSION,market,own:false,...cases[market],switchCost:0,shift:market==='fr'?300:0,stress:20});
}
export function encode(s){return encodeURIComponent(JSON.stringify(normalize(s)));}
export function decode(s){if(typeof s!=='string'||s.length>12000)throw Error('size');return normalize(JSON.parse(decodeURIComponent(s)));}
export function parseCSV(text,market){
 if(typeof text!=='string'||text.length>100000||!Object.hasOwn(MARKETS,market))throw Error('csv');
 const rows=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);if(rows.length<2||rows.length>367)throw Error('csv');
 const n=MARKETS[market].bands,sep=rows[0].includes(';')?';':',';if(rows[0]!==Array.from({length:n},(_,i)=>'kwh'+(i+1)).join(sep))throw Error('header');
 // A one-band template has no delimiter; its comma belongs to the decimal value.
 const totals=Array(n).fill(0);for(const row of rows.slice(1)){const parts=n===1?[row]:row.split(sep);if(parts.length!==n)throw Error('csv');parts.forEach((v,i)=>{v=v.trim();if(!/^\d+(?:[.,]\d+)?$/.test(v))throw Error('csv');totals[i]+=number(Number(v.replace(',','.')),1e6);});}return totals.map(v=>number(v,1e6));
}
