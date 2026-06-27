import { DEFAULT_SETTINGS, normalizeSettings, parseSettings } from "../application/settings.js";
import type { Settings } from "../application/settings.js";
import { parseRateSnapshot } from "../domain/rateSnapshot.js";
import type { RateSnapshot } from "../domain/rateSnapshot.js";

const SETTINGS_KEY = "xrate.settings";
const RATE_SNAPSHOT_KEY = "xrate.rateSnapshot";

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

export async function readCachedRateSnapshot(): Promise<RateSnapshot | null> {
  const values: Record<string, unknown> = await chrome.storage.session.get(RATE_SNAPSHOT_KEY);
  return parseRateSnapshot(values[RATE_SNAPSHOT_KEY]);
}

export async function writeCachedRateSnapshot(snapshot: RateSnapshot): Promise<void> {
  await chrome.storage.session.set({
    [RATE_SNAPSHOT_KEY]: snapshot
  });
}
