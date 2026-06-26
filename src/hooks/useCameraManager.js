import * as THREE from "three";

export function useCameraManager({
  modelScene,
  setTargetRotationY,
  setIsAutoRotating,
  focusTargetRef,
  controlsRef,
}) {
  const focusObject = (object) => {
    if (!object || !modelScene) return;

    const box = new THREE.Box3().setFromObject(object);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    box.getCenter(center);
    box.getSize(size);

    const maxSize = Math.max(size.x, size.y, size.z);

    // makin kecil angka ini, makin dekat / makin besar object terlihat
    const distance = Math.max(maxSize * 1.8, 0.1);

    const direction = new THREE.Vector3(0.8, 0.45, 1).normalize();

    const cameraPosition = center
      .clone()
      .add(direction.multiplyScalar(distance));

    // penting: orbit pivot pindah ke center object
    if (controlsRef?.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }

    focusTargetRef.current = {
      cameraPosition,
      target: center,
    };

    // jangan auto rotate model saat select object
    // karena auto rotate masih memakai pivot global model
    setIsAutoRotating(false);

    if (modelScene) {
      setTargetRotationY(modelScene.rotation.y);
    }
  };

  return { focusObject };
}