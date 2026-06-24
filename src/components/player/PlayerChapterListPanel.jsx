import { chapterPanelStyle } from "../../constants/playerStyles"

export default function PlayerChapterListPanel({
  material,
  activeChapterId,
  handleSelectChapter,
}) {
  if (!material) return null

  return (
    <div onClick={(e) => e.stopPropagation()} style={chapterPanelStyle}>
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
  )
}
