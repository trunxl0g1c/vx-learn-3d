import usePlayerController from "./hooks/usePlayerController"

import PlayerSceneCanvas from "../../components/player/PlayerSceneCanvas"
import PlayerChapterInfoPanel from "../../components/player/PlayerChapterInfoPanel"
import PlayerToolsMenu from "../../components/player/PlayerToolsMenu"
import PlayerCutSlider from "../../components/player/PlayerCutSlider"
import PlayerChapterListPanel from "../../components/player/PlayerChapterListPanel"
import PlayerBottomToolbar from "../../components/player/PlayerBottomToolbar"
import { getViewerBackgroundStyle } from "../../utils/viewerBackground"

export default function PlayerPage() {
  const player = usePlayerController()
  const { isLoadingProject, loadError } = player.status

  if (isLoadingProject) {
    return <div style={{ padding: 24 }}>Loading project...</div>
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
        ...getViewerBackgroundStyle(player.scene.viewerSettings),
        color: "white",
        overflow: "hidden",
      }}
    >
      <main
        style={{
          position: "absolute",
          inset: 0,
          height: "100vh",
          ...getViewerBackgroundStyle(player.scene.viewerSettings),
        }}
      >
        <PlayerSceneCanvas {...player.scene} />

        {!player.chapterPanel.freePlay &&
          player.chapterPanel.showInfoPanel &&
          player.chapterPanel.activeChapter && (
            <PlayerChapterInfoPanel
              activeChapter={player.chapterPanel.activeChapter}
              speakChapterDescription={player.chapterPanel.speakChapterDescription}
              stopSpeaking={player.chapterPanel.stopSpeaking}
              playChapterAnimations={player.chapterPanel.playChapterAnimations}
              stopChapterAnimations={player.chapterPanel.stopChapterAnimations}
            />
          )}

        {player.toolsMenu.freePlay && player.toolsMenu.freePlayMenu && (
          <PlayerToolsMenu
            cutEnabled={player.toolsMenu.cutEnabled}
            toggleCutSection={player.toolsMenu.toggleCutSection}
            hideSelectedObject={player.toolsMenu.hideSelectedObject}
            pullApart={player.toolsMenu.pullApart}
            resetAllTransforms={player.toolsMenu.resetAllTransforms}
            soloSelectedObject={player.toolsMenu.soloSelectedObject}
            showAllObjects={player.toolsMenu.showAllObjects}
          />
        )}

        {player.cutSlider.freePlay && player.cutSlider.cutEnabled && (
          <PlayerCutSlider
            cutAxis={player.cutSlider.cutAxis}
            setCutAxis={player.cutSlider.setCutAxis}
            cutValue={player.cutSlider.cutValue}
            cutMin={player.cutSlider.cutMin}
            cutMax={player.cutSlider.cutMax}
            setCutValue={player.cutSlider.setCutValue}
          />
        )}

        {!player.chapterList.freePlay &&
          player.chapterList.activeMenu === "chapters" &&
          player.chapterList.material && (
            <PlayerChapterListPanel
              material={player.chapterList.material}
              activeChapterId={player.chapterList.activeChapterId}
              handleSelectChapter={player.chapterList.handleSelectChapter}
            />
          )}

        <PlayerBottomToolbar {...player.toolbar} />
      </main>
    </div>
  )
}
