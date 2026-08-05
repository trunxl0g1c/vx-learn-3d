import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function listContentObjectNameOverridesRequest({ contentId }) {
  const response = await apiClient.get("/content-object-name-overrides", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

// Bulk-replace only — the FE row shape ({path, name, originalName}) has no
// natural per-row id, so the backend deletes every existing row for the
// content and recreates the incoming set in one transaction.
export async function replaceContentObjectNameOverridesRequest({
  contentId,
  overrides,
}) {
  const response = await apiClient.put("/content-object-name-overrides", {
    contentId,
    overrides,
  });

  return response.data?.data;
}
