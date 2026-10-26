import React, { lazy, Suspense } from "react";
import RendererLoading from "./RendererLoading";

const WorkspaceApp = lazy(() => import("../workspace/WorkspaceApp"));
const WindowView = lazy(() => import("../windows/WindowView"));

const WINDOW_QUERY_PARAM = "window";

const isWindowView = (search = window.location.search): boolean => {
  return new URLSearchParams(search).has(WINDOW_QUERY_PARAM);
};

const RendererApp: React.FC = () => {
  const AppComponent = isWindowView() ? WindowView : WorkspaceApp;

  return (
    <Suspense fallback={<RendererLoading />}>
      <AppComponent />
    </Suspense>
  );
};

export default RendererApp;
