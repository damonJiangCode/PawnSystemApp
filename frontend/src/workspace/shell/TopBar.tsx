import React from "react";
import { Box } from "@mui/material";
import SearchBar from "./SearchBar";
import SideButtons from "./SideButtons";

interface TopBarProps {
  lastNameInputRef?: React.RefObject<HTMLInputElement>;
  onSearch?: (params: { firstName: string; lastName: string }) => void;
  onBirthdaySearch?: (params: { dateOfBirth: string }) => void;
  onClear?: () => void;
  onPayment?: () => void;
  onTicketSearch?: () => void;
  onItemSearch?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  lastNameInputRef,
  onSearch,
  onBirthdaySearch,
  onClear,
  onPayment,
  onTicketSearch,
  onItemSearch,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 1.5,
        flexWrap: "nowrap",
        px: 1.5,
        py: 1,
        minWidth: 0,
      }}
    >
      <SearchBar
        lastNameInputRef={lastNameInputRef}
        onSearch={onSearch}
        onBirthdaySearch={onBirthdaySearch}
        onClear={onClear}
      />
      <SideButtons
        onPayment={onPayment}
        onTicketSearch={onTicketSearch}
        onItemSearch={onItemSearch}
      />
    </Box>
  );
};

export default TopBar;
