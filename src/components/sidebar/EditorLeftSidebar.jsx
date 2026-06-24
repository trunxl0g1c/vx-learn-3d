import { X } from "lucide-react";
import VisualTab from "../panels/right-tabs/VisualTab";
import AnnotationPanel from "./left-panels/AnnotationPanel";
import HierarchyPanel from "./left-panels/HierarchyPanel";
import ProjectSettingsPanel from "./left-panels/ProjectSettingsPanel";

export default function EditorLeftSidebar({
  activeSidebar,
  setActiveSidebar,
  objectList,
  selectedObject,
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
  material,
  setMaterial,
  applyShaderMode,
  shaderMode,
  metalness,
  setMetalness,
  roughness,
  setRoughness,
  viewerSettings,
  setViewerSettings,
  updateEnvIntensity,
}) {
  if (!activeSidebar) return null;

  return (
    <div className="absolute left-15 top-16 bottom-5 z-110 w-[360px] overflow-hidden border border-white/10 bg-[#0d1020]/90 text-white shadow-[0_16px_48px_rgba(0,0,0,0.34)] backdrop-blur-xl">
      <button
        type="button"
        onClick={() => setActiveSidebar(null)}
        className="absolute right-4 top-4 z-120 grid size-8 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
        title="Close sidebar"
      >
        <X className="size-6" />
      </button>

      <div className="flex h-full min-h-0 flex-col overflow-hidden">
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
          />
        )}

        {activeSidebar === "annotation" && <AnnotationPanel />}

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
          <ProjectSettingsPanel material={material} setMaterial={setMaterial} />
        )}
      </div>
    </div>
  );
}
