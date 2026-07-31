import * as THREE from "three";
import {
  createFocusTargetFromObject,
  createFocusTargetFromScene,
} from "../engine/camera";

const DEFAULT_EDITOR_CAMERA_DIRECTION = new THREE.Vector3(0.8, 0.45, 1);

const EDITOR_CAMERA_VIEWS = {
  perspective: {
    direction: new THREE.Vector3(0.8, 0.45, 1),
    up: new THREE.Vector3(0, 1, 0),
  },
  isometric: {
    direction: new THREE.Vector3(1, 0.78, 1),
    up: new THREE.Vector3(0, 1, 0),
  },
  front: {
    direction: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
  },
  back: {
    direction: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
  },
  right: {
    direction: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  left: {
    direction: new THREE.Vector3(-1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
  },
  top: {
    direction: new THREE.Vector3(0, 1, 0),
    up: new THREE.Vector3(0, 0, -1),
  },
  bottom: {
    direction: new THREE.Vector3(0, -1, 0),
    up: new THREE.Vector3(0, 0, 1),
  },
};

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
        direction: DEFAULT_EDITOR_CAMERA_DIRECTION,
        apply: false,
      }) ||
      createFocusTargetFromObject(
        object,
        cameraRef?.current,
        controlsRef?.current,
        {
          distanceMultiplier: 1.8,
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

  const setEditorCameraView = (viewId) => {
    const view = EDITOR_CAMERA_VIEWS[viewId];
    const camera = cameraRef?.current;
    const controls = controlsRef?.current;

    if (!view || !camera?.position || !controls?.target) return false;

    syncCameraEngineRefs(vxEngine, modelScene, cameraRef, controlsRef);

    const focusTarget = vxEngine?.camera?.setViewDirection?.(view.direction, {
      camera,
      controls,
      up: view.up,
      minimumDistance: 0.1,
      apply: false,
    });

    if (!focusTarget) {
      const target = controls.target.clone();
      const distance = Math.max(camera.position.distanceTo(target), 0.1);

      camera.up.copy(view.up);
      camera.updateProjectionMatrix?.();

      focusTargetRef.current = {
        cameraPosition: target
          .clone()
          .add(view.direction.clone().normalize().multiplyScalar(distance)),
        target,
      };
    } else {
      focusTargetRef.current = focusTarget;
    }

    setIsAutoRotating(false);
    return true;
  };

  return {
    focusObject,
    resetCameraToInitialView,
    saveCurrentViewAsHome,
    setEditorCameraView,
  };
}
