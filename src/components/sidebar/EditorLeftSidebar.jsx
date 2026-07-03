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
  setSelectedObject,
}) {
  if (!activeSidebar) return null;

  return (
    <aside
      className={[
        "absolute left-15 top-16 bottom-5 z-[110] w-[400px] overflow-hidden",
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
        <X className="size-6" />
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
          />
        )}

        {/* {activeSidebar === "annotation" && <AnnotationPanel />} */}

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
      </div>
    </aside>
  );
}
