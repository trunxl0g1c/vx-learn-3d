import { useCallback, useEffect, useRef } from "react"
import { createCutEngine, getCutAxisState } from "../engine/cut"

export function useViewerCut({
  vxEngine,
  modelScene,
  cutEnabled,
  setCutEnabled,
  cutAxis,
  setCutAxis,
  cutValue,
  setCutValue,
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

  const syncAxisStateToReact = useCallback(
    (state) => {
      const cutAxisState = getCutAxisState(state?.bounds, state?.axis)

      if (!cutAxisState) return

      setCutAxis(cutAxisState.axis)
      setCutMin(cutAxisState.min)
      setCutMax(cutAxisState.max)
      setCutValue(cutAxisState.value)
    },
    [setCutAxis, setCutMin, setCutMax, setCutValue]
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
    cutEngine.setAxis(cutAxis)
    cutEngine.setValue(cutValue)
    cutEngine.apply(modelScene)
  }, [modelScene, cutEnabled, cutAxis, cutValue])

  const updateCutAxis = useCallback(
    (axis) => {
      const cutEngine = cutEngineRef.current
      const state = cutEngine.setAxis(axis)
      const cutAxisState = getCutAxisState(state.bounds, state.axis)

      setCutAxis(axis)

      if (!cutAxisState) return

      setCutMin(cutAxisState.min)
      setCutMax(cutAxisState.max)
      setCutValue(cutAxisState.value)
    },
    [setCutAxis, setCutMin, setCutMax, setCutValue]
  )

  const toggleCutSection = useCallback(() => {
    const cutEngine = cutEngineRef.current

    if (modelScene) {
      const state = cutEngine.reset(modelScene)
      syncAxisStateToReact(state)
      resetModelRotationForCut()
    }

    setCutEnabled((prev) => !prev)
  }, [modelScene, resetModelRotationForCut, setCutEnabled, syncAxisStateToReact])

  const handleModelLoadedWithCutBounds = useCallback(
    (scene) => {
      handleModelLoaded(scene)

      const cutEngine = cutEngineRef.current
      const state = cutEngine.reset(scene)
      syncAxisStateToReact(state)

      updateLoading?.({
        text: "Preparing scene...",
      })

      setTimeout(() => {
        hideLoading?.()
      }, 700)
    },
    [handleModelLoaded, hideLoading, syncAxisStateToReact, updateLoading]
  )

  return {
    updateCutAxis,
    toggleCutSection,
    handleModelLoadedWithCutBounds,
  }
}
