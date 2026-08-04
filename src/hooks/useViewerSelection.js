import { useEffect, useMemo, useRef, useState } from "react";
import { createSelectionEngine } from "../engine/selection";
import { createViqubedXrayMaterial } from "../engine/model";

function getObjectDisplayName(object, fallback = "") {
  return String(object?.name || fallback || "Unnamed Object").replaceAll(
    "_",
    " ",
  );
}

export function useViewerSelection({
  vxEngine,
  modelScene,
  objectList,
  selectedObject,
  setOutlineObjects,
  setSelectedObject,
  setSelectedObjectName,
  setOrbitEnabled,
  focusTargetRef,
  focusObject,
  setIsAutoRotating,
  setRightTab,
  activeChapterId,
  restoreShaderMode,
}) {
  const [xrayTargetObject, setXrayTargetObject] = useState(null);
  const [xrayTargetObjects, setXrayTargetObjects] = useState([]);
  const [multipleSelectEnabled, setMultipleSelectEnabled] = useState(false);
  const [blinkSelectedObjectsEnabled, setBlinkSelectedObjectsEnabled] =
    useState(false);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const selectedObjectsRef = useRef([]);
  const xrayMaterialDisposeVersionRef = useRef(0);

  const xrayMaterialRef = useRef(null);

  if (!xrayMaterialRef.current) {
    xrayMaterialRef.current = createViqubedXrayMaterial();
  }

  const selectionEngine = useMemo(
    () => vxEngine?.selection || createSelectionEngine(),
    [vxEngine],
  );

  const commitSelectedObjects = (nextObjects = []) => {
    const normalizedObjects = Array.from(
      new Set((Array.isArray(nextObjects) ? nextObjects : [nextObjects]).filter(Boolean)),
    );

    selectedObjectsRef.current = normalizedObjects;
    setSelectedObjects(normalizedObjects);
    return normalizedObjects;
  };

  useEffect(() => {
    selectionEngine.setScene(modelScene);
    selectionEngine.setObjectTree(objectList);
    selectionEngine.setXrayMaterial(xrayMaterialRef.current);
    selectionEngine.setMaterialRestorer(() => restoreShaderMode?.());
  }, [selectionEngine, modelScene, objectList, restoreShaderMode]);

  useEffect(() => {
    commitSelectedObjects([]);
    setMultipleSelectEnabled(false);
    setBlinkSelectedObjectsEnabled(false);
    setXrayTargetObject(null);
    setXrayTargetObjects([]);
  }, [modelScene]);

  useEffect(() => {
    if (multipleSelectEnabled) return;

    // A saved visual state may restore more than one highlighted object even
    // while the Multiple Select authoring tool is not active. Keep that
    // restored set synchronized so saving the state again does not collapse
    // it to only the active (last) object.
    if (
      selectedObject &&
      selectedObjectsRef.current.length > 1 &&
      selectedObjectsRef.current.includes(selectedObject)
    ) {
      return;
    }

    commitSelectedObjects(selectedObject ? [selectedObject] : []);
  }, [multipleSelectEnabled, selectedObject]);

  useEffect(() => {
    if (selectedObjects.length > 0) return;
    setBlinkSelectedObjectsEnabled(false);
  }, [selectedObjects.length]);

  useEffect(() => {
    if (!multipleSelectEnabled || selectedObjects.length === 0) return;

    const activeObject =
      selectedObject && selectedObjects.includes(selectedObject)
        ? selectedObject
        : selectedObjects.at(-1);
    const payload = selectionEngine.highlightObjectsPreservingMaterials(
      selectedObjects,
      activeObject,
    );

    setOutlineObjects(payload?.outlineObjects || []);
  }, [
    multipleSelectEnabled,
    selectedObjects,
    selectedObject,
    selectionEngine,
    setOutlineObjects,
  ]);

  useEffect(() => {
    const disposeVersion = xrayMaterialDisposeVersionRef.current + 1;
    xrayMaterialDisposeVersionRef.current = disposeVersion;

    return () => {
      const material = xrayMaterialRef.current;
      const dispose = () => {
        // React StrictMode performs a development-only cleanup/setup cycle.
        // Dispose only when no newer effect setup has claimed this resource.
        if (xrayMaterialDisposeVersionRef.current !== disposeVersion) return;
        material?.dispose?.();
        if (xrayMaterialRef.current === material) xrayMaterialRef.current = null;
      };

      if (typeof globalThis.queueMicrotask === "function") {
        globalThis.queueMicrotask(dispose);
      } else {
        Promise.resolve().then(dispose);
      }
    };
  }, []);

  const applySelectionPayload = (payload) => {
    if (!payload) return null;

    setSelectedObject(payload.selectedObject || null);
    setOutlineObjects(payload.outlineObjects || []);
    return payload;
  };

  const updateActiveSelection = (
    payload,
    fallbackName = "",
    { openInfo = true } = {},
  ) => {
    applySelectionPayload(payload);

    const activeObject = payload?.selectedObject || null;
    setSelectedObjectName(
      activeObject ? getObjectDisplayName(activeObject, fallbackName) : "",
    );

    if (openInfo && activeObject && !activeChapterId) {
      setRightTab?.("info");
    }

    return payload;
  };

  const clearSelection = ({ closeInfo = true } = {}) => {
    setBlinkSelectedObjectsEnabled(false);
    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    commitSelectedObjects([]);
    applySelectionPayload(selectionEngine.resetXray());
    setSelectedObjectName("");
    setOrbitEnabled(true);
    focusTargetRef.current = null;

    if (closeInfo && !activeChapterId) {
      setRightTab?.(null);
    }
  };

  const clearMultipleSelectionPreservingVisualState = ({
    closeInfo = true,
  } = {}) => {
    setBlinkSelectedObjectsEnabled(false);
    commitSelectedObjects([]);
    applySelectionPayload(
      selectionEngine.clearSelectionPreservingMaterials(),
    );
    setSelectedObjectName("");
    setOrbitEnabled(true);
    focusTargetRef.current = null;

    if (closeInfo && !activeChapterId) {
      setRightTab?.(null);
    }
  };

  const clearSelectionFromViewport = ({ closeInfo = true } = {}) => {
    if (multipleSelectEnabled) {
      clearMultipleSelectionPreservingVisualState({ closeInfo });
      return;
    }

    clearSelection({ closeInfo });
  };

  const highlightObject = (targetObject, options = {}) => {
    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    commitSelectedObjects(targetObject ? [targetObject] : []);

    return updateActiveSelection(
      selectionEngine.highlightObject(targetObject),
      targetObject?.name,
      options,
    );
  };

  // Explicit object X-Ray action: the selected target itself becomes
  // transparent, while the rest of the model remains in its active mode.
  const makeXrayExcept = (targetObject, options = {}) => {
    setXrayTargetObject(targetObject || null);
    setXrayTargetObjects(targetObject ? [targetObject] : []);
    commitSelectedObjects(targetObject ? [targetObject] : []);

    return updateActiveSelection(
      selectionEngine.makeXrayExcept(targetObject),
      targetObject?.name,
      options,
    );
  };

  // Object List isolation action: selected objects stay normal and every
  // non-selected mesh becomes X-Ray. The active target is always the last
  // selected object and remains the object used for content authoring.
  const makeOthersXray = (
    targetObjects,
    activeTargetObject = null,
    options = {},
  ) => {
    const normalizedTargets = Array.from(
      new Set((targetObjects || []).filter(Boolean)),
    );

    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    commitSelectedObjects(normalizedTargets);

    return updateActiveSelection(
      selectionEngine.makeOthersXray(
        normalizedTargets,
        activeTargetObject || normalizedTargets.at(-1) || null,
      ),
      activeTargetObject?.name,
      options,
    );
  };

  const highlightSelectedObjects = (
    targetObjects,
    activeTargetObject = null,
    options = {},
  ) => {
    const normalizedTargets = Array.from(
      new Set((targetObjects || []).filter(Boolean)),
    );

    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    commitSelectedObjects(normalizedTargets);

    return updateActiveSelection(
      selectionEngine.highlightObjects(
        normalizedTargets,
        activeTargetObject || normalizedTargets.at(-1) || null,
      ),
      activeTargetObject?.name,
      options,
    );
  };

  const highlightSelectedObjectsPreservingVisualState = (
    targetObjects,
    activeTargetObject = null,
    options = {},
  ) => {
    const normalizedTargets = Array.from(
      new Set((targetObjects || []).filter(Boolean)),
    );
    const resolvedActiveTarget =
      activeTargetObject || normalizedTargets.at(-1) || null;

    commitSelectedObjects(normalizedTargets);

    return updateActiveSelection(
      selectionEngine.highlightObjectsPreservingMaterials(
        normalizedTargets,
        resolvedActiveTarget,
      ),
      resolvedActiveTarget?.name,
      options,
    );
  };

  const makeTargetObjectsXray = (
    targetObjects,
    activeTargetObject = null,
    options = {},
  ) => {
    const normalizedTargets = Array.from(
      new Set((targetObjects || []).filter(Boolean)),
    );

    if (normalizedTargets.length === 0) return null;

    const resolvedActiveTarget =
      activeTargetObject && normalizedTargets.includes(activeTargetObject)
        ? activeTargetObject
        : selectedObject && normalizedTargets.includes(selectedObject)
          ? selectedObject
          : normalizedTargets.at(-1);

    setXrayTargetObject(resolvedActiveTarget || null);
    setXrayTargetObjects(normalizedTargets);
    commitSelectedObjects(normalizedTargets);

    return updateActiveSelection(
      selectionEngine.makeTargetsXray(
        normalizedTargets,
        resolvedActiveTarget,
      ),
      resolvedActiveTarget?.name,
      options,
    );
  };

  const makeSelectedObjectsXray = () =>
    makeTargetObjectsXray(selectedObjects, selectedObject);

  const resetXray = ({ closeInfo = true } = {}) => {
    clearSelection({ closeInfo });
  };

  const selectObjectFromList = (
    targetObject,
    { shouldFocus = false, forceSelect = false } = {},
  ) => {
    if (!targetObject) return null;

    if (!multipleSelectEnabled) {
      if (selectedObject === targetObject && !forceSelect) {
        clearSelection();
        return null;
      }

      const payload = makeOthersXray([targetObject], targetObject);

      if (shouldFocus) {
        focusObject?.(targetObject);
      }

      return payload;
    }

    const currentSelectedObjects = selectedObjectsRef.current;
    const nextSelectedObjects = currentSelectedObjects.includes(targetObject)
      ? currentSelectedObjects
      : [...currentSelectedObjects, targetObject];
    const activeTargetObject = targetObject;

    const payload = highlightSelectedObjectsPreservingVisualState(
      nextSelectedObjects,
      activeTargetObject,
    );

    if (shouldFocus && activeTargetObject) {
      focusObject?.(activeTargetObject);
    }

    return payload;
  };

  const toggleMultipleSelect = () => {
    const nextEnabled = !multipleSelectEnabled;
    setMultipleSelectEnabled(nextEnabled);

    if (!nextEnabled) {
      setBlinkSelectedObjectsEnabled(false);
    }

    const activeTargetObject =
      selectedObject || selectedObjectsRef.current.at(-1) || null;

    if (nextEnabled) {
      const initialSelection = activeTargetObject ? [activeTargetObject] : [];

      if (initialSelection.length > 0) {
        highlightSelectedObjectsPreservingVisualState(
          initialSelection,
          activeTargetObject,
        );
      } else {
        commitSelectedObjects([]);
      }

      return;
    }

    if (!activeTargetObject) {
      clearSelection();
      return;
    }

    highlightSelectedObjects([activeTargetObject], activeTargetObject);
  };

  const toggleBlinkSelectedObjects = () => {
    if (!multipleSelectEnabled || selectedObjectsRef.current.length === 0) {
      setBlinkSelectedObjectsEnabled(false);
      return false;
    }

    const nextEnabled = !blinkSelectedObjectsEnabled;
    setBlinkSelectedObjectsEnabled(nextEnabled);
    return nextEnabled;
  };

  const applyMeshSelection = (mesh) => {
    const resolvedPayload = selectionEngine.selectFromMesh(
      mesh,
      objectList,
      { preserveMaterialOverride: multipleSelectEnabled },
    );

    if (!resolvedPayload) return null;

    if (multipleSelectEnabled) {
      const targetObject = resolvedPayload.selectedObject;
      const currentSelectedObjects = selectedObjectsRef.current;
      const nextSelectedObjects = currentSelectedObjects.includes(targetObject)
        ? currentSelectedObjects
        : [...currentSelectedObjects, targetObject];

      commitSelectedObjects(nextSelectedObjects);

      return updateActiveSelection(
        selectionEngine.highlightObjectsPreservingMaterials(
          nextSelectedObjects,
          targetObject,
        ),
        targetObject?.name,
      );
    }

    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    commitSelectedObjects([resolvedPayload.selectedObject]);
    setSelectedObjectName(resolvedPayload.selectedObjectName);
    setSelectedObject(resolvedPayload.selectedObject);
    setOutlineObjects(resolvedPayload.outlineObjects);
    setOrbitEnabled(resolvedPayload.orbitEnabled);
    setIsAutoRotating(resolvedPayload.isAutoRotating);
    focusTargetRef.current = resolvedPayload.focusTarget || null;

    if (!activeChapterId) {
      setRightTab?.("info");
    }

    return resolvedPayload;
  };

  const selectObjectFromMesh = (mesh) => {
    applyMeshSelection(mesh);
  };

  const focusObjectFromMesh = (mesh) => {
    const payload = applyMeshSelection(mesh);

    if (payload?.selectedObject) {
      focusObject?.(payload.selectedObject);
    }
  };

  return {
    selectionEngine,
    selectionVisualMode: selectionEngine.getMaterialOverrideMode?.() || "none",
    selectedObjects,
    multipleSelectEnabled,
    blinkSelectedObjectsEnabled,
    setBlinkSelectedObjectsEnabled,
    toggleBlinkSelectedObjects,
    toggleMultipleSelect,
    clearSelection,
    clearSelectionFromViewport,
    selectObjectFromList,
    highlightObject,
    makeXrayExcept,
    makeOthersXray,
    makeSelectedObjectsXray,
    makeTargetObjectsXray,
    resetXray,
    selectObjectFromMesh,
    focusObjectFromMesh,
    highlightSelectedObjectsPreservingVisualState,
    xrayTargetObject,
    xrayTargetObjects,
  };
}
