import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import {
  getViewerGrid,
  getViewerGridTransform,
  getViewerGridTransformForObject,
} from "../../engine/viewer";

const disableRaycast = () => null;

function transformSignature(transform) {
  return [...transform.position, ...transform.rotation]
    .map((value) => Number(value || 0).toFixed(5))
    .join(":");
}

export default function ViewerSceneGrid({
  viewerSettings,
  modelRootRef = null,
  modelScene = null,
  player = false,
}) {
  const grid = getViewerGrid(viewerSettings);
  const fallbackTransform = getViewerGridTransform(grid);
  const [transform, setTransform] = useState(fallbackTransform);
  const lastPlacementKeyRef = useRef("");
  const lastTransformSignatureRef = useRef(transformSignature(fallbackTransform));

  useEffect(() => {
    const nextFallback = getViewerGridTransform(grid);
    lastPlacementKeyRef.current = "";
    lastTransformSignatureRef.current = transformSignature(nextFallback);
    setTransform(nextFallback);
  }, [grid.plane, grid.offset]);

  useFrame(() => {
    if (!grid.enabled || (player && !grid.showInPlayer)) return;

    const object3D = modelRootRef?.current || modelScene;
    if (!object3D) return;

    const placementKey = [
      modelScene?.uuid || "model",
      grid.plane,
      grid.offset,
      grid.size,
      grid.divisions,
    ].join(":");

    if (lastPlacementKeyRef.current === placementKey) return;

    const nextTransform = getViewerGridTransformForObject(grid, object3D);
    if (!nextTransform) return;

    const nextSignature = transformSignature(nextTransform);

    lastPlacementKeyRef.current = placementKey;
    if (nextSignature === lastTransformSignatureRef.current) return;

    lastTransformSignatureRef.current = nextSignature;
    setTransform(nextTransform);
  });

  if (!grid.enabled || (player && !grid.showInPlayer)) return null;

  return (
    <gridHelper
      args={[grid.size, grid.divisions, grid.centerColor, grid.gridColor]}
      position={transform.position}
      rotation={transform.rotation}
      renderOrder={-1000}
      frustumCulled={false}
      raycast={disableRaycast}
      userData={{ __vxInternal: true }}
      material-transparent
      material-opacity={grid.opacity}
      material-depthTest={true}
      material-depthWrite={false}
      material-toneMapped={false}
    />
  );
}
