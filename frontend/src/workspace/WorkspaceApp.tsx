import React, { useEffect } from "react";
import WorkspaceLayout from "./WorkspaceLayout";
import { referenceApi } from "../modules/reference/reference.api";

const WorkspaceApp: React.FC = () => {
  useEffect(() => {
    referenceApi.preloadItemCategories().catch((err) => {
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
