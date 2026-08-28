const DEFAULT_RELEASE_DELAY_MS = 1200

const resourceEntries = new Map()

function getResourceKey(url, scene) {
  return typeof url === "string" && url ? url : scene?.uuid || scene
}

function releaseResourceEntry(key, entry) {
  if (!entry) return false

  if (entry.timer !== null) {
    globalThis.clearTimeout(entry.timer)
    entry.timer = null
  }

  resourceEntries.delete(key)

  const release = entry.release
  entry.release = null

  release?.(entry.scene)
  entry.scene = null
  entry.refs = 0
  return true
}

/**
 * Retains one GLTF runtime resource.
 *
 * `release` can be registered immediately at retain time. This is important for
 * route teardown: Dashboard can force-release a stale registry entry even when
 * a React passive cleanup was delayed or skipped by an interrupted navigation.
 * The returned function remains backwards compatible with the older
 * `releaseResource({ release })` call style.
 */
export function retainGltfResource(url, scene, options = {}) {
  const key = getResourceKey(url, scene)
  if (!key) return () => {}

  let entry = resourceEntries.get(key)
  if (!entry) {
    entry = { refs: 0, timer: null, scene, release: null }
    resourceEntries.set(key, entry)
  }

  if (entry.timer !== null) {
    globalThis.clearTimeout(entry.timer)
    entry.timer = null
  }

  entry.refs += 1
  entry.scene = scene || entry.scene
  if (typeof options.release === "function") {
    entry.release = options.release
  }

  return ({ release, delayMs = DEFAULT_RELEASE_DELAY_MS } = {}) => {
    const current = resourceEntries.get(key)
    if (!current) return

    current.refs = Math.max(0, current.refs - 1)
    if (typeof release === "function") current.release = release
    if (current.refs > 0 || current.timer !== null) return

    current.timer = globalThis.setTimeout(() => {
      const latest = resourceEntries.get(key)
      if (!latest || latest.refs > 0) return

      releaseResourceEntry(key, latest)
    }, Math.max(0, Number(delayMs) || 0))
  }
}

/**
 * Immediately releases GLTF resources whose React/R3F owners have already
 * unmounted. Active resources (refs > 0) are never touched.
 */
export function releaseUnusedGltfResourcesNow() {
  let released = 0

  for (const [key, entry] of Array.from(resourceEntries.entries())) {
    if (!entry || entry.refs > 0) continue

    if (releaseResourceEntry(key, entry)) released += 1
  }

  return released
}

/**
 * Dashboard has no 3D model owner by design. Force-release every registry entry
 * when it is mounted, including an entry whose ref-count became stale because a
 * route transition interrupted passive cleanup. Do not call this inside an
 * active Editor/Player Canvas.
 */
export function forceReleaseAllGltfResourcesNow() {
  let released = 0

  for (const [key, entry] of Array.from(resourceEntries.entries())) {
    if (!entry) continue
    if (releaseResourceEntry(key, entry)) released += 1
  }

  return released
}

export function getRetainedGltfResourceCount() {
  return resourceEntries.size
}

export function getRetainedGltfResourceSnapshot() {
  return Array.from(resourceEntries.entries()).map(([key, entry]) => ({
    key: typeof key === "string" ? key : String(key?.uuid || "resource"),
    refs: Number(entry?.refs || 0),
    hasScene: Boolean(entry?.scene),
    hasRelease: typeof entry?.release === "function",
    pendingRelease: entry?.timer !== null,
  }))
}
