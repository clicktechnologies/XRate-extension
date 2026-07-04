import { DOMParser } from "@xmldom/xmldom";
import type { Element } from "@xmldom/xmldom";
import type { RateSnapshot } from "../domain/rateSnapshot.js";

export const BANK_OF_RUSSIA_SOURCE_NAME = "Bank of Russia";
export const BANK_OF_RUSSIA_SOURCE_URL = "https://www.cbr.ru/scripts/XML_daily.asp";

export async function fetchBankOfRussiaRates(fetchClient: typeof fetch, fetchedAt: Date): Promise<RateSnapshot> {
  const response = await fetchClient(BANK_OF_RUSSIA_SOURCE_URL, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Bank of Russia rates: HTTP ${response.status}`);
  }

  const xmlText = await response.text();
  return parseBankOfRussiaRates(xmlText, fetchedAt);
}

export function parseBankOfRussiaRates(xmlText: string, fetchedAt: Date): RateSnapshot {
  const document = new DOMParser({
    onError(level, message) {
      if (level === "error" || level === "fatalError") {
        throw new Error(`Invalid Bank of Russia XML: ${message}`);
      }
    }
  }).parseFromString(xmlText, "text/xml");

  const root = document.documentElement;

  if (root === null || root.nodeName !== "ValCurs") {
    throw new Error("Invalid Bank of Russia XML: root element must be ValCurs");
  }

  const rateDate = root.getAttribute("Date");

  if (rateDate === null || rateDate.length === 0) {
    throw new Error("Invalid Bank of Russia XML: missing ValCurs Date");
  }

  const ratesToBase: Record<string, { readonly nominal: number; readonly valueInBase: number }> = {
    RUB: {
      nominal: 1,
      valueInBase: 1
    }
  };

  const valuteNodes = root.getElementsByTagName("Valute");

  for (let index = 0; index < valuteNodes.length; index += 1) {
    const valuteNode = valuteNodes.item(index);

    if (valuteNode === null) {
      continue;
    }

    const currencyCode = readRequiredChildText(valuteNode, "CharCode");
    const nominal = parsePositiveInteger(readRequiredChildText(valuteNode, "Nominal"), currencyCode);
    const valueInBase = parseBankDecimal(readRequiredChildText(valuteNode, "Value"), currencyCode);

    if (!/^[A-Z]{3}$/u.test(currencyCode)) {
      throw new Error(`Invalid Bank of Russia XML: unsupported currency code ${currencyCode}`);
    }

    ratesToBase[currencyCode] = {
      nominal,
      valueInBase
    };
  }

  return {
    baseCurrency: "RUB",
    fetchedAtIso: fetchedAt.toISOString(),
    rateDate,
    ratesToBase,
    sourceName: BANK_OF_RUSSIA_SOURCE_NAME,
    sourceUrl: BANK_OF_RUSSIA_SOURCE_URL
  };
}

function readRequiredChildText(parent: Element, tagName: string): string {
  const nodes = parent.getElementsByTagName(tagName);
  const node = nodes.item(0);

  if (node === null) {
    throw new Error(`Invalid Bank of Russia XML: missing ${tagName}`);
  }

  const text = node.textContent;

  if (text === null) {
    throw new Error(`Invalid Bank of Russia XML: empty ${tagName}`);
  }

  const trimmedText = text.trim();

  if (trimmedText.length === 0) {
    throw new Error(`Invalid Bank of Russia XML: empty ${tagName}`);
  }

  return trimmedText;
}

function parsePositiveInteger(value: string, currencyCode: string): number {
  if (!/^\d+$/u.test(value)) {
    throw new Error(`Invalid Bank of Russia nominal for ${currencyCode}`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid Bank of Russia nominal for ${currencyCode}`);
  }

  return parsed;
}

function parseBankDecimal(value: string, currencyCode: string): number {
  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid Bank of Russia rate for ${currencyCode}`);
  }

  return parsed;
}
