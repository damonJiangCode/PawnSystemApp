import React from "react";
import type { WindowScreenProps } from "../../../../windows/windowRegistry";
import ColorReferenceWindow from "../color/ColorReferenceWindow";
import { referenceApi } from "../../reference.api";

const EyeColorReferenceWindow: React.FC<WindowScreenProps> = () => (
  <ColorReferenceWindow
    colorType="Eye"
    loadColors={referenceApi.loadAllEyeColors}
    addColor={referenceApi.addEyeColor}
    activateColor={referenceApi.activateEyeColor}
    deactivateColor={referenceApi.deactivateEyeColor}
  />
);

export default EyeColorReferenceWindow;
