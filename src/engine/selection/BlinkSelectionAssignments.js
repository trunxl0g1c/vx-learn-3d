import { DEFAULT_BLINK_PRESET_ID } from "./BlinkSelectionSettings";

function normalizeTargets(targets = []) {
  return Array.from(
    new Set((Array.isArray(targets) ? targets : [targets]).filter(Boolean)),
  );
}

export function normalizeBlinkAssignments(assignments = []) {
  return (Array.isArray(assignments) ? assignments : [])
    .map((assignment) => ({
      presetId: String(assignment?.presetId || DEFAULT_BLINK_PRESET_ID),
      objects: normalizeTargets(assignment?.objects),
    }))
    .filter((assignment) => assignment.objects.length > 0);
}

export function getBlinkAssignmentTargets(assignments = []) {
  return Array.from(
    new Set(
      normalizeBlinkAssignments(assignments).flatMap(
        (assignment) => assignment.objects,
      ),
    ),
  );
}

export function assignBlinkPresetToTargets(
  assignments = [],
  presetId = DEFAULT_BLINK_PRESET_ID,
  targets = [],
) {
  const normalizedTargets = normalizeTargets(targets);
  if (normalizedTargets.length === 0) return normalizeBlinkAssignments(assignments);

  const targetSet = new Set(normalizedTargets);
  const nextAssignments = normalizeBlinkAssignments(assignments)
    .map((assignment) => ({
      ...assignment,
      objects: assignment.objects.filter((object) => !targetSet.has(object)),
    }))
    .filter((assignment) => assignment.objects.length > 0);
  const resolvedPresetId = String(presetId || DEFAULT_BLINK_PRESET_ID);
  const matchingAssignment = nextAssignments.find(
    (assignment) => assignment.presetId === resolvedPresetId,
  );

  if (matchingAssignment) {
    matchingAssignment.objects = normalizeTargets([
      ...matchingAssignment.objects,
      ...normalizedTargets,
    ]);
  } else {
    nextAssignments.push({
      presetId: resolvedPresetId,
      objects: normalizedTargets,
    });
  }

  return nextAssignments;
}

export function removeTargetsFromBlinkAssignments(assignments = [], targets = []) {
  const targetSet = new Set(normalizeTargets(targets));
  if (targetSet.size === 0) return normalizeBlinkAssignments(assignments);

  return normalizeBlinkAssignments(assignments)
    .map((assignment) => ({
      ...assignment,
      objects: assignment.objects.filter((object) => !targetSet.has(object)),
    }))
    .filter((assignment) => assignment.objects.length > 0);
}
