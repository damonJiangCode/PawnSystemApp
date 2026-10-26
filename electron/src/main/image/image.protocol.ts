import { pathToFileURL } from "node:url";
import {
  IMAGE_PROTOCOL,
  type ImageKind,
} from "../../../../shared/payload-contracts/image.contract.ts";
import { imageStorage } from "../shared/imageStorage.ts";

const { net, protocol } = require("electron/main") as typeof import("electron");

export const registerImageScheme = () => {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: IMAGE_PROTOCOL,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
};

const isImageKind = (value: string): value is ImageKind =>
  value === "client" || value === "item";

export const registerImageProtocol = () => {
  protocol.handle(IMAGE_PROTOCOL, async (request) => {
    try {
      const url = new URL(request.url);
      const imageKind = url.hostname;
      const imagePath = url.searchParams.get("path");

      if (!isImageKind(imageKind) || !imagePath) {
        return new Response(null, { status: 400 });
      }

      const filePath = await imageStorage.resolveImageFile(
        imageKind,
        imagePath,
      );

      if (!filePath) {
        return new Response(null, { status: 404 });
      }

      return net.fetch(pathToFileURL(filePath).toString());
    } catch (error) {
      console.error("[main] failed to load image", error);
      return new Response(null, { status: 500 });
    }
  });
};
