import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  FLOW_OCCLUSION_MODES,
  createFlowOcclusionTester,
  normalizeFlowDefinition,
} from "../../engine/flow";

const UPDATE_INTERVAL_SECONDS = 0.45;
const AUTHORING_UPDATE_INTERVAL_SECONDS = 0.3;
const IDLE_REFRESH_SECONDS = 1.8;
const MAX_SAMPLES = 28;
const MIN_SAMPLES = 12;
const CAMERA_POSITION_EPSILON_SQ = 1e-5;
const CAMERA_QUATERNION_EPSILON = 1e-5;

let sharedCircleTexture = null;

function getCircleTexture() {
  if (sharedCircleTexture) return sharedCircleTexture;

  const size = 32;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = (x + 0.5) / size - 0.5;
      const ny = (y + 0.5) / size - 0.5;
      const distance = Math.sqrt(nx * nx + ny * ny);
      const alpha = THREE.MathUtils.clamp((0.5 - distance) / 0.09, 0, 1);
      const offset = (y * size + x) * 4;

      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }

  const texture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
  );
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  sharedCircleTexture = texture;
  return texture;
}

function createCurve(points) {
  const vectors = points.map((point) => new THREE.Vector3(...point.position));
  if (vectors.length < 2) return null;
  if (vectors.length === 2) return new THREE.LineCurve3(vectors[0], vectors[1]);

  const curve = new THREE.CatmullRomCurve3(
    vectors,
    false,
    "centripetal",
    0.45,
  );
  curve.arcLengthDivisions = Math.max(400, vectors.length * 120);
  curve.updateArcLengths();
  return curve;
}

function markInternal(object, renderOrder) {
  object.userData.__vxInternal = true;
  object.userData.__vxFlowHelper = true;
  object.userData.__vxIgnoreFlowOcclusion = true;
  object.renderOrder = renderOrder;
  object.raycast = () => null;
  object.frustumCulled = false;
  return object;
}

