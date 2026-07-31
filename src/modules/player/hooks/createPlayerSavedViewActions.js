import { createCameraStateFromStoredView } from "../../../engine/camera"
import { applyStoredModelRotation } from "../../../engine/model"
import { createMultiSelectionPayload } from "../../../engine/selection"
import { findObjectByReference } from "./playerObjectReference"

function normalizeSavedReferences(primaryReference, references) {
  const source = Array.isArray(references) && references.length > 0
    ? references
    : primaryReference
      ? [primaryReference]
      : []

  return source.filter(Boolean)
}


function normalizeSavedXrayMode(xrayState) {
  return xrayState?.mode === "non-targets" ? "non-targets" : "targets"
}

function getSavedXrayReferences(visualState, mode) {
  const xrayState = visualState?.xray || {}

  if (mode === "non-targets") {
    if (Array.isArray(xrayState.normalObjects) && xrayState.normalObjects.length) {
      return xrayState.normalObjects
    }

    return Array.isArray(visualState?.selectedObjects)
      ? visualState.selectedObjects
      : []
  }

  return normalizeSavedReferences(
    xrayState.targetObject,
    xrayState.targetObjects,
  )
}

function normalizeSavedCuts(visualState) {
  if (Array.isArray(visualState?.cuts)) return visualState.cuts
  return visualState?.cut ? [visualState.cut] : []
}

function hasExplicitHighlightState(visualState) {
  return Boolean(
    visualState?.highlight && typeof visualState.highlight === "object",
  )
}

function getSavedHighlightReferences(visualState) {
  if (hasExplicitHighlightState(visualState)) {
    if (visualState.highlight.enabled === false) return []

    return Array.isArray(visualState.highlight.objects)
      ? visualState.highlight.objects
      : []
  }

  if (
    Array.isArray(visualState?.selectedObjects) &&
    visualState.selectedObjects.length > 0
  ) {
    return visualState.selectedObjects
  }

  return visualState?.selectedObject ? [visualState.selectedObject] : []
}

function getSavedHighlightActiveReference(visualState) {
  if (hasExplicitHighlightState(visualState)) {
    return visualState.highlight.activeObject || null
  }

  return visualState?.selectedObject || null
}

export function createPlayerSavedViewActions({
  modelScene,
  material,
  playerFreePlay,
  makePlayerTargetsXray,
  makePlayerOthersXray,
  setSelectedObject,
  setOutlineObjects,
  applyCameraState,
}) {
  const resolveReference = (reference) =>
    findObjectByReference(modelScene, reference)

  const applyHiddenObjects = (visualState) => {
    const hiddenReferences = Array.isArray(
      visualState?.visibility?.hiddenObjects,
    )
      ? visualState.visibility.hiddenObjects
      : []

    let hiddenCount = 0

    hiddenReferences.forEach((reference) => {
      const object = resolveReference(reference)

      if (!object) return
      object.visible = false
      hiddenCount += 1
    })

    return hiddenCount
  }

  const applyVisualState = (
    visualState,
    { fallbackObject = null } = {},
  ) => {
    if (!visualState || !modelScene) {
      return {
        applied: false,
        selectedObject: fallbackObject,
      }
    }

    const pullApartTarget = resolveReference(
      visualState.pullApart?.targetObject,
    )
    playerFreePlay.applySavedPullApart?.(
      visualState.pullApart,
      pullApartTarget,
    )

    const hiddenCount = applyHiddenObjects(visualState)
    const savedSelectedObject =
      resolveReference(visualState.selectedObject) || fallbackObject || null
    const explicitHighlightState = hasExplicitHighlightState(visualState)
    const savedHighlightObjects = getSavedHighlightReferences(visualState)
      .map(resolveReference)
      .filter(Boolean)

    if (
      !explicitHighlightState &&
      savedHighlightObjects.length === 0 &&
      savedSelectedObject
    ) {
      savedHighlightObjects.push(savedSelectedObject)
    }

    const savedHighlightActiveObject = resolveReference(
      getSavedHighlightActiveReference(visualState),
    )
    const activeHighlightObject =
      savedHighlightActiveObject &&
      savedHighlightObjects.includes(savedHighlightActiveObject)
        ? savedHighlightActiveObject
        : savedHighlightObjects.at(-1) || null
    const xrayMode = normalizeSavedXrayMode(visualState.xray)
    const xrayTargets = getSavedXrayReferences(visualState, xrayMode)
      .map(resolveReference)
      .filter(Boolean)
    const savedActiveObject =
      resolveReference(visualState.xray?.activeObject) || savedSelectedObject

    let activeSelection = null

    if (visualState.xray?.enabled && xrayTargets.length > 0) {
      const activeXrayTarget =
        savedActiveObject && xrayTargets.includes(savedActiveObject)
          ? savedActiveObject
          : xrayTargets.at(-1)

      if (xrayMode === "non-targets") {
        makePlayerOthersXray(xrayTargets, activeXrayTarget)
      } else {
        makePlayerTargetsXray(xrayTargets, activeXrayTarget)
      }

      activeSelection = activeXrayTarget
    }

    if (savedHighlightObjects.length > 0) {
      const selection = createMultiSelectionPayload(
        savedHighlightObjects,
        activeHighlightObject,
      )

      setSelectedObject(selection.selectedObject)
      setOutlineObjects(selection.outlineObjects)
      activeSelection = selection.selectedObject
    } else if (explicitHighlightState) {
      setSelectedObject(null)
      setOutlineObjects([])
      activeSelection = null
    } else if (!(visualState.xray?.enabled && xrayTargets.length > 0)) {
      setSelectedObject(null)
      setOutlineObjects([])
    }

    const resolvedCuts = normalizeSavedCuts(visualState)
      .map((cutState) => ({
        cutState,
        targetObject: resolveReference(cutState?.targetObject),
      }))
      .filter((entry) => entry.targetObject)

    const preferredCutTarget = resolvedCuts.some(
      (entry) => entry.targetObject === activeSelection,
    )
      ? activeSelection
      : resolvedCuts[0]?.targetObject || null
    const cutsApplied = Boolean(
      playerFreePlay.applySavedCuts?.(resolvedCuts, preferredCutTarget),
    )

    modelScene.updateMatrixWorld?.(true)

    return {
      applied: true,
      selectedObject: activeSelection,
      highlightObjects: savedHighlightObjects,
      xrayMode,
      xrayTargets,
      hiddenCount,
      cutsApplied,
    }
  }

  const applyCameraView = (cameraView) => {
    if (!cameraView || !modelScene) return false

    applyStoredModelRotation(modelScene, cameraView)

    const cameraState = createCameraStateFromStoredView(cameraView)
    return cameraState ? applyCameraState(cameraState) : false
  }

  return {
    applyVisualState,
    applyCameraView,
  }
}

export default createPlayerSavedViewActions
