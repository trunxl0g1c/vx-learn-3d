import {
  getProjectFromIndexedDb,
  updateProjectInIndexedDb,
} from "../storage/projectIndexedDb";
import {
  createContentObjDescRequest,
  updateContentObjDescRequest,
  deleteContentObjDescRequest,
} from "./contentObjDescs";
import {
  createContentFlowRequest,
  updateContentFlowRequest,
  deleteContentFlowRequest,
} from "./contentFlows";
import {
  createContentProcedureRequest,
  updateContentProcedureRequest,
  deleteContentProcedureRequest,
} from "./contentProcedures";
import { replaceContentObjectNameOverridesRequest } from "./contentObjectNameOverrides";
import { upsertContentSettingRequest } from "./contentSettings";
import { updateContentRequest } from "./contents";
import {
  uploadContentMediaRequest,
  deleteContentMediaRequest,
} from "./contentMedia";
import {
  uploadContentObjDescMediaRequest,
  deleteContentObjDescMediaRequest,
} from "./contentObjDescMedia";
import {
  hashThumbnail,
  dataUrlToFile,
  dataUrlToNamedFile,
} from "./thumbnailUtils";

// Chapter -> ContentObjDesc. objectUuid is the only chapter field promoted
// to its own column; everything else that isn't already a dedicated column
// folds into `parameter`/`cameraView` — see content-obj-desc's README.
function mapChapterToContentObjDesc(chapter, index) {
  return {
    aliasName: chapter?.title || `Chapter ${index + 1}`,
    description: chapter?.description || undefined,
    objectUuid: chapter?.objectUuid || undefined,
    // `marker` must be an object (class-validator's @IsObject() rejects a
    // bare array, confirmed live — the API doc's own `marker: []` example
    // does not actually validate), so the chapter's marker array is wrapped
    // rather than sent raw.
    marker: { items: chapter?.markers || [] },
    stateView: chapter?.visualState || null,
    cameraView: {
      cameraView: chapter?.cameraView || null,
      cameraViews: chapter?.cameraViews || [],
      cameraViewSaved: Boolean(chapter?.cameraViewSaved),
      cameraPosition: chapter?.cameraPosition || null,
      cameraTarget: chapter?.cameraTarget || null,
    },
    parameter: {
      objectName: chapter?.objectName || "",
      objectPath: chapter?.objectPath || [],
      modelRotation: chapter?.modelRotation || null,
      animations: chapter?.animations || [],
      callouts: chapter?.callouts || [],
      flowIds: chapter?.flows || [],
      parameters: chapter?.parameters || [],
    },
    step: index,
  };
}

function mapFlowToContentFlow(flow) {
  return {
    name: flow?.name || "Untitled Flow",
    description: flow?.description || undefined,
    enabled: flow?.enabled !== false,
    points: flow?.points || [],
    visualState: flow?.visualState || null,
    cameraView: flow?.cameraView || null,
    settings: flow?.settings || null,
  };
}

function mapProcedureToContentProcedure(procedure) {
  return {
    name: procedure?.name || "Untitled Procedure",
    type: procedure?.type === "ASSEMBLY" ? "ASSEMBLY" : "GUIDED",
    description: procedure?.description || undefined,
    enabled: procedure?.enabled !== false,
    settings: procedure?.settings || null,
    steps: procedure?.steps || [],
  };
}

// Diff-syncs one local array (chapters/flows/procedures) against its
// backend resource, using `idMap` (local id -> remote id, persisted on the
// project's `remote` field) to decide create vs. update, and to know which
// backend rows to delete once their local item disappears. Sequential, not
// parallel — keeps this well under the API's per-resource rate limits and
// matches how the chunked upload already does one request at a time.
async function syncArray({
  items,
  idMap,
  mapToPayload,
  create,
  update,
  remove,
  extraCreateFields,
}) {
  const nextMap = { ...idMap };
  const seenLocalIds = new Set();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const localId = item?.id;

    if (!localId) continue;

    seenLocalIds.add(localId);

    const payload = mapToPayload(item, index);
    const remoteId = idMap[localId];

    try {
      if (remoteId) {
        await update({ id: remoteId, ...payload });
      } else {
        const created = await create({ ...extraCreateFields, ...payload });
        if (created?.id) nextMap[localId] = created.id;
      }
    } catch (error) {
      console.error(`Failed to sync item ${localId}:`, error);
    }
  }

  const removedLocalIds = Object.keys(idMap).filter(
    (localId) => !seenLocalIds.has(localId),
  );

  for (const localId of removedLocalIds) {
    try {
      await remove({ id: idMap[localId] });
    } catch (error) {
      console.error(`Failed to remove synced item ${localId}:`, error);
    } finally {
      delete nextMap[localId];
    }
  }

  return nextMap;
}

