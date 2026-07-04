import assert from "node:assert/strict";
import test from "node:test";
import { crossFillSnapshot } from "../src/domain/crossRates.js";
import { convertCurrencyAmount } from "../src/application/conversionService.js";
import { parseCurrencyAmount } from "../src/domain/currencyTextParser.js";
import type { RateSnapshot } from "../src/domain/rateSnapshot.js";

const ECB: RateSnapshot = {
  baseCurrency: "EUR",
  fetchedAtIso: "2026-06-27T12:00:00.000Z",
  rateDate: "2026-06-26",
  ratesToBase: {
    EUR: { nominal: 1, valueInBase: 1 },
    USD: { nominal: 1, valueInBase: 1 / 1.0755 }
  },
  sourceName: "European Central Bank",
  sourceUrl: "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
};

const CBR: RateSnapshot = {
  baseCurrency: "RUB",
  fetchedAtIso: "2026-06-27T12:00:00.000Z",
  rateDate: "27.06.2026",
  ratesToBase: {
    EUR: { nominal: 1, valueInBase: 87.4027 },
    RUB: { nominal: 1, valueInBase: 1 },
    USD: { nominal: 1, valueInBase: 77.0611 }
  },
  sourceName: "Bank of Russia",
  sourceUrl: "https://www.cbr.ru/scripts/XML_daily.asp"
};

test("bridges a missing currency through a shared currency", () => {
  const filled = crossFillSnapshot(ECB, CBR, ["RUB", "USD"]);
  const rub = filled.ratesToBase.RUB;
  const usd = filled.ratesToBase.USD;

  if (rub === undefined || usd === undefined) {
    throw new Error("Expected filled RUB and USD entries");
  }

  // RUB priced in EUR through the EUR bridge: 1 RUB = 1 / 87.4027 EUR
  assert.equal(rub.valueInBase, 1 / 87.4027);

  // existing USD rate stays untouched (not overwritten by the fallback)
  assert.equal(usd.valueInBase, 1 / 1.0755);

  // 1 EUR should round-trip back to the fallback's EUR/RUB rate
  const amount = parseCurrencyAmount("1 EUR");

  if (amount === null) {
    throw new Error("Expected amount to parse");
  }

  const outcome = convertCurrencyAmount(amount, ["RUB"], filled);

  if (outcome.type !== "converted") {
    throw new Error("Expected conversion outcome");
  }

  const [rubConversion] = outcome.conversions;

  if (rubConversion === undefined) {
    throw new Error("Expected a RUB conversion");
  }

  assert.equal(round(rubConversion.amount, 4), 87.4027);
});

test("returns the primary snapshot unchanged when nothing is missing", () => {
  assert.equal(crossFillSnapshot(ECB, CBR, ["EUR", "USD"]), ECB);
});

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
