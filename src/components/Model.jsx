import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { useEffect, useRef } from "react";
import * as THREE from "three";

function Model({
  modelUrl,
  onAddMarker,
  onModelLoaded,
  markerMode,
  onSelectObject,

  selectedAnimations,
  animationCommand,
  onAnimationsLoaded,
}) {
  const { scene, animations } = useLoader(GLTFLoader, modelUrl, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const mixerRef = useRef(null);
  const actionsRef = useRef({});

  useEffect(() => {
    if (!scene.userData.__vxCentered) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());

      scene.position.sub(center);
      scene.userData.__vxCentered = true;
      scene.userData.__vxCenterOffset = center.toArray();
    }

    mixerRef.current = new THREE.AnimationMixer(scene);
    actionsRef.current = {};

    animations.forEach((clip) => {
      const name = clip.name || "Unnamed Animation";
      const action = mixerRef.current.clipAction(clip);

      action.stop();
      action.reset();
      action.enabled = false;

      actionsRef.current[name] = action;
    });

    mixerRef.current.setTime(0);

    onAnimationsLoaded?.(
      animations.map((clip) => ({
        name: clip.name || "Unnamed Animation",
        duration: clip.duration,
      })),
    );

    onModelLoaded?.(scene);
  }, [scene, animations]);

  useEffect(() => {
    if (!animationCommand) return;

    if (animationCommand.type === "play") {
      const animationConfig =
        animationCommand.selectedAnimations || selectedAnimations || {};

      Object.entries(actionsRef.current).forEach(([name, action]) => {
        const config = animationConfig[name];

        if (!config?.selected) {
          action.stop();
          action.enabled = false;
          return;
        }

        action.enabled = true;
        action.reset();

        if (config.loop) {
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
        } else {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }

        action.play();
      });
    }

    if (animationCommand.type === "playChapter") {
      Object.values(actionsRef.current).forEach((action) => {
        action.stop();
        action.enabled = false;
      });

      const chapterAnimations = animationCommand.animations || [];

      chapterAnimations.forEach((config) => {
        const action = actionsRef.current[config.name];

        if (!action) return;

        action.enabled = true;
        action.reset();

        if (config.loop) {
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.clampWhenFinished = false;
        } else {
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
        }

        action.play();
      });
    }

    if (animationCommand.type === "stop") {
      Object.values(actionsRef.current).forEach((action) => {
        action.stop();
        action.reset();
        action.enabled = false;
      });

      mixerRef.current?.setTime(0);
      mixerRef.current?.update(0);
    }
  }, [animationCommand, selectedAnimations]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);

    scene.traverse((child) => {
      if (child.isMesh && child.userData.targetPosition) {
        child.position.lerp(child.userData.targetPosition, 0.08);

        const distance = child.position.distanceTo(
          child.userData.targetPosition,
        );

        if (distance < 0.01) {
          child.position.copy(child.userData.targetPosition);
          delete child.userData.targetPosition;
        }
      }

      if (child.userData.moveTargetPosition) {
        child.position.lerp(child.userData.moveTargetPosition, 0.08);

        if (child.userData.moveTargetRotation) {
          child.rotation.x +=
            (child.userData.moveTargetRotation.x - child.rotation.x) * 0.08;
          child.rotation.y +=
            (child.userData.moveTargetRotation.y - child.rotation.y) * 0.08;
          child.rotation.z +=
            (child.userData.moveTargetRotation.z - child.rotation.z) * 0.08;
        }

        const distance = child.position.distanceTo(
          child.userData.moveTargetPosition,
        );

        if (distance < 0.01) {
          child.position.copy(child.userData.moveTargetPosition);

          if (child.userData.moveTargetRotation) {
            child.rotation.copy(child.userData.moveTargetRotation);
          }

          delete child.userData.moveTargetPosition;
          delete child.userData.moveTargetRotation;
        }
      }
    });
  });

  // const handleClick = (e) => {
  //   e.stopPropagation()

  //   if (markerMode) {
  //     const text = prompt("Masukkan nama bagian:")

  //     if (!text) return

  //     const localPoint = scene.parent
  //       ? scene.parent.worldToLocal(e.point.clone())
  //       : e.point.clone()

  //     onAddMarker?.({
  //       position: [localPoint.x, localPoint.y, localPoint.z],
  //       text,
  //     })

  //     return
  //   }

  //   const isObjectVisible = (object) => {
  //     let current = object

  //     while (current) {
  //       if (!current.visible) return false
  //       current = current.parent
  //     }

  //     return true
  //   }

  //   const visibleHit = e.intersections.find((hit) =>
  //     isObjectVisible(hit.object)
  //   )

  //   if (!visibleHit) return

  //   onSelectObject?.(visibleHit.object)
  // }

  const handleClick = (e) => {
    e.stopPropagation();

    if (markerMode) {
      const localPoint = scene.parent
        ? scene.parent.worldToLocal(e.point.clone())
        : e.point.clone();

      onAddMarker?.({
        position: [localPoint.x, localPoint.y, localPoint.z],
        text: "",
      });

      return;
    }

    const isObjectVisible = (object) => {
      let current = object;

      while (current) {
        if (!current.visible) return false;
        current = current.parent;
      }

      return true;
    };

    const visibleHit = e.intersections.find((hit) =>
      isObjectVisible(hit.object),
    );

    if (!visibleHit) return;

    onSelectObject?.(visibleHit.object);
  };

  return <primitive object={scene} onClick={handleClick} />;
}

export default Model;
