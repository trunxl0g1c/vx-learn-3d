import { useCallback, useEffect, useMemo, useState } from "react";
import { createId } from "../utils/createId";
import {
  addSlideAnimationAssignment,
  addSlideFlowAssignment,
  createSlideDefinition,
  moveSlideInMaterial,
  removeSlideAnimationAssignment,
  removeSlideFlowAssignment,
  updateSlideAnimationAssignment,
  updateSlideFieldInMaterial,
  updateSlideFlowAssignment,
} from "../engine/slide";
import {
  getChapterCameraView,
  getChapterCameraViews,
  getChapterCameraVisualState,
  syncChapterCameraViews,
} from "../engine/chapter";
import {
  createViewerCameraView,
  createViewerVisualState,
} from "../engine/viewer";
import {
  applyChapterModelRotation,
  createChapterFocusTarget,
} from "../engine/model";
import { applySavedViewerVisualState } from "./viewer/applySavedViewerVisualState";
import { isLazyMaterialRecord } from "../engine/project/LazyMaterialRecords";

export function useSlideAuthoring({
  enabled = false,
  material,
  setMaterial,
  hydrateSlideRecord,
  setRightTab,
  setActiveChapterId,
  setMarkerMode,
  modelScene,
  cameraRef,
  controlsRef,
  selectedObject,
  selectedObjects = [],
  blinkSelectedObjectsEnabled = false,
  setBlinkSelectedObjectsEnabled,
  xrayTargetObject,
  xrayTargetObjects = [],
  selectionVisualMode = "none",
  pullApartState,
  getCutStates,
  cutEnabled,
  cutValues,
  cutRanges,
  applyStoredCameraFocusTarget,
  resetXray,
  resetVisualState,
  clearCutSession,
  applySavedPullApart,
  makeOthersXray,
  makeTargetObjectsXray,
  highlightObject,
  highlightSelectedObjectsPreservingVisualState,
  setSelectedObject,
  setSelectedObjectName,
  setOutlineObjects,
  applySavedCuts,
  animationEngine,
  animations = [],
  setSelectedAnimations,
  setAnimationCommand,
}) {
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const slides = Array.isArray(material?.slides) ? material.slides : [];
  const activeSlide = useMemo(
    () => slides.find((slide) => slide.id === activeSlideId) || null,
    [activeSlideId, slides],
  );
  const activeMarkers = activeSlide?.markers || [];

  useEffect(() => {
    if (!enabled) {
      setActiveSlideId(null);
      setMarkerMode?.(false);
      setRightTab?.((current) => (current === "slide" ? null : current));
      return;
    }

    setActiveChapterId?.(null);
    setMarkerMode?.(false);
    setRightTab?.((current) =>
      current === "chapter" || current === "info" ? null : current,
    );
  }, [enabled, setActiveChapterId, setMarkerMode, setRightTab]);

  useEffect(() => {
    if (!enabled || !activeSlideId || !activeSlide) return;
    if (!isLazyMaterialRecord(activeSlide, "slides")) return;
    hydrateSlideRecord?.(activeSlideId).catch((error) => {
      console.error("Failed to load slide detail:", error);
    });
  }, [activeSlide, activeSlideId, enabled, hydrateSlideRecord]);

  const showFeedback = useCallback((type, message) => {
    setFeedback({ type, message });
  }, []);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  const createSlide = useCallback(() => {
    const slide = createSlideDefinition(slides.length);
    setMaterial((previous) => ({
      ...previous,
      slides: [...(previous.slides || []), slide],
    }));
    setActiveSlideId(slide.id);
    setMarkerMode?.(false);
    setRightTab?.("slide");
    showFeedback("success", "Slide created successfully.");
    return slide;
  }, [setMarkerMode, setMaterial, setRightTab, showFeedback, slides.length]);

  const selectSlide = useCallback(
    async (slideId) => {
      if (!slideId) {
        setActiveSlideId(null);
        if (enabled) setRightTab?.(null);
        return null;
      }

      setActiveSlideId(slideId);
      setMarkerMode?.(false);
      setRightTab?.("slide");
      const current = slides.find((slide) => slide.id === slideId) || null;

      if (current && isLazyMaterialRecord(current, "slides")) {
        return (await hydrateSlideRecord?.(slideId)) || current;
      }

      return current;
    },
    [enabled, hydrateSlideRecord, setMarkerMode, setRightTab, slides],
  );

  const closeSlide = useCallback(() => {
    setActiveSlideId(null);
    setMarkerMode?.(false);
    setRightTab?.(null);
  }, [setMarkerMode, setRightTab]);

  const stopAuthoring = useCallback(() => {
    setActiveSlideId(null);
    setMarkerMode?.(false);
    setRightTab?.((current) => (current === "slide" ? null : current));
  }, [setMarkerMode, setRightTab]);

  const updateSlideField = useCallback(
    (slideId, field, value) => {
      setMaterial((previous) =>
        updateSlideFieldInMaterial(previous, slideId, field, value),
      );
    },
    [setMaterial],
  );

  const addParameter = useCallback(
    (slideId) => {
      setMaterial((previous) =>
        updateSlideFieldInMaterial(previous, slideId, "parameters", [
          ...(
            previous.slides?.find((slide) => slide.id === slideId)
              ?.parameters || []
          ),
          { id: createId("slide-parameter"), name: "", value: "", unit: "" },
        ]),
      );
    },
    [setMaterial],
  );

  const updateParameter = useCallback(
    (slideId, parameterId, field, value) => {
      setMaterial((previous) => {
        const slide = previous.slides?.find((item) => item.id === slideId);
        return updateSlideFieldInMaterial(
          previous,
          slideId,
          "parameters",
          (slide?.parameters || []).map((parameter) =>
            parameter.id === parameterId
              ? { ...parameter, [field]: value }
              : parameter,
          ),
        );
      });
    },
    [setMaterial],
  );

  const deleteParameter = useCallback(
    (slideId, parameterId) => {
      setMaterial((previous) => {
        const slide = previous.slides?.find((item) => item.id === slideId);
        return updateSlideFieldInMaterial(
          previous,
          slideId,
          "parameters",
          (slide?.parameters || []).filter(
            (parameter) => parameter.id !== parameterId,
          ),
        );
      });
    },
    [setMaterial],
  );

  const addMedia = useCallback(
    (slideId, type, file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setMaterial((previous) => {
          const slide = previous.slides?.find((item) => item.id === slideId);
          return updateSlideFieldInMaterial(previous, slideId, "media", [
            ...(slide?.media || []),
            {
              id: createId("slide-media"),
              type,
              name: file.name,
              mimeType: file.type,
              data: reader.result,
            },
          ]);
        });
      };
      reader.readAsDataURL(file);
    },
    [setMaterial],
  );

  const deleteMedia = useCallback(
    (slideId, mediaId) => {
      setMaterial((previous) => {
        const slide = previous.slides?.find((item) => item.id === slideId);
        return updateSlideFieldInMaterial(
          previous,
          slideId,
          "media",
          (slide?.media || []).filter((media) => media.id !== mediaId),
        );
      });
    },
    [setMaterial],
  );

  const deleteMarker = useCallback(
    (markerId) => {
      if (!activeSlideId) return;
      setMaterial((previous) => {
        const slide = previous.slides?.find(
          (item) => item.id === activeSlideId,
        );
        return updateSlideFieldInMaterial(
          previous,
          activeSlideId,
          "markers",
          (slide?.markers || []).filter((marker) => marker.id !== markerId),
        );
      });
    },
    [activeSlideId, setMaterial],
  );

  const captureVisualState = useCallback(() => {
    if (!modelScene) return null;
    return createViewerVisualState({
      scene: modelScene,
      primaryObject: selectedObject,
      selectedObject,
      selectedObjects,
      xrayTargetObject,
      xrayTargetObjects,
      selectionVisualMode,
      blinkSelectedObjectsEnabled,
      pullApartState,
      cutStates: getCutStates?.() || [],
      cutEnabled,
      cutValues,
      cutRanges,
    });
  }, [
    blinkSelectedObjectsEnabled,
    cutEnabled,
    cutRanges,
    cutValues,
    getCutStates,
    modelScene,
    pullApartState,
    selectedObject,
    selectedObjects,
    selectionVisualMode,
    xrayTargetObject,
    xrayTargetObjects,
  ]);

  const saveCameraView = useCallback(
    ({ cameraViewId = null, caption = "" } = {}) => {
      if (!activeSlideId || !activeSlide) {
        showFeedback("error", "Choose a slide before saving camera view.");
        return false;
      }

      const cameraView = createViewerCameraView({
        camera: cameraRef.current,
        controls: controlsRef.current,
        modelScene,
      });
      const visualState = captureVisualState();
      if (!cameraView || !visualState) {
        showFeedback("error", "Unable to capture camera and visual state.");
        return false;
      }

      const currentViews = getChapterCameraViews(activeSlide);
      const normalizedCaption = String(caption || "").trim();
      const savedView = { ...cameraView, visualState };
      const nextViews = cameraViewId
        ? currentViews.map((view, index) =>
            view.id === cameraViewId
              ? {
                  ...savedView,
                  id: view.id,
                  caption:
                    normalizedCaption || view.caption || `Camera ${index + 1}`,
                }
              : view,
          )
        : [
            ...currentViews,
            {
              ...savedView,
              id: createId("slide-camera"),
              caption: normalizedCaption || `Camera ${currentViews.length + 1}`,
            },
          ];

      setMaterial((previous) => ({
        ...previous,
        slides: (previous.slides || []).map((slide) =>
          slide.id === activeSlideId
            ? syncChapterCameraViews(slide, nextViews)
            : slide,
        ),
      }));
      showFeedback("success", cameraViewId ? "Camera updated." : "Camera added.");
      return true;
    }, [
      activeSlide,
      activeSlideId,
      cameraRef,
      captureVisualState,
      controlsRef,
      modelScene,
      setMaterial,
      showFeedback,
    ],
  );

  const deleteCameraView = useCallback(
    (cameraViewId) => {
      if (!activeSlideId || !activeSlide) return false;
      const nextViews = getChapterCameraViews(activeSlide).filter(
        (view) => view.id !== cameraViewId,
      );
      setMaterial((previous) => ({
        ...previous,
        slides: (previous.slides || []).map((slide) =>
          slide.id === activeSlideId
            ? syncChapterCameraViews(slide, nextViews)
            : slide,
        ),
      }));
      return true;
    },
    [activeSlide, activeSlideId, setMaterial],
  );

  const previewSlide = useCallback(
    async (slideId, cameraViewId = null) => {
      let slide = slides.find((item) => item.id === slideId) || null;
      if (slide && isLazyMaterialRecord(slide, "slides")) {
        slide = (await hydrateSlideRecord?.(slideId)) || slide;
      }
      if (!slide || !modelScene) return false;

      setActiveSlideId(slideId);
      setRightTab?.("slide");
      resetXray?.({ closeInfo: false });
      resetVisualState?.();
      clearCutSession?.();
      setSelectedObject?.(null);
      setSelectedObjectName?.("");
      setOutlineObjects?.([]);

      const selectedView = getChapterCameraView(slide, cameraViewId);
      applyChapterModelRotation(modelScene, slide, selectedView);
      const focusTarget = createChapterFocusTarget(slide, selectedView);
      if (focusTarget) applyStoredCameraFocusTarget?.(focusTarget);

      const visualState = getChapterCameraVisualState(slide, selectedView);
      if (visualState) {
        applySavedViewerVisualState({
          scene: modelScene,
          chapter: slide,
          chapterObject: null,
          visualState,
          applySavedPullApart,
          makeOthersXray,
          makeTargetObjectsXray,
          highlightObject,
          highlightSelectedObjectsPreservingVisualState,
          setSelectedObjectName,
          setBlinkSelectedObjectsEnabled,
          applySavedCuts,
        });
      }
      return true;
    },
    [
      applySavedCuts,
      applySavedPullApart,
      applyStoredCameraFocusTarget,
      clearCutSession,
      highlightObject,
      highlightSelectedObjectsPreservingVisualState,
      hydrateSlideRecord,
      makeOthersXray,
      makeTargetObjectsXray,
      modelScene,
      resetVisualState,
      resetXray,
      setBlinkSelectedObjectsEnabled,
      setOutlineObjects,
      setRightTab,
      setSelectedObject,
      setSelectedObjectName,
      slides,
    ],
  );

  const addAnimation = useCallback(
    (slideId) =>
      setMaterial((previous) =>
        addSlideAnimationAssignment(previous, slideId),
      ),
    [setMaterial],
  );
  const updateAnimation = useCallback(
    (slideId, assignmentId, patch) =>
      setMaterial((previous) =>
        updateSlideAnimationAssignment(
          previous,
          slideId,
          assignmentId,
          patch,
        ),
      ),
    [setMaterial],
  );
  const removeAnimation = useCallback(
    (slideId, assignmentId) =>
      setMaterial((previous) =>
        removeSlideAnimationAssignment(previous, slideId, assignmentId),
      ),
    [setMaterial],
  );
  const addFlow = useCallback(
    (slideId) =>
      setMaterial((previous) => addSlideFlowAssignment(previous, slideId)),
    [setMaterial],
  );
  const updateFlow = useCallback(
    (slideId, assignmentId, patch) =>
      setMaterial((previous) =>
        updateSlideFlowAssignment(previous, slideId, assignmentId, patch),
      ),
    [setMaterial],
  );
  const removeFlow = useCallback(
    (slideId, assignmentId) =>
      setMaterial((previous) =>
        removeSlideFlowAssignment(previous, slideId, assignmentId),
      ),
    [setMaterial],
  );

  const playAnimationPreview = useCallback(
    (slide) => {
      const assignments = slide?.animations || [];
      if (!assignments.length) return false;
      const selected = animationEngine?.createSelectedAnimationMap?.(
        animations,
        assignments,
      );
      if (!selected) return false;
      animationEngine?.setAnimations?.(animations);
      animationEngine?.setSelectedAnimations?.(selected);
      setSelectedAnimations?.(selected);
      setAnimationCommand?.(null);
      setTimeout(() => {
        setAnimationCommand?.(
          animationEngine?.play?.({ selectedAnimations: selected }),
        );
      }, 10);
      return true;
    },
    [
      animationEngine,
      animations,
      setAnimationCommand,
      setSelectedAnimations,
    ],
  );

  const stopAnimationPreview = useCallback(() => {
    setAnimationCommand?.(animationEngine?.stop?.({ reset: true }));
  }, [animationEngine, setAnimationCommand]);

  const moveSlide = useCallback(
    (slideId, direction) =>
      setMaterial((previous) =>
        moveSlideInMaterial(previous, slideId, direction),
      ),
    [setMaterial],
  );

  const deleteSlide = useCallback(
    (slideId = activeSlideId) => {
      if (!slideId) return false;
      setMaterial((previous) => ({
        ...previous,
        slides: (previous.slides || []).filter((slide) => slide.id !== slideId),
      }));
      if (slideId === activeSlideId) closeSlide();
      return true;
    },
    [activeSlideId, closeSlide, setMaterial],
  );

  return {
    isAuthoringActive: enabled,
    slides,
    activeSlideId,
    setActiveSlideId,
    activeSlide,
    activeMarkers,
    feedback,
    clearFeedback,
    createSlide,
    selectSlide,
    closeSlide,
    stopAuthoring,
    updateSlideField,
    addParameter,
    updateParameter,
    deleteParameter,
    addMedia,
    deleteMedia,
    deleteMarker,
    saveCameraView,
    deleteCameraView,
    previewSlide,
    addAnimation,
    updateAnimation,
    removeAnimation,
    addFlow,
    updateFlow,
    removeFlow,
    playAnimationPreview,
    stopAnimationPreview,
    moveSlide,
    deleteSlide,
  };
}

export default useSlideAuthoring;
