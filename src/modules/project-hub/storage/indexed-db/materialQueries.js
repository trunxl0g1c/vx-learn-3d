import {
  ARRAY_MATERIAL_STORES,
  LAZY_ARRAY_STORE_NAMES,
  NORMALIZED_STORE_NAMES,
  PLAYER_SETTINGS_STORE,
  PROJECT_ENTITY_INDEX,
} from "./constants";
import { isPlainObject } from "./common";
import {
  getAllStoreRecords,
  getStoreRecord,
  getStoreRecordsByProjectSafely,
  openViqubedDb,
} from "./database";
import {
  readStoredArrayRecord,
  stripStoredPlayerSettings,
} from "./materialSerialization";

async function groupArrayRecordsByProject(
  records,
  storeName,
  mode = "full",
) {
  const groupedRecords = new Map();

  (records || []).forEach((record) => {
    const projectId = record?.projectId;

    if (!projectId) return;
    if (!groupedRecords.has(projectId)) groupedRecords.set(projectId, []);
    groupedRecords.get(projectId).push(record);
  });

  const groupedItems = new Map();

  await Promise.all(
    [...groupedRecords.entries()].map(async ([projectId, items]) => {
      const sortedItems = [...items].sort(
        (first, second) =>
          Number(first?.orderIndex || 0) - Number(second?.orderIndex || 0),
      );
      const materialItems = await Promise.all(
        sortedItems.map((record) =>
          readStoredArrayRecord(record, storeName, mode),
        ),
      );

      groupedItems.set(projectId, materialItems);
    }),
  );

  return groupedItems;
}

async function createNormalizedMaterialMaps(recordGroups, mode = "full") {
  const maps = {};

  await Promise.all(
    ARRAY_MATERIAL_STORES.map(async ({ field, storeName }) => {
      maps[field] = await groupArrayRecordsByProject(
        recordGroups[storeName] || [],
        storeName,
        mode,
      );
    }),
  );

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

export function hydrateMaterial(material, projectId, normalizedMaps) {
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

export async function readNormalizedMaterialMaps(db, mode = "full") {
  const recordEntries = await Promise.all(
    NORMALIZED_STORE_NAMES.map(async (storeName) => [
      storeName,
      await getAllStoreRecords(db, storeName),
    ]),
  );

  return createNormalizedMaterialMaps(Object.fromEntries(recordEntries), mode);
}

export async function readNormalizedMaterialMapsForProject(
  db,
  projectId,
  mode = "full",
) {
  const recordEntries = await Promise.all([
    ...ARRAY_MATERIAL_STORES.map(async ({ storeName }) => [
      storeName,
      await getStoreRecordsByProjectSafely(db, storeName, projectId),
    ]),
    (async () => {
      try {
        const record = await getStoreRecord(
          db,
          PLAYER_SETTINGS_STORE,
          projectId,
        );

        return [PLAYER_SETTINGS_STORE, record ? [record] : []];
      } catch (error) {
        console.warn(
          `Unable to read ${PLAYER_SETTINGS_STORE} for project ${projectId}`,
          error,
        );
        return [PLAYER_SETTINGS_STORE, []];
      }
    })(),
  ]);

  return createNormalizedMaterialMaps(Object.fromEntries(recordEntries), mode);
}

function readWithRequest(db, storeName, createRequest) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    let request = null;

    try {
      request = createRequest(store);
    } catch (error) {
      reject(error);
      return;
    }

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getMaterialRecordFromIndexedDb(
  projectId,
  storeName,
  recordId,
) {
  if (!projectId || !recordId || !LAZY_ARRAY_STORE_NAMES.has(storeName)) {
    return null;
  }

  const db = await openViqubedDb();

  if (!db.objectStoreNames.contains(storeName)) return null;

  let record = null;

  try {
    record = await readWithRequest(db, storeName, (store) => {
      if (!store.indexNames.contains(PROJECT_ENTITY_INDEX)) {
        throw new Error(`${PROJECT_ENTITY_INDEX} index is unavailable`);
      }

      return store.index(PROJECT_ENTITY_INDEX).get([projectId, recordId]);
    });
  } catch {
    // Version 3 rows may not yet have the compound entity index populated.
  }

  if (!record) {
    try {
      record = await readWithRequest(db, storeName, (store) =>
        store.get(recordId),
      );
    } catch {
      // recordId is usually an entity id, but legacy summaries may use storageId.
    }
  }

  if (!record) {
    const records = await getStoreRecordsByProjectSafely(
      db,
      storeName,
      projectId,
    );

    record =
      records.find((item) => {
        const stableId = item?.id || item?.uuid || item?.storageId;
        return stableId === recordId;
      }) || null;
  }

  return record ? readStoredArrayRecord(record, storeName, "full") : null;
}
