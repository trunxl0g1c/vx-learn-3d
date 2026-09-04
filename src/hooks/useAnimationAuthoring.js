import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAnimationAuthoringManagerAdapter } from "../managers/AnimationAuthoringManager";
import { isLazyMaterialRecord } from "../engine/project/LazyMaterialRecords";
import { useAnimationTrackParentPivot } from "./useAnimationTrackParentPivot";
import { useAnimationTrackKeyframes } from "./useAnimationTrackKeyframes";
import { getAnimationReferenceIdentity, normalizeAnimationRigPoint } from "./animationAuthoringUtils";

export function useAnimationAuthoring({
  material,
  setMaterial,
  modelScene,
  selectedObject,
  animationEngine = null,
  hydrateAnimationRecord = null,
}) {
  const manager = useMemo(
    () => createAnimationAuthoringManagerAdapter(animationEngine),
    [animationEngine],
  );
  const animations = useMemo(
    () => manager.normalizeDefinitions(material?.authoredAnimations),
    [manager, material?.authoredAnimations],
  );
  const [activeAnimationId, setActiveAnimationId] = useState(null);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [transformMode, setTransformMode] = useState("translate");
  const [isAuthoringActive, setIsAuthoringActive] = useState(false);
  const [isPivotEditing, setIsPivotEditing] = useState(false);
  const [rigPointEditTarget, setRigPointEditTarget] = useState("pivot");
  const [pivotSnapMode, setPivotSnapMode] = useState("surface");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedKeyframeId, setSelectedKeyframeId] = useState(null);
  const baselineRef = useRef([]);
  const previewStartRef = useRef(0);
  const previewTimeRef = useRef(0);

  useEffect(() => {
    if (animations.length === 0) {
      setActiveAnimationId(null);
      setActiveTrackId(null);
      setSelectedKeyframeId(null);
      setCurrentTime(0);
      setIsPreviewing(false);
      setIsPaused(false);
      setIsPivotEditing(false);
      return;
    }

    if (!animations.some((animation) => animation.id === activeAnimationId)) {
      setActiveAnimationId(animations[0].id);
    }
  }, [activeAnimationId, animations]);

  const activeAnimation = useMemo(
    () =>
      animations.find((animation) => animation.id === activeAnimationId) || null,
    [activeAnimationId, animations],
  );
  const isLoadingActiveAnimation = isLazyMaterialRecord(
    activeAnimation,
    "authoredAnimations",
  );

  useEffect(() => {
    if (
      !isAuthoringActive ||
      !activeAnimationId ||
      !hydrateAnimationRecord ||
      !isLazyMaterialRecord(activeAnimation, "authoredAnimations")
    ) {
      return;
    }

    hydrateAnimationRecord(activeAnimationId).catch((error) => {
      console.error("Failed to load Animation detail:", error);
    });
  }, [
    activeAnimation,
    activeAnimationId,
    hydrateAnimationRecord,
    isAuthoringActive,
  ]);

  useEffect(() => {
    const tracks = activeAnimation?.tracks || [];
    if (tracks.length === 0) {
      setActiveTrackId(null);
      setSelectedKeyframeId(null);
      return;
    }

    if (!tracks.some((track) => track.id === activeTrackId)) {
      setActiveTrackId(tracks[0].id);
    }
  }, [activeAnimation, activeTrackId]);

  const activeTrack = useMemo(
    () =>
      activeAnimation?.tracks?.find((track) => track.id === activeTrackId) || null,
    [activeAnimation, activeTrackId],
  );
  const activeTrackObject = useMemo(
    () =>
      activeTrack && modelScene
        ? manager.findObject(modelScene, activeTrack.object)
        : null,
    [activeTrack, manager, modelScene],
  );
  const activeMorphTargetObject = useMemo(
    () =>
      activeTrack?.rig?.type === "morph" &&
      activeTrack?.rig?.morph?.targetObject &&
      modelScene
        ? manager.findObject(modelScene, activeTrack.rig.morph.targetObject)
        : null,
    [activeTrack, manager, modelScene],
  );
  const activeMorphCompatibility = useMemo(
    () =>
      activeTrack?.rig?.type === "morph"
        ? manager.getMorphCompatibility(
            activeTrackObject,
            activeMorphTargetObject,
          )
        : null,
    [
      activeMorphTargetObject,
      activeTrack?.rig?.type,
      activeTrackObject,
      manager,
    ],
  );

  const activeRigPointObject = useMemo(() => {
    if (!modelScene || !activeTrack) return null;
    if (rigPointEditTarget === "baseAnchor") {
      return manager.findObject(modelScene, activeTrack.rig?.hydraulic?.baseObject);
    }
    if (rigPointEditTarget === "targetAnchor") {
      return manager.findObject(modelScene, activeTrack.rig?.hydraulic?.targetObject);
    }
    return activeTrackObject;
  }, [activeTrack, activeTrackObject, manager, modelScene, rigPointEditTarget]);

  const activeRigPointValue = useMemo(() => {
    if (rigPointEditTarget === "baseAnchor") {
      return activeTrack?.rig?.hydraulic?.baseAnchor || [0, 0, 0];
    }
    if (rigPointEditTarget === "targetAnchor") {
      return activeTrack?.rig?.hydraulic?.targetAnchor || [0, 0, 0];
    }
    return activeTrack?.rig?.pivot || [0, 0, 0];
  }, [activeTrack, rigPointEditTarget]);

  useEffect(() => {
    if (!isPivotEditing) return;
    if (activeRigPointObject) return;
    setIsPivotEditing(false);
  }, [activeRigPointObject, isPivotEditing]);

  useEffect(() => {
    const keyframes = activeTrack?.keyframes || [];
    if (keyframes.length === 0) {
      setSelectedKeyframeId(null);
      return;
    }

    if (!keyframes.some((keyframe) => keyframe.id === selectedKeyframeId)) {
      setSelectedKeyframeId(keyframes[0].id);
    }
  }, [activeTrack, selectedKeyframeId]);

  const selectedKeyframe = useMemo(
    () =>
      activeTrack?.keyframes?.find(
        (keyframe) => keyframe.id === selectedKeyframeId,
      ) || null,
    [activeTrack, selectedKeyframeId],
  );

  const commitAnimations = useCallback(
    (updater) => {
      setMaterial((previous) => {
        const current = manager.normalizeDefinitions(
          previous?.authoredAnimations,
        );
        const next = typeof updater === "function" ? updater(current) : updater;

        return {
          ...previous,
          authoredAnimations: manager.normalizeDefinitions(next),
        };
      });
    },
    [manager, setMaterial],
  );

  const restoreBaseline = useCallback((clear = true) => {
    if (baselineRef.current.length > 0) {
      manager.restoreBaseline(baselineRef.current);
    }
    if (clear) baselineRef.current = [];
  }, [manager]);

  const captureBaseline = useCallback(
    (animation = activeAnimation) => {
      if (!animation || !modelScene) return false;
      baselineRef.current = manager.captureBaseline(modelScene, animation);
      return baselineRef.current.length > 0;
    },
    [activeAnimation, manager, modelScene],
  );

  const ensureBaseline = useCallback(() => {
    if (baselineRef.current.length > 0) return true;
    return captureBaseline();
  }, [captureBaseline]);

  useEffect(() => {
    if (
      !isAuthoringActive ||
      !activeAnimation ||
      isLoadingActiveAnimation ||
      !modelScene ||
      baselineRef.current.length > 0
    ) {
      return;
    }

    captureBaseline(activeAnimation);
  }, [
    activeAnimation,
    captureBaseline,
    isAuthoringActive,
    isLoadingActiveAnimation,
    modelScene,
  ]);

  const createAnimation = useCallback(() => {
    restoreBaseline();
    const next = manager.createDefinition(animations.length + 1);
    commitAnimations((current) => [...current, next]);
    setActiveAnimationId(next.id);
    setActiveTrackId(null);
    setCurrentTime(0);
    setSelectedKeyframeId(null);
    setIsPreviewing(false);
    setIsPaused(false);
    setIsPivotEditing(false);
    setIsAuthoringActive(true);
    return next;
  }, [animations.length, commitAnimations, manager, restoreBaseline]);

  const selectAnimation = useCallback(
    (animationId) => {
      restoreBaseline();
      setIsPreviewing(false);
      setIsPaused(false);
      setCurrentTime(0);
      setIsPivotEditing(false);
      setActiveAnimationId(animationId || null);
      setActiveTrackId(null);
      setSelectedKeyframeId(null);
      if (animationId) setIsAuthoringActive(true);
    },
    [restoreBaseline],
  );

  const updateAnimation = useCallback(
    (animationId, patch) => {
      if (!animationId) return;

      commitAnimations((current) =>
        current.map((animation) => {
          if (animation.id !== animationId) return animation;
          const resolved = typeof patch === "function" ? patch(animation) : patch;

          return {
            ...animation,
            ...resolved,
            settings: {
              ...animation.settings,
              ...(resolved?.settings || {}),
            },
            updatedAt: new Date().toISOString(),
          };
        }),
      );
    },
    [commitAnimations],
  );

  const deleteAnimation = useCallback(
    (animationId = activeAnimationId) => {
      if (!animationId) return false;
      restoreBaseline();
      commitAnimations((current) =>
        current.filter((animation) => animation.id !== animationId),
      );
      setActiveAnimationId(null);
      setActiveTrackId(null);
      setSelectedKeyframeId(null);
      setCurrentTime(0);
      setIsPreviewing(false);
      setIsPaused(false);
      setIsPivotEditing(false);
      return true;
    },
    [activeAnimationId, commitAnimations, restoreBaseline],
  );

  const duplicateAnimation = useCallback(() => {
    if (!activeAnimation || isLoadingActiveAnimation) return null;
    restoreBaseline();
    const duplicate = manager.duplicateDefinition(
      activeAnimation,
      animations.map((animation) => animation.name),
    );
    commitAnimations((current) => {
      const index = current.findIndex(
        (animation) => animation.id === activeAnimation.id,
      );
      if (index < 0) return [...current, duplicate];
      const next = [...current];
      next.splice(index + 1, 0, duplicate);
      return next;
    });
    setActiveAnimationId(duplicate.id);
    setActiveTrackId(duplicate.tracks?.[0]?.id || null);
    setSelectedKeyframeId(null);
    setCurrentTime(0);
    setIsPreviewing(false);
    setIsPaused(false);
    setIsPivotEditing(false);
    setIsAuthoringActive(true);
    return duplicate;
  }, [
    activeAnimation,
    animations,
    commitAnimations,
    isLoadingActiveAnimation,
    manager,
    restoreBaseline,
  ]);

  const addTrackFromSelectedObject = useCallback(() => {
    if (!activeAnimationId || !selectedObject || !modelScene) return false;
    const track = manager.createTrack(selectedObject, modelScene);
    if (!track?.object) return false;
    const identity = getAnimationReferenceIdentity(track.object);
    if (
      activeAnimation?.tracks?.some(
        (item) => getAnimationReferenceIdentity(item.object) === identity,
      )
    ) {
      return false;
    }

    const object = manager.findObject(modelScene, track.object);
    const baselineEntry = manager.captureTrackBaseline(object, track.id);
    if (baselineEntry) {
      baselineRef.current.push(baselineEntry);
    }

    updateAnimation(activeAnimationId, (animation) => ({
      tracks: [...(animation.tracks || []), track],
    }));
    setActiveTrackId(track.id);
    setSelectedKeyframeId(null);
    return true;
  }, [
    activeAnimation?.tracks,
    activeAnimationId,
    manager,
    modelScene,
    selectedObject,
    updateAnimation,
  ]);

  const deleteTrack = useCallback(
    (trackId = activeTrackId) => {
      if (!activeAnimationId || !trackId) return false;
      updateAnimation(activeAnimationId, (animation) => ({
        tracks: manager.organizeTracks(
          (animation.tracks || [])
            .filter((track) => track.id !== trackId)
            .map((track) =>
              track.rig?.parentTrackId === trackId
                ? {
                    ...track,
                    rig: { ...track.rig, parentTrackId: null },
                  }
                : track,
            ),
        ),
      }));
      setActiveTrackId(null);
      setSelectedKeyframeId(null);
      return true;
    },
    [activeAnimationId, activeTrackId, manager, updateAnimation],
  );

  const reorderTrack = useCallback(
    (draggedTrackId, targetTrackId, placement = "before") => {
      if (!activeAnimationId || !draggedTrackId || !targetTrackId) return false;
      if (draggedTrackId === targetTrackId) return false;

      updateAnimation(activeAnimationId, (animation) => ({
        tracks: manager.reorderTrack(
          animation.tracks || [],
          draggedTrackId,
          targetTrackId,
          placement,
        ),
      }));
      return true;
    },
    [activeAnimationId, manager, updateAnimation],
  );

  const updateActiveTrack = useCallback(
    (updater) => {
      if (!activeAnimationId || !activeTrackId) return false;
      updateAnimation(activeAnimationId, (animation) => ({
        tracks: (animation.tracks || []).map((track) =>
          track.id === activeTrackId
            ? typeof updater === "function"
              ? updater(track)
              : { ...track, ...updater }
            : track,
        ),
      }));
      return true;
    },
    [activeAnimationId, activeTrackId, updateAnimation],
  );

  const updateActiveTrackRig = useCallback(
    (patch) => {
      if (!activeTrack || !activeTrackObject) return false;
      const fallbackBaseTransform =
        activeTrack.rig?.baseTransform || manager.createTransform(activeTrackObject);
      if (!fallbackBaseTransform) return false;

      const resolved =
        typeof patch === "function" ? patch(activeTrack.rig || {}) : patch;
      const baseTransform = resolved?.baseTransform || fallbackBaseTransform;
      const nextRig = manager.normalizeRig(
        {
          ...(activeTrack.rig || {}),
          ...(resolved || {}),
          limits: {
            ...(activeTrack.rig?.limits || {}),
            ...(resolved?.limits || {}),
          },
          follow: {
            ...(activeTrack.rig?.follow || {}),
            ...(resolved?.follow || {}),
          },
          hydraulic: {
            ...(activeTrack.rig?.hydraulic || {}),
            ...(resolved?.hydraulic || {}),
          },
          morph: {
            ...(activeTrack.rig?.morph || {}),
            ...(resolved?.morph || {}),
          },
          baseTransform,
        },
        baseTransform,
      );
      const nextTrack = { ...activeTrack, rig: nextRig };

      updateActiveTrack(nextTrack);

      if (activeAnimation && modelScene) {
        const previewAnimation = {
          ...activeAnimation,
          tracks: (activeAnimation.tracks || []).map((track) =>
            track.id === nextTrack.id ? nextTrack : track,
          ),
        };
        if (activeTrack.rig?.type === "morph" || nextRig.type === "morph") {
          restoreBaseline();
          baselineRef.current = manager.captureBaseline(
            modelScene,
            previewAnimation,
          );
        }
        manager.applyAtTime(
          modelScene,
          previewAnimation,
          currentTime,
          baselineRef.current,
        );
      }

      return true;
    },
    [
      activeAnimation,
      activeTrack,
      activeTrackObject,
      currentTime,
      manager,
      modelScene,
      restoreBaseline,
      updateActiveTrack,
    ],
  );

  const setActiveTrackRigParent = useAnimationTrackParentPivot({
    activeAnimation,
    activeTrack,
    activeTrackId,
    activeTrackObject,
    isAuthoringActive,
    manager,
    updateActiveTrackRig,
  });

  const setActiveTrackRigType = useCallback(
    (type) => {
      setIsPivotEditing(false);
      setRigPointEditTarget("pivot");
      if (type === "revolute") setTransformMode("rotate");
      if (type === "linear" || type === "morph") setTransformMode("translate");
      return updateActiveTrackRig({ type });
    },
    [updateActiveTrackRig],
  );

  const captureActiveTrackRigBase = useCallback(() => {
    if (!activeTrackObject) return false;
    const baseTransform = manager.createTransform(activeTrackObject);
    if (!baseTransform) return false;

    const baselineIndex = baselineRef.current.findIndex(
      (entry) => entry?.object === activeTrackObject,
    );
    if (baselineIndex >= 0) {
      baselineRef.current[baselineIndex] = {
        ...baselineRef.current[baselineIndex],
        trackId: activeTrack?.id || baselineRef.current[baselineIndex]?.trackId || null,
        object: activeTrackObject,
        transform: baseTransform,
      };
    } else {
      const baselineEntry = manager.captureTrackBaseline(
        activeTrackObject,
        activeTrack?.id || null,
      );
      if (baselineEntry) baselineRef.current.push(baselineEntry);
    }

    return updateActiveTrackRig({ baseTransform });
  }, [activeTrack?.id, activeTrackObject, manager, updateActiveTrackRig]);

  const assignRigPivotFromSelectedObject = useCallback(() => {
    if (!activeTrackObject || !selectedObject) return false;
    const pivot = manager.createLocalPivot(activeTrackObject, selectedObject);
    if (!pivot) return false;
    return updateActiveTrackRig({ pivot, pivotSource: "custom" });
  }, [activeTrackObject, manager, selectedObject, updateActiveTrackRig]);

  const setActiveTrackRigPoint = useCallback(
    (point) => {
      const normalized = normalizeAnimationRigPoint(point);
      if (!normalized) return false;

      if (rigPointEditTarget === "baseAnchor" || rigPointEditTarget === "targetAnchor") {
        return updateActiveTrackRig((rig) => ({
          hydraulic: {
            ...(rig?.hydraulic || {}),
            [rigPointEditTarget]: normalized,
          },
        }));
      }

      return updateActiveTrackRig({
        pivot: normalized,
        pivotSource: "custom",
      });
    },
    [rigPointEditTarget, updateActiveTrackRig],
  );

  const setActiveTrackRigPivot = useCallback(
    (pivot) => {
      const normalized = normalizeAnimationRigPoint(pivot);
      return normalized
        ? updateActiveTrackRig({
            pivot: normalized,
            pivotSource: "custom",
          })
        : false;
    },
    [updateActiveTrackRig],
  );

  const snapActiveTrackRigPivotFromHit = useCallback(
    (hit) => {
      if (!activeRigPointObject || !hit?.point) return false;
      const point = manager.createLocalPivotFromHit(
        activeRigPointObject,
        hit,
        pivotSnapMode,
      );
      return point ? setActiveTrackRigPoint(point) : false;
    },
    [
      activeRigPointObject,
      manager,
      pivotSnapMode,
      setActiveTrackRigPoint,
    ],
  );

  const togglePivotEditing = useCallback((forceValue) => {
    if (!["free", "revolute", "linear"].includes(activeTrack?.rig?.type)) {
      return false;
    }
    if (!activeTrackObject) return false;
    const nextValue =
      typeof forceValue === "boolean" ? forceValue : !isPivotEditing;
    setRigPointEditTarget("pivot");
    setIsPivotEditing(nextValue);
    return nextValue;
  }, [activeTrack?.rig?.type, activeTrackObject, isPivotEditing]);

  const toggleHydraulicAnchorEditing = useCallback(
    (field) => {
      if (activeTrack?.rig?.type !== "hydraulic") return false;
      const target = field === "targetAnchor" ? "targetAnchor" : "baseAnchor";
      const reference =
        target === "targetAnchor"
          ? activeTrack.rig?.hydraulic?.targetObject
          : activeTrack.rig?.hydraulic?.baseObject;
      const anchorObject = reference && modelScene
        ? manager.findObject(modelScene, reference)
        : null;
      if (!anchorObject) return false;
      const nextValue =
        rigPointEditTarget === target && isPivotEditing ? false : true;
      setRigPointEditTarget(target);
      setIsPivotEditing(nextValue);
      return nextValue;
    },
    [
      activeTrack,
      isPivotEditing,
      manager,
      modelScene,
      rigPointEditTarget,
    ],
  );

  const assignRigReferenceFromSelectedObject = useCallback(
    (field) => {
      if (!selectedObject || !modelScene || !["baseObject", "targetObject"].includes(field)) {
        return false;
      }
      const reference = manager.createReference(selectedObject, modelScene);
      if (!reference) return false;
      return updateActiveTrackRig((rig) => ({
        hydraulic: {
          ...(rig?.hydraulic || {}),
          [field]: reference,
        },
      }));
    },
    [manager, modelScene, selectedObject, updateActiveTrackRig],
  );

  const assignMorphTargetFromSelectedObject = useCallback(() => {
    if (activeTrack?.rig?.type !== "morph" || !selectedObject || !modelScene) {
      return false;
    }
    const reference = manager.createReference(selectedObject, modelScene);
    if (
      !reference ||
      getAnimationReferenceIdentity(reference) ===
        getAnimationReferenceIdentity(activeTrack.object)
    ) {
      return false;
    }
    return updateActiveTrackRig((rig) => ({
      morph: {
        ...(rig?.morph || {}),
        targetObject: reference,
      },
    }));
  }, [
    activeTrack?.object,
    activeTrack?.rig?.type,
    manager,
    modelScene,
    selectedObject,
    updateActiveTrackRig,
  ]);

  const {
    addOrUpdateKeyframe,
    beginActiveTrackTransform,
    endActiveTrackTransform,
    previewActiveTrackTransform,
  } = useAnimationTrackKeyframes({
    activeAnimation,
    activeTrack,
    activeTrackObject,
    baselineRef,
    currentTime,
    ensureBaseline,
    manager,
    modelScene,
    setSelectedKeyframeId,
    updateActiveTrack,
  });

  const deleteKeyframe = useCallback(
    (keyframeId = selectedKeyframeId) => {
      if (!activeTrack || !keyframeId) return false;
      updateActiveTrack(manager.removeKeyframe(activeTrack, keyframeId));
      setSelectedKeyframeId(null);
      return true;
    },
    [activeTrack, manager, selectedKeyframeId, updateActiveTrack],
  );

  const updateKeyframe = useCallback(
    (keyframeId, patch) => {
      if (!keyframeId || !activeTrack) return false;
      const nextTrack = {
        ...activeTrack,
        opacityAnimated:
          patch && Object.prototype.hasOwnProperty.call(patch, "opacity")
            ? true
            : activeTrack.opacityAnimated === true,
        keyframes: (activeTrack.keyframes || []).map((keyframe) =>
          keyframe.id === keyframeId ? { ...keyframe, ...patch } : keyframe,
        ),
      };
      updateActiveTrack(nextTrack);

      if (activeAnimation && modelScene) {
        const previewAnimation = {
          ...activeAnimation,
          tracks: (activeAnimation.tracks || []).map((track) =>
            track.id === nextTrack.id ? nextTrack : track,
          ),
        };
        manager.applyAtTime(
          modelScene,
          previewAnimation,
          currentTime,
          baselineRef.current,
        );
      }
      return true;
    },
    [
      activeAnimation,
      activeTrack,
      currentTime,
      manager,
      modelScene,
      updateActiveTrack,
    ],
  );

  const scrubTo = useCallback(
    (time) => {
      if (!activeAnimation || !modelScene) return false;
      ensureBaseline();
      const nextTime = Math.max(
        0,
        Math.min(Number(time) || 0, activeAnimation.duration),
      );
      setIsPreviewing(false);
      setIsPaused(true);
      setCurrentTime(nextTime);
      previewTimeRef.current = nextTime;
      return manager.applyAtTime(modelScene, activeAnimation, nextTime, baselineRef.current);
    },
    [activeAnimation, ensureBaseline, manager, modelScene],
  );

  const selectKeyframe = useCallback(
    (keyframeId) => {
      const keyframe = activeTrack?.keyframes?.find(
        (item) => item.id === keyframeId,
      );
      if (!keyframe) return false;
      setSelectedKeyframeId(keyframe.id);
      return scrubTo(keyframe.time);
    },
    [activeTrack, scrubTo],
  );

  const playPreview = useCallback(() => {
    if (!activeAnimation || !modelScene || activeAnimation.tracks.length === 0) {
      return false;
    }
    ensureBaseline();
    const speed = Number(activeAnimation.settings?.speed) || 1;
    previewStartRef.current = performance.now() - (currentTime / speed) * 1000;
    previewTimeRef.current = currentTime;
    setIsPaused(false);
    setIsPreviewing(true);
    return true;
  }, [activeAnimation, currentTime, ensureBaseline, modelScene]);

  const pausePreview = useCallback(() => {
    setIsPreviewing(false);
    setIsPaused(true);
  }, []);

  const stopPreview = useCallback(() => {
    setIsPreviewing(false);
    setIsPaused(false);
    setCurrentTime(0);
    previewTimeRef.current = 0;
    restoreBaseline(false);
    return true;
  }, [restoreBaseline]);

  useEffect(() => {
    if (!isPreviewing || !activeAnimation || !modelScene) return undefined;

    let frameId = 0;
    const duration = Math.max(0.1, Number(activeAnimation.duration) || 2);
    const speed = Math.max(0.05, Number(activeAnimation.settings?.speed) || 1);
    const loop = activeAnimation.settings?.loop === true;

    const tick = (now) => {
      const elapsed = Math.max(0, ((now - previewStartRef.current) / 1000) * speed);
      const nextTime = loop ? elapsed % duration : Math.min(elapsed, duration);
      previewTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      manager.applyAtTime(modelScene, activeAnimation, nextTime, baselineRef.current);

      if (!loop && elapsed >= duration) {
        setIsPreviewing(false);
        setIsPaused(false);
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [activeAnimation, isPreviewing, manager, modelScene]);

  const beginAuthoring = useCallback(() => {
    setIsPivotEditing(false);
    setIsAuthoringActive(true);
  }, []);

  const stopAuthoring = useCallback(() => {
    setIsAuthoringActive(false);
    setIsPivotEditing(false);
    setIsPreviewing(false);
    setIsPaused(false);
    setCurrentTime(0);
    previewTimeRef.current = 0;
    restoreBaseline();
  }, [restoreBaseline]);

  useEffect(() => () => restoreBaseline(), [restoreBaseline]);

  return {
    animations,
    activeAnimationId,
    activeAnimation,
    isLoadingActiveAnimation,
    activeTrackId,
    activeTrack,
    activeTrackObject,
    activeMorphTargetObject,
    activeMorphCompatibility,
    selectedKeyframeId,
    selectedKeyframe,
    currentTime,
    transformMode,
    isAuthoringActive,
    isPivotEditing,
    rigPointEditTarget,
    activeRigPointObject,
    activeRigPointValue,
    pivotSnapMode,
    isPreviewing,
    isPaused,
    setActiveTrackId,
    setTransformMode,
    setSelectedKeyframeId,
    setIsPivotEditing,
    setPivotSnapMode,
    beginAuthoring,
    stopAuthoring,
    createAnimation,
    selectAnimation,
    updateAnimation,
    deleteAnimation,
    duplicateAnimation,
    addTrackFromSelectedObject,
    deleteTrack,
    reorderTrack,
    updateActiveTrackRig,
    setActiveTrackRigParent,
    setActiveTrackRigType,
    captureActiveTrackRigBase,
    assignRigPivotFromSelectedObject,
    setActiveTrackRigPivot,
    setActiveTrackRigPoint,
    snapActiveTrackRigPivotFromHit,
    togglePivotEditing,
    toggleHydraulicAnchorEditing,
    assignRigReferenceFromSelectedObject,
    assignMorphTargetFromSelectedObject,
    beginActiveTrackTransform,
    endActiveTrackTransform,
    applyActiveTrackPivotTransform: (...matrices) => manager.applyPivotTransform(activeTrackObject, ...matrices),
    previewActiveTrackTransform,
    addOrUpdateKeyframe,
    deleteKeyframe,
    updateKeyframe,
    selectKeyframe,
    scrubTo,
    playPreview,
    pausePreview,
    stopPreview,
  };
}

export default useAnimationAuthoring;
