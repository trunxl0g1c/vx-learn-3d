import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

// Backend home of the FE `slides` store — mechanically the same shape as
// contentObjDescs.js's chapter mapping (title -> aliasName, parameters ->
// parameter, markers -> marker, visualState -> stateView, cameraView(s) ->
// cameraView), but its own table (content_slide), with no objParentId/
// objectUuid since slides are a flat, manually-reordered list, not a tree.
export async function listContentSlidesRequest({ contentId }) {
  const response = await apiClient.get("/content-slides", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

export async function createContentSlideRequest(payload) {
  const response = await apiClient.post("/content-slides", payload);

  return response.data?.data;
}

export async function updateContentSlideRequest(payload) {
  const response = await apiClient.put("/content-slides", payload);

  return response.data?.data;
}

export async function deleteContentSlideRequest({ id }) {
  const response = await apiClient.delete("/content-slides", {
    data: { id },
  });

  return response.data?.data;
}
