import { useMemo, useRef, useState } from "react";
import {
  getChapterCameraViews,
  getChapterCameraVisualState,
  normalizeChapterFlowAssignments,
} from "../../../engine/chapter";
import { switchCameraProjectionThen } from "../../../engine/camera";
import {
  applyChapterModelRotation,
  createChapterFocusTarget,
} from "../../../engine/model";
import { normalizeSlideDefinition, normalizeSlideDefinitions } from "../../../engine/slide";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";

export default function usePlayerSlide({
  material,
  playerProject,
  playerAnimation,
  flows = [],
  modelScene,
  cameraRef,
  focusTargetRef,
  setViewerSettings,
  applySavedVisualState,
}) {
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [activeSlideData, setActiveSlideData] = useState(null);
  const [activeCameraViewIndex, setActiveCameraViewIndex] = useState(0);
  const [activeSlideFlowIds, setActiveSlideFlowIds] = useState([]);
  const [slideFlowPlaybackKey, setSlideFlowPlaybackKey] = useState(0);
  const slideSelectionRequestRef = useRef(0);

  const slides = useMemo(
    () => normalizeSlideDefinitions(material?.slides).filter((slide) => slide.enabled !== false),
    [material?.slides],
  );

  const activeSlide = useMemo(() => {
    if (activeSlideData?.id === activeSlideId) return activeSlideData;
    return slides.find((slide) => slide.id === activeSlideId) || null;
  }, [activeSlideData, activeSlideId, slides]);

  const cameraViews = useMemo(
    () => getChapterCameraViews(activeSlide),
    [activeSlide],
  );

  const slideFlowAssignments = useMemo(
    () => normalizeChapterFlowAssignments(activeSlide?.flows).filter((item) => item.flowId),
    [activeSlide?.flows],
  );

  const activeSlideFlows = useMemo(
    () => activeSlideFlowIds.map((id) => flows.find((flow) => flow.id === id)).filter(Boolean),
    [activeSlideFlowIds, flows],
  );

  const hydrateSlide = async (slideId) => {
    let slide = material?.slides?.find((item) => item?.id === slideId) || null;
    if (!slide) return null;
    if (isLazyMaterialRecord(slide, "slides") && playerProject?.loadSlideRecord) {
      slide = (await playerProject.loadSlideRecord(slideId)) || slide;
    }
    return normalizeSlideDefinition(slide);
  };

  const resolveFlow = async (flowId) => {
    let flow = flows.find((item) => item.id === flowId) || null;
    if (flow && isLazyMaterialRecord(flow, "flows") && playerProject?.loadFlowRecord) {
      flow = (await playerProject.loadFlowRecord(flowId)) || flow;
    }
    return flow;
  };

  const applySlideCamera = (slide, index = 0) => {
    const views = getChapterCameraViews(slide);
    if (views.length === 0) {
      setActiveCameraViewIndex(0);
      if (focusTargetRef) focusTargetRef.current = null;
      applySavedVisualState?.(getChapterCameraVisualState(slide, null));
      return null;
    }
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, views.length - 1));
    const view = views[safeIndex];

    // Slides use the same camera transition path as the original Chapter/
    // material playback. Do not teleport the active camera to a stored view;
    // install it as a focus target so CameraAnimator can interpolate there.
    applyChapterModelRotation(modelScene, slide, view);
    const focusTarget = createChapterFocusTarget(slide, view);

    if (focusTarget) {
      switchCameraProjectionThen({
        cameraRef,
        setViewerSettings,
        mode: focusTarget.cameraType,
        onReady: () => {
          if (focusTargetRef) focusTargetRef.current = focusTarget;
        },
      });
    } else if (focusTargetRef) {
      focusTargetRef.current = null;
    }

    setActiveCameraViewIndex(safeIndex);
    applySavedVisualState?.(getChapterCameraVisualState(slide, view));
    return view;
  };

  const prepareAutoFlows = async (slide, requestId = null) => {
    const ids = normalizeChapterFlowAssignments(slide?.flows)
      .filter((assignment) => assignment.autoPlay && assignment.flowId)
      .map((assignment) => assignment.flowId);
    const resolved = await Promise.all(ids.map(resolveFlow));
    if (
      requestId !== null &&
      slideSelectionRequestRef.current !== requestId
    ) {
      return false;
    }
    const playable = resolved
      .filter((flow) => flow?.enabled !== false && (flow?.points?.length || 0) >= 2)
      .map((flow) => flow.id);
    setActiveSlideFlowIds(Array.from(new Set(playable)));
    setSlideFlowPlaybackKey((key) => key + 1);
    return true;
  };

  const prefetchAdjacentSlides = (slideId) => {
    if (!playerProject?.loadSlideRecord) return;

    const sourceSlides = Array.isArray(material?.slides) ? material.slides : [];
    const slideIndex = sourceSlides.findIndex((item) => item?.id === slideId);
    if (slideIndex < 0) return;

    const adjacentSlides = [
      sourceSlides[slideIndex - 1],
      sourceSlides[slideIndex + 1],
    ].filter((slide) => isLazyMaterialRecord(slide, "slides"));

    if (adjacentSlides.length === 0) return;

    const prefetch = () => {
      adjacentSlides.forEach((slide) => {
        playerProject.loadSlideRecord(slide.id).catch(() => {});
      });
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(prefetch, { timeout: 900 });
    } else if (typeof window !== "undefined") {
      window.setTimeout(prefetch, 120);
    } else {
      prefetch();
    }
  };

  const selectSlide = async (slideId, preparedSlide = null) => {
    const requestId = slideSelectionRequestRef.current + 1;
    slideSelectionRequestRef.current = requestId;
    setActiveSlideId(slideId);

    const slide = preparedSlide || await hydrateSlide(slideId);
    if (!slide) return null;
    if (slideSelectionRequestRef.current !== requestId) return null;

    setActiveSlideData(slide);
    playerAnimation?.prepareChapterAnimations?.(slide);
    applySlideCamera(slide, 0);
    const flowsPrepared = await prepareAutoFlows(slide, requestId);
    if (!flowsPrepared) return null;
    if (slideSelectionRequestRef.current !== requestId) return null;

    prefetchAdjacentSlides(slideId);
    return slide;
  };

  const clearSlide = () => {
    slideSelectionRequestRef.current += 1;
    setActiveSlideId(null);
    setActiveSlideData(null);
    setActiveCameraViewIndex(0);
    setActiveSlideFlowIds([]);
    setSlideFlowPlaybackKey((key) => key + 1);
    playerAnimation?.stopChapterAnimations?.();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
  };

  const selectCameraView = (index) => {
    if (!activeSlide) return null;
    return applySlideCamera(activeSlide, index);
  };

  const playAnimations = () =>
    playerAnimation?.playAnimationAssignments?.(activeSlide?.animations || []) || false;

  const stopAnimations = () => playerAnimation?.stopChapterAnimations?.();

  const playFlow = async (flowId) => {
    if (!slideFlowAssignments.some((assignment) => assignment.flowId === flowId)) return false;
    const flow = await resolveFlow(flowId);
    if (!flow || flow.enabled === false || (flow.points?.length || 0) < 2) return false;
    setActiveSlideFlowIds((current) => Array.from(new Set([...current, flowId])));
    setSlideFlowPlaybackKey((key) => key + 1);
    return true;
  };

  const stopFlows = () => {
    setActiveSlideFlowIds([]);
    setSlideFlowPlaybackKey((key) => key + 1);
  };

  const handleFlowComplete = (flowId) => {
    const flow = flows.find((item) => item.id === flowId);
    if (flow?.settings?.repeat) return;
    setActiveSlideFlowIds((current) => current.filter((id) => id !== flowId));
  };

  const speakDescription = () => {
    if (!activeSlide?.description || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeSlide.description);
    utterance.lang = "id-ID";
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel?.();
  };

  return {
    slides,
    activeSlide,
    activeSlideId,
    cameraViews,
    activeCameraViewIndex,
    slideFlowAssignments,
    activeSlideFlowIds,
    activeSlideFlows,
    slideFlowPlaybackKey,
    prepareSlide: hydrateSlide,
    selectSlide,
    clearSlide,
    selectCameraView,
    playAnimations,
    stopAnimations,
    playFlow,
    stopFlows,
    handleFlowComplete,
    speakDescription,
    stopSpeaking,
  };
}
