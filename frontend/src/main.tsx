import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import LoadingScreen from "./components/LoadingScreen";

// The main window loads without a query; each popup window opens with `?window=<name>`.
const isPopupWindow = new URLSearchParams(window.location.search).has("window");

const Root = isPopupWindow
  ? lazy(() => import("./windows/PopupWindow"))
  : lazy(() => import("./main-window/MainWindow"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={<LoadingScreen />}>
      <Root />
    </Suspense>
  </StrictMode>,
);
