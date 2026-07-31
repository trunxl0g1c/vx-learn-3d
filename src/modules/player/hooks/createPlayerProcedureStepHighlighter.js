export function createPlayerProcedureStepHighlighter({
  getProcedureStepTarget,
  restorePlayerRenderMode,
  playerFreePlay,
  applySavedVisualState,
  setSelectedObject,
  setOutlineObjects,
  proceduralEngine,
  applySavedCameraView,
  focusObject,
}) {
  return (step) => {
    const targetObject = getProcedureStepTarget(step)

    if (!targetObject) {
      setSelectedObject(null)
      setOutlineObjects([])
      return null
    }

    restorePlayerRenderMode()
    playerFreePlay.resetSavedPresentationState?.()

    const savedStateResult = step?.visualState
      ? applySavedVisualState(step.visualState, { fallbackObject: targetObject })
      : null

    if (!savedStateResult?.applied) {
      setSelectedObject(targetObject)
      setOutlineObjects(proceduralEngine.collectMeshes?.(targetObject) || [])
    }

    const cameraApplied = Boolean(
      step?.cameraView && applySavedCameraView(step.cameraView),
    )

    if (!cameraApplied) {
      focusObject(savedStateResult?.selectedObject || targetObject)
    }

    return savedStateResult?.selectedObject || targetObject
  }
}

export default createPlayerProcedureStepHighlighter
