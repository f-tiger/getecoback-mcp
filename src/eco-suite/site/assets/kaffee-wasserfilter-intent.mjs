// Match the documented German model, including the Philips or De’Longhi suffix.
const coffeeModels = [
  /\bep[ -]*2220\s*[/_-]\s*10\b(?!\s*[/_.-][a-z0-9])/,
  /\bep[ -]*2231\s*[/_-]\s*40\b(?!\s*[/_.-][a-z0-9])/,
  /\btie[ -]*20301\b(?![/_.-][a-z0-9]|\s*[/]\s*[a-z0-9])/,
  /\becam[ -]*22[ .-]*110[ .-]*b\b(?!\s*[/_.-][a-z0-9])/,
];

export function asksAboutCoffeeFilterMaintenance(query) {
  return /\b(?:orange|blink\w*|leucht\w*|filteranzeige\w*|anzeigelicht\w*|reset\w*|zuruecksetz\w*|aktivier\w*|entlueft\w*|entkalk\w*|stillstand\w*|nichtgebrauch|lager\w*|reinig\w*|durchfluss\w*|wechselintervall\w*)\b/.test(query) ||
    /\b(?:wie\s+(?:oft|lange|wechsel\w*|tausch\w*)|\d+\s*(?:tage|wochen|monate)\b|drei\s+wochen|setz\w*(?:\s+\w+){0,7}\s+zurueck)\b/.test(query);
}

export function asksForCoffeeWaterFilterMatch(query) {
  const subject = query.replace(/\bnicht\b[^,.;?:]{0,120},?\s*\bsondern\b/g, '');
  if (coffeeModels.filter(model => model.test(subject)).length !== 1 ||
      /\b(?:luftreiniger\w*|ersatzluftfilter\w*|verdunsterfilter\w*|spuelmaschine\w*)\b/.test(query) ||
      asksAboutCoffeeFilterMaintenance(query)) return false;
  const exactPart = /\b(?:aqua[ -]?clean|intenza|tcz[ -]*(?:7003|7033)|dlsc[ -]*002|ca[ -]*6903(?:\s*[/_-]\s*10)?)\b/.test(query);
  const waterFilter = /\b(?:wasser[ -]?filter\w*|ersatz[ -]?filter\w*|filter[ -]?patrone\w*|patrone\w*)\b/.test(query);
  const filterChoice = /\bfilter\w*\b/.test(query) && /\b(?:welch\w*|pass\w*|kompat\w*|kauf\w*|bestell\w*|ersatz\w*|kennung\w*|nummer\w*|wassertank\w*)\b/.test(query);
  return exactPart || waterFilter || filterChoice;
}
