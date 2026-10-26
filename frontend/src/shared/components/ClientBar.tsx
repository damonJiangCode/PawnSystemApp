import React from "react";
import { Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

interface ClientBarProps {
  client_last_name?: string;
  client_first_name?: string;
  client_middle_name?: string;
  is_active?: boolean;
  sx?: SxProps<Theme>;
}

const ClientBar: React.FC<ClientBarProps> = (props) => {
  const {
    client_last_name,
    client_first_name,
    client_middle_name,
    is_active,
    sx,
  } = props;
  const formattedClientName = [client_first_name, client_middle_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.toUpperCase())
    .join(" ");

  return (
    <Box
      sx={{
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        border: "1px solid rgba(25, 118, 210, 0.14)",
        borderRadius: 2,
        p: 1.1,
        boxShadow: 2,
        backgroundColor: "rgba(25, 118, 210, 0.03)",
        minHeight: 0,
        boxSizing: "border-box",
        ...sx,
      }}
    >
      {client_last_name && client_first_name && (
        <Typography
          variant="subtitle1"
          sx={{
            color: "text.primary",
            fontSize: "1rem",
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          {client_last_name.toUpperCase()}, {formattedClientName}
        </Typography>
      )}
      {is_active === false && (
        <Typography color="error" fontWeight={700} sx={{ ml: 2 }}>
          Deactivated — new tickets disabled
        </Typography>
      )}
    </Box>
  );
};

export default ClientBar;
