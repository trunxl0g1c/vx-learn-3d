import { PROJECT_CATALOG_CACHE_KEY } from "./constants";
import { isPlainObject } from "./common";

function getProjectSortDate(project) {
  return (
    project?.metadata?.lastOpenedAt ||
    project?.metadata?.updatedAt ||
    project?.createdAt ||
    0
  );
}

export function sortProjectsByRecent(projects) {
  return [...(Array.isArray(projects) ? projects : [])].sort(
    (first, second) =>
      new Date(getProjectSortDate(second)).getTime() -
      new Date(getProjectSortDate(first)).getTime(),
  );
}

function getProjectThumbnail(project) {
  return (
    project?.thumbnail ||
    project?.material?.thumbnail ||
    project?.metadata?.thumbnail ||
    project?.metadata?.thumbnailUrl ||
    null
  );
}

function getCacheSafeThumbnail(project) {
  const thumbnail = getProjectThumbnail(project);

  if (typeof thumbnail !== "string") return null;
  if (thumbnail.startsWith("data:") || thumbnail.startsWith("blob:")) {
    return null;
  }

  return thumbnail.length <= 2048 ? thumbnail : null;
}

function createCacheSafeMetadata(metadata) {
  const source = isPlainObject(metadata) ? metadata : {};

  return {
    createdAt: source.createdAt || null,
    updatedAt: source.updatedAt || null,
    lastOpenedAt: source.lastOpenedAt || null,
    importedAt: source.importedAt || null,
    sourcePackageName: source.sourcePackageName || null,
  };
}

export function createProjectSummary(project, { cacheSafe = false } = {}) {
  if (!project?.id) return null;

  return {
    id: project.id,
    name: project.name || "Untitled Project",
    role: project.role === "PLAYER" ? "PLAYER" : "EDITOR",
    workspace: project.workspace || "Default Workspace",
    thumbnail: cacheSafe
      ? getCacheSafeThumbnail(project)
      : getProjectThumbnail(project),
    status: project.status || "DRAFT",
    publishVersion: project.publishVersion || null,
    fileName: project.fileName || "",
    fileSize: Number(project.fileSize || 0),
    metadata: cacheSafe
      ? createCacheSafeMetadata(project.metadata)
      : project.metadata || {},
    autosave: cacheSafe ? null : project.autosave || null,
  };
}

export function writeProjectCatalogCache(projects) {
  try {
    const summaries = sortProjectsByRecent(projects)
      .map((project) => createProjectSummary(project, { cacheSafe: true }))
      .filter(Boolean);

    localStorage.setItem(PROJECT_CATALOG_CACHE_KEY, JSON.stringify(summaries));
  } catch {
    // IndexedDB remains the source of truth when localStorage is unavailable.
  }
}

export function getCachedProjectSummaries() {
  try {
    const value = localStorage.getItem(PROJECT_CATALOG_CACHE_KEY);
    const parsed = value ? JSON.parse(value) : [];

    if (!Array.isArray(parsed)) return [];

    return sortProjectsByRecent(
      parsed
        .map((project) => createProjectSummary(project, { cacheSafe: true }))
        .filter(Boolean),
    );
  } catch {
    return [];
  }
}

export function upsertProjectCatalogCache(project) {
  const summary = createProjectSummary(project, { cacheSafe: true });

  if (!summary) return;

  const cached = getCachedProjectSummaries();
  writeProjectCatalogCache([
    summary,
    ...cached.filter((item) => item.id !== summary.id),
  ]);
}

export function removeProjectCatalogCache(projectId) {
  if (!projectId) return;

  const cached = getCachedProjectSummaries();
  writeProjectCatalogCache(cached.filter((project) => project.id !== projectId));
}

export function clearProjectCatalogCache() {
  try {
    localStorage.removeItem(PROJECT_CATALOG_CACHE_KEY);
  } catch {
    // Ignore localStorage errors.
  }
}

export function removeProjectFromCatalogCache(projectId) {
  writeProjectCatalogCache(
    getCachedProjectSummaries().filter((item) => item.id !== projectId),
  );
}
