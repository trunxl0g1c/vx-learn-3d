import { useMutation } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

export async function loginRequest({ username, password }) {
  const response = await apiClient.post("/auth/login", {
    username,
    password,
  });

  return response.data?.data;
}

export function useLogin(options = {}) {
  return useMutation({
    mutationFn: loginRequest,
    ...options,
  });
}
