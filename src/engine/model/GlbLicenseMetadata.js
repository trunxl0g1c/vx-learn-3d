import {
  normalizeModelLicenseEntry,
  normalizeModelSourceUrl,
} from "../project/ModelLicenseSettings";

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK_TYPE = 0x4e4f534a;

function cleanText(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanText(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    if (typeof value["@value"] === "string") return value["@value"].trim();
    if (typeof value.value === "string") return value.value.trim();
    if (typeof value.name === "string") return value.name.trim();
    return "";
  }
  return String(value).trim();
}

function firstText(...values) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return "";
}

function getCaseInsensitive(source, keys = []) {
  if (!source || typeof source !== "object") return undefined;
  const lookup = new Map(
    Object.entries(source).map(([key, value]) => [key.toLowerCase(), value]),
  );

  for (const key of keys) {
    const value = lookup.get(String(key).toLowerCase());
    if (value !== undefined && value !== null) return value;
  }

  return undefined;
}

function getXmpPacket(gltf) {
  const extension = gltf?.extensions?.KHR_xmp_json_ld;
  const packets = Array.isArray(extension?.packets) ? extension.packets : [];
  const packetIndex = gltf?.asset?.extensions?.KHR_xmp_json_ld?.packet;

  if (Number.isInteger(packetIndex) && packets[packetIndex]) {
    return packets[packetIndex];
  }

  return packets[0] || null;
}

function fileNameWithoutExtension(fileName = "") {
  const normalized = cleanText(fileName);
  return normalized.replace(/\.glb$/i, "") || normalized;
}

export async function readGlbJsonFromBlob(blob) {
  if (!(blob instanceof Blob) || blob.size < 20) {
    throw new Error("File bukan GLB valid.");
  }

  const headerBuffer = await blob.slice(0, 20).arrayBuffer();
  const header = new DataView(headerBuffer);

  if (header.getUint32(0, true) !== GLB_MAGIC) {
    throw new Error("File bukan GLB valid.");
  }

  if (header.getUint32(4, true) !== 2) {
    throw new Error("Hanya GLB versi 2.0 yang didukung.");
  }

  const jsonChunkLength = header.getUint32(12, true);
  const jsonChunkType = header.getUint32(16, true);

  if (jsonChunkType !== JSON_CHUNK_TYPE || jsonChunkLength <= 0) {
    throw new Error("GLB tidak memiliki JSON chunk valid.");
  }

  const jsonEnd = 20 + jsonChunkLength;
  if (jsonEnd > blob.size) {
    throw new Error("JSON chunk GLB rusak atau tidak lengkap.");
  }

  const jsonBuffer = await blob.slice(20, jsonEnd).arrayBuffer();
  const jsonText = new TextDecoder().decode(new Uint8Array(jsonBuffer));
  return JSON.parse(jsonText.replace(/\u0000+$/g, "").trim());
}

export function extractGlbLicenseMetadataFromJson(
  gltf,
  { modelAssetId = "", fileName = "model.glb" } = {},
) {
  const asset = gltf?.asset || {};
  const assetExtras = asset?.extras || {};
  const rootExtras = gltf?.extras || {};
  const xmp = getXmpPacket(gltf) || {};

  const metadataModelName = firstText(
    getCaseInsensitive(assetExtras, ["modelName", "title", "name"]),
    getCaseInsensitive(rootExtras, ["modelName", "title", "name"]),
    getCaseInsensitive(xmp, ["dc:title", "title", "name"]),
  );
  const modelName = firstText(
    metadataModelName,
    fileNameWithoutExtension(fileName),
    fileName,
  );

  const creatorName = firstText(
    getCaseInsensitive(assetExtras, [
      "creatorName",
      "creator",
      "author",
      "artist",
      "createdBy",
    ]),
    getCaseInsensitive(rootExtras, [
      "creatorName",
      "creator",
      "author",
      "artist",
      "createdBy",
    ]),
    getCaseInsensitive(xmp, ["dc:creator", "creator", "author"]),
  );

  const license = firstText(
    getCaseInsensitive(assetExtras, [
      "license",
      "licenseName",
      "licenseType",
      "usageTerms",
      "rights",
    ]),
    getCaseInsensitive(rootExtras, [
      "license",
      "licenseName",
      "licenseType",
      "usageTerms",
      "rights",
    ]),
    getCaseInsensitive(xmp, [
      "cc:license",
      "xmpRights:UsageTerms",
      "dc:rights",
      "license",
      "rights",
    ]),
  );

  const rawSource = firstText(
    getCaseInsensitive(assetExtras, [
      "sourceUrl",
      "sourceURL",
      "downloadUrl",
      "downloadURL",
      "originalUrl",
      "originalURL",
      "source",
      "url",
      "website",
    ]),
    getCaseInsensitive(rootExtras, [
      "sourceUrl",
      "sourceURL",
      "downloadUrl",
      "downloadURL",
      "originalUrl",
      "originalURL",
      "source",
      "url",
      "website",
    ]),
    getCaseInsensitive(xmp, ["dc:source", "source", "url"]),
  );

  const sourceUrl = normalizeModelSourceUrl(rawSource);
  const metadataCopyright = firstText(asset?.copyright);
  const metadataGenerator = firstText(asset?.generator);
  const metadataDetected = Boolean(
    creatorName ||
      license ||
      sourceUrl ||
      metadataCopyright ||
      metadataModelName,
  );

  return normalizeModelLicenseEntry({
    modelAssetId,
    modelName,
    creatorName,
    license,
    sourceUrl,
    metadataModelNameDetected: Boolean(metadataModelName),
    metadataDetected,
    metadataCopyright,
    metadataGenerator,
    metadataReadAt: metadataDetected ? new Date().toISOString() : null,
  });
}

export async function readGlbLicenseMetadata(
  blob,
  { modelAssetId = "", fileName = "model.glb" } = {},
) {
  const gltf = await readGlbJsonFromBlob(blob);
  return extractGlbLicenseMetadataFromJson(gltf, { modelAssetId, fileName });
}
