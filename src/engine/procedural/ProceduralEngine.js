import { createId } from "../../utils/createId";
import * as THREE from "three";
import {
  getLazyMaterialRecordMeta,
  markLazyMaterialRecord,
} from "../project/LazyMaterialRecords";
import {
  createObjectIndexPath,
  resolveObjectByStoredIndexPath,
} from "../model";
import {
  getLogicalObjectParent,
  resolveLogicalObject,
} from "../../utils/objectTreeUtils";
import {
  createProceduralPlaybackDefinitionWithHelpers,
  createProceduralPlaybackStepWithHelpers,
  duplicateProceduralDefinitionWithHelpers,
  materializeReversedProceduralDefinitionWithHelpers,
} from "./ProceduralDefinitionTransforms";

const DEFAULT_DURATION = 1200;
const MIN_DURATION = 100;
const MAX_DURATION = 30000;

export const PROCEDURAL_ANIMATION_MODES = {
  TOGETHER: "together",
  SEQUENTIAL: "sequential",
};

export const PROCEDURE_TYPES = {
  GUIDED: "guided",
  ASSEMBLY: "assembly",
};

const normalizeProcedureType = (type) =>
  type === PROCEDURE_TYPES.ASSEMBLY || type === "disassembly"
    ? PROCEDURE_TYPES.ASSEMBLY
    : PROCEDURE_TYPES.GUIDED;

const DEFAULT_PROCEDURE_COMPLETION_ANIMATION = {
  name: "",
  autoPlay: true,
  loop: false,
  speed: 1,
};

const DEFAULT_ASSEMBLY_INTERACTION = {
  type: "drag",
  dragSpace: "local",
  // Fraction of the complete model diagonal. Using a relative value keeps the
  // same authored tolerance useful across GLBs exported in different units.
  snapDistance: 0.05,
  rotationTolerance: 15,
  matchRotation: false,
  autoSnap: true,
  snapBackOnFail: true,
  showGhost: true,
};

const clampDuration = (value) =>
  THREE.MathUtils.clamp(Number(value) || DEFAULT_DURATION, MIN_DURATION, MAX_DURATION);

const normalizeProcedureCompletionAnimation = (value) => {
  const source =
    typeof value === "string"
      ? { name: value }
      : value && typeof value === "object"
        ? value
        : {};
  const speed = Number(source.speed);

  return {
    ...DEFAULT_PROCEDURE_COMPLETION_ANIMATION,
    ...source,
    name: String(source.name || "").trim(),
    autoPlay: source.autoPlay !== false,
    loop: source.loop === true,
    speed: Number.isFinite(speed) && speed > 0
      ? THREE.MathUtils.clamp(speed, 0.05, 10)
      : 1,
  };
};

const sanitizeVector = (value, fallback) => {
  if (!Array.isArray(value) || value.length < 3) return [...fallback];

  return value.slice(0, 3).map((entry, index) => {
    const numeric = Number(entry);
    return Number.isFinite(numeric) ? numeric : fallback[index];
  });
};

export function createProceduralObjectReference(object, root = null) {
  const logicalObject = resolveLogicalObject(object);

  if (!logicalObject) return null;

  return {
    uuid: logicalObject.uuid || null,
    name: logicalObject.name || logicalObject.type || null,
    path: root ? createObjectIndexPath(logicalObject, root) : null,
  };
}

export function findProceduralObject(scene, reference) {
  if (!scene || !reference) return null;

  if (Array.isArray(reference.path)) {
    // createObjectIndexPath stores paths relative to the logical model root.
    // Editor may pass an anonymous R3F wrapper while Player may pass the GLTF
    // scene directly, so resolving from scene.children manually is unsafe.
    const pathMatch = resolveObjectByStoredIndexPath(
      scene,
      reference.path,
      reference.name,
    );

    if (pathMatch) return resolveLogicalObject(pathMatch);
  }

  if (reference.uuid) {
    const byUuid = scene.getObjectByProperty?.("uuid", reference.uuid);
    if (byUuid) return resolveLogicalObject(byUuid);
  }

  const targetName = String(reference.name || "").trim();
  if (!targetName) return null;

  let match = null;
  scene.traverse((object) => {
    if (match) return;
    if (String(object?.name || "").trim() === targetName) {
      match = resolveLogicalObject(object);
    }
  });

  return match;
}

