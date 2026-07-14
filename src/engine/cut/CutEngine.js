import * as THREE from "three"

const CUT_AXIS_NORMALS = {
  x: new THREE.Vector3(-1, 0, 0),
  y: new THREE.Vector3(0, -1, 0),
  z: new THREE.Vector3(0, 0, -1),
}

const CUT_AXES = ["x", "y", "z"]
const DEFAULT_CUT_AXIS = "x"
const EPSILON = 0.000001
const CUT_BASE_MATERIAL_KEY = "__vxCutBaseMaterial"
const CUT_TARGET_KEY = "__vxCutTargetKey"
const MULTI_TARGET_MATERIAL_KEY = "__vxMultiTargetCut"
const SCENE_TARGET_KEY = "__vxSceneCutTarget"

export function normalizeCutAxis(axis) {
  return CUT_AXIS_NORMALS[axis] ? axis : DEFAULT_CUT_AXIS
}

export function createCutPlane(axis = DEFAULT_CUT_AXIS, value = 0) {
  const normalizedAxis = normalizeCutAxis(axis)
  const normal = CUT_AXIS_NORMALS[normalizedAxis]

  return new THREE.Plane(normal, value)
}

function normalizeCutValues(values = {}, bounds = null) {
  return CUT_AXES.reduce((nextValues, axis) => {
    const fallbackValue = bounds?.[axis]?.max ?? 0
    const rawValue = values?.[axis]
    nextValues[axis] = Number.isFinite(Number(rawValue))
      ? Number(rawValue)
      : fallbackValue
    return nextValues
  }, {})
}

export function createNoCutValuesFromBounds(boundsMap) {
  return CUT_AXES.reduce((values, axis) => {
    values[axis] = boundsMap?.[axis]?.max ?? 0
    return values
  }, {})
}

function createCutPlanes({ enabled, values, bounds }) {
  if (!enabled) return []

  const normalizedValues = normalizeCutValues(values, bounds)

  return CUT_AXES.reduce((planes, axis) => {
    const axisBounds = bounds?.[axis]
    const value = normalizedValues[axis]

    if (axisBounds && value >= axisBounds.max - EPSILON) {
      return planes
    }

    planes.push(createCutPlane(axis, value))
    return planes
  }, [])
}

function hasActiveCutValues(values, bounds) {
  return CUT_AXES.some((axis) => {
    const max = Number(bounds?.[axis]?.max)
    const value = Number(values?.[axis])

    return Number.isFinite(max) && Number.isFinite(value)
      ? value < max - EPSILON
      : false
  })
}

function getMaterialList(material) {
  if (!material) return []
  return Array.isArray(material) ? material.filter(Boolean) : [material]
}

function cloneMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((item) => item?.clone?.() || item)
  }

  return material?.clone?.() || material
}

function clearMaterialClipping(material) {
  getMaterialList(material).forEach((item) => {
    item.clippingPlanes = []
    item.clipShadows = false
    item.needsUpdate = true
  })
}

function applyPlanesToMaterial(material, planes) {
  getMaterialList(material).forEach((item) => {
    item.clippingPlanes = planes
    item.clipShadows = planes.length > 0
    item.needsUpdate = true
  })
}

function restoreManagedCutMaterial(mesh) {
  const baseMaterial = mesh?.userData?.[CUT_BASE_MATERIAL_KEY]

  if (!mesh || !baseMaterial) return false

  clearMaterialClipping(mesh.material)
  mesh.material = baseMaterial
  delete mesh.userData[CUT_BASE_MATERIAL_KEY]
  delete mesh.userData[CUT_TARGET_KEY]
  clearMaterialClipping(mesh.material)

  return true
}

function prepareManagedCutMaterial(mesh) {
  if (!mesh?.material) return

  if (
    mesh.userData?.[CUT_BASE_MATERIAL_KEY] &&
    mesh.userData?.[CUT_TARGET_KEY] === MULTI_TARGET_MATERIAL_KEY
  ) {
    clearMaterialClipping(mesh.material)
    return
  }

  restoreManagedCutMaterial(mesh)

  mesh.userData[CUT_BASE_MATERIAL_KEY] = mesh.material
  mesh.userData[CUT_TARGET_KEY] = MULTI_TARGET_MATERIAL_KEY
  mesh.material = cloneMaterial(mesh.material)
}

