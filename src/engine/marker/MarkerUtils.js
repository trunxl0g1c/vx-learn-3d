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

function isRenderableMarkerTarget(object) {
  return Boolean(
    object &&
      (object.isMesh ||
        object.isSkinnedMesh ||
        object.isLine ||
        object.isLineSegments ||
        object.isPoints),
  );
}

function isMaterialEffectivelyVisible(material) {
  const materials = Array.isArray(material) ? material : [material];

  return materials.some((item) => {
    if (!item || item.visible === false) return false;

    const opacity = Number(item.opacity);
    return !item.transparent || !Number.isFinite(opacity) || opacity > 0;
  });
}

function resolveLegacyMarkerSurfaceAttachment(object, attachment) {
  const localPosition = Array.isArray(attachment?.localPosition)
    ? new THREE.Vector3(...toFiniteVector3(attachment.localPosition))
    : null;

  if (!object || isRenderableMarkerTarget(object) || !localPosition) {
    return {
      object,
      localPosition: localPosition?.toArray?.() || null,
    };
  }

  object.updateWorldMatrix?.(true, true);
  const worldPoint = object.localToWorld(localPosition.clone());
  let closestObject = null;
  let closestDistance = Infinity;
  let closestCenterDistance = Infinity;

  object.traverse?.((child) => {
    if (!isRenderableMarkerTarget(child) || child.userData?.__vxInternal) {
      return;
    }

    child.updateWorldMatrix?.(true, false);

    if (child.geometry && !child.geometry.boundingBox) {
      child.geometry.computeBoundingBox?.();
    }

    const localPoint = child.worldToLocal(worldPoint.clone());
    const boundingBox = child.geometry?.boundingBox;
    const distance = boundingBox
      ? boundingBox.distanceToPoint(localPoint)
      : Infinity;
    const centerDistance = boundingBox
      ? boundingBox
          .getCenter(new THREE.Vector3())
          .distanceToSquared(localPoint)
      : Infinity;

    if (
      distance < closestDistance - 1e-9 ||
      (Math.abs(distance - closestDistance) <= 1e-9 &&
        centerDistance < closestCenterDistance)
    ) {
      closestObject = child;
      closestDistance = distance;
      closestCenterDistance = centerDistance;
    }
  });

  const targetObject = closestObject || object;
  const targetLocalPosition = targetObject.worldToLocal(worldPoint.clone());

  return {
    object: targetObject,
    localPosition: targetLocalPosition.toArray(),
  };
}

function toOptionalGltfIndex(value) {
  if (value === null || value === undefined || value === "") return null;

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0
    ? numericValue
    : null;
}

