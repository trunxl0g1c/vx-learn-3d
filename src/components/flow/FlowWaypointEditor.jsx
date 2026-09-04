import { TransformControls } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

const WORLD_POSITION = new THREE.Vector3();
const CAMERA_WORLD_POSITION = new THREE.Vector3();
const TEMP_CENTER = new THREE.Vector3();
const TEMP_WORLD_CENTER = new THREE.Vector3();
const TEMP_WORLD_DELTA = new THREE.Vector3();
const TEMP_POINT_POSITION = new THREE.Vector3();

function clonePoints(points) {
  return (Array.isArray(points) ? points : []).map((point) => ({
    ...point,
    position: Array.isArray(point.position)
      ? point.position.slice(0, 3).map(Number)
      : [0, 0, 0],
  }));
}

function getPointsSignature(points) {
  return JSON.stringify(
    (Array.isArray(points) ? points : []).map((point) => [
      point.id,
      ...(Array.isArray(point.position) ? point.position : []),
    ]),
  );
}

function getSelectionCenter(points, selectedPointIds, target) {
  target.set(0, 0, 0);
  let count = 0;

  points.forEach((point) => {
    if (!selectedPointIds.has(point.id)) return;

    target.x += Number(point.position?.[0]) || 0;
    target.y += Number(point.position?.[1]) || 0;
    target.z += Number(point.position?.[2]) || 0;
    count += 1;
  });

  if (count > 0) target.multiplyScalar(1 / count);
  return target;
}

function getScreenSpaceDiameter(camera, worldPosition, viewportHeight, pixels) {
  const safeHeight = Math.max(1, Number(viewportHeight) || 1);
  const safePixels = Math.max(8, Number(pixels) || 14);

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

  return 0.03;
}

function createGuideGeometry(points) {
  const vectors = points.map(
    (point) => new THREE.Vector3(...point.position),
  );

  if (vectors.length < 2) return null;

  const curve =
    vectors.length === 2
      ? new THREE.LineCurve3(vectors[0], vectors[1])
      : new THREE.CatmullRomCurve3(vectors, false, "centripetal", 0.45);

  if (curve.isCatmullRomCurve3) {
    curve.arcLengthDivisions = Math.max(240, vectors.length * 80);
    curve.updateArcLengths();
  }

  const samples = Math.max(48, Math.min(360, vectors.length * 48));
  return new THREE.BufferGeometry().setFromPoints(curve.getPoints(samples));
}

