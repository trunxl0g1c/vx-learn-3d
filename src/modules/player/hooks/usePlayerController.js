import { useEffect, useMemo, useRef, useState } from "react"
import {
  applyModelShaderMode,
  applyObjectNameOverrides,
  createViqubedXrayMaterial,
  initializePlayerModelScene,
} from "../../../engine/model"
import {
  createChapterHighlightPayload,
  createPlayerObjectSelectionPayload,
} from "../../../engine/selection"
import { buildObjectTreeList } from "../../../utils/objectTreeUtils"
import { normalizeFlowDefinitions } from "../../../engine/flow"
import { normalizePlayerSettings } from "../../material/playerSettings"
import {
  getChapterCameraVisualState,
  normalizeChapterFlowAssignments,
} from "../../../engine/chapter"
import usePlayerProcedurePlayback from "./usePlayerProcedurePlayback"
import { createPlayerControllerApi } from "./createPlayerControllerApi"
import usePlayerAnimation from "./usePlayerAnimation"
import usePlayerQuiz from "./usePlayerQuiz"
import usePlayerSlide from "./usePlayerSlide"
import usePlayerSpeech from "./usePlayerSpeech"
import usePlayerXR from "./usePlayerXR"
import usePlayerProject, { DEFAULT_VIEWER_SETTINGS } from "./usePlayerProject"
import usePlayerChapter from "./usePlayerChapter"
import usePlayerFreePlay from "./usePlayerFreePlay"
import { createPlayerCameraActions } from "./createPlayerCameraActions"
import { useFocusSelectedObjectShortcut } from "../../../hooks/useFocusSelectedObjectShortcut"
import { createPlayerXrayActions } from "./createPlayerXrayActions"
import { createPlayerSavedViewActions } from "./createPlayerSavedViewActions"
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords"
import { getVisibleChapters } from "../../../engine/marker"
import {
  createChapterVisibilitySnapshot,
  createPlayerSceneKey,
  filterChaptersByVisibilitySnapshot,
} from "../playerChapterCatalog"
import {
  capturePlayerInitialSceneState,
  restorePlayerInitialSceneState,
} from "../playerInitialSceneState"

