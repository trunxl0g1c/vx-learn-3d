import { useMutation } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

export async function registerRequest({ name, email, password }) {
  const response = await apiClient.post("/auth/register", {
    name,
    email,
    password,
  });

  return response.data?.data;
}

export function useRegister(options = {}) {
  return useMutation({
    mutationFn: registerRequest,
    ...options,
  });
}
