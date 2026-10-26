import { useEffect, useState } from "react";
import { getImageUrl } from "../../../shared/utils/imageUrl";

export const getClientImageUrl = (imagePath?: string) =>
  getImageUrl("client", imagePath);

export const useClientImage = (imagePath?: string) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);

    const imageUrl = getClientImageUrl(imagePath);

    if (!imageUrl) {
      return;
    }

    const image = new Image();
    image.onload = () => setSrc(imageUrl);
    image.onerror = () => setSrc(null);
    image.src = imageUrl;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [imagePath]);

  return src;
};
