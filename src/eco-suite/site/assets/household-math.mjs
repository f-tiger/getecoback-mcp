// Pure calculation functions. Monetary inputs are scenarios, never live tariffs.
function bounded(v,min,max,name){if(!Number.isFinite(v)||v<min||v>max)throw new RangeError(name);return v;}
export function drying({dryer,watts,hours,loads,price}){
 bounded(dryer,0,20,'dryer');bounded(watts,0,5000,'watts');bounded(hours,0,72,'hours');bounded(loads,0,30,'loads');bounded(price,0,5,'price');
 const dehum=watts*hours/1000,n=loads*52;
 return {dryer,dehum,dryerCost:dryer*price,dehumCost:dehum*price,annualDryer:dryer*price*n,annualDehum:dehum*price*n,difference:(dehum-dryer)*price*n};
}
export function measured({kwh,hours,days,price}){
 bounded(kwh,0,10000,'kwh');bounded(hours,0.01,8760,'hours');bounded(days,0,366,'days');bounded(price,0,5,'price');
 const daily=kwh*24/hours;return {daily,annual:daily*days,cost:daily*days*price};
}
export function replacement({oldKwh,newKwh,price,purchase,years}){
 bounded(oldKwh,0,20000,'oldKwh');bounded(newKwh,0,20000,'newKwh');bounded(price,0,5,'price');bounded(purchase,0,50000,'purchase');bounded(years,1,30,'years');
 const saving=(oldKwh-newKwh)*price;
 return {saving,payback:saving>0?purchase/saving:null,keep:oldKwh*price*years,buy:purchase+newKwh*price*years};
}
