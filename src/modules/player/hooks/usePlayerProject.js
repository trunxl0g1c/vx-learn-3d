import { useEffect } from "react"
import { useParams } from "react-router-dom"
import useProjectLoader from "../../../engine/project/useProjectLoader"
import { useGlobalLoading } from "../../loading/LoadingContext"
import { importVXPack, isVXPackFile } from "../../../utils/vxpackUtils"
import { DEFAULT_VIEWER_BACKGROUND } from "../../../utils/viewerBackground"

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

  const {
    loadProject,
    glbFileName,
    isLoadingProject,
    loadError,
  } = useProjectLoader()

  useEffect(() => {
    hideLoading()
  }, [hideLoading])

  useEffect(() => {
    if (!projectId || projectId === "demo") return

    let cancelled = false

    async function openProjectForPlayer() {
      try {
        updateLoading({
          title: "Opening Player",
          text: "Loading project for player...",
          progress: null,
        })

        const loaded = await loadProject(projectId)

        if (!loaded || cancelled) {
          hideLoading()
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

        if (nextMaterial) {
          setMaterial({
            ...nextMaterial,

            modelUrl: loaded.glbUrl,
            modelFileName: loaded.glbFileName || glbFileName,

            model: {
              ...(nextMaterial.model || {}),
              uri: loaded.glbUrl,
              fileName: loaded.glbFileName || glbFileName,
            },
          })

          setActiveChapterId(null)
        }

        if (nextViewer) {
          setViewerSettings((prev) => ({
            ...prev,
            ...nextViewer,
          }))
        }

        resetPlayerState?.({
          activeMenu: null,
          freePlay: false,
          freePlayMenu: false,
          showInfoPanel: false,
        })
        resetAnimationState?.()
      } catch (error) {
        console.error("Gagal membuka project player:", error)
      } finally {
        hideLoading()
      }
    }

    openProjectForPlayer()

    return () => {
      cancelled = true
      hideLoading()
    }
  }, [projectId, loadProject, glbFileName, updateLoading, hideLoading])

  const loadPlayerFile = async (file) => {
    if (!file) return

    try {
      let json = null

      if (isVXPackFile(file)) {
        const { manifest } = await importVXPack(file)
        json = manifest
      } else {
        const text = await file.text()
        json = JSON.parse(text)
      }

      setMaterial(json)
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
        }))
      }
    } catch (error) {
      console.error("Gagal membuka file player:", error)
      alert(error.message || "Failed to open file.")
    }
  }

  return {
    isLoadingProject,
    loadError,
    loadPlayerFile,
  }
}
