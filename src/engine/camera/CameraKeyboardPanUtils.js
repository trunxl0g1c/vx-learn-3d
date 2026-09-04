import * as THREE from "three";

const DEFAULT_KEYBOARD_PAN_FRACTION = 0.035;
const MIN_PAN_STEP = 0.0001;

const keyboardPanRight = new THREE.Vector3();
const keyboardPanUp = new THREE.Vector3();
const keyboardPanDelta = new THREE.Vector3();

function getPerspectiveViewportSize(camera, distance) {
  const safeDistance = Math.max(Number(distance) || 0, MIN_PAN_STEP);
  const zoom = Math.max(Number(camera?.zoom) || 1, MIN_PAN_STEP);
  const fovRadians = THREE.MathUtils.degToRad(Number(camera?.fov) || 50);
  const height =
    (2 * safeDistance * Math.tan(Math.max(fovRadians, MIN_PAN_STEP) / 2)) /
    zoom;
  const aspect = Math.max(Number(camera?.aspect) || 1, MIN_PAN_STEP);

  return {
    width: height * aspect,
    height,
  };
}

function getOrthographicViewportSize(camera) {
  const zoom = Math.max(Number(camera?.zoom) || 1, MIN_PAN_STEP);

  return {
    width: Math.abs(Number(camera?.right) - Number(camera?.left)) / zoom,
    height: Math.abs(Number(camera?.top) - Number(camera?.bottom)) / zoom,
  };
}

/**
 * Pans a camera and its OrbitControls target together in screen space.
 * Keeping both points translated by the same delta preserves the current
 * viewing direction and orbit distance while making arrow-key movement feel
 * consistent at different zoom levels and model sizes.
 */
export function panCameraByScreenDirection({
  camera,
  controls,
  horizontal = 0,
  vertical = 0,
  fraction = DEFAULT_KEYBOARD_PAN_FRACTION,
} = {}) {
  if (!camera?.position || !controls?.target) return false;
  if (!horizontal && !vertical) return false;

  camera.updateMatrixWorld?.(true);

  keyboardPanRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  keyboardPanUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

  const viewportSize = camera.isOrthographicCamera
    ? getOrthographicViewportSize(camera)
    : getPerspectiveViewportSize(
        camera,
        camera.position.distanceTo(controls.target),
      );
  const safeFraction = Math.max(Number(fraction) || 0, MIN_PAN_STEP);
  const horizontalStep = Math.max(
    Number(viewportSize.width) * safeFraction,
    MIN_PAN_STEP,
  );
  const verticalStep = Math.max(
    Number(viewportSize.height) * safeFraction,
    MIN_PAN_STEP,
  );

  keyboardPanDelta
    .set(0, 0, 0)
    .addScaledVector(keyboardPanRight, horizontal * horizontalStep)
    .addScaledVector(keyboardPanUp, vertical * verticalStep);

  camera.position.add(keyboardPanDelta);
  controls.target.add(keyboardPanDelta);
  camera.updateMatrixWorld?.(true);
  controls.update?.();

  return true;
}