// Project media (material.media, ProjectSettingsPanel's "Media" section) uses
// "IMAGE"/"VIDEO"/"DOCUMENT"; chapter media (chapter.media,
// ChapterMediaSection) uses lowercase "image"/"video"/"pdf". Neither has a
// backend DOCUMENT/pdf classification, so both fold into OTHER.
function mapMediaTypeToClassification(type) {
  const normalized = String(type || "").toLowerCase();

  if (normalized === "image") return "IMAGE";
  if (normalized === "video") return "VIDEO";

  return "OTHER";
}

// Media items are immutable once uploaded (no "edit a photo in place" —
// only add or remove), so unlike syncArray this never updates an existing
// remote row, just creates newly-added items and deletes ones the local
// list no longer has. Shared by project-level gallery media and each
// chapter's own media, which are otherwise the same shape of operation
// against two different backend resources.
async function syncMediaList({ items, idMap, upload, remove }) {
  const nextMap = { ...idMap };
  const seenLocalIds = new Set();

  for (const item of items) {
    const localId = item?.id;

    if (!localId) continue;

    seenLocalIds.add(localId);

    if (nextMap[localId]) continue;

    const dataUrl = item.dataUrl || item.data;

    if (!dataUrl) continue;

    try {
      const file = dataUrlToNamedFile(
        dataUrl,
        item.name || item.title || `media-${localId}`,
        item.mimeType || item.mimetype,
      );
      const created = await upload(item, file);

      if (created?.id) nextMap[localId] = created.id;
    } catch (error) {
      console.error(`Failed to upload media ${localId}:`, error);
    }
  }

  const removedLocalIds = Object.keys(idMap).filter(
    (localId) => !seenLocalIds.has(localId),
  );

  for (const localId of removedLocalIds) {
    try {
      await remove(idMap[localId]);
    } catch (error) {
      console.error(`Failed to remove media ${localId}:`, error);
    } finally {
      delete nextMap[localId];
    }
  }

  return nextMap;
}

function syncProjectMedia({ contentId, mediaList, idMap }) {
  return syncMediaList({
    items: mediaList,
    idMap,
    upload: (item, file) =>
      uploadContentMediaRequest({
        contentId,
        mediaClassification: mapMediaTypeToClassification(item.type),
        file,
      }),
    remove: (remoteId) => deleteContentMediaRequest({ id: remoteId }),
  });
}

// Chapters are synced first (see syncProjectToBackend) so each chapter's
// remote ContentObjDesc id is already known here — a chapter whose sync
// failed (no remote id yet) is skipped rather than guessed at.
async function syncAllChapterMedia({
  chapters,
  chapterIds,
  previousChapterMediaIds,
}) {
  const nextChapterMediaIds = {};

  for (const chapter of chapters) {
    const localChapterId = chapter?.id;
    const remoteObjDescId = localChapterId && chapterIds[localChapterId];

    if (!remoteObjDescId) continue;

    nextChapterMediaIds[localChapterId] = await syncMediaList({
      items: chapter?.media || [],
      idMap: previousChapterMediaIds[localChapterId] || {},
      upload: (item, file) =>
        uploadContentObjDescMediaRequest({
          contentObjDescId: remoteObjDescId,
          mediaClassification: mapMediaTypeToClassification(item.type),
          file,
        }),
      remove: (remoteId) => deleteContentObjDescMediaRequest({ id: remoteId }),
    });
  }

  return nextChapterMediaIds;
}

// material.thumbnail is a local base64 data URL (captured from the viewport
// or an uploaded image, see ProjectSettingsPanel) — the backend instead
// stores it as a ContentMedia row classified IMAGE, the same way any other
// content asset is stored. Only one such row is meant to exist per content
// at a time, so a change here deletes the previous one before uploading the
// replacement — otherwise every edit would leave an orphaned old thumbnail
// behind in storage.
async function syncThumbnail({ contentId, thumbnailDataUrl, remote }) {
  const hash = hashThumbnail(thumbnailDataUrl);
  const previousHash = remote.thumbnailHash || null;
  const previousMediaId = remote.thumbnailMediaId || null;

  if (hash === previousHash) {
    return { thumbnailMediaId: previousMediaId, thumbnailHash: previousHash };
  }

  if (previousMediaId) {
    try {
      await deleteContentMediaRequest({ id: previousMediaId });
    } catch (error) {
      console.error("Failed to delete previous thumbnail:", error);
    }
  }

  if (!thumbnailDataUrl) {
    return { thumbnailMediaId: null, thumbnailHash: null };
  }

  try {
    const file = dataUrlToFile(thumbnailDataUrl, "thumbnail");
    const created = await uploadContentMediaRequest({
      contentId,
      mediaClassification: "IMAGE",
      file,
    });

    return { thumbnailMediaId: created?.id || null, thumbnailHash: hash };
  } catch (error) {
    console.error("Failed to upload thumbnail:", error);
    return { thumbnailMediaId: previousMediaId, thumbnailHash: previousHash };
  }
}

