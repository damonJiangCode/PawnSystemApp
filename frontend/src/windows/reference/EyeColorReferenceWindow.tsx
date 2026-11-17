import React from "react";
import type { WindowScreenProps } from "../registry";
import ColorReferenceWindow from "./ColorReferenceWindow";
import { referenceApi } from "../../api/reference";

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
