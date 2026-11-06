import ConfirmDialog from "../../../../shared/components/ConfirmDialog";
import React from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { HairColor } from "../../../../../../shared/models/hair-color.model";
import WindowLayout from "../../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../../windows/windowRegistry";
import ColorAddDialog from "../color/ColorAddDialog";
import { referenceApi } from "../../reference.api";

const sortHairColors = (colors: HairColor[]) =>
  [...colors].sort(
    (a, b) =>
      Number(b.is_active) - Number(a.is_active) ||
      a.color.localeCompare(b.color),
  );

const HairColorReferenceWindow: React.FC<WindowScreenProps> = () => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<HairColor | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchedColor, setSearchedColor] = React.useState("");
  const [allColors, setAllColors] = React.useState<HairColor[]>([]);
  const [colors, setColors] = React.useState<HairColor[]>([]);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [updatingColor, setUpdatingColor] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const loadColors = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = sortHairColors(await referenceApi.loadAllHairColors());
      setAllColors(results);
      setColors(results);
      setSearchInput("");
      setSearchedColor("");
    } catch (err) {
      console.error(err);
      setAllColors([]);
      setColors([]);
      setError(
        err instanceof Error ? err.message : "Unable to load hair colors.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadColors();
  }, [loadColors]);

  const handleSearch = () => {
    const search = searchInput.trim().toUpperCase();
    const results = allColors.filter((color) => color.color.includes(search));

    setSearchInput(search);
    setSearchedColor(search);
    setColors(results);
    setError("");
    setMessage(
      search
        ? `${results.length} hair color(s) found for "${search}".`
        : `${results.length} hair color(s) loaded.`,
    );
  };

  const handleClear = () => {
    setSearchInput("");
    setSearchedColor("");
    setColors(allColors);
    setError("");
    setMessage("");
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleDeactivate = async (hairColor: HairColor) => {
    setUpdatingColor(hairColor.color);
    setError("");
    setMessage("");

    try {
      const deactivated = await referenceApi.deactivateHairColor(
        hairColor.color,
      );
      const updateColor = (existingColor: HairColor) =>
        existingColor.color === deactivated.color ? deactivated : existingColor;

      setAllColors((prev) => sortHairColors(prev.map(updateColor)));
      setColors((prev) => sortHairColors(prev.map(updateColor)));
      setMessage(`${deactivated.color} was deactivated.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to deactivate hair color.",
      );
    } finally {
      setUpdatingColor("");
    }
  };

  const handleActivate = async (hairColor: HairColor) => {
    setUpdatingColor(hairColor.color);
    setError("");
    setMessage("");

    try {
      const activated = await referenceApi.activateHairColor(hairColor.color);
      const updateColor = (existingColor: HairColor) =>
        existingColor.color === activated.color ? activated : existingColor;

      setAllColors((prev) => sortHairColors(prev.map(updateColor)));
      setColors((prev) => sortHairColors(prev.map(updateColor)));
      setMessage(`${activated.color} was activated.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to activate hair color.",
      );
    } finally {
      setUpdatingColor("");
    }
  };

  const busy = loading || Boolean(updatingColor);
  const activeCount = colors.filter((color) => color.is_active).length;

  return (
    <WindowLayout
      title="Hair Color"
      description="Search, add, or deactivate hair color options."
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
                label="Hair Color"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value.toUpperCase());
                  setError("");
                  setMessage("");
                }}
                helperText="Partial color name is OK."
              />
              <Stack direction="row" spacing={1} sx={{ mt: 0.25 }}>
                <Button type="submit" variant="contained" disabled={busy}>
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
                Add Hair Color
              </Button>
            </Box>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {loading && <Alert severity="info">Loading hair colors...</Alert>}
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            {searchedColor ? `"${searchedColor}" Hair Colors` : "Hair Colors"} (
            {activeCount} active, {colors.length - activeCount} inactive)
          </Typography>

          {!loading && colors.length === 0 ? (
            <Alert severity="info">
              {searchedColor
                ? `No hair colors matched "${searchedColor}".`
                : "No hair colors have been added."}
            </Alert>
          ) : (
            <Stack spacing={0.5}>
              {colors.map((hairColor) => (
                <Paper
                  key={hairColor.color}
                  variant="outlined"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    columnGap: 1,
                    alignItems: "center",
                    px: 1,
                    py: 0.75,
                    bgcolor: hairColor.is_active ? "#eef6ff" : "#f4f4f4",
                    opacity: hairColor.is_active ? 1 : 0.75,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={800}>
                      {hairColor.color}
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    color={hairColor.is_active ? "error" : "success"}
                    disabled={busy}
                    onClick={() =>
                      void (hairColor.is_active
                        ? setPending(hairColor)
                        : handleActivate(hairColor))
                    }
                  >
                    {updatingColor === hairColor.color
                      ? hairColor.is_active
                        ? "Deactivating..."
                        : "Activating..."
                      : hairColor.is_active
                        ? "Deactivate"
                        : "Activate"}
                  </Button>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <ColorAddDialog
          open={addDialogOpen}
          colorType="Hair"
          uppercase
          onClose={() => setAddDialogOpen(false)}
          onAdd={referenceApi.addHairColor}
          onSave={(color) => {
            const hairColor = { color, is_active: true };
            setAllColors((prev) => sortHairColors([...prev, hairColor]));
            setColors((prev) =>
              searchedColor && !color.includes(searchedColor)
                ? prev
                : sortHairColors([...prev, hairColor]),
            );
            setError("");
            setMessage(`${color} was added.`);
          }}
        />
      </Stack>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Deactivate hair color"
        message={
          pending
            ? `Deactivate ${pending.color}? It will no longer appear when selecting a hair color for clients.`
            : ""
        }
        confirmLabel="Deactivate"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (!pending) return;
          void handleDeactivate(pending);
          setPending(null);
        }}
      />
    </WindowLayout>
  );
};

export default HairColorReferenceWindow;
