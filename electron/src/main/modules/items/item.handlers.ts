import type { IpcMainInvokeEvent } from "electron";
import { itemService } from "./item.service.ts";
import { CHANNELS } from "../../ipc/channels.ts";

const { ipcMain } = require("electron/main") as typeof import("electron");

export const registerItemHandlers = () => {
  ipcMain.handle(
    CHANNELS.DELETE_ITEM,
    async (
      _event: IpcMainInvokeEvent,
      ticketNumber: number,
      itemNumber: number,
    ) => {
      return itemService.deleteItem(ticketNumber, itemNumber);
    },
  );

  ipcMain.handle(
    CHANNELS.LINK_ITEMS_TO_TICKET,
    async (
      _event: IpcMainInvokeEvent,
      ticketNumber: number,
      itemNumbers: number[],
    ) => {
      return itemService.linkItemsToTicket(ticketNumber, itemNumbers);
    },
  );
};
