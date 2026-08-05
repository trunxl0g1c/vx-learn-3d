import {
  createEditorPlayerPath,
  navigateReservedPlayerWindow,
  releaseReservedPlayerWindow,
  reservePlayerPreviewWindow,
} from "../../utils/playerWindowNavigation";

export async function launchPlayerPreview({
  projectId,
  savePreviewDraft,
  setSaveStatus,
  updateLoading,
  hideLoading,
  navigate,
  markSaveError,
}) {
  const reservedWindow = reservePlayerPreviewWindow(projectId);

  try {
    setSaveStatus("saving");
    updateLoading({
      title: "Opening Player Preview",
      text: "Saving latest editor draft...",
      progress: null,
    });

    await savePreviewDraft();

    updateLoading({
      text: reservedWindow
        ? "Opening Player in a new tab..."
        : "Popup was blocked. Opening Player in this tab...",
    });

    const playerPath = createEditorPlayerPath(projectId);

    if (navigateReservedPlayerWindow(reservedWindow, playerPath)) {
      hideLoading();
      return;
    }

    navigate(playerPath, {
      state: {
        preview: true,
        fromEditor: true,
      },
    });
  } catch (error) {
    releaseReservedPlayerWindow(reservedWindow);
    console.error("Gagal membuka preview player:", error);
    markSaveError();

    updateLoading({
      title: "Failed to Open Preview",
      text: error?.message || "Unknown error",
      progress: null,
    });

    setTimeout(() => {
      hideLoading();
    }, 1200);
  }
}
