import {
  openFeatureWindow,
  type OpenFeatureWindowInput,
} from "./window.feature.ts";

const managedWindows = new Map<string, Electron.BrowserWindow>();

export const getManagedWindow = (
  screen: string,
): Electron.BrowserWindow | null => {
  const window = managedWindows.get(screen);

  if (!window || window.isDestroyed()) {
    managedWindows.delete(screen);
    return null;
  }

  return window;
};

export const registerManagedWindow = (
  screen: string,
  window: Electron.BrowserWindow,
) => {
  managedWindows.set(screen, window);

  window.once("closed", () => {
    if (managedWindows.get(screen) === window) {
      managedWindows.delete(screen);
    }
  });

  return window;
};

export const focusManagedWindow = (window: Electron.BrowserWindow) => {
  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
};

export const openManagedWindow = (
  input: OpenFeatureWindowInput,
): { window: Electron.BrowserWindow; created: boolean } => {
  const existingWindow = getManagedWindow(input.screen);

  if (existingWindow) {
    focusManagedWindow(existingWindow);
    return { window: existingWindow, created: false };
  }

  const window = registerManagedWindow(input.screen, openFeatureWindow(input));

  return { window, created: true };
};
