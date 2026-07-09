import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import {
  OrbitControls,
  Bounds,
  Center,
  Environment,
  Html,
  TransformControls,
} from "@react-three/drei"
import { EffectComposer, Outline } from "@react-three/postprocessing"

import Model from "../Model"
import Marker from "../Marker"
import LoadingModel from "../viewer/LoadingModel"
import CameraAnimator from "../viewer/CameraAnimator"
import { getViewerBackgroundStyle } from "../../utils/viewerBackground"
import CustomHdriEnvironment from "../canvas/CustomHdriEnvironment"
import ViewerSceneBackground from '../canvas/ViewerSceneBackground'


const GENERATED_ANNOTATION_COLOR = "#0ea5d8"

function isMeaningfulSceneObject(object) {
  return Boolean(
    object &&
      object.type !== "Bone" &&
      object.type !== "SkeletonHelper" &&
      object.type !== "Camera" &&
      object.type !== "Light" &&
      object.type !== "DirectionalLight" &&
      object.type !== "AmbientLight" &&
      object.type !== "HemisphereLight",
  )
}

function hasRenderableContent(object) {
  if (!object) return false

  let hasMesh = false

  object.traverse((child) => {
    if (child.isMesh) hasMesh = true
  })

  return hasMesh
}

function getDirectAnnotationChildren(rootObject) {
  if (!rootObject) return []

  return rootObject.children.filter(
    (child) => isMeaningfulSceneObject(child) && hasRenderableContent(child),
  )
}

function resolveGeneratedAnnotationRoot(modelScene, selectedObject) {
  if (selectedObject && hasRenderableContent(selectedObject)) {
    return selectedObject
  }

  if (!modelScene) return null

  const directChildren = getDirectAnnotationChildren(modelScene)

  // GLTF files often wrap the real assembly in one Scene/root node. When that
  // happens, use that wrapper as the root so annotations are generated for the
  // first-level assembly children, not every descendant mesh.
  if (directChildren.length === 1) {
    const onlyChildChildren = getDirectAnnotationChildren(directChildren[0])

    if (onlyChildChildren.length > 0) {
      return directChildren[0]
    }
  }

  return modelScene
}

function getAnnotationDisplayName(object, fallback) {
  const name = object?.name || object?.userData?.name || object?.type || fallback

  return String(name || fallback).replace(/[_-]+/g, " ").trim() || fallback
}

function useGeneratedAnnotationTargets(modelScene, selectedObject) {
  return useMemo(() => {
    const root = resolveGeneratedAnnotationRoot(modelScene, selectedObject)
    const directChildren = getDirectAnnotationChildren(root)

    if (directChildren.length > 0) {
      return directChildren.map((object, index) => ({
        object,
        label: getAnnotationDisplayName(object, `Object ${index + 1}`),
      }))
    }

    if (selectedObject && hasRenderableContent(selectedObject)) {
      return [
        {
          object: selectedObject,
          label: getAnnotationDisplayName(selectedObject, "Selected Object"),
        },
      ]
    }

    return []
  }, [modelScene, selectedObject])
}

function GeneratedAnnotationMarker({ index, label, object, rootRef }) {
  const wrapperRef = useRef(null)
  const { camera } = useThree()
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    setHovered(false)
  }, [object])

  useFrame(() => {
    if (!wrapperRef.current || !object || !rootRef?.current) return

    object.updateWorldMatrix(true, true)

    const box = new THREE.Box3().setFromObject(object)

    if (box.isEmpty()) return

    const center = box.getCenter(new THREE.Vector3())
    const localCenter = rootRef.current.worldToLocal(center.clone())
    const distance = camera.position.distanceTo(center)
    const scale = THREE.MathUtils.clamp(distance * 0.0024, 0.45, 1.05)

    wrapperRef.current.position.copy(localCenter)
    wrapperRef.current.scale.setScalar(scale)
  })

  return (
    <group ref={wrapperRef}>
      <Html center occlude={false} zIndexRange={[30, 0]}>
        <button
          type="button"
          onPointerOver={(event) => {
            event.stopPropagation()
            setHovered(true)
          }}
          onPointerOut={(event) => {
            event.stopPropagation()
            setHovered(false)
          }}
          onClick={(event) => event.stopPropagation()}
          style={{
            minWidth: hovered ? 96 : 28,
            height: 28,
            padding: hovered ? "0 10px" : 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            border: `1px solid rgba(103, 232, 249, ${hovered ? 0.95 : 0.55})`,
            background: hovered ? GENERATED_ANNOTATION_COLOR : "rgba(15, 49, 58, 0.86)",
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 800,
            lineHeight: 1,
            whiteSpace: "nowrap",
            boxShadow: hovered
              ? "0 10px 30px rgba(14, 165, 216, 0.35)"
              : "0 8px 22px rgba(0, 0, 0, 0.28)",
            cursor: "default",
            pointerEvents: "auto",
            transition: "all 140ms ease",
          }}
          title={label}
        >
          {hovered ? label : index + 1}
        </button>
      </Html>
    </group>
  )
}

