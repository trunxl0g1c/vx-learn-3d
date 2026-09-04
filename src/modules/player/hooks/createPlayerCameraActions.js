import * as THREE from "three";

import {
  createCameraStateFromStoredView,
  createFocusTargetFromObject,
  createFocusTargetFromScene,
  syncCameraClippingToControls,
  switchCameraProjectionThen,
} from "../../../engine/camera";
import { applyStoredModelRotation } from "../../../engine/model";
import { normalizePlayerSettings } from "../../material/playerSettings";

const DEFAULT_PLAYER_CAMERA_DIRECTION = new THREE.Vector3(0.8, 0.45, 1);

export function createPlayerCameraActions({
  cameraRef,
  controlsRef,
  focusTargetRef,
  initialCameraStateRef,
  material,
  modelScene,
  setViewerSettings,
}) {
  const focusObject = (object, options = {}) => {
    if (!object || !focusTargetRef) return;

    const focusTarget = createFocusTargetFromObject(
      object,
      cameraRef?.current,
      controlsRef?.current,
      {
        distanceMultiplier: 1.8,
        ...options,
      },
    );

    if (!focusTarget) return;

    focusTargetRef.current = focusTarget;
  };

  const applyCameraStateToCurrentCamera = (cameraState) => {
    if (!cameraRef?.current || !cameraState?.position || !cameraState?.target) {
      return false;
    }

    const requestedMode =
      cameraState.cameraType === "orthographic"
        ? "orthographic"
        : "perspective";
    const currentMode = cameraRef.current.isOrthographicCamera
      ? "orthographic"
      : "perspective";

    if (requestedMode !== currentMode) return false;

    cameraRef.current.position.copy(cameraState.position);

    if (cameraState.up && cameraRef.current.up) {
      cameraRef.current.up.copy(cameraState.up).normalize();
    }

    if (cameraState.quaternion) {
      cameraRef.current.quaternion.copy(cameraState.quaternion);
    }

    if (
      cameraRef.current.isOrthographicCamera &&
      Number.isFinite(Number(cameraState.zoom))
    ) {
      cameraRef.current.zoom = Number(cameraState.zoom);
    }

    if (
      cameraRef.current.isPerspectiveCamera &&
      Number.isFinite(Number(cameraState.fov)) &&
      "fov" in cameraRef.current
    ) {
      cameraRef.current.fov = Number(cameraState.fov);
    }

    cameraRef.current.updateProjectionMatrix?.();

    if (controlsRef?.current) {
      controlsRef.current.object = cameraRef.current;
      controlsRef.current.target.copy(cameraState.target);
      controlsRef.current.update();
      syncCameraClippingToControls(cameraRef.current, controlsRef.current);
    }

    focusTargetRef.current = null;
    return true;
  };

  const applyCameraState = (cameraState) => {
    if (!cameraState?.position || !cameraState?.target) return false;

    const requestedMode =
      cameraState.cameraType === "orthographic"
        ? "orthographic"
        : "perspective";
    const currentMode = cameraRef?.current?.isOrthographicCamera
      ? "orthographic"
      : "perspective";

    if (requestedMode !== currentMode) {
      return switchCameraProjectionThen({
        cameraRef,
        setViewerSettings,
        mode: requestedMode,
        onReady: () => applyCameraStateToCurrentCamera(cameraState),
      });
    }

    return applyCameraStateToCurrentCamera(cameraState);
  };

  const captureInitialCameraState = (cameraState) => {
    if (!cameraState?.position || !cameraState?.target) return;

    const playerSettings = normalizePlayerSettings(material?.playerSettings);
    const storedCameraState = createCameraStateFromStoredView(
      playerSettings.defaultCameraView,
    );

    const nextCameraState = storedCameraState || {
      position: cameraState.position.clone(),
      quaternion: cameraState.quaternion?.clone?.() || null,
      up: cameraState.up?.clone?.() || cameraRef?.current?.up?.clone?.() || null,
      target: cameraState.target.clone(),
      zoom: Number.isFinite(Number(cameraState.zoom))
        ? Number(cameraState.zoom)
        : 1,
      fov: Number.isFinite(Number(cameraState.fov))
        ? Number(cameraState.fov)
        : cameraRef?.current?.fov ?? null,
      cameraType:
        cameraState.cameraType === "orthographic"
          ? "orthographic"
          : cameraRef?.current?.isOrthographicCamera
            ? "orthographic"
            : "perspective",
    };

    initialCameraStateRef.current = {
      sceneId: cameraState.sceneId || null,
      position: nextCameraState.position.clone(),
      quaternion: nextCameraState.quaternion?.clone?.() || null,
      up: nextCameraState.up?.clone?.() || null,
      target: nextCameraState.target.clone(),
      zoom: nextCameraState.zoom,
      fov: nextCameraState.fov ?? null,
      cameraType:
        nextCameraState.cameraType === "orthographic"
          ? "orthographic"
          : "perspective",
      modelRotation:
        playerSettings.defaultCameraView?.modelRotation ||
        modelScene?.rotation?.toArray?.() ||
        [0, 0, 0],
    };

    if (storedCameraState) {
      applyStoredModelRotation(
        modelScene,
        playerSettings.defaultCameraView,
      );
      applyCameraState(initialCameraStateRef.current);
    }
  };

  const resetCameraToOverview = () => {
    if (!cameraRef?.current) return;

    const initialCameraState = initialCameraStateRef.current;

    if (initialCameraState) {
      applyStoredModelRotation(modelScene, initialCameraState.modelRotation);

      if (applyCameraState(initialCameraState)) {
        return;
      }
    }

    const storedCameraState = createCameraStateFromStoredView(
      normalizePlayerSettings(material?.playerSettings).defaultCameraView,
    );

    if (storedCameraState) {
      const storedCameraView = normalizePlayerSettings(
        material?.playerSettings,
      ).defaultCameraView;

      applyStoredModelRotation(modelScene, storedCameraView);

      initialCameraStateRef.current = {
        sceneId: modelScene?.uuid || modelScene?.id || null,
        position: storedCameraState.position.clone(),
        quaternion: storedCameraState.quaternion?.clone?.() || null,
        up: storedCameraState.up?.clone?.() || null,
        target: storedCameraState.target.clone(),
        zoom: storedCameraState.zoom,
        fov: storedCameraState.fov ?? null,
        cameraType:
          storedCameraState.cameraType === "orthographic"
            ? "orthographic"
            : "perspective",
        modelRotation:
          storedCameraView?.modelRotation ||
          modelScene?.rotation?.toArray?.() ||
          [0, 0, 0],
      };

      if (applyCameraState(initialCameraStateRef.current)) return;
    }

    if (!modelScene) {
      cameraRef.current.position.set(0, 0, 5);
      controlsRef?.current?.target?.set?.(0, 0, 0);
      controlsRef?.current?.update?.();
      focusTargetRef.current = null;
      return;
    }

    const focusTarget = createFocusTargetFromScene(modelScene, {
      camera: cameraRef.current,
      distanceMultiplier: 1.7,
      minimumDistance: 1.1,
      direction: DEFAULT_PLAYER_CAMERA_DIRECTION,
    });

    if (!focusTarget) return;

    if (focusTarget.cameraPosition) {
      cameraRef.current.position.copy(focusTarget.cameraPosition);
    }

    if (controlsRef?.current && focusTarget.target) {
      controlsRef.current.target.copy(focusTarget.target);
      controlsRef.current.update();
    }

    focusTargetRef.current = null;
  };

  return {
    focusObject,
    applyCameraState,
    captureInitialCameraState,
    resetCameraToOverview,
  };
}
