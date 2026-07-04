import { isKnownCurrencyCode } from "../domain/currencyAmount.js";
import { DEFAULT_RATE_SOURCE_ID, isRateSourceId } from "../domain/rateSource.js";
import type { RateSourceId } from "../domain/rateSource.js";

export type Settings = {
  readonly enabled: boolean;
  readonly source: RateSourceId;
  readonly targetCurrencies: readonly string[];
};

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  source: DEFAULT_RATE_SOURCE_ID,
  targetCurrencies: ["USD", "EUR", "KRW", "RUB"]
};

export function normalizeSettings(value: Settings): Settings {
  return {
    enabled: value.enabled,
    source: normalizeSource(value.source),
    targetCurrencies: normalizeTargetCurrencies(value.targetCurrencies)
  };
}

export function parseSettings(value: unknown): Settings | null {
  if (!isRecord(value)) {
    return null;
  }

  const enabled = value.enabled;
  const targetCurrencies = value.targetCurrencies;

  if (typeof enabled !== "boolean" || !Array.isArray(targetCurrencies)) {
    return null;
  }

  return {
    enabled,
    source: normalizeSource(value.source),
    targetCurrencies: normalizeTargetCurrencies(targetCurrencies)
  };
}

function normalizeSource(value: unknown): RateSourceId {
  return isRateSourceId(value) ? value : DEFAULT_RATE_SOURCE_ID;
}

function normalizeTargetCurrencies(values: readonly unknown[]): readonly string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const currencyCode = value.toUpperCase();

    if (!isKnownCurrencyCode(currencyCode) || seen.has(currencyCode)) {
      continue;
    }

    seen.add(currencyCode);
    result.push(currencyCode);
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
