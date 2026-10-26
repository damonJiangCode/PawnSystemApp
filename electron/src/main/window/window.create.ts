import path from "path";
import type { Event as ElectronEvent } from "electron";

const { BrowserWindow } = require("electron/main") as typeof import("electron");

const preloadPath = path.resolve(process.cwd(), "electron/src/preload/index.cjs");

type CreateAppWindowInput = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  title?: string;
  showMenu?: boolean;
  focusOnShow?: boolean;
  url: string;
  failLogLabel?: string;
};

export const createAppWindow = ({
  width,
  height,
  x,
  y,
  minWidth,
  minHeight,
  title,
  showMenu = true,
  focusOnShow = true,
  url,
  failLogLabel = "window",
}: CreateAppWindowInput): Electron.BrowserWindow => {
  const window = new BrowserWindow({
    width,
    height,
    x,
    y,
    minWidth,
    minHeight,
    center: x === undefined && y === undefined,
    show: false,
    title,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  if (!showMenu) {
    window.setMenu(null);
  }

  window.once("ready-to-show", () => {
    if (focusOnShow) {
      window.show();
      window.focus();
      return;
    }

    window.showInactive();
  });

  window.webContents.on(
    "did-fail-load",
    (
      _event: ElectronEvent,
      errorCode: number,
      errorDescription: string,
      validatedURL: string,
    ) => {
      console.error(`[main] failed to load ${failLogLabel}`, {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );

  window.webContents.on("did-finish-load", () => {
    if (focusOnShow) {
      window.show();
      return;
    }

    window.showInactive();
  });

  void window.loadURL(url);

  return window;
};
