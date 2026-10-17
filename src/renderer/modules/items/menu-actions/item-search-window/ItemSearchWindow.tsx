import React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  FirstPage,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  LastPage,
} from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import WindowLayout from "../../../../windows/WindowLayout";
import type { WindowScreenProps } from "../../../../windows/windowRegistry";
import TransactionItemImage from "../../components/transaction/TransactionItemImage";
import { itemSearchWindowColumns } from "./itemSearchWindowColumns";
import {
  isItemAddable,
  getItemStatusRowClass,
  ITEM_SEARCH_WINDOW_PAGE_SIZE,
  type ItemSearchWindowMode,
} from "./itemSearchWindow.helpers";
import { useItemSearchWindow } from "./useItemSearchWindow";

const ItemSearchWindow: React.FC<WindowScreenProps> = () => {
  const { refs, state, actions } = useItemSearchWindow();

  const renderSearchButtons = () => (
    <Stack spacing={0.5} sx={{ minWidth: 86 }}>
      <Button
        type="submit"
        variant="contained"
        disabled={!state.canSearch || state.searching}
      >
        {state.searching && !state.loadingClientItems
          ? "Searching..."
          : "Search"}
      </Button>
      <Button
        type="button"
        variant="outlined"
        disabled={!state.canLoadClientItems}
        onClick={() => void actions.handleLoadClientItems()}
        title={
          state.targetStatus.selectedClientNumber
            ? `Load items for client #${state.targetStatus.selectedClientNumber}`
            : "Select a client in the main window first"
        }
      >
        {state.loadingClientItems ? "Loading..." : "Load"}
      </Button>
    </Stack>
  );

  const renderFooter = () => (
    <Box
      sx={{
        height: 28,
        minHeight: 28,
        px: 0.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 0.25,
        borderTop: "1px solid #ddd",
        boxSizing: "border-box",
      }}
    >
      <IconButton
        size="small"
        disabled={state.currentPage <= 0}
        onClick={() => actions.setPage(0)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <FirstPage fontSize="inherit" />
      </IconButton>
      <IconButton
        size="small"
        disabled={state.currentPage <= 0}
        onClick={() => actions.setPage(state.currentPage - 1)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <KeyboardArrowLeft fontSize="inherit" />
      </IconButton>
      <Typography
        component="span"
        sx={{
          minWidth: 40,
          textAlign: "center",
          fontSize: 12,
          lineHeight: "24px",
          color: "text.secondary",
        }}
      >
        {state.currentPage + 1} / {state.pageCount}
      </Typography>
      <IconButton
        size="small"
        disabled={state.currentPage >= state.pageCount - 1}
        onClick={() => actions.setPage(state.currentPage + 1)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <KeyboardArrowRight fontSize="inherit" />
      </IconButton>
      <IconButton
        size="small"
        disabled={state.currentPage >= state.pageCount - 1}
        onClick={() => actions.setPage(state.pageCount - 1)}
        sx={{ width: 24, height: 24, p: 0 }}
      >
        <LastPage fontSize="inherit" />
      </IconButton>
    </Box>
  );

  return (
    <WindowLayout
      title="Search Item"
      description="Search by item number, or by item details."
      denseFooter
    >
      <Stack spacing={0.5} sx={{ height: "100%", minHeight: 0 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 300px",
            gap: 1,
            alignItems: "start",
          }}
        >
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={state.mode}
                onChange={(_event, nextMode: ItemSearchWindowMode | null) =>
                  actions.handleModeChange(nextMode)
                }
                sx={{ flexShrink: 0 }}
              >
                <ToggleButton value="details">Detail</ToggleButton>
                <ToggleButton value="item-number">Item #</ToggleButton>
              </ToggleButtonGroup>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 800 }}
              >
                Results: {state.items.length} | Checked:{" "}
                {state.checkedItems.length}
              </Typography>
            </Box>

            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                void actions.handleSearch();
              }}
              sx={{ minWidth: 0 }}
            >
              {state.mode === "item-number" ? (
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <TextField
                    inputRef={refs.itemNumberInputRef}
                    size="small"
                    label="Item Number"
                    value={state.itemNumber}
                    onChange={(event) => {
                      actions.setItemNumber(
                        event.target.value.replace(/\D/g, ""),
                      );
                    }}
                    inputProps={{ inputMode: "numeric" }}
                    sx={{ width: 190 }}
                  />
                  {renderSearchButtons()}
                </Stack>
              ) : (
                <Stack direction="row" spacing={0.75} alignItems="flex-start">
                  <Autocomplete
                    size="small"
                    value={state.categoryName || null}
                    options={state.categoryNames}
                    onChange={(_event, nextCategoryName) => {
                      actions.setCategoryName(nextCategoryName ?? "");
                      actions.setSubcategory(null);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Category" />
                    )}
                    sx={{ flex: "1.15 1 142px", minWidth: 128 }}
                  />
                  <Autocomplete
                    size="small"
                    value={state.subcategory}
                    options={state.subcategoryOptions}
                    getOptionLabel={(option) => option.subcategory_name}
                    isOptionEqualToValue={(option, value) =>
                      option.subcategory_id === value.subcategory_id
                    }
                    onChange={(_event, nextSubcategory) => {
                      actions.setSubcategory(nextSubcategory);
                      if (nextSubcategory) {
                        actions.setCategoryName(nextSubcategory.category_name);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label="Subcategory" />
                    )}
                    sx={{ flex: "1.4 1 170px", minWidth: 145 }}
                  />
                  <TextField
                    size="small"
                    label="Brand"
                    value={state.brandName}
                    onChange={(event) =>
                      actions.setBrandName(event.target.value)
                    }
                    sx={{ flex: "1 1 110px", minWidth: 88 }}
                  />
                  <TextField
                    size="small"
                    label="Model"
                    value={state.modelNumber}
                    onChange={(event) =>
                      actions.setModelNumber(event.target.value)
                    }
                    sx={{ flex: "1 1 110px", minWidth: 88 }}
                  />
                  <TextField
                    inputRef={refs.serialNumberInputRef}
                    size="small"
                    label="Serial"
                    value={state.serialNumber}
                    onChange={(event) =>
                      actions.setSerialNumber(event.target.value)
                    }
                    sx={{ flex: "1 1 124px", minWidth: 96 }}
                  />
                  {renderSearchButtons()}
                </Stack>
              )}
            </Box>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "112px minmax(0, 1fr)",
              gap: 1,
              alignItems: "stretch",
            }}
          >
            <Stack spacing={0.5}>
              <Button
                variant="contained"
                size="small"
                disabled={!state.canGoToTicket}
                onClick={() => void actions.handleGoToTicket()}
              >
                {state.openingTicket ? "Opening..." : "Go to Ticket"}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                disabled={!state.canAddToTicket}
                onClick={actions.handleAddToTicket}
              >
                {state.addingToTicket ? "Adding..." : "Add to Ticket"}
              </Button>
            </Stack>

            <Box sx={{ height: 112, minWidth: 0 }}>
              <TransactionItemImage
                selectedItem={state.selectedItem ?? undefined}
              />
            </Box>
          </Box>
        </Box>

        {(state.error ||
          state.message ||
          !state.targetStatus.canAddToTicket) && (
          <Box
            sx={{
              minHeight: 22,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            {state.error ? (
              <Alert severity="error" sx={{ py: 0, alignItems: "center" }}>
                {state.error}
              </Alert>
            ) : state.message ? (
              <Typography
                variant="caption"
                color="success.main"
                sx={{ fontWeight: 800 }}
              >
                {state.message}
              </Typography>
            ) : null}
            {!state.targetStatus.canAddToTicket && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                Add to Ticket is available only on the Transaction page with a
                selected ticket.
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ flex: 1, minHeight: 0 }}>
          <DataGrid
            columnHeaderHeight={34}
            rowHeight={30}
            rows={state.items}
            columns={itemSearchWindowColumns}
            getRowId={(row) => row.item_number}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={state.checkedItemIds}
            onRowSelectionModelChange={actions.handleCheckedItemsChange}
            isRowSelectable={(params) =>
              isItemAddable(params.row, state.targetStatus.targetTicketNumber)
            }
            paginationModel={state.paginationModel}
            onPaginationModelChange={(model) => {
              actions.setPaginationModel({
                page: model.page,
                pageSize: ITEM_SEARCH_WINDOW_PAGE_SIZE,
              });
            }}
            pageSizeOptions={[ITEM_SEARCH_WINDOW_PAGE_SIZE]}
            slots={{ footer: renderFooter }}
            onRowClick={(params) => actions.setSelectedItem(params.row)}
            getRowClassName={(params) => {
              const classNames: string[] = [getItemStatusRowClass(params.row)];

              if (params.row.item_number === state.selectedItem?.item_number) {
                classNames.push("selected-item-row");
              }

              return classNames.join(" ");
            }}
            loading={state.searching}
            disableColumnMenu
            disableColumnSorting
            disableColumnFilter
            disableColumnSelector
            disableDensitySelector
            localeText={{ noRowsLabel: "No items" }}
            sx={{
              height: "100%",
              border: "1px solid #ccc",
              "& .MuiDataGrid-cell": {
                borderRight: "1px solid #ddd",
                borderBottom: "1px solid #ddd",
              },
              "& .MuiDataGrid-columnHeaders": {
                borderBottom: "2px solid #bbb",
              },
              "& .MuiDataGrid-columnHeader": {
                borderRight: "1px solid #ddd",
                backgroundColor: "#fafafa",
                py: 0,
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: 600,
              },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "#f5f5f5",
              },
              "& .MuiDataGrid-row.Mui-selected": {
                backgroundColor: "transparent",
              },
              "& .MuiDataGrid-row.Mui-selected:hover": {
                backgroundColor: "#f5f5f5",
              },
              "& .MuiDataGrid-row.selected-item-row": {
                outline: "2px solid #718096",
                outlineOffset: "-2px",
              },
              "& .MuiDataGrid-row.pawned-item-row, & .MuiDataGrid-row.pawned-item-row.Mui-selected":
                {
                  backgroundColor: "#ffcdd2",
                },
              "& .MuiDataGrid-row.pawned-item-row:hover, & .MuiDataGrid-row.pawned-item-row.Mui-selected:hover":
                {
                  backgroundColor: "#ef9a9a",
                },
              "& .MuiDataGrid-row.expired-item-row, & .MuiDataGrid-row.expired-item-row.Mui-selected":
                {
                  backgroundColor: "#fff9c4",
                },
              "& .MuiDataGrid-row.expired-item-row:hover, & .MuiDataGrid-row.expired-item-row.Mui-selected:hover":
                {
                  backgroundColor: "#fff59d",
                },
              "& .MuiDataGrid-row.selected-item-row .MuiDataGrid-cell": {
                borderRight: "1px solid #9aa4af",
                borderBottom: "1px solid #9aa4af",
              },
            }}
          />
        </Box>
      </Stack>
    </WindowLayout>
  );
};

export default ItemSearchWindow;
