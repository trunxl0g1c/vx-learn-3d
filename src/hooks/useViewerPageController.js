import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjectStore } from "../modules/project-store/ProjectStoreContext";
import { useNavigate, useParams } from "react-router-dom";
import { useGlobalLoading } from "../modules/loading/LoadingContext";

import {
  panelSectionStyle,
  inputStyle,
  mediaButtonStyle,
} from "../constants/viewerStyles";
import { buildObjectTreeList, getMaxTreeDepth, resolveObjectTreeRoot } from "../utils/objectTreeUtils";
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
import { DEFAULT_VIEWER_BACKGROUND } from "../utils/viewerBackground";
import { createChapterHighlightPayload } from "../engine/selection";
import {
  applyChapterModelRotation,
  createChapterFocusTarget,
  applyObjectNameOverrides,
  areObjectPathsEqual,
  createObjectIndexPath,
  resolveObjectByStoredIndexPath,
  upsertObjectNameOverride,
} from "../engine/model";
import {
  saveProjectDraftToIndexedDb,
  updateProjectInIndexedDb,
} from "../modules/project-hub/storage/projectIndexedDb";

function findObjectByReference(scene, reference) {
  if (!scene || !reference) return null;

  if (Array.isArray(reference.path)) {
    const pathMatch = resolveObjectByStoredIndexPath(
      scene,
      reference.path,
      reference.name,
    );

    if (pathMatch) return pathMatch;
  }

  if (reference.uuid) {
    const uuidMatch = scene.getObjectByProperty?.("uuid", reference.uuid);

    if (uuidMatch) return uuidMatch;
  }

  const targetName = String(reference.name || "").trim();

  if (!targetName) return null;

  let nameMatch = null;

  scene.traverse((object) => {
    if (nameMatch) return;

    if (String(object?.name || "").trim() === targetName) {
      nameMatch = object;
    }
  });

  return nameMatch;
}

