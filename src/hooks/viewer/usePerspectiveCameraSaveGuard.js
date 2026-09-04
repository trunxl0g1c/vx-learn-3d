import { useCallback } from "react";
import { useAlert } from "../../components/dialog/AlertContext";
import {
  ORTHOGRAPHIC_CAMERA_SAVE_NOTICE,
  PERSPECTIVE_CAMERA_SAVE_WARNING,
  isOrthographicViewerCamera,
} from "../../engine/viewer";

export function usePerspectiveCameraSaveGuard({
  cameraRef = null,
  cameraProjectionMode = null,
  onSwitchToPerspective = null,
} = {}) {
  const { showAlert } = useAlert();

  const isOrthographicCameraActive = useCallback(
    () => {
      if (cameraRef?.current) {
        return isOrthographicViewerCamera(cameraRef.current);
      }

      return cameraProjectionMode === "orthographic";
    },
    [cameraProjectionMode, cameraRef],
  );

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

  const showOrthographicCameraSaveNotice = useCallback(() => {
    showAlert({
      title: "Kamera Orthographic",
      message: ORTHOGRAPHIC_CAMERA_SAVE_NOTICE,
      type: "warning",
      confirmText: "Mengerti",
      showCloseButton: true,
      closeOnBackdrop: true,
      onConfirm: () => {},
    });
  }, [showAlert]);

  const notifyIfOrthographicCameraSaved = useCallback(() => {
    if (!isOrthographicCameraActive()) return false;

    showOrthographicCameraSaveNotice();
    return true;
  }, [isOrthographicCameraActive, showOrthographicCameraSaveNotice]);

  const requirePerspectiveCameraForSave = useCallback(() => {
    if (!isOrthographicCameraActive()) return true;

    showPerspectiveCameraSaveWarning();
    return false;
  }, [isOrthographicCameraActive, showPerspectiveCameraSaveWarning]);

  return {
    requirePerspectiveCameraForSave,
    showPerspectiveCameraSaveWarning,
    showOrthographicCameraSaveNotice,
    notifyIfOrthographicCameraSaved,
  };
}

export default usePerspectiveCameraSaveGuard;
