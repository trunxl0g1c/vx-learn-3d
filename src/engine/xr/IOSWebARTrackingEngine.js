import { loadZapparWebAR } from "./ZapparWebARLoader";

function isSecureBrowserContext() {
  if (typeof window === "undefined") return false;
  return Boolean(window.isSecureContext);
}

function canUseBrowserRuntime() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function supportsIOSWebARTracking() {
  return canUseBrowserRuntime() && isSecureBrowserContext();
}

/**
 * iOS tracked WebAR coordinator.
 *
 * Important: camera rendering and Instant World Tracking are owned by the
 * official @zappar/zappar-react-three-fiber components inside the R3F tree.
 * This engine only owns capability/permission/session state so the Player UI
 * stays decoupled from Zappar/Three rendering details.
 */
export function createIOSWebARTrackingEngine() {
  let sdk = null;
  let renderer = null;
  let active = false;
  let ready = false;
  let placed = false;
  let loading = false;
  let compatibilityChecked = false;
  let incompatible = false;
  let cameraFrameReady = false;
  let lastError = "";
  const listeners = new Set();

  const snapshot = () => ({
    available: supportsIOSWebARTracking(),
    active,
    ready,
    placed,
    placementMode: active && !placed,
    loading,
    incompatible,
    cameraFrameReady,
    error: lastError,
  });

  const emit = () => {
    const state = snapshot();
    listeners.forEach((listener) => listener(state));
  };

  const preload = async () => {
    if (!supportsIOSWebARTracking()) {
      throw new Error("Tracked iPhone/iPad WebAR requires a trusted HTTPS page.");
    }
    if (ready && sdk) return true;

    loading = true;
    lastError = "";
    emit();

    try {
      sdk = await loadZapparWebAR();
      if (!compatibilityChecked) {
        compatibilityChecked = true;
        incompatible = Boolean(sdk.browserIncompatible?.());
      }

      if (incompatible) {
        throw new Error(
          "This iPhone/iPad browser does not support the camera/motion features required for world-tracked WebAR. Use current Safari.",
        );
      }

      ready = true;
      return true;
    } catch (error) {
      ready = false;
      lastError = error?.message || "Unable to prepare world-tracked WebAR.";
      throw error;
    } finally {
      loading = false;
      emit();
    }
  };

  const setRenderer = (nextRenderer) => {
    renderer = nextRenderer || null;
    emit();
  };

  const start = async () => {
    if (!supportsIOSWebARTracking()) {
      throw new Error("Tracked iPhone/iPad WebAR requires HTTPS and a secure browser context.");
    }
    if (!renderer) {
      throw new Error("The 3D Player is still loading. Wait for the model, then start XR again.");
    }

    if (!ready || !sdk) {
      await preload();
      throw new Error(
        "World tracking is ready. Tap Start iPhone/iPad XR once more to grant Camera and Motion access.",
      );
    }

    if (active) return true;

    lastError = "";
    const requestPermission = sdk.permissionRequest || sdk.permissionRequestUI;
    if (typeof requestPermission !== "function") {
      throw new Error("The Zappar SDK does not expose its permission API.");
    }

    let granted = false;
    try {
      granted = await requestPermission();
    } catch (permissionError) {
      throw new Error(
        permissionError?.message || "Camera or motion permission could not be requested.",
      );
    }

    if (!granted) {
      throw new Error(
        "Camera or motion permission was denied. Allow Camera and Motion & Orientation access, then try again.",
      );
    }

    active = true;
    placed = false;
    cameraFrameReady = false;
    emit();
    return true;
  };

  const markCameraFrameReady = () => {
    if (!active || cameraFrameReady) return false;
    cameraFrameReady = true;
    lastError = "";
    emit();
    return true;
  };

  const reportCameraError = (message) => {
    lastError = String(message || "Unable to start the iPhone/iPad AR camera.");
    emit();
  };

  const confirmPlacement = () => {
    if (!active) return false;
    placed = true;
    emit();
    return true;
  };

  const resetPlacement = () => {
    if (!active) return false;
    placed = false;
    emit();
    return true;
  };

  const stop = () => {
    active = false;
    placed = false;
    cameraFrameReady = false;
    lastError = "";
    emit();
    return true;
  };

  return {
    isAvailable: supportsIOSWebARTracking,
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    getState: snapshot,
    setRenderer,
    preload,
    start,
    markCameraFrameReady,
    reportCameraError,
    confirmPlacement,
    resetPlacement,
    stop,
    dispose() {
      active = false;
      placed = false;
      cameraFrameReady = false;
      renderer = null;
      sdk = null;
      ready = false;
      loading = false;
      listeners.clear();
    },
  };
}

export default createIOSWebARTrackingEngine;
