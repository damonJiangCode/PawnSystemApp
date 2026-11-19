import React from "react";
import EditIcon from "@mui/icons-material/Edit";
import type { Item } from "@pawnsystem/shared/models/item.model";
import IconActions from "../../components/IconActions";

interface HistoryItemActionsProps {
  selectedItem?: Item;
  onEdit: (i: Item) => void;
}

const HistoryItemActions: React.FC<HistoryItemActionsProps> = (props) => {
  const { selectedItem, onEdit } = props;

  return (
    <IconActions
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
