import React, { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import type { Client } from "../../../../../shared/models/client.model";
import ClientActionsLayout from "./shared/ClientActionsLayout";
import ClientAddEditDialog from "../dialogs/ClientAddEditDialog";

interface ClientActionsProps {
  client: Client | null;
  onClientCreated?: (client: Client) => void;
  onClientUpdated?: (client: Client) => void;
}

const ClientActions: React.FC<ClientActionsProps> = ({
  client,
  onClientCreated,
  onClientUpdated,
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <ClientActionsLayout
        actions={[
          {
            label: "Add Client",
            icon: <AddIcon />,
            onClick: () => setAddOpen(true),
          },
          {
            label: "Edit client",
            icon: <EditIcon />,
            disabled: !client?.client_number,
            onClick: () => setEditOpen(true),
          },
        ]}
      />

      {addOpen && (
        <ClientAddEditDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSave={(createdClient) => {
            onClientCreated?.(createdClient);
            setAddOpen(false);
          }}
        />
      )}

      {editOpen && client && (
        <ClientAddEditDialog
          clientExisted={client}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={(updatedClient) => {
            onClientUpdated?.(updatedClient);
            setEditOpen(false);
          }}
        />
      )}
    </>
  );
};

export default ClientActions;
