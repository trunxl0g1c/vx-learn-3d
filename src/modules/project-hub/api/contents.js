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

// Soft-deleted content, i.e. the workspace's trash — backend-gated to the
// workspace owner (see content/README.md's "Business rules" in vxcubed-be),
// so this 403s for anyone else.
export async function listDeletedContentsRequest({ workspaceId, search } = {}) {
  const response = await apiClient.get("/contents/deleted", {
    params: { workspaceId, search: search || undefined },
  });

  return normalizeContentList(response.data?.data);
}

export async function recoverContentRequest({ id }) {
  const response = await apiClient.post("/contents/recover", { id });

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContentRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

// DELETE /contents is a soft delete — it only sets deletedAt, nothing
// cascades and no files are touched. The content moves to the workspace's
// Trash tab (owner-only) and is recoverable via useRecoverContent() for 2
// days, after which a backend sweep permanently deletes it — cascading to
// content_setting/content_media/content_obj_desc(+their media)/content_flow/
// content_procedure/content_object_name_override/export_job DB rows *and*
// every stored file those rows referenced (model, thumbnail, gallery,
// nested chapter media) — see content.service.ts's purgeExpiredSoftDeletes()
// on the backend.
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

export function useDeletedContents(params = {}, options = {}) {
  return useQuery({
    queryKey: ["contents", "deleted", params],
    queryFn: () => listDeletedContentsRequest(params),
    enabled: Boolean(params.workspaceId),
    ...options,
  });
}

export function useRecoverContent(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recoverContentRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}
