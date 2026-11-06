import type { GridRowSelectionModel } from "@mui/x-data-grid";
import type { Dispatch, SetStateAction } from "react";
import { addThirtyDayPeriods, getOppositeMode } from "./payment.helpers";
import type {
  PaymentMode,
  PaymentRowsByMode,
  PaymentStatusSeverity,
  PaymentTicketRow,
} from "./payment.types";

type PaymentRowHandlerDeps = {
  mode: PaymentMode;
  availableRows: PaymentTicketRow[];
  selectedRows: PaymentTicketRow[];
  availableSelectionModel: GridRowSelectionModel;
  selectedSelectionModel: GridRowSelectionModel;
  selectedRowsByMode: PaymentRowsByMode;
  setAvailableRowsByMode: Dispatch<SetStateAction<PaymentRowsByMode>>;
  setSelectedRowsByMode: Dispatch<SetStateAction<PaymentRowsByMode>>;
  setAvailableSelectionByMode: Dispatch<
    SetStateAction<Record<PaymentMode, GridRowSelectionModel>>
  >;
  setSelectedSelectionByMode: Dispatch<
    SetStateAction<Record<PaymentMode, GridRowSelectionModel>>
  >;
  setStatusSeverity: Dispatch<SetStateAction<PaymentStatusSeverity>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
  requestPickupHoldConfirmation: (
    rows: PaymentTicketRow[],
    onContinue: () => void,
  ) => void;
};

