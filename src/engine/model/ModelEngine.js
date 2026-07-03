import * as THREE from "three"

export function computeModelBounds(scene) {
  if (!scene) return null

  scene.updateMatrixWorld(true)
  return new THREE.Box3().setFromObject(scene)
}

export function createModelBoundsMap(scene) {
  const box = computeModelBounds(scene)

  if (!box) return null

  return {
    x: { min: box.min.x, max: box.max.x },
    y: { min: box.min.y, max: box.max.y },
    z: { min: box.min.z, max: box.max.z },
  }
}

export function computeMarkerScale(scene) {
  const box = computeModelBounds(scene)

  if (!box) return 0.08

  const size = new THREE.Vector3()
  box.getSize(size)

  const maxSize = Math.max(size.x, size.y, size.z)
  const calculatedMarkerScale = maxSize * 0.015

  return Math.min(Math.max(calculatedMarkerScale, 0.03), 0.15)
}

export function getAxisMidValue(boundsMap, axis = "x") {
  const bounds = boundsMap?.[axis]

  if (!bounds) return 0

  return (bounds.min + bounds.max) / 2
}

export function createModelEngine(options = {}) {
  const {
    buildObjectTree,
    ignoreObjectTypes = ["Bone"],
  } = options

  let scene = null
  let originalPositions = []
  let originalGroupPositions = []
  let lastState = null

  const getScene = () => scene

  const getOriginalPositions = () => originalPositions
  const getOriginalGroupPositions = () => originalGroupPositions

  const setScene = (nextScene) => {
    scene = nextScene || null
    return scene
  }

  const applyViewerMaterialSettings = (viewerSettings = {}) => {
    if (!scene) return

    scene.traverse((child) => {
      if (!child.isMesh || !child.material) return

      child.material.envMapIntensity = viewerSettings.envIntensity ?? 3
      child.material.needsUpdate = true
    })
  }

  const createObjectList = () => {
    if (!scene || typeof buildObjectTree !== "function") return []

    return scene.children
      .filter((child) => !ignoreObjectTypes.includes(child.type))
      .map((child) => buildObjectTree(child, 0))
  }

  const captureOriginalTransforms = () => {
    originalPositions = []
    originalGroupPositions = []

    if (!scene) {
      return {
        originalPositions,
        originalGroupPositions,
      }
    }

    scene.traverse((child) => {
      originalGroupPositions.push({
        object: child,
        position: child.position.clone(),
        rotation: child.rotation.clone(),
      })

      if (!child.isMesh) return

      if (child.material) {
        child.material = child.material.clone()
        child.userData.originalMaterial = child.material
      }

      originalPositions.push({
        object: child,
        position: child.position.clone(),
      })
    })

    return {
      originalPositions,
      originalGroupPositions,
    }
  }

  const registerIntegrations = (integrations = {}, state = lastState) => {
    if (!state) return null

    integrations.selectionEngine?.registerModelState?.(state)
    integrations.cutEngine?.setBounds?.(state.boundsMap)
    integrations.modelEngine?.registerModelState?.(state)

    return state
  }

  const initialize = (nextScene, viewerSettings = {}, integrations = {}) => {
    setScene(nextScene)
    applyViewerMaterialSettings(viewerSettings)

    const boundsMap = createModelBoundsMap(scene)
    const markerScale = computeMarkerScale(scene)
    const objectList = createObjectList()
    const transformState = captureOriginalTransforms()

    lastState = {
      scene,
      boundsMap,
      markerScale,
      objectList,
      originalPositions: transformState.originalPositions,
      originalGroupPositions: transformState.originalGroupPositions,
    }

    registerIntegrations(integrations, lastState)

    return lastState
  }

  const pullApart = (distance = 2.4) => {
    if (!scene) return

    scene.traverse((child) => {
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
        .add(direction.multiplyScalar(distance))
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

  const resetRotation = () => {
    if (!scene) return
    scene.rotation.set(0, 0, 0)
  }

  const showAllObjects = () => {
    if (!scene) return

    scene.traverse((child) => {
      child.visible = true
    })
  }

  const hideAllObjects = () => {
    if (!scene) return

    scene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })
  }

  const hideObject = (object) => {
    if (!object) return false

    object.visible = false
    object.traverse?.((child) => {
      child.visible = false
    })

    return true
  }

  const soloObject = (object) => {
    if (!object || !scene) return false

    scene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    object.traverse?.((child) => {
      if (child.isMesh) child.visible = true
    })

    return true
  }

  const resetTransforms = () => {
    resetParts()
    resetMovedObjects()
    resetRotation()
  }

  const clearState = () => {
    scene = null
    originalPositions = []
    originalGroupPositions = []
    lastState = null

    return {
      scene,
      originalPositions,
      originalGroupPositions,
      lastState,
    }
  }

  const dispose = (options = {}) => {
    if (options.disposeThreeObjects && scene) {
      scene.traverse((child) => {
        child.geometry?.dispose?.()

        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material?.dispose?.())
        } else {
          child.material?.dispose?.()
        }
      })
    }

    return clearState()
  }

  return {
    getScene,
    setScene,
    initialize,
    createObjectList,
    applyViewerMaterialSettings,
    captureOriginalTransforms,
    computeBounds: () => computeModelBounds(scene),
    createBoundsMap: () => createModelBoundsMap(scene),
    computeMarkerScale: () => computeMarkerScale(scene),
    getOriginalPositions,
    getOriginalGroupPositions,
    getState: () => lastState,
    registerIntegrations,
    pullApart,
    resetParts,
    resetMovedObjects,
    resetRotation,
    resetTransforms,
    clearState,
    dispose,
    showAllObjects,
    hideAllObjects,
    hideObject,
    soloObject,
  }
}

export default createModelEngine
