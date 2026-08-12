import { useCallback, useMemo, useState } from "react";
import {
  createVRSpawnFromView,
  mergeXRSettings,
  normalizeXRSettings,
} from "../engine/xr";

export function useXRAuthoring({
  viewerSettings,
  updateViewerSettings,
  cameraRef,
  controlsRef,
  xrEngine,
}) {
  const [isAuthoringActive, setIsAuthoringActive] = useState(false);
  const [activeMode, setActiveMode] = useState("vr");
  const [support, setSupport] = useState({ vr: null, ar: null });
  const [supportChecking, setSupportChecking] = useState(false);

  const settings = useMemo(
    () => normalizeXRSettings(viewerSettings?.xr),
    [viewerSettings?.xr],
  );

  const updateSettings = useCallback(
    (patch) => {
      updateViewerSettings((current) => ({
        ...current,
        xr: mergeXRSettings(current?.xr, patch),
      }));
    },
    [updateViewerSettings],
  );

  const updateVR = useCallback(
    (patch) => updateSettings({ vr: patch }),
    [updateSettings],
  );

  const updateAR = useCallback(
    (patch) => updateSettings({ ar: patch }),
    [updateSettings],
  );

  const refreshSupport = useCallback(async () => {
    if (!xrEngine?.isSupported) return { vr: false, ar: false };
    setSupportChecking(true);
    try {
      const [vr, ar] = await Promise.all([
        xrEngine.isSupported("vr"),
        xrEngine.isSupported("ar"),
      ]);
      const nextSupport = { vr, ar };
      setSupport(nextSupport);
      return nextSupport;
    } finally {
      setSupportChecking(false);
    }
  }, [xrEngine]);

  const beginAuthoring = useCallback(() => {
    setIsAuthoringActive(true);
    void refreshSupport();
  }, [refreshSupport]);

  const stopAuthoring = useCallback(() => {
    setIsAuthoringActive(false);
  }, []);

  const saveCurrentViewAsVRSpawn = useCallback(() => {
    const spawn = createVRSpawnFromView(
      cameraRef?.current,
      controlsRef?.current,
    );
    if (!spawn) return false;
    updateVR(spawn);
    return true;
  }, [cameraRef, controlsRef, updateVR]);

  return {
    isAuthoringActive,
    activeMode,
    setActiveMode,
    settings,
    support,
    supportChecking,
    beginAuthoring,
    stopAuthoring,
    updateVR,
    updateAR,
    refreshSupport,
    saveCurrentViewAsVRSpawn,
  };
}

export default useXRAuthoring;
