import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  Center,
  Bounds,
  TransformControls,
  Environment,
} from '@react-three/drei'
import { Suspense } from 'react'

import Marker from '../Marker'
import Model from '../Model'
import LoadingModel from '../viewer/LoadingModel'
import CameraAnimator from '../viewer/CameraAnimator'
import ModelRotator from '../viewer/ModelRotator'

import { EffectComposer, Outline } from '@react-three/postprocessing'

export default function SceneCanvas({
  cameraRef,
  controlsRef,
  focusTargetRef,
  viewerSettings,
  outlineObjects,
  modelUrl,
  addMarker,
  handleModelLoaded,
  markerMode,
  selectObjectFromMesh,
  selectedAnimations,
  animationCommand,
  setAnimations,
  setSelectedAnimations,
  activeMarkers,
  modelScene,
  targetRotationY,
  isAutoRotating,
  setIsAutoRotating,
  selectedObject,
  isTransforming,
  setIsTransforming,
  orbitEnabled,
  setOrbitEnabled,
  setSelectedObject,
  setOutlineObjects,
  setSelectedObjectName,
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5] }}
      gl={{ localClippingEnabled: true }}
      onCreated={({ camera, gl }) => {
        cameraRef.current = camera
        gl.toneMappingExposure = viewerSettings.exposure
        window.__EDITOR_RENDERER__ = gl
      }}
      onPointerMissed={() => {
        setSelectedObject(null)
        setOutlineObjects([])
        setSelectedObjectName('')
        setOrbitEnabled(true)
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

      {modelUrl && (
        <Suspense fallback={<LoadingModel />}>
          <Bounds fit clip margin={1.2}>
            <Center>
              <Model
                modelUrl={modelUrl}
                onAddMarker={addMarker}
                onModelLoaded={handleModelLoaded}
                markerMode={markerMode}
                onSelectObject={selectObjectFromMesh}
                selectedAnimations={selectedAnimations}
                animationCommand={animationCommand}
                onAnimationsLoaded={(clips) => {
                  setAnimations(clips)

                  const initial = {}

                  clips.forEach((clip) => {
                    initial[clip.name] = {
                      selected: false,
                      loop: false,
                    }
                  })

                  setSelectedAnimations(initial)
                }}
              />

              {activeMarkers.map((marker) => (
                <Marker
                  key={marker.id}
                  marker={marker}
                />
              ))}
            </Center>
          </Bounds>
        </Suspense>
      )}

      <CameraAnimator
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
      />

      <ModelRotator
        modelScene={modelScene}
        targetRotationY={targetRotationY}
        enabled={isAutoRotating}
        onFinish={() => setIsAutoRotating(false)}
      />

      {selectedObject && (
        <TransformControls
          object={selectedObject}
          mode="translate"
          space="world"
          onMouseDown={() => {
            setIsTransforming(true)
            setOrbitEnabled(false)
            setIsAutoRotating(false)
            focusTargetRef.current = null

            if (controlsRef.current) {
              controlsRef.current.enabled = false
            }
          }}
          onMouseUp={() => {
            setIsTransforming(false)
            setOrbitEnabled(true)

            if (controlsRef.current) {
              controlsRef.current.enabled = true
            }
          }}
        />
      )}

      <OrbitControls
        ref={controlsRef}
        enabled={orbitEnabled && !isTransforming}
        enableRotate={orbitEnabled && !isTransforming}
        onStart={() => {
          if (!orbitEnabled || isTransforming) return

          focusTargetRef.current = null
          setIsAutoRotating(false)
        }}
      />
    </Canvas>
  )
}
