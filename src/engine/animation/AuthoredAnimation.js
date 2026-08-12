import * as THREE from "three";
import { createId } from "../../utils/createId";
import {
  createObjectIndexPath,
  resolveObjectByStoredIndexPath,
} from "../model";
import { resolveLogicalObject } from "../../utils/objectTreeUtils";
import {
  applyWorldMatrixToObject,
  createHydraulicWorldMatrix,
  createMechanicalJointDeltaMatrix,
  createMechanicalRigDefinition,
  createTransformMatrix,
  normalizeMechanicalRig,
} from "./MechanicalRig";
import { organizeAuthoredAnimationTracks } from "./TrackHierarchy";

export const AUTHORED_ANIMATION_EASINGS = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
];

const MIN_DURATION = 0.1;
const MAX_DURATION = 3600;
const EPSILON = 0.0001;

const clampDuration = (value) =>
  THREE.MathUtils.clamp(Number(value) || 2, MIN_DURATION, MAX_DURATION);

const clampTime = (value, duration) =>
  THREE.MathUtils.clamp(Number(value) || 0, 0, clampDuration(duration));

const normalizeVector = (value, fallback) => {
  if (!Array.isArray(value) || value.length < fallback.length) {
    return [...fallback];
  }

  return fallback.map((fallbackValue, index) => {
    const numeric = Number(value[index]);
    return Number.isFinite(numeric) ? numeric : fallbackValue;
  });
};

const normalizeQuaternion = (value) => {
  if (Array.isArray(value) && value.length >= 4) {
    const quaternion = new THREE.Quaternion(...value.slice(0, 4).map(Number));
    if (Number.isFinite(quaternion.lengthSq()) && quaternion.lengthSq() > 0) {
      quaternion.normalize();
      return quaternion.toArray();
    }
  }

  return [0, 0, 0, 1];
};

function normalizeEasing(value) {
  return AUTHORED_ANIMATION_EASINGS.includes(value) ? value : "easeInOut";
}