export function createStoredObjectTransform(object) {
  const logicalObject = resolveLogicalObject(object);
  if (!logicalObject) return null;

  return {
    position: logicalObject.position.toArray(),
    rotation: [
      logicalObject.rotation.x,
      logicalObject.rotation.y,
      logicalObject.rotation.z,
    ],
    scale: logicalObject.scale.toArray(),
  };
}

export function normalizeStoredObjectTransform(transform, fallback = null) {
  const base = fallback || {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  };

  if (!transform) return null;

  return {
    position: sanitizeVector(transform.position, base.position),
    rotation: sanitizeVector(transform.rotation, base.rotation),
    scale: sanitizeVector(transform.scale, base.scale),
  };
}

function createAnimatedEntryId(reference, index = 0) {
  const identity =
    reference?.uuid ||
    (Array.isArray(reference?.path) ? reference.path.join("-") : "") ||
    reference?.name ||
    "object";

  return `animated-${identity}-${index}`;
}

function getProceduralReferenceIdentity(reference) {
  if (!reference || typeof reference !== "object") return "";

  if (reference.uuid) return `uuid:${reference.uuid}`;
  if (Array.isArray(reference.path)) return `path:${reference.path.join(".")}`;
  if (reference.name) return `name:${String(reference.name).trim()}`;

  return "";
}

export function normalizeProceduralClickTargets(step, assemblyStep = false) {
  const source = Array.isArray(step?.clickTargets) ? step.clickTargets : [];
  const legacyReference = assemblyStep
    ? step?.targetObject || step?.animatedObject || step?.actionObject || null
    : step?.targetObject || null;
  const candidates =
    source.length > 0
      ? source
      : legacyReference
        ? [legacyReference]
        : [];
  const identities = new Set();

  const normalized = candidates
    .map((entry) => entry?.object || entry?.reference || entry)
    .filter((reference) => reference && typeof reference === "object")
    .filter((reference) => {
      const identity = getProceduralReferenceIdentity(reference);

      if (!identity) return true;
      if (identities.has(identity)) return false;

      identities.add(identity);
      return true;
    });

  return assemblyStep ? normalized.slice(0, 1) : normalized;
}

export function normalizeProceduralAnimatedObjects(step, assemblyStep = false) {
  const source = Array.isArray(step?.animatedObjects)
    ? step.animatedObjects
    : [];
  const legacyReference =
    step?.animatedObject || step?.actionObject || step?.targetObject || null;
  const normalizedSource =
    source.length > 0
      ? source
      : legacyReference
        ? [{
            object: legacyReference,
            startTransform: step?.startTransform,
            endTransform: step?.endTransform,
          }]
        : [];

  const normalized = normalizedSource
    .map((entry, index) => {
      const reference =
        entry?.object || entry?.reference || entry?.animatedObject || entry;
      if (!reference || typeof reference !== "object") return null;

      const startTransform = normalizeStoredObjectTransform(
        entry?.startTransform || (index === 0 ? step?.startTransform : null),
      );
      const endTransform = normalizeStoredObjectTransform(
        entry?.endTransform || (index === 0 ? step?.endTransform : null),
        startTransform || undefined,
      );

      return {
        id: String(entry?.id || createAnimatedEntryId(reference, index)),
        object: reference,
        startTransform,
        endTransform,
        startVisible:
          entry?.startVisible !== undefined
            ? entry.startVisible !== false
            : index === 0
              ? step?.startVisible !== false
              : true,
        hideAfterAnimation:
          entry?.hideAfterAnimation === true ||
          (index === 0 && step?.hideAfterAnimation === true),
      };
    })
    .filter(Boolean);

  return assemblyStep ? normalized.slice(0, 1) : normalized;
}

