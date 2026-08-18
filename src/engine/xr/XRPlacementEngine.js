import * as THREE from "three";

const DEFAULT_TARGET_SIZE = Object.freeze({
  vr: 1.5,
  ar: 0.65,
});

const MIN_DIMENSION = 1e-5;

function getFinitePositiveNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : fallback;
}

/**
 * Returns the model's current world-space maximum dimension before XR root
 * scaling is applied. This is evaluated once by the Player when modelScene
 * changes, so the result is stable while the XR root is being transformed.
 */
export function getXRModelMaxDimension(modelScene) {
  if (!modelScene) return 0;

  modelScene.updateWorldMatrix?.(true, true);
  const bounds = new THREE.Box3().setFromObject(modelScene);
  if (bounds.isEmpty()) return 0;

  const size = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  return Number.isFinite(maxDimension) && maxDimension > MIN_DIMENSION
    ? maxDimension
    : 0;
}

/**
 * Converts arbitrary GLB authoring units into a predictable physical XR size.
 * The saved project scale remains a user multiplier on top of normalization.
 */
export function getXRNormalizedScale({
  maxDimension,
  mode,
  userScale = 1,
}) {
  const multiplier = getFinitePositiveNumber(userScale, 1);
  const dimension = getFinitePositiveNumber(maxDimension, 0);
  if (!dimension) return multiplier;

  const targetSize = DEFAULT_TARGET_SIZE[mode] || DEFAULT_TARGET_SIZE.vr;
  return (targetSize / dimension) * multiplier;
}

/**
 * Places an XR model in front of the viewer. VR uses horizontal forward so a
 * local-floor reference space does not push the model below the headset view.
 * AR fixed placement follows the full viewer direction.
 */
export function getXRSpawnTransform({
  viewerPosition,
  viewerQuaternion,
  mode,
  distance,
  heightOffset = 0,
}) {
  if (!viewerPosition || !viewerQuaternion) return null;

  const safeDistance = Math.max(0.25, Number(distance) || 1.25);
  const position = viewerPosition.clone();
  const forward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(viewerQuaternion)
    .normalize();

  if (mode === "vr") {
    forward.y = 0;
    if (forward.lengthSq() < MIN_DIMENSION) forward.set(0, 0, -1);
    forward.normalize();
    position.addScaledVector(forward, safeDistance);
    position.y = viewerPosition.y + (Number(heightOffset) || 0);
  } else {
    position.addScaledVector(forward, safeDistance);
    position.y += Number(heightOffset) || 0;
  }

  return {
    position,
    quaternion: new THREE.Quaternion(),
  };
}

function createStoredVector3(value, fallback = null) {
  if (!Array.isArray(value) || value.length < 3) return fallback;
  const vector = new THREE.Vector3(
    Number(value[0]),
    Number(value[1]),
    Number(value[2]),
  );
  return [vector.x, vector.y, vector.z].every(Number.isFinite)
    ? vector
    : fallback;
}

function createStoredQuaternion(value) {
  if (!Array.isArray(value) || value.length < 4) return null;
  const quaternion = new THREE.Quaternion(
    Number(value[0]),
    Number(value[1]),
    Number(value[2]),
    Number(value[3]),
  );
  if (![quaternion.x, quaternion.y, quaternion.z, quaternion.w].every(Number.isFinite)) {
    return null;
  }
  return quaternion.normalize();
}

function getStoredCameraQuaternion(cameraView) {
  if (!cameraView || typeof cameraView !== "object") return null;

  const storedQuaternion = createStoredQuaternion(
    cameraView.quaternion || cameraView.cameraQuaternion,
  );
  if (storedQuaternion) return storedQuaternion;

  const position = createStoredVector3(
    cameraView.position || cameraView.cameraPosition,
  );
  const target = createStoredVector3(
    cameraView.target || cameraView.cameraTarget,
  );
  if (!position || !target || position.distanceToSquared(target) < MIN_DIMENSION) {
    return null;
  }

  const up = createStoredVector3(
    cameraView.up || cameraView.cameraUp,
    new THREE.Vector3(0, 1, 0),
  );
  const matrix = new THREE.Matrix4().lookAt(position, target, up);
  return new THREE.Quaternion().setFromRotationMatrix(matrix).normalize();
}

/**
 * Converts a desktop saved-camera presentation into an XR-safe model pose.
 * The headset camera remains fully user-controlled; instead the presentation
 * root is moved/rotated so the selected model target appears from the authored
 * direction at a comfortable physical distance in front of the viewer.
 */
export function getXRPresentationTransform({
  root,
  targetObject,
  viewerPosition,
  viewerQuaternion,
  mode = "vr",
  distance = 2,
  heightOffset = 0,
  scale = 1,
  cameraView = null,
}) {
  if (!root || !viewerPosition || !viewerQuaternion) return null;

  const safeScale = Math.max(0.0001, Number(scale) || 1);
  const safeDistance = Math.max(0.25, Number(distance) || 2);
  const target = targetObject || root;

  root.updateWorldMatrix?.(true, true);
  target.updateWorldMatrix?.(true, true);

  const bounds = new THREE.Box3().setFromObject(target);
  const centerWorld = bounds.isEmpty()
    ? root.getWorldPosition(new THREE.Vector3())
    : bounds.getCenter(new THREE.Vector3());
  const centerLocal = root.worldToLocal(centerWorld.clone());

  const cameraQuaternion = getStoredCameraQuaternion(cameraView);
  const rootQuaternion = cameraQuaternion
    ? viewerQuaternion.clone().multiply(cameraQuaternion.clone().invert()).normalize()
    : new THREE.Quaternion();

  const forward = new THREE.Vector3(0, 0, -1)
    .applyQuaternion(viewerQuaternion)
    .normalize();
  if (mode === "vr") {
    forward.y = 0;
    if (forward.lengthSq() < MIN_DIMENSION) forward.set(0, 0, -1);
    forward.normalize();
  }

  const desiredCenter = viewerPosition.clone().addScaledVector(
    forward,
    safeDistance,
  );
  if (mode === "vr") {
    desiredCenter.y = viewerPosition.y + (Number(heightOffset) || 0);
  } else {
    desiredCenter.y += Number(heightOffset) || 0;
  }

  const centerOffset = centerLocal
    .clone()
    .multiplyScalar(safeScale)
    .applyQuaternion(rootQuaternion);

  return {
    position: desiredCenter.sub(centerOffset),
    quaternion: rootQuaternion,
    scale: safeScale,
  };
}
