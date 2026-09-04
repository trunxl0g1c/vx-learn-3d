import { resolveLogicalObject } from "../../utils/objectTreeUtils";
import {
  createAuthoredAnimationTransform,
  evaluateAuthoredAnimationTrackState,
  normalizeAuthoredAnimationTransform,
} from "./AuthoredAnimation";
import {
  createFreeTransformTargetFromAppliedTransform,
  createMechanicalJointDeltaMatrix,
  createTransformMatrix,
  decomposeTransformMatrix,
  normalizeMechanicalRig,
} from "./MechanicalRig";

export function createAnimationParentRelativeKeyframeTransform(
  object,
  track,
  time,
  startObjectWorldMatrix,
) {
  const logicalObject = resolveLogicalObject(object);
  if (!logicalObject || !track || !startObjectWorldMatrix?.clone) return null;

  const baseTransform =
    normalizeAuthoredAnimationTransform(track.rig?.baseTransform) ||
    normalizeAuthoredAnimationTransform(track.keyframes?.[0]?.transform) ||
    createAuthoredAnimationTransform(logicalObject);
  if (!baseTransform) return null;

  const rig = normalizeMechanicalRig(track.rig, baseTransform);
  const evaluatedTransform =
    evaluateAuthoredAnimationTrackState(track, time)?.transform || baseTransform;
  const previousJointDelta = createMechanicalJointDeltaMatrix(
    rig,
    baseTransform,
    evaluatedTransform,
  );
  const currentParentFrame = startObjectWorldMatrix
    .clone()
    .multiply(previousJointDelta.clone().invert());

  logicalObject.updateWorldMatrix?.(true, false);
  const currentJointDelta = currentParentFrame
    .clone()
    .invert()
    .multiply(logicalObject.matrixWorld);
  const appliedTransform = decomposeTransformMatrix(
    createTransformMatrix(baseTransform).multiply(currentJointDelta),
  );

  return createFreeTransformTargetFromAppliedTransform(
    rig,
    baseTransform,
    appliedTransform,
  );
}

export default createAnimationParentRelativeKeyframeTransform;
