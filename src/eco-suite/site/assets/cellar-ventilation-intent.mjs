// Both German search surfaces pass normalized lowercase query text with ae/oe/ue.
export function asksForCellarVentilationCheck(query) {
  if (!/\bkeller(?:s|raum|raeume[n]?|luft|wand|waende|fenster|lueftung)?\b/.test(query)) return false;
  // Duration, diagnosis, air quality and appliance selection need their own answers.
  if (/\bco[₂2](?![\p{L}\p{N}_])/u.test(query)) return false;
  if (/\b(?:wie\s+(?:oft|lange?)|dauer|zeitplan[a-z]*|zeitabschnitt[a-z]*|messintervall[a-z]*|heizkost[a-z]*|stromkost[a-z]*|radon[a-z]*|abgas[a-z]*|geruch[a-z]*|luftqualitaet|frischluftversorgung|(?:ver)?schimmel[a-z]*|wassereintritt|gutachter|luftentfeuchter|entfeuchter|kellerentfeuchter)\b/.test(query)) return false;
  const openWindow = /\b(?:keller)?fenster\s+(?:jetzt\s+)?(?:auf(?:machen)?|oeffnen)\b/.test(query);
  const air = openWindow || /\b(?:lueft(?:en|e|et|ung)|auslueften|durchlueften)\b/.test(query);
  if (!air) return false;
  const decision = openWindow || /\b(?:soll(?:en|te[n]?)?|darf|duerfen|kann|koennen|jetzt|lohnt|sinnvoll|trockener|feuchter|trockn[a-z]*)\b/.test(query);
  const outdoorReading = /\b(?:draussen|aussen(?:luft|feuchte|temperatur)?|im\s+freien)\b/.test(query) &&
    /\d\s*(?:%|°|grad\b|prozent\b)/.test(query);
  return decision || outdoorReading;
}
