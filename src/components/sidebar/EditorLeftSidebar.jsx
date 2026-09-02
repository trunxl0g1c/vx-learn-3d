import MaterialIcon from "../ui/material-icon";
import VisualTab from "../panels/right-tabs/VisualTab";
import AnimationTab from "../panels/right-tabs/AnimationTab";
import HierarchyPanel from "./left-panels/HierarchyPanel";
import ProjectSettingsPanel from "./left-panels/ProjectSettingsPanel";
import ProToolsPanel from "./left-panels/ProToolsPanel";
import SlideListPanel from "../panels/slide/SlideListPanel";

export default function EditorLeftSidebar({
  activeSidebar,
  setActiveSidebar,

  objectList,
  selectedObject,
  selectedObjects,
  multipleSelectEnabled,
  selectObjectFromList,
  clearSelection,
  setSelectedObject,
  highlightObject,
  makeXrayExcept,
  resetXray,
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
  renameObject,

  material,
  modelScene,
  setMaterial,
  saveDefaultPlayerCameraViewAndState,
  cameraProjectionMode = "perspective",
  setCameraProjectionMode = null,
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
  animations,

  selectedAnimations,
  setSelectedAnimations,
  setAnimationCommand,
  flow,
  procedural,
  animationAuthoring,
  quizAuthoring,
  xrAuthoring,
  slideAuthoring,
  additionalModels = [],
  modelLicenseModels = [],
  onUpdateModelLicense,
  onReadModelLicenseMetadata,
  onAddAdditionalGlbFiles,
  onRemoveAdditionalGlb,
  onRemoveProjectMedia,
  onProcedureStepPanelVisibilityChange,
}) {
  if (!activeSidebar) return null;

  if (
    activeSidebar === "pro" &&
    (animationAuthoring?.isAuthoringActive ||
      quizAuthoring?.isAuthoringActive ||
      xrAuthoring?.isAuthoringActive)
  ) {
    return null;
  }

  return (
    <aside
      className={[
        "vx-editor-left-panel absolute left-15 top-14 z-[110] w-[400px]",
        activeSidebar === "pro" ? "overflow-visible" : "overflow-hidden",
        activeSidebar === "hierarchy" && animationAuthoring?.isAuthoringActive
          ? "bottom-[360px]"
          : "bottom-0",
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

      <div
        className={[
          "relative z-10 flex h-full min-h-0 flex-col bg-primary/50 backdrop-blur-xl",
          activeSidebar === "pro" ? "overflow-visible" : "overflow-hidden",
        ].join(" ")}
      >
        {activeSidebar === "hierarchy" && (
          <HierarchyPanel
            objectList={objectList}
            selectedObject={selectedObject}
            selectedObjects={selectedObjects}
            multipleSelectEnabled={multipleSelectEnabled}
            selectObjectFromList={selectObjectFromList}
            clearSelection={clearSelection}
            highlightObject={highlightObject}
            makeXrayExcept={makeXrayExcept}
            resetXray={resetXray}
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
            renameObject={renameObject}
            chapters={material?.chapters || []}
            modelScene={modelScene}
            onOpenObjectDescription={(chapterId) => {
              setActiveChapterId?.(chapterId);
              setRightTab?.("chapter");
            }}
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
            saveDefaultPlayerCameraViewAndState={saveDefaultPlayerCameraViewAndState}
            cameraProjectionMode={cameraProjectionMode}
            setCameraProjectionMode={setCameraProjectionMode}
            viewerSettings={viewerSettings}
            setViewerSettings={setViewerSettings}
            modelLicenseModels={modelLicenseModels}
            onUpdateModelLicense={onUpdateModelLicense}
            onReadModelLicenseMetadata={onReadModelLicenseMetadata}
            onRemoveAdditionalGlb={onRemoveAdditionalGlb}
            onRemoveProjectMedia={onRemoveProjectMedia}
          />
        )}

        {activeSidebar === "slides" && (
          <SlideListPanel slideAuthoring={slideAuthoring} />
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

        {activeSidebar === "pro" && (
          <ProToolsPanel
            proToolsSettings={material?.proToolsSettings}
            flow={flow}
            procedural={procedural}
            animationAuthoring={animationAuthoring}
            quizAuthoring={quizAuthoring}
            xrAuthoring={xrAuthoring}
            selectedObjectName={selectedObjectName}
            animations={animations}
            additionalModels={additionalModels}
            onAddAdditionalGlbFiles={onAddAdditionalGlbFiles}
            onRemoveAdditionalGlb={onRemoveAdditionalGlb}
            onProcedureStepPanelVisibilityChange={onProcedureStepPanelVisibilityChange}
          />
        )}
      </div>
    </aside>
  );
}
