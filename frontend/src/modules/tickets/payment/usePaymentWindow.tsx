import { useEffect, useMemo, useRef, useState } from "react";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import type { TicketSearchResult } from "../../../../../shared/payload-contracts/ticket.contract";
import type {
  OpenPaymentWindowInput,
  PaymentCompletedEvent,
} from "../../../../../shared/payload-contracts/window.contract";
import { getAppApi } from "../../../shared/api/app.api";
import { getClientImageUrl } from "../../clients/hooks/useClientImage";
import { ticketApi } from "../ticket.api";
import { createPaymentColumns } from "./payment.columns";
import { loadAvailablePaymentRows, processPaymentRows } from "./payment.data";
import {
  addThirtyDayPeriods,
  createEmptyRowsByMode,
  createEmptySelectionByMode,
  getOppositeMode,
  mapTicketToPaymentRow,
} from "./payment.helpers";
import { createPaymentRowHandlers } from "./payment.rowHandlers";
import type {
  PaymentMode,
  PaymentRowsByMode,
  PaymentSelectionByMode,
  PaymentStatusSeverity,
  PaymentTicketRow,
} from "./payment.types";
import { referenceApi } from "../../reference/reference.api";

export type { PaymentMode } from "./payment.types";

const getInitialPaymentWindowInput = (): OpenPaymentWindowInput => {
  const params = new URLSearchParams(window.location.search);

  return {
    clientNumber: Number(params.get("clientNumber")) || undefined,
    clientLastName: params.get("clientLastName") || "",
    clientFirstName: params.get("clientFirstName") || "",
  };
};

