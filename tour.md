# Valencia editorial brief

Status: the Spanish guide is implemented in `src/tour-data.js`, based on [route.md](route.md) and [route-review.md](route-review.md). The worksheet below preserves the initial brief. Entrance addresses have documentary sources; coordinates are references and the export is not a measured walking trace.

## Accepted product decisions · 7 October 2026

- First-time visitors on mobile; Ciutat Vella, starting and ending outside the Mercado.
- No fixed travel date, weekday or exact distance requirement. Base time is an orientative 3–4 hours; optional interiors add time and cost.
- Mercado and Lonja form the proposed base; the visitor can deselect Lonja and choose other interiors with visible price/free-entry conditions.
- Seven finished chapters, sources, visible details, practical notes and glossary; original local illustrations. Audio remains a later enhancement.
- Hourly weather for today and six following days, using Valencia time, before the route. See [weather-ux.md](weather-ux.md).

## Decisions before route research

| Decision | Working assumption or question |
| --- | --- |
| Language | Spanish, following the neighboring projects; confirm the intended audience before writing |
| Audience | First-time visitors using a phone while walking |
| Area | Proposed: Ciutat Vella, Mercado–Catedral–Serranos–Carmen |
| Time | Choose a walking/visit budget, with interior visits counted separately |
| Arrival | Proposed: exterior plaza del Mercado; arrival transport still to choose |
| Finish | Circular return to the same plaza del Mercado |
| Pace/access | Establish relevant mobility constraints and acceptable walking distances |
| Paid visits | Decide which interiors are optional and what the exterior route covers |
| Audio | Deferred until the route and text are ready |

## Route worksheet

Add rows only after selecting candidate stops. Keep stable stop IDs separate from their displayed order.

| Order | Stable ID / slug | Stop | Pedestrian viewing point | Next connection | Visit time | Walking time to next | Evidence/status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Record overall distance and time as estimates with their method and assumptions. Check how the start/end connect to arrival/departure and whether any interior visit introduces timing constraints.

## Per-stop writing template

- **ID / slug / name / short name:**
- **Subtitle:** a reason to stop here.
- **Coordinates:** the actual pedestrian point to stand, with verification source.
- **Description:** brief, useful context for someone at the location.
- **Look at this:** one concrete visible feature and how to find it.
- **Curiosity:** a sourced observation; identify legends as legends.
- **Timeline:** a few relevant events with supporting evidence, where useful.
- **Visit duration:** distinguish exterior viewing and an optional interior visit.
- **Next connection:** walking directions or landmarks, with a separately researched travel estimate.
- **Practical information:** hours, cost, entry/access constraints, fallback if closed.
- **Historical sources:** exact source pages supporting the text.
- **Practical sources / last verified:** exact pages and actual review date.
- **Photo:** local filename, alt text, real dimensions, author, source page, license, transformations.
- **Optional glossary:** terms whose definitions help the reader.
- **Optional audio:** explicit filename and transcript after the text is finalized.
- **Research status:** draft / researched / ready for release.

## Page-level writing

Prepare a title and short promise, introductory historical context, route facts, a clear start instruction, a finish instruction, and an explanation of optional interiors. The total stop count and route export must come from the implementation's ordered data rather than separately maintained numbers.

The visitor chooses interiors in the page. Future maintenance consists of checking practical sources as conditions change; pedestrian measurements and audio are possible enhancements rather than prerequisites for the implemented guide.
