import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || [];
}

export async function listCategoriesRequest({ search, page = 1, pageSize = 100 } = {}) {
  const response = await apiClient.get("/categories", {
    params: { search: search || undefined, page, pageSize },
  });

  return normalizeList(response.data?.data);
}

export async function getCategoryDetailRequest(id) {
  const response = await apiClient.get("/categories/detail", {
    params: { id },
  });

  return response.data?.data;
}

export async function createCategoryRequest({ name, slug }) {
  const response = await apiClient.post("/categories", { name, slug });

  return response.data?.data;
}

export async function updateCategoryRequest({ id, name, slug }) {
  const response = await apiClient.put("/categories", { id, name, slug });

  return response.data?.data;
}

export async function deleteCategoryRequest({ id }) {
  const response = await apiClient.delete("/categories", { data: { id } });

  return response.data?.data;
}

// category:read is granted to every role — every user needs this list to
// populate the category select when creating/editing content. Only
// category:manage (Admin-only) can reach the mutations below.
export function useCategories(params = {}, options = {}) {
  return useQuery({
    queryKey: ["categories", params],
    queryFn: () => listCategoriesRequest(params),
    ...options,
  });
}

export function useCreateCategory(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategoryRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useUpdateCategory(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategoryRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}

export function useDeleteCategory(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategoryRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}
