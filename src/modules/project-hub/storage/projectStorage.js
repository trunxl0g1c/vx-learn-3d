const STORAGE_KEY = "viqubed-projects";
const PREVIOUS_BRAND_STORAGE_KEY = ["vi", "cubed-projects"].join("");
const LEGACY_STORAGE_KEY = ["vx", "plore-projects"].join("");
const LEGACY_STORAGE_KEYS = [PREVIOUS_BRAND_STORAGE_KEY, LEGACY_STORAGE_KEY];

export function getProjects() {
  const currentData = localStorage.getItem(STORAGE_KEY);

  if (currentData) return JSON.parse(currentData);

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const legacyData = localStorage.getItem(legacyKey);

    if (!legacyData) continue;

    localStorage.setItem(STORAGE_KEY, legacyData);
    return JSON.parse(legacyData);
  }

  return [];
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function createProject(project) {
  const projects = getProjects();

  projects.unshift(project);

  saveProjects(projects);

  return project;
}

export function getProject(id) {
  return getProjects().find((p) => p.id === id);
}