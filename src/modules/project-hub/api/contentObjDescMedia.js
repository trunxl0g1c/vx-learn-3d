import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

// Nested media attached to a chapter (ContentObjDesc) — separate table from
// content-media, same shape of CRUD + stream. See ChapterMediaSection.jsx
// for the local (chapter.media) side of this.
export async function listContentObjDescMediaRequest({ contentObjDescId }) {
  const response = await apiClient.get("/content-obj-descs/media", {
    params: { contentObjDescId },
  });

  return normalizeList(response.data?.data);
}

export async function uploadContentObjDescMediaRequest({
  contentObjDescId,
  mediaClassification,
  file,
}) {
  const formData = new FormData();
  formData.append("contentObjDescId", contentObjDescId);
  formData.append("mediaClassification", mediaClassification);
  formData.append("file", file);

  const response = await apiClient.post("/content-obj-descs/media", formData);

  return response.data?.data;
}

export async function deleteContentObjDescMediaRequest({ id }) {
  const response = await apiClient.delete("/content-obj-descs/media", {
    data: { id },
  });

  return response.data?.data;
}

// Was upload-only until now — GET /content-obj-descs/media/stream mirrors
// GET /content-media/stream (see contentMedia.js's fetchContentMediaBlob).
export async function fetchContentObjDescMediaBlob({ id }) {
  const response = await apiClient.get("/content-obj-descs/media/stream", {
    params: { id },
    responseType: "blob",
  });

  return response.data;
}
