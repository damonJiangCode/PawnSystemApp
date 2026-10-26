import React from "react";
import { Paper } from "@mui/material";
import type { Client } from "../../../../../../shared/models/client.model";
import {
  SIDE_ACTIONS_PANEL_WIDTH,
  SIDE_PANEL_WIDTH,
} from "../../../../shared/styles/layoutSizing";
import ClientActions from "./ClientActions";
import ClientImage from "./ClientImage";

interface ClientSidePanelProps {
  client: Client | null;
  onClientCreated?: (client: Client) => void;
  onClientUpdated?: (client: Client) => void;
}

const ClientSidePanel: React.FC<ClientSidePanelProps> = ({
  client,
  onClientCreated,
  onClientUpdated,
}) => {
  return (
    <Paper
      sx={{
        width: SIDE_PANEL_WIDTH,
        minWidth: 292,
        border: "1px solid",
        borderColor: "divider",
        minHeight: 0,
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: `minmax(0, 1fr) ${SIDE_ACTIONS_PANEL_WIDTH}px`,
        alignItems: "stretch",
        columnGap: 0.75,
        p: 0.75,
      }}
    >
      <ClientImage client={client} />
      <ClientActions
        client={client}
        onClientCreated={onClientCreated}
        onClientUpdated={onClientUpdated}
      />
    </Paper>
  );
};

export default ClientSidePanel;
