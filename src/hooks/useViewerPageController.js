import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { applyCutAway } from "../utils/cutAwayUtils";
import {
  panelSectionStyle,
  inputStyle,
  mediaButtonStyle,
} from "../constants/viewerStyles";
import {
  flattenObjectTree,
  getMaxTreeDepth,
  isChildOf,
} from "../utils/objectTreeUtils";
import { useChapterManager } from "./useChapterManager";
import { useModelManager } from "./useModelManager";
import { useShaderManager } from "./useShaderManager";
import { useCameraManager } from "./useCameraManager";
import { useMarkerManager } from "./useMarkerManager";
import {
  highlightObject as highlightObjectUtil,
  makeXrayExcept as makeXrayExceptUtil,
  resetXray as resetXrayUtil,
  selectObjectFromMesh as selectObjectFromMeshUtil,
} from "../utils/selectionUtils";

export function useViewerPageController() {
  const [modelScene, setModelScene] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);
  const [materialModelUrl, setMaterialModelUrl] = useState("");
  const [availableModels, setAvailableModels] = useState([]);
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
  const [cutX, setCutX] = useState(0);

  const [cutMin, setCutMin] = useState(-3);
  const [cutMax, setCutMax] = useState(3);
  const [markerMode, setMarkerMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const [outlineObjects, setOutlineObjects] = useState([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  const [selectedObjectName, setSelectedObjectName] = useState("");
  const [material, setMaterial] = useState({
    id: crypto.randomUUID(),
    title: "Materi 3D Baru",
    description: "",
    thumbnail: "",
    availableOnMarketplace: false,
    modelUrl: "",
    chapters: [],
  });

  const [activeChapterId, setActiveChapterId] = useState(null);
  const [rightTab, setRightTab] = useState("material");

  const [treeDepth, setTreeDepth] = useState(2);
  const [searchObject, setSearchObject] = useState("");
  const [animations, setAnimations] = useState([]);
  const [selectedAnimations, setSelectedAnimations] = useState({});
  const [animationCommand, setAnimationCommand] = useState(null);
  const [viewerSettings, setViewerSettings] = useState({
    exposure: 1.8,

    ambientLight: 2.5,
    mainLight: 4,
    fillLight: 2,
    hemiLight: 2,
    envIntensity: 3,
    hdri: "/hdr/studio.hdr",
    showHdriBackground: false,
    shaderMode: "original",
    metalness: 0.3,
    roughness: 0.8,
  });
  const [markerScale, setMarkerScale] = useState(0.08);

  useEffect(() => {
    applyCutAway(modelScene, cutEnabled, cutX);
  }, [cutEnabled, cutX, modelScene]);

  useEffect(() => {
    fetch("/models/models.json")
      .then((res) => res.json())
      .then((data) => {
        setAvailableModels(data);
      });
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    setModelUrl(url);
    setMaterialModelUrl(`/models/${file.name}`);
    setMarkers([]);
  };

  const xrayMaterialRef = useRef(
    new THREE.MeshStandardMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      depthTest: true,
      metalness: 0,
      roughness: 1,
    }),
  );

  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [pendingMarkerPoint, setPendingMarkerPoint] = useState(null);
  const [pendingMarkerName, setPendingMarkerName] = useState("");

  const requestAddMarker = (chapterId) => {
    setActiveChapterId(chapterId);
    setMarkerMode(true);
    setRightTab("chapter");
  };

  const handleMarkerPointPicked = (markerPayload) => {
    setPendingMarkerPoint(markerPayload);
    setPendingMarkerName(markerPayload.text || "");
    setMarkerDialogOpen(true);
  };

  const confirmMarkerDialog = () => {
    if (!pendingMarkerPoint) return;

    addMarker({
      ...pendingMarkerPoint,
      text: pendingMarkerName || "Marker",
    });

    setMarkerDialogOpen(false);
    setPendingMarkerPoint(null);
    setPendingMarkerName("");
    setMarkerMode(false);
  };

  const cancelAddMarker = () => {
    setMarkerMode(false);
    setMarkerDialogOpen(false);
    setPendingMarkerPoint(null);
    setPendingMarkerName("");
  };

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
    handleModelLoaded,
    pullApart,
    toggleCutSection: toggleCutSectionBase,
    soloSelectedObject: soloSelectedObjectBase,
    hideSelectedObject: hideSelectedObjectBase,
    showAllObjects,
    hideAllObjects,
    resetAllTransforms,
  } = useModelManager({
    modelScene,
    setModelScene,
    setObjectList,
    setCutMin,
    setCutMax,
    setCutX,
    setMarkerScale,
    viewerSettings,
    setSelectedObject,
    setOutlineObjects,
    setSelectedObjectName,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
  });

  const toggleCutSection = () => toggleCutSectionBase(setCutEnabled);
  const soloSelectedObject = () => soloSelectedObjectBase(selectedObject);
  const hideSelectedObject = () => hideSelectedObjectBase(selectedObject);

  const { focusObject } = useCameraManager({
    modelScene,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
  });

  const { addMarker } = useMarkerManager({
    activeChapterId,
    setMaterial,
    markers,
    setMarkers,
  });

  const highlightObject = (targetObject) => {
    highlightObjectUtil({
      targetObject,
      modelScene,
      setOutlineObjects,
      setSelectedObject,
    });
  };

  const makeXrayExcept = (targetObject) => {
    makeXrayExceptUtil({
      targetObject,
      modelScene,
      xrayMaterial: xrayMaterialRef.current,
      isChildOf,
      setOutlineObjects,
      setSelectedObject,
    });
  };

  const resetXray = () => {
    resetXrayUtil({
      objectList,
      flattenObjectTree,
      setOutlineObjects,
      setSelectedObject,
    });
  };

  const selectObjectFromMesh = (mesh) => {
    selectObjectFromMeshUtil({
      mesh,
      objectList,
      flattenObjectTree,
      setSelectedObjectName,
      setSelectedObject,
      setOutlineObjects,
      setOrbitEnabled,
      focusTargetRef,
      setIsAutoRotating,
    });
  };

  const {
    activeMarkers,
    createChapterFromSelectedObject,
    saveMaterial,
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
    setMaterial,
    materialModelUrl,
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
  });

  const maxTreeDepth = getMaxTreeDepth(objectList);

  return {
    activeSidebar,
    setActiveSidebar,
    rightTab,
    setRightTab,
    selectedObjectName,
    createChapterFromSelectedObject,
    saveCameraViewToActiveChapter,
    saveMaterial,
    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings,
    updateEnvIntensity,
    material,
    setMaterial,
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
    handleModelLoaded,
    markerMode,
    setMarkerMode,
    selectObjectFromMesh,
    selectedAnimations,
    setSelectedAnimations,
    animationCommand,
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
    cutX,
    cutMin,
    cutMax,
    setCutX,
    handleFile,
    toggleCutSection,
    hideSelectedObject,
    resetXray,
    pullApart,
    resetAllTransforms,
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
    markerDialogOpen,
    pendingMarkerName,
    setPendingMarkerName,
    requestAddMarker,
    handleMarkerPointPicked,
    confirmMarkerDialog,
    cancelAddMarker,
  };
}
