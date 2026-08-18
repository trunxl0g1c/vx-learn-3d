import { useEffect, useRef, useState } from "react";
import { createId } from "../utils/createId";
import {
  exportViqubedDataOnly,
  exportVXPack,
} from "../utils/vxpackUtils";
import { hydrateMaterialFromIndexedDb } from "../modules/project-hub/storage/projectIndexedDb";
import { createAnimationEngine } from "../engine/animation";
import {
  createViewerCameraView,
  createViewerVisualState,
} from "../engine/viewer";
import {
  addChapterAnimationAssignment,
  addChapterFlowAssignment,
  removeChapterAnimationAssignment,
  removeChapterFlowAssignment,
  moveChapterInMaterial,
  getChapterCameraViews,
  syncChapterCameraViews,
  updateChapterAnimationAssignment,
  updateChapterFlowAssignment,
} from "../engine/chapter";

function createObjectIndexPath(object, root) {
  if (!object || !root) return null;
  if (object === root) return [];

  const path = [];
  let current = object;

  while (current && current !== root) {
    const parent = current.parent;

    if (!parent) return null;

    const index = parent.children.indexOf(current);

    if (index < 0) return null;

    path.unshift(index);
    current = parent;
  }

  return current === root ? path : null;
}


export function useChapterManager({
  selectedObjectName,
  selectedObject,
  selectedObjects = [],
  blinkSelectedObjectsEnabled = false,
  blinkTargetObjects = [],
  blinkAssignments = [],
  authoringObject,
  cameraRef,
  controlsRef,
  modelScene,
  material,
  setMaterial,
  materialModelUrl,
  modelFile,
  packageProject,
  packageScene,
  viewerSettings,
  shaderMode,
  metalness,
  roughness,
  cutEnabled,
  cutValues,
  cutRanges,
  getCutStates,
  xrayTargetObject,
  xrayTargetObjects = [],
  xrayNormalObjects = [],
  selectionVisualMode = "none",
  pullApartState,
  activeChapterId,
  setActiveChapterId,
  setRightTab,
  animations,
  setSelectedAnimations,
  setAnimationCommand,
  vxEngine,
  contentAuthoringLocked = false,
  contentAuthoringLockReason = "",
}) {
  const animationEngine = vxEngine?.animation || createAnimationEngine();

  const activeChapter = material.chapters.find(
    (chapter) => chapter.id === activeChapterId,
  );

  const activeMarkers = activeChapter?.markers || [];

  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [savePackageMode, setSavePackageMode] = useState(null);
  const [savePackageProgress, setSavePackageProgress] = useState(0);
  const [savePackageTargetProgress, setSavePackageTargetProgress] = useState(0);
  const [savePackageStatus, setSavePackageStatus] = useState("");

  const [chapterFeedback, setChapterFeedback] = useState(null);

  const showChapterError = (message) => {
    setChapterFeedback({
      type: "error",
      message,
    });
  };

  const showChapterSuccess = (message) => {
    setChapterFeedback({
      type: "success",
      message,
    });
  };

  const clearChapterFeedback = () => {
    setChapterFeedback(null);
  };

  const progressRef = useRef(0);

  useEffect(() => {
    progressRef.current = savePackageProgress;
  }, [savePackageProgress]);

  useEffect(() => {
    if (!isSavingPackage) return;

    const timer = setInterval(() => {
      setSavePackageProgress((current) => {
        if (current >= savePackageTargetProgress) return current;

        const diff = savePackageTargetProgress - current;
        const step = Math.max(1, Math.ceil(diff / 8));

        return Math.min(current + step, savePackageTargetProgress);
      });
    }, 16);

    return () => clearInterval(timer);
  }, [isSavingPackage, savePackageTargetProgress]);

  const waitUntilProgress = (target) => {
    return new Promise((resolve) => {
      const timer = setInterval(() => {
        if (progressRef.current >= target) {
          clearInterval(timer);
          resolve();
        }
      }, 20);
    });
  };

  const createChapterFromSelectedObject = () => {
    clearChapterFeedback();

    if (contentAuthoringLocked) {
      showChapterError(
        contentAuthoringLockReason ||
          "Create Content is disabled while a Pro authoring tool is active.",
      );
      return false;
    }

    if (!selectedObjectName) {
      showChapterError(
        "Pilih object 3D terlebih dahulu sebelum membuat chapter.",
      );
      return;
    }

    const newChapter = {
      id: createId(),
      title: selectedObjectName,
      objectName: selectedObjectName,
      objectUuid: selectedObject?.uuid || null,
      objectPath: createObjectIndexPath(selectedObject, modelScene),
      description: "",
      parameters: [],
      markers: [],
      animations: [],
      flows: [],
      visualState: null,
      cameraViewSaved: false,
      cameraView: null,
      cameraViews: [],

      cameraPosition: cameraRef.current
        ? [
            cameraRef.current.position.x,
            cameraRef.current.position.y,
            cameraRef.current.position.z,
          ]
        : [0, 0, 5],

      cameraTarget: controlsRef.current
        ? [
            controlsRef.current.target.x,
            controlsRef.current.target.y,
            controlsRef.current.target.z,
          ]
        : [0, 0, 0],

      modelRotation: modelScene
        ? [modelScene.rotation.x, modelScene.rotation.y, modelScene.rotation.z]
        : [0, 0, 0],

      callouts: [],
    };

    setMaterial((prev) => ({
      ...prev,
      chapters: [...prev.chapters, newChapter],
    }));

    setActiveChapterId(newChapter.id);
    setRightTab("chapter");

    showChapterSuccess("Chapter berhasil dibuat.");
    return true;
  };

  const resetPackageProgressLater = (delay) => {
    setTimeout(() => {
      setIsSavingPackage(false);
      setSavePackageMode(null);
      setSavePackageProgress(0);
      setSavePackageTargetProgress(0);
      setSavePackageStatus("");
    }, delay);
  };

  const runPackageExport = async (mode = "full") => {
    if (isSavingPackage) return;

    const isDataOnly = mode === "data-only";

    try {
      setIsSavingPackage(true);
      setSavePackageMode(mode);
      setSavePackageProgress(0);
      setSavePackageTargetProgress(0);
      setSavePackageStatus(
        isDataOnly ? "Preparing content data..." : "Preparing package...",
      );

      await new Promise((resolve) => setTimeout(resolve, 80));

      // Chapters, Flow, and Procedure may still be lazy IndexedDB summaries.
      // Hydrate all records before either export so the package never loses
      // unopened material content.
      const hydratedMaterial = await hydrateMaterialFromIndexedDb(
        packageProject?.id || material?.projectId,
        material,
      );
      const exportPayload = {
        project: packageProject,
        material: {
          ...hydratedMaterial,
          modelUrl: materialModelUrl,
        },
        modelFile,
        modelFileName: materialModelUrl,
        viewerSettings,
        scene: packageScene,
        shaderMode,
        metalness,
        roughness,
        onProgress: (percent) => {
          setSavePackageTargetProgress(percent);

          if (isDataOnly) {
            if (percent < 12) {
              setSavePackageStatus("Preparing content data...");
            } else if (percent < 30) {
              setSavePackageStatus("Collecting project settings...");
            } else if (percent < 95) {
              setSavePackageStatus("Building data package...");
            } else if (percent < 100) {
              setSavePackageStatus("Finalizing data package...");
            } else {
              setSavePackageStatus("Data package saved successfully");
            }
            return;
          }

          if (percent < 10) {
            setSavePackageStatus("Preparing package...");
          } else if (percent < 25) {
            setSavePackageStatus("Adding model file...");
          } else if (percent < 95) {
            setSavePackageStatus("Building package...");
          } else if (percent < 100) {
            setSavePackageStatus("Finalizing package...");
          } else {
            setSavePackageStatus("Package saved successfully");
          }
        },
      };

      if (isDataOnly) {
        await exportViqubedDataOnly(exportPayload);
      } else {
        await exportVXPack(exportPayload);
      }

      setSavePackageStatus(
        isDataOnly
          ? "Finalizing data package..."
          : "Finalizing package...",
      );
      setSavePackageTargetProgress(100);

      await waitUntilProgress(100);

      setSavePackageStatus(
        isDataOnly
          ? "Data package saved successfully"
          : "Package saved successfully",
      );

      resetPackageProgressLater(1500);
    } catch (error) {
      console.error(
        isDataOnly
          ? "Gagal menyimpan VIQUBED Data:"
          : "Gagal menyimpan VX Package:",
        error,
      );

      setSavePackageStatus(error.message || "Failed to save package");
      setSavePackageTargetProgress(100);
      setSavePackageProgress(100);
      resetPackageProgressLater(2500);
    }
  };

  const saveMaterial = () => runPackageExport("full");
  const saveDataOnly = () => runPackageExport("data-only");

  const updateChapterField = (chapterId, field, value) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, [field]: value } : chapter,
      ),
    }));
  };

  const captureActiveChapterVisualState = () => {
    if (!modelScene) return null;

    // The Chapter keeps its stable authoring object as selectedObject, while
    // current viewport selection remains the source for highlight, blink,
    // X-Ray, visibility, Pull Apart, and Cut state.
    const visualStateObject = activeChapter ? authoringObject : selectedObject;

    return createViewerVisualState({
      scene: modelScene,
      primaryObject: visualStateObject,
      selectedObject,
      selectedObjects,
      xrayTargetObject,
      xrayTargetObjects,
      xrayNormalObjects,
      selectionVisualMode,
      blinkSelectedObjectsEnabled,
      blinkTargetObjects,
      blinkAssignments,
      pullApartState,
      cutStates: getCutStates?.() || [],
      cutEnabled,
      cutValues,
      cutRanges,
    });
  };

  const saveCameraViewToActiveChapter = ({
    cameraViewId = null,
    caption = "",
  } = {}) => {
    clearChapterFeedback();

    if (!activeChapterId) {
      showChapterError("Choose a chapter before saving camera view.");
      return false;
    }

    const savedCameraView = createViewerCameraView({
      camera: cameraRef.current,
      controls: controlsRef.current,
      modelScene,
    });

    if (!savedCameraView) {
      showChapterError(
        "Camera is not loaded. Please refresh the page and try again.",
      );
      return false;
    }

    const savedVisualState = captureActiveChapterVisualState();

    if (!savedVisualState) {
      showChapterError(
        "Unable to capture the current camera and visual state.",
      );
      return false;
    }

    const savedCameraWithVisualState = {
      ...savedCameraView,
      visualState: savedVisualState,
    };

    const activeCameraViews = getChapterCameraViews(activeChapter);
    if (
      cameraViewId &&
      !activeCameraViews.some((view) => view.id === cameraViewId)
    ) {
      showChapterError("The selected camera view could not be updated.");
      return false;
    }

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) => {
        if (chapter.id !== activeChapterId) return chapter;

        const currentViews = getChapterCameraViews(chapter);
        const normalizedCaption = String(caption || "").trim();
        const nextViews = cameraViewId
          ? currentViews.map((view, index) =>
              view.id === cameraViewId
                ? {
                    ...savedCameraWithVisualState,
                    id: view.id,
                    caption:
                      normalizedCaption ||
                      view.caption ||
                      `Camera ${index + 1}`,
                  }
                : view,
            )
          : [
              ...currentViews,
              {
                ...savedCameraWithVisualState,
                id: createId("chapter-camera"),
                caption:
                  normalizedCaption || `Camera ${currentViews.length + 1}`,
              },
            ];

        return syncChapterCameraViews(chapter, nextViews);
      }),
    }));

    showChapterSuccess(
      cameraViewId
        ? "Camera and visual state updated."
        : "Camera and visual state added.",
    );
    return true;
  };

  const deleteCameraViewFromActiveChapter = (cameraViewId = null) => {
    clearChapterFeedback();

    if (!activeChapterId) {
      showChapterError("Choose a chapter before deleting camera view.");
      return false;
    }

    const currentViews = getChapterCameraViews(activeChapter);
    const hasTarget = cameraViewId
      ? currentViews.some((view) => view.id === cameraViewId)
      : currentViews.length > 0;

    if (!hasTarget) return false;

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) => {
        if (chapter.id !== activeChapterId) return chapter;

        const chapterViews = getChapterCameraViews(chapter);
        const nextViews = cameraViewId
          ? chapterViews.filter((view) => view.id !== cameraViewId)
          : [];

        return syncChapterCameraViews(chapter, nextViews);
      }),
    }));

    showChapterSuccess("Camera view deleted successfully.");
    return true;
  };

  const deleteMarkerFromActiveChapter = (markerId) => {
    if (!activeChapterId) return;

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === activeChapterId
          ? {
              ...chapter,
              markers: (chapter.markers || []).filter(
                (marker) => marker.id !== markerId,
              ),
            }
          : chapter,
      ),
    }));
  };

  const isChapterAnimationSelected = (chapter, animationName) => {
    return animationEngine.isChapterAnimationSelected(chapter, animationName);
  };

  const getChapterAnimationConfig = (chapter, animationName) => {
    return animationEngine.getChapterAnimationConfig(chapter, animationName);
  };

  const toggleChapterAnimation = (chapterId, animationName, checked) => {
    setMaterial((prev) =>
      animationEngine.toggleChapterAnimationInMaterial(
        prev,
        chapterId,
        animationName,
        checked,
      ),
    );
  };

  const updateChapterAnimationField = (
    chapterId,
    animationName,
    field,
    value,
  ) => {
    setMaterial((prev) =>
      animationEngine.updateChapterAnimationFieldInMaterial(
        prev,
        chapterId,
        animationName,
        field,
        value,
      ),
    );
  };


  const addChapterAnimation = (chapterId) => {
    setMaterial((prev) => addChapterAnimationAssignment(prev, chapterId));
  };

  const updateChapterAnimation = (chapterId, assignmentId, patch) => {
    setMaterial((prev) =>
      updateChapterAnimationAssignment(
        prev,
        chapterId,
        assignmentId,
        patch,
      ),
    );
  };

  const removeChapterAnimation = (chapterId, assignmentId) => {
    setMaterial((prev) =>
      removeChapterAnimationAssignment(prev, chapterId, assignmentId),
    );
  };

  const addChapterFlow = (chapterId) => {
    setMaterial((prev) => addChapterFlowAssignment(prev, chapterId));
  };

  const updateChapterFlow = (chapterId, assignmentId, patch) => {
    setMaterial((prev) =>
      updateChapterFlowAssignment(prev, chapterId, assignmentId, patch),
    );
  };

  const removeChapterFlow = (chapterId, assignmentId) => {
    setMaterial((prev) =>
      removeChapterFlowAssignment(prev, chapterId, assignmentId),
    );
  };

  const playAnimationPreview = (chapter) => {
    clearChapterFeedback();

    const chapterAnimations = chapter?.animations || [];

    if (chapterAnimations.length === 0) {
      showChapterError("Chapter has no animations. Please add animations.");
      return;
    }

    const nextSelectedAnimations = animationEngine.createSelectedAnimationMap(
      animations,
      chapterAnimations,
    );

    animationEngine.setAnimations?.(animations);
    animationEngine.setSelectedAnimations?.(nextSelectedAnimations);

    setSelectedAnimations(nextSelectedAnimations);
    setAnimationCommand(null);

    setTimeout(() => {
      setAnimationCommand(
        animationEngine.play({
          selectedAnimations: nextSelectedAnimations,
        }),
      );
    }, 10);
  };

  const stopAnimationPreview = () => {
    setAnimationCommand(animationEngine.stop({ reset: true }));
  };

  const addChapterParameter = (chapterId) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              parameters: [
                ...(chapter.parameters || []),
                {
                  id: createId(),
                  name: "",
                  value: "",
                  unit: "",
                },
              ],
            }
          : chapter,
      ),
    }));
  };

  const updateChapterParameter = (chapterId, parameterId, field, value) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              parameters: (chapter.parameters || []).map((parameter) =>
                parameter.id === parameterId
                  ? { ...parameter, [field]: value }
                  : parameter,
              ),
            }
          : chapter,
      ),
    }));
  };

  const deleteChapterParameter = (chapterId, parameterId) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              parameters: (chapter.parameters || []).filter(
                (parameter) => parameter.id !== parameterId,
              ),
            }
          : chapter,
      ),
    }));
  };

  const addChapterMedia = (chapterId, type, file) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      setMaterial((prev) => ({
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId
            ? {
                ...chapter,
                media: [
                  ...(chapter.media || []),
                  {
                    id: createId(),
                    type,
                    name: file.name,
                    mimeType: file.type,
                    data: reader.result,
                  },
                ],
              }
            : chapter,
        ),
      }));
    };

    reader.readAsDataURL(file);
  };

  const deleteChapterMedia = (chapterId, mediaId) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              media: (chapter.media || []).filter(
                (media) => media.id !== mediaId,
              ),
            }
          : chapter,
      ),
    }));
  };

  const moveChapter = (chapterId, direction) => {
    setMaterial((prev) => moveChapterInMaterial(prev, chapterId, direction));
  };

  const deleteChapterContent = (chapterId) => {
    const targetChapterId = chapterId || activeChapterId;

    if (!targetChapterId) return false;

    setMaterial((prev) => {
      const chapters = Array.isArray(prev?.chapters) ? prev.chapters : [];
      const nextChapters = chapters.filter(
        (chapter) => chapter.id !== targetChapterId,
      );

      if (nextChapters.length === chapters.length) {
        return prev;
      }

      return {
        ...prev,
        chapters: nextChapters,
      };
    });

    if (activeChapterId === targetChapterId) {
      setActiveChapterId(null);
      setRightTab(selectedObjectName ? "info" : null);
    }

    setSelectedAnimations({});
    setAnimationCommand(animationEngine.stop({ reset: true }));

    return true;
  };

  return {
    activeChapter,
    activeMarkers,
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
    deleteCameraViewFromActiveChapter,
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
  };
}
