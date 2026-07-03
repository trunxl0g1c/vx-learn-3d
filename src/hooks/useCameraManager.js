import * as THREE from "three";
import {
  createFocusTargetFromObject,
  createFocusTargetFromScene,
} from "../engine/camera";

const DEFAULT_EDITOR_CAMERA_DIRECTION = new THREE.Vector3(0.8, 0.45, 1);

function applyFocusTargetToControls(focusTarget, controlsRef) {
  if (!focusTarget || !controlsRef?.current) return;

  controlsRef.current.target.copy(focusTarget.target);
  controlsRef.current.update();
}

function syncCameraEngineRefs(vxEngine, modelScene, cameraRef, controlsRef) {
  vxEngine?.camera?.setScene?.(modelScene);
  vxEngine?.camera?.setRefs?.({
    camera: cameraRef?.current,
    controls: controlsRef?.current,
  });
}

export function useCameraManager({
  vxEngine,
  modelScene,
  setTargetRotationY,
  setIsAutoRotating,
  focusTargetRef,
  controlsRef,
  cameraRef,
}) {
  const focusObject = (object) => {
    if (!object || !modelScene) return;

    syncCameraEngineRefs(vxEngine, modelScene, cameraRef, controlsRef);

    const focusTarget =
      vxEngine?.camera?.focusObject?.(object, {
        camera: cameraRef?.current,
        controls: controlsRef?.current,
        distanceMultiplier: 1.8,
        minimumDistance: 0.1,
        direction: DEFAULT_EDITOR_CAMERA_DIRECTION,
        apply: false,
      }) ||
      createFocusTargetFromObject(
        object,
        cameraRef?.current,
        controlsRef?.current,
        {
          distanceMultiplier: 1.8,
          minimumDistance: 0.1,
          direction: DEFAULT_EDITOR_CAMERA_DIRECTION,
        }
      );

    if (!focusTarget) return;

    applyFocusTargetToControls(focusTarget, controlsRef);
    focusTargetRef.current = focusTarget;

    setIsAutoRotating(false);
    setTargetRotationY(modelScene.rotation.y);
  };

  const resetCameraToInitialView = () => {
    if (!modelScene || !cameraRef?.current || !controlsRef?.current) return;

    syncCameraEngineRefs(vxEngine, modelScene, cameraRef, controlsRef);

    const focusTarget =
      vxEngine?.camera?.goHome?.({ apply: false }) ||
      vxEngine?.camera?.reset?.({
        camera: cameraRef?.current,
        distanceMultiplier: 1.7,
        minimumDistance: 1.1,
        direction: DEFAULT_EDITOR_CAMERA_DIRECTION,
        apply: false,
      }) ||
      createFocusTargetFromScene(modelScene, {
        camera: cameraRef?.current,
        distanceMultiplier: 1.7,
        minimumDistance: 1.1,
        direction: DEFAULT_EDITOR_CAMERA_DIRECTION,
      });

    if (!focusTarget) return;

    if (focusTarget.cameraPosition && cameraRef.current.position) {
      cameraRef.current.position.copy(focusTarget.cameraPosition);
    }

    applyFocusTargetToControls(focusTarget, controlsRef);
    focusTargetRef.current = null;

    setIsAutoRotating(false);
    setTargetRotationY(0);
  };

  const saveCurrentViewAsHome = () => {
    if (!modelScene || !cameraRef?.current || !controlsRef?.current) return null;

    syncCameraEngineRefs(vxEngine, modelScene, cameraRef, controlsRef);
    return vxEngine?.camera?.saveHomeView?.();
  };

  return { focusObject, resetCameraToInitialView, saveCurrentViewAsHome };
}
