export default function ChapterDeselectButton({ setActiveChapterId }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setActiveChapterId(null)
      }}
      style={{
        width: "100%",
        padding: 10,
        borderRadius: 8,
        border: "none",
        background: "#c8b568",
        color: "#111827",
        fontWeight: "bold",
        cursor: "pointer",
        marginTop: 4,
      }}
    >
      DESELECT
    </button>
  )
}
