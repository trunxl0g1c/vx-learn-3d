import * as THREE from "three";

export const MECHANICAL_RIG_TYPES = [
  "free",
  "revolute",
  "linear",
  "hydraulic",
  "morph",
];

export const MECHANICAL_RIG_AXES = ["x", "y", "z"];

const EPSILON = 0.000001;

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeVector3(value, fallback = [0, 0, 0]) {
  if (!Array.isArray(value) || value.length < 3) return [...fallback];
  return [
    toFiniteNumber(value[0], fallback[0]),
    toFiniteNumber(value[1], fallback[1]),
    toFiniteNumber(value[2], fallback[2]),
  ];
}

export function createMechanicalRigDefinition(baseTransform = null) {
  return {
    type: "free",
    parentTrackId: null,
    axis: "y",
    pivot: [0, 0, 0],
    freeTransformSpace: "raw",
    limits: {
      enabled: false,
      min: -180,
      max: 180,
    },
    follow: {
      position: true,
      rotation: true,
      scale: true,
    },
    hydraulic: {
      baseObject: null,
      targetObject: null,
      baseAnchor: [0, 0, 0],
      targetAnchor: [0, 0, 0],
      anchorToBase: true,
      stretch: true,
    },
    morph: {
      targetObject: null,
      mode: "auto",
      hideSourceWhenComplete: true,
      hideTargetWhenStart: true,
    },
    baseTransform: baseTransform || null,
  };
}

export function normalizeMechanicalRig(rig, baseTransform = null) {
  const source = rig && typeof rig === "object" ? rig : {};
  const type = MECHANICAL_RIG_TYPES.includes(source.type)
    ? source.type
    : "free";
  const axis = MECHANICAL_RIG_AXES.includes(source.axis)
    ? source.axis
    : "y";
  const min = toFiniteNumber(source.limits?.min, type === "linear" ? -1 : -180);
  const max = toFiniteNumber(source.limits?.max, type === "linear" ? 1 : 180);

  return {
    ...createMechanicalRigDefinition(baseTransform),
    ...source,
    type,
    parentTrackId: source.parentTrackId || null,
    axis,
    pivot: normalizeVector3(source.pivot, [0, 0, 0]),
    freeTransformSpace:
      source.freeTransformSpace === "raw" ? "raw" : "applied",
    limits: {
      enabled: source.limits?.enabled === true,
      min: Math.min(min, max),
      max: Math.max(min, max),
    },
    follow: {
      position: source.follow?.position !== false,
      rotation: source.follow?.rotation !== false,
      scale: source.follow?.scale !== false,
    },
    hydraulic: {
      baseObject: source.hydraulic?.baseObject || null,
      targetObject: source.hydraulic?.targetObject || null,
      baseAnchor: normalizeVector3(source.hydraulic?.baseAnchor, [0, 0, 0]),
      targetAnchor: normalizeVector3(source.hydraulic?.targetAnchor, [0, 0, 0]),
      anchorToBase: source.hydraulic?.anchorToBase !== false,
      stretch: source.hydraulic?.stretch !== false,
    },
    morph: {
      targetObject: source.morph?.targetObject || null,
      mode: ["auto", "true", "cross"].includes(source.morph?.mode)
        ? source.morph.mode
        : "auto",
      hideSourceWhenComplete: source.morph?.hideSourceWhenComplete !== false,
      hideTargetWhenStart: source.morph?.hideTargetWhenStart !== false,
    },
    baseTransform: source.baseTransform || baseTransform || null,
  };
}

export function getMechanicalRigAxisVector(axis = "y") {
  if (axis === "x") return new THREE.Vector3(1, 0, 0);
  if (axis === "z") return new THREE.Vector3(0, 0, 1);
  return new THREE.Vector3(0, 1, 0);
}

export function createTransformMatrix(transform) {
  const position = new THREE.Vector3().fromArray(transform?.position || [0, 0, 0]);
  const quaternion = new THREE.Quaternion()
    .fromArray(transform?.quaternion || [0, 0, 0, 1])
    .normalize();
  const scale = new THREE.Vector3().fromArray(transform?.scale || [1, 1, 1]);
  return new THREE.Matrix4().compose(position, quaternion, scale);
}

export function decomposeTransformMatrix(matrix) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return {
    position: position.toArray(),
    quaternion: quaternion.normalize().toArray(),
    scale: scale.toArray(),
  };
}

