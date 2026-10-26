import React, { useEffect } from "react";
import { itemApi } from "../modules/items/item.api";
import WorkspaceLayout from "./WorkspaceLayout";

const WorkspaceApp: React.FC = () => {
  useEffect(() => {
    itemApi.preloadCategories().catch((err) => {
      console.error("Failed to preload item categories", err);
    });
  }, []);

  return (
    <div>
      <WorkspaceLayout />
    </div>
  );
};

export default WorkspaceApp;
