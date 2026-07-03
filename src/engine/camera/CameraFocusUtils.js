import * as THREE from "three"

function normalizeDirection(direction) {
  const fallback = new THREE.Vector3(0.8, 0.45, 1).normalize()

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

export function createCameraFocusTargetFromBox(box, options = {}) {
  if (!box || box.isEmpty?.()) return null

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxSize = Math.max(size.x, size.y, size.z, 0.1)

  const distanceMultiplier = options.distanceMultiplier ?? 2.4
  const minimumDistance = options.minimumDistance ?? 2
  const distance = Math.max(maxSize * distanceMultiplier, minimumDistance)
  const direction = normalizeDirection(options.direction)

  return {
    cameraPosition: center.clone().add(direction.multiplyScalar(distance)),
    target: center,
  }
}

export function createFocusTargetFromObject(object, camera, controls, options = {}) {
  if (!object) return null

  object.updateMatrixWorld?.(true)

  const box = new THREE.Box3().setFromObject(object)

  if (box.isEmpty()) return null

  const currentCameraPosition = camera?.position?.clone?.()
  const currentTarget = controls?.target?.clone?.() || new THREE.Vector3(0, 0, 0)
  const cameraDirection = currentCameraPosition
    ? currentCameraPosition.sub(currentTarget)
    : null

  return createCameraFocusTargetFromBox(box, {
    ...options,
    direction: options.direction || cameraDirection,
  })
}

export function createFocusTargetFromScene(scene, options = {}) {
  if (!scene) return null

  scene.updateMatrixWorld?.(true)

  const box = new THREE.Box3().setFromObject(scene)
  return createCameraFocusTargetFromBox(box, options)
}

export function createDefaultCameraTarget() {
  return {
    cameraPosition: new THREE.Vector3(0, 0, 5),
    target: new THREE.Vector3(0, 0, 0),
  }
}

export function createCameraState(camera, controls) {
  if (!camera || !controls) return null

  return {
    cameraPosition: camera.position.clone(),
    target: controls.target.clone(),
  }
}
