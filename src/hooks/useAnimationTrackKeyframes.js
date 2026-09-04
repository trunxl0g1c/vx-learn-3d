import { useCallback, useEffect, useRef } from "react";

const KEYFRAME_TIME_EPSILON = 0.0001;

function cloneTransform(transform) {
  if (!transform) return null;
  return {
    position: [...(transform.position || [0, 0, 0])],
    quaternion: [...(transform.quaternion || [0, 0, 0, 1])],
    scale: [...(transform.scale || [1, 1, 1])],
  };
}

export function useAnimationTrackKeyframes({
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
}) {
  const transformStartWorldMatrixRef = useRef(null);
  const transformStartTrackRef = useRef(null);
  const pendingTransformRef = useRef(null);

  useEffect(() => {
    transformStartWorldMatrixRef.current = null;
    transformStartTrackRef.current = null;
    pendingTransformRef.current = null;
  }, [activeAnimation?.id, activeTrack?.id, currentTime]);

  const beginActiveTrackTransform = useCallback(
    (object) => {
      if (!activeTrackObject || object !== activeTrackObject) return false;
      activeTrackObject.updateWorldMatrix?.(true, false);
      transformStartWorldMatrixRef.current = activeTrackObject.matrixWorld.clone();
      const pending = pendingTransformRef.current;
      const pendingMatches =
        pending?.animationId === activeAnimation?.id &&
        pending?.trackId === activeTrack?.id &&
        Math.abs(Number(pending?.time) - currentTime) <= KEYFRAME_TIME_EPSILON;
      const currentState = manager.evaluateTrackState(activeTrack, currentTime);
      transformStartTrackRef.current = pendingMatches
        ? manager.upsertKeyframe(
            activeTrack,
            currentTime,
            pending.transform,
            activeAnimation.duration,
            activeAnimation.settings?.defaultEasing,
            currentState?.opacity ?? 1,
            currentState?.morphProgress ?? 0,
          )
        : activeTrack;
      return true;
    },
    [
      activeAnimation,
      activeTrack,
      activeTrackObject,
      currentTime,
      manager,
    ],
  );

  const endActiveTrackTransform = useCallback((object) => {
    if (object && activeTrackObject && object !== activeTrackObject) return false;
    transformStartWorldMatrixRef.current = null;
    transformStartTrackRef.current = null;
    return true;
  }, [activeTrackObject]);

  const getEditedTransform = useCallback(() => {
    if (!activeTrack || !activeTrackObject) return null;

    if (
      activeTrack.rig?.parentTrackId &&
      transformStartWorldMatrixRef.current
    ) {
      return manager.createParentRelativeKeyframeTransform(
        activeTrackObject,
        transformStartTrackRef.current || activeTrack,
        currentTime,
        transformStartWorldMatrixRef.current,
      );
    }

    return manager.createKeyframeTransform(activeTrackObject, activeTrack.rig);
  }, [activeTrack, activeTrackObject, currentTime, manager]);

  const previewActiveTrackTransform = useCallback(() => {
    if (!activeAnimation || !activeTrack || !activeTrackObject || !modelScene) {
      return false;
    }

    ensureBaseline();
    const transform = getEditedTransform();
    if (!transform) return false;

    pendingTransformRef.current = {
      animationId: activeAnimation.id,
      trackId: activeTrack.id,
      time: currentTime,
      transform: cloneTransform(transform),
    };

    const currentState = manager.evaluateTrackState(activeTrack, currentTime);
    const previewTrack = manager.upsertKeyframe(
      activeTrack,
      currentTime,
      transform,
      activeAnimation.duration,
      activeAnimation.settings?.defaultEasing,
      currentState?.opacity ?? 1,
      currentState?.morphProgress ?? 0,
    );
    const previewAnimation = {
      ...activeAnimation,
      tracks: (activeAnimation.tracks || []).map((track) =>
        track.id === previewTrack.id ? previewTrack : track,
      ),
    };

    return manager.applyAtTime(
      modelScene,
      previewAnimation,
      currentTime,
      baselineRef.current,
    );
  }, [
    activeAnimation,
    activeTrack,
    activeTrackObject,
    baselineRef,
    currentTime,
    ensureBaseline,
    getEditedTransform,
    manager,
    modelScene,
  ]);

  const addOrUpdateKeyframe = useCallback(() => {
    if (!activeTrack || !activeTrackObject || !activeAnimation) return false;

    const pending = pendingTransformRef.current;
    const pendingMatches =
      pending?.animationId === activeAnimation.id &&
      pending?.trackId === activeTrack.id &&
      Math.abs(Number(pending?.time) - currentTime) <= KEYFRAME_TIME_EPSILON;
    const currentState = manager.evaluateTrackState(activeTrack, currentTime);
    let transform = null;
    if (pendingMatches) {
      transform = cloneTransform(pending.transform);
    } else if (activeTrack.rig?.parentTrackId) {
      transform =
        cloneTransform(currentState?.transform || activeTrack.rig?.baseTransform) ||
        manager.createKeyframeTransform(activeTrackObject, activeTrack.rig);
    } else {
      transform = manager.createKeyframeTransform(activeTrackObject, activeTrack.rig);
    }
    if (!transform) return false;

    const nextTrack = manager.upsertKeyframe(
      activeTrack,
      currentTime,
      transform,
      activeAnimation.duration,
      activeAnimation.settings?.defaultEasing,
      currentState?.opacity ?? 1,
      currentState?.morphProgress ?? 0,
    );
    const savedKeyframe = nextTrack.keyframes.find(
      (keyframe) =>
        Math.abs(keyframe.time - currentTime) < KEYFRAME_TIME_EPSILON,
    );
    const previewAnimation = {
      ...activeAnimation,
      tracks: (activeAnimation.tracks || []).map((track) =>
        track.id === nextTrack.id ? nextTrack : track,
      ),
    };

    updateActiveTrack(nextTrack);
    manager.applyAtTime(
      modelScene,
      previewAnimation,
      currentTime,
      baselineRef.current,
    );
    transformStartWorldMatrixRef.current = null;
    transformStartTrackRef.current = null;
    pendingTransformRef.current = null;
    setSelectedKeyframeId(savedKeyframe?.id || null);
    return true;
  }, [
    activeAnimation,
    activeTrack,
    activeTrackObject,
    baselineRef,
    currentTime,
    manager,
    modelScene,
    setSelectedKeyframeId,
    updateActiveTrack,
  ]);

  return {
    addOrUpdateKeyframe,
    beginActiveTrackTransform,
    endActiveTrackTransform,
    previewActiveTrackTransform,
  };
}

export default useAnimationTrackKeyframes;
