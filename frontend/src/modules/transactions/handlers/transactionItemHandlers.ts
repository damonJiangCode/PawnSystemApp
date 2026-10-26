import type { Dispatch, SetStateAction } from "react";
import type { Item } from "../../../../../shared/models/item.model";
import type { Ticket } from "../../../../../shared/models/ticket.model";
import { itemApi } from "../../items/item.api";

type TransactionItemHandlerDeps = {
  items: Item[];
  selectedTicket: Ticket | null;
  removeItemTarget: Item | null;
  setItems: Dispatch<SetStateAction<Item[]>>;
  setSelectedItem: Dispatch<SetStateAction<Item | null>>;
  setOpenItemDialog: Dispatch<SetStateAction<boolean>>;
  setItemDialogMode: Dispatch<SetStateAction<"add" | "edit">>;
  setRemoveItemTarget: Dispatch<SetStateAction<Item | null>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
};

export const createTransactionItemHandlers = ({
  items,
  selectedTicket,
  removeItemTarget,
  setItems,
  setSelectedItem,
  setOpenItemDialog,
  setItemDialogMode,
  setRemoveItemTarget,
  setStatusMessage,
}: TransactionItemHandlerDeps) => {
  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
    setStatusMessage("");
  };

  const handleAddItem = () => {
    if (!selectedTicket?.ticket_number) {
      setStatusMessage("Select a ticket first.");
      return;
    }

    setItemDialogMode("add");
    setSelectedItem(null);
    setOpenItemDialog(true);
    setStatusMessage("");
  };

  const handleEditItem = (item: Item) => {
    if (item.is_loaded_draft) {
      setStatusMessage("Loaded draft items must be saved before editing.");
      return;
    }

    setSelectedItem(item);
    setItemDialogMode("edit");
    setOpenItemDialog(true);
    setStatusMessage("");
  };

  const handleRemoveItem = (item: Item) => {
    setRemoveItemTarget(item);
    setStatusMessage("");
  };

  const handleItemSaved = (savedItem: Item) => {
    setItems((prev) => {
      const exists = prev.some(
        (item) => item.item_number === savedItem.item_number,
      );
      return exists
        ? prev.map((item) =>
            item.item_number === savedItem.item_number ? savedItem : item,
          )
        : [savedItem, ...prev];
    });
    setSelectedItem(savedItem);
    setOpenItemDialog(false);
    setStatusMessage(`Item #${savedItem.item_number} saved.`);
  };

  const handleConfirmRemoveItem = async () => {
    if (!removeItemTarget || !selectedTicket?.ticket_number) {
      setRemoveItemTarget(null);
      return;
    }

    await itemApi.deleteItem(
      selectedTicket.ticket_number,
      removeItemTarget.item_number,
    );

    const nextItems = items.filter(
      (current) => current.item_number !== removeItemTarget.item_number,
    );

    setItems(nextItems);
    setSelectedItem((prev) => {
      if (
        (prev?.draft_id ?? prev?.item_number) !== removeItemTarget.item_number
      ) {
        return prev ?? null;
      }

      return [...nextItems][0] ?? null;
    });
    setRemoveItemTarget(null);
    setStatusMessage(`Item #${removeItemTarget.item_number} removed.`);
  };

  return {
    handleItemClick,
    handleAddItem,
    handleEditItem,
    handleRemoveItem,
    handleItemSaved,
    handleConfirmRemoveItem,
  };
};
