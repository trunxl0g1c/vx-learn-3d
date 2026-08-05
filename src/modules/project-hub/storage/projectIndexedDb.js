import { createId } from "../../../utils/createId";
import { normalizePlayerSettings } from "../../material/playerSettings";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";
import {
  ALL_STORE_NAMES,
  CHAPTER_STORE,
  DRAFT_STORE,
  FILE_STORE,
  FLOW_STORE,
  NORMALIZED_STORE_NAMES,
  PROCEDURE_STORE,
  PROJECT_STORE,
} from "./indexed-db/constants";
import { isPlainObject } from "./indexed-db/common";
import {
  clearProjectCatalogCache,
  createProjectSummary,
  getCachedProjectSummaries,
  sortProjectsByRecent,
  upsertProjectCatalogCache,
  writeProjectCatalogCache,
} from "./indexed-db/catalogCache";
import {
  getAllStoreRecords,
  getStoreRecord,
  openViqubedDb,
} from "./indexed-db/database";
import {
  getMaterialRecordFromIndexedDb,
  hydrateMaterial,
  readNormalizedMaterialMaps,
  readNormalizedMaterialMapsForProject,
} from "./indexed-db/materialQueries";
import {
  persistNormalizedMaterialFields,
  splitMaterialForStorage,
  stripDraftForStorage,
  stripProjectForStorage,
} from "./indexed-db/materialSerialization";

export { getCachedProjectSummaries };
  FILE_STORE,
  DRAFT_STORE,
  ...NORMALIZED_STORE_NAMES,
];

let databasePromise = null;
let migrationPromise = null;

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function getProjectSortDate(project) {
  return (
    project?.metadata?.lastOpenedAt ||
    project?.metadata?.updatedAt ||
    project?.createdAt ||
    0
  );
}

