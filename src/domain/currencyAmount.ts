export type CurrencyAmount = {
  readonly currencyCode: string;
  readonly originalText: string;
  readonly value: number;
};

export type CurrencyDescriptor = {
  readonly code: string;
  readonly displayName: string;
  readonly symbol: string;
};

export const CURRENCY_DESCRIPTORS: readonly CurrencyDescriptor[] = [
  { code: "RUB", displayName: "Российский рубль", symbol: "₽" },
  { code: "USD", displayName: "Доллар США", symbol: "$" },
  { code: "EUR", displayName: "Евро", symbol: "€" },
  { code: "GBP", displayName: "Фунт стерлингов", symbol: "£" },
  { code: "KRW", displayName: "Южнокорейская вона", symbol: "₩" },
  { code: "CNY", displayName: "Китайский юань", symbol: "CNY" },
  { code: "JPY", displayName: "Японская иена", symbol: "JPY" },
  { code: "KZT", displayName: "Казахстанский тенге", symbol: "₸" },
  { code: "TRY", displayName: "Турецкая лира", symbol: "₺" }
];

const SYMBOL_TO_CODE = new Map(CURRENCY_DESCRIPTORS.map((currency) => [currency.symbol, currency.code]));
const KNOWN_CODES = new Set(CURRENCY_DESCRIPTORS.map((currency) => currency.code));
const TOKEN_TO_CODE = new Map([
  ["RUBLE", "RUB"],
  ["RUBLES", "RUB"],
  ["TL", "TRY"],
  ["РУБ", "RUB"],
  ["РУБ.", "RUB"],
  ["РУБЛЕЙ", "RUB"],
  ["РУБЛЬ", "RUB"],
  ["РУБЛЯ", "RUB"]
]);

export function getCurrencyCodeForSymbol(symbol: string): string | null {
  const code = SYMBOL_TO_CODE.get(symbol);
  return code === undefined ? null : code;
}

export function isKnownCurrencyCode(code: string): boolean {
  return KNOWN_CODES.has(code);
}

export function getCurrencyCodeForToken(token: string): string | null {
  const normalizedToken = token.trim().normalize("NFKC").toUpperCase();

  if (isKnownCurrencyCode(normalizedToken)) {
    return normalizedToken;
  }

  const code = TOKEN_TO_CODE.get(normalizedToken);
  return code === undefined ? null : code;
}

export function listCurrencyDescriptors(): readonly CurrencyDescriptor[] {
  return CURRENCY_DESCRIPTORS;
}
