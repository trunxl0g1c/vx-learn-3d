import { useCallback, useEffect, useRef } from "react"
import {
  createCutEngine,
  createNoCutValuesFromBounds,
  getCutAxisState,
} from "../engine/cut"

function createComparableCutHistorySnapshot(snapshot) {
  const engineState = snapshot?.engineState || {};

  return {
    cutAllObjects: Boolean(snapshot?.cutAllObjects),
    enabled: Boolean(engineState.enabled),
    axis: engineState.axis || "x",
    targetObjectUuid: engineState.targetObjectUuid || null,
    targetStates: (engineState.targetStates || []).map((state) => ({
      targetObjectUuid: state?.targetObjectUuid || null,
      enabled: Boolean(state?.enabled),
      values: state?.values || {},
    })),
  };
}

function areCutHistorySnapshotsEqual(a, b) {
  return (
    JSON.stringify(createComparableCutHistorySnapshot(a)) ===
    JSON.stringify(createComparableCutHistorySnapshot(b))
  );
}
// Bounds (SceneCanvas.jsx's <Bounds fit clip margin={1.2}>, maxDuration
// defaults to 1000ms) animates the camera into its framed position once
// this model mounts. Hiding the loading overlay immediately would expose
// that camera swoop mid-flight — this delay lets it visually settle first
// (its damped-exponential ease is ~97.5% complete by 700ms of a 1000ms max).
const CAMERA_FIT_SETTLE_DELAY_MS = 700

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

