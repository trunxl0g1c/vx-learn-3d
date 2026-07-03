import {
  createCameraFocusTargetFromBox,
  createCameraState,
  createDefaultCameraTarget,
  createFocusTargetFromObject,
  createFocusTargetFromScene,
} from "./CameraFocusUtils"

function applyFocusTarget(focusTarget, camera, controls) {
  if (!focusTarget) return null

  if (camera?.position && focusTarget.cameraPosition) {
    camera.position.copy(focusTarget.cameraPosition)
  }

  if (controls?.target && focusTarget.target) {
    controls.target.copy(focusTarget.target)
    controls.update?.()
  }

  return focusTarget
}

export function createCameraEngine(initialState = {}) {
  let camera = initialState.camera || null
  let controls = initialState.controls || null
  let scene = initialState.scene || null
  let lastFocusTarget = initialState.focusTarget || null
  let savedState = initialState.savedState || null

  const getState = () => ({
    camera,
    controls,
    scene,
    focusTarget: lastFocusTarget,
    savedState,
  })

  const setFocusTarget = (focusTarget, options = {}) => {
    lastFocusTarget = focusTarget || null

    if (options.apply !== false) {
      applyFocusTarget(lastFocusTarget, camera, controls)
    }

    return lastFocusTarget
  }

  return {
    getState,

    setRefs(nextRefs = {}) {
      camera = nextRefs.camera || camera || null
      controls = nextRefs.controls || controls || null
      return getState()
    },

    setCamera(nextCamera) {
      camera = nextCamera || null
      return getState()
    },

    setControls(nextControls) {
      controls = nextControls || null
      return getState()
    },

    setScene(nextScene) {
      scene = nextScene || null
      return getState()
    },

    setFocusTarget,

    focusObject(object, options = {}) {
      const focusTarget = createFocusTargetFromObject(
        object,
        options.camera || camera,
        options.controls || controls,
        options
      )

      return setFocusTarget(focusTarget, options)
    },

    focusScene(targetScene = scene, options = {}) {
      const focusTarget = createFocusTargetFromScene(targetScene, options)
      return setFocusTarget(focusTarget, options)
    },

    focusBox(box, options = {}) {
      const focusTarget = createCameraFocusTargetFromBox(box, options)
      return setFocusTarget(focusTarget, options)
    },

    reset(options = {}) {
      const focusTarget = scene
        ? createFocusTargetFromScene(scene, options)
        : createDefaultCameraTarget()

      return setFocusTarget(focusTarget, options)
    },

    saveState() {
      savedState = createCameraState(camera, controls)
      return savedState
    },

    restoreState(options = {}) {
      if (!savedState) return null

      const focusTarget = {
        cameraPosition: savedState.cameraPosition?.clone?.() || savedState.cameraPosition,
        target: savedState.target?.clone?.() || savedState.target,
      }

      return setFocusTarget(focusTarget, options)
    },

    clear() {
      lastFocusTarget = null
      return getState()
    },

    resetState() {
      lastFocusTarget = null
      savedState = null
      return getState()
    },

    dispose() {
      camera = null
      controls = null
      scene = null
      lastFocusTarget = null
      savedState = null

      return getState()
    },
  }
}

export default createCameraEngine
