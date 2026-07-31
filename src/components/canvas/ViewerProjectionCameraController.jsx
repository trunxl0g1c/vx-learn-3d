import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

const DEFAULT_FOV = 50;
const MIN_VISIBLE_HEIGHT = 1e-6;
const MIN_CAMERA_DISTANCE = 1e-6;

function normalizeProjectionMode(mode) {
  return mode === "orthographic" ? "orthographic" : "perspective";
}

function getAspect(size) {
  const width = Math.max(Number(size?.width) || 1, 1);
  const height = Math.max(Number(size?.height) || 1, 1);
  return width / height;
}

function updatePerspectiveProjection(camera, aspect) {
  if (!camera?.isPerspectiveCamera) return;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

function updateOrthographicProjection(camera, aspect) {
  if (!camera?.isOrthographicCamera) return;
  camera.left = -aspect;
  camera.right = aspect;
  camera.top = 1;
  camera.bottom = -1;
  camera.updateProjectionMatrix();
}

function getPerspectiveVisibleHeight(camera, target) {
  const distance = Math.max(
    camera.position.distanceTo(target),
    MIN_CAMERA_DISTANCE,
  );
  const fov = THREE.MathUtils.degToRad(Number(camera.fov) || DEFAULT_FOV);
  return Math.max(2 * distance * Math.tan(fov / 2), MIN_VISIBLE_HEIGHT);
}

function getOrthographicVisibleHeight(camera) {
  const height = Math.abs(Number(camera.top) - Number(camera.bottom)) || 2;
  const zoom = Math.max(Number(camera.zoom) || 1, MIN_CAMERA_DISTANCE);
  return Math.max(height / zoom, MIN_VISIBLE_HEIGHT);
}

function copyCommonCameraState(source, target) {
  target.position.copy(source.position);
  target.quaternion.copy(source.quaternion);
  target.up.copy(source.up).normalize();
  target.near = Math.max(Number(source.near) || 0.001, 1e-6);
  target.far = Math.max(Number(source.far) || 2000, target.near + 1);
}

export default function ViewerProjectionCameraController({
  mode = "perspective",
  cameraRef,
  controlsRef,
  focusTargetRef,
}) {
  const { camera: defaultCamera, size, set, invalidate } = useThree();
  const perspectiveCameraRef = useRef(null);
  const orthographicCamera = useMemo(
    () => new THREE.OrthographicCamera(-1, 1, 1, -1, 0.001, 2000),
    [],
  );
  const normalizedMode = normalizeProjectionMode(mode);
  const aspect = getAspect(size);

  if (!perspectiveCameraRef.current) {
    perspectiveCameraRef.current = defaultCamera?.isPerspectiveCamera
      ? defaultCamera
      : new THREE.PerspectiveCamera(DEFAULT_FOV, aspect, 0.001, 2000);
  }

  useLayoutEffect(() => {
    const perspectiveCamera = perspectiveCameraRef.current;
    const controls = controlsRef?.current;
    const currentCamera = cameraRef?.current || defaultCamera || perspectiveCamera;
    const target = controls?.target?.clone?.() || new THREE.Vector3();

    updatePerspectiveProjection(perspectiveCamera, aspect);
    updateOrthographicProjection(orthographicCamera, aspect);

    const nextCamera =
      normalizedMode === "orthographic"
        ? orthographicCamera
        : perspectiveCamera;

    if (currentCamera !== nextCamera) {
      copyCommonCameraState(currentCamera, nextCamera);

      if (nextCamera.isOrthographicCamera) {
        const visibleHeight = currentCamera.isPerspectiveCamera
          ? getPerspectiveVisibleHeight(currentCamera, target)
          : getOrthographicVisibleHeight(currentCamera);

        nextCamera.zoom = Math.max(2 / visibleHeight, MIN_CAMERA_DISTANCE);
      } else {
        const visibleHeight = currentCamera.isOrthographicCamera
          ? getOrthographicVisibleHeight(currentCamera)
          : getPerspectiveVisibleHeight(currentCamera, target);
        const fov = THREE.MathUtils.degToRad(
          Number(nextCamera.fov) || DEFAULT_FOV,
        );
        const distance = Math.max(
          visibleHeight / (2 * Math.tan(fov / 2)),
          MIN_CAMERA_DISTANCE,
        );
        const direction = currentCamera.position
          .clone()
          .sub(target)
          .normalize();

        if (direction.lengthSq() === 0) direction.set(0, 0, 1);
        nextCamera.position.copy(target).addScaledVector(direction, distance);
      }
    }

    updatePerspectiveProjection(perspectiveCamera, aspect);
    updateOrthographicProjection(orthographicCamera, aspect);
    nextCamera.updateProjectionMatrix();

    set({ camera: nextCamera });
    cameraRef.current = nextCamera;

    if (controls) {
      controls.object = nextCamera;
      controls.update();
    }

    if (focusTargetRef?.current) {
      const pendingMode = normalizeProjectionMode(
        focusTargetRef.current.cameraType,
      );

      // Keep a pending saved view when this switch installs exactly the
      // camera type requested by that view. Manual projection switches still
      // cancel ordinary object-focus animations that do not declare a type.
      if (
        !focusTargetRef.current.cameraType ||
        pendingMode !== normalizedMode
      ) {
        focusTargetRef.current = null;
      }
    }

    invalidate();
  }, [
    aspect,
    cameraRef,
    controlsRef,
    defaultCamera,
    focusTargetRef,
    invalidate,
    normalizedMode,
    orthographicCamera,
    set,
  ]);

  return null;
}
