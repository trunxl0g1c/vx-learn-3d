import {
  applyAuthoredAnimationAtTime,
  captureAuthoredAnimationBaseline,
  createAuthoredAnimationDefinition,
  createAuthoredAnimationTrack,
  createAuthoredAnimationTransform,
  createAuthoredAnimationObjectReference,
  createAuthoredAnimationLocalPivot,
  createAuthoredAnimationLocalPivotFromHit,
  createMechanicalRigDefinition,
  duplicateAuthoredAnimationDefinition,
  findAuthoredAnimationObject,
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
    createLocalPivotFromHit(object, hit, snapMode = "surface") {
      return (
        engine?.createAuthoredLocalPivotFromHit?.(object, hit, snapMode) ||
        createAuthoredAnimationLocalPivotFromHit(object, hit, snapMode)
      );
    },
    createTransform(object) {
      return (
        engine?.createAuthoredTransform?.(object) ||
        createAuthoredAnimationTransform(object)
      );
    },
    upsertKeyframe(track, time, transform, duration, easing) {
      return (
        engine?.upsertAuthoredKeyframe?.(
          track,
          time,
          transform,
          duration,
          easing,
        ) ||
        upsertAuthoredAnimationKeyframe(
          track,
          time,
          transform,
          duration,
          easing,
        )
      );
    },
    removeKeyframe(track, keyframeId) {
      return (
        engine?.removeAuthoredKeyframe?.(track, keyframeId) ||
        removeAuthoredAnimationKeyframe(track, keyframeId)
      );
    },
    applyAtTime(scene, animation, time) {
      return (
        engine?.applyAuthoredAtTime?.(scene, animation, time) ||
        applyAuthoredAnimationAtTime(scene, animation, time)
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
