export const DEFAULT_VIEWER_BACKGROUND = {
  type: "radialGradient",
  solidColor: "#0f172a",
  centerColor: "#2a2a2a",
  edgeColor: "#0d0d0d",
  intensity: 1,
};

function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.min(max, Math.max(min, numericValue));
}

export function normalizeViewerBackground(background = {}) {
  const source = background || {};
  const type =
    source.type === "solid" || source.type === "radialGradient"
      ? source.type
      : DEFAULT_VIEWER_BACKGROUND.type;

  return {
    type,
    solidColor: isValidHexColor(source.solidColor)
      ? source.solidColor
      : DEFAULT_VIEWER_BACKGROUND.solidColor,
    centerColor: isValidHexColor(source.centerColor)
      ? source.centerColor
      : DEFAULT_VIEWER_BACKGROUND.centerColor,
    edgeColor: isValidHexColor(source.edgeColor)
      ? source.edgeColor
      : DEFAULT_VIEWER_BACKGROUND.edgeColor,
    intensity: clampNumber(
      source.intensity,
      0,
      2,
      DEFAULT_VIEWER_BACKGROUND.intensity,
    ),
  };
}

export function getViewerBackground(viewerSettings = {}) {
  return normalizeViewerBackground(viewerSettings?.background);
}

export function getViewerBackgroundCss(viewerSettings = {}) {
  const background = getViewerBackground(viewerSettings);

  if (background.type === "solid") {
    return background.solidColor;
  }

  const innerStop = Math.round(8 + background.intensity * 12);
  const outerStart = Math.round(42 + background.intensity * 12);

  return [
    "radial-gradient(circle at center,",
    `${background.centerColor} 0%,`,
    `${background.centerColor} ${innerStop}%,`,
    `${background.edgeColor} ${outerStart}%,`,
    `${background.edgeColor} 100%)`,
  ].join(" ");
}

export function getViewerBackgroundStyle(viewerSettings = {}) {
  return {
    background: getViewerBackgroundCss(viewerSettings),
  };
}
