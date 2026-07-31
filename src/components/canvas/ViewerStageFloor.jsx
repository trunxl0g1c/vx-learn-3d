import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { getViewerBackground } from "../../utils/viewerBackground";

const SHADOW_PLANE_OFFSET = 0.006;
const DEFAULT_LAYOUT = {
  x: 0,
  z: 0,
  y: -0.01,
  planeSize: 240,
};

function computeStageLayout(root, box, size, center) {
  root.updateWorldMatrix?.(true, true);
  box.setFromObject(root);
  if (box.isEmpty()) return null;

  box.getSize(size);
  box.getCenter(center);

  const baseSpan = Math.max(size.x, size.z, 1);
  const planeSize = Math.max(baseSpan * 48, 240);
  const floorOffset = Math.max(baseSpan * 0.0025, 0.002);

  return {
    x: center.x,
    z: center.z,
    y: box.min.y - floorOffset,
    planeSize,
  };
}

function getFloorMaterialProperties(glossiness) {
  const safeGlossiness = Math.min(1, Math.max(0, Number(glossiness) || 0));

  return {
    roughness: THREE.MathUtils.lerp(1, 0.18, safeGlossiness),
    metalness: THREE.MathUtils.lerp(0, 0.06, safeGlossiness),
    clearcoat: THREE.MathUtils.lerp(0, 0.22, safeGlossiness),
    clearcoatRoughness: THREE.MathUtils.lerp(1, 0.2, safeGlossiness),
  };
}

export default function ViewerStageFloor({
  viewerSettings,
  modelRootRef,
  modelScene = null,
}) {
  const background = getViewerBackground(viewerSettings);
  const isStage = background.type === "stage";
  const boxRef = useRef(new THREE.Box3());
  const sizeRef = useRef(new THREE.Vector3());
  const centerRef = useRef(new THREE.Vector3());
  const lastSignatureRef = useRef("");
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const floorMaterial = getFloorMaterialProperties(
    background.stageFloorGlossiness,
  );

  useFrame(() => {
    const stageTarget = modelScene || modelRootRef?.current;

    if (!isStage || !stageTarget) return;

    const nextLayout = computeStageLayout(
      stageTarget,
      boxRef.current,
      sizeRef.current,
      centerRef.current,
    );

    if (!nextLayout) return;

    const signature = [
      nextLayout.x,
      nextLayout.y,
      nextLayout.z,
      nextLayout.planeSize,
    ]
      .map((value) => value.toFixed(3))
      .join(":");

    if (signature === lastSignatureRef.current) return;

    lastSignatureRef.current = signature;
    setLayout(nextLayout);
  });

  if (!isStage) return null;

  return (
    <group position={[layout.x, layout.y, layout.z]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        userData={{ __vxInternal: true }}
        raycast={() => null}
        renderOrder={-2}
      >
        <planeGeometry args={[layout.planeSize, layout.planeSize, 1, 1]} />
        <meshPhysicalMaterial
          color={background.stageFloorColor}
          roughness={floorMaterial.roughness}
          metalness={floorMaterial.metalness}
          clearcoat={floorMaterial.clearcoat}
          clearcoatRoughness={floorMaterial.clearcoatRoughness}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, SHADOW_PLANE_OFFSET, 0]}
        receiveShadow
        userData={{ __vxInternal: true }}
        raycast={() => null}
        renderOrder={-1}
      >
        <planeGeometry args={[layout.planeSize, layout.planeSize, 1, 1]} />
        <shadowMaterial
          transparent
          color="#000000"
          opacity={background.stageShadowOpacity}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
}
