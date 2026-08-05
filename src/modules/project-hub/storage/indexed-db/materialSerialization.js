import { createId } from "../../../../utils/createId";
import {
  getLazyMaterialRecordMeta,
  markLazyMaterialRecord,
} from "../../../../engine/project/LazyMaterialRecords";
import {
  ARRAY_MATERIAL_STORES,
  CHAPTER_STORE,
  FLOW_STORE,
  LAZY_ARRAY_STORE_NAMES,
  LAZY_PAYLOAD_TYPE,
  LAZY_PAYLOAD_VERSION,
  PLAYER_SETTINGS_STORE,
  PROCEDURE_STORE,
  PROJECT_ID_INDEX,
} from "./constants";
import { hasOwn, isPlainObject } from "./common";

function createStorageId(projectId, storeName, item, index) {
  const itemId =
    String(item?.id || item?.uuid || item?.name || "").trim() || "item";

  return `${projectId}::${storeName}::${itemId}::${index}`;
}

function getArrayItemCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function normalizeStoredProcedureType(value) {
  return value === "assembly" || value === "disassembly"
    ? "assembly"
    : "guided";
}

function getLazyAwareCount(item, arrayField, countField) {
  const storedCount = Number(item?.[countField]);

  if (
    getLazyMaterialRecordMeta(item) &&
    Number.isFinite(storedCount) &&
    storedCount >= 0
  ) {
    return storedCount;
  }

  return getArrayItemCount(item?.[arrayField]);
}

function createLazyRecordSummary(storeName, item, record = null) {
  const fallbackEntityId =
    String(record?.storageId || item?.storageId || "").trim() || null;

  if (storeName === CHAPTER_STORE) {
    return {
      id: item?.id || item?.uuid || fallbackEntityId,
      title: item?.title || "Untitled Chapter",
      description: item?.description || "",
      objectName: item?.objectName || null,
      objectUuid: item?.objectUuid || item?.objectUUID || null,
      objectPath: Array.isArray(item?.objectPath) ? item.objectPath : null,
      enabled: item?.enabled !== false,
      markerCount: getLazyAwareCount(item, "markers", "markerCount"),
      parameterCount: getLazyAwareCount(
        item,
        "parameters",
        "parameterCount",
      ),
      cameraViewCount: getLazyMaterialRecordMeta(item)
        ? Number(item?.cameraViewCount || 0)
        : Math.max(
            getArrayItemCount(item?.cameraViews),
            item?.cameraView ? 1 : 0,
          ),
      mediaCount: getLazyAwareCount(item, "media", "mediaCount"),
      animationCount: getLazyAwareCount(
        item,
        "animations",
        "animationCount",
      ),
      flowAssignmentCount: getLazyAwareCount(
        item,
        "flows",
        "flowAssignmentCount",
      ),
    };
  }

  if (storeName === FLOW_STORE) {
    return {
      id: item?.id || item?.uuid || fallbackEntityId,
      name: item?.name || "Untitled Flow",
      description: item?.description || "",
      enabled: item?.enabled !== false,
      settings: isPlainObject(item?.settings) ? item.settings : {},
      pointCount: getLazyAwareCount(item, "points", "pointCount"),
      hasVisualState: getLazyMaterialRecordMeta(item)
        ? Boolean(item?.hasVisualState)
        : Boolean(item?.visualState),
      hasCameraView: getLazyMaterialRecordMeta(item)
        ? Boolean(item?.hasCameraView)
        : Boolean(item?.cameraView),
      createdAt: item?.createdAt || null,
      updatedAt: item?.updatedAt || null,
    };
  }

  if (storeName === PROCEDURE_STORE) {
    return {
      id: item?.id || item?.uuid || fallbackEntityId,
      name: item?.name || "Untitled Procedure",
      description: item?.description || "",
      type: normalizeStoredProcedureType(item?.type),
      enabled: item?.enabled !== false,
      settings: isPlainObject(item?.settings) ? item.settings : {},
      stepCount: getLazyAwareCount(item, "steps", "stepCount"),
      createdAt: item?.createdAt || null,
      updatedAt: item?.updatedAt || null,
    };
  }

  return isPlainObject(item) ? { ...item } : { value: item };
}

function isJsonPayloadSafe(value, seen = new WeakSet()) {
  if (value === null) return true;

  const valueType = typeof value;

  if (valueType === "string" || valueType === "boolean") return true;
  if (valueType === "number") return Number.isFinite(value);
  if (valueType !== "object") return false;

  if (
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof Map ||
    value instanceof Set
  ) {
    return false;
  }

  if (value instanceof Date) {
    return Number.isFinite(value.getTime());
  }

  if (seen.has(value)) return false;
  seen.add(value);

  const entries = Array.isArray(value)
    ? value.map((item, index) => [index, item])
    : Object.entries(value);
  const isSafe = entries.every(([, item]) => isJsonPayloadSafe(item, seen));

  seen.delete(value);
  return isSafe;
}

