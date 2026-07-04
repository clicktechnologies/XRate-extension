import assert from "node:assert/strict";
import test from "node:test";
import { parseBankOfRussiaRates } from "../src/infrastructure/bankOfRussiaRates.js";

const SAMPLE_XML = `<?xml version="1.0" encoding="windows-1251"?>
<ValCurs Date="27.06.2026" name="Foreign Currency Market">
  <Valute ID="R01235">
    <NumCode>840</NumCode>
    <CharCode>USD</CharCode>
    <Nominal>1</Nominal>
    <Name>US Dollar</Name>
    <Value>77,0611</Value>
  </Valute>
  <Valute ID="R01815">
    <NumCode>410</NumCode>
    <CharCode>KRW</CharCode>
    <Nominal>1000</Nominal>
    <Name>Won</Name>
    <Value>49,8681</Value>
  </Valute>
</ValCurs>`;

test("parses Bank of Russia XML into RUB-based rates", () => {
  const snapshot = parseBankOfRussiaRates(SAMPLE_XML, new Date("2026-06-27T12:00:00.000Z"));

  assert.equal(snapshot.sourceName, "Bank of Russia");
  assert.equal(snapshot.sourceUrl, "https://www.cbr.ru/scripts/XML_daily.asp");
  assert.equal(snapshot.baseCurrency, "RUB");
  assert.equal(snapshot.rateDate, "27.06.2026");
  assert.equal(snapshot.fetchedAtIso, "2026-06-27T12:00:00.000Z");
  assert.deepEqual(snapshot.ratesToBase.USD, {
    nominal: 1,
    valueInBase: 77.0611
  });
  assert.deepEqual(snapshot.ratesToBase.KRW, {
    nominal: 1000,
    valueInBase: 49.8681
  });
  assert.deepEqual(snapshot.ratesToBase.RUB, {
    nominal: 1,
    valueInBase: 1
  });
});

test("rejects XML without the expected root element", () => {
  assert.throws(
    () => parseBankOfRussiaRates("<Rates></Rates>", new Date("2026-06-27T12:00:00.000Z")),
    /root element must be ValCurs/u
  );
});

test("rejects malformed positive numeric fields", () => {
  const xml = SAMPLE_XML.replace("<Nominal>1000</Nominal>", "<Nominal>0</Nominal>");

  assert.throws(
    () => parseBankOfRussiaRates(xml, new Date("2026-06-27T12:00:00.000Z")),
    /Invalid Bank of Russia nominal for KRW/u
  );
});
