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

  const getNow = () => {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now()
    }

    return Date.now()
  }

  const createTargetAnimation = (object, duration = 450) => ({
    from: object.position.clone(),
    startedAt: getNow(),
    duration,
  })

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

  const isValidPullApartMesh = (object) => Boolean(object?.isMesh)

  const getMeshesInSubtree = (rootObject) => {
    const meshes = []

    rootObject?.traverse?.((child) => {
      if (isValidPullApartMesh(child)) meshes.push(child)
    })

    return meshes
  }

  const createBoxFromObjects = (objects = []) => {
    const box = new THREE.Box3()
    let hasObject = false

    objects.forEach((object) => {
      if (!object) return

      object.updateWorldMatrix?.(true, false)

      const objectBox = new THREE.Box3().setFromObject(object)

      if (objectBox.isEmpty()) return

      box.union(objectBox)
      hasObject = true
    })

    return hasObject ? box : null
  }

  const getBoxCenter = (box, fallback = new THREE.Vector3()) => {
    if (!box || box.isEmpty()) return fallback.clone()

    const center = new THREE.Vector3()
    box.getCenter(center)
    return center
  }

  const getBoxMaxSize = (box) => {
    if (!box || box.isEmpty()) return 1

    const size = new THREE.Vector3()
    box.getSize(size)

    return Math.max(size.x, size.y, size.z, 0.0001)
  }

  const getObjectWorldCenter = (object, fallback = new THREE.Vector3()) => {
    if (!object) return fallback.clone()

    const meshes = getMeshesInSubtree(object)
    const box = createBoxFromObjects(meshes.length > 0 ? meshes : [object])

    return getBoxCenter(box, fallback)
  }

  const getRelativeHierarchyDepth = (object, rootObject) => {
    let depth = 0
    let current = object?.parent || null

    while (current && current !== rootObject && current !== scene) {
      depth += 1
      current = current.parent || null
    }

    return depth
  }

  const getObjectStableIndex = (object) => {
    if (!scene || !object) return 0

    let index = 0
    let foundIndex = 0

    scene.traverse((child) => {
      if (!child.isMesh) return

      if (child === object) {
        foundIndex = index
      }

      index += 1
    })

    return foundIndex
  }

  const createFallbackDirection = (object) => {
    const index = getObjectStableIndex(object)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const angle = index * goldenAngle
    const y = ((index % 5) - 2) * 0.18

    return new THREE.Vector3(
      Math.cos(angle),
      y,
      Math.sin(angle)
    ).normalize()
  }

  const getPullApartDirection = (object, rootCenter, rootObject, mode = "hierarchy") => {
    const objectCenter = getObjectWorldCenter(object, rootCenter)

    if (mode === "axis-x") return new THREE.Vector3(objectCenter.x >= rootCenter.x ? 1 : -1, 0, 0)
    if (mode === "axis-y") return new THREE.Vector3(0, objectCenter.y >= rootCenter.y ? 1 : -1, 0)
    if (mode === "axis-z") return new THREE.Vector3(0, 0, objectCenter.z >= rootCenter.z ? 1 : -1)

    let direction = null

    if (mode === "hierarchy") {
      const parentCenter = getObjectWorldCenter(object.parent, rootCenter)
      direction = objectCenter.clone().sub(parentCenter)
    }

    if (!direction || direction.lengthSq() <= 0.000001) {
      direction = objectCenter.clone().sub(rootCenter)
    }

    if (direction.lengthSq() > 0.000001) {
      return direction.normalize()
    }

    const localDirection = object.position.clone()

    if (localDirection.lengthSq() > 0.000001) {
      return localDirection.normalize()
    }

    return createFallbackDirection(object)
  }

  const createLocalTargetFromWorldOffset = (object, baseLocalPosition, worldOffset) => {
    const parent = object.parent || null
    const baseWorldPosition = parent
      ? parent.localToWorld(baseLocalPosition.clone())
      : baseLocalPosition.clone()

    const targetWorldPosition = baseWorldPosition.add(worldOffset)

    return parent
      ? parent.worldToLocal(targetWorldPosition)
      : targetWorldPosition
  }

  const collectObjectSubtree = (rootObject) => {
    const subtree = new Set()

    rootObject?.traverse?.((child) => {
      subtree.add(child)
    })

    return subtree
  }

  const collectObjectAncestors = (object) => {
    const ancestors = new Set()
    let current = object || null

    while (current) {
      ancestors.add(current)

      if (current === scene) break

      current = current.parent || null
    }

    return ancestors
  }

  const applyVisibilityForPullApartTarget = (targetObject) => {
    if (!scene || !targetObject) return

    const visibleSubtree = collectObjectSubtree(targetObject)
    const visibleAncestors = collectObjectAncestors(targetObject)

    scene.traverse((child) => {
      if (visibleSubtree.has(child) || visibleAncestors.has(child)) {
        child.visible = true
        return
      }

      if (child.isMesh) {
        child.visible = false
      }
    })
  }

  const pullApart = (targetObject = null, options = {}) => {
    if (!scene) return false

    const {
      mode = "hierarchy",
      strength = targetObject ? 0.28 : 0.18,
      distance = null,
      maxDepthMultiplier = 1.8,
      animationDuration = 450,
      hideOutsideSelection = true,
    } = options

    const rootObject = targetObject || scene
    const meshes = targetObject
      ? getMeshesInSubtree(targetObject)
      : originalPositions.map((item) => item.object).filter(Boolean)

    if (meshes.length === 0) return false

    scene.updateMatrixWorld(true)

    if (targetObject && hideOutsideSelection) {
      applyVisibilityForPullApartTarget(targetObject)
    }

    const rootBox = createBoxFromObjects(meshes)
    const rootCenter = getBoxCenter(rootBox)
    const rootMaxSize = getBoxMaxSize(rootBox)
    const baseDistance = typeof distance === "number"
      ? distance
      : rootMaxSize * strength

    meshes.forEach((mesh) => {
      const original = originalPositions.find((item) => item.object === mesh)
      const basePosition = original?.position?.clone?.() || mesh.position.clone()
      const direction = getPullApartDirection(mesh, rootCenter, rootObject, mode)
      const depth = getRelativeHierarchyDepth(mesh, rootObject)
      const depthMultiplier = Math.min(1 + depth * 0.12, maxDepthMultiplier)
      const worldOffset = direction.multiplyScalar(baseDistance * depthMultiplier)

      mesh.userData.targetPosition = createLocalTargetFromWorldOffset(
        mesh,
        basePosition,
        worldOffset
      )
      mesh.userData.targetPositionAnimation = createTargetAnimation(
        mesh,
        animationDuration
      )
    })

    return true
  }

  const resetParts = () => {
    originalPositions.forEach((item) => {
      item.object.userData.targetPosition = item.position.clone()
      item.object.userData.targetPositionAnimation = createTargetAnimation(item.object, 420)
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
