import { useEffect, useRef, useState } from "react"

import { applyCutAway } from "../../../utils/cutAwayUtils"
import {
  applyModelShaderMode,
  initializePlayerModelScene,
} from "../../../engine/model"
import { createPlayerObjectSelectionPayload } from "../../../engine/selection"

import usePlayerAnimation from "./usePlayerAnimation"
import usePlayerSpeech from "./usePlayerSpeech"
import usePlayerProject, { DEFAULT_VIEWER_SETTINGS } from "./usePlayerProject"
import usePlayerChapter from "./usePlayerChapter"
import usePlayerFreePlay from "./usePlayerFreePlay"

export default function usePlayerController() {
  const [material, setMaterial] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [modelScene, setModelScene] = useState(null)

  const [freePlay, setFreePlay] = useState(false)
  const [freePlayMenu, setFreePlayMenu] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)

  const [outlineObjects, setOutlineObjects] = useState([])
  const [selectedObject, setSelectedObject] = useState(null)
  const [originalPositions, setOriginalPositions] = useState([])
  const [originalGroupPositions, setOriginalGroupPositions] = useState([])

  const [transformMode, setTransformMode] = useState("translate")

  const [cutEnabled, setCutEnabled] = useState(false)
  const [cutAxis, setCutAxis] = useState("x")
  const [cutValue, setCutValue] = useState(0)
  const [cutValues, setCutValues] = useState({ x: 0, y: 0, z: 0 })
  const [cutRanges, setCutRanges] = useState({
    x: { min: -3, max: 3 },
    y: { min: -3, max: 3 },
    z: { min: -3, max: 3 },
  })
  const [cutMin, setCutMin] = useState(-3)
  const [cutMax, setCutMax] = useState(3)
  const cutBoundsRef = useRef(null)

  const [viewerSettings, setViewerSettings] = useState(DEFAULT_VIEWER_SETTINGS)

  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const focusTargetRef = useRef(null)

  const playerAnimation = usePlayerAnimation(
    material?.chapters?.find((chapter) => chapter.id === activeChapterId)
  )

  const resetPlayerState = ({
    activeMenu: nextActiveMenu,
    freePlay: nextFreePlay,
    freePlayMenu: nextFreePlayMenu,
    showInfoPanel: nextShowInfoPanel,
  }) => {
    setActiveMenu(nextActiveMenu)
    setFreePlay(nextFreePlay)
    setFreePlayMenu(nextFreePlayMenu)
    setShowInfoPanel(nextShowInfoPanel)
    setSelectedObject(null)
    setOutlineObjects([])
  }

  const playerProject = usePlayerProject({
    setMaterial,
    setActiveChapterId,
    setViewerSettings,
    resetPlayerState,
    resetAnimationState: playerAnimation.resetAnimationState,
  })

  const playerChapter = usePlayerChapter({
    material,
    activeChapterId,
    setActiveChapterId,
    modelScene,
    focusTargetRef,
    setSelectedObject,
    setOutlineObjects,
    playerAnimation,
  })

  const playerSpeech = usePlayerSpeech(playerChapter.activeChapter)

  const playerFreePlay = usePlayerFreePlay({
    modelScene,
    selectedObject,
    originalPositions,
    originalGroupPositions,
    cutAxis,
    cutBoundsRef,
    setCutAxis,
    setCutMin,
    setCutMax,
    setCutValue,
    cutValues,
    setCutValues,
    setCutRanges,
    setCutEnabled,
    setSelectedObject,
    setOutlineObjects,
    focusTargetRef,
  })

  useEffect(() => {
    applyCutAway(modelScene, cutEnabled, cutValues, cutAxis, cutBoundsRef.current)
  }, [modelScene, cutEnabled, cutValues, cutAxis])

  useEffect(() => {
    if (!modelScene) return

    applyModelShaderMode(modelScene, viewerSettings)

    if (window.__PLAYER_RENDERER__) {
      window.__PLAYER_RENDERER__.toneMappingExposure =
        viewerSettings.exposure
    }

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      if (child.material) {
        child.material.envMapIntensity = viewerSettings.envIntensity ?? 3
        child.material.needsUpdate = true
      }
    })
  }, [viewerSettings, modelScene])

  const handleModelLoaded = (scene) => {
    setModelScene(scene)

    const modelInit = initializePlayerModelScene({
      scene,
      material,
      viewerSettings,
      cutAxis: "x",
    })

    cutBoundsRef.current = modelInit.cutBounds

    if (modelInit.cutBounds) {
      setCutRanges(modelInit.cutBounds)
      const nextValues = {
        x: modelInit.cutBounds.x?.max ?? 0,
        y: modelInit.cutBounds.y?.max ?? 0,
        z: modelInit.cutBounds.z?.max ?? 0,
      }
      setCutValues(nextValues)
      setCutValue(nextValues.x)
    }

    if (modelInit.cutState) {
      setCutMin(modelInit.cutState.min)
      setCutMax(modelInit.cutState.max)
    }

    setOriginalPositions(modelInit.originalPositions)
    setOriginalGroupPositions(modelInit.originalGroupPositions)

    setSelectedObject(modelInit.chapterHighlight.selectedObject)
    setOutlineObjects(modelInit.chapterHighlight.outlineObjects)

    if (modelInit.focusTarget) {
      focusTargetRef.current = modelInit.focusTarget
    }

    setTimeout(() => {
      setActiveMenu("chapters")
      setShowInfoPanel(true)
    }, 300)
  }

  const handleSelectObjectFromPlayer = (object) => {
    if (!object) return

    const selection = createPlayerObjectSelectionPayload(
      object,
      material?.chapters || []
    )

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)

    if (selection.chapterId) {
      playerChapter.handleSelectChapter(selection.chapterId)
    }
  }

  return {
    status: {
      isLoadingProject: playerProject.isLoadingProject,
      loadError: playerProject.loadError,
    },

    scene: {
      material,
      viewerSettings,
      outlineObjects,
      setOutlineObjects,
      setSelectedObject,
      cameraRef,
      controlsRef,
      focusTargetRef,
      freePlay,
      selectedObject,
      transformMode,
      activeChapter: playerChapter.activeChapter,
      selectedAnimations: playerAnimation.selectedAnimations,
      animationCommand: playerAnimation.animationCommand,
      handleSelectObjectFromPlayer,
      handleModelLoaded,
      setAnimations: playerAnimation.setAnimations,
    },

    chapterPanel: {
      freePlay,
      showInfoPanel,
      activeChapter: playerChapter.activeChapter,
      speakChapterDescription: playerSpeech.speakChapterDescription,
      stopSpeaking: playerSpeech.stopSpeaking,
      playChapterAnimations: playerAnimation.playChapterAnimations,
      stopChapterAnimations: playerAnimation.stopChapterAnimations,
    },

    toolsMenu: {
      freePlay,
      freePlayMenu,
      cutEnabled,
      toggleCutSection: playerFreePlay.toggleCutSection,
      hideSelectedObject: playerFreePlay.hideSelectedObject,
      pullApart: playerFreePlay.pullApart,
      resetAllTransforms: playerFreePlay.resetAllTransforms,
      soloSelectedObject: playerFreePlay.soloSelectedObject,
      showAllObjects: playerFreePlay.showAllObjects,
    },

    cutSlider: {
      freePlay,
      cutEnabled,
      cutAxis,
      setCutAxis: playerFreePlay.updateCutAxis,
      cutValue,
      cutValues,
      cutRanges,
      cutMin,
      cutMax,
      setCutValue,
      updateCutValue: playerFreePlay.updateCutValue,
      resetCutValues: playerFreePlay.resetSection,
    },

    chapterList: {
      freePlay,
      activeMenu,
      material,
      activeChapterId,
      handleSelectChapter: playerChapter.handleSelectChapter,
    },

    toolbar: {
      loadPlayerFile: playerProject.loadPlayerFile,
      freePlay,
      setFreePlay,
      setFreePlayMenu,
      setActiveMenu,
      setShowInfoPanel,
      setOutlineObjects,
      stopChapterAnimations: playerAnimation.stopChapterAnimations,
      setCutEnabled,
      showAllObjects: playerFreePlay.showAllObjects,
      resetAllTransforms: playerFreePlay.resetAllTransforms,
      activeChapterId,
      handleSelectChapter: playerChapter.handleSelectChapter,
      freePlayMenu,
      activeMenu,
      showInfoPanel,
    },
  }
}
