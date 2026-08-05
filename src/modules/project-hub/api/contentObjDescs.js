import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

// Backend home of the FE `chapters` store. Field mapping (per the API's own
// docs): title -> aliasName, parameters -> folded into `parameter`, markers
// -> marker, visualState -> stateView. objectUuid is the only chapter field
// promoted to its own column; objectName/objectPath/modelRotation/
// animations/callouts/flow-ids all fold into `parameter` instead, and
// cameraView/cameraViews/cameraViewSaved/cameraPosition/cameraTarget all
// fold into the `cameraView` JSON blob.
export async function listContentObjDescsRequest({ contentId }) {
  const response = await apiClient.get("/content-obj-descs", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

export async function createContentObjDescRequest(payload) {
  const response = await apiClient.post("/content-obj-descs", payload);

  return response.data?.data;
}

export async function updateContentObjDescRequest(payload) {
  const response = await apiClient.put("/content-obj-descs", payload);

  return response.data?.data;
}

export async function deleteContentObjDescRequest({ id }) {
  const response = await apiClient.delete("/content-obj-descs", {
    data: { id },
  });

  return response.data?.data;
}