function buildEnvironmentSettings(viewer) {
  if (!viewer) return undefined;

  return {
    exposure: viewer.exposure,
    ambientLight: viewer.ambientLight,
    mainLight: viewer.mainLight,
    fillLight: viewer.fillLight,
    hemiLight: viewer.hemiLight,
    envIntensity: viewer.envIntensity,
    showHdriBackground: viewer.showHdriBackground,
    shaderMode: viewer.shaderMode,
    metalness: viewer.metalness,
    roughness: viewer.roughness,
    cameraProjectionMode: viewer.cameraProjectionMode,
    // Background Type/colors/gradient settings (ProjectSettingsPanel's
    // "Background" section) — previously dropped entirely, never reached
    // the backend. Stored wholesale as-is; it's already a flat JSON-safe
    // object (see utils/viewerBackground.js).
    background: viewer.background || undefined,
  };
}

function buildSceneSettings(scene) {
  if (!scene) return undefined;

  return {
    markers: scene.markers || [],
    hiddenObjects: scene.hiddenObjects || [],
    xrayObjects: scene.xrayObjects || [],
    cut: scene.cut || { enabled: false, axis: "x", value: 0 },
  };
}

/**
 * Pushes a project's editor data (settings, chapters, flows, procedures,
 * object name overrides) to its linked backend content. Best-effort by
 * design — callers (autosave, create-project) treat a failure here as
 * non-fatal, since the local IndexedDB copy is always the source of truth
 * for the editor itself.
 */
export async function syncProjectToBackend({
  projectId,
  contentId,
  material,
  viewer,
  scene,
}) {
  if (!projectId || !contentId) return;

  const existingProject = await getProjectFromIndexedDb(projectId);
  const remote = existingProject?.remote || {};

  const [chapterIds, flowIds, procedureIds] = await Promise.all([
    syncArray({
      items: material?.chapters || [],
      idMap: remote.chapterIds || {},
      mapToPayload: mapChapterToContentObjDesc,
      create: createContentObjDescRequest,
      update: updateContentObjDescRequest,
      remove: deleteContentObjDescRequest,
      extraCreateFields: { contentId },
    }),
    syncArray({
      items: material?.flows || [],
      idMap: remote.flowIds || {},
      mapToPayload: mapFlowToContentFlow,
      create: createContentFlowRequest,
      update: updateContentFlowRequest,
      remove: deleteContentFlowRequest,
      extraCreateFields: { contentId },
    }),
    syncArray({
      items: material?.procedures || [],
      idMap: remote.procedureIds || {},
      mapToPayload: mapProcedureToContentProcedure,
      create: createContentProcedureRequest,
      update: updateContentProcedureRequest,
      remove: deleteContentProcedureRequest,
      extraCreateFields: { contentId },
    }),
  ]);

  const chapterMediaIds = await syncAllChapterMedia({
    chapters: material?.chapters || [],
    chapterIds,
    previousChapterMediaIds: remote.chapterMediaIds || {},
  });

  const [, , , thumbnailResult, mediaIds] = await Promise.all([
    // Content's own fields (title, description, version, author,
    // marketplace flag) — previously only ever sent once at creation, so
    // edits made afterward in Project Settings never reached the database.
    // `title` is required by the backend DTO even on update, so it always
    // falls back to something non-empty.
    updateContentRequest({
      id: contentId,
      title: material?.title || "Untitled Project",
      description: material?.description || undefined,
      version: material?.version || undefined,
      author: material?.author || undefined,
      availableOnMarketplace: Boolean(material?.availableOnMarketplace),
    }),
    upsertContentSettingRequest({
      contentId,
      environmentSettings: buildEnvironmentSettings(viewer),
      backgroundHdri: viewer?.hdri || undefined,
      scene: buildSceneSettings(scene),
      playerSettings: material?.playerSettings || undefined,
    }),
    replaceContentObjectNameOverridesRequest({
      contentId,
      overrides: (material?.objectNameOverrides || []).map((override) => ({
        path: Array.isArray(override?.path) ? override.path : [],
        name: override?.name || "",
        originalName: override?.originalName || undefined,
      })),
    }),
    syncThumbnail({
      contentId,
      thumbnailDataUrl: material?.thumbnail || null,
      remote,
    }),
    syncProjectMedia({
      contentId,
      mediaList: material?.media || [],
      idMap: remote.mediaIds || {},
    }),
  ]);

  await updateProjectInIndexedDb(projectId, {
    remote: {
      ...remote,
      contentId,
      chapterIds,
      flowIds,
      procedureIds,
      chapterMediaIds,
      mediaIds,
      thumbnailMediaId: thumbnailResult.thumbnailMediaId,
      thumbnailHash: thumbnailResult.thumbnailHash,
      lastSyncedAt: new Date().toISOString(),
    },
  });
}