function applyEasing(value, easing) {
  const t = THREE.MathUtils.clamp(value, 0, 1);

  if (easing === "easeIn") return t * t;
  if (easing === "easeOut") return 1 - (1 - t) * (1 - t);
  if (easing === "easeInOut") {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  return t;
}

function createUniqueName(baseName, existingNames = []) {
  const normalizedBase = String(baseName || "Animation").trim() || "Animation";
  const usedNames = new Set(existingNames.map((name) => String(name || "").trim()));

  if (!usedNames.has(normalizedBase)) return normalizedBase;

  let suffix = 2;
  while (usedNames.has(`${normalizedBase} ${suffix}`)) suffix += 1;
  return `${normalizedBase} ${suffix}`;
}

export function createAuthoredAnimationObjectReference(object, root = null) {
  const logicalObject = resolveLogicalObject(object);
  if (!logicalObject) return null;

  return {
    uuid: logicalObject.uuid || null,
    name: logicalObject.name || logicalObject.type || null,
    path: root ? createObjectIndexPath(logicalObject, root) : null,
  };
}

export function findAuthoredAnimationObject(scene, reference) {
  if (!scene || !reference) return null;

  if (Array.isArray(reference.path)) {
    const byPath = resolveObjectByStoredIndexPath(
      scene,
      reference.path,
      reference.name,
    );
    if (byPath) return resolveLogicalObject(byPath);
  }

  if (reference.uuid) {
    const byUuid = scene.getObjectByProperty?.("uuid", reference.uuid);
    if (byUuid) return resolveLogicalObject(byUuid);
  }

  const targetName = String(reference.name || "").trim();
  if (!targetName) return null;

  let match = null;
  scene.traverse?.((object) => {
    if (match || String(object?.name || "").trim() !== targetName) return;
    match = resolveLogicalObject(object);
  });

  return match;
}

export function createAuthoredAnimationLocalPivot(object, pivotObject) {
  const logicalObject = resolveLogicalObject(object);
  const logicalPivot = resolveLogicalObject(pivotObject);
  if (!logicalObject || !logicalPivot) return null;

  logicalObject.updateMatrixWorld?.(true);
  logicalPivot.updateMatrixWorld?.(true);
  const worldPosition = new THREE.Vector3();
  logicalPivot.getWorldPosition(worldPosition);
  return logicalObject.worldToLocal(worldPosition).toArray();
}

function getNearestHitFaceVertexWorldPosition(hit) {
  const geometry = hit?.object?.geometry;
  const positionAttribute = geometry?.attributes?.position;
  const face = hit?.face;
  const matrixWorld = hit?.object?.matrixWorld;
  const hitPoint = hit?.point;

  if (!positionAttribute || !face || !matrixWorld || !hitPoint) return null;

  const indices = [face.a, face.b, face.c].filter(Number.isInteger);
  if (indices.length === 0) return null;

  let nearest = null;
  let nearestDistanceSq = Infinity;
  const candidate = new THREE.Vector3();

  indices.forEach((index) => {
    candidate.fromBufferAttribute(positionAttribute, index).applyMatrix4(matrixWorld);
    const distanceSq = candidate.distanceToSquared(hitPoint);
    if (distanceSq >= nearestDistanceSq) return;

    nearestDistanceSq = distanceSq;
    nearest = candidate.clone();
  });

  return nearest;
}

export function createAuthoredAnimationLocalPivotFromHit(
  object,
  hit,
  snapMode = "surface",
) {
  const logicalObject = resolveLogicalObject(object);
  if (!logicalObject || !hit?.point) return null;

  logicalObject.updateMatrixWorld?.(true);
  hit.object?.updateMatrixWorld?.(true);

  const worldPosition =
    snapMode === "vertex"
      ? getNearestHitFaceVertexWorldPosition(hit) || hit.point.clone()
      : hit.point.clone();

  return logicalObject.worldToLocal(worldPosition).toArray();
}

export function createAuthoredAnimationTransform(object) {
  const logicalObject = resolveLogicalObject(object);
  if (!logicalObject) return null;

  return {
    position: logicalObject.position.toArray(),
    quaternion: logicalObject.quaternion.toArray(),
    scale: logicalObject.scale.toArray(),
  };
}

export function normalizeAuthoredAnimationTransform(transform) {
  if (!transform || typeof transform !== "object") return null;

  let quaternion = transform.quaternion;
  if (!quaternion && Array.isArray(transform.rotation)) {
    const rotation = normalizeVector(transform.rotation, [0, 0, 0]);
    quaternion = new THREE.Quaternion()
      .setFromEuler(new THREE.Euler(...rotation))
      .toArray();
  }

  return {
    position: normalizeVector(transform.position, [0, 0, 0]),
    quaternion: normalizeQuaternion(quaternion),
    scale: normalizeVector(transform.scale, [1, 1, 1]),
  };
}

function clearPendingModelTransformTargets(object) {
  const logicalObject = resolveLogicalObject(object);
  if (!logicalObject) return;

  logicalObject.traverse?.((child) => {
    if (!child?.userData) return;
    delete child.userData.targetPosition;
    delete child.userData.targetPositionAnimation;
    delete child.userData.moveTargetPosition;
    delete child.userData.moveTargetRotation;
    delete child.userData.moveTargetTransformAnimation;
  });
}

export function applyAuthoredAnimationTransform(object, transform) {
  const logicalObject = resolveLogicalObject(object);
  const normalized = normalizeAuthoredAnimationTransform(transform);
  if (!logicalObject || !normalized) return false;

  clearPendingModelTransformTargets(logicalObject);
  logicalObject.position.fromArray(normalized.position);
  logicalObject.quaternion.fromArray(normalized.quaternion).normalize();
  logicalObject.scale.fromArray(normalized.scale);
  logicalObject.updateMatrix?.();
  logicalObject.updateMatrixWorld?.(true);
  return true;
}

export function normalizeAuthoredAnimationKeyframe(keyframe, index = 0, duration = 2) {
  const source = keyframe && typeof keyframe === "object" ? keyframe : {};

  return {
    ...source,
    id: String(source.id || createId("animation-keyframe")),
    time: clampTime(source.time, duration),
    transform: normalizeAuthoredAnimationTransform(source.transform) || {
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
    easing: normalizeEasing(source.easing),
    orderIndex: Number.isFinite(Number(source.orderIndex))
      ? Number(source.orderIndex)
      : index,
  };
}

export function normalizeAuthoredAnimationTrack(track, index = 0, duration = 2) {
  const source = track && typeof track === "object" ? track : {};
  const keyframes = (Array.isArray(source.keyframes) ? source.keyframes : [])
    .map((keyframe, keyframeIndex) =>
      normalizeAuthoredAnimationKeyframe(keyframe, keyframeIndex, duration),
    )
    .sort((a, b) => a.time - b.time);

  const fallbackBaseTransform =
    normalizeAuthoredAnimationTransform(source.rig?.baseTransform) ||
    keyframes[0]?.transform ||
    null;

  return {
    ...source,
    id: String(source.id || createId("animation-track")),
    object: source.object || source.reference || null,
    keyframes,
    rig: normalizeMechanicalRig(source.rig, fallbackBaseTransform),
    enabled: source.enabled !== false,
    orderIndex: Number.isFinite(Number(source.orderIndex))
      ? Number(source.orderIndex)
      : index,
  };
}

export function normalizeAuthoredAnimationDefinition(animation, index = 0) {
  const source = animation && typeof animation === "object" ? animation : {};
  const duration = clampDuration(source.duration);

  return {
    ...source,
    id: String(source.id || createId("authored-animation")),
    name: String(source.name || `Animation ${index + 1}`),
    description: String(source.description || ""),
    type: "authored",
    enabled: source.enabled !== false,
    duration,
    settings: {
      loop: source.settings?.loop === true,
      speed: THREE.MathUtils.clamp(Number(source.settings?.speed) || 1, 0.05, 10),
      defaultEasing: normalizeEasing(source.settings?.defaultEasing),
      ...(source.settings || {}),
    },
    tracks: organizeAuthoredAnimationTracks(
      (Array.isArray(source.tracks) ? source.tracks : []).map(
        (track, trackIndex) =>
          normalizeAuthoredAnimationTrack(track, trackIndex, duration),
      ),
    ),
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
  };
}

export function normalizeAuthoredAnimationDefinitions(value) {
  return (Array.isArray(value) ? value : []).map((animation, index) =>
    normalizeAuthoredAnimationDefinition(animation, index),
  );
}

export function createAuthoredAnimationDefinition(number = 1) {
  const now = new Date().toISOString();

  return normalizeAuthoredAnimationDefinition({
    id: createId("authored-animation"),
    name: `Animation ${number}`,
    description: "",
    duration: 2,
    settings: {
      loop: false,
      speed: 1,
      defaultEasing: "easeInOut",
    },
    tracks: [],
    createdAt: now,
    updatedAt: now,
  });
}

export function duplicateAuthoredAnimationDefinition(animation, existingNames = []) {
  const source = normalizeAuthoredAnimationDefinition(animation);
  const now = new Date().toISOString();

  return normalizeAuthoredAnimationDefinition({
    ...source,
    id: createId("authored-animation"),
    name: createUniqueName(`${source.name} Copy`, existingNames),
    tracks: source.tracks.map((track) => ({
      ...track,
      id: createId("animation-track"),
      keyframes: track.keyframes.map((keyframe) => ({
        ...keyframe,
        id: createId("animation-keyframe"),
      })),
    })),
    createdAt: now,
    updatedAt: now,
  });
}

export function createAuthoredAnimationTrack(object, root = null) {
  const reference = createAuthoredAnimationObjectReference(object, root);
  const baseTransform = createAuthoredAnimationTransform(object);
  if (!reference) return null;

  return {
    id: createId("animation-track"),
    object: reference,
    keyframes: [],
    rig: createMechanicalRigDefinition(baseTransform),
    enabled: true,
  };
}

export function upsertAuthoredAnimationKeyframe(
  track,
  time,
  transform,
  duration,
  easing = "easeInOut",
) {
  if (!track || !transform) return track;

  const targetTime = clampTime(time, duration);
  const normalizedTransform = normalizeAuthoredAnimationTransform(transform);
  if (!normalizedTransform) return track;

  const keyframes = Array.isArray(track.keyframes) ? track.keyframes : [];
  const existingIndex = keyframes.findIndex(
    (keyframe) => Math.abs(Number(keyframe.time) - targetTime) <= EPSILON,
  );
  const nextKeyframe = normalizeAuthoredAnimationKeyframe(
    {
      ...(existingIndex >= 0 ? keyframes[existingIndex] : {}),
      id:
        existingIndex >= 0
          ? keyframes[existingIndex].id
          : createId("animation-keyframe"),
      time: targetTime,
      transform: normalizedTransform,
      easing,
    },
    existingIndex >= 0 ? existingIndex : keyframes.length,
    duration,
  );
  const nextKeyframes = [...keyframes];

  if (existingIndex >= 0) nextKeyframes[existingIndex] = nextKeyframe;
  else nextKeyframes.push(nextKeyframe);

  return {
    ...track,
    keyframes: nextKeyframes.sort((a, b) => a.time - b.time),
  };
}

export function removeAuthoredAnimationKeyframe(track, keyframeId) {
  if (!track || !keyframeId) return track;
  return {
    ...track,
    keyframes: (track.keyframes || []).filter(
      (keyframe) => keyframe.id !== keyframeId,
    ),
  };
}

function interpolateTransform(first, second, alpha) {
  const start = normalizeAuthoredAnimationTransform(first);
  const end = normalizeAuthoredAnimationTransform(second);
  if (!start || !end) return start || end;

  const t = THREE.MathUtils.clamp(alpha, 0, 1);
  const startQuaternion = new THREE.Quaternion().fromArray(start.quaternion);
  const endQuaternion = new THREE.Quaternion().fromArray(end.quaternion);
  const quaternion = startQuaternion.slerp(endQuaternion, t);

  return {
    position: start.position.map((value, index) =>
      THREE.MathUtils.lerp(value, end.position[index], t),
    ),
    quaternion: quaternion.toArray(),
    scale: start.scale.map((value, index) =>
      THREE.MathUtils.lerp(value, end.scale[index], t),
    ),
  };
}

export function evaluateAuthoredAnimationTrack(track, time) {
  const keyframes = (track?.keyframes || []).filter(
    (keyframe) => keyframe?.transform,
  );
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1 || time <= keyframes[0].time) {
    return keyframes[0].transform;
  }

  const last = keyframes[keyframes.length - 1];
  if (time >= last.time) return last.transform;

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const first = keyframes[index];
    const second = keyframes[index + 1];
    if (time < first.time || time > second.time) continue;

    const span = Math.max(EPSILON, second.time - first.time);
    const progress = (time - first.time) / span;
    return interpolateTransform(
      first.transform,
      second.transform,
      applyEasing(progress, second.easing || first.easing),
    );
  }

  return last.transform;
}

