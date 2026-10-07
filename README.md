# Valencia Walking Tour

A Spanish-language walking guide to Valencia's historic centre. The circular route starts at Plaza del Mercado, visits the Lonja, Plaza Redonda, Cathedral, Almoina, Torres de Serranos and El Carmen, and returns to the starting square.

The site uses plain HTML, CSS and JavaScript, with no runtime dependencies.

## Features

- Seven stops with historical context, things to notice, directions and official sources.
- Opening hours, accessibility notes and optional visits with an estimated admission budget.
- Hourly weather for today and the next six days, using Valencia's local time.
- Photographs with author credits and licence links.
- Saved visit progress and map preferences: Google Maps, OsmAnd or copied coordinates.
- GPX export containing 16 ordered reference points.
- Offline reading after the first complete load; photographs are cached as they are viewed.

Allow roughly three to four hours for the walk with a visit to the Lonja. Additional indoor visits take longer. Opening hours and admission prices are reference information: check each venue's official website before visiting. The GPX file contains waypoints, not a surveyed walking track.

## Local development

Use Node.js 24. The browser checks also require Chromium.

```sh
node tools/preview.mjs
```

Open [the local preview](http://127.0.0.1:4173/valencia-walking-tour/). The server supports both the repository subpath and the root path.

## Validation and build

```sh
node tools/check-tour.mjs
node --test tests/*.test.mjs
node tools/build.mjs
```

With the preview server running, check the browser experience:

```sh
node tools/browser-smoke.mjs
```

Browser checks cover desktop and mobile layouts, navigation, saved progress, budget selection, weather errors and retries, photo availability and offline reading. They write screenshots and a report to `captures/`. Weather fixtures are used only in tests and are excluded from the published site. External photo and weather connections require separate verification when network access is restricted.

The same commands are available through `pnpm run check`, `pnpm test`, `pnpm run build` and `pnpm run test:browser`. Generated output in `dist/` and `captures/` is ignored by Git.

## Content and maintenance

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, introductory copy and dialogs |
| `styles.css` | Layout and visual styles |
| `src/tour-data.js` | Stops, GPS references, glossary, admission prices and opening hours |
| `src/photos.js` | Photograph URLs, captions, authors and licences |
| `src/app.js` | Stop rendering, progress, budget and map controls |
| `src/weather.js` | Forecast requests, date selection and cached weather |
| `sw.js` | Offline caching for the site and selected photographs |
| [route.md](route.md) | Full itinerary and supporting sources |
| [IMAGE_CREDITS.md](IMAGE_CREDITS.md) | Photograph attribution and reuse licences |

Practical information was reviewed on 7 October 2026. Keep the route document and the displayed stop data consistent when updating the itinerary.

Weather comes from [Open-Meteo](https://open-meteo.com/en/docs), without an API key or device location access. Forecasts are reused for 30 minutes. If an update fails, a stored forecast remains available for up to 48 hours, provided it still covers today, and is labelled as saved data. Without usable data, the widget offers a retry and a link to AEMET. Review Open-Meteo's [terms](https://open-meteo.com/en/terms) before using its free service commercially.

Photographs are served from Wikimedia Commons. Their individual licences and original source pages are linked beside each image and in the credits. The service worker caches successful image responses from the selected URLs; missing photographs show an availability message while the guide remains readable.

When changing published files, increment the `CACHE` version in `sw.js`. Cache cleanup only removes older Valencia guide caches, so other sites on the same origin retain their data. New forecasts, uncached photographs and external navigation require an internet connection.

## GitHub Pages

The build creates `dist/`, containing only the files needed by the website. Relative paths support deployment at `/valencia-walking-tour/`.

The workflow in `.github/workflows/pages.yml` validates, tests and builds the site. Pushes to `main` deploy through GitHub Actions; pull requests run validation without deploying. Configure the repository's Pages source as **GitHub Actions**.

To add `git@github.com:mtdb/valencia-walking-tour.git`, push `main`, configure Pages and verify the deployment, run from a terminal with GitHub access:

```sh
bash tools/publish.sh
```

The helper requires Git, GitHub CLI, Node.js and curl. It checks authentication, adds the remote if missing, commits pending project changes, pushes without forcing, enables Pages, waits for the deployment and checks the published URL. An existing remote pointing elsewhere or an incompatible remote history stops publication for review.
