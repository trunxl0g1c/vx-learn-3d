import { useCallback, useEffect, useState } from "react"
import {
  applyModelShaderMode,
  normalizeShaderMode,
} from "../engine/model/ModelSceneUtils"

const DEFAULT_METALNESS = 0.1
const DEFAULT_ROUGHNESS = 0.1
const DEFAULT_ENV_INTENSITY = 0.8

function normalizeSliderValue(value, fallback) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) return fallback

  return numericValue
}

export function useShaderManager({
  vxEngine,
  modelScene,
  viewerSettings,
  setViewerSettings,
}) {
  const [shaderMode, setShaderMode] = useState(() =>
    normalizeShaderMode(viewerSettings?.shaderMode),
  )
  const [shaderOutlineObjects, setShaderOutlineObjects] = useState([])
  const [shaderOutlineStyle, setShaderOutlineStyle] = useState(null)
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
      syncViewerSetting("metalness", nextValue)
    },
    [syncViewerSetting],
  )

  const setRoughness = useCallback(
    (value) => {
      const nextValue = normalizeSliderValue(value, DEFAULT_ROUGHNESS)

      setLocalRoughness(nextValue)
      syncViewerSetting("roughness", nextValue)
    },
    [syncViewerSetting],
  )

  const applyShaderModeToScene = useCallback(
    (mode, settingOverrides = {}) => {
      const nextMode = normalizeShaderMode(mode)
      const shaderSettings = {
        ...viewerSettings,
        ...settingOverrides,
        shaderMode: nextMode,
        metalness,
        roughness,
        envIntensity: normalizeSliderValue(
          settingOverrides.envIntensity ?? viewerSettings?.envIntensity,
          DEFAULT_ENV_INTENSITY,
        ),
      }

      const modelEngine = vxEngine?.model

      if (modelEngine && modelScene && modelEngine.getScene?.() !== modelScene) {
        modelEngine.setScene?.(modelScene)
      }

      const shaderState = modelEngine?.applyShaderMode
        ? modelEngine.applyShaderMode(shaderSettings)
        : applyModelShaderMode(modelScene, shaderSettings)

      setShaderOutlineObjects(shaderState.outlineObjects)
      setShaderOutlineStyle(shaderState.outlineStyle || null)
      return shaderState
    },
    [metalness, modelScene, roughness, viewerSettings, vxEngine],
  )

  const applyShaderMode = useCallback(
    (mode) => {
      const nextMode = normalizeShaderMode(mode)

      setShaderMode(nextMode)
      syncViewerSetting("shaderMode", nextMode)
      applyShaderModeToScene(nextMode)
    },
    [applyShaderModeToScene, syncViewerSetting],
  )

  const restoreShaderMode = useCallback(() => {
    return applyShaderModeToScene(shaderMode)
  }, [applyShaderModeToScene, shaderMode])

  const updateEnvIntensity = useCallback(
    (value) => {
      const nextValue = normalizeSliderValue(value, DEFAULT_ENV_INTENSITY)

      syncViewerSetting("envIntensity", nextValue)
      applyShaderModeToScene(shaderMode, { envIntensity: nextValue })
    },
    [applyShaderModeToScene, shaderMode, syncViewerSetting],
  )

  useEffect(() => {
    setLocalMetalness(
      normalizeSliderValue(viewerSettings?.metalness, DEFAULT_METALNESS),
    )
  }, [viewerSettings?.metalness])

  useEffect(() => {
    setLocalRoughness(
      normalizeSliderValue(viewerSettings?.roughness, DEFAULT_ROUGHNESS),
    )
  }, [viewerSettings?.roughness])

  useEffect(() => {
    const nextMode = normalizeShaderMode(viewerSettings?.shaderMode)
    setShaderMode(nextMode)
  }, [viewerSettings?.shaderMode])

  useEffect(() => {
    if (!modelScene) {
      setShaderOutlineObjects([])
      setShaderOutlineStyle(null)
      return
    }

    applyShaderModeToScene(shaderMode)
  }, [applyShaderModeToScene, modelScene, shaderMode])

  return {
    shaderMode,
    shaderOutlineObjects,
    shaderOutlineStyle,
    setShaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    applyShaderMode,
    restoreShaderMode,
    updateEnvIntensity,
  }
}
