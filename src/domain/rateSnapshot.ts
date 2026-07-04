export const RATE_CACHE_TTL_MS = 4 * 60 * 60 * 1000;

export type RateEntry = {
  readonly nominal: number;
  readonly valueInBase: number;
};

export type RateSourceMetadata = {
  readonly fetchedAtIso: string;
  readonly rateDate: string;
  readonly sourceName: string;
  readonly sourceUrl: string;
};

export type RateSnapshot = RateSourceMetadata & {
  readonly baseCurrency: string;
  readonly ratesToBase: Record<string, RateEntry>;
};

const BASE_RATE_ENTRY: RateEntry = {
  nominal: 1,
  valueInBase: 1
};

export function isRateSnapshotFresh(snapshot: RateSnapshot, nowMs: number): boolean {
  const fetchedAtMs = Date.parse(snapshot.fetchedAtIso);

  if (!Number.isFinite(fetchedAtMs)) {
    return false;
  }

  return nowMs - fetchedAtMs < RATE_CACHE_TTL_MS;
}

export function getRateEntry(snapshot: RateSnapshot, currencyCode: string): RateEntry | null {
  if (currencyCode === snapshot.baseCurrency) {
    return BASE_RATE_ENTRY;
  }

  const entry = snapshot.ratesToBase[currencyCode];
  return entry === undefined ? null : entry;
}

export function parseRateSnapshot(value: unknown): RateSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const fetchedAtIso = readString(value, "fetchedAtIso");
  const rateDate = readString(value, "rateDate");
  const baseCurrency = readString(value, "baseCurrency");
  const sourceName = readString(value, "sourceName");
  const sourceUrl = readString(value, "sourceUrl");
  const ratesToBaseValue = value.ratesToBase;

  if (
    fetchedAtIso === null ||
    rateDate === null ||
    baseCurrency === null ||
    !/^[A-Z]{3}$/u.test(baseCurrency) ||
    sourceName === null ||
    sourceUrl === null ||
    !isRecord(ratesToBaseValue)
  ) {
    return null;
  }

  const ratesToBase = parseRateEntries(ratesToBaseValue);

  if (ratesToBase === null) {
    return null;
  }

  return {
    baseCurrency,
    fetchedAtIso,
    rateDate,
    ratesToBase,
    sourceName,
    sourceUrl
  };
}

function parseRateEntries(value: Record<string, unknown>): Record<string, RateEntry> | null {
  const entries: Record<string, RateEntry> = {};

  for (const [currencyCode, rawEntry] of Object.entries(value)) {
    if (!/^[A-Z]{3}$/u.test(currencyCode) || !isRecord(rawEntry)) {
      return null;
    }

    const nominal = readNumber(rawEntry, "nominal");
    const valueInBase = readNumber(rawEntry, "valueInBase");

    if (nominal === null || valueInBase === null || nominal <= 0 || valueInBase <= 0) {
      return null;
    }

    entries[currencyCode] = {
      nominal,
      valueInBase
    };
  }

  return entries;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
