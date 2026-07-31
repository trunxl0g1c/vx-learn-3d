import * as THREE from "three"

const DEFAULT_CAMERA_DIRECTION = new THREE.Vector3(0.8, 0.45, 1)
const MIN_RENDERABLE_SIZE = 1e-6
const MIN_CAMERA_DISTANCE = 1e-6
const MIN_CAMERA_NEAR = 1e-6
const DEFAULT_MIN_DISTANCE_RATIO = 0.005
const DEFAULT_COMPLETION_RATIO = 0.0001

export const DEFAULT_ORBIT_MIN_DISTANCE = MIN_CAMERA_DISTANCE

export function normalizeCameraProjectionMode(mode) {
  return mode === "orthographic" ? "orthographic" : "perspective"
}

export function getStoredCameraProjectionMode(cameraView, fallback = "perspective") {
  if (!cameraView || typeof cameraView !== "object") {
    return normalizeCameraProjectionMode(fallback)
  }

  return normalizeCameraProjectionMode(
    cameraView.cameraType ||
      cameraView.projectionMode ||
      cameraView.cameraProjectionMode ||
      fallback,
  )
}

function normalizeDirection(direction) {
  const fallback = DEFAULT_CAMERA_DIRECTION.clone().normalize()

  if (!direction) return fallback

  const nextDirection = direction.clone?.() || new THREE.Vector3(
    direction.x ?? 0,
    direction.y ?? 0,
    direction.z ?? 0
  )

  if (!Number.isFinite(nextDirection.x) || nextDirection.lengthSq() === 0) {
    return fallback
  }

  return nextDirection.normalize()
}

function isRenderableMesh(object, options = {}) {
  if (!object?.isMesh) return false
  if (!object.geometry) return false

  const includeHidden = options.includeHidden === true

  if (!includeHidden && object.visible === false) return false

  if (object.userData?.vxIgnoreBounds === true) return false
  if (object.userData?.isMarker === true) return false
  if (object.userData?.isTransformHelper === true) return false

  return true
}

function expandBoxByMeshGeometry(targetBox, mesh) {
  const geometry = mesh.geometry

  if (!geometry) return false

  if (!geometry.boundingBox) {
    geometry.computeBoundingBox?.()
  }

  const geometryBox = geometry.boundingBox

  if (!geometryBox || geometryBox.isEmpty?.()) return false

  const meshBox = geometryBox.clone().applyMatrix4(mesh.matrixWorld)

  if (meshBox.isEmpty()) return false

  targetBox.union(meshBox)
  return true
}

function getBoundsMetrics(box) {
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z, MIN_RENDERABLE_SIZE)
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  const radius = Math.max(
    Number.isFinite(sphere.radius) ? sphere.radius : 0,
    maxSize * 0.5,
    MIN_RENDERABLE_SIZE * 0.5,
  )

  return {
    size,
    maxSize,
    radius,
  }
}

/**
 * Builds a stable renderable bounds box from real mesh geometry only.
 *
 * This avoids the common GLB issue where empty parent nodes, helpers,
 * markers, hidden objects, or stale group transforms make Box3.setFromObject()
 * much larger than the visible model. The fallback keeps compatibility for
 * unusual imported objects that do not expose normal mesh geometry.
 */
export function createRenderableBoundsFromObject(root, options = {}) {
  if (!root) return null

  root.updateMatrixWorld?.(true)

  const bounds = new THREE.Box3()
  let meshCount = 0

  root.traverse?.((child) => {
    if (!isRenderableMesh(child, options)) return

    if (expandBoxByMeshGeometry(bounds, child)) {
      meshCount += 1
    }
  })

  if (meshCount > 0 && !bounds.isEmpty()) {
    return bounds
  }

  const fallbackBox = new THREE.Box3().setFromObject(root)

  if (fallbackBox.isEmpty()) return null

  return fallbackBox
}

function getFitDistanceForBox(box, options = {}) {
  const { size, maxSize } = getBoundsMetrics(box)
  const distanceMultiplier = options.distanceMultiplier ?? 2.4
  const requestedMinimumDistance = Number(options.minimumDistance)
  const minimumDistance = Number.isFinite(requestedMinimumDistance)
    ? Math.max(requestedMinimumDistance, MIN_CAMERA_DISTANCE)
    : MIN_CAMERA_DISTANCE
  const camera = options.camera

  if (camera?.isPerspectiveCamera && Number.isFinite(camera.fov)) {
    const verticalFov = THREE.MathUtils.degToRad(camera.fov)
    const aspect = Number.isFinite(camera.aspect) && camera.aspect > 0
      ? camera.aspect
      : 1

    const fitHeightDistance = size.y / (2 * Math.tan(verticalFov / 2))
    const fitWidthDistance = size.x / (2 * Math.tan(verticalFov / 2) * aspect)
    const fitDepthPadding = size.z * 0.5
    const fitDistance = Math.max(
      fitHeightDistance,
      fitWidthDistance,
      fitDepthPadding,
      maxSize,
    )

    return Math.max(fitDistance * distanceMultiplier, minimumDistance)
  }

  return Math.max(maxSize * distanceMultiplier, minimumDistance)
}

