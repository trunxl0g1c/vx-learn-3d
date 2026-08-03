import * as THREE from "three";

const LOCAL_VIEW_DIRECTION = new THREE.Vector3();
const WORLD_QUATERNION = new THREE.Quaternion();

const CAMERA_VIEW_DIRECTIONS = {
  right: new THREE.Vector3(1, 0, 0),
  left: new THREE.Vector3(-1, 0, 0),
  top: new THREE.Vector3(0, 1, 0),
  bottom: new THREE.Vector3(0, -1, 0),
  front: new THREE.Vector3(0, 0, 1),
  back: new THREE.Vector3(0, 0, -1),
  isometric: new THREE.Vector3(1, 0.78, 1),
};

const ORTHOGRAPHIC_STANDARD_VIEW_IDS = new Set([
  "top",
  "bottom",
  "left",
  "right",
]);

const FULL_AXIS_VISIBILITY = Object.freeze({
  constrained: false,
  viewId: "perspective",
  showX: true,
  showY: true,
  showZ: true,
  horizontalAxis: null,
  verticalAxis: null,
  depthAxis: null,
  coordinateSpace: "world",
});

const ORTHOGRAPHIC_AXIS_VISIBILITY = Object.freeze({
  top: Object.freeze({
    constrained: true,
    viewId: "top",
    showX: true,
    showY: false,
    showZ: true,
    horizontalAxis: "X",
    verticalAxis: "Z",
    depthAxis: "Y",
    coordinateSpace: "world",
  }),
  bottom: Object.freeze({
    constrained: true,
    viewId: "bottom",
    showX: true,
    showY: false,
    showZ: true,
    horizontalAxis: "X",
    verticalAxis: "Z",
    depthAxis: "Y",
    coordinateSpace: "world",
  }),
  left: Object.freeze({
    constrained: true,
    viewId: "left",
    showX: false,
    showY: true,
    showZ: true,
    horizontalAxis: "Z",
    verticalAxis: "Y",
    depthAxis: "X",
    coordinateSpace: "world",
  }),
  right: Object.freeze({
    constrained: true,
    viewId: "right",
    showX: false,
    showY: true,
    showZ: true,
    horizontalAxis: "Z",
    verticalAxis: "Y",
    depthAxis: "X",
    coordinateSpace: "world",
  }),
});

export function isOrthographicStandardView(viewId) {
  return ORTHOGRAPHIC_STANDARD_VIEW_IDS.has(viewId);
}

export function detectAlignedCameraView(
  camera,
  controls,
  projectionMode = "perspective",
) {
  if (!camera?.position || !controls?.target) return "perspective";

  const direction = camera.position.clone().sub(controls.target);
  if (direction.lengthSq() <= Number.EPSILON) return "perspective";

  direction.normalize();

  const orthographicMode = projectionMode === "orthographic";
  let bestView = "perspective";
  let bestDot = 0;

  Object.entries(CAMERA_VIEW_DIRECTIONS).forEach(([viewId, viewDirection]) => {
    if (orthographicMode && !isOrthographicStandardView(viewId)) return;

    const dot = direction.dot(viewDirection.clone().normalize());
    if (dot > bestDot) {
      bestDot = dot;
      bestView = viewId;
    }
  });

  const alignedThreshold = bestView === "isometric" ? 0.998 : 0.9985;
  return bestDot >= alignedThreshold ? bestView : "perspective";
}

export function getOrthographicAxisConstraint(
  camera,
  controls,
  projectionMode = "perspective",
  { coordinateSpace = "world", object = null } = {},
) {
  if (projectionMode !== "orthographic") return FULL_AXIS_VISIBILITY;

  const viewId = detectAlignedCameraView(camera, controls, projectionMode);
  const worldConstraint =
    ORTHOGRAPHIC_AXIS_VISIBILITY[viewId] || FULL_AXIS_VISIBILITY;

  if (
    !worldConstraint.constrained ||
    coordinateSpace !== "local" ||
    !object?.getWorldQuaternion ||
    !camera?.position ||
    !controls?.target
  ) {
    return worldConstraint;
  }

  object.updateWorldMatrix?.(true, false);
  object.getWorldQuaternion(WORLD_QUATERNION);
  WORLD_QUATERNION.invert();

  LOCAL_VIEW_DIRECTION.copy(camera.position).sub(controls.target);
  if (LOCAL_VIEW_DIRECTION.lengthSq() <= Number.EPSILON) {
    return worldConstraint;
  }

  LOCAL_VIEW_DIRECTION.normalize().applyQuaternion(WORLD_QUATERNION);

  const localDepthComponents = {
    X: Math.abs(LOCAL_VIEW_DIRECTION.x),
    Y: Math.abs(LOCAL_VIEW_DIRECTION.y),
    Z: Math.abs(LOCAL_VIEW_DIRECTION.z),
  };
  const depthAxis = Object.entries(localDepthComponents).reduce(
    (strongestAxis, [axis, amount]) =>
      amount > strongestAxis.amount ? { axis, amount } : strongestAxis,
    { axis: "X", amount: -1 },
  ).axis;

  return {
    constrained: true,
    viewId,
    showX: depthAxis !== "X",
    showY: depthAxis !== "Y",
    showZ: depthAxis !== "Z",
    horizontalAxis: null,
    verticalAxis: null,
    depthAxis,
    coordinateSpace: "local",
  };
}

export function areAxisConstraintsEqual(left, right) {
  return (
    left?.constrained === right?.constrained &&
    left?.viewId === right?.viewId &&
    left?.showX === right?.showX &&
    left?.showY === right?.showY &&
    left?.showZ === right?.showZ &&
    left?.depthAxis === right?.depthAxis &&
    left?.coordinateSpace === right?.coordinateSpace
  );
}

export function getFullAxisVisibility() {
  return FULL_AXIS_VISIBILITY;
}
