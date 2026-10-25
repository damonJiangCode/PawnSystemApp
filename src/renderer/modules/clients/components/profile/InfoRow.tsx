import React from "react";
import { Box, Typography } from "@mui/material";
import {
  formatDisplayValue,
  formatShortDate,
} from "../../../../shared/utils/formatters";

interface InfoRowProps {
  label: string;
  value: unknown;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => {
  let displayValue = value;
  if (value instanceof Date) {
    displayValue = formatShortDate(value);
  }
  const renderedValue = formatDisplayValue(displayValue, "—");

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        py: 0.45,
        borderBottom: "2px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        sx={{
          flex: 2,
          color: "text.secondary",
          fontWeight: 100,
          fontSize: "0.80rem",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          flex: 3,
          color: "text.primary",
          fontWeight: 600,
          fontSize: "0.9rem",
        }}
      >
        {renderedValue}
      </Typography>
    </Box>
  );
};

export default InfoRow;
