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

    // Visibility inside a saved Procedure visual state is a full snapshot, not
    // just a list of additional objects to hide. When the previous step hid an
    // object and the current step saved that object as visible, we must restore
    // the scene visibility baseline before applying the current hidden list.
    // Without this, hidden state leaks forward and an authored click target can
    // remain invisible (and therefore impossible to raycast/click) in Player.
    const hasSavedVisibilitySnapshot = Array.isArray(
      step?.visualState?.visibility?.hiddenObjects,
    );

    playerFreePlay.resetSavedPresentationState?.({
      preserveTransforms: true,
      preserveVisibility: !hasSavedVisibilitySnapshot,
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
      proceduralEngine.resetStep?.(modelScene, step, {
        preserveProcedureVisibility: true,
      });
      modelScene.updateMatrixWorld?.(true);
    }

    // Wrong-click / failed-drag feedback can refresh the saved visual state
    // without resetting transforms. Re-assert Procedure visibility every time
    // so a hidden object never reappears just because the current step was
    // highlighted again.
    proceduralEngine.reapplyProcedureVisibility?.(modelScene);

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
