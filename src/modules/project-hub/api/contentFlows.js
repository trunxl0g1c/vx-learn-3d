import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function listContentFlowsRequest({ contentId }) {
  const response = await apiClient.get("/content-flows", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

export async function createContentFlowRequest(payload) {
  const response = await apiClient.post("/content-flows", payload);

  return response.data?.data;
}

export async function updateContentFlowRequest(payload) {
  const response = await apiClient.put("/content-flows", payload);

  return response.data?.data;
}

export async function deleteContentFlowRequest({ id }) {
  const response = await apiClient.delete("/content-flows", { data: { id } });

  return response.data?.data;
}