function sortProjectsByRecent(projects) {
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

function createProjectSummary(project, { cacheSafe = false } = {}) {
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

function writeProjectCatalogCache(projects) {
  try {
    const summaries = sortProjectsByRecent(projects)
      .map((project) => createProjectSummary(project, { cacheSafe: true }))
      .filter(Boolean);

    localStorage.setItem(PROJECT_CATALOG_CACHE_KEY, JSON.stringify(summaries));
  } catch {
    // IndexedDB remains the source of truth when localStorage is unavailable.
  }
}

function upsertProjectCatalogCache(project) {
  const summary = createProjectSummary(project, { cacheSafe: true });

  if (!summary) return;

  const cached = getCachedProjectSummaries();
  writeProjectCatalogCache([
    summary,
    ...cached.filter((item) => item.id !== summary.id),
  ]);
}

function clearProjectCatalogCache() {
  try {
    localStorage.removeItem(PROJECT_CATALOG_CACHE_KEY);
  } catch {
    // Ignore localStorage errors.
  }
}

function removeProjectFromCatalogCache(projectId) {
  writeProjectCatalogCache(
    getCachedProjectSummaries().filter((item) => item.id !== projectId),
  );
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createArrayStore(db, transaction, storeName) {
  const store = db.objectStoreNames.contains(storeName)
    ? transaction.objectStore(storeName)
    : db.createObjectStore(storeName, { keyPath: "storageId" });

  if (!store.indexNames.contains(PROJECT_ID_INDEX)) {
    store.createIndex(PROJECT_ID_INDEX, "projectId", { unique: false });
  }

  return store;
}

function ensureDatabaseStores(db, transaction) {
  if (!db.objectStoreNames.contains(PROJECT_STORE)) {
    db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
  }

  if (!db.objectStoreNames.contains(FILE_STORE)) {
    db.createObjectStore(FILE_STORE, { keyPath: "projectId" });
  }

  if (!db.objectStoreNames.contains(DRAFT_STORE)) {
    db.createObjectStore(DRAFT_STORE, { keyPath: "projectId" });
  }

  createArrayStore(db, transaction, CHAPTER_STORE);
  createArrayStore(db, transaction, FLOW_STORE);
  createArrayStore(db, transaction, OBJECT_NAME_OVERRIDE_STORE);
  createArrayStore(db, transaction, PROCEDURE_STORE);

  if (!db.objectStoreNames.contains(PLAYER_SETTINGS_STORE)) {
    db.createObjectStore(PLAYER_SETTINGS_STORE, { keyPath: "projectId" });
  }
}

function createStorageId(projectId, storeName, item, index) {
  const itemId =
    String(item?.id || item?.uuid || item?.name || "").trim() || "item";

  return `${projectId}::${storeName}::${itemId}::${index}`;
}

function createStoredArrayRecord(projectId, storeName, item, index) {
  const normalizedItem = isPlainObject(item) ? item : { value: item };

  return {
    ...normalizedItem,
    projectId,
    storageId: createStorageId(projectId, storeName, normalizedItem, index),
    orderIndex: index,
  };
}

function stripStoredArrayMetadata(record) {
  if (!isPlainObject(record)) return record;

  const {
    storageId: _storageId,
    projectId: _projectId,
    orderIndex: _orderIndex,
    ...item
  } = record;

  if (Object.keys(item).length === 1 && hasOwn(item, "value")) {
    return item.value;
  }

  return item;
}

function stripStoredPlayerSettings(record) {
  if (!isPlainObject(record)) return null;

  const { projectId: _projectId, ...settings } = record;
  return settings;
}

function splitMaterialForStorage(material) {
  if (!isPlainObject(material)) {
    return {
      storedMaterial: material,
      normalizedFields: {},
    };
  }

  const storedMaterial = { ...material };
  const normalizedFields = {};

  ARRAY_MATERIAL_STORES.forEach(({ field }) => {
    if (hasOwn(material, field)) {
      normalizedFields[field] = Array.isArray(material[field])
        ? material[field]
        : [];
    }

    delete storedMaterial[field];
  });

  if (hasOwn(material, "playerSettings")) {
    normalizedFields.playerSettings = isPlainObject(material.playerSettings)
      ? material.playerSettings
      : {};
  }

  delete storedMaterial.playerSettings;

  return {
    storedMaterial,
    normalizedFields,
  };
}

function stripProjectForStorage(project) {
  if (!isPlainObject(project)) return project;

  const { storedMaterial } = splitMaterialForStorage(project.material);

  return {
    ...project,
    material: storedMaterial,
  };
}

function stripDraftForStorage(projectId, draft, savedAt) {
  const source = isPlainObject(draft) ? draft : {};
  const { storedMaterial } = splitMaterialForStorage(source.material);

  return {
    ...source,
    projectId,
    material: storedMaterial,
    savedAt,
  };
}

function putArrayRows(store, projectId, storeName, items) {
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    store.put(createStoredArrayRecord(projectId, storeName, item, index));
  });
}

function replaceArrayRows(transaction, projectId, storeName, items) {
  const store = transaction.objectStore(storeName);
  const index = store.index(PROJECT_ID_INDEX);
  const cursorRequest = index.openKeyCursor(IDBKeyRange.only(projectId));

  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;

    if (cursor) {
      store.delete(cursor.primaryKey);
      cursor.continue();
      return;
    }

    putArrayRows(store, projectId, storeName, items);
  };
}

function persistNormalizedMaterialFields(
  transaction,
  projectId,
  normalizedFields,
) {
  ARRAY_MATERIAL_STORES.forEach(({ field, storeName }) => {
    if (!hasOwn(normalizedFields, field)) return;

    replaceArrayRows(
      transaction,
      projectId,
      storeName,
      normalizedFields[field],
    );
  });

  if (hasOwn(normalizedFields, "playerSettings")) {
    transaction.objectStore(PLAYER_SETTINGS_STORE).put({
      ...(normalizedFields.playerSettings || {}),
      projectId,
    });
  }
}

function putNormalizedMaterialFieldsDuringUpgrade(
  transaction,
  projectId,
  normalizedFields,
) {
  ARRAY_MATERIAL_STORES.forEach(({ field, storeName }) => {
    if (!hasOwn(normalizedFields, field)) return;

    putArrayRows(
      transaction.objectStore(storeName),
      projectId,
      storeName,
      normalizedFields[field],
    );
  });

  if (hasOwn(normalizedFields, "playerSettings")) {
    transaction.objectStore(PLAYER_SETTINGS_STORE).put({
      ...(normalizedFields.playerSettings || {}),
      projectId,
    });
  }
}

