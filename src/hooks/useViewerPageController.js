import { useRef, useState } from "react";
import { useProjectStore } from "../modules/project-store/ProjectStoreContext";
import { useParams } from "react-router-dom";
import { useGlobalLoading } from "../modules/loading/LoadingContext";

import {
  panelSectionStyle,
  inputStyle,
  mediaButtonStyle,
} from "../constants/viewerStyles";
import { getMaxTreeDepth } from "../utils/objectTreeUtils";
import { useChapterManager } from "./useChapterManager";
import { useModelManager } from "./useModelManager";
import { useShaderManager } from "./useShaderManager";
import { useCameraManager } from "./useCameraManager";
import { useMarkerManager } from "./useMarkerManager";
import { useViewerProject } from "./useViewerProject";
import { useViewerAutosave } from "./useViewerAutosave";
import { useViewerSelection } from "./useViewerSelection";
import { useViewerDialogs } from "./useViewerDialogs";
import { useViewerCut } from "./useViewerCut";
import { useVXEngine } from "./useVXEngine";
import { DEFAULT_VIEWER_BACKGROUND } from "../utils/viewerBackground";

export function useViewerPageController() {
  const vxEngine = useVXEngine();
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

  const updateViewerSettings = (updater) => {
    markDirty();
    setViewerSettings(updater);
  };

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
    setViewerSettings,
  });

  const {
    highlightObject,
    makeXrayExcept,
    resetXray,
    selectObjectFromMesh,
    selectionEngine,
  } = useViewerSelection({
    vxEngine,
    modelScene,
    objectList,
    setOutlineObjects,
    setSelectedObject,
    setSelectedObjectName,
    setOrbitEnabled,
    focusTargetRef,
    setIsAutoRotating,
  });

  const {
    handleModelLoaded,
    pullApart,
    soloSelectedObject: soloSelectedObjectBase,
    hideSelectedObject: hideSelectedObjectBase,
    showAllObjects,
    hideAllObjects,
    resetAllTransforms,
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
    toggleCutSection,
    handleModelLoadedWithCutBounds,
  } = useViewerCut({
    vxEngine,
    modelScene,
    cutEnabled,
    setCutEnabled,
    cutAxis,
    setCutAxis,
    cutValue,
    setCutValue,
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

  const { focusObject, resetCameraToInitialView } = useCameraManager({
    vxEngine,
    modelScene,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
    controlsRef,
    cameraRef,
  });

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
  } = useChapterManager({
    selectedObjectName,
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
    activeChapterId,
    setActiveChapterId,
    setRightTab,
    animations,
    setSelectedAnimations,
    setAnimationCommand,
    vxEngine,
  });

  const maxTreeDepth = getMaxTreeDepth(objectList);

  return {
    saveStatus,
    activeSidebar,
    setActiveSidebar,
    rightTab,
    setRightTab,
    selectedObjectName,
    createChapterFromSelectedObject,
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
    ...dialogs,
  };
}