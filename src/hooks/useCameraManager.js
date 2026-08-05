import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  applyCameraProjectionSnapshot,
  centerCameraOrbitOnScene,
  createCameraProjectionSnapshot,
  createSceneProjectionCenterState,
  resolveSceneProjectionCenter,
  createFocusTargetFromObject,
  createFocusTargetFromScene,
  getClosestOrthographicView,
  switchCameraProjectionThen,
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
  setCameraProjectionMode,
  projectionResetKey = null,
}) {
  const perspectiveReturnViewRef = useRef(null);
  const projectionCenterStateRef = useRef(null);

  useEffect(() => {
    perspectiveReturnViewRef.current = null;
    projectionCenterStateRef.current = createSceneProjectionCenterState(
      modelScene,
    );
  }, [modelScene, projectionResetKey]);

  const ensureProjectionCenterState = () => {
    if (!projectionCenterStateRef.current && modelScene) {
      projectionCenterStateRef.current = createSceneProjectionCenterState(
        modelScene,
      );
    }

    return projectionCenterStateRef.current;
  };

  const centerProjectionOrbit = (camera = cameraRef?.current) => {
    const controls = controlsRef?.current;
    if (!modelScene || !camera || !controls) return false;

    focusTargetRef.current = null;

    return centerCameraOrbitOnScene({
      scene: modelScene,
      centerState: ensureProjectionCenterState(),
      camera,
      controls,
    });
  };
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

    const centeredTarget = camera.isOrthographicCamera
      ? resolveSceneProjectionCenter(
          modelScene,
          ensureProjectionCenterState(),
        )
      : null;

    const focusTarget = vxEngine?.camera?.setViewDirection?.(view.direction, {
      camera,
      controls,
      target: centeredTarget || undefined,
      up: view.up,
      minimumDistance: 0.1,
      apply: false,
    });

    if (!focusTarget) {
      const target = centeredTarget || controls.target.clone();
      const distance = Math.max(camera.position.distanceTo(controls.target), 0.1);

      camera.up.copy(view.up);
      camera.updateProjectionMatrix?.();

      focusTargetRef.current = {
        cameraPosition: target
          .clone()
          .add(view.direction.clone().normalize().multiplyScalar(distance)),
        target,
        cameraType: camera.isOrthographicCamera
          ? "orthographic"
          : "perspective",
        cameraUp: view.up.clone(),
      };
    } else {
      focusTargetRef.current = focusTarget;
    }

    setIsAutoRotating(false);
    return true;
  };

  const applyStoredCameraFocusTarget = (focusTarget) => {
    if (!focusTarget?.cameraPosition || !focusTarget?.target) return false;

    const requestedMode =
      focusTarget.cameraType === "orthographic"
        ? "orthographic"
        : "perspective";
    const currentCamera = cameraRef?.current;
    const currentMode = currentCamera?.isOrthographicCamera
      ? "orthographic"
      : "perspective";

    // A Chapter can switch the projection without going through the View Cube.
    // Preserve the current Perspective view so the user can return to the
    // exact position/target that existed before opening an Orthographic view.
    if (
      requestedMode === "orthographic" &&
      currentMode === "perspective" &&
      currentCamera
    ) {
      const returnView = createCameraProjectionSnapshot(
        currentCamera,
        controlsRef?.current,
      );
      perspectiveReturnViewRef.current = returnView
        ? { ...returnView, source: "stored-camera" }
        : null;
    } else if (requestedMode === "perspective") {
      // A stored Perspective Chapter is authoritative; an older return view
      // must not overwrite its saved coordinates after the camera swap.
      perspectiveReturnViewRef.current = null;
    }

    focusTargetRef.current = null;

    return switchCameraProjectionThen({
      cameraRef,
      setProjectionMode: setCameraProjectionMode,
      mode: requestedMode,
      onReady: () => {
        focusTargetRef.current = focusTarget;
        setIsAutoRotating(false);
      },
    });
  };

  const setEditorCameraProjectionMode = (nextMode) => {
    const normalizedMode =
      nextMode === "orthographic" ? "orthographic" : "perspective";
    const currentCamera = cameraRef?.current;
    const currentMode = currentCamera?.isOrthographicCamera
      ? "orthographic"
      : "perspective";

    if (!currentCamera || normalizedMode === currentMode) return true;

    // Projection changes always use the model's stable original center as the
    // OrbitControls pivot. Only the camera/target move; model transforms are
    // never modified. This prevents the model from appearing laterally shifted
    // after switching between Perspective and Orthographic.
    centerProjectionOrbit(currentCamera);

    if (normalizedMode === "orthographic") {
      const returnView = createCameraProjectionSnapshot(
        currentCamera,
        controlsRef?.current,
      );
      perspectiveReturnViewRef.current = returnView
        ? { ...returnView, source: "manual" }
        : null;
    }

    return switchCameraProjectionThen({
      cameraRef,
      setProjectionMode: setCameraProjectionMode,
      mode: normalizedMode,
      onReady: (activeCamera) => {
        const controls = controlsRef?.current;
        if (!controls) return;

        if (normalizedMode === "orthographic") {
          // Re-assert the stable center after R3F installs the Orthographic
          // camera, then rotate only around that center to the nearest fixed
          // orthographic side.
          centerProjectionOrbit(activeCamera);
          const closestView = getClosestOrthographicView(
            activeCamera,
            controls,
            "front",
          );
          setEditorCameraView(closestView);
          return;
        }

        const returnView = perspectiveReturnViewRef.current;
        const canRestoreManualView = returnView?.source === "manual";
        focusTargetRef.current = null;

        if (canRestoreManualView) {
          applyCameraProjectionSnapshot(returnView, activeCamera, controls);
        } else {
          // Saved Chapter cameras may leave an older Perspective return view.
          // A manual projection toggle must not restore that off-center pivot.
          centerProjectionOrbit(activeCamera);
        }

        perspectiveReturnViewRef.current = null;

        setIsAutoRotating(false);
      },
    });
  };

  return {
    focusObject,
    resetCameraToInitialView,
    saveCurrentViewAsHome,
    setEditorCameraView,
    setEditorCameraProjectionMode,
    applyStoredCameraFocusTarget,
  };
}
