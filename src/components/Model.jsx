import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { annotateGltfLogicalObjects } from "../utils/objectTreeUtils";
import {
  createMarkerAttachment,
  createMarkerConnector,
  DEFAULT_MARKER_LABEL_OFFSET,
  findVisibleMarkerPlacementHit,
} from "../engine/marker";

function applyAnimationActionConfig(action, config = {}) {
  if (!action) return;

  const speed = Number(config.speed);
  action.setEffectiveTimeScale(
    Number.isFinite(speed) && speed > 0 ? speed : 1,
  );

  if (config.loop) {
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
  } else {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  }
}


function forEachAnimationAction(actionGroups, callback) {
  Object.values(actionGroups || {}).forEach((actions) => {
    (Array.isArray(actions) ? actions : [actions]).forEach((action) => {
      if (action) callback(action);
    });
  });
}

function getAnimationActions(actionGroups, animationName) {
  const actions = actionGroups?.[animationName];
  if (!actions) return [];
  return Array.isArray(actions) ? actions : [actions];
}

function getAnimationClipName(clip) {
  return clip?.name || "Unnamed Animation";
}

function createAnimationSummaries(clips = []) {
  const summariesByName = new Map();

  clips.forEach((clip) => {
    const name = getAnimationClipName(clip);
    const duration = Number(clip?.duration) || 0;
    const current = summariesByName.get(name);

    if (current) {
      current.duration = Math.max(current.duration, duration);
      current.clipCount += 1;
      return;
    }

    summariesByName.set(name, {
      name,
      duration,
      clipCount: 1,
    });
  });

  return Array.from(summariesByName.values());
}

