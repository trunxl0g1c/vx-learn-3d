export function createPlayerSceneKey(projectId, scene) {
  return `${projectId || ""}:${scene?.uuid || scene?.id || "scene"}`
}

export function createChapterVisibilitySnapshot({
  projectId,
  scene,
  visibleChapters = [],
} = {}) {
  return {
    sceneKey: createPlayerSceneKey(projectId, scene),
    visibleChapterIds: new Set(
      (Array.isArray(visibleChapters) ? visibleChapters : [])
        .map((chapter) => chapter?.id)
        .filter(Boolean),
    ),
  }
}

export function filterChaptersByVisibilitySnapshot(
  chapters,
  snapshot,
  sceneKey,
) {
  const source = Array.isArray(chapters) ? chapters : []

  if (!snapshot || snapshot.sceneKey !== sceneKey) return null

  return source.filter((chapter) => {
    const chapterId = chapter?.id

    // Legacy records without an id must remain available instead of being
    // dropped by a snapshot that cannot address them safely.
    return !chapterId || snapshot.visibleChapterIds.has(chapterId)
  })
}
