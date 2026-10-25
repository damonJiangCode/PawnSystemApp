import { useState, useImperativeHandle, forwardRef, useEffect } from "react";
import { Box, Typography, Button, MenuItem, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import type { ID } from "../../../../../../shared/models/client.model";
import { clientApi } from "../../../client.api";
import { formatClientIdType } from "../../../utils/clientDisplay.ts";

export interface IDFieldsRef {
  getIDs: () => ID[];
}

interface IDFieldsProps {
  ids: ID[];
  error?: string;
  onIdsChange?: () => void;
}

const IDFields = forwardRef<IDFieldsRef, IDFieldsProps>(
  ({ ids, error, onIdsChange }, ref) => {
    const [identifications, setIdentifications] = useState<ID[]>(ids);
    const [idTypes, setIdTypes] = useState<string[]>([]);
    const [idTypeLoadError, setIdTypeLoadError] = useState("");
    const showFieldErrors = Boolean(error);

    useImperativeHandle(ref, () => ({
      getIDs: () => identifications,
    }));

    useEffect(() => {
      let active = true;

      const fetchIdTypes = async () => {
        try {
          const types = await clientApi.loadIdTypes();
          if (active) {
            setIdTypes(types);
          }
        } catch (err) {
          if (!active) return;
          console.error("Failed to load ID types", err);
          setIdTypeLoadError(
            err instanceof Error ? err.message : "Unable to load ID types.",
          );
        }
      };

      void fetchIdTypes();

      return () => {
        active = false;
      };
    }, []);

    useEffect(() => {
      setIdentifications(ids);
    }, [ids]);

    useEffect(() => {
      if (identifications.length >= 2) return;
      setIdentifications((prev) => {
        const next = [...prev];
        while (next.length < 2) {
          next.push({ id_type: "", id_value: "" });
        }
        return next;
      });
    }, [identifications.length]);

    const handleAdd = () => {
      onIdsChange?.();
      setIdentifications([...identifications, { id_type: "", id_value: "" }]);
    };

    const handleRemove = (index: number) => {
      onIdsChange?.();
      setIdentifications(identifications.filter((_, i) => i !== index));
    };

    const handleUpdate = (index: number, field: keyof ID, value: string) => {
      onIdsChange?.();
      setIdentifications((prev) =>
        prev.map((element, i) =>
          i === index ? { ...element, [field]: value } : element,
        ),
      );
    };

    const getTypeError = (id: ID) =>
      showFieldErrors && !id.id_type?.trim() ? "ID type is required." : "";

    const getNumberError = (id: ID) =>
      showFieldErrors && !id.id_value?.trim() ? "ID number is required." : "";

    return (
      <Box sx={{ pt: 1.5, borderTop: 1, borderColor: "divider" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="subtitle1">ID information</Typography>
          <Button
            style={{ textTransform: "none" }}
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add ID
          </Button>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 1.5,
            mt: 1.5,
          }}
        >
          {identifications.map((element, i) => {
            const typeError = getTypeError(element);
            const numberError = getNumberError(element);
            return (
              <Box
                key={i}
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    identifications.length > 2
                      ? "minmax(0, 1fr) minmax(0, 1.25fr) auto"
                      : "minmax(0, 1fr) minmax(0, 1.25fr)",
                  gap: 1,
                  alignItems: "start",
                  minWidth: 0,
                }}
              >
                <TextField
                  select
                  fullWidth
                  size="small"
                  name="id_type"
                  label="ID type"
                  value={
                    idTypes.includes(element.id_type) ? element.id_type : ""
                  }
                  error={Boolean(typeError)}
                  helperText={typeError || " "}
                  onChange={(e) => handleUpdate(i, "id_type", e.target.value)}
                >
                  <MenuItem value="">Select an ID type</MenuItem>
                  {idTypes.map((type, type_idx) => (
                    <MenuItem key={type_idx} value={type}>
                      {formatClientIdType(type)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  size="small"
                  name="id_value"
                  label="ID number"
                  value={element.id_value || ""}
                  error={Boolean(numberError)}
                  helperText={numberError || " "}
                  onChange={(e) => handleUpdate(i, "id_value", e.target.value)}
                />
                {identifications.length > 2 && (
                  <Button
                    style={{ textTransform: "none" }}
                    size="small"
                    color="error"
                    onClick={() => handleRemove(i)}
                  >
                    <DeleteIcon />
                  </Button>
                )}
              </Box>
            );
          })}
        </Box>
        <Typography
          variant="body2"
          color={error || idTypeLoadError ? "error" : "text.secondary"}
          sx={{ mt: 0, minHeight: error || idTypeLoadError ? 20 : 0 }}
        >
          {error || idTypeLoadError || ""}
        </Typography>
      </Box>
    );
  },
);

export default IDFields;
