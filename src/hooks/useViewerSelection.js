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
  }, [selectionEngine, modelScene, objectList]);

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

  const selectObjectFromMesh = (mesh) => {
    setXrayTargetObject(null);
    const payload = selectionEngine.selectFromMesh(mesh);

    if (!payload) return;

    setSelectedObjectName(payload.selectedObjectName);
    setSelectedObject(payload.selectedObject);
    setOutlineObjects(payload.outlineObjects);
    setOrbitEnabled(payload.orbitEnabled);
    setIsAutoRotating(payload.isAutoRotating);

    // Keep viewport selection behavior consistent with the hierarchy tree.
    // Focusing the exact selected group also moves OrbitControls.target to
    // the object's bounding-box center, so small parts can be zoomed closely.
    if (payload.selectedObject) {
      focusObject?.(payload.selectedObject);
    } else {
      focusTargetRef.current = payload.focusTarget || null;
    }

    // Keep the active chapter editor locked while tools select other objects.
    // The tool target may change, but chapter authoring is released only by
    // the explicit Deselect action in the chapter panel.
    if (!activeChapterId) {
      setRightTab?.("info");
    }
  };

  return {
    selectionEngine,
    highlightObject,
    makeXrayExcept,
    resetXray,
    selectObjectFromMesh,
    xrayTargetObject,
  };
}
