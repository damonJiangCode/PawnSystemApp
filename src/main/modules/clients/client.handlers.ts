import type { IpcMainInvokeEvent } from "electron";
import { clientReferenceService } from "./client-reference.service.ts";
import { CHANNELS } from "../../ipc/channels.ts";

const { ipcMain } = require("electron/main") as typeof import("electron");

export const registerClientHandlers = () => {
  ipcMain.handle(CHANNELS.GET_CITIES, async () =>
    clientReferenceService.loadCities(),
  );
  ipcMain.handle(CHANNELS.GET_HAIR_COLORS, async () =>
    clientReferenceService.loadHairColors(),
  );
  ipcMain.handle(CHANNELS.GET_ADMIN_HAIR_COLORS, async () =>
    clientReferenceService.loadHairColorsForAdmin(),
  );
  ipcMain.handle(CHANNELS.GET_EYE_COLORS, async () =>
    clientReferenceService.loadEyeColors(),
  );
  ipcMain.handle(CHANNELS.GET_ADMIN_EYE_COLORS, async () =>
    clientReferenceService.loadEyeColorsForAdmin(),
  );
  ipcMain.handle(
    CHANNELS.ADD_HAIR_COLOR,
    async (_event: IpcMainInvokeEvent, color: string) =>
      clientReferenceService.addHairColor(color),
  );
  ipcMain.handle(
    CHANNELS.ACTIVATE_HAIR_COLOR,
    async (_event: IpcMainInvokeEvent, color: string) =>
      clientReferenceService.activateHairColor(color),
  );
  ipcMain.handle(
    CHANNELS.DEACTIVATE_HAIR_COLOR,
    async (_event: IpcMainInvokeEvent, color: string) =>
      clientReferenceService.deactivateHairColor(color),
  );
  ipcMain.handle(
    CHANNELS.ADD_EYE_COLOR,
    async (_event: IpcMainInvokeEvent, color: string) =>
      clientReferenceService.addEyeColor(color),
  );
  ipcMain.handle(
    CHANNELS.ACTIVATE_EYE_COLOR,
    async (_event: IpcMainInvokeEvent, color: string) =>
      clientReferenceService.activateEyeColor(color),
  );
  ipcMain.handle(
    CHANNELS.DEACTIVATE_EYE_COLOR,
    async (_event: IpcMainInvokeEvent, color: string) =>
      clientReferenceService.deactivateEyeColor(color),
  );
  ipcMain.handle(CHANNELS.GET_ID_TYPES, async () =>
    clientReferenceService.loadIdTypes(),
  );
};
