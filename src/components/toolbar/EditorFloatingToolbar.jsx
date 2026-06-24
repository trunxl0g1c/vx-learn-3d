import { menuButtonStyle, menuStyle, toolButtonStyle, toolbarDockStyle, toolbarInnerStyle } from '../../constants/viewerStyles'

export default function EditorFloatingToolbar({
  activeMenu,
  setActiveMenu,
  markerMode,
  setMarkerMode,
  cutEnabled,
  handleFile,
  toggleCutSection,
  hideSelectedObject,
  resetXray,
  pullApart,
  resetAllTransforms,
  soloSelectedObject,
  showAllObjects,
}) {
  const toggleMenu = (menuName) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName))
  }

  return (
    <>
      <div
        onClick={(e) => e.stopPropagation()}
        style={toolbarDockStyle}
      >
        <div
          style={toolbarInnerStyle}
        >
          <label style={toolButtonStyle}>
            Load Model
            <input
              type="file"
              accept=".glb,.gltf"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </label>

          <button
            onClick={() => setMarkerMode(!markerMode)}
            style={{
              ...toolButtonStyle,
              background: markerMode ? "#16a34a" : "rgba(255,255,255,0.08)",
              border: markerMode
                ? "1px solid #22c55e"
                : "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {markerMode ? "Marker ON" : "Marker OFF"}
          </button>

          <button
            onClick={toggleCutSection}
            style={{
              ...toolButtonStyle,
              background: cutEnabled ? "#dc2626" : "rgba(255,255,255,0.08)",
              border: cutEnabled
                ? "1px solid #ef4444"
                : "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {cutEnabled ? "Cut ON" : "Cut OFF"}
          </button>

          <button style={toolButtonStyle} onClick={() => toggleMenu("view")}>
            View
          </button>

          <button style={menuButtonStyle} onClick={hideSelectedObject}>
            Hide Selected
          </button>

          <button style={menuButtonStyle} onClick={resetXray}>
            Reset X-Ray
          </button>
        </div>
      </div>

      {activeMenu === "view" && (
        <div onClick={(e) => e.stopPropagation()} style={menuStyle}>
          <button style={menuButtonStyle} onClick={pullApart}>
            Pull Apart
          </button>

          <button style={menuButtonStyle} onClick={resetAllTransforms}>
            Reset All
          </button>

          <button style={menuButtonStyle} onClick={soloSelectedObject}>
            Solo
          </button>

          <button style={menuButtonStyle} onClick={showAllObjects}>
            Show All
          </button>
        </div>
      )}
    </>
  )
}
