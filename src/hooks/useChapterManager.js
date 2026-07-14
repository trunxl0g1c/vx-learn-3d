import { useEffect, useRef, useState } from "react";
import { exportVXPack } from "../utils/vxpackUtils";
import { createAnimationEngine } from "../engine/animation";

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

function createObjectReference(object, root = null) {
  if (!object) return null;

  return {
    uuid: object.uuid || null,
    name: object.name || object.userData?.name || null,
    path: createObjectIndexPath(object, root),
  };
}

function createCutPercentages(values = {}, ranges = {}) {
  return ["x", "y", "z"].reduce((result, axis) => {
    const min = Number(ranges?.[axis]?.min);
    const max = Number(ranges?.[axis]?.max);
    const value = Number(values?.[axis]);
    const span = max - min;

    result[axis] =
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      Number.isFinite(value) &&
      Math.abs(span) > 0.000001
        ? Math.max(0, Math.min(100, ((max - value) / span) * 100))
        : 0;

    return result;
  }, {});
}

function collectHiddenObjectReferences(scene) {
  if (!scene) return [];

  const hiddenObjects = [];

  scene.traverse((object) => {
    if (object === scene || object.visible !== false) return;

    const reference = createObjectReference(object, scene);

    if (reference?.uuid || reference?.name) {
      hiddenObjects.push(reference);
    }
  });

  return hiddenObjects;
}

