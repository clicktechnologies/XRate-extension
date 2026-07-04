import { parseExtensionResponse } from "../application/messages.js";
import type { ExtensionResponse } from "../application/messages.js";
import { TooltipView } from "./tooltipView.js";

type SelectionSnapshot = {
  readonly rect: DOMRect;
  readonly text: string;
};

const SELECTION_DEBOUNCE_MS = 160;
const TOOLTIP_OFFSET_PX = 10;

class ContentSelectionController {
  private readonly tooltipView: TooltipView;
  private selectionTimerId: number | null = null;

  public constructor(tooltipView: TooltipView) {
    this.tooltipView = tooltipView;
  }

  public start(): void {
    document.addEventListener("selectionchange", this.handleSelectionChange);
    document.addEventListener("scroll", this.handleScroll, true);
    window.addEventListener("resize", this.handleScroll);
  }

  private readonly handleSelectionChange = (): void => {
    if (this.selectionTimerId !== null) {
      window.clearTimeout(this.selectionTimerId);
    }

    this.selectionTimerId = window.setTimeout(() => {
      this.selectionTimerId = null;
      this.updateFromSelection().catch((error: unknown) => {
        this.tooltipView.hide();
        console.error("XRate failed to convert selection", safeError(error));
      });
    }, SELECTION_DEBOUNCE_MS);
  };

  private readonly handleScroll = (): void => {
    this.tooltipView.hide();
  };

  private async updateFromSelection(): Promise<void> {
    const selection = readSelectionSnapshot();

    if (selection === null) {
      this.tooltipView.hide();
      return;
    }

    const response = await sendConvertSelectionRequest(selection.text);
    const position = tooltipPosition(selection.rect);

    if (!response.ok) {
      this.tooltipView.showError(response.error, position);
      return;
    }

    if (response.payload.type !== "conversion") {
      this.tooltipView.hide();
      return;
    }

    if (response.payload.conversions.length === 0) {
      this.tooltipView.showError(chrome.i18n.getMessage("tooltipNoCurrencies"), position);
      return;
    }

    this.tooltipView.show(response.payload, position);
  }
}

async function sendConvertSelectionRequest(selectedText: string): Promise<ExtensionResponse> {
  const rawResponse: unknown = await chrome.runtime.sendMessage({
    selectedText,
    type: "convert-selection"
  });
  const response = parseExtensionResponse(rawResponse);

  if (response === null) {
    return {
      error: chrome.i18n.getMessage("errorInvalidResponse"),
      ok: false
    };
  }

  return response;
}

function readSelectionSnapshot(): SelectionSnapshot | null {
  const selection = window.getSelection();

  if (selection === null || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }

  const text = selection.toString().trim();

  if (text.length === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) {
    return null;
  }

  return {
    rect,
    text
  };
}

function tooltipPosition(rect: DOMRect): { readonly left: number; readonly top: number } {
  const maxLeft = Math.max(8, window.innerWidth - 288);
  const left = Math.min(Math.max(rect.left, 8), maxLeft);
  const topCandidate = rect.bottom + TOOLTIP_OFFSET_PX;
  const top = topCandidate < window.innerHeight - 80 ? topCandidate : Math.max(8, rect.top - 80);

  return {
    left,
    top
  };
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

new ContentSelectionController(new TooltipView()).start();
