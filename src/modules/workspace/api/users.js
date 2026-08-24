import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

function normalizeUserList(payload) {
  if (Array.isArray(payload)) return payload;

  return payload?.items || payload?.data || payload?.users || [];
}

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