export function getProceduralAnimatedObjects(
  step,
  procedureType = PROCEDURE_TYPES.GUIDED,
) {
  return normalizeProceduralAnimatedObjects(
    step,
    isAssemblyProcedure(procedureType),
  );
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

export function applyStoredObjectTransform(object, transform) {
  const logicalObject = resolveLogicalObject(object);
  const normalized = normalizeStoredObjectTransform(transform);

  if (!logicalObject || !normalized) return false;

  // Model reset / Pull Apart uses per-frame targetPosition animations. If one
  // remains armed while a Procedure Start transform is applied, Model.jsx can
  // move the object straight back to its original GLB position on the next
  // frame. Procedure transforms are authoritative, so cancel those pending
  // model-level targets first.
  clearPendingModelTransformTargets(logicalObject);

  logicalObject.position.fromArray(normalized.position);
  logicalObject.rotation.set(...normalized.rotation);
  logicalObject.scale.fromArray(normalized.scale);
  logicalObject.updateMatrix?.();
  logicalObject.updateMatrixWorld?.(true);
  return true;
}

export function collectProceduralMeshes(object) {
  const logicalObject = resolveLogicalObject(object);
  const meshes = [];

  logicalObject?.traverse?.((child) => {
    if (child.isMesh || child.isSkinnedMesh) meshes.push(child);
  });

  return meshes;
}

/**
 * Returns true when the clicked logical object is the configured click target
 * or one of its logical descendants. This lets an authored parent target be
 * triggered through any visible child mesh, while a child target remains
 * isolated from its siblings.
 */
export function matchesProceduralClickTarget(
  clickedObject,
  targetObject,
  root = null,
) {
  const clickedLogicalObject = resolveLogicalObject(clickedObject);
  const targetLogicalObject = resolveLogicalObject(targetObject);

  if (!clickedLogicalObject || !targetLogicalObject) return false;

  let current = clickedLogicalObject;
  const visited = new Set();

  while (current && !visited.has(current)) {
    if (current === targetLogicalObject) return true;

    visited.add(current);
    current = getLogicalObjectParent(current, root);
  }

  return false;
}

export function matchesAnyProceduralClickTarget(
  clickedObject,
  targetObjects,
  root = null,
) {
  return (Array.isArray(targetObjects) ? targetObjects : [targetObjects])
    .filter(Boolean)
    .some((targetObject) =>
      matchesProceduralClickTarget(clickedObject, targetObject, root),
    );
}

export function isAssemblyProcedure(procedureOrType) {
  const type =
    typeof procedureOrType === "string"
      ? procedureOrType
      : procedureOrType?.type;

  return normalizeProcedureType(type) === PROCEDURE_TYPES.ASSEMBLY;
}

export function createProceduralStep(
  stepNumber = 1,
  procedureType = PROCEDURE_TYPES.GUIDED,
) {
  const assemblyStep = isAssemblyProcedure(procedureType);

  return {
    id: createId("procedure-step"),
    name: `Step ${stepNumber}`,
    instruction: assemblyStep
      ? "Geser komponen yang ditandai ke posisi pemasangan yang benar."
      : "Klik object yang ditandai untuk menjalankan langkah ini.",
    enabled: true,
    // Objects the player may click to trigger this step. targetObject mirrors
    // the first entry for backward compatibility with older project packages.
    targetObject: null,
    clickTargets: [],
    // Object that receives the stored transform animation. It may be the
    // same logical object as targetObject or a different logical object.
    animatedObject: null,
    animatedObjects: [],
    startTransform: null,
    endTransform: null,
    visualState: null,
    cameraViewSaved: false,
    cameraView: null,
    interaction: assemblyStep
      ? { ...DEFAULT_ASSEMBLY_INTERACTION }
      : { type: "click" },
    action: {
      duration: DEFAULT_DURATION,
      easing: "easeOut",
      spinAxis: "z",
      spinTurns: 0,
      animatedObjectMode: PROCEDURAL_ANIMATION_MODES.TOGETHER,
    },
  };
}

export function createProceduralDefinition(
  procedureNumber = 1,
  type = PROCEDURE_TYPES.GUIDED,
) {
  const normalizedType = normalizeProcedureType(type);

  return {
    id: createId("procedure"),
    name: `${normalizedType === PROCEDURE_TYPES.ASSEMBLY ? "Assembly" : "Procedure"} ${procedureNumber}`,
    type: normalizedType,
    description: "",
    enabled: true,
    settings: {
      resetOnStart: true,
      showProgress: true,
      reverseSteps: false,
      completionAnimation: { ...DEFAULT_PROCEDURE_COMPLETION_ANIMATION },
    },
    steps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeProceduralStep(
  step,
  index = 0,
  procedureType = PROCEDURE_TYPES.GUIDED,
) {
  const fallbackStep = createProceduralStep(index + 1, procedureType);
  const startTransform = normalizeStoredObjectTransform(step?.startTransform);
  const endTransform = normalizeStoredObjectTransform(
    step?.endTransform,
    startTransform || undefined,
  );
  const assemblyStep = isAssemblyProcedure(procedureType);
  const animatedObjects = normalizeProceduralAnimatedObjects(step, assemblyStep);
  const primaryAnimatedEntry = animatedObjects[0] || null;
  const animatedObject = primaryAnimatedEntry?.object || null;
  const clickTargets = assemblyStep
    ? animatedObject
      ? [animatedObject]
      : []
    : normalizeProceduralClickTargets(step, false);
  const targetObject = clickTargets[0] || null;

  return {
    ...fallbackStep,
    ...(step || {}),
    id: step?.id || fallbackStep.id,
    name: String(step?.name || `Step ${index + 1}`),
    instruction: String(
      step?.instruction ||
        fallbackStep.instruction,
    ),
    enabled: step?.enabled !== false,
    targetObject,
    clickTargets,
    // Backward compatibility keeps the first animated entry mirrored on the
    // legacy single-object fields used by older project packages.
    animatedObject,
    animatedObjects,
    startTransform: primaryAnimatedEntry?.startTransform || startTransform,
    endTransform: primaryAnimatedEntry?.endTransform || endTransform,
    cameraViewSaved:
      Boolean(step?.cameraView) || step?.cameraViewSaved === true,
    visualState:
      step?.visualState && typeof step.visualState === "object"
        ? step.visualState
        : null,
    cameraView:
      step?.cameraView && typeof step.cameraView === "object"
        ? step.cameraView
        : null,
    interaction: assemblyStep
      ? {
          ...DEFAULT_ASSEMBLY_INTERACTION,
          ...(step?.interaction || {}),
          type: "drag",
          dragSpace: "local",
          snapDistance: THREE.MathUtils.clamp(
            Number(step?.interaction?.snapDistance) ||
              DEFAULT_ASSEMBLY_INTERACTION.snapDistance,
            0.001,
            1,
          ),
          rotationTolerance: THREE.MathUtils.clamp(
            Number(step?.interaction?.rotationTolerance) ||
              DEFAULT_ASSEMBLY_INTERACTION.rotationTolerance,
            0,
            180,
          ),
          matchRotation: step?.interaction?.matchRotation === true,
          autoSnap: step?.interaction?.autoSnap !== false,
          snapBackOnFail: step?.interaction?.snapBackOnFail !== false,
          showGhost: step?.interaction?.showGhost !== false,
        }
      : { type: "click", ...(step?.interaction || {}) },
    action: {
      ...fallbackStep.action,
      ...(step?.action || {}),
      duration: clampDuration(step?.action?.duration),
      animatedObjectMode:
        step?.action?.animatedObjectMode ===
        PROCEDURAL_ANIMATION_MODES.SEQUENTIAL
          ? PROCEDURAL_ANIMATION_MODES.SEQUENTIAL
          : PROCEDURAL_ANIMATION_MODES.TOGETHER,
      spinAxis: ["x", "y", "z"].includes(step?.action?.spinAxis)
        ? step.action.spinAxis
        : "z",
      spinTurns: Number.isFinite(Number(step?.action?.spinTurns))
        ? Number(step.action.spinTurns)
        : 0,
    },
  };
}

export function normalizeProceduralDefinition(procedure, index = 0) {
  const requestedType = normalizeProcedureType(procedure?.type);
  const fallback = createProceduralDefinition(index + 1, requestedType);
  const lazyMetadata = getLazyMaterialRecordMeta(procedure);
  const storedName = String(procedure?.name || `Procedure ${index + 1}`);
  const normalizedName =
    requestedType === PROCEDURE_TYPES.ASSEMBLY
      ? storedName.replace(/^Disassembly\b/i, "Assembly")
      : storedName;

  const normalized = {
    ...fallback,
    ...(procedure || {}),
    id: procedure?.id || fallback.id,
    name: normalizedName,
    type: requestedType,
    description: String(procedure?.description || ""),
    enabled: procedure?.enabled !== false,
    settings: {
      ...fallback.settings,
      ...(procedure?.settings || {}),
      reverseSteps: procedure?.settings?.reverseSteps === true,
      completionAnimation: normalizeProcedureCompletionAnimation(
        procedure?.settings?.completionAnimation,
      ),
    },
    steps: (Array.isArray(procedure?.steps) ? procedure.steps : []).map(
      (step, stepIndex) =>
        normalizeProceduralStep(step, stepIndex, requestedType),
    ),
  };
  const materialized =
    normalized.settings.reverseSteps && !lazyMetadata
      ? materializeReversedProceduralDefinitionWithHelpers(normalized, {
          normalizeAnimatedObjects: normalizeProceduralAnimatedObjects,
          isAssemblyProcedure,
          normalizeStep: normalizeProceduralStep,
        })
      : normalized;

  return lazyMetadata
    ? markLazyMaterialRecord(materialized, lazyMetadata)
    : materialized;
}


function getProceduralDefinitionTransformHelpers() {
  return {
    normalizeDefinition: normalizeProceduralDefinition,
    normalizeStep: normalizeProceduralStep,
    normalizeAnimatedObjects: normalizeProceduralAnimatedObjects,
    isAssemblyProcedure,
    normalizeProcedureType,
  };
}

export function duplicateProceduralDefinition(procedure, options = {}) {
  return duplicateProceduralDefinitionWithHelpers(
    procedure,
    options,
    getProceduralDefinitionTransformHelpers(),
  );
}

export function createProceduralPlaybackStep(
  step,
  procedureType = PROCEDURE_TYPES.GUIDED,
  options = {},
) {
  return createProceduralPlaybackStepWithHelpers(
    step,
    procedureType,
    options,
    getProceduralDefinitionTransformHelpers(),
  );
}

export function createProceduralPlaybackDefinition(procedure) {
  return createProceduralPlaybackDefinitionWithHelpers(
    procedure,
    getProceduralDefinitionTransformHelpers(),
  );
}

export function normalizeProceduralDefinitions(procedures) {
  return (Array.isArray(procedures) ? procedures : []).map(
    normalizeProceduralDefinition,
  );
}

export function getProcedureReferenceLength(scene, fallback = 1) {
  if (!scene) return fallback;

  const box = new THREE.Box3().setFromObject(scene);
  if (box.isEmpty()) return fallback;

  const length = box.getSize(new THREE.Vector3()).length();
  return Number.isFinite(length) && length > 0 ? length : fallback;
}

export function validateAssemblyPlacement({
  scene,
  object,
  step,
  referenceLength = null,
} = {}) {
  const logicalObject = resolveLogicalObject(object);
  const target = normalizeStoredObjectTransform(step?.endTransform);

  if (!logicalObject || !target) {
    return {
      valid: false,
      positionValid: false,
      rotationValid: false,
      distance: Infinity,
      rotationError: Infinity,
      snapThreshold: 0,
    };
  }

  const interaction = {
    ...DEFAULT_ASSEMBLY_INTERACTION,
    ...(step?.interaction || {}),
  };
  const modelReferenceLength =
    Number(referenceLength) > 0
      ? Number(referenceLength)
      : getProcedureReferenceLength(scene, 1);
  const snapThreshold = Math.max(
    modelReferenceLength *
      THREE.MathUtils.clamp(Number(interaction.snapDistance) || 0.05, 0.001, 1),
    1e-6,
  );

  const currentPosition = logicalObject.position;
  const targetPosition = new THREE.Vector3().fromArray(target.position);
  const distance = currentPosition.distanceTo(targetPosition);

  const currentQuaternion = logicalObject.quaternion.clone();
  const targetQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...target.rotation),
  );
  const rotationError = THREE.MathUtils.radToDeg(
    currentQuaternion.angleTo(targetQuaternion),
  );
  const rotationTolerance = THREE.MathUtils.clamp(
    Number(interaction.rotationTolerance) || 15,
    0,
    180,
  );
  const positionValid = distance <= snapThreshold;
  const rotationValid =
    interaction.matchRotation !== true || rotationError <= rotationTolerance;

  return {
    valid: positionValid && rotationValid,
    positionValid,
    rotationValid,
    distance,
    rotationError,
    snapThreshold,
    rotationTolerance,
  };
}

const getEasing = (name) => {
  if (name === "linear") return (value) => value;
  if (name === "easeInOut") {
    return (value) =>
      value < 0.5
        ? 4 * value * value * value
        : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  return (value) => 1 - Math.pow(1 - value, 3);
};

export function createProceduralEngine() {
  const activeAnimations = new Map();

  const cancelObjectAnimation = (object) => {
    const logicalObject = resolveLogicalObject(object);
    const active = logicalObject ? activeAnimations.get(logicalObject.uuid) : null;

    if (!active) return false;
    active.cancelled = true;
    activeAnimations.delete(logicalObject.uuid);
    return true;
  };

  const animateStep = ({ object, step, from, to, onUpdate } = {}) => {
    const logicalObject = resolveLogicalObject(object);
    const start = normalizeStoredObjectTransform(
      from || step?.startTransform || createStoredObjectTransform(logicalObject),
    );
    const end = normalizeStoredObjectTransform(step?.endTransform || to, start);

    if (!logicalObject || !start || !end) {
      return Promise.resolve(false);
    }

    cancelObjectAnimation(logicalObject);
    applyStoredObjectTransform(logicalObject, start);

    const animationState = { cancelled: false };
    activeAnimations.set(logicalObject.uuid, animationState);

    const duration = clampDuration(step?.action?.duration);
    const easing = getEasing(step?.action?.easing);
    const spinAxis = ["x", "y", "z"].includes(step?.action?.spinAxis)
      ? step.action.spinAxis
      : "z";
    const spinAxisIndex = { x: 0, y: 1, z: 2 }[spinAxis];
    const spinTurns = Number(step?.action?.spinTurns) || 0;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const tick = (now) => {
        if (animationState.cancelled) {
          resolve(false);
          return;
        }

        const rawProgress = Math.min((now - startTime) / duration, 1);
        const progress = easing(rawProgress);

        logicalObject.position.set(
          THREE.MathUtils.lerp(start.position[0], end.position[0], progress),
          THREE.MathUtils.lerp(start.position[1], end.position[1], progress),
          THREE.MathUtils.lerp(start.position[2], end.position[2], progress),
        );

        const rotation = [0, 1, 2].map((axisIndex) => {
          const extraRotation =
            axisIndex === spinAxisIndex
              ? spinTurns * Math.PI * 2 * progress
              : 0;

          return (
            THREE.MathUtils.lerp(
              start.rotation[axisIndex],
              end.rotation[axisIndex],
              progress,
            ) + extraRotation
          );
        });
        logicalObject.rotation.set(...rotation);

        logicalObject.scale.set(
          THREE.MathUtils.lerp(start.scale[0], end.scale[0], progress),
          THREE.MathUtils.lerp(start.scale[1], end.scale[1], progress),
          THREE.MathUtils.lerp(start.scale[2], end.scale[2], progress),
        );
        logicalObject.updateMatrix?.();
        logicalObject.updateMatrixWorld?.(true);
        onUpdate?.(rawProgress, logicalObject);

        if (rawProgress >= 1) {
          // Preserve the captured final orientation. Spin turns are an animation
          // flourish and should not permanently offset the saved end transform.
          applyStoredObjectTransform(logicalObject, end);
          activeAnimations.delete(logicalObject.uuid);
          resolve(true);
          return;
        }

        requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  };

  const findClickTargets = (scene, step) =>
    normalizeProceduralClickTargets(
      step,
      isAssemblyProcedure(step?.procedureType),
    )
      .map((reference) => findProceduralObject(scene, reference))
      .filter(Boolean);

  const findAnimatedObjects = (scene, step) =>
    normalizeProceduralAnimatedObjects(step, isAssemblyProcedure(step?.procedureType))
      .map((entry) => ({
        ...entry,
        object3D: findProceduralObject(scene, entry.object),
      }))
      .filter((entry) => entry.object3D);

  const animateStepObjects = ({ scene, step, onUpdate } = {}) => {
    const entries = findAnimatedObjects(scene, step);
    if (entries.length === 0) return Promise.resolve(false);

    const animateEntry = async (entry) => {
      entry.object3D.visible = entry.startVisible !== false;
      entry.object3D.updateMatrixWorld?.(true);

      const completed = await animateStep({
        object: entry.object3D,
        step: {
          ...step,
          startTransform: entry.startTransform,
          endTransform: entry.endTransform,
        },
        onUpdate,
      });

      if (completed && entry.hideAfterAnimation === true) {
        entry.object3D.visible = false;
        entry.object3D.updateMatrixWorld?.(true);
      }

      return completed;
    };

    if (
      step?.action?.animatedObjectMode ===
      PROCEDURAL_ANIMATION_MODES.SEQUENTIAL
    ) {
      return entries
        .reduce(
          (promise, entry) =>
            promise.then(async (completed) =>
              completed ? animateEntry(entry) : false,
            ),
          Promise.resolve(true),
        )
        .then(Boolean);
    }

    return Promise.all(entries.map(animateEntry)).then(
      (results) => results.length > 0 && results.every(Boolean),
    );
  };

  return {
    createDefinition: createProceduralDefinition,
    duplicateDefinition: duplicateProceduralDefinition,
    createPlaybackDefinition: createProceduralPlaybackDefinition,
    createPlaybackStep: createProceduralPlaybackStep,
    createStep: createProceduralStep,
    isAssemblyProcedure,
    getReferenceLength: getProcedureReferenceLength,
    validateAssemblyPlacement,
    normalizeDefinitions: normalizeProceduralDefinitions,
    createObjectReference: createProceduralObjectReference,
    createStoredTransform: createStoredObjectTransform,
    normalizeAnimatedObjects: normalizeProceduralAnimatedObjects,
    normalizeClickTargets: normalizeProceduralClickTargets,
    findClickTargets,
    findAnimatedObjects,
    applyStoredTransform: applyStoredObjectTransform,
    findObject: findProceduralObject,
    collectMeshes: collectProceduralMeshes,
    matchesClickTarget: matchesProceduralClickTarget,
    matchesAnyClickTarget: matchesAnyProceduralClickTarget,
    animateStep,
    animateStepObjects,
    cancelObjectAnimation,
    resetStep(scene, step) {
      let changed = false;
      findAnimatedObjects(scene, step).forEach((entry) => {
        cancelObjectAnimation(entry.object3D);
        entry.object3D.visible = entry.startVisible !== false;
        entry.object3D.updateMatrixWorld?.(true);
        changed =
          applyStoredObjectTransform(entry.object3D, entry.startTransform) ||
          changed;
      });
      return changed;
    },
    resetProcedure(scene, procedure) {
      let changed = false;
      const resetObjectIds = new Set();

      (procedure?.steps || []).forEach((step) => {
        findAnimatedObjects(scene, step).forEach((entry) => {
          if (resetObjectIds.has(entry.object3D.uuid)) return;
          resetObjectIds.add(entry.object3D.uuid);
          cancelObjectAnimation(entry.object3D);
          entry.object3D.visible = entry.startVisible !== false;
          entry.object3D.updateMatrixWorld?.(true);
          changed =
            applyStoredObjectTransform(entry.object3D, entry.startTransform) ||
            changed;
        });
      });
      return changed;
    },
    dispose() {
      activeAnimations.forEach((animation) => {
        animation.cancelled = true;
      });
      activeAnimations.clear();
    },
    getState() {
      return { activeAnimationCount: activeAnimations.size };
    },
  };
}

export default createProceduralEngine;
