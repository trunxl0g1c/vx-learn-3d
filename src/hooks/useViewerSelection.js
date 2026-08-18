import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_BLINK_PRESET_ID,
  assignBlinkPresetToTargets,
  createSelectionEngine,
  getBlinkAssignmentTargets,
  normalizeBlinkAssignments,
  removeTargetsFromBlinkAssignments,
} from "../engine/selection";
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
  suppressInfoPanel = false,
  restoreShaderMode,
}) {
  const [xrayTargetObject, setXrayTargetObject] = useState(null);
  const [xrayTargetObjects, setXrayTargetObjects] = useState([]);
  const [xrayNormalObjects, setXrayNormalObjects] = useState([]);
  const [multipleSelectEnabled, setMultipleSelectEnabled] = useState(false);
  const [blinkSelectedObjectsEnabled, setBlinkSelectedObjectsEnabledState] =
    useState(false);
  const [blinkTargetObjects, setBlinkTargetObjectsState] = useState([]);
  const [blinkAssignments, setBlinkAssignments] = useState([]);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const selectedObjectsRef = useRef([]);
  const xrayTargetObjectsRef = useRef([]);
  const xrayMaterialDisposeVersionRef = useRef(0);

  const xrayMaterialRef = useRef(null);

  if (!xrayMaterialRef.current) {
    xrayMaterialRef.current = createViqubedXrayMaterial();
  }

  const selectionEngine = useMemo(
    () => vxEngine?.selection || createSelectionEngine(),
    [vxEngine],
  );

  const syncBlinkAssignments = (assignments = [], enabled = true) => {
    const normalizedAssignments = normalizeBlinkAssignments(assignments);
    const allObjects = getBlinkAssignmentTargets(normalizedAssignments);

    setBlinkAssignments(normalizedAssignments);
    setBlinkTargetObjectsState(allObjects);
    setBlinkSelectedObjectsEnabledState(Boolean(enabled) && allObjects.length > 0);
    return normalizedAssignments;
  };

  const setBlinkTargetObjects = (objects = []) => {
    const normalizedObjects = Array.from(
      new Set((Array.isArray(objects) ? objects : [objects]).filter(Boolean)),
    );

    if (normalizedObjects.length === 0) {
      syncBlinkAssignments([], false);
      return;
    }

    syncBlinkAssignments(
      [{ presetId: DEFAULT_BLINK_PRESET_ID, objects: normalizedObjects }],
      true,
    );
  };

  const setBlinkSelectedObjectsEnabled = (enabled) => {
    const nextEnabled = typeof enabled === "function"
      ? enabled(blinkSelectedObjectsEnabled)
      : enabled;
    setBlinkSelectedObjectsEnabledState(Boolean(nextEnabled));
    if (!nextEnabled) {
      setBlinkAssignments([]);
      setBlinkTargetObjectsState([]);
    }
  };

  const commitSelectedObjects = (nextObjects = []) => {
    const normalizedObjects = Array.from(
      new Set((Array.isArray(nextObjects) ? nextObjects : [nextObjects]).filter(Boolean)),
    );

    selectedObjectsRef.current = normalizedObjects;
    setSelectedObjects(normalizedObjects);
    return normalizedObjects;
  };

  const syncXrayTargetObjects = (objects = [], activeObject = null) => {
    const normalizedObjects = Array.from(
      new Set((Array.isArray(objects) ? objects : [objects]).filter(Boolean)),
    );

    xrayTargetObjectsRef.current = normalizedObjects;
    setXrayTargetObjects(normalizedObjects);
    setXrayTargetObject(
      activeObject && normalizedObjects.includes(activeObject)
        ? activeObject
        : normalizedObjects.at(-1) || null,
    );

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
    syncBlinkAssignments([], false);
    xrayTargetObjectsRef.current = [];
    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    setXrayNormalObjects([]);
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

  const blinkRenderGroups = useMemo(
    () =>
      blinkAssignments.map((assignment) => ({
        presetId: assignment.presetId,
        objects: assignment.objects,
        outlineObjects:
          selectionEngine.getOutlineObjectsForTargets?.(assignment.objects) || [],
      })),
    [blinkAssignments, selectionEngine],
  );
  const blinkOutlineObjects = useMemo(
    () => Array.from(new Set(blinkRenderGroups.flatMap((group) => group.outlineObjects))),
    [blinkRenderGroups],
  );

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

    if (openInfo && activeObject && !activeChapterId && !suppressInfoPanel) {
      setRightTab?.("info");
    }

    return payload;
  };

  const clearSelection = ({ closeInfo = true } = {}) => {
    commitSelectedObjects([]);
    applySelectionPayload(selectionEngine.clearSelectionPreservingMaterials());
    setSelectedObjectName("");
    setOrbitEnabled(true);
    focusTargetRef.current = null;

    if (closeInfo && !activeChapterId && !suppressInfoPanel) {
      setRightTab?.(null);
    }
  };

  // Viewport deselection is transient UI state only. Persistent visual
  // assignments (X-Ray / Blink / visibility) must remain untouched.
  const clearSelectionFromViewport = ({ closeInfo = true } = {}) => {
    clearSelection({ closeInfo });
  };

  const highlightObject = (targetObject, options = {}) => {
    commitSelectedObjects(targetObject ? [targetObject] : []);

    const payload =
      selectionEngine.getMaterialOverrideMode?.() !== "none"
        ? selectionEngine.highlightObjectsPreservingMaterials(
            targetObject ? [targetObject] : [],
            targetObject || null,
          )
        : selectionEngine.highlightObject(targetObject);

    return updateActiveSelection(payload, targetObject?.name, options);
  };

  // Explicit object X-Ray action: the selected target itself becomes
  // transparent, while the rest of the model remains in its active mode.
  const makeXrayExcept = (targetObject, options = {}) => {
    if (!targetObject) return null;
    return makeTargetObjectsXray([targetObject], targetObject, options);
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

    xrayTargetObjectsRef.current = [];
    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    setXrayNormalObjects(normalizedTargets);
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

    const { replaceExisting = false, ...selectionOptions } = options || {};
    const canMergeExistingTargets =
      !replaceExisting &&
      selectionEngine.getMaterialOverrideMode?.() === "targets";
    const nextXrayTargets = Array.from(
      new Set([
        ...(canMergeExistingTargets ? xrayTargetObjectsRef.current : []),
        ...normalizedTargets,
      ]),
    );
    const resolvedActiveTarget =
      activeTargetObject && normalizedTargets.includes(activeTargetObject)
        ? activeTargetObject
        : selectedObject && normalizedTargets.includes(selectedObject)
          ? selectedObject
          : normalizedTargets.at(-1);

    syncXrayTargetObjects(nextXrayTargets, resolvedActiveTarget);
    setXrayNormalObjects([]);
    commitSelectedObjects(normalizedTargets);

    return updateActiveSelection(
      selectionEngine.makeTargetsXray(
        nextXrayTargets,
        resolvedActiveTarget,
      ),
      resolvedActiveTarget?.name,
      selectionOptions,
    );
  };

  const removeTargetObjectsXray = (targetObjects = []) => {
    const normalizedTargets = Array.from(
      new Set((Array.isArray(targetObjects) ? targetObjects : [targetObjects]).filter(Boolean)),
    );
    if (normalizedTargets.length === 0) return false;
    if (selectionEngine.getMaterialOverrideMode?.() !== "targets") return false;

    const targetSet = new Set(normalizedTargets);
    const remainingTargets = xrayTargetObjectsRef.current.filter(
      (object) => !targetSet.has(object),
    );
    const currentSelection = multipleSelectEnabled
      ? selectedObjectsRef.current
      : selectedObject
        ? [selectedObject]
        : [];
    const activeSelection =
      selectedObject && currentSelection.includes(selectedObject)
        ? selectedObject
        : currentSelection.at(-1) || null;

    if (remainingTargets.length > 0) {
      syncXrayTargetObjects(remainingTargets, remainingTargets.at(-1));
      selectionEngine.makeTargetsXray(
        remainingTargets,
        remainingTargets.at(-1),
      );
    } else {
      syncXrayTargetObjects([], null);
      selectionEngine.resetXray();
    }

    if (currentSelection.length > 0) {
      updateActiveSelection(
        selectionEngine.highlightObjectsPreservingMaterials(
          currentSelection,
          activeSelection,
        ),
        activeSelection?.name,
        { openInfo: false },
      );
    }

    return true;
  };

  const getActionTargets = () => {
    if (multipleSelectEnabled) {
      return selectedObjectsRef.current;
    }

    return selectedObject ? [selectedObject] : [];
  };

  const getActionActiveTarget = (targets = []) =>
    selectedObject && targets.includes(selectedObject)
      ? selectedObject
      : targets.at(-1) || null;

  const activeSelectionHasBlink = useMemo(() => {
    const actionTargets = multipleSelectEnabled
      ? selectedObjects
      : selectedObject
        ? [selectedObject]
        : [];
    if (actionTargets.length === 0) return false;

    const assignedTargets = new Set(getBlinkAssignmentTargets(blinkAssignments));
    return actionTargets.every((object) => assignedTargets.has(object));
  }, [
    multipleSelectEnabled,
    selectedObjects,
    selectedObject,
    blinkAssignments,
  ]);

  const makeSelectedObjectsXray = () => {
    const targets = getActionTargets();
    return makeTargetObjectsXray(targets, getActionActiveTarget(targets));
  };

  const highlightSelectedObjectsAgainstXray = () => {
    const targets = getActionTargets();
    return makeOthersXray(targets, getActionActiveTarget(targets));
  };

  const resetXray = ({ closeInfo = true } = {}) => {
    xrayTargetObjectsRef.current = [];
    setXrayTargetObject(null);
    setXrayTargetObjects([]);
    setXrayNormalObjects([]);
    commitSelectedObjects([]);
    applySelectionPayload(selectionEngine.resetXray());
    setSelectedObjectName("");
    setOrbitEnabled(true);
    focusTargetRef.current = null;

    if (closeInfo && !activeChapterId && !suppressInfoPanel) {
      setRightTab?.(null);
    }
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

      const payload = highlightObject(targetObject);

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
      clearSelection({ closeInfo: false });
      return;
    }

    const activeTargetObject =
      selectedObject || selectedObjectsRef.current.at(-1) || null;
    const initialSelection = activeTargetObject ? [activeTargetObject] : [];

    if (initialSelection.length > 0) {
      highlightSelectedObjectsPreservingVisualState(
        initialSelection,
        activeTargetObject,
      );
    } else {
      commitSelectedObjects([]);
    }
  };

  const assignBlinkPresetToSelectedObjects = (presetId = DEFAULT_BLINK_PRESET_ID) => {
    const targets = getActionTargets();
    if (targets.length === 0) return false;

    const nextAssignments = assignBlinkPresetToTargets(
      blinkAssignments,
      presetId,
      targets,
    );

    syncBlinkAssignments(nextAssignments, true);
    return true;
  };

  const removeBlinkFromSelectedObjects = () => {
    const targets = getActionTargets();
    if (targets.length === 0) return false;

    const nextAssignments = removeTargetsFromBlinkAssignments(
      blinkAssignments,
      targets,
    );

    syncBlinkAssignments(nextAssignments, nextAssignments.length > 0);
    return true;
  };

  const toggleBlinkSelectedObjects = () =>
    assignBlinkPresetToSelectedObjects(DEFAULT_BLINK_PRESET_ID);


  const applyMeshSelection = (mesh) => {
    const resolvedPayload = selectionEngine.selectFromMesh(
      mesh,
      objectList,
      {
        preserveMaterialOverride:
          multipleSelectEnabled ||
          selectionEngine.getMaterialOverrideMode?.() !== "none",
      },
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

    commitSelectedObjects([resolvedPayload.selectedObject]);
    setSelectedObjectName(resolvedPayload.selectedObjectName);
    setSelectedObject(resolvedPayload.selectedObject);
    setOutlineObjects(resolvedPayload.outlineObjects);
    setOrbitEnabled(resolvedPayload.orbitEnabled);
    setIsAutoRotating(resolvedPayload.isAutoRotating);
    focusTargetRef.current = resolvedPayload.focusTarget || null;

    if (!activeChapterId && !suppressInfoPanel) {
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
    activeSelectionHasBlink,
    blinkTargetObjects,
    blinkAssignments,
    blinkRenderGroups,
    blinkOutlineObjects,
    setBlinkSelectedObjectsEnabled,
    setBlinkTargetObjects,
    setBlinkAssignments: (assignments) => syncBlinkAssignments(assignments, true),
    assignBlinkPresetToSelectedObjects,
    removeBlinkFromSelectedObjects,
    toggleBlinkSelectedObjects,
    toggleMultipleSelect,
    clearSelection,
    clearSelectionFromViewport,
    selectObjectFromList,
    highlightObject,
    makeXrayExcept,
    makeOthersXray,
    makeSelectedObjectsXray,
    highlightSelectedObjectsAgainstXray,
    makeTargetObjectsXray,
    removeTargetObjectsXray,
    resetXray,
    selectObjectFromMesh,
    focusObjectFromMesh,
    highlightSelectedObjectsPreservingVisualState,
    xrayTargetObject,
    xrayTargetObjects,
    xrayNormalObjects,
  };
}
