import * as THREE from "three"

const DEFAULT_DRAG_THRESHOLD = 0
const MIN_PIVOT_DISTANCE = 1e-6
const MIN_VIEW_DIRECTION_LENGTH_SQ = 1e-12
const TWO_PI = Math.PI * 2
const Y_AXIS = new THREE.Vector3(0, 1, 0)

const POINTER_BUTTON_TO_MOUSE_SLOT = {
  0: "LEFT",
  1: "MIDDLE",
  2: "RIGHT",
}

function hasOrbitModifier(event) {
  return Boolean(event?.ctrlKey || event?.metaKey || event?.shiftKey)
}

function getPointerNdc(domElement, clientX, clientY) {
  const rect = domElement?.getBoundingClientRect?.()
  if (!rect || rect.width <= 0 || rect.height <= 0) return null

  const x = Number(clientX)
  const y = Number(clientY)

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  return new THREE.Vector2(
    ((x - rect.left) / rect.width) * 2 - 1,
    -((y - rect.top) / rect.height) * 2 + 1,
  )
}

function clampOrbitPolarAngle(spherical, controls) {
  const minPolarAngle = Number.isFinite(controls?.minPolarAngle)
    ? controls.minPolarAngle
    : 0
  const maxPolarAngle = Number.isFinite(controls?.maxPolarAngle)
    ? controls.maxPolarAngle
    : Math.PI

  spherical.phi = Math.max(
    minPolarAngle,
    Math.min(maxPolarAngle, spherical.phi),
  )
  spherical.makeSafe()
}

function clampOrbitAzimuthAngle(spherical, controls) {
  const minAzimuthAngle = controls?.minAzimuthAngle
  const maxAzimuthAngle = controls?.maxAzimuthAngle

  if (Number.isFinite(minAzimuthAngle)) {
    spherical.theta = Math.max(minAzimuthAngle, spherical.theta)
  }
  if (Number.isFinite(maxAzimuthAngle)) {
    spherical.theta = Math.min(maxAzimuthAngle, spherical.theta)
  }
}

export function getOrbitPointerDragThreshold(value = DEFAULT_DRAG_THRESHOLD) {
  const numericValue = Number(value)

  return Number.isFinite(numericValue)
    ? Math.max(numericValue, 0)
    : DEFAULT_DRAG_THRESHOLD
}

/**
 * Matches OrbitControls' mouse-button + modifier behavior closely enough to
 * decide whether a pointer-down is beginning a rotate gesture. This also
 * respects projects that remap OrbitControls.mouseButtons in the future.
 */
export function isOrbitRotatePointerEvent(event, controls) {
  if (!event || !controls?.enabled || controls.enableRotate === false) {
    return false
  }

  if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") {
    return false
  }

  const slot = POINTER_BUTTON_TO_MOUSE_SLOT[event.button]
  if (!slot) return false

  const configuredAction = controls.mouseButtons?.[slot]
  const modifierPressed = hasOrbitModifier(event)

  if (configuredAction === THREE.MOUSE.ROTATE) {
    // OrbitControls temporarily turns a ROTATE mouse button into PAN while a
    // navigation modifier is held.
    return !modifierPressed
  }

  if (configuredAction === THREE.MOUSE.PAN) {
    // OrbitControls does the inverse for a PAN mouse button: holding one of
    // these modifiers temporarily turns it into ROTATE.
    return modifierPressed
  }

  if (configuredAction == null) {
    // Safe compatibility fallback for older/custom controls implementations.
    return event.button === 0 && !modifierPressed
  }

  return false
}

/**
 * Resolves a 3D cursor pivot without requiring scene geometry. The cursor ray
 * is projected onto a camera-facing plane through the current controls target.
 * This gives every screen coordinate a stable world-space point, including
 * empty background outside the model.
 */
export function pickOrbitPivotFromPointer({
  camera,
  domElement,
  clientX,
  clientY,
  referenceTarget,
}) {
  if (!camera || !domElement || !referenceTarget) return null

  const pointer = getPointerNdc(domElement, clientX, clientY)
  if (!pointer) return null

  camera.updateMatrixWorld?.(true)

  const viewDirection = new THREE.Vector3()
  camera.getWorldDirection(viewDirection)

  if (viewDirection.lengthSq() <= MIN_VIEW_DIRECTION_LENGTH_SQ) return null
  viewDirection.normalize()

  const pivotPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    viewDirection,
    referenceTarget,
  )

  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(pointer, camera)

  const point = new THREE.Vector3()
  const intersection = raycaster.ray.intersectPlane(pivotPlane, point)

  if (!intersection) return null

  const distance = camera.position?.distanceTo?.(point)
  if (!Number.isFinite(distance) || distance <= MIN_PIVOT_DISTANCE) return null

  return {
    point: point.clone(),
    object: null,
    distance,
    source: "cursor-plane",
  }
}

