import type { CSSProperties } from "react";

const loadingStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  display: "grid",
  placeItems: "center",
  background: "#ffffff",
};

const spinnerStyle: CSSProperties = {
  width: 34,
  height: 34,
  boxSizing: "border-box",
  border: "3px solid #d8dee8",
  borderTopColor: "#1976d2",
  borderRadius: "50%",
  animation: "renderer-loading-spin 700ms linear infinite",
};

const RendererLoading = () => {
  return (
    <div style={loadingStyle} role="status" aria-label="Loading">
      <style>{`@keyframes renderer-loading-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={spinnerStyle} aria-hidden="true" />
    </div>
  );
};

export default RendererLoading;
