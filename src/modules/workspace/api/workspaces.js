import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient, { API_BASE_URL } from "../../../lib/apiClient";

function normalizeWorkspaceList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || payload?.workspaces || [];
}

function normalizeMemberList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || payload?.members || [];
}

export async function listWorkspacesRequest({
  search,
  page = 1,
  pageSize = 50,
} = {}) {
  const response = await apiClient.get("/workspaces", {
    params: {
      search: search || undefined,
      page,
      pageSize,
    },
  });

  return normalizeWorkspaceList(response.data?.data);
}

export async function getWorkspaceDetailRequest(id) {
  const response = await apiClient.get("/workspaces/detail", {
    params: { id },
  });

  return response.data?.data;
}

export async function createWorkspaceRequest({ name, slug, description }) {
  const response = await apiClient.post("/workspaces", {
    name,
    slug,
    description: description || undefined,
  });

  return response.data?.data;
}

export async function updateWorkspaceRequest({ id, name, description }) {
  const response = await apiClient.put("/workspaces", {
    id,
    name,
    description: description || undefined,
  });

  return response.data?.data;
}

// Resource-scoped (workspace:read-gated) rather than a raw storage-key
// lookup — `version` (e.g. the workspace's modifiedAt) busts the browser
// cache when a new thumbnail replaces an old one at the same URL.
export function getWorkspaceThumbnailUrl(id, version) {
  if (!id) return "";

  try {
    const url = new URL("/workspaces/thumbnail", API_BASE_URL);
    url.searchParams.set("id", id);
    if (version) url.searchParams.set("v", version);

    return url.toString();
  } catch {
    return "";
  }
}

export async function uploadWorkspaceThumbnailRequest({ id, file }) {
  const formData = new FormData();
  formData.append("id", id);
  formData.append("file", file);

  const response = await apiClient.post("/workspaces/thumbnail", formData);

  return response.data?.data;
}

export async function listWorkspaceMembersRequest(id) {
  const response = await apiClient.get("/workspaces/members", {
    params: { id },
  });

  return normalizeMemberList(response.data?.data);
}

export async function addWorkspaceMemberRequest({
  workspaceId,
  userId,
  roleInWorkspace,
}) {
  const response = await apiClient.post("/workspaces/members", {
    workspaceId,
    userId,
    roleInWorkspace,
  });

  return response.data?.data;
}

export async function removeWorkspaceMemberRequest({ workspaceId, userId }) {
  const response = await apiClient.delete("/workspaces/members", {
    data: { workspaceId, userId },
  });

  return response.data?.data;
}

export function useWorkspaces(params = {}, options = {}) {
  return useQuery({
    queryKey: ["workspaces", params],
    queryFn: () => listWorkspacesRequest(params),
    ...options,
  });
}

export function useWorkspaceDetail(id, options = {}) {
  return useQuery({
    queryKey: ["workspaces", "detail", id],
    queryFn: () => getWorkspaceDetailRequest(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useWorkspaceMembers(id, options = {}) {
  return useQuery({
    queryKey: ["workspaces", "members", id],
    queryFn: () => listWorkspaceMembersRequest(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useCreateWorkspace(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createWorkspaceRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useUpdateWorkspace(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateWorkspaceRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useUploadWorkspaceThumbnail(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadWorkspaceThumbnailRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useAddWorkspaceMember(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addWorkspaceMemberRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["workspaces", "members", variables.workspaceId],
      });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useRemoveWorkspaceMember(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeWorkspaceMemberRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["workspaces", "members", variables.workspaceId],
      });
      options.onSuccess?.(data, variables, context);
    },
  });
}
