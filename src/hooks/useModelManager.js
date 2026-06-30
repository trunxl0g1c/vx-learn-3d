import { useRef } from 'react'
import * as THREE from 'three'
import { buildObjectTree } from '../utils/objectTreeUtils'

export function useModelManager({
  modelScene,
  setModelScene,
  setObjectList,
  setCutMin,
  setCutMax,
  setCutX,
  setMarkerScale,
  viewerSettings,
  setSelectedObject,
  setOutlineObjects,
  setSelectedObjectName,
  setTargetRotationY,
  setIsAutoRotating,
  focusTargetRef,
}) {
  const originalPositionsRef = useRef([])
  const originalGroupPositionsRef = useRef([])

  const handleModelLoaded = (scene) => {
    setModelScene(scene)

    scene.traverse((child) => {
      if (!child.isMesh) return

      if (child.material) {
        child.material.envMapIntensity = viewerSettings.envIntensity
        child.material.needsUpdate = true
      }
    })

    const positions = []
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)

    const maxSize = Math.max(size.x, size.y, size.z)
    const calculatedMarkerScale = maxSize * 0.015

    setMarkerScale(Math.min(Math.max(calculatedMarkerScale, 0.03), 0.15))
    setCutMin(box.min.x)
    setCutMax(box.max.x)
    setCutX((box.min.x + box.max.x) / 2)

    const objects = scene.children
      .filter((child) => child.type !== 'Bone')
      .map((child) => buildObjectTree(child, 0))

    const originalGroupPositions = []

    scene.traverse((child) => {
      originalGroupPositions.push({
        object: child,
        position: child.position.clone(),
        rotation: child.rotation.clone(),
      })
    })

    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.userData.originalMaterial = child.material

        positions.push({
          object: child,
          position: child.position.clone(),
        })
      }
    })

    originalPositionsRef.current = positions
    originalGroupPositionsRef.current = originalGroupPositions
    setObjectList(objects)
  }

  const pullApart = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      const direction = child.position.clone().normalize()

      if (direction.length() === 0) {
        direction
          .set(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          )
          .normalize()
      }

      child.userData.targetPosition = child.position
        .clone()
        .add(direction.multiplyScalar(1.2))
        .add(direction.multiplyScalar(1.2))
    })
  }

  const resetParts = () => {
    originalPositionsRef.current.forEach((item) => {
      item.object.userData.targetPosition = item.position.clone()
    })
  }

  const resetMovedObjects = () => {
    originalGroupPositionsRef.current.forEach((item) => {
      item.object.userData.moveTargetPosition = item.position.clone()
      item.object.userData.moveTargetRotation = item.rotation.clone()
    })
  }

  const resetModelRotationForCut = () => {
    if (!modelScene) return

    modelScene.rotation.set(0, 0, 0)
    setTargetRotationY(0)
    setIsAutoRotating(false)
    focusTargetRef.current = null
  }

  const resetSection = () => {
    if (!modelScene) return

    const box = new THREE.Box3().setFromObject(modelScene)
    setCutX((box.min.x + box.max.x) / 2)
    resetModelRotationForCut()
  }

  const toggleCutSection = (setCutEnabled) => {
    resetSection()
    setCutEnabled((prev) => !prev)
  }

  const soloSelectedObject = (selectedObject) => {
    if (!selectedObject || !modelScene) {
      alert('Select an object first')
      return
    }

    modelScene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    selectedObject.traverse((child) => {
      if (child.isMesh) child.visible = true
    })
  }

  const hideSelectedObject = (selectedObject) => {
    if (!selectedObject) {
      alert('Select an object first')
      return
    }

    selectedObject.visible = false
    selectedObject.traverse((child) => {
      child.visible = false
    })

    setSelectedObject(null)
    setOutlineObjects([])
    setSelectedObjectName('')
  }

  const showAllObjects = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      child.visible = true
    })
  }

  const hideAllObjects = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    setSelectedObject(null)
    setOutlineObjects([])
    setSelectedObjectName('')
  }

  const resetAllTransforms = () => {
    resetParts()
    resetMovedObjects()
    resetModelRotationForCut()
  }

  return {
    handleModelLoaded,
    pullApart,
    resetParts,
    resetMovedObjects,
    resetModelRotationForCut,
    resetSection,
    toggleCutSection,
    soloSelectedObject,
    hideSelectedObject,
    showAllObjects,
    hideAllObjects,
    resetAllTransforms,
  }
}
