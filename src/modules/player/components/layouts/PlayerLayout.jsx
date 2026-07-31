import PlayerSceneCanvas from "../../../../components/player/PlayerSceneCanvas";
import { getViewerBackgroundStyle } from "../../../../utils/viewerBackground";
import PlayerSidebar from "./PlayerSidebar";

export default function PlayerLayout({
  player,
  sidebarItems = [],
  children,
  showSidebar = true,
  selectedAnnotationId = null,
  onAnnotationClick,
  onAnnotationClose,
  onAnnotationOpenDetail,
  onAnnotationHierarchyBack,
  onObjectSelectInteraction,
}) {
  const backgroundStyle = getViewerBackgroundStyle(
    player?.scene?.viewerSettings,
  );

  return (
    <div
      className="vx-player-layout"
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        ...backgroundStyle,
        color: "white",
        overflow: "hidden",
      }}
    >
      <main
        style={{
          position: "absolute",
          inset: 0,
          height: "100vh",
          ...backgroundStyle,
        }}
      >
        <PlayerSceneCanvas
          {...player.scene}
          preserveSelectionOnPointerMiss={
            Boolean(player.scene.activeChapter) ||
            Boolean(player.scene.activeFlow) ||
            (player.scene.activeChapterFlows?.length || 0) > 0 ||
            Boolean(player.procedurePanel.activeProcedureId)
          }
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationClick={onAnnotationClick}
          onAnnotationClose={onAnnotationClose}
          onAnnotationOpenDetail={onAnnotationOpenDetail}
          onAnnotationHierarchyBack={onAnnotationHierarchyBack}
          onObjectSelectInteraction={onObjectSelectInteraction}
        />

        {showSidebar && <PlayerSidebar items={sidebarItems} />}

        {children}
      </main>
    </div>
  );
}
