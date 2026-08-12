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

function hasActiveCutValues(values = {}, bounds = {}) {
  return ["x", "y", "z"].some((axis) => {
    const max = Number(bounds?.[axis]?.max)
    const value = Number(values?.[axis])

    return Number.isFinite(max) && Number.isFinite(value)
      ? value < max - 0.000001
      : false
  })
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
}) {
  const modelEngineRef = useRef(null)
  const cutEngineRef = useRef(null)
  const pullApartSessionRef = useRef(null)
  const [isPullApartActive, setIsPullApartActive] = useState(false)
  const [cutAllObjects, setCutAllObjectsState] = useState(true)

  if (!modelEngineRef.current) {
    modelEngineRef.current = createModelEngine({ buildObjectTree })
  }

  if (!cutEngineRef.current) {
    cutEngineRef.current = createCutEngine()
  }

  useEffect(() => {
    const engine = modelEngineRef.current

    pullApartSessionRef.current = null
    setIsPullApartActive(false)

    if (!modelScene) {
      engine.setScene?.(null)
      return
    }

    engine.setScene?.(modelScene)
    engine.setOriginalTransforms?.({
      positions: originalPositions,
      groupPositions: originalGroupPositions,
    })
  }, [modelScene, originalPositions, originalGroupPositions])

  const getModelEngine = () => {
    const engine = modelEngineRef.current

    if (modelScene && engine.getScene() !== modelScene) {
      engine.setScene?.(modelScene)
      engine.setOriginalTransforms?.({
        positions: originalPositions,
        groupPositions: originalGroupPositions,
      })
    }

    return engine
  }

  const getCutTarget = () => (cutAllObjects ? modelScene : selectedObject)
  const cutTargetAvailable = Boolean(getCutTarget())

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

  // Each object and the whole-scene scope keep independent Cut values.
  // Selecting another object only changes which cached state is edited.
  useEffect(() => {
    if (!modelScene) return

    const cutEngine = cutEngineRef.current
    const target = getCutTarget()

    if (!target) {
      cutEngine.apply(modelScene)
      return
    }

    let state = cutEngine.setTarget(target)

    if (cutEnabled && hasActiveCutValues(state.values, state.bounds)) {
      state = cutEngine.setTargetEnabled(true, target)
    }

    syncCutState(state)
    cutEngine.apply(modelScene)
  }, [cutAllObjects, cutEnabled, modelScene, selectedObject])

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
    const target = getCutTarget()
    if (!target) return

    const cutEngine = cutEngineRef.current
    const previousState = cutEngine.setTarget(target)
    const nextValues = {
      ...(previousState.values || createNoCutValues(previousState.bounds)),
      [axis]: value,
    }

    cutEngine.setTarget(target)
    let state = cutEngine.setValues(nextValues)

    cutEngine.setEnabled(true)
    cutEngine.apply(modelScene)
    setCutEnabled(true)

    state = cutEngine.getState()
    syncCutState(state)
  }

  const setCutAllObjects = (nextValue) => {
    const nextAllObjects = Boolean(nextValue)
    const cutEngine = cutEngineRef.current
    const nextTarget = nextAllObjects ? modelScene : selectedObject

    // Scope switching preserves every target's values. Only the previous
    // scope is temporarily disabled to avoid stacking whole-scene and
    // per-object clipping planes unintentionally.
    if (nextAllObjects) {
      cutEngine.getTargetStates().forEach((state) => {
        if (state.target && state.target !== modelScene) {
          cutEngine.setTargetEnabled(false, state.target)
        }
      })
    } else if (modelScene) {
      cutEngine.setTargetEnabled(false, modelScene)
    }

    setCutAllObjectsState(nextAllObjects)

    if (!nextTarget) {
      cutEngine.apply(modelScene)
      return
    }

    let nextState = cutEngine.setTarget(nextTarget)
    nextState = cutEngine.setTargetEnabled(
      cutEnabled && hasActiveCutValues(nextState.values, nextState.bounds),
      nextTarget,
    )

    cutEngine.apply(modelScene)
    syncCutState(nextState)
  }

  const resetActivePullApart = ({ animationDuration = 450 } = {}) => {
    const session = pullApartSessionRef.current

    if (!session) {
      setIsPullApartActive(false)
      return 0
    }

    const resetCount = getModelEngine().resetPullApartSession?.(session, {
      animationDuration,
    }) || 0

    pullApartSessionRef.current = null
    setIsPullApartActive(false)

    return resetCount
  }

  const pullApart = ({
    targetObject = selectedObject || null,
    allowSceneFallback = true,
  } = {}) => {
    if (!modelScene) return false

    if (isPullApartActive || pullApartSessionRef.current) {
      resetActivePullApart()
      return false
    }

    if (!targetObject && !allowSceneFallback) return false

    const session = getModelEngine().pullApart(targetObject, {
      mode: "hierarchy",
      strength: targetObject ? 0.28 : 0.18,
      animationDuration: 450,
      hideOutsideSelection: Boolean(targetObject),
      returnSession: true,
      useCurrentPositions: true,
    })

    if (!session) return false

    pullApartSessionRef.current = session
    setIsPullApartActive(true)

    return true
  }

  const resetParts = ({ animationDuration = 420 } = {}) => {
    getModelEngine().resetParts({ animationDuration })
    pullApartSessionRef.current = null
    setIsPullApartActive(false)
  }

  const resetMovedObjects = ({ animationDuration = 560 } = {}) => {
    const engine = getModelEngine()

    engine.setOriginalTransforms?.({
      positions: originalPositions,
      groupPositions: originalGroupPositions,
    })

    const animatedObjectCount = engine.resetMovedObjects?.({
      animationDuration,
    }) || 0

    pullApartSessionRef.current = null
    setIsPullApartActive(false)
    modelScene?.updateMatrixWorld?.(true)

    return animatedObjectCount
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
      const state = cutEngine.setEnabled(false)
      cutEngine.apply(modelScene)
      syncCutState(state)
      setCutEnabled(false)
      resetModelRotationForCut()
      return
    }

    const target = getCutTarget()
    let state = target ? cutEngine.setTarget(target) : cutEngine.getState()

    if (target && hasActiveCutValues(state.values, state.bounds)) {
      state = cutEngine.setTargetEnabled(true, target)
    }

    cutEngine.setEnabled(true)
    cutEngine.apply(modelScene)
    syncCutState(state)
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

  const resetSavedPresentationState = ({
    preserveTransforms = false,
    preserveVisibility = false,
    animationDuration = 420,
  } = {}) => {
    if (preserveTransforms) {
      resetActivePullApart({ animationDuration: 0 })
    } else {
      resetParts({ animationDuration })
    }

    if (!preserveVisibility) {
      showAllObjects()
    }

    const cutEngine = cutEngineRef.current
    cutEngine.clear(modelScene)
    setCutAllObjectsState(true)
    setCutEnabled(false)
  }

  const resetVisualState = ({ animationDuration = 560 } = {}) => {
    resetMovedObjects({ animationDuration })
    resetModelRotationForCut()
    // Keep mesh-level pull-apart resets on the same timing as group resets.
    // Procedure playback passes 0 here so no stale targetPosition animation can
    // continue after the authored Start transform has been applied.
    resetSavedPresentationState({ animationDuration })
  }

  const resetAllTransforms = () => {
    resetVisualState()
  }

  const applySavedPullApart = (pullApartState, targetObject) => {
    if (!pullApartState?.enabled || !modelScene) return false

    if (pullApartSessionRef.current) {
      resetActivePullApart({ animationDuration: 0 })
    }

    const session = getModelEngine().pullApart(targetObject || null, {
      mode: "hierarchy",
      strength: targetObject ? 0.28 : 0.18,
      animationDuration: 450,
      hideOutsideSelection: Boolean(targetObject),
      returnSession: true,
      useCurrentPositions: true,
    })

    pullApartSessionRef.current = session || null
    setIsPullApartActive(Boolean(session))
    return Boolean(session)
  }

  const applySavedCuts = (savedCuts = [], preferredTarget = null) => {
    const cutEngine = cutEngineRef.current

    cutEngine.clear(modelScene)

    const validCuts = savedCuts.filter(
      (entry) => entry?.cutState?.enabled && entry?.targetObject,
    )

    if (!modelScene || validCuts.length === 0) {
      setCutAllObjectsState(true)
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

    const activeTarget =
      preferredTarget || selectedObject || validCuts[0]?.targetObject || modelScene
    const activeState = cutEngine.setTarget(activeTarget)

    setCutAllObjectsState(activeTarget === modelScene)
    syncCutState(activeState)

    return true
  }

  const applySavedCut = (cutState, targetObject) =>
    applySavedCuts([{ cutState, targetObject }])

  return {
    applyCutBoundsForAxis,
    updateCutAxis,
    updateCutValue,
    cutAllObjects,
    setCutAllObjects,
    cutTargetAvailable,
    pullApart,
    resetActivePullApart,
    isPullApartActive,
    resetParts,
    resetMovedObjects,
    resetModelRotationForCut,
    resetSection,
    toggleCutSection,
    hideSelectedObject,
    soloSelectedObject,
    showAllObjects,
    resetSavedPresentationState,
    resetVisualState,
    resetAllTransforms,
    applySavedPullApart,
    applySavedCut,
    applySavedCuts,
  }
}
