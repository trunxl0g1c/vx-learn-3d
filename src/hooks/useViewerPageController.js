import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../modules/project-store/ProjectStoreContext";
import { useNavigate, useParams } from "react-router-dom";
import { useGlobalLoading } from "../modules/loading/LoadingContext";
import { panelSectionStyle, inputStyle, mediaButtonStyle } from "../constants/viewerStyles";
import {
  buildObjectTreeList,
  getMaxTreeDepth,
  resolveObjectTreeRoot,
} from "../utils/objectTreeUtils";
import { useChapterManager } from "./useChapterManager";
import { useModelManager } from "./useModelManager";
import { useShaderManager } from "./useShaderManager";
import { useCameraManager } from "./useCameraManager";
import { useMarkerManager } from "./useMarkerManager";
import { useViewerProject } from "./useViewerProject";
import { createViewerDraft, useViewerAutosave } from "./useViewerAutosave";
import { useViewerSelection } from "./useViewerSelection";
import { useViewerDialogs } from "./useViewerDialogs";
import { useViewerCut } from "./useViewerCut";
import { useVXEngine } from "./useVXEngine";
import { useFlowManager } from "./useFlowManager";
import { useProceduralManager } from "./useProceduralManager";
import { applySavedViewerVisualState } from "./viewer/applySavedViewerVisualState";
import { useViewerAuthoringState } from "./viewer/useViewerAuthoringState";
import { DEFAULT_VIEWER_BACKGROUND } from "../utils/viewerBackground";
import { createChapterHighlightPayload } from "../engine/selection";
import { getChapterCameraView } from "../engine/chapter";
import {
  createStoredCameraView,
  switchCameraProjectionThen,
} from "../engine/camera";
import { normalizePlayerSettings } from "../modules/material/playerSettings";
import {
  applyChapterModelRotation,
  createChapterFocusTarget,
  applyObjectNameOverrides,
  areObjectPathsEqual,
  createObjectIndexPath,
  upsertObjectNameOverride,
} from "../engine/model";
import {
  saveProjectDraftToIndexedDb,
  updateProjectInIndexedDb,
} from "../modules/project-hub/storage/projectIndexedDb";
export function useViewerPageController() {
  const vxEngine = useVXEngine();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { updateLoading, hideLoading } = useGlobalLoading();
  const {
    currentProject,
    projectDraft,
    dirty,
    saveStatus,
    setSaveStatus,
    markDirty,
    markSaved,
    markSaveError,
    setCurrentProject,
    setProjectDraft,
  } = useProjectStore();
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

  const [viewerSettings, setViewerSettings] = useState({
    exposure: 0.75,
    ambientLight: 0.5,
    mainLight: 0.8,
    fillLight: 0.5,
    hemiLight: 0.5,
    envIntensity: 0.8,
    hdri: "/hdr/studio.hdr",
    hdriSource: "preset",
    customHdri: null,
    showHdriBackground: false,
    shaderMode: "original",
    metalness: 0.1,
    roughness: 0.1,
    cameraProjectionMode: "perspective",
    background: DEFAULT_VIEWER_BACKGROUND,
  });

  const updateViewerSettings = useCallback(
    (updater) => {
      setViewerSettings((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;

        if (Object.is(prev, next)) return prev;

        markDirty();
        return next;
      });
    },
    [markDirty],
  );

  const {
    material,
    setMaterial: updateMaterialState,
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
    setMarkers,
    setActiveChapterId,
    setRightTab,
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
  });

  const procedural = useProceduralManager({
    material,
    setMaterial: updateMaterialState,
    modelScene,
    selectedObject,
    cameraRef,
    controlsRef,
    setViewerSettings: updateViewerSettings,
    proceduralEngine: vxEngine?.procedural,
    setOutlineObjects,
  });

  useEffect(() => {
    if (activeSidebar !== "pro") {
      flow.stopAuthoring();
      procedural.stopAuthoring();
    }
  }, [activeSidebar, flow.stopAuthoring, procedural.stopAuthoring]);

  const contentAuthoringLocked = Boolean(
    flow.isAuthoringActive || procedural.isAuthoringActive,
  );
  const contentAuthoringLockReason = flow.isAuthoringActive
    ? "Create Content is disabled while Flow Authoring is active."
    : procedural.isAuthoringActive
      ? "Create Content is disabled while Procedural Authoring is active."
      : "";

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

  const renameObject = useCallback(
    (object, requestedName) => {
      if (!object || !modelScene) return false;

      const nextName = String(requestedName || "").trim();

      if (!nextName) return false;

      const previousName = String(object.name || "").trim();
      const objectPath = createObjectIndexPath(object, modelScene);

      const hierarchyRoot = resolveObjectTreeRoot(modelScene) || modelScene;

      if (objectPath.length === 0 && object !== hierarchyRoot) return false;
      if (previousName === nextName) return true;

      const originalName = String(
        object.userData?.vxOriginalObjectName || previousName,
      ).trim();

      object.userData.vxOriginalObjectName = originalName;
      object.name = nextName;

      updateMaterialState((prev) => ({
        ...prev,
        objectNameOverrides: upsertObjectNameOverride(
          prev?.objectNameOverrides,
          {
            path: objectPath,
            name: nextName,
            originalName,
          },
        ),
        chapters: (prev?.chapters || []).map((chapter) => {
          const samePath = areObjectPathsEqual(chapter?.objectPath, objectPath);
          const sameUuid =
            Boolean(chapter?.objectUuid) && chapter.objectUuid === object.uuid;
          const sameLegacyName =
            !Array.isArray(chapter?.objectPath) &&
            String(chapter?.objectName || "").trim() === previousName;

          return samePath || sameUuid || sameLegacyName
            ? { ...chapter, objectName: nextName }
            : chapter;
        }),
      }));

      if (selectedObject === object) {
        setSelectedObjectName(nextName.replaceAll("_", " "));
      }

      rebuildObjectList(modelScene);
      return true;
    },
    [modelScene, rebuildObjectList, selectedObject, updateMaterialState],
  );

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
    setSaveStatus,
    markSaved,
    markSaveError,
    setProjectDraft,
  });

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
  } = useCameraManager({
    vxEngine,
    modelScene,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
    controlsRef,
    cameraRef,
  });

  const {
    selectedObjects,
    selectionVisualMode,
    multipleSelectEnabled,
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
    restoreShaderMode,
  });

  const {
    handleModelLoaded,
    pullApart,
    soloSelectedObject: soloSelectedObjectBase,
    hideSelectedObject: hideSelectedObjectBase,
    hideSelectedObjects: hideSelectedObjectsBase,
    showAllObjects,
    hideAllObjects,
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
  });

  const { flowAuthoring, proceduralAuthoring } = useViewerAuthoringState({
    flow,
    procedural,
    modelScene,
    selectedObject,
    selectedObjects,
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
    showAllObjects,
    clearCutSession,
    applySavedPullApart,
    makeOthersXray,
    makeTargetObjectsXray,
    highlightObject,
    highlightSelectedObjectsPreservingVisualState,
    setSelectedObjectName,
    applySavedCuts,
  });

  const pullApartSelectedScope = () => {
    pullApart(selectedObject);
  };

  const soloSelectedObject = () => soloSelectedObjectBase(selectedObject);
  const hideSelectedObject = () => hideSelectedObjectBase(selectedObject);
  const hideMultipleSelectedObjects = () => {
    const targets = multipleSelectEnabled
      ? selectedObjects
      : selectedObject
        ? [selectedObject]
        : [];

    const didHide = hideSelectedObjectsBase(targets);

    if (didHide) {
      clearSelection();
    }
  };

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
    setMaterial: updateMaterialState,
    markers,
    setMarkers,
  });

  const dialogs = useViewerDialogs({
    addMarker,
    setActiveChapterId,
    setMarkerMode,
    setRightTab,
  });

  const {
    activeMarkers,
    chapterFeedback,
    clearChapterFeedback,
    createChapterFromSelectedObject,
    saveMaterial,
    isSavingPackage,
    savePackageProgress,
    savePackageStatus,
    updateChapterField,
    saveVisualStateToActiveChapter,
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
    deleteVisualStateFromActiveChapter,
    deleteCameraViewFromActiveChapter,
  } = useChapterManager({
    selectedObjectName,
    selectedObject,
    selectedObjects,
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

  const previewChapterInEditor = (chapterId, cameraViewId = null) => {
    const chapter = material?.chapters?.find((item) => item.id === chapterId);

    if (!chapter || !modelScene) return;

    stopAnimationPreview();
    resetXray();
    resetVisualState();
    clearCutSession();

    setSelectedObject(null);
    setSelectedObjectName("");
    setOutlineObjects([]);
    focusTargetRef.current = null;

    setActiveChapterId(chapterId);
    setRightTab("chapter");

    const selectedCameraView = getChapterCameraView(chapter, cameraViewId);

    applyChapterModelRotation(modelScene, chapter, selectedCameraView);

    const chapterSelection = createChapterHighlightPayload(chapter, modelScene);
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

      // Install the saved projection camera first. Only then expose the focus
      // target, preventing Orthographic zoom from touching PerspectiveCamera.
      switchCameraProjectionThen({
        cameraRef,
        setViewerSettings,
        mode: requestedProjectionMode,
        onReady: () => {
          focusTargetRef.current = chapterFocusTarget;
        },
      });
    }

    applySavedViewerVisualState({
      scene: modelScene,
      chapter,
      chapterObject,
      visualState: chapter.visualState,
      applySavedPullApart,
      makeOthersXray,
      makeTargetObjectsXray,
      highlightObject,
      highlightSelectedObjectsPreservingVisualState,
      setSelectedObjectName,
      applySavedCuts,
    });
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

  const openPlayerPreview = async () => {
    if (!projectId || projectId === "demo") return;

    try {
      setSaveStatus("saving");

      updateLoading({
        title: "Opening Player Preview",
        text: "Saving latest editor draft...",
        progress: null,
      });

      await savePreviewDraft();

      updateLoading({
        text: "Preparing player preview...",
      });

      navigate(`/viqubed/player/${projectId}?preview=true`, {
        state: {
          preview: true,
          fromEditor: true,
        },
      });
    } catch (error) {
      console.error("Gagal membuka preview player:", error);
      markSaveError();

      updateLoading({
        title: "Failed to Open Preview",
        text: error?.message || "Unknown error",
        progress: null,
      });

      setTimeout(() => {
        hideLoading();
      }, 1200);
    }
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
    saveVisualStateToActiveChapter,
    saveCameraViewToActiveChapter,
    saveMaterial,
    isSavingPackage,
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
    setViewerSettings: updateViewerSettings,
    updateEnvIntensity,
    material,
    setMaterial: updateMaterialState,
    flow: flowAuthoring,
    procedural: proceduralAuthoring,
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
    markers,
    treeDepth,
    setTreeDepth,
    maxTreeDepth,
    searchObject,
    setSearchObject,
    hideAllObjects,
    renameObject,
    deselectObject,
    deleteVisualStateFromActiveChapter,
    deleteCameraViewFromActiveChapter,
    chapterFeedback,
    clearChapterFeedback,
    ...dialogs,
  };
}
