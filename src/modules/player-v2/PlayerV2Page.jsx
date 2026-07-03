import usePlayerV2Controller from "./hooks/usePlayerV2Controller"

import PlayerSceneCanvas from "../../components/player/PlayerSceneCanvas"
import PlayerChapterListPanel from "../../components/player/PlayerChapterListPanel"
import PlayerChapterInfoPanel from "../../components/player/PlayerChapterInfoPanel"
import PlayerV2SelectionInfo from "./components/PlayerV2SelectionInfo"

export default function PlayerV2Page() {
  const player = usePlayerV2Controller()
  const { isLoadingProject, loadError } = player.status

  if (isLoadingProject) {
    return <div style={{ padding: 24 }}>Loading Player V2 project...</div>
  }

  if (loadError) {
    return <div style={{ padding: 24 }}>{loadError}</div>
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
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 20,
          padding: "10px 12px",
          borderRadius: 14,
          background: "rgba(15, 23, 42, 0.82)",
          border: "1px solid rgba(148, 163, 184, 0.28)",
          color: "#cbd5e1",
          fontSize: 12,
          fontWeight: 700,
          pointerEvents: "none",
          lineHeight: 1.5,
          minWidth: 220,
        }}
      >
        <div style={{ color: "#93c5fd" }}>Player V2 · v0.2 Camera Focus</div>
        <div>{player.project?.name || "No project loaded"}</div>
        <div style={{ color: "#94a3b8", fontWeight: 500 }}>
          {player.project?.fileName || "Project loading only"}
        </div>
        <div style={{ color: "#94a3b8", fontWeight: 500 }}>
          Chapters: {player.project?.chapterCount ?? 0}
        </div>
        <div style={{ color: "#94a3b8", fontWeight: 500 }}>
          Selection: {player.selection?.selectedInfo?.name || "None"}
        </div>
        <div style={{ color: "#64748b", fontWeight: 500 }}>
          F: focus · R: reset · B: restore
        </div>
      </div>

      <main
        style={{
          position: "absolute",
          inset: 0,
          height: "100vh",
          background: "#0f172a",
        }}
      >
        <PlayerSceneCanvas {...player.scene} />

        {player.capabilities.chapters && player.scene.material && (
          <PlayerChapterListPanel
            material={player.scene.material}
            activeChapterId={player.chapter.activeChapterId}
            handleSelectChapter={player.chapter.handleSelectChapter}
          />
        )}

        <PlayerV2SelectionInfo
          selection={player.selection}
          camera={player.camera}
        />

        {player.capabilities.chapters && player.chapter.activeChapter && (
          <PlayerChapterInfoPanel
            activeChapter={player.chapter.activeChapter}
            speakChapterDescription={player.chapter.speakChapterDescription}
            stopSpeaking={player.chapter.stopSpeaking}
            playChapterAnimations={player.chapter.playChapterAnimations}
            stopChapterAnimations={player.chapter.stopChapterAnimations}
          />
        )}
      </main>
    </div>
  )
}
