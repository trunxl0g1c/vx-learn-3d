import MaterialIcon from "../ui/material-icon";
import VisualTab from "../panels/right-tabs/VisualTab";
import ChapterTab from "../panels/right-tabs/ChapterTab";
import AnimationTab from "../panels/right-tabs/AnimationTab";
import HierarchyPanel from "./left-panels/HierarchyPanel";
import ProjectSettingsPanel from "./left-panels/ProjectSettingsPanel";

export default function EditorLeftSidebar({
  activeSidebar,
  setActiveSidebar,

  objectList,
  selectedObject,
  setSelectedObject,
  highlightObject,
  makeXrayExcept,
  focusObject,
  markers,
  setSelectedObjectName,
  treeDepth,
  setTreeDepth,
  maxTreeDepth,
  searchObject,
  setSearchObject,
  showAllObjects,
  hideAllObjects,
  setRightTab,

  material,
  setMaterial,
  selectedObjectName,

  applyShaderMode,
  shaderMode,
  metalness,
  setMetalness,
  roughness,
  setRoughness,
  viewerSettings,
  setViewerSettings,
  updateEnvIntensity,

  activeChapterId,
  setActiveChapterId,
  previewChapterInEditor,
  createChapterFromSelectedObject,
  saveVisualStateToActiveChapter,
  saveCameraViewToActiveChapter,
  panelSectionStyle,
  inputStyle,
  mediaButtonStyle,
  updateChapterField,
  addChapterParameter,
  updateChapterParameter,
  deleteChapterParameter,
  deleteMarkerFromActiveChapter,
  animations,
  isChapterAnimationSelected,
  getChapterAnimationConfig,
  toggleChapterAnimation,
  updateChapterAnimationField,
  playAnimationPreview,
  stopAnimationPreview,
  addChapterMedia,
  deleteChapterMedia,
  requestAddMarker,
  cancelAddMarker,
  markerMode,

  selectedAnimations,
  setSelectedAnimations,
  setAnimationCommand,
}) {
  if (!activeSidebar) return null;

  return (
    <aside
      className={[
        "absolute left-15 top-14 bottom-5 z-[110] h-full w-[400px] overflow-hidden",
        "border border-divider-main/80 text-white transition-all duration-200",
        "bg-primary/45 backdrop-blur-2xl backdrop-saturate-200",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setActiveSidebar(null)}
        className="absolute right-4 top-4 z-[120] grid size-8 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
        title="Close sidebar"
      >
        <MaterialIcon name="close" fill className="size-6" />
      </button>

      <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden bg-primary/50 backdrop-blur-xl">
        {activeSidebar === "hierarchy" && (
          <HierarchyPanel
            objectList={objectList}
            selectedObject={selectedObject}
            highlightObject={highlightObject}
            makeXrayExcept={makeXrayExcept}
            focusObject={focusObject}
            markers={markers}
            setSelectedObjectName={setSelectedObjectName}
            treeDepth={treeDepth}
            setTreeDepth={setTreeDepth}
            maxTreeDepth={maxTreeDepth}
            searchObject={searchObject}
            setSearchObject={setSearchObject}
            showAllObjects={showAllObjects}
            hideAllObjects={hideAllObjects}
            setSelectedObject={setSelectedObject}
            setRightTab={activeChapterId ? undefined : setRightTab}
          />
        )}

        {activeSidebar === "visual" && (
          <VisualTab
            applyShaderMode={applyShaderMode}
            shaderMode={shaderMode}
            metalness={metalness}
            setMetalness={setMetalness}
            roughness={roughness}
            setRoughness={setRoughness}
            viewerSettings={viewerSettings}
            setViewerSettings={setViewerSettings}
            updateEnvIntensity={updateEnvIntensity}
          />
        )}

        {activeSidebar === "settings" && (
          <ProjectSettingsPanel
            material={material}
            setMaterial={setMaterial}
            viewerSettings={viewerSettings}
            setViewerSettings={setViewerSettings}
          />
        )}

        {activeSidebar === "chapters" && (
          <ChapterTab
            variant="list"
            setRightTab={setRightTab}
            material={material}
            activeChapterId={activeChapterId}
            setActiveChapterId={setActiveChapterId}
            previewChapterInEditor={previewChapterInEditor}
            createChapterFromSelectedObject={createChapterFromSelectedObject}
            selectedObjectName={selectedObjectName}
            panelSectionStyle={panelSectionStyle}
            inputStyle={inputStyle}
            mediaButtonStyle={mediaButtonStyle}
            updateChapterField={updateChapterField}
            addChapterParameter={addChapterParameter}
            updateChapterParameter={updateChapterParameter}
            deleteChapterParameter={deleteChapterParameter}
            deleteMarkerFromActiveChapter={deleteMarkerFromActiveChapter}
            saveVisualStateToActiveChapter={saveVisualStateToActiveChapter}
            saveCameraViewToActiveChapter={saveCameraViewToActiveChapter}
            animations={animations}
            isChapterAnimationSelected={isChapterAnimationSelected}
            getChapterAnimationConfig={getChapterAnimationConfig}
            toggleChapterAnimation={toggleChapterAnimation}
            updateChapterAnimationField={updateChapterAnimationField}
            playAnimationPreview={playAnimationPreview}
            stopAnimationPreview={stopAnimationPreview}
            addChapterMedia={addChapterMedia}
            deleteChapterMedia={deleteChapterMedia}
            requestAddMarker={requestAddMarker}
            cancelAddMarker={cancelAddMarker}
            markerMode={markerMode}
          />
        )}

        {activeSidebar === "animation" && (
          <AnimationTab
            material={material}
            selectedObjectName={selectedObjectName}
            activeChapterId={activeChapterId}
            setActiveChapterId={setActiveChapterId}
            animations={animations}
            selectedAnimations={selectedAnimations}
            setSelectedAnimations={setSelectedAnimations}
            setAnimationCommand={setAnimationCommand}
          />
        )}
      </div>
    </aside>
  );
}
