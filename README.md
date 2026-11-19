# EcoBack Raumklima — MCP server

<!-- count -->10<!-- /count --> tools for **indoor climate and household energy in Germany/EU**: how many BTU a
room needs, how long a portable-AC window seal has to be, whether a heatwave is coming,
what a device costs to run, whether a dehumidifier can drain uphill and which moisture checks to make. The tools also search and retrieve published guides.

Listed in the official
[MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers/io.github.f-tiger%2Fhvac-btu-heat-klimaanlage/versions/latest)
as `io.github.f-tiger/hvac-btu-heat-klimaanlage`.

The tool table below is not hand-written: `sync.mjs` rebuilds it from the live server's
`tools/list` every day.

## Connect

**Hosted endpoint** (no package installation or account required):

```
claude mcp add --transport http getecoback https://getecoback.com/mcp/v1
```

```json
{ "mcpServers": { "getecoback": { "type": "http", "url": "https://getecoback.com/mcp/v1" } } }
```

**Or run it yourself** — `src/` is the server, over stdio, with **zero dependencies**:

```
npx github:f-tiger/getecoback-mcp
```

```json
{ "mcpServers": { "getecoback": { "command": "npx", "args": ["-y", "github:f-tiger/getecoback-mcp"] } } }
```

Setup notes for other clients: <https://getecoback.com/mcp.html> ·
discovery: [`/.well-known/mcp.json`](https://getecoback.com/.well-known/mcp.json)

The two versions are kept honest by a **parity test**: `npm test` calls every deterministic
tool both locally and on the hosted endpoint and fails if a single character differs. It
runs on every push and daily — this code is a port of logic that runs in a Cloudflare
Worker, and ports drift silently.

## Tools

| Tool | What it answers |
|---|---|
<!-- tools:start -->
| `entfeuchter_ablaufcheck` | Check a German basement dehumidifier’s hose route, pump or tank options and cite evidence for the exact model. |
| `geraet_wahl` | Choose a next step for heat, damp/mould, cold or stale air. For damp rooms, measure first, investigate damage and compare cold-room or laundry conditions before buying; floor area alone cannot size a dehumidifier. Same decision rules as the website. |
| `btu_empfehlung` | Recommended cooling capacity in BTU for a room, with the matching device class: how many BTU do I need for X m²? Same formula as the calculator on getecoback.com (340 BTU/m² × sun factor), for Germany and Europe. |
| `fensterabdichtung_laenge` | Required window-seal length for a portable air conditioner from the sash measurements (perimeter = 2×(width+height)), plus the off-the-shelf size that fits. Covers tilt-and-turn and roof windows. |
| `hitzewelle_vorschau` | Live heatwave outlook for Germany: highest temperature over the next three days across Berlin, Frankfurt and Munich (open-meteo), flagged from 28 °C and 32 °C. |
| `klimaanlage_stromkosten` | Running cost of an air conditioner or any appliance: watts × hours × electricity price × compressor duty cycle. What does it cost to run per hour, per day, per month? |
| `heizleistung_watt` | Required heating power in watts for a room, from floor area and insulation standard (60/80/100 W/m² for new build, existing, old building), including running cost per full-load hour. |
| `taupunkt_lueften` | Dew point of the outside air and whether opening the window right now would make a basement or damp room wetter (Magnus formula, walls counted 2 °C below room temperature). |
| `ratgeber_suche` | Searches published guides with a readable Markdown mirror, returning title, canonical URL and task-specific summary. Every result can be passed to ratgeber_lesen. |
| `ratgeber_lesen` | Reads the cleaned Markdown of a published guide, with reviewed source links, assumptions and limits. Long excerpts are explicitly marked and link the full text. Pass an exact canonical path or URL from ratgeber_suche, without query or fragment. |
<!-- tools:end -->

## Can a MeacoDry Arete One 20L drain uphill into a sink?

A gravity hose requires a continuous drop. Meaco lists a separate pump for this model. Check the German package contents and the permitted lift before buying, or empty the tank. [German drainage decision and model sources](https://getecoback.com/guide/luftentfeuchter-keller.html#ablauf-vor-kauf).

```json
{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"entfeuchter_ablaufcheck","arguments":{"drain":"level_or_uphill","model":"meaco-one-20"}}}
```

## What makes the answers safe to quote

- **Same arithmetic as the published calculators.** Each tool mirrors a calculator that
  runs on the website, so an assistant's answer and the page a reader lands on cannot
  disagree. A CI job calls all <!-- count -->10<!-- /count --> tools against production daily and
  asserts each returns the value the published calculator shows.
- **Every answer carries its source URL** and the disclosure that the site is funded by
  Amazon affiliate links, so a quoting assistant passes both along.
- **Honest about what it is not.** Product recommendations summarise public tests; nothing
  is lab-tested here. Each source identifies the model and purchase conditions it covers.
- **Hosted privacy.** The drainage and moisture decisions store a fixed result code rather than household inputs. Other tools retain bounded parameters and limited client metadata. See the [privacy notice](https://getecoback.com/datenschutz.html). The stdio drainage calculation runs locally.

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

## Hosted and local versions

The hosted Registry entry is version 1.4.0. The local stdio package is version 1.2.0.
The drainage rules and reviewed German-market model sources come from
[`sites/getecoback`](https://github.com/f-tiger/agi-site/tree/main/sites/getecoback).
The parity tests compare deterministic results with the hosted server, including
downhill drainage, separate pump accessories and missing measurements.
