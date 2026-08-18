import {
  createProceduralDefinition,
  createProceduralObjectReference,
  createProceduralPlaybackDefinition,
  createProceduralPlaybackStep,
  createProceduralStep,
  duplicateProceduralDefinition,
  createStoredObjectTransform,
  findProceduralObject,
  getProcedureReferenceLength,
  isAssemblyProcedure,
  normalizeProceduralAnimatedObjects,
  normalizeProceduralClickTargets,
  normalizeProceduralDefinitions,
  validateAssemblyPlacement,
} from "../engine/procedural";

export function createProceduralManagerAdapter(engine = null) {
  return {
    normalizeDefinitions(value) {
      return engine?.normalizeDefinitions?.(value) || normalizeProceduralDefinitions(value);
    },
    createDefinition(number, type) {
      return (
        engine?.createDefinition?.(number, type) ||
        createProceduralDefinition(number, type)
      );
    },
    duplicateDefinition(procedure, options) {
      return (
        engine?.duplicateDefinition?.(procedure, options) ||
        duplicateProceduralDefinition(procedure, options)
      );
    },
    createPlaybackDefinition(procedure) {
      return (
        engine?.createPlaybackDefinition?.(procedure) ||
        createProceduralPlaybackDefinition(procedure)
      );
    },
    createPlaybackStep(step, procedureType, options) {
      return (
        engine?.createPlaybackStep?.(step, procedureType, options) ||
        createProceduralPlaybackStep(step, procedureType, options)
      );
    },
    createStep(number, type) {
      return engine?.createStep?.(number, type) || createProceduralStep(number, type);
    },
    isAssemblyProcedure(value) {
      return engine?.isAssemblyProcedure?.(value) ?? isAssemblyProcedure(value);
    },
    getReferenceLength(scene, fallback = 1) {
      return (
        engine?.getReferenceLength?.(scene, fallback) ||
        getProcedureReferenceLength(scene, fallback)
      );
    },
    validateAssemblyPlacement(payload) {
      return (
        engine?.validateAssemblyPlacement?.(payload) ||
        validateAssemblyPlacement(payload)
      );
    },
    createObjectReference(object, root) {
      return (
        engine?.createObjectReference?.(object, root) ||
        createProceduralObjectReference(object, root)
      );
    },
    createStoredTransform(object) {
      return engine?.createStoredTransform?.(object) || createStoredObjectTransform(object);
    },
    normalizeAnimatedObjects(step, assemblyStep = false) {
      return (
        engine?.normalizeAnimatedObjects?.(step, assemblyStep) ||
        normalizeProceduralAnimatedObjects(step, assemblyStep)
      );
    },
    normalizeClickTargets(step, assemblyStep = false) {
      return (
        engine?.normalizeClickTargets?.(step, assemblyStep) ||
        normalizeProceduralClickTargets(step, assemblyStep)
      );
    },
    findClickTargets(scene, step) {
      if (engine?.findClickTargets) {
        return engine.findClickTargets(scene, step);
      }

      return normalizeProceduralClickTargets(
        step,
        isAssemblyProcedure(step?.procedureType),
      )
        .map((reference) => findProceduralObject(scene, reference))
        .filter(Boolean);
    },
    findAnimatedObjects(scene, step) {
      return engine?.findAnimatedObjects?.(scene, step) || [];
    },
    applyStoredTransform(object, transform) {
      return engine?.applyStoredTransform?.(object, transform) || false;
    },
    findObject(scene, reference) {
      return engine?.findObject?.(scene, reference) || null;
    },
    animateStep(payload) {
      return engine?.animateStep?.(payload) || Promise.resolve(false);
    },
    animateStepObjects(payload) {
      return engine?.animateStepObjects?.(payload) || Promise.resolve(false);
    },
    resetStep(scene, step, options) {
      return engine?.resetStep?.(scene, step, options) || false;
    },
    resetProcedure(scene, procedure) {
      return engine?.resetProcedure?.(scene, procedure) || false;
    },
  };
}

export default createProceduralManagerAdapter;
