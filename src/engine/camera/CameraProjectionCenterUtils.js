import * as THREE from "three";
import { createRenderableBoundsFromObject } from "./CameraFocusUtils";

const MIN_ORBIT_DISTANCE = 1e-6;
const DEFAULT_ORBIT_RECENTER_DURATION_MS = 220;
const ORBIT_RECENTER_EPSILON = 1e-5;
const DEFAULT_VIEWPORT_CENTER_TOLERANCE = 0.32;
const DEFAULT_VIEWPORT_FRAME_MARGIN = 0.02;

function isFiniteVector3(vector) {
  return Boolean(
    vector &&
      Number.isFinite(vector.x) &&
      Number.isFinite(vector.y) &&
      Number.isFinite(vector.z),
  );
}

function createBoxCorners(box) {
  return [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
}

/**
 * Returns true when the complete model is already inside the viewport and its
 * visible screen-space bounds are already close enough to the middle. In that
 * case starting a rotate gesture should keep the current framing untouched and
 * let native OrbitControls rotate immediately.
 */
export function isSceneComfortablyFramedNearViewportCenter(
  scene,
  camera,
  {
    centerTolerance = DEFAULT_VIEWPORT_CENTER_TOLERANCE,
    frameMargin = DEFAULT_VIEWPORT_FRAME_MARGIN,
  } = {},
) {
  if (!scene || !camera?.projectionMatrix || !camera?.matrixWorldInverse) {
    return false;
  }

  scene.updateMatrixWorld?.(true);
  camera.updateMatrixWorld?.(true);

  // Framing is based on what is actually visible right now. Hidden procedure
  // parts must not force a recenter simply because their stored geometry lives
  // outside the current view.
  const bounds = createRenderableBoundsFromObject(scene, {
    includeHidden: false,
  });

  if (!bounds || bounds.isEmpty?.()) return false;

  const safeTolerance = Math.min(0.95, Math.max(0, Number(centerTolerance) || 0));
  const safeMargin = Math.min(0.25, Math.max(0, Number(frameMargin) || 0));
  const minViewport = -1 + safeMargin;
  const maxViewport = 1 - safeMargin;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const corner of createBoxCorners(bounds)) {
    const projected = corner.project(camera);

    if (!isFiniteVector3(projected)) return false;

    // A corner outside the clip depth means the complete model is not really
    // in-frame even if its X/Y projection happens to fall inside the viewport.
    if (projected.z < -1 || projected.z > 1) return false;

    minX = Math.min(minX, projected.x);
    maxX = Math.max(maxX, projected.x);
    minY = Math.min(minY, projected.y);
    maxY = Math.max(maxY, projected.y);
  }

  const fullyInFrame =
    minX >= minViewport &&
    maxX <= maxViewport &&
    minY >= minViewport &&
    maxY <= maxViewport;

  if (!fullyInFrame) return false;

  const screenCenterX = (minX + maxX) * 0.5;
  const screenCenterY = (minY + maxY) * 0.5;

  return (
    Math.abs(screenCenterX) <= safeTolerance &&
    Math.abs(screenCenterY) <= safeTolerance
  );
}

function getOrbitDirection(camera, controls) {
  const direction = camera?.position?.clone?.()?.sub?.(controls?.target);

  if (
    isFiniteVector3(direction) &&
    direction.lengthSq() > MIN_ORBIT_DISTANCE * MIN_ORBIT_DISTANCE
  ) {
    return direction.normalize();
  }

  const fallback = new THREE.Vector3();
  camera?.getWorldDirection?.(fallback);

  if (
    !isFiniteVector3(fallback) ||
    fallback.lengthSq() <= MIN_ORBIT_DISTANCE * MIN_ORBIT_DISTANCE
  ) {
    return new THREE.Vector3(0, 0, 1);
  }

  return fallback.normalize().negate();
}

/**
 * Capture the model's original logical center in model-local coordinates.
 * Keeping the center local means model rotation/translation remains supported,
 * while Pull Apart or child-object transforms do not move the projection pivot.
 */
export function createSceneProjectionCenterState(scene) {
  if (!scene) return null;

  scene.updateMatrixWorld?.(true);

  const bounds = createRenderableBoundsFromObject(scene, {
    includeHidden: true,
  });

  if (!bounds || bounds.isEmpty?.()) return null;

  const worldCenter = bounds.getCenter(new THREE.Vector3());
  if (!isFiniteVector3(worldCenter)) return null;

  const localCenter = scene.worldToLocal
    ? scene.worldToLocal(worldCenter.clone())
    : worldCenter.clone();

  return isFiniteVector3(localCenter) ? { localCenter } : null;
}

