import { getRateEntry } from "./rateSnapshot.js";
import type { RateEntry, RateSnapshot } from "./rateSnapshot.js";

// Fill currencies missing from `primary` using `fallback`, pricing each into
// the primary base through a currency both snapshots can price (the bridge).
// Only missing currencies are added; existing primary rates are never changed.
export function crossFillSnapshot(
  primary: RateSnapshot,
  fallback: RateSnapshot,
  neededCurrencyCodes: readonly string[]
): RateSnapshot {
  const additions: Record<string, RateEntry> = {};

  for (const currencyCode of neededCurrencyCodes) {
    if (getRateEntry(primary, currencyCode) !== null) {
      continue;
    }

    const inFallback = getRateEntry(fallback, currencyCode);

    if (inFallback === null) {
      continue;
    }

    const bridge = findBridgeCurrency(primary, fallback, currencyCode);

    if (bridge === null) {
      continue;
    }

    const bridgeInFallback = getRateEntry(fallback, bridge);
    const bridgeInPrimary = getRateEntry(primary, bridge);

    if (bridgeInFallback === null || bridgeInPrimary === null) {
      continue;
    }

    // value of one unit in primary base = (unit priced in bridge) * (bridge priced in base)
    const valueInBase = (unit(inFallback) / unit(bridgeInFallback)) * unit(bridgeInPrimary);

    if (Number.isFinite(valueInBase) && valueInBase > 0) {
      additions[currencyCode] = { nominal: 1, valueInBase };
    }
  }

  if (Object.keys(additions).length === 0) {
    return primary;
  }

  return {
    ...primary,
    ratesToBase: { ...primary.ratesToBase, ...additions }
  };
}

function findBridgeCurrency(primary: RateSnapshot, fallback: RateSnapshot, exclude: string): string | null {
  const candidates = [primary.baseCurrency, fallback.baseCurrency, ...Object.keys(primary.ratesToBase)];

  for (const candidate of candidates) {
    if (candidate === exclude) {
      continue;
    }

    if (getRateEntry(primary, candidate) !== null && getRateEntry(fallback, candidate) !== null) {
      return candidate;
    }
  }

  return null;
}

function unit(entry: RateEntry): number {
  return entry.valueInBase / entry.nominal;
}
