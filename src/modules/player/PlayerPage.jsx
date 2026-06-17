import { Canvas, useFrame } from "@react-three/fiber"
import { Suspense, useRef, useState } from "react"
import * as THREE from "three"

import {
  OrbitControls,
  Html,
  useProgress,
  Bounds,
  Center,
  Environment,
} from "@react-three/drei"

import Model from "../../components/Model"
import Marker from "../../components/Marker"
import { EffectComposer, Outline } from "@react-three/postprocessing"

function LoadingModel() {
  const { progress } = useProgress()
  const percent = Math.min(100, Math.max(0, Math.round(progress)))

  return (
    <Html center>
      <div
        style={{
          background: "white",
          padding: "18px 24px",
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
          minWidth: 280,
          textAlign: "center",
          color: "#111827",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: 18, marginBottom: 12 }}>
          Loading 3D Model...
        </div>

        <div
          style={{
            width: "100%",
            height: 14,
            background: "#e5e7eb",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: "#2563eb",
              transition: "width 0.2s ease",
            }}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 14, fontWeight: "bold" }}>
          {percent}%
        </div>
      </div>
    </Html>
  )
}

function CameraAnimator({ cameraRef, controlsRef, focusTargetRef }) {
  useFrame(() => {
    if (!focusTargetRef.current) return
    if (!cameraRef.current || !controlsRef.current) return

    cameraRef.current.position.lerp(
      focusTargetRef.current.cameraPosition,
      0.08
    )

    controlsRef.current.target.lerp(
      focusTargetRef.current.target,
      0.08
    )

    controlsRef.current.update()

    const distance = cameraRef.current.position.distanceTo(
      focusTargetRef.current.cameraPosition
    )

    if (distance < 0.02) {
      focusTargetRef.current = null
    }
  })

  return null
}

