import React from "react";
import { Alert, Box } from "@mui/material";
import WindowLayout from "./WindowLayout";
import { windowRegistry } from "./windowRegistry";

const WindowView: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get("screen") ?? "";
  const title = params.get("title") || "Window";
  const description = params.get("description") || "";
  const ScreenComponent = windowRegistry[screen];

  if (ScreenComponent) {
    return <ScreenComponent screen={screen} />;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: 2,
        bgcolor: "#f7f9fc",
        boxSizing: "border-box",
      }}
    >
      <WindowLayout
        title={title}
        description={description || "No registered window screen was found."}
      >
        <Alert severity="warning">
          This window screen is not registered in the window registry.
        </Alert>
      </WindowLayout>
    </Box>
  );
};

export default WindowView;