function migrateEmbeddedMaterialData(transaction) {
  if (!transaction?.db?.objectStoreNames.contains(PROJECT_STORE)) return;

  const migratedFieldsByProject = new Map();
  const projectStore = transaction.objectStore(PROJECT_STORE);
  const projectCursorRequest = projectStore.openCursor();

  projectCursorRequest.onsuccess = () => {
    const cursor = projectCursorRequest.result;

    if (cursor) {
      const project = cursor.value;
      const projectId = project?.id;
      const { storedMaterial, normalizedFields } = splitMaterialForStorage(
        project?.material,
      );

      if (projectId) {
        putNormalizedMaterialFieldsDuringUpgrade(
          transaction,
          projectId,
          normalizedFields,
        );
        migratedFieldsByProject.set(
          projectId,
          new Set(Object.keys(normalizedFields)),
        );
      }

      cursor.update({
        ...project,
        material: storedMaterial,
      });
      cursor.continue();
      return;
    }

    if (!transaction.db.objectStoreNames.contains(DRAFT_STORE)) return;

    const draftStore = transaction.objectStore(DRAFT_STORE);
    const draftCursorRequest = draftStore.openCursor();

    draftCursorRequest.onsuccess = () => {
      const draftCursor = draftCursorRequest.result;

      if (!draftCursor) return;

      const draft = draftCursor.value;
      const projectId = draft?.projectId;
      const { storedMaterial, normalizedFields } = splitMaterialForStorage(
        draft?.material,
      );
      const migratedFields = migratedFieldsByProject.get(projectId) || new Set();
      const fallbackFields = Object.fromEntries(
        Object.entries(normalizedFields).filter(
          ([field]) => !migratedFields.has(field),
        ),
      );

      if (projectId) {
        putNormalizedMaterialFieldsDuringUpgrade(
          transaction,
          projectId,
          fallbackFields,
        );
      }

      draftCursor.update({
        ...draft,
        material: storedMaterial,
      });
      draftCursor.continue();
    };
  };
}

