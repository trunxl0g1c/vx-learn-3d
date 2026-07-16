import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import {
  applyModelShaderMode,
  applyObjectNameOverrides,
  initializePlayerModelScene,
  releaseGeneratedModelMaterial,
} from "../../../engine/model"
import { createPlayerObjectSelectionPayload } from "../../../engine/selection"
import { buildObjectTreeList } from "../../../utils/objectTreeUtils"
import { createFocusTargetFromObject, createFocusTargetFromScene } from "../../../engine/camera"

import usePlayerAnimation from "./usePlayerAnimation"
import usePlayerSpeech from "./usePlayerSpeech"
import usePlayerProject, { DEFAULT_VIEWER_SETTINGS } from "./usePlayerProject"
import usePlayerChapter from "./usePlayerChapter"
import usePlayerFreePlay from "./usePlayerFreePlay"

const DEFAULT_PLAYER_CAMERA_DIRECTION = new THREE.Vector3(0.8, 0.45, 1)

function findObjectByReference(scene, reference) {
  if (!scene || !reference) return null

  if (Array.isArray(reference.path)) {
    let current = scene
    let pathIsValid = true

    reference.path.forEach((index) => {
      if (!pathIsValid || !current?.children?.[index]) {
        pathIsValid = false
        return
      }

      current = current.children[index]
    })

    if (pathIsValid && current) return current
  }

  if (reference.uuid) {
    const uuidMatch = scene.getObjectByProperty?.("uuid", reference.uuid)
    if (uuidMatch) return uuidMatch
  }

  const targetName = String(reference.name || "").trim()

  if (!targetName) return null

  let nameMatch = null

  scene.traverse((object) => {
    if (nameMatch) return

    if (String(object?.name || "").trim() === targetName) {
      nameMatch = object
    }
  })

  return nameMatch
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
  const [shaderOutlineObjects, setShaderOutlineObjects] = useState([])
  const [shaderOutlineStyle, setShaderOutlineStyle] = useState(null)
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
  const initialCameraStateRef = useRef(null)

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

  const clearActiveChapter = () => {
    setActiveChapterId(null)
    focusTargetRef.current = null
    playerAnimation.stopChapterAnimations?.()
    playerSpeech.stopSpeaking?.()
  }

  const playerFreePlay = usePlayerFreePlay({
    modelScene,
    selectedObject,
    originalPositions,
    originalGroupPositions,
    cutEnabled,
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
    if (!modelScene) {
      setShaderOutlineObjects([])
      setShaderOutlineStyle(null)
      return
    }

    const shaderState = applyModelShaderMode(modelScene, viewerSettings)
    setShaderOutlineObjects(shaderState.outlineObjects)
    setShaderOutlineStyle(shaderState.outlineStyle || null)

    if (window.__PLAYER_RENDERER__) {
      window.__PLAYER_RENDERER__.toneMappingExposure =
        viewerSettings.exposure
    }
  }, [viewerSettings, modelScene])

  const createPlayerObjectList = (scene) => {
    return buildObjectTreeList(scene)
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

  const captureInitialCameraState = (cameraState) => {
    if (!cameraState?.position || !cameraState?.target) return

    initialCameraStateRef.current = {
      sceneId: cameraState.sceneId || null,
      position: cameraState.position.clone(),
      quaternion: cameraState.quaternion?.clone?.() || null,
      target: cameraState.target.clone(),
      zoom: Number.isFinite(Number(cameraState.zoom))
        ? Number(cameraState.zoom)
        : 1,
    }
  }

  const resetCameraToOverview = () => {
    if (!cameraRef?.current) return

    const initialCameraState = initialCameraStateRef.current

    if (initialCameraState) {
      cameraRef.current.position.copy(initialCameraState.position)

      if (initialCameraState.quaternion) {
        cameraRef.current.quaternion.copy(initialCameraState.quaternion)
      }

      cameraRef.current.zoom = initialCameraState.zoom
      cameraRef.current.updateProjectionMatrix?.()

      if (controlsRef?.current) {
        controlsRef.current.target.copy(initialCameraState.target)
        controlsRef.current.update()
      }

      focusTargetRef.current = null
      return
    }

    if (!modelScene) {
      cameraRef.current.position.set(0, 0, 5)
      controlsRef?.current?.target?.set?.(0, 0, 0)
      controlsRef?.current?.update?.()
      focusTargetRef.current = null
      return
    }

    // Fallback for projects loaded before the initial camera snapshot is ready.
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

  const restorePlayerRenderMode = () => {
    const shaderState = applyModelShaderMode(modelScene, viewerSettings)
    setShaderOutlineObjects(shaderState.outlineObjects)

    return shaderState
  }

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

    // Restore the active project render mode from the immutable GLB material
    // cache so Toon/Clay/2D remain active after object-list X-Ray is cleared.
    restorePlayerRenderMode()

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
    restorePlayerRenderMode()

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

      releaseGeneratedModelMaterial(child)
      child.material = xrayMaterialRef.current
      child.userData.__vxGeneratedShaderMaterial = false
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
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])
    setActiveChapterId(null)
    playerAnimation.stopChapterAnimations?.()
    resetCameraToOverview()
  }

  const handleModelLoaded = (scene) => {
    initialCameraStateRef.current = null
    applyObjectNameOverrides(scene, material?.objectNameOverrides)
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
    setShaderOutlineObjects(modelInit.shaderOutlineObjects || [])
    setShaderOutlineStyle(modelInit.shaderOutlineStyle || null)

    // Initial player load must show the full model overview.
    // Chapter selection, object highlight, and camera focus happen only after
    // the user explicitly selects a chapter/object.
    setSelectedObject(null)
    setOutlineObjects([])
    focusTargetRef.current = null

    setActiveMenu(null)
    setShowInfoPanel(false)
  }

  const applyHiddenVisualObjects = (visualState) => {
    const hiddenObjects = visualState?.visibility?.hiddenObjects || []

    hiddenObjects.forEach((reference) => {
      const object = findObjectByReference(modelScene, reference)
      if (object) object.visible = false
    })
  }

  const handleSelectChapter = (chapterId) => {
    const chapter = material?.chapters?.find((item) => item.id === chapterId)

    if (!chapter) return

    playerFreePlay.resetVisualState?.()
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])

    playerChapter.handleSelectChapter(chapterId)

    const visualState = chapter.visualState

    if (!visualState) return

    const pullApartTarget = findObjectByReference(
      modelScene,
      visualState.pullApart?.targetObject,
    )
    playerFreePlay.applySavedPullApart?.(
      visualState.pullApart,
      pullApartTarget,
    )

    applyHiddenVisualObjects(visualState)

    const xrayTarget = findObjectByReference(
      modelScene,
      visualState.xray?.targetObject,
    )

    if (visualState.xray?.enabled && xrayTarget) {
      makePlayerXrayExcept(xrayTarget)
    } else {
      const savedSelectedObject = findObjectByReference(
        modelScene,
        visualState.selectedObject,
      )

      if (savedSelectedObject) {
        const selection = createPlayerObjectSelectionPayload(
          savedSelectedObject,
          material?.chapters || [],
        )

        setSelectedObject(selection.selectedObject)
        setOutlineObjects(selection.outlineObjects)
      }
    }

    const savedCuts = Array.isArray(visualState.cuts)
      ? visualState.cuts
      : visualState.cut
        ? [visualState.cut]
        : []

    const resolvedCuts = savedCuts
      .map((cutState) => ({
        cutState,
        targetObject: findObjectByReference(
          modelScene,
          cutState?.targetObject,
        ),
      }))
      .filter((entry) => entry.targetObject)

    playerFreePlay.applySavedCuts?.(resolvedCuts)
  }

  const handleSelectObjectFromPlayer = (object) => {
    if (!object) return null

    const selection = createPlayerObjectSelectionPayload(
      object,
      material?.chapters || [],
    )

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)

    // A single click is selection-only. Chapter camera/visual state remains
    // controlled by the explicit Chapter UI, while camera focus is reserved
    // for a double click on the object.
    return selection
  }

  const handleDoubleClickObjectFromPlayer = (object) => {
    if (!object) return

    const selection = handleSelectObjectFromPlayer(object)
    focusObject(selection?.selectedObject || object)
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
      shaderOutlineObjects,
      shaderOutlineStyle,
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
      handleDoubleClickObjectFromPlayer,
      handleModelLoaded,
      captureInitialCameraState,
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
      handleSelectChapter,
      clearActiveChapter,
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
      handleSelectChapter,
      freePlayMenu,
      activeMenu,
      showInfoPanel,
    },
  }
}
