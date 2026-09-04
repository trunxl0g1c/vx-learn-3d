import {
  applyModelShaderMode,
  releaseGeneratedModelMaterial,
} from "../../../engine/model";

export function createPlayerXrayActions({
  modelScene,
  viewerSettings,
  xrayTargetRef,
  xrayMaterial,
  setSelectedObject,
  setOutlineObjects,
  setShaderOutlineObjects,
  setShaderOutlineStyle,
}) {
  const restorePlayerRenderMode = () => {
    const shaderState = applyModelShaderMode(modelScene, viewerSettings);
    xrayTargetRef.current = null;
    setShaderOutlineObjects(shaderState.outlineObjects);
    setShaderOutlineStyle(shaderState.outlineStyle || null);

    return shaderState;
  };

  const isObjectInsideTarget = (object, targetObject) => {
    let current = object;

    while (current) {
      if (current === targetObject) return true;
      current = current.parent;
    }

    return false;
  };

  const resetPlayerObjectXray = () => {
    if (!modelScene) {
      xrayTargetRef.current = null;
      setSelectedObject(null);
      setOutlineObjects([]);
      return;
    }

    restorePlayerRenderMode();
    setSelectedObject(null);
    setOutlineObjects([]);
  };

  const makePlayerTargetsXray = (
    targetObjects,
    activeTargetObject = null,
  ) => {
    const validTargets = Array.from(
      new Set(
        (Array.isArray(targetObjects) ? targetObjects : [targetObjects]).filter(
          Boolean,
        ),
      ),
    );

    if (!modelScene || validTargets.length === 0) {
      resetPlayerObjectXray();
      return;
    }

    restorePlayerRenderMode();

    const outlineMeshes = [];

    modelScene.traverse((child) => {
      if (!child.isMesh) return;

      const belongsToXrayTarget = validTargets.some((targetObject) =>
        isObjectInsideTarget(child, targetObject),
      );

      if (belongsToXrayTarget) {
        outlineMeshes.push(child);
        releaseGeneratedModelMaterial(child);
        child.material = xrayMaterial;
        child.userData.__vxGeneratedShaderMaterial = false;
        child.renderOrder = 999;
        child.material.needsUpdate = true;
        return;
      }

      child.renderOrder = 0;
      if (child.material) child.material.needsUpdate = true;
    });

    const resolvedActiveTarget =
      activeTargetObject && validTargets.includes(activeTargetObject)
        ? activeTargetObject
        : validTargets.at(-1);

    xrayTargetRef.current = resolvedActiveTarget || validTargets[0];
    setSelectedObject(resolvedActiveTarget || validTargets.at(-1) || null);
    setOutlineObjects(outlineMeshes);
  };


  const makePlayerOthersXray = (
    targetObjects,
    activeTargetObject = null,
  ) => {
    const validTargets = Array.from(
      new Set(
        (Array.isArray(targetObjects) ? targetObjects : [targetObjects]).filter(
          Boolean,
        ),
      ),
    );

    if (!modelScene || validTargets.length === 0) {
      resetPlayerObjectXray();
      return;
    }

    restorePlayerRenderMode();

    const outlineMeshes = [];

    modelScene.traverse((child) => {
      if (!child.isMesh) return;

      const belongsToSelection = validTargets.some((targetObject) =>
        isObjectInsideTarget(child, targetObject),
      );

      if (belongsToSelection) {
        outlineMeshes.push(child);
        child.renderOrder = 999;
        if (child.material) child.material.needsUpdate = true;
        return;
      }

      releaseGeneratedModelMaterial(child);
      child.material = xrayMaterial;
      child.userData.__vxGeneratedShaderMaterial = false;
      child.renderOrder = 0;
      child.material.needsUpdate = true;
    });

    const resolvedActiveTarget =
      activeTargetObject && validTargets.includes(activeTargetObject)
        ? activeTargetObject
        : validTargets.at(-1);

    // This ref indicates that a material override is active. In isolation
    // mode the referenced object itself stays normal.
    xrayTargetRef.current = resolvedActiveTarget || validTargets[0];
    setSelectedObject(resolvedActiveTarget || validTargets.at(-1) || null);
    setOutlineObjects(outlineMeshes);
  };

  const makePlayerXrayExcept = (targetObject) =>
    makePlayerTargetsXray([targetObject], targetObject);

  return {
    restorePlayerRenderMode,
    resetPlayerObjectXray,
    makePlayerTargetsXray,
    makePlayerOthersXray,
    makePlayerXrayExcept,
  };
}
