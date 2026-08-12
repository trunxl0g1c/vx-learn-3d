export function createPlayerProcedureStepHighlighter({
  getProcedureStepTargets,
  restorePlayerRenderMode,
  playerFreePlay,
  applySavedVisualState,
  setSelectedObject,
  setOutlineObjects,
  proceduralEngine,
  applySavedCameraView,
  focusObject,
  modelScene,
}) {
  return (step, { applyStepStart = false } = {}) => {
    const targetObjects = getProcedureStepTargets(step);
    const primaryTarget = targetObjects[0] || null;

    if (!primaryTarget) {
      setSelectedObject(null);
      setOutlineObjects([]);
      return null;
    }

    restorePlayerRenderMode();
    playerFreePlay.resetSavedPresentationState?.({
      preserveTransforms: true,
      preserveVisibility: true,
    });

    const savedStateResult = step?.visualState
      ? applySavedVisualState(step.visualState, {
          fallbackObject: primaryTarget,
        })
      : null;

    if (!savedStateResult?.applied) {
      setSelectedObject(primaryTarget);
      setOutlineObjects(
        targetObjects.flatMap(
          (targetObject) =>
            proceduralEngine.collectMeshes?.(targetObject) || [],
        ),
      );
    }

    // A saved Start transform is the authoritative transform when a step
    // becomes active. Apply it after the saved visual state because Pull Apart
    // or other presentation state can change object positions. Calls that only
    // refresh the highlight (wrong click / failed snap) leave the current
    // transform untouched.
    if (applyStepStart && modelScene) {
      proceduralEngine.resetStep?.(modelScene, step);
      modelScene.updateMatrixWorld?.(true);
    }

    const cameraApplied = Boolean(
      step?.cameraView && applySavedCameraView(step.cameraView),
    );

    if (!cameraApplied) {
      focusObject(savedStateResult?.selectedObject || primaryTarget);
    }

    return savedStateResult?.selectedObject || primaryTarget;
  };
}

export default createPlayerProcedureStepHighlighter;
