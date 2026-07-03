import * as THREE from "three"

const CUT_AXIS_NORMALS = {
  x: new THREE.Vector3(-1, 0, 0),
  y: new THREE.Vector3(0, -1, 0),
  z: new THREE.Vector3(0, 0, -1),
}

const DEFAULT_CUT_AXIS = "x"

export function normalizeCutAxis(axis) {
  return CUT_AXIS_NORMALS[axis] ? axis : DEFAULT_CUT_AXIS
}

export function createCutPlane(axis = DEFAULT_CUT_AXIS, value = 0) {
  const normalizedAxis = normalizeCutAxis(axis)
  const normal = CUT_AXIS_NORMALS[normalizedAxis]

  return new THREE.Plane(normal, value)
}

export function applyCutAway(modelScene, enabled, cutValue, axis = DEFAULT_CUT_AXIS) {
  if (!modelScene) return null

  const plane = createCutPlane(axis, cutValue)

  modelScene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    materials.forEach((material) => {
      material.clippingPlanes = enabled ? [plane] : []
      material.clipShadows = enabled
      material.needsUpdate = true
    })
  })

  return plane
}

export function createCutBoundsFromScene(scene) {
  if (!scene) return null

  scene.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(scene)

  return {
    x: { min: box.min.x, max: box.max.x },
    y: { min: box.min.y, max: box.max.y },
    z: { min: box.min.z, max: box.max.z },
  }
}

export function getCutAxisState(boundsMap, axis = DEFAULT_CUT_AXIS) {
  const normalizedAxis = normalizeCutAxis(axis)
  const bounds = boundsMap?.[normalizedAxis]

  if (!bounds) return null

  return {
    axis: normalizedAxis,
    min: bounds.min,
    max: bounds.max,
    value: (bounds.min + bounds.max) / 2,
  }
}

export function createCutEngine(initialState = {}) {
  let enabled = Boolean(initialState.enabled)
  let axis = normalizeCutAxis(initialState.axis)
  let value = Number(initialState.value) || 0
  let bounds = initialState.bounds || null

  const getState = () => ({
    enabled,
    axis,
    value,
    bounds,
    axisState: getCutAxisState(bounds, axis),
  })

  const setAxisFromBounds = () => {
    const axisState = getCutAxisState(bounds, axis)

    if (axisState) {
      value = axisState.value
    }

    return axisState
  }

  return {
    getState,

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
      setAxisFromBounds()
      return getState()
    },

    setValue(nextValue) {
      value = Number(nextValue) || 0
      return getState()
    },

    setBounds(nextBounds) {
      bounds = nextBounds || null
      setAxisFromBounds()
      return getState()
    },

    computeBounds(scene) {
      bounds = createCutBoundsFromScene(scene)
      setAxisFromBounds()
      return getState()
    },

    reset(scene) {
      if (scene) {
        bounds = createCutBoundsFromScene(scene)
      }

      setAxisFromBounds()

      return getState()
    },

    apply(scene) {
      return applyCutAway(scene, enabled, value, axis)
    },

    clear(scene) {
      enabled = false
      return applyCutAway(scene, false, value, axis)
    },

    resetState() {
      enabled = false
      axis = DEFAULT_CUT_AXIS
      value = 0
      bounds = null
      return getState()
    },

    dispose(scene) {
      if (scene) {
        applyCutAway(scene, false, value, axis)
      }

      return this.resetState()
    },
  }
}

export default createCutEngine
