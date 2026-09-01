import { uploadFileInChunks } from "./uploads";
import { encodeAdditionalModelFilename } from "./additionalModelFilename";

// Shared by useViewerProject.js (uploading a newly-added additional GLB from
// the editor) and projectDuplicate.js (copying a source project's additional
// GLBs onto a duplicate's brand-new content) — both need the exact same
// upload shape: chunked (same path the primary model goes through, since a
// GLB can be far larger than the 200MB cap on the plain content-media POST),
// classified OTHER (not MODEL — the primary-model lookup, findContentModelMedia,
// assumes exactly one MODEL-classified row per content, and additional GLBs
// would collide with that during project hydration/export), and filename-
// encoded with this model's local id (see additionalModelFilename.js — the
// only way fetchContentEditorSnapshot can tell "this OTHER row is an
// additional GLB, belonging to this specific model" apart from any other
// OTHER-classified file when rebuilding material.additionalModels on a cold
// hydrate).
//
// Returns a Map of local model id -> remote content-media id for whichever
// uploads succeeded; a failed upload is logged and simply left out of the
// map, keeping that one model local-only for now rather than failing the
// whole batch.
export async function uploadAdditionalModelsToBackend(
  contentId,
  models,
  files,
  onProgress,
) {
  const remoteMediaIdByModelId = new Map();
  if (!contentId) return remoteMediaIdByModelId;

  const totalBytes = files.reduce((sum, file) => sum + (file?.size || 0), 0);
  let uploadedBytesBase = 0;

  for (let index = 0; index < models.length; index += 1) {
    const file = files[index];
    const uploadFile = new File(
      [file],
      encodeAdditionalModelFilename(models[index].id, file?.name),
      { type: file?.type || "model/gltf-binary" },
    );

    try {
      const { mediaId } = await uploadFileInChunks({
        contentId,
        file: uploadFile,
        mediaClassification: "OTHER",
        onProgress: ({ uploadedBytes }) => {
          onProgress?.({
            fileName: file?.name,
            uploadedBytes: uploadedBytesBase + uploadedBytes,
            totalBytes,
          });
        },
      });
      if (mediaId) {
        remoteMediaIdByModelId.set(models[index].id, mediaId);
      }
    } catch (uploadError) {
      console.warn(
        `Failed to upload additional GLB "${file?.name}" to workspace storage; it stays local-only for now.`,
        uploadError,
      );
    } finally {
      uploadedBytesBase += file?.size || 0;
    }
  }

  return remoteMediaIdByModelId;
}
