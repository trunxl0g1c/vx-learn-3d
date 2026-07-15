import { resolveObjectTreeRoot } from "../../utils/objectTreeUtils"

function normalizePath(path) {
  return Array.isArray(path)
    ? path.map((value) => Number(value)).filter(Number.isInteger)
    : [];
}

function getObjectOriginalName(object) {
  return String(
    object?.userData?.vxOriginalObjectName || object?.name || "",
  ).trim();
}

function getUniqueObjects(objects = []) {
  return objects.filter(
    (object, index) => object && objects.indexOf(object) === index,
  );
}

export function createObjectIndexPath(object, root) {
  if (!object || !root) return [];

  const hierarchyRoot = resolveObjectTreeRoot(root) || root;
  const path = [];
  let current = object;

  while (current && current !== hierarchyRoot) {
    const parent = current.parent;

    if (!parent) return [];

    const index = parent.children.indexOf(current);

    if (index < 0) return [];

    path.unshift(index);
    current = parent;
  }

  return current === hierarchyRoot ? path : [];
}

export function resolveObjectByIndexPath(root, path) {
  if (!root) return null;

  const normalizedPath = normalizePath(path);
  let current = root;

  for (const index of normalizedPath) {
    current = current?.children?.[index] || null;

    if (!current) return null;
  }

  return current;
}

export function resolveObjectByStoredIndexPath(root, path, originalName = "") {
  if (!root) return null;

  const normalizedPath = normalizePath(path);
  const hierarchyRoot = resolveObjectTreeRoot(root) || root;
  const candidates = getUniqueObjects([
    resolveObjectByIndexPath(hierarchyRoot, normalizedPath),
    resolveObjectByIndexPath(root, normalizedPath),
    normalizedPath[0] === 0
      ? resolveObjectByIndexPath(hierarchyRoot, normalizedPath.slice(1))
      : null,
  ]);

  const normalizedOriginalName = String(originalName || "").trim();

  if (normalizedOriginalName) {
    const exactCandidate = candidates.find((object) => {
      const currentName = String(object?.name || "").trim();

      return (
        currentName === normalizedOriginalName ||
        getObjectOriginalName(object) === normalizedOriginalName
      );
    });

    if (exactCandidate) return exactCandidate;
  }

  return candidates[0] || null;
}

export function areObjectPathsEqual(firstPath, secondPath) {
  const first = normalizePath(firstPath);
  const second = normalizePath(secondPath);

  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

export function applyObjectNameOverrides(scene, overrides = []) {
  if (!scene || !Array.isArray(overrides) || overrides.length === 0) {
    return false;
  }

  let changed = false;

  overrides.forEach((override) => {
    const nextName = String(override?.name || "").trim();

    if (!nextName) return;

    const object = resolveObjectByStoredIndexPath(
      scene,
      override?.path,
      override?.originalName,
    );

    if (!object) return;

    if (!object.userData.vxOriginalObjectName) {
      object.userData.vxOriginalObjectName =
        String(override?.originalName || object.name || "").trim();
    }

    if (object.name !== nextName) {
      object.name = nextName;
      changed = true;
    }
  });

  return changed;
}

export function upsertObjectNameOverride(overrides = [], nextOverride) {
  const nextPath = normalizePath(nextOverride?.path);
  const nextName = String(nextOverride?.name || "").trim();

  if (!nextName) return Array.isArray(overrides) ? overrides : [];

  const normalizedOverride = {
    path: nextPath,
    name: nextName,
    originalName: String(nextOverride?.originalName || "").trim(),
  };

  const source = Array.isArray(overrides) ? overrides : [];
  const existingIndex = source.findIndex((item) =>
    areObjectPathsEqual(item?.path, nextPath),
  );

  if (existingIndex < 0) {
    return [...source, normalizedOverride];
  }

  return source.map((item, index) =>
    index === existingIndex
      ? {
          ...item,
          ...normalizedOverride,
          originalName:
            String(item?.originalName || "").trim() ||
            normalizedOverride.originalName,
        }
      : item,
  );
}