function normalizeSignedRadians(value) {
  let result = value;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function extractTwistAngle(deltaQuaternion, axis) {
  const normalized = deltaQuaternion.clone().normalize();
  const vector = new THREE.Vector3(normalized.x, normalized.y, normalized.z);
  const projection = axis.clone().multiplyScalar(vector.dot(axis));
  const twist = new THREE.Quaternion(
    projection.x,
    projection.y,
    projection.z,
    normalized.w,
  );

  if (twist.lengthSq() <= EPSILON) return 0;
  twist.normalize();
  const signedSinHalf = new THREE.Vector3(twist.x, twist.y, twist.z).dot(axis);
  return normalizeSignedRadians(2 * Math.atan2(signedSinHalf, twist.w));
}

function createFreeDeltaMatrix(rig, baseTransform, targetTransform) {
  const baseMatrix = createTransformMatrix(baseTransform);
  const targetMatrix = createTransformMatrix(targetTransform || baseTransform);
  const relativeMatrix = baseMatrix.clone().invert().multiply(targetMatrix);
  const pivot = new THREE.Vector3().fromArray(rig.pivot || [0, 0, 0]);
  if (
    pivot.lengthSq() <= EPSILON ||
    rig.freeTransformSpace !== "raw"
  ) {
    return relativeMatrix;
  }

  const relative = decomposeTransformMatrix(relativeMatrix);
  const translation = new THREE.Matrix4().makeTranslation(
    relative.position[0],
    relative.position[1],
    relative.position[2],
  );
  const rotation = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().fromArray(relative.quaternion).normalize(),
  );
  const scale = new THREE.Matrix4().makeScale(
    relative.scale[0],
    relative.scale[1],
    relative.scale[2],
  );

  return translation
    .multiply(new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z))
    .multiply(rotation)
    .multiply(scale)
    .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
}

export function createFreeTransformTargetFromAppliedTransform(
  rigValue,
  baseTransform,
  appliedTransform,
) {
  const rig = normalizeMechanicalRig(rigValue, baseTransform);
  const baseMatrix = createTransformMatrix(baseTransform);
  const appliedMatrix = createTransformMatrix(appliedTransform || baseTransform);
  const pivot = new THREE.Vector3().fromArray(rig.pivot || [0, 0, 0]);

  if (rig.type !== "free" || pivot.lengthSq() <= EPSILON) {
    return decomposeTransformMatrix(appliedMatrix);
  }

  const appliedDelta = baseMatrix.clone().invert().multiply(appliedMatrix);
  const relative = decomposeTransformMatrix(appliedDelta);
  const relativeRotation = new THREE.Quaternion()
    .fromArray(relative.quaternion)
    .normalize();
  const relativeScale = new THREE.Vector3().fromArray(relative.scale);
  const rawTranslation = new THREE.Vector3()
    .fromArray(relative.position)
    .sub(pivot)
    .add(pivot.clone().multiply(relativeScale).applyQuaternion(relativeRotation));
  const rawDelta = new THREE.Matrix4().compose(
    rawTranslation,
    relativeRotation,
    relativeScale,
  );

  return decomposeTransformMatrix(baseMatrix.multiply(rawDelta));
}

function createRevoluteDeltaMatrix(rig, baseTransform, targetTransform) {
  const axis = getMechanicalRigAxisVector(rig.axis);
  const baseQuaternion = new THREE.Quaternion()
    .fromArray(baseTransform.quaternion)
    .normalize();
  const targetQuaternion = new THREE.Quaternion()
    .fromArray(targetTransform.quaternion)
    .normalize();
  const deltaQuaternion = baseQuaternion.clone().invert().multiply(targetQuaternion);
  let angle = extractTwistAngle(deltaQuaternion, axis);

  if (rig.limits?.enabled) {
    const min = THREE.MathUtils.degToRad(rig.limits.min);
    const max = THREE.MathUtils.degToRad(rig.limits.max);
    angle = THREE.MathUtils.clamp(angle, min, max);
  }

  const pivot = new THREE.Vector3().fromArray(rig.pivot || [0, 0, 0]);
  const rotation = new THREE.Matrix4().makeRotationFromQuaternion(
    new THREE.Quaternion().setFromAxisAngle(axis, angle),
  );

  return new THREE.Matrix4()
    .makeTranslation(pivot.x, pivot.y, pivot.z)
    .multiply(rotation)
    .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
}

