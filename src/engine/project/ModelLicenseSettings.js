export const PRIMARY_MODEL_ASSET_ID = "primary";

const EMPTY_LICENSE_ENTRY = Object.freeze({
  modelAssetId: "",
  modelName: "",
  creatorName: "",
  license: "",
  sourceUrl: "",
  metadataDetected: false,
  metadataCopyright: "",
  metadataGenerator: "",
  metadataReadAt: null,
});

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function preserveEditableText(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getFallbackModelName(fileName = "") {
  const source = cleanText(fileName).split(/[?#]/)[0];
  const lastSegment = source.split(/[\/]/).filter(Boolean).pop() || source;
  return lastSegment.replace(/\.glb$/i, "") || lastSegment || "3D Model";
}

export function normalizeModelSourceUrl(value) {
  const source = cleanText(value);
  if (!source) return "";

  try {
    const candidate = /^https?:\/\//i.test(source)
      ? source
      : /^(www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(source)
        ? `https://${source.replace(/^www\./i, "www.")}`
        : "";

    if (!candidate) return "";
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

export function normalizeModelLicenseEntry(entry = {}, fallback = {}) {
  const source = entry && typeof entry === "object" ? entry : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};

  return {
    ...EMPTY_LICENSE_ENTRY,
    ...base,
    ...source,
    modelAssetId: cleanText(source.modelAssetId || base.modelAssetId),
    // Keep user-entered whitespace while editing. Trimming here would remove a
    // just-typed trailing space on every keystroke, making multi-word fields
    // such as creator/license/model name impossible to type naturally.
    modelName: preserveEditableText(source.modelName ?? base.modelName),
    creatorName: preserveEditableText(source.creatorName ?? base.creatorName),
    license: preserveEditableText(source.license ?? base.license),
    sourceUrl: preserveEditableText(source.sourceUrl ?? base.sourceUrl),
    metadataDetected: source.metadataDetected === true || base.metadataDetected === true,
    metadataCopyright: cleanText(
      source.metadataCopyright ?? base.metadataCopyright,
    ),
    metadataGenerator: cleanText(
      source.metadataGenerator ?? base.metadataGenerator,
    ),
    metadataReadAt:
      source.metadataReadAt || base.metadataReadAt || null,
  };
}

export function normalizeModelLicenseSettings(entries = []) {
  const source = Array.isArray(entries) ? entries : [];
  const byId = new Map();

  source.forEach((entry) => {
    const normalized = normalizeModelLicenseEntry(entry);
    if (!normalized.modelAssetId) return;
    byId.set(normalized.modelAssetId, normalized);
  });

  return Array.from(byId.values());
}

export function getModelLicenseEntry(entries = [], modelAssetId) {
  const id = cleanText(modelAssetId);
  if (!id) return null;
  return (
    normalizeModelLicenseSettings(entries).find(
      (entry) => entry.modelAssetId === id,
    ) || null
  );
}

export function upsertModelLicenseEntry(entries = [], entry = {}) {
  const normalized = normalizeModelLicenseEntry(entry);
  if (!normalized.modelAssetId) return normalizeModelLicenseSettings(entries);

  const next = normalizeModelLicenseSettings(entries);
  const index = next.findIndex(
    (item) => item.modelAssetId === normalized.modelAssetId,
  );

  if (index >= 0) {
    next[index] = normalizeModelLicenseEntry({
      ...next[index],
      ...entry,
      modelAssetId: normalized.modelAssetId,
    });
  } else {
    next.push(normalized);
  }

  return next;
}

export function removeModelLicenseEntry(entries = [], modelAssetId) {
  const id = cleanText(modelAssetId);
  return normalizeModelLicenseSettings(entries).filter(
    (entry) => entry.modelAssetId !== id,
  );
}

export function mergeDetectedModelLicenses(entries = [], detectedEntries = []) {
  const next = normalizeModelLicenseSettings(entries);
  const knownIds = new Set(next.map((entry) => entry.modelAssetId));

  (Array.isArray(detectedEntries) ? detectedEntries : []).forEach((entry) => {
    const normalized = normalizeModelLicenseEntry(entry);
    if (!normalized.modelAssetId || knownIds.has(normalized.modelAssetId)) return;
    next.push(normalized);
    knownIds.add(normalized.modelAssetId);
  });

  return next;
}

export function createModelLicenseCatalog({
  entries = [],
  primaryFileName = "model.glb",
  additionalModels = [],
  additionalEnabled = true,
} = {}) {
  const normalizedEntries = normalizeModelLicenseSettings(entries);
  const entryById = new Map(
    normalizedEntries.map((entry) => [entry.modelAssetId, entry]),
  );

  const primaryFallbackName = getFallbackModelName(primaryFileName);
  const catalog = [
    normalizeModelLicenseEntry(entryById.get(PRIMARY_MODEL_ASSET_ID), {
      modelAssetId: PRIMARY_MODEL_ASSET_ID,
      modelName: primaryFallbackName,
      // UI-only identity hint. Keep the editable modelName separate from the
      // actual GLB filename so multi-model license selection stays unambiguous.
      fileName: primaryFileName || "model.glb",
      isPrimary: true,
    }),
  ];

  if (additionalEnabled) {
    (Array.isArray(additionalModels) ? additionalModels : []).forEach((model) => {
      const modelAssetId = cleanText(model?.id);
      if (!modelAssetId) return;
      catalog.push(
        normalizeModelLicenseEntry(entryById.get(modelAssetId), {
          modelAssetId,
          modelName:
            cleanText(model?.name) ||
            getFallbackModelName(model?.fileName || "Additional GLB"),
          // fileName is intentionally not persisted as license metadata. It is
          // supplied by the runtime model catalog to identify the GLB selector.
          fileName: cleanText(model?.fileName || model?.name) || "Additional GLB",
          isPrimary: false,
        }),
      );
    });
  }

  return catalog;
}
