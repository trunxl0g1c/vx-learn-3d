import { useEffect, useState } from 'react'
import * as THREE from 'three'

export function useShaderManager({ modelScene, viewerSettings, setViewerSettings }) {
  const [shaderMode, setShaderMode] = useState('original')
  const [metalness, setMetalness] = useState(0.3)
  const [roughness, setRoughness] = useState(0.8)

  const applyShaderMode = (mode) => {
    if (!modelScene) return

    setShaderMode(mode)

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      const original = child.userData.originalMaterial
      if (!original) return

      if (mode === 'original') {
        child.material = original.clone()
      }

      if (mode === 'wireframe') {
        child.material = original.clone()
        child.material.wireframe = true
      }

      if (mode === 'toon') {
        child.material = new THREE.MeshToonMaterial({
          color: original.color || new THREE.Color('#ffffff'),
        })
      }

      if (mode === 'xray') {
        child.material = new THREE.MeshPhysicalMaterial({
          color: '#4fc3f7',
          transparent: true,
          opacity: 0.22,
          roughness: 0.2,
          metalness: 0,
          depthWrite: false,
        })
      }

      if (mode === 'clay') {
        child.material = new THREE.MeshStandardMaterial({
          color: '#c9b8a4',
          roughness: 1,
          metalness: 0,
        })
      }

      if (mode === 'enhanced') {
        child.material = original.clone()

        if ('envMapIntensity' in child.material) {
          child.material.envMapIntensity = viewerSettings.envIntensity ?? 3
        }

        if ('metalness' in child.material) {
          child.material.metalness = (original.metalness ?? 1) * metalness
        }

        if ('roughness' in child.material) {
          child.material.roughness = (original.roughness ?? 1) * roughness
        }
      }

      child.material.needsUpdate = true
    })
  }

  const updateEnvIntensity = (value) => {
    setViewerSettings((prev) => ({
      ...prev,
      envIntensity: value,
    }))

    if (!modelScene) return

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      if (child.material) {
        child.material.envMapIntensity = value
        child.material.needsUpdate = true
      }
    })
  }

  useEffect(() => {
    if (shaderMode === 'enhanced') {
      applyShaderMode('enhanced')
    }
  }, [metalness, roughness, viewerSettings.envIntensity])

  return {
    shaderMode,
    setShaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    applyShaderMode,
    updateEnvIntensity,
  }
}