function getTrackBaseTransform(track, object) {
  return (
    normalizeAuthoredAnimationTransform(track?.rig?.baseTransform) ||
    normalizeAuthoredAnimationTransform(track?.keyframes?.[0]?.transform) ||
    createAuthoredAnimationTransform(object)
  );
}

function getObjectWorldPosition(object) {
  if (!object) return null;
  object.updateMatrixWorld?.(true);
  return new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
}

function createTrackRuntimeEntries(scene, definition, time) {
  return definition.tracks
    .filter((track) => track.enabled !== false)
    .map((track) => {
      const object = findAuthoredAnimationObject(scene, track.object);
      const baseTransform = getTrackBaseTransform(track, object);
      const targetTransform = evaluateAuthoredAnimationTrack(track, time) || baseTransform;
      return object && baseTransform
        ? {
            track,
            object,
            rig: normalizeMechanicalRig(track.rig, baseTransform),
            baseTransform,
            targetTransform,
            baseWorldMatrix: null,
            relativeToVirtualParent: null,
          }
        : null;
    })
    .filter(Boolean);
}

function resetEntriesToRigBaseline(entries) {
  entries.forEach((entry) => {
    applyAuthoredAnimationTransform(entry.object, entry.baseTransform);
  });
  entries.forEach((entry) => {
    entry.object.updateMatrixWorld?.(true);
    entry.baseWorldMatrix = entry.object.matrixWorld.clone();
  });
}

