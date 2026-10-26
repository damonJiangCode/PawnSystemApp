import React from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Typography,
} from "@mui/material";
import ClientProfile from "../components/profile/ClientProfile";
import ClientsPanel from "../components/results/ClientsPanel";
import { CLIENT_RESULTS_HEIGHT } from "../layout/clientLayout";
import defaultClient from "../data/defaultClient";
import type { Client } from "../../../../../shared/models/client.model";
import { useClientPage } from "../hooks/useClientPage";

interface ClientPageProps {
  isActive?: boolean;
  searchFirstName: string;
  searchLastName: string;
  searchDateOfBirth?: string;
  searchRequestKey?: number;
  activeClient?: Client | null;
  onClientSelected?: (client: Client | null) => void;
  onSearchDialogExited?: () => void;
}

const ClientPage: React.FC<ClientPageProps> = ({
  isActive = true,
  searchFirstName,
  searchLastName,
  searchDateOfBirth = "",
  searchRequestKey = 0,
  activeClient,
  onClientSelected,
  onSearchDialogExited,
}) => {
  const { state, actions } = useClientPage({
    isActive,
    searchFirstName,
    searchLastName,
    searchDateOfBirth,
    searchRequestKey,
    activeClient,
    onClientSelected,
  });
  const { selectedClient, displayResults, loading, error, searchDialogOpen } =
    state;

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          height: "100%",
          maxWidth: 1600,
          mx: "auto",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 0.75,
            p: 1,
            pb: 1.25,
            minHeight: 0,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.25 }}>
            <ClientProfile
              client={selectedClient ?? defaultClient}
              onSaveNotes={actions.handleSaveClientNotes}
              placeholder={!selectedClient}
            />
          </Box>

          <Box
            sx={{
              flex: `0 0 ${CLIENT_RESULTS_HEIGHT}`,
              border: "1px solid",
              borderColor: "primary.main",
              borderRadius: 2,
              p: 1,
              backgroundColor: "background.paper",
              boxShadow:
                "0 0 0 1px rgba(25, 118, 210, 0.14), 0 10px 22px rgba(15, 23, 42, 0.10)",
              minHeight: 216,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            {loading && (
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                Searching...
              </Typography>
            )}
            {error && (
              <Typography color="error" sx={{ mb: 1 }}>
                {error}
              </Typography>
            )}
            <Box sx={{ flex: 1, minHeight: 0 }}>
              <ClientsPanel
                results={displayResults}
                selectedClient={selectedClient}
                onSelect={actions.setSelectedClient}
                onClientCreated={actions.handleClientCreated}
                onClientUpdated={actions.handleClientUpdated}
              />
            </Box>
          </Box>
        </Box>
      </Paper>
      <Dialog
        open={searchDialogOpen}
        onClose={actions.closeSearchDialog}
        disableRestoreFocus={!searchDateOfBirth}
        TransitionProps={{ onExited: onSearchDialogExited }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Client search</DialogTitle>
        <DialogContent>No client found.</DialogContent>
        <DialogActions>
          <Button
            style={{ textTransform: "none" }}
            autoFocus
            variant="contained"
            onClick={actions.closeSearchDialog}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ClientPage;
