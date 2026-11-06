import { createAppWindow } from "./window.create.ts";
import { buildRendererUrl } from "./window.url.ts";

export type OpenFeatureWindowInput = {
  screen: string;
  title: string;
  description?: string;
  width?: number;
  height?: number;
  focusOnShow?: boolean;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  params?: Record<string, string | number | boolean | undefined>;
};

export const openFeatureWindow = ({
  screen,
  title,
  description,
  width = 720,
  height = 420,
  focusOnShow,
  x,
  y,
  minWidth = 560,
  minHeight = 320,
  params = {},
}: OpenFeatureWindowInput): Electron.BrowserWindow => {
  return createAppWindow({
    width,
    height,
    x,
    y,
    minWidth,
    minHeight,
    title,
    showMenu: false,
    focusOnShow,
    url: buildRendererUrl({
      window: "host",
      screen,
      params: {
        title,
        description,
        ...params,
      },
    }),
    failLogLabel: `${screen} window`,
  });
};
