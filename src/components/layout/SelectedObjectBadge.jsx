import {
  EDITOR_TOP_BAR_HEIGHT,
  EDITOR_VIEW_CUBE_GAP,
} from "../../constants/editorLayout";

export default function SelectedObjectBadge({
  selectedObjectName,
  transformToolbarVisible = false,
}) {
  if (!selectedObjectName) return null

  return (
    <div
      className={[
        "vx-editor-selected-badge",
        transformToolbarVisible ? "vx-editor-selected-badge--below-transform" : "",
      ].join(" ")}
      style={{
        position: 'absolute',
        top: transformToolbarVisible
          ? EDITOR_TOP_BAR_HEIGHT + 64
          : EDITOR_TOP_BAR_HEIGHT + EDITOR_VIEW_CUBE_GAP,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        background: '#4362AD',
        color: 'white',
        padding: '10px 18px',
        borderRadius: 999,
        fontWeight: 'normal',
        fontSize: 14,
      }}
    >
      {selectedObjectName}
    </div>
  )
}
