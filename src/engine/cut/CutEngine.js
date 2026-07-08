import * as THREE from "three"

const CUT_AXIS_NORMALS = {
  x: new THREE.Vector3(-1, 0, 0),
  y: new THREE.Vector3(0, -1, 0),
  z: new THREE.Vector3(0, 0, -1),
}

const CUT_AXES = ["x", "y", "z"]
const DEFAULT_CUT_AXIS = "x"
const EPSILON = 0.000001

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

    // When the plane is at max bound, the model is visually uncut for that axis.
    // This allows the panel to stay open while Reset returns the model to intact.
    if (axisBounds && value >= axisBounds.max - EPSILON) {
      return planes
    }

    planes.push(createCutPlane(axis, value))
    return planes
  }, [])
}

export function applyCutAway(modelScene, enabled, cutValueOrValues, axis = DEFAULT_CUT_AXIS, bounds = null) {
  if (!modelScene) return null

  const isMultiAxisValue =
    typeof cutValueOrValues === "object" && cutValueOrValues !== null

  const values = isMultiAxisValue
    ? normalizeCutValues(cutValueOrValues, bounds)
    : {
        ...createNoCutValuesFromBounds(bounds),
        [normalizeCutAxis(axis)]: Number(cutValueOrValues) || 0,
      }

  const planes = isMultiAxisValue
    ? createCutPlanes({ enabled, values, bounds })
    : enabled
      ? [createCutPlane(axis, values[normalizeCutAxis(axis)])]
      : []

  modelScene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    materials.forEach((material) => {
      material.clippingPlanes = planes
      material.clipShadows = planes.length > 0
      material.needsUpdate = true
    })
  })

  return planes
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
  let value = Number(initialState.value) || 0
  let bounds = initialState.bounds || null
  let values = normalizeCutValues(initialState.values, bounds)

  const getState = () => ({
    enabled,
    axis,
    value,
    values,
    bounds,
    axisState: getCutAxisState(bounds, axis, values),
  })

  const resetValuesFromBounds = () => {
    values = createNoCutValuesFromBounds(bounds)
    value = values[axis] ?? 0
    return values
  }

  const setAxisFromBounds = () => {
    const axisState = getCutAxisState(bounds, axis, values)

    if (axisState) {
      value = axisState.value
    }

    return axisState
  }

  const setAxisValue = (nextAxis, nextValue) => {
    const normalizedAxis = normalizeCutAxis(nextAxis)
    const numericValue = Number(nextValue)
    const axisBounds = bounds?.[normalizedAxis]
    const fallback = axisBounds?.max ?? 0
    const clampedValue = Number.isFinite(numericValue)
      ? axisBounds
        ? THREE.MathUtils.clamp(numericValue, axisBounds.min, axisBounds.max)
        : numericValue
      : fallback

    values = {
      ...values,
      [normalizedAxis]: clampedValue,
    }

    if (axis === normalizedAxis) {
      value = clampedValue
    }

    return getState()
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
      return setAxisValue(axis, nextValue)
    },

    setValues(nextValues = {}) {
      values = normalizeCutValues(nextValues, bounds)
      value = values[axis] ?? value
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

    setBounds(nextBounds) {
      bounds = nextBounds || null
      resetValuesFromBounds()
      return getState()
    },

    computeBounds(scene) {
      bounds = createCutBoundsFromScene(scene)
      resetValuesFromBounds()
      return getState()
    },

    reset(scene) {
      if (scene) {
        bounds = createCutBoundsFromScene(scene)
      }

      resetValuesFromBounds()

      return getState()
    },

    apply(scene) {
      return applyCutAway(scene, enabled, values, axis, bounds)
    },

    clear(scene) {
      enabled = false
      resetValuesFromBounds()
      return applyCutAway(scene, false, values, axis, bounds)
    },

    resetState() {
      enabled = false
      axis = DEFAULT_CUT_AXIS
      value = 0
      bounds = null
      values = normalizeCutValues()
      return getState()
    },

    dispose(scene) {
      if (scene) {
        applyCutAway(scene, false, values, axis, bounds)
      }

      return this.resetState()
    },
  }
}

export default createCutEngine