function createPayloadBlob(item) {
  if (!isJsonPayloadSafe(item)) return null;

  try {
    const serialized = JSON.stringify(item);

    if (typeof serialized !== "string") return null;

    return new Blob([serialized], {
      type: LAZY_PAYLOAD_TYPE,
    });
  } catch {
    return null;
  }
}

function createLazyPayloadStorage(metadata, item) {
  if (metadata?.payloadBlob instanceof Blob) {
    return { payloadBlob: metadata.payloadBlob };
  }

  if (hasOwn(metadata, "payloadData")) {
    return { payloadData: metadata.payloadData };
  }

  if (hasOwn(metadata, "legacyRecord")) {
    const legacyBlob = createPayloadBlob(metadata.legacyRecord);

    return legacyBlob
      ? { payloadBlob: legacyBlob }
      : { payloadData: metadata.legacyRecord };
  }

  const payloadBlob = createPayloadBlob(item);

  return payloadBlob ? { payloadBlob } : { payloadData: item };
}

function mergeLazySummaryIntoPayload(storeName, payload, summary) {
  const sourcePayload = isPlainObject(payload) ? payload : {};

  if (storeName === CHAPTER_STORE) {
    return {
      ...sourcePayload,
      id: summary?.id || sourcePayload.id || null,
      title: summary?.title || sourcePayload.title || "Untitled Chapter",
      description: summary?.description ?? sourcePayload.description ?? "",
      objectName: summary?.objectName ?? sourcePayload.objectName ?? null,
      objectUuid: summary?.objectUuid ?? sourcePayload.objectUuid ?? null,
      objectPath: Array.isArray(summary?.objectPath)
        ? summary.objectPath
        : sourcePayload.objectPath,
      enabled: summary?.enabled !== false,
    };
  }

  if (storeName === FLOW_STORE) {
    return {
      ...sourcePayload,
      id: summary?.id || sourcePayload.id || null,
      name: summary?.name || sourcePayload.name || "Untitled Flow",
      description: summary?.description ?? sourcePayload.description ?? "",
      enabled: summary?.enabled !== false,
      settings: isPlainObject(summary?.settings)
        ? summary.settings
        : sourcePayload.settings,
      createdAt: summary?.createdAt || sourcePayload.createdAt || null,
      updatedAt: summary?.updatedAt || sourcePayload.updatedAt || null,
    };
  }

  if (storeName === PROCEDURE_STORE) {
    return {
      ...sourcePayload,
      id: summary?.id || sourcePayload.id || null,
      name: summary?.name || sourcePayload.name || "Untitled Procedure",
      description: summary?.description ?? sourcePayload.description ?? "",
      type: normalizeStoredProcedureType(
        summary?.type || sourcePayload.type,
      ),
      enabled: summary?.enabled !== false,
      settings: isPlainObject(summary?.settings)
        ? summary.settings
        : sourcePayload.settings,
      createdAt: summary?.createdAt || sourcePayload.createdAt || null,
      updatedAt: summary?.updatedAt || sourcePayload.updatedAt || null,
    };
  }

  return sourcePayload;
}

function createLegacyStoredArrayRecord(projectId, storeName, item, index) {
  const sourceItem = isPlainObject(item) ? item : { value: item };
  const isLazyStore = LAZY_ARRAY_STORE_NAMES.has(storeName);
  const existingEntityId = String(
    sourceItem?.id || sourceItem?.uuid || "",
  ).trim();
  const normalizedItem = isLazyStore
    ? {
        ...sourceItem,
        id:
          existingEntityId ||
          createId(
            storeName === PROCEDURE_STORE
              ? "procedure"
              : storeName.slice(0, -1),
          ),
      }
    : sourceItem;

  return {
    ...normalizedItem,
    projectId,
    storageId: createStorageId(
      projectId,
      storeName,
      normalizedItem,
      index,
    ),
    orderIndex: index,
  };
}

