import React from "react";
import { Box, Tabs, Tab, Paper } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import TopBar from "./shell/TopBar";
import ClientPage from "../modules/clients/pages/ClientPage";
import TransactionPage from "../modules/transactions/pages/TransactionPage";
import HistoryPage from "../modules/history/pages/HistoryPage";
import { useWorkspaceLayout } from "./useWorkspaceLayout";

interface MainTabPanelProps {
  active: boolean;
  children: React.ReactNode;
}

const MainTabPanel: React.FC<MainTabPanelProps> = ({ active, children }) => {
  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        height: "100%",
        visibility: active ? "visible" : "hidden",
        pointerEvents: active ? "auto" : "none",
      }}
    >
      {children}
    </Box>
  );
};

const WorkspaceLayout: React.FC = () => {
  const lastNameSearchInputRef = React.useRef<HTMLInputElement>(null);
  const { state, actions } = useWorkspaceLayout();
  const {
    currentTab,
    searchFirstName,
    searchLastName,
    searchDateOfBirth,
    searchRequestKey,
    selectedClient,
    incomingTransactionTicket,
    focusTicketNumber,
    focusRequestId,
    historyRefreshKey,
    historyActivationKey,
    transactionRefreshKey,
  } = state;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar
        lastNameInputRef={lastNameSearchInputRef}
        onSearch={actions.handleSearch}
        onBirthdaySearch={actions.handleBirthdaySearch}
        onClear={actions.handleClear}
        onPayment={actions.handlePayment}
        onTicketSearch={actions.handleOpenTicketSearch}
        onItemSearch={actions.handleOpenItemSearch}
      />
      <Paper
        elevation={3}
        sx={{
          mx: 1.5,
          my: 0.5,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          borderRadius: 2.5,
          backgroundColor: "#dce8ff",
          border: "1px solid rgba(25, 118, 210, 0.22)",
          p: 0.5,
          boxShadow:
            "0 12px 32px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255,255,255,0.25) inset",
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_e, newVal) => actions.handleTabChange(newVal)}
          variant="fullWidth"
          sx={{
            px: 0.35,
            pt: 0.35,
            minHeight: "unset",
            "& .MuiTabs-indicator": {
              display: "none",
            },
            "& .MuiTab-root": {
              minHeight: 8,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              color: "#45658f",
              fontWeight: 800,
            },
            "& .MuiTab-root.Mui-selected": {
              color: "primary.dark",
              backgroundColor: "#ffffff",
              border: "1px solid rgba(25, 118, 210, 0.14)",
              borderBottomColor: "#ffffff",
              boxShadow: "0 -1px 0 rgba(25, 118, 210, 0.16)",
              mb: "-1px",
              position: "relative",
              zIndex: 1,
            },
          }}
        >
          <Tab
            icon={<PersonOutlineIcon fontSize="small" />}
            iconPosition="start"
            label="Client"
          />
          <Tab
            icon={<ReceiptLongIcon fontSize="small" />}
            iconPosition="start"
            label="Transaction"
          />
          <Tab
            icon={<HistoryEduIcon fontSize="small" />}
            iconPosition="start"
            label="History"
          />
        </Tabs>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            position: "relative",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            mx: 0.5,
            mb: 0.5,
          }}
        >
          <MainTabPanel active={currentTab === 0}>
            <ClientPage
              onSearchDialogExited={() => {
                if (searchDateOfBirth) return;
                lastNameSearchInputRef.current?.focus();
                lastNameSearchInputRef.current?.select();
              }}
              isActive={currentTab === 0}
              searchFirstName={searchFirstName}
              searchLastName={searchLastName}
              searchDateOfBirth={searchDateOfBirth}
              searchRequestKey={searchRequestKey}
              activeClient={selectedClient}
              onClientSelected={actions.setSelectedClient}
            />
          </MainTabPanel>

          <MainTabPanel active={currentTab === 1}>
            <TransactionPage
              isActive={currentTab === 1}
              client={selectedClient ?? undefined}
              focusTicketNumber={focusTicketNumber}
              focusRequestId={focusRequestId}
              refreshKey={transactionRefreshKey}
              incomingTicket={incomingTransactionTicket}
              onSelectedTicketChange={actions.setSelectedTransactionTicket}
              onClientSoldTicket={actions.handleClientSoldTicket}
              onClientHoldUpdated={actions.handleClientHoldUpdated}
            />
          </MainTabPanel>

          <MainTabPanel active={currentTab === 2}>
            <HistoryPage
              isActive={currentTab === 2}
              client={selectedClient ?? undefined}
              clientNumber={selectedClient?.client_number}
              clientLastName={selectedClient?.last_name}
              clientFirstName={selectedClient?.first_name}
              clientMiddleName={selectedClient?.middle_name}
              focusTicketNumber={focusTicketNumber}
              focusRequestId={focusRequestId}
              refreshKey={historyRefreshKey}
              activationKey={historyActivationKey}
              onRepawnCreated={actions.handleRepawnCreated}
              onReverseCompleted={actions.handleTicketReversed}
            />
          </MainTabPanel>
        </Box>
      </Paper>
    </Box>
  );
};

export default WorkspaceLayout;
