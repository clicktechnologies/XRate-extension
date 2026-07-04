import type { CurrencyAmount } from "../domain/currencyAmount.js";
import { getRateEntry } from "../domain/rateSnapshot.js";
import type { RateEntry, RateSnapshot } from "../domain/rateSnapshot.js";

export type ConversionResult = {
  readonly amount: number;
  readonly formattedAmount: string;
  readonly targetCurrencyCode: string;
};

export type ConversionOutcome =
  | {
      readonly conversions: readonly ConversionResult[];
      readonly original: CurrencyAmount;
      readonly snapshot: RateSnapshot;
      readonly type: "converted";
    }
  | {
      readonly message: string;
      readonly original: CurrencyAmount;
      readonly type: "unsupported-source";
    };

export function convertCurrencyAmount(
  original: CurrencyAmount,
  targetCurrencyCodes: readonly string[],
  snapshot: RateSnapshot
): ConversionOutcome {
  const sourceRate = getRateEntry(snapshot, original.currencyCode);

  if (sourceRate === null) {
    return {
      message: `Курс для ${original.currencyCode} отсутствует у источника`,
      original,
      type: "unsupported-source"
    };
  }

  const amountInBase = original.value * unitValueInBase(sourceRate);
  const conversions = buildConversionResults(amountInBase, original.currencyCode, targetCurrencyCodes, snapshot);

  return {
    conversions,
    original,
    snapshot,
    type: "converted"
  };
}

function buildConversionResults(
  amountInBase: number,
  sourceCurrencyCode: string,
  targetCurrencyCodes: readonly string[],
  snapshot: RateSnapshot
): readonly ConversionResult[] {
  const conversions: ConversionResult[] = [];
  const seenCurrencyCodes = new Set<string>();

  for (const targetCurrencyCode of targetCurrencyCodes) {
    if (targetCurrencyCode === sourceCurrencyCode || seenCurrencyCodes.has(targetCurrencyCode)) {
      continue;
    }

    seenCurrencyCodes.add(targetCurrencyCode);

    const targetRate = getRateEntry(snapshot, targetCurrencyCode);

    if (targetRate === null) {
      continue;
    }

    const amount = amountInBase / unitValueInBase(targetRate);
    conversions.push({
      amount,
      formattedAmount: formatCurrencyAmount(amount, targetCurrencyCode),
      targetCurrencyCode
    });
  }

  return conversions;
}

function unitValueInBase(rate: RateEntry): number {
  return rate.valueInBase / rate.nominal;
}

export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, {
    currency: currencyCode,
    maximumFractionDigits: amount >= 100 ? 2 : 4,
    style: "currency"
  }).format(amount);
}
