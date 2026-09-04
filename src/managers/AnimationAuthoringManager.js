import {
  applyAuthoredAnimationAtTime,
  applyMechanicalPivotTransform,
  captureAuthoredAnimationBaseline,
  captureAuthoredAnimationTrackBaseline,
  createAuthoredAnimationDefinition,
  createAuthoredAnimationKeyframeTransform,
  createAnimationParentRelativeKeyframeTransform,
  createAuthoredAnimationTrack,
  createAuthoredAnimationTransform,
  createAuthoredAnimationObjectReference,
  createAuthoredAnimationLocalBoundsCenter,
  createAuthoredAnimationLocalPivot,
  createAuthoredAnimationLocalPivotFromHit,
  createMechanicalRigDefinition,
  duplicateAuthoredAnimationDefinition,
  evaluateAuthoredAnimationTrackState,
  findAuthoredAnimationObject,
  getMorphAnimationCompatibility,
  normalizeAuthoredAnimationDefinition,
  normalizeAuthoredAnimationDefinitions,
  normalizeMechanicalRig,
  organizeAuthoredAnimationTracks,
  reorderAuthoredAnimationTrack,
  removeAuthoredAnimationKeyframe,
  restoreAuthoredAnimationBaseline,
  upsertAuthoredAnimationKeyframe,
} from "../engine/animation";

