export const MAX_AGE_DAYS = 30;
export function sourceState(item, now = new Date()) {
  if (item.status === 'conflict') return {active:false, label:'Source conflict — check official listing'};
  if (item.status !== 'verified') return {active:false, label:'Source check unavailable — recheck official listing'};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.checked_at || '')) return {active:false, label:'Check date unavailable — recheck official listing'};
  const checked = new Date(item.checked_at + 'T00:00:00Z');
  if (!Number.isFinite(checked.getTime()) || checked.toISOString().slice(0,10) !== item.checked_at) return {active:false, label:'Check date unavailable — recheck official listing'};
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const age = (today - checked.getTime()) / 86400000;
  if (age < 0) return {active:false, label:'Check date unavailable — recheck official listing'};
  if (age > MAX_AGE_DAYS) return {active:false, label:'Recheck due — last verified more than 30 days ago'};
  return {active:true, label:'Manufacturer listing checked'};
}
export function exactMatches(items, model) { return items.filter(item => Array.isArray(item.models) && item.models.includes(model)); }
export function modelNames(items) { return [...new Set(items.flatMap(item => item.models || []))].sort((a,b)=>a.localeCompare(b)); }
export function narrowModels(models, query) { const text = query.trim().toLocaleLowerCase(); return models.filter(model => model.toLocaleLowerCase().includes(text)); }
export function affiliateSearch(item, model, now = new Date()) {
  if (!sourceState(item, now).active || !item.models.includes(model)) return null;
  const url = new URL('https://www.amazon.com/s');
  // Internal merchant SKUs are not consumer part numbers. Exact model remains in every search.
  url.searchParams.set('k', `${item.brand} ${item.name} ${model}`);
  url.searchParams.set('tag', 'ecoback0d-20');
  return url.href;
}

export function measurementAllowed({webdriver,doNotTrack,globalPrivacyControl,search=''}) {
  const query=new URLSearchParams(search);
  return !webdriver && !globalPrivacyControl && !['1','yes'].includes(String(doNotTrack||'').toLowerCase()) && !query.has('__qa') && !query.has('__probe');
}
