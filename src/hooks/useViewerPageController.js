import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../modules/project-store/ProjectStoreContext";
import { useNavigate, useParams } from "react-router-dom";
import { useGlobalLoading } from "../modules/loading/LoadingContext";
import { panelSectionStyle, inputStyle, mediaButtonStyle } from "../constants/viewerStyles";
import { buildObjectTreeList, getMaxTreeDepth } from "../utils/objectTreeUtils";
import { useChapterManager } from "./useChapterManager";
import { useModelManager } from "./useModelManager";
import { useShaderManager } from "./useShaderManager";
import { useCameraManager } from "./useCameraManager";
import { useMarkerManager } from "./useMarkerManager";
import { useViewerProject } from "./useViewerProject";
import { createViewerDraft, useViewerAutosave } from "./useViewerAutosave";
import { syncProjectToBackend } from "../modules/project-hub/api/projectSync";
import { useViewerSelection } from "./useViewerSelection";
import { useViewerDialogs } from "./useViewerDialogs";
import { useViewerCut } from "./useViewerCut";
import { useVXEngine } from "./useVXEngine";
import { useEditorHistory } from "./useEditorHistory";
import { useFlowManager } from "./useFlowManager";
import { useProceduralManager } from "./useProceduralManager";
import { useAnimationAuthoring } from "./useAnimationAuthoring";
import { useQuizAuthoring } from "./useQuizAuthoring";
import { useSlideAuthoring } from "./useSlideAuthoring";
import { useXRAuthoring } from "./useXRAuthoring";
import { useContentAuthoringLock } from "./useContentAuthoringLock";
import { useObjectRename } from "./useObjectRename";
import { applySavedViewerVisualState } from "./viewer/applySavedViewerVisualState";
import { useViewerAuthoringState } from "./viewer/useViewerAuthoringState";
import { createChapterPreviewSelectionAdapters } from "./viewer/createChapterPreviewSelectionAdapters";
import { createDefaultViewerSettings } from "./viewer/createDefaultViewerSettings";
import { usePersistedViewerSettings } from "./viewer/usePersistedViewerSettings";
import { launchPlayerPreview } from "./viewer/launchPlayerPreview";
import { useViewerDataImport } from "./viewer/useViewerDataImport";
import { createChapterHighlightPayload } from "../engine/selection";
import { useViewerSceneHistory } from "./viewer/useViewerSceneHistory";
import {
  getChapterCameraView,
  getChapterCameraVisualState,
} from "../engine/chapter";
import { isLazyMaterialRecord } from "../engine/project/LazyMaterialRecords";
import { createStoredCameraView } from "../engine/camera";
import { normalizePlayerSettings } from "../modules/material/playerSettings";
import {
  applyChapterModelRotation,
  createChapterFocusTarget,
  applyObjectNameOverrides,
} from "../engine/model";
import {
  saveProjectDraftToIndexedDb,
  updateProjectInIndexedDb,
} from "../modules/project-hub/storage/projectIndexedDb";
import { useContentEditLock } from "./useContentEditLock";
export function useViewerPageController() {
  const vxEngine = useVXEngine();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const editorHistory = useEditorHistory({
    historyEngine: vxEngine?.history,
    projectId,
  });
  const { updateLoading, hideLoading } = useGlobalLoading();
  const {
    currentProject,
    projectDraft,
    dirty,
    saveStatus,
    setSaveStatus,
    pendingSync,
    markDirty,
    markSaved,
    markSaveError,
    markSynced,
    setCurrentProject,
    setProjectDraft,
  } = useProjectStore();
  const [syncStatus, setSyncStatus] = useState("idle");
  const [modelScene, setModelScene] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [objectList, setObjectList] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [activeSidebar, setActiveSidebar] = useState("settings");
  const [targetRotationY, setTargetRotationY] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const cameraRef = useRef();
  const controlsRef = useRef();
  const focusTargetRef = useRef(null);
  const chapterPreviewRequestRef = useRef(0);
  const [cutEnabled, setCutEnabled] = useState(false);
  const [cutAxis, setCutAxis] = useState("x");
  const [cutValue, setCutValue] = useState(0);
  const [cutValues, setCutValues] = useState({ x: 0, y: 0, z: 0 });
  const [cutRanges, setCutRanges] = useState({
    x: { min: -3, max: 3 },
    y: { min: -3, max: 3 },
    z: { min: -3, max: 3 },
  });
  const [cutMin, setCutMin] = useState(-3);
  const [cutMax, setCutMax] = useState(3);
  const [markerMode, setMarkerMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [outlineObjects, setOutlineObjects] = useState([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [selectedObjectName, setSelectedObjectName] = useState("");
  const [activeChapterId, setActiveChapterId] = useState(null);
  const [rightTab, setRightTab] = useState("material");
  const [treeDepth, setTreeDepth] = useState(999);
  const [searchObject, setSearchObject] = useState("");
  const [animations, setAnimations] = useState([]);
  const [selectedAnimations, setSelectedAnimations] = useState({});
  const [animationCommand, setAnimationCommand] = useState(null);
  const {
    settings: viewerSettings,
    setSettings: setViewerSettings,
    updatePersistedSettings: updateViewerSettings,
  } = usePersistedViewerSettings({
    createInitialSettings: createDefaultViewerSettings,
    markDirty,
    historyEngine: vxEngine?.history,
  });
  // Projection selection is viewport runtime state. Camera positions and types
  // are persisted only by explicit Save Camera actions, not by switching the
  // View Cube between Perspective and Orthographic.
  const [cameraProjectionMode, setCameraProjectionMode] =
    useState("perspective");
  const {
    material,
    setMaterial: updateMaterialState,
    rawSetMaterial,
    loadChapterRecord,
    loadFlowRecord,
    loadAnimationRecord,
    loadProcedureRecord,
    loadQuizRecord,
    loadSlideRecord,
    modelUrl,
    modelFile,
    materialModelUrl,
    handleFile,
  } = useViewerProject({
    projectId,
    markDirty,
    setCurrentProject,
    setProjectDraft,
    setViewerSettings,
    setCameraProjectionMode,
    setMarkers,
    activeChapterId,
    setActiveChapterId,
    setRightTab,
    updateLoading,
    hideLoading,
    historyEngine: vxEngine?.history,
  });
  const {
    importDataFile,
    isImportingData,
    importDataStatus,
  } = useViewerDataImport({
    projectId,
    currentProject,
    projectDraft,
    material,
    viewerSettings,
    rawSetMaterial,
    setViewerSettings,
    setCameraProjectionMode,
    setMarkers,
    setCutEnabled,
    setCutAxis,
    setCutValue,
    setCutValues,
    setCutRanges,
    setActiveChapterId,
    setRightTab,
    setCurrentProject,
    setProjectDraft,
    setSaveStatus,
    markSaved,
    markSaveError,
    updateLoading,
    hideLoading,
  });
  const flow = useFlowManager({
    material,
    setMaterial: updateMaterialState,
    modelScene,
    selectedObject,
    controlsRef,
    flowEngine: vxEngine?.flow,
    hydrateFlowRecord: loadFlowRecord,
  });
  const procedural = useProceduralManager({
    material,
    setMaterial: updateMaterialState,
    modelScene,
    selectedObject,
    cameraRef,
    controlsRef,
    setCameraProjectionMode,
    proceduralEngine: vxEngine?.procedural,
    modelEngine: vxEngine?.model,
    setOutlineObjects,
    setSelectedObject,
    setSelectedObjectName,
    hydrateProcedureRecord: loadProcedureRecord,
  });
  const animationAuthoring = useAnimationAuthoring({ material, setMaterial: updateMaterialState, modelScene, selectedObject, animationEngine: vxEngine?.animation, hydrateAnimationRecord: loadAnimationRecord });
  const quiz = useQuizAuthoring({ material, setMaterial: updateMaterialState, modelScene, selectedObject, quizEngine: vxEngine?.quiz, hydrateQuizRecord: loadQuizRecord });
  const xrAuthoring = useXRAuthoring({
    viewerSettings,
    updateViewerSettings,
    cameraRef,
    controlsRef,
    xrEngine: vxEngine?.xr,
  });
  useEffect(() => {
    if (activeSidebar !== "pro") {
      flow.stopAuthoring();
      procedural.stopAuthoring();
      animationAuthoring.stopAuthoring();
      quiz.stopAuthoring();
      xrAuthoring.stopAuthoring();
    }
  }, [activeSidebar, flow.stopAuthoring, procedural.stopAuthoring, animationAuthoring.stopAuthoring, quiz.stopAuthoring, xrAuthoring.stopAuthoring]);
  const slideModeActive = activeSidebar === "slides";
  const { contentAuthoringLocked, contentAuthoringLockReason } =
    useContentAuthoringLock({
      slideModeActive,
      flowAuthoringActive: flow.isAuthoringActive,
      proceduralAuthoringActive: procedural.isAuthoringActive,
      animationAuthoringActive: animationAuthoring.isAuthoringActive,
      quizAuthoringActive: quiz.isAuthoringActive,
      xrAuthoringActive: xrAuthoring.isAuthoringActive,
    });
  const saveDefaultPlayerCameraView = useCallback(() => {
    const cameraView = createStoredCameraView(
      cameraRef.current,
      controlsRef.current,
    );
    if (!cameraView) return false;
    updateMaterialState((prev) => ({
      ...prev,
      playerSettings: {
        ...normalizePlayerSettings(prev?.playerSettings),
        defaultCameraView: {
          ...cameraView,
          modelRotation: modelScene
            ? modelScene.rotation.toArray()
            : [0, 0, 0],
          savedAt: new Date().toISOString(),
        },
      },
    }));
    return true;
  }, [modelScene, updateMaterialState]);
  const rebuildObjectList = useCallback(
    (scene = modelScene) => {
      if (!scene) {
        setObjectList([]);
        return;
      }

      setObjectList(buildObjectTreeList(scene));
    },
    [modelScene],
  );

  const renameObject = useObjectRename({
    modelScene, selectedObject, updateMaterialState, setSelectedObjectName, rebuildObjectList,
  });

  useEffect(() => {
    if (!modelScene) return;

    const didApplyOverrides = applyObjectNameOverrides(
      modelScene,
      material?.objectNameOverrides,
    );

    if (didApplyOverrides) {
      rebuildObjectList(modelScene);
    }
  }, [material?.objectNameOverrides, modelScene, rebuildObjectList]);

  const activeChapter = useMemo(
    () =>
      material?.chapters?.find((chapter) => chapter.id === activeChapterId) ||
      null,
    [activeChapterId, material?.chapters],
  );

  const authoringObject = useMemo(() => {
    if (!activeChapter || !modelScene) return null;

    return createChapterHighlightPayload(activeChapter, modelScene)
      .selectedObject;
  }, [activeChapter, modelScene]);

  const authoringObjectName = activeChapter
    ? activeChapter.objectName || activeChapter.title || "Active Chapter Object"
    : "";

  const [markerScale, setMarkerScale] = useState(0.08);

  useViewerAutosave({
    projectId,
    dirty,
    material,
    viewerSettings,
    markers,
    cutEnabled,
    cutAxis,
    cutValue,
    cutValues,
    cutRanges,
    previousScene: projectDraft?.scene || currentProject?.scene,
    setSaveStatus,
    markSaved,
    markSaveError,
    setProjectDraft,
    // remoteContentId no longer passed here — autosave is local-only now,
    // see handleBulkUpdate below for the manual backend push.
  });

  const remoteContentId = currentProject?.remote?.contentId;

  const {
    lockConflict,
    kicked: contentLockKicked,
    dismissKicked: dismissContentLockKicked,
  } = useContentEditLock({ remoteContentId, projectId });

  // ViewerPage renders ContentLockedScreen/ForcedActionDialog instead of
  // ViewerPageLayout whenever either of these is set, which means the 3D
  // canvas never mounts — and hideLoading() is otherwise only ever called
  // from inside that canvas's "model loaded" callback (useViewerCut.js).
  // Without this, the loading overlay opened by whatever navigated here
  // (WorkspaceContentTab/ProjectHubPage) stays stuck on screen forever,
  // fully covering the conflict/kicked screen underneath it.
  useEffect(() => {
    if (lockConflict || contentLockKicked) {
      hideLoading();
    }
  }, [lockConflict, contentLockKicked, hideLoading]);

  const handleBulkUpdate = useCallback(async () => {
    if (!remoteContentId || !projectId || projectId === "demo") return;

    setSyncStatus("syncing");

    try {
      // Flush the very latest edits to IndexedDB first, in case the user
      // hits "Bulk Update" before the 1.5s autosave debounce has fired —
      // otherwise the backend could end up syncing stale local data.
      const draftToSave = createViewerDraft({
        projectId,
        material,
        viewerSettings,
        markers,
        cutEnabled,
        cutAxis,
        cutValue,
        cutValues,
        cutRanges,
      });

      await saveProjectDraftToIndexedDb(projectId, draftToSave);

      await updateProjectInIndexedDb(projectId, {
        thumbnail: material?.thumbnail || null,
        material,
        viewer: viewerSettings,
      });

      setProjectDraft(draftToSave);
      markSaved();

      await syncProjectToBackend({
        projectId,
        contentId: remoteContentId,
        material,
        viewer: viewerSettings,
        scene: draftToSave.scene,
      });

      markSynced();
      setSyncStatus("synced");
    } catch (error) {
      console.error("Bulk update to database failed:", error);
      setSyncStatus("error");
    }
  }, [
    remoteContentId,
    projectId,
    material,
    viewerSettings,
    markers,
    cutEnabled,
    cutAxis,
    cutValue,
    cutValues,
    cutRanges,
    setProjectDraft,
    markSaved,
    markSynced,
  ]);

  const {
    shaderMode,
    shaderOutlineObjects,
    shaderOutlineStyle,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    applyShaderMode,
    restoreShaderMode,
    updateEnvIntensity,
  } = useShaderManager({
    vxEngine,
    modelScene,
    viewerSettings,
    setViewerSettings: updateViewerSettings,
  });

  const {
    focusObject,
    resetCameraToInitialView,
    setEditorCameraView,
    setEditorCameraProjectionMode,
    applyStoredCameraFocusTarget,
  } = useCameraManager({
    vxEngine,
    modelScene,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
    controlsRef,
    cameraRef,
    setCameraProjectionMode,
    projectionResetKey: modelUrl,
  });

  const {
    selectedObjects,
    selectionVisualMode,
    multipleSelectEnabled,
    blinkSelectedObjectsEnabled,
    setBlinkSelectedObjectsEnabled,
    toggleBlinkSelectedObjects,
    toggleMultipleSelect,
    clearSelection,
    clearSelectionFromViewport,
    selectObjectFromList,
    highlightObject,
    makeXrayExcept,
    makeOthersXray,
    makeSelectedObjectsXray,
    makeTargetObjectsXray,
    highlightSelectedObjectsPreservingVisualState,
    resetXray,
    selectObjectFromMesh,
    focusObjectFromMesh,
    selectionEngine,
    xrayTargetObject,
    xrayTargetObjects,
  } = useViewerSelection({
    vxEngine,
    modelScene,
    objectList,
    selectedObject,
    setOutlineObjects,
    setSelectedObject,
    setSelectedObjectName,
    setOrbitEnabled,
    focusTargetRef,
    focusObject,
    setIsAutoRotating,
    setRightTab,
    activeChapterId,
    suppressInfoPanel: slideModeActive,
    restoreShaderMode,
  });

  const {
    handleModelLoaded,
    pullApart,
    soloSelectedObject: soloSelectedObjectBase,
    hideSelectedObject: hideSelectedObjectBase,
    hideSelectedObjects: hideSelectedObjectsBase,
    showAllObjects: showAllObjectsBase,
    hideAllObjects: hideAllObjectsBase,
    resetAllTransforms,
    resetVisualState,
    applySavedPullApart,
    pullApartState,
  } = useModelManager({
    vxEngine,
    modelScene,
    setModelScene,
    setObjectList,
    setCutMin,
    setCutMax,
    setCutX: setCutValue,
    setMarkerScale,
    viewerSettings,
    setSelectedObject,
    setOutlineObjects,
    setSelectedObjectName,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
    selectionEngine,
    cameraRef,
    controlsRef,
  });

  const {
    updateCutAxis,
    updateCutValue,
    resetCutValues,
    cutAllObjects,
    setCutAllObjects,
    cutTargetAvailable,
    cutRanges: engineCutRanges,
    toggleCutSection,
    handleModelLoadedWithCutBounds,
    getCutStates,
    clearCutSession,
    applySavedCuts,
  } = useViewerCut({
    vxEngine,
    modelScene,
    selectedObject,
    cutEnabled,
    setCutEnabled,
    cutAxis,
    setCutAxis,
    cutValue,
    setCutValue,
    cutValues,
    setCutValues,
    cutRanges,
    setCutRanges,
    setCutMin,
    setCutMax,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
    updateLoading,
    hideLoading,
    handleModelLoaded,
    historyEngine: vxEngine?.history,
  });
  const { flowAuthoring, proceduralAuthoring, quizAuthoring } = useViewerAuthoringState({
    flow,
    procedural,
    quiz,
    modelScene,
    selectedObject,
    selectedObjects,
    blinkSelectedObjectsEnabled,
    setBlinkSelectedObjectsEnabled,
    xrayTargetObject,
    xrayTargetObjects,
    selectionVisualMode,
    pullApartState,
    getCutStates,
    cutEnabled,
    cutValues,
    cutRanges: engineCutRanges || cutRanges,
    cameraRef,
    controlsRef,
    resetXray,
    showAllObjects: showAllObjectsBase,
    clearCutSession,
    applySavedPullApart,
    makeOthersXray,
    makeTargetObjectsXray,
    highlightObject,
    highlightSelectedObjectsPreservingVisualState,
    setSelectedObjectName,
    applySavedCuts,
  });
  const slideAuthoring = useSlideAuthoring({
    enabled: slideModeActive, material, setMaterial: updateMaterialState, hydrateSlideRecord: loadSlideRecord,
    setRightTab, setActiveChapterId, setMarkerMode, modelScene, cameraRef, controlsRef, selectedObject, selectedObjects,
    blinkSelectedObjectsEnabled, setBlinkSelectedObjectsEnabled, xrayTargetObject, xrayTargetObjects,
    selectionVisualMode, pullApartState, getCutStates, cutEnabled, cutValues, cutRanges: engineCutRanges || cutRanges,
    applyStoredCameraFocusTarget, resetXray, resetVisualState, clearCutSession, applySavedPullApart, makeOthersXray,
    makeTargetObjectsXray, highlightObject, highlightSelectedObjectsPreservingVisualState, setSelectedObject,
    setSelectedObjectName, setOutlineObjects, applySavedCuts, animationEngine: vxEngine?.animation, animations,
    setSelectedAnimations, setAnimationCommand,
  });
  const {
    beginObjectTransformHistory,
    commitObjectTransformHistory,
    pullApartSelectedScope,
    soloSelectedObject,
    hideSelectedObject,
    hideMultipleSelectedObjects,
    showAllObjects,
    hideAllObjects,
  } = useViewerSceneHistory({
    historyEngine: vxEngine?.history,
    modelScene,
    selectedObject,
    selectedObjects,
    multipleSelectEnabled,
    pullApart,
    soloSelectedObjectBase,
    hideSelectedObjectBase,
    hideSelectedObjectsBase,
    showAllObjectsBase,
    hideAllObjectsBase,
    clearSelection,
  });

  const isSelectedObjectXray = Boolean(
    selectedObject && xrayTargetObject === selectedObject,
  );

  const toggleSelectedObjectXray = () => {
    if (!selectedObject) return;

    const targetObject = selectedObject;
    const targetName = String(targetObject.name || selectedObjectName || "")
      .replaceAll("_", " ");

    if (xrayTargetObject === targetObject) {
      resetXray();
      highlightObject(targetObject);
      setSelectedObjectName(targetName);
      return;
    }

    makeXrayExcept(targetObject);
    setSelectedObjectName(targetName);
  };

  const resetAllWithCamera = () => {
    resetAllTransforms();
    resetCameraToInitialView();
  };

  const { addMarker, updateMarker } = useMarkerManager({
    activeChapterId,
    activeSlideId: slideAuthoring.activeSlideId,
    setMaterial: updateMaterialState,
    markers,
    setMarkers,
  });

  const dialogs = useViewerDialogs({
    addMarker, setActiveChapterId, setActiveSlideId: slideAuthoring.setActiveSlideId,
    setMarkerMode, setRightTab,
  });

  const {
    activeMarkers: chapterActiveMarkers,
    chapterFeedback,
    clearChapterFeedback,
    createChapterFromSelectedObject,
    saveMaterial,
    saveDataOnly,
    isSavingPackage,
    savePackageMode,
    savePackageProgress,
    savePackageStatus,
    updateChapterField,
    saveCameraViewToActiveChapter,
    deleteMarkerFromActiveChapter,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    addChapterAnimation,
    updateChapterAnimation,
    removeChapterAnimation,
    addChapterFlow,
    updateChapterFlow,
    removeChapterFlow,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    addChapterMedia,
    deleteChapterMedia,
    deleteChapterContent,
    moveChapter,
    deleteCameraViewFromActiveChapter,
  } = useChapterManager({
    selectedObjectName,
    selectedObject,
    selectedObjects,
    blinkSelectedObjectsEnabled,
    authoringObject,
    cameraRef,
    controlsRef,
    modelScene,
    material,
    setMaterial: updateMaterialState,
    materialModelUrl,
    modelFile,
    packageProject: currentProject,
    packageScene: {
      ...(currentProject?.scene || {}),
      ...(projectDraft?.scene || {}),
      markers,
      cut: {
        enabled: cutEnabled,
        axis: cutAxis,
        value: cutValue,
        values: cutValues,
        ranges: engineCutRanges || cutRanges,
      },
    },
    viewerSettings,
    shaderMode,
    metalness,
    roughness,
    cutEnabled,
    cutValues,
    cutRanges: engineCutRanges || cutRanges,
    getCutStates,
    xrayTargetObject,
    xrayTargetObjects,
    selectionVisualMode,
    pullApartState,
    activeChapterId,
    setActiveChapterId,
    setRightTab,
    animations,
    setSelectedAnimations,
    setAnimationCommand,
    vxEngine,
    contentAuthoringLocked,
    contentAuthoringLockReason,
  });

  const activeMarkers = slideAuthoring.activeSlideId
    ? slideAuthoring.activeMarkers
    : chapterActiveMarkers;

  const previewChapterInEditor = async (chapterId, cameraViewId = null) => {
    const requestId = chapterPreviewRequestRef.current + 1;
    chapterPreviewRequestRef.current = requestId;

    // Open immediately so lazy Chapter hydration can show a loading state.
    setActiveChapterId(chapterId);
    setRightTab("chapter");
    try {
      let chapter = material?.chapters?.find((item) => item.id === chapterId);

      if (
        chapter &&
        loadChapterRecord &&
        isLazyMaterialRecord(chapter, "chapters")
      ) {
        const hydratedChapter = await loadChapterRecord(chapterId);
        if (hydratedChapter) chapter = hydratedChapter;
      }

      if (chapterPreviewRequestRef.current !== requestId) return;
      if (!chapter || !modelScene) return;

      stopAnimationPreview();
      // Preview resets viewport state without closing the Chapter panel.
      resetXray({ closeInfo: false });
      resetVisualState();
      clearCutSession();

      setSelectedObject(null);
      setSelectedObjectName("");
      setOutlineObjects([]);
      focusTargetRef.current = null;

      const selectedCameraView = getChapterCameraView(chapter, cameraViewId);
      applyChapterModelRotation(modelScene, chapter, selectedCameraView);

      const chapterSelection = createChapterHighlightPayload(
        chapter,
        modelScene,
      );
      const chapterObject = chapterSelection.selectedObject;

      if (chapterObject) {
        setSelectedObject(chapterObject);
        setOutlineObjects(chapterSelection.outlineObjects);
        setSelectedObjectName(
          (
            chapterObject.name ||
            chapter.objectName ||
            chapter.title ||
            ""
          ).replaceAll("_", " "),
        );
      }

      const chapterFocusTarget = createChapterFocusTarget(
        chapter,
        selectedCameraView,
      );

      if (chapterFocusTarget) {
        const requestedProjectionMode =
          chapterFocusTarget.cameraType === "orthographic"
            ? "orthographic"
            : "perspective";

        // Preserve Perspective framing around stored Orthographic views.
        applyStoredCameraFocusTarget({
          ...chapterFocusTarget,
          cameraType: requestedProjectionMode,
        });
      }

      const previewSelection = createChapterPreviewSelectionAdapters({
        makeOthersXray,
        makeTargetObjectsXray,
        highlightObject,
        highlightSelectedObjectsPreservingVisualState,
      });

      applySavedViewerVisualState({
        scene: modelScene,
        chapter,
        chapterObject,
        visualState: getChapterCameraVisualState(
          chapter,
          selectedCameraView,
        ),
        applySavedPullApart,
        ...previewSelection,
        setSelectedObjectName,
        setBlinkSelectedObjectsEnabled,
        applySavedCuts,
      });
    } catch (error) {
      if (chapterPreviewRequestRef.current === requestId) {
        console.error("Failed to preview Chapter in Editor:", error);
      }
    } finally {
      if (chapterPreviewRequestRef.current === requestId) {
        // Final writes prevent stale selection callbacks from reopening Info.
        setActiveChapterId(chapterId);
        setRightTab("chapter");
      }
    }
  };

  const savePreviewDraft = async () => {
    if (!projectId || projectId === "demo" || !material?.projectId) return;

    const draftToSave = createViewerDraft({
      projectId,
      material,
      viewerSettings,
      markers,
      cutEnabled,
      cutAxis,
      cutValue,
      cutValues,
      cutRanges,
    });

    await saveProjectDraftToIndexedDb(projectId, draftToSave);

    await updateProjectInIndexedDb(projectId, {
      thumbnail: material?.thumbnail || null,
      material,
      viewer: viewerSettings,
      scene: draftToSave.scene,
      autosave: {
        status: "SAVED",
        lastSavedAt: draftToSave.updatedAt,
      },
    });

    setProjectDraft(draftToSave);
    markSaved();
  };

  const openPlayerPreview = () => {
    if (!projectId || projectId === "demo") return;

    void launchPlayerPreview({
      projectId,
      savePreviewDraft,
      setSaveStatus,
      updateLoading,
      hideLoading,
      navigate,
      markSaveError,
    });
  };

  const maxTreeDepth = getMaxTreeDepth(objectList);

  const deselectObject = () => {
    // Deselect must leave both object selection and chapter authoring.
    // Clearing only activeChapterId previously returned the right panel to
    // the compact Info view while the object was still selected.
    clearSelection({ closeInfo: false });
    setActiveChapterId(null);
    setRightTab(null);
  };

  return {
    saveStatus,
    history: editorHistory,
    syncStatus,
    pendingSync,
    remoteContentId,
    lockConflict,
    kicked: contentLockKicked,
    dismissKicked: dismissContentLockKicked,
    handleBulkUpdate,
    openPlayerPreview,
    activeSidebar,
    setActiveSidebar,
    rightTab,
    setRightTab,
    selectedObjectName,
    authoringObject,
    authoringObjectName,
    createChapterFromSelectedObject,
    contentAuthoringLocked,
    contentAuthoringLockReason,
    previewChapterInEditor,
    saveCameraViewToActiveChapter,
    saveMaterial,
    saveDataOnly,
    importDataFile,
    isImportingData,
    importDataStatus,
    isSavingPackage,
    savePackageMode,
    savePackageProgress,
    savePackageStatus,
    applyShaderMode,
    shaderMode,
    shaderOutlineObjects,
    shaderOutlineStyle,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    cameraProjectionMode,
    setViewerSettings: updateViewerSettings,
    updateEnvIntensity,
    material,
    setMaterial: updateMaterialState,
    flow: flowAuthoring,
    procedural: proceduralAuthoring,
    animationAuthoring,
    quizAuthoring,
    xrAuthoring,
    slideAuthoring,
    saveDefaultPlayerCameraView,
    activeChapter,
    activeChapterId,
    setActiveChapterId,
    panelSectionStyle,
    inputStyle,
    mediaButtonStyle,
    updateChapterField,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    deleteMarkerFromActiveChapter,
    animations,
    setAnimations,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    addChapterAnimation,
    updateChapterAnimation,
    removeChapterAnimation,
    addChapterFlow,
    updateChapterFlow,
    removeChapterFlow,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    deleteChapterContent,
    moveChapter,
    setActiveMenu,
    activeMenu,
    cameraRef,
    controlsRef,
    focusTargetRef,
    outlineObjects,
    modelUrl,
    addMarker,
    updateMarker,
    handleModelLoaded: handleModelLoadedWithCutBounds,
    markerMode,
    setMarkerMode,
    selectObjectFromMesh,
    focusObjectFromMesh,
    selectedAnimations,
    setSelectedAnimations,
    animationCommand,
    setAnimationCommand,
    activeMarkers,
    modelScene,
    targetRotationY,
    isAutoRotating,
    setIsAutoRotating,
    selectedObject,
    selectedObjects,
    multipleSelectEnabled,
    blinkSelectedObjectsEnabled,
    toggleBlinkSelectedObjects,
    toggleMultipleSelect,
    clearSelection,
    clearSelectionFromViewport,
    selectObjectFromList,
    isTransforming,
    setIsTransforming,
    orbitEnabled,
    setOrbitEnabled,
    setSelectedObject,
    setOutlineObjects,
    setSelectedObjectName,
    beginObjectTransformHistory,
    commitObjectTransformHistory,
    cutEnabled,
    cutAxis,
    updateCutAxis,
    cutValue,
    cutValues,
    cutRanges: engineCutRanges || cutRanges,
    updateCutValue,
    resetCutValues,
    cutAllObjects,
    setCutAllObjects,
    cutTargetAvailable,
    cutMin,
    cutMax,
    setCutValue,
    handleFile,
    toggleCutSection,
    hideSelectedObject,
    hideMultipleSelectedObjects,
    makeSelectedObjectsXray,
    toggleSelectedObjectXray,
    isSelectedObjectXray,
    resetXray,
    pullApart: pullApartSelectedScope,
    resetAllTransforms: resetAllWithCamera,
    soloSelectedObject,
    showAllObjects,
    objectList,
    highlightObject,
    makeXrayExcept,
    focusObject,
    setEditorCameraView,
    setEditorCameraProjectionMode,
    markers,
    treeDepth,
    setTreeDepth,
    maxTreeDepth,
    searchObject,
    setSearchObject,
    hideAllObjects,
    renameObject,
    deselectObject,
    deleteCameraViewFromActiveChapter,
    chapterFeedback,
    clearChapterFeedback,
    ...dialogs,
  };
}
