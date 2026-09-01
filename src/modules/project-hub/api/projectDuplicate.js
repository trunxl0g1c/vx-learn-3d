import { createId } from "../../../utils/createId";
import { normalizePlayerSettings } from "../../material/playerSettings";
import {
  createProjectRecord,
  saveProjectToIndexedDb,
  saveAdditionalProjectModelFile,
  updateProjectInIndexedDb,
} from "../storage/projectIndexedDb";
import { fetchContentEditorSnapshot } from "./projectHydrate";
import { uploadFileInChunks } from "./uploads";
import { uploadAdditionalModelsToBackend } from "./additionalModelUpload";
import { fetchContentMediaBlob } from "./contentMedia";
import { syncProjectToBackend } from "./projectSync";

// Pure: builds a brand-new local project record (fresh id, fresh material/
// chapter/flow/procedure/quiz ids courtesy of createProjectRecord +
// fetchContentEditorSnapshot's mappers) that carries over the source
// content's "materi" — chapters, flows, procedures, quizzes, object name
// overrides, gallery media, additional GLBs, thumbnail, description/version/
// author/marketplace flag, viewer, and scene — but under the new name and
// backed by the new primary GLB file. status/publishVersion are deliberately
// NOT copied from the source; a duplicate always starts as a fresh DRAFT,
// same as any new project.
//
// Additional-model descriptors get a fresh local id each (same "fresh id"
// treatment chapters/flows/etc already get here) and their remoteMediaId
// cleared — the old one points at the *source* content's storage, not the
// duplicate's; duplicateContentAsNewProject below re-establishes it once the
// file itself is actually copied and re-uploaded under the new content.
export function mergeSnapshotIntoNewProject(snapshot, { name, file, role }) {
  const project = createProjectRecord({ name, file, role });

  const additionalModels = (snapshot.additionalModels || []).map(
    (descriptor) => ({
      ...descriptor,
      id: createId(),
      remoteMediaId: null,
    }),
  );

  return {
    ...project,
    thumbnail: snapshot.thumbnailDataUrl || null,
    material: {
      ...project.material,
      title: name,
      description: snapshot.content?.description || "",
      version: snapshot.content?.version || "1.0.0",
      author: snapshot.content?.author || "",
      thumbnail: snapshot.thumbnailDataUrl || "",
      availableOnMarketplace: Boolean(snapshot.content?.availableOnMarketplace),
      media: snapshot.projectMedia,
      additionalModels,
      chapters: snapshot.chapters,
      flows: snapshot.flows,
      procedures: snapshot.procedures,
      quizzes: snapshot.quizzes,
      objectNameOverrides: snapshot.overrides,
      playerSettings: normalizePlayerSettings(snapshot.playerSettings),
    },
    viewer: snapshot.viewer,
    scene: snapshot.scene,
  };
}

// Downloads each source additional GLB's actual bytes (fetchContentEditorSnapshot
// only carries their metadata, same lazy treatment the primary model gets)
// and caches it into the new project's own IndexedDB entry, under the fresh
// local id mergeSnapshotIntoNewProject already assigned it. Best-effort per
// model — one failing (a network hiccup, a since-deleted source file) just
// drops that one model from the duplicate rather than failing the whole
// operation; sourceDescriptors and newDescriptors are index-aligned (both
// built from the same snapshot.additionalModels array, one directly, one via
// .map() in mergeSnapshotIntoNewProject).
async function copySourceAdditionalModelsLocally({
  projectId,
  sourceDescriptors,
  newDescriptors,
  onProgress,
  percentStart,
  percentEnd,
}) {
  const files = [];
  const count = newDescriptors.length;

  for (let index = 0; index < count; index += 1) {
    const source = sourceDescriptors[index];
    const target = newDescriptors[index];

    if (!source?.remoteMediaId) {
      files.push(null);
      continue;
    }

    onProgress?.({
      percent:
        percentStart +
        Math.round((index / count) * (percentEnd - percentStart)),
      label: `Copying additional GLB (${index + 1}/${count})...`,
    });

    try {
      const blob = await fetchContentMediaBlob({ id: source.remoteMediaId });
      const modelFile = new File(
        [blob],
        target.fileName || source.fileName || "model.glb",
        { type: target.fileType || source.fileType || "model/gltf-binary" },
      );

      await saveAdditionalProjectModelFile(projectId, target.id, modelFile);
      files.push(modelFile);
    } catch (error) {
      console.warn(
        `Failed to copy additional GLB "${target.fileName || target.id}" from the source project; it will be left out of the duplicate.`,
        error,
      );
      files.push(null);
    }
  }

  return files;
}

