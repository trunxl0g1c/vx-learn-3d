import { useCallback, useEffect, useMemo, useRef } from "react";
import { createFocusTargetFromStoredView } from "../../engine/camera";
import { applyStoredModelRotation } from "../../engine/model";
import { normalizePlayerSettings } from "../../modules/material/playerSettings";
import { isOrthographicViewerCamera } from "../../engine/viewer";

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
  rawSetMaterial = null,
  markDirty = null,
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

  const initializeMaterialState = useCallback(
    (updater) => {
      if (rawSetMaterial) {
        const nextMaterial = rawSetMaterial(updater);
        markDirty?.();
        return nextMaterial;
      }

      return updateMaterialState(updater);
    },
    [markDirty, rawSetMaterial, updateMaterialState],
  );

  const saveDefaultPlayerCameraViewAndState = useCallback(() => {
    if (!modelScene) return false;
    if (isOrthographicViewerCamera(cameraRef?.current)) return false;

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
    cameraRef,
    captureCameraView,
    captureVisualState,
    modelScene,
    updateMaterialState,
  ]);

  useEffect(() => {
    if (!modelScene) return undefined;

    const needsCameraView = !playerSettings.defaultCameraView;
    const needsVisualState = !playerSettings.defaultVisualState;
    if (!needsCameraView && !needsVisualState) return undefined;

    let cancelled = false;
    let animationFrameId = null;
    let attempts = 0;

    const captureMissingDefaultPresentation = () => {
      if (cancelled) return;

      // Give R3F/OrbitControls a few frames to finish their initial framing so
      // the automatically stored project default is the same view the user
      // actually sees after the model first opens.
      attempts += 1;
      if (attempts < 3) {
        animationFrameId = window.requestAnimationFrame(
          captureMissingDefaultPresentation,
        );
        return;
      }

      const capturedCameraView = needsCameraView ? captureCameraView?.() : null;
      const capturedVisualState = needsVisualState ? captureVisualState?.() : null;

      if (
        (needsCameraView && !capturedCameraView) ||
        (needsVisualState && !capturedVisualState)
      ) {
        if (attempts < 120) {
          animationFrameId = window.requestAnimationFrame(
            captureMissingDefaultPresentation,
          );
        }
        return;
      }

      const savedAt = new Date().toISOString();

      initializeMaterialState((previousMaterial) => {
        const previousSettings = normalizePlayerSettings(
          previousMaterial?.playerSettings,
        );
        const nextCameraView = previousSettings.defaultCameraView ||
          (capturedCameraView ? { ...capturedCameraView, savedAt } : null);
        const nextVisualState = previousSettings.defaultVisualState ||
          (capturedVisualState ? { ...capturedVisualState, savedAt } : null);

        if (
          previousSettings.defaultCameraView &&
          previousSettings.defaultVisualState
        ) {
          return previousMaterial;
        }

        appliedPresentationRef.current = {
          scene: modelScene,
          key: createPresentationKey(nextCameraView, nextVisualState),
        };

        return {
          ...previousMaterial,
          playerSettings: {
            ...previousSettings,
            defaultCameraView: nextCameraView,
            defaultVisualState: nextVisualState,
          },
        };
      });
    };

    animationFrameId = window.requestAnimationFrame(
      captureMissingDefaultPresentation,
    );

    return () => {
      cancelled = true;
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [
    captureCameraView,
    captureVisualState,
    modelScene,
    playerSettings.defaultCameraView,
    playerSettings.defaultVisualState,
    initializeMaterialState,
  ]);

  const resetToDefaultCameraView = useCallback(() => {
    const cameraView = playerSettings.defaultCameraView;
    if (!modelScene || !cameraView) return false;

    applyStoredModelRotation(modelScene, cameraView);
    const focusTarget = createFocusTargetFromStoredView(cameraView);
    if (!focusTarget) return false;

    return Boolean(applyStoredCameraFocusTarget?.(focusTarget));
  }, [
    applyStoredCameraFocusTarget,
    modelScene,
    playerSettings.defaultCameraView,
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
        applyVisualState?.(visualState, {
          resetBeforeApply: false,
          closeInfoOnReset: false,
        });
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
    resetToDefaultCameraView,
  };
}

export default useDefaultViewerPresentation;