function LiveFlowGuide({ points }) {
  const geometry = useMemo(() => createGuideGeometry(points), [points]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  if (!geometry) return null;

  return (
    <line
      geometry={geometry}
      renderOrder={1102}
      raycast={() => null}
      userData={{ __vxInternal: true, __vxFlowHelper: true }}
    >
      <lineBasicMaterial
        color="#67e8f9"
        transparent
        opacity={0.82}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </line>
  );
}

function WaypointVisual({ point, index, count, selected, onSelect }) {
  const visualRef = useRef(null);
  const anchorRef = useRef(null);
  const { camera, size } = useThree();

  const isStart = index === 0;
  const isEnd = index === count - 1;
  const color = isStart ? "#22c55e" : isEnd ? "#ef4444" : "#22d3ee";

  useFrame(() => {
    const anchor = anchorRef.current;
    const visual = visualRef.current;
    if (!anchor || !visual) return;

    anchor.getWorldPosition(WORLD_POSITION);
    const diameter = getScreenSpaceDiameter(
      camera,
      WORLD_POSITION,
      size.height,
      selected ? 20 : isStart || isEnd ? 16 : 14,
    );
    visual.scale.setScalar(diameter);
  });

  const handlePointerDown = useCallback(
    (event) => {
      event.stopPropagation();
      onSelect?.(point.id);
    },
    [onSelect, point.id],
  );

  return (
    <group ref={anchorRef} position={point.position}>
      <group ref={visualRef}>
        <mesh
          renderOrder={1104}
          userData={{
            __vxInternal: true,
            __vxFlowHelper: true,
            __vxFlowWaypoint: true,
            flowPointId: point.id,
          }}
          onPointerDown={handlePointerDown}
          onClick={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <sphereGeometry args={[0.5, 18, 18]} />
          <meshBasicMaterial
            color={color}
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>

        {selected && (
          <mesh renderOrder={1103} scale={1.5} raycast={() => null}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0.52}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

export default function FlowWaypointEditor({
  flow,
  selectedPointIds = [],
  onSelectPoint,
  onUpdatePoints,
  controlsRef,
  onTransformingChange,
}) {
  const sourcePoints = Array.isArray(flow?.points) ? flow.points : [];
  const sourceSignature = getPointsSignature(sourcePoints);
  const { scene: threeScene } = useThree();
  const editorRootRef = useRef(null);
  const [draftPoints, setDraftPoints] = useState(() => clonePoints(sourcePoints));
  const draftPointsRef = useRef(draftPoints);
  const draggingRef = useRef(false);
  const dragStartPivotRef = useRef(new THREE.Vector3());
  const dragStartPositionsRef = useRef(new Map());
  const pivotObject = useMemo(() => {
    const object = new THREE.Object3D();
    object.name = "VXFlowWaypointTransformPivot";
    object.userData.__vxInternal = true;
    object.userData.__vxFlowHelper = true;
    return object;
  }, []);

  const selectedPointIdSet = useMemo(
    () => new Set(selectedPointIds),
    [selectedPointIds],
  );
  const selectedCount = selectedPointIdSet.size;

  useEffect(() => {
    if (draggingRef.current) return;

    const nextPoints = clonePoints(sourcePoints);
    draftPointsRef.current = nextPoints;
    setDraftPoints(nextPoints);
  }, [flow?.id, sourceSignature]);

  useLayoutEffect(() => {
    if (draggingRef.current || selectedCount === 0) return;

    const coordinateRoot = editorRootRef.current;
    if (!coordinateRoot) return;

    coordinateRoot.updateWorldMatrix(true, false);
    getSelectionCenter(draftPointsRef.current, selectedPointIdSet, TEMP_CENTER);
    TEMP_WORLD_CENTER.copy(TEMP_CENTER);
    coordinateRoot.localToWorld(TEMP_WORLD_CENTER);

    // The pivot is portaled to the Three.js scene root, so its position must
    // be expressed in world coordinates. This avoids applying the model's
    // Center/rotation/scale transform twice to the TransformControls gizmo.
    pivotObject.position.copy(TEMP_WORLD_CENTER);
    pivotObject.quaternion.identity();
    pivotObject.scale.set(1, 1, 1);
    pivotObject.updateMatrixWorld(true);
  }, [pivotObject, selectedCount, selectedPointIdSet, draftPoints]);

  useEffect(
    () => () => {
      if (controlsRef?.current) controlsRef.current.enabled = true;
      onTransformingChange?.(false);
    },
    [controlsRef, onTransformingChange],
  );

  const applyPivotDelta = useCallback(() => {
    if (!draggingRef.current) return [];

    const coordinateRoot = editorRootRef.current;
    if (!coordinateRoot) return [];

    coordinateRoot.updateWorldMatrix(true, false);
    TEMP_WORLD_DELTA.copy(pivotObject.position).sub(dragStartPivotRef.current);
    const updates = [];

    dragStartPositionsRef.current.forEach((startPosition, pointId) => {
      // Flow points are stored in the model-root coordinate system, while the
      // portaled gizmo moves in world space. Convert each start point to world,
      // apply the gizmo delta, then convert it back to the stored local space.
      TEMP_POINT_POSITION.fromArray(startPosition);
      coordinateRoot.localToWorld(TEMP_POINT_POSITION);
      TEMP_POINT_POSITION.add(TEMP_WORLD_DELTA);
      coordinateRoot.worldToLocal(TEMP_POINT_POSITION);

      updates.push({
        pointId,
        position: [
          TEMP_POINT_POSITION.x,
          TEMP_POINT_POSITION.y,
          TEMP_POINT_POSITION.z,
        ],
      });
    });

    if (updates.length === 0) return updates;

    const updateMap = new Map(
      updates.map((update) => [update.pointId, update.position]),
    );
    const nextPoints = draftPointsRef.current.map((point) => {
      const nextPosition = updateMap.get(point.id);
      return nextPosition ? { ...point, position: nextPosition } : point;
    });

    draftPointsRef.current = nextPoints;
    setDraftPoints(nextPoints);
    return updates;
  }, [pivotObject]);

  const handleTransformStart = useCallback(() => {
    if (selectedPointIdSet.size === 0) return;

    draggingRef.current = true;
    dragStartPivotRef.current.copy(pivotObject.position);
    dragStartPositionsRef.current = new Map();

    draftPointsRef.current.forEach((point) => {
      if (!selectedPointIdSet.has(point.id)) return;
      dragStartPositionsRef.current.set(point.id, [...point.position]);
    });

    onTransformingChange?.(true);
    if (controlsRef?.current) controlsRef.current.enabled = false;
  }, [controlsRef, onTransformingChange, pivotObject, selectedPointIdSet]);

  const handleTransformEnd = useCallback(() => {
    const updates = applyPivotDelta();
    draggingRef.current = false;
    dragStartPositionsRef.current.clear();

    if (updates.length > 0) onUpdatePoints?.(updates);

    onTransformingChange?.(false);
    if (controlsRef?.current) controlsRef.current.enabled = true;
  }, [applyPivotDelta, controlsRef, onTransformingChange, onUpdatePoints]);

  if (!flow || draftPoints.length === 0) return null;

  return (
    <group
      ref={editorRootRef}
      name="VXFlowWaypointEditor"
      userData={{ __vxInternal: true }}
    >
      <LiveFlowGuide points={draftPoints} />

      {draftPoints.map((point, index) => (
        <WaypointVisual
          key={point.id}
          point={point}
          index={index}
          count={draftPoints.length}
          selected={selectedPointIdSet.has(point.id)}
          onSelect={onSelectPoint}
        />
      ))}

      {selectedCount > 0 &&
        createPortal(
          <>
            <primitive object={pivotObject} />
            <TransformControls
              object={pivotObject}
              mode="translate"
              space="world"
              size={0.72}
              showX
              showY
              showZ
              onMouseDown={handleTransformStart}
              onObjectChange={applyPivotDelta}
              onMouseUp={handleTransformEnd}
            />
          </>,
          threeScene,
        )}
    </group>
  );
}
