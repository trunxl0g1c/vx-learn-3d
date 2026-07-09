import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import { applyCutAway } from "../../../utils/cutAwayUtils"
import {
  applyModelShaderMode,
  initializePlayerModelScene,
} from "../../../engine/model"
import { createPlayerObjectSelectionPayload } from "../../../engine/selection"
import { buildObjectTree } from "../../../utils/objectTreeUtils"
import { createFocusTargetFromObject, createFocusTargetFromScene } from "../../../engine/camera"

import usePlayerAnimation from "./usePlayerAnimation"
import usePlayerSpeech from "./usePlayerSpeech"
import usePlayerProject, { DEFAULT_VIEWER_SETTINGS } from "./usePlayerProject"
import usePlayerChapter from "./usePlayerChapter"
import usePlayerFreePlay from "./usePlayerFreePlay"

const DEFAULT_PLAYER_CAMERA_DIRECTION = new THREE.Vector3(0.8, 0.45, 1)

function getMaterialList(material) {
  if (!material) return []

  return Array.isArray(material) ? material.filter(Boolean) : [material]
}

function clonePlayerMaterial(material) {
  if (Array.isArray(material)) {
    return material.map((item) => item?.clone?.() || item)
  }

  return material?.clone?.() || material
}

function applyPlayerPbrSettings(material, settings = {}) {
  const envIntensity = Number.isFinite(Number(settings.envIntensity))
    ? Number(settings.envIntensity)
    : 0.8
  const metalness = Number.isFinite(Number(settings.metalness))
    ? Number(settings.metalness)
    : 0.1
  const roughness = Number.isFinite(Number(settings.roughness))
    ? Number(settings.roughness)
    : 0.1

  getMaterialList(material).forEach((item) => {
    if (!item) return

    if ("envMapIntensity" in item) item.envMapIntensity = envIntensity
    if ("metalness" in item) item.metalness = metalness
    if ("roughness" in item) item.roughness = roughness

    item.needsUpdate = true
  })
}

function restorePlayerSceneMaterials(scene, settings = {}) {
  if (!scene) return

  scene.traverse((child) => {
    if (!child.isMesh) return

    const originalMaterial = child.userData?.originalMaterial

    if (originalMaterial) {
      child.material = clonePlayerMaterial(originalMaterial)
    }

    applyPlayerPbrSettings(child.material, settings)
    child.renderOrder = 0
  })
}

