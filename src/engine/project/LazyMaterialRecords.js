const LAZY_MATERIAL_RECORD_META = Symbol.for(
  "viqubed.lazy-material-record-meta",
);

export const LAZY_MATERIAL_RECORD_TYPES = Object.freeze({
  CHAPTER: "chapters",
  FLOW: "flows",
  PROCEDURE: "procedures",
});

export function markLazyMaterialRecord(record, metadata = {}) {
  if (!record || typeof record !== "object") return record;

  Object.defineProperty(record, LAZY_MATERIAL_RECORD_META, {
    value: {
      ...metadata,
      type: metadata.type || null,
    },
    enumerable: true,
    configurable: true,
    writable: true,
  });

  return record;
}

export function getLazyMaterialRecordMeta(record) {
  return record?.[LAZY_MATERIAL_RECORD_META] || null;
}

export function isLazyMaterialRecord(record, expectedType = null) {
  const metadata = getLazyMaterialRecordMeta(record);

  if (!metadata) return false;
  return expectedType ? metadata.type === expectedType : true;
}

export function replaceMaterialRecord(records, recordId, hydratedRecord) {
  const source = Array.isArray(records) ? records : [];
  let replaced = false;

  const nextRecords = source.map((record) => {
    if (record?.id !== recordId) return record;

    replaced = true;
    return hydratedRecord;
  });

  return replaced ? nextRecords : [...nextRecords, hydratedRecord];
}
