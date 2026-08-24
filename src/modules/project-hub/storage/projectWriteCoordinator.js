const projectWriteQueues = new Map();

function normalizeProjectId(projectId) {
  if (projectId == null) return "";
  return String(projectId).trim();
}

/**
 * Serialize editor persistence per project across ViewerPage instances.
 *
 * React hook refs only protect one mounted editor instance. This coordinator
 * lives at module scope so Project A keeps one ordered write lane even after
 * navigating A -> Dashboard -> B -> A.
 */
export function enqueueProjectWrite(projectId, task) {
  const key = normalizeProjectId(projectId);

  if (!key) {
    return Promise.reject(new Error("Project ID is required for queued writes."));
  }

  if (typeof task !== "function") {
    return Promise.reject(new Error("Queued project write requires a task."));
  }

  const previous = projectWriteQueues.get(key) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => task());

  projectWriteQueues.set(key, next);

  const cleanup = () => {
    if (projectWriteQueues.get(key) === next) {
      projectWriteQueues.delete(key);
    }
  };

  next.then(cleanup, cleanup);
  return next;
}

/**
 * Ensure a reopened project never hydrates IndexedDB while an older editor
 * instance is still finishing its save sequence for the same project.
 */
export async function waitForProjectWrites(projectId) {
  const key = normalizeProjectId(projectId);
  if (!key) return;

  while (true) {
    const pending = projectWriteQueues.get(key);
    if (!pending) return;

    try {
      await pending;
    } catch {
      // The original writer owns error reporting. Loading may continue after
      // the failed write has left the queue.
    }

    if (projectWriteQueues.get(key) === pending) {
      return;
    }
  }
}
