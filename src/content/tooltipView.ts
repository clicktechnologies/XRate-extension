import type { ConversionResponse } from "../application/messages.js";

type TooltipPosition = {
  readonly left: number;
  readonly top: number;
};

export class TooltipView {
  private readonly host: HTMLDivElement;
  private readonly shadowRoot: ShadowRoot;

  public constructor() {
    this.host = document.createElement("div");
    this.host.id = "xrate-tooltip-root";
    this.host.style.position = "fixed";
    this.host.style.zIndex = "2147483647";
    this.host.style.left = "0";
    this.host.style.top = "0";
    this.host.style.display = "none";
    this.host.style.pointerEvents = "none";
    this.shadowRoot = this.host.attachShadow({ mode: "closed" });
    this.shadowRoot.append(createStyles());
    document.documentElement.append(this.host);
  }

  public show(response: ConversionResponse, position: TooltipPosition): void {
    if (response.type !== "conversion") {
      this.hide();
      return;
    }

    const panel = document.createElement("section");
    panel.className = "tooltip";

    const title = document.createElement("p");
    title.className = "title";
    title.textContent = response.original.originalText;
    panel.append(title);

    const list = document.createElement("ul");

    for (const conversion of response.conversions) {
      const item = document.createElement("li");
      item.textContent = conversion.formattedAmount;
      list.append(item);
    }

    panel.append(list);

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = chrome.i18n.getMessage("tooltipMeta", [
      response.source.sourceName,
      response.source.rateDate
    ]);
    panel.append(meta);

    this.shadowRoot.replaceChildren(createStyles(), panel);
    this.host.style.transform = `translate(${Math.round(position.left)}px, ${Math.round(position.top)}px)`;
    this.host.style.display = "block";
  }

  public showError(message: string, position: TooltipPosition): void {
    const panel = document.createElement("section");
    panel.className = "tooltip";

    const text = document.createElement("p");
    text.className = "title";
    text.textContent = message;
    panel.append(text);

    this.shadowRoot.replaceChildren(createStyles(), panel);
    this.host.style.transform = `translate(${Math.round(position.left)}px, ${Math.round(position.top)}px)`;
    this.host.style.display = "block";
  }

  public hide(): void {
    this.host.style.display = "none";
  }
}

function createStyles(): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    .tooltip {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.24);
      color: #f8fafc;
      font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      max-width: min(280px, calc(100vw - 24px));
      padding: 10px 12px;
    }

    .title {
      font-weight: 700;
      margin: 0 0 6px;
      overflow-wrap: anywhere;
    }

    ul {
      display: grid;
      gap: 3px;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      white-space: nowrap;
    }

    .meta {
      color: #cbd5e1;
      font-size: 11px;
      margin: 7px 0 0;
    }
  `;
  return style;
}
