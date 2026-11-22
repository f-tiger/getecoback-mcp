const section = 'philips-verdunsterfilter';

// Receives normalized German text. A filter number alone cannot identify a device.
export function philipsHumidifierFilterSection(query) {
  const part = /\bfy\s*(?:2401|3446)\b/.test(query);
  const filters = /\b(?:[a-z]*filter(?:s|n|matte|nummer)?|verdunstermatte)\b/.test(query);
  if (!part && !filters) return null;
  if (/\b(?:wasch\w*|reinig\w*|wechselintervall|schimmel\w*|wie\s+(?:oft|lange))\b/.test(query) &&
      !/\b(?:passt|passen|passend|kompatibel|statt|ersatz(?:filter)?)\b/.test(query)) return null;
  const devices = [...new Set(Array.from(query.matchAll(/\bhu\s*(\d{4})(?:\s*\/\s*(\d{2})(?![\w/-]))?(?![a-z0-9])/g),
    ([, base, suffix]) => base + (suffix ? '-' + suffix : '')))];
  const knownBase = devices.some(device => /^(4803|2716)(?:-|$)/.test(device));
  const humidifier = /\bphilips\b/.test(query) &&
    /\b(?:luftbefeuchter|verdunster|serie[s]?\s*2000|2000er serie)\b/.test(query) &&
    !/\b(?:luftreiniger|ac\s*\d{4})\b/.test(query);
  if (!part && !knownBase && !humidifier) return null;
  if (/\b(?:beurer|levoit|stadler|xiaomi|dyson|rowenta|venta|bosch|miele|samsung)\b/.test(query)) return null;
  if (/\bhu\s*\d{4}\s*\/\s*\d{2}\s+(?:plus|max|ultra|premium)\b/.test(query) ||
      /\b(?:nicht|kein[a-z]*|ohne)\s+(?:den\s+|das\s+)?(?:philips\s+)?hu\s*\d{4}\b/.test(query)) return section;
  if (devices.length === 1 && ['4803-01', '2716-10'].includes(devices[0])) {
    return 'philips-hu' + devices[0];
  }
  return section;
}
