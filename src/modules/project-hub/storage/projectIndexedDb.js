import { createId } from "../../../utils/createId";
import { normalizePlayerSettings } from "../../material/playerSettings";
import { normalizeProToolsSettings } from "../../../engine/project/ProToolsSettings";
import { isLazyMaterialRecord } from "../../../engine/project/LazyMaterialRecords";
import {
  ADDITIONAL_MODEL_FILE_STORE,
  ALL_STORE_NAMES,
  ANIMATION_STORE,
  CHAPTER_STORE,
  DRAFT_STORE,
  FILE_STORE,
  FLOW_STORE,
  NORMALIZED_STORE_NAMES,
  PROCEDURE_STORE,
  PROJECT_ID_INDEX,
  QUIZ_STORE,
  SLIDE_STORE,
  PROJECT_STORE,
} from "./indexed-db/constants";
import { isPlainObject } from "./indexed-db/common";
import {
  clearProjectCatalogCache,
  createProjectSummary,
  getCachedProjectSummaries,
  removeProjectCatalogCache,
  sortProjectsByRecent,
  upsertProjectCatalogCache,
  writeProjectCatalogCache,
} from "./indexed-db/catalogCache";
import {
  getAllStoreRecords,
  getStoreRecord,
  getStoreRecordsByProject,
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

import { DEFAULT_VIEWER_GRID } from "../../../engine/viewer";
export { getCachedProjectSummaries };

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
      title: "Materi 3D Baru",
      description: "",
      version: "1.0.0",
      author: "",
      thumbnail: "",
      availableOnMarketplace: false,
      modelUrl: "",
      additionalModels: [],
      modelLicenses: [],
      chapters: [],
      flows: [],
      authoredAnimations: [],
      objectNameOverrides: [],
      playerSettings: normalizePlayerSettings(),
      proToolsSettings: normalizeProToolsSettings(),
      procedures: [],
      quizzes: [],
      slides: [],
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
      grid: { ...DEFAULT_VIEWER_GRID },
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

export function getAuthoredAnimationFromIndexedDb(projectId, animationId) {
  return getMaterialRecordFromIndexedDb(
    projectId,
    ANIMATION_STORE,
    animationId,
  );
}

export function getProcedureFromIndexedDb(projectId, procedureId) {
  return getMaterialRecordFromIndexedDb(
    projectId,
    PROCEDURE_STORE,
    procedureId,
  );
}

export function getQuizFromIndexedDb(projectId, quizId) {
  return getMaterialRecordFromIndexedDb(projectId, QUIZ_STORE, quizId);
}

export function getSlideFromIndexedDb(projectId, slideId) {
  return getMaterialRecordFromIndexedDb(projectId, SLIDE_STORE, slideId);
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

  const [chapters, flows, authoredAnimations, procedures, quizzes, slides] = await Promise.all([
    hydrateRecords("chapters", getChapterFromIndexedDb),
    hydrateRecords("flows", getFlowFromIndexedDb),
    hydrateRecords("authoredAnimations", getAuthoredAnimationFromIndexedDb),
    hydrateRecords("procedures", getProcedureFromIndexedDb),
    hydrateRecords("quizzes", getQuizFromIndexedDb),
    hydrateRecords("slides", getSlideFromIndexedDb),
  ]);

  return {
    ...material,
    chapters,
    flows,
    authoredAnimations,
    procedures,
    quizzes,
    slides,
  };
}

export async function getProjectFileFromIndexedDb(projectId) {
  const db = await openViqubedDb();
  return getStoreRecord(db, FILE_STORE, projectId);
}

function deleteProjectScopedRecords(store, projectId) {
  if (!store || !projectId) return;

  if (store.keyPath === PROJECT_ID_INDEX) {
    store.delete(projectId);
    return;
  }

  if (store.indexNames.contains(PROJECT_ID_INDEX)) {
    const request = store.index(PROJECT_ID_INDEX).openKeyCursor(projectId);

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;

      store.delete(cursor.primaryKey);
      cursor.continue();
    };
    return;
  }

  const request = store.openCursor();
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;

    if (cursor.value?.projectId === projectId) {
      cursor.delete();
    }
    cursor.continue();
  };
}

export async function deleteProjectFromIndexedDb(projectId) {
  if (!projectId) {
    throw new Error("Project ID is required to delete IndexedDB data.");
  }

  const db = await openViqubedDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALL_STORE_NAMES, "readwrite");

    tx.objectStore(PROJECT_STORE).delete(projectId);

    ALL_STORE_NAMES.forEach((storeName) => {
      if (storeName === PROJECT_STORE) return;
      deleteProjectScopedRecords(tx.objectStore(storeName), projectId);
    });

    tx.oncomplete = () => {
      removeProjectCatalogCache(projectId);
      resolve(true);
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () =>
      reject(tx.error || new Error("Project delete aborted"));
  });
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

export async function saveAdditionalProjectModelFile(projectId, modelId, file) {
  if (!projectId || !modelId || !(file instanceof Blob)) {
    throw new Error("Project ID, model ID, and GLB file are required.");
  }

  const db = await openViqubedDb();
  const storageId = `${projectId}::additional-model::${modelId}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ADDITIONAL_MODEL_FILE_STORE, "readwrite");
    const record = {
      storageId,
      projectId,
      modelId,
      fileName: file.name || `${modelId}.glb`,
      fileType: file.type || "model/gltf-binary",
      fileSize: Number(file.size || 0),
      blob: file,
      savedAt: new Date().toISOString(),
    };

    tx.objectStore(ADDITIONAL_MODEL_FILE_STORE).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Additional GLB save aborted"));
  });
}

export async function getAdditionalProjectModelFilesFromIndexedDb(projectId) {
  if (!projectId) return [];
  const db = await openViqubedDb();
  return getStoreRecordsByProject(db, ADDITIONAL_MODEL_FILE_STORE, projectId);
}

export async function deleteAdditionalProjectModelFile(projectId, modelId) {
  if (!projectId || !modelId) return false;
  const db = await openViqubedDb();
  const storageId = `${projectId}::additional-model::${modelId}`;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(ADDITIONAL_MODEL_FILE_STORE, "readwrite");
    tx.objectStore(ADDITIONAL_MODEL_FILE_STORE).delete(storageId);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Additional GLB delete aborted"));
  });
}

