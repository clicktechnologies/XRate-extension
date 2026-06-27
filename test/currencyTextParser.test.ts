import assert from "node:assert/strict";
import test from "node:test";
import { parseAmountLiteral, parseCurrencyAmount } from "../src/domain/currencyTextParser.js";

test("parses symbol suffix amount with space grouping", () => {
  assert.deepEqual(parseCurrencyAmount("1 800 000 ₩"), {
    currencyCode: "KRW",
    originalText: "1 800 000 ₩",
    value: 1800000
  });
});

test("parses code suffix amount with decimal point", () => {
  assert.deepEqual(parseCurrencyAmount("100.8 USD"), {
    currencyCode: "USD",
    originalText: "100.8 USD",
    value: 100.8
  });
});

test("parses symbol prefix amount", () => {
  assert.deepEqual(parseCurrencyAmount("$300"), {
    currencyCode: "USD",
    originalText: "$300",
    value: 300
  });
});

test("parses ruble word suffixes", () => {
  assert.deepEqual(parseCurrencyAmount("80 рублей"), {
    currencyCode: "RUB",
    originalText: "80 рублей",
    value: 80
  });

  assert.deepEqual(parseCurrencyAmount("120 руб."), {
    currencyCode: "RUB",
    originalText: "120 руб.",
    value: 120
  });
});

test("parses Turkish lira TL suffix", () => {
  assert.deepEqual(parseCurrencyAmount("678 TL"), {
    currencyCode: "TRY",
    originalText: "678 TL",
    value: 678
  });
});

test("parses additional international currency aliases", () => {
  assert.deepEqual(parseCurrencyAmount("45 zł"), {
    currencyCode: "PLN",
    originalText: "45 zł",
    value: 45
  });

  assert.deepEqual(parseCurrencyAmount("₹1,200"), {
    currencyCode: "INR",
    originalText: "₹1,200",
    value: 1200
  });

  assert.deepEqual(parseCurrencyAmount("500 ฿"), {
    currencyCode: "THB",
    originalText: "500 ฿",
    value: 500
  });

  assert.deepEqual(parseCurrencyAmount("100 CHF"), {
    currencyCode: "CHF",
    originalText: "100 CHF",
    value: 100
  });

  assert.deepEqual(parseCurrencyAmount("200 yuan"), {
    currencyCode: "CNY",
    originalText: "200 yuan",
    value: 200
  });
});

test("rejects long text selections", () => {
  assert.equal(parseCurrencyAmount("The product costs 100.8 USD and this sentence is intentionally too long for a tooltip."), null);
});

test("rejects unknown currency codes", () => {
  assert.equal(parseCurrencyAmount("100 XYZ"), null);
});

test("normalizes common grouping and decimal separators", () => {
  assert.equal(parseAmountLiteral("1,800,000"), 1800000);
  assert.equal(parseAmountLiteral("1.800.000"), 1800000);
  assert.equal(parseAmountLiteral("1,800.50"), 1800.5);
  assert.equal(parseAmountLiteral("1.800,50"), 1800.5);
  assert.equal(parseAmountLiteral("100,8"), 100.8);
});

test("rejects malformed number separators", () => {
  assert.equal(parseAmountLiteral("1,80,000"), null);
  assert.equal(parseAmountLiteral("100..8"), null);
  assert.equal(parseAmountLiteral("0"), null);
});
