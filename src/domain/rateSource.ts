export type RateSourceId = "ecb" | "cbr";

export type RateSourceDescriptor = {
  readonly id: RateSourceId;
  readonly name: string;
};

export const RATE_SOURCES: readonly RateSourceDescriptor[] = [
  { id: "ecb", name: "European Central Bank" },
  { id: "cbr", name: "Bank of Russia" }
];

export const DEFAULT_RATE_SOURCE_ID: RateSourceId = "ecb";

const RATE_SOURCE_IDS = new Set<string>(RATE_SOURCES.map((source) => source.id));

export function isRateSourceId(value: unknown): value is RateSourceId {
  return typeof value === "string" && RATE_SOURCE_IDS.has(value);
}

export function listRateSources(): readonly RateSourceDescriptor[] {
  return RATE_SOURCES;
}

export function listFallbackSourceIds(activeSourceId: RateSourceId): readonly RateSourceId[] {
  return RATE_SOURCES.filter((source) => source.id !== activeSourceId).map((source) => source.id);
}
