import { TransformControls } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const WORLD_POSITION = new THREE.Vector3();
const CAMERA_WORLD_POSITION = new THREE.Vector3();
const LOCAL_PIVOT = new THREE.Vector3();
const WORLD_PIVOT = new THREE.Vector3();
const WORLD_DELTA = new THREE.Vector3();
const START_WORLD_PIVOT = new THREE.Vector3();

function getScreenSpaceDiameter(camera, worldPosition, viewportHeight, pixels) {
  const safeHeight = Math.max(1, Number(viewportHeight) || 1);
  const safePixels = Math.max(8, Number(pixels) || 18);

  if (camera?.isOrthographicCamera) {
    const visibleHeight =
      Math.abs(camera.top - camera.bottom) / Math.max(camera.zoom || 1, 1e-6);
    return Math.max(1e-5, (visibleHeight * safePixels) / safeHeight);
  }

  if (camera?.isPerspectiveCamera) {
    const distance = Math.max(
      1e-5,
      camera.getWorldPosition(CAMERA_WORLD_POSITION).distanceTo(worldPosition),
    );
    const verticalFov = THREE.MathUtils.degToRad(camera.fov || 50);
    const visibleHeight = 2 * Math.tan(verticalFov / 2) * distance;
    return Math.max(1e-5, (visibleHeight * safePixels) / safeHeight);
  }

  return 0.04;
}

function PivotHandleVisual({ pivotObject }) {
  const visualRef = useRef(null);
  const { camera, size } = useThree();

  useFrame(() => {
    const visual = visualRef.current;
    if (!visual || !pivotObject) return;

    pivotObject.getWorldPosition(WORLD_POSITION);
    const diameter = getScreenSpaceDiameter(camera, WORLD_POSITION, size.height, 18);
    visual.scale.setScalar(diameter);
  });

  return (
    <group ref={visualRef} raycast={() => null}>
      <mesh renderOrder={1104} raycast={() => null}>
        <sphereGeometry args={[0.5, 18, 18]} />
        <meshBasicMaterial
          color="#38bdf8"
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh renderOrder={1103} scale={1.8} raycast={() => null}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.28}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function AnimationPivotEditor({
  object,
  pivot = [0, 0, 0],
  enabled = false,
  controlsRef,
  onTransformingChange,
  onPivotChange,
}) {
  const { scene: threeScene } = useThree();
  const pivotObject = useMemo(() => {
    const helper = new THREE.Object3D();
    helper.name = "VXAnimationPivotTransform";
    helper.userData.__vxInternal = true;
    helper.userData.__vxAnimationPivotHelper = true;
    return helper;
  }, []);

  const draggingRef = useRef(false);
  const onTransformingChangeRef = useRef(onTransformingChange);

  useEffect(() => {
    onTransformingChangeRef.current = onTransformingChange;
  }, [onTransformingChange]);

  useLayoutEffect(() => {
    if (!enabled || !object || draggingRef.current) return;

    object.updateWorldMatrix(true, false);
    LOCAL_PIVOT.fromArray(Array.isArray(pivot) ? pivot : [0, 0, 0]);
    WORLD_PIVOT.copy(LOCAL_PIVOT);
    object.localToWorld(WORLD_PIVOT);

    pivotObject.position.copy(WORLD_PIVOT);
    pivotObject.quaternion.identity();
    pivotObject.scale.set(1, 1, 1);
    pivotObject.updateMatrixWorld(true);
  }, [enabled, object, pivot, pivotObject]);

  useEffect(
    () => () => {
      if (controlsRef?.current) controlsRef.current.enabled = true;
      onTransformingChangeRef.current?.(false);
    },
    [controlsRef],
  );

  const emitPivotChange = useCallback(() => {
    if (!enabled || !object) return false;

    object.updateWorldMatrix(true, false);
    LOCAL_PIVOT.copy(pivotObject.position);
    object.worldToLocal(LOCAL_PIVOT);

    onPivotChange?.([
      LOCAL_PIVOT.x,
      LOCAL_PIVOT.y,
      LOCAL_PIVOT.z,
    ]);
    return true;
  }, [enabled, object, onPivotChange, pivotObject]);

  const handleTransformStart = useCallback(() => {
    if (!enabled || !object) return;
    draggingRef.current = true;
    START_WORLD_PIVOT.copy(pivotObject.position);
    onTransformingChangeRef.current?.(true);
    if (controlsRef?.current) controlsRef.current.enabled = false;
  }, [controlsRef, enabled, object, pivotObject]);

  const handleTransformEnd = useCallback(() => {
    if (!enabled || !object) return;

    WORLD_DELTA.copy(pivotObject.position).sub(START_WORLD_PIVOT);
    draggingRef.current = false;

    if (WORLD_DELTA.lengthSq() > 1e-10) {
      emitPivotChange();
    }

    onTransformingChangeRef.current?.(false);
    if (controlsRef?.current) controlsRef.current.enabled = true;
  }, [controlsRef, emitPivotChange, enabled, object, pivotObject]);

  if (!enabled || !object) return null;

  return createPortal(
    <>
      <primitive object={pivotObject}>
        <PivotHandleVisual pivotObject={pivotObject} />
      </primitive>
      <TransformControls
        object={pivotObject}
        mode="translate"
        space="world"
        size={0.82}
        showX
        showY
        showZ
        onMouseDown={handleTransformStart}
        onObjectChange={emitPivotChange}
        onMouseUp={handleTransformEnd}
      />
    </>,
    threeScene,
  );
}
