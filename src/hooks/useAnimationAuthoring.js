import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAnimationAuthoringManagerAdapter } from "../managers/AnimationAuthoringManager";
import { isLazyMaterialRecord } from "../engine/project/LazyMaterialRecords";

function wouldCreateRigParentCycle(tracks, childTrackId, parentTrackId) {
  if (!parentTrackId) return false;
  if (childTrackId === parentTrackId) return true;
  const byId = new Map((tracks || []).map((track) => [track.id, track]));
  const visited = new Set([childTrackId]);
  let currentId = parentTrackId;

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = byId.get(currentId)?.rig?.parentTrackId || null;
  }

  return false;
}

function getReferenceIdentity(reference) {
  if (!reference) return "";
  if (reference.uuid) return `uuid:${reference.uuid}`;
  if (Array.isArray(reference.path)) return `path:${reference.path.join(".")}`;
  return `name:${String(reference.name || "").trim()}`;
}

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

  useEffect(() => {
    if (activeTrack?.rig?.type === "revolute" && activeTrackObject) return;
    setIsPivotEditing(false);
  }, [activeTrack?.rig?.type, activeTrackObject]);

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
    const identity = getReferenceIdentity(track.object);
    if (
      activeAnimation?.tracks?.some(
        (item) => getReferenceIdentity(item.object) === identity,
      )
    ) {
      return false;
    }

    const object = manager.findObject(modelScene, track.object);
    const transform = manager.createTransform(object);
    if (object && transform) {
      baselineRef.current.push({ object, transform });
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
        manager.applyAtTime(modelScene, previewAnimation, currentTime);
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
      updateActiveTrack,
    ],
  );

  const setActiveTrackRigParent = useCallback(
    (parentTrackId) => {
      const nextParentId = parentTrackId || null;
      if (
        wouldCreateRigParentCycle(
          activeAnimation?.tracks,
          activeTrackId,
          nextParentId,
        )
      ) {
        return false;
      }
      return updateActiveTrackRig({ parentTrackId: nextParentId });
    },
    [activeAnimation?.tracks, activeTrackId, updateActiveTrackRig],
  );

  const setActiveTrackRigType = useCallback(
    (type) => {
      setIsPivotEditing(false);
      if (type === "revolute") setTransformMode("rotate");
      if (type === "linear") setTransformMode("translate");
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
        object: activeTrackObject,
        transform: baseTransform,
      };
    } else {
      baselineRef.current.push({ object: activeTrackObject, transform: baseTransform });
    }

    return updateActiveTrackRig({ baseTransform });
  }, [activeTrackObject, manager, updateActiveTrackRig]);

  const assignRigPivotFromSelectedObject = useCallback(() => {
    if (!activeTrackObject || !selectedObject) return false;
    const pivot = manager.createLocalPivot(activeTrackObject, selectedObject);
    if (!pivot) return false;
    return updateActiveTrackRig({ pivot });
  }, [activeTrackObject, manager, selectedObject, updateActiveTrackRig]);

  const setActiveTrackRigPivot = useCallback(
    (pivot) => {
      if (!Array.isArray(pivot) || pivot.length < 3) return false;
      return updateActiveTrackRig({
        pivot: [
          Number(pivot[0]) || 0,
          Number(pivot[1]) || 0,
          Number(pivot[2]) || 0,
        ],
      });
    },
    [updateActiveTrackRig],
  );

  const snapActiveTrackRigPivotFromHit = useCallback(
    (hit) => {
      if (!activeTrackObject || !hit?.point) return false;
      const pivot = manager.createLocalPivotFromHit(
        activeTrackObject,
        hit,
        pivotSnapMode,
      );
      if (!pivot) return false;
      return updateActiveTrackRig({ pivot });
    },
    [activeTrackObject, manager, pivotSnapMode, updateActiveTrackRig],
  );

  const togglePivotEditing = useCallback((forceValue) => {
    if (activeTrack?.rig?.type !== "revolute" || !activeTrackObject) return false;
    const nextValue =
      typeof forceValue === "boolean" ? forceValue : !isPivotEditing;
    setIsPivotEditing(nextValue);
    return nextValue;
  }, [activeTrack?.rig?.type, activeTrackObject, isPivotEditing]);

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

  const previewActiveTrackTransform = useCallback(() => {
    if (!activeAnimation || !activeTrack || !activeTrackObject || !modelScene) {
      return false;
    }

    ensureBaseline();
    const transform = manager.createTransform(activeTrackObject);
    if (!transform) return false;
    const previewTrack = manager.upsertKeyframe(
      activeTrack,
      currentTime,
      transform,
      activeAnimation.duration,
      activeAnimation.settings?.defaultEasing,
    );
    const previewAnimation = {
      ...activeAnimation,
      tracks: (activeAnimation.tracks || []).map((track) =>
        track.id === previewTrack.id ? previewTrack : track,
      ),
    };

    return manager.applyAtTime(modelScene, previewAnimation, currentTime);
  }, [
    activeAnimation,
    activeTrack,
    activeTrackObject,
    currentTime,
    ensureBaseline,
    manager,
    modelScene,
  ]);

  const addOrUpdateKeyframe = useCallback(() => {
    if (!activeTrack || !activeTrackObject || !activeAnimation) return false;
    const transform = manager.createTransform(activeTrackObject);
    if (!transform) return false;

    const nextTrack = manager.upsertKeyframe(
      activeTrack,
      currentTime,
      transform,
      activeAnimation.duration,
      activeAnimation.settings?.defaultEasing,
    );
    const savedKeyframe = nextTrack.keyframes.find(
      (keyframe) => Math.abs(keyframe.time - currentTime) < 0.0001,
    );

    const previewAnimation = {
      ...activeAnimation,
      tracks: (activeAnimation.tracks || []).map((track) =>
        track.id === nextTrack.id ? nextTrack : track,
      ),
    };

    updateActiveTrack(nextTrack);
    manager.applyAtTime(modelScene, previewAnimation, currentTime);
    setSelectedKeyframeId(savedKeyframe?.id || null);
    return true;
  }, [
    activeAnimation,
    activeTrack,
    activeTrackObject,
    currentTime,
    manager,
    modelScene,
    updateActiveTrack,
  ]);

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
      if (!keyframeId) return false;
      return updateActiveTrack((track) => ({
        ...track,
        keyframes: (track.keyframes || []).map((keyframe) =>
          keyframe.id === keyframeId ? { ...keyframe, ...patch } : keyframe,
        ),
      }));
    },
    [updateActiveTrack],
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
      return manager.applyAtTime(modelScene, activeAnimation, nextTime);
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
      manager.applyAtTime(modelScene, activeAnimation, nextTime);

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
    selectedKeyframeId,
    selectedKeyframe,
    currentTime,
    transformMode,
    isAuthoringActive,
    isPivotEditing,
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
    snapActiveTrackRigPivotFromHit,
    togglePivotEditing,
    assignRigReferenceFromSelectedObject,
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
