import { convertCurrencyAmount } from "../application/conversionService.js";
import type { ConversionResponse, ExtensionResponse, PopupStateResponse } from "../application/messages.js";
import { parseExtensionRequest } from "../application/messages.js";
import { listCurrencyDescriptors } from "../domain/currencyAmount.js";
import { parseCurrencyAmount } from "../domain/currencyTextParser.js";
import { isRateSnapshotFresh } from "../domain/rateSnapshot.js";
import type { RateSnapshot, RateSourceMetadata } from "../domain/rateSnapshot.js";
import { fetchBankOfRussiaRates } from "../infrastructure/bankOfRussiaRates.js";
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
    const snapshot = await refreshRateSnapshot(new Date());
    return {
      ok: true,
      payload: await getPopupStateWithSnapshot(snapshot)
    };
  }

  const settings = await writeSettings(request.settings);

  return {
    ok: true,
    payload: {
      availableCurrencies: listCurrencyDescriptors(),
      settings,
      source: rateSourceMetadata(await readCachedRateSnapshot()),
      type: "popup-state"
    }
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

  const snapshot = await getFreshRateSnapshot(new Date());
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
  const snapshot = await getFreshRateSnapshot(new Date());
  return getPopupStateWithSnapshot(snapshot);
}

async function getPopupStateWithSnapshot(snapshot: RateSnapshot): Promise<PopupStateResponse> {
  return {
    availableCurrencies: listCurrencyDescriptors(),
    settings: await readSettings(),
    source: rateSourceMetadataFromSnapshot(snapshot),
    type: "popup-state"
  };
}

async function getFreshRateSnapshot(now: Date): Promise<RateSnapshot> {
  const cachedSnapshot = await readCachedRateSnapshot();

  if (cachedSnapshot !== null && isRateSnapshotFresh(cachedSnapshot, now.getTime())) {
    return cachedSnapshot;
  }

  return refreshRateSnapshot(now);
}

async function refreshRateSnapshot(now: Date): Promise<RateSnapshot> {
  const snapshot = await fetchBankOfRussiaRates(fetch, now);
  await writeCachedRateSnapshot(snapshot);
  return snapshot;
}

function rateSourceMetadata(snapshot: RateSnapshot | null): RateSourceMetadata | null {
  if (snapshot === null) {
    return null;
  }

  return rateSourceMetadataFromSnapshot(snapshot);
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
