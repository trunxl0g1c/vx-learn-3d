import axios from "axios";
import { decryptJsonEnvelope, decryptToBlob } from "./responseEncryption";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4002";

try {
  new URL(API_URL);
} catch {
  console.error(
    `VITE_API_URL is not a valid absolute URL: ${JSON.stringify(API_URL)}. ` +
      "It must include a scheme (e.g. https://api.example.com) — thumbnail/media URLs will silently fail until this is fixed.",
  );
}

export const API_BASE_URL = API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

// Shared across every failed request so concurrent 401s (e.g. several
// TanStack Query hooks firing around the same time the access token expires)
// all await the same refresh call instead of each calling POST /auth/refresh
// independently — the refresh token rotates on use, so a second concurrent
// call would see the first one's already-consumed token and fail.
let refreshPromise = null;

function refreshAccessToken() {
  refreshPromise ??= axios
    .post(`${API_URL}/auth/refresh`, null, { withCredentials: true })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.response.use(
  async (response) => {
    response.data =
      response.config.responseType === "blob"
        ? await decryptToBlob(
            response.data,
            response.headers["x-plaintext-content-type"],
          )
        : await decryptJsonEnvelope(response.data);
    return response;
  },
  async (error) => {
    const config = error.config;
    const isAuthRoute =
      config?.url?.includes("/auth/login") ||
      config?.url?.includes("/auth/register") ||
      config?.url?.includes("/auth/refresh");

    if (error.response?.data) {
      error.response.data = await decryptJsonEnvelope(
        error.response.data,
      ).catch(() => error.response.data);
    }

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      isAuthRoute
    ) {
      throw error;
    }

    config._retried = true;

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw error;
    }

    return apiClient(config);
  },
);

export default apiClient;