function createStoredArrayRecord(projectId, storeName, item, index) {
  const sourceItem = isPlainObject(item) ? item : { value: item };
  const sourceMetadata = getLazyMaterialRecordMeta(sourceItem);
  const isLazyStore = LAZY_ARRAY_STORE_NAMES.has(storeName);
  const existingEntityId = String(
    sourceItem?.id || sourceItem?.uuid || sourceMetadata?.entityId || "",
  ).trim();
  const normalizedItem = isLazyStore
    ? {
        ...sourceItem,
        id:
          existingEntityId ||
          createId(
            storeName === PROCEDURE_STORE
              ? "procedure"
              : storeName.slice(0, -1),
          ),
      }
    : sourceItem;
  const lazyMetadata = getLazyMaterialRecordMeta(normalizedItem);
  const canReuseStorageId =
    lazyMetadata?.projectId === projectId && lazyMetadata?.storageId;
  const storageId = canReuseStorageId
    ? lazyMetadata.storageId
    : createStorageId(projectId, storeName, normalizedItem, index);

  if (isLazyStore) {
    const payloadStorage = createLazyPayloadStorage(
      lazyMetadata,
      normalizedItem,
    );

    return {
      ...createLazyRecordSummary(storeName, normalizedItem, { storageId }),
      projectId,
      storageId,
      orderIndex: index,
      payloadVersion: LAZY_PAYLOAD_VERSION,
      ...payloadStorage,
    };
  }

  return {
    ...normalizedItem,
    projectId,
    storageId,
    orderIndex: index,
  };
}

function stripRecordStorageMetadata(record) {
  if (!isPlainObject(record)) return record;

  const {
    storageId: _storageId,
    projectId: _projectId,
    orderIndex: _orderIndex,
    payloadVersion: _payloadVersion,
    payloadBlob: _payloadBlob,
    payloadData: _payloadData,
    ...item
  } = record;

  return item;
}

export async function readStoredArrayRecord(record, storeName, mode = "full") {
  if (!isPlainObject(record)) return record;

  if (!LAZY_ARRAY_STORE_NAMES.has(storeName)) {
    const item = stripRecordStorageMetadata(record);

    if (Object.keys(item).length === 1 && hasOwn(item, "value")) {
      return item.value;
    }

    return item;
  }

  const strippedItem = stripRecordStorageMetadata(record);
  const stableEntityId =
    strippedItem?.id || strippedItem?.uuid || record.storageId || null;
  const fallbackItem = stableEntityId
    ? { ...strippedItem, id: stableEntityId }
    : strippedItem;
  const payloadBlob = record.payloadBlob;
  const hasPayloadData = hasOwn(record, "payloadData");

  if (mode === "summary") {
    const summary = createLazyRecordSummary(storeName, fallbackItem, record);
    const metadata = {
      type: storeName,
      entityId: summary?.id || stableEntityId,
      storageId: record.storageId,
      projectId: record.projectId,
    };

    if (payloadBlob instanceof Blob) {
      metadata.payloadBlob = payloadBlob;
    } else if (hasPayloadData) {
      metadata.payloadData = record.payloadData;
    } else {
      metadata.legacyRecord = fallbackItem;
    }

    return markLazyMaterialRecord(summary, metadata);
  }

  if (payloadBlob instanceof Blob) {
    try {
      const payloadText = await payloadBlob.text();
      const payload = payloadText ? JSON.parse(payloadText) : null;

      if (payload && typeof payload === "object") {
        return mergeLazySummaryIntoPayload(
          storeName,
          payload,
          fallbackItem,
        );
      }
    } catch (error) {
      console.warn(`Unable to read ${storeName} payload`, error);
    }
  }

  if (hasPayloadData && record.payloadData != null) {
    return mergeLazySummaryIntoPayload(
      storeName,
      record.payloadData,
      fallbackItem,
    );
  }

  return fallbackItem;
}

export function stripStoredPlayerSettings(record) {
  if (!isPlainObject(record)) return null;

  const { projectId: _projectId, ...settings } = record;
  return settings;
}

export function splitMaterialForStorage(material) {
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

export function stripProjectForStorage(project) {
  if (!isPlainObject(project)) return project;

  const { storedMaterial } = splitMaterialForStorage(project.material);

  return {
    ...project,
    material: storedMaterial,
  };
}

export function stripDraftForStorage(projectId, draft, savedAt) {
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

export function persistNormalizedMaterialFields(
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

export function putNormalizedMaterialFieldsDuringUpgrade(
  transaction,
  projectId,
  normalizedFields,
) {
  ARRAY_MATERIAL_STORES.forEach(({ field, storeName }) => {
    if (!hasOwn(normalizedFields, field)) return;

    const store = transaction.objectStore(storeName);

    (Array.isArray(normalizedFields[field])
      ? normalizedFields[field]
      : []
    ).forEach((item, index) => {
      store.put(
        createLegacyStoredArrayRecord(
          projectId,
          storeName,
          item,
          index,
        ),
      );
    });
  });

  if (hasOwn(normalizedFields, "playerSettings")) {
    transaction.objectStore(PLAYER_SETTINGS_STORE).put({
      ...(normalizedFields.playerSettings || {}),
      projectId,
    });
  }
}
