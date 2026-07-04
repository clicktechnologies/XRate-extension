import assert from "node:assert/strict";
import test from "node:test";
import { parseEuropeanCentralBankRates } from "../src/infrastructure/europeanCentralBankRates.js";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.int/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <gesmes:Sender><gesmes:name>European Central Bank</gesmes:name></gesmes:Sender>
  <Cube>
    <Cube time="2026-06-26">
      <Cube currency="USD" rate="1.0755"/>
      <Cube currency="JPY" rate="163.24"/>
    </Cube>
  </Cube>
</gesmes:Envelope>`;

test("parses ECB XML into EUR-based rates", () => {
  const snapshot = parseEuropeanCentralBankRates(SAMPLE_XML, new Date("2026-06-27T12:00:00.000Z"));

  assert.equal(snapshot.sourceName, "European Central Bank");
  assert.equal(snapshot.baseCurrency, "EUR");
  assert.equal(snapshot.rateDate, "2026-06-26");
  assert.deepEqual(snapshot.ratesToBase.EUR, { nominal: 1, valueInBase: 1 });
  assert.deepEqual(snapshot.ratesToBase.USD, { nominal: 1, valueInBase: 1 / 1.0755 });
  assert.deepEqual(snapshot.ratesToBase.JPY, { nominal: 1, valueInBase: 1 / 163.24 });
});

test("rejects a non-positive ECB rate", () => {
  const xml = SAMPLE_XML.replace('rate="1.0755"', 'rate="0"');

  assert.throws(
    () => parseEuropeanCentralBankRates(xml, new Date("2026-06-27T12:00:00.000Z")),
    /Invalid European Central Bank rate for USD/u
  );
});
