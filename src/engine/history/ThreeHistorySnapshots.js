import { syncSketchEdgeVisibility } from "../model/ModelSceneUtils"

export function captureObjectTransformSnapshot(object) {
  if (!object) return null

  return {
    object,
    position: object.position.toArray(),
    quaternion: object.quaternion.toArray(),
    scale: object.scale.toArray(),
  }
}

export function applyObjectTransformSnapshot(snapshot) {
  const object = snapshot?.object
  if (!object) return false

  delete object.userData?.targetPosition
  delete object.userData?.targetPositionAnimation
  delete object.userData?.moveTargetPosition
  delete object.userData?.moveTargetRotation
  delete object.userData?.moveTargetTransformAnimation

  object.position.fromArray(snapshot.position || [0, 0, 0])
  object.quaternion.fromArray(snapshot.quaternion || [0, 0, 0, 1])
  object.scale.fromArray(snapshot.scale || [1, 1, 1])
  object.updateMatrix?.()
  object.updateMatrixWorld?.(true)
  return true
}

export function areObjectTransformSnapshotsEqual(a, b) {
  if (!a || !b || a.object !== b.object) return false

  const sameArray = (left = [], right = []) =>
    left.length === right.length &&
    left.every((value, index) => Math.abs(value - right[index]) <= 1e-10)

  return (
    sameArray(a.position, b.position) &&
    sameArray(a.quaternion, b.quaternion) &&
    sameArray(a.scale, b.scale)
  )
}

export function captureVisibilitySnapshot(root) {
  const entries = []

  root?.traverse?.((object) => {
    entries.push({ object, visible: object.visible })
  })

  return entries
}

export function applyVisibilitySnapshot(snapshot = [], scene = null) {
  snapshot.forEach(({ object, visible }) => {
    if (object) object.visible = Boolean(visible)
  })

  syncSketchEdgeVisibility(scene)
  scene?.updateMatrixWorld?.(true)
  return true
}

export function areVisibilitySnapshotsEqual(a = [], b = []) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        entry?.object === b[index]?.object &&
        Boolean(entry?.visible) === Boolean(b[index]?.visible),
    )
  )
}
