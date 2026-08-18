import apiClient from "../../../lib/apiClient";

export async function fetchMe() {
  const response = await apiClient.get("/auth/me");

  return response.data?.data ?? null;
}
