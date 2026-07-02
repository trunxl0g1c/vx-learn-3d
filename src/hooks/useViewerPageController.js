import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "../modules/project-store/ProjectStoreContext";
import { useParams } from "react-router-dom";
import * as THREE from "three";
import useProjectLoader from "../core/project/useProjectLoader";
import { useGlobalLoading } from "../modules/loading/LoadingContext";
import { saveProjectDraftToIndexedDb } from "../modules/project-hub/storage/projectIndexedDb";

import { importVXPack, isVXPackFile } from "../utils/vxpackUtils";
import { getCurrentUserName } from "../utils/authUser";
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
  const { projectId } = useParams();
  const { updateLoading, hideLoading } = useGlobalLoading();

  const {
    loadProject,
  } = useProjectLoader();

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
  const [modelUrl, setModelUrl] = useState(null);
  const [modelFile, setModelFile] = useState(null);
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
  const [cutAxis, setCutAxis] = useState("x");
  const [cutValue, setCutValue] = useState(0);
  const [cutMin, setCutMin] = useState(-3);
  const [cutMax, setCutMax] = useState(3);
  const cutBoundsRef = useRef(null);

  const [markerMode, setMarkerMode] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  const [outlineObjects, setOutlineObjects] = useState([]);
  const [isTransforming, setIsTransforming] = useState(false);
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  const [selectedObjectName, setSelectedObjectName] = useState("");
  const currentUserName = getCurrentUserName();

  const [material, setMaterial] = useState({
    id: crypto.randomUUID(),
    title: "Materi 3D Baru",
    description: "",
    version: "1.0.0",
    author: currentUserName,
    thumbnail: "",
    availableOnMarketplace: false,
    modelUrl: "",
    chapters: [],
  });

  const updateMaterialState = (updater) => {
    markDirty();
    setMaterial(updater);
  };

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
    if (!projectId || projectId === "demo") return;

    let cancelled = false;

    async function openProject() {
      try {
        updateLoading({
          title: "Opening VXplore Project",
          text: "Reading project data...",
          progress: null,
        });

        const loaded = await loadProject(projectId);

        if (!loaded || cancelled) {
          hideLoading();
          return;
        }

        const {
          project,
          projectFile,
          projectDraft,
          glbUrl,
          glbFileName,
          material,
          viewer,
          scene,
        } = loaded;

        setCurrentProject(project);
        setProjectDraft(projectDraft);

        updateLoading({
          text: `Opening ${project.name}...`,
        });

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (cancelled) return;

        updateLoading({
          text: "Loading 3D model...",
        });

        setModelUrl(glbUrl);
        setModelFile(projectFile);
        setMaterialModelUrl(glbFileName || project.fileName || "");

        setMaterial((prev) => ({
          ...prev,
          ...(material || {}),
          projectId: project.id,
          projectName: project.name,
        }));

        if (viewer) {
          setViewerSettings((prev) => ({
            ...prev,
            ...viewer,
          }));
        }

        if (scene?.markers) {
          setMarkers(scene.markers);
        }
      } catch (error) {
        console.error("Gagal membuka project:", error);

        updateLoading({
          title: "Failed to Open Project",
          text: error?.message || "Unknown error",
          progress: null,
        });

        setTimeout(() => {
          hideLoading();
        }, 1200);
      }
    }

    openProject();

    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    loadProject,
    updateLoading,
    hideLoading,
    setCurrentProject,
    setProjectDraft,
  ]);

  useEffect(() => {
    if (!projectId || projectId === "demo") return;
    if (!material?.projectId) return;
    if (!dirty) return;

    setSaveStatus("saving");

    const timer = setTimeout(async () => {
      try {
        const draftToSave = {
          projectId,
          material,
          viewer: viewerSettings,
          scene: {
            markers,
            cut: {
              enabled: cutEnabled,
              axis: cutAxis,
              value: cutValue,
            },
          },
          updatedAt: new Date().toISOString(),
        };

        await saveProjectDraftToIndexedDb(projectId, draftToSave);
        setProjectDraft(draftToSave);

        markSaved();
      } catch (error) {
        console.error("Autosave gagal:", error);
        markSaveError();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    projectId,
    dirty,
    material,
    markers,
    viewerSettings,
    cutEnabled,
    cutAxis,
    cutValue,
    setSaveStatus,
    markSaved,
    markSaveError,
    setProjectDraft,
  ]);

  useEffect(() => {
    if (!projectId || projectId === "demo") return;
    if (!material?.projectId) return;

    setProjectDraft((prev) => ({
      ...(prev || {}),
      projectId,
      material,
      viewer: viewerSettings,
      scene: {
        ...(prev?.scene || {}),
        markers,
        cut: {
          enabled: cutEnabled,
          axis: cutAxis,
          value: cutValue,
        },
      },
      updatedAt: new Date().toISOString(),
    }));
  }, [
    projectId,
    material,
    viewerSettings,
    markers,
    cutEnabled,
    cutAxis,
    cutValue,
    setProjectDraft,
  ]);

  useEffect(() => {
    applyCutAway(modelScene, cutEnabled, cutValue, cutAxis);
  }, [modelScene, cutEnabled, cutValue, cutAxis]);

  useEffect(() => {
    fetch("/models/models.json")
      .then((res) => res.json())
      .then((data) => {
        setAvailableModels(data);
      });
  }, []);

  const updateCutAxis = (axis) => {
    const bounds = cutBoundsRef.current?.[axis];

    if (!bounds) {
      setCutAxis(axis);
      return;
    }

    setCutAxis(axis);
    setCutMin(bounds.min);
    setCutMax(bounds.max);
    setCutValue((bounds.min + bounds.max) / 2);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
      if (isVXPackFile(file)) {
        const { manifest } = await importVXPack(file);

        setMaterial(manifest);
        setModelUrl(manifest.modelUrl);
        setMaterialModelUrl(manifest.originalModelUrl || "");
        setModelFile(null);
        setMarkers([]);

        setActiveChapterId(manifest.chapters?.[0]?.id || null);
        setRightTab("material");

        e.target.value = "";
        return;
      }

      const url = URL.createObjectURL(file);

      setModelUrl(url);
      setModelFile(file);
      setMaterialModelUrl(`/models/${file.name}`);
      setMarkers([]);

      e.target.value = "";
    } catch (error) {
      console.error("Gagal load file:", error);
      alert(error.message || "Gagal membuka file");
    }
  };

  const xrayMaterialRef = useRef(
    new THREE.MeshPhysicalMaterial({
      color: "#4fc3f7",
      transparent: true,
      opacity: 0.22,
      roughness: 0.2,
      metalness: 0,
      depthWrite: false,
      depthTest: true,
    })
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
    setCutX: setCutValue,
    setMarkerScale,
    viewerSettings,
    setSelectedObject,
    setOutlineObjects,
    setSelectedObjectName,
    setTargetRotationY,
    setIsAutoRotating,
    focusTargetRef,
  });

  const handleModelLoadedWithCutBounds = (scene) => {
    handleModelLoaded(scene);

    scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(scene);

    cutBoundsRef.current = {
      x: { min: box.min.x, max: box.max.x },
      y: { min: box.min.y, max: box.max.y },
      z: { min: box.min.z, max: box.max.z },
    };

    const bounds = cutBoundsRef.current[cutAxis];

    setCutMin(bounds.min);
    setCutMax(bounds.max);
    setCutValue((bounds.min + bounds.max) / 2);

    updateLoading({
      text: "Preparing scene...",
    });

    setTimeout(() => {
      hideLoading();
    }, 700);
  };

  const toggleCutSection = () => toggleCutSectionBase(setCutEnabled);
  const soloSelectedObject = () => soloSelectedObjectBase(selectedObject);
  const hideSelectedObject = () => hideSelectedObjectBase(selectedObject);

  const { focusObject, resetCameraToInitialView } = useCameraManager({
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
    setViewerSettings,
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
    pullApart,
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
    markerDialogOpen,
    pendingMarkerName,
    setPendingMarkerName,
    requestAddMarker,
    handleMarkerPointPicked,
    confirmMarkerDialog,
    cancelAddMarker,
  };
}