export const DEFAULT_VIEWER_BACKGROUND = {
  type: "radialGradient",
  solidColor: "#0f172a",
  centerColor: "#2a2a2a",
  edgeColor: "#0d0d0d",
  intensity: 1,
  size: 1,
  linearStartColor: "#824040",
  linearEndColor: "#0d0d0d",
  linearWidth: 0.35,
  linearPosition: 0.5,
  linearRotation: 90,
  imageUrl: "",
  imageName: "",
  imageFit: "cover",
  imageOpacity: 1,
};

export const DEFAULT_VIEWER_HDRI = {
  source: "preset",
  hdri: "/hdr/studio.hdr",
  customHdri: null,
  showHdriBackground: false,
};

function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.min(max, Math.max(min, numericValue));
}

function normalizeBackgroundType(type) {
  if (
    type === "solid" ||
    type === "radialGradient" ||
    type === "linearGradient" ||
    type === "image"
  ) {
    return type;
  }

  return DEFAULT_VIEWER_BACKGROUND.type;
}

function normalizeImageFit(value) {
  if (value === "cover" || value === "contain" || value === "stretch") {
    return value;
  }

  return DEFAULT_VIEWER_BACKGROUND.imageFit;
}

export function normalizeViewerBackground(background = {}) {
  const source = background || {};

  return {
    type: normalizeBackgroundType(source.type),
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
    size: clampNumber(source.size, 0.2, 3, DEFAULT_VIEWER_BACKGROUND.size),
    linearStartColor: isValidHexColor(source.linearStartColor)
      ? source.linearStartColor
      : DEFAULT_VIEWER_BACKGROUND.linearStartColor,
    linearEndColor: isValidHexColor(source.linearEndColor)
      ? source.linearEndColor
      : DEFAULT_VIEWER_BACKGROUND.linearEndColor,
    linearWidth: clampNumber(
      source.linearWidth,
      0.05,
      1,
      DEFAULT_VIEWER_BACKGROUND.linearWidth,
    ),
    linearPosition: clampNumber(
      source.linearPosition,
      0,
      1,
      DEFAULT_VIEWER_BACKGROUND.linearPosition,
    ),
    linearRotation: clampNumber(
      source.linearRotation,
      0,
      360,
      DEFAULT_VIEWER_BACKGROUND.linearRotation,
    ),
    imageUrl:
      typeof source.imageUrl === "string"
        ? source.imageUrl
        : DEFAULT_VIEWER_BACKGROUND.imageUrl,
    imageName:
      typeof source.imageName === "string"
        ? source.imageName
        : DEFAULT_VIEWER_BACKGROUND.imageName,
    imageFit: normalizeImageFit(source.imageFit),
    imageOpacity: clampNumber(
      source.imageOpacity,
      0,
      1,
      DEFAULT_VIEWER_BACKGROUND.imageOpacity,
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

  if (background.type === "linearGradient") {
    const halfWidth = background.linearWidth / 2;
    const startStop = Math.max(0, background.linearPosition - halfWidth);
    const endStop = Math.min(1, background.linearPosition + halfWidth);

    return [
      `linear-gradient(${background.linearRotation}deg,`,
      `${background.linearStartColor} 0%,`,
      `${background.linearStartColor} ${Math.round(startStop * 100)}%,`,
      `${background.linearEndColor} ${Math.round(endStop * 100)}%,`,
      `${background.linearEndColor} 100%)`,
    ].join(" ");
  }

  if (background.type === "image" && background.imageUrl) {
    const fit = background.imageFit === "stretch" ? "100% 100%" : background.imageFit;

    return [
      `linear-gradient(rgba(0,0,0,${1 - background.imageOpacity}), rgba(0,0,0,${1 - background.imageOpacity}))`,
      `url("${background.imageUrl}") center / ${fit} no-repeat`,
    ].join(", ");
  }

  const safeSize = background.size || 1;
  const innerStop = Math.round((8 + background.intensity * 12) * safeSize);
  const outerStart = Math.round((42 + background.intensity * 12) * safeSize);

  return [
    "radial-gradient(circle at center,",
    `${background.centerColor} 0%,`,
    `${background.centerColor} ${Math.min(innerStop, 90)}%,`,
    `${background.edgeColor} ${Math.min(Math.max(outerStart, innerStop + 1), 98)}%,`,
    `${background.edgeColor} 100%)`,
  ].join(" ");
}

export function getViewerBackgroundStyle(viewerSettings = {}) {
  return {
    background: getViewerBackgroundCss(viewerSettings),
  };
}

export function normalizeViewerHdri(viewerSettings = {}) {
  const customHdri = viewerSettings?.customHdri || null;
  const hasCustomHdri = Boolean(customHdri?.dataUrl);
  const hdri = typeof viewerSettings?.hdri === "string" ? viewerSettings.hdri : "";

  return {
    source: hasCustomHdri && viewerSettings?.hdriSource === "custom" ? "custom" : "preset",
    hdri,
    customHdri: hasCustomHdri
      ? {
          name: customHdri.name || "custom.hdr",
          type: customHdri.type || "application/octet-stream",
          dataUrl: customHdri.dataUrl,
          size: Number(customHdri.size || 0),
          importedAt: customHdri.importedAt || null,
        }
      : null,
    showHdriBackground: Boolean(viewerSettings?.showHdriBackground),
  };
}
