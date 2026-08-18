import { useCallback, useEffect, useMemo, useRef } from "react";
import { createFocusTargetFromStoredView } from "../../engine/camera";
import { applyStoredModelRotation } from "../../engine/model";
import { normalizePlayerSettings } from "../../modules/material/playerSettings";

function createPresentationKey(cameraView, visualState) {
  if (!cameraView && !visualState) return "";

  try {
    return JSON.stringify({ cameraView, visualState });
  } catch {
    return `${cameraView?.savedAt || "camera"}:${visualState?.savedAt || "state"}`;
  }
}

export function useDefaultViewerPresentation({
  material,
  updateMaterialState,
  modelScene,
  cameraRef,
  controlsRef,
  captureCameraView,
  captureVisualState,
  resetVisualState,
  applyVisualState,
  applyStoredCameraFocusTarget,
}) {
  const appliedPresentationRef = useRef({ scene: null, key: "" });
  const playerSettings = useMemo(
    () => normalizePlayerSettings(material?.playerSettings),
    [material?.playerSettings],
  );
  const presentationKey = useMemo(
    () =>
      createPresentationKey(
        playerSettings.defaultCameraView,
        playerSettings.defaultVisualState,
      ),
    [playerSettings.defaultCameraView, playerSettings.defaultVisualState],
  );

  const saveDefaultPlayerCameraViewAndState = useCallback(() => {
    if (!modelScene) return false;

    const cameraView = captureCameraView?.();
    const visualState = captureVisualState?.();

    if (!cameraView || !visualState) return false;

    const savedAt = new Date().toISOString();
    const nextCameraView = { ...cameraView, savedAt };
    const nextVisualState = { ...visualState, savedAt };
    const nextPresentationKey = createPresentationKey(
      nextCameraView,
      nextVisualState,
    );

    appliedPresentationRef.current = {
      scene: modelScene,
      key: nextPresentationKey,
    };

    updateMaterialState((previousMaterial) => ({
      ...previousMaterial,
      playerSettings: {
        ...normalizePlayerSettings(previousMaterial?.playerSettings),
        defaultCameraView: nextCameraView,
        defaultVisualState: nextVisualState,
      },
    }));

    return true;
  }, [
    captureCameraView,
    captureVisualState,
    modelScene,
    updateMaterialState,
  ]);

  useEffect(() => {
    if (!modelScene || !presentationKey) return undefined;

    if (
      appliedPresentationRef.current.scene === modelScene &&
      appliedPresentationRef.current.key === presentationKey
    ) {
      return undefined;
    }

    const cameraView = playerSettings.defaultCameraView;
    const visualState = playerSettings.defaultVisualState;
    let cancelled = false;
    let animationFrameId = null;
    let attempts = 0;

    const applyPresentation = () => {
      if (cancelled) return;

      if (
        cameraView &&
        (!cameraRef?.current || !controlsRef?.current) &&
        attempts < 120
      ) {
        attempts += 1;
        animationFrameId = window.requestAnimationFrame(applyPresentation);
        return;
      }

      if (visualState) {
        resetVisualState?.();
      }

      if (cameraView) {
        applyStoredModelRotation(modelScene, cameraView);
      }

      if (visualState) {
        applyVisualState?.(visualState, { closeInfoOnReset: false });
      }

      if (cameraView) {
        const focusTarget = createFocusTargetFromStoredView(cameraView);
        if (focusTarget) applyStoredCameraFocusTarget?.(focusTarget);
      }

      appliedPresentationRef.current = {
        scene: modelScene,
        key: presentationKey,
      };
    };

    animationFrameId = window.requestAnimationFrame(applyPresentation);

    return () => {
      cancelled = true;
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    applyStoredCameraFocusTarget,
    applyVisualState,
    cameraRef,
    controlsRef,
    modelScene,
    resetVisualState,
    playerSettings.defaultCameraView,
    playerSettings.defaultVisualState,
    presentationKey,
  ]);

  return {
    saveDefaultPlayerCameraViewAndState,
  };
}

export default useDefaultViewerPresentation;
