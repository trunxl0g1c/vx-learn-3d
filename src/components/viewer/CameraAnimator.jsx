import { useFrame } from '@react-three/fiber'

export default function CameraAnimator({ cameraRef, controlsRef, focusTargetRef }) {
  useFrame(() => {
    if (!focusTargetRef.current) return
    if (!cameraRef.current || !controlsRef.current) return

    cameraRef.current.position.lerp(
      focusTargetRef.current.cameraPosition,
      0.08
    )

    controlsRef.current.target.lerp(
      focusTargetRef.current.target,
      0.08
    )

    controlsRef.current.update()

    const distance = cameraRef.current.position.distanceTo(
      focusTargetRef.current.cameraPosition
    )

    if (distance < 0.02) {
      focusTargetRef.current = null
    }
  })

  return null
}
