import { normalizeBlinkSelectionSettings } from "../../engine/selection";

const VIEWER_LIGHTING_DEFAULTS = Object.freeze({
  exposure: 0.75,
  ambientLight: 0.5,
  mainLight: 0.8,
  fillLight: 0.5,
  hemiLight: 0.5,
  envIntensity: 0.8,
  metalness: 0.1,
  roughness: 0.1,
});

export function normalizeLoadedViewerSettings(viewer = {}) {
  const normalizedViewer = {
    ...(viewer || {}),
  };

  Object.entries(VIEWER_LIGHTING_DEFAULTS).forEach(([key, fallback]) => {
    const numericValue = Number(normalizedViewer[key]);

    normalizedViewer[key] = Number.isFinite(numericValue)
      ? numericValue
      : fallback;
  });

  if (normalizedViewer.shaderMode === "enhanced") {
    normalizedViewer.shaderMode = "original";
  }

  normalizedViewer.cameraProjectionMode =
    normalizedViewer.cameraProjectionMode === "orthographic"
      ? "orthographic"
      : "perspective";
  normalizedViewer.blinkSettings = normalizeBlinkSelectionSettings(
    normalizedViewer.blinkSettings,
  );

  return normalizedViewer;
}

export default normalizeLoadedViewerSettings;
