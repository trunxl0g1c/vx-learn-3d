import * as THREE from "three";

import {
  FLOW_EFFECT_TYPES,
  FLOW_OCCLUSION_MODES,
  FLOW_POINT_EPSILON,
  FLOW_POINT_EPSILON_SQ,
  DEFAULT_FLOW_MODEL_DIAGONALS_PER_SECOND,
  createFlowDefinition,
  createFlowPoint,
  createFlowPointFromControls,
  createFlowPointFromObject,
  normalizeFlowDefinition,
  normalizeFlowDefinitions,
  normalizeFlowPoints,
} from "./FlowDefinitions";

// Rendering-only immutable vectors belong to this module. Keeping them here
// prevents accidental cross-module scope access after FlowDefinitions refactors.
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const ZERO_SCALE = new THREE.Vector3(0, 0, 0);

const FLOW_DEPTH_LAYERS = Object.freeze({
  VISIBLE: "visible",
  OCCLUDED: "occluded",
  ALWAYS: "always",
});

function getFlowDepthMaterialOptions(depthLayer) {
  if (depthLayer === FLOW_DEPTH_LAYERS.ALWAYS) {
    return {
      depthTest: false,
      depthFunc: THREE.LessEqualDepth,
      renderOrderOffset: 1000,
    };
  }

  if (depthLayer === FLOW_DEPTH_LAYERS.OCCLUDED) {
    return {
      depthTest: true,
      depthFunc: THREE.GreaterDepth,
      renderOrderOffset: 1000,
    };
  }

  return {
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    renderOrderOffset: 0,
  };
}

function configureFlowMaterialDepth(material, depthLayer) {
  const options = getFlowDepthMaterialOptions(depthLayer);
  material.depthTest = options.depthTest;
  material.depthFunc = options.depthFunc;
  material.depthWrite = false;
  material.needsUpdate = true;
  return material;
}

function getFlowRenderOrder(baseOrder, depthLayer) {
  return baseOrder + getFlowDepthMaterialOptions(depthLayer).renderOrderOffset;
}

let sharedCirclePointTexture = null;

export function getFlowRuntimeSignature(flow) {
  const normalized = normalizeFlowDefinition(flow);

  return JSON.stringify({
    id: normalized.id,
    points: normalized.points.map((point) => point.position),
    settings: normalized.settings,
  });
}

function createCurve(points) {
  const safePoints = normalizeFlowPoints(points);
  const vectors = safePoints.map(
    (point) => new THREE.Vector3(...point.position),
  );

  if (vectors.length < 2) return null;

  if (vectors.length === 2) {
    return new THREE.LineCurve3(vectors[0], vectors[1]);
  }

  const curve = new THREE.CatmullRomCurve3(
    vectors,
    false,
    "centripetal",
    0.45,
  );

  // getPointAt() relies on the arc-length lookup table. A denser table keeps
  // movement stable on long or tightly curved routes instead of accelerating
  // around undersampled sections.
  curve.arcLengthDivisions = Math.max(400, vectors.length * 120);
  curve.updateArcLengths();
  return curve;
}

function markFlowHelper(object, renderOrder = 1000) {
  object.userData.__vxInternal = true;
  object.userData.__vxFlowHelper = true;
  object.renderOrder = renderOrder;
  object.raycast = () => null;
  return object;
}

function createGuideLine(
  curve,
  color,
  opacity = 0.45,
  { depthLayer = FLOW_DEPTH_LAYERS.VISIBLE, dashed = false } = {},
) {
  const samples = Math.max(48, Math.min(320, Math.ceil(curve.getLength() * 30)));
  const geometry = new THREE.BufferGeometry().setFromPoints(
    curve.getPoints(samples),
  );
  const length = Math.max(curve.getLength(), FLOW_POINT_EPSILON);
  const material = dashed
    ? new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity,
        dashSize: Math.max(length * 0.018, 0.015),
        gapSize: Math.max(length * 0.012, 0.01),
        toneMapped: false,
      })
    : new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity,
        toneMapped: false,
      });

  configureFlowMaterialDepth(material, depthLayer);
  const line = markFlowHelper(
    new THREE.Line(geometry, material),
    getFlowRenderOrder(60, depthLayer),
  );
  if (dashed) line.computeLineDistances();
  line.frustumCulled = false;
  return line;
}

