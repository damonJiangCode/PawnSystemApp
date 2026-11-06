import { useEffect, useState } from "react";
import { getImageSrc } from "../../../shared/api/http";

export const useClientImage = (imageUrl?: string | null) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);

    const imageSrc = getImageSrc(imageUrl);

    if (!imageSrc) {
      return;
    }

    const image = new Image();
    image.onload = () => setSrc(imageSrc);
    image.onerror = () => setSrc(null);
    image.src = imageSrc;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [imageUrl]);

  return src;
};