function prepareVirtualParentRelations(entries, entryByTrackId) {
  entries.forEach((entry) => {
    const parentEntry = entryByTrackId.get(entry.rig.parentTrackId);
    if (!parentEntry || parentEntry === entry) return;
    entry.relativeToVirtualParent = parentEntry.baseWorldMatrix
      .clone()
      .invert()
      .multiply(entry.baseWorldMatrix);
  });
}

function applyMechanicalEntries(entries) {
  const entryByTrackId = new Map(entries.map((entry) => [entry.track.id, entry]));
  prepareVirtualParentRelations(entries, entryByTrackId);
  const applied = new Set();
  const visiting = new Set();

  const applyEntry = (entry) => {
    if (!entry || applied.has(entry.track.id)) return;
    if (visiting.has(entry.track.id)) {
      entry.rig = { ...entry.rig, parentTrackId: null };
      return;
    }

    visiting.add(entry.track.id);
    const parentEntry = entryByTrackId.get(entry.rig.parentTrackId);
    if (parentEntry && parentEntry !== entry) applyEntry(parentEntry);

    if (entry.rig.type !== "hydraulic") {
      const jointDelta = createMechanicalJointDeltaMatrix(
        entry.rig,
        entry.baseTransform,
        entry.targetTransform || entry.baseTransform,
      );

      if (parentEntry && entry.relativeToVirtualParent) {
        parentEntry.object.updateMatrixWorld?.(true);
        const desiredWorld = parentEntry.object.matrixWorld
          .clone()
          .multiply(entry.relativeToVirtualParent)
          .multiply(jointDelta);
        applyWorldMatrixToObject(entry.object, desiredWorld);
      } else {
        const desiredLocal = createTransformMatrix(entry.baseTransform).multiply(
          jointDelta,
        );
        const desiredWorld = entry.object.parent
          ? entry.object.parent.matrixWorld.clone().multiply(desiredLocal)
          : desiredLocal;
        applyWorldMatrixToObject(entry.object, desiredWorld);
      }
    }

    visiting.delete(entry.track.id);
    applied.add(entry.track.id);
  };

  entries.forEach(applyEntry);
}

