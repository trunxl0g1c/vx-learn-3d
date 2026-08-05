import { createId } from "../../utils/createId";
import {
  getChapterCameraViews,
  normalizeChapterAnimationAssignments,
  normalizeChapterFlowAssignments,
  syncChapterCameraViews,
} from "../chapter";
import { normalizeFlowDefinitions } from "../flow";
import { normalizeProceduralDefinitions } from "../procedural";
import { normalizePlayerSettings } from "../../modules/material/playerSettings";

const MODEL_BOUND_MATERIAL_FIELDS = Object.freeze([
  "id",
  "projectId",
  "projectName",
  "modelUrl",
  "originalModelUrl",
  "modelFile",
  "modelBlob",
]);

function normalizeImportedChapter(chapter, index, projectId) {
  const source = chapter && typeof chapter === "object" ? chapter : {};
  const normalized = {
    ...source,
    id: String(source.id || source.uuid || createId("chapter")),
    projectId,
    title: String(source.title || `Chapter ${index + 1}`),
    parameters: Array.isArray(source.parameters) ? source.parameters : [],
    markers: Array.isArray(source.markers) ? source.markers : [],
    media: Array.isArray(source.media) ? source.media : [],
    animations: normalizeChapterAnimationAssignments(source.animations),
    flows: normalizeChapterFlowAssignments(source.flows),
  };

  const cameraViews = getChapterCameraViews(normalized);

  return cameraViews.length > 0
    ? syncChapterCameraViews(normalized, cameraViews)
    : normalized;
}

function normalizeImportedRecords(records, projectId, prefix) {
  return (Array.isArray(records) ? records : []).map((record, index) => ({
    ...(record && typeof record === "object" ? record : {}),
    id: String(record?.id || record?.uuid || createId(prefix)),
    projectId,
    orderIndex: Number.isFinite(Number(record?.orderIndex))
      ? Number(record.orderIndex)
      : index,
  }));
}

function preserveCurrentModelFields(currentMaterial, nextMaterial) {
  const preserved = { ...nextMaterial };

  MODEL_BOUND_MATERIAL_FIELDS.forEach((field) => {
    if (currentMaterial?.[field] !== undefined) {
      preserved[field] = currentMaterial[field];
    }
  });

  return preserved;
}

export function createImportedMaterialForCurrentProject({
  currentMaterial,
  importedMaterial,
  projectId,
  projectName,
}) {
  const current = currentMaterial && typeof currentMaterial === "object"
    ? currentMaterial
    : {};
  const imported = importedMaterial && typeof importedMaterial === "object"
    ? importedMaterial
    : {};
  const resolvedProjectId = current.projectId || projectId || null;

  const chapters = (Array.isArray(imported.chapters) ? imported.chapters : [])
    .map((chapter, index) =>
      normalizeImportedChapter(chapter, index, resolvedProjectId),
    );
  const flows = normalizeFlowDefinitions(
    normalizeImportedRecords(imported.flows, resolvedProjectId, "flow"),
  );
  const procedures = normalizeProceduralDefinitions(
    normalizeImportedRecords(
      imported.procedures,
      resolvedProjectId,
      "procedure",
    ),
  );

  const nextMaterial = preserveCurrentModelFields(current, {
    ...current,
    ...imported,
    projectId: resolvedProjectId,
    projectName: current.projectName || projectName || imported.projectName || "",
    chapters,
    flows,
    procedures,
    objectNameOverrides: Array.isArray(imported.objectNameOverrides)
      ? imported.objectNameOverrides
      : [],
    playerSettings: normalizePlayerSettings(imported.playerSettings),
  });

  // A data-only package must never replace the GLB currently attached to the
  // destination project, even when older packages contain model-like fields.
  nextMaterial.modelUrl = current.modelUrl || "";

  return nextMaterial;
}

function normalizeFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeAxis(value) {
  return value === "y" || value === "z" ? value : "x";
}

function normalizeCutVector(value, fallback = 0) {
  const source = value && typeof value === "object" ? value : {};

  return {
    x: normalizeFiniteNumber(source.x, fallback),
    y: normalizeFiniteNumber(source.y, fallback),
    z: normalizeFiniteNumber(source.z, fallback),
  };
}

function normalizeRange(range, fallbackMin = -3, fallbackMax = 3) {
  const min = normalizeFiniteNumber(range?.min, fallbackMin);
  const max = normalizeFiniteNumber(range?.max, fallbackMax);

  return min <= max ? { min, max } : { min: max, max: min };
}

export function normalizeImportedScene(importedScene, fallbackScene = {}) {
  const source = importedScene && typeof importedScene === "object"
    ? importedScene
    : {};
  const fallback = fallbackScene && typeof fallbackScene === "object"
    ? fallbackScene
    : {};
  const sourceCut = source.cut && typeof source.cut === "object"
    ? source.cut
    : fallback.cut || {};

  return {
    ...fallback,
    ...source,
    markers: Array.isArray(source.markers) ? source.markers : [],
    cut: {
      ...(fallback.cut || {}),
      ...sourceCut,
      enabled: sourceCut.enabled === true,
      axis: normalizeAxis(sourceCut.axis),
      value: normalizeFiniteNumber(sourceCut.value, 0),
      values: normalizeCutVector(sourceCut.values, 0),
      ranges: {
        x: normalizeRange(sourceCut.ranges?.x),
        y: normalizeRange(sourceCut.ranges?.y),
        z: normalizeRange(sourceCut.ranges?.z),
      },
    },
  };
}

export function createViqubedDataImportSummary({ material, sourceModel }) {
  const modelName = String(sourceModel?.name || "").trim();
  const sourceLabel = modelName ? ` Source model: ${modelName}.` : "";

  return [
    `${material?.chapters?.length || 0} chapter`,
    `${material?.flows?.length || 0} flow`,
    `${material?.procedures?.length || 0} procedure`,
  ].join(", ") + ` imported. The current GLB was kept.${sourceLabel}`;
}