function hasActiveCutValues(values = {}, bounds = {}) {
  return ["x", "y", "z"].some((axis) => {
    const max = Number(bounds?.[axis]?.max)
    const value = Number(values?.[axis])

    return Number.isFinite(max) && Number.isFinite(value)
      ? value < max - 0.000001
      : false
  })
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
  historyEngine,
}) {
  const cutEngineRef = useRef(null)

  if (!cutEngineRef.current) {
    cutEngineRef.current = vxEngine?.cut || createCutEngine()
  }

  // Keep the Cut scope on the existing engine instance instead of adding a
  // new React Hook. This preserves the Hook order during Vite Fast Refresh
  // and avoids ViewerPage crashing when this module is hot-reloaded.
  if (typeof cutEngineRef.current.__vxCutAllObjects !== "boolean") {
    cutEngineRef.current.__vxCutAllObjects = true
  }

  const cutAllObjects = cutEngineRef.current.__vxCutAllObjects
  const cutTarget = cutAllObjects ? modelScene : selectedObject
  const cutTargetAvailable = Boolean(cutTarget)

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

  const captureCutHistorySnapshot = useCallback(() => ({
    engineState: cutEngineRef.current.getState(),
    cutAllObjects: Boolean(cutEngineRef.current.__vxCutAllObjects),
  }), [])

  const applyCutHistorySnapshot = useCallback(
    (snapshot) => {
      if (!snapshot?.engineState) return

      const cutEngine = cutEngineRef.current
      cutEngine.__vxCutAllObjects = Boolean(snapshot.cutAllObjects)
      const state = cutEngine.restoreState(snapshot.engineState, modelScene)

      setCutEnabled(Boolean(state.enabled))
      syncStateToReact(state)
    },
    [modelScene, setCutEnabled, syncStateToReact],
  )

  const recordCutHistory = useCallback(
    (label, before, mergeKey = null, mergeWindowMs = 0) => {
      historyEngine?.recordSnapshot?.({
        label,
        before,
        after: captureCutHistorySnapshot(),
        apply: applyCutHistorySnapshot,
        equals: areCutHistorySnapshotsEqual,
        mergeKey,
        mergeWindowMs,
      })
    },
    [applyCutHistorySnapshot, captureCutHistorySnapshot, historyEngine],
  )

  // Each target owns an independent Cut state. Switching selection only
  // changes the state shown by the panel; it never copies or deletes the
  // values stored by another object or by the whole-scene target.
  useEffect(() => {
    const cutEngine = cutEngineRef.current

    if (!modelScene) return

    if (!cutTarget) {
      cutEngine.apply(modelScene)
      return
    }

    let state = cutEngine.setTarget(cutTarget)

    // A target that already has stored Cut values becomes active again when
    // the user returns to it while the Cut tool is enabled.
    if (cutEnabled && hasActiveCutValues(state.values, state.bounds)) {
      state = cutEngine.setTargetEnabled(true, cutTarget)
    }

    syncStateToReact(state)
    cutEngine.apply(modelScene)
  }, [cutEnabled, modelScene, cutTarget, syncStateToReact])

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
      const before = captureCutHistorySnapshot()
      const cutEngine = cutEngineRef.current
      const state = cutEngine.setAxis(axis)

      syncLegacyAxisState({
        state,
        setCutAxis,
        setCutMin,
        setCutMax,
        setCutValue,
      })
      recordCutHistory("Change cut axis", before)
    },
    [
      captureCutHistorySnapshot,
      recordCutHistory,
      setCutAxis,
      setCutMin,
      setCutMax,
      setCutValue,
    ],
  )

  const updateCutValue = useCallback(
    (axis, nextValue) => {
      if (!cutTarget) return

      const before = captureCutHistorySnapshot()
      const cutEngine = cutEngineRef.current
      const previousState = cutEngine.setTarget(cutTarget)
      const nextValues = {
        ...(previousState.values || createNoCutValuesFromBounds(previousState.bounds)),
        [axis]: nextValue,
      }

      // Update only the active target. Other objects and the whole-scene
      // target keep their own values inside CutEngine.
      cutEngine.setTarget(cutTarget)
      let state = cutEngine.setValues(nextValues)

      if (!cutEnabled) {
        cutEngine.setEnabled(true)
        setCutEnabled(true)
      }

      cutEngine.apply(modelScene)
      state = cutEngine.getState()
      syncStateToReact(state)
      recordCutHistory(
        "Adjust cut",
        before,
        `cut-values:${cutTarget.uuid || cutTarget.name || "target"}`,
        450,
      )
    },
    [
      captureCutHistorySnapshot,
      cutEnabled,
      cutTarget,
      modelScene,
      recordCutHistory,
      setCutEnabled,
      syncStateToReact,
    ],
  )

  const setCutAllObjects = useCallback(
    (nextValue) => {
      const before = captureCutHistorySnapshot()
      const nextAllObjects = Boolean(nextValue)
      const cutEngine = cutEngineRef.current
      const nextTarget = nextAllObjects ? modelScene : selectedObject

      // Switching scope must not transfer percentages or delete stored values.
      // The scene target and every object target are independent Cut states.
      if (nextAllObjects) {
        cutEngine.getTargetStates().forEach((state) => {
          if (state.target && state.target !== modelScene) {
            cutEngine.setTargetEnabled(false, state.target)
          }
        })
      } else if (modelScene) {
        cutEngine.setTargetEnabled(false, modelScene)
      }

      cutEngine.__vxCutAllObjects = nextAllObjects

      if (!nextTarget) {
        cutEngine.apply(modelScene)
        // Trigger a render so the toggle and target availability update even
        // when there is no selected object in object-only mode.
        setCutValues?.((previous) => ({ ...(previous || {}) }))
        recordCutHistory("Change cut scope", before)
        return
      }

      let nextState = cutEngine.setTarget(nextTarget)
      nextState = cutEngine.setTargetEnabled(
        cutEnabled && hasActiveCutValues(nextState.values, nextState.bounds),
        nextTarget,
      )

      cutEngine.apply(modelScene)
      syncStateToReact(nextState)
      recordCutHistory("Change cut scope", before)
    },
    [
      captureCutHistorySnapshot,
      cutEnabled,
      modelScene,
      recordCutHistory,
      selectedObject,
      setCutValues,
      syncStateToReact,
    ],
  )

  // Reset only the object currently being edited. Other object cuts remain.
  const resetCutValues = useCallback(() => {
    const before = captureCutHistorySnapshot()
    const cutEngine = cutEngineRef.current
    const state = cutEngine.reset(cutTarget)

    syncStateToReact(state)
    cutEngine.apply(modelScene)
    resetModelRotationForCut()
    recordCutHistory("Reset cut", before)
  }, [
    captureCutHistorySnapshot,
    cutTarget,
    modelScene,
    recordCutHistory,
    resetModelRotationForCut,
    syncStateToReact,
  ])

  const toggleCutSection = useCallback(() => {
    const before = captureCutHistorySnapshot()
    const cutEngine = cutEngineRef.current

    if (cutEnabled) {
      // Closing the panel only disables rendering. Target values remain cached
      // and are restored when the user opens Cut again.
      const state = cutEngine.setEnabled(false)
      cutEngine.apply(modelScene)
      syncStateToReact(state)
      setCutEnabled(false)
      resetModelRotationForCut()
      recordCutHistory("Toggle cut", before)
      return
    }

    let state = cutTarget
      ? cutEngine.setTarget(cutTarget)
      : cutEngine.getState()

    if (cutTarget && hasActiveCutValues(state.values, state.bounds)) {
      state = cutEngine.setTargetEnabled(true, cutTarget)
    }

    cutEngine.setEnabled(true)
    cutEngine.apply(modelScene)
    syncStateToReact(state)
    setCutEnabled(true)
    recordCutHistory("Toggle cut", before)
  }, [
    captureCutHistorySnapshot,
    cutEnabled,
    cutTarget,
    modelScene,
    recordCutHistory,
    resetModelRotationForCut,
    setCutEnabled,
    syncStateToReact,
  ])

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
      }, CAMERA_FIT_SETTLE_DELAY_MS)
    },
    [handleModelLoaded, hideLoading, syncStateToReact, updateLoading],
  )

  const getCutStates = useCallback(
    () => cutEngineRef.current?.getTargetStates?.({ enabledOnly: true }) || [],
    [],
  )

  const clearCutSession = useCallback(() => {
    const cutEngine = cutEngineRef.current
    cutEngine.__vxCutAllObjects = true
    let state = cutEngine.clear(modelScene)

    if (modelScene) {
      state = cutEngine.setTarget(modelScene)
    }

    setCutEnabled(false)
    syncStateToReact(state)

    return state
  }, [modelScene, setCutEnabled, syncStateToReact])

  const applySavedCuts = useCallback(
    (savedCuts = [], preferredTarget = null, options = {}) => {
      const cutEngine = cutEngineRef.current
      const hasExplicitEnabled = typeof options?.enabled === "boolean"

      cutEngine.clear(modelScene)

      // Saved values are staged independently from the global Cut switch.
      // A material can therefore keep its own slider values while Cut is OFF,
      // and those values become active again when the user reopens/enables Cut.
      const validCuts = savedCuts.filter(
        (entry) => entry?.cutState && entry?.targetObject,
      )

      if (!modelScene || validCuts.length === 0) {
        cutEngine.__vxCutAllObjects = true
        setCutEnabled(false)

        if (modelScene) {
          syncStateToReact(cutEngine.setTarget(modelScene))
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

      const preferredSavedTarget = validCuts.some(
        (entry) => entry.targetObject === preferredTarget,
      )
        ? preferredTarget
        : null
      const activeTarget = preferredSavedTarget || validCuts[0]?.targetObject || modelScene
      const nextEnabled = hasExplicitEnabled
        ? Boolean(options.enabled)
        : validCuts.some((entry) => entry?.cutState?.enabled)

      cutEngine.__vxCutAllObjects = activeTarget === modelScene
      cutEngine.setEnabled(nextEnabled)
      cutEngine.apply(modelScene)
      setCutEnabled(nextEnabled)

      if (activeTarget) {
        syncStateToReact(cutEngine.setTarget(activeTarget))
      }

      return nextEnabled
    },
    [modelScene, setCutEnabled, syncStateToReact],
  )

  return {
    updateCutAxis,
    updateCutValue,
    resetCutValues,
    cutAllObjects,
    setCutAllObjects,
    cutTargetAvailable,
    cutRanges: cutRanges || createDefaultCutRanges(),
    toggleCutSection,
    handleModelLoadedWithCutBounds,
    cutTarget,
    getCutStates,
    clearCutSession,
    applySavedCuts,
  }
}
