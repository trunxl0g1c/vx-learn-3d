import { useMutation } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

export async function updateProfileRequest({ name }) {
  const response = await apiClient.put("/auth/me", { name });

  return response.data?.data;
}

export function useUpdateProfile(options = {}) {
  return useMutation({
    mutationFn: updateProfileRequest,
    ...options,
  });
}
