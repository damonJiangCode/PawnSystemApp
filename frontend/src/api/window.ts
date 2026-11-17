import type { WindowApi } from "@pawnsystem/shared/payload-contracts/window.contract.ts";

declare global {
  interface Window {
    appAPI?: { window: WindowApi };
  }
}

// Electron's preload bridge opens and focuses windows. It is undefined in a
// plain browser, so callers use `getWindowApi()?.`.
export const getWindowApi = (): WindowApi | undefined => window.appAPI?.window;
