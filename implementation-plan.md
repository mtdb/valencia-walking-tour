# Valencia development foundation

## Implemented state · 7 October 2026

The static Spanish guide is implemented with seven chapters, photographs from Wikimedia Commons, with author and licence beside each image, optional-interior budgeting, navigation, persisted progress, glossary, GPX references and an isolated offline PWA shell. `src/weather.js` adds hourly forecasts for today and six following days in Valencia time; [weather-ux.md](weather-ux.md) records placement and behavior.

The user chose a date-agnostic site and waived exact distance measurements. Neither a travel date nor a measured pedestrian track blocks the website. Times remain planning estimates; venue schedules include closure/free-entry conditions and links rather than assuming a Friday or Saturday visit. The GPX is explicitly reference waypoints.

The sections below preserve the initial brief. The final implementation uses referenced Commons photographs, cached on viewing; direct downloads remain unavailable in this environment and packages assets with `tools/build.mjs`; no runtime dependencies are required. Local validation passed integrity, 14 unit tests and Chromium checks for responsive widths, persistence, weather failures/retry and offline subpath use. Live provider connectivity and publication remain external verification/release steps; see [README.md](README.md).

## Product direction

Create a mobile self-guided walking page that explains what to visit, what to look at, and how to get to the next place. Use the neighboring projects' editorial experience and static architecture. Initial visitor-facing language: Spanish, pending a different audience choice.

The proposed route is now documented in [route.md](route.md): a Ciutat Vella circuit from plaza del Mercado through Catedral, Serranos, and the Carmen, returning to the same plaza. [The adversarial review](route-review.md) records historical and practical improvements. Establish measured distance and duration only after resolving pedestrian connections and visit assumptions. Keep any additional areas or longer excursions separate until their effect on the route is understood.

## Initial scope

- Hero with route summary, start point, estimated distance/time, and start action.
- Brief city introduction and ordered stops with local photography, short context, a visible detail, curiosity, practical notes, and sources.
- Visited progress saved on the device, current-stop indicator, and map-provider settings.
- Open a location, navigate to the next destination, copy its coordinates, and finish/return behavior appropriate to the chosen route.
- Download ordered GPX waypoints, clearly labeled as waypoints.
- Accessible glossary where it solves an actual reading problem.
- Installable static PWA with an offline shell and a defined policy for essential photos.

Audio and optional stops are extensions. Introduce them when the editorial content and route justify them. Accounts, reservations, and a map backend are outside the proposed initial scope.

## Proposed file structure

This is the intended implementation layout, not a list of files already generated.

```text
index.html
styles.css
src/
  app.js                  # UI, dialogs, progress, observer, event handling
  tour-data.js            # ROUTE, STOPS, ROUTE_ORDER, GLOSSARY
  navigation.js           # Destination resolution, map URLs, coordinate copy
  gpx.js                  # XML-safe ordered waypoint export
manifest.webmanifest
sw.js
icons/compass.svg
images/*.webp
IMAGE_CREDITS.md
tour.md
project-patterns.md
implementation-plan.md
README.md
package.json
tools/check-tour.mjs      # Content, route, and local asset integrity
.github/workflows/pages.yml
.gitignore
.nojekyll
```

No build step or runtime package is needed. Use relative paths throughout the page, imports, manifest, and worker so deployment under `/valencia-walking-tour/` works. Keep the first module split small; create additional abstractions only when they clarify real behavior.

## Content contract

Keep stop identity stable across changes in route order. Display numbering comes from the currently visible ordered list, never from the ID. Stop IDs and slugs must be unique.

| Entity | Required information | Optional information |
| --- | --- | --- |
| `ROUTE` | Name, language, ordered stop IDs, start/end destinations, completion behavior | Verified estimates, practical source, review date |
| Stop identity | Stable ID, slug, name, short name, subtitle | Color tone |
| Location | Latitude/longitude of a usable pedestrian meeting/viewing point | Access notes |
| Editorial content | Description, curiosity, concrete observation, source references | Timeline, glossary terms |
| Practical content | Exterior/interior distinction and duration assumptions | Price, hours, access constraints, practical source and review date |
| Image | Local path, alt text, real width/height, author/source/license record | Visible caption |
| Audio | Nothing in the initial release | Explicit file path, transcript, language, duration |

