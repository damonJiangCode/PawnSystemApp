import type { IpcMainInvokeEvent } from "electron";
import type {
  OpenItemSearchWindowInput,
  OpenPaymentWindowInput,
  OpenQuoteWindowInput,
} from "../../../../shared/payload-contracts/window.contract.ts";
import type { Item } from "../../../../shared/models/item.model.ts";
import { CHANNELS } from "../ipc/channels.ts";
import { openFeatureWindow } from "./window.feature.ts";
import { focusMainWindow } from "./window.main.ts";
import {
  getManagedWindow,
  openManagedWindow,
  registerManagedWindow,
} from "./window.manager.ts";

const { BrowserWindow, ipcMain } =
  require("electron/main") as typeof import("electron");

const ITEM_SEARCH_WINDOW_X = 24;
const ITEM_SEARCH_WINDOW_Y = 24;

let itemSearchWindowInput: OpenItemSearchWindowInput | null = null;

const focusWindowIfAvailable = (window: Electron.BrowserWindow | null) => {
  if (!window || window.isDestroyed()) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
};

const restoreFocusAfterInactiveShow = (
  window: Electron.BrowserWindow | null,
) => {
  focusWindowIfAvailable(window);
  setTimeout(() => focusWindowIfAvailable(window), 50);
  setTimeout(() => focusWindowIfAvailable(window), 250);
  setTimeout(() => focusWindowIfAvailable(window), 750);
};

const getItemRowId = (item: Item): number | string | undefined =>
  item.draft_id ?? item.item_number;

const mergeItemSearchInput = (
  currentInput: OpenItemSearchWindowInput | null,
  nextInput?: OpenItemSearchWindowInput,
): OpenItemSearchWindowInput | null => {
  if (!nextInput) {
    return currentInput;
  }

  const existingIds = new Set(
    (currentInput?.items ?? [])
      .map(getItemRowId)
      .filter((id): id is number | string => id !== undefined)
      .map(String),
  );
  const nextItems = nextInput.items.filter((item) => {
    const id = getItemRowId(item);
    return id === undefined || !existingIds.has(String(id));
  });

  return {
    sourceTicketNumber: nextInput.sourceTicketNumber,
    items: [...(currentInput?.items ?? []), ...nextItems],
    mode: nextInput.mode ?? currentInput?.mode ?? "search",
  };
};

export const registerWindowHandlers = () => {
  ipcMain.handle(CHANNELS.FOCUS_MAIN_WINDOW, async () => {
    focusMainWindow();
  });

  ipcMain.handle(
    CHANNELS.OPEN_PAYMENT_WINDOW,
    async (_event: IpcMainInvokeEvent, payload: OpenPaymentWindowInput) => {
      const { window, created } = openManagedWindow({
        screen: "payment",
        title: "Payment",
        width: 1180,
        height: 680,
        minWidth: 980,
        minHeight: 560,
        params: {
          clientNumber: payload.clientNumber,
          clientLastName: payload.clientLastName,
          clientFirstName: payload.clientFirstName,
        },
      });

      if (!created) {
        window.webContents.send(
          CHANNELS.NOTIFY_PAYMENT_WINDOW_INPUT_UPDATED,
          payload,
        );
      }
    },
  );

  ipcMain.handle(
    CHANNELS.OPEN_TICKET_SEARCH_WINDOW,
    async (_event: IpcMainInvokeEvent) => {
      openManagedWindow({
        screen: "ticket-search",
        title: "Search Ticket",
        description: "Search tickets by ticket number.",
        width: 720,
        height: 420,
      });
    },
  );

  ipcMain.handle(
    CHANNELS.OPEN_QUOTE_WINDOW,
    async (_event: IpcMainInvokeEvent, input: OpenQuoteWindowInput) => {
      const { window, created } = openManagedWindow({
        screen: "quote",
        title: "Quote",
        description: "Preview pickup and interest amounts for a client.",
        width: 920,
        height: 760,
        minWidth: 760,
        minHeight: 560,
        params: {
          clientNumber: input.clientNumber,
          clientLastName: input.clientLastName,
          clientFirstName: input.clientFirstName,
          clientMiddleName: input.clientMiddleName,
        },
      });

      if (!created) {
        window.webContents.send(
          CHANNELS.NOTIFY_QUOTE_WINDOW_INPUT_UPDATED,
          input,
        );
      }
    },
  );

  ipcMain.handle(
    CHANNELS.OPEN_ITEM_SEARCH_WINDOW,
    async (event: IpcMainInvokeEvent, input?: OpenItemSearchWindowInput) => {
      itemSearchWindowInput = mergeItemSearchInput(
        itemSearchWindowInput,
        input,
      );
      const focusWindow = input?.focusWindow !== false;
      const requesterWindow = BrowserWindow.fromWebContents(event.sender);

      const activeItemSearchWindow = getManagedWindow("item-search");

      if (activeItemSearchWindow) {
        activeItemSearchWindow.setPosition(
          ITEM_SEARCH_WINDOW_X,
          ITEM_SEARCH_WINDOW_Y,
        );
        if (focusWindow) {
          activeItemSearchWindow.show();
          activeItemSearchWindow.focus();
        } else {
          activeItemSearchWindow.showInactive();
          restoreFocusAfterInactiveShow(requesterWindow);
        }
        activeItemSearchWindow.webContents.send(
          CHANNELS.NOTIFY_ITEM_SEARCH_WINDOW_INPUT_UPDATED,
        );
        return;
      }

      const itemSearchWindow = registerManagedWindow(
        "item-search",
        openFeatureWindow({
          screen: "item-search",
          title: "Search Item",
          description: "Search by item number or item detail.",
          width: 1180,
          height: 660,
          x: ITEM_SEARCH_WINDOW_X,
          y: ITEM_SEARCH_WINDOW_Y,
          focusOnShow: focusWindow,
          minWidth: 1040,
          minHeight: 520,
        }),
      );

      itemSearchWindow.on("closed", () => {
        itemSearchWindowInput = null;
      });

      if (!focusWindow) {
        restoreFocusAfterInactiveShow(requesterWindow);
        itemSearchWindow.once("ready-to-show", () => {
          restoreFocusAfterInactiveShow(requesterWindow);
        });
        itemSearchWindow.webContents.once("did-finish-load", () => {
          restoreFocusAfterInactiveShow(requesterWindow);
        });
      }
    },
  );

  ipcMain.handle(CHANNELS.GET_ITEM_SEARCH_WINDOW_INPUT, async () => {
    return itemSearchWindowInput;
  });
};
