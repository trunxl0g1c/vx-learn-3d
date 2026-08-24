import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

// Nested media attached to a slide (ContentSlide) — separate table from
// content-media, same shape of CRUD + stream as content-obj-desc's media
// sub-routes. See contentObjDescMedia.js for the chapter-side equivalent.
export async function listContentSlideMediaRequest({ contentSlideId }) {
  const response = await apiClient.get("/content-slides/media", {
    params: { contentSlideId },
  });

  return normalizeList(response.data?.data);
}

export async function uploadContentSlideMediaRequest({
  contentSlideId,
  mediaClassification,
  file,
}) {
  const formData = new FormData();
  formData.append("contentSlideId", contentSlideId);
  formData.append("mediaClassification", mediaClassification);
  formData.append("file", file);

  const response = await apiClient.post("/content-slides/media", formData);

  return response.data?.data;
}

export async function deleteContentSlideMediaRequest({ id }) {
  const response = await apiClient.delete("/content-slides/media", {
    data: { id },
  });

  return response.data?.data;
}

export async function fetchContentSlideMediaBlob({ id }) {
  const response = await apiClient.get("/content-slides/media/stream", {
    params: { id },
    responseType: "blob",
  });

  return response.data;
}
