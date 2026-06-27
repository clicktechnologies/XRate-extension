# 0001 Use Bank of Russia exchange rates

## Decision

Use the Bank of Russia daily XML endpoint as the first official exchange-rate source for XRate:

- Source name: Bank of Russia
- Source URL: https://www.cbr.ru/scripts/XML_daily.asp
- Cache TTL: 4 hours in `chrome.storage.session`

The extension converts through RUB because the source publishes official RUB-based rates with per-currency nominal values.

## Alternatives Considered

1. European Central Bank euro foreign exchange reference rates.
   - Official and internationally recognizable.
   - Rejected for the first implementation because it does not cover RUB in the reference-rate table, while the expected initial audience and source examples include Russian-language UI and KRW/USD/RUB-oriented usage.

2. ExchangeRate.host, Frankfurter, or similar aggregator APIs.
   - Convenient JSON APIs.
   - Rejected because the requirement asks for an official source where possible.

3. Browser-side hardcoded rates.
   - Simplest technically.
   - Rejected because rates would be stale and the extension must show where rates were downloaded from and when.

## Sources

- Bank of Russia XML developer page: https://www.cbr.ru/development/sxml/
- Bank of Russia daily XML endpoint: https://www.cbr.ru/scripts/XML_daily.asp
- Chrome storage API: https://developer.chrome.com/docs/extensions/reference/api/storage
- Chrome extension service worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

## Consequences

- The extension can convert common currencies covered by the Bank of Russia, including USD, EUR, GBP, CNY, JPY, KRW, KZT, and TRY.
- Values are informational and depend on the Bank of Russia publication schedule.
- The `Value / Nominal` rule must be preserved for currencies such as KRW, where one published row represents 1000 units.
- `chrome.storage.session` matches the requirement for in-memory extension cache and survives MV3 service worker restarts during the same browser session.

## Revisit When

- Firefox or Safari support is added and storage/runtime APIs are abstracted.
- A non-RUB base currency becomes a core requirement.
- Users need currencies not published by the Bank of Russia.
- The product needs a second official provider as fallback.
