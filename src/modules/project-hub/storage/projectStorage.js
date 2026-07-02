const STORAGE_KEY = "vxplore-projects";

export function getProjects() {
  const data = localStorage.getItem(STORAGE_KEY);

  if (!data) return [];

  return JSON.parse(data);
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