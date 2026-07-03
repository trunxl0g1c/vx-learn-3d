import { createSceneBounds, getCutStateForAxis } from "../../../engine/model"
import {
  hideObject,
  showAllObjectsInScene,
  soloObject,
} from "../../../engine/selection"

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
  setCutEnabled,
  setSelectedObject,
  setOutlineObjects,
  focusTargetRef,
}) {
  const applyCutBoundsForAxis = (axis) => {
    const cutState = getCutStateForAxis(cutBoundsRef.current, axis)

    if (!cutState) return

    setCutMin(cutState.min)
    setCutMax(cutState.max)
    setCutValue(cutState.value)
  }

  const updateCutAxis = (axis) => {
    setCutAxis(axis)

    if (!cutBoundsRef.current && modelScene) {
      cutBoundsRef.current = createSceneBounds(modelScene)
    }

    applyCutBoundsForAxis(axis)
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
    if (!modelScene) return

    if (!cutBoundsRef.current) {
      cutBoundsRef.current = createSceneBounds(modelScene)
    }

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
