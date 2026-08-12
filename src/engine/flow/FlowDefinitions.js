import { createId } from "../../utils/createId";
import * as THREE from "three";
import {
  getLazyMaterialRecordMeta,
  markLazyMaterialRecord,
} from "../project/LazyMaterialRecords";

export const DEFAULT_FLOW_COLOR = "#22d3ee";
export const DEFAULT_FLOW_SPEED = 1;
export const DEFAULT_FLOW_MODEL_DIAGONALS_PER_SECOND = 0.1;
export const DEFAULT_FLOW_PARTICLE_COUNT = 14;
export const DEFAULT_FLOW_EFFECT_TYPE = "particles";
export const DEFAULT_FLOW_THICKNESS = 1;
export const DEFAULT_FLOW_OPACITY = 0.9;
export const DEFAULT_FLOW_SHOW_WAYPOINTS = false;
export const DEFAULT_FLOW_OCCLUSION_MODE = "depthCue";
export const DEFAULT_FLOW_OCCLUDED_OPACITY = 0.28;

export const FLOW_OCCLUSION_MODES = Object.freeze({
  DEPTH_CUE: "depthCue",
  HIDDEN: "hidden",
  ALWAYS_VISIBLE: "alwaysVisible",
});

export const FLOW_OCCLUSION_OPTIONS = Object.freeze([
  {
    value: FLOW_OCCLUSION_MODES.DEPTH_CUE,
    label: "Ghost Behind Objects",
    description:
      "Visible sections stay solid. Sections behind mesh remain visible as a faint dashed/ghost effect.",
  },
  {
    value: FLOW_OCCLUSION_MODES.HIDDEN,
    label: "Hide Behind Objects",
    description:
      "Use normal depth occlusion. Flow disappears while it is behind mesh.",
  },
  {
    value: FLOW_OCCLUSION_MODES.ALWAYS_VISIBLE,
    label: "Always On Top",
    description:
      "Render the complete flow above the model without showing depth relationships.",
  },
]);

export const FLOW_EFFECT_TYPES = Object.freeze({
  PARTICLES: "particles",
  ARROWS: "arrows",
  FLOWING_LINE: "flowingLine",
  LIQUID: "liquid",
  AIRFLOW: "airflow",
  ELECTRICAL: "electrical",
});

export const FLOW_EFFECT_OPTIONS = Object.freeze([
  {
    value: FLOW_EFFECT_TYPES.PARTICLES,
    label: "Particles",
    description: "Moving glowing dots for general flow, data, or airflow.",
    defaultColor: "#22d3ee",
  },
  {
    value: FLOW_EFFECT_TYPES.ARROWS,
    label: "Moving Arrows",
    description: "Directional arrows for procedures and clear flow direction.",
    defaultColor: "#f59e0b",
  },
  {
    value: FLOW_EFFECT_TYPES.FLOWING_LINE,
    label: "Flowing Line",
    description: "Moving luminous line segments for pipes and cables.",
    defaultColor: "#22d3ee",
  },
  {
    value: FLOW_EFFECT_TYPES.LIQUID,
    label: "Stylized Liquid",
    description: "Transparent liquid stream with moving droplets.",
    defaultColor: "#3b82f6",
  },
  {
    value: FLOW_EFFECT_TYPES.AIRFLOW,
    label: "Airflow Ribbon",
    description: "Soft transparent airflow ribbon with moving wisps.",
    defaultColor: "#a5f3fc",
  },
  {
    value: FLOW_EFFECT_TYPES.ELECTRICAL,
    label: "Electrical Pulse",
    description: "Bright electrical pulses moving along an energized path.",
    defaultColor: "#facc15",
  },
]);

const FLOW_EFFECT_OPTION_MAP = new Map(
  FLOW_EFFECT_OPTIONS.map((option) => [option.value, option]),
);
const FLOW_OCCLUSION_OPTION_MAP = new Map(
  FLOW_OCCLUSION_OPTIONS.map((option) => [option.value, option]),
);

export const FLOW_POINT_EPSILON = 1e-4;
export const FLOW_POINT_EPSILON_SQ =
  FLOW_POINT_EPSILON * FLOW_POINT_EPSILON;

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.min(max, Math.max(min, numericValue));
}

