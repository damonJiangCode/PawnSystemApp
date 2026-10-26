import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import type { Item } from "../../../../../../shared/models/item.model";
import ItemActionsLayout from "../shared/ItemActionsLayout";

interface HistoryItemActionsProps {
  selectedItem?: Item;
  onEdit: (i: Item) => void;
}

const HistoryItemActions: React.FC<HistoryItemActionsProps> = (props) => {
  const { selectedItem, onEdit } = props;

  return (
    <ItemActionsLayout
      actions={[
        {
          label: "Edit Item",
          icon: <EditIcon />,
          disabled: !selectedItem,
          onClick: () => selectedItem && onEdit(selectedItem),
        },
      ]}
    />
  );
};

export default HistoryItemActions;
