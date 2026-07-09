import { useRef, useState } from "react"
import { createModelEngine, createSceneBounds, getCutStateForAxis } from "../../../engine/model"
import { buildObjectTree } from "../../../utils/objectTreeUtils"
import {
  hideObject,
  showAllObjectsInScene,
  soloObject,
} from "../../../engine/selection"

function createNoCutValues(bounds) {
  return {
    x: bounds?.x?.max ?? 0,
    y: bounds?.y?.max ?? 0,
    z: bounds?.z?.max ?? 0,
  }
}

export default function usePlayerFreePlay({
  modelScene,
  selectedObject,
  originalPositions,
  originalGroupPositions,
  cutAxis,
  cutBoundsRef,
  setCutAxis,
  setCutMin,
  setCutMax,
  setCutValue,
  cutValues,
  setCutValues,
  setCutRanges,
  setCutEnabled,
  setSelectedObject,
  setOutlineObjects,
  focusTargetRef,
  viewerSettings,
}) {
  const modelEngineRef = useRef(null)
  const [isPullApartActive, setIsPullApartActive] = useState(false)

  if (!modelEngineRef.current) {
    modelEngineRef.current = createModelEngine({ buildObjectTree })
  }

  const getModelEngine = () => {
    const engine = modelEngineRef.current

    if (modelScene && engine.getScene() !== modelScene) {
      engine.initialize(modelScene, viewerSettings || {})
    }

    return engine
  }

  const ensureCutBounds = () => {
    if (!cutBoundsRef.current && modelScene) {
      cutBoundsRef.current = createSceneBounds(modelScene)
    }

    if (cutBoundsRef.current) {
      setCutRanges?.(cutBoundsRef.current)
    }

    return cutBoundsRef.current
  }

  const applyCutBoundsForAxis = (axis) => {
    const bounds = ensureCutBounds()
    const cutState = getCutStateForAxis(bounds, axis)

    if (!cutState) return

    setCutMin(cutState.min)
    setCutMax(cutState.max)
    setCutValue(cutValues?.[axis] ?? cutState.max)
  }

  const updateCutAxis = (axis) => {
    setCutAxis(axis)
    applyCutBoundsForAxis(axis)
  }

  const updateCutValue = (axis, value) => {
    ensureCutBounds()

    const nextValues = {
      ...(cutValues || createNoCutValues(cutBoundsRef.current)),
      [axis]: value,
    }

    setCutAxis(axis)
    setCutValues?.(nextValues)
    setCutValue(value)
    applyCutBoundsForAxis(axis)
    setCutEnabled(true)
  }

  const pullApart = () => {
    if (!modelScene) return false

    if (isPullApartActive) {
      resetAllTransforms()
      return false
    }

    const didPullApart = getModelEngine().pullApart(selectedObject, {
      mode: "hierarchy",
      strength: selectedObject ? 0.28 : 0.18,
      animationDuration: 450,
      hideOutsideSelection: true,
    })

    if (didPullApart) {
      setIsPullApartActive(true)
    }

    return didPullApart
  }

  const resetParts = () => {
    getModelEngine().resetParts()
  }

  const resetMovedObjects = () => {
    getModelEngine().resetMovedObjects()
  }

  const resetModelRotationForCut = () => {
    if (!modelScene) return

    modelScene.rotation.set(0, 0, 0)
    focusTargetRef.current = null
  }

  const resetSection = () => {
    const bounds = ensureCutBounds()

    if (!bounds) return

    const nextValues = createNoCutValues(bounds)
    setCutValues?.(nextValues)
    setCutValue(nextValues[cutAxis] ?? nextValues.x)
    applyCutBoundsForAxis(cutAxis)
    resetModelRotationForCut()
  }

  const toggleCutSection = () => {
    resetSection()
    setCutEnabled((prev) => !prev)
  }

  const hideSelectedObject = () => {
    if (!selectedObject) return

    const selection = hideObject(selectedObject)

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)
  }

  const soloSelectedObject = () => {
    if (!selectedObject || !modelScene) return

    const selection = soloObject(modelScene, selectedObject)

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)
  }

  const showAllObjects = () => {
    showAllObjectsInScene(modelScene)
  }

  const resetAllTransforms = () => {
    resetParts()
    resetMovedObjects()
    resetModelRotationForCut()
    showAllObjects()
    setCutEnabled(false)
    setIsPullApartActive(false)
  }

  return {
    applyCutBoundsForAxis,
    updateCutAxis,
    updateCutValue,
    pullApart,
    isPullApartActive,
    resetParts,
    resetMovedObjects,
    resetModelRotationForCut,
    resetSection,
    toggleCutSection,
    hideSelectedObject,
    soloSelectedObject,
    showAllObjects,
    resetAllTransforms,
  }
}
