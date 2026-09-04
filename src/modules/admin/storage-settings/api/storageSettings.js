import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../../lib/apiClient";

export async function getStorageSettingsRequest() {
  const response = await apiClient.get("/storage-settings");

  return response.data?.data;
}

export async function updateStorageSettingsRequest(payload) {
  const response = await apiClient.put("/storage-settings", payload);

  return response.data?.data;
}

export function useStorageSettings(options = {}) {
  return useQuery({
    queryKey: ["storage-settings"],
    queryFn: getStorageSettingsRequest,
    ...options,
  });
}

export function useUpdateStorageSettings(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStorageSettingsRequest,
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ["storage-settings"] });
      options.onSuccess?.(data, variables, context);
    },
  });
}
