import { useCallback } from "react";
import { resolveObjectTreeRoot } from "../utils/objectTreeUtils";
import {
  areObjectPathsEqual,
  createObjectIndexPath,
  upsertObjectNameOverride,
} from "../engine/model";

export function useObjectRename({
  modelScene,
  selectedObject,
  updateMaterialState,
  setSelectedObjectName,
  rebuildObjectList,
}) {
  return useCallback(
    (object, requestedName) => {
      if (!object || !modelScene) return false;
      const nextName = String(requestedName || "").trim();
      if (!nextName) return false;

      const previousName = String(object.name || "").trim();
      const objectPath = createObjectIndexPath(object, modelScene);
      const hierarchyRoot = resolveObjectTreeRoot(modelScene) || modelScene;
      if (objectPath.length === 0 && object !== hierarchyRoot) return false;
      if (previousName === nextName) return true;

      const originalName = String(
        object.userData?.vxOriginalObjectName || previousName,
      ).trim();
      object.userData.vxOriginalObjectName = originalName;
      object.name = nextName;

      updateMaterialState((previous) => ({
        ...previous,
        objectNameOverrides: upsertObjectNameOverride(
          previous?.objectNameOverrides,
          { path: objectPath, name: nextName, originalName },
        ),
        chapters: (previous?.chapters || []).map((chapter) => {
          const samePath = areObjectPathsEqual(chapter?.objectPath, objectPath);
          const sameUuid = chapter?.objectUuid === object.uuid;
          const sameLegacyName =
            !Array.isArray(chapter?.objectPath) &&
            String(chapter?.objectName || "").trim() === previousName;
          return samePath || sameUuid || sameLegacyName
            ? { ...chapter, objectName: nextName }
            : chapter;
        }),
      }));

      if (selectedObject === object) {
        setSelectedObjectName(nextName.replaceAll("_", " "));
      }
      rebuildObjectList(modelScene);
      return true;
    },
    [
      modelScene,
      rebuildObjectList,
      selectedObject,
      setSelectedObjectName,
      updateMaterialState,
    ],
  );
}

export default useObjectRename;
