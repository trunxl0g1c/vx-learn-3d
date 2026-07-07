import PlayerSceneCanvas from "../../../../components/player/PlayerSceneCanvas";
import { getViewerBackgroundStyle } from "../../../../utils/viewerBackground";
import PlayerSidebar from "./PlayerSidebar";

export default function PlayerLayout({
  player,
  sidebarItems = [],
  children,
  showSidebar = true,
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
        <PlayerSceneCanvas {...player.scene} />

        {showSidebar && <PlayerSidebar items={sidebarItems} />}

        {children}
      </main>
    </div>
  );
}
