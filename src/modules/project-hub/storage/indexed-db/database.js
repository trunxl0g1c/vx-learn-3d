import {
  ALL_STORE_NAMES,
  ANIMATION_STORE,
  CHAPTER_STORE,
  DB_NAME,
  DB_VERSION,
  DRAFT_STORE,
  FILE_STORE,
  FLOW_STORE,
  LAZY_ARRAY_STORE_NAMES,
  LEGACY_DB_NAMES,
  MIGRATION_KEY,
  OBJECT_NAME_OVERRIDE_STORE,
  PLAYER_SETTINGS_STORE,
  PROCEDURE_STORE,
  QUIZ_STORE,
  SLIDE_STORE,
  PROJECT_ENTITY_INDEX,
  PROJECT_ID_INDEX,
  PROJECT_STORE,
} from "./constants";
import {
  putNormalizedMaterialFieldsDuringUpgrade,
  splitMaterialForStorage,
} from "./materialSerialization";

let databasePromise = null;
let migrationPromise = null;

function createArrayStore(db, transaction, storeName) {
  const store = db.objectStoreNames.contains(storeName)
    ? transaction.objectStore(storeName)
    : db.createObjectStore(storeName, { keyPath: "storageId" });

  if (!store.indexNames.contains(PROJECT_ID_INDEX)) {
    store.createIndex(PROJECT_ID_INDEX, "projectId", { unique: false });
  }

  if (
    LAZY_ARRAY_STORE_NAMES.has(storeName) &&
    !store.indexNames.contains(PROJECT_ENTITY_INDEX)
  ) {
    store.createIndex(PROJECT_ENTITY_INDEX, ["projectId", "id"], {
      unique: false,
    });
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
  createArrayStore(db, transaction, ANIMATION_STORE);
  createArrayStore(db, transaction, OBJECT_NAME_OVERRIDE_STORE);
  createArrayStore(db, transaction, PROCEDURE_STORE);
  createArrayStore(db, transaction, QUIZ_STORE);
  createArrayStore(db, transaction, SLIDE_STORE);

  if (!db.objectStoreNames.contains(PLAYER_SETTINGS_STORE)) {
    db.createObjectStore(PLAYER_SETTINGS_STORE, { keyPath: "projectId" });
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
    let settled = false;
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction;

      ensureDatabaseStores(db, transaction);

      if (event.oldVersion > 0 && event.oldVersion < 3) {
        migrateEmbeddedMaterialData(transaction);
      }

      // Legacy rows stay readable in place and are converted only after a
      // successful load/save. This preserves structured-clone payloads.
    };

    request.onsuccess = () => {
      const db = request.result;

      if (settled) {
        db.close();
        return;
      }

      settled = true;
      db.onversionchange = () => {
        db.close();
        databasePromise = null;
        migrationPromise = null;
      };

      resolve(db);
    };
    request.onblocked = () => {
      if (settled) return;

      settled = true;
      reject(
        new Error(
          "Upgrade IndexedDB tertahan oleh tab Viqubed lain. Tutup tab Viqubed lain lalu buka ulang project.",
        ),
      );
    };
    request.onerror = () => {
      if (settled) return;

      settled = true;
      reject(request.error);
    };
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

export function getAllStoreRecords(db, storeName) {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export function getStoreRecord(db, storeName, key) {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export function getStoreRecordsByProject(db, storeName, projectId) {
  if (!db.objectStoreNames.contains(storeName)) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.indexNames.contains(PROJECT_ID_INDEX)
      ? store.index(PROJECT_ID_INDEX).getAll(projectId)
      : store.getAll();

    request.onsuccess = () => {
      const records = request.result || [];

      resolve(
        store.indexNames.contains(PROJECT_ID_INDEX)
          ? records
          : records.filter((record) => record?.projectId === projectId),
      );
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getStoreRecordsByProjectSafely(
  db,
  storeName,
  projectId,
) {
  try {
    return await getStoreRecordsByProject(db, storeName, projectId);
  } catch (error) {
    console.warn(`Unable to read ${storeName} for project ${projectId}`, error);
    return [];
  }
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

export function openViqubedDb() {
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