function openDatabase(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction;

      ensureDatabaseStores(db, transaction);

      if (event.oldVersion > 0 && event.oldVersion < 3) {
        migrateEmbeddedMaterialData(transaction);
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

        const recordGroups = await Promise.all(
          ALL_STORE_NAMES.map((storeName) =>
            getAllStoreRecords(legacyDb, storeName),
          ),
        );
        const hasRecords = recordGroups.some((records) => records.length > 0);

        if (!hasRecords) continue;

        await new Promise((resolve, reject) => {
          const tx = targetDb.transaction(ALL_STORE_NAMES, "readwrite");

          ALL_STORE_NAMES.forEach((storeName, index) => {
            const targetStore = tx.objectStore(storeName);

            recordGroups[index].forEach((record) => targetStore.put(record));
          });

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

function groupArrayRecordsByProject(records) {
  const grouped = new Map();

  (records || []).forEach((record) => {
    const projectId = record?.projectId;

    if (!projectId) return;

    if (!grouped.has(projectId)) grouped.set(projectId, []);
    grouped.get(projectId).push(record);
  });

  grouped.forEach((items, projectId) => {
    grouped.set(
      projectId,
      [...items]
        .sort(
          (first, second) =>
            Number(first?.orderIndex || 0) - Number(second?.orderIndex || 0),
        )
        .map(stripStoredArrayMetadata),
    );
  });

  return grouped;
}

function createNormalizedMaterialMaps(recordGroups) {
  const maps = {};

  ARRAY_MATERIAL_STORES.forEach(({ field, storeName }) => {
    maps[field] = groupArrayRecordsByProject(recordGroups[storeName] || []);
  });

  maps.playerSettings = new Map(
    (recordGroups[PLAYER_SETTINGS_STORE] || [])
      .filter((record) => record?.projectId)
      .map((record) => [
        record.projectId,
        stripStoredPlayerSettings(record),
      ]),
  );

  return maps;
}

function hydrateMaterial(material, projectId, normalizedMaps) {
  const source = isPlainObject(material) ? material : {};
  const hydrated = { ...source };

  ARRAY_MATERIAL_STORES.forEach(({ field }) => {
    if (normalizedMaps[field]?.has(projectId)) {
      hydrated[field] = normalizedMaps[field].get(projectId);
      return;
    }

    hydrated[field] = Array.isArray(source[field]) ? source[field] : [];
  });

  if (normalizedMaps.playerSettings?.has(projectId)) {
    hydrated.playerSettings = normalizedMaps.playerSettings.get(projectId);
  } else {
    hydrated.playerSettings = isPlainObject(source.playerSettings)
      ? source.playerSettings
      : {};
  }

  return hydrated;
}

async function readNormalizedMaterialMaps(db) {
  const recordEntries = await Promise.all(
    NORMALIZED_STORE_NAMES.map(async (storeName) => [
      storeName,
      await getAllStoreRecords(db, storeName),
    ]),
  );

  return createNormalizedMaterialMaps(Object.fromEntries(recordEntries));
}

async function readNormalizedMaterialMapsForProject(db, projectId) {
  const tx = db.transaction(NORMALIZED_STORE_NAMES, "readonly");
  const recordEntries = await Promise.all([
    ...ARRAY_MATERIAL_STORES.map(async ({ storeName }) => {
      const store = tx.objectStore(storeName);
      const records = await new Promise((resolve, reject) => {
        const request = store.index(PROJECT_ID_INDEX).getAll(projectId);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });

      return [storeName, records];
    }),
    new Promise((resolve, reject) => {
      const request = tx.objectStore(PLAYER_SETTINGS_STORE).get(projectId);

      request.onsuccess = () =>
        resolve([
          PLAYER_SETTINGS_STORE,
          request.result ? [request.result] : [],
        ]);
      request.onerror = () => reject(request.error);
    }),
  ]);

  return createNormalizedMaterialMaps(Object.fromEntries(recordEntries));
}

function saveProjectRecord(db, project, file) {
  const { normalizedFields } = splitMaterialForStorage(project?.material);
  const storedProject = stripProjectForStorage(project);
  const transactionStores = [PROJECT_STORE, ...NORMALIZED_STORE_NAMES];

  if (file) transactionStores.push(FILE_STORE);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(transactionStores, "readwrite");

    tx.objectStore(PROJECT_STORE).put(storedProject);
    persistNormalizedMaterialFields(tx, project.id, normalizedFields);

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
    tx.onabort = () => reject(tx.error || new Error("Project save aborted"));
  });
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
      title: name || "Materi 3D Baru",
      description: "",
      version: "1.0.0",
      author: "",
      thumbnail: "",
      availableOnMarketplace: false,
      modelUrl: "",
      chapters: [],
      flows: [],
      objectNameOverrides: [],
      playerSettings: normalizePlayerSettings(),
      procedures: [],
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
  if (!project?.id) {
    throw new Error("Project ID is required to save IndexedDB data.");
  }

  const db = await openViqubedDb();
  const savedProject = await saveProjectRecord(db, project, file);

  upsertProjectCatalogCache(savedProject);
  return savedProject;
}

export async function updateProjectInIndexedDb(projectId, patch = {}) {
  const db = await openViqubedDb();
  const oldProject = await getStoreRecord(db, PROJECT_STORE, projectId);

  if (!oldProject) return null;

  const updatedProject = {
    ...oldProject,
    ...patch,
    metadata: {
      ...oldProject.metadata,
      ...(patch.metadata || {}),
      updatedAt: new Date().toISOString(),
    },
  };

  await saveProjectRecord(db, updatedProject);
  upsertProjectCatalogCache(updatedProject);
  return updatedProject;
}

export async function saveProjectDraftToIndexedDb(projectId, draft) {
  const db = await openViqubedDb();
  const savedAt = new Date().toISOString();
  const { normalizedFields } = splitMaterialForStorage(draft?.material);
  const storedDraft = stripDraftForStorage(projectId, draft, savedAt);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [DRAFT_STORE, ...NORMALIZED_STORE_NAMES],
      "readwrite",
    );

    tx.objectStore(DRAFT_STORE).put(storedDraft);
    persistNormalizedMaterialFields(tx, projectId, normalizedFields);

    tx.oncomplete = () =>
      resolve({
        ...(isPlainObject(draft) ? draft : {}),
        projectId,
        savedAt,
      });
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Draft save aborted"));
  });
}

export async function getProjectDraftFromIndexedDb(
  projectId,
  { mode = "full" } = {},
) {
  const db = await openViqubedDb();
  const [draft, normalizedMaps] = await Promise.all([
    getStoreRecord(db, DRAFT_STORE, projectId),
    readNormalizedMaterialMapsForProject(db, projectId, mode),
  ]);

  if (!draft) return null;

  return {
    ...draft,
    material: hydrateMaterial(draft.material, projectId, normalizedMaps),
  };
}

