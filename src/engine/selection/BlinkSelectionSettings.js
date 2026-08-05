export const DEFAULT_BLINK_SELECTION_SETTINGS = Object.freeze({
  thickness: 8,
  color: "#ffff00",
  speed: 1.5,
});

const BLINK_THICKNESS_MIN = 1;
const BLINK_THICKNESS_MAX = 20;

function clampNumber(value, min, max, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function normalizeHexColor(value, fallback) {
  const color = String(value || "").trim();

  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function normalizeBlinkSelectionSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};

  return {
    thickness: clampNumber(
      source.thickness,
      BLINK_THICKNESS_MIN,
      BLINK_THICKNESS_MAX,
      DEFAULT_BLINK_SELECTION_SETTINGS.thickness,
    ),
    color: normalizeHexColor(
      source.color,
      DEFAULT_BLINK_SELECTION_SETTINGS.color,
    ),
    speed: clampNumber(
      source.speed,
      0.1,
      5,
      DEFAULT_BLINK_SELECTION_SETTINGS.speed,
    ),
  };
}

function resolveKernelSize(thickness) {
  if (thickness >= 17) return "huge";
  if (thickness >= 13) return "veryLarge";
  if (thickness >= 9) return "large";
  if (thickness >= 5) return "medium";
  if (thickness >= 3) return "small";
  return "verySmall";
}

export function getBlinkSelectionOutlineProfile(thickness) {
  const safeThickness = clampNumber(
    thickness,
    BLINK_THICKNESS_MIN,
    BLINK_THICKNESS_MAX,
    DEFAULT_BLINK_SELECTION_SETTINGS.thickness,
  );
  const normalized =
    (safeThickness - BLINK_THICKNESS_MIN) /
    (BLINK_THICKNESS_MAX - BLINK_THICKNESS_MIN);

  return {
    kernelSize: resolveKernelSize(safeThickness),
    edgeStrength: 12 + normalized * 36,
    resolutionScale: Math.max(0.25, 0.9 - normalized * 0.65),
    blur: safeThickness >= 2,
  };
}
