import { createStoredCameraView } from "../camera";
import { createObjectIndexPath } from "../model";

function normalizeObjectList(objects = []) {
  return Array.from(
    new Set((Array.isArray(objects) ? objects : [objects]).filter(Boolean)),
  );
}

function createReferenceKey(reference) {
  if (!reference) return "";
  if (Array.isArray(reference.path)) return `path:${reference.path.join(".")}`;
  if (reference.uuid) return `uuid:${reference.uuid}`;
  return `name:${reference.name || ""}`;
}

export function createViewerObjectReference(object, root = null) {
  if (!object) return null;

  return {
    uuid: object.uuid || null,
    name: object.name || object.userData?.name || null,
    path: root ? createObjectIndexPath(object, root) : null,
  };
}

export function createUniqueViewerObjectReferences(objects = [], root = null) {
  const seen = new Set();

  return normalizeObjectList(objects)
    .map((object) => createViewerObjectReference(object, root))
    .filter((reference) => {
      const key = createReferenceKey(reference);

      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function createViewerCutPercentages(values = {}, ranges = {}) {
  return ["x", "y", "z"].reduce((result, axis) => {
    const min = Number(ranges?.[axis]?.min);
    const max = Number(ranges?.[axis]?.max);
    const value = Number(values?.[axis]);
    const span = max - min;

    result[axis] =
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      Number.isFinite(value) &&
      Math.abs(span) > 0.000001
        ? Math.max(0, Math.min(100, ((max - value) / span) * 100))
        : 0;

    return result;
  }, {});
}

export function collectHiddenViewerObjectReferences(scene) {
  if (!scene) return [];

  const hiddenObjects = [];

  scene.traverse((object) => {
    if (
      object === scene ||
      object.visible !== false ||
      object.userData?.__vxInternal === true
    ) {
      return;
    }

    const reference = createViewerObjectReference(object, scene);

    if (reference?.uuid || reference?.name) {
      hiddenObjects.push(reference);
    }
  });

  return hiddenObjects;
}

export function createViewerVisualState({
  scene,
  primaryObject = null,
  selectedObject = null,
  selectedObjects = [],
  xrayTargetObject = null,
  xrayTargetObjects = [],
  xrayNormalObjects = [],
  selectionVisualMode = "none",
  blinkSelectedObjectsEnabled = false,
  blinkTargetObjects = [],
  blinkAssignments = [],
  pullApartState = null,
  cutStates = [],
  cutEnabled = false,
  cutValues = {},
  cutRanges = {},
  savedAt = new Date().toISOString(),
} = {}) {
  if (!scene) return null;

  const storedSelectedObject = primaryObject || selectedObject || null;
  const normalizedSelectedObjects = normalizeObjectList([
    ...(Array.isArray(selectedObjects) ? selectedObjects : []),
    selectedObject,
  ]);
  const normalizedXrayTargets = normalizeObjectList([
    ...(Array.isArray(xrayTargetObjects) ? xrayTargetObjects : []),
    xrayTargetObject,
  ]);
  const normalizedXrayNormalObjects = normalizeObjectList(xrayNormalObjects);
  const normalizedBlinkTargets = normalizeObjectList(
    Array.isArray(blinkTargetObjects) && blinkTargetObjects.length > 0
      ? blinkTargetObjects
      : blinkSelectedObjectsEnabled
        ? normalizedSelectedObjects
        : [],
  );

  const selectedReference = createViewerObjectReference(
    storedSelectedObject,
    scene,
  );
  const selectedReferences = createUniqueViewerObjectReferences(
    normalizedSelectedObjects,
    scene,
  );
  const highlightActiveObject =
    selectedObject && normalizedSelectedObjects.includes(selectedObject)
      ? selectedObject
      : normalizedSelectedObjects.at(-1) || null;
  const highlightActiveReference = createViewerObjectReference(
    highlightActiveObject,
    scene,
  );
  const blinkActiveObject =
    selectedObject && normalizedBlinkTargets.includes(selectedObject)
      ? selectedObject
      : normalizedBlinkTargets.at(-1) || null;
  const blinkActiveReference = createViewerObjectReference(
    blinkActiveObject,
    scene,
  );
  const blinkReferences = createUniqueViewerObjectReferences(
    normalizedBlinkTargets,
    scene,
  );
  const storedBlinkAssignments = (Array.isArray(blinkAssignments)
    ? blinkAssignments
    : []
  )
    .map((assignment) => ({
      presetId: String(assignment?.presetId || "blink-preset-1"),
      objects: createUniqueViewerObjectReferences(assignment?.objects || [], scene),
    }))
    .filter((assignment) => assignment.objects.length > 0);
  const xrayMode =
    selectionVisualMode === "non-targets"
      ? "non-targets"
      : normalizedXrayTargets.length > 0
        ? "targets"
        : "none";
  const xrayStateObjects =
    xrayMode === "non-targets"
      ? normalizedXrayNormalObjects.length > 0
        ? normalizedXrayNormalObjects
        : normalizedSelectedObjects
      : normalizedXrayTargets;
  const xrayActiveObject =
    selectedObject ||
    xrayTargetObject ||
    xrayStateObjects.at(-1) ||
    storedSelectedObject ||
    null;
  const xrayActiveReference = createViewerObjectReference(
    xrayActiveObject,
    scene,
  );
  const xrayStateReferences = createUniqueViewerObjectReferences(
    xrayStateObjects,
    scene,
  );
  const pullApartReference = createViewerObjectReference(
    pullApartState?.targetObject,
    scene,
  );

  const cuts = (Array.isArray(cutStates) ? cutStates : [])
    .map((cutState) => {
      const targetReference = createViewerObjectReference(
        cutState?.target,
        scene,
      );

      if (!cutState?.enabled || !targetReference) return null;

      return {
        enabled: true,
        targetObject: targetReference,
        values: {
          x: Number(cutState?.values?.x ?? 0),
          y: Number(cutState?.values?.y ?? 0),
          z: Number(cutState?.values?.z ?? 0),
        },
        percentages: createViewerCutPercentages(
          cutState?.values,
          cutState?.bounds,
        ),
      };
    })
    .filter(Boolean);

  const legacyCut = cuts[0] || {
    enabled: Boolean(cutEnabled),
    targetObject: selectedReference,
    values: {
      x: Number(cutValues?.x ?? 0),
      y: Number(cutValues?.y ?? 0),
      z: Number(cutValues?.z ?? 0),
    },
    percentages: createViewerCutPercentages(cutValues, cutRanges),
  };

  return {
    version: 8,
    selectedObject: selectedReference,
    selectedObjects: selectedReferences,
    highlight: {
      enabled: selectedReferences.length > 0,
      activeObject: highlightActiveReference,
      objects: selectedReferences,
    },
    blink: {
      enabled:
        Boolean(blinkSelectedObjectsEnabled) && blinkReferences.length > 0,
      activeObject: blinkActiveReference,
      objects: blinkReferences,
      assignments: storedBlinkAssignments,
    },
    visibility: {
      hiddenObjects: collectHiddenViewerObjectReferences(scene),
    },
    xray: {
      enabled: xrayMode !== "none" && xrayStateReferences.length > 0,
      mode: xrayMode,
      activeObject: xrayActiveReference,
      targetObject: xrayMode === "targets" ? xrayActiveReference : null,
      targetObjects: xrayMode === "targets" ? xrayStateReferences : [],
      normalObjects: xrayMode === "non-targets" ? xrayStateReferences : [],
    },
    pullApart: {
      enabled: Boolean(pullApartState?.enabled),
      targetObject: pullApartReference,
    },
    cuts,
    cut: legacyCut,
    savedAt,
  };
}

export function createViewerCameraView({
  camera,
  controls,
  modelScene = null,
  savedAt = new Date().toISOString(),
} = {}) {
  const cameraView = createStoredCameraView(camera, controls);

  if (!cameraView) return null;

  return {
    ...cameraView,
    modelRotation: modelScene?.rotation?.toArray?.() || [0, 0, 0],
    savedAt,
  };
}
