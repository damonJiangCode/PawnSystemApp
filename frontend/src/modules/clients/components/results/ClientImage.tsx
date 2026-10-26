import React from "react";
import { Box, Typography } from "@mui/material";
import type { Client } from "../../../../../../shared/models/client.model";
import { useClientImage } from "../../hooks/useClientImage";
import { formatIsoDate } from "../../../../shared/utils/formatters";

interface ClientImageProps {
  client: Client | null;
}

const ClientImage: React.FC<ClientImageProps> = ({ client }) => {
  const imageSrc = useClientImage(client?.image_path);
  const photoDate = client?.image_updated_at
    ? formatIsoDate(client.image_updated_at)
    : "";

  return (
    <Box
      sx={{
        width: "100%",
        aspectRatio: "1 / 1",
        minWidth: 0,
        maxHeight: "100%",
        alignSelf: "center",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.35,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          width: "100%",
          textAlign: "center",
          fontSize: 11,
          lineHeight: 1.1,
          height: 13,
          flexShrink: 0,
        }}
      >
        {client?.image_path
          ? `Photo: ${photoDate || "date unknown"}`
          : "Photo: none"}
      </Typography>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageSrc ? (
          <Box
            component="img"
            src={imageSrc}
            alt="Client"
            sx={{
              height: "100%",
              maxWidth: "100%",
              aspectRatio: "1 / 1",
              objectFit: "cover",
              borderRadius: 0.75,
            }}
          />
        ) : (
          <Box
            sx={{
              height: "100%",
              maxWidth: "100%",
              aspectRatio: "1 / 1",
              backgroundColor: "#f3f4f6",
              borderRadius: 0.75,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography color="text.secondary">No Image</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ClientImage;
