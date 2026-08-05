import * as THREE from "three";
import { createRenderableBoundsFromObject } from "./CameraFocusUtils";

const MIN_ORBIT_DISTANCE = 1e-6;

function isFiniteVector3(vector) {
  return Boolean(
    vector &&
      Number.isFinite(vector.x) &&
      Number.isFinite(vector.y) &&
      Number.isFinite(vector.z),
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
