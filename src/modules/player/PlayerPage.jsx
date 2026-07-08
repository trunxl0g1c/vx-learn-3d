import usePlayerController from "./hooks/usePlayerController";
import PlayerSceneCanvas from "../../components/player/PlayerSceneCanvas";
import PlayerChapterInfoPanel from "../../components/player/PlayerChapterInfoPanel";
import PlayerToolsMenu from "../../components/player/PlayerToolsMenu";
import PlayerCutSlider from "../../components/player/PlayerCutSlider";
import PlayerChapterListPanel from "../../components/player/PlayerChapterListPanel";
import PlayerBottomToolbar from "../../components/player/PlayerBottomToolbar";
import { getViewerBackgroundStyle } from "../../utils/viewerBackground";
import {
  Box,
  Clipboard,
  Home,
  Scan,
  Scissors,
  SlidersVertical,
  X,
} from "lucide-react";
import { useState } from "react";
import PlayerLayout from "./components/layouts/PlayerLayout";

// export default function PlayerPage() {
//   const player = usePlayerController()
//   const { isLoadingProject, loadError } = player.status

//   if (isLoadingProject) {
//     return <div style={{ padding: 24 }}>Loading project...</div>
//   }

//   if (loadError) {
//     return <div style={{ padding: 24 }}>{loadError}</div>
//   }

//   return (
//     <div
//       style={{
//         width: "100vw",
//         height: "100vh",
//         position: "relative",
//         ...getViewerBackgroundStyle(player.scene.viewerSettings),
//         color: "white",
//         overflow: "hidden",
//       }}
//     >
//       <main
//         style={{
//           position: "absolute",
//           inset: 0,
//           height: "100vh",
//           ...getViewerBackgroundStyle(player.scene.viewerSettings),
//         }}
//       >
//         <PlayerSceneCanvas {...player.scene} />

//         {!player.chapterPanel.freePlay &&
//           player.chapterPanel.showInfoPanel &&
//           player.chapterPanel.activeChapter && (
//             <PlayerChapterInfoPanel
//               activeChapter={player.chapterPanel.activeChapter}
//               speakChapterDescription={player.chapterPanel.speakChapterDescription}
//               stopSpeaking={player.chapterPanel.stopSpeaking}
//               playChapterAnimations={player.chapterPanel.playChapterAnimations}
//               stopChapterAnimations={player.chapterPanel.stopChapterAnimations}
//             />
//           )}

//         {player.toolsMenu.freePlay && player.toolsMenu.freePlayMenu && (
//           <PlayerToolsMenu
//             cutEnabled={player.toolsMenu.cutEnabled}
//             toggleCutSection={player.toolsMenu.toggleCutSection}
//             hideSelectedObject={player.toolsMenu.hideSelectedObject}
//             pullApart={player.toolsMenu.pullApart}
//             resetAllTransforms={player.toolsMenu.resetAllTransforms}
//             soloSelectedObject={player.toolsMenu.soloSelectedObject}
//             showAllObjects={player.toolsMenu.showAllObjects}
//           />
//         )}

//         {player.cutSlider.freePlay && player.cutSlider.cutEnabled && (
//           <PlayerCutSlider
//             cutAxis={player.cutSlider.cutAxis}
//             setCutAxis={player.cutSlider.setCutAxis}
//             cutValue={player.cutSlider.cutValue}
//             cutMin={player.cutSlider.cutMin}
//             cutMax={player.cutSlider.cutMax}
//             setCutValue={player.cutSlider.setCutValue}
//           />
//         )}

//         {!player.chapterList.freePlay &&
//           player.chapterList.activeMenu === "chapters" &&
//           player.chapterList.material && (
//             <PlayerChapterListPanel
//               material={player.chapterList.material}
//               activeChapterId={player.chapterList.activeChapterId}
//               handleSelectChapter={player.chapterList.handleSelectChapter}
//             />
//           )}

//         <PlayerBottomToolbar {...player.toolbar} />
//       </main>
//     </div>
//   )
// }

