import { useCallback, useEffect, useState } from 'react'
import * as THREE from 'three'

const DEFAULT_METALNESS = 0.1
const DEFAULT_ROUGHNESS = 0.1
const DEFAULT_ENV_INTENSITY = 0.8

function normalizeSliderValue(value, fallback) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return fallback

  return numericValue
}


function normalizeShaderMode(mode) {
  return mode === 'enhanced' ? 'original' : mode || 'original'
}

function getMaterialList(material) {
  if (!material) return []

  return Array.isArray(material) ? material.filter(Boolean) : [material]
}

function cloneMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((item) => item?.clone?.() || item)
  }

  return material?.clone?.() || material
}

function ensureOriginalMaterial(mesh) {
  if (!mesh?.material) return null

  if (!mesh.userData.originalMaterial) {
    mesh.userData.originalMaterial = cloneMaterial(mesh.material)
  }

  return mesh.userData.originalMaterial
}

function applyPbrSettings(material, settings) {
  getMaterialList(material).forEach((item) => {
    if (!item) return

    if ('envMapIntensity' in item) {
      item.envMapIntensity = settings.envIntensity
    }

    if ('metalness' in item) {
      item.metalness = settings.metalness
    }

    if ('roughness' in item) {
      item.roughness = settings.roughness
    }

    item.needsUpdate = true
  })
}

function markMaterialNeedsUpdate(material) {
  getMaterialList(material).forEach((item) => {
    if (item) item.needsUpdate = true
  })
}

function createShaderMaterial(originalMaterial, mode, settings) {
  if (mode === 'wireframe') {
    const material = cloneMaterial(originalMaterial)

    getMaterialList(material).forEach((item) => {
      item.wireframe = true
    })

    return material
  }

  if (mode === 'toon') {
    const firstMaterial = getMaterialList(originalMaterial)[0]

    return new THREE.MeshToonMaterial({
      color: firstMaterial?.color || new THREE.Color('#ffffff'),
    })
  }

  if (mode === 'xray') {
    return new THREE.MeshPhysicalMaterial({
      color: '#4fc3f7',
      transparent: true,
      opacity: 0.22,
      roughness: 0.2,
      metalness: 0,
      depthWrite: false,
    })
  }

  if (mode === 'clay') {
    return new THREE.MeshStandardMaterial({
      color: '#c9b8a4',
      roughness: 1,
      metalness: 0,
    })
  }

  const material = cloneMaterial(originalMaterial)

  if (mode === 'original') {
    applyPbrSettings(material, settings)
    return material
  }


  applyPbrSettings(material, settings)

  return material
}

function getActiveRenderers() {
  return [window.__EDITOR_RENDERER__, window.__PLAYER_RENDERER__].filter(Boolean)
}

export function useShaderManager({ modelScene, viewerSettings, setViewerSettings }) {
  const [shaderMode, setShaderMode] = useState(() => normalizeShaderMode(viewerSettings?.shaderMode))
  const [metalness, setLocalMetalness] = useState(
    normalizeSliderValue(viewerSettings?.metalness, DEFAULT_METALNESS),
  )
  const [roughness, setLocalRoughness] = useState(
    normalizeSliderValue(viewerSettings?.roughness, DEFAULT_ROUGHNESS),
  )

  const syncViewerSetting = useCallback(
    (key, value) => {
      setViewerSettings((prev) => ({
        ...prev,
        [key]: value,
      }))
    },
    [setViewerSettings],
  )

  const setMetalness = useCallback(
    (value) => {
      const nextValue = normalizeSliderValue(value, DEFAULT_METALNESS)

      setLocalMetalness(nextValue)
      syncViewerSetting('metalness', nextValue)
    },
    [syncViewerSetting],
  )

  const setRoughness = useCallback(
    (value) => {
      const nextValue = normalizeSliderValue(value, DEFAULT_ROUGHNESS)

      setLocalRoughness(nextValue)
      syncViewerSetting('roughness', nextValue)
    },
    [syncViewerSetting],
  )

  const applyShaderModeToScene = useCallback(
    (mode) => {
      if (!modelScene) return

      const nextMode = normalizeShaderMode(mode)

      const settings = {
        metalness,
        roughness,
        envIntensity: normalizeSliderValue(
          viewerSettings?.envIntensity,
          DEFAULT_ENV_INTENSITY,
        ),
      }

      modelScene.traverse((child) => {
        if (!child.isMesh || !child.material) return

        const original = ensureOriginalMaterial(child)
        if (!original) return

        child.material = createShaderMaterial(original, nextMode, settings)
        markMaterialNeedsUpdate(child.material)
      })
    },
    [metalness, modelScene, roughness, viewerSettings?.envIntensity],
  )

  const applyShaderMode = useCallback(
    (mode) => {
      const nextMode = normalizeShaderMode(mode)

      setShaderMode(nextMode)
      syncViewerSetting('shaderMode', nextMode)
      applyShaderModeToScene(nextMode)
    },
    [applyShaderModeToScene, syncViewerSetting],
  )

  const updateEnvIntensity = useCallback(
    (value) => {
      const nextValue = normalizeSliderValue(value, DEFAULT_ENV_INTENSITY)

      syncViewerSetting('envIntensity', nextValue)

      if (!modelScene) return

      modelScene.traverse((child) => {
        if (!child.isMesh || !child.material) return

        applyPbrSettings(child.material, {
          metalness,
          roughness,
          envIntensity: nextValue,
        })
      })
    },
    [metalness, modelScene, roughness, syncViewerSetting],
  )

  useEffect(() => {
    setLocalMetalness(normalizeSliderValue(viewerSettings?.metalness, DEFAULT_METALNESS))
  }, [viewerSettings?.metalness])

  useEffect(() => {
    setLocalRoughness(normalizeSliderValue(viewerSettings?.roughness, DEFAULT_ROUGHNESS))
  }, [viewerSettings?.roughness])

  useEffect(() => {
    if (viewerSettings?.shaderMode) {
      setShaderMode(normalizeShaderMode(viewerSettings.shaderMode))
    }
  }, [viewerSettings?.shaderMode])

  useEffect(() => {
    getActiveRenderers().forEach((renderer) => {
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = normalizeSliderValue(viewerSettings?.exposure, 1)
    })
  }, [viewerSettings?.exposure])

  useEffect(() => {
    if (!modelScene) return

    applyShaderModeToScene(shaderMode)
  }, [applyShaderModeToScene, modelScene, shaderMode])

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