function getSharedCirclePointTexture() {
  if (sharedCirclePointTexture) return sharedCirclePointTexture;

  const size = 32;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size - 0.5;
      const ny = (y + 0.5) / size - 0.5;
      const distance = Math.sqrt(nx * nx + ny * ny);
      const edge = THREE.MathUtils.clamp((0.5 - distance) / 0.08, 0, 1);
      const offset = (y * size + x) * 4;

      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(edge * 255);
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.name = "VXFlowCirclePoint";
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  sharedCirclePointTexture = texture;

  return texture;
}

function createFixedPixelPointMaterial(
  color,
  opacity,
  pixelDiameter,
  { depthLayer = FLOW_DEPTH_LAYERS.VISIBLE, additive = false } = {},
) {
  // PointsMaterial with sizeAttenuation=false is handled by Three.js in
  // screen pixels. It stays constant while the camera dollies/zooms and
  // avoids the custom point shader that produced ANGLE division warnings.
  const material = new THREE.PointsMaterial({
    color,
    map: getSharedCirclePointTexture(),
    size: THREE.MathUtils.clamp(Number(pixelDiameter) || 12, 4, 32),
    sizeAttenuation: false,
    transparent: true,
    opacity: THREE.MathUtils.clamp(Number(opacity) || 1, 0, 1),
    alphaTest: 0.015,
    toneMapped: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  return configureFlowMaterialDepth(material, depthLayer);
}

function createFixedPixelPointObject(
  position,
  color,
  pixelDiameter,
  {
    depthLayer = FLOW_DEPTH_LAYERS.VISIBLE,
    opacity = 0.95,
    additive = false,
    renderOrder = 1004,
  } = {},
) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [position.x, position.y, position.z],
      3,
    ),
  );

  const material = createFixedPixelPointMaterial(
    color,
    opacity,
    pixelDiameter,
    { depthLayer, additive },
  );
  const points = markFlowHelper(
    new THREE.Points(geometry, material),
    getFlowRenderOrder(renderOrder, depthLayer),
  );
  points.frustumCulled = false;
  return points;
}

function createWaypointMesh(
  position,
  color,
  _initialWorldRadius,
  {
    depthLayer = FLOW_DEPTH_LAYERS.VISIBLE,
    pixelDiameter = 14,
  } = {},
) {
  // PointsMaterial with sizeAttenuation=false keeps a true screen-space
  // diameter regardless of camera distance, zoom, or model-root scale.
  return createFixedPixelPointObject(position, color, pixelDiameter, {
    depthLayer,
    opacity: 0.96,
    renderOrder: 1004,
  });
}

function updateFlowScreenSpaceObjects(
  _screenSpaceObjects,
  _camera,
  _viewportHeight,
) {
  // Kept as a compatibility no-op. Waypoints and particle dots are now
  // rendered as fixed-pixel point primitives and need no camera-distance
  // scaling on each frame.
}

function createTubeMesh(
  curve,
  {
    radius,
    color,
    opacity,
    materialType = "basic",
    renderOrder = 61,
    blending = THREE.NormalBlending,
    depthLayer = FLOW_DEPTH_LAYERS.VISIBLE,
  },
) {
  const tubularSegments = Math.max(
    48,
    Math.min(320, Math.ceil(curve.getLength() * 32)),
  );
  const geometry = new THREE.TubeGeometry(
    curve,
    tubularSegments,
    radius,
    8,
    false,
  );

  let material;

  if (materialType === "liquid") {
    material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity,
      shininess: 110,
      specular: new THREE.Color("#ffffff"),
      side: THREE.DoubleSide,
    });
  } else {
    material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      toneMapped: false,
      side: THREE.DoubleSide,
      blending,
    });
  }

  configureFlowMaterialDepth(material, depthLayer);
  const mesh = markFlowHelper(
    new THREE.Mesh(geometry, material),
    getFlowRenderOrder(renderOrder, depthLayer),
  );
  mesh.frustumCulled = false;
  return mesh;
}

function createInstancedActor(
  geometry,
  material,
  count,
  renderOrder = 64,
  depthLayer = FLOW_DEPTH_LAYERS.VISIBLE,
) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  return markFlowHelper(mesh, getFlowRenderOrder(renderOrder, depthLayer));
}

function createBasicMaterial(color, opacity, options = {}) {
  const depthLayer = options.depthLayer || FLOW_DEPTH_LAYERS.VISIBLE;
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    toneMapped: false,
    blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  return configureFlowMaterialDepth(material, depthLayer);
}

