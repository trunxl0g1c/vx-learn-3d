const projectionRequestTokens = new WeakMap();

export function getActiveCameraProjectionMode(camera) {
  return camera?.isOrthographicCamera ? "orthographic" : "perspective";
}

export function normalizeRequestedCameraProjectionMode(mode) {
  return mode === "orthographic" ? "orthographic" : "perspective";
}

/**
 * Projection switching in R3F replaces the active camera instance. Saved
 * position/target/zoom must only be applied after that replacement completes.
 */
export function switchCameraProjectionThen({
  cameraRef,
  setViewerSettings,
  mode,
  onReady,
  maxFrames = 60,
} = {}) {
  const requestedMode = normalizeRequestedCameraProjectionMode(mode);
  const token = (projectionRequestTokens.get(cameraRef) || 0) + 1;
  if (cameraRef && typeof cameraRef === "object") {
    projectionRequestTokens.set(cameraRef, token);
  }

  const applyWhenReady = (attempt = 0) => {
    if (
      cameraRef &&
      projectionRequestTokens.get(cameraRef) !== token
    ) {
      return false;
    }
    const camera = cameraRef?.current;
    if (camera && getActiveCameraProjectionMode(camera) === requestedMode) {
      onReady?.(camera);
      return true;
    }

    if (attempt >= maxFrames) return false;
    requestAnimationFrame(() => applyWhenReady(attempt + 1));
    return true;
  };

  if (
    cameraRef?.current &&
    getActiveCameraProjectionMode(cameraRef.current) === requestedMode
  ) {
    onReady?.(cameraRef.current);
    return true;
  }

  if (typeof setViewerSettings !== "function") return false;

  setViewerSettings((previous = {}) =>
    previous.cameraProjectionMode === requestedMode
      ? previous
      : { ...previous, cameraProjectionMode: requestedMode },
  );
  requestAnimationFrame(() => applyWhenReady());
  return true;
}