function GeneratedObjectAnnotations({ modelScene, selectedObject, rootRef, enabled }) {
  const targets = useGeneratedAnnotationTargets(modelScene, selectedObject)

  if (!enabled || targets.length === 0) return null

  return (
    <>
      {targets.map((target, index) => (
        <GeneratedAnnotationMarker
          key={target.object.uuid || `${target.label}-${index}`}
          index={index}
          label={target.label}
          object={target.object}
          rootRef={rootRef}
        />
      ))}
    </>
  )
}

function RenderSettingsSync({ viewerSettings }) {
  const { gl, scene, invalidate } = useThree()

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = Number(viewerSettings?.exposure ?? 1)

    if ('environmentIntensity' in scene) {
      scene.environmentIntensity = Number(viewerSettings?.envIntensity ?? 1)
    }

    invalidate()
  }, [gl, scene, invalidate, viewerSettings?.exposure, viewerSettings?.envIntensity])

  return null
}

export default function PlayerSceneCanvas({
  material,
  modelScene,
  viewerSettings,
  outlineObjects,
  setOutlineObjects,
  setSelectedObject,
  cameraRef,
  controlsRef,
  focusTargetRef,
  freePlay,
  selectedObject,
  transformMode,
  activeChapter,
  selectedAnimations,
  animationCommand,
  handleSelectObjectFromPlayer,
  handleDoubleClickObjectFromPlayer,
  handleModelLoaded,
  setAnimations,
  showAnnotations = true,
}) {
  const modelRootRef = useRef(null)

  if (!material?.modelUrl) {
    return (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          color: "#94a3b8",
          fontSize: 20,
          fontWeight: "bold",
        }}
      >
        Load JSON materi terlebih dahulu
      </div>
    )
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 5] }}
      style={getViewerBackgroundStyle(viewerSettings)}
      gl={{
        alpha: true,
        localClippingEnabled: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ camera, gl }) => {
        cameraRef.current = camera
        gl.setClearColor(0x000000, 0)
        gl.toneMappingExposure = viewerSettings.exposure
        window.__PLAYER_RENDERER__ = gl
      }}
      onPointerMissed={() => {
        setSelectedObject(null)
        setOutlineObjects([])
      }}
    >
      <RenderSettingsSync viewerSettings={viewerSettings} />
      <ViewerSceneBackground viewerSettings={viewerSettings} />

      <EffectComposer autoClear={false}>
        {outlineObjects.length > 0 && (
          <Outline
            selection={outlineObjects}
            edgeStrength={8}
            visibleEdgeColor="yellow"
            hiddenEdgeColor="yellow"
            blur={false}
          />
        )}
      </EffectComposer>

      <ambientLight intensity={viewerSettings.ambientLight} />

      {viewerSettings?.hdriSource === "custom" && viewerSettings?.customHdri?.dataUrl ? (
        <CustomHdriEnvironment viewerSettings={viewerSettings} />
      ) : (
        viewerSettings.hdri && (
          <Environment
            files={viewerSettings.hdri}
            background={viewerSettings.showHdriBackground}
            environmentIntensity={viewerSettings.envIntensity}
            backgroundIntensity={viewerSettings.envIntensity}
          />
        )
      )}

      <directionalLight
        position={[5, 8, 5]}
        intensity={viewerSettings.mainLight}
      />

      <directionalLight
        position={[-5, 4, -5]}
        intensity={viewerSettings.fillLight}
      />

      <hemisphereLight
        skyColor="#ffffff"
        groundColor="#aaaaaa"
        intensity={viewerSettings.hemiLight}
      />

      <Suspense fallback={<LoadingModel />}>
        <Bounds fit clip margin={1.2}>
          <Center>
            <group ref={modelRootRef}>
              <Model
                modelUrl={material.modelUrl}
                markerMode={false}
                onSelectObject={handleSelectObjectFromPlayer}
                onDoubleClickObject={handleDoubleClickObjectFromPlayer}
                onModelLoaded={(scene) => {
                  handleModelLoaded(scene || modelRootRef.current)
                }}
                selectedAnimations={selectedAnimations}
                animationCommand={animationCommand}
                onAnimationsLoaded={(clips) => {
                  setAnimations(clips || [])
                }}
              />

              {freePlay && selectedObject && (
                <TransformControls
                  object={selectedObject}
                  mode={transformMode}
                  onMouseDown={() => {
                    controlsRef.current.enabled = false
                  }}
                  onMouseUp={() => {
                    controlsRef.current.enabled = true
                  }}
                />
              )}

              {!freePlay &&
                showAnnotations &&
                (activeChapter?.markers || []).map((marker, index) => (
                  <Marker key={marker.id || index} marker={marker} />
                ))}

              {showAnnotations && (
                <GeneratedObjectAnnotations
                  modelScene={modelScene}
                  selectedObject={selectedObject}
                  rootRef={modelRootRef}
                  enabled={showAnnotations}
                />
              )}
            </group>
          </Center>
        </Bounds>
      </Suspense>

      <CameraAnimator
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
      />

      <OrbitControls
        ref={controlsRef}
        enabled={true}
        enableRotate={true}
        enableZoom={true}
        enablePan={freePlay}
        onStart={() => {
          focusTargetRef.current = null
        }}
      />
    </Canvas>
  )
}
