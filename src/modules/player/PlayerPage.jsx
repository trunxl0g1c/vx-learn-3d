import { Canvas, useFrame } from "@react-three/fiber"
import {
  Suspense,
  useRef,
  useState,
  useEffect,
} from "react"
import * as THREE from "three"

import {
  OrbitControls,
  Html,
  useProgress,
  Bounds,
  Center,
  Environment,
  TransformControls,
} from "@react-three/drei"

import Model from "../../components/Model"
import Marker from "../../components/Marker"
import { applyCutAway } from "../../utils/cutAwayUtils"
import { EffectComposer, Outline } from "@react-three/postprocessing"

function LoadingModel() {
  const { progress } = useProgress()
  const percent = Math.min(100, Math.max(0, Math.round(progress || 0)))

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
            height: 12,
            background: "#ddd",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: "#4caf50",
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

    if (distance < 0.2) {
      focusTargetRef.current = null
    }
  })

  return null
}

export default function PlayerPage() {

  
  const [material, setMaterial] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [modelScene, setModelScene] = useState(null)

  const [freePlay, setFreePlay] = useState(false)
  const [freePlayMenu, setFreePlayMenu] = useState(false)
  const [activeMenu, setActiveMenu] = useState(null)
  const [showInfoPanel, setShowInfoPanel] = useState(false)

  const [outlineObjects, setOutlineObjects] = useState([])
  const [selectedObject, setSelectedObject] = useState(null)
  const [originalPositions, setOriginalPositions] = useState([])
  const [originalGroupPositions, setOriginalGroupPositions] = useState([])

  const [transformMode, setTransformMode] =
  useState("translate")
  
  const [cutEnabled, setCutEnabled] = useState(false)
  const [cutX, setCutX] = useState(0)
  const [cutMin, setCutMin] = useState(-3)
  const [cutMax, setCutMax] = useState(3)

  const [viewerSettings, setViewerSettings] = useState({
    exposure: 1.8,
    ambientLight: 2.5,
    mainLight: 4,
    fillLight: 2,
    hemiLight: 2,
    envIntensity: 3,
    hdri: "",
    showHdriBackground: false,
    shaderMode: "original",
    metalness: 0.3,
    roughness: 0.8,
  })

  const cameraRef = useRef(null)
  const controlsRef = useRef(null)
  const focusTargetRef = useRef(null)

  const activeChapter = material?.chapters?.find(
    (chapter) => chapter.id === activeChapterId
  )

  const playerToolButtonStyle = {
    padding: "12px 18px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
  }

  const playerMenuStyle = {
    position: "absolute",
    left: "50%",
    bottom: 92,
    transform: "translateX(-50%)",
    zIndex: 130,
    display: "flex",
    flexDirection: "row",
    gap: 8,
    padding: 10,
    borderRadius: 14,
    background: "rgba(15,23,42,0.92)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.12)",
  }
  const playerMenuButtonStyle = {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#374151",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  }

  const chapterPanelStyle = {
    position: "absolute",
    left: 20,
    top: 84,
    bottom: 20,
    width: 360,
    zIndex: 130,
    background: "rgba(15,23,42,0.82)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    boxShadow: "0 16px 48px rgba(0,0,0,0.34)",
    padding: 14,
    color: "white",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  }

  useEffect(() => {
    applyCutAway(modelScene, cutEnabled, cutX)
  }, [modelScene, cutEnabled, cutX])

  useEffect(() => {
    if (!modelScene) return

    applyPlayerShaderMode(modelScene, viewerSettings)

    if (window.__PLAYER_RENDERER__) {
      window.__PLAYER_RENDERER__.toneMappingExposure =
        viewerSettings.exposure
    }

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      if (child.material) {
        child.material.envMapIntensity = viewerSettings.envIntensity ?? 3
        child.material.needsUpdate = true
      }
    })
  }, [viewerSettings, modelScene])

  const loadJsonFile = async (file) => {
    if (!file) return

    const text = await file.text()
    const json = JSON.parse(text)

    setMaterial(json)
    setActiveChapterId(json.chapters?.[0]?.id || null)
    setActiveMenu(null)
    setFreePlay(false)
    setFreePlayMenu(false)
    setShowInfoPanel(false)
    setSelectedObject(null)
    setOutlineObjects([])

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

  const collectMeshes = (object) => {
    const meshes = []

    object?.traverse?.((child) => {
      if (child.isMesh) meshes.push(child)
    })

    return meshes
  }

  const highlightChapterObject = (chapter, sceneOverride = null) => {
    const rootScene = sceneOverride || modelScene

    if (!rootScene || !chapter?.objectName) return

    const targetObject = findObjectByName(rootScene, chapter.objectName)

    if (!targetObject) {
      setOutlineObjects([])
      return
    }

    setSelectedObject(targetObject)
    setOutlineObjects(collectMeshes(targetObject))
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

      if (settings.shaderMode === "enhanced") {
        child.material = original.clone()

        if ("envMapIntensity" in child.material) {
          child.material.envMapIntensity = settings.envIntensity ?? 3
        }

        if ("metalness" in child.material) {
          child.material.metalness =
            (original.metalness ?? 1) * (settings.metalness ?? 0.3)
        }

        if ("roughness" in child.material) {
          child.material.roughness =
            (original.roughness ?? 1) * (settings.roughness ?? 0.8)
        }
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

      child.material.needsUpdate = true
    })
  }

  const handleModelLoaded = (scene) => {
    setModelScene(scene)

    const box = new THREE.Box3().setFromObject(scene)
    setCutMin(box.min.x)
    setCutMax(box.max.x)
    setCutX((box.min.x + box.max.x) / 2)

    const positions = []
    const groupPositions = []

    scene.traverse((child) => {
      groupPositions.push({
        object: child,
        position: child.position.clone(),
        rotation: child.rotation.clone(),
      })

      if (child.isMesh) {
        child.material = child.material.clone()
        child.userData.originalMaterial = child.material

        positions.push({
          object: child,
          position: child.position.clone(),
        })

        child.material.envMapIntensity = viewerSettings.envIntensity
        child.material.needsUpdate = true
      }
    })

    setOriginalPositions(positions)
    setOriginalGroupPositions(groupPositions)

    applyPlayerShaderMode(scene, viewerSettings)

    const firstChapter = material?.chapters?.[0]

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
    setTimeout(() => {
    setActiveMenu("chapters")
      setShowInfoPanel(true)
    }, 300)
  }

  const handleSelectChapter = (chapterId) => {
    const chapter = material?.chapters?.find((item) => item.id === chapterId)

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
    if (!object) return

    setSelectedObject(object)
    setOutlineObjects(collectMeshes(object))

    if (!material?.chapters) return

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

  const pullApart = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      if (!child.isMesh) return

      const direction = child.position.clone().normalize()

      if (direction.length() === 0) {
        direction
          .set(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
          )
          .normalize()
      }

      child.userData.targetPosition = child.position
        .clone()
        .add(direction.multiplyScalar(1.2))
    })
  }

  const resetParts = () => {
    originalPositions.forEach((item) => {
      item.object.userData.targetPosition = item.position.clone()
    })
  }

  const resetMovedObjects = () => {
    originalGroupPositions.forEach((item) => {
      item.object.userData.moveTargetPosition = item.position.clone()
      item.object.userData.moveTargetRotation = item.rotation.clone()
    })
  }

  const resetModelRotationForCut = () => {
    if (!modelScene) return

    modelScene.rotation.set(0, 0, 0)
    focusTargetRef.current = null
  }

  const resetSection = () => {
    if (!modelScene) return

    const box = new THREE.Box3().setFromObject(modelScene)
    setCutX((box.min.x + box.max.x) / 2)

    resetModelRotationForCut()
  }

  const toggleCutSection = () => {
    resetSection()
    setCutEnabled((prev) => !prev)
    setFreePlayMenu(false)
  }

  const hideSelectedObject = () => {
    if (!selectedObject) return

    selectedObject.visible = false
    selectedObject.traverse?.((child) => {
      child.visible = false
    })

    setSelectedObject(null)
    setOutlineObjects([])
  }

  const soloSelectedObject = () => {
    if (!selectedObject || !modelScene) return

    modelScene.traverse((child) => {
      if (child.isMesh) child.visible = false
    })

    selectedObject.traverse?.((child) => {
      if (child.isMesh) child.visible = true
    })

    setOutlineObjects(collectMeshes(selectedObject))
  }

  const showAllObjects = () => {
    if (!modelScene) return

    modelScene.traverse((child) => {
      child.visible = true
    })
  }

  const resetAllTransforms = () => {
    resetParts()
    resetMovedObjects()
    resetModelRotationForCut()
    showAllObjects()
    setCutEnabled(false)
  }

  const speakChapterDescription = () => {
    if (!activeChapter?.description) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(
      activeChapter.description
    )

    utterance.lang = "id-ID"
    utterance.rate = 1
    utterance.pitch = 1

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
  }
  

  
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        background: "#0f172a",
        color: "white",
        overflow: "hidden",
      }}
    >
      <main
       
        style={{
          position: "absolute",
          inset: 0,
          height: "100vh",
          background: "#0f172a",
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
                  <Model
                    modelUrl={material.modelUrl}
                    markerMode={false}
                    onSelectObject={handleSelectObjectFromPlayer}
                    onModelLoaded={handleModelLoaded}
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
                  {!freePlay && (activeChapter?.markers || []).map((marker, index) => (
                    <Marker key={marker.id || index} marker={marker} />
                  ))}
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
              enableZoom={freePlay}
              enablePan={freePlay}
              onStart={() => {
                focusTargetRef.current = null
              }}
            />
          </Canvas>
        ) : (
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
        )}

        {!freePlay && showInfoPanel && activeChapter && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 20,
              top: 84,
              bottom: 20,
              width: 360,
              overflowY: "auto",
              background: "rgba(15, 23, 42, 0.95)",
              color: "white",
              padding: 20,
              borderRadius: 16,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              zIndex: 110,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#93c5fd",
                marginBottom: 8,
                fontWeight: "bold",
              }}
            >
              Chapter Info
            </div>

            <div
              style={{
                fontSize: 13,
                color: "#9ca3af",
                marginBottom: 6,
              }}
            >
              Object
            </div>

            <div style={{ fontWeight: "bold", marginBottom: 14 }}>
              {activeChapter.objectName}
            </div>

            <h2 style={{ fontSize: 22, marginBottom: 10 }}>
              {activeChapter.title}
            </h2>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <button
                onClick={speakChapterDescription}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#2563eb",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ▶ Play Voice
              </button>

              <button
                onClick={stopSpeaking}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#374151",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Stop
              </button>
            </div>
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

        {freePlay && freePlayMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={playerMenuStyle}
          >
            <button style={playerMenuButtonStyle} onClick={toggleCutSection}>
              {cutEnabled ? "Cut ON" : "Cut OFF"}
            </button>

            <button style={playerMenuButtonStyle} onClick={hideSelectedObject}>
              Hide Selected
            </button>

            <button style={playerMenuButtonStyle} onClick={pullApart}>
              Pull Apart
            </button>

            <button style={playerMenuButtonStyle} onClick={resetAllTransforms}>
              Reset All
            </button>

            <button style={playerMenuButtonStyle} onClick={soloSelectedObject}>
              Solo
            </button>

            <button style={playerMenuButtonStyle} onClick={showAllObjects}>
              Show All
            </button>
           
          </div>
        )}

        {freePlay && cutEnabled && !freePlayMenu && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: "50%",
              bottom: 100,
              transform: "translateX(-50%)",
              zIndex: 130,
              width: 360,
              padding: 12,
              borderRadius: 14,
              background: "rgba(15,23,42,0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
            }}
          >
            <div style={{ fontSize: 12, marginBottom: 8 }}>
              Cut X: {cutX.toFixed(2)}
            </div>

            <input
              type="range"
              min={cutMin}
              max={cutMax}
              step="0.01"
              value={cutX}
              onChange={(e) => setCutX(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>
        )}

        {!freePlay && activeMenu === "chapters" && material && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={chapterPanelStyle}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 12,
              }}
            >
              Chapters
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {material.chapters.map((chapter, index) => (
                <button
                  key={chapter.id}
                  onClick={() => {
                    handleSelectChapter(chapter.id)
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 10,
                    border: "none",
                    cursor: "pointer",
                    background:
                      activeChapterId === chapter.id
                        ? "#2563eb"
                        : "rgba(255,255,255,0.08)",
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
            </div>
          </div>
        )}

        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 24,
            zIndex: 120,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: 10,
              borderRadius: 14,
              background: "rgba(15,23,42,0.82)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <label style={playerToolButtonStyle}>
              Load File
              <input
                type="file"
                accept=".json"
                onChange={(e) => loadJsonFile(e.target.files?.[0])}
                style={{ display: "none" }}
              />
            </label>

            <button
              onClick={() => {
                const next = !freePlay

                setFreePlay(next)
                setFreePlayMenu(next)

                if (next) {
                  setActiveMenu(null)
                  setShowInfoPanel(false)
                  setOutlineObjects([])
                  return
                }

                setFreePlayMenu(false)
                setCutEnabled(false)
                showAllObjects()
                resetAllTransforms()

                setActiveMenu("chapters")
                setShowInfoPanel(true)

                if (activeChapterId) {
                  setTimeout(() => {
                    handleSelectChapter(activeChapterId)
                  }, 50)
                }
              }}
              style={{
                ...playerToolButtonStyle,
                background: freePlay ? "#16a34a" : "rgba(255,255,255,0.08)",
                border: freePlay
                  ? "1px solid #22c55e"
                  : "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {freePlay ? "Free Play ON" : "Free Play OFF"}
            </button>

            {freePlay && (
              <button
                onClick={() => {
                  setFreePlayMenu((prev) => !prev)
                  setActiveMenu(null)
                }}
                style={{
                  ...playerToolButtonStyle,
                  background: freePlayMenu
                    ? "#2563eb"
                    : "rgba(255,255,255,0.08)",
                }}
              >
                Tools
              </button>
            )}

            {!freePlay && (
              <>
                <button
                  onClick={() => {
                    setActiveMenu(activeMenu === "chapters" ? null : "chapters")
                  }}
                  style={{
                    ...playerToolButtonStyle,
                    background:
                      activeMenu === "chapters" ? "#2563eb" : "rgba(255,255,255,0.08)",
                  }}
                >
                  Chapters
                </button>

                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  style={{
                    ...playerToolButtonStyle,
                    background: showInfoPanel ? "#2563eb" : "rgba(255,255,255,0.08)",
                  }}
                >
                  {showInfoPanel ? "Info ON" : "Info OFF"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
