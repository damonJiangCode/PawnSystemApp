import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import type { ItemCategoryOption } from "../../item.api";

interface ItemCategoryDialogProps {
  open: boolean;
  categories: ItemCategoryOption[];
  onClose: () => void;
  onSelect: (category: ItemCategoryOption) => void;
}

const formatCategory = (category: ItemCategoryOption) =>
  `${category.subcategory_name.toLowerCase()} ${category.category_name.toUpperCase()}`;

const ItemCategoryDialog: React.FC<ItemCategoryDialogProps> = ({
  open,
  categories,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const normalized = query.trim().toUpperCase();

    if (!normalized) {
      return categories.slice(0, 40);
    }

    return categories
      .filter((category) =>
        formatCategory(category).toUpperCase().includes(normalized),
      )
      .slice(0, 40);
  }, [categories, query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery("");
    const id = requestAnimationFrame(() => {
      searchRef.current?.focus();
      searchRef.current?.select();
    });

    return () => cancelAnimationFrame(id);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Select Category</DialogTitle>
      <DialogContent>
        <TextField
          inputRef={searchRef}
          label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          fullWidth
          sx={{ mt: 1, mb: 1 }}
        />
        <TableContainer sx={{ maxHeight: 360, border: "1px solid", borderColor: "divider" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Subcategory</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.map((category) => (
                <TableRow
                  key={category.subcategory_id}
                  hover
                  onClick={() => onSelect(category)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>{category.subcategory_name.toLowerCase()}</TableCell>
                  <TableCell>{category.category_name.toUpperCase()}</TableCell>
                </TableRow>
              ))}
              {!matches.length && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ color: "text.secondary" }}>
                    No matching categories
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
};

export default ItemCategoryDialog;
