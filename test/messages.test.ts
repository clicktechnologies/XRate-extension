import assert from "node:assert/strict";
import test from "node:test";
import { parseExtensionResponse } from "../src/application/messages.js";

test("parses a valid popup state response", () => {
  assert.deepEqual(
    parseExtensionResponse({
      ok: true,
      payload: {
        availableCurrencies: [
          {
            code: "USD",
            displayName: "Доллар США",
            symbol: "$"
          }
        ],
        availableSources: [
          { id: "ecb", name: "European Central Bank" },
          { id: "cbr", name: "Bank of Russia" }
        ],
        settings: {
          enabled: true,
          source: "cbr",
          targetCurrencies: ["USD"]
        },
        source: {
          fetchedAtIso: "2026-06-27T12:00:00.000Z",
          rateDate: "27.06.2026",
          sourceName: "Bank of Russia",
          sourceUrl: "https://www.cbr.ru/scripts/XML_daily.asp"
        },
        type: "popup-state"
      }
    }),
    {
      ok: true,
      payload: {
        availableCurrencies: [
          {
            code: "USD",
            displayName: "Доллар США",
            symbol: "$"
          }
        ],
        availableSources: [
          { id: "ecb", name: "European Central Bank" },
          { id: "cbr", name: "Bank of Russia" }
        ],
        settings: {
          enabled: true,
          source: "cbr",
          targetCurrencies: ["USD"]
        },
        source: {
          fetchedAtIso: "2026-06-27T12:00:00.000Z",
          rateDate: "27.06.2026",
          sourceName: "Bank of Russia",
          sourceUrl: "https://www.cbr.ru/scripts/XML_daily.asp"
        },
        type: "popup-state"
      }
    }
  );
});

test("rejects a malformed conversion response", () => {
  assert.equal(
    parseExtensionResponse({
      ok: true,
      payload: {
        conversions: [
          {
            amount: "100",
            formattedAmount: "$100.00",
            targetCurrencyCode: "USD"
          }
        ],
        original: {
          currencyCode: "EUR",
          originalText: "100 EUR",
          value: 100
        },
        source: {
          fetchedAtIso: "2026-06-27T12:00:00.000Z",
          rateDate: "27.06.2026",
          sourceName: "Bank of Russia",
          sourceUrl: "https://www.cbr.ru/scripts/XML_daily.asp"
        },
        type: "conversion"
      }
    }),
    null
  );
});
