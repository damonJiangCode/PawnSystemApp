import {
  IMAGE_PROTOCOL,
  type ImageKind,
} from "../../../shared/payload-contracts/image.contract.ts";

export const getImageUrl = (
  kind: ImageKind,
  imagePath?: string,
): string | null => {
  if (!imagePath) {
    return null;
  }

  // New server uploads are read over HTTP; legacy photos retain their existing resolver.
  if (
    kind === "client" &&
    /^images\/clients\/[0-9a-f-]{36}\.(png|jpg)$/.test(imagePath)
  ) {
    const base = import.meta.env?.VITE_API_BASE_URL || "http://localhost:3000";
    const url = new URL(`${base.replace(/\/$/, "")}/client/images`);
    url.searchParams.set("path", imagePath);
    return url.toString();
  }

  const url = new URL(`${IMAGE_PROTOCOL}://${kind}/image`);
  url.searchParams.set("path", imagePath);
  return url.toString();
};
