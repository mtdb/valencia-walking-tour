# Patterns in the neighboring projects

Inspected on 2026-10-07. This analysis describes local source files, not the deployed websites. All three `src/app.js` files passed `node --check`; browser behavior, links, offline operation, and accessibility were not tested in this review.

## Comparison

| Area | Alcalá | Madrid centro | Avignon | Valencia direction |
| --- | --- | --- | --- | --- |
| Runtime | Native HTML/CSS/JS | Same | Same | Preserve the dependency-free static approach |
| Content | `tour.md`, data inside `app.js` | `walking-tour.md`, plan, data inside `app.js` | Data inside `app.js`, audio scripts | Use `tour.md` as the editorial source and a separate JS data module |
| Route | Main stops plus optional visit | Explicit reordered circuit plus optional gallery | Explicit circuit and return to parking | One explicit route order and explicit start/end destinations |
| State | Visited, provider, optional stop | Visited, provider, optional gallery | Visited and provider | City-specific keys, validated values, guarded reads/writes |
| Photography | Local WebP | External Wikimedia image URLs | Local WebP | Local optimized photos with documented credits |
| Audio | No local audio-guide set | No local audio-guide set | Nine Spanish scripts and MP3s | Optional follow-up phase |
| Offline | Shell and local photos precached | Shell precached; external photos excluded by same-origin fetch filter | Shell, photos, and audio precached | Reliable shell first; controlled local-media downloads |
| Hosting | GitHub Pages workflow | GitHub Pages workflow | GitHub Pages workflow | Preserve static/subpath compatibility |
| Automated check | JS syntax only | JS syntax only | JS syntax only | Add meaningful route and asset integrity checks |

## Shared architecture

Each project contains `index.html`, `styles.css`, `src/app.js`, `manifest.webmanifest`, `sw.js`, `icons/compass.svg`, `IMAGE_CREDITS.md`, and a Pages workflow. Their package manifests declare ES modules and a `check` command, with no dependency declarations or bundler.

`index.html` supplies the semantic page shell: fixed navigation, hero, historical introduction, route introduction, dynamic stop container, footer, map-provider dialog, and glossary dialog. `app.js` contains content, HTML templates, route selection, persistence, navigation, GPX generation, observers, and event handlers.

References: [Alcalá package](../alcala-walking-tour/package.json), [Madrid shell](../madrid-centro-walking-tour/index.html), [Avignon shell](../avignon-walking-tour/index.html), [Avignon runtime](../avignon-walking-tour/src/app.js).

This makes each guide easy to host and copy, but puts editorial data and UI behavior into the same file. Valencia should retain the simple runtime while extracting content into `src/tour-data.js`. A shared cross-project package would add coordination that this initial project does not need.

## Visual and editorial conventions

- Warm paper backgrounds, dark ink, muted accents, serif headings, and sans-serif body text.
- A large photographic hero with route facts and a clear start action.
- A dark introduction with context, a short timeline, and source links.
- Numbered stop sections with alternating backgrounds, imagery, practical information, a curiosity, and a specific detail to look at.
- Two-column desktop layouts become vertical layouts around 720 px.
- A fixed header shows the current visible stop and the number of visited stops.

[Alcalá CSS](../alcala-walking-tour/styles.css) and [Madrid CSS](../madrid-centro-walking-tour/styles.css) are byte-for-byte identical in the inspected workspace. They declare Playfair Display/DM Sans with fallbacks; [Avignon CSS](../avignon-walking-tour/styles.css) uses Georgia and a system-oriented sans-serif stack. Font declarations alone do not establish that a font is actually downloaded.

Use Avignon's font approach to keep the initial shell independent of third-party font loading. Preserve the layout language and establish Valencia-specific colors, photographs, title, and narrative during design.

## Interaction conventions

All three guides use native dialogs, glossary terms, visited toggles with `aria-pressed`, saved map preferences, clipboard copying with a prompt fallback, and an `IntersectionObserver` to track the visible stop. Navigation opens Google Maps or OsmAnd instead of embedding a map. The current navigation helpers generally omit a Google Maps origin so the map application can use the visitor's location.

Alcalá/Madrid support an optional stop and recompute visible stops. Madrid has a separate `ROUTE_ORDER`, so stable stop IDs are distinct from displayed numbering. Avignon has explicit parking metadata and practical source/review-date fields. Reuse those concepts without assuming that a Valencia visitor arrives by car.

The downloaded GPX files contain **waypoints**, not a surveyed walking track. Avignon includes parking before and after the stops, but this still does not encode street-level walking geometry. Valencia must describe the export accurately; a continuous routed path requires additional geometry.

References: [Alcalá interactions](../alcala-walking-tour/src/app.js), [Madrid route and navigation](../madrid-centro-walking-tour/src/app.js), [Avignon navigation, return, and GPX](../avignon-walking-tour/src/app.js).

## Issues to resolve when adapting

| Finding in the inspected code | Consequence | Valencia requirement |
| --- | --- | --- |
| All service workers delete every cache whose name differs from their own | Guides on the same origin can delete each other's caches, even under different paths | Delete only obsolete caches with Valencia's own prefix; read from the active named cache |
| Cache-first shell files and manual cache names | Deployed content can remain stale without an update strategy | Define cache versioning and verify an actual version upgrade |
| `cache.addAll` includes every photo in Alcalá and every photo/MP3 in Avignon | One unavailable file can reject installation; audio increases initial download size | Keep required shell assets separate from optional media and surface download failures |
| Madrid photos are external and the worker ignores cross-origin requests | The project's service worker does not make those photos available offline | Serve Valencia's essential photos locally |
| Every render creates a new observer without disconnecting the previous one | Repeated toggles leave redundant observers | Reuse/disconnect the observer, and avoid rebuilding the page for a visited toggle |
| Visit toggles rerender the stop container, then explicitly scroll with smooth behavior | Focus can be lost; in Avignon an audio player can be replaced; explicit scrolling needs its own reduced-motion handling | Update the selected stop and progress in place; preserve focus and honor reduced motion in JS |
| Alcalá/Madrid write to storage without a catch; Avignon catches errors but does not validate parsed types | Storage errors or malformed values can break interactions | Validate arrays/provider values and gracefully handle unavailable storage |
| Avignon's provider-dialog copy action uses the triggering stop ID | Choosing copy while requesting the next destination can copy the current stop instead | Resolve one destination before invoking either maps or coordinate copy |
| Avignon parking uses top-level `lat`/`lng`, while its map helpers expect `coordinates.lat`/`lng` | Final-stop return navigation dereferences a missing `coordinates` object | Normalize start/end destinations to the same coordinate structure as stops |
| OsmAnd location links target Android package `net.osmand.plus` | The hard-coded intent assumes a particular platform/package despite the OsmAnd~ UI label | Use a web fallback and verify any platform-specific intent on the intended app |
| All projects check only JS syntax; Pages workflows do not run that check | Route mistakes, missing assets, and navigation regressions can reach deployment | Run integrity checks before upload and browser checks before release |

References: [Alcalá worker](../alcala-walking-tour/sw.js), [Madrid worker](../madrid-centro-walking-tour/sw.js), [Avignon worker](../avignon-walking-tour/sw.js), the runtime files linked above, and [Avignon deployment](../avignon-walking-tour/.github/workflows/pages.yml).

The existing `IMAGE_CREDITS.md` tables are useful editorial patterns: author, source page, license, and transformations. Preserve this provenance for every new photo. Existing city photographs and audio should not be copied into Valencia as placeholder content.
