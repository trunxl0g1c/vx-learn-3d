const clampNumber = (value, min, max, fallback) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
};

export const DEFAULT_VR_SETTINGS = Object.freeze({
  enabled: false,
  scale: 1,
  locomotion: "teleport",
  controllerRay: true,
  grabInteraction: true,
  handTracking: "auto",
  showGrid: false,
  spawnDistance: 2,
  spawnHeight: 0,
});

export const DEFAULT_AR_SETTINGS = Object.freeze({
  enabled: false,
  placement: "surface",
  scale: 1,
  allowMove: true,
  allowRotate: true,
  allowScale: true,
  showGrid: false,
});

export const DEFAULT_XR_SETTINGS = Object.freeze({
  vr: DEFAULT_VR_SETTINGS,
  ar: DEFAULT_AR_SETTINGS,
});

export function normalizeXRSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  const vr = source.vr && typeof source.vr === "object" ? source.vr : {};
  const ar = source.ar && typeof source.ar === "object" ? source.ar : {};

  return {
    vr: {
      enabled: Boolean(vr.enabled ?? DEFAULT_VR_SETTINGS.enabled),
      scale: clampNumber(vr.scale, 0.01, 20, DEFAULT_VR_SETTINGS.scale),
      locomotion: ["teleport", "smooth", "stationary"].includes(vr.locomotion)
        ? vr.locomotion
        : DEFAULT_VR_SETTINGS.locomotion,
      controllerRay: vr.controllerRay !== false,
      grabInteraction: vr.grabInteraction !== false,
      handTracking: ["auto", "on", "off"].includes(vr.handTracking)
        ? vr.handTracking
        : DEFAULT_VR_SETTINGS.handTracking,
      showGrid: Boolean(vr.showGrid ?? DEFAULT_VR_SETTINGS.showGrid),
      spawnDistance: clampNumber(
        vr.spawnDistance,
        0.25,
        20,
        DEFAULT_VR_SETTINGS.spawnDistance,
      ),
      spawnHeight: clampNumber(
        vr.spawnHeight,
        -5,
        5,
        DEFAULT_VR_SETTINGS.spawnHeight,
      ),
    },
    ar: {
      enabled: Boolean(ar.enabled ?? DEFAULT_AR_SETTINGS.enabled),
      placement: ["surface", "fixed"].includes(ar.placement)
        ? ar.placement
        : DEFAULT_AR_SETTINGS.placement,
      scale: clampNumber(ar.scale, 0.01, 20, DEFAULT_AR_SETTINGS.scale),
      allowMove: ar.allowMove !== false,
      allowRotate: ar.allowRotate !== false,
      allowScale: ar.allowScale !== false,
      showGrid: Boolean(ar.showGrid ?? DEFAULT_AR_SETTINGS.showGrid),
    },
  };
}

export function mergeXRSettings(current = {}, patch = {}) {
  const normalized = normalizeXRSettings(current);
  return normalizeXRSettings({
    ...normalized,
    ...patch,
    vr: { ...normalized.vr, ...(patch.vr || {}) },
    ar: { ...normalized.ar, ...(patch.ar || {}) },
  });
}

export function createVRSpawnFromView(camera, controls) {
  const target = controls?.target;
  if (!camera?.position || !target) return null;

  const distance = camera.position.distanceTo(target);
  return {
    spawnDistance: clampNumber(distance, 0.25, 20, 2),
    spawnHeight: 0,
  };
}
