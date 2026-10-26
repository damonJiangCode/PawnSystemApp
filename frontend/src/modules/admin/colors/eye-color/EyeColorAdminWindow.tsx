import React from "react";
import { clientApi } from "../../../clients/client.api";
import type { WindowScreenProps } from "../../../../windows/windowRegistry";
import ColorAdminWindow from "../color/ColorAdminWindow";

const EyeColorAdminWindow: React.FC<WindowScreenProps> = () => (
  <ColorAdminWindow
    colorType="Eye"
    loadColors={clientApi.loadEyeColorsForAdmin}
    addColor={clientApi.addEyeColor}
    activateColor={clientApi.activateEyeColor}
    deactivateColor={clientApi.deactivateEyeColor}
  />
);

export default EyeColorAdminWindow;