function clearAllManagedCutMaterials(scene) {
  scene?.traverse?.((child) => {
    if (!child.isMesh || !child.material) return

    if (!restoreManagedCutMaterial(child)) {
      clearMaterialClipping(child.material)
    }
  })
}

function getTargetKey(target, scene = null) {
  if (!target) return null
  if (scene && target === scene) return SCENE_TARGET_KEY
  return target.uuid || target.name || null
}

function cloneBounds(bounds) {
  if (!bounds) return null

  return CUT_AXES.reduce((next, axis) => {
    const axisBounds = bounds?.[axis]
    next[axis] = axisBounds
      ? { min: axisBounds.min, max: axisBounds.max }
      : null
    return next
  }, {})
}

function cloneValues(values) {
  return CUT_AXES.reduce((next, axis) => {
    next[axis] = Number(values?.[axis] ?? 0)
    return next
  }, {})
}

function createTargetState(target, bounds = null) {
  const resolvedBounds = bounds || createCutBoundsFromScene(target)

  return {
    key: getTargetKey(target),
    target,
    bounds: resolvedBounds,
    values: createNoCutValuesFromBounds(resolvedBounds),
    enabled: false,
  }
}

function snapshotTargetState(state) {
  if (!state) return null

  return {
    key: state.key,
    target: state.target,
    targetObjectUuid: state.target?.uuid || null,
    targetObjectName: state.target?.name || null,
    bounds: cloneBounds(state.bounds),
    values: cloneValues(state.values),
    enabled: Boolean(state.enabled && hasActiveCutValues(state.values, state.bounds)),
  }
}

function collectTargetMeshPlanes(scene, targetStates) {
  const meshPlanes = new Map()

  targetStates.forEach((state) => {
    if (!state?.enabled) return

    const planes = createCutPlanes({
      enabled: true,
      values: state.values,
      bounds: state.bounds,
    })

    if (planes.length === 0) return

    const target = state.target || scene

    target?.traverse?.((child) => {
      if (!child.isMesh || !child.material) return

      const currentPlanes = meshPlanes.get(child) || []
      meshPlanes.set(child, [...currentPlanes, ...planes])
    })
  })

  return meshPlanes
}

function applyPersistentCutStates(scene, enabled, targetStates) {
  if (!scene) return []

  const meshPlanes = enabled
    ? collectTargetMeshPlanes(scene, targetStates)
    : new Map()

  scene.traverse?.((child) => {
    if (!child.isMesh || !child.material) return

    const planes = meshPlanes.get(child)

    if (!planes?.length) {
      restoreManagedCutMaterial(child)
      return
    }

    prepareManagedCutMaterial(child)
    applyPlanesToMaterial(child.material, planes)
  })

  return Array.from(meshPlanes.values()).flat()
}

/**
 * Legacy single-target helper. New Editor/Player flows use createCutEngine(),
 * which keeps persistent cut states for multiple object targets.
 */
export function applyCutAway(
  modelScene,
  enabled,
  cutValueOrValues,
  axis = DEFAULT_CUT_AXIS,
  bounds = null,
  targetObject = null,
) {
  if (!modelScene) return null

  const target = targetObject || modelScene
  const resolvedBounds = bounds || createCutBoundsFromScene(target)
  const isMultiAxisValue =
    typeof cutValueOrValues === "object" && cutValueOrValues !== null
  const values = isMultiAxisValue
    ? normalizeCutValues(cutValueOrValues, resolvedBounds)
    : {
        ...createNoCutValuesFromBounds(resolvedBounds),
        [normalizeCutAxis(axis)]: Number(cutValueOrValues) || 0,
      }

  const temporaryState = {
    target,
    bounds: resolvedBounds,
    values,
    enabled: Boolean(enabled),
  }

  return applyPersistentCutStates(modelScene, enabled, [temporaryState])
}

