const DEFAULT_PLAYER_MENU_VISIBILITY = Object.freeze({
  environmentSettings: true,
  objectList: true,
  freePlay: true,
  pullApart: true,
  cut: true,
});

export const DEFAULT_TURNTABLE_ANIMATION_SETTINGS = Object.freeze({
  enabled: true,
  speed: 3,
  direction: "clockwise",
});

export const DEFAULT_PLAYER_SETTINGS = Object.freeze({
  autoShowMaterial: true,
  showMaterialList: true,
  defaultCameraView: null,
  defaultVisualState: null,
  turntableAnimation: DEFAULT_TURNTABLE_ANIMATION_SETTINGS,
  menuVisibility: DEFAULT_PLAYER_MENU_VISIBILITY,
});

function normalizeNumericArray(value, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) return null;

  const normalized = value.map((item) => Number(item));

  return normalized.every(Number.isFinite) ? normalized : null;
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.min(max, Math.max(min, numericValue));
}

export function normalizeTurntableAnimationSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  const rawDirection = String(
    source.direction ?? source.rotationDirection ?? "clockwise",
  ).toLowerCase();

  return {
    enabled: Boolean(
      source.enabled ??
        source.active ??
        source.isEnabled ??
        DEFAULT_TURNTABLE_ANIMATION_SETTINGS.enabled,
    ),
    speed: clampNumber(
      source.speed ?? source.rpm ?? source.rotationSpeed,
      0.5,
      12,
      DEFAULT_TURNTABLE_ANIMATION_SETTINGS.speed,
    ),
    direction: ["counterclockwise", "counter-clockwise", "ccw", "left"].includes(
      rawDirection,
    )
      ? "counterclockwise"
      : "clockwise",
  };
}

export function normalizePlayerVisualState(visualState = null) {
  if (
    !visualState ||
    typeof visualState !== "object" ||
    Array.isArray(visualState)
  ) {
    return null;
  }

  return visualState;
}

export function normalizePlayerCameraView(cameraView = null) {
  if (!cameraView || typeof cameraView !== "object") return null;

  const position = normalizeNumericArray(
    cameraView.position || cameraView.cameraPosition,
    3,
  );
  const target = normalizeNumericArray(
    cameraView.target || cameraView.cameraTarget,
    3,
  );
  const quaternion = normalizeNumericArray(
    cameraView.quaternion || cameraView.cameraQuaternion,
    4,
  );
  const up = normalizeNumericArray(cameraView.up || cameraView.cameraUp, 3);
  const modelRotation = normalizeNumericArray(cameraView.modelRotation, 3);
  const zoom = Number(cameraView.zoom ?? cameraView.cameraZoom);
  const fov = Number(cameraView.fov);

  if (!position || !target) return null;

  return {
    position,
    target,
    version: Number.isFinite(Number(cameraView.version))
      ? Number(cameraView.version)
      : 1,
    quaternion,
    up,
    zoom: Number.isFinite(zoom) && zoom > 0 ? zoom : 1,
    cameraType:
      cameraView.cameraType === "orthographic"
        ? "orthographic"
        : "perspective",
    fov: Number.isFinite(fov) && fov > 0 ? fov : null,
    modelRotation,
    savedAt:
      typeof cameraView.savedAt === "string" ? cameraView.savedAt : null,
  };
}

function normalizeMenuVisibility(settings = {}) {
  const source = settings?.menuVisibility || settings?.playerMenu || {};

  return {
    environmentSettings: Boolean(
      source.environmentSettings ??
        source.environment ??
        settings.showEnvironmentSettings ??
        settings.environmentSettings ??
        DEFAULT_PLAYER_MENU_VISIBILITY.environmentSettings,
    ),
    objectList: Boolean(
      source.objectList ??
        source.object ??
        settings.showObjectList ??
        settings.objectList ??
        DEFAULT_PLAYER_MENU_VISIBILITY.objectList,
    ),
    freePlay: Boolean(
      source.freePlay ??
        settings.showFreePlay ??
        settings.freePlay ??
        DEFAULT_PLAYER_MENU_VISIBILITY.freePlay,
    ),
    pullApart: Boolean(
      source.pullApart ??
        settings.showPullApart ??
        settings.pullApart ??
        DEFAULT_PLAYER_MENU_VISIBILITY.pullApart,
    ),
    cut: Boolean(
      source.cut ??
        settings.showCut ??
        settings.cut ??
        DEFAULT_PLAYER_MENU_VISIBILITY.cut,
    ),
  };
}

export function normalizePlayerSettings(settings = {}) {
  const source = settings || {};

  return {
    autoShowMaterial: Boolean(
      source.autoShowMaterial ?? source.autoShowMateri ?? true,
    ),
    // Legacy field is retained in normalized output for package/data compatibility,
    // but Slide/Materi list is now always enabled in Player.
    showMaterialList: true,
    defaultCameraView: normalizePlayerCameraView(
      source.defaultCameraView || source.defaultView || source.cameraView,
    ),
    defaultVisualState: normalizePlayerVisualState(
      source.defaultVisualState || source.defaultState || source.visualState,
    ),
    turntableAnimation: normalizeTurntableAnimationSettings(
      source.turntableAnimation || source.turntable,
    ),
    menuVisibility: normalizeMenuVisibility(source),
  };
}
