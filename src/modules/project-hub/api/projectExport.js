import { normalizePlayerSettings } from "../../material/playerSettings";
import {
  getProjectFromIndexedDb,
  getProjectFileFromIndexedDb,
} from "../storage/projectIndexedDb";
import { fetchContentEditorSnapshot } from "./projectHydrate";
import { findContentModelMedia, fetchContentMediaBlob } from "./contentMedia";
import { exportEncryptedVXPack } from "../../../utils/vxpackUtils";

function blobToModelFile(blob, fileName, mimeType) {
  const type = mimeType || blob?.type || "model/gltf-binary";

  if (typeof File === "function") {
    return new File([blob], fileName || "model.glb", { type });
  }

  blob.name = fileName || "model.glb";
  return blob;
}

// This browser already has the project cached (opened here at least once) —
// read the fully-hydrated record straight out of IndexedDB. Returns null
// (rather than throwing) when the GLB was never actually cached locally —
// e.g. a project hydrated from the backend but never opened, see
// hydrateProjectFromBackend's "GLB deliberately not downloaded" comment —
// so the caller can fall back to fetching everything from the backend.
async function loadFromLocalProject(localProject) {
  const [fullProject, fileRecord] = await Promise.all([
    getProjectFromIndexedDb(localProject.id, { mode: "full" }),
    getProjectFileFromIndexedDb(localProject.id),
  ]);

  if (!fullProject || !fileRecord?.blob) {
    return null;
  }

  return {
    project: fullProject,
    material: fullProject.material,
    viewerSettings: fullProject.viewer,
    scene: fullProject.scene,
    modelFile: blobToModelFile(
      fileRecord.blob,
      fileRecord.fileName,
      fileRecord.fileType,
    ),
  };
}

// Never opened in this browser — pull the same editor snapshot
// duplicateContentAsNewProject (projectDuplicate.js) uses, plus the GLB
// itself (hydrateProjectFromBackend deliberately skips downloading that).
async function loadFromBackend(content, onProgress) {
  onProgress?.({ percent: 10, label: "Fetching content from workspace..." });
  const snapshot = await fetchContentEditorSnapshot(content.id);
  const modelMedia = await findContentModelMedia({ contentId: content.id });

  if (!modelMedia) {
    throw new Error("This content has no 3D model uploaded yet.");
  }

  onProgress?.({ percent: 25, label: "Downloading 3D model..." });

  const modelBlob = await fetchContentMediaBlob({
    id: modelMedia.id,
    onProgress: (loaded, total) => {
      const ratio = total > 0 ? loaded / total : 0;
      onProgress?.({
        percent: 25 + Math.round(ratio * 35),
        label: "Downloading 3D model...",
      });
    },
  });

  const project = {
    name: snapshot.content?.title || content.title,
    role: "EDITOR",
    workspace: "Cloud Workspace",
    thumbnail: snapshot.thumbnailDataUrl || null,
    status: snapshot.content?.status || content.status,
    publishVersion: snapshot.content?.publishVersion || content.publishVersion,
  };

  const material = {
    title: snapshot.content?.title || content.title,
    description: snapshot.content?.description || "",
    version: snapshot.content?.version || "1.0.0",
    author: snapshot.content?.author || "",
    thumbnail: snapshot.thumbnailDataUrl || "",
    availableOnMarketplace: Boolean(snapshot.content?.availableOnMarketplace),
    media: snapshot.projectMedia,
    chapters: snapshot.chapters,
    flows: snapshot.flows,
    procedures: snapshot.procedures,
    objectNameOverrides: snapshot.overrides,
    playerSettings: normalizePlayerSettings(snapshot.playerSettings),
  };

  return {
    project,
    material,
    viewerSettings: snapshot.viewer,
    scene: snapshot.scene,
    modelFile: blobToModelFile(
      modelBlob,
      modelMedia.filename,
      modelMedia.mimetype,
    ),
  };
}

/**
 * Exports a workspace content item as a password-encrypted .vxenc package
 * (GLB + chapters/flows/procedures/gallery media/settings) without
 * requiring the project to be open in the editor first. Reads from this
 * browser's IndexedDB cache when available; otherwise pulls a fresh
 * snapshot + the GLB straight from the backend.
 */
export async function exportContentAsEncryptedPackage({
  content,
  localProject,
  password,
  onProgress,
}) {
  onProgress?.({ percent: 5, label: "Loading project data..." });

  const source =
    (localProject && (await loadFromLocalProject(localProject))) ||
    (await loadFromBackend(content, onProgress));

  onProgress?.({ percent: 60, label: "Building encrypted package..." });

  await exportEncryptedVXPack({
    project: source.project,
    material: source.material,
    modelFile: source.modelFile,
    modelFileName: source.modelFile?.name,
    viewerSettings: source.viewerSettings,
    scene: source.scene,
    password,
    onProgress: (percent) => {
      onProgress?.({
        percent: 60 + Math.round((percent / 100) * 40),
        label: percent >= 100 ? "Done" : "Building encrypted package...",
      });
    },
  });

  onProgress?.({ percent: 100, label: "Done" });
}
