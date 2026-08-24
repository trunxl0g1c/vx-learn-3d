import { useCallback } from "react";
import { useAlert } from "../../components/dialog/AlertContext";
import {
  PERSPECTIVE_CAMERA_SAVE_WARNING,
  isOrthographicViewerCamera,
} from "../../engine/viewer";

export function usePerspectiveCameraSaveGuard({
  cameraRef = null,
  cameraProjectionMode = null,
  onSwitchToPerspective = null,
} = {}) {
  const { showAlert } = useAlert();

  const showPerspectiveCameraSaveWarning = useCallback(() => {
    showAlert({
      title: "Perspective Diperlukan",
      message: PERSPECTIVE_CAMERA_SAVE_WARNING,
      type: "warning",
      confirmText: "Ubah ke Perspective",
      showCloseButton: true,
      closeOnBackdrop: false,
      onConfirm: () => onSwitchToPerspective?.("perspective"),
    });
  }, [onSwitchToPerspective, showAlert]);

  const requirePerspectiveCameraForSave = useCallback(() => {
    const orthographic =
      cameraProjectionMode === "orthographic" ||
      isOrthographicViewerCamera(cameraRef?.current);

    if (!orthographic) return true;

    showPerspectiveCameraSaveWarning();
    return false;
  }, [
    cameraProjectionMode,
    cameraRef,
    showPerspectiveCameraSaveWarning,
  ]);

  return {
    requirePerspectiveCameraForSave,
    showPerspectiveCameraSaveWarning,
  };
}

export default usePerspectiveCameraSaveGuard;
