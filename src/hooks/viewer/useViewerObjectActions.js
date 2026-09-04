import { useCallback, useMemo } from "react";

export function useViewerObjectActions({
  selectedObject,
  selectedObjectName,
  xrayTargetObjects = [],
  removeTargetObjectsXray,
  makeXrayExcept,
  setSelectedObjectName,
  resetVisualState,
  resetXray,
  setBlinkSelectedObjectsEnabled,
  setBlinkTargetObjects,
  setBlinkAssignments,
  clearSelection,
  resetToDefaultCameraView,
  resetCameraToInitialView,
}) {
  const isSelectedObjectXray = useMemo(
    () => Boolean(selectedObject && xrayTargetObjects.includes(selectedObject)),
    [selectedObject, xrayTargetObjects],
  );

  const toggleSelectedObjectXray = useCallback(() => {
    if (!selectedObject) return;

    const targetName = String(selectedObject.name || selectedObjectName || "")
      .replaceAll("_", " ");

    if (xrayTargetObjects.includes(selectedObject)) {
      removeTargetObjectsXray?.([selectedObject]);
      setSelectedObjectName?.(targetName);
      return;
    }

    makeXrayExcept?.(selectedObject);
    setSelectedObjectName?.(targetName);
  }, [
    makeXrayExcept,
    removeTargetObjectsXray,
    selectedObject,
    selectedObjectName,
    setSelectedObjectName,
    xrayTargetObjects,
  ]);

  const resetAllObjectState = useCallback(() => {
    // Reset All is an explicit restore command, so object transforms must
    // return to their authored baseline immediately instead of animating.
    resetVisualState?.({ animationDuration: 0 });
    resetXray?.({ closeInfo: false });
    setBlinkSelectedObjectsEnabled?.(false);
    setBlinkTargetObjects?.([]);
    setBlinkAssignments?.([]);
    clearSelection?.({ closeInfo: false });

    if (!resetToDefaultCameraView?.()) {
      resetCameraToInitialView?.();
    }
  }, [
    clearSelection,
    resetCameraToInitialView,
    resetToDefaultCameraView,
    resetVisualState,
    resetXray,
    setBlinkAssignments,
    setBlinkSelectedObjectsEnabled,
    setBlinkTargetObjects,
  ]);

  return {
    isSelectedObjectXray,
    toggleSelectedObjectXray,
    resetAllObjectState,
  };
}

export default useViewerObjectActions;
