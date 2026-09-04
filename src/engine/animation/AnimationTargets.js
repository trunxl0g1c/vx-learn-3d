import * as THREE from "three";
import { resolveLogicalObject } from "../../utils/objectTreeUtils";
import {
  findAuthoredAnimationObject,
  normalizeAuthoredAnimationDefinition,
} from "./AuthoredAnimation";

function addTargetName(targetNames, value) {
  const name = String(value || "").trim();
  if (!name || name === ".") return;
  targetNames.add(name);
}

export function getEmbeddedAnimationTargetNames(clip) {
  const targetNames = new Set();

  (Array.isArray(clip?.tracks) ? clip.tracks : []).forEach((track) => {
    const trackName = String(track?.name || "").trim();
    if (!trackName) return;

    try {
      const parsed = THREE.PropertyBinding.parseTrackName(trackName);
      addTargetName(targetNames, parsed?.nodeName);
      if (parsed?.objectName === "bones") {
        addTargetName(targetNames, parsed?.objectIndex);
      }
      return;
    } catch {
      const propertySeparator = trackName.lastIndexOf(".");
      const fallbackName =
        propertySeparator > 0
          ? trackName.slice(0, propertySeparator)
          : trackName;
      addTargetName(targetNames, fallbackName.split("/").pop());
    }
  });

  return Array.from(targetNames);
}

export function createEmbeddedAnimationSummaries(clips = []) {
  const summariesByName = new Map();

  (Array.isArray(clips) ? clips : []).forEach((clip) => {
    const name = clip?.name || "Unnamed Animation";
    const duration = Number(clip?.duration) || 0;
    const targetNames = getEmbeddedAnimationTargetNames(clip);
    const current = summariesByName.get(name);

    if (current) {
      current.duration = Math.max(current.duration, duration);
      current.clipCount += 1;
      current.targetNames = Array.from(
        new Set([...(current.targetNames || []), ...targetNames]),
      );
      return;
    }

    summariesByName.set(name, {
      name,
      duration,
      clipCount: 1,
      targetNames,
    });
  });

  return Array.from(summariesByName.values());
}

function hasRenderableDescendant(object) {
  let found = false;

  object?.traverse?.((child) => {
    if (found || !child) return;
    if (
      (child.isMesh ||
        child.isSkinnedMesh ||
        child.isLine ||
        child.isLineSegments ||
        child.isPoints) &&
      child.geometry &&
      child.userData?.vxIgnoreBounds !== true &&
      child.userData?.isMarker !== true
    ) {
      found = true;
    }
  });

  return found;
}

function resolveRenderableTarget(object, scene) {
  if (object?.isBone && scene) {
    let skinnedMesh = null;

    scene.traverse?.((candidate) => {
      if (skinnedMesh || !candidate?.isSkinnedMesh) return;
      if (candidate.skeleton?.bones?.includes(object)) {
        skinnedMesh = candidate;
      }
    });

    if (skinnedMesh) {
      return resolveLogicalObject(skinnedMesh);
    }
  }

  const logicalObject = resolveLogicalObject(object);
  return hasRenderableDescendant(logicalObject) ? logicalObject : null;
}

function findSceneObjectByTargetName(scene, targetName) {
  if (!scene || !targetName) return null;

  const candidates = Array.from(
    new Set([
      String(targetName),
      String(targetName).split("/").pop(),
    ].filter(Boolean)),
  );

  for (const candidate of candidates) {
    const byUuid = scene.getObjectByProperty?.("uuid", candidate);
    if (byUuid) return byUuid;

    const byName = scene.getObjectByName?.(candidate);
    if (byName) return byName;
  }

  let metadataMatch = null;
  scene.traverse?.((object) => {
    if (metadataMatch || !object) return;
    const names = [
      object.name,
      object.userData?.vxOriginalObjectName,
      object.userData?.__vxGltfNodeName,
      object.userData?.__vxGltfMeshName,
    ].map((value) => String(value || "").trim());

    if (candidates.some((candidate) => names.includes(candidate))) {
      metadataMatch = object;
    }
  });

  if (metadataMatch) return metadataMatch;

  return null;
}

function compactTargetObjects(objects = []) {
  const targets = Array.from(new Set(objects.filter(Boolean)));

  return targets.filter(
    (target) =>
      !targets.some((candidate) => {
        if (!candidate || candidate === target) return false;
        let current = target.parent;
        while (current) {
          if (current === candidate) return true;
          current = current.parent;
        }
        return false;
      }),
  );
}

export function resolveEmbeddedAnimationTargetObjects(scene, animation) {
  const targetNames = Array.isArray(animation?.targetNames)
    ? animation.targetNames
    : [];

  return compactTargetObjects(
    targetNames.map((targetName) =>
      resolveRenderableTarget(
        findSceneObjectByTargetName(scene, targetName),
        scene,
      ),
    ),
  );
}

function getAuthoredTrackReferences(track) {
  const references = [track?.object];

  if (track?.rig?.type === "hydraulic") {
    references.push(
      track.rig?.hydraulic?.baseObject,
      track.rig?.hydraulic?.targetObject,
    );
  }

  if (track?.rig?.type === "morph") {
    references.push(track.rig?.morph?.targetObject);
  }

  return references.filter(Boolean);
}

export function resolveAuthoredAnimationTargetObjects(scene, animation) {
  const definition = normalizeAuthoredAnimationDefinition(animation);

  return compactTargetObjects(
    definition.tracks
      .filter((track) => track.enabled !== false)
      .flatMap(getAuthoredTrackReferences)
      .map((reference) =>
        resolveRenderableTarget(
          findAuthoredAnimationObject(scene, reference),
          scene,
        ),
      ),
  );
}

export function resolveAnimationTargetObjects(scene, entry) {
  if (entry?.source === "authored") {
    return resolveAuthoredAnimationTargetObjects(scene, entry.animation);
  }

  return resolveEmbeddedAnimationTargetObjects(scene, entry?.animation);
}
