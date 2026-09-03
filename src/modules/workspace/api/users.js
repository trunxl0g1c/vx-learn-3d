import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

function normalizeUserList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || payload?.users || [];
}

// GET /users is a search+paginate endpoint (GetUsersDto) but every caller in
// this app just requests a generous pageSize and relies on the debounced
// search box — no page-number UI exists anywhere yet.
export async function searchUsersRequest({ search, page = 1, pageSize = 20 } = {}) {
  const response = await apiClient.get("/users", {
    params: {
      search: search || undefined,
      page,
      pageSize,
    },
  });

  return normalizeUserList(response.data?.data);
}

export function useSearchUsers(params = {}, options = {}) {
  return useQuery({
    queryKey: ["users", "search", params],
    queryFn: () => searchUsersRequest(params),
    ...options,
  });
}

// Admin "add user" flow: creates the account and grants it editor/viewer
// access to a chosen workspace in one step (POST /users/invite) — checked
// server-side against the license's seat limits before the account is even
// created (see vxcubed-be's UserService.createWithWorkspaceAssignment /
// WorkspaceAccessService.assertSeatAvailable). A seat-limit rejection comes
// back as a 403 with a human-readable message in response.data.message,
// same shape as every other license-limit error in this app.
export async function createUserWithWorkspaceRequest({
  name,
  email,
  password,
  workspaceId,
  roleInWorkspace,
}) {
  const response = await apiClient.post("/users/invite", {
    name,
    email,
    password,
    workspaceId,
    roleInWorkspace,
  });

  return response.data?.data;
}

export function useCreateUserWithWorkspace(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUserWithWorkspaceRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({
        queryKey: ["workspaces", "members", variables.workspaceId],
      });
      queryClient.invalidateQueries({ queryKey: ["license", "status"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export async function getUserRolesRequest() {
  const response = await apiClient.get("/users/roles");

  return response.data?.data || [];
}

export function useUserRoles(options = {}) {
  return useQuery({
    queryKey: ["users", "roles"],
    queryFn: getUserRolesRequest,
    staleTime: 60_000,
    ...options,
  });
}

export async function updateUserRequest({ id, name, roleId }) {
  const response = await apiClient.put("/users", { id, name, roleId });

  return response.data?.data;
}

export function useUpdateUser(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export async function changeUserPasswordRequest({ id, password }) {
  const response = await apiClient.patch("/users/password", { id, password });

  return response.data?.data;
}

export function useChangeUserPassword(options = {}) {
  return useMutation({
    mutationFn: changeUserPasswordRequest,
    ...options,
  });
}

// PATCH /users/status only flips User.isActive — it deliberately does not
// touch WorkspaceMember rows, so a deactivated user still counts against the
// license's max_user_editor/max_user_viewer seat usage (see vxcubed-be's
// UserService.setActiveStatus doc comment). Only useDeleteUser below
// actually frees a seat.
export async function setUserActiveStatusRequest({ id, isActive }) {
  const response = await apiClient.patch("/users/status", { id, isActive });

  return response.data?.data;
}

export function useSetUserActiveStatus(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setUserActiveStatusRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export async function deleteUserRequest({ id }) {
  const response = await apiClient.delete("/users", { data: { id } });

  return response.data?.data;
}

export function useDeleteUser(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUserRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["license", "status"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}
