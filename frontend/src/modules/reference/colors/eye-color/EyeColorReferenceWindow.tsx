import React from "react";
import { clientApi } from "../../../clients/client.api";
import type { WindowScreenProps } from "../../../../windows/windowRegistry";
import ColorReferenceWindow from "../color/ColorReferenceWindow";

const EyeColorReferenceWindow: React.FC<WindowScreenProps> = () => (
  <ColorReferenceWindow
    colorType="Eye"
    loadColors={clientApi.loadAllEyeColors}
    addColor={clientApi.addEyeColor}
    activateColor={clientApi.activateEyeColor}
    deactivateColor={clientApi.deactivateEyeColor}
  />
);

export default EyeColorReferenceWindow;
