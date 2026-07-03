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
  cameraRef,
  controlsRef,
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

  const createCurrentCameraFocusTarget = () => {
    const camera = cameraRef?.current
    const controls = controlsRef?.current

    if (!camera?.position || !controls?.target) return null

    return {
      cameraPosition: camera.position.clone(),
      target: controls.target.clone(),
    }
  }

  const saveCurrentCanvasViewAsHome = (scene) => {
    const focusTarget = createCurrentCameraFocusTarget()

    vxEngine?.camera?.setScene?.(scene)
    vxEngine?.camera?.setRefs?.({
      camera: cameraRef?.current,
      controls: controlsRef?.current,
    })

    if (focusTarget) {
      vxEngine?.camera?.saveHomeView?.(focusTarget)
      return
    }

    vxEngine?.camera?.saveHomeView?.(null, {
      camera: cameraRef?.current,
      distanceMultiplier: 1.7,
      minimumDistance: 1.1,
    })
  }

  const scheduleHomeViewCapture = (scene) => {
    const capture = () => saveCurrentCanvasViewAsHome(scene)

    window.requestAnimationFrame?.(() => {
      window.requestAnimationFrame?.(() => {
        window.requestAnimationFrame?.(capture)
      })
    })

    window.setTimeout?.(capture, 350)
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

    scheduleHomeViewCapture(scene)
  }

  const pullApart = (selectedObject = null) => {
    return getModelEngine().pullApart(selectedObject, {
      distance: selectedObject ? 0.28 : 0.38,
      hideOutsideSelection: true,
    })
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
