import React from "react";
import { Box } from "@mui/material";
import type { Client } from "../../../../../../shared/models/client.model";
import ClientsTable from "./ClientsTable";
import ClientSidePanel from "./ClientSidePanel";

interface ClientsPanelProps {
  results: Client[];
  selectedClient?: Client | null;
  onSelect: (client: Client) => void;
  onClientCreated?: (client: Client) => void;
  onClientUpdated?: (client: Client) => void;
}

const ClientsPanel: React.FC<ClientsPanelProps> = ({
  results,
  selectedClient,
  onSelect,
  onClientCreated,
  onClientUpdated,
}) => {
  const previewClient = selectedClient ?? results[0] ?? null;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.75,
        height: "100%",
        minHeight: 0,
        alignItems: "stretch",
        overflow: "hidden",
      }}
    >
      <Box sx={{ flex: "1 1 0", minWidth: 0, minHeight: 0 }}>
        <ClientsTable
          clients={results}
          selectedClient={selectedClient}
          onClientSelect={onSelect}
        />
      </Box>

      <ClientSidePanel
        client={previewClient}
        onClientCreated={onClientCreated}
        onClientUpdated={onClientUpdated}
      />
    </Box>
  );
};

export default ClientsPanel;
