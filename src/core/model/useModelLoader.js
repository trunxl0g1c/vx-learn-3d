import { useCallback, useEffect, useState } from "react"

export default function useModelLoader() {
  const [scene, setScene] = useState(null)
  const [animations, setAnimations] = useState([])
  const [isModelLoaded, setIsModelLoaded] = useState(false)
  const [modelError, setModelError] = useState(null)

  const clearModel = useCallback(() => {
    setScene((currentScene) => {
      if (currentScene) {
        currentScene.traverse((child) => {
          if (child.geometry) {
            child.geometry.dispose()
          }

          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose?.())
            } else {
              child.material.dispose?.()
            }
          }
        })
      }

      return null
    })

    setAnimations([])
    setIsModelLoaded(false)
    setModelError(null)
  }, [])

  const registerLoadedModel = useCallback((gltf) => {
    if (!gltf?.scene) {
      setModelError("Model GLB tidak valid.")
      return null
    }

    clearModel()

    const loadedScene = gltf.scene
    const loadedAnimations = gltf.animations || []

    loadedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone()
        child.userData.originalMaterial = child.material.clone()
        child.material.needsUpdate = true
      }
    })

    setScene(loadedScene)
    setAnimations(loadedAnimations)
    setIsModelLoaded(true)
    setModelError(null)

    return {
      scene: loadedScene,
      animations: loadedAnimations,
    }
  }, [clearModel])

  useEffect(() => {
    return () => {
      clearModel()
    }
  }, [clearModel])

  return {
    scene,
    animations,
    isModelLoaded,
    modelError,

    registerLoadedModel,
    clearModel,
  }
}