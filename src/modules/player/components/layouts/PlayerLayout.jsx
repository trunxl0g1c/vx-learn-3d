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
  turntablePresentationActive = true,
  xrInteraction = null,
}) {
  const isIOSTrackedWebAR =
    player?.xrPanel?.activeMode === "ios-tracked-ar";
  const backgroundStyle = isIOSTrackedWebAR
    ? { background: "#000000" }
    : getViewerBackgroundStyle(player?.scene?.viewerSettings);

  return (
    <div
      className="vx-player-layout"
      style={{
        width: "100vw",
        height: "100dvh",
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
          height: "100dvh",
          ...backgroundStyle,
        }}
      >
        <PlayerSceneCanvas
          {...player.scene}
          preserveSelectionOnPointerMiss={
            Boolean(player.scene.activeChapter) ||
            Boolean(player.scene.activeSlide) ||
            Boolean(player.scene.activeFlow) ||
            (player.scene.activeChapterFlows?.length || 0) > 0 ||
            (player.scene.activeSlideFlows?.length || 0) > 0 ||
            Boolean(player.procedurePanel.activeProcedureId) ||
            Boolean(player.quizPanel?.isAssessmentActive)
          }
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationClick={onAnnotationClick}
          onAnnotationClose={onAnnotationClose}
          onAnnotationOpenDetail={onAnnotationOpenDetail}
          onAnnotationHierarchyBack={onAnnotationHierarchyBack}
          onObjectSelectInteraction={onObjectSelectInteraction}
          turntablePresentationActive={turntablePresentationActive}
          xrInteraction={xrInteraction}
        />

        {showSidebar && <PlayerSidebar items={sidebarItems} />}

        {children}
      </main>
    </div>
  );
}
