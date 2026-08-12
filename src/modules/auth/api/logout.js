import { useMutation } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

export async function logoutRequest() {
  await apiClient.post("/auth/logout");
}

export function useLogout(options = {}) {
  return useMutation({
    mutationFn: logoutRequest,
    ...options,
  });
}
