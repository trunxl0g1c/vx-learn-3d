import { playerMenuStyle, playerMenuButtonStyle } from "../../constants/playerStyles"

export default function PlayerToolsMenu({
  cutEnabled,
  toggleCutSection,
  hideSelectedObject,
  pullApart,
  resetAllTransforms,
  soloSelectedObject,
  showAllObjects,
}) {
  return (
    <div onClick={(e) => e.stopPropagation()} style={playerMenuStyle}>
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
  )
}
