import { useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  applyModelShaderMode,
  applyObjectNameOverrides,
  initializePlayerModelScene,
} from "../../../engine/model"
import { createPlayerObjectSelectionPayload } from "../../../engine/selection"
import { buildObjectTreeList } from "../../../utils/objectTreeUtils"
import { normalizeFlowDefinitions } from "../../../engine/flow"
import { normalizeChapterFlowAssignments } from "../../../engine/chapter"
import {
  createProceduralEngine,
  normalizeProceduralDefinitions,
} from "../../../engine/procedural"
import usePlayerAnimation from "./usePlayerAnimation"
import usePlayerSpeech from "./usePlayerSpeech"
import usePlayerProject, { DEFAULT_VIEWER_SETTINGS } from "./usePlayerProject"
import usePlayerChapter from "./usePlayerChapter"
import usePlayerFreePlay from "./usePlayerFreePlay"
import { createPlayerCameraActions } from "./createPlayerCameraActions"
import { createPlayerXrayActions } from "./createPlayerXrayActions"
import { createPlayerSavedViewActions } from "./createPlayerSavedViewActions"
import { createPlayerProcedureActions } from "./createPlayerProcedureActions"
import { createPlayerProcedureStepHighlighter } from "./createPlayerProcedureStepHighlighter"
export default function usePlayerController() {
  const [material, setMaterial] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [modelScene, setModelScene] = useState(null)
  const [objectList, setObjectList] = useState([])
  const [activeFlowId, setActiveFlowId] = useState(null)
  const [flowPlaying, setFlowPlaying] = useState(false)
  const [flowPlaybackKey, setFlowPlaybackKey] = useState(0)
  const [activeChapterFlowIds, setActiveChapterFlowIds] = useState([])
  const [chapterFlowPlaybackKey, setChapterFlowPlaybackKey] = useState(0)
  const [activeProcedureId, setActiveProcedureId] = useState(null)
  const [procedureStatus, setProcedureStatus] = useState("idle")
  const [procedureStepIndex, setProcedureStepIndex] = useState(-1)
  const [completedProcedureStepIds, setCompletedProcedureStepIds] = useState([])
  const [procedureFeedback, setProcedureFeedback] = useState("")
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
  const xrayTargetRef = useRef(null)
  const procedureRunTokenRef = useRef(0)
  const procedureReferenceLengthRef = useRef(1)
  const proceduralEngine = useMemo(() => createProceduralEngine(), [])
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
  const procedures = useMemo(
    () => normalizeProceduralDefinitions(material?.procedures),
    [material?.procedures],
  )
  const activeProcedure = useMemo(
    () =>
      procedures.find((procedure) => procedure.id === activeProcedureId) || null,
    [activeProcedureId, procedures],
  )
  const activeProcedureSteps = useMemo(
    () => (activeProcedure?.steps || []).filter((step) => step.enabled !== false),
    [activeProcedure],
  )
  const activeProcedureStep =
    activeProcedureSteps[procedureStepIndex] || null
  const activeProcedureIsAssembly =
    proceduralEngine.isAssemblyProcedure?.(activeProcedure) === true
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
  useEffect(() => {
    if (
      activeProcedureId &&
      !procedures.some((procedure) => procedure.id === activeProcedureId)
    ) {
      procedureRunTokenRef.current += 1
      setActiveProcedureId(null)
      setProcedureStatus("idle")
      setProcedureStepIndex(-1)
      setCompletedProcedureStepIds([])
      setProcedureFeedback("")
    }
  }, [activeProcedureId, procedures])
  useEffect(() => {
    return () => proceduralEngine.dispose?.()
  }, [proceduralEngine])
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
    setActiveFlowId(null)
    setFlowPlaying(false)
    setActiveChapterFlowIds([])
    setChapterFlowPlaybackKey((key) => key + 1)
    procedureRunTokenRef.current += 1
    proceduralEngine.dispose?.()
    setActiveProcedureId(null)
    setProcedureStatus("idle")
    setProcedureStepIndex(-1)
    setCompletedProcedureStepIds([])
    setProcedureFeedback("")
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
  })
  const playerSpeech = usePlayerSpeech(playerChapter.activeChapter)
  const clearActiveChapter = () => {
    setActiveChapterId(null)
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
    applyCameraState,
  })

  const clearPlayerSelection = () => {
    if (["waiting", "dragging", "animating"].includes(procedureStatus)) {
      const currentStep = activeProcedureSteps[procedureStepIndex]
      const reference =
        procedureStatus === "animating"
          ? currentStep?.animatedObject || currentStep?.targetObject
          : currentStep?.targetObject
      const displayObject = proceduralEngine.findObject?.(modelScene, reference)

      if (displayObject) {
        setSelectedObject(displayObject)
        setOutlineObjects(proceduralEngine.collectMeshes?.(displayObject) || [])
        return
      }
    }

    if (xrayTargetRef.current) {
      restorePlayerRenderMode()
    }

    setSelectedObject(null)
    setOutlineObjects([])
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
      return
    }

    if (xrayTargetRef.current) {
      restorePlayerRenderMode()
    }

    const selection = createPlayerObjectSelectionPayload(
      targetObject,
      material?.chapters || [],
    )

    setSelectedObject(selection.selectedObject)
    setOutlineObjects(selection.outlineObjects)
  }

  const hideAllObjects = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    setSelectedObject(null)
    setOutlineObjects([])
  }

  const getProcedureStepTarget = (step) =>
    proceduralEngine.findObject?.(modelScene, step?.targetObject) || null

  const getProcedureStepAnimatedEntries = (step) =>
    proceduralEngine.findAnimatedObjects?.(modelScene, step) || []
  const getProcedureStepAnimatedObject = (step) =>
    getProcedureStepAnimatedEntries(step)[0]?.object3D || null

  const highlightProcedureStep = createPlayerProcedureStepHighlighter({
    getProcedureStepTarget,
    restorePlayerRenderMode,
    playerFreePlay,
    applySavedVisualState,
    setSelectedObject,
    setOutlineObjects,
    proceduralEngine,
    applySavedCameraView,
    focusObject,
  })

  const {
    activeAssemblyObject,
    advanceProcedureStep,
    handleAssemblyDragStart,
    handleAssemblyDrag,
    handleAssemblyDragEnd,
    playProcedureCompletionAnimation,
  } = createPlayerProcedureActions({
    proceduralEngine,
    modelScene,
    activeProcedure,
    procedures,
    activeProcedureIsAssembly,
    activeProcedureStep,
    activeProcedureSteps,
    procedureStepIndex,
    procedureReferenceLengthRef,
    setProcedureStatus,
    setProcedureFeedback,
    setCompletedProcedureStepIds,
    setProcedureStepIndex,
    setSelectedObject,
    setOutlineObjects,
    highlightProcedureStep,
    playAnimationAssignments: playerAnimation.playAnimationAssignments,
  })

  const stopProcedure = ({ clearSelection = true } = {}) => {
    procedureRunTokenRef.current += 1
    proceduralEngine.dispose?.()
    if (activeProcedureIsAssembly && activeProcedure && modelScene) {
      proceduralEngine.resetProcedure?.(modelScene, activeProcedure)
    }
    setProcedureStatus("idle")
    setActiveProcedureId(null)
    setProcedureStepIndex(-1)
    setCompletedProcedureStepIds([])
    setProcedureFeedback("")

    if (clearSelection) {
      setSelectedObject(null)
      setOutlineObjects([])
    }
  }

  const playProcedure = (procedureId) => {
    const procedure = procedures.find((item) => item.id === procedureId)
    const steps = (procedure?.steps || []).filter((step) => step.enabled !== false)

    if (!procedure || steps.length === 0 || !modelScene) return false

    procedureRunTokenRef.current += 1
    proceduralEngine.dispose?.()
    stopFlow()
    stopChapterFlows()
    setActiveChapterId(null)
    playerAnimation.stopChapterAnimations?.()
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    procedureReferenceLengthRef.current =
      proceduralEngine.getReferenceLength?.(modelScene, 1) || 1
    proceduralEngine.resetProcedure?.(modelScene, procedure)

    setActiveProcedureId(procedureId)
    setProcedureStepIndex(0)
    setCompletedProcedureStepIds([])
    setProcedureFeedback(
      steps[0]?.instruction ||
        (proceduralEngine.isAssemblyProcedure?.(procedure)
          ? "Geser komponen ke target yang ditampilkan."
          : "Klik object yang ditandai."),
    )
    setProcedureStatus("waiting")
    highlightProcedureStep(steps[0])
    return true
  }

  const handleProcedureObjectClick = (object) => {
    if (!activeProcedure || !["waiting", "dragging", "animating"].includes(procedureStatus)) {
      return null
    }

    const currentStep = activeProcedureSteps[procedureStepIndex]
    const targetObject = getProcedureStepTarget(currentStep)
    const animatedEntries = getProcedureStepAnimatedEntries(currentStep)
    const animatedObject = animatedEntries[0]?.object3D || null
    const animatedOutlineObjects = animatedEntries.flatMap((entry) =>
      proceduralEngine.collectMeshes?.(entry.object3D) || [],
    )

    if (!currentStep || !targetObject) {
      setProcedureFeedback("Target object untuk step ini tidak ditemukan.")
      return null
    }

    if (!animatedObject) {
      setProcedureFeedback("Animated object untuk step ini tidak ditemukan.")
      return null
    }

    if (activeProcedureIsAssembly) {
      const matchesAssemblyObject = proceduralEngine.matchesClickTarget?.(
        object,
        animatedObject,
        modelScene,
      )

      if (!matchesAssemblyObject) {
        setProcedureFeedback(
          `Komponen belum tepat. Geser ${currentStep.animatedObject?.name || currentStep.targetObject?.name || currentStep.name}.`,
        )
        highlightProcedureStep(currentStep)
        return {
          selectedObject: animatedObject,
          outlineObjects: animatedOutlineObjects,
        }
      }

      setSelectedObject(animatedObject)
      setOutlineObjects(animatedOutlineObjects)
      setProcedureFeedback("Geser komponen ke ghost target.")
      return {
        selectedObject: animatedObject,
        outlineObjects: animatedOutlineObjects,
      }
    }

    if (procedureStatus === "animating") {
      return {
        selectedObject: animatedObject,
        outlineObjects: animatedOutlineObjects,
      }
    }

    const matchesClickTarget = proceduralEngine.matchesClickTarget?.(
      object,
      targetObject,
      modelScene,
    )

    if (!matchesClickTarget) {
      setProcedureFeedback(
        `Object belum tepat. Klik ${currentStep.targetObject?.name || currentStep.name}.`,
      )
      highlightProcedureStep(currentStep)
      return {
        selectedObject: targetObject,
        outlineObjects: proceduralEngine.collectMeshes?.(targetObject) || [],
      }
    }

    const runToken = ++procedureRunTokenRef.current
    setProcedureStatus("animating")
    setProcedureFeedback("Menjalankan animasi step...")
    setSelectedObject(animatedObject)
    setOutlineObjects(animatedOutlineObjects)

    proceduralEngine
      .animateStepObjects({ scene: modelScene, step: currentStep })
      .then((completed) => {
        if (!completed || procedureRunTokenRef.current !== runToken) return

        advanceProcedureStep(currentStep)
      })

    return {
      selectedObject: animatedObject,
      outlineObjects: animatedOutlineObjects,
    }
  }

  const getChapterFlowAssignments = (chapter) =>
    normalizeChapterFlowAssignments(chapter?.flows).filter(
      (assignment) => assignment.flowId,
    )

  const prepareChapterFlows = (chapter) => {
    const autoPlayFlowIds = getChapterFlowAssignments(chapter)
      .filter((assignment) => assignment.autoPlay)
      .map((assignment) => assignment.flowId)
      .filter((flowId) => {
        const flow = flows.find((item) => item.id === flowId)
        return flow?.enabled !== false && (flow?.points?.length || 0) >= 2
      })

    setActiveChapterFlowIds(Array.from(new Set(autoPlayFlowIds)))
    setChapterFlowPlaybackKey((key) => key + 1)
  }

  const playChapterFlow = (flowId) => {
    const activeChapter = material?.chapters?.find(
      (chapter) => chapter.id === activeChapterId,
    )
    const assigned = getChapterFlowAssignments(activeChapter).some(
      (assignment) => assignment.flowId === flowId,
    )
    const flow = flows.find((item) => item.id === flowId)

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

  const stopChapterFlows = () => {
    setActiveChapterFlowIds([])
    setChapterFlowPlaybackKey((key) => key + 1)
  }

  const handleChapterFlowComplete = (flowId) => {
    const flow = flows.find((item) => item.id === flowId)
    if (flow?.settings?.repeat) return

    setActiveChapterFlowIds((current) =>
      current.filter((item) => item !== flowId),
    )
  }

  const playFlow = (flowId) => {
    stopProcedure()
    stopChapterFlows()
    const flow = flows.find((item) => item.id === flowId)

    if (!flow || (flow.points?.length || 0) < 2) return false

    setActiveChapterId(null)
    playerAnimation.stopChapterAnimations?.()

    // Always start from a deterministic clean model state. Flow-specific
    // visual state is applied immediately after the reset.
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])

    applySavedVisualState(flow.visualState)
    applySavedCameraView(flow.cameraView)

    setActiveFlowId(flowId)
    setFlowPlaying(true)
    setFlowPlaybackKey((key) => key + 1)
    return true
  }

  const stopFlow = () => {
    setFlowPlaying(false)
    setActiveFlowId(null)
  }

  const resetPlayerView = () => {
    playerFreePlay.resetMovedObjects?.({ animationDuration: 560 })
    resetCameraToOverview()
  }

  const resetAllPlayerView = () => {
    playerFreePlay.resetAllTransforms?.()
    playerFreePlay.resetSection?.()
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])
    setActiveChapterId(null)
    setFreePlay(false)
    setFreePlayMenu(false)
    playerAnimation.stopChapterAnimations?.()
    stopProcedure()
    stopFlow()
    stopChapterFlows()
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
    playerProject.notifyModelLoaded?.(scene)
  }

  const handleSelectChapter = (chapterId) => {
    const chapter = material?.chapters?.find((item) => item.id === chapterId)

    if (!chapter) return false

    stopFlow()
    stopProcedure()

    // Saved state must be applied on a stable baseline. An animated reset can
    // finish after the restore and silently overwrite Pull Apart/transforms.
    playerFreePlay.resetVisualState?.({ animationDuration: 0 })
    restorePlayerRenderMode()
    setSelectedObject(null)
    setOutlineObjects([])

    const chapterView = playerChapter.handleSelectChapter(chapterId)

    applySavedVisualState(chapter.visualState, {
      fallbackObject: chapterView?.selectedObject || null,
    })
    prepareChapterFlows(chapter)

    return true
  }

  const handleSelectObjectFromPlayer = (object) => {
    if (!object) return null

    if (["waiting", "dragging", "animating"].includes(procedureStatus)) {
      return handleProcedureObjectClick(object)
    }

    if (xrayTargetRef.current) {
      restorePlayerRenderMode()
    }

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

  return {
    status: {
      isLoadingProject: playerProject.isLoadingProject,
      isSceneReady: playerProject.isSceneReady,
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
      clearPlayerSelection,
      handleModelLoaded,
      captureInitialCameraState,
      onSceneReady: playerProject.notifySceneReady,
      setAnimations: playerAnimation.setAnimations,
      showAnnotations,
      activeFlow,
      flowPlaying,
      flowPlaybackKey,
      activeChapterFlows,
      chapterFlowPlaybackKey,
      onChapterFlowComplete: handleChapterFlowComplete,
      onFlowComplete: () => {
        if (!activeFlow?.settings?.repeat) {
          setFlowPlaying(false)
        }
      },
      assemblyDragObject: activeAssemblyObject,
      assemblyStartTransform: activeProcedureStep?.startTransform || null,
      assemblyTargetTransform: activeProcedureStep?.endTransform || null,
      assemblyDragEnabled:
        activeProcedureIsAssembly &&
        ["waiting", "dragging"].includes(procedureStatus) &&
        Boolean(activeAssemblyObject),
      assemblyCameraLocked: activeProcedureIsAssembly &&
        ["waiting", "dragging"].includes(procedureStatus) &&
        Boolean(activeProcedureStep),
      assemblyShowGhost:
        activeProcedureStep?.interaction?.showGhost !== false,
      onAssemblyDragStart: handleAssemblyDragStart,
      onAssemblyDrag: handleAssemblyDrag,
      onAssemblyDragEnd: handleAssemblyDragEnd,
    },
    chapterPanel: {
      freePlay,
      showInfoPanel,
      activeChapter: playerChapter.activeChapter,
      cameraViews: playerChapter.cameraViews,
      activeCameraViewIndex: playerChapter.activeCameraViewIndex,
      selectCameraView: playerChapter.handleSelectCameraView,
      speakChapterDescription: playerSpeech.speakChapterDescription,
      stopSpeaking: playerSpeech.stopSpeaking,
      playChapterAnimations: playerAnimation.playChapterAnimations,
      stopChapterAnimations: playerAnimation.stopChapterAnimations,
      chapterFlowAssignments: getChapterFlowAssignments(
        playerChapter.activeChapter,
      ),
      activeChapterFlowIds,
      playChapterFlow,
      stopChapterFlows,
    },
    animationPanel: {
      animations: playerAnimation.animations,
      selectedAnimations: playerAnimation.selectedAnimations,
      setSelectedAnimations: playerAnimation.setSelectedAnimations,
      setAnimationCommand: playerAnimation.setAnimationCommand,
      stopAnimations: playerAnimation.stopCurrentAnimations,
    },
    flowPanel: {
      flows,
      activeFlow,
      activeFlowId,
      isPlaying: flowPlaying,
      playFlow,
      stopFlow,
    },

    procedurePanel: {
      procedures,
      activeProcedure,
      activeProcedureId,
      activeStepIndex: procedureStepIndex,
      completedStepIds: completedProcedureStepIds,
      status: procedureStatus,
      feedback: procedureFeedback,
      playProcedure,
      stopProcedure,
      playCompletionAnimation: playProcedureCompletionAnimation,
    },

    toolsMenu: {
      freePlay,
      freePlayMenu,
      cutEnabled,
      toggleCutSection: playerFreePlay.toggleCutSection,
      hideSelectedObject: hideSelectedPlayerObject,
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
      cutAllObjects: playerFreePlay.cutAllObjects,
      setCutAllObjects: playerFreePlay.setCutAllObjects,
      cutTargetAvailable: playerFreePlay.cutTargetAvailable,
    },

    chapterList: {
      freePlay,
      activeMenu,
      material,
      activeChapterId,
      handleSelectChapter,
      clearActiveChapter,
    },

    environmentPanel: {
      viewerSettings,
      setViewerSettings,
      shaderMode: viewerSettings.shaderMode || "original",
      applyShaderMode: applyPlayerShaderMode,
      metalness: viewerSettings.metalness ?? 0.1,
      setMetalness: setPlayerMetalness,
      roughness: viewerSettings.roughness ?? 0.1,
      setRoughness: setPlayerRoughness,
      updateEnvIntensity: updatePlayerEnvIntensity,
    },

    settingsPanel: {
      showAnnotations,
      setShowAnnotations,
      resetView: resetPlayerView,
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
