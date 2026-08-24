import PlayerSceneCanvas from "../../../../components/player/PlayerSceneCanvas";
import { getViewerBackgroundStyle } from "../../../../utils/viewerBackground";
import PlayerSidebar from "./PlayerSidebar";
import TransformModeToolbar from "../../../../components/viewer/TransformModeToolbar";

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
  const backgroundStyle = getViewerBackgroundStyle(player?.scene?.viewerSettings);

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

        {player?.scene?.freePlay && player?.scene?.selectedObject && (
          <div className="vx-player-transform-toolbar-dock pointer-events-none absolute left-1/2 top-4 z-[65] max-w-[calc(100vw-24px)] -translate-x-1/2">
            <TransformModeToolbar
              mode={player.scene.transformMode || "translate"}
              onChange={player.scene.setTransformMode}
            />
          </div>
        )}

        {showSidebar && <PlayerSidebar items={sidebarItems} />}

        {children}
      </main>
    </div>
  );
}
