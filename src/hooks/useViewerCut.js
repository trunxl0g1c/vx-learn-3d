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

function syncLegacyAxisState({ state, setCutAxis, setCutMin, setCutMax, setCutValue }) {
  const cutAxisState = getCutAxisState(
    state?.bounds,
    state?.axis,
    state?.values
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
    [setCutAxis, setCutMin, setCutMax, setCutRanges, setCutValue, setCutValues]
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

  useEffect(() => {
    const cutEngine = cutEngineRef.current

    cutEngine.setEnabled(cutEnabled)

    if (cutValues) {
      cutEngine.setValues(cutValues)
    } else {
      cutEngine.setAxis(cutAxis)
      cutEngine.setValue(cutValue)
    }

    cutEngine.apply(modelScene)
  }, [modelScene, cutEnabled, cutAxis, cutValue, cutValues])

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
    [setCutAxis, setCutMin, setCutMax, setCutValue]
  )

  const updateCutValue = useCallback(
    (axis, nextValue) => {
      const cutEngine = cutEngineRef.current
      const state = cutEngine.setAxisValue(axis, nextValue)

      setCutValues?.(state.values)
      syncLegacyAxisState({
        state,
        setCutAxis,
        setCutMin,
        setCutMax,
        setCutValue,
      })

      if (!cutEnabled) {
        setCutEnabled(true)
      }
    },
    [cutEnabled, setCutAxis, setCutEnabled, setCutMax, setCutMin, setCutValue, setCutValues]
  )

  const resetCutValues = useCallback(() => {
    const cutEngine = cutEngineRef.current
    const state = cutEngine.reset(modelScene)

    syncStateToReact(state)
    cutEngine.apply(modelScene)
    resetModelRotationForCut()
  }, [modelScene, resetModelRotationForCut, syncStateToReact])

  const toggleCutSection = useCallback(() => {
    const cutEngine = cutEngineRef.current

    if (modelScene) {
      const state = cutEngine.reset(modelScene)
      syncStateToReact(state)
      resetModelRotationForCut()
    }

    setCutEnabled((prev) => !prev)
  }, [modelScene, resetModelRotationForCut, setCutEnabled, syncStateToReact])

  const handleModelLoadedWithCutBounds = useCallback(
    (scene) => {
      handleModelLoaded(scene)

      const cutEngine = cutEngineRef.current
      const state = cutEngine.reset(scene)
      syncStateToReact(state)

      updateLoading?.({
        text: "Preparing scene...",
      })

      setTimeout(() => {
        hideLoading?.()
      }, 700)
    },
    [handleModelLoaded, hideLoading, syncStateToReact, updateLoading]
  )

  return {
    updateCutAxis,
    updateCutValue,
    resetCutValues,
    cutRanges: cutRanges || createDefaultCutRanges(),
    toggleCutSection,
    handleModelLoadedWithCutBounds,
  }
}
