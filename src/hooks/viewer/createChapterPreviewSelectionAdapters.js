const KEEP_CHAPTER_PANEL_OPEN = Object.freeze({ openInfo: false });

export function createChapterPreviewSelectionAdapters({
  makeOthersXray,
  makeTargetObjectsXray,
  highlightObject,
  highlightSelectedObjectsPreservingVisualState,
}) {
  return {
    makeOthersXray: (targets, activeTarget) =>
      makeOthersXray(targets, activeTarget, KEEP_CHAPTER_PANEL_OPEN),
    makeTargetObjectsXray: (targets, activeTarget) =>
      makeTargetObjectsXray(
        targets,
        activeTarget,
        KEEP_CHAPTER_PANEL_OPEN,
      ),
    highlightObject: (target) =>
      highlightObject(target, KEEP_CHAPTER_PANEL_OPEN),
    highlightSelectedObjectsPreservingVisualState: (targets, activeTarget) =>
      highlightSelectedObjectsPreservingVisualState(
        targets,
        activeTarget,
        KEEP_CHAPTER_PANEL_OPEN,
      ),
  };
}

export default createChapterPreviewSelectionAdapters;
