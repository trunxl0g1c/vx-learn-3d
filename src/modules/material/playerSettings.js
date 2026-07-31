const DEFAULT_PLAYER_MENU_VISIBILITY = Object.freeze({
  environmentSettings: true,
  objectList: true,
  freePlay: true,
  pullApart: true,
  cut: true,
});

export const DEFAULT_PLAYER_SETTINGS = Object.freeze({
  autoShowMaterial: false,
  showMaterialList: true,
  defaultCameraView: null,
  menuVisibility: DEFAULT_PLAYER_MENU_VISIBILITY,
});

function normalizeNumericArray(value, expectedLength) {
  if (!Array.isArray(value) || value.length !== expectedLength) return null;

  const normalized = value.map((item) => Number(item));

  return normalized.every(Number.isFinite) ? normalized : null;
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
      source.autoShowMaterial ?? source.autoShowMateri ?? false,
    ),
    showMaterialList: Boolean(
      source.showMaterialList ??
        source.listMaterial ??
        source.listMateri ??
        true,
    ),
    defaultCameraView: normalizePlayerCameraView(
      source.defaultCameraView || source.defaultView || source.cameraView,
    ),
    menuVisibility: normalizeMenuVisibility(source),
  };
}
