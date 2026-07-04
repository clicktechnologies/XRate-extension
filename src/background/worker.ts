import { convertCurrencyAmount } from "../application/conversionService.js";
import type { ConversionResponse, ExtensionResponse, PopupStateResponse } from "../application/messages.js";
import { parseExtensionRequest } from "../application/messages.js";
import type { Settings } from "../application/settings.js";
import { crossFillSnapshot } from "../domain/crossRates.js";
import { listCurrencyDescriptors } from "../domain/currencyAmount.js";
import { parseCurrencyAmount } from "../domain/currencyTextParser.js";
import { getRateEntry, isRateSnapshotFresh } from "../domain/rateSnapshot.js";
import type { RateSnapshot, RateSourceMetadata } from "../domain/rateSnapshot.js";
import { listFallbackSourceIds, listRateSources } from "../domain/rateSource.js";
import type { RateSourceId } from "../domain/rateSource.js";
import { fetchBankOfRussiaRates } from "../infrastructure/bankOfRussiaRates.js";
import { fetchEuropeanCentralBankRates } from "../infrastructure/europeanCentralBankRates.js";
import {
  readCachedRateSnapshot,
  readSettings,
  writeCachedRateSnapshot,
  writeSettings
} from "../infrastructure/chromeStores.js";

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  handleRuntimeMessage(message)
    .then((response) => {
      sendResponse(response);
    })
    .catch((error: unknown) => {
      sendResponse(toErrorResponse(error));
    });

  return true;
});

async function handleRuntimeMessage(message: unknown): Promise<ExtensionResponse> {
  const request = parseExtensionRequest(message);

  if (request === null) {
    return {
      error: "Unsupported XRate request",
      ok: false
    };
  }

  if (request.type === "convert-selection") {
    return {
      ok: true,
      payload: await convertSelection(request.selectedText)
    };
  }

  if (request.type === "get-popup-state") {
    return {
      ok: true,
      payload: await getPopupState()
    };
  }

  if (request.type === "refresh-rates") {
    const settings = await readSettings();
    const snapshot = await refreshRateSnapshot(new Date(), settings.source);
    return {
      ok: true,
      payload: buildPopupState(settings, snapshot)
    };
  }

  const settings = await writeSettings(request.settings);
  let snapshot: RateSnapshot | null;

  try {
    snapshot = await getFreshRateSnapshot(new Date(), settings.source);
  } catch {
    // Saving settings must not fail when the newly selected source is offline.
    snapshot = await readCachedRateSnapshot(settings.source);
  }

  return {
    ok: true,
    payload: buildPopupState(settings, snapshot)
  };
}

async function convertSelection(selectedText: string): Promise<ConversionResponse> {
  const settings = await readSettings();

  if (!settings.enabled) {
    return {
      reason: "XRate disabled",
      type: "disabled"
    };
  }

  const parsedAmount = parseCurrencyAmount(selectedText);

  if (parsedAmount === null) {
    return {
      reason: "Selection is not a supported currency amount",
      type: "no-match"
    };
  }

  const snapshot = await getConversionSnapshot(new Date(), settings, parsedAmount.currencyCode);
  const conversion = convertCurrencyAmount(parsedAmount, settings.targetCurrencies, snapshot);

  if (conversion.type === "unsupported-source") {
    return {
      reason: conversion.message,
      type: "no-match"
    };
  }

  return {
    conversions: conversion.conversions,
    original: conversion.original,
    source: rateSourceMetadataFromSnapshot(conversion.snapshot),
    type: "conversion"
  };
}

async function getPopupState(): Promise<PopupStateResponse> {
  const settings = await readSettings();
  const snapshot = await getFreshRateSnapshot(new Date(), settings.source);
  return buildPopupState(settings, snapshot);
}

function buildPopupState(settings: Settings, snapshot: RateSnapshot | null): PopupStateResponse {
  return {
    availableCurrencies: listCurrencyDescriptors(),
    availableSources: listRateSources(),
    settings,
    source: snapshot === null ? null : rateSourceMetadataFromSnapshot(snapshot),
    type: "popup-state"
  };
}

async function getConversionSnapshot(now: Date, settings: Settings, sourceCurrencyCode: string): Promise<RateSnapshot> {
  const primary = await getFreshRateSnapshot(now, settings.source);
  const neededCurrencyCodes = [sourceCurrencyCode, ...settings.targetCurrencies];

  if (neededCurrencyCodes.every((code) => getRateEntry(primary, code) !== null)) {
    return primary;
  }

  let filled = primary;

  // Only reach for another source when the active one is actually missing a rate.
  for (const fallbackId of listFallbackSourceIds(settings.source)) {
    if (neededCurrencyCodes.every((code) => getRateEntry(filled, code) !== null)) {
      break;
    }

    const fallback = await loadSnapshotOrNull(now, fallbackId);

    if (fallback !== null) {
      filled = crossFillSnapshot(filled, fallback, neededCurrencyCodes);
    }
  }

  return filled;
}

async function loadSnapshotOrNull(now: Date, sourceId: RateSourceId): Promise<RateSnapshot | null> {
  try {
    return await getFreshRateSnapshot(now, sourceId);
  } catch {
    return null;
  }
}

async function getFreshRateSnapshot(now: Date, sourceId: RateSourceId): Promise<RateSnapshot> {
  const cachedSnapshot = await readCachedRateSnapshot(sourceId);

  if (cachedSnapshot !== null && isRateSnapshotFresh(cachedSnapshot, now.getTime())) {
    return cachedSnapshot;
  }

  return refreshRateSnapshot(now, sourceId);
}

async function refreshRateSnapshot(now: Date, sourceId: RateSourceId): Promise<RateSnapshot> {
  const snapshot = await fetchRatesForSource(sourceId, now);
  await writeCachedRateSnapshot(sourceId, snapshot);
  return snapshot;
}

function fetchRatesForSource(sourceId: RateSourceId, now: Date): Promise<RateSnapshot> {
  if (sourceId === "cbr") {
    return fetchBankOfRussiaRates(fetch, now);
  }

  return fetchEuropeanCentralBankRates(fetch, now);
}

function rateSourceMetadataFromSnapshot(snapshot: RateSnapshot): RateSourceMetadata {
  return {
    fetchedAtIso: snapshot.fetchedAtIso,
    rateDate: snapshot.rateDate,
    sourceName: snapshot.sourceName,
    sourceUrl: snapshot.sourceUrl
  };
}

function toErrorResponse(error: unknown): ExtensionResponse {
  const message = error instanceof Error ? error.message : "Unknown XRate error";

  return {
    error: message,
    ok: false
  };
}