export const createPaymentRowHandlers = ({
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
}: PaymentRowHandlerDeps) => {
  const moveRowsToSelected = (
    moveAll: boolean,
    skipPickupHoldConfirmation = false,
  ) => {
    const selectedIds = new Set(
      moveAll
        ? availableRows.map((row) => String(row.id))
        : availableSelectionModel.map(String),
    );
    const rightSelectedIds = new Set(
      moveAll || mode !== "extension" ? [] : selectedSelectionModel.map(String),
    );
    const rowsToMove = availableRows.filter((row) =>
      selectedIds.has(String(row.id)),
    );
    const rowsToExtendAgain = selectedRows.filter((row) =>
      rightSelectedIds.has(String(row.id)),
    );
    const rowsToApply =
      mode === "extension"
        ? [
            ...new Map(
              [...rowsToMove, ...rowsToExtendAgain].map((row) => [
                row.ticketNumber,
                row,
              ]),
            ).values(),
          ]
        : rowsToMove;

    if (!rowsToApply.length) {
      return;
    }

    const blockedRows =
      mode === "pickup" ? rowsToMove.filter((row) => !row.isPickupAllowed) : [];

    if (!skipPickupHoldConfirmation && blockedRows.length) {
      requestPickupHoldConfirmation(blockedRows, () =>
        moveRowsToSelected(moveAll, true),
      );
      return;
    }

    const oppositeSelectedTicketNumbers = new Set(
      selectedRowsByMode[getOppositeMode(mode)].map((row) => row.ticketNumber),
    );
    const conflictingRows = rowsToApply.filter((row) =>
      oppositeSelectedTicketNumbers.has(row.ticketNumber),
    );

    if (conflictingRows.length) {
      setStatusSeverity("warning");
      setStatusMessage(
        `Ticket #${conflictingRows[0].ticketNumber} is already selected for ${getOppositeMode(
          mode,
        )}. Move it back before choosing ${mode}.`,
      );
      return;
    }

    setSelectedRowsByMode((prev) => ({
      ...prev,
      [mode]:
        mode === "extension"
          ? rowsToApply.reduce<PaymentTicketRow[]>((nextRows, row) => {
              const existingIndex = nextRows.findIndex(
                (selectedRow) => selectedRow.ticketNumber === row.ticketNumber,
              );

              if (existingIndex === -1) {
                return [
                  ...nextRows,
                  {
                    ...row,
                    id: row.ticketNumber,
                    dueDate: addThirtyDayPeriods(row.dueDate, 1),
                    sourceDueDate: row.dueDate,
                    extensionMonths: 1,
                    extensionAmount: row.baseExtensionAmount,
                  },
                ];
              }

              return nextRows.map((selectedRow, index) => {
                if (index !== existingIndex) {
                  return selectedRow;
                }

                const extensionMonths = selectedRow.extensionMonths + 1;

                return {
                  ...selectedRow,
                  dueDate: addThirtyDayPeriods(
                    selectedRow.sourceDueDate,
                    extensionMonths,
                  ),
                  extensionMonths,
                  extensionAmount:
                    selectedRow.baseExtensionAmount * extensionMonths,
                };
              });
            }, prev.extension)
          : [...prev.pickup, ...rowsToMove],
    }));

    if (mode === "pickup") {
      setAvailableRowsByMode((prev) => ({
        ...prev,
        pickup: prev.pickup.filter((row) => !selectedIds.has(String(row.id))),
      }));
    }

    const movedTicketNumbers = new Set(
      rowsToApply.map((row) => row.ticketNumber),
    );
    const oppositeMode = getOppositeMode(mode);

    setAvailableRowsByMode((prev) => ({
      ...prev,
      [oppositeMode]: prev[oppositeMode].filter(
        (row) => !movedTicketNumbers.has(row.ticketNumber),
      ),
    }));

    setAvailableSelectionByMode((prev) => ({ ...prev, [mode]: [] }));
  };

  const moveRowsToAvailable = (moveAll: boolean) => {
    const selectedIds = new Set(
      moveAll
        ? selectedRows.map((row) => String(row.id))
        : selectedSelectionModel.map(String),
    );
    const rowsToMove = selectedRows.filter((row) =>
      selectedIds.has(String(row.id)),
    );

    if (!rowsToMove.length) {
      return;
    }

    if (mode === "extension") {
      const fullyRemovedRows = rowsToMove
        .filter((row) => moveAll || row.extensionMonths <= 1)
        .map((row) => ({
          ...row,
          id: row.ticketNumber,
          dueDate: row.sourceDueDate,
          extensionMonths: 1,
          extensionAmount: row.baseExtensionAmount,
        }));

      setSelectedRowsByMode((prev) => ({
        ...prev,
        extension: prev.extension.flatMap((row) => {
          if (!selectedIds.has(String(row.id))) {
            return [row];
          }

          if (moveAll || row.extensionMonths <= 1) {
            return [];
          }

          const extensionMonths = row.extensionMonths - 1;
          return [
            {
              ...row,
              dueDate: addThirtyDayPeriods(row.sourceDueDate, extensionMonths),
              extensionMonths,
              extensionAmount: row.baseExtensionAmount * extensionMonths,
            },
          ];
        }),
      }));

      if (fullyRemovedRows.length) {
        setAvailableRowsByMode((prev) => {
          const existingPickupTicketNumbers = new Set(
            prev.pickup.map((row) => row.ticketNumber),
          );
          const rowsToRestore = fullyRemovedRows.filter(
            (row) => !existingPickupTicketNumbers.has(row.ticketNumber),
          );

          if (!rowsToRestore.length) {
            return prev;
          }

          return {
            ...prev,
            pickup: [...prev.pickup, ...rowsToRestore].sort(
              (a, b) => a.ticketNumber - b.ticketNumber,
            ),
          };
        });
      }

      const remainingReducedIds = new Set(
        rowsToMove
          .filter((row) => !moveAll && row.extensionMonths > 1)
          .map((row) => String(row.id)),
      );
      setSelectedSelectionByMode((prev) => ({
        ...prev,
        extension: prev.extension.filter(
          (id) =>
            !selectedIds.has(String(id)) || remainingReducedIds.has(String(id)),
        ),
      }));
      return;
    }

    const remainingSelectedRows = selectedRows.filter(
      (row) => !selectedIds.has(String(row.id)),
    );
    const stillSelectedTicketNumbers = new Set(
      remainingSelectedRows.map((row) => row.ticketNumber),
    );
    const restorableRowsByTicketNumber = new Map<number, PaymentTicketRow>();
    rowsToMove
      .filter((row) => !stillSelectedTicketNumbers.has(row.ticketNumber))
      .forEach((row) => {
        restorableRowsByTicketNumber.set(row.ticketNumber, {
          ...row,
          id: row.ticketNumber,
          dueDate: row.sourceDueDate,
        });
      });
    const restorableRows = [...restorableRowsByTicketNumber.values()];
    const oppositeMode = getOppositeMode(mode);

    setAvailableRowsByMode((prev) => ({
      ...prev,
      pickup: [...prev.pickup, ...rowsToMove].sort(
        (a, b) => a.ticketNumber - b.ticketNumber,
      ),
    }));

    if (restorableRows.length) {
      setAvailableRowsByMode((prev) => {
        const existingTicketNumbers = new Set(
          prev[oppositeMode].map((row) => row.ticketNumber),
        );
        const rowsToRestore = restorableRows.filter(
          (row) => !existingTicketNumbers.has(row.ticketNumber),
        );

        if (!rowsToRestore.length) {
          return prev;
        }

        return {
          ...prev,
          [oppositeMode]: [...prev[oppositeMode], ...rowsToRestore].sort(
            (a, b) => a.ticketNumber - b.ticketNumber,
          ),
        };
      });
    }

    setSelectedRowsByMode((prev) => ({
      ...prev,
      [mode]: remainingSelectedRows,
    }));
    setSelectedSelectionByMode((prev) => ({ ...prev, [mode]: [] }));
  };

  return { moveRowsToSelected, moveRowsToAvailable };
};
