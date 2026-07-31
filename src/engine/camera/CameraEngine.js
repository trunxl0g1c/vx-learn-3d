import * as THREE from "three"
import {
  applyCameraFocusConstraints,
  cloneCameraFocusTarget,
  createCameraFocusTargetFromBox,
  createCameraState,
  createDefaultCameraTarget,
  createFocusTargetFromObject,
  createFocusTargetFromScene,
} from "./CameraFocusUtils"

function applyFocusTarget(focusTarget, camera, controls) {
  if (!focusTarget) return null

  applyCameraFocusConstraints(focusTarget, camera, controls)

  if (camera?.position && focusTarget.cameraPosition) {
    camera.position.copy(focusTarget.cameraPosition)
  }

  if (camera?.up && focusTarget.cameraUp) {
    camera.up.copy(focusTarget.cameraUp).normalize()
  }

  if (Number.isFinite(Number(focusTarget.zoom))) {
    camera.zoom = Number(focusTarget.zoom)
  }

  if (Number.isFinite(Number(focusTarget.fov)) && "fov" in camera) {
    camera.fov = Number(focusTarget.fov)
  }

  camera?.updateProjectionMatrix?.()

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
  let homeState = initialState.homeState || null

  const getState = () => ({
    camera,
    controls,
    scene,
    focusTarget: lastFocusTarget,
    savedState,
    homeState,
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
      const focusTarget = createFocusTargetFromScene(targetScene, {
        ...options,
        camera: options.camera || camera,
      })
      return setFocusTarget(focusTarget, options)
    },

    focusBox(box, options = {}) {
      const focusTarget = createCameraFocusTargetFromBox(box, options)
      return setFocusTarget(focusTarget, options)
    },

    setViewDirection(direction, options = {}) {
      const activeCamera = options.camera || camera
      const activeControls = options.controls || controls

      if (!activeCamera?.position || !activeControls?.target) return null

      const target = options.target?.clone?.() || activeControls.target.clone()
      const nextDirection = direction?.clone?.() || new THREE.Vector3(
        direction?.x ?? 0,
        direction?.y ?? 0,
        direction?.z ?? 0,
      )

      if (nextDirection.lengthSq() === 0) return null

      const currentDistance = activeCamera.position.distanceTo(target)
      const requestedDistance = Number(options.distance)
      const distance = Number.isFinite(requestedDistance) && requestedDistance > 0
        ? requestedDistance
        : Math.max(currentDistance, Number(options.minimumDistance) || 0.1)

      if (options.up && activeCamera.up) {
        activeCamera.up.copy(options.up)
      }

      activeCamera.updateProjectionMatrix?.()

      const focusTarget = {
        cameraPosition: target
          .clone()
          .add(nextDirection.normalize().multiplyScalar(distance)),
        target,
      }

      return setFocusTarget(focusTarget, options)
    },

    reset(options = {}) {
      const focusTarget = scene
        ? createFocusTargetFromScene(scene, {
            ...options,
            camera: options.camera || camera,
          })
        : createDefaultCameraTarget()

      return setFocusTarget(focusTarget, options)
    },


    saveHomeView(nextHomeState = null, options = {}) {
      homeState = cloneCameraFocusTarget(nextHomeState)

      if (!homeState && scene) {
        homeState = createFocusTargetFromScene(scene, {
          ...options,
          camera: options.camera || camera,
          distanceMultiplier: options.distanceMultiplier ?? 1.7,
          minimumDistance: options.minimumDistance ?? 1.1,
        })
      }

      if (!homeState) {
        homeState = createCameraState(camera, controls)
      }

      return cloneCameraFocusTarget(homeState)
    },

    hasHomeView() {
      return Boolean(homeState)
    },

    goHome(options = {}) {
      if (!homeState && options.recompute !== false && scene) {
        this.saveHomeView(null, options)
      }

      if (!homeState) return null

      return setFocusTarget(cloneCameraFocusTarget(homeState), options)
    },

    saveState() {
      savedState = createCameraState(camera, controls)
      return savedState
    },

    restoreState(options = {}) {
      if (!savedState) return null

      return setFocusTarget(cloneCameraFocusTarget(savedState), options)
    },

    clear() {
      lastFocusTarget = null
      return getState()
    },

    resetState() {
      lastFocusTarget = null
      savedState = null
      homeState = null
      return getState()
    },

    dispose() {
      camera = null
      controls = null
      scene = null
      lastFocusTarget = null
      savedState = null
      homeState = null

      return getState()
    },
  }
}

export default createCameraEngine
