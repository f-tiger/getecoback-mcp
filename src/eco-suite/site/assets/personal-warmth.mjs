/* Personal heating estimates run locally. Telemetry contains fixed actions only. */
export const EXAMPLES = Object.freeze({
  short: Object.freeze({watts:110,hours:0.5,days:1,tariff:0.35}),
  sofa: Object.freeze({watts:110,hours:2,days:1,tariff:0.35}),
  desk: Object.freeze({watts:110,hours:3,days:1,tariff:0.35})
});
export function calculateWarmth(values) {
  const {watts,hours,days,tariff}=values;
  if(![watts,hours,days,tariff].every(v=>typeof v==='number'&&Number.isFinite(v)) ||
    watts<0 || watts>500 || hours<0 || hours>24 || days<1 || days>366 || !Number.isInteger(days) || tariff<0 || tariff>5) return null;
  const wh=watts*hours, kwh=wh/1000;
  return {wh,kwh,cost:kwh*tariff,totalKwh:kwh*days,totalCost:kwh*tariff*days};
}
export function warmthKind(values, example) {
  return ['watts','hours','days','tariff'].every(key=>values[key]===example[key])?'example':'own';
}
const num=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:3}).format(value);
const money=(value,currency)=>new Intl.NumberFormat('de-DE',{style:'currency',currency}).format(value);
const canonical='https://getecoback.com/guide/heizdecke-stromverbrauch.html';
export function shareWarmth(values, currency, kind) {
  const result=calculateWarmth(values);
  if(!result || !['EUR','CHF'].includes(currency)) return '';
  return `EcoBack · ${kind==='own'?'Eigene Annahmen':'Rechenbeispiel'}\n${num(values.watts)} W × ${num(values.hours)} h = ${num(result.kwh)} kWh pro Nutzung. Bei ${num(values.tariff)} ${currency}/kWh: ${money(result.cost,currency)}. Für ${values.days} Nutzungstage: ${money(result.totalCost,currency)}.\nRechnung mit durchgehender Nennleistung, keine Messung oder zugesicherte Ersparnis. Anleitung und Abschaltzeit des eigenen Geräts beachten; persönliche Wärme ersetzt keine notwendige Raumheizung.\n${canonical}#waerme-rechner`;
}
function action(name) {
  if(navigator.webdriver || navigator.doNotTrack==='1' || navigator.globalPrivacyControl || new URLSearchParams(location.search).has('qa')) return;
  try {if(localStorage.getItem('fleet_ga4_choice_v1')==='denied')return;}catch{return;}
  window.dispatchEvent(new CustomEvent('fleet:business',{detail:{name}}));
}
export function initWarmth(root) {
  if(!root)return;
  const form=root.querySelector('form'),out=root.querySelector('[data-warmth-result]'),copy=root.querySelector('[data-warmth-copy]'),status=root.querySelector('[data-warmth-status]'),fallback=root.querySelector('[data-warmth-fallback]');
  let selected='sofa',rendered=null;
  const values=()=>Object.fromEntries(['watts','hours','days','tariff'].map(key=>[key,Number(form.elements[key].value)]));
  const currency=()=>form.elements.country.value==='CH'?'CHF':'EUR';
  function render(){
    const v=values(),r=calculateWarmth(v);
    if(!r){out.textContent='Bitte gültige Werte innerhalb der angegebenen Grenzen verwenden.';out.hidden=false;copy.disabled=true;rendered=null;return;}
    const kind=warmthKind(v,EXAMPLES[selected]);
    out.textContent=`${kind==='own'?'Eigene Annahmen':'Rechenbeispiel'} · ${num(r.wh)} Wh = ${num(r.kwh)} kWh pro Nutzung · ${money(r.cost,currency())}. Für ${v.days} Nutzungstag${v.days===1?'':'e'}: ${num(r.totalKwh)} kWh und ${money(r.totalCost,currency())}. Durchgehende Nennleistung; keine Verbrauchsmessung.`;
    out.hidden=false;copy.disabled=false;rendered={values:v,currency:currency(),kind};
  }
  function invalidate(){out.hidden=true;rendered=null;copy.disabled=true;status.textContent='Werte geändert. Bitte neu berechnen.';fallback.hidden=true;}
  function load(key){selected=key;for(const [name,value]of Object.entries(EXAMPLES[key]))form.elements[name].value=value;root.querySelectorAll('[data-warmth-example]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.warmthExample===key)));status.textContent='';fallback.hidden=true;render();}
  root.querySelectorAll('[data-warmth-example]').forEach(button=>button.addEventListener('click',()=>{load(button.dataset.warmthExample);action('eco_warmth_example');}));
  form.addEventListener('input',invalidate);
  form.elements.country.addEventListener('change',()=>{root.querySelector('[data-warmth-currency]').textContent=currency();invalidate();});
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;status.textContent='';render();if(rendered?.kind==='own')action('eco_warmth_calculate');});
  copy.addEventListener('click',async()=>{
    if(!rendered)return;
    const text=shareWarmth(rendered.values,rendered.currency,rendered.kind);
    try{await navigator.clipboard.writeText(text);status.textContent='Kopiert. Du kannst den Text jetzt selbst auf Reddit, X oder in einer Nachricht einfügen.';action('eco_warmth_share');}
    catch{fallback.value=text;fallback.hidden=false;fallback.focus();fallback.select();status.textContent='Automatisches Kopieren nicht verfügbar. Markierten Text manuell kopieren.';}
  });
  form.hidden=false;
  root.querySelectorAll('[data-warmth-example]').forEach(button=>{button.disabled=false;});
  render();
}
if(typeof document!=='undefined')initWarmth(document.querySelector('#waerme-rechner'));