export function useChapterManager({
  selectedObjectName,
  selectedObject,
  authoringObject,
  cameraRef,
  controlsRef,
  modelScene,
  material,
  setMaterial,
  materialModelUrl,
  modelFile,
  viewerSettings,
  shaderMode,
  metalness,
  roughness,
  cutEnabled,
  cutValues,
  cutRanges,
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
}) {
  const animationEngine = vxEngine?.animation || createAnimationEngine();

  const activeChapter = material.chapters.find(
    (chapter) => chapter.id === activeChapterId
  );

  const activeMarkers = activeChapter?.markers || [];

  const [isSavingPackage, setIsSavingPackage] = useState(false);
  const [savePackageProgress, setSavePackageProgress] = useState(0);
  const [savePackageTargetProgress, setSavePackageTargetProgress] = useState(0);
  const [savePackageStatus, setSavePackageStatus] = useState("");

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
    if (!selectedObjectName) {
      alert("Pilih object 3D dulu");
      return;
    }

    const newChapter = {
      id: crypto.randomUUID(),
      title: selectedObjectName,
      objectName: selectedObjectName,
      objectUuid: selectedObject?.uuid || null,
      objectPath: createObjectIndexPath(selectedObject, modelScene),
      description: "",
      parameters: [],
      markers: [],
      animations: [],
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
        ? [
            modelScene.rotation.x,
            modelScene.rotation.y,
            modelScene.rotation.z,
          ]
        : [0, 0, 0],
      callouts: [],
    };

    setMaterial((prev) => ({
      ...prev,
      chapters: [...prev.chapters, newChapter],
    }));

    setActiveChapterId(newChapter.id);
    setRightTab("chapter");
  };

  const saveMaterial = async () => {
    if (isSavingPackage) return;

    try {
      setIsSavingPackage(true);
      setSavePackageProgress(0);
      setSavePackageTargetProgress(0);
      setSavePackageStatus("Preparing package...");

      await new Promise((resolve) => setTimeout(resolve, 80));

      await exportVXPack({
        material: {
          ...material,
          modelUrl: materialModelUrl,
        },
        modelFile,
        viewerSettings,
        shaderMode,
        metalness,
        roughness,
        onProgress: (percent) => {
          setSavePackageTargetProgress(percent);

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
      });

      setSavePackageStatus("Finalizing package...");
      setSavePackageTargetProgress(100);

      await waitUntilProgress(100);

      setSavePackageStatus("Package saved successfully");

      setTimeout(() => {
        setIsSavingPackage(false);
        setSavePackageProgress(0);
        setSavePackageTargetProgress(0);
        setSavePackageStatus("");
      }, 1500);
    } catch (error) {
      console.error("Gagal menyimpan VX Package:", error);

      setSavePackageStatus(error.message || "Failed to save package");
      setSavePackageTargetProgress(100);
      setSavePackageProgress(100);

      setTimeout(() => {
        setIsSavingPackage(false);
        setSavePackageProgress(0);
        setSavePackageTargetProgress(0);
        setSavePackageStatus("");
      }, 2500);
    }
  };

  const updateChapterField = (chapterId, field, value) => {
    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === chapterId ? { ...chapter, [field]: value } : chapter
      ),
    }));
  };

  const saveVisualStateToActiveChapter = () => {
    if (!activeChapterId) {
      alert("Pilih Bab terlebih dahulu");
      return;
    }

    if (!modelScene) {
      alert("Model belum siap");
      return;
    }

    // An active chapter owns a stable authoring object. Tool selection may
    // move to other objects for Cut/X-Ray/Pull Apart without rebinding the
    // chapter or changing the object restored by its visual state.
    const visualStateObject = activeChapter ? authoringObject : selectedObject;
    const selectedReference = createObjectReference(
      visualStateObject,
      modelScene,
    );
    const xrayReference = createObjectReference(xrayTargetObject, modelScene);
    const pullApartReference = createObjectReference(
      pullApartState?.targetObject,
      modelScene,
    );

    const persistentCutStates = getCutStates?.() || [];
    const cuts = persistentCutStates
      .map((cutState) => {
        const targetReference = createObjectReference(
          cutState?.target,
          modelScene,
        );

        if (!cutState?.enabled || !targetReference) return null;

        return {
          enabled: true,
          targetObject: targetReference,
          values: {
            x: Number(cutState?.values?.x ?? 0),
            y: Number(cutState?.values?.y ?? 0),
            z: Number(cutState?.values?.z ?? 0),
          },
          percentages: createCutPercentages(
            cutState?.values,
            cutState?.bounds,
          ),
        };
      })
      .filter(Boolean);

    // Keep the legacy single-cut field so older packages/players can still
    // read the first saved cut. New Player versions use visualState.cuts.
    const legacyCut = cuts[0] || {
      enabled: Boolean(cutEnabled),
      targetObject: selectedReference,
      values: {
        x: Number(cutValues?.x ?? 0),
        y: Number(cutValues?.y ?? 0),
        z: Number(cutValues?.z ?? 0),
      },
      percentages: createCutPercentages(cutValues, cutRanges),
    };

    const visualState = {
      version: 2,
      selectedObject: selectedReference,
      visibility: {
        hiddenObjects: collectHiddenObjectReferences(modelScene),
      },
      xray: {
        enabled: Boolean(xrayReference),
        targetObject: xrayReference,
      },
      pullApart: {
        enabled: Boolean(pullApartState?.enabled),
        targetObject: pullApartReference,
      },
      cuts,
      cut: legacyCut,
    };

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === activeChapterId
          ? {
              ...chapter,
              visualState,
            }
          : chapter,
      ),
    }));

    alert("Visual state berhasil disimpan ke Bab aktif");
  };

  const saveCameraViewToActiveChapter = () => {
    if (!activeChapterId) {
      alert("Pilih Bab terlebih dahulu");
      return;
    }

    if (!cameraRef.current || !controlsRef.current) {
      alert("Camera belum siap");
      return;
    }

    const cameraPos = cameraRef.current.position.clone();
    const cameraTarget = controlsRef.current.target.clone();

    const minDistance = 2.5;
    const currentDistance = cameraPos.distanceTo(cameraTarget);

    if (currentDistance < minDistance) {
      const direction = cameraPos.clone().sub(cameraTarget).normalize();
      cameraPos.copy(
        cameraTarget.clone().add(direction.multiplyScalar(minDistance))
      );
    }

    setMaterial((prev) => ({
      ...prev,
      chapters: prev.chapters.map((chapter) =>
        chapter.id === activeChapterId
          ? {
              ...chapter,
              cameraPosition: [cameraPos.x, cameraPos.y, cameraPos.z],
              cameraTarget: [cameraTarget.x, cameraTarget.y, cameraTarget.z],
              modelRotation: modelScene
                ? [
                    modelScene.rotation.x,
                    modelScene.rotation.y,
                    modelScene.rotation.z,
                  ]
                : [0, 0, 0],
            }
          : chapter
      ),
    }));

    alert("Camera view berhasil disimpan ke Bab aktif");
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
                (marker) => marker.id !== markerId
              ),
            }
          : chapter
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
        checked
      )
    );
  };

  const updateChapterAnimationField = (
    chapterId,
    animationName,
    field,
    value
  ) => {
    setMaterial((prev) =>
      animationEngine.updateChapterAnimationFieldInMaterial(
        prev,
        chapterId,
        animationName,
        field,
        value
      )
    );
  };

  const playAnimationPreview = (chapter) => {
    const chapterAnimations = chapter.animations || [];

    if (chapterAnimations.length === 0) {
      alert("Pilih animasi untuk bab ini terlebih dahulu");
      return;
    }

    const nextSelectedAnimations = animationEngine.createSelectedAnimationMap(
      animations,
      chapterAnimations
    );

    animationEngine.setAnimations?.(animations);
    animationEngine.setSelectedAnimations?.(nextSelectedAnimations);

    setSelectedAnimations(nextSelectedAnimations);
    setAnimationCommand(null);

    setTimeout(() => {
      setAnimationCommand(
        animationEngine.play({
          selectedAnimations: nextSelectedAnimations,
        })
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
                  id: crypto.randomUUID(),
                  name: "",
                  value: "",
                  unit: "",
                },
              ],
            }
          : chapter
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
                  : parameter
              ),
            }
          : chapter
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
                (parameter) => parameter.id !== parameterId
              ),
            }
          : chapter
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
                    id: crypto.randomUUID(),
                    type,
                    name: file.name,
                    mimeType: file.type,
                    data: reader.result,
                  },
                ],
              }
            : chapter
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
                (media) => media.id !== mediaId
              ),
            }
          : chapter
      ),
    }));
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
  };
}