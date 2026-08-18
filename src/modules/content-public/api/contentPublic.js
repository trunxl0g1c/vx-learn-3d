import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

// Shares created *from* a piece of content — requires edit rights on it.
export async function listOutgoingContentPublicRequest(contentId) {
  const response = await apiClient.get("/content-public/outgoing", {
    params: { contentId },
  });

  return normalizeList(response.data?.data);
}

// Unexpired shares targeting a workspace — any member can see these.
export async function listIncomingContentPublicRequest(workspaceId) {
  const response = await apiClient.get("/content-public/incoming", {
    params: { workspaceId },
  });

  return normalizeList(response.data?.data);
}

// Backend requires the source content to be visibility=PUBLIC and
// status=PUBLISHED before this succeeds — surface the 400 to the caller.
export async function createContentPublicRequest({ contentId, targetWorkspaceId, expiredAt }) {
  const response = await apiClient.post("/content-public", {
    contentId,
    targetWorkspaceId,
    expiredAt: expiredAt || undefined,
  });

  return response.data?.data;
}

export async function updateContentPublicRequest({ id, expiredAt }) {
  const response = await apiClient.put("/content-public", {
    id,
    expiredAt: expiredAt === undefined ? undefined : expiredAt || null,
  });

  return response.data?.data;
}

export async function revokeContentPublicRequest({ id }) {
  const response = await apiClient.delete("/content-public", { data: { id } });

  return response.data?.data;
}

export function useOutgoingContentPublic(contentId, options = {}) {
  return useQuery({
    queryKey: ["content-public", "outgoing", contentId],
    queryFn: () => listOutgoingContentPublicRequest(contentId),
    enabled: Boolean(contentId),
    ...options,
  });
}

export function useIncomingContentPublic(workspaceId, options = {}) {
  return useQuery({
    queryKey: ["content-public", "incoming", workspaceId],
    queryFn: () => listIncomingContentPublicRequest(workspaceId),
    enabled: Boolean(workspaceId),
    ...options,
  });
}

export function useCreateContentPublic(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContentPublicRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["content-public"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useUpdateContentPublic(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateContentPublicRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["content-public"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useRevokeContentPublic(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeContentPublicRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["content-public"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}
