function getTrackParentId(track, byId) {
  const parentId = track?.rig?.parentTrackId || null;
  if (!parentId || parentId === track?.id || !byId?.has(parentId)) return null;
  return parentId;
}

function applyOrderIndexes(tracks) {
  return tracks.map((track, index) => ({
    ...track,
    orderIndex: index,
  }));
}

function buildHierarchy(tracks) {
  const source = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
  const byId = new Map(source.map((track) => [track.id, track]));
  const childrenByParent = new Map();

  source.forEach((track) => {
    const parentId = getTrackParentId(track, byId);
    const key = parentId || null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(track);
  });

  return { source, byId, childrenByParent };
}

/**
 * Keeps the authored track array in visual hierarchy order while preserving
 * the user's current sibling order. Parent tracks always appear before their
 * descendants, which makes timeline ordering deterministic after save/load.
 */
export function organizeAuthoredAnimationTracks(tracks) {
  const { source, childrenByParent } = buildHierarchy(tracks);
  if (source.length <= 1) return applyOrderIndexes(source);

  const ordered = [];
  const appended = new Set();

  const appendBranch = (track) => {
    if (!track || appended.has(track.id)) return;
    appended.add(track.id);
    ordered.push(track);

    const children = childrenByParent.get(track.id) || [];
    children.forEach(appendBranch);
  };

  (childrenByParent.get(null) || []).forEach(appendBranch);

  // Imported/legacy data may contain an invalid parent cycle. Preserve every
  // track exactly once rather than dropping it from the timeline.
  source.forEach(appendBranch);

  return applyOrderIndexes(ordered);
}

function collectBranchIds(rootId, tracks) {
  const { childrenByParent } = buildHierarchy(tracks);
  const branchIds = new Set();

  const visit = (trackId) => {
    if (!trackId || branchIds.has(trackId)) return;
    branchIds.add(trackId);
    (childrenByParent.get(trackId) || []).forEach((child) => visit(child.id));
  };

  visit(rootId);
  return branchIds;
}

function findSiblingAnchorId(targetTrackId, desiredParentId, tracks) {
  const byId = new Map((tracks || []).map((track) => [track.id, track]));
  const visited = new Set();
  let current = byId.get(targetTrackId) || null;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    const currentParentId = getTrackParentId(current, byId);
    if (currentParentId === desiredParentId) return current.id;
    current = currentParentId ? byId.get(currentParentId) || null : null;
  }

  return null;
}

/**
 * Reorders one timeline branch without breaking its mechanical parent link.
 * A parent moves together with all descendants. A child can be reordered only
 * among siblings under the same parent; dragging across another branch uses
 * that branch's comparable ancestor as the drop anchor.
 */
export function reorderAuthoredAnimationTrack(
  tracks,
  draggedTrackId,
  targetTrackId,
  placement = "before",
) {
  const organized = organizeAuthoredAnimationTracks(tracks);
  if (
    !draggedTrackId ||
    !targetTrackId ||
    draggedTrackId === targetTrackId ||
    organized.length <= 1
  ) {
    return organized;
  }

  const byId = new Map(organized.map((track) => [track.id, track]));
  const draggedTrack = byId.get(draggedTrackId);
  const targetTrack = byId.get(targetTrackId);
  if (!draggedTrack || !targetTrack) return organized;

  const draggedParentId = getTrackParentId(draggedTrack, byId);
  const anchorId = findSiblingAnchorId(
    targetTrackId,
    draggedParentId,
    organized,
  );
  if (!anchorId || anchorId === draggedTrackId) return organized;

  const draggedBranchIds = collectBranchIds(draggedTrackId, organized);
  if (draggedBranchIds.has(anchorId)) return organized;

  const draggedBranch = organized.filter((track) => draggedBranchIds.has(track.id));
  const remaining = organized.filter((track) => !draggedBranchIds.has(track.id));
  const anchorIndex = remaining.findIndex((track) => track.id === anchorId);
  if (anchorIndex < 0) return organized;

  let insertIndex = anchorIndex;
  if (placement === "after") {
    const anchorBranchIds = collectBranchIds(anchorId, remaining);
    insertIndex = anchorIndex + 1;
    while (
      insertIndex < remaining.length &&
      anchorBranchIds.has(remaining[insertIndex].id)
    ) {
      insertIndex += 1;
    }
  }

  const next = [
    ...remaining.slice(0, insertIndex),
    ...draggedBranch,
    ...remaining.slice(insertIndex),
  ];

  return applyOrderIndexes(next);
}
