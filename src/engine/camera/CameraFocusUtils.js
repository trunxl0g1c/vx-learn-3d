import * as THREE from "three"

const DEFAULT_CAMERA_DIRECTION = new THREE.Vector3(0.8, 0.45, 1)
const FALLBACK_MIN_SIZE = 0.1

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
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z, FALLBACK_MIN_SIZE)
  const distanceMultiplier = options.distanceMultiplier ?? 2.4
  const minimumDistance = options.minimumDistance ?? 2
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
      maxSize
    )

    return Math.max(fitDistance * distanceMultiplier, minimumDistance)
  }

  return Math.max(maxSize * distanceMultiplier, minimumDistance)
}

export function createCameraFocusTargetFromBox(box, options = {}) {
  if (!box || box.isEmpty?.()) return null

  const center = box.getCenter(new THREE.Vector3())
  const distance = getFitDistanceForBox(box, options)
  const direction = normalizeDirection(options.direction)

  return {
    cameraPosition: center.clone().add(direction.multiplyScalar(distance)),
    target: center,
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
    cameraPosition: focusTarget.cameraPosition?.clone?.() || focusTarget.cameraPosition,
    target: focusTarget.target?.clone?.() || focusTarget.target,
  }
}

export function createCameraState(camera, controls) {
  if (!camera || !controls) return null

  return {
    cameraPosition: camera.position.clone(),
    target: controls.target.clone(),
  }
}
