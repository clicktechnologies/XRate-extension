import { parseSettings } from "./settings.js";
import type { Settings } from "./settings.js";
import type { ConversionResult } from "./conversionService.js";
import type { CurrencyAmount, CurrencyDescriptor } from "../domain/currencyAmount.js";
import { isRecord } from "../domain/rateSnapshot.js";
import type { RateSourceMetadata } from "../domain/rateSnapshot.js";

export type ConvertSelectionRequest = {
  readonly selectedText: string;
  readonly type: "convert-selection";
};

export type GetPopupStateRequest = {
  readonly type: "get-popup-state";
};

export type RefreshRatesRequest = {
  readonly type: "refresh-rates";
};

export type SaveSettingsRequest = {
  readonly settings: Settings;
  readonly type: "save-settings";
};

export type ExtensionRequest = ConvertSelectionRequest | GetPopupStateRequest | RefreshRatesRequest | SaveSettingsRequest;

export type ConversionResponse =
  | {
      readonly conversions: readonly ConversionResult[];
      readonly original: CurrencyAmount;
      readonly source: RateSourceMetadata;
      readonly type: "conversion";
    }
  | {
      readonly reason: string;
      readonly type: "no-match";
    }
  | {
      readonly reason: string;
      readonly type: "disabled";
    };

export type PopupStateResponse = {
  readonly availableCurrencies: readonly CurrencyDescriptor[];
  readonly settings: Settings;
  readonly source: RateSourceMetadata | null;
  readonly type: "popup-state";
};

export type ExtensionResponse =
  | {
      readonly ok: true;
      readonly payload: ConversionResponse | PopupStateResponse;
    }
  | {
      readonly error: string;
      readonly ok: false;
    };

export function parseExtensionRequest(value: unknown): ExtensionRequest | null {
  if (!isRecord(value)) {
    return null;
  }

  const type = value.type;

  if (type === "convert-selection") {
    const selectedText = value.selectedText;
    return typeof selectedText === "string" ? { selectedText, type } : null;
  }

  if (type === "get-popup-state") {
    return { type };
  }

  if (type === "refresh-rates") {
    return { type };
  }

  if (type === "save-settings") {
    const settings = parseSettings(value.settings);
    return settings === null ? null : { settings, type };
  }

  return null;
}

export function parseExtensionResponse(value: unknown): ExtensionResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  const ok = value.ok;

  if (ok === false) {
    const error = value.error;
    return typeof error === "string" ? { error, ok } : null;
  }

  if (ok !== true) {
    return null;
  }

  const payload = value.payload;

  if (!isRecord(payload)) {
    return null;
  }

  const payloadType = payload.type;

  if (payloadType === "disabled") {
    const reason = payload.reason;
    return typeof reason === "string" ? { ok, payload: { reason, type: payloadType } } : null;
  }

  if (payloadType === "no-match") {
    const reason = payload.reason;
    return typeof reason === "string" ? { ok, payload: { reason, type: payloadType } } : null;
  }

  if (payloadType === "conversion" && isConversionPayload(payload)) {
    const conversionPayload = parseConversionPayload(payload);

    if (conversionPayload === null) {
      return null;
    }

    return {
      ok,
      payload: conversionPayload
    };
  }

  if (payloadType === "popup-state" && isPopupStatePayload(payload)) {
    const popupPayload = parsePopupStatePayload(payload);

    if (popupPayload === null) {
      return null;
    }

    return {
      ok,
      payload: popupPayload
    };
  }

  return null;
}

function parseConversionPayload(value: Record<string, unknown>): ConversionResponse | null {
  const original = parseCurrencyAmountRecord(value.original);
  const conversions = parseConversionResults(value.conversions);
  const source = parseRateSourceMetadata(value.source);

  if (original === null || conversions === null || source === null) {
    return null;
  }

  return {
    conversions,
    original,
    source,
    type: "conversion"
  };
}

function parsePopupStatePayload(value: Record<string, unknown>): PopupStateResponse | null {
  const availableCurrencies = parseCurrencyDescriptors(value.availableCurrencies);
  const settings = parseSettings(value.settings);
  const source = value.source === null ? null : parseRateSourceMetadata(value.source);

  if (availableCurrencies === null || settings === null || source === null && value.source !== null) {
    return null;
  }

  return {
    availableCurrencies,
    settings,
    source,
    type: "popup-state"
  };
}

function parseCurrencyAmountRecord(value: unknown): CurrencyAmount | null {
  if (!isRecord(value)) {
    return null;
  }

  const currencyCode = readString(value, "currencyCode");
  const originalText = readString(value, "originalText");
  const amountValue = readNumber(value, "value");

  if (currencyCode === null || originalText === null || amountValue === null) {
    return null;
  }

  return {
    currencyCode,
    originalText,
    value: amountValue
  };
}

function parseConversionResults(value: unknown): readonly ConversionResult[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const results: ConversionResult[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const amount = readNumber(item, "amount");
    const formattedAmount = readString(item, "formattedAmount");
    const targetCurrencyCode = readString(item, "targetCurrencyCode");

    if (amount === null || formattedAmount === null || targetCurrencyCode === null) {
      return null;
    }

    results.push({
      amount,
      formattedAmount,
      targetCurrencyCode
    });
  }

  return results;
}

function parseCurrencyDescriptors(value: unknown): readonly CurrencyDescriptor[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const descriptors: CurrencyDescriptor[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }

    const code = readString(item, "code");
    const displayName = readString(item, "displayName");
    const symbol = readString(item, "symbol");

    if (code === null || displayName === null || symbol === null) {
      return null;
    }

    descriptors.push({
      code,
      displayName,
      symbol
    });
  }

  return descriptors;
}

function parseRateSourceMetadata(value: unknown): RateSourceMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  const fetchedAtIso = readString(value, "fetchedAtIso");
  const rateDate = readString(value, "rateDate");
  const sourceName = readString(value, "sourceName");
  const sourceUrl = readString(value, "sourceUrl");

  if (fetchedAtIso === null || rateDate === null || sourceName === null || sourceUrl === null) {
    return null;
  }

  return {
    fetchedAtIso,
    rateDate,
    sourceName,
    sourceUrl
  };
}

function isConversionPayload(value: Record<string, unknown>): boolean {
  return value.type === "conversion";
}

function isPopupStatePayload(value: Record<string, unknown>): boolean {
  return value.type === "popup-state";
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
