import { createId } from "../../utils/createId";

function normalizeBoolean(value) {
  return value === true;
}

function normalizeSpeed(value) {
  const speed = Number(value);
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

export const ANIMATION_PLAYBACK_MODES = Object.freeze({
  AFTER_PREVIOUS: "after-previous",
  WITH_PREVIOUS: "with-previous",
});

function normalizeAnimationPlaybackMode(value, index = 0) {
  if (index === 0) {
    return ANIMATION_PLAYBACK_MODES.AFTER_PREVIOUS;
  }
  if (value === ANIMATION_PLAYBACK_MODES.AFTER_PREVIOUS) {
    return ANIMATION_PLAYBACK_MODES.AFTER_PREVIOUS;
  }
  if (value === ANIMATION_PLAYBACK_MODES.WITH_PREVIOUS) {
    return ANIMATION_PLAYBACK_MODES.WITH_PREVIOUS;
  }

  // Existing projects played every assigned animation together. Preserve that
  // behavior when the new field is absent while making the first assignment
  // the explicit start of the playback sequence.
  return ANIMATION_PLAYBACK_MODES.WITH_PREVIOUS;
}

export function normalizeChapterAnimationAssignment(item, index = 0) {
  if (typeof item === "string") {
    return {
      assignmentId: `legacy-animation-${index}-${item}`,
      name: item,
      source: "embedded",
      animationId: "",
      autoPlay: false,
      loop: false,
      speed: 1,
      playMode: normalizeAnimationPlaybackMode(null, index),
    };
  }

  return {
    ...item,
    assignmentId:
      item?.assignmentId || `legacy-animation-${index}-${String(item?.name || "")}`,
    name: String(item?.name || ""),
    source: item?.source === "authored" ? "authored" : "embedded",
    animationId: String(item?.animationId || ""),
    autoPlay: normalizeBoolean(item?.autoPlay),
    loop: normalizeBoolean(item?.loop),
    speed: normalizeSpeed(item?.speed),
    playMode: normalizeAnimationPlaybackMode(item?.playMode, index),
  };
}

export function normalizeChapterAnimationAssignments(items) {
  return Array.isArray(items)
    ? items.map((item, index) => normalizeChapterAnimationAssignment(item, index))
    : [];
}

export function createChapterAnimationPlaybackGroups(items) {
  const assignments = normalizeChapterAnimationAssignments(items).filter(
    (item) => item.name || item.animationId,
  );

  return assignments.reduce((groups, assignment) => {
    const playWithPrevious =
      assignment.playMode === ANIMATION_PLAYBACK_MODES.WITH_PREVIOUS;

    if (groups.length === 0 || !playWithPrevious) {
      groups.push([assignment]);
    } else {
      groups[groups.length - 1].push(assignment);
    }

    return groups;
  }, []);
}

export function normalizeChapterFlowAssignment(item, index = 0) {
  if (typeof item === "string") {
    return {
      assignmentId: `legacy-flow-${index}-${item}`,
      flowId: item,
      name: "",
      autoPlay: false,
    };
  }

  return {
    ...item,
    assignmentId:
      item?.assignmentId ||
      `legacy-flow-${index}-${String(item?.flowId || item?.id || "")}`,
    flowId: String(item?.flowId || item?.id || ""),
    name: String(item?.name || ""),
    autoPlay: normalizeBoolean(item?.autoPlay),
  };
}

export function normalizeChapterFlowAssignments(items) {
  return Array.isArray(items)
    ? items.map((item, index) => normalizeChapterFlowAssignment(item, index))
    : [];
}

function updateChapterAssignments(material, chapterId, field, updater) {
  if (!material || !chapterId || !field || typeof updater !== "function") {
    return material;
  }

  return {
    ...material,
    chapters: (material.chapters || []).map((chapter) =>
      chapter.id === chapterId
        ? {
            ...chapter,
            [field]: updater(chapter[field] || []),
          }
        : chapter,
    ),
  };
}

export function addChapterAnimationAssignment(material, chapterId) {
  return updateChapterAssignments(material, chapterId, "animations", (items) => [
    ...normalizeChapterAnimationAssignments(items),
    normalizeChapterAnimationAssignment({
      assignmentId: createId("chapter-animation"),
      playMode: ANIMATION_PLAYBACK_MODES.AFTER_PREVIOUS,
    }),
  ]);
}

export function updateChapterAnimationAssignment(
  material,
  chapterId,
  assignmentId,
  patch,
) {
  return updateChapterAssignments(material, chapterId, "animations", (items) =>
    normalizeChapterAnimationAssignments(items).map((item) =>
      item.assignmentId === assignmentId ? { ...item, ...patch } : item,
    ),
  );
}

export function removeChapterAnimationAssignment(
  material,
  chapterId,
  assignmentId,
) {
  return updateChapterAssignments(material, chapterId, "animations", (items) =>
    normalizeChapterAnimationAssignments(items).filter(
      (item) => item.assignmentId !== assignmentId,
    ),
  );
}

export function addChapterFlowAssignment(material, chapterId) {
  return updateChapterAssignments(material, chapterId, "flows", (items) => [
    ...normalizeChapterFlowAssignments(items),
    normalizeChapterFlowAssignment({ assignmentId: createId("chapter-flow") }),
  ]);
}

export function updateChapterFlowAssignment(
  material,
  chapterId,
  assignmentId,
  patch,
) {
  return updateChapterAssignments(material, chapterId, "flows", (items) =>
    normalizeChapterFlowAssignments(items).map((item) =>
      item.assignmentId === assignmentId ? { ...item, ...patch } : item,
    ),
  );
}

export function removeChapterFlowAssignment(
  material,
  chapterId,
  assignmentId,
) {
  return updateChapterAssignments(material, chapterId, "flows", (items) =>
    normalizeChapterFlowAssignments(items).filter(
      (item) => item.assignmentId !== assignmentId,
    ),
  );
}

export function moveChapterInMaterial(material, chapterId, direction) {
  if (!material || !chapterId) return material;

  const chapters = Array.isArray(material.chapters) ? material.chapters : [];
  const currentIndex = chapters.findIndex((chapter) => chapter.id === chapterId);
  const offset = direction === "up" || direction === -1 ? -1 : 1;
  const targetIndex = currentIndex + offset;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= chapters.length
  ) {
    return material;
  }

  const nextChapters = [...chapters];
  const [movedChapter] = nextChapters.splice(currentIndex, 1);
  nextChapters.splice(targetIndex, 0, movedChapter);

  return {
    ...material,
    chapters: nextChapters,
  };
}
