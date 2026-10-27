import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { Location } from "../../../../../shared/models/location.model";
import { ticketApi } from "../../tickets/ticket.api";
import WindowLayout from "../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../windows/windowRegistry";
import LocationAddDialog from "./LocationAddDialog";

const sortLocations = (locations: Location[]) =>
  [...locations].sort(
    (a, b) =>
      Number(b.is_active) - Number(a.is_active) ||
      a.location.localeCompare(b.location),
  );

const LocationReferenceWindow: React.FC<WindowScreenProps> = () => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<Location | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchedCode, setSearchedCode] = React.useState("");
  const [allLocations, setAllLocations] = React.useState<Location[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [updatingCode, setUpdatingCode] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  const loadLocations = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = sortLocations(await ticketApi.loadAllLocations());
      setAllLocations(results);
      setLocations(results);
      setSearchInput("");
      setSearchedCode("");
    } catch (err) {
      console.error(err);
      setLocations([]);
      setError(
        err instanceof Error ? err.message : "Unable to load locations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const handleSearch = () => {
    const code = searchInput.trim().toUpperCase();
    const results = allLocations.filter((location) =>
      location.location.includes(code),
    );

    setSearchInput(code);
    setSearchedCode(code);
    setLocations(results);
    setError("");
    setMessage(
      code
        ? `${results.length} location(s) found for "${code}".`
        : `${results.length} location(s) loaded.`,
    );
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchedCode("");
    setLocations(allLocations);
    setError("");
    setMessage("");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleSetActive = async (location: Location, isActive: boolean) => {
    setUpdatingCode(location.location);
    setError("");
    setMessage("");

    try {
      const updated = await (isActive
        ? ticketApi.activateLocation(location.location)
        : ticketApi.deactivateLocation(location.location));
      const updateLocation = (existingLocation: Location) =>
        existingLocation.location === updated.location
          ? updated
          : existingLocation;

      setAllLocations((prev) => sortLocations(prev.map(updateLocation)));
      setLocations((prev) => sortLocations(prev.map(updateLocation)));
      setMessage(
        `${updated.location} was ${isActive ? "activated" : "deactivated"}.`,
      );
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update location status.",
      );
    } finally {
      setUpdatingCode("");
    }
  };

  const busy = loading || Boolean(updatingCode);
  const activeCount = locations.filter((location) => location.is_active).length;

  return (
    <WindowLayout
      title="Location"
      description="Add storage locations and activate or deactivate available locations."
    >
      <Stack spacing={1.25} sx={{ height: "100%", minHeight: 0, pt: 0.5 }}>
        <Stack spacing={1} sx={{ flexShrink: 0 }}>
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              handleSearch();
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "220px auto minmax(0, 1fr) auto",
                gap: 1,
                alignItems: "start",
              }}
            >
              <TextField
                inputRef={searchInputRef}
                fullWidth
                size="small"
                label="Location Code"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value.toUpperCase().slice(0, 4));
                  setError("");
                  setMessage("");
                }}
                inputProps={{ maxLength: 4 }}
                helperText="Partial location code is OK."
              />
              <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={busy}
                  sx={{ minWidth: 96 }}
                >
                  Search
                </Button>
                <Button
                  type="button"
                  variant="outlined"
                  disabled={busy}
                  onClick={handleClear}
                >
                  Clear
                </Button>
              </Stack>
              <Box />
              <Button
                type="button"
                variant="contained"
                color="success"
                disabled={busy}
                onClick={() => setAddDialogOpen(true)}
                sx={{ mt: 0.25, justifySelf: "end" }}
              >
                Add Location
              </Button>
            </Box>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {loading && <Alert severity="info">Loading locations...</Alert>}
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            {searchedCode ? `"${searchedCode}" Locations` : "Locations"} (
            {activeCount} active, {locations.length - activeCount} inactive)
          </Typography>

          {!loading && locations.length === 0 ? (
            <Alert severity="info">
              {searchedCode
                ? `No locations matched "${searchedCode}".`
                : "No locations have been added."}
            </Alert>
          ) : (
            <Stack spacing={0.5}>
              {locations.map((location) => (
                <Paper
                  key={location.location}
                  variant="outlined"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    columnGap: 1,
                    alignItems: "center",
                    width: "100%",
                    px: 1,
                    py: 0.75,
                    bgcolor: location.is_active ? "#eef6ff" : "#f4f4f4",
                    boxSizing: "border-box",
                    opacity: location.is_active ? 1 : 0.75,
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={800}>
                        {location.location}
                      </Typography>
                      <Chip
                        size="small"
                        label={location.is_active ? "Active" : "Inactive"}
                        color={location.is_active ? "success" : "default"}
                        variant="outlined"
                      />
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                    >
                      {location.description || "No description."}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    color={location.is_active ? "error" : "success"}
                    disabled={busy}
                    sx={{ minWidth: 92, justifySelf: "end" }}
                    onClick={() => {
                      if (location.is_active) setPending(location);
                      else void handleSetActive(location, true);
                    }}
                  >
                    {updatingCode === location.location
                      ? location.is_active
                        ? "Deactivating..."
                        : "Activating..."
                      : location.is_active
                        ? "Deactivate"
                        : "Activate"}
                  </Button>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <LocationAddDialog
          open={addDialogOpen}
          onClose={() => setAddDialogOpen(false)}
          onSave={(location) => {
            setAllLocations((prev) => sortLocations([...prev, location]));
            setLocations((prev) =>
              searchedCode && !location.location.includes(searchedCode)
                ? prev
                : sortLocations([...prev, location]),
            );
            setError("");
            setMessage(`${location.location} was added.`);
          }}
        />
      </Stack>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Deactivate location"
        message={
          pending
            ? `Deactivate ${pending.location}? It will no longer appear when selecting a location for tickets.`
            : ""
        }
        confirmLabel="Deactivate"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          void handleSetActive(pending, false);
          setPending(null);
        }}
      />
    </WindowLayout>
  );
};

export default LocationReferenceWindow;