function createInstancedUpdater(curve) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  const hideInstance = (mesh, index) => {
    matrix.compose(position.set(0, 0, 0), quaternion.identity(), ZERO_SCALE);
    mesh.setMatrixAt(index, matrix);
  };

  const setInstance = (
    mesh,
    index,
    t,
    {
      visible = true,
      scaleValue = [1, 1, 1],
      orientToPath = false,
      offset = 0,
      offsetPhase = 0,
    } = {},
  ) => {
    if (!visible || !curve) {
      hideInstance(mesh, index);
      return;
    }

    const safeT = THREE.MathUtils.clamp(Number(t) || 0, 0, 1);
    curve.getPointAt(safeT, position);
    curve.getTangentAt(safeT, tangent);

    if (
      !Number.isFinite(tangent.x) ||
      !Number.isFinite(tangent.y) ||
      !Number.isFinite(tangent.z) ||
      tangent.lengthSq() <= FLOW_POINT_EPSILON_SQ
    ) {
      tangent.copy(AXIS_Y);
    } else {
      tangent.normalize();
    }

    if (offset) {
      const reference = Math.abs(tangent.y) < 0.9 ? AXIS_Y : AXIS_X;
      normal.crossVectors(tangent, reference);

      if (normal.lengthSq() <= FLOW_POINT_EPSILON_SQ) {
        normal.set(1, 0, 0);
      } else {
        normal.normalize();
      }

      binormal.crossVectors(tangent, normal);
      if (binormal.lengthSq() <= FLOW_POINT_EPSILON_SQ) {
        binormal.set(0, 0, 1);
      } else {
        binormal.normalize();
      }

      position.addScaledVector(normal, Math.sin(offsetPhase) * offset);
      position.addScaledVector(binormal, Math.cos(offsetPhase) * offset * 0.65);
    }

    if (orientToPath) {
      quaternion.setFromUnitVectors(AXIS_Y, tangent);
    } else {
      quaternion.identity();
    }

    scale.set(...scaleValue);
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  };

  return {
    setInstance,
    hideInstance,
  };
}

function getTrailProgress(progress, index, count, trailSpan) {
  const spacing = (index / Math.max(count - 1, 1)) * trailSpan;
  return progress - spacing;
}

function getLoopProgress(progress, index, count) {
  return (progress + index / Math.max(count, 1)) % 1;
}

function createParticlesEffect({
  curve,
  group,
  color,
  radius,
  settings,
  depthLayer,
  opacityScale = 1,
}) {
  const count = Math.max(1, Math.round(settings.particleCount));

  // Particles are model-space actors, not fixed-pixel points. Keeping their
  // geometry radius in world/model units makes the configured Thickness stay
  // proportional to the 3D model while the camera dollies or zooms. The old
  // screen-space PointsMaterial stayed the same number of pixels, which made
  // particles look progressively smaller relative to the model when zooming in.
  const particleRadius = Math.max(Number(radius) * 0.72, 0.0005);
  const geometry = new THREE.IcosahedronGeometry(particleRadius, 1);
  const material = createBasicMaterial(
    color,
    settings.opacity * opacityScale,
    {
      additive: true,
      depthLayer,
    },
  );
  const particles = createInstancedActor(
    geometry,
    material,
    count,
    63,
    depthLayer,
  );
  const updater = createInstancedUpdater(curve);
  group.add(particles);

  return {
    update(progress, playing, repeat) {
      for (let index = 0; index < count; index += 1) {
        const rawProgress = repeat
          ? getLoopProgress(progress, index, count)
          : getTrailProgress(progress, index, count, 0.35);
        const visible = playing && rawProgress >= 0 && rawProgress <= 1;

        updater.setInstance(particles, index, rawProgress, { visible });
      }

      particles.instanceMatrix.needsUpdate = true;
    },
  };
}

