import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

function normalizeLockList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function acquireContentLockRequest({ contentId }) {
  const response = await apiClient.post("/content-locks/acquire", {
    contentId,
  });

  return response.data?.data;
}

export async function heartbeatContentLockRequest({ contentId }) {
  const response = await apiClient.patch("/content-locks/heartbeat", {
    contentId,
  });

  return response.data?.data;
}

export async function releaseContentLockRequest({ contentId }) {
  const response = await apiClient.delete("/content-locks", {
    data: { contentId },
  });

  return response.data?.data;
}

export async function revokeContentLockRequest({ contentId }) {
  const response = await apiClient.post("/content-locks/revoke", {
    contentId,
  });

  return response.data?.data;
}

export async function listWorkspaceContentLocksRequest({ workspaceId }) {
  const response = await apiClient.get("/content-locks", {
    params: { workspaceId },
  });

  return normalizeLockList(response.data?.data);
}

export async function getContentLockStatusRequest({ contentId }) {
  const response = await apiClient.get("/content-locks/status", {
    params: { contentId },
  });

  return response.data?.data;
}

export function useWorkspaceContentLocks(workspaceId, options = {}) {
  return useQuery({
    queryKey: ["contentLocks", workspaceId],
    queryFn: () => listWorkspaceContentLocksRequest({ workspaceId }),
    enabled: Boolean(workspaceId),
    ...options,
  });
}

export function useAcquireContentLock(options = {}) {
  return useMutation({
    mutationFn: acquireContentLockRequest,
    ...options,
  });
}

export function useReleaseContentLock(options = {}) {
  return useMutation({
    mutationFn: releaseContentLockRequest,
    ...options,
  });
}

export function useRevokeContentLock(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeContentLockRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["contentLocks"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}
