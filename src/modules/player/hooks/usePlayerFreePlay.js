import { useEffect, useRef, useState } from "react"
import { createModelEngine } from "../../../engine/model"
import {
  createCutEngine,
  createNoCutValuesFromBounds,
} from "../../../engine/cut"
import { buildObjectTree } from "../../../utils/objectTreeUtils"
import {
  hideObject,
  showAllObjectsInScene,
  soloObject,
} from "../../../engine/selection"

function createNoCutValues(bounds) {
  return createNoCutValuesFromBounds(bounds)
}

function createCutValuesFromPercentages(percentages = {}, bounds = {}, fallback = {}) {
  return ["x", "y", "z"].reduce((values, axis) => {
    const min = Number(bounds?.[axis]?.min)
    const max = Number(bounds?.[axis]?.max)
    const percent = Number(percentages?.[axis])
    const fallbackValue = Number(fallback?.[axis])

    if (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      Number.isFinite(percent)
    ) {
      const clampedPercent = Math.max(0, Math.min(100, percent))
      values[axis] = max - ((max - min) * clampedPercent) / 100
    } else {
      values[axis] = Number.isFinite(fallbackValue) ? fallbackValue : max || 0
    }

    return values
  }, {})
}

export default function usePlayerFreePlay({
  modelScene,
  selectedObject,
  originalPositions,
  originalGroupPositions,
  cutEnabled,
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
  const cutEngineRef = useRef(null)
  const [isPullApartActive, setIsPullApartActive] = useState(false)

  if (!modelEngineRef.current) {
    modelEngineRef.current = createModelEngine({ buildObjectTree })
  }

  if (!cutEngineRef.current) {
    cutEngineRef.current = createCutEngine()
  }

  const getModelEngine = () => {
    const engine = modelEngineRef.current

    if (modelScene && engine.getScene() !== modelScene) {
      engine.initialize(modelScene, viewerSettings || {})
    }

    return engine
  }

  const getCutTarget = () => selectedObject || modelScene

  const syncCutState = (state) => {
    if (!state?.bounds) return

    cutBoundsRef.current = state.bounds
    setCutRanges?.(state.bounds)
    setCutValues?.(state.values || createNoCutValues(state.bounds))

    const axisState = state.axisState

    if (axisState) {
      setCutAxis(axisState.axis)
      setCutMin(axisState.min)
      setCutMax(axisState.max)
      setCutValue(axisState.value)
    }
  }

  // Selection changes only switch the cut state being edited. Cuts already
  // applied to other objects stay registered and visible.
  useEffect(() => {
    if (!modelScene) return

    const cutEngine = cutEngineRef.current
    const target = getCutTarget()

    if (!target) return

    const state = cutEngine.setTarget(target)
    syncCutState(state)
    cutEngine.apply(modelScene)
  }, [modelScene, selectedObject])

  useEffect(() => {
    if (!modelScene) return

    const cutEngine = cutEngineRef.current
    cutEngine.setEnabled(cutEnabled)
    cutEngine.apply(modelScene)
  }, [modelScene, cutEnabled])

  const ensureCutBounds = () => {
    const cutEngine = cutEngineRef.current
    const target = getCutTarget()

    if (!target) return null

    if (cutEngine.getState().target !== target) {
      syncCutState(cutEngine.setTarget(target))
    }

    const state = cutEngine.getState()
    cutBoundsRef.current = state.bounds

    if (state.bounds) {
      setCutRanges?.(state.bounds)
    }

    return state.bounds
  }

  const applyCutBoundsForAxis = (axis) => {
    const bounds = ensureCutBounds()
    const axisBounds = bounds?.[axis]

    if (!axisBounds) return

    const state = cutEngineRef.current.getState()

    setCutMin(axisBounds.min)
    setCutMax(axisBounds.max)
    setCutValue(state.values?.[axis] ?? axisBounds.max)
  }

  const updateCutAxis = (axis) => {
    const state = cutEngineRef.current.setAxis(axis)
    syncCutState(state)
  }

  const updateCutValue = (axis, value) => {
    ensureCutBounds()

    const cutEngine = cutEngineRef.current
    let state = cutEngine.setAxisValue(axis, value)

    cutEngine.setEnabled(true)
    cutEngine.apply(modelScene)
    setCutEnabled(true)

    state = cutEngine.getState()
    syncCutState(state)
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
    setIsPullApartActive(false)
  }

  const resetMovedObjects = () => {
    getModelEngine().resetMovedObjects()
  }

  const resetModelRotationForCut = () => {
    if (!modelScene) return

    modelScene.rotation.set(0, 0, 0)
    focusTargetRef.current = null
  }

  // Reset only the active object's cut. Other cut targets remain unchanged.
  const resetSection = () => {
    const cutEngine = cutEngineRef.current
    const target = getCutTarget()

    if (!target) return

    const state = cutEngine.reset(target)
    syncCutState(state)
    cutEngine.apply(modelScene)
    resetModelRotationForCut()
  }

  const toggleCutSection = () => {
    const cutEngine = cutEngineRef.current

    if (cutEnabled) {
      const state = cutEngine.clear(modelScene)
      syncCutState(state)
      setCutEnabled(false)
      resetModelRotationForCut()
      return
    }

    cutEngine.setEnabled(true)
    cutEngine.apply(modelScene)
    setCutEnabled(true)
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

  const resetVisualState = () => {
    resetParts()
    resetMovedObjects()
    resetModelRotationForCut()
    showAllObjects()

    const cutEngine = cutEngineRef.current
    cutEngine.clear(modelScene)
    setCutEnabled(false)
  }

  const resetAllTransforms = () => {
    resetVisualState()
  }

  const applySavedPullApart = (pullApartState, targetObject) => {
    if (!pullApartState?.enabled || !modelScene) return false

    const didPullApart = getModelEngine().pullApart(targetObject || null, {
      mode: "hierarchy",
      strength: targetObject ? 0.28 : 0.18,
      animationDuration: 450,
      hideOutsideSelection: true,
    })

    setIsPullApartActive(Boolean(didPullApart))
    return didPullApart
  }

  const applySavedCuts = (savedCuts = []) => {
    const cutEngine = cutEngineRef.current

    cutEngine.clear(modelScene)

    const validCuts = savedCuts.filter(
      (entry) => entry?.cutState?.enabled && entry?.targetObject,
    )

    if (!modelScene || validCuts.length === 0) {
      setCutEnabled(false)
      return false
    }

    validCuts.forEach(({ cutState, targetObject }) => {
      let state = cutEngine.setTarget(targetObject)
      const nextValues = createCutValuesFromPercentages(
        cutState.percentages,
        state.bounds,
        cutState.values,
      )

      cutEngine.setValues(nextValues)
    })

    cutEngine.setEnabled(true)
    cutEngine.apply(modelScene)
    setCutEnabled(true)

    const preferredTarget = selectedObject || validCuts[0]?.targetObject || modelScene
    const activeState = cutEngine.setTarget(preferredTarget)
    syncCutState(activeState)

    return true
  }

  const applySavedCut = (cutState, targetObject) =>
    applySavedCuts([{ cutState, targetObject }])

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
    resetVisualState,
    resetAllTransforms,
    applySavedPullApart,
    applySavedCut,
    applySavedCuts,
  }
}