export default function PlayerPage() {
  const [material, setMaterial] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [modelScene, setModelScene] = useState(null)
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true)
  const [viewerSettings, setViewerSettings] = useState({
    exposure: 1.8,

    ambientLight: 2.5,
    mainLight: 4,
    fillLight: 2,
    hemiLight: 2,
    envIntensity: 3,

    shaderMode: "original",
    metalness: 0.3,
    roughness: 0.8,
  })

  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const focusTargetRef = useRef(null)
  const [outlineObjects, setOutlineObjects] = useState([])
  const [markerScale, setMarkerScale] = useState(0.08)
  const activeChapter = material?.chapters?.find(
    (chapter) => chapter.id === activeChapterId
  )

  const loadJsonFile = async (file) => {
    if (!file) return

    const text = await file.text()
    const json = JSON.parse(text)

   setMaterial(json)
    setActiveChapterId(json.chapters?.[0]?.id || null)

    if (json.viewerSettings) {
      setViewerSettings((prev) => ({
        ...prev,
        ...json.viewerSettings,
      }))
    }
  }

  const normalizeName = (name) => {
        return (name || "")
          .toLowerCase()
          .replaceAll("_", " ")
          .replace(/\s+/g, " ")
          .trim()
      }

      const findObjectByName = (root, objectName) => {
        if (!root || !objectName) return null

        let found = null
        const targetName = normalizeName(objectName)

        root.traverse((child) => {
          if (found) return

          const childName = normalizeName(child.name)

          if (childName === targetName) {
            found = child
          }
        })

        return found
      }

    const highlightChapterObject = (chapter, sceneOverride = null) => {
        const rootScene = sceneOverride || modelScene

        if (!rootScene || !chapter?.objectName) return

        const targetObject = findObjectByName(
          rootScene,
          chapter.objectName
        )

        console.log("CHAPTER OBJECT:", chapter.objectName)
        console.log("FOUND OBJECT:", targetObject)

        if (!targetObject) {
          setOutlineObjects([])
          return
        }

        const selectedMeshes = []

        targetObject.traverse((child) => {
          if (child.isMesh) {
            selectedMeshes.push(child)
          }
        })

        console.log("OUTLINE MESHES:", selectedMeshes)

        setOutlineObjects(selectedMeshes)
      }


      const applyPlayerShaderMode = (scene, settings) => {
        if (!scene || !settings) return

        scene.traverse((child) => {
          if (!child.isMesh || !child.material) return

          if (!child.userData.originalMaterial) {
            child.userData.originalMaterial = child.material.clone()
          }

          const original = child.userData.originalMaterial

          if (settings.shaderMode === "original") {
            child.material = original.clone()
          }

          if (settings.shaderMode === "wireframe") {
            child.material = original.clone()
            child.material.wireframe = true
          }

          if (settings.shaderMode === "toon") {
            child.material = new THREE.MeshToonMaterial({
              color: original.color || new THREE.Color("#ffffff"),
            })
          }

          if (settings.shaderMode === "xray") {
            child.material = new THREE.MeshPhysicalMaterial({
              color: "#4fc3f7",
              transparent: true,
              opacity: 0.22,
              roughness: 0.2,
              metalness: 0,
              depthWrite: false,
            })
          }

          if (settings.shaderMode === "clay") {
            child.material = new THREE.MeshStandardMaterial({
              color: "#c9b8a4",
              roughness: 1,
              metalness: 0,
            })
          }

          if (settings.shaderMode === "pbr") {
            child.material = original.clone()

            if ("metalness" in child.material) {
              child.material.metalness = settings.metalness ?? 0.3
            }

            if ("roughness" in child.material) {
              child.material.roughness = settings.roughness ?? 0.8
            }
          }

          child.material.envMapIntensity = settings.envIntensity ?? 3
          child.material.needsUpdate = true
        })
      }
  const handleSelectChapter = (chapterId) => {
    const chapter = material?.chapters?.find(
      (item) => item.id === chapterId
    )

    if (!chapter) return

    setActiveChapterId(chapterId)
    highlightChapterObject(chapter)

    if (chapter.modelRotation && modelScene) {
      modelScene.rotation.set(
        chapter.modelRotation[0],
        chapter.modelRotation[1],
        chapter.modelRotation[2]
      )
    }

    if (chapter.cameraPosition && chapter.cameraTarget) {
      focusTargetRef.current = {
        cameraPosition: new THREE.Vector3(
          chapter.cameraPosition[0],
          chapter.cameraPosition[1],
          chapter.cameraPosition[2]
        ),
        target: new THREE.Vector3(
          chapter.cameraTarget[0],
          chapter.cameraTarget[1],
          chapter.cameraTarget[2]
        ),
      }
    }
  }

  const handleSelectObjectFromPlayer = (object) => {
      if (!object || !material?.chapters) return

      let current = object

      while (current) {
        const foundChapter = material.chapters.find(
          (chapter) =>
            normalizeName(chapter.objectName) === normalizeName(current.name)
        )

        if (foundChapter) {
          handleSelectChapter(foundChapter.id)
          return
        }

        current = current.parent
      }
    }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        background: "#0f172a",
        color: "white",
        overflow: "hidden",
      }}
    >
      <aside
        style={{
          width: 340,
          height: "100vh",
          padding: 20,
          background: "#111827",
          borderRight: "1px solid #374151",
          overflowY: "auto",
        }}
      >
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>
          3D Material Player
        </h1>

        <p style={{ color: "#9ca3af", marginBottom: 16 }}>
          Load file JSON dari Editor.
        </p>

        <input
          type="file"
          accept="application/json"
          onChange={(e) => loadJsonFile(e.target.files?.[0])}
          style={{ marginBottom: 20 }}
        />

        {material && (
          <>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>
              {material.title}
            </h2>

            <div
              style={{
                marginBottom: 16,
                fontSize: 13,
                color: "#9ca3af",
              }}
            >
              Model:
              <br />
              {material.modelUrl}
            </div>

            <h3 style={{ fontSize: 15, marginBottom: 8 }}>
              Daftar Bab
            </h3>

            {material.chapters.map((chapter, index) => (
              <button
                key={chapter.id}
                onClick={() => handleSelectChapter(chapter.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background:
                    activeChapterId === chapter.id
                      ? "#2563eb"
                      : "#1f2937",
                  color: "white",
                }}
              >
                <strong>
                  Bab {index + 1}: {chapter.title}
                </strong>

                <div
                  style={{
                    fontSize: 12,
                    color: "#d1d5db",
                    marginTop: 4,
                  }}
                >
                  Object: {chapter.objectName}
                </div>
              </button>
            ))}
          </>
        )}
      </aside>

      <main
        style={{
          flex: 1,
          height: "100vh",
          position: "relative",
          background: "#f1f5f9",
        }}
      >
        {material?.modelUrl ? (
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
            <Environment preset="studio" />

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
                  <Model
                    modelUrl={material.modelUrl}
                    markerMode={false}
                    onSelectObject={handleSelectObjectFromPlayer}
                    onModelLoaded={(scene) => {
                      setModelScene(scene)
                      applyPlayerShaderMode(scene, viewerSettings)
                      scene.traverse((child) => {
                        if (!child.isMesh) return

                        if (child.material) {
                          child.material.envMapIntensity = viewerSettings.envIntensity
                          child.material.needsUpdate = true
                        }
                      })
                      const firstChapter = material.chapters?.[0]

                      if (firstChapter) {
                        highlightChapterObject(firstChapter, scene)
                      }

                      if (firstChapter?.modelRotation) {
                        scene.rotation.set(
                          firstChapter.modelRotation[0],
                          firstChapter.modelRotation[1],
                          firstChapter.modelRotation[2]
                        )
                      }

                      if (firstChapter?.cameraPosition && firstChapter?.cameraTarget) {
                        focusTargetRef.current = {
                          cameraPosition: new THREE.Vector3(
                            firstChapter.cameraPosition[0],
                            firstChapter.cameraPosition[1],
                            firstChapter.cameraPosition[2]
                          ),
                          target: new THREE.Vector3(
                            firstChapter.cameraTarget[0],
                            firstChapter.cameraTarget[1],
                            firstChapter.cameraTarget[2]
                          ),
                        }
                      }
                    }}
                  />

                  {(activeChapter?.markers || []).map((marker, index) => (
                    <Marker
                      key={marker.id || index}
                      marker={marker}
                    />
                  ))}
                </Center>
              </Bounds>
            </Suspense>

          
            <CameraAnimator
              cameraRef={cameraRef}
              controlsRef={controlsRef}
              focusTargetRef={focusTargetRef}
            />

            <OrbitControls ref={controlsRef} />
          </Canvas>
        ) : (
          <div
            style={{
              height: "100%",
              display: "grid",
              placeItems: "center",
              color: "#334155",
              fontSize: 20,
              fontWeight: "bold",
            }}
          >
            Load JSON materi terlebih dahulu
          </div>
        )}

        {activeChapter && (
          <div
            style={{
              position: "absolute",
              right: 24,
              bottom: 24,
              width: 420,
              maxHeight: "45vh",
              overflowY: "auto",
              background: "rgba(15, 23, 42, 0.95)",
              color: "white",
              padding: 20,
              borderRadius: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#93c5fd",
                marginBottom: 6,
              }}
            >
              {activeChapter.objectName}
            </div>

            <h2 style={{ fontSize: 22, marginBottom: 10 }}>
              {activeChapter.title}
            </h2>

            <p
              style={{
                color: "#e5e7eb",
                lineHeight: 1.6,
                whiteSpace: "pre-line",
              }}
            >
              {activeChapter.description || "Belum ada deskripsi."}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}