/**
 * Rotates camera + OrbitControls target as one rigid transform around an
 * arbitrary cursor pivot.
 *
 * This is deliberately different from assigning `controls.target = pivot`.
 * Re-targeting OrbitControls immediately changes the camera look direction,
 * which makes the model appear to jump before rotation begins. Here the
 * existing camera pose is left untouched when the drag starts. Only the drag
 * delta produces motion, and the picked cursor point remains at the same
 * screen coordinate while orbiting.
 */
export function rotateOrbitAroundPointerPivot({
  camera,
  controls,
  domElement,
  pivot,
  deltaX,
  deltaY,
}) {
  if (
    !camera?.position ||
    !camera?.quaternion ||
    !camera?.up ||
    !controls?.target ||
    !pivot
  ) {
    return false
  }

  const height = Number(domElement?.clientHeight)
  if (!Number.isFinite(height) || height <= 0) return false

  const dx = Number(deltaX)
  const dy = Number(deltaY)
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false
  if (Math.abs(dx) <= Number.EPSILON && Math.abs(dy) <= Number.EPSILON) {
    return false
  }

  const rotateSpeed = Number.isFinite(controls.rotateSpeed)
    ? controls.rotateSpeed
    : 1

  const cameraPositionBefore = camera.position.clone()
  const targetBefore = controls.target.clone()
  const cameraQuaternionBefore = camera.quaternion.clone()
  const offset = cameraPositionBefore.clone().sub(targetBefore)

  if (offset.lengthSq() <= MIN_VIEW_DIRECTION_LENGTH_SQ) return false

  // Reproduce OrbitControls' world-up spherical rotation to derive the exact
  // orientation delta that a normal mouse orbit would have produced.
  const normalizedUp = camera.up.clone().normalize()
  const toYUp = new THREE.Quaternion().setFromUnitVectors(normalizedUp, Y_AXIS)
  const fromYUp = toYUp.clone().invert()
  const spherical = new THREE.Spherical().setFromVector3(
    offset.clone().applyQuaternion(toYUp),
  )

  spherical.theta -= (TWO_PI * dx * rotateSpeed) / height
  spherical.phi -= (TWO_PI * dy * rotateSpeed) / height

  clampOrbitAzimuthAngle(spherical, controls)
  clampOrbitPolarAngle(spherical, controls)

  const normalOrbitPosition = new THREE.Vector3()
    .setFromSpherical(spherical)
    .applyQuaternion(fromYUp)
    .add(targetBefore)

  const normalOrbitMatrix = new THREE.Matrix4().lookAt(
    normalOrbitPosition,
    targetBefore,
    camera.up,
  )
  const normalOrbitQuaternion = new THREE.Quaternion().setFromRotationMatrix(
    normalOrbitMatrix,
  )

  const worldRotation = normalOrbitQuaternion
    .clone()
    .multiply(cameraQuaternionBefore.clone().invert())
    .normalize()

  // A rigid rotation around `pivot` keeps that pivot's camera-space position
  // unchanged. There is therefore no re-frame / target jump at drag start.
  camera.position
    .copy(cameraPositionBefore)
    .sub(pivot)
    .applyQuaternion(worldRotation)
    .add(pivot)

  controls.target
    .copy(targetBefore)
    .sub(pivot)
    .applyQuaternion(worldRotation)
    .add(pivot)

  camera.quaternion.copy(
    worldRotation.clone().multiply(cameraQuaternionBefore).normalize(),
  )
  camera.updateMatrixWorld?.(true)

  // Keep OrbitControls' public state and R3F invalidation/change listeners in
  // sync with the camera pose we authored above.
  controls.update?.()

  return true
}

/**
 * Backward-compatible helper retained for callers outside this source snapshot.
 * New cursor-orbit interaction should prefer `rotateOrbitAroundPointerPivot`,
 * because directly changing the OrbitControls target necessarily reframes the
 * camera when the pivot is off-center.
 */
export function setOrbitPivotFromPointer({
  camera,
  controls,
  domElement,
  clientX,
  clientY,
}) {
  if (!controls?.target || !camera?.position) return null

  const pivot = pickOrbitPivotFromPointer({
    camera,
    domElement,
    clientX,
    clientY,
    referenceTarget: controls.target,
  })

  if (!pivot?.point) return null

  controls.target.copy(pivot.point)

  return pivot
}
