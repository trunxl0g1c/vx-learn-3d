import * as THREE from "three";

export const DEFAULT_VIEWER_GRID = Object.freeze({
  enabled: false,
  showInPlayer: false,
  plane: "xz",
  size: 20,
  divisions: 20,
  centerColor: "#64748b",
  gridColor: "#334155",
  opacity: 0.45,
  offset: 0,
});

function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
}

function normalizeGridPlane(value) {
  return value === "xy" || value === "yz" || value === "xz"
    ? value
    : DEFAULT_VIEWER_GRID.plane;
}

export function normalizeViewerGrid(grid = {}) {
  const source = grid || {};

  return {
    enabled: source.enabled === true,
    showInPlayer: source.showInPlayer === true,
    plane: normalizeGridPlane(source.plane),
    size: clampNumber(source.size, 1, 1000, DEFAULT_VIEWER_GRID.size),
    divisions: Math.round(
      clampNumber(source.divisions, 2, 500, DEFAULT_VIEWER_GRID.divisions),
    ),
    centerColor: isValidHexColor(source.centerColor)
      ? source.centerColor
      : DEFAULT_VIEWER_GRID.centerColor,
    gridColor: isValidHexColor(source.gridColor)
      ? source.gridColor
      : DEFAULT_VIEWER_GRID.gridColor,
    opacity: clampNumber(
      source.opacity,
      0.05,
      1,
      DEFAULT_VIEWER_GRID.opacity,
    ),
    offset: clampNumber(source.offset, -500, 500, DEFAULT_VIEWER_GRID.offset),
  };
}

export function getViewerGrid(viewerSettings = {}) {
  return normalizeViewerGrid(viewerSettings?.grid);
}

export function getViewerGridTransform(grid = {}) {
  const normalizedGrid = normalizeViewerGrid(grid);

  if (normalizedGrid.plane === "xy") {
    return {
      position: [0, 0, normalizedGrid.offset],
      rotation: [Math.PI / 2, 0, 0],
    };
  }

  if (normalizedGrid.plane === "yz") {
    return {
      position: [normalizedGrid.offset, 0, 0],
      rotation: [0, 0, Math.PI / 2],
    };
  }

  return {
    position: [0, normalizedGrid.offset, 0],
    rotation: [0, 0, 0],
  };
}

export function getViewerGridTransformForObject(grid = {}, object3D = null) {
  const normalizedGrid = normalizeViewerGrid(grid);

  if (!object3D?.isObject3D) return null;

  object3D.updateWorldMatrix?.(true, true);

  const box = new THREE.Box3().setFromObject(object3D);
  if (box.isEmpty()) return null;

  const size = new THREE.Vector3();
  box.getSize(size);
  const span = Math.max(size.x, size.y, size.z, 1);
  const safetyGap = Math.max(span * 0.0025, 0.002);

  if (normalizedGrid.plane === "xy") {
    return {
      position: [0, 0, box.min.z - safetyGap + normalizedGrid.offset],
      rotation: [Math.PI / 2, 0, 0],
    };
  }

  if (normalizedGrid.plane === "yz") {
    return {
      position: [box.min.x - safetyGap + normalizedGrid.offset, 0, 0],
      rotation: [0, 0, Math.PI / 2],
    };
  }

  return {
    position: [0, box.min.y - safetyGap + normalizedGrid.offset, 0],
    rotation: [0, 0, 0],
  };
}