function applyHydraulicEntries(scene, entries) {
  entries
    .filter((entry) => entry.rig.type === "hydraulic")
    .forEach((entry) => {
      const baseObject = findAuthoredAnimationObject(
        scene,
        entry.rig.hydraulic?.baseObject,
      );
      const targetObject = findAuthoredAnimationObject(
        scene,
        entry.rig.hydraulic?.targetObject,
      );
      const basePoint = getObjectWorldPosition(baseObject);
      const targetPoint = getObjectWorldPosition(targetObject);
      if (!basePoint || !targetPoint) return;

      const restBase = entry._restBasePoint || basePoint.clone();
      const restTarget = entry._restTargetPoint || targetPoint.clone();
      const restDistance = restBase.distanceTo(restTarget);
      const desiredWorld = createHydraulicWorldMatrix({
        baseWorldMatrix: entry.baseWorldMatrix,
        basePoint,
        targetPoint,
        axis: entry.rig.axis,
        anchorToBase: entry.rig.hydraulic?.anchorToBase !== false,
        stretch: entry.rig.hydraulic?.stretch !== false,
        restDistance,
      });
      if (desiredWorld) applyWorldMatrixToObject(entry.object, desiredWorld);
    });
}

export function applyAuthoredAnimationAtTime(scene, animation, time) {
  const definition = normalizeAuthoredAnimationDefinition(animation);
  if (!scene) return false;

  const entries = createTrackRuntimeEntries(scene, definition, time);
  if (entries.length === 0) return false;

  resetEntriesToRigBaseline(entries);

  entries.forEach((entry) => {
    if (entry.rig.type !== "hydraulic") return;
    const baseObject = findAuthoredAnimationObject(
      scene,
      entry.rig.hydraulic?.baseObject,
    );
    const targetObject = findAuthoredAnimationObject(
      scene,
      entry.rig.hydraulic?.targetObject,
    );
    entry._restBasePoint = getObjectWorldPosition(baseObject);
    entry._restTargetPoint = getObjectWorldPosition(targetObject);
  });

  applyMechanicalEntries(entries);
  scene.updateMatrixWorld?.(true);
  applyHydraulicEntries(scene, entries);
  scene.updateMatrixWorld?.(true);
  return true;
}

export function captureAuthoredAnimationBaseline(scene, animation) {
  const definition = normalizeAuthoredAnimationDefinition(animation);
  if (!scene) return [];

  return definition.tracks
    .map((track) => {
      const object = findAuthoredAnimationObject(scene, track.object);
      const transform = createAuthoredAnimationTransform(object);
      return object && transform ? { object, transform } : null;
    })
    .filter(Boolean);
}

export function restoreAuthoredAnimationBaseline(entries = []) {
  let restored = false;
  entries.forEach((entry) => {
    restored =
      applyAuthoredAnimationTransform(entry?.object, entry?.transform) || restored;
  });
  return restored;
}