export function createAnimationAuthoringManagerAdapter(engine = null) {
  return {
    normalizeDefinitions(value) {
      return (
        engine?.normalizeAuthoredDefinitions?.(value) ||
        normalizeAuthoredAnimationDefinitions(value)
      );
    },
    normalizeDefinition(value) {
      return (
        engine?.normalizeAuthoredDefinition?.(value) ||
        normalizeAuthoredAnimationDefinition(value)
      );
    },
    createDefinition(number) {
      return (
        engine?.createAuthoredDefinition?.(number) ||
        createAuthoredAnimationDefinition(number)
      );
    },
    duplicateDefinition(animation, existingNames) {
      return (
        engine?.duplicateAuthoredDefinition?.(animation, existingNames) ||
        duplicateAuthoredAnimationDefinition(animation, existingNames)
      );
    },
    createTrack(object, root) {
      return (
        engine?.createAuthoredTrack?.(object, root) ||
        createAuthoredAnimationTrack(object, root)
      );
    },
    createReference(object, root) {
      return (
        engine?.createAuthoredObjectReference?.(object, root) ||
        createAuthoredAnimationObjectReference(object, root)
      );
    },
    createRig(baseTransform = null) {
      return (
        engine?.createMechanicalRig?.(baseTransform) ||
        createMechanicalRigDefinition(baseTransform)
      );
    },
    normalizeRig(rig, baseTransform = null) {
      return (
        engine?.normalizeMechanicalRig?.(rig, baseTransform) ||
        normalizeMechanicalRig(rig, baseTransform)
      );
    },
    organizeTracks(tracks) {
      return (
        engine?.organizeAuthoredTracks?.(tracks) ||
        organizeAuthoredAnimationTracks(tracks)
      );
    },
    reorderTrack(tracks, draggedTrackId, targetTrackId, placement = "before") {
      return (
        engine?.reorderAuthoredTrack?.(
          tracks,
          draggedTrackId,
          targetTrackId,
          placement,
        ) ||
        reorderAuthoredAnimationTrack(
          tracks,
          draggedTrackId,
          targetTrackId,
          placement,
        )
      );
    },
    findObject(scene, reference) {
      return (
        engine?.findAuthoredObject?.(scene, reference) ||
        findAuthoredAnimationObject(scene, reference)
      );
    },
    createLocalPivot(object, pivotObject) {
      return (
        engine?.createAuthoredLocalPivot?.(object, pivotObject) ||
        createAuthoredAnimationLocalPivot(object, pivotObject)
      );
    },
    createLocalBoundsCenter(object) {
      return (
        engine?.createAuthoredLocalBoundsCenter?.(object) ||
        createAuthoredAnimationLocalBoundsCenter(object)
      );
    },
    createLocalPivotFromHit(object, hit, snapMode = "surface") {
      return (
        engine?.createAuthoredLocalPivotFromHit?.(object, hit, snapMode) ||
        createAuthoredAnimationLocalPivotFromHit(object, hit, snapMode)
      );
    },
    getMorphCompatibility(sourceObject, targetObject) {
      return (
        engine?.getMorphCompatibility?.(sourceObject, targetObject) ||
        getMorphAnimationCompatibility(sourceObject, targetObject)
      );
    },
    createTransform(object) {
      return (
        engine?.createAuthoredTransform?.(object) ||
        createAuthoredAnimationTransform(object)
      );
    },
    createKeyframeTransform(object, rig) {
      return (
        engine?.createAuthoredKeyframeTransform?.(object, rig) ||
        createAuthoredAnimationKeyframeTransform(object, rig)
      );
    },
    createParentRelativeKeyframeTransform(
      object,
      track,
      time,
      startObjectWorldMatrix,
    ) {
      return (
        engine?.createAuthoredParentRelativeKeyframeTransform?.(
          object,
          track,
          time,
          startObjectWorldMatrix,
        ) ||
        createAnimationParentRelativeKeyframeTransform(
          object,
          track,
          time,
          startObjectWorldMatrix,
        )
      );
    },
    applyPivotTransform(
      object,
      startObjectWorldMatrix,
      startPivotWorldMatrix,
      currentPivotWorldMatrix,
    ) {
      if (engine?.applyMechanicalPivotTransform) {
        return engine.applyMechanicalPivotTransform(
          object,
          startObjectWorldMatrix,
          startPivotWorldMatrix,
          currentPivotWorldMatrix,
        );
      }
      return applyMechanicalPivotTransform(
        object,
        startObjectWorldMatrix,
        startPivotWorldMatrix,
        currentPivotWorldMatrix,
      );
    },
    evaluateTrackState(track, time) {
      return (
        engine?.evaluateAuthoredTrackState?.(track, time) ||
        evaluateAuthoredAnimationTrackState(track, time)
      );
    },
    upsertKeyframe(
      track,
      time,
      transform,
      duration,
      easing,
      opacity = null,
      morphProgress = null,
    ) {
      return (
        engine?.upsertAuthoredKeyframe?.(
          track,
          time,
          transform,
          duration,
          easing,
          opacity,
          morphProgress,
        ) ||
        upsertAuthoredAnimationKeyframe(
          track,
          time,
          transform,
          duration,
          easing,
          opacity,
          morphProgress,
        )
      );
    },
    removeKeyframe(track, keyframeId) {
      return (
        engine?.removeAuthoredKeyframe?.(track, keyframeId) ||
        removeAuthoredAnimationKeyframe(track, keyframeId)
      );
    },
    applyAtTime(scene, animation, time, baselineEntries = null) {
      return (
        engine?.applyAuthoredAtTime?.(
          scene,
          animation,
          time,
          baselineEntries,
        ) ||
        applyAuthoredAnimationAtTime(
          scene,
          animation,
          time,
          baselineEntries,
        )
      );
    },
    captureTrackBaseline(object, trackId = null) {
      return (
        engine?.captureAuthoredTrackBaseline?.(object, trackId) ||
        captureAuthoredAnimationTrackBaseline(object, trackId)
      );
    },
    captureBaseline(scene, animation) {
      return (
        engine?.captureAuthoredBaseline?.(scene, animation) ||
        captureAuthoredAnimationBaseline(scene, animation)
      );
    },
    restoreBaseline(entries) {
      return (
        engine?.restoreAuthoredBaseline?.(entries) ||
        restoreAuthoredAnimationBaseline(entries)
      );
    },
  };
}

export default createAnimationAuthoringManagerAdapter;
