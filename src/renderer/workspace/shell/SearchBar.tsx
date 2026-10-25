import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";

interface SearchBarProps {
  lastNameInputRef?: React.RefObject<HTMLInputElement>;
  onSearch?: (params: { firstName: string; lastName: string }) => void;
  onBirthdaySearch?: (params: { dateOfBirth: string }) => void;
  onClear?: () => void;
}

const uppercaseSearchName = (value: string) => value.toUpperCase();

const SearchBar: React.FC<SearchBarProps> = ({
  lastNameInputRef: externalLastNameInputRef,
  onSearch,
  onBirthdaySearch,
  onClear,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [birthdayDialogOpen, setBirthdayDialogOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const validationTargetRef = useRef<"name" | "birthday">("name");
  const localLastNameInputRef = useRef<HTMLInputElement>(null);
  const lastNameInputRef = externalLastNameInputRef ?? localLastNameInputRef;
  const birthdayInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      lastNameInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName && !trimmedLastName) {
      validationTargetRef.current = "name";
      setValidationMessage("Please enter a first name or last name to search.");
      return;
    }

    onSearch?.({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
    });
    requestAnimationFrame(() => {
      lastNameInputRef.current?.focus();
      lastNameInputRef.current?.select();
    });
  };

  const handleClear = () => {
    setFirstName("");
    setLastName("");
    setBirthday("");
    onClear?.();
    requestAnimationFrame(() => {
      lastNameInputRef.current?.focus();
    });
  };

  const handleOpenBirthdayDialog = () => {
    setMenuAnchor(null);
    setBirthdayDialogOpen(true);
    requestAnimationFrame(() => {
      birthdayInputRef.current?.focus();
    });
  };

  const handleBirthdaySearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!birthday) {
      validationTargetRef.current = "birthday";
      setValidationMessage("Please enter a birthday to search.");
      return;
    }

    setFirstName("");
    setLastName("");
    setBirthdayDialogOpen(false);
    onBirthdaySearch?.({ dateOfBirth: birthday });
  };

  const closeValidationDialog = () => {
    const target = validationTargetRef.current;
    setValidationMessage("");
    requestAnimationFrame(() => {
      if (target === "birthday") {
        birthdayInputRef.current?.focus();
      } else {
        lastNameInputRef.current?.focus();
      }
    });
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSearch}
        sx={{ flex: "1 1 auto", minWidth: 0 }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <TextField
            inputRef={lastNameInputRef}
            name="lastName"
            size="small"
            label="Last Name"
            value={lastName}
            sx={{ width: { xs: 140, sm: 170, md: 190 } }}
            onChange={(e) => setLastName(uppercaseSearchName(e.target.value))}
          />
          <TextField
            name="firstName"
            size="small"
            label="First Name"
            value={firstName}
            sx={{ width: { xs: 140, sm: 170, md: 190 } }}
            onChange={(e) => setFirstName(uppercaseSearchName(e.target.value))}
          />

          <Button
            type="submit"
            size="small"
            variant="contained"
            startIcon={<SearchIcon />}
            sx={{ whiteSpace: "nowrap" }}
          >
            Search
          </Button>

          <Button
            size="small"
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            sx={{ whiteSpace: "nowrap" }}
          >
            Clear
          </Button>

          <Tooltip title="More search options">
            <IconButton
              size="small"
              aria-label="More search options"
              aria-controls={menuAnchor ? "client-search-menu" : undefined}
              aria-haspopup="menu"
              aria-expanded={menuAnchor ? "true" : undefined}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                width: 34,
                height: 34,
              }}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Menu
        id="client-search-menu"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleOpenBirthdayDialog}>
          <ListItemIcon>
            <CakeOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Search by Birthday</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        open={birthdayDialogOpen}
        onClose={() => setBirthdayDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <form onSubmit={handleBirthdaySearch}>
          <DialogTitle>Search by Birthday</DialogTitle>
          <DialogContent>
            <TextField
              inputRef={birthdayInputRef}
              type="date"
              label="Birthday"
              value={birthday}
              fullWidth
              margin="dense"
              onChange={(event) => setBirthday(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBirthdayDialogOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SearchIcon />}
            >
              Search
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(validationMessage)}
        onClose={closeValidationDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Search</DialogTitle>
        <DialogContent>{validationMessage}</DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeValidationDialog}>
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SearchBar;
