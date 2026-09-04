import { resolveObjectByStoredIndexPath } from "../../engine/model";

export function findObjectByReference(scene, reference) {
  if (!scene || !reference) return null;

  if (Array.isArray(reference.path)) {
    const pathMatch = resolveObjectByStoredIndexPath(
      scene,
      reference.path,
      reference.name,
    );

    if (pathMatch) return pathMatch;
  }

  if (reference.uuid) {
    const uuidMatch = scene.getObjectByProperty?.("uuid", reference.uuid);

    if (uuidMatch) return uuidMatch;
  }

  const targetName = String(reference.name || "").trim();

  if (!targetName) return null;

  let nameMatch = null;

  scene.traverse((object) => {
    if (nameMatch) return;

    if (String(object?.name || "").trim() === targetName) {
      nameMatch = object;
    }
  });

  return nameMatch;
}

