import * as THREE from 'three'

export function applyCutAway(
  modelScene,
  enabled,
  value
) {

  if (!modelScene) return

  const plane = new THREE.Plane(
    new THREE.Vector3(-1, 0, 0),
    value
  )

  modelScene.traverse((child) => {

    if (child.isMesh) {

      child.material.clippingPlanes =
        enabled ? [plane] : []

      child.material.clipShadows = true

      child.material.needsUpdate = true
    }
  })
}