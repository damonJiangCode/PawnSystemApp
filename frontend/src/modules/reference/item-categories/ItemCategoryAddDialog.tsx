import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import type {
  ItemCategory,
  ItemSubcategory,
} from "../../../../../shared/models/item-category.model";
import { referenceApi } from "../reference.api";

// A null parent adds a category; a parent adds a subcategory under it.
type Props = {
  open: boolean;
  parent: ItemCategory | null;
  onClose: () => void;
  onSaveCategory: (category: ItemCategory) => void;
  onSaveSubcategory: (subcategory: ItemSubcategory) => void;
};
export default function ItemCategoryAddDialog({
  open,
  parent,
  onClose,
  onSaveCategory,
  onSaveSubcategory,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const label = parent ? "Subcategory" : "Category";
  useEffect(() => {
    if (!open) return;
    setName("");
    setError("");
    setSaving(false);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, parent]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!name.trim()) {
      setError(`${label} name is required.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (parent)
        onSaveSubcategory(
          await referenceApi.addItemSubcategory(parent.category_id, name),
        );
      else onSaveCategory(await referenceApi.addItemCategory(name));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : `Unable to add ${label.toLowerCase()}.`,
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <form onSubmit={save}>
        <DialogTitle>
          {parent
            ? `Add Subcategory to ${parent.category_name}`
            : "Add Category"}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            label={`${label} name`}
            inputRef={inputRef}
            fullWidth
            required
            size="small"
            value={name}
            disabled={saving}
            inputProps={{ maxLength: 500 }}
            helperText={
              parent
                ? "Names must be unique within this category."
                : "After adding, you can add its first subcategory."
            }
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Adding..." : "Add"}
          </Button>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
