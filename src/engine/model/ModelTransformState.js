import * as THREE from "three"
import {
  createObjectIndexPath,
  resolveObjectByStoredIndexPath,
} from "./ObjectNameOverrides"

function createStoredObjectReference(object, scene) {
  if (!object || !scene) return null

  return {
    uuid: object.uuid || null,
    name: object.name || object.userData?.name || null,
    path: createObjectIndexPath(object, scene),
  }
}

export function captureModelTransformOverrides(
  scene,
  originalGroupPositions = [],
  { epsilon = 1e-6 } = {},
) {
  if (!scene) return []

  const threshold = Math.max(Number(epsilon) || 0, 1e-10)

  return originalGroupPositions
    .map((item) => {
      const object = item?.object

      if (
        !object ||
        object === scene ||
        object.userData?.__vxInternal === true ||
        !item?.position ||
        !item?.rotation ||
        !item?.scale
      ) {
        return null
      }

      const originalQuaternion = new THREE.Quaternion().setFromEuler(item.rotation)
      const positionChanged =
        object.position.distanceToSquared(item.position) > threshold * threshold
      const rotationChanged = object.quaternion.angleTo(originalQuaternion) > threshold
      const scaleChanged =
        object.scale.distanceToSquared(item.scale) > threshold * threshold

      if (!positionChanged && !rotationChanged && !scaleChanged) return null

      const reference = createStoredObjectReference(object, scene)
      if (!reference) return null

      return {
        object: reference,
        position: object.position.toArray(),
        quaternion: object.quaternion.toArray(),
        scale: object.scale.toArray(),
      }
    })
    .filter(Boolean)
}

export function applyModelTransformOverrides(scene, overrides = []) {
  if (!scene || !Array.isArray(overrides)) return 0

  let appliedCount = 0

  overrides.forEach((storedTransform) => {
    const reference = storedTransform?.object || storedTransform?.reference
    if (!reference) return

    const object =
      (reference.uuid
        ? scene.getObjectByProperty?.("uuid", reference.uuid)
        : null) ||
      (Array.isArray(reference.path)
        ? resolveObjectByStoredIndexPath(scene, reference.path, reference.name)
        : null)

    if (!object || object === scene) return

    const position = Array.isArray(storedTransform.position)
      ? storedTransform.position.slice(0, 3).map(Number)
      : null
    const quaternion = Array.isArray(storedTransform.quaternion)
      ? storedTransform.quaternion.slice(0, 4).map(Number)
      : null
    const scale = Array.isArray(storedTransform.scale)
      ? storedTransform.scale.slice(0, 3).map(Number)
      : null

    if (position?.length === 3 && position.every(Number.isFinite)) {
      object.position.fromArray(position)
    }

    if (quaternion?.length === 4 && quaternion.every(Number.isFinite)) {
      object.quaternion.fromArray(quaternion).normalize()
    }

    if (scale?.length === 3 && scale.every(Number.isFinite)) {
      object.scale.fromArray(scale)
    }

    delete object.userData.targetPosition
    delete object.userData.targetPositionAnimation
    delete object.userData.moveTargetPosition
    delete object.userData.moveTargetRotation
    delete object.userData.moveTargetTransformAnimation

    object.updateMatrix?.()
    appliedCount += 1
  })

  scene.updateMatrixWorld?.(true)
  return appliedCount
}
