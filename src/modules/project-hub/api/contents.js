import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient, { API_BASE_URL } from "../../../lib/apiClient";

function normalizeContentList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || payload?.contents || [];
}

export async function listContentsRequest({
  workspaceId,
  search,
  page = 1,
  pageSize = 20,
} = {}) {
  const response = await apiClient.get("/contents", {
    params: {
      workspaceId,
      search: search || undefined,
      page,
      pageSize,
    },
  });

  return normalizeContentList(response.data?.data);
}

export async function getContentDetailRequest({ id }) {
  const response = await apiClient.get("/contents/detail", {
    params: { id },
  });

  return response.data?.data;
}

export async function createContentRequest({
  workspaceId,
  title,
  description,
  autoShowDescription = false,
  version,
  author,
  availableOnMarketplace,
  status,
}) {
  const response = await apiClient.post("/contents", {
    workspaceId,
    title,
    description: description || undefined,
    autoShowDescription,
    version: version || undefined,
    author: author || undefined,
    availableOnMarketplace,
    status: status || undefined,
  });

  return response.data?.data;
}

export async function deleteContentRequest({ id }) {
  const response = await apiClient.delete("/contents", { data: { id } });

  return response.data?.data;
}

// Full update — does not accept importedAt/sourcePackageName (create-only)
// or lastOpenedAt (use patchContentLastOpenedRequest).
export async function updateContentRequest({
  id,
  title,
  description,
  autoShowDescription,
  status,
  publishVersion,
  version,
  author,
  availableOnMarketplace,
}) {
  const response = await apiClient.put("/contents", {
    id,
    title,
    description: description || undefined,
    autoShowDescription,
    status: status || undefined,
    publishVersion,
    version: version || undefined,
    author: author || undefined,
    availableOnMarketplace,
  });

  return response.data?.data;
}

// Plain authenticated GET that streams the content's latest IMAGE media
// straight through — same "resource-scoped, no presigning" pattern as
// getWorkspaceThumbnailUrl. `version` (e.g. the content's modifiedAt) busts
// the browser cache when a new thumbnail replaces an old one at this URL.
export function getContentThumbnailUrl(contentId, version) {
  if (!contentId) return "";

  const url = new URL("/contents/thumbnail", API_BASE_URL);
  url.searchParams.set("id", contentId);
  if (version) url.searchParams.set("v", version);

  return url.toString();
}

export async function patchContentLastOpenedRequest({ id }) {
  const response = await apiClient.patch("/contents/last-opened", { id });

  return response.data?.data;
}

export function useContents(params = {}, options = {}) {
  return useQuery({
    queryKey: ["contents", params],
    queryFn: () => listContentsRequest(params),
    enabled: Boolean(params.workspaceId),
    ...options,
  });
}

export function useCreateContent(options = {}) {
  return useMutation({
    mutationFn: createContentRequest,
    ...options,
  });
}

// DELETE /contents is a hard delete that already cascades content_setting/
// content_media/content_obj_desc(+their media)/content_flow/
// content_procedure/content_object_name_override/export_job DB rows *and*
// deletes every stored file those rows referenced (model, thumbnail,
// gallery, nested chapter media) — see content.service.ts on the backend.
// Deleting those child resources individually from the frontend first is
// both redundant and actively wrong: content-obj-desc rejects with 400 if
// it still has children, so deleting a parent chapter ahead of its nested
// children (unordered, e.g. via Promise.all) breaks the whole operation.
export function useDeleteContent(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteContentRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}