function Model({
  modelUrl,
  onAddMarker,
  onModelLoaded,
  markerMode,
  flowPointMode = false,
  onAddFlowPoint,
  onSelectObject,
  onDoubleClickObject,

  selectedAnimations,
  animationCommand,
  onAnimationsLoaded,
}) {
  const { scene, animations, parser } = useLoader(
    GLTFLoader,
    modelUrl,
    (loader) => {
      loader.setMeshoptDecoder(MeshoptDecoder);
      // Needed when modelUrl points at GET /content-media/stream (streamed
      // from the backend instead of a local blob: URL) — that route is
      // cookie-authenticated, and fetch()-based loaders don't send
      // cross-origin cookies unless told to. No effect on blob: URLs.
      loader.setWithCredentials(true);
    },
  );

  const mixerRef = useRef(null);
  const actionsRef = useRef({});

  useEffect(() => {
    annotateGltfLogicalObjects(scene, parser);

    if (!scene.userData.__vxCentered) {
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());

      scene.position.sub(center);
      scene.userData.__vxCentered = true;
      scene.userData.__vxCenterOffset = center.toArray();
    }

    scene.traverse((child) => {
      if (!child?.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;
    actionsRef.current = {};

    animations.forEach((clip) => {
      const name = getAnimationClipName(clip);
      const action = mixer.clipAction(clip);

      action.stop();
      action.reset();
      action.enabled = false;

      const actionGroup = actionsRef.current[name] || [];
      actionGroup.push(action);
      actionsRef.current[name] = actionGroup;
    });

    mixer.setTime(0);

    onAnimationsLoaded?.(createAnimationSummaries(animations));

    onModelLoaded?.(scene);

    return () => {
      forEachAnimationAction(actionsRef.current, (action) => {
        action.stop();
        action.enabled = false;
      });

      mixer.stopAllAction();
      mixer.uncacheRoot(scene);

      if (mixerRef.current === mixer) {
        mixerRef.current = null;
      }

      actionsRef.current = {};
    };
  }, [scene, animations, parser]);

  useEffect(() => {
    if (!animationCommand) return;

    if (animationCommand.type === "play") {
      const animationConfig =
        animationCommand.selectedAnimations || selectedAnimations || {};

      Object.entries(actionsRef.current).forEach(([name, actions]) => {
        const config = animationConfig[name];

        getAnimationActions({ [name]: actions }, name).forEach((action) => {
          if (!config?.selected) {
            action.stop();
            action.enabled = false;
            return;
          }

          action.enabled = true;
          action.reset();

          applyAnimationActionConfig(action, config);
          action.play();
        });
      });
    }

    if (animationCommand.type === "playChapter") {
      forEachAnimationAction(actionsRef.current, (action) => {
        action.stop();
        action.enabled = false;
      });

      const chapterAnimations = animationCommand.animations || [];

      chapterAnimations.forEach((config) => {
        const actions = getAnimationActions(
          actionsRef.current,
          config.name,
        );

        actions.forEach((action) => {
          action.enabled = true;
          action.reset();

          applyAnimationActionConfig(action, config);
          action.play();
        });
      });
    }

    if (animationCommand.type === "pause") {
      forEachAnimationAction(actionsRef.current, (action) => {
        action.paused = true;
      });
    }

    if (animationCommand.type === "resume") {
      forEachAnimationAction(actionsRef.current, (action) => {
        if (action.enabled) action.paused = false;
      });
    }

    if (animationCommand.type === "seek") {
      const time = Number(animationCommand.time) || 0;

      mixerRef.current?.setTime(time);
      mixerRef.current?.update(0);
    }

    if (animationCommand.type === "setSpeed") {
      const speed = Number(animationCommand.speed) || 1;
      const targetName = animationCommand.animationName;

      Object.entries(actionsRef.current).forEach(([name, actions]) => {
        if (targetName && name !== targetName) return;
        getAnimationActions({ [name]: actions }, name).forEach((action) => {
          action.setEffectiveTimeScale(speed);
        });
      });
    }

    if (animationCommand.type === "updateAnimationConfig") {
      const animationName = animationCommand.animationName;
      getAnimationActions(actionsRef.current, animationName).forEach(
        (action) => {
          applyAnimationActionConfig(action, animationCommand.config);
        },
      );
    }

    if (animationCommand.type === "stop") {
      forEachAnimationAction(actionsRef.current, (action) => {
        action.stop();
        action.reset();
        action.enabled = false;
        action.paused = false;
        action.setEffectiveTimeScale(1);
      });

      mixerRef.current?.setTime(0);
      mixerRef.current?.update(0);
    }
  }, [animationCommand]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);

    scene.traverse((child) => {
      if (child.isMesh && child.userData.targetPosition) {
        const animation = child.userData.targetPositionAnimation;

        if (animation?.from && animation?.startedAt) {
          const now =
            typeof performance !== "undefined" &&
            typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          const duration = Math.max(animation.duration || 450, 1);
          const progress = Math.min((now - animation.startedAt) / duration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);

          child.position.lerpVectors(
            animation.from,
            child.userData.targetPosition,
            easedProgress,
          );

          if (progress >= 1) {
            child.position.copy(child.userData.targetPosition);
            delete child.userData.targetPosition;
            delete child.userData.targetPositionAnimation;
          }
        } else {
          child.position.lerp(child.userData.targetPosition, 0.08);

          const distance = child.position.distanceTo(
            child.userData.targetPosition,
          );

          if (distance < 0.01) {
            child.position.copy(child.userData.targetPosition);
            delete child.userData.targetPosition;
          }
        }
      }

      if (child.userData.moveTargetPosition) {
        const transformAnimation =
          child.userData.moveTargetTransformAnimation;

        if (
          transformAnimation?.fromPosition &&
          transformAnimation?.fromQuaternion &&
          transformAnimation?.targetQuaternion &&
          transformAnimation?.startedAt
        ) {
          const now =
            typeof performance !== "undefined" &&
            typeof performance.now === "function"
              ? performance.now()
              : Date.now();
          const duration = Math.max(transformAnimation.duration || 560, 1);
          const progress = Math.min(
            (now - transformAnimation.startedAt) / duration,
            1,
          );
          const easedProgress = 1 - Math.pow(1 - progress, 3);

          child.position.lerpVectors(
            transformAnimation.fromPosition,
            child.userData.moveTargetPosition,
            easedProgress,
          );
          child.quaternion.slerpQuaternions(
            transformAnimation.fromQuaternion,
            transformAnimation.targetQuaternion,
            easedProgress,
          );

          if (progress >= 1) {
            child.position.copy(child.userData.moveTargetPosition);
            child.quaternion.copy(transformAnimation.targetQuaternion);

            delete child.userData.moveTargetPosition;
            delete child.userData.moveTargetRotation;
            delete child.userData.moveTargetTransformAnimation;
          }
        } else {
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
            delete child.userData.moveTargetTransformAnimation;
          }
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


  const getVisibleHit = (e) => {
    const isObjectVisible = (object) => {
      let current = object;

      while (current) {
        if (!current.visible) return false;
        current = current.parent;
      }

      return true;
    };

    return (
      e.intersections.find(
        (hit) =>
          !hit.object?.userData?.__vxInternal &&
          isObjectVisible(hit.object),
      ) || null
    );
  };

  const getFlowPointSurfaceOffset = () => {
    if (Number.isFinite(scene.userData.__vxFlowPointSurfaceOffset)) {
      return scene.userData.__vxFlowPointSurfaceOffset;
    }

    scene.updateWorldMatrix?.(true, true);
    const size = new THREE.Box3()
      .setFromObject(scene)
      .getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z, 1);
    const offset = THREE.MathUtils.clamp(maxSize * 0.0025, 0.002, 0.035);

    scene.userData.__vxFlowPointSurfaceOffset = offset;
    return offset;
  };

  const handleClick = (e) => {
    e.stopPropagation();

    if (flowPointMode) {
      const hit = getVisibleHit(e);
      const worldPoint = (hit?.point || e.point).clone();

      if (hit?.face?.normal && hit.object?.matrixWorld) {
        const worldNormal = hit.face.normal
          .clone()
          .transformDirection(hit.object.matrixWorld)
          .normalize();

        worldPoint.addScaledVector(worldNormal, getFlowPointSurfaceOffset());
      }

      const localPoint = scene.parent
        ? scene.parent.worldToLocal(worldPoint)
        : worldPoint;

      onAddFlowPoint?.([localPoint.x, localPoint.y, localPoint.z]);
      return;
    }

    if (markerMode) {
      const hit = findVisibleMarkerPlacementHit(
        e?.intersections,
        scene,
        e?.ray,
      );

      // Marker mode only accepts a visible renderable surface. Never fall back
      // to the root event point because that can belong to an invisible object
      // in front of the intended inner part.
      if (!hit?.object || !hit?.point) return;

      const worldPoint = hit.point.clone();
      const localPoint = scene.parent
        ? scene.parent.worldToLocal(worldPoint.clone())
        : worldPoint.clone();
      const targetObject = hit.object;
      const labelOffset = [...DEFAULT_MARKER_LABEL_OFFSET];

      onAddMarker?.({
        position: [localPoint.x, localPoint.y, localPoint.z],
        attachment: createMarkerAttachment({
          object: targetObject,
          point: worldPoint,
          modelScene: scene,
        }),
        labelOffset,
        connector: createMarkerConnector(labelOffset),
        text: "",
      });

      return;
    }

    const hit = getVisibleHit(e);
    const object = hit?.object || null;

    if (!object) return;

    onSelectObject?.(object);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();

    const hit = getVisibleHit(e);
    const object = hit?.object || null;

    if (!object) return;

    onDoubleClickObject?.(object);
  };

  return (
    <primitive
      object={scene}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    />
  );
}

export default Model;
