import { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import useProjectLoader from "../../../engine/project/useProjectLoader"
import { useGlobalLoading } from "../../loading/LoadingContext"
import { importVXPack, isVXPackFile } from "../../../utils/vxpackUtils"
import { DEFAULT_VIEWER_BACKGROUND } from "../../../utils/viewerBackground"
import { normalizePlayerSettings } from "../../material/playerSettings"
import {
  normalizeFlowDefinition,
  normalizeFlowDefinitions,
} from "../../../engine/flow"
import {
  normalizeProceduralDefinition,
  normalizeProceduralDefinitions,
} from "../../../engine/procedural"
import {
  getChapterFromIndexedDb,
  getFlowFromIndexedDb,
  getProcedureFromIndexedDb,
} from "../../project-hub/storage/projectIndexedDb"
import {
  isLazyMaterialRecord,
  replaceMaterialRecord,
} from "../../../engine/project/LazyMaterialRecords"
import {
  DEFAULT_BLINK_SELECTION_SETTINGS,
  normalizeBlinkSelectionSettings,
} from "../../../engine/selection"

export const DEFAULT_VIEWER_SETTINGS = {
  exposure: 0.75,
  ambientLight: 0.5,
  mainLight: 0.8,
  fillLight: 0.5,
  hemiLight: 0.5,
  envIntensity: 0.8,
  hdri: "",
  hdriSource: "preset",
  customHdri: null,
  showHdriBackground: false,
  shaderMode: "original",
  metalness: 0.1,
  roughness: 0.1,
  cameraProjectionMode: "perspective",
  blinkSettings: { ...DEFAULT_BLINK_SELECTION_SETTINGS },
  background: DEFAULT_VIEWER_BACKGROUND,
}

export default function usePlayerProject({
  setMaterial,
  setActiveChapterId,
  setViewerSettings,
  resetPlayerState,
  resetAnimationState,
}) {
  const { projectId } = useParams()
  const { updateLoading, hideLoading } = useGlobalLoading()
  const loadingSessionRef = useRef(0)
  const expectedSceneIdRef = useRef(null)
  const readyTimerRef = useRef(null)
  const [isSceneReady, setIsSceneReady] = useState(
    !projectId || projectId === "demo",
  )

  const {
    loadProject,
    isLoadingProject,
    loadError,
  } = useProjectLoader()

  const pendingMaterialRecordLoadsRef = useRef(new Map())

  useEffect(() => {
    pendingMaterialRecordLoadsRef.current.clear()
  }, [projectId])

  const hydrateMaterialRecord = useCallback(
    async (field, recordId, getter, normalizeRecord = null) => {
      if (!projectId || !recordId) return null

      const requestKey = `${projectId}:${field}:${recordId}`
      const pendingRequest =
        pendingMaterialRecordLoadsRef.current.get(requestKey)

      if (pendingRequest) return pendingRequest

      const request = getter(projectId, recordId)
        .then((storedRecord) => {
          if (!storedRecord) return null

          const hydratedRecord = normalizeRecord
            ? normalizeRecord(storedRecord)
            : storedRecord

          setMaterial((currentMaterial) => {
            if (currentMaterial?.projectId !== projectId) {
              return currentMaterial
            }

            const currentRecord = currentMaterial?.[field]?.find(
              (record) => record?.id === recordId,
            )

            if (!isLazyMaterialRecord(currentRecord, field)) {
              return currentMaterial
            }

            return {
              ...currentMaterial,
              [field]: replaceMaterialRecord(
                currentMaterial?.[field],
                recordId,
                hydratedRecord,
              ),
            }
          })

          return hydratedRecord
        })
        .finally(() => {
          pendingMaterialRecordLoadsRef.current.delete(requestKey)
        })

      pendingMaterialRecordLoadsRef.current.set(requestKey, request)
      return request
    },
    [projectId, setMaterial],
  )

  const loadChapterRecord = useCallback(
    (chapterId) =>
      hydrateMaterialRecord("chapters", chapterId, getChapterFromIndexedDb),
    [hydrateMaterialRecord],
  )

  const loadFlowRecord = useCallback(
    (flowId) =>
      hydrateMaterialRecord(
        "flows",
        flowId,
        getFlowFromIndexedDb,
        normalizeFlowDefinition,
      ),
    [hydrateMaterialRecord],
  )

  const loadProcedureRecord = useCallback(
    (procedureId) =>
      hydrateMaterialRecord(
        "procedures",
        procedureId,
        getProcedureFromIndexedDb,
        normalizeProceduralDefinition,
      ),
    [hydrateMaterialRecord],
  )

  const clearReadyTimer = useCallback(() => {
    if (readyTimerRef.current !== null) {
      clearTimeout(readyTimerRef.current)
      readyTimerRef.current = null
    }
  }, [])

  const beginPlayerSceneLoad = useCallback(
    ({ title = "Opening Player", text = "Loading project for player..." } = {}) => {
      loadingSessionRef.current += 1
      expectedSceneIdRef.current = null
      clearReadyTimer()
      setIsSceneReady(false)
      updateLoading({
        title,
        text,
        progress: 10,
      })

      return loadingSessionRef.current
    },
    [clearReadyTimer, updateLoading],
  )

  const notifyModelLoaded = useCallback(
    (scene) => {
      expectedSceneIdRef.current = scene?.uuid || scene?.id || null
      updateLoading({
        title: "Opening Player",
        text: "Preparing scene and applying default camera view...",
        progress: 88,
      })
    },
    [updateLoading],
  )

  const notifySceneReady = useCallback(
    ({ sceneId } = {}) => {
      const expectedSceneId = expectedSceneIdRef.current

      if (expectedSceneId && sceneId && expectedSceneId !== sceneId) {
        return
      }

      const sessionId = loadingSessionRef.current
      clearReadyTimer()
      updateLoading({
        title: "Opening Player",
        text: "Player is ready.",
        progress: 100,
      })

      // Keep the cover visible for one final paint after the camera, projection,
      // controls target, and stored model rotation have all settled.
      readyTimerRef.current = setTimeout(() => {
        if (loadingSessionRef.current !== sessionId) return

        setIsSceneReady(true)
        hideLoading()
        readyTimerRef.current = null
      }, 120)
    },
    [clearReadyTimer, hideLoading, updateLoading],
  )

  useEffect(() => {
    if (!projectId || projectId === "demo") {
      expectedSceneIdRef.current = null
      setIsSceneReady(true)
      hideLoading()
      return undefined
    }

    let cancelled = false
    const sessionId = beginPlayerSceneLoad()

    async function openProjectForPlayer() {
      try {
        const loaded = await loadProject(projectId)

        if (cancelled || loadingSessionRef.current !== sessionId) return

        if (!loaded) {
          setIsSceneReady(false)
          updateLoading({
            title: "Failed to Open Player",
            text: "Project data or GLB file could not be loaded.",
            progress: 0,
          })

          readyTimerRef.current = setTimeout(() => {
            if (loadingSessionRef.current !== sessionId) return
            hideLoading()
            readyTimerRef.current = null
          }, 1200)
          return
        }

        const nextMaterial =
          loaded.material ||
          loaded.projectDraft?.material ||
          loaded.project?.material ||
          null

        const nextViewer =
          loaded.viewer ||
          loaded.projectDraft?.viewer ||
          loaded.project?.viewer ||
          null

        updateLoading({
          title: "Opening Player",
          text: "Loading 3D object...",
          progress: 62,
        })

        if (nextMaterial) {
          setMaterial({
            ...nextMaterial,
            projectId: loaded.projectId || projectId,
            projectName: loaded.projectName || loaded.project?.name || "",
            playerSettings: normalizePlayerSettings(nextMaterial.playerSettings),
            flows: normalizeFlowDefinitions(nextMaterial.flows),
            procedures: normalizeProceduralDefinitions(nextMaterial.procedures),

            modelUrl: loaded.glbUrl,
            modelFileName: loaded.glbFileName || "model.glb",

            model: {
              ...(nextMaterial.model || {}),
              uri: loaded.glbUrl,
              fileName: loaded.glbFileName || "model.glb",
            },
          })

          setActiveChapterId(null)
        }

        if (nextViewer) {
          setViewerSettings((prev) => ({
            ...prev,
            ...nextViewer,
            blinkSettings: normalizeBlinkSelectionSettings(
              nextViewer?.blinkSettings || prev?.blinkSettings,
            ),
            background: {
              ...(prev?.background || {}),
              ...(nextViewer?.background || {}),
            },
          }))
        }

        resetPlayerState?.({
          activeMenu: null,
          freePlay: false,
          freePlayMenu: false,
          showInfoPanel: false,
        })
        resetAnimationState?.()

        const hasModel = Boolean(
          loaded.glbUrl || nextMaterial?.modelUrl || nextMaterial?.model?.uri,
        )

        if (!nextMaterial || !hasModel) {
          notifySceneReady()
        }
      } catch (error) {
        if (cancelled || loadingSessionRef.current !== sessionId) return

        console.error("Gagal membuka project player:", error)
        setIsSceneReady(false)
        updateLoading({
          title: "Failed to Open Player",
          text: error?.message || "Unknown error",
          progress: null,
        })

        readyTimerRef.current = setTimeout(() => {
          if (loadingSessionRef.current !== sessionId) return
          hideLoading()
          readyTimerRef.current = null
        }, 1200)
      }
    }

    openProjectForPlayer()

    return () => {
      cancelled = true
      loadingSessionRef.current += 1
      expectedSceneIdRef.current = null
      clearReadyTimer()
      hideLoading()
    }
  }, [
    projectId,
    loadProject,
    beginPlayerSceneLoad,
    clearReadyTimer,
    hideLoading,
    notifySceneReady,
    updateLoading,
  ])

  const loadPlayerFile = async (file) => {
    if (!file) return

    const sessionId = beginPlayerSceneLoad({
      text: "Reading Player package...",
    })

    try {
      let json = null

      if (isVXPackFile(file)) {
        const { manifest } = await importVXPack(file)
        json = manifest
      } else {
        const text = await file.text()
        json = JSON.parse(text)
      }

      if (loadingSessionRef.current !== sessionId) return

      updateLoading({
        text: "Loading 3D object...",
        progress: 62,
      })

      setMaterial({
        ...json,
        projectId: json.projectId || projectId || null,
        playerSettings: normalizePlayerSettings(json.playerSettings),
        flows: normalizeFlowDefinitions(json.flows),
        procedures: normalizeProceduralDefinitions(json.procedures),
      })
      setActiveChapterId(null)
      resetPlayerState?.({
        activeMenu: null,
        freePlay: false,
        freePlayMenu: false,
        showInfoPanel: false,
      })
      resetAnimationState?.()

      if (json.viewerSettings) {
        setViewerSettings((prev) => ({
          ...prev,
          ...json.viewerSettings,
          blinkSettings: normalizeBlinkSelectionSettings(
            json.viewerSettings?.blinkSettings || prev?.blinkSettings,
          ),
          background: {
            ...(prev?.background || {}),
            ...(json.viewerSettings?.background || {}),
          },
        }))
      }

      const hasModel = Boolean(json.modelUrl || json.model?.uri)
      if (!hasModel) notifySceneReady()
    } catch (error) {
      console.error("Gagal membuka file player:", error)
      setIsSceneReady(false)
      hideLoading()
      alert(error.message || "Failed to open file.")
    }
  }

  return {
    isLoadingProject,
    isSceneReady,
    loadError,
    loadPlayerFile,
    loadChapterRecord,
    loadFlowRecord,
    loadProcedureRecord,
    notifyModelLoaded,
    notifySceneReady,
  }
}
