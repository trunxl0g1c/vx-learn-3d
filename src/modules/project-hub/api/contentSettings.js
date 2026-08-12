import apiClient from "../../../lib/apiClient";

export async function getContentSettingRequest({ contentId }) {
  const response = await apiClient.get("/content-settings", {
    params: { contentId },
  });

  return response.data?.data;
}

export async function upsertContentSettingRequest({
  contentId,
  environmentSettings,
  backgroundHdri,
  scene,
  playerSettings,
}) {
  const response = await apiClient.put("/content-settings", {
    contentId,
    environmentSettings,
    backgroundHdri,
    scene,
    playerSettings,
  });

  return response.data?.data;
}
