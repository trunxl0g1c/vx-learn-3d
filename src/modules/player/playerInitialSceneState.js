function cloneTransform(object) {
  return {
    object,
    position: object?.position?.clone?.() || null,
    quaternion: object?.quaternion?.clone?.() || null,
    scale: object?.scale?.clone?.() || null,
    visible: object?.visible !== false,
  };
}

export function capturePlayerInitialSceneState(scene) {
  if (!scene) return null;

  const objects = [];

  scene.traverse((object) => {
    objects.push(cloneTransform(object));
  });

  return {
    scene,
    sceneId: scene.uuid || scene.id || null,
    objects,
  };
}

export function restorePlayerInitialSceneState(scene, snapshot) {
  if (!scene || !snapshot || snapshot.scene !== scene) return false;

  snapshot.objects.forEach((entry) => {
    const object = entry?.object;
    if (!object) return;

    if (entry.position && object.position) {
      object.position.copy(entry.position);
    }

    if (entry.quaternion && object.quaternion) {
      object.quaternion.copy(entry.quaternion);
    }

    if (entry.scale && object.scale) {
      object.scale.copy(entry.scale);
    }

    object.visible = entry.visible !== false;

    delete object.userData?.targetPosition;
    delete object.userData?.targetPositionAnimation;
    delete object.userData?.moveTargetPosition;
    delete object.userData?.moveTargetRotation;
    delete object.userData?.moveTargetTransformAnimation;

    object.updateMatrix?.();
  });

  scene.updateMatrixWorld?.(true);
  return true;
}
