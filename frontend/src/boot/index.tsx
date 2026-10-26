import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import RendererApp from "./RendererApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RendererApp />
  </StrictMode>,
);
