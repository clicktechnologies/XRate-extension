import assert from "node:assert/strict";
import test from "node:test";
import { convertCurrencyAmount } from "../src/application/conversionService.js";
import { parseCurrencyAmount } from "../src/domain/currencyTextParser.js";
import { isRateSnapshotFresh } from "../src/domain/rateSnapshot.js";
import type { RateSnapshot } from "../src/domain/rateSnapshot.js";

const SNAPSHOT: RateSnapshot = {
  fetchedAtIso: "2026-06-27T12:00:00.000Z",
  rateDate: "27.06.2026",
  ratesToRub: {
    EUR: {
      nominal: 1,
      valueInRub: 87.4027
    },
    KRW: {
      nominal: 1000,
      valueInRub: 49.8681
    },
    RUB: {
      nominal: 1,
      valueInRub: 1
    },
    USD: {
      nominal: 1,
      valueInRub: 77.0611
    }
  },
  sourceName: "Bank of Russia",
  sourceUrl: "https://www.cbr.ru/scripts/XML_daily.asp"
};

test("converts parsed selected text through the RUB-based snapshot", () => {
  const amount = parseCurrencyAmount("100.8 USD");

  assert.notEqual(amount, null);

  if (amount === null) {
    throw new Error("Expected amount to parse");
  }

  const outcome = convertCurrencyAmount(amount, ["EUR", "KRW", "RUB", "USD"], SNAPSHOT);

  assert.equal(outcome.type, "converted");

  if (outcome.type !== "converted") {
    throw new Error("Expected conversion outcome");
  }

  assert.deepEqual(
    outcome.conversions.map((conversion) => conversion.targetCurrencyCode),
    ["EUR", "KRW", "RUB"]
  );

  const euroConversion = outcome.conversions.find((conversion) => conversion.targetCurrencyCode === "EUR");
  const krwConversion = outcome.conversions.find((conversion) => conversion.targetCurrencyCode === "KRW");

  assert.notEqual(euroConversion, undefined);
  assert.notEqual(krwConversion, undefined);

  if (euroConversion === undefined || krwConversion === undefined) {
    throw new Error("Expected EUR and KRW conversions");
  }

  assert.equal(round(euroConversion.amount, 4), 88.8732);
  assert.equal(round(krwConversion.amount, 2), 155766.09);
});

test("marks snapshots stale after four hours", () => {
  assert.equal(isRateSnapshotFresh(SNAPSHOT, Date.parse("2026-06-27T15:59:59.000Z")), true);
  assert.equal(isRateSnapshotFresh(SNAPSHOT, Date.parse("2026-06-27T16:00:00.000Z")), false);
});

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
