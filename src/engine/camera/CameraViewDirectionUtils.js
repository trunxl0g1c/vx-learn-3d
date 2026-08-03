import * as THREE from "three";

const VIEW_DIRECTIONS = Object.freeze({
  front: new THREE.Vector3(0, 0, 1),
  back: new THREE.Vector3(0, 0, -1),
  right: new THREE.Vector3(1, 0, 0),
  left: new THREE.Vector3(-1, 0, 0),
  top: new THREE.Vector3(0, 1, 0),
  bottom: new THREE.Vector3(0, -1, 0),
  isometric: new THREE.Vector3(1, 0.78, 1).normalize(),
});

const ORTHOGRAPHIC_VIEW_IDS = Object.freeze([
  "front",
  "back",
  "right",
  "left",
  "top",
  "bottom",
]);

const ORTHOGRAPHIC_VIEW_ID_SET = new Set(ORTHOGRAPHIC_VIEW_IDS);

export function isOrthographicStandardView(viewId) {
  return ORTHOGRAPHIC_VIEW_ID_SET.has(viewId);
}

export function getOrthographicStandardViewIds() {
  return [...ORTHOGRAPHIC_VIEW_IDS];
}

function getCameraOrbitDirection(camera, controls) {
  if (!camera?.position || !controls?.target) return null;

  const direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() <= Number.EPSILON) return null;

  return direction.normalize();
}

export function getClosestOrthographicView(
  camera,
  controls,
  fallbackViewId = "front",
) {
  const direction = getCameraOrbitDirection(camera, controls);
  if (!direction) return fallbackViewId;

  let bestViewId = fallbackViewId;
  let bestDot = -Infinity;

  ORTHOGRAPHIC_VIEW_IDS.forEach((viewId) => {
    const dot = direction.dot(VIEW_DIRECTIONS[viewId]);
    if (dot > bestDot) {
      bestDot = dot;
      bestViewId = viewId;
    }
  });

  return bestViewId;
}

export function detectAlignedCameraView(
  camera,
  controls,
  projectionMode = "perspective",
) {
  const direction = getCameraOrbitDirection(camera, controls);
  if (!direction) return "perspective";

  const orthographicMode = projectionMode === "orthographic";
  if (orthographicMode) {
    return getClosestOrthographicView(camera, controls, "front");
  }

  const viewIds = [...ORTHOGRAPHIC_VIEW_IDS, "isometric"];
  let bestViewId = "perspective";
  let bestDot = -Infinity;

  viewIds.forEach((viewId) => {
    const dot = direction.dot(VIEW_DIRECTIONS[viewId]);
    if (dot > bestDot) {
      bestDot = dot;
      bestViewId = viewId;
    }
  });

  const alignedThreshold = bestViewId === "isometric" ? 0.998 : 0.9985;
  return bestDot >= alignedThreshold ? bestViewId : "perspective";
}


export function createCameraProjectionSnapshot(camera, controls) {
  if (!camera?.position || !controls?.target) return null;

  return {
    cameraType: camera.isOrthographicCamera ? "orthographic" : "perspective",
    position: camera.position.clone(),
    quaternion: camera.quaternion?.clone?.() || new THREE.Quaternion(),
    up: camera.up?.clone?.() || new THREE.Vector3(0, 1, 0),
    target: controls.target.clone(),
    zoom: Number.isFinite(Number(camera.zoom)) ? Number(camera.zoom) : 1,
    fov: Number.isFinite(Number(camera.fov)) ? Number(camera.fov) : null,
  };
}

export function applyCameraProjectionSnapshot(snapshot, camera, controls) {
  if (!snapshot || !camera?.position || !controls?.target) return false;

  camera.position.copy(snapshot.position);
  camera.quaternion?.copy?.(snapshot.quaternion);
  camera.up?.copy?.(snapshot.up)?.normalize?.();

  if (
    camera.isPerspectiveCamera &&
    Number.isFinite(Number(snapshot.fov))
  ) {
    camera.fov = Number(snapshot.fov);
  }

  if (
    camera.isOrthographicCamera &&
    Number.isFinite(Number(snapshot.zoom))
  ) {
    camera.zoom = Number(snapshot.zoom);
  }

  camera.updateProjectionMatrix?.();
  controls.object = camera;
  controls.target.copy(snapshot.target);
  controls.update?.();
  return true;
}
