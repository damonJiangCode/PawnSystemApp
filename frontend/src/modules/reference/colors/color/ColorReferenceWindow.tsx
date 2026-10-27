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
import type { EyeColor } from "../../../../../../shared/models/eye-color.model";
import WindowLayout from "../../../../windows/WindowLayout";
import ColorAddDialog from "./ColorAddDialog";

type ColorReferenceWindowProps = {
  colorType: string;
  loadColors: () => Promise<EyeColor[]>;
  addColor: (color: string) => Promise<string>;
  activateColor: (color: string) => Promise<EyeColor>;
  deactivateColor: (color: string) => Promise<EyeColor>;
};

const sortColors = (colors: EyeColor[]) =>
  [...colors].sort(
    (a, b) =>
      Number(b.is_active) - Number(a.is_active) ||
      a.color.localeCompare(b.color),
  );

const ColorReferenceWindow: React.FC<ColorReferenceWindowProps> = ({
  colorType,
  loadColors,
  addColor,
  activateColor,
  deactivateColor,
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState<EyeColor | null>(null);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchedColor, setSearchedColor] = React.useState("");
  const [allColors, setAllColors] = React.useState<EyeColor[]>([]);
  const [colors, setColors] = React.useState<EyeColor[]>([]);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [updatingColor, setUpdatingColor] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, []);

  const loadAllColors = React.useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = sortColors(await loadColors());
      setAllColors(results);
      setColors(results);
      setSearchInput("");
      setSearchedColor("");
    } catch (err) {
      console.error(err);
      setAllColors([]);
      setColors([]);
      setError(
        err instanceof Error
          ? err.message
          : `Unable to load ${colorType.toLowerCase()} colors.`,
      );
    } finally {
      setLoading(false);
    }
  }, [colorType, loadColors]);

  React.useEffect(() => {
    void loadAllColors();
  }, [loadAllColors]);

  const handleSearch = () => {
    const search = searchInput.trim().toUpperCase();
    const results = allColors.filter((color) => color.color.includes(search));

    setSearchInput(search);
    setSearchedColor(search);
    setColors(results);
    setError("");
    setMessage(
      search
        ? `${results.length} color(s) found for "${search}".`
        : `${results.length} color(s) loaded.`,
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

  const handleDeactivate = async (color: EyeColor) => {
    setUpdatingColor(color.color);
    setError("");
    setMessage("");

    try {
      const deactivated = await deactivateColor(color.color);
      const updateColor = (existingColor: EyeColor) =>
        existingColor.color === deactivated.color ? deactivated : existingColor;
      setAllColors((prev) => sortColors(prev.map(updateColor)));
      setColors((prev) => sortColors(prev.map(updateColor)));
      setMessage(`${deactivated.color} was deactivated.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : `Unable to deactivate ${colorType.toLowerCase()} color.`,
      );
    } finally {
      setUpdatingColor("");
    }
  };

  const handleActivate = async (color: EyeColor) => {
    setUpdatingColor(color.color);
    setError("");
    setMessage("");

    try {
      const activated = await activateColor(color.color);
      const updateColor = (existingColor: EyeColor) =>
        existingColor.color === activated.color ? activated : existingColor;
      setAllColors((prev) => sortColors(prev.map(updateColor)));
      setColors((prev) => sortColors(prev.map(updateColor)));
      setMessage(`${activated.color} was activated.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : `Unable to activate ${colorType.toLowerCase()} color.`,
      );
    } finally {
      setUpdatingColor("");
    }
  };

  const busy = loading || Boolean(updatingColor);
  const activeCount = colors.filter((color) => color.is_active).length;

  return (
    <WindowLayout
      title={`${colorType} Color`}
      description={`Search, add, or deactivate ${colorType.toLowerCase()} color options.`}
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
                label={`${colorType} Color`}
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value.toUpperCase());
                  setError("");
                  setMessage("");
                }}
                helperText="Partial color name is OK."
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
                Add {colorType} Color
              </Button>
            </Box>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {loading && (
            <Alert severity="info">
              Loading {colorType.toLowerCase()} colors...
            </Alert>
          )}
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", pr: 0.5 }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
            {searchedColor
              ? `"${searchedColor}" Colors`
              : `${colorType} Colors`}{" "}
            ({activeCount} active, {colors.length - activeCount} inactive)
          </Typography>

          {!loading && colors.length === 0 ? (
            <Alert severity="info">
              {searchedColor
                ? `No colors matched "${searchedColor}".`
                : `No ${colorType.toLowerCase()} colors have been added.`}
            </Alert>
          ) : (
            <Stack spacing={0.5}>
              {colors.map((color) => (
                <Paper
                  key={color.color}
                  variant="outlined"
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    columnGap: 1,
                    alignItems: "center",
                    px: 1,
                    py: 0.75,
                    bgcolor: color.is_active ? "#eef6ff" : "#f4f4f4",
                    opacity: color.is_active ? 1 : 0.75,
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={800}>
                      {color.color}
                    </Typography>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    color={color.is_active ? "error" : "success"}
                    disabled={busy}
                    onClick={() =>
                      void (color.is_active
                        ? setPending(color)
                        : handleActivate(color))
                    }
                  >
                    {updatingColor === color.color
                      ? color.is_active
                        ? "Deactivating..."
                        : "Activating..."
                      : color.is_active
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
          colorType={colorType}
          uppercase
          onClose={() => setAddDialogOpen(false)}
          onAdd={addColor}
          onSave={(color) => {
            const newColor = { color, is_active: true };
            setAllColors((prev) => sortColors([...prev, newColor]));
            setColors((prev) =>
              searchedColor && !color.includes(searchedColor)
                ? prev
                : sortColors([...prev, newColor]),
            );
            setError("");
            setMessage(`${color} was added.`);
          }}
        />
      </Stack>
      <ConfirmDialog
        open={Boolean(pending)}
        title="Deactivate color"
        message={
          pending
            ? `Deactivate ${pending.color}? It will no longer appear when selecting a color for clients.`
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

export default ColorReferenceWindow;
