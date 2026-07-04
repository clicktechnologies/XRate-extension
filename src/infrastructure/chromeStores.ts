import { DEFAULT_SETTINGS, normalizeSettings, parseSettings } from "../application/settings.js";
import type { Settings } from "../application/settings.js";
import { parseRateSnapshot } from "../domain/rateSnapshot.js";
import type { RateSnapshot } from "../domain/rateSnapshot.js";
import type { RateSourceId } from "../domain/rateSource.js";

const SETTINGS_KEY = "xrate.settings";
const RATE_SNAPSHOT_KEY_PREFIX = "xrate.rateSnapshot.";

export async function readSettings(): Promise<Settings> {
  const values: Record<string, unknown> = await chrome.storage.sync.get(SETTINGS_KEY);
  const storedSettings = parseSettings(values[SETTINGS_KEY]);
  return storedSettings === null ? DEFAULT_SETTINGS : storedSettings;
}

export async function writeSettings(settings: Settings): Promise<Settings> {
  const normalizedSettings = normalizeSettings(settings);
  await chrome.storage.sync.set({
    [SETTINGS_KEY]: normalizedSettings
  });
  return normalizedSettings;
}

export async function readCachedRateSnapshot(sourceId: RateSourceId): Promise<RateSnapshot | null> {
  const key = RATE_SNAPSHOT_KEY_PREFIX + sourceId;
  const values: Record<string, unknown> = await chrome.storage.session.get(key);
  return parseRateSnapshot(values[key]);
}

export async function writeCachedRateSnapshot(sourceId: RateSourceId, snapshot: RateSnapshot): Promise<void> {
  await chrome.storage.session.set({
    [RATE_SNAPSHOT_KEY_PREFIX + sourceId]: snapshot
  });
}
