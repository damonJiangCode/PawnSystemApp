import React from "react";
import { Box, Tooltip } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface CellTooltipProps {
  value?: string | number | null;
  title?: string;
  fallback?: string;
  sx?: SxProps<Theme>;
}

const CellTooltip: React.FC<CellTooltipProps> = ({
  value,
  title,
  fallback = "",
  sx,
}) => {
  const displayValue =
    value === null || value === undefined || value === ""
      ? fallback
      : String(value);
  const tooltipTitle = title ?? displayValue;

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Box
        component="span"
        sx={{
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          width: "100%",
          ...sx,
        }}
      >
        {displayValue}
      </Box>
    </Tooltip>
  );
};

export default CellTooltip;