export function createCutBoundsFromScene(scene) {
  if (!scene) return null

  scene.updateMatrixWorld?.(true)

  const box = new THREE.Box3().setFromObject(scene)

  if (box.isEmpty()) return null

  return {
    x: { min: box.min.x, max: box.max.x },
    y: { min: box.min.y, max: box.max.y },
    z: { min: box.min.z, max: box.max.z },
  }
}

export function getCutAxisState(boundsMap, axis = DEFAULT_CUT_AXIS, values = null) {
  const normalizedAxis = normalizeCutAxis(axis)
  const bounds = boundsMap?.[normalizedAxis]

  if (!bounds) return null

  return {
    axis: normalizedAxis,
    min: bounds.min,
    max: bounds.max,
    value: values?.[normalizedAxis] ?? bounds.max,
  }
}

export function createCutEngine(initialState = {}) {
  let enabled = Boolean(initialState.enabled)
  let axis = normalizeCutAxis(initialState.axis)
  let target = initialState.target || null
  let bounds = initialState.bounds || createCutBoundsFromScene(target)
  let values = normalizeCutValues(initialState.values, bounds)
  let value = values[axis] ?? (Number(initialState.value) || 0)
  const targetStates = new Map()

  const ensureTargetState = (nextTarget = target, preferredBounds = null) => {
    if (!nextTarget) return null

    const key = getTargetKey(nextTarget)
    if (!key) return null

    let state = targetStates.get(key)

    if (!state) {
      state = createTargetState(nextTarget, preferredBounds)
      state.key = key
      targetStates.set(key, state)
    } else {
      state.target = nextTarget

      if (preferredBounds) {
        state.bounds = preferredBounds
      }
    }

    return state
  }

  const syncActiveState = (state) => {
    if (!state) {
      bounds = null
      values = normalizeCutValues()
      value = values[axis] ?? 0
      return
    }

    target = state.target
    bounds = state.bounds
    values = cloneValues(state.values)
    value = values[axis] ?? 0
  }

  const getActiveTargetState = () => ensureTargetState(target, bounds)

  if (target) {
    const initialTargetState = ensureTargetState(target, bounds)
    initialTargetState.values = normalizeCutValues(initialState.values, bounds)
    initialTargetState.enabled = Boolean(
      initialState.targetEnabled ?? initialState.enabled,
    )
    syncActiveState(initialTargetState)
  }

  const getTargetStates = ({ enabledOnly = false } = {}) =>
    Array.from(targetStates.values())
      .map(snapshotTargetState)
      .filter(Boolean)
      .filter((state) => !enabledOnly || state.enabled)

  const getState = () => ({
    enabled,
    axis,
    value,
    values: cloneValues(values),
    bounds: cloneBounds(bounds),
    target,
    targetObjectUuid: target?.uuid || null,
    targetObjectName: target?.name || null,
    targetEnabled: Boolean(getActiveTargetState()?.enabled),
    targetStates: getTargetStates(),
    activeCutCount: getTargetStates({ enabledOnly: true }).length,
    axisState: getCutAxisState(bounds, axis, values),
  })

  const setAxisValue = (nextAxis, nextValue) => {
    const state = getActiveTargetState()
    if (!state) return getState()

    const normalizedAxis = normalizeCutAxis(nextAxis)
    const numericValue = Number(nextValue)
    const axisBounds = state.bounds?.[normalizedAxis]
    const fallback = axisBounds?.max ?? 0
    const clampedValue = Number.isFinite(numericValue)
      ? axisBounds
        ? THREE.MathUtils.clamp(numericValue, axisBounds.min, axisBounds.max)
        : numericValue
      : fallback

    state.values = {
      ...state.values,
      [normalizedAxis]: clampedValue,
    }
    state.enabled = hasActiveCutValues(state.values, state.bounds)

    syncActiveState(state)

    if (axis === normalizedAxis) {
      value = clampedValue
    }

    return getState()
  }

  const resetTargetState = (sceneOrTarget = target) => {
    if (!sceneOrTarget) return getState()

    const state = ensureTargetState(sceneOrTarget)
    state.bounds = createCutBoundsFromScene(sceneOrTarget) || state.bounds
    state.values = createNoCutValuesFromBounds(state.bounds)
    state.enabled = false

    if (sceneOrTarget === target) {
      syncActiveState(state)
    }

    return getState()
  }

  return {
    getState,
    getTargetStates,

    enable() {
      enabled = true
      return getState()
    },

    disable() {
      enabled = false
      return getState()
    },

    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled)
      return getState()
    },

    toggle() {
      enabled = !enabled
      return getState()
    },

    setAxis(nextAxis) {
      axis = normalizeCutAxis(nextAxis)
      value = values[axis] ?? bounds?.[axis]?.max ?? 0
      return getState()
    },

    setValue(nextValue) {
      return setAxisValue(axis, nextValue)
    },

    setValues(nextValues = {}) {
      const state = getActiveTargetState()
      if (!state) return getState()

      state.values = normalizeCutValues(nextValues, state.bounds)
      state.enabled = hasActiveCutValues(state.values, state.bounds)
      syncActiveState(state)
      return getState()
    },

    setX(nextValue) {
      return setAxisValue("x", nextValue)
    },

    setY(nextValue) {
      return setAxisValue("y", nextValue)
    },

    setZ(nextValue) {
      return setAxisValue("z", nextValue)
    },

    setAxisValue,

    setTarget(nextTarget) {
      target = nextTarget || null

      if (!target) {
        syncActiveState(null)
        return getState()
      }

      const state = ensureTargetState(target)
      syncActiveState(state)
      return getState()
    },

    setTargetEnabled(nextEnabled, targetOverride = target) {
      const state = ensureTargetState(targetOverride)
      if (!state) return getState()

      state.enabled = Boolean(nextEnabled) && hasActiveCutValues(
        state.values,
        state.bounds,
      )

      if (targetOverride === target) syncActiveState(state)
      return getState()
    },

    setBounds(nextBounds) {
      bounds = nextBounds || null

      if (target) {
        const state = ensureTargetState(target, bounds)
        state.bounds = bounds
        state.values = normalizeCutValues(state.values, bounds)
        state.enabled = hasActiveCutValues(state.values, state.bounds)
        syncActiveState(state)
      }

      return getState()
    },

    computeBounds(sceneOrTarget = target) {
      if (!sceneOrTarget) return getState()

      const state = ensureTargetState(sceneOrTarget)
      state.bounds = createCutBoundsFromScene(sceneOrTarget)
      state.values = normalizeCutValues(state.values, state.bounds)
      state.enabled = hasActiveCutValues(state.values, state.bounds)

      if (sceneOrTarget === target) syncActiveState(state)
      return getState()
    },

    reset(sceneOrTarget = target) {
      return resetTargetState(sceneOrTarget)
    },

    removeTarget(sceneOrTarget = target) {
      if (!sceneOrTarget) return getState()

      const key = getTargetKey(sceneOrTarget)
      targetStates.delete(key)

      if (sceneOrTarget === target) {
        const replacement = createTargetState(sceneOrTarget)
        replacement.key = key
        targetStates.set(key, replacement)
        syncActiveState(replacement)
      }

      return getState()
    },

    resetAll() {
      const activeTarget = target
      targetStates.clear()

      if (activeTarget) {
        const nextState = createTargetState(activeTarget)
        nextState.key = getTargetKey(activeTarget)
        targetStates.set(nextState.key, nextState)
        syncActiveState(nextState)
      } else {
        syncActiveState(null)
      }

      return getState()
    },

    apply(scene) {
      return applyPersistentCutStates(
        scene,
        enabled,
        Array.from(targetStates.values()),
      )
    },

    clear(scene) {
      enabled = false
      targetStates.clear()
      clearAllManagedCutMaterials(scene)

      if (target) {
        const state = createTargetState(target)
        state.key = getTargetKey(target)
        targetStates.set(state.key, state)
        syncActiveState(state)
      }

      return getState()
    },

    resetState() {
      enabled = false
      axis = DEFAULT_CUT_AXIS
      target = null
      bounds = null
      values = normalizeCutValues()
      value = values[axis] ?? 0
      targetStates.clear()
      return getState()
    },

    dispose(scene) {
      clearAllManagedCutMaterials(scene)
      return this.resetState()
    },
  }
}

export default createCutEngine
