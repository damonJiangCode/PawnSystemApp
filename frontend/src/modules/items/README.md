# Items Module

`items/` owns item UI, item search/load window, item editing, item photos, and
item API wrappers.

## Structure

```text
items/
  item.api.ts
  components/
    dialogs/
    history/
    transaction/
    shared/
  menu-actions/
    item-search-window/
```

## Responsibilities

This module owns:

- item create/update/delete renderer calls
- item categories and subcategories in UI
- item image capture and preview
- transaction item table and side panel
- history item table and actions
- item search window
- loading old ticket items into the item search workflow

## Item Search Window

Important files:

- `menu-actions/item-search-window/ItemSearchWindow.tsx`
- `menu-actions/item-search-window/useItemSearchWindow.ts`
- `menu-actions/item-search-window/itemSearchWindowColumns.tsx`
- `menu-actions/item-search-window/itemSearchWindow.helpers.ts`

Flow:

```text
openItemSearchWindow
  -> main/window/window.handlers.ts
  -> WindowView
  -> ItemSearchWindow
  -> useItemSearchWindow
```

Search modes:

- Detail: category, subcategory, brand, model, serial number.
- Item number: exact item number.

Important rules:

- Detail search uses AND logic.
- At least one search field is required.
- Mode switch does not clear checked rows.
- New search keeps checked rows and replaces unchecked rows.
- checkbox selection is for Add To Ticket.
- row selection is for image preview.
- Go To Ticket requires exactly one checked item.
- Add To Ticket supports multiple checked items and requires Transaction context.

## Item Images

```text
ItemPhotoCapture
  -> item.api.saveItemImage
  -> preload
  -> item.handlers.ts
  -> imageStorage.ts
```

The database stores image paths, not raw image data.

## Review Notes

When reviewing this module, check:

- item window does not reopen unnecessarily
- loaded items are merged without duplicates
- Add To Ticket cannot target History by accident
- search results are not silently capped unless pagination makes it visible
- item image uses as much window space as practical