function findObjectByAttachmentMetadata(root, attachment) {
  if (!root || !attachment) return null;

  const nodeIndex = toOptionalGltfIndex(attachment.gltfNodeIndex);
  const meshIndex = toOptionalGltfIndex(attachment.gltfMeshIndex);
  const primitiveIndex = toOptionalGltfIndex(attachment.gltfPrimitiveIndex);
  let match = null;

  root.traverse?.((object) => {
    if (match || !object) return;

    const objectNodeIndex = Number(object.userData?.__vxGltfNodeIndex);
    const objectMeshIndex = Number(object.userData?.__vxGltfMeshIndex);
    const objectPrimitiveIndex = Number(
      object.userData?.__vxGltfPrimitiveIndex,
    );

    const nodeMatches =
      nodeIndex !== null ? objectNodeIndex === nodeIndex : true;
    const meshMatches =
      meshIndex !== null ? objectMeshIndex === meshIndex : true;
    const primitiveMatches =
      primitiveIndex !== null
        ? objectPrimitiveIndex === primitiveIndex
        : true;
    const hasMetadata =
      nodeIndex !== null || meshIndex !== null || primitiveIndex !== null;

    if (hasMetadata && nodeMatches && meshMatches && primitiveMatches) {
      match = object;
    }
  });

  return match;
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

  // Marker attachment intentionally keeps the exact raycast surface object.
  // Generated multi-material primitives still behave as one logical object in
  // Object List/selection, but Pull Apart can move their renderable meshes
  // independently. Attaching to the promoted logical parent would therefore
  // leave the marker behind while the clicked surface moves.
  const targetObject = object;
  const logicalObject = resolveLogicalObject(object) || object;
  const worldPoint = point.clone
    ? point.clone()
    : new THREE.Vector3(...toFiniteVector3(point));

  targetObject.updateWorldMatrix?.(true, false);

  const localPosition = targetObject.worldToLocal(worldPoint);

  return {
    version: 2,
    objectUuid: targetObject.uuid || null,
    objectName: targetObject.name || null,
    objectOriginalName:
      targetObject.userData?.vxOriginalObjectName || targetObject.name || null,
    objectPath: createObjectIndexPath(targetObject, modelScene),
    gltfNodeIndex: Number.isInteger(targetObject.userData?.__vxGltfNodeIndex)
      ? targetObject.userData.__vxGltfNodeIndex
      : null,
    gltfMeshIndex: Number.isInteger(targetObject.userData?.__vxGltfMeshIndex)
      ? targetObject.userData.__vxGltfMeshIndex
      : null,
    gltfPrimitiveIndex: Number.isInteger(
      targetObject.userData?.__vxGltfPrimitiveIndex,
    )
      ? targetObject.userData.__vxGltfPrimitiveIndex
      : null,
    logicalObjectUuid: logicalObject.uuid || null,
    logicalObjectName: logicalObject.name || null,
    logicalObjectPath: createObjectIndexPath(logicalObject, modelScene),
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

export function resolveMarkerAttachment(marker, modelScene, chapter = null) {
  if (!modelScene) {
    return {
      object: null,
      localPosition: getMarkerAttachedLocalPosition(marker),
    };
  }

  const attachment = marker?.attachment || marker?.targetObject || null;
  const attachedObject = attachment
    ? resolveObjectByStoredIndexPath(
        modelScene,
        attachment?.objectPath,
        attachment?.objectOriginalName || attachment?.objectName,
      ) ||
      findObjectByAttachmentMetadata(modelScene, attachment) ||
      (attachment?.objectUuid
        ? modelScene.getObjectByProperty?.("uuid", attachment.objectUuid)
        : null) ||
      findObjectByName(
        modelScene,
        attachment?.objectOriginalName || attachment?.objectName,
      )
    : null;
  const localPosition = getMarkerAttachedLocalPosition(marker);
  const attachmentVersion = Number(attachment?.version);
  const isLegacyAttachment =
    attachment &&
    (!Number.isFinite(attachmentVersion) || attachmentVersion < 2);

  if (attachedObject && isLegacyAttachment) {
    return resolveLegacyMarkerSurfaceAttachment(attachedObject, attachment);
  }

  return {
    object: attachedObject || resolveChapterTargetObject(chapter, modelScene),
    localPosition,
  };
}

export function resolveMarkerTargetObject(marker, modelScene, chapter = null) {
  return resolveMarkerAttachment(marker, modelScene, chapter).object;
}

export function isMarkerPlacementObjectVisible(object, modelScene = null) {
  if (
    !object ||
    object.userData?.__vxInternal ||
    object.userData?.__vxFlowHelper
  ) {
    return false;
  }
  if (!isRenderableMarkerTarget(object)) return false;
  if (!isObjectEffectivelyVisible(object, modelScene)) return false;

  return isMaterialEffectivelyVisible(object.material);
}

export function findVisibleMarkerPlacementHit(
  intersections,
  modelScene,
  ray = null,
) {
  const source = Array.isArray(intersections) ? intersections : [];
  const visibleHit = source.find((hit) =>
    isMarkerPlacementObjectVisible(hit?.object, modelScene),
  );

  if (visibleHit || !modelScene || !ray) return visibleHit || null;

  // R3F normally provides every ray intersection. This fallback handles cases
  // where an invisible front object was the only propagated event hit by
  // raycasting again against visible renderable objects only.
  const candidates = [];

  modelScene.traverse?.((object) => {
    if (isMarkerPlacementObjectVisible(object, modelScene)) {
      candidates.push(object);
    }
  });

  if (candidates.length === 0) return null;

  modelScene.updateWorldMatrix?.(true, true);

  const raycaster = new THREE.Raycaster();
  raycaster.ray.copy(ray);

  return (
    raycaster
      .intersectObjects(candidates, false)
      .find((hit) =>
        isMarkerPlacementObjectVisible(hit?.object, modelScene),
      ) || null
  );
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
