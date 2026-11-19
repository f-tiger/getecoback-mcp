// Decisions are deliberately limited to reviewed, exact model/valve categories.
export function decision(data, model, valve) {
  if (!data.models.some(x => x.id === model) || !['unknown', ...data.cases.map(x => x.id)].includes(valve)) {
    model = 'unknown'; valve = 'unknown';
  }
  if (model === 'tado-x') return {status:'unverified', title:'tado° X benötigt seine eigene Prüfung', detail:'Die Zuordnungen für V3+ gelten hier nicht. Prüfe die genaue X-Ausführung in der separaten Herstellerhilfe; aus dieser Auswahl folgt keine Adapterempfehlung.', source:'x'};
  if (model !== 'tado-v3') return {status:'unverified', title:'Gerätemodell zuerst klären', detail:'Noch keine passende Zuordnung. Hersteller, genaue Modellgeneration und Ventil müssen zusammen geprüft werden. Für andere Marken gilt deren eigene Freigabe; diese Tabelle ist kein Universaladapter-Ratgeber.', source:model === 'other' ? 'routine' : 'overview'};
  const row = data.cases.find(x => x.id === valve);
  if (!row) return {status:'unverified', title:'Ventil noch nicht identifiziert – noch keinen Adapter kaufen', detail:'Vergleiche Kennzeichnung und Abbildungen in der Herstellerliste. Bei unklarem Modell den Hersteller oder Fachbetrieb fragen. Ein Foto ähnlich aussehender Köpfe oder nur „M30“ belegt keine Passung.', source:'guide'};
  return {...row, detail:row.detail + (row.status === 'stop' ? '' : ' Diese Orientierung ersetzt keine Prüfung des tatsächlichen Ventils und der aktuellen Geräteunterlagen.')};
}

export function selectionFromHash(hash, data) {
  const match = /^#ventilcheck=([a-z0-9-]+):([a-z0-9-]+)$/.exec(hash);
  if (!match || !data.models.some(x => x.id === match[1]) || !['unknown', ...data.cases.map(x => x.id)].includes(match[2])) return null;
  return {model:match[1],valve:match[2]};
}

export function selectionLink(model, valve, data) {
  if (!selectionFromHash(`#ventilcheck=${model}:${valve}`, data)) return null;
  return `https://getecoback.com/guide/smarte-heizkoerperthermostate-lohnen-sich.html#ventilcheck=${model}:${valve}`;
}

const allowedSource = url => /^https:\/\/(?:support\.tado\.com|help\.tado\.com|cdn\.brandfolder\.io|www\.verbraucherzentrale\.de)\//.test(url);
if (typeof document !== 'undefined') for (const root of document.querySelectorAll('[data-valve-check]')) {
  const data = JSON.parse(root.querySelector('[data-valve-data]').textContent);
  const model = root.querySelector('[name=valve-model]'), valve = root.querySelector('[name=valve-connection]');
  const result = root.querySelector('[data-valve-result]'), status = root.querySelector('[data-valve-share-status]');
  const emit = name => {
    try { if (localStorage.getItem('fleet_ga4_choice_v1') === 'denied') return; } catch {}
    window.dispatchEvent(new CustomEvent('fleet:business', {detail:{name}}));
  };
  const render = () => {
    const value = decision(data, model.value, valve.value), title = document.createElement('h3'), detail = document.createElement('p');
    title.textContent = value.title; detail.textContent = value.detail;
    result.dataset.status = value.status; result.replaceChildren(title, detail);
    const source = data.sources[value.source];
    if (source && allowedSource(source.url)) {
      const line = document.createElement('p'), link = document.createElement('a');
      link.textContent = source.title; link.href = source.url; link.dataset.valveOfficial = ''; line.append(link); result.append(line);
    }
    status.textContent = '';
  };
  for (const select of [model, valve]) select.addEventListener('change', () => {render(); emit('eco_valve_result');});
  root.addEventListener('click', ev => {
    const link = ev.target.closest?.('a[data-valve-official]');
    if (link && root.contains(link) && allowedSource(link.href)) emit('eco_valve_official');
  });
  root.querySelector('[data-valve-share]').addEventListener('click', async () => {
    const url = selectionLink(model.value, valve.value, data); if (!url) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(url); status.textContent = 'Link kopiert. Er teilt den Prüfschritt, keine bestätigte Passung.'; emit('eco_valve_share');
    } catch {status.textContent = 'Automatisches Kopieren nicht verfügbar. Diesen Link auswählen und kopieren: ' + url;}
  });
  const applyHash = () => {
    const shared = selectionFromHash(window.location.hash, data);
    if (shared) {model.value = shared.model; valve.value = shared.valve; render(); root.scrollIntoView({block:'start'});}
  };
  root.querySelector('[data-valve-controls]').hidden = false;
  root.querySelector('[data-valve-share-row]').hidden = false;
  // Keep the reference readable without JS; reveal it on demand once the chooser works.
  root.querySelector('details').open = false;
  render(); applyHash(); window.addEventListener('hashchange', applyHash);
  root.dataset.ready = 'true';
}