export default function usePlayerController() {
  const [material, setMaterial] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [modelScene, setModelScene] = useState(null)
  const [objectList, setObjectList] = useState([])

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
  const [showAnnotations, setShowAnnotations] = useState(true)

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
    viewerSettings,
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

  const createPlayerObjectList = (scene) => {
    if (!scene) return []

    return scene.children
      .filter((child) => child.type !== "Bone")
      .map((child) => buildObjectTree(child, 0))
  }

  const focusObject = (object) => {
    if (!object || !focusTargetRef) return

    const focusTarget = createFocusTargetFromObject(
      object,
      cameraRef?.current,
      controlsRef?.current,
      {
        distanceMultiplier: 1.8,
        minimumDistance: 0.1,
      },
    )

    if (!focusTarget) return

    focusTargetRef.current = focusTarget
  }

  const resetCameraToOverview = () => {
    if (!cameraRef?.current) return

    if (!modelScene) {
      cameraRef.current.position.set(0, 0, 5)
      controlsRef?.current?.target?.set?.(0, 0, 0)
      controlsRef?.current?.update?.()
      focusTargetRef.current = null
      return
    }

    const focusTarget = createFocusTargetFromScene(modelScene, {
      camera: cameraRef.current,
      distanceMultiplier: 1.7,
      minimumDistance: 1.1,
      direction: DEFAULT_PLAYER_CAMERA_DIRECTION,
    })

    if (!focusTarget) return

    if (focusTarget.cameraPosition) {
      cameraRef.current.position.copy(focusTarget.cameraPosition)
    }

    if (controlsRef?.current && focusTarget.target) {
      controlsRef.current.target.copy(focusTarget.target)
      controlsRef.current.update()
    }

    focusTargetRef.current = null
  }

  const xrayMaterialRef = useRef(
    new THREE.MeshPhysicalMaterial({
      color: "#4fc3f7",
      transparent: true,
      opacity: 0.22,
      roughness: 0.2,
      metalness: 0,
      depthWrite: false,
      depthTest: true,
    }),
  )

  const isObjectInsideTarget = (object, targetObject) => {
    let current = object

    while (current) {
      if (current === targetObject) return true
      current = current.parent
    }

    return false
  }

  const resetPlayerObjectXray = () => {
    if (!modelScene) {
      setSelectedObject(null)
      setOutlineObjects([])
      return
    }

    // Restore directly from the immutable GLB material cache. This is more
    // reliable than re-applying a shader mode after object-list xray because
    // several meshes may currently share the temporary xray material.
    restorePlayerSceneMaterials(modelScene, viewerSettings)

    setSelectedObject(null)
    setOutlineObjects([])
  }

  const makePlayerXrayExcept = (targetObject) => {
    if (!modelScene || !targetObject) {
      resetPlayerObjectXray()
      return
    }

    // Always start from the original material cache before applying xray so
    // repeated Select/Deselect operations cannot leave stale xray materials.
    restorePlayerSceneMaterials(modelScene, viewerSettings)

    const outlineMeshes = []

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      if (isObjectInsideTarget(child, targetObject)) {
        outlineMeshes.push(child)
        child.renderOrder = 999

        if (child.material) {
          child.material.needsUpdate = true
        }

        return
      }

      child.material = xrayMaterialRef.current
      child.renderOrder = 0
      child.material.needsUpdate = true
    })

    setSelectedObject(targetObject)
    setOutlineObjects(outlineMeshes)
  }

  const setObjectListSelectedObject = (targetObject) => {
    if (!targetObject) {
      resetPlayerObjectXray()
      return
    }

    makePlayerXrayExcept(targetObject)
  }

  const hideAllObjects = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    setSelectedObject(null)
    setOutlineObjects([])
  }

  const resetAllPlayerView = () => {
    playerFreePlay.resetAllTransforms?.()
    playerFreePlay.resetSection?.()
    restorePlayerSceneMaterials(modelScene, viewerSettings)
    setSelectedObject(null)
    setOutlineObjects([])
    setActiveChapterId(null)
    playerAnimation.stopChapterAnimations?.()
    resetCameraToOverview()
  }

  const handleModelLoaded = (scene) => {
    setModelScene(scene)
    setObjectList(createPlayerObjectList(scene))

    const modelInit = initializePlayerModelScene({
      scene,
      material,
      modelScene,
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

    // Initial player load must show the full model overview.
    // Chapter selection, object highlight, and camera focus happen only after
    // the user explicitly selects a chapter/object.
    setSelectedObject(null)
    setOutlineObjects([])
    focusTargetRef.current = null

    setActiveMenu(null)
    setShowInfoPanel(false)
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
      modelScene,
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
      objectList,
      focusObject,
      makeXrayExcept: makePlayerXrayExcept,
      resetXray: resetPlayerObjectXray,
      setObjectListSelectedObject,
      activeChapter: playerChapter.activeChapter,
      selectedAnimations: playerAnimation.selectedAnimations,
      animationCommand: playerAnimation.animationCommand,
      handleSelectObjectFromPlayer,
      handleModelLoaded,
      setAnimations: playerAnimation.setAnimations,
      showAnnotations,
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
      isPullApartActive: playerFreePlay.isPullApartActive,
      resetAllTransforms: resetAllPlayerView,
      soloSelectedObject: playerFreePlay.soloSelectedObject,
      showAllObjects: playerFreePlay.showAllObjects,
      hideAllObjects,
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

    settingsPanel: {
      showAnnotations,
      setShowAnnotations,
      resetAll: resetAllPlayerView,
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
      resetAllTransforms: resetAllPlayerView,
      activeChapterId,
      handleSelectChapter: playerChapter.handleSelectChapter,
      freePlayMenu,
      activeMenu,
      showInfoPanel,
    },
  }
}
