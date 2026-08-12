import { useCallback, useEffect, useRef } from "react";
import {
  applyObjectTransformSnapshot,
  applyVisibilitySnapshot,
  areObjectTransformSnapshotsEqual,
  areVisibilitySnapshotsEqual,
  captureObjectTransformSnapshot,
  captureVisibilitySnapshot,
} from "../../engine/history";

export function useViewerSceneHistory({
  historyEngine,
  modelScene,
  selectedObject,
  selectedObjects,
  multipleSelectEnabled,
  pullApart,
  soloSelectedObjectBase,
  hideSelectedObjectBase,
  hideSelectedObjectsBase,
  showAllObjectsBase,
  hideAllObjectsBase,
  clearSelection,
}) {
  const transformHistoryStartRef = useRef(null);

  useEffect(() => {
    if (modelScene) historyEngine?.clear?.();
  }, [historyEngine, modelScene]);

  const beginObjectTransformHistory = useCallback(
    (object) => {
      if (!object) {
        transformHistoryStartRef.current = null;
        return;
      }

      transformHistoryStartRef.current = captureObjectTransformSnapshot(object);
    },
    [],
  );

  const commitObjectTransformHistory = useCallback(
    (object) => {
      const before = transformHistoryStartRef.current;
      transformHistoryStartRef.current = null;

      if (!before || !object || before.object !== object) return;

      historyEngine?.recordSnapshot?.({
        label: `Transform ${object.name || "object"}`,
        before,
        after: captureObjectTransformSnapshot(object),
        apply: applyObjectTransformSnapshot,
        equals: areObjectTransformSnapshotsEqual,
      });
    },
    [historyEngine],
  );

  const applyVisibilityHistorySnapshot = useCallback(
    (snapshot) => applyVisibilitySnapshot(snapshot, modelScene),
    [modelScene],
  );

  const runVisibilityHistoryAction = useCallback(
    (label, action) => {
      if (!modelScene || typeof action !== "function") return false;

      const before = captureVisibilitySnapshot(modelScene);
      const result = action();
      const after = captureVisibilitySnapshot(modelScene);

      historyEngine?.recordSnapshot?.({
        label,
        before,
        after,
        apply: applyVisibilityHistorySnapshot,
        equals: areVisibilitySnapshotsEqual,
      });

      return result;
    },
    [applyVisibilityHistorySnapshot, historyEngine, modelScene],
  );

  const pullApartSelectedScope = useCallback(() => {
    pullApart(selectedObject);
  }, [pullApart, selectedObject]);

  const soloSelectedObject = useCallback(
    () =>
      runVisibilityHistoryAction("Solo object", () =>
        soloSelectedObjectBase(selectedObject),
      ),
    [runVisibilityHistoryAction, selectedObject, soloSelectedObjectBase],
  );

  const hideSelectedObject = useCallback(
    () =>
      runVisibilityHistoryAction("Hide object", () =>
        hideSelectedObjectBase(selectedObject),
      ),
    [hideSelectedObjectBase, runVisibilityHistoryAction, selectedObject],
  );

  const hideMultipleSelectedObjects = useCallback(() => {
    const targets = multipleSelectEnabled
      ? selectedObjects
      : selectedObject
        ? [selectedObject]
        : [];

    const didHide = runVisibilityHistoryAction("Hide objects", () =>
      hideSelectedObjectsBase(targets),
    );

    if (didHide) clearSelection();
  }, [
    clearSelection,
    hideSelectedObjectsBase,
    multipleSelectEnabled,
    runVisibilityHistoryAction,
    selectedObject,
    selectedObjects,
  ]);

  const showAllObjects = useCallback(
    () => runVisibilityHistoryAction("Show all objects", showAllObjectsBase),
    [runVisibilityHistoryAction, showAllObjectsBase],
  );

  const hideAllObjects = useCallback(
    () => runVisibilityHistoryAction("Hide all objects", hideAllObjectsBase),
    [hideAllObjectsBase, runVisibilityHistoryAction],
  );

  return {
    beginObjectTransformHistory,
    commitObjectTransformHistory,
    pullApartSelectedScope,
    soloSelectedObject,
    hideSelectedObject,
    hideMultipleSelectedObjects,
    showAllObjects,
    hideAllObjects,
  };
}

export default useViewerSceneHistory;
