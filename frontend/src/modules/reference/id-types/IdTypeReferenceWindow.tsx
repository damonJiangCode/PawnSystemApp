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
import type { IdType } from "../../../../../shared/models/id-type.model";
import { clientApi } from "../../clients/client.api";
import WindowLayout from "../../../windows/WindowLayout";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import IdTypeAddDialog from "./IdTypeAddDialog";

const sortIdTypes = (types: IdType[]) =>
  [...types].sort(
    (a, b) =>
      Number(b.is_active) - Number(a.is_active) || a.type.localeCompare(b.type),
  );
export default function IdTypeReferenceWindow() {
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [types, setTypes] = React.useState<IdType[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [updating, setUpdating] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [pending, setPending] = React.useState<IdType | null>(null);
  React.useEffect(() => {
    let active = true;
    clientApi
      .loadAllIdTypes()
      .then((result) => {
        if (active) setTypes(sortIdTypes(result));
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error ? error.message : "Unable to load ID types.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const frame = requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, []);
  const setActive = async (item: IdType, isActive: boolean) => {
    if (updating) return;
    setUpdating(item.type);
    setError("");
    setMessage("");
    try {
      const saved = await (isActive
        ? clientApi.activateIdType(item.type)
        : clientApi.deactivateIdType(item.type));
      setTypes((prev) =>
        sortIdTypes(
          prev.map((type) => (type.type === saved.type ? saved : type)),
        ),
      );
      setMessage(
        `${saved.type} was ${isActive ? "activated" : "deactivated"}.`,
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to update ID type.",
      );
    } finally {
      setUpdating("");
    }
  };
  const busy = loading || Boolean(updating);
  const visible = types.filter((item) =>
    item.type.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <WindowLayout
      title="ID Types"
      description="Add, activate or deactivate ID types. Existing client IDs are retained when a type is deactivated."
    >
      <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            label="Search ID types"
            inputRef={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={busy}
          />
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => setAddOpen(true)}
            sx={{ whiteSpace: "nowrap" }}
          >
            Add ID Type
          </Button>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {loading && <Alert severity="info">Loading ID types...</Alert>}
        <Typography variant="body2">
          {visible.filter((item) => item.is_active).length} active,{" "}
          {visible.filter((item) => !item.is_active).length} inactive
        </Typography>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Stack spacing={0.75}>
            {!loading && visible.length === 0 && (
              <Alert severity="info">No ID types matched.</Alert>
            )}
            {visible.map((item) => (
              <Paper
                key={item.type}
                variant="outlined"
                sx={{
                  px: 1,
                  py: 0.75,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: 1,
                  bgcolor: item.is_active ? "#eef6ff" : "#f4f4f4",
                  opacity: item.is_active ? 1 : 0.75,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, overflowWrap: "anywhere" }}
                >
                  {item.type}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color={item.is_active ? "error" : "success"}
                  disabled={busy}
                  onClick={() => {
                    if (item.is_active) setPending(item);
                    else void setActive(item, true);
                  }}
                >
                  {updating === item.type
                    ? "Saving..."
                    : item.is_active
                      ? "Deactivate"
                      : "Activate"}
                </Button>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Stack>
      <IdTypeAddDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(item) => {
          setTypes((prev) => sortIdTypes([...prev, item]));
          setSearch("");
          setError("");
          setMessage(`${item.type} was added.`);
        }}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        title="Deactivate ID type"
        confirmLabel="Deactivate"
        message={
          pending
            ? `Deactivate ${pending.type}? Existing client IDs will remain. Staff cannot select it for new IDs.`
            : ""
        }
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending) void setActive(pending, false);
          setPending(null);
        }}
      />
    </WindowLayout>
  );
}