export async function getProjectSummariesFromIndexedDb() {
  const db = await openViqubedDb();
  const storedProjects = await getAllStoreRecords(db, PROJECT_STORE);
  const summaries = sortProjectsByRecent(
    storedProjects.map((project) => createProjectSummary(project)).filter(Boolean),
  );

  writeProjectCatalogCache(summaries);
  return summaries;
}

export async function getAllProjectsFromIndexedDb() {
  const db = await openViqubedDb();
  const [storedProjects, normalizedMaps] = await Promise.all([
    getAllStoreRecords(db, PROJECT_STORE),
    readNormalizedMaterialMaps(db, "full"),
  ]);
  const projects = storedProjects.map((project) => ({
    ...project,
    material: hydrateMaterial(project.material, project.id, normalizedMaps),
  }));

  return sortProjectsByRecent(projects);
}

export async function getProjectFromIndexedDb(
  projectId,
  { mode = "full" } = {},
) {
  const db = await openViqubedDb();
  const [storedProject, normalizedMaps] = await Promise.all([
    getStoreRecord(db, PROJECT_STORE, projectId),
    readNormalizedMaterialMapsForProject(db, projectId, mode),
  ]);

  if (!storedProject) return null;

  return {
    ...storedProject,
    material: hydrateMaterial(
      storedProject.material,
      storedProject.id,
      normalizedMaps,
    ),
  };
}

export function getChapterFromIndexedDb(projectId, chapterId) {
  return getMaterialRecordFromIndexedDb(projectId, CHAPTER_STORE, chapterId);
}

export function getFlowFromIndexedDb(projectId, flowId) {
  return getMaterialRecordFromIndexedDb(projectId, FLOW_STORE, flowId);
}

export function getProcedureFromIndexedDb(projectId, procedureId) {
  return getMaterialRecordFromIndexedDb(
    projectId,
    PROCEDURE_STORE,
    procedureId,
  );
}

export async function hydrateMaterialFromIndexedDb(projectId, material) {
  if (!projectId || !isPlainObject(material)) return material;

  const hydrateRecords = async (field, getter) => {
    const records = Array.isArray(material[field]) ? material[field] : [];

    return Promise.all(
      records.map(async (record) => {
        if (!isLazyMaterialRecord(record, field)) return record;

        return (await getter(projectId, record.id)) || record;
      }),
    );
  };

  const [chapters, flows, procedures] = await Promise.all([
    hydrateRecords("chapters", getChapterFromIndexedDb),
    hydrateRecords("flows", getFlowFromIndexedDb),
    hydrateRecords("procedures", getProcedureFromIndexedDb),
  ]);

  return {
    ...material,
    chapters,
    flows,
    procedures,
  };
}

export async function getProjectFileFromIndexedDb(projectId) {
  const db = await openViqubedDb();
  return getStoreRecord(db, FILE_STORE, projectId);
}

function deleteArrayRowsByProject(transaction, projectId, storeName) {
  const store = transaction.objectStore(storeName);
  const index = store.index(PROJECT_ID_INDEX);
  const cursorRequest = index.openKeyCursor(IDBKeyRange.only(projectId));

  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;

    if (cursor) {
      store.delete(cursor.primaryKey);
      cursor.continue();
    }
  };
}

export async function deleteProjectFromIndexedDb(projectId) {
  if (!projectId) return;

  const db = await openViqubedDb();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(ALL_STORE_NAMES, "readwrite");

    tx.objectStore(PROJECT_STORE).delete(projectId);
    tx.objectStore(FILE_STORE).delete(projectId);
    tx.objectStore(DRAFT_STORE).delete(projectId);
    tx.objectStore(PLAYER_SETTINGS_STORE).delete(projectId);

    ARRAY_MATERIAL_STORES.forEach(({ storeName }) => {
      deleteArrayRowsByProject(tx, projectId, storeName);
    });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Project delete aborted"));
  });

  removeProjectFromCatalogCache(projectId);
}

export async function clearViqubedIndexedDb() {
  const db = await openViqubedDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALL_STORE_NAMES, "readwrite");

    ALL_STORE_NAMES.forEach((storeName) => {
      tx.objectStore(storeName).clear();
    });

    tx.oncomplete = () => {
      clearProjectCatalogCache();
      resolve(true);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Database clear aborted"));
  });
}
