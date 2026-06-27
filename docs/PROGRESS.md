# Progress

## 2026-06-27

### Changed

- Created a Chrome Manifest V3 extension scaffold for XRate.
- Added content-script selection tracking and a shadow-DOM tooltip for supported currency amounts.
- Added a service worker that fetches official Bank of Russia exchange rates, caches them for 4 hours in `chrome.storage.session`, and returns conversions to configured currencies.
- Added popup settings for enabled state, target currencies, rate source, rate date, fetched time, and manual refresh.
- Added TypeScript domain, application, infrastructure, content, popup, and background modules.
- Added Node test coverage for parsing, XML ingestion, conversion, and rate freshness.
- Added parsing for Russian ruble word forms such as `80 рублей` and Turkish lira alias `678 TL`.
- Added broader target-currency coverage for international use, including AUD, CAD, CHF, SGD, HKD, NZD, AED, INR, BRL, PLN, SEK, NOK, DKK, THB, and ZAR.
- Added safe parser aliases for selected international forms such as `zł`, `₹`, `฿`, `yuan`, `yen`, `won`, `baht`, and `rand`.

### Decisions

- Rates come from the Bank of Russia XML endpoint for the first implementation.
- Conversion is computed through RUB using `Value / Nominal` from the source XML.
- Settings are stored in `chrome.storage.sync`; rate snapshots are stored in `chrome.storage.session`.
- Build uses TypeScript plus esbuild bundling to satisfy Manifest V3 content-script and popup constraints.

### Risks Addressed

- The XML source is parsed with a dedicated XML parser instead of ad hoc string parsing.
- Page-selected text is rendered with `textContent`, not HTML injection.
- MV3 service worker volatility is handled by extension storage instead of globals.
- Ambiguous long text selections are ignored instead of guessed.
- Currency symbols and number separators are intentionally limited instead of guessed globally.
- Rate timestamps are stored as ISO instants and displayed with the user's browser locale.

### Diffstat Summary

- Added 29 project files outside generated directories.
- Generated extension bundle in `dist/`: 278190 bytes total.

### Falsehood Audit

- Source index: https://github.com/kdeldycke/awesome-falsehood
- Prices and currencies: https://gist.github.com/rgs/6509585
- Dates and time: http://infiniteundo.com/post/25326999628/falsehoods-programmers-believe-about-time
- Plain text and Unicode: https://jeremyhussell.blogspot.com/2017/11/falsehoods-programmers-believe-about.html

Findings:

- Currency amounts are not treated as accounting records. XRate computes informational tooltip conversions and shows the rate source/date.
- `$` is explicitly treated as USD in this first version; other dollar/peso contexts are not inferred.
- Currency symbols may appear before or after the amount for supported examples.
- KRW and JPY are not assumed to have cent-style subdivisions; formatting is delegated to `Intl.NumberFormat`.
- Common dot/comma/space separators are supported, including non-breaking spaces, but non-triplet grouping systems are outside this MVP.
- Cache freshness uses ISO timestamps and a fixed 4-hour TTL; changing the system clock can affect perceived freshness.
- Text rendering uses `textContent`, and parser matching is limited to known currency symbols/codes rather than arbitrary Unicode lookalikes.

### Commands

- Passed: `npm install`
- Passed: `npm run typecheck`
- Passed: `npm run lint`
- Passed: `npm test`
- Passed: `npm run test:coverage`
- Passed: `npm run build`
- Passed: `npm audit --omit=optional`
