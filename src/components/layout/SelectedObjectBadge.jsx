import {
  EDITOR_TOP_BAR_HEIGHT,
  EDITOR_VIEW_CUBE_GAP,
} from "../../constants/editorLayout";

export default function SelectedObjectBadge({ selectedObjectName }) {
  if (!selectedObjectName) return null

  return (
    <div
      className={`max-w-sm absolute`}
      style={{
        position: 'absolute',
        top: EDITOR_TOP_BAR_HEIGHT + EDITOR_VIEW_CUBE_GAP,
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
