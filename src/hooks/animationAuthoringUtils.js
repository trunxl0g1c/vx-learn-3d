export function wouldCreateRigParentCycle(tracks, childTrackId, parentTrackId) {
  if (!parentTrackId) return false;
  if (childTrackId === parentTrackId) return true;
  const byId = new Map((tracks || []).map((track) => [track.id, track]));
  const visited = new Set([childTrackId]);
  let currentId = parentTrackId;

  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = byId.get(currentId)?.rig?.parentTrackId || null;
  }

  return false;
}

export function getAnimationReferenceIdentity(reference) {
  if (!reference) return "";
  if (reference.uuid) return `uuid:${reference.uuid}`;
  if (Array.isArray(reference.path)) return `path:${reference.path.join(".")}`;
  return `name:${String(reference.name || "").trim()}`;
}

export function normalizeAnimationRigPoint(point) {
  if (!Array.isArray(point) || point.length < 3) return null;
  return [
    Number(point[0]) || 0,
    Number(point[1]) || 0,
    Number(point[2]) || 0,
  ];
}
