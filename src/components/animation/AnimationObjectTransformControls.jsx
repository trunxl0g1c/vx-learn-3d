import { TransformControls } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export default function AnimationObjectTransformControls({
  object,
  pivot = [0, 0, 0],
  mode = "rotate",
  enabled = false,
  controlsRef,
  showX = true,
  showY = true,
  showZ = true,
  onTransformingChange,
  onTransformStart,
  onTransformEnd,
  onObjectChange,
  onApplyPivotTransform,
}) {
  const { scene: threeScene } = useThree();
  const draggingRef = useRef(false);
  const localPivotRef = useRef(new THREE.Vector3());
  const worldPivotRef = useRef(new THREE.Vector3());
  const worldQuaternionRef = useRef(new THREE.Quaternion());
  const startObjectWorldMatrixRef = useRef(new THREE.Matrix4());
  const startPivotWorldMatrixRef = useRef(new THREE.Matrix4());
  const pivotObject = useMemo(() => {
    const helper = new THREE.Object3D();
    helper.name = "VXAnimationObjectTransformPivot";
    helper.userData.__vxInternal = true;
    helper.userData.__vxAnimationTransformHelper = true;
    return helper;
  }, []);

  const syncPivotObject = useCallback(() => {
    if (!enabled || !object || draggingRef.current) return false;

    object.updateWorldMatrix?.(true, false);
    localPivotRef.current.fromArray(
      Array.isArray(pivot) ? pivot : [0, 0, 0],
    );
    worldPivotRef.current.copy(localPivotRef.current);
    object.localToWorld(worldPivotRef.current);
    object.getWorldQuaternion(worldQuaternionRef.current);

    pivotObject.position.copy(worldPivotRef.current);
    pivotObject.quaternion.copy(worldQuaternionRef.current);
    pivotObject.scale.set(1, 1, 1);
    pivotObject.updateMatrixWorld(true);
    return true;
  }, [enabled, object, pivot, pivotObject]);

  useFrame(() => {
    syncPivotObject();
  });

  useEffect(
    () => () => {
      draggingRef.current = false;
      if (controlsRef?.current) controlsRef.current.enabled = true;
      onTransformingChange?.(false);
    },
    [controlsRef, onTransformingChange],
  );

  const applyPivotTransform = useCallback(() => {
    if (!enabled || !object || !draggingRef.current) return false;

    pivotObject.updateMatrixWorld(true);
    const applied = onApplyPivotTransform?.(
      startObjectWorldMatrixRef.current,
      startPivotWorldMatrixRef.current,
      pivotObject.matrixWorld,
    );
    if (applied !== false) onObjectChange?.();
    return applied !== false;
  }, [enabled, object, onApplyPivotTransform, onObjectChange, pivotObject]);

  const handleTransformStart = useCallback(() => {
    if (!enabled || !object) return;

    syncPivotObject();
    object.updateWorldMatrix?.(true, false);
    pivotObject.updateMatrixWorld(true);
    startObjectWorldMatrixRef.current.copy(object.matrixWorld);
    startPivotWorldMatrixRef.current.copy(pivotObject.matrixWorld);
    draggingRef.current = true;
    onTransformStart?.(object);
    onTransformingChange?.(true);
    if (controlsRef?.current) controlsRef.current.enabled = false;
  }, [
    controlsRef,
    enabled,
    object,
    onTransformStart,
    onTransformingChange,
    pivotObject,
    syncPivotObject,
  ]);

  const handleTransformEnd = useCallback(() => {
    if (!enabled || !object) return;

    applyPivotTransform();
    draggingRef.current = false;
    onTransformEnd?.(object);
    onTransformingChange?.(false);
    if (controlsRef?.current) controlsRef.current.enabled = true;
  }, [
    applyPivotTransform,
    controlsRef,
    enabled,
    object,
    onTransformEnd,
    onTransformingChange,
  ]);

  if (!enabled || !object) return null;

  return createPortal(
    <>
      <primitive object={pivotObject} />
      <TransformControls
        object={pivotObject}
        mode={mode}
        space="local"
        showX={showX}
        showY={showY}
        showZ={showZ}
        onMouseDown={handleTransformStart}
        onObjectChange={applyPivotTransform}
        onMouseUp={handleTransformEnd}
      />
    </>,
    threeScene,
  );
}
