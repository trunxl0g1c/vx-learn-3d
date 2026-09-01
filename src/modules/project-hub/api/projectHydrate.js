import { createId } from "../../../utils/createId";
import { normalizePlayerSettings } from "../../material/playerSettings";
import {
  getProjectFromIndexedDb,
  saveProjectToIndexedDb,
} from "../storage/projectIndexedDb";
import { getContentDetailRequest } from "./contents";
import { getContentSettingRequest } from "./contentSettings";
import { listContentObjDescsRequest } from "./contentObjDescs";
import { listContentSlidesRequest } from "./contentSlides";
import { listContentFlowsRequest } from "./contentFlows";
import { listContentProceduresRequest } from "./contentProcedures";
import { listContentQuizzesRequest } from "./contentQuizzes";
import { listContentObjectNameOverridesRequest } from "./contentObjectNameOverrides";
import {
  listContentMediaRequest,
  findContentImageMedia,
  fetchContentMediaBlob,
} from "./contentMedia";
import {
  listContentObjDescMediaRequest,
  fetchContentObjDescMediaBlob,
} from "./contentObjDescMedia";
import {
  listContentSlideMediaRequest,
  fetchContentSlideMediaBlob,
} from "./contentSlideMedia";
import { hashThumbnail, blobToDataUrl } from "./thumbnailUtils";
import { decodeAdditionalModelFilename } from "./additionalModelFilename";

// Same convention projectSync.js's syncThumbnail uploads under — lets
// gallery hydration tell "this IMAGE row is the thumbnail" apart from
// "this IMAGE row is a normal gallery item" without a dedicated column.
const THUMBNAIL_FILENAME_PREFIX = "thumbnail.";

function classificationToProjectMediaType(classification) {
  if (classification === "IMAGE") return "IMAGE";
  if (classification === "VIDEO") return "VIDEO";

  return "DOCUMENT";
}

function classificationToChapterMediaType(classification) {
  if (classification === "IMAGE") return "image";
  if (classification === "VIDEO") return "video";

  return "pdf";
}

// The thumbnail lives as the content's most recent IMAGE-classified
// ContentMedia row (see projectSync.js's syncThumbnail) — fetched
// separately from the Promise.all below since "this content has no
// thumbnail yet" is the common case, not an error the whole hydrate should
// fail on. Grabbing the media id here (not just the bytes) lets a later
// Bulk Update on this hydrated project correctly replace this exact row
// instead of leaving it orphaned.
async function hydrateThumbnail(contentId) {
  try {
    const images = await findContentImageMedia({ contentId });
    const latest = images[0];

    if (!latest) {
      return { thumbnailDataUrl: "", thumbnailMediaId: null, thumbnailHash: null };
    }

    const blob = await fetchContentMediaBlob({ id: latest.id });
    const thumbnailDataUrl = await blobToDataUrl(blob);

    return {
      thumbnailDataUrl,
      thumbnailMediaId: latest.id,
      thumbnailHash: hashThumbnail(thumbnailDataUrl),
    };
  } catch (error) {
    console.error("Failed to hydrate thumbnail:", error);
    return { thumbnailDataUrl: "", thumbnailMediaId: null, thumbnailHash: null };
  }
}

// Project-level "Media" gallery (material.media) — every content-media row
// except the GLB model, whichever IMAGE row is the thumbnail (see
// THUMBNAIL_FILENAME_PREFIX above), and any OTHER-classified row that's
// actually an additional GLB (see hydrateAdditionalModelDescriptors below —
// those share the OTHER classification with genuine gallery documents, so
// they'd otherwise show up here as a bogus "document"). Each item's bytes
// are fetched and converted back to the same base64 data URL shape
// material.media expects locally, same as the thumbnail.
async function hydrateProjectMedia(contentId) {
  try {
    const allMedia = await listContentMediaRequest({ contentId });
    const galleryMedia = (allMedia || []).filter((item) => {
      if (item.mediaClassification === "MODEL") return false;
      if (
        item.mediaClassification === "IMAGE" &&
        item.filename?.startsWith(THUMBNAIL_FILENAME_PREFIX)
      ) {
        return false;
      }
      if (
        item.mediaClassification === "OTHER" &&
        decodeAdditionalModelFilename(item.filename)
      ) {
        return false;
      }

      return true;
    });

    const mediaIds = {};
    const media = await Promise.all(
      galleryMedia.map(async (item) => {
        try {
          const blob = await fetchContentMediaBlob({ id: item.id });
          const dataUrl = await blobToDataUrl(blob);
          const localId = createId();

          mediaIds[localId] = item.id;

          return {
            id: localId,
            type: classificationToProjectMediaType(item.mediaClassification),
            title: item.filename,
            name: item.filename,
            mimeType: item.mimetype,
            size: item.size,
            url: dataUrl,
            dataUrl,
            addedAt: item.createdAt,
          };
        } catch (error) {
          console.error(`Failed to hydrate media ${item.id}:`, error);
          return null;
        }
      }),
    );

    return { media: media.filter(Boolean), mediaIds };
  } catch (error) {
    console.error("Failed to hydrate project media:", error);
    return { media: [], mediaIds: {} };
  }
}

