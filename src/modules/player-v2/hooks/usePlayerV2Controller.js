import { useEffect, useMemo, useRef, useState } from "react"

import {
  applyChapterModelRotation,
  applyModelShaderMode,
  applyObjectNameOverrides,
  createChapterFocusTarget,
  initializePlayerModelScene,
} from "../../../engine/model"
import usePlayerV2Project from "./usePlayerV2Project"
import usePlayerV2Selection from "./usePlayerV2Selection"
import usePlayerV2Camera from "./usePlayerV2Camera"

export default function usePlayerV2Controller() {
  const playerProject = usePlayerV2Project()

  const [modelScene, setModelScene] = useState(null)
  const [shaderOutlineObjects, setShaderOutlineObjects] = useState([])
  const [shaderOutlineStyle, setShaderOutlineStyle] = useState(null)
  const [, setAnimations] = useState([])
  const [activeChapterId, setActiveChapterId] = useState(null)

  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const focusTargetRef = useRef(null)

  const chapters = playerProject.material?.chapters || []
  const selection = usePlayerV2Selection({ chapters })
  const camera = usePlayerV2Camera({
    cameraRef,
    controlsRef,
    focusTargetRef,
    selectedObject: selection.selectedObject,
  })

  const activeChapter = useMemo(() => {
    return chapters.find((chapter) => chapter.id === activeChapterId) || null
  }, [chapters, activeChapterId])

  useEffect(() => {
    if (!chapters.length) {
      setActiveChapterId(null)
      selection.clearSelection()
      return
    }

    setActiveChapterId((currentId) => {
      const stillExists = chapters.some((chapter) => chapter.id === currentId)
      return stillExists ? currentId : chapters[0].id
    })
  }, [chapters])

  useEffect(() => {
    if (!modelScene) {
      setShaderOutlineObjects([])
      setShaderOutlineStyle(null)
      return
    }

    const shaderState = applyModelShaderMode(
      modelScene,
      playerProject.viewerSettings,
    )
    setShaderOutlineObjects(shaderState.outlineObjects)
    setShaderOutlineStyle(shaderState.outlineStyle || null)

    if (window.__PLAYER_RENDERER__) {
      window.__PLAYER_RENDERER__.toneMappingExposure =
        playerProject.viewerSettings.exposure
    }
  }, [modelScene, playerProject.viewerSettings])

  const applyChapterView = (chapter, sceneOverride = null) => {
    const scene = sceneOverride || modelScene

    if (!chapter) {
      selection.clearSelection()
      focusTargetRef.current = null
      return
    }

    if (scene) {
      selection.highlightChapterObject(chapter, scene)
      applyChapterModelRotation(scene, chapter)
    }

    const focusTarget = createChapterFocusTarget(chapter)
    if (focusTarget) {
      focusTargetRef.current = focusTarget
    }
  }

  const handleModelLoaded = (scene) => {
    if (!scene) return

    applyObjectNameOverrides(
      scene,
      playerProject.material?.objectNameOverrides,
    )
    setModelScene(scene)

    const modelState = initializePlayerModelScene({
      scene,
      material: playerProject.material,
      viewerSettings: playerProject.viewerSettings,
      cutAxis: "x",
    })

    setShaderOutlineObjects(modelState.shaderOutlineObjects || [])
    setShaderOutlineStyle(modelState.shaderOutlineStyle || null)

    const firstChapter = modelState.firstChapter || chapters[0] || null

    if (firstChapter) {
      setActiveChapterId(firstChapter.id)
      selection.highlightChapterObject(firstChapter, scene)
      focusTargetRef.current = modelState.focusTarget
    }
  }

  const handleSelectChapter = (chapterId) => {
    const chapter = chapters.find((item) => item.id === chapterId)
    if (!chapter) return

    setActiveChapterId(chapterId)
    applyChapterView(chapter)
  }

  const handleSelectObjectFromPlayer = (object) => {
    if (!object) return null

    // A single click only selects the exact object. Chapter playback remains
    // an explicit action and camera focus is handled by double click.
    return selection.selectObject(object)
  }

  const handleFocusSelectedObject = () => {
    camera.focusObject(selection.selectedObject)
  }

  const handleDoubleClickObjectFromPlayer = (object) => {
    if (!object) return

    handleSelectObjectFromPlayer(object)
    camera.focusObject(object)
  }

  const speakChapterDescription = () => {
    if (!activeChapter?.description) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(activeChapter.description)
    utterance.lang = "id-ID"
    utterance.rate = 1
    utterance.pitch = 1

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
  }

  const noopAnimationAction = () => {}

  return {
    status: {
      isLoadingProject: playerProject.isLoadingProject,
      loadError: playerProject.loadError,
    },

    project: playerProject.projectInfo,

    chapter: {
      chapters,
      activeChapter,
      activeChapterId,
      handleSelectChapter,
      speakChapterDescription,
      stopSpeaking,
      playChapterAnimations: noopAnimationAction,
      stopChapterAnimations: noopAnimationAction,
    },

    selection,

    camera: {
      focusSelectedObject: handleFocusSelectedObject,
      resetCamera: camera.resetCamera,
      restoreCameraState: camera.restoreCameraState,
      saveCameraState: camera.saveCameraState,
    },

    scene: {
      material: playerProject.material,
      viewerSettings: playerProject.viewerSettings,
      outlineObjects: selection.outlineObjects,
      shaderOutlineObjects,
      shaderOutlineStyle,
      setOutlineObjects: selection.setOutlineObjects,
      setSelectedObject: selection.setSelectedObject,
      cameraRef,
      controlsRef,
      focusTargetRef,
      freePlay: false,
      selectedObject: selection.selectedObject,
      transformMode: "translate",
      activeChapter,
      selectedAnimations: {},
      animationCommand: null,
      handleSelectObjectFromPlayer,
      handleDoubleClickObjectFromPlayer,
      handleModelLoaded,
      setAnimations,
    },

    capabilities: {
      projectLoading: true,
      modelRendering: true,
      chapters: chapters.length > 0,
      selection: true,
      freePlay: false,
      cut: false,
      animation: false,
    },
  }
}