function getFinitePosition(position) {
  if (!Array.isArray(position) || position.length < 3) return null;

  const normalized = [0, 1, 2].map((index) => Number(position[index]));
  return normalized.every(Number.isFinite) ? normalized : null;
}

function normalizePosition(position) {
  return getFinitePosition(position) || [0, 0, 0];
}

function areConsecutiveFlowPointsEqual(previousPosition, nextPosition) {
  if (!previousPosition || !nextPosition) return false;

  const dx = nextPosition[0] - previousPosition[0];
  const dy = nextPosition[1] - previousPosition[1];
  const dz = nextPosition[2] - previousPosition[2];

  return dx * dx + dy * dy + dz * dz <= FLOW_POINT_EPSILON_SQ;
}

export function normalizeFlowPoints(points) {
  if (!Array.isArray(points)) return [];

  const normalizedPoints = [];

  points.forEach((point, sourceIndex) => {
    const position = getFinitePosition(point?.position);
    if (!position) return;

    const previousPoint = normalizedPoints[normalizedPoints.length - 1];
    if (
      previousPoint &&
      areConsecutiveFlowPointsEqual(previousPoint.position, position)
    ) {
      return;
    }

    normalizedPoints.push({
      id: point?.id || createId("flow-point"),
      label: String(point?.label || `Point ${sourceIndex + 1}`),
      position,
    });
  });

  return normalizedPoints.map((point, index) => ({
    ...point,
    label: point.label || `Point ${index + 1}`,
  }));
}

export function normalizeFlowEffectType(effectType) {
  return FLOW_EFFECT_OPTION_MAP.has(effectType)
    ? effectType
    : DEFAULT_FLOW_EFFECT_TYPE;
}

export function getFlowEffectOption(effectType) {
  return (
    FLOW_EFFECT_OPTION_MAP.get(normalizeFlowEffectType(effectType)) ||
    FLOW_EFFECT_OPTIONS[0]
  );
}

export function getFlowEffectLabel(effectType) {
  return getFlowEffectOption(effectType).label;
}

export function getFlowEffectDefaultColor(effectType) {
  return getFlowEffectOption(effectType).defaultColor;
}

export function normalizeFlowOcclusionMode(mode) {
  return FLOW_OCCLUSION_OPTION_MAP.has(mode)
    ? mode
    : DEFAULT_FLOW_OCCLUSION_MODE;
}

export function getFlowOcclusionOption(mode) {
  return (
    FLOW_OCCLUSION_OPTION_MAP.get(normalizeFlowOcclusionMode(mode)) ||
    FLOW_OCCLUSION_OPTIONS[0]
  );
}

export function createFlowPoint(position, index = 0) {
  return {
    id: createId("flow-point"),
    label: `Point ${index + 1}`,
    position: normalizePosition(position),
  };
}

export function normalizeFlowPoint(point, index = 0) {
  return {
    id: point?.id || createId("flow-point"),
    label: String(point?.label || `Point ${index + 1}`),
    position: normalizePosition(point?.position),
  };
}

