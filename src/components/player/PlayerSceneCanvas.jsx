import { Canvas } from "@react-three/fiber"
import { Suspense, useRef } from "react"
import {
  OrbitControls,
  Bounds,
  Center,
  Environment,
  TransformControls,
} from "@react-three/drei"
import { EffectComposer, Outline } from "@react-three/postprocessing"

import Model from "../Model"
import Marker from "../Marker"
import LoadingModel from "../viewer/LoadingModel"
import CameraAnimator from "../viewer/CameraAnimator"

export default function PlayerSceneCanvas({
  material,
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
      gl={{
        localClippingEnabled: true,
        antialias: true,
      }}
      onCreated={({ camera, gl }) => {
        cameraRef.current = camera
        gl.toneMappingExposure = viewerSettings.exposure
        window.__PLAYER_RENDERER__ = gl
      }}
      onPointerMissed={() => {
        setSelectedObject(null)
        setOutlineObjects([])
      }}
    >
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

      {viewerSettings.hdri && (
        <Environment
          files={viewerSettings.hdri}
          background={viewerSettings.showHdriBackground}
        />
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
                (activeChapter?.markers || []).map((marker, index) => (
                  <Marker key={marker.id || index} marker={marker} />
                ))}
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