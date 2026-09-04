import { syncSketchEdgeVisibility } from "./ModelSceneUtils";

export function showObjectsInScene(scene, objectOrObjects) {
  if (!scene) return false;

  const targets = Array.from(
    new Set(
      (Array.isArray(objectOrObjects) ? objectOrObjects : [objectOrObjects])
        .filter(Boolean),
    ),
  );
  if (targets.length === 0) return false;

  targets.forEach((targetObject) => {
    let ancestor = targetObject;
    while (ancestor) {
      ancestor.visible = true;
      if (ancestor === scene) break;
      ancestor = ancestor.parent;
    }

    targetObject.traverse?.((child) => {
      child.visible = true;
    });
  });

  syncSketchEdgeVisibility(scene);
  scene.updateMatrixWorld?.(true);
  return true;
}
