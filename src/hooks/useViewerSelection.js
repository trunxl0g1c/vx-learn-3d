import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { createSelectionEngine } from "../engine/selection";

export function useViewerSelection({
  vxEngine,
  modelScene,
  objectList,
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

  const xrayMaterialRef = useRef(
    new THREE.MeshPhysicalMaterial({
      color: "#4fc3f7",
      transparent: true,
      opacity: 0.22,
      roughness: 0.2,
      metalness: 0,
      depthWrite: false,
      depthTest: true,
    })
  );

  const selectionEngine = useMemo(
    () => vxEngine?.selection || createSelectionEngine(),
    [vxEngine]
  );

  useEffect(() => {
    selectionEngine.setScene(modelScene);
    selectionEngine.setObjectTree(objectList);
    selectionEngine.setXrayMaterial(xrayMaterialRef.current);
    selectionEngine.setMaterialRestorer(() => restoreShaderMode?.());
  }, [
    selectionEngine,
    modelScene,
    objectList,
    restoreShaderMode,
  ]);

  const applySelectionPayload = (payload) => {
    if (!payload) return;

    setSelectedObject(payload.selectedObject || null);
    setOutlineObjects(payload.outlineObjects || []);
  };

  const highlightObject = (targetObject) => {
    setXrayTargetObject(null);
    applySelectionPayload(
      selectionEngine.highlightObject(targetObject)
    );
  };

  const makeXrayExcept = (targetObject) => {
    setXrayTargetObject(targetObject || null);
    applySelectionPayload(
      selectionEngine.makeXrayExcept(targetObject)
    );
  };

  const resetXray = () => {
    setXrayTargetObject(null);
    applySelectionPayload(selectionEngine.resetXray());
  };

  const applyMeshSelection = (mesh) => {
    setXrayTargetObject(null);
    const payload = selectionEngine.selectFromMesh(mesh);

    if (!payload) return null;

    setSelectedObjectName(payload.selectedObjectName);
    setSelectedObject(payload.selectedObject);
    setOutlineObjects(payload.outlineObjects);
    setOrbitEnabled(payload.orbitEnabled);
    setIsAutoRotating(payload.isAutoRotating);
    focusTargetRef.current = payload.focusTarget || null;

    // Keep the active chapter editor locked while tools select other objects.
    // The tool target may change, but chapter authoring is released only by
    // the explicit Deselect action in the chapter panel.
    if (!activeChapterId) {
      setRightTab?.("info");
    }

    return payload;
  };

  const selectObjectFromMesh = (mesh) => {
    // A single click only selects/highlights the exact raycast object.
    // Camera focus is intentionally reserved for a double click.
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
    highlightObject,
    makeXrayExcept,
    resetXray,
    selectObjectFromMesh,
    focusObjectFromMesh,
    xrayTargetObject,
  };
}
