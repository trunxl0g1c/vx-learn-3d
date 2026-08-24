import { useLayoutEffect } from "react";
import { useProjectStore } from "../../modules/project-store/ProjectStoreContext";

/**
 * ProjectStoreProvider intentionally lives above Routes, so its state survives
 * editor navigation. Clear the previous editor ownership before passive load /
 * autosave effects run for a different project route.
 */
export function useProjectRouteScope(projectId) {
  const { resetProjectStore } = useProjectStore();

  useLayoutEffect(() => {
    resetProjectStore();
  }, [projectId, resetProjectStore]);
}

export default useProjectRouteScope;
