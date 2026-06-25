import { playerToolButtonStyle } from "../../constants/playerStyles";
import Button from "../ui/button";

export default function PlayerBottomToolbar({
  loadJsonFile,
  freePlay,
  setFreePlay,
  setFreePlayMenu,
  setActiveMenu,
  setShowInfoPanel,
  setOutlineObjects,
  stopChapterAnimations,
  setCutEnabled,
  showAllObjects,
  resetAllTransforms,
  activeChapterId,
  handleSelectChapter,
  freePlayMenu,
  activeMenu,
  showInfoPanel,
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 24,
        zIndex: 120,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div className="flex gap-2 rounded-2xl bg-primary p-2">
        <Button className="text-sm border-contrast-main! w-36 h-10!">
          <label>
            Load File
            <input
              type="file"
              accept=".json"
              onChange={(e) => loadJsonFile(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </label>
        </Button>

        <Button
          className="text-sm border-contrast-main! w-36 h-10!"
          onClick={() => {
            const next = !freePlay;

            setFreePlay(next);
            setFreePlayMenu(next);

            if (next) {
              setActiveMenu(null);
              setShowInfoPanel(false);
              setOutlineObjects([]);
              stopChapterAnimations();
              return;
            }

            setFreePlayMenu(false);
            setCutEnabled(false);
            showAllObjects();
            resetAllTransforms();

            setActiveMenu("chapters");
            setShowInfoPanel(true);

            if (activeChapterId) {
              setTimeout(() => {
                handleSelectChapter(activeChapterId);
              }, 50);
            }
          }}
          variant={freePlay ? "outline" : "default"}
        >
          {freePlay ? "Free Play ON" : "Free Play OFF"}
        </Button>

        {freePlay && (
          <Button
          variant={freePlayMenu ? "default" : "outline"}
            className="text-sm border-contrast-main! w-36 h-10!"
            onClick={() => {
              setFreePlayMenu((prev) => !prev);
              setActiveMenu(null);
            }}
          >
            Tools
          </Button>
        )}

        {!freePlay && (
          <>
            <Button
              variant={activeMenu === "chapters" ? "default" : "outline"}
              className="text-sm border-contrast-main! w-36 h-10!"
              onClick={() => {
                setActiveMenu(activeMenu === "chapters" ? null : "chapters");
              }}
            >
              Chapters
            </Button>

            <Button
              variant={showInfoPanel ? "default" : "outline"}
              className="text-sm border-contrast-main! w-36 h-10!"
              onClick={() => setShowInfoPanel(!showInfoPanel)}
            >
              {showInfoPanel ? "Info ON" : "Info OFF"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
