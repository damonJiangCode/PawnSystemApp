import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import type {
  ItemCategory,
  ItemCategoryTree,
  ItemSubcategory,
} from "../../../../../shared/models/item-category.model";
import { itemApi } from "../../items/item.api";
import WindowLayout from "../../../windows/WindowLayout";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import ItemCategoryAddDialog from "./ItemCategoryAddDialog";

const byStateThenName =
  <T extends { is_active: boolean }>(name: (item: T) => string) =>
  (a: T, b: T) =>
    Number(b.is_active) - Number(a.is_active) || name(a).localeCompare(name(b));
const sortCategories = (categories: ItemCategoryTree[]) =>
  [...categories]
    .map((category) => ({
      ...category,
      subcategories: [...category.subcategories].sort(
        byStateThenName<ItemSubcategory>((item) => item.subcategory_name),
      ),
    }))
    .sort(byStateThenName<ItemCategoryTree>((item) => item.category_name));

type Pending =
  | { kind: "category"; record: ItemCategory }
  | { kind: "subcategory"; record: ItemSubcategory; categoryName: string };

export default function ItemCategoryReferenceWindow() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<ItemCategoryTree[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addParent, setAddParent] = useState<ItemCategory | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpanded = (categoryId: number, open?: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open ?? !next.has(categoryId)) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  useEffect(() => {
    let active = true;
    itemApi
      .loadAllCategories()
      .then((result) => {
        if (active) setCategories(sortCategories(result));
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load item categories.",
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
  const run = async (key: string, action: () => Promise<string>) => {
    if (updating) return;
    setUpdating(key);
    setError("");
    setMessage("");
    try {
      setMessage(await action());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update item category.",
      );
    } finally {
      setUpdating("");
    }
  };
  const setCategoryActive = (record: ItemCategory, isActive: boolean) =>
    run(`c${record.category_id}`, async () => {
      const saved = await itemApi.setCategoryActive(
        record.category_id,
        isActive,
      );
      setCategories((prev) =>
        sortCategories(
          prev.map((item) =>
            item.category_id === saved.category_id
              ? { ...item, ...saved }
              : item,
          ),
        ),
      );
      return `${saved.category_name} was ${isActive ? "activated" : "deactivated"}.`;
    });
  const setSubcategoryActive = (record: ItemSubcategory, isActive: boolean) =>
    run(`s${record.subcategory_id}`, async () => {
      const saved = await itemApi.setSubcategoryActive(
        record.subcategory_id,
        isActive,
      );
      setCategories((prev) =>
        sortCategories(
          prev.map((item) =>
            item.category_id === saved.category_id
              ? {
                  ...item,
                  subcategories: item.subcategories.map((child) =>
                    child.subcategory_id === saved.subcategory_id
                      ? saved
                      : child,
                  ),
                }
              : item,
          ),
        ),
      );
      return `${saved.subcategory_name} was ${isActive ? "activated" : "deactivated"}.`;
    });
  const busy = loading || Boolean(updating);
  const query = search.trim().toLowerCase();
  const visible = categories.flatMap((category) => {
    if (!query || category.category_name.toLowerCase().includes(query))
      return [category];
    const subcategories = category.subcategories.filter((child) =>
      child.subcategory_name.toLowerCase().includes(query),
    );
    return subcategories.length ? [{ ...category, subcategories }] : [];
  });
  const stateButton = (key: string, isActive: boolean, onClick: () => void) => (
    <Button
      size="small"
      variant="outlined"
      color={isActive ? "error" : "success"}
      disabled={busy}
      onClick={onClick}
    >
      {updating === key ? "Saving..." : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
  return (
    <WindowLayout
      title="Item Categories"
      description="Add categories and subcategories, or change their state. Existing items keep their category when it is deactivated."
    >
      <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0 }}>
        <Stack direction="row" spacing={1}>
          <TextField
            fullWidth
            size="small"
            label="Search categories or subcategories"
            inputRef={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={busy}
          />
          <Button
            variant="contained"
            disabled={busy}
            onClick={() => {
              setAddParent(null);
              setAddOpen(true);
            }}
            sx={{ whiteSpace: "nowrap" }}
          >
            Add Category
          </Button>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        {loading && <Alert severity="info">Loading item categories...</Alert>}
        <Typography variant="body2">
          {visible.length} categories,{" "}
          {visible.reduce((sum, item) => sum + item.subcategories.length, 0)}{" "}
          subcategories. A subcategory is selectable only when it and its
          category are active.
        </Typography>
        <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <Stack spacing={1}>
            {!loading && visible.length === 0 && (
              <Alert severity="info">No item categories matched.</Alert>
            )}
            {visible.map((category) => {
              const open = Boolean(query) || expanded.has(category.category_id);
              return (
                <Paper
                  key={category.category_id}
                  variant="outlined"
                  sx={{
                    bgcolor: category.is_active ? "#eef6ff" : "#f4f4f4",
                    opacity: category.is_active ? 1 : 0.85,
                  }}
                >
                  <Box
                    sx={{
                      px: 1,
                      py: 0.75,
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <IconButton
                      size="small"
                      disabled={Boolean(query)}
                      aria-label={
                        open
                          ? `Collapse ${category.category_name}`
                          : `Expand ${category.category_name}`
                      }
                      aria-expanded={open}
                      onClick={() => toggleExpanded(category.category_id)}
                    >
                      {open ? (
                        <KeyboardArrowDownIcon fontSize="small" />
                      ) : (
                        <KeyboardArrowRightIcon fontSize="small" />
                      )}
                    </IconButton>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 800,
                        overflowWrap: "anywhere",
                        cursor: query ? "default" : "pointer",
                      }}
                      onClick={() => {
                        if (!query) toggleExpanded(category.category_id);
                      }}
                    >
                      {category.category_name} ({category.subcategories.length})
                      {!category.is_active && " (inactive)"}
                    </Typography>
                    <Button
                      size="small"
                      disabled={busy || !category.is_active}
                      onClick={() => {
                        setAddParent(category);
                        setAddOpen(true);
                      }}
                    >
                      Add Subcategory
                    </Button>
                    {stateButton(
                      `c${category.category_id}`,
                      category.is_active,
                      () => {
                        if (category.is_active)
                          setPending({ kind: "category", record: category });
                        else void setCategoryActive(category, true);
                      },
                    )}
                  </Box>
                  <Collapse in={open} unmountOnExit>
                    <Stack spacing={0.5} sx={{ px: 1, pb: 0.75, pl: 6 }}>
                      {category.subcategories.length === 0 && (
                        <Typography variant="caption" color="text.secondary">
                          No subcategories.
                        </Typography>
                      )}
                      {category.subcategories.map((child) => (
                        <Box
                          key={child.subcategory_id}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 1,
                            px: 1,
                            py: 0.25,
                            borderRadius: 1,
                            bgcolor: "background.paper",
                            opacity: child.is_active ? 1 : 0.7,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ overflowWrap: "anywhere" }}
                          >
                            {child.subcategory_name}
                            {!child.is_active && " (inactive)"}
                          </Typography>
                          {stateButton(
                            `s${child.subcategory_id}`,
                            child.is_active,
                            () => {
                              if (child.is_active)
                                setPending({
                                  kind: "subcategory",
                                  record: child,
                                  categoryName: category.category_name,
                                });
                              else void setSubcategoryActive(child, true);
                            },
                          )}
                        </Box>
                      ))}
                    </Stack>
                  </Collapse>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </Stack>
      <ItemCategoryAddDialog
        open={addOpen}
        parent={addParent}
        onClose={() => setAddOpen(false)}
        onSaveCategory={(category) => {
          setCategories((prev) =>
            sortCategories([...prev, { ...category, subcategories: [] }]),
          );
          setSearch("");
          setError("");
          setMessage(
            `${category.category_name} was added. Add its first subcategory.`,
          );
          setAddParent(category);
          toggleExpanded(category.category_id, true);
        }}
        onSaveSubcategory={(subcategory) => {
          const parent = categories.find(
            (item) => item.category_id === subcategory.category_id,
          );
          toggleExpanded(subcategory.category_id, true);
          setCategories((prev) =>
            sortCategories(
              prev.map((item) =>
                item.category_id === subcategory.category_id
                  ? {
                      ...item,
                      subcategories: [...item.subcategories, subcategory],
                    }
                  : item,
              ),
            ),
          );
          setSearch("");
          setError("");
          setMessage(
            `${subcategory.subcategory_name} was added to ${parent?.category_name ?? "the category"}.`,
          );
          setAddOpen(false);
        }}
      />
      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pending?.kind === "subcategory"
            ? "Deactivate subcategory"
            : "Deactivate category"
        }
        confirmLabel="Deactivate"
        message={
          !pending
            ? ""
            : pending.kind === "category"
              ? `Deactivate ${pending.record.category_name}? Existing items keep it. Staff cannot select any of its subcategories for new items. Subcategory states are kept.`
              : `Deactivate ${pending.record.subcategory_name} in ${pending.categoryName}? Existing items keep it. Staff cannot select it for new items.`
        }
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (pending?.kind === "category")
            void setCategoryActive(pending.record, false);
          else if (pending) void setSubcategoryActive(pending.record, false);
          setPending(null);
        }}
      />
    </WindowLayout>
  );
}
