import { resolveLogicalObject } from "../../utils/objectTreeUtils";

/**
 * Procedure-scoped visibility ledger.
 *
 * Hide-after is intentionally persistent across steps in one Procedure. Saved
 * visual-state snapshots may rebuild scene visibility while moving between
 * steps, so the runtime keeps its own logical-object UUID set and can reapply
 * those hides after presentation state is restored.
 */
export function createProceduralVisibilityRuntime() {
  const hiddenObjectIds = new Set();

  const setVisible = (object, visible) => {
    const logicalObject = resolveLogicalObject(object);
    if (!logicalObject) return false;

    logicalObject.visible = visible !== false;
    logicalObject.updateMatrixWorld?.(true);

    if (logicalObject.visible) {
      hiddenObjectIds.delete(logicalObject.uuid);
    } else {
      hiddenObjectIds.add(logicalObject.uuid);
    }

    return true;
  };

  const isHidden = (objectOrUuid) => {
    const uuid =
      typeof objectOrUuid === "string"
        ? objectOrUuid
        : resolveLogicalObject(objectOrUuid)?.uuid;
    return Boolean(uuid && hiddenObjectIds.has(uuid));
  };

  const reapply = (scene) => {
    if (!scene || hiddenObjectIds.size === 0) return false;

    let changed = false;
    [...hiddenObjectIds].forEach((uuid) => {
      const object = scene.getObjectByProperty?.("uuid", uuid);
      const logicalObject = resolveLogicalObject(object);
      if (!logicalObject) {
        hiddenObjectIds.delete(uuid);
        return;
      }

      if (logicalObject.visible !== false) {
        logicalObject.visible = false;
        logicalObject.updateMatrixWorld?.(true);
        changed = true;
      }
    });

    return changed;
  };

  return {
    clear: () => hiddenObjectIds.clear(),
    getHiddenCount: () => hiddenObjectIds.size,
    isHidden,
    reapply,
    setVisible,
  };
}

export default createProceduralVisibilityRuntime;
