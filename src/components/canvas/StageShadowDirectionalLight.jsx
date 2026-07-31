import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const DEFAULT_POSITION = [5, 8, 5];
const SHADOW_MAP_SIZE = 2048;
const MIN_SHADOW_EXTENT = 3;
const MIN_LIGHT_HEIGHT = 8;
const MIN_FAR = 25;

function clampNumber(value, min, max, fallback) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
}

function approximatelyEqual(a, b, epsilon = 1e-3) {
  return Math.abs(a - b) <= epsilon;
}

function updateShadowCamera(camera, next) {
  const shouldUpdate =
    !approximatelyEqual(camera.left, next.left) ||
    !approximatelyEqual(camera.right, next.right) ||
    !approximatelyEqual(camera.top, next.top) ||
    !approximatelyEqual(camera.bottom, next.bottom) ||
    !approximatelyEqual(camera.near, next.near) ||
    !approximatelyEqual(camera.far, next.far);

  if (!shouldUpdate) return false;

  camera.left = next.left;
  camera.right = next.right;
  camera.top = next.top;
  camera.bottom = next.bottom;
  camera.near = next.near;
  camera.far = next.far;
  camera.updateProjectionMatrix();
  return true;
}

export default function StageShadowDirectionalLight({
  enabled = false,
  intensity = 1,
  modelRootRef,
  modelScene = null,
  position = DEFAULT_POSITION,
  softness = 0.65,
  blurRadius = 4,
  spread = 1,
}) {
  const lightRef = useRef(null);
  const boxRef = useRef(new THREE.Box3());
  const sizeRef = useRef(new THREE.Vector3());
  const centerRef = useRef(new THREE.Vector3());
  const stableSpanRef = useRef(0);
  const stableHeightRef = useRef(0);
  const modelIdentityRef = useRef(null);
  const targetRef = useMemo(() => new THREE.Object3D(), []);
  const { gl, scene } = useThree();

  const safeSoftness = clampNumber(softness, 0, 1, 0.65);
  const safeBlurRadius = clampNumber(blurRadius, 0, 12, 4);
  const safeSpread = clampNumber(spread, 0.5, 2.5, 1);

  useEffect(() => {
    if (!scene.children.includes(targetRef)) {
      scene.add(targetRef);
    }

    if (lightRef.current) {
      lightRef.current.target = targetRef;
    }

    return () => {
      if (scene.children.includes(targetRef)) {
        scene.remove(targetRef);
      }
    };
  }, [scene, targetRef]);

  useEffect(() => {
    gl.shadowMap.enabled = enabled;

    if (enabled) {
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
      gl.shadowMap.autoUpdate = true;
    }
  }, [enabled, gl]);

  useFrame(() => {
    const light = lightRef.current;
    if (!light) return;

    light.intensity = intensity;
    light.castShadow = enabled;

    if (!enabled) {
      light.position.set(...position);
      return;
    }

    const root = modelScene || modelRootRef?.current;
    if (!root) {
      light.position.set(...position);
      return;
    }

    const identity = root.uuid || root.id || root;
    if (modelIdentityRef.current !== identity) {
      modelIdentityRef.current = identity;
      stableSpanRef.current = 0;
      stableHeightRef.current = 0;
    }

    root.updateWorldMatrix?.(true, true);
    const box = boxRef.current.setFromObject(root);
    if (box.isEmpty()) {
      light.position.set(...position);
      return;
    }

    const size = box.getSize(sizeRef.current);
    const center = box.getCenter(centerRef.current);
    const currentSpan = Math.max(size.x, size.z, 1);
    const currentHeight = Math.max(size.y, 1);

    // Keep the shadow camera stable while the model rotates. It may expand
    // when needed, but it does not shrink every frame and cause shimmering.
    stableSpanRef.current = Math.max(stableSpanRef.current, currentSpan);
    stableHeightRef.current = Math.max(stableHeightRef.current, currentHeight);

    const stableSpan = stableSpanRef.current;
    const stableHeight = stableHeightRef.current;
    const horizontalOffset = Math.max(
      stableSpan * (0.55 + safeSpread * 0.32),
      4 * safeSpread,
    );
    const verticalOffset = Math.max(
      stableHeight * (1.35 + safeSpread * 0.4),
      MIN_LIGHT_HEIGHT,
    );

    targetRef.position.set(
      center.x,
      box.min.y + currentHeight * 0.35,
      center.z,
    );
    targetRef.updateMatrixWorld();

    light.position.set(
      center.x + horizontalOffset,
      box.max.y + verticalOffset,
      center.z + horizontalOffset * 0.6,
    );

    if (
      light.shadow.mapSize.width !== SHADOW_MAP_SIZE ||
      light.shadow.mapSize.height !== SHADOW_MAP_SIZE
    ) {
      light.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
      light.shadow.map?.dispose?.();
      light.shadow.map = null;
    }

    const softnessMultiplier = THREE.MathUtils.lerp(
      0.35,
      1.65,
      safeSoftness,
    );
    light.shadow.radius = safeBlurRadius * softnessMultiplier;
    light.shadow.bias = THREE.MathUtils.lerp(
      -0.00004,
      -0.00012,
      safeSoftness,
    );
    light.shadow.normalBias = Math.max(
      stableSpan * THREE.MathUtils.lerp(0.001, 0.0025, safeSoftness),
      0.012,
    );
    light.shadow.autoUpdate = true;

    const extent = Math.max(
      stableSpan * (0.92 + safeSpread * 0.25 + safeSoftness * 0.12),
      MIN_SHADOW_EXTENT,
    );
    const cameraUpdated = updateShadowCamera(light.shadow.camera, {
      left: -extent,
      right: extent,
      top: extent,
      bottom: -extent,
      near: 0.5,
      far: Math.max(
        stableSpan * (4.5 + safeSpread * 1.5) + stableHeight * 3,
        MIN_FAR,
      ),
    });

    if (cameraUpdated) {
      light.shadow.needsUpdate = true;
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={position}
      intensity={intensity}
    />
  );
}
