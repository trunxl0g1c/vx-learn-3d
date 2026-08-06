import { useMutation } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

export async function loginRequest({ email, password }) {
  const response = await apiClient.post("/auth/login", {
    email,
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
