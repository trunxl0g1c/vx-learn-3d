import * as THREE from "three"

export function applyCutAway(modelScene, enabled, cutValue, axis = "x") {
  if (!modelScene) return

  const normalMap = {
    x: new THREE.Vector3(-1, 0, 0),
    y: new THREE.Vector3(0, -1, 0),
    z: new THREE.Vector3(0, 0, -1),
  }

  const plane = new THREE.Plane(
    normalMap[axis] || normalMap.x,
    cutValue
  )

  modelScene.traverse((child) => {
    if (!child.isMesh || !child.material) return

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material]

    materials.forEach((material) => {
      material.clippingPlanes = enabled ? [plane] : []
      material.clipShadows = enabled
      material.needsUpdate = true
    })
  })
}