Use `null` or an explicit draft status for unverified draft values. Draft stops must fail release validation rather than silently becoming visitor-facing facts. Review dates record actual research, not the day the object was created.

Store transition/walking time separately from visit duration; the references' “next stop duration” is a visit estimate and should not be presented as the time to walk there. Keep historical evidence distinct from practical information that may change.

## State and navigation

Use `valencia-tour:` as the local-storage prefix. Guard reads and writes, validate the provider against supported choices, and validate visited IDs against the available stops. Never persist displayed position as stop identity.

Resolve the destination once for each action: the selected stop for “open location,” the following visible stop for “next,” and the configured end/return destination for completion. Feed that same destination to map links and coordinate copy. Opening settings must not trigger navigation or copy an arbitrary point.

Represent all destinations, including start/end points, with the same `coordinates: { lat, lng }` shape. Avignon's separate parking shape is incompatible with its map helpers and must not be inherited.

Prefer navigation from the visitor's current position in the external map application. Test Google Maps and OsmAnd on intended devices; platform-specific app links need a usable fallback. Define final-stop behavior from the actual itinerary rather than inheriting another city's parking.

## Offline and release policy

Use a Valencia-only cache prefix, such as `valencia-tour-`, and delete only older caches in that namespace. Match responses against the active named cache. Precache the small required shell; handle optional photos/audio separately so a missing media file cannot prevent the guide from installing.

Choose and document how essential photos become available offline, with download completion/failure feedback if caching is opt-in. Do not claim complete offline availability until that policy is implemented and verified. External navigation and external source pages still depend on their own applications/connectivity.

Version releases deliberately. Verify both a fresh installation and an upgrade from a previously cached version. Manifest scope and service-worker registration must stay within the Valencia project path.

Follow the existing GitHub Pages pattern if that hosting choice is retained. Run syntax and integrity checks before uploading the deployment artifact. Publishing and repository setup belong to the implementation/release stage.

## Implementation sequence

1. Complete the route brief in `tour.md`: audience, area, start/end, walking budget, interiors, and route shape.
2. Research the selected stops using official tourism, municipal, and venue sources; verify coordinates and walkable connections. Record source URLs and actual review dates.
3. Prepare the data module and validator. Reject duplicate IDs/slugs, unknown route IDs, invalid coordinates, missing required sources, and nonexistent local assets.
4. Adapt Avignon's page/layout conventions, with Valencia-specific content and photographs. Create media attribution records as assets are acquired.
5. Implement navigation and ordered GPX export, then progress, dialogs, and glossary. Update visited state in place and manage a single observer lifecycle.
6. Implement the manifest and isolated worker caches. Verify offline behavior and cache upgrades.
7. Perform mobile/browser validation and add the checked deployment workflow. Add audio/optional stops only after the base route works.

## Acceptance criteria

- Every visible stop, next action, finish action, and GPX waypoint agrees with one route order.
- No unverified coordinates, schedules, prices, dates, or invented travel estimates appear as confirmed facts.
- Core reading and navigation work at 320–390 px and desktop widths without horizontal overflow.
- Keyboard users can open/close dialogs, return focus, mark stops, and use all actions; imagery has appropriate alt text and credits.
- Reduced-motion preference applies to explicit JavaScript scrolling as well as CSS effects.
- Progress and provider survive reload; blocked storage and malformed stored data do not prevent use.
- Copying from the provider chooser uses the same destination as the requested navigation action.
- Export parses as XML, escapes names/descriptions, and is accurately described as GPX waypoints.
- Offline shell/media behavior matches the stated policy; missing optional media does not break installation.
- A worker upgrade refreshes Valencia without deleting another guide's cache.
- Syntax and route/asset integrity checks run before deployment. Browser checks cover dialogs, reload, completion, offline use, and subpath hosting.
