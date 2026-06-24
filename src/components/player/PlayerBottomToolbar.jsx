import { playerToolButtonStyle } from "../../constants/playerStyles"

export default function PlayerBottomToolbar({
  loadJsonFile,
  freePlay,
  setFreePlay,
  setFreePlayMenu,
  setActiveMenu,
  setShowInfoPanel,
  setOutlineObjects,
  stopChapterAnimations,
  setCutEnabled,
  showAllObjects,
  resetAllTransforms,
  activeChapterId,
  handleSelectChapter,
  freePlayMenu,
  activeMenu,
  showInfoPanel,
}) {
  return (
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
              stopChapterAnimations()
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
              background: freePlayMenu ? "#2563eb" : "rgba(255,255,255,0.08)",
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
  )
}