// Rebuilds material.additionalModels' descriptors (id/name/fileName/
// fileType/fileSize/remoteMediaId) from the additional-GLB rows uploaded by
// useViewerProject.js's uploadAdditionalModelsToBackend — identified by the
// encoded filename (see additionalModelFilename.js), since OTHER is shared
// with plain gallery documents. Only metadata: the GLB bytes themselves are
// fetched and cached lazily by useProjectLoader's
// hydrateMissingAdditionalModelFiles on first open, same as the primary
// model, not eagerly here.
async function hydrateAdditionalModelDescriptors(contentId) {
  try {
    const allMedia = await listContentMediaRequest({ contentId });

    return (allMedia || [])
      .filter((item) => item.mediaClassification === "OTHER")
      .map((item) => {
        const decoded = decodeAdditionalModelFilename(item.filename);
        if (!decoded) return null;

        return {
          id: decoded.modelId,
          name: decoded.originalFileName,
          fileName: decoded.originalFileName,
          fileType: item.mimetype,
          fileSize: item.size,
          remoteMediaId: item.id,
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("Failed to hydrate additional GLB descriptors:", error);
    return [];
  }
}

// Same idea, per chapter — ContentObjDescMedia rows nested under one
// ContentObjDesc, back into chapter.media's shape (see ChapterMediaSection).
async function hydrateChapterMedia(contentObjDescId) {
  try {
    const items = await listContentObjDescMediaRequest({ contentObjDescId });
    const mediaIds = {};
    const media = await Promise.all(
      (items || []).map(async (item) => {
        try {
          const blob = await fetchContentObjDescMediaBlob({ id: item.id });
          const data = await blobToDataUrl(blob);
          const localId = createId();

          mediaIds[localId] = item.id;

          return {
            id: localId,
            type: classificationToChapterMediaType(item.mediaClassification),
            name: item.filename,
            mimeType: item.mimetype,
            data,
          };
        } catch (error) {
          console.error(`Failed to hydrate chapter media ${item.id}:`, error);
          return null;
        }
      }),
    );

    return { media: media.filter(Boolean), mediaIds };
  } catch (error) {
    console.error("Failed to hydrate chapter media:", error);
    return { media: [], mediaIds: {} };
  }
}

// Same idea as hydrateChapterMedia, for slides — ContentSlideMedia rows
// nested under one ContentSlide, back into slide.media's shape.
async function hydrateSlideMedia(contentSlideId) {
  try {
    const items = await listContentSlideMediaRequest({ contentSlideId });
    const mediaIds = {};
    const media = await Promise.all(
      (items || []).map(async (item) => {
        try {
          const blob = await fetchContentSlideMediaBlob({ id: item.id });
          const data = await blobToDataUrl(blob);
          const localId = createId();

          mediaIds[localId] = item.id;

          return {
            id: localId,
            type: classificationToChapterMediaType(item.mediaClassification),
            name: item.filename,
            mimeType: item.mimetype,
            data,
          };
        } catch (error) {
          console.error(`Failed to hydrate slide media ${item.id}:`, error);
          return null;
        }
      }),
    );

    return { media: media.filter(Boolean), mediaIds };
  } catch (error) {
    console.error("Failed to hydrate slide media:", error);
    return { media: [], mediaIds: {} };
  }
}

// Reverse of projectSync.js's mapSlideToContentSlide.
function mapContentSlideToSlide(contentSlide) {
  const parameter = contentSlide?.parameter || {};
  const cameraView = contentSlide?.cameraView || {};
  const marker = contentSlide?.marker || {};
  const now = new Date().toISOString();

  return {
    id: createId("slide"),
    title: contentSlide?.aliasName || "",
    description: contentSlide?.description || "",
    enabled: parameter.enabled !== false,
    parameters: parameter.parameters || [],
    markers: marker.items || [],
    media: [],
    animations: parameter.animations || [],
    flows: parameter.flows || [],
    visualState: contentSlide?.stateView || null,
    cameraViewSaved: Boolean(cameraView.cameraViewSaved),
    cameraView: cameraView.cameraView || null,
    cameraViews: cameraView.cameraViews || [],
    cameraPosition: cameraView.cameraPosition || null,
    cameraTarget: cameraView.cameraTarget || null,
    cameraQuaternion: cameraView.cameraQuaternion || null,
    cameraUp: cameraView.cameraUp || null,
    cameraZoom: cameraView.cameraZoom ?? null,
    cameraType: cameraView.cameraType || null,
    cameraFov: cameraView.cameraFov ?? null,
    modelRotation: parameter.modelRotation || null,
    callouts: parameter.callouts || [],
    createdAt: contentSlide?.createdAt || now,
    updatedAt: contentSlide?.modifiedAt || now,
  };
}

// Reverse of projectSync.js's mapChapterToContentObjDesc.
function mapContentObjDescToChapter(desc) {
  const parameter = desc?.parameter || {};
  const cameraView = desc?.cameraView || {};
  const marker = desc?.marker || {};

  return {
    id: createId(),
    title: desc?.aliasName || "",
    objectName: parameter.objectName || "",
    objectUuid: desc?.objectUuid || null,
    objectPath: parameter.objectPath || [],
    description: desc?.description || "",
    parameters: parameter.parameters || [],
    markers: marker.items || [],
    animations: parameter.animations || [],
    flows: parameter.flowIds || [],
    visualState: desc?.stateView || null,
    cameraViewSaved: Boolean(cameraView.cameraViewSaved),
    cameraView: cameraView.cameraView || null,
    cameraViews: cameraView.cameraViews || [],
    cameraPosition: cameraView.cameraPosition || [0, 0, 5],
    cameraTarget: cameraView.cameraTarget || [0, 0, 0],
    modelRotation: parameter.modelRotation || [0, 0, 0],
    callouts: parameter.callouts || [],
  };
}

function mapContentFlowToFlow(contentFlow) {
  const now = new Date().toISOString();

  return {
    id: createId("flow"),
    name: contentFlow?.name || "Untitled Flow",
    description: contentFlow?.description || "",
    enabled: contentFlow?.enabled !== false,
    points: contentFlow?.points || [],
    visualState: contentFlow?.visualState || null,
    cameraView: contentFlow?.cameraView || null,
    settings: contentFlow?.settings || {},
    createdAt: contentFlow?.createdAt || now,
    updatedAt: contentFlow?.modifiedAt || now,
  };
}

function mapContentProcedureToProcedure(contentProcedure) {
  const now = new Date().toISOString();

  return {
    id: createId("procedure"),
    name: contentProcedure?.name || "Untitled Procedure",
    type: contentProcedure?.type === "ASSEMBLY" ? "ASSEMBLY" : "GUIDED",
    description: contentProcedure?.description || "",
    enabled: contentProcedure?.enabled !== false,
    settings: contentProcedure?.settings || {},
    steps: contentProcedure?.steps || [],
    createdAt: contentProcedure?.createdAt || now,
    updatedAt: contentProcedure?.modifiedAt || now,
  };
}

// Reverse of projectSync.js's mapQuizToContentQuiz.
function mapContentQuizToQuiz(contentQuiz) {
  const now = new Date().toISOString();

  return {
    id: createId("quiz"),
    name: contentQuiz?.name || "Untitled Quiz",
    description: contentQuiz?.description || "",
    enabled: contentQuiz?.enabled !== false,
    settings: contentQuiz?.settings || {},
    questions: contentQuiz?.questions || [],
    createdAt: contentQuiz?.createdAt || now,
    updatedAt: contentQuiz?.modifiedAt || now,
  };
}

function mapContentOverride(override) {
  return {
    path: Array.isArray(override?.path) ? override.path : [],
    name: override?.name || "",
    originalName: override?.originalName || "",
  };
}

function mapContentSettingToViewerAndScene(setting) {
  const env = setting?.environmentSettings || {};
  const sceneData = setting?.scene || {};

  return {
    viewer: {
      exposure: env.exposure ?? 0.75,
      ambientLight: env.ambientLight ?? 0.5,
      mainLight: env.mainLight ?? 0.8,
      fillLight: env.fillLight ?? 0.5,
      hemiLight: env.hemiLight ?? 0.5,
      envIntensity: env.envIntensity ?? 0.8,
      hdri: setting?.backgroundHdri || "/hdr/studio.hdr",
      showHdriBackground: env.showHdriBackground ?? false,
      shaderMode: env.shaderMode || "original",
      metalness: env.metalness ?? 0.1,
      roughness: env.roughness ?? 0.1,
      cameraProjectionMode: env.cameraProjectionMode || "perspective",
      background: env.background || undefined,
    },
    scene: {
      markers: sceneData.markers || [],
      hiddenObjects: sceneData.hiddenObjects || [],
      xrayObjects: sceneData.xrayObjects || [],
      cut: sceneData.cut || { enabled: false, axis: "x", value: 0 },
    },
    playerSettings: setting?.playerSettings || null,
  };
}

/**
 * Fetches everything a content's editor data is made of — content fields,
 * settings (viewer/scene/playerSettings), chapters (+ their media), flows,
 * procedures, object name overrides, project gallery media, and the
 * thumbnail — and maps it all into the shapes the local project record
 * (project.material/viewer/scene) expects. Read-only: never touches
 * IndexedDB. Shared by hydrateProjectFromBackend (below, which persists the
 * result under the source content's own id) and duplicateContentAsNewProject
 * (projectDuplicate.js, which persists it under a brand-new project/content
 * id instead).
 */
export async function fetchContentEditorSnapshot(contentId) {
  // Kicked off alongside the Promise.all below (not inside it) — all three
  // already swallow their own "nothing there" case internally, so none of
  // them should be able to fail the rest of the hydrate.
  const thumbnailPromise = hydrateThumbnail(contentId);
  const projectMediaPromise = hydrateProjectMedia(contentId);
  const additionalModelsPromise = hydrateAdditionalModelDescriptors(contentId);

  const [
    content,
    setting,
    objDescs,
    slideRows,
    flows,
    procedures,
    quizzes,
    overrides,
  ] = await Promise.all([
    getContentDetailRequest({ id: contentId }),
    getContentSettingRequest({ contentId }),
    listContentObjDescsRequest({ contentId }),
    listContentSlidesRequest({ contentId }),
    listContentFlowsRequest({ contentId }),
    listContentProceduresRequest({ contentId }),
    listContentQuizzesRequest({ contentId }),
    listContentObjectNameOverridesRequest({ contentId }),
  ]);

  const { thumbnailDataUrl, thumbnailMediaId, thumbnailHash } =
    await thumbnailPromise;
  const { media: projectMedia, mediaIds } = await projectMediaPromise;
  const additionalModels = await additionalModelsPromise;

  const chapterIds = {};
  const chapters = (objDescs || []).map((desc) => {
    const chapter = mapContentObjDescToChapter(desc);
    chapterIds[chapter.id] = desc.id;
    return chapter;
  });

  // Each chapter's own media, fetched after chapters exist (needs each
  // one's remote objDescId) — mutated in place onto the just-built chapter
  // objects since nothing else references them yet.
  const chapterMediaResults = await Promise.all(
    chapters.map((chapter) => hydrateChapterMedia(chapterIds[chapter.id])),
  );
  const chapterMediaIds = {};
  chapters.forEach((chapter, index) => {
    chapter.media = chapterMediaResults[index].media;
    chapterMediaIds[chapter.id] = chapterMediaResults[index].mediaIds;
  });

  const slideIds = {};
  const slides = (slideRows || [])
    .slice()
    .sort((a, b) => (a?.step ?? 0) - (b?.step ?? 0))
    .map((row) => {
      const slide = mapContentSlideToSlide(row);
      slideIds[slide.id] = row.id;
      return slide;
    });

  const slideMediaResults = await Promise.all(
    slides.map((slide) => hydrateSlideMedia(slideIds[slide.id])),
  );
  const slideMediaIds = {};
  slides.forEach((slide, index) => {
    slide.media = slideMediaResults[index].media;
    slideMediaIds[slide.id] = slideMediaResults[index].mediaIds;
  });

  const flowIds = {};
  const mappedFlows = (flows || []).map((contentFlow) => {
    const flow = mapContentFlowToFlow(contentFlow);
    flowIds[flow.id] = contentFlow.id;
    return flow;
  });

  const procedureIds = {};
  const mappedProcedures = (procedures || []).map((contentProcedure) => {
    const procedure = mapContentProcedureToProcedure(contentProcedure);
    procedureIds[procedure.id] = contentProcedure.id;
    return procedure;
  });

  const quizIds = {};
  const mappedQuizzes = (quizzes || []).map((contentQuiz) => {
    const quiz = mapContentQuizToQuiz(contentQuiz);
    quizIds[quiz.id] = contentQuiz.id;
    return quiz;
  });

  const { viewer, scene, playerSettings } =
    mapContentSettingToViewerAndScene(setting);

  return {
    content,
    chapters,
    chapterIds,
    chapterMediaIds,
    slides,
    slideIds,
    slideMediaIds,
    flows: mappedFlows,
    flowIds,
    procedures: mappedProcedures,
    procedureIds,
    quizzes: mappedQuizzes,
    quizIds,
    overrides: (overrides || []).map(mapContentOverride),
    viewer,
    scene,
    playerSettings,
    projectMedia,
    mediaIds,
    additionalModels,
    thumbnailDataUrl,
    thumbnailMediaId,
    thumbnailHash,
  };
}

/**
 * Pulls a content's editor data down from the backend and writes it into
 * IndexedDB as a normal local project — everything except the GLB itself,
 * which useProjectLoader fetches (and caches) on first open instead. This
 * is what makes a cloud-only project (never opened on this browser before)
 * openable at all: without a local project row, loadProject() has nothing
 * to start from.
 *
 * Idempotent: if this content was already hydrated here, the existing local
 * row is reused as-is rather than overwritten, so it never clobbers edits
 * made since the last hydration.
 *
 * workspaceId is optional — callers that already know it (Workspace/Hub
 * listings) pass it straight through, but an entry point that only has a
 * contentId (e.g. a direct Player link) can omit it and it's read off the
 * fetched content below instead.
 */
export async function hydrateProjectFromBackend({
  workspaceId,
  contentId,
  role = "EDITOR",
}) {
  if (!contentId) {
    throw new Error("contentId is required to hydrate a project.");
  }

  const existing = await getProjectFromIndexedDb(contentId);
  if (existing) return existing;

  const {
    content,
    chapters,
    chapterIds,
    chapterMediaIds,
    slides,
    slideIds,
    slideMediaIds,
    flows: mappedFlows,
    flowIds,
    procedures: mappedProcedures,
    procedureIds,
    quizzes: mappedQuizzes,
    quizIds,
    overrides,
    viewer,
    scene,
    playerSettings,
    projectMedia,
    mediaIds,
    additionalModels,
    thumbnailDataUrl,
    thumbnailMediaId,
    thumbnailHash,
  } = await fetchContentEditorSnapshot(contentId);

  const resolvedWorkspaceId = workspaceId || content?.workspaceId || null;
  const now = new Date().toISOString();

  const project = {
    id: contentId,
    name: content?.title || "Untitled Project",
    role,
    workspace: "Cloud Workspace",
    thumbnail: thumbnailDataUrl || null,

    status: content?.status || "DRAFT",
    publishVersion: content?.publishVersion || null,

    fileName: "",
    fileSize: 0,

    metadata: {
      createdAt: content?.createdAt || now,
      updatedAt: now,
      lastOpenedAt: null,
    },

    remote: {
      workspaceId: resolvedWorkspaceId,
      contentId,
      mediaId: null,
      chapterIds,
      slideIds,
      flowIds,
      procedureIds,
      quizIds,
      chapterMediaIds,
      slideMediaIds,
      mediaIds,
      thumbnailMediaId,
      thumbnailHash,
      lastSyncedAt: now,
    },

    material: {
      id: createId(),
      title: content?.title || "Materi 3D Baru",
      description: content?.description || "",
      version: content?.version || "1.0.0",
      author: content?.author || "",
      thumbnail: thumbnailDataUrl || "",
      availableOnMarketplace: Boolean(content?.availableOnMarketplace),
      categoryId: content?.categoryId || null,
      visibility: content?.visibility || "PRIVATE",
      status: content?.status || "DRAFT",
      publishedAt: content?.publishedAt || null,
      modelUrl: "",
      media: projectMedia,
      additionalModels,
      chapters,
      slides,
      flows: mappedFlows,
      objectNameOverrides: overrides,
      playerSettings: normalizePlayerSettings(playerSettings),
      procedures: mappedProcedures,
      quizzes: mappedQuizzes,
    },

    viewer,
    scene,

    autosave: { status: "SAVED", lastSavedAt: null },
  };

  // No files — the primary GLB and every additional GLB are deliberately
  // not downloaded here, only their metadata/remoteMediaId. useProjectLoader
  // retrieves and caches each one's actual bytes lazily on open (see its
  // findContentModelMedia fallback for the primary model and
  // hydrateMissingAdditionalModelFiles for additional ones).
  await saveProjectToIndexedDb(project, null);

  return project;
}
