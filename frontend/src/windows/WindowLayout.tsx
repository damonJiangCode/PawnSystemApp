import React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export type WindowLayoutProps = {
  title: string;
  description: string;
  denseFooter?: boolean;
  footerActions?: React.ReactNode;
  children?: React.ReactNode;
};

const WindowLayout: React.FC<WindowLayoutProps> = ({
  title,
  description,
  denseFooter = false,
  footerActions,
  children,
}) => {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        p: 1,
        boxSizing: "border-box",
        bgcolor: "#f7f9fc",
        "@media print": {
          position: "static",
          width: "100%",
          height: "auto",
          p: 0,
          bgcolor: "#ffffff",
        },
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: "100%",
          height: "100%",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: denseFooter ? 0.75 : 2,
          borderRadius: 2,
          boxSizing: "border-box",
          overflow: "hidden",
          "@media print": {
            height: "auto",
            overflow: "visible",
            boxShadow: "none",
          },
        }}
      >
        <Box className="no-print" sx={{ displayPrint: "none" }}>
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            pt: denseFooter ? 0.5 : 1,
            "@media print": {
              flex: "none",
              minHeight: "auto",
              overflow: "visible",
              pt: 0,
            },
          }}
        >
          {children}
        </Box>

        <Stack
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          className="no-print"
          sx={{ displayPrint: "none", minHeight: denseFooter ? 28 : undefined }}
        >
          {footerActions}
          <Button
            variant="outlined"
            size={denseFooter ? "small" : "medium"}
            sx={denseFooter ? { minHeight: 26, py: 0.25 } : undefined}
            onClick={() => window.close()}
          >
            Close
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default WindowLayout;
