// ContentMedia has no free-form metadata column — mediaClassification is a
// fixed backend enum (MODEL/VIDEO/IMAGE/PACKAGE/OTHER) we can't extend
// without a backend migration, and additional GLBs are uploaded as OTHER to
// avoid colliding with findContentModelMedia's "exactly one MODEL row is
// the primary model" assumption (see useViewerProject.js). That leaves no
// server-side signal distinguishing an additional-GLB upload from any other
// OTHER-classified file (e.g. a PDF in the project's media gallery).
//
// So the local modelId + a recognizable marker are encoded straight into
// the uploaded filename — the same trick this codebase already uses for
// thumbnails (see THUMBNAIL_FILENAME_PREFIX in projectHydrate.js). Encoding
// the modelId (not just a marker) also means a project rehydrated from a
// cleared local DB gets back the *same* additional-model ids it had before,
// so any chapter/animation referencing that model's id by
// modelAssetId stays valid across a cold hydrate.
const PREFIX = "additional-model__";
const SEPARATOR = "__";

export function encodeAdditionalModelFilename(modelId, originalFileName) {
  return `${PREFIX}${modelId}${SEPARATOR}${originalFileName || "model.glb"}`;
}

export function decodeAdditionalModelFilename(filename) {
  if (typeof filename !== "string" || !filename.startsWith(PREFIX)) {
    return null;
  }

  const rest = filename.slice(PREFIX.length);
  const separatorIndex = rest.indexOf(SEPARATOR);

  if (separatorIndex < 0) return null;

  const modelId = rest.slice(0, separatorIndex);
  const originalFileName = rest.slice(separatorIndex + SEPARATOR.length);

  if (!modelId || !originalFileName) return null;

  return { modelId, originalFileName };
}
