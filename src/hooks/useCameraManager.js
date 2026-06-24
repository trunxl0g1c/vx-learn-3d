import * as THREE from 'three'

export function useCameraManager({
  modelScene,
  setTargetRotationY,
  setIsAutoRotating,
  focusTargetRef,
}) {
  const focusObject = (object) => {
    if (!object || !modelScene) return

    const box = new THREE.Box3().setFromObject(object)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()

    box.getCenter(center)
    box.getSize(size)

    const maxSize = Math.max(size.x, size.y, size.z)
    const distance = maxSize * 4

    const modelBox = new THREE.Box3().setFromObject(modelScene)
    const modelCenter = new THREE.Vector3()
    modelBox.getCenter(modelCenter)

    const direction = center.clone().sub(modelCenter).normalize()
    const angle = Math.atan2(direction.x, direction.z)

    setTargetRotationY(modelScene.rotation.y - angle)
    setIsAutoRotating(true)

    if (direction.length() === 0) {
      direction.set(0, 0, 1)
    }

    const cameraPosition = center.clone().add(direction.multiplyScalar(distance))

    focusTargetRef.current = {
      cameraPosition,
      target: center,
    }
  }

  return { focusObject }
}
