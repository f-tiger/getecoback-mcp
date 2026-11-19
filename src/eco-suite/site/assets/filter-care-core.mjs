import {sourceState} from './filter-finder-core.mjs';

export const STORAGE_KEY = 'ecoback.filter-care.de.v1';
export const ACTIONS = Object.freeze({checked:'Geprüft',cleaned:'Gereinigt',replaced:'Ersetzt'});
export const IDENTITIES = Object.freeze({
  'levoit-core-300s': {model:'Core 300S',brand:'Levoit',source:'https://levoit.de/products/levoit-core-300-und-core-300s-ersatzfilter-hepa-filter'},
  'beurer-lr401': {model:'LR 401',brand:'Beurer',source:'https://www.beurer.com/de/p/69309/'}
});
export function approvedIdentity(item) {
  const expected = IDENTITIES[item?.id];
  return Boolean(expected && item.market === 'DE' && item.brand === expected.brand &&
    item.models?.length === 1 && item.models[0] === expected.model && item.source_url === expected.source);
}
export function availability(item, now = new Date()) {
  if (!approvedIdentity(item)) return {active:false,label:'Modell oder Markt nicht bestätigt'};
  const state = sourceState(item, now);
  return {active:state.active,label:state.active ? 'Herstellerzuordnung geprüft' :
    item.status === 'conflict' ? 'Quelle geändert – Zuordnung erneut prüfen' :
    item.status !== 'verified' ? 'Quellenprüfung derzeit nicht verfügbar' : 'Quellenprüfung nicht aktuell – erneut prüfen'};
}
export function affiliateSearchDE(item, now = new Date()) {
  if (!availability(item, now).active) return null;
  const url = new URL('https://www.amazon.de/s');
  url.searchParams.set('k', [item.brand,item.name,item.variant,item.models[0],item.part_number].filter(Boolean).join(' '));
  url.searchParams.set('tag','getecoback-21');
  return url.href;
}
export function calendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
export function localToday(now = new Date()) {
  return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}
export function validCare(care, today = localToday()) {
  return Boolean(care && Object.hasOwn(ACTIONS,care.action) && calendarDate(care.date) && care.date >= '1900-01-01' && care.date <= today);
}
export function readSaved(raw, today = localToday()) {
  const result = {};
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || data?.market !== 'DE' || !data.entries || typeof data.entries !== 'object') return result;
    for (const id of Object.keys(IDENTITIES)) {
      const entry = data.entries[id];
      if (!entry || entry.saved !== true) continue;
      result[id] = {saved:true,care:validCare(entry.care,today) ? {action:entry.care.action,date:entry.care.date} : null};
    }
  } catch {}
  return result;
}
export function serializeSaved(entries) {
  return JSON.stringify({version:1,market:'DE',entries:readSaved(JSON.stringify({version:1,market:'DE',entries}))});
}
