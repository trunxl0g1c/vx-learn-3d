import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function listContentQuizzesRequest({ contentId }) {
  const response = await apiClient.get("/content-quizzes", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

export async function createContentQuizRequest(payload) {
  const response = await apiClient.post("/content-quizzes", payload);

  return response.data?.data;
}

export async function updateContentQuizRequest(payload) {
  const response = await apiClient.put("/content-quizzes", payload);

  return response.data?.data;
}

export async function deleteContentQuizRequest({ id }) {
  const response = await apiClient.delete("/content-quizzes", {
    data: { id },
  });

  return response.data?.data;
}