function createLinearDeltaMatrix(rig, baseTransform, targetTransform) {
  const axis = getMechanicalRigAxisVector(rig.axis);
  const basePosition = new THREE.Vector3().fromArray(baseTransform.position);
  const targetPosition = new THREE.Vector3().fromArray(targetTransform.position);
  const baseQuaternion = new THREE.Quaternion()
    .fromArray(baseTransform.quaternion)
    .normalize();
  const baseScale = new THREE.Vector3().fromArray(baseTransform.scale);

  const localDelta = targetPosition
    .sub(basePosition)
    .applyQuaternion(baseQuaternion.clone().invert());

  if (Math.abs(baseScale.x) > EPSILON) localDelta.x /= baseScale.x;
  if (Math.abs(baseScale.y) > EPSILON) localDelta.y /= baseScale.y;
  if (Math.abs(baseScale.z) > EPSILON) localDelta.z /= baseScale.z;

  let distance = localDelta.dot(axis);
  if (rig.limits?.enabled) {
    distance = THREE.MathUtils.clamp(distance, rig.limits.min, rig.limits.max);
  }

  return new THREE.Matrix4().makeTranslation(
    axis.x * distance,
    axis.y * distance,
    axis.z * distance,
  );
}

export function createMechanicalJointDeltaMatrix(
  rigValue,
  baseTransform,
  targetTransform,
) {
  const rig = normalizeMechanicalRig(rigValue, baseTransform);
  const baseMatrix = createTransformMatrix(baseTransform);
  const targetMatrix = createTransformMatrix(targetTransform || baseTransform);

  if (rig.type === "revolute") {
    return createRevoluteDeltaMatrix(rig, baseTransform, targetTransform || baseTransform);
  }

  if (rig.type === "linear") {
    return createLinearDeltaMatrix(rig, baseTransform, targetTransform || baseTransform);
  }

  if (rig.type === "hydraulic") {
    return new THREE.Matrix4().identity();
  }

  if (rig.type === "free" || rig.type === "morph") {
    return createFreeDeltaMatrix(rig, baseTransform, targetTransform || baseTransform);
  }

  return baseMatrix.clone().invert().multiply(targetMatrix);
}

export function applyWorldMatrixToObject(object, worldMatrix) {
  if (!object || !worldMatrix) return false;

  const localMatrix = worldMatrix.clone();
  if (object.parent) {
    object.parent.updateMatrixWorld?.(true);
    localMatrix.premultiply(object.parent.matrixWorld.clone().invert());
  }

  localMatrix.decompose(object.position, object.quaternion, object.scale);
  object.quaternion.normalize();
  object.updateMatrix?.();
  object.updateMatrixWorld?.(true);
  return true;
}

export function applyMechanicalPivotTransform(
  object,
  startObjectWorldMatrix,
  startPivotWorldMatrix,
  currentPivotWorldMatrix,
) {
  if (
    !object ||
    !startObjectWorldMatrix ||
    !startPivotWorldMatrix ||
    !currentPivotWorldMatrix
  ) {
    return false;
  }

  const pivotDelta = currentPivotWorldMatrix
    .clone()
    .multiply(startPivotWorldMatrix.clone().invert());
  const desiredWorldMatrix = pivotDelta.multiply(
    startObjectWorldMatrix.clone(),
  );

  return applyWorldMatrixToObject(object, desiredWorldMatrix);
}

export function createHydraulicWorldMatrix({
  baseWorldMatrix,
  basePoint,
  targetPoint,
  axis = "y",
  anchorToBase = true,
  stretch = true,
  restDistance = null,
}) {
  if (!baseWorldMatrix || !basePoint || !targetPoint) return null;

  const objectPosition = new THREE.Vector3();
  const objectQuaternion = new THREE.Quaternion();
  const objectScale = new THREE.Vector3();
  baseWorldMatrix.decompose(objectPosition, objectQuaternion, objectScale);

  const direction = targetPoint.clone().sub(basePoint);
  const distance = direction.length();
  if (distance <= EPSILON) return baseWorldMatrix.clone();
  direction.normalize();

  const localAxis = getMechanicalRigAxisVector(axis);
  const initialAxisWorld = localAxis.clone().applyQuaternion(objectQuaternion).normalize();
  const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(
    initialAxisWorld,
    direction,
  );
  const nextQuaternion = alignQuaternion.multiply(objectQuaternion).normalize();
  const nextScale = objectScale.clone();

  if (stretch && Number(restDistance) > EPSILON) {
    const ratio = distance / Number(restDistance);
    if (axis === "x") nextScale.x *= ratio;
    else if (axis === "z") nextScale.z *= ratio;
    else nextScale.y *= ratio;
  }

  return new THREE.Matrix4().compose(
    anchorToBase ? basePoint.clone() : objectPosition,
    nextQuaternion,
    nextScale,
  );
}
