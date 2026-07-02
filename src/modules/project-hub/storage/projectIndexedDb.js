const DB_NAME = "vxplore-db";
const DB_VERSION = 2;

const PROJECT_STORE = "projects";
const FILE_STORE = "files";
const DRAFT_STORE = "drafts";

function openVXploreDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE, { keyPath: "projectId" });
      }

      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE, { keyPath: "projectId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function createProjectRecord({ name, file, role = "EDITOR" }) {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    name,
    role,
    workspace: "Default Workspace",
    thumbnail: null,

    status: "DRAFT",
    publishVersion: null,

    fileName: file?.name || "",
    fileSize: file?.size || 0,

    metadata: {
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: null,
    },

    material: {
      id: crypto.randomUUID(),
      title: "Materi 3D Baru",
      description: "",
      version: "1.0.0",
      author: "",
      thumbnail: "",
      availableOnMarketplace: false,
      modelUrl: "",
      chapters: [],
    },

    viewer: {
      exposure: 1.8,
      ambientLight: 2.5,
      mainLight: 4,
      fillLight: 2,
      hemiLight: 2,
      envIntensity: 3,
      hdri: "/hdr/studio.hdr",
      showHdriBackground: false,
      shaderMode: "original",
      metalness: 0.3,
      roughness: 0.8,
    },

    scene: {
      markers: [],
      hiddenObjects: [],
      xrayObjects: [],
      cut: {
        enabled: false,
        axis: "x",
        value: 0,
      },
    },

    autosave: {
      status: "SAVED",
      lastSavedAt: null,
    },
  };
}

export async function saveProjectToIndexedDb(project, file) {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PROJECT_STORE, FILE_STORE], "readwrite");

    tx.objectStore(PROJECT_STORE).put(project);

    if (file) {
      tx.objectStore(FILE_STORE).put({
        projectId: project.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        blob: file,
        savedAt: new Date().toISOString(),
      });
    }

    tx.oncomplete = () => resolve(project);
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateProjectInIndexedDb(projectId, patch) {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readwrite");
    const store = tx.objectStore(PROJECT_STORE);
    const getRequest = store.get(projectId);

    getRequest.onsuccess = () => {
      const oldProject = getRequest.result;

      if (!oldProject) {
        resolve(null);
        return;
      }

      const updatedProject = {
        ...oldProject,
        ...patch,
        metadata: {
          ...oldProject.metadata,
          ...(patch.metadata || {}),
          updatedAt: new Date().toISOString(),
        },
      };

      store.put(updatedProject);
      resolve(updatedProject);
    };

    getRequest.onerror = () => reject(getRequest.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveProjectDraftToIndexedDb(projectId, draft) {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readwrite");

    const payload = {
      projectId,
      ...draft,
      savedAt: new Date().toISOString(),
    };

    tx.objectStore(DRAFT_STORE).put(payload);

    tx.oncomplete = () => resolve(payload);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProjectDraftFromIndexedDb(projectId) {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    const request = tx.objectStore(DRAFT_STORE).get(projectId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjectsFromIndexedDb() {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readonly");
    const request = tx.objectStore(PROJECT_STORE).getAll();

    request.onsuccess = () => {
      const projects = request.result || [];

      projects.sort((a, b) => {
        const dateA = a.metadata?.lastOpenedAt || a.metadata?.updatedAt || a.createdAt;
        const dateB = b.metadata?.lastOpenedAt || b.metadata?.updatedAt || b.createdAt;

        return new Date(dateB) - new Date(dateA);
      });

      resolve(projects);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getProjectFromIndexedDb(projectId) {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readonly");
    const request = tx.objectStore(PROJECT_STORE).get(projectId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getProjectFileFromIndexedDb(projectId) {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readonly");
    const request = tx.objectStore(FILE_STORE).get(projectId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearVXploreIndexedDb() {
  const db = await openVXploreDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PROJECT_STORE, FILE_STORE, DRAFT_STORE], "readwrite");

    tx.objectStore(PROJECT_STORE).clear();
    tx.objectStore(FILE_STORE).clear();
    tx.objectStore(DRAFT_STORE).clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}