function createFocusCameraConstraints(box, distance, options = {}) {
  const { radius } = getBoundsMetrics(box)
  const minDistanceRatio = Number(options.minDistanceRatio)
  const activeMinDistanceRatio = Number.isFinite(minDistanceRatio)
    ? Math.max(minDistanceRatio, 0)
    : DEFAULT_MIN_DISTANCE_RATIO
  const minDistance = Math.max(
    radius * activeMinDistanceRatio,
    MIN_CAMERA_DISTANCE,
  )
  const near = Math.max(minDistance * 0.25, MIN_CAMERA_NEAR)
  const far = Math.max(
    distance + radius * 100,
    near * 10000,
    1000,
  )
  const completionRatio = Number(options.completionRatio)
  const activeCompletionRatio = Number.isFinite(completionRatio)
    ? Math.max(completionRatio, 0)
    : DEFAULT_COMPLETION_RATIO
  const completionEpsilon = Math.max(
    distance * activeCompletionRatio,
    radius * activeCompletionRatio,
    MIN_CAMERA_DISTANCE,
  )

  return {
    minDistance,
    near,
    far,
    completionEpsilon,
    radius,
  }
}

export function applyCameraFocusConstraints(focusTarget, camera, controls) {
  const constraints = focusTarget?.cameraConstraints

  if (!constraints) return false

  if (controls && Number.isFinite(constraints.minDistance)) {
    controls.minDistance = Math.max(
      constraints.minDistance,
      MIN_CAMERA_DISTANCE,
    )
  }

  if (!camera?.isPerspectiveCamera) return Boolean(controls)

  const nextNear = Number(constraints.near)
  const requestedFar = Number(constraints.far)
  const nextFar = Number.isFinite(requestedFar)
    ? Math.max(requestedFar, Number(camera.far) || 0)
    : Number(camera.far)
  let projectionChanged = false

  if (
    Number.isFinite(nextNear) &&
    nextNear > 0 &&
    Math.abs(camera.near - nextNear) > nextNear * 0.01
  ) {
    camera.near = nextNear
    projectionChanged = true
  }

  if (
    Number.isFinite(nextFar) &&
    nextFar > camera.near &&
    Math.abs(camera.far - nextFar) > nextFar * 0.01
  ) {
    camera.far = nextFar
    projectionChanged = true
  }

  if (projectionChanged) {
    camera.updateProjectionMatrix?.()
  }

  return projectionChanged || Boolean(controls)
}

export function syncCameraClippingToControls(camera, controls) {
  if (!camera?.isPerspectiveCamera || !controls?.target) return false

  const distance = Math.max(
    camera.position.distanceTo(controls.target),
    MIN_CAMERA_DISTANCE,
  )
  const nextNear = Math.max(distance * 0.001, MIN_CAMERA_NEAR)
  const nextFar = Math.max(
    Number(camera.far) || 0,
    distance * 1000,
    nextNear * 10000,
    1000,
  )
  const nearThreshold = Math.max(nextNear * 0.1, MIN_CAMERA_NEAR)
  const farThreshold = Math.max(nextFar * 0.1, 1)
  let projectionChanged = false

  if (Math.abs(camera.near - nextNear) > nearThreshold) {
    camera.near = nextNear
    projectionChanged = true
  }

  if (Math.abs(camera.far - nextFar) > farThreshold) {
    camera.far = nextFar
    projectionChanged = true
  }

  if (projectionChanged) {
    camera.updateProjectionMatrix?.()
  }

  return projectionChanged
}

export function createCameraFocusTargetFromBox(box, options = {}) {
  if (!box || box.isEmpty?.()) return null

  const center = box.getCenter(new THREE.Vector3())
  const distance = getFitDistanceForBox(box, options)
  const direction = normalizeDirection(options.direction)
  const cameraConstraints = createFocusCameraConstraints(box, distance, options)

  return {
    cameraPosition: center.clone().add(direction.multiplyScalar(distance)),
    target: center,
    cameraConstraints,
    completionEpsilon: cameraConstraints.completionEpsilon,
  }
}

