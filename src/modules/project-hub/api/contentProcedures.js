import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function listContentProceduresRequest({ contentId }) {
  const response = await apiClient.get("/content-procedures", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

export async function createContentProcedureRequest(payload) {
  const response = await apiClient.post("/content-procedures", payload);

  return response.data?.data;
}

export async function updateContentProcedureRequest(payload) {
  const response = await apiClient.put("/content-procedures", payload);

  return response.data?.data;
}

export async function deleteContentProcedureRequest({ id }) {
  const response = await apiClient.delete("/content-procedures", {
    data: { id },
  });

  return response.data?.data;
}
