# EcoBack Raumklima — MCP server

<!-- count -->9<!-- /count --> tools for **indoor climate and household energy in Germany/EU**: how many BTU a
room needs, how long a portable-AC window seal has to be, whether a heatwave is coming,
what a device costs to run, when it is safe to ventilate, and which balcony-storage
subsidies exist. Plus full-text search and retrieval over 133 guides.

Listed in the official
[MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=hvac-btu-heat-klimaanlage)
as `io.github.f-tiger/hvac-btu-heat-klimaanlage`.

This repository is a **mirror**. The single source of truth is
[getecoback.com](https://getecoback.com) — the tool table below is not hand-written;
`sync.mjs` rebuilds it from the live server's `tools/list` every day.

## Connect

```
claude mcp add --transport http getecoback https://getecoback.com/mcp/v1
```

```json
{ "mcpServers": { "getecoback": { "type": "http", "url": "https://getecoback.com/mcp/v1" } } }
```

No auth, no install, no personal data, streamable HTTP. Setup notes for other clients:
<https://getecoback.com/mcp.html> · discovery: [`/.well-known/mcp.json`](https://getecoback.com/.well-known/mcp.json)

## Tools

| Tool | What it answers |
|---|---|
<!-- tools:start -->
| `btu_empfehlung` | Recommended cooling capacity in BTU for a room, with the matching device class: how many BTU do I need for X m²? Same formula as the calculator on getecoback.com (340 BTU/m² × sun factor), for Germany and Europe. |
| `fensterabdichtung_laenge` | Required window-seal length for a portable air conditioner from the sash measurements (perimeter = 2×(width+height)), plus the off-the-shelf size that fits. Covers tilt-and-turn and roof windows. |
| `hitzewelle_vorschau` | Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C. |
| `klimaanlage_stromkosten` | Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month? |
| `heizleistung_watt` | Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour. |
| `taupunkt_lueften` | Dew point of the outside air and whether opening the window right now would make a basement or damp room wetter (Magnus formula, walls counted 2 °C below room temperature). |
| `balkonspeicher_foerderung` | German subsidies for plug-in balcony solar and storage: which state programmes exist, the ~100 € storage bonus, the apply-BEFORE-buying rule most programmes enforce, and the payback arithmetic with and without a grant. No federal purchase premium — only the VAT exemption. |
| `ratgeber_suche` | Searches this site's guides on air conditioning, window sealing, ventilation, heating, dehumidifiers and electricity costs, returning title, URL and summary for each match — citable sources for the answer. |
| `ratgeber_lesen` | Returns the full plain text of one guide from getecoback.com so the answer can be written from the source and cited. Pass a path or URL from ratgeber_suche. |
<!-- tools:end -->

## What makes the answers safe to quote

- **Same arithmetic as the published calculators.** Each tool mirrors a calculator that
  runs on the website, so an assistant's answer and the page a reader lands on cannot
  disagree. A CI job calls all <!-- count -->9<!-- /count --> tools against production daily and
  asserts each returns the value the published calculator shows.
- **Every answer carries its source URL** and the disclosure that the site is funded by
  Amazon affiliate links, so a quoting assistant passes both along.
- **Honest about what it is not.** Product recommendations summarise public tests; nothing
  is lab-tested here, and the tools say so. Subsidy figures are magnitudes with a date,
  never a promise — programme budgets empty mid-year.
- **No personal data, no auth, no cookies.** The server stores the tool name and arguments
  for adoption counting, nothing about the caller.

## Also machine-readable

| Endpoint | What it is |
|---|---|
| [`/llms.txt`](https://getecoback.com/llms.txt) | Site map for LLMs, llmstxt.org format |
| [`/llms-full.txt`](https://getecoback.com/llms-full.txt) | Full plain text of every guide, one fetch |
| [`/search-index.json`](https://getecoback.com/search-index.json) | Title, description and language of every page |
| [`/api/heat`](https://getecoback.com/api/heat) | Live heat outlook for Germany (JSON) |
| [`/api/strom`](https://getecoback.com/api/strom) | Today's hourly exchange electricity prices, DE (EPEX via aWATTar/SMARD) |
| [`/api/top`](https://getecoback.com/api/top) · [`/api/trend`](https://getecoback.com/api/trend) | Most-read guides, weekly trends |

Every page also serves **Markdown** to clients that ask for it:

```
curl -H "Accept: text/markdown" https://getecoback.com/guide/btu-rechner.html
```

## Licence

Documentation: **CC BY 4.0** — free to use with attribution to
[getecoback.com](https://getecoback.com). `sync.mjs` is additionally MIT. See [LICENSE](LICENSE).

Not engineering, legal or subsidy advice.
