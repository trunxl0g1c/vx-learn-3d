import { createId } from "../../../utils/createId";

const DB_NAME = "viqubed-db";
const PREVIOUS_BRAND_DB_NAME = ["vi", "cubed-db"].join("");
const LEGACY_DB_NAME = ["vx", "plore-db"].join("");
const LEGACY_DB_NAMES = [PREVIOUS_BRAND_DB_NAME, LEGACY_DB_NAME];
const DB_VERSION = 2;
const MIGRATION_KEY = "viqubed-indexeddb-migrated-v1";

const PROJECT_STORE = "projects";
const FILE_STORE = "files";
const DRAFT_STORE = "drafts";

let databasePromise = null;
let migrationPromise = null;

function openDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

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

function getMigrationStatus() {
  try {
    return localStorage.getItem(MIGRATION_KEY) === "true";
  } catch {
    return false;
  }
}

function setMigrationStatus() {
  try {
    localStorage.setItem(MIGRATION_KEY, "true");
  } catch {
    // IndexedDB remains usable when localStorage is unavailable.
  }
}

function countStoreRecords(db, storeName) {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve(0);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).count();

    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => reject(request.error);
  });
}

function getAllStoreRecords(db, storeName) {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function migrateLegacyDatabase(targetDb) {
  if (getMigrationStatus()) return;

  const existingProjectCount = await countStoreRecords(targetDb, PROJECT_STORE);

  if (existingProjectCount > 0) {
    setMigrationStatus();
    return;
  }

  try {
    for (const legacyName of LEGACY_DB_NAMES) {
      let legacyDb = null;

      try {
        legacyDb = await openDatabase(legacyName);

        const [projects, files, drafts] = await Promise.all([
          getAllStoreRecords(legacyDb, PROJECT_STORE),
          getAllStoreRecords(legacyDb, FILE_STORE),
          getAllStoreRecords(legacyDb, DRAFT_STORE),
        ]);

        if (!projects.length && !files.length && !drafts.length) continue;

        await new Promise((resolve, reject) => {
          const tx = targetDb.transaction(
            [PROJECT_STORE, FILE_STORE, DRAFT_STORE],
            "readwrite",
          );

          projects.forEach((record) => tx.objectStore(PROJECT_STORE).put(record));
          files.forEach((record) => tx.objectStore(FILE_STORE).put(record));
          drafts.forEach((record) => tx.objectStore(DRAFT_STORE).put(record));

          tx.oncomplete = () => resolve(true);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () =>
            reject(tx.error || new Error("Database migration aborted"));
        });

        break;
      } finally {
        legacyDb?.close();
      }
    }
  } finally {
    setMigrationStatus();
  }
}

function openViqubedDb() {
  if (!databasePromise) {
    databasePromise = openDatabase(DB_NAME)
      .then(async (db) => {
        if (!migrationPromise) {
          migrationPromise = migrateLegacyDatabase(db).catch((error) => {
            console.warn("Unable to migrate legacy project data", error);
          });
        }

        await migrationPromise;
        return db;
      })
      .catch((error) => {
        databasePromise = null;
        migrationPromise = null;
        throw error;
      });
  }

  return databasePromise;
}

export function createProjectRecord({ name, file, role = "EDITOR" }) {
  const now = new Date().toISOString();

  return {
    id: createId(),
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
      id: createId(),
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
      exposure: 0.75,
      ambientLight: 0.5,
      mainLight: 0.8,
      fillLight: 0.5,
      hemiLight: 0.5,
      envIntensity: 0.8,
      hdri: "/hdr/studio.hdr",
      showHdriBackground: false,
      shaderMode: "original",
      metalness: 0.1,
      roughness: 0.1,
      cameraProjectionMode: "perspective",
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
  const db = await openViqubedDb();

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
  const db = await openViqubedDb();

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
  const db = await openViqubedDb();

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
  const db = await openViqubedDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(DRAFT_STORE, "readonly");
    const request = tx.objectStore(DRAFT_STORE).get(projectId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjectsFromIndexedDb() {
  const db = await openViqubedDb();

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
  const db = await openViqubedDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECT_STORE, "readonly");
    const request = tx.objectStore(PROJECT_STORE).get(projectId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getProjectFileFromIndexedDb(projectId) {
  const db = await openViqubedDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILE_STORE, "readonly");
    const request = tx.objectStore(FILE_STORE).get(projectId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function clearViqubedIndexedDb() {
  const db = await openViqubedDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PROJECT_STORE, FILE_STORE, DRAFT_STORE], "readwrite");

    tx.objectStore(PROJECT_STORE).clear();
    tx.objectStore(FILE_STORE).clear();
    tx.objectStore(DRAFT_STORE).clear();

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}