export function createFlowDefinition(flowNumber = 1) {
  const now = new Date().toISOString();

  return {
    id: createId("flow"),
    name: `Flow ${flowNumber}`,
    description: "",
    enabled: true,
    points: [],
    settings: {
      effectType: DEFAULT_FLOW_EFFECT_TYPE,
      color: DEFAULT_FLOW_COLOR,
      speed: DEFAULT_FLOW_SPEED,
      repeat: true,
      particleCount: DEFAULT_FLOW_PARTICLE_COUNT,
      thickness: DEFAULT_FLOW_THICKNESS,
      opacity: DEFAULT_FLOW_OPACITY,
      showGuide: true,
      showWaypoints: DEFAULT_FLOW_SHOW_WAYPOINTS,
      occlusionMode: DEFAULT_FLOW_OCCLUSION_MODE,
      occludedOpacity: DEFAULT_FLOW_OCCLUDED_OPACITY,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeFlowDefinition(flow, index = 0) {
  const fallback = createFlowDefinition(index + 1);
  const settings = flow?.settings || {};
  const effectType = normalizeFlowEffectType(settings.effectType);
  const lazyMetadata = getLazyMaterialRecordMeta(flow);

  const normalized = {
    ...fallback,
    ...flow,
    id: flow?.id || fallback.id,
    name: String(flow?.name || fallback.name),
    description: String(flow?.description || ""),
    enabled: flow?.enabled !== false,
    points: normalizeFlowPoints(flow?.points),
    visualState:
      flow?.visualState && typeof flow.visualState === "object"
        ? flow.visualState
        : null,
    cameraView:
      flow?.cameraView && typeof flow.cameraView === "object"
        ? flow.cameraView
        : null,
    settings: {
      effectType,
      color:
        typeof settings.color === "string"
          ? settings.color
          : getFlowEffectDefaultColor(effectType),
      speed: clampNumber(settings.speed, 0.1, 5, DEFAULT_FLOW_SPEED),
      repeat: settings.repeat !== false,
      particleCount: Math.round(
        clampNumber(
          settings.particleCount,
          4,
          48,
          DEFAULT_FLOW_PARTICLE_COUNT,
        ),
      ),
      thickness: clampNumber(
        settings.thickness,
        0.4,
        3,
        DEFAULT_FLOW_THICKNESS,
      ),
      opacity: clampNumber(
        settings.opacity,
        0.15,
        1,
        DEFAULT_FLOW_OPACITY,
      ),
      showGuide: settings.showGuide !== false,
      showWaypoints: settings.showWaypoints === true,
      occlusionMode: normalizeFlowOcclusionMode(settings.occlusionMode),
      occludedOpacity: clampNumber(
        settings.occludedOpacity,
        0.08,
        0.65,
        DEFAULT_FLOW_OCCLUDED_OPACITY,
      ),
    },
    createdAt: flow?.createdAt || fallback.createdAt,
    updatedAt: flow?.updatedAt || fallback.updatedAt,
  };

  return lazyMetadata
    ? markLazyMaterialRecord(normalized, lazyMetadata)
    : normalized;
}

export function normalizeFlowDefinitions(flows) {
  return Array.isArray(flows)
    ? flows.map((flow, index) => normalizeFlowDefinition(flow, index))
    : [];
}

export function getFlowReferenceLengthFromObject(object, fallback = 1) {
  if (!object) return fallback;

  object.updateWorldMatrix?.(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return fallback;

  const worldDiagonal = bounds.getSize(new THREE.Vector3()).length();
  if (!Number.isFinite(worldDiagonal) || worldDiagonal <= FLOW_POINT_EPSILON) {
    return fallback;
  }

  // Flow points are stored in the coordinate system of the model's parent.
  // Remove any uniform scale inherited by that parent so the reference and
  // the curve length remain in the same coordinate space.
  const coordinateRoot = object.parent;
  if (!coordinateRoot?.getWorldScale) return worldDiagonal;

  coordinateRoot.updateWorldMatrix?.(true, false);
  const worldScale = coordinateRoot.getWorldScale(new THREE.Vector3());
  const safeScale = Math.max(
    Math.abs(worldScale.x),
    Math.abs(worldScale.y),
    Math.abs(worldScale.z),
    FLOW_POINT_EPSILON,
  );

  return worldDiagonal / safeScale;
}

export function createFlowPointFromWorldPoint(worldPoint, coordinateRoot) {
  if (!worldPoint?.isVector3) return null;

  const localPoint = worldPoint.clone();

  if (coordinateRoot?.worldToLocal) {
    coordinateRoot.updateWorldMatrix?.(true, false);
    coordinateRoot.worldToLocal(localPoint);
  }

  return [localPoint.x, localPoint.y, localPoint.z];
}

export function createFlowPointFromObject(object, coordinateRoot) {
  if (!object) return null;

  object.updateWorldMatrix?.(true, true);
  const box = new THREE.Box3().setFromObject(object);

  if (box.isEmpty()) return null;

  const center = box.getCenter(new THREE.Vector3());
  return createFlowPointFromWorldPoint(center, coordinateRoot);
}

export function createFlowPointFromControls(controls, coordinateRoot) {
  const target = controls?.target;

  if (!target?.isVector3) return null;

  return createFlowPointFromWorldPoint(target, coordinateRoot);
}