function createArrowsEffect({ curve, group, color, radius, settings, depthLayer, opacityScale = 1 }) {
  const count = Math.max(4, Math.min(24, Math.round(settings.particleCount * 0.7)));
  const geometry = new THREE.ConeGeometry(radius * 0.95, radius * 3.8, 10);
  const material = createBasicMaterial(color, (settings.opacity * opacityScale), {
    additive: false,
    depthLayer,
  });
  const mesh = createInstancedActor(geometry, material, count, 65, depthLayer);
  const updater = createInstancedUpdater(curve);
  group.add(mesh);

  return {
    update(progress, playing, repeat) {
      for (let index = 0; index < count; index += 1) {
        const rawProgress = repeat
          ? getLoopProgress(progress, index, count)
          : getTrailProgress(progress, index, count, 0.5);

        updater.setInstance(mesh, index, rawProgress, {
          visible: playing && rawProgress >= 0 && rawProgress <= 1,
          orientToPath: true,
        });
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function createFlowingLineEffect({ curve, group, color, radius, settings, depthLayer, opacityScale = 1 }) {
  group.add(
    createTubeMesh(curve, {
      radius: radius * 0.34,
      color,
      opacity: (settings.opacity * opacityScale) * 0.16,
      blending: THREE.AdditiveBlending,
      renderOrder: 61,
      depthLayer,
    }),
  );

  const count = Math.max(5, Math.min(28, settings.particleCount));
  const geometry = new THREE.CylinderGeometry(
    radius * 0.44,
    radius * 0.44,
    radius * 5.5,
    8,
  );
  const material = createBasicMaterial(color, (settings.opacity * opacityScale), {
    additive: true,
    depthLayer,
  });
  const mesh = createInstancedActor(geometry, material, count, 65, depthLayer);
  const updater = createInstancedUpdater(curve);
  group.add(mesh);

  return {
    update(progress, playing, repeat) {
      for (let index = 0; index < count; index += 1) {
        const rawProgress = repeat
          ? getLoopProgress(progress, index, count)
          : getTrailProgress(progress, index, count, 0.55);

        updater.setInstance(mesh, index, rawProgress, {
          visible: playing && rawProgress >= 0 && rawProgress <= 1,
          orientToPath: true,
        });
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

function createLiquidEffect({ curve, group, color, radius, settings, depthLayer, opacityScale = 1 }) {
  group.add(
    createTubeMesh(curve, {
      radius: radius * 0.9,
      color,
      opacity: (settings.opacity * opacityScale) * 0.5,
      materialType: "liquid",
      renderOrder: 62,
      depthLayer,
    }),
  );

  const count = Math.max(5, Math.min(28, Math.round(settings.particleCount * 0.8)));
  const geometry = new THREE.SphereGeometry(radius * 0.58, 12, 12);
  const material = createBasicMaterial(color, (settings.opacity * opacityScale) * 0.9, {
    additive: true,
    depthLayer,
  });
  const droplets = createInstancedActor(geometry, material, count, 66, depthLayer);
  const updater = createInstancedUpdater(curve);
  group.add(droplets);

  return {
    update(progress, playing, repeat) {
      for (let index = 0; index < count; index += 1) {
        const rawProgress = repeat
          ? getLoopProgress(progress, index, count)
          : getTrailProgress(progress, index, count, 0.42);

        updater.setInstance(droplets, index, rawProgress, {
          visible: playing && rawProgress >= 0 && rawProgress <= 1,
          orientToPath: true,
          scaleValue: [0.78, 1.8, 0.78],
        });
      }
      droplets.instanceMatrix.needsUpdate = true;
    },
  };
}

function createAirflowEffect({ curve, group, color, radius, settings, depthLayer, opacityScale = 1 }) {
  group.add(
    createTubeMesh(curve, {
      radius: radius * 1.35,
      color,
      opacity: (settings.opacity * opacityScale) * 0.09,
      blending: THREE.AdditiveBlending,
      renderOrder: 61,
      depthLayer,
    }),
  );

  const count = Math.max(6, Math.min(32, settings.particleCount));
  const geometry = new THREE.SphereGeometry(radius * 0.65, 10, 10);
  const material = createBasicMaterial(color, (settings.opacity * opacityScale) * 0.28, {
    additive: true,
    depthLayer,
  });
  const wisps = createInstancedActor(geometry, material, count, 65, depthLayer);
  const updater = createInstancedUpdater(curve);
  group.add(wisps);

  return {
    update(progress, playing, repeat) {
      for (let index = 0; index < count; index += 1) {
        const rawProgress = repeat
          ? getLoopProgress(progress, index, count)
          : getTrailProgress(progress, index, count, 0.58);

        updater.setInstance(wisps, index, rawProgress, {
          visible: playing && rawProgress >= 0 && rawProgress <= 1,
          orientToPath: true,
          scaleValue: [0.8, 3.8, 0.8],
          offset: radius * 0.25,
          offsetPhase: index * 1.7 + progress * Math.PI * 6,
        });
      }
      wisps.instanceMatrix.needsUpdate = true;
    },
  };
}

function createElectricalEffect({ curve, group, color, radius, settings, depthLayer, opacityScale = 1 }) {
  group.add(
    createTubeMesh(curve, {
      radius: radius * 0.24,
      color,
      opacity: (settings.opacity * opacityScale) * 0.28,
      blending: THREE.AdditiveBlending,
      renderOrder: 62,
      depthLayer,
    }),
  );

  const count = Math.max(4, Math.min(18, Math.round(settings.particleCount * 0.55)));
  const glowGeometry = new THREE.SphereGeometry(radius * 1.1, 12, 12);
  const coreGeometry = new THREE.SphereGeometry(radius * 0.42, 10, 10);
  const glowMaterial = createBasicMaterial(color, (settings.opacity * opacityScale) * 0.34, {
    additive: true,
    depthLayer,
  });
  const coreMaterial = createBasicMaterial("#ffffff", (settings.opacity * opacityScale), {
    additive: true,
    depthLayer,
  });
  const glows = createInstancedActor(glowGeometry, glowMaterial, count, 65, depthLayer);
  const cores = createInstancedActor(coreGeometry, coreMaterial, count, 66, depthLayer);
  const updater = createInstancedUpdater(curve);
  group.add(glows, cores);

  return {
    update(progress, playing, repeat) {
      for (let index = 0; index < count; index += 1) {
        const rawProgress = repeat
          ? getLoopProgress(progress, index, count)
          : getTrailProgress(progress, index, count, 0.4);
        const visible = playing && rawProgress >= 0 && rawProgress <= 1;
        const phase = index * 2.4 + progress * Math.PI * 18;
        const pulseScale = 0.75 + Math.abs(Math.sin(phase)) * 0.8;

        updater.setInstance(glows, index, rawProgress, {
          visible,
          scaleValue: [pulseScale, pulseScale, pulseScale],
          offset: radius * 0.45,
          offsetPhase: phase,
        });
        updater.setInstance(cores, index, rawProgress, {
          visible,
          scaleValue: [0.7, 1.5, 0.7],
          orientToPath: true,
          offset: radius * 0.45,
          offsetPhase: phase,
        });
      }
      glows.instanceMatrix.needsUpdate = true;
      cores.instanceMatrix.needsUpdate = true;
    },
  };
}

function createEffectRuntime(context) {
  switch (context.settings.effectType) {
    case FLOW_EFFECT_TYPES.ARROWS:
      return createArrowsEffect(context);
    case FLOW_EFFECT_TYPES.FLOWING_LINE:
      return createFlowingLineEffect(context);
    case FLOW_EFFECT_TYPES.LIQUID:
      return createLiquidEffect(context);
    case FLOW_EFFECT_TYPES.AIRFLOW:
      return createAirflowEffect(context);
    case FLOW_EFFECT_TYPES.ELECTRICAL:
      return createElectricalEffect(context);
    case FLOW_EFFECT_TYPES.PARTICLES:
    default:
      return createParticlesEffect(context);
  }
}

export function createFlowRuntime(flow, options = {}) {
  const normalized = normalizeFlowDefinition(flow);

  if (normalized.points.length === 0) return null;

  const curve = createCurve(normalized.points);
  const group = new THREE.Group();
  group.name = `VXFlow:${normalized.name}`;
  group.userData.__vxInternal = true;
  group.userData.__vxFlowHelper = true;

  const explicitRenderOnTop =
    typeof options.renderOnTop === "boolean" ? options.renderOnTop : null;
  const occlusionMode = explicitRenderOnTop === true
    ? FLOW_OCCLUSION_MODES.ALWAYS_VISIBLE
    : explicitRenderOnTop === false
      ? FLOW_OCCLUSION_MODES.HIDDEN
      : normalized.settings.occlusionMode;
  const length = curve ? Math.max(curve.getLength(), 0.001) : 1;
  const requestedReferenceLength = Number(options.speedReferenceLength);
  const speedReferenceLength =
    Number.isFinite(requestedReferenceLength) &&
    requestedReferenceLength > FLOW_POINT_EPSILON
      ? requestedReferenceLength
      : null;
  const unitsPerSecondAtOneX = speedReferenceLength
    ? speedReferenceLength * DEFAULT_FLOW_MODEL_DIAGONALS_PER_SECOND
    : 1;
  const baseRadius = Math.min(0.09, Math.max(0.012, length * 0.012));
  const radius = baseRadius * normalized.settings.thickness;
  const color = new THREE.Color(normalized.settings.color);

  const effectRuntimes = [];
  const showGuide =
    curve && (normalized.settings.showGuide || options.forceGuide === true);

  const addDepthLayer = ({ depthLayer, opacityScale = 1, dashedGuide = false }) => {
    if (showGuide) {
      group.add(
        createGuideLine(
          curve,
          color,
          (options.guideOpacity ?? normalized.settings.opacity * 0.34) *
            opacityScale,
          { depthLayer, dashed: dashedGuide },
        ),
      );
    }

    if (!curve) return;
    effectRuntimes.push(
      createEffectRuntime({
        curve,
        group,
        color,
        radius,
        length,
        settings: normalized.settings,
        depthLayer,
        opacityScale,
      }),
    );
  };

  if (occlusionMode === FLOW_OCCLUSION_MODES.ALWAYS_VISIBLE) {
    addDepthLayer({ depthLayer: FLOW_DEPTH_LAYERS.ALWAYS });
  } else {
    addDepthLayer({ depthLayer: FLOW_DEPTH_LAYERS.VISIBLE });

    if (occlusionMode === FLOW_OCCLUSION_MODES.DEPTH_CUE) {
      addDepthLayer({
        depthLayer: FLOW_DEPTH_LAYERS.OCCLUDED,
        opacityScale: normalized.settings.occludedOpacity,
        dashedGuide: true,
      });
    }
  }

  const screenSpaceObjects = [];

  if (options.showWaypoints) {
    normalized.points.forEach((point, index) => {
      const isStart = index === 0;
      const isEnd = index === normalized.points.length - 1;
      const waypointColor = isStart
        ? "#22c55e"
        : isEnd
          ? "#ef4444"
          : normalized.settings.color;
      const waypoint = createWaypointMesh(
        new THREE.Vector3(...point.position),
        waypointColor,
        Math.max(baseRadius, radius * 0.9),
        {
          depthLayer: FLOW_DEPTH_LAYERS.ALWAYS,
          // Start/end remain slightly more prominent, but all waypoint sizes
          // are fixed in screen pixels instead of world units.
          pixelDiameter: isStart || isEnd ? 16 : 14,
        },
      );

      screenSpaceObjects.push(waypoint);
      group.add(waypoint);
    });
  }

  let progress = 0;
  let completed = false;

  const updateEffect = (playing) => {
    effectRuntimes.forEach((effectRuntime) => {
      effectRuntime?.update(
        progress,
        playing,
        normalized.settings.repeat,
      );
    });
  };

  updateEffect(false);

  return {
    group,
    flow: normalized,
    restart() {
      progress = 0;
      completed = false;
      updateEffect(true);
    },
    updateScreenSpace(camera, viewportHeight) {
      updateFlowScreenSpaceObjects(screenSpaceObjects, camera, viewportHeight);
    },
    update(delta, playing = false, showStaticEffect = false) {
      if (!curve) return { completed: false };

      if (!playing) {
        // In Editor authoring mode, keep a stationary representation of the
        // selected effect visible. Player playback still hides the effect
        // while stopped because showStaticEffect remains false there.
        updateEffect(Boolean(showStaticEffect));
        return { completed };
      }

      if (completed) {
        updateEffect(Boolean(showStaticEffect));
        return { completed };
      }

      progress +=
        (Math.max(0, Number(delta) || 0) *
          normalized.settings.speed *
          unitsPerSecondAtOneX) /
        length;

      if (progress >= 1) {
        if (normalized.settings.repeat) {
          progress %= 1;
        } else {
          progress = 1;
          completed = true;
        }
      }

      updateEffect(!completed || normalized.settings.repeat);
      return { completed };
    },
    setVisible(visible) {
      group.visible = Boolean(visible);
    },
    dispose() {
      group.parent?.remove?.(group);

      const geometries = new Set();
      const materials = new Set();

      group.traverse((child) => {
        if (child.geometry) geometries.add(child.geometry);

        if (Array.isArray(child.material)) {
          child.material.forEach((material) => {
            if (material) materials.add(material);
          });
        } else if (child.material) {
          materials.add(child.material);
        }
      });

      geometries.forEach((geometry) => geometry.dispose?.());
      materials.forEach((material) => material.dispose?.());
      group.clear();
    },
  };
}

export function createFlowEngine() {
  return {
    createDefinition: createFlowDefinition,
    normalizeDefinition: normalizeFlowDefinition,
    normalizeDefinitions: normalizeFlowDefinitions,
    createPoint: createFlowPoint,
    createPointFromObject: createFlowPointFromObject,
    createPointFromControls: createFlowPointFromControls,
    createRuntime: createFlowRuntime,
    reset() {
      return true;
    },
    dispose() {
      return true;
    },
  };
}
