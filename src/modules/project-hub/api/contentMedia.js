import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function listContentMediaRequest({ contentId }) {
  const response = await apiClient.get("/content-media", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

export async function findContentModelMedia({ contentId }) {
  if (!contentId) return null;

  const media = await listContentMediaRequest({ contentId });

  return media.find((item) => item.mediaClassification === "MODEL") || null;
}

export async function findContentImageMedia({ contentId }) {
  if (!contentId) return [];

  const media = await listContentMediaRequest({ contentId });

  return media.filter((item) => item.mediaClassification === "IMAGE");
}

// Generic content-asset upload — POST /content-media, the same route (and
// same size cap: 200MB) any content media goes through regardless of
// classification. Used directly (no chunking) for small assets like
// thumbnails; the GLB model instead goes through the chunked flow in
// api/uploads.js since it can be far larger.
export async function uploadContentMediaRequest({
  contentId,
  mediaClassification,
  file,
}) {
  const formData = new FormData();
  formData.append("contentId", contentId);
  formData.append("mediaClassification", mediaClassification);
  formData.append("file", file);

  const response = await apiClient.post("/content-media", formData);

  return response.data?.data;
}

export async function deleteContentMediaRequest({ id }) {
  const response = await apiClient.delete("/content-media", { data: { id } });

  return response.data?.data;
}

// "Retrieve GLB from storage to local DB": fetch the file's bytes once
// (server reads it from R2/local storage, hands it back) so the caller can
// cache it into IndexedDB — every open after that is the fast, offline
// local-blob path instead of a repeat network fetch.
//
// onProgress(loadedBytes, totalBytes) fires as the download streams in —
// totalBytes is 0 when the server didn't send a Content-Length. Callers use
// this to show real download progress instead of a blind spinner, since this
// request is the one that actually takes a while on a cold (never-opened-
// on-this-browser) project.
export async function fetchContentMediaBlob({ id, onProgress }) {
  const response = await apiClient.get("/content-media/stream", {
    params: { id },
    responseType: "blob",
    onDownloadProgress: onProgress
      ? (progressEvent) => {
          onProgress(progressEvent.loaded, progressEvent.total || 0);
        }
      : undefined,
  });

  return response.data;
}
