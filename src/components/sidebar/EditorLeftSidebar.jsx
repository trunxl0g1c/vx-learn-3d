import VisualTab from '../panels/right-tabs/VisualTab'
import AnnotationPanel from './left-panels/AnnotationPanel'
import HierarchyPanel from './left-panels/HierarchyPanel'
import ProjectSettingsPanel from './left-panels/ProjectSettingsPanel'

export default function EditorLeftSidebar({
  activeSidebar,
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
  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: 84,
        bottom: 20,
        width: 360,
        zIndex: 110,
        background: "rgba(15,23,42,0.72)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        boxShadow: "0 16px 48px rgba(0,0,0,0.34)",
        overflow: "hidden",
        padding: 14,
        color: "white",
      }}
    >
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
  )
}
