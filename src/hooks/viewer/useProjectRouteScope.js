import { useLayoutEffect } from "react";
import { useProjectStore } from "../../modules/project-store/ProjectStoreContext";
import { releaseUnusedGltfResourcesNow } from "../../engine/model/GltfResourceLifecycle";

/**
 * ProjectStoreProvider intentionally lives above Routes, so its state survives
 * editor navigation unless this route explicitly releases ownership.
 *
 * Clear both when entering a project route (prevents A -> B bleed-through) and
 * when leaving the Editor (prevents Dashboard from retaining material/media,
 * project drafts, and other large project state).
 */
export function useProjectRouteScope(projectId) {
  const { resetProjectStore } = useProjectStore();

  useLayoutEffect(() => {
    resetProjectStore();

    return () => {
      resetProjectStore();

      // Child Model resource cleanup is a passive effect and may run after this
      // layout cleanup. Defer one task so only zero-ref GLTF entries are flushed.
      const releaseTimer = globalThis.setTimeout?.(() => {
        releaseUnusedGltfResourcesNow();
      }, 0);

      // There is intentionally no timer cancellation here: this callback is the
      // teardown work itself. releaseUnusedGltfResourcesNow() is ref-count safe
      // and will ignore any resource immediately retained again by StrictMode.
      void releaseTimer;
    };
  }, [projectId, resetProjectStore]);
}

export default useProjectRouteScope;
