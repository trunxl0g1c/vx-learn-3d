import { useFrame } from '@react-three/fiber'

import {
  applyCameraFocusConstraints,
  syncCameraClippingToControls,
} from '../../engine/camera'

const DEFAULT_COMPLETION_EPSILON = 1e-6
const CAMERA_LERP_FACTOR = 0.08

export default function CameraAnimator({ cameraRef, controlsRef, focusTargetRef }) {
  useFrame(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current

    if (!camera || !controls) return

    syncCameraClippingToControls(camera, controls)

    const focusTarget = focusTargetRef.current

    if (!focusTarget) return


    const currentMode = camera.isOrthographicCamera
      ? "orthographic"
      : "perspective"
    const requestedMode = focusTarget.cameraType
      ? focusTarget.cameraType === "orthographic"
        ? "orthographic"
        : "perspective"
      : currentMode

    // A saved Orthographic view must never be interpolated by the active
    // Perspective camera (or the opposite). Wait until the projection
    // controller has installed the requested camera first.
    if (requestedMode !== currentMode) return

    applyCameraFocusConstraints(focusTarget, camera, controls)

    camera.position.lerp(
      focusTarget.cameraPosition,
      CAMERA_LERP_FACTOR,
    )

    controls.target.lerp(
      focusTarget.target,
      CAMERA_LERP_FACTOR,
    )

    if (focusTarget.cameraUp && camera.up) {
      camera.up.copy(focusTarget.cameraUp).normalize()
    }

    if (
      camera.isOrthographicCamera &&
      Number.isFinite(Number(focusTarget.zoom))
    ) {
      camera.zoom +=
        (Number(focusTarget.zoom) - camera.zoom) * CAMERA_LERP_FACTOR
    }

    if (
      camera.isPerspectiveCamera &&
      Number.isFinite(Number(focusTarget.fov)) &&
      "fov" in camera
    ) {
      camera.fov +=
        (Number(focusTarget.fov) - camera.fov) * CAMERA_LERP_FACTOR
    }

    camera.updateProjectionMatrix?.()
    controls.update()

    const cameraDistance = camera.position.distanceTo(
      focusTarget.cameraPosition
    )
    const targetDistance = controls.target.distanceTo(focusTarget.target)
    const requestedEpsilon = Number(focusTarget.completionEpsilon)
    const completionEpsilon = Number.isFinite(requestedEpsilon)
      ? Math.max(requestedEpsilon, DEFAULT_COMPLETION_EPSILON)
      : Math.max(
          focusTarget.cameraPosition.distanceTo(focusTarget.target) * 0.0001,
          DEFAULT_COMPLETION_EPSILON,
        )

    if (
      cameraDistance <= completionEpsilon &&
      targetDistance <= completionEpsilon
    ) {
      camera.position.copy(focusTarget.cameraPosition)
      controls.target.copy(focusTarget.target)

      if (focusTarget.cameraUp && camera.up) {
        camera.up.copy(focusTarget.cameraUp).normalize()
      }

      if (
        camera.isOrthographicCamera &&
        Number.isFinite(Number(focusTarget.zoom))
      ) {
        camera.zoom = Number(focusTarget.zoom)
      }

      if (
        camera.isPerspectiveCamera &&
        Number.isFinite(Number(focusTarget.fov)) &&
        "fov" in camera
      ) {
        camera.fov = Number(focusTarget.fov)
      }

      camera.updateProjectionMatrix?.()
      controls.update()
      focusTargetRef.current = null
    }
  })

  return null
}
