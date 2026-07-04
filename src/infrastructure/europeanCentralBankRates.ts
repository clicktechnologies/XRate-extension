import { DOMParser } from "@xmldom/xmldom";
import type { RateSnapshot } from "../domain/rateSnapshot.js";

export const EUROPEAN_CENTRAL_BANK_SOURCE_NAME = "European Central Bank";
export const EUROPEAN_CENTRAL_BANK_SOURCE_URL =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml";

export async function fetchEuropeanCentralBankRates(fetchClient: typeof fetch, fetchedAt: Date): Promise<RateSnapshot> {
  const response = await fetchClient(EUROPEAN_CENTRAL_BANK_SOURCE_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch European Central Bank rates: HTTP ${response.status}`);
  }

  const xmlText = await response.text();
  return parseEuropeanCentralBankRates(xmlText, fetchedAt);
}

export function parseEuropeanCentralBankRates(xmlText: string, fetchedAt: Date): RateSnapshot {
  const document = new DOMParser({
    onError(level, message) {
      if (level === "error" || level === "fatalError") {
        throw new Error(`Invalid European Central Bank XML: ${message}`);
      }
    }
  }).parseFromString(xmlText, "text/xml");

  const root = document.documentElement;

  if (root === null) {
    throw new Error("Invalid European Central Bank XML: missing root element");
  }

  // ECB publishes EUR-based reference rates in nested <Cube> elements: one Cube
  // carries the date (time attribute), leaf Cubes carry currency + rate.
  const cubeNodes = root.getElementsByTagName("Cube");
  const ratesToBase: Record<string, { readonly nominal: number; readonly valueInBase: number }> = {
    EUR: {
      nominal: 1,
      valueInBase: 1
    }
  };

  let rateDate: string | null = null;

  for (let index = 0; index < cubeNodes.length; index += 1) {
    const cubeNode = cubeNodes.item(index);

    if (cubeNode === null) {
      continue;
    }

    const time = cubeNode.getAttribute("time");

    if (time !== null && time.length > 0) {
      rateDate = time;
    }

    const currencyCode = cubeNode.getAttribute("currency");
    const rateText = cubeNode.getAttribute("rate");

    if (currencyCode === null || rateText === null) {
      continue;
    }

    if (!/^[A-Z]{3}$/u.test(currencyCode)) {
      throw new Error(`Invalid European Central Bank XML: unsupported currency code ${currencyCode}`);
    }

    ratesToBase[currencyCode] = {
      nominal: 1,
      valueInBase: unitEuroValue(rateText, currencyCode)
    };
  }

  if (rateDate === null) {
    throw new Error("Invalid European Central Bank XML: missing rate date");
  }

  if (Object.keys(ratesToBase).length <= 1) {
    throw new Error("Invalid European Central Bank XML: no rates found");
  }

  return {
    baseCurrency: "EUR",
    fetchedAtIso: fetchedAt.toISOString(),
    rateDate,
    ratesToBase,
    sourceName: EUROPEAN_CENTRAL_BANK_SOURCE_NAME,
    sourceUrl: EUROPEAN_CENTRAL_BANK_SOURCE_URL
  };
}

// ECB rate is foreign units per 1 EUR; one foreign unit is worth its reciprocal in EUR.
function unitEuroValue(rateText: string, currencyCode: string): number {
  const perEuro = Number(rateText);

  if (!Number.isFinite(perEuro) || perEuro <= 0) {
    throw new Error(`Invalid European Central Bank rate for ${currencyCode}`);
  }

  return 1 / perEuro;
}
