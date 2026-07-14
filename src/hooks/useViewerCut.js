import { useCallback, useEffect, useRef } from "react"
import {
  createCutEngine,
  createNoCutValuesFromBounds,
  getCutAxisState,
} from "../engine/cut"

function createDefaultCutRanges() {
  return {
    x: { min: -3, max: 3 },
    y: { min: -3, max: 3 },
    z: { min: -3, max: 3 },
  }
}

function createCutValuesFromPercentages(
  percentages = {},
  bounds = {},
  fallback = {},
) {
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

function syncLegacyAxisState({ state, setCutAxis, setCutMin, setCutMax, setCutValue }) {
  const cutAxisState = getCutAxisState(
    state?.bounds,
    state?.axis,
    state?.values,
  )

  if (!cutAxisState) return

  setCutAxis(cutAxisState.axis)
  setCutMin(cutAxisState.min)
  setCutMax(cutAxisState.max)
  setCutValue(cutAxisState.value)
}

export function useViewerCut({
  vxEngine,
  modelScene,
  selectedObject,
  cutEnabled,
  setCutEnabled,
  cutAxis,
  setCutAxis,
  cutValue,
  setCutValue,
  cutValues,
  setCutValues,
  cutRanges,
  setCutRanges,
  setCutMin,
  setCutMax,
  setTargetRotationY,
  setIsAutoRotating,
  focusTargetRef,
  updateLoading,
  hideLoading,
  handleModelLoaded,
}) {
  const cutEngineRef = useRef(null)

  if (!cutEngineRef.current) {
    cutEngineRef.current = vxEngine?.cut || createCutEngine()
  }

  const cutTarget = selectedObject || modelScene

  const syncStateToReact = useCallback(
    (state) => {
      if (!state?.bounds) return

      const nextRanges = state.bounds || createDefaultCutRanges()
      const nextValues = state.values || createNoCutValuesFromBounds(nextRanges)

      setCutRanges?.(nextRanges)
      setCutValues?.(nextValues)

      syncLegacyAxisState({
        state,
        setCutAxis,
        setCutMin,
        setCutMax,
        setCutValue,
      })
    },
    [setCutAxis, setCutMin, setCutMax, setCutRanges, setCutValue, setCutValues],
  )

  const resetModelRotationForCut = useCallback(() => {
    if (modelScene) {
      modelScene.rotation.set(0, 0, 0)
    }

    setTargetRotationY(0)
    setIsAutoRotating(false)

    if (focusTargetRef?.current) {
      focusTargetRef.current = null
    }
  }, [modelScene, setTargetRotationY, setIsAutoRotating, focusTargetRef])

  // Selection only changes which cut state is being edited. Existing cuts on
  // other objects stay registered and remain visible.
  useEffect(() => {
    const cutEngine = cutEngineRef.current

    if (!modelScene || !cutTarget) return

    const state = cutEngine.setTarget(cutTarget)
    syncStateToReact(state)
    cutEngine.apply(modelScene)
  }, [modelScene, cutTarget, syncStateToReact])

  // Global Cut ON/OFF controls rendering for the complete persistent cut
  // session without replacing the active target state.
  useEffect(() => {
    const cutEngine = cutEngineRef.current

    if (!modelScene) return

    cutEngine.setEnabled(cutEnabled)
    cutEngine.apply(modelScene)
  }, [cutEnabled, modelScene])

  const updateCutAxis = useCallback(
    (axis) => {
      const cutEngine = cutEngineRef.current
      const state = cutEngine.setAxis(axis)

      syncLegacyAxisState({
        state,
        setCutAxis,
        setCutMin,
        setCutMax,
        setCutValue,
      })
    },
    [setCutAxis, setCutMin, setCutMax, setCutValue],
  )

  const updateCutValue = useCallback(
    (axis, nextValue) => {
      const cutEngine = cutEngineRef.current
      let state = cutEngine.setAxisValue(axis, nextValue)

      if (!cutEnabled) {
        cutEngine.setEnabled(true)
        setCutEnabled(true)
      }

      cutEngine.apply(modelScene)
      state = cutEngine.getState()
      syncStateToReact(state)
    },
    [cutEnabled, modelScene, setCutEnabled, syncStateToReact],
  )

  // Reset only the object currently being edited. Other object cuts remain.
  const resetCutValues = useCallback(() => {
    const cutEngine = cutEngineRef.current
    const state = cutEngine.reset(cutTarget)

    syncStateToReact(state)
    cutEngine.apply(modelScene)
    resetModelRotationForCut()
  }, [cutTarget, modelScene, resetModelRotationForCut, syncStateToReact])

  const toggleCutSection = useCallback(() => {
    const cutEngine = cutEngineRef.current

    if (cutEnabled) {
      // Closing Cut mode keeps legacy behavior: clear the complete Cut
      // session. The per-object Reset button only resets the active target.
      const state = cutEngine.clear(modelScene)
      syncStateToReact(state)
      setCutEnabled(false)
      resetModelRotationForCut()
      return
    }

    cutEngine.setEnabled(true)
    cutEngine.apply(modelScene)
    setCutEnabled(true)
  }, [cutEnabled, modelScene, resetModelRotationForCut, setCutEnabled, syncStateToReact])

  const handleModelLoadedWithCutBounds = useCallback(
    (scene) => {
      handleModelLoaded(scene)

      const cutEngine = cutEngineRef.current
      cutEngine.resetState()
      cutEngine.setTarget(scene)
      const state = cutEngine.reset(scene)
      syncStateToReact(state)

      updateLoading?.({
        text: "Preparing scene...",
      })

      setTimeout(() => {
        hideLoading?.()
      }, 700)
    },
    [handleModelLoaded, hideLoading, syncStateToReact, updateLoading],
  )

  const getCutStates = useCallback(
    () => cutEngineRef.current?.getTargetStates?.({ enabledOnly: true }) || [],
    [],
  )

  const clearCutSession = useCallback(() => {
    const cutEngine = cutEngineRef.current
    const state = cutEngine.clear(modelScene)

    setCutEnabled(false)
    syncStateToReact(state)

    return state
  }, [modelScene, setCutEnabled, syncStateToReact])

  const applySavedCuts = useCallback(
    (savedCuts = [], preferredTarget = null) => {
      const cutEngine = cutEngineRef.current

      cutEngine.clear(modelScene)

      const validCuts = savedCuts.filter(
        (entry) => entry?.cutState?.enabled && entry?.targetObject,
      )

      if (!modelScene || validCuts.length === 0) {
        setCutEnabled(false)

        const fallbackTarget = preferredTarget || cutTarget || modelScene

        if (fallbackTarget) {
          syncStateToReact(cutEngine.setTarget(fallbackTarget))
        }

        return false
      }

      validCuts.forEach(({ cutState, targetObject }) => {
        const state = cutEngine.setTarget(targetObject)
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
        preferredTarget || validCuts[0]?.targetObject || cutTarget || modelScene

      if (activeTarget) {
        syncStateToReact(cutEngine.setTarget(activeTarget))
      }

      return true
    },
    [
      cutTarget,
      modelScene,
      setCutEnabled,
      syncStateToReact,
    ],
  )

  return {
    updateCutAxis,
    updateCutValue,
    resetCutValues,
    cutRanges: cutRanges || createDefaultCutRanges(),
    toggleCutSection,
    handleModelLoadedWithCutBounds,
    cutTarget,
    getCutStates,
    clearCutSession,
    applySavedCuts,
  }
}
