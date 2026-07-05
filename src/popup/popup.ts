import { parseExtensionResponse } from "../application/messages.js";
import type { ExtensionResponse, PopupStateResponse } from "../application/messages.js";
import type { Settings } from "../application/settings.js";
import type { CurrencyDescriptor } from "../domain/currencyAmount.js";
import { DEFAULT_RATE_SOURCE_ID, isRateSourceId } from "../domain/rateSource.js";
import type { RateSourceDescriptor, RateSourceId } from "../domain/rateSource.js";

const enabledInput = requireElement("enabled", HTMLInputElement);
const sourceSelect = requireElement("source-select", HTMLSelectElement);
const currencyList = requireElement("currency-list", HTMLDivElement);
const currencyCount = requireElement("currency-count", HTMLElement);
const sourceName = requireElement("source-name", HTMLElement);
const sourceLink = requireElement("source-link", HTMLAnchorElement);
const rateDate = requireElement("rate-date", HTMLElement);
const fetchedAt = requireElement("fetched-at", HTMLElement);
const refreshRatesButton = requireElement("refresh-rates", HTMLButtonElement);
const statusText = requireElement("status", HTMLElement);

let currentState: PopupStateResponse | null = null;

enabledInput.addEventListener("change", () => {
  saveCurrentSettings().catch(showError);
});

sourceSelect.addEventListener("change", () => {
  saveCurrentSettings().catch(showError);
});

refreshRatesButton.addEventListener("click", () => {
  refreshRates().catch(showError);
});

localizePage();
loadPopupState().catch(showError);

function localizePage(): void {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.title = t("appName");

  for (const element of document.querySelectorAll("[data-i18n]")) {
    const key = element.getAttribute("data-i18n");
    const message = key === null ? "" : t(key);

    if (message.length > 0) {
      element.textContent = message;
    }
  }
}

function t(key: string): string {
  return chrome.i18n.getMessage(key);
}

async function loadPopupState(): Promise<void> {
  setStatus(t("statusLoadingSettings"));
  const response = await sendRequest({
    type: "get-popup-state"
  });
  renderPopupResponse(response);
  setStatus("");
}

async function refreshRates(): Promise<void> {
  refreshRatesButton.disabled = true;
  setStatus(t("statusRefreshing"));

  try {
    const response = await sendRequest({
      type: "refresh-rates"
    });
    renderPopupResponse(response);

    if (response.ok) {
      setStatus(t("statusRatesUpdated"));
    }
  } finally {
    refreshRatesButton.disabled = false;
  }
}

async function saveCurrentSettings(): Promise<void> {
  if (currentState === null) {
    return;
  }

  const settings = readSettingsFromForm(currentState.availableCurrencies);
  const response = await sendRequest({
    settings,
    type: "save-settings"
  });
  renderPopupResponse(response);

  if (response.ok) {
    setStatus(t("statusSettingsSaved"));
  }
}

async function sendRequest(message: unknown): Promise<ExtensionResponse> {
  const rawResponse: unknown = await chrome.runtime.sendMessage(message);
  const response = parseExtensionResponse(rawResponse);

  if (response === null) {
    return {
      error: t("errorInvalidResponse"),
      ok: false
    };
  }

  return response;
}

function renderPopupResponse(response: ExtensionResponse): void {
  if (!response.ok) {
    showError(response.error);
    return;
  }

  if (response.payload.type !== "popup-state") {
    return;
  }

  currentState = response.payload;
  renderSources(response.payload.availableSources, response.payload.settings.source);
  renderSettings(response.payload.settings, response.payload.availableCurrencies);
  renderSource(response.payload);
}

function renderSources(availableSources: readonly RateSourceDescriptor[], current: RateSourceId): void {
  sourceSelect.replaceChildren();

  for (const source of availableSources) {
    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.name;
    option.selected = source.id === current;
    sourceSelect.append(option);
  }
}

function renderSettings(settings: Settings, availableCurrencies: readonly CurrencyDescriptor[]): void {
  enabledInput.checked = settings.enabled;
  currencyList.replaceChildren();

  for (const currency of availableCurrencies) {
    const label = document.createElement("label");
    label.className = "xrate-currency";
    const localizedName = t("currency_" + currency.code.toLowerCase());
    label.title = localizedName.length > 0 ? localizedName : currency.displayName;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "xrate-currency__input";
    checkbox.value = currency.code;
    checkbox.checked = settings.targetCurrencies.includes(currency.code);
    checkbox.addEventListener("change", () => {
      updateCurrencyCount();
      saveCurrentSettings().catch(showError);
    });

    const code = document.createElement("span");
    code.className = "xrate-currency__code";
    code.textContent = currency.code;

    label.append(checkbox, code);

    // Show the glyph only when it adds information (skip "AUD AUD" style repeats).
    if (currency.symbol !== currency.code) {
      const symbol = document.createElement("span");
      symbol.className = "xrate-currency__symbol";
      symbol.textContent = currency.symbol;
      label.append(symbol);
    }

    currencyList.append(label);
  }

  updateCurrencyCount();
}

function updateCurrencyCount(): void {
  const checkboxes = currencyList.querySelectorAll("input[type='checkbox']");
  const selected = currencyList.querySelectorAll("input[type='checkbox']:checked");
  currencyCount.textContent = `${selected.length} / ${checkboxes.length}`;
}

function renderSource(state: PopupStateResponse): void {
  if (state.source === null) {
    sourceName.textContent = t("sourceNone");
    rateDate.textContent = t("noData");
    fetchedAt.textContent = t("noData");
    sourceLink.href = "#";
    return;
  }

  sourceName.textContent = state.source.sourceName;
  sourceLink.href = state.source.sourceUrl;
  rateDate.textContent = state.source.rateDate;
  fetchedAt.textContent = formatDateTime(state.source.fetchedAtIso);
}

function readSettingsFromForm(availableCurrencies: readonly CurrencyDescriptor[]): Settings {
  const selectedCurrencies: string[] = [];
  const knownCurrencyCodes = new Set(availableCurrencies.map((currency) => currency.code));

  for (const input of currencyList.querySelectorAll("input[type='checkbox']")) {
    if (input instanceof HTMLInputElement && input.checked && knownCurrencyCodes.has(input.value)) {
      selectedCurrencies.push(input.value);
    }
  }

  return {
    enabled: enabledInput.checked,
    source: isRateSourceId(sourceSelect.value) ? sourceSelect.value : DEFAULT_RATE_SOURCE_ID,
    targetCurrencies: selectedCurrencies
  };
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function setStatus(message: string): void {
  statusText.textContent = message;
}

function showError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  setStatus(message);
}

function requireElement<T extends HTMLElement>(id: string, constructor: { new (): T }): T {
  const element = document.getElementById(id);

  if (!(element instanceof constructor)) {
    throw new Error(`Missing popup element #${id}`);
  }

  return element;
}
