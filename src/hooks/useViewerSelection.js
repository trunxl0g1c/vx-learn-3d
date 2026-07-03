import { useEffect, useMemo, useRef } from "react";
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
  setIsAutoRotating,
}) {
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
    applySelectionPayload(
      selectionEngine.highlightObject(targetObject)
    );
  };

  const makeXrayExcept = (targetObject) => {
    applySelectionPayload(
      selectionEngine.makeXrayExcept(targetObject)
    );
  };

  const resetXray = () => {
    applySelectionPayload(selectionEngine.resetXray());
  };

  const selectObjectFromMesh = (mesh) => {
    const payload = selectionEngine.selectFromMesh(mesh);

    if (!payload) return;

    setSelectedObjectName(payload.selectedObjectName);
    setSelectedObject(payload.selectedObject);
    setOutlineObjects(payload.outlineObjects);
    setOrbitEnabled(payload.orbitEnabled);
    focusTargetRef.current = payload.focusTarget;
    setIsAutoRotating(payload.isAutoRotating);
  };

  return {
    selectionEngine,
    highlightObject,
    makeXrayExcept,
    resetXray,
    selectObjectFromMesh,
  };
}
