import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function listClassroomsRequest({ workspaceId, search } = {}) {
  const response = await apiClient.get("/classrooms", {
    params: { workspaceId, search: search || undefined },
  });

  return normalizeList(response.data?.data);
}

export async function getClassroomDetailRequest(id) {
  const response = await apiClient.get("/classrooms/detail", {
    params: { id },
  });

  return response.data?.data;
}

export async function createClassroomRequest({ workspaceId, name, description }) {
  const response = await apiClient.post("/classrooms", {
    workspaceId,
    name,
    description: description || undefined,
  });

  return response.data?.data;
}

export async function updateClassroomRequest({ id, name, description }) {
  const response = await apiClient.put("/classrooms", {
    id,
    name,
    description: description || undefined,
  });

  return response.data?.data;
}

export async function deleteClassroomRequest({ id }) {
  const response = await apiClient.delete("/classrooms", { data: { id } });

  return response.data?.data;
}

export async function listClassroomMembersRequest(classroomId) {
  const response = await apiClient.get("/classrooms/members", {
    params: { classroomId },
  });

  return normalizeList(response.data?.data);
}

export async function addClassroomMemberRequest({ classroomId, workspaceMemberId }) {
  const response = await apiClient.post("/classrooms/members", {
    classroomId,
    workspaceMemberId,
  });

  return response.data?.data;
}

export async function removeClassroomMemberRequest({ classroomId, workspaceMemberId }) {
  const response = await apiClient.delete("/classrooms/members", {
    data: { classroomId, workspaceMemberId },
  });

  return response.data?.data;
}

export async function listClassroomContentsRequest(classroomId) {
  const response = await apiClient.get("/classrooms/contents", {
    params: { classroomId },
  });

  return normalizeList(response.data?.data);
}

// Backend rejects unpublished content (status must be PUBLISHED) and content
// from a different workspace — surface the resulting 400 to the caller
// rather than swallowing it.
export async function addClassroomContentRequest({ classroomId, contentId }) {
  const response = await apiClient.post("/classrooms/contents", {
    classroomId,
    contentId,
  });

  return response.data?.data;
}

export async function removeClassroomContentRequest({ classroomId, contentId }) {
  const response = await apiClient.delete("/classrooms/contents", {
    data: { classroomId, contentId },
  });

  return response.data?.data;
}

// Member-facing discovery — every classroom (and the content reachable
// through it) the current user belongs to, across every workspace.
export async function listMyClassroomsRequest() {
  const response = await apiClient.get("/classrooms/my");

  return normalizeList(response.data?.data);
}

export async function listMyClassroomContentsRequest() {
  const response = await apiClient.get("/classrooms/my/contents");

  return normalizeList(response.data?.data);
}

export function useClassrooms(params = {}, options = {}) {
  return useQuery({
    queryKey: ["classrooms", params],
    queryFn: () => listClassroomsRequest(params),
    enabled: Boolean(params.workspaceId),
    ...options,
  });
}

export function useClassroomMembers(classroomId, options = {}) {
  return useQuery({
    queryKey: ["classrooms", "members", classroomId],
    queryFn: () => listClassroomMembersRequest(classroomId),
    enabled: Boolean(classroomId),
    ...options,
  });
}

export function useClassroomContents(classroomId, options = {}) {
  return useQuery({
    queryKey: ["classrooms", "contents", classroomId],
    queryFn: () => listClassroomContentsRequest(classroomId),
    enabled: Boolean(classroomId),
    ...options,
  });
}

export function useMyClassrooms(options = {}) {
  return useQuery({
    queryKey: ["classrooms", "my"],
    queryFn: listMyClassroomsRequest,
    ...options,
  });
}

export function useMyClassroomContents(options = {}) {
  return useQuery({
    queryKey: ["classrooms", "my", "contents"],
    queryFn: listMyClassroomContentsRequest,
    ...options,
  });
}

export function useCreateClassroom(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClassroomRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["classrooms"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useUpdateClassroom(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClassroomRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["classrooms"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useDeleteClassroom(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteClassroomRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["classrooms"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useAddClassroomMember(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addClassroomMemberRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["classrooms", "members", variables.classroomId],
      });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useRemoveClassroomMember(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeClassroomMemberRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["classrooms", "members", variables.classroomId],
      });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useAddClassroomContent(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addClassroomContentRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["classrooms", "contents", variables.classroomId],
      });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useRemoveClassroomContent(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeClassroomContentRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ["classrooms", "contents", variables.classroomId],
      });
      options.onSuccess?.(data, variables, context);
    },
  });
}
