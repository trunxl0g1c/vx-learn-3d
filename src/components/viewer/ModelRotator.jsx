import { useFrame } from '@react-three/fiber'

export default function ModelRotator({
  modelScene,
  targetRotationY,
  enabled,
  onFinish,
}) {
  useFrame(() => {
    if (modelScene) {
      modelScene.traverse((child) => {
        if (child.userData.moveTargetPosition) {
          child.position.lerp(child.userData.moveTargetPosition, 0.08)

          child.rotation.x +=
            (child.userData.moveTargetRotation.x - child.rotation.x) * 0.08
          child.rotation.y +=
            (child.userData.moveTargetRotation.y - child.rotation.y) * 0.08
          child.rotation.z +=
            (child.userData.moveTargetRotation.z - child.rotation.z) * 0.08

          const distance = child.position.distanceTo(child.userData.moveTargetPosition)

          if (distance < 0.01) {
            child.position.copy(child.userData.moveTargetPosition)

            delete child.userData.moveTargetPosition
            delete child.userData.moveTargetRotation
          }
        }
      })
    }

    if (!enabled || !modelScene) return

    const diff = targetRotationY - modelScene.rotation.y
    modelScene.rotation.y += diff * 0.08

    if (Math.abs(diff) < 0.01) {
      modelScene.rotation.y = targetRotationY
      onFinish?.()
    }
  })

  return null
}
