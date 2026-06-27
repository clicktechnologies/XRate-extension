import { getCurrencyCodeForSymbol, getCurrencyCodeForToken } from "./currencyAmount.js";
import type { CurrencyAmount } from "./currencyAmount.js";

const MAX_SELECTION_LENGTH = 80;
const AMOUNT_PATTERN = String.raw`\d(?:[\d\s\u00A0\u202F.,]*\d)?`;
const SYMBOL_PATTERN = String.raw`[$€£₩₽₸₺₹฿]`;
const TOKEN_PATTERN = String.raw`[\p{L}.]{2,12}`;

const SYMBOL_PREFIX_PATTERN = new RegExp(String.raw`^\s*(${SYMBOL_PATTERN})\s*(${AMOUNT_PATTERN})\s*$`, "u");
const SYMBOL_SUFFIX_PATTERN = new RegExp(String.raw`^\s*(${AMOUNT_PATTERN})\s*(${SYMBOL_PATTERN})\s*$`, "u");
const TOKEN_PREFIX_PATTERN = new RegExp(String.raw`^\s*(${TOKEN_PATTERN})\s*(${AMOUNT_PATTERN})\s*$`, "u");
const TOKEN_SUFFIX_PATTERN = new RegExp(String.raw`^\s*(${AMOUNT_PATTERN})\s*(${TOKEN_PATTERN})\s*$`, "u");

export function parseCurrencyAmount(selectedText: string): CurrencyAmount | null {
  const originalText = selectedText.trim();

  if (originalText.length === 0 || originalText.length > MAX_SELECTION_LENGTH) {
    return null;
  }

  return (
    parseSymbolMatch(SYMBOL_PREFIX_PATTERN.exec(originalText), 2, 1, originalText) ??
    parseSymbolMatch(SYMBOL_SUFFIX_PATTERN.exec(originalText), 1, 2, originalText) ??
    parseTokenMatch(TOKEN_PREFIX_PATTERN.exec(originalText), 2, 1, originalText) ??
    parseTokenMatch(TOKEN_SUFFIX_PATTERN.exec(originalText), 1, 2, originalText)
  );
}

function parseSymbolMatch(
  match: RegExpExecArray | null,
  amountIndex: number,
  symbolIndex: number,
  originalText: string
): CurrencyAmount | null {
  if (match === null) {
    return null;
  }

  const amountLiteral = match[amountIndex];
  const symbol = match[symbolIndex];

  if (amountLiteral === undefined || symbol === undefined) {
    return null;
  }

  const currencyCode = getCurrencyCodeForSymbol(symbol);

  if (currencyCode === null) {
    return null;
  }

  return parseAmount(amountLiteral, currencyCode, originalText);
}

function parseTokenMatch(
  match: RegExpExecArray | null,
  amountIndex: number,
  tokenIndex: number,
  originalText: string
): CurrencyAmount | null {
  if (match === null) {
    return null;
  }

  const amountLiteral = match[amountIndex];
  const rawToken = match[tokenIndex];

  if (amountLiteral === undefined || rawToken === undefined) {
    return null;
  }

  const currencyCode = getCurrencyCodeForToken(rawToken);

  if (currencyCode === null) {
    return null;
  }

  return parseAmount(amountLiteral, currencyCode, originalText);
}

function parseAmount(amountLiteral: string, currencyCode: string, originalText: string): CurrencyAmount | null {
  const value = parseAmountLiteral(amountLiteral);

  if (value === null) {
    return null;
  }

  return {
    currencyCode,
    originalText,
    value
  };
}

export function parseAmountLiteral(amountLiteral: string): number | null {
  const compact = amountLiteral.replace(/[\s\u00A0\u202F]/gu, "");

  if (compact.length === 0 || !/^\d[\d,.]*$/u.test(compact)) {
    return null;
  }

  const normalized = normalizeSeparators(compact);

  if (normalized === null) {
    return null;
  }

  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

function normalizeSeparators(compact: string): string | null {
  const commaCount = countOccurrences(compact, ",");
  const dotCount = countOccurrences(compact, ".");

  if (commaCount === 0 && dotCount === 0) {
    return compact;
  }

  if (commaCount > 0 && dotCount > 0) {
    return normalizeMixedSeparators(compact);
  }

  const separator = commaCount > 0 ? "," : ".";
  return normalizeSingleSeparator(compact, separator);
}

function normalizeMixedSeparators(compact: string): string | null {
  const lastComma = compact.lastIndexOf(",");
  const lastDot = compact.lastIndexOf(".");
  const decimalSeparator = lastComma > lastDot ? "," : ".";
  const groupingSeparator = decimalSeparator === "," ? "." : ",";
  const decimalParts = compact.split(decimalSeparator);

  if (decimalParts.length !== 2) {
    return null;
  }

  const integerPart = decimalParts[0];
  const fractionPart = decimalParts[1];

  if (integerPart === undefined || fractionPart === undefined) {
    return null;
  }

  if (!hasValidFraction(fractionPart) || !hasValidGroupedInteger(integerPart, groupingSeparator)) {
    return null;
  }

  return `${integerPart.replaceAll(groupingSeparator, "")}.${fractionPart}`;
}

function normalizeSingleSeparator(compact: string, separator: string): string | null {
  const parts = compact.split(separator);

  if (parts.length === 2) {
    const integerPart = parts[0];
    const rightPart = parts[1];

    if (integerPart === undefined || rightPart === undefined || integerPart.length === 0 || rightPart.length === 0) {
      return null;
    }

    if (rightPart.length === 3 && integerPart.length <= 3) {
      return `${integerPart}${rightPart}`;
    }

    if (!hasValidFraction(rightPart)) {
      return null;
    }

    return `${integerPart}.${rightPart}`;
  }

  if (hasValidGroupedInteger(compact, separator)) {
    return compact.replaceAll(separator, "");
  }

  return null;
}

function hasValidGroupedInteger(value: string, separator: string): boolean {
  const parts = value.split(separator);
  let index = 0;

  for (const part of parts) {
    if (part.length === 0 || !/^\d+$/u.test(part)) {
      return false;
    }

    if (index === 0) {
      if (part.length > 3) {
        return false;
      }
    } else if (part.length !== 3) {
      return false;
    }

    index += 1;
  }

  return parts.length > 1;
}

function hasValidFraction(value: string): boolean {
  return /^\d{1,6}$/u.test(value);
}

function countOccurrences(value: string, needle: string): number {
  let count = 0;

  for (const character of value) {
    if (character === needle) {
      count += 1;
    }
  }

  return count;
}