export default function PlayerPage() {
  const player = usePlayerController();
  const { isLoadingProject, loadError } = player.status;

  const [activePanel, setActivePanel] = useState(null);

  const togglePanel = (panelName) => {
    setActivePanel((prev) => (prev === panelName ? null : panelName));
  };

  const sidebarItems = [
    {
      key: "home",
      label: "Home",
      icon: Home,
      href: "/",
    },
    {
      key: "chapter",
      label: "Chapter",
      icon: Clipboard,
      active: activePanel === "chapter",
      onClick: () => togglePanel("chapter"),
    },
    {
      key: "object",
      label: "Object",
      icon: Box,
      active: activePanel === "object",
      onClick: () => togglePanel("object"),
    },

    { type: "separator" },

    {
      key: "scan",
      label: "Scan",
      icon: Scan,
      active: activePanel === "scan",
      onClick: () => togglePanel("scan"),
    },
    {
      key: "cut",
      label: "Cut",
      icon: Scissors,
      active: activePanel === "cut",
      onClick: () => togglePanel("cut"),
    },

    { type: "separator" },

    {
      key: "settings",
      label: "Settings",
      icon: SlidersVertical,
      active: activePanel === "settings",
      onClick: () => togglePanel("settings"),
    },
  ];

  if (isLoadingProject) {
    return <div style={{ padding: 24 }}>Loading project...</div>;
  }

  if (loadError) {
    return <div style={{ padding: 24 }}>{loadError}</div>;
  }

  return (
    <PlayerLayout player={player} sidebarItems={sidebarItems}>
      <div className="absolute right-5 top-5">
        <img
          src="/images/logo.svg"
          alt="VXplore Studio"
          className="size-8 rounded-full"
        />
      </div>

      {activePanel === "chapter" && (
        <PlayerFloatingPanel onClose={() => setActivePanel(null)}>
          <h3 className="mb-3 text-sm font-bold">
            Porsche 911 SC Engine with 915 Gearbox
          </h3>

          <p className="text-xs leading-relaxed text-white/80">
            Mi ipsum faucibus vitae aliquet nec ullamcorper sit amet. Massa
            placerat duis ultricies lacus sed turpis tincidunt id aliquet.
            Ultricies mi eget mauris pharetra et. Risus pretium quam vulputate
            dignissim suspendisse. Congue mauris rhoncus aenean vel. Semper eget
            duis at tellus at urna condimentum mattis pellentesque. At ultrices
            mi tempus imperdiet nulla. Sagittis vitae et leo duis ut diam. Arcu
            dictum varius duis at consectetur lorem. Eu sem integer vitae justo.
            Gravida cum sociis natoque penatibus et magnis dis. Ut morbi
            tincidunt augue interdum. Cursus risus at ultrices mi tempus
            imperdiet nulla. Eget gravida cum sociis natoque penatibus et magnis
            dis parturient. Massa sapien faucibus et molestie ac feugiat.
            Blandit libero volutpat sed cras ornare. Duis at consectetur lorem
            donec. Sollicitudin tempor id eu nisl.
          </p>

          <div className="mt-5 flex flex-col border-t border-white/10">
            <PanelMenuItem label="Data Diagram Flow" />
            <PanelMenuItem label="Flow Animation" />
            <PanelMenuItem label="Documentation" />
          </div>
        </PlayerFloatingPanel>
      )}
    </PlayerLayout>
  );
}

function PlayerFloatingPanel({ children, onClose }) {
  return (
    <div className="absolute left-21 top-7 z-40 w-[360px] rounded-xl border border-grayout-extra-dark bg-dark-alpha p-5 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="cursor-pointer absolute right-4 top-4 text-white/70 hover:text-white"
      >
        <X className="size-4" />
      </button>

      {children}
    </div>
  );
}

function PanelMenuItem({ label }) {
  return (
    <button className="flex items-center gap-3 border-b border-white/10 py-3 text-left text-xs text-white/70 hover:text-white">
      <span className="size-4 rounded border border-secondary-default" />
      <span>{label}</span>
    </button>
  );
}