function createCueObjects(color, opacity, maxSegments, maxPoints) {
  const group = new THREE.Group();
  group.name = "VXFlowAutomaticOcclusionCue";
  group.userData.__vxInternal = true;
  group.userData.__vxFlowHelper = true;
  group.userData.__vxIgnoreFlowOcclusion = true;

  const frontGeometry = new THREE.BufferGeometry();
  const frontPositions = new Float32Array(maxSegments * 2 * 3);
  const frontAttribute = new THREE.BufferAttribute(frontPositions, 3);
  frontAttribute.setUsage(THREE.DynamicDrawUsage);
  frontGeometry.setAttribute("position", frontAttribute);
  frontGeometry.setDrawRange(0, 0);

  const frontMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.5,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const frontLine = markInternal(
    new THREE.LineSegments(frontGeometry, frontMaterial),
    2100,
  );

  const ghostColor = color.clone().lerp(new THREE.Color("#e2e8f0"), 0.72);
  const backGeometry = new THREE.BufferGeometry();
  const backPositions = new Float32Array(maxSegments * 2 * 3);
  const backAttribute = new THREE.BufferAttribute(backPositions, 3);
  backAttribute.setUsage(THREE.DynamicDrawUsage);
  backGeometry.setAttribute("position", backAttribute);
  backGeometry.setDrawRange(0, 0);

  const backMaterial = new THREE.LineBasicMaterial({
    color: ghostColor,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const backLine = markInternal(
    new THREE.LineSegments(backGeometry, backMaterial),
    2200,
  );

  const pointGeometry = new THREE.BufferGeometry();
  const pointPositions = new Float32Array(maxPoints * 3);
  const pointAttribute = new THREE.BufferAttribute(pointPositions, 3);
  pointAttribute.setUsage(THREE.DynamicDrawUsage);
  pointGeometry.setAttribute("position", pointAttribute);
  pointGeometry.setDrawRange(0, 0);

  const haloMaterial = new THREE.PointsMaterial({
    color: "#0f172a",
    map: getCircleTexture(),
    size: 9,
    sizeAttenuation: false,
    transparent: true,
    opacity: Math.min(0.85, opacity + 0.2),
    alphaTest: 0.01,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const haloPoints = markInternal(
    new THREE.Points(pointGeometry, haloMaterial),
    2199,
  );

  const coreMaterial = new THREE.PointsMaterial({
    color: ghostColor,
    map: getCircleTexture(),
    size: 5,
    sizeAttenuation: false,
    transparent: true,
    opacity: Math.min(1, opacity + 0.25),
    alphaTest: 0.01,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const corePoints = markInternal(
    new THREE.Points(pointGeometry, coreMaterial),
    2201,
  );

  group.add(frontLine, haloPoints, backLine, corePoints);

  return {
    group,
    frontLine,
    frontPositions,
    frontAttribute,
    backLine,
    backPositions,
    backAttribute,
    haloPoints,
    corePoints,
    pointPositions,
    pointAttribute,
    dispose() {
      frontGeometry.dispose();
      backGeometry.dispose();
      pointGeometry.dispose();
      frontMaterial.dispose();
      backMaterial.dispose();
      haloMaterial.dispose();
      coreMaterial.dispose();
      group.clear();
    },
  };
}

function writeSegment(buffer, offset, start, end) {
  buffer[offset] = start.x;
  buffer[offset + 1] = start.y;
  buffer[offset + 2] = start.z;
  buffer[offset + 3] = end.x;
  buffer[offset + 4] = end.y;
  buffer[offset + 5] = end.z;
}

export default function FlowAutomaticOcclusionCue({
  flow,
  visible = true,
  authoring = false,
}) {
  const { camera, scene, invalidate } = useThree();
  const normalized = useMemo(() => normalizeFlowDefinition(flow), [flow]);
  const cueRef = useRef(null);
  const [cueObject, setCueObject] = useState(null);
  const testerRef = useRef(null);
  const elapsedSinceUpdateRef = useRef(0);
  const elapsedSinceFullRefreshRef = useRef(IDLE_REFRESH_SECONDS);
  const lastCameraPositionRef = useRef(new THREE.Vector3(Infinity, Infinity, Infinity));
  const lastCameraQuaternionRef = useRef(new THREE.Quaternion());
  const lastCameraZoomRef = useRef(Number.NaN);
  const midpointRef = useRef(new THREE.Vector3());
  const averageFrameTimeRef = useRef(1 / 60);

  const curve = useMemo(
    () => createCurve(normalized.points),
    [normalized.points],
  );
  const samplePoints = useMemo(() => {
    if (!curve) return [];
    const sampleCount = THREE.MathUtils.clamp(
      Math.max(MIN_SAMPLES, normalized.points.length * 4),
      MIN_SAMPLES,
      MAX_SAMPLES,
    );
    return curve.getPoints(sampleCount);
  }, [curve, normalized.points.length]);

  const enabled =
    visible &&
    normalized.settings.occlusionMode === FLOW_OCCLUSION_MODES.DEPTH_CUE &&
    samplePoints.length >= 2;

  useLayoutEffect(() => {
    if (!enabled) {
      cueRef.current = null;
      testerRef.current = null;
      setCueObject(null);
      return undefined;
    }

    const color = new THREE.Color(normalized.settings.color);
    const opacity = THREE.MathUtils.clamp(
      Math.max(0.45, normalized.settings.occludedOpacity),
      0.45,
      0.85,
    );
    const cue = createCueObjects(
      color,
      opacity,
      samplePoints.length,
      samplePoints.length,
    );
    cueRef.current = cue;
    setCueObject(cue.group);
    testerRef.current = createFlowOcclusionTester(cue.group);
    elapsedSinceUpdateRef.current = authoring
      ? AUTHORING_UPDATE_INTERVAL_SECONDS
      : UPDATE_INTERVAL_SECONDS;
    elapsedSinceFullRefreshRef.current = IDLE_REFRESH_SECONDS;
    lastCameraPositionRef.current.set(Infinity, Infinity, Infinity);
    lastCameraZoomRef.current = Number.NaN;
    invalidate();

    return () => {
      cue.dispose();
      cueRef.current = null;
      testerRef.current = null;
    };
  }, [
    enabled,
    invalidate,
    normalized.settings.color,
    normalized.settings.occludedOpacity,
    samplePoints.length,
  ]);

  useFrame((state, delta) => {
    const cue = cueRef.current;
    const tester = testerRef.current;
    if (!cue || !tester || !enabled) return;

    const safeDelta = Math.max(0, Number(delta) || 0);
    averageFrameTimeRef.current = THREE.MathUtils.lerp(
      averageFrameTimeRef.current,
      safeDelta,
      0.08,
    );
    const performanceLevel = averageFrameTimeRef.current > 0.05
      ? 2
      : averageFrameTimeRef.current > 0.032
        ? 1
        : 0;

    elapsedSinceUpdateRef.current += safeDelta;
    elapsedSinceFullRefreshRef.current += safeDelta;

    const baseUpdateInterval = authoring
      ? AUTHORING_UPDATE_INTERVAL_SECONDS
      : UPDATE_INTERVAL_SECONDS;
    const updateInterval = baseUpdateInterval * (1 + performanceLevel * 0.75);
    if (elapsedSinceUpdateRef.current < updateInterval) return;
    elapsedSinceUpdateRef.current = 0;

    const cameraMoved =
      camera.position.distanceToSquared(lastCameraPositionRef.current) >
        CAMERA_POSITION_EPSILON_SQ ||
      1 - Math.abs(camera.quaternion.dot(lastCameraQuaternionRef.current)) >
        CAMERA_QUATERNION_EPSILON ||
      Math.abs((Number(camera.zoom) || 1) - lastCameraZoomRef.current) > 1e-4;
    const needsIdleRefresh =
      elapsedSinceFullRefreshRef.current >= IDLE_REFRESH_SECONDS;

    if (!cameraMoved && !needsIdleRefresh) return;

    elapsedSinceFullRefreshRef.current = 0;
    lastCameraPositionRef.current.copy(camera.position);
    lastCameraQuaternionRef.current.copy(camera.quaternion);
    lastCameraZoomRef.current = Number(camera.zoom) || 1;

    tester.beginFrame(camera, scene, state.clock.elapsedTime);

    let frontVertexCount = 0;
    let backVertexCount = 0;
    let pointCount = 0;

    const sampleStride = performanceLevel + 1;
    for (
      let index = 0;
      index < samplePoints.length - 1;
      index += sampleStride
    ) {
      const start = samplePoints[index];
      const end = samplePoints[
        Math.min(index + sampleStride, samplePoints.length - 1)
      ];
      const midpoint = midpointRef.current.copy(start).lerp(end, 0.5);
      const occluded = tester.isOccluded(midpoint);

      if (occluded) {
        // Skip alternating sub-segments so hidden path reads as dashed even
        // when WebGL line width is fixed to one pixel.
        if (index % 3 !== 1) {
          writeSegment(cue.backPositions, backVertexCount * 3, start, end);
          backVertexCount += 2;
        }

        if (index % 5 === 0 && pointCount < samplePoints.length) {
          const pointOffset = pointCount * 3;
          cue.pointPositions[pointOffset] = midpoint.x;
          cue.pointPositions[pointOffset + 1] = midpoint.y;
          cue.pointPositions[pointOffset + 2] = midpoint.z;
          pointCount += 1;
        }
      } else if (normalized.settings.showGuide || authoring) {
        writeSegment(cue.frontPositions, frontVertexCount * 3, start, end);
        frontVertexCount += 2;
      }
    }

    cue.frontLine.geometry.setDrawRange(0, frontVertexCount);
    cue.backLine.geometry.setDrawRange(0, backVertexCount);
    cue.haloPoints.geometry.setDrawRange(0, pointCount);
    cue.corePoints.geometry.setDrawRange(0, pointCount);
    cue.frontAttribute.needsUpdate = frontVertexCount > 0;
    cue.backAttribute.needsUpdate = backVertexCount > 0;
    cue.pointAttribute.needsUpdate = pointCount > 0;
    cue.frontLine.visible = frontVertexCount > 0;
    cue.backLine.visible = backVertexCount > 0;
    cue.haloPoints.visible = pointCount > 0;
    cue.corePoints.visible = pointCount > 0;
    invalidate();
  });

  if (!enabled || !cueObject) return null;

  return <primitive object={cueObject} dispose={null} />;
}
