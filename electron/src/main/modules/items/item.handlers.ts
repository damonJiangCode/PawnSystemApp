import type { IpcMainInvokeEvent } from "electron";
import type {
  ItemSearchInput,
  SaveItemInput,
} from "../../../../../shared/payload-contracts/item.contract.ts";
import { itemService } from "./item.service.ts";
import { CHANNELS } from "../../ipc/channels.ts";

const { ipcMain } = require("electron/main") as typeof import("electron");

export const registerItemHandlers = () => {
  ipcMain.handle(
    CHANNELS.GET_ITEMS,
    async (_event: IpcMainInvokeEvent, ticketNumber: number) => {
      return itemService.loadItems(ticketNumber);
    },
  );

  ipcMain.handle(
    CHANNELS.SEARCH_ITEMS,
    async (_event: IpcMainInvokeEvent, payload: ItemSearchInput) => {
      return itemService.searchItems(payload);
    },
  );

  ipcMain.handle(
    CHANNELS.ADD_ITEM,
    async (_event: IpcMainInvokeEvent, payload: SaveItemInput) => {
      return itemService.createItem(payload);
    },
  );

  ipcMain.handle(
    CHANNELS.UPDATE_ITEM,
    async (_event: IpcMainInvokeEvent, payload: SaveItemInput) => {
      return itemService.updateItem(payload);
    },
  );

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

  ipcMain.handle(
    CHANNELS.SAVE_ITEM_IMAGE,
    async (_event: IpcMainInvokeEvent, fileName: string, base64: string) => {
      return itemService.saveItemImage(fileName, base64);
    },
  );
};
