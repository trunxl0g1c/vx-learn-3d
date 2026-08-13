import apiClient from "../../../lib/apiClient";
import { getProjectFromIndexedDb } from "../storage/projectIndexedDb";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function createContentQuizAttemptRequest(payload) {
  const response = await apiClient.post("/content-quiz-attempts", payload);

  return response.data?.data;
}

// The caller's own attempts for one quiz — unpaginated, bounded by the
// quiz's maxAttempts setting.
export async function listContentQuizAttemptsRequest({ contentQuizId }) {
  const response = await apiClient.get("/content-quiz-attempts", {
    params: { contentQuizId },
  });

  return normalizeList(response.data?.data);
}

// Instructor/grading view — every learner's attempts for one quiz,
// paginated. Returns the raw { items, meta } envelope.
export async function listAllContentQuizAttemptsRequest({
  contentQuizId,
  userId,
  page,
  pageSize,
}) {
  const response = await apiClient.get("/content-quiz-attempts/all", {
    params: { contentQuizId, userId, page, pageSize },
  });

  return response.data?.data;
}

// Best-effort push of a just-completed attempt, mirroring projectSync.js's
// "local result is truth, backend write is fire-and-forget" convention.
// No-ops (not an error) if this project/quiz was never synced to the
// backend yet — there is nothing to attach the attempt to.
export async function submitQuizAttemptToBackend({
  projectId,
  quiz,
  answers,
  result,
}) {
  if (!projectId || !quiz?.id || !result) return null;

  try {
    const project = await getProjectFromIndexedDb(projectId);
    const contentQuizId = project?.remote?.quizIds?.[quiz.id];

    if (!contentQuizId) return null;

    return await createContentQuizAttemptRequest({
      contentQuizId,
      score: result.score,
      earnedPoints: result.earnedPoints,
      totalPoints: result.totalPoints,
      correctCount: result.correctCount,
      questionCount: result.questionCount,
      durationSeconds: result.durationSeconds ?? undefined,
      timedOut: Boolean(result.timedOut),
      answers: answers || {},
      questionResults: result.questionResults || [],
    });
  } catch (error) {
    console.error("Failed to submit quiz attempt:", error);
    return null;
  }
}
