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
  onObjectSelectInteraction,
}) {
  const backgroundStyle = getViewerBackgroundStyle(
    player?.scene?.viewerSettings,
  );

  return (
    <div
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
          selectedAnnotationId={selectedAnnotationId}
          onAnnotationClick={onAnnotationClick}
          onAnnotationClose={onAnnotationClose}
          onAnnotationOpenDetail={onAnnotationOpenDetail}
          onObjectSelectInteraction={onObjectSelectInteraction}
        />

        {showSidebar && <PlayerSidebar items={sidebarItems} />}

        {children}
      </main>
    </div>
  );
}
