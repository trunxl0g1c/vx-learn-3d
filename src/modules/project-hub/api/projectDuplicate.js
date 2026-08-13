import { normalizePlayerSettings } from "../../material/playerSettings";
import {
  createProjectRecord,
  saveProjectToIndexedDb,
  updateProjectInIndexedDb,
} from "../storage/projectIndexedDb";
import { fetchContentEditorSnapshot } from "./projectHydrate";
import { uploadFileInChunks } from "./uploads";
import { syncProjectToBackend } from "./projectSync";

// Pure: builds a brand-new local project record (fresh id, fresh material/
// chapter/flow/procedure/quiz ids courtesy of createProjectRecord +
// fetchContentEditorSnapshot's mappers) that carries over the source
// content's "materi" — chapters, flows, procedures, quizzes, object name
// overrides, gallery media, thumbnail, description/version/author/
// marketplace flag, viewer, and scene — but under the new name and backed
// by the new GLB file. status/publishVersion are deliberately NOT copied
// from the source; a duplicate always starts as a fresh DRAFT, same as any
// new project.
export function mergeSnapshotIntoNewProject(snapshot, { name, file, role }) {
  const project = createProjectRecord({ name, file, role });

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

/**
 * Duplicates a content item into a brand-new content row in the same
 * workspace: copies its materi (chapters/flows/procedures/overrides/media/
 * thumbnail/settings) via fetchContentEditorSnapshot, but backs it with a
 * NEW user-supplied GLB file under a NEW name. Chapters/markers that
 * reference objects in the source GLB by id won't resolve against the new
 * model — that's expected, not handled here; the user re-links them
 * afterward if needed.
 *
 * The backend phase (create content, upload GLB, sync materi) is
 * best-effort, same tolerance as ProjectHubPage's create-project flow: the
 * local project is already fully saved and openable once step 3 below
 * completes, so a backend failure is reported back via `backendSyncError`
 * instead of throwing.
 *
 * The one case that isn't just "report and move on": if the GLB never makes
 * it to storage (a real, observed failure mode — network hiccups against
 * R2's presigned-PUT step, a bad ETag, etc.), the content row created a
 * moment earlier has no usable model and would otherwise sit in the
 * workspace's Content list permanently broken. `deleteContentFn` (pass
 * useDeleteContent().mutateAsync) is used to clean that row up in that
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

  onProgress?.({ percent: 15, label: "Preparing new project..." });
  const project = mergeSnapshotIntoNewProject(snapshot, { name, file, role });

  onProgress?.({ percent: 20, label: "Saving project locally..." });
  await saveProjectToIndexedDb(project, file);

  let content = null;
  let modelUploaded = false;
  let backendSyncError = null;

  try {
    onProgress?.({ percent: 25, label: "Creating workspace content..." });
    content = await createContentFn({ workspaceId, title: project.name });

    onProgress?.({ percent: 25, label: "Uploading model..." });
    const { mediaId } = await uploadFileInChunks({
      contentId: content.id,
      file,
      onProgress: ({ uploadedBytes, totalBytes }) => {
        const uploadRatio = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
        onProgress?.({
          percent: 25 + Math.round(uploadRatio * 60),
          label: "Uploading model...",
        });
      },
    });
    modelUploaded = true;

    onProgress?.({ percent: 88, label: "Linking project..." });
    await updateProjectInIndexedDb(project.id, {
      remote: { workspaceId, contentId: content.id, mediaId },
    });

    onProgress?.({ percent: 92, label: "Syncing project data..." });
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
