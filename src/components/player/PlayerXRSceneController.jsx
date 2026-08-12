import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function createControllerRay() {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  ]);
  const material = new THREE.LineBasicMaterial({ color: 0x59d7ff });
  const line = new THREE.Line(geometry, material);
  line.name = "VIQUBED_XR_CONTROLLER_RAY";
  line.scale.z = 4;
  line.frustumCulled = false;
  return line;
}

export default function PlayerXRSceneController({
  mode = null,
  settings,
  rootRef,
  modelScene,
  onSelectObject,
}) {
  const { gl, scene } = useThree();
  const reticleRef = useRef(null);
  const hitTestSourceRef = useRef(null);
  const hitTestSessionRef = useRef(null);
  const placementReadyRef = useRef(false);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const rayOrigin = useMemo(() => new THREE.Vector3(), []);
  const rayDirection = useMemo(() => new THREE.Vector3(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);
  const reticleGeometry = useMemo(
    () => new THREE.RingGeometry(0.08, 0.105, 32).rotateX(-Math.PI / 2),
    [],
  );

  useEffect(() => () => reticleGeometry.dispose(), [reticleGeometry]);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;

    if (mode === "vr") {
      root.visible = true;
      root.position.set(
        0,
        Number(settings?.vr?.spawnHeight || 0),
        -Math.max(0.25, Number(settings?.vr?.spawnDistance || 2)),
      );
      root.quaternion.identity();
      root.scale.setScalar(Math.max(0.01, Number(settings?.vr?.scale || 1)));
    } else if (mode === "ar") {
      root.visible = settings?.ar?.placement === "fixed";
      root.position.set(0, 0, settings?.ar?.placement === "fixed" ? -1.25 : 0);
      root.quaternion.identity();
      root.scale.setScalar(Math.max(0.01, Number(settings?.ar?.scale || 1)));
      placementReadyRef.current = settings?.ar?.placement === "fixed";
    } else {
      root.visible = true;
      root.position.set(0, 0, 0);
      root.quaternion.identity();
      root.scale.setScalar(1);
      placementReadyRef.current = false;
    }

    root.updateMatrixWorld(true);
    return undefined;
  }, [mode, rootRef, settings?.ar?.placement, settings?.ar?.scale, settings?.vr?.scale, settings?.vr?.spawnDistance, settings?.vr?.spawnHeight]);

  useEffect(() => {
    if (mode !== "vr" || settings?.vr?.controllerRay === false) return undefined;

    const controllers = [0, 1].map((index) => gl.xr.getController(index));
    const cleanups = controllers.map((controller) => {
      const ray = createControllerRay();
      controller.add(ray);
      scene.add(controller);

      const handleSelect = () => {
        if (!modelScene) return;
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        rayOrigin.setFromMatrixPosition(controller.matrixWorld);
        rayDirection.set(0, 0, -1).applyMatrix4(tempMatrix).normalize();
        raycaster.set(rayOrigin, rayDirection);
        const intersections = raycaster.intersectObject(modelScene, true);
        const hit = intersections.find(
          (entry) => entry.object?.visible !== false && entry.object?.isMesh,
        );
        if (hit?.object) onSelectObject?.(hit.object);
      };

      controller.addEventListener("select", handleSelect);
      return () => {
        controller.removeEventListener("select", handleSelect);
        controller.remove(ray);
        scene.remove(controller);
        ray.geometry.dispose();
        ray.material.dispose();
      };
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [gl, mode, modelScene, onSelectObject, rayDirection, rayOrigin, raycaster, scene, settings?.vr?.controllerRay, tempMatrix]);

  useEffect(() => {
    if (mode !== "ar" || settings?.ar?.placement !== "surface") {
      hitTestSourceRef.current?.cancel?.();
      hitTestSourceRef.current = null;
      hitTestSessionRef.current = null;
      return undefined;
    }

    let cancelled = false;
    const session = gl.xr.getSession?.();
    if (!session || typeof session.requestHitTestSource !== "function") {
      return undefined;
    }

    hitTestSessionRef.current = session;
    session
      .requestReferenceSpace("viewer")
      .then((viewerSpace) => session.requestHitTestSource({ space: viewerSpace }))
      .then((source) => {
        if (cancelled) {
          source?.cancel?.();
          return;
        }
        hitTestSourceRef.current = source;
      })
      .catch(() => {
        hitTestSourceRef.current = null;
      });

    const handleSelect = () => {
      const root = rootRef?.current;
      const reticle = reticleRef.current;
      if (!root || !reticle?.visible) return;

      reticle.matrix.decompose(tempPosition, tempQuaternion, tempScale);
      root.visible = true;
      root.position.copy(tempPosition);
      root.quaternion.copy(tempQuaternion);
      root.scale.setScalar(Math.max(0.01, Number(settings?.ar?.scale || 1)));
      root.updateMatrixWorld(true);
      placementReadyRef.current = true;
    };

    session.addEventListener("select", handleSelect);

    return () => {
      cancelled = true;
      session.removeEventListener("select", handleSelect);
      hitTestSourceRef.current?.cancel?.();
      hitTestSourceRef.current = null;
      hitTestSessionRef.current = null;
    };
  }, [gl, mode, rootRef, settings?.ar?.placement, settings?.ar?.scale, tempPosition, tempQuaternion, tempScale]);

  useFrame((state, delta, frame) => {
    if (mode !== "ar" || settings?.ar?.placement !== "surface") return;
    const reticle = reticleRef.current;
    const source = hitTestSourceRef.current;
    if (!reticle || !frame || !source) return;

    const referenceSpace = gl.xr.getReferenceSpace?.();
    if (!referenceSpace) return;

    const hit = frame.getHitTestResults(source)[0];
    if (!hit || placementReadyRef.current) {
      reticle.visible = false;
      return;
    }

    const pose = hit.getPose(referenceSpace);
    if (!pose) {
      reticle.visible = false;
      return;
    }

    reticle.visible = true;
    reticle.matrix.fromArray(pose.transform.matrix);
  });

  if (mode !== "ar" || settings?.ar?.placement !== "surface") return null;

  return (
    <mesh ref={reticleRef} matrixAutoUpdate={false} visible={false}>
      <primitive object={reticleGeometry} attach="geometry" />
      <meshBasicMaterial color="#59d7ff" side={THREE.DoubleSide} />
    </mesh>
  );
}
