import * as THREE from "three";

import {
  createObjectIndexPath,
  resolveObjectByStoredIndexPath,
} from "../model/ObjectNameOverrides";
import { resolveLogicalObject } from "../../utils/objectTreeUtils";

export const DEFAULT_MARKER_LABEL_OFFSET = [-92, -58];

const renderableMeshCache = new WeakMap();

function toFiniteVector3(value, fallback = [0, 0, 0]) {
  const source = Array.isArray(value)
    ? value
    : [value?.x, value?.y, value?.z];

  return fallback.map((fallbackValue, index) => {
    const nextValue = Number(source?.[index]);
    return Number.isFinite(nextValue) ? nextValue : fallbackValue;
  });
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function findObjectByName(root, requestedName) {
  if (!root || !requestedName) return null;

  const normalizedName = normalizeName(requestedName);
  let exactMatch = null;

  root.traverse?.((object) => {
    if (exactMatch) return;

    if (normalizeName(object?.name) === normalizedName) {
      exactMatch = object;
    }
  });

  return exactMatch;
}

export function normalizeMarkerLabelOffset(marker) {
  const value = marker?.labelOffset;

  if (!Array.isArray(value) || value.length < 2) {
    return [...DEFAULT_MARKER_LABEL_OFFSET];
  }

  return [
    Number.isFinite(Number(value[0]))
      ? Number(value[0])
      : DEFAULT_MARKER_LABEL_OFFSET[0],
    Number.isFinite(Number(value[1]))
      ? Number(value[1])
      : DEFAULT_MARKER_LABEL_OFFSET[1],
  ];
}

export function createMarkerConnector(offset) {
  const [x, y] = normalizeMarkerLabelOffset({ labelOffset: offset });

  return {
    length: Math.hypot(x, y),
    angle: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

export function createMarkerAttachment({ object, point, modelScene }) {
  if (!object || !point || !modelScene) return null;

  const targetObject = resolveLogicalObject(object) || object;
  const worldPoint = point.clone
    ? point.clone()
    : new THREE.Vector3(...toFiniteVector3(point));

  targetObject.updateWorldMatrix?.(true, false);

  const localPosition = targetObject.worldToLocal(worldPoint);

  return {
    objectUuid: targetObject.uuid || null,
    objectName: targetObject.name || null,
    objectPath: createObjectIndexPath(targetObject, modelScene),
    localPosition: localPosition.toArray(),
  };
}

export function resolveChapterTargetObject(chapter, modelScene) {
  if (!chapter || !modelScene) return null;

  return (
    resolveObjectByStoredIndexPath(
      modelScene,
      chapter?.objectPath,
      chapter?.objectName,
    ) ||
    (chapter?.objectUuid
      ? modelScene.getObjectByProperty?.("uuid", chapter.objectUuid)
      : null) ||
    findObjectByName(modelScene, chapter?.objectName)
  );
}

export function resolveMarkerTargetObject(marker, modelScene, chapter = null) {
  if (!modelScene) return null;

  const attachment = marker?.attachment || marker?.targetObject || null;

  const attachedObject = attachment
    ? resolveObjectByStoredIndexPath(
        modelScene,
        attachment?.objectPath,
        attachment?.objectName,
      ) ||
      (attachment?.objectUuid
        ? modelScene.getObjectByProperty?.("uuid", attachment.objectUuid)
        : null) ||
      findObjectByName(modelScene, attachment?.objectName)
    : null;

  return attachedObject || resolveChapterTargetObject(chapter, modelScene);
}

function isVisibleThroughAncestors(object, root = null) {
  let current = object;

  while (current) {
    if (current.visible === false) return false;
    if (root && current === root) break;
    current = current.parent;
  }

  return true;
}

function getRenderableMeshes(object) {
  if (!object) return [];
  if (object.isMesh) return [object];

  const cached = renderableMeshCache.get(object);
  if (cached) return cached;

  const meshes = [];

  object.traverse?.((child) => {
    if (child?.isMesh) meshes.push(child);
  });

  renderableMeshCache.set(object, meshes);
  return meshes;
}

export function isObjectEffectivelyVisible(object, modelScene = null) {
  if (!object) return false;
  if (!isVisibleThroughAncestors(object, modelScene)) return false;

  const meshes = getRenderableMeshes(object);

  if (meshes.length === 0) return true;

  return meshes.some((mesh) =>
    isVisibleThroughAncestors(mesh, modelScene || object),
  );
}

export function isChapterTargetVisible(chapter, modelScene) {
  if (!chapter || !modelScene) return true;

  const hasObjectReference = Boolean(
    chapter?.objectUuid ||
      chapter?.objectName ||
      (Array.isArray(chapter?.objectPath) && chapter.objectPath.length > 0),
  );

  if (!hasObjectReference) return true;

  const targetObject = resolveChapterTargetObject(chapter, modelScene);

  // Keep unresolved legacy chapters available rather than silently removing
  // their content from the list. Only a resolved hidden object is filtered.
  return targetObject
    ? isObjectEffectivelyVisible(targetObject, modelScene)
    : true;
}

export function getVisibleChapters(chapters, modelScene) {
  const source = Array.isArray(chapters) ? chapters : [];

  return source.filter((chapter) =>
    isChapterTargetVisible(chapter, modelScene),
  );
}

export function getMarkerLegacyPosition(marker) {
  return toFiniteVector3(marker?.position);
}

export function getMarkerAttachedLocalPosition(marker) {
  const value = marker?.attachment?.localPosition;

  return Array.isArray(value) && value.length >= 3
    ? toFiniteVector3(value)
    : null;
}
