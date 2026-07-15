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
    buildObjectTreeList,
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
    if (!scene) return []

    if (typeof buildObjectTreeList === "function") {
      return buildObjectTreeList(scene)
    }

    if (typeof buildObjectTree !== "function") return []

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

  const getMeaningfulDirectChildren = (rootObject) => (
    Array.isArray(rootObject?.children)
      ? rootObject.children.filter((child) => !ignoreObjectTypes.includes(child.type))
      : []
  )

  const resolvePullApartRootObject = (targetObject) => {
    if (targetObject || !scene) return targetObject || scene

    const sceneChildren = getMeaningfulDirectChildren(scene)

    // GLB files often wrap the real hierarchy inside one top-level group
    // named "Scene". When no object is selected, explode the first-level
    // children of that real root instead of treating the wrapper as one part
    // or traversing down into every mesh.
    if (sceneChildren.length === 1) {
      const onlyChild = sceneChildren[0]
      const childBranches = getMeaningfulDirectChildren(onlyChild)

      if (childBranches.length > 0) return onlyChild
    }

    return scene
  }

  const getDirectPullApartBranches = (rootObject) => {
    if (!rootObject) return []

    const directChildren = getMeaningfulDirectChildren(rootObject)

    const branches = directChildren
      .map((child) => ({
        object: child,
        meshes: getMeshesInSubtree(child),
      }))
      .filter((branch) => branch.meshes.length > 0)

    if (branches.length > 0) return branches

    const fallbackMeshes = getMeshesInSubtree(rootObject)

    return fallbackMeshes.length > 0
      ? [
          {
            object: rootObject,
            meshes: fallbackMeshes,
          },
        ]
      : []
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

  const getCompactPullApartDirection = (index, total, branch, rootCenter) => {
    if (total <= 1) {
      return getPullApartDirection(branch.object, rootCenter, scene, "hierarchy")
    }

    const objectCenter = getObjectWorldCenter(branch.object, rootCenter)
    const naturalDirection = objectCenter.clone().sub(rootCenter)

    if (naturalDirection.lengthSq() > 0.000001) {
      naturalDirection.normalize()
    }

    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const angle = index * goldenAngle
    const radiusFactor = Math.sqrt((index + 0.5) / total)
    const verticalBand = ((index % 3) - 1) * 0.18

    const layoutDirection = new THREE.Vector3(
      Math.cos(angle),
      verticalBand * radiusFactor,
      Math.sin(angle)
    ).normalize()

    if (naturalDirection.lengthSq() <= 0.000001) {
      return layoutDirection
    }

    return naturalDirection
      .multiplyScalar(0.45)
      .add(layoutDirection.multiplyScalar(0.55))
      .normalize()
  }

  const getBranchRadius = (branch) => {
    const box = createBoxFromObjects(branch?.meshes || [])

    if (!box || box.isEmpty()) return 0.05

    const size = new THREE.Vector3()
    box.getSize(size)

    return Math.max(size.x, size.y, size.z, 0.05) * 0.5
  }

  const createBranchLayoutState = (branches, rootCenter) => {
    return branches.map((branch) => {
      const box = createBoxFromObjects(branch?.meshes || [])
      const center = getBoxCenter(box, rootCenter)
      const radius = getBranchRadius(branch)

      return {
        branch,
        box,
        center,
        radius,
      }
    })
  }

  const resolveCompactPullApartOffsets = (offsets, layoutState, rootCenter, rootMaxSize) => {
    const resolvedOffsets = offsets.map((offset) => offset.clone())
    const branchCount = resolvedOffsets.length

    if (branchCount <= 1) return resolvedOffsets

    const largestRadius = layoutState.reduce(
      (maxRadius, item) => Math.max(maxRadius, item.radius || 0.05),
      0.05
    )
    const minimumGap = Math.max(largestRadius * 0.16, rootMaxSize * 0.018, 0.02)
    const maxLayoutRadius = Math.max(rootMaxSize * 0.58, largestRadius * 2.25)
    const iterations = 10

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      let hasOverlap = false

      for (let a = 0; a < branchCount; a += 1) {
        for (let b = a + 1; b < branchCount; b += 1) {
          const stateA = layoutState[a]
          const stateB = layoutState[b]
          const centerA = stateA.center.clone().add(resolvedOffsets[a])
          const centerB = stateB.center.clone().add(resolvedOffsets[b])
          const delta = centerB.clone().sub(centerA)
          const currentDistance = Math.max(delta.length(), 0.0001)
          const targetDistance = (stateA.radius || 0.05) + (stateB.radius || 0.05) + minimumGap

          if (currentDistance >= targetDistance) continue

          hasOverlap = true

          const fallbackDirectionA = centerA.clone().sub(rootCenter)
          const fallbackDirectionB = centerB.clone().sub(rootCenter)
          const direction = delta.lengthSq() > 0.000001
            ? delta.normalize()
            : fallbackDirectionB.sub(fallbackDirectionA).normalize()

          if (direction.lengthSq() <= 0.000001) {
            direction.copy(createFallbackDirection(stateB.branch?.object))
          }

          const pushAmount = (targetDistance - currentDistance) * 0.52
          resolvedOffsets[a].add(direction.clone().multiplyScalar(-pushAmount))
          resolvedOffsets[b].add(direction.clone().multiplyScalar(pushAmount))
        }
      }

      resolvedOffsets.forEach((offset) => {
        const distanceFromRoot = offset.length()

        if (distanceFromRoot <= maxLayoutRadius) return

        offset.multiplyScalar(maxLayoutRadius / Math.max(distanceFromRoot, 0.0001))
      })

      if (!hasOverlap) break
    }

    return resolvedOffsets
  }

  const createCompactPullApartOffsets = (branches, rootCenter, rootMaxSize, baseDistance) => {
    const safeBranches = Array.isArray(branches) ? branches : []
    const branchCount = safeBranches.length
    const layoutState = createBranchLayoutState(safeBranches, rootCenter)
    const largestBranchRadius = layoutState.reduce(
      (maxRadius, item) => Math.max(maxRadius, item.radius || 0.05),
      0.05
    )
    const compactRadius = Math.max(
      baseDistance,
      Math.min(rootMaxSize * 0.38, largestBranchRadius * 1.35)
    )
    const minSpacing = largestBranchRadius * 0.9
    const offsets = []

    safeBranches.forEach((branch, index) => {
      const direction = getCompactPullApartDirection(index, branchCount, branch, rootCenter)
      const branchRadius = layoutState[index]?.radius || getBranchRadius(branch)
      const sizeFactor = branchRadius / Math.max(largestBranchRadius, 0.0001)
      const distanceFactor = 0.72 + sizeFactor * 0.28
      const distance = Math.max(compactRadius * distanceFactor, minSpacing)

      offsets.push(direction.multiplyScalar(distance))
    })

    return resolveCompactPullApartOffsets(offsets, layoutState, rootCenter, rootMaxSize)
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

    const rootObject = resolvePullApartRootObject(targetObject)

    scene.updateMatrixWorld(true)

    const branches = getDirectPullApartBranches(rootObject)
    const meshes = branches.flatMap((branch) => branch.meshes)

    if (meshes.length === 0) return false

    if (targetObject && hideOutsideSelection) {
      applyVisibilityForPullApartTarget(targetObject)
    }

    const rootBox = createBoxFromObjects(meshes)
    const rootCenter = getBoxCenter(rootBox)
    const rootMaxSize = getBoxMaxSize(rootBox)
    const baseDistance = typeof distance === "number"
      ? distance
      : rootMaxSize * strength

    const compactOffsets = mode === "hierarchy"
      ? createCompactPullApartOffsets(branches, rootCenter, rootMaxSize, baseDistance)
      : null

    branches.forEach((branch, index) => {
      const worldOffset = compactOffsets
        ? compactOffsets[index]
        : getPullApartDirection(branch.object, rootCenter, rootObject, mode)
            .multiplyScalar(baseDistance)

      branch.meshes.forEach((mesh) => {
        const original = originalPositions.find((item) => item.object === mesh)
        const basePosition = original?.position?.clone?.() || mesh.position.clone()

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