/**
 * Duplicates a content item into a brand-new content row in the same
 * workspace: copies its materi (chapters/flows/procedures/overrides/media/
 * additional GLBs/thumbnail/settings) via fetchContentEditorSnapshot, but
 * backs the primary model with a NEW user-supplied GLB file under a NEW
 * name — additional GLBs, by contrast, are copied byte-for-byte from the
 * source (there's no per-additional-model file picker in the duplicate
 * dialog). Chapters/markers that reference objects in the source GLB by id
 * won't resolve against the new primary model — that's expected, not
 * handled here; the user re-links them afterward if needed.
 *
 * The backend phase (create content, upload GLB(s), sync materi) is
 * best-effort, same tolerance as ProjectHubPage's create-project flow: the
 * local project is already fully saved and openable once the local-save
 * steps below complete, so a backend failure is reported back via
 * `backendSyncError` instead of throwing. Losing an additional GLB's upload
 * specifically is lower-stakes still (uploadAdditionalModelsToBackend
 * already swallows a per-model failure internally) — it never fails this
 * whole operation, just leaves that one model local-only for now.
 *
 * The one case that isn't just "report and move on": if the *primary* GLB
 * never makes it to storage (a real, observed failure mode — network
 * hiccups against R2's presigned-PUT step, a bad ETag, etc.), the content
 * row created a moment earlier has no usable model and would otherwise sit
 * in the workspace's Content list permanently broken. `deleteContentFn`
 * (pass useDeleteContent().mutateAsync) is used to clean that row up in that
 * specific case — never when the model itself uploaded fine but the
 * lower-stakes materi sync afterward failed, since the content is still
 * usable then.
 */
export async function duplicateContentAsNewProject({
  sourceContentId,
  workspaceId,
  name,
  file,
  role = "EDITOR",
  createContentFn,
  deleteContentFn,
  onProgress,
}) {
  onProgress?.({ percent: 5, label: "Fetching source content..." });
  const snapshot = await fetchContentEditorSnapshot(sourceContentId);

  onProgress?.({ percent: 12, label: "Preparing new project..." });
  const project = mergeSnapshotIntoNewProject(snapshot, { name, file, role });

  onProgress?.({ percent: 18, label: "Saving project locally..." });
  await saveProjectToIndexedDb(project, file);

  const copiedAdditionalModelFiles = await copySourceAdditionalModelsLocally({
    projectId: project.id,
    sourceDescriptors: snapshot.additionalModels || [],
    newDescriptors: project.material.additionalModels || [],
    onProgress,
    percentStart: 18,
    percentEnd: 38,
  });

  // Descriptors whose local copy failed have no blob anywhere (their old
  // remoteMediaId was already cleared in mergeSnapshotIntoNewProject) — drop
  // them rather than leave a dangling entry with nothing behind it.
  const copiedPairs = project.material.additionalModels
    .map((descriptor, index) => ({
      descriptor,
      file: copiedAdditionalModelFiles[index],
    }))
    .filter((pair) => pair.file instanceof Blob);

  project.material = {
    ...project.material,
    additionalModels: copiedPairs.map((pair) => pair.descriptor),
  };

  let content = null;
  let modelUploaded = false;
  let backendSyncError = null;

  try {
    onProgress?.({ percent: 42, label: "Creating workspace content..." });
    content = await createContentFn({ workspaceId, title: project.name });

    onProgress?.({ percent: 42, label: "Uploading model..." });
    const { mediaId } = await uploadFileInChunks({
      contentId: content.id,
      file,
      onProgress: ({ uploadedBytes, totalBytes }) => {
        const uploadRatio = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
        onProgress?.({
          percent: 42 + Math.round(uploadRatio * 36),
          label: "Uploading model...",
        });
      },
    });
    modelUploaded = true;

    const remoteMediaIdByModelId = await uploadAdditionalModelsToBackend(
      content.id,
      project.material.additionalModels,
      copiedPairs.map((pair) => pair.file),
      ({ fileName, uploadedBytes, totalBytes }) => {
        const uploadRatio = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
        onProgress?.({
          percent: 78 + Math.round(uploadRatio * 18),
          label: fileName
            ? `Uploading ${fileName}...`
            : "Uploading additional GLBs...",
        });
      },
    );

    project.material = {
      ...project.material,
      additionalModels: project.material.additionalModels.map((descriptor) =>
        remoteMediaIdByModelId.has(descriptor.id)
          ? {
              ...descriptor,
              remoteMediaId: remoteMediaIdByModelId.get(descriptor.id),
            }
          : descriptor,
      ),
    };

    onProgress?.({ percent: 97, label: "Linking project..." });
    await updateProjectInIndexedDb(project.id, {
      remote: { workspaceId, contentId: content.id, mediaId },
      material: project.material,
    });

    onProgress?.({ percent: 99, label: "Syncing project data..." });
    await syncProjectToBackend({
      projectId: project.id,
      contentId: content.id,
      material: project.material,
      viewer: project.viewer,
      scene: project.scene,
    });
  } catch (error) {
    backendSyncError = error;

    if (content && !modelUploaded) {
      try {
        await deleteContentFn?.({ id: content.id });
      } catch (cleanupError) {
        console.error(
          "Failed to clean up content after a failed model upload:",
          cleanupError,
        );
      }
    }
  }

  const modelUploadFailed = Boolean(content) && !modelUploaded;

  onProgress?.({ percent: 100, label: "Done" });

  return {
    project,
    content: modelUploadFailed ? null : content,
    backendSyncError,
    modelUploadFailed,
  };
}
