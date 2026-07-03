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

    vxEngine?.camera?.setScene?.(modelScene);
    vxEngine?.camera?.setRefs?.({
      camera: cameraRef?.current,
      controls: controlsRef?.current,
    });

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

    vxEngine?.camera?.setScene?.(modelScene);
    vxEngine?.camera?.setRefs?.({
      camera: cameraRef?.current,
      controls: controlsRef?.current,
    });

    const focusTarget =
      vxEngine?.camera?.reset?.({
        distanceMultiplier: 2.5,
        minimumDistance: 3,
        direction: DEFAULT_EDITOR_CAMERA_DIRECTION,
        apply: false,
      }) ||
      createFocusTargetFromScene(modelScene, {
        distanceMultiplier: 2.5,
        minimumDistance: 3,
        direction: DEFAULT_EDITOR_CAMERA_DIRECTION,
      });

    if (!focusTarget) return;

    applyFocusTargetToControls(focusTarget, controlsRef);
    focusTargetRef.current = focusTarget;

    setIsAutoRotating(false);
    setTargetRotationY(modelScene.rotation.y);
  };

  return { focusObject, resetCameraToInitialView };
}