export function resolveSceneProjectionCenter(scene, centerState) {
  const localCenter = centerState?.localCenter;
  if (!scene || !isFiniteVector3(localCenter)) return null;

  scene.updateMatrixWorld?.(true);

  const worldCenter = scene.localToWorld
    ? scene.localToWorld(localCenter.clone())
    : localCenter.clone();

  return isFiniteVector3(worldCenter) ? worldCenter : null;
}

/**
 * Move only the camera orbit and controls target so the model center stays in
 * the middle of the viewport. The model scene/object transforms are untouched.
 */
export function centerCameraOrbitOnScene({
  scene,
  centerState,
  camera,
  controls,
} = {}) {
  if (!camera?.position || !controls?.target) return false;

  const center = resolveSceneProjectionCenter(scene, centerState);
  if (!center) return false;

  const currentDistance = camera.position.distanceTo(controls.target);
  const distance = Number.isFinite(currentDistance)
    ? Math.max(currentDistance, MIN_ORBIT_DISTANCE)
    : 1;
  const direction = getOrbitDirection(camera, controls);

  camera.position.copy(center).addScaledVector(direction, distance);
  controls.object = camera;
  controls.target.copy(center);
  controls.update?.();

  return true;
}

function smoothStep01(value) {
  const t = Math.min(1, Math.max(0, Number(value) || 0));
  return t * t * (3 - 2 * t);
}

/**
 * Creates a reusable recenter animation state for a normal OrbitControls
 * rotation gesture. The model scene itself is never moved. Instead the camera
 * and controls target are translated together until the model's logical center
 * sits on the viewport center. Native OrbitControls can keep rotating while
 * this translation happens, so there is no snap or custom cursor-pivot orbit.
 */
export function createCameraOrbitRecenterState({
  scene,
  centerState,
  camera,
  controls,
  durationMs = DEFAULT_ORBIT_RECENTER_DURATION_MS,
} = {}) {
  if (!scene || !camera?.position || !controls?.target) return null;

  const center = resolveSceneProjectionCenter(scene, centerState);
  if (!center) return null;

  // If the model is already fully visible and visually near the middle of the
  // viewport, do not force another centering pass. Native OrbitControls can
  // rotate from the current framing immediately, which avoids unnecessary
  // camera drift for views that are already good enough.
  if (isSceneComfortablyFramedNearViewportCenter(scene, camera)) {
    return null;
  }

  const startTarget = controls.target.clone();
  const distanceToCenter = startTarget.distanceTo(center);

  if (distanceToCenter <= ORBIT_RECENTER_EPSILON) return null;

  return {
    center,
    startTarget,
    desiredTarget: startTarget.clone(),
    translation: startTarget.clone().set(0, 0, 0),
    durationMs: Math.max(1, Number(durationMs) || DEFAULT_ORBIT_RECENTER_DURATION_MS),
  };
}

/**
 * Advances a recenter animation without overwriting OrbitControls' current
 * rotation. Each frame only applies the translation required to move the orbit
 * target along a smooth path toward the scene center. Because the exact same
 * translation is applied to the camera position, current orientation/distance
 * are preserved while the native orbit remains active.
 */
export function applyCameraOrbitRecenterProgress({
  camera,
  controls,
  recenterState,
  progress,
} = {}) {
  if (
    !camera?.position ||
    !controls?.target ||
    !recenterState?.startTarget ||
    !recenterState?.center
  ) {
    return false;
  }

  const easedProgress = smoothStep01(progress);
  const desiredTarget = recenterState.desiredTarget
    .copy(recenterState.startTarget)
    .lerp(recenterState.center, easedProgress);

  const translation = recenterState.translation
    .copy(desiredTarget)
    .sub(controls.target);

  if (translation.lengthSq() > ORBIT_RECENTER_EPSILON * ORBIT_RECENTER_EPSILON) {
    camera.position.add(translation);
    controls.target.add(translation);
    camera.updateMatrixWorld?.(true);
    controls.update?.();
  }

  if (easedProgress >= 1) {
    const finalTranslation = recenterState.translation
      .copy(recenterState.center)
      .sub(controls.target);

    if (finalTranslation.lengthSq() > 0) {
      camera.position.add(finalTranslation);
      controls.target.copy(recenterState.center);
      camera.updateMatrixWorld?.(true);
      controls.update?.();
    }

    return true;
  }

  return false;
}

