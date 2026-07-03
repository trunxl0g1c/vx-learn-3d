import { useRef } from 'react'
import { buildObjectTree } from '../utils/objectTreeUtils'
import { createModelEngine, getAxisMidValue } from '../engine/model'

export function useModelManager({
  vxEngine,
  modelScene,
  setModelScene,
  setObjectList,
  setCutMin,
  setCutMax,
  setCutX,
  setMarkerScale,
  viewerSettings,
  setSelectedObject,
  setOutlineObjects,
  setSelectedObjectName,
  setTargetRotationY,
  setIsAutoRotating,
  focusTargetRef,
  selectionEngine,
}) {
  const modelEngineRef = useRef(null)

  if (!modelEngineRef.current) {
    modelEngineRef.current =
      vxEngine?.model ||
      createModelEngine({
        buildObjectTree,
      })
  }

  const getModelEngine = () => {
    const engine = vxEngine?.model || modelEngineRef.current

    if (modelScene && engine.getScene() !== modelScene) {
      engine.setScene(modelScene)
    }

    return engine
  }

  const clearSelectionState = () => {
    setSelectedObject(null)
    setOutlineObjects([])
    setSelectedObjectName('')
  }

  const handleModelLoaded = (scene) => {
    const modelEngine = getModelEngine()
    const state =
      vxEngine?.initializeModel?.(scene, viewerSettings) ||
      modelEngine.initialize(scene, viewerSettings, {
        selectionEngine,
      })

    setModelScene(scene)
    setObjectList(state.objectList)
    setMarkerScale(state.markerScale)

    const xBounds = state.boundsMap?.x

    if (xBounds) {
      setCutMin(xBounds.min)
      setCutMax(xBounds.max)
      setCutX(getAxisMidValue(state.boundsMap, 'x'))
    }
  }

  const pullApart = () => {
    getModelEngine().pullApart()
  }

  const resetParts = () => {
    getModelEngine().resetParts()
  }

  const resetMovedObjects = () => {
    getModelEngine().resetMovedObjects()
  }

  const resetModelRotationForCut = () => {
    getModelEngine().resetRotation()
    setTargetRotationY(0)
    setIsAutoRotating(false)
    focusTargetRef.current = null
  }

  const resetSection = () => {
    if (!modelScene) return

    const boundsMap = getModelEngine().createBoundsMap()
    setCutX(getAxisMidValue(boundsMap, 'x'))
    resetModelRotationForCut()
  }

  const toggleCutSection = (setCutEnabled) => {
    resetSection()
    setCutEnabled((prev) => !prev)
  }

  const soloSelectedObject = (selectedObject) => {
    const success = getModelEngine().soloObject(selectedObject)

    if (!success) {
      alert('Select an object first')
    }
  }

  const hideSelectedObject = (selectedObject) => {
    const success = getModelEngine().hideObject(selectedObject)

    if (!success) {
      alert('Select an object first')
      return
    }

    clearSelectionState()
  }

  const showAllObjects = () => {
    getModelEngine().showAllObjects()
  }

  const hideAllObjects = () => {
    getModelEngine().hideAllObjects()
    clearSelectionState()
  }

  const resetAllTransforms = () => {
    resetParts()
    resetMovedObjects()
    resetModelRotationForCut()
  }

  return {
    handleModelLoaded,
    pullApart,
    resetParts,
    resetMovedObjects,
    resetModelRotationForCut,
    resetSection,
    toggleCutSection,
    soloSelectedObject,
    hideSelectedObject,
    showAllObjects,
    hideAllObjects,
    resetAllTransforms,
  }
}
