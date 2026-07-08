import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"

import useProjectLoader from "../../../engine/project/useProjectLoader"
import { useGlobalLoading } from "../../loading/LoadingContext"

export const DEFAULT_PLAYER_V2_VIEWER_SETTINGS = {
  exposure: 0.75,
  ambientLight: 0.5,
  mainLight: 0.8,
  fillLight: 0.5,
  hemiLight: 0.5,
  envIntensity: 0.8,
  hdri: "",
  showHdriBackground: false,
  shaderMode: "original",
  metalness: 0.1,
  roughness: 0.1,
}

function createV2MaterialFromLoadedProject(loaded, fallbackFileName) {
  const baseMaterial =
    loaded.material ||
    loaded.projectDraft?.material ||
    loaded.project?.material ||
    {}

  return {
    ...baseMaterial,
    title: baseMaterial.title || loaded.projectName || "Untitled Project",
    chapters: Array.isArray(baseMaterial.chapters) ? baseMaterial.chapters : [],

    modelUrl: loaded.glbUrl,
    modelFileName: loaded.glbFileName || fallbackFileName,

    model: {
      ...(baseMaterial.model || {}),
      uri: loaded.glbUrl,
      fileName: loaded.glbFileName || fallbackFileName,
    },
  }
}

export default function usePlayerV2Project() {
  const { projectId } = useParams()
  const { updateLoading, hideLoading } = useGlobalLoading()

  const {
    loadProject,
    glbFileName,
    isLoadingProject,
    loadError,
  } = useProjectLoader()

  const [material, setMaterial] = useState(null)
  const [viewerSettings, setViewerSettings] = useState(
    DEFAULT_PLAYER_V2_VIEWER_SETTINGS
  )
  const [projectInfo, setProjectInfo] = useState(null)

  useEffect(() => {
    hideLoading()
  }, [hideLoading])

  useEffect(() => {
    if (!projectId || projectId === "demo") return

    let cancelled = false

    async function openProjectForPlayerV2() {
      try {
        updateLoading({
          title: "Opening Player V2",
          text: "Loading project...",
          progress: null,
        })

        const loaded = await loadProject(projectId)

        if (!loaded || cancelled) {
          hideLoading()
          return
        }

        const nextMaterial = createV2MaterialFromLoadedProject(
          loaded,
          glbFileName
        )

        const nextViewer =
          loaded.viewer ||
          loaded.projectDraft?.viewer ||
          loaded.project?.viewer ||
          null

        setMaterial(nextMaterial)

        if (nextViewer) {
          setViewerSettings((prev) => ({
            ...prev,
            ...nextViewer,
          }))
        }

        setProjectInfo({
          id: loaded.projectId,
          name: loaded.projectName,
          fileName: loaded.glbFileName || glbFileName || "model.glb",
          chapterCount: nextMaterial.chapters.length,
        })
      } catch (error) {
        console.error("Gagal membuka project Player V2:", error)
      } finally {
        hideLoading()
      }
    }

    openProjectForPlayerV2()

    return () => {
      cancelled = true
      hideLoading()
    }
  }, [projectId, loadProject, glbFileName, updateLoading, hideLoading])

  return {
    material,
    viewerSettings,
    projectInfo,
    isLoadingProject,
    loadError,
  }
}