export default function usePlayerController() {
  const [material, setMaterial] = useState(null)
  const [chapterVisibilitySnapshot, setChapterVisibilitySnapshot] =
    useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [modelScene, setModelScene] = useState(null)
  const [objectList, setObjectList] = useState([])
  const [activeFlowId, setActiveFlowId] = useState(null)
  const [flowPlaying, setFlowPlaying] = useState(false)
  const [flowPlaybackKey, setFlowPlaybackKey] = useState(0)
  const [activeChapterFlowIds, setActiveChapterFlowIds] = useState([])
  const [chapterFlowPlaybackKey, setChapterFlowPlaybackKey] = useState(0)
  const [freePlay, setFreePlay] = useState(false)
  const [freePlayMenu, setFreePlayMenu] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)
  const [outlineObjects, setOutlineObjects] = useState([])
  const [blinkSelectionEnabled, setBlinkSelectionEnabled] = useState(false)
  const [blinkRenderGroups, setBlinkRenderGroups] = useState([])
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
  const [showAnnotations, setShowAnnotations] = useState(false)
  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const focusTargetRef = useRef(null)
  const initialCameraStateRef = useRef(null)
  const initialSceneStateRef = useRef(null)
  const xrayTargetRef = useRef(null)
  const xrayMaterialDisposeVersionRef = useRef(0)
  const procedureResetRef = useRef(() => {})
  const slideOpenRequestRef = useRef(0)
  const flows = useMemo(
    () => normalizeFlowDefinitions(material?.flows),
    [material?.flows],
  )
  const activeFlow = useMemo(
    () => flows.find((flow) => flow.id === activeFlowId) || null,
    [activeFlowId, flows],
  )
  const activeChapterFlows = useMemo(
    () =>
      activeChapterFlowIds
        .map((flowId) => flows.find((flow) => flow.id === flowId))
        .filter(Boolean),
    [activeChapterFlowIds, flows],
  )
  const normalizedPlayerSettings = useMemo(
    () => normalizePlayerSettings(material?.playerSettings),
    [material?.playerSettings],
  )
  const playerXR = usePlayerXR(viewerSettings, modelScene, material?.modelFileName || material?.model?.fileName, material)
  const visibleChapters = useMemo(() => {
    const chapters = Array.isArray(material?.chapters) ? material.chapters : []

    if (!modelScene) return chapters

    const sceneKey = createPlayerSceneKey(material?.projectId, modelScene)
    const snapshotChapters = filterChaptersByVisibilitySnapshot(
      chapters,
      chapterVisibilitySnapshot,
      sceneKey,
    )

    return snapshotChapters || getVisibleChapters(chapters, modelScene)
  }, [
    chapterVisibilitySnapshot,
    material?.chapters,
    material?.projectId,
    modelScene,
  ])
  const stopChapterFlows = () => {
    setActiveChapterFlowIds([])
    setChapterFlowPlaybackKey((key) => key + 1)
  }
  const stopFlow = () => {
    setFlowPlaying(false)
    setActiveFlowId(null)
  }
  useEffect(() => {
    if (activeFlowId && !flows.some((flow) => flow.id === activeFlowId)) {
      setActiveFlowId(null)
      setFlowPlaying(false)
    }
  }, [activeFlowId, flows])
  useEffect(() => {
    setActiveChapterFlowIds((current) =>
      current.filter((flowId) =>
        flows.some((flow) => flow.id === flowId && flow.enabled !== false),
      ),
    )
  }, [flows])
  const playerAnimation = usePlayerAnimation(
    material?.chapters?.find((chapter) => chapter.id === activeChapterId),
    material,
    modelScene,
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
    setBlinkSelectionEnabled(false)
    setActiveFlowId(null)
    setFlowPlaying(false)
    setActiveChapterFlowIds([])
    setChapterFlowPlaybackKey((key) => key + 1)
    procedureResetRef.current?.()
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
    cameraRef,
    focusTargetRef,
    setViewerSettings,
    setSelectedObject,
    setOutlineObjects,
    playerAnimation,
    loadChapterRecord: playerProject.loadChapterRecord,
  })
  const playerSpeech = usePlayerSpeech(playerChapter.activeChapter)
  const chapterPullApartTarget = useMemo(() => {
    if (!modelScene || !playerChapter.activeChapter) return null

    return createChapterHighlightPayload(
      playerChapter.activeChapter,
      modelScene,
    ).selectedObject || null
  }, [modelScene, playerChapter.activeChapter])

  const clearActiveChapter = () => {
    setActiveChapterId(null)
    setBlinkSelectionEnabled(false)
    focusTargetRef.current = null
    setActiveChapterFlowIds([])
    setChapterFlowPlaybackKey((key) => key + 1)
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
  })

  const pullApartPlayerObjects = () => {
    if (freePlay) {
      // In Free Play a selected object scopes Pull Apart. With no selection,
      // the whole model is intentionally used.
      return playerFreePlay.pullApart({
        targetObject: selectedObject || null,
        allowSceneFallback: true,
      })
    }

    if (!playerChapter.activeChapter) return false

    // Chapter playback is scoped to the active saved/highlight object. If the
    // visual state has no active selection, fall back to the Chapter target.
    return playerFreePlay.pullApart({
      targetObject: selectedObject || chapterPullApartTarget,
      allowSceneFallback: false,
    })
  }

  useEffect(() => {
    if (!modelScene) {
      setShaderOutlineObjects([])
      setShaderOutlineStyle(null)
      return
    }

    const shaderState = applyModelShaderMode(modelScene, {
      shaderMode: viewerSettings.shaderMode,
      metalness: viewerSettings.metalness,
      roughness: viewerSettings.roughness,
      envIntensity: viewerSettings.envIntensity,
    })

    setShaderOutlineObjects(shaderState.outlineObjects)
    setShaderOutlineStyle(shaderState.outlineStyle || null)
  }, [
    modelScene,
    viewerSettings.shaderMode,
    viewerSettings.metalness,
    viewerSettings.roughness,
    viewerSettings.envIntensity,
  ])

  useEffect(() => {
    if (window.__PLAYER_RENDERER__) {
      window.__PLAYER_RENDERER__.toneMappingExposure =
        viewerSettings.exposure
    }
  }, [viewerSettings.exposure])

  const createPlayerObjectList = (scene) => {
    return buildObjectTreeList(scene)
  }

  const {
    focusObject,
    applyCameraState,
    captureInitialCameraState,
    resetCameraToOverview,
  } = createPlayerCameraActions({
    cameraRef,
    controlsRef,
    focusTargetRef,
    initialCameraStateRef,
    material,
    modelScene,
    setViewerSettings,
  })

  useFocusSelectedObjectShortcut({
    selectedObject,
    onFocus: focusObject,
    enabled: freePlay,
  })

  const xrayMaterialRef = useRef(null)

  if (!xrayMaterialRef.current) {
    xrayMaterialRef.current = createViqubedXrayMaterial()
  }

  useEffect(() => {
    const disposeVersion = xrayMaterialDisposeVersionRef.current + 1
    xrayMaterialDisposeVersionRef.current = disposeVersion

    return () => {
      const material = xrayMaterialRef.current
      const dispose = () => {
        if (xrayMaterialDisposeVersionRef.current !== disposeVersion) return
        material?.dispose?.()
        if (xrayMaterialRef.current === material) xrayMaterialRef.current = null
      }

      if (typeof globalThis.queueMicrotask === "function") {
        globalThis.queueMicrotask(dispose)
      } else {
        Promise.resolve().then(dispose)
      }
    }
  }, [])

  const {
    restorePlayerRenderMode,
    resetPlayerObjectXray,
    makePlayerTargetsXray,
    makePlayerOthersXray,
    makePlayerXrayExcept,
  } = createPlayerXrayActions({
    modelScene,
    viewerSettings,
    xrayTargetRef,
    xrayMaterial: xrayMaterialRef.current,
    setSelectedObject,
    setOutlineObjects,
    setShaderOutlineObjects,
    setShaderOutlineStyle,
  })

  const {
    applyVisualState: applySavedVisualState,
    applyCameraView: applySavedCameraView,
  } = createPlayerSavedViewActions({
    modelScene,
    material,
    playerFreePlay,
    makePlayerTargetsXray,
    makePlayerOthersXray,
    setSelectedObject,
    setOutlineObjects,
    setBlinkSelectionEnabled,
    setBlinkRenderGroups,
    applyCameraState,
  })

  const applySavedVisualStateRef = useRef(applySavedVisualState)
  const defaultVisualStateApplyRef = useRef({ scene: null, state: null })
  applySavedVisualStateRef.current = applySavedVisualState

  useEffect(() => {
    const visualState = normalizedPlayerSettings.defaultVisualState
    if (!modelScene || !visualState) return
    if (
      defaultVisualStateApplyRef.current.scene === modelScene &&
      defaultVisualStateApplyRef.current.state === visualState
    ) return

    defaultVisualStateApplyRef.current = { scene: modelScene, state: visualState }
    applySavedVisualStateRef.current(visualState)
  }, [modelScene, normalizedPlayerSettings.defaultVisualState])

  const playerProcedure = usePlayerProcedurePlayback({
    material,
    modelScene,
    playerProject,
    playerAnimation,
    playerFreePlay,
    restorePlayerRenderMode,
    applySavedVisualState,
    applySavedCameraView,
    focusObject,
    setActiveChapterId,
    setSelectedObject,
    setOutlineObjects,
    stopFlow,
    stopChapterFlows,
    initialSceneStateRef,
  })
  procedureResetRef.current = playerProcedure.resetControllerState

  const playerQuiz = usePlayerQuiz({
    material,
    modelScene,
    playerProject,
    playerAnimation,
    playerProcedure,
    applySavedVisualState,
    applySavedCameraView,
    setActiveChapterId,
    setSelectedObject,
    setOutlineObjects,
    stopFlow,
    stopChapterFlows,
    resetAssessmentPresentation: () => {
      playerFreePlay.resetVisualState?.({ animationDuration: 0 })
      restorePlayerRenderMode()
      restorePlayerInitialSceneState(modelScene, initialSceneStateRef.current)
      resetCameraToOverview()
      setBlinkSelectionEnabled(false)
    },
    setAssessmentFreePlay: setFreePlay,
    stopSpeech: playerSpeech.stopSpeaking,
  })

  const playerSlide = usePlayerSlide({
    material,
    playerProject,
    playerAnimation,
    flows,
    modelScene,
    cameraRef,
    focusTargetRef,
    setViewerSettings,
    applySavedVisualState,
  })

  const clearPlayerSelection = () => {
    const protectedSelection = playerProcedure.getProtectedSelection()

    if (protectedSelection) {
      setSelectedObject(protectedSelection.selectedObject)
      setOutlineObjects(protectedSelection.outlineObjects)
      return
    }

    if (xrayTargetRef.current) {
      restorePlayerRenderMode()
    }

    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)
  }

  const hideSelectedPlayerObject = () => {
    if (!selectedObject) return

    if (xrayTargetRef.current) {
      restorePlayerRenderMode()
    }

    playerFreePlay.hideSelectedObject?.()
  }

  const setObjectListSelectedObject = (targetObject) => {
    if (!targetObject) {
      clearPlayerSelection()
      return null
    }

    // Object List always enters Free Play before selecting.
    if (!freePlay) setPlayerFreePlayMode(true)

    if (xrayTargetRef.current) {
      restorePlayerRenderMode()
    }

    const selection = createPlayerObjectSelectionPayload(
      targetObject,
      material?.chapters || [],
    )

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)
    setBlinkSelectionEnabled(false)
    return selection
  }

  const hideAllObjects = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)
  }


  const getChapterFlowAssignments = (chapter) =>
    normalizeChapterFlowAssignments(chapter?.flows).filter(
      (assignment) => assignment.flowId,
    )

  const prepareChapterFlows = async (chapter) => {
    const assignedFlowIds = getChapterFlowAssignments(chapter)
      .filter((assignment) => assignment.autoPlay)
      .map((assignment) => assignment.flowId)

    const resolvedFlows = await Promise.all(
      assignedFlowIds.map(async (flowId) => {
        let flow = flows.find((item) => item.id === flowId)

        if (
          flow &&
          isLazyMaterialRecord(flow, "flows") &&
          playerProject.loadFlowRecord
        ) {
          flow = (await playerProject.loadFlowRecord(flowId)) || flow
        }

        return flow
      }),
    )

    const autoPlayFlowIds = resolvedFlows
      .filter(
        (flow) =>
          flow?.enabled !== false && (flow?.points?.length || 0) >= 2,
      )
      .map((flow) => flow.id)

    setActiveChapterFlowIds(Array.from(new Set(autoPlayFlowIds)))
    setChapterFlowPlaybackKey((key) => key + 1)
  }

  const playChapterFlow = async (flowId) => {
    const activeChapter = material?.chapters?.find(
      (chapter) => chapter.id === activeChapterId,
    )
    const assigned = getChapterFlowAssignments(activeChapter).some(
      (assignment) => assignment.flowId === flowId,
    )
    let flow = flows.find((item) => item.id === flowId)

    if (
      flow &&
      isLazyMaterialRecord(flow, "flows") &&
      playerProject.loadFlowRecord
    ) {
      flow = (await playerProject.loadFlowRecord(flowId)) || flow
    }

    if (
      !assigned ||
      !flow ||
      flow.enabled === false ||
      (flow.points?.length || 0) < 2
    ) {
      return false
    }

    setActiveFlowId(null)
    setFlowPlaying(false)
    setActiveChapterFlowIds((current) =>
      Array.from(new Set([...current, flowId])),
    )
    setChapterFlowPlaybackKey((key) => key + 1)
    return true
  }


  const handleChapterFlowComplete = (flowId) => {
    const flow = flows.find((item) => item.id === flowId)
    if (flow?.settings?.repeat) return

    setActiveChapterFlowIds((current) =>
      current.filter((item) => item !== flowId),
    )
  }

  const playFlow = async (flowId) => {
    playerSlide.clearSlide?.()
    playerProcedure.stopProcedure()
    stopChapterFlows()
    let flow = flows.find((item) => item.id === flowId)

    if (
      flow &&
      isLazyMaterialRecord(flow, "flows") &&
      playerProject.loadFlowRecord
    ) {
      flow = (await playerProject.loadFlowRecord(flowId)) || flow
    }

    if (!flow || (flow.points?.length || 0) < 2) return false

    setActiveChapterId(null)
    playerAnimation.stopChapterAnimations?.()

    // Always start from a deterministic clean model state. Flow-specific
    // visual state is applied immediately after the reset.
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)

    applySavedVisualState(flow.visualState)
    applySavedCameraView(flow.cameraView)

    setActiveFlowId(flowId)
    setFlowPlaying(true)
    setFlowPlaybackKey((key) => key + 1)
    return true
  }


  const resetPlayerView = () => {
    playerFreePlay.resetMovedObjects?.({ animationDuration: 560 })
    resetCameraToOverview()
  }

  const restoreInitialPlayerPresentation = () => {
    playerQuiz.stopQuiz?.()
    playerSlide.clearSlide?.()
    playerProcedure.stopProcedure()
    stopFlow()
    stopChapterFlows()
    playerAnimation.stopChapterAnimations?.()
    playerSpeech.stopSpeaking?.()
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    restorePlayerInitialSceneState(modelScene, initialSceneStateRef.current)
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)
    setActiveChapterId(null)
    focusTargetRef.current = null
    resetCameraToOverview()
    applySavedVisualState(normalizedPlayerSettings.defaultVisualState)
  }

  const setPlayerFreePlayMode = (nextValue) => {
    const nextFreePlay = Boolean(nextValue)

    if (nextFreePlay) {
      // Chapter/Flow/Procedure state must not leak into Free Play.
      restoreInitialPlayerPresentation()
      setActiveMenu(null)
      setShowInfoPanel(false)
      setFreePlayMenu(false)
      setFreePlay(true)
      return true
    }

    setFreePlay(false)
    setFreePlayMenu(false)
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)
    return false
  }

  const resetAllPlayerView = () => {
    restoreInitialPlayerPresentation()
    setFreePlay(false)
    setFreePlayMenu(false)
  }

  const handleModelLoaded = (scene) => {
    if (scene && modelScene === scene) return

    initialCameraStateRef.current = null
    applyObjectNameOverrides(scene, material?.objectNameOverrides)
    setModelScene(scene)
    setObjectList(createPlayerObjectList(scene))

    const initialVisibleChapters = getVisibleChapters(
      material?.chapters,
      scene,
    )
    // Chapter camera/visual-state playback changes mesh visibility at runtime.
    // Capture the catalogue once, before any chapter is opened, so reopening
    // the list does not progressively remove chapters merely because the
    // active chapter hides other objects. Initial authoring visibility is
    // still respected here.
    setChapterVisibilitySnapshot(
      createChapterVisibilitySnapshot({
        projectId: material?.projectId,
        scene,
        visibleChapters: initialVisibleChapters,
      }),
    )

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
    initialSceneStateRef.current = capturePlayerInitialSceneState(scene)
    setShaderOutlineObjects(modelInit.shaderOutlineObjects || [])
    setShaderOutlineStyle(modelInit.shaderOutlineStyle || null)

    // Keep a clean baseline here. The saved project default visual state is
    // applied after modelScene commits, so Pull Apart/Cut engines already point
    // at the active scene.
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)
    focusTargetRef.current = null

    setActiveMenu(null)
    setShowInfoPanel(false)
    playerProject.notifyModelLoaded?.(scene)
  }

  const handleSelectChapter = async (chapterId) => {
    if (!material?.chapters?.some((item) => item.id === chapterId)) return false

    // A Chapter click supersedes any Slide that may still be hydrating.
    slideOpenRequestRef.current += 1

    playerSlide.clearSlide?.()
    stopFlow()
    playerProcedure.stopProcedure()

    // Saved state must be applied on a stable baseline. An animated reset can
    // finish after the restore and silently overwrite Pull Apart/transforms.
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)

    const chapterView = await playerChapter.handleSelectChapter(chapterId)
    const chapter = chapterView?.chapter

    if (!chapter) return false

    applySavedVisualState(
      getChapterCameraVisualState(chapter, chapterView?.cameraView),
      {
        fallbackObject: chapterView?.selectedObject || null,
      },
    )
    await prepareChapterFlows(chapter)

    return true
  }

  const handleSelectChapterCameraView = (cameraIndex) => {
    const chapter = playerChapter.activeChapter
    if (!chapter) return null

    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)

    const cameraResult = playerChapter.handleSelectCameraView(cameraIndex)
    const defaultSelection = playerChapter.highlightChapterObject(chapter)

    applySavedVisualState(
      getChapterCameraVisualState(chapter, cameraResult?.cameraView),
      {
        fallbackObject: defaultSelection?.selectedObject || null,
      },
    )

    return cameraResult
  }

  const handleSelectSlide = async (slideId) => {
    if (!material?.slides?.some((item) => item.id === slideId)) return false

    // Hydrate first so a lazy IndexedDB read never leaves the Player sitting
    // on an intermediate reset frame between two slides.
    const requestId = slideOpenRequestRef.current + 1
    slideOpenRequestRef.current = requestId
    const preparedSlide = await playerSlide.prepareSlide?.(slideId)
    if (!preparedSlide) return false
    if (slideOpenRequestRef.current !== requestId) return false

    stopFlow()
    stopChapterFlows()
    playerProcedure.stopProcedure()
    playerQuiz.stopQuiz?.()
    clearActiveChapter()
    playerSlide.stopFlows?.()
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)

    return Boolean(await playerSlide.selectSlide?.(slideId, preparedSlide))
  }

  const handleSelectSlideCameraView = (cameraIndex) => {
    if (!playerSlide.activeSlide) return null
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])
    setBlinkSelectionEnabled(false)
    return playerSlide.selectCameraView?.(cameraIndex) || null
  }

  const handleSelectObjectFromPlayer = (object) => {
    if (!object) return null

    if (playerQuiz.acceptsObjectSelection) {
      return playerQuiz.handleObjectClick(object)
    }

    // Procedure target clicks remain active; normal selection needs Free Play.
    if (["waiting", "dragging", "animating"].includes(playerProcedure.status)) {
      return playerProcedure.handleObjectClick(object)
    }

    if (!freePlay) return null

    if (xrayTargetRef.current) {
      restorePlayerRenderMode()
    }

    const selection = createPlayerObjectSelectionPayload(
      object,
      material?.chapters || [],
    )

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)
    setBlinkSelectionEnabled(false)

    // Single click selects; Free Play double click handles camera focus.
    return selection
  }

  const handleDoubleClickObjectFromPlayer = (object) => {
    if (!object) return null

    const selection = handleSelectObjectFromPlayer(object)
    if (!selection) return null

    // Procedure cameras stay locked; only Free Play may refocus.
    if (freePlay) {
      focusObject(selection.selectedObject || object)
    }

    return selection
  }

  const updatePlayerViewerSetting = (key, value) => {
    setViewerSettings((previousSettings) => ({
      ...previousSettings,
      [key]: value,
    }))
  }

  const applyPlayerShaderMode = (mode) => {
    updatePlayerViewerSetting("shaderMode", mode)
  }

  const setPlayerMetalness = (value) => {
    updatePlayerViewerSetting("metalness", Number(value))
  }

  const setPlayerRoughness = (value) => {
    updatePlayerViewerSetting("roughness", Number(value))
  }

  const updatePlayerEnvIntensity = (value) => {
    updatePlayerViewerSetting("envIntensity", Number(value))
  }

  return createPlayerControllerApi({
    playerProject,
    material,
    modelScene,
    viewerSettings,
    outlineObjects,
    blinkSelectionEnabled,
    blinkRenderGroups,
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
    setTransformMode,
    objectList,
    focusObject,
    makePlayerXrayExcept,
    resetPlayerObjectXray,
    setObjectListSelectedObject,
    playerChapter,
    handleSelectChapterCameraView,
    playerAnimation,
    handleSelectObjectFromPlayer,
    handleDoubleClickObjectFromPlayer,
    clearPlayerSelection,
    handleModelLoaded,
    captureInitialCameraState,
    showAnnotations,
    activeFlow,
    flowPlaying,
    setFlowPlaying,
    flowPlaybackKey,
    activeChapterFlows,
    turntableAnimation: normalizedPlayerSettings.turntableAnimation,
    chapterFlowPlaybackKey,
    handleChapterFlowComplete,
    playerProcedure,
    playerQuiz,
    playerSlide,
    playerXR,
    handleSelectSlide,
    handleSelectSlideCameraView,
    playerSpeech,
    getChapterFlowAssignments,
    activeChapterFlowIds,
    playChapterFlow,
    stopChapterFlows,
    flows,
    activeFlowId,
    playFlow,
    stopFlow,
    freePlayMenu,
    cutEnabled,
    playerFreePlay,
    pullApartPlayerObjects,
    hideSelectedPlayerObject,
    resetAllPlayerView,
    hideAllObjects,
    cutAxis,
    cutValue,
    cutValues,
    cutRanges,
    cutMin,
    cutMax,
    setCutValue,
    activeMenu,
    activeChapterId,
    visibleChapters,
    handleSelectChapter,
    clearActiveChapter,
    setViewerSettings,
    applyPlayerShaderMode,
    setPlayerMetalness,
    setPlayerRoughness,
    updatePlayerEnvIntensity,
    setShowAnnotations,
    resetPlayerView,
    setFreePlay: setPlayerFreePlayMode,
    setFreePlayMenu,
    setActiveMenu,
    setShowInfoPanel,
    setCutEnabled,
    showInfoPanel,
  })
}