export function useViewerPageController() {
  const vxEngine = useVXEngine();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { updateLoading, hideLoading } = useGlobalLoading();

  const {
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
  const [activeSidebar, setActiveSidebar] = useState("hierarchy");

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

  const [treeDepth, setTreeDepth] = useState(2);
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

  const rebuildObjectList = useCallback((scene = modelScene) => {
    if (!scene) {
      setObjectList([]);
      return;
    }

    setObjectList(buildObjectTreeList(scene));
  }, [modelScene]);

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

      const originalName =
        String(object.userData?.vxOriginalObjectName || previousName).trim();

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
          const samePath = areObjectPathsEqual(
            chapter?.objectPath,
            objectPath,
          );
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
    [
      modelScene,
      rebuildObjectList,
      selectedObject,
      updateMaterialState,
    ],
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

    return createChapterHighlightPayload(activeChapter, modelScene).selectedObject;
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
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    applyShaderMode,
    updateEnvIntensity,
  } = useShaderManager({
    modelScene,
    viewerSettings,
    setViewerSettings: updateViewerSettings,
  });

  const { focusObject, resetCameraToInitialView } = useCameraManager({
    vxEngine,
    modelScene,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
    controlsRef,
    cameraRef,
  });

  const {
    highlightObject,
    makeXrayExcept,
    resetXray,
    selectObjectFromMesh,
    focusObjectFromMesh,
    selectionEngine,
    xrayTargetObject,
  } = useViewerSelection({
    vxEngine,
    modelScene,
    objectList,
    setOutlineObjects,
    setSelectedObject,
    setSelectedObjectName,
    setOrbitEnabled,
    focusTargetRef,
    focusObject,
    setIsAutoRotating,
    setRightTab,
    activeChapterId,
  });

  const {
    handleModelLoaded,
    pullApart,
    soloSelectedObject: soloSelectedObjectBase,
    hideSelectedObject: hideSelectedObjectBase,
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

  const pullApartSelectedScope = () => {
    pullApart(selectedObject);
  };

  const soloSelectedObject = () => soloSelectedObjectBase(selectedObject);
  const hideSelectedObject = () => hideSelectedObjectBase(selectedObject);

  const resetAllWithCamera = () => {
    resetAllTransforms();
    resetCameraToInitialView();
  };

  const { addMarker } = useMarkerManager({
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
    playAnimationPreview,
    stopAnimationPreview,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    addChapterMedia,
    deleteChapterMedia,
    deleteChapterContent,
  } = useChapterManager({
    selectedObjectName,
    selectedObject,
    authoringObject,
    cameraRef,
    controlsRef,
    modelScene,
    material,
    setMaterial: updateMaterialState,
    materialModelUrl,
    modelFile,
    viewerSettings,
    shaderMode,
    metalness,
    roughness,
    cutEnabled,
    cutValues,
    cutRanges: engineCutRanges || cutRanges,
    getCutStates,
    xrayTargetObject,
    pullApartState,
    activeChapterId,
    setActiveChapterId,
    setRightTab,
    animations,
    setSelectedAnimations,
    setAnimationCommand,
    vxEngine,
  });

  const applyHiddenChapterObjects = (visualState) => {
    const hiddenObjects = visualState?.visibility?.hiddenObjects || [];

    hiddenObjects.forEach((reference) => {
      const object = findObjectByReference(modelScene, reference);

      if (object) {
        object.visible = false;
      }
    });
  };

  const previewChapterInEditor = (chapterId) => {
    const chapter = material?.chapters?.find(
      (item) => item.id === chapterId,
    );

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

    applyChapterModelRotation(modelScene, chapter);

    const chapterSelection = createChapterHighlightPayload(
      chapter,
      modelScene,
    );
    const chapterObject = chapterSelection.selectedObject;

    if (chapterObject) {
      setSelectedObject(chapterObject);
      setOutlineObjects(chapterSelection.outlineObjects);
      setSelectedObjectName(
        (chapterObject.name || chapter.objectName || chapter.title || "")
          .replaceAll("_", " "),
      );
    }

    const chapterFocusTarget = createChapterFocusTarget(chapter);

    if (chapterFocusTarget) {
      focusTargetRef.current = chapterFocusTarget;
    }

    const visualState = chapter.visualState;

    if (!visualState) return;

    const pullApartTarget = findObjectByReference(
      modelScene,
      visualState.pullApart?.targetObject,
    );

    applySavedPullApart(
      visualState.pullApart,
      pullApartTarget,
    );

    applyHiddenChapterObjects(visualState);

    const xrayTarget = findObjectByReference(
      modelScene,
      visualState.xray?.targetObject,
    );
    const savedSelectedObject = findObjectByReference(
      modelScene,
      visualState.selectedObject,
    );
    const preferredSelection =
      xrayTarget || savedSelectedObject || chapterObject || null;

    if (visualState.xray?.enabled && xrayTarget) {
      makeXrayExcept(xrayTarget);
      setSelectedObjectName(
        (xrayTarget.name || chapter.objectName || chapter.title || "")
          .replaceAll("_", " "),
      );
    } else if (savedSelectedObject) {
      highlightObject(savedSelectedObject);
      setSelectedObjectName(
        (savedSelectedObject.name || chapter.objectName || chapter.title || "")
          .replaceAll("_", " "),
      );
    }

    const savedCuts = Array.isArray(visualState.cuts)
      ? visualState.cuts
      : visualState.cut
        ? [visualState.cut]
        : [];

    const resolvedCuts = savedCuts
      .map((cutState) => ({
        cutState,
        targetObject: findObjectByReference(
          modelScene,
          cutState?.targetObject,
        ),
      }))
      .filter((entry) => entry.targetObject);

    applySavedCuts(
      resolvedCuts,
      preferredSelection || modelScene,
    );
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

      navigate(`/vxplore/player/${projectId}?preview=true`, {
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
    setSelectedObject(null);
    setSelectedObjectName("");
    setOutlineObjects([]);
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
    previewChapterInEditor,
    saveVisualStateToActiveChapter,
    saveCameraViewToActiveChapter,
    saveMaterial,
    isSavingPackage,
    savePackageProgress,
    savePackageStatus,
    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings: updateViewerSettings,
    updateEnvIntensity,
    material,
    setMaterial: updateMaterialState,
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
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    deleteChapterContent,
    setActiveMenu,
    activeMenu,
    cameraRef,
    controlsRef,
    focusTargetRef,
    outlineObjects,
    modelUrl,
    addMarker,
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
    cutMin,
    cutMax,
    setCutValue,
    handleFile,
    toggleCutSection,
    hideSelectedObject,
    resetXray,
    pullApart: pullApartSelectedScope,
    resetAllTransforms: resetAllWithCamera,
    soloSelectedObject,
    showAllObjects,
    objectList,
    highlightObject,
    makeXrayExcept,
    focusObject,
    markers,
    treeDepth,
    setTreeDepth,
    maxTreeDepth,
    searchObject,
    setSearchObject,
    hideAllObjects,
    renameObject,
    deselectObject,
    ...dialogs,
  };
}
