import { findObjectByReference } from "./findViewerObjectByReference"

function normalizeXrayMode(xrayState) {
  return xrayState?.mode === "non-targets" ? "non-targets" : "targets"
}

function getXrayReferences(visualState, mode) {
  const xrayState = visualState?.xray || {}

  if (mode === "non-targets") {
    if (Array.isArray(xrayState.normalObjects) && xrayState.normalObjects.length) {
      return xrayState.normalObjects
    }

    return Array.isArray(visualState?.selectedObjects)
      ? visualState.selectedObjects
      : []
  }

  if (Array.isArray(xrayState.targetObjects) && xrayState.targetObjects.length) {
    return xrayState.targetObjects
  }

  return xrayState.targetObject ? [xrayState.targetObject] : []
}

function getHighlightReferences(visualState) {
  const highlightState = visualState?.highlight

  if (highlightState && typeof highlightState === "object") {
    if (highlightState.enabled === false) return []

    return Array.isArray(highlightState.objects)
      ? highlightState.objects
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

function getHighlightActiveReference(visualState) {
  const highlightState = visualState?.highlight

  if (highlightState && typeof highlightState === "object") {
    return highlightState.activeObject || null
  }

  return visualState?.selectedObject || null
}

function hasExplicitHighlightState(visualState) {
  return Boolean(
    visualState?.highlight && typeof visualState.highlight === "object",
  )
}

function getBlinkReferences(visualState) {
  const blinkState = visualState?.blink

  if (!blinkState || typeof blinkState !== "object") return []
  if (blinkState.enabled === false) return []

  return Array.isArray(blinkState.objects) ? blinkState.objects : []
}

function getDisplayName(object, chapter) {
  return String(
    object?.name || chapter?.objectName || chapter?.title || "",
  ).replaceAll("_", " ")
}

export function applySavedViewerVisualState({
  scene,
  chapter,
  chapterObject,
  visualState,
  applySavedPullApart,
  makeOthersXray,
  makeTargetObjectsXray,
  highlightObject,
  highlightSelectedObjectsPreservingVisualState,
  setSelectedObjectName,
  setBlinkSelectedObjectsEnabled,
  applySavedCuts,
}) {
  if (!scene || !visualState) return null

  const resolveReference = (reference) =>
    findObjectByReference(scene, reference)
  const pullApartTarget = resolveReference(
    visualState.pullApart?.targetObject,
  )

  applySavedPullApart(visualState.pullApart, pullApartTarget)

  const hiddenReferences = Array.isArray(
    visualState.visibility?.hiddenObjects,
  )
    ? visualState.visibility.hiddenObjects
    : []

  hiddenReferences.forEach((reference) => {
    const object = resolveReference(reference)
    if (object) object.visible = false
  })

  const xrayMode = normalizeXrayMode(visualState.xray)
  const xrayTargets = getXrayReferences(visualState, xrayMode)
    .map(resolveReference)
    .filter(Boolean)
  const savedSelectedObject = resolveReference(visualState.selectedObject)
  const explicitHighlightState = hasExplicitHighlightState(visualState)
  let savedHighlightObjects = getHighlightReferences(visualState)
    .map(resolveReference)
    .filter(Boolean)
  const savedBlinkObjects = getBlinkReferences(visualState)
    .map(resolveReference)
    .filter(Boolean)

  if (savedHighlightObjects.length === 0 && savedBlinkObjects.length > 0) {
    savedHighlightObjects = savedBlinkObjects
  }
  const savedHighlightActiveObject = resolveReference(
    getHighlightActiveReference(visualState),
  )
  const activeHighlightObject =
    savedHighlightActiveObject &&
    savedHighlightObjects.includes(savedHighlightActiveObject)
      ? savedHighlightActiveObject
      : savedHighlightObjects.at(-1) || null
  const savedActiveObject =
    resolveReference(visualState.xray?.activeObject) || savedSelectedObject
  const activeXrayTarget =
    savedActiveObject && xrayTargets.includes(savedActiveObject)
      ? savedActiveObject
      : xrayTargets.at(-1) || null
  const preferredSelection =
    activeHighlightObject ||
    activeXrayTarget ||
    savedSelectedObject ||
    chapterObject ||
    null

  if (visualState.xray?.enabled && xrayTargets.length > 0) {
    if (xrayMode === "non-targets") {
      makeOthersXray(xrayTargets, activeXrayTarget)
    } else {
      makeTargetObjectsXray(xrayTargets, activeXrayTarget)
    }

    setSelectedObjectName(getDisplayName(activeXrayTarget, chapter))
  }

  if (savedHighlightObjects.length > 0) {
    if (highlightSelectedObjectsPreservingVisualState) {
      highlightSelectedObjectsPreservingVisualState(
        savedHighlightObjects,
        activeHighlightObject,
      )
    } else if (activeHighlightObject) {
      highlightObject(activeHighlightObject)
    }

    setSelectedObjectName(getDisplayName(activeHighlightObject, chapter))
  } else if (
    explicitHighlightState &&
    highlightSelectedObjectsPreservingVisualState
  ) {
    highlightSelectedObjectsPreservingVisualState([], null)
    setSelectedObjectName("")
  }

  setBlinkSelectedObjectsEnabled?.(
    Boolean(visualState?.blink?.enabled) && savedBlinkObjects.length > 0,
  )

  const savedCuts = Array.isArray(visualState.cuts)
    ? visualState.cuts
    : visualState.cut
      ? [visualState.cut]
      : []
  const resolvedCuts = savedCuts
    .map((cutState) => ({
      cutState,
      targetObject: resolveReference(cutState?.targetObject),
    }))
    .filter((entry) => entry.targetObject)

  applySavedCuts(resolvedCuts, preferredSelection || scene)

  return {
    selectedObject: preferredSelection,
    highlightObjects: savedHighlightObjects,
    blinkObjects: savedBlinkObjects,
    blinkEnabled:
      Boolean(visualState?.blink?.enabled) && savedBlinkObjects.length > 0,
    xrayMode,
    xrayTargets,
    hiddenCount: hiddenReferences.length,
    cutsApplied: resolvedCuts.length,
  }
}

export default applySavedViewerVisualState