export const usePaymentWindow = () => {
  const ticketSearchInputRef = useRef<HTMLInputElement>(null);
  const [paymentWindowInput, setPaymentWindowInput] =
    useState<OpenPaymentWindowInput>(getInitialPaymentWindowInput);
  const [mode, setMode] = useState<PaymentMode>("pickup");
  const [availableRowsByMode, setAvailableRowsByMode] =
    useState<PaymentRowsByMode>(createEmptyRowsByMode);
  const [selectedRowsByMode, setSelectedRowsByMode] =
    useState<PaymentRowsByMode>(createEmptyRowsByMode);
  const [availableSelectionByMode, setAvailableSelectionByMode] =
    useState<PaymentSelectionByMode>(createEmptySelectionByMode);
  const [selectedSelectionByMode, setSelectedSelectionByMode] =
    useState<PaymentSelectionByMode>(createEmptySelectionByMode);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [holidayDateKeys, setHolidayDateKeys] = useState<string[]>([]);
  const [ticketSearchValue, setTicketSearchValue] = useState("");
  const [ticketSearchPreview, setTicketSearchPreview] =
    useState<TicketSearchResult | null>(null);
  const [ticketSearchClientImage, setTicketSearchClientImage] = useState<
    string | null
  >(null);
  const [ticketSearchDialogOpen, setTicketSearchDialogOpen] = useState(false);
  const [pickupHoldRows, setPickupHoldRows] = useState<PaymentTicketRow[]>([]);
  const pickupHoldActionRef = useRef<(() => void) | null>(null);
  const [statusSeverity, setStatusSeverity] =
    useState<PaymentStatusSeverity>("info");
  const clientNumber = Number(paymentWindowInput.clientNumber);
  const clientLastName = paymentWindowInput.clientLastName || "";
  const clientFirstName = paymentWindowInput.clientFirstName || "";
  const availableRows = availableRowsByMode[mode];
  const selectedRows = selectedRowsByMode[mode];
  const availableSelectionModel = availableSelectionByMode[mode];
  const selectedSelectionModel = selectedSelectionByMode[mode];
  const pickupSummaryAmount = selectedRowsByMode.pickup.reduce(
    (sum, row) => sum + Number(row.pickupAmount ?? 0),
    0,
  );
  const extensionSummaryAmount = selectedRowsByMode.extension.reduce(
    (sum, row) => sum + row.extensionAmount,
    0,
  );
  const totalSummaryAmount = pickupSummaryAmount + extensionSummaryAmount;
  const searchedTicketNumber = ticketSearchPreview?.ticket.ticket_number;
  const oppositeMode = getOppositeMode(mode);
  const hasTicketSearchSelectionConflict = Boolean(
    searchedTicketNumber &&
    selectedRowsByMode[oppositeMode].some(
      (row) => row.ticketNumber === searchedTicketNumber,
    ),
  );
  const currentModeLabel = mode === "pickup" ? "Buyback" : "Interest";
  const oppositeModeLabel = oppositeMode === "pickup" ? "Buyback" : "Interest";
  const ticketSearchSelectionConflictMessage =
    hasTicketSearchSelectionConflict && searchedTicketNumber
      ? `Ticket #${searchedTicketNumber} is already selected in ${oppositeModeLabel}. Moving it will remove it from ${oppositeModeLabel}.`
      : "";
  const ticketSearchConfirmLabel = hasTicketSearchSelectionConflict
    ? `Move to ${currentModeLabel}`
    : "Confirm";
  const requestPickupHoldConfirmation = (
    rows: PaymentTicketRow[],
    onContinue: () => void,
  ) => {
    pickupHoldActionRef.current = onContinue;
    setPickupHoldRows(rows);
  };
  const rowHandlers = createPaymentRowHandlers({
    mode,
    availableRows,
    selectedRows,
    availableSelectionModel,
    selectedSelectionModel,
    selectedRowsByMode,
    setAvailableRowsByMode,
    setSelectedRowsByMode,
    setAvailableSelectionByMode,
    setSelectedSelectionByMode,
    setStatusSeverity,
    setStatusMessage,
    requestPickupHoldConfirmation,
  });

  const columns = useMemo(() => createPaymentColumns(mode), [mode]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      ticketSearchInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const windowApi = getAppApi()?.window;

    if (!windowApi) {
      return;
    }

    return windowApi.onPaymentWindowInputUpdated(setPaymentWindowInput);
  }, []);

  const focusTicketSearchInput = () => {
    requestAnimationFrame(() => {
      ticketSearchInputRef.current?.focus();
      ticketSearchInputRef.current?.select();
    });
  };

  const handleLoad = async () => {
    if (!Number.isFinite(clientNumber) || clientNumber <= 0) {
      setStatusSeverity("warning");
      setStatusMessage("Select a client before loading payment tickets.");
      return;
    }

    setLoading(true);
    setStatusMessage("");
    setStatusSeverity("info");

    try {
      const { holidayDateKeys, rows } = await loadAvailablePaymentRows({
        clientNumber,
        mode,
        selectedRowsByMode,
      });
      setHolidayDateKeys(holidayDateKeys);
      setAvailableRowsByMode((prev) => ({ ...prev, [mode]: rows }));
      setAvailableSelectionByMode((prev) => ({ ...prev, [mode]: [] }));
      const lostTicketCount =
        mode === "pickup" ? rows.filter((row) => row.isLost).length : 0;
      setStatusSeverity(
        lostTicketCount ? "lost" : rows.length ? "success" : "info",
      );
      setStatusMessage(
        lostTicketCount
          ? `${rows.length} pawned ticket(s) loaded. ${lostTicketCount} marked as lost.`
          : rows.length
            ? `${rows.length} pawned ticket(s) loaded.`
            : "No pawned tickets found.",
      );
    } catch (err) {
      console.error("Failed to load payment tickets", err);
      setStatusSeverity("warning");
      setStatusMessage(
        err instanceof Error ? err.message : "Unable to load payment tickets.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTicketSearch = async () => {
    const ticketNumber = Number(ticketSearchValue);

    setTicketSearchDialogOpen(false);
    setTicketSearchPreview(null);
    setTicketSearchClientImage(null);

    if (!Number.isFinite(ticketNumber) || ticketNumber <= 0) {
      setStatusSeverity("warning");
      setStatusMessage("Enter a valid ticket number.");
      focusTicketSearchInput();
      return;
    }

    setLoading(true);
    setStatusMessage("");
    setStatusSeverity("info");

    try {
      const preview = await ticketApi.searchPaymentTicketByNumber(ticketNumber);

      if (!preview) {
        setStatusSeverity("warning");
        setStatusMessage(`Ticket #${ticketNumber} was not found.`);
        focusTicketSearchInput();
        return;
      }

      if (preview.ticket.status !== "pawned") {
        setStatusSeverity("warning");
        setStatusMessage(`Ticket #${ticketNumber} is not currently pawned.`);
        focusTicketSearchInput();
        return;
      }

      const holidays = await referenceApi.loadHolidayDates();
      const nextHolidayDateKeys = holidays.map(
        (holiday) => holiday.holiday_date,
      );
      const searchedRow = mapTicketToPaymentRow(
        preview.ticket,
        nextHolidayDateKeys,
      );
      setHolidayDateKeys(nextHolidayDateKeys);

      if (searchedRow && !preview.ticket.is_stolen) {
        const oppositeSelectedTicketNumbers = new Set(
          selectedRowsByMode[getOppositeMode(mode)].map(
            (row) => row.ticketNumber,
          ),
        );
        const isAlreadySelected =
          mode === "pickup" &&
          selectedRowsByMode.pickup.some(
            (row) => row.ticketNumber === searchedRow.ticketNumber,
          );

        if (
          !isAlreadySelected &&
          !oppositeSelectedTicketNumbers.has(searchedRow.ticketNumber)
        ) {
          setAvailableRowsByMode((prev) => {
            if (
              prev[mode].some(
                (row) => row.ticketNumber === searchedRow.ticketNumber,
              )
            ) {
              return prev;
            }

            return {
              ...prev,
              [mode]: [...prev[mode], searchedRow].sort(
                (a, b) => a.ticketNumber - b.ticketNumber,
              ),
            };
          });
        }
      }

      setTicketSearchPreview(preview);
      setTicketSearchClientImage(getClientImageUrl(preview.client.image_path));
      setTicketSearchDialogOpen(true);
    } catch (err) {
      console.error(err);
      setStatusSeverity("warning");
      setStatusMessage(
        err instanceof Error ? err.message : "Unable to search ticket.",
      );
      focusTicketSearchInput();
    } finally {
      setLoading(false);
    }
  };

  const closeTicketSearchDialog = () => {
    setTicketSearchDialogOpen(false);
  };

  const addTicketSearchPreviewToSelected = (
    skipPickupHoldConfirmation = false,
  ) => {
    if (!ticketSearchPreview) {
      return;
    }

    const searchedRow = mapTicketToPaymentRow(
      ticketSearchPreview.ticket,
      holidayDateKeys,
    );

    if (!searchedRow) {
      setStatusSeverity("warning");
      setStatusMessage("Unable to load that ticket.");
      return;
    }

    if (searchedRow.status !== "pawned") {
      closeTicketSearchDialog();
      setStatusSeverity("warning");
      setStatusMessage(`Ticket #${searchedRow.ticketNumber} is not pawned.`);
      return;
    }

    if (ticketSearchPreview.ticket.is_stolen) {
      closeTicketSearchDialog();
      setStatusSeverity("warning");
      setStatusMessage(
        `Ticket #${searchedRow.ticketNumber} is marked stolen and cannot be paid here.`,
      );
      return;
    }

    const nextOppositeMode = getOppositeMode(mode);
    const oppositeSelectedTicketNumbers = new Set(
      selectedRowsByMode[nextOppositeMode].map((row) => row.ticketNumber),
    );
    const currentSelectedTicketNumbers = new Set(
      selectedRowsByMode[mode].map((row) => row.ticketNumber),
    );

    if (currentSelectedTicketNumbers.has(searchedRow.ticketNumber)) {
      setStatusSeverity("info");
      setStatusMessage(
        `Ticket #${searchedRow.ticketNumber} is already selected.`,
      );
      closeTicketSearchDialog();
      return;
    }

    const movingFromOppositeMode = oppositeSelectedTicketNumbers.has(
      searchedRow.ticketNumber,
    );

    if (
      !skipPickupHoldConfirmation &&
      mode === "pickup" &&
      !searchedRow.isPickupAllowed
    ) {
      requestPickupHoldConfirmation([searchedRow], () =>
        addTicketSearchPreviewToSelected(true),
      );
      return;
    }

    setSelectedRowsByMode((prev) => {
      const nextRows = movingFromOppositeMode
        ? {
            ...prev,
            [nextOppositeMode]: prev[nextOppositeMode].filter(
              (row) => row.ticketNumber !== searchedRow.ticketNumber,
            ),
          }
        : prev;

      return {
        ...nextRows,
        [mode]: [
          ...nextRows[mode],
          mode === "extension"
            ? {
                ...searchedRow,
                dueDate: addThirtyDayPeriods(searchedRow.dueDate, 1),
              }
            : searchedRow,
        ],
      };
    });
    setAvailableRowsByMode((prev) => ({
      ...prev,
      [mode]:
        mode === "pickup"
          ? prev[mode].filter(
              (row) => row.ticketNumber !== searchedRow.ticketNumber,
            )
          : prev[mode],
      [nextOppositeMode]: prev[nextOppositeMode].filter(
        (row) => row.ticketNumber !== searchedRow.ticketNumber,
      ),
    }));
    setAvailableSelectionByMode((prev) => ({
      ...prev,
      [mode]: [],
      [nextOppositeMode]: [],
    }));
    setSelectedSelectionByMode((prev) => ({
      ...prev,
      [mode]: [],
      [nextOppositeMode]: [],
    }));
    closeTicketSearchDialog();
    const showLostWarning = mode === "pickup" && searchedRow.isLost;
    setStatusSeverity(showLostWarning ? "lost" : "success");
    setStatusMessage(
      showLostWarning
        ? movingFromOppositeMode
          ? `Ticket #${searchedRow.ticketNumber} moved from ${oppositeModeLabel} to ${currentModeLabel}. This ticket is marked as lost.`
          : `Ticket #${searchedRow.ticketNumber} selected. This ticket is marked as lost.`
        : movingFromOppositeMode
          ? `Ticket #${searchedRow.ticketNumber} moved from ${oppositeModeLabel} to ${currentModeLabel}.`
          : `Ticket #${searchedRow.ticketNumber} selected.`,
    );
  };

  const closePickupHoldDialog = () => {
    pickupHoldActionRef.current = null;
    setPickupHoldRows([]);
  };

  const continuePickupHold = () => {
    const action = pickupHoldActionRef.current;
    pickupHoldActionRef.current = null;
    setPickupHoldRows([]);
    action?.();
  };

  const handleModeChange = (nextMode: PaymentMode) => {
    setMode(nextMode);
    setStatusMessage("");
    setStatusSeverity("info");
  };

  const handleClear = () => {
    setAvailableRowsByMode((prev) => ({ ...prev, [mode]: [] }));
    setSelectedRowsByMode((prev) => ({ ...prev, [mode]: [] }));
    setAvailableSelectionByMode((prev) => ({ ...prev, [mode]: [] }));
    setSelectedSelectionByMode((prev) => ({ ...prev, [mode]: [] }));
    setStatusMessage("");
  };

  const handleDone = async () => {
    const pickupRows = selectedRowsByMode.pickup;
    const extensionRows = selectedRowsByMode.extension;

    if (!pickupRows.length && !extensionRows.length) {
      setStatusSeverity("warning");
      setStatusMessage("Move ticket payment(s) to the right table first.");
      return;
    }

    setProcessing(true);
    setStatusSeverity("info");
    setStatusMessage("");

    try {
      const pickupTicketNumbers = new Set(
        pickupRows.map((row) => row.ticketNumber),
      );
      const conflictingExtensionRow = extensionRows.find((row) =>
        pickupTicketNumbers.has(row.ticketNumber),
      );

      if (conflictingExtensionRow) {
        setStatusSeverity("warning");
        setStatusMessage(
          `Ticket #${conflictingExtensionRow.ticketNumber} cannot be picked up and extended at the same time.`,
        );
        return;
      }

      const { pickedUpIds, pickedUpCounts, replaceExtendedRow } =
        await processPaymentRows({
          pickupRows,
          extensionRows,
          holidayDateKeys,
        });

      setSelectedRowsByMode((prev) => ({
        ...prev,
        pickup: prev.pickup.filter((row) => !pickedUpIds.has(row.ticketNumber)),
        extension: [],
      }));
      setAvailableRowsByMode((prev) => ({
        ...prev,
        pickup: prev.pickup
          .filter((row) => !pickedUpIds.has(row.ticketNumber))
          .map(replaceExtendedRow),
        extension: prev.extension
          .filter((row) => !pickedUpIds.has(row.ticketNumber))
          .map(replaceExtendedRow),
      }));
      setAvailableSelectionByMode(createEmptySelectionByMode());
      setSelectedSelectionByMode(createEmptySelectionByMode());
      if (pickedUpCounts.length) {
        const channel = new BroadcastChannel("payment-events");
        channel.postMessage({
          type: "payment-completed",
          pickedUpCounts,
        } satisfies PaymentCompletedEvent);
        channel.close();
      }
      window.close();
    } catch (err) {
      console.error(err);
      setStatusSeverity("warning");
      setStatusMessage(
        err instanceof Error ? err.message : "Unable to process payment(s).",
      );
    } finally {
      setProcessing(false);
    }
  };

  return {
    state: {
      mode,
      availableRows,
      selectedRows,
      availableSelectionModel,
      selectedSelectionModel,
      loading: loading || processing,
      processing,
      statusMessage,
      statusSeverity,
      clientLastName,
      clientFirstName,
      columns,
      ticketSearchInputRef,
      ticketSearchValue,
      ticketSearchPreview,
      ticketSearchClientImage,
      ticketSearchDialogOpen,
      ticketSearchSelectionConflictMessage,
      ticketSearchConfirmLabel,
      pickupHoldRows,
      pickupSummaryAmount,
      extensionSummaryAmount,
      totalSummaryAmount,
    },
    actions: {
      setMode: handleModeChange,
      setTicketSearchValue,
      handleLoad,
      handleTicketSearch,
      closeTicketSearchDialog,
      addTicketSearchPreviewToSelected,
      closePickupHoldDialog,
      continuePickupHold,
      handleClear,
      handleDone,
      setAvailableSelectionModel: (selectionModel: GridRowSelectionModel) =>
        setAvailableSelectionByMode((prev) => ({
          ...prev,
          [mode]: selectionModel,
        })),
      setSelectedSelectionModel: (selectionModel: GridRowSelectionModel) =>
        setSelectedSelectionByMode((prev) => ({
          ...prev,
          [mode]: selectionModel,
        })),
      moveSelectedToSelected: () => rowHandlers.moveRowsToSelected(false),
      moveAllToSelected: () => rowHandlers.moveRowsToSelected(true),
      moveSelectedToAvailable: () => rowHandlers.moveRowsToAvailable(false),
      moveAllToAvailable: () => rowHandlers.moveRowsToAvailable(true),
    },
  };
};