export function createFocusTargetFromObject(object, camera, controls, options = {}) {
  if (!object) return null

  const box = createRenderableBoundsFromObject(object, options)

  if (!box) return null

  const currentCameraPosition = camera?.position?.clone?.()
  const currentTarget = controls?.target?.clone?.() || new THREE.Vector3(0, 0, 0)
  const cameraDirection = currentCameraPosition
    ? currentCameraPosition.sub(currentTarget)
    : null

  return createCameraFocusTargetFromBox(box, {
    ...options,
    camera,
    direction: options.direction || cameraDirection,
  })
}

export function createFocusTargetFromScene(scene, options = {}) {
  if (!scene) return null

  const box = createRenderableBoundsFromObject(scene, options)

  if (!box) return null

  return createCameraFocusTargetFromBox(box, options)
}

export function createDefaultCameraTarget() {
  return {
    cameraPosition: new THREE.Vector3(0, 0, 5),
    target: new THREE.Vector3(0, 0, 0),
  }
}

export function cloneCameraFocusTarget(focusTarget) {
  if (!focusTarget) return null

  return {
    cameraPosition:
      focusTarget.cameraPosition?.clone?.() || focusTarget.cameraPosition,
    target: focusTarget.target?.clone?.() || focusTarget.target,
    cameraUp: focusTarget.cameraUp?.clone?.() || focusTarget.cameraUp,
    zoom: focusTarget.zoom,
    fov: focusTarget.fov,
    cameraConstraints: focusTarget.cameraConstraints
      ? { ...focusTarget.cameraConstraints }
      : undefined,
    completionEpsilon: focusTarget.completionEpsilon,
  }
}

export function createCameraState(camera, controls) {
  if (!camera || !controls) return null

  const zoom = Number(camera.zoom)
  const fov = Number(camera.fov)

  return {
    cameraPosition: camera.position.clone(),
    target: controls.target.clone(),
    cameraUp: camera.up?.clone?.() || null,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : null,
    fov: Number.isFinite(fov) && fov > 0 ? fov : null,
  }
}


function createVector3FromStoredValue(value) {
  if (Array.isArray(value) && value.length >= 3) {
    const vector = new THREE.Vector3().fromArray(value)
    return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z)
      ? vector
      : null
  }

  if (value && typeof value === "object") {
    const vector = new THREE.Vector3(
      Number(value.x),
      Number(value.y),
      Number(value.z),
    )

    return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z)
      ? vector
      : null
  }

  return null
}

function createQuaternionFromStoredValue(value) {
  if (!Array.isArray(value) || value.length < 4) return null

  const quaternion = new THREE.Quaternion().fromArray(value)

  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w].every(
    Number.isFinite,
  )
    ? quaternion
    : null
}

export function createStoredCameraView(camera, controls) {
  if (!camera?.position || !controls?.target) return null

  const position = camera.position.toArray?.()
  const target = controls.target.toArray?.()
  const quaternion = camera.quaternion?.toArray?.() || null
  const up = camera.up?.toArray?.() || null
  const zoom = Number(camera.zoom)
  const fov = Number(camera.fov)

  if (!Array.isArray(position) || !Array.isArray(target)) return null

  return {
    version: 2,
    position,
    target,
    quaternion,
    up,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    cameraType: camera.isOrthographicCamera ? "orthographic" : "perspective",
    fov: Number.isFinite(fov) && fov > 0 ? fov : null,
  }
}

export function createCameraStateFromStoredView(cameraView) {
  if (!cameraView || typeof cameraView !== "object") return null

  // Support both the current cameraView payload and legacy Chapter fields.
  const position = createVector3FromStoredValue(
    cameraView.position || cameraView.cameraPosition,
  )
  const target = createVector3FromStoredValue(
    cameraView.target || cameraView.cameraTarget,
  )
  const quaternion = createQuaternionFromStoredValue(
    cameraView.quaternion || cameraView.cameraQuaternion,
  )
  const up = createVector3FromStoredValue(
    cameraView.up || cameraView.cameraUp,
  )
  const zoom = Number(cameraView.zoom ?? cameraView.cameraZoom)
  const fov = Number(cameraView.fov)

  if (!position || !target) return null

  return {
    position,
    target,
    quaternion,
    up,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    cameraType: getStoredCameraProjectionMode(cameraView),
    fov: Number.isFinite(fov) && fov > 0 ? fov : null,
  }
}
