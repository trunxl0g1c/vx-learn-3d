import {
  applyAuthoredAnimationAtTime,
  captureAuthoredAnimationBaseline,
  normalizeAuthoredAnimationDefinition,
  resolveAnimationTargetObjects,
  restoreAuthoredAnimationBaseline,
} from "../engine/animation";

export function createAnimationPlaybackManagerAdapter(engine = null) {
  return {
    normalizeAuthoredDefinition(animation) {
      if (engine?.normalizeAuthoredDefinition) {
        return engine.normalizeAuthoredDefinition(animation);
      }
      return normalizeAuthoredAnimationDefinition(animation);
    },

    resolveTargets(scene, entry) {
      if (engine?.resolveAnimationTargets) {
        return engine.resolveAnimationTargets(scene, entry);
      }
      return resolveAnimationTargetObjects(scene, entry);
    },

    captureBaseline(scene, animation) {
      if (engine?.captureAuthoredBaseline) {
        return engine.captureAuthoredBaseline(scene, animation);
      }
      return captureAuthoredAnimationBaseline(scene, animation);
    },

    applyAtTime(scene, animation, time, baselineEntries = null) {
      if (engine?.applyAuthoredAtTime) {
        return engine.applyAuthoredAtTime(
          scene,
          animation,
          time,
          baselineEntries,
        );
      }
      return applyAuthoredAnimationAtTime(
        scene,
        animation,
        time,
        baselineEntries,
      );
    },

    restoreBaseline(entries) {
      if (engine?.restoreAuthoredBaseline) {
        return engine.restoreAuthoredBaseline(entries);
      }
      return restoreAuthoredAnimationBaseline(entries);
    },
  };
}

export default createAnimationPlaybackManagerAdapter;
