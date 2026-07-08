import { createSceneBounds, getCutStateForAxis } from "../../../engine/model"
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
}) {
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
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      const direction = child.position.clone().normalize()

      if (direction.length() === 0) {
        direction
          .set(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          )
          .normalize()
      }

      child.userData.targetPosition = child.position
        .clone()
        .add(direction.multiplyScalar(1.2))
    })
  }

  const resetParts = () => {
    originalPositions.forEach((item) => {
      item.object.userData.targetPosition = item.position.clone()
    })
  }

  const resetMovedObjects = () => {
    originalGroupPositions.forEach((item) => {
      item.object.userData.moveTargetPosition = item.position.clone()
      item.object.userData.moveTargetRotation = item.rotation.clone()
    })
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
  }

  return {
    applyCutBoundsForAxis,
    updateCutAxis,
    updateCutValue,
    pullApart,
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
